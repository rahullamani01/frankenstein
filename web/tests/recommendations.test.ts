import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Track } from '../src/data/musicData';
import {
  filterRecommendations,
  getAutoplayTracks,
  mergeAutoplayQueue,
  recommendationKey,
  trackIdentity,
} from '../src/recommendations/similar';

function song(id: string, artist = 'Artist', source: Track['source'] = 'Local'): Track {
  return {
    id, title: `Song ${id}`, artist, source, album: 'Album',
    albumId: 'album', year: 2026, duration: '3:00',
    durationSec: 180, coverUrl: '', trackNumber: 1,
  };
}

test('recommendations exclude the current song, recent history and duplicates', () => {
  const current = song('a');
  const recent = song('b');
  const sameIdDifferentSource = song('b', 'Artist', 'Spotify');
  const result = filterRecommendations(
    [current, recent, recent, sameIdDifferentSource, song('c')],
    current,
    [current, recent],
  );
  assert.deepEqual(result.map(trackIdentity), ['Spotify:b', 'Local:c']);
});

test('older history no longer hides playable recommendations', () => {
  const recent = Array.from({ length: 21 }, (_, index) => song(`played-${index}`));
  const result = filterRecommendations([song('played-0'), song('played-20')], song('current'), recent);
  assert.deepEqual(result.map((track) => track.id), ['played-20']);
});

test('recommendation cache is keyed by source, artist and title', () => {
  assert.equal(recommendationKey(song('one')), recommendationKey({ ...song('two'), title: 'Song one' }));
  assert.notEqual(recommendationKey(song('one')), recommendationKey(song('one', 'Artist', 'Spotify')));
});

test('autoplay queue keeps user order, drops recent history and duplicate songs', () => {
  const current = song('a');
  const recent = Array.from({ length: 30 }, (_, index) => song(`recent-${index}`));
  const duplicate = { ...song('b'), id: 'b-different-copy' };
  const reserved = song('manual');
  const result = mergeAutoplayQueue(
    [song('b'), song('c')],
    [song('b'), duplicate, song('recent-0'), reserved, song('d')],
    [current, ...recent],
    [reserved],
  );
  assert.deepEqual(result.map((track) => track.id), ['b', 'c', 'd']);
});

test('autoplay refill stays inside the current source and never repeats history', () => {
  const current = song('current');
  const library = [
    current,
    ...Array.from({ length: 8 }, (_, index) => song(`local-${index}`)),
    ...Array.from({ length: 3 }, (_, index) => song(`spotify-${index}`, 'Artist', 'Spotify')),
  ];
  const history = [current, song('local-0'), song('local-1')];
  return getAutoplayTracks({
    seeds: [current],
    source: 'Local',
    library,
    history,
    limit: 5,
  }).then((result) => {
    assert.ok(result.length > 0);
    assert.ok(result.every((track) => track.source === 'Local'));
    assert.ok(result.every((track) => !history.some((played) => trackIdentity(played) === trackIdentity(track))));
    assert.equal(new Set(result.map((track) => trackIdentity(track))).size, result.length);
  });
});

test('autoplay refill refuses a seed from another source', async () => {
  const result = await getAutoplayTracks({
    seeds: [song('seed', 'Artist', 'Spotify')],
    source: 'Local',
    library: [song('local-1')],
    history: [],
  });
  assert.deepEqual(result, []);
});
