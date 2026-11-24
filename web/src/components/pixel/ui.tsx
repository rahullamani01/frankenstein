import React from 'react';
import { Heart, Play } from 'lucide-react';
import { Track } from '../../data/musicData';
import { FrameTone } from '../../theme/pixel';

/* ------------------------------------------------------------------ */
/*  Small shared building blocks for the pixel gallery                */
/* ------------------------------------------------------------------ */

export const PixelEqualizer: React.FC<{ playing?: boolean; className?: string }> = ({
  playing = false,
  className = '',
}) => (
  <span className={`px-eq ${playing ? 'is-playing' : ''} ${className}`} aria-hidden="true">
    <span style={{ animationDelay: '0ms' }} />
    <span style={{ animationDelay: '160ms' }} />
    <span style={{ animationDelay: '80ms' }} />
    <span style={{ animationDelay: '240ms' }} />
  </span>
);

export const PixelChip: React.FC<{
  children: React.ReactNode;
  tone?: 'paper' | 'moss' | 'peach' | 'lilac' | 'sky';
  className?: string;
}> = ({ children, tone = 'paper', className = '' }) => (
  <span className={`px-chip px-chip-${tone} ${className}`}>{children}</span>
);

export const PixelFrame: React.FC<{
  children: React.ReactNode;
  tone?: FrameTone;
  plaque?: React.ReactNode;
  className?: string;
  matClassName?: string;
  lift?: boolean;
}> = ({ children, tone = 'oak', plaque, className = '', matClassName = '', lift = false }) => (
  <figure className={`pixel-frame tone-${tone} ${lift ? 'has-lift' : ''} ${className}`}>
    <div className={`pixel-frame-mat ${matClassName}`}>{children}</div>
    {plaque ? <figcaption className="pixel-plaque">{plaque}</figcaption> : null}
  </figure>
);

export const ScreenHeader: React.FC<{
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ eyebrow, title, subtitle, actions }) => (
  <header className="screen-head">
    <div className="min-w-0">
      <span className="px-label">{eyebrow}</span>
      <h1 className="px-display screen-title">{title}</h1>
      {subtitle ? <p className="screen-sub">{subtitle}</p> : null}
    </div>
    {actions ? <div className="screen-head-actions">{actions}</div> : null}
  </header>
);

export const PixelDivider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`px-divider ${className}`} aria-hidden="true" />
);

export const SourceTag: React.FC<{ source: Track['source']; className?: string }> = ({ source, className = '' }) => {
  const tone = source === 'Spotify' ? 'sky' : source === 'Apple Music' ? 'peach' : 'moss';
  return <span className={`px-source px-source-${tone} ${className}`}>{source}</span>;
};

export interface TrackRowProps {
  track: Track;
  index: number;
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onToggleFavorite?: (trackId: string) => void;
  showArtist?: boolean;
  showAlbum?: boolean;
  showSource?: boolean;
  showFavorite?: boolean;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  index,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onToggleFavorite,
  showArtist = true,
  showAlbum = true,
  showSource = true,
  showFavorite = true,
}) => {
  const isCurrent = currentTrackId === track.id;
  return (
    <div
      onClick={() => onPlayTrack(track)}
      className={`px-track-row group ${isCurrent ? 'is-current' : ''}`}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onPlayTrack(track);
        }
      }}
    >
      <div className="px-track-index">
        {isCurrent && isPlaying ? (
          <PixelEqualizer playing className="px-track-eq" />
        ) : (
          <>
            <span className="px-track-num">{String(index + 1).padStart(2, '0')}</span>
            <Play size={11} strokeWidth={2.4} className="px-track-play" />
          </>
        )}
      </div>

      <div className="px-track-title">
        <span className="px-track-thumb">
          {track.coverUrl ? (
            <img src={track.coverUrl} alt="" loading="lazy" />
          ) : (
            <span aria-hidden="true">♪</span>
          )}
        </span>
        <span className="px-track-name-wrap">
          <span className={`px-track-name ${isCurrent ? 'is-live' : ''}`} title={track.title}>{track.title}</span>
          <span className="px-track-artist-mobile">{track.artist}</span>
        </span>
        {track.externalUrl && (
          <a className="spotify-track-link" href={track.externalUrl} target="_blank" rel="noreferrer"
            onClick={(event) => event.stopPropagation()} aria-label={`Open ${track.title} on Spotify`}>↗</a>
        )}
      </div>
      {showArtist ? <span className="px-track-artist px-col-artist">{track.artist}</span> : null}
      {showAlbum ? <span className="px-track-album px-col-album">{track.album}</span> : null}
      <span className="px-track-time px-col-time">{track.duration}</span>
      {showSource ? <SourceTag source={track.source} /> : null}
      {showFavorite && onToggleFavorite ? (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(track.id);
          }}
          className={`px-icon-btn ${track.isFavorite ? 'is-fav' : ''}`}
          title={track.isFavorite ? 'Remove favorite' : 'Add favorite'}
          aria-label={track.isFavorite ? 'Remove favorite' : 'Add favorite'}
        >
          <Heart size={13} strokeWidth={1.8} fill={track.isFavorite ? 'currentColor' : 'none'} />
        </button>
      ) : (
        <span className="px-track-end" />
      )}
    </div>
  );
};

export const TrackTableHead: React.FC<{
  showArtist?: boolean;
  showAlbum?: boolean;
  showSource?: boolean;
  showFavorite?: boolean;
  indexLabel?: string;
}> = ({ showArtist = true, showAlbum = true, showSource = true, showFavorite = true, indexLabel = '#' }) => (
  <div className="px-table-head">
    <span className="px-track-index">{indexLabel}</span>
    <span className="px-track-title">Title</span>
    {showArtist ? <span className="px-col-artist">Artist</span> : null}
    {showAlbum ? <span className="px-col-album">Album</span> : null}
    <span className="px-col-time px-right">Time</span>
    {showSource ? <span className="px-source-head">Source</span> : null}
    {showFavorite ? <span className="px-track-end" /> : null}
  </div>
);

export const EmptyGallery: React.FC<{
  title: string;
  body: string;
  hint?: string;
}> = ({ title, body, hint }) => (
  <div className="px-empty">
    <div className="px-empty-frame" aria-hidden="true">
      <span className="px-empty-sun" />
      <span className="px-empty-hill" />
      <span className="px-empty-hill is-back" />
      <span className="px-empty-ground" />
    </div>
    <div>
      <p className="px-display px-empty-title">{title}</p>
      <p className="px-empty-body">{body}</p>
      {hint ? <p className="px-empty-hint">{hint}</p> : null}
    </div>
  </div>
);
