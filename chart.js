// A tiny line chart for the side panel. No libraries: draws straight to a canvas.

import { TIME } from '../config.js';

/**
 * series: [{ key, color, min, max }] read from history rows.
 * Winter periods are shaded so seasonal patterns are easy to read.
 */
export function drawHistoryChart(canvas, history, series, { spanDays = TIME.daysPerYear * 2, grid = 'rgba(0,0,0,0.08)', band = 'rgba(120,150,190,0.14)' } = {}) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (history.length < 2) return;

  const end = history[history.length - 1].days;
  const start = Math.max(0, end - spanDays);
  const span = Math.max(1, Math.max(end, spanDays) - start);
  const X = (d) => ((d - start) / span) * w;
  const pad = 3;

  // Winter bands
  const yearLen = TIME.daysPerYear;
  ctx.fillStyle = band;
  for (let y0 = Math.floor(start / yearLen) * yearLen; y0 < end; y0 += yearLen) {
    const ws = y0 + TIME.daysPerSeason * 3, we = y0 + yearLen;
    const a = Math.max(start, ws), b = Math.min(end, we);
    if (b > a) ctx.fillRect(X(a), 0, X(b) - X(a), h);
  }
  // Mid line
  ctx.strokeStyle = grid;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, h / 2 + 0.5); ctx.lineTo(w, h / 2 + 0.5); ctx.stroke();

  for (const s of series) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 1.75;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let first = true;
    for (const row of history) {
      if (row.days < start) continue;
      const v = (row[s.key] - s.min) / (s.max - s.min);
      const x = X(row.days), y = pad + (1 - Math.min(1, Math.max(0, v))) * (h - pad * 2);
      if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
