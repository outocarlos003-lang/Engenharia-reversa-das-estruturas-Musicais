/**
 * Structural inference from symbolic musical events.
 * This module intentionally works on events, not audio-container metadata.
 * Time values are in beats unless the caller explicitly supplies another unit.
 */

const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
const onsetOf = event => Number(event.onset ?? event.start ?? 0);
const durationOf = event => Math.max(0, Number(event.duration ?? event.duration_beats ?? 0));
const pitchOf = event => finite(event.midi ?? event.pitch) ? Number(event.midi ?? event.pitch) : null;

function gcd(a,b){a=Math.abs(Math.round(a));b=Math.abs(Math.round(b));while(b){const t=b;b=a%b;a=t;}return a||1;}
function normalizeRhythm(values){
  const positive=values.map(Number).filter(v=>Number.isFinite(v)&&v>0);
  if(!positive.length) return values.map(()=>0);
  const unit=positive.reduce((a,b)=>gcd(a*1000,b*1000)/1000);
  return values.map(v=>Number.isFinite(v)&&v>0?Number((v/unit).toFixed(3)):0);
}
function intervalSignature(events){
  const pitches=events.map(pitchOf);
  const intervals=[];
  for(let i=1;i<pitches.length;i++) intervals.push(pitches[i]===null||pitches[i-1]===null?null:pitches[i]-pitches[i-1]);
  return intervals;
}
function contour(intervals){return intervals.map(v=>v===null?'?':v>0?'+':v<0?'-':'=');}
function stable(value){return JSON.stringify(value);}

/**
 * Finds repeated event windows by relative interval and normalized inter-onset rhythm.
 * This treats transposed instances as structurally related rather than requiring identical pitches.
 */
export function findStructuralMotifs(inputEvents=[], options={}){
  const minLength=Math.max(2,Number(options.minLength??3));
  const maxLength=Math.max(minLength,Number(options.maxLength??8));
  const minOccurrences=Math.max(2,Number(options.minOccurrences??2));
  const events=inputEvents.map((event,index)=>({...event,_index:index,_onset:onsetOf(event),_pitch:pitchOf(event)}))
    .sort((a,b)=>a._onset-b._onset);
  const windows=new Map();
  for(let length=minLength;length<=Math.min(maxLength,events.length);length++){
    for(let start=0;start+length<=events.length;start++){
      const window=events.slice(start,start+length);
      const intervals=intervalSignature(window);
      if(intervals.every(v=>v===null)) continue;
      const iois=window.slice(1).map((e,i)=>e._onset-window[i]._onset);
      const rhythm=normalizeRhythm(iois);
      const signature=stable({contour:contour(intervals),rhythm});
      const found=windows.get(signature)??{signature,contour:contour(intervals),intervals,rhythm,occurrences:[],length};
      found.occurrences.push({
        start:window[0]._onset,
        end:window.at(-1)._onset+durationOf(window.at(-1)),
        event_ids:window.map((e)=>e.id??`event-${e._index+1}`),
        event_indexes:window.map(e=>e._index),
        transposition:window[0]._pitch,
      });
      windows.set(signature,found);
    }
  }
  for(const item of windows.values()){
    const selected=[]; const occupied=new Set();
    for(const occurrence of item.occurrences.sort((a,b)=>a.start-b.start)){
      if(occurrence.event_indexes.some(index=>occupied.has(index))) continue;
      selected.push(occurrence); occurrence.event_indexes.forEach(index=>occupied.add(index));
    }
    item.occurrences=selected;
  }
  return [...windows.values()]
    .filter(item=>item.occurrences.length>=minOccurrences)
    .sort((a,b)=>b.length-a.length||b.occurrences.length-a.occurrences.length)
    .filter((item,index,all)=>!all.slice(0,index).some(parent=>
      parent.length>item.length && parent.contour.join(',').includes(item.contour.join(',')) &&
      parent.occurrences.some(o=>item.occurrences.some(p=>p.start===o.start))))
    .map((item,index)=>({
      id:`motif-${index+1}`,
      signature:item.signature,
      invariant:{melodic_contour:item.contour,relative_intervals:item.intervals,normalized_rhythm:item.rhythm},
      event_count:item.length,
      occurrences:item.occurrences,
      recurrence:item.occurrences.length,
      confidence:0.85,
      evidence:{basis:['relative melodic intervals','melodic contour','normalized inter-onset ratios'],observed_occurrences:item.occurrences.length},
      limitations:['Motif boundaries depend on the symbolic event stream and selected window lengths.'],
    }));
}

/** Builds an explicit event -> motif -> phrase -> section -> form hypothesis. */
export function inferMusicalStructure(inputEvents=[], options={}){
  const events=inputEvents.map((event,index)=>({
    ...event,id:event.id??`event-${index+1}`,
    onset:onsetOf(event),duration:durationOf(event),midi:pitchOf(event),
  })).sort((a,b)=>a.onset-b.onset);
  const motifs=findStructuralMotifs(events,options.motifs);
  const maxPhraseEvents=Math.max(2,Number(options.maxPhraseEvents??16));
  const sortedIOIs=events.slice(1).map((e,i)=>e.onset-events[i].onset).filter(v=>v>0).sort((a,b)=>a-b);
  const medianIOI=sortedIOIs.length?sortedIOIs[Math.floor(sortedIOIs.length/2)]:null;
  const gapRatio=Math.max(1.25,Number(options.phraseBoundaryGapRatio??2.5));
  const minGap=Math.max(0,Number(options.phraseBoundaryMinGap??0.75));
  const chunks=[];
  let current=[];
  for(let i=0;i<events.length;i++){
    const event=events[i];
    const previous=events[i-1];
    const gap=previous?event.onset-(previous.onset+previous.duration):0;
    const largeGap=Boolean(previous&&gap>=Math.max(minGap,(medianIOI??minGap)*gapRatio));
    const explicit=Boolean(event.phrase_boundary_before||event.phrase_start||event.cadence_boundary_before);
    const declaredPhrase=Boolean(previous&&event.phrase_id!=null&&previous.phrase_id!=null&&event.phrase_id!==previous.phrase_id);
    const capped=current.length>=maxPhraseEvents;
    const boundary=current.length>0&&(largeGap||explicit||declaredPhrase||capped);
    if(boundary){chunks.push({events:current,reason:largeGap?'inter_phrase_gap':explicit?'source_declared_boundary':declaredPhrase?'source_phrase_id_change':'safety_cap'});current=[];}
    current.push(event);
  }
  if(current.length) chunks.push({events:current,reason:'end_of_source'});
  const phrases=[];
  for(let index=0;index<chunks.length;index++){
    const {events:chunk,reason}=chunks[index];
    const boundaryEvidence=reason==='inter_phrase_gap'?['inter-onset gap and preceding event duration compared with local median onset interval']:reason==='source_declared_boundary'||reason==='source_phrase_id_change'?['boundary explicitly represented in source events']:['maximum event count used as a safety cap'];
    phrases.push({
      id:`phrase-${phrases.length+1}`,start:chunk[0].onset,
      end:chunk.at(-1).onset+chunk.at(-1).duration,
      event_ids:chunk.map(e=>e.id),
      interval_signature:intervalSignature(chunk),
      contour:contour(intervalSignature(chunk)),
      motif_ids:motifs.filter(m=>m.occurrences.some(o=>o.event_ids.some(id=>chunk.some(e=>e.id===id)))).map(m=>m.id),
      boundary_status:reason==='inter_phrase_gap'||reason==='source_declared_boundary'||reason==='source_phrase_id_change'?'inferred':'provisional',
      boundary_reason:reason,
      confidence:reason==='source_declared_boundary'||reason==='source_phrase_id_change'?0.9:reason==='inter_phrase_gap'?0.65:0.35,
      evidence:{basis:boundaryEvidence,measured_gap_before:index>0?Number((chunk[0].onset-(chunks[index-1].events.at(-1).onset+chunks[index-1].events.at(-1).duration)).toFixed(6)):null,median_inter_onset_interval:medianIOI,unresolved:['cadential and harmonic evidence is not available unless supplied separately']},
    });
  }
  const sections=[];
  for(const phrase of phrases){
    const sig=stable({contour:phrase.contour,motifs:phrase.motif_ids});
    const previous=sections.find(s=>s.signature===sig);
    if(previous){
      if(!previous.phrase_ids.includes(phrase.id)) previous.phrase_ids.push(phrase.id);
      previous.occurrences.push({phrase_id:phrase.id,start:phrase.start,end:phrase.end});
      previous.confidence=Math.min(0.8,previous.confidence+0.1);
    } else sections.push({
      id:`section-${sections.length+1}`,signature:sig,label:null,
      start:phrase.start,end:phrase.end,phrase_ids:[phrase.id],
      occurrences:[{phrase_id:phrase.id,start:phrase.start,end:phrase.end}],
      confidence:0.45,
    });
  }
  const labels=new Map(); let code=0;
  const form=phrases.map(phrase=>{
    const section=sections.find(s=>s.phrase_ids.includes(phrase.id)||s.occurrences.some(o=>o.phrase_id===phrase.id));
    const sig=section?.signature??stable(phrase.contour);
    if(!labels.has(sig)) labels.set(sig,String.fromCharCode(65+code++));
    return {phrase_id:phrase.id,section_id:section?.id??null,label:labels.get(sig)};
  });
  return {
    schema_version:'0.2.0',
    events,
    invariants:{
      melodic_contour:events.length>1?contour(intervalSignature(events)):[],
      relative_intervals:intervalSignature(events),
      inter_onset_intervals:events.slice(1).map((e,i)=>Number((e.onset-events[i].onset).toFixed(6))),
      motif_count:motifs.length,
    },
    motifs,phrases,sections,
    form:{sequence:form.map(x=>x.label),pattern:form.map(x=>x.label).join('-'),mapping:form,confidence:form.length?0.45:0},
    epistemic_status:{
      observed:['event order','onsets and durations when supplied','pitch values when supplied'],
      inferred:['relative interval patterns','motif recurrence','phrase boundaries from rhythmic gaps or source declarations','provisional section groupings','form sequence'],
      unresolved:['meter unless supplied or independently inferred','cadential phrase boundaries','harmonic function unless chord/voice evidence is supplied','instrumentation and style'],
    },
    limitations:['Structural output is only as reliable as the symbolic events supplied.','Phrase and section boundaries are hypotheses, not ground truth. Gap-based phrase segmentation can miss legato cadences and may split expressive pauses.','A repeated contour and rhythm are evidence of structural similarity, not proof of identical musical function.'],
  };
}
