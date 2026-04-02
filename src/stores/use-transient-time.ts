import { useEffect, useRef } from 'react';

import { useEditorStore } from './editor-store';

export function useTransientTime(callback: (time: number) => void) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    let prev = useEditorStore.getState().currentTime;
    const unsub = useEditorStore.subscribe((state) => {
      if (state.currentTime !== prev) {
        prev = state.currentTime;
        callbackRef.current(state.currentTime);
      }
    });
    return unsub;
  }, []);
}
