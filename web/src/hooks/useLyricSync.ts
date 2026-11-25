import { useCallback, useEffect, useRef, useState } from 'react';
import { activeLineIndex, type LyricLine } from '../lyrics/lrc';

/**
 * Lyrics lead the heard audio by this much so a line lights up just as it is
 * sung. Change this single constant to tune the whole sheet.
 */
export const LATENCY_OFFSET_MS = 250;

export type LyricFrame = (
  /** Interpolated playback position in seconds. */
  position: number,
  /** Position after latency and manual offset, used for line/word timing. */
  syncTime: number,
  /** Active line index, or -1 during the intro. */
  activeIndex: number
) => void;

interface UseLyricSyncOptions {
  lines: LyricLine[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  /** Positive values delay the lyrics; negative values advance them. */
  offsetSec: number;
  resetKey: string;
  onFrame?: LyricFrame;
}

const MAX_BACKWARD_JITTER = 0.35;

/**
 * A single requestAnimationFrame loop owns the lyric clock:
 *
 *   position = last known player position + elapsed performance time
 *
 * Player position props only re-anchor the clock. Active line changes are the
 * only React state updates; word fill and instrumental dots are written
 * imperatively by the `onFrame` callback.
 */
export function useLyricSync({
  lines,
  isPlaying,
  currentTime,
  duration,
  offsetSec,
  resetKey,
  onFrame,
}: UseLyricSyncOptions): { activeIndex: number; resync: () => void } {
  const [activeIndex, setActiveIndex] = useState(-1);

  const anchor = useRef({ position: Math.max(0, currentTime), at: performance.now(), playing: isPlaying });
  const activeRef = useRef(-1);
  const linesRef = useRef(lines);
  const offsetRef = useRef(offsetSec);
  const durationRef = useRef(duration);
  const onFrameRef = useRef<LyricFrame | undefined>(onFrame);
  const propsRef = useRef({ currentTime, isPlaying });

  linesRef.current = lines;
  offsetRef.current = offsetSec;
  durationRef.current = duration;
  onFrameRef.current = onFrame;
  propsRef.current = { currentTime, isPlaying };

  // Re-anchor when the player reports a position, toggles, seeks or changes
  // track. A tiny backwards overshoot from the rAF estimate is ignored so the
  // clock stays monotonic; real seeks (usually larger jumps) pass straight
  // through. A new track always resets to the intro state.
  useEffect(() => {
    const now = performance.now();
    const previous = anchor.current;
    const elapsed = previous.playing ? Math.max(0, (now - previous.at) / 1000) : 0;
    const estimate = previous.position + elapsed;
    const reported = Math.max(0, currentTime);
    const tinyBackwardJitter = isPlaying
      && previous.playing
      && reported < estimate
      && estimate - reported < MAX_BACKWARD_JITTER;

    anchor.current = tinyBackwardJitter
      ? { position: estimate, at: now, playing: true }
      : { position: reported, at: now, playing: isPlaying };
  }, [currentTime, isPlaying, offsetSec, resetKey]);

  useEffect(() => {
    activeRef.current = -1;
    setActiveIndex(-1);
    anchor.current = {
      position: Math.max(0, currentTime),
      at: performance.now(),
      playing: isPlaying,
    };
    // `currentTime` and `isPlaying` are intentionally read once for the reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    let frame = 0;

    const tick = () => {
      frame = 0;
      if (typeof document !== 'undefined' && document.hidden) return;

      const a = anchor.current;
      const now = performance.now();
      const elapsed = a.playing ? Math.max(0, (now - a.at) / 1000) : 0;
      let position = a.position + elapsed;
      const knownDuration = durationRef.current;
      if (Number.isFinite(knownDuration) && knownDuration > 0) {
        position = Math.min(position, knownDuration);
      }
      position = Math.max(0, position);

      const syncTime = position - offsetRef.current + LATENCY_OFFSET_MS / 1000;
      const linesNow = linesRef.current;
      const nextIndex = activeLineIndex(linesNow, syncTime);

      if (nextIndex !== activeRef.current) {
        activeRef.current = nextIndex;
        setActiveIndex(nextIndex);
      }
      onFrameRef.current?.(position, syncTime, nextIndex);

      frame = requestAnimationFrame(tick);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
        return;
      }
      const { currentTime: position, isPlaying: playing } = propsRef.current;
      anchor.current = { position: Math.max(0, position), at: performance.now(), playing };
      schedule();
    };

    document.addEventListener('visibilitychange', onVisibility);
    schedule();

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const resync = useCallback(() => {
    const { currentTime: position, isPlaying: playing } = propsRef.current;
    anchor.current = { position: Math.max(0, position), at: performance.now(), playing };
  }, []);

  return { activeIndex, resync };
}
