import { afterAll, describe, expect, it } from 'vitest';
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3');
const {
  MessageHistoryService
} = require('../server/services/message-history-service');

const cachePath = fs.mkdtempSync(path.join(os.tmpdir(), 'chattransfer-migration-'));
const historyDir = path.join(cachePath, 'history');
const databasePath = path.join(historyDir, 'chattransfer.db');

function openLegacyDatabase() {
  fs.mkdirSync(historyDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(databasePath, (error) => {
      if (error) {
        reject(error);
        return;
      }

      db.exec(
        `CREATE TABLE rooms (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          code TEXT UNIQUE,
          created_by TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE room_participants (
          room_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          nickname TEXT,
          joined_at INTEGER NOT NULL,
          last_seen_at INTEGER,
          PRIMARY KEY (room_id, user_id)
        );`,
        (execError) => {
          if (execError) {
            db.close();
            reject(execError);
            return;
          }
          resolve(db);
        }
      );
    });
  });
}

afterAll(() => {
  fs.rmSync(cachePath, { recursive: true, force: true });
});

describe('MessageHistoryService migration', () => {
  it('adds ownership fields to an existing database', async () => {
    const roomId = crypto.randomUUID();
    const db = await openLegacyDatabase();

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO rooms(id, name, code, created_by, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [roomId, 'Legacy room', 'LEGACY23', 'legacy-owner', 'active', Date.now(), Date.now()],
        (error) => (error ? reject(error) : resolve())
      );
    });
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO room_participants(room_id, user_id, nickname, joined_at, last_seen_at)
         VALUES (?, ?, ?, ?, ?)`,
        [roomId, 'legacy-owner', 'Legacy Owner', Date.now(), Date.now()],
        (error) => (error ? reject(error) : resolve())
      );
    });
    await new Promise((resolve, reject) => db.close((error) => (error ? reject(error) : resolve())));

    const service = new MessageHistoryService({ cachePath });
    await service.init();

    const room = await service.getRoom(roomId);
    const participant = await service.get(
      'SELECT role FROM room_participants WHERE room_id = ? AND user_id = ?',
      [roomId, 'legacy-owner']
    );
    const roomColumns = await service.all('PRAGMA table_info(rooms)');
    const participantColumns = await service.all('PRAGMA table_info(room_participants)');

    expect(room.ownerId).toBe('legacy-owner');
    expect(room.lastActiveAt).toBeTruthy();
    expect(roomColumns.map((column) => column.name)).toEqual(
      expect.arrayContaining(['owner_id', 'deleted_at', 'last_active_at', 'deleted_reason'])
    );
    expect(participantColumns.map((column) => column.name)).toContain('role');
    expect(participant.role).toBe('owner');
    await service.close();
  });
});
