/* =====================================================================
   PLEASAND  --  ideas.js

   a peasant with a full stomach has time to think. every tick spent
   well fed (and not frightened, freezing or asleep) goes towards a
   bright idea; at home, by a campfire, holding a fishing rod or by
   lamplight it goes twice as fast. when it comes, a light bulb goes on
   over their head, the village hears about it, and they know it from
   then on, all of them. an idea needs something to have put it into
   somebody's head: nobody thinks of buckets until something has gone
   up in flames, or of gravestones until somebody has died.

   what they think of, and what comes of it:
     FARMING     a field: sand tilled into dark earth and sown with
                 wheat, which grows (faster with water about: it drinks
                 what falls on it), ripens from the ear down, and is
                 eaten, all of it, after which the field is sown again.
                 it takes no wood, so anybody lends a hand
     LANTERNS    a lantern on a bracket by each door of their house,
                 which burns all night (it is always night)
     THE BUCKET  a fire at anything they built and everybody who is
                 only doing something for fun grabs a bucket, fills it
                 at the pond and throws it on. on a quiet day they
                 water the wheat with them. the alarm gets everybody
                 out of a burning house, and anybody on fire is run at
                 with a bucket (and runs at it)
     DIGGING     (landscaping) comes of turning earth over: a hoe, a
                 spade. with that and the bucket, a house or a field
                 that is a long way from any water gets a pond of its
                 own: a bowl dug into the sand beside it, and filled,
                 bucket by bucket, from the nearest water there is (real
                 water: never out of another pond). and the rest of the
                 valley is tidied: puddles carried to the pond, sand
                 swept off the roofs and into the holes (tidy.js)
     GRAVESTONES a wooden cross for everybody who died, in a row,
                 saying how, in the one graveyard. ten at most: when
                 it is full the oldest weathers away. now and then
                 somebody visits, and leaves a flower
     FORESTRY    (somebody went for wood, and there was none) when the
                 woods round them run thin, a sapling, planted where
                 it has room to grow and is in nobody's way
     FISHING     a jetty out over the pond, and somebody on the end of
                 it with a rod: a fish (or a boot, or a duck)
     SCARECROWS  the ducks like the wheat too. not with this about.
                 (and anybody who knows farming will run at a duck in the
                 wheat, waving their arms, until it takes off)
     FIREWORKS   once the village has a few houses and a few ideas: now
                 and then, a show, well away from anything that burns,
                 and everybody comes to watch
     THE FORGE   (iron to spare) iron tools, beaten out at the furnace:
                 faster at chopping, hoeing, digging and building, and
                 worn out in the end (mines.js)
     THE STATUE  (masonry, gold to spare, and somebody with three ideas
                 or more) whoever has had the most, in stone, with a
                 golden head and a light bulb. thinking is easier in
                 front of it

   whoever something has happened to (the first to strike ore, the one
   watching the fire) is the one it puts the idea into the head of
   (iSpark). otherwise the next idea is mostly whatever has been on the
   village's mind longest.

   everything they build is a site, the same as a house (build.js): a
   plan, a blueprint, repairs, ruins.
   ===================================================================== */
"use strict";

var I_FED = 1200;           /* hunger under this: well fed */
var I_MUSE = 900;           /* ticks spent well fed before a bright idea */
var I_BULB = 150;           /* how long the bulb burns over their head */
var I_GAP = 2400;           /* ticks after one idea before the village is ready for another */
var I_CROP_H = 4;           /* how tall wheat grows (give or take a couple) */
var I_FARM_W = 11;          /* a field, across */
var I_GRAVE_GAP = 5;        /* from one cross to the next */
var I_GRAVE_MAX = 10;       /* crosses standing at once: past that, the oldest has weathered away */
var I_GRAVE_NEAR = 40;      /* how far from the oldest cross the graveyard may spread */
var I_FEST_GAP = 5400;      /* ticks between fireworks shows, at the least */
var I_FEST_CLEAR = 7;       /* and nothing that burns this many columns either side of where they go up */
var I_LOAD = 5;             /* cells of water to a bucket */
var I_POND_W = 13;          /* a pond, across (its edges are dry sand, sloping in) */
var I_POND_D = 3;           /* and as deep as the sand goes, to the bottom of the bowl */
var I_POND_NEAR = 40;       /* a house or a field with no water within this many cells wants a pond */
var I_POND_CREW = 5;        /* at most this many ferrying water to one pond (it is a long way, sometimes) */
var I_POND_KEEP = 8;        /* a pond this many cells (or more) short of full is left alone, but for a fire */
var I_SHOO_R = 90;          /* how far off a peasant will run to chase a duck out of the wheat */
var I_DUG = 10;             /* cells of earth turned over (tilled or shovelled) before somebody thinks of digging */
var I_STATUES = 3;          /* statues in the valley, at most */
var I_WOODS = 60;           /* cells of standing timber (or saplings' worth) about them, under which a forester plants more */

P_SAY.idea_farm = ["what if the plants... came to us?", "plants. in rows. on purpose", "i've had an idea. FARMING",
  "food that stays where you put it"];
P_SAY.idea_lamp = ["it's always dusk here. LANTERNS", "a light by the door!", "let there be light",
  "like a window, but outside"];
P_SAY.idea_bucket = ["what if we put the water ON the fire", "a BUCKET. for WATER", "water goes on fire. i'm a genius",
  "a hat for carrying ponds"];
P_SAY.idea_grave = ["we should remember them", "they deserve a proper send-off", "somewhere to visit them",
  "a little cross. with their name on"];
P_SAY.idea_fish = ["there must be food in that pond", "a stick, a string... FISH", "the ducks know something we don't",
  "what if we sat by the water. for food"];
P_SAY.idea_scarecrow = ["a pretend peasant, to scare the ducks", "the ducks fear only one thing. us",
  "what if we made a fake me. out of sticks"];
P_SAY.idea_festival = ["what if fire... but pretty", "we should celebrate something", "a party! with explosions!",
  "what if the sky... went bang"];
P_SAY.idea_dig = ["what if we dug a hole. on purpose", "the ground... it moves. LANDSCAPING", "a hole! for water!",
  "i've been hoeing all day. what if i didn't stop"];
P_SAY.idea_forest = ["what if we put the trees BACK", "trees. in rows. on purpose", "plant one, chop one", "a tree is just a slow plank"];
P_SAY.idea_statue = ["what if we carved somebody. out of rock", "a statue! of the cleverest of us", "stone, but shaped like a person",
  "we should remember who thought of things"];
P_SAY.treeless = ["not a tree left", "where did all the trees go?", "we chopped them all. oops", "no wood anywhere"];
P_SAY.planGrove = ["a tree for later", "somebody's got to plant them", "for the grandchildren", "the woods won't grow themselves"];
P_SAY.planStatue = ["a statue of {d}!", "{d}, in stone", "hold still, {d}. forever", "a likeness of {d}. a big one"];
P_SAY.admire = ["{d} thought of {i}", "what a mind, {d}", "it doesn't look much like {d}", "{d}, in gold and stone",
  "one day there'll be one of me", "they gave {d} a light bulb. a stone one"];
P_SAY.admireSelf = ["not a bad likeness", "they got my good side", "i'm taller than that", "is my head really that shiny?",
  "i thought of things, you know"];
P_SAY.admireDead = ["we miss you, {d}", "{d} would have hated this", "{d} had such ideas", "still thinking, {d}?"];
P_SAY.genius = ["genius!", "ooh", "why didn't i think of that", "brilliant", "that's mad. i love it", "hm. could work",
  "they're so smart"];
P_SAY.blank = ["i had an idea. it's gone", "what if... no", "i've been thinking", "hmm. hmmm", "i almost had it",
  "what if pixels... no"];
P_SAY.helpFarm = ["i'll help with the field!", "hoe, hoe, hoe", "farm work!", "many hands, more wheat", "pass me a hoe"];
P_SAY.planFarm = ["a field, right here", "this'll grow lovely", "i'm going to be a farmer", "rows. lots of rows"];
P_SAY.till = ["*hoe*", "turn it over", "nice dirt", "good soil, this", "dig, rake, repeat"];
P_SAY.sow = ["one for the ducks, one for me", "*sow*", "grow, little seeds", "in you go"];
P_SAY.sown = ["all sown", "now we wait", "grow!", "back to work, wheat"];
P_SAY.wheat = ["fresh wheat!", "home grown", "farm to table", "crunchy", "needs butter", "i grew that. sort of"];
P_SAY.raid = ["OI! THAT'S OUR WHEAT", "SHOO", "get off the wheat!", "the ducks are eating the farm", "DUCK! BAD DUCK"];
P_SAY.brigade = ["FIRE! BUCKETS!", "get the buckets!", "bucket brigade!", "WATER! WATER!", "everybody grab a bucket"];
P_SAY.fill = ["*slosh*", "fill her up", "got water!", "*glug glug*"];
P_SAY.douse = ["SPLASH", "take that, fire", "hyup!", "*sploosh*", "and another"];
P_SAY.evac = ["FIRE! GET OUT!", "THE HOUSE IS ON FIRE", "OUT OUT OUT", "my HOUSE", "everybody out!", "not the bed!"];
P_SAY.out = ["it's out!", "phew", "fire's out", "we did it", "good bucketing, everyone"];
P_SAY.nowater = ["no water this side!", "where's the pond?", "we need a pond", "somebody get water!"];
P_SAY.water = ["watering the wheat", "drink up, little plants", "grow, wheat, grow", "*sprinkle*"];
P_SAY.planPond = ["a pond, right by the houses", "no more running a mile for water", "dig dig dig. a pond",
  "a pond, for emergencies", "we'll have our own water"];
P_SAY.pond = ["*splosh*", "one more for the pond", "fill it up", "pond, pond, pond"];
P_SAY.pondFull = ["a pond! we have a pond!", "the pond's full", "water, right here", "that's some pond"];
P_SAY.shoo = ["SHOO!", "get out of my wheat!", "scram, duck", "shoo shoo shoo", "go on, off with you", "OUT. OUT. OUT"];
P_SAY.shooed = ["and stay out", "that showed it", "ducks. honestly", "it'll be back", "off you go"];
P_SAY.cast = ["*plip*", "here, fishy fishy", "gone fishing", "shh. fishing", "this is the life"];
P_SAY.nibble = ["ooh, a nibble", "something's biting", "steady...", "shh!"];
P_SAY.fish = ["a fish!", "dinner!", "got one!", "look at the size of it", "FISH!", "it's a beauty"];
P_SAY.boot = ["an old boot", "a boot. again", "who throws boots in a pond?", "i'll take it", "half a pair"];
P_SAY.cooked = ["it's already cooked!", "poached!", "fish soup", "the pond's too hot. but tasty"];
P_SAY.duckbite = ["NOT THE DUCK", "i caught a duck", "sorry, duck", "that's not a fish", "let go, duck"];
P_SAY.nofish = ["nothing's biting", "maybe tomorrow", "the fish are asleep", "the one that got away"];
P_SAY.frozen = ["it's frozen solid", "no fishing today", "the fish are under the ice"];
P_SAY.planJetty = ["a jetty, for fishing off", "planks, out over the water", "i'll build us a jetty"];
P_SAY.planLamp = ["a lantern by the door", "lights for the house", "no more stubbed toes"];
P_SAY.planPost = ["a lamp on a pole", "iron, for once, for something pretty", "light the way home", "a street. we have a street"];
P_ACHIEVE.post = ["STREET LAMPS", "iron posts, lanterns on top, all the way along. it is practically a town"];
P_SAY.planGrave = ["for {d}", "rest easy, {d}", "a cross for {d}", "we'll remember you, {d}"];
P_SAY.visit = ["i miss {d}", "rest easy, {d}", "{d} owed me money", "{d} was one of the good ones", "hello, {d}",
  "{d} would have loved this weather", "brought you a flower, {d}", "it's quiet without {d}"];
P_SAY.planCrow = ["a scarecrow, for the ducks", "this'll show 'em", "a fake me. nobody tell the ducks"];
P_SAY.crowWorks = ["ha! it works", "go on, shoo", "scared of a stick", "good scarecrow"];
P_SAY.festival = ["FIREWORKS!", "everybody, come and see!", "stand back!", "who wants a show?", "festival!"];
P_SAY.fuse = ["*fizz*", "light the blue paper", "and... stand back", "here we go"];
P_SAY.finale = ["GRAND FINALE!", "the big one!", "all of them at once!"];

P_ACHIEVE.harvest = ["HARVEST", "somebody ate the wheat. it was grown to be eaten"];
P_ACHIEVE.farm = ["THE FIRST FIELD", "tilled, sown, and now: the waiting"];
P_ACHIEVE.lamp = ["LIGHTS ON", "a lantern by the door. cosy"];
P_ACHIEVE.brigade = ["FIRE BRIGADE", "the village has a fire brigade now. it is buckets"];
P_ACHIEVE.pond = ["A POND OF OUR OWN", "dug by hand, filled by bucket. in case of fire"];
P_ACHIEVE.shoo = ["SHOO!", "a peasant chased a duck out of the wheat. arms and everything"];
P_ACHIEVE.grave = ["REST IN PEACE", "the village remembers"];
P_ACHIEVE.jetty = ["THE JETTY", "a plank walk out over the water, for fishing off"];
P_ACHIEVE.fish = ["GONE FISHING", "a peasant caught a fish. with a stick"];
P_ACHIEVE.scarecrow = ["SCARECROW", "the ducks are not impressed. well, a bit"];
P_ACHIEVE.festival = ["FESTIVAL", "the village put on a fireworks show. on purpose"];
P_SAY.offer = ["for luck", "you'd have wanted this", "a little shiny something", "it's only gold"];
P_SAY.starving = ["so... hungry", "i can't remember food", "is that a sandwich", "i'd eat a duck. raw"];
P_SAY.arrive = ["hello! is there room?", "i heard you had a bell", "nice valley", "i can work", "is that a statue?", "i've walked a long way"];
P_ACHIEVE.arrive = ["A NEWCOMER", "somebody walked into the valley from outside, and stayed"];
P_ACHIEVE.grove = ["THE WOODS", "a tree planted on purpose, to be chopped down later. forward planning"];
P_ACHIEVE.statue = ["THE STATUE", "a great mind, in stone, with a golden head. it is not a good likeness"];
P_ACHIEVE.stonehouse = ["STONE WALLS", "a house rebuilt in stone. let it burn now. it won't"];
P_ACHIEVE.enlightened = ["AGE OF ENLIGHTENMENT", "the village has had every idea there is. for now"];

/* what they can think of, in the order they tend to think of it. ready: has anything happened to put it into their
   heads yet */
var IDEAS = [
  { id: "farm", name: "farming", title: "FARMING", sub: "what if the plants came to us?", hint: "full stomachs",
    ready: function () { return true; } },
  { id: "lamp", name: "the lantern", title: "LANTERNS", sub: "it is always dusk here. a light by every door", hint: "a house",
    ready: function (g) { return iHouses(g) > 0; } },
  { id: "bucket", name: "the bucket", title: "THE BUCKET", sub: "water goes on fires, and on the wheat. we have a fire brigade", hint: "a fire, or a dry field",
    ready: function (g) { return g.burnt || (!!g.know.dig && iCount(g, "farm") > 0); } },
  { id: "dig", name: "digging", title: "LANDSCAPING", sub: "a hole in the ground is a pond, once it has water in it. and everything else has its place", hint: "some hoeing",
    ready: function (g) { return g.dug >= I_DUG; } },
  { id: "grave", name: "the gravestone", title: "GRAVESTONES", sub: "somewhere to remember them by", hint: "a loss",
    ready: function (g) { return g.dead.length > 0; } },
  { id: "forest", name: "forestry", title: "FORESTRY", sub: "the trees ran out. what if we grew them, on purpose, in rows", hint: "the last tree",
    ready: function (g) { return (g.treeless || 0) > 0; } },
  { id: "fish", name: "fishing", title: "FISHING", sub: "a stick, a string, and a jetty out over the pond", hint: "a good pond",
    ready: function (g, p) { return !!iJettySpot(g, p, 220); } },
  { id: "scarecrow", name: "the scarecrow", title: "THE SCARECROW", sub: "a pretend peasant, to keep the ducks off the wheat", hint: "ducks in the wheat",
    ready: function (g) { return g.raids >= 3; } },
  { id: "festival", name: "fireworks", title: "FIREWORKS", sub: "what if fire, but pretty?", hint: "more houses",
    ready: function (g) { return iKnown(g) >= 2 && iHouses(g) >= 2; } },
  /* and what is under the sand (mines.js): the rock, and what comes up out of it */
  { id: "mine", name: "mining", title: "MINING", sub: "under the sand there is rock. and in the rock, who knows?", hint: "deeper holes",
    ready: function (g) { return !!g.know.dig && (g.rock > 0 || g.dug >= 20); } },
  { id: "masonry", name: "masonry", title: "MASONRY", sub: "squared stone stacks higher than wood ever did. a tower!", hint: "a heap of stone",
    ready: function (g) { return g.found.stone >= 24; } },
  { id: "smelt", name: "smelting", title: "SMELTING", sub: "black rock burns. red rock, burned hot enough, runs: iron", hint: "the right rocks",
    ready: function (g) { return g.found.coal >= 2 && g.found.ore >= 2; } },
  { id: "lift", name: "the lift", title: "THE LIFT", sub: "a cage on a chain, and a wheel at the top. why climb?", hint: "iron, and a long climb",
    ready: function (g) { return g.iron >= 2 && mLadders(g) > 0; } },
  { id: "bell", name: "the bell", title: "THE BELL", sub: "gold rings. hang it up high, and the whole valley hears it", hint: "something shiny, up high (a tower, a lift, or a roof)",
    ready: function (g) { return g.found.gold >= 2 && (mSites(g, "tower", true).length > 0 || mSites(g, "lift", true).length > 0 || iHouses(g) > 0); } },
  { id: "statue", name: "the statue", title: "THE STATUE", sub: "a great mind deserves a great big likeness. stone, with a golden head", hint: "a great mind, and gold to spare",
    ready: function (g) { return !!g.know.masonry && g.found.gold >= 3 && iThinker(g).n >= 3; } },
  { id: "forge", name: "iron tools", title: "THE FORGE", sub: "an axe that stays sharp. a hammer that does not bend. for a while", hint: "iron to spare",
    ready: function (g) { return !!g.know.smelt && mSites(g, "furnace", true).length > 0 && mIronToHand(g) >= 6; } },
  /* and what is deeper still, and what it is good for (oil.js) */
  { id: "post", name: "the street lamp", title: "STREET LAMPS", sub: "an iron post, and a lantern on top of it. light the way home", hint: "iron to spare, and dark streets",
    ready: function (g) { return !!g.know.forge && !!g.know.lamp && mIronToHand(g) >= I_POST_IRON; } },
  { id: "oil", name: "the oil well", title: "THE OIL WELL", sub: "there is oil under the rock. bring it up", hint: "a smell of oil",
    ready: function (g) { return !!g.oilSeen && g.iron >= 1; } },
  { id: "rocket", name: "the rocket pack", title: "ROCKET PACKS", sub: "oil, a tank, a nozzle, and one brave peasant", hint: "oil enough",
    ready: function (g) { return !!g.know.oil && (g.barrels || 0) >= O_ROCKET_OIL && g.iron >= 2; } },
  /* and what is left over: ash, salt, glass, gunpowder (leftovers.js) */
  { id: "potash", name: "potash", title: "POTASH", sub: "ash from the fire, raked into the furrows. the wheat comes up twice as fast", hint: "ash, swept up, and a field",
    ready: function (g) { return !!g.know.farm && (g.found.ash || 0) >= 6 && iCount(g, "farm") > 0; } },
  { id: "salt", name: "salt", title: "SALT", sub: "salt on the ice, and nobody falls over. salt on a fish, and it keeps", hint: "salt in a pocket, and a fall on the ice (or a fish)",
    ready: function (g) { return (g.found.salt || 0) >= 3 && ((g.slips || 0) >= 1 || !!g.know.fish); } },
  { id: "powder", name: "black powder", title: "BLACK POWDER", sub: "coal, salt and ash, ground fine. it goes bang. on purpose, this time", hint: "coal, salt and ash, all three (or a pinch of the real thing)",
    ready: function (g) { return !!g.know.mine && (((g.found.coal || 0) >= 3 && (g.found.salt || 0) >= 3 && (g.found.ash || 0) >= 3) || (g.found.powder || 0) >= 1); } },
  { id: "glass", name: "glassmaking", title: "GLASSMAKING", sub: "sand, in a fire hot enough, runs clear. a glass roof for the wheat", hint: "a lump of glass, a frost, or a furnace hot a long while",
    ready: function (g) { return !!g.know.smelt && mSites(g, "furnace", true).length > 0 && ((g.found.glass || 0) >= 1 || (g.iron || 0) >= 8 || !!g.got.frost); } }
];

/* -------------------------------------------------------------------
   THINKING
   ------------------------------------------------------------------- */
/* a new village knows nothing yet. (clearing the world does not make them forget: it does lose them the graveyard) */
function ideasReset(g) {
  delete g.hand;   /* (a new valley, and nothing in the hand: hand.js) */
  g.know = {}; g.dug = 0; g.dead = []; g.blaze = []; g.burnt = false; g.fwStage = null; g.raids = 0; g.raidT = 0; g.festT = 0; g.ideaT = 0; g.blankT = 0;
  /* when each idea first could have been thought of (the longer something has been on their minds, the likelier it is
     to be next), and how often somebody has gone for wood and found no tree */
  g.readyT = {}; g.treeless = 0; g.dugSpark = 0; g.noRoom = {}; g.tools = 0;
  g.pondNo = {};   /* (where a pond was lately given up: iPondNo) */
  /* what has come up out of the ground so far, and how much iron they have made of it (mines.js). rock: how often
     anybody has stood on bare rock, and wondered */
  g.found = { stone: 0, coal: 0, ore: 0, gold: 0, oil: 0, salt: 0, ash: 0, glass: 0, powder: 0 }; g.iron = 0; g.rock = 0;
  /* and what comes up out of a well, and what they make of it (oil.js) */
  g.oilSeen = 0; g.barrels = 0; g.packs = 0;
  /* and what is left over, and what they make of it (leftovers.js) */
  lReset(g);
  /* and how tidy they keep it (tidy.js) */
  tReset(g);
  /* and the great works, and the tales they tell (wonders.js) */
  wReset(g);
}
/* (plain: not counting the great works, which are ideas too: wonders.js) */
function iKnown(g, plain) { var n = 0; for (var k in g.know) if (!plain || !wIsWonder(k)) n++; return n; }
function iPlain() { var n = 0; for (var k = 0; k < IDEAS.length; k++) if (!IDEAS[k].wonder) n++; return n; }
/* the ideas master has (not a great work's, nor one of the plain ones that came with them: concrete, stained glass) */
function iFresh(i) { return !!(i.wonder || i.fresh); }
function iOldN() { var n = 0; for (var k = 0; k < IDEAS.length; k++) if (!iFresh(IDEAS[k])) n++; return n; }
function iKnownOld(g) { var n = 0; for (var k = 0; k < IDEAS.length; k++) if (!iFresh(IDEAS[k]) && g.know[IDEAS[k].id]) n++; return n; }
var I_WSPARK = 0.5;   /* the chance, each time they think, that what happened to them for a great work is the idea (side dice) */
function iHouses(g) {
  var n = 0;
  for (var k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "house" && g.sites[k].done) n++;
  return n;
}
/* every tick of a calm, full stomach is a little closer to an idea. twice as close at home, by a campfire with
   friends, with a rod in hand, or standing about by lamplight */
function iThink(g, p) {
  if (p.dead || p.state !== "walk") return;
  if (p.bulb > 0) p.bulb--;
  if (p.fire || p.panic > 0 || p.sleep > 0 || p.hunger >= I_FED || p.cold > 60) return;
  /* (bare rock underfoot: somebody who knows about holes in the ground wonders what is under it) */
  if ((p.anim % 60) === 0 && g.know.dig && pCell(g, Math.floor(p.x), Math.floor(p.y) + 1) === MAT.STONE) { g.rock++; iSpark(g, p, "mine"); }
  var k = p.task, h = p.idle > 0 ? bHome(g, p) : null;
  var cosy = (h && bInside(h, p)) || (k && ((k.kind === "fish" && k.bob) || (k.kind === "warm" && k.social) || k.kind === "admire")) ||
             (p.idle > 0 && iLampNear(g, p.x, p.y)) || p.cosyT > g.tick;   /* (a play, a warm bath: wonders.js) */
  p.muse = (p.muse || 0) + (cosy ? 2 : 1);
}
/* something has just happened to p that puts idea id into their head: it is on the tip of their tongue (they are well
   on the way to a bright idea, and when it comes, it is this one). nothing, if the village knows it already */
function iSpark(g, p, id) {
  if (!p || p.dead || g.know[id]) return;
  p.spark = id;
  p.muse = Math.max(p.muse || 0, I_MUSE * 0.6);
}
/* an idea they have, and nowhere to put what comes of it: the valley hears about it (now and then, not every time
   somebody looks). what: "a watchtower" */
function iNoRoom(g, what) {
  var t = g.noRoom || (g.noRoom = {});
  if (t[what] > g.tick) return;
  t[what] = g.tick + 30000;
  feed(g, "nowhere for " + what + " yet. the ground is too lumpy, or too built on", "#c8d0dc", "room" + what);
}
/* who has had the most ideas (by their short name: a king is the peasant they were): {name, n} */
function iThinker(g, skip) {
  var n = {}, best = { name: "", n: 0 }, k, s;
  for (k in g.know) { s = g.know[k]; if (!s || s === "TEST") continue; s = iShort(s); if (skip && skip[s]) continue; n[s] = (n[s] || 0) + 1; if (n[s] > best.n) best = { name: s, n: n[s] }; }
  return best;
}
/* the short names of those who have a statue already */
function iStatued(g) { var o = {}; for (var k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "statue") o[g.sites[k].of] = 1; return o; }
/* what those are: "farming, the lift and the bell" */
function iIdeasOf(g, short) {
  var out = [], k;
  for (k = 0; k < IDEAS.length; k++) if (g.know[IDEAS[k].id] && iShort(g.know[IDEAS[k].id]) === short) out.push(IDEAS[k].name);
  return out.length > 1 ? out.slice(0, -1).join(", ") + " and " + out[out.length - 1] : (out[0] || "nothing much");
}
/* now and then: which ideas something has put into their heads, and since when */
function iReadyScan(g) {
  var p = null, k;
  for (k = 0; k < g.peasants.length && !p; k++) if (!g.peasants[k].dead && g.peasants[k].state === "walk") p = g.peasants[k];
  if (!p) return;
  for (k = 0; k < IDEAS.length; k++) if (!g.know[IDEAS[k].id] && !g.readyT[IDEAS[k].id] && IDEAS[k].ready(g, p)) g.readyT[IDEAS[k].id] = g.tick;
}
/* a lit lantern within a few steps of (x, y) */
function iLampNear(g, x, y) {
  if (hBeamLit(g, x, y)) return true;   /* (or the lighthouse's beam, going over: heavens.js) */
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (s.kind === "lamp" && Math.abs(s.x0 - x) < 8 && Math.abs(s.y1 - y + 4) < 9 && g.m[s.plan[1].i] === MAT.LAMP) return true;
  }
  return false;
}
/* the light goes on: something they have not thought of yet, that something has put into their heads. food first
   (it is a full stomach doing the thinking); after that, whatever comes */
function iEureka(g, p) {
  var idea = null, ready = [], k, old = null, fresh = [], wold = null;
  if (g.tick < g.ideaT) return false;   /* still getting used to the last one: hold that thought */
  p.muse = 0;
  if (p.spark && g.know[p.spark]) p.spark = null;   /* (somebody else got there first) */
  if (p.wspark && g.know[p.wspark]) p.wspark = null;
  for (k = 0; k < IDEAS.length; k++) if (!g.know[IDEAS[k].id] && IDEAS[k].ready(g, p)) {
    /* (the great works' ideas, and the plain ones that are theirs, concrete and stained glass, are not in the village's
       own lottery: that is master's, die for die, until one of them is thought of. they come on the side dice, below) */
    if (iFresh(IDEAS[k])) {
      fresh.push(IDEAS[k]);
      if (!g.readyT[IDEAS[k].id]) g.readyT[IDEAS[k].id] = g.tick;
      if (!wold || g.readyT[IDEAS[k].id] < g.readyT[wold.id]) wold = IDEAS[k];
      continue;
    }
    ready.push(IDEAS[k]);
    if (!g.readyT[IDEAS[k].id]) g.readyT[IDEAS[k].id] = g.tick;
    if (IDEAS[k].id === p.spark && g.know.farm) idea = IDEAS[k];   /* what happened to them is what they think about */
    if (!old || g.readyT[IDEAS[k].id] < g.readyT[old.id]) old = IDEAS[k];
  }
  /* food first (it is a full stomach doing the thinking). after that: what has been on everybody's minds longest,
     mostly, and now and then something out of nowhere */
  /* a great work's idea, on the great works' own dice (wonders.js wRand: kept on g, saved and rewound with it, and not
     rolled by anything else): what happened to them (p.wspark: wonders.js wSpark) most likely; with nothing
     else on their minds, the one that has been about longest, now and then */
  if (fresh.length) {
    var ws = null;
    for (k = 0; k < fresh.length; k++) if (fresh[k].id === p.wspark) ws = fresh[k];
    if (ws && wRand(g) < I_WSPARK) idea = ws;
    else if (!ready.length && wRand(g) < I_WSPARK / 2) idea = wold;
  }
  if (!idea && ready.length) idea = !g.know.farm ? ready[0] : (Math.random() < 0.65 ? old : pick(ready));
  if (!idea) {
    /* nothing has happened yet to think about. it was nearly something, though (of master's ideas: iOld) */
    if (iKnownOld(g) < iOldN() && g.tick > g.blankT && p.sayT <= 0) { g.blankT = g.tick + 3600; pSay(g, p, "blank"); }
    return false;
  }
  if (p.wspark === idea.id) p.wspark = null;
  g.know[idea.id] = p.name;
  /* (one of the great works' ideas: the village has great works in it from now, this tick, not from the next time
     wonders.js wStep looks. what g.wAny gates, the sounds on the side dice among it, changes with the idea, not a frame
     or a stride later) */
  if (iFresh(idea)) g.wAny = true;
  if (p.spark === idea.id) p.spark = null;
  /* (some ideas take longer to get used to than others) */
  g.ideaT = g.tick + Math.round(I_GAP * (0.7 + 0.6 * Math.random()));
  p.bulb = I_BULB; p.idle = 90; p.bored = 0;
  pSay(g, p, "idea_" + idea.id, true);
  /* (a great work is news of another kind: wonders.js) */
  feed(g, p.name + (idea.wonder ? " thought of " : " invented ") + idea.name, idea.wonder ? "#ffd94a" : "#ffe08a", null, p);
  banner(g, idea.wonder ? "A WONDER: " + idea.title : idea.title, pTitle(p.short) + "'s idea: " + idea.sub);
  wTale(g, "idea", p, idea.name);
  g.fx.idea++;
  var q = pOther(g, p, 40);
  if (q && !q.sleep) pSay(g, q, "genius", true);
  if (!iFresh(idea) && iKnownOld(g) === iOldN()) achieve(g, "enlightened");   /* (master's ideas, all of them: as on master) */
  mRing(g, 3);   /* (and if there is a bell, it rings: mines.js) */
  return true;
}

/* -------------------------------------------------------------------
   WHAT TO DO ABOUT IT. called when they are looking for something to
   do, after food, bed and wood (build.js). true if they found something
   ------------------------------------------------------------------- */
function iPick(g, p) {
  var K = g.know, hungry = p.hunger > P_HUNGRY, s;
  if ((p.muse || 0) >= I_MUSE && iEureka(g, p)) return true;
  if (p.thank && handThank(g, p)) return true;   /* (the sky put their fire out: something left out for it. hand.js) */
  /* a duck in the wheat comes before anything */
  if (K.farm && !hungry && iGoShoo(g, p)) return true;
  /* a field wants hands, not wood: anybody will do */
  if (K.farm && (s = iFieldWork(g, p, 160))) { bJoin(g, p, s); return true; }
  /* (an ice palace going up, before the thaw: before snowmen and snowballs, anybody free lends a hand. pleasures.js) */
  if (g.wAny && !hungry && pIceFirst(g, p)) return true;
  /* snow on the ground, or ice to skate on, and time on their hands: that is what it is for (leftovers.js) */
  if (!hungry && lPlay(g, p)) return true;
  /* (a field dug up for a mine or a well is sown again somewhere else: straight away, wherever there is room) */
  /* (a terrace of the hanging gardens is a field that does not count against the cap: iFields. pleasures.js) */
  if (K.farm && g.resow && iFields(g) < Math.min(4, Math.ceil(bAlive(g) / 3)) && iPlanFarm(g, p, true)) { g.resow = 0; return true; }
  if (K.farm && !p.planCD && iFields(g) < Math.min(4, Math.ceil(bAlive(g) / 3)) && (hungry || Math.random() < 0.3)) {
    if (iPlanFarm(g, p, !iCount(g, "farm"))) return true;   /* (no field at all: anywhere in the valley will do) */
    p.planCD = 1800;
    if (g.know.storey) { g.noFieldT = g.tick; sSparkRoof(g, p); }   /* (no room for a field: the roofs, then. storeys.js) */
  }
  /* a pond wants hands, not wood, either. then filling it, and keeping it full, and planning the next */
  if (K.dig && (s = iFieldWork(g, p, 160, "pond"))) { bJoin(g, p, s); return true; }
  if (K.dig && K.bucket && !hungry && Math.random() < 0.6 && iGoFillPond(g, p)) return true;
  if (K.dig && K.bucket && !p.planCD && (hungry || Math.random() < 0.3)) {
    if (iPlanPond(g, p)) return true;
    p.planCD = 1800;
  }
  /* a puddle on their own floor, sand on their own roof: that is theirs to see to, before the rest (tidy.js) */
  if (K.dig && !hungry && tHome(g, p)) return true;
  /* somebody gone, with no cross yet: that comes before the mine, too */
  if (K.grave && bOpenCount(g) < B_OPEN && (bWood(p) >= 1 || Math.random() < 0.3) && g.tick > (g.graveT || 0) && iGraveDue(g) && iPlanGrave(g, p)) return true;
  /* the bell, while there is none (and gold enough about for it): before the mine gets them, too */
  if (K.bell && !iCount(g, "bell") && bOpenCount(g) < B_OPEN && ((p.gold || 0) >= 1 || mGoldToHand(g) >= 2) && Math.random() < 0.5 && mPlanBell(g, p)) return true;
  /* a statue for the greatest mind in the valley, while there is none: before the mine gets them */
  if (K.statue && !p.planCD && !iCount(g, "statue") && bOpenCount(g) < B_OPEN && ((p.stone || 0) >= 4 || (p.gold || 0) >= 1 || Math.random() < 0.2) && iPlanStatue(g, p)) return true;
  /* iron to spare, and a street with dark stretches in it: a lamp post (a village's worth of thinking about it at a
     time, not each peasant's) */
  if (K.post && !hungry && g.tick > (g.postT || 0) && bOpenCount(g) < B_OPEN && mIronToHand(g) >= mIronSpare(g) + I_POST_COST && Math.random() < 0.3) {
    if (iPlanPost(g, p)) return true;
    g.postT = g.tick + 1500;
  }
  /* and with a spade in hand, the rest of the valley looks untidy: puddles carried to the pond, sand swept off the
     roofs and into the holes. after the dead and the bell and the statue, but before the mine, which would have
     everybody for ever (tidy.js) */
  if (K.dig && tPick(g, p, hungry)) return true;
  /* a charge of black powder in the pocket, and a gallery with rock ahead: before the pick gets them (leftovers.js) */
  if (K.powder && !hungry && (p.powder || 0) >= 1 && Math.random() < 0.5 && lGoBlast(g, p)) return true;
  /* a great work, if one is going up, or wanted, and whatever comes of the ones that are up (wonders.js). before the
     mine, which would have everybody for ever */
  if (g.wAny && wPick(g, p, hungry)) return true;
  /* the mine, and everything that comes up out of it (mines.js) */
  if (mPick(g, p, hungry)) return true;
  /* the oil well, and the rocket pack (oil.js) */
  if (oPick(g, p, hungry)) return true;
  if (K.fish && (hungry || (p.bored > 700 && Math.random() < 0.3)) && iGoFish(g, p)) return true;
  if (K.bucket && !hungry && Math.random() < 0.15 && iGoWater(g, p)) return true;
  /* the woods running thin: plant some more (no wood, just a sapling, and patience) */
  if (K.forest && !hungry && !p.plantCD && Math.random() < 0.3 && iGoPlant(g, p)) return true;
  /* another statue, for the next greatest mind (living or not), and the odd visit to one */
  if (K.statue && !p.planCD && bOpenCount(g) < B_OPEN && ((p.stone || 0) >= 6 || (p.gold || 0) >= 1) && Math.random() < 0.3 && iPlanStatue(g, p)) return true;
  if (K.statue && p.bored > 500 && Math.random() < 0.08 && iGoAdmire(g, p)) return true;
  /* things that want wood: with some in hand, or now and then without (somebody with wood will be along) */
  if (!p.planCD && bOpenCount(g) < B_OPEN && (bWood(p) >= 1 || Math.random() < 0.15)) {
    if (K.grave && iPlanGrave(g, p)) return true;
    if (K.lamp && iPlanLamp(g, p)) return true;
    if (K.scarecrow && iPlanScarecrow(g, p)) return true;
    if (K.fish && iPlanJetty(g, p)) return true;
  }
  if (K.grave && p.bored > 600 && Math.random() < 0.1 && iGoVisit(g, p)) return true;
  if (K.festival && p.bored > 900 && p.hunger < I_FED * 2 && iPlanFestival(g, p)) return true;
  /* what is left over (ash, salt, glass, gunpowder, snow, ice), and what they make of it (leftovers.js) */
  if (lPick(g, p, hungry)) return true;
  /* coal in the pocket, a long evening, and nobody's fire to stand round: a fire of coal, and the neighbours come */
  if ((p.coal || 0) >= 3 && p.bored > 1200 && Math.random() < 0.08 && !bFindFire(g, p, 60)) {
    var cx = Math.floor(p.x) + p.dir * 5;
    if (pCampOk(g, p, cx, Math.floor(p.y))) { p.task = { kind: "camp", x: cx, y: Math.floor(p.y), t: 0, act: 0, coal: true }; return true; }
  }
  return false;
}
/* before anything else: something they built is on fire, and they know about buckets */
function iUrgent(g, p) {
  if (!g.know.bucket || !g.blaze.length || p.fire || p.panic > 0 || p.cold > 150 || p.hunger > P_HUNGRY * 2) return false;
  var best = null, bd = mRinging(g) ? 1e9 : 260, k, s, d;   /* (with the bell going, the whole valley comes: mines.js) */
  for (k = 0; k < g.blaze.length; k++) {
    s = bSite(g, g.blaze[k].site);
    if (!s) continue;
    d = Math.abs(s.cx - p.x) + Math.abs(s.cy - p.y);
    if (d < bd && iCrew(g, "bucket", s.id) < 6) { bd = d; best = s; }
  }
  if (!best || p.dryT > g.tick) return false;
  /* no water this side of the fire: nothing they can do but watch (and they will not be asked again for a bit) */
  var w = p.pail ? null : iFindWater(g, p, 160, iBlazeOf(g, best.id));
  if (!w && !p.pail) {
    p.dryT = g.tick + 600; if (p.sayT <= 0 && Math.random() < 0.5) pSay(g, p, "nowater");
    if (g.hand) handWish(g, p, best);   /* (or ask the sky for some: hand.js) */
    return false;
  }
  p.task = { kind: "bucket", site: best.id, t: 0, act: 0, w: w };
  if (p.sayT <= 0 && Math.random() < 0.5) pSay(g, p, "brigade");
  return true;
}
/* one tick of one of the jobs in here, or undefined if it is not one of ours */
function iTask(g, p, k) {
  if (k.kind === "bucket") return iTaskBucket(g, p, k);
  if (k.kind === "fish") return iTaskFish(g, p, k);
  if (k.kind === "shoo") return iTaskShoo(g, p, k);
  if (k.kind === "visit") return iTaskVisit(g, p, k);
  if (k.kind === "festival") return iTaskFestival(g, p, k);
  if (k.kind === "watch") return iTaskWatch(g, p, k);
  if (k.kind === "admire") return iTaskAdmire(g, p, k);
  var r = wTask(g, p, k);   /* (wonders.js) */
  if (r !== undefined) return r;
  r = mTask(g, p, k);
  if (r !== undefined) return r;
  r = lTask(g, p, k);
  if (r !== undefined) return r;
  r = tTask(g, p, k);
  if (r !== undefined) return r;
  r = handTask(g, p, k);   /* (running after their house, or going to leave something out for the hand: hand.js) */
  if (r !== undefined) return r;
  return oTask(g, p, k);
}
function iDone(p, ok) { p.task = null; p.taskDone = !!ok; return false; }
/* how many are at a job of this kind, on this site */
function iCrew(g, kind, id) {
  var n = 0;
  for (var k = 0; k < g.peasants.length; k++) { var t = g.peasants[k].task; if (t && t.kind === kind && (t.site === id || t.field === id || t.pond === id)) n++; }
  return n;
}
function iCount(g, kind) { var n = 0; for (var k = 0; k < g.sites.length; k++) if (g.sites[k].kind === kind) n++; return n; }
/* fields, for the cap on them: a terrace of the hanging gardens is a field, but not one of those (pleasures.js) */
function iFields(g) { var n = 0; for (var k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "farm" && !g.sites[k].terrace && !g.sites[k].roof) n++; return n; }   /* (nor a roof garden: storeys.js) */
/* walk p towards somewhere goal likes, near (x, y), as every errand here does. true once they are stuck for good */
function iWalk(g, p, k, key, x, y, goal) {
  var left = pathGo(g, p, key, x, y, goal);
  if (left < 0) p.dir = x + 0.5 < p.x ? -1 : 1;
  k.act = 0;
  return pStuck(p, k, left > 0 ? left : Math.abs(x + 0.5 - p.x) + Math.abs(y - p.y));
}

/* what somebody will drop to go and watch the fireworks */
var I_FUN = { explore: 1, chop: 1, plant: 1, fish: 1, visit: 1, light: 1, lookout: 1, admire: 1, gather: 1, snowball: 1, snowman: 1, skate: 1 };
/* once a third of a second or so: what is on fire */
var I_IDLE = { explore: 1, chop: 1, plant: 1, fish: 1, visit: 1, watch: 1, light: 1, festival: 1, build: 1, camp: 1, shoo: 1, lookout: 1, smelt: 1, forge: 1, pump: 1, pack: 1, refuel: 1, launch: 1, admire: 1,
  gather: 1, snowball: 1, snowman: 1, skate: 1, grit: 1, potash: 1, grind: 1, bombfish: 1, glassblow: 1, store: 1, brine: 1, tidy: 1,
  audience: 1, act: 1, bathe: 1, haul: 1, quarry: 1, kiln: 1, stoke: 1, chase: 1, thank: 1 };   /* (wonders.js. chase, thank: hand.js) */
/* what somebody will drop when the alarm goes up: anything they are only doing for fun, or that can wait (a snack, a
   chat round the campfire, a bit of hammering) */
function iCanWait(p, k) {
  return !k || I_IDLE[k.kind] || (k.kind === "eat" && p.hunger < P_HUNGRY * 2) || (k.kind === "warm" && k.social) || (k.kind === "bucket" && (k.field || k.pond || (k.src && !p.pail)));
}
function ideasStep(g) {
  if (g.tick % 20) return;
  tStep(g);   /* (a bailer gone swimming: tidy.js) */
  var S = g.sites, k, j, s, f;
  if (g.tick % 120 === 0) iReadyScan(g);
  iFestSweep(g);
  if (g.tick % 600 === 0) iGraveyardStep(g);
  g.blaze.length = 0;
  for (k = S.length - 1; k >= 0; k--) {
    s = S[k];
    /* lanterns that never got hung, for a house that is not there any more */
    if (s.kind === "lamp" && !s.done && !bSite(g, s.home)) { bRemove(g, k); continue; }
    /* a field with nothing left that can be sown (a puddle where a seed should go): sown, as far as it goes */
    if (s.free && !s.done && !bBusy(g, s) && bFinished(g, s)) { s.done = true; s.repair = s.sow = false; s.last = g.tick; }
    f = iFlames(g, s);
    /* (a fire on a stage, in the middle of a play, is part of it. for a little while: wonders.js) */
    if (f.length && s.wonder && wPartOfIt(g, s, f)) continue;
    if (!f.length) {
      if (s.handH || s.handD) continue;   /* (what is alight of it is in the hand, if any is, or in the lake: not put out until it comes down, or is seen to be out. hand.js) */
      /* (the brigade takes the credit if it got a few bucketfuls on before it went out. unless the sky put it out) */
      if (s.handWet && handSky(g, s)) { /* (the sky put it out: hand.js) */ }
      else if (s.burning && s.doused >= 3) { feed(g, "the bucket brigade put out the fire at " + bLabel(s), "#9ad0ff", "blaze" + s.id); achieve(g, "brigade"); }
      s.burning = 0; s.doused = 0;
      continue;
    }
    if (!s.burning && g.know.bucket) feed(g, iCap(bLabel(s)) + " is on fire!", "#ffb070", "blaze" + s.id);
    s.burning = s.burning || g.tick;
    g.blaze.push({ site: s.id, cells: f });
    /* (the first fire of theirs: whoever is watching it go up has an idea about water) */
    if (!g.burnt) iSpark(g, pOther(g, { x: s.cx, y: s.cy }, 120), "bucket");
    g.burnt = true;
  }
  /* ducks in the wheat: somebody who is only doing something for fun goes and chases each one off */
  if (g.know.farm && !g.blaze.length) iShooAlarm(g);
  /* furnaces, bells (mines.js), and the smell of oil under the rock (oil.js) */
  mStep(g);
  oStep(g);
  lStep(g);
  /* the bell, ringing for a fire, wakes the whole valley, buckets or no buckets */
  if (g.blaze.length && mRinging(g)) for (k = 0; k < g.peasants.length; k++) {
    var q = g.peasants[k];
    if (q.sleep > 0 && !q.dead && q.state === "walk") { bWake(g, q); q.idle = 0; }
  }
  /* the alarm: anybody who knows about buckets drops whatever they were doing just for fun (or nothing at all), and
     grabs one */
  if (g.blaze.length && g.know.bucket) for (k = 0; k < g.peasants.length; k++) {
    var p = g.peasants[k];
    /* and anybody in a house that is on fire (asleep or not) is woken, and runs for the door */
    if (!p.dead && p.state === "walk" && !p.fire && iBurningHouse(g, p)) {
      if (p.panic < 40 && p.sayT <= 0) pSay(g, p, "evac", true);
      p.panic = Math.max(p.panic, 60); p.idle = 0;
      continue;
    }
    if (p.dead || p.state !== "walk" || p.sleep || p.climb || p.rope || p.swimming || !iCanWait(p, p.task)) continue;
    var was = p.task;
    p.task = null;
    if (iUrgent(g, p)) { p.idle = 0; p.taskCD = 0; } else p.task = was;
  }
}
/* the burning house p is in, if it is in one */
function iBurningHouse(g, p) {
  for (var k = 0; k < g.blaze.length; k++) {
    var s = bSite(g, g.blaze[k].site);
    if (s && sDwelling(s) && s.done && bInside(s, p)) return s;
    if (s && g.know.storey && sDwelling(s) && (s = sBurningStackOf(g, s, p))) return s;   /* (any floor of a stack on fire: all of it out. storeys.js) */
  }
  return null;
}
/* which way is the way out: the nearer door, unless the fire is on the way to it (counted cells of it between them) */
function iExit(g, p, h) {
  var b = iBlazeOf(g, h.id), best = 0, bs = 1e9, d, k, n, x;
  for (d = -1; d <= 1; d += 2) {
    var door = d < 0 ? h.ix0 - 1 : h.ix1 + 2;
    n = 0;
    if (b) for (k = 0; k < b.cells.length; k++) { x = b.cells[k] % g.gw; if ((x - p.x) * (door - x) > 0) n++; }
    if (g.know.storey) n += sFireOutside(g, h, door, d);   /* (and fire just outside the door, at a flat's ladder say: storeys.js) */
    var sc = Math.abs(door - p.x) + n * 4;
    if (sc < bs) { bs = sc; best = d; }
  }
  return best;
}
/* panicking (and the house is on fire): out of it. true if that is what they are doing */
function iFlee(g, p) {
  if (!g.know.bucket) return false;
  var h = iBurningHouse(g, p);
  if (!h) return false;
  p.dir = h.kind === "storey" ? h.d : iExit(g, p, h);   /* (a flat has the one door: storeys.js) */
  return true;
}
/* somebody on fire, near enough to run at with a bucket */
function iVictim(g, p) {
  var best = null, bd = 1e9, k, q, d;
  for (k = 0; k < g.peasants.length; k++) {
    q = g.peasants[k];
    if (q === p || q.dead || !q.fire || q.state !== "walk") continue;
    d = Math.abs(q.x - p.x);
    if (d < 45 && Math.abs(q.y - p.y) < 14 && d < bd) { bd = d; best = q; }
  }
  return best;
}
/* somebody burning wants water, and a brigade bucket will do as well as a pond: the nearest one, if there is one */
function iRescuer(g, p) {
  if (!g.know.bucket) return null;
  var best = null, bd = 70, k, q, d;
  for (k = 0; k < g.peasants.length; k++) {
    q = g.peasants[k];
    if (q === p || q.dead || !q.pail || !q.task || q.task.kind !== "bucket" || q.state !== "walk") continue;
    d = Math.abs(q.x - p.x);
    if (d < bd && Math.abs(q.y - p.y) < 14) { bd = d; best = q; }
  }
  return best;
}
/* a bucket over somebody: they are out. the water goes where they stand, and then on down */
function iDouse(g, p, v) {
  v.fire = 0; v.fireTo = null; g.fx.hiss++;
  pSay(g, v, "phew", true);
  if (p.sayT <= 0) pSay(g, p, "douse");
  sparks(g, v.x, v.y - 8, 6, 0.4, [hex32("#c0d0e0")], 14, 0.6, PK_GLINT);
  iSpill(g, p, false, Math.floor(v.x), Math.floor(v.y) - 6);
}
function iCap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
/* flames and embers in and about a site: all of them, top to bottom. (a lantern is only on fire if it is. and the flame
   on a torch is not a fire, it is a torch: no bucket puts that out) */
function iFlames(g, s) {
  var out = [], pad = s.kind === "lamp" ? 0 : 2, x, y, c;
  for (y = s.y0 - (pad ? 3 : 0); y <= s.y1 + (pad ? 1 : 0); y++) for (x = s.x0 - pad; x <= s.x1 + pad; x++) {
    c = pCell(g, x, y);
    if ((c === MAT.FIRE || c === MAT.EMBER) && !iTorchlit(g, x, y)) out.push(y * g.gw + x);
  }
  return out;
}
function iTorchlit(g, x, y) {
  for (var d = 1; d <= 4; d++) for (var k = -1; k <= 1; k++) if (pCell(g, x + k, y + d) === MAT.TORCH) return true;
  return false;
}

/* -------------------------------------------------------------------
   FORESTRY: when the woods are gone, grow some more
   ------------------------------------------------------------------- */
/* somebody wanted wood, went to look, and there was not a tree to be had. the first time, it is news */
function iTreeless(g, p) {
  if (!g.treeless) {
    feed(g, "not a tree left standing. " + p.name + " has looked", "#c8d0dc", "treeless");
    if (p.sayT <= 0) pSay(g, p, "treeless", true);
  }
  g.treeless = (g.treeless || 0) + 1;
  iSpark(g, p, "forest");
}
/* how much wood is still growing within R columns of x: unmarked trunk, and saplings coming on. counted up to cap */
function iWoods(g, x, R, cap) {
  var n = 0, x0 = Math.max(0, Math.floor(x - R)), x1 = Math.min(g.gw - 1, Math.floor(x + R)), xx, y, c;
  for (xx = x0; xx <= x1; xx++) for (y = 0; y < g.gh; y++) {
    c = g.m[y * g.gw + xx];
    if (c === MAT.SAPLING) n += 6;   /* (a tree to come) */
    else if (c === MAT.WOOD && !bMarked(g, xx, y)) n++;
    else if (!AIRY[c] && !P_LEAF[c] && c !== MAT.WOOD) break;   /* (down to the ground: roots are nobody's business) */
    if (n >= cap) return n;
  }
  return n;
}
/* the woods are thin round here: off to plant a sapling, somewhere it has room to grow and is in nobody's way. (one
   planter at a time, and a while before they think of it again) */
function iGoPlant(g, p) {
  p.plantCD = 900;
  if (iWoods(g, p.x, 150, I_WOODS) >= I_WOODS) return false;
  for (var k = 0; k < g.peasants.length; k++) { var t = g.peasants[k].task; if (t && t.kind === "plant") return false; }
  var t2 = bPlantSpot(g, p, 150, true);
  if (!t2) { p.plantCD = 2400; return false; }
  p.task = { kind: "plant", x: t2.x, y: t2.y, t: 0, act: 0, loose: true };
  if (p.sayT <= 0 && Math.random() < 0.5) pSay(g, p, "planGrove");
  return true;
}

/* -------------------------------------------------------------------
   FARMING
   ------------------------------------------------------------------- */
/* a stalk of wheat. the tip climbs, out of the air (or out of any water lying on it, which it drinks, and which makes
   it grow a good deal faster: so does water by its roots), to four to six high. then the ear ripens, and the ripeness
   runs down the stalk */
function cropGrow(g, i, x, y) {
  var m = g.m, gw = g.gw, up = y > 0 ? m[i - gw] : MAT.STONE, r = Math.random(), h, b, W = MAT.WATER;
  /* salt water does for wheat what it does for any plant */
  if (sandHas(g, x, y, MAT.SALTWATER) >= 0) { if (r < 0.01) { m[i] = MAT.EMPTY; heatSync(g, i); } return; }
  /* frost stops it out in the open (a hard one kills it); potash and a glass roof speed it up (leftovers.js) */
  var fast = lGrowth(g, i, x);
  if (!fast || g.m[i] !== MAT.CROP) return;
  if (up === MAT.WHEAT) { if (r < 0.01 * fast) heatBecome(g, i, MAT.WHEAT); return; }
  if (up === MAT.CROP) return;
  if (r > (up === W ? 0.03 : 0.008) * fast) return;
  for (h = 1; h < 9 && y + h < g.gh && (m[i + h * gw] === MAT.CROP || m[i + h * gw] === MAT.WHEAT); h++);
  b = i + h * gw;
  if (y + h >= g.gh || m[b] !== MAT.SOIL) return;   /* uprooted: it stays as it is */
  var wet = up === W || lWetUnderGlass(g, x) || sandHas(g, x, y + h, W) >= 0 || sandHas(g, x, y + h - 1, W) >= 0 || sandHas(g, x, y, W) >= 0;
  if (!wet && r > 0.002 * fast) return;
  if (h < I_CROP_H + (x * 5) % 3 && (up === MAT.EMPTY || up === W)) { sandSet(g, i - gw, MAT.CROP); return; }
  heatBecome(g, i, MAT.WHEAT);   /* as tall as it gets: the ear ripens */
}
/* the nearest field (or pond: kind) with something to do on it */
function iFieldWork(g, p, R, kind) {
  var best = null, bd = R, k, s, d;
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if (s.kind !== (kind || "farm") || s.done || (p.failSite === s.id && p.failT > g.tick) || iCrew(g, "build", s.id) >= 3 || s.flood === 2 || (s.mine && mFlooded(g, s)) || (s.kind === "tunnel" && (mRetired(g, s) || lChargeOn(g, s.id)))) continue;
    d = Math.abs(s.cx - p.x) + Math.abs(s.cy - p.y) * 2;
    if (d < bd && bNext(g, s, null)) { bd = d; best = s; }
  }
  return best;
}
/* a field: eleven columns of sand (or ash) with open sky over them, near p, as level as can be found */
function iPlanFarm(g, p, wide) {
  var fx = Math.floor(p.x), fy = Math.floor(p.y), best = null, d, sd, r, C = [], k;
  if (!g.farmNo) g.farmNo = {};
  for (d = 0; d <= 90; d++) for (sd = -1; sd <= 1; sd += 2) {
    if (!d && sd > 0) continue;
    var x0 = fx + d * sd - (I_FARM_W >> 1);
    if (g.farmNo[x0] > g.tick || (p.farmNo && p.farmNo[x0] > g.tick)) continue;   /* (given up there lately, or found out of reach by them) */
    r = iFarmPlot(g, x0, fy);
    if (r) { r.score = r.work + d * 0.2; C.push(r); }
  }
  /* (the best of them they can walk to: a few looks. the rest is let be a while) */
  C.sort(function (a, b) { return a.score - b.score; });
  for (k = 0; k < C.length && k < 4 && !best; k++) if (iFarmReach(g, p, C[k])) best = C[k];
  /* (anywhere in the valley: the best few, past the ones they cannot get to) */
  /* (four looks at flat ground, then four at rough: flat ground across a wall is no reason never to try the rough
     on this side of it) */
  for (k = 0; k < 8 && !best && wide; k++) { var w = iFarmSpot(g, -1, -1, p, k >= 4); if (!w) { if (k < 4) { k = 3; continue; } break; } if (iFarmReach(g, p, w)) best = w; }   /* (a field to replace one dug up: anywhere in the valley) */
  if (!best) { if (g.know.concrete) pGardensNoRoom(g, p, wide); return false; }   /* (no room for one: the hanging gardens. pleasures.js) */
  var plan = [], k, e, x0 = best.x0, x1 = x0 + I_FARM_W - 1;
  for (k = 0; k < best.dig.length; k++) plan.push(bE(g, best.dig[k][0], best.dig[k][1], MAT.EMPTY, 0));
  for (k = 0; k < I_FARM_W; k++) plan.push(bE(g, x0 + k, best.gy[k], MAT.SOIL, 1));
  /* a row of wheat in every other furrow, so there is room to see it is a field and not a hedge */
  for (k = 0; k < I_FARM_W; k += 2) plan.push(bE(g, x0 + k, best.gy[k] - 1, MAT.CROP, 2));
  var s = bNew(g, "farm", p, plan, [x0, best.lo - 6, x1, best.hi], { free: true, G: best.lo });
  feed(g, p.name + " is starting a field", "#a8e08a", "plan" + s.id);
  pSay(g, p, "planFarm", true);
  bJoin(g, p, s);
  return true;
}
/* can p walk to field plot r (else the plot is let be a while, by them: p.farmNo) */
function iFarmReach(g, p, r) {
  var mid = r.x0 + (I_FARM_W >> 1), G = r.gy[I_FARM_W >> 1];   /* (the plot's own ground) */
  if (G > 0 && mReachable(g, p, mid, G - 1)) return true;
  /* (out of reach for them, for a while: somebody else may be on the right side of it. the village's own list,
     g.farmNo, is for fields it has given up) */
  if (!p.farmNo) p.farmNo = {};
  for (var x = r.x0 - 3; x <= r.x0 + 3; x++) p.farmNo[x] = g.tick + 6000;   /* (that plot, and the ones overlapping it most: further along may be on their side) */
  return false;
}
/* field plots over columns a .. b (and a little either side) let be for t ticks */
function iFarmNo(g, a, b, t) { if (!g.farmNo) g.farmNo = {}; for (var x = a - I_FARM_W - 2; x <= b + 2; x++) g.farmNo[x] = g.tick + t; }
/* somewhere in the whole valley for a field, not over columns xa .. xb (and a little either side): the plot, or null */
function iFarmSpot(g, xa, xb, p, rough) {
  var best = null, x0, G, r, pass;
  for (pass = rough ? 1 : 0; pass < 2 && !best; pass++) for (x0 = rLo(g, 4); x0 < rHi(g, I_FARM_W + 4); x0++) {   /* (in the village's range: world.js) */
    if (xa >= 0 && x0 + I_FARM_W + 3 >= xa && x0 - 3 <= xb) continue;
    if ((g.farmNo && g.farmNo[x0] > g.tick) || (p && p.farmNo && p.farmNo[x0] > g.tick)) continue;
    G = mGround(g, x0 + (I_FARM_W >> 1));
    if (G < 0 || !(r = iFarmPlot(g, x0, G - 1, pass === 1))) continue;   /* (flat first: then the lumpy, if that is all there is) */
    if (!best || r.work < best.work) { best = r; best.score = r.work; }
  }
  return best;
}
function iFarmPlot(g, x0, fy, loose) {
  var x1 = x0 + I_FARM_W - 1, gy = [], dig = [], lo = 1e9, hi = -1, x, y, c, k, G;
  /* (loose: lumpier ground will do, a field following the lie of the land, when there is no flat ground left at all) */
  var step = loose ? 2 : 1, lump = loose ? 4 : 2;
  if (x0 < 4 || x1 > g.gw - 5) return null;
  for (x = x0; x <= x1; x++) {
    G = bGround(g, x, fy);
    if (G < 0 || bMarked(g, x, G)) return null;
    c = pCell(g, x, G);
    if (c !== MAT.SAND && c !== MAT.ASH && c !== MAT.SOIL) return null;
    if (gy.length && Math.abs(G - gy[gy.length - 1]) > step) return null;
    gy.push(G); lo = Math.min(lo, G); hi = Math.max(hi, G);
  }
  if (hi - lo > lump) return null;
  for (k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (x1 + 3 >= s.x0 && x0 - 3 <= s.x1 && hi + 3 >= s.y0 && lo - 12 <= s.y1) return null;
  }
  for (y = lo - 12; y <= hi + 2; y++) for (x = x0 - 2; x <= x1 + 2; x++) {
    c = pCell(g, x, y);
    if (LIQUID[c] || HOT[c] || c === MAT.DRAIN || P_BANG[c]) return null;
  }
  /* open sky over it (a field under somebody's floor grows nothing), and bushes dug out */
  for (k = 0; k < I_FARM_W; k++) for (y = gy[k] - 12; y < gy[k]; y++) {
    c = pCell(g, x0 + k, y);
    if (AIRY[c]) continue;
    if (!B_DIG[c] || y < gy[k] - 6) return null;
    dig.push([x0 + k, y]);
  }
  dig.sort(function (a, b) { return a[1] - b[1]; });
  return { x0: x0, gy: gy, lo: lo, hi: hi, dig: dig, work: dig.length };
}
var I_RAID_NEWS = ["the ducks are eating the wheat", "the ducks are at the wheat again", "a duck is in the wheat",
  "the wheat is being eaten. by ducks"];
/* a duck had some of the wheat (from the bottom of the stalk: it is a duck). the rest of the stalk comes down, and
   spills its grain, as seed, for later. people will hear about this */
function iRaided(g, d, x, y) {
  var j, k;
  for (j = (y - 1) * g.gw + x; j >= 0 && (g.m[j] === MAT.CROP || g.m[j] === MAT.WHEAT); j -= g.gw) heatBecome(g, j, MAT.SEED);
  g.raids++;
  var p = null, bd = 70;
  for (k = 0; k < g.peasants.length; k++) {
    var q = g.peasants[k], dd = Math.abs(q.x - x) + Math.abs(q.y - y);
    if (!q.dead && q.state === "walk" && !q.sleep && dd < bd) { bd = dd; p = q; }
  }
  if (p && p.sayT <= 0 && Math.random() < 0.5) pSay(g, p, "raid", true);
  if (g.raids >= 3) iSpark(g, p, "scarecrow");
  if (g.tick > g.raidT) { g.raidT = g.tick + 3600; feed(g, pick(I_RAID_NEWS), "#ffd27a", "raid"); }
}

/* -------------------------------------------------------------------
   BUCKETS: put the fire out. or, on a quiet day, water the wheat (or fill a pond)
   ------------------------------------------------------------------- */
/* a field that could do with a drink: stalks still growing, nothing wet about it, nobody already watering it, and
   fresh water to be had */
function iGoWater(g, p) {
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k], w;
    if (s.kind !== "farm" || !s.done || Math.abs(s.cx - p.x) > 160 || iCrew(g, "bucket", s.id) || !iThirsty(g, s)) continue;
    if (!(w = iFindWater(g, p, 160, null, true, iBarred(g, null)))) return false;
    p.task = { kind: "bucket", field: s.id, t: 0, act: 0, w: w };
    return true;
  }
  return false;
}
/* the tops of the stalks still growing in a field, if none of them has water near it. else null */
function iThirsty(g, s) {
  var tips = [], k, e, x, y, c;
  if (lWetUnderGlass(g, s.x0)) return null;   /* (under glass it keeps its own damp: leftovers.js) */
  for (k = 0; k < s.plan.length; k++) {
    e = s.plan[k];
    if (e.v !== MAT.CROP) continue;
    x = e.i % g.gw;
    if (sandHas(g, x, (e.i / g.gw) | 0, MAT.WATER) >= 0) return null;   /* wet at the roots */
    for (y = (e.i / g.gw) | 0; y > 0 && (c = pCell(g, x, y)) === MAT.CROP; y--);
    if (c === MAT.WATER || sandHas(g, x, y + 1, MAT.WATER) >= 0) return null;
    if (c === MAT.EMPTY && pCell(g, x, y + 1) === MAT.CROP) tips.push({ x: x, y: y });
  }
  return tips.length >= 3 ? tips : null;
}
function iTaskBucket(g, p, k) {
  /* a puddle to bail (k.src): filled out of that, not out of the pond, and by the clock, not by this. the throwing is
     the same as any other bucket's (tidy.js) */
  var r = k.src ? tBailStep(g, p, k) : ++k.t > 4000 ? iDone(p, false) : undefined;
  if (r !== undefined) return r;
  var fx = Math.floor(p.x), fy = Math.floor(p.y), fresh = !!(k.field || k.pond), j;
  var pond = k.pond && bSite(g, k.pond);
  if (!p.pail) {
    /* nothing burning any more (or growing): done */
    if (k.site && !iBlazeOf(g, k.site)) { if (k.threw && p.sayT <= 0) pSay(g, p, "out"); return iDone(p, true); }
    if (k.field && (!bSite(g, k.field) || !iThirsty(g, bSite(g, k.field)))) return iDone(p, true);
    if (k.pond && (!pond || !iPondThirst(g, pond))) return iDone(p, true);
    var bar = k.site ? null : iBarred(g, pond);
    j = iScoopAt(g, fx, fy, fresh, bar);
    if (j >= 0 && !p.swimming && !LIQUID[pCell(g, fx, fy)] && iSafe(g, fx, fy)) {
      p.pose = (k.act >> 3) & 1 ? "eatB" : "stand"; p.dir = (j % g.gw) + 0.5 < p.x ? -1 : 1;
      if (++k.act === 16) { p.pail = iScoop(g, j, fresh); k.act = 0; k.best = null; if (p.sayT <= 0 && Math.random() < 0.3) pSay(g, p, "fill"); }
      return true;
    }
    if (!k.w || k.t % 120 === 0) k.w = iFindWater(g, p, 160, k.site && iBlazeOf(g, k.site), fresh, bar, !!pond) || k.w;
    if (!k.w) { if (p.sayT <= 0) pSay(g, p, "nowater"); return iDone(p, false); }
    /* (from the bank, with dry feet: not from the middle of the pond) */
    if (iWalk(g, p, k, "water" + k.w.x, k.w.x, k.w.y, function (x, y) { return navStand(g, x, y) === 1 && !LIQUID[pCell(g, x, y)] && iScoopAt(g, x, y, fresh, bar) >= 0 && iSafe(g, x, y); })) pGiveUp(g, p, k.w.x);
    return false;
  }
  /* bucket full, and somebody burning (out of the house, say): that comes first. run at them, and put it over them */
  var vic = iVictim(g, p);
  if (vic && !p.swimming) {
    p.dir = vic.x < p.x ? -1 : 1; k.act = 0;
    if (Math.abs(vic.x - p.x) < 3 && Math.abs(vic.y - p.y) < 6) { iDouse(g, p, vic); k.threw = true; return true; }
    return false;
  }
  /* bucket full: off to the fire (the nearest bit of it, looked for again now and then), or the thirstiest stalk */
  var tgt = k.last && k.aim > g.tick ? k.last : (k.site ? iBlazeTarget(g, k.site, p) : k.src ? tBailTarget(g, k) : (k.pond ? iPondTarget(g, pond) : iWaterTarget(g, k.field)));
  if (tgt !== k.last) k.aim = g.tick + 60;
  /* it went out on the way: thrown on for luck, if they are standing somewhere they could; else never mind */
  if (!tgt && k.last && iThrowFrom(g, fx, fy, k.last)) tgt = k.last;
  if (!tgt) { iSpill(g, p); if (k.site && p.sayT <= 0) pSay(g, p, "out"); return iDone(p, true); }
  k.last = tgt;
  /* (watering, or a puddle: from somewhere the bucket clears. thrown from indoors, it goes into the wall and comes down
     on the floor, which is where the next puddle comes from. a fire is another matter: anywhere it reaches will do) */
  var good = function (x, y) { return iThrowFrom(g, x, y, tgt) && (!!k.site || iClearArc(g, x, y, tgt, !!k.src)); };
  if (good(fx, fy) && !p.swimming) {
    p.dir = tgt.x + 0.5 < p.x ? -1 : 1;
    p.pose = ++k.act < 10 ? "hammerA" : "hammerB";
    if (k.act === 14) {
      iThrow(g, p, tgt);
      k.act = 0; k.best = null; k.threw = true;
      var s = k.site && bSite(g, k.site);
      if (s) s.doused = (s.doused || 0) + 1;
      k.aim = 0;
      if (p.sayT <= 0 && Math.random() < 0.4) pSay(g, p, k.site ? "douse" : k.src ? tBailSay(k) : (k.pond ? "pond" : "water"));
    }
    return true;
  }
  k.act = 0;
  var left = pathGo(g, p, "throw" + (k.site || k.field || k.pond || "bail"), tgt.x, tgt.y, good);
  /* no way they can see to anywhere good to throw from: closer, while it is cool enough; back off, if it is not */
  /* (a puddle: no way to anywhere it could be thrown from is no reason to wade into the lake after it: tidy.js) */
  if (left < 0 && !(k.src && tBailLost(k))) { var toward = tgt.x + 0.5 < p.x ? -1 : 1; p.dir = iSafe(g, fx, fy) ? toward : -toward; }
  if (pStuck(p, k, left > 0 ? left : Math.abs(tgt.x + 0.5 - p.x))) {
    /* (a puddle has somewhere else to try first: tidy.js) */
    if (k.src && tBailStuck(g, k, tgt, fx)) return false;
    iSpill(g, p); pGiveUp(g, p, tgt.x);
  }
  return false;
}
/* does a bucket thrown from feet at (x, y) clear everything on its way to t: the arc iThrow throws it on, every cell
   of it thin air (or leaves, or water), but for the last few, where it lands */
/* (leafy: a bush is in the way too. a bucket of water thrown into a bush half stays in it and drips back down: for a
   puddle on a floor, down outside the door, and back in. and the drops spread out a little as they go, upwards: iThrow,
   so the arc is looked along from a row or two higher too) */
function iClearArc(g, x, y, t, leafy) {
  var d = t.x + 0.5 < x + 0.5 ? -1 : 1, k, c, X, Y, up;
  function clear(c) { return AIRY[c] || LIQUID[c] || (!leafy && P_LEAF[c]); }
  /* (and from their hands to where it leaves the bucket: a door, a wall, right in front of them, is in the way too) */
  for (k = 1; k <= 2; k++) if (!clear(pCell(g, x + d * k, y - 8)) || !clear(pCell(g, x + d * k, y - 7))) return false;
  for (up = 0; up <= (leafy ? 2 : 0); up++) {
    var sx = x + 0.5 + d * 1.5, sy = y - 8 - up, dx = t.x + 0.5 - sx, dy = t.y + 0.5 - sy;
    var tf = clamp(Math.abs(dx) / 0.8, 10, 28), vx = dx / tf * 1.04, vy = Math.max(-3.4, (dy - 0.055 * tf * tf) / tf);
    for (k = 0; k < tf - 3; k++) {
      X = Math.floor(sx + vx * k); Y = Math.floor(sy + vy * k + 0.055 * k * k);
      if (Y >= 0 && !clear(pCell(g, X, Y))) return false;
    }
  }
  return true;
}
/* could they throw a bucket from feet at (x, y) at t: in range, and somewhere cool enough to stand */
function iThrowFrom(g, x, y, t) {
  var d = Math.abs(x - t.x);
  return d >= 5 && d <= 16 && t.y >= y - 16 && t.y <= y + 4 && iSafe(g, x, y);
}
/* a full bucket and no bucket job (they waded, or something better came up): they put it down. where they stand */
function iPail(g, p) {
  if (p.pail && !(p.task && (p.task.kind === "bucket" || p.task.kind === "pfill" || p.task.kind === "mix" || p.task.kind === "cbail"))) iSpill(g, p);   /* (pfill: a wonder's pool, or tank. pleasures.js. mix: for wet concrete, wonders.js. cbail: out of the crypt, monuments.js) */
}
/* somewhere to stand by a fire: nothing hot in it, under it or either side of it. the brigade is brave, not daft */
function iSafe(g, x, y) {
  if (navHazard(g, x, y)) return false;
  for (var dx = -2; dx <= 2; dx++) for (var dy = -8; dy <= 1; dy += 3) {
    var X = x + dx, Y = y + dy;
    if (X >= 0 && Y >= 0 && X < g.gw && Y < g.gh && (g.T[Y * g.gw + X] > 60 || HOT[g.m[Y * g.gw + X]])) return false;
  }
  return true;
}
function iBlazeOf(g, id) { for (var k = 0; k < g.blaze.length; k++) if (g.blaze[k].site === id) return g.blaze[k]; return null; }
/* the bit of the fire nearest p */
function iBlazeTarget(g, id, p) {
  var b = iBlazeOf(g, id), best = null, bd = 1e9, k, x, y, d;
  if (!b) return null;
  for (k = 0; k < b.cells.length; k++) {
    x = b.cells[k] % g.gw; y = (b.cells[k] / g.gw) | 0;
    d = Math.abs(x - p.x) + Math.abs(y - p.y) * 0.5;
    if (d < bd) { bd = d; best = { x: x, y: y }; }
  }
  return best;
}
function iWaterTarget(g, id) {
  var s = bSite(g, id), tips = s && iThirsty(g, s);
  return tips ? tips[(tips.length >> 1)] : null;
}
/* water for a bucket: either kind for a fire, only fresh for the wheat (salt water kills it) */
function iDrinkable(c, fresh) { return fresh ? c === MAT.WATER : WET[c] === 1; }
/* and for the wheat (or a pond), not boiling: nobody waters the wheat out of a hot pond (it would scald it, and a
   bucket of it thrown over somebody's porch light is how fires start). for a fire, anything wet will do */
function iCoolEnough(g, j, fresh) { return !fresh || g.T[j] < 60; }
/* a cell of water at the top of a pond, a step or two down from feet at (x, y) and no further off than an arm: its index,
   or -1. (not out of any of the ponds in bar) */
function iScoopAt(g, x, y, fresh, bar) {
  for (var d = 0; d <= 3; d++) for (var s = -1; s <= 1; s += 2) {
    var cx = x + d * s;
    if (bar && iPondAt(bar, cx)) { if (!d) break; continue; }
    for (var yy = y + 1; yy <= y + 4; yy++) {
      var c = pCell(g, cx, yy);
      if (iDrinkable(c, fresh) && yy > 0 && iCoolEnough(g, yy * g.gw + cx, fresh)) return yy * g.gw + cx;
      if (!AIRY[c]) break;
    }
    if (!d) break;
  }
  return -1;
}
/* the nearest top of some water, roughly at their level (fresh, if it is for the wheat). not under the fire (b), and
   not on the far side of it from them, through the flames. nor out of any of the ponds in bar (see iBarred). deep: only
   a pond's worth of water will do, not a puddle (a pond is filled from a pond) */
function iFindWater(g, p, R, b, fresh, bar, deep) {
  var fx = Math.floor(p.x), fy = Math.floor(p.y), d, s, x, y, c, k, b0 = 1e9, b1 = -1e9;
  if (b) for (k = 0; k < b.cells.length; k++) { x = b.cells[k] % g.gw; b0 = Math.min(b0, x); b1 = Math.max(b1, x); }
  for (d = 0; d <= R; d++) for (s = -1; s <= 1; s += 2) {
    x = fx + d * s;
    if (x < 1 || x > g.gw - 2 || (bar && iPondAt(bar, x)) || (b && ((x >= b0 && x <= b1) || (fx < b0 && x > b1) || (fx > b1 && x < b0)))) continue;
    for (y = Math.max(1, fy - 16); y <= fy + 24 && y < g.gh; y++) {
      c = g.m[y * g.gw + x];
      if (iDrinkable(c, fresh) && iCoolEnough(g, y * g.gw + x, fresh) && AIRY[g.m[(y - 1) * g.gw + x]] && (!deep || iDeep(g, x, y, fresh))) return { x: x, y: y - 1 };
      if (!AIRY[c] && !P_SOFT[c]) { if (y > fy) break; }
    }
    if (!d) break;
  }
  return null;
}
/* the ponds nobody takes water out of, for whatever they are doing. filling a pond (pond, or true for one not dug
   yet): none of them. a pond is filled from real water, never from another pond: two ponds filled out of each other
   would have the brigade carrying the same water back and forth between them for ever. watering the wheat: not any
   that is still short of water (that is for a fire, and nothing less). null for a fire */
function iBarred(g, pond) {
  var out = [], k, s;
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if ((s.kind === "pond" && (pond || iPondNeed(g, s) > I_POND_KEEP)) || s.bath) out.push(s);   /* (nobody fills a bucket from the baths: pleasures.js) */
  }
  return out;
}
/* is column x in (or at the edge of) one of these ponds */
function iPondAt(list, x) {
  for (var k = 0; k < list.length; k++) if (x >= list[k].x0 - 1 && x <= list[k].x1 + 1) return true;
  return false;
}
/* water at (x, y) that is a pond and not a puddle: more of it under and either side of it (what a pond is filled from) */
function iDeep(g, x, y, fresh) {
  return x > 0 && x < g.gw - 1 && y + 2 < g.gh && iDrinkable(g.m[(y + 1) * g.gw + x], fresh) && iDrinkable(g.m[(y + 2) * g.gw + x], fresh) &&
         iDrinkable(g.m[y * g.gw + x - 1], fresh) && iDrinkable(g.m[y * g.gw + x + 1], fresh);
}
/* fill the bucket: a few cells off the top of the pond, each with its heat, as a thrown grain carries its heat */
var I_DIP = [[0, 0], [-1, 0], [1, 0], [0, 1], [-2, 0], [2, 0], [-1, 1], [1, 1], [0, 2]];
function iScoop(g, j0, fresh) {
  var load = [], gw = g.gw, x0 = j0 % gw, y0 = (j0 / gw) | 0, k, j, x, y;
  for (k = 0; k < I_DIP.length && load.length < I_LOAD; k++) {
    x = x0 + I_DIP[k][0]; y = y0 + I_DIP[k][1]; j = y * gw + x;
    if (x < 0 || x >= gw || y >= g.gh || !iDrinkable(g.m[j], fresh) || !iCoolEnough(g, j, fresh)) continue;
    heatSync(g, j);
    load.push({ m: g.m[j], sh: g.sh[j], q: heatQ(g, j) });
    g.m[j] = MAT.EMPTY; g.aux[j] = 0; g.T[j] = AMBIENT; g.lat[j] = 0;
    heatAccept(g, j);
  }
  return load.length ? load : null;
}
/* throw it: an arc from their hands that comes down on (t.x, t.y). each cell flies as a grain of itself */
function iThrow(g, p, t) {
  var load = p.pail;
  p.pail = null;
  var sx = p.x + p.dir * 1.5, sy = p.y - 8, dx = t.x + 0.5 - sx, dy = t.y + 0.5 - sy;
  /* (flight time from how far it has to go; a grain falls 0.11 a tick faster every tick, and drags a little) */
  var tf = clamp(Math.abs(dx) / 0.8, 10, 28), vx = dx / tf * 1.04, vy = Math.max(-3.4, (dy - 0.055 * tf * tf) / tf);
  for (var k = 0; k < load.length; k++) {
    var c = load[k], q = partAdd(g, PK_DEBRIS, sx, sy - k * 0.5, vx * (0.95 + 0.05 * k), vy, 240, SAND_PAL[c.m][c.sh], c.m);
    if (q < 0) { (p.pail = p.pail || []).push(c); continue; }   /* (no room in the air: it stays in the bucket) */
    g.pt[q] = c.q; g.ps[q] = c.sh;
  }
  g.fx.splash++;
}
/* a bucket emptied where they stand: each cell of it into the nearest bit of air in front of them, with its heat (and
   the heat of the air it pushes out). whatever finds no room stays in the bucket; unless they are dying (buried, say),
   when it goes in the first air above them */
function iSpill(g, p, dying, cx, cy) {
  var load = p.pail, fx = cx == null ? Math.floor(p.x) + p.dir : cx, fy = cy == null ? Math.floor(p.y) - 1 : cy, k, r, j, x, y, left = [];
  if (!load) return;
  for (k = 0; k < load.length; k++) {
    for (r = 0, j = -1; r < 5 && j < 0; r++) for (y = fy - r; y <= fy && j < 0; y++) for (x = fx - r; x <= fx + r && j < 0; x++) {
      if (x >= 0 && y >= 0 && x < g.gw && y < g.gh && AIRY[g.m[y * g.gw + x]]) j = y * g.gw + x;
    }
    /* (dying, buried: the first air straight up from them, however far) */
    for (y = fy - 5; dying && j < 0 && y >= 0; y--) if (AIRY[pCell(g, fx - p.dir, y)]) j = y * g.gw + fx - p.dir;
    if (j < 0) { left.push(load[k]); continue; }
    var qa = heatQ(g, j);
    g.m[j] = load[k].m; g.aux[j] = 0; g.sh[j] = load[k].sh; g.vy[j] = 0;
    heatSetQ(g, j, qa + load[k].q);
  }
  p.pail = left.length ? left : null;
  wSpilt(g, p, fx, fy);   /* (a bucket spilt at the furnace: wonders.js) */
}

/* -------------------------------------------------------------------
   PONDS: a bowl in the sand beside a house or a field that is a long way from water, dug (it takes no wood) and then
   filled, a bucketful at a time, from the nearest water there is. the sides slope in one step to the cell, which is as
   steep as sand will stand, down to a level floor three cells below the waterline
   ------------------------------------------------------------------- */
/* a house or a field that a pond would do some good: done, and no water a bucket could be filled from (fresh, for a
   field: salt water kills the wheat) anywhere near it, and no pond of theirs, dug or being dug, to be filled. (water
   sealed in a cave under them, or a puddle, is no use to anybody with a bucket.) and real water somewhere that a bucket
   could be carried from: not another pond (iBarred) */
function iPondFor(g, p) {
  var best = null, bd = 220, k, j, s, d, has;
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if ((s.kind !== "house" && s.kind !== "farm") || !s.done || s.repair) continue;
    d = Math.abs(s.cx - p.x);
    if (d >= bd) continue;
    for (j = 0, has = false; j < g.sites.length; j++) if (g.sites[j].kind === "pond" && (g.sites[j].serves === s.id || Math.abs(g.sites[j].cx - s.cx) < I_POND_NEAR)) has = true;
    /* (the water to fill it from has to be what a bucket can be filled from, the same as when they come to do it) */
    var at = { x: s.cx, y: s.y1 - 1 };
    if (has || iWaterNear(g, at, I_POND_NEAR, s.kind === "farm") || !iFindWater(g, at, 160, null, true, iBarred(g, true), true)) continue;
    bd = d; best = s;
  }
  return best;
}
/* is there water near at (R columns either way) that a bucket can be filled from, again and again: a pond's worth, or a
   broad stream, shallow as it may be. not a puddle (tidy.js), which is one bucketful and gone, and not water sealed
   in a cave under the floor. (fresh only, for a field: salt water kills the wheat) */
function iWaterNear(g, at, R, fresh) {
  if (iFindWater(g, at, R, null, fresh, null, true)) return true;
  var w = iFindWater(g, at, R, null, fresh, null, false);
  return !!w && !tPuddleOf(g, w.x, w.y + 1);
}
/* a pond for somewhere that wants one: one at a time, and not more than three in the valley */
function iPlanPond(g, p) {
  var k, s = iPondFor(g, p), d, sd, r = null, x0, fy, plan = [], y0 = 1e9;
  for (k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "pond" && !g.sites[k].done) return false;
  if (!s || iCount(g, "pond") >= 3) return false;
  fy = Math.floor(s.y1);
  for (d = 0; d <= 34 && !r; d++) for (sd = -1; sd <= 1 && !r; sd += 2) {
    x0 = sd > 0 ? s.x1 + 3 + d : s.x0 - 3 - d - (I_POND_W - 1);
    if (iPondNo(g, x0)) continue;
    r = iPondPlot(g, x0, fy);
  }
  if (!r) return false;
  for (k = 0; k < r.dig.length; k++) y0 = Math.min(y0, r.dig[k][1]);
  for (k = 0; k < r.dig.length; k++) plan.push(bE(g, r.dig[k][0], r.dig[k][1], MAT.EMPTY, r.dig[k][1] - y0));
  for (k = 0; k < plan.length; k++) plan[k].dry = true;   /* (a cell with water over it is not dug: build.js bFree) */
  var site = bNew(g, "pond", p, plan, [r.bx0, y0, r.bx1, r.L + I_POND_D], { free: true, L: r.L, S: r.S, px0: r.x0, serves: s.id });
  feed(g, p.name + " is digging a pond", "#a8e08a", "plan" + site.id);
  pSay(g, p, "planPond", true);
  bJoin(g, p, site);
  return true;
}
/* is (x0 .. x0 + I_POND_W - 1) where a pond was given up lately (nobody could get to it: build.js bFail) */
function iPondNo(g, x0) {
  if (!g.pondNo) return false;
  for (var x = x0 >> 2; x <= (x0 + I_POND_W - 1) >> 2; x++) if (g.pondNo[x] > g.tick) return true;
  return false;
}
/* is (x0 .. x0 + I_POND_W - 1) a place for a pond, near row fy: sand, with clear sky over it and a solid floor under
   it, nobody else's site, nothing hot or wet about. the water comes up to the row under the highest-up bit of the
   lowest ground in it (the banks outside hold it in), and the bowl goes down as far as the sand does: the sand is only
   five deep, so on a slope the uphill end of the bowl is dug to the stone and stays dry. wherever the ground is higher
   than the bowl wants to be, it is dug back in steps of one cell, which is as steep as sand will stand: nothing slumps.
   {x0, L (the waterline), S (the top of the floor, column by column across the pond), dig (every cell to shift), bx0,
   bx1 (all of it, banks and all)} or null */
function iPondPlot(g, x0, fy) {
  var W = I_POND_W, x1 = x0 + W - 1, gy = {}, hi = -1, x, y, k, c, G, L, S = [], dig = [], vol = 0, bx0 = x0, bx1 = x1;
  if (x0 < 16 || x1 > g.gw - 17) return null;
  /* (not on a pile of loose sand somebody tipped out: it slides back into the bowl as fast as it is dug. tidy.js) */
  for (x = x0 - 3; x <= x1 + 3; x++) if (tByLump(g, x, null, 3)) return null;
  /* the ground under column x (-1: not ground a pond can go on) */
  function ground(x) {
    if (gy[x] != null) return gy[x];
    var G = bGround(g, x, fy), c = G < 0 ? 0 : pCell(g, x, G);
    return (gy[x] = (G < 0 || Math.abs(G - fy) > 12 || bMarked(g, x, G) || (c !== MAT.SAND && c !== MAT.ASH)) ? -1 : G);
  }
  /* the top of the floor, for a column x (the pond is x0 .. x1, and the banks go out from there a cell at a time) */
  function floor(x) {
    var G = gy[x], j, off, c = x - x0;
    if (x >= x0 && x <= x1) { off = Math.min(c, W - 1 - c, I_POND_D); return Math.min(L + off, G + 5); }
    j = x < x0 ? x0 - x : x - x1;
    return Math.min(Math.max(G, L - j), G + 5);
  }
  for (x = x0; x <= x1; x++) {
    G = ground(x);
    if (G < 0 || (x > x0 && Math.abs(G - gy[x - 1]) > 1)) return null;
    hi = Math.max(hi, G);
  }
  L = hi + 1;
  /* the banks: out from either edge until the ground is no higher than the bank wants to be */
  for (x = x0 - 1; ; x--) {
    if (x < x0 - 14 || ground(x) < 0 || Math.abs(gy[x] - gy[x + 1]) > 1) return null;
    if (floor(x) <= gy[x]) break;
    bx0 = x;
  }
  for (x = x1 + 1; ; x++) {
    if (x > x1 + 14 || ground(x) < 0 || Math.abs(gy[x] - gy[x - 1]) > 1) return null;
    if (floor(x) <= gy[x]) break;
    bx1 = x;
  }
  /* (and the ground beyond the last of them must not be below the water) */
  if (gy[bx0 - 1] > L || gy[bx1 + 1] > L) return null;
  for (k = 0; k < g.sites.length; k++) {
    var t = g.sites[k], pad = t.mine ? 12 : 3;   /* (well away from the head of a mine: water finds its way down a hole) */
    if (bx1 + pad >= t.x0 && bx0 - pad <= t.x1 && hi + 5 >= t.y0 && hi - 18 <= t.y1) return null;
  }
  for (y = hi - 14; y <= hi + 6; y++) for (x = bx0 - 2; x <= bx1 + 2; x++) {
    c = pCell(g, x, y);
    if (LIQUID[c] || HOT[c] || c === MAT.DRAIN || P_BANG[c]) return null;
  }
  for (x = bx0; x <= bx1; x++) {
    G = gy[x]; var T = floor(x);
    if (x >= x0 && x <= x1) { S[x - x0] = T; vol += Math.max(0, T - L); }
    /* sky over it (bushes are dug out) */
    for (y = G - 12; y < G; y++) {
      c = pCell(g, x, y);
      if (AIRY[c]) continue;
      if (!B_DIG[c] || y < G - 6 || bMarked(g, x, y)) return null;
      dig.push([x, y]);
    }
    /* the bowl and the banks: nothing but sand to shift, and something solid under it (to hold the water) */
    for (y = G; y < T; y++) {
      if (!B_DIG[pCell(g, x, y)] || bMarked(g, x, y)) return null;
      dig.push([x, y]);
    }
    if (!pSolid(g, x, T) || !pSolid(g, x, T + 1) || LIQUID[pCell(g, x, T)]) return null;
  }
  if (vol < 18 || dig.length > 170) return null;
  return { x0: x0, L: L, S: S, dig: dig, bx0: bx0, bx1: bx1, vol: vol };
}
/* how many cells of a pond are short of water: the dry cells between the waterline and the floor */
function iPondNeed(g, s) {
  if (s.bath) return wBathNeed(g, s);   /* (the baths are filled the way a pond is: pleasures.js) */
  var n = 0, k, y;
  for (k = 0; k < I_POND_W; k++) for (y = s.L; y < s.S[k]; y++) if (AIRY[pCell(g, s.px0 + k, y)]) n++;
  return n;
}
/* a pond that could do with filling: dug (or fixed), and a bucketful or more short. (the first time it is full, that is
   the news) */
function iPondThirst(g, s) {
  if (!s.done || s.repair) return false;
  if (iPondNeed(g, s) > 3) return true;
  if (!s.full) {
    s.full = true;
    if (s.bath) { feed(g, "the baths are full. now somebody has to light the fire under them", "#9ad0ff", "plan" + s.id); return false; }
    feed(g, "the pond is full. nobody has to run for water now", "#9ad0ff", "plan" + s.id);
    achieve(g, "pond");
    var q = pOther(g, { x: s.cx, y: s.y0 }, 60);
    if (q && q.sayT <= 0 && !q.sleep) pSay(g, q, "pondFull", true);
  }
  return false;
}
/* where a bucket for the pond goes: over the middle of it, onto the water (or the floor, while there is none) */
function iPondTarget(g, s) {
  return s && iPondThirst(g, s) ? { x: s.px0 + (s.bath ? 4 : I_POND_W >> 1), y: s.L } : null;
}
/* off to fill a pond that wants it, from the nearest water not in it */
function iGoFillPond(g, p) {
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k], w;
    if (s.kind !== "pond" || Math.abs(s.cx - p.x) > 200 || iCrew(g, "bucket", s.id) >= I_POND_CREW || !iPondThirst(g, s)) continue;
    if (!(w = iFindWater(g, p, 160, null, true, iBarred(g, s), true))) continue;
    p.task = { kind: "bucket", pond: s.id, t: 0, act: 0, w: w };
    return true;
  }
  return false;
}

/* -------------------------------------------------------------------
   SHOOING: a duck in the wheat gets run at, by somebody waving their arms, until it takes off
   ------------------------------------------------------------------- */
/* a field with wheat growing in it (or a sprout, which is as good) */
function iCropped(g, s) {
  for (var k = 0; k < s.plan.length; k++) {
    var e = s.plan[k];
    if (e.v === MAT.CROP && (g.m[e.i] === MAT.CROP || g.m[e.i] === MAT.WHEAT)) return true;
  }
  return false;
}
/* ducks that are on a field of wheat (not in the pond, not in the air, not under a scarecrow, which does the job itself) */
function iPests(g) {
  var out = [], k, j, d, s, fields = [];
  for (k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "farm" && iCropped(g, g.sites[k])) fields.push(g.sites[k]);
  if (!fields.length) return out;
  for (j = 0; j < g.ducks.length; j++) {
    d = g.ducks[j];
    if (d.dead || d.state !== "walk" || d.baby) continue;
    for (k = 0; k < fields.length; k++) {
      s = fields[k];
      if (d.x >= s.x0 - 4 && d.x <= s.x1 + 5 && d.y >= s.y0 - 2 && d.y <= s.y1 + 3 && !iScarecrowNear(g, d.x, d.y)) { out.push(d); break; }
    }
  }
  return out;
}
/* is anybody already after this duck */
function iChased(g, d) {
  for (var k = 0; k < g.peasants.length; k++) { var t = g.peasants[k].task; if (t && t.kind === "shoo" && t.duck === d) return true; }
  return false;
}
/* could p go and chase a duck off: awake, calm, fed, and not carrying anything or in the middle of anything important */
function iCanShoo(g, p, k) {
  return !p.dead && p.state === "walk" && !p.sleep && !p.climb && !p.rope && !p.swimming && !p.fire && p.panic <= 0 && p.cold < 150 &&
         !p.pail && !p.hold && p.hunger < P_HUNGRY * 2 && (!k || I_FUN[k.kind]);
}
function iShooTask(p, d) { p.task = { kind: "shoo", duck: d, t: 0, act: 0, near: 0 }; }
/* an idle peasant looking for something to do: the nearest duck in the wheat that nobody is chasing */
function iGoShoo(g, p) {
  var best = null, bd = I_SHOO_R, k, ps = iPests(g), d, dd;
  for (k = 0; k < ps.length; k++) {
    d = ps[k]; dd = Math.abs(d.x - p.x) + Math.abs(d.y - p.y);
    if (dd < bd && !iChased(g, d)) { bd = dd; best = d; }
  }
  if (!best || !iCanShoo(g, p, null)) return false;
  iShooTask(p, best);
  if (p.sayT <= 0 && Math.random() < 0.5) pSay(g, p, "shoo");
  return true;
}
/* every few seconds: each duck in the wheat that nobody is after gets the nearest peasant who is only doing
   something for fun (or nothing) */
function iShooAlarm(g) {
  var ps = iPests(g), k, j, d, p, best, bd, dd;
  for (k = 0; k < ps.length; k++) {
    d = ps[k];
    if (iChased(g, d)) continue;
    best = null; bd = I_SHOO_R;
    for (j = 0; j < g.peasants.length; j++) {
      p = g.peasants[j];
      dd = Math.abs(d.x - p.x) + Math.abs(d.y - p.y);
      if (dd < bd && iCanShoo(g, p, p.task)) { bd = dd; best = p; }
    }
    if (!best) continue;
    iShooTask(best, d);
    best.idle = 0; best.taskCD = 0;
    if (best.sayT <= 0 && Math.random() < 0.5) pSay(g, best, "shoo");
  }
}
function iTaskShoo(g, p, k) {
  var d = k.duck;
  /* gone: flew off, was caught, got picked up, or has waddled out of the wheat on its own */
  if (++k.t > 900 || !d || d.dead || d.state !== "walk" || p.pail) {
    if (d && !d.dead && d.state === "fly" && k.near) {
      if (p.sayT <= 0 && Math.random() < 0.6) pSay(g, p, "shooed");
      achieve(g, "shoo"); p.bored = Math.max(0, p.bored - 300);
      if (g.raids >= 40) pShooed(g, p);   /* (if you can't beat them, house them: pleasures.js) */
      return iDone(p, true);
    }
    return iDone(p, false);
  }
  var dx = d.x - p.x, dy = d.y - p.y, near = Math.abs(dx) < 6 && Math.abs(dy) < 8;
  if (!near) {
    k.act = 0;
    if (iWalk(g, p, k, "shoo" + (d.id) + ":" + (Math.floor(d.x / 4)), Math.floor(d.x), Math.floor(d.y), pathNear(Math.floor(d.x), Math.floor(d.y), 4, 8, 8))) pGiveUp(g, p, Math.floor(d.x));
    return false;
  }
  /* at it: arms going, running at it. then it takes off, the other way */
  p.dir = dx < 0 ? -1 : 1; p.idle = 0; k.near = 1;
  p.pose = (k.act >> 2) & 1 ? "hammerA" : "hammerB";
  if (Math.abs(dx) > 3) { k.act++; return false; }   /* (a few steps closer first) */
  if (++k.act > 14) { d.dir = d.x < p.x ? -1 : 1; dTakeOff(g, d, true); k.act = 0; }
  return true;
}

/* -------------------------------------------------------------------
   FISHING: a jetty, and a rod off the end of it
   ------------------------------------------------------------------- */
/* somewhere for a jetty: a bank, then a deck row with (after a step or three of boardwalk over the shore) open water
   under it for at least seven cells, so it can go well out without reaching the far side. {x, y, dir, len} or null */
function iJettySpot(g, p, R) {
  var fx = Math.floor(p.x), fy = Math.floor(p.y), d, s, x, G, dir, dy, r;
  for (d = 0; d <= R; d++) for (s = -1; s <= 1; s += 2) {
    x = fx + d * s;
    if (x < 3 || x > g.gw - 4) continue;
    G = bGround(g, x, fy);
    if (G < 0 || !pSolid(g, x, G) || bMarked(g, x, G) || WOODY[pCell(g, x, G)]) continue;
    for (dir = -1; dir <= 1; dir += 2) for (dy = 0; dy <= 2; dy++) if ((r = iJettyRun(g, x, G - dy, dir))) return r;
    if (!d) break;
  }
  return null;
}
function iJettyRun(g, x, row, dir) {
  var i, c, y, wet = 0, dry = 0, len;
  for (i = 1; i <= 40; i++) {
    c = x + dir * i;
    if (c < 2 || c > g.gw - 3 || !AIRY[pCell(g, c, row)]) break;
    for (y = row - 9; y < row; y++) if (!AIRY[pCell(g, c, y)]) break;
    if (y < row) break;
    for (y = row + 1; y <= row + 6 && AIRY[pCell(g, c, y)]; y++);
    if (WET[pCell(g, c, y)]) wet++;
    else if (!wet && dry < 3 && SOLID[pCell(g, c, y)]) dry++;
    else break;
  }
  if (wet < 7) return null;
  len = dry + Math.min(10, wet - 3);
  if (bSiteAround(g, x + dir * (len >> 1), row, "jetty", 40) || bSiteAround(g, x + dir, row, null, 2)) return null;
  return { x: x, y: row, dir: dir, len: len };
}
function iPlanJetty(g, p) {
  if (iCount(g, "jetty") >= 2) return false;
  var j = iJettySpot(g, p, 160), plan = [], k;
  if (!j) { p.planCD = 1500; return false; }
  for (k = 1; k <= j.len; k++) plan.push(bE(g, j.x + j.dir * k, j.y, MAT.PLANK, 2 + k));
  var xa = j.x + j.dir, xb = j.x + j.dir * j.len;
  var s = bNew(g, "jetty", p, plan, [Math.min(xa, xb), j.y, Math.max(xa, xb), j.y], { end: xb, dir: j.dir, deck: j.y });
  feed(g, p.name + " is building a jetty", "#a8e08a", "plan" + s.id);
  pSay(g, p, "planJetty", true);
  if (bWood(p) > 0.3) bJoin(g, p, s);
  return true;
}
/* off to the end of a jetty (or a little way back along it, if somebody has the end) */
function iGoFish(g, p) {
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (s.kind !== "jetty" || !s.done || Math.abs(s.cx - p.x) > 220) continue;
    for (var spot = 0; spot < 2; spot++) {
      var taken = false;
      for (var j = 0; j < g.peasants.length; j++) { var t = g.peasants[j].task; if (t && t.kind === "fish" && t.site === s.id && t.spot === spot) taken = true; }
      if (!taken) { p.task = { kind: "fish", site: s.id, spot: spot, t: 0, act: 0, n: 0, bob: null }; return true; }
    }
  }
  return false;
}
function iTaskFish(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || !s.done || ++k.t > 5000) return iDone(p, false);
  var sx = s.end - s.dir * k.spot * 3, sy = s.deck - 1, fx = Math.floor(p.x), fy = Math.floor(p.y);
  if (Math.abs(p.x - sx - 0.5) > 0.6 || fy !== sy) {
    k.bob = null;
    if (Math.abs(p.x - sx - 0.5) <= 1 && fy === sy) { p.dir = sx + 0.5 < p.x ? -1 : 1; return false; }
    if (iWalk(g, p, k, "fish" + s.id + ":" + k.spot, sx, sy, function (x, y) { return x === sx && y === sy; })) pGiveUp(g, p, sx);
    return false;
  }
  p.dir = s.dir; p.idle = 0; k.act++;
  if (!k.bob) {
    /* cast: out past the end, onto the top of the water */
    var bx = s.end + s.dir * (5 + irnd(4)), by = iSurface(g, bx, s.deck);
    if (by === -1) { bx = s.end + s.dir * 2; by = iSurface(g, bx, s.deck); }   /* (a small pond: drop it in close) */
    if (by < 0) { pSay(g, p, by === -2 ? "frozen" : "nofish", true); return iDone(p, false); }
    k.bob = { x: bx, y: by }; k.wait = 300 + irnd(900); k.tug = 0;
    if (p.sayT <= 0 && Math.random() < 0.5) pSay(g, p, "cast");
    return true;
  }
  /* the bobber rides the water: if the water is gone (or frozen) from under it, reel in */
  if (k.act % 30 === 0) { var ny = iSurface(g, k.bob.x, s.deck); if (ny < 0) { k.bob = null; return true; } k.bob.y = ny; }
  if (k.wait > 0) { if (--k.wait === 90 && p.sayT <= 0 && Math.random() < 0.4) pSay(g, p, "nibble"); return true; }
  if (!k.tug) { k.tug = 45; return true; }
  if (--k.tug > 0) return true;
  iCatch(g, p, k);
  k.bob = null; k.n++;
  if (k.n >= 3 || (p.hunger < 400 && p.bored < 400)) return iDone(p, true);
  return true;
}
/* the top of the water below (x, row): its row, -2 if it is iced over, -1 if there is no water there at all */
function iSurface(g, x, row) {
  for (var y = row + 1; y <= row + 8; y++) {
    var c = pCell(g, x, y);
    if (WET[c]) return y;
    if (c === MAT.ICE) return -2;
    if (!AIRY[c]) return -1;
  }
  return -1;
}
var I_DUCK_NEWS = ["{n} caught a duck. by accident. it is fine", "{n} hooked a duck. the duck has questions",
  "{n} went fishing and caught a duck. the duck is not amused"];
/* what is on the end of the line */
function iCatch(g, p, k) {
  var b = k.bob, j = b.y * g.gw + b.x, r = Math.random(), d = null, q;
  for (q = 0; q < g.ducks.length; q++) {
    var dk = g.ducks[q];
    if (!dk.dead && Math.abs(dk.x - b.x) < 4 && Math.abs(dk.y - b.y) < 4) d = dk;
  }
  if (d && r < 0.3) {
    pSay(g, p, "duckbite", true); dTakeOff(g, d, true); dSay(g, d, "quack", true);
    feed(g, pick(I_DUCK_NEWS).replace("{n}", p.name), "#ffd27a", "fish");
    return;
  }
  if (r < 0.1) { pSay(g, p, "boot", true); iLand(g, p, b, [hex32("#4a3a2a"), hex32("#2a1e14")]); return; }
  var cooked = g.T[j] > 60, lb = 1 + irnd(r > 0.9 ? 12 : 6);
  pSay(g, p, cooked ? "cooked" : "fish", true);
  iLand(g, p, b, cooked ? [hex32("#e0a070"), hex32("#c88050")] : [hex32("#c8d4e0"), hex32("#8aa0b8"), hex32("#f0a040")]);
  /* (salted and kept for later, on a full stomach with salt about them: leftovers.js) */
  if (cooked || !lSaltFish(g, p)) p.hunger = Math.max(0, p.hunger - 1400);
  p.bored = Math.max(0, p.bored - 600);
  /* the news: the first fish, a cooked one, and the big ones */
  if (lb >= 8 || cooked || !g.got.fish) feed(g, p.name + " caught a " + (cooked ? "cooked " : "") + lb + "-pound fish", "#9ad0ff", "fish");
  achieve(g, "fish");
  g.fx.splash++;
}
/* the catch, flying in on the end of the line */
function iLand(g, p, b, cols) {
  var dx = p.x - b.x - 0.5, dy = (p.y - 6) - b.y;
  for (var k = 0; k < 4; k++) partAdd(g, PK_GLINT, b.x + 0.5, b.y - 0.5, dx / 22 + (Math.random() - 0.5) * 0.06, dy / 22 - 0.35, 22 + irnd(4), cols[k % cols.length]);
}

/* -------------------------------------------------------------------
   LANTERNS: one on a bracket by each door of their house
   ------------------------------------------------------------------- */
/* a lantern for each door of their house (each its own little site), that does not have one yet */
function iPlanLamp(g, p) {
  var h = bHome(g, p), k, side, s = null, has = {};
  if (!h || !h.done || h.repair || h.lampT > g.tick) return false;
  for (k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "lamp" && g.sites[k].home === h.id) has[g.sites[k].side] = 1;
  for (side = -1; side <= 1; side += 2) {
    if (has[side]) continue;
    var wx = side < 0 ? h.x0 : h.x1, bx = wx + side;
    /* the bracket comes out of the wall over the door, the lantern hangs under it: well above anybody's head */
    for (var r = h.F - 11; r >= h.y0; r--) {
      if (pSolid(g, wx, r) && AIRY[pCell(g, bx, r)] && AIRY[pCell(g, bx, r + 1)] && !bMarked(g, bx, r) && !bMarked(g, bx, r + 1)) {
        s = bNew(g, "lamp", p, [bE(g, bx, r, MAT.PLANK, 1), bE(g, bx, r + 1, MAT.LAMP, 2)], [bx, r, bx, r + 1], { home: h.id, side: side, who: h.who });
        break;
      }
    }
  }
  if (!s) { h.lampT = g.tick + 6000; return false; }   /* nowhere (else) to hang one: try again another day */
  feed(g, p.name + " is putting up lanterns", "#a8e08a", "plan" + s.id);
  pSay(g, p, "planLamp", true);
  if (bWood(p) > 0.3) bJoin(g, p, s);
  return true;
}

/* -------------------------------------------------------------------
   GRAVES: a wooden cross for everybody who died, in a row
   ------------------------------------------------------------------- */
/* somebody died. what it will say on the cross is how */
function iMourn(g, p, line) {
  g.dead.push({ name: p.name, note: line.replace("{n}", pTitle(iShort(p.name))), site: 0 });
  if (g.dead.length > 30) g.dead.shift();
  iSpark(g, pOther(g, p, 80), "grave");
}
/* somebody dead with no cross, and no cross going up already */
function iGraveDue(g) {
  for (var k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "grave" && !g.sites[k].done) return false;
  for (k = 0; k < g.dead.length; k++) if (iGraveOwed(g, g.dead[k])) return true;
  return false;
}
/* d has no cross (and never had one that weathered away: -1) */
function iGraveOwed(g, d) { return d.site !== -1 && (!d.site || !bSite(g, d.site)); }
/* the crosses, oldest first */
function iGraves(g) { return g.sites.filter(function (s) { return s.kind === "grave"; }).sort(function (a, b) { return a.id - b.id; }); }
/* the oldest cross, gone: rotted down to nothing, and a flower where it stood (unless the new one goes there). whoever
   it was for is let go: nobody puts it back */
function iWeather(g, s, flower) {
  var k = g.sites.indexOf(s), x = Math.round(s.cx - 0.5), j;
  if (k < 0) return;
  bRemove(g, k);
  for (j = 0; j < s.plan.length; j++) if (g.m[s.plan[j].i] === MAT.WOOD && !heatTaken(g, s.plan[j].i)) sandSet(g, s.plan[j].i, MAT.EMPTY);
  for (j = 0; j < g.dead.length; j++) if (g.dead[j].site === s.id) g.dead[j].site = -1;
  feed(g, "the cross for " + iName(s.of) + " has weathered away", "#c8d0dc");
  wSpark(g, pOther(g, { x: s.cx, y: s.y1 }, 60), "cathedral");   /* (whoever was at the graveyard when it went: monuments.js) */
  j = s.y1 * g.gw + x;
  if (flower && g.m[j] === MAT.EMPTY && pSolid(g, x, s.y1 + 1)) { sandSet(g, j, MAT.FLOWER); g.sh[j] = irnd(42) * 6 + 1 + irnd(5); }
}
/* a graveyard grown past I_GRAVE_MAX (a village from before there was one): the oldest go, one at a time */
function iGraveyardStep(g) {
  var L = iGraves(g);
  if (L.length > I_GRAVE_MAX) iWeather(g, L[0], true);
}
function iName(n) { return n.toLowerCase().replace(/(^|\s)\S/g, function (c) { return c.toUpperCase(); }); }
function iPlanGrave(g, p) {
  var d = null, k;
  for (k = 0; k < g.dead.length && !d; k++) if (iGraveOwed(g, g.dead[k])) d = g.dead[k];
  if (!d) return false;
  var L = iGraves(g), slot = L.length < I_GRAVE_MAX ? iGraveSlot(g, p) : null;
  /* the graveyard is full, or has no room left anywhere near it: the oldest cross has weathered away, and the new one
     goes where it stood. one graveyard, never a cross on every hill */
  if (L.length && (!slot || Math.abs(slot.x - L[0].cx) > I_GRAVE_NEAR)) {
    var o = L[0], ox = Math.round(o.cx - 0.5), oy = o.y1;
    iWeather(g, o, false);
    slot = iGraveOk(g, ox, oy) || iGraveSlot(g, p);
  }
  if (!slot) { p.planCD = 1200; g.graveT = g.tick + 300; iNoRoom(g, "a cross for " + iName(d.name)); return false; }
  var x = slot.x, G = slot.y, plan = [];
  plan.push(bE(g, x, G - 1, MAT.WOOD, 10), bE(g, x, G - 2, MAT.WOOD, 11), bE(g, x, G - 3, MAT.WOOD, 12),
            bE(g, x - 1, G - 3, MAT.WOOD, 13), bE(g, x + 1, G - 3, MAT.WOOD, 13), bE(g, x, G - 4, MAT.WOOD, 13));
  var s = bNew(g, "grave", p, plan, [x - 1, G - 4, x + 1, G - 1], { of: d.name, note: d.note });
  d.site = s.id;
  feed(g, p.name + " is making a cross for " + d.name, "#c8d0dc", "plan" + s.id);
  pSay(g, p, pick(P_SAY.planGrave).replace("{d}", pTitle(iShort(d.name))), true);
  if (bWood(p) > 0.3) bJoin(g, p, s);
  return true;
}
/* the short of a name: "KING ALFRED THE BRAVE" is Alfred */
function iShort(n) {
  for (var k = 0; k < P_NAMES.length; k++) if ((" " + n + " ").indexOf(" " + P_NAMES[k] + " ") >= 0) return P_NAMES[k];
  return n.split(" ")[0];
}
/* where the next cross goes: next to one already up, if there is room; else the nearest level ground to the oldest of
   them (so the graveyard stays where it was started, and does not wander off a cross at a time); else (the first one)
   near p. somewhere a little out of the way of the houses, if it can be */
function iGraveSlot(g, p) {
  var k, s, d, sd, x, r, first = null, pass;
  for (k = g.sites.length - 1; k >= 0; k--) {
    s = g.sites[k];
    if (s.kind !== "grave") continue;
    for (sd = -1; sd <= 1; sd += 2) if ((r = iGraveOk(g, Math.round(s.cx - 0.5) + sd * I_GRAVE_GAP, s.y1))) return r;
    first = s;
  }
  var fx = first ? Math.round(first.cx - 0.5) : Math.floor(p.x), fy = first ? first.y1 : Math.floor(p.y);
  for (pass = 0; pass < 2; pass++) for (d = first ? 1 : 8; d <= 200; d++) for (sd = -1; sd <= 1; sd += 2) {
    x = fx + d * sd;
    if ((r = iGraveOk(g, x, fy)) && (pass || !iNearHouse(g, x, r.y, 5))) return r;
  }
  return null;
}
function iGraveOk(g, x, fy) {
  if (x < 4 || x > g.gw - 5) return null;
  var G = bGround(g, x, fy), y, k, c;
  if (G < 0 || Math.abs(G - fy) > 20 || !pSolid(g, x, G) || bMarked(g, x, G) || WOODY[pCell(g, x, G)]) return null;
  if (!pSolid(g, x, G + 1) && !pSolid(g, x - 1, G) && !pSolid(g, x + 1, G)) return null;   /* not on the edge of a drop */
  for (k = -1; k <= 1; k++) for (y = G - (k ? 4 : 6); y < G; y++) if (!AIRY[pCell(g, x + k, y)] && !P_LEAF[pCell(g, x + k, y)]) return null;
  for (y = G - 8; y <= G + 2; y++) for (k = -2; k <= 2; k++) { c = pCell(g, x + k, y); if (LIQUID[c] || HOT[c] || c === MAT.DRAIN) return null; }
  if (bSiteAround(g, x, G, null, 2)) return null;
  return { x: x, y: G };
}
function iNearHouse(g, x, y, pad) {
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (s.kind !== "grave" && x >= s.x0 - pad && x <= s.x1 + pad && y >= s.y0 - pad && y <= s.y1 + pad) return true;
  }
  return false;
}
/* a visit: stand by somebody's cross for a while. and now and then leave a flower */
function iGoVisit(g, p) {
  var list = [];
  for (var k = 0; k < g.sites.length; k++) { var s = g.sites[k]; if (s.kind === "grave" && s.done && Math.abs(s.cx - p.x) < 200) list.push(s); }
  if (!list.length) return false;
  var s2 = pick(list);
  p.task = { kind: "visit", site: s2.id, side: p.x < s2.cx ? -1 : 1, t: 0, act: 0 };
  return true;
}
function iTaskVisit(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || ++k.t > 2400) return iDone(p, false);
  var gx = Math.round(s.cx - 0.5) + k.side * 3, gy = s.y1, fy = Math.floor(p.y);
  if (Math.abs(p.x - gx - 0.5) > 1 || Math.abs(fy - gy) > 1) {
    if (iWalk(g, p, k, "visit" + s.id, gx, gy, function (x, y) { return Math.abs(x - gx) <= 1 && Math.abs(y - gy) <= 1; })) pGiveUp(g, p, gx);
    return false;
  }
  p.dir = -k.side; p.pose = "stand"; k.act++;
  if (k.act === 40) pSay(g, p, pick(P_SAY.visit).replace("{d}", pTitle(iShort(s.of))), true);
  if (k.act === 160 && Math.random() < 0.4) {
    var fx = Math.round(s.cx - 0.5) + k.side, j = gy * g.gw + fx;
    if (g.m[j] === MAT.EMPTY && pSolid(g, fx, gy + 1)) {
      /* a flower; or, from somebody with gold to spare, a nugget of it */
      if ((p.gold || 0) >= 1 && Math.random() < 0.5) { iOffer(g, p, j); }
      else { sandSet(g, j, MAT.FLOWER); g.sh[j] = irnd(42) * 6 + 1 + irnd(5); g.fx.bloom++; }
    }
  }
  if (k.act > 260) { p.bored = 0; return iDone(p, true); }
  return true;
}

/* -------------------------------------------------------------------
   SCARECROWS: a post and a crossbar, dressed (see iDraw), by a field
   ------------------------------------------------------------------- */
function iPlanScarecrow(g, p) {
  for (var k = 0; k < g.sites.length; k++) {
    var f = g.sites[k], j, has = false;
    if (f.kind !== "farm" || Math.abs(f.cx - p.x) > 200) continue;
    for (j = 0; j < g.sites.length; j++) if (g.sites[j].kind === "scarecrow" && g.sites[j].farm === f.id) has = true;
    if (has) continue;
    /* at either end of the field, as close to it as there is room for */
    for (var n = 0; n < 8; n++) {
      var sd = n & 1 ? 1 : -1, x = sd < 0 ? f.x0 - 3 - (n >> 1) : f.x1 + 3 + (n >> 1), G = bGround(g, x, f.G - 1), y;
      var ok = G >= 0 && pSolid(g, x, G) && !bMarked(g, x, G) && !WOODY[pCell(g, x, G)];
      for (y = G - 7; ok && y < G; y++) for (j = -2; j <= 2; j++) if (!AIRY[pCell(g, x + j, y)] && !P_LEAF[pCell(g, x + j, y)]) ok = false;
      /* (its arms are out two either side: well clear of anybody's door, or it is a wall across it) */
      if (!ok || bSiteAround(g, x, G, null, 1) || iDoorNear(g, x, 4)) continue;
      var plan = [];
      for (y = G - 1; y >= G - 5; y--) plan.push(bE(g, x, y, MAT.WOOD, 10 + G - y));
      plan.push(bE(g, x - 1, G - 4, MAT.WOOD, 20), bE(g, x + 1, G - 4, MAT.WOOD, 20), bE(g, x - 2, G - 4, MAT.WOOD, 21), bE(g, x + 2, G - 4, MAT.WOOD, 21));
      var s = bNew(g, "scarecrow", p, plan, [x - 2, G - 5, x + 2, G - 1],
                   { farm: f.id, px: x, G: G, shirt: hex32(pick(P_SHIRTS)), who: f.who });
      feed(g, p.name + " is making a scarecrow", "#a8e08a", "plan" + s.id);
      pSay(g, p, "planCrow", true);
      if (bWood(p) > 0.3) bJoin(g, p, s);
      return true;
    }
  }
  return false;
}
/* is column x within d of the door of a house or a tower (which are at the very ends of them) */
function iDoorNear(g, x, d) {
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k], a = s.kind === "house" ? s.x0 : (s.kind === "tower" ? s.x0 : null), b = s.kind === "house" ? s.x1 : (s.kind === "tower" ? s.x0 + 6 : null);
    if (a == null) continue;
    if (Math.abs(x - a) <= d || Math.abs(x - b) <= d) return true;
  }
  return false;
}
/* a scarecrow standing (its head, at least) near enough to (x, y) to put a duck off */
function iScarecrowNear(g, x, y) {
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (s.kind === "scarecrow" && s.done && Math.abs(s.cx - x) < 22 && Math.abs(s.cy - y) < 16 && pCell(g, s.px, s.G - 5) === MAT.WOOD) return s;
  }
  return null;
}
/* a duck turned tail at the sight of scarecrow s. somebody nearby is pleased with it, now and then */
function iShooed(g, s) {
  if (s.said && g.tick - s.said < 1800) return;
  var q = pOther(g, { x: s.cx, y: s.G }, 50);
  if (q && q.sayT <= 0 && !q.sleep) { s.said = g.tick; pSay(g, q, "crowWorks"); }
}

/* -------------------------------------------------------------------
   THE STATUE: the greatest mind in the valley, in dressed stone on a
   plinth, with a head of gold (and, over it, a light bulb that never
   goes out). up to three of them. thinking is easier in front of one
   ------------------------------------------------------------------- */
function iPlanStatue(g, p) {
  var n = iCount(g, "statue");
  if (n >= I_STATUES) return false;
  for (var j = 0; j < g.sites.length; j++) if (g.sites[j].kind === "statue" && !g.sites[j].done) return false;   /* (one at a time) */
  /* the greatest mind with no statue yet: three ideas for the first, two will do after that */
  var who = iThinker(g, iStatued(g));
  if (who.n < (n ? 2 : 3)) return false;
  /* (the next ones wait for the bell, if they know of bells: it wants the gold more. and none, not even the first, takes
     the gold out from under a bell that is going up) */
  if (n && g.know.bell && !mSites(g, "bell", true).length) return false;
  if (mSites(g, "bell").some(function (b) { return !b.done; })) return false;
  var fx = Math.floor(p.x), fy = Math.floor(p.y), d, sd, r = null, x;
  /* near the middle of things (their houses), on level ground, with room round it to stand and look */
  for (d = 6; d <= 120 && !r; d++) for (sd = -1; sd <= 1 && !r; sd += 2) {
    x = fx + d * sd;
    r = iStatueOk(g, x, fy);
  }
  if (!r) { p.planCD = 1500; if (!n) iNoRoom(g, "the statue"); return false; }   /* (news only while there is none) */
  var G = r.y, plan = [], k;
  x = r.x;
  for (k = 0; k < r.fill.length; k++) plan.push(bE(g, r.fill[k][0], r.fill[k][1], r.fill[k][2], 0));
  /* the plinth, two courses; the legs; the body; an arm up, pointing at something (an idea, probably); the head */
  for (k = -2; k <= 2; k++) plan.push(bE(g, x + k, G - 1, MAT.BRICK, 1), bE(g, x + k, G - 2, MAT.BRICK, 2));
  for (k = 3; k <= 5; k++) plan.push(bE(g, x - 1, G - k, MAT.BRICK, k), bE(g, x + 1, G - k, MAT.BRICK, k));
  for (k = 6; k <= 8; k++) for (var dx = -1; dx <= 1; dx++) plan.push(bE(g, x + dx, G - k, MAT.BRICK, k));
  plan.push(bE(g, x + 2, G - 8, MAT.BRICK, 9), bE(g, x + 2, G - 9, MAT.BRICK, 10));
  plan.push(bE(g, x, G - 9, MAT.GOLD, 11), bE(g, x, G - 10, MAT.GOLD, 12));
  var s = bNew(g, "statue", p, plan, [x - 2, G - 10, x + 2, G - 1], { of: who.name, px: x, G: G });
  feed(g, p.name + " is putting up a statue of " + pTitle(who.name), "#ffd94a", "plan" + s.id);
  pSay(g, p, pick(P_SAY.planStatue).replace("{d}", pTitle(who.name)), true);
  if (bCarries(p)) bJoin(g, p, s);
  return true;
}
/* somewhere for the statue at column x, about row fy: five columns of ground near enough level (the plinth is built
   up under the low end of it, and the high end dug down), open sky over it, nothing hot or wet about, and nobody
   else's site. {x, y (the row the plinth stands on), fill (blocks under the low end)} or null */
function iStatueOk(g, x, fy) {
  if (x < 6 || x > g.gw - 7) return null;
  var G = bGround(g, x, fy), k, y, c, gy = [], hi = -1, fill = [];
  if (G < 0 || Math.abs(G - fy) > 14) return null;
  for (k = -2; k <= 2; k++) {
    var gk = bGround(g, x + k, fy);
    if (gk < 0 || !pSolid(g, x + k, gk) || bMarked(g, x + k, gk) || WOODY[pCell(g, x + k, gk)] || pCell(g, x + k, gk) === MAT.SOIL) return null;
    gy.push(gk); G = Math.min(G, gk); hi = Math.max(hi, gk);
  }
  if (hi - G > 5) return null;
  G = Math.max(G, hi - 2);
  for (k = -2; k <= 2; k++) {
    var top = gy[k + 2];
    for (y = top - 1; y >= G; y--) fill.push([x + k, y, MAT.BRICK]);   /* (the low end: blocks under the plinth) */
    for (y = Math.min(G, top) - 14; y < Math.min(G, top); y++) if (!AIRY[pCell(g, x + k, y)] || bMarked(g, x + k, y)) return null;
    /* (the high end: dug down to the plinth, and out from between its legs) */
    for (y = top; y < G; y++) { if (!B_DIG[pCell(g, x + k, y)] || bMarked(g, x + k, y)) return null; if (y < G - 2 && !(Math.abs(k) === 1 && y >= G - 5)) fill.unshift([x + k, y, MAT.EMPTY]); }
  }
  for (y = G - 12; y <= G + 2; y++) for (k = -5; k <= 5; k++) { c = pCell(g, x + k, y); if (LIQUID[c] || HOT[c] || c === MAT.DRAIN || P_BANG[c]) return null; }
  if (bSiteAround(g, x, G, null, 3)) return null;
  return { x: x, y: G, fill: fill };
}
/* bored: off to stand in front of the statue, and think. (whoever it is of comes too, now and then, to admire it) */
function iGoAdmire(g, p) {
  var all = mSites(g, "statue", true), s = all.length ? pick(all) : null;
  if (!s || Math.abs(s.cx - p.x) > 220 || mCrew(g, "admire", s.id) >= 3) return false;
  p.task = { kind: "admire", site: s.id, side: p.x < s.px ? -1 : 1, t: 0, act: 0 };
  return true;
}
function iTaskAdmire(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || !s.done || ++k.t > 2400) return iDone(p, false);
  var gx = s.px + k.side * (4 + (p.id % 3)), gy = s.G - 1, fy = Math.floor(p.y);
  if (Math.abs(p.x - gx - 0.5) > 1 || Math.abs(fy - gy) > 1) {
    if (iWalk(g, p, k, "admire" + s.id, gx, gy, function (x, y) { return Math.abs(x - gx) <= 1 && Math.abs(y - gy) <= 1; })) pGiveUp(g, p, gx);
    return false;
  }
  p.dir = -k.side; p.pose = "stand"; p.idle = 0; k.act++;
  if (k.act === 50) {
    var self = iShort(p.name) === s.of, alive = false, q;
    for (q = 0; q < g.peasants.length; q++) if (!g.peasants[q].dead && iShort(g.peasants[q].name) === s.of) alive = true;
    var line = pick(self ? P_SAY.admireSelf : (alive ? P_SAY.admire : P_SAY.admireDead));
    pSay(g, p, line.replace(/\{d\}/g, pTitle(s.of)).replace("{i}", iIdeasOf(g, s.of)), true);
  }
  /* and, with gold to spare, something left at the foot of it, for luck */
  if (k.act === 200 && (p.gold || 0) >= 1 && Math.random() < 0.5) {
    var ox = s.px + k.side * 3, oy = s.G - 1, oj = oy * g.gw + ox;
    if (g.m[oj] === MAT.EMPTY && pSolid(g, ox, oy + 1)) iOffer(g, p, oj);
  }
  if (k.act > 300) { p.bored = 0; return iDone(p, true); }
  return true;
}
/* a nugget of gold out of their pocket, left (at cell j) at the foot of a statue or a cross */
function iOffer(g, p, j) {
  p.gold -= 1; sandSet(g, j, MAT.GOLD); heatAccept(g, j);
  sparks(g, (j % g.gw) + 0.5, ((j / g.gw) | 0) + 0.5, 5, 0.4, [hex32("#fff6c0"), SAND_PAL[MAT.GOLD][0]], 10, 0.2, PK_GLINT);
  g.offered = (g.offered || 0) + 1;
  if (g.offered === 1) feed(g, p.name + " left a nugget of gold. for luck", "#ffd94a", "offer");
  if (p.sayT <= 0) pSay(g, p, "offer", true);
}
/* the light bulb over the statue's head, while its head is still on it */
function iDrawStatue(g, s) {
  var x = s.px, y = s.G - 11;
  if (pCell(g, x, s.G - 10) !== MAT.GOLD || y < 4) return 0;
  var on = 0.75 + 0.25 * Math.sin(g.t * 3 + x);
  iPut(g, x, y - 3, blend32(I_BULB_MID, I_BULB_ON, on), true);
  iPut(g, x - 1, y - 2, I_BULB_MID, true); iPut(g, x, y - 2, I_BULB_ON, true); iPut(g, x + 1, y - 2, I_BULB_MID, true);
  iPut(g, x, y - 1, I_BULB_MID, true);
  iPut(g, x, y, I_BULB_BASE);
  return 1;
}

/* -------------------------------------------------------------------
   FIREWORKS: a show, and everybody comes to watch
   ------------------------------------------------------------------- */
function iPlanFestival(g, p) {
  if (g.tick < g.festT || p.festCD > g.tick || g.blaze.length || bAlive(g) < 3) return false;
  var fx = Math.floor(p.x), fy = Math.floor(p.y), d, sd, x, G, y, k, ok;
  for (d = 6; d <= 160; d++) for (sd = -1; sd <= 1; sd += 2) {
    x = fx + d * sd;
    if (x < 16 || x > g.gw - 17) continue;
    /* the ground under open sky: the first thing down from the top of the world */
    for (G = 0; G < g.gh && AIRY[pCell(g, x, G)]; G++);
    if (G >= g.gh || navStand(g, x, G - 1) !== 1 || bSiteAround(g, x, G, null, 2)) continue;
    /* open sky over it, and nothing that burns under where the sparks off a rocket come down: a rocket's trail is
       hot only for the first dozen cells of its climb (world.js), and wanders a little */
    for (ok = true, y = Math.max(0, G - 36); ok && y < G - 3; y++) for (k = -3; k <= 3; k++) if (!AIRY[pCell(g, x + k, y)]) { ok = false; break; }
    for (y = Math.max(0, G - 16); ok && y <= G + 1; y++) for (k = -I_FEST_CLEAR; k <= I_FEST_CLEAR; k++) if (P_FLAM[pCell(g, x + k, y)]) { ok = false; break; }
    /* (and nowhere near an oil well, nor oil pooled anywhere about: the sparks that go up come down a long way off) */
    if (!ok || !iFestSafe(g, x, G)) continue;
    p.task = { kind: "festival", x: x, y: G - 1, side: p.x < x ? -1 : 1, t: 0, act: 0, n: 3 + irnd(3), shot: 0, on: false };
    g.festT = g.tick + 600;   /* (one organiser at a time: the next gap starts when the show does) */
    return true;
  }
  p.festCD = g.tick + 1800;   /* nowhere round here: they will think about it again later */
  return false;
}
/* a rocket set out for a show that is not going on any more (called off for a fire, the one putting it on gone off to
   do something else, or dead): taken down again, before anything sets it off */
function iFestSweep(g) {
  var f = g.fwStage;
  if (!f) return;
  var p = null;
  for (var k = 0; k < g.peasants.length; k++) if (g.peasants[k].id === f.who) p = g.peasants[k];
  if (p && !p.dead && p.task && p.task.kind === "festival" && p.task.y * g.gw + p.task.x === f.j) return;
  if (g.m[f.j] === MAT.FIREWORK) heatVacate(g, f.j);
  g.fwStage = null;
}
/* nowhere near an oil well, nor oil pooled anywhere about, for a show launched from column x, ground G: the sparks that
   go up come down a long way off */
function iFestSafe(g, x, G) {
  var k, y;
  for (k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "well" && Math.abs(g.sites[k].cx - x) < 50) return false;
  for (y = Math.max(0, G - 30); y <= Math.min(g.gh - 1, G + 6); y++) for (k = -40; k <= 40; k++) if (pCell(g, x + k, y) === MAT.OIL) return false;
  return true;
}
function iTaskFestival(g, p, k) {
  if (++k.t > 3000 || g.blaze.length) return iDone(p, false);
  var sx = k.x + k.side * 4, j = k.y * g.gw + k.x;
  if (!k.on) {
    if (Math.abs(p.x - sx - 0.5) > 1 || Math.abs(Math.floor(p.y) - k.y) > 1) {
      if (iWalk(g, p, k, "fest" + k.x, sx, k.y, function (x, y) { return Math.abs(x - sx) <= 1 && Math.abs(y - k.y) <= 1; })) pGiveUp(g, p, sx);
      return false;
    }
    /* there: tell everybody. and the village chips in: coal out of their pockets (charcoal, for the powder) makes
       for more rockets, and a nugget of gold for a golden finale */
    k.on = true; k.act = 0;
    g.festT = g.tick + I_FEST_GAP + irnd(I_FEST_GAP);
    var coal = iChipIn(g, "coal", 3), gold = iChipIn(g, "gold", 1), oil = iBarrel(g), powder = iChipIn(g, "powder", 2);
    k.n += coal + (oil ? 2 : 0) + powder * 2; k.gold = gold > 0;
    pSay(g, p, "festival", true);
    feed(g, p.name + " is putting on a fireworks show" + (k.gold ? ", with a golden finale" : (powder ? ", with black powder in it" : (coal ? ", a big one" : ""))), "#ffd94a", "fest");
    if (g.wAny) { g.festX = k.x; pOrganPlay(g, "show"); }   /* (the steam organ plays at every show: pleasures.js) */
    for (var q = 0; q < g.peasants.length; q++) {
      var o = g.peasants[q];
      if (o === p || o.dead || o.state !== "walk" || o.sleep || o.fire || (o.task && !I_FUN[o.task.kind]) || Math.abs(o.x - k.x) > 160 || Math.random() < 0.15) continue;
      o.task = { kind: "watch", x: k.x, y: k.y, t: 0, until: g.tick + 120 * (k.n + 2), side: o.x < k.x ? -1 : 1 };
    }
  }
  p.dir = -k.side; p.idle = 0;
  var ph = k.act++ % 120;
  /* (oil spilled about since it was set up: the show is off. checked before every rocket, and the finale) */
  if ((ph === 10 || ph === 70 || (k.shot >= k.n && ph === 30)) && !iFestSafe(g, k.x, k.y + 1)) {
    if (g.m[j] === MAT.FIREWORK) heatVacate(g, j);   /* (the rocket taken down again, unlit) */
    g.fwStage = null;
    return iDone(p, false);
  }
  if (k.shot >= k.n) {
    /* the grand finale: three at once */
    if (ph === 30) {
      pSay(g, p, "finale", true);
      if (k.gold) g.goldBurst = g.tick + 160;   /* (the stars come out gold: world.js fwBurst) */
      for (var f = -1; f <= 1; f++) partAdd(g, PK_ROCKET, k.x + f * 2 + 0.5, k.y, f * 0.15, -1.1, 40 + irnd(30), SPARK_HOT[3], 0);
      g.fx.whistle++;
    }
    if (ph === 110) { achieve(g, "festival"); p.bored = 0; return iDone(p, true); }
    return true;
  }
  if (ph === 10) {
    if (!AIRY[g.m[j]]) return iDone(p, false);   /* something in the way of the launch: never mind */
    sandSet(g, j, MAT.FIREWORK);
    g.fwStage = { j: j, who: p.id };   /* (set out, and not yet lit: iFestSweep) */
    p.pose = "hammerA";
  } else if (ph > 10 && ph < 70) {
    p.pose = "chopB";   /* holding the match out */
    if (ph % 6 === 0) pChips(g, k.x + 0.5, k.y + 0.3, 1, SPARK_HOT);
    if (ph === 30 && p.sayT <= 0 && Math.random() < 0.5) pSay(g, p, "fuse");
  } else if (ph === 70) {
    if (g.m[j] === MAT.FIREWORK) sandLaunch(g, j);
    g.fwStage = null;
    k.shot++;
  }
  return true;
}
/* a barrel of oil out of a well's tank, for the show (it makes for a couple more rockets): true if there was one */
function iBarrel(g) {
  for (var k = 0; k < g.sites.length; k++) { var s = g.sites[k]; if (s.kind === "well" && s.done && s.tank >= 1) { s.tank--; return true; } }
  return false;
}
/* up to n of resource r out of the village's pockets, a lump at a time from whoever has most: how much */
/* n of resource r, a whole one at a time, out of the pockets of whoever has most of it (only those within R of column x,
   if those are given: it is carried, not wished there; never off but, who is the one asking). how many they found */
function iChipIn(g, r, n, x, R, but) {
  var got = 0, k, best;
  while (got < n) {
    for (best = null, k = 0; k < g.peasants.length; k++) { var q = g.peasants[k]; if (q !== but && !q.dead && (q[r] || 0) >= 1 && (R == null || Math.abs(q.x - x) <= R) && (!best || q[r] > best[r])) best = q; }
    if (!best) break;
    best[r] -= 1; got++;
  }
  return got;
}
function iTaskWatch(g, p, k) {
  if (g.tick > k.until || ++k.t > 2400) { p.bored = 0; wSpark(g, p, "theatre"); return iDone(p, true); }   /* (what if we did it again. on purpose. with chairs: wonders.js) */
  var gx = k.x + k.side * (I_FEST_CLEAR + 2 + (p.id % 6)), fy = Math.floor(p.y);   /* (out from under the sparks) */
  if (Math.abs(p.x - gx - 0.5) > 2 || Math.abs(fy - k.y) > 6) {
    if (iWalk(g, p, k, "watch" + k.x, gx, k.y, function (x, y) { return Math.abs(x - gx) <= 2 && Math.abs(y - k.y) <= 6; })) pGiveUp(g, p, gx);
    return false;
  }
  p.dir = -k.side; p.pose = "stand";
  return true;
}

/* -------------------------------------------------------------------
   STREET LAMPS: an iron post, six tall, with a lantern on top, along
   the ground between the houses. what a village with iron to spare,
   and a forge, puts it into
   ------------------------------------------------------------------- */
var I_POST_IRON = 16;   /* iron about the village before anybody thinks of it */
var I_POST_COST = 3;    /* iron in a post (half a bar a section) */
var I_POST_H = 6;       /* sections of post, the lantern over them */
var I_POSTS = 3;        /* posts for each house, at most */
function iPlanPost(g, p) {
  var n = iCount(g, "post"), H = iHouses(g), best = null, bd = 1e9, k, j, x, y, G, h, d;
  if (!H || n >= Math.min(14, H * I_POSTS)) return false;
  for (k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "post" && !g.sites[k].done) return false;   /* (one at a time) */
  for (k = 0; k < g.sites.length; k++) {
    h = g.sites[k];
    if (h.kind !== "house" || !h.done) continue;
    for (x = h.x0 - 16; x <= h.x1 + 16; x++) {
      if (x < 6 || x > g.gw - 7 || (x >= h.x0 - 2 && x <= h.x1 + 2)) continue;
      d = Math.abs(x - p.x);
      if (d >= bd || !iPostOk(g, x)) continue;
      bd = d; best = x;
    }
  }
  if (best == null) return false;
  x = best; G = mGround(g, x);
  var plan = [];
  for (j = 1; j <= I_POST_H; j++) { var e = bE(g, x, G - j, MAT.GIRDER, j); e.cost = I_POST_COST / I_POST_H; plan.push(e); }
  plan.push(bE(g, x, G - I_POST_H - 1, MAT.LAMP, I_POST_H + 1));
  var s = bNew(g, "post", p, plan, [x, G - I_POST_H - 1, x, G - 1], { G: G });
  feed(g, p.name + " is putting up " + (n ? "another street lamp" : "a street lamp"), "#ffe08a", "plan" + s.id);
  pSay(g, p, "planPost", true);
  if ((p.iron || 0) >= 1) bJoin(g, p, s);
  return true;
}
/* can a lamp post go in column x: on firm, level ground, under open sky, off everybody's site and field, clear of doors,
   nothing that burns or flows about, and not close to another post */
function iPostOk(g, x) {
  var G = mGround(g, x), y, k, t;
  if (G < I_POST_H + 4 || !pSolid(g, x, G) || Math.abs(mGround(g, x - 1) - G) > 1 || Math.abs(mGround(g, x + 1) - G) > 1) return false;
  for (y = G - I_POST_H - 4; y < G; y++) if (!AIRY[pCell(g, x, y)] || bMarked(g, x, y) || P_LEAF[pCell(g, x, y)]) return false;
  if (iDoorNear(g, x, 3)) return false;
  for (k = 0; k < g.sites.length; k++) {
    t = g.sites[k];
    if (t.kind === "post" && Math.abs(t.x0 - x) < 12) return false;
    if (x >= t.x0 - 1 && x <= t.x1 + 1 && G >= t.y0 - 2 && G - I_POST_H - 1 <= t.y1 + 2) return false;
  }
  for (y = G - 2; y <= G + 1; y++) for (k = -2; k <= 2; k++) { var c = pCell(g, x + k, y); if (LIQUID[c] || HOT[c]) return false; }
  return true;
}

/* -------------------------------------------------------------------
   THE PAPERWORK: names, news, the readout
   ------------------------------------------------------------------- */
function iLabel(s) {
  if (s.kind === "farm") return s.who ? pTitle(s.who) + "'s field" : "the field";
  if (s.kind === "lamp") return s.who ? pTitle(s.who) + "'s porch light" : "the porch light";
  if (s.kind === "post") return "the street lamp";
  if (s.kind === "grave") return "the grave of " + iName(s.of);
  if (s.kind === "scarecrow") return "the scarecrow";
  if (s.kind === "jetty") return "the jetty";
  if (s.kind === "pond") return "the pond";
  if (s.kind === "statue") return "the statue of " + pTitle(s.of);
  if (s.kind === "well") return oLabel(s);
  return lLabel(s) || mLabel(s) || wLabel(s);
}
/* a site of ours is finished. true if it was one of ours */
function iFinish(g, s, p) {
  var who = p ? p.name : "the village";
  if (s.kind === "farm") { feed(g, iCap(bLabel(s)) + " is sown. now: the waiting", "#a8e08a", "plan" + s.id); achieve(g, "farm"); }
  else if (s.kind === "lamp") {
    /* (the news once a house's lanterns are both lit, not once for each) */
    var other = null;
    for (var q = 0; q < g.sites.length; q++) if (g.sites[q] !== s && g.sites[q].kind === "lamp" && g.sites[q].home === s.home) other = g.sites[q];
    if (!other || other.done) feed(g, (other ? "lanterns burn" : "a lantern burns") + " by " + (s.who ? pTitle(s.who) + "'s" : "the") + " door", "#ffe08a", "lamp" + s.home);
    achieve(g, "lamp");
  }
  else if (s.kind === "post") {
    var lit = iCount(g, "post");
    feed(g, lit > 1 ? lit + " street lamps light the way home now" : "the first street lamp is lit. " + who + " stands under it, pleased", "#ffe08a", "post");
    achieve(g, "post");
  }
  else if (s.kind === "pond") feed(g, who + " dug a pond. now: the buckets", "#a8e08a", "plan" + s.id);
  else if (s.kind === "jetty") { feed(g, who + " built a jetty", "#a8e08a", "plan" + s.id); achieve(g, "jetty"); }
  else if (s.kind === "statue") {
    feed(g, "the statue of " + pTitle(s.of) + " is up. " + pTitle(s.of) + " thought of " + iIdeasOf(g, s.of), "#ffd94a", "plan" + s.id);
    achieve(g, "statue");
    mRing(g, 2);
  } else if (s.kind === "scarecrow") { feed(g, "a scarecrow keeps watch over " + (s.who ? pTitle(s.who) + "'s" : "the") + " wheat", "#a8e08a", "plan" + s.id); achieve(g, "scarecrow"); }
  else if (s.kind === "grave") {
    feed(g, "the cross for " + iName(s.of) + " is up. it says: \"" + s.note + "\"", "#c8d0dc", "plan" + s.id);
    achieve(g, "grave");
    /* and a flower, at the foot of it */
    var x = Math.round(s.cx - 0.5) + (Math.random() < 0.5 ? -1 : 1), j = s.y1 * g.gw + x;
    if (g.m[j] === MAT.EMPTY && pSolid(g, x, s.y1 + 1)) { sandSet(g, j, MAT.FLOWER); g.sh[j] = irnd(42) * 6 + 1 + irnd(5); }
  } else if (!oFinish(g, s, p) && !lFinish(g, s, p) && !wFinish(g, s, p)) return mFinish(g, s, p);
  return true;
}
/* what the village knows, and who thought of it, and what might put the rest into their heads: for the bar at the
   bottom, with the cursor over the IDEAS count */
function iSummary(g) {
  var known = [], todo = [];
  IDEAS.forEach(function (I) {
    if (g.know[I.id]) known.push(I.title + " (" + iShort(g.know[I.id]) + ")");
    else todo.push(I.hint + "?");
  });
  return (known.length ? "IDEAS: " + known.join(", ") : "NO IDEAS YET. WELL-FED PEASANTS HAVE THEM") +
         (todo.length ? ".  TO COME: " + todo.join(" ") : ".  THAT IS ALL OF THEM. FOR NOW");
}
/* what they are up to, for the bar at the bottom. "" if it is none of ours */
function iMood(g, p) {
  var k = p.task, s;
  if (p.bulb > 0) return "has had an idea!";
  var mm = mMood(g, p);
  if (mm) return mm;
  var om = oMood(g, p);
  if (om) return om;
  var lm = lMood(g, p);
  if (lm) return lm;
  var tm = tMood(g, p);
  if (tm) return tm;
  var wm = wMood(g, p);   /* (wonders.js) */
  if (wm) return wm;
  if (!k) return "";
  if (k.kind === "build" && (s = bSite(g, k.site)) && s.kind === "farm")
    return (s.sow ? "is sowing " : "is working on ") + bLabel(s) + ". it takes no wood, just elbow grease";
  if (k.kind === "build" && (s = bSite(g, k.site)) && s.kind === "pond")
    return (s.repair ? "is clearing out " : "is digging ") + bLabel(s) + ". it takes no wood, just a spade";
  if (k.kind === "shoo") return "is chasing a duck out of the wheat";
  if (k.kind === "bucket" && k.pond) return p.pail ? "is carrying water to the pond" : "is fetching water for the pond";
  if (k.kind === "bucket" && k.field) return p.pail ? "is watering the wheat" : "is fetching water for the wheat";
  if (k.kind === "bucket" && p.pail && iVictim(g, p)) return "is running at somebody who is on fire with a bucket";
  if (k.kind === "bucket") return p.pail ? "is running at the fire with a bucket of water" : "is fetching water. something is on fire";
  if (k.kind === "fish") return !k.bob ? "is off fishing" : (k.tug ? "has a bite!" : "is fishing. " + (k.n ? "caught " + k.n + " so far" : "nothing yet"));
  if (k.kind === "festival" && k.gold) return k.on ? "is putting on a fireworks show, with a golden finale" : "is setting up for a fireworks show";
  if (k.kind === "festival") return k.on ? "is putting on a fireworks show" : "is setting up for a fireworks show";
  if (k.kind === "watch") return "is watching the fireworks";
  if (k.kind === "visit") return (s = bSite(g, k.site)) ? "is visiting " + bLabel(s) : "is visiting a grave";
  if (k.kind === "admire") return (s = bSite(g, k.site)) ? "is standing in front of " + bLabel(s) + ", thinking" : "is off to see the statue";
  if (k.kind === "build" && (s = bSite(g, k.site)) && s.kind === "statue") return (s.repair ? "is mending " : "is carving ") + bLabel(s);
  return "";
}

/* -------------------------------------------------------------------
   DRAWING
   ------------------------------------------------------------------- */
var I_BULB_ON = hex32("#fff6a0"), I_BULB_MID = hex32("#ffd84a"), I_BULB_BASE = hex32("#8a8e96");
var I_PAIL = hex32("#9aa2ae"), I_PAIL_RIM = hex32("#c8ced8"), I_PAIL_WET = hex32("#3a7ade");
var I_ROD = hex32("#8a5a30"), I_LINE = hex32("#d8dce4"), I_BOB = hex32("#e83a3a"), I_BOB_TOP = hex32("#f4f4f4");
var I_LAMP_WARM = hex32("#ffc860"), I_SACK = hex32("#d8c090"), I_STRAW = hex32("#e8d070"), I_STRAW_D = hex32("#b89838");
function iPut(g, x, y, col, glow) {
  if (x < 0 || y < 0 || x >= g.gw || y >= g.gh) return;
  var i = y * g.gw + x;
  g.px[i] = col;
  if (glow) g.gpx[i] = col;
}
/* what they are holding, and what they are thinking: over the top of the peasant, at (ox, oy) */
function iDrawGear(g, p, ox, oy) {
  var d = p.dir, k = p.task, x, y;
  if (p.bulb > 0 && (p.bulb < I_BULB - 20 || (p.bulb >> 2) & 1)) {
    iPut(g, ox, oy - 9, I_BULB_ON, true);
    iPut(g, ox - 1, oy - 8, I_BULB_MID, true); iPut(g, ox, oy - 8, I_BULB_ON, true); iPut(g, ox + 1, oy - 8, I_BULB_MID, true);
    iPut(g, ox, oy - 7, I_BULB_MID, true);
    iPut(g, ox, oy - 6, I_BULB_BASE);
  }
  if (p.state !== "walk" || p.climb || p.rope || p.swimming || p.sleep) return;
  if (p.sweep && p.sweep.length) {
    /* an armful of sweepings, hugged to the chest: a heap of it, the more there is (tidy.js) */
    var c0 = p.sweep[0], ax = ox + d, ay = oy + 1, n = p.sweep.length;
    for (var q = 0; q < n && q < 6; q++) iPut(g, ax + d * (q % 2), ay - (q >> 1), SAND_PAL[c0.m][(c0.sh + q * 41) & 255]);
    if (n > 3) iPut(g, ax - d, ay, SAND_PAL[c0.m][(c0.sh + 200) & 255]);
  }
  if (!k) return;
  if (k.kind === "bucket") {
    var up = p.pose === "hammerA", by = up ? oy - 4 : oy + 1, bx = ox + d * 2;
    iPut(g, bx, by, p.pail ? I_PAIL_WET : I_PAIL_RIM); iPut(g, bx + d, by, p.pail ? I_PAIL_WET : I_PAIL_RIM);
    iPut(g, bx, by + 1, I_PAIL); iPut(g, bx + d, by + 1, I_PAIL);
  } else if (k.kind === "fish" && k.bob) {
    /* the rod, up and out; the line, sagging down to the bobber; the bobber, under when something bites */
    var tx = ox + d * 4, ty = oy - 5;
    iPut(g, ox + d * 2, oy, I_ROD); iPut(g, ox + d * 2, oy - 1, I_ROD); iPut(g, ox + d * 3, oy - 2, I_ROD); iPut(g, ox + d * 3, oy - 3, I_ROD);
    iPut(g, ox + d * 4, oy - 4, I_ROD); iPut(g, tx, ty, I_ROD);
    var bx2 = k.bob.x, by2 = k.bob.y - 1 + (k.tug ? 1 : 0) + (k.tug && (g.tick >> 2) & 1 ? 1 : 0);
    var n = Math.max(Math.abs(bx2 - tx), Math.abs(by2 - ty)) || 1, sag = k.tug ? 0 : 2;
    for (var s = 1; s < n; s++) {
      var t = s / n;
      x = Math.round(tx + (bx2 - tx) * t); y = Math.round(ty + (by2 - ty) * t + sag * 4 * t * (1 - t));
      if (x >= 0 && y >= 0 && x < g.gw && y < g.gh && AIRY[g.m[y * g.gw + x]]) iPut(g, x, y, blend32(g.px[y * g.gw + x], I_LINE, 0.55));
    }
    iPut(g, bx2, by2, k.tug ? blend32(I_BOB, SAND_PAL[MAT.WATER][0], 0.5) : I_BOB);
    if (!k.tug) iPut(g, bx2, by2 - 1, I_BOB_TOP);
  }
}
/* over the world: a warm pool of light round every lantern, and the scarecrows' clothes. returns how many things glow */
function iDraw(g) {
  var S = g.sites, px = g.px, gp = g.gpx, gw = g.gw, gh = g.gh, hot = 0, k, j, s, e, x, y, dx, dy;
  for (k = 0; k < S.length; k++) {
    s = S[k];
    if (s.kind === "lamp" || s.kind === "post") for (j = 0; j < s.plan.length; j++) {
      e = s.plan[j];
      if (e.v !== MAT.LAMP || g.m[e.i] !== MAT.LAMP) continue;
      var lx = e.i % gw, ly = (e.i / gw) | 0, fl = 0.85 + 0.1 * Math.sin(g.t * 11 + lx) + 0.05 * Math.sin(g.t * 23 + ly);
      for (dy = -7; dy <= 8; dy++) for (dx = -7; dx <= 7; dx++) {
        x = lx + dx; y = ly + dy;
        var r = Math.sqrt(dx * dx + dy * dy);
        if (r > 7.5 || r < 1 || x < 0 || y < 0 || x >= gw || y >= gh) continue;
        var f = (1 - r / 7.5); f = f * f * 0.42 * fl;
        px[y * gw + x] = blend32(px[y * gw + x], I_LAMP_WARM, f);
      }
      gp[e.i] = px[e.i];
      if (ly > 0) gp[e.i - gw] = blend32(0xff000000, px[e.i], 0.5);
      if (ly < gh - 1) gp[e.i + gw] = blend32(0xff000000, px[e.i], 0.6);
      hot++;
    } else if (s.kind === "scarecrow" && s.done) iDrawCrow(g, s);
    else if (s.kind === "statue" && s.done) hot += iDrawStatue(g, s);
  }
  return hot;
}
/* a straw hat, a sack for a head, and a shirt on the crossbar, for as much of the scarecrow as is still standing */
function iDrawCrow(g, s) {
  var x = s.px, G = s.G, k;
  function wood(y) { return pCell(g, x, y) === MAT.WOOD; }
  function air(X, Y) { return AIRY[pCell(g, X, Y)]; }
  if (wood(G - 5)) {
    /* the head, and a wide straw hat on it: a brim, and a crown */
    iPut(g, x, G - 5, I_SACK);
    for (k = -2; k <= 2; k++) if (air(x + k, G - 6)) iPut(g, x + k, G - 6, k ? I_STRAW_D : I_STRAW);
    if (air(x, G - 7)) iPut(g, x, G - 7, I_STRAW);
  }
  if (wood(G - 4)) {
    /* the shirt, on the crossbar and down the post, with straw sticking out of the cuffs */
    for (k = -2; k <= 2; k++) if (pCell(g, x + k, G - 4) === MAT.WOOD) iPut(g, x + k, G - 4, s.shirt);
    if (wood(G - 3)) iPut(g, x, G - 3, blend32(s.shirt, 0xff000000, 0.25));
    for (k = -3; k <= 3; k += 6) if (air(x + k, G - 4) && pCell(g, x + k - (k > 0 ? 1 : -1), G - 4) === MAT.WOOD) iPut(g, x + k, G - 4, I_STRAW);
  }
}
