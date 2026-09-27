// Seeded pseudo-random number generator (mulberry32).
// Every random choice in the simulation comes from an RNG like this one,
// so the same seed always reproduces the same world, exactly.

export function hashSeed(seed) {
  // Accept numbers or any text ("wolves", "42") and turn it into a 32-bit integer.
  const s = String(seed);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export class RNG {
  constructor(seed) {
    this.state = hashSeed(seed) || 1;
  }

  /** Uniform float in [0, 1). */
  next() {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min, max) { return min + (max - min) * this.next(); }
  int(n) { return Math.floor(this.next() * n); }
  chance(p) { return this.next() < p; }
  pick(list) { return list[this.int(list.length)]; }

  /** Standard normal sample (Box–Muller). */
  gauss() {
    let u = 0;
    while (u === 0) u = this.next();
    const v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /** A new independent generator derived from this one. */
  fork(label) {
    return new RNG(`${this.state}:${label}`);
  }
}
