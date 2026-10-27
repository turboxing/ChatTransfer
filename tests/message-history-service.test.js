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
  cachePath = fs.mkdtempSync(path.join(os.tmpdir(), 'chattransfer-history-'));
  service = new MessageHistoryService({ cachePath });
  await service.init();
});

afterAll(async () => {
  await service.close();
  fs.rmSync(cachePath, { recursive: true, force: true });
});

describe('MessageHistoryService', () => {
  it('stores and queries group history in ascending order', async () => {
    await service.saveMessage({
      msgId: 'group-1',
      sender: 'user-a',
      receiver: 'group_chat',
      msgType: 'TEXT',
      content: 'first',
      createTime: '2026-01-01 00:00:00',
      createdAt: 1
    });
    await service.saveMessage({
      msgId: 'group-2',
      sender: 'user-b',
      receiver: 'group_chat',
      msgType: 'TEXT',
      content: 'second',
      createTime: '2026-01-01 00:00:01',
      createdAt: 2
    });

    const result = await service.queryHistory({
      requester: 'user-c',
      chatType: 'group',
      targetUser: 'group_chat'
    });

    expect(result.messages.map((message) => message.text)).toEqual(['first', 'second']);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBe(2);
  });

  it('uses a stable private session and supports cursor synchronization', async () => {
    const first = await service.saveMessage({
      msgId: 'private-1',
      sender: 'user-a',
      receiver: 'user-b',
      msgType: 'TEXT',
      content: 'private first',
      createTime: '2026-01-01 00:00:00',
      createdAt: 3
    });
    await service.saveMessage({
      msgId: 'private-2',
      sender: 'user-b',
      receiver: 'user-a',
      msgType: 'TEXT',
      content: 'private second',
      createTime: '2026-01-01 00:00:01',
      createdAt: 4
    });

    const synchronizedMessages = await service.queryHistory({
      requester: 'user-a',
      chatType: 'private',
      targetUser: 'user-b',
      cursor: 3
    });

    expect(synchronizedMessages.messages.map((message) => message.content)).toEqual(['private second']);
    expect(first.msgId).toBe('private-1');
  });

  it('clears a session and deletes its unreferenced physical files', async () => {
    const filesDir = path.join(cachePath, 'files');
    fs.mkdirSync(filesDir, { recursive: true });
    const physicalFile = path.join(filesDir, 'history-test.txt');
    fs.writeFileSync(physicalFile, 'hello', 'utf8');

    await service.saveMessage({
      msgId: 'file-1',
      sender: 'user-a',
      receiver: 'group_chat',
      msgType: 'FILE',
      content: '',
      fileName: 'history-test.txt',
      fileSize: 5,
      fileType: 'text/plain',
      fileUrl: 'http://127.0.0.1:55555/files/history-test.txt',
      createTime: '2026-01-01 00:00:00',
      createdAt: 5
    });

    const result = await service.clearHistory({
      requester: 'user-a',
      chatType: 'group',
      targetUser: 'group_chat'
    });
    const history = await service.queryHistory({
      requester: 'user-a',
      chatType: 'group',
      targetUser: 'group_chat'
    });

    expect(result.deletedFiles).toBe(1);
    expect(history.messages).toHaveLength(0);
    expect(fs.existsSync(physicalFile)).toBe(false);
  });

  it('returns the physical file URL after a service restart', async () => {
    const filesDir = path.join(cachePath, 'files');
    fs.mkdirSync(filesDir, { recursive: true });
    const physicalFile = path.join(filesDir, '123_display-name.txt');
    fs.writeFileSync(physicalFile, 'hello', 'utf8');

    await service.saveMessage({
      msgId: 'file-2',
      sender: 'user-a',
      receiver: 'group_chat',
      msgType: 'FILE',
      content: '',
      fileName: 'display-name.txt',
      fileSize: 5,
      fileType: 'text/plain',
      fileUrl: 'http://127.0.0.1:55555/files/123_display-name.txt',
      createTime: '2026-01-01 00:00:00',
      createdAt: 6
    });

    await service.close();
    service = new MessageHistoryService({ cachePath });
    await service.init();

    const history = await service.queryHistory({
      requester: 'user-a',
      chatType: 'group',
      targetUser: 'group_chat'
    });
    const message = history.messages.find((item) => item.msgId === 'file-2');

    expect(message.fileUrl).toBe('/files/123_display-name.txt');
    expect(message.fileName).toBe('display-name.txt');
    expect(fs.existsSync(physicalFile)).toBe(true);
  });
});
