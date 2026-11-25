import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Type } from 'lucide-react';
import type { Track } from '../../data/musicData';
import { useLyrics } from '../../hooks/useLyrics';
import { useLyricSync } from '../../hooks/useLyricSync';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  formatLyricTime,
  formatOffset,
  lyricOffsetKey,
  lyricTrackKey,
  lyricWordTimings,
  readLyricOffset,
  readLyricTextSize,
  writeLyricOffset,
  writeLyricTextSize,
  type LyricLine,
  type LyricTextSize,
  type LyricWord,
} from '../../lyrics/lrc';

/**
 * Set this to false to turn off estimated word-by-word fill and fall back to
 * whole-line highlighting.
 */
export const WORD_HIGHLIGHT = true;

const TARGET_RATIO = 0.32;
const GAP_THRESHOLD = 5;
const AUTO_RESUME_MS = 4000;
const LYRIC_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const WORD_DIM = 0.3;

interface GapMarker {
  id: string;
  afterIndex: number;
  start: number;
  end: number;
}

function buildGaps(lines: LyricLine[]): GapMarker[] {
  if (!lines.length) return [];
  const gaps: GapMarker[] = [];
  if (lines[0].time > 0.8) {
    gaps.push({ id: 'intro', afterIndex: -1, start: 0, end: lines[0].time });
  }
  for (let index = 0; index < lines.length - 1; index += 1) {
    const start = lines[index].time;
    const end = lines[index + 1].time;
    if (end - start >= GAP_THRESHOLD) {
      gaps.push({ id: `gap-${index}`, afterIndex: index, start, end });
    }
  }
  return gaps;
}

export interface SyncedLyricsProps {
  track: Track;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

/**
 * Crossfades between the old and new lyric sheet when the track changes, so
 * the previous song fades away before the next one fades in.
 */
export const SyncedLyrics: React.FC<SyncedLyricsProps> = (props) => {
  const trackKey = lyricTrackKey(props.track);
  const [shown, setShown] = useState(() => ({ key: trackKey, track: props.track }));
  const [fading, setFading] = useState(false);
  const trackRef = useRef(props.track);
  trackRef.current = props.track;

  useEffect(() => {
    if (shown.key === trackKey) {
      setFading(false);
      return undefined;
    }
    setFading(true);
    const timer = window.setTimeout(() => {
      setShown({ key: trackKey, track: trackRef.current });
      setFading(false);
    }, 210);
    return () => window.clearTimeout(timer);
  }, [trackKey, shown.key]);

  return (
    <div className="lyrics-fade" data-fading={fading ? 'true' : undefined}>
      <LyricsBody
        key={shown.key}
        track={shown.track}
        isPlaying={props.isPlaying}
        currentTime={props.currentTime}
        duration={props.duration}
        onSeek={props.onSeek}
        fading={fading}
      />
    </div>
  );
};

interface LyricsBodyProps extends SyncedLyricsProps {
  fading: boolean;
}

const LyricsBody: React.FC<LyricsBodyProps> = ({
  track,
  isPlaying,
  currentTime,
  duration,
  onSeek,
  fading,
}) => {
  const { data, kind, lines, plain, loading, error, retry } = useLyrics(track);
  const reduced = useReducedMotion();
  const trackKey = lyricTrackKey(track);
  const offsetKey = lyricOffsetKey(track);

  const [offset, setOffset] = useState(() => readLyricOffset(offsetKey));
  const [size, setSize] = useState<LyricTextSize>(() => readLyricTextSize());
  const [following, setFollowing] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [wave, setWave] = useState(false);

  const gaps = useMemo(() => buildGaps(lines), [lines]);
  const gapsRef = useRef(gaps);
  gapsRef.current = gaps;

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const gapRefs = useRef(new Map<string, HTMLDivElement | null>());
  const offsetsRef = useRef<number[]>([]);
  const wordSpansRef = useRef<HTMLSpanElement[]>([]);
  const wordTimingsRef = useRef<LyricWord[]>([]);
  const wordValuesRef = useRef<number[]>([]);
  const translateRef = useRef(0);
  const activeRef = useRef(-1);
  const followingRef = useRef(true);
  const manualBaseRef = useRef(0);
  const manualDeltaRef = useRef(0);
  const gestureRef = useRef<{ pointerId: number; startY: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const gapIdRef = useRef('');
  const dotsLitRef = useRef<boolean[]>([false, false, false]);
  const resumeTimer = useRef(0);
  const staggerTimer = useRef(0);
  const suppressTimer = useRef(0);

  followingRef.current = following;

  const applyTranslate = useCallback((value: number, animate: boolean) => {
    const element = trackRef.current;
    if (!element) return;
    const next = Number.isFinite(value) ? value : 0;
    element.style.transition = animate && !reduced
      ? `transform 560ms ${LYRIC_EASE}`
      : 'none';
    element.style.transform = `translate3d(0, ${next.toFixed(2)}px, 0)`;
    translateRef.current = next;
  }, [reduced]);

  const clampOffset = useCallback((value: number) => {
    const viewport = viewportRef.current;
    const element = trackRef.current;
    if (!viewport || !element) return value;
    const height = viewport.clientHeight;
    const max = height * 0.34;
    const min = Math.min(0, height - element.scrollHeight);
    return Math.min(max, Math.max(min, value));
  }, []);

  const targetFor = useCallback((index: number) => {
    const viewport = viewportRef.current;
    if (!viewport || index < 0) return 0;
    const row = rowRefs.current[index];
    const top = row ? row.offsetTop : offsetsRef.current[index] ?? 0;
    return viewport.clientHeight * TARGET_RATIO - top;
  }, []);

  const measure = useCallback(() => {
    offsetsRef.current = rowRefs.current.map((row) => (row ? row.offsetTop : 0));
    if (followingRef.current) {
      applyTranslate(clampOffset(targetFor(activeRef.current)), false);
    }
  }, [applyTranslate, clampOffset, targetFor]);

  // Per-frame word fill and instrumental dots. Only the active line's words
  // and the current gap's three dots are written, never the whole list.
  const onFrame = useCallback((_position: number, syncTime: number) => {
    if (WORD_HIGHLIGHT) {
      const timings = wordTimingsRef.current;
      const spans = wordSpansRef.current;
      const values = wordValuesRef.current;
      for (let index = 0; index < spans.length; index += 1) {
        const word = timings[index];
        if (!word) continue;
        const span = Math.max(0.001, word.end - word.start);
        const progress = Math.max(0, Math.min(1, (syncTime - word.start) / span));
        const value = WORD_DIM + (1 - WORD_DIM) * progress;
        if (Math.abs(value - (values[index] ?? -1)) > 0.015) {
          values[index] = value;
          spans[index].style.opacity = value.toFixed(3);
        }
      }
    }

    let currentGap: GapMarker | null = null;
    for (const gap of gapsRef.current) {
      if (syncTime >= gap.start && syncTime < gap.end) {
        currentGap = gap;
        break;
      }
    }

    const gapId = currentGap?.id ?? '';
    if (gapId !== gapIdRef.current) {
      const previous = gapRefs.current.get(gapIdRef.current);
      if (previous) {
        previous.querySelectorAll<HTMLElement>('.lyric-gap-dot').forEach((dot) => {
          dot.style.opacity = '0.22';
        });
      }
      gapIdRef.current = gapId;
      dotsLitRef.current = [false, false, false];
    }

    if (currentGap) {
      const element = gapRefs.current.get(currentGap.id);
      if (element) {
        const span = Math.max(0.001, currentGap.end - currentGap.start);
        const progress = Math.max(0, Math.min(1, (syncTime - currentGap.start) / span));
        element.querySelectorAll<HTMLElement>('.lyric-gap-dot').forEach((dot, index) => {
          const lit = progress > (index + 0.25) / 3;
          if (dotsLitRef.current[index] !== lit) {
            dotsLitRef.current[index] = lit;
            dot.style.opacity = lit ? '1' : '0.22';
          }
        });
      }
    }
  }, []);

  const { activeIndex, resync } = useLyricSync({
    lines,
    isPlaying,
    currentTime,
    duration,
    offsetSec: offset,
    resetKey: `${trackKey}:${data?.fetchedAt ?? 0}`,
    onFrame,
  });
  activeRef.current = activeIndex;

  // A new sheet starts at the top, follows again, and only turns on the wave
  // stagger after it has settled.
  useEffect(() => {
    setFollowing(true);
    followingRef.current = true;
    setWave(false);
    manualDeltaRef.current = 0;
    applyTranslate(0, false);
    window.clearTimeout(staggerTimer.current);
    staggerTimer.current = window.setTimeout(() => setWave(true), 700);
    return () => window.clearTimeout(staggerTimer.current);
  }, [data?.fetchedAt, applyTranslate]);

  // Measure once per layout/font change, not on every frame.
  useLayoutEffect(() => {
    rowRefs.current.length = lines.length;
    measure();
  }, [lines, size, data?.kind, measure]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const element = trackRef.current;
    if (!viewport || !element) return undefined;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(schedule)
      : null;
    observer?.observe(viewport);
    observer?.observe(element);
    window.addEventListener('resize', schedule);
    document.fonts?.ready.then(schedule).catch(() => {});
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
    };
  }, [measure]);

  // Follow the active line with a single transform, kept about a third of the
  // way down the viewport. Resuming after manual scrolling animates from the
  // listener's position rather than snapping.
  useEffect(() => {
    activeRef.current = activeIndex;
    if (!followingRef.current) return;
    applyTranslate(clampOffset(targetFor(activeIndex)), true);
  }, [activeIndex, following, clampOffset, targetFor, applyTranslate]);

  // Collect only the active line's word spans for imperative fill.
  useLayoutEffect(() => {
    const row = activeIndex >= 0 ? rowRefs.current[activeIndex] : null;
    const spans = row
      ? Array.from(row.querySelectorAll<HTMLSpanElement>('.lyric-word'))
      : [];
    wordSpansRef.current = spans;
    wordValuesRef.current = spans.map(() => -1);
    const line = activeIndex >= 0 ? lines[activeIndex] : undefined;
    wordTimingsRef.current = WORD_HIGHLIGHT && line
      ? lyricWordTimings(line, lines[activeIndex + 1])
      : [];
    spans.forEach((span) => {
      span.style.opacity = String(WORD_DIM);
    });
  }, [activeIndex, lines, size, data?.kind]);

  useEffect(() => () => {
    window.clearTimeout(resumeTimer.current);
    window.clearTimeout(staggerTimer.current);
    window.clearTimeout(suppressTimer.current);
  }, []);

  const beginManual = useCallback(() => {
    if (!followingRef.current) return;
    followingRef.current = false;
    setFollowing(false);
    manualBaseRef.current = translateRef.current;
    manualDeltaRef.current = 0;
  }, []);

  const rebaseManual = useCallback(() => {
    manualBaseRef.current = translateRef.current;
    manualDeltaRef.current = 0;
  }, []);

  const bumpResume = useCallback(() => {
    window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => {
      manualDeltaRef.current = 0;
      followingRef.current = true;
      setFollowing(true);
    }, AUTO_RESUME_MS);
  }, []);

  const resumeFollowing = useCallback(() => {
    window.clearTimeout(resumeTimer.current);
    manualDeltaRef.current = 0;
    followingRef.current = true;
    setFollowing(true);
  }, []);

  const setOffsetBy = useCallback((delta: number) => {
    setOffset((previous) => writeLyricOffset(offsetKey, previous + delta));
  }, [offsetKey]);

  const toggleSize = useCallback(() => {
    setSize((previous) => {
      const next: LyricTextSize = previous === 'large' ? 'medium' : 'large';
      writeLyricTextSize(next);
      return next;
    });
  }, []);

  const seekToLine = useCallback((index: number) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    const line = lines[index];
    if (!line) return;
    const target = Math.max(0, line.time + offset);
    onSeek(duration > 0 ? Math.min(duration, target) : target);
    resync();
    manualDeltaRef.current = 0;
    followingRef.current = true;
    setFollowing(true);
    setWave(false);
    window.clearTimeout(staggerTimer.current);
    staggerTimer.current = window.setTimeout(() => setWave(true), 600);
  }, [duration, lines, offset, onSeek, resync]);

  // Native wheel listener so free scrolling can prevent the page gesture.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !lines.length) return undefined;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      beginManual();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
      manualDeltaRef.current -= event.deltaY * unit;
      applyTranslate(clampOffset(manualBaseRef.current + manualDeltaRef.current), false);
      bumpResume();
    };
    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, [lines.length, beginManual, applyTranslate, clampOffset, bumpResume]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if ((event.target as Element).closest('.lyrics-follow-pill')) return;
    if (!followingRef.current) rebaseManual();
    gestureRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      moved: false,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const delta = event.clientY - gesture.startY;
    if (!gesture.moved && Math.abs(delta) < 8) return;
    if (!gesture.moved) {
      gesture.moved = true;
      suppressClickRef.current = true;
      beginManual();
      // Capture only once this is a drag: capturing on pointerdown would make
      // a tap dispatch its click to the viewport instead of the lyric button.
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Dragging still works while the pointer stays over the sheet.
      }
    }
    manualDeltaRef.current = -delta;
    applyTranslate(clampOffset(manualBaseRef.current + manualDeltaRef.current), false);
    bumpResume();
  };

  const endGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    if (gesture.moved) {
      bumpResume();
      window.clearTimeout(suppressTimer.current);
      suppressTimer.current = window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 320);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    if (!lines.length) return;
    event.preventDefault();
    if (!followingRef.current) rebaseManual();
    else beginManual();
    manualDeltaRef.current += event.key === 'ArrowDown' ? -90 : 90;
    applyTranslate(clampOffset(manualBaseRef.current + manualDeltaRef.current), false);
    bumpResume();
  };

  const blurOff = hovering || !following || reduced;
  const status = loading
    ? 'Finding lyrics…'
    : error || kind === 'empty' || !kind
      ? 'No lyrics found'
      : kind === 'instrumental'
        ? 'Instrumental'
        : kind === 'plain'
          ? 'Lyrics not synced'
          : 'Synced lyrics';

  let content: React.ReactNode;
  if (loading) {
    content = (
      <div className="lyrics-skeleton" aria-hidden="true">
        {[86, 58, 72, 44, 78, 54, 66].map((width, index) => (
          <span key={index} style={{ width: `${width}%` }} />
        ))}
      </div>
    );
  } else if (error || kind === 'empty' || !kind) {
    content = (
      <div className="lyrics-state" role="status">
        <strong>No lyrics found</strong>
        <p>
          {error
            ? 'The lyrics provider could not be reached. Check your connection and try again.'
            : 'Nothing on LRCLIB matches this recording yet.'}
        </p>
        <button type="button" className="pixel-btn ghost small" onClick={retry}>
          Retry
        </button>
      </div>
    );
  } else if (kind === 'instrumental') {
    content = (
      <div className="lyrics-state" role="status">
        <strong>Instrumental</strong>
        <p>No words in this piece — just the music.</p>
      </div>
    );
  } else if (kind === 'plain') {
    content = (
      <div className="lyrics-plain" role="group" aria-label={`Lyrics for ${track.title}`}>
        {plain.map((line, index) => (
          <p className="lyric-row is-plain" key={`${index}-${line.slice(0, 24)}`}>
            {line}
          </p>
        ))}
      </div>
    );
  } else {
    const introGap = gaps.find((gap) => gap.afterIndex === -1);
    const gapAfter = new Map<number, GapMarker>();
    gaps.forEach((gap) => {
      if (gap.afterIndex >= 0) gapAfter.set(gap.afterIndex, gap);
    });

    const renderGap = (gap: GapMarker) => {
      const state = activeIndex === gap.afterIndex
        ? 'active'
        : activeIndex > gap.afterIndex
          ? 'past'
          : 'future';
      return (
        <div
          key={gap.id}
          className="lyric-gap"
          data-state={state}
          aria-hidden="true"
          ref={(node) => {
            if (node) gapRefs.current.set(gap.id, node);
            else gapRefs.current.delete(gap.id);
          }}
        >
          <span className="lyric-gap-dot" />
          <span className="lyric-gap-dot" />
          <span className="lyric-gap-dot" />
        </div>
      );
    };

    content = (
      <div
        ref={viewportRef}
        className="lyrics-viewport"
        role="group"
        aria-label={`Synced lyrics for ${track.title}`}
        aria-busy={fading ? 'true' : undefined}
        tabIndex={0}
        data-blur={blurOff ? 'off' : 'on'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onLostPointerCapture={endGesture}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') setHovering(true);
        }}
        onPointerLeave={() => setHovering(false)}
        onKeyDown={onKeyDown}
      >
        <div className="lyrics-track" ref={trackRef}>
          {introGap ? renderGap(introGap) : null}
          {lines.map((line, index) => {
            const isActive = index === activeIndex;
            const state = isActive ? 'active' : activeIndex > index ? 'past' : 'next';
            const distance = activeIndex < 0 ? index + 1 : Math.abs(index - activeIndex);
            // Very long sheets only pay for blur near the active line; far
            // rows still dim, but they skip the filter work entirely.
            const blur = reduced || (lines.length > 120 && distance > 8)
              ? 0
              : Math.min(4, distance);
            const delay = reduced || !wave || activeIndex < 0
              ? 0
              : Math.min(250, distance * 25);
            const words = isActive && WORD_HIGHLIGHT
              ? lyricWordTimings(line, lines[index + 1])
              : null;

            return (
              <React.Fragment key={`${line.time}-${index}`}>
                <button
                  type="button"
                  ref={(node) => {
                    rowRefs.current[index] = node;
                  }}
                  className="lyric-row"
                  data-state={state}
                  aria-current={isActive ? 'true' : undefined}
                  title={`Jump to ${formatLyricTime(line.time)}`}
                  style={{
                    filter: `blur(${blur}px)`,
                    transitionDelay: `${delay}ms`,
                    willChange: distance <= 8 ? 'transform, opacity, filter' : 'auto',
                  }}
                  onClick={() => seekToLine(index)}
                >
                  {words ? (
                    words.map((word, wordIndex) => (
                      <span className="lyric-word" key={`${wordIndex}-${word.text}`}>
                        {word.text}
                        {wordIndex < words.length - 1 ? ' ' : ''}
                      </span>
                    ))
                  ) : (
                    line.text
                  )}
                </button>
                {gapAfter.has(index) ? renderGap(gapAfter.get(index) as GapMarker) : null}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className="lyrics-panel"
      data-size={size}
      data-reduced={reduced ? 'true' : undefined}
    >
      <div className="lyrics-toolbar">
        <span className="lyrics-status" title={data?.providerUrl ? 'Lyrics via LRCLIB' : undefined}>
          {status}
        </span>
        <div className="lyrics-tools">
          {kind === 'synced' ? (
            <div className="lyrics-offset" aria-label="Lyric timing offset">
              <button
                type="button"
                className="lyrics-tool"
                onClick={() => setOffsetBy(-0.5)}
                aria-label="Show lyrics 0.5 seconds earlier"
                title="0.5s earlier"
              >
                −
              </button>
              <span title="Current lyric timing offset">{formatOffset(offset)}</span>
              <button
                type="button"
                className="lyrics-tool"
                onClick={() => setOffsetBy(0.5)}
                aria-label="Show lyrics 0.5 seconds later"
                title="0.5s later"
              >
                +
              </button>
            </div>
          ) : null}
          <button
            type="button"
            className={`lyrics-tool ${size === 'large' ? 'is-on' : ''}`}
            onClick={toggleSize}
            title={`Text size: ${size === 'large' ? 'large' : 'medium'}`}
            aria-label={`Use ${size === 'large' ? 'medium' : 'large'} lyric text`}
          >
            <Type size={13} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <div className="lyrics-stage">
        {content}
        {kind === 'synced' && !following ? (
          <button
            type="button"
            className="lyrics-follow-pill"
            onClick={resumeFollowing}
            aria-label="Resume lyric auto-follow"
          >
            Follow
          </button>
        ) : null}
      </div>
    </div>
  );
};
