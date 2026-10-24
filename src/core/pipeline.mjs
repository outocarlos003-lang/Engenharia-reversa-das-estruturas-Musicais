import { analysisReport, evidence, musicalRepresentation, OBSERVATION_TYPES } from './model.mjs';

export function createPipeline({ analyzers = {} } = {}) {
  return {
    async analyze(source) {
      const observations = [];
      const push = item => item && observations.push(item);

      const representation = analyzers.representation
        ? await analyzers.representation(source)
        : musicalRepresentation();

      const features = analyzers.features ? await analyzers.features(representation, source) : null;
      const tempo = analyzers.tempo ? await analyzers.tempo(representation, features) : null;
      const harmony = analyzers.harmony ? await analyzers.harmony(representation, features) : null;
      const events = analyzers.events ? await analyzers.events(representation, features) : representation.events;
      const motifs = analyzers.motifs ? await analyzers.motifs(representation, events) : representation.motifs;
      const phrases = analyzers.phrases ? await analyzers.phrases(representation, events, motifs) : representation.phrases;
      const sections = analyzers.sections ? await analyzers.sections(representation, events, motifs, phrases) : representation.sections;
      const form = analyzers.form ? await analyzers.form(representation, sections) : representation.form;
      const genre = analyzers.genre ? await analyzers.genre({ representation, tempo, harmony, sections, form }) : [];
      const aesthetics = analyzers.aesthetics ? await analyzers.aesthetics({ representation, tempo, harmony, sections, form, genre }) : {};
      const production = analyzers.production ? await analyzers.production({ representation, sections }) : {};
      const reconstruction = analyzers.reconstruction ? await analyzers.reconstruction({ representation, tempo, harmony, events, motifs, phrases, sections, form, genre, aesthetics, production }) : null;

      if (tempo) push(evidence({ id: 'tempo', claim: 'tempo', value: tempo, type: OBSERVATION_TYPES.INFERRED, confidence: tempo.confidence ?? 0.5 }));
      if (harmony) push(evidence({ id: 'harmony', claim: 'harmonic_center', value: harmony, type: OBSERVATION_TYPES.INFERRED, confidence: harmony.confidence ?? 0.5 }));

      return analysisReport({
        target: source,
        representation: { ...representation, tempo: tempo ?? representation.tempo, harmony: harmony ?? representation.harmony, events, motifs, phrases, sections, form },
        observations,
        events,
        motifs,
        phrases,
        sections,
        form,
        genre,
        aesthetics,
        production,
        reconstruction,
      });
    },
  };
}
