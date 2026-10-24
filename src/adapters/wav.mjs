import { readFile } from 'node:fs/promises';

function readAscii(view, offset, length) {
  return String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + offset, length));
}

export async function inspectWav(target) {
  const buffer = await readFile(target);
  if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Target is not a RIFF/WAVE file');
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let offset = 12;
  let format = null;
  let data = null;

  while (offset + 8 <= view.byteLength) {
    const id = readAscii(view, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (id === 'fmt ') {
      format = {
        audio_format: view.getUint16(start, true),
        channels: view.getUint16(start + 2, true),
        sample_rate: view.getUint32(start + 4, true),
        byte_rate: view.getUint32(start + 8, true),
        block_align: view.getUint16(start + 12, true),
        bits_per_sample: view.getUint16(start + 14, true),
      };
    } else if (id === 'data') {
      data = { offset: start, size };
    }
    offset = start + size + (size % 2);
  }

  if (!format || !data) throw new Error('WAV is missing fmt or data chunk');
  const duration = data.size / format.byte_rate;

  return {
    path: target,
    format,
    data_bytes: data.size,
    duration,
    codec: format.audio_format === 1 ? 'PCM' : `WAV format ${format.audio_format}`,
  };
}

export async function extractWavFeatures(target) {
  const artifact = await inspectWav(target);
  return {
    sample_rate: artifact.format.sample_rate,
    channels: artifact.format.channels,
    duration: artifact.duration,
    bits_per_sample: artifact.format.bits_per_sample,
  };
}
