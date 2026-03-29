import { getAccessToken } from '../lib/auth';

interface MNRecordingState {
  isRecording: boolean;
  meetingId?: string;
  tabId?: number;
  startTime?: number;
}

let recState: MNRecordingState = { isRecording: false };
let pendingStreamConfig: { streamId: string; tabId: number } | null = null;

chrome.runtime.onMessage.addListener(
  (message: any, _sender: any, sendResponse: (response: any) => void) => {
    switch (message.type) {
      case 'START_RECORDING':
        startRecording(message.tabId).then((result) => sendResponse(result));
        break;
      case 'STOP_RECORDING':
        stopRecording().then(() => sendResponse({ success: true }));
        break;
      case 'GET_STATE':
        sendResponse(recState);
        break;
      case 'CHECK_MIC_PERMISSION':
        // Popup asks if mic is ready before starting
        sendResponse({ granted: true }); // we'll let offscreen try; if it fails it falls back
        break;
      case 'OFFSCREEN_READY':
        if (pendingStreamConfig) {
          sendResponse(pendingStreamConfig);
          pendingStreamConfig = null;
        } else {
          sendResponse(null);
        }
        break;
      case 'MIC_PERMISSION_GRANTED':
        sendResponse({ success: true });
        break;
      case 'UPLOAD_COMPLETE':
        recState = {
          isRecording: false,
          meetingId: message.meetingId,
          tabId: recState.tabId,
        };
        chrome.runtime.sendMessage({ type: 'RECORDING_STATE_CHANGED', state: recState }).catch(() => {});
        closeOffscreen();
        sendResponse({ success: true });
        break;
      case 'UPLOAD_ERROR':
        recState = { isRecording: false, tabId: recState.tabId };
        chrome.runtime.sendMessage({ type: 'UPLOAD_ERROR', error: message.error }).catch(() => {});
        closeOffscreen();
        sendResponse({ success: true });
        break;
    }
    return true;
  }
);

async function closeOffscreen() {
  try {
    const existing = await (chrome.runtime as any).getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
    if (existing && existing.length > 0) {
      await chrome.offscreen.closeDocument();
    }
  } catch (_) {}
}

async function startRecording(tabId: number): Promise<{ success: boolean; needsSetup?: boolean }> {
  try {
    await closeOffscreen();

    const streamId = await (chrome.tabCapture as any).getMediaStreamId({ targetTabId: tabId });
    pendingStreamConfig = { streamId, tabId };

    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason.USER_MEDIA],
      justification: 'Recording tab audio and microphone for meeting transcription',
    });

    recState = { isRecording: true, tabId, startTime: Date.now() };
    chrome.action.setBadgeText({ text: 'REC' });
    chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });
    return { success: true };
  } catch (error) {
    console.error('Failed to start recording:', error);
    recState = { isRecording: false };
    pendingStreamConfig = null;
    return { success: false };
  }
}

async function stopRecording() {
  const token = await getAccessToken();
  chrome.runtime.sendMessage({ type: 'OFFSCREEN_STOP_RECORDING', token }).catch(() => {});
  chrome.action.setBadgeText({ text: '' });
  recState = {
    isRecording: false,
    tabId: recState.tabId,
    startTime: recState.startTime,
  };
}

chrome.tabs.onRemoved.addListener((tabId: number) => {
  if (recState.isRecording && recState.tabId === tabId) {
    stopRecording();
  }
});
