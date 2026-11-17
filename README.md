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
it. They have names. The game keeps count. There are ducks, too: they
waddle, swim, dabble, fly, eat seeds, push through bushes and flowers, and
sometimes bring ducklings.

The peasants build. They chop wood, saw each log into four boards, and put up
things you cannot paint yourself: **houses** (on a levelled plot, a plank floor,
a door at each end that only peasants can open (water and sand cannot, though
the odd duck slips through behind them), a roof
with a window that lights up when somebody is home, and a bed), **doors** and
beds for the two old huts, **stairs** or a **ladder** up any wall too tall to
jump, and **bridges** over gaps too wide to leap and ponds too wide to bother
swimming. Anybody with wood helps with anybody's project; what is still to come
shows as a faint blueprint. Then they live in it: they sleep in their beds (or
on the ground, and complain), run home and hide when things go bang, go and
stand by a fire when they are cold, light campfires and gather round them,
climb ladders, find their way round (up the stairs, over the bridge, down
the ladder, up a rope onto a ledge, through a tree, up through it onto the top
of it or down through it) to wherever they are going, go exploring
when they are bored (somewhere high, somewhere nobody has been lately), put back what you burn down (and mourn what you burn right
down), and plant saplings where they cut trees down, which grow into trees.

And when they have eaten well, they think. Every tick a peasant spends well
fed, and not frightened, freezing or asleep, goes towards a bright idea (twice
as fast at home, round a campfire, holding a fishing rod or standing about by
lamplight). When it comes, a
light bulb goes on over their head, the village hears about it, and from then
on they all know it. Something has to put an idea into somebody's head first:
nobody thinks of buckets until something has gone up in flames. Hover over IDEAS
at the top to see what they know, and what might give them the rest. What they
think of:

- **Farming**: a field of sand tilled into dark furrows and sown with wheat,
  which grows (faster with water about: it drinks what lands on it), ripens
  from the ear down, and is eaten, all of it, after which the field is sown
  again. It takes no wood, so anybody lends a hand. A village with fields is
  a well-fed village, and a well-fed village has more ideas
- **Lanterns**: one on a bracket by each door, burning in a warm pool of light
- **The bucket**: once something has burned (or been set alight by somebody
  bored), a fire at anything
  of theirs sends everybody who was only doing something for fun to the pond
  with a bucket (on the near side of the fire: they are brave, not daft). On
  a quiet day they water the wheat. The alarm wakes everybody in a burning
  house and sends them out of the nearer door (not the one with the fire in
  front of it), and nobody runs home to a house that is on fire. A peasant who
  is burning runs for the pond from further off, or for the nearest bucket,
  and anybody with a full bucket runs at them and tips it over their head
- **Landscaping**: comes of turning earth over (hoeing a field, shovelling out a
  plot). With that and the bucket, a house or field with no water within forty
  cells or so gets a pond of its own: a bowl dug into the sand beside it (it
  takes no wood, so anybody lends a hand), the banks dug back a cell at a time
  so the sand stands, then filled bucket by bucket from the nearest fresh water.
  The brigade finds it like any other water, and somebody tops it up when it
  runs low. They need level-ish sand to do it, so a pond only goes in where
  the ground allows
- **Gravestones**: once somebody has died, a wooden cross for each of the
  dead, in a row, saying how. Now and then somebody visits, and leaves a flower
- **Fishing**: a jetty out over the pond, and somebody on the end of it with a
  rod. A fish, mostly. Sometimes a boot, or a duck. If you boiled the pond,
  the fish come out cooked
- **The scarecrow**: the ducks like the wheat too (they eat the bottom of the
  stalk, and the rest comes down as seed). Not with one of these about
- **Fireworks**: once they have a couple of houses and a couple of ideas, now
  and then somebody puts on a show, and everybody comes to watch

Cloned out of [funnysite](../funnysite)'s Flash Era portal (`flash.js`, game 2.1)
and grown from there.

## Run

No build, no dependencies. Open `index.html`, or serve the folder:

    python3 -m http.server

## Controls

- **Left-drag** paints, **right-drag** erases
- **PEASANT** (V): click to make one and hold it, click one to pick it up,
  drag and let go to throw
- **DUCK** (D): click to make a duck (now and then a mother with ducklings),
  click one to pick it up, drag and let go to throw
- **LIGHTNING** (L): click or hold to strike whatever is under the cursor
- **HEAT** (H) / **COOL** (K): hold to pour heat into things, or draw it out
- **B** (or the BUBBLES button) turns the speech bubbles off and on
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
- Pour some seeds near a duck. Please don't strike the duck pond with lightning
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
- Paint a lump of WOOD for them, then draw a stone cliff, a deep ditch and a wide pond, and watch the stairs, ladders and bridges go up
- Set fire to a house. Then to most of a house
- Pour sand on a house. Or water. Then let a peasant out through the door
- Let off a firework near the houses, and watch everyone run home
- Chill the village with COOL and watch them light a fire and huddle round it
- Make them a floating island, with flowers on it. Somebody will go up and have a look
- Paint a meadow of plants for them, and watch for light bulbs
- Once they know about buckets, set fire to a house. Then build them a pond next to it. Or wait for them to dig one
- Leave the ducks near the wheat for a while
- Boil the pond while somebody is fishing in it

## Files

- `audio.js`: the sound department, all synthesised: bangs, babble, screams
- `world.js`: the grid, the materials and their rules, particles, explosions, lightning, the starting village
- `heat.js`: temperature: conduction, convection, melting, boiling, freezing and burning points, and how hot things look
- `peasants.js`: the villagers, what they say, how they die, and how they are drawn
- `paths.js`: how the villagers find their way: A* over everywhere a peasant could stand, using the moves a peasant really makes (steps, drops, leaps, jumps, ladders, ropes, swims)
- `build.js`: what the villagers build (houses, doors, beds, stairs, ladders, bridges, saplings), and living in it
- `ideas.js`: what a well-fed village thinks of, and what comes of it: fields of wheat, lanterns, the bucket brigade, ponds dug and filled, graves, jetties and fishing, scarecrows, fireworks shows
- `ducks.js`: the ducks
- `game.js`: rendering, the picker and HUD, input, and the main loop
