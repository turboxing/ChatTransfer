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

let server;
let serverUrl;
let historyService;
let historyCachePath;
const clients = [];

beforeAll(async () => {
  server = createServer();
  historyCachePath = fs.mkdtempSync(path.join(os.tmpdir(), 'chattransfer-socket-history-'));
  historyService = new MessageHistoryService({ cachePath: historyCachePath });
  await historyService.init();
  registerSocket(server, historyService);

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
  socket.on('user_list_updated', (data) => {
    socket.userLists.push(data.users || []);
  });
  socket.on('reply_group_chat', (message) => {
    socket.messages.push(message);
  });
  socket.on('reply_private_chat', (message) => {
    socket.messages.push(message);
  });

  clients.push(socket);

  return socket;
}

function waitFor(predicate, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const check = () => {
      if (predicate()) {
        resolve();
      } else if (Date.now() - startedAt >= timeout) {
        reject(new Error('Condition timed out'));
      } else {
        setTimeout(check, 25);
      }
    };

    check();
  });
}

function emitWithAck(socket, event, payload) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
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
    const result = await emitWithAck(userA, 'history_clear', {
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
});
