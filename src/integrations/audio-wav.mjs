import { analyzeAudioSamples } from '../analysis/audio-signal.mjs';

const DEFAULT_MAX_BYTES = 64 * 1024 * 1024;

function readAscii(view, offset, length) {
  let value = '';
  for (let i = 0; i < length; i++) value += String.fromCharCode(view.getUint8(offset + i));
  return value;
}

/** Decode uncompressed RIFF/WAVE PCM (integer PCM or IEEE float) into normalized interleaved samples. */
export function decodeWavPcm(input, { maxBytes = DEFAULT_MAX_BYTES } = {}) {
  const bytes = input instanceof Uint8Array
    ? input
    : input instanceof ArrayBuffer
      ? new Uint8Array(input)
      : null;
  if (!bytes) throw new TypeError('input must be a Uint8Array or ArrayBuffer');
  if (!Number.isInteger(maxBytes) || maxBytes < 44) throw new TypeError('maxBytes must be an integer >= 44');
  if (bytes.byteLength > maxBytes) throw new Error(`WAV exceeds maximum allowed size of ${maxBytes} bytes`);
  if (bytes.byteLength < 44) throw new Error('WAV file is too short');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (readAscii(view, 0, 4) !== 'RIFF' || readAscii(view, 8, 4) !== 'WAVE') {
    throw new Error('Only little-endian RIFF/WAVE files are supported');
  }

  let format = null;
  const dataChunks = [];
  for (let offset = 12; offset + 8 <= bytes.byteLength;) {
    const id = readAscii(view, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const start = offset + 8;
    const end = start + size;
    if (end > bytes.byteLength) throw new Error(`WAV chunk ${id} exceeds file bounds`);
    if (id === 'fmt ') {
      if (size < 16) throw new Error('WAV fmt chunk is incomplete');
      format = {
        code: view.getUint16(start, true),
        channels: view.getUint16(start + 2, true),
        sampleRate: view.getUint32(start + 4, true),
        byteRate: view.getUint32(start + 8, true),
        blockAlign: view.getUint16(start + 12, true),
        bitsPerSample: view.getUint16(start + 14, true),
      };
      if (format.code === 0xfffe && size >= 40) format.code = view.getUint16(start + 24, true);
    } else if (id === 'data') {
      dataChunks.push(bytes.subarray(start, end));
    }
    offset = end + (size % 2);
  }
  if (!format || !dataChunks.length) throw new Error('WAV must contain fmt and data chunks');
  if (![1, 3].includes(format.code)) throw new Error(`Unsupported WAV encoding code: ${format.code}`);
  if (!Number.isInteger(format.channels) || format.channels < 1 || format.channels > 32) throw new Error('WAV channel count must be between 1 and 32');
  if (!Number.isInteger(format.sampleRate) || format.sampleRate < 1) throw new Error('WAV sample rate is invalid');
  const float = format.code === 3;
  const validBits = float ? [32, 64] : [8, 16, 24, 32];
  if (!validBits.includes(format.bitsPerSample)) throw new Error(`Unsupported WAV bit depth: ${format.bitsPerSample}`);
  const bytesPerSample = format.bitsPerSample / 8;
  if (format.blockAlign !== format.channels * bytesPerSample) throw new Error('WAV block alignment is inconsistent with channels and bit depth');
  const dataLength = dataChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  if (!dataLength || dataLength % format.blockAlign !== 0) throw new Error('WAV audio data is empty or ends with a partial sample frame');

  const samples = new Float32Array(dataLength / bytesPerSample);
  let output = 0;
  for (const chunk of dataChunks) {
    const chunkView = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    for (let offset = 0; offset < chunk.byteLength; offset += bytesPerSample) {
      let value;
      if (float) value = format.bitsPerSample === 32 ? chunkView.getFloat32(offset, true) : chunkView.getFloat64(offset, true);
      else if (format.bitsPerSample === 8) value = (chunkView.getUint8(offset) - 128) / 128;
      else if (format.bitsPerSample === 16) value = chunkView.getInt16(offset, true) / 32768;
      else if (format.bitsPerSample === 24) {
        let raw = chunkView.getUint8(offset) | (chunkView.getUint8(offset + 1) << 8) | (chunkView.getUint8(offset + 2) << 16);
        if (raw & 0x800000) raw -= 0x1000000;
        value = raw / 8388608;
      } else value = chunkView.getInt32(offset, true) / 2147483648;
      if (!Number.isFinite(value)) throw new Error('WAV contains non-finite floating-point samples');
      samples[output++] = Math.max(-1, Math.min(1, value));
    }
  }
  return {
    samples,
    sampleRate: format.sampleRate,
    channels: format.channels,
    bitsPerSample: format.bitsPerSample,
    encoding: float ? 'ieee-float' : 'pcm-integer',
    frameCount: samples.length / format.channels,
    durationSeconds: samples.length / format.channels / format.sampleRate,
  };
}

export function analyzeWavBuffer(input, options = {}) {
  const decoded = decodeWavPcm(input, options);
  const analysis = analyzeAudioSamples({
    samples: decoded.samples,
    sampleRate: decoded.sampleRate,
    channels: decoded.channels,
    frameSize: options.frameSize,
  });
  return {
    audio_metadata: {
      sample_rate_hz: decoded.sampleRate,
      channels: decoded.channels,
      bits_per_sample: decoded.bitsPerSample,
      encoding: decoded.encoding,
      duration_seconds: decoded.durationSeconds,
      sample_count_per_channel: decoded.frameCount,
      container: 'RIFF/WAVE',
    },
    analysis,
  };
}

function validatePublicAudioUrl(value, allowedHosts) {
  let url;
  try { url = new URL(value); } catch { throw new TypeError('audioUrl must be a valid absolute URL'); }
  if (url.protocol !== 'https:') throw new Error('Audio download requires HTTPS; HTTP URLs are rejected');
  if (url.username || url.password) throw new Error('Audio URL must not contain embedded credentials');
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')
      || host === '::1' || /^127\./.test(host) || /^10\./.test(host)
      || /^192\.168\./.test(host) || /^169\.254\./.test(host)
      || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    throw new Error('Private or local audio hosts are not allowed');
  }
  if (allowedHosts && (!Array.isArray(allowedHosts) || !allowedHosts.some(item => String(item).toLowerCase() === host))) {
    throw new Error('Audio host is not in allowedHosts');
  }
  return url;
}

/** Fetch and analyze a direct HTTPS WAV URL with redirect rejection and a strict byte limit. */
export async function fetchAndAnalyzeWav(audioUrl, {
  fetchImpl = globalThis.fetch,
  allowedHosts,
  maxBytes = DEFAULT_MAX_BYTES,
  frameSize,
} = {}) {
  const url = validatePublicAudioUrl(audioUrl, allowedHosts);
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');
  if (!Number.isInteger(maxBytes) || maxBytes < 44) throw new TypeError('maxBytes must be an integer >= 44');
  const response = await fetchImpl(url.href, { method: 'GET', redirect: 'error' });
  if (!response?.ok) throw new Error(`Audio download failed: HTTP ${response?.status ?? 'unknown'}`);
  const declaredLength = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new Error(`Audio exceeds maximum allowed size of ${maxBytes} bytes`);
  if (!response.body?.getReader) {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maxBytes) throw new Error(`Audio exceeds maximum allowed size of ${maxBytes} bytes`);
    return analyzeWavBuffer(buffer, { maxBytes, frameSize });
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error(`Audio exceeds maximum allowed size of ${maxBytes} bytes`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock?.();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return analyzeWavBuffer(bytes, { maxBytes, frameSize });
}

/** Adapter matching runSunoReconstructionWorkflow's analyzeGeneratedAudio callback signature. */
export function createWavAudioAnalyzer(options = {}) {
  return async ({ audioUrl }) => fetchAndAnalyzeWav(audioUrl, options);
}
