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
