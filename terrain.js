// Procedural terrain: elevation, moisture, rivers, hill shading and biomes.
// Everything is derived from the seed, so the same seed gives the same map.

import { WORLD, TERRAIN, BIOME } from '../config.js';
import { RNG } from '../core/rng.js';
import { createNoise2D, fbm } from '../core/noise.js';
import { distanceToWater } from './water.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function quantile(values, q) {
  const sorted = Float32Array.from(values).sort();
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

export function generateTerrain(seed) {
  const cols = WORLD.cols, rows = WORLD.rows, n = cols * rows;
  const rng = new RNG(`terrain:${seed}`);
  const nElev = createNoise2D(rng);
  const nLarge = createNoise2D(rng);
  const nMoist = createNoise2D(rng);
  const nRiver = createNoise2D(rng);
  const nRiverMask = createNoise2D(rng);

  // 1. Elevation: detailed fractal noise over a broad, slow landform.
  const elevation = new Float32Array(n);
  const s = TERRAIN.elevationScale;
  let lo = Infinity, hi = -Infinity;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const detail = fbm(nElev, x * s, y * s, TERRAIN.elevationOctaves);
      const broad = fbm(nLarge, x * s * 0.35, y * s * 0.35, 3);
      const e = 0.62 * detail + 0.55 * broad;
      elevation[y * cols + x] = e;
      if (e < lo) lo = e;
      if (e > hi) hi = e;
    }
  }
  for (let i = 0; i < n; i++) elevation[i] = Math.pow(clamp01((elevation[i] - lo) / (hi - lo)), 1.15);

  // 2. Normal water level: chosen so a fixed share of the map starts under water.
  const baseWaterLevel = quantile(elevation, TERRAIN.waterFraction);

  // 3. Rivers: carved where a separate noise field crosses zero (winding lines).
  const isRiver = new Uint8Array(n);
  const rs = TERRAIN.riverScale, width = TERRAIN.riverWidth;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const e = elevation[i];
      if (e <= baseWaterLevel || e > TERRAIN.riverMaxElevation) continue;
      if (nRiverMask(x * rs * 0.5 + 40, y * rs * 0.5) < -0.12) continue;
      const r = Math.abs(nRiver(x * rs, y * rs) + 0.3 * nRiver(x * rs * 2.9 + 11, y * rs * 2.9));
      const t = r / (width * 2.6);
      if (t >= 1) continue;
      // Channel bottom sits below the normal waterline, banks slope back up.
      const target = baseWaterLevel - 0.03 + 0.05 * t * t;
      if (target < e) elevation[i] = target;
      if (r < width) isRiver[i] = 1;
    }
  }

  // 4. Hill shading (light from the north-west) for a sense of relief.
  const shade = new Float32Array(n);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const xl = x > 0 ? i - 1 : i, xr = x < cols - 1 ? i + 1 : i;
      const yu = y > 0 ? i - cols : i, yd = y < rows - 1 ? i + cols : i;
      const dx = elevation[xr] - elevation[xl];
      const dy = elevation[yd] - elevation[yu];
      shade[i] = clamp01(0.5 - (dx + dy) * 22);
    }
  }

  // 5. Moisture: regional rainfall pattern plus dampness near permanent water.
  const baseWater = new Uint8Array(n);
  for (let i = 0; i < n; i++) baseWater[i] = elevation[i] < baseWaterLevel ? 1 : 0;
  const dist = distanceToWater(baseWater, cols, rows);
  const moisture = new Float32Array(n);
  const rainfall = new Float32Array(n); // regional wetness, ignoring lakes
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const regional = 0.5 + 0.75 * fbm(nMoist, x / 120, y / 120, 4);
      rainfall[i] = clamp01(regional);
      moisture[i] = clamp01(0.72 * regional + 0.45 * Math.exp(-dist[i] / 16));
    }
  }

  // 6. Biomes from elevation and moisture. Cells below the waterline keep a
  //    land biome too: it's what appears if the water recedes.
  const biome = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const e = elevation[i], m = moisture[i];
    let b;
    if (e < baseWaterLevel - 0.03) b = BIOME.MUD;
    else if (e < baseWaterLevel + TERRAIN.shoreBand) b = rainfall[i] > 0.5 ? BIOME.MARSH : BIOME.SAND;
    else if (e > TERRAIN.peakElevation) b = BIOME.PEAK;
    else if (e > TERRAIN.rockElevation) b = BIOME.ROCK;
    else if (m > TERRAIN.forestMoisture) b = BIOME.FOREST;
    else if (m < TERRAIN.scrubMoisture) b = BIOME.SCRUB;
    else b = BIOME.GRASS;
    biome[i] = b;
  }

  return { seed, cols, rows, cell: WORLD.cell, elevation, moisture, biome, shade, isRiver, baseWaterLevel };
}
