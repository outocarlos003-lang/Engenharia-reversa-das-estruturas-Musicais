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

export function estimatePitch(samples, sampleRate, {minHz=60,maxHz=1000,minConfidence=0.65}={}) {
  if (!samples?.length || !Number.isFinite(sampleRate) || sampleRate<=0) return {frequency_hz:null,midi:null,confidence:0};
  const factor=Math.max(1,Math.floor(sampleRate/8000));
  const reduced=new Float32Array(Math.ceil(samples.length/factor));
  for(let i=0,j=0;i<samples.length;i+=factor,j++){let sum=0,n=0;for(let k=i;k<Math.min(samples.length,i+factor);k++){sum+=samples[k];n++;}reduced[j]=sum/n;}
  const rate=sampleRate/factor;
  let mean=0; for (const x of reduced) mean+=x; mean/=reduced.length;
  const centered=new Float32Array(reduced.length); let energy=0;
  for(let i=0;i<reduced.length;i++){centered[i]=reduced[i]-mean;energy+=centered[i]*centered[i];}
  if(energy/reduced.length<1e-7) return {frequency_hz:null,midi:null,confidence:0};
  const minLag=Math.max(2,Math.floor(rate/maxHz));
  const maxLag=Math.min(reduced.length-2,Math.ceil(rate/minHz));
  let bestLag=-1,best=-1;
  for(let lag=minLag;lag<=maxLag;lag++){
    let cross=0,left=0,right=0;
    for(let i=0;i<samples.length-lag;i++){
      const a=centered[i],b=centered[i+lag];cross+=a*b;left+=a*a;right+=b*b;
    }
    const score=cross/Math.sqrt(Math.max(1e-20,left*right));
    if(score>best){best=score;bestLag=lag;}
  }
  if(bestLag<0 || best<minConfidence) return {frequency_hz:null,midi:null,confidence:Number(Math.max(0,best).toFixed(4))};
  const corr=lag=>{let v=0;for(let i=0;i<samples.length-lag;i++)v+=centered[i]*centered[i+lag];return v;};
  let lag=bestLag;
  if(bestLag>minLag && bestLag<maxLag){
    const a=corr(bestLag-1),b=corr(bestLag),d=corr(bestLag+1),den=a-2*b+d;
    if(Math.abs(den)>1e-12) lag+=Math.max(-0.5,Math.min(0.5,0.5*(a-d)/den));
  }
  const hz=rate/lag, midi=69+12*Math.log2(hz/440);
  return {frequency_hz:Number(hz.toFixed(2)),midi:Number(midi.toFixed(2)),confidence:Number(best.toFixed(4))};
}

function spectralFeatures(samples, sampleRate) {
  const size=256, bins=size/2;
  if(samples.length<size) return {centroid_hz:null,bandwidth_hz:null,rolloff_hz:null,flatness:null};
  const magnitudes=[];
  let total=0, weighted=0;
  for(let k=1;k<bins;k++){
    let real=0,imag=0;
    for(let n=0;n<size;n++){
      const index=Math.floor(n*(samples.length-1)/(size-1));
      const window=0.5-0.5*Math.cos(2*Math.PI*n/(size-1));
      const value=samples[index]*window;
      const angle=2*Math.PI*k*n/size;
      real+=value*Math.cos(angle); imag-=value*Math.sin(angle);
    }
    const magnitude=Math.sqrt(real*real+imag*imag);
    magnitudes.push({frequency:k*sampleRate/size,magnitude});
    total+=magnitude; weighted+=k*sampleRate/size*magnitude;
  }
  if(total<=1e-12) return {centroid_hz:0,bandwidth_hz:0,rolloff_hz:0,flatness:0};
  const centroid=weighted/total;
  let variance=0, cumulative=0, rolloff=0, logSum=0, arithmetic=0;
  for(const bin of magnitudes){
    variance+=bin.magnitude*(bin.frequency-centroid)**2;
    cumulative+=bin.magnitude;
    if(!rolloff&&cumulative>=total*0.85) rolloff=bin.frequency;
    const safe=Math.max(bin.magnitude,1e-12);
    logSum+=Math.log(safe); arithmetic+=safe;
  }
  return {
    centroid_hz:Number(centroid.toFixed(2)),
    bandwidth_hz:Number(Math.sqrt(variance/total).toFixed(2)),
    rolloff_hz:Number(rolloff.toFixed(2)),
    flatness:Number((Math.exp(logSum/magnitudes.length)/(arithmetic/magnitudes.length)).toFixed(6)),
  };
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
    const pitch=estimatePitch(samples.subarray(start,start+window),sampleRate);\n    const frameSamples=samples.subarray(start,start+window);\n    frames.push({start:start/sampleRate,rms:Math.sqrt(energy/window),zero_crossing_rate:crossings/window,...spectralFeatures(frameSamples,sampleRate),...pitch});
  }
  const rms=frames.map(f=>f.rms);
  const sorted=[...rms].sort((a,b)=>a-b);
  const median=sorted.length?sorted[Math.floor(sorted.length/2)]:0;
  const peak=Math.max(0,...rms);\n  const meanSquare=samples.length?samples.reduce((sum,value)=>sum+value*value,0)/samples.length:0;\n  const loudnessDbfs=meanSquare>0?10*Math.log10(meanSquare):-Infinity;\n  const average=key=>{const values=frames.map(frame=>frame[key]).filter(Number.isFinite);return values.length?Number((values.reduce((a,b)=>a+b,0)/values.length).toFixed(3)):null;};
  const threshold=Math.max(0.015,median*1.8,peak*0.12);
  const events=[]; let lastOnset=-Infinity, previous=0;
  for(const frame of frames) {
    const rise=frame.rms-previous;
    if(frame.rms>=threshold && rise>Math.max(0.008,peak*0.04) && frame.start-lastOnset>=0.09) {
      events.push({id:'onset-'+(events.length+1),start:Number(frame.start.toFixed(4)),duration:null,pitch:frame.midi,frequency_hz:frame.frequency_hz,pitch_confidence:frame.confidence,amplitude:Number(frame.rms.toFixed(6)),zero_crossing_rate:Number(frame.zero_crossing_rate.toFixed(6)),kind:'audio_onset_candidate'});
      lastOnset=frame.start;
    }
    previous=frame.rms;
  }
  return { ...wav, frames:frames.length, events, dynamics:{rms_min:rms.length?Math.min(...rms):0,rms_median:median,rms_peak:peak,loudness_dbfs:Number.isFinite(loudnessDbfs)?Number(loudnessDbfs.toFixed(3)):null,peak_dbfs:peak>0?Number((20*Math.log10(peak)).toFixed(3)):null,window_ms:windowMs,hop_ms:hopMs}, spectrum:{centroid_hz:average('centroid_hz'),bandwidth_hz:average('bandwidth_hz'),rolloff_hz:average('rolloff_hz'),flatness:average('flatness'),method:'mean of frame-level magnitude-spectrum descriptors; 256-point window'}, limitations:[
    'Eventos são candidatos a ataques estimados por energia; não são uma transcrição de notas.',
    'Altura é estimada por autocorrelação monofônica; acordes e misturas podem causar erros de oitava ou notas espúrias.',\n    'Tonalidade, compasso e instrumentação não são inferidos pelo analisador WAV básico.',
    'Detecção de ataques depende do nível, ruído, mixagem e parâmetros da janela.'
  ]};
}

export async function analyzeWavFile(path, options={}) {
  if(extname(path).toLowerCase()!=='.wav') throw new Error('Audio adapter currently supports WAV files only.');
  return analyzeWavBuffer(await readFile(resolve(path)),options);
}
