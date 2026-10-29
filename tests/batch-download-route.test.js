import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  MessageHistoryService
} = require('../server/services/message-history-service');
const {
  BatchDownloadService
} = require('../server/services/batch-download-service');
const registerBatchDownloadRoutes = require('../server/routes/batch-download');

let cachePath;
let historyService;
let batchDownloadService;
let app;

function binaryParser(response, callback) {
  response.setEncoding('binary');
  response.data = '';
  response.on('data', (chunk) => {
    response.data += chunk;
  });
  response.on('end', () => callback(null, Buffer.from(response.data, 'binary')));
}

beforeAll(async () => {
  cachePath = fs.mkdtempSync(path.join(os.tmpdir(), 'chattransfer-batch-route-'));
  historyService = new MessageHistoryService({ cachePath });
  await historyService.init();
  batchDownloadService = new BatchDownloadService({ historyService });
  app = express();
  app.use(registerBatchDownloadRoutes(batchDownloadService));

  const filesDir = path.join(cachePath, 'files');
  fs.mkdirSync(filesDir, { recursive: true });
  fs.writeFileSync(path.join(filesDir, 'route-file.txt'), 'route file content', 'utf8');
  await historyService.saveMessage({
    msgId: 'route-file-1',
    sender: 'route-user-a',
    receiver: 'group_chat',
    msgType: 'FILE',
    fileName: 'route-file.txt',
    fileSize: 18,
    fileType: 'text/plain',
    fileUrl: 'http://127.0.0.1:55555/files/route-file.txt',
    createTime: '2026-01-01 00:00:00',
    createdAt: 1
  });
});

afterAll(async () => {
  await historyService.close();
  fs.rmSync(cachePath, { recursive: true, force: true });
});

describe('batch download route', () => {
  it('streams a zip once and rejects reuse', async () => {
    const download = await batchDownloadService.createDownloadToken({
      requester: 'route-user-a',
      chatType: 'group',
      targetUser: 'group_chat',
      messageIds: ['route-file-1']
    });

    const response = await request(app)
      .get(download.downloadUrl)
      .parse(binaryParser)
      .expect(200);
    expect(response.headers['content-type']).toContain('application/zip');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(response.body.subarray(0, 2).toString('utf8')).toBe('PK');

    await request(app).get(download.downloadUrl).expect(410);
  });

  it('rejects unknown tokens', async () => {
    await request(app).get('/batch-download/unknown-token').expect(410);
  });
});
