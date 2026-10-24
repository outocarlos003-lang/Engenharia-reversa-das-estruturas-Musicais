# ERM MCP Contracts

O ERM usa o mesmo princípio de catálogo de ferramentas do REA: cada operação tem uma responsabilidade investigativa delimitada e deve produzir resultados auditáveis.

## Artifact

`inspect_audio_artifact`

Retorna formato, duração, canais, sample rate, bit depth quando disponível, hashes e limitações do arquivo.

## Signal

`extract_audio_features`

Extrai RMS/LUFS quando suportado, crest factor, centroid, rolloff, flux, zero crossing, energia por banda, correlação e largura estéreo.

## Time / rhythm

`detect_tempo_meter`, `detect_events`

Investiga BPM, compasso provável, grade temporal, ataques, transientes e padrões rítmicos.

## Harmony

`estimate_harmonic_center`

Estima centro tonal, modo, classes de altura, estabilidade e mudanças harmônicas. Deve registrar ambiguidade.

## Structure

`segment_music`, `find_repeated_sections`, `analyze_motifs`

Constrói a hierarquia evento → motivo → seção → forma, com fronteiras e confiança.

## Arrangement / production

`analyze_instrument_layers`, `analyze_dynamics`, `analyze_stereo`

Descreve camadas funcionais, densidade, dinâmica, panorama, largura e evolução de produção.

## Semantics

`classify_genre`, `analyze_aesthetics`

Gera classificações como inferências interpretáveis. Nunca deve apresentar gênero ou estética como uma medição física.

## Reconstruction

`build_reconstruction_spec`

Converte os achados em uma especificação independente do DAW, preservando forma, relações temporais, funções instrumentais, dinâmica e restrições.

`compare_reconstructions`

Compara uma referência e uma reconstrução por métricas estruturais e registra desvios.

`explain_evidence`

Explica quais observações sustentaram uma conclusão e quais pontos permanecem incertos.
