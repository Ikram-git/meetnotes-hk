export async function compressAudio(
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> {
  if (file.size <= 45 * 1024 * 1024) return file;

  onProgress?.(5);

  // Decode audio using Web Audio API
  const arrayBuffer = await file.arrayBuffer();
  onProgress?.(15);

  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  onProgress?.(30);

  // Create an offline source and pipe through MediaRecorder for compression
  const dest = audioContext.createMediaStreamDestination();
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(dest);

  // Use MediaRecorder to encode as WebM/Opus (very small for speech)
  const mediaRecorder = new MediaRecorder(dest.stream, {
    mimeType: 'audio/webm;codecs=opus',
    audioBitsPerSecond: 64000, // 64kbps — great for speech
  });

  const chunks: Blob[] = [];

  const recordingDone = new Promise<Blob>((resolve) => {
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    mediaRecorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'audio/webm' }));
    };
  });

  // Track progress based on time
  const duration = audioBuffer.duration;
  const progressInterval = setInterval(() => {
    if (audioContext.currentTime > 0) {
      const pct = Math.min(90, 30 + Math.round((audioContext.currentTime / duration) * 60));
      onProgress?.(pct);
    }
  }, 500);

  mediaRecorder.start(1000);
  source.start(0);

  // Wait for playback to finish
  await new Promise<void>((resolve) => {
    source.onended = () => {
      setTimeout(() => {
        mediaRecorder.stop();
        resolve();
      }, 500);
    };
  });

  clearInterval(progressInterval);
  onProgress?.(90);

  const blob = await recordingDone;
  await audioContext.close();

  onProgress?.(100);

  const compressedName = file.name.replace(/\.[^.]+$/, '.webm');
  return new File([blob], compressedName, { type: 'audio/webm' });
}
