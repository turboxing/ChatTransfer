import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { RoomManager } from '../server/room-manager';

let tempDir;
let configPath;

beforeAll(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chattransfer-api-'));
  configPath = path.join(tempDir, 'config.json');
  await fs.writeFile(configPath, JSON.stringify({ cachePath: tempDir }));
  process.env.CHATTRANSFER_CONFIG_FILE = configPath;
});

afterAll(async () => {
  delete process.env.CHATTRANSFER_CONFIG_FILE;
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe('HTTP API', () => {
  it('returns login URLs and metadata', async () => {
    const serverModule = await import('../server/index');
    const app = serverModule.createApp();

    const version = await request(app).get('/getVersionInfo');
    expect(version.status).toBe(200);
    expect(version.body.data.version).toBe('2.0.9.1');

    const scan = await request(app).get('/scanLogin?sender=A&receiver=group_chat');
    expect(scan.status).toBe(200);
    expect(scan.body.data.targetUrl).toContain('/chat?sender=A&receiver=group_chat');
  });

  it('rejects uploads without a file', async () => {
    const serverModule = await import('../server/index');
    const app = serverModule.createApp();

    const response = await request(app).post('/uploadFile');
    expect(response.status).toBe(400);
    expect(response.body.code).toBe(-1);
  });

  it('exposes shared login state through checkLogin', async () => {
    const { default: registerSession } = await import('../server/routes/session');
    const express = (await import('express')).default;
    const app = express();
    app.use(express.json());
    app.use(registerSession);

    const roomManager = new RoomManager();
    roomManager.setOnline({ username: 'A', socketId: 'socket-a', nickname: 'A', ip: '127.0.0.1' });

    const response = await request(app).get('/checkLogin');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data.users)).toBe(true);
  });
});
