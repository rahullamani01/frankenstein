import { useEffect, useRef } from 'react';
import type { SceneKind } from '../../theme/pixel';
import { sceneResolution, smoothstep } from '../../theme/atmosphere';
import { createCityscape } from '../../theme/cityscape';

interface Props {
  seed?: string; variant?: SceneKind; night?: boolean; interactive?: boolean;
  className?: string; label?: string;
}

export function CityScene({ seed = 'gallery', variant, night = false, interactive = true,
  className = '', label }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const mode = useRef(night);
  const wake = useRef<() => void>(undefined);
  useEffect(() => { mode.current = night; wake.current?.(); }, [night]);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d', { alpha: false });
    if (!el || !ctx) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const saver = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    let raf = 0, timer = 0, visible = false, tick = 0, t = 0;
    let mix = Number(mode.current), target = mix, from = mix, progress = 1;
    let px = 0, py = 0, tx = 0, ty = 0;
    let paint: ReturnType<typeof createCityscape> | undefined;
    const stop = () => {
      cancelAnimationFrame(raf); window.clearTimeout(timer);
      raf = timer = tick = 0;
    };
    const schedule = () => {
      if (!raf && !timer && visible && !document.hidden) raf = requestAnimationFrame(render);
    };
    function render(now: number) {
      raf = 0;
      if (!visible || document.hidden || !paint) return;
      const dt = tick ? Math.min(.15, (now - tick) / 1000) : 0;
      tick = now;
      if (target !== Number(mode.current)) {
        target = Number(mode.current); from = mix; progress = 0;
      }
      progress = motion.matches ? 1 : Math.min(1, progress + dt / 2.4);
      mix = from + (target - from) * smoothstep(progress);
      if (!motion.matches) {
        t += dt;
        px += (tx - px) * Math.min(1, dt * 4); py += (ty - py) * Math.min(1, dt * 4);
      } else { px = py = 0; }
      paint(t, mix, px, py);
      if (!motion.matches) {
        // Sleep between frames instead of waking on every display refresh.
        timer = window.setTimeout(() => { timer = 0; schedule(); }, saver ? 66 : progress < 1 ? 17 : 33);
      }
    }
    const resize = () => {
      const { width, height } = sceneResolution(el.clientWidth, el.clientHeight);
      if (!paint || width !== el.width || height !== el.height) {
        el.width = width; el.height = height; ctx.imageSmoothingEnabled = false;
        paint = createCityscape(ctx, width, height, `${seed}:${variant ?? 'city'}`);
      }
      schedule();
    };
    const pointer = (e: PointerEvent) => {
      if (visible && !motion.matches && e.pointerType !== 'touch') {
        tx = e.clientX / innerWidth * 2 - 1; ty = e.clientY / innerHeight * 2 - 1;
      }
    };
    const resetPointer = () => { tx = ty = 0; };
    const visibility = () => document.hidden ? stop() : schedule();
    const ro = new ResizeObserver(resize);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting; if (visible) schedule(); else stop();
    });
    resize(); ro.observe(el); io.observe(el);
    document.addEventListener('visibilitychange', visibility);
    motion.addEventListener('change', schedule);
    if (interactive) {
      window.addEventListener('pointermove', pointer, { passive: true });
      document.documentElement.addEventListener('pointerleave', resetPointer);
    }
    wake.current = schedule;
    return () => {
      wake.current = undefined; stop(); ro.disconnect(); io.disconnect();
      window.removeEventListener('pointermove', pointer);
      document.documentElement.removeEventListener('pointerleave', resetPointer);
      document.removeEventListener('visibilitychange', visibility);
      motion.removeEventListener('change', schedule);
    };
  }, [seed, variant, interactive]);

  return <div className={`living-scene ${className}`} aria-hidden={!label || undefined}>
    <canvas ref={canvas} className="living-scene-canvas" role={label ? 'img' : undefined} aria-label={label} />
  </div>;
}
