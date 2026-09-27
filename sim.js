// Simulation: the pure-logic core. No drawing, no DOM, so it runs the same in
// a browser or headless in Node for tests.

import { TIME } from './config.js';
import { World } from './world/world.js';
import { timeOf } from './world/climate.js';

export class Simulation {
  constructor({ seed = 'wildgene' } = {}) {
    this.seed = String(seed);
    this.world = new World(this.seed);
    this.tick = 0;
    this.history = [];               // sampled stats for charts and tests
    this.sampleEvery = TIME.ticksPerDay / 4;
    this.sample();
  }

  get time() { return timeOf(this.tick); }

  step(n = 1) {
    for (let k = 0; k < n; k++) {
      this.world.step(this.tick);
      this.tick++;
      if (this.tick % this.sampleEvery === 0) this.sample();
    }
  }

  sample() {
    const w = this.world;
    this.history.push({
      days: this.tick / TIME.ticksPerDay,
      plants: w.plants.fill,
      water: w.water.coverage,
      temp: w.climate.seasonalTemp + w.climate.anomaly,
      soil: w.climate.soilWet,
      snow: w.climate.snowpack,
    });
    if (this.history.length > 4000) this.history.splice(0, this.history.length - 4000);
  }

  /** A fingerprint of the world state; identical seeds must give identical checksums. */
  checksum() {
    const w = this.world;
    let h = 2166136261 >>> 0;
    const mix = (v) => { h ^= v >>> 0; h = Math.imul(h, 16777619) >>> 0; };
    const B = w.plants.biomass;
    for (let i = 0; i < B.length; i += 7) mix(Math.round(B[i] * 1e5));
    mix(Math.round(w.water.level * 1e7));
    mix(Math.round(w.climate.airTemp * 1e4));
    mix(this.tick);
    return h.toString(16);
  }
}
