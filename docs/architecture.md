# Arquitetura ERM

O ERM preserva o padrão investigativo do REA, mas troca o domínio de engenharia reversa de software pelo domínio da construção musical.

## Camadas

1. **Source boundary** — recebe uma fonte sonora ou representação musical. O formato do arquivo fica fora do modelo composicional.
2. **Musical representation** — converte a fonte em uma representação dos elementos musicais relevantes.
3. **Event layer** — representa ocorrências musicais temporalmente localizadas.
4. **Motif layer** — identifica material recorrente e suas transformações.
5. **Phrase layer** — representa unidades musicais articuladas por continuidade, cadência, repetição ou contraste.
6. **Section layer** — segmenta partes por função, comportamento e recorrência.
7. **Form layer** — representa a macroestrutura e as relações entre seções.
8. **Musical relations** — modela ritmo, métrica, melodia, harmonia, textura e relações entre camadas.
9. **Arrangement layer** — descreve instrumentação, distribuição de funções, densidade, dinâmica e espacialidade.
10. **Semantic layer** — infere gênero, subgênero, estética e linguagem musical.
11. **Evidence layer** — relaciona conclusões às observações que as sustentam.
12. **Reconstruction layer** — transforma a análise em especificação independente de DAW.
13. **Validation layer** — compara referência e reconstrução por relações estruturais.

## Regra de projeto

Nenhuma camada semântica deve apagar dados das camadas inferiores. Uma classificação de gênero ou estética deve continuar rastreável às relações musicais e evidências que contribuíram para a inferência.

## Domínio de equivalência

O ERM não copia ferramentas proprietárias do REA. Ele reproduz sua **forma de trabalho**: catálogo de ferramentas, investigação incremental, evidência, limitações, workflows, MCP, CLI, reconstrução e validação. As ferramentas são específicas do domínio musical.
