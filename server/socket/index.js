const socketIo = require('socket.io');
const roomManager = require('./session-manager');
const { trackMessageSent, trackUserActive } = require('../telemetry/compat');
const {
  decorateGroupMessage,
  decoratePrivateMessage
} = require('../services/message-service');
const { isLoopbackAddress } = require('../utils/network');

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
  const roomIdleCleanupIntervalMs = Number.isFinite(options.roomIdleCleanupIntervalMs)
    && options.roomIdleCleanupIntervalMs > 0
    ? options.roomIdleCleanupIntervalMs
    : 6 * 60 * 60 * 1000;
  const offlineTimers = new Map();
  const joinAttempts = new Map();
  let roomIdleCleanupTimer = null;

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

  const clearRoomTimers = (roomId) => {
    for (const [key, timer] of offlineTimers.entries()) {
      if (!key.startsWith(`${roomId}:`)) continue;
      clearTimeout(timer);
      offlineTimers.delete(key);
    }
  };

  const requireActiveRoom = (socket, roomId) => {
    if (!roomId || roomId !== socket.activeRoomId) {
      throw new Error('Join the room before managing it');
    }
  };

  const scheduleOffline = ({ roomId, username }) => {
    clearOfflineTimer(roomId, username);
    const key = `${roomId}:${username}`;
    const timer = setTimeout(() => {
      offlineTimers.delete(key);
      const currentUser = roomManager.getUser(roomId, username);
      if (currentUser?.status === roomManager.getOnline() && currentUser.socketIds.size > 0) {
        return;
      }
      const result = roomManager.markOffline({ roomId, username });
      if (!result.becameOffline) return;

      broadcastRoomUserList(roomId);
      emitPresenceChanged('offline', result.user, roomId);
    }, presenceOfflineDebounceMs);

    offlineTimers.set(key, timer);
  };

  const leaveActiveRoom = (socket, { immediateOffline = false } = {}) => {
    const roomId = socket.activeRoomId;
    if (!roomId) return;

    socket.leave(socketRoomName(roomId));
    socket.activeRoomId = null;
    const result = roomManager.removeSocket({
      roomId,
      username: socket.username,
      socketId: socket.id
    });

    if (result.user && !result.hasConnections && immediateOffline) {
      clearOfflineTimer(roomId, socket.username);
      const offline = roomManager.markOffline({ roomId, username: socket.username });
      if (offline.becameOffline) {
        broadcastRoomUserList(roomId);
        emitPresenceChanged('offline', offline.user, roomId);
      }
    } else if (result.user && !result.hasConnections) {
      scheduleOffline({ roomId, username: socket.username });
    }
  };

  const detachRoomSockets = (roomId) => {
    const socketIds = io.sockets.adapter.rooms.get(socketRoomName(roomId));
    if (socketIds) {
      for (const socketId of [...socketIds]) {
        const memberSocket = io.sockets.sockets.get(socketId);
        if (!memberSocket) continue;
        memberSocket.leave(socketRoomName(roomId));
        if (memberSocket.activeRoomId === roomId) {
          memberSocket.activeRoomId = null;
        }
        roomManager.removeSocket({
          roomId,
          username: memberSocket.username,
          socketId: memberSocket.id
        });
      }
    }

    clearRoomTimers(roomId);
    roomManager.removeRoom(roomId);
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
    const joinedRoom = await historyService.joinRoom({ roomId, code, userId, nickname });
    leaveActiveRoom(socket);

    socket.join(socketRoomName(roomId));
    socket.activeRoomId = roomId;
    const result = roomManager.setOnline({
      roomId,
      username: userId,
      socketId: socket.id,
      nickname,
      ip: getClientIp(socket),
      userAgent: socket.handshake.headers?.['user-agent'] || ''
    });

    const room = joinedRoom || await historyService.getRoom(roomId);
    if (room) roomManager.setRoomName(roomId, room.name);
    broadcastRoomUserList(roomId);
    trackUserActive(userId, {
      room_type: roomId === DEFAULT_ROOM_ID ? 'public' : 'room'
    });

    if (result.becameOnline) {
      emitPresenceChanged('online', result.user, roomId, socket);
    }

    return { ...result, room };
  };

  const getClientIp = (socket) => {
    const address = socket.handshake.address || socket.request.connection.remoteAddress;

    return address ? address.replace(/^::ffff:/, '') : '';
  };

  const trackMessage = (type, params, socket) => {
    trackMessageSent({
      userId: socket.username || params.sender,
      chatType: type,
      msgType: params.msgType || 'TEXT',
      content: params.content ?? params.text ?? params.msg ?? '',
      fileName: params.fileName || '',
      fileSize: params.fileSize,
      fileType: params.fileType || params.mimetype || ''
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

  const runIdleRoomCleanup = async () => {
    try {
      const now = Date.now();
      const candidates = await historyService.listInactiveRooms({ now });
      for (const room of candidates) {
        const hasOnlineUsers = roomManager.listUsers(room.id)
          .some((user) => user.status === roomManager.getOnline());
        if (hasOnlineUsers) continue;

        const deleted = await historyService.deleteRoomBySystem({
          roomId: room.id,
          reason: 'inactive',
          now
        });
        if (!deleted) continue;

        batchDownloadService.revokeRoom(room.id);
        io.to(socketRoomName(room.id)).emit('room_deleted', {
          roomId: room.id,
          reason: 'inactive'
        });
        detachRoomSockets(room.id);
      }
    } catch (error) {
      console.error('[Room] idle cleanup failed:', error.message);
    }
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
          createdBy: socket.username,
          nickname: params.nickname || ''
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
        requireActiveRoom(socket, roomId);
        const room = await historyService.updateRoomName({
          roomId,
          name: params.name,
          requester: socket.username
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
        requireActiveRoom(socket, roomId);
        const room = await historyService.regenerateRoomCode({
          roomId,
          requester: socket.username
        });
        io.to(socketRoomName(roomId)).emit('room_updated', { room });

        ack({ code: 0, data: { room } });
      } catch (error) {
        console.error('[Room] regenerate code failed:', error.message);
        ack({ code: -1, message: error.message });
      }
    });

    socket.on('room_update_retention', async (params = {}, ack) => {
      if (typeof ack !== 'function') return;

      try {
        if (!socket.username) throw new Error('User is required');
        const roomId = params.roomId || socket.activeRoomId;
        if (!roomId) throw new Error('Room is required');
        const room = await historyService.updateRoomRetention({
          roomId,
          retentionDays: params.retentionDays,
          requester: socket.username
        });
        io.to(socketRoomName(roomId)).emit('room_updated', { room });

        ack({ code: 0, data: { room } });
      } catch (error) {
        console.error('[Room] retention update failed:', error.message);
        ack({ code: -1, message: error.message });
      }
    });

    socket.on('room_leave', async (params = {}, ack) => {
      if (typeof ack !== 'function') return;

      try {
        const roomId = params.roomId || socket.activeRoomId;
        requireActiveRoom(socket, roomId);
        const data = await historyService.leaveRoom({
          roomId,
          userId: socket.username
        });

        if (data.dissolved) {
          batchDownloadService.revokeRoom(roomId);
          io.to(socketRoomName(roomId)).emit('room_deleted', {
            roomId,
            reason: 'last_member_left'
          });
          detachRoomSockets(roomId);
        } else {
          if (data.ownerChanged) {
            io.to(socketRoomName(roomId)).emit('room_owner_changed', {
              roomId,
              ownerId: data.newOwnerId
            });
          }
          leaveActiveRoom(socket, { immediateOffline: true });
          broadcastRoomUserList(roomId);
        }

        ack({ code: 0, data });
      } catch (error) {
        console.error('[Room] leave failed:', error.message);
        ack({ code: -1, message: error.message });
      }
    });

    socket.on('room_dissolve', async (params = {}, ack) => {
      if (typeof ack !== 'function') return;

      try {
        const roomId = params.roomId || socket.activeRoomId;
        requireActiveRoom(socket, roomId);
        const data = await historyService.dissolveRoom({
          roomId,
          requester: socket.username
        });

        batchDownloadService.revokeRoom(roomId);
        io.to(socketRoomName(roomId)).emit('room_deleted', {
          roomId,
          reason: 'owner_dissolved'
        });
        detachRoomSockets(roomId);
        ack({ code: 0, data });
      } catch (error) {
        console.error('[Room] dissolve failed:', error.message);
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

      trackMessage('private', decorated, socket);

      const receiver = roomManager.getUser(DEFAULT_ROOM_ID, savedMessage.receiver);
      if (receiver && receiver.status === roomManager.getOnline()) {
        for (const socketId of receiver.socketIds) {
          io.to(socketId).emit('reply_private_chat', savedMessage);
        }

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
      console.warn('[Room] Public Transfer Hub name cannot be changed');
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

      trackMessage('group', decorated, socket);
      socket.broadcast.to(socketRoomName(DEFAULT_ROOM_ID)).emit('reply_group_chat', savedMessage);
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

        trackMessage('room', decorated, socket);
        socket.broadcast.to(socketRoomName(roomId)).emit('reply_room_chat', savedMessage);
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
        if (roomId) requireActiveRoom(socket, roomId);
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

    socket.on('public_room_admin_clear', async (params = {}, ack) => {
      if (typeof ack !== 'function') return;

      try {
        const clientIp = getClientIp(socket);
        if (!isLoopbackAddress(clientIp)) {
          throw new Error('Administrator access is only available from localhost');
        }

        const data = await historyService.clearPublicRoomHistory();
        broadcastHistoryCleared({
          roomId: DEFAULT_ROOM_ID,
          sessionId: data.sessionId
        }, socket);
        ack({ code: 0, data });
      } catch (error) {
        console.error('[History] public room admin clear failed:', error.message);
        ack({ code: -1, message: error.message });
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

  const idleCleanupReady = runIdleRoomCleanup();
  roomIdleCleanupTimer = setInterval(() => {
    void runIdleRoomCleanup();
  }, roomIdleCleanupIntervalMs);
  roomIdleCleanupTimer.unref?.();

  io.on('close', () => {
    for (const timer of offlineTimers.values()) clearTimeout(timer);
    offlineTimers.clear();
    if (roomIdleCleanupTimer) {
      clearInterval(roomIdleCleanupTimer);
      roomIdleCleanupTimer = null;
    }
  });

  io.idleCleanupReady = idleCleanupReady;
  return io;
};
