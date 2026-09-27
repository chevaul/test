// Renderer: draws the world in layers onto the main canvas.
// ground → trees and rocks → (animals, from Milestone 2) → night, clouds, rain and snow.

import { WORLD } from '../config.js';
import { Climate } from '../world/climate.js';
import { GroundLayer } from './ground.js';
import { DecorLayer } from './decor.js';
import { MAP_EDGE } from './palette.js';

const makeCanvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 1; this.height = 1; this.dpr = 1;
    this.particles = [];
    this.reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  setWorld(world) {
    this.world = world;
    this.ground = new GroundLayer(world, makeCanvas);
    this.decor = new DecorLayer(world, makeCanvas);
  }

  resize(width, height, dpr) {
    this.width = width; this.height = height; this.dpr = dpr;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
  }

  /** Refresh the cached layers. Ground is the expensive one, so callers throttle it. */
  refresh(time, force = false) {
    if (force || this.ground.lastTick < 0 || time.tick - this.ground.lastTick >= 15) this.ground.update(this.world, time);
    this.decor.update(this.world, time);
  }

  draw(camera, time, hoverCell) {
    const { ctx, dpr, width, height } = this;
    const z = camera.zoom;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = MAP_EDGE;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // World space
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (width / 2 - camera.x * z), dpr * (height / 2 - camera.y * z));
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.ground.canvas, 0, 0, WORLD.width, WORLD.height);
    if (z * dpr > this.decor.scale * 1.4) {
      // Close up: crisp vector trees for just the visible area.
      const hw = width / 2 / z, hh = height / 2 / z;
      this.decor.paintVisible(ctx, this.world, { x0: camera.x - hw, x1: camera.x + hw, y0: camera.y - hh, y1: camera.y + hh });
    } else {
      ctx.drawImage(this.decor.canvas, 0, 0, WORLD.width, WORLD.height);
    }

    if (hoverCell) {
      ctx.lineWidth = 1.5 / z;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.strokeRect(hoverCell.x * WORLD.cell, hoverCell.y * WORLD.cell, WORLD.cell, WORLD.cell);
      ctx.beginPath();
      ctx.arc((hoverCell.x + 0.5) * WORLD.cell, (hoverCell.y + 0.5) * WORLD.cell, 12 / z, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Screen space: light, clouds, precipitation.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const climate = this.world.climate;
    const light = Climate.sunlight(time.dayFrac);
    if (light < 1) {
      ctx.fillStyle = `rgba(10,20,46,${(0.58 * (1 - light)).toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
    }
    const glow = light > 0.05 && light < 0.85 ? Math.sin(Math.PI * (light - 0.05) / 0.8) : 0;
    if (glow > 0) {
      ctx.fillStyle = `rgba(255,150,70,${(0.07 * glow).toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
    }
    const cloud = climate.weather === 'cloudy' ? 0.1 : climate.precip > 0 ? 0.08 + 0.06 * climate.precip : 0;
    if (cloud > 0) {
      ctx.fillStyle = `rgba(52,62,74,${cloud.toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
    }
    this.drawPrecipitation(climate);
  }

  drawPrecipitation(climate) {
    const { ctx, width, height } = this;
    const want = climate.precip > 0 && !this.reducedMotion ? Math.round(Math.min(420, (width * height) / 5200) * climate.precip * 0.5) : 0;
    const P = this.particles;
    while (P.length < want) P.push({ x: Math.random() * width, y: Math.random() * height, s: 0.6 + Math.random() * 0.8 });
    if (P.length > want) P.length = want;
    if (!want) return;
    if (climate.snowing) {
      ctx.fillStyle = 'rgba(248,250,255,0.85)';
      for (const p of P) {
        p.y += 0.9 * p.s; p.x += Math.sin((p.y + p.s * 50) * 0.03) * 0.5;
        if (p.y > height) { p.y = -4; p.x = Math.random() * width; }
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.1 * p.s, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      ctx.strokeStyle = 'rgba(210,228,240,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const p of P) {
        p.y += 11 * p.s; p.x -= 2.5 * p.s;
        if (p.y > height) { p.y = -12; p.x = Math.random() * (width + 60); }
        ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 2.5 * p.s, p.y - 10 * p.s);
      }
      ctx.stroke();
    }
  }
}
