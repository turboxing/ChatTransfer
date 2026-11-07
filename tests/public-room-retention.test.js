import { afterAll, beforeAll, describe, expect, it } from 'vitest';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  MessageHistoryService
} = require('../server/services/message-history-service');

let cachePath;
let service;

beforeAll(async () => {
  cachePath = fs.mkdtempSync(path.join(os.tmpdir(), 'chattransfer-retention-'));
  service = new MessageHistoryService({ cachePath });
  await service.init();
});

afterAll(async () => {
  await service.close();
  fs.rmSync(cachePath, { recursive: true, force: true });
});

describe('Public Lobby retention', () => {
  it('removes only messages older than the configured retention period', async () => {
    const now = Date.now();
    await service.saveMessage({
      msgId: 'retention-old',
      sender: 'retention-user',
      receiver: 'group_chat',
      msgType: 'TEXT',
      content: 'old public message',
      createTime: 'old',
      createdAt: now - (10 * 24 * 60 * 60 * 1000)
    });
    await service.saveMessage({
      msgId: 'retention-new',
      sender: 'retention-user',
      receiver: 'group_chat',
      msgType: 'TEXT',
      content: 'new public message',
      createTime: 'new',
      createdAt: now
    });

    await service.cleanupExpiredPublicRoomMessages({
      retentionDays: 7,
      now
    });

    const history = await service.queryHistory({
      requester: 'retention-user',
      chatType: 'group',
      targetUser: 'group_chat'
    });
    expect(history.messages.map((message) => message.content)).toEqual(['new public message']);
  });
});
