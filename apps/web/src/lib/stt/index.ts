import { DeepgramProvider } from './deepgram';
import { GoogleSTTProvider } from './google';
import type { STTProvider } from './adapter';

export function getSTTProvider(name?: string): STTProvider {
  switch (name || process.env.DEFAULT_STT_PROVIDER) {
    case 'google':
      return new GoogleSTTProvider();
    case 'deepgram':
    default:
      return new DeepgramProvider();
  }
}

export type { STTProvider, STTResult, STTOptions, TranscriptSegment } from './adapter';
