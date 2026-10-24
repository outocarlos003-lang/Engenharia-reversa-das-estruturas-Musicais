import { createPipeline } from './pipeline.mjs';
import { createMusicalRepresentation } from '../music/representation.mjs';
import { analyzeRhythm } from '../analysis/rhythm.mjs';
import { findMotifs } from '../analysis/motifs.mjs';
import { detectEvents } from '../analysis/events.mjs';
import { analyzeMelody } from '../analysis/melody.mjs';
import { analyzeHarmony } from '../analysis/harmony.mjs';
import { inferPhrases } from '../analysis/phrases.mjs';
import { segmentSections } from '../analysis/sections.mjs';
import { inferForm } from '../analysis/form.mjs';
import { classifyGenre } from '../analysis/genre.mjs';
import { analyzeAesthetics } from '../analysis/aesthetics.mjs';
import { inferSemanticCues } from '../analysis/semantics.mjs';
import { analyzeArrangement } from '../analysis/arrangement.mjs';
import { analyzeDynamics } from '../analysis/dynamics.mjs';
import { analyzeSpatial } from '../analysis/spatial.mjs';
import { analyzeProduction } from '../analysis/production.mjs';
import { buildReconstructionSpec } from '../analysis/reconstruction.mjs';

export function createDefaultPipeline() {
  return createPipeline({
    analyzers: {
      representation: source => createMusicalRepresentation(source),
      features: representation => ({
        rhythm: analyzeRhythm(representation),
        melody: analyzeMelody(representation),
        harmony: analyzeHarmony(representation),
      }),
      tempo: representation => representation.timing ?? representation.tempo ?? null,
      harmony: representation => analyzeHarmony(representation),
      events: representation => detectEvents(representation),
      motifs: representation => findMotifs({ ...representation, events: representation.events ?? [] }),
      phrases: (representation, events, motifs) => inferPhrases({ ...representation, events, motifs }),
      sections: (representation, events, motifs, phrases) => segmentSections({ ...representation, events, motifs, phrases }),
      form: (representation, sections) => inferForm(sections),
      genre: ({ representation, tempo, harmony, sections, form }) => classifyGenre({ ...representation, tempo, harmony, sections, form }),
      aesthetics: ({ representation, sections, form }) => analyzeAesthetics({ ...representation, sections, form }),
      production: ({ representation, sections }) => ({
        arrangement: analyzeArrangement({ ...representation, sections }),
        dynamics: analyzeDynamics(representation),
        spatial: analyzeSpatial(representation),
        production: analyzeProduction({ ...representation, sections }),
      }),
      reconstruction: input => buildReconstructionSpec(input),
    },
  });
}
