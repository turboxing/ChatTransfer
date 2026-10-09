const express = require('express');
const path = require('path');
const { trackEvent } = require('../telemetry/compat');
const fs = require('fs');
const fileUpload = require('express-fileupload');
const { getCachePath } = require('../config');

module.exports = function registerRoutes(app) {
  const uploadsDir = getCachePath();
  const tempDir = path.join(uploadsDir, 'tmp');

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  app.use(fileUpload({
    createParentPath: true,
    useTempFiles: true,
    tempFileDir: tempDir,
    defParamCharset: 'utf8'
  }));

  app.use(express.json());

  app.use(require('./system'));
  app.use(require('./session'));
  app.use(require('./qr'));
  app.use(require('./files'));

  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  app.use(express.static(uploadsDir));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  });
};
