/**
 * One place for every duration, curve and spring in the gallery.
 *
 * The values are also installed as CSS custom properties by
 * `installMotionTokens()` so JavaScript-driven motion (the shared artwork
 * flight, drag gestures) and CSS transitions settle with the same rhythm.
 */

const softDamping = 2 * Math.sqrt(240 * 0.9);

export const MOTION = {
  duration: {
    /** Button press feedback. */
    press: 140,
    /** Small interface transitions. */
    small: 220,
    /** Screen-to-screen movement. */
    nav: 300,
    /** Shared-element artwork travel. */
    shared: 560,
    /** Full player expansion / collapse. */
    player: 580,
    /** Artwork crossfade. */
    artwork: 540,
    /** Ambient colour crossfade. */
    ambient: 2400,
    /** Day ↔ night environment. */
    celestial: 3600,
    /** Sidebar, cards and chrome following a theme change. */
    theme: 900,
  },
  ease: {
    out: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
    in: 'cubic-bezier(0.55, 0.06, 0.68, 0.19)',
    inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
    spring: 'cubic-bezier(0.34, 1.32, 0.64, 1)',
    celestial: 'cubic-bezier(0.33, 0, 0.2, 1)',
  },
  spring: {
    /** Small controls settling back after a press. */
    press: { stiffness: 520, damping: 34, mass: 0.6 },
    /** Critically damped default for interface movement. */
    soft: { stiffness: 240, damping: softDamping, mass: 0.9 },
    /** Slightly underdamped: the artwork lands with a whisper of overshoot. */
    flight: { stiffness: 220, damping: 26, mass: 0.9 },
    /** Drag release. */
    settle: { stiffness: 320, damping: 33, mass: 0.85 },
  },
  /** Suggested pressed scale. */
  pressScale: 0.956,
} as const;

export type SpringConfig = { stiffness: number; damping: number; mass: number };

const CSS_TOKENS: Record<string, string> = {
  '--motion-press': `${MOTION.duration.press}ms`,
  '--motion-small': `${MOTION.duration.small}ms`,
  '--motion-nav': `${MOTION.duration.nav}ms`,
  '--motion-shared': `${MOTION.duration.shared}ms`,
  '--motion-player': `${MOTION.duration.player}ms`,
  '--motion-artwork': `${MOTION.duration.artwork}ms`,
  '--motion-ambient': `${MOTION.duration.ambient}ms`,
  '--motion-celestial': `${MOTION.duration.celestial}ms`,
  '--motion-theme': `${MOTION.duration.theme}ms`,
  '--ease-out': MOTION.ease.out,
  '--ease-in': MOTION.ease.in,
  '--ease-in-out': MOTION.ease.inOut,
  '--ease-spring': MOTION.ease.spring,
  '--ease-celestial': MOTION.ease.celestial,
  '--press-scale': String(MOTION.pressScale),
};

let installed = false;

/** Mirror the tokens into CSS custom properties once, before first paint. */
export function installMotionTokens() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const root = document.documentElement;
  for (const [name, value] of Object.entries(CSS_TOKENS)) root.style.setProperty(name, value);
}

/** Damping ratio: 1 is critical, below 1 overshoots. Used by tests/tuning. */
export function dampingRatio(spring: SpringConfig) {
  return spring.damping / (2 * Math.sqrt(spring.stiffness * spring.mass));
}
