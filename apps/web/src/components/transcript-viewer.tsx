'use client';

import { useRef, useEffect } from 'react';
import { formatTime } from '@/lib/utils';

interface Segment {
  id: string;
  segment_index: number;
  speaker_label: string | null;
  start_time_ms: number;
  end_time_ms: number;
  text: string;
  language: string | null;
  confidence: number | null;
}

interface SpeakerMap {
  [label: string]: string;
}

interface TranscriptViewerProps {
  segments: Segment[];
  speakerMap: SpeakerMap;
  currentTimeMs?: number;
  onSegmentClick?: (timeMs: number) => void;
  onSpeakerRename?: (label: string) => void;
}

export function TranscriptViewer({
  segments,
  speakerMap,
  currentTimeMs = 0,
  onSegmentClick,
  onSpeakerRename,
}: TranscriptViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const container = containerRef.current;
      const element = activeRef.current;
      const elementTop = element.offsetTop - container.offsetTop;
      const elementBottom = elementTop + element.offsetHeight;
      const containerScroll = container.scrollTop;
      const containerHeight = container.clientHeight;

      if (
        elementTop < containerScroll ||
        elementBottom > containerScroll + containerHeight
      ) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTimeMs]);

  const getDisplayName = (label: string | null) => {
    if (!label) return 'Unknown';
    return speakerMap[label] || label;
  };

  const getSpeakerColor = (label: string | null) => {
    if (!label) return 'text-gray-500';
    const colors = [
      'text-emerald-400',
      'text-cyan-400',
      'text-purple-400',
      'text-amber-400',
      'text-pink-400',
      'text-teal-400',
    ];
    // Extract speaker number for consistent coloring
    const match = label.match(/\d+/);
    const index = match ? parseInt(match[0]) : 0;
    return colors[index % colors.length];
  };

  const isActive = (segment: Segment) => {
    return (
      currentTimeMs >= segment.start_time_ms &&
      currentTimeMs < segment.end_time_ms
    );
  };

  const handleSpeakerClick = (label: string) => {
    if (!onSpeakerRename) return;
    onSpeakerRename(label);
  };

  // Get unique speakers for the hint
  const uniqueSpeakers = [...new Set(segments.map(s => s.speaker_label).filter(Boolean))] as string[];
  const hasUnnamed = uniqueSpeakers.some(label => !speakerMap[label]);

  return (
    <div
      ref={containerRef}
      className="space-y-3 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-emerald-900/30 scrollbar-track-transparent"
    >
      {/* Helper hint */}
      {hasUnnamed && onSpeakerRename && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/5 border border-emerald-500/15 rounded-lg text-xs text-emerald-400/80">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Click on a speaker name to rename them
        </div>
      )}
      {segments.map((segment) => {
        const active = isActive(segment);
        return (
          <div
            key={segment.id}
            ref={active ? activeRef : undefined}
            className={`text-sm p-2.5 rounded-lg cursor-pointer transition-colors ${
              active
                ? 'bg-emerald-500/10 border border-emerald-500/30'
                : 'hover:bg-white/[0.03]'
            }`}
            onClick={() => onSegmentClick?.(segment.start_time_ms)}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (segment.speaker_label) {
                    handleSpeakerClick(segment.speaker_label);
                  }
                }}
                className={`group/speaker inline-flex items-center gap-1 font-medium ${getSpeakerColor(segment.speaker_label)} hover:underline`}
                title="Click to rename speaker"
              >
                {getDisplayName(segment.speaker_label)}
                <svg className="w-2.5 h-2.5 opacity-0 group-hover/speaker:opacity-60 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <span className="text-xs text-gray-600">
                {formatTime(segment.start_time_ms)}
              </span>
              {segment.language && segment.language !== 'en' && (
                <span className="text-xs bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">
                  {segment.language === 'yue' ? '\u7CB5' : segment.language}
                </span>
              )}
            </div>
            <p className="text-gray-300 leading-relaxed">{segment.text}</p>
          </div>
        );
      })}
    </div>
  );
}
