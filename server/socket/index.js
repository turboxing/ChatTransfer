const socketIo = require('socket.io');
const roomManager = require('./session-manager');
const { trackEvent } = require('../telemetry/compat');
const {
  decorateGroupMessage,
  decoratePrivateMessage
} = require('../services/message-service');

const DEFAULT_ROOM_ID = 'group_chat';

module.exports = function registerSocket(server, historyService, batchDownloadService, options = {}) {
  if (!historyService) {
    throw new Error('historyService is required');
  }
  if (!batchDownloadService) {
    throw new Error('batchDownloadService is required');
  }

  const io = socketIo(server, {
    cors: {
      origin: true,
      methods: ['GET', 'POST']
    },
    pingTimeout: 30000,
    pingInterval: 25000
  });
  const presenceOfflineDebounceMs = Number.isFinite(options.presenceOfflineDebounceMs)
    ? Math.max(0, options.presenceOfflineDebounceMs)
    : 8000;
  const offlineTimers = new Map();
  const joinAttempts = new Map();

  const socketRoomName = (roomId = DEFAULT_ROOM_ID) => (
    roomId === DEFAULT_ROOM_ID ? 'group-chat' : `room:${roomId}`
  );

  const broadcastRoomUserList = (roomId = DEFAULT_ROOM_ID) => {
    io.to(socketRoomName(roomId)).emit('user_list_updated', {
      roomId,
      users: roomManager.listUsers(roomId)
    });
  };

  const emitPresenceChanged = (type, user, roomId, sourceSocket = null) => {
    const payload = { type, user, roomId, at: Date.now() };

    if (type === 'online' && sourceSocket) {
      sourceSocket.broadcast.to(socketRoomName(roomId)).emit('presence_changed', payload);
      return;
    }

    io.to(socketRoomName(roomId)).emit('presence_changed', payload);
  };

  const clearOfflineTimer = (roomId, username) => {
    const key = `${roomId}:${username}`;
    const timer = offlineTimers.get(key);
    if (!timer) return;

    clearTimeout(timer);
    offlineTimers.delete(key);
  };

  const scheduleOffline = ({ roomId, username }) => {
    clearOfflineTimer(roomId, username);
    const key = `${roomId}:${username}`;
    const timer = setTimeout(() => {
      offlineTimers.delete(key);
      const result = roomManager.markOffline({ roomId, username });
      if (!result.becameOffline) return;

      broadcastRoomUserList(roomId);
      emitPresenceChanged('offline', result.user, roomId);
    }, presenceOfflineDebounceMs);

    offlineTimers.set(key, timer);
  };

  const leaveActiveRoom = (socket) => {
    const roomId = socket.activeRoomId;
    if (!roomId) return;

    socket.leave(socketRoomName(roomId));
    const result = roomManager.removeSocket({
      roomId,
      username: socket.username,
      socketId: socket.id
    });

    if (result.user && !result.hasConnections) {
      scheduleOffline({ roomId, username: socket.username });
    }
  };

  const registerUserOnline = async (socket, {
    roomId = DEFAULT_ROOM_ID,
    code = null,
    nickname = '',
    username = null
  } = {}) => {
    const userId = username || socket.username;
    if (!userId) throw new Error('User is required');

    socket.username = userId;
    await historyService.joinRoom({ roomId, code, userId, nickname });
    leaveActiveRoom(socket);

    socket.join(socketRoomName(roomId));
    socket.activeRoomId = roomId;
    const result = roomManager.setOnline({
      roomId,
      username: userId,
      socketId: socket.id,
      nickname,
      ip: getClientIp(socket)
    });

    const room = await historyService.getRoom(roomId);
    if (room) roomManager.setRoomName(roomId, room.name);
    broadcastRoomUserList(roomId);

    if (result.becameOnline) {
      emitPresenceChanged('online', result.user, roomId, socket);
    }

    return { ...result, room };
  };

  const getClientIp = (socket) => {
    const address = socket.handshake.address || socket.request.connection.remoteAddress;

    return address ? address.replace(/^::ffff:/, '') : '';
  };

  const trackMessage = (type, direction, params, socket) => {
    trackEvent('message_action', {
      chat_type: type,
      msg_type: params.msgType || 'TEXT',
      direction,
      sender: params.sender,
      visitor_id: params.visitorId || 'unknown-visitor',
      user_agent: socket.handshake.headers['user-agent']
    });
  };

  const persistMessage = async (message) => {
    try {
      return { message: await historyService.saveMessage(message), error: null };
    } catch (error) {
      console.error('[History] save message failed:', error.message);
      return { message, error };
    }
  };

  const broadcastHistoryCleared = ({ roomId = null, chatType = null, targetUser = null, sessionId = null }, sourceSocket) => {
    if (roomId) {
      io.to(socketRoomName(roomId)).emit('history_cleared', {
        roomId,
        chatType: 'room',
        sessionId
      });
      return;
    }

    const payload = { chatType, targetUser, sessionId };

    if (chatType === 'group') {
      io.to(socketRoomName(DEFAULT_ROOM_ID)).emit('history_cleared', payload);
      return;
    }

    sourceSocket.emit('history_cleared', payload);
    const receiver = roomManager.getUser(DEFAULT_ROOM_ID, targetUser);
    if (receiver && receiver.status === roomManager.getOnline()) {
      for (const socketId of receiver.socketIds) {
        io.to(socketId).emit('history_cleared', payload);
      }
    }
  };

  const checkJoinRateLimit = (socket) => {
    const key = socket.handshake.address || socket.id;
    const now = Date.now();
    const attempts = (joinAttempts.get(key) || []).filter((at) => now - at < 60000);

    if (attempts.length >= 10) {
      throw new Error('Too many join attempts');
    }

    attempts.push(now);
    joinAttempts.set(key, attempts);
  };

  io.on('connection', (socket) => {
    console.log(`[Socket] connected: ${socket.id}`);

    socket.on('login', ({ uid } = {}) => {
      console.log(`[Socket] login: ${uid}`);
      if (uid) socket.username = uid;
    });

    socket.on('online', async (username) => {
      console.log(`[Socket] online: ${username} ${socket.id}`);
      await registerUserOnline(socket, { roomId: DEFAULT_ROOM_ID, username });
    });

    socket.on('room_online', async (params = {}, ack) => {
      try {
        const result = await registerUserOnline(socket, params);
        ack?.({ code: 0, data: { room: result.room } });
      } catch (error) {
        console.error('[Room] online failed:', error.message);
        ack?.({ code: -1, message: error.message });
      }
    });

    socket.on('room_create', async (params = {}, ack) => {
      if (typeof ack !== 'function') return;

      try {
        if (!socket.username) throw new Error('User is required');
        const room = await historyService.createRoom({
          name: params.name,
          createdBy: socket.username
        });
        await historyService.joinRoom({
          roomId: room.id,
          code: room.code,
          userId: socket.username,
          nickname: params.nickname || ''
        });
        roomManager.setRoomName(room.id, room.name);

        ack({ code: 0, data: { room } });
      } catch (error) {
        console.error('[Room] create failed:', error.message);
        ack({ code: -1, message: error.message });
      }
    });

    socket.on('room_join_by_code', async (params = {}, ack) => {
      if (typeof ack !== 'function') return;

      try {
        if (!socket.username) throw new Error('User is required');
        checkJoinRateLimit(socket);
        const room = await historyService.getRoomByCode(params.code);
        if (!room) throw new Error('Room not found');

        await historyService.joinRoom({
          roomId: room.id,
          code: params.code,
          userId: socket.username,
          nickname: params.nickname || ''
        });

        ack({ code: 0, data: { room } });
      } catch (error) {
        console.error('[Room] join failed:', error.message);
        ack({ code: -1, message: error.message });
      }
    });

    socket.on('room_list', async (params = {}, ack) => {
      if (typeof ack !== 'function') return;

      try {
        if (!socket.username) throw new Error('User is required');
        const rooms = await historyService.listRoomsForUser(socket.username);
        const data = rooms.map((room) => ({
          ...room,
          onlineCount: roomManager.listUsers(room.id)
            .filter((user) => user.status === roomManager.getOnline())
            .length
        }));

        ack({ code: 0, data });
      } catch (error) {
        console.error('[Room] list failed:', error.message);
        ack({ code: -1, message: error.message });
      }
    });

    socket.on('room_update_name', async (params = {}, ack) => {
      if (typeof ack !== 'function') return;

      try {
        const roomId = params.roomId || socket.activeRoomId;
        const room = await historyService.updateRoomName({
          roomId,
          name: params.name
        });
        roomManager.setRoomName(roomId, room.name);
        io.to(socketRoomName(roomId)).emit('room_updated', { room });

        ack({ code: 0, data: { room } });
      } catch (error) {
        console.error('[Room] rename failed:', error.message);
        ack({ code: -1, message: error.message });
      }
    });

    socket.on('room_regenerate_code', async (params = {}, ack) => {
      if (typeof ack !== 'function') return;

      try {
        const roomId = params.roomId || socket.activeRoomId;
        const room = await historyService.regenerateRoomCode({ roomId });
        io.to(socketRoomName(roomId)).emit('room_updated', { room });

        ack({ code: 0, data: { room } });
      } catch (error) {
        console.error('[Room] regenerate code failed:', error.message);
        ack({ code: -1, message: error.message });
      }
    });

    socket.on('private_chat', async (params, ack) => {
      const decorated = decoratePrivateMessage(params, roomManager.getUser(DEFAULT_ROOM_ID, params.sender));
      const { message: savedMessage, error } = await persistMessage(decorated);

      if (typeof ack === 'function') {
        ack(error ? { ...decorated, status: 'failed', error: 'Message persistence failed' } : savedMessage);
      }

      if (error) return;

      trackMessage('private', 'send', decorated, socket);

      const receiver = roomManager.getUser(DEFAULT_ROOM_ID, savedMessage.receiver);
      if (receiver && receiver.status === roomManager.getOnline()) {
        for (const socketId of receiver.socketIds) {
          io.to(socketId).emit('reply_private_chat', savedMessage);
        }

        trackEvent('message_action', {
          chat_type: 'private',
          msg_type: decorated.msgType || 'TEXT',
          direction: 'receive',
          receiver: decorated.receiver,
          user_agent: socket.handshake.headers['user-agent']
        });
      } else {
        console.log(`${decorated.receiver} is offline`);
      }
    });

    socket.on('group_online', (username, nickname) => {
      console.log(`[Socket] group_online: ${username} ${socket.id} nickname=${nickname}`);
      registerUserOnline(socket, {
        roomId: DEFAULT_ROOM_ID,
        username,
        nickname
      }).then(() => {
        socket.emit('group_name_updated', {
          groupName: roomManager.getRoomName(DEFAULT_ROOM_ID),
          updatedBy: ''
        });
      }).catch((error) => console.error('[Room] legacy online failed:', error.message));
    });

    socket.on('update_nickname', ({ sender, nickname }) => {
      roomManager.setNickname({
        roomId: socket.activeRoomId || DEFAULT_ROOM_ID,
        username: sender,
        nickname
      });
      broadcastRoomUserList(socket.activeRoomId || DEFAULT_ROOM_ID);
    });

    socket.on('update_group_name', ({ groupName, updatedBy }) => {
      roomManager.setRoomName(DEFAULT_ROOM_ID, groupName);
      io.to(socketRoomName(DEFAULT_ROOM_ID)).emit('group_name_updated', {
        groupName,
        updatedBy
      });
    });

    socket.on('group_chat', async (params, ack) => {
      const decorated = decorateGroupMessage(
        params,
        roomManager.getUser(DEFAULT_ROOM_ID, params.sender)
      );
      const { message: savedMessage, error } = await persistMessage(decorated);

      if (typeof ack === 'function') {
        ack(error ? { ...decorated, status: 'failed', error: 'Message persistence failed' } : savedMessage);
      }

      if (error) return;

      trackMessage('group', 'send', decorated, socket);
      socket.broadcast.to(socketRoomName(DEFAULT_ROOM_ID)).emit('reply_group_chat', savedMessage);

      trackEvent('message_action', {
        chat_type: 'group',
        msg_type: decorated.msgType || 'TEXT',
        direction: 'broadcast',
        user_agent: socket.handshake.headers['user-agent']
      });
    });

    socket.on('room_chat', async (params = {}, ack) => {
      try {
        const roomId = params.roomId || socket.activeRoomId;
        if (!roomId || roomId !== socket.activeRoomId) {
          throw new Error('Join the room before sending messages');
        }

        const messageData = {
          ...params,
          roomId,
          receiver: roomId
        };
        const decorated = decorateGroupMessage(
          messageData,
          roomManager.getUser(roomId, params.sender)
        );
        const { message: savedMessage, error } = await persistMessage(decorated);

        if (typeof ack === 'function') {
          ack(error ? { ...decorated, status: 'failed', error: 'Message persistence failed' } : savedMessage);
        }

        if (error) return;

        trackMessage('room', 'send', decorated, socket);
        socket.broadcast.to(socketRoomName(roomId)).emit('reply_room_chat', savedMessage);

        trackEvent('message_action', {
          chat_type: 'room',
          msg_type: decorated.msgType || 'TEXT',
          direction: 'broadcast',
          user_agent: socket.handshake.headers['user-agent']
        });
      } catch (error) {
        console.error('[Room] message failed:', error.message);
        ack?.({ status: 'failed', error: error.message });
      }
    });

    socket.on('history_query', async (params = {}, ack) => {
      if (typeof ack !== 'function') return;

      try {
        const requester = socket.username || params.requester;
        const roomId = params.roomId;
        const chatType = params.chatType || (
          params.targetUser === 'group_chat' ? 'group' : 'private'
        );
        const data = await historyService.queryHistory({
          requester,
          roomId,
          chatType,
          targetUser: params.targetUser,
          cursor: params.cursor,
          limit: params.limit
        });

        ack({ code: 0, data });
      } catch (error) {
        console.error('[History] query failed:', error.message);
        ack({ code: -1, message: 'Failed to load history' });
      }
    });

    socket.on('attachment_query', async (params = {}, ack) => {
      if (typeof ack !== 'function') return;

      try {
        const requester = socket.username || params.requester;
        const roomId = params.roomId;
        const chatType = params.chatType || (
          params.targetUser === 'group_chat' ? 'group' : 'private'
        );
        const { attachments } = await historyService.queryAttachments({
          requester,
          roomId,
          chatType,
          targetUser: params.targetUser
        });

        ack({
          code: 0,
          data: {
            attachments: attachments.map((attachment) => ({
              msgId: attachment.msgId,
              seq: attachment.seq,
              sender: attachment.sender,
              senderNickname: attachment.senderNickname,
              msgType: attachment.msgType,
              createTime: attachment.create_time || attachment.createTime,
              createdAt: attachment.createdAt,
              fileName: attachment.fileName,
              fileSize: attachment.fileSize,
              fileType: attachment.fileType,
              fileUrl: attachment.fileUrl,
              available: attachment.available
            }))
          }
        });
      } catch (error) {
        console.error('[Attachment] query failed:', error.message);
        ack({ code: -1, message: 'Failed to load attachments' });
      }
    });

    socket.on('attachment_download', async (params = {}, ack) => {
      if (typeof ack !== 'function') return;

      try {
        const requester = socket.username || params.requester;
        const data = await batchDownloadService.createDownloadToken({
          requester,
          roomId: params.roomId,
          chatType: params.chatType,
          targetUser: params.targetUser,
          messageIds: params.messageIds
        });

        ack({ code: 0, data });
      } catch (error) {
        console.error('[Attachment] download request failed:', error.message);
        ack({ code: -1, message: error.message });
      }
    });

    socket.on('history_clear', async (params = {}, ack) => {
      if (typeof ack !== 'function') return;

      try {
        const requester = socket.username || params.requester;
        const roomId = params.roomId;
        const chatType = params.chatType || (
          params.targetUser === 'group_chat' ? 'group' : 'private'
        );
        const data = await historyService.clearHistory({
          requester,
          roomId,
          chatType,
          targetUser: params.targetUser
        });

        broadcastHistoryCleared({
          roomId,
          chatType,
          targetUser: params.targetUser,
          sessionId: data.sessionId
        }, socket);
        ack({ code: 0, data });
      } catch (error) {
        console.error('[History] clear failed:', error.message);
        ack({ code: -1, message: 'Failed to clear history' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] disconnect: ${socket.username || 'unknown'} ${socket.id}`);
      if (!socket.activeRoomId || !socket.username) return;

      const result = roomManager.removeSocket({
        roomId: socket.activeRoomId,
        username: socket.username,
        socketId: socket.id
      });

      if (result.user && !result.hasConnections) {
        scheduleOffline({
          roomId: socket.activeRoomId,
          username: socket.username
        });
      }
    });
  });

  io.on('close', () => {
    for (const timer of offlineTimers.values()) clearTimeout(timer);
    offlineTimers.clear();
  });

  return io;
};
