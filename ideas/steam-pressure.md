# Pressure: a plan (v2)

Not built (yet). Evaluation history:

| version | consistency | design | entertainment | average |
|---|---|---|---|---|
| v1 | 7.5 | 7.5 | 8 | 7.67 |

This file is v2, written after the last review and not scored yet. Target was an 8.5 average.

*A cell of water boiled wants a great deal more room than it had. Shut it in, and it will find some.*

Status: v2 (v1 scored 7.5 / 7.5 / 8, average 7.67). Nothing is built. Every number in §0 was measured headless on master
`b07c9b4`, with a prototype of the v2 rules (§2) kept outside the repo. Reviews are scored consistency / design /
entertainment, as the other plans are.

v2, what changed (the review history is §15):

- **Steam only.** Clean flame no longer counts. Firedamp and the torch-in-a-box burst are gone (§13).
- **Concrete holds.** Its `PR_S` goes from 14 to 24. A pot can never get past P 20, so concrete never strains. Glass
  goes first, then stone, then brick, then iron (§0.3).
- **The organ, measured.** The organ cannot boil itself dry as the village runs it: a concert peaks at P 2.2, and its
  coals left alone die at 99°. v1 had the organist leave for the fire bell, but they never do, because "organ" is not in
  `I_IDLE` (ideas.js:531). So the organ goes up only when a player puts a torch in its firebox. Then its weakest wall
  is the right-hand side of the tank, settled by a rule rather than by flood order (§2.2). The repair builders put a
  SAFETY VALVE where it blew (§5.1).
- **Water does not level in under steam.** The U-bend rule (`sandPressure`, world.js:899) was undoing every push. A
  state-derived hold stops it (§2.6). It needs no saved state and rolls no dice.
- **V counts only the chamber's water**, so a basin of any size leaves P alone. The push also takes water from above
  and beside the pocket, which lets steam drive the water up a pipe (§2.5). Measured: a steam fountain that plays for as
  long as the torch burns (§0.5). The "insulation surprise" did not survive measuring and is dropped.
- **Burst pieces fall.** A thrown piece of iron, stone or glass that comes to rest with nothing under it falls on
  (§2.4). A piece that lands on water sinks.
- **Every wall rattles first.** A wall that is over twice its strength goes at once only if it was there at the last
  look too. Strain belongs to the pocket. A burst with no room in the air for its pieces waits (§2.3).
- **The valve is re-measured** (§0.4) and settles where its rule says it will. It whistles while it boils, and with a
  faucet inside it whistles until you stop it. Pitch comes from the vessel's size, so a chord is a matter of pot sizes.
- **Peasants come to watch a fountain** (the fireworks' `watch` task), and watching one long enough puts the baths in
  their heads (§5.2).
- Grounding fixes: `bHide` (build.js:1258), `TIPS` (game.js:18-69), the save check at save.js:274 (§8).

---

## 0. What we are working with (measured)

### 0.1 Where steam is, in a village left alone

A read-only probe stepped each village and counted every STEAM cell every 10 ticks. It flood-filled the air around
each one (8-connected through `AIRY`, world.js:262, capped at 400 cells, open at row 0). The valley was 272 wide.

| villages | ticks | steam cells seen | sealed pockets with ≥ 4 steam |
|---|---|---|---|
| plain, seeds 1-6 (v1) | 20,000 each | **0** | 0 |
| rich (soak.js presets), seeds 1-6 (v1) | 20,000 each | **0** | 0 |
| leftovers (soak.js preset), seeds 1-6 | 20,000 each | **0** | 0 |
| great works (every idea `iFresh` allows, as test/wonders.js:120; iron 60, barrels 40), seeds 1-6 | 20,000 and 80,000 each | **0** | 0 |
| chaos (painted lava and water), seeds 1-6 (v1) | 12,000 each | 4 seeds | 1 (seed 3, tick 610: 14 steam in 27 cells under rock) |

No village boils anything. The brigade's water puts fires out without boiling (`sandFire` turns the flame to SMOKE,
world.js:739). The brine is boiled in the abstract. The bombfish charge (leftovers.js:1052) boils a cell here and
there inside open water. That cell is a pocket of one, below `PR_NMIN`, and bubbles straight out. In 80,000 ticks the
great-works villages built an observatory once and an organ never, so §0.2 covers the organ directly.

### 0.2 The steam organ

The probe uses `organ(k)` exactly as test/pleasures.js:247 sets it up (seed 1, a full tank). The tank is iron, inside
u 2..10, rows L0+1..L0+4 (pleasures.js:894-896). The gutter column u = 12 beside it is air, dug out by the organ's own
plan down to the apron (pleasures.js:871) and open sky above.

| case | result |
|---|---|
| a concert (`pOrganPlay`, three peasants), 15,000 ticks | max **P 2.22**. The rattle line for iron is 6.75 |
| three coals (aux 1) in the firebox, nobody about, from cold | tank 81° at 200, 99° at 400, the coals out by 600. **Never a cell of steam** |
| the tank at 99°, three fresh coals, nobody about | at most 1 steam cell |
| a TORCH painted in the firebox (`pOBox` u = 1), nobody about | rattles at 228 (P 7.2, right wall), strains from 268, **bursts at 344**: the right wall at u = 11, the middle of the pocket's rows, 3 cells thrown into the gutter, P 16.7 |
| the same, with that wall cell a SAFETY VALVE | 30 cells vented, max P 5.6, **no burst** in 4,000 ticks |

The organ is a boiler run by somebody who knows what she is doing. It will not blow by itself. A player has to cheat.

### 0.3 Pots

Each pot is a sealed box with 1-cell walls and a 6 by 5 inside, 4 rows of water, a row of heater under it and inert
under that. The times are ticks on seed 7. Seeds 1 and 2 fall within 8 ticks of them.

| pot | heater | rattles | bursts | at |
|---|---|---|---|---|
| GLASS | TORCH | 64 | **72** | P 6.7, lid, 3 cells |
| STONE | TORCH | 68 | **88** | P 13.3, lid |
| BRICK | TORCH | 72 | **96** | P 10.7, lid |
| METAL | TORCH | 44 | **112** | P 16, lid, 3 cells |
| STONE | EMBER | 136 | **232** | P 10.7 |
| CONCRETE | TORCH | never | never (6,000 ticks) | P 16, under its 18 rattle line |
| PLANK | EMBER | | | the planks catch first (300°) |

Iron rattles first, since it takes the torch's heat fastest, but it goes last. That is the race in §6.

### 0.4 The safety valve

A METAL pot with a valve in the middle of its lid (§2.7):

| pot | heater | whistles (ticks) | P while venting | afterwards |
|---|---|---|---|---|
| 6 by 5 inside, 24 water | TORCH | 36-56 | up to 8 before a vent, 7.3 median | dry. P sits at 3.3, under the lift |
| 6 by 5 | EMBER | 140-184 | 4.0 | the same |
| 10 by 7, 60 water | EMBER | 160-532 | 4.0 | the same |
| 6 by 5, a FAUCET inside | TORCH | **36-3,000 and on** | 4.8 median, 6.7 max | still whistling |

None of them burst. A torch boils a small pot dry in a third of a second, so a kettle that sings for a while wants an
ember or a faucet.

### 0.5 Fountains, and the U-bend

The chamber is 8 by 5 inside, full of water, with a TORCH row under it. Its walls are firebrick, two thick, set in
stone. A pipe leaves the chamber's bottom corner, runs `RUN` cells through the rock, and turns up 22 rows to a basin.
Seeds 1-3, 6,000 ticks each:

| layout | pushes | water thrown up | bursts | notes |
|---|---|---|---|---|
| RUN 4, basin 9 by 2 | 449-566 | 1,648-2,359 samples ≥ 10 rows above the mouth | 0 | first eruption at 240-708, then plays as a fountain on what falls back |
| RUN 4, stone chamber | 611-630 | 2,734-3,062 | 0 | stone carries the torch's heat in faster. No insulation surprise |
| RUN 4, EMBER | 0-335 | 0-507 | 0 | through firebrick, embers usually boil nothing: firebrick keeps heat out as well as in |
| RUN 1, basin 9 by 2, hold on / off | 342-551 / 63-666 | **631-667 / 209-390** | 2-6 / 2-34 | the levelling tried to put water back under the steam 606-754 times a run, and was refused |
| RUN 1, basin 151 by 10 | 101-216 | 1,446-2,558 | 1-20 | the one wall between chamber and pipe gives, now and then |
| RUN 4, a standpipe 8 above the ground spilling into a walled pond | 10-41 | | 0 | **pond: 25-26 cells** of the chamber's 40, lifted 30 rows |

Without the hold (§2.6), `sandPressure` levels the basin back down into the chamber and undoes the push. A horizontal
run longer than a cell or two collects bubbles that cannot rise through the rock over them, and they choke it. That is
a vapour lock, and it is real.

---

## 1. What this adds

Pots that rattle, strain and burst. Steam that pushes water up a pipe, as a fountain or a pump. A SAFETY VALVE that
whistles at its vessel's pitch. Water that will not level in under steam. An organ that, cheated with a torch, blows
out its side and is mended with a valve. Not added: hot-air pressure, gas explosions, superheat, engines, a new idea
for the bulb (§13).

---

## 2. The rule

### 2.1 Pockets and pressure

A **pocket** is the set of `AIRY` cells (EMPTY, FIRE, SMOKE, STEAM, GAS) 8-connected to a seed cell. Steam slips up
the diagonals (`sandSteam`, world.js:779-799), so a pocket sealed only four ways is not sealed. A pocket is **open** if
any cell of it is on row 0, or if it has more than `PR_CAP` = 400 cells. Then nothing happens. The world's sides and
floor are walls, as they are to steam now.

The pocket's **vessel liquid** is every LIQUID cell (but LAVA and MORTAR) 4-adjacent to it, plus the liquid
4-connected to those. It is found breadth-first, one component at a time, `PR_LCAP` = 400 cells in all. Its
**surface** is the vessel liquid with a pocket cell directly above it.

    n = STEAM cells in the pocket
    V = pocket cells + vessel liquid at or below the highest surface row (none, if there is no surface)
    P = PR_E * n / V            PR_E = 20

Nothing happens while n < `PR_NMIN` = 4. P runs from 0 to 20, and reaches 20 only in a vessel that is all steam. A
full kettle with one cell boiled is not at 20. A pipe and its basin sit above the chamber's surface, so they never
count, and a basin of any size leaves P alone (v1's weakness 4).

Only steam counts. Hot air, smoke and flame do not. Air in this valley is never truly shut in: it gets out through
boards and chinks, as it does from any house, which is why a burning house stays a burning house.

### 2.2 Walls

For each pocket cell `a` and each 4-neighbour `b` that is neither AIRY nor LIQUID: d = b - a. The **resistance** R(b)
is the sum of `PR_S` (§3) along `b, b+d, b+2d, b+3d` up to the first AIRY or LIQUID cell, the **exit**. R is infinite
in four cases: there is no exit within `PR_THICK` = 4 cells, the line leaves the grid, the exit is in this same pocket,
or the exit is this pocket's own vessel liquid. A wall between steam and its own water is pushed from both sides.

**Room to go.** Each of the exit's two side neighbours (across d) that is solid adds `PR_FLANK` 0.5. A piece needs
somewhere to go. A valve with a pipe over it is held in its seat by the walls of the pipe. A pot lid with open air over
it is not.

The pocket's **weakest wall** is the least R. Ties go by direction (up, then left, then right, then down). After that
they go to the cell nearest the middle of the pocket, across d (its bounding box, so a lid goes in the middle as a lid
does), and then to the lowest index. Nothing depends on flood order.

On the organ, measured: the valves have R 9 + 1 (rack bricks either side of each pipe, pleasures.js:900-903), the left
wall R 12 (iron, then the ladder), and the right wall R 9 with the dug gutter column beyond it. The right wall goes.

### 2.3 Rattle, strain, burst

| condition (each scan) | what happens |
|---|---|
| P >= 0.75 R | **rattles**. The entry in `g.prHot` (lazy: `{i, x, y, P, R, strain, big, t}`, at most 8, an entry unseen for 32 ticks is dropped) is made or refreshed. The cell jitters by a pixel when drawn (side dice). `g.fx.rattle`. Peasants are warned (§5.2) when the entry is made, and every 60 ticks after |
| P >= R | **strains**: `strain += 4 * P / R` |
| strain >= `PR_HOLD` 120, or P >= 2R at this look and the last (`big`) | **bursts** (`prBurst`) |
| P < 0.75 R | the entry lapses. Strain is not kept |

Strain belongs to the pocket. When the weakest wall moves (the pocket grows, so its middle moves), an entry whose cell
is still one of this pocket's walls passes its strain to the new one. A wall over twice its strength goes at once only
at the second look running. A transient, such as air in a pipe beside a chamber for one scan, is not a burst.

**prBurst**, at b along d:

- If `g.np >= PMAX - 400` (the test `sandBoom` makes, world.js:519), nothing happens. The strain stays at `PR_HOLD`,
  and the burst comes at the first scan with room in the air.
- over = P - R, and `hw = min(2, floor(over / 4))`. The hole is b's line, plus each cell up to hw to either side of b
  (across d) whose own R along d is at most P. A neighbour that could not have gone on its own stays. On the organ that
  means the wall cells above and below b, R 9 each: 3 cells.
- Each cell in the hole is `sandFling`ed at `d * sp`, -0.3 up, with jitter. `sp = clamp(0.8 + 0.25 * over + n / 40,
  0.8, 4)`. The piece takes all its heat (world.js:427), and it is marked as a burst piece (§2.4).
- A white `PK_GLINT` puff (lights nothing). Then `peasantsBlast(g, bx, by, Rb, Pb, true)` and `ducksBlast(..., true)`,
  with Rb = `2 + min(6, n / 6)` and Pb = `min(3, 0.5 + over * 0.2)`. The new `cold` argument skips the rolls that set
  bodies alight (peasants.js:535, ducks.js:223).
- `g.booms.push({x, y, R: Rb, t, steam: true})`. A snowman counts it as rough handling (`lRough`, leftovers.js:1543),
  and the organ looks for it (§5.1). At P >= 10 there is a ring and a shake (up to 4), with the ring on the side dice in
  a great-works village as `sandBoom` does. `g.fx.boom` at P >= 10, else `g.fx.pop`. `achieve(g, "pressure")`.

After that the pocket is open, and the steam leaves by the existing rules, rising and raining (heat.js:115).

### 2.4 Burst pieces

`sandFling` gives debris a life of 240, and no other debris gets more (iThrow, ideas.js:1082; the salt toss,
leftovers.js:682; `sandBoom`'s 80). prBurst sets its pieces' life to `PR_LIFE` 600, and in `partStep`'s landing
branch (world.js:483-497) a piece with life over 240 that is not `SAND_FREE` is handled like this:

- With AIRY under its landing cell, it is not set there. Its velocity is set to (0, 0.3) and it falls on. A piece of
  iron thrown at a ceiling comes back down to the floor, and one thrown at a cliff slides down it.
- With liquid under it, it lands and then `sandSwap`s down through the liquid, at most 12 cells, the liquid rising past
  it, as `bPlace` shoves water aside (build.js:844). Iron sinks. Timber (`WOODY`) stays on top.

Felled timber (peasants.js:1949) and a broken-up rocket (heavens.js:1968) keep landing as they do now. Their life is
240.

What is left lies about. Iron is scrap that gatherers pick up at 0.2 of a bar a cell (`L_LOOSE`, `L_TAKE`,
leftovers.js:50-54). Small glass goes the same way. Stone and brick lie where they fell, as anything off a cliff does.

### 2.5 The push

The pocket's **inlets** are the vessel liquid cells 4-adjacent to it, whether below, beside or above, but only in a
component that has an **outlet**: an EMPTY cell outside the pocket directly above one of its cells, which is somewhere
else's surface. A drop of condensate on a lid has no outlet, so it is no inlet. Take the highest inlet (least y) and
the lowest outlet (greatest y, first found breadth-first, so the one nearest the pipe).

    need = PR_PUSH0 + PR_HEAD * max(0, y_inlet - y_outlet)       PR_PUSH0 = 1, PR_HEAD = 0.25 a row

If P > need, then `k = min(PR_PUSHMAX 6, floor(P - need))` times, pairing inlets highest-first with outlets
lowest-first:

- `sandSwap(inlet, outlet)`. Water and air trade places, heat and all. This is `sandPressure`'s own move (world.js:919)
  run the other way, by steam. The pocket gains the cell.
- If `P - need >= 2` and the cell over the outlet is EMPTY, `sandFling(outlet, jitter, -min(4.5, 0.6 * (P - need)))`.
  The water leaves the mouth as a jet. At -4.5 it climbs about 90 rows, since debris falls 0.11 faster each tick
  (world.js:460).

Highest-first means the chamber empties from the top, then the steam takes the pipe, a cell at a time, as it drives
the water column up and out. When the pocket reaches the open air it is open, and the steam goes. What falls back seals
it again. A push changes neither n nor V. A duck on the mouth during a jet gets `ducksBlast(g, ox, oy, 2, 1.2, true)`,
once a scan.

### 2.6 Water does not level in under steam

`sandPressure` (world.js:899-925) moves a resting surface cell to the first EMPTY cell lower down along its pool's
edge that has something under it. One condition is added before the swap at world.js:919: the target is refused (the
search goes on) if, walking up from it through AIRY cells (at most 16), a STEAM cell is met in its column or either
column beside it. Steam holds the water down.

This is a property of the cells, not of the scan. It needs no saved state, so a load cannot change it. It rolls no
dice, since `side` is drawn before the search. It changes nothing in a world without steam, and §0.1 found none in any
village. In open air a target under a passing cloud of steam is refused for as long as the cloud is over it, which
nobody will notice. Measured in §0.5: refused 606-1,190 times a run, worth about double the thrown water.

### 2.7 SAFETY VALVE

A VALVE cell on the pocket's edge with an EMPTY cell beyond it (at b + d) **lifts** at P >= `PR_VALVE` 4. It vents
`min(PR_VENT 4, floor(2 * (P - 4)) + 1)` steam cells a scan: 1 at P 4, 2 at 4.5, 4 at 5.5 and over. Each one is
`sandSwap`ped with the next EMPTY cell out along d (b + d, b + 2d, ...). The steam cell touching the valve goes first,
then the rest in flood order. Without air beyond, the valve is a wall of `PR_S` 9, as iron is.

Its **pitch** is `clamp(880 * sqrt(30 / V), 220, 1760)` Hz, the way a bottle's is: a big boiler hoots and a small
kettle shrieks. Boiling turns water into steam a cell for a cell, so V does not change while a pot boils, and each pot
holds its note. Pots of 30, 48 and 68 cells sing close to a major chord (1, 1.26, 1.50). Loudness follows P - 4.
`g.prPitch` holds the note for the sound.

### 2.8 When it looks

- `PR_EVERY` = 4. `sandStep` sets the module variable `PR_ON = (T % 4 === 0)` next to `g.pressN = 0`
  (world.js:1215), and sets `PR_N = 0`.
- **Candidates** are taken only on `PR_ON` ticks, and with no dice. A candidate is a STEAM cell below row 0 that ends
  `sandSteam` without having moved up: it moved sideways (the second loop, world.js:792-797), or it did not move at all
  (the fall-through at :798). Steam rising freely never asks. `prNote(i)` keeps the first `PR_CANDS` 16 in a module
  `Int32Array`.
- `prStep(g)` runs after the pressure tries and before `heatStep` (between world.js:1241 and 1243) when `PR_N > 0`. It
  takes up to `PR_SCANS` 2 candidates that are still steam and not already in a pocket flooded this tick. For each it
  floods, vents, pushes and checks walls, in that order.
- The floods reuse `g.pmark`/`g.pstack` with `++g.pgen`, as `sandPressure` does (world.js:900-903). These are already
  in `SAVE_SKIP` (save.js:39), and the scan runs after the last `sandPressure` of the tick. A module `PR_LIST`
  (`Int32Array(PR_CAP + PR_LCAP + 8)`) holds the cells found.

Candidates are made and used up inside one tick. The hold is a property of the cells. `g.prHot` and `g.prErupt` (§5.2)
are on `g` and are saved. So a save made between two scans loads to what would have happened anyway.

---

## 3. Recipes and changed interactions

`PR_S`, a wall's resistance a cell (`Float32Array(NMAT)`, Infinity where not set):

| material | PR_S | so |
|---|---|---|
| SAND, ASH, SALT, SNOW, SEED, GUNPOWDER, FIREWORK, NUKE, SOIL, MORTAR, PLANT, CROP, WHEAT, FLOWER, SAPLING, BED, EMBER | 1 | a lid of grains jumps |
| LINEN 0.5, LAMP 1.5, ICE 2, PACKSNOW 2.5 | | |
| GLASS, STAINED | 2.5 | a bottle pops first |
| WOOD, PLANK, DOOR, LADDER, STAIRS, TRESTLE | 3 | (a wooden pot catches fire before it boils, §0.3) |
| GOLD | 4 | soft |
| BRICK, FIREBRICK, MOONROCK | 5 | |
| STONE, COAL, ORE, ROCKSALT | 6 | |
| METAL, GIRDER, VALVE (as a wall) | 9 | the organ's tank |
| CONCRETE | **24** | P can never pass 20, so it never strains. Brim-full and boiled dry (P 20), it rattles without straining: it hums |
| INERT, CLONER, FAUCET, DRAIN, TORCH, LAVA | ∞ | (a drain in a wall drinks the steam anyway) |

| actor | condition | result | rate |
|---|---|---|---|
| sealed pocket | n >= 4, P >= 0.75 R | rattles, peasants warned | each scan (4 ticks) |
| | P >= R | strain += 4P/R | each scan |
| | strain >= 120, or P >= 2R two looks running | `prBurst` at the weakest wall | once |
| pocket with an inlet whose water reaches an outlet | P > 1 + 0.25 · lift | up to 6 swaps; a jet if P - need >= 2 | each scan |
| pocket touching a VALVE with air beyond | P >= 4 | 1-4 steam cells out, whistle at the vessel's pitch | each scan |
| `sandPressure` | target EMPTY cell with steam over it (16 up, 3 wide) | refused | each try |
| burst piece, fixed solid | lands with air under it / on liquid | falls on / sinks (timber floats) | |
| water on a rattling iron pot | water-metal quench (heat.js:156-164) | the lid drops under 100, the steam condenses (heat.js:115), P falls | existing heat |

SAFETY VALVE (new, `MAT.VALVE` = 55):

| property | value | as |
|---|---|---|
| flags | SOLID, STILL, CONDUCTS | iron. The step skips it (world.js:1224) |
| heat | `def(VALVE, 1.5, 0.36)`, `hi(VALVE, 1500, 500)`, heatUp → LAVA aux METAL | GIRDER (heat.js:94, 131, 312) |
| acid | eaten at 0.003 | METAL (world.js:1041) |
| bangs | in the hard set (only a big one craters it) | METAL (world.js:536-537) |
| peasants | `P_HARD` | METAL (peasants.js:33-35) |
| gatherers | not in `L_LOOSE`: a valve lying about is somebody's | |
| cloner | will not learn it (`t < MAT.PLANK`, world.js:1183) | every MORE material |

---

## 4. The palette

SAFETY VALVE goes in **MORE, under BUILDING**, after TRESTLE (world.js:121):

    { m: MAT.VALVE, name: "SAFETY VALVE", key: "", more: "build",
      desc: "iron that holds steam in until it cannot, then lets it out, whistling. a big pot hoots, a small one shrieks." }

Why paint it at all? Pressure without a valve is a toy with one ending. With one, a player gets a kettle that sings, a
steam whistle (a faucet inside), a boiler that will not go off, and a chord of pots. Nothing else in the palette makes
one: a hole is always open, and a valve is shut until it is not. The village makes it too (§5.1), as it makes
STONEWORK. Not the main panel: that is full (game.js:13, test/picker.js:34). The flyout grows from 130 to 140 px, and
`MORE_TOP` goes from 230 to 220 (game.js:563-576), well clear of `PLAY_Y`. The name has 12 characters, which fits.

`SAND_SHADES[55]` is brass and iron, `["#b8903a", "#a8822f", "#c89c44", "#7e7a72"]`. drawWorld draws a dark lever line
across the cell, and a white glint while it vents. Its positional `SAND_DENS`/`FREE`/`POUR` are set by index after the
literals (world.js:133-144). The harness glyph is `"&"` (harness/inspect.js:15-22). A tip goes at the end of `TIPS`
(game.js:18-69): "tip: shut some water in iron and put a torch under it. then put a SAFETY VALVE in the lid, and try
again".

New `g.fx` keys `rattle` and `valve`, written `(g.fx.rattle || 0) + 1`, since old saves lack them (save.js:479-483).
New voices in audio.js: `SFX.rattle` (quick square clicks) and `SFX.valve(hz, loud)` (a sine at the vessel's pitch
with a breath of hiss, like `SFX.whistle`, audio.js:73). Both play from `sandSounds0`/`sandSoundsSide` (game.js:694).
`cellReadout` (game.js:470) says "straining n%" (strain / 120) on a wall cell in `g.prHot`, and "venting" on a valve.

---

## 5. The village

### 5.1 The steam organ, cheated

A played organ never comes near its rattle line (§0.2), and an untended one never boils. So this all begins with a
player who paints a TORCH into the firebox, or warms the tank with the HEAT brush. The organist cannot rake a torch
out: raking turns only EMBER to ASH (pleasures.js:1087, 1098).

- **The organist hears it.** In `pOrganStep` (pleasures.js:995), a `g.prHot` entry on the tank's walls counts toward
  `want`, next to `s.shutT` (:1004). So somebody idle within 240 is sent for, if there is no fire on (:1005). In
  `pTaskOrgan`, once at the stand and after the `k.act % 30` gate (:1078), a rattling tank with every valve shut gets
  valve 0 opened at once, with `P_SAY.breathe`, through the existing breathe branch (:1101). It stays open while there
  is steam (:1102). With a torch under the tank, that means the organ sounds its top G for as long as the tank has
  water. They fill it (`pCallFill`), it boils, she opens up, and so on, until somebody takes the torch away. Peasants
  near the tank back away from the rattle (§5.2). The organist, on a brave task, walks the other way.
- **Nobody comes in time.** Measured: 116 ticks from the first rattle to the burst. The right wall blows into the
  gutter, three cells of iron landing as scrap beyond it, and a white cloud rolls over the gutter. What steam is left
  rains back into the gutter, and the organist bails it into the tank as now (`pOGutter`, :1031).
- **They mend it with a valve.** Every stride `pOrganStep` looks in `g.booms` for a `steam` entry inside the tank's
  wall box since it last looked (`s.boomT`). The first time, `s.blown = g.tick`, and the plan entry at the burst's cell
  (an `iron(11, y)` entry, pleasures.js:896) has its `v` set to `MAT.VALVE`. It keeps `res: "iron"` and `cost`
  (`bPrice`, build.js:325). The feed says "the steam organ blew out the side of its tank. they are mending it with a
  safety valve", and in a great-works village there is a tale (`wTale(g, "burst", ...)`, with a `wTold` case, "the
  steam organ blew its side out", wonders.js:298). `bInspect` (build.js:1041) finds the cells gone and opens the
  repair (:1079). `bPlace` lays the entry's `v` (:852), so the builders put a VALVE where she blew, at the price of a
  girder. Nobody walks into the tank to do it. Nothing has to be taken out, since the hole is already there.
- **After that she whistles.** The valve sits on the tank's side, over the gutter, with air beyond it (u = 12). The
  next time the organ is cheated it vents there and does not burst (§0.2). `P_SAY.organValve`: "that's her valve.
  somebody's been at the fire", "she's calling", "*pssssheeee*". The readout adds "a safety valve, fitted the day she
  blew".

The tank is the only sealed vessel the village makes, and the hard part of the chain happens only by a player's hand.

### 5.2 Peasants near pressure

- `prWarn(g, e)`: every walking peasant within 30 who is not on a brave task (`task.brave`, pleasures.js:1013) gets
  `panic = max(panic, 90)` and turns away. That is the far branch of `peasantsBlast` (peasants.js:537-540), so they
  already know how to run and hide (`bHide`, build.js:1258). Some say `P_SAY.rattle`: "it's going to go", "is it meant
  to do that", "everybody back", "that's not a noise a pot should make", "*backs away slowly*". A peasant on the lid
  when it goes is thrown, not set alight, and says `"thrown"` (master's line, used as it is).
- **Eruptions.** The first push after 300 quiet ticks (`g.prErupt`, lazy: `{x, y, t, n}` by outlet column) calls
  `peasantsReact(g, "geyser", ox, oy)`. That is a new branch doing what "firework" does (peasants.js:550-551): bored
  to 0 within 160, "ooh", a little leap. `achieve(g, "geyser")` comes after the third eruption.
- **A sight.** A fountain that has pushed in 20 of its last 150 scans is worth a walk. Every 600 ticks, idle peasants
  within 160 (as the festival's call, ideas.js:1888-1891, `I_FUN` and the 15% skip) get `{kind: "watch", of:
  "geyser", x, y, until: +900}`. `iTaskWatch` (ideas.js:1946) already stands them out from under it, and the mood line
  (:2092) says "is watching the fountain". When a geyser watch ends, `iTaskWatch` calls `wSpark(g, p, "baths")` and
  not "theatre". "What if the pond. But warm" (pleasures.js:37) is a thought you have watching hot water come out of
  the ground. `wSpark` rolls nothing and does nothing unless the baths are ready (wonders.js:271-276).

### 5.3 Everything else

| system | what pressure does to it |
|---|---|
| fire brigade | Nothing. Its water never boils (§0.1), and a player's boiler is not a site. A burst beside a house breaks its windows (GLASS 2.5) and throws its planks. The house reopens for repair, or, past 60% gone, is a ruin (build.js:1060-1065). Buckets thrown at a fire beside a rattling iron pot cool it |
| tidying, gathering | Burst iron is scrap (§2.4). A blown boiler is a few bars to whoever sweeps up |
| mines, storeys, platforms | No steam. A player's lava under a flooded gallery gives the chaos case: the rock between blows |
| great works | The organ (§5.1). The baths are open water. `wBathe` (wonders.js:1292) bathes in any warm water, so a fountain's basin that has cooled to 30-45 gets bathed in, and one hotter than that gets "far too hot" (`tooHot`) |
| ducks | A duck on a fountain's mouth goes up with it, feathers and quack (ducks.js:224) |

---

## 6. What a player will enjoy

- **The kettle.** A box of METAL, some WATER, a TORCH under it. The lid chatters for a second, and the readout climbs
  "straining 40%... 80%". Then the middle of the lid goes up like a cork, and a white cloud rolls out and rains. Do it
  again with a SAFETY VALVE in the lid. It shrieks for a moment and goes quiet, full of steam, just under 4. Put a
  FAUCET inside and it is a steam whistle that never stops.
- **The race.** Glass, stone, brick, iron and concrete pots in a row over one long torch. The iron one chatters first
  and goes last of the four, and the concrete one just sits there full of steam. Bet on the order.
- **The chord.** Three valved pots, small, middling and big, over embers. Small pots shriek and big ones hoot.
- **The rescue.** Pour water over a rattling iron pot. It hisses, the lid drops under a hundred, and the rattle stops.
  That is the heat rules doing it, not a special case.
- **The fountain.** A chamber of firebrick or stone, full of water, with a pipe out of its bottom corner up to a little
  basin, and a torch under it. A few seconds, then a jet, then a fountain that plays on what falls back for as long as
  the torch burns. Peasants come and stand and watch it. A duck on the mouth goes up. Someone goes home thinking about
  warm ponds. Run the pipe flat for ten cells and it chokes on its own bubbles.
- **The pump.** Stand the pipe up out of the ground and the steam lifts the chamber's water thirty rows into a pond.
- **The organ.** Put a torch in its firebox. Everyone near it backs away from the rattle, and the organist comes
  running the other way. If she gets there first, the organ sings one long high note until you take the torch out. If
  she does not, its side goes into the gutter. A week later it has a brass valve on that side, and every time you do it
  again it whistles at you.
- **Buried.** Bury a glass jar of water three grains deep in sand with embers under it. A few seconds of muffled
  chatter, then the sand over it jumps and the steam comes up through it (measured: rattle 284, burst 380). Embers on
  top of the sand do nothing.

---

## 7. The heat books

`prStep` never calls `heatAdd`, `heatSetQ` or `heatForce`. It moves heat only by:

- `sandSwap`, which swaps T, lat and the counted state together (world.js:316-330). That covers pushes, vents and
  sinking pieces;
- `sandFling`, which puts the whole of `heatQ` into the piece (world.js:427). The piece lands with it (world.js:494-495)
  or drops it in the nearest cell (`partDrop`). A burst piece that falls on keeps it in flight;
- glints, which carry nothing.

Debris thrown off the edge takes its heat with it, as debris from any bang does (world.js:482). Test 3 checks the rest:
grid `heatQ` plus particle `pt`, before and after `prBurst` and after the pieces have landed, equal to 1e-3 relative.

---

## 8. Determinism, saves, the rules kept

- **A village that never shuts steam in goes exactly as it did.** Every tick runs only the `PR_ON`/`PR_N` sets and an
  `if (PR_N)`. `prNote` is reached only by a STEAM cell, and §0.1 found none in plain, rich, leftovers or great-works
  villages. The `sandPressure` hold reads a few cells when a target is found, after the dice, and refuses only on
  meeting STEAM. The organ's new checks
  (`g.prHot`, `g.booms` entries marked `steam`) read only, and both are empty without steam. The partStep branch
  needs life over 240, which only prBurst gives.
- **Guards that must stay green:** test/wonders.js:59-102 (master's tables by key, so `P_SAY.rattle`, `organValve`,
  `P_ACHIEVE.pressure` and `geyser` are additions; master's dice tick for tick; the idea order and `03cf4e61`;
  `dc6bb627`), test/valley.js (`44ff922d`), and the organ tests in test/pleasures.js, in every phase.
- **The chaos soak will change.** Seed 3 has a 14-steam pocket under rock at tick 610 (§0.1), and painted water can
  meet painted lava anywhere. The chaos lines of harness/soak-baseline.txt are recorded again in phase 1, with a note.
  Plain, rich and leftovers come out byte-identical.
- **Saves.** `MAT.VALVE` is appended at 55 (world.js:71). Grids are saved as raw ids, and an old save cannot hold 55,
  which did not exist. (save.js:274 is the self-check "materials valid", `v >= NMAT`, NMAT 64. It is not the loader,
  as v1 said, but 55 passes it.) `g.prHot`, `g.prErupt`, `s.blown` and `s.boomT` are lazy and read with `|| 0`, since
  `saveApplyState` deletes keys an old save lacks (save.js:483). Particles are saved, so a burst piece's long life
  survives a reload. A sandbox save with a sealed boiler in it will rattle after loading. The physics changed, not the
  file, and the commit says so.
- **peasantsBlast / ducksBlast** get an optional sixth argument, `cold`. Every existing call passes five.
- **Nothing is gated on width.** The scan is local, so four screens cost what one does.

---

## 9. Performance

| what | cost |
|---|---|
| every tick, every village | one modulo, two sets, one test |
| steam not rising, on scan ticks | one call to `prNote` |
| a scan | at most 400 pocket and 400 liquid cells, then 4 neighbours × 4 line cells + 2 flanks a pocket cell: under 10,000 reads. Measured 18-29 µs a scan for 40-cell vessels in an unoptimised prototype, against 3.48 ms a tick at 1088 |
| the hold | up to 48 reads, only when `sandPressure` has found a target (12 tries a tick at most) |
| stuck open steam (under an overhang, a cloud at row 1) | floods until it touches row 0 or 400 cells |

The budget is 4.5 ms a median update at 1088 (docs/wide-valley-spec.md:306-311). Phase 1 profiles `node
harness/cli.js run --gw 1088 --profile` on a valley with ten sealed boilers and a sky full of rain. The target is under
0.05 ms a tick for `prStep`. If it is over, first `PR_SCANS` 1, then skip a candidate whose pocket was found open at the
last scan (a 1-bit mark, by candidate cell, for 8 ticks).

---

## 10. Code layout

A new file, `pressure.js`, loaded after `heat.js` and before `peasants.js` in index.html (harness/loader.js reads the
order from there). It holds the constants, `PR_S`, `prNote`, `prStep`, `prFlood`, `prLiquid`, `prWalls`, `prBurst`,
`prPush`, `prVent`, `prHeld` (the hold), `prWarn` and `prDraw` (jitter and puffs, on side dice).

| file:line | change |
|---|---|
| world.js:71, 121, 133-144, 213, 239, 252-256 | `VALVE: 55`; PICK entry; dens/free/pour; shades; SOLID; STILL |
| world.js:483-497 | burst pieces fall on, or sink (§2.4) |
| world.js:536-537, 700, 1041 | VALVE in the hard set; `CONDUCTS`; acid |
| world.js:792-798 | steam that did not rise → `prNote` |
| world.js:919 | `if (prHeld(g, nb)) continue;` before the swap |
| world.js:1215, 1241-1243 | `PR_ON`/`PR_N`; `if (PR_N) prStep(g)` before `heatStep` |
| heat.js:94, 131, 312 | def, hi, heatUp for VALVE |
| peasants.js:33-35, 522-553, P_SAY | `P_HARD`; `cold`; the "geyser" react; `rattle`, `organValve` |
| ducks.js:212-227 | `cold` |
| ideas.js:1946-1947, 2092 | a geyser watch sparks the baths; its mood line |
| pleasures.js:995-1005, 1078-1102, 896 | rattle → want and breathe; booms → blown → VALVE entry |
| wonders.js:298-312 | `wTold` case "burst" |
| game.js:18-69, 153-155, 470, 694-728, drawWorld | tip, fx, readout, sounds, the valve's look |
| audio.js:56+ | `SFX.rattle`, `SFX.valve` |
| harness/inspect.js:15-22, test/picker.js:25 | glyph; `NEW` += "SAFETY VALVE" |

---

## 11. Phases and their tests (test/pressure.js)

Each phase ships alone. test/run.js gets `require("./pressure.js")(test, check, sim)` next to :2485, and every test name
begins "pressure: ".

**Phase 1: rattle and burst.** pressure.js (flood, P, walls, strain, burst, burst pieces), the hooks in sandSteam,
sandStep and partStep, the `cold` blasts, sounds, readout, warning, and the chaos baseline. README paragraph 1.

1. "a plain village never scans a pocket, and draws master's dice": seeds 1-3 and the leftovers preset, 20,000 ticks,
   with `prStep` wrapped to count and `prHeld` to count refusals (as test/pleasures.js:394 wraps `pOrganSounds`). 0
   of either.
2. "an iron pot over a torch rattles, strains and loses the middle of its lid": the §0.3 box. A `g.prHot` entry by
   tick 60, the burst between 90 and 140, 3 lid cells gone, steam outside within 120 ticks.
3. "a burst makes and loses no heat": `prBurst` called directly, then 300 ticks for the pieces to land.
4. "glass goes before stone, stone before iron, and concrete never even strains": five pots over one torch.
5. "a pot with a hole in it, three cells of steam in the rock, and a pocket under a pond never burst".
6. "water poured on a rattling iron pot stops the rattle".
7. "a piece thrown at a ceiling comes down to the floor, and one thrown into a pond sinks to its bed".
8. "no room in the air: the burst waits, and comes when there is room": `g.np` held at PMAX - 300.
9. "a peasant on the lid is thrown and not set alight; one 20 away runs".
10. "saved while straining, loaded, the same hash 600 ticks later" (as test/run.js:1666-1682).

**Phase 2: SAFETY VALVE.**

11. "SAFETY VALVE is in MORE under BUILDING, with a colour, a name and a description", plus test/picker.js `NEW`.
12. "a valved iron pot over a torch whistles and never bursts in 3,000 ticks, and its water and steam add up".
13. "with a faucet inside, it is still whistling at 3,000", "a valve with no air beyond it is only iron".
14. "pots of 30, 48 and 68 cells whistle at 880, 696 and 584 Hz" (`g.prPitch`).

**Phase 3: push and hold.**

15. "water does not level in under steam": a U-bend, with a cloud of painted steam held over its low arm. The low arm
    does not fill while the steam is there, and does fill once it is gone.
16. "a chamber with a pipe from its bottom corner throws water ten rows above its mouth at least 300 times in 6,000
    ticks, and bursts nothing": the §0.5 RUN 4 layout, seeds 1-3.
17. "a basin ten times the size does not change P": the same chamber, scanned at the first push, with basins of 9 and
    151 across.
18. "a standpipe lifts at least 15 cells into the pond".
19. "an eruption gets an ooh, a fountain gets watchers, and a duck on the mouth goes up".

**Phase 4: the organ.**

20. "a concert never rattles the tank, and coals left in it never boil it": `organ(3)` for 15,000 ticks, and `organ(0)`
    with three coals. `g.prHot` never has a tank cell.
21. "a torch in the firebox: the organist opens a valve and it sounds until the torch is gone" (organ(1), the organist
    at the stand).
22. "a torch, nobody about: the right wall goes; the repair lays a SAFETY VALVE there; a torch again, and it whistles
    and stands".
23. Soak: `node harness/soak.js --seeds 1-6 --ticks 12000` for plain, rich, leftovers and chaos. The first three match
    the baseline. Chaos is recorded again.

---

## 12. README, in the house voice

After the heat paragraph:

> Water boiled is steam, a cell for a cell, but a cell of steam wants a great deal more room than that, and shut in, it
> pushes. A pot with a lid on it over a fire rattles; then the lid strains (hover over it: it says how much); then it
> goes, the bits of it thrown, still hot, and the cloud that comes out scalds whoever is in it without setting anything
> alight. Glass goes first. Iron rattles soonest and goes last. Concrete takes anything you can boil. Water poured on a
> rattling iron pot stops it, because cold iron turns steam back to water: that is the same heat as everywhere else,
> not a special rule. Steam shut in over water pushes the water out of whatever way it has, so a chamber with a pipe
> up out of its bottom is a fountain, as long as it is kept hot, and while there is steam over it water will not
> level back in. Run the pipe flat for any distance and it fills with bubbles that cannot get out, and chokes. Air
> does not push: it gets out through the chinks, as it does from a house. A SAFETY VALVE (MORE, under BUILDING) holds
> the steam in until it cannot, and then lets it out, whistling. A big pot hoots. A small one shrieks.

In the organ paragraph:

> Its tank is a boiler, and the organist minds it. It will not boil dry on its own: the coals go out first. A torch in
> the firebox is another matter. The organist lets it breathe, if she gets there in time; if she does not, it blows
> out its side into its own gutter, and when it is mended, it is mended with a safety valve.

Things to try:

- Shut some water in iron with a torch under it. Then do it again with a SAFETY VALVE in the lid, and again with a
  faucet inside
- Five pots in a row over one torch: glass, stone, brick, iron, concrete. Bet on the order
- A firebrick chamber full of water, a pipe out of its bottom corner up to a basin, a torch under it. Wait
- Put a torch in the steam organ's firebox

Files: `pressure.js — steam shut in, and what it does about it`.

---

## 13. Considered, and left out

- **Clean flame, and firedamp.** v1 counted burning gas and a torch's breath as steam. It sat badly with "air leaks",
  since a torch would blow any small room while a wood fire never would, and a flame lasts about 9 ticks against a
  120-point strain. Gas lit in a shut room whooshes, as it always has. Bangs are for gunpowder.
- **The insulation surprise.** Measured, stone fountains work better than firebrick ones, because the torch's heat
  gets in faster (§0.5). The README says nothing it cannot show.
- **The pond bed blowing out over lava.** Water does not seep through stone in this valley, so there is never steam
  under a pond's bed to push it.
- **Hot-air pressure.** Every house would be a bomb in every house fire, and a plain village burns houses.
- **Superheat.** Real, and a burst flashing superheated water would be grand. But it needs a boiling point per cell in
  heatStep's transition loop (heat.js:443-482), the hottest loop in the game.
- **Sideways bubbles**, so that steam could move along a flat pipe. That is a change to every steam cell in every pond.
  The vapour lock stays, and it is real enough.

---

## 14. Risks

- **Tuning.** PR_E, PR_HOLD, PR_FLANK and the `PR_S` column come from a few dozen probes. The tests pin orders and
  ranges (glass < stone < iron, concrete never, a fountain over 300 jets), not exact ticks.
- **The fountain is a fountain, not Old Faithful.** With a torch it plays steadily on what falls back. Pulses come only
  with more water than it can throw away (the 151-wide basin, §0.5), and then only beside a thin wall that sometimes
  gives. That is honest, and §6 promises only the fountain.
- **The hold in open air.** A cloud drifting over the low arm of a U-bend stops it levelling while it is there. No
  village has steam (§0.1). In a sandbox it is a puzzle for a second, and then the cloud moves on.
- **The organ's right wall** was measured on seed 1's organ. Phase 4 checks it on every organ the test suite builds, and
  that u = 12 beside the tank is air (pleasures.js:871). If something stands there, the lid
  valves (R 10) are next, and §5.1's mending works for any tank-wall entry.
- **Burst pieces.** The falling-on rule is one branch, gated on life over 240. Phase 1's test 7 covers ceilings and
  ponds, and the soak watches the particle count.

---

## 15. Review history

**v1: 7.5 / 7.5 / 8 (7.67).** The required changes, and what v2 did:

| v1 review asked | v2 |
|---|---|
| concrete contradicts itself | PR_S 24, above P's ceiling of 20. Measured: never rattles at P 16 (§0.3) |
| the organ's weakest wall is a tie left to flood order | Explicit tie order and the flank term (§2.2). Measured: the right wall goes, every time. The mending is a plan entry turned VALVE, through the existing repair |
| sandPressure undoes the push | The hold (§2.6). Measured: refused 606-1,190 times a run, about double the water thrown |
| V counts the basin | V stops at the chamber's surface (§2.1). Test 17 |
| flung solids glued to ceilings | Burst pieces fall on, or sink (§2.4). Test 7. Timber felling and the rocket's break-up are left as they are |
| clean flame | Dropped (§13) |
| no room for particles | The burst waits (§2.3). Test 8 |
| the valve's equilibrium, the chord | Re-measured (§0.4). The vent schedule is restated. The chord now comes from pitch by size |
| §0.1 to cover great works and leftovers | Done: 0 steam cells in either (§0.1) |
| grounding errors (bHide, TIPS, save.js:274, the valve arithmetic, the organist and the bell) | Fixed. The organist never leaves for the bell (`I_IDLE`, ideas.js:531), and that is why §5.1 now starts with a torch |

Where v2 disagrees: v1's "a blown valve needs no repair site" is moot, since a lid valve no longer blows. But the hole
rule now flings a neighbour only if it would have gone by itself, so hw >= 1 cannot take out the lid beside a valve.
