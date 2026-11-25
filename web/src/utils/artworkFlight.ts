import { animate, type AnimationPlaybackControls } from 'motion';
import { MOTION } from '../theme/motion';

export interface ArtworkRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ArtworkSource {
  node: HTMLElement;
  rect: ArtworkRect;
  radius: string;
}

function rectOf(rect: DOMRect | ArtworkRect): ArtworkRect {
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

function cloneArtwork(media: Element | null): HTMLElement | null {
  if (media instanceof HTMLCanvasElement) {
    const clone = document.createElement('canvas');
    clone.width = media.width;
    clone.height = media.height;
    const ctx = clone.getContext('2d');
    if (!ctx) return null;
    try {
      ctx.drawImage(media, 0, 0);
    } catch {
      return null;
    }
    return clone;
  }
  if (media instanceof HTMLImageElement) {
    const clone = document.createElement('img');
    clone.src = media.currentSrc || media.src;
    clone.alt = '';
    clone.decoding = 'async';
    return clone;
  }
  return null;
}

/** Take a bitmap snapshot before the source screen unmounts. */
export function captureArtwork(source: Element | null): ArtworkSource | null {
  if (!source) return null;
  const media = source.matches('canvas, img')
    ? source
    : Array.from(source.querySelectorAll('canvas, img')).pop() ?? null;
  if (!media) return null;
  const rect = media.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return null;
  const node = cloneArtwork(media);
  if (!node) return null;
  return {
    node,
    rect: rectOf(rect),
    radius: getComputedStyle(media).borderRadius || '0px',
  };
}

export interface FlightHandle {
  readonly element: HTMLElement;
  retarget(target: DOMRect | ArtworkRect, onDone?: () => void): void;
  cancel(): void;
}

let active: FlightHandle | null = null;

/** Cancel any flight that is still travelling (used on teardown). */
export function cancelArtworkFlight() {
  active?.cancel();
  active = null;
}

const FLIGHT_SPRING = {
  type: 'spring' as const,
  // visualDuration keeps the bulk of the travel inside the 400–600ms window;
  // the small bounce gives the landing its weight.
  visualDuration: MOTION.duration.shared / 1000,
  bounce: 0.14,
};

/**
 * FLIP-style shared artwork. The clone is laid out at the destination and
 * scaled/translated back to the source, then released with a spring. Every
 * frame only touches transform, so the browser can keep it on the compositor.
 */
export function startArtworkFlight(
  source: ArtworkSource,
  target: DOMRect | ArtworkRect,
  onDone?: () => void,
): FlightHandle | null {
  if (typeof document === 'undefined') return null;
  const to = rectOf(target);
  if (to.width < 1 || to.height < 1) return null;

  cancelArtworkFlight();

  const layer = document.createElement('div');
  layer.className = 'art-flight';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.left = `${to.left}px`;
  layer.style.top = `${to.top}px`;
  layer.style.width = `${to.width}px`;
  layer.style.height = `${to.height}px`;
  layer.style.borderRadius = source.radius;
  layer.style.transformOrigin = '0 0';
  layer.appendChild(source.node);
  document.body.appendChild(layer);

  let controls: AnimationPlaybackControls | null = null;
  let generation = 0;
  let done = onDone;

  const place = (from: ArtworkRect) => {
    const scaleX = from.width / to.width;
    const scaleY = from.height / to.height;
    const x = from.left - to.left;
    const y = from.top - to.top;
    layer.style.transform = `translate(${x}px, ${y}px) scale(${scaleX}, ${scaleY})`;
    const gen = ++generation;
    controls?.stop();
    controls = animate(
      layer,
      { x: [x, 0], y: [y, 0], scaleX: [scaleX, 1], scaleY: [scaleY, 1] },
      FLIGHT_SPRING,
    );
    const settle = () => {
      if (gen !== generation) return;
      const callback = done;
      done = undefined;
      controls = null;
      layer.remove();
      if (active?.element === layer) active = null;
      callback?.();
    };
    void controls.finished.then(settle).catch(() => {});
  };

  const handle: FlightHandle = {
    element: layer,
    retarget(nextTarget, nextDone) {
      if (!layer.isConnected) return;
      const visual = layer.getBoundingClientRect();
      controls?.stop();
      const next = rectOf(nextTarget);
      if (next.width < 1 || next.height < 1) return;
      layer.style.left = `${next.left}px`;
      layer.style.top = `${next.top}px`;
      layer.style.width = `${next.width}px`;
      layer.style.height = `${next.height}px`;
      if (nextDone) done = nextDone;
      // Re-base the clone at the new destination and animate from the
      // rect it currently occupies back to identity.
      to.left = next.left;
      to.top = next.top;
      to.width = next.width;
      to.height = next.height;
      place(rectOf(visual));
    },
    cancel() {
      generation += 1;
      controls?.stop();
      controls = null;
      layer.remove();
      if (active === handle) active = null;
      const callback = done;
      done = undefined;
      callback?.();
    },
  };

  active = handle;
  place(source.rect);
  return handle;
}
