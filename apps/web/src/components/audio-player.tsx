'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { formatTime } from '@/lib/utils';

interface AudioPlayerProps {
  audioUrl: string | null;
  currentTimeMs?: number;
  onTimeUpdate?: (timeMs: number) => void;
}

export function AudioPlayer({
  audioUrl,
  currentTimeMs,
  onTimeUpdate,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(Math.round(audio.currentTime * 1000));
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      } else {
        // WebM from MediaRecorder often has Infinity duration.
        // Force the browser to discover the real duration by seeking to end.
        audio.currentTime = 1e10;
        audio.addEventListener('timeupdate', function seekBack() {
          audio.removeEventListener('timeupdate', seekBack);
          if (isFinite(audio.duration)) {
            setDuration(audio.duration);
          }
          audio.currentTime = 0;
        });
      }
    };

    const handleDurationChange = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate]);

  // Seek when external timestamp changes (e.g. clicking transcript segment)
  useEffect(() => {
    if (currentTimeMs !== undefined && audioRef.current) {
      const targetSec = currentTimeMs / 1000;
      if (Math.abs(audioRef.current.currentTime - targetSec) > 1) {
        audioRef.current.currentTime = targetSec;
      }
    }
  }, [currentTimeMs]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect || !audioRef.current || !duration) return;

    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;
    audioRef.current.currentTime = ratio * duration;
  };

  const handleRateChange = () => {
    const rates = [0.75, 1, 1.25, 1.5, 2];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const newRate = rates[nextIndex];
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  const skipForward = () => {
    if (audioRef.current && duration) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, duration);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0);
    }
  };

  if (!audioUrl) {
    return (
      <div className="bg-[#111916] border border-emerald-900/30 rounded-xl p-4 text-sm text-gray-500 text-center">
        No audio available
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const safeFormatTime = (ms: number) => {
    if (!isFinite(ms) || isNaN(ms)) return '0:00';
    return formatTime(ms);
  };

  return (
    <div className="bg-[#111916] border border-emerald-900/30 rounded-xl p-4">
      <audio ref={audioRef} src={audioUrl} preload="auto" />

      {/* Progress bar */}
      <div
        ref={progressRef}
        className="w-full h-2 bg-white/10 rounded-full cursor-pointer mb-3 group"
        onClick={handleProgressClick}
      >
        <div
          className="h-full bg-emerald-500 rounded-full relative transition-all"
          style={{ width: `${Math.min(progress, 100)}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Skip back */}
          <button
            onClick={skipBackward}
            className="text-gray-500 hover:text-emerald-400 transition"
            title="Back 10s"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="w-10 h-10 flex items-center justify-center bg-emerald-500 text-white rounded-full hover:bg-emerald-400 transition"
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Skip forward */}
          <button
            onClick={skipForward}
            className="text-gray-500 hover:text-emerald-400 transition"
            title="Forward 10s"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
            </svg>
          </button>
        </div>

        {/* Time display */}
        <span className="text-xs text-gray-500 font-mono tabular-nums">
          {safeFormatTime(currentTime * 1000)} / {duration > 0 ? safeFormatTime(duration * 1000) : '--:--'}
        </span>

        {/* Playback rate */}
        <button
          onClick={handleRateChange}
          className="text-xs font-medium text-gray-400 bg-white/5 border border-emerald-900/30 px-2 py-1 rounded-lg hover:bg-white/10 hover:text-emerald-400 transition"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
}
