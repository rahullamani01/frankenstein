import { useEffect, useState } from 'react';
import {
  type AmbientPalette,
  loadAmbientPalette,
  paletteFromSeed,
} from '../theme/ambient';

export function useAmbientPalette(src: string | undefined, seed: string): AmbientPalette {
  const [palette, setPalette] = useState<AmbientPalette>(() => paletteFromSeed(seed));

  useEffect(() => {
    let cancelled = false;
    void loadAmbientPalette(src, seed).then((next) => {
      if (!cancelled) setPalette(next);
    });
    return () => { cancelled = true; };
  }, [src, seed]);

  return palette;
}
