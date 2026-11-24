/**
 * Tiny deterministic helpers for the pixel gallery theme.
 * Every song/album gets its own stable little world and artwork palette,
 * derived from its id so the gallery never shuffles between visits.
 */

export function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export type SceneKind = 'meadow' | 'tide' | 'lantern' | 'grove' | 'peak' | 'garden';

export const SCENE_KINDS: SceneKind[] = [
  'meadow',
  'tide',
  'lantern',
  'grove',
  'peak',
  'garden',
];

export function sceneFor(seed: string, salt = 0): SceneKind {
  const index = (hashString(`${seed}:scene:${salt}`) + salt) % SCENE_KINDS.length;
  return SCENE_KINDS[index];
}

export type FrameTone = 'oak' | 'sage' | 'lilac' | 'peach';

export const FRAME_TONES: FrameTone[] = ['oak', 'sage', 'lilac', 'peach'];

export function frameToneFor(seed: string): FrameTone {
  return FRAME_TONES[hashString(`${seed}:frame`) % FRAME_TONES.length];
}

/** Curated pastel cover palettes used when a track has no embedded artwork. */
export const COVER_PALETTES = [
  { sky: '#d8ecef', glow: '#f6e7b4', far: '#b7cfd4', mid: '#9dbfb3', near: '#a9c98e', ink: '#385446' },
  { sky: '#f4e3d3', glow: '#f7cfae', far: '#e5bfae', mid: '#c9b0b8', near: '#a8b898', ink: '#4c4038' },
  { sky: '#e2dff0', glow: '#f2ddb6', far: '#c3bfdc', mid: '#a8b6cc', near: '#9dbba7', ink: '#3d4159' },
  { sky: '#e6efdc', glow: '#f6efc0', far: '#c6d6bb', mid: '#a9c39f', near: '#8fb18a', ink: '#354a3a' },
  { sky: '#dceaf3', glow: '#fbe7c2', far: '#b9cad9', mid: '#a9bcc9', near: '#c3cf9f', ink: '#364a52' },
] as const;
