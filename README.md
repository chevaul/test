# Wildgene

A wildlife simulator that runs in the browser. Animals live in a changing landscape, find their own food and water, and pass on genes written in DNA, so populations evolve on their own.

**Status:** Milestone 1 of 6 (the world and its climate). Animals arrive in Milestone 2. See [docs/PROJECT.md](docs/PROJECT.md) for the full plan and task list.

## Try it

- **Online:** once GitHub Pages is on (Settings → Pages → Deploy from a branch → `main`, folder `/ (root)`), the simulator lives at `https://chevaul.github.io/test/`.
- **On your computer:** run a local web server in this folder, then open http://localhost:8000:
  ```
  python3 -m http.server 8000
  ```
  Opening `index.html` by double-clicking won't work, because browsers block modules loaded from files. For an offline copy, build the single-file version below.

Controls: drag to move, scroll or pinch to zoom, point at the map to read any spot. Space pauses, + and − zoom, arrows move, 0 resets the view. Add `?seed=anything` to the address to grow a specific world.

## What Milestone 1 simulates

- **Terrain:** lakes, winding rivers, marsh, beaches, grassland, scrub, forest, rock and snowy peaks, generated from a seed. The same seed always gives the same world.
- **Water:** lakes swell after rain and snowmelt and shrink through dry summers.
- **Plants:** every 4 m cell holds plant food that regrows by the logistic equation from ecology, faster when warm, wet and near water.
- **Climate:** four seasons, day and night, altitude cooling, rain, storms, snow, frozen lakes, and forests that bud, turn gold and lose their leaves.

Time runs fast: one day passes in about 10 seconds at 1×, and a year has 28 days.

## For developers

Plain JavaScript (ES modules), no dependencies and no build step. Node.js 18 or newer runs the tests.

```
npm test          # unit and world tests
npm run soak      # run 5 worlds for 5 simulated years and print a report
npm run build     # bundle everything into dist/wildgene.html (one offline file)
```

In the browser console, `wildgene.sim` is the running simulation and `wildgene.step(600)` skips ahead one day.

| Folder | Contents |
|---|---|
| `src/config.js` | Every tunable number |
| `src/sim.js` | The simulation core (no drawing, runs headless) |
| `src/core/` | Seeded random numbers and noise |
| `src/world/` | Terrain, water, plants, climate |
| `src/render/` | Drawing the map |
| `src/ui/` | Camera, chart, styles |
| `test/` | Automated tests and the soak report |
| `tools/` | The single-file build |
