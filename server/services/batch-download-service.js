const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const yazl = require('yazl');

const DOWNLOAD_TOKEN_TTL = 10 * 60 * 1000;

function sanitizeZipEntryName(name) {
  const safeName = String(name || 'download')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/^\.+/, '_')
    .trim();

  return safeName || 'download';
}

function buildUniqueZipEntryName(fileName, usedNames) {
  const baseName = sanitizeZipEntryName(fileName);
  const extension = path.extname(baseName);
  const nameWithoutExtension = extension ? baseName.slice(0, -extension.length) : baseName;
  let candidate = baseName;
  let index = 1;

  while (usedNames.has(candidate.toLowerCase())) {
    index += 1;
    candidate = `${nameWithoutExtension} (${index})${extension}`;
  }

  usedNames.add(candidate.toLowerCase());
  return candidate;
}

function buildManifest(attachments, missingAttachments = []) {
  const lines = ['ChatTransfer batch download manifest', ''];

  attachments.forEach((attachment, index) => {
    lines.push(`${index + 1}. ${attachment.zipEntryName}`);
    lines.push(`   Message ID: ${attachment.msgId}`);
    lines.push(`   Time: ${attachment.createTime}`);
    lines.push(`   Sender: ${attachment.senderNickname || attachment.sender}`);
    lines.push(`   Size: ${Number(attachment.fileSize) || 0} bytes`);
    lines.push('');
  });

  if (missingAttachments.length > 0) {
    lines.push('Missing files:', '');
    missingAttachments.forEach((attachment) => {
      lines.push(`- ${attachment.fileName || attachment.msgId}`);
    });
  }

  return lines.join('\n');
}

class BatchDownloadService {
  constructor({ historyService }) {
    if (!historyService) throw new Error('historyService is required');
    this.historyService = historyService;
    this.tokens = new Map();
  }

  async createDownloadToken({ requester, chatType, targetUser, messageIds }) {
    const attachments = await this.historyService.getBatchAttachments({
      requester,
      chatType,
      targetUser,
      messageIds
    });

    const token = crypto.randomBytes(24).toString('hex');
    this.tokens.set(token, {
      attachments,
      expiresAt: Date.now() + DOWNLOAD_TOKEN_TTL
    });
    this.cleanupTokens();

    return {
      token,
      downloadUrl: `/batch-download/${token}`,
      expiresIn: DOWNLOAD_TOKEN_TTL
    };
  }

  consumeDownloadToken(token) {
    if (typeof token !== 'string') return null;

    const record = this.tokens.get(token);
    if (!record) return null;
    this.tokens.delete(token);

    if (Date.now() > record.expiresAt) {
      this.cleanupTokens();
      return null;
    }

    return record;
  }

  cleanupTokens() {
    const now = Date.now();
    for (const [token, record] of this.tokens.entries()) {
      if (now > record.expiresAt) this.tokens.delete(token);
    }
  }

  streamArchive(res, record) {
    const usedNames = new Set();
    const availableAttachments = record.attachments
      .map((attachment) => ({
        ...attachment,
        zipEntryName: buildUniqueZipEntryName(attachment.fileName, usedNames)
      }))
      .filter((attachment) => {
        try {
          return fs.statSync(attachment.physicalPath).isFile();
        } catch (error) {
          return false;
        }
      });

    const missingAttachments = record.attachments.filter((attachment) => (
      !availableAttachments.some((item) => item.msgId === attachment.msgId)
    ));

    if (availableAttachments.length === 0) {
      return false;
    }

    const archive = new yazl.ZipFile();
    const zipFileName = `ChatTransfer-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
    res.status(200);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
    archive.outputStream.pipe(res);
    archive.outputStream.once('error', (error) => {
      console.error('[Batch download] archive failed:', error.message);
      res.destroy(error);
    });

    availableAttachments.forEach((attachment) => {
      const isAlreadyCompressed = /^(image|video)\//.test(attachment.fileType || '');
      archive.addFile(attachment.physicalPath, attachment.zipEntryName, {
        compress: !isAlreadyCompressed
      });
    });
    archive.addBuffer(
      Buffer.from(buildManifest(availableAttachments, missingAttachments), 'utf8'),
      'manifest.txt'
    );
    archive.end();

    return true;
  }
}

module.exports = {
  BatchDownloadService,
  buildUniqueZipEntryName,
  sanitizeZipEntryName
};
