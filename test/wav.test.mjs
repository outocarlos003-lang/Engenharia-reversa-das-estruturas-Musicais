import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWavBuffer, decodeWav, estimatePitch } from '../src/audio/wav.mjs';

function sineWav({duration=1,sampleRate=8000,frequency=440,amplitude=0.5}={}) {
  const count=Math.floor(duration*sampleRate), dataSize=count*2, b=Buffer.alloc(44+dataSize);
  b.write('RIFF',0); b.writeUInt32LE(36+dataSize,4); b.write('WAVE',8);
  b.write('fmt ',12); b.writeUInt32LE(16,16); b.writeUInt16LE(1,20); b.writeUInt16LE(1,22);
  b.writeUInt32LE(sampleRate,24); b.writeUInt32LE(sampleRate*2,28); b.writeUInt16LE(2,32); b.writeUInt16LE(16,34);
  b.write('data',36); b.writeUInt32LE(dataSize,40);
  for(let i=0;i<count;i++) b.writeInt16LE(Math.round(Math.sin(2*Math.PI*frequency*i/sampleRate)*amplitude*32767),44+i*2);
  return b;
}

test('decodes PCM WAV metadata and duration',()=>{
  const wav=decodeWav(sineWav());
  assert.equal(wav.sampleRate,8000);
  assert.equal(wav.channels,1);
  assert.equal(wav.duration,1);
  assert.equal(wav.bitsPerSample,16);
});

test('WAV analysis returns measurable frames and documented limits',()=>{
  const result=analyzeWavBuffer(sineWav({duration:2}));
  assert.ok(result.frames>50);
  assert.equal(result.duration,2);
  assert.ok(Array.isArray(result.events));
  assert.ok(result.limitations.some(x=>x.includes('transcrição de notas')));
});

test('rejects non-WAV binary input',()=>{
  assert.throws(()=>decodeWav(Buffer.from('not audio')),/valid RIFF\/WAVE/);
});

test('estimates pitch for a clean monophonic A4 tone',()=>{
  const rate=8000, count=4000, samples=new Float32Array(count);
  for(let i=0;i<count;i++) samples[i]=0.6*Math.sin(2*Math.PI*440*i/rate);
  const pitch=estimatePitch(samples,rate);
  assert.ok(pitch.frequency_hz>430 && pitch.frequency_hz<450, JSON.stringify(pitch));
  assert.ok(pitch.midi>68.5 && pitch.midi<69.5, JSON.stringify(pitch));
  assert.ok(pitch.confidence>0.65);
});

test('silent signal has no pitch estimate',()=>{
  const pitch=estimatePitch(new Float32Array(500),8000);
  assert.equal(pitch.frequency_hz,null);
  assert.equal(pitch.midi,null);
});

test('WAV analysis reports loudness proxies and spectral descriptors',()=>{
  const result=analyzeWavBuffer(sineWav({duration:1,frequency:440,amplitude:0.5}));
  assert.ok(Number.isFinite(result.dynamics.loudness_dbfs));
  assert.ok(Number.isFinite(result.dynamics.peak_dbfs));
  assert.ok(result.spectrum.centroid_hz>0);
  assert.ok(result.spectrum.rolloff_hz>0);
  assert.ok(result.spectrum.flatness>=0);
  assert.equal(result.spectrum.method.includes('256-point'),true);
});
