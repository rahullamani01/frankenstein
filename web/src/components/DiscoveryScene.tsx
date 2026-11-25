import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { ArrowLeft, Heart, ListMusic, Mic2, MoreHorizontal, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import type { Track } from '../data/musicData';
import { useAmbientPalette } from '../hooks/useAmbientPalette';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { ArtworkCrossfade } from './pixel/ArtworkCrossfade';
import { trackIdentity } from '../recommendations/similar';
import './discovery.css';

export interface DiscoverySceneProps {
  track: Track;
  cards: Track[];
  queuedId?: string;
  queuedTracks: Track[];
  loading: boolean;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  autoPlay: boolean;
  startCountdown: boolean;
  preview: boolean;
  onAutoPlayChange: (value: boolean) => void;
  onPreviewChange: (value: boolean) => void;
  onClose: () => void;
  onPlay: (track: Track) => void;
  onTogglePlay: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onLyrics: () => void;
  onQueue: (track: Track, next: boolean) => void;
  onFavorite: (track: Track) => void;
  onVolume: (value: number) => void;
}

const preload = (src: string) => {
  if (!src) return;
  const image = new Image();
  image.src = src;
  void image.decode?.().catch(() => {});
};

const backdropCache = new Map<string, string>();
async function blurredArtwork(src: string): Promise<string> {
  if (!src) return '';
  const cached = backdropCache.get(src);
  if (cached) return cached;
  try {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = src;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    canvas.getContext('2d')?.drawImage(image, 0, 0, 48, 48);
    const small = canvas.toDataURL('image/jpeg', 0.65);
    backdropCache.set(src, small);
    if (backdropCache.size > 40) backdropCache.delete(backdropCache.keys().next().value!);
    return small;
  } catch {
    return src;
  }
}

export function DiscoveryScene({
  track, cards, queuedId, queuedTracks, loading, isPlaying, currentTime, volume,
  autoPlay, startCountdown, preview, onAutoPlayChange, onPreviewChange, onClose, onPlay,
  onTogglePlay, onPrevious, onNext, onLyrics, onQueue, onFavorite,
  onVolume,
}: DiscoverySceneProps) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [background, setBackground] = useState('');
  const [backgroundVisible, setBackgroundVisible] = useState(false);
  const [menu, setMenu] = useState(false);
  const [settings, setSettings] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [countdown, setCountdown] = useState(false);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const container = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number; id: number } | null>(null);
  const swiped = useRef(false);
  const lastWheel = useRef(0);
  const swipeTimer = useRef(0);
  const cancelled = useRef(false);
  const leavingRef = useRef(false);
  const playRef = useRef(onPlay);
  playRef.current = onPlay;
  const leaveTimer = useRef(0);
  const bgTimer = useRef(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const selected = cards[index] ?? cards[0];
  const palette = useAmbientPalette(selected?.coverUrl, selected?.albumId || selected?.id || track.id);
  const previewUrl = selected?.previewUrl;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    container.current?.focus({ preventScroll: true });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    cards.forEach((item) => preload(item.coverUrl));
  }, [cards]);

  useEffect(() => {
    setIndex((value) => Math.max(0, Math.min(value, cards.length - 1)));
  }, [cards.length]);

  useEffect(() => {
    let cancelled = false;
    setBackgroundVisible(false);
    window.clearTimeout(bgTimer.current);
    void blurredArtwork(selected?.coverUrl || '').then((small) => {
      if (cancelled) return;
      bgTimer.current = window.setTimeout(() => {
        setBackground(small);
        setBackgroundVisible(true);
      }, reduced ? 0 : 230);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(bgTimer.current);
    };
  }, [selected?.coverUrl, reduced]);

  const cancelCountdown = useCallback(() => {
    cancelled.current = true;
    setCountdown(false);
  }, []);

  const exit = useCallback((action: () => void) => {
    cancelCountdown();
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(action, reduced ? 0 : 480);
  }, [cancelCountdown, reduced]);

  useEffect(() => () => {
    window.clearTimeout(leaveTimer.current);
    window.clearTimeout(bgTimer.current);
    window.clearTimeout(swipeTimer.current);
    audio.current?.pause();
  }, []);

  useEffect(() => {
    if (reduced) return;
    const tilt = (event: DeviceOrientationEvent) => {
      const x = Math.max(-1, Math.min(1, (event.gamma || 0) / 35));
      const y = Math.max(-1, Math.min(1, (event.beta || 0) / 35));
      container.current?.style.setProperty('--pointer-x', `${x * 6}px`);
      container.current?.style.setProperty('--pointer-y', `${y * 4}px`);
    };
    window.addEventListener('deviceorientation', tilt);
    return () => window.removeEventListener('deviceorientation', tilt);
  }, [reduced]);

  useEffect(() => {
    if (!autoPlay || !startCountdown || !selected || loading || cancelled.current) return;
    setCountdown(true);
    const timer = window.setTimeout(() => {
      setCountdown(false);
      exit(() => playRef.current(selected));
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [autoPlay, startCountdown, loading, selected?.id, exit]);

  useEffect(() => {
    audio.current?.pause();
    audio.current = null;
    if (!preview || !previewUrl) return;
    const timer = window.setTimeout(() => {
      const sample = new Audio(previewUrl);
      sample.volume = Math.min(volume, 0.18);
      audio.current = sample;
      void sample.play().catch(() => {});
      sample.addEventListener('timeupdate', () => {
        if (sample.currentTime >= 20) sample.pause();
      });
    }, 1100);
    return () => {
      window.clearTimeout(timer);
      audio.current?.pause();
      audio.current = null;
    };
  }, [selected?.id, preview, previewUrl]);

  useEffect(() => {
    if (audio.current) audio.current.volume = Math.min(volume, 0.18);
  }, [volume]);

  const move = (direction: number) => {
    cancelCountdown();
    setMenu(false);
    setIndex((value) => Math.max(0, Math.min(cards.length - 1, value + direction)));
  };

  const handleKey = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      exit(onClose);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1);
    } else if (event.key === 'Enter' && selected
      && (event.target === container.current || (event.target as Element).closest('.discovery-card'))) {
      event.preventDefault();
      exit(() => playRef.current(selected));
    }
  };

  const handlePointerDown = (event: PointerEvent) => {
    if ((event.target as Element).closest('.discovery-controls, .discovery-header, .discovery-card-menu-wrap')) return;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const handlePointerUp = (event: PointerEvent) => {
    if (!gesture.current || gesture.current.id !== event.pointerId) return;
    const dx = event.clientX - gesture.current.x;
    gesture.current = null;
    if (Math.abs(dx) > 35) {
      swiped.current = true;
      move(dx < 0 ? 1 : -1);
      window.clearTimeout(swipeTimer.current);
      swipeTimer.current = window.setTimeout(() => { swiped.current = false; }, 300);
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    if (reduced || event.pointerType !== 'mouse') return;
    const x = (event.clientX / window.innerWidth - 0.5) * 2;
    const y = (event.clientY / window.innerHeight - 0.5) * 2;
    container.current?.style.setProperty('--pointer-x', `${x * 7}px`);
    container.current?.style.setProperty('--pointer-y', `${y * 5}px`);
  };

  const playSelected = () => {
    if (selected) exit(() => onPlay(selected));
  };

  return (
    <div
      ref={container}
      className="discovery-scene"
      data-ready={ready && !leaving ? 'true' : 'false'}
      data-reduced={reduced || undefined}
      role="dialog"
      aria-modal="true"
      aria-label="Up next and similar songs"
      tabIndex={-1}
      onKeyDown={handleKey}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={onPointerMove}
      onClickCapture={(event) => {
        if (swiped.current) {
          event.stopPropagation();
          swiped.current = false;
        }
      }}
      onWheel={(event) => {
        if (Math.abs(event.deltaX) > 20 && Math.abs(event.deltaX) > Math.abs(event.deltaY) && performance.now() - lastWheel.current > 420) {
          lastWheel.current = performance.now();
          move(event.deltaX > 0 ? 1 : -1);
        }
      }}
      style={{ '--discovery-tint': palette.a, '--discovery-tint-alt': palette.b } as CSSProperties}
    >
      <div
        className="discovery-backdrop"
        style={{
          backgroundImage: background ? `url("${background.replace(/"/g, '%22')}")` : undefined,
          opacity: backgroundVisible ? 1 : 0,
        }}
        aria-hidden="true"
      />
      <div className="discovery-wash" aria-hidden="true" />

      <header className="discovery-header">
        <button type="button" className="discovery-back" onClick={() => exit(onClose)}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="discovery-heading">
          <span>THE LISTENING GALLERY</span>
          <h1>Up next <em>/</em> Similar to this</h1>
          <p>Inspired by {track.title} · {track.artist}</p>
        </div>
        <div className="discovery-settings-wrap">
          <button type="button" className="discovery-icon" aria-label="Recommendation settings" aria-expanded={settings} onClick={() => { cancelCountdown(); setSettings(!settings); }}>
            ⚙
          </button>
          {settings && (
            <div className="discovery-settings">
              <label><input type="checkbox" checked={autoPlay} onChange={(e) => onAutoPlayChange(e.target.checked)} /> Auto-play next recommendation</label>
              <label><input type="checkbox" checked={preview} onChange={(e) => onPreviewChange(e.target.checked)} disabled={!cards.some((item) => Boolean(item.previewUrl))} /> Quiet preview {previewUrl ? '' : '(when available)'}</label>
            </div>
          )}
        </div>
      </header>

      <div className="discovery-carousel" aria-label="Recommended tracks">
        {loading && cards.length === 0 ? (
          <div className="discovery-loading" role="status">
            {[0, 1, 2, 3, 4].map((position) => <div key={position} className="discovery-skeleton" style={{ '--slot': position - 2 } as CSSProperties} />)}
            <span>Finding your next listen…</span>
          </div>
        ) : cards.length === 0 ? (
          <div className="discovery-empty">
            <strong>Nothing to suggest just yet</strong>
            <p>Try a different song or add more music to your library.</p>
          </div>
        ) : cards.map((item, position) => {
          const distance = position - index;
          return (
            <div
              className="discovery-position"
              key={trackIdentity(item)}
              data-distance={Math.max(-3, Math.min(3, distance))}
              style={{
                '--slot': distance,
                '--depth': Math.min(2, Math.abs(distance)),
                '--stagger': `${Math.min(position, 5) * 60}ms`,
                zIndex: 10 - Math.abs(distance),
              } as CSSProperties}
            >
              <div className="discovery-float" style={{ animationDelay: `${-position * 0.87}s` }}>
                <button
                  type="button"
                  className="discovery-card"
                  aria-label={`${item.title} by ${item.artist}${position === index ? ', focused — play' : ', focus card'}${trackIdentity(item) === queuedId ? ', next in queue' : ''}`}
                  aria-current={position === index ? 'true' : undefined}
                  tabIndex={Math.abs(distance) > 2 ? -1 : 0}
                  onClick={() => {
                    cancelCountdown();
                    if (position === index) playSelected();
                    else { setIndex(position); setMenu(false); }
                  }}
                >
                  <span className="discovery-art">
                    {item.coverUrl ? (
                      <img
                        src={item.coverUrl}
                        alt=""
                        loading={Math.abs(distance) <= 2 ? 'eager' : 'lazy'}
                        onLoad={() => setLoaded((previous) => ({ ...previous, [trackIdentity(item)]: true }))}
                        className={loaded[trackIdentity(item)] ? 'is-loaded' : ''}
                      />
                    ) : <ArtworkCrossfade original={false} seed={item.albumId || item.id} alt="" />}
                  </span>
                  <span className="discovery-card-copy">
                    {trackIdentity(item) === queuedId && <span className="discovery-queued">NEXT IN QUEUE</span>}
                    <strong>{item.title}</strong>
                    <small>{item.artist}</small>
                  </span>
                  {position === index && countdown && (
                    <svg className="discovery-countdown" viewBox="0 0 40 40" aria-label="Auto-playing in ten seconds">
                      <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="3" />
                      <circle className="discovery-countdown-progress" cx="20" cy="20" r="16" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="101" />
                    </svg>
                  )}
                </button>
                {position === index && selected && (
                  <div className="discovery-card-menu-wrap">
                    <button type="button" className="discovery-icon" aria-label="More options for focused song" aria-expanded={menu} onClick={() => { cancelCountdown(); setMenu(!menu); }}>
                      <MoreHorizontal size={20} />
                    </button>
                    {menu && <div className="discovery-card-menu">
                      <button type="button" onClick={() => { onQueue(selected, true); setMenu(false); }}>Play next</button>
                      <button type="button" onClick={() => { onQueue(selected, false); setMenu(false); }}>Add to queue</button>
                      <button type="button" onClick={() => { onFavorite(selected); setMenu(false); }}><Heart size={14} /> {selected.isFavorite ? 'Unfavorite' : 'Favorite'}</button>
                    </div>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <nav className="discovery-controls" aria-label="Playback controls">
        <button type="button" aria-label="Previous track" onClick={() => exit(onPrevious)}><SkipBack size={20} fill="currentColor" /></button>
        <button type="button" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={() => { cancelCountdown(); onTogglePlay(); }}>{isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</button>
        <button type="button" aria-label="Next track" onClick={() => exit(onNext)}><SkipForward size={20} fill="currentColor" /></button>
        <div className="discovery-mini" aria-label={`Last played: ${track.title} by ${track.artist}`}>
          <div className="discovery-mini-art">{track.coverUrl ? <img src={track.coverUrl} alt="" /> : <ArtworkCrossfade original={false} seed={track.id} alt="" />}</div>
          <span><strong>{track.title}</strong><small>{track.artist}</small></span>
          <div className="discovery-mini-progress" style={{ '--progress': `${Math.min(100, currentTime / Math.max(1, track.durationSec) * 100)}%` } as CSSProperties} />
        </div>
        <button type="button" className="discovery-extra" aria-label="Open lyrics" onClick={() => exit(onLyrics)}><Mic2 size={18} /></button>
        <div className="discovery-queue-wrap">
          <button type="button" className="discovery-extra" aria-label="Show queue" aria-expanded={queueOpen} onClick={() => { cancelCountdown(); setQueueOpen(!queueOpen); }}><ListMusic size={18} /></button>
          {queueOpen && <div className="discovery-queue-list"><strong>Up next</strong>{queuedTracks.length
            ? queuedTracks.map((item) => <button type="button" key={trackIdentity(item)} onClick={() => exit(() => onPlay(item))}>{item.title} <small>{item.artist}</small></button>)
            : <p>Your queue is empty. Add a song from the cards.</p>}</div>}
        </div>
        <button type="button" className="discovery-extra" aria-label={volume === 0 ? 'Unmute' : 'Mute'} onClick={() => onVolume(volume === 0 ? 0.7 : 0)}>{volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        <input className="discovery-volume" type="range" min="0" max="1" step="0.01" aria-label="Volume" value={volume} onChange={(e) => onVolume(Number(e.target.value))} />
      </nav>
      {selected && <span className="discovery-instruction">← → Browse · Enter Play · Esc Back</span>}
    </div>
  );
}
