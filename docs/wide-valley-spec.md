# The wide valley: a world four screens wide, and a way to look along it

Status: spec, v3.1, approved (v3: UX 8.8 / C 8.5 / E 8.6; v1 review: UX 7.0 / C 5.5 / E 6.0; v2: UX 8.3 / C 7.6 / E 8.0; every point addressed below).

## 1. What and why

The field today is exactly one screen: 272 x 186 cells, drawn at 2 game pixels a cell into the 544 x 372 play area
right of the picker. This makes the valley **four times as wide (1088 x 186 cells)** and lets you **scroll it
sideways**. The height, the cell size, the picker, the header and the description bar are unchanged: you see the same
272 columns at a time, at the same zoom, and look along the rest.

What a player gets: room. Room to pour a lake without drowning the village, to build a volcano at one end and a dam at
the other, to throw a peasant a long way, and a village that has somewhere to grow into.

### Goals

1. World 4x wider; viewport unchanged in size and zoom.
2. Scrolling that feels native on every input a player has: trackpad, mouse, keyboard, touch, and while dragging.
3. You never lose the village: an overview strip shows the whole valley and where you are in it, and the news can take
   you to what it is talking about.
4. Nothing the village does gets worse for being in a big valley: no peasant walking 800 columns for a field, no
   meteorite landing where nobody will ever see it.
5. 60 fps at 1x and 2x on a mid-range laptop, as now.
6. Old saves still load; the test suite, its recorded hashes and the harness keep working.

### Non-goals

- Vertical scrolling or zoom. The world is exactly as tall as the screen.
- A camera that follows things on its own. The camera only moves when you move it (or click something that says
  "take me there").
- A bigger village. The village keeps its present caps (six houses, the population it started with); the extra room is
  for the player, and for the village's works to spread out within its range (section 6).
- Multi-touch gestures (pinch, two-finger pan). The game handles one pointer at a time, and still will.

### The one hard rule: a one-screen valley is bit-identical to today

A valley exactly `VIEW_GW` wide (old saves, and the test suite: section 9) must **generate, simulate and roll the
village's dice exactly as master does**: the recorded hashes in `test/wonders.js`, `test/run.js` and
`harness/playtests/*.json` must not change. Every new behaviour below is either gated on `g.gw > VIEW_GW` or written
so that at `gw == VIEW_GW` it computes the same numbers with the same `Math.random` calls in the same order (for
example `vrange.x0 + irnd(vrange.x1 - vrange.x0 + 1)` is `irnd(gw)` when the range is the whole world). The camera
never rolls the village's dice; the strip, the edge markers and every other new drawing roll the side dice (they are
inside `gameDrawSide`).

## 2. Geometry

| name | value | meaning |
|---|---|---|
| `VIEW_GW` | 272 | columns on screen (today's `GW`) |
| `GH` | 186, **a literal** | rows. No longer derived from `VH` |
| `PLAY_H` | `GH * CELL` = 372 | play area height in game px |
| `PLAY_B` | `PLAY_Y + PLAY_H` = 386 | bottom of the play area |
| `MAP_Y`, `MAP_H` | 386, 10 | the valley strip (section 4) |
| `BAR_Y` | `MAP_Y + MAP_H` = 396 | the description bar (`BAR_H` 14, unchanged) |
| `VH` | `BAR_Y + BAR_H` = 410 (was 400) | game pixels tall |
| `WORLD_GW` | 1088 (= 4 x `VIEW_GW`) | columns in a new valley |

- `g.gw` is the world width. Everything that already uses `g.gw` / `g.gh` for the grid keeps working. `GW` is
  retired; code that meant "the screen" uses `VIEW_GW`.
- Every expression that meant "the bottom of the play area" or "the bar" and was written as `VH - BAR_H`,
  `VH - BAR_H - 4`, `VH - BAR_H - 16` (debug readout, thermal key) or `VH / 2` is rewritten on `PLAY_B`, `BAR_Y` or
  `PLAY_Y + PLAY_H / 2` (= 200, today's `VH / 2`). Every `VH / 2` hit is classified, and in particular `newGame()`'s
  boot pointer `my: VH / 2` becomes `PLAY_Y + PLAY_H / 2`: the "being watched" check reads `g.cy` from tick one, so a
  pointer that boots 5 px lower would roll a 272 village's dice differently. The PAUSED box likewise. The
  implementation greps `VH` and `BAR_H` across all files and classifies every hit.
- Screen layout, top to bottom (x from `PANEL`=96 to `VW`=640 for the field and strip): header `0..14`, play area
  `14..386`, strip `386..396`, bar `396..410`. The picker column runs `14..410`; its rows and buttons keep their y
  (they end at 399), so `PANEL_LAYOUT` and recorded harness clicks are unchanged; the 11 px below is panel
  background.
- `index.html`: the canvas becomes 640 x 410, CSS `width:min(100vw, 156.1vh); height:min(64.06vw, 100vh)`.
  `resize()` and `drawChrome()` already use `VH`; the canvas stubs in `test/sim.js` and `harness/loader.js` change
  from 400 to 410.

### Width is per game

- `gameInit(g)` reads the boot width `g.bootW = window.PLEASAND_GW || WORLD_GW` (clamped to `>= VIEW_GW`) and builds
  the game at it **exactly as today's code does** (same allocation order, same sky dice from the village's dice), so a
  272 boot is today's boot.
- Allocation is split out: `gameAlloc(g, w)` makes every grid-sized array and canvas, and the sky, for width `w`.
  `gameInit` calls it once at boot. `gameResize(g, w)` calls it later (a load or NEW that changes width) and keeps the
  UI fields (`sel`, `size`, `speed`, `paused`, `thermal`, `hush`, `debug`, `tip`), and builds the sky with the
  **side** dice so a resize never moves the village's dice.
- Grid-sized scratch kept elsewhere (`partInit`, `heatInit`, the pathfinder's `navSeen`/`navShut`, `zmark`/`zlist`,
  `pmark`/`pstack`, anything `g.*` typed array of length `gw*gh`, `gw` or `gh`) is reallocated by `gameAlloc`, or,
  if a module allocates it lazily on first use, dropped (`delete g.k`) so it is remade at the new size. Found by
  grepping `new (Uint|Int|Float)\w*Array(`, and **checked by a test**: after `gameResize` and 600 ticks, every typed
  array on `g` has length `gw*gh`, `gw`, `gh` or a size on an explicit exempt list in the test.

### The camera

- `g.camX`: the world column at the left edge of the view, a float, clamped to `[0, g.gw - VIEW_GW]`. `g.camT`: where
  it is heading. `g.camI = Math.round(g.camX)`, fixed once a frame at the start of `gameUpdate`, before the cursor
  is converted and anything is drawn.
- Drawn at `camI`: the picture moves in whole cells (2 game px), which keeps every cell crisp at every canvas scale.
- **One** pair of helpers converts between screen and world, and every screen-space draw and every pointer read goes
  through them: `scrX(x) = PANEL + (x - g.camI + 0.5) * CELL` (the existing helper, made camera-aware), `scrY`
  unchanged, and `g.cx = (g.mx - PANEL) / CELL + g.camI`. So `sandCell`, `cellAt`, brushes, eyedrop, grabs and
  lightning all work in world cells unchanged.
- **Audit**: grep every file for `PANEL +`, `PANEL -`, `- PANEL)`, `g.gw * CELL`, `gw * CELL`, `.width * 2 * CELL`,
  `.width * 4 * CELL`, `drawImage(g.vc` and `drawImage(g.gc`. Known sites: `game.js` (`gameDraw` field and glow
  blits, cursor, held-peasant and duck brackets, ruled-line preview, throw-preview dots, the readout tooltip, the
  stat popup's x clamp), `peasants.js` (`peasantGrab` position, speech bubbles and their x clamp, ghosts), `ducks.js`
  (grab position, bubbles), `harness/harness.js` (`toScreen`, cursor helpers), and the tests that set `g.mx` by hand.
  **Deliberate exceptions**, each with a comment saying so: `cursorSample` / `cursorVel` (screen cells: see below) and
  the panel/header/strip hit tests (screen space by nature). No other conversion may ignore the camera.
- **Throwing**: the cursor-velocity samples stay in **screen** cells, so a throw is as hard as the flick even if the
  view edge-panned during the drag. The held peasant or duck tracks the cursor in the world.
- **The camera and the simulation**: the only sim code that reads the pointer is the "being watched" chat check
  (`peasants.js:1664`, `g.cx` / `g.cy` / `g.mx > PANEL`), which already makes a village depend on where the mouse is.
  It keeps reading `g.cx` (now a world column, which is what it means). To keep replays exact, camera moves are
  journalled, **coalesced**: a `saveInput(g, "cam", { x: camI })` is written when `camI` has settled (unchanged for
  one update after changing), and also immediately before any other journalled input if `camI` differs from the last
  value journalled. So a glide or a swipe is one entry, not sixty, and never pushes clicks out of the bounded input
  history; and every tick that reads `g.cx` while a click is being made sees the journalled camera. (During a glide
  with no click, only a peasant's idle chat line could differ on replay: the same class of difference a moving mouse
  already makes, which the save's note already declares.) The harness replays a `cam` input by setting
  `camX = camT = x`: given as a scenario op, as a raw journal row (`_apply`), or converted from a save's
  `history.inputs` with `h.journalCams(rows)`. (The rest of the browser journal stays for reading, as before.)
- `camX` / `camT` are ordinary saved fields of `g`, **not** in `SAVE_POINTER`: every load (the browser's LOAD uses
  `keepPointer`) takes the camera from the save, then clamps it to the (possibly resized) world; a save without one
  centres on the village. `camI` is derived each update and is in `SAVE_SKIP` **and** `harness/snapshot.js`'s
  `SKIP` (a test checks the two lists match); so is the strip's cache (`g.stripC`).
- Input state for scrolling lives on `g` and is in `SAVE_INPUT` (reset by `saveApplyState` like the pointer):
  `g.whlAxis`, `g.whlT` (the wheel gesture), `g.edgeT`, `g.edgeSide` (edge-pan dwell), `g.stripDrag` (the handle drag
  and its grab offset), `g.arrowT` (held-arrow acceleration).
- **Coalescing rule, exactly**: a `cam` entry is journalled when a glide snaps (`camX` reaches `camT`), when a direct
  drag or swipe gesture ends (pointer up, or 150 ms without a wheel event), and before any other journalled input if
  `camI` differs from the last journalled value. Nothing else journals the camera.

## 3. Scrolling: how you move the view

All inputs move the target `camT`; each 60 Hz update `camX` eases toward it (`camX += (camT - camX) * 0.35`, snapping
within 0.05). Direct-manipulation inputs (trackpad swipe, strip drag) set `camX = camT`, so the picture stays under
your finger. Both are clamped to the world. **Panning runs in `gameUpdate`'s 60 Hz updates, never in sim ticks**: the
same speed at 1/4x and 4x, and it works while paused. Scrolling never ticks the world.

| input | does | notes |
|---|---|---|
| trackpad sideways swipe (`wheel`, horizontal gesture) | pans 1:1: `deltaX` CSS px, converted by the canvas's on-screen scale to game px, then to cells; `camT += deltaX`, the browser's sign as-is, so the content follows the fingers under the OS's own natural/classic setting, as page scrolling does | momentum events pan too (they are wheel events) |
| Shift + mouse wheel | pans 24 cells a notch | handled whether it arrives as `deltaX` (macOS) or as `deltaY` with `shiftKey` (Windows, Linux) |
| plain vertical wheel over the field | **brush size, as today** (one step per event) | over the picker: scrolls the list, as today |
| Left / Right arrow (held) | pans, from 2 to 10 cells an update over half a second | Shift + arrow: a screen (`VIEW_GW - 32` cells) per press (key-repeat pages again); while Shift is down there is no held pan |
| Home / End | glide to the left / right end | |
| `G` | "go home": glide to centre on the village (`wMiddle`-style: the middle of its houses, else of its living peasants, else the world middle, and the bar says `nobody lives here` for two seconds) | `G` is unbound today |
| edge pan while dragging | see below | |
| strip or description bar: press | inside the view box: grabs the box where you took it (no jump), then it follows the pointer; outside it: the view centres on that column at once (no glide), then follows | section 4 |
| news arrow: click | glide to where it happened | section 5 |

**Wheel gestures.** `deltaMode` is normalised first (lines x 16, pages x 400 CSS px), and one event never moves the view more than one screen. A gesture is a run of wheel
events with gaps under 150 ms; its axis is locked by its first event with any movement: horizontal if
`|dx| > |dy|` (or Shift is held), vertical otherwise. A horizontal gesture only pans; a vertical one only changes the
brush size (or the list). So a diagonal swipe never does both, and a fast pan never resizes the brush.

**Edge pan.** While the button is down and you are painting, drawing a ruled line, or holding a peasant or duck, and
the pointer is within 12 game px of the play area's left or right edge, or past it (the pointer is captured, so
dragging over the picker or off the canvas counts as deepest), the view pans that way at 1 to 8 cells an update,
ramping with depth. To avoid surprising careful painting near an edge it starts only after the pointer has been in
the zone for 200 ms, or immediately if it entered the zone moving toward that edge faster than 1.5 cells an update.
It stops the moment the pointer leaves the zone or the button is released. Merely hovering never pans. Strokes keep
painting into the revealed cells: `sandPaint` interpolates from the last world cell to the new world cell, so a
stroke dragged to the edge is one continuous line. A ruled line (Shift-drag) keeps its world anchor; its preview is
drawn through `scrX`, so it stretches as the view moves.

**Touch.** A finger in the field paints or grabs (with edge pan). The pan handle on touch is the strip **and** the
description bar under it together (24 game px, about 2.3x the strip alone); for a mouse they are the same handle,
since the bar has no other use for a press. No new gesture conflicts with painting.

**Other.**
- `NEW` / `R` and loading a save without `camX` centre the view on the village (the `G` target), at once, not
  gliding. `CLEAR` / `C` keeps the view.
- Up/Down arrows still choose the brush. All four arrows, Home and End are `preventDefault`ed.
- At an end, panning further that way does nothing, and the strip's box sits flush against that end: the feedback.
- Tips gain three, in their own list (`VALLEY_TIPS`, shown in place of every fourth tip in a wide valley, so `g.tip`
  counts round master's list exactly as before): `swipe sideways, Shift-wheel or ←/→ to look along the valley`, `the strip under the field is the
  whole valley. drag it`, `G takes you back to the village`.

## 4. The valley strip

A 544 x 10 strip directly under the play area: the whole valley, squeezed. Strip pixel column `u` (0..543) shows
world columns `floor(u * gw / 544)` up to the next one's start; for 1088 that is exactly 2 columns a pixel, for an old
272 save half a column. The 186 rows go into 10 bands of 18 or 19.

- **The land**: the ten strip rows are not even: the high sky gets two (world rows 0-39, 40-79) and the land and the
  air just over it the other eight (`STRIP_ROWS` in `game.js`), so the valley's silhouette reads at a glance (evenly,
  the ground would be the bottom two rows). Each pixel is the colour of the band's most common non-air thing, from
  three sample rows a band in its first column (about 16 000 reads a rebuild), at 115 % of that thing's first shade;
  air is the sky at that band's middle. Rebuilt every 15 frames, and at once after a load. Peasants and ducks go in
  the row their height falls in.
- **The view**: a box `544 * VIEW_GW / gw` px wide (136 at 1088; the whole strip at 272), 1 px outline in `#3a4e72`,
  `#8aa6d8` on hover or drag; inside it the land at full brightness, outside dimmed to 60 %. The most visible thing
  in the strip.
- **People**: each living peasant not in space a 1 px `#ffd94a` dot at its column and band; ducks `#f4f4f4`; a
  peasant on fire blinks `#ff7a3a`.
- **Pings**: a news line with a place (section 5) blinks a 1 x 3 px marker in its colour at the top of the strip,
  for as long as the line is up, over **the same column a click on its tab would go to**: a living `pid` / `did`'s
  current column, else the recorded one.
- **Hover** (the strip only: hovering the bar leaves the description as it is, so you can still read a brush's text;
  the bar acts as a handle only once pressed): the bar reads `THE VALLEY  drag to look along it. swipe sideways, Shift-wheel or ←/→.
  G goes home`, and on the right what is near the pointer's column: the nearest peasant by name if one is within 4
  columns, else a finished site's label (as the blueprint hover gives), else water / lava / nothing. The canvas cursor
  is `grab` over the handle, `grabbing` while dragging it.
- With a one-screen world the box fills the strip and pressing it does nothing; the strip still shows land and
  people, so the layout is the same at every width.

Drawn on the main canvas (it scales and gets the scanlines with everything else), on the side dice.

## 5. Things happening out of view

- `feed(g, text, col, key, at)`: news items take an optional `at`, resolved **when the item is made** to plain data:
  `{ x: column }`, plus `pid` for a peasant or `did` for a duck so a click can find them where they are now. No live
  objects go into `g.feed` (or saves). Call sites that pass a place, at least: arrivals (peasant and duck), deaths,
  a new idea (the thinker), a house finished, burnt or mourned, a fire at something of theirs, a great work begun or
  finished, back from space or the moon. The rest stay placeless.
- A line with a place whose column is **out of view** gets a 9 x 9 arrow tab at the line's left end (the feed is
  right-aligned, so that is the side away from the screen edge), `◂` if the place is left of the view, `▸` if right, in the line's colour on the feed's dark backing.
  **Only the tab** is a click target (it highlights on hover like the header counts, and the pointer becomes a hand);
  clicking glides to the place, centred (a living `pid` / `did`: their current column). The rest of the line is
  never a click target, so the field under the feed always paints as it does today.
- Banners never move the camera.
- (Known and kept: a loaded save shows the receiving game's moon and far hills, as on master; the sky is drawing, and
  was never saved. A width change rolls the sky on dice seeded by the width alone.)
- **Edge markers**: while any living, earthbound peasant is out of view, a 3 x 5 px `#ffd94a` chevron sits at that
  edge of the play area, at the height of the nearest such peasant (clamped to `PLAY_Y + 3 .. PLAY_B - 8`, clear of the strip), at 60 % opacity, with a 1 px dark outline.
  Informative only; hidden while the button is down.

## 6. The village in a wider valley

### Generation (`sandLandscape`)

Let `S = gw / VIEW_GW` (1 for a one-screen valley, 4 for a new one) and `V0 = (gw - VIEW_GW) >> 1` (the left edge of
the middle screen; 0 at `S == 1`).

- Ground: today's formula, plus, **only when `S > 1`**, a slow third wave `sin(x * 0.006 + ph2) * 10` with `ph2`
  rolled after everything today's generator rolls, so the far ends are not repeats of the middle.
- **The village is generated where you are first looking**: huts at `V0 + 14 + irnd(VIEW_GW - hutW - 28)`; the
  first tree at `V0 + 16 + irnd(VIEW_GW - 32)`; the 7 villagers at `V0 + 6 + irnd(VIEW_GW - 12)`; the first pond by
  today's rules over the columns `V0 .. V0 + VIEW_GW - 1`. At `S == 1` each of these is today's expression.
- Ore and oil are fixed counts today (11 coal seams, 10 ore lenses, 10 gold veins: `world.js:1267-1290`; `O_POOLS`
  = 5: `oil.js:31`), spread with `irnd(gw)`. They become `count * S`, so density per column is unchanged. At
  `S == 1` the loops are identical.
- **Only when `S > 1`**: the wilds get `S - 1` more trees (left of the village, right, left, ...) and four chances
  (p 0.5 each) at a pond, two each side of the village, each the deepest dip of its stretch filled to under its lip,
  kept clear of the village's screen.

### The village's range (`g.vrange`)

New: `g.vrange = { x0, x1 }`, the span the village thinks of as its own. Recomputed on ticks where `g.tick % 300 === 0`, and when a
new village is made, **only when `S > 1`**. Never on load: it is saved with `g`, so a loaded village goes on exactly as
the one that was saved would have (in a one-screen valley it is `{0, gw - 1}` always): from the leftmost to the
rightmost of its sites (finished or not, houses included), widened by `R_MARGIN = 96` columns each side, at least
`VIEW_GW` wide (grown evenly about its middle if narrower), clamped to the world. With no sites, the middle screen.

Three helpers: `rLo(g, m) = g.vrange.x0 + m`, `rHi(g, m) = g.vrange.x1 + 1 - m` and
`rMid(g) = (g.vrange.x0 + g.vrange.x1 + 1) / 2`. At `S == 1` these are `m`,
`gw - m` and `gw / 2`: today's bounds.

**The mechanical rule**: a whole-width loop or random column pick that chooses *a place for something new, or where
something from outside arrives*, uses the range: `for (x = A; x < g.gw - B; ...)` becomes
`for (x = rLo(g, A); x < rHi(g, B); ...)`, `irnd(g.gw)` becomes `g.vrange.x0 + irnd(g.vrange.x1 - g.vrange.x0 + 1)`,
and `g.gw / 2` used as "the middle of where things are" becomes `rMid(g)`. The list, from a grep of every file:

| where | what | change |
|---|---|---|
| `ideas.js:787` `iFarmSpot` | a field | range |
| `mines.js:275`, `:289` `mPlanMine` | a mine (and the fallback over a field) | range |
| `oil.js:302` `oPlanWell` fallback | a well over a field | range (and its main search, if whole-width) |
| `wonders.js:1494` `wPlot`, `:626` bench search | a great work's plot, a quarry | range |
| `monuments.js:114` `mPlotAny` | the floors a monument may go on | range |
| `heavens.js:476` `hMeteorite`, `:440`, `:480` | a meteorite's column; which side it comes from | range; side by `rMid` |
| `heavens.js:583` | shooting-star streaks | range (they are for watching) |
| `heavens.js:1695` `hRelease` | where a returning astronaut can stand | range |
| `heavens.js:1836-1837` | which side a launch crowd gathers | `rMid` |
| `peasants.js:631` | re-entry column from space | range |
| `peasants.js:1420-1430` arrivals | newcomer's edge, and facing | edges of the range; `q.dir` by `rMid` |
| `ducks.js:197` | a flying duck's water goal | range |
| `ducks.js:586` | a duck walking in | edges of the range |
| `wonders.js:1520` (`o.near` fallback), `:1579` `wMiddle` fallback | "the middle of the village" | `rMid` |
| `wonders.js:1520` (`o.edge`) | "out at the edge of the valley": `Math.min(x0, g.gw - x0 - W)` | measured from the range: `Math.min(x0 - x0R, x1R + 1 - x0 - W)` with `x0R, x1R` the range's ends (identical at `S == 1`) |
| `world.js:1316/1366/1386`, ponds | generation | the middle screen (above) |

Deliberately left whole-width: `pleasures.js:1226` `pWaters` (reads the water there is; its callers then pick by
distance, and a lake is a lake wherever it is), `oil.js:84` / ores (generation: whole world), and every search that
spirals out from a peasant with a fixed radius (saplings, campfires, `bPlantSpot`, ice slides, pond digging). The
implementation re-runs the grep (`irnd(g.gw`, `irnd(gw`, `< g.gw -`, `g.gw / 2`, `* (g.gw`) at the end and accounts
for every hit in the commit body. Because the range grows as the village builds, the village still creeps outward,
a screen at a time.

A peasant or duck may still walk out past the range; the world edges are the only walls.

## 7. Drawing, and performance

- `drawWorld` loops only over the visible columns plus a 2-column margin (`camI - 2 .. camI + VIEW_GW + 1`, clamped),
  so its per-pixel cost is today's. `wave` and `dep` stay world-sized and are filled for those columns only.
  `drawThermal` is culled the same way.
- `g.px` / `g.gpx` stay world-sized (other modules draw into them by world index; they draw everybody, which is
  cheap). `gp.fill(0)` clears only the visible columns' rows. `putImageData` uploads only the visible rectangle (its
  dirty-rect arguments); the field is blitted with the source-rectangle `drawImage(g.vc, camI, 0, VIEW_GW, GH,
  PANEL, PLAY_Y, VIEW_GW * CELL, PLAY_H)`.
- The glow canvases (`gc2`, `gc4`) are **view-sized**; each frame they are made from the visible part of `gc`.
- The sky (`g.bg`) is world-sized; far hills and stars run the whole width (stars: `150 * S`). The moon is placed at
  `V0 + VIEW_GW * (0.65 .. 0.9)`, today's place within the middle screen, and stays put in the world (the moon
  rockets aim at it).
- Lightning, rings, firework glows and bubbles are drawn through `scrX`, so they scroll with the world; anything wholly
  out of view is skipped. The flash of a big bang and the screen shake cover the play area wherever the bang was.
- The simulation still steps the **whole** world every tick.
- **Budget**, measured with the harness `--profile` on seeds 3, 7, 14 over 20 000 ticks at 1088: median
  `gameUpdate` <= 4.5 ms, p95 <= 9 ms (node, dev laptop). In the browser (`` ` `` debug readout): 60 fps at 1x and 2x.
  It holds at 4x too, four ticks to a `gameUpdate`, over those 20 000 ticks and over 80 000, by when the valley has
  warmed through (`node harness/bench.js`, and with `--ticks 80000`; two runs of each, in node; 4x has not been timed
  in the browser). Over 20 000 ticks: median 2.03-2.09 ms and p95 2.45-2.71 on each seed, where 0580e71 gave
  12.87-13.23 and 13.81-14.48. Over 80 000: whole-run median 3.16-3.59 ms, p95 3.79-4.31 and p99 4.86-6.31; ticks
  40 000-80 000 alone, median 3.45-3.84 and p95 3.95-4.74. 0580e71 gave 13.67-15.33 and 15.65-17.40 over the whole
  run, 13.94-15.68 and 16.03-18.41 late (its three seeds run at once). A frame still costs more as the valley warms,
  about 2.1 ms in the first fifth of the run and 3.5-4.2 in the last tenth: heat leaves only at the room's edges, and
  lanterns, campfires, the furnace, fire and lava keep adding it, so hardly a row stays at exactly room temperature
  for the heat step to pass by, and it passes instead by 4-cell words that are exactly cold and, in its second half,
  by words that are steady (four things that neither melt, set nor boil between +0 and 100 degrees, in that band,
  nothing soaked up). Not every frame is inside: the longest are one
  of 196 ms on seed 3 after tick 40 000, in both runs (0580e71's longest on that seed, 919 ms), 58-60 ms on seed 7
  and 30 ms on seed 14, and one such frame is a hitch on screen. Not every valley is inside either, though none is
  slower than 0580e71 and every world matched. Past about 150 000 ticks, with the organ finished, builders' route
  searches look for grates cell by cell again: from saves at 150 000, median 3.9-4.2 ms but p95 25.8 on seed 3 and
  11.7-12.5 on seed 7 (seed 14, 6.0; 0580e71, 45.1, 28.0 and 19.1). A village with snow, ice, a forge or a smelt in
  it is off room temperature from the start, so the heat step has fewer cold words to pass by: median 5.5-6.8 ms
  and p95 10.6-11.1 (0580e71, about 20.7 and 33). And a width that is not a multiple of 4, which only
  `window.PLEASAND_GW` can give, gets no word walks at all, so a warmed 1089- or 1091-wide valley is back near
  0580e71's cost.
  The world is the same: `harness/same.js` finds all 23 short and all 9 long and warm scenarios identical to
  0580e71, and every run above ends on 0580e71's `hash()` and `stateHash`.
  Measured before any of this, early game, seed 7, node: 0.93 ms/tick at 272 and 3.06 ms/tick at 1088; drawWorld
  0.29 ms at 272, 0.91 ms at 1088 unculled. If the budget is missed, the fix is in the simulation (skip rows with
  nothing to do), not by slowing the world far from the camera.

## 8. Saves

- A save records `meta.grid {w, h}`. `saveProblem` refuses only a different `h`, or a `w` below `VIEW_GW`. `saveLoad`
  checks, then decodes the state (`saveDecode`), and only once that has succeeded, if `w !== g.gw`, calls
  `gameResize(g, w)` and applies it; then clamps the camera, and fills in `g.vrange` if the save has none or
  it is out of the world (`{0, gw - 1}` at `S == 1`, else computed once): a fill-in for missing data, not a
  recompute, so a wide save that has one is untouched. A file that is not a save, or will not decode, leaves the
  running game untouched. If applying a decoded state throws after a resize (it should not: it is field assignment),
  the error is reported as today and the game is a fresh valley (rolling the village's dice) at the save's width rather
  than a half-loaded one; later NEWs use `g.bootW` as always. (The browser's LOAD, drag-and-drop
  and the harness's `load` all go through `saveLoad`.)
- A 272-wide save therefore loads as a one-screen valley, exactly as it was (bit-identical: section 1): the strip's box
  fills it, every scroll input is a no-op, `vrange` is the whole world.
- `camX` / `camT` / `vrange` save with `g`. A save without `camX` opens on the village.
- `NEW` / `R` make a valley of the boot width (`g.bootW`: 1088 in the browser, 272 in the test suite), calling
  `gameResize` first only if the current width differs (so NEW after loading an old save gives a wide valley, and a
  test's `R` stays 272). `sandLandscape` itself never reallocates.

## 9. Tests and harness

- `test/sim.js` `load(seed, opts)` and `harness/loader.js` `loadGame` take `gw` (default **272**), and set
  `window.PLEASAND_GW` before the scripts run. So the existing suites run at 272 and keep every seeded expectation
  and recorded hash. The browser never sets it.
- Harness: `open({ gw })`, CLI `--gw N`; scenario files record `gw` (absent means 272), and `replay` uses it. Harness
  pointer helpers (`mouse`, `tap`, `toScreen`) that are given a world cell outside the view first set the camera so
  the cell is in view (the smallest move, centred if a jump is needed), as a journalled `cam` input, so scenarios
  replay. A new `cam` op sets it explicitly. `describe()` and `--map` report `camX` and `vrange`.
- New tests in `test/run.js`, at 1088 unless stated:
  - the hard rule: at 272, a fresh village's hash after 600 ticks on seeds 1, 3, 7 equals the value recorded on
    master before this change (recorded in the test); and right after boot `g.mx`, `g.my`, `g.cx`, `g.cy` equal
    master's (320, 200, 112, 93). The existing 3000-tick dice-trace and idea-sequence tests in `test/wonders.js`
    run unchanged and must pass with their recorded values;
  - after `gameResize` (272 to 1088 and back), every typed array on `g` is sized for the new grid (exempt list in the
    test);
  - a strip press inside the box does not move the view; outside it, centres on that column;
  - a glide and a swipe each journal exactly one `cam` input;
  - a new valley is 1088 x 186; its huts, first pond, first tree and villagers are in the middle screen; ore count
    is 4x; the view starts centred on the village;
  - `scrX` / `g.cx` round-trip at camX 0, middle and far end; a tap at a screen point paints the world cell under it;
  - edge pan: holding the pointer at the right edge while painting moves `camX` right after the dwell, and the
    stroke has no gaps; a still cursor near the edge with no button does not move it;
  - a wheel gesture: horizontal pans and leaves the size; vertical resizes and leaves the camera; Shift+`deltaY` pans;
  - throw velocity is the same with and without an edge pan during the drag;
  - `iFarmSpot`, `mPlanMine`, a newcomer and a duck arrival all land inside `g.vrange`; a meteorite lands inside it;
  - a 272-wide save made before this change (a fixture written on master) loads and steps 1 tick without error;
  - a 272-wide save loads into a 1088 game, comes back 272 wide with its hash, and plays on; NEW then makes 1088;
  - a 1088-wide save round-trips, `camX` included; a journalled `cam` input replays to the same hash;
  - 20 000 ticks at 1088 on seeds 3, 7, 14 with the standard invariants and no errors, timing recorded.
- The harness selftest passes at 272 and at 1088.

## 10. Done means

- Every section above is in; every row of the input table in section 3 works in Chrome and Safari with a trackpad
  and with a mouse, and the strip/bar handle works on a touch screen (or Chrome's touch emulation).
- `node test/run.js` and the other suites in `test/` pass, with no recorded hash changed; the harness selftest and
  playtest replays pass.
- The section 2 audit and the section 6 grep are both clean, with the deliberate exceptions commented.
- README: the valley is four screens wide, how to look along it, and the 4x note; the three new tips.
- The section 7 budget is met, and the numbers are in the commit body.
