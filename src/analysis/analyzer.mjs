import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { analysisReport, evidence, musicalRepresentation, OBSERVATION_TYPES } from '../core/model.mjs';
import { buildReconstructionSpec } from './reconstruction.mjs';
import { analyzeWavFile } from '../audio/wav.mjs';

const LIMITATIONS = [
  'Áudio WAV é analisado por energia, candidatos a ataques e estimativas exploratórias de altura monofônica; isso não equivale a transcrição polifônica.',
  'Gênero, estética e intenção semântica são hipóteses e não fatos diretamente medidos.',
];

export async function loadMusicalSource(target) {
  if (typeof target !== 'string' || !target.trim()) throw new Error('target must be a non-empty path or JSON string');
  if (!target.trim().startsWith('{') && !target.trim().startsWith('[') && /\.wav$/i.test(target.trim())) {
    const audio = await analyzeWavFile(target.trim());
    return {
      source: target.trim(), events: audio.events, dynamics: audio.dynamics,
      audio: { sample_rate: audio.sampleRate, channels: audio.channels, duration: audio.duration, encoding: audio.encoding, bits_per_sample: audio.bitsPerSample, analyzed_frames: audio.frames },
      limitations: audio.limitations
    };
  }
  let raw;
  if (target.trim().startsWith('{') || target.trim().startsWith('[')) raw = target;
  else raw = await readFile(resolve(target), 'utf8');
  const parsed = JSON.parse(raw);
  const source = Array.isArray(parsed) ? { events: parsed } : parsed;
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('Musical source must be a JSON object or event array');
  const events = Array.isArray(source.events) ? source.events : [];
  for (const [i, event] of events.entries()) {
    if (!event || typeof event !== 'object') throw new Error(`events[${i}] must be an object`);
    if (event.start != null && !Number.isFinite(Number(event.start))) throw new Error(`events[${i}].start must be numeric`);
    if (event.duration != null && (!Number.isFinite(Number(event.duration)) || Number(event.duration) < 0)) throw new Error(`events[${i}].duration must be a non-negative number`);
  }
  return { ...source, events, source: source.source ?? target };
}

