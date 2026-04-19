use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::SampleFormat;
use hound::{WavSpec, WavWriter};
use std::fs::File;
use std::io::BufWriter;
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Manager, State};

type SharedWriter = Arc<Mutex<Option<WavWriter<BufWriter<File>>>>>;

struct ActiveRecording {
    stop_tx: mpsc::Sender<()>,
    worker: Option<JoinHandle<Result<PathBuf, String>>>,
}

#[derive(Default)]
struct RecordingState(Mutex<Option<ActiveRecording>>);

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
            read_recording_bytes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
