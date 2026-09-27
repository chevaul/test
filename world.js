// The World ties terrain, water, plants and climate together and advances them.

import { TIME, PLANTS, WORLD } from '../config.js';
import { RNG } from '../core/rng.js';
import { generateTerrain } from './terrain.js';
import { WaterSystem } from './water.js';
import { Plants } from './plants.js';
import { Climate, timeOf } from './climate.js';

export class World {
  constructor(seed) {
    this.seed = String(seed);
    this.rng = new RNG(`world:${seed}`);
    this.terrain = generateTerrain(this.seed);
    this.climate = new Climate(this.rng.fork('climate'));
    this.water = new WaterSystem(this.terrain);
    this.plants = new Plants(this.terrain, this.rng.fork('plants'));
    this.ticksSincePlants = 0;
  }

  step(tick) {
    const t = timeOf(tick);
    const dt = 1 / TIME.ticksPerDay;
    this.climate.update(dt, t.yearFrac, t.dayFrac);
    this.water.setLevel(this.climate.waterLevel(this.terrain.baseWaterLevel));
    if (++this.ticksSincePlants >= PLANTS.updateEvery) {
      this.plants.update(this.ticksSincePlants * dt, this.climate, this.water);
      this.ticksSincePlants = 0;
    }
  }

  cellIndex(x, y) {
    const c = Math.floor(x / WORLD.cell), r = Math.floor(y / WORLD.cell);
    if (c < 0 || r < 0 || c >= this.terrain.cols || r >= this.terrain.rows) return -1;
    return r * this.terrain.cols + c;
  }

  /** Local temperature at a cell: air temperature minus altitude cooling. */
  temperatureAt(i) {
    return this.climate.airTemp + this.plants.tempOffset[i];
  }

  /** Seasonal (no day/night swing) temperature at a cell, used for snow cover. */
  meanTemperatureAt(i) {
    return this.climate.seasonalTemp + this.climate.anomaly + this.plants.tempOffset[i];
  }
}
