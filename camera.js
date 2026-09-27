// Camera: which part of the world is on screen, and how zoomed in.

import { WORLD } from '../config.js';

export class Camera {
  constructor() {
    this.x = WORLD.width / 2;   // world point at the centre of the screen
    this.y = WORLD.height / 2;
    this.zoom = 1;              // screen pixels per metre
    this.minZoom = 0.2;
    this.maxZoom = 6;
  }

  /** Show the whole map; on tall, narrow screens fill the height and let people pan sideways. */
  fit(viewW, viewH) {
    const contain = Math.min(viewW / WORLD.width, viewH / WORLD.height) * 0.97;
    const portrait = viewH > viewW * 0.9;
    this.zoom = portrait ? Math.min(viewH / WORLD.height, contain * 2.2) : contain;
    this.minZoom = contain * 0.8;
    this.fitZoom = this.zoom;
    this.x = WORLD.width / 2;
    this.y = WORLD.height / 2;
  }

  isFitted() { return Math.abs(this.zoom - this.fitZoom) < 1e-9; }

  screenToWorld(sx, sy, viewW, viewH) {
    return { x: this.x + (sx - viewW / 2) / this.zoom, y: this.y + (sy - viewH / 2) / this.zoom };
  }

  zoomAt(factor, sx, sy, viewW, viewH) {
    const before = this.screenToWorld(sx, sy, viewW, viewH);
    this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * factor));
    const after = this.screenToWorld(sx, sy, viewW, viewH);
    this.x += before.x - after.x;
    this.y += before.y - after.y;
    this.clamp();
  }

  pan(dxScreen, dyScreen) {
    this.x -= dxScreen / this.zoom;
    this.y -= dyScreen / this.zoom;
    this.clamp();
  }

  clamp() {
    this.x = Math.min(WORLD.width, Math.max(0, this.x));
    this.y = Math.min(WORLD.height, Math.max(0, this.y));
  }
}
