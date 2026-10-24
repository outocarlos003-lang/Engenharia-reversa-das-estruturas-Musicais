/**
 * Detects relations between non-overlapping symbolic event windows.
 * The module reports structural relationships, not semantic equivalence.
 */
const pitchOf=e=>e?.midi??e?.pitch??null;
const onsetOf=e=>Number(e?.onset??e?.start??0);
const close=(a,b,tolerance=0.025)=>Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(a),Math.abs(b));
const intervals=pitches=>pitches.slice(1).map((p,i)=>p-pitches[i]);
const same=(a,b)=>a.length===b.length&&a.every((v,i)=>close(v,b[i]));
const negate=a=>a.map(v=>-v);
const reverse=a=>[...a].reverse();

function rhythmRelation(a,b){
  if(a.length!==b.length||!a.length||a.some(v=>v<=0)||b.some(v=>v<=0)) return null;
  const ratios=a.map((v,i)=>b[i]/v);
  if(!ratios.every(v=>close(v,ratios[0],0.05))) return null;
  const ratio=ratios.reduce((s,v)=>s+v,0)/ratios.length;
  if(close(ratio,1,0.05)) return {type:'same_rhythm',ratio:Number(ratio.toFixed(4))};
  return {type:ratio>1?'rhythmic_augmentation':'rhythmic_diminution',ratio:Number(ratio.toFixed(4))};
}

function melodicRelation(base,candidate){
  const a=intervals(base),b=intervals(candidate);
  if(same(a,b)){
    const offsets=candidate.map((v,i)=>v-base[i]);
    const offset=offsets.reduce((s,v)=>s+v,0)/offsets.length;
    if(offsets.every(v=>close(v,offset,0.01))) return {type:close(offset,0.01)?'identity':'transposition',semitones:Number(offset.toFixed(4))};
  }
  if(same(negate(a),b)) return {type:'inversion'};
  if(same(negate(reverse(a)),b)) return {type:'retrograde'};
  if(same(reverse(a),b)) return {type:'retrograde_inversion'};
  return null;
}

export function analyzeMotifTransformations(inputEvents=[],options={}){
  const minLength=Math.max(3,Number(options.minLength??3));
  const maxLength=Math.max(minLength,Number(options.maxLength??6));
  const events=inputEvents.map((e,index)=>({...e,_index:index,_onset:onsetOf(e)})).sort((a,b)=>a._onset-b._onset);
  const output=[];
  for(let length=minLength;length<=Math.min(maxLength,events.length);length++){
    const windows=[];
    for(let start=0;start+length<=events.length;start++){
      const chunk=events.slice(start,start+length);
      const pitches=chunk.map(pitchOf);
      if(pitches.some(p=>p===null||!Number.isFinite(Number(p)))) continue;
      const numeric=pitches.map(Number);
      const iois=chunk.slice(1).map((e,i)=>e._onset-chunk[i]._onset);
      if(iois.some(v=>v<=0)) continue;
      windows.push({startIndex:start,endIndex:start+length-1,start:chunk[0]._onset,end:chunk.at(-1)._onset,pitches:numeric,intervals:intervals(numeric),iois,event_ids:chunk.map((e,i)=>e.id??`event-${start+i+1}`)});
    }
    for(let i=0;i<windows.length;i++) for(let j=i+1;j<windows.length;j++){
      const a=windows[i],b=windows[j];
      if(a.endIndex>=b.startIndex) continue;
      const melodic=melodicRelation(a.pitches,b.pitches);
      if(!melodic) continue;
      const rhythm=rhythmRelation(a.iois,b.iois);
      if(!rhythm) continue;
      if(melodic.type==='identity'&&rhythm.type==='same_rhythm') continue;
      output.push({
        id:`transform-${output.length+1}`,
        source:{start:a.start,end:a.end,event_ids:a.event_ids},
        target:{start:b.start,end:b.end,event_ids:b.event_ids},
        event_count:length,
        melodic_relation:melodic,
        rhythmic_relation:rhythm,
        confidence:melodic.type==='transposition'||melodic.type==='identity'?0.9:0.82,
        evidence:{basis:['symbolic pitch interval sequence','inter-onset interval ratios'],source_intervals:a.intervals,target_intervals:b.intervals,source_iois:a.iois,target_iois:b.iois},
        limitations:['Transformation detection depends on event-window length and a monophonic pitch sequence.','A detected mathematical relation does not establish phrase function or compositional intent.'],
      });
    }
  }
  const seen=new Set();
  return output.filter(item=>{
    const key=JSON.stringify([item.source.event_ids,item.target.event_ids,item.melodic_relation,item.rhythmic_relation]);
    if(seen.has(key)) return false;
    seen.add(key);return true;
  }).sort((a,b)=>b.event_count-a.event_count||a.source.start-b.source.start);
}
