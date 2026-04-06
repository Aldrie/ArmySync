use std::fs::File;

use symphonia::core::audio::SampleBuffer;
use symphonia::core::codecs::DecoderOptions;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;

pub fn extract(path: &str, bar_count: u32) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
  let file = File::open(path)?;
  let mss = MediaSourceStream::new(Box::new(file), Default::default());

  let mut hint = Hint::new();
  if let Some(ext) = std::path::Path::new(path)
    .extension()
    .and_then(|e| e.to_str())
  {
    hint.with_extension(ext);
  }

  let probed = symphonia::default::get_probe().format(
    &hint,
    mss,
    &FormatOptions::default(),
    &MetadataOptions::default(),
  )?;

  let mut format = probed.format;

  let track = format
    .tracks()
    .iter()
    .find(|t| t.codec_params.codec != symphonia::core::codecs::CODEC_TYPE_NULL)
    .ok_or("no audio track found")?;

  let track_id = track.id;
  let mut decoder =
    symphonia::default::get_codecs().make(&track.codec_params, &DecoderOptions::default())?;

  let mut samples: Vec<f32> = Vec::new();

  loop {
    let packet = match format.next_packet() {
      Ok(p) => p,
      Err(symphonia::core::errors::Error::IoError(ref e))
        if e.kind() == std::io::ErrorKind::UnexpectedEof =>
      {
        break;
      }
      Err(_) => break,
    };

    if packet.track_id() != track_id {
      continue;
    }

    let decoded = match decoder.decode(&packet) {
      Ok(d) => d,
      Err(_) => continue,
    };

    let spec = *decoded.spec();
    let num_samples = decoded.capacity();

    if num_samples == 0 {
      continue;
    }

    let mut sample_buf = SampleBuffer::<f32>::new(num_samples as u64, spec);
    sample_buf.copy_interleaved_ref(decoded);

    let channels = spec.channels.count().max(1);
    let raw = sample_buf.samples();

    for chunk in raw.chunks(channels) {
      let mono: f32 = chunk.iter().sum::<f32>() / channels as f32;
      samples.push(mono);
    }
  }

  if samples.is_empty() {
    return Ok(vec![0.0; bar_count as usize]);
  }

  let bar_count = bar_count as usize;
  let samples_per_bar = samples.len() / bar_count;
  let mut waveform = Vec::with_capacity(bar_count);

  for i in 0..bar_count {
    let start = i * samples_per_bar;
    let end = ((i + 1) * samples_per_bar).min(samples.len());

    let mut sum = 0.0_f64;
    for &s in &samples[start..end] {
      sum += (s as f64) * (s as f64);
    }

    let rms = (sum / (end - start) as f64).sqrt() as f32;
    waveform.push(rms);
  }

  let max = waveform.iter().cloned().fold(0.0_f32, f32::max);
  if max > 0.0 {
    for v in &mut waveform {
      *v /= max;
    }
  }

  Ok(waveform)
}
