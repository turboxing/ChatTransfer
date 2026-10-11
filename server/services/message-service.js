const moment = require('moment');
const crypto = require('crypto');

function decorateMessage(message, sender) {
  const decorated = { ...message };

  decorated.createTime = moment().format('YYYY-MM-DD HH:mm:ss');
  decorated.msgId = crypto.randomUUID();
  decorated.createdAt = Date.now();
  decorated.senderPhotoNickname = decorated.sender.slice(0, 2);

  if (sender) {
    decorated.sender_nickname = sender.nickname || '';
    decorated.sender_ip = sender.ip || '';
  }

  return decorated;
}

function decoratePrivateMessage(message, sender) {
  return decorateMessage(message, sender);
}

function decorateGroupMessage(message, sender) {
  return decorateMessage(message, sender);
}

module.exports = {
  decoratePrivateMessage,
  decorateGroupMessage
};
