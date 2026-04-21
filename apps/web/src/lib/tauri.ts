export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function invokeTauri<T = unknown>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

export async function startRecording(): Promise<string> {
  return invokeTauri<string>('start_recording');
}

export async function stopRecording(): Promise<string> {
  return invokeTauri<string>('stop_recording');
}

export async function readRecordingBytes(path: string): Promise<Uint8Array> {
  const bytes = await invokeTauri<number[]>('read_recording_bytes', { path });
  return new Uint8Array(bytes);
}

export interface LiveCaptureFormat {
  sample_rate: number;
  channels: number;
  encoding: string;
}

export async function startLiveCapture(deepgramToken: string): Promise<LiveCaptureFormat> {
  return invokeTauri<LiveCaptureFormat>('start_live_capture', { deepgramToken });
}

export async function stopLiveCapture(): Promise<void> {
  await invokeTauri<void>('stop_live_capture');
}

/**
 * Subscribe to transcript events emitted by the Rust-side Deepgram
 * WebSocket. Payload is the raw Deepgram "Results" JSON as a string;
 * the caller is responsible for parsing.
 */
export async function onTranscript(
  handler: (raw: string) => void,
): Promise<() => void> {
  const { listen } = await import('@tauri-apps/api/event');
  const unlisten = await listen<string>('transcript', (event) => {
    handler(event.payload);
  });
  return unlisten;
}

export async function onTranscriptError(
  handler: (message: string) => void,
): Promise<() => void> {
  const { listen } = await import('@tauri-apps/api/event');
  const unlisten = await listen<string>('transcript-error', (event) => {
    handler(event.payload);
  });
  return unlisten;
}

export async function onTranscriptReady(handler: () => void): Promise<() => void> {
  const { listen } = await import('@tauri-apps/api/event');
  const unlisten = await listen('transcript-ready', () => handler());
  return unlisten;
}
