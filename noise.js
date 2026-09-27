// 2D Perlin gradient noise plus fractal layering ("fBm").
// Used to generate natural-looking terrain and moisture from a seed.

const GX = [1, -1, 1, -1, 1, -1, 0, 0];
const GY = [1, 1, -1, -1, 0, 0, 1, -1];

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;

/** Returns noise(x, y) with values roughly in [-1, 1]. */
export function createNoise2D(rng) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = rng.int(i + 1);
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  return function noise(x, y) {
    const X = Math.floor(x), Y = Math.floor(y);
    const xf = x - X, yf = y - Y;
    const xi = X & 255, yi = Y & 255;
    const aa = perm[perm[xi] + yi] & 7;
    const ab = perm[perm[xi] + yi + 1] & 7;
    const ba = perm[perm[xi + 1] + yi] & 7;
    const bb = perm[perm[xi + 1] + yi + 1] & 7;
    const u = fade(xf), v = fade(yf);
    const x1 = lerp(GX[aa] * xf + GY[aa] * yf, GX[ba] * (xf - 1) + GY[ba] * yf, u);
    const x2 = lerp(GX[ab] * xf + GY[ab] * (yf - 1), GX[bb] * (xf - 1) + GY[bb] * (yf - 1), u);
    return lerp(x1, x2, v);
  };
}

/** Fractal Brownian motion: several octaves of noise, each finer and fainter. */
export function fbm(noise, x, y, octaves = 5, lacunarity = 2, gain = 0.5) {
  let sum = 0, amp = 1, freq = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(x * freq + o * 17.3, y * freq - o * 9.1);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}
