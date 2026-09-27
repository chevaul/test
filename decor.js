// Decor layer: trees, reeds and rocks, drawn once per phase of the year
// (8 phases: early and late of each season) so forests bud, turn gold, drop
// their leaves and carry snow.

import { WORLD, BIOME } from '../config.js';
import { RNG } from '../core/rng.js';
import { DECIDUOUS, CONIFER, BARE_BRANCHES } from './palette.js';

const rgb = (c, k = 1, a = 1) =>
  `rgba(${Math.round(Math.min(255, c[0] * k))},${Math.round(Math.min(255, c[1] * k))},${Math.round(Math.min(255, c[2] * k))},${a})`;

export class DecorLayer {
  constructor(world, createCanvas, scale = 1.5) {
    this.scale = scale;
    this.canvas = createCanvas(Math.round(WORLD.width * scale), Math.round(WORLD.height * scale));
    this.ctx = this.canvas.getContext('2d');
    this.key = '';
    this.items = DecorLayer.place(world);
  }

  static place(world) {
    const { terrain } = world;
    const { cols, rows, biome, elevation, baseWaterLevel } = terrain;
    const rng = new RNG(`decor:${world.seed}`);
    const trees = [], reeds = [], rocks = [];
    const dryLine = baseWaterLevel + 0.03; // trees only above the highest flood line
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const b = biome[i], e = elevation[i];
        const px = (x + rng.next()) * WORLD.cell, py = (y + rng.next()) * WORLD.cell;
        if (b === BIOME.FOREST && e > dryLine && rng.chance(0.3)) {
          const coniferOdds = 0.2 + Math.max(0, (e - 0.55) * 2.2);
          trees.push({ x: px, y: py, r: rng.range(2.2, 4.4), conifer: rng.chance(coniferOdds), tone: rng.next(), v: rng.range(0.9, 1.1) });
        } else if ((b === BIOME.GRASS || b === BIOME.SCRUB) && e > dryLine && rng.chance(0.006)) {
          trees.push({ x: px, y: py, r: rng.range(2.6, 4.8), conifer: rng.chance(0.15), tone: rng.next(), v: rng.range(0.9, 1.1) });
        } else if (b === BIOME.MARSH && rng.chance(0.07)) {
          reeds.push({ x: px, y: py, a: rng.range(-0.5, 0.5), h: rng.range(1.5, 3) });
        } else if (b === BIOME.ROCK && rng.chance(0.05)) {
          rocks.push({ x: px, y: py, r: rng.range(1.2, 3.2), k: rng.range(0.85, 1.1) });
        }
      }
    }
    trees.sort((a, b) => a.y - b.y);
    return { trees, reeds, rocks };
  }

  /** Redraw only when the phase of the year or the snow state changes. */
  update(world, time) {
    const phase = Math.floor(time.yearFrac * 8) % 8;
    const snowy = world.climate.snowpack > 0.15 && world.climate.seasonalTemp < 3;
    const key = `${phase}:${snowy}`;
    if (key === this.key) return false;
    this.key = key;
    this.draw(world, phase, snowy);
    return true;
  }

  draw(world, phase, snowy) {
    const ctx = this.ctx, s = this.scale;
    this.phase = phase;
    this.snowy = snowy;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(s, 0, 0, s, 0, 0);
    this.paint(ctx, world, phase, snowy, this.items);
  }

  /**
   * When zoomed in close, draw only the visible items directly as crisp vector
   * shapes instead of stretching the cached layer. `ctx` must be in world space.
   */
  paintVisible(ctx, world, bounds) {
    const pad = 8;
    const inside = (o) => o.x > bounds.x0 - pad && o.x < bounds.x1 + pad && o.y > bounds.y0 - pad && o.y < bounds.y1 + pad;
    const items = {
      trees: this.items.trees.filter(inside),
      reeds: this.items.reeds.filter(inside),
      rocks: this.items.rocks.filter(inside),
    };
    this.paint(ctx, world, this.phase, this.snowy, items);
  }

  paint(ctx, world, phase, snowy, { trees, reeds, rocks }) {
    const season = DECIDUOUS[phase];
    const water = world.water;

    // Rocks
    for (const k of rocks) {
      ctx.fillStyle = 'rgba(30,30,30,0.25)';
      ctx.beginPath(); ctx.ellipse(k.x + 0.6, k.y + 0.8, k.r, k.r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgb([150, 146, 138], k.k);
      ctx.beginPath(); ctx.ellipse(k.x, k.y, k.r, k.r * 0.72, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = snowy ? 'rgba(245,247,250,0.9)' : rgb([182, 178, 170], k.k, 0.8);
      ctx.beginPath(); ctx.ellipse(k.x - k.r * 0.25, k.y - k.r * 0.25, k.r * 0.5, k.r * 0.35, 0.4, 0, Math.PI * 2); ctx.fill();
    }

    // Reeds (hidden while the marsh is flooded or frozen and snowed over)
    ctx.lineWidth = 0.45;
    ctx.strokeStyle = phase >= 5 ? 'rgba(150,132,90,0.9)' : 'rgba(70,98,58,0.9)';
    ctx.beginPath();
    for (const r of reeds) {
      const i = world.cellIndex(r.x, r.y);
      if (i >= 0 && water.isWater[i] && water.depth(i) > 0.01) continue;
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x + Math.sin(r.a) * r.h, r.y - Math.cos(r.a) * r.h);
    }
    ctx.stroke();

    // Tree shadows first, then crowns, so neighbours overlap naturally.
    ctx.fillStyle = 'rgba(16,28,18,0.26)';
    ctx.beginPath();
    for (const t of trees) {
      const bare = !t.conifer && season.tones[Math.floor(t.tone * season.tones.length)] === null;
      const r = t.r * (t.conifer ? 0.9 : season.size) * (bare ? 0.8 : 1);
      ctx.moveTo(t.x + r * 0.45 + r, t.y + r * 0.5);
      ctx.ellipse(t.x + r * 0.45, t.y + r * 0.5, r, r * 0.8, 0, 0, Math.PI * 2);
    }
    ctx.fill();

    for (const t of trees) {
      if (t.conifer) {
        const c = CONIFER[phase >= 6 ? 1 : 0];
        const r = t.r * 0.9;
        ctx.fillStyle = rgb(c, t.v);
        ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = snowy ? 'rgba(242,245,249,0.92)' : rgb(c, t.v * 1.28, 0.9);
        ctx.beginPath(); ctx.arc(t.x - r * 0.28, t.y - r * 0.28, r * (snowy ? 0.62 : 0.45), 0, Math.PI * 2); ctx.fill();
        continue;
      }
      const tone = season.tones[Math.floor(t.tone * season.tones.length)];
      const r = t.r * season.size;
      if (tone === null) {
        // Bare deciduous tree seen from above: a loose ring of branches.
        ctx.strokeStyle = rgb(BARE_BRANCHES, t.v, 0.75);
        ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.arc(t.x, t.y, r * 0.75, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(t.x - r * 0.7, t.y); ctx.lineTo(t.x + r * 0.7, t.y);
        ctx.moveTo(t.x, t.y - r * 0.7); ctx.lineTo(t.x, t.y + r * 0.7);
        ctx.stroke();
        if (snowy) {
          ctx.fillStyle = 'rgba(242,245,249,0.8)';
          ctx.beginPath(); ctx.arc(t.x - r * 0.2, t.y - r * 0.2, r * 0.3, 0, Math.PI * 2); ctx.fill();
        }
        continue;
      }
      ctx.fillStyle = rgb(tone, t.v, season.alpha);
      ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgb(tone, t.v * 1.22, 0.7 * season.alpha);
      ctx.beginPath(); ctx.arc(t.x - r * 0.3, t.y - r * 0.3, r * 0.52, 0, Math.PI * 2); ctx.fill();
    }
  }
}
