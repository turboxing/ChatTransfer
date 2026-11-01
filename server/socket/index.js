const socketIo = require('socket.io');
const roomManager = require('./session-manager');
const { trackEvent } = require('../telemetry/compat');
const {
  decorateGroupMessage,
  decoratePrivateMessage
} = require('../services/message-service');

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
  const chatRoom = 'group-chat';
  const presenceOfflineDebounceMs = Number.isFinite(options.presenceOfflineDebounceMs)
    ? Math.max(0, options.presenceOfflineDebounceMs)
    : 8000;
  const offlineTimers = new Map();

  const getClientIp = (socket) => {
    const address = socket.handshake.address || socket.request.connection.remoteAddress;

    return address ? address.replace(/^::ffff:/, '') : '';
  };

  const broadcastUserList = () => {
    io.to(chatRoom).emit('user_list_updated', {
      users: roomManager.listUsers()
    });
  };

  const emitToUser = (username, eventName, payload) => {
    const user = roomManager.getUser(username);
    if (!user || user.status !== roomManager.getOnline()) return;

    for (const socketId of user.socketIds) {
      io.to(socketId).emit(eventName, payload);
    }
  };

  const clearOfflineTimer = (username) => {
    const timer = offlineTimers.get(username);
    if (!timer) return;
    clearTimeout(timer);
    offlineTimers.delete(username);
  };

  const emitPresenceChanged = (type, user, sourceSocket = null) => {
    const payload = { type, user, at: Date.now() };

    if (type === 'online' && sourceSocket) {
      sourceSocket.broadcast.to(chatRoom).emit('presence_changed', payload);
      return;
    }

    io.to(chatRoom).emit('presence_changed', payload);
  };

  const registerUserOnline = (socket, username, nickname = '') => {
    if (!username) return null;

    clearOfflineTimer(username);
    socket.join(chatRoom);
    socket.username = username;
    const result = roomManager.setOnline({
      username,
      socketId: socket.id,
      nickname,
      ip: getClientIp(socket)
    });
    broadcastUserList();

    if (result.becameOnline) {
      emitPresenceChanged('online', result.user, socket);
    }

    return result;
  };

  const scheduleOffline = (username) => {
    clearOfflineTimer(username);
    const timer = setTimeout(() => {
      offlineTimers.delete(username);
      const result = roomManager.markOffline(username);
      if (!result.becameOffline) return;

      broadcastUserList();
      emitPresenceChanged('offline', result.user);
    }, presenceOfflineDebounceMs);
    offlineTimers.set(username, timer);
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

  const broadcastHistoryCleared = ({ chatType, targetUser, sessionId }, sourceSocket) => {
    const payload = { chatType, targetUser, sessionId };

    if (chatType === 'group') {
      io.to(chatRoom).emit('history_cleared', payload);
      return;
    }

    sourceSocket.emit('history_cleared', payload);
    emitToUser(targetUser, 'history_cleared', payload);
  };

  io.on('connection', (socket) => {
    console.log(`[Socket] connected: ${socket.id}`);

    socket.on('login', ({ uid } = {}) => {
      console.log(`[Socket] login: ${uid}`);
    });

    socket.on('online', (username) => {
      console.log(`[Socket] online: ${username} ${socket.id}`);
      registerUserOnline(socket, username);
    });

    socket.on('private_chat', async (params, ack) => {
      const decorated = decoratePrivateMessage(params, roomManager.getUser(params.sender));
      const { message: savedMessage, error } = await persistMessage(decorated);

      if (typeof ack === 'function') {
        ack(error ? { ...decorated, status: 'failed', error: 'Message persistence failed' } : savedMessage);
      }

      if (error) return;

      trackMessage('private', 'send', decorated, socket);

      const receiver = roomManager.getUser(savedMessage.receiver);

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
      registerUserOnline(socket, username, nickname);
      socket.emit('group_name_updated', {
        groupName: roomManager.getGroupName(),
        updatedBy: ''
      });
    });

    socket.on('update_nickname', ({ sender, nickname }) => {
      roomManager.setNickname(sender, nickname);
      broadcastUserList();
    });

    socket.on('update_group_name', ({ groupName, updatedBy }) => {
      roomManager.setGroupName(groupName);
      io.to(chatRoom).emit('group_name_updated', {
        groupName: roomManager.getGroupName(),
        updatedBy: updatedBy || ''
      });
    });

    socket.on('group_chat', async (params, ack) => {
      const decorated = decorateGroupMessage(params, roomManager.getUser(params.sender));
      const { message: savedMessage, error } = await persistMessage(decorated);

      if (typeof ack === 'function') {
        ack(error ? { ...decorated, status: 'failed', error: 'Message persistence failed' } : savedMessage);
      }

      if (error) return;

      trackMessage('group', 'send', decorated, socket);
      socket.broadcast.to(chatRoom).emit('reply_group_chat', savedMessage);

      trackEvent('message_action', {
        chat_type: 'group',
        msg_type: decorated.msgType || 'TEXT',
        direction: 'broadcast',
        user_agent: socket.handshake.headers['user-agent']
      });
    });

    socket.on('history_query', async (params = {}, ack) => {
      if (typeof ack !== 'function') return;

      try {
        const requester = socket.username || params.requester;
        const chatType = params.chatType || (
          params.targetUser === 'group_chat' ? 'group' : 'private'
        );
        const data = await historyService.queryHistory({
          requester,
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
        const chatType = params.chatType || (
          params.targetUser === 'group_chat' ? 'group' : 'private'
        );
        const { attachments } = await historyService.queryAttachments({
          requester,
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
              createTime: attachment.createTime,
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
        const chatType = params.chatType || (
          params.targetUser === 'group_chat' ? 'group' : 'private'
        );
        const data = await batchDownloadService.createDownloadToken({
          requester,
          chatType,
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
        const chatType = params.chatType || (
          params.targetUser === 'group_chat' ? 'group' : 'private'
        );
        const conversation = historyService.getConversation({
          requester,
          chatType,
          targetUser: params.targetUser
        });
        const data = await historyService.clearHistory({
          requester,
          chatType,
          targetUser: params.targetUser
        });

        broadcastHistoryCleared({
          chatType,
          targetUser: params.targetUser,
          sessionId: conversation.sessionId
        }, socket);
        ack({ code: 0, data });
      } catch (error) {
        console.error('[History] clear failed:', error.message);
        ack({ code: -1, message: 'Failed to clear history' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] disconnect: ${socket.username || 'unknown'} ${socket.id}`);
      if (!socket.username) return;

      const result = roomManager.removeSocket(socket.username, socket.id);
      if (result.user && !result.hasConnections) {
        scheduleOffline(socket.username);
      }
    });
  });

  io.on('close', () => {
    for (const timer of offlineTimers.values()) clearTimeout(timer);
    offlineTimers.clear();
  });

  return io;
};
