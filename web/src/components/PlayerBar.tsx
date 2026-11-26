import React, { useEffect, useRef } from 'react';
import {
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Heart,
  Shuffle,
  Repeat2,
  AudioLines,
  Sparkles,
  ListMusic,
} from 'lucide-react';
import { Track } from '../data/musicData';
import { ArtworkCrossfade } from './pixel/ArtworkCrossfade';
import { PlayPauseIcon } from './pixel/PlayPauseIcon';
import { PixelEqualizer, SourceTag } from './pixel/ui';
import { useScrubber } from '../hooks/useScrubber';
import { useGlassSheen } from '../hooks/useGlassSheen';

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
  shuffle: boolean;
  onToggleShuffle: () => void;
  onToggleFavorite: () => void;
  onOpenNowPlaying: () => void;
  onOpenLyrics: () => void;
  repeat: boolean;
  onToggleRepeat: () => void;
  autoplay: boolean;
  onToggleAutoplay: () => void;
  onOpenQueue: () => void;
  queueCount: number;
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
  shuffle,
  onToggleShuffle,
  onToggleFavorite,
  onOpenNowPlaying,
  onOpenLyrics,
  repeat,
  onToggleRepeat,
  autoplay,
  onToggleAutoplay,
  onOpenQueue,
  queueCount,
}) => {
  const barRef = useRef<HTMLElement | null>(null);
  const sheen = useGlassSheen<HTMLElement>();
  const swipe = useRef<{ active: boolean; pointerId: number; startY: number; dy: number } | null>(null);
  const swipeCleanup = useRef<() => void>(() => {});
  const {
    barRef: progressBarRef,
    dragRatio,
    isDragging: isScrubbing,
    handlers: scrubHandlers,
  } = useScrubber(duration, onSeek);

  const resetLift = () => {
    const bar = barRef.current;
    if (!bar) return;
    bar.style.transition = `transform ${220}ms cubic-bezier(0.22, 0.61, 0.36, 1)`;
    bar.style.transform = 'none';
    bar.style.opacity = '';
    window.setTimeout(() => {
      if (barRef.current) barRef.current.style.transition = '';
    }, 240);
  };

  const onSwipeMove = (event: PointerEvent) => {
    const state = swipe.current;
    if (!state?.active || event.pointerId !== state.pointerId) return;
    const bar = barRef.current;
    if (!bar) return;
    const raw = event.clientY - state.startY;
    state.dy = raw;
    const lift = Math.max(-14, Math.min(0, raw * 0.32));
    bar.style.transition = 'none';
    bar.style.transform = `translateY(${lift}px)`;
    bar.style.opacity = String(1 + lift / 90);
    if (event.cancelable && raw < -4) event.preventDefault();
  };

  const onSwipeEnd = () => {
    const state = swipe.current;
    const shouldOpen = Boolean(state && state.dy < -34);
    swipeCleanup.current();
    if (shouldOpen) {
      resetLift();
      onOpenNowPlaying();
      return;
    }
    resetLift();
  };

  const onSwipeStart = (event: React.PointerEvent<HTMLElement>) => {
    const target = event.target as Element;
    if (target.closest('button, a, input, [role="slider"]')) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    swipe.current = {
      active: true,
      pointerId: event.pointerId,
      startY: event.clientY,
      dy: 0,
    };
    window.addEventListener('pointermove', onSwipeMove, { passive: false });
    window.addEventListener('pointerup', onSwipeEnd);
    window.addEventListener('pointercancel', onSwipeEnd);
    swipeCleanup.current = () => {
      window.removeEventListener('pointermove', onSwipeMove);
      window.removeEventListener('pointerup', onSwipeEnd);
      window.removeEventListener('pointercancel', onSwipeEnd);
      if (swipe.current) swipe.current.active = false;
    };
  };

  useEffect(() => () => {
    swipeCleanup.current();
    resetLift();
  }, []);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const shownPercent = dragRatio != null ? dragRatio * 100 : progressPercent;
  const shownTime = dragRatio != null ? dragRatio * duration : currentTime;

  if (!currentTrack) {
    return (
      <footer id="app-player-bar" className="pixel-player" ref={barRef}>
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
    <footer
      id="app-player-bar"
      className="pixel-player"
      ref={(node) => { barRef.current = node; sheen.ref.current = node; }}
      onPointerDown={onSwipeStart}
      onPointerEnter={sheen.onPointerEnter}
      onPointerMove={sheen.onPointerMove}
      onPointerLeave={sheen.onPointerLeave}
    >
      <div className="player-left">
        <button
          id="player-thumb-art"
          onClick={onOpenNowPlaying}
          className="player-thumb"
          title="Open now playing"
          aria-label="Open now playing"
        >
          <ArtworkCrossfade
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
          <button
            className={`player-step ${shuffle ? 'is-active' : ''}`}
            onClick={onToggleShuffle}
            title={shuffle ? 'Shuffle on' : 'Shuffle off'}
            aria-label="Shuffle"
            aria-pressed={shuffle}
          >
            <Shuffle size={14} strokeWidth={1.8} />
          </button>
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
            <PlayPauseIcon playing={isPlaying} size={15} strokeWidth={2} />
          </button>
          <button className="player-step" onClick={onNext} title="Next track" aria-label="Next track">
            <SkipForward size={15} strokeWidth={1.8} />
          </button>
          <button className={`player-step ${repeat ? 'is-active' : ''}`}
            onClick={onToggleRepeat} title={repeat ? 'Repeat on' : 'Repeat off'}
            aria-label="Repeat" aria-pressed={repeat}>
            <Repeat2 size={15} strokeWidth={1.8} />
          </button>
        </div>

        <div className="player-progress-row">
          <span>{formatTime(shownTime)}</span>
          <div
            ref={progressBarRef}
            {...scrubHandlers}
            className={`px-progress ${isScrubbing ? 'is-dragging' : ''}`}
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(shownTime)}
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') onSeek(Math.min(duration, currentTime + 5));
              if (event.key === 'ArrowLeft') onSeek(Math.max(0, currentTime - 5));
            }}
          >
            <div
              className="px-progress-fill"
              style={{ transform: `scaleX(${Math.min(1, Math.max(0, shownPercent / 100))})` }}
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
        <button type="button" className="px-icon-btn" onClick={onOpenLyrics}
          aria-label="Open lyrics" title="Lyrics"><AudioLines size={17} strokeWidth={1.7} /></button>
        <button type="button" className={`px-icon-btn ${autoplay ? 'is-active' : ''}`}
          onClick={onToggleAutoplay} aria-label="Autoplay" aria-pressed={autoplay}
          title={autoplay ? 'Autoplay on' : 'Autoplay off'}>
          <Sparkles size={16} strokeWidth={1.7} />
        </button>
        <button type="button" className="px-icon-btn queue-button" onClick={onOpenQueue}
          aria-label="Open queue" title="Queue">
          <ListMusic size={16} strokeWidth={1.7} />
          {queueCount > 0 && <span className="queue-count" aria-hidden="true">{queueCount > 99 ? '99+' : queueCount}</span>}
        </button>
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
