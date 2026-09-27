// Plant food on every land cell. Each cell follows the logistic growth
// equation from ecology, dB/dt = r·B·(1 − B/K), scaled by temperature,
// soil water and closeness to lakes and rivers. Bare cells re-sprout from
// "seed rain", faster when their neighbours are lush.

import { BIOMES, PLANTS, CLIMATE, WORLD } from '../config.js';

export class Plants {
  constructor(terrain, rng) {
    const n = terrain.cols * terrain.rows;
    this.terrain = terrain;
    this.biomass = new Float32Array(n);
    this.K = new Float32Array(n);
    this.r = new Float32Array(n);
    this.invK = new Float32Array(n);
    this.tempOffset = new Float32Array(n); // altitude cooling per cell (°C)
    this.moist = new Float32Array(n);
    this.near = new Float32Array(n);       // dampness from nearby lakes and rivers (0..1)
    this.nearVersion = -1;
    for (let i = 0; i < n; i++) {
      const b = BIOMES[terrain.biome[i]];
      this.K[i] = b.K;
      this.r[i] = b.r;
      this.invK[i] = b.K > 0 ? 1 / b.K : 0;
      this.tempOffset[i] = -CLIMATE.lapseRate * Math.max(0, terrain.elevation[i] - terrain.baseWaterLevel);
      this.moist[i] = terrain.moisture[i];
      this.biomass[i] = b.K * (0.5 + 0.35 * rng.next());
    }
    this.totalK = this.K.reduce((a, b) => a + b, 0);
    this.fill = 0;           // share of the map's maximum plant food currently standing
    this.growthIndex = 0;    // average growth factor on the last pass (0..1), for display
  }

  static tempFactor(t) {
    if (t < PLANTS.minGrowTemp) return 0;
    if (t < PLANTS.optimumTemp) return (t - PLANTS.minGrowTemp) / (PLANTS.optimumTemp - PLANTS.minGrowTemp);
    if (t < PLANTS.heatStressTemp) return 1;
    return Math.max(0.3, 1 - (t - PLANTS.heatStressTemp) / 12);
  }

  /** Grow (or die back) every cell by dt days. */
  update(dt, climate, water) {
    const { cols, rows } = this.terrain;
    const B = this.biomass, K = this.K, R = this.r, IK = this.invK;
    const soil = 0.5 + 0.65 * climate.soilWet;
    const air = climate.airTemp;
    if (this.nearVersion !== water.version) this.refreshNear(water);
    const near = this.near;
    let total = 0, growthSum = 0, growthCells = 0;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        let b = B[i];
        if (water.isWater[i]) {
          b -= b * PLANTS.floodDieback * dt;           // drowned plants rot
          B[i] = b;
          continue;
        }
        const k = K[i];
        if (k <= 0) { continue; }
        const t = air + this.tempOffset[i];
        const fT = Plants.tempFactor(t);
        let fW = 0.25 + 0.5 * this.moist[i] + 0.4 * near[i];
        if (fW > 1.1) fW = 1.1;
        const f = fT * fW * soil;

        // Neighbour fullness drives re-sprouting (seed spread).
        const left = x > 0 ? B[i - 1] * IK[i - 1] : 0;
        const right = x < cols - 1 ? B[i + 1] * IK[i + 1] : 0;
        const up = y > 0 ? B[i - cols] * IK[i - cols] : 0;
        const down = y < rows - 1 ? B[i + cols] * IK[i + cols] : 0;
        const nb = (left + right + up + down) * 0.25;

        let db = R[i] * f * b * (1 - b * IK[i]) + k * (PLANTS.seedRain + PLANTS.seedSpread * nb) * fT;
        if (t < -1) db -= PLANTS.frostDieback * b;    // frost browns the leaves
        b += db * dt;
        if (b < 0) b = 0; else if (b > k) b = k;
        B[i] = b;
        total += b;
        growthSum += f;
        growthCells++;
      }
    }
    this.fill = total / this.totalK;
    this.growthIndex = growthCells ? growthSum / growthCells : 0;
  }

  /** Recompute lake-side dampness after the water map changes. */
  refreshNear(water) {
    const reach = PLANTS.waterReach;
    const lut = new Float32Array(256);
    for (let d = 0; d < 256; d++) lut[d] = Math.exp(-d / reach);
    const dist = water.distance;
    for (let i = 0; i < dist.length; i++) this.near[i] = dist[i] < 256 ? lut[dist[i]] : 0;
    this.nearVersion = water.version;
  }

  /** Plant food at a world position (metres). */
  at(x, y) {
    const c = Math.floor(x / WORLD.cell), r = Math.floor(y / WORLD.cell);
    if (c < 0 || r < 0 || c >= this.terrain.cols || r >= this.terrain.rows) return 0;
    return this.biomass[r * this.terrain.cols + c];
  }
}
