# Protocolo de Engenharia-Reversa Musical para SUNO AI

## Gatilho
Ative este protocolo quando o usuário pedir para decodificar, analisar por engenharia reversa, reconstruir ou adaptar uma música específica para o SUNO AI. Se houver áudio anexado, analise o arquivo real; não trate nome do arquivo ou metadados como evidência acústica.

## Objetivo obrigatório
Após a análise musical, entregue **um documento Markdown reutilizável** baseado em `docs/modelo-documento-reutilizavel-suno.md`. O documento deve reunir o resumo de engenharia reversa sustentado por evidências e o prompt final adaptado ao SUNO AI, pronto para copiar. Não responda apenas com a análise e não omita o prompt.

## Procedimento
1. Leia este protocolo e o modelo reutilizável antes de compor a resposta.
2. Inspecione o áudio anexado ou a fonte indicada. Verifique duração, formato, canais e taxa de amostragem quando possível; use o pipeline ERM se compatível. Se o formato não for suportado, decodifique por um meio disponível e declare essa limitação; nunca alegue ter executado o pipeline se não o executou.
3. Investigue, quando houver evidência, gênero/subgênero, época/estética, energia, andamento, groove, métrica, centro tonal/caráter harmônico, instrumentação, timbres, desenho melódico, harmonia, dinâmica, estrutura, interpretação vocal, produção, mixagem e evolução emocional.
4. Priorize características audíveis e decisões de produção que expliquem a identidade sonora. Separe explicitamente observações medidas, inferências e interpretações. Informe intervalos temporais, método, confiança e limitações quando pertinentes.
5. Converta a análise em instruções musicais concretas e executáveis. Use verbos de comando e relações claras: estabelecer, sustentar, contrastar, intensificar, suspender, resolver, sobrepor, recuar e finalizar.
6. Preserve a assinatura estilística geral sem inventar parâmetros, instrumentos, acordes, letras ou seções. Marque incertezas como hipóteses; não transforme estimativas automáticas em fatos confirmados.
7. Não reproduza letras protegidas por direitos autorais nem solicite imitação exata da voz de artista vivo. Descreva atributos vocais e musicais gerais.
8. Redija o prompt final em português ou inglês conforme melhor sirva ao SUNO e à intenção do usuário. Seja taxativo, intuitivo, sugestivo, conciso, aforístico, expressivo, normativo e imperativo. Cada frase deve orientar uma decisão sonora.
9. Mantenha o prompt SUNO isolado em uma seção própria, sem título dentro do bloco copiável, com **máximo absoluto de 850 caracteres** contando espaços e pontuação. Valide com `node scripts/validate-suno-prompt.mjs "<prompt>"` sempre que o ambiente do repositório estiver disponível; se não estiver, conte os caracteres por outro método confiável.
10. Preencha o documento reutilizável com título/nome de referência, dados técnicos conhecidos, achados principais, estrutura temporal provisória, limites de confiança, prompt final, data/versão se disponível e campos que facilitem reaproveitamento futuro. Não deixe placeholders sem marcar como “não informado”.
11. Antes de enviar, faça uma verificação final: (a) documento reutilizável presente; (b) prompt SUNO presente; (c) prompt com até 850 caracteres; (d) sem detalhes musicais inventados; (e) limitações explícitas; (f) prompt pronto para copiar e reutilizar.

## Formato obrigatório da resposta
Entregue o documento reutilizável completo, usando o modelo do repositório. O documento pode conter análise e notas de evidência fora do campo de prompt; o limite de 850 caracteres aplica-se exclusivamente ao texto do prompt destinado ao SUNO. O prompt deve aparecer em bloco próprio para cópia. Não substitua o documento por uma resposta solta de análise nem por uma lista sem estrutura.

## Modelo mental
Fonte → validação/decodificação → observações → inferências com confiança → mapa estrutural → decisões sonoras essenciais → prompt SUNO validado → documento reutilizável.
