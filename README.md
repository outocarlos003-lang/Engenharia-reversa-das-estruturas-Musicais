# Engenharia-reversa-das-estruturas-Musicais

**ERM — Reverse Engineer Musical Structures**

Um sistema de engenharia reversa musical inspirado na arquitetura conceitual do [REA](https://github.com/morluto/rea), adaptado para investigar áudio, composição, arranjo, produção e estética.

> O objetivo não é apenas classificar uma música. O objetivo é descobrir, com evidências, **como a obra é construída**, representar essa descoberta de forma hierárquica e produzir uma especificação verificável para reconstrução estrutural.

## Princípios

- **Evidence first:** toda conclusão aponta para medições, eventos ou comparações que a sustentem.
- **Observed ≠ inferred ≠ interpreted:** medições acústicas, inferências analíticas e interpretações estéticas ficam explicitamente separadas.
- **Hierarquia:** arquivo → sinal → eventos → motivos → seções → forma → estética.
- **Reprodução verificável:** uma reconstrução pode ser comparada com a análise original por estrutura, ritmo, harmonia, densidade, dinâmica, espectro e espacialidade.
- **Local-first:** o áudio pode ser analisado localmente; nenhuma música de teste é embutida neste repositório.
- **MCP + CLI:** agentes podem investigar uma faixa por ferramentas MCP ou pelo terminal.

## Equivalência conceitual com REA

| REA | ERM |
| --- | --- |
| target/application | faixa/arquivo de áudio |
| binary/artifact | áudio + metadados |
| static inspection | análise espectral, harmônica e temporal |
| runtime observation | playback/event observation, quando habilitado |
| trace/evidence | evidência acústica e musical |
| modules/components | instrumentos, camadas, motivos e seções |
| behavior | dinâmica, arranjo e evolução temporal |
| reconstruction | reconstruction spec |
| comparison | structural similarity |
| limitations | incertezas e limites analíticos |
| MCP tools | ferramentas de investigação musical |
| CLI workflows | workflows de análise/reconstrução |

## Fluxo

```text
agent/user
   ↓
ERM MCP / CLI
   ↓
probe → feature extraction → segmentation → inference
   ↓
evidence graph
   ↓
structure + genre + aesthetics + production
   ↓
reconstruction spec
   ↓
optional comparison / validation
```

## Comandos previstos

```bash
erm analyze ./faixa.flac --json
erm inspect ./faixa.wav --scope signal
erm segment ./faixa.flac
erm infer-genre ./faixa.flac
erm infer-aesthetics ./faixa.flac
erm build-reconstruction ./faixa.flac
erm compare ./original.flac ./reconstrucao.flac
erm mcp
```

## Ferramentas MCP

A primeira versão define o contrato para:

- `inspect_audio_artifact`
- `extract_audio_features`
- `detect_tempo_meter`
- `estimate_harmonic_center`
- `detect_events`
- `segment_music`
- `find_repeated_sections`
- `analyze_motifs`
- `analyze_instrument_layers`
- `analyze_dynamics`
- `analyze_stereo`
- `classify_genre`
- `analyze_aesthetics`
- `build_reconstruction_spec`
- `compare_reconstructions`
- `explain_evidence`

Cada ferramenta deve retornar evidência, confiança e limitações, seguindo o princípio investigativo do REA.

## Estado atual

Esta versão estabelece o núcleo contratual e a arquitetura. Os analisadores reais devem ser adicionados por camadas, sem transformar inferências subjetivas em fatos medidos.

**Nenhuma música fornecida em conversas anteriores é usada como fixture ou teste deste projeto.**
