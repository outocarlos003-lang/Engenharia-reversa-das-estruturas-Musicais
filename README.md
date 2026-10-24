# Engenharia-reversa-das-estruturas-Musicais

**ERM — Reverse Engineer Musical Structures**

Um sistema de engenharia reversa musical inspirado na arquitetura conceitual do [REA](https://github.com/morluto/rea), adaptado para investigar composição, ritmo, harmonia, melodia, motivos, arranjo, forma, instrumentação, dinâmica, espacialidade, produção e estética.

> O objetivo não é classificar um arquivo de áudio. O objetivo é descobrir, com evidências, **como uma obra musical é construída**, representar essa descoberta de forma hierárquica e produzir uma especificação verificável para reconstrução estrutural.

## Princípios

- **Composition first:** o objeto central é a construção musical e suas relações internas.
- **Evidence first:** toda conclusão aponta para relações musicais observáveis, medições pertinentes ou comparações que a sustentem.
- **Observed ≠ inferred ≠ interpreted:** observações, inferências analíticas e interpretações estéticas ficam explicitamente separadas.
- **Hierarquia:** material musical → eventos → motivos → frases → seções → forma → obra.
- **Reprodução verificável:** uma reconstrução pode ser comparada com a análise original por estrutura, ritmo, métrica, harmonia, melodia, densidade, dinâmica, instrumentação e espacialidade.
- **MCP + CLI:** agentes podem investigar uma obra por ferramentas MCP ou pelo terminal.

## Equivalência conceitual com REA

| REA | ERM |
| --- | --- |
| target/application | obra/fonte musical |
| material investigado | representação musical extraída |
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


## Análise de sinal PCM (sem leitura de arquivos de áudio)

O módulo `src/analysis/audio-signal.mjs` calcula métricas a partir de amostras PCM **já decodificadas e normalizadas em `[-1, 1]`**. Não abre nem decodifica WAV, MP3 ou outros arquivos/container. Para usar a análise acústica, forneça as amostras em JSON com `audio_samples` e `sample_rate_hz`; canais podem ser representados como quadros `[[L, R], ...]` ou como amostras intercaladas acompanhadas de `audio_channels`.

Exemplo de estrutura de entrada (amostras ilustrativas, não uma música):

```json
{
  "events": [],
  "sample_rate_hz": 8000,
  "audio_channels": 1,
  "audio_samples": [0.0, 0.1, 0.0, -0.1]
}
```

A análise produz pico e RMS em dBFS, fator de crista, curva RMS em janelas de 100 ms e descritores espectrais por FFT (centroide, roll-off a 85%, flatness e proporção de energia por banda). Também calcula um **candidato de centro tonal** por perfil cromático e correlação Krumhansl–Schmuckler, registrando margem, confiança heurística e limitações; isso não substitui análise harmônica validada. Para áudio com dois ou mais canais, também calcula correlação entre L/R e relação de energia side/mid.

A análise temporal também identifica **candidatos a transição de energia** comparando bins RMS de 1 segundo e sinalizando mudanças locais de pelo menos 5 dB, com separação mínima de 2 segundos entre candidatos. Cada resultado inclui tempo aproximado, diferença de nível, RMS antes/depois e confiança heurística. Isso não identifica verso, refrão, ponte ou fronteiras formais confirmadas: pausas, automação de volume, mudanças de arranjo e eventos acústicos podem causar falsos positivos. Os candidatos e a curva RMS alimentam a dimensão canônica `energy_structure` quando não há anotação explícita que tenha precedência.

Também é calculada uma **curva espectral temporal** em resumos aproximados de 1 segundo, com centroide espectral e proporção de energia nas bandas baixa, média e alta. Variações locais de centroide de pelo menos 25% ou mudança de distribuição entre bandas de pelo menos 0,20 geram `spectral_change_candidates`. O sistema combina candidatos espectrais e de energia quando ocorrem a até 1 segundo de distância em `combined_transition_candidates`, identificando quais evidências coincidem. Coincidência entre energia e espectro fortalece a relevância acústica do candidato, mas não confirma uma fronteira formal; a dimensão canônica `spectrum` inclui resumo global, curva temporal e candidatos espectrais, e `energy_structure` inclui os candidatos combinados. A curva espectral também gera uma **medida heurística de novidade** (`spectral_novelty_curve`), baseada na distância de cosseno entre vetores espectrais de janelas adjacentes, e candidatos de novidade em máximos locais. Janelas não adjacentes com similaridade de cosseno de pelo menos 0,98 são registradas em `spectral_recurrence_candidates` como possíveis recorrências de perfil acústico. Isso é apenas similaridade espectral grosseira: não demonstra repetição de melodia, ritmo, harmonia ou seção formal, e materiais distintos podem compartilhar timbre e distribuição de frequências. Como passo adicional, `spectral_sequence_recurrence_candidates` compara sequências alinhadas de três janelas espectrais e exige similaridade média de pelo menos 0,97. A busca de recorrência limita a comparação a no máximo 600 posições amostradas para manter o custo computacional controlado. Sequências semelhantes são evidência mais contextual do que uma janela isolada, mas ainda não provam repetição musical: o método não modela diretamente alturas melódicas, ritmo, harmonia nem variações de arranjo. Quando a mesma entrada também fornece eventos simbólicos e declara explicitamente `time_unit: "seconds"` ou `time_unit: "beats"` junto de `tempo.bpm`, o analisador cruza ocorrências de motivos simbólicos com recorrências espectrais próximas no tempo e expõe `cross_modal_recurrence_candidates`. Essa fusão só é habilitada com unidades temporais explícitas para evitar alinhar segundos e pulsos por suposição. É uma hipótese de correspondência temporal, não prova de que os eventos simbólicos foram extraídos do mesmo áudio.

**Limites importantes:** dBFS de pico/RMS não são LUFS integrados nem true peak dBTP; descritores espectrais não identificam automaticamente instrumentos, gênero ou técnica de produção. A estimativa de tonalidade é apenas uma hipótese estatística, especialmente frágil em trechos curtos, percussivos, modais ou com modulações. Os dados devem ser decodificados previamente por quem os fornece; leitura de arquivos WAV está fora do escopo desta etapa.

## Estado atual e limitações

O motor estrutural está integrado ao analisador e às ferramentas MCP/CLI. Uma verificação automatizada de fronteira bloqueia regressões que tentem introduzir conceitos técnicos alheios à representação composicional. A suíte completa ainda exige estabilização: o CI continua apontando falhas em segmentação frasal e em alguns módulos auxiliares.



**Nenhuma música fornecida em conversas anteriores é usada como fixture ou teste deste projeto.**


## Dimensões de análise musical e sonora

A análise da obra deve combinar atributos perceptivos, contextuais, musicais e acústicos. Cada atributo deve registrar **valor observado**, **método/fonte**, **confiança**, **intervalo temporal** e **limitações**. Não confundir uma medida de áudio com uma interpretação estética.

| Dimensão | O que investigar | Evidências e representações sugeridas |
| --- | --- | --- |
| Tom emocional | Clima afetivo percebido e sua evolução ao longo da obra | Valência, energia percebida, tensão, serenidade, tristeza, euforia; anotar se é inferência automática ou interpretação humana |
| Produção | Técnicas e escolhas de gravação, edição, arranjo de mixagem e masterização | Reverb, delay, compressão, saturação, distorção, automação, camadas, textura e qualidade da gravação; separar indícios audíveis de suposições sobre o processo |
| Temática | Assuntos, imagens, narrativa e motivos líricos ou instrumentais | Letras quando disponíveis, imagens recorrentes, motivos musicais associados, perspectiva narrativa e mudanças por seção |
| Cultura | Contexto histórico, geográfico, social e tradição musical | Instrumentação, idioma, práticas performáticas, referências documentadas e contexto de circulação; evitar inferir identidade cultural apenas pelo som |
| Gêneros principais | Tradição ou gênero que melhor descreve a identidade dominante | Rótulos ordenados, justificativa por ritmo, harmonia, timbre, forma e convenções estilísticas |
| Gêneros secundários | Influências, fusões e convenções complementares | Rótulos adicionais com evidências específicas e confiança independente |
| Andamento | Velocidade e organização do pulso | BPM estimado, faixa de confiança, mudanças de andamento, meio-tempo/dobro-tempo e estabilidade do pulso |
| Tom (tonalidade) | Centro tonal e organização harmônica | Tônica, modo maior/menor ou outra organização modal, perfil de confiança, acordes e regiões de modulação; distinguir estimativa automática de análise validada |
| Loudness | Intensidade sonora percebida e variação de nível | Loudness integrado e por seção em LUFS, loudness range (LRA), true peak em dBTP e dinâmica; informar padrão de medição e janela |
| Estrutura de energia | Evolução da intensidade e densidade ao longo do tempo | Curva temporal de energia RMS ou loudness, envelope, transientes, densidade de eventos e mudanças entre intro, versos, refrões, pontes e final |
| Espectro | Distribuição de energia por frequência e conteúdo tímbrico | Centroide espectral, roll-off, largura de banda, fluxo espectral, bandas de frequência e evolução temporal; considerar a taxa de amostragem |
| Estéreo | Distribuição espacial entre canais e sensação de largura | Correlação L/R, diferença lateral/central, largura estéreo, panorama e compatibilidade mono; distinguir largura medida de percepção subjetiva |
| Instrumental / fontes sonoras | Presença de conteúdo vocal e fontes instrumentais identificadas | Instrumentos/fontes documentados, voz cantada ou falada, backing vocals/coral, método de identificação, confiança e limitações |

### Formato recomendado para cada atributo

- `id`: identificador estável da dimensão.
- `value`: valor, rótulo ou descrição inferida.
- `unit`: unidade quando aplicável (por exemplo, BPM, LUFS, dBTP, Hz).
- `time_range`: início e fim da evidência, ou indicação de que se aplica à obra inteira.
- `method`: método, ferramenta, modelo ou protocolo de anotação.
- `evidence`: medições, eventos, trechos ou observações que sustentam a conclusão.
- `confidence`: confiança entre 0 e 1, quando o método permitir.
- `status`: `observed`, `inferred` ou `interpreted`.
- `limitations`: ambiguidades, condições de medição e possíveis explicações alternativas.

### Regras de interpretação

1. **Contextualizar no tempo:** atributos globais não devem apagar contrastes entre seções.
2. **Separar medição e percepção:** LUFS, BPM e descritores espectrais não equivalem diretamente a emoção, groove ou qualidade artística.
3. **Permitir múltiplos rótulos:** gêneros, emoções e referências culturais podem coexistir; registrar evidência e confiança para cada um.
4. **Não inventar contexto:** alegações sobre intenção, cultura, letra ou processo de estúdio exigem fonte ou devem ser marcadas como hipótese.
5. **Registrar incerteza:** tonalidade ambígua, andamento em meio-tempo/dobro-tempo e estimativas estéreo dependentes do arranjo devem permanecer explicitamente incertos.
6. **Analisar por seção e globalmente:** preservar tanto o resumo da obra quanto a evolução temporal de cada parâmetro.

A especificação detalhada, incluindo definições operacionais e exemplos de evidência, está em [docs/dimensoes-de-analise-musical.md](docs/dimensoes-de-analise-musical.md). O contrato JSON Schema para registros dessas dimensões está em [schemas/musical-dimensions.schema.json](schemas/musical-dimensions.schema.json). O analisador agora inclui `musical_dimensions` no relatório canônico e nas respostas MCP, com treze dimensões — incluindo `instrumental_sound_sources` — preservando dados ausentes como desconhecidos ou não avaliados. As dimensões só são inferidas quando há metadados ou evidência simbólica apropriada; loudness, espectro e outras medidas que exigem áudio bruto não são inventadas.
