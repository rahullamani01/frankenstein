import React from 'react';
import { Play, Heart } from 'lucide-react';
import { Track } from '../../data/musicData';

interface SourceScreenProps {
  sourceName: 'Local' | 'Apple Music' | 'Spotify';
  tracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onToggleFavorite: (trackId: string) => void;
}

export const SourceScreen: React.FC<SourceScreenProps> = ({
  sourceName,
  tracks,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onToggleFavorite,
}) => {
  const sourceTracks = tracks.filter((t) => t.source === sourceName);

  return (
    <div id="screen-source" className="max-w-4xl mx-auto px-10 py-9 space-y-6">
      <div className="border-b border-[#E2E6DD] pb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#6E9662]" />
          <h1 className="text-[24px] font-semibold text-[#24302A] tracking-tight">
            {sourceName}
          </h1>
        </div>
        <p className="text-[13px] text-[#78837A] mt-1">
          {sourceTracks.length} {sourceTracks.length === 1 ? 'track' : 'tracks'} indexed
        </p>
      </div>

      <div className="space-y-1">
        <div className="px-3 py-1.5 flex items-center text-[11px] font-medium text-[#78837A] uppercase tracking-wider border-b border-[#E2E6DD]/70">
          <span className="w-8">#</span>
          <span className="flex-1">Title</span>
          <span className="w-40">Artist</span>
          <span className="w-44">Album</span>
          <span className="w-16 text-right">Time</span>
          <span className="w-10 text-right"></span>
        </div>

        {sourceTracks.map((track, idx) => {
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
              <div className="w-8 flex items-center">
                <span className="group-hover:hidden text-[12px] text-[#78837A] font-mono tabular-nums">
                  {idx + 1}
                </span>
                <button
                  className="hidden group-hover:flex w-5 h-5 items-center justify-center text-[#24302A]"
                  title="Play"
                >
                  <Play size={12} strokeWidth={2} />
                </button>
              </div>

              <div className="flex-1 min-w-0 flex items-center gap-3 pr-4">
                <img
                  src={track.coverUrl}
                  alt={track.album}
                  className="w-8 h-8 rounded-[6px] object-cover flex-shrink-0 border border-black/5"
                />
                <span
                  className={`truncate font-medium ${
                    isCurrent && isPlaying ? 'text-[#6E9662]' : 'text-[#24302A]'
                  }`}
                >
                  {track.title}
                </span>
              </div>

              <div className="w-40 text-[#78837A] truncate pr-4 text-[12px]">
                {track.artist}
              </div>

              <div className="w-44 text-[#78837A] truncate pr-4 text-[12px]">
                {track.album}
              </div>

              <div className="w-16 text-right text-[12px] text-[#78837A] font-mono tabular-nums">
                {track.duration}
              </div>

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
