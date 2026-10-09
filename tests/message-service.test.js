import { describe, expect, it } from 'vitest';
const {
  decoratePrivateMessage,
  decorateGroupMessage
} = require('../server/services/message-service');

describe('message service', () => {
  it('decorates a private message with sender metadata', () => {
    const message = decoratePrivateMessage(
      { sender: 'sender-a', receiver: 'sender-b', content: 'hello' },
      { nickname: 'A', ip: '192.168.0.10' }
    );

    expect(message.msgId).toMatch(/^\d+$/);
    expect(message.createTime).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(message.senderPhotoNickname).toBe('se');
    expect(message.sender_nickname).toBe('A');
    expect(message.sender_ip).toBe('192.168.0.10');
  });

  it('decorates a group message without sender lookup', () => {
    const message = decorateGroupMessage(
      { sender: 'sender-a', receiver: 'group_chat', content: 'hello' }
    );

    expect(message.receiver).toBe('group_chat');
    expect(message.sender_nickname).toBeUndefined();
    expect(message.sender_ip).toBeUndefined();
  });
});
