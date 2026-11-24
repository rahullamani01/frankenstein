import { useEffect, useRef } from 'react';
import { hashString, mulberry32, SceneKind } from '../../theme/pixel';
import { dayPhase, sceneResolution, smoothstep } from '../../theme/atmosphere';

interface LivingSceneProps {
  seed?: string;
  variant?: SceneKind;
  night?: boolean;
  playing?: boolean;
  notes?: boolean;
  interactive?: boolean;
  className?: string;
  label?: string;
}

/**
 * Resolution-independent atmosphere. Theme changes interpolate in the existing
 * scene, so the stars, camera and landscape never jump or remount.
 */
export function LivingScene({
  seed = 'gallery', variant = 'meadow', night = false, interactive = true,
  className = '', label = 'A living landscape',
}: LivingSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const nightRef = useRef(night);
  const redrawRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    nightRef.current = night;
    redrawRef.current?.();
  }, [night]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !wrap || !ctx) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = media.matches;
    const random = mulberry32(hashString(`${seed}:${variant}:atmosphere`));
    const stars = Array.from({ length: 420 }, () => ({
      x: random(), y: random() * 0.82, size: 0.35 + random() * 1.1,
      phase: random() * Math.PI * 2, depth: 0.3 + random() * 0.7,
    }));
    const dust = Array.from({ length: 600 }, () => {
      const x = random();
      return { x, y: 0.6 - x * 0.43 + (random() + random() + random() - 1.5) * 0.12, a: random() };
    });
    const clouds = Array.from({ length: 5 }, (_, i) => ({
      x: random(), y: 0.13 + i * 0.07, scale: 0.6 + random() * 0.7, speed: 0.002 + random() * 0.002,
    }));
    const particles = Array.from({ length: 18 }, () => ({
      x: random(), y: 0.35 + random() * 0.6, phase: random() * 6.28,
    }));
    const nebula = document.createElement('canvas');
    nebula.width = 1024;
    nebula.height = 512;
    const nebulaContext = nebula.getContext('2d');
    if (nebulaContext) {
      for (let i = 0; i < 12; i++) {
        const x = i * 92 - 30;
        const y = 330 - i * 22;
        const radius = 100 + random() * 70;
        const glow = nebulaContext.createRadialGradient(x, y, 0, x, y, radius);
        glow.addColorStop(0, i % 3 ? 'rgba(92, 101, 184, .22)' : 'rgba(156, 100, 172, .2)');
        glow.addColorStop(1, 'rgba(40, 55, 95, 0)');
        nebulaContext.fillStyle = glow;
        nebulaContext.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
    }
    let width = 1, height = 1, ratio = 1;
    let frame = 0, visible = true, disposed = false;
    let previousTime = 0, time = 0, mix = nightRef.current ? 1 : 0;
    let target = mix, from = mix, transition = 1;
    let px = 0, py = 0, tx = 0, ty = 0;
    let bounds = wrap.getBoundingClientRect();

    const circle = (x: number, y: number, radius: number, color: string) => {
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    };
    const landscape = (base: number, amplitude: number, phase: number, color: string) => {
      const step = 4; // Subtle stepped silhouettes preserve the gallery's pixel-art roots.
      ctx.beginPath();
      ctx.moveTo(0, height);
      let lastY = height * base;
      for (let x = 0; x <= width + step; x += step) {
        const n = x / width;
        const y = Math.round((height * base + Math.sin(n * 6.3 + phase) * height * amplitude
          + Math.sin(n * 13 + phase * 0.7) * height * amplitude * 0.32) / 2) * 2;
        ctx.lineTo(x, lastY); ctx.lineTo(x, y); lastY = y;
      }
      ctx.lineTo(width, height); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    };
    const draw = () => {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.globalAlpha = 1;
      const phase = dayPhase(new Date().getHours());
      const warm = phase === 'golden hour';
      const sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, warm ? '#d9d9ed' : '#c9e2ed');
      sky.addColorStop(0.65, warm ? '#f4ddcc' : '#e9f1e9');
      sky.addColorStop(1, '#f4eee1');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
      const nightSky = ctx.createLinearGradient(0, 0, 0, height);
      nightSky.addColorStop(0, '#080f22');
      nightSky.addColorStop(0.56, '#172540');
      nightSky.addColorStop(1, '#35445a');
      ctx.globalAlpha = mix;
      ctx.fillStyle = nightSky; ctx.fillRect(0, 0, width, height);
      if (mix > 0.002) {
        ctx.save();
        ctx.globalAlpha = mix * 0.9;
        ctx.drawImage(nebula, -width * 0.08 + Math.sin(time * 0.018) * width * 0.025 + px * 8,
          -height * 0.12 + py * 5, width * 1.2, height);
        for (const p of dust) {
          const x = (p.x * width + time * 0.35 + px * 8) % width;
          const y = p.y * height + Math.sin(time * 0.035 + p.x * 4) * 4;
          ctx.globalAlpha = mix * p.a * 0.38;
          circle(x, y, 0.45, '#bcc8ee');
        }
        for (const star of stars) {
          const x = (star.x * width + time * star.depth * 0.6 + px * star.depth * 9) % width;
          const y = star.y * height + py * star.depth * 5;
          const alpha = (0.5 + Math.sin(time * 0.55 + star.phase) * 0.2) * star.depth;
          ctx.globalAlpha = mix * alpha;
          circle(x, y, star.size, star.phase > 3 ? '#e9e8fa' : '#c6d6ef');
          if (star.size > 1.32) {
            ctx.globalAlpha = mix * alpha * 0.3;
            ctx.fillStyle = '#d7e2ff';
            ctx.fillRect(x - 3, y - 0.35, 6, 0.7);
            ctx.fillRect(x - 0.35, y - 3, 0.7, 6);
          }
        }
        const meteor = (time + 6) % 19;
        if (!reduced && meteor < 0.85) {
          const x = width * 0.43 + meteor * width * 0.31;
          const y = height * 0.08 + meteor * height * 0.28;
          const trail = ctx.createLinearGradient(x - 70, y - 25, x, y);
          trail.addColorStop(0, 'rgba(220,230,255,0)');
          trail.addColorStop(1, 'rgba(220,230,255,.8)');
          ctx.globalAlpha = mix * Math.sin(meteor / 0.85 * Math.PI) * 0.8;
          ctx.strokeStyle = trail; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x - 70, y - 25); ctx.lineTo(x, y); ctx.stroke();
        }
        ctx.restore();
      }
      const orbX = width * 0.77 + px * 4;
      const orbY = height * 0.25;
      ctx.globalAlpha = 1 - mix;
      const sunGlow = ctx.createRadialGradient(orbX, orbY, 2, orbX, orbY, height * 0.28);
      sunGlow.addColorStop(0, 'rgba(255,247,212,.75)');
      sunGlow.addColorStop(1, 'rgba(255,247,212,0)');
      ctx.fillStyle = sunGlow; ctx.fillRect(0, 0, width, height);
      circle(orbX, orbY + mix * height * 0.18, Math.max(12, height * 0.043), '#fff4ce');
      for (const cloud of clouds) {
        const x = ((cloud.x + time * cloud.speed) % 1.3 - 0.15) * width;
        const y = cloud.y * height + Math.sin(time * 0.12 + cloud.x) * 3;
        ctx.globalAlpha = (1 - mix) * 0.6;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(x, y, 54 * cloud.scale, 8 * cloud.scale, 0, 0, Math.PI * 2);
        ctx.ellipse(x - 15 * cloud.scale, y - 6, 25 * cloud.scale, 12 * cloud.scale, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = mix;
      const moonY = orbY + (1 - mix) * height * 0.18;
      const moonGlow = ctx.createRadialGradient(orbX, moonY, 1, orbX, moonY, height * 0.18);
      moonGlow.addColorStop(0, 'rgba(199,214,250,.14)');
      moonGlow.addColorStop(1, 'rgba(199,214,250,0)');
      ctx.fillStyle = moonGlow; ctx.fillRect(0, 0, width, height);
      const moonRadius = Math.max(9, height * 0.033);
      circle(orbX, moonY, moonRadius, '#e4e7f0');
      circle(orbX - moonRadius * 0.25, moonY + moonRadius * 0.16, moonRadius * 0.23, '#d2d8e6');
      circle(orbX + moonRadius * 0.25, moonY - moonRadius * 0.3, moonRadius * 0.14, '#d6dce8');
      ctx.globalAlpha = 1;
      const mountain = variant === 'peak' ? 0.13 : 0.055;
      const layers: [number, number, number, string, string][] = [
        [0.72, mountain, 0.8, '#c0d4d8', '#263750'],
        [0.8, 0.05, 3.6, '#a5c4b7', '#1c3044'],
        [0.91, 0.035, 1.7, '#8daf9c', '#122838'],
      ];
      for (const [base, amplitude, phaseOffset, day, dark] of layers) {
        landscape(base, amplitude, phaseOffset, day);
        ctx.globalAlpha = mix;
        landscape(base, amplitude, phaseOffset, dark);
        ctx.globalAlpha = 1;
      }
      if (variant === 'tide' || variant === 'grove') {
        ctx.globalAlpha = 1 - mix;
        ctx.fillStyle = '#bddbdc'; ctx.fillRect(0, height * 0.82, width, height * 0.18);
        ctx.globalAlpha = mix;
        ctx.fillStyle = '#182f48'; ctx.fillRect(0, height * 0.82, width, height * 0.18);
        for (let i = 0; i < 18; i++) {
          ctx.globalAlpha = 0.17;
          const x = ((i * 0.068 + time * 0.002) % 1) * width;
          ctx.fillStyle = mix > 0.5 ? '#b9cde9' : '#f5fbf8';
          ctx.fillRect(x, height * (0.84 + (i % 5) * 0.03), 10 + i % 4 * 8, 1);
        }
      }
      // A few small foreground lights/pollen motes — no confetti or floating text.
      for (const p of particles) {
        ctx.globalAlpha = (0.1 + mix * 0.35) * (0.6 + Math.sin(time * 0.5 + p.phase) * 0.35);
        const x = p.x * width + Math.sin(time * 0.17 + p.phase) * 12;
        const y = p.y * height + Math.cos(time * 0.21 + p.phase) * 8;
        circle(x, y, mix > 0.5 ? 1 : 0.8, mix > 0.5 ? '#f1dfb8' : '#fffaf1');
      }
      ctx.globalAlpha = 1;
    };
    const render = (now: number) => {
      frame = 0;
      if (disposed || !visible || document.hidden) return;
      const dt = Math.min(0.05, previousTime ? (now - previousTime) / 1000 : 0.016);
      previousTime = now;
      const wanted = nightRef.current ? 1 : 0;
      if (wanted !== target) { from = mix; target = wanted; transition = 0; }
      transition = reduced ? 1 : Math.min(1, transition + dt / 1.6);
      mix = from + (target - from) * smoothstep(transition);
      if (!reduced) {
        time += dt;
        px += (tx - px) * Math.min(1, dt * 2.5);
        py += (ty - py) * Math.min(1, dt * 2.5);
      }
      draw();
      if (!reduced) frame = requestAnimationFrame(render);
    };
    const start = () => {
      if (!disposed && !frame && visible && !document.hidden) {
        previousTime = 0;
        frame = requestAnimationFrame(render);
      }
    };
    const resize = () => {
      bounds = wrap.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      const resolution = sceneResolution(width, height, window.devicePixelRatio || 1);
      ratio = resolution.ratio;
      canvas.width = resolution.width;
      canvas.height = resolution.height;
      draw();
      start();
    };
    const pointer = (event: PointerEvent) => {
      if (!interactive || reduced || event.pointerType === 'touch') return;
      tx = (event.clientX - bounds.left) / width - 0.5;
      ty = (event.clientY - bounds.top) / height - 0.5;
    };
    const leave = () => { tx = 0; ty = 0; };
    const visibility = () => {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
      else start();
    };
    const motion = () => { reduced = media.matches; start(); };
    const observer = new ResizeObserver(resize);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) start();
      else { cancelAnimationFrame(frame); frame = 0; }
    }, { rootMargin: '50px' });
    resize();
    observer.observe(wrap);
    intersection.observe(wrap);
    wrap.addEventListener('pointermove', pointer);
    wrap.addEventListener('pointerleave', leave);
    document.addEventListener('visibilitychange', visibility);
    media.addEventListener('change', motion);
    redrawRef.current = start;
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      wrap.removeEventListener('pointermove', pointer);
      wrap.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', visibility);
      media.removeEventListener('change', motion);
      redrawRef.current = null;
    };
  }, [seed, variant, interactive]);

  return (
    <div ref={wrapRef} className={`living-scene ${className}`} data-night={night}>
      <canvas ref={canvasRef} className="living-scene-canvas" role="img" aria-label={label} />
    </div>
  );
}
