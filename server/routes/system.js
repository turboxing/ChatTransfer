const express = require('express');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const {
  getCachePath,
  getConfigFile,
  getDefaultCachePath,
  setCachePath
} = require('../config');
const { getDefaultDataDir } = require('../utils/runtime-paths');
const { validateCachePath } = require('../utils/cache-path-validation');
const { trackEvent } = require('../telemetry/compat');

module.exports = (configuredUploadsDir = getCachePath()) => {
  const router = express.Router();
  const uploadsDir = path.resolve(configuredUploadsDir);

  router.get('/getHomeDir', (req, res) => {
    res.send({
      code: 0,
      message: 'ok',
      data: {
        uploadsDir,
        defaultDir: getDefaultCachePath(),
        isCustomized: uploadsDir !== path.resolve(getDefaultCachePath()),
        configFile: getConfigFile()
      }
    });
  });

  router.get('/getVersionInfo', (req, res) => {
    res.send({
      code: 0,
      message: 'ok',
      data: {
        version: require('../../package.json').version,
        copyright: '© suncx and ChatTransfer Contributors',
        deviceId: 'anonymous'
      }
    });
  });

  router.post('/openCachePath', express.json(), (req, res) => {
    const respond = (code, message) => res.send({
      code,
      message,
      data: { platform: process.platform, path: uploadsDir }
    });

    if (process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
      respond(0, '服务器无桌面环境，缓存目录已返回');
      return;
    }

    if (process.platform === 'darwin') {
      execFile('open', [uploadsDir], (error) => {
        respond(error ? -1 : 0, error ? `打开失败：${error.message}` : '打开成功');
      });
    } else if (process.platform === 'win32') {
      execFile('explorer', [uploadsDir], (error) => {
        respond(error ? -1 : 0, error ? `打开失败：${error.message}` : '打开成功');
      });
    } else {
      execFile('xdg-open', [uploadsDir], (error) => {
        respond(error ? -1 : 0, error ? `打开失败：${error.message}` : '打开成功');
      });
    }
  });

  router.post('/setCachePath', (req, res) => {
    const inputPath = req.body && req.body.path;

    if (!inputPath || typeof inputPath !== 'string') {
      return res.send({ code: -1, message: 'invalid path' });
    }

    const validation = validateCachePath(inputPath, {
      appRoot: path.resolve(__dirname, '..', '..'),
      configPath: getConfigFile(),
      currentPath: uploadsDir,
      dataRoot: getDefaultDataDir()
    });

    if (!validation.valid) {
      return res.send({ code: -1, message: 'invalid cache path' });
    }

    try {
      const newPath = validation.path;
      fs.mkdirSync(newPath, { recursive: true });

      const testFile = path.join(newPath, '.chattransfer-write-test');
      fs.writeFileSync(testFile, 'ok', 'utf8');
      fs.unlinkSync(testFile);

      setCachePath(newPath);
      res.send({
        code: 0,
        message: 'ok',
        data: { newPath, needsRestart: true }
      });
    } catch (error) {
      res.send({ code: -1, message: error.message });
    }
  });

  router.post('/api/track', (req, res) => {
    const { eventType, eventProperties, userId } = req.body || {};

    if (!eventType) {
      return res.status(400).send({ code: -1, message: 'eventType is required' });
    }

    trackEvent(eventType, eventProperties || {}, userId || null);
    res.send({ code: 0, message: 'ok' });
  });

  return router;
};
