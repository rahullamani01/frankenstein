import React, { useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ChevronDown,
  Heart,
  AlignLeft,
} from 'lucide-react';
import { Track } from '../../data/musicData';
import { AcrylicCdPlayer } from '../AcrylicCdPlayer';

interface NowPlayingScreenProps {
  track: Track;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isFavorite: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleFavorite: () => void;
}

export const NowPlayingScreen: React.FC<NowPlayingScreenProps> = ({
  track,
  isPlaying,
  currentTime,
  duration,
  volume,
  isFavorite,
  onClose,
  onTogglePlay,
  onNext,
  onPrevious,
  onSeek,
  onVolumeChange,
  onToggleFavorite,
}) => {
  const [showLyrics, setShowLyrics] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickRatio = Math.max(0, Math.min(1, clickX / width));
    onSeek(clickRatio * duration);
  };

  return (
    <div id="screen-now-playing" className="h-full flex flex-col justify-between px-10 py-8 relative">
      {/* Top Bar: Close / Collapse */}
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-[13px] text-[#78837A] hover:text-[#24302A] transition-colors p-1"
          title="Minimize Now Playing"
        >
          <ChevronDown size={18} strokeWidth={1.5} />
          <span>Minimize</span>
        </button>

        {track.lyrics && track.lyrics.length > 0 && (
          <button
            onClick={() => setShowLyrics(!showLyrics)}
            className={`flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[6px] transition-colors ${
              showLyrics
                ? 'bg-[#E3E9DC] text-[#24302A] font-medium'
                : 'text-[#78837A] hover:text-[#24302A]'
            }`}
            title="Toggle lyrics"
          >
            <AlignLeft size={14} strokeWidth={1.5} />
            <span>Lyrics</span>
          </button>
        )}
      </div>

      {/* Main Content Area: Large art centered, title/artist/album */}
      <div className="flex-1 flex flex-col items-center justify-center my-4">
        {showLyrics && track.lyrics ? (
          <div className="max-w-md w-full max-h-[380px] overflow-y-auto text-center space-y-4 px-4 py-2">
            <p className="text-[12px] tracking-wider uppercase text-[#78837A] font-medium font-sans mb-4">
              Lyrics
            </p>
            {track.lyrics.map((line, idx) => (
              <p
                key={idx}
                className="font-serif-custom text-[19px] text-[#24302A] leading-relaxed"
              >
                {line}
              </p>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-7">
            {/* Album Art & Functioning Rotating Acrylic CD Player beside it */}
            <div className="flex items-center justify-center gap-7 flex-wrap">
              {/* Large Art */}
              <div className="w-[260px] h-[260px] rounded-[12px] overflow-hidden bg-[#EEF1EA] border border-[#E2E6DD] shadow-[0_2px_8px_rgba(36,48,42,0.06)] flex-shrink-0">
                <img
                  src={track.coverUrl}
                  alt={track.album}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Functioning Rotating Acrylic CD Player matching reference image */}
              <AcrylicCdPlayer
                isPlaying={isPlaying}
                track={track}
                size={260}
                onTogglePlay={onTogglePlay}
              />
            </div>

            {/* Title (serif for title only) + artist + album */}
            <div className="space-y-1.5 max-w-md">
              <div className="flex items-center justify-center gap-2.5">
                <h2 className="font-serif-custom text-[28px] text-[#24302A] leading-tight font-normal">
                  {track.title}
                </h2>
                <button
                  onClick={onToggleFavorite}
                  className="text-[#78837A] hover:text-[#24302A] transition-colors p-1"
                  title={isFavorite ? 'Remove favorite' : 'Add favorite'}
                >
                  <Heart
                    size={16}
                    strokeWidth={1.5}
                    className={isFavorite ? 'text-[#6E9662]' : 'text-[#78837A]'}
                  />
                </button>
              </div>

              <p className="text-[14px] text-[#78837A] font-sans">
                {track.artist} &bull; {track.album}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom: Progress bar, transport controls, volume */}
      <div className="max-w-md w-full mx-auto space-y-5 pb-4">
        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div
            ref={progressBarRef}
            onClick={handleProgressClick}
            className="w-full h-1.5 bg-[#DDE3D7] rounded-full cursor-pointer relative group py-1 -my-1"
          >
            <div
              className="h-1.5 bg-[#6E9662] rounded-full relative"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            >
              <div className="w-3 h-3 bg-[#6E9662] rounded-full absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_1px_2px_rgba(0,0,0,0.2)]" />
            </div>
          </div>
          <div className="flex justify-between text-[11px] text-[#78837A] font-mono tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Transport Controls */}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={onPrevious}
            className="text-[#24302A] hover:opacity-75 transition-opacity p-2"
            title="Previous"
          >
            <SkipBack size={20} strokeWidth={1.5} />
          </button>

          <button
            onClick={onTogglePlay}
            className="w-12 h-12 rounded-full bg-[#6E9662] text-white flex items-center justify-center hover:opacity-90 transition-opacity shadow-[0_2px_6px_rgba(0,0,0,0.08)]"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={20} strokeWidth={1.75} />
            ) : (
              <Play size={20} strokeWidth={1.75} className="ml-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            className="text-[#24302A] hover:opacity-75 transition-opacity p-2"
            title="Next"
          >
            <SkipForward size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            onClick={() => onVolumeChange(volume === 0 ? 0.7 : 0)}
            className="text-[#78837A] hover:text-[#24302A] transition-colors p-1"
          >
            {volume === 0 ? (
              <VolumeX size={15} strokeWidth={1.5} />
            ) : (
              <Volume2 size={15} strokeWidth={1.5} />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-32 h-1 bg-[#DDE3D7] rounded-full accent-[#6E9662] cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
