import React from 'react';
import { ArrowLeft, Play, Pause, Heart } from 'lucide-react';
import { Album, Track } from '../../data/musicData';

interface AlbumViewScreenProps {
  album: Album;
  albumTracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
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
  onBack,
  onPlayTrack,
  onPlayAlbum,
  onToggleFavorite,
}) => {
  const isAlbumPlaying = isPlaying && albumTracks.some((t) => t.id === currentTrackId);

  return (
    <div id="screen-album-view" className="max-w-4xl mx-auto px-10 py-8 space-y-8">
      {/* Navigation Back */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[13px] text-[#78837A] hover:text-[#24302A] transition-colors group"
        >
          <ArrowLeft size={15} strokeWidth={1.5} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Back</span>
        </button>
      </div>

      {/* Album Header: Large art left, title (serif) + artist + year right */}
      <div className="flex items-end gap-7">
        <div className="w-[180px] h-[180px] rounded-[10px] overflow-hidden bg-[#EEF1EA] border border-[#E2E6DD] flex-shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <img
            src={album.coverUrl}
            alt={album.title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="space-y-2 flex-1 min-w-0 pb-1">
          {/* Strict typography: Newsreader serif ONLY for album title on the album page */}
          <h1 className="font-serif-custom text-[32px] text-[#24302A] leading-tight tracking-normal font-normal">
            {album.title}
          </h1>

          <div className="flex items-center gap-2 text-[14px] text-[#78837A]">
            <span className="font-medium text-[#24302A]">{album.artist}</span>
            <span>&bull;</span>
            <span>{album.year}</span>
            <span>&bull;</span>
            <span>{album.source}</span>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={onPlayAlbum}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#6E9662] text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
            >
              {isAlbumPlaying ? (
                <>
                  <Pause size={14} strokeWidth={2} />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play size={14} strokeWidth={2} className="ml-0.5" />
                  <span>Play</span>
                </>
              )}
            </button>
            <span className="text-[12px] text-[#78837A]">
              {albumTracks.length} tracks
            </span>
          </div>
        </div>
      </div>

      {/* Plain numbered track list below */}
      <div className="border-t border-[#E2E6DD] pt-4 space-y-1">
        <div className="px-3 py-1.5 flex items-center text-[11px] font-medium text-[#78837A] uppercase tracking-wider">
          <span className="w-10">#</span>
          <span className="flex-1">Title</span>
          <span className="w-20 text-right">Time</span>
          <span className="w-24 text-right">Source</span>
          <span className="w-10 text-right"></span>
        </div>

        {albumTracks.map((track) => {
          const isCurrent = currentTrackId === track.id;
          return (
            <div
              key={track.id}
              onClick={() => onPlayTrack(track)}
              className={`group px-3 py-2 rounded-[8px] flex items-center text-[13px] cursor-pointer transition-colors ${
                isCurrent
                  ? 'bg-[#E3E9DC] text-[#24302A]'
                  : 'hover:bg-[#E8ECE1] text-[#24302A]'
              }`}
            >
              {/* Number or Play icon */}
              <div className="w-10 flex items-center">
                <span className="group-hover:hidden text-[12px] text-[#78837A] font-mono tabular-nums">
                  {track.trackNumber}
                </span>
                <button
                  className="hidden group-hover:flex w-5 h-5 items-center justify-center text-[#24302A]"
                  title="Play track"
                >
                  <Play size={12} strokeWidth={2} />
                </button>
              </div>

              {/* Title */}
              <div className="flex-1 min-w-0 pr-4">
                <span
                  className={`truncate font-medium ${
                    isCurrent && isPlaying ? 'text-[#6E9662]' : 'text-[#24302A]'
                  }`}
                >
                  {track.title}
                </span>
              </div>

              {/* Duration */}
              <div className="w-20 text-right text-[12px] text-[#78837A] font-mono tabular-nums">
                {track.duration}
              </div>

              {/* Source (plain text label) */}
              <div className="w-24 text-right text-[12px] text-[#78837A]">
                {track.source}
              </div>

              {/* Favorite */}
              <div className="w-10 flex justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(track.id);
                  }}
                  className="p-1 text-[#78837A] hover:text-[#24302A] transition-colors"
                  title={track.isFavorite ? 'Remove favorite' : 'Add favorite'}
                >
                  <Heart
                    size={14}
                    strokeWidth={1.5}
                    className={track.isFavorite ? 'text-[#6E9662]' : 'text-[#78837A]/50 group-hover:text-[#78837A]'}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
