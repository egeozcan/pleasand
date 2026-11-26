# Platforms: a plan

*The ground is full, and the roofs are full. So they make more ground.*

Status: **v5, built** (reviews: v1 5 / 6 / 8, v2 7 / 7 / 8, v3 6 / 6 / 8, v4 7 / 8 / 8). All three phases are in
(`platforms.ts`, its hooks, `test/platforms.js`: 15 tests). Iron legs were left out (§10). What the post-build
reviews changed is in §11. v5 took v4's review:

- **A deck carrying a house is never given up by any road**: `bFail`'s two give-ups ("walk" 24 times, "nothing" 6
  times) and `buildStep`'s 20,000-ticks-untouched give-up all skip it (`plCarries`), as `bInspect`'s ruin does. Tested:
  thirty failures of each, and 30,000 ticks untouched, and it is still there with its house.
- **`plTry`'s turn after `sTry`** is by the peasant's own `planCD` as it was before `sTry` ran this tick (`bPick` hands
  it over), not by `g.noStoreyT === g.tick`, which another peasant's failure could set. Nothing new is written on a
  peasant, so a storeys village is untouched.
- **`plFind`** works out what is under each column once per search: 36 ms in seed 1 at 60k (it was about 700).
- **ON STILTS** is had when the house on the deck is finished, not planned.
- At the hatch end of a deck, a flat's ladder would stand on the hatch: a house on a deck takes a flat at its far end
  only (§3.4).
- Walking off the end (§5) is measured in the soak, not pinned in a unit test: whether a given owner takes the ladder
  or the edge depends on what else is about (a hillside the far end meets, somebody in the way).

v4 (after v3's review, and the first forced runs of the code):

- **Three rows over a roof, twelve over anything anybody stands on** (v3's P0). Only `house`, `storey` and `lamp` boxes,
  and a grown tree's crown, are cleared by 3; every other site's box (a bridge, a field, a tower top, a cross, a well)
  and every other marked cell or log, by 12. The probe was rerun (§0.1).
- **The legs are lowered from the deck**, top down, every cell of them, once the deck is down (`rd` 29). So every leg
  cell, on the ground or on a roof, is in reach from the deck, to build and to mend; nobody stands on a roof under a
  deck. The phases no longer collide: ladder 10..90, deck 200, legs 300.
- **An inside ladder is flush with the deck's end.** The first forced run in seed 1 put one five columns in: the deck
  past it was a pocket, reached only by climbing up and stepping off the wrong side, and its owner went up and down
  that ladder for 12,000 ticks. Flush, there is no pocket.
- **Something just past either end in the way of the air over the deck** (a crown, say) raises the deck over it, up
  to three times, rather than refusing the span.
- The functions are `pl*` (ducks.ts has `d*`, and its `dStep`).
- The high street (§4) is phase 3, and `plFind`'s comment says so.

v3 (after v2's review), resting on a measurement (§0.1):

- **Placement was measured, and v2's geometry failed it**: in seeds 1, 3, 7 and 11 at 60k, v2's deck found a place in
  **none** of the one-screen valleys but seed 7. What blocked it, counted, and what v3 changes:
  - the ladder: a free three-column run to dry, nobody's ground, at one end of the deck, is rare in a packed valley.
    v3's ladder goes outside the near end **or up through the deck near it** (§3.1), and may be **40 rows** (a ladder
    is built from itself; only legs need to be in reach);
  - the legs: the ground under them is mostly somebody's. v3's legs may **stand on a house's roof**, a post on the
    ridge (as house stilts stand on the ground, solids do not fall here);
  - the deck: v2 refused the whole span over a tower, a lift, a well, a mine, the bell. Their boxes say how tall they
    are: v3 clears any box by 3 rows, and refuses only what is hot, goes up, looks up, or grows (§3.2);
  - its length: 19 to 31, so its ends can reach somewhere a ladder can stand;
  - bushes on the ground are walked through, and a grown tree's crown is cleared like a roof (only a sapling still
    grows: `saplingGrow`, build.ts:1305, turns the top to WOOD and stops).
- `sAnyHome` counts a deck going up, or waiting for its house, so its owner does not go over the hills (§5).
- The roof-sweep gate is `tNoSweep` (tidy.ts), named.
- A fire in the deck's box is the deck's and whatever is under it: **intended** (§3.5), and every unfiltered
  `bSiteAround(..., null, ...)` caller is listed and checked (§3.5).
- A deck carrying a house is mended, never given up; so the high street never loses its ladder deck to a fire (§4).
- `plTry` waits while a storey is going up; `p.underDeck` is cleared on waking.

---

## 0. Where this comes in (measured)

STOREYS (docs/storeys-plan.md §12) was measured unforced to 120k. What it left:

| valley | STOREYS | what went up | sleeping rough at 120k |
|---|---|---|---|
| seed 1, one screen | 36.8k | nothing: the one stone house has the furnace at one end and the bell at the other | 3 |
| seed 3, one screen | 32.0k | one flat | 3 |
| seed 7, one screen | 31.2k | one flat | 3 |
| seed 11, one screen | 40.0k | three flats | 1 |

At 60k (master at 64264fd) seeds 1, 3 and 7 each have three people sleeping rough, seed 11 one. The pressure is
there, and nothing answers it but over the hills.

### 0.1 Is there anywhere to put a deck (measured)

`plPlan` (§3.2) run read-only over every column, both ends, every width and both ladder kinds, on the saved villages
at 60k (`harness`, the probe goes in with phase 2 as `harness/playtests/decks.js`):

| valley | placements (v3) | (v4) | distinct house spots (v4) |
|---|---|---|---|
| seed 1 | 21 | 6 | 1 |
| seed 3 | 26 | 13 | 3 |
| seed 7 | 250 | 223 | 4 |
| seed 11 | 19 | 7 | 1 |

(v4: twelve rows over anything stood on, the inside ladder flush, the deck raised over what is just past its ends.)

**Forced, seed 1 at 60k** (PLATFORMS taught, the first homeless peasant given six logs): the deck (23 wide, 31 rows of
ladder coming up through its left end, one trestle leg, stonework) is done in 1,150 ticks, the house on it by
1,350 (a rich, idle village of eight, with wood to hand). Another homeless peasant at once puts a flat on the deck's
house, its ladder on the deck's spare columns. Then 20,000 more ticks: nobody stuck (`harness/stuck.js`), the longest
time anybody spent on one climb 231 ticks, three people sleeping in beds up there, six deaths, all old age (five
without the deck, in the same 20,000 ticks), and, everybody housed at last, three newcomers by word of mouth.

So every crowded one-screen valley has somewhere, and the decks are high: in seed 1, 39 rows of ladder over the
roofs, the picture that asked for this. What still rules a span out, most to least: a ladder's three columns hitting
somebody's anything (a house, a field, a bridge, a well, a scarecrow), a ladder over 40 rows, a leg with nowhere to
stand.

## 1. What this adds

1. **PLATFORMS**, a new idea. A level deck high on timber legs, over whatever is under it (roofs, a field, a pond,
   a well), reached by a ladder. A deck is a plot in the air: when it is done, whoever built it puts a house on it.
2. **TRESTLE**, a new material: cross-braced timber. Solid to sand and water, which settle on it; walked through by
   peasants, as they walk through a lift's girders. It burns like plank. The legs are made of it, and it is in the
   picker (MORE, under BUILDING): a support that does not wall anybody off. (And a trap: sand rests on it, peasants
   fall through it.) Done in phase 1, and the picker's tests pass with it.
3. **The high street.** A deck planned beside another is built at its row and runs on to meet it: one walkway, one
   ladder, houses along it.
4. **Under the boards.** Somebody with no home sleeps under a deck if one is near, and wakes without a backache.
5. **The quick way down** is off the end (or into the ladder's hatch): a fall of 34 rows or less does not even stun
   (peasants.ts:823), and the pather knows it (paths.ts:84). Up by the ladder, down by gravity.

## 2. The idea

```
{ id: "deck", fresh: true, name: "the platform", title: "PLATFORMS",
  sub: "no ground left, and no roof that will take a floor. so make some ground",
  hint: "storeys with nowhere left to go, and a night on the ground" }
```

- **Ready** (`plReady`): STOREYS is known; the village is crowded (`sCrowded`, storeys.ts:100); and no storey could be
  planned lately (`g.noStoreyT`, storeys.ts:238, within `S_CROWD_T`).
- **Spark:** in `bWake` (build.ts:1172), beside STOREYS':
  `if (rough && g.know.storey && !g.know.deck && !p.wspark && plReady(g)) wSpark(g, p, "deck")`.
- `fresh` (side dice, `wRand`), a plain idea. (`wAny` is set already once STOREYS is known, wonders.ts:1417.)

## 3. A deck

A site of kind `"deck"`. Not a dwelling (`sDwelling` false), never in `bHouses`.

### 3.1 Geometry

```
  row                          (a 23-wide deck, its ladder inside the right end)
  P-16  .........................     <- air over it: the house's room and roof, and a row to spare
  P-1   ....D.........D..........
  P     =================LLL===      deck xa .. xb; the ladder comes up through it (LLL)
  P+1   TT               LLL  .
        TT      .#.      LLL          legs: two columns of TRESTLE; this one stands on a house's ridge
        TT     .###.     LLL
  G     TT    #.....#    LLL
```

- **The deck** is row `P`, columns `xa .. xb`, `W = xb - xa + 1` one of 19, 23, 27, 31. BRICK if the village knows
  masonry and `bStoneToHand(g) >= 30`, as for a house; plank otherwise.
- **The house** goes at the far end from the ladder: `hx0 = xa + 4` when the ladder is at the right end, `xb - 14` when
  at the left. Four columns of deck either side of it: room for its doors, and for a flat's ladder later.
- **The ladder** (`d`: -1 left end, +1 right end), three columns (aux 0..2, as `bLadderPlan` makes them), written
  inline as `sPlan` writes a storey's (storeys.ts:171). Either:
  - **outside** the near end (`xa-3 .. xa-1`, or `xb+1 .. xb+3`), from the ground up to row `P`; or
  - **inside**, up through the deck's last three cells at the near end (`cx = xa + 1`, or `xb - 1`): those three
    cells at row `P` are LADDER, a hatch. Never further in: deck past the hatch would be a pocket (status, v4).
  
  Either way its top is row `P`: the climber stops at `P - 1`, and `bStepOff` lands them on the deck beside it
  (`LADDER` is `P_PASS`, so not solid; the deck under the landing is). At most **40 rows** from `P` to its foot. Its
  three columns are air (or loose, dug), nobody's, dry, down to solid ground; ten rows of air over its top. No other
  step-off on the way up: every column two out from it that is not the deck is nobody's from `P - 10` to its foot
  (storeys.ts:183's rule).
- **The legs** are two columns of TRESTLE from `P + 1` down to what they stand on, at most **36 rows** (28 in v5; §11): dry ground
  that is nobody's, **or the top of a finished house's (or a flat's) roof** (`plRoofAt`: a plank or stonework cell in
  the house's box at or above its ceiling, with air over it). On a gable the two columns' feet may be a row apart: the
  leg is stepped. The ladder holds up the stretch it stands in; a leg goes
  under the far end, and wherever a clear span would be over 17 columns, moved up to five columns inward if it must (past a trunk, say).
- **The site carries** `P`, `xa`, `xb`, `F = P`, `hx0`, `lad` (the ladder's middle column), `fy` (its foot), `d`,
  `inside`, `joins` (§4), `house` (the house on it, once there is one).
- **Box:** `[min(xa, ladder), P, max(xb, ladder), lowest foot - 1]`.

### 3.2 Where it goes

`plTry(g, p)`, in `bPick` straight after the storeys' calls (build.ts:1110): `if (g.know.deck && plTry(g, p)) return true;`.
It runs when `p.planCD` is 0, or when `g.noStoreyT === g.tick` (`sTry` has just failed for this peasant and set
`planCD`), and wants all of:

- PLATFORMS known, the village crowded, no storey going up (`sGoingUp(g) === 0`), no other deck going up,
  `bOpenCount(g) < B_OPEN`;
- `p` has no home and no site of their own, and `bWood(p) >= 2`.

`plFind` tries every `xa` within 70 columns, both ends, every width, both ladder kinds. For each, `plPlan`:

- the deck row `P` is the lowest row (largest y) that clears what is under every column of the span (`plTop`):
  - over a roof (the box of a `house`, a `storey` or a `lamp`), or a grown tree's crown: **3 rows** (nobody stands up
    there);
  - over anything else: ground (bushes are walked through), a log, water, any other site's box: **12 rows** (somebody
    stands there: on a bridge, in a field, on a tower's top, by a cross);
  - a sapling (it will grow), fire or anything hot, or a site of a kind a deck never goes over: no deck. Those kinds:
    `foundry` and `furnace` (hot, smoking), `moonrocket` (goes up), `observatory` (looks up), `lighthouse` (shines
    up), `heap` (grows), and another `deck` (except the one it joins, §4);
- `P - 16 >= 10`, and rows `P - 16 .. P`, columns `xa - 1 .. xb + 1`, are air and nobody's;
- the ladder and the legs fit (§3.1).

**The best** scores `tall + (W - 1) * 0.5 + |house middle - planner| * 0.15` (`tall`: rows from the deck to the
lowest foot), lowest first; one that meets a deck already there (§4) before any other. A deck that a street could be
run on from (`plStreetReady`: `plJoin` on it, as if it were built) scores 10 better; and each candidate is tried again
up to 8 rows higher (`plStreetRow`) if that is what it takes for one run on from it to clear what is under it there.

Nothing: `g.noDeckT = g.tick`, `p.planCD = 2400`.

### 3.3 How it is built

Phases (`bNext` builds the earliest with work left):

1. **10..90: the ladder**, rung by rung from its foot (a phase a rung, `10 + min(80, fy - y)`). An inside ladder's
   top three cells, at row `P`, are its top rungs.
2. **200: the deck**, outward from the ladder's top, a cell at a time (`LADDER` is `SOLID`, so the first is
   `bSupported`; each next is beside the last). Builders stand on the ladder, then on the deck, as on a bridge.
3. **300: the legs**, lowered from the deck, top down, each cell under the last (supported by it), with `rd: 29`
   (`bReach` takes a per-entry reach, build.ts:230): a builder kneels at the edge and lets the next length down.

Every leg cell is reached from the deck, to build and to mend, wherever the leg stands.

**Cost:** a board a deck cell (or half a stone in brick), a board a row of leg, a third of a board a rung. A 23-wide
deck, 26 rows of ladder, two legs of 20: 23 + 40 + 9, about 72 boards. Dear; it should be.

### 3.4 Finished: a house on it

`bPlanHouse` is split: `bPlanHouse(g, p)` finds the plot with `bPlot` as now, and calls
`bHousePlan(g, p, x0, F, dig, fill, opts)`, which makes the plan and the site. Nothing changes about what rolls when
(the blanket's `irnd(5)` and `irnd(42)`, in the same order): a plain village plays hash for hash.

When a deck is done (`plFinish`), its owner (or, if they are gone or housed, the nearest peasant with no home) gets
`bHousePlan(g, q, hx0, P, [], [], { deck: s.id })`:

- **no floor entries**: the deck is the floor; the house carries `deck: deckId`, and the deck `house: houseId`;
- everything else is a house's: doors, ceiling, gable, bed, lanterns (`iPlanLamp`), lit window, alarm, brigade. It is a
  `"house"`, so a flat can go on it later, its ladder standing on the deck's four spare columns at the far end from the
  deck's ladder (at the near end, they are the hatch's or the ladder's) (`sPlan`'s checks hold:
  the foot is the deck, the outer-column check stops at `P - 1`);
- it is not held to `B_HOUSES` (build.ts:1104), so **`bHouses` may exceed `B_HOUSES`**. Who reads it: `sCrowded` and
  `sPlotCheck` (crowded by the cap: right, the ground is full), `sAnyHome` and `bPick`'s ground-house gate (no more
  ground houses: right).

Feed: *"Wilma is building a house on the platform"*. The first: achievement *ON STILTS*, "a house on legs. the ducks
walk under it".

### 3.5 Upkeep

- **Inspect and repair** as any finished site, by the phases above.
- **Never given up while it carries a house**, as a floor with a flat on it is not (build.ts:1047). A deck with no
  house yet that is ruined or forgotten is removed as any site is.
- **A house whose deck is gone** (removed before the house is done) is removed with it, every 30 ticks, as a storey
  goes with its base (storeys.ts:350): its owner loses their home, its cells stay, the feed says *"the house on the
  platform went with it"*.
- **Fire.** A leg is timber all the way up: fire at its foot runs up to the deck. A fire anywhere in the deck's box is
  a fire at the deck (`iFlames`, ideas.ts:660, reads the box): so a fire in a house under a deck is a fire at both,
  and the brigade answers both, which is **intended**: the deck is over it, and is next. A plank deck over a burning
  house catches; a stone one does not, which is why a masonry village builds them in stone. Nobody climbs a deck's
  ladder into a fire, and somebody about to climb down one with fire at it jumps (OUT THE TOP DOOR): `sLadderHot`,
  `sIsLadder`, `sOnLadder` and `sLeapOff` (storeys.ts:477–520) read `"storey"` or `"deck"` sites; the deck carries the
  fields they read (`lad`, `F`, `fy`, `d`).
- **Under it, kept clear**, by the box: every unfiltered `bSiteAround(..., null, pad)` caller now finds the deck over
  the ground under it. Each, checked:
  - refusals, which are right under a deck: a campfire (peasants.ts:2013), a cross (leftovers.ts:245), a snowman
    (leftovers.ts:485), sand dug for sandcastles (leftovers.ts:1144), a bush cut back (tidy.ts:495), the heap
    (tidy.ts:555), a puddle bailed (tidy.ts:868), a street lamp's post (ideas.ts:1620, 1774), a jetty (ideas.ts:1403),
    a fishing spot (ideas.ts:1838), a scarecrow (ideas.ts:1676), a sapling (build.ts:1276), a great work's place
    (monuments.ts:969), a shooting star's landing (heavens.ts:1793), a sweeper's rest (tidy.ts:1443, 1455);
  - **lookups that want a roof**: tidy.ts:1022 and 1058 skip `"deck"` sites, and `tNoSweep(s)` is true for a house or
    flat with a deck within 9 rows over its roof (nobody can stand there to sweep it). Sand on those roofs stays.
  - a forest sapling (`bPlantOk` with `loose`) is refused under a deck too.
- **Iron legs**: left out (§10).

## 4. The high street

A deck can be **run on** from the end of a finished deck away from its ladder (`plGrow`: `-d` for a deck with a
ladder; for a deck that was itself run on, the way its street grows). The new deck (`plJoin`) is 19 to 31 wide, starts
against that end, is **at that deck's row**, and has **no ladder** (`lad = -1`): the way up is the first deck's. So a
street grows away from its one ladder: ladder, house, walkway, house, walkway, house.

- §3.2's clearances hold for its span; the air over it is checked as for any deck, the old deck's own end cell
  excepted. It is never raised: it is at the street's row or it is not run on at all.
- Its near end is held by the old deck's far-end leg; its own legs as §3.1 (`plLegs`, the same as any deck's).
- Its house goes at its far end, away from the old deck.
- **Its box is its span** (`[xa, P, xb, lowest foot - 1]`) and it has **no ladder entries**: no ladder terms in either
  (a ladder column of -1 would put the box's left edge off the valley). Tested.
- Its deck cells go in outward from the old deck (phase 200), the first against the old deck's end cell.
- `plFind` scores any deck that can be run on first, ahead of every deck that stands alone.
- Each records the deck it was run on from (`joins`); the hover says *"THE HIGH STREET: 3 PLATFORMS, 2 HOUSES"*
  (`plNote`). The first one finished: achievement *HIGH STREET*.
- **A street cut.** One deck goes up at a time, so a deck is only ever run on from a finished one, and a deck that
  carries a house, or that the street runs on from to a deck that does (`plCarries` walks `plNext`), is never given up
  (§3.5): the houses along it have no other way up. A deck removed (`bRemove`) leaves its cells, so a street with a deck in
  it given up before its house went up keeps its boards and its ladder: they are only no longer mended. Nothing more
  is done about it.

## 5. Living on it, and under it

- **Up** the ladder. **Down** off the end, or into the hatch: the pather's drop is cheap to 34 rows (`3 + d * 0.25`),
  a ladder is dear (`2 + d * 1.2`), and a fall of 34 or less does not stun. Over 34, the drop costs 40 more and they
  take the ladder. A far end that meets a hillside is walked off level. The one going off the end, now and then (side
  dice, one in four, at most once in 600 ticks each) says *"WHEEE"*, *"shortcut!"*, *"the ladder's for visitors"*.
  How often the edge wins over the ladder is in the soak (§11).
- **On it**, now and then (one in a hundred, every 30 ticks): *"don't look down"*, *"it sways, you know"*, *"i can see
  your roof from here"*. Exploring (`explorePick`) already prefers somewhere high.
- **Under it** (`plUnder`, from `bTaskSleep` for somebody with no home): a finished deck within 60 columns, a spot in
  its span with ground and `navStand` room (at least ten rows under the deck: never over a roof, which has three),
  not on a leg or within two of the ladder. They go there, nap (`p.underDeck`), and say *"under the boards again"*,
  *"at least it's dry"*, *"somebody's walking on my ceiling"*. Waking there (`bWake`) is not a night on the ground:
  no *"backache"* (no `Math.random` rolled for it), no rough-sleep sparks; *"slept like a plank"*. `p.underDeck` is
  cleared on waking. Nowhere to go, or no way there: they nap where they stand, as before. `p.roughT` keeps counting.
- **Up and down.** The household of a house on a deck and of a house whose box lies under the deck's span (not a
  stack: `sNeighbours` is not used) talk now and then when both are home (side dice, one in fifty, every 30 ticks):
  *"mind your heads down there!"*, *"who's that walking about up there"*, *"you're dripping on my roof"*.
- **Over the hills.** `sAnyHome` (storeys.ts:585) is true while a deck is going up, or a finished deck has no house
  on it: its owner does not leave while there is a home coming.

## 6. TRESTLE, the material (done)

`MAT.TRESTLE = 54`, appended. `SOLID`, `STILL`, `WOODY` (world.ts), `P_PASS` and `P_FLAM` (peasants.ts), a plank's
heat capacity and ignition, burns to embers (heat.ts), its colours (world.ts `SAND_SHADES`), a lattice drawn in
game.ts (posts at the edges of a leg, braces crossing between, the gaps see-through, as the girder's are), and a
PICK entry with `more: "build"`: *"timber legs, cross-braced. peasants walk through it. sand and water do not. it
burns."* Its name comes from the PICK entry, so saves keep it by name. The flyout grew a row; test/picker.js was
updated for its new last brush, and all twelve picker tests pass. Nothing climbs it: the climbing code looks for
`MAT.LADDER`.

## 7. Determinism, saves, the rules kept

- **A plain village is master's**: PLATFORMS needs STOREYS, which needs masonry, past every recorded check. TRESTLE
  is appended to `MAT` and to the end of `PICK` (after every brush, so recorded clicks keep their rows).
- **A storeys village is master's until PLATFORMS is ready.** `plReady` only reads; nothing rolls for it until it is
  true. `g.noDeckT` is written without a roll.
- **After the idea**, everything new rolls `wRand`, except what extends existing code (a deck house's blanket,
  `irnd`), which is past every recorded check by then.
- **Saves**: decks are sites; new fields load with defaults.
- **One screen and four**: nothing is gated on width.

## 8. Tests (`test/platforms.js`)

1. Seeds 1, 3, 7: plain to 30,000 ticks, the same hash as master. Seed 3 with STOREYS forced at 20k, to 40k: the same
   hash as master up to the tick PLATFORMS is first ready.
2. TRESTLE: sand settles on painted trestle, water stops on it, a peasant walks through it, it burns, saves and loads
   by name, is in MORE under BUILDING (done: picker tests).
3. Forced, seed 1 at 60k: a deck is planned, built (ladder, legs, deck), and a house goes up on it with no floor of
   its own; the owner climbs the ladder, goes in at a door, sleeps in the bed, and **comes down off the end** at least
   once. Nobody stuck (`harness/stuck.js`), nobody dead. Both an outside and an inside ladder (seed 7 has both).
4. Placement: the probe of §0.1 as a test, pinned at "at least one spot" in seeds 1, 3, 7, 11; every deck clears a
   box by 3 rows, open ground by 12; no leg longer than 36 rows; no ladder longer than 40; a leg on a roof only on a
   finished house's top.
5. The high street: a second deck near the first's far end is at its row, meets it, has no ladder, and its house's
   owner gets home up the first deck's ladder.
6. A flat on a deck house: planned, built, its ladder on the deck, reached.
7. Fire at a leg's foot: it runs up; the brigade answers; nobody climbs the deck's ladder into it; it is mended.
8. A deck removed before its house: the house goes with it, its owner homeless; a joined deck beyond it gets a ladder
   of its own (or is given up when none fits).
9. Under the boards: a homeless peasant sleeps under a deck, wakes without "backache", sparks nothing of rough
   sleeping.
10. No campfire, sapling (both kinds), heap or cross under a deck; a roof under a deck is not swept.
11. The deck's owner does not go over the hills while it is going up.
12. A peasant falling off the end over an outside ladder falls through it (it is `P_PASS`) and lands at its foot.
13. Save and load in the middle of a deck going up: the same hash after 600 more ticks.
14. Soak: seeds 1, 3, 7 one screen and 7 four screens, STOREYS and PLATFORMS forced at 20k, to 90k: no invariant
    broken, nobody stuck on a ladder, every deck done or given up, sleeping rough recorded against §0.

## 9. Phases

1. **TRESTLE** (§6). Done.
2. **The deck** (§2, §3), the house on it, giving up, `sAnyHome`. Tests 1, 3, 4, 7, 8, 10, 11, 12, 13. Commit the probe.
3. **The high street and living with it** (§4, §5, iron legs if cheap). Tests 5, 6, 9, 14. README: the idea, the
   material, things to try:
   - *"Let a one-screen valley run past storeys. Then look up"*
   - *"Set fire to the foot of the leg that stands on somebody's roof"*
   - *"Paint a trestle across a gorge and pour sand on it. Then send somebody across"*

## 10. Considered, and left out

- **Iron legs.** A finished deck's trestle done over in girders once the forge is known would need a renovation of its
  own (`mRenovate` does houses), and a `redo` case in `bFree` for trestle. The legs burning is the deck's drama, and
  its weak point: kept.
- **Decks off a hillside, with no ladder.** Measured: in the four valleys at 60k, no span both meets a bank level with
  it and clears what is under it. Left out.
- **Fields on decks.** Roof gardens already put a field in the air.
- **Decks without a house.** The village does not build what it does not need. (A player can paint one.)
- **Rails.** They would stop the walk off the end: the fun of it, and the cheap way down.
- **Load-bearing physics.** As storeys: solids do not fall. The legs are a builder's rule.

## 11. As built: what the reviews after it found, and the numbers

**Correctness review** (no P0): determinism against HEAD clean (seeds 1, 2, 5 to 100k, hash for hash, until storey is
known and the village crowded: the deck idea is a fresh one, and joins `iEureka`'s list there, as storeys did); saves
clean; no name collisions. Its P1, fixed: **a street cut** (the first deck's house burnt and removed, then the deck,
while a deck run on from it still carried a house: stranded, its owner homed to a house nobody could get to).
`plCarries` now counts the houses further along the street. Tested. Its P2s: `p.underDeck` left set by a nap cut short
(cleared in `bNap`); `plFind` 37-55 ms (the row and the air over it are now worked out once for both ends and both
ladder kinds: 34 ms at 272 wide, 50 at 1088, with the street checks added).

**Gameplay review** (consistency 8, design 7, entertainment 7). Its P1s, fixed:
- **Wheat in a ladder's columns** stalled a build 3,750 ticks: `plFoot` walked through every `P_LEAF`, but only bushes
  and flowers are dug. A crop or wheat now refuses the column. Tested.
- **The high street never happened** in ten runs: the next stretch along stood higher than the first deck, or its legs
  had nowhere to stand within 28 rows, or met a trunk. Now: the street bonus and the raise (§3.2), legs to 36 rows,
  a leg shifted up to five columns. Forced, seeds 1 and 7 both run on from the first deck.
- **The idea with nowhere to build it** (seed 11): `plReady` now also wants somewhere for a deck near somebody
  sleeping rough (`plSomewhere`: `plFind` for up to three of them, looked for once every 3,000 ticks).

**Soaks** (knowledge forced at 20k, to 90k, 272 wide): nobody stuck (`harness/stuck.js`), no deaths but old age, worst
climb 1,007 ticks.

| seed | decks | first deck | its house | rough sleepers, mean | down the ladder |
|---|---|---|---|---|---|
| 1 | 1, with a house | 25.5k | 27.2k | 0.71 | 10 |
| 3 | 1, house waiting for wood | 45.5k | (90k: not yet) | 2.21 | 12 |
| 7 | 2, both with houses (176 columns apart: too far to join) | 22.0k | 22.8k | 0.59 | 16 |
| 11 | none: nowhere near anybody | | | 0.69 | 0 |

Seed 3's house waits on wood, the base game's "WAITING FOR WOOD": nobody in the valley has a log while the moon rocket
is going up, and given the owner ten logs it is done in 4,000 ticks.


**Round 2 and after.** The correctness review's round 2 found no P0 or P1 (its P2s: a wake line after a nap cut
short and then a bed, fixed; `plSomewhere`'s 20 ms once every 3,000 ticks, kept). The gameplay review's round 2
(8 / 7.5 / 7) still never saw a join in twelve runs: what is just past a deck's far end stands higher or lower than
it, and a homeless peasant with two logs is rarely about while the deck stands finished. So:
- **A join steps** (`plJoin`, `PL_JOIN_ROWS`): at the deck's row; else 1 to 3 rows up or down, with a riser of the
  new deck's own in its near end's column (walked up and down as any step is); else 4 to 12 rows, with a short
  ladder between them (`plJoinLadder`): up, standing on the old deck's last three cells, built from the bottom;
  down, hung from beside the old deck's end over the new one's first three cells, built from the top (`rd`). The
  nearer the old deck's row, the better it scores. Tested both: the village builds it, and its owner goes up to bed
  and comes down again.
- **A join needs no wood to start** (`plFindJoin`): somebody homeless with under two logs plans only a join, looked
  for once every 300 ticks for the whole village (`g.plJoinNo`), so their own `planCD` stays their house's.
- Measured: eight soaks (seeds 1, 3, 7, 11, 13; two extra homeless every 6k or none). A join happens in some runs
  (seed 7 with extra homeless: a deck run on 4 rows up, by a ladder), and in most not: it wants a homeless peasant
  near a finished deck at the moment empty air runs on from its far end. The README says "now and then".

**Rounds 3 and 4.** A deck's ladder burnt down under a heap of ash (a field fire) was never put back: the bottom rungs
were out of reach from the top of the heap, and a deck with a house is never given up. Now a deck's rungs and legs
are driven in through loose stuff (`drive`: dug out, a cell of ash only slumps back into the hole, for ever) and
reached down to `PL_DIG` (10) rows; a rung deeper under a loose heap than that waits (`plTrim`: `e.off`, renewed
while it is buried), and is put back from the foot up once the heap goes. Tested: a 7-row ash heap (it slumps), and a
12-row heap of packed snow, cleared afterwards; measured over heaps of 7 to 12 rows, ash and sand, seeds 1, 3, 7:
mended in 450 to 1,300 ticks. `plStreetReady` looks at the step rows only (`PL_STEP_ROWS`): `plFind` 45 ms at 272
wide, 73 ms at 1088. Left: the fire rules do not cover a hop's ladder (a joined deck's `lad` is -1); it is twelve
rows at most.

**Round 5: no P0 or P1 from either review.** Gameplay 8.5 / 8.5 / 7.5: the dig-and-refill loop gone, rungs put off
under a heap come back once it is cleared (seeds 1 and 7, ash and sand, 10 and 12 rows: in 1,590 to 1,830 ticks), legs
driven through sand look right, and in a forced soak a high street grew on its own (seed 7). Correctness: no flapping
of done and repair while a heap stays; `off` saved; `drive` changes only the dig-first choice, and nothing loose that
can be dug is a liquid. Its P2, fixed: a rung put back drops its `off`, so a later shallow heap is dug through, not
waited on. And the lines up there are said three times as often (`plChatter`: on a deck 0.03, over and under 0.06,
every 30 ticks), the best of it being rare enough as it is.
