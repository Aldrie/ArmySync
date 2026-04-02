export async function extractWaveform(
  videoSrc: string,
  barCount: number = 512,
): Promise<Float32Array> {
  const response = await fetch(videoSrc);
  const arrayBuffer = await response.arrayBuffer();

  const audioCtx = new AudioContext();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();

  const channelData = audioBuffer.getChannelData(0);
  const samplesPerBar = Math.floor(channelData.length / barCount);
  const waveform = new Float32Array(barCount);

  for (let i = 0; i < barCount; i++) {
    const start = i * samplesPerBar;
    const end = Math.min(start + samplesPerBar, channelData.length);

    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += channelData[j] * channelData[j];
    }

    waveform[i] = Math.sqrt(sum / (end - start));
  }

  const max = waveform.reduce((a, b) => Math.max(a, b), 0);
  if (max > 0) {
    for (let i = 0; i < barCount; i++) {
      waveform[i] /= max;
    }
  }

  return waveform;
}
