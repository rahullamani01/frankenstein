import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Track } from '../src/data/musicData';
import { filterRecommendations, recommendationKey, trackIdentity } from '../src/recommendations/similar';

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
