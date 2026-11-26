import { useEffect, useState } from 'react';

/** Diagnostic overlay; Shift+F toggles it only in local development. */
export function DevFpsMeter() {
  const [open, setOpen] = useState(false);
  const [fps, setFps] = useState(0);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.shiftKey && event.key.toLowerCase() === 'f' &&
        !(event.target instanceof HTMLInputElement)) setOpen((value) => !value);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (!open) return;
    let frame = 0;
    let count = 0;
    let start = performance.now();
    const tick = (time: number) => {
      if (document.hidden) { start = time; count = 0; }
      else if (time - start >= 1000) {
        setFps(Math.round(count * 1000 / (time - start)));
        start = time;
        count = 0;
      } else count += 1;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [open]);
  return open ? <output className="glass-fps" aria-label="Frames per second">{fps} fps</output> : null;
}
