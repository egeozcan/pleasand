# Storeys: a plan

*No room left on the ground. There is always room on top.*

Status: **v5, approved** (reviews: v1 5 / 5 / 6, v2 7 / 6 / 7, v3 7 / 7 / 8, v4 **8 / 8 / 8**). v5 takes the v4
review's P1s: a storey hangs its own lantern (the ground floor's on that end comes down for good); washing lines
do not go to street lamps (their tops are too low); a first storey's window is blocked by the second storey's
ladder; posts are among what can stand against a ladder end; glass windows glow too.

v4:

- **Every storey has its own door and its own outside ladder, on alternate ends**: the first storey's up one end
  wall, the second storey's up the other. The only inside ladder is the roof garden's, from the top floor up
  through a hatch to the roof. So no two ladders share columns, every ladder has one foot and one top, and every
  flat has a door to the outside to get out of in a fire.
- **The pather will not climb a storey's ladder into a fire**, and the bell planner leaves stacks alone.
- **Washing lines** go from an upper window to whatever faces it: another stack's window, a street lamp, a tree.
  A glass window stops a fire that a shuttered one lets in.
- The §5 trajectory is marked provisional, and §11 is brought up to date.

v3 (after v2's review): one ladder per floor, the `bStony` bearing rule, the field-cap trigger for roof gardens,
the tower dropped, the bell's and the furnace's houses skipped, the strip `bOk` rule, a housewarming.

v2 (after v1's review) moved the way up outside, made crowding count the cap, measured the hunger gates, specified
gardyloo, gave leaving its own removal, added roof gardens and `LINEN`, and cut the concrete fourth floor.

---

## 0. What we are working with (measured)

Headless, master at ca917ed (`harness`; the scripts go in with phase 1 as `harness/playtests/crowding.js`), to tick
60,000:

| valley | masonry known | houses (huts incl.) | sleeping rough, all game | fields | mean hunger |
|---|---|---|---|---|---|
| seed 1, one screen | 20.9k | 5 | 3 | 3 → 2 | 1,420 |
| seed 3, one screen | 26.6k | 4 | 4 | 3 → 2 | 1,500 |
| seed 7, one screen | 25.1k | 4 | 4 | 3 → 2 | 1,500 |
| seed 7, four screens | 26.8k | **6 (the cap)** | 2 | 3 | 1,770 |
| seed 3, one screen, 16 people | 19.7k | **6 (the cap)** | 10 | 1 | 3,290, 3 starved |

Hunger, ticks 20k–60k, in forty windows of 1,000 ticks: how many windows had **nobody over 5,000**:

| seed 1 | seed 3 | seed 7 | seed 1, 12 people | seed 3, 16 people |
|---|---|---|---|---|
| 40 | 37 | 36 | 21 | 6 |

(Over 2,500, `P_HUNGRY`, is every meal: it is when they *start* walking to the wheat. Over 5,000 is going without.
In the 16-person valley, most people spent 12,000–20,000 of those 40,000 ticks over 5,000.)

What that says:

- **The pressure is already there.** Eight people start in a valley. One screen has plots for four or five houses,
  the two old huts among them. Three or four sleep on the ground all game and say "backache" every morning.
- **Land is the limit.** On one screen `bPlanHouse` runs out of plots before `B_HOUSES` (6). In a wide valley, or a
  crowded one, the cap stops it instead, and `bPlanHouse` is never even tried (build.ts:1089). Either way somebody
  is homeless with nowhere to build.
- **Food is the second limit.** A bigger village on the same ground goes without, then starves. Any growth has to
  stop when food runs short.
- **Masonry comes at 20–27k ticks.** Every recorded plain-village check ends by 12,000 ticks (`test/wonders.js`,
  `test/valley.js`).

## 1. What this adds

1. **Up: STOREYS.** A new idea. An upper floor goes on top of an existing house, with its own household, bed,
   window and door. Each storey's door is reached by its own ladder up the outside of an end wall: the first
   storey's up one end, the second's up the other. Any house takes one storey; a stone house with a stone storey
   takes a second.
2. **On top: ROOF GARDENS.** A new idea. A stack that is as tall as it will get gets a flat roof
   with a parapet and a bed of sand: a little field five wide, up in the air, that does not count against the
   fields a village keeps.
3. **In: word gets round.** Once STOREYS is known, a valley where everybody has a roof and nobody has gone without
   for a good while draws a newcomer now and then. That keeps the storeys going up. It stops when the roofs or the
   food run out.
4. **Out: over the hills.** Somebody homeless, lean, with nothing that could house them, packs a bundle on a stick
   and walks out of the valley for good. Now and then a letter comes back.
5. **Between: washing lines.** Two upper doors facing each other across a gap get a line strung between them, hung
   with washing. Laundry is `LINEN`, a new material. It burns fast, in flames, and a fire walks along it from one
   stack to the next.

Up is the feature. In and out are the pressure that drives it and the valve that keeps it honest. Roof gardens are
the food side of building up. Washing lines are what a crowded street looks like, and its new fire risk. All of it
is gated on STOREYS being known (§8).

## 2. The ideas

```
{ id: "storey", fresh: true, name: "the upper storey", title: "STOREYS",
  sub: "no room left on the ground. there is always room on top",
  hint: "a night on the ground, with nowhere left for a house, and squared stone" }
{ id: "roofgarden", fresh: true, name: "the roof garden", title: "ROOF GARDENS",
  sub: "a field is only sand and sky. a flat roof has both",
  hint: "storeys, and no room for another field" }
```

**STOREYS.**
- **Ready** when all of these hold:
  - masonry is known (its own line is "squared stone stacks higher than wood ever did");
  - there is a finished house that is not a hut;
  - the village is *crowded*: somebody alive has no home, and either `bHouses(g) >= min(B_HOUSES, alive)` or a
    `bPlanHouse` failed in the last 6,000 ticks (`g.noPlotT`, set where build.ts:1091 sets `planCD`).
- **Spark:** whoever wakes from a night on the ground (`bWake` with `rough`, build.ts:1148) while it is ready gets
  `wSpark(g, p, "storey")`.

**ROOF GARDENS.**
- **Ready** when all of these hold:
  - STOREYS is known;
  - there is a stack that can grow no further (§3.2);
  - the village is short of fields: either `iPlanFarm` found no room in the last 6,000 ticks (`g.noFieldT`, set
    where ideas.ts:411 sets `planCD`), or the village is at its field cap (`iFields >= min(4, ceil(alive/3))`,
    ideas.ts:408) and somebody has been over 5,000 hunger in the last 6,000 ticks (`g.leanT`, §5).
- **Spark:** whoever failed to plan that field; or, at the cap, whoever is hungriest when it is checked (every 600
  ticks, with no roll).

Both ideas are `fresh`: in `iEureka` they go on the great works' side dice (`wRand`), never master's lottery. They
are plain ideas (not `wonder`) and count under IDEAS. `"storey"` and `"roofgarden"` join the `wAny` line in
`wStep` (wonders.ts:1401), so that `g.wAny` is set from the tick either one is known.

## 3. A storey

A storey is a site of a new kind, `"storey"`. It sits on a finished house, or on another storey: `s.base` is that
site's id. It has an owner, a bed, an interior, a window, a door in one end wall, and an outside ladder up to that
door. It is not a `"house"`:

- it never counts against `B_HOUSES`;
- `iPlanLamp` puts no lantern by its door: the storey's own plan has one (§3.3);
- `bPlot` and every "is this a house on the ground" check keep meaning houses.

A house and its storeys is a **stack**. `s.top` is the id of the topmost floor of that stack.

### 3.1 Geometry

The house as it is (`bPlanHouse`, build.ts:441), floor at row `F`, columns `x0 .. x1 = x0 + 10`. Here the first
storey's ladder is on the right (`d = +1`), and so the second's is on the left; everything mirrors for `d = -1`:

```
 the house (master)                 two storeys on                   row
                                       .....#.....                   F-36  ridge
                                       ...##W##...                   F-35  gable, windows at x0+5
                                       .####W####.                   F-34
                                       ###########                   F-33  the second storey's ceiling
                                       D.........#                   F-32  \
                                       D.........W                   F-28   | the second storey: door at x0,
                                    LLLD..bbb....#                   F-23  /  window at x1 (C-5), bed x0+3..5
                                    LLL###########                   F-22  the first storey's ceiling = its floor
                                    LLL#.........D                   F-21  \
                                    LLLW.........D                   F-17   | the first storey: door at x1,
                                    LLL#...bbb...DLLL                F-12  /  window at x0 (C-5), bed x0+3..5
 F-14  .....#.....   ridge             (stripped)
 F-13  ...##W##...   gable             (stripped)
 F-12  .####W####.   gable             (stripped)
 F-11  ###########   ceiling        LLL###########LLL                F-11  the house's ceiling = the first storey's floor
 F-10  #.........#                  LLL#.........#LLL
 F-1   D...bbb...D                  LLLD...bbb...DLLL                F-1   ladders: x1+1..x1+3 to F-11, x0-3..x0-1 to F-22
 F     ###########                     ###########                   F
```

(Rows of air are left out. A ladder's top row is the floor it serves, so its climber stands one row above it, in
that storey's doorway.)

Exact rows, for a storey on a floor whose ceiling row is `C` (`C = F - 11` on a house):

- The storey's floor is `C`. Its room is `C-10 .. C-1`, ten rows, the ground floor's headroom.
- Its ceiling is `C - 11`, and its gable is `C-12 .. C-14`, exactly as the house's.
- Its **door** is the end wall on its ladder side, rows `C-9 .. C-1` (aux 9..1, as `bDoors`), with a lintel at
  `C-10`. Its **window** is in the other end wall, at `C - 5`: a pane of glass if one is to hand, otherwise a
  shuttered board (`a = 1`, as the gable window).
- Its **bed** is `x0+3 .. x0+5`, as the house's is, near enough.
- A storey is eleven rows. A three-floor stack tops out at `F - 36`.

The ladders:

- Each is `bLadderPlan`'s own shape: three columns, aux 0..2, from the ground up to row `C`, against the end wall.
  Its top is row `C`, so the pather's loop (paths.ts:134) stops at `C - 1`, and `bStepOff` from the middle column
  (`x1 + 2` on the right, `x0 - 2` on the left) lands on the door column: passable (`P_PASS[DOOR]`), with the end
  cell of the floor below's ceiling under it, which is solid.
- **No other step-off on the way up.** `bClimbStep` gets off at the first place it can once three rows up
  (build.ts:1402). Up the right-hand ladder the wall beside it is the ground floor's door (no footing: the door
  cells are `P_PASS`, so not ground), the lintel and the ceiling (no room), then the first storey's door at the
  top. Up the left-hand ladder it is the ground floor's door (no footing), the lintel and ceiling, the first
  storey's window wall (no room) and ceiling, and then the second storey's door.
- The first storey's ladder stops at its floor, so the second storey's door is never beside it, and the other way
  round. **Every ladder has one foot and one top**, which is all the pather's ladder edges can say (paths.ts:131–146).
- The ladders stand in front of the ground floor's two doors. Ladders are `P_PASS`: everybody walks through them
  in and out of the house, as they walk through a lift's headframe.

How it is built:

- **The roof comes off.** The fifteen gable cells (`C-1 .. C-3`: nine, five and the ridge) leave the plan of the
  floor below. They go into the storey's plan as phase-0 **strip** entries: a built cell that is to come out.
  - A strip entry has `v: EMPTY, strip: true`. `bOk` is true for it only when the cell is air (`AIRY`), not
    whenever it is not loose, which is what `bOk` says of an ordinary empty entry (build.ts:197). `bFree` lets a
    builder at it (as at a `redo` board, build.ts:210). `bPlace` sets the cell to `EMPTY` and puts the board or
    half-stone in the builder's pocket (as at build.ts:832).
  - The floor below's box is cut back to its ceiling (`y0 = C`) and its marks are made again (`bMark`). So nothing
    of the floor below is ever missing, and `bInspect` never sends anybody to repair it.
  - **The ceiling is not touched.** The room below is never open to the sky, and nobody is unroofed in their sleep.
- **Phases:** 0 the strip (and anything loose above, dug out); 1 the ladder; 2 the walls, with the door or the
  window; 3 the ceiling and the gable; 4 the bed.
- **Stone or wood.** The walls are stone if the village knows masonry and `bStoneToHand(g) >= 30`, as for a new
  house; otherwise planks. The door, the window, the bed and the ladders are always wood (or glass).
- **What it costs**, in plank: about 37 boards of shell, 9 of door, 3 of bed, and a third of a board a rung of
  ladder (11 boards up to the first storey, 22 to the second), less the fifteen stripped. In stone: about 18 stone and 23 boards.
- **How long it takes.** A house is about 12,000 ticks with the village helping. A storey is about as many cells,
  some reached off a ladder at `B_CLIMB` 0.25 rows a tick, so expect 12–20k. Phase 1 measures it, and the tests'
  time limits come from the measurement.

### 3.2 What a floor bears

`bStony(g, s)`: at least 80% of the site's plank-or-brick entries are brick in the grid. Not `s.stone`, which
`bInspect` sets when a single burnt board goes back in brick (build.ts:1052–1056).

| the stack is | what can go on it |
|---|---|
| a house, any material | a storey |
| a house and one storey, both `bStony` | a second storey |
| a house and one storey, either not stony | nothing yet; it can grow once both are done over in stone |
| three floors | nothing, ever; a roof garden |

`mRenovate` (mines.ts:821) does storeys over in stone as it does houses, and `bInspect`'s brick re-laying applies to
them too. Most houses in a masonry village are stone sooner or later, so most stacks get to three floors in the
end. The villagers say what stops them: *"a board floor won't take another floor on top"*, *"three's enough. any
higher and the ducks nest in it"*.

Huts take no storeys: logs and thatch bear nothing.

### 3.3 Where it goes

`sPlanStorey(g, p)`. It is tried in `bLook` by somebody homeless with the wood for it (`bWood(p) > 0.3`, as for a
house) when the village is crowded (§2), in place of the `bPlanHouse` call that would fail or is capped. It looks
at every stack whose top floor `T` (with ceiling row `C`) has all of these:

- `T` is finished, not burning and not under repair.
- `T` can bear another floor (§3.2).
- Above it, rows `C-15 .. C-1`, columns `x0-1 .. x1+1`, is open air, or something loose that can be dug out, which
  goes in phase 0. Nothing hot or wet there, and no other site's box.
- On its side (the first storey picks the end that will do, the right if both; the second storey takes the other
  end), the three ladder columns from the ground up to `C` are air or loose, the ground under them is solid, and no
  other site's cell is on them (`bMarked`).
  - The lanterns hang at `x1 + 1` and `x0 - 1` over the ground floor's doors, row `F-11` or so (ideas.ts:1510).
    The one on the ladder's side is taken down first: a phase-0 strip, board to pocket, and its lamp site removed.
  - The storey's plan has its own lantern instead: a bracket board at the ladder side's outer column (`x1 + 1` on
    the right), row `C - 10`, beside its lintel, and a `LAMP` under it at `C - 9`, above the ladder's top and clear
    of the climber (who is in the middle column). The ground floor goes without a lantern on that end from then
    on: `iPlanLamp` looks only at rows from `F - 11` up to the house's box, and the ladder is there. The feed says
    nothing; the lit lantern at the top of the ladder is the light on that end now.
- `C - 15` is ten rows or more below the top of the valley.
- Nothing else is hung on the house. The bell can hang from a post on a house's ridge (mines.ts:1167–1176), and a
  house with the bell on it is the bell's: it is skipped, and the hover says so (*"the bell's house. it won't take
  another floor"*). The other way round, the bell planner skips any house with a storey on it.
  So is a house with a furnace, a heap or a street lamp's post (`iPlanPost` keeps only `x0-2 .. x1+2` clear,
  ideas.ts:1971) against the ladder end it would need, if the other end will not do either. A building beside the
  ladder's outer column could offer a climber a step-off halfway up; the end-will-do check also wants the column
  outside the ladder clear of any site from the ground to `C`. (In seed 3 at 30k, one of the two houses carries the bell; in seed 1 the stone house has a furnace at one
  end and the bell at the other. Those valleys get fewer stacks, and §5 counts them.)

The best is the stack nearest the planner, and of those the shortest. A storey is planned only while
`bOpenCount(g) < B_OPEN`, and at most two storeys go up at once over the whole valley.

### 3.4 Living in it

- **Moving in.** Whoever planned it owns it, and once it is done it is their home (`p.home = s.id`). When the owner
  is gone, the nearest homeless peasant moves in, as for an empty house (build.ts:998): *"Sam moved into the flat
  over Dot's house"*.
- **Home.** Everything that finds a peasant's home goes through `bHome`, which checks only the owner. A storey
  carries the fields a house does (`F` = its floor `C`, `ix0`, `ix1`, `iy0`, `bed`, `win`, `cx`), so these work on
  it unchanged:
  - `bInside`;
  - sleeping;
  - `bTaskHome` (run home and hide when things go bang);
  - the lit window and the warm back wall (`bDraw`). The lit-window draw lights a shuttered board only
    (build.ts:1461); once STOREYS is known, it lights a glass window cell too.

  A helper, `bDwelling(s)`, is true for `"house"` and `"storey"`. Each of the 70-odd `kind === "house"` sites (27
  in build.ts, 21 in tidy.ts, 7 in mines.ts, 5 in ideas.ts, a few more elsewhere) is sorted into "somewhere somebody
  lives", which uses `bDwelling`, or "a house on the ground", which stays `"house"`. The sorted list goes in the
  phase-1 commit.
- **Getting there.** Up their own ladder, in at their door (§3.1). `paths.ts` plans ladders already, and each
  storey's ladder is an ordinary one with a foot and a top. Test 3 pins both floors.
- **Neighbours.** A storey's owner and the households below and above are neighbours. Each has a new line or two,
  said now and then (side dice) when both are home:
  - *"do you have to stomp?"*
  - *"is that you snoring?"*
  - *"evening, neighbour"*
  - *"who's cooking up there"*

  The first night upstairs: *"room with a view"*. Climbing past the first storey's window on the way up to the
  second: *"just passing!"*, and from inside, *"i can see you, you know"*.
- **A housewarming.** When a storey is finished and its owner is in, the neighbours below (and anybody idle within
  forty columns, as `bGather` asks round a campfire) come up and stand about in the new room for a while, and say
  *"lovely"*, *"bit small"*, *"you can see my house from here"*. Six people in a room nine wide, on a ladder, is the
  sight.
- **Water upstairs: gardyloo.** A ladder is solid to water, and the storey's floor is the house's ceiling, so a
  bucket spilt upstairs pools on that floor. Tidying's floor bailing (tidy.ts:319–345) finds water by the dwelling's
  interior and pours it out at a door it reaches from the ground (`tDoors`). A storey's one door is up a ladder,
  so it gets a target of its own, `tUpstairs`:
  - The bailer goes up the storey's ladder and in, scoops a pail, and steps back into the doorway.
  - They tip it out over the ladder side, shouting *"GARDYLOO!"*. The water falls where it falls, which is usually
    on the ladder and on whoever is climbing it: *"OI"*. Water lying on the ladder's top rungs is no bar to the climb
    (peasants wade, and `bClimbStep` only stops for a body overhead), and it runs off the side in a tick or two.
  - The first time is the achievement *GARDYLOO*: "water out of an upstairs door. look out below".
- **Fire.** A storey is a site with a box, so the brigade answers a fire at it as at anything of theirs.
  - The alarm (`bAlarm`) wakes everybody in the stack, not only the floor on fire.
  - The way out of a storey is its door and its ladder, which is wood.
  - **Nobody climbs a storey's ladder into a fire.** Once STOREYS is known, the pather's ladder edge (paths.ts:131)
    is refused for a storey's ladder (its middle column is in `g.stLad`, kept by the storeys) with fire or embers
    within two cells of it anywhere between its foot and its top. A ladder elsewhere (a mine's, a tower's) keeps
    master's rule, which is only that a cell of it already alight breaks it.
  - When their own ladder is burning, they step out of the door and drop. It is eleven to twenty
    rows: no chute (`P_CHUTE_H` is 30), survivable (a fall kills over 85, peasants.ts:820), and they land in a heap
    and say *"oof"*. The fun is in the ladder going up like a fuse, and the stack lit window by window.
  - *OUT THE TOP DOOR* is the achievement for dropping out of a burning stack.
- **A wooden ladder up a stone stack** is the stack's weak point. Once the village has a forge and iron to spare,
  the ladder of a three-floor stack is done over in iron: `GIRDER` rungs. `P_PASS` and climbable, as a lift's
  headframe is. It does not burn.
  - This is phase 2, and only if `bLadderMid` and the pather accept a girder ladder cheaply: a ladder is found by
    `MAT.LADDER` and its aux.
  - Otherwise it goes in §11, left out.

### 3.5 Upkeep

- **Inspect, repair, ruin.** A storey is inspected like any finished site. If its base is gone (a ruin, or removed),
  it goes too:
  - its owner loses their home;
  - its cells stay where they are, as any ruin's do;
  - the feed says *"the flat over Dot's house went with it"*;
  - floors above it go the same way.

  Stone hung in the air is normal in this valley. A home nobody can get into is not.
- **Its ladder** is part of its own plan. A burnt ladder is mended like any cell, from the bottom up.
- **The roof.** Tidying sweeps sand off a house's roof by its gable. With a storey on it, the house has no gable;
  the top of the stack does. `tRoof(g, s)` gives the gable of `s.top`; the sweeper reaches it as they reach a
  house's (from the ground, or a ladder, as the pather finds). The existing rule still applies: a roof nobody can get to, after a couple of tries, is let be.
- **Hover.** *"Gary's flat, over Dot's house (floor 2 of 3)"*. A house with floors on it adds *"and 2 floors over
  it"*.

## 4. Roof gardens

On a stack that can grow no further (§3.2), once ROOF GARDENS is known:

- **The gable comes off** (a strip), as for a storey. Instead of a new floor, the plan lays:
  - a hatch and an inside ladder from the top floor up to the roof: three cells of the top floor's ceiling, on the
    side away from its door (`x0+7 .. x0+9` when the door is at `x0`), become ladder, which runs down through the
    top floor's room to its floor. These three ceiling entries leave the top floor's plan; the garden's plan has
    `LADDER` there, which `bFree` lets in over a board or a stone (as `redo` does), pocketing it. This is the only
    ladder in the top floor's columns, so it has one foot (in the room) and one top (on the roof). At both ends the
    climber steps off at `x0+6`: in the room that is clear of the bed (`x0+3 .. x0+5`), and on the roof it is bare
    roof;
  - the flat roof, row `C`, which is there already: it is the ceiling;
  - a parapet, one brick at `x0` on row `C - 1` (at the far end, the hatch's ladder is the edge: `LADDER` is solid
    to sand and water);
  - a bed of sand, `x0+1 .. x0+5`, on row `C - 1`, five wide, clear of the step-off at `x0+6`. It is a free plan
    entry, as the hanging gardens' terrace beds are (pleasures.ts:549). Sand on a flat roof does not slide: a
    grain only goes down or diagonally down, and there is roof under both.
  - Somebody who walks off the roof into the hatch falls through it into the room below, about eleven rows, which
    hurts nobody and is said about (*"who left the hatch open"*).
- **The field.** When it is done, the bed is a field: a `"farm"` site with `free: true, roof: stackId`, a plan of
  `SOIL` and `CROP` built exactly as `pTerraces` builds a terrace's (pleasures.ts:637).
  - `iFields` (ideas.ts:518) is changed to leave out `.roof` fields as it leaves out `.terrace` ones.
  - It is tilled, sown, reaped, watered, raided by ducks (they fly) and frosted like any field.
- **Tidying.** Sand on a roof is swept off a roof. A roof garden's bed is a field's earth, which tidying already
  leaves be. `tRoof` returns nothing for a gardened stack.
- **It ends the stack.** Nothing goes on top of a roof garden, and a roof garden only goes on a stack of three
  floors, which can take nothing more. So it never costs anybody a home.
- **Five furrows.** A ground field is eleven wide, sown every other furrow: six stalks. A roof garden sows every
  furrow, as terraces do: five stalks, nearly a ground field's worth of wheat, reaped by somebody up two ladders.
- The first one is the achievement *ROOF GARDEN*: "wheat on the roof. the ducks were there before the farmer".

## 5. Word gets round

Once STOREYS is known, `pLife` raises `g.popGoal` by one, and a newcomer walks in by the existing arrival code
(peasants.ts:1432), when all of these hold:

- every living peasant has a home (`bHome`);
- nobody has been over 5,000 hunger in the last 6,000 ticks (`g.leanT`: the last tick anybody was, written in
  `pHunger` without a roll). From §0, that holds most of the time in a village of eight and seldom in a crowded one;
- `alive < 16` (`P_CROWD_MAX`, for the frame rate in a wide valley at 4×);
- it has been 12,000 ticks since the last arrival by word of mouth (`g.wordT`).

Their first line is one of:

- *"i heard there was room upstairs"*
- *"is it true you build on top of each other?"*
- *"i've come about the flat"*

The feed says *"Sam has moved to the valley (word got round)"*.

**Expected trajectory (provisional, until test 16 measures it).** Phase 3 measures it, unforced, in seeds 1, 3 and 7 on one screen and seed 7 on four, and
writes the numbers here; the soak's pass bars come from that measurement. What the plan expects:

- **One screen, seed 3.** Two houses and two huts, and three or four sleeping rough.
  - STOREYS comes a few thousand ticks after masonry (26.6k): it is whoever sleeps rough next.
  - One house carries the bell, so there is one stack. It takes a storey (12–20k), and after `mRenovate` a second:
    two homes more, by about 60–70k.
  - That leaves one or two sleeping rough, so word never gets round. Nobody leaves either, unless they go without
    for long. The village is what it was, housed better: the plan's job here is to answer, not to grow.
- **One screen, seed 1** (five houses, three rough): about the same, by the stacks it can build.
- **Four screens.** Six houses, the cap, and two rough. Two storeys can go up at once.
  - Everybody is housed by about 45–55k.
  - Then a newcomer every 12,000 ticks while the food holds, each one the next storey's owner.
  - Expect 10–14 people by 90k, the limit being whichever of homes or food runs out first.
- **A player who drops in more people** sees storeys first, then hunger, then a roof garden (on a full stack),
  then, if that is not enough, somebody walking over the hills.

## 6. Over the hills

Once STOREYS is known, a peasant goes over the hills when all of these hold:

- they have no home, and have had none for 24,000 ticks (`p.roughT`, the tick they last lost or lacked one);
- they are **lean**: `p.lean` is at least 3,000. It goes up by one each tick they are over 5,000 hunger, and down
  by 0.2 each tick they are not (never below 0);
- nothing is going up that would house them, and `sPlanStorey` found nothing the last time it looked;
- more than four people are alive, and nobody has left in the last 12,000 ticks;
- they are not the king, not on a task, and not in the middle of a great work's crew.

What happens:

- **Goodbye.** They say it to whoever is nearest: *"there's no room here. i'm off over the hills"*, *"tell the
  ducks"*.
- **What they hold.** Whatever `pDie` puts down for somebody dying is put down here the same way, by the same calls:
  a pail of water or of wet concrete (`iSpill`, `tCarry`), a great work's load (`wDropAll`).
- **Their pockets.** What they carry that the village uses (stone, iron, gold, coal, wood, glass, panes) goes on the
  nearest site's pile, or at the furnace's store, or at their feet.
- **The walk.** They pick up a bundle on a stick (drawn, not a cell) and walk (`task: "leave"`, `pathGo`) to the
  valley edge nearer to them. At the edge they are gone:
  - `p.left = tick`, `p.dead = true`;
  - no ghost, no cross, nothing in `g.dead`, not counted in `g.rip`;
  - `popGoal` comes down by one.

  Everything that walks the peasant list already skips the dead. (A dead entry still counts towards `P_MAX`, 120,
  in `peasantSpawn`, as the dead do already; at a leaving every 12,000 ticks at most, that is never near.) A save keeps them as it keeps the dead, with
  `left` set. `hash()` covers the peasant list, so a leaving is in the hash like a death.
- **The news.** The feed says *"Gary has gone over the hills, to find somewhere with room"*. The first time is the
  achievement *OVER THE HILLS*.
- **If they cannot reach the edge** (walled in, or the way flooded) within 6,000 ticks, they give up and stay, and
  `p.roughT` starts again.
- **The letter.** About 20,000 ticks later, on the side dice, maybe a letter. It is a feed line and nothing more:
  - *"a letter from Gary, over the hills: they have TWO ponds"*
  - *"a letter from Gary, over the hills: i have a house. on the ground. i think of you often"*
  - *"a letter from Gary, over the hills: the ducks here are worse"*

## 7. Washing lines

Once STOREYS is known, a line goes up from a storey's window to whatever faces it across open air:

- another stack's window, or a tree's trunk (a street lamp is too low: its top is about seven rows up, and the
  lowest window is sixteen);
- 4 to 24 columns away, at the window's row or within 3 rows of it;
- with every cell between them open air that is no site's (`bMarked`). (So a first storey's window, which looks out
  over the second storey's ladder once there is one, has a line only until then.)

The line is a small site, `"line"`, owned by the storey's household (a board's worth of cord):

- **The cord.** A row of `LINEN` cells from the window to the other end. Where the two ends are at different rows,
  it steps once, in the middle, straight down: it is 4-connected all the way, because fire spreads to the four next
  cells only (world.ts:702–710), and a diagonal step would stop it.
- **The washing.** Now and then (side dice), whoever lives there "hangs out the washing": a few cells under the cord
  (never two in a row) turn to `LINEN` in shirt colours (aux picks the colour).
- **Taking it in.** Later, the washing is taken in (those cells go back to air).
- **Ducks** fly, and stand on anything solid: a duck on the washing line is the physics. The household says
  *"get off the washing"*.
- **Fire.** The line is tied at the window. A shuttered window is a board, and a fire that comes along the line
  catches it, and gets in. A glass one does not burn, and the fire stops at it. A line to a tree takes the fire to
  the tree, and a tree to the line.

`LINEN` is a new material, appended to `MAT`:

- **world.ts:** static and solid (`SOLID`, `STILL`), so sand lands on it, and so do ducks. It burns like a plant
  (`LEAFY`: in flames, no embers). Its colours: an off-white cord and five shirt colours by aux.
- **peasants.ts:** walked through (`P_PASS`): they duck under the washing.
- **heat.ts:** a plank's heat capacity, and it catches at a plank's ignition point (`hi(MAT.LINEN, 300, 0)`) and
  burns as plants do, in flames (the `default` case, heat.ts:319).
- **save.ts:** a name in `saveMatName`, so a save keeps it by name.
- **game.ts:** in the picker, so the player can paint bunting.
- **A fire at one end runs along the cord to the other**: the street's new fire risk, and the brigade's.
- **Achievement** *WASHING DAY*: "the street has a washing line. it is practically a town".

A line is not mended if it burns. It goes up again later if the window still faces something.

## 8. Determinism, saves, the rules kept

- **A plain village is master's.** Nothing here rolls, or changes what anything else does, until `g.know.storey`.
  - The ideas are `fresh`: being ready puts nothing on master's dice.
  - STOREYS cannot be ready before masonry (20–27k); ROOF GARDENS needs STOREYS. No recorded check reaches
    either (§0).
  - `g.noPlotT`, `g.noFieldT`, `g.leanT`, `p.roughT` and `p.lean` are written without a roll, and only read once
    the idea is known.
  - The plain-village tests (`test/wonders.js`, `test/valley.js`, the harness playtests) must pass unchanged.
- **Master's tables** (`P_SAY`, `P_ACHIEVE`, the first 23 `IDEAS`) are only added to. `LINEN` is appended to `MAT`,
  so every existing material keeps its number, and so do saved grids.
- **After the idea.** Everything that rolls after the idea is known (neighbours' lines, washing, letters, which end
  the ladder goes on when both will do) rolls `wRand`. Everything else uses the same dice as the code it extends,
  which at that point is past every recorded check.
- **Saves.** Storeys, roof gardens and lines are sites, and sites save as they are. New fields on `g` and on
  peasants load with defaults when missing. An old save loads unchanged, and plays as it did until somebody thinks
  of STOREYS.
- **The one-screen rule** (`docs/wide-valley-spec.md`) holds. Nothing here is gated on width; the plain-village
  checks pin both widths.

## 9. Tests (`test/storeys.js`)

1. Seeds 1, 3 and 7 run plain to 30,000 ticks. STOREYS is never ready before masonry, and nothing here
   writes a site or rolls a die before it is known.
2. Forced setup: a finished plank house, masonry known, a homeless peasant with wood, the cap reached.
   - a storey is planned;
   - the gable is stripped, with boards pocketed;
   - the ladder, walls, door, window, roof and bed go up;
   - the house is never reopened for repairs;
   - the house's ceiling cells are never anything but plank.
3. Both storeys are reached, each by its own ladder and door, and neither climber gets off at the other's door.
   Each gets into bed; paths checked from the ground, and `harness/stuck.js` finds nobody
   stuck.
4. Bearing:
   - a plank house takes a storey, and no second while either floor is plank;
   - a stone house and a stone storey take a second;
   - `mRenovate` does the plank floors over, and then the stack takes one more;
   - a house with one burnt board re-laid in brick is not `bStony`;
   - a house with the bell on it takes none.
5. The lantern on the ladder's end is taken down, its board pocketed, and the storey's own lantern goes up at the
   top of the ladder and is lit.
6. The house burnt out from under the stack: the storeys are given up, and their owners are homeless.
7. A storey's plank walls burnt in a masonry village are re-laid in brick.
8. Water poured on an upper floor is bailed out of its door ("gardyloo"), and the floor ends dry.
9. Fire on the ground floor at night: both storeys' owners are woken and get out, by their ladders or, with a
   ladder alight, by the drop. Nobody climbs a storey's ladder toward the fire. Nobody dies of the fall in 10 seeds.
10. Roof garden: at the field cap with somebody lean, ROOF GARDENS becomes ready. On a three-floor stack the gable
    comes off; the hatch, the parapet and the bed go in; a field is sown, reaped from the roof and eaten from; it
    does not count against `iFields`; and with it built, both storeys' owners still path home from the ground.
11. Word gets round:
    - with everybody housed and fed, a newcomer arrives within 13,000 ticks;
    - with somebody over 5,000 hunger recently, nobody arrives;
    - never past 16 people.
12. Over the hills:
    - a lean, homeless peasant with nothing buildable walks out at the edge;
    - `popGoal` is one less, `rip` is unchanged, and there is no ghost or cross;
    - a walled-in one gives up.
13. A washing line from a shuttered window to a tree: set alight at the tree, the fire comes in at the window. From a
    glass window, it stops there.
14. Save and load in the middle of a storey going up, a roof garden going in, and somebody on their way out: the
    same hash after 600 more ticks as without the save.
15. Soak. Seeds 1, 3 and 7 on one screen, and seed 7 on four screens, with STOREYS forced at 20k, run to 90k:
    - no invariant broken;
    - nobody stuck on a ladder;
    - every storey either done or given up;
    - population within 4..16;
    - the trajectory recorded against §5.
16. Pacing, unforced: seeds 1, 3 and 7 to 90k. The tick of the first storey begun and finished is recorded, and
    pinned within a range once measured.

## 10. Phases

1. **The storey** (§2 STOREYS, §3.1–3.3, §3.5 except the roof, §8): the idea, the site, the strip, the ladder, the
   bearing rule, moving in, `bDwelling`. Tests 1–7 and 14 (storey part).
2. **Living in it** (§3.4, the roof sweep): neighbours, gardyloo, fire and the drop, the iron ladder if it is cheap.
   Tests 8 and 9.
3. **In and out** (§5, §6): word gets round, over the hills, letters. Tests 11, 12, 15 and 16. Measure §5's trajectory
   and write it into this file.
4. **On top and between** (§4, §7): roof gardens, `LINEN`, washing lines. Tests 10 and 13, and the rest of 14.
   README: the ideas, the material, and things to try:
   - *"Give a village of eight a valley with no flat ground, and wait for masonry. Then watch the roofs come off"*
   - *"Set fire to the bottom of a ladder up a three-floor house, at night"*
   - *"Pour water into a top-floor flat. Stand underneath"*
   - *"Set fire to the washing"*
   - *"Drop ten more peasants into a valley that has stopped growing. Then wait"*

## 11. Considered, and left out

- **A concrete fourth floor.** Wet concrete is poured into a form, and a slab in the air has none. Three floors and
  a garden on top is enough.
- **Hatches between storeys.** One ladder past two floors cannot reach the lower one (the pather links a ladder's
  foot to its top only), and two hatches one over the other are one ladder. So the storeys have a ladder each,
  outside, and the only hatch is the roof garden's. The outside ladders are also what you see, and what burns.
- **Cellars.** Down is where the mines go. A room dug under a house in sand would need a mine's collar all round,
  floods, and has nowhere to put the spoil.
- **A hamlet** in the empty screens of a wide valley. It breaks "nobody walks 800 columns for a field" (wide-valley
  spec, goal 4) unless it has its own fields, which makes it a second village.
- **Bunk beds and lodgers.** They would have to be thinkable before masonry, which is inside the recorded checks.
- **Load-bearing physics.** Solids do not fall here, and making them fall for one kind of building would make it
  the only place they did. The bearing rule is a builder's rule.
- **Raising `B_HOUSES` or the field cap.** The limit is ground. Raising the number changes nothing.

## 12. As built

Where the code (`storeys.ts`, and its hooks) differs from the plan above, and why:

- **Crowding is looked for, not waited for.** Homeless peasants with fewer than four logs never try `bPlanHouse`, so
  `g.noPlotT` was never set in a one-screen valley. `sPlotCheck` looks for a plot every 1,200 ticks once masonry is
  known (`bPlot` only looks), and sets it. A failed `bPlanHouse` no longer sets `planCD` before `sTry` has had its go.
- **A storey's bed is on its door's side** (`x0+6..8` for a right-hand door, `x0+2..4` for a left), so that the
  far side is clear for a roof garden's hatch.
- **The lantern.** The storey's plan has no lantern of its own. The ground floor's lantern on the ladder's end is
  stripped, and `iPlanLamp` hangs one for the flat's owner under the flat's own eaves, as for any home.
- **Washing lines are strung at once** by the household (not built a cell at a time: the cells are in the air,
  out of any builder's reach), and kept in `g.lines`, not as sites. `LINEN` is not `LEAFY`: on a line it burns by
  `sFuse`, a cell smouldering for 25 ticks as an ember and lighting the next, and catching what the line is tied
  to. A flame rising off a one-cell cord left gaps the engine's own rules could not bridge. Elsewhere it catches
  by heat, as anything does.
- **`LINEN` is not in the picker.** Any new row changes the picker's scroll, and master's recorded panel
  scenarios (test/wonders.js) pin it. It reads as WASHING.
- **Gardyloo** fires for a bailer in the flat, in its doorway, or at the top of its ladder having reached in.
- **Climbing down a flat's ladder with fire at it** is refused in `bClimbStart` too (not only by the pather):
  the climber leaps out past it instead (`sLeapOff`), OUT THE TOP DOOR.
- **Measured, unforced, to 120k** (§5's trajectory, as it came out):

  | valley | STOREYS | what went up | sleeping rough at 120k | newcomers by word |
  |---|---|---|---|---|
  | seed 1, one screen | 36.8k | nothing: the one stone house has the furnace at one end and the bell at the other | 3 | 0 |
  | seed 3, one screen | 32.0k | one flat (39k) | 3 | 0 |
  | seed 7, one screen | 31.2k | one flat (33k) | 3 | 0 |
  | seed 11, one screen | 40.0k | three flats (40–45k) | 1 | 1 |
  | seed 3, four screens | 21.6k | a flat (22.6k), a third floor (64k), a roof garden (68k) | 2 (10 alive) | 2 |
  | seed 7, four screens | 47.8k | two flats (49k, 51k+) | 1 | 0 |

  Deaths by 120k (7–9) are old age, which starts at 84k.
- **Review.** Three rounds, by a correctness reviewer and a gameplay reviewer, until neither found a P0 or P1.
  Plain villages were compared hash for hash with the code before this work (seeds 1, 3, 7 and 11 on one screen;
  3 and 7 on four), up to the tick STOREYS was thought of. What the rounds changed:
  - a flat's walls, door and window go by its room, not its box (a left-hand ladder is in the box);
  - a window planned in glass becomes a shutter when there is no pane anywhere (`sNoPane`);
  - a flat starts from boards as well as logs;
  - a leaver turned back on the way sets off again, and stays if they get a flat on the way;
  - a floor with a flat on it is mended, never given up, and its room is kept clear (`sKeepClear`): a kept
    ceiling over a burnt floor once filled with ash, and buried whoever walked in;
  - a door with fire just outside it is the wrong door (`sFireOutside`);
  - washing lines go to tree crowns and the next house too, and are strung by a household about the house.
