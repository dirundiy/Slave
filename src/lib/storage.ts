import { useEffect, useState } from 'react';

const PREFIX = 'slaveaway:';

// Ask the browser not to clear this site's data when space runs low.
void navigator.storage?.persist?.().catch(() => false);

export const store = {
  get<T>(key: string): T | undefined {
    try {
      const v = localStorage.getItem(PREFIX + key);
      return v == null ? undefined : (JSON.parse(v) as T);
    } catch {
      return undefined;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* storage full or blocked; state still works for this visit */
    }
  }
};

// Browser-only persistence for now. Swaps to the account database once Google sign-in lands.
export function usePersist<T>(key: string, init: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    const saved = store.get<T>(key);
    if (saved !== undefined) return saved;
    return typeof init === 'function' ? (init as () => T)() : init;
  });
  useEffect(() => store.set(key, value), [key, value]);
  return [value, setValue] as const;
}
