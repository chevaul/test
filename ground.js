// Ground layer: one pixel per grid cell, recoloured as plants grow, water
// rises and snow falls. Drawn scaled up (with smoothing) under everything else.

import { BIOME } from '../config.js';
import { SOIL, vegetationColours, WATER_SHALLOW, WATER_DEEP, ICE, SNOW } from './palette.js';

export class GroundLayer {
  constructor(world, createCanvas) {
    const { cols, rows } = world.terrain;
    this.canvas = createCanvas(cols, rows);
    this.ctx = this.canvas.getContext('2d');
    this.image = this.ctx.createImageData(cols, rows);
    this.lastTick = -1;
  }

  update(world, time) {
    const { terrain, water, plants, climate } = world;
    const { cols, rows, elevation, biome, shade } = terrain;
    const data = this.image.data;
    const veg = vegetationColours(time.yearFrac);
    const B = plants.biomass;
    const level = water.appliedLevel;
    const isWater = water.isWater;
    const baseTemp = climate.seasonalTemp + climate.anomaly;
    const snowAmount = Math.min(1, climate.snowpack * 2.5);
    const off = plants.tempOffset;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const p = i * 4;
        const tMean = baseTemp + off[i];
        let r, g, b;

        if (isWater[i]) {
          const depth = level - elevation[i];
          const t = Math.sqrt(Math.min(1, depth / 0.05));
          r = WATER_SHALLOW[0] + (WATER_DEEP[0] - WATER_SHALLOW[0]) * t;
          g = WATER_SHALLOW[1] + (WATER_DEEP[1] - WATER_SHALLOW[1]) * t;
          b = WATER_SHALLOW[2] + (WATER_DEEP[2] - WATER_SHALLOW[2]) * t;
          if (tMean < -2) {                       // shallow water freezes first
            const ice = Math.min(1, (-2 - tMean) / 4) * (1 - 0.6 * t);
            r += (ICE[0] - r) * ice; g += (ICE[1] - g) * ice; b += (ICE[2] - b) * ice;
          }
        } else {
          const bi = biome[i];
          const soil = SOIL[bi];
          const v = bi === BIOME.FOREST ? veg.forest : bi === BIOME.MARSH ? veg.marsh : veg.open;
          let gr = B[i] / 0.85;
          if (gr > 1) gr = 1;
          gr = Math.pow(gr, 0.85);
          r = soil[0] + (v[0] - soil[0]) * gr;
          g = soil[1] + (v[1] - soil[1]) * gr;
          b = soil[2] + (v[2] - soil[2]) * gr;

          // Relief shading.
          let f = 0.72 + 0.56 * shade[i];
          // Damp, darker banks next to water give shorelines definition.
          if ((x > 0 && isWater[i - 1]) || (x < cols - 1 && isWater[i + 1]) ||
              (y > 0 && isWater[i - cols]) || (y < rows - 1 && isWater[i + cols])) f *= 0.86;
          r *= f; g *= f; b *= f;

          // Snow cover: lying snow where it's freezing; peaks keep some all year.
          let snow = 0;
          if (snowAmount > 0 && tMean < 1) snow = Math.min(1, (1 - tMean) / 3) * snowAmount;
          if (bi === BIOME.PEAK) snow = Math.max(snow, 0.8);
          else if (bi === BIOME.ROCK && tMean < 4) snow = Math.max(snow, Math.min(0.6, (4 - tMean) / 10));
          if (snow > 0) {
            const sf = 0.82 + 0.3 * shade[i];
            r += (SNOW[0] * sf - r) * snow; g += (SNOW[1] * sf - g) * snow; b += (SNOW[2] * sf - b) * snow;
          }
        }
        data[p] = r; data[p + 1] = g; data[p + 2] = b; data[p + 3] = 255;
      }
    }
    this.ctx.putImageData(this.image, 0, 0);
    this.lastTick = time.tick;
  }
}
