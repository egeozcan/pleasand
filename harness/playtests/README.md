# Harness playtest findings

Initial investigation: gameplay commit `2f8e0a8`, Node `v25.3.0`.
The investigation left gameplay unchanged; the fixes below are now applied.

## Fix status — all three findings addressed

- **Ash escape:** `dWriggle` prefers positions above water to unstable lateral
  water cells. Consecutive blocked updates accumulate even when each update
  finds another wriggle destination; only actually getting clear resets them.
  The open-trough regression requires the duck to survive, not merely stop
  oscillating by dying.
- **Blocked surfacing:** a separate `submerged` counter tracks the physical
  obstruction independently of swimming/flight/wriggle transitions. It reaches
  the existing terminal behavior after 400 ticks, and resets on surfacing.
- **Detection:** `harness/stuck.js` observes peasants and ducks every 30 ticks,
  including small movement cycles and frozen behavior clocks. Work strokes,
  inventory, task/site changes and construction progress reset a worker's
  window. Held units and paused time are excluded. Soak warnings no longer
  print a misleading clean summary; `--fail-on-stuck` fails either species.

### Fix validation

- `node test/run.js`: **26/26 passed**, including the duck regressions and
  observer checks. `node harness/cli.js selftest`: **25/25 passed**.
- `node harness/playtests/check.js`: **5/5 passed**: live ash escape,
  ash-removal control, sealed-ceiling timeout, open-ceiling control, and
  clearing an accumulated timeout when the ceiling is opened later.
- **48 ash-trough variants passed**: seeds 1–6, all four duck kinds, adults
  and ducklings. All survived without frozen two-position behavior.
- **13 long soaks / 500,000 ticks**, all with `--fail-on-stuck`: plain/rich
  seeds 7–10 at 40,000 ticks, chaos seeds 7–10 at 30,000 ticks, and rich seed
  14 at 60,000 ticks. No invariant failures, exceptions or detected stalls.
  Seed 14 finished with both ducks alive. Final-observer rechecks of seed 14
  and chaos seed 8 add 90,000 clean ticks (**590,000 total**), with the same
  natural-village hash. See `fix-validation.json`.
- Runtime-only controls using the original duck functions reproduced both
  bugs and the new observer flagged each at tick 2,400. The surfacing check
  examines the physical obstruction, so it catches the problem even when
  the duck's own timer is broken. The fixed ash scenario produced no finding.

The descriptions and source line numbers below record the **original bugs**,
not the current behavior. `coverage.json` is the original investigation's
coverage; the scenarios retain its hashes as `baselineHash` and now use
post-fix hashes for normal replay verification.

## Original findings

**Two reproducible duck bugs, plus a gap in the existing stuck-unit detector.**
No confirmed peasant lockup or simulation exception was found in this pass.
A stationary peasant flagged by the additional observer (ULF, rich seed 10)
was legitimately pumping oil, not stuck.

### 1. Ash on water puts ducks in an endless two-position escape loop

**Priority: P2 — occurs in an otherwise unmodified village.**

Natural reproduction: seed **14**, teach every idea and supply 40 iron and
40 barrels, then let the village run. After a fire leaves ash on the pond,
duck 1 is stuck by tick 43,920; the observer flags it at tick 45,720 after
1,800 ticks without leaving a two-cell neighborhood. Duck 2 is independently
flagged at tick 50,730. No terrain was painted in this natural reproduction.
The recorded 60,000-tick village is `seed14-rich.json`.

At ticks 44,000–44,599, duck 1 alternates exactly between `(94.5,164)` and
`(95.5,164)`: 300 samples at each position. It remains in `walk`, even though
its feet and the cell immediately above are water when observed after each
update. Its heading timer stays at 78.

**Short reproduction:** `duck-ash-cycle.json`. Four actions: make a tiny
inert trough, put water in its two interior cells, replace one water cell
with ash, and spawn a mallard. After settling, it alternates between
`(30.5,88)` and `(31.5,88)` for 1,000 ticks. Both `look` and `quackT` stay
unchanged. There is open air above the trough, so this is not an unavoidable
physical prison.

**Cause:** the sand update moves ash into the duck's current cell. The
blocked-body branch at `ducks.js:311–319` calls `dWriggle`, which chooses the
adjacent water cell. On the next tick the ash moves there, and `dWriggle`
chooses the previous cell. The escape routine scores nearby candidates
(`ducks.js:155–173`) without recognizing this cycle. Every apparently
successful wriggle returns before normal duck behavior and its timers run.
The stuck/death counter does not accumulate on this path either.

A six-tick probe recorded `dWriggle` being called every tick, always with
ASH at the source and the other position as its result. Removing the ash
releases the duck. Changing vertical scoring alone did not reliably solve
the problem; a fix should account for actual escape progress/repeated
positions, rather than just tweak a distance weight.

### 2. A duck's blocked-surfacing timeout cannot accumulate

**Priority: P2 — independently reproducible with painted terrain.**

`duck-submerged-ceiling.json` makes a 3×5 inert chamber with a three-cell
column of water inside, then spawns a mallard in it. Its body fits, but its
head cannot reach air through the ceiling.

After **900 ticks**, the duck is still submerged at `(45.5,80)`. The maximum
value of its `stuck` counter throughout the run is **1**.

**Cause:** `dStep` unconditionally sets `d.stuck = 0` at `ducks.js:320` before
calling `dSwim`. The blocked-surfacing branch at `ducks.js:448` increments the
same field and checks `>400`. On the next update it is reset again. The
intended terminal behavior is therefore unreachable on this path.

Controls: opening the ceiling lets the duck escape. In an isolated runtime
probe, suppressing the unconditional reset makes the trapped duck reach the
existing terminal behavior. No such function replacement is included in the
saved scenarios or committed gameplay code.

### 3. The existing soak runner misses these duck lockups

**Priority: P2 — test coverage.**

`harness/soak.js:95` only observes peasants with non-benign tasks, and its
position comparison is sampled every 1,000 ticks. Ducks are not observed at
all. A dedicated rich seed 14 soak reached tick 60,000 and printed
`all 1 seeds clean`, despite the duck lockups. Its final hash (`0169c098`)
matched the recorded natural scenario. A two-position wriggle loop also
needs different detection from a single fixed position. Standard invariants check finite numbers, valid
materials/states, etc.; those all remain valid during these bugs.

Suggested coverage: sample duck positions and behavior timers, recognize
short repeating cycles, and distinguish genuine progress from repeatedly
finding an adjacent escape cell. For peasants, retain action/site progress
information so productive stationary work is not reported as stuck.

## Reproduce / check

```sh
# Behavioral checks: now exits 0 with five passing checks. These scenarios
# are also exercised by the normal regression suite.
node harness/playtests/check.js

# Replay the short scenarios, verifying the recorded world hash.
node harness/cli.js replay harness/playtests/duck-ash-cycle.json --json
node harness/cli.js replay harness/playtests/duck-submerged-ceiling.json --json

# Long, naturally occurring ash/pond case.
node harness/cli.js replay harness/playtests/seed14-rich.json --json
node harness/soak.js --seeds 14 --preset rich --ticks 60000 --fail-on-stuck
```

Current replay hashes (the original values are retained as `baselineHash`):
- Ash cycle, tick 1,120: `24c38053` (original `615087f2`)
- Submerged ceiling, tick 900: `a2efa1c9` (original `eb1e9431`)
- Natural seed 14, tick 60,000: `8e4852ee` (original `0169c098`)

## Original coverage and limitations

- Existing regression suite: **23/23 passed** (`node test/run.js`).
- Harness self-tests: **25/25 passed** (`node harness/cli.js selftest`).
- Existing soak runner: plain and rich seeds 7–12, **40,000 ticks each**;
  chaos seeds 7–10, **30,000 ticks each**. All 16 runs passed existing checks.
- Additional movement observer: six of those villages repeated for 40,020
  ticks; plain seed 13 and rich seed 14 for **60,000 ticks each**.
- Four painted-terrain villages, seeds 15–18, **60,000 ticks each**, with tall
  walls, an overhang, a dug-out pond, every idea, extra iron/barrels, and ten
  additional ducks per village. No confirmed peasant lockup.
- Four deterministic input-stress villages, seeds 21–24, **12,364 ticks each**:
  100 rounds of painting/erasing, heating/cooling, lightning, grabbing, moving,
  and throwing peasants/ducks through the actual input handlers. No exception
  or checked invariant failure. Deaths and departures were expected given
  these deliberately destructive actions.
- 26 distinct seed/preset/input configurations, over **1.3 million ticks** in
  the broad runs alone, plus targeted reproductions and diagnostic replays.
- Headless simulation only: this does not validate rendering, audio, browser
  event delivery, or all possible task/terrain combinations. Absence of a
  detected peasant lockup is not proof that none exist.

`coverage.json` preserves the summaries from the broad runs. Temporary
minimization tools and runtime probes were kept outside the repository.
