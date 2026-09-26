import React, { useState } from 'react';
import { Play, Heart } from 'lucide-react';
import { Track, Album, Artist } from '../../data/musicData';

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
    <div id="screen-library" className="max-w-5xl mx-auto px-10 py-9 space-y-6">
      {/* Header and Tabs */}
      <div className="flex items-center justify-between border-b border-[#E2E6DD] pb-4">
        <h1 className="text-[24px] font-semibold text-[#24302A] tracking-tight">
          Library
        </h1>

        {/* Minimal Tabs */}
        <div className="flex items-center space-x-1 bg-[#EEF1EA] p-1 rounded-[8px] border border-[#E2E6DD]/60">
          {(['songs', 'albums', 'artists'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-[6px] text-[13px] capitalize font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-[#F7F8F3] text-[#24302A] shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                  : 'text-[#78837A] hover:text-[#24302A]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content: Songs */}
      {activeTab === 'songs' && (
        <div className="space-y-1">
          {/* Table Header */}
          <div className="px-3 py-1.5 flex items-center text-[11px] font-medium text-[#78837A] uppercase tracking-wider border-b border-[#E2E6DD]/70">
            <span className="w-8">#</span>
            <span className="flex-1">Title</span>
            <span className="w-40">Artist</span>
            <span className="w-44">Album</span>
            <span className="w-16 text-right">Time</span>
            <span className="w-24 text-right">Source</span>
            <span className="w-10 text-right"></span>
          </div>

          {/* Track Rows */}
          {tracks.map((track, idx) => {
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
                {/* Index / Play button */}
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

                {/* Art + Title */}
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

                {/* Artist */}
                <div className="w-40 text-[#78837A] truncate pr-4 text-[12px]">
                  {track.artist}
                </div>

                {/* Album */}
                <div className="w-44 text-[#78837A] truncate pr-4 text-[12px]">
                  {track.album}
                </div>

                {/* Duration */}
                <div className="w-16 text-right text-[12px] text-[#78837A] font-mono tabular-nums">
                  {track.duration}
                </div>

                {/* Source (Plain text label, never a colored badge) */}
                <div className="w-24 text-right text-[12px] text-[#78837A]">
                  {track.source}
                </div>

                {/* Favorite Button */}
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
      )}

      {/* Tab Content: Albums */}
      {activeTab === 'albums' && (
        <div className="grid grid-cols-4 gap-6 pt-2">
          {albums.map((album) => (
            <button
              key={album.id}
              onClick={() => onSelectAlbum(album.id)}
              className="group text-left focus:outline-none"
            >
              <div className="aspect-square w-full rounded-[10px] overflow-hidden bg-[#EEF1EA] border border-[#E2E6DD] transition-all group-hover:border-[#CBD2C6]">
                <img
                  src={album.coverUrl}
                  alt={album.title}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                />
              </div>
              <div className="mt-2.5 space-y-0.5">
                <p className="text-[13px] font-medium text-[#24302A] truncate leading-tight group-hover:underline">
                  {album.title}
                </p>
                <div className="flex items-center justify-between text-[12px] text-[#78837A]">
                  <span className="truncate">{album.artist}</span>
                  <span className="tabular-nums font-mono">{album.year}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Tab Content: Artists */}
      {activeTab === 'artists' && (
        <div className="space-y-1 pt-2">
          <div className="px-3 py-1.5 flex items-center text-[11px] font-medium text-[#78837A] uppercase tracking-wider border-b border-[#E2E6DD]/70">
            <span className="flex-1">Artist Name</span>
            <span className="w-24 text-right">Albums</span>
            <span className="w-24 text-right">Tracks</span>
          </div>

          {artists.map((artist) => (
            <div
              key={artist.id}
              className="px-3 py-2.5 rounded-[8px] flex items-center text-[13px] text-[#24302A] hover:bg-[#E8ECE1] transition-colors"
            >
              <span className="flex-1 font-medium">{artist.name}</span>
              <span className="w-24 text-right text-[12px] text-[#78837A] font-mono tabular-nums">
                {artist.albumCount}
              </span>
              <span className="w-24 text-right text-[12px] text-[#78837A] font-mono tabular-nums">
                {artist.trackCount}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
