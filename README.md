# pleasand

A falling sand toy. Twenty kinds of pixel: sand, water, oil, wood, plant, fire,
lava, stone, ice, gunpowder, ash, salt, seed, glass, acid, gas, torch, faucet,
drain and cloner, plus the smoke, steam, embers and flowers they turn into.

Cloned out of [funnysite](../funnysite)'s Flash Era portal (`flash.js`, game 2.1).
The sand code is copied as-is; only enough of the portal shell was kept to run it
on its own.

## Run

No build, no dependencies. Open `index.html`, or serve the folder:

    python3 -m http.server

## Controls

- **Left-drag** paints, **right-drag** erases
- **Wheel** changes brush size (over the picker it scrolls the materials instead)
- **Shift-drag** draws a straight line
- **Middle-click / Alt-click** picks up the material under the cursor
- **1–0** pick materials, **E** erase, **↑/↓** cycle, **[ ]** brush size
- **Space / P** pause, **.** single step while paused
- **C** clear, **R** new landscape, **M** mute
