import { beforeEach, describe, expect, it } from 'vitest';
import { useMessages } from '../frontend/src/composables/use-messages';

describe('useMessages', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads only messages for the active private session', () => {
    localStorage.setItem('im_chat_record', JSON.stringify([
      { msgId: '1', sender: 'A', receiver: 'B' },
      { msgId: '2', sender: 'B', receiver: 'A' },
      { msgId: '3', sender: 'C', receiver: 'A' },
      { msgId: '4', sender: 'A', receiver: 'group_chat' }
    ]));

    const { rawMessages, loadHistory } = useMessages({ currentUser: { value: 'A' }, targetUser: { value: 'B' } });
    loadHistory();

    expect(rawMessages.value).toHaveLength(2);
    expect(rawMessages.value.map((message) => message.msgId)).toEqual(['1', '2']);
    expect(rawMessages.value.every((message) => message.status === 'success')).toBe(true);
  });

  it('loads only group messages in a group session', () => {
    localStorage.setItem('im_chat_record', JSON.stringify([
      { msgId: '1', sender: 'A', receiver: 'B' },
      { msgId: '2', sender: 'A', receiver: 'group_chat' }
    ]));

    const { rawMessages, loadHistory } = useMessages({ currentUser: { value: 'A' }, targetUser: { value: 'group_chat' } });
    loadHistory();

    expect(rawMessages.value).toHaveLength(1);
    expect(rawMessages.value[0].receiver).toBe('group_chat');
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
});
