const express = require('express');

module.exports = function registerBatchDownloadRoutes(batchDownloadService) {
  if (!batchDownloadService) {
    throw new Error('batchDownloadService is required');
  }

  const router = express.Router();

  router.get('/batch-download/:token', (req, res) => {
    const record = batchDownloadService.consumeDownloadToken(req.params.token);

    if (!record) {
      return res.status(410).send({
        code: -1,
        message: 'Download link expired or already used'
      });
    }

    if (!batchDownloadService.streamArchive(res, record)) {
      return res.status(404).send({
        code: -1,
        message: 'No downloadable attachment files'
      });
    }

    return undefined;
  });

  return router;
};
