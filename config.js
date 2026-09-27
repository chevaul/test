// Wildgene configuration.
// Every tunable number lives here so balancing never means hunting through code.
// Units: 1 world unit = 1 metre. Time rates are "per simulated day" unless noted.

export const WORLD = {
  width: 1600,   // metres
  height: 1000,  // metres
  cell: 4,       // metres per grid cell
};
WORLD.cols = WORLD.width / WORLD.cell;   // 400
WORLD.rows = WORLD.height / WORLD.cell;  // 250

export const TIME = {
  ticksPerDay: 600,      // ~10 s per day at 1x speed (60 ticks per second)
  daysPerSeason: 7,
  seasons: ['Spring', 'Summer', 'Autumn', 'Winter'],
};
TIME.daysPerYear = TIME.daysPerSeason * TIME.seasons.length;

export const TERRAIN = {
  elevationScale: 1 / 95,  // noise frequency, per cell
  elevationOctaves: 5,
  waterFraction: 0.11,     // share of the map under water at the normal water level
  riverScale: 1 / 125,
  riverWidth: 0.016,       // in noise units; bigger = wider rivers
  riverMaxElevation: 0.74, // rivers don't cut through the high mountains
  shoreBand: 0.01,         // elevation band above the waterline that becomes marsh or sand
  rockElevation: 0.80,
  peakElevation: 0.91,
  forestMoisture: 0.56,
  scrubMoisture: 0.33,
  maxAltitudeMetres: 2200, // for display only (gives a realistic ~0.7 °C cooling per 100 m)
};

// Biome ids index into BIOMES.
export const BIOME = { MUD: 0, MARSH: 1, SAND: 2, GRASS: 3, SCRUB: 4, FOREST: 5, ROCK: 6, PEAK: 7 };

// K = maximum plant food a cell can hold (1.0 = lush meadow).
// r = logistic regrowth rate per day in ideal conditions.
export const BIOMES = [
  { id: 0, name: 'Mudflat',   K: 0.25, r: 0.9 },
  { id: 1, name: 'Marsh',     K: 1.00, r: 1.0 },
  { id: 2, name: 'Sand',      K: 0.12, r: 0.4 },
  { id: 3, name: 'Grassland', K: 1.00, r: 0.9 },
  { id: 4, name: 'Scrub',     K: 0.45, r: 0.5 },
  { id: 5, name: 'Forest',    K: 0.80, r: 0.6 },
  { id: 6, name: 'Rock',      K: 0.15, r: 0.3 },
  { id: 7, name: 'Peak',      K: 0.00, r: 0.0 },
];

export const CLIMATE = {
  meanTemp: 10,        // °C, yearly average at the waterline
  seasonalAmp: 16,     // °C, so summer peaks ~26 and midwinter ~ -6
  peakDayFrac: 0.375,  // warmest point of the year = mid-summer
  dailyAmp: 4.5,       // °C swing between night and afternoon
  warmestHour: 0.62,   // fraction of the day (≈ 3 pm)
  lapseRate: 20,       // °C colder per 1.0 of elevation above the waterline
  anomalyReversion: 0.5, // how fast random warm/cold spells fade (per day)
  anomalyNoise: 2.2,     // °C, size of random warm/cold spells
  // Chance that the next weather spell is wet, by season (spring, summer, autumn, winter).
  wetChance: [0.42, 0.22, 0.40, 0.32],
  stormShare: [0.15, 0.35, 0.10, 0.0], // share of wet spells that are storms
  snowBelow: 0.5,      // °C: precipitation falls as snow below this
};

export const WATER = {
  levelSwing: 0.014,          // max rise/fall of the water level around normal
  recomputeThreshold: 0.0012, // recompute the water map after this much change
  rainToStorage: 0.30,        // how much a day of rain refills lakes
  baseEvaporation: 0.035,     // per day
  heatEvaporation: 0.0055,    // extra per day per °C above 8 °C
  snowmeltRate: 0.07,         // snowpack melted per day per °C above 1 °C
};

export const PLANTS = {
  updateEvery: 20,      // ticks between plant growth passes
  minGrowTemp: 5,       // °C, no growth below this
  optimumTemp: 18,      // °C, full growth from here...
  heatStressTemp: 29,   // ...until heat stress starts here
  seedRain: 0.0015,     // share of K that sprouts per day even on bare ground
  seedSpread: 0.02,     // extra sprouting per day next to lush neighbours
  frostDieback: 0.045,  // share of biomass lost per day below -1 °C
  floodDieback: 0.8,    // share of biomass lost per day while under water
  waterReach: 20,       // cells: how far lakes and rivers keep soil moist
};
