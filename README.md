# pleasand

A falling sand game, with peasants in it.

Twenty-odd kinds of pixel (sand, water, salt water, oil, wood, plant, fire,
lava, stone, metal, ice, snow, gunpowder, ash, salt, seed, glass, acid, gas,
torch, faucet, drain, cloner, and inert: a magic block that stays where you put
it, carries no heat and ignores everything but the eraser), plus fireworks, a
nuke and lightning.

Every pixel has a temperature. Heat flows from hot to cold, fast through metal
and slowly through wood, ash and air; hot air and hot water rise, cold air sinks.
Heat is never made or lost on the way: it only gets out (or in) at the edges of
the room, so a fire leaves the air warm until its plume has found the top. Only
burning things, bangs, lightning, torches and the HEAT brush add any. Things melt,
boil, freeze, set and catch fire at their own temperatures, and soak up (or
give back) latent heat while they do it, so a pond takes a while to boil and
lava stays runny under its crust. Ice melts, water boils, steam rains (or
snows, if you chill it hard), stone runs as lava past 1150 and lava sets again
below 950, sand sinters into glass, glass and metal melt and set, wood, oil,
plants and gas catch on their own when hot enough, and salt water boils down
to salt. Also a small village of
peasants who walk about, chat, climb things, jump ledges and gaps, carry ninja ropes and parachutes (which mostly open), swim, catch fire, run for
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
- **HEAT** (H) / **COOL** (K): hold to pour heat into things, or draw it out
- **T** toggles thermal vision; the bar at the bottom shows what is under the
  cursor and how hot it is (and how far along it is boiling, melting or setting)
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
- Hold HEAT on one end of a metal bar, then on a stone one. Press T
- Pour water on a lava lake. Then look underneath the crust
- Dissolve salt in a pond, then boil it off
- COOL a cloud of steam
- Put a peasant on a hot plate. Or in the snow
- Drop a peasant from the very top. Then throw one, gently, upward
- Build a wall too tall to jump, or a gap too wide to leap, with a beam over it. Then a very tall cliff

## Files

- `audio.js`: the sound department, all synthesised: bangs, babble, screams
- `world.js`: the grid, the materials and their rules, particles, explosions, lightning, the starting village
- `heat.js`: temperature: conduction, convection, melting, boiling, freezing and burning points, and how hot things look
- `peasants.js`: the villagers, what they say, how they die, and how they are drawn
- `game.js`: rendering, the picker and HUD, input, and the main loop
