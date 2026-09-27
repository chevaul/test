// Climate and weather: seasonal temperature, day/night swing, random warm and
// cold spells, rain/storm/snow spells, soil wetness, snowpack and lake storage
// (which sets the water level).

import { TIME, CLIMATE, WATER } from '../config.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// Weather spell types: [name, precipitation per day, duration range in days]
export const WEATHER = {
  clear:  { label: 'Clear',  precip: 0,   minDays: 0.4,  maxDays: 1.6 },
  cloudy: { label: 'Cloudy', precip: 0,   minDays: 0.3,  maxDays: 1.0 },
  rain:   { label: 'Rain',   precip: 1,   minDays: 0.25, maxDays: 1.2 },
  storm:  { label: 'Storm',  precip: 2.2, minDays: 0.15, maxDays: 0.5 },
};

export class Climate {
  constructor(rng) {
    this.rng = rng;
    this.weather = 'clear';
    this.spellLeft = 0.5;      // days left in the current weather spell
    this.anomaly = 0;          // °C, random warm or cold spell
    this.soilWet = 0.6;        // 0 = parched, 1 = soaked
    this.storage = 0.55;       // 0 = drought-low lakes, 1 = flooded
    this.snowpack = 0;         // 0..1 lying snow
    this.airTemp = CLIMATE.meanTemp;
    this.seasonalTemp = CLIMATE.meanTemp;
    this.precip = 0;           // current precipitation intensity
    this.snowing = false;
    this.daysSinceRain = 0;
  }

  /** Seasonal average temperature for a fraction of the year (0 = first day of spring). */
  static seasonalTemp(yearFrac) {
    return CLIMATE.meanTemp + CLIMATE.seasonalAmp * Math.cos(2 * Math.PI * (yearFrac - CLIMATE.peakDayFrac));
  }

  /** 0 at night, 1 at midday, smooth dawn and dusk. */
  static sunlight(dayFrac) {
    const s = Math.sin(2 * Math.PI * (dayFrac - 0.25)); // peaks at noon (0.5)
    return clamp01(s * 1.6 + 0.35);
  }

  seasonIndex(yearFrac) { return Math.floor(yearFrac * 4) % 4; }

  nextSpell(season) {
    const r = this.rng;
    let kind;
    if (r.chance(CLIMATE.wetChance[season])) kind = r.chance(CLIMATE.stormShare[season]) ? 'storm' : 'rain';
    else kind = r.chance(0.35) ? 'cloudy' : 'clear';
    const w = WEATHER[kind];
    this.weather = kind;
    this.spellLeft = r.range(w.minDays, w.maxDays);
  }

  /** Advance the climate by dt days. */
  update(dt, yearFrac, dayFrac) {
    const season = this.seasonIndex(yearFrac);

    this.spellLeft -= dt;
    if (this.spellLeft <= 0) this.nextSpell(season);

    // Random warm/cold spells drift and fade (an Ornstein–Uhlenbeck process).
    this.anomaly += -this.anomaly * CLIMATE.anomalyReversion * dt
      + CLIMATE.anomalyNoise * Math.sqrt(dt) * this.rng.gauss() * Math.sqrt(2 * CLIMATE.anomalyReversion);

    const w = WEATHER[this.weather];
    const cloudCover = this.weather === 'clear' ? 0 : this.weather === 'cloudy' ? 0.6 : 1;
    const sun = Climate.sunlight(dayFrac);
    this.seasonalTemp = Climate.seasonalTemp(yearFrac);
    const daily = CLIMATE.dailyAmp * Math.cos(2 * Math.PI * (dayFrac - CLIMATE.warmestHour));
    // Clouds cool the day and keep the night a little warmer.
    const cloudEffect = cloudCover * (sun > 0.5 ? -2.5 : 1.0);
    this.airTemp = this.seasonalTemp + daily + this.anomaly + cloudEffect;

    // Precipitation: rain, or snow when it's cold.
    this.precip = w.precip;
    this.snowing = this.precip > 0 && this.airTemp < CLIMATE.snowBelow;
    if (this.precip > 0) this.daysSinceRain = 0; else this.daysSinceRain += dt;

    const warmth = Math.max(0, this.airTemp - 8);
    if (this.snowing) {
      this.snowpack = clamp01(this.snowpack + this.precip * 0.3 * dt);
    } else if (this.precip > 0) {
      this.soilWet = clamp01(this.soilWet + this.precip * 0.9 * dt);
      this.storage = clamp01(this.storage + this.precip * WATER.rainToStorage * dt);
    }

    // Snowmelt feeds soil and lakes (the spring flood).
    if (this.snowpack > 0 && this.airTemp > 1) {
      const melt = Math.min(this.snowpack, (this.airTemp - 1) * WATER.snowmeltRate * dt);
      this.snowpack -= melt;
      this.soilWet = clamp01(this.soilWet + melt * 0.6);
      this.storage = clamp01(this.storage + melt * 0.7);
    }

    // Drying: soil dries and lakes evaporate faster in the heat.
    // Cold soil barely dries; hot summer soil dries within days.
    this.soilWet = clamp01(this.soilWet - (0.06 + 0.022 * warmth) * dt);
    this.storage = clamp01(this.storage - (WATER.baseEvaporation + WATER.heatEvaporation * warmth) * dt);
  }

  /** Water level implied by how full the lakes are. */
  waterLevel(baseLevel) {
    return baseLevel + WATER.levelSwing * (this.storage - 0.5) * 2;
  }

  weatherLabel() {
    if (this.snowing) return this.weather === 'storm' ? 'Blizzard' : 'Snow';
    return WEATHER[this.weather].label;
  }
}

export function timeOf(tick) {
  const days = tick / TIME.ticksPerDay;
  const day = Math.floor(days);
  const dayFrac = days - day;
  const dayOfYear = day % TIME.daysPerYear;
  const yearFrac = (dayOfYear + dayFrac) / TIME.daysPerYear;
  const season = Math.floor(dayOfYear / TIME.daysPerSeason);
  return {
    tick, days, day, dayFrac, dayOfYear, yearFrac, season,
    seasonName: TIME.seasons[season],
    dayOfSeason: (dayOfYear % TIME.daysPerSeason) + 1,
    year: Math.floor(day / TIME.daysPerYear) + 1,
  };
}
