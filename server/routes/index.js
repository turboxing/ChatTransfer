const express = require('express');
const path = require('path');
const { trackEvent } = require('../telemetry/compat');
const fs = require('fs');
const fileUpload = require('express-fileupload');
const { getCachePath } = require('../config');
const { BatchDownloadService } = require('../services/batch-download-service');

module.exports = function registerRoutes(
  app,
  configuredUploadsDir = getCachePath(),
  historyService = null,
  batchDownloadService = null
) {
  const uploadsDir = path.resolve(configuredUploadsDir);
  const filesDir = path.join(uploadsDir, 'files');
  const tempDir = path.join(uploadsDir, 'tmp');
  const sharedBatchDownloadService = batchDownloadService || (
    historyService ? new BatchDownloadService({ historyService }) : null
  );

  if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
  }

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

  app.use(require('./system')(uploadsDir));
  app.use(require('./session'));
  app.use(require('./qr'));
  app.use(require('./files')(uploadsDir));
  if (sharedBatchDownloadService) {
    app.use(require('./batch-download')(sharedBatchDownloadService));
  }

  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  app.use('/files', express.static(filesDir));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  });
};
