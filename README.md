# Engenharia-reversa-das-estruturas-Musicais

**ERM — Reverse Engineer Musical Structures**

Um sistema de engenharia reversa musical inspirado na arquitetura conceitual do [REA](https://github.com/morluto/rea), adaptado para investigar composição, ritmo, harmonia, melodia, motivos, arranjo, forma, instrumentação, dinâmica, espacialidade, produção e estética.

> O objetivo não é classificar um arquivo de áudio. O objetivo é descobrir, com evidências, **como uma obra musical é construída**, representar essa descoberta de forma hierárquica e produzir uma especificação verificável para reconstrução estrutural.

## Princípios

- **Composition first:** o objeto central é a construção musical, não o formato do arquivo que transporta o áudio.
- **Evidence first:** toda conclusão aponta para relações musicais observáveis, medições pertinentes ou comparações que a sustentem.
- **Observed ≠ inferred ≠ interpreted:** observações, inferências analíticas e interpretações estéticas ficam explicitamente separadas.
- **Hierarquia:** material musical → eventos → motivos → frases → seções → forma → obra.
- **Reprodução verificável:** uma reconstrução pode ser comparada com a análise original por estrutura, ritmo, métrica, harmonia, melodia, densidade, dinâmica, instrumentação e espacialidade.
- **Formato independente:** WAV, RIFF, FLAC, MP3 e outros contêineres/codecs não constituem a composição e não são tratados como camadas da arquitetura musical.
- **MCP + CLI:** agentes podem investigar uma obra por ferramentas MCP ou pelo terminal.

## O que não pertence ao modelo composicional

Informações como extensão do arquivo, contêiner, codec, taxa de amostragem, profundidade de bits, tamanho em bytes e outros metadados técnicos podem ser úteis para ingestão ou reprodução, mas **não são elementos da construção de uma composição**.

Por isso, decodificadores de WAV/RIFF ficam isolados na fronteira de ingestão, fora do núcleo composicional. O adaptador WAV inicial mede energia em janelas e propõe candidatos a ataques; não é transcrição polifônica e não afirma detectar notas, tonalidade ou instrumentos. Depois da ingestão, a investigação trabalha sobre a representação musical e registra as limitações do sinal extraído.

## Equivalência conceitual com REA

| REA | ERM |
| --- | --- |
| target/application | obra/fonte musical |
| binary/artifact | representação musical extraída |
| static inspection | análise rítmica, melódica, harmônica e estrutural |
| runtime observation | observação temporal de eventos musicais |
| trace/evidence | evidência musical |
| modules/components | instrumentos, camadas, motivos, frases e seções |
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
musical source → musical representation
   ↓
feature extraction → events → motifs → phrases → sections
   ↓
evidence graph
   ↓
form + harmony + rhythm + melody + arrangement + aesthetics
   ↓
reconstruction spec
   ↓
comparison / validation
```

## Comandos previstos

```bash
erm analyze <fonte-musical>
erm segment <fonte-musical>
erm infer-genre <fonte-musical>
erm infer-aesthetics <fonte-musical>
erm build-reconstruction <fonte-musical>
erm compare <obra-original> <reconstrucao>
erm mcp
```

## Ferramentas MCP

A primeira versão define o contrato para:

- `extract_musical_features`
- `detect_tempo_meter`
- `estimate_harmonic_center`
- `detect_musical_events`
- `segment_music`
- `find_repeated_sections`
- `analyze_motifs`
- `analyze_melodic_structure`
- `analyze_rhythmic_structure`
- `analyze_harmonic_structure`
- `analyze_instrument_layers`
- `analyze_dynamics`
- `analyze_spatial_structure`
- `classify_genre`
- `analyze_aesthetics`
- `build_reconstruction_spec`
- `compare_reconstructions`
- `explain_evidence`

Cada ferramenta deve retornar evidência, confiança e limitações, seguindo o princípio investigativo do REA.

## Estado atual

Esta versão estabelece o núcleo contratual e a arquitetura. Os analisadores reais devem ser adicionados por camadas, sem transformar inferências subjetivas em fatos medidos e sem confundir metadados do suporte de áudio com elementos composicionais.

**Nenhuma música fornecida em conversas anteriores é usada como fixture ou teste deste projeto.**
