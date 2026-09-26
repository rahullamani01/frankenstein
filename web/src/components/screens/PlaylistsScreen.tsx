import React from 'react';
import { Play } from 'lucide-react';
import { Track } from '../../data/musicData';

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
  const playlists = [
    {
      name: 'Quiet Focus',
      description: 'Minimal piano and tape acoustics for deep contemplation',
      trackIds: ['t-1', 't-2', 't-3', 't-12', 't-13'],
    },
    {
      name: 'Ambient Spaces',
      description: 'Generative tape loops and church resonances',
      trackIds: ['t-5', 't-6', 't-7', 't-9', 't-10'],
    },
    {
      name: 'Night Acoustic',
      description: 'Late-night solo uprights and jazz trios',
      trackIds: ['t-15', 't-16', 't-14', 't-4'],
    },
  ];

  return (
    <div id="screen-playlists" className="max-w-4xl mx-auto px-10 py-9 space-y-8">
      <div className="border-b border-[#E2E6DD] pb-4">
        <h1 className="text-[24px] font-semibold text-[#24302A] tracking-tight">
          Playlists
        </h1>
        <p className="text-[13px] text-[#78837A] mt-1">
          Hand-arranged offline collections
        </p>
      </div>

      <div className="space-y-8">
        {playlists.map((pl) => {
          const plTracks = tracks.filter((t) => pl.trackIds.includes(t.id));
          return (
            <div key={pl.name} className="space-y-3">
              <div>
                <h2 className="text-[16px] font-semibold text-[#24302A]">
                  {pl.name}
                </h2>
                <p className="text-[12px] text-[#78837A]">{pl.description}</p>
              </div>

              <div className="space-y-1">
                {plTracks.map((track, idx) => {
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

                      <div className="w-16 text-right text-[12px] text-[#78837A] font-mono tabular-nums">
                        {track.duration}
                      </div>

                      <div className="w-24 text-right text-[12px] text-[#78837A]">
                        {track.source}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
