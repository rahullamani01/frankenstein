import React, { useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause } from 'lucide-react';
import { Album, Track } from '../../data/musicData';
import { PixelArt } from '../pixel/PixelArt';
import { LivingScene } from '../pixel/LivingScene';
import { PixelFrame, PixelChip, SourceTag, TrackRow, TrackTableHead } from '../pixel/ui';
import { frameToneFor } from '../../theme/pixel';

interface AlbumViewScreenProps {
  album: Album;
  albumTracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  darkMode: boolean;
  onBack: () => void;
  onPlayTrack: (track: Track) => void;
  onPlayAlbum: () => void;
  onToggleFavorite: (trackId: string) => void;
}

export const AlbumViewScreen: React.FC<AlbumViewScreenProps> = ({
  album,
  albumTracks,
  currentTrackId,
  isPlaying,
  darkMode,
  onBack,
  onPlayTrack,
  onPlayAlbum,
  onToggleFavorite,
}) => {
  const isAlbumPlaying = isPlaying && albumTracks.some((track) => track.id === currentTrackId);
  const seed = album.id || album.title;
  const rootRef = useRef<HTMLDivElement>(null);

  // The banner drifts a little slower than the list, and the cover lifts a
  // hair as the page scrolls. Capped and rAF-throttled, never hijacking the
  // platform's own scrolling.
  useEffect(() => {
    const root = rootRef.current;
    const scroller = root?.closest('#app-main-content') as HTMLElement | null;
    if (!root || !scroller) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const scroll = Math.max(0, scroller.scrollTop);
      root.style.setProperty('--album-scroll', String(scroll));
      root.style.setProperty('--album-parallax', `${Math.min(6, scroll * 0.05).toFixed(2)}px`);
      root.style.setProperty('--album-lift', `${-Math.min(18, scroll * 0.06).toFixed(2)}px`);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [album.id]);

  return (
    <div id="screen-album-view" className="screen-wrap" ref={rootRef}>
      <div className="mb-4">
        <button onClick={onBack} className="pixel-btn ghost small">
          <ArrowLeft size={13} strokeWidth={2} />
          <span>Back to the room</span>
        </button>
      </div>

      <div className="album-banner">
        <LivingScene
          night={darkMode}
          label="A quiet pixel view behind the album"
        />
        <div className="album-banner-veil" aria-hidden="true" />
        <div className="album-banner-copy">
          <PixelChip tone="paper">Now viewing</PixelChip>
          <span className="px-label">Album · {album.year || 'undated'}</span>
        </div>
      </div>

      <div className="album-head">
        <div className="album-art">
          <PixelFrame
            tone={frameToneFor(seed)}
            plaque={
              <span className="piece-plaque">
                <span className="piece-plaque-copy">
                  <strong>{album.title}</strong>
                  <span>{album.artist}</span>
                </span>
                <span className="piece-year">{album.year || '—'}</span>
              </span>
            }
          >
            <div className="piece-art" id="album-art-slot">
              <PixelArt
                original={album.source === 'Spotify'}
                src={album.coverUrl}
                seed={seed}
                alt={`${album.title} by ${album.artist}`}
                grid={56}
              />
            </div>
          </PixelFrame>
        </div>

        <div className="album-copy">
          <span className="px-label">Album on view</span>
          <h1 className="album-title">{album.title}</h1>
          <div className="album-meta">
            <b>{album.artist}</b>
            <span>·</span>
            <span>{album.year || '—'}</span>
            <span>·</span>
            <SourceTag source={album.source} />
          </div>
          <div className="album-actions">
            <button onClick={onPlayAlbum} className="pixel-btn">
              {isAlbumPlaying ? (
                <>
                  <Pause size={12} strokeWidth={2.2} />
                  Playing
                </>
              ) : (
                <>
                  <Play size={12} strokeWidth={2.4} />
                  Play album
                </>
              )}
            </button>
            <PixelChip tone="moss">
              {albumTracks.length} {albumTracks.length === 1 ? 'track' : 'tracks'}
            </PixelChip>
            <PixelChip tone="lilac">listening room</PixelChip>
          </div>
        </div>
      </div>

      <div className="album-tracks">
        <div className="gallery-section-head">
          <div>
            <span className="px-label">Catalogue</span>
            <h2>Inside the frame</h2>
          </div>
          <span className="px-count">{albumTracks.length} {albumTracks.length === 1 ? 'work' : 'works'}</span>
        </div>

        {albumTracks.length === 0 ? (
          <p className="text-[12px]" style={{ color: 'var(--muted)' }}>
            This album has no indexed tracks yet.
          </p>
        ) : (
          <div className="px-table">
            <TrackTableHead showAlbum={false} />
            {albumTracks.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                index={index}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                onPlayTrack={onPlayTrack}
                onToggleFavorite={onToggleFavorite}
                showAlbum={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
