import { createClient } from '@deepgram/sdk';
import type { STTProvider, STTResult, STTOptions } from './adapter';

const TRANSCRIBE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export class DeepgramProvider implements STTProvider {
  name = 'deepgram';
  private client;

  constructor() {
    this.client = createClient(process.env.DEEPGRAM_API_KEY!);
  }

  async transcribe(audioUrl: string, options?: STTOptions): Promise<STTResult> {
    // Download the audio file first, then send buffer directly to Deepgram.
    // This avoids issues where Deepgram can't fetch the signed URL.
    console.log('[Deepgram] Downloading audio from signed URL...');
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status} ${audioResponse.statusText}`);
    }
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    const contentType = audioResponse.headers.get('content-type') || 'audio/webm';
    // Normalise mimetype for Deepgram
    const mimetype = contentType.includes('mp4') || contentType.includes('m4a')
      ? 'audio/mp4'
      : contentType.includes('mpeg') || contentType.includes('mp3')
      ? 'audio/mpeg'
      : contentType.includes('wav')
      ? 'audio/wav'
      : 'audio/webm';
    console.log(`[Deepgram] Downloaded ${audioBuffer.length} bytes (${mimetype}), sending to Deepgram...`);

    // We deliberately do NOT set a fixed `language` here — Deepgram Nova-2
    // with `detect_language: true` auto-detects from ~36 supported languages
    // and picks the right model for each. Setting `language: 'en'` would
    // bias towards English and hurt accuracy for non-English meetings.
    //
    // `keywords` boosts proper nouns / jargon supplied by the workspace's
    // custom vocabulary. Format is `term:intensifier` (intensifier 1–10).
    // 5 is high enough to nudge recognition without hallucinating the term
    // into unrelated audio. Deepgram caps total keywords-per-request at 200.
    const keywords = (options?.keywords ?? [])
      .map((k) => k.trim())
      .filter((k) => k.length > 0 && k.length <= 80)
      .slice(0, 200)
      .map((k) => `${k}:5`);
    if (keywords.length > 0) {
      console.log(`[Deepgram] Boosting ${keywords.length} custom-vocabulary terms`);
    }

    const transcribePromise = this.client.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: 'nova-2',
        detect_language: true,
        smart_format: true,
        diarize: options?.enableDiarisation ?? true,
        punctuate: true,
        utterances: true,
        mimetype,
        ...(keywords.length > 0 ? { keywords } : {}),
      }
    );

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Deepgram transcription timed out after 5 minutes')), TRANSCRIBE_TIMEOUT_MS)
    );

    const { result } = await Promise.race([transcribePromise, timeoutPromise]);
    console.log('[Deepgram] Transcription complete');

    const utterances = result?.results?.utterances || [];
    const segments = utterances.map((u: any) => ({
      speakerLabel: `Speaker ${u.speaker}`,
      startTimeMs: Math.round(u.start * 1000),
      endTimeMs: Math.round(u.end * 1000),
      text: u.transcript,
      language: u.languages?.[0],
      confidence: u.confidence,
    }));

    return {
      segments,
      detectedLanguages: result?.results?.channels?.[0]?.detected_language
        ? [result.results.channels[0].detected_language]
        : ['en'],
      durationMs: Math.round((result?.metadata?.duration || 0) * 1000),
      rawResponse: result,
    };
  }
}
