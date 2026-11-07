import { afterAll, beforeAll, describe, expect, it } from 'vitest';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PassThrough } = require('node:stream');
const {
  MessageHistoryService
} = require('../server/services/message-history-service');
const {
  BatchDownloadService,
  buildUniqueZipEntryName
} = require('../server/services/batch-download-service');

let cachePath;
let historyService;
let batchDownloadService;

beforeAll(async () => {
  cachePath = fs.mkdtempSync(path.join(os.tmpdir(), 'chattransfer-batch-download-'));
  historyService = new MessageHistoryService({ cachePath });
  await historyService.init();
  batchDownloadService = new BatchDownloadService({ historyService });
});

afterAll(async () => {
  await historyService.close();
  fs.rmSync(cachePath, { recursive: true, force: true });
});

async function saveAttachmentMessage(msgId, fileName, physicalName, content) {
  const filesDir = path.join(cachePath, 'files');
  fs.mkdirSync(filesDir, { recursive: true });
  fs.writeFileSync(path.join(filesDir, physicalName), content, 'utf8');

  return historyService.saveMessage({
    msgId,
    sender: 'batch-user-a',
    receiver: 'group_chat',
    msgType: 'FILE',
    fileName,
    fileSize: Buffer.byteLength(content),
    fileType: 'text/plain',
    fileUrl: `http://127.0.0.1:55555/files/${encodeURIComponent(physicalName)}`,
    createTime: '2026-01-01 00:00:00',
    createdAt: Date.now()
  });
}

function collectStream(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

describe('Batch download', () => {
  it('creates a one-time download and streams a valid zip archive', async () => {
    await saveAttachmentMessage('batch-1', 'same-name.txt', 'physical-1.txt', 'first');
    await saveAttachmentMessage('batch-2', 'same-name.txt', 'physical-2.txt', 'second');

    const { attachments } = await historyService.queryAttachments({
      requester: 'batch-user-a',
      chatType: 'group',
      targetUser: 'group_chat'
    });
    const download = await batchDownloadService.createDownloadToken({
      requester: 'batch-user-a',
      chatType: 'group',
      targetUser: 'group_chat',
      messageIds: attachments.map((attachment) => attachment.msgId)
    });
    const record = batchDownloadService.consumeDownloadToken(download.token);
    const response = new PassThrough();
    response.status = () => response;
    response.setHeader = () => response;

    expect(record).not.toBeNull();
    expect(batchDownloadService.streamArchive(response, record)).toBe(true);
    const archive = await collectStream(response);

    expect(archive.subarray(0, 2).toString('utf8')).toBe('PK');
    expect(batchDownloadService.consumeDownloadToken(download.token)).toBeNull();
  });

  it('rejects missing and invalid attachments', async () => {
    await expect(batchDownloadService.createDownloadToken({
      requester: 'batch-user-a',
      chatType: 'group',
      targetUser: 'group_chat',
      messageIds: []
    })).rejects.toThrow('No attachment selected');

    await expect(batchDownloadService.createDownloadToken({
      requester: 'batch-user-a',
      chatType: 'group',
      targetUser: 'group_chat',
      messageIds: ['not-exists']
    })).rejects.toThrow('Attachment not found');
  });

  it('deduplicates zip entry names', () => {
    const usedNames = new Set();
    expect(buildUniqueZipEntryName('a.txt', usedNames)).toBe('a.txt');
    expect(buildUniqueZipEntryName('a.txt', usedNames)).toBe('a (2).txt');
    expect(buildUniqueZipEntryName('../a.txt', usedNames)).toBe('__a.txt');
  });

  it('revokes pending download tokens for a deleted room', () => {
    batchDownloadService.tokens.set('room-token-a', {
      attachments: [],
      roomId: 'room-a',
      expiresAt: Date.now() + 1000
    });
    batchDownloadService.tokens.set('room-token-b', {
      attachments: [],
      roomId: 'room-b',
      expiresAt: Date.now() + 1000
    });

    expect(batchDownloadService.revokeRoom('room-a')).toBe(1);
    expect(batchDownloadService.consumeDownloadToken('room-token-a')).toBeNull();
    expect(batchDownloadService.consumeDownloadToken('room-token-b')).not.toBeNull();
  });
});
