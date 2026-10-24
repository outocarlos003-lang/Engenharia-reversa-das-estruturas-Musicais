# Reverse engineer musical structure

## Goal

Investigate a supplied musical work using evidence and return both a structured reconstruction analysis and a reusable SUNO AI prompt document when the request concerns a specific track.

## Required workflow

1. Read `SUNO_PROMPT_PROTOCOL.md` and `docs/modelo-documento-reutilizavel-suno.md` for every track-decoding or SUNO-adaptation request.
2. Inspect the actual attached/provided audio. Validate its format and capabilities before selecting a decoder or analysis path. Never claim to have run a repository pipeline that was not run.
3. Validate the supplied musical events or decoded audio representation.
4. Establish event order, onset, duration and pitch where available.
5. Analyze tempo, meter, groove and rhythmic patterns.
6. Describe melodic intervals and contour when supported.
7. Examine harmonic relationships only when supported by supplied material.
8. Detect recurring motifs and their transformations when data permits.
9. Infer provisional phrases and sections; label them as provisional unless verified.
10. Describe arrangement, dynamics, timbres, production and spatial relationships only to the degree supported by evidence.
11. Separate direct measurements/observations, analytical inferences and aesthetic interpretations. Include method, time ranges, confidence and limitations where useful.
12. Convert the findings into an actionable SUNO AI prompt that preserves defining musical relationships without inventing facts.
13. Deliver a complete reusable Markdown document using the repository template. It must contain the evidence-aware analysis and a standalone copy-ready SUNO prompt.
14. Keep the SUNO prompt itself at or below 850 characters, including spaces and punctuation. Validate with `scripts/validate-suno-prompt.mjs` when available.
15. Run a final checklist: reusable document included, prompt included, prompt length valid, unsupported claims removed, limitations disclosed, and prompt is independently reusable.

## SUNO prompt requirements

The prompt should be integrated and imperative, not a disconnected adjective list. Prioritize identity, pulse/groove, instrumentation/timbres, vocal delivery if applicable, harmonic/melodic behavior, structural contrast, climax/resolution, and production/mix. Omit unsupported dimensions rather than filling them by guesswork. Do not reproduce copyrighted lyrics or request exact imitation of a living artist's voice.

## Evidence discipline

Use `measured` for direct observations, `inferred` for analytical conclusions and `interpreted` for semantic or aesthetic judgments. Clearly identify estimated keys, chords, tempo, and section boundaries as candidates when not verified.

Never use a previous user's material as a built-in fixture. Test analyzers with synthetic or separately licensed musical examples.
