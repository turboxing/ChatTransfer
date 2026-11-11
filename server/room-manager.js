const ONLINE = 'ONLINE';
const OFFLINE = 'OFFLINE';
const DEFAULT_ROOM_ID = 'group_chat';

class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.roomNames = new Map();
    this.ensureRoom(DEFAULT_ROOM_ID);
  }

  ensureRoom(roomId = DEFAULT_ROOM_ID) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, { users: new Map() });
    }

    return this.rooms.get(roomId);
  }

  getOnline() {
    return ONLINE;
  }

  getOffline() {
    return OFFLINE;
  }

  setOnline({ roomId = DEFAULT_ROOM_ID, username, socketId, nickname = '', ip = '', userAgent = '' }) {
    const room = this.ensureRoom(roomId);
    const existing = room.users.get(username) || {
      socketIds: new Set(),
      status: OFFLINE,
      nickname: '',
      ip: '',
      userAgent: '',
      lastSeenAt: null,
      onlineSince: null
    };
    const socketIds = new Set(existing.socketIds || []);
    if (socketId) socketIds.add(socketId);
    const wasOnline = existing.status === ONLINE && socketIds.size > 0;
    const user = {
      ...existing,
      socketIds,
      status: ONLINE,
      nickname: nickname || existing.nickname || '',
      ip: ip || existing.ip || '',
      userAgent: userAgent || existing.userAgent || '',
      onlineSince: wasOnline ? existing.onlineSince : Date.now()
    };
    room.users.set(username, user);

    return {
      user: this.getPublicUser(roomId, username),
      becameOnline: !wasOnline
    };
  }

  getUser(roomId = DEFAULT_ROOM_ID, username) {
    return this.ensureRoom(roomId).users.get(username);
  }

  getPublicUser(roomId = DEFAULT_ROOM_ID, username) {
    const user = this.ensureRoom(roomId).users.get(username);
    if (!user) return null;

    return {
      sender: username,
      nickname: user.nickname || '',
      ip: user.ip || '',
      userAgent: user.userAgent || '',
      status: user.status,
      lastSeenAt: user.lastSeenAt || null,
      onlineSince: user.onlineSince || null
    };
  }

  setNickname({ roomId = DEFAULT_ROOM_ID, username, nickname = '' }) {
    const user = this.getUser(roomId, username);

    if (!user) {
      return false;
    }

    user.nickname = nickname || '';
    return true;
  }

  removeSocket({ roomId = DEFAULT_ROOM_ID, username, socketId }) {
    const user = this.getUser(roomId, username);

    if (!user) {
      return { user: null, hasConnections: false };
    }

    user.socketIds.delete(socketId);
    return {
      user: this.getPublicUser(roomId, username),
      hasConnections: user.socketIds.size > 0
    };
  }

  markOffline({ roomId = DEFAULT_ROOM_ID, username }) {
    const user = this.getUser(roomId, username);

    if (!user) {
      return { user: null, becameOffline: false };
    }

    const becameOffline = user.status !== OFFLINE;
    user.socketIds.clear();
    user.status = OFFLINE;
    user.onlineSince = null;
    user.lastSeenAt = Date.now();

    return {
      user: this.getPublicUser(roomId, username),
      becameOffline
    };
  }

  setOffline({ roomId = DEFAULT_ROOM_ID, username, socketId = null }) {
    const user = this.getUser(roomId, username);

    if (!user) {
      return { user: null, becameOffline: false, hasConnections: false };
    }

    if (socketId) user.socketIds.delete(socketId);
    const hasConnections = user.socketIds.size > 0;

    return hasConnections
      ? { user: this.getPublicUser(roomId, username), becameOffline: false, hasConnections }
      : { ...this.markOffline({ roomId, username }), hasConnections: false };
  }

  listUsers(roomId = DEFAULT_ROOM_ID) {
    const room = this.ensureRoom(roomId);
    return [...room.users.keys()].map((username) => this.getPublicUser(roomId, username));
  }

  removeRoom(roomId = DEFAULT_ROOM_ID) {
    if (roomId === DEFAULT_ROOM_ID) return false;
    this.rooms.delete(roomId);
    this.roomNames.delete(roomId);
    return true;
  }

  setRoomName(roomId = DEFAULT_ROOM_ID, name = '') {
    this.roomNames.set(roomId, name || '');
  }

  getRoomName(roomId = DEFAULT_ROOM_ID) {
    return this.roomNames.get(roomId) || '';
  }

  setGroupName(groupName) {
    this.setRoomName(DEFAULT_ROOM_ID, groupName);
  }

  getGroupName() {
    return this.getRoomName(DEFAULT_ROOM_ID);
  }
}

module.exports = {
  RoomManager,
  USER_STATUS: [ONLINE, OFFLINE],
  DEFAULT_ROOM_ID
};
