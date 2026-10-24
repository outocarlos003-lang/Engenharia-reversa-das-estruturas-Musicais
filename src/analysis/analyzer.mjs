import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { analysisReport, evidence, musicalRepresentation, OBSERVATION_TYPES } from '../core/model.mjs';
import { buildReconstructionSpec } from './reconstruction.mjs';
import { inferMusicalStructure } from './structural-engine.mjs';
import { analyzeMotifTransformations } from './transformations.mjs';
import { contextualizeTransformations } from './structural-relations.mjs';
import { buildMusicalDimensions } from './musical-dimensions.mjs';
import { analyzeAudioSamples } from './audio-signal.mjs';

const LIMITATIONS = [
  'Sem áudio bruto ou eventos simbólicos confiáveis, não é possível afirmar notas, harmonia ou forma.',
  'Gênero, estética e intenção semântica são hipóteses e não fatos diretamente medidos.',
];

export async function loadMusicalSource(target) {
  if (typeof target !== 'string' || !target.trim()) throw new Error('target must be a non-empty path or JSON string');
  const raw = target.trim().startsWith('{') || target.trim().startsWith('[') ? target : await readFile(resolve(target), 'utf8');
  const parsed = JSON.parse(raw);
  const source = Array.isArray(parsed) ? {events:parsed} : parsed;
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('Musical source must be a JSON object or event array');
  const events = Array.isArray(source.events) ? source.events : [];
  for (const [i,event] of events.entries()) {
    if (!event || typeof event !== 'object') throw new Error(`events[${i}] must be an object`);
    if (event.start != null && !Number.isFinite(Number(event.start))) throw new Error(`events[${i}].start must be numeric`);
    if (event.onset != null && !Number.isFinite(Number(event.onset))) throw new Error(`events[${i}].onset must be numeric`);
    if (event.duration != null && (!Number.isFinite(Number(event.duration)) || Number(event.duration)<0)) throw new Error(`events[${i}].duration must be a non-negative number`);
  }
  return {...source,events,source:source.source??target};
}

const onset = e => Number(e.onset ?? e.start ?? 0);
const pitch = e => e.midi ?? e.pitch ?? null;
const median = values => {
  if (!values.length) return null;
  const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.floor(sorted.length/2)];
};

function compareSymbolicAndAcousticRecurrences(motifs, audioAnalysis, source) {
  const sequenceCandidates = audioAnalysis?.spectral_sequence_recurrence_candidates;
  if (!Array.isArray(sequenceCandidates) || !sequenceCandidates.length || !motifs.length) return [];
  const unit = source.time_unit ?? source.timeUnit ?? null;
  const bpm = Number(source.tempo?.bpm ?? source.bpm);
  if (unit !== 'seconds' && !(unit === 'beats' && Number.isFinite(bpm) && bpm > 0)) return [];
  const toSeconds = value => unit === 'beats' ? value * 60 / bpm : value;
  const candidates = [];
  for (const motif of motifs) {
    const occurrences = motif.occurrences ?? [];
    for (let i = 0; i < occurrences.length; i++) {
      for (let j = i + 1; j < occurrences.length; j++) {
        const first = toSeconds(Number(occurrences[i].start));
        const second = toSeconds(Number(occurrences[j].start));
        if (!Number.isFinite(first) || !Number.isFinite(second)) continue;
        const acoustic = sequenceCandidates.find(item =>
          Math.abs(item.first_sequence.start_seconds - first) <= 1.5
          && Math.abs(item.second_sequence.start_seconds - second) <= 1.5
        );
        if (!acoustic) continue;
        candidates.push({
          motif_id: motif.id,
          first_occurrence_seconds: Number(first.toFixed(3)),
          second_occurrence_seconds: Number(second.toFixed(3)),
          acoustic_sequence_match: {
            first_sequence: acoustic.first_sequence,
            second_sequence: acoustic.second_sequence,
            spectral_similarity: acoustic.similarity,
          },
          status: 'candidate_cross_modal_recurrence',
          evidence: ['symbolic motif recurrence based on melodic contour and normalized rhythm', 'nearby recurrence of aligned acoustic spectral profiles'],
          limitations: [
            'Temporal alignment requires an explicitly declared time_unit; beat-based events also require an explicit tempo in BPM.',
            'The acoustic match uses coarse spectral profiles and does not verify the same notes, rhythm or harmony in the audio.',
            'A time match within tolerance supports a hypothesis only; it does not prove that symbolic events were extracted from the supplied audio.',
          ],
        });
      }
    }
  }
  return candidates;
}

export async function analyzeMusicalSource(target, options={}) {
  const source=await loadMusicalSource(target);
  const events=[...source.events].sort((a,b)=>onset(a)-onset(b)).map((e,i)=>({...e,id:e.id??`event-${i+1}`,onset:onset(e),duration:Number(e.duration??0),pitch:pitch(e)}));
  const pitches=events.map(e=>e.pitch).map(v=>v==null?null:Number(v));
  const intervals=[];
  for(let i=1;i<pitches.length;i++) intervals.push(pitches[i]==null||pitches[i-1]==null?null:pitches[i]-pitches[i-1]);
  const iois=events.slice(1).map((e,i)=>e.onset-events[i].onset).filter(v=>v>0);
  const bpm=source.tempo?.bpm??(median(iois)?Number((60/median(iois)).toFixed(3)):null);
  const structure=inferMusicalStructure(events,options);
  const transformations=contextualizeTransformations(analyzeMotifTransformations(events,options.transformations),structure);
  const limitations=[...LIMITATIONS,...(source.limitations??[]),...structure.limitations];
  const observations=[
    evidence({id:'event-order',claim:'Ordered musical events supplied by the source',value:events.length,type:OBSERVATION_TYPES.MEASURED,sources:[String(source.source??target)]}),
    ...(intervals.some(v=>v!==null)?[evidence({id:'melodic-intervals',claim:'Successive pitch intervals derived from supplied symbolic events',value:intervals,type:OBSERVATION_TYPES.INFERRED,confidence:0.95,sources:['events.pitch or events.midi']})]:[]),
    ...(structure.motifs.length?[evidence({id:'recurring-motifs',claim:'Recurring contour and normalized rhythm patterns',value:structure.motifs.map(m=>({id:m.id,recurrence:m.recurrence,signature:m.signature})),type:OBSERVATION_TYPES.INFERRED,confidence:0.85,sources:['structural-engine']})]:[]),
    ...(transformations.length?[evidence({id:'motif-transformations',claim:'Relations between recurring musical event windows',value:transformations.map(t=>({id:t.id,melodic_relation:t.melodic_relation,rhythmic_relation:t.rhythmic_relation})),type:OBSERVATION_TYPES.INFERRED,confidence:0.82,sources:['transformations-engine']})]:[]),
  ];
  const representation=musicalRepresentation({
    tempo:{bpm,meter:source.meter??null},
    meter:source.meter??null,
    rhythm:{inter_onset_intervals:events.slice(1).map((e,i)=>Number((e.onset-events[i].onset).toFixed(6))),event_count:events.length},
    melody:{pitches,intervals,contour:structure.invariants.melodic_contour},
    harmony:source.harmony??{},
    events,motifs:structure.motifs,transformations,phrases:structure.phrases,sections:structure.sections,form:structure.form,
    dynamics:source.dynamics??{},instrumentation:source.instrumentation??{},spatial:source.spatial??{},limitations,
  });
  const audioAnalysis = source.audio_analysis ?? (source.audio_samples && source.sample_rate_hz
    ? analyzeAudioSamples({samples:source.audio_samples,sampleRate:Number(source.sample_rate_hz),channels:Number(source.audio_channels??1),vocalRegions:source.vocal_regions??source.voice_regions??source.vocal_segments??[]})
    : null);
  const dimensionsSource = audioAnalysis ? {...source,audio_analysis:audioAnalysis} : source;
  const musicalDimensions=buildMusicalDimensions(dimensionsSource,representation);
  const crossModalRecurrences=compareSymbolicAndAcousticRecurrences(structure.motifs,audioAnalysis,source);
  return analysisReport({
    target:String(source.source??target),representation,observations,events,
    musical_dimensions:musicalDimensions,
    cross_modal_recurrence_candidates:crossModalRecurrences,
    motifs:structure.motifs,transformations,phrases:structure.phrases,sections:structure.sections,form:structure.form,
    genre:[],
    aesthetics:{status:'insufficient evidence for grounded inference',dimensions:{},character_hypotheses:[]},
    production:{},
    reconstruction:buildReconstructionSpec({...representation,source:source.source??target,unresolved:limitations}),
    limitations,
  });
}

export async function runMusicalTool(name,target,options={}) {
  const report=await analyzeMusicalSource(target,options);
  const events=report.events;
  const dataBase={event_count:events.length,musical_dimensions:report.musical_dimensions,events:report.events,motifs:report.motifs,transformations:report.transformations??report.representation.transformations??[],phrases:report.phrases,sections:report.sections,form:report.form,observations:report.observations,limitations:report.limitations};
  let data=dataBase;
  switch(name){
    case 'extract_musical_features': data={...dataBase,tempo:report.representation.tempo,melody:report.representation.melody,rhythm:report.representation.rhythm};break;
    case 'detect_tempo_meter': data={tempo:report.representation.tempo,meter:report.representation.meter,evidence:report.observations,limitations:report.limitations};break;
    case 'estimate_harmonic_center': data={status:'insufficient harmonic evidence',harmony:report.representation.harmony,limitations:report.limitations};break;
    case 'detect_musical_events': data={events:report.events,event_count:events.length};break;
    case 'segment_music': data={phrases:report.phrases,sections:report.sections,form:report.form,limitations:report.limitations};break;
    case 'find_repeated_sections': data={sections:report.sections.filter(s=>(s.occurrences?.length??0)>1),motifs:report.motifs};break;
    case 'analyze_motifs': data={motifs:report.motifs,transformations:report.transformations??report.representation.transformations??[],evidence:report.observations,limitations:report.limitations};break;
    case 'analyze_melodic_structure': data={melody:report.representation.melody,motifs:report.motifs,transformations:report.transformations??report.representation.transformations??[]};break;
    case 'analyze_rhythmic_structure': data={event_count:events.length,inter_onset_intervals:report.representation.rhythm.inter_onset_intervals,motifs:report.motifs};break;
    case 'analyze_harmonic_structure': data={status:'insufficient harmonic evidence',harmony:report.representation.harmony};break;
    case 'analyze_instrument_layers': data={instrumentation:report.representation.instrumentation,status:'only source-declared layers are reported'};break;
    case 'analyze_dynamics': data={dynamics:report.representation.dynamics};break;
    case 'analyze_spatial_structure': data={spatial:report.representation.spatial};break;
    case 'classify_genre': data={status:'insufficient evidence for automatic classification',primary:[],secondary:[],candidates:[]};break;
    case 'analyze_aesthetics': data=report.aesthetics;break;
    case 'extract_musical_features': data={...dataBase,tempo:report.representation.tempo,melody:report.representation.melody,rhythm:report.representation.rhythm};break;
    case 'build_reconstruction_spec': data=report.reconstruction;break;
    case 'compare_reconstructions': {
      const otherTarget=options.other;
      if(!otherTarget) data={status:'comparison requires options.other containing the candidate source'};
      else {
        const other=await analyzeMusicalSource(otherTarget);
        const a=report.form.sequence??[],b=other.form.sequence??[],length=Math.max(a.length,b.length);
        data={form_similarity:length?a.filter((v,i)=>v===b[i]).length/length:null,reference_pattern:report.form.pattern,candidate_pattern:other.form.pattern,reference_motifs:report.motifs.length,candidate_motifs:other.motifs.length};
      }
      break;
    }
    case 'explain_evidence': data={observations:report.observations,epistemic_status:{observed:['event order','provided onsets, durations and pitches'],inferred:['intervals','motifs','provisional phrases, sections and form'],unresolved:['harmonic function','cadences','meter unless supplied']},limitations:report.limitations};break;
    default: throw new Error(`Unknown musical tool: ${name}`);
  }
  return {tool:name,data,confidence:report.observations.length?0.75:0,evidence:report.observations,limitations:report.limitations};
}
