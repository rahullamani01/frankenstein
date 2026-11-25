import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  NowPlayingScreen,
  type NowPlayingScreenProps,
} from './screens/NowPlayingScreen';
import {
  cancelArtworkFlight,
  captureArtwork,
  startArtworkFlight,
  type FlightHandle,
} from '../utils/artworkFlight';
import { MOTION } from '../theme/motion';
import { useReducedMotion } from '../hooks/useReducedMotion';

export interface NowPlayingOverlayProps extends NowPlayingScreenProps {
  open: boolean;
}

type Phase = 'closed' | 'opening' | 'open' | 'closing';

interface GestureState {
  active: boolean;
  pointerId: number;
  startY: number;
  y: number;
  lastY: number;
  lastT: number;
  velocity: number;
}

const DISMISS_DISTANCE = 300;

/**
 * The full-screen player is a sheet that shares its artwork with the
 * mini-player. Opening and closing are both the same spring in opposite
 * directions, so an interrupted transition can reverse from wherever it is.
 */
export const NowPlayingOverlay: React.FC<NowPlayingOverlayProps> = ({ open, ...screenProps }) => {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(open);
  const shellRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const flightRef = useRef<FlightHandle | null>(null);
  const phaseRef = useRef<Phase>(open ? 'opening' : 'closed');
  const openFrame = useRef(0);
  const gestureFrame = useRef(0);
  const closeTimer = useRef(0);
  const radiusTimer = useRef(0);
  const wasMounted = useRef(false);
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const onCloseRef = useRef(screenProps.onClose);
  onCloseRef.current = screenProps.onClose;
  const gestureRef = useRef<GestureState | null>(null);
  const dragCleanup = useRef<() => void>(() => {});

  const artTarget = () => shellRef.current?.querySelector<HTMLElement>('#np-art-slot') ?? null;
  const thumbRect = () => document.getElementById('player-thumb-art')?.getBoundingClientRect() ?? null;

  const revealArt = () => {
    if (shellRef.current) shellRef.current.dataset.art = 'false';
    flightRef.current = null;
  };

  const closeNow = useCallback(() => {
    const shell = shellRef.current;
    const inner = innerRef.current;
    if (!shell || !inner) return;
    if (phaseRef.current === 'closing' || phaseRef.current === 'closed') return;
    const wasOpen = phaseRef.current === 'open';
    phaseRef.current = 'closing';
    cancelAnimationFrame(openFrame.current);
    cancelAnimationFrame(gestureFrame.current);
    dragCleanup.current();
    shell.dataset.dragging = 'false';
    // Let the scrim lift and the artwork return to full size while the sheet
    // travels away; both are invisible by the time they would be noticed.
    shell.style.setProperty('--np-drag', '0');

    // Reduced motion: no flight, no sheet travel, just put it away.
    if (reducedRef.current) {
      cancelArtworkFlight();
      flightRef.current = null;
      shell.dataset.art = 'false';
      shell.style.setProperty('--np-drag', '0');
      shell.style.setProperty('--np-art-scale', '1');
      inner.style.transition = '';
      inner.style.transform = '';
      inner.style.opacity = '';
      inner.style.borderRadius = '';
      setMounted(false);
      phaseRef.current = 'closed';
      return;
    }

    const target = artTarget();
    const thumb = thumbRect();
    if (thumb && flightRef.current?.element.isConnected) {
      // Closing before the opening flight has landed: send the same clone
      // back where it came from instead of snapping the artwork.
      flightRef.current.retarget(thumb, revealArt);
    } else if (thumb && target && wasOpen) {
      shell.dataset.art = 'flying';
      const source = captureArtwork(target);
      if (source) {
        flightRef.current = startArtworkFlight(source, thumb, revealArt);
      } else {
        shell.dataset.art = 'false';
      }
    } else {
      cancelArtworkFlight();
      flightRef.current = null;
      shell.dataset.art = 'false';
    }

    const computed = getComputedStyle(inner);
    const startTransform = computed.transform === 'none'
      ? 'translate3d(0, 0, 0) scale(1)'
      : computed.transform;
    inner.style.transition = 'none';
    inner.style.transform = startTransform;
    inner.style.borderRadius = computed.borderRadius;
    void inner.offsetWidth;
    openFrame.current = requestAnimationFrame(() => {
      if (!inner.isConnected) return;
      inner.style.transition = `transform ${MOTION.duration.shared}ms ${MOTION.ease.out}, border-radius ${MOTION.duration.shared}ms ${MOTION.ease.out}`;
      shell.dataset.expanded = 'false';
      inner.style.transform = 'none';
      inner.style.borderRadius = '22px';
    });

    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      flightRef.current?.cancel();
      flightRef.current = null;
      setMounted(false);
      phaseRef.current = 'closed';
      shell.style.setProperty('--np-drag', '0');
      shell.style.setProperty('--np-art-scale', '1');
      const node = innerRef.current;
      if (node) {
        node.style.transition = '';
        node.style.transform = '';
        node.style.opacity = '';
        node.style.borderRadius = '';
      }
    }, reducedRef.current ? 40 : MOTION.duration.shared + 90);
  }, []);

  useEffect(() => {
    if (open) {
      window.clearTimeout(closeTimer.current);
      if (!mounted) setMounted(true);
    } else if (mounted) {
      closeNow();
    }
  }, [open, mounted, closeNow]);

  useLayoutEffect(() => {
    if (!mounted || !open) return;
    const shell = shellRef.current;
    const inner = innerRef.current;
    if (!shell || !inner) return;

    const reopening = phaseRef.current === 'closing';
    phaseRef.current = 'opening';
    window.clearTimeout(closeTimer.current);
    cancelAnimationFrame(openFrame.current);

    if (reducedRef.current) {
      cancelArtworkFlight();
      flightRef.current = null;
      shell.dataset.art = 'false';
      shell.style.setProperty('--np-drag', '0');
      shell.style.setProperty('--np-art-scale', '1');
      inner.style.transition = 'none';
      inner.style.opacity = '1';
      inner.style.transform = 'none';
      inner.style.borderRadius = '';
      phaseRef.current = 'open';
      return;
    }

    if (!reopening) {
      shell.style.setProperty('--np-drag', '0');
      shell.style.setProperty('--np-art-scale', '1');
      inner.style.transition = 'none';
      // The sheet is opaque from the first frame: the artwork clone is what
      // shares the journey with the mini-player, never a ghost of the room.
      inner.style.opacity = '1';
      inner.style.transform = 'none';
      inner.style.borderRadius = '20px';
    }

    let targetRect: DOMRect | null = null;
    const target = artTarget();
    const bar = document.getElementById('app-player-bar');
    if (bar) {
      shell.style.setProperty('--bar-top', `${bar.getBoundingClientRect().top}px`);
      for (const [mini, full, prefix] of [
        ['.player-title', '.np-title', 'title'], ['.player-artist', '.np-meta', 'artist'],
      ]) {
        const from = bar.querySelector(mini)?.getBoundingClientRect();
        const to = inner.querySelector(full)?.getBoundingClientRect();
        if (from && to) {
          shell.style.setProperty(`--${prefix}-x`, `${from.x - to.x}px`);
          shell.style.setProperty(`--${prefix}-y`, `${from.y - to.y}px`);
        }
      }
    }
    if (!reopening) shell.dataset.expanded = 'false';
    if (target) {
      const savedTransform = inner.style.transform;
      inner.style.transform = 'none';
      targetRect = target.getBoundingClientRect();
      inner.style.transform = savedTransform;
    }

    if (flightRef.current && !flightRef.current.element.isConnected) flightRef.current = null;
    const thumb = thumbRect();
    if (!reducedRef.current && targetRect && thumb) {
      shell.dataset.art = 'flying';
      if (flightRef.current) {
        flightRef.current.retarget(targetRect, revealArt);
      } else {
        const source = captureArtwork(document.getElementById('player-thumb-art'));
        if (source) flightRef.current = startArtworkFlight(source, targetRect, revealArt);
      }
      if (!flightRef.current) shell.dataset.art = 'false';
    } else {
      shell.dataset.art = 'false';
    }

    openFrame.current = requestAnimationFrame(() => {
      if (!inner.isConnected) return;
      shell.dataset.expanded = 'true';
      if (reducedRef.current) {
        inner.style.transition = 'none';
        inner.style.opacity = '1';
        inner.style.transform = 'none';
        inner.style.borderRadius = '';
        phaseRef.current = 'open';
        return;
      }
      inner.style.transition = `opacity ${MOTION.duration.small + 160}ms ${MOTION.ease.out}, transform ${MOTION.duration.player}ms ${MOTION.ease.spring}, border-radius ${MOTION.duration.player}ms ${MOTION.ease.out}`;
      inner.style.opacity = '1';
      inner.style.transform = 'none';
      inner.style.borderRadius = '0px';
      phaseRef.current = 'open';
      window.clearTimeout(radiusTimer.current);
      radiusTimer.current = window.setTimeout(() => {
        // Hand the radius back to the drag variable once the sheet is square.
        if (innerRef.current && phaseRef.current === 'open') {
          innerRef.current.style.borderRadius = '';
        }
      }, MOTION.duration.player + 80);
    });
  }, [mounted, open]);

  // A drag that starts on the artwork or the grabber moves the sheet. Content
  // areas keep their native scrolling.
  const applyDrag = (y: number, progress: number) => {
    const inner = innerRef.current;
    const shell = shellRef.current;
    if (!inner || !shell) return;
    const p = Math.max(0, Math.min(1, progress));
    inner.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) scale(${(1 - 0.07 * p).toFixed(4)})`;
    shell.style.setProperty('--np-drag', p.toFixed(3));
    shell.style.setProperty('--np-art-scale', (1 - 0.28 * p).toFixed(3));
  };

  const springBack = (startY: number, startVelocity: number) => {
    const inner = innerRef.current;
    const shell = shellRef.current;
    if (!inner || !shell) return;
    const { stiffness, damping, mass } = MOTION.spring.settle;
    let y = startY;
    let velocity = startVelocity;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.032, Math.max(0.001, (now - last) / 1000));
      last = now;
      const acceleration = (-stiffness * y - damping * velocity) / mass;
      velocity += acceleration * dt;
      y += velocity * dt;
      applyDrag(y, y / DISMISS_DISTANCE);
      if (Math.abs(y) > 0.4 || Math.abs(velocity) > 7) {
        gestureFrame.current = requestAnimationFrame(tick);
      } else {
        inner.style.transition = `transform ${MOTION.duration.small}ms ${MOTION.ease.out}`;
        inner.style.transform = 'none';
        shell.style.setProperty('--np-drag', '0');
        shell.style.setProperty('--np-art-scale', '1');
        window.setTimeout(() => {
          if (phaseRef.current === 'open' && !gestureRef.current?.active) inner.style.transition = '';
        }, MOTION.duration.small + 50);
      }
    };
    gestureFrame.current = requestAnimationFrame(tick);
  };

  const onPointerMove = (event: PointerEvent) => {
    const gesture = gestureRef.current;
    if (!gesture?.active || event.pointerId !== gesture.pointerId) return;
    const raw = event.clientY - gesture.startY;
    const now = performance.now();
    const dt = Math.max(8, now - gesture.lastT);
    gesture.velocity = (event.clientY - gesture.lastY) / dt;
    gesture.lastY = event.clientY;
    gesture.lastT = now;
    // Downward follows the finger; upward gets gentle resistance.
    const y = raw >= 0 ? raw : raw * 0.2;
    gesture.y = y;
    applyDrag(y, y / DISMISS_DISTANCE);
    if (event.cancelable && Math.abs(raw) > 3) event.preventDefault();
  };

  const onPointerUp = (event: PointerEvent) => {
    const gesture = gestureRef.current;
    if (!gesture?.active || event.pointerId !== gesture.pointerId) return;
    gesture.active = false;
    dragCleanup.current();
    const shell = shellRef.current;
    if (shell) shell.dataset.dragging = 'false';
    const progress = gesture.y / DISMISS_DISTANCE;
    const velocity = performance.now() - gesture.lastT > 90 ? 0 : gesture.velocity;
    if (event.type !== 'pointercancel' && (progress > 0.3 || velocity > 0.55)) {
      onCloseRef.current();
    } else {
      springBack(gesture.y, velocity * 1000);
    }
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== 'open' || gestureRef.current?.active || reducedRef.current) return;
    const target = event.target as Element;
    if (target.closest('button, a, input, textarea, select, [role="slider"], .np-info, .lyrics-panel, .np-controls')) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const shell = shellRef.current;
    const inner = innerRef.current;
    if (!shell || !inner) return;
    cancelAnimationFrame(gestureFrame.current);
    gestureRef.current = {
      active: true,
      pointerId: event.pointerId,
      startY: event.clientY,
      y: 0,
      lastY: event.clientY,
      lastT: performance.now(),
      velocity: 0,
    };
    inner.style.transition = 'none';
    shell.dataset.dragging = 'true';
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is a nicety; window listeners still finish the drag.
    }
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    dragCleanup.current = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      const gesture = gestureRef.current;
      if (gesture) gesture.active = false;
    };
  };

  useEffect(() => {
    if (!mounted) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    wasMounted.current = true;
    const timer = window.setTimeout(() => {
      shellRef.current?.focus({ preventScroll: true });
    }, 30);
    return () => window.clearTimeout(timer);
  }, [mounted]);

  useEffect(() => {
    if (mounted || !wasMounted.current) return;
    wasMounted.current = false;
    const thumb = document.getElementById('player-thumb-art');
    thumb?.closest('button')?.focus({ preventScroll: true });
  }, [mounted]);

  useEffect(() => () => {
    window.clearTimeout(closeTimer.current);
    window.clearTimeout(radiusTimer.current);
    cancelAnimationFrame(openFrame.current);
    cancelAnimationFrame(gestureFrame.current);
    dragCleanup.current();
    cancelArtworkFlight();
  }, []);

  if (!mounted) return null;

  return (
    <div
      ref={shellRef}
      className="np-shell"
      role="dialog"
      aria-modal="true"
      aria-label="Now playing"
      tabIndex={-1}
      data-art="false"
      data-dragging="false"
      onPointerDown={onPointerDown}
    >
      <div className="np-scrim" aria-hidden="true" />
      <div ref={innerRef} className="np-shell-inner">
        <div className="np-grabber" aria-hidden="true"><span /></div>
        <NowPlayingScreen {...screenProps} />
      </div>
    </div>
  );
};
