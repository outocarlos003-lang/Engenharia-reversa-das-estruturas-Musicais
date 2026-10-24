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

## Núcleo estrutural inicial

src/analysis/structural-engine.mjs implementa uma primeira camada de inferência sobre eventos musicais simbólicos:

- compara janelas de eventos por contorno melódico e intervalos entre ataques normalizados;
- identifica motivos recorrentes mesmo quando aparecem transpostos;
- relaciona ocorrências por transposição, inversão, retrogradação e retrogradação invertida;
- detecta aumentação e diminuição rítmica quando as proporções entre ataques permanecem consistentes;
- inclui as relações de transformação no relatório canônico e nas respostas MCP de análise de motivos e estrutura melódica;
- associa cada transformação às frases e seções provisórias que contêm seus eventos, distinguindo relações dentro de uma frase, entre frases da mesma seção e entre seções;
- infere fronteiras frasais a partir de pausas relativas ao intervalo local entre ataques e respeita fronteiras ou IDs de frase declarados na fonte;
- combina pausas, alongamento do evento anterior, acentos métricos fornecidos, marcadores explícitos de início/fim, força cadencial fornecida pela fonte e transições entre funções harmônicas anotadas (por exemplo, V–I) e relações candidatas V–I/V–i derivadas de símbolos de acorde mais tônica explicitamente fornecida, e descrição de tons comuns e conexões por semitom quando as notas dos acordes são fornecidas, transições associadas a motivos recorrentes e descrição do movimento melódico na fronteira em uma avaliação de fronteira com classificação de evidência sustentada, ambígua ou insuficiente;
- usa o limite de quantidade de eventos apenas como salvaguarda, registrando a razão e a evidência de cada fronteira;
- organiza eventos em frases provisórias, associa recorrências a seções e deriva uma sequência formal relacional;
- separa observações, inferências e questões ainda não resolvidas;
- registra confiança e limitações, sem apresentar limites de frase/seção como verdades definitivas.

O motor aceita eventos com start ou onset, duration e pitch ou midi. O tempo deve estar numa unidade consistente, preferencialmente pulsos musicais. A inferência de frases e seções é uma hipótese inicial e ainda precisa ser fortalecida com cadências, hierarquia métrica, vozes simultâneas e validação contra partituras ou anotações de referência. A segmentação registra a pontuação, a classificação e cada fonte de evidência disponível. A recorrência de motivos pode apoiar uma hipótese de agrupamento, mas não estabelece sozinha uma fronteira frasal. O movimento melódico na fronteira é registrado descritivamente (passo, repetição ou salto), sem ser tratado como detector de cadência. Marcadores de término, força cadencial fornecida pela fonte e transições entre funções harmônicas anotadas (por exemplo, V–I) podem apoiar a segmentação. As transições por função são reconhecidas a partir de rótulos harmônicos fornecidos; as relações por símbolos de acorde exigem também uma tônica declarada. Nenhuma delas é deduzida de notas isoladas, e a distinção entre algarismos romanos maiúsculos e minúsculos é preservada. Quando `chord_pitches` ou `chord_notes` contém alturas MIDI numéricas para os dois acordes adjacentes, o motor registra classes de altura comuns e conexões por semitom como descrição de condução de vozes; essa evidência não recebe peso cadencial, não atribui vozes individuais e não prova uma cadência. Pausas, alongamentos e acentos métricos são indícios heurísticos, não prova de frase musical; pausas expressivas podem gerar cortes indevidos, e cadências legato exigem evidência harmônica ou de partitura. As transformações são relações matemáticas entre sequências simbólicas; não provam, isoladamente, função formal ou intenção composicional. O módulo `src/analysis/structural-relations.mjs` acrescenta contexto hierárquico a essas relações, sem esconder a incerteza das fronteiras de frase e seção.


## Perfil descritivo da faixa

O relatório também pode carregar um perfil com tom emocional, produção, temática, contexto cultural, gêneros principais e secundários, andamento, tonalidade, loudness, estrutura de energia, espectro e estéreo. Esses campos ficam em `representation.track_profile`, com estado e proveniência por campo.

Os descritores subjetivos (tom emocional, produção, temática, cultura e gênero) são preservados como anotações fornecidas, não apresentados como classificação automática confirmada. Andamento pode ser obtido dos eventos simbólicos quando os onsets permitem estimá-lo; tonalidade, loudness, curva de energia, espectro e estéreo só são preenchidos quando existem dados explícitos compatíveis na fonte. Ausência de medição permanece marcada como indisponível, em vez de ser preenchida por adivinhação com verniz científico.

Exemplo de fonte JSON:

```json
{
  "tempo": {"bpm": 98},
  "key": "D minor",
  "emotional_tone": ["melancholic", "tense"],
  "genres": {
    "primary": ["trip-hop"],
    "secondary": ["ambient"]
  },
  "loudness": {"integrated_lufs": -14.2},
  "energy_structure": [
    {"section": "intro", "level": 0.2},
    {"section": "chorus", "level": 0.8}
  ],
  "events": []
}
```

## Estado atual e limitações

O motor estrutural foi adicionado como módulo independente e possui testes de unidade preparados. Ainda é necessário integrá-lo ao fluxo principal do analisador, conectar as ferramentas MCP/CLI a resultados estruturais reais e executar a suíte completa no CI. Portanto, a presença do módulo não significa que toda a pipeline do ERM já esteja operacional.



**Nenhuma música fornecida em conversas anteriores é usada como fixture ou teste deste projeto.**
