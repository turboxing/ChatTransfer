import { afterAll, beforeAll, describe, expect, it } from 'vitest';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  MessageHistoryService
} = require('../server/services/message-history-service');

let cachePath;
let service;

beforeAll(async () => {
  cachePath = fs.mkdtempSync(path.join(os.tmpdir(), 'chattransfer-history-'));
  service = new MessageHistoryService({ cachePath });
  await service.init();
});

afterAll(async () => {
  await service.close();
  fs.rmSync(cachePath, { recursive: true, force: true });
});

describe('MessageHistoryService', () => {
  it('stores and queries group history in ascending order', async () => {
    await service.saveMessage({
      msgId: 'group-1',
      sender: 'user-a',
      receiver: 'group_chat',
      msgType: 'TEXT',
      content: 'first',
      createTime: '2026-01-01 00:00:00',
      createdAt: 1
    });
    await service.saveMessage({
      msgId: 'group-2',
      sender: 'user-b',
      receiver: 'group_chat',
      msgType: 'TEXT',
      content: 'second',
      createTime: '2026-01-01 00:00:01',
      createdAt: 2
    });

    const result = await service.queryHistory({
      requester: 'user-c',
      chatType: 'group',
      targetUser: 'group_chat'
    });

    expect(result.messages.map((message) => message.text)).toEqual(['first', 'second']);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBe(2);
  });

  it('uses a stable private session and supports cursor synchronization', async () => {
    const first = await service.saveMessage({
      msgId: 'private-1',
      sender: 'user-a',
      receiver: 'user-b',
      msgType: 'TEXT',
      content: 'private first',
      createTime: '2026-01-01 00:00:00',
      createdAt: 3
    });
    await service.saveMessage({
      msgId: 'private-2',
      sender: 'user-b',
      receiver: 'user-a',
      msgType: 'TEXT',
      content: 'private second',
      createTime: '2026-01-01 00:00:01',
      createdAt: 4
    });

    const synchronizedMessages = await service.queryHistory({
      requester: 'user-a',
      chatType: 'private',
      targetUser: 'user-b',
      cursor: 3
    });

    expect(synchronizedMessages.messages.map((message) => message.content)).toEqual(['private second']);
    expect(first.msgId).toBe('private-1');
  });

  it('clears a session and deletes its unreferenced physical files', async () => {
    const filesDir = path.join(cachePath, 'files');
    fs.mkdirSync(filesDir, { recursive: true });
    const physicalFile = path.join(filesDir, 'history-test.txt');
    fs.writeFileSync(physicalFile, 'hello', 'utf8');

    await service.saveMessage({
      msgId: 'file-1',
      sender: 'user-a',
      receiver: 'group_chat',
      msgType: 'FILE',
      content: '',
      fileName: 'history-test.txt',
      fileSize: 5,
      fileType: 'text/plain',
      fileUrl: 'http://127.0.0.1:55555/files/history-test.txt',
      createTime: '2026-01-01 00:00:00',
      createdAt: 5
    });

    const result = await service.clearPublicRoomHistory({
      requester: 'user-a',
      chatType: 'group',
      targetUser: 'group_chat'
    });
    const history = await service.queryHistory({
      requester: 'user-a',
      chatType: 'group',
      targetUser: 'group_chat'
    });

    expect(result.deletedFiles).toBe(1);
    expect(history.messages).toHaveLength(0);
    expect(fs.existsSync(physicalFile)).toBe(false);
  });

  it('returns the physical file URL after a service restart', async () => {
    const filesDir = path.join(cachePath, 'files');
    fs.mkdirSync(filesDir, { recursive: true });
    const physicalFile = path.join(filesDir, '123_display-name.txt');
    fs.writeFileSync(physicalFile, 'hello', 'utf8');

    await service.saveMessage({
      msgId: 'file-2',
      sender: 'user-a',
      receiver: 'group_chat',
      msgType: 'FILE',
      content: '',
      fileName: 'display-name.txt',
      fileSize: 5,
      fileType: 'text/plain',
      fileUrl: 'http://127.0.0.1:55555/files/123_display-name.txt',
      createTime: '2026-01-01 00:00:00',
      createdAt: 6
    });

    await service.close();
    service = new MessageHistoryService({ cachePath });
    await service.init();

    const history = await service.queryHistory({
      requester: 'user-a',
      chatType: 'group',
      targetUser: 'group_chat'
    });
    const message = history.messages.find((item) => item.msgId === 'file-2');

    expect(message.fileUrl).toBe('/files/123_display-name.txt');
    expect(message.fileName).toBe('display-name.txt');
    expect(fs.existsSync(physicalFile)).toBe(true);
  });

  it('transfers ownership when the owner leaves and dissolves the last room', async () => {
    const room = await service.createRoom({
      name: 'Lifecycle room',
      createdBy: 'lifecycle-owner'
    });
    await service.joinRoom({
      roomId: room.id,
      code: room.code,
      userId: 'lifecycle-member',
      nickname: 'Lifecycle Member'
    });

    const ownerLeave = await service.leaveRoom({
      roomId: room.id,
      userId: 'lifecycle-owner'
    });
    expect(ownerLeave).toMatchObject({
      dissolved: false,
      newOwnerId: 'lifecycle-member',
      ownerChanged: true
    });

    const memberRooms = await service.listRoomsForUser('lifecycle-member');
    expect(memberRooms.find((item) => item.id === room.id)).toMatchObject({
      ownerId: 'lifecycle-member',
      role: 'owner'
    });

    const memberLeave = await service.leaveRoom({
      roomId: room.id,
      userId: 'lifecycle-member'
    });
    expect(memberLeave.dissolved).toBe(true);
    await expect(service.getRoom(room.id)).resolves.toBeNull();
  });

  it('requires room ownership for destructive room operations', async () => {
    const room = await service.createRoom({
      name: 'Protected room',
      createdBy: 'protected-owner'
    });
    await service.joinRoom({
      roomId: room.id,
      code: room.code,
      userId: 'protected-member',
      nickname: 'Protected Member'
    });

    await expect(service.updateRoomName({
      roomId: room.id,
      name: 'Hijacked',
      requester: 'protected-member'
    })).rejects.toThrow('Room owner permission required');

    await expect(service.clearHistory({
      requester: 'protected-member',
      roomId: room.id
    })).rejects.toThrow('Room owner permission required');

    await expect(service.clearHistory({
      requester: 'protected-member',
      roomId: 'group_chat'
    })).rejects.toThrow('Public Lobby history requires administrator');
  });

  it('lists and deletes rooms that exceeded the idle retention period', async () => {
    const now = Date.now();
    const room = await service.createRoom({
      name: 'Inactive room',
      createdBy: 'inactive-owner'
    });
    const activeRoom = await service.createRoom({
      name: 'Active room',
      createdBy: 'active-owner'
    });

    await service.saveMessage({
      msgId: 'inactive-room-message',
      roomId: room.id,
      sender: 'inactive-owner',
      receiver: room.id,
      msgType: 'TEXT',
      content: 'will be removed',
      createTime: 'now',
      createdAt: now
    });
    await service.run(
      'UPDATE rooms SET last_active_at = ?, updated_at = ? WHERE id = ?',
      [now - (8 * 24 * 60 * 60 * 1000), now - (8 * 24 * 60 * 60 * 1000), room.id]
    );

    const candidates = await service.listInactiveRooms({
      retentionDays: 7,
      now
    });
    expect(candidates.map((item) => item.id)).toContain(room.id);
    expect(candidates.map((item) => item.id)).not.toContain(activeRoom.id);

    const deleted = await service.deleteRoomBySystem({
      roomId: room.id,
      reason: 'inactive'
    });
    expect(deleted).toMatchObject({
      roomId: room.id,
      deletedReason: 'inactive'
    });

    const row = await service.get(
      'SELECT status, deleted_reason FROM rooms WHERE id = ?',
      [room.id]
    );
    const messageCount = await service.get(
      'SELECT COUNT(*) AS count FROM messages WHERE session_id = ?',
      [service.getRoomConversation(room.id).sessionId]
    );
    expect(row).toMatchObject({ status: 'deleted', deleted_reason: 'inactive' });
    expect(messageCount.count).toBe(0);
  });

  it('resets the idle clock when a room is joined or receives a message', async () => {
    const room = await service.createRoom({
      name: 'Activity room',
      createdBy: 'activity-owner'
    });
    const oldActivity = Date.now() - (5 * 24 * 60 * 60 * 1000);
    await service.run(
      'UPDATE rooms SET last_active_at = ?, updated_at = ? WHERE id = ?',
      [oldActivity, oldActivity, room.id]
    );

    await service.joinRoom({
      roomId: room.id,
      code: room.code,
      userId: 'activity-member',
      nickname: 'Activity Member'
    });
    const afterJoin = await service.get(
      'SELECT last_active_at FROM rooms WHERE id = ?',
      [room.id]
    );
    expect(afterJoin.last_active_at).toBeGreaterThan(oldActivity);
    const listed = await service.listRoomsForUser('activity-owner');
    expect(listed.find((item) => item.id === room.id)).toMatchObject({
      lastActiveAt: afterJoin.last_active_at
    });
    expect(listed.find((item) => item.id === room.id).expiresAt)
      .toBeGreaterThan(afterJoin.last_active_at);

    const joinedActivity = afterJoin.last_active_at;
    await new Promise((resolve) => setTimeout(resolve, 5));
    await service.saveMessage({
      msgId: 'activity-room-message',
      roomId: room.id,
      sender: 'activity-owner',
      receiver: room.id,
      msgType: 'TEXT',
      content: 'activity',
      createTime: 'now',
      createdAt: Date.now()
    });
    const afterMessage = await service.get(
      'SELECT last_active_at FROM rooms WHERE id = ?',
      [room.id]
    );
    expect(afterMessage.last_active_at).toBeGreaterThanOrEqual(joinedActivity);
  });

  it('allows an existing member to reconnect after the room code changes', async () => {
    const room = await service.createRoom({
      name: 'Reconnect room',
      createdBy: 'reconnect-owner'
    });
    await service.joinRoom({
      roomId: room.id,
      code: room.code,
      userId: 'reconnect-member',
      nickname: 'Reconnect Member'
    });

    await service.regenerateRoomCode({
      roomId: room.id,
      requester: 'reconnect-owner'
    });

    await expect(service.joinRoom({
      roomId: room.id,
      code: room.code,
      userId: 'reconnect-member',
      nickname: 'Reconnect Member'
    })).resolves.toMatchObject({
      id: room.id,
      role: 'member'
    });
  });
});
