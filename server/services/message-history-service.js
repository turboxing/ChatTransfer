const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;
const MAX_BATCH_ATTACHMENT_COUNT = 200;
const MAX_BATCH_ATTACHMENT_TOTAL_SIZE = 2 * 1024 * 1024 * 1024;
const GROUP_SESSION_ID = 'group';
const DEFAULT_ROOM_ID = 'group_chat';
const ROOM_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

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
    const conversation = normalized.roomId
      ? this.getRoomConversation(normalized.roomId)
      : this.getConversation({
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

  async queryHistory({ requester, roomId, chatType, targetUser, cursor = null, limit = DEFAULT_LIMIT }) {
    this.ensureOpened();

    const conversation = roomId
      ? await this.getVerifiedRoomConversation(roomId, requester)
      : this.getConversation({ requester, chatType, targetUser });
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

  async queryAttachments({ requester, roomId, chatType, targetUser }) {
    this.ensureOpened();

    const conversation = roomId
      ? await this.getVerifiedRoomConversation(roomId, requester)
      : this.getConversation({ requester, chatType, targetUser });
    const rows = await this.all(
      `SELECT seq, id, sender_id, sender_nickname, message_type, create_time, created_at,
              file_path, file_name, file_size, file_mime_type
       FROM messages
       WHERE session_id = ? AND file_path IS NOT NULL
       ORDER BY created_at ASC, seq ASC`,
      [conversation.sessionId]
    );

    const attachments = [];
    for (const row of rows) {
      const physicalPath = this.resolveExistingFilePath(row.file_path);
      if (!physicalPath) continue;
      const stats = fs.statSync(physicalPath);
      if (!stats.isFile()) continue;
      const physicalFileName = path.posix.basename(row.file_path);

      attachments.push({
        msgId: row.id,
        seq: row.seq,
        sender: row.sender_id,
        senderNickname: row.sender_nickname || row.sender_id,
        msgType: row.message_type,
        createTime: row.create_time,
        createdAt: row.created_at,
        fileName: row.file_name || physicalFileName,
        fileSize: Number(row.file_size) || stats.size,
        fileType: row.file_mime_type,
        fileUrl: `/files/${encodeURIComponent(physicalFileName)}`,
        filePath: row.file_path,
        physicalPath,
        available: true
      });
    }

    return { attachments };
  }

  async getBatchAttachments({ requester, roomId, chatType, targetUser, messageIds }) {
    this.ensureOpened();

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      throw new Error('No attachment selected');
    }

    const requestedIds = new Set(messageIds.filter((id) => typeof id === 'string' && id.length > 0));
    if (requestedIds.size === 0) throw new Error('No attachment selected');
    if (requestedIds.size > MAX_BATCH_ATTACHMENT_COUNT) {
      throw new Error(`Batch download supports at most ${MAX_BATCH_ATTACHMENT_COUNT} files`);
    }

    const { attachments } = await this.queryAttachments({
      requester,
      roomId,
      chatType,
      targetUser
    });
    const attachmentMap = new Map(attachments.map((attachment) => [attachment.msgId, attachment]));
    const selectedAttachments = [];

    for (const messageId of requestedIds) {
      const attachment = attachmentMap.get(messageId);
      if (!attachment) throw new Error(`Attachment not found: ${messageId}`);
      if (!attachment.available) throw new Error(`Attachment file missing: ${attachment.fileName}`);
      selectedAttachments.push(attachment);
    }

    const totalSize = selectedAttachments.reduce((total, attachment) => (
      total + (Number(attachment.fileSize) || 0)
    ), 0);
    if (totalSize > MAX_BATCH_ATTACHMENT_TOTAL_SIZE) {
      throw new Error('Batch download exceeds the 2GB size limit');
    }

    return selectedAttachments;
  }

  clearHistory({ requester, roomId, chatType, targetUser }) {
    this.ensureOpened();

    return this.enqueueWrite(() => this.clearHistoryInTransaction({
      requester,
      roomId,
      chatType,
      targetUser
    }));
  }

  async clearHistoryInTransaction({ requester, roomId, chatType, targetUser }) {

    const conversation = roomId
      ? await this.getVerifiedRoomConversation(roomId, requester)
      : this.getConversation({ requester, chatType, targetUser });
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
    await this.run(`CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE,
      created_by TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`);
    await this.run(`CREATE TABLE IF NOT EXISTS room_participants (
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      nickname TEXT,
      joined_at INTEGER NOT NULL,
      last_seen_at INTEGER,
      PRIMARY KEY (room_id, user_id),
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    )`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_room_participants_user
      ON room_participants(user_id, joined_at)`);
    await this.run(
      `INSERT OR IGNORE INTO rooms(id, name, code, created_by, status, created_at, updated_at)
       VALUES (?, ?, NULL, NULL, 'active', ?, ?)`,
      [DEFAULT_ROOM_ID, 'Default Room', Date.now(), Date.now()]
    );
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

  getRoomConversation(roomId) {
    if (!this.isValidRoomId(roomId)) {
      throw new Error('Invalid room ID');
    }

    return {
      sessionId: roomId === DEFAULT_ROOM_ID ? GROUP_SESSION_ID : `room:${roomId}`,
      chatType: 'room',
      roomId,
      participants: []
    };
  }

  async getVerifiedRoomConversation(roomId, requester) {
    const conversation = this.getRoomConversation(roomId);
    const room = await this.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    if (roomId !== DEFAULT_ROOM_ID) {
      const participant = await this.get(
        'SELECT user_id FROM room_participants WHERE room_id = ? AND user_id = ?',
        [roomId, requester]
      );
      if (!participant) throw new Error('Room access denied');
    }

    return conversation;
  }

  async createRoom({ name, createdBy }) {
    this.ensureOpened();

    const roomName = String(name || '').trim();
    if (!roomName || roomName.length > 60) {
      throw new Error('Invalid room name');
    }

    const now = Date.now();
    const room = {
      id: crypto.randomUUID(),
      name: roomName,
      code: null,
      createdBy: createdBy || null,
      status: 'active',
      createdAt: now,
      updatedAt: now
    };

    return this.enqueueWrite(async () => {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        room.code = this.generateRoomCode();

        try {
          await this.run(
            `INSERT INTO rooms(id, name, code, created_by, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              room.id,
              room.name,
              room.code,
              room.createdBy,
              room.status,
              room.createdAt,
              room.updatedAt
            ]
          );
          return this.mapRoom(room);
        } catch (error) {
          if (!String(error.message || '').includes('UNIQUE constraint failed: rooms.code')) {
            throw error;
          }
        }
      }

      throw new Error('Unable to generate a unique room code');
    });
  }

  async getRoom(roomId) {
    this.ensureOpened();
    if (!this.isValidRoomId(roomId)) return null;

    const row = await this.get(
      'SELECT * FROM rooms WHERE id = ? AND status = ?',
      [roomId, 'active']
    );
    return row ? this.mapRoom(row) : null;
  }

  async getRoomByCode(code) {
    this.ensureOpened();
    const normalizedCode = this.normalizeRoomCode(code);
    if (!normalizedCode) return null;

    const row = await this.get(
      'SELECT * FROM rooms WHERE code = ? AND status = ?',
      [normalizedCode, 'active']
    );
    return row ? this.mapRoom(row) : null;
  }

  async joinRoom({ roomId, code, userId, nickname = '' }) {
    this.ensureOpened();

    if (!this.isValidUserId(userId)) throw new Error('Invalid user');
    const room = await this.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    const participant = await this.get(
      'SELECT user_id FROM room_participants WHERE room_id = ? AND user_id = ?',
      [room.id, userId]
    );
    const normalizedCode = this.normalizeRoomCode(code);

    if (room.id !== DEFAULT_ROOM_ID && !participant) {
      if (!normalizedCode) throw new Error('Room code required');
      if (normalizedCode !== room.code) throw new Error('Invalid room code');
    } else if (normalizedCode && room.code && normalizedCode !== room.code) {
      throw new Error('Invalid room code');
    }

    const now = Date.now();
    await this.enqueueWrite(() => this.run(
      `INSERT INTO room_participants(room_id, user_id, nickname, joined_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(room_id, user_id) DO UPDATE SET
         nickname = excluded.nickname,
         last_seen_at = excluded.last_seen_at`,
      [room.id, userId, nickname || null, now, now]
    ));

    return room;
  }

  async listRoomsForUser(userId) {
    this.ensureOpened();
    if (!this.isValidUserId(userId)) throw new Error('Invalid user');

    const rows = await this.all(
      `SELECT r.*, p.joined_at, p.last_seen_at
       FROM rooms r
       INNER JOIN room_participants p ON p.room_id = r.id
       WHERE p.user_id = ? AND r.status = 'active'
       ORDER BY p.last_seen_at DESC, p.joined_at DESC`,
      [userId]
    );

    return Promise.all(rows.map(async (row) => {
      const room = this.mapRoom(row);
      const session = this.getRoomConversation(room.id);
      const lastMessage = await this.get(
        `SELECT content, message_type, create_time, created_at
         FROM messages
         WHERE session_id = ?
         ORDER BY seq DESC
         LIMIT 1`,
        [session.sessionId]
      );

      return {
        ...room,
        joinedAt: row.joined_at,
        lastSeenAt: row.last_seen_at,
        lastMessage: lastMessage ? {
          content: lastMessage.content || '',
          msgType: lastMessage.message_type,
          createTime: lastMessage.create_time,
          createdAt: lastMessage.created_at
        } : null
      };
    }));
  }

  async updateRoomName({ roomId, name }) {
    this.ensureOpened();

    const roomName = String(name || '').trim();
    if (!roomName || roomName.length > 60) throw new Error('Invalid room name');

    const room = await this.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    const updatedAt = Date.now();
    await this.enqueueWrite(() => this.run(
      'UPDATE rooms SET name = ?, updated_at = ? WHERE id = ?',
      [roomName, updatedAt, roomId]
    ));

    return { ...room, name: roomName, updatedAt };
  }

  async regenerateRoomCode({ roomId }) {
    this.ensureOpened();

    const room = await this.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    const code = this.generateRoomCode();
    const updatedAt = Date.now();
    await this.enqueueWrite(() => this.run(
      'UPDATE rooms SET code = ?, updated_at = ? WHERE id = ?',
      [code, updatedAt, roomId]
    ));

    return { ...room, code, updatedAt };
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

  resolveExistingFilePath(filePath) {
    const physicalPath = this.resolveFilePath(filePath);
    if (!physicalPath) return null;

    try {
      const realCachePath = fs.realpathSync(this.cachePath);
      const realFilesPath = path.join(realCachePath, 'files');
      const realPhysicalPath = fs.realpathSync(physicalPath);
      const relativePath = path.relative(realFilesPath, realPhysicalPath);

      if (
        relativePath === '' ||
        relativePath.startsWith('..') ||
        path.isAbsolute(relativePath)
      ) {
        return null;
      }

      return realPhysicalPath;
    } catch (error) {
      return null;
    }
  }

  isValidUserId(value) {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= 256;
  }

  isValidRoomId(value) {
    return value === DEFAULT_ROOM_ID || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  generateRoomCode() {
    return Array.from(
      { length: 8 },
      () => ROOM_CODE_ALPHABET[crypto.randomInt(ROOM_CODE_ALPHABET.length)]
    ).join('');
  }

  normalizeRoomCode(value) {
    return String(value || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  }

  mapRoom(row) {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      createdBy: row.created_by,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
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
  GROUP_SESSION_ID,
  DEFAULT_ROOM_ID
};
