const socketIo = require('socket.io');
const roomManager = require('./session-manager');
const { trackEvent } = require('../telemetry/compat');
const {
  decorateGroupMessage,
  decoratePrivateMessage
} = require('../services/message-service');

module.exports = function registerSocket(server, historyService) {
  if (!historyService) {
    throw new Error('historyService is required');
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

  const getClientIp = (socket) => {
    const address = socket.handshake.address || socket.request.connection.remoteAddress;

    return address ? address.replace(/^::ffff:/, '') : '';
  };

  const broadcastUserList = () => {
    io.to(chatRoom).emit('user_list_updated', {
      users: roomManager.listUsers()
    });
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
    const receiver = roomManager.getUser(targetUser);
    if (receiver && receiver.status === roomManager.getOnline()) {
      io.to(receiver.socketId).emit('history_cleared', payload);
    }
  };

  io.on('connection', (socket) => {
    console.log(`[Socket] connected: ${socket.id}`);

    socket.on('login', ({ uid } = {}) => {
      console.log(`[Socket] login: ${uid}`);
    });

    socket.on('online', (username) => {
      console.log(`[Socket] online: ${username} ${socket.id}`);
      socket.username = username;
      socket.join(chatRoom);
      roomManager.setOnline({
        username,
        socketId: socket.id,
        ip: getClientIp(socket)
      });
      broadcastUserList();
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
        socket.to(receiver.socketId).emit('reply_private_chat', savedMessage);

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
      socket.join(chatRoom);
      socket.username = username;
      roomManager.setOnline({
        username,
        socketId: socket.id,
        nickname,
        ip: getClientIp(socket)
      });
      socket.emit('group_name_updated', {
        groupName: roomManager.getGroupName(),
        updatedBy: ''
      });
      broadcastUserList();
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
      roomManager.setOffline(socket.username);
      broadcastUserList();
    });
  });

  return io;
};
