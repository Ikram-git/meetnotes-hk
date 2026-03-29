export interface TranscriptSegment {
  speakerLabel: string;
  startTimeMs: number;
  endTimeMs: number;
  text: string;
  language?: string;
  confidence?: number;
}

export interface STTResult {
  segments: TranscriptSegment[];
  detectedLanguages: string[];
  durationMs: number;
  rawResponse: unknown;
}

export interface STTProvider {
  name: string;
  transcribe(audioUrl: string, options?: STTOptions): Promise<STTResult>;
}

export interface STTOptions {
  languages?: string[];
  enableDiarisation?: boolean;
  model?: string;
}
