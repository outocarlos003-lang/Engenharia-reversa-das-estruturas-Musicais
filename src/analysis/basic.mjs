import { evidence, OBSERVATION_TYPES } from '../core/model.mjs';

export function basicArtifactEvidence(artifact) {
  return [
    evidence({
      id: 'duration',
      claim: 'duration_seconds',
      value: artifact.duration,
      type: OBSERVATION_TYPES.MEASURED,
      confidence: 1,
      sources: ['wav.header.data_chunk'],
    }),
    evidence({
      id: 'sample-rate',
      claim: 'sample_rate_hz',
      value: artifact.format.sample_rate,
      type: OBSERVATION_TYPES.MEASURED,
      confidence: 1,
      sources: ['wav.header.fmt_chunk'],
    }),
    evidence({
      id: 'channels',
      claim: 'channel_count',
      value: artifact.format.channels,
      type: OBSERVATION_TYPES.MEASURED,
      confidence: 1,
      sources: ['wav.header.fmt_chunk'],
    }),
  ];
}

export function estimateTempoFromClicks(clickTimes) {
  if (clickTimes.length < 2) return { bpm: null, confidence: 0 };
  const intervals = clickTimes.slice(1).map((time, i) => time - clickTimes[i]).filter(x => x > 0);
  if (!intervals.length) return { bpm: null, confidence: 0 };
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  return { bpm: 60 / mean, confidence: 0.5 };
}
