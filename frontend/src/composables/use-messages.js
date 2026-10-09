import { computed, ref } from 'vue';

export function useMessages({ currentUser, targetUser }) {
  const rawMessages = ref([]);

  const loadHistory = () => {
    try {
      const records = JSON.parse(localStorage.getItem('im_chat_record') || '[]');
      const session = records.filter((message) => {
        if (targetUser.value === 'group_chat') {
          return message.receiver === 'group_chat';
        }

        return (
          (message.sender === currentUser.value && message.receiver === targetUser.value) ||
          (message.sender === targetUser.value && message.receiver === currentUser.value)
        );
      });

      rawMessages.value = session.map((message) => ({ ...message, status: 'success' }));
    } catch (error) {
      console.error(error);
    }
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
    localStorage.removeItem('im_chat_record');
    rawMessages.value = [];
  };

  return { rawMessages, loadHistory, saveMessage, clearHistory };
}
