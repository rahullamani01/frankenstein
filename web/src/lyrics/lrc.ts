/**
 * LRC parsing, word timing and per-track lyric preferences.
 *
 * Everything in this module is pure except the tiny localStorage helpers at
 * the bottom, which fail soft when storage is unavailable.
 */

export interface LyricLine {
  /** Start time in seconds. */
  time: number;
  text: string;
}

export interface LyricWord {
  text: string;
  /** Absolute start time in seconds. */
  start: number;
  /** Absolute end time in seconds. */
  end: number;
}

export type LyricTextSize = 'medium' | 'large';

/** Matches [mm:ss], [mm:ss.xx], [mm:ss.xxx] and the [mm:ss:xx] variant. */
const TIME_TAG = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

function tagToSeconds(minutes: string, seconds: string, fraction?: string): number {
  const mins = Number(minutes);
  const secs = Number(seconds);
  let frac = 0;
  if (fraction) {
    frac = fraction.length === 1
      ? Number(fraction) / 10
      : fraction.length === 2
        ? Number(fraction) / 100
        : Number(fraction) / 1000;
  }
  if (!Number.isFinite(mins) || !Number.isFinite(secs) || !Number.isFinite(frac)) return 0;
  return mins * 60 + secs + frac;
}

/**
 * Turns an LRC document into sorted, de-duplicated lines. Metadata tags such
 * as [ar:], [ti:] and [offset:] are ignored, several timestamps on one line
 * are expanded, and empty lines are dropped so they only remain as natural
 * instrumental gaps between the surrounding lyrics.
 */
export function parseLrc(source: string): LyricLine[] {
  if (typeof source !== 'string' || !source.trim()) return [];
  const byTime = new Map<number, string>();

  for (const raw of source.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const matches = [...raw.matchAll(TIME_TAG)];
    if (!matches.length) continue;

    // The text follows the final time tag. Enhanced-LRC word tags are removed
    // because timing is estimated from the line itself.
    const last = matches[matches.length - 1];
    const text = raw
      .slice((last.index ?? 0) + last[0].length)
      .replace(/<[^>]*>/g, '')
      .trim();
    if (!text) continue;

    for (const match of matches) {
      const time = Math.max(0, tagToSeconds(match[1], match[2], match[3]));
      const rounded = Math.round(time * 1000) / 1000;
      const existing = byTime.get(rounded);
      if (!existing) {
        byTime.set(rounded, text);
      } else if (existing !== text && !existing.split(' / ').includes(text)) {
        // Duplicate timestamps with different words: show both rather than
        // silently dropping one.
        byTime.set(rounded, `${existing} / ${text}`);
      }
    }
  }

  return [...byTime.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([time, text]) => ({ time, text }));
}

/** Last line whose timestamp is at or before `time`; -1 during the intro. */
export function activeLineIndex(lines: LyricLine[], time: number): number {
  let low = 0;
  let high = lines.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (lines[mid].time <= time) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
}

/**
 * Estimates word timings for the active line by distributing the time until
 * the next line (capped at six seconds) by character count.
 */
export function lyricWordTimings(
  line: LyricLine,
  next: LyricLine | undefined,
  capSeconds = 6
): LyricWord[] {
  const words = line.text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const cap = Math.max(0.5, capSeconds);
  const end = next && next.time > line.time
    ? Math.min(line.time + cap, next.time)
    : line.time + cap;
  const span = Math.max(0.45, end - line.time);
  const weights = words.map((word) => Math.max(1, [...word].length));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let travelled = 0;

  return words.map((word, index) => {
    const start = line.time + span * (travelled / total);
    travelled += weights[index];
    const finish = line.time + span * (travelled / total);
    return { text: word, start, end: finish };
  });
}

export function formatLyricTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatOffset(seconds: number): string {
  const value = Math.abs(seconds) < 0.05 ? 0 : seconds;
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}s`;
}

function normalizeKeyPart(value: string | number | undefined): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Stable cache key based on the recording's metadata, not its moving id. */
export function lyricTrackKey(track: {
  id?: string;
  source?: string;
  title: string;
  artist: string;
  album?: string;
  durationSec?: number;
}): string {
  const parts = [
    track.title,
    track.artist,
    track.album,
    Math.round(track.durationSec || 0),
  ].map(normalizeKeyPart);
  return parts.join('|') || normalizeKeyPart(track.id) || 'unknown';
}

/** Offset is stored per recording so remixes/editions stay independent. */
export function lyricOffsetKey(track: {
  id?: string;
  source?: string;
  title: string;
  artist: string;
  album?: string;
  durationSec?: number;
}): string {
  const identity = `${track.source || 'Local'}:${track.id || ''}`.trim();
  return identity.endsWith(':')
    ? lyricTrackKey(track)
    : `${identity}:${lyricTrackKey(track)}`;
}

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

const OFFSET_PREFIX = 'frankenstein:lyrics-offset:v1:';
const SIZE_KEY = 'frankenstein:lyrics-size:v1';
const OFFSET_LIMIT = 5;

export function readLyricOffset(key: string): number {
  try {
    const raw = storage()?.getItem(`${OFFSET_PREFIX}${key}`);
    const value = Number(raw);
    if (!Number.isFinite(value)) return 0;
    return Math.max(-OFFSET_LIMIT, Math.min(OFFSET_LIMIT, Math.round(value * 2) / 2));
  } catch {
    return 0;
  }
}

export function writeLyricOffset(key: string, seconds: number): number {
  const value = Math.max(-OFFSET_LIMIT, Math.min(OFFSET_LIMIT, Math.round(seconds * 2) / 2));
  try {
    storage()?.setItem(`${OFFSET_PREFIX}${key}`, String(value));
  } catch {
    // Storage can be full or blocked; the in-memory state still works.
  }
  return value;
}

export function readLyricTextSize(): LyricTextSize {
  try {
    return storage()?.getItem(SIZE_KEY) === 'medium' ? 'medium' : 'large';
  } catch {
    return 'large';
  }
}

export function writeLyricTextSize(size: LyricTextSize): void {
  try {
    storage()?.setItem(SIZE_KEY, size);
  } catch {
    // Non-fatal: the size still changes for this session.
  }
}
