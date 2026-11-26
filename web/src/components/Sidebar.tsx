import React from 'react';
import {
  Home, Search, Library, Heart, History, ListMusic, HardDrive,
  Music2, Radio, Settings2,
} from 'lucide-react';

export type ScreenId =
  | 'home' | 'search' | 'library' | 'favorites' | 'history'
  | 'playlists' | 'album' | 'now-playing'
  | 'source-local' | 'source-apple' | 'source-spotify';

interface SidebarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onDiscover: () => void;
  onSettings: () => void;
  thumbnail?: string;
}

const primary = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'favorites', label: 'Favorites', icon: Heart },
  { id: 'history', label: 'History', icon: History },
  { id: 'playlists', label: 'Playlists', icon: ListMusic },
] as const;
const sources = [
  { id: 'source-local', label: 'Local', icon: HardDrive },
  { id: 'source-apple', label: 'Apple Music', icon: Music2 },
  { id: 'source-spotify', label: 'Spotify', icon: Radio },
] as const;

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen, onNavigate, onDiscover, onSettings, thumbnail,
}) => (
  <aside id="app-sidebar" className="glass-sidebar" aria-label="Main navigation">
    <div className="glass-window-dots" aria-hidden="true"><i /><i /><i /></div>
    <nav className="glass-nav" aria-label="Galleries">
      {primary.map(({ id, label, icon: Icon }) => (
        <button key={id} id={`nav-${id}`} type="button"
          className={`glass-nav-button ${currentScreen === id ? 'is-active' : ''}`}
          onClick={() => onNavigate(id)} aria-label={label} title={label}
          aria-current={currentScreen === id ? 'page' : undefined}>
          <Icon size={21} strokeWidth={1.7} />
        </button>
      ))}
      <button type="button" className="glass-nav-button" onClick={onDiscover}
        aria-label="Discover similar" title="Discover similar"><Radio size={21} strokeWidth={1.7} /></button>
      <span className="glass-nav-divider" aria-hidden="true" />
      {sources.map(({ id, label, icon: Icon }) => (
        <button key={id} id={`nav-${id}`} type="button"
          className={`glass-nav-button glass-source-button ${currentScreen === id ? 'is-active' : ''}`}
          onClick={() => onNavigate(id)} aria-label={label} title={label}
          aria-current={currentScreen === id ? 'page' : undefined}>
          <Icon size={20} strokeWidth={1.7} />
        </button>
      ))}
    </nav>
    <div className="glass-nav-bottom">
      <button type="button" className="glass-nav-button" onClick={onSettings}
        aria-label="Settings" title="Settings"><Settings2 size={21} strokeWidth={1.7} /></button>
      <button type="button" className="glass-nav-avatar" onClick={() => onNavigate('home')}
        aria-label="Go to home" title="Home">
        {thumbnail ? <img src={thumbnail} alt="" width="42" height="42" /> : <Music2 size={20} />}
      </button>
    </div>
  </aside>
);
