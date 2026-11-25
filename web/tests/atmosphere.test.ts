import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayPhase, sceneResolution, smoothstep } from '../src/theme/atmosphere';

test('day lighting follows local morning, afternoon and golden hour', () => {
  assert.equal(dayPhase(7), 'morning');
  assert.equal(dayPhase(13), 'afternoon');
  assert.equal(dayPhase(18), 'golden hour');
  assert.equal(dayPhase(2), 'daylight');
});

test('a framed city uses two CSS pixels per art pixel', () => {
  assert.deepEqual(sceneResolution(480, 320), { width: 240, height: 160 });
});

test('canvas allocation stays bounded on very large and high-DPI displays', () => {
  for (const [w, h] of [[3840, 2160], [7680, 4320], [390, 844]]) {
    const result = sceneResolution(w, h);
    assert.ok(result.width <= 640 && result.height <= 320);
    assert.ok(Math.abs(result.width / result.height - w / h) < .01);
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
