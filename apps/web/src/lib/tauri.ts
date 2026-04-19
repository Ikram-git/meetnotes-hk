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

export async function startLiveCapture(): Promise<LiveCaptureFormat> {
  return invokeTauri<LiveCaptureFormat>('start_live_capture');
}

export async function stopLiveCapture(): Promise<void> {
  await invokeTauri<void>('stop_live_capture');
}

/**
 * Subscribe to audio chunk events from the native capture loop.
 * Each event carries a base64-encoded little-endian 16-bit PCM buffer.
 * Returns an unsubscribe function.
 */
export async function onAudioChunk(
  handler: (bytes: Uint8Array) => void,
): Promise<() => void> {
  const { listen } = await import('@tauri-apps/api/event');
  const unlisten = await listen<{ data: string }>('audio-chunk', (event) => {
    const b = atob(event.payload.data);
    const u8 = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) u8[i] = b.charCodeAt(i);
    handler(u8);
  });
  return unlisten;
}
