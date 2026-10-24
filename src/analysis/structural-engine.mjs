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
  const recurringMotifStarts=new Set();
  const recurringMotifEnds=new Set();
  for(const motif of motifs.filter(item=>item.recurrence>=2)){
    for(const occurrence of motif.occurrences){
      if(occurrence.event_ids.length){
        recurringMotifStarts.add(occurrence.event_ids[0]);
        recurringMotifEnds.add(occurrence.event_ids.at(-1));
      }
    }
  }
  const maxPhraseEvents=Math.max(2,Number(options.maxPhraseEvents??16));
  const sortedIOIs=events.slice(1).map((e,i)=>e.onset-events[i].onset).filter(v=>v>0).sort((a,b)=>a-b);
  const medianIOI=sortedIOIs.length?sortedIOIs[Math.floor(sortedIOIs.length/2)]:null;
  const gapRatio=Math.max(1.25,Number(options.phraseBoundaryGapRatio??2.5));
  const minGap=Math.max(0,Number(options.phraseBoundaryMinGap??0.75));
  const chunks=[];
  let current=[];
  const durations=events.map(e=>e.duration).filter(v=>v>0).sort((a,b)=>a-b);
  const medianDuration=durations.length?durations[Math.floor(durations.length/2)]:null;
  const assessBoundary=(previous,event,gap)=>{
    const evidence=[];
    let score=0;
    const explicit=Boolean(event.phrase_boundary_before||event.phrase_start||event.cadence_boundary_before||previous?.phrase_end||previous?.cadence_boundary_after||previous?.boundary_after||previous?.is_phrase_end);
    const declaredPhrase=Boolean(previous&&event.phrase_id!=null&&previous.phrase_id!=null&&event.phrase_id!==previous.phrase_id);
    if(explicit){score=Math.max(score,0.95);evidence.push({type:'source_marker',weight:0.95,observed:true});}
    if(declaredPhrase){score=Math.max(score,0.95);evidence.push({type:'phrase_id_change',weight:0.95,observed:true});}
    const gapThreshold=Math.max(minGap,(medianIOI??minGap)*gapRatio);
    const gapRatioObserved=gapThreshold>0?gap/gapThreshold:0;
    if(previous&&gap>=gapThreshold){
      const weight=Math.min(0.8,0.55+Math.max(0,gapRatioObserved-1)*0.12);
      score=Math.max(score,weight);
      evidence.push({type:'inter_event_rest',weight:Number(weight.toFixed(3)),observed:true,gap:Number(gap.toFixed(6)),threshold:Number(gapThreshold.toFixed(6)),ratio:Number(gapRatioObserved.toFixed(3))});
    } else if(previous) evidence.push({type:'inter_event_rest',weight:0,observed:false,gap:Number(gap.toFixed(6)),threshold:Number(gapThreshold.toFixed(6))});
    const durationRatio=previous&&medianDuration>0?previous.duration/medianDuration:0;
    if(durationRatio>=1.5){
      const weight=Math.min(0.25,0.1+(durationRatio-1.5)*0.05);
      score=Math.min(1,score+weight);
      evidence.push({type:'duration_elongation',weight:Number(weight.toFixed(3)),observed:true,ratio:Number(durationRatio.toFixed(3))});
    }
    const metricValue=event.metrical_strength??event.beat_strength??event.accent_strength;
    const metricBoundary=finite(metricValue)&&Number(metricValue)>=0.75;
    if(metricBoundary){
      score=Math.min(1,score+0.15);
      evidence.push({type:'metrical_accent',weight:0.15,observed:true,value:Number(metricValue)});
    }
    const previousIndex=previous?events.indexOf(previous):-1;
    const priorHarmonicEvent=previousIndex>0?events[previousIndex-1]:null;
    const harmonicLabel=sourceEvent=>{
      const raw=sourceEvent?.roman_numeral??sourceEvent?.harmonic_function??sourceEvent?.chord_function??sourceEvent?.harmony_function;
      return raw==null?null:String(raw).trim().replace(/[\s₇₆⁷]/g,'').replace(/°/g,'dim').replace(/ø/g,'halfdim');
    };
    const priorFunction=harmonicLabel(priorHarmonicEvent);
    const terminalFunction=harmonicLabel(previous);
    const cadencePairs=[
      {from:/^(V|V7|V9|V11|V13|dominant|dominant7)$/,to:/^(I|i|I6|i6|I64|i64|tonic|tonicmajor|tonicminor|I:maj|i:maj|I:min|i:min)$/,label:'dominant_to_tonic'},
      {from:/^(viidim|viidim7|viihalfdim7|leadingtone|leadingtoneseventh)$/,to:/^(I|i|I6|i6|I64|i64|tonic|tonicmajor|tonicminor|I:maj|i:maj|I:min|i:min)$/,label:'leading_tone_to_tonic'},
      {from:/^(IV|IV7|subdominant)$/,to:/^(I|i|tonic|tonicmajor|tonicminor)$/,label:'subdominant_to_tonic'},
    ];
    const cadence=cadencePairs.find(pair=>pair.from.test(priorFunction??'')&&pair.to.test(terminalFunction??''));
    if(cadence){
      score=Math.min(1,score+0.25);
      evidence.push({type:'annotated_harmonic_cadence',weight:0.25,observed:true,source_supplied:true,progression:[priorFunction,terminalFunction],classification:cadence.label,interpretation:'recognized from source-supplied harmonic-function labels; not inferred from pitches alone'});
    }
    const terminalValue=previous?.cadential_strength??previous?.phrase_terminal_strength??previous?.terminal_strength;
    if(finite(terminalValue)){
      const value=Math.max(0,Math.min(1,Number(terminalValue)));
      const weight=value>=0.75?0.2:value>=0.5?0.1:0;
      if(weight>0) score=Math.min(1,score+weight);
      evidence.push({type:'source_cadential_strength',weight,observed:true,value,source_supplied:true,interpretation:'provided harmonic/cadential annotation; not inferred from pitch contour'});
    }
    const previousPitch=previous?pitchOf(previous):null;
    const currentPitch=pitchOf(event);
    let melodicTransition='unavailable';
    if(previousPitch!==null&&previousPitch!==undefined&&currentPitch!==null){
      const interval=currentPitch-previousPitch;
      melodicTransition=Math.abs(interval)<0.001?'repeated_pitch':Math.abs(interval)<=2?'stepwise_motion':'leap';
      evidence.push({type:'melodic_transition',weight:0,observed:true,classification:melodicTransition,boundary_interval:interval,interpretation:'descriptive only; melodic motion does not establish cadence or phrase closure'});
    }
    const motifEnd=Boolean(previous&&recurringMotifEnds.has(previous.id));
    const motifStart=recurringMotifStarts.has(event.id);
    if(motifEnd||motifStart){
      const weight=motifEnd&&motifStart?0.2:0.1;
      score=Math.min(1,score+weight);
      evidence.push({type:'recurring_motif_boundary',weight,observed:true,motif_ends_before:motifEnd,motif_starts_here:motifStart,interpretation:'recurrence supports grouping but does not independently establish a phrase boundary'});
    }
    const classification=score>=0.75?'supported':score>=0.45?'ambiguous':'insufficient';
    return {score:Number(score.toFixed(3)),classification,evidence,explicit,declaredPhrase,largeGap:Boolean(previous&&gap>=gapThreshold),melodic_transition:melodicTransition};
  };
  for(let i=0;i<events.length;i++){
    const event=events[i];
    const previous=events[i-1];
    const gap=previous?event.onset-(previous.onset+previous.duration):0;
    const assessment=assessBoundary(previous,event,gap);
    const capped=current.length>=maxPhraseEvents;
    const shouldSplit=current.length>0&&(assessment.explicit||assessment.declaredPhrase||assessment.score>=0.55||capped);
    if(shouldSplit){
      const reason=assessment.explicit?'source_declared_boundary':assessment.declaredPhrase?'source_phrase_id_change':assessment.largeGap?'inter_phrase_gap':capped?'safety_cap':'combined_boundary_evidence';
      chunks.push({events:current,reason,boundary:assessment});
      current=[];
    }
    current.push(event);
  }
  if(current.length) chunks.push({events:current,reason:'end_of_source',boundary:null});
  const phrases=[];
  for(let index=0;index<chunks.length;index++){
    const {events:chunk,reason,boundary}=chunks[index];
    const boundaryEvidence=boundary?.evidence??[];
    phrases.push({
      id:`phrase-${phrases.length+1}`,start:chunk[0].onset,
      end:chunk.at(-1).onset+chunk.at(-1).duration,
      event_ids:chunk.map(e=>e.id),
      interval_signature:intervalSignature(chunk),
      contour:contour(intervalSignature(chunk)),
      motif_ids:motifs.filter(m=>m.occurrences.some(o=>o.event_ids.some(id=>chunk.some(e=>e.id===id)))).map(m=>m.id),
      boundary_status:reason==='end_of_source'?'provisional':reason==='safety_cap'?'provisional':boundary?.classification==='supported'?'supported':boundary?.classification==='ambiguous'?'ambiguous':'provisional',
      boundary_reason:reason,
      confidence:reason==='end_of_source'?0.35:reason==='safety_cap'?0.25:boundary?.score??0.25,
      evidence:{score:boundary?.score??0,classification:boundary?.classification??'insufficient',melodic_transition:boundary?.melodic_transition??'unavailable',basis:boundaryEvidence,measured_gap_before:index>0?Number((chunk[0].onset-(chunks[index-1].events.at(-1).onset+chunks[index-1].events.at(-1).duration)).toFixed(6)):null,median_inter_onset_interval:medianIOI,median_event_duration:medianDuration,unresolved:['Cadential and harmonic evidence is not inferred unless explicitly supplied; rhythmic and metric evidence remains heuristic.']},
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
      inferred:['relative interval patterns','motif recurrence','phrase-boundary assessments combining rests, duration, supplied metrical accents, recurring-motif context and descriptive melodic transitions','provisional section groupings','form sequence'],
      unresolved:['meter unless supplied or independently inferred','cadential phrase boundaries','harmonic function unless chord/voice evidence is supplied','instrumentation and style'],
    },
    limitations:['Structural output is only as reliable as the symbolic events supplied.','Phrase and section boundaries are hypotheses, not ground truth. Phrase-boundary scores combine temporal, source-declared, optional metrical, recurring-motif and source-supplied cadential evidence, including recognized transitions between annotated harmonic functions; motif recurrence supports grouping but does not prove a phrase boundary; melodic transitions are descriptive rather than cadence detectors. Expressive pauses may still mislead, and cadences require explicit harmonic or score evidence.','A repeated contour and rhythm are evidence of structural similarity, not proof of identical musical function.'],
  };
}
