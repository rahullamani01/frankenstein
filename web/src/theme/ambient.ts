import { COVER_PALETTES, clamp, hashString } from './pixel';

export interface AmbientPalette {
  /** Dominant artwork colour. */
  a: string;
  /** Colour from the opposite side of the wheel. */
  b: string;
  /** A softer neighbouring tone. */
  c: string;
}

const paletteCache = new Map<string, AmbientPalette>();
const pending = new Map<string, Promise<AmbientPalette>>();

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (bn > gn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h * 360, s, l];
}

export function hslToCss(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  return `hsl(${hue.toFixed(1)} ${(clamp(s, 0, 1) * 100).toFixed(1)}% ${(clamp(l, 0, 1) * 100).toFixed(1)}%)`;
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}

/** Pastel ambient colours derived from one of the cover palettes. */
export function paletteFromSeed(seed: string): AmbientPalette {
  const key = `seed:${seed}`;
  const cached = paletteCache.get(key);
  if (cached) return cached;
  const palette = COVER_PALETTES[hashString(`${seed}:ambient`) % COVER_PALETTES.length];
  const [h, s, l] = rgbToHsl(...hexToRgb(palette.sky));
  const result = buildPalette(h, s, l);
  paletteCache.set(key, result);
  return result;
}

/** Turn a representative pixel colour into three soft, contrast-safe tones. */
export function buildPalette(h: number, s: number, l: number): AmbientPalette {
  return {
    a: hslToCss(h, clamp(s + 0.12, 0.3, 0.62), clamp(l * 0.5 + 0.34, 0.56, 0.78)),
    b: hslToCss(h + 148, clamp(s + 0.06, 0.24, 0.52), clamp(l * 0.35 + 0.48, 0.64, 0.82)),
    c: hslToCss(h + 28, clamp(s * 0.9 + 0.08, 0.22, 0.46), clamp(l + 0.16, 0.7, 0.86)),
  };
}

/**
 * Quantises a small pixel sample and picks the colour carrying the most
 * visual weight. Near-white and near-black pixels are ignored so a dark
 * vignette or a bright border cannot hijack the whole room.
 */
export function paletteFromPixels(pixels: Array<[number, number, number]>): AmbientPalette | null {
  if (pixels.length === 0) return null;
  const buckets = new Map<number, { count: number; r: number; g: number; b: number; score: number }>();
  for (const [r, g, b] of pixels) {
    const [, s, l] = rgbToHsl(r, g, b);
    if (l > 0.94 || l < 0.06) continue;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0, score: 0 };
    bucket.count += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.score += 0.3 + s;
    buckets.set(key, bucket);
  }
  let best: { count: number; r: number; g: number; b: number; score: number } | null = null;
  for (const bucket of buckets.values()) {
    if (!best || bucket.score > best.score) best = bucket;
  }
  if (!best) return null;
  const [h, s, l] = rgbToHsl(best.r / best.count, best.g / best.count, best.b / best.count);
  return buildPalette(h, s, l);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    const timer = window.setTimeout(() => reject(new Error('Artwork timed out')), 5000);
    image.onload = () => {
      window.clearTimeout(timer);
      resolve(image);
    };
    image.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('Artwork unavailable'));
    };
    image.src = src;
  });
}

/**
 * Reads a tiny sample of the artwork on a canvas. Cross-origin artwork that
 * does not grant CORS is caught (a tainted canvas throws) and the deterministic
 * pastel palette stands in, so there is never a blank or flickering room.
 */
export async function loadAmbientPalette(src: string | undefined, seed: string): Promise<AmbientPalette> {
  const fallback = paletteFromSeed(seed);
  if (!src || typeof document === 'undefined') return fallback;
  const key = `src:${src}`;
  const cached = paletteCache.get(key);
  if (cached) return cached;
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const task = (async () => {
    try {
      const image = await loadImage(src);
      const size = 24;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return fallback;
      ctx.drawImage(image, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      const pixels: Array<[number, number, number]> = [];
      for (let i = 0; i < data.length; i += 16) {
        if (data[i + 3] < 128) continue;
        pixels.push([data[i], data[i + 1], data[i + 2]]);
      }
      return paletteFromPixels(pixels) ?? fallback;
    } catch {
      return fallback;
    } finally {
      pending.delete(key);
    }
  })();
  pending.set(key, task);
  const result = await task;
  paletteCache.set(key, result);
  return result;
}
