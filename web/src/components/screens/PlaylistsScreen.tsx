import React from 'react';
import { Track } from '../../data/musicData';
import { ScreenHeader, TrackRow, TrackTableHead, EmptyGallery, PixelChip } from '../pixel/ui';

interface PlaylistsScreenProps {
  tracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
}

export const PlaylistsScreen: React.FC<PlaylistsScreenProps> = ({
  tracks,
  currentTrackId,
  isPlaying,
  onPlayTrack,
}) => {
  const byLength = [...tracks].sort((a, b) => b.durationSec - a.durationSec);
  const playlists = [
    {
      name: 'Quiet Focus',
      description: 'Short pieces for a long afternoon of work.',
      tracks: tracks.slice(0, 5),
    },
    {
      name: 'Ambient Spaces',
      description: 'The longest rooms in the collection, for when time can stretch.',
      tracks: byLength.slice(0, 5),
    },
    {
      name: 'The Late Room',
      description: 'The most recently filed pieces, for the end of the day.',
      tracks: [...tracks].slice(-5).reverse(),
    },
  ].filter((playlist) => playlist.tracks.length > 0);

  return (
    <div id="screen-playlists" className="screen-wrap">
      <ScreenHeader
        eyebrow="Hand-arranged rooms"
        title="Playlists"
        subtitle="Small, quiet collections drawn from whatever is hanging in the gallery."
        actions={<PixelChip tone="lilac">{playlists.length} rooms</PixelChip>}
      />

      {playlists.length === 0 ? (
        <EmptyGallery
          title="No rooms arranged yet"
          body="Once a few songs are filed, they will be gathered into gentle little playlists here."
        />
      ) : (
        playlists.map((playlist, index) => (
          <section key={playlist.name} className="playlist-block">
            <div className="playlist-head mb-3">
              <span className="px-label">Room {String(index + 1).padStart(2, '0')}</span>
              <h2>{playlist.name}</h2>
              <p>{playlist.description}</p>
            </div>
            <div className="px-table">
              <TrackTableHead showAlbum={false} showFavorite={false} />
              {playlist.tracks.map((track, trackIndex) => (
                <TrackRow
                  key={`${playlist.name}-${track.id}`}
                  track={track}
                  index={trackIndex}
                  currentTrackId={currentTrackId}
                  isPlaying={isPlaying}
                  onPlayTrack={onPlayTrack}
                  showAlbum={false}
                  showFavorite={false}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
};
