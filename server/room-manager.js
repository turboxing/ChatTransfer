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
    const existing = this.users.get(username) || {};
    this.users.set(username, {
      socketId,
      status: ONLINE,
      nickname: nickname || existing.nickname || '',
      ip
    });
  }

  getUser(username) {
    return this.users.get(username);
  }

  setNickname(username, nickname) {
    const user = this.users.get(username);

    if (!user) {
      return false;
    }

    user.nickname = nickname || '';
    return true;
  }

  setOffline(username) {
    const user = this.users.get(username);

    if (!user) {
      return false;
    }

    user.status = OFFLINE;
    return true;
  }

  listUsers() {
    return [...this.users.entries()].map(([username, user]) => ({
      sender: username,
      nickname: user.nickname || '',
      ip: user.ip || '',
      status: user.status
    }));
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
