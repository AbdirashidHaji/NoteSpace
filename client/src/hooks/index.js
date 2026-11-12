import { useEffect, useState } from 'react';

/** Debounce any fast-changing value (used for instant search + autosave). */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** State synced with localStorage (JSON-safe values). */
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

/**
 * Global keyboard shortcuts.
 * handlers: { 'mod+k': fn, ... }  where mod = Ctrl (Win) / Cmd (Mac).
 */
export function useHotkeys(handlers, deps) {
  useEffect(() => {
    const onKeyDown = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      for (const [combo, handler] of Object.entries(handlers)) {
        const parts = combo.toLowerCase().split('+');
        const needMod = parts.includes('mod');
        const needShift = parts.includes('shift');
        const key = parts[parts.length - 1];
        if (needMod === mod && (!needShift || e.shiftKey) && e.key.toLowerCase() === key) {
          e.preventDefault();
          handler(e);
          return;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Warn the user before leaving with unsaved changes. */
export function useUnloadWarning(active) {
  useEffect(() => {
    if (!active) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [active]);
}
