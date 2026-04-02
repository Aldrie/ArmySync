import { invoke } from '@tauri-apps/api/core';

export async function extractWaveform(
  path: string,
  barCount: number = 512,
): Promise<Float32Array> {
  const data = await invoke<number[]>('extract_waveform', {
    path,
    barCount,
  });

  return new Float32Array(data);
}
