import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayPhase, sceneResolution, smoothstep } from '../src/theme/atmosphere';

test('day lighting follows local morning, afternoon and golden hour', () => {
  assert.equal(dayPhase(7), 'morning');
  assert.equal(dayPhase(13), 'afternoon');
  assert.equal(dayPhase(18), 'golden hour');
  assert.equal(dayPhase(2), 'daylight');
});

test('a 1080p retina viewport renders at native UHD resolution', () => {
  assert.deepEqual(sceneResolution(1920, 1080, 2), { width: 3840, height: 2160, ratio: 2 });
});

test('canvas allocation stays bounded on very large and high-DPI displays', () => {
  for (const [w, h, dpr] of [[3840, 2160, 3], [7680, 4320, 2], [390, 844, 3]]) {
    const result = sceneResolution(w, h, dpr);
    assert.ok(result.width <= 3840);
    assert.ok(result.height <= 2160);
    assert.ok(result.ratio <= 2);
  }
});

test('day/night interpolation is bounded, continuous and reversible', () => {
  assert.equal(smoothstep(-1), 0);
  assert.equal(smoothstep(2), 1);
  assert.equal(smoothstep(0.5), 0.5);
  let previous = 0;
  for (let i = 0; i <= 100; i++) {
    const value = smoothstep(i / 100);
    assert.ok(value >= previous);
    assert.ok(Math.abs(value + smoothstep(1 - i / 100) - 1) < 1e-10);
    previous = value;
  }
});
