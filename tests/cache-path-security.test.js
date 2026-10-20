import { describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import {
  getSafeStartupCachePath,
  validateCachePath
} from '../server/utils/cache-path-validation';

describe('cache path security', () => {
  it('rejects filesystem, application, home, and system roots', () => {
    const appRoot = path.resolve('/projects/ChatTransfer');
    const options = {
      appRoot,
      configPath: path.join(appRoot, 'config.json'),
      currentPath: path.join(appRoot, 'uploads'),
      dataRoot: appRoot,
      homeDir: path.resolve('/Users/tester')
    };

    expect(validateCachePath('/', options).valid).toBe(false);
    expect(validateCachePath(appRoot, options).valid).toBe(false);
    expect(validateCachePath(path.dirname(appRoot), options).valid).toBe(false);
    expect(validateCachePath(options.homeDir, options).valid).toBe(false);
    expect(validateCachePath(path.dirname(options.homeDir), options).valid).toBe(false);
    expect(validateCachePath('/etc', options).valid).toBe(false);
    expect(validateCachePath('relative/path', options).valid).toBe(false);
  });

  it('accepts a dedicated writable directory', () => {
    const appRoot = path.resolve('/projects/ChatTransfer');
    const cachePath = path.join(appRoot, '.cache-test');
    const result = validateCachePath(cachePath, {
      appRoot,
      configPath: path.join(appRoot, 'config.json'),
      currentPath: path.join(appRoot, 'uploads'),
      dataRoot: appRoot,
      homeDir: path.resolve('/Users/tester')
    });

    expect(result.valid).toBe(true);
    expect(result.path).toBe(cachePath);
  });

  it('falls back to the default cache path when the saved path is unsafe', () => {
    const appRoot = path.resolve('/projects/ChatTransfer');
    const defaultPath = path.join(appRoot, 'uploads');
    const result = getSafeStartupCachePath({
      appRoot,
      configPath: path.join(appRoot, 'config.json'),
      configuredPath: path.dirname(appRoot),
      dataRoot: appRoot,
      defaultPath
    });

    expect(result).toEqual({
      path: defaultPath,
      changed: true,
      reason: 'protected'
    });
  });

  it('rejects a symlink that resolves to a protected directory', () => {
    if (process.platform === 'win32') return;

    const appRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'chattransfer-app-'));
    const linkPath = path.join(appRoot, 'root-link');
    fs.symlinkSync(path.parse(appRoot).root, linkPath);

    try {
      const result = validateCachePath(linkPath, {
        appRoot,
        configPath: path.join(appRoot, 'config.json'),
        currentPath: path.join(appRoot, 'uploads'),
        dataRoot: appRoot,
        homeDir: path.resolve('/Users/tester')
      });

      expect(result.valid).toBe(false);
    } finally {
      fs.rmSync(appRoot, { recursive: true, force: true });
    }
  });

  it('rejects the filesystem root through the API and only serves the files subdirectory', async () => {
    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chattransfer-config-'));
    const cachePath = fs.mkdtempSync(path.join(os.tmpdir(), 'chattransfer-cache-'));
    const configPath = path.join(configDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify({ cachePath }));
    fs.mkdirSync(path.join(cachePath, 'files'), { recursive: true });
    fs.writeFileSync(path.join(cachePath, 'secret.txt'), 'cache root secret');
    fs.writeFileSync(path.join(cachePath, 'files', 'public.txt'), 'public file');

    process.env.CHATTRANSFER_CONFIG_FILE = configPath;
    const { createApp } = await import('../server/index');
    const app = createApp();

    try {
      const changeResponse = await request(app)
        .post('/setCachePath')
        .send({ path: path.parse(cachePath).root });

      expect(changeResponse.body.code).toBe(-1);
      expect(changeResponse.body.message).toBe('invalid cache path');
      expect(JSON.parse(fs.readFileSync(configPath, 'utf8')).cachePath).toBe(cachePath);

      const homeResponse = await request(app).get('/getHomeDir');
      expect(homeResponse.body.data.uploadsDir).toBe(cachePath);

      const publicResponse = await request(app).get('/files/public.txt');
      expect(publicResponse.status).toBe(200);
      expect(publicResponse.text).toBe('public file');

      const uploadResponse = await request(app)
        .post('/uploadFile')
        .attach('file_data', Buffer.from('uploaded content'), {
          filename: 'test.txt',
          contentType: 'text/plain'
        });

      expect(uploadResponse.body.code).toBe(0);
      expect(
        fs.existsSync(path.join(cachePath, 'files', uploadResponse.body.data.name))
      ).toBe(true);

      const rootFileResponse = await request(app).get('/secret.txt');
      expect(rootFileResponse.text).not.toContain('cache root secret');
    } finally {
      delete process.env.CHATTRANSFER_CONFIG_FILE;
      fs.rmSync(cachePath, { recursive: true, force: true });
      fs.rmSync(configDir, { recursive: true, force: true });
    }
  });
});
