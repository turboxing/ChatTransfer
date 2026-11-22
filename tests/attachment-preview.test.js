import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { decodePreview, searchPreview } from '../frontend/src/composables/attachment-preview-utils';
import { formatFileSize } from '../frontend/src/composables/use-message-utils';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const request = require('supertest');
const { MessageHistoryService } = require('../server/services/message-history-service');
const { AttachmentPreviewService, TEXT_PREVIEW_LIMIT } = require('../server/services/attachment-preview-service');
const routes = require('../server/routes/attachment-preview');

let root;
let history;
let service;
let app;
let room;

beforeAll(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'chattransfer-preview-'));
  history = new MessageHistoryService({ cachePath: root });
  await history.init();
  service = new AttachmentPreviewService({ historyService: history });
  app = express();
  app.use(routes(service));
  room = await history.createRoom({ name: 'Preview room', createdBy: 'owner' });
});
afterAll(async () => {
  await history.close();
  fs.rmSync(root, { recursive: true, force: true });
});

async function attachment(name, content, roomId = 'group_chat') {
  fs.mkdirSync(path.join(root, 'files'), { recursive: true });
  fs.writeFileSync(path.join(root, 'files', name), content);
  await history.saveMessage({
    msgId: name, sender: 'owner', receiver: roomId, roomId,
    msgType: 'FILE', fileName: name, fileUrl: `/files/${name}`,
    fileSize: content.length, fileType: 'text/html', createdAt: Date.now()
  });
  return service.createToken({ requester: 'owner', roomId, messageId: name });
}

describe('attachment preview routes and permissions', () => {
  it('reads at most 1 MiB and returns full file size, including legacy messages', async () => {
    const file = await attachment('large.log', Buffer.alloc(TEXT_PREVIEW_LIMIT + 40, 65));
    await history.run('UPDATE messages SET file_size = NULL WHERE id = ?', ['large.log']);
    const response = await request(app).get(file.url + '?text=1').expect(200);
    expect(response.body.length).toBe(TEXT_PREVIEW_LIMIT);
    expect(response.headers['x-preview-truncated']).toBe('true');
    expect(Number(response.headers['x-file-size'])).toBe(TEXT_PREVIEW_LIMIT + 40);
    const result = await history.queryHistory({ requester: 'owner', roomId: 'group_chat' });
    expect(result.messages.find(message => message.msgId === 'large.log').fileSize).toBe(TEXT_PREVIEW_LIMIT + 40);
  });

  it('supports media ranges, HEAD and invalid ranges', async () => {
    const file = await attachment('clip.mp4', Buffer.from('0123456789'));
    const response = await request(app).get(file.url).set('Range', 'bytes=2-5').expect(206);
    expect(response.headers['content-range']).toBe('bytes 2-5/10');
    expect(response.headers['content-type']).toBe('video/mp4');
    expect(response.body.toString()).toBe('2345');
    await request(app).head(file.url).expect(200).expect('Content-Length', '10');
    await request(app).get(file.url).set('Range', 'bytes=100-200').expect(416);
  });

  it('does not render active content even with a forged MIME type', async () => {
    const file = await attachment('unsafe.html', Buffer.from('<script>alert(1)</script>'));
    expect(file.kind).toBe('metadata');
    await request(app).get(file.url).expect(200).expect('Content-Type', 'application/octet-stream');
    await request(app).get(file.url + '?text=1').expect(415);
  });

  it('handles empty files, JSON and explicit downloads', async () => {
    const empty = await attachment('empty.txt', Buffer.alloc(0));
    expect(empty.fileSize).toBe(0);
    expect((await history.get('SELECT file_size FROM messages WHERE id = ?', ['empty.txt'])).file_size).toBe(0);
    await request(app).get(empty.url + '?text=1').expect(200).expect('X-Preview-Truncated', 'false');
    const file = await attachment('config.json', Buffer.from('{"enabled":true}'));
    expect(file.kind).toBe('text');
    const response = await request(app).get(file.url + '?download=1').expect(200);
    expect(response.headers['content-disposition']).toMatch(/^attachment;/);
  });

  it('rejects cross-room access and rechecks membership on every request', async () => {
    const file = await attachment('private.txt', Buffer.from('private'), room.id);
    await expect(service.createToken({ requester: 'stranger', roomId: room.id, messageId: 'private.txt' })).rejects.toThrow('access denied');
    await expect(service.createToken({ requester: 'owner', roomId: 'group_chat', messageId: 'private.txt' })).rejects.toThrow('unavailable');
    await history.run('DELETE FROM room_participants WHERE room_id = ? AND user_id = ?', [room.id, 'owner']);
    await request(app).get(file.url + '?text=1').expect(410);
  });

  it('rejects expired tokens, removed files and escaped symlinks', async () => {
    const expired = await attachment('expired.txt', Buffer.from('expired'));
    service.tokens.get(expired.url.split('/').pop()).expiresAt = 0;
    await request(app).get(expired.url).expect(410);
    const removed = await attachment('removed.txt', Buffer.from('removed'));
    fs.unlinkSync(path.join(root, 'files', 'removed.txt'));
    await request(app).get(removed.url).expect(410);
    await attachment('symlink.txt', Buffer.from('safe'));
    fs.writeFileSync(path.join(root, 'outside.txt'), 'private');
    fs.unlinkSync(path.join(root, 'files', 'symlink.txt'));
    fs.symlinkSync(path.join(root, 'outside.txt'), path.join(root, 'files', 'symlink.txt'));
    await expect(service.createToken({ requester: 'owner', roomId: 'group_chat', messageId: 'symlink.txt' })).rejects.toThrow('unavailable');
    await request(app).get('/attachment-preview/not-a-token').expect(410);
  });
});

describe('preview text and size utilities', () => {
  it('decodes UTF-8, BOM UTF-16 and GB18030 and drops an incomplete final character', () => {
    expect(decodePreview(Buffer.from('日志'))).toBe('日志');
    expect(decodePreview(Buffer.concat([Buffer.from([255, 254]), Buffer.from('日志', 'utf16le')]))).toBe('日志');
    expect(decodePreview(Uint8Array.from([0xd6, 0xd0, 0xce, 0xc4]), 'gb18030')).toBe('中文');
    expect(decodePreview(Uint8Array.from([65, 0xe4, 0xb8]), 'utf-8', true)).toBe('A');
    expect(() => decodePreview(Buffer.from([0, 1, 2, 3]))).toThrow('binary');
  });

  it('searches literal text and caps highlights', () => {
    expect(searchPreview('a.*a.*', '.*')).toEqual([1, 4]);
    expect(searchPreview('a'.repeat(1000), 'a')).toHaveLength(500);
    expect(searchPreview('text', '')).toEqual([]);
    expect(searchPreview('text', 'absent')).toEqual([]);
  });

  it('distinguishes unknown and zero sizes and formats readable values', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(null, 'unknown')).toBe('unknown');
    expect(formatFileSize(undefined, 'unknown')).toBe('unknown');
    expect(formatFileSize(-1, 'unknown')).toBe('unknown');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(2500000)).toBe('2.4 MB');
  });
});
