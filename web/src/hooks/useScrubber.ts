import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

interface ScrubHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onLostPointerCapture: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

/**
 * The fill follows the pointer locally so dragging never waits on a React
 * round-trip; the actual seek is committed on release.
 */
export function useScrubber(duration: number, onSeek: (time: number) => void) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const ratioRef = useRef<number | null>(null);
  const [dragRatio, setDragRatio] = useState<number | null>(null);

  const ratioAt = useCallback((clientX: number) => {
    const bar = barRef.current;
    if (!bar) return null;
    const rect = bar.getBoundingClientRect();
    if (rect.width <= 0) return null;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const update = useCallback((clientX: number) => {
    const ratio = ratioAt(clientX);
    if (ratio == null) return;
    ratioRef.current = ratio;
    setDragRatio(ratio);
  }, [ratioAt]);

  const reset = useCallback(() => {
    dragging.current = false;
    ratioRef.current = null;
    setDragRatio(null);
  }, []);

  const commit = useCallback(() => {
    if (!dragging.current) return;
    const ratio = ratioRef.current;
    reset();
    if (ratio != null && duration > 0) onSeek(ratio * duration);
  }, [duration, onSeek, reset]);

  const handlers: ScrubHandlers = {
    onPointerDown: (event) => {
      if (duration <= 0) return;
      event.preventDefault();
      event.currentTarget.focus({ preventScroll: true });
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // A mouse can still drag via pointermove.
      }
      dragging.current = true;
      update(event.clientX);
    },
    onPointerMove: (event) => {
      if (!dragging.current) return;
      update(event.clientX);
    },
    onPointerUp: commit,
    onPointerCancel: reset,
    onLostPointerCapture: commit,
  };

  return { barRef, dragRatio, isDragging: dragRatio != null, handlers };
}
