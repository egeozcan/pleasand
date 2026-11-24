# Lime and chokedamp: a plan (v3)

Not built (yet). Evaluation history:

| version | consistency | design | entertainment | average |
|---|---|---|---|---|
| v1 | 8 | 7.5 | 7.5 | 7.67 |
| v2 | 8.5 | 8.5 | 7.5 | 8.17 |

This file is v3, written after the last review and not scored yet. Target was an 8.5 average.

*Burn the chalk and it keeps the fire. Wet the lime and it gives it back. What came off it lies in the low places.*

Status: **v3** (v1 reviewed 8 / 7.5 / 7.5, v2 8.5 / 8.5 / 7.5). One new rock you can paint, three things it turns
into that you cannot, and the heat books carried through all of them. No new idea, no new site, no new great work.
Line numbers are master at b07c9b4. "Measured" means measured on a scratch prototype of phase 1 at b07c9b4 (the four
materials, the heat cases, the wait line, `limeRoom`, `limeQuick`, `sandDamp`), run headless with `test/sim.js`. It
was not committed: this plan touches nothing but itself. The prototype passes `node test/run.js valley` (44 tests) and
`node test/run.js wonders` (67, master's hashes and dice among them) unchanged. Numbers marked **(v2)** come from v2's
prototype and are carried over. Every number a promise rests on is pinned by a phase 1 test, so the first build
re-measures the plan. v3 took v2's review:

- **The slake has a moment now.** Quicklime's store goes from 800 to **2,000** and drying from 2,200 to **3,400**
  (the store + 1,400), so every birth temperature and the bound's margin are unchanged (§3). v2 ruled this out only
  because it held drying at 2,200. Measured: forty cells of quicklime in a sixty-cell pond boil **12 to 16** of it;
  three pails on a heap set off gunpowder two cells down (3 of 3 seeds); five boil the water lying on the crust; a pail
  at the feet of a peasant on quicklime sets them alight in 3 of 8 seeds. Every slake sizzles.
- **The bound counts the water's own latent heat** (§3.3). Water not yet boiling cannot dry a slake (margin 430).
  Boiling water carries up to 1,200·fw a fire put in, and can: the lime hurries a boil, it does not make one. Measured:
  in a closed box it dries at most once and settles. Tests 4 and 5.
- **Chest-deep damp strands nobody.** The route hazard reads only the head row, the cell the breath reads, so a stand
  is ruled out for damp exactly when `pDampGo` is walking its peasant out. Chest-deep is a cough (§5.2, test 18, stuck.js
  with 5-deep and 8-deep damp).
- **Grounding fixed**: `NAV_DAMPOK` is not like `NAV_HOTOK` (pathGo sets that only around `navHere`, paths.js:265-267),
  and §5.2 says why; the positional tables' reason now covers `SAND_DENS` and `SAND_POUR` (§2); the bound (§3.3).
- **The powders look and read differently**: cold blue-white grit against smooth yellow cream, "thirsty" against
  "slaked. spent" (§7). **The wick is 2 and drawn**, as wet sand is (game.js:790-792). Cut to 0, a sunk heap's floor
  layer stayed white (20 of 40 slaked). **One name**: the achievement is CHOKEDAMP. **A first five minutes** (§11).
- **Less surface, two holes closed.** Gathering slaked lime for the great works is cut: nobody would have seen it.
  Re-checking found that a builder treading lime down (`heatVacate`, build.js:892) would leave 5,000° air in a plain
  village, and a bang's catch-all (world.js:563) a fire as hot. Every exit now takes its heat (§4.1, test 15).
- **The self-smothering kiln is no longer promised.** Re-probed, a pit kiln's damp goes up hot (§0). What smothers is
  cold damp: acid on chalk, and kiln damp that has cooled and come back down.

---

## 0. What we are working with

| what | where | what it means for this plan |
|---|---|---|
| ACID eats things into air. It never makes anything | world.js:1035-1052 | the first thing anybody tries on a new rock. Now it makes something |
| SMOKE, STEAM, GAS all rise or wander. Smoke fades anywhere at .03 a tick | world.js:802-838 | there is no heavy gas, and fading in place has a precedent |
| Phase worth `heatH0` = `HEAT_HS + HEAT_HLAT·heatF(sh)`. A kind change keeps Q | heat.js:196-217 | a chemical store of heat is a phase worth, like water's melting heat |
| `heatSpawn` gives the new cell the old one's T and returns what it cost. heatStep charges it (`heatSetQ(g, i, q - paid)`) | heat.js:285-291, 462 | the pattern for chalk pushing out damp and slaked lime pushing out steam |
| Every L > 0 `heatUp` case changes the cell's kind | heat.js:293-322 | a "no room, wait" branch in heatStep (§3.2) is reached by no master material |
| Water at 100 banks up to 1,200·fw before it boils, and `heatQ` counts it | heat.js:219-223, 458-462 | the bound in §3.3 has to count it |
| `sandFire` rolls one die per neighbour before it looks at it | world.js:728-739 | smothering uses that die. No new dice in master code |
| ROCK never falls, and is what a pick is for | world.js:241-243; mines.js:57 | CHALK is ROCK |
| Wet sand is drawn darker, with no state, from its neighbours | game.js:790-792 | how the wick is shown |
| `P_SAY.idea_concrete`: "the bucket hit the lime and it went WARM". `wSpark` sparks CONCRETE | wonders.js:75, 271-276 | the village's old joke comes true in front of them |
| A bucket is 5 cells (`I_LOAD`) | ideas.js:79 | a pail on lime is up to 5 slakes |

**How chalk burns** (measured, store 2,000: an 11×5 block on a stone slab in cleared sky, `sim.load(3)` and `(5)`,
quicklime counted at 1,000 / 2,000 / 3,000 / 5,000 ticks):

| fire | quicklime of 55 | at store 800 |
|---|---|---|
| a TORCH column each side | 25-26 / 34 / 41 / **53-55** | 27-28 / 42-44 / 52-54 / 55 |
| a row of TORCH under it | 29 / 32-33 / 34 / 34: the top two rows never get there | 32-34 / 34-36 / 34-36 / 34-37 |
| a 29×5 COAL bed lit at 460 under it | 4-7 by 1,000, then no more | 8-10 |
| a WOOD bonfire beside it | 0. The chalk peaks at 427 **(v2)** | |
| LAVA poured over the top | 0 while it is covered: nowhere for the damp to go **(v2)** | |

So a kiln takes about half as long again as it did at 800, and it is still "burn it on a torch", as the tip says.
Lava and the bellows (1,800) do it too, wherever the damp has room. A bolt adds up to +2,600 (world.js:680), which is
enough to burn only the few cells at the heart of the strike at once.

**Where kiln damp goes** (measured): out of a 14-wide, 18-deep pit with torches down both sides, 59 quicklime in
6,000 ticks, the pit held 0 or 1 damp cells at every count. The rest was 4 to 11 cells hanging hot under the top of
the sky. Under a stone lid three cells over the chalk, 17 to 34 damp cells filled the oven, and it still burnt 57-58
of 60, slowly, as the damp faded and made room. Damp born at 580 goes up first. It smothers where it comes down cold.

---

## 1. What this adds

| | |
|---|---|
| materials | CHALK 55 (paintable, MORE / FROM THE ROCK), QUICKLIME 56, SLAKED LIME 57, CHOKEDAMP 58 (`MAT.DAMP`). 5 ids stay free under NMAT 64 |
| code | a new `lime.js` (~200 lines: `limeRoom`, `limeQuick`, `limeCarb`, `limeAcid`, `sandDamp`, `limeStep`, `pDampGo`), after platforms.js in index.html |
| hooks | world.js (ids, tables, flags, dispatch, acid, fire, ember and bang branches), heat.js (defs, worths, one heatUp case, the wait line), peasants.js (breath, cough, rim, walking branch, lines), paths.js (one hazard read, `NAV_DAMPOK`), mines.js (foul), ducks.js (one compare), build.js (two table rows, one vanish), ideas.js (`iUrgent` skip, `limeStep` call), wonders.js (one `W_HOW` line), game.js (picker, names, readouts, drawing), harness/inspect.js (glyphs) |
| village | breathing (and not breathing) damp, the route out, the rim, the foul mine, the concrete spark, the brigade that learns. Three achievements |
| UI | one MORE row (MORE_H 130 to 140, MORE_TOP 230 to 220, against PLAY_Y 14), readouts, eyedropper, one tip |
| tests | test/lime.js, 21 tests; test/picker.js `NEW` gains CHALK |

---

## 2. The materials, and why each one is here

| id | name (readout) | what it is | dens / free / pour | C / K | flags | picker |
|---|---|---|---|---|---|---|
| 55 | CHALK | soft grey-white rock, with the odd black flint | 9 / 0 / 0 | 1.0 / .07 | SOLID STILL ROCK | **MORE, FROM THE ROCK** |
| 56 | QUICKLIME | burnt chalk: cold blue-white grit that holds its kiln's heat | 3.3 / 1 / .3 | 0.9 / .05 | SOLID (powder) | no |
| 57 | SLAKED LIME | quicklime that has drunk water: a yellow-cream paste | 2.4 / 1 / .3 | 1.2 / .06 | SOLID (powder) | no |
| 58 | CHOKEDAMP | what burning or fizzing chalk gives off: heavy, and you cannot breathe it | 0.3 / 1 / 0 | 0.5 / .02 | AIRY FLUID | no |

- **CHALK earns its place.** It starts the chain, and you build with it: a cliff for acid and lightning, a block for
  the torches, a seam under the village. It goes under FROM THE ROCK after ROCK SALT (`MORE_GROUPS`, game.js:564, lists
  by group). Desc (80 chars): "soft white rock. acid fizzes it. burnt past 580 it is quicklime. then add water."
  The review notes the village's rock never has chalk in it. I disagree that the label is off. The group says what a
  thing is (rock, `ROCK[CHALK] = 1`, and a pick takes it as stone), not where the world put it. Chalk beds in the
  ground would change every master hash (§14).
- **QUICKLIME is not in the picker**, because its heat is the point. Painted at T0 (`sandPlace`, world.js:342) it
  would bring 56 + 2,000f of heat that the books never paid for: painted heat. A cloner already refuses it
  (`t < MAT.PLANK`, world.js:1183).
- **SLAKED LIME is not in the picker.** It is the spent state, and it has four jobs. It tells you the heat is gone.
  It is the crust a heap grows, and the water lying on that crust is what boils. It drinks damp and sets back into chalk
  (the only sink for damp besides fading). And it stops acid cell for cell. The review calls it bookkeeping. The crust
  and the damp sink are play.
- **CHOKEDAMP is not in the picker**, for the same reason SMOKE is not: you earn it. Acid on chalk earns it as fast
  as you like.
- The eyedropper (`sandEyedrop`, game.js:540-549) gives CHALK for all three, as STEAM gives WATER.
- Damp's C 0.5 is air's (heat.js:57), so when damp fades to air it keeps its temperature exactly.

**Positional tables.** SAND_DENS, SAND_FREE and SAND_POUR (world.js:133-144) stop at index 52. Phase 1 pads 53 and 54
with `9, 0, 0`, which reads exactly as the `undefined` they hold now everywhere they are read. `SAND_FREE[t] === 1` (world.js:299,
929; mines.js:175) is false either way, and the `SAND_DENS` compares beside it are only reached once it is true.
`SAND_DENS[t] >= 1` (world.js:357) is only reached for a cell sandCan let through, so never LINEN or TRESTLE.
`SAND_FREE[t] &&` (world.js:550) and `!SAND_FREE[c]` (mines.js:177) treat 0 and undefined alike, and so does `if
(!pour)` in `sandDab` (game.js:428). `SAND_DENS[src]` is read only for a moving cell, and both are STILL. Then the
four rows above go in. `SAND_SHADES` gains chalk `#cfcac0 #c4bfb4 #d8d3c9 #bcb7ab`, quicklime `#eef1f4 #e3e7eb
#f7f9fb`, slaked `#dccb98 #d3c18c #e3d4a6`, and damp `#6b7a55 #74835c` (drawn see-through, §7).

---

## 3. The heat books (the part that has to be right)

### 3.1 Phase worths and transitions

New rows in the IIFE at heat.js:196-207, so `heatH0` needs no change. `f = heatF(sh)` (0.7-1.3, heat.js:208) is the
cell's own jitter, and `fw` the water's. Every reaction keeps the lime cell's shade.

| kind | HEAT_HS | HEAT_HLAT | worth at 20° | why |
|---|---|---|---|---|
| CHALK | 0 | 0 | 0 | the zero of the family, as ice is of water's |
| QUICKLIME | (1.0 - 0.9)·(580 - 20) = **56** | **2000** (chalk's HI_L) | 56 + 2,000f | what burning it took, as water holds what melting took |
| SLAKED LIME | **80** | **640** | 80 + 640f | so that setting back into chalk gives back exactly 40 (§3.4) |
| CHOKEDAMP | 0 | 0 | 0 | air, with weight |

| kind | HI | HI_L | `heatUp` makes | the puff (`heatSpawn`, paid by the cell) |
|---|---|---|---|---|
| CHALK | 580 | **2000** | QUICKLIME | one CHOKEDAMP at 580, into `limeRoom` |
| SLAKED LIME | 450 | **3400** (= the store + 1,400) | QUICKLIME | one STEAM at 450, into `limeRoom` |
| QUICKLIME | none | | never melts in any fire the valley has. Lime lines furnaces for a reason | |

Why 2,000: it is the round store at which every §4.2 moment showed in every seed. At 1,600 the pond of forty boiled
9 to 11, and three pails set the powder off in 2 seeds of 3. At 2,400 it boiled 17 to 20, the kiln slows again, and
acid on quicklime passes 2,000°.
Why drying is the store + 1,400: drying pays for a steam puff worth 535 + 1,840f at 450 and leaves quicklime worth
56 + 2,000f. With drying at the store + 1,400, quicklime always comes out at `20 + (5 + 200f) / 0.9`, whatever the
store is (§3.3).

### 3.2 Room, and waiting for it

`limeRoom(g, i)`: EMPTY or SMOKE, in the order up, left, right, down. If none is open, it looks straight up through at
most `LIME_SEEP` 6 cells of CHALK, QUICKLIME or SLAKED LIME (porous: the damp seeps up) to the first open cell. No dice.

- **Not STEAM.** `heatSpawn` charges the difference. A damp puff written over steam would hand the steam's latent
  heat to the quicklime, which would be born at about 1,900.
- **Not through damp.** An oven full of its own damp burns only as fast as the damp fades. CO₂ stops calcination.
- **No room: it waits.** One line in heatStep's change branch (heat.js:462):
  `paid = heatUp(g, i, v); if (m[i] === v) { L = heatLat(g, i, L); lat[i] = L; T[i] = hi + (e - L) * IC[v]; continue; }`.
  It keeps the latent heat it needs and puts the rest into temperature, so Q is unchanged, and it tries again next
  tick. A sealed lump warms with what is round it (1,221 under lava **(v2)**). Uncovered while hot, it burns at once.
  No master material reaches this line (§0).

### 3.3 Birth temperatures, and why nothing flip-flops

From chalk (at 580 with at least 2,000f banked, the overshoot `e - 2,000f` on top), the puff into a room cell at `Tr`:

    quicklime T = 20 + (504 + (e - 2000f) - 0.5·(580 - Tr)) / 0.9

Into cold air that is **269 plus the overshoot**: measured 298 at f = .7 and 1.3 with a 40° overshoot, the same at
store 800 and 2,000. From slaked lime (at 450 with 3,400f banked), the steam puff into cold air:

    quicklime T = 20 + (516 + 3400f + 80 + 640f - (535 + 1840f) - 56 - 2000f) / 0.9 = 20 + (5 + 200f) / 0.9

That is 181 to 314 plus the overshoot: measured **221 / 354** at f = .7 / 1.3 with a 40° overshoot.

**The slake, from cold.** Quicklime (56 + 2,000f) and water (40 + 640fw) become slaked lime (80 + 640f) and air at
the water's temperature. It gives **16 + 1,360f + 640fw: 1,416 to 2,616**. Slaked lime is capped at 450, which takes
516, and the rest is banked toward drying: **900 to 2,100**, against the 2,380 to 4,420 that drying takes.

**The worst slake, from water that is not yet boiling.** Quicklime just under 450 and water at 100 with nothing banked:

    banked = 0.9·429 + 56 + 2000f + 3.5·80 + 40 + 640fw - (516 + 80 + 640f) = 166 + 1360f + 640fw

At f = .7 and fw = 1.3 that is 1,950, against 3,400 × .7 = 2,380. The margin is **430**. It is the same at any store,
because drying is the store + 1,400, so f's share cancels: `2380 - 1950 = 2040·0.7 - 166 - 640·1.3`. For brine (HI
103, the water's cell left as SALT at 103) it is `152 + 1360f + 640fs`, margin **444**.

**Water that is boiling.** `heatQ` counts the water's banked latent heat (heat.js:219-223), and water at 100 holds up
to 1,200·fw of it before it turns to steam (heat.js:458-462). Brine at 103 holds the same. Add that `Lw` to the sum
above, and once `Lw` > 430 (worst case) a slake can dry at once. So v2's "a slake never dries itself" was too strong.
The true claim: **drying needs heat that a fire put in, into the lime or into the water.** Boiling water has had it put
in, and the lime only hurries its boil: the water's cell ends as steam, the lime as quicklime, paid for by the fire
under the pot. Nothing banks any more without a fire, so it cannot loop on its own. Measured in an INERT box,
quicklime at 449 (f .7) against water at 100 (fw 1.3) with 0 / 300 / 450 / 600 / 800 / 1,000 / 1,200 / 1,400 banked,
3,000 ticks: no dry at 0, 300, 450, 800 or 1,400 (that water boiled first, or cooled before it slaked), and **one** at
600, 1,000 and 1,200, whose steam rained back and slaked again. Every run ended as one slaked lime, books within 0.015.

Two more rules keep it honest. Quicklime never reacts with STEAM, so it never drinks the puff it dried out as. And it
slakes only below 450. Lime in a closed box over a torch will cycle (dry, steam, rain, slake), slowly and paid for.

### 3.4 The reactions kept by hand

Each one syncs both cells (`heatSync`), sums their Q, writes the by-product and gives the rest to the main cell with
`heatSetQ`, as `heatSpawn` does. None uses `sandSet`, which throws away a phase worth (world.js:336-340).

| reaction | heat out, at 20° | so |
|---|---|---|
| QUICKLIME + WATER: lime becomes SLAKED, water becomes EMPTY at the water's T | 16 + 1,360f + 640fw: **1,416-2,616** | slaked lime at **450**, banking 900-2,100 toward drying |
| QUICKLIME + SALTWATER | as water, and the water's cell becomes SALT | brine on lime leaves a grain of salt |
| SLAKED + CHOKEDAMP, the lime at rest: lime becomes CHALK, damp becomes WATER (with the lime's shade), one temperature | (80 + 640f) - (40 + 640f) = **40** over C 1.0 + 4.0 | **+8°**: the lime sets, gently, and sweats a drop |
| SLAKED + ACID: lime becomes SALTWATER (its shade), acid becomes EMPTY at its T | (80 + 640f) - (73.8 + 640f) = 6.2 over C 3.8 | **+1.6°**. The acid is always spent |
| QUICKLIME + ACID: lime becomes SALT, acid becomes SMOKE, one temperature | 56 + 2,000f over C 1.0 + 0.5 | **991 to 1,791°** (computed): a white-hot grain and a hot fume. The acid is always spent |

Round the full circle, chalk at 20° back to chalk at 20° gives back 56 + 2,000f, which is what the fire paid at 580,
give or take 640(fw - f) for the drunk and the sweated water's own jitter. One cell of water is drunk, and one is
sweated out.

---

## 4. Recipes and changed interactions

### 4.1 The table

Rates are per tick, per touching pair. "New" means the rule is in lime.js.

| actor | with / when | result | rate | where |
|---|---|---|---|---|
| CHALK | T > 580, 2,000f banked, room | QUICKLIME + a CHOKEDAMP puff at 580 (hot, so it rises first) | heat | heatUp |
| CHALK | ACID neighbour | CHOKEDAMP in place, cold. The acid is used 30% of the time, as always | .04 | acid list, world.js:1040-1043 |
| CHALK | a pick | "stone" in the pocket | | `M_YIELD`, mines.js:57 |
| QUICKLIME | WATER or SALTWATER beside it, or straight up through at most `LIME_WICK` **2** cells of slaked lime; own T < 450 | SLAKED LIME, the water drunk (§3.4). `g.fx.hiss++` every time: the sizzle is throttled to one per 0.15 s (game.js:703) | on `((g.tick + i) & 3) === 0`, then .2 | new `limeQuick`, first line of sandPowder |
| QUICKLIME | STEAM | nothing. It conducts (K .05) | | |
| QUICKLIME | ACID | SALT and SMOKE (§3.4) | .04 | acid list, a branch before the generic one |
| SLAKED LIME | T > 450, 3,400f banked, room | QUICKLIME + a STEAM puff | heat | heatUp |
| SLAKED LIME | CHOKEDAMP, the lime **resting** (`vy` 0, the cell under it neither AIRY nor FLUID) | CHALK in place; the damp becomes WATER | .02, on the damp's die | new `sandDamp` |
| SLAKED LIME | ACID | SALTWATER, +1.6° | .04 | acid list |
| CHOKEDAMP | FIRE beside it | the fire becomes SMOKE, keeping its heat (`heatBecome`) | .2, the fire's die | sandFire, one branch before WET (world.js:739) |
| CHOKEDAMP | EMBER beside it | the ember becomes ASH, keeping its heat | .01, the ember's die | ember chain, world.js:1128-1140 |
| CHOKEDAMP | anywhere | fades to EMPTY (same C, so same T) | .0002 | `sandDamp`, one die `r` |
| CHOKEDAMP | EMPTY directly above | thins away | .002 (the same `r`) | `sandDamp` |
| CHOKEDAMP | T > 100 | rises on .6 of ticks: up into EMPTY or into damp 20° cooler, else up a diagonal into EMPTY | | `sandDamp` |
| CHOKEDAMP | T ≤ 100 | on .65 of ticks: down (`sandCan`: through SMOKE, STEAM and GAS), then a diagonal (`sandSlide`), then `sandSpread(…, 4)`. Under a liquid it bubbles up (`sandBubble`). Water sinks through it | | `sandDamp` |
| TORCH | under damp | burns without a flame (it lights only EMPTY, world.js:1155-1158) | | nothing new |
| sandBoom | | CHALK is in the hard set by `ROCK`. QUICKLIME and SLAKED: `big && inner` (world.js:548) skips them, the outer shell flings them as debris (keeping their heat), and what is left stays as it is, a branch before the 85% FIRE catch-all (:563). DAMP joins STEAM, SMOKE and GAS: never flung (:550), stays itself (:561) | | world.js |
| a builder's spade | QUICKLIME, SLAKED LIME | dug (`B_DIG`) and tossed as now. Trodden down instead (build.js:892), it goes by `heatVanish`, not `heatVacate`, so the heat goes with it | | build.js |
| lightning, DRAIN, CLONER | | a bolt burns the chalk at its heart and dries lime with room; a drain takes the loose ones by `heatVanish`; a cloner learns none of them | | nothing new |

**Every way out takes its heat.** A lime cell turned to air by the recount would give that air 56 + 2,000f at C 0.5:
5,000°. So no rule ever writes EMPTY over lime except by `heatVanish` (a drain, the spade) or as a reaction kept by
hand. `heatTaken` (heat.js:493-500) would have caught the spade only in a great-works village. Test 15 scans for it.

Two powders never trade places (world.js:263-264), so quicklime poured on sand sits on it, and water cannot sink
through either. The wick is what makes the paste porous. It is drawn: slaked lime with water beside it, or under at
most 2 cells of slaked lime with water on top, gets a darker shade, as wet sand does (§7). The dark band shows where
the water is going in, and the white under it is what it will reach.

### 4.2 What the probes say the heat does

Store 2,000, drying 3,400, wick 2. An open stone basin or trough in cleared sky, three seeds, 1,500 ticks:

| scene | measured |
|---|---|
| 20 quicklime in a 60-cell pond | all 20 slake (60 to 40). 2 cells boil off, and rain back. Water 39° on average at the end |
| **40 quicklime in a 60-cell pond** | 39-40 slake (60 to 20). **12 to 16 cells boil**, up to 10 at once. Water 47-49° at the end |
| one pail (5 cells) on a 20×6 quicklime heap | drunk, all of it, with a sizzle. A plank 2 deep reached 119, gunpowder 2 deep 73. Nothing went |
| three pails on the heap | **gunpowder 2 deep went off, 3 of 3** (at 96-141 ticks). 0-1 cells boiled |
| five pails on the heap | 21-24 slaked, then the crust. **2 to 5 cells of the water lying on it boiled**, 2-4 at once. A plank 2 deep reached 247 and did not catch |
| a pail at the feet of a peasant on a quicklime floor | **3 of 8 caught fire** (`pHeat`, peasants.js:748: feet over 350), one of them fatally: the water that would have put them out had been drunk |
| the same at store 800 (v2's) | pond of 40: 0-1 boiled. Feet: 1 of 6 caught |

So lime is a store of heat that comes back as heat you can see. It is still not a way to light a house: wood two
cells down reached 247 at most, against its 300.

---

## 5. Chokedamp and the living

### 5.1 Breath

In `pStep` (peasants.js:656 reads `cm` at fy-4 and `ch` at fy-7), `damp = !sub && ch === MAT.DAMP`:

- **Head in damp:** `p.breath` falls on even ticks, so a peasant lasts **600 ticks** from a full 300 (`P_BREATH`,
  peasants.js:18). No recovery while in it, no bubbles, and the death cause is `damp`. On the first breath lost:
  `p.task = null` and `pSay(g, p, "damp", true)`. Every damp tick: `p.dampT = g.tick + 240` and
  `p.panic = max(p.panic, 60)`. `scared` (peasants.js:1580) then keeps them off tasks.
- **Chest in damp, head clear:** a cough, as smoke gives (the line at peasants.js:679 gains `|| cm === MAT.DAMP`, and
  rolls its die only when that is true, which in a village with no damp it never is). No breath lost, no panic, and
  the route does not mind (§5.2).
- Lines: `P_SAY.damp` "*gasp*", "the air's gone heavy", "can't... breathe", "UP. go UP", "*wheeze*".
  `P_DEATH.damp` "{n} breathed the bottom of the hole", "{n} lay down where the air was bad", "{n} went down for a look
  and stayed". `W_HOW.damp` "breathed the bottom of a hole" (wonders.js:281). `P_CAUSE.damp` "chokedamp"
  (game.js:1423). `pMood`: before the drowning line (game.js:1370), with `p.dampT > g.tick` and breath down,
  "can't get their breath. Ns of air left", counting two ticks to a breath.

### 5.2 Getting out: a route, not a direction

- **One row, read by both.** `paths.js` gains `function pDampAt(g, x, y) { return pCell(g, x, y - 7) === MAT.DAMP; }`.
  `navHazard` (paths.js:59-62) gains `|| (!NAV_DAMPOK && pDampAt(g, x, y))`, and the breath in §5.1 reads the same
  cell. So a stand is ruled out for damp exactly when somebody standing on it would be breathing it. That is when
  `p.dampT` is set and `pDampGo` is walking them. v2 also checked the chest (y-4). Damp at the chest then ruled out the
  stand under a peasant who could still breathe, every errand's `navHere` (paths.js:245) failed, and they walked
  straight at their goals, into the spill. Feet and chest are never checked now, so a spill up to 7 deep is a cough,
  not a wall.
- `var NAV_DAMPOK = false` beside `NAV_HOTOK` (paths.js:32). **It is not used the way `NAV_HOTOK` is.** pathGo sets
  `NAV_HOTOK` only around `navHere` (paths.js:265-267), so a burning peasant may start on hot ground and the route on
  still keeps out of the heat. `pDampGo(g, p)` (lime.js) sets `NAV_DAMPOK = true` around one whole
  `pathGo(g, p, "air", null, null, goal)` call and clears it after. A route out of a pit of damp has to go *through*
  damp, so `navFind` must accept damp stands too. And pathGo's "something nasty on the next steps" check (paths.js:262-263)
  would otherwise replan every tick. The goal is a stand with `!pDampAt`. With `tx` null the search has no heuristic
  (paths.js:212), so it finds the nearest clean air by cost: ladders, lifts and all (`navEdges`, paths.js:131-146).
- In the walking code, the branch at peasants.js:1590 becomes
  `if (p.dampT > g.tick && !p.fire) { if (pDampGo(g, p) < 0 && (p.anim % 60) === 0) p.dir = -p.dir; } else if (!p.fire) {…}`.
- **Measured (v2):** `sim.load(s)` for s in 1, 2, 4-9, a mine built, a gallery built, four miners on its floor, every
  air cell in the bottom 12 rows of the gallery and shaft made damp, 2,400 ticks. With the route, **32 of 32 got out**,
  heads in clean air within 6-36 ticks, and nobody's breath fell below 282. With a turn-round instead, 6 of 32 died.
  `pDampGo` never came back with -1 (3,218 calls).

So damp kills where there is no way out: a pit with no ladder, somebody thrown in, a flood from above into a sealed
hole. That is the hazard it should be.

### 5.3 The mine that goes foul

`mFlooded` (mines.js:718-731) also counts damp cells in the plan. More than 4 of those (and 4 or fewer of water) makes
the mine **foul**, not flooded: `s.foul = 1`, and the feed says once, "{Mine} is full of chokedamp. nobody is going down
there till it clears". `mFlooded` returns true, so every gate that keeps people out of a flooded mine keeps them out of
this one (ideas.js:739, leftovers.js:819 and 866, mines.js:618 and 625). It also sets a module flag, `M_FOUL`.
`mFloodClock` (mines.js:242-249) does not start the 12,000-tick write-off while it is set, and mines.js:618 does not
mark the gallery's direction worked out. Cleared: `s.foul = 0`, "the air in {mine} is fit to breathe again".

How long a mine is foul **(v2)**: a 41×10 gallery and shaft with 443 damp cells drops to 212 by 2,000 ticks, 21 by
4,000 and 0 by 8,000. The fade starts holes inside the damp, the damp falls into them, they rise like bubbles, and the
cells under them thin at the faster rate. A torch at the far end does **not** help: the hot damp hangs under the roof.

### 5.4 What the village makes of it

1. **The rim.** `pNasty` (peasants.js:1318) already looks down from an edge for fire and acid. It counts damp too: 7
   damp cells below the edge, a head's depth, make it nasty. The look-ahead (peasants.js:1596) turns them round as it
   does now. When damp was the reason (a flag `P_NASTY_DAMP`), they say `P_SAY.dampRim` instead of "nope": "the air's
   wrong down there", "smells of nothing. i don't like it", "not down there", "the duck won't go in either". One compare
   per cell scanned, no dice.
2. **Ducks** (`dNasty`, ducks.js:182-185) count damp as nasty. A duck is about two cells tall, so a layer a peasant
   coughs through is over a duck's head, and the ducks leave the hollow first. They know.
3. **Builders** treat damp as air (`B_AIR`, build.js:71-72) and dig quicklime and slaked lime as loose (`B_DIG`,
   :68-69), taking the heat with them (§4.1).
4. **"it went WARM".** `limeQuick` writes `g.limeAt = {x, y, t}`, a lazy key. `limeStep` runs from `ideasStep`, which
   runs only every 20th tick (ideas.js:539-540), and only while `g.limeAt.t` is under 300 ticks old. It looks at
   peasants within 12. Anybody with `p.pail` (ideas.js:485) says `P_SAY.limeWorse`: "it's getting WORSE", "stop
   throwing water at it", "this is not how fire works". That sets `g.limeWise`. Anybody else says `P_SAY.limeWarm`: "it
   went WARM", "who heated the pond", "it's boiling and nobody lit it". Anybody who knows masonry gets
   `wSpark(g, p, "concrete")` (wonders.js:271-276, which gives it only if the idea is ready).
5. **The brigade that learns.** Once `g.limeWise` is set, `iUrgent` (ideas.js:474-490) skips a blaze with quicklime
   within 6 cells of its site's box. They stand off and say `P_SAY.limeWise`: "not with water. NOT with water", "let it
   burn. trust me", "remember the lime". The look happens only in a village with `g.limeWise`, once per peasant per
   call, over a box of about 30×20.
6. **Achievements**, appended to `P_ACHIEVE` (peasants.js:399). The master table hashes only master's keys
   (test/wonders.js:61-69). `slake` "IT WENT WARM" / "quicklime and water. they have been saying so for years".
   `smother` **"CHOKEDAMP"** / "a fire went out on its own, in a hole full of nothing". `chalkagain` "FULL CIRCLE" /
   "chalk, burnt, slaked, and set back into chalk. not a degree lost" (on the first `limeCarb`).

---

## 6. Determinism, saves, the rules kept

- **A village that is never given chalk goes exactly as it did.** Every new rule fires on a cell of 55-58, and only
  the CHALK brush makes one. In master code the hooks are compares against the new ids, put after the tests they share
  a chain with, and they use dice already rolled: `sandFire`'s per-neighbour `r`, the ember's `r`, the acid's roll
  (still rolled only when `p` is not 0), the cough's (rolled only when its condition holds). The heatStep wait line is
  reached by no master material. `navHazard`, `pNasty`, `dNasty`, `mFlooded`, sandBoom and the breath gain compares and
  no dice. `heatRoom` is untouched. **Checked:** the v3 prototype passes test/valley.js and test/wonders.js unchanged.
  v2's passed the replayed recording and the dice trace too.
- **No new dice stream.** The new rules roll the village's own dice, as acid and salt do, and only where the player
  has painted chalk. That village already left master's path when the brush rolled `irnd(256)` for the shade.
- **Only lazy keys**: `g.limeAt`, `g.limeWise`, `s.foul`, `p.dampT`. Each is read with a guard (`p.dampT > g.tick` is
  false for undefined). `saveApplyState` deletes keys an older save lacks (save.js:483), which is the same as
  never having had them. No grid arrays. The flags `NAV_DAMPOK`, `M_FOUL` and `P_NASTY_DAMP` are set and cleared inside
  one call, and never saved. `g.fx.hiss` is sound, not state.
- **Old saves load.** The ids are appended (55-58 < NMAT, save.js:274). The brush is saved by name (save.js:503), and
  CHALK is appended after TRESTLE, so every brush keeps its place for keyframes and recordings. The fixture
  test/fixtures/valley-272.json replays to its hash.
- **The panel.** One `more: "rock"` row at the end of PICK, so `PICK_N` is unchanged. The rock rows of the flyout move
  up 10 and the BUILDING rows stay put, since the flyout is anchored at its bottom (game.js:567-576). MASTER_SC clicks
  only panel rows. test/picker.js `NEW` gains "CHALK". The stale MORE hover line (game.js:1346, which has no TRESTLE)
  becomes "MORE  coal, iron ore, gold, rock salt, chalk, stonework, concrete, firebrick, stained glass, trestle. click to
  open". (If another plan adds a MORE group first, the flyout is taller by its rows; the PLAY_Y check in test/picker.js
  is the one to re-run.)

---

## 7. Drawing, readouts, the harness

- `drawWorld` (game.js:740) gains branches beside the TRESTLE one (:865). **CHALK**: its grey shade, lit on top, and a
  black flint `#4a4a52` where `(x*7 + y*13) % 61 === 0`. **QUICKLIME**: its cold blue-white, with grey grit `#a9adb2`
  where `(x*5 + y*11) % 7 === 0`, so a heap of it reads as crumbly lumps. **SLAKED LIME**: smooth cream, no grit, and
  the wet paste (`LIME_WET`, its shades at 0.72, as `SAND_WET` is built at 0.68, world.js:221) where §4.1's wick would
  find water. **CHOKEDAMP**: `blend32(bg[i], DAMP_TINT, .22)`, and .34 on its top face with a slow ripple, so a pool of
  it reads as a surface you can see the sky through. Its branch comes before any AIRY handling.
- **Hot lime shimmers.** An EMPTY cell over QUICKLIME or SLAKED LIME hotter than 150 is drawn lighter, by .12, where
  `((g.tick >> 3) + x * 5 + y) % 7 === 0`. Drawn only: no state, no dice. Over 450 the glow (game.js:887-889) takes over.
- **Telling them apart, in words.** `MAT_NAME`: QUICKLIME, SLAKED LIME, CHOKEDAMP, by hand (game.js:452-462). CHALK
  comes from PICK. `MAT_UP[CHALK] = "burning"`, `MAT_UP[SLAKED] = "drying"` (game.js:465-468). `cellReadout`
  (game.js:470) adds:

| cell | readout |
|---|---|
| chalk, heating | `CHALK 580°  burning 41%` |
| chalk at its HI, with no room | `CHALK 1,221°  ready to burn: nowhere for the damp to go` |
| quicklime | `QUICKLIME 31°  thirsty. holds what the kiln put in` |
| slaked lime, at rest | `SLAKED LIME 46°  slaked. spent` |
| slaked lime, over its HI | `SLAKED LIME 450°  drying 12%` |
| chokedamp | `CHOKEDAMP 20°  heavy: it lies in the low places` |

- One tip at the end of `TIPS` (game.js:18-70): "tip: burn some CHALK on a torch. let it cool. then drop a lot of it in
  the pond".
- harness/inspect.js `GLYPH`: CHALK `&`, QUICKLIME `q`, SLAKED `Q`, DAMP `d`.

---

## 8. Performance

- **Nothing new runs over the whole grid.** CHALK is STILL, so `sandStep` skips it (world.js:1224), and it burns in
  heatStep's existing pass. The dispatch (world.js:1229-1231) gains two compares at the end of the powder list and one
  branch for damp after GAS.
- Quicklime looks at its neighbours one tick in four, and the wick reads at most 2 cells. Slaked lime has no rule of
  its own. Damp is a random walk like smoke, and it cannot multiply: one puff per chalk cell burnt or fizzed.
- `limeRoom` reads 4 cells plus up to 6 straight up, only for a cell over its HI with its latent banked. The wet-paste
  draw reads 4 neighbours and 2 cells up, for visible slaked lime only.
- **Measured (v2)** (272 wide, 1,500 ticks after 300 to settle, three runs): plain about 1.6 ms a tick. With 2,000
  quicklime, 300 slaked lime and 600 damp, 2.1 ms. With the same amounts of SAND and WATER instead, 2.3-2.5 ms.
- A four-screen valley costs nothing more until the player paints chalk, and then in proportion to what is there.
  Phase 1 runs `node harness/cli.js run --seed 7 --ticks 3000 --gw 1088 --profile` before and after.

---

## 9. Phases and tests (test/lime.js)

### 9.1 Phase 1: the four materials, the cycle, the books

world.js (ids, padded tables, flags, dispatch, the sandPowder line), heat.js (defs, worths, the CHALK/SLAKED heatUp
case, the wait line), lime.js and its script tag, game.js (PICK row, names, readouts, drawing, eyedropper), glyphs.

1. "lime: CHALK is in MORE under FROM THE ROCK with a colour, a name and a description; the other three are not in the
   picker, and the eyedropper gives chalk for each". Plus test/picker.js `NEW`.
2. "lime: the books balance round the circle". An INERT box: chalk at 620 with 2,000f - 10 banked steps until it is
   quicklime and damp; cold water is let in and it slakes; a pinch of damp is let in and it sets. ΣheatQ over the box
   stays within 0.02. The counts go chalk → quicklime + damp → slaked + air → chalk + water.
3. "lime: quicklime from chalk is born under 320 in cold air, and dried quicklime between 200 and 380" (f .7 and 1.3,
   a 40° overshoot, §3.3).
4. "lime: a slake from water not yet boiling never dries itself". Quicklime at 449 (sh 0), water at 100 (sh 63), 0 and
   300 banked, INERT box: it slakes, and nothing dries in 3,000 ticks. Quicklime beside STEAM at 120 for 600 ticks
   stays quicklime.
5. "lime: boiling water can dry hot lime, once, and the books close". The same pair with 600, 1,000 and 1,200 banked:
   at most one dry each, the box ends with one slaked lime and no steam, ΣheatQ within 0.02.
6. "lime: torches each side burn a chalk block; torches under it burn the bottom; a coal bed only the row on it". On
   the §0 slab: each side, at least 50 of 55 by 5,000. Under, at least 25 by 1,000. Coal, 3 to 10 by 3,000 and no more
   by 5,000.
7. "lime: chalk under lava waits, warms with the lava, and says so; uncovered while hot, it burns at once". No cell sits
   at 580 for 200 ticks while the lava round it is over 900, and the readout is checked.
8. "lime: forty cells of quicklime in a sixty-cell pond: it drinks forty and boils some; twenty drink twenty". Water +
   slaked + steam = 60 ± 1 throughout. With 40: at least 36 slaked by 1,500 and at least 6 STEAM births. With 20: at
   least 18 slaked.
9. "lime: pails on a heap". The §4.2 trough, seeds 1-3: one pail sets nothing off; three set off the gunpowder two down;
   five boil at least one cell of water.
10. "lime: chokedamp fills a pit from the bottom, hot damp rises first, and it clears". Acid on a chalk ledge over an
   80-cell pit: 40 or more damp in its bottom 8 rows by 300 ticks; all gone by 6,000. A one-deep spill is gone by 3,000.

### 9.2 Phase 2: what damp, acid, bangs and spades do

world.js hooks: sandFire, the ember chain, the acid list, sandBoom's branches. build.js (`B_DIG`, `B_AIR`, the vanish).
lime.js `limeCarb`, `limeAcid`.

11. "lime: a fire in a pit of chokedamp goes out, and the one beside the pit does not" (`smother` achieved).
12. "lime: acid fizzes chalk into chokedamp; on slaked lime it is spent every time and leaves brine under 30; on
    quicklime it leaves salt and smoke over 900, and the books close".
13. "lime: slaked lime falling through damp does not set; resting in it, it sets and sweats a drop; poured into a damp
    pit, it clears it faster than the damp clears alone" (under half the control's damp left at 3,000).
14. "lime: a bolt on chalk makes quicklime and damp; a small bang flings quicklime but not damp, burns no lime, and does
    not shatter chalk".
15. "lime: every way out takes its heat". A builder treads down quicklime, a drain takes it, a nuke goes off in a heap:
    no AIR cell over 1,000 anywhere but within the bang's radius, and ΣheatQ for the spade and the drain cases drops by
    exactly the vanished cells' Q.

### 9.3 Phase 3: the village

peasants.js (breath, cough, lines, `pNasty`, the walking branch), paths.js (`pDampAt`, `NAV_DAMPOK`), lime.js
(`pDampGo`, `limeStep`), mines.js (foul), ducks.js, ideas.js (`iUrgent`), wonders.js and game.js (cause tables,
`pMood`), README.

16. "lime: a peasant with damp at the head loses breath at half the water rate and dies of `damp` at 600 ticks if held
    there; damp at the chest makes them cough and nothing else; out of it, the breath comes back".
17. "lime: miners in a gallery flooded with damp all get out by the ladder" (the §5.2 scenario, seeds 1, 2 and 4: 12 of
    12, nobody below breath 200), "and the mine is foul, not flooded, and opens again when it clears".
18. "lime: routes and damp". A **5-deep** spill across the street: routes cross it and everybody who crosses coughs and
    keeps their breath. An **8-deep** pool: no route goes into it, a peasant dropped in walks out by the nearest ladder,
    and somebody at its rim turns round and says so. harness/stuck.js finds no stall in 6,000 ticks with the 5-deep
    spill across the street, nor with the 8-deep pool beside it.
19. "lime: slaking near a mason sparks CONCRETE; near a pail, 'it's getting WORSE', and then the brigade leaves a fire
    by quicklime alone; a pail at the feet of somebody on quicklime sets them alight in at least 1 of 8 seeds".
20. "lime: a plain village never sees it". Seeds 1, 3 and 7, 20,000 ticks, 272 wide: no cell of 55-58, no lime key,
    the same hash as at the parent commit. A save made mid-slake, with a peasant in damp, reloads to the same hash 600
    ticks later.
21. "lime: an old save loads". test/fixtures/valley-272.json replays to its hash.

After phase 3: `node harness/soak.js --seeds 1-6 --ticks 12000` must match harness/soak-baseline.txt exactly. A
`chaos`-style run with chalk and acid among the blobs, 6 seeds, `--fail-on-stuck`, must be free of invariant failures.
Its `damp` deaths are counted and reported, not capped.

Each phase ships alone. Phase 1 is a toy: chalk, fire, water, heat, and damp that sinks and clears. Phase 2 makes damp
matter. Phase 3 makes the peasants notice.

---

## 10. README additions (house voice)

After the materials paragraph (README.md:7-16):

> And chalk, under MORE with the rock: soft and white, and the start of something. Burn it past 580 (on a torch,
> properly; a coal fire only singes it) and it is quicklime, which looks like gravel somebody has left out in the frost
> and holds every degree the fire put into it. Wet it and it gives them back. A pail on a heap of it sizzles and is
> gone. The next few pails make it hotter, until the water lying on top is boiling and anything buried under it goes
> off, which the bucket brigade finds out. Drop enough of it in a pond and the pond boils, and ends up a good deal lower than it was.
> What comes off chalk when it burns is chokedamp, a gas heavier than air. It goes up hot, comes down cold, pours into
> the low places like slow water, and lies there. It puts out any fire it touches, and in a hole deep enough to be over
> somebody's head it is the one gas they cannot breathe. Up to the chest it only makes them cough. In the open it thins
> away, and down a mine it takes a minute or two. Nobody goes down while it is there. Slaked lime left in it drinks it
> and sets back into chalk, sweating out the water it took, and the heat books come out where they went in. Acid fizzes
> chalk into chokedamp, stops dead at slaked lime, and on quicklime it spits out a grain of salt at white heat.

In the heat paragraph, after "Only burning things, bangs, lightning, torches and the HEAT brush add any.":

> (Quicklime does not add any either. It is only a fire's heat, put by for later.)

Things to try:

- Burn some chalk on two torches, let it cool, and drop all of it in the pond
- Pour acid on a chalk cliff above a campfire in a hollow
- Bury a little gunpowder in a heap of quicklime, and hand the village some buckets
- Pour chokedamp down a mine. Then pour slaked lime after it
- Drop quicklime into a pot that is already boiling

Under Files: `lime.js  chalk, lime and chokedamp: the cycle, and what the village makes of it`.

---

## 11. The first five minutes

How a player who has never read this gets from a new brush to the first death, with nothing but the picker, the
readout and the tip.

1. **0:00. MORE, and something new under FROM THE ROCK.** CHALK paints like stone. The readout says `CHALK 20°`. The
   tip line, sooner or later, says to burn it on a torch.
2. **0:15. Acid, because that is what you do to a rock.** It fizzes, and nothing seems to come off. Hover over the
   hollow beneath and the readout says `CHOKEDAMP  heavy: it lies in the low places`. Look closer and the hollow has a
   faint olive surface you can see the sky through.
3. **0:40. The campfire in that hollow goes out**, a flame at a time, from the bottom up. CHOKEDAMP pops. The ducks
   that were paddling there get up and leave. A peasant at the rim says the air's wrong down there and walks off.
4. **1:30. Fire on chalk.** A bonfire does nothing: `CHALK 427°`, and no "burning". Torches do it: the block goes white
   and gritty from the edges in, `QUICKLIME 290°  thirsty`, and a wisp goes up off it.
5. **3:00. Water on it**, because the readout said thirsty. It sizzles and turns cream (`SLAKED LIME 450°`), and the
   air over it shimmers. Forty cells of it tipped into a pond boil the pond. IT WENT WARM pops. A peasant nearby says who
   heated the pond, and a mason has an idea.
6. **4:00. The first death.** Damp is in a hollow now, and peasants are the other thing you throw. One dropped into
   head-deep damp in a hole with no ladder gasps "UP. go UP", finds no way, and lasts ten seconds. The feed has it:
   "{n} breathed the bottom of the hole". Dropped where there is a ladder, they climb out coughing, and the player
   learns the other half of the rule.

The player does not have to look for any of this. Acid and throwing peasants are the two things everybody does in the
first minute anyway.

---

## 12. The moments

- **The ducks know first.** A thin layer in the dip by the pond, chest-deep to a peasant. The ducks leave. A peasant
  walks through it, coughing, and is fine.
- **The brigade.** A hut burns, with a heap of quicklime by the wall and a keg's worth of powder that somebody buried
  in it. The first pail lands on the lime and vanishes with a hiss. "it's getting WORSE." The third sets the powder off.
  By the fifth the water is lying on a cream crust at 450 and coming off it in puffs of steam, and whoever was standing
  on the lime is on fire too. The next time anything burns near quicklime, the brigade stands back with full pails:
  "not with water. NOT with water."
- **The pond that boils.** Forty cells of cold quicklime, out of the kiln a while ago, dropped into the pond. They sink
  white and come up cream on the bottom. The pond hisses, steam stands over it, and when it clears the pond is a third
  of what it was, and warm. The swimmers stay in longer.
- **The mine.** Damp poured down a shaft fills the gallery. The miners gasp, drop their picks and go up the ladder in
  a line, and all of them make it. "the mine is full of chokedamp. nobody is going down there till it clears." At the
  top somebody looks down the shaft and says the air's wrong down there. A minute and a half later it is fit to breathe,
  and they go back to work.
- **Lime against damp.** Slaked lime poured down the foul shaft falls through the damp without setting and lands in a
  heap. The damp is pushed up out of the top, and the heap grows a crust of chalk beaded with water. The mine clears in
  half the time.
- **Lime against acid.** A dyke of slaked lime stops an acid flood, cell for cell, and dissolves into a moat of barely
  warm brine. Acid on quicklime spits out white-hot salt and a hot fume instead, and the shed beside it catches.
- **The kiln's weather.** A big burn on the hill sends its damp up hot. It hangs under the sky, cools, and comes down
  over the village a few cells at a time, a tide that reaches nobody's head. The ducks take off.
- **Full circle.** Slaked lime set in a damp pit is a lump of chalk, beaded with water. Burn it again. FULL CIRCLE says
  "not a degree lost", and the books say the same.
- **The kettle.** A grain of quicklime dropped in a pot already boiling flicks cream and back to white as it slakes and
  dries again, and the pot boils a little faster. The fire under the pot is paying for all of it.

---

## 13. Risks

| risk | why | what is done about it |
|---|---|---|
| The books leak | five hand-kept reactions and a new wait line | test 2 sums Q round the circle; every reaction is "sum, write the by-product, give the rest"; no `sandSet` in lime.js |
| A heat bomb | lime turned to air by the recount is 5,000° air | every exit is `heatVanish` or a reaction kept by hand (§4.1); test 15 |
| A flip-flop | dry, then slake the steam, then dry | no steam reaction; drying is the store + 1,400 (margin 430 without banked heat); boiling water only once (tests 4, 5) |
| Lime is now a weapon | the store is 2.5 times v2's | it still cannot light wood two down (247 of 300); the bang needs powder buried in it; it comes only out of a kiln |
| The wait line changes master | it is in heatStep's change branch | no master material reaches it (§0); the valley and wonders tests hold on the prototype |
| Damp kills too many | a toy turns into a massacre | the half-rate breath, the route out (32 of 32, v2), the rim, the foul mine; the soak reports deaths |
| Damp strands the village | a hazard at the chest blocked v2's errands | the hazard is the head row only, the same cell the breath reads (§5.2); test 18 and stuck.js with 5-deep and 8-deep damp |
| "My chalk will not burn" | the room rule, and coal reaches 580 only where it touches | the seep through porous rock; the readouts; the tip and the README say "on a torch" |
| The kiln is slower | the store went up | 53-55 of 55 by 5,000 on two torches, where v2's store had 52-54 by 3,000. The readout's "burning N%" shows it going |
| The brigade leaves a house to burn | `g.limeWise` | only for a fire with quicklime within 6, and only after the village has been burnt by it once |

---

## 14. Considered, and left out

- **Slaked lime + sand → wet concrete.** MORTAR has no phase worth, so two cells of it would come out at about 300°.
  The honest mortar is the one that is in: lime setting in the damp.
- **Gathering slaked lime for the great works.** v2 had it: 16 cells saved the kiln 2 stone and 2 coal. It touched
  leftovers.js and the haul for a difference nobody would see. Cut.
- **Slaked lime as a paste that stands up and does not slide.** Tried, to tell the powders apart by how they heap. In
  the pond the grains buried each other, and 17 to 21 of 40 slaked against 39 to 40. Colour, grit and readout do it
  instead.
- **No wick at all.** Tried: a sunk heap's floor layer stays white under its own crust (20 of 40 slaked). Two cells,
  drawn wet, is the least that works.
- **Chalk beds in the rock, firedamp from coal.** Either changes `sandLandscape` (world.js:1339), and with it every
  master hash. The rock is the plain village's. Chalk is the player's.
- **QUICKLIME in the picker** (painted heat, §2). **Quicklime drinking steam** (real, and it was the loop, §3.3).
- **A store above 2,000.** At 2,400 the pond of forty boils 17 to 20 cells, the kiln slows again, and acid salt passes
  2,000°. 2,000 is enough for every moment in §4.2.
- **A furnace at the foot of the shaft to draw the damp out.** It made things worse (v2, §5.3).
- **Damp dissolving into water**: every pond would be a damp sink. **Slaking swelling to two cells**: it breaks the
  cell-for-cell circle, and a heap that grows is a heap that buries the village.
- **Ducks as canaries carried down the mine.** Delightful, but it needs a new task with a held duck. Kept as a note.

---

## 15. Review history

- v1: 8 / 7.5 / 7.5. The grounding held. The temperatures did not: the puff's cost was left out. The heat showcase was
  unprobed, and the probes showed it false. Lime set in mid-air. The escape was a direction, not a route. Damp under a
  roof lingered with no bound. A kiln sum was out by a factor of two.
- v2: 8.5 / 8.5 / 7.5. About 40 citations and the heat sums held. The lime half was muted by its own measurements;
  the bound left out the water's banked heat; chest-deep damp blocked every route; `NAV_DAMPOK` was misdescribed; the
  powders were hard to tell apart and the wick drank with no visible cause. v3 answers each at the top, with a new
  prototype's numbers, and says in §2 where it disagrees (the FROM THE ROCK label, slaked lime as bookkeeping).
