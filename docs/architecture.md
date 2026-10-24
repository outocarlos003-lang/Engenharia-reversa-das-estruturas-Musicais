# Arquitetura ERM

O ERM preserva o padrão investigativo do REA, mas troca o domínio de engenharia reversa de software pelo domínio musical.

## Camadas

1. **Artifact layer** — identifica o arquivo e seus metadados.
2. **Signal layer** — extrai medições acústicas e espaciais.
3. **Event layer** — localiza ataques, transientes e ocorrências relevantes.
4. **Motif layer** — agrupa material recorrente.
5. **Section layer** — segmenta partes musicais por comportamento e repetição.
6. **Form layer** — representa a macroestrutura hierárquica.
7. **Semantic layer** — infere gênero, subgênero, estética e linguagem de produção.
8. **Evidence layer** — relaciona conclusões às observações que as sustentam.
9. **Reconstruction layer** — transforma a análise em uma especificação de reconstrução.
10. **Validation layer** — compara referência e reconstrução.

## Regra de projeto

Nenhuma camada semântica deve apagar os dados de camadas inferiores. Uma classificação como `emo`, por exemplo, deve continuar rastreável às características e decisões que contribuíram para a inferência.

## Domínio de equivalência

O ERM não tenta reproduzir ferramentas proprietárias do REA. Ele reproduz a **forma de trabalho**: catálogo de ferramentas, investigação incremental, evidência, limitações, workflows, MCP, CLI e reconstrução verificável. As ferramentas específicas são substituídas por equivalentes musicais.
