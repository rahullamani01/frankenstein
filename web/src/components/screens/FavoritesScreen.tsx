import React from 'react';
import { Track } from '../../data/musicData';
import { ScreenHeader, TrackRow, TrackTableHead, EmptyGallery, PixelChip } from '../pixel/ui';

interface FavoritesScreenProps {
  favoriteTracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onToggleFavorite: (trackId: string) => void;
}

export const FavoritesScreen: React.FC<FavoritesScreenProps> = ({
  favoriteTracks,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onToggleFavorite,
}) => (
  <div id="screen-favorites" className="screen-wrap">
    <ScreenHeader
      eyebrow="The keepers"
      title="Favorites"
      subtitle="The pieces you keep coming back to."
      actions={
        <PixelChip tone="moss">
          {favoriteTracks.length} {favoriteTracks.length === 1 ? 'song' : 'songs'}
        </PixelChip>
      }
    />

    {favoriteTracks.length === 0 ? (
      <EmptyGallery
        title="No favourites pinned yet"
        body="Tap the little heart beside any song and it will be kept safe in this room."
      />
    ) : (
      <div className="px-table">
        <TrackTableHead />
        {favoriteTracks.map((track, index) => (
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
  </div>
);
