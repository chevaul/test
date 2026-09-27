// Soak test: run several worlds for several simulated years with no graphics
// and print a report. Use it after changing any balance number in config.js.
//
//   node test/soak.js            (5 seeds × 5 years)
//   node test/soak.js 10 20      (10 seeds × 20 years)

import { Simulation } from '../src/sim.js';
import { TIME } from '../src/config.js';

const seeds = Number(process.argv[2] || 5);
const years = Number(process.argv[3] || 5);
const pct = (v) => `${(v * 100).toFixed(0)}%`.padStart(5);

console.log(`Soak test: ${seeds} worlds × ${years} years (${years * TIME.daysPerYear} days each)\n`);
console.log('seed          plants min–max   water min–max   snow max   temp min–max   steps/s');
let problems = 0;
for (let s = 1; s <= seeds; s++) {
  const seed = `soak-${s}`;
  const sim = new Simulation({ seed });
  const r = { pMin: 1, pMax: 0, wMin: 1, wMax: 0, snow: 0, tMin: 99, tMax: -99 };
  const t0 = performance.now();
  for (let d = 0; d < years * TIME.daysPerYear; d++) {
    for (let h = 0; h < 4; h++) {
      sim.step(TIME.ticksPerDay / 4);
      const w = sim.world;
      r.pMin = Math.min(r.pMin, w.plants.fill); r.pMax = Math.max(r.pMax, w.plants.fill);
      r.wMin = Math.min(r.wMin, w.water.coverage); r.wMax = Math.max(r.wMax, w.water.coverage);
      r.snow = Math.max(r.snow, w.climate.snowpack);
      r.tMin = Math.min(r.tMin, w.climate.airTemp); r.tMax = Math.max(r.tMax, w.climate.airTemp);
    }
  }
  const rate = (years * TIME.daysPerYear * TIME.ticksPerDay) / ((performance.now() - t0) / 1000);
  const bad = !Number.isFinite(sim.world.plants.fill) || r.pMin < 0.15 || r.wMin < 0.05;
  if (bad) problems++;
  console.log(
    `${seed.padEnd(12)}  ${pct(r.pMin)} – ${pct(r.pMax)}    ${pct(r.wMin)} – ${pct(r.wMax)}    ${pct(r.snow)}    ${r.tMin.toFixed(0).padStart(4)} – ${r.tMax.toFixed(0).padStart(3)} °C   ${rate.toFixed(0).padStart(6)}${bad ? '   ⚠ check' : ''}`
  );
}
console.log(problems ? `\n${problems} world(s) need a look.` : '\nAll worlds stayed healthy.');
process.exitCode = problems ? 1 : 0;
