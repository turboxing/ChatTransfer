import { describe, expect, it } from 'vitest';
import { RoomManager } from '../server/room-manager';

describe('RoomManager presence', () => {
  it('tracks multiple sockets and only marks a user offline when all disconnect', () => {
    const manager = new RoomManager();

    const firstConnection = manager.setOnline({
      username: 'user-a',
      socketId: 'socket-a',
      nickname: 'Device A',
      ip: '192.168.1.10'
    });
    const secondConnection = manager.setOnline({
      username: 'user-a',
      socketId: 'socket-b',
      nickname: 'Device A',
      ip: '192.168.1.10'
    });

    expect(firstConnection.becameOnline).toBe(true);
    expect(secondConnection.becameOnline).toBe(false);
    expect(manager.listUsers()).toEqual([
      expect.objectContaining({ sender: 'user-a', status: 'ONLINE' })
    ]);

    expect(manager.removeSocket('user-a', 'socket-a')).toEqual({
      user: expect.objectContaining({ sender: 'user-a', status: 'ONLINE' }),
      hasConnections: true
    });
    expect(manager.listUsers()[0].status).toBe('ONLINE');

    expect(manager.removeSocket('user-a', 'socket-b').hasConnections).toBe(false);
    const offline = manager.markOffline('user-a');

    expect(offline.becameOffline).toBe(true);
    expect(offline.user.status).toBe('OFFLINE');
    expect(offline.user.lastSeenAt).toEqual(expect.any(Number));
  });

  it('reports a new online transition when an offline user returns', () => {
    const manager = new RoomManager();

    manager.setOnline({ username: 'user-b', socketId: 'socket-a' });
    manager.markOffline('user-b');
    const reconnect = manager.setOnline({ username: 'user-b', socketId: 'socket-b' });

    expect(reconnect.becameOnline).toBe(true);
    expect(reconnect.user.status).toBe('ONLINE');
  });
});
