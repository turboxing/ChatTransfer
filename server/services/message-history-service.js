const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;
const GROUP_SESSION_ID = 'group';

class MessageHistoryService {
  constructor({ cachePath, databasePath }) {
    if (!cachePath) {
      throw new Error('cachePath is required');
    }

    this.cachePath = path.resolve(cachePath);
    this.databasePath = databasePath
      ? path.resolve(databasePath)
      : path.join(this.cachePath, 'history', 'chattransfer.db');
    this.historyDir = path.dirname(this.databasePath);
    this.db = null;
    this.writeLock = Promise.resolve();
  }

  init() {
    return new Promise((resolve, reject) => {
      fs.mkdir(this.historyDir, { recursive: true }, (error) => {
        if (error) {
          reject(error);
          return;
        }

        this.db = new sqlite3.Database(this.databasePath, (openError) => {
          if (openError) {
            reject(openError);
            return;
          }

          this.migrate()
            .then(() => this.processCleanupQueue())
            .then(resolve)
            .catch(reject);
        });
      });
    });
  }

  close() {
    if (!this.db) return Promise.resolve();

    return new Promise((resolve, reject) => {
      this.db.close((error) => (error ? reject(error) : resolve()));
    });
  }

  saveMessage(message) {
    this.ensureOpened();

    return this.enqueueWrite(() => this.saveMessageInTransaction(message));
  }

  async saveMessageInTransaction(message) {

    const normalized = this.normalizeMessage(message);
    const conversation = this.getConversation({
      chatType: normalized.receiver === 'group_chat' ? 'group' : 'private',
      requester: normalized.sender,
      targetUser: normalized.receiver
    });

    await this.run('BEGIN IMMEDIATE');

    try {
      await this.run(
        'INSERT OR IGNORE INTO sessions(id, chat_type, created_at) VALUES (?, ?, ?)',
        [conversation.sessionId, conversation.chatType, normalized.createdAt]
      );

      for (const participant of conversation.participants) {
        await this.run(
          'INSERT OR IGNORE INTO session_participants(session_id, user_id) VALUES (?, ?)',
          [conversation.sessionId, participant]
        );
      }

      await this.run(
        `INSERT INTO messages(
          id, session_id, sender_id, receiver_id, message_type, content,
          sender_nickname, sender_ip, create_time, created_at,
          file_path, file_name, file_size, file_mime_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          normalized.msgId,
          conversation.sessionId,
          normalized.sender,
          normalized.receiver,
          normalized.msgType,
          normalized.content,
          normalized.sender_nickname || null,
          normalized.sender_ip || null,
          normalized.createTime,
          normalized.createdAt,
          normalized.filePath || null,
          normalized.fileName || null,
          normalized.fileSize || null,
          normalized.fileType || null
        ]
      );

      await this.run('COMMIT');
      return normalized;
    } catch (error) {
      await this.run('ROLLBACK').catch(() => {});
      throw error;
    }
  }

  async queryHistory({ requester, chatType, targetUser, cursor = null, limit = DEFAULT_LIMIT }) {
    this.ensureOpened();

    const conversation = this.getConversation({ requester, chatType, targetUser });
    const queryLimit = this.normalizeLimit(limit);
    const normalizedCursor = this.normalizeCursor(cursor);
    const direction = normalizedCursor === null ? 'DESC' : 'ASC';
    const cursorCondition = normalizedCursor === null ? '' : 'AND seq > ?';
    const params = normalizedCursor === null
      ? [conversation.sessionId, queryLimit + 1]
      : [conversation.sessionId, normalizedCursor, queryLimit + 1];

    const rows = await this.all(
      `SELECT * FROM messages
       WHERE session_id = ? ${cursorCondition}
       ORDER BY seq ${direction}
       LIMIT ?`,
      params
    );
    const hasMore = rows.length > queryLimit;
    const messages = (hasMore ? rows.slice(0, queryLimit) : rows)
      .map((row) => this.mapMessage(row))
      .sort((a, b) => a.seq - b.seq);
    const nextCursor = messages.length > 0 ? messages[messages.length - 1].seq : normalizedCursor;

    return {
      messages,
      hasMore,
      nextCursor
    };
  }

  clearHistory({ requester, chatType, targetUser }) {
    this.ensureOpened();

    return this.enqueueWrite(() => this.clearHistoryInTransaction({
      requester,
      chatType,
      targetUser
    }));
  }

  async clearHistoryInTransaction({ requester, chatType, targetUser }) {

    const conversation = this.getConversation({ requester, chatType, targetUser });
    const files = await this.all(
      'SELECT DISTINCT file_path FROM messages WHERE session_id = ? AND file_path IS NOT NULL',
      [conversation.sessionId]
    );

    await this.run('BEGIN IMMEDIATE');

    try {
      for (const file of files) {
        await this.run(
          'INSERT OR IGNORE INTO file_cleanup_queue(file_path, created_at) VALUES (?, ?)',
          [file.file_path, Date.now()]
        );
      }

      await this.run('DELETE FROM messages WHERE session_id = ?', [conversation.sessionId]);
      await this.run('COMMIT');
    } catch (error) {
      await this.run('ROLLBACK').catch(() => {});
      throw error;
    }

    const cleanup = await this.processCleanupQueue();
    return {
      sessionId: conversation.sessionId,
      deletedFiles: cleanup.deletedFiles,
      skippedFiles: cleanup.skippedFiles,
      failedFiles: cleanup.failedFiles
    };
  }

  async processCleanupQueue() {
    this.ensureOpened();

    const queue = await this.all('SELECT file_path FROM file_cleanup_queue');
    let deletedFiles = 0;
    let skippedFiles = 0;
    let failedFiles = 0;

    for (const item of queue) {
      const references = await this.get(
        'SELECT COUNT(*) AS count FROM messages WHERE file_path = ?',
        [item.file_path]
      );

      if (references.count > 0) {
        await this.run('DELETE FROM file_cleanup_queue WHERE file_path = ?', [item.file_path]);
        skippedFiles += 1;
        continue;
      }

      const physicalPath = this.resolveFilePath(item.file_path);

      if (!physicalPath) {
        await this.updateCleanupFailure(item.file_path, 'Invalid file path');
        failedFiles += 1;
        continue;
      }

      try {
        await fs.promises.unlink(physicalPath);
        await this.run('DELETE FROM file_cleanup_queue WHERE file_path = ?', [item.file_path]);
        deletedFiles += 1;
      } catch (error) {
        if (error.code === 'ENOENT') {
          await this.run('DELETE FROM file_cleanup_queue WHERE file_path = ?', [item.file_path]);
          skippedFiles += 1;
        } else {
          await this.updateCleanupFailure(item.file_path, error.message);
          failedFiles += 1;
        }
      }
    }

    return { deletedFiles, skippedFiles, failedFiles };
  }

  async migrate() {
    await this.run('PRAGMA foreign_keys = ON');
    await this.run(`CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      chat_type TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`);
    await this.run(`CREATE TABLE IF NOT EXISTS session_participants (
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      PRIMARY KEY (session_id, user_id),
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )`);
    await this.run(`CREATE TABLE IF NOT EXISTS messages (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT NOT NULL UNIQUE,
      session_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      message_type TEXT NOT NULL,
      content TEXT,
      sender_nickname TEXT,
      sender_ip TEXT,
      create_time TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      file_path TEXT,
      file_name TEXT,
      file_size INTEGER,
      file_mime_type TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_messages_session_created_at
      ON messages(session_id, created_at)`);
    await this.run(`CREATE TABLE IF NOT EXISTS file_cleanup_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT NOT NULL UNIQUE,
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at INTEGER NOT NULL
    )`);
  }

  getConversation({ requester, chatType, targetUser }) {
    if (!this.isValidUserId(requester)) {
      throw new Error('Invalid requester');
    }

    const normalizedChatType = targetUser === 'group_chat' ? 'group' : chatType;

    if (normalizedChatType === 'group') {
      if (targetUser !== 'group_chat') {
        throw new Error('Group history requires group_chat target');
      }

      return {
        sessionId: GROUP_SESSION_ID,
        chatType: 'group',
        participants: []
      };
    }

    if (normalizedChatType !== 'private') {
      throw new Error('Invalid chat type');
    }

    if (!this.isValidUserId(targetUser) || targetUser === requester) {
      throw new Error('Invalid private chat target');
    }

    const participants = [requester, targetUser].sort();
    const hash = crypto.createHash('sha256').update(participants.join('\n')).digest('hex');

    return {
      sessionId: `private-${hash}`,
      chatType: 'private',
      participants
    };
  }

  normalizeMessage(message) {
    if (!this.isValidUserId(message.sender)) {
      throw new Error('Invalid message sender');
    }
    if (!this.isValidUserId(message.receiver)) {
      throw new Error('Invalid message receiver');
    }

    const createdAt = Number(message.createdAt) || Date.now();
    const filePath = this.extractFilePath(message);

    return {
      ...message,
      msgId: message.msgId || crypto.randomUUID(),
      msgType: message.msgType || 'TEXT',
      content: message.content ?? message.text ?? message.msg ?? '',
      createTime: message.createTime || new Date(createdAt).toLocaleString(),
      createdAt,
      filePath,
      fileName: message.fileName || null,
      fileSize: Number(message.fileSize) || null,
      fileType: message.fileType || message.mimetype || null
    };
  }

  mapMessage(row) {
    const message = {
      seq: row.seq,
      msgId: row.id,
      sender: row.sender_id,
      receiver: row.receiver_id,
      msgType: row.message_type,
      content: row.content || '',
      text: row.content || '',
      sender_nickname: row.sender_nickname || '',
      sender_ip: row.sender_ip || '',
      senderPhotoNickname: row.sender_id.slice(0, 2),
      createTime: row.create_time,
      createdAt: row.created_at,
      status: 'success'
    };

    if (row.file_path) {
      const physicalFileName = path.posix.basename(row.file_path);
      message.fileUrl = `/files/${encodeURIComponent(physicalFileName)}`;
      message.fileName = row.file_name || physicalFileName;
      message.fileSize = row.file_size;
      message.fileType = row.file_mime_type;
    }

    return message;
  }

  extractFilePath(message) {
    if (message.filePath) return this.normalizeStoredFilePath(message.filePath);

    if (message.fileUrl) {
      try {
        const url = new URL(message.fileUrl, 'http://chattransfer.local');
        const decodedPath = decodeURIComponent(url.pathname);
        if (decodedPath.startsWith('/files/')) {
          return this.normalizeStoredFilePath(decodedPath.slice(1));
        }
      } catch (error) {
        return null;
      }
    }

    return null;
  }

  normalizeStoredFilePath(filePath) {
    if (typeof filePath !== 'string') return null;

    const normalized = path.posix.normalize(filePath).replace(/^\/+/, '');
    if (normalized.startsWith('..') || path.posix.isAbsolute(normalized)) {
      return null;
    }

    return normalized.startsWith('files/') ? normalized : `files/${path.posix.basename(normalized)}`;
  }

  resolveFilePath(filePath) {
    const normalized = this.normalizeStoredFilePath(filePath);
    if (!normalized) return null;

    const physicalPath = path.resolve(this.cachePath, normalized);
    const cachePathWithSeparator = `${this.cachePath}${path.sep}`;
    if (!physicalPath.startsWith(cachePathWithSeparator)) {
      return null;
    }

    return physicalPath;
  }

  isValidUserId(value) {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= 256;
  }

  normalizeLimit(limit) {
    const value = Number(limit);
    if (!Number.isFinite(value) || value <= 0) return DEFAULT_LIMIT;
    return Math.min(Math.floor(value), MAX_LIMIT);
  }

  normalizeCursor(cursor) {
    if (cursor === null || cursor === undefined || cursor === '') return null;
    const value = Number(cursor);
    if (!Number.isInteger(value) || value < 0) {
      throw new Error('Invalid history cursor');
    }
    return value;
  }

  async updateCleanupFailure(filePath, errorMessage) {
    await this.run(
      `UPDATE file_cleanup_queue
       SET retry_count = retry_count + 1, last_error = ?
       WHERE file_path = ?`,
      [errorMessage, filePath]
    );
  }

  enqueueWrite(operation) {
    const result = this.writeLock.then(operation);
    this.writeLock = result.catch(() => {});
    return result;
  }

  ensureOpened() {
    if (!this.db) {
      throw new Error('Message history service is not initialized');
    }
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (error) => (error ? reject(error) : resolve()));
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row)));
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows || [])));
    });
  }
}

module.exports = {
  MessageHistoryService,
  GROUP_SESSION_ID
};
