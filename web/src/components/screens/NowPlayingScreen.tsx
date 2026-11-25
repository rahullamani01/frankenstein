import React, { useState } from 'react';
import {
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ChevronDown,
  Heart,
  AlignLeft,
  Shuffle,
  Compass,
} from 'lucide-react';
import { Track } from '../../data/musicData';
import { AmbientBackground } from '../pixel/AmbientBackground';
import { Hillside } from '../pixel/Hillside';
import { ArtworkCrossfade } from '../pixel/ArtworkCrossfade';
import { PlayPauseIcon } from '../pixel/PlayPauseIcon';
import { PixelFrame, PixelEqualizer, PixelChip } from '../pixel/ui';
import { SyncedLyrics } from './SyncedLyrics';
import { frameToneFor } from '../../theme/pixel';
import { useScrubber } from '../../hooks/useScrubber';

export interface NowPlayingScreenProps {
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
  shuffle: boolean;
  onToggleShuffle: () => void;
  onToggleFavorite: () => void;
  onDiscoverSimilar: () => void;
  showRecommendations: boolean;
  onShowRecommendationsChange: (value: boolean) => void;
  lyricsRequested?: number;
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
  shuffle,
  onToggleShuffle,
  onToggleFavorite,
  onDiscoverSimilar,
  showRecommendations,
  onShowRecommendationsChange,
  lyricsRequested,
}) => {
  const [showLyrics, setShowLyrics] = useState(false);
  React.useEffect(() => {
    if (lyricsRequested) setShowLyrics(true);
  }, [lyricsRequested]);
  const seed = track.albumId || track.id || 'empty-room';
  const {
    barRef: progressBarRef,
    dragRatio,
    isDragging: isScrubbing,
    handlers: scrubHandlers,
  } = useScrubber(duration, onSeek);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const shownPercent = dragRatio != null ? dragRatio * 100 : progressPercent;
  const shownTime = dragRatio != null ? dragRatio * duration : currentTime;

  // The same framed print is shared by the artwork view and the lyrics view,
  // so the artwork flight still has a destination whichever one is open.
  const artwork = (
    <div className="np-art-frame">
      <PixelFrame
        tone={frameToneFor(seed)}
        plaque={
          <span className="np-art-plaque">
            <strong>{track.album || 'Untitled album'}</strong>
            <span>{track.source === 'Spotify' ? 'Spotify' : 'Pixel print'} · {track.year || '—'}</span>
          </span>
        }
      >
        <div className="piece-art" id="np-art-slot">
          <ArtworkCrossfade
            original={track.source === 'Spotify'}
            src={track.coverUrl}
            seed={seed}
            alt={`${track.title} by ${track.artist}`}
          />
        </div>
      </PixelFrame>
    </div>
  );

  return (
    <div id="screen-now-playing" className="np-room" data-playing={isPlaying ? 'true' : 'false'}>
      <Hillside playing={isPlaying} />
      <AmbientBackground src={track.coverUrl} seed={seed} />
      <div className="np-veil" aria-hidden="true" />

      <div className="np-inner">
        <div className="np-top">
          <button
            onClick={onClose}
            className="pixel-btn ghost small"
            title="Minimize now playing"
          >
            <ChevronDown size={14} strokeWidth={2} />
            <span>Minimize</span>
          </button>

          <PixelChip tone={track.source === 'Spotify' ? 'sky' : track.source === 'Apple Music' ? 'peach' : 'moss'}>
            <span className={`pixel-source-dot is-${track.source === 'Spotify' ? 'spotify' : track.source === 'Apple Music' ? 'apple' : 'local'}`} />
            Now playing · {track.source}
          </PixelChip>

          <div className="np-discovery-actions">
            <button type="button" className="pixel-btn ghost small" onClick={onDiscoverSimilar} disabled={!track.id} title="Discover similar songs">
              <Compass size={14} strokeWidth={1.8} />
              <span>Discover similar</span>
            </button>
            <label className="np-recommend-setting" title="Show recommendations after a song ends">
              <input type="checkbox" checked={showRecommendations} onChange={(event) => onShowRecommendationsChange(event.target.checked)} />
              <span>After song ends</span>
            </label>
          </div>

          <button
            onClick={() => setShowLyrics((value) => !value)}
            className={`pixel-btn small ${showLyrics ? '' : 'ghost'}`}
            title="Toggle lyrics"
            aria-pressed={showLyrics}
          >
            <AlignLeft size={13} strokeWidth={2} />
            <span>Lyrics</span>
          </button>
        </div>

        {showLyrics ? (
          <div className="np-lyrics-stage">
            <div className="np-lyrics-art">{artwork}</div>
            <SyncedLyrics
              track={track}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              onSeek={onSeek}
            />
          </div>
        ) : (
          <div className="np-body">
            <div className="np-art">{artwork}</div>

            <div className="np-info">
              <span className="px-label">Now playing</span>
              <div className="flex items-start gap-2">
                <h2 className="np-title" title={track.title}>{track.title || 'Nothing playing'}</h2>
                <button
                  onClick={onToggleFavorite}
                  className={`px-icon-btn mt-2 ${isFavorite ? 'is-fav' : ''}`}
                  title={isFavorite ? 'Remove favorite' : 'Add favorite'}
                  aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
                >
                  <Heart size={16} strokeWidth={1.8} fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
              </div>

              <p className="np-meta">
                <b>{track.artist || 'Unknown artist'}</b>
                {track.album ? <> — {track.album}</> : null}
                {track.year ? <> · {track.year}</> : null}
              </p>

              <div className="np-live-row">
                <PixelEqualizer playing={isPlaying} />
                <span className="px-label">
                  {isPlaying ? 'Playing' : 'Paused'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="np-controls">
          <div className="np-controls-inner">
            <div className="np-progress">
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
                  style={{ width: `${Math.min(100, Math.max(0, shownPercent))}%` }}
                >
                  <span className="px-progress-thumb" />
                </div>
              </div>
              <div className="np-times">
                <span>{formatTime(shownTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="np-transport">
              <button
                className={`np-step ${shuffle ? 'is-active' : ''}`}
                onClick={onToggleShuffle}
                title={shuffle ? 'Shuffle on' : 'Shuffle off'}
                aria-label="Shuffle"
                aria-pressed={shuffle}
              >
                <Shuffle size={17} strokeWidth={1.8} />
              </button>
              <button className="np-step" onClick={onPrevious} title="Previous" aria-label="Previous">
                <SkipBack size={19} strokeWidth={1.8} />
              </button>
              <button
                onClick={onTogglePlay}
                className="np-play"
                title={isPlaying ? 'Pause' : 'Play'}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                <PlayPauseIcon playing={isPlaying} size={20} strokeWidth={2} />
              </button>
              <button className="np-step" onClick={onNext} title="Next" aria-label="Next">
                <SkipForward size={19} strokeWidth={1.8} />
              </button>

              <div className="np-volume ml-auto">
                <button
                  onClick={() => onVolumeChange(volume === 0 ? 0.7 : 0)}
                  className="px-icon-btn"
                  title={volume === 0 ? 'Unmute' : 'Mute'}
                  aria-label={volume === 0 ? 'Unmute' : 'Mute'}
                >
                  {volume === 0 ? (
                    <VolumeX size={14} strokeWidth={1.8} />
                  ) : (
                    <Volume2 size={14} strokeWidth={1.8} />
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
