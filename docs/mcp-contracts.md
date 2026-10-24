# Contratos MCP do ERM

O catálogo expõe operações delimitadas para investigar uma representação musical e devolver resultados rastreáveis.

## Tempo e ritmo

`detect_tempo_meter`, `analyze_rhythmic_structure`

Investiga andamento, métrica, grade temporal e padrões rítmicos a partir dos eventos fornecidos.

## Harmonia e melodia

`estimate_harmonic_center`, `analyze_harmonic_structure`, `analyze_melodic_structure`

Descreve relações tonais e melódicas sustentadas pelos dados disponíveis, registrando incertezas.

## Eventos e estrutura

`detect_musical_events`, `segment_music`, `find_repeated_sections`, `analyze_motifs`

Constrói a hierarquia evento → motivo → frase → seção → forma, com fronteiras provisórias e evidências.

## Arranjo e dinâmica musical

`analyze_instrument_layers`, `analyze_dynamics`, `analyze_spatial_structure`

Descreve camadas funcionais, densidade, dinâmica e distribuição espacial quando essas relações estão representadas na fonte.

## Interpretação

`classify_genre`, `analyze_aesthetics`

Apresenta hipóteses interpretativas sem confundi-las com observações estruturais.

## Reconstrução e validação

`build_reconstruction_spec`, `compare_reconstructions`, `explain_evidence`

Produz uma especificação estrutural, compara sequências musicais e explica quais observações sustentam cada conclusão.
