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
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onSelectAlbum: (albumId: string) => void;
  onToggleFavorite: (trackId: string) => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({
  tracks,
  albums: allAlbums,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onSelectAlbum,
  onToggleFavorite,
}) => {
  const [activeTab, setActiveTab] = useState<'songs' | 'albums' | 'artists'>('songs');
  const albumIds = new Set(tracks.map((track) => track.albumId));
  const albums = allAlbums.filter((album) => albumIds.has(album.id)).map((album) => ({
    ...album,
    trackCount: tracks.filter((track) => track.albumId === album.id).length,
  }));
  const artists: Artist[] = [...new Set(tracks.map((track) => track.artist))].map((name) => ({
    id: name,
    name,
    trackCount: tracks.filter((track) => track.artist === name).length,
    albumCount: new Set(tracks.filter((track) => track.artist === name).map((track) => track.albumId)).size,
  }));

  return (
    <div id="screen-library" className="screen-wrap">
      <ScreenHeader
        eyebrow="Recently played"
        title="Library"
        subtitle={`${tracks.length} recent songs · ${albums.length} albums · ${artists.length} artists`}
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
               title="No recent songs yet"
               body="Play something from Spotify or Apple Music. Your most recent songs will appear here."
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
               body="Albums from your recently played songs will appear here."
            />
          ) : (
            <div className="px-album-grid">
              {albums.map((album) => (
                <button
                  key={album.id}
                  type="button"
                  className="gallery-piece"
                  data-album-id={album.id}
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
              body="Artists from your recently played songs will appear here."
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
