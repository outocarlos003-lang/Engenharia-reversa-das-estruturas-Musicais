import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

function ascii(b, i, n) { return b.toString('ascii', i, i+n); }
export function decodeWav(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 44 || ascii(buffer,0,4)!=='RIFF' || ascii(buffer,8,4)!=='WAVE') {
    throw new Error('Unsupported audio: expected a valid RIFF/WAVE WAV file.');
  }
  let offset=12, format=null, channels=0, sampleRate=0, bits=0, data=null;
  while (offset+8 <= buffer.length) {
    const id=ascii(buffer,offset,4), size=buffer.readUInt32LE(offset+4), start=offset+8;
    if (start+size > buffer.length) throw new Error('Malformed WAV: chunk exceeds file size.');
    if (id==='fmt ') {
      if(size<16) throw new Error('Malformed WAV format chunk.');
      format=buffer.readUInt16LE(start); channels=buffer.readUInt16LE(start+2);
      sampleRate=buffer.readUInt32LE(start+4); bits=buffer.readUInt16LE(start+14);
    } else if(id==='data') data={start,size};
    offset=start+size+(size%2);
  }
  if(!data || !channels || !sampleRate || !bits) throw new Error('WAV is missing required format or data chunks.');
  if(![1,3].includes(format)) throw new Error('WAV encoding unsupported: only PCM and IEEE float are supported.');
  if(format===3 && bits!==32) throw new Error('Only 32-bit float WAV is supported.');
  if(format===1 && ![8,16,24,32].includes(bits)) throw new Error('PCM WAV must use 8, 16, 24 or 32 bits.');
  const bytes=bits/8, frameBytes=bytes*channels, frames=Math.floor(data.size/frameBytes);
  if(!frames) throw new Error('WAV contains no complete audio frames.');
  const mono=new Float32Array(frames);
  for(let f=0;f<frames;f++) {
    let sum=0;
    for(let c=0;c<channels;c++) {
      const p=data.start+f*frameBytes+c*bytes; let v;
      if(format===3) v=buffer.readFloatLE(p);
      else if(bits===8) v=(buffer.readUInt8(p)-128)/128;
      else if(bits===16) v=buffer.readInt16LE(p)/32768;
      else if(bits===24) { let n=buffer[p]|(buffer[p+1]<<8)|(buffer[p+2]<<16); if(n&0x800000)n|=0xff000000; v=n/8388608; }
      else v=buffer.readInt32LE(p)/2147483648;
      sum+=Number.isFinite(v)?Math.max(-1,Math.min(1,v)):0;
    }
    mono[f]=sum/channels;
  }
  return { samples:mono, sampleRate, channels, duration:frames/sampleRate, encoding:format===3?'ieee-float':'pcm', bitsPerSample:bits };
}

export function analyzeWavBuffer(buffer, {windowMs=50, hopMs=25}={}) {
  const wav=decodeWav(buffer), {samples,sampleRate}=wav;
  const window=Math.max(32,Math.round(sampleRate*windowMs/1000));
  const hop=Math.max(16,Math.round(sampleRate*hopMs/1000));
  const frames=[];
  for(let start=0;start+window<=samples.length;start+=hop) {
    let energy=0, crossings=0, previous=samples[start];
    for(let i=start;i<start+window;i++) {
      const v=samples[i]; energy+=v*v;
      if(i>start && ((v>=0&&previous<0)||(v<0&&previous>=0))) crossings++;
      previous=v;
    }
    frames.push({start:start/sampleRate,rms:Math.sqrt(energy/window),zero_crossing_rate:crossings/window});
  }
  const rms=frames.map(f=>f.rms);
  const sorted=[...rms].sort((a,b)=>a-b);
  const median=sorted.length?sorted[Math.floor(sorted.length/2)]:0;
  const peak=Math.max(0,...rms);
  const threshold=Math.max(0.015,median*1.8,peak*0.12);
  const events=[]; let lastOnset=-Infinity, previous=0;
  for(const frame of frames) {
    const rise=frame.rms-previous;
    if(frame.rms>=threshold && rise>Math.max(0.008,peak*0.04) && frame.start-lastOnset>=0.09) {
      events.push({id:'onset-'+(events.length+1),start:Number(frame.start.toFixed(4)),duration:null,pitch:null,amplitude:Number(frame.rms.toFixed(6)),zero_crossing_rate:Number(frame.zero_crossing_rate.toFixed(6)),kind:'audio_onset_candidate'});
      lastOnset=frame.start;
    }
    previous=frame.rms;
  }
  return { ...wav, frames:frames.length, events, dynamics:{rms_min:rms.length?Math.min(...rms):0,rms_median:median,rms_peak:peak,window_ms:windowMs,hop_ms:hopMs}, limitations:[
    'Eventos são candidatos a ataques estimados por energia; não são uma transcrição de notas.',
    'Pitch, tonalidade, compasso e instrumentação não são inferidos pelo analisador WAV básico.',
    'Detecção de ataques depende do nível, ruído, mixagem e parâmetros da janela.'
  ]};
}

export async function analyzeWavFile(path, options={}) {
  if(extname(path).toLowerCase()!=='.wav') throw new Error('Audio adapter currently supports WAV files only.');
  return analyzeWavBuffer(await readFile(resolve(path)),options);
}
