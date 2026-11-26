import React from 'react';
import { Track } from '../../data/musicData';
import { ScreenHeader, TrackRow, TrackTableHead, EmptyGallery, PixelChip } from '../pixel/ui';
import { SearchScreen } from './SearchScreen';

interface SourceScreenProps {
  sourceName: 'Local' | 'Apple Music' | 'Spotify';
  tracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onToggleFavorite: (trackId: string, track?: Track) => void;
}

const sourceCopy: Record<SourceScreenProps['sourceName'], { eyebrow: string; body: string; tone: 'moss' | 'peach' | 'sky' }> = {
  Local: {
    eyebrow: 'From the shelves',
    body: 'Your own files, streamed straight from the little server on this Mac. No account needed.',
    tone: 'moss',
  },
  'Apple Music': {
    eyebrow: 'Conducted by Music.app',
    body: 'Playback is handed to the desktop Music app while the gallery keeps the controls and the view.',
    tone: 'peach',
  },
  Spotify: {
    eyebrow: 'Conducted by Spotify',
    body: 'Playback is handed to the desktop Spotify app while the gallery keeps the controls and the view.',
    tone: 'sky',
  },
};

export const SourceScreen: React.FC<SourceScreenProps> = ({
  sourceName,
  tracks,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onToggleFavorite,
}) => {
  const sourceTracks = tracks.filter((track) => track.source === sourceName);
  const copy = sourceCopy[sourceName];
  if (sourceName === 'Spotify') {
    return <SearchScreen spotifyOnly currentTrackId={currentTrackId} isPlaying={isPlaying}
      onPlayTrack={onPlayTrack} favoriteTracks={tracks.filter((track) => track.isFavorite)}
      onToggleFavorite={(track) => onToggleFavorite(track.id, track)} />;
  }

  return (
    <div id="screen-source" className="screen-wrap">
      <ScreenHeader
        eyebrow={copy.eyebrow}
        title={sourceName}
        subtitle={`${sourceTracks.length} ${sourceTracks.length === 1 ? 'track is' : 'tracks are'} indexed from this source.`}
        actions={
          <PixelChip tone={copy.tone}>
            <span className={`pixel-source-dot is-${sourceName === 'Apple Music' ? 'apple' : 'local'}`} />
            {sourceName}
          </PixelChip>
        }
      />

      <p className="mb-5 max-w-[58ch] text-[12px] leading-relaxed" style={{ color: 'var(--muted)' }}>
        {copy.body}
      </p>

      {sourceTracks.length === 0 ? (
        <EmptyGallery
          title={`Nothing from ${sourceName} yet`}
          body={
            sourceName === 'Local'
              ? 'Scan a folder from the backend to bring your own files into the gallery.'
              : `Open ${sourceName} on this Mac and search for something; the desktop app will take over playback.`
          }
        />
      ) : (
        <div className="px-table">
          <TrackTableHead showSource={false} />
          {sourceTracks.map((track, index) => (
            <TrackRow
              key={track.id}
              track={track}
              index={index}
              currentTrackId={currentTrackId}
              isPlaying={isPlaying}
              onPlayTrack={onPlayTrack}
              onToggleFavorite={onToggleFavorite}
              showSource={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};
