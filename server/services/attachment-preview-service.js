const crypto = require('crypto');
const path = require('path');

const TEXT_PREVIEW_LIMIT = 1024 * 1024;
const PREVIEW_TTL = 10 * 60 * 1000;
const FORMATS = {
  txt: ['text', 'text/plain'], log: ['text', 'text/plain'],
  json: ['text', 'text/plain'], csv: ['text', 'text/plain'],
  pdf: ['pdf', 'application/pdf'],
  mp3: ['audio', 'audio/mpeg'], wav: ['audio', 'audio/wav'],
  m4a: ['audio', 'audio/mp4'], ogg: ['audio', 'audio/ogg'], flac: ['audio', 'audio/flac'],
  aac: ['audio', 'audio/aac'], opus: ['audio', 'audio/ogg'],
  mp4: ['video', 'video/mp4'], webm: ['video', 'video/webm'], mov: ['video', 'video/quicktime'],
  m4v: ['video', 'video/mp4'], ogv: ['video', 'video/ogg'],
  png: ['image', 'image/png'], jpg: ['image', 'image/jpeg'], jpeg: ['image', 'image/jpeg'],
  gif: ['image', 'image/gif'], webp: ['image', 'image/webp']
};

function previewFormat(fileName) {
  return FORMATS[path.extname(fileName || '').slice(1).toLowerCase()] || ['metadata', 'application/octet-stream'];
}

class AttachmentPreviewService {
  constructor({ historyService }) {
    this.historyService = historyService;
    this.tokens = new Map();
  }

  async createToken({ requester, roomId, messageId }) {
    const attachment = await this.historyService.getPreviewAttachment({ requester, roomId, messageId });
    const now = Date.now();
    for (const [token, entry] of this.tokens) {
      if (entry.expiresAt <= now) this.tokens.delete(token);
    }
    while (this.tokens.size >= 1000) this.tokens.delete(this.tokens.keys().next().value);
    const token = crypto.randomBytes(24).toString('hex');
    this.tokens.set(token, { requester, roomId, messageId, expiresAt: now + PREVIEW_TTL });
    const [kind] = previewFormat(attachment.fileName);
    return {
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      kind,
      url: `/attachment-preview/${token}`,
      expiresIn: PREVIEW_TTL,
      textLimit: TEXT_PREVIEW_LIMIT
    };
  }

  async resolve(token) {
    const entry = this.tokens.get(token);
    if (!entry || entry.expiresAt <= Date.now()) {
      this.tokens.delete(token);
      throw new Error('Preview expired');
    }
    return this.historyService.getPreviewAttachment(entry);
  }
}

module.exports = { AttachmentPreviewService, previewFormat, TEXT_PREVIEW_LIMIT };
