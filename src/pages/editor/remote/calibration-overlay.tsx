import { useEffect, useState } from 'react';

import { listen } from '@tauri-apps/api/event';

const FLASH_MS = 80;
const BEEP_S = 0.03;
const BEEP_HZ = 1000;

export default function CalibrationOverlay() {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let audio: AudioContext | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const beep = () => {
      audio ??= new AudioContext();
      void audio.resume();
      const osc = audio.createOscillator();
      osc.frequency.value = BEEP_HZ;
      osc.connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + BEEP_S);
    };

    const unlisten = listen<{ mode: 'sound' | 'image' }>(
      'remote-calibration-tick',
      (event) => {
        if (event.payload.mode === 'sound') {
          beep();
          return;
        }
        setFlash(true);
        clearTimeout(timer);
        timer = setTimeout(() => setFlash(false), FLASH_MS);
      },
    );

    return () => {
      clearTimeout(timer);
      void unlisten.then((fn) => fn());
      void audio?.close();
    };
  }, []);

  return flash ? (
    <div className="pointer-events-none fixed inset-0 z-60 bg-white" />
  ) : null;
}
