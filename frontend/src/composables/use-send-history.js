import { ref } from 'vue';

const MAX_SEND_HISTORY = 10;

export function useSendHistory(inputValue) {
  const sendHistory = ref([]);
  const historyIndex = ref(-1);
  const historyDraft = ref('');

  const load = () => {
    try {
      sendHistory.value = JSON.parse(localStorage.getItem('im_chat_send_history') || '[]');
    } catch {
      sendHistory.value = [];
    }
  };

  const save = () => {
    localStorage.setItem('im_chat_send_history', JSON.stringify(sendHistory.value));
  };

  const add = (text) => {
    if (!text) return;

    const index = sendHistory.value.indexOf(text);
    if (index > -1) sendHistory.value.splice(index, 1);

    sendHistory.value.push(text);
    sendHistory.value.splice(0, Math.max(0, sendHistory.value.length - MAX_SEND_HISTORY));
    save();
    historyIndex.value = -1;
    historyDraft.value = '';
  };

  const navigate = (direction) => {
    if (sendHistory.value.length === 0) return;

    if (direction === 'up') {
      if (historyIndex.value === -1) historyDraft.value = inputValue.value;
      if (historyIndex.value < sendHistory.value.length - 1) {
        historyIndex.value += 1;
        inputValue.value = sendHistory.value[sendHistory.value.length - 1 - historyIndex.value];
      }
    } else if (direction === 'down') {
      if (historyIndex.value > 0) {
        historyIndex.value -= 1;
        inputValue.value = sendHistory.value[sendHistory.value.length - 1 - historyIndex.value];
      } else if (historyIndex.value === 0) {
        historyIndex.value = -1;
        inputValue.value = historyDraft.value;
      }
    }
  };

  return { sendHistory, load, add, navigate };
}
