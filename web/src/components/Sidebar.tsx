import React from 'react';
import {
  Compass,
  Search,
  FolderOpen,
  Heart,
  Clock,
  ListMusic,
  Moon,
  Sun,
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
  darkMode: boolean;
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  darkMode,
  onToggleTheme,
}) => {
  const mainNavItems = [
    { id: 'home' as ScreenId, label: 'Gallery', icon: Compass },
    { id: 'search' as ScreenId, label: 'Search', icon: Search },
    { id: 'library' as ScreenId, label: 'Library', icon: FolderOpen },
    { id: 'favorites' as ScreenId, label: 'Favorites', icon: Heart },
    { id: 'history' as ScreenId, label: 'History', icon: Clock },
    { id: 'playlists' as ScreenId, label: 'Playlists', icon: ListMusic },
  ];

  const sourceItems = [
    { id: 'source-local' as ScreenId, label: 'Local', tone: 'local' },
    { id: 'source-apple' as ScreenId, label: 'Apple Music', tone: 'apple' },
    { id: 'source-spotify' as ScreenId, label: 'Spotify', tone: 'spotify' },
  ];

  return (
    <aside id="app-sidebar" className="pixel-sidebar" aria-label="Main navigation">
      <div className="flex flex-col min-h-0">
        <div className="pixel-window-bar">
          <div className="pixel-dots" aria-hidden="true">
            <span className="pixel-dot is-red" />
            <span className="pixel-dot is-yellow" />
            <span className="pixel-dot is-green" />
          </div>
          <span>offline gallery</span>
        </div>

        <div className="pixel-brand">
          <div className="px-mark" aria-hidden="true" />
          <div className="pixel-brand-copy">
            <strong>Frankenstein</strong>
            <span>pixel listening gallery</span>
          </div>
        </div>

        <nav className="pixel-nav" aria-label="Galleries">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isSelected = currentScreen === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => onNavigate(item.id)}
                className={`pixel-nav-btn ${isSelected ? 'is-active' : ''}`}
                title={item.label}
              >
                <Icon
                  size={15}
                  strokeWidth={1.7}
                  className="px-nav-icon"
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="pixel-nav-sep" aria-hidden="true" />
        <div className="pixel-nav-label">Sources</div>

        <div className="pixel-nav" aria-label="Sources">
          {sourceItems.map((source) => {
            const isSelected = currentScreen === source.id;
            return (
              <button
                key={source.id}
                id={`nav-${source.id}`}
                onClick={() => onNavigate(source.id)}
                className={`pixel-nav-btn ${isSelected ? 'is-active' : ''}`}
                title={source.label}
              >
                <span className={`pixel-source-dot is-${source.tone}`} aria-hidden="true" />
                <span>{source.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pixel-sidebar-foot">
        <span>made for listening</span>
        <button
          onClick={onToggleTheme}
          className="px-switch"
          aria-label={darkMode ? 'Switch to day gallery' : 'Switch to night gallery'}
          title={darkMode ? 'Day gallery' : 'Night gallery'}
        >
          {darkMode ? <Sun size={12} strokeWidth={1.8} /> : <Moon size={12} strokeWidth={1.8} />}
          <span>{darkMode ? 'Day' : 'Night'}</span>
        </button>
      </div>
    </aside>
  );
};
