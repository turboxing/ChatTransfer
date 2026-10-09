import { onUnmounted, ref } from 'vue';
import io from 'socket.io-client';

export function useSocket({ currentUser, targetUser, myNickname, onConnect, onUserList, onGroupName, onMessage }) {
  const socket = ref(null);
  const isConnected = ref(false);

  const connect = () => {
    socket.value = io('/', {
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      timeout: 20000
    });

    socket.value.on('connect_error', () => {
      isConnected.value = false;
      if (!socket.value.connected) {
        socket.value.connect();
      }
    });

    socket.value.on('connect', () => {
      isConnected.value = true;
      socket.value.emit('login', { uid: currentUser.value });
      socket.value.emit('group_online', currentUser.value, myNickname.value);
      onConnect?.();
    });

    socket.value.on('disconnect', () => {
      isConnected.value = false;
    });

    socket.value.on('user_list_updated', (data) => onUserList?.(data.users || []));
    socket.value.on('group_name_updated', (data) => onGroupName?.(data.groupName || ''));
    socket.value.on('reply_private_chat', onMessage);
    socket.value.on('reply_group_chat', onMessage);
    socket.value.on('update_msg', onMessage);
  };

  onUnmounted(() => socket.value?.disconnect());

  return { socket, isConnected, connect };
}
