import { AudioRecorder } from '../lib/recorder';
import { uploadAudio } from '../lib/api';

const recorder = new AudioRecorder();
let audioContext: AudioContext | null = null;
let micStream: MediaStream | null = null;
let tabStream: MediaStream | null = null;
const info = document.getElementById('info')!;

// Ask background for stream config
chrome.runtime.sendMessage({ type: 'RECORDER_READY' }, async (config) => {
  if (!config?.streamId) {
    info.textContent = 'No stream config';
    return;
  }

  try {
    // 1. Capture tab audio (other participants)
    tabStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: config.streamId,
        },
      } as any,
    });

    // 2. Capture microphone (your voice) — this window CAN show the permission prompt
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) {
      console.warn('[Briva] Mic denied, tab audio only:', e);
    }

    // 3. Mix both streams via AudioContext
    audioContext = new AudioContext();
    const dest = audioContext.createMediaStreamDestination();

    const tabSource = audioContext.createMediaStreamSource(tabStream);
    tabSource.connect(dest);

    if (micStream) {
      const micSource = audioContext.createMediaStreamSource(micStream);
      micSource.connect(dest);
    }

    // 4. Record mixed stream
    await recorder.startRecording(dest.stream);
    info.textContent = micStream ? 'Tab + Mic' : 'Tab only (no mic)';
    console.log('[Briva] Recording started:', info.textContent);
  } catch (error) {
    console.error('[Briva] Capture failed:', error);
    info.textContent = 'Capture failed';
    chrome.runtime.sendMessage({
      type: 'UPLOAD_ERROR',
      error: error instanceof Error ? error.message : 'Failed to capture',
    });
  }
});

// Listen for stop
chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type !== 'RECORDER_STOP') return;

  try {
    const audioBlob = await recorder.stopRecording();
    console.log('[Briva] Stopped, blob:', audioBlob.size, 'bytes');

    // Clean up streams
    if (audioContext) { audioContext.close().catch(() => {}); audioContext = null; }
    if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
    if (tabStream) { tabStream.getTracks().forEach(t => t.stop()); tabStream = null; }

    info.textContent = 'Uploading...';

    if (audioBlob.size < 1000) {
      chrome.runtime.sendMessage({
        type: 'UPLOAD_ERROR',
        error: 'Recording is empty.',
      });
      window.close();
      return;
    }

    const filename = `meeting-${Date.now()}.webm`;
    const result = await uploadAudio(audioBlob, filename, message.token);
    chrome.runtime.sendMessage({ type: 'UPLOAD_COMPLETE', meetingId: result.meetingId });
    window.close();
  } catch (error) {
    console.error('[Briva] Upload failed:', error);
    chrome.runtime.sendMessage({
      type: 'UPLOAD_ERROR',
      error: error instanceof Error ? error.message : 'Upload failed',
    });
    window.close();
  }
});
