import React from 'react';
import { Track } from '../../data/musicData';
import { ScreenHeader, TrackRow, TrackTableHead, EmptyGallery } from '../pixel/ui';

interface HistoryScreenProps {
  historyTracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onClearHistory: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  historyTracks,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onClearHistory,
}) => (
  <div id="screen-history" className="screen-wrap">
    <ScreenHeader
      eyebrow="The visitors' book"
      title="History"
      subtitle="Everything that has played in this session."
      actions={
        historyTracks.length > 0 ? (
          <button onClick={onClearHistory} className="pixel-btn ghost small">
            Clear the book
          </button>
        ) : null
      }
    />

    {historyTracks.length === 0 ? (
      <EmptyGallery
        title="Nothing played yet"
        body="The room is quiet. Play a framed piece and this page will remember it."
      />
    ) : (
      <div className="px-table">
        <TrackTableHead showFavorite={false} />
        {historyTracks.map((track, index) => (
          <TrackRow
            key={`${track.id}-${index}`}
            track={track}
            index={index}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            onPlayTrack={onPlayTrack}
            showFavorite={false}
          />
        ))}
      </div>
    )}
  </div>
);
