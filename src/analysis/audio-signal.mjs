const EPSILON = 1e-12;
const DEFAULT_FRAME_SIZE = 1024;

function dbfs(amplitude) {
  return amplitude <= EPSILON ? -120 : Number((20 * Math.log10(amplitude)).toFixed(3));
}

function normalizeChannels(input, channels) {
  if (!Array.isArray(input) && !ArrayBuffer.isView(input)) throw new TypeError('samples must be an array or typed array');
  if (Array.isArray(input) && input.length && Array.isArray(input[0])) {
    const count = input.length;
    const width = input[0].length;
    if (!width || input.some(frame => !Array.isArray(frame) || frame.length !== width)) throw new Error('multichannel samples must have a consistent channel count per frame');
    const result = Array.from({ length: width }, (_, channel) => input.map(frame => Number(frame[channel])));
    if (result.some(channel => !channel.every(Number.isFinite))) throw new Error('samples must contain only finite numbers');
    return result;
  }
  const values = Array.from(input, Number);
  if (!values.length) throw new Error('samples must not be empty');
  if (!values.every(Number.isFinite)) throw new Error('samples must contain only finite numbers');
  if (!Number.isInteger(channels) || channels < 1 || channels > 32) throw new Error('channels must be an integer between 1 and 32 for interleaved samples');
  if (values.length % channels !== 0) throw new Error('interleaved sample count must be divisible by channels');
  return Array.from({ length: channels }, (_, channel) => values.filter((_, i) => i % channels === channel));
}

function fftRealPower(frame) {
  const n = frame.length;
  const real = [...frame];
  const imag = new Array(n).fill(0);
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const angle = -2 * Math.PI / size;
    const wr0 = Math.cos(angle), wi0 = Math.sin(angle);
    for (let start = 0; start < n; start += size) {
      let wr = 1, wi = 0;
      for (let j = 0; j < size / 2; j++) {
        const even = start + j, odd = even + size / 2;
        const tr = wr * real[odd] - wi * imag[odd];
        const ti = wr * imag[odd] + wi * real[odd];
        real[odd] = real[even] - tr;
        imag[odd] = imag[even] - ti;
        real[even] += tr;
        imag[even] += ti;
        const nextWr = wr * wr0 - wi * wi0;
        wi = wr * wi0 + wi * wr0;
        wr = nextWr;
      }
    }
  }
  return Array.from({ length: n / 2 + 1 }, (_, i) => real[i] ** 2 + imag[i] ** 2);
}

function spectralFeatures(mono, sampleRate, frameSize) {
  const n = Math.min(frameSize, 2 ** Math.floor(Math.log2(mono.length)));
  if (n < 32) return { centroid_hz: null, rolloff_85_hz: null, flatness: null, low_mid_high_energy: null };
  const hop = Math.max(1, Math.floor(n / 2));
  const centroids = [], rolloffs = [], flatnesses = [];
  const bands = { low: 0, mid: 0, high: 0 };
  let bandTotal = 0;
  for (let start = 0; start + n <= mono.length; start += hop) {
    const frame = mono.slice(start, start + n);
    let mean = 0;
    for (const value of frame) mean += value;
    mean /= n;
    const windowed = frame.map((value, i) => (value - mean) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1))));
    const power = fftRealPower(windowed);
    const total = power.reduce((a, b) => a + b, 0);
    if (total <= EPSILON) continue;
    let weighted = 0, cumulative = 0, rolloff = null, logSum = 0, positiveCount = 0;
    power.forEach((p, i) => {
      const hz = i * sampleRate / n;
      weighted += hz * p;
      cumulative += p;
      if (rolloff === null && cumulative >= total * 0.85) rolloff = hz;
      if (p > EPSILON) { logSum += Math.log(p); positiveCount++; }
      const key = hz < 250 ? 'low' : hz < 4000 ? 'mid' : 'high';
      bands[key] += p;
    });
    bandTotal += total;
    centroids.push(weighted / total);
    rolloffs.push(rolloff ?? sampleRate / 2);
    flatnesses.push(positiveCount ? Math.exp(logSum / positiveCount) / (total / power.length) : 0);
  }
  const avg = xs => xs.length ? Number((xs.reduce((a,b)=>a+b,0) / xs.length).toFixed(3)) : null;
  return {
    centroid_hz: avg(centroids),
    rolloff_85_hz: avg(rolloffs),
    flatness: flatnesses.length ? Number((avg(flatnesses)).toFixed(6)) : null,
    low_mid_high_energy: bandTotal ? Object.fromEntries(Object.entries(bands).map(([k,v]) => [k, Number((v / bandTotal).toFixed(6))])) : null,
  };
}

/**
 * Analyze already-decoded, normalized PCM samples. This function does not read
 * files or decode WAV/MP3/other containers. Samples should be floats in [-1, 1].
 */
export function analyzeAudioSamples({ samples, sampleRate, channels = 1, frameSize = DEFAULT_FRAME_SIZE } = {}) {
  if (!Number.isFinite(sampleRate) || sampleRate < 1) throw new Error('sampleRate must be a positive number');
  if (!Number.isInteger(frameSize) || frameSize < 32 || (frameSize & (frameSize - 1)) !== 0) throw new Error('frameSize must be a power of two >= 32');
  const channelSamples = normalizeChannels(samples, channels);
  const frameCount = channelSamples[0].length;
  if (!frameCount || channelSamples.some(channel => channel.length !== frameCount)) throw new Error('all channels must contain the same positive number of samples');
  let peak = 0;
  for (const channel of channelSamples) for (const value of channel) peak = Math.max(peak, Math.abs(value));
  const squareSum = channelSamples.reduce((sum, channel) => sum + channel.reduce((s, v) => s + v * v, 0), 0);
  const rms = Math.sqrt(squareSum / (frameCount * channelSamples.length));
  const mono = Array.from({ length: frameCount }, (_, i) => channelSamples.reduce((sum, channel) => sum + channel[i], 0) / channelSamples.length);
  const frameLength = Math.max(1, Math.floor(sampleRate * 0.1));
  const energyCurve = [];
  for (let start = 0; start < frameCount; start += frameLength) {
    const end = Math.min(frameCount, start + frameLength);
    let sum = 0;
    for (let i = start; i < end; i++) sum += mono[i] ** 2;
    energyCurve.push({ start_seconds: Number((start / sampleRate).toFixed(3)), end_seconds: Number((end / sampleRate).toFixed(3)), rms: Number(Math.sqrt(sum / (end - start)).toFixed(6)), rms_dbfs: dbfs(Math.sqrt(sum / (end - start))) });
  }
  let stereo = null;
  if (channelSamples.length >= 2) {
    const left = channelSamples[0], right = channelSamples[1];
    let cross = 0, leftPower = 0, rightPower = 0, sidePower = 0, midPower = 0;
    for (let i = 0; i < frameCount; i++) {
      cross += left[i] * right[i];
      leftPower += left[i] ** 2;
      rightPower += right[i] ** 2;
      midPower += ((left[i] + right[i]) / 2) ** 2;
      sidePower += ((left[i] - right[i]) / 2) ** 2;
    }
    stereo = {
      correlation: leftPower && rightPower ? Number((cross / Math.sqrt(leftPower * rightPower)).toFixed(6)) : null,
      side_to_mid_db: dbfs(Math.sqrt(sidePower / frameCount)) - dbfs(Math.sqrt(midPower / frameCount)),
      channel_count: channelSamples.length,
    };
  }
  return {
    method: 'normalized PCM sample analysis; peak/RMS in dBFS; spectral descriptors from windowed FFT',
    duration_seconds: Number((frameCount / sampleRate).toFixed(6)),
    sample_rate_hz: sampleRate,
    channels: channelSamples.length,
    sample_count_per_channel: frameCount,
    peak_amplitude: Number(peak.toFixed(6)),
    peak_dbfs: dbfs(peak),
    rms_amplitude: Number(rms.toFixed(6)),
    rms_dbfs: dbfs(rms),
    crest_factor_db: Number((dbfs(peak) - dbfs(rms)).toFixed(3)),
    energy_curve: energyCurve,
    spectrum: spectralFeatures(mono, sampleRate, frameSize),
    stereo,
    limitations: [
      'Input must already be decoded to normalized PCM samples; file/container reading and decoding are not included.',
      'RMS/peak dBFS are not standards-compliant integrated loudness (LUFS) or true peak (dBTP).',
      'Spectral descriptors are estimates from finite windows and do not identify instruments or production techniques by themselves.',
      ...(channelSamples.length < 2 ? ['Stereo properties were not assessed because fewer than two channels were supplied.'] : []),
    ],
  };
}
