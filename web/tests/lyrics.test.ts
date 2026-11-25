import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  activeLineIndex,
  lyricTrackKey,
  lyricWordTimings,
  parseLrc,
} from '../src/lyrics/lrc';

test('LRC parsing supports metadata, multiple stamps and millisecond fractions', () => {
  const lines = parseLrc([
    '[ar:Nils Frahm]',
    '[ti:Felt]',
    '[00:12.50]First line',
    '[00:20.123][00:24.60]Repeated line',
    '[00:30:05]Colon fractions',
    '[00:00.00]',
  ].join('\n'));

  assert.deepEqual(lines, [
    { time: 12.5, text: 'First line' },
    { time: 20.123, text: 'Repeated line' },
    { time: 24.6, text: 'Repeated line' },
    { time: 30.05, text: 'Colon fractions' },
  ]);
});

test('LRC parsing sorts unsorted input, keeps symbols and merges duplicates', () => {
  const lines = parseLrc([
    '[00:09.00]♪',
    '[00:03.00]Second',
    '[00:03.00]Second',
    '[00:03.00]Alternate',
    '[00:01.00]First',
  ].join('\n'));

  assert.deepEqual(lines.map((line) => line.time), [1, 3, 9]);
  assert.equal(lines[1].text, 'Second / Alternate');
  assert.equal(lines[2].text, '♪');
});

test('active line lookup is a binary search with an intro state', () => {
  const lines = parseLrc('[00:02.00]A\n[00:04.00]B\n[00:08.00]C');
  assert.equal(activeLineIndex(lines, 0), -1);
  assert.equal(activeLineIndex(lines, 1.99), -1);
  assert.equal(activeLineIndex(lines, 2), 0);
  assert.equal(activeLineIndex(lines, 7.5), 1);
  assert.equal(activeLineIndex(lines, 100), 2);
  assert.equal(activeLineIndex([], 10), -1);
});

test('word timing fills the line in character order and respects the cap', () => {
  const line = { time: 10, text: 'one two three' };
  const words = lyricWordTimings(line, { time: 16, text: 'next' });
  assert.equal(words.length, 3);
  assert.equal(words[0].start, 10);
  assert.ok(words[2].end <= 16);
  for (let index = 1; index < words.length; index++) {
    assert.ok(words[index].start >= words[index - 1].start);
    assert.ok(words[index].end >= words[index].start);
  }

  const capped = lyricWordTimings({ time: 0, text: 'a b' }, { time: 60, text: 'next' });
  assert.ok(capped[capped.length - 1].end <= 6);
});

test('cache keys are metadata based and duration aware', () => {
  const base = { title: 'Felt', artist: 'Nils Frahm', album: 'Felt', durationSec: 180.2 };
  assert.equal(lyricTrackKey(base), lyricTrackKey({ ...base, durationSec: 180.4 }));
  assert.notEqual(lyricTrackKey(base), lyricTrackKey({ ...base, durationSec: 240 }));
  assert.equal(lyricTrackKey({ title: 'Felt', artist: 'Nils Frahm' }), lyricTrackKey({ title: 'felt', artist: 'NILS frahm' }));
});
