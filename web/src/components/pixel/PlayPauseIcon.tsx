import React from 'react';
import { Pause, Play } from 'lucide-react';

/**
 * Both glyphs stay mounted so play/pause swaps in place with a small scale
 * and rotation instead of replacing one icon with another.
 */
export const PlayPauseIcon: React.FC<{
  playing: boolean;
  size?: number;
  strokeWidth?: number;
}> = ({ playing, size = 15, strokeWidth = 2 }) => (
  <span
    className="icon-swap"
    data-state={playing ? 'pause' : 'play'}
    aria-hidden="true"
    style={{ width: size, height: size }}
  >
    <Play
      size={size}
      strokeWidth={strokeWidth}
      className={`icon-swap-glyph ${playing ? 'is-out' : 'is-in'} icon-play`}
    />
    <Pause
      size={size}
      strokeWidth={strokeWidth}
      className={`icon-swap-glyph ${playing ? 'is-in' : 'is-out'}`}
    />
  </span>
);
