const socketIo = require('socket.io');
const roomManager = require('./session-manager');
const { trackEvent } = require('../telemetry/compat');
const {
  decorateGroupMessage,
  decoratePrivateMessage
} = require('../services/message-service');

module.exports = function registerSocket(server) {
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

    socket.on('private_chat', (params, ack) => {
      const decorated = decoratePrivateMessage(params, roomManager.getUser(params.sender));

      if (typeof ack === 'function') {
        ack(decorated);
      }

      trackMessage('private', 'send', decorated, socket);

      const receiver = roomManager.getUser(decorated.receiver);

      if (receiver && receiver.status === roomManager.getOnline()) {
        socket.to(receiver.socketId).emit('reply_private_chat', decorated);

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

    socket.on('group_chat', (params, ack) => {
      const decorated = decorateGroupMessage(params, roomManager.getUser(params.sender));

      if (typeof ack === 'function') {
        ack(decorated);
      }

      trackMessage('group', 'send', decorated, socket);
      socket.broadcast.to(chatRoom).emit('reply_group_chat', decorated);

      trackEvent('message_action', {
        chat_type: 'group',
        msg_type: decorated.msgType || 'TEXT',
        direction: 'broadcast',
        user_agent: socket.handshake.headers['user-agent']
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] disconnect: ${socket.username || 'unknown'} ${socket.id}`);
      roomManager.setOffline(socket.username);
      broadcastUserList();
    });
  });

  return io;
};
