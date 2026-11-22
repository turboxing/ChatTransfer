const express = require('express');
const fs = require('fs');
const { previewFormat, TEXT_PREVIEW_LIMIT } = require('../services/attachment-preview-service');

module.exports = (service) => {
  const router = express.Router();
  router.get('/attachment-preview/:token', async (req, res) => {
    try {
      const attachment = await service.resolve(req.params.token);
      const [kind, mime] = previewFormat(attachment.fileName);
      res.set({
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': kind === 'pdf'
          ? "frame-ancestors 'self'"
          : "sandbox; default-src 'none'; frame-ancestors 'self'"
      });
      if (req.query.text === '1') {
        if (kind !== 'text') return res.sendStatus(415);
        const handle = await fs.promises.open(attachment.physicalPath, 'r');
        try {
          const stats = await handle.stat();
          const buffer = Buffer.alloc(Math.min(stats.size, TEXT_PREVIEW_LIMIT));
          const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
          res.set({
            'Content-Type': 'application/octet-stream',
            'X-Preview-Truncated': String(stats.size > bytesRead),
            'X-File-Size': String(stats.size)
          });
          return res.send(buffer.subarray(0, bytesRead));
        } finally {
          await handle.close();
        }
      }
      const download = req.query.download === '1' || kind === 'metadata';
      res.type(download ? 'application/octet-stream' : mime);
      res.set('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(attachment.fileName).replace(/'/g, '%27')}`);
      return res.sendFile(attachment.physicalPath, { dotfiles: 'deny', cacheControl: false }, (error) => {
        if (error && !res.headersSent) res.sendStatus(error.statusCode || 404);
      });
    } catch {
      return res.status(410).json({ code: -1, message: 'Attachment unavailable or preview expired' });
    }
  });
  return router;
};
