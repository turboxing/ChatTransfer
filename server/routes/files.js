const express = require('express');
const path = require('path');
const router = express.Router();
const { getCachePath } = require('../config');

function sanitizeFileName(name) {
  return path.basename(name || '').replace(/[\\/:*?"<>|\u0000]/g, '_');
}

router.post('/uploadFile', async (req, res) => {
  const uploadsDir = getCachePath();
  const files = req.files && (req.files.file_data || req.files.fileObj);

  if (!files) {
    return res.status(400).send({
      code: -1,
      message: 'No file uploaded'
    });
  }

  const fileList = Array.isArray(files) ? files : [files];
  const uploadResults = [];

  for (const file of fileList) {
    const timestamp = Date.now();
    const safeName = `${timestamp}_${sanitizeFileName(file.name)}`;
    const filePath = path.join(uploadsDir, 'files', safeName);

    await new Promise((resolve, reject) => {
      file.mv(filePath, (error) => (error ? reject(error) : resolve()));
    });

    uploadResults.push({
      name: safeName,
      mimetype: file.mimetype,
      size: file.size,
      fileUrl: `${req.protocol}://${req.headers.host}/files/${encodeURIComponent(safeName)}`,
      localFilePath: filePath
    });
  }

  res.send({
    code: 0,
    message: fileList.length > 1 ? 'Files uploaded' : 'File uploaded',
    data: fileList.length > 1 ? uploadResults : uploadResults[0]
  });
});

module.exports = router;
