import React from 'react';
import {
  Compass,
  Search,
  FolderOpen,
  Heart,
  Clock,
  ListMusic,
} from 'lucide-react';

export type ScreenId =
  | 'home'
  | 'search'
  | 'library'
  | 'favorites'
  | 'history'
  | 'playlists'
  | 'album'
  | 'now-playing'
  | 'source-local'
  | 'source-apple'
  | 'source-spotify';

interface SidebarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  selectedSource?: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
}) => {
  const mainNavItems = [
    { id: 'home' as ScreenId, label: 'Home', icon: Compass },
    { id: 'search' as ScreenId, label: 'Search', icon: Search },
    { id: 'library' as ScreenId, label: 'Library', icon: FolderOpen },
    { id: 'favorites' as ScreenId, label: 'Favorites', icon: Heart },
    { id: 'history' as ScreenId, label: 'History', icon: Clock },
    { id: 'playlists' as ScreenId, label: 'Playlists', icon: ListMusic },
  ];

  const sourceItems = [
    { id: 'source-local' as ScreenId, label: 'Local' },
    { id: 'source-apple' as ScreenId, label: 'Apple Music' },
    { id: 'source-spotify' as ScreenId, label: 'Spotify' },
  ];

  return (
    <aside
      id="app-sidebar"
      className="w-[240px] flex-shrink-0 bg-[#EEF1EA] h-full flex flex-col justify-between border-r border-[#E2E6DD] select-none text-[13px]"
    >
      <div className="flex flex-col">
        {/* macOS Window Controls & Header */}
        <div className="pt-4 pb-3 px-5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-[#EC6A5E] border border-black/5 inline-block opacity-90" />
            <span className="w-3 h-3 rounded-full bg-[#F4BF4F] border border-black/5 inline-block opacity-90" />
            <span className="w-3 h-3 rounded-full bg-[#61C554] border border-black/5 inline-block opacity-90" />
          </div>
          <span className="text-[12px] font-medium tracking-tight text-[#78837A] font-sans">
            Frankenstein
          </span>
        </div>

        {/* Primary Navigation */}
        <nav className="px-3 pt-2 space-y-0.5" aria-label="Main Navigation">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isSelected = currentScreen === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left transition-colors font-normal ${
                  isSelected
                    ? 'bg-[#E3E9DC] text-[#24302A] font-medium'
                    : 'text-[#24302A] hover:bg-[#E8ECE1]'
                }`}
              >
                <Icon
                  size={15}
                  strokeWidth={1.5}
                  className={isSelected ? 'text-[#6E9662]' : 'text-[#78837A]'}
                />
                <span className="tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Subtle Divider */}
        <div className="mx-4 my-3 border-t border-[#E2E6DD]" />

        {/* Sources Section: Plain text rows with small dot, no logo icons */}
        <div className="px-3 space-y-0.5">
          <div className="px-3 py-1 text-[11px] font-medium text-[#78837A] tracking-wider uppercase">
            Sources
          </div>
          {sourceItems.map((source) => {
            const isSelected = currentScreen === source.id;
            return (
              <button
                key={source.id}
                id={`nav-${source.id}`}
                onClick={() => onNavigate(source.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left transition-colors font-normal ${
                  isSelected
                    ? 'bg-[#E3E9DC] text-[#24302A] font-medium'
                    : 'text-[#24302A] hover:bg-[#E8ECE1]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSelected ? 'bg-[#6E9662]' : 'bg-[#A3ADA5]'
                  }`}
                />
                <span className="tracking-tight">{source.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Offline Desktop Status Tag (Calm, Things 3 style) */}
      <div className="px-5 py-4 border-t border-[#E2E6DD] flex items-center justify-between text-[11px] text-[#78837A]">
        <span>Offline library</span>
        <span className="font-mono text-[10px] text-[#78837A]/80">macOS</span>
      </div>
    </aside>
  );
};
