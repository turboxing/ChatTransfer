const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const router = express.Router();
const { getCachePath, getDefaultCachePath, isCustomized, setCachePath, CONFIG_FILE } = require('../config');
const { getAppWritableRoot } = require('../utils/app-root');
const { trackEvent } = require('../telemetry/compat');

router.get('/getHomeDir', (req, res) => {
  const uploadsDir = getCachePath();

  res.send({
    code: 0,
    message: 'ok',
    data: {
      uploadsDir,
      defaultDir: getDefaultCachePath(),
      isCustomized: isCustomized(),
      configFile: CONFIG_FILE
    }
  });
});

router.get('/getVersionInfo', (req, res) => {
  res.send({
    code: 0,
    message: 'ok',
    data: {
      version: require('../../package.json').version,
      deviceId: 'anonymous'
    }
  });
});

router.post('/openCachePath', express.json(), (req, res) => {
  const uploadsDir = getCachePath();
  const respond = (code, message) => res.send({
    code,
    message,
    data: { platform: process.platform, path: uploadsDir }
  });

  if (process.platform === 'darwin') {
    exec(`open ${JSON.stringify(uploadsDir)}`, (error) => {
      respond(error ? -1 : 0, error ? `打开失败：${error.message}` : '打开成功');
    });
  } else if (process.platform === 'win32') {
    exec(`explorer "${uploadsDir}"`, (error) => {
      respond(error ? -1 : 0, error ? `打开失败：${error.message}` : '打开成功');
    });
  } else {
    respond(-1, '暂不支持的平台');
  }
});

router.post('/setCachePath', (req, res) => {
  const inputPath = req.body && req.body.path;

  if (!inputPath || typeof inputPath !== 'string') {
    return res.send({ code: -1, message: 'invalid path' });
  }

  const newPath = path.resolve(inputPath.trim());
  const appRoot = path.resolve(getAppWritableRoot());

  if (!path.isAbsolute(newPath) || newPath === path.resolve(getCachePath()) || newPath === appRoot) {
    return res.send({ code: -1, message: 'invalid cache path' });
  }

  try {
    require('fs').mkdirSync(newPath, { recursive: true });
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

module.exports = router;
