import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useSocket } = await import('../frontend/src/composables/use-socket');

vi.mock('socket.io-client', () => ({
  default: vi.fn()
}));

const { default: io } = await import('socket.io-client');

let emit;
let handlers;

beforeEach(() => {
  emit = vi.fn();
  handlers = new Map();
  io.mockReturnValue({
    on: (event, handler) => {
      if (!handlers.has(event)) handlers.set(event, []);
      handlers.get(event).push(handler);
    },
    emit,
    io: { engine: { transport: { name: 'polling' } } },
    connected: false,
    connect: vi.fn()
  });
});

describe('useSocket', () => {
  afterEach(() => {
    handlers.clear();
    emit.mockClear();
  });

  it('registers the current user online after connecting', async () => {
    const refs = {
      currentUser: { value: 'A' },
      targetUser: { value: 'group_chat' },
      myNickname: { value: 'Tester' },
      pendingRoomCode: { value: 'OLDCODE' }
    };
    const onConnect = vi.fn();
    emit.mockImplementation((event, payload, ack) => {
      if (event === 'room_online') ack?.({ code: 0, data: { room: { id: payload.roomId } } })
    })
    const { connect } = useSocket({ ...refs, onConnect });
    connect();

    handlers.get('connect')?.forEach((handler) => handler());
    await vi.waitFor(() => expect(onConnect).toHaveBeenCalled());

    expect(emit).toHaveBeenCalledWith('login', { uid: 'A' });
    expect(emit).toHaveBeenCalledWith('room_online', {
      roomId: 'group_chat',
      code: 'OLDCODE',
      nickname: 'Tester',
      username: 'A'
    }, expect.any(Function));
    expect(onConnect).toHaveBeenCalled();
    expect(refs.pendingRoomCode.value).toBeNull();
  });

  it('passes user list, group name and messages to callbacks', () => {
    const onUserList = vi.fn();
    const onGroupName = vi.fn();
    const onMessage = vi.fn();
    const onPresenceChanged = vi.fn();
    const onRoomDeleted = vi.fn();
    const onRoomOwnerChanged = vi.fn();
    const { connect } = useSocket({
      currentUser: { value: 'A' },
      targetUser: { value: 'group_chat' },
      myNickname: { value: 'Tester' },
      onUserList,
      onGroupName,
      onMessage,
      onPresenceChanged,
      onRoomDeleted,
      onRoomOwnerChanged
    });
    connect();

    handlers.get('user_list_updated')?.forEach((handler) => handler({ users: ['A'] }));
    handlers.get('group_name_updated')?.forEach((handler) => handler({ groupName: 'Team' }));
    handlers.get('reply_group_chat')?.forEach((handler) => handler({ content: 'hello' }));
    handlers.get('reply_room_chat')?.forEach((handler) => handler({ content: 'room hello' }));
    handlers.get('presence_changed')?.forEach((handler) => handler({ type: 'online', user: { sender: 'B' } }));
    handlers.get('room_deleted')?.forEach((handler) => handler({ roomId: 'room-a' }));
    handlers.get('room_owner_changed')?.forEach((handler) => handler({ roomId: 'room-a', ownerId: 'B' }));

    expect(onUserList).toHaveBeenCalledWith(['A'], undefined);
    expect(onGroupName).toHaveBeenCalledWith('Team');
    expect(onMessage).toHaveBeenCalledWith({ content: 'hello' });
    expect(onMessage).toHaveBeenCalledWith({ content: 'room hello' });
    expect(onPresenceChanged).toHaveBeenCalledWith({ type: 'online', user: { sender: 'B' } });
    expect(onRoomDeleted).toHaveBeenCalledWith({ roomId: 'room-a' });
    expect(onRoomOwnerChanged).toHaveBeenCalledWith({ roomId: 'room-a', ownerId: 'B' });
  });

  it('registers history clear events and emits history requests with ack', async () => {
    const onHistoryCleared = vi.fn();
    const { connect, socket, requestHistory } = useSocket({
      currentUser: { value: 'A' },
      targetUser: { value: 'group_chat' },
      myNickname: { value: 'Tester' },
      onHistoryCleared
    });

    connect();
    socket.value.connected = true;
    emit.mockImplementation((event, payload, ack) => ack?.({ code: 0, data: payload }));

    handlers.get('history_cleared')?.forEach((handler) => handler({ sessionId: 'group' }));
    const result = await requestHistory({
      chatType: 'group',
      targetUser: 'group_chat'
    });

    expect(onHistoryCleared).toHaveBeenCalledWith({ sessionId: 'group' });
    expect(emit).toHaveBeenCalledWith(
      'history_query',
      { chatType: 'group', targetUser: 'group_chat' },
      expect.any(Function)
    );
    expect(result.code).toBe(0);
  });

  it('emits room lifecycle events with ack', async () => {
    const { connect, socket, leaveRoom, dissolveRoom, clearPublicRoomHistory } = useSocket({
      currentUser: { value: 'A' },
      targetUser: { value: 'room-a' },
      myNickname: { value: 'Tester' }
    });

    connect();
    socket.value.connected = true;
    emit.mockImplementation((event, payload, ack) => ack?.({ code: 0, data: { event } }));

    await expect(leaveRoom({ roomId: 'room-a' })).resolves.toMatchObject({ code: 0 });
    await expect(dissolveRoom({ roomId: 'room-a' })).resolves.toMatchObject({ code: 0 });
    await expect(clearPublicRoomHistory()).resolves.toMatchObject({ code: 0 });

    expect(emit).toHaveBeenCalledWith('room_leave', { roomId: 'room-a' }, expect.any(Function));
    expect(emit).toHaveBeenCalledWith('room_dissolve', { roomId: 'room-a' }, expect.any(Function));
    expect(emit).toHaveBeenCalledWith('public_room_admin_clear', {}, expect.any(Function));
  });
});
