import { beforeEach, describe, expect, it } from 'vitest';
import { useMessages } from '../frontend/src/composables/use-messages';

describe('useMessages', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('resets local display before server history is loaded', () => {
    localStorage.setItem('im_chat_record', JSON.stringify([
      { msgId: '1', sender: 'A', receiver: 'B' },
      { msgId: '2', sender: 'B', receiver: 'A' },
      { msgId: '3', sender: 'C', receiver: 'A' },
      { msgId: '4', sender: 'A', receiver: 'group_chat' }
    ]));

    const { rawMessages, loadHistory } = useMessages({ currentUser: { value: 'A' }, targetUser: { value: 'B' } });
    rawMessages.value = [{ msgId: 'old', sender: 'A', receiver: 'B' }];
    loadHistory();

    expect(rawMessages.value).toHaveLength(0);
  });

  it('applies server history and deduplicates messages', () => {
    localStorage.setItem('im_chat_record', JSON.stringify([
      { msgId: 'local-1', sender: 'A', receiver: 'B' }
    ]));

    const { rawMessages, applyServerHistory } = useMessages({
      currentUser: { value: 'A' },
      targetUser: { value: 'B' }
    });

    applyServerHistory({
      messages: [
        { msgId: 'server-1', sender: 'A', receiver: 'B', createdAt: 1 },
        { msgId: 'server-2', sender: 'B', receiver: 'A', createdAt: 2 }
      ],
      nextCursor: 2
    });
    applyServerHistory({
      messages: [
        { msgId: 'server-2', sender: 'B', receiver: 'A', createdAt: 2 },
        { msgId: 'server-3', sender: 'A', receiver: 'B', createdAt: 3 }
      ],
      nextCursor: 3
    });

    expect(rawMessages.value.map((message) => message.msgId)).toEqual([
      'server-1',
      'server-2',
      'server-3'
    ]);
  });

  it('updates an existing message instead of duplicating it', () => {
    const { rawMessages, saveMessage } = useMessages({ currentUser: { value: 'A' }, targetUser: { value: 'B' } });

    saveMessage({ msgId: '1', status: 'sending' });
    saveMessage({ msgId: '1', status: 'success' });

    const records = JSON.parse(localStorage.getItem('im_chat_record'));
    expect(records).toHaveLength(1);
    expect(records[0].status).toBe('success');
    expect(rawMessages.value).toHaveLength(0);
  });

  it('clears only the active session from local history', () => {
    localStorage.setItem('im_chat_record', JSON.stringify([
      { msgId: '1', sender: 'A', receiver: 'B' },
      { msgId: '2', sender: 'B', receiver: 'A' },
      { msgId: '3', sender: 'C', receiver: 'A' },
      { msgId: '4', sender: 'A', receiver: 'group_chat' }
    ]));

    const { rawMessages, clearHistory } = useMessages({
      currentUser: { value: 'A' },
      targetUser: { value: 'B' }
    });
    rawMessages.value = [{ msgId: '1' }];
    clearHistory();

    const records = JSON.parse(localStorage.getItem('im_chat_record'));
    expect(records.map((message) => message.msgId)).toEqual(['3', '4']);
    expect(rawMessages.value).toHaveLength(0);
  });
});
