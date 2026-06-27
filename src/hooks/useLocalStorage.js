import { useState, useCallback } from 'react';

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value) => {
      // Use the functional form of setStoredValue so we don't need `storedValue`
      // in deps (which would create a new `setValue` reference on every render).
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch { /* quota exceeded */ }
        return valueToStore;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}