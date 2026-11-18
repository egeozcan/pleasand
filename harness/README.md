# pleasand, without the screen

A harness for running the game headless and looking inside it while it runs.
No canvas, no audio, no browser. It loads the same `*.js` files `index.html`
loads, in the same order, and drives them a tick at a time. Everything is
deterministic: the seed decides the village, the clock only moves when you
step it, and `Math.random` is a seeded generator you can read and put back.

Made for agents: every fact comes back as JSON or text, every action is a
method or a JSON line, and every run can be reproduced from a scenario file.

```bash
node harness/cli.js run --seed 7 --ticks 600 --map 80x40
node harness/cli.js serve --seed 7        # keep a village, send commands
node harness/cli.js selftest              # check the harness itself
```

```js
const { open } = require("./harness");
const h = open({ seed: 7 });

h.until("g.rip > 0", { max: 20000 });   // play until somebody dies
h.describe();                            // who, where, what is hot, ascii map
h.back(3);                               // (with history on) three ticks before
h.why("GARY");                           // what Gary was doing, and what was around
```

---

## Three ways in

### 1. The CLI, one-shot

```bash
node harness/cli.js run --seed 3 --ticks 2000 \
  --std \
  --until "g.peasants.some(p => p.fire)" \
  --history 60 \
  --watch "rip=g.rip" --watch "pop=g.peasants.length" --every 30 \
  --profile --map 96x32 --events 12 --json
# --std installs the standard invariants, --history keeps the last 60 states,
# --until is where it stops (or --ticks, whichever comes first).
```

`--json` prints one object: `{ ok, seed, report, state, traces?, profile?, map?, ... }`.
Without it you get prose. `node harness/cli.js help` lists every flag.

```bash
node harness/cli.js run --seed 3 --ticks 4000 --until "g.rip > 0" --why GARY --json
node harness/cli.js replay run.json --json
```

Scenarios: `--scenario-out run.json` writes the seed plus every action you
took and the tick it happened on. `node harness/cli.js replay run.json`
plays it back and reports the new hash against the recorded one.

### 2. `serve`, a village that stays loaded

Load once, then send newline-delimited JSON. One response per line, same
`id` back.

```bash
printf '%s\n' \
  '{"id":1,"cmd":"step","n":600}' \
  '{"id":2,"cmd":"state"}' \
  '{"id":3,"cmd":"until","expr":"g.peasants.some(p => p.fire)","max":5000}' \
  '{"id":4,"cmd":"why","id":"GARY"}' \
  | node harness/cli.js serve --seed 7
```

`{"cmd":"help"}` lists the commands. Most of the library has a command:
`fill`, `ignite`, `spawnPeasant`, `breakOn`, `trace`, `profile`, `checkpoint`,
`back`, `diff`, `map`, `cell`, `find`, `eval`, `scenario`, `replay`… Snapshot
objects themselves stay on the server (they are typed arrays): take a
`checkpoint` id, and hand that to `back`, `restore` or `diff`.

A *scenario* does travel: it is small JSON and replays from the seed.

An error reply looks like
`{"id":9,"ok":false,"error":{"message":"...","stack":"...","tick":812},"state":{...}}`
and the village keeps running.

### 3. The library

```js
const h = require("./harness").open({ seed: 7 });
```

`h.g` is the live game object; `h.game.sandSet`, `h.game.mPlanMine`,
`h.game.MAT` etc. reach every function and table in every script. `h.eval(expr)`
runs an expression in the game's own scope.

---

## Debugging, in the order you will want it

**It went wrong at some point.**
`--history 120` keeps the last 120 tick-states (~1.2 MB each; 60 is a
comfortable amount). After the run,
`h.back(20)` puts the world back exactly 20 ticks (with `history(n, {every: k})`
a "tick" here is one kept frame), and you can step forward
again with a trace or breakpoint in place. `h.checkpoint("label")` /
`h.restore("label")` are for deliberate save points.

**I need it to stop when X happens.**
```js
h.breakOn("g.peasants.some(p => p.fire)", { id: "fire" });
h.breakOnChange("g.sites.length", { id: "sites" });
h.until("g.rip > 0");
```
A stop report carries the tick, the expression, the value (and the previous
one, for `breakOnChange`) and a `context`: every peasant, duck and site, and
the last few things the village said.

**Why is this peasant doing that?**
`h.why(idOrName)` returns its full state, mood (`pMood`), task, home, goal,
the site it is working on, the last things said about it, and a 29x13 ascii
map centred on it.

**What is actually there?**
- `h.state()` — tick, counts, resources, ideas, achievements, census, hash
- `h.histogram({limit})` — every material and how many cells
- `h.cell(x, y)` — material, temperature, latent heat, shade, the game's own readout
- `h.find("LAVA", {limit, near:{x,y}, detail})`
- `h.map({x, y, w, h, scale, mode:"mat"|"heat", overlay})`
- `h.entities()` / `h.peasant(id)` / `h.duck(id)` / `h.sites()`
- `h.events({since, kind, limit})` — the ticker, every death (with cause) and achievement, with ticks

**What changed?**
```js
const a = h.snapshot();  // or checkpoint("a")
h.step(100);
h.diff(a, h.snapshot());  // scalar changes, entity changes, census delta
```
`h.diff` compares two states the same way `state()` reads one.

**Watch a value over time.**
```js
h.trace({ rip: "g.rip", pop: "g.peasants.length", hot: "g.T.filter(t => t > 200).length" },
        { every: 10 });
h.step(3000);
h.traceReport();   // samples, first/last, min/max, non-finite, and every change
h.traceRows();     // [{tick, rip, pop, hot}, ...]
h.traceCSV();
```
`traceReport()` is usually enough to see which tick to look at; `back()` and
a breakpoint get you there.

**Where does the time go?**
```js
h.profiler(true); h.step(600); h.profile();
// phases: sandStep, heatStep, peasantsStep, ducksStep, partStep, sandPaint, toolHold
```
`heatStep` runs inside `sandStep`, so the shares overlap; the totals are the
truth. `msPerTick` is wall clock.

**It threw.**
Stepping rethrows, with `error.harness` attached: tick, stack, recent
actions, recent events, `state()`, an ascii map, and a replayable scenario.
`h.crashReport()` returns the same after the fact. `--crash-out file.json`
in the CLI writes it out.

**Something is corrupt.**
```js
h.standardInvariants();  // finite temperatures and latent heat, finite and
                         // in-grid people, valid material ids, array lengths,
                         // population caps
h.invariant("no lava in the sky", "(() => { const y = 10; for (let x = 0; x < g.gw; x++) if (g.m[y*g.gw+x] === MAT.LAVA) return false; return true; })()", { every: 30 });
```
An invariant stop names itself and the tick.

**Play a lot of villages and see what falls out.**
```bash
node harness/soak.js --seeds 1-8 --ticks 60000
node harness/soak.js --seeds 1-6 --preset rich --jobs 6
node harness/soak.js --seeds 1-6 --preset chaos --fail-on-stuck
node harness/soak.js --seeds 1-6 --preset leftovers --jobs 6   # snow, ice, salt, ash, glass, powder about
node harness/soak.js --seeds 1-6 --ticks 12000 --out soak.jsonl
```
`soak.js` runs each seed in its own process with the standard invariants
plus: valid states, unique ids, held things, site plans and stock,
peasants' task → site references, the ticker, and inventories. Every 30 ticks
it samples peasants and ducks: 2400 simulation ticks in a two-cell neighborhood
without work or behavior progress is a stall, including short escape cycles.
Work strokes, inventory, task/site changes and construction progress distinguish
productive stationary workers from stalled builders. Ducks' heading/quack clocks
and blocked-surfacing state catch escape loops without flagging ordinary paddling,
following or idling. Held units and paused time do not count.
A seed that stops, throws or hangs exits 1; `--fail-on-stuck` also fails on
stalled peasants or ducks. Otherwise stalls are warnings, not a clean result.
`--json` gives one line per seed.
`--out` writes one json line per seed. This is how the lamp-bracket and
dead-end-ladder bugs below were found; a recorded baseline is in
`harness/soak-baseline.txt`.

**Reproduce exactly.**
```js
const sc = h.scenario();       // { seed, ticks, hash, ops: [{at, op, args}] }
h.replay(sc);                  // resets, replays, compares hashes
```
Every harness action that changes the world (paint, heat, spawn, input,
`set`) is recorded with the tick it happened on. Note: raw mutations through
`h.eval` or `h.game.*` are *not* recorded, so keep a scenario honest by
doing things through the harness when you want it replayable.

---

## Acting on the world

```js
// paint (straight into the grid, at the material's own temperature)
h.place(x, y, "WOOD");
h.fill(x, y, w, h, "SAND");
h.paintLine(x0, y0, x1, y1, "STONE");
h.paintDisc(cx, cy, r, "LAVA");
h.erase(x, y, w, h);
h.ignite(x, y);                     // a match
h.addHeat(x, y, 400);               // degrees into one cell
h.setTemp(x, y, 1200);              // crude, for experiments
h.heatBrush(x, y, +1, 6);           // the HEAT brush, radius 6

// people and things
h.spawnPeasant(x, y);
h.spawnDuck(x, y);
h.give(["bucket", "farm", "mine"]); // teach the village (the game's idea ids:
// farm lamp bucket dig grave fish scarecrow festival mine masonry smelt lift bell oil rocket
// forge post statue forest potash salt powder glass)

// the real input path (picker, tap handler, painting, throws)
h.select("LIGHTNING");
h.mouse(x, y); h.down(); h.drag(x0, y0, x1, y1, {ticks: 6}); h.up();
h.tap(x, y); h.key("t"); h.wheel(1);
h.flick(30, -8);                    // cursor speed for a throw
```

Material names are the game's: `"SAND"`, `"salt water"`, `"IRON ORE"`… and
`"EMPTY"` erases. Numbers are accepted too.

## Time and determinism

| call | meaning |
| --- | --- |
| `h.ticks` | updates since reset (one per `gameUpdate`) |
| `h.g.tick` | sand ticks (does not move while paused) |
| `h.g.t` | game seconds |
| `h.hash()` | fingerprint of grid, people, dice and clock (~3 ms) |

- `open({seed})` / `h.reset(seed)` — same seed, same village, byte for byte.
  Reset replays the scripts' own load-time dice (256 draws, for the smoke
  palette) and then `gameInit`, so it matches a fresh load exactly.
- Pausing (`h.pause()`) still advances `h.ticks` and the virtual clock, just
  not the sand — as in the browser.
- Snapshots copy the simulation, not the drawing: canvases, pixel buffers,
  the sky and per-tick scratch are left alone; hats and duck kinds are kept
  by identity because the game compares them with `===`. A snapshot is about
  1.2 MB.
- Determinism holds within a Node version and a machine. Do not stub, edit
  or reorder the game scripts between two runs you mean to compare.
- `reset(seed)` starts a new village. It does not undo damage to the scripts
  themselves (if you did `h.set("sandStep", null)`, open a new harness).

## Files

- `loader.js` — reads `index.html` for the script list, compiles the game
  into one scope, stubs the canvas and audio, seeds `Math.random`, owns the clock
- `snapshot.js` — copies the whole game state and puts it back, identity and all
- `inspect.js` — state, census, cells, searches, ascii maps, entity dossiers, `why()`
- `harness.js` — the object: time, tracing, breakpoints, invariants, profiling,
  events, input, snapshots, scenarios
- `cli.js` — `run`, `serve`, `selftest`
- `selftest.js` — 25 checks of the harness's own promises
- `args.js` — the argument parser the cli and soak runner share
- `soak.js` — many seeds, long runs, presets, invariants and stuck-unit reports
- `stuck.js` — sampled work/behavior progress and short-cycle detection for peasants and ducks
- `playtests/` — duck escape/timeout regressions, replayable scenarios and the playtest report
