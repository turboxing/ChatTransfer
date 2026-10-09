import { beforeEach, describe, expect, it } from 'vitest';
import { useSendHistory } from '../frontend/src/composables/use-send-history';

describe('useSendHistory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores unique entries and limits history to 10 items', () => {
    const inputValue = { value: '' };
    const { sendHistory, add, load } = useSendHistory(inputValue);

    for (let index = 0; index < 12; index += 1) {
      add(`message-${index}`);
    }
    add('message-11');

    load();
    expect(sendHistory.value).toHaveLength(10);
    expect(sendHistory.value[0]).toBe('message-2');
    expect(sendHistory.value.at(-1)).toBe('message-11');
  });

  it('restores the original draft when navigating down from the newest entry', () => {
    const inputValue = { value: '' };
    const { sendHistory, add, load, navigate } = useSendHistory(inputValue);

    add('first');
    add('second');
    load();

    navigate('up');
    expect(inputValue.value).toBe('second');
    navigate('up');
    expect(inputValue.value).toBe('first');
    navigate('down');
    expect(inputValue.value).toBe('second');
    navigate('down');
    expect(inputValue.value).toBe('');
  });
});
