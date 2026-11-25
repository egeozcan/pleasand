# The hand: a plan

*They have always said it looked like a giant hand. Now it picks things up, and they have opinions about that.*

Status: **v3.1, built** (§11: all six phases, the playtest, and the review rounds that closed it) (reviews: v1 7 / 7 / 8.5, v2 8 / 8 / 8.5, v3 8.5 / 8.5 / 9). One new tool, no new
materials, no change to how any material or grain behaves, and a village that remembers what the tool did. It is
built in the six phases of §7, each of which ships on its own with `node test/run.js` green and a plain village
playing as master does. v3.1 took the last review's smaller points, before any code was written:

- **The offering is exact.** A lump of COAL is left only from a pocket, `(p.coal || 0) >= 1` and `p.coal--`, as GOLD
  already is in `iOffer` (ideas.js:1809). With neither it is a wave at the sky and no cell is written (§4.4). The hand
  makes no fuel.
- **A set-down moves its sites together.** §3.1 now says in what order: the sites that could move are found first,
  each is checked against the boxes of the sites that are *not* moving with it, and then all of them are shifted at
  once. A house and its lantern carried together go together, and cannot veto each other.
- **sStep and plStep, said truly.** `sStep` (storeys.js:341-358) needs no change, and §3.0 says why. `plStep`
  (platforms.js:446-465) gets one line, `if (s.handH) continue;`, and §3.0 says what it stops.
- **Witnesses are rationed.** A lift stops the walkers near it only if it takes a site's cell or a rider, or nobody has
  been stopped by a lift for 600 ticks (§4.5). Moving sand about all afternoon stops the village once every ten
  seconds at most, not at every press. Test 28 grows a run of rapid lifts (test 36).
- **The arrows, flagged.** Appending HAND moves where ArrowUp from PEASANT, ArrowDown from TRESTLE and the wheel over
  the flyout wrap to, as f9c3820's eight did. Recordings replay by name, and two assertions in test/picker.js change
  (§5).
- **A house lifted while it is being built or mended** is not held and not moved: its builders put it back at the old
  place, and the lifted copy, set down, is the shape of a house that belongs to nobody (§3.0, §9, test 33).
- **A lump keeps its heat to itself** in the hand and in the air, and the README says so in a sentence (phase 1).
- **Phase 4 is two.** The ledger and the fear (§7, phase 4) ship before the sky's answers, the wish and the offering
  (phase 5), so the social state lands in two halves, each reviewed on its own and each one that could be cut without
  the other. The coming-down panic of §4.5 moves into phase 2, with the knocks: it is getting out of the way, not an
  opinion. A playtest and the record are phase 6.

v3 took v2's review:

- **No switch, and no change to master's grains.** v2 turned on harder landings for every grain in the valley at the
  first lift, so molten iron set one way before and another after. That is gone, with `g.paux` and every hook in
  `partAdd`, `partKill`, `sandFling` and the landing. **The lump is a body of its own**, as a peasant or a duck is: it
  flies whole, and what it does when it hits something is its own physics (§2.5), never a grain's. Once it comes
  apart, its grains are master's grains and land as they always have. world.js gets one line, in `sandClear`.
- **The let-go is safe by default.** A thrown lump stays rigid in flight, and a big one takes only a share of the
  flick: `sqrt(60 / n)` of it, so a house with its ground (124 cells) takes 70%. It comes apart only if it *meets*
  something at 2.5 a tick or more, along the way it is going. A house let go at walking pace eight rows up lands
  whole, eight columns on. Measured by arithmetic on partStep's own gravity (§0), and pinned by a test (§7, test 12).
- **The hard set is explicit** (`H_HARDM`, §2.5): rock, stonework, concrete, firebrick, moonrock, metal, girder,
  glass, ice, the timber, and the machines. Bed, flower, wheat, lamp, linen and packed snow are not in it.
- **Riders are always let go.** CLEAR drops a flying lump and puts its riders into `"fly"` at rest (§5). A crash
  throws them off into `"fly"`, and from there **pFly's speed rule** decides (peasants.js:1278-1279), not pLand's 34
  rows: v2 named the wrong rule.
- **A cloner keeps what it was copying.** `g.cloneSrc` entries (keyed by cell, world.js:1164-1169) are taken with the
  cell and re-keyed at the set-down. A crash forgets them, as anything that comes down as grains forgets.
- **Dice, said truly.** Lift, hold, flight and set-down roll none. A crash rolls one die per grain through `partAdd`
  (world.js:383, then overwritten by the cell's own shade), a knocked-in window one more, a powder bang many. Only a
  valley the hand has broken something in rolls them.
- **Smaller fixes.** The push-aside order is pinned (take, clear, place; one reserved home per cell). The paused
  branch calls `handRide` only. A long hover stops each passer-by once, not every 10 ticks. Four phases, not three.
  `camDragging` is game.js:329 (its return 333); the test requires are test/run.js:2478-2489.

---

## 0. What we are working with (measured, and computed)

Probes on master b07c9b4, run in a scratch copy for v2. The arithmetic is new in v3:

| what | value |
|---|---|
| cells in the brush disc (`sandDab`'s `dx² + dy² <= r² + r`, game.js:429-430) | r 5: 97, r 9: 293, r 12: 489, r 16 (`SAND_MAXSIZE`): 861 |
| a house (seed 7, tick 6000, `bHousePlan` build.js:460) | 62 plan cells, 11 x 15-17. An r 10 disc round it lifts 124 cells: the house, and 62 of the ground under it |
| that house, set down whole 70 columns over | 62 of 62 plan cells in place, both windows, heat drift 0.000 |
| the same lump turned to grains at vy 2.97 (a 40-row drop) | 9 of 62 in place (15%), windows 0 of 2, heat 0.000, nothing lost: **a heap** (after the build, nothing lost however big the lump: §11) |
| the same at vy 4 (80 rows, the debris cap, world.js:469) | 7 of 62 (11%) |
| landings across the whole suite (469 tests) where v2's global rules would have fired | 1, a glass grain landing hard. Enough to move a pinned run, which is why v3 leaves grains alone |
| rows of free fall, from still, to reach 2 / 2.5 / 3.7 a tick (`vy += 0.11`, world.js:460) | 21 / 30 / 65 |
| a house let go moving (1.5, 0.8), its share 0.70, 8 rows up / 20 rows up | lands at vy 1.44, 8 columns on / vy 2.21, 15 columns on: **whole, both times** |
| the same house slammed straight down at the full flick (3.13 after its share) from 3 rows | vy 3.24: a heap. A slam is a slam |

So a gentle let-go puts a house down exactly, a careless one a little further on, and only a 30-row drop or a real
throw into something breaks it.

Leaned on, checked: the peasants already say "**is that a giant hand**" near the cursor (`P_SAY.watched`,
peasants.js:65, picked at 1687-1688). Grab and throw are `pHeld` / `peasantGrab` / `peasantThrow` (peasants.js:785-805)
and `duckGrab` / `dHeld` / `duckThrow` (ducks.js:242-259), the let-go read from `cursorVel(g)` (game.js:2107), which
the harness sets with `h.flick(vx, vy)` (harness/harness.js:1080). `pStep` returns at `held` before any danger
(peasants.js:637); a blast's push and `wEvict` skip the held (peasants.js:531, wonders.js:575). Bowling knocks people
over at speed² >= 2 (peasants.js:588-598). `bInspect` (build.js:1041) runs on finished sites every 120 ticks
(build.js:990): a few cells gone is a repair, over 60% a ruin (build.js:1060-1066). Panic runs people home (`bHide`,
build.js:1258, from peasants.js:1633).

## 1. What this adds

1. **THE HAND**, a tool in the MORE flyout under a group of its own, key **Y**. Press, and whatever is in the brush's
   disc comes up, ground and all, with anybody standing on it: anything but air, fire, steam, smoke, gas and INERT.
2. **Held**, the lump hangs under the cursor exactly as it was. Nothing in it moves, burns or cools. The sites it
   came from are on hold.
3. **Let go**, it is a lump in flight: still, it drops; moving, it carries on, a pebble at the speed of the flick and a
   hill at a fraction of it. Whatever it comes to rest against gently, it is set down on, whole. Into water, it sinks
   and the water is pushed up round it.
4. **What it hits hard, it breaks, and is broken by.** At 2.5 a tick or more it comes apart into grains of itself. A
   hard lump knocks in the window it hits and turns the glass it hits to sand, and any lump at speed knocks a peasant
   flat, and puts them out if it was wet.
5. **Sites go with it.** A house, lantern, scarecrow, grave or statue lifted nearly whole and set down whole is the
   same site, somewhere else, and a house's lanterns and the bell on its ridge go with it or come down (fixed after the
   build). Its owner runs underneath it the whole way, shouting.
6. **What they make of it**: trusted, the hand is asked for water and left coal on the hill; feared, doors shut.

## 2. The tool

```
{ tool: "hand", name: "HAND", key: "Y", more: "hand",
  desc: "lifts what is under it, ground, people and all. let go to set it down. flick it, and it flies." }
```

(The build's desc said whoever was standing on it at length, and at 123 characters the bar cut it off before the flick
once the cell readout took its right-hand end. Shortened after the build, to 100 with the name: §11.)

- **Where.** Appended after TRESTLE (world.js:121), so every brush keeps its index (saves store brushes by name and
  keyframes by place: save.js:441, 503-508). `MORE_GROUPS` (game.js:564) gets `["hand", "THE HAND"]` last. The
  flyout grows by `MORE_GAP` 3 + `MORE_HEAD` 9 + `ROWH` 10 = 22 px: `MORE_H` from 130 to 152 and `MORE_TOP` from 230
  to 208, well clear of `PLAY_Y` 14 (test/picker.js:33). Key Y is free: `gameKey` matches PICK keys first
  (game.js:1940), the PICK letters are D E F H K L N V, `gameKey`'s own are P S A C R G T B, and M is mute (game.js:2044).
- **Not a material, so not on the panel.** The panel is full (33 rows to y 350), and MORE is where brushes went in
  f9c3820. To be found, the closed MORE row's hint (game.js:1346) names THE HAND (Y) first, the flyout's title "MORE
  MATERIALS" (game.js:1235, and the hint at 1348) becomes "MORE" (no test reads it), a `TIPS` line is added
  (game.js:18), the README's Controls get a line, and the peasants already ask "is that a giant hand". After the
  first pick the MORE row shows the palm (`moreSlot`), one click away.
- **Its icon.** `ICONS.hand` (game.js:108), an open palm, 8x8, in the peasants' skin `#f1c7a0`:
  `["...s.s..", ".s.s.s..", ".s.s.s.s", ".sssss.s", ".ssssss.", ".sssss..", "..ssss..", "..ssss.."]`.
  `drawSwatch` already takes `ICONS[pk.tool]` (game.js:1184-1187).
- **The cursor** (a branch beside `"peasant"`, game.js:1111): the brush ring with the palm open, closed while holding.
- **Right-drag** still erases with HAND picked (`painting`, game.js:493). The hand is the left button only.

### 2.1 Lift (`handLift`, on press)

`gameTap`'s tool branch (game.js:1748-1759) gets `else if (pk.tool === "hand") handLift(g);`. The press is journaled
as every tap is (game.js:1699). `toolHold` (game.js:526) does nothing for a tool it does not know.

- **The anchor** is the cursor cell, clamped so that the whole disc is inside the grid.
- Every cell in the disc of `g.size`, in scan order, is lifted if `!AIRY[v] && v !== MAT.INERT`, machines too.
- Each is taken exactly as `sandFling` takes one: `q = heatQ(g, j)`, then `m = EMPTY, aux = 0, T = AMBIENT, lat = 0,
  heatAccept`. Into `g.hand.held.c` (a flat array, six numbers a cell) go `dx, dy, m, aux, sh, q`. A CLONER with a
  `g.cloneSrc[j]` has it moved to `held.clone` as `[cell number, recipe]` and the key deleted. The recipe is
  `pRecipe`'s plain object (peasants.js:324), saved already as part of `g.cloneSrc`.
- **Riders.** A peasant in `"walk"` (not dead, not `aboard`, not `g.held`) whose feet cell or the one under it was
  lifted gets `p.state = "held"` and `p.ride = {dx, dy}` from the anchor. Sleepers in a lifted bed come too, woken ("i
  was ASLEEP"). A duck in `"walk"` or `"swim"` on or in a lifted cell gets `d.ride` the same way.
- **Sites.** Every site whose box meets the disc goes into `g.hand.sites` as `{id, n, of, burn}`: `n` of its present
  plan cells (`bOk`, build.js:201) came up, out of `of`, and `burn` is `s.burning`. Finished ones are put on hold
  (§3.0). The lump keeps **ids** and looks each up again with `bSite` (build.js:172) at the let-go; one gone by then
  (CLEAR, NEW, `bRemove`) is skipped.
- `g.hand` is made at the first lift: `{held, fly, sites, lifts, gifts: [], kind: 0, cruel: 0}`, `lifts` counting them.

### 2.2 Held

- `handStep` (once a tick, from `peasantsStep` after `lTick`, peasants.js:610) calls `handRide`: the lump's place
  `held.x, y` from the cursor cell, clamped, and every rider put at place + offset with task, rope, climb and sleep
  cleared, as `pHeld` does (but without its chat die). **Paused**, the `if (!steps)` branch (game.js:680-683) calls
  `handRide` only: the lump and its riders follow the cursor with time stopped, and nothing falls or rolls a die. The
  place is stored, not read from the pointer, so the let-go is decided by state that saves.
- `pStep`'s held line (peasants.js:637) becomes `if (p.state === "held") { if (!(p.ride && g.hand)) pHeld(g, p);
  return; }`, and `dStep`'s (ducks.js:295) the same way.
- **Nothing in the lump steps.** It is off the grid. Lava in the hand stays at 1300° as long as you hold it, and a
  nuke's fuse waits. **It keeps its heat to itself**, held and in flight: a lump of lava carried, or thrown, through a
  pond does not boil a drop of it on the way, and only once it is put down (or comes apart) does its heat meet anything.
  This is the one visible exception to "every pixel has a temperature and touches its neighbours", it is the same one a
  flying debris grain makes, and the README names it.
- **Drawn** by `handDraw` into `g.px` (and the glow buffer, for cells over 450°), in `drawWorld` after the particles
  and `bDraw` and before `ducksDraw` (game.js:917-924), so riders are drawn on their hill. Colour is
  `SAND_PAL[m][sh]`, temperature `AMBIENT + (q - heatH0(m, aux, sh)) * HEAT_IC[m]`, as `heatSetQ` reckons it
  (heat.js:225-227). The first solid cell under each of its columns is darkened as a peasant's shadow is
  (peasants.js:2304-2310). Drawing only.
- **Riders sit.** peasants.js:2275 becomes `if (p.state === "held") body = p.ride && g.hand && g.hand.held ?
  P_BODY.sit : (fast ? P_BODY.panicA : P_BODY.panicB);`, and `sit` is drawn 2 lower already (peasants.js:2313). They
  sit while carried and flail in flight. `pMood` (game.js:1365, whose held line at 1366 says "does not like it") says
  "is sitting on a lump of the valley, being carried" ("... enjoying the view" if their view of the hand is positive,
  "... holding on" if negative), and in flight "is flying, with the ground they were standing on".

### 2.3 Let go (`handLetGo`)

`sandRelease` (game.js:510-523) gets `if (g.hand && g.hand.held) handLetGo(g, cursorVel(g));` after the `heldDuck`
line (519).

- **The share.** The flick is clamped to ±4.5 as `peasantThrow` clamps it (peasants.js:804), then multiplied by
  `k = min(1, sqrt(60 / n))` for a lump of `n` cells: a pebble of 60 or fewer takes all of it, a house and its ground
  70% (at most 3.1 a tick), the whole r 16 brush 26% (at most 1.2). A component under 0.5 after that is 0: a hand
  trembles. `held` becomes `fly = {x, y, fx, fy, vx, vy, c, clone, wet: 0}`. A lump of nothing (a press on empty
  sky, which still makes `g.hand`) is simply dropped.
- **Let go inside the ground** (the lump does not fit where it is): it is moved up a row at a time, as far as the top
  of the valley if need be, to the first row where it fits, and flies from there. The sky is always free.
- **Loaded mid-hold.** `saveApplyState` (save.js:479) ends with `if (g.hand && g.hand.held) handLetGo(g, [0, 0]);`,
  after it clears `down` (save.js:487; `down` is in `SAVE_INPUT`, save.js:44): the same for the browser and the
  harness, paused or not, and for keyframe restores. A save taken in flight is in flight when loaded.

### 2.4 Flight, and setting down (`handStep`, `handFly`, `handSet`)

The lump **fits** at a place if every cell is in the grid's columns, not below its floor, and on a cell that is AIRY
or LIQUID and not mortar held in its form (`sandHeld`, world.js:303). Rows above the top are sky. The valley's sides
are walls. Riders go with it, at their offsets. Each tick in flight:

1. If any lump cell is over LIQUID: `vy = min(vy, 1)`, `vx *= 0.8`. The first tick of that, a splash of `PK_GLINT`s,
   for show, as `pFly` splashes (peasants.js:1255-1262).
2. `vy = min(4, vy + 0.11)`, `vx *= 0.995` (debris's gravity, drag and cap, world.js:460, 469).
3. It moves a whole cell at a time toward `(fx + vx, fy + vy)`, x and y in turn, checking `fits` at each step.
4. **Blocked**, the speed that counts is the one *into* what blocked it: `|vx|` for a side, `vy` for the floor,
   `-vy` for an overhang. At `H_HARD` (2.5) or more, it **crashes** (§2.5). Under it: blocked at the side, `vx = 0`
   and it drops; blocked over it, `vy = 0`; **blocked under it, it is set down** where it is. (Resting on something
   at the let-go, it is blocked under on its first tick, so it is set down at once rather than hovering.)

So skidding is not breaking: a lump let go moving sideways near the ground touches down at a low `vy` and is set down
on the spot. Only a drop of about 30 rows, a slam, or a real throw into a wall breaks it.

**Set down** (`handSet`), at the last place that fitted, the lump's cells bottom row first, left to right:

- **Pushed aside.** First every cell under the lump that is LIQUID, GAS, STEAM or SMOKE gets a home: the lowest EMPTY
  cell above the lump's top in its column, or else in columns ±1, ±2, ±3, within 60 rows, not already reserved by an
  earlier one. (Fixed after the build: the 60 rows are counted from the top of the water standing over the lump, so
  a lump at the bottom of a deep lake pushes its water up to the top of the lake, and along the top of one full to
  the brim; §11, after the build.) All homes are found before anything moves; if one is missing, the lump goes up a row and tries again
  (a lump that cannot sink into a pond rests on it, and floats there). Then, for each, in order: `heatSync(g, j)` as
  `partDrop` does (world.js:415), `q = heatQ(g, j)` and its `m, aux, sh`; `j` is cleared as `sandFling` clears a cell;
  at the home `t`, `qt = heatQ(g, t)`, the material written, `heatSetQ(g, t, qt + q)`.
- **Placed.** For each lump cell: `heatSync(g, j)`, `qa = heatQ(g, j)` (air, or FIRE, which is smothered and keeps
  its heat in the cell), then `m, aux, sh` as they were, `vy = 0`, `heatSetQ(g, j, qa + q)`. A window is a window, a
  door keeps its knob, a cloner gets its `g.cloneSrc` back at the new index.
- **Riders** are put down at their offsets: `state = "walk"`, `fallY = y`, `delete p.ride`, `P_SAY.touchdown`
  ("nailed it", "ten out of ten", peasants.js:114). Ducks to `"walk"`.
- **Sites**: §3.

Whatever was loose in the lump (sand, water, powder) is loose again once placed, and slumps by its own rules.

### 2.5 What it hits (`handHit`, `handCrash`, `handKnock`)

These are the lump's rules, as `pFly`'s are a thrown peasant's. Nothing else in the valley obeys them, and no grain is
changed by them. `H_HARDM` is a table: STONE, COAL, ORE, GOLD, ROCKSALT (`ROCK`, world.js:241-242), BRICK, CONCRETE,
FIREBRICK, MOONROCK, METAL, GIRDER, GLASS, STAINED, ICE, the `WOODY` six (world.js:244-245), and TORCH, FAUCET, DRAIN,
CLONER. Not BED, FLOWER, WHEAT, LAMP, LINEN or PACKSNOW, though they are `STILL`, and nothing loose.

**At a crash**, before it comes apart, the cells that stopped it (the ones its leading cells could not move into) are
struck, each by the lump cell behind it:

| struck | by | what happens | heat |
|---|---|---|---|
| GLASS or STAINED | a hard cell | it is SAND (`heatBecome`, heat.js:244): the pane pours out of its frame | kept: both have `heatH0` 0 |
| a window (PLANK, aux 1, build.js:477-478) | a hard cell | knocked in: `sandFling(g, j, vx * 0.5, vy * 0.5)`. It lands inside as a plank, and `bInspect` mends the window | goes with it |
| anything else | anything | nothing: a lump of water against a window is a splash |  |

Then **it comes apart** (`handCrash`), if the particle pool has room (`g.np + n <= PMAX - 400`, the margin `sandBoom`
keeps, world.js:519); if not, it is set down whole (or, at a wall, it drops). Its own GLASS and STAINED cells become
SAND and its ICE SNOW (shattered, crushed: Q kept, and `heatSetQ` at the landing gives the new temperature). If it
holds GUNPOWDER, the first powder cell is put back in the grid where it is and `sandBoom(g, j)` is called: one bang a
crash, and the rest go up as they land by its fire, as powder does (world.js:940). Every other cell becomes a
`PK_DEBRIS` grain at its place (`partAdd`, then `pt = q`, `ps = sh`, life 240, as `sandFling` makes one) with the
lump's `vx, vy`, or `vx = 0` if the wall it hit was the valley's edge, so that nothing is thrown off it. `partStep`
lands them over the next few ticks, and its swap-on-kill (`partKill`, world.js:388) reorders them as they land: a
heap, not a restacked house (§0: 15% of a house in place from 40 rows).

**They land as master's grains land** (world.js:494), with aux 0. A window comes down a plank, a door forgets its
knob, molten iron sets as stone, as it does when a bang throws it, and a cloner forgets who it was copying and copies
the next one to touch it. A nuke lands with its count started again, and if it lands at 2 a tick or more,
sandPowder's landed-hard rule puts it at 200 (world.js:951): a nuke that had nearly gone gets a few seconds back. Do
not rely on this.

**Riders at a crash** are thrown off into `"fly"` with the lump's `vx, vy`, `flyT = 0`, `fallY = y`, and no
`immune`: it is a fall, not an arm's swing. `pFly` decides (peasants.js:1278-1279): over 2 a tick when they meet
the ground, "oof"; over 3.7, a splat. So a rider in a house dropped from 30 to 65 rows gets up dizzy, and one dropped
from higher does not, as anybody dropped by the PEASANT tool from there does not. Ducks go `"thrown"` as `duckThrow`
throws them.

**Knocks** (`handKnock`, each tick in flight, a pass over `g.peasants`). A living peasant in `"walk"` (not riding,
`held`, `fly` or `space`) whose body (`|p.x - x| < 1.5`, `p.y - 8 <= y <= p.y`) holds a lump cell, while the lump
is going at speed² >= 2 (the bowling rule's own speed, peasants.js:588), is knocked over as bowling knocks them
(peasants.js:593-597): `"fly"`, `flyT 0`, `immune 6`, `fallY = y`, "oof", `g.fx.thud`, and a shove, not a throw
(fixed after the build: it was bowling's own `vx = lump vx * 0.8 + ...`, `vy = min(lump vy, 0) - 1.2`, which sent
them a hundred rows up after an upward pebble, or over the valley's wall): `vy = -1.2` whichever way the lump is
going, `vx = lump vx * 0.5 + (p.x - lump middle) * 0.1` clamped to ±0.7 (`H_SHOVE`: 0.7² + 1.2² is under bowling's
2, so they bowl nobody over), and 0 toward a wall they are within three columns of. That hop is some fifteen columns
along, more where the ground falls away, so it is `p.shoved` (and a duck's `d.shoved`), set by the knock and gone once
they are down, that keeps them in the valley: `pFly` and `dThrown` take the edge for a wall while it is on, as `pFly`
does for a rocket pack (fixed after the last review: §11). The lump goes on at `vx *= 0.9`,
and keeps a list of whoever it knocked (`f.knocked`, their ids, saved with the flight). If any lump cell in them is
WET and they are on fire, the fire is out (`p.fire = 0`, the hiss and "phew" of peasants.js:674-677). A duck is
knocked `"thrown"`, with a quack, and the same shove. Set down whole where it knocked somebody, the lump puts them up
out of it and lets them fall, as a rider with no room (§2.4); come apart there, it marks them `p.handOff`, as a rider
thrown off, so that the grains do not bury them either (fixed after the build). Slower than that, a lump coming down
on somebody it did not knock buries them, as painting stone on them does (peasants.js:714-720), and §4.5's panic is
their warning.

## 3. Sites go with it

### 3.0 On hold, then ruled on

At the lift, every **finished** site with a plan cell taken gets `s.handH = 1`.

- `bInspect` (build.js:1041) gets a first line: `if (s.handH) return;`. A held house is not a ruin and not a repair
  job, and nothing is mended at the old place while it is in the air.
- `ideasStep`'s site loop (ideas.js:547-572) gets `if (s.handH) continue;` before `iFlames` (553). A held burning house
  is neither burning nor put out in the books, and the flames it left behind in the air are not news. `s.burning` is
  kept until it comes down.
- The lamp cleanup (ideas.js:550) removes an unhung lantern only once its house is no longer a site, and a held
  house is still one. No change.
- `sStep` (storeys.js:341-358): **no change.** Its loop removes a storey only when its base is no longer a site
  (`bSite(g, s.base)`, 351), and nothing removes a held site: `bInspect` returns at `s.handH`, and the hand itself
  never calls `bRemove`. Its other steps (`sPlotCheck`, `sNoPane`, `sRoofStep`, `sLines`) go by site ids and kinds, and
  a storey or a base is never moved (§3.1), so a held one is judged at the old place when it comes down, as any is.
- `plStep` (platforms.js:446-465): **one line**, `if (s.handH) continue;`, first in its loop. Without it, `plTrim`
  (462, every 300 ticks, on any deck with a ladder, done or not) would read the ground under a held deck's old place
  and set `e.off` on its rungs, which makes `bOk` call them fine for 900 ticks after it comes down; and `plHouseOn`
  (464) would plan a house on a held deck that had none. A held house whose deck has gone meanwhile is removed by the
  first branch (451) at the next `plStep` after it comes down, as it would have been.
- Unfinished sites are not held. Their builders put back what the hand bit off, as they would anything. That includes
  a house still being built or one reopened for repairs (`!s.done`) lifted *whole*: the builders rebuild it at the
  old place, and the copy in the hand, set down, is the shape of a house that belongs to nobody. It is not moved
  (§3.1 wants it done at the lift). It is planks and a bed where they were put, and what the village does with
  planks that are nobody's it does with these.

At any end of the flight (set down or crash), each site on the list is ruled on. If it moves (§3.1), it is shifted.
Then `delete s.handH; s.handT = g.tick;`. A site that did not move is judged at the old place within 120 ticks by
master's own `bInspect`: a few cells gone is a repair ("the village is fixing Gary's house"), more than 60% a ruin.

### 3.1 Moved (`handShift`)

At a set-down, a site on the list is moved if all of these hold:

- its kind is `house` (huts too), `lamp`, `scarecrow`, `grave`, `statue` or `bell` (`H_MOVES`), small things whose
  coordinates are all known; and a lantern or a bell only with what it hangs from (fixed after the build: §11);
- it was done at the lift, with `n >= 0.9 * of` and `of >= 2`;
- it is not a storey or a storey's base (`sOver`, storeys.js:48), not on a deck (`s.deck`), not a great work;
- for a house, the cell over its bed is not LIQUID once set down: a house at the bottom of the lake is a wreck;
- none of its shifted plan cells falls in the box (pad 0) of a site that is **not moving with it**: set down in
  somebody's field, it is a mess in a field.

**The order**, since one lump can carry a house, its lantern and the scarecrow by the door. The move `(DX, DY)` is one
for the whole lump: from the anchor at the lift to where it came to rest.

1. The **candidates** `C` are the sites on `g.hand.sites` that pass the first four tests, in list order.
2. Each candidate's shifted plan cells are checked against the boxes of every site in `g.sites` that is not in `C`,
   as they are (unshifted: those are not going anywhere). `bSiteAround` (build.js:292) returns only the first site it
   finds and cannot skip a set, so this is a loop of its own, `handBoxHit(g, i, C)`. A candidate that fails is taken
   out of `C`, and since it now stays where it was, step 2 is run again for the rest, until a round takes nobody out
   (at most `C.length` rounds of a handful of sites). The sites left in `C` are checked against nothing in `C`: they
   move by the same `(DX, DY)`, so whatever lay between them lies between them still.
3. **All of `C` is shifted at once**, then the marks are remade, as below.

For each site in `C`: `bMark(g, s, 0)` (build.js:136);
every plan entry's `i += DX + DY * g.gw` (the EMPTY ones too); then the box `x0 y0 x1 y1`, `cx cy`, and whichever of
`F G iy0` (rows), `ix0 ix1 px` (columns), `bed {x, y}` and `win[]` the site has (`bHousePlan` build.js:484-485, `bHut`
1470-1471, ideas.js:1517, 1583, 1680, 1746); then `bMark` again for every site, as `bRemove` does (build.js:166-167).
Up to 10% of plan cells did not come: `bInspect` mends them at the new place. The few left at the old place belong to
nobody. A lantern's `home` is still its house's id, and a bell's `on`; a bell's mouth (`bx`, `by`) moves with it.
A lantern or a bell left behind by its house, standing in the air where the wall or the ridge was, comes down
(`handFall`, fixed after the build: §11). A scarecrow carried to the duck pond works there
(`iScarecrowNear`, ideas.js:1700, goes by `s.cx`). The feed says "Gary's house has moved. Gary was not asked" (key
`"hand" + s.id`, with the arrow). Tale `"moved"`.

### 3.2 Chased

A house lifted with `n >= 0.3 * of` gives its owner `{kind: "chase", site, t}`, unless they are riding in it, on fire
or on a bucket. `handTask` goes in `iTask`'s chain before `oTask` (ideas.js:508). It walks them toward the column
under the lump with `iWalk`, keyed by that column `>> 3`, so a new route is asked for only every 8 columns, shouting
`P_SAY.handChase` ("MY HOUSE", "PUT IT BACK", "that's MINE", "careful with the bed"). It ends when the flight ends,
or after 3,000 ticks, or (fixed after the build) after 1,500 with the lump over the same 8 columns (`H_STAND`), and
they splash through a puddle on the way after it, as far as swimming. `chase` joins `I_IDLE` (ideas.js:531), so a fire alarm takes them off it. §4.5's panic sends
them out from under a lump that is coming down.

### 3.3 Wrecked

`bInspect`'s ruin branch (build.js:1060-1066) gets, before its feed: `if (s.handT != null && g.tick - s.handT < 3000)
handRuined(g, s, o);`. The tale is `"flew"` ("the time Gary's house flew") instead of `"house"` ("burned down",
wonders.js:308), and it is booked (§4.1). A house that was burning at the lift is not booked: the fire had it already.

## 4. What they make of it

### 4.1 The ledger: seven deeds, all of them visible

`g.hand.kind` and `g.hand.cruel` are the village's tallies, `p.feel` (-9 to +9) each peasant's, read `|| 0`.
`handDeed(g, p, d, k, c)` adds the amounts, and rolls nothing. A peasant's **view** is `p.feel` if it is not 0, or else
the village's: +1 if `kind - cruel >= 3`, -1 if `<= -3`, else 0.

| deed | what the player sees | personal | village |
|---|---|---|---|
| **put out**: a site's fire goes out within 900 ticks of the hand putting water in its box (§4.2), or a burning house is set down in water | "the sky put out the fire at Gary's house" | owner +3, wisher +2 | kind +2 |
| **moved**: their house set down whole somewhere else | "Gary's house has moved" | -1 ("i was not ASKED"), or +2 if it was burning or flooded at the lift | +1 in that case |
| **wrecked**: their house a ruin within 3,000 ticks of the flight's end, not burning at the lift | "Gary's house is gone" | owner -3 | cruel +2 |
| **knocked**: knocked flat by a flying lump | "oof", on their back | -2 | cruel +1 |
| **rode**: set down standing after a ride | "nailed it" | +1 | |
| **took**: the hand lifted their offering (§4.4) | "THE HAND TOOK IT" | giver +1 | kind +1 |
| **zapped**: struck by lightning once `g.hand` exists (a line in `pZap`, peasants.js:491) | the X-ray flash | -2 | cruel +1 |

All seven are the player's doing: a knock comes only from a lump, and lightning in this valley only ever came from
the LIGHTNING tool (game.js:533, the one caller of `sandLightning`). Before the hand they took it for weather. Once
they have seen the hand, they put two and two together.

### 4.2 Water from the sky

`s.handWet = g.tick` when a set-down places a WET cell in the box of a site on `g.blaze`, or a crash makes WET grains
within it (checked only while `g.blaze.length` is non-zero, against a handful of boxes). In `ideasStep`, where a
site's flames are found gone (ideas.js:556), before the brigade's line: `if (s.burning && s.handWet && g.tick -
s.handWet < 900) handPutOut(g, s);`. That says "the sky put out the fire at Gary's house" (key `"blaze" + s.id`, so it
replaces "on fire!" and the brigade's line), books it, tells the tale `"saved"`, and sets `p.thank = g.tick` on the
owner. A thrown pond that bursts on a burning roof counts as much as one set down on it.

**The dunk** is the other way round, checked at the set-down: if the lump carried at least 30% of a burning site and
pushed 20 or more liquid cells aside, it is put out there and then. Its embers are next to water, and the ember rule
makes them ash (world.js:1133-1137). Whether it is also *moved* is §3.1's question, and in a lake it is not.

### 4.3 Asking

In `iUrgent`'s no-water branch (ideas.js:486), after its `pSay`, so its dice roll as before: `if (g.hand)
handWish(g, p, best);`. It fires if `p`'s view is positive and the site has not been wished for in this fire
(`s.wishT < s.burning`). The feed, with the arrow: "Gary looks up. 'water, please. from anywhere'". `p.ask = 300`;
while it lasts, `handStep` sets `p.idle = 2` and `p.pose = "panicA"` after their `pStep`: arms up, held still
(peasants.js:191, drawn through `p.pose` at 2285, since `pStep` resets `pose` at 708). A wished-for fire put out by
the hand adds "ANSWERED" to the feed line. It is the only wish: for everything else that goes wrong in the valley,
they already have a job.

### 4.4 Thanks, and the offering

`iPick` (ideas.js:395) gets, after the eureka line: `if (p.thank && handThank(g, p)) return true;`. Within 6,000
ticks of the deed, idle, they find the cell beside them that is EMPTY, on something solid, with open sky for 20 rows,
and leave on it the best they have, out of their pocket, as `iOffer` does (ideas.js:1808-1810): **a nugget of GOLD** if
`(p.gold || 0) >= 1` (`p.gold--`), else **a lump of COAL** if `(p.coal || 0) >= 1` (`p.coal--`, the pocket leftovers.js
already keeps, leftovers.js:572), each with `sandSet` and `heatAccept` as `iOffer` writes its nugget; else a wave at
the sky, and no cell is written. Nothing is made: what is on the hill came out of somebody's pocket. "Gary left a
lump of coal for the hand. it is what he had".
`g.hand.gifts.push({i, m, who})`, at most 8. A lift that takes a gift's cell (still that material) is "THE HAND TOOK
IT": deed *took*, `P_SAY.handTook` ("it TOOK it", "it likes coal!", "i'll bring more"), achievement ACCEPTED. A gift
left alone is just a cell: a little row of coal on the hill.

### 4.5 Under the lump

Every 10 ticks while a lump is held or flying, `handStep` passes over the peasants in its columns `[x0 - 2, x1 + 2]`
below it:

- **Coming down** (flying, `vy > 0`): everyone under it panics outward (`p.panic = 60`, `p.dir` away), "look out
  below!" (`P_SAY.timber`, peasants.js:119). Anyone would.
- **Held, view negative**: `p.panic = 120`, outward. A panicking peasant runs home (`bHide`): the afraid go indoors
  and shut the door. (The hand can lift the house. They have not thought of that yet.)
- **Held, view not negative**: a free walker (no task, or an `I_FUN` one, ideas.js:529) who has not looked up at this
  lift (`p.handSeen !== g.hand.lifts`) stops and looks up, `p.idle = 30`, once. The positive ones `p.ask` and wave. One
  in ten says `P_SAY.handUnder` ("is that my house", "it's raining sky", "hello up there", "can i have a go"). A long
  hover is a show each passer-by stops for once, not a spell on the village.

At a lift, the witnesses: free walkers within 80 columns stop for 60 ticks (and are marked as having looked), and
up to three say `P_SAY.handLift` ("the ground is going UP", "who ordered that", "oh no it's the hand again"). **Not at
every lift**: only one that takes a plan cell of some site or a rider, or the first lift after 600 ticks in which no
lift had witnesses (`g.hand.wT`, the tick of the last that did, read `|| -1e9`). A player moving sand about, press
after press, stops the village once every ten seconds at most; lifting somebody's house or somebody always stops it.
Under a held lump the rule above (once a lift) is unchanged.

### 4.6 What they say, and what is shown

The chat line (peasants.js:1688) picks `"watched"` when the cursor is near. With the hand known and a view, it picks
`"handLove"` ("hello, hand", "we left you some coal") or `"handGrudge"` ("YOU", "i know what you did", "put my house
back") instead: one `pSay` either way. (Fixed after the build: a window knocked out has its owner, if they are near
and awake, say so as it goes, `P_SAY.handSmash` ("MY WINDOW", "i JUST fixed that"); and the first lift anybody sees is
never "oh no it's the hand again", `P_SAY.handLiftFirst`.) The PEASANTS popup (`popRows`, game.js:1437) gets THE HAND once `g.hand`
exists: "trusted" / "feared" / "not sure", and the two tallies as bars. Three achievements: ACCEPTED; A KINDLY HAND
("the village leaves out coal for it now"), at `kind >= 10 && cruel * 3 <= kind`; and THE WRATH ("they have started
hiding when you move the mouse"), at `cruel >= 10 && kind * 3 <= cruel`.

### 4.7 Tales and plays

`wTold` (wonders.js:298) gets four tales: `moved` "the hand moved {n}'s house", `flew` "{n}'s house flew", `rode` "{n}
rode on the hand" (after a ride of 100 columns or more), and `saved` "the hand put out {also}". `M_RANK` gets `flew:
8, rode: 7, moved: 6, saved: 6`. `M_SCRIPTS` has the second actor play the hand, in the `fling` pose:

```
flew:  [{ r: 0, pose: "stand", line: "i am {s}. this is my house" }, { r: 1, pose: "fling", line: "*is the hand*" },
        { r: 0, pose: "panicA", line: "MY HOUSE" }, { r: 1, leap: 1.2, line: "*throws it*" }, { r: 0, fall: 1, line: "oh" }]
moved: [{ r: 0, pose: "sleep", line: "zzz" }, { r: 1, dx: 4, pose: "walkA", line: "*is the hand, carrying a house*" },
        { r: 0, pose: "panicA", line: "this is not where i live" }]
```

`M_REACT.flew = ["hahaha", "MY HOUSE", "*gasp*", "i was there", "it flew so far"]`. `rode` and `saved` fall back to
`any` ("this is the time {t}", monuments.js:208), as other tales do.

## 5. Determinism, saves, heat: the rules kept

- **A village that never lifts goes exactly as it did.** `g.hand` is made at the first lift. `s.handH`, `s.handT`,
  `s.handWet`, `p.ride`, `d.ride`, `p.feel`, `p.thank`, `p.ask` and `p.handSeen` are written only by the hand. The
  hooks: `if (g.hand)` in peasantsStep's `handStep`, `pZap`, `iUrgent`, the chat line, `sandRelease`, the paused
  branch, `saveApplyState`, `camDragging`, `drawWorld`, `sandClear`; `s.handH` / `s.handWet` in bInspect and
  ideasStep; `p.ride` in pStep, dStep, peasantGrab, duckGrab, peasantsDraw, pMood; `p.thank` in iPick. On every path a
  plain village walks, that is a property read that finds nothing. **partStep, partAdd, partKill, sandFling and the
  landing are not touched.** No dice, no site kinds, no table entries change. So these hold: test/valley.js's
  `44ff922d` (valley.js:35); test/wonders.js's `27c63d83572cdf83` / `e4a8c3ddf17eef3f` (wonders.js:76), `dc6bb627`
  (93), and seed 3's idea order with `03cf4e61` (100); and harness/soak-baseline.txt.
- **Dice.** Lift, hold, `handRide`, flight, set-down and the ledger roll none. A crash rolls one `irnd(256)` per grain
  in `partAdd` (world.js:383; the shade is then the cell's own), the splash its glints, a knocked-in window one through
  `sandFling`, a powder crash a bang's worth. The village's reactions (pSay, bHide, panics) roll the main dice, as every
  reaction does. All of it happens only in a valley the hand has touched, and per tick, so at any speed the same.
- **Tables only added to.** New `P_SAY` keys (`handLift`, `handUnder`, `handChase`, `handWish`, `handTook`,
  `handLove`, `handGrudge`, `handWoke`) and `P_ACHIEVE` keys. test/wonders.js:61-70 hashes the listed keys, and no
  listed line changes. `watched` keeps its lines.
- **Saves.** `g.hand` is plain objects and number arrays (no Map, Set or closure: saveEncode, save.js:111-150). In
  flight, a save keeps the lump with its heat and speed, and it flies on when loaded. Mid-hold, loading lets it go
  still (§2.3). Riders are saved `held` with `p.ride`. An old save has none of these keys, and all are read `|| 0` or
  made lazily. `saveApplyState`'s deleting of absent keys (save.js:481-483) is what we want: loading a plain save
  over a hand village leaves no `g.hand`.
- **NEW**: `ideasReset` (ideas.js:240) gets `delete g.hand;`.
- **CLEAR** (`sandClear`, world.js:1251, from the button at game.js:634 and key C) gets `if (g.hand) handClear(g);`.
  `sites` and `gifts` go (CLEAR has emptied `g.sites`, 1257, and the hill). A **flying** lump goes too: its cells came
  from a valley that is gone, and its riders are let go, `delete p.ride`, `state = "fly"`, `flyT 0`, `vx = vy = 0`,
  `fallY = y`, `immune 4` (as `peasantThrow` lets go, peasants.js:803), so that they drop into the empty room and land
  by pFly. One taken up over the top of the valley is let go at row 0 (`p.y = max(p.y, 0)`, a duck's `d.y` too), not
  where they were: from row -85, pFly's first step was under -40 and sent them to space, a tale, and a reentry
  (fixed after the build). Its ducks go `"thrown"` at rest. A **held** lump is kept, riders and all: CLEAR empties the valley, not
  your hand.
- **A PEASANT grab of a rider** (only possible in flight, since holding needs the button): `peasantGrab`
  (peasants.js:793) and `duckGrab` get `if (p.ride) delete p.ride;`. `handStep` drops any rider no longer `"held"`,
  which covers a nuke's heart (peasants.js:528) too.
- **Edge-panning.** `camDragging` (game.js:329) gets `|| (g.hand && g.hand.held)` in its return (333). Carrying a lump
  into the edge of the view brings the view along, as a stroke or a held peasant does (game.js:362).
- **Heat is conserved, matter too.** Lift, hold, flight, set-down and push-aside move heat cell to cell through
  `heatQ` / `heatSetQ` (§0: drift 0.000). The lump never leaves the valley (its sides are walls, and the sky gives it
  back), and a crash at the edge throws nothing over it. The one loss left was master's: a crash grain with no free
  cell within 6 leaves its heat and not its matter (`partDrop`, world.js:406). Fixed after the build: the hand's own
  grains are marked (`g.ph`), and one that would be lost is put down in its column instead (§11, after the build).
- **The picker.** HAND is appended. `ui.picks`, brush names and keyframe places stay. The flyout's rows move up
  22 px, and recordings name what they pick on it (`sel:NAME`), so they replay.
- **The arrows and the wheel wrap somewhere else.** `gameKey`'s ArrowUp / ArrowDown (game.js:1941-1942) and the wheel
  over the list (1931) go round all of PICK, and `moreStep` (598-602) round MORE's part of it, so with HAND last:
  ArrowDown from TRESTLE is HAND (it was PEASANT), ArrowUp from PEASANT is HAND (it was TRESTLE), and the wheel up
  from COAL over the flyout is HAND (it was TRESTLE). This is the change f9c3820 made when it appended eight, and it is
  acceptable for the same reasons: a harness scenario records the brush each arrow or wheel step came to by name
  (`Harness.prototype.key` and `wheel`, harness/harness.js:971-1000) and replays to that; one from before names were
  kept steps up and down the list it was recorded with (`sc.picks`, or master's, harness.js:1182, `_stepSel` 965); a
  save picks its brush by name and its keyframes by `ui.picks` (save.js:503-509); and the browser's input journal is a
  record, never replayed. The two assertions in test/picker.js that pin the old wrap (the test "the wheel over the
  flyout goes round MORE's brushes only", test/picker.js:119 and 126-127) are changed to HAND in phase 1, and test 31
  checks that a scenario recorded before HAND still lands where it did.

## 6. Performance

| when | cost | how it stays cheap |
|---|---|---|
| never used | one `if (g.hand)` a tick, a few property reads per peasant | nothing else exists. partStep is untouched |
| lift | the disc (<= 861 cells), the sites whose boxes meet it, the peasants once | once per press |
| held | `handDraw` (<= 861 pixels, only columns in view), riders, a peasant pass every 10 ticks | no grid work: the lump is off the grid |
| flight | `fits` per whole-cell step: <= 861 x 2 x 5 lookups a tick; one pass over `g.peasants` for knocks | a second or two, then it is over |
| set down | homes for what it displaces: typically the lump's width x a few rows; <= 861 x 60 x 7 at the very worst | once per flight |
| crash | <= 861 grains, then partStep as for any bang | once per flight |

Nothing grows with the valley's width. Phase 2 measures the worst case, a full-brush lump thrown and crashing in the
middle of a 1,088 valley at 4x, against the wide-valley budget (docs/wide-valley-spec.md:306-311): no update over
9 ms p95.

## 7. Phases

`hand.js` (new; a `<script>` after ducks.js and before save.js in index.html, which the sim and the harness read
from there, harness/loader.js:22-29) holds the functions, all named `hand*`. Tests go in `test/hand.js`, a module
like test/platforms.js, its names starting `"hand: "`, required beside the others at the bottom of test/run.js
(2478-2489, after picker.js). Tests keep the numbers v3 gave them (1-30) and the new ones go on from 31.

Every phase ends with the same gate, besides its own tests:

- `node test/run.js` green: the 469 there are now and every `hand:` test so far;
- the master guards in it unchanged: test/wonders.js's table hashes (61-70), the plain village's dice for 3,000 ticks
  (`27c63d83572cdf83` / `e4a8c3ddf17eef3f`, 76), NEW's `dc6bb627` (93), seed 3's idea order and `03cf4e61` (100);
  test/valley.js's `44ff922d` (35); test/run.js's `SAVE_SKIP` = snapshot `SKIP` (1684-1688);
- `node harness/cli.js selftest` 25 of 25;
- `node harness/soak.js --seeds 1-6 --ticks 12000` for plain, rich and chaos the same as harness/soak-baseline.txt in
  every column but ms/t (alive, sites, ideas, dead, and "clean"), and ms/t within about 5% of it: a village
  that never lifts is master's village.

None of the soaks ever picks HAND, so the soak is the guard on "a village that never touches it goes as it did", and
test 1 the guard on `g.hand` never being made.

### Phase 1: the careful hand (about 270 lines)

The tool, the lift, the hold, a still let-go, a straight drop, the set-down, and the crash of a lump dropped too far.
Sites are held while carried and ruled on at the old place after. Nothing is thrown sideways yet: the flick is read
as `[0, 0]`.

- **hand.js**: `handLift` (§2.1: the anchor, the disc in scan order, the cell taken as `sandFling` takes it into
  `held.c`, `cloneSrc` into `held.clone`, riders, ducks, `g.hand.sites` with `n`, `of`, `burn`, `s.handH` on finished
  ones); `handRide` (§2.2); `handLetGo(g, v)` (§2.3: still only, the fit-upward rule, a lump of nothing dropped);
  `handFits`; `handStep` (once a tick: `handRide` while held, `handFly` in flight, dropping riders no longer
  `"held"`); `handFly` (§2.4, steps 1, 2, 4 in y only: the liquid slow-down without the splash, gravity, a whole cell
  at a time, blocked under at `vy < H_HARD` set down, at `vy >= H_HARD` crashed); `handSet` (§2.4: homes for what is
  pushed aside, all found first, up a row and again if one is missing; then placing with `heatSync`/`heatQ`/
  `heatSetQ`; `cloneSrc` re-keyed; riders down with `P_SAY.touchdown`; ducks to `"walk"`); `handCrash` (§2.5's
  coming apart only: every cell a `PK_DEBRIS` grain with the lump's `vy`, the pool margin rule, riders thrown off into
  `"fly"` with no `immune`, ducks `"thrown"`. No glass, ice or powder rules yet: those cells come apart as grains like
  any other); `handEnd` (each site on the list: `delete s.handH; s.handT = g.tick`, nothing moved); `handClear`
  (§5's CLEAR rule); `handDraw` (§2.2, with the shadow); `P_SAY.handWoke`.
- **world.js**: the PICK entry after TRESTLE (121), `{ tool: "hand", name: "HAND", key: "Y", more: "hand", desc }`;
  `sandClear` (1251) gets `if (g.hand) handClear(g);`.
- **game.js**: `MORE_GROUPS` (564) gets `["hand", "THE HAND"]` last; `ICONS.hand` (108); the cursor branch beside
  `"peasant"` (1111); `gameTap`'s `else if (pk.tool === "hand") handLift(g);` (1748-1759); `sandRelease` (519) `if
  (g.hand && g.hand.held) handLetGo(g, [0, 0]);` (phase 2 passes `cursorVel(g)`); the paused branch (680-683)
  `if (g.hand) handRide(g);`; `camDragging`'s return (333) `|| !!(g.hand && g.hand.held)`; `drawWorld` calls
  `handDraw` after the particles and `bDraw`, before `ducksDraw` (917-924); the flyout title (1235) and its hint
  (1348) "MORE"; the closed row's hint (1346) names THE HAND (Y) first and TRESTLE with the rest; a `TIPS` line at
  the end ("tip: press Y, and pick up the pond"; `g.tip = irnd(TIPS.length)`, game.js:162, rolls one die
  whatever the length, as f9c3820's tip did; `g.tipN` after the build, so that it is not also tidy.js's heap); `pMood`'s held line (1366) for riders (carried, flying; the
  view's two variants wait for phase 4).
- **peasants.js**: `pStep`'s held line (637) `if (p.state === "held") { if (!(p.ride && g.hand)) pHeld(g, p);
  return; }`; `peasantsStep` calls `if (g.hand) handStep(g);` after `lTick` (610); the body pick (2275) sits riders;
  `peasantGrab` (793) `if (p.ride) delete p.ride;`.
- **ducks.js**: `dStep`'s held line (295) the same way; `duckGrab` (242) the same `delete d.ride`.
- **save.js**: `saveApplyState` (479) ends with `if (g.hand && g.hand.held) handLetGo(g, [0, 0]);`.
- **ideas.js**: `ideasReset` (240) `delete g.hand;`; `ideasStep`'s site loop `if (s.handH) continue;` before `iFlames`
  (553).
- **build.js**: `bInspect` (1041) `if (s.handH) return;` first.
- **platforms.js**: `plStep`'s loop (448) `if (s.handH) continue;` first (§3.0). storeys.js: no change (§3.0).
- **test/picker.js**: `NEW` (25) gets `"HAND"`; the per-entry check (30) gets a tool branch, `q.tool ? w.ICONS[q.tool]
  && q.desc : (...as now)`; the wheel-and-arrows test's "a step up from COAL" (119) and "down from TRESTLE" (126-127)
  expect HAND, and it adds "down from HAND is PEASANT".
- **README**: after the platforms paragraphs (539-559), the first paragraph of §7's README text below, with the
  heat sentence; a Controls line (580-612), "**Y** the hand: press to pick up what is under the brush, let go to put
  it down"; a Files line (678) for hand.js; Things to try (614): "Lift the pond. Carry it to the fire." and "Lift a
  peasant on a hill, take them for a ride, and set them down gently."

> And there is the hand. They have always said it looked like one. Pick HAND (under MORE, or press Y) and press:
> whatever is under the brush comes up, ground and all, and anybody standing on it comes too, and sits down. Nothing
> in it cools, ticks or grows while you hold it: a nuke in the hand waits, and a lump of lava keeps its heat to itself
> until it is put down, so you can carry it through the pond and boil nothing. Let go and it comes down in one piece,
> which is how you move a hill, or a pond (put it in another pond and the water makes room). Let go of it from high
> up over hard ground and it comes down in pieces, and so does anybody sitting on it.

**Acceptance.** Tests 1-11, 31 and 32, and the gate.

1. "hand: a valley never touched by the hand makes no g.hand, and seed 3 thinks as master does" (12,000 ticks; the
   idea order and `03cf4e61`, as test/wonders.js:100).
2. "hand: HAND is in MORE under THE HAND, after TRESTLE, with its icon, and the flyout fits" (`MORE_TOP > PLAY_Y`, the
   group's header row and one brush row in `MORE_ROWS`, `MORE_H` 152).
3. "hand: lifted, held 300 ticks and set down, the heat in the room and the hand together is what it was" (exact with
   no steps; within the room's own exchange otherwise), "and lava held 600 ticks over a pond leaves the pond as it was"
   (the pond's total `heatQ` and its liquid count unchanged while held).
4. "hand: from 3 rows a house is set down whole; from 40, a heap; into a pond it sinks, and every drop of the pond is
   still there, each in a cell of its own, with its heat": 62 of 62 in place; under 30% in place with material counts
   and heat kept; liquid count and liquid heat equal.
5. "hand: a peasant on a lifted hill sits while carried and is set down standing; dropped from 40 rows they get up
   dizzy (pFly's oof, not pLand's); a duck in a lifted pond comes too".
6. "hand: a house held 1,000 ticks is still a house: done, its owner's home, not a ruin, not being mended".
7. "hand: a cloner that is copying Gary, lifted and set down 50 columns over, still makes Garys".
8. "hand: saved while holding a house with somebody in it, loaded twice (once paused): let go on load, the same hash
   600 ticks later; saved in flight, it flies on" (and an old save, test/fixtures/valley-272.json, loads with no
   `g.hand`).
9. "hand: CLEAR while holding keeps the lump; CLEAR in flight drops it, and its rider is walking 300 ticks later, not
   held; a PEASANT grab of a rider in flight is an ordinary grab".
10. "hand: carried with time stopped, the lump follows the cursor, nothing falls, and the dice are where they were"
    (the harness's rng state before and after).
11. "hand: carried into the edge of the view in a wide valley, the view comes along" (gw 1088).
31. "hand: the arrows and the wheel come to HAND after TRESTLE, and a scenario recorded before HAND replays to the
    brushes it did" (a scenario object with `picks` of the 42 names before HAND and an ArrowDown from TRESTLE with no
    `sel`, replayed with `h.replay`: it lands on PEASANT; one recorded now lands on HAND and replays to HAND).
32. "hand: a deck held 1,000 ticks is left alone by plStep (no rung put on wait, no house planned on it), and a storey
    over a held house is still a storey" (forced `deck` and `storey` villages built with test/platforms.js's and
    test/storeys.js's own helpers).

### Phase 2: the careless hand (about 160 lines)

Throwing: the flick, sideways flight, what a lump hits and breaks, and who is in the way.

- **hand.js**: `handLetGo` takes the flick (clamped ±4.5, the share `k = min(1, sqrt(60 / n))`, the 0.5 dead zone);
  `handFly` in x as well as y (step 3 in turn), the side and overhang contacts with the speed *into* what blocked it
  (step 4), the splash of `PK_GLINT`s (step 1); `H_HARD` and the table `H_HARDM` (§2.5); `handHit` (the struck
  cells: glass and stained to SAND by `heatBecome`, a window knocked in by `sandFling`); `handCrash` gains its own
  glass and stained to SAND, ice to SNOW, the one powder bang (`sandBoom` on the first powder cell put back), and the
  edge rule (`vx = 0` at the valley's side); `handKnock` (§2.5: bowling's speed² >= 2, `"fly"`, `immune 6`, "oof",
  `g.fx.thud`, a wet lump puts a burning peasant out, ducks `"thrown"`, the lump at `vx *= 0.9`); and §4.5's
  **coming-down** panic only (flying, `vy > 0`: `p.panic = 60`, outward, `P_SAY.timber`), every 10 ticks.
- **game.js**: `sandRelease`'s line passes `cursorVel(g)`.
- **README**: the second paragraph (below), and Things to try: "Flick a pebble at a window. Watch who comes out with
  a ladder."

> Let go of it moving and it carries on, as anything does. A pebble goes as fast as you flick it, a hill hardly at
> all. If it hits something hard enough it comes apart, and if it is stone it takes the window with it, or the glass;
> and anybody standing in the way is knocked flat, and, if it was the pond, put out. Anybody under it when it comes
> down gets out from under it if they can.

**Acceptance.** Tests 12-18 and 38, the profile, and the gate.

12. "hand: a house let go moving at walking pace (flick 1.5, 0.8) eight rows up lands whole, a few columns on" (62 of
    62 in place, offset > 0).
13. "hand: a pebble of stone flicked at a gable knocks the window in, and the house is mended after (`s.repair`); a
    pebble of sand at the same window does not".
14. "hand: a stone lump flicked into a glass wall leaves sand where it hit; a lump of glass dropped 40 rows is sand".
15. "hand: a lump flicked at a peasant knocks them flat (`fly`, immune 6); a lump of pond flicked at a burning one puts
    them out".
16. "hand: thrown into the sky it comes back down; thrown at the valley's edge, nothing goes over it" (material counts
    before and after, at gw 272 and 1088).
17. "hand: a handful of gunpowder flicked at the rock goes off once" (one bang counted at the crash).
18. "hand: grains are master's: a sandbox with glass, a felled log and a bang plays out the same whether or not the
    hand has lifted a disc of empty sky first" (`g.hand` exists, the world is unchanged; hashes equal 1,200 ticks on).
38. "hand: a lump coming down over the square: everybody under it is out from under it before it lands, and nobody
    is buried" (a 12-row-wide lump let go 40 rows over three walkers).

The profile (19): a full-brush lump (r 16, 861 cells) thrown to crash mid-valley at gw 1088 and 4x, under
`node harness/cli.js run --gw 1088 --profile`: no `gameUpdate` over 9 ms at p95 across the flight and the 300 ticks
after (docs/wide-valley-spec.md:306-311). The numbers go into the plan's as-built section.

### Phase 3: sites go with it (about 130 lines)

A house set down whole is the same house somewhere else, its owner chases it, and a dropped one is mourned as one
that flew.

- **hand.js**: `handShift` with `H_MOVES` and §3.1's five tests, in §3.1's order (candidates, the loop of
  `handBoxHit(g, i, C)` against sites not in `C` until nobody drops out, then all shifted at once and every site
  re-marked as `bRemove` does, build.js:166-167); the feed line, key `"hand" + s.id`; `handEnd` calls it at a
  set-down (never at a crash); `handTask` (§3.2: `chase`, `iWalk` keyed by the column `>> 3`, `P_SAY.handChase`,
  ended by the flight's end, 3,000 ticks, the site no longer being one, or the owner riding, burning or on a
  bucket); `handRuined` (§3.3: the tale `flew`; no booking yet).
- **ideas.js**: `iTask`'s chain gets `handTask` before `oTask` (508); `I_IDLE` (531) gets `chase: 1`.
- **build.js**: `bInspect`'s ruin branch (1060-1066) gets `if (s.handT != null && g.tick - s.handT < 3000)
  handRuined(g, s, o);` before its feed, and the `"house"` tale is skipped when it ran.
- **wonders.js / monuments.js**: `wTold` (298) tales `moved` and `flew`; `M_RANK` (72) `flew: 8, moved: 6`;
  `M_SCRIPTS` (60) `flew` and `moved`; `M_REACT` (53) `flew`.
- **harness/soak.js**: none needed: `chase` has a `site` that is a real site while it lasts (the "tasks -> sites"
  invariant, soak.js:43, holds because `handTask` ends it the tick the site is gone).
- **README**: the third paragraph (below); Things to try: "Move the scarecrow to the duck pond."

> Lift a whole house and the one who lives in it will run along under it, shouting, the whole way. Set it down
> gently and it is their house, there, now: they move back in, and say they were not asked. Drop it from a height and
> it is not anybody's house any more.

**Acceptance.** Tests 20-23, 33 and 34, and the gate.

20. "hand: set down whole forty columns off, it is the same house: marked there and not here, its owner sleeps in it,
    and bInspect finds nothing gone" (a lantern and a scarecrow as well).
21. "hand: set down in somebody's field or at the bottom of the lake, a house is not moved: the old place is a ruin,
    and the tale is that it flew".
22. "hand: a third of a house lifted and set down elsewhere: nothing is mended while it is held; after, the old place
    is".
23. "hand: its owner chases it, and stops when it is set down; a fire takes them off it".
33. "hand: a house still being built, lifted whole and set down forty columns off, is not held and not moved: its
    builders go on at the old place, and no site has a plan cell where the copy came down".
34. "hand: a house and its lantern lifted together and set down together both move, and neither stops the other; set
    down with its box over a lantern that stayed behind, a house is not moved".

### Phase 4: they remember (about 100 lines)

The ledger and the fear: the deeds that phases 1-3 and lightning make, what each peasant thinks of the hand, and what
the village does under a held lump.

- **hand.js**: `handDeed`, `handView`; the deeds *moved* (from `handShift`), *wrecked* (from `handRuined`), *knocked*
  (from `handKnock`), *rode* (from `handSet`, and the tale `rode` after 100 columns or more); §4.5's held-lump pass
  (view negative: `p.panic = 120` outward, `bHide`; view not negative: a free walker looks up once a lift,
  `p.handSeen`, one in ten `P_SAY.handUnder`); the lift's witnesses with §4.5's ration (`g.hand.wT`; only a lift
  that takes a site's cell or a rider, or the first in 600 ticks), `P_SAY.handLift`; the achievement THE WRATH;
  `P_SAY.handLove`, `handGrudge`.
- **peasants.js**: `pZap` (491) `if (g.hand) handDeed(g, p, "zapped", 0, 1);` after its guard; the chat line (1688)
  picks `handLove` / `handGrudge` over `watched` when `g.hand` and a view (one `pSay` either way).
- **game.js**: `pMood`'s rider line gets the two view variants; `popRows` (1437) gets THE HAND section in the
  PEASANTS popup ("trusted" / "feared" / "not sure", and the tallies as bars).
- **wonders.js / monuments.js**: `wTold` tale `rode`; `M_RANK` `rode: 7`.
- **README**: "Knock them flat and they go indoors when your shadow comes over. Once they know about the hand,
  lightning is not weather any more." Things to try: none new.

**Acceptance.** Tests 27, 28, 29, 35 and 36, and the gate.

27. "hand: three people knocked flat by lumps are afraid of it: under a held lump they run home".
28. "hand: a lump held 2,000 ticks over a trusting village: each walker under it stops once, and the village's jobs
    go on" (tasks started in that time, against the same village not hovered over, within a fifth).
29. "hand: lightning before the first lift books nothing; after it, it is booked".
35. "hand: the ledger: a ride set down standing is +1, a move -1 (+2 if it was burning), a wreck -3 to its owner and
    +2 to cruel; and a valley that has lifted only sky has nobody with a `feel`".
36. "hand: forty lifts of sand in 2,000 ticks, none taking a site's cell or a rider, stop the village at most four
    times (one a 600 ticks), and its jobs go on as in test 28; one lift of a house stops it at once".

### Phase 5: the sky answers (about 90 lines)

Water from the sky, the dunk, the wish, and the thanks on the hill.

- **hand.js**: `s.handWet` set by `handSet` and `handCrash` while `g.blaze.length` (§4.2); `handPutOut` (the feed, key
  `"blaze" + s.id`, the deed *put out*, the tale `saved`, `p.thank` on the owner); the dunk in `handSet`; `handWish`
  (§4.3: once a fire, view positive, `p.ask = 300`, and `handStep` holding the arms up after `pStep`; "ANSWERED");
  `handThank` (§4.4: the cell, the pocket exactly as v3.1 says, `g.hand.gifts` at most 8); in `handLift` the gift
  check, the deed *took*, `P_SAY.handTook`, ACCEPTED; the deed *moved* when burning or flooded (+2, kind +1); the
  achievements ACCEPTED and A KINDLY HAND; `P_SAY.handWish`.
- **ideas.js**: `ideasStep`, where a site's flames are found gone (556), before the brigade's line, `if (s.burning &&
  s.handWet && g.tick - s.handWet < 900) handPutOut(g, s);` (and the brigade's line skipped when it ran);
  `iUrgent`'s no-water branch (486), after its `pSay`, `if (g.hand) handWish(g, p, best);`; `iPick` (395) after the
  eureka line, `if (p.thank && handThank(g, p)) return true;`.
- **wonders.js / monuments.js**: tale `saved`; `M_RANK` `saved: 6`.
- **README**: "They remember. Put out a fire for them and they will leave something out for you on the hill, a
  nugget of gold, or a lump of coal if that is what is in their pocket: pick it up and they are beside themselves."
  Things to try: "Put out a fire with a pond, then look on the hill." and "Lift a burning house and drop it in the
  lake."

**Acceptance.** Tests 24, 25, 26 and 37, and the gate.

24. "hand: water set down on a burning house puts it out, the sky gets the credit, and the owner leaves coal; lifting
    it is ACCEPTED, and the giver's feel goes up" (forced: a house, `bucket` known, a fire, a lump of water over it,
    the owner given `p.coal = 1`).
25. "hand: a burning house set down in the lake is put out, and is not a house there".
26. "hand: a fire with no water in reach, in a village that trusts the hand: one wish, arms up, and only one".
37. "hand: the thanks come out of a pocket: with gold, a nugget and one gold fewer; with coal, a lump and one coal
    fewer; with neither, a wave and no cell written" (the valley's GOLD and COAL counts plus the pockets', before and
    after, are equal).

### Phase 6: the playtest, and the record

No game code, unless the playtest finds something.

- **harness/playtests/hand.json**: seed 7, recorded through the harness (`h.select("HAND")`, `h.mouse`, `h.down`,
  `h.flick`, `h.up`, so that it replays): a house moved, a pond carried to a fire, a pebble through a window, a house
  dropped from 40 rows, then 20,000 ticks. A test in test/hand.js (30) replays it with `h.replay` (hashes equal) and
  runs harness/stuck.js's observer over the 20,000 ticks: no stalls, and nobody left `"held"` with no lump and
  nobody holding it.
- The soak gate once more, and the profile of phase 2 at the final code.
- **docs/the-hand-plan.md**: Status "**v3.1, built**", and an as-built section in the house style
  (docs/storeys-plan.md §12, "As built"): the review rounds, correctness and gameplay, findings P0 / P1 / P2,
  each fix named and "Tested.", until neither finds a P0 or a P1; the profile's numbers; the soak table.
- **README**: read over as a whole: the hand's paragraphs in order, the Controls line, the Files line, the six
  Things to try.

**Acceptance.** Test 30 green; the gate; the review loop closed with no open P0 or P1.

## 8. The moments

- **The pond to the fire.** The bucket brigade is a line of peasants and pails, slow and brave. Over their heads comes
  the whole pond, ducks paddling in it. You let go. It lands on the burning roof in one piece, floods the house and
  pours out of the doors. "the sky put out the fire at Gary's house". The ducks are in the garden, and so is the
  brigade, wet.
- **The house that walked.** Lift a house. The owner comes out of the bushes at a run and stays under it, "MY HOUSE",
  "careful with the bed", along the valley, round the pond, the view sliding along with you. Set it down on the hill
  (your hand still moving: it drifts on eight columns and settles, whole, not quite where you meant). "i was not
  ASKED". That night they sleep in it.
- **The drop.** Take the same house up to the clouds and let go. It falls as one, its owner panicking out from under
  it, and lands as a heap of its own planks, the bed on top. "Gary's house is gone". At the theatre that winter: "the
  time Gary's house flew".
- **The dunk.** A house on fire. Lift it, embers and all (the flames stay behind in the air, going out), carry it to
  the lake and let go. It sinks slowly, the lake comes up round it, and the embers go to ash. "at least it's out".
- **The ride.** A peasant on a knoll. Lift the knoll: they sit down on it. Take them over the valley, past the
  lighthouse, and put them down by the sea. "nailed it". Feel +1, and a tale.
- **The window.** A pebble, flicked. It hits the gable of the stone house, the window falls in, and the pebble lies
  in the garden in bits. A head comes out, then a ladder, then the window is back. Do it again. By the third time they
  are saying "YOU" when your cursor comes near.
- **The snowball the size of a shed.** Lift a small drift (a brush of 6, 137 cells: it takes 66% of the flick)
  and flick it at the village square. It knocks over three people at once and comes down beyond them, a drift where
  there was none. They are not amused. (They throw snowballs at each other, `leftovers.js`. It is not the same.) A
  whole hill flicked hardly goes anywhere: it takes a quarter of the flick, too slow to knock anybody over.
- **The water bomb.** A peasant on fire, running. A small lump of the pond, flicked: it hits them, knocks them flat,
  and puts them out. "phew". And then they remember that it knocked them flat.
- **The offering.** The first lump of coal on the hill, put there for you with the sky over it. Lift it and the whole
  village says so. Leave it and it stays: a little row of them over the years, one for each fire.
- **The wish.** A fire on the far side of the hill from any water. The brigade stands there with empty pails, and one
  of them puts their arms up and keeps them there. "water, please. from anywhere". The arrow takes you there.
- **The wrath.** Knock enough of them flat and they stop waving. Your shadow comes over the village and every door
  shuts. Lift the house they are hiding in. They are still in it, sitting down.
- **Things that just work.** Carry lava, still 1300° after a minute in the hand, and pour it into the sea. Pick up a
  torch and stick it on a mountain. Move the cloner that is making Garys somewhere worse, and it goes on making Garys
  there; throw it, and it forgets him. Carry the furnace's sand pile to the glasshouse. Lift a hill off a buried
  miner. Lift the gold out of the rock and see what they do about it.

## 9. Risks

- **A house set down somewhere strange**: on a spike of rock, half over a cliff, up a pillar. The cells hold (STILL).
  An owner who cannot get in sleeps rough, as anybody whose house cannot be reached does (`pStuck`, build.js:1248).
  Routes are cached by key (`"home" + id`, build.js:1253), so a moved house's old route is stale until `pathGo` asks
  again. Test 20 checks the owner gets home; the playtest measures the rest.
- **Accidental destruction.** The let-go is read from `cursorVel`, which is non-zero until the cursor has been still
  for 90 ms (game.js:2111), so most releases are moving. The share, the dead zone and "only the speed into what it
  hits counts" make that a drift, not a wreck (§0, test 12). A house still breaks from a slam or a 30-row drop, which
  is meant. If players still wreck houses by accident in the playtest, the share's 60 goes down.
- **Burying.** A lump set down slowly on a peasant buries them (peasants.js:714-720: under `P_HARD` they die after 260
  ticks). §4.5's panic gives them time, and the hand can lift it off again.
- **Riders dropped from over 65 rows die**, by pFly's rule for anybody (§2.5). The README says so.
- **A bite out of a great work** is held while carried (§3.0), then mended by its own builders. A bite out of the
  foundry's plate mould, carried forty columns and set down, is test 92: 6,000 ticks under the soak's invariants and
  the stuck observer, and the foundry off hold and mended as any bite is. (This said "covered only by the soak"; none
  of the soaks picks HAND, so nothing covered it until after the build.) The moon rocket's pad is held and mended by
  the same rule, and has no test of its own.
- **A house lifted while it is being built or mended** (`!s.done`) is not held (§3.0): its builders go on at the old
  place, and the copy in the hand comes down as the shape of a house that belongs to nobody. That is a second house's
  worth of planks from one, which is no more than any lift of a site being built gives (the hand takes what is there,
  the builders bring the rest), and test 33 pins that the site stays where it was and nothing claims the copy. If the
  playtest finds players doing it on purpose to farm planks, the plan's answer is that the planks were theirs to
  begin with.
- **Moving sand about stalls the village.** It would have, at 60 ticks of witnesses a press; §4.5 rations them to one
  stop in 600 ticks unless a lift takes a site or a rider (test 36).
- **Discoverability.** THE HAND is a click deeper than PEASANT and DUCK, in MORE. It is found by the MORE row's hint,
  which names it first, a tip, key Y, the README's Controls, and, after the first pick, the palm on the MORE row. The
  panel has no row left (test/picker.js:34), and moving a fun row into MORE would move every saved brush's place. If
  the playtest finds nobody finds it, the next step is a line in the title card, not a panel row. (After the build: Y
  is drawn on HAND's row in the flyout, as the panel's rows have their keys, and its line in the bar is short enough
  to be read to the flick. The playtest did not find that nobody found it, so the title card is as it was.)
- **The arrows wrap to HAND** (§5). A person who was used to ArrowUp from PEASANT reaching TRESTLE reaches HAND, which
  is one more up. Recordings are not affected.

## 10. Considered, and left out (and where the review was not followed)

- **v2's harder landings for every grain, switched on by the first lift.** Dropped. The review was right that
  physics that depends on history is a seam, and the clean alternative, the same rules for everybody always, would
  move a pinned run (§0) and every old sandbox save that bangs near glass. The lump has its own rules instead, as the
  peasant and the duck have theirs. The review's request to measure how often felled logs would knock people over is
  answered by there being no such rule: a grain knocks nobody, in any valley.
- **Grains that keep their aux.** A bang that flings molten iron sets it as stone (world.js:494). That is master's
  seam, not this plan's, and fixing it is a change to master's grains with its own re-pinning. Not here.
- **A higher throw threshold** (the review's first suggestion for the let-go). The share does that job and more: a
  pebble still flies as fast as it is flicked.
- **A new material** (rubble, a hand-print): nothing needs one. The point is that the hand moves what is there.
- **Rotating the lump** breaks doors, ladders and stairs. **PEASANT-tool throws in the ledger** need hooks before the
  hand is known. Both can wait.
- **A shrine, a priest, prayers on a timer, more wishes** (a pit to be lifted out of, a lake for the lighthouse): the
  offering on the hill is the whole of it, and every other failure is one the village has a job for. More would nag.
- **Less social state** (the last review's first point: `p.feel`, the tallies, the view, `p.ask`, `p.thank`,
  `p.handSeen`, the gifts, the wish, three achievements, two chat pools, two tales, for one tool). Kept, but split:
  phase 4 (the ledger and the fear) and phase 5 (the sky's answers) ship and are reviewed apart, and each is a set of
  hooks that only a valley with `g.hand` ever reaches. If phase 5 does not earn its keep in the playtest it is the
  one to cut, and phase 4 stands without it (the deeds it books come from phases 1 to 3, and from lightning).

## 11. As built

### Phase 1: the careful hand

`hand.js` (about 400 lines with its comments), the hooks as §7 lists them, `test/hand.js` (tests 1-11, 31, 32), the
README's paragraph, Controls line, Files line and two Things to try. Where the code differs from the plan above, and
why:

- **One lump at a time.** A press with HAND while a lump is still in the air does nothing (`handLift` returns). The
  plan's `g.hand.sites` is one list, for one lump; a flight is a second or two at most (a sinking lump, a row a tick).
- **"Over liquid" is "in a liquid".** The slow-down of §2.4 step 1 applies when a cell of the lump is *in* a liquid
  (it fits there, and sinks through it), not over one, so a lump coming down fast onto a puddle still breaks, and one
  coming down into a pond deeper than the few rows it falls in a tick is caught by it. And a lump that comes to rest
  with any of itself in a liquid is set down, whatever its speed: a grain started inside water has no air within three
  cells to land in, and `partDrop` keeps its heat and not its matter (world.js:406). No grain is lost in a pond.
- **Something fell into its place while it was in the air** (the sand round the hole it came out of slumps in, on the
  grid, while the lump is off it): `handSet` moves it up until it fits before anything is pushed aside. Nothing is
  written over.
- **Cells over the top of the valley at a set-down** (a lump resting on something within its radius of row 0) become
  grains at rest, and come down after. `handSet`'s push-aside, if a row up is blocked before every home is found, looks
  once more anywhere along the valley and all the way up; and if even that fails (a valley full to the brim), the lump
  comes apart instead. Neither has happened in a test.
- **The lift brings the books up to date** (`heatSync`) before `heatQ`, as `partDrop` does at a landing. The heat
  taken is the same number; the cell's temperature for `handDraw` is right from the first frame.
- **Thrown off, not buried.** A rider thrown off at a crash comes down with the lump's grains, and the grains, shuffled
  by `partStep` as they land (and `partRoom`'s three cells), often came down round them first: `pFly` found them inside
  the heap and stood them up in it, so the fall never counted and they climbed out, buried, if they could. For two
  ticks after a crash (`p.handOff`), `handLoose` puts anybody standing inside something back on top of it, still
  falling, and `pFly` decides, as §2.5 says it should: from 40 rows, "that hurt", and dizzy.
- **Nobody is left held by nothing.** `handLoose` also lets go into `"fly"` (immune 4, as CLEAR does) any rider whose
  lump is gone without a set-down or a crash. Nothing in phase 1 does that; a hand-edited save might.
- **CLEAR** empties `g.hand.sites` and `gifts` for a held lump too (the sites are gone with the valley).
- **HAND's description** says "lifts what is under it, ground and all, and whoever is standing on it. let go to set
  it down." §2's "flick it, and it flies" goes in with the flick, in phase 2.
- **Drawn in thermal vision too**, as its temperature (`drawThermal` calls `handDraw`). The cursor is the brush's ring
  with an 8 px palm in it, dashed and a fist (`ICONS.handShut`) while holding.
- **Tests, as built.** Test 4's drop from 40 rows is run with the peasants and ducks taken out (they chop, dig and
  tidy, and the counts are a count of the world), and allows the lump to lose two cells of its 160 or so to
  `partDrop`, the loss §5 calls master's: a grain whose last free cell was filled before it landed (here, the sand of
  the hole's sides slumping into where the grains were). The heat of the room and the grains is exact. (Fixed after
  the build: the hand's grains are put down in their column, not dropped, and test 4 allows none.) Test 8's paused
  load is let go on load, checked, and played on unpaused from there: updates with time stopped are not
  hash-neutral (`g.t`, the feed's clocks, `helloT`), so a second paused load checks only that nothing falls. Test 32
  forces the deck's house away first, so that `plHouseOn` has one to plan, and checks that the same valley not held
  does plan it.
- **The soak baseline is older than b07c9b4.** harness/soak-baseline.txt was recorded before the last few commits:
  b07c9b4 itself, run in a clean copy, already differs from it in the sites column (plain seed 1: 13/14, not 12/14).
  The gate was run against b07c9b4's own soak, column for column.

### Phase 2: the careless hand

The flick, sideways flight, `H_HARDM`, `handHit`, the crash's own glass, ice and powder, the edge, `handKnock`, the
coming-down panic, `sandRelease` passing `cursorVel(g)`, HAND's "flick it, and it flies", the README's paragraph (with
a sentence for the skid and one for the sky and the edge), the Controls line's "let go moving to throw it", and the
window in Things to try. Tests 12-18 and 38 in test/hand.js. Where the code differs from the plan, and why:

- **It skids.** §2.4 step 4 sets a lump down the moment anything is under it. Thrown sideways, that is wrong: a pebble
  going 4 a tick whose bottom grazed the eave of a roof was set down on the eave, and so was one that clipped the top
  of a tree, because the cell under it is looked at before every step along. Now something under it stops it coming
  down (`vy = 0`, no further down this tick) and it goes on along; at the end of a tick on which it is resting on
  something, its speed along loses `H_SKID` (0.6, a constant drag, as friction is), and under `H_STILL` (0.5) it is set
  down there. Coming down hard (`vy >= H_HARD`) it still crashes at the touch, and a lump resting on something at the
  let-go with no speed along is still set down on its first tick, so phase 1's drops are as they were. A house let go at
  (1.5, 0.8) eight rows up comes down 6 columns on (test 12; §0 reckoned 8), whole; a pebble at 3.9 that grazes the
  eave hits the gable at 3.3 and breaks against it. A slide along the flat at 3 a tick goes about nine columns.
- **The window is knocked out by the shock, not by being struck.** `bHousePlan` (build.js:477-481) puts the window
  in the middle of a solid gable: two cells, the boards all round them, and the ceiling under them. No lump cell is ever
  next to it, so §2.5's "a window struck by a hard cell" never happens. And `sandFling` at half speed into the wall
  would land the plank back in its own cell, where `bOk` (build.js:201, which compares the material and not the aux)
  calls it a window, and nothing is mended. So: any window (PLANK, aux 1) within `H_PANE` (4) cells, either way, of a
  cell a hard lump struck at a crash is knocked out of its frame (`handPane`): a grain of itself, heat and all, from
  where the lump cell that struck is, coming away from the wall and falling. The hole is mended by bInspect's repair
  ("the village is fixing Fern's house", "as good as new", 70 ticks later in seed 7 at tick 7,800, where a stone pebble
  flicked at Fern's gable from the right did it). Glass struck is still the struck cell only.
- **The edge rule, wider.** `vx = 0` only at a side contact with the valley's edge left a lump that came down hard on
  the ground near the edge, going toward it, throwing its grains over (test 16's fourth throw lost all 69). At any
  crash, the speed along toward the nearer edge it is going at is cut to `room / 16`, `room` the columns between the
  lump and that edge: at the edge, nothing; sixty columns off, almost all of it.
- **Grains bottom row first.** A crash makes its grains in `handOrder` (bottom row first), not scan order, so that the
  lower ones are stepped first and land first. A lump coming down in columns in step lands grains on top of grains still
  in the air, and `partDrop` keeps their heat and not their matter (world.js:406, master's seam, §5): in scan order 7 of a
  69-cell pebble from 90 rows, bottom first 3 (partKill's swap reorders them, so not none). Test 16 checks that no grain
  is about to go over either side on any tick, and allows 3 cells lost to `partDrop`. (Fixed after the build: it
  allows none, and at 1fa2191 the throw at the left-hand edge loses 3.)
- **Out from under it, not home.** `p.panic` sends a walker home (`bHide`, peasants.js:1635), and their home may be
  what the lump is coming down on. `handUnder` sets `p.handOut = g.tick + 60`, a property only the hand writes, and
  pStep's line reads `!(p.handOut > g.tick)` before `iFlee` and `bHide`: in a plain village that is `undefined > n`,
  false, and the line goes as it did. The pass runs on the flight's first tick and every 10 after (`f.t`, the flight's
  own count, saved with it; `|| 0` for a phase-1 save in flight), not on `g.tick % 10`, so a lump let go 40 rows up warns
  them at once. Whoever is newly panicked says `P_SAY.timber`, forced. Without the pass, test 38's three walkers are
  all under it when it lands.
- **Knocks say "oof"** (bowling rolls a die between "oof" and "thrown"); a wet knock that puts somebody out says "phew"
  instead, and steams, as pStep's own putting-out does. The lump slows by 0.9 for each peasant it knocks, not for ducks.
- **The splash** is `pFly`'s: only coming in at `vy > 0.8`, `min(40, 12 + width)` glints over the lump's wet columns,
  at the top of the liquid it has come into.
- **Powder is put back only into air.** The fallback crash in `handSet` (no home for what it displaces, which no test
  has reached) can be wet; there the powder comes apart as a grain like the rest.
- **`H_PANE`, not `H_REACH`.** heavens.js has a `var H_REACH = 2500` (the bound on a footing search). Every script
  shares one scope, so hand.js's own, loaded later, was the one everybody saw, and fourteen wonders, foundry and moon
  rocket tests failed. None of hand.js's names is used anywhere else now (checked with `grep -w`).
- **Tests, as built.** The test helper `carry` ends with `h.flick(0, 0)`: with the flick read, a carry and a let-go a
  tick later is a throw, and phase 1's tests meant a hand that had stopped. Test 12's house (seed 6, as phase 1's) is
  60 plan cells and its lump 108, so its share is 0.745. Test 13 throws a 37-cell pebble (r 3) at (4, 0.5) from 25
  columns off at the gable's height: the stone knocks both window cells out and the house is mended; the sand pebble
  comes apart against the same gable and the window stands. Test 14's wall is GLASS 3 x 31 on the flat; seed 6 has 4
  glass of its own, so the drop counts glass and sand against the valley before. Test 15's burning peasant is lit with
  `pIgnite` and the pond lump carried to them with time stopped. Test 16 throws a stone pebble (r 4) up and at both
  edges, level and coming down, at 272 and 1088. Test 17 counts `g.booms` at the tick of the crash: one. Test 18's
  sandbox is seed 9 cleared, with a stone floor, a pane, a felled log, powder and sand, and a bang, 1,200 ticks on.
  Test 38's lump is SAND, r 6 (13 wide), its bottom 40 rows over the walkers' heads.

**The profile** (19), node, this machine, which is noisy: the same deterministic run varies by a third, and more
while anything else is running. A full-brush lift (r 16: 652-723 cells, what is over the ground being sky) of the ground
in the middle of a 1,088 valley, seeds 3 and 7 after 600 ticks, carried 70 rows up and flicked (4.5, -1): down in 24-28
ticks, as 236-478 grains. Per tick at 1x, over the flight and the 400 ticks after: median 3.5 ms, p95 3.9-4.2 ms,
against 3.4 / 3.7 ms for the same valleys untouched, well inside the budget's 9 ms. At 4x, per `gameUpdate` (four ticks
each), over the flight and the 300 ticks after: median 13.8-14.4 ms, p95 15.2-23.9 ms over four runs, against 13.5-14.7
/ 15.5-17.0 ms untouched. The 4x baseline is itself over 9 ms: the wide-valley spec (docs/wide-valley-spec.md:306-311)
sets that budget at 1x, and accepts that a wide valley may not keep up at 4x. Every slow update looked at was sandStep
and heatStep (the hole the lift left, and the heap, slumping), not hand.js; one probe's 185 ms update ran again at
19.8 ms. The soaks (seeds 1-6 x 12,000, plain, rich, chaos) match b07c9b4's, run in a clean copy, in every column but
ms/t; plain run one after the other on a quiet machine: 90 s of cpu against b07c9b4's 100.

### Phase 3: sites go with it

`handShift` (with `handCan`, the first four tests, and `handBoxHit`, the fifth), `H_MOVES`, the feed line keyed
`"hand" + s.id` with the arrow, the tale `moved`, `handEnd` calling it at a set-down and never at a crash, `handTask`
(the chase), `handRuined` (the tale `flew`, nothing booked yet), and `P_SAY.handChase`. ideas.js: `handTask` in `iTask`'s
chain before `oTask`, `chase` in `I_IDLE`. build.js: `bInspect`'s ruin branch calls `handRuined` within `H_LONG` (3,000)
ticks of `s.handT`, and skips the `"house"` tale when it told one. wonders.js: `wTold`'s `moved` ("the hand moved Gary's
house") and `flew` ("Gary's house flew"). monuments.js: `M_RANK` `flew: 8, moved: 6`, `M_SCRIPTS.flew` and `.moved` as
§4.7 has them, `M_REACT.flew`. The README's paragraph, and "Move the scarecrow to the duck pond". Tests 20-23, 33, 34
and 39 in test/hand.js. Where the code differs from the plan, and why:

- **"In the box of another", either way.** §3.1's fifth test, a shifted plan cell of the moving site inside the box of a
  site staying put, cannot see a lantern: a lantern's box is its two cells, both solid, and a lump cannot be set down
  on solid cells. So `handBoxHit` also asks the other way round, a plan cell of the staying site inside the box of the
  moving one, moved. That is the case of test 34: a house lifted without the lantern by its right-hand door, brought
  back two columns along and let go, comes to rest sitting on that lantern, the lantern under its floor and inside its
  box. It is not moved (the lantern that came with it, by the other door, was, until after the build: now a lantern
  goes only with its house, and stays with it, §11). A
  house in a field is caught the first way (its floor is in the six rows over the soil that are the field's box).
- **A drop is a ruin.** §3.0 leaves a crash to master's `bInspect` at the old place. Dropped from forty rows straight
  down, the house comes down a heap of its own planks where it stood (§0: 10 of 60 in place), and `bInspect` counts a
  plan cell as lost only if it is free (`bFree`, build.js:203): a door's cell with a plank lying in it is not free. So
  the heap was "a few cells to mend", the builders mended the few they could, and "Kevin's house is as good as new"
  stood over a pile of planks (seed 6, tick 14,000, watched). Now a crash marks every held site more than `H_RUIN` (60%,
  bInspect's own share) of which came up with it, `s.handX`, and `bInspect`'s ruin test reads `broken > n * 0.6 ||
  s.handX` (a read that finds nothing in a plain village). A flat over it, or a house on a platform, still keeps it a
  repair, as for any ruin, and the mark is taken off then. Test 39.
- **Put back where it was, all of it, it did not fly.** `handEnd` sets `s.handT` only for the sites that are not all
  there where they are now: one moved has none (it is not lost: it is somewhere else), and so has one put back whole
  just where it was (no move, every test but the box). Otherwise a house lifted and put straight back, and burned down a
  month later, would be told as the time it flew (and, in phase 4, booked as wrecked). Phase 1's test 6, which set a
  house down where it was, now checks that it has no `handT`.
- **Who chases.** §3.2 says "a house lifted with `n >= 0.3 * of`": only a house on hold (finished at the lift) is
  chased. A house being built is not held and does not move (§3.0), and its builders go on at the old place; its owner,
  usually one of them, goes on with them. Nor somebody asleep somewhere else (they find out in the morning), held by the
  PEASANT tool, or aboard. The chaser's `pStuck` starts again whenever the lump's column, `>> 3`, changes, since a
  target that moves away is not one they are failing to reach. Under it they stand looking up with their arms up
  (`panicA`), and say a `handChase` line every 150 ticks. As anybody's errand does, the chase ends if they wade into the
  pond (pStep drops a task for wading; fixed after the build: they wade after it, and give up once they swim), and §4.5's coming-down panic sends them out from under it when it is let go.
  CLEAR ends every chase at once (`handClear`): there are no houses left to run after, and the soak's "tasks -> sites"
  invariant holds tick by tick, not only once the chaser has landed.
- **The news.** "Gary's house has moved. Gary was not asked", or ", and Gary with it" when they rode down on it (riders
  set down are listed on the flight, `f.rode`). A lantern moved with its house is not news of its own. Only a house gets
  the tale `moved`. `delete s.tdoors` (tidy.js caches where a house's doors are) and the routes keyed by the site
  (`"home"`, `"bed"`, `"b"` + id) are dropped for whoever has them.
- **The anchor at the lift** is kept on the lump (`ax`, `ay`, carried from `held` into `fly`). A lump in the air in a save
  made before this has none, and moves nothing when it comes down.
- **Tests, as built.** Seed 6, as phases 1 and 2. Test 20 moves the house 84 columns along to `FLAT` (40 columns either
  way from it is the pond or the empty hut), with both its lanterns; the owner, sent to bed, sleeps in the bed where it is
  now; the scarecrow is a forced one at column 165, set down at `FLAT`, and `iScarecrowNear` finds it there. Test 21's
  field is planned with `iPlanFarm` by a peasant stood at `FLAT`; its lake is the pond at 106, the house sunk into it as
  in test 4 (vetoed by the bed's cell, which is water). Test 22 lifts a disc of 5 at the house's left wall (about a
  third), holds it 900 ticks, and has the old place mended after. Test 23 carries the house a column every ten ticks
  for 900 ticks: the owner is under it, within 6 columns, for most of that; the fire is the empty hut set alight, with
  buckets known. Test 33 lifts a disc of 9 round the house (the house and two rows of the ground under it: a disc of 10
  takes the ground to four rows down, and leaves a hole the floor cannot be built over), and the builders have it up
  again at the old place in under 6,000 ticks. Test 34's first half moves the house and its lanterns one column along
  (and down onto the hole's rim), a move small enough that the house's cells would be in its right lantern's old box
  (the test checks that it would), and all three move.
- **Not here** (fixed after the build: §11). A bell on a house's ridge (mines.js `mPlanBell`) is a site of its own and
  not one of `H_MOVES`: a house carried off with its bell leaves the bell's site at the old place, where it is a ruin,
  and the gold on the ridge is nobody's.

Gate: `node test/run.js` all passed (497 tests: the 490 there were and 7 new), the master guards in it unchanged;
`node harness/cli.js selftest` 25 of 25; the soaks (seeds 1-6 x 12,000, plain, rich, chaos) the same as b07c9b4's,
run in a clean copy, in every column but ms/t; plain run one after the other on a quiet machine, 0.96-1.06 ms/t and
73 s of cpu against b07c9b4's 0.98-1.08 and 74. Watched in seed 6 at tick 14,000: Owen's house lifted, Owen after it
from column 47 to 126 ("THAT'S MY HOUSE", "careful with the bed", "PUT IT BACK") until he waded into the pond; set
down at 208, "Owen's house has moved. Owen was not asked", the tale "the hand moved Owen's house", and Owen asleep in
its bed there that night, the house done and not mended 2,000 ticks on. Kevin's house, taken up forty rows and let go,
came down a heap: "Kevin's house is gone", "the time Kevin's house flew".

### Phase 4: they remember

`handDeed` and the table of deeds, `H_DEEDS`; `handView`; the deeds *moved* (from `handShift`), *wrecked* (from
`handRuined`), *knocked* (from `handKnock`) and *rode* (from `handSet`, with the tale `rode` for a ride of `H_RIDE`, 100,
columns or more); `handFree`, `handWitness` (the lift's witnesses, rationed by `g.hand.wT`) and `handHover` (§4.5's pass
under a held lump, every 10 ticks); `P_SAY.handLift`, `handUnder`, `handLove`, `handGrudge`; `P_ACHIEVE.wrath`. peasants.js:
`pZap` books *zapped* once `g.hand` exists, and the chat line picks `handLove` or `handGrudge` over `watched` for anybody
with a view (one `pSay` either way). game.js: `pMood`'s rider line ("enjoying the view", "holding on"), and THE HAND in the
PEASANTS popup. wonders.js / monuments.js: the tale `rode`, `M_RANK.rode` 7. The README's paragraph. Tests 27, 28, 29, 35
and 36 in test/hand.js. Where the code differs from the plan, and why:

- **A deed is a name.** §4.1 has `handDeed(g, p, d, k, c)` with amounts, §7 `handDeed(g, p, "zapped", 0, 1)` with a name.
  It is `handDeed(g, p, name)`, and the amounts are in `H_DEEDS`, `[personal, kind, cruel]`, so that the ledger of §4.1
  is one table to read. `p` may be nobody (a house with no owner, wrecked, still counts against the village).
- **Moved out of a fire, now.** Test 35 asks for "+2 if it was burning", which §7 put in phase 5. The deed `rescued`
  (owner +2, kind +1) is booked for a house that was burning at the lift and is moved; *flooded* waits for phase 5, which
  has to say what flooded is.
- **The burn flag outlives the flight.** `g.hand.sites` is emptied at `handEnd`, and `bInspect` may call the house a ruin
  up to 3,000 ticks later. `handEnd` sets `s.handB` (a property only the hand writes) beside `s.handT` for a site that
  was burning at the lift, and deletes it for one that moved, so `handRuined` can still leave a house that went up on
  fire unbooked. It still tells the tale `flew`: the plan says only that it is not booked.
- **Nothing to see, nothing seen.** A lift of nothing (the empty sky) has no witnesses and no hover pass. Without that,
  the first lift of test 18's empty disc stopped the sandbox's walkers, and its world was not the world without the hand.
- **The look-up is rationed too.** §4.5 stops a free walker under a held lump "once a lift". Sand lifted press after
  press, as test 36 lifts it, is a new lift every 50 ticks, and Dave, under the tray, was stopped five times in 2,000
  ticks, by the hover and not the witnesses. Now a walker under a lump looks up once a lift *and* not again within
  `H_QUIET` (600) ticks of last looking (`p.handLook`, the tick), unless that lift was a show (`held.show`: a site's cell or a
  rider, as for the witnesses). Lifting somebody's house is still looked at by everybody, every time.
- **The afraid, a little more exactly.** Under a held lump, somebody who fears it and is already indoors at home is left
  there (otherwise `bHide` found them inside, said "safe" and stood them for 400 ticks, and the next pass panicked them
  again: "safe" every ten ticks). Nor is anybody panicked off a bucket or off the chase after their own house. Newly
  frightened, they say a `handGrudge` line. A view of 0 counts as "not negative", as §4.5 says, so it looks up.
- **No wave yet.** "The positive ones `p.ask` and wave" is the wish's machinery (§4.3, phase 5); in phase 4 they look up
  like everybody else.
- **The popup.** THE HAND, under NOTABLES: "trusted by", "feared by" and "not sure", each a count of the living (a row
  only when it is not 0), and two bars, kindnesses and cruelties, each out of the two together.
- **Tests, as built.** Seed 6, as before. Test 27 builds houses for three of them, knocks each flat at `FLAT` with a
  37-cell lump of soil flicked from the right (from the left, it is forty columns to the valley's edge, and a peasant
  knocked over it leaves the valley, as anybody thrown does); checks `feel` -2 each and that somebody not knocked takes
  the village's view (-1); then stops time, brings a lump of sky-sand over each of them nine columns from their door, and
  they are panicked and home and in (`p.hid`, `bInside`). Tests 28 and 36 measure the jobs as **ticks spent at a task**
  (not asleep), not tasks started: the same village starts 26 to 41 tasks in 2,000 ticks as the dice fall, and so a fifth
  is the dice and not the hand. Each is summed over three starts of the village (0, 41 and 82 ticks after it is set up),
  with the hand and without: test 28, a 225-cell lump of sand held 30 rows over column 130 with `g.hand.kind` 5, came out 4% over;
  test 36, forty lifts of a 21-cell disc out of a stone tray of sand 110 rows up over column 150, 12% under (four stops
  of 60 ticks in 2,000, for whoever was free, is about that). Each walker looked once in test 28 (four of them, besides
  the witnesses of the lift); in test 36 the witnesses' tick changed four times and nobody looked more than four times,
  and a house lifted right after stopped everybody free within 70 columns at once. Test 29 strikes one peasant before any
  lift (no `g.hand`, no `feel`), lifts a disc of sky, and strikes another (-2, cruel 1, and the first still has none).
  Test 35 rides 30 columns (+1, no tale) and 132 (+2, the tale); moves a house (-1, and the village nothing) and a house
  the books say is burning (+2, kind +1); drops a house from forty rows with its owner stood out of the way (-3, cruel
  +2), and one burning (nothing); and lifts the sky twenty times over 2,000 ticks (nobody has a `feel`).
- **Phase 3's test 20, made to say what it means.** The owner, sent to bed in the house where it is now, had 20 logs in
  their pocket from `housed()`, and `pPickTask` takes wood carried to a site before bed (peasants.js, ahead of `bPick`).
  With the dice the hand's witnesses now roll, Sue took hers to the empty hut and stood there building it for the rest
  of the test. The test empties the owner's pockets before bed.

Gate: `node test/run.js` all passed (502 tests: the 497 there were and 5 new), the master guards in it unchanged (the
wonders table hashes, with only `P_SAY` and `P_ACHIEVE` keys added); `node harness/cli.js selftest` 25 of 25; the soaks
(seeds 1-6 x 12,000, plain, rich, chaos) the same as b07c9b4's, run in a clean copy, in every column but
ms/t, and in 70, 76 and 122 s of cpu against b07c9b4's 87, 108 and 134 (plain 0.94-1.02 ms/t). Watched in seed 7 at tick 3,000: Wolfgang, Tobias and Otto knocked flat
by flicked pebbles of soil (cruel 6, more than the three: a pebble goes on into whoever is next), and then everybody's
view -1, the village's; a lump of sand held 30 rows over the middle of the village for 1,500 ticks, and Tobias, under it,
ran home and shut the door; "i'm watching you" (Hamish), "keep your hands to yourself" (Yuri), "i know what you did"
(Otto), "not you again" (Wolfgang). The PEASANTS popup: "feared by 8", kindnesses 0/6, cruelties 6/6.

### Phase 5: the sky answers

`handDouse` (water from the sky: `s.handWet`, from `handSet` and `handCrash`, only while `g.blaze.length`), `handPutOut`
(the news keyed `"blaze" + s.id`, "ANSWERED" for a fire wished for, the deeds *putout* and *answered*, the tale `saved`,
`p.thank`), the dunk in `handSet`, `handWish` (`p.ask`, held up by `handAsk` after `pStep` every tick), `handThank` with
`handSkyAt`, `handTaskThank` and `handLeave` (the thank-you, out of the pocket), `handGifts` in `handLift` (the deed
*took*, ACCEPTED), `handFlood` (the deed *rescued* for a house moved out of a flood), `handPid`; `P_SAY.handWish`,
`handTook`, `handThank`; `P_ACHIEVE.accepted` and `kindly`. ideas.js: `ideasStep` calls `handPutOut` where the flames are
found gone, before the brigade's line and instead of it; `iUrgent`'s no-water branch calls `handWish` after its `pSay`;
`iPick` calls `handThank` after the eureka line; `I_IDLE` gets `thank`. wonders.js / monuments.js: the tale `saved`,
`M_RANK.saved` 6. game.js: `pMood` says who is asking the sky, waving at it, or going to leave it something. The
README's paragraph ("And the sky answers. ... They remember. ..."), the Files line, and the two Things to try. Tests 24,
25, 26 and 37 in test/hand.js. Where the code differs from the plan, and why:

- **Water over the fire counts.** §4.2 has a WET cell put down "in the box" of a burning site. A lump of pond is the
  pond's top rows over its sandy bed, and put down on a roof the bed is what touches the roof: in seed 6 a lump of 92
  cells lifted at the pond's top came down with its water on rows 127-134 over a roof at 139, all of it over the
  three rows that `iFlames` pads the box with, and none of it counted. It pours down onto the roof the next tick. So
  `handDouse` takes the box's columns (padded 2, as `iFlames`) and its rows from `H_OVER` (16) above the top to one below
  the bottom: water put down over a fire is water on it.
- **The dunk puts it out there and then.** §4.2 says so, and §7's "the dunk in `handSet`". The dunked house is not moved
  (its bed is under water), so the old place is judged by `bInspect` within 120 ticks and is a ruin; that can come
  before `ideasStep` next finds its flames gone, and the books would never close. So the dunk calls `handPutOut` itself
  at the set-down: at least 30% of a site burning at the lift (and at least one cell of it), and 20 or more liquid cells
  pushed aside. `handPutOut` is once a fire (`s.handSaved`, the fire's `s.burning`), and it sets `s.doused` to 0, so that
  if any of the fire was left at the old place and goes out later, the brigade's line does not take the sky's place.
- **Who thanks it, and who is booked.** The owner, or, for a site with no owner (a hut, the empty house), whoever wished
  for it. An owner who asked is booked as the owner (+3), not twice; *answered* (+2) is for a wisher who is not the
  owner. A KINDLY HAND is looked at in `handDeed`, beside THE WRATH.
- **They go and find the sky.** §4.4 has them leave it on "the cell beside them" that is empty, on something, with open
  sky for 20 rows. In seed 6 that cell was there on 25 of the 746 ticks Sue was free after her fire, and `iPick` was
  reached five times in the 6,000 ticks (`pPickTask` runs every 20 ticks and only with nothing to do, and `bPick` comes
  first): the coal came at tick 5,938 of the 6,000, and with less luck it would not have come. Now, at `iPick`, they look
  for the nearest such cell within `H_FAR` (60) columns and 8 rows of their feet, with room to stand beside it and
  outside every site's box (pad 1: a nugget in a house's air is a cell to mend, and in a field a seed's place), and walk
  there (the task `thank`, in `I_IDLE`, so a fire takes them off it). When they get there it is checked again and left;
  if it is gone, or they cannot get there, the thank-you is still owed, and `iPick` finds another. The 6,000 ticks are as
  §4.4 says. With nothing in their pocket they wave there and then (`p.ask`, 90 ticks), and no cell is written.
- **The pocket, exactly.** Gold first (`p.gold--`), else coal (`p.coal--`), each with `sandSet` and `heatAccept` as
  `iOffer` writes its nugget, checked again on arrival. "Gary left a nugget of gold for the hand", or "Gary left a lump of
  coal for the hand. it is what they had" (no pronouns in the valley), or "Gary waved at the sky. it is all they had".
  `g.hand.gifts` keeps the last 8; a gift whose cell is not that material any more is forgotten at the next lift.
- **THE HAND TOOK IT.** The feed line (key `"took"`), the giver's *took* (+1, and kind +1), their `handTook` line and a wave
  (`p.ask` 90), ACCEPTED, and the lift counts as a show for the witnesses, who say `handTook` lines instead of
  `handLift` ("the whole village says so").
- **Flooded, said.** §4.1's "+2 if it was burning or flooded at the lift", with flooded unsaid. It is 8 or more liquid
  cells in the house's box, widened two columns each side, at the lift: water up its walls. Water *in* it comes with it,
  is put down at the bed again, and §3.1's lake rule says it is not moved, so that case cannot be a rescue anyway. The
  deed is phase 4's `rescued`.
- **The tale** is "the hand put out the fire at Gary's house": §4.7's "the hand put out {also}" reads as putting the
  house out.
- **The wave under a held lump** (§4.5, "the positive ones `p.ask` and wave", left over from phase 4): somebody who thinks
  well of it, looking up, has their arms up for the 30 ticks of the look (`p.ask` 30). Test 28's village, which trusts
  it, does as much work as before (it passed unchanged).
- **The arms.** `handAsk`, every tick from `handStep`, counts `p.ask` down and, for anybody walking and not on fire,
  panicking, asleep, climbing or aboard, sets `p.idle` to at least 2 and `p.pose = "panicA"`. `p.asks` marks a wish (for
  `pMood`: "is asking the sky for water. arms up", or "is waving at the sky").
- **Tests, as built.** Seed 6, as before. Test 24 sets every other cell of the house's top two rows to EMBER, lifts a
  disc of 5 at the top of the pond at column 106, and sets it down 12 rows over the roof: `s.handWet` is the tick, and the
  fire is out 16 ticks later with the sky's line, the tale `saved`, the owner +3 and the village +2. The owner is given
  one coal and no gold, and no logs (with twenty logs from `housed()` they are building until long after); the coal is
  left about 440 ticks later, under 20 rows of sky, and a disc of 1 lifted over it is ACCEPTED, +1 and kind +1. Test 25
  sinks the burning house in the pond as test 21 does: the sky's line at the set-down, the house not moved, nothing alight
  in the pond 400 ticks on, the old place gone and nothing booked against the hand (it went up burning); and a house with
  eight cells of water put up against its walls (time stopped), lifted and set down at `FLAT`, is a rescue (+2, kind +1).
  Test 26 sets the empty hut (183-204) alight in a village with `kind` 5, a walker stood at `FLAT`, the far side of it
  from the pond: in 1,800 ticks exactly one `p.ask` begins, with the feed line, and the wisher's arms are up on every tick
  of it on which they are not on fire or panicking. Test 37 thanks for three walkers at `FLAT`: with a gold and a
  coal, a nugget and the coal kept; with two coal, a lump and one left; with nothing, a wave and every cell of the grid as
  it was; the valley's GOLD and COAL and everybody's pockets add up to the same before and after each; and kind 9 to
  cruel 3, one more kindness, is A KINDLY HAND.

Gate: `node test/run.js` all passed (506 tests: the 502 there were and 4 new), the master guards in it unchanged (the
wonders table hashes, with only `P_SAY` and `P_ACHIEVE` keys added); `node harness/cli.js selftest` 25 of 25; the soaks
(seeds 1-6 x 12,000, plain, rich, chaos) the same as b07c9b4's, run in a clean copy, in every column but ms/t, in 78, 95
and 127 s of cpu against b07c9b4's 87, 108 and 134 (run beside other probes, so not a timing). Watched in seed 7 at tick
9,000: Hamish's hut set alight; a pond lump of 97 cells was not enough, and the brigade put it out 1,140 ticks later (no
credit: the water was too long ago); again with 278 cells, "the sky put out the fire at Hamish's hut" 505 ticks after it
came down, then "Hamish's hut is gone" (it had burned); given a coal, "HAMISH left a lump of coal for the hand. it is what
they had" 1,200 ticks on; lifted, "THE HAND TOOK IT", and Hamish "it likes coal!", Wolfgang "it was for you!", Yuri "it
TOOK it". The same village trusting the hand (kind 5), Fern's house alight: "FERN looks up. 'water, please. from
anywhere'" 60 ticks later, her arms up for 299 ticks; a lump of the pond (136 cells, 55 of them water) put on the house,
and 700 ticks later "the sky put out the fire at Fern's house. ANSWERED", "Fern's house is gone", and, her pocket empty,
"FERN waved at the sky. it is all they had".

### Phase 6: the playtest, and the record

`harness/playtests/hand.json` (and its entry in harness/playtests/README.md), test 30 and the tests the review rounds
added (40-72) in test/hand.js, the soak baseline recorded again, the fixes below, and this. The game code changed only
where a review found something.

**The playtest.** Seed 7, played through the harness's own input: `h.select("HAND")`, the wheel for the brush,
`h.mouse`, `h.down`, `h.flick`, `h.up`, and one `h.ignite` for the fire, 285 ops in all; then 20,000 ticks, to tick
32,372. The plan's §0 house is not there in this tree (that spot is a starter hut under a tree), so the four acts are
done to what seed 7 has:

1. **A house moved** (tick 8,100). Fern's house, finished at 7,801, lifted whole with a disc of 9 (185 cells, the
   house and the grass and ground round it) and carried up onto the hill at the valley's left, set down gently (lowered
   a row at a time while it fit, and let go still). Fern ran after it shouting "PUT IT BACK"; "Fern's house has moved.
   Fern was not asked". Two other places were tried first and are worth saying: twice the house came to rest on a tree,
   the crown of the one at column 117 and farm 4's wheat at 233, because leaves and crops are solid to a lump, as they
   are to sand. A house set down on a tree is a house on a tree. That is §9's "somewhere strange", and it was left so.
2. **A pond carried to a fire** (tick 9,000). Hamish's hut set alight, and the duck pond lifted (r 10: 240 cells, 61
   of them water, the rest the bridge over it and its bed) and put down eight rows over the roof. The village did not
   know buckets yet, so there was no brigade: "the sky put out the fire at Hamish's hut", "the village is fixing
   Hamish's hut", as good as new at 10,502, and 3,381 ticks after the fire, his pocket empty, "HAMISH waved at the sky.
   it is all they had": the thanks came on their own (phase 5's open question). With r 8 (54 wet) the sky was still
   given it but the hut burned down; with r 12 the pond's duck came too and was dropped in the fire ("a duck got far
   too toasty").
3. **A pebble through a window** (tick 10,682). A stone pebble (r 3, 37 cells of stone and coal) from the rock at the
   valley's left wall, flicked (4, 0.5) at the gable of Gertrude's house, which she had built on Fern's old plot: both
   panes out, "the village is fixing Gertrude's house", mended 480 ticks later.
4. **A house dropped from forty rows** (tick 12,000). Fern's house again, on the hill, taken forty rows up with Fern
   asleep in it ("five more minutes. in the AIR") and let go: down in 27 ticks, a heap, Fern thrown off it ("OOF") and
   up again, "Fern's house is gone", "WHO DID THIS".

Then 20,000 ticks: Fern sinks a mine, and out of it come rock salt, iron ore, coal, gold, a furnace, the first iron,
black powder and a blast, a fireworks show and iron tools. No stall, nobody held by nothing. Fern is still sleeping
rough at the end, and so are four others: a seed 7 the hand never touched has four houses and
four sleeping rough at the same tick (seed 7 has hardly a tree in it), so that is the valley, not the hand. At the end
the ledger reads Fern -6 (moved, wrecked, dropped), Gertrude -1 (the window), Hamish +3 (the fire), kind 2, cruel 4.

**Test 30.** `h.replay` of the scenario, with a function watch (`h.watch(fn, {every: 1})`, which the replay's own ticks
call) that looks, every tick of the replay, for anybody `"held"` who is not on a lump that is there and not in the
PEASANT tool's grip, and, after the last op, samples harness/stuck.js's observer every 30 ticks as the soak does. It
checks the hash, that nobody was held by nothing, that the observer watched 20,000 ticks or more and found no stall,
that the five pieces of news of the four acts came out, and that no lump or rider is left at the end. 43 s. The scenario
is version 3 (round 13) and its hash `0294ee8f` (round 20, which put the hand in the harness's hash; `679efab6` after
the build, when Gertrude came to say something about her window).

**The README**, read over as a whole: the hand's five paragraphs in order (the careful hand, the careless hand, sites
going with it, what they remember, the sky answering), the Controls line for HAND, the Files line for hand.js, and the
six Things to try (the pond to the fire, a ride, a pebble at a window, the scarecrow to the duck pond, a fire put out
with a pond and then the hill, a burning house in the lake). Three sentences changed to say what the code now does: the
chase is given up for "something that will not wait (their dinner, say)"; they think worse of it for a window knocked
out ("by the third they say so") and for being dropped off a lump that came apart; and "the PEASANTS count in the
header, clicked" (it is the count's popup that says how the village sees the hand).

**The review.** Rounds by a correctness reviewer and a gameplay reviewer, the gameplay round reading the playtest's
log, until neither found a P0 or a P1:

- **Round 1, correctness** (a high-effort review of the whole diff, hand.js included):
  - P1: **a house the hand only went near flew.** `handLift` lists every site whose box the disc meets, taken from or
    not, and `handEnd` gave each of them `s.handT`. A house beside a lift of the sky that burned down within 3,000 ticks
    was told as "the time Gary's house flew" and booked as wrecked (-3, cruel +2). Now `s.handT` is set only for a site
    more than `H_RUIN` (60%) of which came up: then it is the hand's ruin, whatever comes after; a bite, or nothing, leaves
    any earlier mark as it was. Tested (test 40, which also takes a bite of the wall).
  - P1: **a corner of a burning house in the hand took the fire off the books.** Any bite of a finished site put it on
    hold, and `ideasStep` skipped a held site before `iFlames`, so its fire left `g.blaze` and the brigade went home while
    the rest burned. Now `ideasStep` looks at a held site's flames as at any site's, and only when there are none left
    on the ground does it keep the books open until the lump comes down (that is what the dunk needs). Tested (41).
  - P2 (fixed): **the chase took a starving owner off their dinner.** Now only an owner whose task `iCanWait`, the fire
    alarm's own rule. Tested (72).
  - P2 (left): water put down high over a fire is the sky's even if the brigade finished it. Taken up in round 1's
    gameplay review, below.
- **Round 1, gameplay** (the playtest's log, the plan's moments, the README):
  - P1: **the window was not held against it.** §8 promises that "by the third time they are saying 'YOU'", and a
    knocked-out window booked nothing. A new deed, *smashed* (owner -1, cruel +1), once a house a throw. Tested (42:
    a sand pebble books nothing; three stone ones, -1, -2, -3, and the owner's view is negative).
  - P1: **a rider thrown off at a crash thought nothing of it**, after "that hurt". A new deed, *dropped* (-2, cruel
    +1), as a knock. Tested (test 5 now checks it; test 35 stands anybody indoors out of the way, as it did the owner).
  - P1: **a dunk in oil was a rescue.** `handSet` counted any liquid pushed aside; LIQUID is water, salt water, oil,
    acid, lava and wet concrete. Now `WET` only. Tested (43: the pond turned to oil).
  - P1: **the sky took the credit from a brigade that finished the fire.** `handDouse` now notes `s.handWetD`, the
    buckets on it by then, and three more after that and it is the brigade's. Tested (43).
  - P1: **the owner walked after a house they are said to run under**: `chase` runs at the brigade's 0.4 (peasants.js
    `rush`), and keeps up with a house carried a column every three ticks. Tested (46; walking, they were 60 columns
    behind).
  - P1: **a fast pebble went through people**: knocks were looked for where it was at the end of a tick, and a one-cell
    pebble at 4 a tick passes a peasant between. Now at every cell it moves. Tested (44, from five starting columns).
  - P1: **a lift at the valley's wall took what was a brush along from the ring**: the anchor was clamped a radius in.
    Now the disc is where the ring is, clipped to the valley, and a held lump is kept in by its own cells (`H.b`), not
    by the brush's radius. Tested (45).
  - P2 (fixed after the build): no line of its own for a smashed window (the moment is "YOU" when the cursor comes
    near, which the deed now gives; now the owner says so as it goes, `P_SAY.handSmash`); discoverability (§9's answer stands, and Y is on its row in the flyout and its line whole in the bar); the held duck's pose.
- **Round 2, correctness:**
  - P1: **a lump dropped on the bare floor went through it.** After CLEAR, a crash on the floor made grains that
    `partStep` sends out of the world, heat and all (`iy >= gh`). Round 2 had a lump on the floor row never come apart
    (`handFloor`), round 3 widened that to a lump over an open shaft; round 4's `handCaught` made both unnecessary, and
    round 8 took them out (below). Tested (47, a hot pebble: every cell, and all its heat at the tick it comes apart).
  - P1: **an ice palace in the hand melted.** `wStep` ran its wonders' steps for held sites, and `pIcePalaceStep`
    counted the palace gone from where it was. Now `wStep` skips a held great work, as `bInspect` and `plStep` do (§3.0
    holds them all). Tested (48: held 600 ticks, still a palace; carried off and put down elsewhere, mourned).
  - P1: **water from one fire counted for the next**: `s.handWet` outlived its fire. The sky's credit now needs
    `s.handWet >= s.burning`. Tested (49).
  - P1 (both reviewers): **the let-go was from the last tick's place**, not where the pointer was let go. `handLetGo`
    now calls `handRide` first. Tested (49).
  - P2 (master's; fixed after the build): `g.tip` is both the tip on the title card and tidy.js's heap in a one-screen valley (game.js
    says so), so with a tip added, clicking through the tips leaves a different number there than master would. f9c3820
    added a tip the same way; the shared name is master's, not this plan's.
- **Round 2, gameplay:**
  - P1: **the bottom of a burning house, sunk, put out a roof still burning on the ground.** The dunk now also wants
    nothing alight left at the old place (`iFlames`). Tested (50).
  - P1: **a window behind a screen was knocked out**: `handPane` went by distance alone. Now only a window of the house
    whose box the struck cell is in. Tested (51: a window in a wall, a metal screen three columns before it).
  - P1: **a glass window smashed was not held against it.** A struck glass cell that is a site's window, or glass in its
    plan, is *smashed* too. Tested (51).
  - P1: **a rider set down under a ledge was buried in it, and thanked it**: the fit is the lump's, not the rider's.
    Now a rider with rock where they sat (`pStiffAt`) is put out on top of it and falls, as one thrown off does: no
    touchdown, no *rode*. Tested (52).
  - P2 (fixed after the build): the held duck's pose, again.
- **Round 3, correctness and gameplay** (both found the first three):
  - P1: **in a one-screen valley the let-go was still from the last update's cell**: `sandRelease` works out the cell
    under the pointer afresh only in a wide valley. Its hand line now does it for the hand, as the next update would, and
    calls `handRide` itself. Tested (53: the pointer moved as the browser moves it, the screen's place only).
  - P1: **round 2's fix moved a lump loaded mid-hold to wherever the pointer was**: `saveApplyState` lets go through
    `handLetGo`, which had been made to ride first. It does not now: only `sandRelease` rides. Tested (53: saved held at
    one place, loaded with `keepPointer` and the pointer at another).
  - P1: **a dunk with the roof still burning above the water was the sky's**: round 2 looked only at the old place. Now
    every ember the lump carried had to be within two cells of water once it was down. That was not the last word
    (round 5). Tested (54).
  - P1: **a rider set down at the bottom of the pond, or in lava, thanked it**: no touchdown and no *rode* for a rider
    whose feet or middle are in a liquid. Tested (54).
  - P1: **grains went through the floor from a crash just over it**: `handFloor` looked only at the floor row; round 3
    widened it to any column of the lump with nothing but air down to the floor (since round 8, `handCaught` does this
    for every grain). Tested (55: a pebble dropped onto one cell standing on the bare floor).
  - P1: **a house put back whole after most of it was lifted flew, later**: lifted 60-90% (so not a candidate to move)
    and set down where it was, it was given `s.handT`. `handEnd` now gives none to a site that is all there where it
    stands (`handWhole`). Tested (55).
- **Round 4, correctness and gameplay:**
  - P1: **a grain thrown down and along off a shelf still went through the floor**, and so did one a set-down could not
    place (below). Each grain a crash makes, and each a set-down makes, is first flown as `partStep` would fly it through
    the valley as it is (`handCaught`): one that would go out through the floor or a side is put down there instead, in the
    lowest free cell of that column, heat and all. Tested (56: a hot stone flicked (4.5, 4.5) off a one-cell shelf).
  - P1: **with nowhere for the water to go, and no coming apart either, the water was written over.** In a valley full to
    the brim (or, as the reviewer built it, a drop of water on the top row with a ledge over the lump and the floor under
    it), `handSet` placed the lump on the water anyway. Now what would go over it comes down as a grain of itself. Tested
    (56).
  - P1 (gameplay): **water held in a tray over a fire was the sky's when the fire went out by itself.** A wet cell over the
    box now counts only if nothing that never moves (`STILL`: stone, metal, planks) is between it and the box; a pond's
    own sandy bed, which pours, is not in the way. Tested (57).
  - P1: **a recording made before the hand, with MORE open, lost a click on the field just over the flyout**, now part of
    it, 22 px taller. The harness replays a scenario whose list has MORE's brushes and not HAND with the flyout as it was
    then (`MORE_TOP` and `MORE_H` for the replay, put back after), as it already replays the panel as it was
    (`_scLayout`). Tested (58).
  - P2 (fixed after the build: §11): a lantern left behind when its house moves still lights that side of it, so no new
    one is hung at the new door (`iPlanLamp`). P2 (left): a scarecrow by the pond does not scare a swimming duck (master's `dHeading`, for walking ducks).
- **Round 5, correctness and gameplay:**
  - P1 (both, one cause): **the dunk was judged at the moment it landed.** Water two cells off through a metal wall
    counted as water on an ember; and a flame still in the air at the old place at that moment lost the sky a dunk that
    did put the fire out. The dunk is now judged by what happens (`handDunks`, every ten ticks): a house sunk with its
    fire stays on hold (`s.handD`, and `g.hand.dunks`, which saves), its books open and `bInspect` waiting, until the
    embers it carried down and anything at the old place are out (the lake's: "the sky put out the fire", unless the
    brigade had three buckets on what was left) or `H_DOUSED` is up (nobody's); then it comes off hold as `handEnd` would
    have left it. This is what phase 5 wanted the dunk "there and then" for, without the guess. Tested (25, which now
    waits for the judgment; 54, an ember walled round with metal: not the sky's while it burns, and judged in time).
  - P1: **a grain thrown past falling sand went through the floor**: `handCaught` took the sand for something to land on,
    and it fell away first. Round 5 had it land only on what never moves (`STILL`); round 9 took that back (below), and
    this case is left, as master's.
  - P1: **with the particle pool full, what a set-down put over the top of the valley was lost.** It is put down at once
    on the first thing under the top of its column, or the nearest column with room (`handDrop`). Tested (59, its second half).
  - P1: **a recording from before TRESTLE still lost its click**: round 4 knew only the hand's group. The flyout's height
    for a replay is now worked out from the list it was recorded with. Tested (58, a list without TRESTLE as well).
  - P1 (gameplay): **somebody stood on the lip of a ledge fell when it went up**: a walker's footing can be the next
    column. With nothing solid under their own feet, the cell beside them counts. Tested (60).
  - P1 (gameplay): **a whole hill flicked down and along knocked people flat**, against §8: the flick was clamped each
    way, so a diagonal was √2 faster than a hand throws. Its length is clamped now. Tested (60, the first ticks, before
    a fall adds its own speed).
- **Round 6, correctness and gameplay:**
  - P1: **a dunk's hold and a lift's were one flag**: lifting the rest of a sunk house, then letting go, took the dunk's
    hold off, and `bInspect` called it a ruin before it was judged; and the other way about. The dunk's is its own,
    `s.handD`, read beside `s.handH` by `bInspect`, `ideasStep`, `plStep` and `wStep`. Tested (61).
  - P1 (both): **its embers lifted back out of the lake were judged put out.** (Round 6 waited while any lump in the hand
    had embers in it; round 7 replaced that, below.) Tested (61).
  - P1: **a rider on the lip of a lump carried to the wall was put down outside the valley** (the lip is beside the lump,
    and the lump was kept in by its own cells). Riders are kept in it, a step and a half from either wall, where a
    peasant can walk (round 7: at half a cell they could not). Tested (61).
  - P1: **a click on the old flyout's edge, replayed, picked TRESTLE**, whose row is there now. For the replay the rows of
    brushes the list did not have are off the flyout too. Tested (58).
  - P2 (left): a hill flicked down at somebody and falling on them knocks them flat once the fall has added its speed
    to the flick's. The flick itself is clamped (round 5); a hill falling on somebody is the fall.
- **Round 7.** The gameplay review found no P0 or P1 (two P2s, one the correctness review's first P1). Correctness:
  - P1: **a dunk's embers lifted out again and put down still burning on dry ground were the lake's.** A lift that takes
    any of a waiting dunk's embers, or burning cells of the same house from where it stood, makes the dunk nobody's, and
    it is judged at the next look. This replaces round 6's wait while any lump in the hand carried fire, which let an
    ember held for some other reason keep a sunk house on hold past `H_DOUSED` (the review's second P1). Tested (61: half
    a house sunk, a lift of its unburnt wall that leaves the dunk waiting, and a lift of the rest of its fire).
  - P1: **a rider set down at the wall at half a cell could not walk** (a peasant steps no nearer than a cell): kept a
    cell and a half in. Tested (61).
  - P1: **an arrow or the wheel, replayed from a recording made before the hand, left MORE's row remembering HAND**: the
    game's own step came to HAND before the recorded brush was put back, and MORE then opened on it, and a click in the
    sky lifted it instead of painting. `_doKey` and `_doWheel` put back what MORE's row remembered before the recorded
    brush, as their other branch already did. Tested (58).
  - P2 (fixed after the build): the chase ends at the first puddle (pStep drops any errand for wading, phase 3's note).
- **Round 8, correctness and gameplay:**
  - P1 (both): **an ember lifted on its own from the half of a house still on the land kept the dunk the lake's**, and
    the brigade could be given a fire that was in the hand: an ember is not what a plan says, so the lift took nothing
    of the house. A lift that takes embers from inside a burning site's box now puts it on hold (its books stay open
    while its fire is up), and makes any dunk of it nobody's. Tested (61, a brush of one on an ember).
  - P1: **a duckling set down at the wall could not walk**: ducks are kept a cell and a half in, as riders are. Tested
    (62: a duck on a perch of one cell).
  - P1 (gameplay): **in an emptied valley a pebble flicked into a glass wall did not smash it**: rounds 2 and 3's floor
    rule refused any crash over an open floor. With `handCaught` keeping every grain in the valley, the rule is gone: a
    lump comes apart wherever it hits hard, the floor too. Tested (62; and 47, reworded).
  - P1: **Y, then an arrow at once, replayed, forgot HAND**: round 7 put back what MORE's row remembered from before the
    game's own `moreNote`, which `gameKey` and `gameWheel` call first. The harness calls it first too. Tested (58).
- **Round 9, correctness and gameplay:**
  - P1 (both): **an ember just outside a burning house's walls, in its fire's reach but not its box, was not the house's**:
    the lift's first look at a site was by its box alone. For a site on fire it is by the box `iFlames` looks in. Tested
    (63).
  - P1 (both): **a duck put down at the right-hand wall could not walk** (a duck walks no nearer than two cells: ducks.js
    `dStepX`): kept two and a half cells in. Tested (63).
  - P1 (gameplay): **a duck put down where its perch fits and it does not was buried**: as a rider is, it is put out on
    top and comes down thrown. (In the test's slot the duck's own `dWriggle` frees it too; the review's, closed all round,
    killed it.) Tested (63).
  - P1: **round 5's rule let a grain go through intact ice to the floor**: landing only on what never moves, a grain
    passed through ice, sand and snow and was put down on the floor under them. `handCaught` lands on anything that is
    not air again. Round 5's case (sand it would land on falling away first, over an open floor) is left as master's,
    as it is for a bang's grains; so is a wall erased between a crash and its first grain step. Tested (59). (Both
    fixed after the build: a grain of the hand's that goes out of the valley is put down in it, §11.)
- **Round 10, correctness and gameplay:**
  - P1: **a house set down whole at the very bottom of the valley was not moved**: its box, which reaches past its
    cells, would have gone past the last row, and `handCan` refused it, so the old place was a ruin and it flew. Only its
    cells have to be in the valley; its box is clipped. Tested (64).
  - P1: **a duck swimming on the bottom row was left behind** by a lift of the water under it: the rider's test wanted a
    row under them. On the bottom row, the cell they are in is enough, for peasants and ducks. Tested (64).
  - P1 (gameplay): **water from the sky on a house about to be a ruin was nobody's** if `bInspect` judged it gone before
    `ideasStep` next found its flames out. The sky's credit is one test now, `handSky`, which `ideasStep` asks where
    the flames are found gone, and `bInspect`'s ruin branch asks first: "the sky put out the fire", then "is gone".
    Tested (64).
  - P1 (gameplay): **two fires put out at one house before its owner had thanked it were one thank-you.** What is owed is
    counted (`p.owed`), and each thank-you left takes one off it. Tested (64).
- **Round 11, correctness and gameplay:**
  - P1 (both): **a house a ruin with an ember still alight just outside its wall was the sky's**: `bInspect` waits only for
    flames inside a site's box; `iFlames` looks round it too. The ruin branch asks `handSky` only when `iFlames` finds
    nothing. Tested (64).
  - P2 (left): water put on a fire in the twenty ticks before `ideasStep` first sees it, that puts it out in that time,
    is nobody's: the village never had it in its books as a fire, and there was no "is on fire!" either.
- **Round 12** (the gameplay review scored it 8 / 9 / 9 for consistency, design and entertainment):
  - P1: **a lump set down with some of it over the top of the valley lost that part**: those cells were grains at rest
    over the top, which came down onto the lump's own top row, outside the grid, with nowhere to land. They are put down
    at once beside it, on whatever is there (`handDrop`). Tested (65).
  - P1 (harness): **a press with HAND threw with where the cursor had been before the press**: the shell's pointer-down
    clears the cursor's samples (game.js), and the harness's `_press` did not. It does (round 13 put this behind a
    version). Tested (65).
  - P1 (gameplay): **a fire the sky put out at a hut nobody lives in, before anybody asked, was thanked by nobody.**
    Whoever is nearest owes the thank-you (round 13: whoever lives nearest). Tested (65).
  - P2 (left): a house moved while it is being mended is not moved (§3.0, by design), so the windows of the copy set down
    elsewhere are nobody's, and a pebble does not knock them out.
- **Round 13** (gameplay 8 / 9 / 9 again):
  - P1 (harness): **round 12's press broke recordings made before it**: a scenario that threw a peasant with what the
    cursor did before a tap replayed differently. And **the harness let go without the browser's pointer-up sample**, so a
    hand carried along and held still a moment before it let go threw in the harness and dropped in the browser.
    Scenarios are version 3 now: the press and the let-go are the browser's (`_press` clears the samples, `_release`
    takes one), and a scenario from before is replayed with the harness's press and let-go as they were. `hand.json` is
    recorded again as version 3 (the same hash: nothing in it leaned on either). Tested (66).
  - P1 (gameplay): **the empty hut saved with everybody more than 80 columns off was thanked by nobody**: it is whoever
    lives nearest, by where their home is (or they are, with none), however far. Tested (66).
  - P1 (gameplay): **somebody going to leave coal at a spot they could not get to chose it again**, and again, until the
    thank-you lapsed. A spot they gave up on is remembered (`p.thankNo`, the last eight) and passed over (round 14: a spot they set off for). Tested (66).
- **Round 14** (gameplay 8 / 9 / 9):
  - P1: **a lump thrown down onto a pile from over the top of the valley lost what was over the top**: its grains came
    down on the pile before they were in the valley, with nowhere to land. As at a set-down (round 12), those cells are
    put down at once beside it. Tested (67: a pillar to come down on, and room to fall; on a crowded pile at the top, more
    of it was lost to `partDrop`'s six cells, §5's seam, the same for any bang there. Fixed after the build: no grain
    of a crash is lost, however big the lump or crowded the pile, §11).
  - P1 (harness): **the hash did not know a lump in the hand or in the air**, so a replay that threw it the wrong way
    matched. The hash mixes in the lump, when there is one (round 15: its cells' places on it as well): a valley with none
    hashes as it did, and every recorded hash stands. Tested (67, 68).
  - P1 (gameplay): **water beside a fire, a stone wall between, was water on it**: round 4 looked for a way down for water
    over the fire, not across for water beside it. Now both (round 15: up to and including the house's own wall, so water
    against a wall standing does not get in, and against a burning one does). Tested (67, 68).
  - P1 (gameplay): **a thank-you errand cut short by wading was tried again at the same place**, and again: a spot is
    remembered when they set off for it, not when they give up. Tested (67).
- **Round 15** (gameplay 8 / 9 / 9):
  - P1 (harness): two lumps that differ only in where their cells sit on them hashed alike: the cells' places go in
    the hash too. Tested (68).
  - P1: water in a trough whose dividing wall was the house's own was water on its fire: the way across is looked at up
    to and including the wall. Tested (68).
  - P1 (gameplay): **a rider lifted with the trees they were walking through, set down gently, was popped up out of the
    trunk and dropped**, and not thanked for the ride: the set-down asked `pStiffAt`, which counts a trunk. It asks what
    walking asks, `pBlocked`, through which a trunk is no wall. Tested (68).
- **Round 16** (gameplay 8 / 9 / 9):
  - P1: **a scarecrow carried away from its field was still that field's**, so the field never had another
    (`iPlanScarecrow` goes by the link). Moved out of its reach of the field (22 columns, `iScarecrowNear`'s), it lets
    the field go. Tested (69).
  - P1 (harness): a lump held and the same lump just let go hashed alike, and so did a cold lump and a colder one: the
    hash takes which it is, and the cells' heat. Tested (69).
  - P1 (gameplay): **water put down beside a fire on a burning house's doorstep, outside its wall, was not water on it**:
    round 15's wall was in the way of a fire on this side of it. The way across stops at the first fire it meets. Tested
    (69).
- **Round 17** (gameplay 8 / 9 / 9):
  - P1: a scarecrow carried up a rise 25 rows over its field kept it: its reach is up and down too (16 rows,
    `iScarecrowNear`'s), and out of either it lets the field go. Tested (70).
  - P1 (harness): the hash left out what a lump's cells were doing (aux: a nuke's fuse): it takes it. Tested (70).
  - P1 (gameplay): **a scoop of water lowered straight onto a fire just outside the door was not water on it**: rounds
    4, 14, 15 and 16 each mended a piece of the one rule. It is one function now, `handReach`: water near a fire gets
    at it if it is in the site's box; or, going down its column, it comes to fire, or into the box, before anything that
    never moves; or, going across to the wall, it comes to fire before anything that never moves, or to the wall with
    nothing standing in it. Tested (70; 57, 67, 68 and 69 pass on it unchanged).
- **Round 18** (gameplay 8 / 9 / 9):
  - P1: water held in a sealed trough over and beside the wall was water on the fire: `handReach` went across over the
    top of the wall. Across is only beside it, from its top row down. Tested (71).
  - P1 (gameplay): **a scoop of water lowered onto a flame outside the door put it out, and was nobody's**: `handSet` puts
    the water in the flame's cell before `handDouse` looks, and then there is no fire there to reach. A wet cell put down
    where a flame was, in the fire's reach, is water on it (`f.quench`). Tested (71).
  - P1 (harness): the hash left out where a flying lump is between cells (`fx`, `fy`). Tested (71).
- **Round 19.** The gameplay review found **no P0 or P1**, and scored it 9 / 9 / 9. Correctness: P1 (harness), the hash
  left out a held cell's shade, which is a firework's fuse. Tested (70).
- **Round 20**, correctness: P1 (harness), the hash left out the recipe a held cloner is copying. Rather than another
  field, the hash takes the whole of `g.hand`, as it saves, once there is one (a valley that never lifted hashes as it
  did); `hand.json`'s hash is recorded again for it (0294ee8f, the same village), and test 18, which asks whether a
  valley that lifted only sky is the same world, sets the hand aside to ask it. Tested (70). The grid's own cloners
  (`g.cloneSrc`) and much else are not in master's hash either; it is a fingerprint, and that is master's.
- **Round 21**, correctness: **no P0 or P1.** With round 19's gameplay review, the loop is closed: nothing a player sees
  changed after it (only the harness's hash, and tests).

What the rounds left, all P2 or master's, each said where it was found, and what is left of it after the build (§11,
below): only what is meant. A hill flicked down at somebody and falling on them knocks them flat (round 6: the fall,
not the flick; anything that falls on anybody does, and after the build a knock is a shove). A scarecrow by the pond
does not scare a swimming duck (round 4: master's `dHeading`, which is for walking ducks). A house
moved while it is being mended is not moved (round 12, §3.0: its builders are at the old place, and the copy is
nobody's). Water on a fire that puts it out before `ideasStep` has seen it is nobody's (round 11: the village never
had it in its books as a fire). And the sky is credited when the fire it was on goes out by itself in time (phase 5's
window, now with the brigade's three buckets and a way for the water to get there). The rest is mended: the smashed
window's line, HAND found from MORE's row, the held duck, the lantern and the bell left behind, the chase at a puddle,
every grain a crash lost, and `g.tip`.

**The profile** (phase 2's, at the final code): the same probe as phase 2's (`prof.js`: a full-brush lift, r 16, 652-723 cells of
the ground in the middle of a 1,088 valley, seeds 3 and 7 after 600 ticks, carried 70 rows up and flicked (4.5, -1)),
on a quiet machine after the last soak:

| | untouched, p95 | with the hand, p95 | with the hand, worst |
|---|---|---|---|
| 1x, per tick, the flight and 400 ticks after | 3.70-3.75 ms | 3.71-3.82 ms | 7.79 ms (the crash's tick, `handCaught` flying 723 grains ahead) |
| 4x, per `gameUpdate` (four ticks), the flight and 300 ticks after, two runs | 15.13-15.63 ms | 14.21-14.75 ms | 17.83 ms |

At 1x the hand is inside the wide-valley budget's 9 ms with room to spare, as in phase 2. At 4x it is level with the
valley untouched, and the valley untouched is already over 9 ms there: the budget is a 1x one
(docs/wide-valley-spec.md:306-311), and a wide valley may not keep up at 4x (README). So the acceptance's "p95 <= 9 ms
at 4x" is not met, by the hand or by master; what holds is that the hand adds nothing to it.

**The soak.** harness/soak-baseline.txt was recorded at 05a2f0e, four commits before b07c9b4, and every phase has
found it out of date (§11, phase 1). It is recorded again here, at b07c9b4 (a clean copy of the tree this work started
from), and the hand's tree is the same as it in every column but ms/t:

| preset | seeds 1-6 x 12,000 | alive, sites, ideas, dead | clean | cpu, b07c9b4 / the hand |
|---|---|---|---|---|
| plain | 0.93-1.08 ms/t | the same as harness/soak-baseline.txt, row for row | all 6 | 71 s / 72 s |
| rich | 0.96-1.25 ms/t | the same | all 6 | 75 s / 75 s |
| chaos | 1.54-1.79 ms/t | the same | all 6 | 116 s / 116 s |

(b07c9b4 was run in a clean copy of the tree, one preset after another with nothing else running; the hand's run, on
the final code, the same way.)

Gate: `node test/run.js` all passed: 540 tests (the 506 there were after phase 5, test 30, and 33 from the review
rounds), among them every `hand:` test, test/wonders.js's table hashes and the plain village's dice, NEW's, seed 3's
idea order, test/valley.js's `44ff922d`, the seven picker tests and `SAVE_SKIP` = snapshot `SKIP`; `node harness/cli.js
selftest` 25 of 25; `node harness/playtests/check.js` 5 of 5, and every scenario in harness/playtests replays to its
hash; the soaks as above; the review loop closed with no open P0 or P1. Not met: the 4x profile's 9 ms, as above. (After
the build, the gate is run again, at the end of §11.)

The phases' open points, closed here or left: phase 5's question, whether thanks come in a natural village: in the
playtest Hamish, his pocket empty, waved at the sky 3,381 ticks after the fire. Phase 1-5's stale soak baseline is
recorded again. Phase 3's bell on a ridge is still not one of `H_MOVES` (fixed after the build), and the chase still ends at a puddle (fixed after the build). Phase 5's
"a dunked house reads oddly" is now the dunk judged by whether its fire goes out.

### After the build: what the review found

The review run on the finished work (the diff from b07c9b4, hand.js and its tests) found one P1, a gameplay one, and
it is fixed:

- **An owner who fears the hand starved under her own house, held still.** Seed 6, Sue's finished house lifted (a
  disc of 10 on the floor's row) and held 14 rows over its old place, her view -6. For `H_LONG` (3,000 ticks) she
  chases it, as she should. After that every pass of `handHover` found her under the lump, afraid, and not indoors:
  `bInside` of a house that is up in the hand, its site still on hold at the old place, and she in the hole the floor
  came out of (row 157 to its floor's 153). So `p.panic` went back to 120 every ten ticks, and panic sends a walker to
  `bHide`, which sent her to her own door, where she was already. She stood at 149,157 with no task from tick 3,500,
  and starved at 19,230; with a view of 0 she went back to work after the chase and was alive, hunger 3, at 30,000.
  The stuck observer saw only the chase: a peasant with no task is not stuck. §4.5 has the afraid go indoors and shut
  the door, which is what failed: there was no door. Two things were wrong, and both are mended:
  - **A house up in the hand is not somewhere to hide.** `handAway(g, s)`: the site on hold (`s.handH`), with a lump
    held or flying, and as much of it in the lump as sends its owner after it (`H_CHASE` of its cells, the chase's own
    share: a bite out of a wall leaves a house to hide in). `bHide` passes such a house over, as it passes over one
    on fire (the cathedral, if it is near, else nowhere), and `handHover` sends the owner out from under it, the nearer
    way, as a lump coming down does (`p.handOut`, 60 ticks; `handUnder`'s). They have thought of it now.
  - **A fright that cannot get them indoors wears off.** The first time a lift frightens somebody is kept
    (`p.handFear`, the lift; `p.handFearT`, the tick), and after `H_LONG` of the same lift, still out under it, it
    frightens them no more: they get used to it, as an owner gives up the chase, and get on. That is for whoever
    cannot get in for any other reason: a door they cannot get to, a pit, walls. Somebody who does get indoors is
    left there, as before (phase 4); when they come out, under the same lump, it is the same fright, and its clock
    has been running.
  Neither touches a valley that never lifted anything (`s.handH` and `p.handFear` are only ever set by a lift), nor a
  village that does not fear the hand. Tested (73): Sue, the house held as above, is sent out from under it and is at
  a task 300 ticks or more of the 1,500 after the chase (before the fix: none, and panic 119); and somebody with no
  house, walled in under a held lump of sand, is frightened at first and not at all in the last 200 of `H_LONG` + 400
  ticks (before: panic 120 to the end). With the fix, the reviewer's probe has Sue alive at 30,000 ticks, hunger 691,
  building. The README says so, in the paragraph on what they remember.

### After the build: what the review left, mended

The final review's P2s and P3s, and what the rounds left (above), taken up one group at a time. Each is tested, and
each fails without its fix. None of them touches a village that never lifted anything: seeds 1, 3 and 7 through
24,000 ticks of bangs, a nuke, lightning and a thrown peasant hash as 1fa2191 does, tick for tick, and the soaks are
harness/soak-baseline.txt's in every column but ms/t.

**Landing, crash physics and grain loss:**

- **A stone sunk to the floor of a deep lake was put down in the middle of it** (P2). In flight a lump sinks through
  any depth of water, a row a tick. At the set-down, the water it is in looked for air only 60 rows over the lump's
  top (`H_HOME_UP`), so in a lake deeper than that none of it found any, and the lump was moved up a row and looked
  again, and again: seed 7, water over rows 20 to 183 and an r 10 disc of stone let go over it went down to row 172
  and was set down with its bottom at row 80, an island held up by nothing, in one tick of about 33 `handHomes`. Now
  `handHome` goes up through the water standing over the lump (any liquid or gas, and what is already promised to
  the water before it) without counting it, and then allows 60 rows of anything else, as before. Each column's look
  is remembered (where it got to, from the lump's top in that column, and how far past the water), so the next cell
  to go up that column starts there: the 7 columns are gone up once in all, not once for every cell pushed aside.
  That was not all of it: the same lake has only 20 rows of air over it, and the whole brush of stone (r 16) pushes
  aside more water than the 39 columns round it have air for, so it still climbed, 161 calls of `handHomes` and
  57 ms in one tick, to the top. Past the three columns each side, the look goes on along the valley for as long as
  each column on the way has been gone up to the very top and has no air left: a lake full to the brim rises all
  along it. A pond with banks stops it at the first bank, and a lump too big to sink, under a roof with no air in
  reach, still rests on what it is in. Where the old look found a cell, the new one finds the same one, so a pond
  within 60 rows of its top is as it was. Tested (74: r 10 and r 16, each set down with its bottom on the floor,
  every drop of the lake there with its heat, one call of `handHomes`, 1.4 and 3.2 ms).
- **A big lump that came apart lost about an eighth of itself** (P2), and with it what the rounds left as master's:
  a grain with no free cell within six, one whose landing went from under it over an open floor, and one going at a
  wall erased after the crash. Every one was a grain of the hand's dying in master's grain code (`partDrop` keeps a
  grain's heat and not its matter; off the floor or a side, `partKill` loses both). Seed 6, the whole brush of the
  sand at column 232 lifted and dropped back from 60 rows: 104 of 812 cells gone (stone 97, sand 7). Changing
  `partStep` for every grain would change every bang in every village, so it is changed only for the hand's: a flag
  for each grain (`g.ph`, a `Uint8Array(PMAX)` beside the rest; `partAdd` writes 0 to it and `partKill` moves it
  with the grain), set only by `handGrain` and `handPane`. A marked grain that would be dropped (no room where it
  comes down, or its time up) or goes out through the floor or a side is put down instead in its column, kept in the
  valley, or in the nearest column that has room, with its heat (world.js `partHand`, which calls `handLand`:
  `handCaught`'s landing, taken out of it so both use it; it was the lowest free cell of the column, which is a mine's
  gallery or somebody's room, until the last review: below, test 93). An unmarked grain goes as it always did,
  cell for cell. A save from before the flag loads with none of its grains marked. So §0's "nothing lost: a heap" is
  true for a hill too. Tested (75: the 812 cells come down as 812, every material and the heat exact; a disc of 12 of
  stone flicked into the right-hand wall, 0 of 489 lost, 35 before; a grain whose ledge is erased the tick after the
  crash lands on the floor, lost before). test/valley.js's list of arrays sized by what they hold has `ph` in it.
- **The lift's "on the lip of it", and the dunk's look round an ember, went round the valley's edge** (P3). For
  somebody at column 0 with nothing under them, the lift looked at `x - 1` a row down, which is the right-hand wall's
  cell on the row of their feet; `handDunks` looked at the eight cells round an ember the same way. Both look at the
  column first. Tested (76: somebody at x 0.5 is not taken by a lift of one cell at the right-hand wall, and is by
  one beside them; a flame at the right-hand wall a row up is not beside an ember sunk at column 0, one at column 1
  is).

**Knocked flat, buried, and CLEAR in the sky:**

- **Knocked flat was thrown** (P2). `handKnock` gave whoever it knocked bowling's push, the lump's own speed: an
  upward pebble at -4.5 sent them up at -5.7, 127 rows, to come down under a parachute or not at all; one flicked
  along at 4.5 sent them along at 3.6, over the valley's wall (`pFly`'s `x > gw + 4`, and they had left the village);
  and either way they were going fast enough to bowl the next one over, with nothing booked for that. A knock is now a
  shove (§2.5): a hop of 1.2 up whichever way the lump goes, at most 0.7 along (`H_SHOVE`), and nothing along toward a
  wall they are beside. They rise 6.6 rows and come down on their back some fifteen columns along (land where they were,
more or less, it said here, which was not so: §11, the edge). Ducks the same. The
  snowball the size of a shed (§8) was the worst of it: Sue, knocked first, went ahead of the drift fast enough to
  bowl the other two, and two or three of them died of it; now the drift knocks over all three itself, and they get
  up. Test 27's three, each knocked in turn from the same column, are stood aside after, since the first no longer
  lands twenty columns away, out of the second's path. Tested (77: a 5 by 5 of stone flicked past Sue at (0, -4.5),
  (4, 0), (3, -3) and (1, -4): knocked, feel -2, up 6.6 rows at most, never out of the valley, alive 600 ticks later,
  nobody else flying; with somebody 8 along, she bowls nobody (she bowled them before); and the drift of 137 at three
  people three columns apart knocks all three, cruel 3, nobody dead).
- **Knocked flat, then buried by what knocked them** (P2). A wide lump (r 8) covers the whole of that short hop, and
  coming down at under 2.5 a tick it is set down whole, on them in mid-air. `pFly` stood them up inside it and pStep's
  burial rule killed them 261 ticks later (in the reviewer's sweep of 81 throws, 5 of the 35 knocks; seed 10's RALPH,
  in random play). A rider with no room is put out on top (§2.4) and one thrown off a crash is lifted out of its grains
  (`p.handOff`), but nothing did either for somebody it knocked. Now the lump keeps the ids of whoever it knocks
  (`f.knocked`), and `handSet`, once its cells are down, puts each of them still about (living, `"fly"` or `"walk"`)
  who is in something up out of it and lets them fall, as a rider with no room; `handCrash` marks each of them
  `p.handOff`. Somebody it came down on without knocking is buried still, as §2.5 and §9 have it: `handUnder`'s panic
  was their warning. Tested (78: seed 6 at tick 3,000, a disc of stone of 8 flicked at Sue from 16 along and 10, 20 or
  30 rows up, the reviewer's five: knocked each time, the flat ones set down whole, and 400 ticks later she is alive,
  never buried, and not in it; without the set-down's part the two flat ones bury her, and without the crash's,
two of the three that came apart).
- **CLEAR sent a rider high on a thrown lump to space** (P3). `handClear` let them go where they were, 85 rows over
  the top, and `pFly`'s first step was under -40: `pSpace`, an astronaut, the tale, and "back from space" before the
  reentry. §5 says they drop into the empty room, and now they do, from row 0 (and a duck likewise): as long a fall as
  it would have been, but a fall. Tested (79: Sue lifted, carried to row 0, flicked up, CLEAR 30 ticks later: no
  astronaut, never `"space"`, no news of coming back from it in 600 ticks).

None of the three is reached by a village that never lifted anything (`handKnock`, `handSet`, `handCrash` and
`handClear` are the hand's, and CLEAR calls `handClear` only with a `g.hand`); harness/playtests/hand.json replays to
its hash as it was.

**Houses moving with their lanterns and their bell:**

- **What hung from a house was moved, or left, as if it were a thing of its own** (P2, with the lantern the rounds
  left and phase 3's bell). `handShift` moved each site that came up whole on its own, never asking what it hung from.
  So a house carried off without its right-hand lantern left the lantern standing in the air where the wall had been,
  still its house's: `iPlanLamp` counts a lantern by its `home`, wherever it is, and that side never had another. A
  lantern carried off alone went the other way: set down eighty columns along, still its house's, its door with none.
  And a bell on the ridge (mines.js `mPlanBell`, `s.on` the house) was not one of `H_MOVES` at all: lifted with the
  house it was a ruin at the old place, and left behind it stood over nothing, a bell for nobody, its gold nobody's.
  Now `H_MOVES` has the bell, and a lantern or a bell moves only with what it hangs from (`handOn`: a lantern's `home`,
  a bell's `on`). One whose house is not moving is taken out of the moving ones, in the same loop as `handBoxHit`, so
  it is a bite out of the old place, and booked there as any is (two of two cells gone: the lantern is gone, and a new
  one is hung by that door). One whose house is moving and that is not moving with it has nothing holding it up, and
  comes down (`handFall`): its site is removed and each cell of it still standing is a grain of itself, heat and all,
  marked as the hand's (`g.ph`), as a window knocked out is. The bracket and the lamp, or the bell's brick and gold, are
  on the ground, and the gold is anybody's. A bell's mouth (`bx`, `by`, where the clapper swings and the DONG comes
  from) moves with it, and like a lantern it is not news of its own. Test 34's second half changes with it: the lantern
  that came with a house that did not move does not move either. Tested (80: seed 6, the house and its left-hand
  lantern lifted, a disc of 9, and set down at column 232: no lantern of its house's is left by the right-hand door at
  the old place, nothing of it is standing at 154,142 300 ticks later, and once the house is mended its owner plans a
  right-hand lantern by its wall where it is now; and the right-hand lantern lifted alone and carried there is not
  moved, is gone from the old place, and the house gets another. 81: the house lifted with the bell on its ridge, a
  disc of 12, and set down there: the bell's plan and mouth moved with it, whole, nothing mended in 600 ticks, and
  rung it DONGs out of its mouth where it is now. 82: the house lifted without it: no bell is left, none of its gold
  is up where the ridge was, and every cell of gold round where it was is on something, as much gold in the valley as
  before). `handShift` is the hand's, so a village that never lifted anything is as it was; harness/playtests/hand.json
  replays to its hash.

**The chase, and what the peasants say:**

- **The chase ended at the first puddle** (P2, what the rounds left). pStep keeps a task while its peasant wades only
  for a few kinds (a bucket's `src`, tidy's bailing, a wonder's `pfill`); any other is dropped (`p.task = null`), so an
  owner running under a house carried over a puddle or the pond's edge stopped dead in it and went off to do something
  else. `chase` is one of the few now, under the same `!p.swimming` as the rest: they splash through after it and give
  up only once they are out of their depth (and, since the last review, for good, then and there: below, test 94). A chase is only ever after a lift, so a village that never lifted anything
  takes the branch it always took. Tested (83: seed 6, a strip of water eleven columns wide and two rows deep let into
  the ground across Sue's way, her house carried over it a column every ten ticks: she wades it, and is still after it
  and within 6 columns of it every tick on the far side; before, she was off building at the first wet step).
- **A house held still out of reach was a stall to the stuck observer** (P3). The chase ended only at `H_LONG`, 3,000
  ticks, and an owner shouting at the nearest dry column under a house held over the pond has the same task and makes
  no progress, so harness/stuck.js, at 2,400, called it a stall first (the reviewer's probe: SUE at tick 2,490). Telling
  the observer that a chase is never stuck would hide one that is. So they give up on a house that has stopped going
  anywhere: `handTask` counts the ticks since the lump's column `>> 3` (the key its route is asked for by) last
  changed, `k.here`, and past `H_STAND` (1,500, half `H_LONG`) the chase is done. The 3,000 stays for a house carried
  the length of the valley; `H_LONG`'s other uses (a ruin that flew, the fright, the thank-you errand) are as they
  were. Tested (84: Sue's house held 15 rows over the pond at column 126 for 3,000 ticks, the observer sampling every
  30: her chase ends 1,500 to 2,000 ticks after the lift, and nothing is reported; before, it ran to the end and the
  observer had her). Test 46, keeping up with a house carried along, is as it was.
- **The first lift anybody saw could be the hand again** (P3). `handWitness` picks from all of `P_SAY.handLift`, which
  has "oh no it's the hand again", and in the browser it came up on the very first press. While nobody has yet seen a
  lift (`h.wT`, set by the first one seen) it picks from `P_SAY.handLiftFirst`, the same lines without that one: one
  pick from either, so the same dice. The speech table is only added to (test/wonders.js's master tables stand).
  Tested (85: forty fresh copies of seed 6, each with other dice, a lift beside Sue: the first seen is never the hand
  again, which it was in 21 of the 40 before; and a later lift, 600 ticks on, can be).
- **A window smashed, and its owner said nothing** (P2, what the rounds left). `handHit` booked `smashed` against the
  hand and that was all; the "YOU" came later, from `handHover`'s grudge, when the cursor came near. Now the owner
  says so as it goes, if they are alive, awake, not held or riding, and within `H_LOOK` (80) columns of the house:
  `P_SAY.handSmash` ("MY WINDOW", "that was a NEW window", "who threw that", "not the WINDOW", "i JUST fixed that"),
  once a house a throw, as the deed is. Nobody else says anything. Tested (86: test 42's stone pebble at the gable,
  Sue standing six columns the other side of the house: on the tick the pane comes out she says a `handSmash` line;
  a pebble of sand, which breaks nothing, has her say none). That pick is the one change to harness/playtests/hand.json:
  Gertrude, near her house when the pebble goes through it, now says so, one more roll of the dice, and the hash is
  recorded again for it (`679efab6`; the playtest is otherwise as it was, with the same five pieces of news).

One test changed with them. Test 73's second half walls somebody in under a held lump with two walls of stone, 18
rows high, to see the fright wear off. With the first lift's line now "LOOK", shorter, the dice after it fall
otherwise, and Iris throws the ninja rope at the top of a wall and is out over it by tick 140 (master's way out of
anywhere, and quite right). The walls are INERT now, which the hook slides off: walled in is walled in, whatever the
dice say. It passes with and without the new line.

All four are the hand's: `handTask`, `handWitness` and `handHit` are only reached by a lift, and pStep's new kind is
only ever given by one. Seed 3's master guard and test/valley.js's hash test pass.

**The picker, the bar, the flyout, the duck on a lump, the tip:**

- **HAND's line in the bar never got as far as the flick** (P3). At 123 characters with its name, the longest in
  `PICK` with WET CONCRETE's, `drawPanel` cut it at a word once the cell readout took the right of the bar: "... let go
  to set it down. flick it,...", and that was the only place the UI said a flick throws. It is "lifts what is under
  it, ground, people and all. let go to set it down. flick it, and it flies.", 100 with the name, under the 111 or so
  the bar was seen to show beside "AIR 20°". Tested (in test 2: no longer than 104, and it says flick).
- **Y was not on HAND's row in the flyout** (P3, and what the rounds left of finding it). The panel's rows draw their
  keys; `drawMore` did not, and HAND is the only brush in MORE with one. Now it does, in the panel's colour, at the
  row's right. Drawing only. With the line above, HAND is found from everywhere §9 names: MORE's hint naming it first,
  with (Y); the tip; Y on its row; its line whole; and the palm on MORE's row once picked. §9's next step, a line on
  the title card, was for a playtest that found nobody found it, and this one did not. Tested (in test 2: the flyout
  drawn on a context that writes down its `fillText`s has one key, Y, at HAND's row).
- **A duck on a lump in the hand flapped** (P2, what the rounds left). `ducksDraw` drew every held duck flying, and
  `dMood` said "is being held. quack". A duck riding a lump in the hand is drawn as on the pond, sat with its feet
  tucked (`D_SPR.swim`, a duckling `babySwim`), and thrown with it flaps as before; `dMood`, given `g`, says "is
  sitting on a lump of the valley. quack", or "is flying, with the ground it was sitting on. quack", as `pMood` does
  for a rider. Only hand.js sets `d.ride`. Drawing and the bar, no dice. Tested (87: seed 6's duck lifted with the
  pond, held, then thrown, by the sprite `dBlit` is handed and the mood).
- **The title card's tip was the village's heap** (P2, master's). `gameInit` set `g.tip = irnd(TIPS.length)`, and
  `ideasReset`'s `tReset`, straight after, set `g.tip = null` for the heap, so in a one-screen valley the tip line was
  "undefined" from the first frame. A click on it made `g.tip` 1, a heap that was a number; with a heap standing, a
  click made it `NaN` and the village forgot where its heap was. The tip's count is `g.tipN` now, in `SAVE_SKIP` and
  the snapshot's `SKIP` together (it is the panel's, not the village's), and tidy.js keeps `g.tip`. The die is rolled
  where it always was, so a village that never clicks the tip goes as it did; only the broken click changes, and no
  recorded scenario clicks it in a one-screen valley (harness/playtests/hand.json and the duck scenarios replay to
  their hashes). Tested (in test/valley.js: seed 6's tip is one of `TIPS` at the start and after a click, and a click
  with a heap standing leaves the heap as it was).

All four are drawing or the panel's: nothing hashed moves, and seed 3's master guard and test/valley.js's hash test
pass.

**What no test asked (tests only):**

Five things the hand's code did that nothing in test/hand.js would have noticed it stop doing. No code changed for
them; each test was checked against a copy of the code broken the way the review said it could be, and fails there.

- **The heat of a hot lump set down** (P2). Every heat test set down a lump at room temperature, whose heat of its own
  is next to none, and the lava there was only held. The reviewer's mutant, `handSet` putting down 0.99 of each cell's
  heat, failed only the playtest's hash. Tested (88: seed 6, a disc of 5 of lava lifted out of the sky and set down
  two rows over the open ground at `FLAT`; the same let go into the pond, which pushes 78 cells of its water aside
  through `handHomes`; and a disc of stone heated through by 300 a cell, as test 47's, set down gently. The tick each
  lands, set down whole, the heat of the room, the hand and the air is what it was before the lift, to a part in a
  million. With the mutant: out by 8 parts in a thousand, 8 and 2).
- **The drawing** (P3). Nothing drew a lump: not `handDraw`, plain or thermal, not peasantsDraw's sitting rider, not
  drawCursor's palm, and not `popRows`' THE HAND. Tested (89: seed 6, lava set into the ground under Sue and a duck at
  `FLAT`, lifted with both, held and then thrown. Each time: the lava's cell in the sky is not the sky's colour and
  glows; Sue is drawn sitting while it is held and not once it flies (the sprite `pBlit` is handed); in thermal vision
  the cell is not the air's colour; the cursor, drawn on sim.js's stub context and `setLineDash`, which a canvas has
  and the stub had not, draws the shut palm and then the open one, and nothing else; and the village's numbers have
  THE HAND. A misspelt call in any of them is a TypeError there, and a lava cell drawn as the sky is a failure).
- **A rider through master's `pHeld`, a duck through `dHeld`** (P2). pStep's held line with the guard taken out,
  `pHeld(g, p)` for a rider as for anybody held, passed every hand test: `handRide` puts a rider back where they sit
  after pStep has run, so a carry with time going looks the same, and the one carry that watches the dice runs with
  time stopped, where pStep never runs. A duck's `dHeld` guard, the same (ducksStep runs after, so a duck is left at
  the cursor, and nothing looked). Tested (90: seed 6, Sue lifted with a disc of 6 and carried about for 600 ticks
  with time going, along a fixed way: never once through `pHeld`, nothing said, and on the lump every tick;
  and the duck at 115 lifted with the pond and carried the same way: never through `dHeld`, not a quack, and on the
  lump every tick. Without the guards: 600 times each, a "the view!" or two, and the duck at the cursor all 600).
- **NEW forgets the hand** (P3). `ideasReset`'s `delete g.hand` was reached by nothing in the tests. Tested (91:
  seed 6, time stopped, the house lifted with a disc of 10 with Kevin in it, a cruelty in the ledger, and NEW pressed
  while it is held, and in another copy while it is in the air: no `g.hand`, nobody and no duck held or riding, and
  12,000 ticks of the new valley hash as one made by NEW in the same village with the same brush and the same moves of
  the cursor and nothing pressed on, the dice set the same just before. Without the `delete`: the hand is still there,
  and its lump comes down on the new valley).
- **A bite out of a great work's mould** (P2). §9 said it was "covered only by the soak", and none of the soaks picks
  HAND (§7), so nothing covered it. Tested (92: pi's flat valley for the foundry, test/heavens.js's, opened in the
  harness, the foundry built, and a disc of 3 lifted out of its plate mould, lid and lining, 19 cells of its plan;
  carried forty columns along and set down; then 6,000 ticks under harness/soak.js's invariants and the playtest's
  "nobody held by nothing", with the stuck observer every 30 ticks: nothing breaks, nothing stalls, and the foundry is
  off hold, and mended or being mended, as any bite is: `bInspect` has it waiting for stone, with a quarryman on it.
  With the hold left on after the set-down, it fails).

No game code changed, so nothing hashed moves: seed 3's master guard, test/valley.js's hash test and
harness/playtests/hand.json are as they were.

**The README and the plan's own text:**

- **The README said a lump breaks only over hard ground, and that the thanks are left beside them** (P3). `handFly`
  breaks a lump that comes down at `H_HARD` (2.5 a tick, about thirty rows' fall) into anything that is not air or a
  liquid: sand, soil and somebody's field as much as rock. Only what pours catches it (`handWet`: water, the sea, oil,
  acid, lava, mortar). And `handThank` looks along as far as `H_FAR` (60 columns) for somewhere open to the sky, and
  walks there. The README says "on anything but water (or anything else that pours ...)", "Sand will do it, or
  somebody's field", and "somewhere near where the sky can see it". The same pass read every sentence of the five
  paragraphs, and the hand's Things to try, against the code as the groups above left it, and changed what was not so:
  - the knock is said to be a shove, not a throw, in those words (test 77);
  - the chase: "hold it still somewhere they cannot get to" was only half of it. `H_STAND` counts the ticks the lump is
    over the same eight columns, whether they are under it or not, so held still anywhere, they shout at it a good
    while and give up (test 84);
  - the window: "by the third it is YOU when your cursor comes near" was `handHover`'s grudge, which is for a lump held
    over them, not the cursor, and comes after one window, not three: the owner is at -1 after the first. What the
    third does is the village's: cruel 3 against no kindnesses is `H_SAYS`, and whoever has no mind of their own goes
    by that. It says both now (test 42; the line said there and then, test 86);
  - "if it is stone it takes the window": anything in `H_HARDM`, stone or timber or metal;
  - a house dropped from a height comes down a heap of its planks "where it lands", not "where it stood" (test 4 and
    phase 3's drop let it go straight down, where the two are the same);
  - "comes down, gold and all" read as if a lantern had gold in it. It is the bell's;
  - Things to try: "watch who comes out with a ladder" is "Flick a stone at somebody's window while they are watching"
    (no test has a ladder in it, and test 86 has the line); "then look on the hill" is "then look about for what they
    leave out"; and the Files line's coal "left on the hill" is coal "left out".
  It is text: nothing runs differently, and the tests under it are the ones named.
- **The plan's "covered only by the soak", "nothing lost" and `partDrop`** (P3). §9's bite out of a great work's mould
  is test 92 now (above), and says so; the moon rocket's pad is held by the same rule and has no test of its own. §0's
  "nothing lost: **a heap**" was a house of 62 cells; after the grains were marked (above, test 75) it is true however
  big the lump. Test 67's note, that on a crowded pile at the top more of a lump was lost to `partDrop`'s six cells, is
  marked fixed: no grain of a crash is lost, however big the lump or crowded the pile. The two tests that still
  allowed for the loss, test 4 (two cells of a house dropped from forty rows) and test 16 (three of a pebble thrown at
  the valley's edge), allow none, and their comments say why. Test 16 at none fails at 1fa2191, before the grains were
  marked: the throw at the left-hand edge of a 272 valley loses 3. Test 4 lost none there either; it asks for none now
  because none is what is true.
- **What the rounds left** (above) lists only what is left by design, with the round each was found in and why: a hill
  falling on somebody is the fall, not the flick, and the knock is a shove now; a scarecrow's fright is master's
  `dHeading`, for walking ducks; a house being mended stays where its builders are (§3.0); water that puts a fire out
  before `ideasStep` has seen it was never a fire in the village's books; and the sky's window, phase 5's, for a fire
  that goes out by itself in time.

Gate, after the build: `node test/run.js` all passed: 561 tests in 147 s (the 540 of phase 6, and 21 from the groups
above, tests 74 to 92 among them; checks were added to test 2 as well), among them the master guards, test/valley.js's
`44ff922d` and the plain village's dice; `node harness/cli.js selftest` 25 of 25; `node harness/playtests/check.js` 5
of 5, harness/playtests/hand.json at `679efab6`, recorded again once, for the smashed window's line (above), and every
other hand scenario at its hash; the plain, rich and chaos soaks, seeds 1-6 x 12,000, harness/soak-baseline.txt's in
every column but ms/t, row for row (69 s, 72 s and 108 s of cpu). This last group changed only the README, the plan
and two tests' tolerances, so nothing hashed moved.

### After the build: the last review

The review of the groups above (the diff from 1fa2191) found three P1s, two of them the same fault, and all are
fixed. Neither fix touches a valley that never lifted anything: only the hand marks a grain (`g.ph`), and only a lift
starts a chase.

- **The grains the hand would have lost were put in the lowest air in their column** (P1, twice). `handLand` looked
  for room from the bottom row up and took the first empty cell: on open ground the top of the heap, but under a heap
  with any air beneath it, the air beneath it. Before the grains were marked (test 75) only `handCaught` used it, for
  a grain going out through the floor or a side; now `partHand` uses it for every marked grain with no room where it
  comes down, its time up, or off the edge, which is about an eighth of a hill that comes apart. The reviewers' probes
  (seed 6, the whole brush at `FLAT` lifted and dropped from 60 rows): a sealed hollow 45 rows under the ground, 73 to
  104 cells of the hill in it (101 with this test's hollow), through the rock; Sue standing in an 8-row hollow, buried
  and dead at tick 321; the hill carried 70 rows over her house and dropped, stone, a plank and sand on the bed, 8
  cells. The material count was right, so test 75 and test 4 passed. `handLand(g, m, aux, sh, q, X, Y)` now starts
  where the grain got to: from row `Y` down through the air to the first thing under it, and on that, as `handDrop`
  puts a cell down on the first thing under the top; buried where it is (no room in a heap of its own grains, three
  cells round), up out of what it is buried in to the first air over it, which is the top of the heap. Only a column
  full from there to the top sends it along to the next. A floor exit starts at the bottom row, so it lands where it
  did. `partHand` and `handCaught` pass the row. Tested (93: seed 6, an 8-row hollow cut 45 rows under `FLAT`, Sue in
  it, and the hill dropped from 60 rows: nothing in the hollow, every cell of the hill still there, and Sue alive and
  not in anything; before, 101 cells in the hollow. And seed 6's first house, the hill carried 70 rows over it and
  dropped: nothing in the room's air, its floor to its ceiling between the doors; before, 8).
- **A house held still over the middle of the pond kept its owner swimming after it with no end** (P1). The puddle fix
  (above, test 83) lets a chasing owner wade in, and drops nothing until they swim. But pStep sends a swimmer to
  `pSwim` before any task runs, and `pSwim` never ends one, so the chase stayed on through the swim, and `handTask`'s
  clocks (`k.t` for `H_LONG`, `k.here` for `H_STAND`) went round only on the ticks she was wading or on the bank. Back
  on the bank, the chase walked her straight back in after it. Held over column 106 (the pond is 87 to 126): swimming
  7,640 of 7,940 ticks, 178 changes between swimming and wading, and still chasing at tick 8,000, `k.here` at 305 of
  1,500. Test 84 holds it over the first wet column, where she never swims. Now a chase ends the moment its peasant is
  swimming (pStep, before `pSwim`: `iDone(p, true)`, given up, as `H_STAND` gives up), which is what the puddle fix's
  note said it did. Tested (94: Sue's house carried in 60 ticks to 15 rows over the middle of the pond and held there
  for 3,000: her chase ends in the first 600 ticks and is not on again, and she swims fewer than 1,500 of the 2,940;
  before, it never ended). The README says they wade "not a stroke further", and that a hill dropped on a roof is a
  heap on the roof.

Gate, after the last review: `node test/run.js` all passed: 563 tests in 150 s (the 561 above, and tests 93 and
94), among them the master guards and test/valley.js's `44ff922d`; `node harness/playtests/check.js` 5 of 5, and
harness/playtests/hand.json replays to its hash, unrecorded; the plain soak, seeds 1-6 x 12,000,
harness/soak-baseline.txt's in every column but ms/t (72 s of cpu). Each test above fails without its fix.

### After the build: the edge

The next review found one P1, twice: a knock toward a side wall still threw whoever it knocked out of the valley, and
it is fixed. It touches nothing in a valley that never lifted anything: only a knock sets `p.shoved` or `d.shoved`.

- **Knocked toward the wall from four to twenty columns off, they left the village, by air** (P1, twice). The shove
  of the round before (§2.5, "Knocked flat was thrown", above) kept the push along to 0.7 a tick, and took it off
  only within three columns of a wall (`x < 3`, `x > gw - 4`). But 1.2 up under 0.1 a tick of fall is a hop of 23
  ticks on flat ground, more where the ground falls away, and that is fifteen columns along, not where they were, as
  §2.5 and the README ("a step or two along") said. `pFly` takes anybody past `x < -4` or `x > gw + 4` for gone
  (`pLeave`), and only a rocket pack comes off the edge. So the guard covered three columns of the twenty, and on the
  left not even those: Sue at 3.5 fails `x < 3`. The reviewers' probes (seed 6, Sue alone d columns from a wall, a
  5 by 5 of stone flicked at 4 toward it): R4 to R16 and L3, L10, L12, L18 and L24 all gone, as on seed 1; and the
  disc of 12 thrown down at her from 40 rows lost her at 4.5 to 20.5 (1fa2191 kept her at 8.5 and 12.5, and lost her
  nearer). Limiting the push further only moves the edge of the danger, and a hop over a cliff is longer than any
  limit. Now the knock marks them (`p.shoved`, a duck `d.shoved`), and while it is on `pFly` takes the edge of the
  valley for a wall, as it does for a rocket pack (`nx < 1` or `nx > gw - 1`: back at half the speed), and so does
  `dThrown` for a duck; pStep, and a duck's step, take it off once they are out of the air. The push is as it was, and
  handShove's three columns stay, so that nobody beside a wall is pushed into it at all. Tested (95: seed 6, Sue 4, 10
  and 14 columns from the left-hand wall and 5, 10 and 14 from the right, and a duckling 8 from each, each knocked
  toward it by the reviewers' pebble: knocked, still in the valley 300 ticks later, never past its edge, and nobody
  left by air; before, Sue at 10 from the left was gone at x -3.4, and with the peasants' half of the fix alone, the
  duckling 8 from the right at 275.5). The README says a knock is a dozen steps or so along, and not over the edge of
  the valley; §2.5 and the note above say the same.

Gate, after the edge: `node test/run.js` all passed: 564 tests in 152 s (the 563 above, and test 95), among them the
master guards and test/valley.js's hash; `node harness/playtests/check.js` 5 of 5; the plain soak, seeds 1-6 x
12,000, harness/soak-baseline.txt's in every column but ms/t (68 s of cpu).
