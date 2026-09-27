// Unit tests for the seeded random generator and noise.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RNG, hashSeed } from '../src/core/rng.js';
import { createNoise2D, fbm } from '../src/core/noise.js';

test('the same seed gives the same random sequence', () => {
  const a = new RNG('otter-42'), b = new RNG('otter-42');
  for (let i = 0; i < 1000; i++) assert.equal(a.next(), b.next());
});

test('different seeds give different sequences', () => {
  const a = new RNG(1), b = new RNG(2);
  let same = 0;
  for (let i = 0; i < 100; i++) if (a.next() === b.next()) same++;
  assert.ok(same < 3);
});

test('text and number seeds are both accepted', () => {
  assert.equal(typeof hashSeed('wolves'), 'number');
  assert.equal(hashSeed(42), hashSeed('42'));
});

test('random values stay in [0, 1) and look uniform', () => {
  const r = new RNG('uniform');
  let sum = 0;
  const n = 20000;
  for (let i = 0; i < n; i++) {
    const v = r.next();
    assert.ok(v >= 0 && v < 1);
    sum += v;
  }
  assert.ok(Math.abs(sum / n - 0.5) < 0.01);
});

test('gaussian samples have mean ~0 and spread ~1', () => {
  const r = new RNG('gauss');
  let s = 0, s2 = 0;
  const n = 20000;
  for (let i = 0; i < n; i++) { const g = r.gauss(); s += g; s2 += g * g; }
  const mean = s / n, sd = Math.sqrt(s2 / n - mean * mean);
  assert.ok(Math.abs(mean) < 0.03, `mean ${mean}`);
  assert.ok(Math.abs(sd - 1) < 0.03, `sd ${sd}`);
});

test('noise is smooth, bounded and seed-dependent', () => {
  const n1 = createNoise2D(new RNG('a')), n2 = createNoise2D(new RNG('b'));
  let diff = 0;
  for (let i = 0; i < 2000; i++) {
    const x = i * 0.37, y = i * 0.11;
    const v = n1(x, y);
    assert.ok(v >= -1.2 && v <= 1.2);
    assert.ok(Math.abs(n1(x + 0.001, y) - v) < 0.01, 'noise should change smoothly');
    diff += Math.abs(v - n2(x, y));
    const f = fbm(n1, x, y, 5);
    assert.ok(Number.isFinite(f) && f >= -1.2 && f <= 1.2);
  }
  assert.ok(diff > 100, 'different seeds should give different noise');
});
