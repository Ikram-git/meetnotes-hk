import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  return ffmpeg;
}

export async function compressAudio(
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> {
  // If already under 45MB, no need to compress
  if (file.size <= 45 * 1024 * 1024) return file;

  const ff = await getFFmpeg();

  if (onProgress) {
    ff.on('progress', ({ progress }) => {
      onProgress(Math.round(progress * 100));
    });
  }

  const inputName = `input.${file.name.split('.').pop() || 'mp4'}`;
  const outputName = 'output.mp3';

  await ff.writeFile(inputName, await fetchFile(file));

  // Convert to MP3 at 128kbps mono — good quality for speech, much smaller
  await ff.exec([
    '-i', inputName,
    '-vn',              // strip video
    '-ac', '1',         // mono
    '-ab', '128k',      // 128kbps bitrate
    '-ar', '44100',     // 44.1kHz sample rate
    outputName,
  ]);

  const data = await ff.readFile(outputName);
  const blob = new Blob([data], { type: 'audio/mpeg' });

  // Clean up
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  const compressedName = file.name.replace(/\.[^.]+$/, '.mp3');
  return new File([blob], compressedName, { type: 'audio/mpeg' });
}
