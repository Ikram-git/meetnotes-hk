use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::SampleFormat;
use hound::{WavSpec, WavWriter};
use std::error::Error;
use std::io::BufWriter;
use std::fs::File;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

const RECORD_SECONDS: u64 = 10;
const OUTPUT_PATH: &str = "out.wav";

type SharedWriter = Arc<Mutex<Option<WavWriter<BufWriter<File>>>>>;

fn main() -> Result<(), Box<dyn Error>> {
    println!("=== Briva WASAPI Loopback POC ===");

    let host = cpal::default_host();
    let device = host
        .default_output_device()
        .ok_or("no default output device")?;

    println!("Output device: {}", device.name()?);

    let supported = device.default_output_config()?;
    let sample_format = supported.sample_format();
    let channels = supported.channels();
    let sample_rate = supported.sample_rate().0;
    println!(
        "Format: {:?}  |  {} Hz  |  {} ch",
        sample_format, sample_rate, channels
    );

    let spec = WavSpec {
        channels,
        sample_rate,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };
    let writer: SharedWriter = Arc::new(Mutex::new(Some(WavWriter::create(OUTPUT_PATH, spec)?)));

    let stream_config: cpal::StreamConfig = supported.into();
    let err_cb = |err| eprintln!("[stream error] {err}");

    let stream = match sample_format {
        SampleFormat::F32 => {
            let w = Arc::clone(&writer);
            device.build_input_stream(
                &stream_config,
                move |data: &[f32], _| write_f32(&w, data),
                err_cb,
                None,
            )?
        }
        SampleFormat::I16 => {
            let w = Arc::clone(&writer);
            device.build_input_stream(
                &stream_config,
                move |data: &[i16], _| write_i16(&w, data),
                err_cb,
                None,
            )?
        }
        SampleFormat::U16 => {
            let w = Arc::clone(&writer);
            device.build_input_stream(
                &stream_config,
                move |data: &[u16], _| write_u16(&w, data),
                err_cb,
                None,
            )?
        }
        other => return Err(format!("unsupported sample format: {other:?}").into()),
    };

    stream.play()?;
    println!("Recording for {RECORD_SECONDS}s — play some audio now (YouTube, Zoom, anything)...");
    thread::sleep(Duration::from_secs(RECORD_SECONDS));
    drop(stream);

    if let Some(w) = writer.lock().unwrap().take() {
        w.finalize()?;
    }
    println!("Wrote {OUTPUT_PATH}");
    Ok(())
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
