import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { analysisReport, evidence, musicalRepresentation, OBSERVATION_TYPES } from '../core/model.mjs';
import { buildReconstructionSpec } from './reconstruction.mjs';

const LIMITATIONS = [
  'A análise automática desta versão aceita JSON musical estruturado; áudio bruto ainda exige um adaptador DSP/ML.',
  'Gênero, estética e intenção semântica são hipóteses e não fatos diretamente medidos.',
];

export async function loadMusicalSource(target) {
  if (typeof target !== 'string' || !target.trim()) throw new Error('target must be a non-empty path or JSON string');
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

function round(n, digits = 3) { return Number(n.toFixed(digits)); }

function derive(source) {
  const events = [...source.events].map((e, i) => ({
    ...e, id: e.id ?? `event-${i + 1}`,
    start: e.start == null ? null : Number(e.start),
    duration: e.duration == null ? null : Number(e.duration),
    pitch: e.pitch == null ? null : Number(e.pitch),
  })).sort((a, b) => (a.start ?? Infinity) - (b.start ?? Infinity));
  const timed = events.filter(e => e.start != null);
  const starts = timed.map(e => e.start);
  const deltas = starts.slice(1).map((t, i) => t - starts[i]).filter(n => n > 0);
  const median = values => {
    if (!values.length) return null;
    const s = [...values].sort((a,b)=>a-b), m = Math.floor(s.length/2);
    return s.length % 2 ? s[m] : (s[m-1]+s[m])/2;
  };
  const iois = deltas;
  const inferredBpm = median(iois) ? round(60 / median(iois)) : null;
  const pitches = events.filter(e => e.pitch != null).map(e => e.pitch);
  const intervals = pitches.slice(1).map((p,i)=>p-pitches[i]);
  const pitchClasses = pitches.map(p => ((Math.round(p)%12)+12)%12);
  const pcCounts = Array(12).fill(0);
  pitchClasses.forEach(p=>pcCounts[p]++);
  const harmonicCenter = pcCounts.some(Boolean) ? pcCounts.map((count,pitchClass)=>({pitchClass,count})).sort((a,b)=>b.count-a.count)[0] : null;
  const eventGroups = new Map();
  for (const e of events) {
    const key = e.pitch == null ? null : String(e.pitch);
    if (key != null) eventGroups.set(key, (eventGroups.get(key) ?? 0) + 1);
  }
  const repeatedPitches = [...eventGroups.entries()].filter(([,count])=>count>1).map(([pitch,count])=>({pitch:Number(pitch),count}));
  const sections = source.sections ?? [];
  const observations = [];
  if (inferredBpm != null) observations.push(evidence({id:'tempo-estimate',claim:'tempo_bpm_estimate',value:inferredBpm,type:OBSERVATION_TYPES.INFERRED,confidence:0.35,sources:timed.map(e=>e.id),limitations:['Estimativa baseada na mediana dos intervalos entre inícios; pode refletir subdivisões ou múltiplos do pulso.']}));
  if (harmonicCenter) observations.push(evidence({id:'pitch-class-mode',claim:'most_frequent_pitch_class',value:harmonicCenter,type:OBSERVATION_TYPES.MEASURED,confidence:1,sources:events.filter(e=>e.pitch!=null).map(e=>e.id),limitations:['Classe de altura mais frequente não equivale necessariamente à tonalidade ou centro harmônico.']}));
  return {
    events, sections, observations,
    tempo: source.tempo ?? (inferredBpm ? {bpm:inferredBpm, confidence:0.35, method:'median-inter-onset interval'} : null),
    meter: source.meter ?? null,
    rhythm:{ inter_onset_intervals:iois, median_inter_onset:median(iois), event_count:events.length },
    melody:{ pitches, intervals, repeated_pitches:repeatedPitches },
    harmony:{ pitch_class_counts:pcCounts, most_frequent_pitch_class:harmonicCenter },
    motifs: source.motifs ?? [],
    phrases: source.phrases ?? [],
    form: source.form ?? [],
    instrumentation: source.instrumentation ?? {},
    dynamics: source.dynamics ?? {},
    spatial: source.spatial ?? {},
    limitations:[...LIMITATIONS,...(source.limitations ?? [])],
  };
}

export async function analyzeMusicalSource(target) {
  const source = await loadMusicalSource(target);
  const d = derive(source);
  const representation = musicalRepresentation({...d, source:source.source});
  return analysisReport({target:source.source,representation,observations:d.observations,events:d.events,motifs:d.motifs,phrases:d.phrases,sections:d.sections,form:d.form,genre:source.genre ?? [],aesthetics:source.aesthetics ?? {},production:source.production ?? {},limitations:d.limitations});
}

export async function runMusicalTool(name, target, options = {}) {
  const report = await analyzeMusicalSource(target);
  const r = report.representation;
  const evidence = report.observations;
  const result = (data, limitations = report.limitations) => ({tool:name,target:report.target,data,evidence,confidence:evidence.length ? Math.min(...evidence.map(e=>e.confidence)) : 0.2,limitations});
  switch (name) {
    case 'extract_musical_features': return result({event_count:r.events.length,tempo:r.tempo,meter:r.meter,rhythm:r.rhythm,melody:r.melody,harmony:r.harmony,instrumentation:r.instrumentation,dynamics:r.dynamics,spatial:r.spatial});
    case 'detect_tempo_meter': return result({tempo:r.tempo,meter:r.meter,rhythm:r.rhythm});
    case 'estimate_harmonic_center': return result(r.harmony);
    case 'detect_musical_events': return result(r.events);
    case 'segment_music': return result(r.sections);
    case 'find_repeated_sections': return result({sections:r.sections, repeated_events:r.events.filter(e=>e.pitch!=null).reduce((a,e)=>(a[e.pitch]=(a[e.pitch]??0)+1,a),{})});
    case 'analyze_motifs': return result({motifs:r.motifs, repeated_pitch_values:r.melody.repeated_pitches});
    case 'analyze_melodic_structure': return result(r.melody);
    case 'analyze_rhythmic_structure': return result(r.rhythm);
    case 'analyze_harmonic_structure': return result(r.harmony);
    case 'analyze_instrument_layers': return result(r.instrumentation);
    case 'analyze_dynamics': return result(r.dynamics);
    case 'analyze_spatial_structure': return result(r.spatial);
    case 'classify_genre': return result({labels:report.genre, status:report.genre.length?'provided labels, not independently validated':'insufficient evidence for automatic classification'},['Genre classification is not implemented; no label is invented.',...report.limitations]);
    case 'analyze_aesthetics': return result({assessment:report.aesthetics,status:'interpretive; source-provided only'},report.limitations);
    case 'build_reconstruction_spec': return result(buildReconstructionSpec({...r,source:report.target,tempo:r.tempo,unresolved:report.limitations}));
    case 'compare_reconstructions': {
      const otherTarget = options.other ?? options.compare_to;
      if (!otherTarget) return result({requires:'options.other or options.compare_to',source:report.target},['Provide options.other with a second JSON source to compare.',...report.limitations]);
      const other = (await analyzeMusicalSource(otherTarget)).representation;
      const left = JSON.stringify({tempo:r.tempo,meter:r.meter,events:r.events,sections:r.sections,form:r.form});
      const right = JSON.stringify({tempo:other.tempo,meter:other.meter,events:other.events,sections:other.sections,form:other.form});
      return result({identical_serialized_structure:left===right,source_summary:{tempo:r.tempo,event_count:r.events.length,section_count:r.sections.length},comparison_summary:{tempo:other.tempo,event_count:other.events.length,section_count:other.sections.length}});
    }
    case 'explain_evidence': return result({observations:evidence,principles:['Measured values are distinct from inferred values.','Confidence is specific to each claim.','Absence of evidence is not evidence of absence.']});
    default: throw new Error(`Unknown musical tool: ${name}`);
  }
}
