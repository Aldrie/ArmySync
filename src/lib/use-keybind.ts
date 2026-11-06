import { useEffect, useRef } from 'react';

type KeyCombo = string;
type KeyHandler = (event: KeyboardEvent) => void;
type KeyMap = Record<KeyCombo, KeyHandler>;

export function useKeybind(keyMap: KeyMap, { allowRange = false } = {}) {
  const mapRef = useRef(keyMap);

  useEffect(() => {
    mapRef.current = keyMap;
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'TEXTAREA' ||
        (target instanceof HTMLInputElement &&
          !(allowRange && target.type === 'range'))
      )
        return;

      const handler = mapRef.current[event.code];
      if (handler) {
        event.preventDefault();
        handler(event);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allowRange]);
}
