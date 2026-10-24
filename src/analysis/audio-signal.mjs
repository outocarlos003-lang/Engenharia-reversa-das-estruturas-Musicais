const EPSILON = 1e-12;
const DEFAULT_FRAME_SIZE = 1024;

function dbfs(amplitude) {
  return amplitude <= EPSILON ? -120 : Number((20 * Math.log10(amplitude)).toFixed(3));
}

function detectEnergyTransitions(energyCurve) {
  const binSeconds = 1;
  const bins = [];
  for (let start = 0; start < energyCurve.length;) {
    const first = energyCurve[start];
    const binStart = first.start_seconds;
    let weightedSquares = 0, duration = 0;
    while (start < energyCurve.length && energyCurve[start].start_seconds < binStart + binSeconds) {
      const point = energyCurve[start++];
      const span = Math.max(0, point.end_seconds - point.start_seconds);
      weightedSquares += point.rms ** 2 * span;
      duration += span;
    }
    const rms = duration ? Math.sqrt(weightedSquares / duration) : 0;
    bins.push({ time_seconds: Number((binStart + duration / 2).toFixed(3)), rms, rms_dbfs: dbfs(rms) });
  }
  const raw = [];
  for (let i = 1; i < bins.length; i++) {
    const delta = bins[i].rms_dbfs - bins[i - 1].rms_dbfs;
    if (Math.abs(delta) < 5) continue;
    const neighboringChanges = [];
    for (let j = Math.max(1, i - 2); j <= Math.min(bins.length - 1, i + 2); j++) {
      neighboringChanges.push(Math.abs(bins[j].rms_dbfs - bins[j - 1].rms_dbfs));
    }
    if (Math.abs(delta) < Math.max(...neighboringChanges)) continue;
    raw.push({
      time_seconds: Number(((bins[i - 1].time_seconds + bins[i].time_seconds) / 2).toFixed(3)),
      change_db: Number(delta.toFixed(3)),
      before_rms_dbfs: bins[i - 1].rms_dbfs,
      after_rms_dbfs: bins[i].rms_dbfs,
      confidence: Number(Math.min(0.9, 0.35 + (Math.abs(delta) - 5) / 20).toFixed(2)),
      status: 'candidate_transition',
      method: 'adjacent 1-second RMS bins; local-maximum change threshold of 5 dB',
    });
  }
  const separated = [];
  for (const candidate of raw) {
    if (separated.length && candidate.time_seconds - separated[separated.length - 1].time_seconds < 2) {
      if (Math.abs(candidate.change_db) > Math.abs(separated[separated.length - 1].change_db)) separated[separated.length - 1] = candidate;
    } else separated.push(candidate);
  }
  return separated;
}

function combineTransitionCandidates(energyCandidates, spectralCandidates) {
  const all = [
    ...energyCandidates.map(candidate => ({ ...candidate, evidence_types: ['energy'] })),
    ...spectralCandidates.map(candidate => ({ ...candidate, evidence_types: ['spectrum'] })),
  ].sort((a, b) => a.time_seconds - b.time_seconds);
  const combined = [];
  for (const candidate of all) {
    const previous = combined[combined.length - 1];
    if (previous && Math.abs(candidate.time_seconds - previous.time_seconds) <= 1) {
      previous.evidence_types = [...new Set([...previous.evidence_types, ...candidate.evidence_types])];
      previous.time_seconds = Number(((previous.time_seconds + candidate.time_seconds) / 2).toFixed(3));
      previous.status = 'candidate_transition';
      previous.supporting_candidates.push(candidate);
      if (previous.evidence_types.length > 1) previous.interpretation = 'Energy and spectral changes coincide; still not a confirmed musical section boundary.';
    } else {
      combined.push({
        time_seconds: candidate.time_seconds,
        status: 'candidate_transition',
        evidence_types: candidate.evidence_types,
        supporting_candidates: [candidate],
        interpretation: 'Acoustic transition candidate only; no verse/chorus/bridge label is inferred.',
      });
    }
  }
  return combined;
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

function spectralEvolution(mono, sampleRate, frameSize) {
  const n = Math.min(frameSize, 2 ** Math.floor(Math.log2(mono.length)));
  if (n < 32) return { curve: [], candidates: [] };
  const hop = Math.max(1, Math.floor(n / 2));
  const windowSeconds = 1;
  const framesPerWindow = Math.max(1, Math.floor(sampleRate * windowSeconds / hop));
  const frames = [];
  for (let start = 0; start + n <= mono.length; start += hop) {
    const frame = mono.slice(start, start + n);
    const mean = frame.reduce((sum, value) => sum + value, 0) / n;
    const windowed = frame.map((value, i) => (value - mean) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1))));
    const power = fftRealPower(windowed);
    const total = power.reduce((sum, value) => sum + value, 0);
    if (total <= EPSILON) {
      frames.push({ time_seconds: start / sampleRate, centroid_hz: null, bands: null });
      continue;
    }
    let weighted = 0;
    const bands = { low: 0, mid: 0, high: 0 };
    power.forEach((value, bin) => {
      const hz = bin * sampleRate / n;
      weighted += hz * value;
      bands[hz < 250 ? 'low' : hz < 4000 ? 'mid' : 'high'] += value;
    });
    frames.push({
      time_seconds: start / sampleRate,
      centroid_hz: weighted / total,
      bands: Object.fromEntries(Object.entries(bands).map(([key, value]) => [key, value / total])),
    });
  }
  const curve = [];
  for (let start = 0; start < frames.length; start += framesPerWindow) {
    const group = frames.slice(start, start + framesPerWindow).filter(frame => frame.centroid_hz !== null);
    if (!group.length) continue;
    const bands = { low: 0, mid: 0, high: 0 };
    for (const frame of group) for (const key of Object.keys(bands)) bands[key] += frame.bands[key];
    curve.push({
      start_seconds: Number(frames[start].time_seconds.toFixed(3)),
      end_seconds: Number(Math.min(mono.length / sampleRate, frames[Math.min(frames.length - 1, start + framesPerWindow - 1)].time_seconds + n / sampleRate).toFixed(3)),
      centroid_hz: Number((group.reduce((sum, frame) => sum + frame.centroid_hz, 0) / group.length).toFixed(2)),
      low_mid_high_energy: Object.fromEntries(Object.entries(bands).map(([key, value]) => [key, Number((value / group.length).toFixed(4))])),
    });
  }
  const candidates = [];
  for (let i = 1; i < curve.length; i++) {
    const previous = curve[i - 1], current = curve[i];
    const centroidChange = previous.centroid_hz > 0 ? (current.centroid_hz - previous.centroid_hz) / previous.centroid_hz : 0;
    const bandChange = Object.keys(current.low_mid_high_energy).reduce((sum, key) => sum + Math.abs(current.low_mid_high_energy[key] - previous.low_mid_high_energy[key]), 0) / 2;
    if (Math.abs(centroidChange) < 0.25 && bandChange < 0.2) continue;
    candidates.push({
      time_seconds: Number(((previous.end_seconds + current.start_seconds) / 2).toFixed(3)),
      centroid_change_percent: Number((centroidChange * 100).toFixed(1)),
      band_distribution_change: Number(bandChange.toFixed(3)),
      status: 'candidate_spectral_transition',
      method: 'adjacent 1-second spectral summaries; centroid change >=25% or band-distribution change >=0.20',
      limitations: ['Spectral change may reflect a timbral event, instrument entry, transient or noise rather than a formal section boundary.'],
    });
  }
  return { curve, candidates };
}

function analyzeSpectralNovelty(curve) {
  const vectorFor = point => {
    const bands = point.low_mid_high_energy;
    return [point.centroid_hz, bands.low * 4000, bands.mid * 4000, bands.high * 4000];
  };
  const cosine = (a, b) => {
    const dot = a.reduce((sum, value, i) => sum + value * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
    const normB = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));
    return normA && normB ? dot / (normA * normB) : 0;
  };
  const vectors = curve.map(vectorFor);
  const novelty = [];
  for (let i = 1; i < curve.length; i++) {
    const distance = 1 - cosine(vectors[i - 1], vectors[i]);
    novelty.push({
      time_seconds: Number(((curve[i - 1].end_seconds + curve[i].start_seconds) / 2).toFixed(3)),
      novelty: Number(distance.toFixed(4)),
    });
  }
  const peaks = novelty.filter((point, i) => point.novelty >= 0.12
    && point.novelty >= (novelty[i - 1]?.novelty ?? -Infinity)
    && point.novelty >= (novelty[i + 1]?.novelty ?? -Infinity));
  const stride = Math.max(1, Math.ceil(curve.length / 600));
  const sampled = curve.map((point, index) => ({ point, vector: vectors[index], index })).filter(item => item.index % stride === 0);
  const repeats = [];
  for (let a = 0; a < sampled.length; a++) {
    for (let b = a + 3; b < sampled.length; b++) {
      const similarity = cosine(sampled[a].vector, sampled[b].vector);
      if (similarity < 0.98) continue;
      repeats.push({
        first_window: { start_seconds: sampled[a].point.start_seconds, end_seconds: sampled[a].point.end_seconds },
        second_window: { start_seconds: sampled[b].point.start_seconds, end_seconds: sampled[b].point.end_seconds },
        similarity: Number(similarity.toFixed(4)),
        status: 'candidate_spectral_recurrence',
        method: 'cosine similarity of 1-second spectral summary vectors; threshold >= 0.98',
        limitations: ['Spectral similarity does not establish melodic, rhythmic or harmonic identity; different musical material may have similar timbre.'],
      });
    }
  }
  const sequenceRecurrences = [];
  const sequenceLength = 3;
  for (let a = 0; a + sequenceLength <= sampled.length; a++) {
    for (let b = a + sequenceLength * 2; b + sequenceLength <= sampled.length; b++) {
      let totalSimilarity = 0;
      for (let offset = 0; offset < sequenceLength; offset++) {
        totalSimilarity += cosine(sampled[a + offset].vector, sampled[b + offset].vector);
      }
      const similarity = totalSimilarity / sequenceLength;
      if (similarity < 0.97) continue;
      sequenceRecurrences.push({
        first_sequence: { start_seconds: sampled[a].point.start_seconds, end_seconds: sampled[a + sequenceLength - 1].point.end_seconds },
        second_sequence: { start_seconds: sampled[b].point.start_seconds, end_seconds: sampled[b + sequenceLength - 1].point.end_seconds },
        window_count: sequenceLength,
        similarity: Number(similarity.toFixed(4)),
        status: 'candidate_spectral_sequence_recurrence',
        method: 'mean cosine similarity of three aligned spectral-summary windows; threshold >= 0.97',
        limitations: ['A recurring sequence of spectral profiles is not proof of a repeated musical passage; pitch, rhythm, harmony and source separation are not modeled.'],
      });
    }
  }
  return {
    novelty_curve: novelty,
    novelty_candidates: peaks.map(point => ({ ...point, status: 'candidate_spectral_novelty', method: 'local maximum of adjacent-window cosine distance; threshold >= 0.12' })),
    recurrence_candidates: repeats,
    sequence_recurrence_candidates: sequenceRecurrences,
  };
}

function estimateFundamentalFrequencyTrack(mono, sampleRate) {
  const frameSeconds = 0.04;
  const hopSeconds = 0.01;
  const frameSize = Math.max(64, Math.floor(sampleRate * frameSeconds));
  const hopSize = Math.max(1, Math.floor(sampleRate * hopSeconds));
  const minFrequency = 70;
  const maxFrequency = Math.min(1000, sampleRate / 2);
  if (mono.length < frameSize || maxFrequency <= minFrequency) return [];
  const minLag = Math.max(1, Math.floor(sampleRate / maxFrequency));
  const maxLag = Math.min(frameSize - 2, Math.ceil(sampleRate / minFrequency));
  const track = [];
  for (let start = 0; start + frameSize <= mono.length; start += hopSize) {
    const frame = mono.slice(start, start + frameSize);
    const mean = frame.reduce((sum, value) => sum + value, 0) / frameSize;
    for (let i = 0; i < frame.length; i++) frame[i] -= mean;
    const energy = frame.reduce((sum, value) => sum + value * value, 0);
    if (energy <= EPSILON) {
      track.push({ time_seconds: Number(((start + frameSize / 2) / sampleRate).toFixed(3)), f0_hz: null, periodicity: 0, status: 'unvoiced_or_uncertain' });
      continue;
    }
    const correlations = [];
    for (let lag = minLag; lag <= maxLag; lag++) {
      let cross = 0, leftEnergy = 0, rightEnergy = 0;
      for (let i = 0; i < frameSize - lag; i++) {
        cross += frame[i] * frame[i + lag];
        leftEnergy += frame[i] ** 2;
        rightEnergy += frame[i + lag] ** 2;
      }
      const denominator = Math.sqrt(leftEnergy * rightEnergy);
      correlations.push(denominator > EPSILON ? cross / denominator : 0);
    }
    let bestLag = null, bestCorrelation = -1;
    for (let i = 1; i < correlations.length - 1; i++) {
      const correlation = correlations[i];
      if (correlation < 0.6 || correlation < correlations[i - 1] || correlation < correlations[i + 1]) continue;
      bestLag = minLag + i;
      bestCorrelation = correlation;
      break;
    }
    const accepted = bestLag !== null && bestCorrelation >= 0.6;
    track.push({
      time_seconds: Number(((start + frameSize / 2) / sampleRate).toFixed(3)),
      f0_hz: accepted ? Number((sampleRate / bestLag).toFixed(2)) : null,
      periodicity: Number(Math.max(0, bestCorrelation).toFixed(4)),
      status: accepted ? 'candidate_periodic_f0' : 'unvoiced_or_uncertain',
    });
  }
  return track;
}

function summarizeVocalRegions(mono, sampleRate, regions, f0Track) {
  if (!Array.isArray(regions)) return [];
  return regions.filter(region =>
    region && Number.isFinite(region.start_seconds) && Number.isFinite(region.end_seconds) &&
    region.start_seconds >= 0 && region.end_seconds > region.start_seconds
  ).map((region, index) => {
    const start = Math.min(mono.length, Math.floor(region.start_seconds * sampleRate));
    const end = Math.min(mono.length, Math.floor(region.end_seconds * sampleRate));
    const samples = mono.slice(start, end);
    if (samples.length < 2) return {
      region_index: index,
      start_seconds: region.start_seconds,
      end_seconds: region.end_seconds,
      status: 'insufficient_samples',
      sample_count: samples.length,
      rms: null,
      rms_dbfs: null,
      zero_crossing_rate: null,
      f0_summary_hz: null,
      limitations: ['A região está fora do áudio disponível ou contém amostras insuficientes.'],
    };
    const squareMean = samples.reduce((sum, value) => sum + value * value, 0) / samples.length;
    let crossings = 0;
    for (let i = 1; i < samples.length; i++) {
      if ((samples[i - 1] < 0 && samples[i] >= 0) || (samples[i - 1] >= 0 && samples[i] < 0)) crossings++;
    }
    const regionF0 = f0Track.filter(frame =>
      frame.time_seconds >= region.start_seconds && frame.time_seconds < region.end_seconds &&
      Number.isFinite(frame.f0_hz) && frame.status === 'candidate_periodic_f0'
    ).map(frame => frame.f0_hz).sort((a, b) => a - b);
    const medianF0 = regionF0.length
      ? Number(regionF0[Math.floor(regionF0.length / 2)].toFixed(2))
      : null;
    return {
      region_index: index,
      start_seconds: region.start_seconds,
      end_seconds: region.end_seconds,
      annotation: region.annotation ?? 'vocal_region',
      annotation_source: region.source ?? 'source annotation',
      sample_count: samples.length,
      rms: Number(Math.sqrt(squareMean).toFixed(6)),
      rms_dbfs: dbfs(Math.sqrt(squareMean)),
      zero_crossing_rate: Number((crossings / (samples.length - 1)).toFixed(6)),
      f0_summary_hz: medianF0,
      f0_candidate_frame_count: regionF0.length,
      status: 'acoustic_summary_for_annotated_region',
      method: 'RMS, zero-crossing rate, and median of candidate autocorrelation F0 frames within annotated interval',
      limitations: [
        'Features are computed only because an input annotation marked this interval; they do not validate that the source is vocal.',
        'RMS and zero-crossing rate are generic acoustic descriptors, not voice-specific measures.',
        'F0 summary includes only candidate periodic frames and may track instruments, harmonics, or octave errors.',
        'Formants, phonation type, and vocal technique are not estimated.',
      ],
    };
  });
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

const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const KEY_PROFILES = {
  major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
  minor: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17],
};

function pearson(a, b) {
  const meanA = a.reduce((s, v) => s + v, 0) / a.length;
  const meanB = b.reduce((s, v) => s + v, 0) / b.length;
  let numerator = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] - meanA, y = b[i] - meanB;
    numerator += x * y;
    aa += x * x;
    bb += y * y;
  }
  return aa && bb ? numerator / Math.sqrt(aa * bb) : 0;
}

function estimateTonalCenter(mono, sampleRate, frameSize) {
  const n = Math.min(frameSize, 2 ** Math.floor(Math.log2(mono.length)));
  if (n < 128 || mono.length < sampleRate * 0.5) {
    return { status: 'insufficient_evidence', tonic: null, mode: null, confidence: null, method: 'Krumhansl-Schmuckler chroma profile correlation', chroma: null };
  }
  const chroma = new Array(12).fill(0);
  const hop = Math.max(1, Math.floor(n / 2));
  let analyzedFrames = 0;
  for (let start = 0; start + n <= mono.length; start += hop) {
    const frame = mono.slice(start, start + n);
    const mean = frame.reduce((s, v) => s + v, 0) / n;
    const windowed = frame.map((value, i) => (value - mean) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1))));
    const power = fftRealPower(windowed);
    for (let bin = 1; bin < power.length; bin++) {
      const hz = bin * sampleRate / n;
      if (hz < 55 || hz > Math.min(2000, sampleRate / 2)) continue;
      const midi = 69 + 12 * Math.log2(hz / 440);
      const pitchClass = ((Math.round(midi) % 12) + 12) % 12;
      const detuning = Math.abs(midi - Math.round(midi));
      chroma[pitchClass] += power[bin] * Math.max(0, 1 - detuning);
    }
    analyzedFrames++;
  }
  const total = chroma.reduce((s, v) => s + v, 0);
  if (!analyzedFrames || total <= EPSILON) {
    return { status: 'insufficient_evidence', tonic: null, mode: null, confidence: null, method: 'Krumhansl-Schmuckler chroma profile correlation', chroma: null };
  }
  const normalized = chroma.map(v => v / total);
  const candidates = [];
  for (let tonic = 0; tonic < 12; tonic++) {
    for (const mode of ['major', 'minor']) {
      const profile = KEY_PROFILES[mode].map((_, i) => KEY_PROFILES[mode][(i - tonic + 12) % 12]);
      candidates.push({ tonic, mode, score: pearson(normalized, profile) });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0], runnerUp = candidates[1];
  const margin = Math.max(0, best.score - runnerUp.score);
  const confidence = Math.max(0, Math.min(1, margin * 2.5));
  return {
    status: confidence >= 0.12 ? 'candidate' : 'ambiguous',
    tonic: PITCH_CLASSES[best.tonic],
    mode: best.mode,
    confidence: Number(confidence.toFixed(3)),
    profile_correlation: Number(best.score.toFixed(4)),
    margin_to_runner_up: Number(margin.toFixed(4)),
    method: 'Krumhansl-Schmuckler chroma profile correlation from windowed FFT',
    chroma: Object.fromEntries(PITCH_CLASSES.map((name, i) => [name, Number(normalized[i].toFixed(5))])),
    limitations: [
      'Tonal center is a statistical candidate, not a verified score analysis.',
      'Percussion, tuning deviation, modulation, modal music and short or harmonically sparse excerpts can mislead key estimation.',
      'The confidence score is a heuristic margin between profile correlations, not a calibrated probability.',
    ],
  };
}

/**
 * Analyze already-decoded, normalized PCM samples. This function does not read
 * files or decode WAV/MP3/other containers. Samples should be floats in [-1, 1].
 */
export function analyzeAudioSamples({ samples, sampleRate, channels = 1, frameSize = DEFAULT_FRAME_SIZE, vocalRegions = [] } = {}) {
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
  const spectralEvolutionResult = spectralEvolution(mono, sampleRate, frameSize);
  const spectralNoveltyResult = analyzeSpectralNovelty(spectralEvolutionResult.curve);
  const energyTransitions = detectEnergyTransitions(energyCurve);
  const combinedTransitions = combineTransitionCandidates(energyTransitions, spectralEvolutionResult.candidates);
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
  const fundamentalFrequencyTrack = estimateFundamentalFrequencyTrack(mono, sampleRate);
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
    section_candidates: energyTransitions,
    combined_transition_candidates: combinedTransitions,
    spectrum: spectralFeatures(mono, sampleRate, frameSize),
    spectral_curve: spectralEvolutionResult.curve,
    spectral_change_candidates: spectralEvolutionResult.candidates,
    spectral_novelty_curve: spectralNoveltyResult.novelty_curve,
    spectral_novelty_candidates: spectralNoveltyResult.novelty_candidates,
    spectral_recurrence_candidates: spectralNoveltyResult.recurrence_candidates,
    spectral_sequence_recurrence_candidates: spectralNoveltyResult.sequence_recurrence_candidates,
    tonal_center: estimateTonalCenter(mono, sampleRate, frameSize),
    fundamental_frequency_track: fundamentalFrequencyTrack,
    vocal_region_acoustics: summarizeVocalRegions(mono, sampleRate, vocalRegions, fundamentalFrequencyTrack),
    stereo,
    limitations: [
      'Input must already be decoded to normalized PCM samples; file/container reading and decoding are not included.',
      'RMS/peak dBFS are not standards-compliant integrated loudness (LUFS) or true peak (dBTP).',
      'Spectral descriptors are estimates from finite windows and do not identify instruments or production techniques by themselves.',
      'The fundamental-frequency track is autocorrelation-based and can follow instruments or harmonics; it is not a vocal detector, and octave errors or unvoiced segments are possible.',
      ...(channelSamples.length < 2 ? ['Stereo properties were not assessed because fewer than two channels were supplied.'] : []),
    ],
  };
}
