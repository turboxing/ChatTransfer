import { ref } from 'vue';

export function useLocalStorage(key, defaultValue = '') {
  const value = ref(localStorage.getItem(key) ?? defaultValue);

  const save = (next) => {
    value.value = next;
    localStorage.setItem(key, next);
  };

  const remove = () => {
    value.value = defaultValue;
    localStorage.removeItem(key);
  };

  return { value, save, remove };
}
