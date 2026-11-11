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
const DEFAULT_IDLE_RETENTION_DAYS = 7;
const ALLOWED_ROOM_RETENTION_DAYS = new Set([0, 7, 30]);
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
    this.publicRoomCleanupTimer = null;
    this.idleRetentionDays = DEFAULT_IDLE_RETENTION_DAYS;
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
    this.stopPublicRoomCleanup();
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

      const insertedMessage = await this.run(
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

      if (normalized.roomId && insertedMessage.changes > 0) {
        const activityAt = Date.now();
        const messageAt = Number(normalized.createdAt) || activityAt;
        if (normalized.roomId !== DEFAULT_ROOM_ID) {
          await this.run(
            `UPDATE rooms
             SET last_active_at = ?
             WHERE id = ? AND status = 'active'`,
            [activityAt, normalized.roomId]
          );
        }
        await this.run(
          `UPDATE rooms
           SET last_message_at = ?, last_message_seq = ?, updated_at = ?
           WHERE id = ? AND status = 'active'`,
          [messageAt, insertedMessage.lastID, activityAt, normalized.roomId]
        );
      }

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

  async clearHistory({ requester, roomId, chatType, targetUser }) {
    this.ensureOpened();

    let conversation;
    if (roomId) {
      if (roomId === DEFAULT_ROOM_ID) {
        throw new Error('Public Transfer Hub history requires administrator');
      }
      await this.requireRoomOwner(roomId, requester);
      conversation = this.getRoomConversation(roomId);
    } else {
      conversation = this.getConversation({ requester, chatType, targetUser });
      if (conversation.chatType === 'group') {
        throw new Error('Public Transfer Hub history requires administrator');
      }
    }

    return this.enqueueWrite(() => this.clearConversationHistory(conversation));
  }

  async clearPublicRoomHistory() {
    this.ensureOpened();
    const conversation = this.getRoomConversation(DEFAULT_ROOM_ID);
    return this.enqueueWrite(() => this.clearConversationHistory(conversation));
  }

  async cleanupExpiredPublicRoomMessages({ retentionDays = 7, now = Date.now() } = {}) {
    this.ensureOpened();
    const days = Number(retentionDays);
    if (!Number.isFinite(days) || days <= 0) {
      return { deletedFiles: 0, skippedFiles: 0, failedFiles: 0 };
    }

    const cutoff = now - (days * 24 * 60 * 60 * 1000);

    return this.enqueueWrite(async () => {
      const files = await this.all(
        `SELECT DISTINCT file_path
         FROM messages
         WHERE session_id = ? AND created_at < ? AND file_path IS NOT NULL`,
        [GROUP_SESSION_ID, cutoff]
      );

      await this.run('BEGIN IMMEDIATE');

      try {
        for (const file of files) {
          await this.run(
            'INSERT OR IGNORE INTO file_cleanup_queue(file_path, created_at) VALUES (?, ?)',
            [file.file_path, Date.now()]
          );
        }

        await this.run(
          'DELETE FROM messages WHERE session_id = ? AND created_at < ?',
          [GROUP_SESSION_ID, cutoff]
        );
        await this.run(
          `UPDATE rooms
           SET
             last_message_at = (
               SELECT created_at FROM messages
               WHERE session_id = ?
               ORDER BY seq DESC
               LIMIT 1
             ),
             last_message_seq = (
               SELECT seq FROM messages
               WHERE session_id = ?
               ORDER BY seq DESC
               LIMIT 1
             )
           WHERE id = ?`,
          [GROUP_SESSION_ID, GROUP_SESSION_ID, DEFAULT_ROOM_ID]
        );
        await this.run('COMMIT');
      } catch (error) {
        await this.run('ROLLBACK').catch(() => {});
        throw error;
      }

      const cleanup = await this.processCleanupQueue();
      return {
        deletedFiles: cleanup.deletedFiles,
        skippedFiles: cleanup.skippedFiles,
        failedFiles: cleanup.failedFiles
      };
    });
  }

  startPublicRoomCleanup({ retentionDays = 7, intervalMs = 6 * 60 * 60 * 1000 } = {}) {
    this.stopPublicRoomCleanup();
    if (!Number.isFinite(Number(retentionDays)) || Number(retentionDays) <= 0) return;

    const run = () => {
      this.cleanupExpiredPublicRoomMessages({ retentionDays }).catch((error) => {
        console.error('[History] public room cleanup failed:', error.message);
      });
    };

    run();
    this.publicRoomCleanupTimer = setInterval(run, intervalMs);
    this.publicRoomCleanupTimer.unref?.();
  }

  stopPublicRoomCleanup() {
    if (!this.publicRoomCleanupTimer) return;
    clearInterval(this.publicRoomCleanupTimer);
    this.publicRoomCleanupTimer = null;
  }

  async clearConversationHistory(conversation) {
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
      if (conversation.sessionId === GROUP_SESSION_ID) {
        await this.run(
          `UPDATE rooms
           SET last_message_at = NULL, last_message_seq = NULL
           WHERE id = ?`,
          [DEFAULT_ROOM_ID]
        );
      } else if (conversation.sessionId.startsWith('room:')) {
        await this.run(
          `UPDATE rooms
           SET last_message_at = NULL, last_message_seq = NULL
           WHERE id = ?`,
          [conversation.sessionId.slice('room:'.length)]
        );
      }
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
      owner_id TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      last_active_at INTEGER,
      deleted_reason TEXT,
      idle_retention_days INTEGER,
      last_message_at INTEGER,
      last_message_seq INTEGER
    )`);
    await this.run(`CREATE TABLE IF NOT EXISTS room_participants (
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      nickname TEXT,
      joined_at INTEGER NOT NULL,
      last_seen_at INTEGER,
      PRIMARY KEY (room_id, user_id),
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    )`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_room_participants_user
      ON room_participants(user_id, joined_at)`);
    await this.ensureColumn('rooms', 'owner_id', 'TEXT');
    await this.ensureColumn('rooms', 'deleted_at', 'INTEGER');
    await this.ensureColumn('rooms', 'last_active_at', 'INTEGER');
    await this.ensureColumn('rooms', 'deleted_reason', 'TEXT');
    await this.ensureColumn('rooms', 'idle_retention_days', 'INTEGER');
    await this.ensureColumn('rooms', 'last_message_at', 'INTEGER');
    await this.ensureColumn('rooms', 'last_message_seq', 'INTEGER');
    await this.ensureColumn('room_participants', 'role', "TEXT NOT NULL DEFAULT 'member'");
    await this.run(
      `UPDATE rooms
       SET owner_id = created_by
       WHERE id <> ? AND owner_id IS NULL AND created_by IS NOT NULL`,
      [DEFAULT_ROOM_ID]
    );
    await this.run(
      `UPDATE rooms
       SET last_active_at = COALESCE(last_active_at, updated_at, created_at)
       WHERE last_active_at IS NULL`
    );
    await this.run(
      `UPDATE room_participants
       SET role = 'owner'
       WHERE EXISTS (
         SELECT 1 FROM rooms
         WHERE rooms.id = room_participants.room_id
           AND rooms.owner_id = room_participants.user_id
       )`
    );
    await this.run(
      `INSERT OR IGNORE INTO rooms(
        id, name, code, created_by, owner_id, status, created_at, updated_at
      ) VALUES (?, ?, NULL, NULL, NULL, 'active', ?, ?)`,
      [DEFAULT_ROOM_ID, 'Public Transfer Hub', Date.now(), Date.now()]
    );
    await this.run(
      `UPDATE rooms
       SET name = 'Public Transfer Hub'
       WHERE id = ? AND name IN (
         'Default Room',
         'Public Lobby',
         'Public Transit Station',
         '公共大厅',
         '公共中转站'
       )`,
      [DEFAULT_ROOM_ID]
    );
    await this.run(
      `UPDATE rooms
       SET
         last_message_at = COALESCE(
           last_message_at,
           (
             SELECT m.created_at
             FROM messages m
             WHERE m.session_id = CASE
               WHEN rooms.id = ? THEN ?
               ELSE 'room:' || rooms.id
             END
             ORDER BY m.seq DESC
             LIMIT 1
           )
         ),
         last_message_seq = COALESCE(
           last_message_seq,
           (
             SELECT m.seq
             FROM messages m
             WHERE m.session_id = CASE
               WHEN rooms.id = ? THEN ?
               ELSE 'room:' || rooms.id
             END
             ORDER BY m.seq DESC
             LIMIT 1
           )
         )
       WHERE last_message_at IS NULL OR last_message_seq IS NULL`,
      [DEFAULT_ROOM_ID, GROUP_SESSION_ID, DEFAULT_ROOM_ID, GROUP_SESSION_ID]
    );
  }

  async ensureColumn(table, column, definition) {
    const columns = await this.all(`PRAGMA table_info(${table})`);
    if (columns.some((item) => item.name === column)) return;
    await this.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
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

  async createRoom({ name, createdBy, nickname = '' }) {
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
      ownerId: createdBy || null,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
      idleRetentionDays: DEFAULT_IDLE_RETENTION_DAYS,
      lastMessageAt: null,
      lastMessageSeq: null
    };

    return this.enqueueWrite(async () => {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        room.code = this.generateRoomCode();

        try {
          await this.run(
            `INSERT INTO rooms(
              id, name, code, created_by, owner_id, status,
              created_at, updated_at, last_active_at, idle_retention_days
            )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              room.id,
              room.name,
              room.code,
              room.createdBy,
              room.ownerId,
              room.status,
              room.createdAt,
              room.updatedAt,
              room.lastActiveAt,
              room.idleRetentionDays
            ]
          );
          if (room.createdBy) {
            await this.run(
              `INSERT INTO room_participants(
                room_id, user_id, role, nickname, joined_at, last_seen_at
              ) VALUES (?, ?, 'owner', ?, ?, ?)
              ON CONFLICT(room_id, user_id) DO UPDATE SET
                role = 'owner',
                nickname = COALESCE(room_participants.nickname, excluded.nickname),
                last_seen_at = excluded.last_seen_at`,
              [room.id, room.createdBy, nickname || null, now, now]
            );
          }
          const createdRoom = await this.get(
            'SELECT * FROM rooms WHERE id = ? AND status = ?',
            [room.id, 'active']
          );
          return { ...this.mapRoom(createdRoom), role: room.createdBy ? 'owner' : 'member' };
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
      'SELECT user_id, role FROM room_participants WHERE room_id = ? AND user_id = ?',
      [room.id, userId]
    );
    const normalizedCode = this.normalizeRoomCode(code);

    if (room.id !== DEFAULT_ROOM_ID && !participant) {
      if (!normalizedCode) throw new Error('Room code required');
      if (normalizedCode !== room.code) throw new Error('Invalid room code');
    }

    const now = Date.now();
    await this.enqueueWrite(() => this.run(
      `INSERT INTO room_participants(room_id, user_id, role, nickname, joined_at, last_seen_at)
       VALUES (?, ?, 'member', ?, ?, ?)
       ON CONFLICT(room_id, user_id) DO UPDATE SET
         nickname = excluded.nickname,
         last_seen_at = excluded.last_seen_at`,
      [room.id, userId, nickname || null, now, now]
    ));

    if (room.id !== DEFAULT_ROOM_ID) {
      await this.enqueueWrite(() => this.run(
        'UPDATE rooms SET last_active_at = ?, updated_at = ? WHERE id = ?',
        [now, now, room.id]
      ));
    }

    return {
      ...room,
      role: participant?.role || 'member'
    };
  }

  async listRoomsForUser(userId) {
    this.ensureOpened();
    if (!this.isValidUserId(userId)) throw new Error('Invalid user');

    const rows = await this.all(
      `SELECT r.*, p.role AS participant_role, p.joined_at, p.last_seen_at
       FROM rooms r
       INNER JOIN room_participants p ON p.room_id = r.id
       WHERE p.user_id = ? AND r.status = 'active'
       ORDER BY
         COALESCE(r.last_message_at, 0) DESC,
         COALESCE(r.last_message_seq, 0) DESC,
         r.created_at DESC,
         r.id ASC`,
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
        role: row.participant_role || 'member',
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

  configureIdleRetention(days = 7) {
    const value = Number(days);
    this.idleRetentionDays = Number.isFinite(value) && value >= 0 ? value : 7;
  }

  getEffectiveRetentionDays(room) {
    if (!room || room.id === DEFAULT_ROOM_ID) return null;

    const roomValue = room.idleRetentionDays ?? room.idle_retention_days;
    if (roomValue !== null && roomValue !== undefined && roomValue !== '') {
      const days = Number(roomValue);
      return Number.isFinite(days) && days >= 0 ? days : null;
    }

    return this.idleRetentionDays;
  }

  getRoomExpiry(room, now = Date.now()) {
    if (!room || room.id === DEFAULT_ROOM_ID) return null;

    const effectiveRetentionDays = this.getEffectiveRetentionDays(room);
    if (effectiveRetentionDays === null || effectiveRetentionDays <= 0) return null;

    const lastActiveAt = Number(room.lastActiveAt || room.last_active_at || 0);
    if (!Number.isFinite(lastActiveAt) || lastActiveAt <= 0) return null;

    return {
      effectiveRetentionDays,
      expiresAt: lastActiveAt + (effectiveRetentionDays * 24 * 60 * 60 * 1000)
    };
  }

  async listInactiveRooms({ now = Date.now() } = {}) {
    this.ensureOpened();
    const rows = await this.all(
      `SELECT *
       FROM rooms
       WHERE status = 'active'
         AND id <> ?
       ORDER BY COALESCE(last_active_at, updated_at, created_at) ASC`,
      [DEFAULT_ROOM_ID]
    );

    return rows
      .map((row) => this.mapRoom(row))
      .filter((room) => {
        const expiry = this.getRoomExpiry(room, now);
        return expiry !== null && expiry.expiresAt <= Number(now);
      });
  }

  async deleteRoomBySystem({ roomId, reason = 'inactive', now = Date.now() }) {
    this.ensureOpened();
    if (roomId === DEFAULT_ROOM_ID) return null;

    return this.enqueueWrite(async () => {
      const room = await this.getRoom(roomId);
      if (!room) return null;

      const expiry = this.getRoomExpiry(room, now);
      if (expiry === null || expiry.expiresAt > Number(now)) return null;

      await this.run('BEGIN IMMEDIATE');

      try {
        const dissolved = await this.dissolveRoomContentsInTransaction(room, reason);
        await this.run('COMMIT');
        const cleanup = await this.processCleanupQueue();
        return {
          roomId,
          roomName: room.name,
          sessionId: dissolved.sessionId,
          deletedReason: reason,
          ...cleanup
        };
      } catch (error) {
        await this.run('ROLLBACK').catch(() => {});
        throw error;
      }
    });
  }

  async requireRoomOwner(roomId, requester) {
    if (!this.isValidUserId(requester)) throw new Error('Invalid user');
    if (roomId === DEFAULT_ROOM_ID) {
      throw new Error('Public Transfer Hub is managed by the server administrator');
    }

    const room = await this.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    const participant = await this.get(
      'SELECT role FROM room_participants WHERE room_id = ? AND user_id = ?',
      [roomId, requester]
    );
    if (!participant) throw new Error('Room access denied');
    if (participant.role !== 'owner' || room.ownerId !== requester) {
      throw new Error('Room owner permission required');
    }

    return { ...room, role: 'owner' };
  }

  async updateRoomName({ roomId, name, requester }) {
    this.ensureOpened();

    const roomName = String(name || '').trim();
    if (!roomName || roomName.length > 60) throw new Error('Invalid room name');
    const room = await this.requireRoomOwner(roomId, requester);

    const updatedAt = Date.now();
    await this.enqueueWrite(() => this.run(
      'UPDATE rooms SET name = ?, updated_at = ?, last_active_at = ? WHERE id = ?',
      [roomName, updatedAt, updatedAt, roomId]
    ));

    const updatedRoom = await this.getRoom(roomId);
    return { ...updatedRoom, role: 'owner' };
  }

  async regenerateRoomCode({ roomId, requester }) {
    this.ensureOpened();

    const room = await this.requireRoomOwner(roomId, requester);

    const code = this.generateRoomCode();
    const updatedAt = Date.now();
    await this.enqueueWrite(() => this.run(
      'UPDATE rooms SET code = ?, updated_at = ?, last_active_at = ? WHERE id = ?',
      [code, updatedAt, updatedAt, roomId]
    ));

    const updatedRoom = await this.getRoom(roomId);
    return { ...updatedRoom, role: 'owner' };
  }

  async updateRoomRetention({ roomId, retentionDays, requester }) {
    this.ensureOpened();

    const normalizedDays = Number(retentionDays);
    if (!ALLOWED_ROOM_RETENTION_DAYS.has(normalizedDays)) {
      throw new Error('Invalid room retention setting');
    }

    await this.requireRoomOwner(roomId, requester);

    const updatedAt = Date.now();
    await this.enqueueWrite(() => this.run(
      `UPDATE rooms
       SET idle_retention_days = ?, updated_at = ?, last_active_at = ?
       WHERE id = ? AND status = 'active'`,
      [normalizedDays, updatedAt, updatedAt, roomId]
    ));

    const updatedRoom = await this.getRoom(roomId);
    if (!updatedRoom) throw new Error('Room not found');
    return { ...updatedRoom, role: 'owner' };
  }

  async leaveRoom({ roomId, userId }) {
    this.ensureOpened();
    if (!this.isValidUserId(userId)) throw new Error('Invalid user');
    if (roomId === DEFAULT_ROOM_ID) {
      throw new Error('Public Transfer Hub cannot be left');
    }

    return this.enqueueWrite(async () => {
      const room = await this.getRoom(roomId);
      if (!room) throw new Error('Room not found');

      const participant = await this.get(
        'SELECT role FROM room_participants WHERE room_id = ? AND user_id = ?',
        [roomId, userId]
      );
      if (!participant) throw new Error('Room access denied');

      await this.run('BEGIN IMMEDIATE');

      try {
        await this.run(
          'DELETE FROM room_participants WHERE room_id = ? AND user_id = ?',
          [roomId, userId]
        );

        const remaining = await this.all(
          `SELECT user_id, role FROM room_participants
           WHERE room_id = ?
           ORDER BY joined_at ASC, user_id ASC`,
          [roomId]
        );

        if (remaining.length === 0) {
          const dissolved = await this.dissolveRoomContentsInTransaction(room, 'last_member_left');
          await this.run('COMMIT');
          const cleanup = await this.processCleanupQueue();
          return {
            roomId,
            sessionId: dissolved.sessionId,
            dissolved: true,
            newOwnerId: null,
            ...cleanup
          };
        }

        let newOwnerId = room.ownerId;
        let ownerChanged = false;
        if (participant.role === 'owner' || room.ownerId === userId) {
          newOwnerId = remaining[0].user_id;
          ownerChanged = true;
          await this.run(
            "UPDATE room_participants SET role = 'member' WHERE room_id = ?",
            [roomId]
          );
          await this.run(
            "UPDATE room_participants SET role = 'owner' WHERE room_id = ? AND user_id = ?",
            [roomId, newOwnerId]
          );
          await this.run(
            `UPDATE rooms
             SET owner_id = ?, updated_at = ?, last_active_at = ?
             WHERE id = ?`,
            [newOwnerId, Date.now(), Date.now(), roomId]
          );
        }

        if (!ownerChanged) {
          const activityAt = Date.now();
          await this.run(
            'UPDATE rooms SET last_active_at = ?, updated_at = ? WHERE id = ?',
            [activityAt, activityAt, roomId]
          );
        }

        await this.run('COMMIT');
        return {
          roomId,
          sessionId: this.getRoomConversation(roomId).sessionId,
          dissolved: false,
          newOwnerId,
          ownerChanged
        };
      } catch (error) {
        await this.run('ROLLBACK').catch(() => {});
        throw error;
      }
    });
  }

  async dissolveRoom({ roomId, requester }) {
    this.ensureOpened();
    const room = await this.requireRoomOwner(roomId, requester);

    return this.enqueueWrite(async () => {
      await this.run('BEGIN IMMEDIATE');

      try {
        const dissolved = await this.dissolveRoomContentsInTransaction(room, 'manual');
        await this.run('COMMIT');
        const cleanup = await this.processCleanupQueue();
        return {
          roomId,
          sessionId: dissolved.sessionId,
          ...cleanup
        };
      } catch (error) {
        await this.run('ROLLBACK').catch(() => {});
        throw error;
      }
    });
  }

  async dissolveRoomContentsInTransaction(room, reason = 'manual') {
    const conversation = this.getRoomConversation(room.id);
    const files = await this.all(
      'SELECT DISTINCT file_path FROM messages WHERE session_id = ? AND file_path IS NOT NULL',
      [conversation.sessionId]
    );
    const now = Date.now();

    for (const file of files) {
      await this.run(
        'INSERT OR IGNORE INTO file_cleanup_queue(file_path, created_at) VALUES (?, ?)',
        [file.file_path, now]
      );
    }

    await this.run(
      'DELETE FROM messages WHERE session_id = ?',
      [conversation.sessionId]
    );
    await this.run(
      'DELETE FROM room_participants WHERE room_id = ?',
      [room.id]
    );
    await this.run(
      `UPDATE rooms
       SET status = 'deleted', deleted_at = ?, updated_at = ?, code = NULL,
           deleted_reason = ?
       WHERE id = ?`,
      [now, now, reason, room.id]
    );

    return { sessionId: conversation.sessionId };
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
    const idleRetentionValue = row.idle_retention_days ?? row.idleRetentionDays;
    const lastMessageAt = row.last_message_at ?? row.lastMessageAt;
    const lastMessageSeq = row.last_message_seq ?? row.lastMessageSeq;
    const room = {
      id: row.id,
      name: row.name,
      code: row.code,
      createdBy: row.created_by,
      ownerId: row.owner_id || null,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at || null,
      deletedReason: row.deleted_reason || null,
      lastActiveAt: row.last_active_at || row.updated_at || row.created_at || null,
      idleRetentionDays: idleRetentionValue === null || idleRetentionValue === undefined
        ? null
        : Number(idleRetentionValue),
      lastMessageAt: lastMessageAt === null || lastMessageAt === undefined
        ? null
        : Number(lastMessageAt),
      lastMessageSeq: lastMessageSeq === null || lastMessageSeq === undefined
        ? null
        : Number(lastMessageSeq)
    };

    const expiry = this.getRoomExpiry(room);
    return {
      ...room,
      effectiveRetentionDays: expiry?.effectiveRetentionDays ?? (
        room.id === DEFAULT_ROOM_ID ? null : this.getEffectiveRetentionDays(room)
      ),
      expiresAt: expiry?.expiresAt ?? null
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
      this.db.run(sql, params, function (error) {
        if (error) {
          reject(error);
          return;
        }

        resolve({ lastID: this.lastID, changes: this.changes });
      });
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
