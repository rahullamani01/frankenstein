import React, { useEffect, useRef, useState } from 'react';
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
import { PixelArt } from '../pixel/PixelArt';
import { LivingScene } from '../pixel/LivingScene';
import { PixelFrame, PixelEqualizer, PixelChip } from '../pixel/ui';
import { api, LyricsResult } from '../../api/client';
import { frameToneFor, sceneFor } from '../../theme/pixel';

interface NowPlayingScreenProps {
  track: Track;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isFavorite: boolean;
  darkMode: boolean;
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
  darkMode,
  onClose,
  onTogglePlay,
  onNext,
  onPrevious,
  onSeek,
  onVolumeChange,
  onToggleFavorite,
}) => {
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsState, setLyricsState] = useState<{
    key: string; result: LyricsResult | null; loading: boolean; error: string | null;
  } | null>(null);
  const [lyricsRetry, setLyricsRetry] = useState(0);
  const [followLyrics, setFollowLyrics] = useState(true);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const activeLyricRef = useRef<HTMLButtonElement>(null);
  const lyricSheetRef = useRef<HTMLDivElement>(null);
  const lyricKey = `${track.source}:${track.id}:${track.title}:${track.artist}:${track.album}:${track.durationSec}`;
  const lyrics = lyricsState?.key === lyricKey ? lyricsState.result : null;
  const lyricsLoading = showLyrics && (lyricsState?.key !== lyricKey || lyricsState.loading);
  const lyricsError = lyricsState?.key === lyricKey ? lyricsState.error : null;

  useEffect(() => {
    if (!showLyrics) return;
    if (!track.id || !track.title || !track.artist) {
      setLyricsState({ key: lyricKey, result: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    const abort = new AbortController();
    setLyricsState({ key: lyricKey, result: null, loading: true, error: null });
    const load = async () => {
      try {
        let result: LyricsResult | null = null;
        if (track.source === 'Local') {
          result = await api.lyrics(track.id, abort.signal);
          if (result.synced?.length || result.plain) {
            result = { ...result, provider: 'Embedded lyrics' };
          }
        }
        if (!result?.synced?.length && !result?.plain) {
          result = await api.catalogLyrics(track, abort.signal);
        }
        if (!cancelled) setLyricsState({ key: lyricKey, result, loading: false, error: null });
      } catch {
        if (!cancelled) setLyricsState({
          key: lyricKey, result: null, loading: false,
          error: 'Could not load lyrics. The library server or lyrics provider may be unavailable. Try again shortly.',
        });
      }
    };
    void load();
    return () => {
      cancelled = true;
      abort.abort();
    };
  }, [lyricKey, showLyrics, lyricsRetry]);

  const synced = lyrics?.synced || [];
  const activeIndex = synced.reduce(
    (active, [time], index) => (time <= currentTime * 1000 ? index : active),
    -1
  );

  useEffect(() => {
    const sheet = lyricSheetRef.current;
    const active = activeLyricRef.current;
    if (showLyrics && followLyrics && activeIndex >= 0 && sheet && active) {
      const top = sheet.scrollTop + active.getBoundingClientRect().top - sheet.getBoundingClientRect().top
        - sheet.clientHeight / 2 + active.clientHeight / 2;
      sheet.scrollTo({
        top: Math.max(0, top),
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
    }
  }, [activeIndex, showLyrics, followLyrics]);

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

  const seed = track.albumId || track.id || 'empty-room';

  return (
    <div id="screen-now-playing" className="np-room">
      <LivingScene
        seed={seed}
        variant={sceneFor(seed, 2)}
        night={darkMode}
        playing={isPlaying}
        notes
        label={`A living pixel landscape for ${track.title}`}
      />
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
          <div className="np-lyrics-wrap">
            <div className="np-lyrics" ref={lyricSheetRef} aria-label={`Lyrics for ${track.title}`} aria-busy={lyricsLoading}>
              <div className="flex items-center justify-between gap-4 mb-4">
                <span className="px-label">Lyric sheet</span>
                <span className="px-label">{lyrics?.synced?.length ? 'Time-synced' : track.source}</span>
              </div>
              <div className="lyric-song-heading">
                <strong>{track.title}</strong>
                <span>{track.artist}</span>
              </div>
              {synced.length > 0 && (
                <button className="px-switch lyric-follow" aria-pressed={followLyrics}
                  onClick={() => setFollowLyrics((value) => !value)}>
                  {followLyrics ? 'Auto-follow on' : 'Auto-follow off'}
                </button>
              )}
              {synced.length > 0 ? (
                synced.map(([time, line], index) => (
                  <button
                    type="button"
                    key={index}
                    ref={index === activeIndex ? activeLyricRef : undefined}
                    className={`lyric-line ${index === activeIndex ? 'is-active' : ''}`}
                    onClick={() => onSeek(time / 1000)}
                    aria-current={index === activeIndex ? 'true' : undefined}
                    title={`Jump to ${formatTime(time / 1000)}`}
                  >
                    {line || '♪'}
                  </button>
                ))
              ) : lyrics?.plain ? (
                lyrics.plain.split('\n').map((line, index) => (
                  <p key={index} className="lyric-line is-plain">
                    {line || '\u00a0'}
                  </p>
                ))
              ) : (
                <p className="text-sm" role="status" style={{ color: 'var(--muted)' }}>
                  {lyricsLoading
                    ? 'Finding lyrics…'
                    : lyricsError
                      ? lyricsError
                      : lyrics?.instrumental
                        ? 'An instrumental piece — no lyrics to sing.'
                        : 'No matching lyrics found for this recording yet.'}
                </p>
              )}
              {!lyricsLoading && (!lyrics || (!lyrics.synced?.length && !lyrics.plain && !lyrics.instrumental)) && (
                <button className="pixel-btn ghost small mt-4" onClick={() => setLyricsRetry((value) => value + 1)}>
                  Try again
                </button>
              )}
              <div className="lyric-attribution">
                {lyrics?.provider === 'Embedded lyrics' ? <span>From your file’s tags</span> : (
                  <>
                    <a href={lyrics?.providerUrl || 'https://lrclib.net'} target="_blank" rel="noreferrer">
                      Lyrics via LRCLIB ↗
                    </a>
                    <span>Independent provider · availability and timing vary.</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="np-body">
            <div className="np-art">
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
                  <div className="piece-art">
                    <PixelArt
                      original={track.source === 'Spotify'}
                      src={track.coverUrl}
                      seed={seed}
                      alt={`${track.title} by ${track.artist}`}
                      grid={64}
                    />
                  </div>
                </PixelFrame>
              </div>
            </div>

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
              <div className="np-times">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="np-transport">
              <button className="np-step" onClick={onPrevious} title="Previous" aria-label="Previous">
                <SkipBack size={19} strokeWidth={1.8} />
              </button>
              <button
                onClick={onTogglePlay}
                className="np-play"
                title={isPlaying ? 'Pause' : 'Play'}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause size={20} strokeWidth={2} />
                ) : (
                  <Play size={20} strokeWidth={2} className="ml-0.5" />
                )}
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
