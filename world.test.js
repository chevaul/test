// World tests: terrain, water, plants and climate behave sensibly and reproducibly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/sim.js';
import { distanceToWater } from '../src/world/water.js';
import { generateTerrain } from '../src/world/terrain.js';
import { TIME, BIOMES, WATER, TERRAIN } from '../src/config.js';

const DAY = TIME.ticksPerDay;

test('same seed reproduces the world exactly; different seeds differ', () => {
  const a = new Simulation({ seed: 'repro' });
  const b = new Simulation({ seed: 'repro' });
  const c = new Simulation({ seed: 'other' });
  a.step(DAY * 2); b.step(DAY * 2); c.step(DAY * 2);
  assert.equal(a.checksum(), b.checksum());
  assert.notEqual(a.checksum(), c.checksum());
});

test('terrain is well formed on several seeds', () => {
  for (const seed of ['t1', 't2', 't3', 't4']) {
    const t = generateTerrain(seed);
    let water = 0;
    for (let i = 0; i < t.elevation.length; i++) {
      const e = t.elevation[i];
      assert.ok(Number.isFinite(e) && e >= 0 && e <= 1, `elevation ${e} at ${i}`);
      assert.ok(t.biome[i] >= 0 && t.biome[i] < BIOMES.length);
      if (e < t.baseWaterLevel) water++;
    }
    const share = water / t.elevation.length;
    // Lakes are ~11% of the map; rivers add a little more.
    assert.ok(share >= TERRAIN.waterFraction - 0.01 && share < 0.3, `water share ${share}`);
  }
});

test('distance-to-water map is correct on a small grid', () => {
  const cols = 5, rows = 3;
  const w = new Uint8Array(cols * rows);
  w[0] = 1; // top-left corner is water
  const d = distanceToWater(w, cols, rows);
  assert.deepEqual(Array.from(d), [0, 1, 2, 3, 4, 1, 1, 2, 3, 4, 2, 2, 2, 3, 4]);
});

test('plants stay within limits and follow the seasons', () => {
  for (const seed of ['p1', 'p2', 'p3']) {
    const sim = new Simulation({ seed });
    const P = sim.world.plants;
    let endOfWinter = 0, lateSummer = 0;
    for (let d = 0; d < TIME.daysPerYear * 2; d++) {
      sim.step(DAY);
      const dayOfYear = (d + 1) % TIME.daysPerYear;
      if (d >= TIME.daysPerYear) {
        if (dayOfYear === 13) lateSummer = P.fill;       // near the end of summer, year 2
        if (dayOfYear === 0) endOfWinter = P.fill;       // last day of winter, year 2
      }
    }
    for (let i = 0; i < P.biomass.length; i++) {
      const b = P.biomass[i];
      assert.ok(Number.isFinite(b) && b >= 0 && b <= P.K[i] + 1e-6, `biomass ${b} at ${i}`);
    }
    assert.ok(lateSummer > endOfWinter + 0.1, `${seed}: summer ${lateSummer} vs winter ${endOfWinter}`);
  }
});

test('water level stays within its seasonal range', () => {
  const sim = new Simulation({ seed: 'levels' });
  const base = sim.world.terrain.baseWaterLevel;
  let lo = Infinity, hi = -Infinity;
  for (let d = 0; d < TIME.daysPerYear * 2; d++) {
    sim.step(DAY);
    lo = Math.min(lo, sim.world.water.level);
    hi = Math.max(hi, sim.world.water.level);
  }
  assert.ok(lo >= base - WATER.levelSwing - 1e-9 && hi <= base + WATER.levelSwing + 1e-9);
  assert.ok(hi - lo > WATER.levelSwing * 0.4, 'lakes should rise and fall over two years');
});

test('climate: summers are warm, winters freeze, and it snows at some point', () => {
  const sim = new Simulation({ seed: 'climate' });
  let summerMax = -Infinity, winterMin = Infinity, snowed = false;
  for (let k = 0; k < TIME.daysPerYear * 2 * 24; k++) {
    sim.step(DAY / 24);
    const t = sim.time, c = sim.world.climate;
    if (t.season === 1) summerMax = Math.max(summerMax, c.airTemp);
    if (t.season === 3) winterMin = Math.min(winterMin, c.airTemp);
    if (c.snowpack > 0.05) snowed = true;
  }
  assert.ok(summerMax > 22, `summer max ${summerMax}`);
  assert.ok(winterMin < -3, `winter min ${winterMin}`);
  assert.ok(snowed, 'expected some snow in two winters');
});
