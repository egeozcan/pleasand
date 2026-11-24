# Pond life: a plan (v3)

Not built (yet). Evaluation history:

| version | consistency | design | entertainment | average |
|---|---|---|---|---|
| v1 | 7.5 | 7 | 7.5 | 7.33 |
| v2 | 7.5 | 7.5 | 8 | 7.67 |

This file is v3, written after the last review and not scored yet. Target was an 8.5 average.

*There have always been fish in the pond, somewhere. Now you can see them, and so can the ducks.*

Status: v3 (reviews: v2 7.5 / 7.5 / 8). What changed since v2, after its review:

- **A fish is LIQUID, not SOLID** (§2). It is water to every reader there is. A floating dead fish is not ground to
  `navStand`/`pFoot`, it holds up no board (`bSupported`), no duck stands on it, and `bFinished` waits for one in a plan
  cell as it waits for water. No SOLID reader ever meets a fish. A builder shoos one out of a footing (§3.3).
- **The weed brush plants only into WATER**, by `heatBecome` (§2.4). Weed with no water among its 8 neighbours dies
  back, so a daub thins to stalks and nothing green hangs in the air for anybody to swim in (§3.1, rules 2 and 5).
- **The top row is water every turn**, not only at growth: weed with air over it becomes water, or a bush if it is
  high and dry (rule 1). **Silt goes through**: whatever sinks onto a frond smothers it and sinks on (rule 3, §0).
- **A root is on the bed**: SOLID, not ICE, not moved this tick. A fish or a sinking grain under a leaning frond does
  not make it an uneatable root (§3.1).
- **The count and the census are out of the fish** (§4.5, §5.6): `g.pnN` rolls over at the end of `sandStep`, and the
  census counts its own boxes from `ideasStep`, so "{name} is gone" fires when the last fish anywhere dies.
- **No fish is posted from a fire** (a HOT cell within 2), and `pnZap` is passed `n` (§4.3, §5.2).
- **The lone fish is told straight**: mostly a story the player starts (§5.6). **The baths, corrected**: the brigade
  fills them, the stoker keeps them at 33-40, and a bath fish poaches at 38 (§5.3).
- **Citations fixed**: the stamp check is world.js:1225; INERT's no-heat heat.js:87; the glints `#c8d4e0`, `#8aa0b8`,
  `#f0a040` (ideas.js:1488, leftovers.js:1055); `mCryptWater` counts WET only (monuments.js:739) and stays so;
  `iTaskBucket` ideas.js:879 (its `iScoop` :895); test/picker.js `NEW` :25, the fit check :35; `heatStep` world.js:1243.
- **Cut**: the die-off ring and its news. `sandStatic` is no longer touched.

Two new things to paint. POND WEED grows up off the bed of a pond towards the light. FISH swim in the water, eat the
weed, and breed when they are fed and have room. They die when they are not fed, or are too hot, frozen in, salted,
oiled or struck. Between them a pond keeps itself, and the ducks take a share of both and carry them to other water.
The jetty catches real fish, and the little ones go back. The fire brigade scoops up a fish with the water and throws
it at a burning house. Whoever passes a fish flapping on the bank throws it back in. Nothing starts on its own: a
valley that nobody paints a frond or a fish into goes exactly as it did.

---

## 0. What we are working with (measured)

Probed headless at master `b07c9b4` (`test/sim.js` and scratch scripts; nothing in the repo).

| seed, width | water cells at tick 0 | columns with water | deepest column | ducks | jetties at 6000 |
|---|---|---|---|---|---|
| 1, 272 | 249 | 43 | 9 | 3 | 0 |
| 3, 272 | 66 | 16 | 6 | 1 | 0 |
| 7, 272 | 293 | 47 | 9 | 3 | 1 |
| 7, 1088 | 66 | 16 | 6 | 1 | 0 |

- **One pond to a valley at the start**, 66 to 293 cells, 6 to 10 deep, all within 16 rows of the light. So the
  ducks' carrying (§5.5) needs a second body of water, and that is the player's.
- **The pond the village digs.** `iPondPlot` (ideas.js:1175) digs a bowl `I_POND_W` 13 wide and at most `I_POND_D` 3
  deep (ideas.js:80-81). Seed 7's, built by the test's `pondBy` (test/run.js:1749) and filled, is 20 cells: 11 in the
  top row, 7 in the second, 2 columns 3 deep. Left to itself, that village dug it by tick 5,220 and **never had more
  than 5 cells of water in it** in the next 25,000. Seeds 1 and 3 planned no pond in 40,000 ticks.
- **Things get into ponds.** Cells other than water or stone with water directly over them, at ticks 0 / 6,000 /
  20,000: seed 1 43 / 42 / 42, seed 7 47 / 46 / 46, seed 3 **6 / 13 / 14**. Sand went into seed 3's pond, and by
  20,000 it had lost 11 cells of water and had a bush and a log lying over it. Weed has to let that through.
- **No SEED is ever under water and no STEAM exists** in a plain village by 6000, but duck raids do make SEED
  (`iRaided`, ideas.js:835). So the weed cannot come from a sunk seed.
- **A cell of water holds 488 to 872 of heat at 20°** (`heatH0(WATER)` = 40 + 640·`heatF(sh)`, heat.js:211-217).
  Turned into air behind the books' back, the probe's cell came out at **996°**. That is the central hazard of anything
  made of water, and the reason both new things are booked as water (§2.1).
- **A cell that does nothing costs** 13.5 ns a call. A whole `sandStep` at 272 is 1.03 ms; 3.62 ms a tick at 1088.
- **The rules, modelled** (a scratch cell model of §3.1 and §4.1: no heat, 3 ducks dabbling at `dSwim`'s rate, 40,000
  ticks, several dice seeds each):

  | pond, start | rates | live fish (after 4000) | fronds standing | fish starved |
  |---|---|---|---|---|
  | seed 7 lake, bed all roots, 6 fish | v1 (sprout .006, no crowding) | 9-19 | avg 5, min **0** | 4-7 |
  | seed 7 lake, 6 fish, 5 runs | v2/v3 | min 9-12, max 28-32 | avg 30-33, min 18-23 | 0 |
  | seed 7 lake, a pair only, 3 runs | v2/v3 | grows to 11-25 | avg 31-41 | 0 |
  | dug pond, a pair, 5 runs | v2/v3 | **1 lives on in 3 runs; 0 in 2** | 0-1 | 1-2 |

  v3's new rules act on a falling level, on grains and on daubs, and the model has none of those (a steady level, no
  silt, roots one deep). So its numbers stand. Phase 1 replaces it with the real thing.
- Fishing today is dice (`iCatch`, ideas.js:1474; `lUnderwater`, leftovers.js:1042). No fish is a cell.

## 1. The hooks

There is no new idea. Fishing (`fish`), buckets (`bucket`), black powder (`powder`) and the ducks are the hooks. A
village that knows none of them still watches its pond live and die.

## 2. The two materials

| | POND WEED (55) | FISH (56) |
|---|---|---|
| palette | MORE, new group "IN THE POND" | MORE, "IN THE POND" |
| brush | planted into WATER only (§2.4) | poured (`SAND_POUR` .03, as SEED) into air (game.js:440). Over a pond, it lands and is pulled under |
| `SAND_DENS` / `FREE` | 9 / 0: nothing displaces it (`sandCan`, world.js:296-301, wants `FREE` 1) | 2 / 1: water's weight, so water never floats past it (`sandFloat`, :927-934). Brine, acid, lava sink through it; oil rises past it; a bang throws it (:551); sand sits on it (neither is FLUID) |
| flags | `LIQUID`, `CONDUCTS`. Not `FLUID`, `WET`, `SOLID` | `LIQUID`. Not `FLUID`, `WET`, `SOLID`, `CONDUCTS` |
| heat | `def(WEED, 4.0, 0.25)`; `HEAT_HS`/`HEAT_HLAT` = water's (heat.js:195-207); `lo(WEED, 0, 640)`, `hi(WEED, 100, 1200)` | `def(FISH, 4.0, 0.2)`, the same `HS`/`HLAT`, `lo`, `hi` |
| `heatUp` / `heatDown` | STEAM / ICE (aux 0: thaws to plain water) | STEAM / ICE with `aux` 1 and `sh \|= 128` (dead, in the ice). `case MAT.ICE` (heat.js:305) is split: `aux === 1` -> FISH, else WATER |
| state | `aux`: cells this frond has left to grow (0: a root, or a frond's end) | `sh` bit 7 dead; bit 6 cooked (dead) or a fry (alive); bits 0-5 colour and latent jitter. `aux` bits 0-5 hunger (alive) or rot (dead); bit 6 facing right |
| `MAT_UP`/`MAT_DOWN` (game.js:465-469) | "boiling" / "freezing" | "boiling" / "freezing" |

**Why FISH is LIQUID.** A fish is a cell of water that swims, and LIQUID is what the code means by "water, to stand,
build and walk by". The 98 `LIQUID[` readers were audited in v2 (§3.3), and each is right for a fish too. Peasants
swim through a shoal, nobody builds on a fish, a duck landing on a floating dead one is swimming, and one on the sand
is what a one-cell puddle is to everybody. SOLID would have put a fish in front of thirty-odd readers that mean
"ground" (`pSolid` to `pStiff`, peasants.js:226-255; `bSupported`, build.js:226; `dSolid`, ducks.js:149), all of
them wrong for it. So `sandStep` sends a fish to `sandLiquid` (world.js:1232), which it leaves on the first line,
before any falling or spreading. It never flows.

**Why both are paintable.** The weed is the root of everything else. Without fronds nothing in the pond eats, and
nothing in the valley makes weed. A weed bed is a real sandbox act, an aquarium, quite unlike PLANT, which grows into
air. FISH is the creature itself, a cell and not a bag of numbers like a duck (ducks.js:1-13), so heat, bangs,
buckets, drains, lightning and acid all act on it for free. Neither fits FROM THE ROCK or BUILDING, so `MORE_GROUPS`
(game.js:564) gains `["pond", "IN THE POND"]`. The flyout grows by `MORE_GAP` 3 + `MORE_HEAD` 9 + 2 × `ROWH` 10 = 32
px. `MORE_TOP` (game.js:576) goes from 230 to 198, well inside `MORE_TOP > PLAY_Y` (test/picker.js:35). The full main
panel is not touched. The PICK entries go **after TRESTLE** (world.js:121), so every brush keeps its place (if
another MORE brush lands first, they go after that one, and the 32 px is counted from wherever `MORE_TOP` is then).
test/picker.js's `NEW` (:25) gains "POND WEED", "FISH", and the MORE hover text (game.js:1346) gains them and TRESTLE,
which it forgot.

### 2.1 Why both are booked as water

Every way a weed cell or a fish comes or goes is a trade with a cell of water at the same temperature, by `heatBecome`
(heat.js:244), which keeps Q:

| change | how | heat |
|---|---|---|
| weed planted (brush), a frond grows | WATER -> WEED | exact (same C, same phase worth) |
| a frond eaten, salted, cut off, buried, smothered, surfaced, eaten by acid | WEED -> WATER | exact |
| a fry is born | WATER -> FISH | exact |
| a fish caught, dabbed up, rotted, eaten by acid | FISH -> WATER | exact (on dry land too: a drop of water) |
| freezes / thaws | -> ICE / ICE -> WATER or FISH | water's 640, both ways |
| boils | -> STEAM | water's 1200 |

A pond full of life neither makes nor loses heat, and keeps its volume. The fish's C is 4.0 for exactly this: at 3.5,
each trade would move T 14% further from 20°.

### 2.2 The two exceptions

- **Weed high and dry** (air over it, no water or fish among its 8 neighbours: a drained bed, a spoil heap) becomes
  PLANT by `sandSet` (world.js:336-340), which drops the latent phase worth first: its documented loss ("a stalk
  growing up through a pond... as down a drain, or drunk by a plant"). It comes out at 36°, not 1000.
- **A fish eaten off the bank** leaves the world by `heatVanish` (heat.js:501-506): air at the fish's temperature, its
  phase worth gone with it, as water down a DRAIN. Never `heatVacate` (heat.js:500), which in a plain village recounts
  the cell as 996° air.

### 2.3 Positional arrays

`SAND_DENS`, `SAND_FREE` and `SAND_POUR` stop at index 52 (world.js:133-144). They are padded for LINEN and TRESTLE
with 9 / 0 / 0, which changes nothing (`undefined` already fails every comparison they meet), then given 55 and 56.
`SAND_SHADES` (world.js:146-213) gets two rows. `NMAT` stays 64, with 7 ids left. `CLONER` learns neither
(`t < MAT.PLANK`, world.js:1183): a fish factory with no food behind it is a valley of corpses.

### 2.4 The brush

In `sandDab` (game.js:427-441), before `if (!pour)` at :436:
`if (v === MAT.WEED) { if (g.m[j] === MAT.WATER) heatBecome(g, j, v); continue; }`

Weed is planted into the water that is there, as that water, at its temperature. Over sand, stone, brine, air, or
weed already there, nothing happens. So a held brush never reshuffles a bed, the bed's sand is never painted over, and
no lump hangs in the air. It is the only brush that uses `heatBecome` rather than `sandPlace`, because it is the only
one that adds nothing to the world. A daub then settles in a few hundred ticks. Its top row goes back to water (rule
1), its middle dies back from inside (rule 5), and a daub that does not reach the bed loses its stem and goes (rule
6). What is left is roots on the bed with stalks standing on them.

FISH is poured like SEED. The pour branch (game.js:440) masks the random shade, `if (v === MAT.FISH) g.sh[j] &= 63`
(a live grown fish): arithmetic, no dice.

## 3. Weed

### 3.1 How it lives

`sandLiquid` (world.js:987) gets one line before its SALTWATER branch (:990):
`if (v === MAT.WEED) { pnWeed(g, i, x, y); return; } if (v === MAT.FISH) { pnFish(g, i, x, y); return; }`, returning
before any fall, spread or `sandPressureCandidate` (:1062). `pnWeed` (pond.js) acts only when
`((g.tick + i) & 15) === 0`; every other tick it is a comparison and a return. On its turn the first rule that
applies wins:

| # | condition | result | p |
|---|---|---|---|
| 1 | the cell above is AIRY, and WATER or FISH among its 8 neighbours | `heatBecome(i, WATER)`: the surface has come down to it | 1 |
| 2 | the cell above is AIRY, and no WATER or FISH among its 8: high and dry | `sandSet(i, PLANT)` (§2.2): a bush | 1 |
| 3 | smothered: the cell above is none of AIRY, WATER, WEED, FISH, OIL, ICE (a grain, a lump, lava, wet concrete) | `heatBecome(i, WATER)`, and what lay on it sinks on | 1 |
| 4 | a SALTWATER 4-neighbour | `heatBecome(i, WATER)` | .1 |
| 5 | buried: no WATER or FISH among its 8 (inside a daub) | `heatBecome(i, WATER)` | .25 |
| 6 | cut off: not a root, no WEED below or diagonally below (its stem was eaten) | `heatBecome(i, WATER)` | .1 |
| - | light: scan up through WATER, WEED, FISH, `W_LIGHT` 16 at most | AIRY first: lit. ICE, OIL, ASH, a plank lying on the water, anything else: dark (it lives, but does not grow). A jetty deck with air under it does not darken it | - |
| - | warmth | below 2 or above 40, no growth; 25 to 38, twice as fast (`W_BLOOM`) | - |
| 7 | a tip grows: `aux > 0`, lit; the target (up 60%, up-left or up-right 20% each) is WATER, with WATER over it, and with at most 2 WEED among its 8 neighbours, this one included | `heatBecome(j, WEED)`, `aux[j] = aux[i] - 1`, `aux[i] = 0` | .2 (.4 warm) |
| 8 | a root sprouts: `aux == 0`, a root, WATER above, lit | `aux[i] = 3 + irnd(6)`: a frond 3 to 8 tall | .04 |
| 9 | a root creeps: `aux == 0`, a root; the side `irnd(2)` picks is WATER with a bed under it and water over it, lit | `heatBecome(j, WEED)` | .004 |

**A root** is a weed cell on the bed: the cell under it is SOLID, not ICE, and was not moved this tick
(`g.stamp[i + gw] !== g.tick`; rows run bottom to top, so a grain that sank in under it this tick is stamped). A fish
is not SOLID, and no grain rests on a frond for more than a turn (rule 3). So a leaning frond with a fish or a sinking
grain under it is still a frond, and still food.

So a bed spreads along the floor of a pond as far as the light reaches, and stands in fronds, never a block (the
touch rule, rule 5), up to one row under the surface. Rules 1 and 7 keep **the top row of every pond water, every
turn**, so the ducks, the bob, the buckets and every reader of a pond's top (§3.3) see water there. When the level
drops, a frond tip is in the top row for 16 ticks at most. A pond scooped down three rows loses three rows of
fronds. A pond drained dry leaves its roots as a row of bushes, which are food (`P_FOOD[PLANT]`, peasants.js:1784). A
frond grazed through at the stem lets its top go, and a root sprouts again only under water, so a grazed pond grows
back from the bottom. Sand that falls into a weedy pond rests on a frond, which dies under it within 16 ticks. The
sand goes on to the bed, and a root beside it creeps out over the new floor, so the weed of a silting pond rides up
on the silt.

### 3.2 What happens to it

| actor | condition | result | where |
|---|---|---|---|
| a fish | adjacent, hunger ≥ 8, **not a root** | `heatBecome(j, WATER)`, hunger −16 | `pnFish`, p .3 |
| a duck | at a dab's start, the first frond 1-5 below its feet, not a root | `heatBecome(j, WATER)`, `d.weedy = g.tick` | ducks.js:473 -> `pnDabble`, p .6 |
| acid | a 4-neighbour | `heatBecome(j, WATER)`, not EMPTY (the 996°); acid used up 30% as usual | world.js:1036-1052, p .04 |
| a bang | never thrown (FREE 0) | STEAM by `heatForce`, as water | world.js:558: `t === WATER \|\| t === WEED \|\| t === FISH` |
| lightning | radius 4 | +2600 (world.js:680), boils on the books. Further off, the flood runs through it | world.js:676-692, unchanged |
| a drain | a neighbour | `heatVanish` | world.js:1199-1209, unchanged |
| a builder | a great work's plan cell | `heatBecome(e.i, WATER)`, then shoved as water | build.js `bPlace` (§3.3) |

Fish and ducks never eat roots. Only brine, heat, frost, acid, a drain, a bang, silt or a dry bed kill one. That is
what keeps a grazed pond from crashing the first time the fish outnumber the weed. Weed does not spread from pond to
pond by itself, is not food, is not dug, swept or chopped (not `P_FOOD`, `B_DIG`, `P_LEAF`, `TD_LITTER`), and is not
scooped (not `WET`; `iDrinkable`, ideas.js:1001). Each of those would empty a weed cell without the books.

### 3.3 The audit: every path that meets a weed cell or a fish

Grepped: all 98 `LIQUID[` readers, all `WET[` readers, `CONDUCTS`, the drain, acid, bang and bolt, every `sandSwap`
caller that is not a cell's own step, and every place a village file empties a cell (`heatVacate`, `heatVanish`,
`= MAT.EMPTY`). Neither is SOLID, so no SOLID reader meets either.

| path | weed | fish | change |
|---|---|---|---|
| `sandBubble` (world.js:765-777) swaps any `LIQUID` over a rising bubble | would shuffle fronds | moved down a cell: harmless | `&& m[j] !== MAT.WEED` at :768 and :774 (the cell it would swap; weed overhead still counts as liquid, so a bubble goes round on the slant) |
| pressure re-check (world.js:1240) | never a candidate | a dead fish can float into a surface cell picked this tick | `&& v !== MAT.WEED && v !== MAT.FISH` |
| `sandPressure`'s walk (:910-920), `sandFlows` (:842-847), `sandCan`, `sandFloat` | a wall to water | a gap in it; water never displaces it (equal weight) | none. Fronds are lace and the top row is water, so a pond levels across the top |
| mine drain, `bDig` (build.js:873): `e.drain && LIQUID[c]` -> `mSpoil` (mines.js:403, swaps it onto the heap), else `heatVacate` | carried up, dries into a bush | carried up, flops, thrown back (§5.2) | `if (!mSpoil(...)) (c === MAT.WEED \|\| c === MAT.FISH ? heatVanish : heatVacate)(g, e.i)`. (Water there makes 996° air today, deliberately: `heatTaken` is gated on `g.wAny`, heat.js:488-499. Not touched) |
| `bFree` (build.js:205-219): a great work's stone goes in where WET is (`e.wet`, :218) | would wait for ever (`bFinished` waits on LIQUID) | the same | `e.wet && (WET[c] \|\| c === MAT.WEED \|\| c === MAT.FISH)` |
| `bPlace` (build.js:840) shoves WET out of the way (:844) | not WET | not WET | before :844: weed, `heatBecome(e.i, WATER)`. A fish, `pnShoo`: `heatSync` both, `sandSwap` it with a WATER 4-neighbour, as `bShove` moves water. With none, `e.wait = g.tick + 300`, as a shut-in pocket of water gets |
| `bFinished` (build.js:263-269) | LIQUID: waited for | LIQUID: waited for | none. Nothing is declared done with a fish-shaped hole in it |
| `hMouldSweep` (heavens.js:1140): non-AIRY, non-WET in a mould -> `hBail` onto air | lifted out, dries into a bush | lifted out, flops, thrown back | none |
| acid (world.js:1036-1052) empties what it eats | in no list | in no list | both at p .04, as `heatBecome(j, WATER)` |
| the bang (world.js:549-563): outer FREE cells thrown, water inside to STEAM, the catch-all FIRE | not thrown; would burn off its phase worth | the outer shell thrown (lands dead, §4.3); inside, would burn | :558 routes both to STEAM. (A nuke's `big && inner` at :549 empties water today; weed and fish share its fate) |
| DRAIN (:1199-1209) | `heatVanish` | `heatVanish` | none |
| `iScoop` (ideas.js:1062), `mScoopCrypt` (monuments.js:937), `pLift` (pleasures.js:373), the bailers (tidy.js:756-766) | none: all go by WET or `=== WATER` | only `iScoop`'s new `fishy` (§5.3) | §5.3 |
| peasants eating (peasants.js:2174), `heatVacate` | not P_FOOD | `c === MAT.FISH ? heatVanish : heatVacate` | §5.2 |

The village's other emptying calls go by material lists that hold neither: logs, ore, oil, ash, sand, snow, linen,
gold, metal, crops (mines.js:194/519, oil.js:195, tidy.js:993/1259-1263, heavens.js:537/572/1133/1503,
leftovers.js:281/367/538/1166/1318, storeys.js:261/297, pleasures.js:230/1617).

**Readers of WET.** Neither is WET, on purpose. Being WET means a bucket takes it, a fire hisses out against it
(world.js:740), an ember beside it turns to ash (:1134), lava flashes it (:996), the bolt starts a flood from it (:682).
Each would empty the cell behind the books or need the weed to be scoopable. What follows, each accepted:

- No hiss and no quench against either. Both are under water, which is WET. A fish thrown on a fire is a fish on a
  fire: it heats, cooks, holds at 100 while it soaks up 1200·f, and goes up as steam. Lava sinks past a fish and warms
  both by conduction, and they boil on the books.
- Readers of a pond's top (`iSurface` :1462, `iScoopAt` :1007, `iFindWater` :1023, `dTakeOff` ducks.js:199, the bomb's
  splash leftovers.js:407/428, `lUnderwater` :1042, the lighthouse's lake heavens.js:677-701). The top row is water
  (rule 1), and live fish are pulled under (§4.1). A dead fish floating there is the exception: `iSurface` looks past
  it (`if (c === MAT.FISH) continue`), and the rest skip that column, as they would a floating plank.
- `wBathNeed` (pleasures.js:125-128) counts "not WET and not ICE" as wanting water, and the brigade tops up a bath more
  than 3 short (pleasures.js:154). It counts WEED and FISH as water, or a bath with four fronds would be topped up for
  ever. `mCryptWater` (monuments.js:737-741) counts WET only and stays so: it is what the crypt's bailers bail, and
  counting a fish would set them bailing a cell they cannot lift.

**Lightning.** `CONDUCTS[WEED] = 1` (world.js:699-700): the flood runs on through a weed bed. FISH does not conduct;
it is killed beside the flood (§4.3).

**Readers that ask "can I build, stand or walk here"** (mines.js:385/451/712, build.js:208/528/626,
heavens.js:143/432/1727, ideas.js:819/1218/1619/1773/2003, oil.js:381/430, platforms.js:82, storeys.js:157/168/731,
wonders.js:560/601/614, tidy.js:482-551/1386, pleasures.js:528/1282/1289, monuments.js:648/964): both are water to all
of them, and so to swimming, wading and drowning (peasants.js:673/738/830/902/1172/1256, ducks.js:465-534).

Test 3 (§9) is the net: a sealed box of all of it, and no air cell over 400° that no fire is near.

## 4. Fish

### 4.1 One fish, one tick

`pnFish(g, i, x, y)` (pond.js), from `sandLiquid`'s first line. Its phase is its own shade, which travels with it in
`sandSwap` (world.js:316-330): `ph = g.tick + g.sh[i]`. A cell moved this tick is not visited again (world.js:1225).

**Every tick, live or dead:**

| condition | result |
|---|---|
| live | `g.pnC = (g.pnC \|\| 0) + 1` (§4.5) |
| the cell below is one `sandCan(g, FISH, j)` lets it into (air, steam, smoke, oil) | `sandFall` (world.js:350), gaining speed as a grain does. A fish dropped on an oil slick sinks through it |
| **live**, AIRY above, WATER below (or diagonally below) | `sandSwap` down: pulled under (`g.fx.splash++` if it fell). Live fish swim below the surface unless the water is one deep |

**Live, every 8 ticks** (`ph & 7 == 0`):

| condition | result |
|---|---|
| T > `F_HOT` 38 | dies (bit 7); cooked (bit 6) if T > 60 |
| a SALTWATER / OIL neighbour | dies, p .05 / .02 |
| no WATER or WEED neighbour: out of the water | flops: p .3 a hop into an EMPTY cell beside or above; p .013 dies (about ten seconds). With no HOT cell within 2 (a 5 × 5 read), posts itself into `g.pnOut` (§5.2) |
| T < 2, or it has begun to freeze (`lat < 0`) | sluggish: swims only on these turns, and down if it can, away from the lid |

**Live, swimming** (grown `ph & 1 == 0`, fry `ph & 3 == 0`, in water):

| condition | result |
|---|---|
| always | into the WATER ahead: 80% level, 10% up, 10% down, never into a cell with air over it. Blocked, turns (p .5); turns on its own at p .01; beside a grown fish, takes its heading (p .1), so they go about in little shoals |
| hungry (≥ 8), a frond beside it, not a root | eats it, p .3 |
| hungry, none in reach | looks 4 ahead on its row and the row below; none, heads down a row, p .05 |
| T > 30, the WATER below cooler | goes down: a warmed pond's fish crowd the bottom |

**Live, every 64 ticks** (`ph & 63 == 0`):

| condition | result |
|---|---|
| always | hunger +1. At 63 (about 4,000 ticks without a bite): dies, p .05 a turn |
| a fry, hunger < 8 | grows up (bit 6 off), p .03: about 2,100 ticks well fed |
| grown, hunger < 6, another grown fish within 2, **no more than `F_CROWD` 2 other live fish within 4**, a WATER neighbour, `(g.pnN \|\| 0) < F_MAX` 400 | a fry, p .04: `heatBecome(j, FISH)`, `sh[j] = (sh[j] & 63) \| 64` (the water's own colour bits, so its phase worth is untouched), facing at random. Parent's hunger +12 |

The crowding rule holds a lake at about one fish to ten cells while the weed stands (§0). Without it they breed until
the fronds are grazed to nothing. Its 9 × 9 count is 80 reads every 64 ticks, for a well-fed grown fish only.

**Dead** (rolls only on `ph & 3 == 0`): WATER above, floats up (p .5). At the surface, belly up, drifts (p .25) into a
WATER cell beside it with air over it: a 40-wide lake's middle reaches a bank in a few thousand ticks, and some wash
up before they rot. Over 60, cooked. Every 64 ticks the rot clock goes up; at 63, about 4,000 ticks,
`heatBecome(i, WATER)`. In the pond the water closes over it, and on the sand it is a drop of water that runs off.

### 4.2 What survives a throw

Debris keeps a cell's material, heat and shade and lands with `aux = 0` (world.js:494). That is why a fish's life is
in its shade: a dead fish thrown by a bang lands dead, a cooked one cooked, a fry a fry, and only hunger and heading
reset. Bits 0-5 of `sh` are never touched once it exists: they set `heatF`, and changing them would move T by up to
96° to keep Q. Bits 6 and 7 are free (`heatF` reads `sh & 63`, heat.js:208).

### 4.3 What else acts on a fish

| actor | result | where |
|---|---|---|
| acid | eaten into water, p .04 | world.js:1036-1052 |
| a bang | outer shell thrown (:551-556); its +260 (:530) takes it past 38, so it lands dead, or cooked past 60. Inner: steam | world.js:530-563 |
| lightning | radius 4: +2600, boils off. In the flood, every live fish beside a marked cell dies: `pnZap(g, n)` at world.js:715, after `ducksZapMarked`, reads `g.zlist[0..n)` and their 4 neighbours while the marks are still set (cleared at :717). Only if `g.pnN > 0` | world.js:702-718 |
| a drain | `heatVanish` | world.js:1199-1209 |
| lava, brine, acid, sand | the first three sink through it; sand sits on it. A fish buried on dry land is out of the water | no change |
| a duck, dabbling | a **fry** or a **dead fish** under it or 1-5 below: eaten, `heatBecome(j, WATER)`, p .6 | `pnDabble` |

### 4.4 Heat, and the ice

A fish has water's capacity and water's 640 to freeze, so it sits at 0° while the cold draws that out, as the water
beside it does. Under a lid of ice the water is still water, and the fish in it are alive, sluggish and low. Only a
fish the freeze front reaches freezes: `heatDown` makes it ICE with `aux` 1 and `sh |= 128`. ICE's `aux` is 0
everywhere today (`heatDown` :330 and :345, `heatUp` :305, `sandPlace`, `sandSet`, `heatBecome`, `heatForce` and a
landing grain all write 0), so the flag is free. A bang or bolt that turns that ice to water by `heatForce` (the
bolt's ICE branch, world.js:687) takes the fish with it. When the lid thaws, the split `case MAT.ICE` makes it FISH,
dead, at 0°, and it floats. However hard the COOL brush holds the lid, the latent is the clamp.

### 4.5 The count

`g.pnN` is last tick's live count. At the end of `sandStep`, before `heatStep` (world.js:1243):
`if (g.pnC != null) { g.pnN = g.pnC; g.pnC = 0; }`. It runs whether any fish is left or not, so the count falls to 0
the tick after the last one dies. A fish swapped by something else before its turn (a bubble, sinking brine) is missed
for that tick. So `pnN` is used only where a miss does no harm: the `F_MAX` cap, and the gates on `pnZap`, the
swimmer's read and the tails. The census (§5.6) counts its own boxes.

## 5. The village

### 5.1 The jetty

`iCatch` (ideas.js:1474) keeps its first roll, its duck and its boot. Before the dice fish, it looks in a window 13
wide and 8 deep under the bob (104 reads, once a catch, no dice) for a live grown fish, else a fry, else a dead one.

- **A grown fish** comes out (`heatBecome(j, WATER)`), weighs `2 + (sh & 7)` pounds (the same fish always weighs the
  same), feeds as a caught fish does (−1400, or salted: `lSaltFish`, leftovers.js:694), and the jetty remembers
  `s.real = true`. "a fish!" (`P_SAY.fish`, ideas.js:143), or for a gold one `P_SAY.fishGold`: "a golden one", "make a
  wish".
- **Only a fry**: "too small. back you go" (`P_SAY.fishSmall`). The fry stays, and `iLand`'s glints (ideas.js:1498)
  go out and back.
- **A dead one**: hauled in and eaten; "it's already cooked!" (`P_SAY.cooked`, ideas.js:145) if bit 6 is set.
- **Nothing, and `s.real`**: "nothing's biting" (`P_SAY.nofish`, :147), no catch. A jetty that has had a real fish
  fishes what is really there from then on: fish a lake out and the jetty goes quiet. **No `s.real`**: the dice, as now.

"the fish are under the ice" (`P_SAY.frozen`, ideas.js:148), said when `iSurface` finds ICE, is now sometimes true.

### 5.2 A fish on the bank: put back, or eaten

**A live fish out of the water** posts itself every 8 ticks into `g.pnOut`, a ring of 4 `[x, y, t]` slots (`g.pnOI`
the next), unless a HOT cell is within 2: nobody walks into a fire for a fish. `iPick` (ideas.js:395), after the
eureka line, reads it. The nearest entry under 30 ticks old, within 40 columns and 12 rows of a walking peasant, with
nobody on `fishhelp` within 3 cells of it (a scan of tasks, as `iGoFish` does, ideas.js:1419-1429), gives them a
site-less task, `fishhelp`, run by `pnTask` from `iTask` (ideas.js:492) before `oTask`. They walk to within 3
(`iWalk`, ideas.js:521), and look again within 2, since it hops. Then:

- **Still alive.** Hungry (over `P_HUNGRY` 2500, peasants.js:29): they eat it, `heatVanish`, −1400, "sorry", "needs
  must". If not, they pick it up in a one-cell pail `[{m: FISH, sh, q: heatQ}]`, its cell emptied as `iScoop` empties
  water (ideas.js:1068-1070), and throw it (`iThrow`, :1075) at the nearest top of water within 40 (`iFindWater`,
  :1023). It flies as a grain of itself, lands on the water and is pulled under: "back you go", "off you swim", "mind
  how you go". With no water within 40, they eat it if peckish, and otherwise leave it ("nowhere to put it").
- **Dead by the time they get there**: they drop the task, and the food scan has it.

**A dead fish** is food the way a bush is. `P_FOOD[FISH] = 1` (peasants.js:1784), and `pEdible` (:1861) starts with
`if (pCell(g, x, y) === MAT.FISH) return pnEdible(g, x, y)`: dead, and either out of the water or at the surface with
a SOLID cell beside it or diagonally below (the bank, the shallows, a bath's side). That skips the "leave three of every
patch" rule (:1871), which no lone fish could pass. Nobody swims for one mid-lake. `pFoodTask` (:2033) and `hCutOff`
(heavens.js:1228) find them with no new list. The bite (peasants.js:2174) becomes
`c === MAT.FISH ? heatVanish(g, j) : heatVacate(g, j)`, −1400, with `P_SAY.fishEat`: "finders keepers", "it was like
this when i found it", and, cooked, "still warm". A dead fish within 3 counts towards a bush's patch, which is accepted.

`I_IDLE` (ideas.js:531) gets `fishhelp`, so the fire alarm drops it. `iMood` (ideas.js:2066) gets "is putting a fish
back" and "is going for a fish". The soak's task invariant allows site-less tasks (harness/soak.js:43). It is not in
`W_KINDS` or `P_WADE_ON`: nobody wades in for a fish.

### 5.3 The brigade's bucket

`iScoop(g, j0, fresh, fishy)` (ideas.js:1062) takes its cells as now. With `fishy`, for each cell taken, if a live
FISH is a 4-neighbour, then at p .2 (rolled only then) the fish goes in too: `{m: FISH, sh, q: heatQ}`, its cell
emptied as the water's is, taking one of `I_LOAD`'s 5 places (ideas.js:79). The brigade passes it (`iTaskBucket`,
ideas.js:879, scoop at :895: a fire, the wheat, a pond or the baths), and so does `pTaskFill` (pleasures.js:341: the
gardens' pool, the organ's tank). The concrete mixer (wonders.js:961) does not: no fish in the concrete.

- **At a fire.** The fish lands in the flames, where it posts nothing (§5.2). It flops, dies at 38, cooks at 60, and is
  mostly still there when the fire is out, where somebody says "still warm". The thrower says "there was a fish in
  that" (`P_SAY.fishPail`). The news, once a village: "{n} threw a fish at the fire". Achievement `fishpail`, FISH OUT
  OF WATER.
- **On the wheat.** It flops among the stalks, and `fishhelp` takes it to the nearest water.
- **Into a pond being filled** (`k.pond`, ideas.js:884): the village pond is stocked, and nobody meant to (§5.6).
- **Into the baths** (filled by the brigade, pleasures.js:154-155), which the stoker keeps at 33 to 40 (`P_BATH_LO`,
  `P_BATH_HI`, pleasures.js:34). The fish lives while the water is under 38, which is just where the weed likes it.
  The first time the stoker overdoes it, it is poached, floats against the side, and somebody eats it out of the bath.

### 5.4 A charge in the pond

`lUnderwater` (leftovers.js:1042) rolls its glints and feeds the bank exactly as now. Before that, every FISH in its
9 × 8 box (the same loop, :1046-1053, a FISH branch beside the `WET` test) is killed. One with no WATER over it goes up
with the fountain (`sandFling`, as the top water does at :1051, rolled only for a fish); the rest float up. The flung
ones come down on the bank, and the hungry eat them. The glints are what the news reports, and the real fish are what
lie on the sand afterwards.

### 5.5 Ducks

- **Dabbling.** When a dab starts in `dSwim` (ducks.js:473, after its roll, before the `return`), `pnDabble(g, d)`
  reads the cell at the duck's feet and the 5 below. The first frond (not a root), fry or dead fish is eaten, p .6,
  rolled only if one was found; a frond sets `d.weedy = g.tick`. A live grown fish in those cells or either side sets
  `d.roe = g.tick`. 18 reads a dab, no dice unless something is found.
- **Landing.** `dFly`'s touchdowns on water (ducks.js:515-516, :522) and `dThrown`'s (:534) call `pnLanded(g, d)`,
  which does nothing unless a flag is set. `weedy` under 20,000 ticks old, and no weed within 8 columns: a root, p .3,
  in the bed cell under it, if that is WATER on a solid floor with water over it, and lit. `roe` under 20,000 ticks
  old, no live fish within 20 columns, and **at least `F_ROE` 6 frond cells within 8 columns**: two fry, p .08, into
  two WATER cells by `heatBecome`. Either flag clears when used. `dTasty` (ducks.js:148) is not changed.

So the ducks carry life from water that has it to water that could keep it. Paint a weedy lake at one end of the
valley and pour a bare one at the other, and the ducks will green it, and much later put fish in it. The first fry a
duck brings into water nobody painted a fish into: "there are fish over there now. nobody put them there", and
`duckroe`, NOBODY PUT THEM THERE. The village's own pond never reaches six fronds, so the ducks do not stock it.

### 5.6 The pond the village dug

A full village pond is 20 cells, with two columns 3 deep (§0). With weed in it, a frond or two stands in the deep
middle: food for one fish, not two. In the model a pair left one fish in three runs of five.

**How often, honestly: rarely, unless you start it.** Of three seeds left alone for 40,000 ticks, one dug a pond, and
it never held more than 5 cells. The village tops a pond up from the lake only while it is less than `I_POND_KEEP` 8
short (ideas.js:84), and v3 does not change that, since it would change plain villages. So the one fish is a story
the player sets going: fill the village's pond with the WATER brush and put in a little weed and two fish, or stock
the lake and let the brigade's bucket do it.

**The census** (`pnCensus`, pond.js) runs from `ideasStep` (ideas.js:539) beside `iGraveyardStep`, `if (g.tick % 600
=== 0 && g.pnC != null)`, so only in a valley where a fish has lived. For each done `pond` site it counts the live fish
in its box (`I_POND_W` × 4 rows from `s.px0`, `s.L`: 52 reads).

- Exactly one: `s.pnOne = s.pnOne || g.tick`. Any other number: `s.pnOne = 0`.
- One for 20,000 ticks, and not named: once, "there has been one fish in the pond {who} dug for a long while now. they
  call it {who}" (`s.who`, the planner's short name, build.js:118), kept in `s.pnNamed`. A later lone fish there is
  "{who} the second" (`s.pnK`).
- Named, and a count of 0: once, "{name} is gone", and `s.pnNamed = 0`. The census counts its own box, so this fires
  when the last fish in the valley dies too.
- Named: the nearest peasant within 8 (`pOther`, as the snowmen are greeted, leftovers.js:1473-1480) says, p .5,
  "morning, {d}" or "still there, {d}?" (`P_SAY.fishHello`, said by `lSayD`, leftovers.js:581).

It is a dozen lines with no new task, and about the only sentimental thing the village does.

### 5.7 What else peasants make of it

- Anybody in the water (swimming, wading, bathing), every 30 ticks, with `g.pnN > 0`: a 5 × 5 read round their feet in
  `pStep`, beside the `wBathe` line (peasants.js:738). A live fish there: p .02, "something touched my foot"
  (`P_SAY.fishTouch`).
- Achievements: `pondlife` SOMETHING IN THE WATER (the first fry), `fishback` CATCH AND RELEASE, `fishpail`, `duckroe`.
  New `P_SAY` keys only (`fishBack`, `fishSmall`, `fishPail`, `fishEat`, `fishTouch`, `fishGold`, `fishHello`). No
  existing line changes (`MASTER_TABLES`, test/wonders.js:61-70).

## 6. Drawing

A peasant is about nine cells tall and a duck three. A fish is one cell, two with its tail, so it must read as a fish
by how it is drawn and how it moves.

- **The body** (`drawWorld`, game.js:740, a FISH branch): `(sh & 63) % 8 === 7` gold `#f0a040`, else silver `#c8d4e0`,
  slate `#8aa0b8` or olive `#8a8a5a` by `% 3`. The first three are the glints `iCatch` (ideas.js:1488) and
  `lUnderwater` (leftovers.js:1055) throw, so a caught fish looks like the fish that was there; the olive is new. A
  fry is drawn halfway to the water's colour. Dead: belly white `#e8e8e0`; cooked `#c88050`, `iCatch`'s cooked colour.
- **The tail** (`pnDrawOver`, beside `lDrawOver`, game.js:928): one cell behind its heading, at half strength. Every
  fourth tick of its phase (`(g.tick + sh) >> 2 & 1`) it moves up a row, so it wags. One frame in 64 a grown fish is a
  step lighter, catching the light as it turns. No dice; only the visible columns (`drawCols`, game.js:735), and only
  with `g.pnN > 0`. It moves in darts, and shoals turn together: phase 1 checks it in `sim.png` crops at scale 6.
- **The weed**: its shade mixed half into the water's colour at that depth (`SAND_DEEP`, world.js:225-232); a tip a
  shade lighter. **A fish in the ice**: ICE with `aux` 1 drawn with the fish's colour at a third, under the frost.
- `cellReadout` (game.js:470): "FISH (a fry)", "FISH (dead)", "FISH (cooked)", "ICE (a fish in it)", "POND WEED".
  harness/inspect.js `GLYPH` (:14-22): WEED `&`, FISH `>`. A tip at the end of `TIPS` (game.js:18): "tip: weed first,
  then fish. then a duck or two".

## 7. Determinism, saves, the rules kept

- **A valley with no fish and no weed is master's, hash for hash.** `sandLandscape` places neither. Every new line on
  a shared path either branches on a material a plain village never has (`sandLiquid`'s first line, acid, bang,
  `sandBubble`, the pressure guard, `CONDUCTS`, the heat cases, ICE's `aux === 1`, the brush, `bPlace`/`bFree`/`bDig`,
  `pEdible` and the bite, `wBathNeed`), or reads a key a plain village never has (`g.pnC != null` in `sandStep` and
  `ideasStep`; `g.pnN > 0`), or only reads (`iCatch`'s window, `iSurface`, `iScoop`'s check, `lUnderwater`,
  `pnDabble`, `pnLanded`, the ring in `iPick`). Every new roll comes after something was found. `P_FOOD[FISH]` is an
  entry `pFind` (peasants.js:1795) never meets without a fish.
- **Painted, it is not plain any more.** Fish and weed roll the village's dice, as PLANT and SEED do. That is input,
  journalled like any stroke (game.js:517).
- **Saves.** Ids 55 and 56 are appended (`MAT`, world.js:50-71); an old save has neither and loads as it did (`v <
  NMAT`, save.js:274). New keys are made when first needed and read with `|| 0` or `!= null`, since `saveApplyState`
  deletes keys a save lacks (save.js:478-483): on `g` (`pnN`, `pnC`, `pnOut`, `pnOI`), ducks (`weedy`, `roe`), jetties
  (`real`), ponds (`pnOne`, `pnNamed`, `pnK`). No grid-sized array. ICE's `aux` 1 is a byte saves already carry.
- **Brushes** go after TRESTLE, so recordings (which go by place) and saves (by name, save.js:503-509) are unmoved.

## 8. Performance

- **Weed**: one call and a comparison per cell per tick (13.5 ns, §0). One cell in sixteen takes its turn: the cell
  above, 8 neighbours, a scan of up to 16. 3,000 painted weed cells cost about 40 µs plus 190 turns, under 0.1 ms.
- **Fish**: every cell every tick, mostly the fall check, the count and a phase test. Movement every other tick,
  neighbour reads only when hungry, the crowding count every 64 ticks for a well-fed fish. `F_MAX` 400 caps births.
- **Village**: the jetty window, the ring, the dabble and the census (52 reads a pond, every 600 ticks) are reads;
  the tails one pass over the visible columns; dead-fish food rides `pFind`'s scan.
- **Budget, checked in phase 3**: 3,000 weed and 300 fish at 1088 add under 0.3 ms a tick (harness `--profile`),
  against the 4.5 ms median of docs/wide-valley-spec.md:306-311.

## 9. Tests (`test/pond.js`, one `require` in test/run.js after picker, :2489)

1. **a plain valley never grows a frond or a fish**: seeds 1, 3, 7 to 20,000 ticks: no WEED or FISH, no `pn*` key on
   `g`, no `weedy`/`roe`, no ICE with `aux` ≠ 0. The master dice and hash guards (test/wonders.js:59-102,
   test/valley.js) pass unchanged.
2. **the two materials are where they should be**: IN THE POND after BUILDING; names, `desc`, shades; `LIQUID` both,
   `CONDUCTS[WEED]`, neither `WET`, `FLUID` nor `SOLID`; arrays defined for 53-56; heat equal water's. `NEW` updated.
3. **water, weed and fish trade places exactly**: a sealed box (INERT walls, no heat, heat.js:87) of water, a bed and
   six fish, breeding. Its `heatQ` sum and its water + weed + fish count hold to 1e-3 over 10,000 ticks, then through
   lightning, acid, a charge, a drain, steam from a TORCH under the bed, and a mine-drain bucket (`bDig`, `mSpoil`
   stubbed to fail). No air cell over 400° that no fire is beside.
4. **the brush plants only into water, and a daub settles**: over sand, stone and air no cell changes. A solid disc in
   the seed 7 lake, touching the bed: within 2,000 ticks every weed cell has water among its 8, the top row is water,
   the `heatQ` sum is unchanged. A disc mid-water, off the bed: gone within 2,000.
5. **to the light, and the top row stays water**: a 20-deep tank: nothing deeper than 16 grows. A plank lying on half
   and oil on the other half: nothing grows under either; a plank on legs a row up: it grows. Scoop a row every 200
   ticks: 16 ticks after each, no weed has air over it. Drained dry: the roots are PLANT, and a hungry peasant eats them.
6. **silt goes through**: sand poured over a weedy pond reaches the bed; no grain sits on weed over 16 ticks; within
   10,000 ticks a root has crept onto the new floor.
7. **frost, the boil and brine**: COOL: ice, which thaws to water, with no weed. HEAT: steam. Salt: water. All paid.
8. **fronds, never roots**: a fed pair makes a fry in under 4,000 ticks; no weed, dead by 8,000; after a grazing every
   root stands; a fish held under a leaning frond for 1,000 ticks and the frond is still eaten; seven in a 9 × 9, no
   births.
9. **the lake keeps itself**: seed 7's pond weeded, six fish, its ducks, 40,000 ticks: fish never 0 or over 45, fronds
   never under 10. The tuning target for §3.1 and §4.1.
10. **heat, ice, lightning**: at 40 dead, at 70 cooked. A lid **held by the COOL brush every tick for 3,000 ticks**:
    every fish outside it alive, every fish in it ICE `aux` 1; HEAT it off and those float, dead. A bolt kills every
    live fish in the flood, and they surface within 300 ticks.
11. **a fish is not ground**: a dead one floating mid-lake: `navStand` there is not 1, a board with nothing but it beside
    is not `bSupported`, a duck landing on it swims, a peasant walking in swims past it.
12. **out of water, put back or eaten**: dropped on the sand by a walking peasant, it is in the water within 400 ticks;
    at 3000 hunger it is eaten, and the air there is under 40°. A dead one against the bank is eaten, one mid-lake not
    walked to, one in a fire never posted. `watch` (test/run.js:23-33): nobody drowns.
13. **the jetty**: seed 7, `know` fish, a jetty (`sim.build`), three fish under it: caught, the pond's water count
    unchanged. One fry: put back. None, after one real one: no catch.
14. **a bucket may take a fish**: 200 scoops beside one take it 20-60 times; at a fire it lands and cooks; the mixer
    never takes one. A fish in a bath held at 39: dead within 400 ticks, then eaten.
15. **ducks carry it**: `weedy` onto a weedless pond, a root within 20 landings; `roe` onto 6 fronds, a pair of fry
    within 50; `roe` onto `pondBy`'s full pond (test/run.js:1749), never.
16. **builders pull weed, shoo fish, wait for both**: an `e.wet` cell of weed placed, the `heatQ` sum kept; of a fish,
    the fish alive next door; a fish in a one-cell pocket of a plan, `bFinished` false until it is gone.
17. **the one fish**: `pondBy(seed 7, full)`, weeded, two fish, 40,000 ticks: never over 2 live; one alone 20,000 ticks
    is named. Kill it, the last fish anywhere, and within 600 ticks the news says it is gone.
18. **a save plays on the same**: save at 3000 ticks of test 9, load, the same hash 600 later (as test/platforms.js:205).
    A fish in the ice survives it.
19. **it is cheap**: 3,000 weed and 300 fish at 1088, under 0.3 ms a tick added (1.0 in CI).

Soak: a `pond` preset in harness/soak.js (rich, weed on every pond's bed, six fish), seeds 1-6 × 12,000: clean
invariants, nobody killed by it, ms/t into soak-baseline.txt.

## 10. Phases

1. **The aquarium**: world.js (MAT, PICK, arrays, flags, `sandLiquid`'s line, bubble, pressure, acid, bang,
   `CONDUCTS`, `pnZap`'s call, the count), heat.js (defs, `heatUp`/`heatDown`, the ICE split), new pond.js (`pnWeed`,
   `pnFish`, `pnZap`) with its `<script>` in index.html after ducks.js (:36), which harness/loader.js:22-27 and so
   test/sim.js read; game.js (picker, brush, draw, readout, tip); the glyph. Shippable as a sandbox aquarium. Tests
   1-11, 19. The rates in §3.1 and §4.1 tuned against test 9, and the measured numbers written in here.
2. **The village eats and fishes**: ideas.js (`iCatch`, `iSurface`, `iPick`, `iTask`, `iMood`, `I_IDLE`), peasants.js
   (`P_FOOD`, `pEdible`, the bite, the swimmer), build.js (`bDig`, `bPlace`, `bFree`), `wBathNeed`, pond.js (`pnTask`,
   the ring, `pnShoo`, speech). Tests 12, 13, 16.
3. **Buckets, charges, ducks and the census**: `iScoop`'s `fishy` and its two callers, `lUnderwater`, `pnDabble` and
   `pnLanded`, `pnCensus`, the README, the soak preset, the profile. Tests 14, 15, 17, 18.

README, in the materials paragraph (README.md:7-17), after PLANT:

> POND WEED grows up off the bottom of a pond towards the light, and stops a row short of the top, where the ducks
> are. You can only paint it into water: it is water, as far as anything is concerned, that happens to be green. It
> freezes at nought and boils at a hundred, and a frost kills a pond's weed back to ice. Sand that falls on it goes
> straight through and buries it, and it grows back over the top. FISH swim about in it and eat it, a frond at a time,
> and never the roots, so it grows back. They are water too, more or less, which is why a dead one left long enough
> is a puddle. Fed, and given room, they have little ones. Hungry, too hot (38 does it), salted, oiled, struck or
> frozen into the ice, they turn belly up and float. Under the ice they are fine. You drop them in from above. They do
> not much care for that either.

and in the village, after fishing (README.md:65-ish):

> Put real fish in the water and the jetty catches those: the little ones go back, and a lake you have fished out is
> a lake with nothing in it. A fish on the bank gets thrown back in by whoever is passing, unless whoever is passing
> is hungry. The fire brigade's buckets come out of the pond, and sometimes so does a fish, which is thrown at the fire
> with the rest. The ducks eat the weed and the small fish, and carry a bit of both about on their feet, to any water
> that looks as if it could keep them. The pond the village digs can keep about one fish, if anybody fills it.

Things to try:

- Paint POND WEED on the bed of the pond, then drop in half a dozen FISH. Come back in ten minutes
- Paint a weedy pond with fish at one end of the valley and pour a lake at the other. Leave it to the ducks
- Fill the pond the village dug, and put two fish in it. Then wait a very long time
- Put a lightning bolt into a lake full of fish. Stand back while they come up
- Warm a weedy pond from underneath with a TORCH: first it goes green, then the fish go to the bottom, then they float
- COOL a pond with fish in it until it has a lid of ice. Look underneath. Then thaw it
- Pour sand on a weedy pond. Pour oil on another

Files: "pond.js: pond weed and fish, and what the ducks and the village make of them".

## 11. Entertainment: what you will see

- **The aquarium.** Paint weed into the lake, low down. Within a minute the daub has sorted itself out into a row of
  roots along the bottom with stalks on it, and it creeps along the floor putting up fronds that lean and stop a row
  short of the surface. Drop fish in from above. They land with a plop, go under, dart and turn, and go about in twos
  and threes. The fronds they nibble go short and grow back from the bottom. A pair is enough: ten minutes later there
  are a dozen, and then it holds.
- **It keeps itself, until you do something.** Freeze the top: the fronds in the lid die and the fish sulk at the
  bottom. Salt one end and it goes bare. Let the jetty at it and the shoal thins. Each time the weed comes back up from
  the roots, and the fish come back after it.
- **Silt.** Pour sand on a weedy pond. It goes down through the fronds as if they were not there, and afterwards they
  are not. The floor is a row higher where it lands, and in a while the roots beside it have crept out over it.
- **Drain it.** Dig under the pond, or let a mine's bucket at it. The fronds die back row by row as the level falls,
  and the bed is left green, a row of bushes where the roots were. The village comes and eats them.
- **There was a fish in it.** The brigade scoops from a fishy pond, a fish lands in the fire, and afterwards somebody
  finds it: "still warm". Or the bucket was for the wheat, and the fish flops between the stalks until somebody
  carries it to the river.
- **A fish in the baths.** The bathers say "something touched my foot", and the fronds bloom in the warm. Then the
  stoker overdoes it, and somebody eats the fish out of the bath.
- **The one fish.** Fill the pond the village dug and put two fish in. There is food for one. Twenty thousand ticks
  later: "there has been one fish in the pond Ada dug for a long while now. they call it Ada." People say good morning
  to it. When it goes, the village says so.
- **Lightning on the lake** brings up every fish in the flood, belly up, within seconds. They drift to the edges, and
  the hungry walk round the bank eating them. The jetty and the ducks have a very good afternoon.
- **A charge in the pond**, and fish rain on the sand: the dice's glints, and real ones, which lie there cooked until
  somebody eats them.
- **Heat it from below.** The weed blooms, the fish crowd the cool bottom, and at 38 they float, poached. A peasant
  fishing there catches one: "it's already cooked!"
- **A frost.** Under the lid the fish swim on, slowly, in the dark. The jetty says "the fish are under the ice", which
  is now true. The ones the lid caught are dark slivers under the frost, and when it thaws they float.
- **Oil.** No light gets under a slick, so the weed stops growing, the fish that touch it die, and the pond goes quiet
  under a black skin.
- **The ducks do it.** A duck that has dabbled in your weedy lake flies off to the one you poured, and a while later
  there is a frond on its bed. Much later, two fry. "there are fish over there now. nobody put them there."
- **A fish on the sand** flaps about for ten seconds or so. Whoever is nearest throws it in the river and says so.
  Unless they are hungry, in which case they apologise.
- **Fished out.** Let the jetty have your ten fish. Then it catches nothing ("maybe tomorrow") until you put more in, or
  the ducks do.

## 12. Risks

- **The 996° air.** Any path that empties a weed or fish cell behind the books makes red-hot air under water. §3.3 is
  the audit and test 3 the net. Both are kept out of every table that removes cells (`B_DIG`, `P_LEAF`, `L_LOOSE`,
  `TD_LITTER`, `iDrinkable`); the one that takes fish (`P_FOOD`) has its own bite.
- **LIQUID is a promise.** A reader written later that *moves* LIQUID cells (as `sandBubble` and the pressure walk do)
  must skip weed. A comment beside `LIQUID`'s line (world.js:258) says so.
- **Tuning.** The model has no heat and its ducks are dice, so phase 1 may move the rates. Test 9's bounds are loose
  on purpose, and the plan records where they land.
- **Weed is a wall to water.** The touch rule and rule 5 keep it lacy, and rule 1 keeps the top row open, so a pond
  still levels and drains across the top.
- **The fishhelp walk** goes to within 3 and never into deep water; test 12 watches for drownings. **The flyout**, 32
  px taller, covers 32 more rows of the field's edge while open. **Fish everywhere**: `F_MAX`, crowding and
  starvation. **The name** needs one fish alone for 20,000 ticks, which a pond the player keeps restocking never has.

## 13. Considered, left out, and where v3 differs from the review

- **FISH as SOLID, with every SOLID reader audited** (the review's other option). That is thirty-odd readers, each
  wanting a `&& c !== MAT.FISH`, on the hottest paths in the game (`pFoot` runs for every peasant every tick). LIQUID
  is already right in all of them, and its own readers were audited. The cost is one more comparison for water in
  `sandLiquid`'s first line.
- **A 4-neighbour "no water" rule**, as the review put it. A row of roots, each with a frond over it, has weed either
  side, a frond above and sand below, and would die. v3 counts 8 neighbours, at p .25, so a daub thins raggedly.
- **The weed brush poured like SEED.** That pours into air only, and weed must start in water.
- **Making the dug pond fill itself or feed more fish.** The first changes plain villages (`I_POND_KEEP`). For the
  second, fronds at the surface would hide the water from every bucket and bob, and edible roots let one hungry fish
  finish a pond's weed for good. v3 says the story is the player's to start.
- **Seasons and weather**: the lens's obvious answer, and the wrong one here. A turning year would change every tick
  of every village with no honest opt-in, and the heat model has no sky to lose heat to. A pond you freeze yourself
  does what a winter would, for the pond.
- **Weed from a sunk SEED** (duck raids drop SEED near ponds, ideas.js:835) would change master's valleys. **WEED as
  WET**: buckets would scoop it, and a pail of weed needs a life of its own. **The die-off news**: cut; lightning and
  the charge already have their moments. **A FISHPONDS idea, a pike, sea fish, oxygen, a cloner that learns fish**:
  the buckets and ducks stock ponds by accident, which is funnier, and one predator is plenty in a one-cell world.
