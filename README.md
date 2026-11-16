# pleasand

A falling sand game, with peasants in it.

Twenty-odd kinds of pixel (sand, water, oil, wood, plant, fire, lava, stone,
ice, gunpowder, ash, salt, seed, glass, acid, gas, torch, faucet, drain,
cloner), plus fireworks, a nuke and lightning. Also a small village of
peasants who walk about, chat, climb things, can't swim, catch fire, run for
the pond, go to space if thrown hard enough, and have opinions about all of
it. They have names. The game keeps count.

Cloned out of [funnysite](../funnysite)'s Flash Era portal (`flash.js`, game 2.1)
and grown from there.

## Run

No build, no dependencies. Open `index.html`, or serve the folder:

    python3 -m http.server

## Controls

- **Left-drag** paints, **right-drag** erases
- **PEASANT** (V): click to make one and hold it, click one to pick it up,
  drag and let go to throw
- **LIGHTNING** (L): click or hold to strike whatever is under the cursor
- **NUKE** (N): one per click. stand back
- **Wheel** changes brush size (over the picker it scrolls the materials instead)
- **Shift-drag** draws a straight line
- **Middle-click / Alt-click** picks up the material under the cursor
- **1–0** pick materials, **F** firework, **E** erase, **↑/↓** cycle, **[ ]** brush size
- **Space / P** pause, **.** single step while paused, **S** slow motion
- **C** clear, **R** new village, **M** mute, **`** fps

## Things to try

- Throw a peasant into a line of peasants
- Put a cloner under a peasant's feet
- Strike a pond with lightning while somebody is swimming in it
- Fill a hut with gas, then light the door
- Fireworks. the peasants like fireworks
- Find out what happens when the king dies

## Files

- `audio.js`: the sound department, all synthesised: bangs, babble, screams
- `world.js`: the grid, the materials and their rules, particles, explosions, lightning, the starting village
- `peasants.js`: the villagers, what they say, how they die, and how they are drawn
- `game.js`: rendering, the picker and HUD, input, and the main loop
