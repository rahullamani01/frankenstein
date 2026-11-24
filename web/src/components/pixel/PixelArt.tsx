import React, { useEffect, useRef } from 'react';
import { COVER_PALETTES, hashString, mulberry32, clamp } from '../../theme/pixel';

export interface PixelArtProps {
  src?: string;
  seed?: string;
  alt?: string;
  className?: string;
  grid?: number;
  eager?: boolean;
  original?: boolean;
}

/**
 * Shows album artwork as a crisp, downsampled pixel canvas.
 * If there is no artwork (or it fails to load) it paints a small
 * deterministic pastel landscape instead — every album still hangs
 * something beautiful on the wall.
 */
export const PixelArt: React.FC<PixelArtProps> = ({
  src,
  seed = 'untitled',
  alt = '',
  className = '',
  grid = 44,
  eager = false,
  original = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = grid;
    canvas.height = grid;
    let cancelled = false;

    const palette = COVER_PALETTES[hashString(`${seed}:palette`) % COVER_PALETTES.length];
    const rand = mulberry32(hashString(`${seed}:cover`));
    const pixels = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    };
    const disc = (cx: number, cy: number, r: number, color: string, checker = false) => {
      ctx.fillStyle = color;
      for (let y = -r; y <= r; y += 1) {
        const half = Math.floor(Math.sqrt(Math.max(0, r * r + r * 0.8 - y * y)));
        if (!checker) {
          ctx.fillRect(cx - half, cy + y, half * 2 + 1, 1);
          continue;
        }
        for (let x = -half; x <= half; x += 1) {
          if ((x + y) & 1) ctx.fillRect(cx + x, cy + y, 1, 1);
        }
      }
    };

    const paintFallback = () => {
      ctx.imageSmoothingEnabled = false;
      pixels(0, 0, grid, grid, palette.sky);

      // a soft dithered horizon
      for (let y = Math.floor(grid * 0.34); y < grid * 0.62; y += 1) {
        for (let x = 0; x < grid; x += 1) {
          if ((x + y) % 2 === 0 && y > grid * 0.38) pixels(x, y, 1, 1, palette.far);
        }
      }

      disc(Math.round(grid * (0.62 + rand() * 0.12)), Math.round(grid * 0.26), Math.max(3, Math.round(grid * 0.11)), palette.glow, true);
      disc(Math.round(grid * (0.62 + rand() * 0.12)), Math.round(grid * 0.26), Math.max(2, Math.round(grid * 0.08)), palette.glow);

      // stepped mountains
      const base = grid * 0.64;
      for (let x = 0; x < grid; x += 1) {
        const y = base - Math.abs(Math.sin(x * 0.24 + rand())) * grid * 0.18 - grid * 0.03;
        pixels(x, y, 1, grid - y, palette.far);
      }
      for (let x = 0; x < grid; x += 1) {
        const y = grid * 0.72 - Math.abs(Math.sin(x * 0.17 + 2)) * grid * 0.1;
        pixels(x, y, 1, grid - y, palette.mid);
      }
      pixels(0, Math.round(grid * 0.82), grid, Math.ceil(grid * 0.18), palette.near);

      // a tiny pine tree and birds
      const tx = Math.round(grid * 0.22);
      const ty = Math.round(grid * 0.84);
      pixels(tx, ty - 2, 1, 3, palette.ink);
      for (let i = 0; i < 5; i += 1) {
        const half = 4 - i;
        pixels(tx - half, ty - 3 - i, half * 2 + 1, 1, palette.ink);
      }
      pixels(Math.round(grid * 0.7), Math.round(grid * 0.2), 1, 1, palette.ink);
      pixels(Math.round(grid * 0.72), Math.round(grid * 0.19), 1, 1, palette.ink);
      pixels(Math.round(grid * 0.74), Math.round(grid * 0.2), 1, 1, palette.ink);

      // grain
      for (let i = 0; i < grid * 2; i += 1) {
        const x = Math.floor(rand() * grid);
        const y = Math.floor(rand() * grid);
        ctx.globalAlpha = 0.12;
        pixels(x, y, 1, 1, palette.ink);
        ctx.globalAlpha = 1;
      }
    };

    const paintCover = (image: HTMLImageElement) => {
      if (cancelled) return;
      const size = Math.min(image.naturalWidth || image.width, image.naturalHeight || image.height);
      const sx = ((image.naturalWidth || image.width) - size) / 2;
      const sy = ((image.naturalHeight || image.height) - size) / 2;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, grid, grid);
      ctx.drawImage(image, sx, sy, size, size, 0, 0, grid, grid);
      // gently lift the shadows so the art feels like pastel paper
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = '#fff7e8';
      ctx.fillRect(0, 0, grid, grid);
      ctx.globalAlpha = 1;
    };

    paintFallback();

    if (src) {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => paintCover(image);
      image.onerror = () => {
        if (!cancelled) paintFallback();
      };
      image.src = src;
    }

    return () => {
      cancelled = true;
    };
  }, [src, seed, grid, original]);

  // Spotify artwork stays unchanged; only the surrounding frame uses pixel styling.
  if (original && src) {
    return <img src={src} alt={alt} className={`original-cover ${className}`} loading={eager ? 'eager' : 'lazy'} />;
  }

  return (
    <canvas
      ref={canvasRef}
      className={`pixel-art-canvas ${className}`}
      role="img"
      aria-label={alt}
      data-eager={eager ? 'true' : undefined}
    />
  );
};

export function artGradient(seed: string): string {
  const palette = COVER_PALETTES[hashString(`${seed}:gradient`) % COVER_PALETTES.length];
  const angle = clamp(hashString(`${seed}:angle`) % 360, 0, 360);
  return `linear-gradient(${angle}deg, ${palette.sky}, ${palette.mid} 62%, ${palette.near})`;
}
