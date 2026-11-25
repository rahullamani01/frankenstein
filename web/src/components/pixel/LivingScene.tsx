import { useEffect, useRef } from 'react';
import forest from '../../assets/listening-rooms/forest-desk.webp';
import nightDesk from '../../assets/listening-rooms/night-workstation.jpg';
import mascot from '../../assets/listening-rooms/screen-mascot.png';
import vapour from '../../assets/listening-rooms/coffee-vapour.png';
import shoulder from '../../assets/listening-rooms/sleeping-shoulder.webp';
import './listening-rooms.css';

function ForestDesk() {
  return <svg className="desk-plate desk-day" viewBox="0 0 1200 1200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <image href={forest} width="1200" height="1200" />
    <image className="desk-mascot" href={mascot} x="826" y="450" width="141" height="138" />
    <image className="desk-steam" href={vapour} x="510" y="241" width="103" height="171" />
    {/* Tiny monochrome game landscape, projected onto just the handheld LCD. */}
    <g transform="matrix(1.02,-.34,.30,.96,285,551)" fill="#536338" opacity=".78">
      <path d="M4 64h113v2H4z M14 64v-6h4v-5h4v5h4v6z M82 64v-4h5v-6h4v6h5v4z" />
      <g className="desk-game"><path d="M0 51h5v2h4v7H7v3H5v-3H2v3H0v-5h-2v-4h2z" /><path fill="#afbb78" d="M5 54h2v2H5z" /></g>
      <path d="M8 11h5v-2h7v2h4v2H8z M74 19h5v-2h7v2h4v2H74z" opacity=".55" />
    </g>
  </svg>;
}

function SleepingDesk() {
  return <svg className="desk-plate desk-night" viewBox="0 0 736 585" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <image href={nightDesk} width="736" height="585" />
    <image className="desk-breath" href={shoulder} x="260" y="300" width="330" height="245" />
    {/* Cursor follows the CRT's perspective; the original phosphor text stays sharp. */}
    <path className="desk-cursor" d="m226 101 4-.6 .2 1.6-4 .6z" fill="#abd7a2" />
    <g transform="matrix(.96,0,0,.96,383,76)" fill="#88e7bb">
      <path className="desk-signal" d="M4 4h22v2H4z M31 4h9v2h-9z" />
    </g>
    <g transform="matrix(.85,.19,-.18,.86,604,90)" fill="#7fab75">
      <path className="desk-terminal" d="M5 62h24v1H5z M32 62h6v1h-6z M5 67h14v1H5z M22 67h8v1h-8z" />
    </g>
    <ellipse cx="121" cy="413" rx="43" ry="13" fill="#554435" opacity=".67" />
    <g fill="none" stroke="#e9e6ce" strokeLinecap="round">
      <path className="desk-wisp" d="M119 405c-8-9 11-13 5-23s-9-11-4-18" strokeWidth="2.1" />
      <path className="desk-wisp desk-wisp-alt" d="M132 404c6-7-6-13-3-19s10-11 6-17" strokeWidth="1.4" />
    </g>
  </svg>;
}

export function LivingScene({ night = false, className = '', label }: {
  night?: boolean; className?: string; label?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false, raf = 0, x = 0, y = 0;
    const sync = () => {
      el.dataset.running = String(visible && !document.hidden && !reduce.matches);
      if (el.dataset.running !== 'true') {
        cancelAnimationFrame(raf); raf = 0;
        el.style.removeProperty('--desk-x'); el.style.removeProperty('--desk-y');
      }
    };
    const update = () => {
      raf = 0;
      el.style.setProperty('--desk-x', `${x.toFixed(2)}px`);
      el.style.setProperty('--desk-y', `${y.toFixed(2)}px`);
    };
    const move = (e: PointerEvent) => {
      if (el.dataset.running !== 'true' || e.pointerType === 'touch') return;
      x = (e.clientX / innerWidth - .5) * 5; y = (e.clientY / innerHeight - .5) * 4;
      if (!raf) raf = requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(el);
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('visibilitychange', sync); reduce.addEventListener('change', sync);
    return () => {
      observer.disconnect(); cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      document.removeEventListener('visibilitychange', sync); reduce.removeEventListener('change', sync);
    };
  }, []);
  return <div ref={root} className={`living-scene desk-room ${className}`} data-night={night}
    role={label ? 'img' : undefined} aria-label={label} aria-hidden={!label || undefined}>
    <div className="desk-camera"><ForestDesk /><SleepingDesk /></div>
  </div>;
}
