// Water: which cells are flooded at the current water level, and how far
// every land cell is from the nearest water (a shared map animals will use
// to find drinking water without each running its own path-finding).

import { WATER } from '../config.js';

/**
 * Multi-source breadth-first "flood fill" from every water cell.
 * Distance is in cells, counting diagonal steps as 1 (Chebyshev distance).
 */
export function distanceToWater(isWater, cols, rows, out = new Uint16Array(cols * rows)) {
  const n = cols * rows;
  const queue = new Int32Array(n);
  let head = 0, tail = 0;
  out.fill(65535);
  for (let i = 0; i < n; i++) {
    if (isWater[i]) { out[i] = 0; queue[tail++] = i; }
  }
  while (head < tail) {
    const i = queue[head++];
    const x = i % cols, y = (i / cols) | 0;
    const d = out[i] + 1;
    for (let dy = -1; dy <= 1; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= rows) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        if ((dx === 0 && dy === 0) || nx < 0 || nx >= cols) continue;
        const j = ny * cols + nx;
        if (out[j] > d) { out[j] = d; queue[tail++] = j; }
      }
    }
  }
  return out;
}

export class WaterSystem {
  constructor(terrain) {
    this.terrain = terrain;
    const n = terrain.cols * terrain.rows;
    this.isWater = new Uint8Array(n);
    this.distance = new Uint16Array(n);
    this.level = terrain.baseWaterLevel;
    this.appliedLevel = NaN;
    this.coverage = 0;   // share of the map under water
    this.version = 0;    // bumps every time the water map changes
    this.apply(this.level);
  }

  /** Set a new water level; the water map is only rebuilt when the change is noticeable. */
  setLevel(level) {
    this.level = level;
    if (!(Math.abs(level - this.appliedLevel) < WATER.recomputeThreshold)) this.apply(level);
  }

  apply(level) {
    const { elevation, cols, rows } = this.terrain;
    let count = 0;
    for (let i = 0; i < elevation.length; i++) {
      const w = elevation[i] < level ? 1 : 0;
      this.isWater[i] = w;
      count += w;
    }
    distanceToWater(this.isWater, cols, rows, this.distance);
    this.coverage = count / elevation.length;
    this.appliedLevel = level;
    this.version++;
  }

  /** Depth of water at a cell (0 on dry land), in elevation units. */
  depth(i) {
    const d = this.appliedLevel - this.terrain.elevation[i];
    return d > 0 ? d : 0;
  }
}
