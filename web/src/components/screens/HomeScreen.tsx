import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Play, Pause, Shuffle, SkipBack, SkipForward } from 'lucide-react';
import type { Album, Track } from '../../data/musicData';
import { PixelArt } from '../pixel/PixelArt';
import { EmptyGallery } from '../pixel/ui';
import { useGlassSheen } from '../../hooks/useGlassSheen';

interface HomeScreenProps {
  onSelectAlbum: (albumId: string) => void;
  recentlyPlayedAlbums: Album[];
  recentlyAddedAlbums: Album[];
  albums: Album[];
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  darkMode: boolean;
  onPlayTrack: (track: Track) => void;
  onTogglePlay: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onOpenNowPlaying: () => void;
  offline?: boolean;
  onRetry?: () => void;
}

const Ribbon = () => (
  <svg className="glass-ribbon" viewBox="0 0 1200 400" fill="none" aria-hidden="true" preserveAspectRatio="none">
    <defs>
      <linearGradient id="glass-ribbon-gradient" x1="0" y1="0" x2="1200" y2="400" gradientUnits="userSpaceOnUse">
        <stop stopColor="#8b7cf6" stopOpacity=".02" />
        <stop offset=".35" stopColor="#8b7cf6" stopOpacity=".42" />
        <stop offset=".63" stopColor="#f0a6c8" stopOpacity=".58" />
        <stop offset="1" stopColor="#7cc4ff" stopOpacity=".38" />
      </linearGradient>
    </defs>
    <path d="M-80 420C230 425 310 260 497 290S777 460 970 210 1110 30 1270-40"
      stroke="url(#glass-ribbon-gradient)" strokeWidth="110" strokeLinecap="round" />
    <path d="M-80 420C230 425 310 260 497 290S777 460 970 210 1110 30 1270-40"
      stroke="url(#glass-ribbon-gradient)" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectAlbum, recentlyPlayedAlbums, recentlyAddedAlbums, albums, tracks,
  currentTrack, isPlaying, darkMode, onPlayTrack, onTogglePlay, onPrevious,
  onNext, onOpenNowPlaying, currentTime, offline = false, onRetry,
}) => {
  const [slide, setSlide] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(true);
  const heroRef = useRef<HTMLElement>(null);
  const sheen = useGlassSheen<HTMLElement>();
  const startX = useRef<number | null>(null);
  const collection = useMemo(() => {
    const seen = new Set<string>();
    return [...recentlyPlayedAlbums, ...recentlyAddedAlbums, ...albums].filter((album) => {
      if (!album || seen.has(album.id)) return false;
      seen.add(album.id);
      return true;
    });
  }, [recentlyPlayedAlbums, recentlyAddedAlbums, albums]);
  const featured = useMemo(() => {
    const last = currentTrack || tracks[0];
    const favorite = tracks.find((track) => track.isFavorite && track.id !== last?.id) || tracks.find((track) => track.id !== last?.id);
    const favoriteArtists = new Set(tracks.filter((track) => track.isFavorite).map((track) => track.artist));
    const newAlbum = recentlyAddedAlbums.find((album) =>
      album.id !== last?.albumId && favoriteArtists.has(album.artist))
      || recentlyAddedAlbums.find((album) => album.id !== last?.albumId);
    const fresh = tracks.find((track) => track.albumId === newAlbum?.id && track.id !== favorite?.id)
      || tracks.find((track) => track.id !== last?.id && track.id !== favorite?.id);
    return [
      { label: 'Last played', track: last, title: last?.title || 'Your listening space',
        subtitle: last ? `${last.artist} · ${last.album}` : 'A little room for everything you love.' },
      { label: 'A mix for you', track: favorite || last, title: favorite?.title || 'Find a new favourite',
        subtitle: favorite ? `${favorite.artist} · chosen from your music` : 'Your collection, all in one place.' },
      { label: fresh && favoriteArtists.has(fresh.artist) ? 'From your favourite artists' : 'New in your collection',
        track: fresh || last, title: fresh?.title || 'Something worth hearing',
        subtitle: fresh ? `${fresh.artist} · ${fresh.album}` : 'Add more music to grow your collection.' },
    ];
  }, [currentTrack, tracks, recentlyAddedAlbums]);
  const active = featured[slide];

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .15 });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (hovered || !visible) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setSlide((value) => (value + 1) % featured.length);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [hovered, visible, featured.length]);

  const playFeatured = () => {
    if (!active.track) return;
    if (active.track.id === currentTrack?.id) onTogglePlay();
    else onPlayTrack(active.track);
  };
  const shuffleFeatured = () => {
    if (!tracks.length) return;
    onPlayTrack(tracks[Math.floor(Math.random() * tracks.length)]);
  };
  const openAlbum = (album: Album) => onSelectAlbum(album.id);
  const albumTile = (album: Album, index: number, className: string) => (
    <button key={album.id} type="button" className={`glass-album-tile ${className}`}
      data-album-id={album.id} onClick={() => openAlbum(album)} title={`Open ${album.title || 'Untitled album'}`}>
      <span className="piece-art">
        <PixelArt original={Boolean(album.coverUrl)} src={album.coverUrl}
          seed={album.id} alt={`${album.title || 'Untitled album'} by ${album.artist || 'Unknown artist'}`} grid={48} />
      </span>
      <span className="glass-album-copy"><strong>{album.title || 'Untitled album'}</strong><small>{album.artist || 'Unknown artist'}</small></span>
      <span className="sr-only">Album {index + 1}</span>
    </button>
  );

  return (
    <div id="screen-home" className="glass-home">
      <section className="glass-hero" ref={(node) => { heroRef.current = node; sheen.ref.current = node; }} aria-label="Featured music"
        onPointerEnter={() => { sheen.onPointerEnter(); setHovered(true); }}
        onPointerMove={sheen.onPointerMove}
        onPointerLeave={() => { sheen.onPointerLeave(); setHovered(false); }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') { event.preventDefault(); setSlide((slide + featured.length - 1) % featured.length); }
          if (event.key === 'ArrowRight') { event.preventDefault(); setSlide((slide + 1) % featured.length); }
        }}
        onPointerDown={(event) => { startX.current = event.clientX; }}
        onPointerUp={(event) => {
          if (startX.current !== null && Math.abs(event.clientX - startX.current) > 50) {
            setSlide((slide + (event.clientX < startX.current ? 1 : featured.length - 1)) % featured.length);
          }
          startX.current = null;
        }} tabIndex={0} data-playing={isPlaying} data-visible={visible}>
        <Ribbon />
        <div className="glass-hero-copy" key={slide}>
          <span className="glass-eyebrow">{active.label}</span>
          <h1 title={active.title}>{active.title}</h1>
          <p>{active.subtitle}</p>
          <div className="glass-hero-actions">
            {darkMode ? (
              <>
                <button type="button" className="glass-primary-button" onClick={playFeatured} disabled={!active.track}>
                  {active.track?.id === currentTrack?.id && isPlaying ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
                  {active.track?.id === currentTrack?.id && isPlaying ? 'Pause' : 'Play now'}
                </button>
                <button type="button" className="glass-round-button" onClick={shuffleFeatured} aria-label="Shuffle your music" title="Shuffle your music"><Shuffle size={19} /></button>
              </>
            ) : (
              <>
                <button type="button" className="glass-round-button" onClick={onPrevious} aria-label="Previous track" title="Previous track"><SkipBack size={19} /></button>
                <button type="button" className="glass-round-button is-primary" onClick={playFeatured} disabled={!active.track} aria-label="Play featured track" title="Play featured track">
                  {active.track?.id === currentTrack?.id && isPlaying ? <Pause size={21} fill="currentColor" /> : <Play size={21} fill="currentColor" />}
                </button>
                <button type="button" className="glass-round-button" onClick={onNext} aria-label="Next track" title="Next track"><SkipForward size={19} /></button>
              </>
            )}
          </div>
          {!darkMode && <button type="button" className="glass-hero-current" onClick={onOpenNowPlaying}>Open now playing <ArrowRight size={14} /></button>}
          {!darkMode && <div className="glass-hero-progress" aria-label="Current song progress">
            <span style={{ transform: `scaleX(${Math.min(1, Math.max(0, currentTime / Math.max(1, currentTrack?.durationSec || 1)))})` }} />
          </div>}
        </div>
        <div className="glass-hero-art" aria-hidden="true">
          {darkMode ? (
            <div className="glass-vinyl-wrap" key={active.track?.id || slide}>
              <div className="glass-vinyl"><div className="glass-vinyl-disc"><span /></div></div>
              <div className="glass-front-cover">
                <PixelArt original={Boolean(active.track?.coverUrl)} src={active.track?.coverUrl || ''} eager
                  seed={active.track?.albumId || 'featured'} alt="" grid={56} />
              </div>
            </div>
          ) : (
            <div className="glass-cover-stack">
              {featured.map((item, index) => (
                <div className="glass-stack-cover" key={index}
                  style={{ '--stack-depth': (index - slide + featured.length) % featured.length } as React.CSSProperties}>
                  <PixelArt original={Boolean(item.track?.coverUrl)} src={item.track?.coverUrl || ''} eager
                    seed={item.track?.albumId || `mix-${index}`} alt="" grid={56} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="glass-hero-dots" role="group" aria-label="Featured music slides">
          {featured.map((item, index) => <button type="button" key={item.label}
            className={index === slide ? 'is-active' : ''} onClick={() => setSlide(index)}
            aria-label={`Show ${item.label}`} aria-pressed={index === slide} />)}
        </div>
      </section>

      {collection.length ? (
        <>
          <section className="glass-quick-section" aria-label="Quick access">
            <div className="glass-section-header"><h2>Back to your music</h2><span>{collection.length} albums</span></div>
            <div className="glass-quick-list">
              {collection.slice(0, darkMode ? 4 : 8).map((album, index) => albumTile(album, index, 'glass-quick-card'))}
            </div>
          </section>
          <section className="glass-shelf-section" aria-labelledby="glass-recent-heading">
            <div className="glass-section-header"><h2 id="glass-recent-heading">Recently played</h2>
              <button type="button" onClick={() => openAlbum(collection[0])}>See all <ArrowRight size={15} /></button></div>
            <div className="glass-shelf">{collection.map((album, index) => albumTile(album, index, 'glass-shelf-card'))}</div>
          </section>
          <section className="glass-shelf-section" aria-labelledby="glass-added-heading">
            <div className="glass-section-header"><h2 id="glass-added-heading">Your collection</h2>
              <span>{tracks.length} songs · {new Set(tracks.map((track) => track.artist)).size} artists</span></div>
            <div className="glass-shelf">{[...collection].reverse().map((album, index) => albumTile(album, index, 'glass-shelf-card'))}</div>
          </section>
        </>
      ) : (
        <EmptyGallery title={offline ? "We can't reach your library" : 'Your music belongs here'}
          body={offline ? 'Start the library server to see your music.' : 'Add songs to your library or connect Spotify to begin.'}
          action={onRetry ? <button type="button" className="glass-primary-button" onClick={onRetry}>Try again</button> : undefined} />
      )}
    </div>
  );
};
