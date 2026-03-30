// Placeholder — compression disabled, direct upload used instead
export async function compressAudio(
  file: File,
  _onProgress?: (progress: number) => void
): Promise<File> {
  return file;
}
