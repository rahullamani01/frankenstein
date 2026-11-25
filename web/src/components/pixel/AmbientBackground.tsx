import React, { useEffect, useRef, useState } from 'react';
import { useAmbientPalette } from '../../hooks/useAmbientPalette';
import { type AmbientPalette } from '../../theme/ambient';
import { MOTION } from '../../theme/motion';
import { hashString } from '../../theme/pixel';

interface Layer {
  id: number;
  palette: AmbientPalette;
}

function background(palette: AmbientPalette) {
  return [
    `radial-gradient(42% 46% at 20% 24%, ${palette.a} 0%, transparent 64%)`,
    `radial-gradient(38% 42% at 80% 22%, ${palette.b} 0%, transparent 66%)`,
    `radial-gradient(64% 60% at 52% 92%, ${palette.c} 0%, transparent 72%)`,
  ].join(', ');
}

/**
 * Artwork-driven colour, kept low and diffuse. Layers crossfade over ~2.4s
 * so a track change never flashes, and the drift pauses whenever the app is
 * hidden or the OS asks for reduced motion.
 */
export const AmbientBackground: React.FC<{ src?: string; seed: string }> = ({ src, seed }) => {
  const palette = useAmbientPalette(src, seed);
  const idRef = useRef(1);
  const [layers, setLayers] = useState<Layer[]>(() => [{ id: 1, palette }]);

  useEffect(() => {
    setLayers((previous) => {
      if (previous[previous.length - 1]?.palette === palette) return previous;
      const id = ++idRef.current;
      return [...previous.slice(-1), { id, palette }];
    });
    const timer = window.setTimeout(() => {
      setLayers((previous) =>
        previous.length > 1 ? [previous[previous.length - 1]] : previous,
      );
    }, MOTION.duration.ambient + 160);
    return () => window.clearTimeout(timer);
  }, [palette]);

  const drift = 28 + hashString(seed) % 12;

  return (
    <div className="np-ambient" aria-hidden="true">
      {layers.map((layer) => (
        <div
          key={layer.id}
          className="np-ambient-layer"
          style={{
            backgroundImage: background(layer.palette),
            '--ambient-drift': `${drift}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};
