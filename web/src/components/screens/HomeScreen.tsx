import React, { useMemo, useState } from 'react';
import { ArrowRight, Play, Shuffle, Moon, Sun } from 'lucide-react';
import { Album, Track } from '../../data/musicData';
import { LivingScene } from '../pixel/LivingScene';
import { PixelArt } from '../pixel/PixelArt';
import { PixelFrame, PixelEqualizer, EmptyGallery } from '../pixel/ui';
import { SCENE_KINDS, frameToneFor } from '../../theme/pixel';
import { dayPhase } from '../../theme/atmosphere';

interface HomeScreenProps {
  onSelectAlbum: (albumId: string) => void;
  recentlyPlayedAlbums: Album[];
  recentlyAddedAlbums: Album[];
  albums: Album[];
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  darkMode: boolean;
  onPlayTrack: (track: Track) => void;
  onOpenNowPlaying: () => void;
}

const sourceShort = (source: Album['source']) =>
  source === 'Apple Music' ? 'Apple' : source === 'Spotify' ? 'Spotify' : 'Local';

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectAlbum,
  recentlyPlayedAlbums,
  recentlyAddedAlbums,
  albums,
  tracks,
  currentTrack,
  isPlaying,
  darkMode,
  onPlayTrack,
  onOpenNowPlaying,
}) => {
  const [sceneIndex, setSceneIndex] = useState(0);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const collection = useMemo(() => {
    const seen = new Set<string>();
    const ordered: Album[] = [];
    [...recentlyPlayedAlbums, ...recentlyAddedAlbums, ...albums].forEach((album) => {
      if (!album || seen.has(album.id)) return;
      seen.add(album.id);
      ordered.push(album);
    });
    return ordered;
  }, [recentlyPlayedAlbums, recentlyAddedAlbums, albums]);

  const artistCount = new Set(tracks.map((track) => track.artist)).size;
  const scene = SCENE_KINDS[sceneIndex % SCENE_KINDS.length];
  const nowAlbumId = currentTrack?.albumId;
  const heroSeed = currentTrack?.albumId || currentTrack?.id || 'gallery-hero';

  const cycleScene = () => setSceneIndex((index) => (index + 1) % SCENE_KINDS.length);

  return (
    <div id="screen-home" className="gallery-home">
      <div className="gallery-masthead">
        <span><span className="px-star">✳</span> Frankenstein / Gallery</span>
        <span>Now on view · {collection.length} {collection.length === 1 ? 'work' : 'works'}</span>
        <span>Your little listening space</span>
      </div>

      <section className="gallery-feature" aria-label="Your listening space">
        <div className="gallery-intro">
          <span className="px-label">{darkMode ? 'The night gallery' : 'A little space to listen'}</span>
          <h1 className="hero-title">
            {darkMode ? 'A quieter kind of night.' : `${greeting}.`}<br />
            <em>{darkMode ? 'Just you and the music.' : 'Find your next song.'}</em>
          </h1>
          <p className="hero-sub">
            {darkMode
              ? 'Let the stars drift. Put on something you love.'
              : 'Your music, a little fresh air, and nowhere else to be.'}
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="pixel-btn"
              onClick={() => {
                if (isPlaying) onOpenNowPlaying();
                else if (currentTrack) onPlayTrack(currentTrack);
                else if (tracks[0]) onPlayTrack(tracks[0]);
                else onOpenNowPlaying();
              }}
            >
              <Play size={12} strokeWidth={2.4} />
              {isPlaying ? 'Open listening room' : 'Start listening'}
            </button>
          </div>
          <span className="intro-source-note">Spotify · Apple Music · Your library</span>
        </div>
        <div className="scene-exhibit">
          <div className="gallery-hero">
            <LivingScene seed={heroSeed} variant={scene} night={darkMode}
              label={darkMode ? 'Drifting stars and a softly glowing galaxy' : 'A sunlit landscape with slowly drifting clouds'} />
          </div>
          <div className="scene-toolbar">
            <span className="scene-caption">
              {darkMode ? <Moon size={13} /> : <Sun size={13} />}
              {darkMode ? 'After hours' : dayPhase(hour)} <span className="scene-caption-dot">·</span> {scene}
            </span>
            <button type="button" className="scene-wander" onClick={cycleScene} title="Explore another landscape">
              <Shuffle size={12} /> Change view
            </button>
          </div>
        </div>
      </section>

      <div className="gallery-stats" aria-label="Collection statistics">
        <div className="gallery-stat">
          <span className="num">{String(tracks.length).padStart(2, '0')}</span>
          <span className="key">Songs</span>
        </div>
        <div className="gallery-stat">
          <span className="num">{String(collection.length).padStart(2, '0')}</span>
          <span className="key">Albums</span>
        </div>
        <div className="gallery-stat">
          <span className="num">{String(artistCount).padStart(2, '0')}</span>
          <span className="key">Artists</span>
        </div>
        <div className="gallery-stat">
          <span className="num"><PixelEqualizer playing={isPlaying} /></span>
          <span className="key">{isPlaying ? 'Playing' : 'At your pace'}</span>
        </div>
      </div>

      <section className="gallery-section" aria-labelledby="collection-heading">
        <div className="gallery-section-head">
          <div>
            <span className="px-label">The collection</span>
            <h2 id="collection-heading">Your collection</h2>
            <p>Something familiar. Something worth another listen.</p>
          </div>
          <span className="px-count">
            <span className="px-eq is-playing" aria-hidden="true">
              <span /><span /><span /><span />
            </span>
            {collection.length} works
          </span>
        </div>

        {collection.length === 0 ? (
          <EmptyGallery
            title="The walls are waiting"
            body="Start the local backend and import a folder, and your albums will hang themselves here."
            hint="cd backend && python main.py  ·  then Library → import"
          />
        ) : (
          <div className="gallery-grid">
            {collection.map((album) => {
              const isNow = Boolean(nowAlbumId && album.id === nowAlbumId);
              return (
                <button
                  key={album.id}
                  type="button"
                  className={`gallery-piece ${isNow ? 'is-now' : ''}`}
                  onClick={() => onSelectAlbum(album.id)}
                  title={`Open ${album.title}`}
                >
                  <PixelFrame
                    tone={frameToneFor(album.id)}
                    lift
                    plaque={
                      <span className="piece-plaque">
                        <span className="piece-plaque-copy">
                          <strong>{album.title}</strong>
                          <span>{album.artist}</span>
                        </span>
                        <span className="piece-year">{album.year || '—'}</span>
                      </span>
                    }
                  >
                    <div className="piece-art">
                      <PixelArt
                        original={album.source === 'Spotify'}
                        src={album.coverUrl}
                        seed={album.id}
                        alt={`${album.title} by ${album.artist}`}
                        grid={56}
                      />
                      {album.source !== 'Spotify' && <span className="piece-tag">
                        {isNow ? (isPlaying ? 'now playing' : 'on view') : sourceShort(album.source)}
                      </span>}
                      {album.source !== 'Spotify' && <span className="piece-veil" aria-hidden="true">
                        <span className="piece-play">
                          <Play size={14} strokeWidth={2.4} />
                        </span>
                      </span>}
                    </div>
                  </PixelFrame>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="gallery-note">
        <PixelEqualizer playing={isPlaying} />
        <span>
          Your music stays yours. Spotify Premium, your Music.app library, and local files — in one quiet space.
        </span>
        <ArrowRight size={13} strokeWidth={1.8} className="ml-auto flex-none" />
      </div>
    </div>
  );
};
