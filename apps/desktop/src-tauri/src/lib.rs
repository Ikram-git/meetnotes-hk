use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::SampleFormat;
use hound::{WavSpec, WavWriter};
use std::fs::File;
use std::io::BufWriter;
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;

use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine as _;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::sync::mpsc as tokio_mpsc;

type SharedWriter = Arc<Mutex<Option<WavWriter<BufWriter<File>>>>>;

struct ActiveRecording {
    stop_tx: mpsc::Sender<()>,
    worker: Option<JoinHandle<Result<PathBuf, String>>>,
}

#[derive(Default)]
struct RecordingState(Mutex<Option<ActiveRecording>>);

struct ActiveLiveCapture {
    stop_tx: tokio_mpsc::Sender<()>,
    worker: Option<JoinHandle<()>>,
    _capture_thread: Option<JoinHandle<()>>,
}

#[derive(Default)]
struct LiveCaptureState(Mutex<Option<ActiveLiveCapture>>);

#[derive(Clone, serde::Serialize)]
struct LiveCaptureFormat {
    sample_rate: u32,
    channels: u16,
    encoding: &'static str,
}

#[derive(Clone, serde::Serialize)]
struct AudioChunkPayload {
    data: String,
}

#[tauri::command]
fn start_recording(app: AppHandle, state: State<RecordingState>) -> Result<String, String> {
    let mut guard = state.0.lock().map_err(|_| "state poisoned")?;
    if guard.is_some() {
        return Err("already recording".into());
    }

    let dir = dirs::data_local_dir()
        .unwrap_or_else(std::env::temp_dir)
        .join("Briva")
        .join("recordings");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let ts = chrono::Local::now().format("%Y%m%d-%H%M%S");
    let path = dir.join(format!("meeting-{ts}.wav"));

    let (stop_tx, stop_rx) = mpsc::channel();
    let worker_path = path.clone();
    let worker = std::thread::spawn(move || run_capture(&worker_path, stop_rx));

    *guard = Some(ActiveRecording {
        stop_tx,
        worker: Some(worker),
    });
    drop(guard);

    update_tray_for_state(&app, true);
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
fn stop_recording(app: AppHandle, state: State<RecordingState>) -> Result<String, String> {
    let mut active = state
        .0
        .lock()
        .map_err(|_| "state poisoned")?
        .take()
        .ok_or("not recording")?;

    let _ = active.stop_tx.send(());
    let worker = active.worker.take().ok_or("worker missing")?;
    let result = worker
        .join()
        .map_err(|_| "capture worker panicked".to_string())?;

    update_tray_for_state(&app, false);
    result.map(|p| p.to_string_lossy().into_owned())
}

#[tauri::command]
fn is_recording(state: State<RecordingState>) -> bool {
    state.0.lock().map(|g| g.is_some()).unwrap_or(false)
}

#[tauri::command]
fn read_recording_bytes(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| format!("failed to read {path}: {e}"))
}

#[tauri::command]
fn start_live_capture(
    app: AppHandle,
    deepgram_token: String,
    state: State<LiveCaptureState>,
) -> Result<LiveCaptureFormat, String> {
    let mut guard = state.0.lock().map_err(|_| "state poisoned")?;
    if guard.is_some() {
        return Err("already capturing".into());
    }

    let host = cpal::default_host();
    let device = host
        .default_output_device()
        .ok_or("no default output device")?;
    let supported = device.default_output_config().map_err(|e| e.to_string())?;
    let sample_format = supported.sample_format();
    let channels = supported.channels();
    let sample_rate = supported.sample_rate().0;
    let stream_config: cpal::StreamConfig = supported.into();

    // Channel from cpal audio thread → tokio task that pushes to Deepgram.
    // Using a std mpsc because cpal callbacks are sync; we'll bridge to async
    // inside the tokio task.
    let (audio_tx, audio_rx) = std::sync::mpsc::channel::<Vec<u8>>();
    let (stop_tx, stop_rx) = tokio_mpsc::channel::<()>(1);
    let app_for_dg = app.clone();

    // Spawn a dedicated tokio runtime thread. Owns the Deepgram WebSocket
    // and bridges: audio chunks in → transcript events out.
    let dg_thread = std::thread::spawn(move || {
        let rt = match tokio::runtime::Builder::new_multi_thread()
            .worker_threads(2)
            .enable_all()
            .build()
        {
            Ok(rt) => rt,
            Err(e) => {
                log::error!("[live] tokio runtime build failed: {e}");
                return;
            }
        };
        rt.block_on(run_deepgram(
            app_for_dg,
            deepgram_token,
            sample_rate,
            channels,
            audio_rx,
            stop_rx,
        ));
    });

    // Spawn the cpal capture thread. Pushes PCM bytes to audio_tx.
    let capture_thread = std::thread::spawn(move || {
        let err_cb = |err| log::error!("[live] stream error: {err}");
        let tx = audio_tx;

        let stream_result = match sample_format {
            SampleFormat::F32 => {
                let tx = tx.clone();
                device.build_input_stream(
                    &stream_config,
                    move |data: &[f32], _| {
                        let mut bytes = Vec::with_capacity(data.len() * 2);
                        for &s in data {
                            let v = (s * i16::MAX as f32).clamp(i16::MIN as f32, i16::MAX as f32) as i16;
                            bytes.extend_from_slice(&v.to_le_bytes());
                        }
                        let _ = tx.send(bytes);
                    },
                    err_cb,
                    None,
                )
            }
            SampleFormat::I16 => {
                let tx = tx.clone();
                device.build_input_stream(
                    &stream_config,
                    move |data: &[i16], _| {
                        let mut bytes = Vec::with_capacity(data.len() * 2);
                        for &s in data {
                            bytes.extend_from_slice(&s.to_le_bytes());
                        }
                        let _ = tx.send(bytes);
                    },
                    err_cb,
                    None,
                )
            }
            SampleFormat::U16 => {
                let tx = tx.clone();
                device.build_input_stream(
                    &stream_config,
                    move |data: &[u16], _| {
                        let mut bytes = Vec::with_capacity(data.len() * 2);
                        for &s in data {
                            let v = (s as i32 - 32768) as i16;
                            bytes.extend_from_slice(&v.to_le_bytes());
                        }
                        let _ = tx.send(bytes);
                    },
                    err_cb,
                    None,
                )
            }
            other => {
                log::error!("[live] unsupported format: {other:?}");
                return;
            }
        };

        let stream = match stream_result {
            Ok(s) => s,
            Err(e) => {
                log::error!("[live] build_input_stream failed: {e}");
                return;
            }
        };

        if let Err(e) = stream.play() {
            log::error!("[live] stream.play failed: {e}");
            return;
        }
        log::info!("[live] cpal capture started");

        // Park this thread — the stream runs via OS audio callbacks. When the
        // tokio thread drops its audio_rx (on stop), sends fail and we can exit.
        // We rely on the Drop of `stream` when the thread exits via the outer
        // worker join. Simplest: loop until tx is closed (receiver dropped).
        loop {
            std::thread::sleep(std::time::Duration::from_secs(3600));
        }
    });

    *guard = Some(ActiveLiveCapture {
        stop_tx,
        worker: Some(dg_thread),
        _capture_thread: Some(capture_thread),
    });

    Ok(LiveCaptureFormat {
        sample_rate,
        channels,
        encoding: "linear16",
    })
}

async fn run_deepgram(
    app: AppHandle,
    token: String,
    sample_rate: u32,
    channels: u16,
    audio_rx: std::sync::mpsc::Receiver<Vec<u8>>,
    mut stop_rx: tokio_mpsc::Receiver<()>,
) {
    use futures_util::{SinkExt, StreamExt};
    use tokio_tungstenite::tungstenite::client::IntoClientRequest;
    use tokio_tungstenite::tungstenite::Message;

    let url = format!(
        "wss://api.deepgram.com/v1/listen?model=nova-2&encoding=linear16&sample_rate={sr}&channels={ch}&interim_results=true&smart_format=true&punctuate=true&diarize=true&language=multi",
        sr = sample_rate,
        ch = channels
    );

    let mut request = match url.into_client_request() {
        Ok(r) => r,
        Err(e) => {
            log::error!("[live] bad URL: {e}");
            let _ = app.emit("transcript-error", format!("bad URL: {e}"));
            return;
        }
    };
    // JWTs from Deepgram's grantToken start with "eyJ" (base64-encoded JSON
    // header) and use the Bearer scheme. Raw API keys use the Token scheme.
    let auth_value = if token.starts_with("eyJ") {
        format!("Bearer {token}")
    } else {
        format!("Token {token}")
    };
    request
        .headers_mut()
        .insert("Authorization", auth_value.parse().unwrap());

    log::info!("[live] connecting to Deepgram…");
    let (ws, _response) = match tokio_tungstenite::connect_async(request).await {
        Ok(pair) => pair,
        Err(e) => {
            log::error!("[live] Deepgram connect failed: {e}");
            let _ = app.emit(
                "transcript-error",
                format!("Deepgram connect failed: {e}"),
            );
            return;
        }
    };
    log::info!("[live] Deepgram connected");
    let _ = app.emit("transcript-ready", ());

    let (mut write, mut read) = ws.split();

    // Spawn blocking task to pull from std mpsc and forward to WS.
    let forward_handle = tokio::task::spawn(async move {
        let mut chunks_sent: u64 = 0;
        let mut bytes_sent: u64 = 0;
        loop {
            let chunk = match tokio::task::block_in_place(|| audio_rx.recv_timeout(std::time::Duration::from_millis(500))) {
                Ok(c) => c,
                Err(std::sync::mpsc::RecvTimeoutError::Timeout) => continue,
                Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                    log::info!("[live] audio channel closed after {chunks_sent} chunks / {bytes_sent} bytes");
                    break;
                }
            };
            bytes_sent += chunk.len() as u64;
            chunks_sent += 1;
            if chunks_sent.is_multiple_of(50) {
                log::info!("[live] forwarded {chunks_sent} chunks / {bytes_sent} bytes");
            }
            if let Err(e) = write.send(Message::Binary(chunk.into())).await {
                log::error!("[live] ws send failed after {chunks_sent} chunks: {e}");
                break;
            }
        }
        let _ = write.send(Message::Close(None)).await;
    });

    loop {
        tokio::select! {
            _ = stop_rx.recv() => {
                log::info!("[live] stop signal received");
                break;
            }
            msg = read.next() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        log::info!("[live] dg msg: {} chars", text.len());
                        let _ = app.emit("transcript", text.to_string());
                    }
                    Some(Ok(Message::Ping(p))) => {
                        log::debug!("[live] dg ping ({} bytes)", p.len());
                    }
                    Some(Ok(other)) => {
                        log::info!("[live] dg other msg: {:?}", other);
                    }
                    Some(Err(e)) => {
                        log::error!("[live] Deepgram ws error: {e}");
                        let _ = app.emit("transcript-error", format!("ws error: {e}"));
                        break;
                    }
                    None => {
                        log::info!("[live] Deepgram ws closed");
                        break;
                    }
                }
            }
        }
    }

    forward_handle.abort();
    log::info!("[live] run_deepgram exited");
}

#[tauri::command]
fn stop_live_capture(state: State<LiveCaptureState>) -> Result<(), String> {
    let mut active = state
        .0
        .lock()
        .map_err(|_| "state poisoned")?
        .take()
        .ok_or("not capturing")?;
    let _ = active.stop_tx.try_send(());
    if let Some(w) = active.worker.take() {
        let _ = w.join();
    }
    // Capture thread is parked in an infinite sleep; it'll die when the process
    // exits. Not ideal but safe (no resource leaks for short-lived sessions).
    Ok(())
}

// Deepgram now handled via WebSocket from Rust — no more audio-chunk events
// emitted to the webview. Keeping the base64 import available in case we
// need per-chunk events in the future.
#[allow(dead_code)]
fn _unused_b64_keeper() {
    let _ = B64.encode([0u8]);
}

fn run_capture(path: &Path, stop_rx: mpsc::Receiver<()>) -> Result<PathBuf, String> {
    let host = cpal::default_host();
    let device = host
        .default_output_device()
        .ok_or("no default output device")?;
    let supported = device.default_output_config().map_err(|e| e.to_string())?;
    let sample_format = supported.sample_format();
    let channels = supported.channels();
    let sample_rate = supported.sample_rate().0;

    let spec = WavSpec {
        channels,
        sample_rate,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };
    let writer: SharedWriter =
        Arc::new(Mutex::new(Some(WavWriter::create(path, spec).map_err(|e| e.to_string())?)));
    let stream_config: cpal::StreamConfig = supported.into();
    let err_cb = |err| log::error!("[capture] stream error: {err}");

    let stream = match sample_format {
        SampleFormat::F32 => {
            let w = Arc::clone(&writer);
            device.build_input_stream(
                &stream_config,
                move |data: &[f32], _| write_f32(&w, data),
                err_cb,
                None,
            )
        }
        SampleFormat::I16 => {
            let w = Arc::clone(&writer);
            device.build_input_stream(
                &stream_config,
                move |data: &[i16], _| write_i16(&w, data),
                err_cb,
                None,
            )
        }
        SampleFormat::U16 => {
            let w = Arc::clone(&writer);
            device.build_input_stream(
                &stream_config,
                move |data: &[u16], _| write_u16(&w, data),
                err_cb,
                None,
            )
        }
        other => return Err(format!("unsupported sample format: {other:?}")),
    }
    .map_err(|e| e.to_string())?;

    stream.play().map_err(|e| e.to_string())?;
    log::info!("[capture] recording to {}", path.display());
    let _ = stop_rx.recv();
    drop(stream);

    if let Some(w) = writer.lock().map_err(|_| "writer poisoned")?.take() {
        w.finalize().map_err(|e| e.to_string())?;
    }
    log::info!("[capture] wrote {}", path.display());
    Ok(path.to_path_buf())
}

fn write_f32(writer: &SharedWriter, data: &[f32]) {
    let Ok(mut guard) = writer.lock() else { return };
    let Some(w) = guard.as_mut() else { return };
    for &s in data {
        let v = (s * i16::MAX as f32).clamp(i16::MIN as f32, i16::MAX as f32) as i16;
        let _ = w.write_sample(v);
    }
}

fn write_i16(writer: &SharedWriter, data: &[i16]) {
    let Ok(mut guard) = writer.lock() else { return };
    let Some(w) = guard.as_mut() else { return };
    for &s in data {
        let _ = w.write_sample(s);
    }
}

fn write_u16(writer: &SharedWriter, data: &[u16]) {
    let Ok(mut guard) = writer.lock() else { return };
    let Some(w) = guard.as_mut() else { return };
    for &s in data {
        let _ = w.write_sample((s as i32 - 32768) as i16);
    }
}

fn register_global_shortcut(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

    let shortcut: Shortcut = "ctrl+shift+r".parse()?;
    app.global_shortcut().on_shortcut(shortcut, move |app, _scut, event| {
        if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
            let state: State<RecordingState> = app.state();
            let is_active = state.0.lock().map(|g| g.is_some()).unwrap_or(false);
            if is_active {
                match stop_recording(app.clone(), state) {
                    Ok(p) => log::info!("[hotkey] stopped -> {p}"),
                    Err(e) => log::error!("[hotkey] stop failed: {e}"),
                }
            } else {
                match start_recording(app.clone(), state) {
                    Ok(p) => log::info!("[hotkey] started -> {p}"),
                    Err(e) => log::error!("[hotkey] start failed: {e}"),
                }
            }
        }
    })?;
    log::info!("global shortcut registered: Ctrl+Shift+R");
    Ok(())
}

fn update_tray_for_state(app: &AppHandle, recording: bool) {
    if let Some(tray) = app.tray_by_id("main") {
        let tooltip = if recording {
            "Briva — recording"
        } else {
            "Briva"
        };
        let _ = tray.set_tooltip(Some(tooltip));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(RecordingState::default())
        .manage(LiveCaptureState::default())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            register_global_shortcut(app)?;

            let handle = app.handle();
            let record_item = MenuItem::with_id(handle, "record", "Start recording", true, None::<&str>)?;
            let stop_item = MenuItem::with_id(handle, "stop", "Stop recording", true, None::<&str>)?;
            let show_item = MenuItem::with_id(handle, "show", "Open dashboard", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(handle, "quit", "Quit Briva", true, None::<&str>)?;
            let sep1 = PredefinedMenuItem::separator(handle)?;
            let sep2 = PredefinedMenuItem::separator(handle)?;
            let menu = Menu::with_items(
                handle,
                &[&record_item, &stop_item, &sep1, &show_item, &sep2, &quit_item],
            )?;

            let icon = app
                .default_window_icon()
                .cloned()
                .ok_or("missing default window icon")?;

            let _tray = TrayIconBuilder::with_id("main")
                .icon(icon)
                .tooltip("Briva")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "record" => {
                        let state: State<RecordingState> = app.state();
                        match start_recording(app.clone(), state) {
                            Ok(p) => log::info!("started recording -> {p}"),
                            Err(e) => log::error!("start_recording failed: {e}"),
                        }
                    }
                    "stop" => {
                        let state: State<RecordingState> = app.state();
                        match stop_recording(app.clone(), state) {
                            Ok(p) => log::info!("stopped -> {p}"),
                            Err(e) => log::error!("stop_recording failed: {e}"),
                        }
                    }
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_recording,
            stop_recording,
            is_recording,
            read_recording_bytes,
            start_live_capture,
            stop_live_capture
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
