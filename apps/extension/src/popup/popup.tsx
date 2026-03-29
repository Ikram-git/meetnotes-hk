import { createRoot } from 'react-dom/client';
import { useState, useEffect } from 'react';
import { getUser, signInWithEmail, signOut } from '../lib/auth';
import './popup.css';

type Screen = 'loading' | 'login' | 'idle' | 'recording' | 'uploading' | 'done' | 'error';

function App() {
  const [user, setUser] = useState<any>(null);
  const [screen, setScreen] = useState<Screen>('loading');
  const [elapsed, setElapsed] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Auth fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    // Fetch user and recording state in parallel, then decide screen
    const userPromise = getUser();
    const statePromise = new Promise<any>((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => resolve(response));
    });

    Promise.all([userPromise, statePromise]).then(([u, recState]) => {
      setUser(u);

      if (!u) {
        setScreen('login');
        return;
      }

      // Recording state takes priority over idle
      if (recState?.isRecording) {
        setScreen('recording');
        setStartTime(recState.startTime || Date.now());
      } else if (recState?.meetingId) {
        setMeetingId(recState.meetingId);
        setScreen('done');
      } else {
        setScreen('idle');
      }
    });

    // Listen for background events
    const listener = (message: any) => {
      if (message.type === 'UPLOAD_COMPLETE') {
        setMeetingId(message.meetingId);
        setScreen('done');
        chrome.tabs.create({ url: `http://localhost:3000/meetings/${message.meetingId}` });
      }
      if (message.type === 'UPLOAD_ERROR') {
        setErrorMsg(message.error || 'Upload failed');
        setScreen('error');
      }
      if (message.type === 'RECORDING_STATE_CHANGED') {
        if (message.state?.isRecording) {
          setScreen('recording');
          setStartTime(message.state.startTime || Date.now());
        }
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // Elapsed timer while recording
  useEffect(() => {
    if (screen !== 'recording' || !startTime) { setElapsed(0); return; }
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [screen, startTime]);

  const handleLogin = async () => {
    setAuthError('');
    setSigningIn(true);
    const { error } = await signInWithEmail(email, password);
    if (error) {
      setAuthError(error.message);
    } else {
      const u = await getUser();
      setUser(u);
      setScreen('idle');
    }
    setSigningIn(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setScreen('login');
  };

  const openSetup = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('setup.html') });
  };

  const startRecording = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    chrome.runtime.sendMessage({ type: 'START_RECORDING', tabId: tab.id });
    setStartTime(Date.now());
    setScreen('recording');
  };

  const stopRecording = () => {
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
    setScreen('uploading');
  };

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ── Loading ──
  if (screen === 'loading') {
    return (
      <div className="popup-container">
        <div className="header"><h1 className="logo">MeetNotes <span>HK</span></h1></div>
        <div className="loading">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  // ── Login ──
  if (screen === 'login') {
    return (
      <div className="popup-container">
        <div className="header">
          <h1 className="logo">MeetNotes <span>HK</span></h1>
          <p className="subtitle">Sign in to start recording</p>
        </div>
        <div className="auth-form">
          {authError && <div className="error">{authError}</div>}
          <input type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} className="input" />
          <input type="password" placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)} className="input"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
          <button onClick={handleLogin} disabled={signingIn} className="btn btn-primary">
            {signingIn ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </div>
    );
  }

  // ── Idle — ready to record ──
  if (screen === 'idle') {
    return (
      <div className="popup-container">
        <div className="header">
          <div className="header-row">
            <div>
              <h1 className="logo">MeetNotes <span>HK</span></h1>
              <p className="user-email">{user?.email}</p>
            </div>
            <button onClick={handleSignOut} className="btn-text">Sign out</button>
          </div>
        </div>
        <div className="content">
          <div className="ready">
            <p className="instruction">
              Navigate to a Google Meet, Zoom, or Teams call, then click below to start recording.
            </p>
            <button onClick={startRecording} className="btn btn-record">
              <span className="record-icon" />
              Start Recording
            </button>
            <button onClick={openSetup} className="btn-text" style={{ marginTop: 8, fontSize: 11 }}>
              Setup microphone access
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Recording ──
  if (screen === 'recording') {
    return (
      <div className="popup-container">
        <div className="header">
          <div className="header-row">
            <h1 className="logo">MeetNotes <span>HK</span></h1>
            <button onClick={handleSignOut} className="btn-text">Sign out</button>
          </div>
        </div>
        <div className="content">
          <div className="recording-active">
            <div className="recording-indicator">
              <span className="dot" />
              Recording
            </div>
            <div className="elapsed">{formatElapsed(elapsed)}</div>
            <button onClick={stopRecording} className="btn btn-danger">
              Stop & Upload
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Uploading ──
  if (screen === 'uploading') {
    return (
      <div className="popup-container">
        <div className="header">
          <h1 className="logo">MeetNotes <span>HK</span></h1>
        </div>
        <div className="content">
          <div className="uploading">
            <div className="spinner" />
            <p className="uploading-text">Uploading recording...</p>
            <p className="small">This may take a moment for longer meetings.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Done ──
  if (screen === 'done') {
    return (
      <div className="popup-container">
        <div className="header">
          <div className="header-row">
            <h1 className="logo">MeetNotes <span>HK</span></h1>
            <button onClick={handleSignOut} className="btn-text">Sign out</button>
          </div>
        </div>
        <div className="content">
          <div className="upload-complete">
            <div className="success-icon">✓</div>
            <p>Uploaded successfully!</p>
            <p className="small">Your meeting is being transcribed and summarised. The page opened automatically.</p>
            <button
              onClick={() => chrome.tabs.create({ url: `http://localhost:3000/meetings/${meetingId}` })}
              className="btn btn-primary"
            >
              View Meeting
            </button>
            <button onClick={() => setScreen('idle')} className="btn-text" style={{ marginTop: 4 }}>
              Record another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──
  return (
    <div className="popup-container">
      <div className="header">
        <h1 className="logo">MeetNotes <span>HK</span></h1>
      </div>
      <div className="content">
        <div className="upload-complete">
          <div className="error-icon">✕</div>
          <p>Upload failed</p>
          <p className="small">{errorMsg}</p>
          <button onClick={() => setScreen('idle')} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}
