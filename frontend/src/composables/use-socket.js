import { onUnmounted, ref } from 'vue';
import io from 'socket.io-client';

export function useSocket({
  currentUser,
  targetUser,
  myNickname,
  activeRoomId = null,
  pendingRoomCode = null,
  onConnect,
  onUserList,
  onGroupName,
  onMessage,
  onHistoryCleared,
  onPresenceChanged,
  onRoomUpdated,
  onRoomError
}) {
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

    socket.value.on('connect', async () => {
      isConnected.value = true;
      socket.value.emit('login', { uid: currentUser.value });

      const result = await new Promise((resolve) => {
        socket.value.emit('room_online', {
          roomId: activeRoomId?.value || targetUser.value || 'group_chat',
          code: pendingRoomCode?.value || null,
          nickname: myNickname.value,
          username: currentUser.value
        }, resolve)
      })

      if (result.code !== 0) {
        onRoomError?.(result)
        return
      }

      onConnect?.();
    });

    socket.value.on('disconnect', () => {
      isConnected.value = false;
    });

    socket.value.on('user_list_updated', (data) => onUserList?.(data.users || []));
    socket.value.on('group_name_updated', (data) => onGroupName?.(data.groupName || ''));
    socket.value.on('room_updated', (data) => onRoomUpdated?.(data.room));
    socket.value.on('reply_private_chat', onMessage);
    socket.value.on('reply_group_chat', onMessage);
    socket.value.on('reply_room_chat', onMessage);
    socket.value.on('update_msg', onMessage);
    socket.value.on('history_cleared', (data) => onHistoryCleared?.(data));
    socket.value.on('presence_changed', (data) => onPresenceChanged?.(data));
  };

  const emitWithAck = (eventName, payload) => new Promise((resolve) => {
    if (!socket.value || !socket.value.connected) {
      resolve({ code: -1, message: 'Socket not connected' });
      return;
    }

    socket.value.emit(eventName, payload, resolve);
  });

  const requestHistory = (payload) => emitWithAck('history_query', payload);
  const createRoom = (payload) => emitWithAck('room_create', payload);
  const joinRoomByCode = (payload) => emitWithAck('room_join_by_code', payload);
  const listRooms = () => emitWithAck('room_list', {});
  const updateRoomName = (payload) => emitWithAck('room_update_name', payload);
  const regenerateRoomCode = (payload) => emitWithAck('room_regenerate_code', payload);
  const joinRoom = async (payload) => {
    const result = await emitWithAck('room_online', payload);
    if (result.code === 0 && activeRoomId) {
      activeRoomId.value = payload.roomId;
    }

    return result;
  };
  const queryAttachments = (payload) => emitWithAck('attachment_query', payload);
  const requestBatchDownload = (payload) => emitWithAck('attachment_download', payload);

  const clearServerHistory = (payload) => emitWithAck('history_clear', payload);

  onUnmounted(() => socket.value?.disconnect());

  return {
    socket,
    isConnected,
    connect,
    createRoom,
    joinRoom,
    joinRoomByCode,
    listRooms,
    updateRoomName,
    regenerateRoomCode,
    requestHistory,
    queryAttachments,
    requestBatchDownload,
    clearServerHistory
  };
}
