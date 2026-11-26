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

**Is it fast enough?** `bench.js` is the spec's measurement (docs/wide-valley-spec.md
§7): 1088 wide, at 4x, seeds 3, 7 and 14, 20 000 sand ticks each (5 000
`gameUpdate`s, four world ticks in each, nobody touching anything), every
`gameUpdate` timed on its own. Each seed runs in a fresh process, one after
another. JSON on stdout, progress on stderr.
```bash
node harness/bench.js                        # median, p95, p99, max per seed; the budget, met or not
node harness/bench.js --phases               # and each phase's share (sandStep, heatStep inside it, peasantsStep...)
node harness/bench.js --dir ../wip           # that checkout's game, this harness
node harness/bench.js --seeds 3 --ticks 4000 --warm 500 --runs 3
```
Each seed also reports the mean of each tenth of the run (`tenths`: where in
the run the time goes) and `hash()` at the end. On the dev laptop, quiet,
0580e71 takes 12.8-13.2 ms median and 13.8-14.4 ms p95; two runs agree to
about 1.5%.

**And after a long while?** The 20 000 ticks are an early valley. A valley that
has played on warms through (heat leaves only at the room's edges; lanterns,
campfires, the furnace, fire and lava keep adding it), and what passes by a cold
row stops applying. Every run reports its `lateWindow` apart from the whole: the
frames from `--window-from` sand ticks into the run (half way by default) to the
end, so `--ticks 80000` gives the whole run and ticks 40 000-80 000 on their own.
That takes 20 minutes a seed on 0580e71; for A/B, start from saves instead:
```bash
node harness/bench.js --dir ../base --ticks 60000 --save-out warm/seed{seed}-60k.json   # once, from the reference tree
node harness/bench.js --late warm                          # seeds 3, 7, 14, each 8 000 ticks on from its save
node harness/bench.js --late warm --phases                 # where a warmed valley's time goes
node harness/bench.js --late warm --ab ../base ../wip --lockstep --rounds 3
node harness/bench.js --load save.json --ticks 4000        # any one save
```
`--save-out` saves the village where the run ends (`{seed}` becomes the seed; the
result gives the file, its `hash()` and its `stateHash`). A save loaded plays on
exactly as the village would have without it. `--late` with no directory looks in
`$PLEASAND_WARM`, then `harness/warm`. It takes each seed's `seed<N>-60k.json`, or,
where there is none, the one `seed<N>-<n>k.json` there is, so a directory of saves
from tick 150 000 (`seed3-150k.json`...) works the same way.

**The edges of the budget.** Two valleys were still over it at 4x after the round
that brought the plain one under: the long organ game (seeds 3 and 7 have the steam
organ finished by tick 150 000, and a builder about it searches for a route every
tick) and soak.js's leftovers village (snow and ice about it: a fifth of the cells
off room temperature). `--preset NAME` puts one of soak.js's presets (`plain`,
`rich`, `chaos`, `leftovers`) on the village before it plays, exactly as `same.js`
does: after the save, if there is one, before the speed. It goes with `--ticks`,
`--load`, `--late`, `--save-out` and `--ab --lockstep`.
```bash
# the saves, once, from the reference tree
node harness/bench.js --dir ../base --ticks 150000 --save-out saves/warm150/seed{seed}-150k.json
node harness/bench.js --dir ../base --preset leftovers --ticks 40000 --save-out saves/warmleft/seed{seed}-40k.json
# organ150: each 150k save, 10 000 ticks on
node harness/bench.js --late saves/warm150 --ticks 10000
# left20k, left60k: the leftovers village from tick 0
node harness/bench.js --preset leftovers --ticks 20000
node harness/bench.js --preset leftovers --ticks 60000
# and A against B, fast: the 150k saves, 4 000 ticks; the leftovers 40k saves, 4 000 ticks
node harness/bench.js --late saves/warm150 --ticks 4000 --ab ../base ../wip --lockstep --rounds 3
node harness/bench.js --late saves/warmleft --ticks 4000 --ab ../base ../wip --lockstep --rounds 3
node harness/bench.js --preset leftovers --ticks 8000 --ab ../base ../wip --lockstep --rounds 2
```
`--profile DIR` runs each seed's timed frames, and only those, under V8's sampling
profiler (every 100 us), writes the `.cpuprofile` to DIR, and tells each update's
time out by it (`breakdown.perUpdate`, ms): `heatStep0`, `heatStep1`,
`heatStepMetal` and `heatStep2` (heatStep's own lines by the step they stand in, a
function it calls by the step that calls it), `sandStepWithoutHeat`, `navFind`
(all of it, the pGrate inside it too), `pGrateOutsideNav`, `peasantsRest`,
`partStep`, `ducksStep` and `rest` (gameUpdate's own work, the harness's, the
garbage collector), with `pGrateAll`, pGrate wherever it is, on the side; and
`breakdown.slowFrames`, the same per frame over the slowest tenth of the frames
alone (each sample is put in its frame by its time), which is what a p95 is made
of. The profiler costs a little, so a profiled run's median and p95 are not the
bench's.
```bash
node harness/bench.js --late saves/warm150 --ticks 10000 --profile prof
node harness/bench.js --preset leftovers --ticks 20000 --profile prof
```

**Is it faster than that one?** On a busy machine one run says little: under
load a seed's median moves by a third. `--ab` takes two checkouts in turns,
seed by seed (A B, then B A), for several rounds, and reports B/A for each
round, paired, so the load of the moment falls on both:
```bash
node harness/bench.js --ab ../base ../wip --rounds 4 --ticks 8000
node harness/bench.js --ab ../base ../wip --rounds 3 --ticks 4000 --lockstep   # both in one process, update by update
```
`ratio` is per seed the median of the rounds' ratios (below 1, B is faster),
with their spread, and `ofMins` (B's best round over A's best); the top-level
`ratio` is their geometric mean. `sameWorld` says whether the two came to the
same `hash()` and the same `stateHash` (`same.js`'s fingerprint, taken once at
the end): a speed-up that does not is not one. `hash()` alone is FNV-1a over the
words, and a sign flip changes only its top bit, so two of them, two `-0`s for
`+0`s or two negated temperatures, leave it as it was; `stateHash` sees them. `--lockstep` plays both
villages in one process, an update of A then an update of B, so a burst of
load lands on both within milliseconds; they share a heap and caches, alike.
Measured A against A (0580e71 twice, 4000 ticks, 3 rounds) with twelve wide
villages running beside it on the 14 cores: in turns, each seed's ratio came
out 0.99-1.04 (rounds 0.97-1.09), 1.016 overall; in lockstep 0.99-1.01 (rounds
0.98-1.02), 1.002 overall. On a busy machine, use `--lockstep`, and believe a
difference of a few percent only when every round agrees.

**Is it the same world?** `same.js` is the oracle for a speed-up: the world may
not change, not a cell, a degree or a die. It plays a set of villages and every
500 sand ticks fingerprints the whole state (`snapshot.js` `stateHash`: every
key of `g` but the drawing and scratch `SKIP` leaves out, all the way down,
numbers by their exact value and typed arrays by their bits, plus the dice, the
side dice, the clock and the module variables the rules keep between ticks), each
top-level field on its own. Every word is avalanched into the hash (murmur3's
`fmix32`), so two differences in one field, say two temperatures a last bit off,
cancel out only by a 1 in 2^32 chance. (Before, each word was folded in
FNV-1a's way, a multiply that carries a difference only upward: two such
temperatures went unseen 1 time in 5, and two sign flips every time. A reference
recorded then cannot be checked against now; record it again.)
```bash
node harness/same.js --record ref.json                 # write this tree's worlds down
node harness/same.js --check ref.json --dir ../wip     # exit 0: identical, every field, every checkpoint
node harness/same.js --check ref.json --dir ../wip --ref-dir ../base   # and which cells, value against value
node harness/same.js --check ref.json --only wide,materials --jobs 6
node harness/same.js --list
```
A difference is reported as the first update and sand tick, and the first field
of `g`, that differ (and the rest that differ there). With `--ref-dir` both trees
are played to that checkpoint and the first values that differ are named:
`g.T[27205] (x 5, y 100): 21.5 vs 21.500001`. The villages (23, each at least
20 000 sand ticks; about 5 minutes, 12 at a time): seeds 3, 7, 14 at 1088 at
4x; seeds 1-6 at 272; soak.js's rich, chaos and leftovers presets; every
paintable material in heaps, mixed, with fire, lava, lightning, the heat and cool
brushes, nukes and fireworks through the real input path (272, and 1088 at 4x);
`playtests/hand.json` replayed; and a village saved at tick 8 000, loaded into a
fresh game and played on (272, and 1088 at 4x).

`--set long` is the late game, where the valley has warmed through (record it
into a file of its own; about 10 minutes, all at once, on 0580e71): seeds 3, 7,
14 at 1088 to 80 000 ticks (a fingerprint every 2 000); each warm save
(`bench.js --save-out`, tick 60 000, made by the reference tree, found in `--warm
DIR`, `$PLEASAND_WARM` or `harness/warm`) loaded and played 10 000 ticks (every
240); a valley warmed hard, the rich preset with lava pools, wood fires, firebrick
furnaces of burning coal and the HEAT brush in patches across the width, then
left 30 000 ticks (every 240); and the chaos and rich presets at 1088 to 60 000.
```bash
node harness/same.js --record long-ref.json --set long --dir ../base --warm warm --jobs 9
node harness/same.js --check long-ref.json --warm warm     # every scenario in the file, unless --only or --set
```
`--set edge` is the edges of the budget, all at 1088 at 4x: each 150k save played
10 000 ticks (every 240); the leftovers village from tick 0 to 60 000 (every 2 000);
each leftovers 40k save played 10 000 ticks (every 240); and the steam organ
knocked about while the builders come and go (`edge-organ-3`, `edge-organ-7`, from
the 150k saves, 16 000 ticks, every 60): a few cells of two pipes erased, mended,
and the organ finished again in the middle of a tick, its valves and pipe tops
grates once more; a pipe taken in the hand and let go; stone painted into a pipe
top; powder set off beside the pipes; the rack erased. The saves are found in
`--saves DIR` (`$PLEASAND_SAVES`, `harness/saves`): `DIR/warm150/seed<N>-150k.json`
and `DIR/warmleft/seed<N>-40k.json`, made by the reference tree. About 6 minutes,
11 at a time, on 0580e71.
```bash
node harness/same.js --record edge-ref.json --set edge --dir ../base --saves saves --jobs 11
node harness/same.js --check edge-ref.json --saves saves
``` `--ignore k1,k2` leaves keys of
`g` out, for scratch a tree has put on `g` on purpose; say so where it is
reviewed, since an ignored key is not checked.

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

**Somebody sent a save.**
The game's SAVE button (or `h.save(path)`) writes one json file: the readable
parts first (`meta`, `summary` with every peasant/duck/site's plain fields,
`checks` and `checksFailed`, `ui`, `history`), the game object (`state`) last.
`history` holds the last 500 events (feed, banners, achievements, deaths with
cause and task), the last 600 inputs (taps, keys, wheel, drags, releases; for a
harness save, its scenario ops), errors with stacks (repeats folded), a trail
sampled every 120 sand ticks (`p: [id, x, y, state, task]`, `d: [id, x, y, state]`,
fire cells, the hottest cell, fps), and `prior`: the tail of the save it was
loaded from, if any. `keyframes` are older whole worlds: in the browser one every
15 s (last 3) plus one at the first error; from the harness, spread over its
history frames or checkpoints.

```bash
node harness/cli.js save-info save.json           # checks, errors, deaths, who has not moved, events, inputs
node harness/cli.js run --load save.json --std --ticks 3000 --until "g.rip > 0"
node harness/cli.js run --load save.json --keyframe 0 --ticks 900   # from 30-45 s earlier
node harness/cli.js run --seed 7 --ticks 5000 --save-out bug.json   # hand one to the game: LOAD it
```
```js
const r = h.load("save.json");   // { tick, hash, deterministic, keyframes: [{id:"kf0", tick}], checksFailed, errors }
h.restore("kf0");                // keyframes are checkpoints; the loaded state is checkpoint "save"
h.save("after.json");            // { path, bytes, keyframes, checksFailed }
```
Every save carries its dice (`rng`, and each keyframe its own): the browser's
`Math.random` is the harness's generator (`rng.js`, mulberry32), and drawing and
sound roll separate side dice, so a save loaded in the harness goes on exactly
as the browser would have, until the player's next input (a click, a key, or the
mouse moving over the field). `--reseed N` gives fresh dice instead; a save with
no `rng` gets them from the seed. A scenario recorded after `--load` remembers the file
(`from`), so `replay` starts from the save, not the seed. The harness takes the
saved cursor position too (peasants notice the cursor); the game keeps the live
one. Buttons are let go either way. A save from a different grid size is refused.
In `serve`: `{"cmd":"save","path":...}`, `{"cmd":"load","path":...,"keyframe":0}`,
`{"cmd":"saveInfo","path":...}`.

**Reproduce exactly.**
```js
const sc = h.scenario();       // { seed, ticks, hash, ops: [{at, op, args}] }
h.replay(sc);                  // resets, replays, compares hashes
```
Every harness action that changes the world (paint, heat, spawn, input,
`set`) is recorded with the tick it happened on. A scenario is version 3: a
press clears the cursor's recent samples and a let-go takes one, as the
browser's pointer does, so a hand that stopped before it let go lets go
still. One recorded before that replays with the harness's press and let-go
as they were then. Once there is a hand (`hand.js`), the hash takes all of it
too, a lump in it or in the air as well as what it remembers. Note: raw mutations through
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
| `h.hash()` | fingerprint of grid, people, dice and clock (~3 ms; FNV-1a, so an even number of sign flips cancels: `same.js` `fingerprint` for the exact check) |

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
- `snapshot.js` — copies the whole game state and puts it back, identity and all; `stateHash`, all of it fingerprinted
- `inspect.js` — state, census, cells, searches, ascii maps, entity dossiers, `why()`
- `harness.js` — the object: time, tracing, breakpoints, invariants, profiling,
  events, input, snapshots, scenarios
- `cli.js` — `run`, `serve`, `selftest`
- `selftest.js` — 25 checks of the harness's own promises
- `args.js` — the argument parser the cli and soak runner share
- `saveinfo.js` — what is in a save file, read without loading the game (`save-info`)
- `soak.js` — many seeds, long runs, presets, invariants and stuck-unit reports
- `bench.js` — the frame budget at 4x, 1088 wide, per seed, with the late window apart; `--ab` for two checkouts against each other; `--late` from warm saves
- `same.js` — the same-world oracle: whole-state fingerprints, recorded and compared; `--set long` for the warmed late game
- `stuck.js` — sampled work/behavior progress and short-cycle detection for peasants and ducks
- `playtests/` — duck escape/timeout regressions, replayable scenarios and the playtest report, and the hand's playtest (`hand.json`)
