import React from 'react';
import { Album } from '../../data/musicData';

interface HomeScreenProps {
  onSelectAlbum: (albumId: string) => void;
  recentlyPlayedAlbums: Album[];
  recentlyAddedAlbums: Album[];
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectAlbum,
  recentlyPlayedAlbums,
  recentlyAddedAlbums,
}) => {
  // Determine calm greeting matching Things 3 / Bear desktop elegance
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div id="screen-home" className="max-w-5xl mx-auto px-10 py-9 space-y-9">
      {/* Greeting */}
      <div>
        <h1 className="text-[26px] font-semibold text-[#24302A] tracking-tight">
          {getGreeting()}
        </h1>
      </div>

      {/* Section 1: Recently Played */}
      <section className="space-y-3.5">
        <h2 className="text-[13px] font-medium text-[#78837A] tracking-wide uppercase">
          Recently Played
        </h2>
        <div className="grid grid-cols-6 gap-4">
          {recentlyPlayedAlbums.slice(0, 6).map((album) => (
            <button
              key={`recent-${album.id}`}
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
              <div className="mt-2 space-y-0.5">
                <p className="text-[13px] font-medium text-[#24302A] truncate leading-tight group-hover:underline">
                  {album.title}
                </p>
                <p className="text-[12px] text-[#78837A] truncate leading-tight">
                  {album.artist}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Section 2: Recently Added */}
      <section className="space-y-3.5 pt-2">
        <h2 className="text-[13px] font-medium text-[#78837A] tracking-wide uppercase">
          Recently Added
        </h2>
        <div className="grid grid-cols-6 gap-4">
          {recentlyAddedAlbums.slice(0, 6).map((album) => (
            <button
              key={`added-${album.id}`}
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
              <div className="mt-2 space-y-0.5">
                <p className="text-[13px] font-medium text-[#24302A] truncate leading-tight group-hover:underline">
                  {album.title}
                </p>
                <p className="text-[12px] text-[#78837A] truncate leading-tight">
                  {album.artist}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
