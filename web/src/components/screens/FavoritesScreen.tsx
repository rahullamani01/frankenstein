import React from 'react';
import { Shuffle } from 'lucide-react';
import { Track } from '../../data/musicData';
import { ScreenHeader, TrackRow, TrackTableHead, EmptyGallery, PixelChip } from '../pixel/ui';

interface FavoritesScreenProps {
  favoriteTracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onShufflePlay: () => void;
  onToggleFavorite: (trackId: string) => void;
}

export const FavoritesScreen: React.FC<FavoritesScreenProps> = ({
  favoriteTracks,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onShufflePlay,
  onToggleFavorite,
}) => (
  <div id="screen-favorites" className="screen-wrap">
    <ScreenHeader
      eyebrow="The keepers"
      title="Favorites"
      subtitle="The pieces you keep coming back to."
      actions={
        <>
          <PixelChip tone="moss">
            {favoriteTracks.length} {favoriteTracks.length === 1 ? 'song' : 'songs'}
          </PixelChip>
          <button
            className="pixel-btn ghost small"
            onClick={onShufflePlay}
            disabled={favoriteTracks.length === 0}
            title="Shuffle these favourites"
          >
            <Shuffle size={13} strokeWidth={2} />
            <span>Shuffle</span>
          </button>
        </>
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
