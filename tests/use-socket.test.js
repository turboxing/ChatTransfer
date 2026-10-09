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

  it('registers the current user online after connecting', () => {
    const refs = {
      currentUser: { value: 'A' },
      targetUser: { value: 'group_chat' },
      myNickname: { value: 'Tester' }
    };
    const onConnect = vi.fn();
    const { connect } = useSocket({ ...refs, onConnect });
    connect();

    handlers.get('connect')?.forEach((handler) => handler());

    expect(emit).toHaveBeenCalledWith('login', { uid: 'A' });
    expect(emit).toHaveBeenCalledWith('group_online', 'A', 'Tester');
    expect(onConnect).toHaveBeenCalled();
  });

  it('passes user list, group name and messages to callbacks', () => {
    const onUserList = vi.fn();
    const onGroupName = vi.fn();
    const onMessage = vi.fn();
    const { connect } = useSocket({
      currentUser: { value: 'A' },
      targetUser: { value: 'group_chat' },
      myNickname: { value: 'Tester' },
      onUserList,
      onGroupName,
      onMessage
    });
    connect();

    handlers.get('user_list_updated')?.forEach((handler) => handler({ users: ['A'] }));
    handlers.get('group_name_updated')?.forEach((handler) => handler({ groupName: 'Team' }));
    handlers.get('reply_group_chat')?.forEach((handler) => handler({ content: 'hello' }));

    expect(onUserList).toHaveBeenCalledWith(['A']);
    expect(onGroupName).toHaveBeenCalledWith('Team');
    expect(onMessage).toHaveBeenCalledWith({ content: 'hello' });
  });
});
