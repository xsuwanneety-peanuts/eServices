import { useEffect, useState } from 'react';

// Data is saved in this browser's localStorage. Bump the version when the saved shape changes
// so old data is ignored instead of breaking the app.
const STORAGE_PREFIX = 'eservice:v1:';

const readStored = <T,>(key: string, fallback: T, isValid: (value: unknown) => boolean): T => {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? (parsed as T) : fallback;
  } catch {
    // Storage blocked (private mode, disabled site data) or corrupt JSON: use the defaults
    return fallback;
  }
};

/**
 * useState that is restored from and saved to this browser's localStorage, so the value
 * survives page refreshes. `isValid` guards against data saved by an older version of the app.
 */
export const usePersistentState = <T,>(
  key: string,
  initialValue: T,
  isValid: (value: unknown) => boolean = () => true
) => {
  const [value, setValue] = useState<T>(() => readStored(key, initialValue, isValid));

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch {
      // Storage full or blocked: keep working in memory only
    }
  }, [key, value]);

  return [value, setValue] as const;
};

export const isArray = (value: unknown): boolean => Array.isArray(value);
export const isString = (value: unknown): boolean => typeof value === 'string';

/** Remove every value this app saved in this browser. */
export const clearPersistentState = () => {
  try {
    Object.keys(window.localStorage)
      .filter(key => key.startsWith(STORAGE_PREFIX))
      .forEach(key => window.localStorage.removeItem(key));
  } catch {
    // Nothing to clear when storage is unavailable
  }
};
