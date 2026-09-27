# Wildgene project plan

*v0.2. Plan approved; this file is the running tracker and is updated with every milestone.*

## 1. Goal

A 2D wildlife simulator where animals live in a changing landscape, must find their own food and water to survive, and reproduce sexually. They pass on genes that are written in DNA and inherited by the same rules as real genes. Over generations, populations evolve on their own in response to their environment, with nothing scripted.

## 2. How the original requirements map to this plan

| Requirement | Covered by |
|---|---|
| Simulate a living environment | A1–A5 |
| Simulate genes that work like real genes | B1–B7 |
| Entities eat, drink, and need sustainable food to survive | C1–C5 |
| A simulator of real-world wildlife | D1–D4, plus the viewing tools in E |

## 3. Decisions (approved)

| Decision | Choice | Why |
|---|---|---|
| D1. Platform | Browser, 2D, HTML Canvas | Opens from a link on any device, nothing to install; free hosting on GitHub Pages; can be built and tested headless |
| Language | JavaScript (ES modules, no framework, no build step) | Fast enough (world core runs ~9,000 steps per second headless, ~150× what 1× speed needs), one language for simulation, drawing, interface and tests; TypeScript remains an option later |
| D2. Realism | Real biological mechanisms, sped-up clock | Faithful where it matters, watchable in minutes |
| D3. "Sustainable food" | Proper diet plus renewable but limited food; overgrazing causes famine | Food regrows, but only so fast |
| D4. Species | Rabbit, deer, wolf, plus a plant grid | Smallest roster with competition, predation and two breeding strategies |
| D5. Look | Top-down 2D map with a field-almanac side panel | Clear at every zoom level, and fast |
| D6. Mutation rate | About one new mutation per gamete, adjustable | Evolution visible within minutes |

Assumptions: audience is curious people and students; one map of 1600 × 1000 m with a few hundred animals; Claude writes and tests the code, the project owner reviews each milestone before the next starts; no deadline, so the plan uses milestones rather than dates.

## 4. Features

### A. The living environment

**A1. Terrain and biomes.** Layered Perlin noise produces elevation and moisture maps; each spot's biome comes from the two. Rivers are carved where a separate noise field crosses zero. Stored as a 400 × 250 grid of 4 m cells. *Why:* natural-looking, fast, and reproducible from a seed.

**A2. Water that rises and falls.** A cell is water when its elevation is below the current water level, which rises with rain and snowmelt and falls with evaporation. A flood fill computes every cell's distance to water after each change. *Why:* one shared map lets hundreds of thirsty animals find water without separate path-finding.

**A3. Plants that grow back.** Each cell follows the logistic growth equation, dB/dt = r·B·(1 − B/K), scaled by temperature, soil water and closeness to water, plus seed rain that is faster next to lush neighbours. *Why:* the standard ecology model for renewable resources; light grazing is sustainable, overgrazing causes famine.

**A4. Seasons, day and night, temperature, weather.** Four seasons of 7 days; temperature from a seasonal curve, a daily swing, random warm and cold spells and altitude cooling (~0.7 °C per 100 m). Weather spells (clear, cloudy, rain, storm, snow) with season-dependent odds; snowpack melts into a spring flood. *Why:* seasons create boom-and-bust cycles and shifting selection.

**A5. Decomposition and nutrient recycling.** Carcasses feed scavengers, then rot and fertilise the soil. *(Arrives with animals in M2–M4.)*

### B. Genes that work like real genes

**B1. Genes written in DNA.** 8 codons (24 letters) per gene, translated with the real 64-codon genetic code; amino acids scored by hydrophobicity (Kyte–Doolittle); an early stop codon makes a null allele.
**B2. Two copies of each gene, with dominance.** Additive, recessive loss of function, and MC1R-style pigment dominance.
**B3. Sexual reproduction by meiosis.** 4 chromosome pairs plus X/Y; about one crossover per chromosome, which also creates linkage.
**B4. Mutations.** Per-letter substitutions, transitions twice as common as transversions; each labelled silent, missense, nonsense or non-coding.
**B5. Sex chromosomes and X-linked traits.** XX/XY; a clotting gene on the X.
**B6. Genetic disorders and inbreeding.** Hemoglobin-like and clotting genes; broken alleles at a few percent in founders; kin avoidance when possible.
**B7. Every trait has a cost.** Benefits and costs are paid through energy, behaviour and reproduction.

| Gene | Chromosome | Controls | Inheritance | Benefit | Cost | Inspired by |
|---|---|---|---|---|---|---|
| SIZ | 1 | Body size | Additive | Bigger fat reserve, wins fights, holds heat | Needs more food, costlier babies | IGF1 |
| SPD | 1 | Muscle and top speed | Additive | Escapes or catches prey | Burns more energy | ACTN3 |
| SEN | 2 | Eyesight range | Additive | Spots food, water, mates, danger sooner | Eyes and brain use energy | Eye development genes |
| FUR | 2 | Coat thickness | Additive | Survives cold | Overheats and gets thirsty in summer | FGF5 |
| PIG | 3 | Coat colour | Dark dominant, light recessive | Camouflage on matching ground | Stands out elsewhere | MC1R |
| FER | 3 | Litter size | Additive | More babies | Drains the mother | BMPR1B |
| LIF | 4 | Lifespan | Additive | Longer life | Matures later | FOXO3 |
| HBB | 4 | Oxygen transport (stamina) | Recessive disorder | Better stamina | Two broken copies cause anemia | HBB |
| F8 | X | Blood clotting | X-linked recessive | Wounds heal | Broken copy makes injuries deadly | F8 |

### C. Eating, drinking, and survival

**C1. Energy and metabolism** (Kleiber's law, mass^0.75). **C2. Water and thirst.** **C3. Diet and the food web** (niche partitioning between rabbits and deer). **C4. Sustainable food: carrying capacity and famine** (emergent, not programmed). **C5. Aging and causes of death** (Gompertz law).

### D. Wildlife behaviour

**D1. Needs-driven decisions** (utility scoring every few ticks, with hysteresis). **D2. Senses, camouflage and memory** (forest refuges, remembered water). **D3. Hunting and escaping** (stamina-limited sprints, size-based attack odds, injuries). **D4. Mating, pregnancy and raising young** (breeding season, embryo reabsorption, nursing as energy transfer).

**Movement.** Two layers. The brain picks a goal and a gait every ~5 ticks. The legs steer every tick using Reynolds steering behaviours (arrive, pursue with prediction, flee, wander, follow, separate), limited by gene-based top speed, inertia, a turn rate that tightens at speed (so rabbits can out-turn wolves), water feelers, stamina and an energy cost ∝ mass × speed².

### E. Tools for watching and understanding

**E1. Map view** (pan, zoom, seasonal trees). **E2. Animal inspector and genome viewer.** **E3. Population and evolution charts.** **E4. Statistics and event log.** **E5. Controls** (speed 1×–30×, seed, release animals, sliders, immigration).

### F. Engineering foundations

| Foundation | How | Why |
|---|---|---|
| Simulation separate from drawing | Pure-logic core in fixed ticks; drawing only reads state | 30× speed and graphics-free tests with identical results |
| Seeded randomness | Every simulation random choice comes from one seeded generator | A seed reproduces a world exactly |
| Performance | Spatial grid, staggered decisions, per-frame time budget, level-of-detail drawing | Smooth at 1× with ~500 animals |
| Automated headless tests | `npm test` and `npm run soak` in Node | Catches crashes, runaway values, and later proves Mendelian ratios |

## 5. Species in v1

| Species | Role | Eats | Adult mass | Matures | Pregnancy | Litter | Lifespan |
|---|---|---|---|---|---|---|---|
| Rabbit | Small prey, fast breeder | Grass, prefers open land | ~2 kg | 6 days | 3 days | ~4 | ~45 days |
| Deer | Large prey, slow breeder | Grass and forest browse | ~60 kg | 14 days | 6 days | 1–2 | ~110 days |
| Wolf | Predator and scavenger | Meat | ~35 kg | 12 days | 5 days | ~3 | ~100 days |
| Plants | Producers | Sun, water, soil | 100,000-cell grid | n/a | n/a | n/a | Regrow continuously |

## 6. Time scale

600 ticks make one day, about 10 seconds at 1×. A season is 7 days and a year is 28 days (about 5 minutes at 1×, 30 seconds at 10×).

## 7. Architecture and repository layout

```
index.html              page shell (loads src/main.js as an ES module)
src/
  config.js             every tunable number
  sim.js                Simulation: pure logic, no DOM
  core/                 rng.js (seeded random), noise.js (Perlin + fBm)
  world/                terrain.js, water.js, plants.js, climate.js, world.js
  render/               palette.js, ground.js, decor.js, renderer.js
  ui/                   camera.js, chart.js, styles.css
  main.js               browser loop, input, side panel
test/                   *.test.js (node:test) and soak.js (multi-year report)
tools/build.js          bundles everything into dist/wildgene.html (one offline file)
docs/PROJECT.md         this file
```

Future folders: `src/genetics/` (M3) and `src/animals/` (M2–M4).

## 8. Milestones

| Milestone | What you can check | Done when |
|---|---|---|
| M1. World and climate | A living map: grass greens in spring, ponds dry in summer, snow in winter; pan and zoom | Same seed gives the same map, and a full year runs smoothly |
| M2. Survival | Rabbits (no breeding yet) graze, drink, remember water, rest, and die of real causes; basic inspector | Rabbits leave overgrazed areas or starve there, and causes of death are recorded |
| M3. Genetics and reproduction | DNA genomes, meiosis, mutations, dominance, X and Y, pregnancy, nursing, aging; genome viewer | Automated test crosses match Mendelian ratios, and rabbits sustain themselves through a year |
| M4. Food web | Deer, wolves, hunting, stamina, camouflage, injuries, carcasses, decay | All three species coexist for 10+ simulated years in most test seeds |
| M5. Charts and insight | Population, trait and allele charts; statistics; event log; full controls | A trait can be watched shifting over generations and traced back to DNA |
| M6. Balance and polish | Tuning, performance, mobile layout, in-app help | Smooth at 1× with ~500 animals, stable at 10× |

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Ecosystem collapse | Headless tuning runs on many seeds, forest refuges, food-limited populations, optional immigration |
| Too slow in the browser | Spatial grid, staggered decisions, per-frame time budget, simpler drawing when zoomed out |
| Realism versus watchability | Sped-up clock and mutation rate, labelled in the app |
| Runaway traits | Every gene has a cost; bounded ranges; tests flag drift |
| Genetics too hard to follow | Plain-language summary first, DNA on request |
| One tweak breaks another | All balance numbers in `config.js`; soak runs after each change |
| Scope creep | v1 frozen; new ideas go to the v2 list |

## 10. Not in v1

Plant species with their own genes, diseases and parasites, pack hunting and herds, speciation, learning or neural-network brains, save/load and CSV export, climate-change scenarios, 3D graphics.

## 11. How we work

Each milestone is one build-and-review cycle. Claude builds and tests the milestone and delivers the changed files (or, with a repo token, a branch and pull request). The owner reviews, uploads or merges, and gives the go-ahead for the next milestone.

## 12. Progress log

**M0 and M1 delivered.** Repository scaffold, plan, headless tests, single-file build. The world: seeded terrain with lakes, winding rivers, marsh, beaches, grassland, scrub, forest, rock and snowy peaks; lakes that swell after rain and snowmelt and shrink in summer; logistic plant regrowth driven by season, temperature, soil moisture and nearness to water; seasons, day and night, weather spells, snowpack and frozen lakes; forests that bud, turn gold, drop their leaves and carry snow; pan, zoom, pinch, keyboard controls; field notes for any spot on the map; conditions chart. 12 automated tests pass; a 5-world × 5-year soak stays healthy at ~9,000–10,000 steps per second headless.

Notes carried into M2: standing plant food in autumn and winter is dormant, so it should be less nourishing than spring growth; deep snow should slow movement and make grazing harder.

## 13. Task list

**Status:** M1 in review. **Next:** M2, survival. **Blocked:** waiting on review of M1.

- [x] Draft and approve project plan
- [x] M0 Repository scaffold: README, docs, folders, test runner, build tool
- [x] M1.1 Seeded random generator and noise terrain
- [x] M1.2 Water: levels, rivers, distance-to-water map
- [x] M1.3 Plant grid with logistic regrowth
- [x] M1.4 Seasons, day and night, temperature, weather
- [x] M1.5 Map drawing with pan, zoom and seasonal trees
- [x] M1.6 Headless tests and soak report
- [ ] Owner: review M1, upload to the repo, turn on GitHub Pages
- [ ] M2.1 Animal core: position, needs (energy, hydration), metabolism (Kleiber's law)
- [ ] M2.2 Movement: brain and legs (steering behaviours, water feelers, terrain speed)
- [ ] M2.3 Grazing, drinking, remembered water; seasonal food quality; snow effects
- [ ] M2.4 Death causes and statistics
- [ ] M2.5 Drawing animals, click to select, basic inspector
- [ ] M2.6 Tests: animals find water, starve when food is removed, deterministic runs
