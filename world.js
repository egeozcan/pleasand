/* =====================================================================
   PLEASAND  --  world.js

   a grid of cells. every tick, every cell with something in it gets to
   do one thing: fall, flow, rise, burn, grow, or nothing. the element
   picker on the left is the same list the rules are written against.

   every cell also carries a shade (so a grain keeps its colour while it
   falls, instead of the pile shimmering), a speed (so a falling thing
   speeds up, like falling things do), one byte of memory, aux, for
   the few things that need to remember something: a cloner's recipe, a
   stalk's height, a fuse, what a puddle of lava used to be. and a
   temperature, which goes where the cell goes: that is all in heat.js.

   on top of the grid live particles: grains thrown by explosions, sparks,
   and firework rockets. they fly free and turn back into cells on landing.
   ===================================================================== */
"use strict";

/* -------------------------------------------------------------------
   0. GEOMETRY + SMALL MATH
   ------------------------------------------------------------------- */
var VW = 640, VH = 400;          /* the game, in game pixels */
var PANEL = 96;                  /* the picker on the left */
var PLAY_Y = 14, BAR_H = 14;     /* header on top, description bar underneath */
var CELL = 2;                    /* game pixels per cell */

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function irnd(n) { return (Math.random() * n) | 0; }
function lerp(a, b, t) { return a + (b - a) * t; }
function pick(a) { return a[(Math.random() * a.length) | 0]; }
function hexRGB(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgb32(c, f) {
  var r = clamp(Math.round(c[0] * f), 0, 255), gg = clamp(Math.round(c[1] * f), 0, 255), b = clamp(Math.round(c[2] * f), 0, 255);
  return ((255 << 24) | (b << 16) | (gg << 8) | r) >>> 0;
}
function hex32(h, f) { return rgb32(hexRGB(h), f == null ? 1 : f); }
/* half-and-half of two packed pixels */
function mix32(a, b) { return ((((a & 0xfefefe) >>> 1) + ((b & 0xfefefe) >>> 1)) | 0xff000000) >>> 0; }

/* -------------------------------------------------------------------
   1. THE MATERIALS
   ------------------------------------------------------------------- */
var MAT = { EMPTY: 0, SAND: 1, WATER: 2, OIL: 3, WOOD: 4, FIRE: 5, LAVA: 6, STONE: 7, STEAM: 8,
            PLANT: 9, ICE: 10, GUNPOWDER: 11, ACID: 12, ASH: 13, FAUCET: 14, DRAIN: 15,
            SMOKE: 16, EMBER: 17, GLASS: 18, SALT: 19, CLONER: 20, GAS: 21, TORCH: 22,
            SEED: 23, FLOWER: 24, FIREWORK: 25, NUKE: 26, SALTWATER: 27, METAL: 28, SNOW: 29, INERT: 30 };

/* the picker, top to bottom. the fun ones first, then the classics with their digit
   keys. STEAM, SMOKE, EMBER and FLOWER are not in it: you do not pour those, you earn them. */
var PICK = [
  { tool: "peasant",   name: "PEASANT",   key: "V", desc: "click to make one, or grab one. drag and let go to throw. they have names. and feelings." },
  { tool: "duck",      name: "DUCK",      key: "D", desc: "click to make a duck, or grab one and throw it. they love water and seeds. some bring ducklings." },
  { m: MAT.FIREWORK,   name: "FIREWORK",  key: "F", desc: "a rocket with a short fuse. goes up, goes bang, peasants go ooooh." },
  { m: MAT.NUKE,       name: "NUKE",      key: "N", desc: "one per click. lands, ticks, and ends the afternoon. the peasants will not be pleased." },
  { tool: "lightning", name: "LIGHTNING", key: "L", desc: "strikes whatever is under it. sand turns to glass. water and metal conduct. peasants get crispy." },
  { tool: "heat",      name: "HEAT",      key: "H", desc: "hold to pour heat into anything. boil it, melt it, light it. T shows you how hot things are." },
  { tool: "cool",      name: "COOL",      key: "K", desc: "hold to draw the heat out. freeze ponds, set lava, make steam snow. peasants hate it." },
  { m: MAT.SAND,       name: "SAND",      key: "1", desc: "falls, piles, and sinks through anything lighter. the default, for a reason." },
  { m: MAT.WATER,      name: "WATER",     key: "2", desc: "falls and spreads. puts out fire. freezes at 0, boils at 100. cools lava into stone. peasants can swim in it." },
  { m: MAT.OIL,        name: "OIL",       key: "3", desc: "floats on water. burns very happily. nobody has ever been sorry about oil." },
  { m: MAT.WOOD,       name: "WOOD",      key: "4", desc: "does not move. keeps heat out well. at 300 it catches, and burns down to embers." },
  { m: MAT.PLANT,      name: "PLANT",     key: "5", desc: "does not move. grows into empty air wherever it touches water." },
  { m: MAT.FIRE,       name: "FIRE",      key: "6", desc: "rises and flickers. eats oil, wood, plants, gunpowder and peasants. dies in water." },
  { m: MAT.LAVA,       name: "LAVA",      key: "7", desc: "1300 degrees of runny stone. thickens as it cools, crusts over below 950. do not bathe in it." },
  { m: MAT.STONE,      name: "STONE",     key: "8", desc: "does not move. does not burn. soaks up heat slowly, glows red, and runs as lava past 1150." },
  { m: MAT.ICE,        name: "ICE",       key: "9", desc: "does not move. 30 below. chills what it touches, melts above zero. salt melts it faster." },
  { m: MAT.GUNPOWDER,  name: "GUNPOWDER", key: "0", desc: "a powder that waits for a spark. then the whole pile goes off, and so do the neighbours." },
  { m: MAT.ASH,        name: "ASH",       key: "",  desc: "what is left over. light and grey, floats on water, very patient." },
  { m: MAT.SALT,       name: "SALT",      key: "",  desc: "a powder. melts ice, kills plants, dissolves in water. boil the water off and get it back." },
  { m: MAT.SALTWATER,  name: "SALT WATER",key: "",  desc: "heavier than water, so it sinks under it. freezes at -21. boil it: steam goes up, salt stays." },
  { m: MAT.SNOW,       name: "SNOW",      key: "",  desc: "falls softly and piles up. melts above zero. very cold steam comes down as this." },
  { m: MAT.SEED,       name: "SEED",      key: "",  desc: "lands on sand or ash, gets wet, grows a stalk, and flowers. peasants love flowers." },
  { m: MAT.GLASS,      name: "GLASS",     key: "",  desc: "does not move. acid cannot touch it. hot sand and lightning make it. melts at 1400." },
  { m: MAT.METAL,      name: "METAL",     key: "",  desc: "does not move. carries heat end to end, and lightning too. glows when hot, melts at 1500." },
  { m: MAT.ACID,       name: "ACID",      key: "",  desc: "a liquid that eats sand, wood, plants, stone, and peasants. slowly. it tingles." },
  { m: MAT.GAS,        name: "GAS",       key: "",  desc: "drifts up and hangs about. harmless, until anything warm comes near it." },
  { m: MAT.TORCH,      name: "TORCH",     key: "",  desc: "does not move. a steady 1000 degrees, forever, upward. boils what touches it." },
  { m: MAT.FAUCET,     name: "FAUCET",    key: "",  desc: "does not move. drips water downward forever. draw over it to stop it." },
  { m: MAT.DRAIN,      name: "DRAIN",     key: "",  desc: "does not move. swallows whatever touches it. peasants included. they hate that." },
  { m: MAT.CLONER,     name: "CLONER",    key: "",  desc: "does not move. remembers the first thing it touches, then makes it forever. try a nuke." },
  { m: MAT.INERT,      name: "INERT",     key: "",  desc: "magic. stays exactly where you put it. does not burn, melt, dissolve, conduct or care. only erase moves it." },
  { m: MAT.EMPTY,      name: "ERASE",     key: "E", desc: "removes whatever it touches. right-drag erases from anywhere, too." }
];

var SAND_MAXSIZE = 16;
var CLONE_PEASANT = 255;   /* what a cloner remembers when it has touched a peasant */
var SAND_CLEAN = 200;   /* a fire whose shade is at least this leaves no ash */
var SAND_VMAX = 12;     /* top speed: 1 + (12 >> 2) = 4 cells a tick */

/* how heavy each thing is, and which things a falling thing may push past */
var SAND_DENS = [0, 4, 2, 1, 9, 0.5, 6, 9, 0.1, 9, 9, 4.5, 2.5, 1.5, 9, 9, 0.2, 9, 9, 4.2, 9, 0.15, 9, 3, 9, 4.1, 5, 2.2, 9, 1.8, 9];
var SAND_FREE = [0, 1, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0];
/* the brush pours these, a few grains a frame, into empty space only. everything
   else is a solid and gets stamped down whole, over whatever was there. */
var SAND_POUR = [0, 0.3, 0.35, 0.35, 0, 0.35, 0.35, 0, 0, 0, 0, 0.3, 0.35, 0.3, 0, 0, 0, 0, 0, 0.3, 0, 0.35, 0, 0.03, 0, 0.012, 0, 0.35, 0, 0.25, 0];

/* colours. several shades per thing; each grain is dealt one and keeps it */
var SAND_SHADES = [
  ["#0b0e14"],
  ["#e8c46a", "#dcb55c", "#f0d27a", "#d4a85a"],
  ["#2f6fd0", "#2a64bd", "#3a7ade", "#2565c4"],
  ["#3a3020", "#433824", "#30281a"],
  ["#7a5230", "#6d4a2a", "#855c36"],
  ["#ff7a1a", "#ffb020", "#ff5a10", "#ffd060"],
  ["#ff3b10", "#e8300c", "#ff6a1a", "#c82a0a"],
  ["#5c6270", "#555a68", "#646a79", "#4e5361"],
  ["#8fa8c0", "#9ab2c8"],
  ["#3f9a3a", "#2f8a35", "#4fae48"],
  ["#bfe9ff", "#a8dcf5", "#d6f2ff"],
  ["#2c2a2a", "#3a3532", "#242222", "#4e3a30"],
  ["#9cff3a", "#7bee2a", "#b8ff50"],
  ["#8a8a88", "#9a9a96", "#7c7c7a"],
  ["#3c4f6e"],
  ["#222a36"],
  ["#4a4e5a", "#555a66", "#3f434e"],
  ["#a03a10", "#c4501a", "#7a2a0c", "#e06a20"],
  ["#5fb8c0", "#74c9cf", "#4fa6b0", "#8adbe0"],
  ["#f2f2ee", "#e0e0dc", "#fafaf6"],
  ["#9a4ac8", "#b060e0"],
  ["#3a4a24", "#425428", "#34421f"],
  ["#d09a3a", "#a8782a"],
  ["#6b4a1e", "#7d5626", "#5a3c18"],
  /* a flower's shade picks its colour: 0 is the middle, 1-5 are petals */
  ["#ffd84a", "#ff6fa8", "#e83a4a", "#f4f0ff", "#b07aff", "#ff9a3a"],
  ["#e8304a", "#f4f4f4", "#3a7ade", "#ffd84a"],
  ["#c8ff3a", "#2a2a1a"],
  ["#2a8aa8", "#257d9a", "#3396b4", "#2280a0"],
  ["#8a929e", "#7e8692", "#969ea9", "#737b87"],
  ["#eef4fb", "#e2eaf4", "#f8fbff", "#d8e2ee"],
  ["#b9a6e8", "#c4b3f0", "#ad98e0", "#cdbff5"]
];

/* every (thing, shade) pair is worked out once, up here, not sixty times a second */
function sandTable(list, f) {
  var out = new Uint32Array(256);
  for (var s = 0; s < 256; s++) out[s] = rgb32(hexRGB(list[s % list.length]), f * (0.92 + ((s >> 3) & 15) / 15 * 0.16));
  return out;
}
var SAND_PAL = SAND_SHADES.map(function (list) { return sandTable(list, 1); });
var SAND_WET = sandTable(SAND_SHADES[MAT.SAND], 0.68);
/* the top face of anything with open sky above it catches a little more light */
var SAND_LIT = SAND_SHADES.map(function (list) { return sandTable(list, 1.18); });
/* liquids get darker the deeper you look. row 0 is the surface, which catches the light */
var SAND_DEEP = [];
[MAT.WATER, MAT.ACID, MAT.OIL, MAT.SALTWATER].forEach(function (v) {
  var t = new Uint32Array(17 * 256);
  for (var d = 0; d < 16; d++) t.set(sandTable(SAND_SHADES[v], d === 0 ? 1.35 : Math.max(0.55, 1.02 - d * 0.03)), d * 256);
  t.set(sandTable(SAND_SHADES[v], 1.7), 16 * 256);   /* row 16: the glint on a wave */
  SAND_DEEP[v] = t;
});

/* what peasants (and particles) may stand on: anything that is not air, gas, fire or liquid */
var SOLID = new Uint8Array(32), LIQUID = new Uint8Array(32), HOT = new Uint8Array(32), AIRY = new Uint8Array(32);
[MAT.SAND, MAT.WOOD, MAT.STONE, MAT.PLANT, MAT.ICE, MAT.GUNPOWDER, MAT.ASH, MAT.FAUCET, MAT.DRAIN, MAT.EMBER,
 MAT.GLASS, MAT.SALT, MAT.CLONER, MAT.TORCH, MAT.SEED, MAT.FLOWER, MAT.FIREWORK, MAT.NUKE, MAT.METAL, MAT.SNOW, MAT.INERT].forEach(function (v) { SOLID[v] = 1; });
[MAT.WATER, MAT.OIL, MAT.ACID, MAT.LAVA, MAT.SALTWATER].forEach(function (v) { LIQUID[v] = 1; });
/* water, as far as fire, plants, peasants and lightning are concerned */
var WET = new Uint8Array(32); WET[MAT.WATER] = WET[MAT.SALTWATER] = 1;
[MAT.FIRE, MAT.LAVA, MAT.EMBER, MAT.TORCH].forEach(function (v) { HOT[v] = 1; });
[MAT.EMPTY, MAT.FIRE, MAT.SMOKE, MAT.STEAM, MAT.GAS].forEach(function (v) { AIRY[v] = 1; });
/* things that flow out of the way: liquids and gases. a grain can sink through these, or float up through
   them. two piles of grains never trade places, whatever they weigh: gunpowder poured on sand sits on it */
var FLUID = new Uint8Array(32);
[MAT.WATER, MAT.OIL, MAT.ACID, MAT.LAVA, MAT.SALTWATER, MAT.STEAM, MAT.SMOKE, MAT.GAS, MAT.FIRE].forEach(function (v) { FLUID[v] = 1; });

/* -------------------------------------------------------------------
   2. CELL PLUMBING
   ------------------------------------------------------------------- */
/* neighbour index: 0 up, 1 down, 2 left, 3 right. -1 if off the edge */
function sandNb(g, x, y, k) {
  if (k === 0) return y > 0 ? (y - 1) * g.gw + x : -1;
  if (k === 1) return y < g.gh - 1 ? (y + 1) * g.gw + x : -1;
  if (k === 2) return x > 0 ? y * g.gw + x - 1 : -1;
  return x < g.gw - 1 ? y * g.gw + x + 1 : -1;
}
/* index of a touching cell holding t, or -1 */
function sandHas(g, x, y, t) {
  for (var k = 0; k < 4; k++) {
    var j = sandNb(g, x, y, k);
    if (j >= 0 && g.m[j] === t) return j;
  }
  return -1;
}
function sandHotNb(g, x, y) {
  for (var k = 0; k < 4; k++) {
    var j = sandNb(g, x, y, k);
    if (j >= 0 && HOT[g.m[j]]) return j;
  }
  return -1;
}
/* can something of kind src move into cell j. empty space always takes it; a lighter
   thing can be pushed aside, but only if it has not already had its turn this tick,
   and only if one of the two flows: grains part a liquid, they do not part other grains */
function sandCan(g, src, j) {
  var t = g.m[j];
  return t === MAT.EMPTY ||
         (g.stamp[j] !== g.tick && SAND_FREE[t] === 1 && SAND_DENS[t] < SAND_DENS[src] && (FLUID[t] || FLUID[src]));
}
/* index of a touching cell holding water of either kind, or -1 */
function sandWet(g, x, y) {
  for (var k = 0; k < 4; k++) {
    var j = sandNb(g, x, y, k);
    if (j >= 0 && WET[g.m[j]]) return j;
  }
  return -1;
}
function sandEmpty(g, j) { return g.m[j] === MAT.EMPTY; }
/* swap two cells, everything included. the thing that moved has had its turn, and so
   has anything it shoved out of the way. the empty space it left behind has not: that
   is free for the next grain down the stream, or a pour stutters. */
function sandSwap(g, i, j) {
  var m = g.m, t = m[j];
  m[j] = m[i]; m[i] = t;
  t = g.sh[j]; g.sh[j] = g.sh[i]; g.sh[i] = t;
  t = g.vy[j]; g.vy[j] = g.vy[i]; g.vy[i] = t;
  t = g.aux[j]; g.aux[j] = g.aux[i]; g.aux[i] = t;
  t = g.T[j]; g.T[j] = g.T[i]; g.T[i] = t;
  t = g.lat[j]; g.lat[j] = g.lat[i]; g.lat[i] = t;
  t = g.hm[j]; g.hm[j] = g.hm[i]; g.hm[i] = t;
  t = g.ha[j]; g.ha[j] = g.ha[i]; g.ha[i] = t;
  t = g.hs[j]; g.hs[j] = g.hs[i]; g.hs[i] = t;
  g.stamp[j] = g.tick;
  if (m[i] !== MAT.EMPTY) g.stamp[i] = g.tick;
}
/* a new thing in a cell, made out of what the world was already doing there (a flame licking into the
   air, a plant growing, a puff of smoke). it has exactly the heat the cell had: see heat.js */
function sandSet(g, j, v) {
  var q = heatQ(g, j);
  g.m[j] = v; g.vy[j] = 0; g.aux[j] = 0; g.sh[j] = irnd(256);
  heatSetQ(g, j, q);
}
/* a new thing from outside: painted, poured, dropped from a faucet or a cloner. it comes at its own temperature */
function sandPlace(g, j, v) {
  g.m[j] = v; g.vy[j] = 0; g.aux[j] = 0; g.sh[j] = irnd(256);
  g.T[j] = HEAT_T0[v]; g.lat[j] = 0;
  heatAccept(g, j);
}

/* falling, with speed. it gains a little every tick it keeps falling and loses it all
   the moment it lands. sinking through a liquid is slow: one cell, then stop. */
function sandFall(g, i, x, y, v) {
  var gw = g.gw, m = g.m, sp = g.vy[i], n = 1 + (sp >> 2), cur = i, s, j, moved = 0, t;
  for (s = 0; s < n && y + s + 1 < g.gh; s++) {
    j = cur + gw;
    if (!sandCan(g, v, j)) break;
    t = m[j];
    sandSwap(g, cur, j); cur = j; moved++;
    if (SAND_DENS[t] >= 1) { g.vy[cur] = 0; return true; }
  }
  if (!moved) { g.vy[i] = 0; return false; }
  g.vy[cur] = Math.min(SAND_VMAX, sp + 1);
  return true;
}

/* -------------------------------------------------------------------
   3. PARTICLES: things in the air that are not on the grid
   ------------------------------------------------------------------- */
var PK_DEBRIS = 0, PK_SPARK = 1, PK_ROCKET = 2, PK_GLINT = 3;   /* a glint: looks like a spark, lights nothing */
var PMAX = 5000;
var FW_COLORS = ["#ff4060", "#40c0ff", "#ffd040", "#60ff80", "#c070ff", "#ffffff", "#ff8a30", "#ff70d0"].map(function (h) { return hex32(h); });
var SPARK_HOT = ["#ffd060", "#ffb020", "#ff7a1a", "#fff0a0"].map(function (h) { return hex32(h); });

function partInit(g) {
  g.np = 0;
  g.ppx = new Float32Array(PMAX); g.ppy = new Float32Array(PMAX);
  g.pvx = new Float32Array(PMAX); g.pvy = new Float32Array(PMAX);
  g.pl = new Int16Array(PMAX); g.pk = new Uint8Array(PMAX); g.pm = new Uint8Array(PMAX);
  g.pc = new Uint32Array(PMAX); g.pt = new Float32Array(PMAX); g.ps = new Uint8Array(PMAX);
}
function partAdd(g, kind, x, y, vx, vy, life, col, mat) {
  if (g.np >= PMAX) return -1;
  var q = g.np++;
  g.ppx[q] = x; g.ppy[q] = y; g.pvx[q] = vx; g.pvy[q] = vy;
  g.pl[q] = life; g.pk[q] = kind; g.pm[q] = mat || 0; g.pc[q] = col; g.ps[q] = irnd(256);
  /* a grain carries its heat (a spark or a rocket, none to speak of). a new one is at its own temperature */
  g.pt[q] = kind === PK_DEBRIS ? HEAT_C[mat || 0] * (HEAT_T0[mat || 0] - AMBIENT) + heatH0(mat || 0, 0, g.ps[q]) : 0;
  return q;
}
function partKill(g, q) {
  var l = --g.np;
  if (q === l) return;
  g.ppx[q] = g.ppx[l]; g.ppy[q] = g.ppy[l]; g.pvx[q] = g.pvx[l]; g.pvy[q] = g.pvy[l];
  g.pl[q] = g.pl[l]; g.pk[q] = g.pk[l]; g.pm[q] = g.pm[l]; g.pc[q] = g.pc[l]; g.pt[q] = g.pt[l]; g.ps[q] = g.ps[l];
}
/* a grain that ends up somewhere other than a free cell to land in leaves its heat in the cell it is in, or the
   nearest one that will take heat (inert will not). off the edge of the room, the heat goes with it. false if
   there is nowhere at all to leave it, yet: then the grain hangs on to it */
function partDrop(g, q, x, y) {
  var ix = Math.floor(x), iy = Math.floor(y), gw = g.gw, r, dx, dy, j;
  if (g.pk[q] !== PK_DEBRIS || !g.pt[q] || ix < 0 || iy < 0 || ix >= gw || iy >= g.gh) return true;
  for (r = 0; r <= 6; r++) for (dy = -r; dy <= r; dy++) for (dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    var nx = ix + dx, ny = iy + dy;
    if (nx < 0 || ny < 0 || nx >= gw || ny >= g.gh) continue;
    j = ny * gw + nx;
    if (g.m[j] === MAT.INERT) continue;
    heatSync(g, j);
    heatSetQ(g, j, heatQ(g, j) + g.pt[q]);
    return true;
  }
  return false;
}
/* turn a cell into a flying grain of itself. it takes all its heat with it, and its shade; the air that
   rushes in behind it is room air, with no heat of its own to speak of */
function sandFling(g, j, vx, vy) {
  var v = g.m[j], q = partAdd(g, PK_DEBRIS, (j % g.gw) + 0.5, ((j / g.gw) | 0) + 0.5, vx, vy, 240, SAND_PAL[v][g.sh[j]], v);
  if (q < 0) return false;
  g.pt[q] = heatQ(g, j); g.ps[q] = g.sh[j];
  g.m[j] = MAT.EMPTY; g.aux[j] = 0; g.T[j] = AMBIENT; g.lat[j] = 0;
  heatAccept(g, j);
  return true;
}
function sparks(g, x, y, n, speed, cols, life, up) {
  for (var k = 0; k < n; k++) {
    var a = Math.random() * 6.2832, s = speed * (0.3 + Math.random() * 0.7);
    partAdd(g, PK_SPARK, x, y, Math.cos(a) * s, Math.sin(a) * s - (up || 0), life + irnd(life), pick(cols));
  }
}
/* a spark landing on something. some things take it personally */
function sandIgnite(g, j) {
  var t = g.m[j], r = Math.random();
  if (t === MAT.GAS) { g.m[j] = MAT.FIRE; g.sh[j] = SAND_CLEAN; g.fx.whoosh++; }
  else if (t === MAT.GUNPOWDER) sandBoom(g, j);
  else if (t === MAT.FIREWORK) sandLaunch(g, j);
  else if (t === MAT.NUKE) sandNuke(g, j);
  else if (t === MAT.OIL && r < 0.5) g.m[j] = MAT.FIRE;
  else if ((t === MAT.PLANT || t === MAT.SEED || t === MAT.FLOWER) && r < 0.15) g.m[j] = MAT.FIRE;
  else if (t === MAT.WOOD && r < 0.06) g.m[j] = MAT.EMBER;
}

function partStep(g) {
  var gw = g.gw, gh = g.gh, m = g.m, q = 0, k, x, y, vx, vy, n, s, ix, iy, j, hit;
  while (q < g.np) {
    k = g.pk[q]; x = g.ppx[q]; y = g.ppy[q]; vx = g.pvx[q]; vy = g.pvy[q];
    if (--g.pl[q] <= 0) {
      if (k === PK_ROCKET) fwBurst(g, x, y);
      if (partDrop(g, q, x, y)) { partKill(g, q); continue; }
      g.pl[q] = 1; q++; continue;   /* sealed in inert, for now: it keeps its heat until there is somewhere to put it */
    }
    if (k === PK_DEBRIS) { vy += 0.11; vx *= 0.995; }
    else if (k === PK_SPARK || k === PK_GLINT) { vy += 0.03; vx *= 0.96; vy *= 0.96; }
    else {
      /* a rocket: accelerates up, wobbles, leaves a trail */
      vy = Math.max(-2.6, vy - 0.07); vx += (Math.random() - 0.5) * 0.12;
      partAdd(g, PK_SPARK, x, y + 1, (Math.random() - 0.5) * 0.3, 0.4 + Math.random() * 0.3, 6 + irnd(12), pick(SPARK_HOT));
      if (y < 4) { fwBurst(g, x, y); partKill(g, q); continue; }
    }
    if (vy > 4) vy = 4;
    n = Math.ceil(Math.max(Math.abs(vx), Math.abs(vy)) * 1.5) || 1;
    hit = -1;
    for (s = 0; s < n; s++) {
      var nx = x + vx / n, ny = y + vy / n;
      ix = Math.floor(nx); iy = Math.floor(ny);
      if (ix < 0 || ix >= gw || iy >= gh) { hit = -2; break; }
      if (iy >= 0) {
        j = iy * gw + ix;
        if (!AIRY[m[j]] || (k === PK_DEBRIS && m[j] === MAT.FIRE && g.pm[q] === MAT.FIRE)) { hit = j; break; }
      }
      x = nx; y = ny;
    }
    if (hit === -2) { partKill(g, q); continue; }   /* off the edge: gone, heat and all */
    if (hit >= 0) {
      if (k === PK_DEBRIS) {
        /* land in the last free cell it passed through */
        ix = Math.floor(x); iy = Math.floor(y);
        j = iy >= 0 && iy < gh ? iy * gw + ix : -1;
        if (j >= 0 && AIRY[m[j]]) {
          /* it lands: the cell becomes it, with its heat and the heat of whatever air it pushed out */
          var qa = heatQ(g, j);
          m[j] = g.pm[q]; g.aux[j] = 0; g.sh[j] = g.ps[q]; g.vy[j] = clamp((vy * 3) | 0, 0, SAND_VMAX);
          heatSetQ(g, j, qa + g.pt[q]);
        } else if (!partDrop(g, q, x, y)) { g.pvx[q] = g.pvy[q] = 0; q++; continue; }
      } else if (k === PK_SPARK) {
        sandIgnite(g, hit);
      } else if (k === PK_GLINT) {
        /* nothing: it was only ever for show */
      } else {
        fwBurst(g, x, y);
      }
      partKill(g, q); continue;
    }
    g.ppx[q] = x; g.ppy[q] = y; g.pvx[q] = vx; g.pvy[q] = vy;
    q++;
  }
}

/* -------------------------------------------------------------------
   4. BANGS
   ------------------------------------------------------------------- */
/* an explosion of radius R and push P. small ones are gunpowder grains, big ones are
   nukes. inside: things burn, boil, shatter or vanish. the outer shell is thrown. */
function sandBoom(g, i, R, P) {
  R = R || 6; P = P || 1.5;
  var m = g.m, gw = g.gw, x0 = i % gw, y0 = (i / gw) | 0, big = R >= 12, R2 = R * R;
  var dx, dy, d2, x, y, j, t, r, inner, d, room = g.np < PMAX - 400;
  g.score += 5; g.fx.boom++;
  m[i] = MAT.FIRE;
  for (dy = -R; dy <= R; dy++) for (dx = -R; dx <= R; dx++) {
    d2 = dx * dx + dy * dy;
    if (d2 > R2 + R) continue;
    x = x0 + dx; y = y0 + dy;
    if (x < 0 || y < 0 || x >= gw || y >= g.gh) continue;
    j = y * gw + x; t = m[j]; r = Math.random(); inner = d2 < R2 * 0.3;
    if (t === MAT.INERT) continue;   /* not even a nuke */
    /* a bang is hot. a big one is hot enough to leave the ground around it glowing */
    heatAdd(g, j, (big ? 1500 : 260) * (1 - d2 / (R2 + R)));
    if (t === MAT.EMPTY) {
      if (r < (big ? (inner ? 0.02 : 0.12) : 0.3)) { sandSet(g, j, MAT.FIRE); if (big) g.sh[j] = SAND_CLEAN; }
      continue;
    }
    if (t === MAT.STONE || t === MAT.FAUCET || t === MAT.DRAIN || t === MAT.CLONER || t === MAT.TORCH || t === MAT.LAVA ||
        t === MAT.METAL) {
      /* only a big one digs a crater, and the middle of it is molten */
      if (big && (inner || r < 0.35 * (1 - d2 / R2))) {
        if (inner && r < 0.12 && (t === MAT.STONE || t === MAT.METAL)) { m[j] = MAT.LAVA; g.aux[j] = t === MAT.METAL ? t : 0; g.lat[j] = 0; g.T[j] = Math.max(g.T[j], 1500); }
        else m[j] = MAT.EMPTY;
      }
      continue;
    }
    if (t === MAT.FIREWORK) { sandLaunch(g, j); continue; }
    if (t === MAT.NUKE) { if (g.aux[j] < 240) g.aux[j] = 240; continue; }   /* a short fuse */
    if (t === MAT.GUNPOWDER) { m[j] = MAT.FIRE; continue; }
    if (big && inner) { m[j] = r < 0.2 ? MAT.FIRE : MAT.EMPTY; continue; }
    /* the outer shell of anything loose gets thrown */
    if (SAND_FREE[t] && t !== MAT.STEAM && t !== MAT.SMOKE && t !== MAT.GAS && !inner && room && r < 0.6) {
      d = Math.sqrt(d2) || 1;
      var sp = P * (0.5 + Math.random() * 0.8) * (1.2 - d / R * 0.5);
      if (WET[t] && r < 0.2) heatForce(g, j, t === MAT.WATER ? MAT.STEAM : MAT.SALT);
      else sandFling(g, j, dx / d * sp + (Math.random() - 0.5) * 0.4, dy / d * sp - P * 0.6);
      continue;
    }
    if (t === MAT.GLASS) { if (r < 0.5) m[j] = MAT.SAND; }
    else if (t === MAT.WATER) heatForce(g, j, MAT.STEAM);
    else if (t === MAT.SALTWATER) heatForce(g, j, MAT.SALT);
    else if (t === MAT.ICE || t === MAT.SNOW) heatForce(g, j, MAT.WATER);
    else if (t === MAT.SMOKE || t === MAT.STEAM || t === MAT.GAS) { m[j] = t === MAT.GAS ? MAT.FIRE : t; }
    else if (t === MAT.SAND || t === MAT.ASH || t === MAT.SALT || t === MAT.SNOW) { if (r < 0.5) m[j] = MAT.EMPTY; }
    else if (r < 0.85) m[j] = MAT.FIRE;
  }
  /* sparks, a few burning bits thrown about, and the news */
  if (room) {
    sparks(g, x0 + 0.5, y0 + 0.5, big ? 160 : 6, P * 1.4, SPARK_HOT, big ? 30 : 12, P * 0.3);
    for (var k = 0; k < (big ? 60 : 1); k++) {
      var a = -Math.random() * 3.1416, s = P * (0.6 + Math.random() * 0.9);
      partAdd(g, PK_DEBRIS, x0 + 0.5, y0 - 1, Math.cos(a) * s, Math.sin(a) * s, 80, SPARK_HOT[0], MAT.FIRE);
    }
  }
  /* the bang's heat is the bang's: whatever it left in its blast is what is there now */
  for (dy = -R; dy <= R; dy++) for (dx = -R; dx <= R; dx++) {
    x = x0 + dx; y = y0 + dy;
    if (x >= 0 && y >= 0 && x < gw && y < g.gh && dx * dx + dy * dy <= R2 + R) heatAccept(g, y * gw + x);
  }
  g.shake = Math.min(big ? 18 : 6, g.shake + (big ? 18 : 0.7));
  g.flash = Math.max(g.flash, big ? 1 : 0.08);
  if (g.rings.length < 8 && (big || Math.random() < 0.15)) g.rings.push({ x: x0, y: y0, r: 0, R: R * (big ? 3 : 2.2), t: 0 });
  peasantsBlast(g, x0, y0, R, P);
  ducksBlast(g, x0, y0, R, P);
}

function sandNuke(g, i) {
  var gw = g.gw, x0 = i % gw, y0 = (i / gw) | 0, x, y, j;
  g.m[i] = MAT.EMPTY;
  sandBoom(g, i, 34, 4.2);
  g.fx.bigboom++;
  /* the mushroom: a stalk and a cap of slow, long-lived smoke that starts out glowing */
  var cy = y0 - 42;
  for (y = cy - 12; y <= y0; y++) for (x = x0 - 26; x <= x0 + 26; x++) {
    if (x < 0 || y < 0 || x >= gw || y >= g.gh) continue;
    var ex = (x - x0) / 24, ey = (y - cy) / 11, wob = Math.sin(x * 0.7) * 0.12 + Math.random() * 0.25;
    var cap = ex * ex + ey * ey < 1 + wob - (y > cy + 4 ? 0.6 : 0);
    var stalk = y > cy && Math.abs(x - x0) < 4 + (y - cy) * 0.12 + Math.random() * 2;
    if (!cap && !stalk) continue;
    if (Math.random() < 0.12) continue;
    j = y * gw + x;
    if (g.m[j] !== MAT.EMPTY && g.m[j] !== MAT.FIRE && g.m[j] !== MAT.SMOKE) continue;
    sandSet(g, j, MAT.SMOKE); g.aux[j] = 140 + irnd(110);
  }
  peasantsReact(g, "nuke", x0, y0);
  achieve(g, "nuke");
}

/* fireworks: a cell becomes a rocket, a rocket becomes a flower made of sparks */
function sandLaunch(g, j) {
  var x = j % g.gw, y = (j / g.gw) | 0;
  g.m[j] = MAT.EMPTY;
  partAdd(g, PK_ROCKET, x + 0.5, y, (Math.random() - 0.5) * 0.5, -1, 35 + irnd(35), SPARK_HOT[3], 0);
  g.fx.whistle++;
}
function fwBurst(g, x, y) {
  var c1 = pick(FW_COLORS), c2 = pick(FW_COLORS), style = irnd(3), n = 70 + irnd(50), k, a, s;
  for (k = 0; k < n; k++) {
    a = Math.random() * 6.2832;
    s = style === 0 ? 0.4 + Math.random() * 1.3 : (style === 1 ? 1.3 + Math.random() * 0.15 : (k & 1 ? 1.4 : 0.7));
    partAdd(g, PK_SPARK, x, y, Math.cos(a) * s, Math.sin(a) * s - 0.2, 40 + irnd(40), (k & 1) ? c1 : c2);
  }
  g.fx.burst++;
  g.flash = Math.max(g.flash, 0.12);
  g.fwGlow = { x: x, y: y, t: 1, c: c1 };
  peasantsReact(g, "firework", x, y);
  ducksScare(g, x, y, 50);
}

/* lightning: walks down out of the sky at x until it hits something */
function sandLightning(g, cx) {
  var gw = g.gw, gh = g.gh, m = g.m, x = clamp(Math.round(cx) + irnd(11) - 5, 0, gw - 1), y = -6, pts = [[x, y]], hit = null, s;
  while (!hit) {
    var step = 2 + irnd(5);
    for (s = 0; s < step; s++) {
      y++;
      if (y >= gh - 1) { hit = { x: x, y: gh - 1 }; break; }
      if (y >= 0 && !AIRY[m[y * gw + x]]) { hit = { x: x, y: y }; break; }
      var p = y >= 0 ? peasantAt(g, x, y) : null;
      if (p) { hit = { x: x, y: y, p: p }; break; }
    }
    pts.push([x, y]);
    x = clamp(x + irnd(5) - 2 + (x < cx - 3 ? 1 : (x > cx + 3 ? -1 : 0)), 0, gw - 1);
  }
  /* a couple of forks, for looks */
  var forks = [];
  for (s = 0; s < 3; s++) {
    var f0 = pts[1 + irnd(Math.max(1, pts.length - 2))], fx = f0[0], fy = f0[1], fp = [[fx, fy]];
    for (var q = 0; q < 3 + irnd(4); q++) { fx += irnd(7) - 3; fy += 2 + irnd(4); fp.push([fx, fy]); }
    forks.push(fp);
  }
  g.bolts.push({ pts: pts, forks: forks, t: 1 });
  g.flash = Math.max(g.flash, 0.55);
  g.shake = Math.min(10, g.shake + 4);
  g.fx.thunder++;

  /* what it did when it got there: a few thousand degrees, for an instant, right where it hit */
  var R = 4, dx, dy, j, t, wet = -1, d2;
  for (dy = -R; dy <= R; dy++) for (dx = -R; dx <= R; dx++) {
    d2 = dx * dx + dy * dy;
    if (d2 > R * R) continue;
    var xx = hit.x + dx, yy = hit.y + dy;
    if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) continue;
    j = yy * gw + xx; t = m[j];
    if (t === MAT.INERT) continue;
    heatAdd(g, j, (t === MAT.METAL ? 1200 : 2600) * (1 - d2 / (R * R + 1)));
    if (t === MAT.SAND && Math.random() < 0.8) heatForce(g, j, MAT.GLASS);
    else if (WET[t] || t === MAT.ACID || t === MAT.METAL) {
      /* some of the water flashes to steam. the current runs on through whatever is still water */
      if (t !== MAT.METAL && Math.random() < 0.15) heatForce(g, j, t === MAT.SALTWATER ? MAT.SALT : MAT.STEAM);
      else if (wet < 0) wet = j;
    }
    else if (t === MAT.ICE || t === MAT.SNOW) heatForce(g, j, MAT.WATER);
    else if (t === MAT.EMPTY && Math.random() < 0.1) sandSet(g, j, MAT.FIRE);
    else if (t === MAT.WOOD && Math.random() < 0.5) m[j] = MAT.EMBER;
    else if (t !== MAT.EMPTY) sandIgnite(g, j);
    heatAccept(g, j);
  }
  sparks(g, hit.x + 0.5, hit.y, 30, 1.6, [hex32("#ffffff"), hex32("#c8e0ff"), hex32("#80b0ff")], 10, 0.8);
  /* water conducts: every peasant in the same pond gets it too. so does metal */
  if (wet >= 0) sandConduct(g, wet);
  peasantsZapNear(g, hit.x, hit.y, 7);
  ducksZapNear(g, hit.x, hit.y, 5);
}
var CONDUCTS = new Uint8Array(32);
[MAT.WATER, MAT.SALTWATER, MAT.ACID, MAT.METAL].forEach(function (v) { CONDUCTS[v] = 1; });
/* flood out through connected water (and metal), mark it, light it up for a moment */
function sandConduct(g, start) {
  var gw = g.gw, gh = g.gh, m = g.m, mark = g.zmark, list = g.zlist, n = 0, head = 0, j, x, y, k, nb, t;
  list[n++] = start; mark[start] = 1;
  while (head < n && n < list.length - 4) {
    j = list[head++]; x = j % gw; y = (j / gw) | 0;
    for (k = 0; k < 4; k++) {
      nb = sandNb(g, x, y, k);
      if (nb < 0 || mark[nb]) continue;
      t = m[nb];
      if (CONDUCTS[t]) { mark[nb] = 1; list[n++] = nb; }
    }
  }
  peasantsZapMarked(g);
  ducksZapMarked(g);
  g.zn = n; g.zt = 1;
  for (k = 0; k < n; k++) mark[list[k]] = 0;
}

/* -------------------------------------------------------------------
   5. THE RULES, one function per family of thing
   ------------------------------------------------------------------- */
function sandFire(g, i, x, y) {
  var m = g.m, j, k, n, r, fed = false;
  /* eats whatever is next to it first, so a spark never dies before it touches the powder.
     a fire with something to eat beside it does not burn out while it is eating */
  for (k = 0; k < 4; k++) {
    j = sandNb(g, x, y, k);
    if (j < 0) continue;
    n = m[j]; r = Math.random();
    if (n === MAT.OIL || n === MAT.WOOD || n === MAT.PLANT || n === MAT.FLOWER || n === MAT.SEED) fed = true;
    if (n === MAT.OIL && r < 0.3) m[j] = MAT.FIRE;
    else if (n === MAT.GAS) { m[j] = MAT.FIRE; g.sh[j] = SAND_CLEAN; g.fx.whoosh++; }
    else if (n === MAT.WOOD && r < 0.03) m[j] = MAT.EMBER;
    else if ((n === MAT.PLANT || n === MAT.FLOWER || n === MAT.SEED) && r < 0.08) m[j] = MAT.FIRE;
    else if (n === MAT.GUNPOWDER) { sandBoom(g, j); return; }
    else if (n === MAT.FIREWORK) sandLaunch(g, j);
    else if (n === MAT.NUKE) { sandNuke(g, j); return; }
    else if (WET[n] && r < 0.1) { heatBecome(g, i, MAT.SMOKE); g.fx.hiss++; return; }   /* put out: just hot smoke now */
  }
  /* a clean flame (off a torch, or out of a gas cloud) burns longer, climbs faster,
     and leaves no ash. fire's shade is free, since fire flickers: it holds the flag */
  var clean = g.sh[i] >= SAND_CLEAN;
  if (Math.random() < (fed ? 0.04 : (clean ? 0.11 : 0.15))) {
    r = Math.random();
    m[i] = (r < 0.3 && !clean && g.sh[i] < 128) ? MAT.ASH : (r < 0.45 ? MAT.SMOKE : MAT.EMPTY);
    /* the flame's heat stays where it was, as hot air (or smoke), and rises */
    g.aux[i] = 0;
    return;
  }
  /* licks upward into empty air, wavering as it goes */
  r = Math.random();
  if (r < (clean ? 0.6 : 0.35) && y > 0) {
    var nx = x + (r < 0.06 ? -1 : (r < 0.12 ? 1 : 0));
    if (nx < 0 || nx >= g.gw) return;
    j = (y - 1) * g.gw + nx;
    if (sandEmpty(g, j)) sandSwap(g, i, j);
  }
}

/* steam rises. it turns back into water when it has cooled off enough: that is in heat.js */
function sandSteam(g, i, x, y) {
  var j, t, nx, dd;
  if (y === 0) return;
  j = sandNb(g, x, y, 0);
  if (j >= 0 && sandEmpty(g, j)) { sandSwap(g, i, j); return; }
  dd = Math.random() < 0.5 ? -1 : 1;
  for (t = 0; t < 2; t++, dd = -dd) {
    nx = x + dd;
    if (nx < 0 || nx >= g.gw) continue;
    j = (y - 1) * g.gw + nx;
    if (sandEmpty(g, j)) { sandSwap(g, i, j); return; }
  }
  for (t = 0; t < 2; t++, dd = -dd) {
    nx = x + dd;
    if (nx < 0 || nx >= g.gw) continue;
    j = y * g.gw + nx;
    if (sandEmpty(g, j)) { sandSwap(g, i, j); return; }
  }
}

/* smoke: rises like steam, wobbles, and just goes away. it never rains. smoke with a
   number in aux (a mushroom cloud) hangs about for that many ticks first, and rises slowly */
function sandSmoke(g, i, x, y) {
  var j, dd, nx, t, a = g.aux[i];
  if (a) {
    /* mushroom smoke holds its shape and drifts up as one */
    g.aux[i] = a - 1;
    if (y > 0 && Math.random() < 0.12) { j = i - g.gw; if (sandEmpty(g, j)) sandSwap(g, i, j); }
    return;
  }
  if (Math.random() < 0.03 || (y === 0 && Math.random() < 0.3)) { g.m[i] = MAT.EMPTY; return; }
  if (y === 0 || Math.random() < 0.3) return;
  dd = Math.random() < 0.5 ? -1 : 1;
  j = sandNb(g, x, y, 0);
  if (j >= 0 && Math.random() < 0.6 && sandEmpty(g, j)) { sandSwap(g, i, j); return; }
  for (t = 0; t < 2; t++, dd = -dd) {
    nx = x + dd;
    if (nx < 0 || nx >= g.gw) continue;
    j = (Math.random() < 0.6 ? y - 1 : y) * g.gw + nx;
    if (sandEmpty(g, j)) { sandSwap(g, i, j); return; }
  }
}

/* gas: a lazy random walk with a slight lean upward, so it pools under ceilings.
   it does not fade. it waits. anything warm next to it and it all goes at once. */
function sandGas(g, i, x, y) {
  var m = g.m, j, r, nx = x, ny = y;
  if (sandHotNb(g, x, y) >= 0) { m[i] = MAT.FIRE; g.sh[i] = SAND_CLEAN; g.fx.whoosh++; return; }
  if (Math.random() < 0.4) return;
  r = Math.random();
  if (r < 0.35) ny--; else if (r < 0.45) ny++; else nx += r < 0.725 ? -1 : 1;
  if (nx < 0 || ny < 0 || nx >= g.gw || ny >= g.gh) return;
  j = ny * g.gw + nx;
  if (m[j] === MAT.EMPTY) sandSwap(g, i, j);
}

/* where a liquid may go: empty air, or a lighter gas it can push past. never another
   liquid: that would starve the lighter one of its turn to rise. */
function sandFlows(g, v, j) {
  var t = g.m[j];
  return t === MAT.EMPTY || (!LIQUID[t] && sandCan(g, v, j));
}

/* a liquid slides along the surface it is lying on, up to a few cells at a time.
   one cell a tick looks like treacle; this is what makes a puddle level out.
   it stops at the first hole it comes to and drops into it next tick, instead of
   skating over the hole, or off the end of a ledge into thin air. */
function sandSpread(g, i, x, y, range) {
  var gw = g.gw, v = g.m[i], dd = Math.random() < 0.5 ? -1 : 1, t, s, nx, j, best, reach = 1 + irnd(range);
  for (t = 0; t < 2; t++, dd = -dd) {
    best = -1;
    for (s = 1; s <= reach; s++) {
      nx = x + dd * s;
      if (nx < 0 || nx >= gw) break;
      j = y * gw + nx;
      if (!sandFlows(g, v, j)) break;
      best = j;
      if (y + 1 < g.gh && sandFlows(g, v, j + gw)) break;
    }
    if (best >= 0) { sandSwap(g, i, best); return true; }
  }
  return false;
}

/* down and to one side, for when straight down is blocked. without it a liquid
   cannot find its way through a crack that runs diagonally. */
function sandSlide(g, i, x, y) {
  var v = g.m[i], dd = Math.random() < 0.5 ? -1 : 1, t, nx, j;
  if (y + 1 >= g.gh) return false;
  for (t = 0; t < 2; t++, dd = -dd) {
    nx = x + dd;
    if (nx < 0 || nx >= g.gw) continue;
    j = (y + 1) * g.gw + nx;
    if (sandFlows(g, v, j)) { sandSwap(g, i, j); return true; }
  }
  return false;
}

/* pressure. a cell-by-cell liquid only ever looks at its neighbours, so the two arms
   of a U-bend never level out: the high side just sits there. so a few times a tick,
   a resting cell on the surface of a pool feels its way down through the pool for a
   free cell lower than itself, anywhere along the pool's edge, and goes there. the
   high side drains, the low side fills, and they stop when they are level.
   it only feels through liquid that is sitting still (a falling stream carries no
   pressure), and only lands somewhere with something under it, so it does not
   conjure spray out of thin air. the surface cells to try are picked at random,
   during the step, from all of them. */
var PRESS_TRIES = 12, PRESS_SCAN = 1500;
function sandPressureCandidate(g, i) {
  var n = ++g.pressN;
  if (n <= PRESS_TRIES) g.pressList[n - 1] = i;
  else { n = irnd(n); if (n < PRESS_TRIES) g.pressList[n] = i; }
}
function sandPressure(g, i) {
  var gw = g.gw, gh = g.gh, m = g.m, v = m[i], x = i % gw, y = (i / gw) | 0;
  var mark = g.pmark, stack = g.pstack, gen = ++g.pgen, sp = 0, seen = 0, j, jx, jy, k, nb, t;
  /* left or right first is decided once per search, so it sweeps instead of wandering */
  var side = Math.random() < 0.5 ? -1 : 1;
  if (gen >= 0xffffffff) { mark.fill(0); g.pgen = gen = 1; }
  mark[i] = gen; stack[sp++] = i;
  while (sp > 0 && seen < PRESS_SCAN) {
    j = stack[--sp]; seen++;
    jx = j % gw; jy = (j / gw) | 0;
    /* pushed up, sideways, then down, so down is searched first */
    for (k = 0; k < 4; k++) {
      if (k === 0) nb = jy > 0 ? j - gw : -1;
      else if (k === 3) nb = jy < gh - 1 ? j + gw : -1;
      else { var nx = jx + (k === 1 ? -side : side); nb = nx >= 0 && nx < gw ? j - jx + nx : -1; }
      if (nb < 0 || mark[nb] === gen) continue;
      mark[nb] = gen;
      t = m[nb];
      if (t === v) { if (!g.vy[nb]) stack[sp++] = nb; }
      else if (t === MAT.EMPTY && ((nb / gw) | 0) > y && (nb + gw >= m.length || !AIRY[m[nb + gw]])) {
        sandSwap(g, i, nb); g.vy[nb] = 0; return true;
      }
    }
  }
  return false;
}

/* a light thing under a heavier one swaps places with it: that is floating */
function sandFloat(g, i, x, y) {
  var j = sandNb(g, x, y, 0), v = g.m[i];
  if (j >= 0 && g.stamp[j] !== g.tick && SAND_FREE[g.m[j]] === 1 && SAND_DENS[g.m[j]] > SAND_DENS[v] &&
      (FLUID[g.m[j]] || FLUID[v]) && Math.random() < 0.5) {
    sandSwap(g, i, j); return true;
  }
  return false;
}

/* sand, ash, gunpowder, salt, seeds, fireworks, nukes: fall, slide off piles, sink */
function sandPowder(g, i, x, y) {
  var m = g.m, v = m[i], j, t, nx, ny, dd, sp;
  if (v === MAT.GUNPOWDER) {
    if (sandHotNb(g, x, y) >= 0) { sandBoom(g, i); return; }
  } else if (v === MAT.FIREWORK) {
    /* a fuse that burns down while it sits, fizzing. or right now, if it is warm */
    if (sandHotNb(g, x, y) >= 0 || g.aux[i] > 60 + (g.sh[i] & 63)) { sandLaunch(g, i); return; }
    g.aux[i]++;
    if (Math.random() < 0.12) partAdd(g, PK_SPARK, x + 0.5, y, (Math.random() - 0.5) * 0.6, -0.4 - Math.random() * 0.4, 5 + irnd(8), pick(SPARK_HOT));
  } else if (v === MAT.NUKE) {
    if (sandHotNb(g, x, y) >= 0 || g.aux[i] >= 254) { sandNuke(g, i); return; }
    g.aux[i]++;
    sp = g.vy[i];
    if (y + 1 < g.gh && sandFall(g, i, x, y, v)) return;
    if (sp >= 6 && y + 1 < g.gh && !AIRY[m[i + g.gw]] && g.aux[i] < 200) g.aux[i] = 200;   /* it landed hard: hurry up */
    return;
  } else if (v === MAT.SALT) {
    /* salt on ice: the ice turns to brine, which stays runny down to -21. it does not
       warm up to do it, either: the brine is as cold as the ice was */
    j = sandHas(g, x, y, MAT.ICE);
    if (j < 0) j = sandHas(g, x, y, MAT.SNOW);
    if (j >= 0 && Math.random() < 0.08) { heatBecome(g, j, MAT.SALTWATER); m[i] = MAT.EMPTY; g.score++; return; }
    j = sandHas(g, x, y, MAT.PLANT);
    if (j < 0) j = sandHas(g, x, y, MAT.FLOWER);
    if (j >= 0 && Math.random() < 0.08) { m[j] = MAT.EMPTY; m[i] = MAT.EMPTY; g.score++; return; }
    /* one grain to one cell of water, and then it is full up */
    j = sandHas(g, x, y, MAT.WATER);
    if (j >= 0 && Math.random() < 0.02) { m[j] = MAT.SALTWATER; m[i] = MAT.EMPTY; return; }
  } else if (v === MAT.SEED && y + 1 < g.gh) {
    /* a seed sitting on soil, with water touching it, sprouts. the number it is
       given is how tall it is going to get. */
    t = m[i + g.gw];
    if ((t === MAT.SAND || t === MAT.ASH || t === MAT.PLANT) && sandHas(g, x, y, MAT.WATER) >= 0 && Math.random() < 0.04) {
      m[i] = MAT.PLANT; g.aux[i] = 12 + irnd(30); g.score++; return;
    }
  }
  if (y + 1 < g.gh && sandFall(g, i, x, y, v)) return;
  if (sandFloat(g, i, x, y)) return;
  dd = Math.random() < 0.5 ? -1 : 1;
  for (t = 0; t < 2; t++, dd = -dd) {
    nx = x + dd; ny = y + 1;
    if (nx < 0 || nx >= g.gw || ny >= g.gh) continue;
    j = ny * g.gw + nx;
    if (sandCan(g, v, j)) { sandSwap(g, i, j); return; }
  }
}

/* water, oil, acid, lava: fall, float, then spread sideways into empty air. lava does it slowly.
   liquids never shove each other sideways: that would starve the lighter one of its turn to rise. */
function sandLiquid(g, i, x, y) {
  var m = g.m, v = m[i], j, k, t, r, p, gone = false;
  /* water freezing, boiling, and melting ice is all heat now: see heat.js */
  if (v === MAT.SALTWATER) {
    /* salt spreads through fresh water, slowly, a swap at a time */
    if (Math.random() < 0.03) {
      j = sandNb(g, x, y, irnd(4));
      if (j >= 0 && m[j] === MAT.WATER && g.stamp[j] !== g.tick) { sandSwap(g, i, j); return; }
    }
  } else if (v === MAT.LAVA) {
    /* water on lava flashes to steam, and every bit of the heat it takes to boil it comes out of the
       lava. enough water and the top of the lava cools past setting and crusts over, and the crust goes
       on boiling the water above it while the lava under it stays molten for a good while */
    j = sandWet(g, x, y);
    if (j >= 0 && Math.random() < 0.12) {
      /* what it takes to bring this water to the boil and boil it. both brought up to date first */
      heatSync(g, i); heatSync(g, j);
      var w = m[j], qw = heatQ(g, j);
      var need = HEAT_C[w] * (HEAT_HI[w] - AMBIENT) + heatLat(g, j, HEAT_HI_L[w]) + heatH0(w, 0, g.sh[j]) - qw;
      if (need > 0 && g.T[i] - need * HEAT_IC[v] > HEAT_HI[w]) {
        g.T[i] -= need * HEAT_IC[v];
        g.T[j] = HEAT_HI[w]; g.lat[j] = 0; heatAccept(g, j);
        var paid = heatUp(g, j, w);
        heatSetQ(g, j, qw + need - paid);
        g.score++; g.fx.hiss++;
      }
    }
    for (k = 0; k < 4; k++) {
      j = sandNb(g, x, y, k);
      if (j < 0) continue;
      t = m[j]; r = Math.random();
      if ((t === MAT.OIL && r < 0.1) || ((t === MAT.PLANT || t === MAT.FLOWER || t === MAT.SEED) && r < 0.05) ||
          (t === MAT.WOOD && r < 0.02)) m[j] = t === MAT.WOOD ? MAT.EMBER : MAT.FIRE;
      else if (t === MAT.GUNPOWDER) sandBoom(g, j);
      else if (t === MAT.FIREWORK) sandLaunch(g, j);
      else if (t === MAT.NUKE) sandNuke(g, j);
    }
    if (m[i] !== v) return;   /* a neighbouring explosion got to it */
  } else if (v === MAT.ACID) {
    for (k = 0; k < 4 && !gone; k++) {
      j = sandNb(g, x, y, k);
      if (j < 0) continue;
      t = m[j]; p = 0;
      if (t === MAT.STONE) p = 0.006;
      else if (t === MAT.METAL) p = 0.003;
      else if (t === MAT.SAND || t === MAT.WOOD || t === MAT.PLANT || t === MAT.ICE || t === MAT.SEED ||
               t === MAT.FLOWER || t === MAT.GUNPOWDER || t === MAT.ASH || t === MAT.SNOW) p = 0.04;
      if (p && Math.random() < p) {
        m[j] = MAT.EMPTY;
        if (Math.random() < 0.3) gone = true;   /* acid is used up eating things */
      }
    }
    if (gone) { m[i] = MAT.EMPTY; return; }
  }

  if (y + 1 < g.gh && sandFall(g, i, x, y, v)) return;
  if (sandFloat(g, i, x, y)) return;
  /* lava is thick, and gets thicker as it cools: at 1300 it creeps, near setting it barely moves */
  if (v === MAT.LAVA && Math.random() > clamp((g.T[i] - LAVA_LO[g.aux[i] & 31]) / 1000, 0.04, 0.45)) return;
  if (sandSlide(g, i, x, y)) return;
  if (sandSpread(g, i, x, y, v === MAT.LAVA ? 1 : (WET[v] ? 7 : 4))) return;
  /* nowhere to go. if it is on top, it may be under pressure from a higher pool. lava is too thick to care */
  if (v !== MAT.LAVA && y > 0 && g.m[i - g.gw] === MAT.EMPTY) sandPressureCandidate(g, i);
}

/* a growing stalk: the tip carries a number, puts a new tip above itself (or a
   little to one side) with one less, and hands over. at zero it flowers. */
function sandGrow(g, i, x, y, b) {
  var m = g.m, gw = g.gw, r = Math.random(), nx = x + (r < 0.6 ? 0 : (r < 0.8 ? -1 : 1)), ny = y - 1, j, lx, lj;
  if (ny < 0 || nx < 0 || nx >= gw) { g.aux[i] = 0; return; }
  j = ny * gw + nx;
  if (m[j] !== MAT.EMPTY && m[j] !== MAT.WATER) {
    if (Math.random() < 0.05) g.aux[i] = 0;   /* blocked for long enough: give up */
    return;
  }
  sandSet(g, j, MAT.PLANT); g.stamp[j] = g.tick; g.aux[i] = 0;
  if (b <= 1) { sandBloom(g, nx, ny); return; }
  g.aux[j] = b - 1;
  /* a leaf now and then. some leaves are branches and get a flower of their own */
  if (b > 4 && Math.random() < 0.2) {
    lx = x + (Math.random() < 0.5 ? -1 : 1); lj = y * gw + lx;
    if (lx >= 0 && lx < gw && m[lj] === MAT.EMPTY) {
      sandSet(g, lj, MAT.PLANT);
      if (Math.random() < 0.3) g.aux[lj] = 2 + irnd(b >> 1);
    }
  }
}
function sandBloom(g, x, y) {
  var c = 1 + irnd(5), P5 = [[0, 0], [-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1], [0, -2], [-2, -1], [2, -1], [0, 1]];
  for (var k = 0; k < P5.length; k++) {
    var nx = x + P5[k][0], ny = y + P5[k][1];
    if (nx < 0 || ny < 0 || nx >= g.gw || ny >= g.gh) continue;
    var j = ny * g.gw + nx;
    if (k && g.m[j] !== MAT.EMPTY) continue;
    g.m[j] = MAT.FLOWER; g.aux[j] = 0;
    g.sh[j] = irnd(42) * 6 + (k === 0 ? 0 : c);   /* shade % 6 is the colour */
  }
  g.score += 3; g.fx.bloom++;
  peasantsReact(g, "flower", x, y);
  achieve(g, "bloom");
}

/* things that do not move, but do things anyway */
function sandStatic(g, i, x, y) {
  var m = g.m, v = m[i], j, k, t, r;
  if (v === MAT.PLANT) {
    if (g.aux[i]) { if (Math.random() < 0.15) sandGrow(g, i, x, y, g.aux[i]); return; }
    /* salt water does not feed a plant. it kills it */
    if (sandHas(g, x, y, MAT.SALTWATER) >= 0 && Math.random() < 0.01) { m[i] = MAT.EMPTY; return; }
    j = sandHas(g, x, y, MAT.WATER);
    if (j >= 0 && Math.random() < 0.05) {
      var s0 = (Math.random() * 4) | 0;
      for (k = 0; k < 4; k++) {
        var q = sandNb(g, x, y, (s0 + k) & 3);
        if (q >= 0 && m[q] === MAT.EMPTY) {
          sandSet(g, q, MAT.PLANT); g.score++;
          if (Math.random() < 0.5) m[j] = MAT.EMPTY;
          break;
        }
      }
    }
  } else if (v === MAT.EMBER) {
    /* burning wood: glows for a few seconds, lights its neighbours, then falls to ash */
    for (k = 0; k < 4; k++) {
      j = sandNb(g, x, y, k);
      if (j < 0) continue;
      t = m[j]; r = Math.random();
      if (WET[t]) {
        /* doused: the ember goes out, and its heat goes into the water, all at once. a lot of
           embers will boil it */
        heatBecome(g, i, MAT.ASH); heatShare(g, i, j);
        g.score++; g.fx.hiss++; return;
      }
      else if (t === MAT.WOOD && r < 0.015) m[j] = MAT.EMBER;
      else if ((t === MAT.OIL && r < 0.3) || ((t === MAT.PLANT || t === MAT.FLOWER) && r < 0.1)) m[j] = MAT.FIRE;
      else if (t === MAT.GUNPOWDER) { sandBoom(g, j); return; }
      else if (t === MAT.FIREWORK) sandLaunch(g, j);
      else if (t === MAT.NUKE) { sandNuke(g, j); return; }
    }
    j = sandNb(g, x, y, 0);
    if (j >= 0 && m[j] === MAT.EMPTY && Math.random() < 0.05) sandSet(g, j, Math.random() < 0.3 ? MAT.SMOKE : MAT.FIRE);
    if (Math.random() < 0.005) m[i] = MAT.ASH;
  } else if (v === MAT.TORCH) {
    j = sandNb(g, x, y, 0);
    /* its own ash would smother it, so it burns that off too */
    if (j >= 0 && (m[j] === MAT.ASH || m[j] === MAT.SMOKE)) m[j] = MAT.EMPTY;
    for (k = -1; k <= 1 && y > 0; k++) {
      if (x + k < 0 || x + k >= g.gw) continue;
      j = i - g.gw + k;
      if (m[j] === MAT.EMPTY && Math.random() < (k ? 0.2 : 0.7)) { sandSet(g, j, MAT.FIRE); g.sh[j] = SAND_CLEAN; g.stamp[j] = g.tick; }
    }
  } else if (v === MAT.CLONER) {
    var a = g.aux[i];
    if (!a && ((g.tick + i) & 7) === 0 && g.peasants.length) {
      var tp = peasantAt(g, x, y - 1, 1);
      if (tp) { g.aux[i] = CLONE_PEASANT; g.cloneSrc[i] = pRecipe(tp); return; }
    }
    if (a === CLONE_PEASANT) {
      /* a peasant factory: copies of whoever touched it first. rate-limited, because the village is small */
      var src = g.cloneSrc[i];
      if (!src) { g.aux[i] = 0; return; }
      if (Math.random() < 0.004 && y > 9 && !SOLID[g.m[i - g.gw]]) {
        var np = peasantClone(g, src, x + 0.5, y - 1);
        if (np) { pSay(g, np, "clone", false); achieve(g, "factory"); g.fx.pop++; }
      }
      return;
    }
    if (!a) {
      for (k = 0; k < 4; k++) {
        j = sandNb(g, x, y, k);
        if (j < 0) continue;
        t = m[j];
        if (t !== MAT.EMPTY && t !== MAT.CLONER && t !== MAT.FAUCET && t !== MAT.DRAIN && t !== MAT.STONE &&
            t !== MAT.WOOD && t !== MAT.GLASS && t !== MAT.EMBER && t !== MAT.TORCH && t !== MAT.FLOWER && t !== MAT.METAL &&
            t !== MAT.INERT) { g.aux[i] = t; break; }
      }
    } else if (Math.random() < (a === MAT.NUKE ? 0.004 : 0.35)) {
      j = sandNb(g, x, y, irnd(4));
      if (j >= 0 && m[j] === MAT.EMPTY) { sandPlace(g, j, a); g.stamp[j] = g.tick; }
    }
  } else if (v === MAT.FAUCET) {
    j = i + g.gw;
    if (y + 1 < g.gh && m[j] === MAT.EMPTY && Math.random() < 0.5) sandPlace(g, j, MAT.WATER);
  } else if (v === MAT.DRAIN) {
    for (k = 0; k < 4; k++) {
      j = sandNb(g, x, y, k);
      if (j < 0) continue;
      t = m[j];
      if (t === MAT.EMPTY || t === MAT.STONE || t === MAT.WOOD || t === MAT.ICE || t === MAT.TORCH ||
          t === MAT.FAUCET || t === MAT.DRAIN || t === MAT.GLASS || t === MAT.CLONER || t === MAT.METAL || t === MAT.INERT) continue;
      if (Math.random() < 0.5) m[j] = MAT.EMPTY;
    }
  }
}

function sandStep(g) {
  var gw = g.gw, gh = g.gh, m = g.m, st = g.stamp, T = ++g.tick, y, xi, x, i, v, k;
  g.parity ^= 1;
  g.pressN = 0;
  /* bottom to top, alternating left and right, so nothing gets a free ride */
  for (y = gh - 1; y >= 0; y--) {
    var flip = ((y + g.parity) & 1) === 1, row = y * gw;
    for (xi = 0; xi < gw; xi++) {
      x = flip ? gw - 1 - xi : xi;
      i = row + x;
      v = m[i];
      if (v === MAT.EMPTY || v === MAT.STONE || v === MAT.WOOD || v === MAT.GLASS || v === MAT.FLOWER || v === MAT.METAL || v === MAT.INERT) continue;
      if (st[i] === T) continue;
      if (v === MAT.FIRE) sandFire(g, i, x, y);
      else if (v === MAT.SMOKE) sandSmoke(g, i, x, y);
      else if (v === MAT.STEAM) sandSteam(g, i, x, y);
      else if (v === MAT.GAS) sandGas(g, i, x, y);
      else if (v === MAT.SAND || v === MAT.ASH || v === MAT.GUNPOWDER || v === MAT.SALT || v === MAT.SEED ||
               v === MAT.FIREWORK || v === MAT.NUKE || v === MAT.SNOW) sandPowder(g, i, x, y);
      else if (LIQUID[v]) sandLiquid(g, i, x, y);
      else sandStatic(g, i, x, y);
    }
  }
  /* the pressure tries, once everything else has had its go. a cell may have moved
     or changed since it was picked, so check it is still a liquid on top */
  for (k = Math.min(g.pressN, PRESS_TRIES) - 1; k >= 0; k--) {
    i = g.pressList[k]; v = m[i];
    if (LIQUID[v] && v !== MAT.LAVA && i >= gw && m[i - gw] === MAT.EMPTY) sandPressure(g, i);
  }
  /* and then the heat moves, and whatever got too hot or too cold changes */
  heatStep(g);
}

/* -------------------------------------------------------------------
   6. A STARTER VILLAGE: rolling stone, a skin of sand, a pond in the
      lowest dip, a tree that is asking for it, a couple of huts, and
      the people who live in them
   ------------------------------------------------------------------- */
function sandClear(g) {
  g.m.fill(0); g.aux.fill(0); g.vy.fill(0); g.np = 0;
  g.T.fill(AMBIENT); g.lat.fill(0); heatAcceptAll(g);
  /* and the bangs still in the air */
  g.bolts.length = 0; g.rings.length = 0; g.flash = 0; g.shake = 0; g.fwGlow = null; g.zn = 0; g.zt = 0;
  g.cloneSrc = {};
}

function sandLandscape(g) {
  var gw = g.gw, gh = g.gh, m = g.m, x, y, top = [], ph = Math.random() * 6, lo = 0, k, dx, dy;
  sandClear(g);
  var hgt = [];
  for (x = 0; x < gw; x++) hgt[x] = gh - 22 - Math.round(Math.sin(x * 0.07 + ph) * 7 + Math.sin(x * 0.023 + ph * 2) * 13);
  /* flat plots for the huts, away from the edges */
  var huts = [], hutW = 22;
  for (k = 0; k < 2; k++) {
    for (var tries = 0; tries < 30; tries++) {
      var hx = 14 + irnd(gw - hutW - 28), ok = true;
      for (var q = 0; q < huts.length; q++) if (Math.abs(huts[q] - hx) < hutW + 30) ok = false;
      if (ok) { huts.push(hx); break; }
    }
  }
  huts.forEach(function (hx) {
    var lvl = 0; for (var xx = hx; xx < hx + hutW; xx++) lvl += hgt[xx]; lvl = Math.round(lvl / hutW);
    for (xx = hx - 6; xx < hx + hutW + 6; xx++) {
      var e = xx < hx ? (hx - xx) / 6 : (xx >= hx + hutW ? (xx - hx - hutW + 1) / 6 : 0);
      if (xx >= 0 && xx < gw) hgt[xx] = Math.round(lerp(lvl, hgt[xx], e));
    }
  });
  for (x = 0; x < gw; x++) {
    for (y = hgt[x]; y < gh; y++) m[y * gw + x] = MAT.STONE;
    for (y = hgt[x] - 5; y < hgt[x]; y++) m[y * gw + x] = MAT.SAND;
    top[x] = hgt[x] - 5;
  }
  /* fill the deepest dip, away from the huts, up to just under its lip */
  for (x = 0; x < gw; x++) {
    var nearHut = false;
    for (k = 0; k < huts.length; k++) if (x > huts[k] - 12 && x < huts[k] + hutW + 12) nearHut = true;
    if (!nearHut && top[x] > top[lo]) lo = x;
  }
  var L = top[lo] - 9, x0 = lo, x1 = lo;
  while (x0 > 0 && top[x0 - 1] > L) x0--;
  while (x1 < gw - 1 && top[x1 + 1] > L) x1++;
  var pondOK = true;
  for (k = 0; k < huts.length; k++) if (x1 > huts[k] - 4 && x0 < huts[k] + hutW + 4) pondOK = false;
  if (pondOK) for (x = x0; x <= x1; x++) for (y = L; y < top[x]; y++) m[y * gw + x] = MAT.WATER;
  /* huts: wooden walls, a door on one side, a thatched roof that will burn beautifully */
  huts.forEach(function (hx) {
    var base = top[hx + 2], H = 15, door = Math.random() < 0.5;
    for (y = base - H; y < base; y++) {
      if (!(door && y > base - 12)) { m[y * gw + hx] = MAT.WOOD; m[y * gw + hx + 1] = MAT.WOOD; }
      if (!(!door && y > base - 12)) { m[y * gw + hx + hutW - 1] = MAT.WOOD; m[y * gw + hx + hutW - 2] = MAT.WOOD; }
    }
    for (x = hx; x < hx + hutW; x++) m[(base - H) * gw + x] = MAT.WOOD;
    for (dy = 1; dy <= 9; dy++) for (dx = -3 + dy; dx <= hutW + 2 - dy; dx++) {
      var rx = hx + dx, ry = base - H - dy;
      if (rx >= 0 && rx < gw && ry >= 0) m[ry * gw + rx] = MAT.PLANT;
    }
    /* a window */
    m[(base - H + 5) * gw + hx + (door ? hutW - 1 : 0)] = MAT.GLASS;
    m[(base - H + 6) * gw + hx + (door ? hutW - 1 : 0)] = MAT.GLASS;
  });
  /* a tree, somewhere dry and empty */
  for (tries = 0; tries < 40; tries++) {
    var tx = 16 + irnd(gw - 32), clear = true;
    if (pondOK && tx > x0 - 10 && tx < x1 + 10) continue;
    for (k = 0; k < huts.length; k++) if (tx > huts[k] - 14 && tx < huts[k] + hutW + 14) clear = false;
    if (!clear) continue;
    var ty = top[tx];
    for (y = ty - 22; y < ty; y++) for (dx = 0; dx < 3; dx++) m[y * gw + tx + dx] = MAT.WOOD;
    for (dy = -8; dy <= 8; dy++) for (dx = -13; dx <= 15; dx++) {
      if ((dx - 1) * (dx - 1) / 196 + dy * dy / 64 < 1 + Math.random() * 0.25 && ty - 26 + dy >= 0 && tx + dx >= 0 && tx + dx < gw)
        m[(ty - 26 + dy) * gw + tx + dx] = MAT.PLANT;
    }
    break;
  }
  for (var i = 0; i < m.length; i++) g.sh[i] = irnd(256);
  heatReset(g);
  /* and the villagers */
  g.peasants.length = 0; g.ghosts.length = 0; g.held = null;
  for (k = 0; k < 7; k++) {
    for (tries = 0; tries < 20; tries++) {
      x = 6 + irnd(gw - 12);
      if (pondOK && x > x0 - 3 && x < x1 + 3) continue;
      y = top[x] - 1;
      while (y > 10 && SOLID[m[y * gw + x]]) y--;
      peasantSpawn(g, x + 0.5, y, true);
      break;
    }
  }
  /* one of them gets a house */
  if (huts.length) peasantSpawn(g, huts[0] + hutW / 2, top[huts[0] + 2] - 1, true);
  /* and some ducks on the pond */
  duckPond(g, pondOK ? [x0, x1, L] : null);
  /* and one of them has noticed you */
  if (g.peasants.length) g.helloP = g.peasants[irnd(g.peasants.length)];
  g.helloT = 280;
}
