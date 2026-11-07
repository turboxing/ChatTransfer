import { computed, ref } from 'vue';

export function useMessages({ currentUser, targetUser }) {
  const rawMessages = ref([]);
  const historyCursor = ref(null);

  const isSessionMessage = (message) => {
    return message.receiver === targetUser.value;
  };

  const getStorageKey = () => `im_chat_record:${targetUser.value || 'group_chat'}`;

  const loadHistory = () => {
    rawMessages.value = [];
    historyCursor.value = null;
  };

  const saveMessage = (message) => {
    try {
      const storageKey = getStorageKey();
      const records = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const index = records.findIndex((item) => item.msgId === message.msgId);

      if (index > -1) {
        records[index] = message;
      } else {
        records.push(message);
      }

      localStorage.setItem(storageKey, JSON.stringify(records));
    } catch (error) {
      console.error(error);
    }
  };

  const clearHistory = () => {
    try {
      const storageKey = getStorageKey();
      const records = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const remainingRecords = records.filter((message) => !isSessionMessage(message));

      if (remainingRecords.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(remainingRecords));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.error(error);
    }

    rawMessages.value = [];
  };

  const removeRoomHistory = (roomId) => {
    if (!roomId) return;

    try {
      localStorage.removeItem(`im_chat_record:${roomId}`);
    } catch (error) {
      console.error(error);
    }

    if (targetUser.value === roomId) {
      rawMessages.value = [];
      historyCursor.value = null;
    }
  };

  const applyServerHistory = ({ messages = [], nextCursor = historyCursor.value }) => {
    const messageMap = new Map(rawMessages.value.map((message) => [message.msgId, message]));

    messages.forEach((message) => {
      messageMap.set(message.msgId, { ...message, status: 'success' });
    });

    rawMessages.value = [...messageMap.values()].sort((a, b) => {
      const leftTime = Number(a.createdAt) || 0;
      const rightTime = Number(b.createdAt) || 0;
      return leftTime - rightTime;
    });

    if (messages.length > 0 || nextCursor !== null) {
      historyCursor.value = nextCursor;
    }
  };

  const resetHistoryCursor = () => {
    historyCursor.value = null;
  };

  return {
    rawMessages,
    historyCursor,
    loadHistory,
    saveMessage,
    clearHistory,
    removeRoomHistory,
    applyServerHistory,
    resetHistoryCursor
  };
}
