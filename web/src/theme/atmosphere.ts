export type DayPhase = 'morning' | 'afternoon' | 'golden hour' | 'daylight';

export function dayPhase(hour: number): DayPhase {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 16) return 'afternoon';
  if (hour >= 16 && hour < 20) return 'golden hour';
  return 'daylight';
}

/** High-DPI rendering up to native UHD, without allocating unbounded canvases. */
export function sceneResolution(width: number, height: number, dpr: number) {
  const ratio = Math.min(Math.max(1, dpr), 2, 3840 / Math.max(1, width), 2160 / Math.max(1, height));
  return { ratio, width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

export function smoothstep(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}
