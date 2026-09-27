// Colours for drawing the world. Kept separate so the look can be tuned
// without touching simulation code. Colours are [r, g, b], 0–255.

import { BIOME } from '../config.js';

// Bare ground under each biome (what shows through when plants are eaten or dead).
export const SOIL = [];
SOIL[BIOME.MUD] = [118, 106, 84];
SOIL[BIOME.MARSH] = [102, 98, 72];
SOIL[BIOME.SAND] = [214, 196, 152];
SOIL[BIOME.GRASS] = [150, 128, 90];
SOIL[BIOME.SCRUB] = [172, 148, 106];
SOIL[BIOME.FOREST] = [88, 76, 58];
SOIL[BIOME.ROCK] = [132, 127, 118];
SOIL[BIOME.PEAK] = [168, 166, 164];

// Colour of lush vegetation through the year: [yearFrac, colour].
// Spring starts at 0, summer at 0.25, autumn at 0.5, winter at 0.75.
const VEG_KEYS = [
  [0.00, [132, 146, 84]],   // thawing, sparse fresh growth
  [0.12, [104, 164, 72]],   // spring flush
  [0.30, [86, 140, 60]],    // deep summer green
  [0.46, [120, 138, 64]],   // late-summer drying
  [0.58, [154, 142, 72]],   // autumn gold
  [0.72, [142, 120, 76]],   // late autumn brown
  [0.86, [120, 116, 86]],   // winter dormancy
  [1.00, [132, 146, 84]],
];

export function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function keyed(keys, f) {
  for (let k = 1; k < keys.length; k++) {
    if (f <= keys[k][0]) {
      const [f0, c0] = keys[k - 1], [f1, c1] = keys[k];
      return mix(c0, c1, (f - f0) / (f1 - f0));
    }
  }
  return keys[keys.length - 1][1];
}

/** Vegetation colours for this moment of the year, per biome family. */
export function vegetationColours(yearFrac) {
  const base = keyed(VEG_KEYS, yearFrac);
  return {
    open: base,
    forest: mix(base.map((v) => v * 0.72), [40, 78, 50], 0.35),
    marsh: mix(base, [78, 128, 96], 0.45),
  };
}

export const WATER_SHALLOW = [98, 160, 166];
export const WATER_DEEP = [32, 76, 112];
export const ICE = [208, 224, 232];
export const SNOW = [240, 243, 247];
export const MAP_EDGE = '#23455f';

// Tree canopies through 8 phases of the year (early/late of each season).
export const DECIDUOUS = [
  { tones: [[150, 178, 98], [138, 170, 92]], size: 0.75, alpha: 0.8 },   // early spring buds
  { tones: [[104, 160, 72], [96, 150, 66]], size: 1, alpha: 1 },          // late spring
  { tones: [[76, 132, 56], [70, 124, 54]], size: 1, alpha: 1 },           // early summer
  { tones: [[84, 124, 54], [96, 128, 56]], size: 1, alpha: 1 },           // late summer
  { tones: [[178, 152, 60], [150, 142, 62], [122, 130, 56]], size: 1, alpha: 1 },   // early autumn
  { tones: [[198, 112, 44], [212, 154, 62], [170, 74, 42], null], size: 0.95, alpha: 1 }, // late autumn (some bare)
  { tones: [null], size: 0.9, alpha: 1 },                                  // early winter (bare)
  { tones: [null], size: 0.9, alpha: 1 },                                  // late winter (bare)
];
export const CONIFER = [[44, 86, 62], [38, 78, 58]];
export const BARE_BRANCHES = [112, 98, 84];
