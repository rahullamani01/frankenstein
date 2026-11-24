import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Track, Album, Artist } from '../../data/musicData';
import { PixelArt } from '../pixel/PixelArt';
import {
  ScreenHeader,
  PixelFrame,
  TrackRow,
  TrackTableHead,
  EmptyGallery,
} from '../pixel/ui';
import { frameToneFor } from '../../theme/pixel';

interface LibraryScreenProps {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onSelectAlbum: (albumId: string) => void;
  onToggleFavorite: (trackId: string) => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({
  tracks,
  albums,
  artists,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onSelectAlbum,
  onToggleFavorite,
}) => {
  const [activeTab, setActiveTab] = useState<'songs' | 'albums' | 'artists'>('songs');

  return (
    <div id="screen-library" className="screen-wrap">
      <ScreenHeader
        eyebrow="The archive"
        title="Library"
        subtitle={`${tracks.length} songs · ${albums.length} albums · ${artists.length} artists, all filed by hand`}
        actions={
          <div className="px-tabs" role="tablist" aria-label="Library views">
            {(['songs', 'albums', 'artists'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-tab ${activeTab === tab ? 'is-active' : ''}`}
                role="tab"
                aria-selected={activeTab === tab}
              >
                {tab}
              </button>
            ))}
          </div>
        }
      />

      {activeTab === 'songs' && (
        <>
          {tracks.length === 0 ? (
            <EmptyGallery
              title="No songs filed yet"
              body="Import a folder from the backend and every track will be catalogued here, ready to hang."
              hint="POST /api/library/scan with your music folder"
            />
          ) : (
            <div className="px-table">
              <TrackTableHead />
              {tracks.map((track, index) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={index}
                  currentTrackId={currentTrackId}
                  isPlaying={isPlaying}
                  onPlayTrack={onPlayTrack}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'albums' && (
        <>
          {albums.length === 0 ? (
            <EmptyGallery
              title="No albums framed yet"
              body="Albums appear here as soon as the library scanner finds embedded artwork and tags."
            />
          ) : (
            <div className="px-album-grid">
              {albums.map((album) => (
                <button
                  key={album.id}
                  type="button"
                  className="gallery-piece"
                  onClick={() => onSelectAlbum(album.id)}
                  title={`Open ${album.title}`}
                >
                  <PixelFrame
                    tone={frameToneFor(album.id)}
                    lift
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
                    <div className="piece-art">
                      <PixelArt
                        original={album.source === 'Spotify'}
                        src={album.coverUrl}
                        seed={album.id}
                        alt={`${album.title} by ${album.artist}`}
                        grid={52}
                      />
                      {album.source !== 'Spotify' && <span className="piece-veil" aria-hidden="true">
                        <span className="piece-play">
                          <ArrowUpRight size={15} strokeWidth={2.2} />
                        </span>
                      </span>}
                    </div>
                  </PixelFrame>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'artists' && (
        <>
          {artists.length === 0 ? (
            <EmptyGallery
              title="No artists in the ledger"
              body="Once tracks are indexed, the artists who made them will be listed here."
            />
          ) : (
            <div className="px-table">
              <div className="px-table-head">
                <span className="px-track-index">#</span>
                <span className="px-track-title">Artist name</span>
                <span className="w-24 text-right">Albums</span>
                <span className="w-24 text-right">Tracks</span>
                <span className="px-track-end" />
              </div>
              {artists.map((artist, index) => (
                <div key={artist.id} className="px-track-row">
                  <span className="px-track-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="px-track-title">
                    <span className="artist-badge" aria-hidden="true">
                      {artist.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="px-track-name">{artist.name}</span>
                  </span>
                  <span className="w-24 text-right font-[family-name:var(--font-pixel)] text-[10px] text-[color:var(--muted)]">
                    {artist.albumCount}
                  </span>
                  <span className="w-24 text-right font-[family-name:var(--font-pixel)] text-[10px] text-[color:var(--muted)]">
                    {artist.trackCount}
                  </span>
                  <span className="px-track-end" />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
