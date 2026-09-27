// Wildgene browser entry point: runs the simulation loop, drawing and the side panel.

import { WORLD, TIME, BIOMES, TERRAIN } from './config.js';
import { Simulation } from './sim.js';
import { Renderer } from './render/renderer.js';
import { SOIL, vegetationColours, WATER_SHALLOW } from './render/palette.js';
import { Camera } from './ui/camera.js';
import { drawHistoryChart } from './ui/chart.js';

const $ = (id) => document.getElementById(id);
const canvas = $('world');
const stage = $('stage');

const SEED_WORDS = ['fern', 'otter', 'basalt', 'heron', 'lichen', 'tundra', 'willow', 'marten', 'delta', 'thistle', 'aspen', 'plover'];
const randomSeed = () => `${SEED_WORDS[Math.floor(Math.random() * SEED_WORDS.length)]}-${Math.floor(Math.random() * 900 + 100)}`;

const state = {
  running: true,
  speed: 1,
  acc: 0,
  lastFrame: 0,
  frame: 0,
  hover: null,          // { x, y } grid cell under the pointer
  achievedSpeed: 1,
};

let sim, renderer, camera;

function readSeedFromUrl() {
  try { return new URLSearchParams(location.search).get('seed'); } catch { return null; }
}

function writeSeedToUrl(seed) {
  try {
    const url = new URL(location.href);
    url.searchParams.set('seed', seed);
    history.replaceState(null, '', url);
  } catch { /* some embedded viewers block history changes; the seed box still shows it */ }
}

function newWorld(seed) {
  sim = new Simulation({ seed });
  renderer.setWorld(sim.world);
  renderer.refresh(sim.time, true);
  camera.fit(renderer.width, renderer.height);
  $('seedInput').value = sim.seed;
  writeSeedToUrl(sim.seed);
  state.hover = null;
  updatePanel(true);
}

// ---------- sizing ----------
function resize() {
  const r = stage.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const wasFit = !camera.fitZoom || camera.isFitted();
  renderer.resize(r.width, r.height, dpr);
  if (wasFit) camera.fit(r.width, r.height);
  else camera.minZoom = Math.min(r.width / WORLD.width, r.height / WORLD.height) * 0.97 * 0.8;
}

// ---------- input ----------
function setupInput() {
  const pointers = new Map();
  let dragMoved = false, lastPinch = 0, hintHidden = false;
  const hideHint = () => { if (!hintHidden) { $('stageHint').classList.add('gone'); hintHidden = true; } };
  const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, local(e));
    dragMoved = false;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      lastPinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = local(e);
    if (pointers.has(e.pointerId)) {
      const prev = pointers.get(e.pointerId);
      pointers.set(e.pointerId, p);
      if (pointers.size === 1) {
        const dx = p.x - prev.x, dy = p.y - prev.y;
        if (Math.abs(dx) + Math.abs(dy) > 0) {
          if (!dragMoved && Math.hypot(dx, dy) < 2) return;
          dragMoved = true;
          canvas.classList.add('dragging');
          camera.pan(dx, dy);
          hideHint();
        }
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (lastPinch > 0) camera.zoomAt(d / lastPinch, (a.x + b.x) / 2, (a.y + b.y) / 2, renderer.width, renderer.height);
        lastPinch = d;
        dragMoved = true;
        hideHint();
      }
    }
    if (e.pointerType === 'mouse' || !dragMoved) setHover(p);
  });

  const end = (e) => {
    if (pointers.has(e.pointerId) && !dragMoved) setHover(local(e)); // a tap inspects a spot
    pointers.delete(e.pointerId);
    if (pointers.size < 2) lastPinch = 0;
    if (pointers.size === 0) canvas.classList.remove('dragging');
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !pointers.size) { state.hover = null; updateNotes(); } });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = local(e);
    camera.zoomAt(Math.exp(-e.deltaY * 0.0015), p.x, p.y, renderer.width, renderer.height);
    hideHint();
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    const step = 60;
    switch (e.key) {
      case ' ': e.preventDefault(); togglePlay(); break;
      case '+': case '=': camera.zoomAt(1.25, renderer.width / 2, renderer.height / 2, renderer.width, renderer.height); break;
      case '-': case '_': camera.zoomAt(0.8, renderer.width / 2, renderer.height / 2, renderer.width, renderer.height); break;
      case '0': camera.fit(renderer.width, renderer.height); break;
      case 'ArrowLeft': camera.pan(step, 0); break;
      case 'ArrowRight': camera.pan(-step, 0); break;
      case 'ArrowUp': camera.pan(0, step); break;
      case 'ArrowDown': camera.pan(0, -step); break;
      default: return;
    }
  });
}

function setHover(p) {
  const w = camera.screenToWorld(p.x, p.y, renderer.width, renderer.height);
  const cx = Math.floor(w.x / WORLD.cell), cy = Math.floor(w.y / WORLD.cell);
  state.hover = cx >= 0 && cy >= 0 && cx < WORLD.cols && cy < WORLD.rows ? { x: cx, y: cy } : null;
  updateNotes();
}

// ---------- controls ----------
function togglePlay() {
  state.running = !state.running;
  const b = $('playBtn');
  b.textContent = state.running ? 'Pause' : 'Play';
  b.setAttribute('aria-pressed', String(state.running));
}

function setupControls() {
  $('playBtn').addEventListener('click', togglePlay);
  for (const b of document.querySelectorAll('.speed button')) {
    b.addEventListener('click', () => {
      state.speed = Number(b.dataset.speed);
      for (const o of document.querySelectorAll('.speed button')) o.setAttribute('aria-pressed', String(o === b));
    });
  }
  $('seedForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('seedInput').value.trim();
    newWorld(v || randomSeed());
  });
  $('randomSeed').addEventListener('click', () => newWorld(randomSeed()));

  // Map key, built from the same colours the map uses.
  const veg = vegetationColours(0.3);
  const css = (c) => `rgb(${c.map((v) => Math.round(v)).join(',')})`;
  const items = [
    ['Lake or river', css(WATER_SHALLOW)],
    ['Grassland', css(veg.open)],
    ['Forest', css(veg.forest)],
    ['Marsh', css(veg.marsh)],
    ['Scrub', css([158, 150, 92])],
    ['Sand', css(SOIL[2])],
    ['Rock', css(SOIL[6])],
    ['Bare ground', css(SOIL[3])],
  ];
  $('legend').innerHTML = items.map(([n, c]) => `<li><i style="background:${c}"></i>${n}</li>`).join('');
}

// ---------- dial ----------
function arcPath(f0, f1, r = 47) {
  const a0 = 2 * Math.PI * f0 - Math.PI / 2, a1 = 2 * Math.PI * f1 - Math.PI / 2;
  const x0 = 60 + r * Math.cos(a0), y0 = 60 + r * Math.sin(a0);
  const x1 = 60 + r * Math.cos(a1), y1 = 60 + r * Math.sin(a1);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}
function setupDial() {
  const gap = 0.006;
  ['arcSpring', 'arcSummer', 'arcAutumn', 'arcWinter'].forEach((id, k) => {
    $(id).setAttribute('d', arcPath(k / 4 + gap, (k + 1) / 4 - gap));
  });
}

// ---------- panel ----------
const fmt = {
  pct: (v, d = 0) => `${(v * 100).toFixed(d)}%`,
  temp: (t) => `${Math.round(t) === 0 ? 0 : Math.round(t)} °C`,
  clock: (f) => {
    const m = Math.floor(f * 24 * 60);
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  },
};

function setMeter(id, value, text) {
  const el = $(id);
  el.querySelector('.m-value').textContent = text;
  el.querySelector('.m-bar i').style.width = `${Math.max(0, Math.min(1, value)) * 100}%`;
}

function updatePanel(force = false) {
  const t = sim.time;
  const w = sim.world;
  const c = w.climate;

  $('dialSeason').textContent = t.seasonName;
  $('dialDay').textContent = `Day ${t.dayOfSeason} of ${TIME.daysPerSeason}`;
  const a = 2 * Math.PI * t.yearFrac - Math.PI / 2;
  $('dialMark').setAttribute('cx', (60 + 47 * Math.cos(a)).toFixed(2));
  $('dialMark').setAttribute('cy', (60 + 47 * Math.sin(a)).toFixed(2));

  $('readYear').textContent = String(t.year);
  $('readClock').textContent = fmt.clock(t.dayFrac);
  $('readTemp').textContent = fmt.temp(c.airTemp);
  const night = t.dayFrac < 0.23 || t.dayFrac > 0.84;
  const sky = c.weatherLabel();
  $('readWeather').textContent = night && (sky === 'Clear' || sky === 'Cloudy') ? `${sky} night` : sky;

  setMeter('mPlants', w.plants.fill, `${fmt.pct(w.plants.fill)} of full`);
  setMeter('mWater', w.water.coverage / 0.3, `${fmt.pct(w.water.coverage, 1)} of map`);
  setMeter('mSoil', c.soilWet, c.soilWet > 0.66 ? 'Wet' : c.soilWet > 0.33 ? 'Moist' : c.soilWet > 0.08 ? 'Dry' : 'Parched');
  setMeter('mSnow', c.snowpack, c.snowpack < 0.02 ? 'None' : c.snowpack < 0.3 ? 'Light' : c.snowpack < 0.7 ? 'Moderate' : 'Deep');

  if (force || state.frame % 30 === 0) {
    const styles = getComputedStyle(document.documentElement);
    drawHistoryChart($('chart'), sim.history, [
      { key: 'plants', color: styles.getPropertyValue('--plants').trim(), min: 0, max: 1 },
      { key: 'water', color: styles.getPropertyValue('--water').trim(), min: 0.05, max: 0.3 },
    ], { grid: styles.getPropertyValue('--grid').trim(), band: styles.getPropertyValue('--band').trim() });
  }
  const note = state.running && state.speed > 1 && state.achievedSpeed < state.speed * 0.85
    ? `Running at about ${Math.max(1, Math.round(state.achievedSpeed))}× on this device.` : '';
  if ($('speedNote').textContent !== note) $('speedNote').textContent = note;
  updateNotes();
}

function updateNotes() {
  const h = state.hover;
  $('notesEmpty').hidden = !!h;
  $('notes').hidden = !h;
  if (!h) return;
  const w = sim.world;
  const i = h.y * WORLD.cols + h.x;
  const e = w.terrain.elevation[i];
  const wet = w.water.isWater[i];
  const altitude = Math.max(0, (e - w.terrain.baseWaterLevel) / (1 - w.terrain.baseWaterLevel)) * TERRAIN.maxAltitudeMetres;
  const land = BIOMES[w.terrain.biome[i]].name;
  $('nLand').textContent = wet ? (w.terrain.isRiver[i] ? 'River' : 'Lake') : land;
  $('nAlt').textContent = wet ? `${(w.water.depth(i) * TERRAIN.maxAltitudeMetres).toFixed(1)} m deep` : `${Math.round(altitude)} m`;
  $('nTemp').textContent = fmt.temp(w.temperatureAt(i));
  const K = w.plants.K[i];
  $('nFood').textContent = wet ? 'Drowned' : K > 0 ? `${fmt.pct(w.plants.biomass[i] / K)} of this spot's best` : 'None grows here';
  const d = w.water.distance[i] * WORLD.cell;
  $('nWater').textContent = wet ? 'Here' : `${d} m`;
}

// ---------- loop ----------
function loop(ts) {
  const dt = state.lastFrame ? Math.min(0.1, (ts - state.lastFrame) / 1000) : 1 / 60;
  state.lastFrame = ts;
  state.frame++;

  if (state.running) {
    state.acc += dt * 60 * state.speed;
    const want = Math.floor(state.acc);
    const start = performance.now();
    let done = 0;
    while (done < want) {
      sim.step(1);
      done++;
      if ((done & 7) === 0 && performance.now() - start > 12) break;
    }
    state.acc = done < want ? 0 : state.acc - done;   // drop what we couldn't fit
    const achieved = dt > 0 ? done / (dt * 60) : state.speed;
    state.achievedSpeed = state.achievedSpeed * 0.9 + achieved * 0.1;
  }

  renderer.refresh(sim.time);
  renderer.draw(camera, sim.time, state.hover);
  if (state.frame % 6 === 0) updatePanel();
  requestAnimationFrame(loop);
}

// ---------- start ----------
function start() {
  renderer = new Renderer(canvas);
  camera = new Camera();
  setupDial();
  setupControls();
  setupInput();
  window.addEventListener('resize', () => resize());
  resize();
  newWorld(readSeedFromUrl() || 'wildgene');
  // Handy from the browser console: wildgene.sim, wildgene.step(600) to skip a day.
  window.wildgene = {
    get sim() { return sim; },
    step(n = TIME.ticksPerDay) { sim.step(n); renderer.refresh(sim.time, true); updatePanel(true); },
  };
  requestAnimationFrame(loop);
}

start();
