import { useEffect } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ListMusic,
  Play,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { Track } from '../data/musicData';
import { trackIdentity } from '../recommendations/similar';
import { ArtworkCrossfade } from './pixel/ArtworkCrossfade';

export interface QueuePanelProps {
  open: boolean;
  currentTrack: Track | null;
  upNext: Track[];
  context: Track[];
  autoplayTracks: Track[];
  autoplay: boolean;
  loading: boolean;
  onClose: () => void;
  onPlay: (track: Track, fromAutoplay: boolean) => void;
  onRemoveUpNext: (track: Track) => void;
  onRemoveAutoplay: (track: Track) => void;
  onMoveAutoplay: (track: Track, direction: -1 | 1) => void;
  onToggleAutoplay: () => void;
}

function QueueArt({ track }: { track: Track }) {
  return (
    <span className="queue-art" aria-hidden="true">
      <ArtworkCrossfade
        original={Boolean(track.coverUrl) && track.source === 'Spotify'}
        src={track.coverUrl}
        seed={track.albumId || track.id}
        alt=""
        grid={18}
      />
    </span>
  );
}

export function QueuePanel({
  open,
  currentTrack,
  upNext,
  context,
  autoplayTracks,
  autoplay,
  loading,
  onClose,
  onPlay,
  onRemoveUpNext,
  onRemoveAutoplay,
  onMoveAutoplay,
  onToggleAutoplay,
}: QueuePanelProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const manualIds = new Set(upNext.map(trackIdentity));
  const seen = new Set<string>();
  const upcoming = [...upNext, ...context].filter((track) => {
    if (!track.id || trackIdentity(track) === (currentTrack ? trackIdentity(currentTrack) : '')) return false;
    const id = trackIdentity(track);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  return (
    <div className="queue-backdrop" onClick={onClose}>
      <section
        className="queue-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Playback queue"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="queue-header">
          <div>
            <span className="queue-eyebrow"><ListMusic size={14} /> Listening queue</span>
            <h2>Up next</h2>
            {currentTrack?.id && (
              <p>Playing <strong>{currentTrack.title}</strong>{currentTrack.artist ? ` · ${currentTrack.artist}` : ''}</p>
            )}
          </div>
          <button type="button" className="queue-close" onClick={onClose} aria-label="Close queue">
            <X size={19} />
          </button>
        </header>

        <div className="queue-scroll">
          <section className="queue-section" aria-label="Your queue">
            <div className="queue-section-head">
              <h3>Your queue</h3>
              <span>{upcoming.length ? `${upcoming.length} waiting` : 'Empty'}</span>
            </div>
            {upcoming.length === 0 ? (
              <p className="queue-empty">
                {autoplay
                  ? 'No manual tracks queued. Autoplay keeps this room sounding alive.'
                  : 'Nothing queued. Pick a track or turn Autoplay on.'}
              </p>
            ) : (
              <ol className="queue-list">
                {upcoming.map((track) => (
                  <li key={trackIdentity(track)} className="queue-row">
                    <QueueArt track={track} />
                    <button type="button" className="queue-track" onClick={() => onPlay(track, false)}>
                      <strong>{track.title}</strong>
                      <small>{track.artist || 'Unknown artist'}</small>
                    </button>
                    <span className="queue-origin">{manualIds.has(trackIdentity(track)) ? 'Manual' : 'Context'}</span>
                    {manualIds.has(trackIdentity(track)) && (
                      <button type="button" className="queue-icon" onClick={() => onRemoveUpNext(track)}
                        aria-label={`Remove ${track.title} from your queue`} title="Remove from queue">
                        <Trash2 size={15} />
                      </button>
                    )}
                    <button type="button" className="queue-icon queue-play" onClick={() => onPlay(track, false)}
                      aria-label={`Play ${track.title}`} title="Play now">
                      <Play size={15} fill="currentColor" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="queue-section queue-autoplay" aria-label="Autoplay queue">
            <div className="queue-section-head">
              <h3><Sparkles size={15} /> Autoplay</h3>
              <label className="queue-switch">
                <input type="checkbox" checked={autoplay} onChange={onToggleAutoplay} />
                <span>{autoplay ? 'On' : 'Off'}</span>
              </label>
            </div>
            <p className="queue-help">
              Built from your last few songs. Remove, reorder or jump in at any point.
            </p>
            {!autoplay ? (
              <p className="queue-empty">Autoplay is off. Playback stops after the queue runs out.</p>
            ) : autoplayTracks.length === 0 ? (
              <p className="queue-empty" role="status">
                {loading ? 'Finding songs that fit this one…' : 'No autoplay songs yet. They will appear while this track plays.'}
              </p>
            ) : (
              <ol className="queue-list">
                {autoplayTracks.map((track, index) => (
                  <li key={trackIdentity(track)} className="queue-row">
                    <span className="queue-index" aria-hidden="true">{index + 1}</span>
                    <QueueArt track={track} />
                    <button type="button" className="queue-track" onClick={() => onPlay(track, true)}>
                      <strong>{track.title}</strong>
                      <small>{track.artist || 'Unknown artist'}</small>
                    </button>
                    <div className="queue-reorder">
                      <button type="button" className="queue-icon" disabled={index === 0}
                        onClick={() => onMoveAutoplay(track, -1)}
                        aria-label={`Move ${track.title} earlier`} title="Move earlier">
                        <ArrowUp size={14} />
                      </button>
                      <button type="button" className="queue-icon" disabled={index === autoplayTracks.length - 1}
                        onClick={() => onMoveAutoplay(track, 1)}
                        aria-label={`Move ${track.title} later`} title="Move later">
                        <ArrowDown size={14} />
                      </button>
                    </div>
                    <button type="button" className="queue-icon" onClick={() => onRemoveAutoplay(track)}
                      aria-label={`Remove ${track.title} from autoplay`} title="Remove from autoplay">
                      <Trash2 size={15} />
                    </button>
                    <button type="button" className="queue-icon queue-play" onClick={() => onPlay(track, true)}
                      aria-label={`Play ${track.title} now`} title="Play now">
                      <Play size={15} fill="currentColor" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
