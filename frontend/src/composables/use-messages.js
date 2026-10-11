import { computed, ref } from 'vue';

export function useMessages({ currentUser, targetUser }) {
  const rawMessages = ref([]);
  const historyCursor = ref(null);

  const isSessionMessage = (message) => {
    if (targetUser.value === 'group_chat') {
      return message.receiver === 'group_chat';
    }

    return (
      (message.sender === currentUser.value && message.receiver === targetUser.value) ||
      (message.sender === targetUser.value && message.receiver === currentUser.value)
    );
  };

  const loadHistory = () => {
    rawMessages.value = [];
    historyCursor.value = null;
  };

  const saveMessage = (message) => {
    try {
      const records = JSON.parse(localStorage.getItem('im_chat_record') || '[]');
      const index = records.findIndex((item) => item.msgId === message.msgId);

      if (index > -1) {
        records[index] = message;
      } else {
        records.push(message);
      }

      localStorage.setItem('im_chat_record', JSON.stringify(records));
    } catch (error) {
      console.error(error);
    }
  };

  const clearHistory = () => {
    try {
      const records = JSON.parse(localStorage.getItem('im_chat_record') || '[]');
      const remainingRecords = records.filter((message) => !isSessionMessage(message));

      if (remainingRecords.length > 0) {
        localStorage.setItem('im_chat_record', JSON.stringify(remainingRecords));
      } else {
        localStorage.removeItem('im_chat_record');
      }
    } catch (error) {
      console.error(error);
    }

    rawMessages.value = [];
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
    applyServerHistory,
    resetHistoryCursor
  };
}
