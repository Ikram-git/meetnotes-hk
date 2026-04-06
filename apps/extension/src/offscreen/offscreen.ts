import { AudioRecorder } from '../lib/recorder';
import { uploadAudio } from '../lib/api';

const recorder = new AudioRecorder();
let audioContext: AudioContext | null = null;
let micStream: MediaStream | null = null;
let tabStream: MediaStream | null = null;

chrome.runtime.sendMessage({ type: 'OFFSCREEN_READY' }, async (config) => {
  if (!config?.streamId) return;

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
    console.log('[MeetNotes] Tab audio captured');

    // 2. Try to capture microphone (your voice)
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      console.log('[MeetNotes] Mic captured');
    } catch (e) {
      console.warn('[MeetNotes] Mic unavailable, tab audio only. Run setup to grant mic access.');
    }

    // 3. Mix streams via AudioContext
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
    console.log('[MeetNotes] Recording started (' + (micStream ? 'tab + mic' : 'tab only') + ')');
  } catch (error) {
    console.error('[MeetNotes] Capture failed:', error);
    chrome.runtime.sendMessage({
      type: 'UPLOAD_ERROR',
      error: error instanceof Error ? error.message : 'Failed to capture audio',
    });
  }
});

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type === 'OFFSCREEN_DISCARD') {
    // Stop recording and discard — don't upload
    try {
      await recorder.stopRecording();
    } catch {}
    if (audioContext) { audioContext.close().catch(() => {}); audioContext = null; }
    if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
    if (tabStream) { tabStream.getTracks().forEach(t => t.stop()); tabStream = null; }
    console.log('[MeetNotes] Recording discarded');
    return;
  }

  if (message.type !== 'OFFSCREEN_STOP_RECORDING') return;

  try {
    const audioBlob = await recorder.stopRecording();
    console.log('[MeetNotes] Stopped, blob size:', audioBlob.size);

    if (audioContext) { audioContext.close().catch(() => {}); audioContext = null; }
    if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
    if (tabStream) { tabStream.getTracks().forEach(t => t.stop()); tabStream = null; }

    if (audioBlob.size < 1000) {
      chrome.runtime.sendMessage({
        type: 'UPLOAD_ERROR',
        error: 'Recording is empty. Make sure audio is playing in the meeting.',
      });
      return;
    }

    const filename = `meeting-${Date.now()}.webm`;
    const result = await uploadAudio(audioBlob, filename, message.token);
    chrome.runtime.sendMessage({ type: 'UPLOAD_COMPLETE', meetingId: result.meetingId });
  } catch (error) {
    console.error('[MeetNotes] Upload failed:', error);
    chrome.runtime.sendMessage({
      type: 'UPLOAD_ERROR',
      error: error instanceof Error ? error.message : 'Upload failed',
    });
  }
});
