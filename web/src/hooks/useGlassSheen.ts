import { useEffect, useRef } from 'react';

/** Read geometry once on entry; pointer moves only schedule a style write. */
export function useGlassSheen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const bounds = useRef<DOMRect | null>(null);
  const frame = useRef(0);
  const point = useRef({ x: 50, y: 0 });
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return {
    ref,
    onPointerEnter: () => { bounds.current = ref.current?.getBoundingClientRect() || null; },
    onPointerMove: (event: { clientX: number; clientY: number }) => {
      const rect = bounds.current;
      if (!rect) return;
      point.current = {
        x: Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)),
        y: Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)),
      };
      if (frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        ref.current?.style.setProperty('--sheen-x', `${point.current.x}%`);
        ref.current?.style.setProperty('--sheen-y', `${point.current.y}%`);
        ref.current?.style.setProperty('--parallax-x', `${(point.current.x - 50) * .06}deg`);
        ref.current?.style.setProperty('--parallax-y', `${(50 - point.current.y) * .05}deg`);
      });
    },
    onPointerLeave: () => {
      bounds.current = null;
      ref.current?.style.removeProperty('--sheen-x');
      ref.current?.style.removeProperty('--sheen-y');
      ref.current?.style.removeProperty('--parallax-x');
      ref.current?.style.removeProperty('--parallax-y');
    },
  };
}
