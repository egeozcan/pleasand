# Daily Bread: a plan (v2)

Not built (yet). Evaluation history:

| version | consistency | design | entertainment | average |
|---|---|---|---|---|
| v1 | 8.5 | 8 | 8 | 8.17 |

This file is v2, written after the last review and not scored yet. Target was an 8.5 average.

*The ear, ground fine, wetted, and baked hot. It keeps, and the ash is the best part.*

Status: **v2** (reviews: v1 8.5 / 8 / 8). What the village does with its wheat besides eat it off the stalk: a FLOUR
you can paint, DOUGH and LOAF that only the world makes, and a brick BAKEHOUSE whose oven bakes by real conducted heat,
with a quern that drops real flour through a hole in the table into a bin, and a baker who keeps the hearth under 220
by hand. Every number in §0 was measured headless with scratch probes (`test/sim.js`; for the materials, the v2 heat
model below patched into `heat.ts` and `world.ts` source at load, with dough and loaf standing in as ids 55 and 56).
Nothing in the repo was changed to take them.

v2 (after v1's review):

- **The banked dough is redesigned against `heatStep`'s real code** (v1's grounding error). `heatUp` clears `lat` at
  its top (heat.ts:295) and the latent path always ends in `heatSetQ(g, i, q - paid)` (heat.ts:461-462), which would
  have dumped the bank into temperature (a dough at 514-670°). v2 puts a DOUGH case in `heatStep` *before* that path:
  with no air beside it the bank stays full and **any surplus goes into its temperature**, so heat is kept and nothing
  hoards it (§2.2). Probed: sealed, at 150 with its bank kept; heated hard, a "pressure-cooker" dough at 543° that
  comes out black the moment it gets air (§0.5). The oven was re-probed with it (§0.4).
- **What bread does to the food was measured, and it is not much** (§0.2). A ceiling stand-in (a loaf at everybody's
  elbow) cuts the share of the day spent on meals from 2.8-8.0% to 1.9-4.8%, and changes hunger, ideas and population
  by nothing worth saying. v1's "it goes twice as far" is true per ear and invisible per village, so it is out of the
  subtitle. Bread's payoffs are now stated as what they are: the ash (POTASH and BLACK POWDER, otherwise dead), a
  larder of six that does not depend on the field, and a building that puffs, rings and gets doused where you can see it.
- **How bread is thought of was measured.** No field caught fire in 40,000 ticks of any seed, so v1's "field on fire"
  spark is cut. Left to the fallback, bread came at a median 59,500 ticks (never, in one seed). v2 sparks it in whoever
  eats a raw ear while it is ready: a median 29,000, about 6,800 after it is ready (§0.3).
- **Bread does not switch on the great works** (`plain: true`, §6): in 8 of 12 seeds it is the first fresh idea.
- **The baker's work is driven by the world, not by stages kept on the peasant**: flour in the bin, dough in the oven,
  loaves on the table, grain in the bakehouse's sack. A hand-off, a death or the fire alarm loses at most the ears in
  transit. Who takes over, and when, is specified (§3.4); `stuck.js` scenarios per stage are in the tests.
- **The mill is cut** (to "Considered"). Instead the quern drops real FLOUR through the table into a bin between the
  trestle legs: a dust hazard in every bakehouse, and somewhere for the brigade's water to make dough.
- **Ducks**: `dPeck` now passes the duck to `dTasty` too, so a fed duck leaves the wheat alone at the beak as well as
  in its scan. "Cheaper than a scarecrow" is withdrawn: measured, a loaf costs about the ear it saves (§4.3).
- **TORCH corrected**: `iTorchlit` reaches one column either side (ideas.ts:669); probed, the bell rings for the end
  loaves of a torch oven and not the middle three (§3.6). **Platforms**: `plFind`'s column scan stops at the first
  solid cell (platforms.ts:58-61), so the bakehouse joins `PL_UNDER` (platforms.ts:38), as the furnace has. Slips:
  `tHome` is ideas.ts:422; loaves are `Q` in the diagram (`l` is LAMP in harness/inspect.js:21).

---

## 0. What we are working with (measured)

### 0.1 Wheat, ash and coal in villages left alone

Plain villages, one screen (272), 40,000 ticks ("ready" is the first tick `bkReady` is true: farm, masonry, a field,
and `g.got.harvest`):

| seed | farm | masonry = bread ready | smelt | ripe wheat standing (mean / max) | `g.found.ash` | coal found | farm fires | deaths |
|---|---|---|---|---|---|---|---|---|
| 1 | 2100 | **27,900** | 20,900 | 42.5 / 71 | **0** | 101 | **0** | 0 |
| 3 | 760 | **19,560** | 23,160 | 16.9 / 42 | **0** | 176 | **0** | 0 |
| 7 | 1540 | **22,940** | 30,040 | 59.7 / 81 | **0** | 54 | **0** | 0 |
| 11 | 1780 | **25,560** | 32,060 | 64.5 / 90 | **0** | 23 | **0** | 0 |

- **Ash is zero in every seed**, at 272 and at 1088. `g.found.ash` comes only from fires (`lTake`, leftovers.ts:279;
  the baths' stoker, pleasures.ts:230). POTASH (`found.ash >= 6`, ideas.ts:226) and BLACK POWDER (ideas.ts:230) are as
  good as dead in a valley nobody sets alight. An oven rakes out about one ash a loaf (§0.4).
- **Nobody is starving**, and wheat stands ripe all the time. No field burnt (`s.burning` on a `farm`, sampled every 20
  ticks) in any of them.
- Coal is found by the hundred and spent on smelting and wonders only. It is the oven's fuel.

### 0.2 What bread would do to the food (a ceiling)

A stand-in, from the tick bread is ready: a loaf appears in a pool of at most nine every 90 ticks (one oven at full
tilt, §0.4), each paid for by one ripe ear vacated off a field with three or more; a peasant over `P_HUNGRY` eats one
where they stand (−1800) and pockets another if two are left; a pocket loaf is eaten at 1800. No walk to the table and
no baker's time, so it is the most bread could do. 40,000 ticks, plain against stand-in:

| seed, width | meals | share of the day on meals | long walks (> 60 cols) | mean hunger | share of time fed (< `I_FED`) | ears eaten by peasants | by ducks |
|---|---|---|---|---|---|---|---|
| 1, 272 | 131 / 110 | 4.8% / 3.7% | 0 / 0 | 1425 / 1354 | .48 / .51 | 161 / 119 + 25 baked | 59 |
| 3, 272 | 149 / 106 | 8.0% / 4.8% | 2 / 2 | 1856 / 1865 | .35 / .34 | 119 / 95 + 37 | 94 |
| 7, 272 | 86 / 68 | 2.8% / 1.9% | 0 / 0 | 1809 / 1822 | .34 / .35 | 48 / 32 + 34 | 38 |
| 11, 272 | 99 / 91 | 3.3% / 2.7% | 1 / 0 | 1583 / 1437 | .47 / .49 | 59 / 56 + 27 | 22 |
| 1, 1088 | 123 / 93 | 6.8% / 4.9% | 6 / 3 | 2062 / 1948 | .34 / .35 | 112 / 79 + 53 | 35 |
| 3, 1088 | 96 / 81 | 5.9% / 4.7% | 5 / 4 | 2142 / 2144 | .30 / .28 | 62 / 52 + 30 | 31 |
| 7, 1088 | 105 / 88 | 6.0% / 3.6% | 6 / 4 | 2051 / 2092 | .37 / .31 | 92 / 93 + 43 | 6 |
| 11, 1088 | 105 / 97 | 6.4% / 5.7% | 8 / 8 | 2216 / 2247 | .32 / .31 | 116 / 98 + 27 | 52 |

What that says, plainly:

- **A loaf is a meal, not a better one.** A meal of ears runs on to hunger 300 (up to `P_BITES` 5, peasants.ts:2180);
  a loaf is −1800 and ends it. Hunger and the time fed hardly move. Ideas known at 40,000 were 14-16 either way: ideas
  are held back by what is ready and by `I_GAP`, not by musing (a stand-in that also made the table cosy, `p.cosyT`,
  changed nothing at all).
- **It gives back 1-3 points of the day**, more in the wide valley, where walks are longer. Long walks to food are
  rare at 272 and a handful at 1088: "lunch down the mine" happens, but it is a moment, not a statistic.
- **Population is unchanged**: `popGoal` stays 8, nobody died, nobody arrived. Field demand falls by about a fifth.
- So bread does not answer a need, and v2 does not invent one. What it gives the village is the ash (§4.2), six meals
  on a table that a frost or a flood on the fields does not touch, and a working building you can watch (§4.4).

### 0.3 When bread is thought of

Twelve plain seeds, 272, to 80,000 ticks, with bread pushed onto `IDEAS` as a fresh idea (ready as above). With no
spark it comes only by the `wold` fallback (ideas.ts:360), when nobody has a master idea ready:

| seed | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ready | 27,960 | 19,320 | 19,560 | 21,240 | 23,760 | 19,200 | 23,040 | 20,880 | 28,080 | 25,200 | 25,560 | 16,920 |
| thought, no spark | 57,560 | 57,680 | 59,200 | 39,880 | 62,440 | 59,680 | 71,240 | 62,140 | 57,480 | 62,380 | never | 43,760 |
| thought, a raw ear sparks it | 37,080 | 25,440 | 28,800 | 33,100 | 25,660 | 24,460 | 27,700 | 29,200 | 35,220 | 61,140 | 32,060 | 19,760 |

- With no spark, on half of `I_WSPARK` at those moments: a median of 59,500.
- Sparked in whoever eats an ear of wheat off the stalk while it is ready (and has no other great thought in their head:
  `!p.wspark`, as storeys' spark is guarded, build.ts:1190): **a median of 29,000, about 6,800 ticks after it is
  ready**. Seed 10 is slow because three other fresh ideas held its eaters' `wspark` first.
- Two other sparks were measured and dropped: the smelter at the bellows (median 41,400) and an ear eaten near a hot
  furnace (rarer than the fallback: fields are not by furnaces).

### 0.4 The oven, re-probed with the v2 heat model

The oven of §3.2, BRICK, in open air, sealed firebox. Five dough on the hearth (C 2.5, K .06, HI 150, HI_L 1300,
water's phase worth), loaves after (C 1.5, K .04, HI 280, HI_L 300). A scripted baker every 20 ticks: a coal (or log)
laid on the firebox floor at the air's heat and lit by `pIgniteCell` while the hearth's middle cell is under SET and
fewer than LIT are burning; one ash raked a visit; a loaf pulled CHECK ticks after it bakes; five more dough when the
hearth row is empty.

| fuel | SET | LIT | CHECK | ticks | first bake | loaves | burnt | fuel | ash | hearth mean / max | pulled at |
|---|---|---|---|---|---|---|---|---|---|---|---|
| coal | 220 | 3 | 20 | 6000 | 154 | **64** | 0 | **25** | 70 | 264 / 619 | 142-271° |
| wood | 220 | 3 | 20 | 6000 | 154 | 34 | 0 | 59 | 91 | 259 / 524 | 135-280° |
| coal | 420 | 4 | 90 | 3000 | 164 | 49 | 6 | 16 | 46 | 312 / 557 | 159-280° |
| coal | 450 | 5 | 150 | 2000 | 161 | 5 | 41 | 11 | 33 | 357 / 614 | |
| coal | apprentice, then 220 / 3 / 20 | | | 4000 | 161 | 48 | **5, all of the first batch** | 20 | 42 | 274 / 563 | |
| wood | apprentice, then 220 / 3 / 20 | | | 4000 | 155 | 29 | 5, all of the first | 41 | 63 | 257 / 557 | |
| torch at u3, no fuel | - | - | 20 | 3000 | 54 | 124 | 42 | 0 | 0 | 556 / 741 | 202-280° |

- **A careful baker burns nothing**, a loaf every 94 ticks at 0.4 coal a loaf, and about one ash a loaf.
- **A baker who stokes it like a furnace burns nearly everything**: that is the apprentice (§3.4), five of five, then
  none.
- **Walked away from**, with three coals under a batch after the first loaf: coal, three good, one black, one still
  dough; wood, two good, three still dough. With the apprentice's five coals, five black. So the baker does not start a
  batch they will not stay for (§3.4), and the fire alarm costs a loaf or so (the bell rings for it).
- **The bank rule fires in the oven too** (10 times in 6000 ticks): a dough whose cell above holds a puff of steam
  waits for it to clear, then bakes. Nothing to do about it.
- Steam that does not get up the flue condenses on the cool dome and drips back on the hearth, which boils it off
  again. The oven sweats.

### 0.5 The bank rule, probed

A dough cell in a 5x5 of STONE inside INERT (K 0: nothing gets in or out), the stone at T, 4000 heat steps:

| stone at | dough after | its bank (of 1405 for that shade) | Σ heat over the box, change | then the cell above opened to air |
|---|---|---|---|---|
| 175 | 150.0° | 869, kept | +0.002 of 8172 | |
| 180 | 150.0° | 1109, kept | +0.002 of 8412 | |
| 200 | 163.2° | 1405, full: the rest is temperature | −0.29 of 9372 (float32) | LOAF + a STEAM cell in one tick; books unchanged; 167° after 600 |
| 600 | 543.4° | 1405, full | +0.002 of 28,572 | a loaf that chars the same tick: an EMBER, 699° and burning |

---

## 1. What this adds

1. **Three materials** (§2): FLOUR (painted, MORE, a new group FROM THE FIELD), DOUGH and LOAF (made, never painted).
   Flour and water make dough where they touch; dough heated past its bank with air beside it makes a loaf and a puff
   of steam; sealed, it only gets hotter; a loaf too hot chars to an ember. Flour falling past a flame goes bang; a
   heap of it only burns.
2. **One idea, DAILY BREAD** (§3.1), and a site, the **BAKEHOUSE**: a brick oven, a trestle table with a quern on it
   and a flour bin under it, a sack of grain, and a baker.
3. **Bread in the village** (§4): a loaf is food anywhere, the hungry pocket one for later, the oven's ash goes into
   the store (and POTASH follows), bored peasants feed the spare to the ducks.

---

## 2. The materials

### 2.1 What they are

Ids appended to `MAT` (world.ts:50-71): **FLOUR 55, DOUGH 56, BREAD 57** (6 ids left). `SAND_DENS`, `SAND_FREE`,
`SAND_POUR` (world.ts:133-144) stop at id 52 today; they are padded for LINEN 53 and TRESTLE 54 with 9, 0 and 0 (read
exactly as the `undefined` they read now: every reader tests FREE first, or never reaches a STILL solid), then the
three new entries.

| id | MAT | name | dens | free | pour | C | K | HI (latent) -> becomes | moves | palette |
|---|---|---|---|---|---|---|---|---|---|---|
| 55 | FLOUR | FLOUR | 1.4 | 1 | .3 | 1.0 | .04 | 200 (0) -> FIRE, leaving ash; a **bang** if falling (§2.2) | powder: falls, piles, slides, floats | MORE, FROM THE FIELD |
| 56 | DOUGH | DOUGH | 2.6 | 1 | 0 | 2.5 | .06 | 150 (1300) -> BREAD + a STEAM puff, paid, into air beside it | slumps: falls, sinks in water, slides at p .1 | no |
| 57 | BREAD | LOAF | 1.2 | 1 | 0 | 1.5 | .04 | 280 (300) -> EMBER aux 0 (charred) | stacks: falls, floats, never slides | no |

- DOUGH's phase worth is water's: `HEAT_HS[DOUGH] = HEAT_HS[WATER]`, `HEAT_HLAT[DOUGH] = HEAT_HLAT[WATER]` (heat.ts:
  195-207). A water cell that becomes dough keeps its heat (its temperature moves by the C ratio: water at 50 makes
  dough at 68), and baking it is boiling it: the bank pays for the steam (`heatSpawn`, heat.ts:285) and the loaf keeps
  `-20 + 100f + Q_air`, positive for every shade.
- `MAT_NAME` (game.ts:452): FLOUR from PICK; DOUGH and LOAF by hand, as WASHING is. `MAT_UP[DOUGH] = "baking"`,
  `MAT_UP[BREAD] = "charring"` (game.ts:465), so the readout says "LOAF 241° charring 40%".
- Shades (world.ts:146-213): flour four creams, dough three pale buffs, loaf four golden browns (a loaf with air over
  it draws a darker crust pixel). Harness glyphs (harness/inspect.js:15-22): FLOUR `'`, DOUGH `d`, BREAD `Q`, all free.

### 2.2 Recipes and changed interactions

| actor | with / when | result | p a tick | where |
|---|---|---|---|---|
| FLOUR | a WATER neighbour (fresh only) | the water -> DOUGH, its heat recounted (heat.ts:358-369); the flour -> EMPTY | .05 | `sandPowder` (world.ts:937), as SALT's water branch (:965-966) |
| FLOUR | a HOT neighbour (`sandHotNb`, world.ts:286) while falling (`vy >= 2`) | **dust bang**: `sandBoom(g, i, 3, 0.8)` | 1 | `sandPowder`, as GUNPOWDER's (:939-940) |
| FLOUR | a HOT neighbour, at rest | -> FIRE, `sh &= 127` (leaves ash) | .3 | `sandPowder` |
| FLOUR | past 200° | the same split by `vy` | - | `heatUp` case (heat.ts:293); a flour that banged is left out of the `heatSetQ` after, as GUNPOWDER and NUKE are (heat.ts:455) |
| DOUGH | past 150°, bank `>= 1300·heatF(sh)`, and an EMPTY cell up, left or right (that order, no dice) | -> BREAD; STEAM into the EMPTY, paid by the loaf | - | `heatUp` case, through the latent path as now (heat.ts:459-462) |
| DOUGH | the same, but no EMPTY up, left or right | stays DOUGH; `lat` held at the full bank; **the surplus is temperature**: `T = 150 + (e − bank)/C` | - | a new branch in `heatStep`, *before* the latent path (below) |
| BREAD | past 280°, then 300·heatF banked | -> EMBER aux 0: smoulders, sets the next loaf off, burns out to ASH (.005, world.ts:1150) | - | `heatUp` case |
| ACID | FLOUR, DOUGH, BREAD | -> EMPTY | .04 | the soft list (world.ts:1042-1043) |
| a bang | DOUGH | left as it is (mostly water); the bang's heat half-bakes it | - | `sandBoom` (world.ts:557-563), a branch before the catch-all |
| a bang | FLOUR, BREAD | the catch-all: FIRE 85%, the shell flung | - | unchanged |
| lightning | any | its heat does it: falling flour bangs, a heap burns, dough bakes, a loaf chars | - | unchanged |
| CLONER | any of the three | will not learn them (`t < MAT.PLANK`, world.ts:1183): no bottomless loaf | - | unchanged, on purpose |
| peasant | BREAD under 60°, hungry | eaten anywhere, −1800, the meal ends | - | §4.1 |
| duck | BREAD | eaten; full for 3000 ticks | .08 | §4.3 |

**The bank branch**, at heat.ts:459, the whole of it:

```js
      if (v === DOUGH && e >= heatLat(g, i, L) && bkRoom(g, i) < 0) {
        /* sealed in: nowhere for the steam to go. the bank is full; anything more is just heat, and it gets hotter */
        L = heatLat(g, i, L); lat[i] = L; T[i] = hi + (e - L) * IC[v];
      } else if (e >= heatLat(g, i, L)) {   /* (as now) */
```

`heatUp` is never called for a sealed dough, so its `g.lat[i] = 0` (heat.ts:295) never runs, and nothing goes through
`heatSetQ`. Next tick the cell is over `hi` again: `e = L + (t − hi)·C`, `T = hi`, and the branch puts the surplus
back. Heat is conserved exactly (§0.5) and a sealed dough conducts like anything else at its temperature, so it is not
a sink at 150 that soaks up a fire for ever. (The review suggested capping the bank and holding T at 150: that would
delete the surplus every tick. v2 caps the bank and keeps the surplus.) `bkRoom` is three reads (up, left, right, EMPTY
only: never `heatRoom`, which rolls `irnd` and takes STEAM cells that would pay nothing, the v1 probe's 1696° loaf).
The test costs one compare in a branch only cells past their latent threshold reach.

Flour looks after its own fire (`sandHotNb` every tick it is not still), as gunpowder does, so `sandFire`, the ember
and lava lists and `sandIgnite` need no new lines.

**Why `vy >= 2`**: `sandFall` (world.ts:350-361) adds one to `vy` for every tick a grain keeps falling and zeroes it on
landing. A grain at 2 has fallen two ticks running, with air round it. A heap is 0. So the same flour is a firecracker
poured from height and a sulky little fire tipped on gently, and the quern's spout, which drops it four cells into a
bin, is dangerous exactly where a real one is.

### 2.3 The palette

- **FLOUR is paintable.** It is a toy on its own: flour, water and HEAT make a loaf with no village at all; poured
  through a flame it goes off up the stream; on a pond it makes dumplings that sink and will not bake. And painted
  near a village it is picked up (`L_LOOSE`), which sparks bread (§3.1).
- **DOUGH and LOAF are not**: two clicks of FLOUR away (water, then HEAT), and the village's to make, as WASHING and
  TRESTLE legs are. The eyedropper maps them to FLOUR (game.ts:540-549, as it maps EMBER to WOOD).
- The main panel is full (test/picker.js:34). FLOUR goes after TRESTLE, last in PICK, with `more: "field"`, under a new
  group **FROM THE FIELD**: `MORE_GROUPS` (game.ts:564) gets `["field", "FROM THE FIELD"]` third. The flyout grows by
  3 + 9 + 10 = 22: `MORE_H` 130 -> 152, `MORE_TOP` 230 -> 208, well under the field's top. test/picker.js's `NEW` gets
  "FLOUR". A group of one is thin (the review said so), but flour is neither from the rock nor a building material, and
  a head costs 12 pixels that are there.
- PICK entry: `{ m: MAT.FLOUR, name: "FLOUR", key: "", more: "field", desc: "ground wheat. wet it: dough. bake that:
  bread. a cloud of it by a flame: bang." }` (78 characters, inside the bar's ~80).

---

## 3. The bakehouse

### 3.1 The idea, and who thinks of it

```js
IDEAS.push({ id: "bread", fresh: true, plain: true, name: "bread", title: "DAILY BREAD",
  sub: "the ear, ground, wetted and baked. it keeps",
  hint: "squared stone, ripe wheat, and a great deal of chewing",
  ready: function (g) { return bkReady(g); } });
function bkReady(g) { return !!g.know.farm && !!g.know.masonry && !!g.got.harvest && iCount(g, "farm") > 0; }
```

Pure, `fresh` (so it comes on `wRand`, never in master's lottery), `plain` (§6: not a great work). Sparks, both
`wSpark` (wonders.ts:271, which writes only when `ready` is true), both guarded `!p.wspark`:

- **A raw ear.** In the `eat` task, beside `achieve(g, "harvest")` (peasants.ts:2177): `if (c === MAT.WHEAT &&
  g.know.masonry && !g.know.bread && !p.wspark) wSpark(g, p, "bread");`. No dice. Measured in §0.3.
- **Flour picked up.** FLOUR joins the leftovers (`L_LOOSE`, `L_AS.flour`, `L_POCKET.flour` 6: leftovers.ts:49-54), so
  painted flour is gathered like ash; `lTake` (leftovers.ts:279) says "picked up some flour. what's it for?" the first
  time, and sparks bread in whoever did. Flour in a pocket is the baker's if they are the baker (it goes in the bin).

A bread thought held in a head would keep storeys' and decks' sparks out of it (both are guarded `!p.wspark`,
build.ts:1190-1191). A roof matters more than bread, so those two guards become `(!p.wspark || p.wspark === "bread")`:
a rough night puts the bread out of their head. It reads as now in any village where bread is not ready.

### 3.2 Geometry

Eleven wide, on a house plot (`bPlot`, build.ts:506: level, room either side), `u = x − x0`, G the ground row:

```
 u: 0 1 2 3 4 5 6 7 8 9 10
G-9     B . B                chimney, the flue at u3
G-8     B . B
G-7 B B B . B B B            dome
G-6 B . . . . . B   Q   Q    chamber, 5 x 2; loaves on the table, two stacks of three
G-5 B d d d d d B   Q   Q
G-4 B B B B B B B   Q o Q    hearth. o: the quern, drawn, over the spout at u9
G-3 B . . . . . B . = . =    firebox, 5 x 2, sealed. table top: PLANK at u8, u10; the hole at u9
G-2 B c c . . . B . X ' X    coal laid on the firebox floor by reach (as the baths' stoke-hole: pleasures.ts:231-232)
G-1 B B B B B B B @ X ' X    floor. @ the baker's spot. X trestle legs; ' the flour bin between them
G                    '       the bin dug one into the ground (where the ground digs: `B_DIG`; else two deep)
```

32 BRICK (16 stone at `B_AMT` 0.5), 2 PLANK and 4 TRESTLE (4 boards: `B_COST` 1 and 0.5, build.ts:47-50), and one EMPTY
plan cell, dug. Box x0−1 .. x0+11, G−9 .. G. The chamber, the firebox, the table's top row and the bin are not plan
cells, so `bInspect` (build.ts:1041) mends only brick and boards. The sack of grain (`s.grain`, cap 12) is drawn by the
table leg, a number, not cells.

### 3.3 Planning it

`bkPlan(g, p)`, from `bkPick` (§3.5): bread known, no bakehouse (two once `bAlive >= 14`), `bOpenCount < B_OPEN`, 8 or
more stone in hand (`bStoneToHand`, build.ts:312), a look along `bPlot` outward from the planner's home as
`bPlanHouse` does, and in a wide valley only in the village's range (`vRange`, as the furnace: mines.ts:912-913).
`bNew(g, "bakehouse", p, plan, box, { G, x0, baker: p.id, grain: 0 })` (build.ts:117). `SITE_NAMES.bakehouse =
["bakehouse", "bakehouses"]` (game.ts:1427). It takes a house plot, so in a crowded valley storeys come a little
sooner (`sPlotCheck`, storeys.ts:106, only reads `bPlot`), which is fair.

### 3.4 The baker

**Who.** `s.baker` is a peasant id. `bkBaker(g, s)` keeps it while that peasant is alive and has been on the `bake` task
in the last 600 ticks (`s.bakeT`, written each work tick). Otherwise the first peasant `bkPick` reaches who is not
hungry or tired, knows bread, and is within 160 becomes the baker (`s.baker = p.id`). An old baker who comes back to
find somebody else at it goes about their day. `p.bakes` (batches baked) is the peasant's own: **a new baker is an
apprentice**, even one taking over somebody else's batch half-way, and stokes it like a furnace.

**What.** One task, `bake { site, t, act, n }`. Every 20 ticks of work the baker does the first of these that applies,
read off the world, not off the task (so a hand-off, a save or the alarm resumes where the world is):

| # | if | they | cost |
|---|---|---|---|
| 1 | a LOAF in the chamber, baked `BK_PULL` 20 ago (`s.pull[u]`, the tick each hearth cell went BREAD) | pull it to the table: `heatQ` out, `heatVanish`, `heatSetQ(t, qa + q)` on the stack's top cell (a loaf at 190 lands at 190) | - |
| 2 | an EMBER or ASH in the chamber (a burnt one) | rake it: `heatBecome(j, ASH)` then `heatVanish`, into `p.ash`, `g.found.ash++` (the stoker's line, pleasures.ts:216, 230) | "IT'S BURNT" |
| 3 | ASH on the firebox floor | rake it, the same | - |
| 4 | dough in the chamber | mind the fire: read the hearth's middle (u3, G−4); under `BK_SET` 220 (450 for an apprentice) with fewer than `BK_LIT` 3 (5) burning, lay a coal (their own; `iChipIn`; or the furnace pile, as `pTaskStoke` does, pleasures.ts:189-199), or with no coal a log, and light it (`pIgniteCell`, peasants.ts:2232) | a coal or a log |
| 5 | the hearth row empty, the table holding 1 or fewer, the shift under 1600, flour and a pail | knead: a bin cell (FLOUR, or DOUGH if the bin got wet) and a pail cell make a DOUGH on the hearth with the pail's heat and the air's (`heatSetQ(j, qa + c.q)`, the `iSpill` idiom, ideas.ts:1101-1103) | 1 flour, 1 water |
| 6 | no pail | fetch water: `iFindWater(g, p, 160, null, true)`, `iScoop` (ideas.ts:1023, 1062): `I_LOAD` 5 | - |
| 7 | the bin not full, grain in the sack | grind: 60 ticks at the quern ("*grind grind*"), then one FLOUR cell at the spout (u9, G−4), at the heat of the air it replaces, which falls into the bin | 1 grain |
| 8 | the sack empty | reap: up to 5 ripe ears off the nearest field with three or more (`pFieldFood`'s walk, peasants.ts:1818; `heatVacate` as eating does), into `p.grain`; back at the spot, into `s.grain` | ears |
| 9 | none of these | the shift is over |

A shift also ends at `k.t > 2000` or hungry or tired, **but only with the chamber empty**: row 5's 1600 means a batch
is never started that the shift cannot finish (§0.4: walked away from, a batch loses a loaf or so). Every walk is
`iWalk`/`pGiveUp` as `pTaskStoke`'s are. A baker who has given up three walks in a shift ends it.

**The apprentice.** `p.bakes < 1`: SET 450, LIT 5, and they leave the loaves in "to brown" (pull at 150): five black
(§0.4). Then `p.bakes++` and they know. "the first batch is always burnt".

**Hand-offs**, all the cases:

| what happens | the bread on the peasant | the bread in the world | who next |
|---|---|---|---|
| shift ends | `p.grain` into the sack first | as it is | the baker again, later |
| the fire alarm (`I_IDLE.bake`) | the pail spilt by `iPail` (ideas.ts:972-974), as any; `p.grain` kept | the batch bakes on unwatched: a loaf or so lost, and the bell | the baker, back after the fire; if 600 ticks pass, anybody |
| hungry (10000, tools down: peasants.ts:1648) | kept | as alarm | as alarm |
| death | the pail spilt where they fell (`iSpill`, peasants.ts:426); `p.grain` lost with them | as it is | the next peasant `bkPick` reaches |
| the bakehouse burnt or broken (`bInspect`) | kept | what is left of it | nobody until it is mended |

The only bread state on a peasant is `p.grain` (at most 5, in transit) and `p.bakes`. Flour, dough and loaves are
cells; grain is `s.grain` on the site; coal is the ordinary `p.coal`.

All the baker's choices roll `wRand` (wonders.ts:168), never `Math.random` or `irnd`; a coal's shade is dealt from
`wRand` (`sandSet` would `irnd(256)`: world.ts:338). The cells (dough baking, flour catching) roll `Math.random` as every
cell does, only where those cells are.

### 3.5 Where it hooks in

| hook | where | what |
|---|---|---|
| `if (K.bread && bkPick(g, p, hungry)) return true;` | `iPick` (ideas.ts:395), after the pond block (:416-421), before `tHome` (:422) | plan the bakehouse; be the baker (first, if dough is in the chamber); feed the ducks (§4.3) |
| `bkTask` | `iTask`'s chain (ideas.ts:492) | `bake`, `crumbs` |
| `I_IDLE.bake = I_IDLE.crumbs = 1` | ideas.ts:531 | the fire alarm takes them off it |
| `iPail` | ideas.ts:972-974 | `bake` joins the kinds that carry a pail |
| fire exemption | the blaze loop (ideas.ts:549-568), after :555 | `if (f.length && s.kind === "bakehouse" && bkOwnFire(g, s, f)) continue;`: flames all in the firebox's interior are the oven's. A burnt loaf in the chamber is not: the bell rings and the brigade comes |
| `PL_UNDER.bakehouse = 1` | platforms.ts:38 | no deck over a chimney, as none over a furnace |
| tidy | tidy.ts:870, 1019 (`TD_LITTER`) | skip cells in a bakehouse's box: the bin's flour and the firebox's ash are the baker's |
| finish / label / readout | `iFinish`, `iLabel` (ideas.ts:2023, 2010), `bReadout` (build.ts:1540) | "the bakehouse is up"; "BAKEHOUSE · hearth 231° · 5 in the oven · 4 on the table · 3 flour · 7 grain · 31 baked, 5 burnt" |
| moods | `iMood` (ideas.ts:2066) | "is reaping a few ears for the oven", "is grinding at the quern", "is fetching water for the dough", "is minding the oven. it's about right", "is taking the bread out", "is raking out the ash" |
| spark | peasants.ts:2177; build.ts:1190-1191's guards | §3.1 |

### 3.6 What else meets it

- **The fire brigade**: a burnt batch is a fire like any other. They throw water at the oven; the hot brick hisses it
  off and the steam goes up the chimney; what misses lands on the table and **runs into the flour bin, which is dough
  now**. The baker uses it as it is (row 5), and says "who wet the flour".
- **A TORCH in the firebox** (you): no coal ever again, and the hearth at 556° on average. A baker pulling every 20
  ticks gets 124 loaves in 3000 and burns 42 (§0.4): the fastest oven in the valley, and a wasteful one. `iTorchlit`
  (ideas.ts:668-671) excuses a flame with a TORCH 1-4 rows under it, one column either side. A torch at u3 on the
  firebox floor (G−2) covers chamber cells u2-u4 (3 and 4 rows up), not u1 or u5. So the middle loaves burn quietly and
  the end ones ring the bell (sampled: 29 flames excused, 16 not). Nobody wrote that on purpose. It stays.
- **The flour bin**: the falling stream between the legs is `vy` 2 and over. Anything HOT beside it (a leg on fire
  from a house fire next door, lightning, a TORCH you paint at the baker's elbow) and it goes off, with the bin after
  it. A heap in the bin, left alone, only burns.
- **Ducks** fly onto the table now and then (they can: it is a solid top). That is what the table is for, as far as
  they are concerned.
- **Platforms**: none over it (`PL_UNDER`). **Storeys**: none on it (it is not a dwelling, `sDwelling`).

---

## 4. Bread in the village

### 4.1 Eating it

- `P_FOOD[BREAD] = 1` (peasants.ts:1784). `pEdible` (peasants.ts:1861) starts `if (cell is BREAD) return T < 60;`: a
  loaf is food wherever it lies, but not hot ("they blow on it"). The snack rule (peasants.ts:2041, a bite within 4 at
  hunger over 900) passes over bread: the table is fed from by the hungry, not grazed by passers-by.
- In the `eat` task (peasants.ts:2171-2181): a loaf is −1800 and ends the meal. With 2 or more left on the table, they
  take one for later: `p.loaf` (cap 1).
- `bkSnack(g, p)` at the top of `pFoodTask` (peasants.ts:2033), after `lSnack` (leftovers.ts:711): the pocket loaf,
  wherever they are, **at 1800** rather than `P_HUNGRY` (there is no walk to put off). The stand-in measured that as
  2-6 points more of the day fed than eating it at 2500.
- The first loaf eaten: `achieve(g, "bread")`, DAILY BREAD, "a loaf off the table, and nobody had to eat it off the
  stalk". Once, a newcomer following their nose (`g.popGoal++` behind `g.bkFame`, as monuments.ts:378 and
  heavens.ts:867 do it): "somebody came over the hill. they said they could smell it from there". That is the one
  change to the population, and it is on purpose.

### 4.2 The ash

About one ash a loaf (§0.4), into the baker's pocket, and from a full pocket into the store (`lGoStore`,
leftovers.ts:1205). The first batch alone (five charred loaves raked, plus the coal's) nearly makes `found.ash >= 6`.
Then POTASH is ready (a master idea: it comes in master's lottery, among whatever else is ready), the ash is raked into
the fields, and the wheat comes up twice as fast for 14,000 ticks; with coal and salt about, BLACK POWDER. None of that
is new code: the oven is only the first fire in the valley anybody keeps on purpose.

### 4.3 The ducks

- `dTasty(g, x, y, d)` (ducks.ts:148): BREAD is tasty; and with `d && d.fullT > g.tick`, WHEAT is not. **All three
  callers pass the duck**: the seed scan (ducks.ts:380), its recheck (:398) and `dPeck` (:425). A duck with no `fullT`
  reads exactly as now.
- `dPeck` (ducks.ts:422): a loaf eaten sets `d.fullT = g.tick + 3000` and is no raid (`iRaided`, ideas.ts:835, is for
  wheat only).
- **Feeding the ducks** (task `crumbs`, from `bkPick`): somebody bored (over 900), with a loaf in hand or four on the
  table, and a duck on water within 80, walks to the edge and throws it, on `iThrow`'s arc (ideas.ts:1075-1086) as a
  PK_DEBRIS of BREAD with the loaf's heat. It floats (`sandFloat`, world.ts:927); every duck on the pond goes for it.
  The thrower is cosy for 900 ticks (`p.cosyT`, ideas.ts:281) and says "here ducky". `achieve(g, "ducksfed")`.
- **It is not cheaper than a scarecrow.** Ducks ate 6-94 ears in 40,000 ticks (§0.2): about one ear a duck per 3000
  ticks, which is what the loaf cost. They do it because it is nice. The raids it saves do push the scarecrow (raids
  >= 3, ideas.ts:200) and the duck palace (raids >= 40, pleasures.ts:1206) a little further off.

### 4.4 Being seen

The numbers in §0.2 are why this section exists: the payoff has to be visible, because it is not big.

- **The chimney steams** while a batch bakes: every loaf puts a STEAM cell out of the flue (real cells, five a batch).
  You can tell from across the valley that there is bread.
- **The table** is two stacks of three, and they go down at meal times and up after a shift.
- **The feed**: "the bakehouse is up"; "first bread out of the oven. it's burnt" (once); "{n} had their lunch down the
  mine" (once, the first pocket loaf eaten 20 or more rows under the ground, or on a great work's scaffold); "the
  bread's burning at the bakehouse" (the blaze line, as now); "{n} is the baker now" (on a hand-off).
- **The readout** (§3.5) carries the whole chain at a glance: hearth, oven, table, bin, sack, baked and burnt.

---

## 5. Entertainment: what a player sees

- **Pour FLOUR into a fire from high up**: pop, pop, pop, up the stream like a string of crackers, each one flinging the
  next grains about. Then tip the same flour on from a hand's height: it catches at the edge, burns, and leaves ash.
- **Wet a little flour and hold HEAT over it.** It goes buff, puffs a little cloud of steam and goes brown: "LOAF 118°".
  Keep holding: "charring 60%", then a black ember. Stop in time and a peasant comes over, waits for it to cool, and
  eats it in one go.
- **Bury dough in sand and heat it.** Nothing happens, and nothing, and it reads 300°, 400°, 500°. Dig it out: it bakes
  and chars in the same tick. The pressure-cooker loaf.
- **FLOUR on a pond** makes dumplings: dough, sinking. Water will not go past 100, so they never start to bake. Boil the
  pond dry and they go all at once.
- **The first batch is always burnt.** The new baker stokes it like a furnace, the loaves go black, the chamber smokes,
  the bell rings, the brigade arrives at a run and throws a pond at the oven, and some of it goes in the flour bin. The
  baker grumbles and makes dough of that. The next batch is fine.
- **The baker dies, or runs off to a fire**: somebody else is "the baker now", and their first batch is burnt too.
- **A TORCH in the firebox**: the fastest oven in the valley, a third of it black, and the bell ringing for the end
  loaves and not the middle ones.
- **A TORCH by the table**, or a lightning strike while the quern is going: the flour bin goes off.
- **Leave flour near the village.** Somebody pockets it: "what's this for?" A while later there is a bakehouse.
- **The ash**: a few batches in, somebody thinks of potash, and the fields come up twice as fast. You did not do
  anything. The bread did.
- **An old peasant at the water's edge throwing bread**, and every duck in the valley paddling over.

---

## 6. Determinism, saves, the rules kept

- **A plain village is exactly master's until bread is ready** (16,920 at the soonest in twelve seeds). `bkReady` only
  reads. Every new line on a path an old village walks is a test of a material it has none of (`P_FOOD`, `L_LOOSE`,
  `dTasty`, the dispatch range), a field it never set (`p.loaf`, `d.fullT`, `p.wspark` for bread), a site kind it never
  made (`bakehouse` in the blaze loop, tidy, `PL_UNDER`), or a `g.know.bread` gate. None rolls a die.
- **Between ready and thought**, the village is master's except for `wRand`: a bread spark or bread among the `fresh`
  list rolls `wRand` in `iEureka` (ideas.ts:356-360) where it would not have, so the great works' dice may run
  differently. Master's own `Math.random` is untouched until bread is thought of, when that eureka goes to bread
  instead of a master idea. The recorded checks all fall before 16,920: the 600-tick hashes of seeds 1, 3 and 7
  (test/valley.js:15-24), the fixture's `44ff922d` (:35), and seed 3's idea order and `03cf4e61` at 12,000
  (test/wonders.js:59-102). Tests that force `farm` and `masonry` and run long either hold `g.ideaT = 1e9` (as
  test/heavens.js:557) or are run in phase 2 and named if they move. Long soaks change after bread, as they did after
  storeys; the soak baseline is rerun.
- **`plain: true` keeps the great works asleep.** `iEureka` sets `g.wAny` for any fresh idea (ideas.ts:373), and
  `wStep` recomputes it every 30 ticks from wonders, concrete, stained glass and storeys only (wonders.ts:1416-1419). In
  8 of 12 seeds bread is the first fresh idea, so it would flip `g.wAny` on for up to 30 ticks and off again (sounds on
  the side dice, `heatTaken`, `wHotWork`, paths). v2 makes ideas.ts:373 `if (iFresh(idea) && !idea.plain)`. A bread
  village stays a plain village.
- **The dispatch** in `sandStep` (world.ts:1230-1231) gets `|| (v >= MAT.FLOUR && v <= MAT.BREAD)` on the powder test:
  one range compare, for non-STILL cells that are none of the eight before it.
- **The heat branch** (§2.2) is reached only by a DOUGH cell past its threshold. Old grids have none.
- **A sandbox** that never paints flour never has any of the three, and goes as it did.
- **Saves**: ids appended, never renumbered (`v < NMAT`: save.ts:274); the bakehouse is a site, saved as sites are, with
  `s.baker`, `s.grain`, `s.bakeT`, `s.pull` plain fields; `p.grain`, `p.loaf`, `p.bakes`, `d.fullT`, `g.bkFame` are read
  with `|| 0`, nothing at `gameInit`, so `saveApplyState` deleting absent keys (save.ts:483) costs nothing. A save taken
  mid-bake has its dough, embers, loaves and bin in the grid; the baker's next step is read off them. `lat` is saved
  with the grid, so a sealed dough keeps its bank. The brush is saved by name (save.ts:503) and FLOUR is appended after
  every brush, so recordings keep their rows (world.ts:111-112).
- **One screen and four**: nothing is gated on width; the bakehouse keeps to the village's range as the furnace does.

## 7. Performance

- Cells: the three cost what any powder costs, where they are. Flour checks its neighbours for HOT and water; dough and
  loaves fall, float and (dough, one tick in ten) slide. The bank branch is one compare past a rare threshold, plus
  three reads for a sealed dough.
- The village: the baker's work is one peasant's task, a few reads and at most one cell placed every 20 ticks. The
  spark is one compare per ear eaten. The blaze exemption looks only at a bakehouse with flames. No grid pass, no
  per-tick scan.
- A dust bang is a radius-3 `sandBoom` (49 cells); a stream of flour through a flame is a few a tick while it falls, as
  a stream of gunpowder (radius 6) is today. Phase 1 measures the worst case it can find (a 16-brush pour through a
  torch at 1088) against the spec's 9 ms p95 (docs/wide-valley-spec.md:306-311).
- Budget: plain 272 soak within 2% of harness/soak-baseline.txt; a forced bread village within 5%.

---

## 8. Phases

**Phase 1: the materials.** `MAT`, the padded tables, shades, flags, `sandPowder` branches, the dispatch range, heat
(`def`, `hi`, phase worth, `heatUp` cases, the bank branch, the :455 exclusion), acid, `sandBoom`'s dough line, picker
(MORE group, PICK entry, test/picker.js `NEW`, the MORE hover, game.ts:1346), `MAT_NAME`/`MAT_UP`, the draw branch,
eyedropper, glyphs, `P_FOOD`/`pEdible`/the eat value, `P_FLAM` (FLOUR, BREAD), `P_BANG` (FLOUR: nobody plans a site or
lights a fire by a flour heap: peasants.ts:1972, 1985, build.ts:528), `dTasty` with the duck at all three callers,
`dPeck`'s loaf, `L_LOOSE` flour. Shippable as a toy. Tip: "wet some FLOUR and HEAT it, gently. somebody will be along".

**Phase 2: the bakehouse.** bread.js (`bk*`, a `<script>` after platforms.ts, and in harness/loader.js's list), the
idea with `plain` and ideas.ts:373, the two sparks, `bkPlan`, the baker and the table of §3.4, the apprentice, the
hand-offs, the blaze exemption, `PL_UNDER`, tidy skip, `iPail`, `I_IDLE`, labels, readout, moods, feed lines,
`SITE_NAMES`, achievements, speech (`P_SAY.idea_bread`: "what if we ground the wheat first?", "wheat, but better",
"i've had an idea and it smells lovely"; `bake`: "in they go", "mind, it's hot", "smells about done"; `burnt`: "IT'S
BURNT", "the first batch is always burnt", "who was watching the oven"; `wetflour`: "who wet the flour"; `loaf`:
"still warm", "*crunch*", "better than the ear").

**Phase 3: bread in the village.** `p.loaf` and `bkSnack`, the `crumbs` task and `d.fullT`, the newcomer, the "lunch
down the mine" line. The §0.2 table rerun with the real bakehouse in place of the stand-in. README.

## 9. Tests (`test/bread.js`, one `require` at the foot of test/run.js)

1. **bread: a plain village never has it ready before 15,000 ticks, and the master checks hold** (seeds 1, 3, 7; the
   existing hash and idea-order tests run unchanged).
2. **bread: flour and water make dough where they touch, with the water's heat** (water at 50: dough at 68 ± 0.5; the
   flour cell is air; Σ heatQ over the pair unchanged).
3. **bread: dough on a hot plate bakes into a loaf and a puff of steam, and the books balance** (INERT box, Σ heatQ
   before and after, to float tolerance).
4. **bread: sealed dough keeps its bank, and its surplus is heat.** §0.5's box: stone at 180, 4000 steps: still DOUGH,
   T within [150, 151], `lat` at 1109 ± 2, unchanged over the last 2000; stone at 200 and at 600: `lat === heatLat`, T
   at 163 and over 500, Σ heatQ unchanged. Then the cell above opened: at 200, BREAD and a STEAM cell the next step,
   the books unchanged; at 600, an EMBER the same step.
5. **bread: a loaf past 280 chars; a burnt loaf in the chamber is a blaze, a coal in the firebox is not.**
6. **bread: flour poured through a flame goes bang; a heap set alight only burns** (`g.booms` counted).
7. **bread: the baker bakes a batch**: forced (`know` farm, masonry, bread; `bkPlan`; `sim.build`; 5 grain in the
   sack, coal on the furnace pile): an apprentice's five black, then five on the table within 1500 ticks, hearth mean
   under 280, ash in `g.found.ash`.
8. **bread: a hand-off**: the baker killed with dough in the oven; within 1200 ticks somebody else is `s.baker`, their
   first batch is burnt, the dough that was in the oven is baked or burnt, not lost.
9. **bread: the brigade wets the bin**: water dropped on the table; the bin is DOUGH; the baker kneads from it without
   a pail.
10. **bread: a hungry peasant eats a cold loaf off the table (−1800) and pockets another; a hot one is left.**
11. **bread: a fed duck eats a floating loaf and leaves wheat alone at the beak**: the duck stood in ripe wheat with
    `fullT` set, 600 ticks, no wheat gone and `g.raids` unchanged; the same duck without it, wheat gone.
12. **bread: a raw ear sparks bread only when it is ready, and never over another spark** (`p.wspark` "theatre" kept).
13. **bread: a bread village does not wake the great works**: bread thought of in a village with no other fresh idea;
    `g.wAny` false the same tick and 600 after.
14. **bread: FLOUR is in MORE under FROM THE FIELD, and the flyout fits** (and picker.js's own tests, with `NEW`).
15. **bread: a save taken mid-bake loads, and is the same village 600 ticks later** (as test/platforms.js:205),
    including a sealed dough's `lat`.
16. **Stalls**: harness/stuck.js scenarios, one per row of §3.4 that walks (pull, rake, stoke from the pile, water,
    grind, reap) with the walk blocked: the baker gives up and the shift ends inside 2400 ticks. Soak: `--preset rich`
    with bread given, seeds 1-6, 12,000 ticks, 272 and 1088: no stalls, the invariants, and harness/soak.js:39's
    inventory list given `grain: 5, flour: 6, loaf: 1`. Every new task kind carries `site`, so the `tasks` invariant
    (soak.js:43) needs no new names.

## 10. README, in the voice

After the leftovers (README.md:255-300):

> **Bread**: once they have fields and squared stone, and somebody has chewed their way through one raw ear too many
> (or found FLOUR lying about), they build a BAKEHOUSE: a little brick oven with a fire under its floor, a trestle table
> beside it with a quern on top and a bin underneath. The baker reaps a few ears, grinds them (the flour falls through a
> hole in the table into the bin), fetches a bucket of water, makes a dough of each cell of it, and lays five on the
> hearth. Then they keep a coal or two burning under it, with a hand on the hearth now and then. The dough soaks up the
> heat until the water in it boils off up the chimney, and what is left is a loaf; with nowhere for the steam to go, it
> just gets hotter. They put the loaves on the table to cool, and anybody hungry comes for one, and takes another for
> later. It is not better food than an ear, only food that keeps. A baker's first batch is always burnt: they stoke it
> the way you would a furnace, and the bell rings. The ash is raked out and goes into the store, which is how most
> villages find out about potash. Flour falling past a flame goes off like a firecracker, so mind the bin.

Things to try: "Pour FLOUR into a fire from high up. Then pour some in gently"; "Wet a little FLOUR and HEAT it,
gently. Then bury some and HEAT that"; "Paint a TORCH into the bakehouse's firebox"; "Paint one by the table, while
they are grinding"; "Throw a loaf in the duck pond". Files: "bread.js: the bakehouse, the baker, and feeding the ducks".

## 11. Risks

- **Bread arrives in villages left alone**, a median 6,800 ticks after masonry, and it changes the long game every soak
  sees: ash, potash and powder come where they did not. The soak baseline is rerun and the change written down, as
  storeys' was.
- **The baker is the stall risk.** Mitigated by reading the world each step, no stage kept on the task, three give-ups
  to a shift, the 1600 rule, and a stuck scenario per walking row. If a row still stalls in the soak it is cut, not
  patched: a baker who cannot reap waits for grain in the sack, filled by whoever else.
- **A brigade that douses every first batch** could be a nuisance in a big village. If it is, the apprentice's batch
  is two loaves.
- **The flour bang is a new way to make bangs**: half gunpowder's radius, and it needs flour in the air; a player
  pouring it by the screenful at 4x through a torch will find the cost. Measured in phase 1.
- **The hot sealed dough** is a new kind of hot thing a player can make by accident (dough under a loaf in a heap, held
  under HEAT). It is honest heat, conducted out like anything else's; at worst it chars the loaf on top of it.
- **The quern and the kneading are counters**, as smelting (mines.ts:998-1030) and mixing mortar are. The heat is real
  everywhere it is heat: the fire, the hearth, the boil, the steam, the bank, the char.

## 12. Where v2 parts from the review, and why

- **The bank cap**: the review said cap `lat` at the bank and hold T at 150. That deletes the surplus every tick; v2
  keeps it as temperature (§2.2). Test 4 asserts 150 where the heat only part-fills the bank, and the balance where it
  overfills it.
- **A need for bread**: the review is right that nobody is hungry. v2 measured it (§0.2) and does not invent one. It
  says in the README that bread is not better food, and puts the effort into making the bakehouse visible (§4.4).
- **A group of one in MORE**: kept (§2.3).

## Considered, and left out

- **The mill** (v1 phase 4): a wheel turned by a waterfall only the player can make (there are no rivers), a drawn
  wheel counting moved water cells, grain carried to it. Most players would never see it, and its one great moment,
  flour falling past a flame, is now in every bakehouse's bin. A later plan, if a waterfall ever turns up on its own.
- **A field on fire as the spark**: measured, fields do not burn (§0.1).
- **Bread going stale or mouldy**: loaves are eaten within a few hundred ticks; a clock on every loaf is a thing to save
  that nobody would see.
- **Salt in the dough, cakes with flowers in them, sourdough**: each a recipe, none a story.
- **A granary of grain cells**: the sack is a number, the table is the store.
- **A windmill**: there is no wind in the valley. A treadmill with a duck in it was discussed.
- **Painting LOAF or DOUGH**: two clicks of FLOUR away, and the village's to make.
- **Letting the cloner learn flour**: no free food. `t < MAT.PLANK` (world.ts:1183) already says so.
- **A cosy table** (eating together, twice the thinking): measured, it changed nothing (§0.2).

v1's review (8.5 / 8 / 8) is answered in the Status list above and in §12.
