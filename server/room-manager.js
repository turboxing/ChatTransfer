const ONLINE = 'ONLINE';
const OFFLINE = 'OFFLINE';

class RoomManager {
  constructor() {
    this.users = new Map();
    this.groupName = '';
  }

  getOnline() {
    return ONLINE;
  }

  getOffline() {
    return OFFLINE;
  }

  setOnline({ username, socketId, nickname = '', ip = '' }) {
    const existing = this.users.get(username) || {
      socketIds: new Set(),
      status: OFFLINE,
      nickname: '',
      ip: '',
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
      onlineSince: wasOnline ? existing.onlineSince : Date.now()
    };
    this.users.set(username, user);

    return {
      user: this.getPublicUser(username),
      becameOnline: !wasOnline
    };
  }

  getUser(username) {
    return this.users.get(username);
  }

  getPublicUser(username) {
    const user = this.users.get(username);
    if (!user) return null;

    return {
      sender: username,
      nickname: user.nickname || '',
      ip: user.ip || '',
      status: user.status,
      lastSeenAt: user.lastSeenAt || null,
      onlineSince: user.onlineSince || null
    };
  }

  setNickname(username, nickname) {
    const user = this.users.get(username);

    if (!user) {
      return false;
    }

    user.nickname = nickname || '';
    return true;
  }

  removeSocket(username, socketId) {
    const user = this.users.get(username);

    if (!user) {
      return { user: null, hasConnections: false };
    }

    user.socketIds.delete(socketId);
    return {
      user: this.getPublicUser(username),
      hasConnections: user.socketIds.size > 0
    };
  }

  markOffline(username) {
    const user = this.users.get(username);

    if (!user) {
      return { user: null, becameOffline: false };
    }

    const becameOffline = user.status !== OFFLINE;
    user.socketIds.clear();
    user.status = OFFLINE;
    user.onlineSince = null;
    user.lastSeenAt = Date.now();

    return {
      user: this.getPublicUser(username),
      becameOffline
    };
  }

  setOffline(username, socketId = null) {
    const user = this.users.get(username);

    if (!user) {
      return { user: null, becameOffline: false, hasConnections: false };
    }

    if (socketId) user.socketIds.delete(socketId);
    const hasConnections = user.socketIds.size > 0;

    return hasConnections
      ? { user: this.getPublicUser(username), becameOffline: false, hasConnections }
      : { ...this.markOffline(username), hasConnections: false };
  }

  listUsers() {
    return [...this.users.keys()].map((username) => this.getPublicUser(username));
  }

  setGroupName(groupName) {
    this.groupName = groupName || '';
  }

  getGroupName() {
    return this.groupName;
  }
}

module.exports = {
  RoomManager,
  USER_STATUS: [ONLINE, OFFLINE]
};
