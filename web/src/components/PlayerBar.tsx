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
import { PixelArt } from './pixel/PixelArt';
import { PixelEqualizer, SourceTag } from './pixel/ui';

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

  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickRatio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(clickRatio * duration);
  };

  if (!currentTrack) {
    return (
      <footer id="app-player-bar" className="pixel-player">
        <div className="flex items-center gap-3">
          <div className="player-thumb flex items-center justify-center font-[family-name:var(--font-pixel)] text-[11px] text-[color:var(--muted)]">
            ♪
          </div>
          <div>
            <p className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>
              Nothing on the wall yet
            </p>
            <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
              Pick a framed album to begin listening
            </p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer id="app-player-bar" className="pixel-player">
      <div className="player-left">
        <button
          onClick={onOpenNowPlaying}
          className="player-thumb"
          title="Open now playing"
          aria-label="Open now playing"
        >
          <PixelArt
            original={currentTrack.source === 'Spotify'}
            src={currentTrack.coverUrl}
            seed={currentTrack.albumId || currentTrack.id}
            alt={currentTrack.album}
            grid={26}
          />
        </button>

        <div className="player-meta">
          <div className="player-title-row">
            <button className="player-title" onClick={onOpenNowPlaying} title={currentTrack.title}>
              {currentTrack.title}
            </button>
            <PixelEqualizer playing={isPlaying} />
          </div>
          <p className="player-artist">
            {currentTrack.artist}
            {currentTrack.album ? ` · ${currentTrack.album}` : ''}
          </p>
        </div>

        <button
          id="player-favorite-btn"
          onClick={onToggleFavorite}
          className={`px-icon-btn ${isFavorite ? 'is-fav' : ''}`}
          title={isFavorite ? 'Remove favorite' : 'Add favorite'}
          aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
        >
          <Heart size={13} strokeWidth={1.8} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="player-center">
        <div className="player-transport">
          <button className="player-step" onClick={onPrevious} title="Previous track" aria-label="Previous track">
            <SkipBack size={15} strokeWidth={1.8} />
          </button>
          <button
            id="player-play-btn"
            onClick={onTogglePlay}
            className="player-play"
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={15} strokeWidth={2} />
            ) : (
              <Play size={15} strokeWidth={2} className="ml-0.5" />
            )}
          </button>
          <button className="player-step" onClick={onNext} title="Next track" aria-label="Next track">
            <SkipForward size={15} strokeWidth={1.8} />
          </button>
        </div>

        <div className="player-progress-row">
          <span>{formatTime(currentTime)}</span>
          <div
            ref={progressBarRef}
            onClick={handleProgressClick}
            className="px-progress"
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(currentTime)}
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') onSeek(Math.min(duration, currentTime + 5));
              if (event.key === 'ArrowLeft') onSeek(Math.max(0, currentTime - 5));
            }}
          >
            <div
              className="px-progress-fill"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            >
              <span className="px-progress-thumb" />
            </div>
          </div>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="player-right">
        <SourceTag source={currentTrack.source} className="player-source" />
        <button
          onClick={() => onVolumeChange(volume === 0 ? 0.7 : 0)}
          className="px-icon-btn"
          title={volume === 0 ? 'Unmute' : 'Mute'}
          aria-label={volume === 0 ? 'Unmute' : 'Mute'}
        >
          {volume === 0 ? (
            <VolumeX size={14} strokeWidth={1.7} />
          ) : (
            <Volume2 size={14} strokeWidth={1.7} />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(event) => onVolumeChange(parseFloat(event.target.value))}
          className="px-range"
          title="Volume"
          aria-label="Volume"
        />
        <button
          id="player-expand-btn"
          onClick={onOpenNowPlaying}
          className="px-icon-btn"
          title="Open the listening room"
          aria-label="Open the listening room"
        >
          <Maximize2 size={13} strokeWidth={1.8} />
        </button>
      </div>
    </footer>
  );
};
