# Dimensões de análise musical

Este documento define um vocabulário operacional para descrever uma obra musical por dimensões emocionais, estéticas, culturais e acústicas. A análise pode ser global ou segmentada por seção e deve preservar a diferença entre observação, inferência e interpretação.

## Modelo de registro

Campos recomendados: id, value, unit, time_range, method, evidence, confidence, status e limitations.

Exemplo ilustrativo, não uma análise de faixa real:
- id: tempo
- value: 120
- unit: BPM
- time_range: início 0 s, fim 32 s
- method: estimativa de pulso
- evidence: pulsação regular nos ataques; estimativa consistente em duas janelas
- confidence: 0,87
- status: inferred
- limitations: possível interpretação em meio-tempo

Os intervalos temporais devem usar uma unidade declarada e consistente. Quando não houver valor numérico justificável, use uma descrição qualitativa e explique a evidência.

## Dimensões

### 1. Tom emocional

Descreve o afeto percebido e sua evolução, sem tratar uma emoção como verdade objetiva. Pode registrar valência (negativa–positiva), ativação (baixa–alta), tensão, serenidade, melancolia, euforia ou ambivalência. Vincule cada leitura a trechos, letra disponível, harmonia, dinâmica, timbre, articulação e contexto formal. Não deduza o estado emocional real do artista ou do ouvinte.

### 2. Produção

Documenta características audíveis de gravação, edição, mixagem e masterização: reverberação, delay, compressão, saturação, distorção, automação, camadas, profundidade aparente, ruído, clipping e equilíbrio entre fontes. Diferencie “há cauda de reverberação audível” de “foi usado um equipamento específico”: a primeira pode ser observação; a segunda exige evidência externa.

### 3. Temática

Registra assuntos, imagens, narrativa, perspectiva e motivos recorrentes. Em músicas com letra, use apenas a letra efetivamente disponível e identifique a fonte. Em obras instrumentais, descreva associações como interpretação, não como significado comprovado. Relacione mudanças temáticas a versos, refrões, interlúdios e transformações de motivos.

### 4. Cultura

Registra contextos históricos, geográficos, sociais e tradições musicais com fontes verificáveis. Evidências podem incluir idioma, instrumentos, padrões rítmicos, técnicas de execução, convenções de gênero e documentação da obra. Timbre ou escala isolados não bastam para atribuir etnia, nacionalidade, religião ou identidade cultural.

### 5. Gêneros principais

Ordena os gêneros que melhor explicam a identidade musical dominante. Para cada rótulo, documente sinais rítmicos, harmônicos, tímbricos, vocais, formais e de produção. Evite atribuir gênero com base em apenas um instrumento ou numa única característica.

### 6. Gêneros secundários

Registra influências, subgêneros e fusões complementares. Cada rótulo deve ter justificativa própria e confiança independente; não é obrigatório preencher esta dimensão se a evidência for insuficiente. Diferencie convenção estilística audível de influência histórica documentada.

### 7. Andamento

Registra BPM estimado, estabilidade do pulso, rubato, acelerações, desacelerações e mudanças métricas quando detectáveis. Inclua método, faixa temporal e confiança. Avalie hipóteses de meio-tempo e dobro-tempo; não confunda BPM estimado com sensação subjetiva de groove. O compasso e a subdivisão devem ser registrados separadamente do andamento.

### 8. Tom / tonalidade

Registra centro tonal, tônica, modo, acordes, regiões harmônicas e possíveis modulações. Indique se a conclusão deriva de análise simbólica, partitura, transcrição ou estimativa de áudio. Em música modal, atonal, polifônica ou com ambiguidade tonal, não force uma tonalidade única. Uma estimativa automática deve incluir confiança e alternativas plausíveis.

### 9. Loudness

Caracteriza nível sonoro percebido e dinâmica. Sempre informe a métrica: loudness integrado e por seção em LUFS, loudness range (LRA) e true peak em dBTP, quando disponíveis. Documente padrão, janela, taxa de amostragem e canais usados. Loudness não é sinônimo de pico de amplitude, energia musical ou qualidade de masterização.

### 10. Estrutura de energia

Representa a evolução temporal da intensidade e da densidade musical. Pode combinar RMS, envelope de amplitude, loudness por janela, taxa de transientes, densidade de eventos, atividade espectral e instrumentação. Marque aumentos, quedas, builds, drops, pausas e clímax com intervalos temporais e associação a seções. Não reduza “energia” a uma única medida acústica.

### 11. Espectro

Descreve distribuição de energia no domínio da frequência e mudanças tímbricas. Descritores possíveis: centroide espectral, roll-off, largura de banda, fluxo espectral, contraste espectral e energia por bandas. Registre tamanho da janela, hop size, taxa de amostragem e normalização. Esses descritores são aproximações e não identificam, sozinhos, um instrumento ou uma fonte sonora.

### 12. Estéreo

Descreve imagem espacial e diferenças entre canais. Quando disponíveis, use correlação entre L/R, diferença Mid/Side, largura estéreo, panorama por camada e compatibilidade mono. Registre se o sinal é mono, estéreo ou multicanal e se a análise é global ou por frequência/seção. Uma medida de largura não equivale necessariamente à largura percebida, e correlação baixa não significa automaticamente boa espacialidade.

### 13. Instrumental / fontes sonoras

Descreve se o material disponível indica conteúdo instrumental, vocal ou misto, e quais fontes sonoras/instrumentos estão documentados ou identificados. Registre separadamente a presença de voz (cantada, falada, coral ou backing vocals), as fontes instrumentais (por exemplo, bateria, baixo, guitarra, piano, sintetizadores e instrumentos acústicos) e a confiança de cada identificação. Diferencie metadados fornecidos, anotação humana e detecção automática. Não conclua que uma faixa é instrumental apenas porque não há metadados vocais; na ausência de evidência, mantenha a presença vocal como desconhecida. O espectro isolado não identifica com segurança instrumentos específicos.

### 14. Identificação e análise mecânica da voz

Descreve características acústicas e técnicas observáveis da voz humana, sem confundir o som gravado com uma conclusão clínica ou anatômica sobre o aparelho vocal. Quando houver evidência adequada, registrar separadamente:

- **Identificação da fonte vocal:** voz cantada, fala, rap, vocalizações, coro, backing vocals e possíveis camadas simultâneas; indicar se a fonte é anotação humana, metadado ou saída de um modelo.
- **Altura e extensão:** trajetória de F0, tessitura observada no trecho, extensão estimada, estabilidade de afinação, portamentos e transições de registro. Informar unidade, janela e tratamento de trechos sem F0 confiável.
- **Registro e mecanismo de fonação:** descrições como modal, falsete, vocal fry ou voz soprosa apenas quando sustentadas por análise ou anotação especializada; não deduzir mecanismo fisiológico apenas por timbre.
- **Timbre e ressonância acústica:** medidas ou descrições de formantes, inclinação espectral, harmônicos, aspereza, soprosidade e nasalidade percebida. Diferenciar medidas acústicas de rótulos perceptivos; formantes podem ser afetados por vogal, idioma, microfone e processamento.
- **Articulação e emissão:** legato/staccato vocal, ataques, finais, consoantes, dicção, duração de vogais, respirações audíveis e coordenação temporal com o acompanhamento.
- **Modulação e dinâmica:** presença, taxa e extensão do vibrato; intensidade e variação dinâmica; estabilidade de notas sustentadas, glissandi e ornamentos, sempre com intervalo temporal.
- **Processamento vocal:** indícios ou metadados de correção de afinação, compressão, distorção, reverberação, delay, duplicação e harmonização. Não afirmar ferramenta ou cadeia de estúdio específica sem fonte verificável.

Cada característica deve incluir `method`, `evidence`, `confidence`, `time_range` e `limitations`. A presença de uma voz não prova que seja possível identificar uma pessoa; não inferir identidade, idade, gênero, saúde ou condição fisiológica do intérprete. Áudio misturado, ruído, reverberação e efeitos podem tornar a análise incerta. Na ausência de evidência específica de voz, manter esta dimensão como desconhecida; descritores espectrais genéricos não bastam para identificar técnica vocal.

## Campos comuns e validação

Cada resultado deve, sempre que possível, conter:
- id, value e unit (quando aplicável);
- time_range e escopo (global ou uma seção identificada);
- method e versão da ferramenta/modelo;
- evidence rastreável;
- confidence entre 0 e 1, se calibrada pelo método;
- status: observed, inferred ou interpreted;
- limitations e hipóteses alternativas.

Não use confiança numérica como se fosse probabilidade calibrada quando o método não oferece essa garantia. Valores ausentes devem ser explicitamente desconhecidos ou não avaliados, nunca preenchidos por suposição. Comparações entre faixas exigem métodos, janelas e condições de medição compatíveis.

## Relação com a engenharia reversa estrutural

Estas dimensões complementam, mas não substituem, a análise de eventos, motivos, frases, seções, forma, harmonia, ritmo, melodia, instrumentação e relações de transformação. O relatório final deve conectar as descrições estéticas e acústicas às evidências temporais e estruturais relevantes, preservando incertezas.
