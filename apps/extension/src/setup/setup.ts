const grantBtn = document.getElementById('grant') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;

async function checkPermission(): Promise<string> {
  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return result.state;
  } catch {
    return 'unknown';
  }
}

async function init() {
  const state = await checkPermission();
  if (state === 'granted') {
    grantBtn.textContent = 'Microphone Access Granted';
    grantBtn.disabled = true;
    statusEl.innerHTML = '<p class="success">✓ All set! You can close this tab and start recording.</p>';
    chrome.runtime.sendMessage({ type: 'MIC_PERMISSION_GRANTED' });
  }
}

grantBtn.addEventListener('click', async () => {
  try {
    grantBtn.textContent = 'Requesting...';
    grantBtn.disabled = true;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());

    grantBtn.textContent = 'Microphone Access Granted';
    statusEl.innerHTML = '<p class="success">✓ All set! You can close this tab and start recording.</p>';
    chrome.runtime.sendMessage({ type: 'MIC_PERMISSION_GRANTED' });
  } catch (_err) {
    grantBtn.textContent = 'Allow Microphone Access';
    grantBtn.disabled = false;
    statusEl.innerHTML = '<p class="error">Permission denied. Please try again and click "Allow" when prompted.</p>';
  }
});

init();
