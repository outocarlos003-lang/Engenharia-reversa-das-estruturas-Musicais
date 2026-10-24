import { analysisReport, evidence, OBSERVATION_TYPES } from './model.mjs';

export function createPipeline({ probes = {}, analyzers = {} } = {}) {
  return {
    async inspect(target) {
      const artifact = await probes.artifact?.(target) ?? { path: target };
      const observations = [];
      const push = (item) => observations.push(item);

      if (probes.signal) push(await probes.signal(target));
      if (probes.metadata) push(await probes.metadata(target));

      const features = analyzers.features ? await analyzers.features(target) : null;
      const tempo = analyzers.tempo ? await analyzers.tempo(target, features) : null;
      const harmony = analyzers.harmony ? await analyzers.harmony(target, features) : null;
      const events = analyzers.events ? await analyzers.events(target, features) : [];
      const sections = analyzers.sections ? await analyzers.sections(target, features, events) : [];
      const motifs = analyzers.motifs ? await analyzers.motifs(target, features, events, sections) : [];
      const genre = analyzers.genre ? await analyzers.genre({ target, features, tempo, harmony, sections }) : [];
      const aesthetics = analyzers.aesthetics ? await analyzers.aesthetics({ target, features, tempo, harmony, sections, genre }) : {};
      const production = analyzers.production ? await analyzers.production({ target, features, sections }) : {};
      const reconstruction = analyzers.reconstruction ? await analyzers.reconstruction({ target, tempo, harmony, events, motifs, sections, genre, aesthetics, production }) : null;

      if (tempo) push(evidence({ id: 'tempo', claim: 'tempo', value: tempo, type: OBSERVATION_TYPES.INFERRED, confidence: tempo.confidence ?? 0.5 }));
      if (harmony) push(evidence({ id: 'harmony', claim: 'harmonic_center', value: harmony, type: OBSERVATION_TYPES.INFERRED, confidence: harmony.confidence ?? 0.5 }));

      return analysisReport({ target, artifact, observations, events, motifs, sections, form: sections, genre, aesthetics, production, reconstruction });
    },
  };
}
