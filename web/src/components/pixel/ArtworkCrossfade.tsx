import React, { useEffect, useState } from 'react';
import { PixelArt } from './PixelArt';
import { MOTION } from '../../theme/motion';

interface Artwork {
  key: string;
  src?: string;
  seed: string;
  original: boolean;
  alt: string;
}

/**
 * Two stacked canvases: the previous cover stays put while the next one
 * fades in on top. No blank frame, no background flash.
 */
export const ArtworkCrossfade: React.FC<{
  src?: string;
  seed: string;
  original: boolean;
  alt: string;
  grid?: number;
}> = ({ src, seed, original, alt, grid = 64 }) => {
  const key = `${original ? 'original' : 'pixel'}:${src || 'fallback'}:${seed}`;
  const [layers, setLayers] = useState<Artwork[]>([{ key, src, seed, original, alt }]);
  useEffect(() => {
    let cancelled = false;
    const show = (available?: string) => {
      if (cancelled) return;
      setLayers((previous) => {
        const last = previous[previous.length - 1];
        if (last.key === key && last.src === available) return previous;
        const next = { key, src: available, seed, original, alt };
        return last.key === key ? [next] : [last, next];
      });
    };
    if (src) {
      const image = new Image();
      image.src = src;
      void image.decode().then(() => show(src), () => show());
    } else show();
    return () => { cancelled = true; };
  }, [key, src, seed, original, alt]);

  useEffect(() => {
    if (layers.length === 1) return;
    const timer = window.setTimeout(() => setLayers([layers[layers.length - 1]]), MOTION.duration.artwork + 60);
    return () => window.clearTimeout(timer);
  }, [layers]);

  return (
    <div className="np-art-stack">
      {layers.map((layer, index) => (
        <div
          key={layer.key}
          className={`np-art-layer ${index === layers.length - 1 && layers.length > 1 ? 'is-entering' : ''}`}
        >
          <PixelArt
            original={layer.original}
            src={layer.src}
            seed={layer.seed}
            alt={layer.alt}
            grid={grid}
            eager
          />
        </div>
      ))}
    </div>
  );
};
