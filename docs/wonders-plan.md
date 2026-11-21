# Wonders: a plan

*When there is nothing much left to think of, they build something nobody needs and everybody wants.*

Status: **v5, approved for phase 1** (8 / 8 / 8 on the fifth review). v5 (after the fourth review):

- Stale v2/v3 text is removed.
- The foundry's mould holds a whole pour, and the engine bell has its own mould.
- Quarrying benches an existing gallery's floor down instead of adding a level.

v4 (after the third review) adds:

- **The organ** is honest: it is an open loop, with a catch-basin for the rain.
- **The gantry** is one leg, counted from its plan.
- **Quarrying** has its own geometry: benching, which cuts an old gallery's floor down (v5: it no longer adds a fresh
  level, which would not fit in a standard shaft).
- **The forge** is held back while a wonder wants iron.
- **The foundry** has its energy arithmetic, and conserves iron: a bar is five cells, as it is everywhere else.
- **Build rates** are a range.
- **Bailing the crypt** is costed as new work.
- **The duck trough** is reachable on foot.

v3 (after the second review) adds:

- **The rocket** is a hollow shell of thin plates, and its iron is costed once.
- **Supply is measured as rates and stock on hand**, and a wonder short of stone sends people to quarry for it.
- **The foundry recasts bars**, runs hotter, and is raked of ash.
- **The steam organ** is a closed loop with a condenser *(superseded in v4: an open loop with a catch-basin)*.
- **The duck palace** uses real seed.
- **The ice palace** is exempt from the one-great-work rule.
- **Astronauts come home** by the existing return from space.
- **Build times** are measured.
- **The lightning rod** protects buildings only.
- **The crypt** is bailed like a floor *(superseded in v4: a new bail target, up the ladder)*.

Changes from v1: the foundry is now physically possible. The economy has been costed against
measured supply. Gold is optional wherever it is used. Concrete is made from lime, not ash. The lightning rod no
longer takes the player's bolt. The ice palace is honest about weather. The catacombs are folded into the
cathedral as its crypt, and the slot goes to a steam organ. The gardens work with the farm code. The code claims
have been checked, and the work comes in two phases.

---

## 0. What we are working with (measured)

- **The valley** is 272 × 186 cells: `GW = (640 − 96) / 2`, `GH = (400 − 28) / 2`.
  - The ground lies around rows 120–150. The top 60% is open sky, and there are 30–60 rows of rock under the sand.
  - Houses (6), fields (`min(4, ceil(alive / 3))`, 11 wide each), mines, a tower, a furnace, wells and posts already
    take most of the level ground.
  - So wonders go **up**, **down**, **out over the water**, or **onto something already there**.
  - A valley will not have room for all twelve. Which ones it gets is up to the valley (`iNoRoom` says so for the
    rest, as it does now).
- **What a valley left alone produces.** Headless, seeds 1, 3, 7 and 11 to tick 60,000; seed 7 to tick 150,000:

  | resource | by 60k | by 150k (seed 7) | note |
  |---|---|---|---|
  | ideas known | 18–21 | 19 (stalled) | there really is nothing left to think of |
  | stone found | ~1,300 | 2,261 | plentiful |
  | ore found | ~140 | 193 | the real limit on iron |
  | iron made | ~60 | 157 (0 on hand) | spent on props, posts, tools, lifts |
  | coal found | ~150 | ~250 | plentiful |
  | **gold found** | **3–14** | **6 (0 on hand)** | **scarce** |
  | **ash found** | **0** | **0** | **only from fires** |
  | barrels pumped | 0–20 | 73 | the tank holds 5 |
  | duck raids | — | 179 | |
  | dead | — | 11 | |
  | water in the valley | ≤ 200 cells | ≤ 200 cells | dug ponds are about 13 × 3 |
  | alive | 8 | 8 | `popGoal` 8 |

  **Gross totals are not stock.** At 150k, stone, iron and gold *on hand* were all 0.
  - Stone past the pocket cap (24) is kicked down the tunnel.
  - Iron goes into props, posts, tools and lifts as soon as it is made.
  - Mines are finite (`M_MINES` 5).

  So the plan works in **rates**, and in what a wonder can **call for**:

  | supply | rate (measured or derived) | how a wonder gets it |
  |---|---|---|
  | **stone** | a miner cuts a cell every `mStroke` (30 ticks; 18 with iron picks). With walking, a full pocket of 24 takes about 1,000 ticks | **quarrying** (§1): a wonder short of stone sends one quarryman to bench an old gallery's floor down, and the pockets go to its pile. 70 stone is about 3,000 ticks for one quarryman |
  | **iron** | bounded by ore: about 1.3 ore per 1,000 ticks over a valley's life, faster while a mine is being worked toward a seam | while any wonder idea needs iron, `M_IRON_SPARE` rises from 10 to 30, so props go back to timber and posts wait. The foundry recasts bars (§3.11) |
  | **gold** | 6 in 150k, all spent | gilding only; meteorites add about 1 per 3 showers |
  | **barrels** | 73 in 150k, the tank holds 5 | the rocket's 12 go on its pile, a barrel at a time as the tank fills |

- **Build rate (measured).** A 138-cell BRICK watchtower, stocked, went up in 3,800–4,600 ticks with the village
  helping: about 30 ticks a cell, all hands together. With a crew of 2 the rate is **somewhere between 70 and 120 ticks a cell** (120 if it scales with hands; less, because
  most of a cell's time is walking and climbing, which two do as fast as eight). Phase 1 measures it, and the
  soak's pass bar is set from that measurement, not from this table. Expected times, at the slow end:

  | wonder | time with a crew of 2, after materials |
  |---|---|
  | theatre | ≈ 8–12k ticks |
  | pyramid | ≈ 10–17k |
  | baths | ≈ 6–10k (+ filling) |
  | observatory | ≈ 3–5k |
  | gardens | ≈ 6–10k |
  | organ | ≈ 4–7k |
  | duck palace | ≈ 4–6k |
  | ice palace | ≈ 1.5–2.5k, all hands |
  | cathedral | ≈ 15–26k + crypt |
  | lighthouse | ≈ 8–14k |
  | foundry | ≈ 5–8k |
  | rocket | ≈ 12–20k + fuel |

  Twelve wonders is several hours of game time at 1×, and a good deal less at 4×. That is the late game, as
  intended.

  These numbers shape the plan:
  - **No wonder needs gold to be finished.** Gold is gilding: used if there is some, left plain if not.
  - **Nothing needs ash.**
  - **Water budgets are small** (each wonder's is stated).
  - **Big water is something the player provides** (and *Things to try* says so).
  - Meteorites (§3.9) bring in a trickle of gold and iron. They are the one new source of gold, and the observatory
    is placed early so that it eases the gold supply for everything after it.
- **The heat model**, as it constrains wonders:
  - Burning things are the only heat sources: FIRE 750, EMBER 700, TORCH 1000 (`HEAT_SRC`).
  - BRICK melts at 1150. ORE runs at 1250. Molten iron sets below 1400 (`LAVA_LO[METAL]`). Sand sinters at 800.
    Glass melts at 1400 and sets at 1150.
  - Steam condenses back to water below 100, which is how the existing "steam rains" works.
  - `AMBIENT` is 20 and there are **no seasons and no weather**. Cold exists only when the player makes it.
  - Peasants sweat above `P_SWEAT` 50 and scald above `P_SCALD` 90.
- **`g.aux` is a Uint8Array** (0–255). Long counters run on a stride (`tick % 8`) or go on the site object.
- **Poses** are stand, climb, sleep, chop, hammer, eat and panic. A **`sit` pose is new work** (§5).
- **Determinism**: `Math.random` is seeded and must stay so. Saves serialise `g` generically, so new state goes on
  `g` as plain data.
  - Every new behaviour that draws dice (telling tales, bathing, plays) is gated behind the idea or the built wonder
    it belongs to, so a village that has none of them rolls exactly the dice it rolls today.
  - New `IDEAS` entries are consulted during eureka only when their `ready` is true, and `ready` is pure, so recorded
    replays should not move.
  - If one does, the hash is re-recorded in the framework commit and the commit says why, as recent commits have
    done.
- **Frame time** is about 1.5 ms. Wonder bookkeeping runs on a 30-tick stride. Drawing goes into the existing glow
  buffer.
- **The voice** is lower-case, dry, specific, a little sad, and never wacky. Every new thing gets:
  - `P_SAY` lines
  - a feed line
  - a `P_ACHIEVE`
  - a hover readout
  - a README paragraph in the same register

---

## 1. The shape of it

**Wonders are ideas.** Each one is an `IDEAS` entry with `wonder: true`.
- It shows in the IDEAS hover with its hint.
- It is put into somebody's head by something that happened to them (`iSpark`).
- It comes with a light bulb, and the banner reads `A WONDER: THE PYRAMID`. The feed line is gold.
- The header gets `WONDERS 3/12` beside IDEAS. Its hover shows what is built, what is going up, and what might give
  them the rest.

**The great work.** A village has at most **two great works going up at once** (`W_GREAT = 2`; the ice palace is exempt).
- **Its crew is capped at `max(2, floor(alive / 3))`**: 2 in a village of 8.
- A wonder does **not** count against `B_OPEN`, so graves, the bell and repairs are never blocked by it.
- In `iPick` it comes after food, fields, fire, the dead and the bell, and before the mine.
- **Quarrying.** When the wonder's next cells want stone and its pile and the valley's pockets cannot cover them, a
  miner takes a `quarry` task. **One quarryman** at a time, on top of the crew cap (they are not building, and the
  pyramid's 70 stone would otherwise halve its builders).
  - A worked-out mine's galleries have stopped where `mBore` fails (the edge, a pool, somebody's cellar), and
    `mTunnelPlot` gives nothing more there. A fresh level off the shaft will not fit either: a standard shaft
    (`M_SHAFT` 28) already has its bottom gallery and its upper level (`M_LEVEL` 14), and a third would sit in the
    sand. So the quarry has **its own geometry: benching**.
  - **Benching** takes an existing gallery (any level, of any mine, worked out or not) and cuts its floor down: a
    **bench** of 3 rows across a stretch of up to 16 columns.
    - It works one row at a time, from the shaft end outward.
    - It needs no new vertical room: the gallery's roof and props stay where they are.
    - The gallery becomes 3 rows taller there. Props are drawn, not cells (mines.js draws them over the gallery's
      air), so they simply draw down to the new floor: no timber or iron is spent on them.
    - The shaft's ladder is extended down to the new floor where the bench meets it, so the bench is always climbable
      out of.
  - The plot is `wQuarryPlot`.
    - A new `wBenchOk(g, x, Bold, depth)` checks each column. It reuses `mBore`'s checks for loose cells, marked cells
      and other sites, but tests for rock in the rows being cut and a firm floor under the new floor. (`mBore` itself
      assumes a fresh gallery, with a firm roof `M_ROOF` up, which a bench does not have.)
    - It skips any column where the bench would come within 2 rows of the bottom of the rock or of a cavity below.
  - **Room**: a gallery of 16 columns benched 3 deep gives 48 stone. Bench again (another 3 rows) while 3 rows of rock
    remain under it. Bottom galleries run 70–120 columns and give a few hundred stone. Upper galleries, with only 4 rows of rock
    over the gallery below, bench 1 row at most, and there
    were 5,153 STONE cells still in the valley at 150k.
  - **With no gallery anywhere** (no mine was ever sunk), there is no quarry, and the wonders that want stone wait.
  - The miner fills their pocket (24) and carries it to the wonder's pile.
  - Most of the time this is the only way a wonder gets 70 stone, since pockets are empty in a mature valley.
  - With nowhere to cut either, the wonder waits and the hover says "waiting for stone (nowhere left to cut it)".
- **Iron for a wonder.** While any wonder's plan wants iron:
  - Forging new tools waits until `mIronToHand ≥ M_IRON_SPARE`, which is raised to 30.
  - Worn tools are still re-forged. They give back half a bar and take one, so they cost half a bar net.
  - Props and posts wait, as they already do under `M_IRON_SPARE`.
  - Iron on the wonder's pile has left everybody's pockets, so the forge cannot have it.
  - The soak measures what the forge consumes before and after this rule.
- **Hauling** uses the existing pile. `bNearestSite` already sends anybody carrying what a site needs to it within
  170 cells. For the wonder the radius is the whole valley: whoever is carrying what it is short of, and has nothing
  better to do, goes and puts it on the pile.
- Gatherings (plays, services, launches) take only the **idle and the bored**: nobody stops eating, sleeping,
  fighting a fire or building to watch. Each gathering is capped in time.

**Rules for every wonder:**
- **Built once.** The ice palace is the exception: it melts, and is built again when the valley freezes again.
  - It is also **exempt from the one-great-work rule and from the crew cap**. It is short, and it is the player's
    reward: anybody idle lends a hand, whatever else is going up.
- **Does something** that feeds back into the simulation: heat, water, light, food, population, ideas, lightning,
  ducks, iron or gold. None is only a picture.
- **Has a ritual**: something peasants go and do there, with its own lines.
- **Has a sandbox hook**: something you, with the brushes, can do to it that it answers. These go in *Things to try*.
- **Gold is gilding.** A gold cell in a plan has a stone (or brick) stand-in, used when the village has no gold on
  hand or on piles. If gold turns up later, the gilding is done as a repair.

**Achievements**: one per wonder, `SEVEN WONDERS` (seven standing at once), and `ONE SMALL STEP`.

### Two plain ideas the wonders need

| idea | ready when | sparked in | gives |
|---|---|---|---|
| **CONCRETE** | masonry + smelting + the bucket | whoever spills a bucket at the furnace (lime and water get hot: the first anybody has seen a thing warm itself) | **lime** burnt at the furnace; **mortar** mixed from lime, sand and water |
| **STAINED GLASS** | glassmaking + 2 ore found | whoever makes the next pane of glass | tinted panes at the furnace |

---

## 2. Materials, recipes, and changed interactions

### Five new materials (ids 48–52)

| id | readout name | behaviour | source |
|---|---|---|---|
| `MORTAR` | WET CONCRETE | A heavy, slow liquid: moves like oil, but sinks under water. It counts toward setting on the site's own clock, or on a stride for poured or painted cells: `aux` goes up by 1 every 8 ticks, and at 112 (≈900 ticks) it **sets** into CONCRETE. Warm (>30) it sets twice as fast. **Below 0 it never sets: it crumbles to sand** (frost damage, as with real concrete). It sets under water, as Roman concrete did. In the picker as `WET CONCRETE`: "pours like porridge, sets like stone. hurry" | mixed by peasants (below) |
| `CONCRETE` | CONCRETE | Solid and still. Does not burn. Conducts heat like stone. Melts past 1500 (to LAVA, aux 0). **Blast-resistant**: `sandBoom` breaks it at a third of the rate it breaks stone. Not in the picker | MORTAR, set |
| `STAINED` | STAINED GLASS | Glass in every way (melts at 1400 to LAVA aux GLASS, so it sets as *plain* glass). Drawn in its tint: `aux` 0 is ruby, 1 green, 2 amber. **Glows in its tint when a LAMP, FIRE or EMBER is within 6 cells.** In a side view, "lit from behind" means "near a light" | at the furnace: a pane + a fifth of gold (ruby, as real gold-ruby glass is), or + an ore (green: iron greens glass), or + a coal (amber: carbon-amber glass). Green and amber are the common colours; ruby only with gold to spare |
| `FIREBRICK` | FIREBRICK | Brick that will stand a furnace: melts only past 2000. Pale yellow. Solid and still. Not in the picker | at the furnace: a stone + a coal, fired. Needed by the foundry and the rocket pad's flame trench |
| `MOONROCK` | MOON ROCK | Solid, still, inert, pale and pitted, with a faint shimmer. Not in the picker | brought back from the moon (§3.12) |

### Recipes at the furnace

All of these are worked the way smelting is: on a timer, with the furnace glowing, from what is on its pile or in
pockets.

| recipe | what goes in | what comes out |
|---|---|---|
| **lime** | 1 stone + 1 coal | 2 lime (pocket resource `lime`) |
| **firebrick** | 1 stone + 1 coal | 1 firebrick (`firebrick`) |
| **panes** | as now | as now |
| **stained panes** | 1 pane + a tint | 1 stained pane |
| **mortar**, mixed at the store pile or at the site | 1 lime + 2 sand + a bucket of water | a pail of mortar (5 cells, `I_LOAD`) |

Lime and firebrick share a recipe. The furnace makes **whatever has been asked for**: a site short of `lime`, `mortar` or `firebrick` puts an order on the furnace (`g.kiln`, a short queue), and the furnace-worker burns that, oldest order first. With no orders, it smelts as now.

**Mortar is carried wet, in the pail.**
- If whoever is carrying it dawdles for 900 ticks, it sets in the pail. They tip it out, and a lump of concrete
  stands wherever they were. This is funny once.
- A plan cell of CONCRETE is `bOk` once the cell is MORTAR or CONCRETE.
- A wonder with wet mortar in it is not *finished* until the mortar has set. The hover says "waiting for the
  concrete to go off".

**Costs** (`B_RES` / `B_AMT`):

| cell | costs |
|---|---|
| CONCRETE | `mortar` 1 |
| STAINED | `stained` 1 |
| FIREBRICK | `firebrick` 1 |
| METAL plate (a rocket's hull) | `plate` 1 (cast only at the foundry: a tapped cell is one plate, and a plate is 0.2 of a bar, as a girder is) |

### Changed interactions

**The lightning rod.** There is no natural lightning: `sandLightning` is only ever the player's tool, and the
player's aim is sacred. So the rod is a **protector, not a magnet**. It works only where the bolt would otherwise
land:
- on a village structure (a `bMarked` cell: a house, a field, a bridge, anything they built),
- within **10 columns** of the rod.

It protects buildings, not people: aim at a peasant standing in the open beside the cathedral and you hit them.

When it works:
- The bolt is drawn bending to the rod.
- The strike runs down the rod's own girder column (a private path, drawn bright) into the ground.
- No fire, no glass, nobody zapped. `CONDUCTS` is untouched.

A bolt aimed at open ground, a pond, a tree, or anything not theirs lands where you aimed it, rod or no rod.

**Forced draught.** A FIRE or EMBER cell inside a *closed* FIREBRICK chamber that somebody is working the bellows of
burns hotter: its `HEAT_SRC` is **1800** instead of 750/700 (300 over the 1500 that iron runs at, to cover the heat lost through the walls), for as long as the bellows go.
- The heat still comes from burning coal, which is used up faster (the bellows double its burn rate). It is a draught,
  not a peasant-made heat source.
- Implemented as a per-chamber flag, checked in the heat pass by a small lookup of draught cells. The chamber's cells
  are listed on the site.

**Warm water.** A peasant swimming in water between 30 and 45 is *bathing*:
- their `cold` goes to 0
- they think twice as fast (cosy)
- they gossip

Over `P_SWEAT` (50) they get out, fast ("TOO HOT"). Over `P_SCALD` (90), scalding works as it does now.

**Population.**
- `g.popGoal` (the count the valley keeps up) goes up by one when the lighthouse is first lit ("somebody followed the
  light in").
- It goes up by one when the pyramid is finished ("i heard you had a pyramid").
- Nothing else raises it.

---

## 3. The twelve

For each wonder: **unlock** (the idea, and what puts it into somebody's head), **where**, **made of**, **how it goes
up**, **what it does**, **ritual**, **sandbox hook**, **tests**. Sizes are W × H in cells.

**The tree**, roughly in the order a village gets them:

```
masonry ─┬─ THEATRE (fireworks, three tales)
         ├─ PYRAMID (a king dies)                                    ─ phase 1
         └─ OBSERVATORY (glass, looking out from the tower)  → meteorites: gold & iron
concrete ─┬─ BATHS (somebody climbed out of the pond, shivering)    ─ phase 1
          ├─ HANGING GARDENS (no room for another field)
          └─ STEAM ORGAN (a kettle, a show, a furnace)
scarecrow ── DUCK PALACE (the ducks keep coming)
snowman + your freeze ── ICE PALACE (built again every time you freeze them)
stained glass ── CATHEDRAL & CRYPT (the bell, the dead, a cross weathered away)
oil + glass + big water ── LIGHTHOUSE
forge + concrete ── FOUNDRY (a lot of iron made, a furnace worked hard)
observatory + foundry + concrete + rocket packs ── THE MOON ROCKET
```

### Budget per wonder (against §0)

| wonder | stone | iron | coal | other | gold (optional) | water | ground |
|---|---|---|---|---|---|---|---|
| theatre | 25 | – | – | wood 14 | – | – | ~21 (dug into a slope) |
| pyramid | 70 | – | – | – | 1 (capstone) | – | 23, at the edge |
| observatory | 20 | 2 | – | glass 2 | 0.4 | – | 0 (on the tower) or 9 |
| baths | 10 | – | ~1/150 ticks running | mortar 30 (6 lime), firebrick 6 | – | 27 | 13, sunk |
| gardens | 30 | 3 | – | mortar 10, glass 0 | – | 20 (a loop) | 21 |
| steam organ | 6 | 8 | ~1/100 ticks playing | firebrick 8 | 0.6 (pipe tips) | 40 a concert (an open loop: the rain comes back down round the organ, some into its basin) | 9 |
| duck palace | – | – | – | wood 30, seed from the harvest | 0.6 (dome) | – | 5 (over water) |
| ice palace | – | – | – | snow 60, ice 20 | – | – | 0 lasting |
| cathedral + crypt | 90 | 3 | – | wood 20, stained 13, glass 6 | 0.4 | – | 17 |
| lighthouse | 45 | 2 | – | glass 6, oil 1 per 4000 ticks | 0.2 (reflector) | – | 7 (on a bank) |
| foundry | 20 | – | 4 to start, 2–3 a charge | firebrick 30 | – | – | ~7 (by the furnace) |
| moon rocket | 10 | 12 (50 plates + the engine bell, cast) + 9 (the gantry, ≈ 45 girders) | – | mortar 26, firebrick 10, oil 12 barrels | 0.2 (nose) | – | 13 |

Totals, as **rates**, since stock on hand is about nothing:
- **Stone** ≈ 350 in all. That is about 15,000 quarryman-ticks: one quarryman, on and off, across the whole late
  game.
- **Iron** ≈ 45 in all, the rocket's 21 being most of it. At about 1.3 ore per 1,000 ticks, with props and posts
  held back while a wonder wants iron (`M_IRON_SPARE` 30), that is roughly 40k ticks of a valley's ore, and
  meteorites help.
- **Gold** ≈ 3.4, all optional, with meteorites adding about 1 per 3 showers.

Nothing is gated on a stock the valley does not have, only on the time it takes to make it.

### 3.1 THE THEATRE (phase 1)

> "what if we did the fire again. but on purpose. with chairs"

**Unlock**: fireworks + masonry + 6 alive + 3 tales. Sparked in whoever watched the last fireworks show.

**Tales** (framework, used by the theatre and the cathedral). `g.tales` holds the last 24 memorable things,
`{kind, who, also, tick, x, y}`, recorded as plain data the moment they happen. Recording draws no dice.
- **Kinds**:
  - a death (and how)
  - a house burned down
  - somebody thrown into space
  - somebody struck by lightning
  - a rocket pack that came down hard
  - a nuke
  - a fall through the ice
  - the first of each idea
  - a wonder finished
- **Not mostly deaths**: the theatre's director prefers tales that are not deaths, 3 to 1.
- **At campfires**, once the theatre idea is known, somebody tells one now and then ("remember when Gary went to
  space").

**Where**: a slope or a hollow near the houses. The seats are stepped into the ground where it falls away (dug,
cheap) and built up where it does not. About 21 × 7.

**Made of**:
- a plank stage with a backdrop and two lanterns (wood 14)
- three tiers of stone seats (BRICK, about 50 cells, 25 stone)

**What it does**: every ~7000 ticks, **a play**.
- **The director** (the boredest) picks the best tale nobody has staged yet and announces it in the feed:
  `TONIGHT AT THE THEATRE: THE TIME GARY WENT TO SPACE`.
- **The cast**: two actors walk onto the stage (three in a village of 9 or more). Each kind of tale has a short
  script: a list of `{who, pose, dx, line}` beats played on a timer.
  - *Space*: one actor crouches, the other "throws" (a new `fling` pose, arms forward), the first jumps (a real `pLeap`) and says
    "WHEEEE", and they bow.
  - *Fire*: "it's warm in here", a run across with a bucket, "SPLASH".
- **The tale's subject** plays themselves if they are alive and idle. If they are in the audience instead, they say
  "that's not how it happened". The dead are played by somebody in a hat.
- **The audience** is the idle and the bored, up to everybody. They **sit** (the new pose) on the tiers and react
  from a pool of lines per tale kind: laughs, gasps, heckles ("too soon"). They applaud at the end (a new
  `g.fx.clap` sound in audio.js: noise bursts).
- **Watching** is cosy (thinks twice as fast) and clears boredom.

**Sandbox hook**: set fire to the stage during a play.
- For 120 ticks the audience applauds ("IS THIS PART OF IT?", "very realistic").
- Then somebody notices, and the brigade goes.
- That fire is a tale, and the next play is about it.

**Tests**:
- A death and a space trip are recorded as tales.
- The theatre is planned on a slope and built.
- A play puts actors on the stage and an audience on the tiers, and marks the tale staged.
- A fire on the stage mid-play is applauded for 120 ticks, then fought.
- With no theatre idea, a 6,000-tick village draws exactly the dice it did before (hash equal).

### 3.2 THE PYRAMID (phase 1)

> "the king is dead. we should do something. something BIG"

**Unlock**: masonry + somewhere to quarry (any gallery with rock under it to bench: §1) + a crowned peasant has died. Sparked in the next to be
crowned. A valley whose king never dies can have the greatest mind's death do instead.

**Where**: the widest level ground near an edge of the valley (it goes to the side, out of the way).
- Stepped: **23 wide, 12 courses**, each course one cell in from the last on each side.
- Its sides are therefore stairs, and pathing (`navStand`) climbs them.
- Fill under the low end and dig the high end, as the statue does.

**Made of**:
- about 140 BRICK (70 stone)
- a 3 × 2 chamber left empty in courses 2–3, sealed by course 4
- a capstone of GOLD if there is any, else BRICK, gilded later if gold turns up

**How it goes up**: course by course, standing on the course below.
- The chamber holds the king's name and crown. These are drawn, and saved on the site: `s.tomb = {name, hat}`.
- The capstone is the last cell. Everybody idle comes to watch it go on.

**What it does**:
- **A climb**: the bored and the explorers go up and look out (the tower's lookout task, reused with the apex as
  the spot).
- **Fame**: `popGoal + 1`.
- **Offerings**: gold is left at its foot, as at a statue.
- **It stays up**: mines do not gallery under it. Its cells are marked, and `mBore` refuses marked cells.
- **Ritual**: the reigning king climbs it now and then and says something about their predecessor.

**Sandbox hook**: open the tomb (erase or acid into the chamber).
- The first peasant to walk into it is **cursed** for 3000 ticks. They trip over their own feet: the existing ice
  slip, on any ground, 1 step in 400. They say so ("it's the curse", "i touched nothing").
- Everybody else keeps 6 cells away from the opening.
- The pyramid is reopened for repair, as any site with cells gone is, and sealed back up.

**Tests**:
- The king dies, and the heir gets the spark.
- A pyramid is planned near an edge, and a path exists from its foot to its top.
- With no gold, it is finished with a stone capstone.
- An opened tomb curses the first one in (slips on sand) and is repaired.

### 3.3 THE OBSERVATORY

> "what ARE those little lights"

**Unlock**: glass + masonry + the watchtower's lookout has been used 20 times (a new counter on the lookout task).
Sparked in whoever has looked out most.

**Where**: **on top of a watchtower** (a dome built onto the lookout, no new ground). Failing that, on the highest
ground there is (9 wide).

**Made of**:
- a BRICK dome with a slit (about 40 cells, 20 stone)
- a telescope: a GIRDER tube (2 iron), a GLASS lens (2), GOLD fittings (optional)

**What it does**: an **astronomer** (whoever thought of it, then the boredest) goes up and looks.
- **Meteor showers.** The astronomer predicts one: "there'll be falling stars tonight", and a feed line. Then:
  - Some 1500 ticks later there are streaks across the sky (particles). The idle stop and look up.
  - **One shower in three drops a meteorite.** A lump of about 15 METAL cells with a GOLD cell at its heart, at 900°, lands
    at a random column in the valley. Its impact is a small `sandBoom` (R 3): it can set a bush alight, and a
    house is never targeted within 12 columns.
  - The first peasant to it waits for it to cool under 60, then picks it up as loose metal is already picked up (`L_TAKE`: 0.2 iron a cell, so about 3 bars) and the gold.
  - This is the gold supply: about 1 nugget every 3 showers, a shower every ~9000 ticks while the observatory
    stands.
- **The moon.** Every look adds to `g.moonLooks`. Past 12, the moon rocket's idea is ready.
- **Constellations** (decoration, not mechanic): each look names one ("THE BIG DUCK", "GARY'S HAT", one after
  somebody lately dead). It is drawn faintly over the sky for 600 ticks, linking real background stars.

**Sandbox hook**: watch the sky once it is built. Then go and stand a peasant where the meteorite is coming down.

**Tests**:
- It is built on top of a tower when there is one.
- A prediction is followed by a shower.
- A forced meteorite lands hot, sets nothing within 12 columns of a house, and is dug up as iron and gold.

### 3.4 THE BATHS (phase 1)

> "what if the pond. but warm"

**Unlock**: concrete + 20 coal found + somebody has swum 10 times (`g.swims`, counted when a swim ends on the bank).
Sparked in whoever last climbed out of the water ("brr. what if it were warm").

**Where**: level ground near the houses, sunk into it.
- A CONCRETE basin, 9 wide and 3 deep inside (27 cells of water).
- Under the floor, a **hypocaust**: a flue one cell high along the basin floor, a FIREBRICK stoke-hole at one end
  and a BRICK chimney at the other.
- Two columns and a pediment over it.
- 13 × 9 overall.

**Made of**: about 30 mortar (6 lime), 6 firebrick, about 20 brick (10 stone). Filled with water bucket by bucket,
the way the dug pond is filled, from real water.

**What it does**, all of it the heat simulation:
- **The stoker** puts a coal in the stoke-hole (a COAL cell, lit) whenever the water is under 32. They stop when it
  is over 42, and say so.
- Heat runs up through the concrete floor into the water.
- **Bathing**: peasants who are cold, or bored, go and bathe (§2).
- The eldest complains about the temperature.
- In a cold snap (yours), the baths are where everybody goes instead of the campfire.

**Ritual**: at a quiet moment the idle go for a soak. Gossip lines are about whoever is not there ("did you see
Gary's hat").

**Sandbox hook**:
- HEAT it past 50: they get out and stand round it shouting at the stoker.
- Past 100: it steams, and steam rains.
- COOL it to ice: they skate on it.
- Pour lava in.

**Tests**:
- The basin holds 27 water cells with none leaking in 2000 ticks.
- A coal in the stoke-hole takes the water from 20 to over 32 within 3000 ticks.
- The stoker keeps it between 30 and 46 for 10,000 ticks.
- A cold peasant bathes and stops being cold.
- Water at 60 empties of bathers.

### 3.5 THE HANGING GARDENS

> "no room for another field. so: UP"

**Unlock**: farming + concrete + **no room for another field**. This is a new `iNoRoom(g, "a field")` from
`iPlanFarm` when it finds no plot, recorded as `g.noField`. Sparked in whoever could not find the room.

**Where**: beside water of theirs (a pond, or real water ≥ 20 cells).
- **A one-sided stair of terraces** going up, so that every terrace is open to the sky over its whole width.
- Three terraces of 7 columns each, each 5 rows above the last and stepping 7 columns over, built against a slope
  where there is one (cheaper) or on BRICK piers.
- **It goes where fields cannot.** It is only ever wanted when the flat is full, so `wPlot` looks for it on
  rough or sloping ground (a run of 21 columns rising at least 6 rows), where a field's flat 11 will not fit.
- A CONCRETE cistern (3 wide) on top.
- About 21 × 17.

**Made of**: about 30 BRICK (15 stone), 10 mortar, and 3 iron for the screw.

**The farm code**:
- Each terrace is a **terrace field**: a new field kind sharing everything with `farm` except its plot rule.
  - Width 7 instead of `I_FARM_W` 11.
  - Clear sky above, 7 rows (wheat grows `I_CROP_H` 4 ± 2), instead of 12.
- Terrace fields **do not count against the field cap** (that is what they are for).
- About 21 growable cells on 21 columns of ground: the same yield per column as a field on the flat. The gain is that
  it exists at all when the flat is full, and that it waters itself.

**The screw**: an Archimedes screw, a slanting tube of GIRDER from the water to the cistern, with a crank.
- **The screw-turner** turns it.
- Every 20 strokes a cell of water is taken from the bottom and put in the cistern. This is the oil pump's take and
  place, for water: conserved.
- The cistern spills from a gap at its lip onto the top terrace. What the wheat does not drink runs off each lip to
  the one below, and back into the pond. **A real loop, in real water.**
- Flowers grow along the lips.

**What it does**: food, at the cap and beyond it, needing no buckets.

**Ritual**: the screw-turner sings. The ducks paddle where the water comes back down.

**Sandbox hook**:
- Salt water in the cistern kills the wheat, top terrace first.
- COOL the falls: the water freezes mid-step.

**Tests**:
- No room for a field sparks it.
- The terraces are fields that are sown and grow.
- The screw moves water up, and the count of water cells in a closed box is unchanged over 5000 ticks.
- Water reaches the bottom terrace.

### 3.6 THE STEAM ORGAN

> "the kettle sang. what if a lot of kettles sang. at once"

**Unlock**: concrete + fireworks (they like a show) + the furnace has been worked 50 times. Sparked in whoever is at
the furnace when a bucket of water hits something hot and hisses (any `fx.hiss` within 10 cells of a peasant who
knows concrete).

**Where**: near where fireworks shows go up, on open ground with sky over it. 9 × 22.

**Made of**:
- a **boiler**: a closed FIREBRICK firebox under an iron (GIRDER) tank holding 40 water
- a **rack of seven pipes**: each a one-cell-wide channel of empty air walled with GIRDER, open at the top, of
  seven heights (6 to 18), each rising from the tank's lid through a valve cell (a GIRDER the organist takes out
  and puts back)
- a **catch-basin**: a CONCRETE apron round the organ's foot, 9 wide with a lip.
  - **The loop is open, honestly.** A condenser cannot keep up in this heat model. A steam cell gives up 1,200 of
    latent heat, and a 9-cell iron hood warming to 100 takes about 1,080, then carries it off to the air at almost
    nothing.
  - So the steam goes up to the top of the world, where the heat gets out. It cools and condenses there, as steam
    already does, and rains back down roughly where it rose, because there is no wind.
  - What lands in the basin, the organist bails back into the tank.
  - What misses the basin is rain on whatever is next to the organ: put it by the fields.
- gilded tips if there is gold

**What it does**, physically:
- **The organist** fires the boiler with coal well before a show, so that the water is simmering by then, and
  really boiling (100) when it starts.
- The steam really rises up whichever pipes have their valves open. The organist opens the valves to a tune: a short
  sequence per show, from a little list (`W_TUNES`).
- **Each steam cell that leaves a pipe's top plays that pipe's note** (a new `organ` voice in audio.js: a breathy
  square wave, pitch by pipe height).
- **A concert is about 30 notes**: a tune from `W_TUNES`, each note one or two steam cells. A 40-cell tank plays one
  concert per filling.
- Over the next few thousand ticks the rain comes down, part of it into the basin. Between the basin and buckets
  from the pond, the tank is filled again before the next show.

**Ritual**:
- It plays at every fireworks show, every play's interval and every cathedral service, and once in a while on its
  own.
- The audience sways. Somebody says "it's a bit loud".

**Sandbox hook**:
- HEAT the boiler and it plays faster.
- Block the pipes (paint stone over the tops) and the steam has nowhere to go. It pushes out through the valves, and
  `sandPressure` does what it does.
- COOL it mid-tune and it goes flat (fewer steam cells, quieter notes).

**Tests**:
- A fired boiler makes steam that leaves through open pipes only.
- A concert of 30 notes empties no more than 40 cells.
- Over 6000 ticks, the rain the basin catches is counted, and reported.
- Each pipe exit triggers its note (counted).
- The steam comes down as water within the valley.
- A boiler with every pipe closed for 600 ticks has its organist open one ("let it breathe").

### 3.7 THE DUCK PALACE

> "if you can't beat them, house them"

**Unlock**: the scarecrow + 40 raids + 4 ducks. Sparked in whoever has shooed the most ducks.

**Where**: at the edge of the biggest fresh water (≥ 30 cells), half on the bank and half on stilts over the water.
11 × 12.

**Made of**:
- a plank deck and three nesting boxes
- a ramp into the water
- a little dome (GOLD if there is any, else planks painted, i.e. shade)
- a trough, **on the bank end of the deck**, level with the bank, so a duck walking along the shore reaches it
  (ducks arriving by water climb the ramp)

**What it does**:
- **Seed.** When a field is reaped, the reaper keeps a handful of `seed` (a pocket item, 1 per harvest, 3 at most).
- **The feeder** carries it to the trough and scatters it there as **real SEED cells** (3 a handful).
- **The ducks.** Ducks have no hunger and no new state: `dTasty` already treats SEED as food, and `dScan` already
  finds it, so a trough with seed in it is simply nearer and easier than the wheat, which the scarecrow guards. To
  make it reliably nearer, `dScan`'s range is widened for SEED in a palace trough (a single lookup).
- **Raids** drop accordingly (the test measures it).
- **Nesting**: when the existing duckling roll is made for a duck on or beside the palace deck, the odds are doubled,
  under the existing cap on ducks. No new duck state.
- **The crown**: the eldest duck wears a tiny crown (drawn).

**Ritual**: the feeder is mobbed. "the ducks are not impressed. well, a bit".

**Sandbox hook**:
- Throw a duck at it: the ducks are offended and boycott it for 2000 ticks.
- Set fire to it: the ducks fly, and the brigade comes.

**Tests**:
- Seed in the trough draws a duck past the wheat.
- With the palace fed, raids per 10,000 ticks fall by half against the same seed without it.
- The duck count never exceeds its cap.

### 3.8 THE ICE PALACE

> "the snowman was lonely. so we built him a palace"

**Honest about weather**: there is none. **The ice palace is your reward for freezing them.**

**Unlock**: a snowman has been built + somebody has skated, both of which already happen only when you make it cold.
Sparked in whoever built the snowman.

**When**: **150 cells or more of snow or ice within 60 columns of the houses**, and air at the houses under 0.

**Where**: on the snow, near the houses. **A quick build**, 11 × 9:
- PACKSNOW walls with crenellated towers
- ICE windows, a lantern inside (the ice glows blue)
- an ICE floor

It is built **out of the snow lying there**. The plan's PACKSNOW cells are paid for by snow shovelled from within 30
columns, by the existing snow-scooping. Anybody idle helps (no crew cap, and it does not wait for the great work). It takes about 1000 ticks with three
 hands, quick enough to finish before
your cold lets up.

**What it does**, while it stands:
- skating inside, and snowball fights round it (the existing play)
- lantern-lit and cosy
- the lantern's warmth inside is real, and slowly melts the windows (a joke the sim makes on its own)

**It melts** when you stop. When more than half of it has gone to water, it is a ruin, and the village mourns it the
way it mourns a snowman. **Built again** every time you freeze them.

**Sandbox hook**: COOL the village, or paint snow, and wait. Then HEAT it.

**Tests**:
- A painted freeze with snow about plans it.
- It is built of packed snow in under 1500 ticks with three hands, and under 2500 with two.
- It goes up while a pyramid is also going up.
- Heat melts it and the village mourns.
- A second freeze builds it again.

### 3.9 THE CATHEDRAL & CRYPT

> "the bell wants a better home. and the dead want somewhere to be remembered out loud"

**Unlock**: stained glass + the bell up + a cross has weathered away (the graveyard is full). Sparked in whoever was
at the graveyard when it went.

**Where**: level ground with open sky high above. 17 wide, 32 tall at the spire.

**Made of**:
- a nave, 15 × 12, of BRICK with buttresses
- a plank floor and pews, two doors
- tall windows (GLASS) and a **rose window**: a 5 × 5 diamond of 13 STAINED panes, green and amber, ruby at the
  heart if there is gold
- candles (LAMP)
- a spire with an iron **lightning rod** and a weathercock (gilded, optional)
- **the crypt**, dug under the nave in the rock or sand below: a ladder down, and a gallery with a niche for each of
  the dead, each with a candle

About 90 stone, 20 wood, 13 stained, 6 glass, 3 iron. The crypt is labour.

**What it does**:
- **The rod** (§2) protects the village within 10 columns. The first strike it takes is news ("it WORKS").
- **The windows glow** in their colours when the candles are lit: the only coloured light in the valley.
- **The crypt**: every name in `g.dead`, including the ones whose crosses weathered away, gets a niche, so the
  weathered names come back. The bored go down with a candle and visit (`iTaskVisit`, with the niche as the place).
  - Flooded, it is **bailed**. This is a new bail target (tidy.js has none that fits: house floors are bailed out of
    a door, and mines are written off).
    - A bailer fills a pail in the crypt, climbs the crypt ladder, and pours it out on the nearest ground lower than
      the crypt's head, or into the nearest real water.
    - Nothing evaporates at 20, so it is never just left. About 80 lines, costed in §5.
- **Services**, every ~9000 ticks:
  - The bell (rehung in the spire, if there is one; the old bell site is then taken down and its gold kept) rings
    for a gathering.
  - The idle file in and **sit** on the pews.
  - The eldest says a few words for the dead, by name and how, from `g.tales` ("for Gary, who went to space").
  - Thinking runs twice as fast for 1000 ticks afterwards.
  - The steam organ plays, if there is one.
- **Shelter**: in a nuke or fireworks panic, the cathedral is where those far from home hide (`bHide`).

**Sandbox hook**:
- Strike LIGHTNING on the houses beside it: the rod takes it.
- Strike the open field beside it: the rod does not.
- Set fire to the pews. The stone stands and the brigade comes. If it gets hot enough the windows melt and set as
  plain glass, and the glazier puts the colours back.

**Tests**:
- A bolt aimed at a house 8 columns off goes to the rod and nothing burns.
- A bolt aimed at open ground 8 columns off lands where aimed.
- The rose window is stained.
- A weathered name gets a niche.
- A service fills the pews and names the dead.

### 3.10 THE LIGHTHOUSE

> "somebody was out on that water in the dark. never again"

**Honest about water**: no valley left alone has enough. **The lighthouse is your reward for giving them a lake.**

**Unlock**: oil + glass + masonry + a body of water of **150 cells or more** (paint a lake). Sparked in whoever swims
in it first.

**Where**: on the bank of the biggest water. 7 × 30:
- a BRICK tower with red bands (shade)
- a ladder inside
- a gallery with iron rails
- a GLASS lantern room
- a lamp (LAMP × 2) behind a reflector (gilded, optional)

**What it does**:
- **The keeper** carries a barrel up from a well's tank whenever `fuel` (on the site) runs under 1000 ticks. A
  barrel is 4000 ticks.
- **The beam** sweeps, drawn in the glow buffer. It is real light for the game's purposes: cells it crosses count as
  lamplight (`iLampNear` gains the beam), so whoever it passes over thinks faster for a moment.
- **Swimmers** whose breath is low swim for the lighthouse's bank (the swim target, when the lighthouse is lit and
  within 80 columns).
- **Flying ducks** arriving from the edge make for the lit water.
- `popGoal + 1`, the first time it is lit.
- **When it runs dry** it goes dark, and that is news, with the keeper named.

**Sandbox hook**: LIGHTNING on the lantern room (the rod is on the cathedral, not here). There is oil up there: a
fire at the top of a tower, and a brigade that has to climb.

**Tests**:
- A painted lake of 200 sparks it.
- It is planned on that lake's bank.
- The keeper fuels it from the tank.
- Unfuelled it goes dark.
- `popGoal` goes up once and only once.

### 3.11 THE FOUNDRY

> "the furnace makes a bar at a time. what if it made a ship"

**Unlock**: the forge + concrete (for firebrick) + 60 iron made in all + the furnace has smelted 40 times. Sparked
in whoever has worked the furnace most.

**Where**: beside the furnace, by the mine. 9 × 16.

**Made of**:
- a stack, 5 wide and 14 tall: a **closed chamber** inside (3 × 5) of FIREBRICK, cased in BRICK, with iron bands.
  FIREBRICK is *insulating* firebrick: light (heat capacity 0.8) and slow (conductivity 0.03, a quarter of stone's),
  so the chamber keeps its heat
- a charging door at the top, with a ladder up to it
- two FIREBRICK **tap plugs** at the foot, one each side
- under the **left tap**, the **plate mould**: a firebrick trough **5 long and 2 deep**, with a lip. It holds 10
  cells, a whole 2-bar charge. It is two cells below the tap
- under the **right tap**, the **bell mould**: a firebrick cup shaped like a 3 × 3 engine bell (9 cells, with a
  1-cell lip). It holds a 2-bar charge with a cell to spare. It is used once, for the rocket's engine bell, then
  for plates when the plate mould is full or cooling

**What it does**, physically:
- **Chargers** carry up iron bars and coal, and tip them in at the top. **A bar goes in as five METAL cells.** That is
  what a bar is everywhere else: a girder is a fifth of a bar, and loose metal picks up at 0.2 a cell. Coal goes in
  as COAL cells, lit.
  - Ore is not charged. The furnace gets a whole bar out of an ore, and the foundry would get only a cell.
  - A charge is 2 bars: 10 cells of iron in a 15-cell chamber.
- **The bellows-worker** works the bellows: forced draught (§2). The burning coal in the closed chamber drives it
  past 1500, and the iron runs (METAL melts at 1500, to LAVA aux METAL, as it already does).
- **The arithmetic.**
  - Melting a METAL cell takes 1.5 × 1480 + 500 ≈ 2,700. A charge of 10 takes ≈ 27,000.
  - The firebrick lining (≈ 24 cells × 0.8 × 1,480 ≈ 28,000) has to come up the first time, and stays hot between
    charges, losing slowly through its low conductivity.
  - An ember gives up to `HEAT_POW` 40 a tick for ≈ 416 ticks under the bellows: ≈ 17,000 a coal, at best.
  - So **a cold start is about 4 coals of pre-heat**, and **a charge is about 2–3 coals**. The furnace's coal per bar
    is 2 coals for 2 bars.
  - The exact numbers are set by the test, not here: the coal per charge is whatever gets 80% of the charge liquid
    in 2500 ticks, plus one.
- **Ash.** Burnt coal leaves ASH in the chamber. Between charges, the charger rakes it out of the charging door into
  a pocket and takes it to the store. That gives potash and black powder a source of ash in a valley nobody sets
  fire to.
- When the hover says the chamber is "mostly running", **the tapper** knocks out the plug. Molten iron at 1500+ drops
  two cells into the firebrick trough and **sets there almost at once** as a **plate**: a METAL cell in the trough,
  aux marked `plate`. Firebrick does not mind 1800.
- When it is under 100, the plates are prised out into pockets as `plate`, a new pocket resource: **one plate a cell**,
  so a charge of 2 bars is 10 plates. Iron is conserved: a plate is 0.2 of a bar, as a girder is. The plug goes back.

**Why**:
- **Plates** are what the moon rocket is made of, and only the foundry makes them.
- **The forge cannot make anything bigger than an axe.** A hull has to be cast, and the foundry is where iron is
  run and cast. The rocket's 50 hull plates are 10 bars, and its **engine bell** (a 3 × 3 casting, cast whole in a
  bell mould under the right tap) is 2 more.
- **It is the valley's ash.** A coal burnt in a closed chamber leaves its ash where it can be raked, which no
  campfire does.

**Sandbox hook**:
- Knock out the side of the mould while it pours: molten iron in the village.
- Pour water on the trough while it pours: steam, a lot of it, all at once.

**Tests**:
- A closed chamber of lit coal with the bellows worked has at least 80% of a charge liquid and over 1500 within
  2500 ticks.
- Unworked, it never passes 760.
- A charge of 2 bars, tapped, sets as about 10 cells in the trough: 10 plates, and the iron count is unchanged.
- After a tapped charge has set, there is no METAL or LAVA outside the mould, for either tap.
- A 2-bar charge tapped into the bell mould sets as the 9-cell bell, and the spare cell is a plate.
- The ash is raked out.
- The plates are pocketed.
- The firebrick never melts.

### 3.12 THE MOON ROCKET

> "the astronomer says the moon is a place. a place is somewhere you can go"

**Unlock**: the observatory (12 looks at the moon) + the foundry + concrete + 3 rocket-pack flights + 30 barrels
pumped. Sparked in the astronomer.

**Where**: flat open ground with **clear sky to the top of the world**. 13 × 40.

**Made of**:
- a **launch pad** of CONCRETE (13 × 2) with a FIREBRICK flame trench
- a **gantry**: one GIRDER leg, 36 tall, with an arm to the rocket every 6 rows and a ladder up it (≈ 45 girders,
  9 iron, counted from its plan)
- **the rocket**: 5 × 22, **a hollow shell**: an outline of METAL plates (`plate` 1 each, about 50 cells, so 10
  bars: what the foundry is for) and the cast engine bell (2 bars), the inside drawn rather than built, fins, a GLASS porthole, and a nose that is
  gilded if there is gold
- **fuel**: 12 barrels, on the site's pile (`stock.oil`). Carried from well tanks a barrel at a time, as the keeper
  does.

**How it goes up**: the pad, the gantry, the rocket inside it course by course, then the fuel.

**The launch** (new engine work, costed in §5):
- When fuelled, **the crew** climb the gantry and get in. The crew is up to three: the most rocket-pack flights, the
  astronomer, and whoever has had most ideas. Crew peasants are held as `p.aboard = siteId`: they stand in the shell, not
  drawn, and not stepped beyond their own clocks.
- **A countdown** in the feed (10 to 1). The idle gather at a safe distance (the fireworks watchers' machinery).
- **Lift-off**:
  - The rocket's cells are taken out of the grid with `heatVanish`.
  - It becomes one entity, `g.rocket = {x, y, vy, cells}`: drawn from its cell list, stepped with acceleration.
  - It puts FIRE and SMOKE cells into the grid under it as it climbs (real fire on the pad: concrete and firebrick do
    not burn; anything near that does, will).
  - Screen shake.
  - It leaves the top of the world.
- **The moon**: a few seconds later a tiny flag appears on the moon (`g.moonFlag`, drawn for good) and the banner
  `ONE SMALL STEP`: "{n} is on the moon. it is mostly dust. they wave".
- **The way back already exists.** At lift-off the crew are sent to space by the existing `pSpace`, with `spaceT`
  set to about 3000 and the re-entry x set over the pad (a new per-peasant `p.spaceX`, read where peasants.js
  picks the re-entry x at random; about 5 lines). The moon crew get their own feed line ("{n} has gone to the moon"),
  not the existing "has gone to space"; `g.astronauts` still counts them. peasants.js already brings them back in at the top of the
  world as `fly`, and the existing parachute takes it from there (mostly it opens). Each brings 2 MOON ROCK.
- **The moon rock** is set out at the foot of the statue, or of the gantry, where everybody can see it.

**After**:
- The astronauts' idle lines change for good ("i've seen it from up there. it's very small") and they wear a little
  helmet (a new hat).
- The gantry stays. The bored climb it.

**Sandbox hook**: set fire near the rocket while it is fuelled. It is a very large firework: `sandBoom` at R 14, its
plates flung as METAL, and the crew (if aboard) thrown clear on parachutes.

**Tests**:
- A built, fuelled rocket launches with its crew aboard.
- Its cells leave the grid, and heat is conserved to within the energy of the FIRE it put out.
- The flag is set.
- The crew come back down, open their chutes (or not), and carry moon rock.
- Fire at a fuelled rocket blows it up.

---

## 4. Room in the valley

| wonder | new ground | how |
|---|---|---|
| theatre | ~21 | dug into a slope |
| pyramid | 23 | at the edge |
| observatory | 0 (9 without a tower) | on the watchtower |
| baths | 13 | sunk |
| gardens | ~21 | only ever built when the flat is full, and is the next field |
| steam organ | 9 | tall |
| duck palace | ~5 | half over water |
| ice palace | 0 lasting | melts |
| cathedral | 17 | tall; crypt underneath |
| lighthouse | 7 | on a bank (only with a lake) |
| foundry | ~7 | beside the furnace |
| moon rocket | 13 | tall |

That is about 136 columns more for all of them. A crowded valley gets 7–9, and `iNoRoom` says so for the rest. The
plot finder (`wPlot`) is told the footprint, whether it may be sunk or stepped into a slope, how much sky it needs
above, and whether it prefers an edge. It never touches a house, a field, a mine, or the heap.

---

## 5. Code

### Files

| file | what |
|---|---|
| `wonders.js` | **The framework.** The registry (`W_DEFS`) and dispatch (`wPick`, `wTask`, `wStep`, `wDraw`, `wDrawOver`, `wLabel`, `wFinish`, `wReadout`). The wonder IDEAS entries and banner. The great-work rule and crew cap. Valley-wide hauling. `wPlot`. Gold-as-gilding (`wGild`). Tales (`g.tales`, `wTale`) and their hooks at death, fire, space, lightning, rocket, nuke and ice. The header counter and hover. Achievements. The CONCRETE and STAINED GLASS ideas. Furnace recipes (lime, firebrick, stained) and mortar mixing and pouring. The lightning rod. Gatherings (`wGather`: a place, a cap, idle only, a time limit, seats). The `sit` pose. |
| `monuments.js` | theatre, pyramid, cathedral & crypt |
| `pleasures.js` | baths, hanging gardens, duck palace, ice palace, steam organ |
| `heavens.js` | observatory (and meteorites), lighthouse, foundry, moon rocket (and the way back from space) |

**Load order** in `index.html`: after `tidy.js` and before `ducks.js`: `wonders.js`, `monuments.js`,
`pleasures.js`, `heavens.js`.

### Registration

Each module registers its wonders:

```
W_DEFS.push({ id, plan(g, p), pick(g, p, hungry), task(g, p, k), step(g), draw(g), drawOver(g), finish(g, s, p),
              label(s), readout(g, s, j) })
```

### Hooks into existing code (the framework makes all of these, once)

| where | hook |
|---|---|
| `iPick` | one line, before `mPick` |
| `iTask` | dispatch |
| `ideasStep` | `wStep` |
| `drawWorld` | `wDraw`, `wDrawOver` |
| `bLabel` / `iLabel` | labels |
| `bFinish` | |
| `bOpenCount` | wonders excluded |
| `sandLightning` | the rod |
| `sandBoom` | concrete |
| heat tables | the new materials |
| `HEAT_SRC` override | forced draught |
| `pSwim` | bathing |
| `iPlanFarm` | no room for a field |
| `dHeading` | the duck palace target |
| `audio.js` | `clap`, `organ` voices |
| `game.js` | header, readout, `MAT_NAME`, colours, picker entry for WET CONCRETE |
| peasant sprite | the `sit` pose |

### New engine work, sized

| what | where | est. lines |
|---|---|---|
| `sit` and `fling` pose sprites, and seating | peasants.js | ~80 |
| forced draught (per-chamber `HEAT_SRC` override list) | heat.js | ~40 |
| rocket entity (draw, step, exhaust, edge) | heavens.js | ~150 |
| return from space | none: the existing `pSpace` / `spaceT` (a re-entry x, ~5 lines) | ~5 |
| meteorite (particle streak, landing, cells, boom) | heavens.js | ~100 |
| audio voices (clap, organ) | audio.js | ~40 |
| bailing the crypt (pail up a ladder, out to low ground) | monuments.js, using tidy.js helpers | ~80 |
| benching a gallery (`wQuarryPlot`, props lengthened, ladder extended) | wonders.js | ~140 |

### Tests

`test/wonders.js`, `test/monuments.js`, `test/pleasures.js` and `test/heavens.js` each export
`function (test, check, sim)`, and `test/run.js` requires them. The module authors never edit the same test file.
- Each wonder has the tests listed above.
- **Quarrying** (framework tests):
  - A wonder short of stone sends one quarryman, who benches a gallery and brings stone to its pile.
  - The bench is always climbable out of.
  - Loaded from the user's own save (`pleasand-20261120-092456-t637685.json`, where there is "nowhere for another
    mine"), a forced wonder still gets its stone by benching.
- **Phase 1 records** in its report:
  - the build rate for a crew of 2
  - the forge's iron use, and the share of peasants with tools, before and after the hold-back
  - how long a tapped pour stays liquid on cold firebrick (if it runs, the mould gets a water channel under it)
  - the organ's coal and water per concert, against how often concerts come (if it is too much, it stops playing at
    every play's interval)
- Plus **an 8-peasant village** with the wonder ideas forced at tick 0, 40,000 ticks on three seeds:
  - nobody starves
  - the `test/stuck.js` observer flags nothing
  - no exception
  - at least as many wonders finished as the phase-1 build rate predicts for 40k ticks (stated in the test, with the
    measurement it came from)

---

## 6. Order of work

1. **Phase 1 (framework + three wonders)**: wonders.js with everything in it, and the **theatre, pyramid and baths**.
   - Tests for each.
   - The full suite green.
   - Replay hashes checked (re-recorded with a reason if they move).
   - A headless soak of 40k ticks on three seeds, and screenshots (`sim.png`) of each wonder to look at.
   - **Look at it before going on.** If the shape of the framework is wrong, it is fixed now, while three wonders use
     it, not twelve.
2. **Phase 2 (the other nine, in parallel)**: three agents, each in its own git worktree, each owning one module file
   and its test file:
   - monuments: cathedral & crypt
   - pleasures: gardens, duck palace, ice palace, steam organ
   - heavens: observatory, lighthouse, foundry, rocket

   Any change one of them needs in the framework or in existing files is asked for in its hand-back and made by me,
   not by them. That keeps the merges clean.
3. **Merge and soak**: the long soak again (all twelve forced), frame time measured with the harness profiler
   (`--profile`) before and after, and screenshots.
4. **README**: a section in the house voice, *Things to try*, and *Files*.
5. **Review** by pi. Fix every P0 and P1, and review again until there are none.

---

## 7. Risks

- **Space.** A crowded valley gets fewer wonders. Accepted. The on-top and underneath wonders (observatory,
  foundry, gardens, crypt, palace) need little or no ground.
- **Labour.** The crew is capped at a third of the village; gatherings take only the idle; wonders never block
  `B_OPEN`. The 8-peasant soak checks it.
- **The heat-driven wonders** (baths, organ, foundry) depend on the sim's numbers. Each has a bounded-time test, and
  forced draught is tuned against it.
- **Player-driven wonders** (ice palace, lighthouse) are said to be so, in the hint ("a lake", "a freeze") and in
  *Things to try*. `SEVEN WONDERS` is made for a valley you have helped (a lake, a freeze). Whether a valley
  left alone can reach it is measured in the soak and reported, not promised.
- **Determinism.** Every new roll is behind an idea or a built wonder. Tales are recorded without dice.
- **Performance.** The beam, the constellations, the meteors and the rocket are drawn once a frame. Steps run on a
  30-tick stride. Forced draught is a short list. Measured.
- **The rocket's exit** is done with `heatVanish`, and the exhaust's heat is the burning oil's, so heat stays
  accounted for.
