import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
import { io as createClient } from 'socket.io-client';
const registerSocket = require('../server/socket/index');
const {
  MessageHistoryService
} = require('../server/services/message-history-service');
const {
  BatchDownloadService
} = require('../server/services/batch-download-service');

let server;
let serverUrl;
let historyService;
let batchDownloadService;
let historyCachePath;
const clients = [];

beforeAll(async () => {
  server = createServer();
  historyCachePath = fs.mkdtempSync(path.join(os.tmpdir(), 'chattransfer-socket-history-'));
  historyService = new MessageHistoryService({ cachePath: historyCachePath });
  await historyService.init();
  batchDownloadService = new BatchDownloadService({ historyService });
  registerSocket(server, historyService, batchDownloadService, {
    presenceOfflineDebounceMs: 80,
    roomIdleRetentionDays: 7,
    roomIdleCleanupIntervalMs: 25
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  serverUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await historyService.close();
  fs.rmSync(historyCachePath, { recursive: true, force: true });
});

afterEach(() => {
  clients.forEach((client) => {
    if (client.connected) client.disconnect();
  });
});

function createChatClient(name) {
  const socket = createClient(serverUrl, {
    path: '/socket.io',
    transports: ['polling', 'websocket'],
    reconnection: false,
    timeout: 5000
  });

  socket.name = name;
  socket.messages = [];
  socket.userLists = [];
  socket.presenceEvents = [];
  socket.roomMessages = [];
  socket.roomUpdates = [];
  socket.roomDeleted = [];
  socket.roomOwnerChanges = [];
  socket.on('user_list_updated', (data) => {
    socket.userLists.push(data.users || []);
  });
  socket.on('reply_group_chat', (message) => {
    socket.messages.push(message);
  });
  socket.on('reply_private_chat', (message) => {
    socket.messages.push(message);
  });
  socket.on('presence_changed', (event) => {
    socket.presenceEvents.push(event);
  });
  socket.on('reply_room_chat', (message) => {
    socket.roomMessages.push(message);
  });
  socket.on('room_updated', (data) => {
    socket.roomUpdates.push(data.room);
  });
  socket.on('room_deleted', (data) => {
    socket.roomDeleted.push(data);
  });
  socket.on('room_owner_changed', (data) => {
    socket.roomOwnerChanges.push(data);
  });

  clients.push(socket);

  return socket;
}

function waitFor(predicate, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const check = () => {
      Promise.resolve(predicate())
        .then((result) => {
          if (result) {
            resolve();
          } else if (Date.now() - startedAt >= timeout) {
            reject(new Error('Condition timed out'));
          } else {
            setTimeout(check, 25);
          }
        })
        .catch(reject);
    };

    check();
  });
}

function emitWithAck(socket, event, payload) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

async function createConnectedClient(name) {
  const socket = createChatClient(name);
  await new Promise((resolve) => socket.once('connect', resolve));
  socket.emit('group_online', `batch-${name}`, name);
  return socket;
}

describe('Socket.IO multi-client chat', () => {
  it('broadcasts group messages and sends private messages to the target only', { timeout: 15000 }, async () => {
    const userA = createChatClient('A');
    const userB = createChatClient('B');
    const userC = createChatClient('C');

    const connected = Promise.all([
      new Promise((resolve) => userA.once('connect', resolve)),
      new Promise((resolve) => userB.once('connect', resolve)),
      new Promise((resolve) => userC.once('connect', resolve))
    ]);

    userA.on('connect', () => userA.emit('group_online', 'A', 'A nickname'));
    userB.on('connect', () => userB.emit('group_online', 'B', 'B nickname'));
    userC.on('connect', () => userC.emit('group_online', 'C', 'C nickname'));

    await connected;

    await waitFor(() => {
      const users = userC.userLists.at(-1) || [];
      return ['A', 'B', 'C'].every((name) => users.some(
        (user) => user.sender === name && user.status === 'ONLINE'
      ));
    }, 10000);

    userA.emit('group_chat', {
      sender: 'A',
      receiver: 'group_chat',
      msgType: 'TEXT',
      content: 'group-from-a'
    });

    userA.emit('private_chat', {
      sender: 'A',
      receiver: 'B',
      msgType: 'TEXT',
      content: 'private-a-to-b'
    });

    await waitFor(() => (
      userB.messages.some((message) => message.content === 'group-from-a') &&
      userC.messages.some((message) => message.content === 'group-from-a') &&
      userB.messages.some((message) => message.content === 'private-a-to-b')
    ), 10000);

    expect(userB.messages.some((message) => message.content === 'private-a-to-b')).toBe(true);
    expect(userC.messages.some((message) => message.content === 'private-a-to-b')).toBe(false);

    const latestUsers = userC.userLists.at(-1);
    expect(latestUsers.filter((user) => user.status === 'ONLINE')).toHaveLength(3);

    userA.disconnect();
    userB.disconnect();
    userC.disconnect();
  });

  it('synchronizes group messages across polling and websocket clients', { timeout: 15000 }, async () => {
    const sender = createClient(serverUrl, {
      path: '/socket.io',
      transports: ['polling'],
      reconnection: false,
      timeout: 5000
    });
    const receiver = createClient(serverUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: false,
      timeout: 5000
    });

    sender.messages = [];
    receiver.messages = [];
    receiver.on('reply_group_chat', (message) => receiver.messages.push(message));
    sender.on('connect', () => sender.emit('group_online', 'PollA', 'Poll A'));
    receiver.on('connect', () => receiver.emit('group_online', 'WsC', 'Ws C'));

    await Promise.all([
      new Promise((resolve) => sender.once('connect', resolve)),
      new Promise((resolve) => receiver.once('connect', resolve))
    ]);

    sender.emit('group_chat', {
      sender: 'PollA',
      receiver: 'group_chat',
      msgType: 'TEXT',
      content: 'mixed-transport'
    });

    await waitFor(
      () => receiver.messages.some((message) => message.content === 'mixed-transport'),
      10000
    );

    sender.disconnect();
    receiver.disconnect();
  });

  it('persists offline private and group messages for later clients', { timeout: 15000 }, async () => {
    const sender = createChatClient('HistorySender');
    await new Promise((resolve) => sender.once('connect', resolve));
    sender.emit('group_online', 'history-sender', 'History Sender');

    await emitWithAck(sender, 'private_chat', {
      sender: 'history-sender',
      receiver: 'history-receiver',
      msgType: 'TEXT',
      content: 'offline-private-message'
    });
    await emitWithAck(sender, 'group_chat', {
      sender: 'history-sender',
      receiver: 'group_chat',
      msgType: 'TEXT',
      content: 'offline-group-message'
    });

    const receiver = createChatClient('HistoryReceiver');
    await new Promise((resolve) => receiver.once('connect', resolve));
    receiver.emit('group_online', 'history-receiver', 'History Receiver');

    const privateHistory = await emitWithAck(receiver, 'history_query', {
      chatType: 'private',
      targetUser: 'history-sender'
    });
    const groupHistory = await emitWithAck(receiver, 'history_query', {
      chatType: 'group',
      targetUser: 'group_chat'
    });

    expect(privateHistory.code).toBe(0);
    expect(privateHistory.data.messages.map((message) => message.content)).toContain('offline-private-message');
    expect(groupHistory.code).toBe(0);
    expect(groupHistory.data.messages.map((message) => message.content)).toContain('offline-group-message');

    sender.disconnect();
    receiver.disconnect();
  });

  it('clears server history and notifies connected clients', { timeout: 15000 }, async () => {
    const userA = createChatClient('ClearA');
    const userB = createChatClient('ClearB');
    await Promise.all([
      new Promise((resolve) => userA.once('connect', resolve)),
      new Promise((resolve) => userB.once('connect', resolve))
    ]);
    userA.emit('group_online', 'clear-user-a', 'Clear A');
    userB.emit('group_online', 'clear-user-b', 'Clear B');

    await emitWithAck(userA, 'group_chat', {
      sender: 'clear-user-a',
      receiver: 'group_chat',
      msgType: 'TEXT',
      content: 'message-before-clear'
    });

    const cleared = new Promise((resolve) => userB.once('history_cleared', resolve));
    const result = await emitWithAck(userA, 'public_room_admin_clear', {
      chatType: 'group',
      targetUser: 'group_chat'
    });
    const event = await cleared;
    const history = await emitWithAck(userB, 'history_query', {
      chatType: 'group',
      targetUser: 'group_chat'
    });

    expect(result.code).toBe(0);
    expect(event.sessionId).toBe('group');
    expect(history.data.messages.map((message) => message.content)).not.toContain('message-before-clear');

    userA.disconnect();
    userB.disconnect();
  });

  it('queries attachments and creates a one-time batch download', { timeout: 15000 }, async () => {
    const filesDir = path.join(historyCachePath, 'files');
    fs.mkdirSync(filesDir, { recursive: true });
    fs.writeFileSync(path.join(filesDir, 'batch-a.txt'), 'batch-a', 'utf8');
    fs.writeFileSync(path.join(filesDir, 'batch-b.txt'), 'batch-b', 'utf8');

    const batchSenderA = await createConnectedClient('BatchSender');
    await emitWithAck(batchSenderA, 'group_chat', {
      sender: 'batch-user-a',
      receiver: 'group_chat',
      msgType: 'FILE',
      fileName: 'batch-a.txt',
      fileSize: 7,
      fileUrl: 'http://127.0.0.1:55555/files/batch-a.txt'
    });
    const batchSenderB = await createConnectedClient('BatchSender2');
    await emitWithAck(batchSenderB, 'group_chat', {
      sender: 'batch-user-b',
      receiver: 'group_chat',
      msgType: 'IMAGE',
      fileName: 'batch-b.txt',
      fileSize: 7,
      fileUrl: 'http://127.0.0.1:55555/files/batch-b.txt'
    });

    const user = createChatClient('BatchUser');
    await new Promise((resolve) => user.once('connect', resolve));
    user.emit('group_online', 'batch-user-c', 'Batch User');
    const attachments = await emitWithAck(user, 'attachment_query', {
      chatType: 'group',
      targetUser: 'group_chat'
    });
    const download = await emitWithAck(user, 'attachment_download', {
      chatType: 'group',
      targetUser: 'group_chat',
      messageIds: attachments.data.attachments.map((attachment) => attachment.msgId)
    });
    const reused = await emitWithAck(user, 'attachment_download', {
      chatType: 'group',
      targetUser: 'group_chat',
      messageIds: attachments.data.attachments.map((attachment) => attachment.msgId)
    });

    expect(attachments.code).toBe(0);
    expect(attachments.data.attachments.map((attachment) => attachment.fileName)).toEqual([
      'batch-a.txt',
      'batch-b.txt'
    ]);
    expect(attachments.data.attachments.map((attachment) => attachment.fileUrl)).toEqual([
      '/files/batch-a.txt',
      '/files/batch-b.txt'
    ]);
    expect(download.code).toBe(0);
    expect(download.data.downloadUrl).toMatch(/^\/batch-download\/[a-f0-9]{48}$/);
    expect(reused.code).toBe(0);
    expect(reused.data.downloadUrl).not.toBe(download.data.downloadUrl);
  });

  it('debounces offline presence and handles multiple connections per user', { timeout: 15000 }, async () => {
    const observer = createChatClient('PresenceObserver');
    await new Promise((resolve) => observer.once('connect', resolve));
    observer.emit('group_online', 'presence-observer', 'Presence Observer');
    await waitFor(() => observer.userLists.length > 0);

    const firstTab = createChatClient('PresenceDeviceFirst');
    await new Promise((resolve) => firstTab.once('connect', resolve));
    firstTab.emit('group_online', 'presence-device', 'Presence Device');

    await waitFor(() => observer.presenceEvents.some(
      (event) => event.type === 'online' && event.user.sender === 'presence-device'
    ));

    const secondTab = createChatClient('PresenceDeviceSecond');
    await new Promise((resolve) => secondTab.once('connect', resolve));
    secondTab.emit('group_online', 'presence-device', 'Presence Device');
    await waitFor(() => secondTab.userLists.length > 0);

    firstTab.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 220));
    expect(observer.presenceEvents.some(
      (event) => event.type === 'offline' && event.user.sender === 'presence-device'
    )).toBe(false);

    secondTab.disconnect();
    await waitFor(() => observer.presenceEvents.some(
      (event) => event.type === 'offline' && event.user.sender === 'presence-device'
    ));

    const reconnect = createChatClient('PresenceDeviceReconnect');
    await new Promise((resolve) => reconnect.once('connect', resolve));
    reconnect.emit('group_online', 'presence-device', 'Presence Device');

    await waitFor(() => observer.presenceEvents.filter(
      (event) => event.type === 'online' && event.user.sender === 'presence-device'
    ).length >= 2);

    const latestUser = observer.userLists.at(-1).find((user) => user.sender === 'presence-device');
    expect(latestUser).toMatchObject({ status: 'ONLINE', nickname: 'Presence Device' });
    observer.disconnect();
    reconnect.disconnect();
  });

  it('keeps a user online when they reconnect during the offline debounce window', { timeout: 15000 }, async () => {
    const observer = createChatClient('ReconnectObserver');
    await new Promise((resolve) => observer.once('connect', resolve));
    observer.emit('group_online', 'reconnect-observer', 'Reconnect Observer');
    await waitFor(() => observer.userLists.length > 0);

    const first = createChatClient('ReconnectFirst');
    await new Promise((resolve) => first.once('connect', resolve));
    first.emit('group_online', 'reconnect-device', 'Reconnect Device');
    await waitFor(() => observer.presenceEvents.some(
      (event) => event.type === 'online' && event.user.sender === 'reconnect-device'
    ));

    first.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 30));
    const second = createChatClient('ReconnectSecond');
    await new Promise((resolve) => second.once('connect', resolve));
    second.emit('group_online', 'reconnect-device', 'Reconnect Device');
    await waitFor(() => second.userLists.length > 0);

    await new Promise((resolve) => setTimeout(resolve, 180));
    expect(observer.presenceEvents.some(
      (event) => event.type === 'offline' && event.user.sender === 'reconnect-device'
    )).toBe(false);
    expect(observer.userLists.at(-1).find((user) => user.sender === 'reconnect-device').status).toBe('ONLINE');
    observer.disconnect();
    second.disconnect();
  });

  it('creates rooms, joins by room code, and isolates room messages', { timeout: 15000 }, async () => {
    const host = createChatClient('RoomHost');
    await new Promise((resolve) => host.once('connect', resolve));
    await emitWithAck(host, 'room_online', {
      roomId: 'group_chat',
      username: 'room-host',
      nickname: 'Room Host'
    });

    const created = await emitWithAck(host, 'room_create', { name: 'Project A' });
    expect(created.code).toBe(0);
    const room = created.data.room;
    expect(room.id).toMatch(/^[0-9a-f-]+$/i);
    expect(room.code).toHaveLength(8);
    await emitWithAck(host, 'room_online', {
      roomId: room.id,
      username: 'room-host',
      nickname: 'Room Host'
    });

    const joiner = createChatClient('RoomJoiner');
    await new Promise((resolve) => joiner.once('connect', resolve));
    await emitWithAck(joiner, 'room_online', {
      roomId: 'group_chat',
      username: 'room-joiner',
      nickname: 'Room Joiner'
    });

    const denied = await emitWithAck(joiner, 'room_join_by_code', { code: 'WRONG234' });
    expect(denied.code).toBe(-1);

    const joined = await emitWithAck(joiner, 'room_join_by_code', { code: room.code });
    expect(joined.code).toBe(0);
    await emitWithAck(joiner, 'room_online', {
      roomId: room.id,
      username: 'room-joiner',
      nickname: 'Room Joiner'
    });

    const roomMessage = new Promise((resolve) => joiner.once('reply_room_chat', resolve));
    await emitWithAck(host, 'room_chat', {
      sender: 'room-host',
      roomId: room.id,
      msgType: 'TEXT',
      content: 'project-a-only'
    });
    await roomMessage;

    const defaultMessage = await emitWithAck(host, 'group_chat', {
      sender: 'room-host',
      receiver: 'group_chat',
      msgType: 'TEXT',
      content: 'default-room-only'
    });

    expect(defaultMessage.content).toBe('default-room-only');
    expect(joiner.roomMessages.map((message) => message.content)).toEqual(['project-a-only']);

    const roomHistory = await emitWithAck(joiner, 'history_query', { roomId: room.id });
    expect(roomHistory.code).toBe(0);
    expect(roomHistory.data.messages.map((message) => message.content)).toEqual(['project-a-only']);

    const defaultHistory = await emitWithAck(host, 'history_query', { roomId: 'group_chat' });
    expect(defaultHistory.data.messages.map((message) => message.content)).toContain('default-room-only');
    expect(defaultHistory.data.messages.map((message) => message.content)).not.toContain('project-a-only');

    const renamed = await emitWithAck(host, 'room_update_name', {
      roomId: room.id,
      name: 'Renamed Project A'
    });
    expect(renamed.code).toBe(0);
    await waitFor(() => joiner.roomUpdates.some((item) => item.id === room.id && item.name === 'Renamed Project A'));
    expect(joiner.roomUpdates.at(-1).name).toBe('Renamed Project A');

    const filesDir = path.join(historyCachePath, 'files');
    fs.mkdirSync(filesDir, { recursive: true });
    fs.writeFileSync(path.join(filesDir, 'room-file.txt'), 'room file', 'utf8');
    await emitWithAck(host, 'room_chat', {
      sender: 'room-host',
      roomId: room.id,
      msgType: 'FILE',
      fileName: 'room-file.txt',
      fileSize: 9,
      fileUrl: 'http://127.0.0.1:55555/files/room-file.txt'
    });
    const roomAttachments = await emitWithAck(joiner, 'attachment_query', { roomId: room.id });
    expect(roomAttachments.code).toBe(0);
    expect(roomAttachments.data.attachments.map((item) => item.fileName)).toContain('room-file.txt');
    const roomDownload = await emitWithAck(joiner, 'attachment_download', {
      roomId: room.id,
      messageIds: roomAttachments.data.attachments.map((item) => item.msgId)
    });
    expect(roomDownload.code).toBe(0);

    const rooms = await emitWithAck(joiner, 'room_list', {});
    const listedRoom = rooms.data.find((item) => item.id === room.id);
    expect(listedRoom).toBeTruthy();
    expect(listedRoom.onlineCount).toBe(2);

    const regenerated = await emitWithAck(host, 'room_regenerate_code', {
      roomId: room.id
    });
    expect(regenerated.code).toBe(0);
    const staleReconnect = await emitWithAck(joiner, 'room_online', {
      roomId: room.id,
      code: room.code,
      username: 'room-joiner',
      nickname: 'Room Joiner'
    });
    expect(staleReconnect.code).toBe(0);

    const left = await emitWithAck(joiner, 'room_leave', { roomId: room.id });
    expect(left.code).toBe(0);
    expect(left.data).toMatchObject({ dissolved: false, ownerChanged: false });

    const dissolved = await emitWithAck(host, 'room_dissolve', { roomId: room.id });
    expect(dissolved.code).toBe(0);
    await waitFor(() => host.roomDeleted.some((item) => item.roomId === room.id));
    expect(host.roomDeleted.at(-1)).toMatchObject({
      roomId: room.id,
      reason: 'owner_dissolved'
    });
    const remainingRooms = await emitWithAck(host, 'room_list', {});
    expect(remainingRooms.data.some((item) => item.id === room.id)).toBe(false);
    expect(fs.existsSync(path.join(filesDir, 'room-file.txt'))).toBe(false);

    host.disconnect();
    joiner.disconnect();
  });

  it('transfers room ownership and enforces lifecycle permissions', { timeout: 15000 }, async () => {
    const owner = createChatClient('LifecycleOwner');
    const member = createChatClient('LifecycleMember');
    await Promise.all([
      new Promise((resolve) => owner.once('connect', resolve)),
      new Promise((resolve) => member.once('connect', resolve))
    ]);

    await emitWithAck(owner, 'room_online', {
      roomId: 'group_chat',
      username: 'lifecycle-owner',
      nickname: 'Lifecycle Owner'
    });
    const created = await emitWithAck(owner, 'room_create', { name: 'Lifecycle Project' });
    const room = created.data.room;
    await emitWithAck(owner, 'room_online', {
      roomId: room.id,
      username: 'lifecycle-owner',
      nickname: 'Lifecycle Owner'
    });

    await emitWithAck(member, 'room_online', {
      roomId: 'group_chat',
      username: 'lifecycle-member',
      nickname: 'Lifecycle Member'
    });
    await emitWithAck(member, 'room_join_by_code', { code: room.code });
    await emitWithAck(member, 'room_online', {
      roomId: room.id,
      username: 'lifecycle-member',
      nickname: 'Lifecycle Member'
    });

    const deniedRename = await emitWithAck(member, 'room_update_name', {
      roomId: room.id,
      name: 'Not Allowed'
    });
    const deniedDissolve = await emitWithAck(member, 'room_dissolve', {
      roomId: room.id
    });
    expect(deniedRename.code).toBe(-1);
    expect(deniedDissolve.code).toBe(-1);

    const ownerLeft = await emitWithAck(owner, 'room_leave', { roomId: room.id });
    expect(ownerLeft.code).toBe(0);
    expect(ownerLeft.data).toMatchObject({
      dissolved: false,
      newOwnerId: 'lifecycle-member',
      ownerChanged: true
    });
    await waitFor(() => member.roomOwnerChanges.some(
      (item) => item.roomId === room.id && item.ownerId === 'lifecycle-member'
    ));

    const renamed = await emitWithAck(member, 'room_update_name', {
      roomId: room.id,
      name: 'Lifecycle Renamed'
    });
    expect(renamed.code).toBe(0);

    const dissolved = await emitWithAck(member, 'room_dissolve', { roomId: room.id });
    expect(dissolved.code).toBe(0);
    await waitFor(() => member.roomDeleted.some((item) => item.roomId === room.id));

    const listed = await emitWithAck(member, 'room_list', {});
    expect(listed.data.some((item) => item.id === room.id)).toBe(false);
    owner.disconnect();
    member.disconnect();
  });

  it('schedules cleanup for rooms that exceed the idle retention period', { timeout: 15000 }, async () => {
    const owner = createChatClient('IdleCleanupOwner');
    await new Promise((resolve) => owner.once('connect', resolve));
    await emitWithAck(owner, 'room_online', {
      roomId: 'group_chat',
      username: 'idle-cleanup-owner',
      nickname: 'Idle Cleanup Owner'
    });
    const created = await emitWithAck(owner, 'room_create', { name: 'Idle Cleanup Room' });
    const room = created.data.room;
    await emitWithAck(owner, 'room_online', {
      roomId: room.id,
      username: 'idle-cleanup-owner',
      nickname: 'Idle Cleanup Owner'
    });
    owner.disconnect();

    await new Promise((resolve) => setTimeout(resolve, 120));
    await historyService.run(
      'UPDATE rooms SET last_active_at = ?, updated_at = ? WHERE id = ?',
      [Date.now() - (8 * 24 * 60 * 60 * 1000), Date.now() - (8 * 24 * 60 * 60 * 1000), room.id]
    );

    await waitFor(async () => {
      const persisted = await historyService.get(
        'SELECT status, deleted_reason FROM rooms WHERE id = ?',
        [room.id]
      );
      return persisted?.status === 'deleted' && persisted.deleted_reason === 'inactive';
    }, 2000);
  });
});
