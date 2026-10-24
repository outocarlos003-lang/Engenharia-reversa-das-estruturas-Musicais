import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMusicalSource, runMusicalTool } from '../src/analysis/analyzer.mjs';

const source = JSON.stringify({
  tempo: { bpm: 120 }, meter: '4/4',
  events: [
    { start: 0, duration: 0.5, pitch: 60 },
    { start: 0.5, duration: 0.5, pitch: 64 },
    { start: 1, duration: 0.5, pitch: 60 },
    { start: 1.5, duration: 0.5, pitch: 67 }
  ],
  sections: [{ id: 'A', start: 0, end: 2 }]
});

test('structured source produces events, melody and evidence', async () => {
  const report = await analyzeMusicalSource(source);
  assert.equal(report.events.length, 4);
  assert.deepEqual(report.representation.melody.intervals, [4, -4, 7]);
  assert.ok(report.observations.length > 0);
  assert.ok(report.limitations.some(x => x.includes('áudio bruto')));
});

test('MCP tool returns data instead of a placeholder', async () => {
  const result = await runMusicalTool('analyze_rhythmic_structure', source);
  assert.equal(result.data.event_count, 4);
  assert.ok(Array.isArray(result.data.inter_onset_intervals));
});

test('genre classifier does not invent labels', async () => {
  const result = await runMusicalTool('classify_genre', source);
  assert.equal(result.data.status, 'insufficient evidence for automatic classification');
});

test('invalid musical event is rejected with a useful error', async () => {
  await assert.rejects(() => analyzeMusicalSource(JSON.stringify({events:[{start:'not-time'}]})), /start must be numeric/);
});

test('track profile preserves supplied descriptors and keeps missing acoustic measurements unresolved',async()=>{
  const annotated=JSON.stringify({
    tempo:{bpm:98},key:'D minor',
    emotional_tone:['melancholic','tense'],
    production:{texture:'lo-fi',reverb:'prominent'},
    thematic_content:['loss','memory'],
    cultural_context:'source-described regional tradition',
    genres:{primary:['trip-hop'],secondary:['ambient']},
    loudness:{integrated_lufs:-14.2},
    energy_structure:[{section:'intro',level:0.2},{section:'chorus',level:0.8}],
    events:[{start:0,duration:0.5,pitch:62},{start:0.5,duration:0.5,pitch:65}]
  });
  const report=await analyzeMusicalSource(annotated);
  const profile=report.representation.track_profile;
  assert.deepEqual(profile.emotional_tone.value,['melancholic','tense']);
  assert.deepEqual(profile.genres.primary.value,['trip-hop']);
  assert.deepEqual(profile.genres.secondary.value,['ambient']);
  assert.equal(profile.tempo.value,98);
  assert.equal(profile.key.value,'D minor');
  assert.equal(profile.loudness.value.integrated_lufs,-14.2);
  assert.equal(profile.spectrum.status,'unavailable');
  assert.equal(profile.stereo.status,'unavailable');
  assert.equal(report.genre.status,'source_supplied');
});

test('track profile does not invent mood, genre, production, or spectral measurements',async()=>{
  const report=await analyzeMusicalSource(JSON.stringify({events:[{start:0,duration:1,pitch:60}]}));
  const profile=report.representation.track_profile;
  assert.equal(profile.emotional_tone.status,'unavailable');
  assert.equal(profile.production.status,'unavailable');
  assert.equal(profile.genres.primary.status,'unavailable');
  assert.equal(profile.spectrum.status,'unavailable');
  assert.equal(profile.stereo.status,'unavailable');
  assert.equal(report.genre.status,'insufficient evidence for automatic classification');
});
