import React, { useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Heart,
} from 'lucide-react';
import { Track } from '../data/musicData';
import { AcrylicCdPlayer } from './AcrylicCdPlayer';

interface PlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isFavorite: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleFavorite: () => void;
  onOpenNowPlaying: () => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isFavorite,
  onTogglePlay,
  onNext,
  onPrevious,
  onSeek,
  onVolumeChange,
  onToggleFavorite,
  onOpenNowPlaying,
}) => {
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

  if (!currentTrack) {
    return (
      <footer
        id="app-player-bar"
        className="h-[72px] bg-[#EEF1EA] border-t border-[#E2E6DD] px-6 flex items-center justify-between select-none text-[13px] text-[#78837A]"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-[8px] bg-[#E2E6DD]/60 flex items-center justify-center text-[#78837A] text-xs">
            --
          </div>
          <div>
            <p className="text-[13px] font-medium text-[#78837A]">No track selected</p>
            <p className="text-[11px] text-[#78837A]/70">Select a track to start playback</p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer
      id="app-player-bar"
      className="h-[72px] bg-[#EEF1EA] border-t border-[#E2E6DD] px-6 flex items-center justify-between select-none relative z-20"
    >
      {/* Left: Track Information */}
      <div className="flex items-center gap-2.5 w-[290px] min-w-0">
        <button
          onClick={onOpenNowPlaying}
          className="relative group rounded-[8px] overflow-hidden flex-shrink-0 cursor-pointer"
          title="Open Now Playing"
        >
          <img
            src={currentTrack.coverUrl}
            alt={currentTrack.album}
            className="w-11 h-11 object-cover rounded-[8px] border border-black/5"
          />
        </button>

        {/* Functioning Rotating Acrylic CD Player beside the album art */}
        <button
          onClick={onOpenNowPlaying}
          className="relative flex-shrink-0 cursor-pointer hover:opacity-95 transition-opacity"
          title="Open Now Playing"
        >
          <AcrylicCdPlayer
            isPlaying={isPlaying}
            track={currentTrack}
            size={44}
          />
        </button>

        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <p
              onClick={onOpenNowPlaying}
              className="text-[13px] font-medium text-[#24302A] truncate hover:underline cursor-pointer"
            >
              {currentTrack.title}
            </p>
            <button
              id="player-favorite-btn"
              onClick={onToggleFavorite}
              className="text-[#78837A] hover:text-[#24302A] transition-colors p-0.5"
              title={isFavorite ? 'Remove favorite' : 'Add favorite'}
            >
              <Heart
                size={13}
                strokeWidth={1.5}
                className={isFavorite ? 'text-[#6E9662]' : 'text-[#78837A]'}
              />
            </button>
          </div>
          <p className="text-[12px] text-[#78837A] truncate">
            {currentTrack.artist}
          </p>
        </div>
      </div>

      {/* Center: Controls & Scrubber */}
      <div className="flex-1 max-w-[540px] px-4 flex flex-col items-center gap-1.5">
        {/* Transport Buttons */}
        <div className="flex items-center gap-4">
          <button
            id="player-prev-btn"
            onClick={onPrevious}
            className="text-[#24302A] hover:opacity-75 transition-opacity p-1"
            title="Previous track"
          >
            <SkipBack size={16} strokeWidth={1.5} />
          </button>

          <button
            id="player-play-btn"
            onClick={onTogglePlay}
            className="w-8 h-8 rounded-full bg-[#6E9662] text-white flex items-center justify-center hover:opacity-90 transition-opacity shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={14} strokeWidth={1.75} />
            ) : (
              <Play size={14} strokeWidth={1.75} className="ml-0.5" />
            )}
          </button>

          <button
            id="player-next-btn"
            onClick={onNext}
            className="text-[#24302A] hover:opacity-75 transition-opacity p-1"
            title="Next track"
          >
            <SkipForward size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Progress Bar & Durations */}
        <div className="w-full flex items-center gap-2.5 text-[11px] text-[#78837A] font-mono">
          <span className="w-8 text-right tabular-nums">{formatTime(currentTime)}</span>
          <div
            ref={progressBarRef}
            onClick={handleProgressClick}
            className="flex-1 h-1.5 bg-[#DDE3D7] rounded-full cursor-pointer relative group py-1 -my-1"
          >
            <div
              className="h-1.5 bg-[#6E9662] rounded-full relative"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            >
              {/* Scrubber thumb - pill reserved */}
              <div className="w-2.5 h-2.5 bg-[#6E9662] rounded-full absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_1px_2px_rgba(0,0,0,0.15)]" />
            </div>
          </div>
          <span className="w-8 text-left tabular-nums">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Volume & Expand */}
      <div className="flex items-center justify-end gap-3 w-[220px]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onVolumeChange(volume === 0 ? 0.7 : 0)}
            className="text-[#78837A] hover:text-[#24302A] transition-colors p-1"
            title={volume === 0 ? 'Unmute' : 'Mute'}
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
            className="w-20 h-1 bg-[#DDE3D7] rounded-full accent-[#6E9662] cursor-pointer"
            title="Volume"
          />
        </div>

        <button
          id="player-expand-btn"
          onClick={onOpenNowPlaying}
          className="text-[#78837A] hover:text-[#24302A] transition-colors p-1.5 ml-1"
          title="Open Now Playing"
        >
          <Maximize2 size={14} strokeWidth={1.5} />
        </button>
      </div>
    </footer>
  );
};
