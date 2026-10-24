import { SunoApiClient } from './suno-api.mjs';

/**
 * Orchestrates generation and evidence collection without pretending that
 * generated audio is structurally equivalent to the reference.
 *
 * analyzeGeneratedAudio is an injected adapter because this repository does
 * not bundle an audio decoder or download arbitrary remote URLs by default.
 */
export async function runSunoReconstructionWorkflow({
  client = new SunoApiClient(),
  report,
  options = {},
  analyzeGeneratedAudio,
  compareReports,
  polling = {},
} = {}) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    throw new TypeError('report must be an ERM analysis report object');
  }
  if (typeof analyzeGeneratedAudio !== 'function') {
    throw new TypeError('analyzeGeneratedAudio callback is required to analyze generated audio');
  }

  const generationResponse = await client.generate(report, options);
  const records = Array.isArray(generationResponse) ? generationResponse
    : Array.isArray(generationResponse?.data) ? generationResponse.data
    : Array.isArray(generationResponse?.clips) ? generationResponse.clips
    : generationResponse && typeof generationResponse === 'object' ? [generationResponse] : [];
  const ids = [...new Set(records.map(item => item?.id ?? item?.audio_id).filter(id => typeof id === 'string' && id.trim()).map(id => id.trim()))];
  if (!ids.length) {
    return {
      status: 'generation_submitted_without_recognized_ids',
      reference_report: report,
      generation_response: generationResponse,
      generated_tracks: [],
      generated_analyses: [],
      comparison: null,
      limitations: ['A resposta do endpoint não continha IDs reconhecíveis; não foi possível consultar nem analisar as faixas.'],
    };
  }

  const generatedTracks = await client.waitForAudio(ids, polling);
  const generatedAnalyses = [];
  for (const track of generatedTracks) {
    const url = track.audio_url ?? track.audioUrl ?? track.stream_url ?? null;
    if (!url) {
      generatedAnalyses.push({
        track_id: track.id ?? track.audio_id,
        status: 'audio_url_missing',
        analysis: null,
      });
      continue;
    }
    const analysis = await analyzeGeneratedAudio({ track, audioUrl: url });
    generatedAnalyses.push({
      track_id: track.id ?? track.audio_id,
      status: 'analyzed',
      analysis,
    });
  }

  const comparison = typeof compareReports === 'function'
    ? await compareReports({ referenceReport: report, generatedTracks, generatedAnalyses })
    : null;

  return {
    status: generatedAnalyses.every(item => item.status === 'analyzed') ? 'completed' : 'completed_with_gaps',
    reference_report: report,
    generation_response: generationResponse,
    generated_tracks: generatedTracks,
    generated_analyses: generatedAnalyses,
    comparison,
    limitations: [
      'A geração é probabilística; instruções estruturais não garantem conformidade exata.',
      'A análise acústica depende do callback externo e do suporte de decodificação/formato desse adaptador.',
      'Uma comparação só é produzida quando compareReports é fornecido; sem ela, não se afirma equivalência estrutural.',
    ],
  };
}
