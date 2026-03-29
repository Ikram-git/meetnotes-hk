import { SpeechClient } from '@google-cloud/speech';
import type { STTProvider, STTResult, STTOptions } from './adapter';

export class GoogleSTTProvider implements STTProvider {
  name = 'google';
  private client: any;

  constructor() {
    this.client = new SpeechClient();
  }

  async transcribe(audioUrl: string, options?: STTOptions): Promise<STTResult> {
    // Use longRunningRecognize for files (v1 API compatible with @google-cloud/speech v6)
    const [operation] = await this.client.longRunningRecognize({
      config: {
        encoding: 'ENCODING_UNSPECIFIED',
        languageCode: 'en-US',
        alternativeLanguageCodes: ['yue-Hant-HK', 'cmn-Hans-CN'],
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: true,
        diarizationConfig: {
          enableSpeakerDiarization: true,
          minSpeakerCount: 2,
          maxSpeakerCount: 6,
        },
        model: 'latest_long',
      },
      audio: {
        uri: audioUrl,
      },
    });

    const [response] = await operation.promise();

    // Map Google Cloud STT response to common format
    const segments: STTResult['segments'] = [];
    const results = response?.results || [];

    for (const result of results) {
      const alt = result.alternatives?.[0];
      if (!alt?.transcript) continue;

      const startTime = result.resultEndTime
        ? parseGoogleDuration(result.resultEndTime)
        : 0;

      segments.push({
        speakerLabel: `Speaker 0`,
        startTimeMs: startTime,
        endTimeMs: startTime,
        text: alt.transcript,
        language: result.languageCode || 'en',
        confidence: alt.confidence ?? undefined,
      });
    }

    return {
      segments,
      detectedLanguages: ['en', 'yue'],
      durationMs:
        segments.length > 0 ? segments[segments.length - 1].endTimeMs : 0,
      rawResponse: response,
    };
  }
}

function parseGoogleDuration(duration: any): number {
  if (!duration) return 0;
  if (typeof duration === 'string') {
    const seconds = parseFloat(duration.replace('s', ''));
    return Math.round(seconds * 1000);
  }
  // Google protobuf Duration: { seconds: number, nanos: number }
  const seconds = Number(duration.seconds || 0);
  const nanos = Number(duration.nanos || 0);
  return Math.round(seconds * 1000 + nanos / 1_000_000);
}
