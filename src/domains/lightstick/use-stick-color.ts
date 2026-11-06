import type { RefObject } from 'react';
import { useLayoutEffect } from 'react';

import { listen } from '@tauri-apps/api/event';

export function useStickColor(ref: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    ref.current?.style.setProperty('--ls-c', '#ffffff');

    const unlisten = listen<{ color: string }>('color-update', (event) => {
      ref.current?.style.setProperty('--ls-c', event.payload.color);
    });

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [ref]);
}
