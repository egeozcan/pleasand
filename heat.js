/* =====================================================================
   PLEASAND  --  heat.js

   every cell has a temperature, in degrees, that travels with it when it
   moves. once a tick, heat flows between touching cells, from hot to
   cold, at a rate set by how well both of them carry it (metal: very
   well, air and ash: hardly at all) and lands according to how much it
   takes to warm each one (water: a lot, air: almost nothing). nothing
   is made or lost on the way. heat only leaves (or comes in) at the
   edges of the room, which touch an outside that is always AMBIENT.

   what puts heat in: things that burn (fire and embers give off heat
   while they last, from the fuel they are burning; a torch never runs
   out, which is what a torch is for), bangs, lightning, the HEAT brush,
   and anything you paint, pour or clone, which arrives at its own
   temperature. what takes it out: the edges, the COOL brush, and things
   that leave the world (down a drain), which take their heat with them.
   when a thing turns into another thing it keeps its temperature.

   warm air rises and cold air sinks, carrying its heat with it. so does
   warm water, and warm lava. that is how a pot over a fire boils from
   the bottom up, why a plume climbs off a torch, and why a hot room
   loses its heat out of the top.

   past its melting, boiling or burning point, a cell does not change at
   once. it sits at that temperature and soaks up heat until it has had
   enough (latent heat, kept in g.lat), and only then becomes the next
   thing: ice melts, water boils, stone runs, wood catches. cool it back
   down and it gives exactly that heat back and goes the other way:
   steam rains, lava crusts over, molten glass sets. how much a cell
   soaks up varies a little from cell to cell, so a block does not all
   go at once, but each cell gives back what it took.

   lava is all molten things. what it sets into is in its aux: stone by
   default, or glass, or metal, if that is what was melted.
   ===================================================================== */
"use strict";

var AMBIENT = 20;
var BORDER_K = 0.12;     /* how well the edges of the room let heat out to the outside (or in from it) */
var HEAT_FAST = 8;       /* extra passes for metal, which carries heat faster than one pass a tick can */
var T_MAX = 4000, T_MIN = -273;

/* per thing: heat capacity, conductivity, temperature it is made at */
var HEAT_C = new Float32Array(NMAT), HEAT_K = new Float32Array(NMAT), HEAT_T0 = new Float32Array(NMAT).fill(AMBIENT);
/* above HI it melts / boils / catches, after soaking up HI_L. below LO it sets / freezes / condenses, after giving up LO_L */
var HEAT_HI = new Float32Array(NMAT).fill(1e9), HEAT_HI_L = new Float32Array(NMAT);
var HEAT_LO = new Float32Array(NMAT).fill(-1e9), HEAT_LO_L = new Float32Array(NMAT);
/* things that burn: as hot as their flame gets, and how much heat a tick they can put out getting there */
var HEAT_SRC = new Float32Array(NMAT), HEAT_POW = new Float32Array(NMAT);
/* lava sets at a temperature that depends on what it is made of */
var LAVA_LO = new Float32Array(NMAT).fill(950);
LAVA_LO[MAT.GLASS] = 1150; LAVA_LO[MAT.METAL] = 1400;

(function () {
  function def(v, c, k, t0) { HEAT_C[v] = c; HEAT_K[v] = k; if (t0 != null) HEAT_T0[v] = t0; }
  def(MAT.EMPTY, 0.5, 0.004);
  def(MAT.SAND, 1.0, 0.08);
  def(MAT.WATER, 4.0, 0.25);
  def(MAT.SALTWATER, 3.8, 0.27);
  def(MAT.OIL, 2.0, 0.06);
  def(MAT.ACID, 3.0, 0.2);
  def(MAT.WOOD, 2.0, 0.04);
  def(MAT.PLANT, 2.5, 0.06);
  def(MAT.SEED, 1.0, 0.05);
  def(MAT.FLOWER, 2.0, 0.05);
  def(MAT.FIRE, 0.5, 0.12, 750);
  def(MAT.EMBER, 1.0, 0.1, 700);
  def(MAT.TORCH, 3.0, 0.2, 1000);
  def(MAT.LAVA, 3.0, 0.02, 1300);
  def(MAT.STONE, 2.0, 0.12);
  def(MAT.GLASS, 1.5, 0.1);
  def(MAT.METAL, 1.5, 0.36);
  def(MAT.ICE, 2.0, 0.3, -30);
  def(MAT.SNOW, 1.0, 0.04, -10);
  def(MAT.STEAM, 0.5, 0.03, 110);
  def(MAT.SMOKE, 0.5, 0.03, 60);
  def(MAT.GAS, 0.5, 0.03);
  def(MAT.GUNPOWDER, 1.0, 0.06);
  def(MAT.ASH, 0.8, 0.03);
  def(MAT.SALT, 1.0, 0.12);
  def(MAT.FIREWORK, 1.0, 0.06);
  def(MAT.NUKE, 2.0, 0.1);
  def(MAT.FAUCET, 3.0, 0.1);
  def(MAT.DRAIN, 3.0, 0.1);
  def(MAT.CLONER, 3.0, 0.1);
  def(MAT.INERT, 1.0, 0);      /* carries no heat at all, and is never anything but room temperature */
  def(MAT.PLANK, 2.0, 0.04); def(MAT.DOOR, 2.0, 0.04); def(MAT.LADDER, 2.0, 0.04); def(MAT.STAIRS, 2.0, 0.04);
  def(MAT.BED, 1.5, 0.03);     /* straw and a blanket: warm to lie on */
  def(MAT.SAPLING, 2.5, 0.06);
  def(MAT.SOIL, 1.2, 0.08); def(MAT.CROP, 2.5, 0.06); def(MAT.WHEAT, 2.0, 0.05);
  def(MAT.LAMP, 1.5, 0.1);     /* a little glass and a little oil */
  def(MAT.COAL, 1.3, 0.06); def(MAT.ORE, 1.8, 0.16); def(MAT.GOLD, 1.0, 0.4);
  def(MAT.BRICK, 2.0, 0.1); def(MAT.GIRDER, 1.5, 0.36);
  /* (leftovers.js) snow packed hard, cold as the snow it was packed from; and rock salt, which is salt, in the rock */
  def(MAT.PACKSNOW, 1.0, 0.02, -10);   /* (packed hard, it keeps its cold a good while) */ def(MAT.ROCKSALT, 1.6, 0.14);
  /* (wonders.js) wet concrete is mostly water and stone; set, it carries heat as stone does. stained glass is glass. a
     firebrick is light and slow (insulating firebrick: a furnace keeps its heat in it). moon rock is rock */
  def(MAT.MORTAR, 2.6, 0.15); def(MAT.CONCRETE, 2.0, 0.12); def(MAT.STAINED, 1.5, 0.1);
  def(MAT.FIREBRICK, 0.8, 0.03); def(MAT.MOONROCK, 2.0, 0.1);
  def(MAT.LINEN, 1.5, 0.03);   /* (storeys.js) washing: cloth, and the air in it */

  function hi(v, t, l) { HEAT_HI[v] = t; HEAT_HI_L[v] = l; }
  function lo(v, t, l) { HEAT_LO[v] = t; HEAT_LO_L[v] = l; }
  /* water: freezes at 0, boils at 100. boiling takes a lot more than warming up did */
  lo(MAT.WATER, 0, 640); hi(MAT.WATER, 100, 1200);
  /* salt water freezes colder and boils hotter, and leaves its salt behind either way */
  lo(MAT.SALTWATER, -21, 640); hi(MAT.SALTWATER, 103, 1200);
  hi(MAT.ICE, 0, 640); hi(MAT.SNOW, 0, 640); hi(MAT.PACKSNOW, 0, 640);
  /* rock salt: past 800 it cracks out of the rock, as salt (no more to soak up than sand sintering) */
  hi(MAT.ROCKSALT, 800, 0);
  /* steam gives back all that boiling took. clouds rain when they have lost it, which they
     mostly do up against the top of the room, where the heat gets out */
  lo(MAT.STEAM, 100, 1200);
  /* rock: stone runs at 1150 and lava sets at 950 (or wherever LAVA_LO says). lava gives
     back exactly what melting took, whatever it was melted from: see heatStep */
  hi(MAT.STONE, 1150, 4500); lo(MAT.LAVA, 950, 4500);
  hi(MAT.SAND, 800, 0);        /* sinters into glass, well short of melting. one way, so nothing to soak up */
  hi(MAT.GLASS, 1400, 450);
  hi(MAT.METAL, 1500, 500);
  hi(MAT.ACID, 200, 0);        /* boils off into fumes, which never come back as acid */
  /* things that catch, go off, or launch, the moment they are hot enough */
  hi(MAT.WOOD, 300, 0); hi(MAT.OIL, 250, 0); hi(MAT.PLANT, 220, 0); hi(MAT.FLOWER, 200, 0); hi(MAT.SEED, 200, 0);
  hi(MAT.GAS, 200, 0); hi(MAT.GUNPOWDER, 180, 0); hi(MAT.FIREWORK, 150, 0); hi(MAT.NUKE, 400, 0);
  hi(MAT.PLANK, 300, 0); hi(MAT.DOOR, 300, 0); hi(MAT.LADDER, 300, 0); hi(MAT.STAIRS, 300, 0);
  hi(MAT.BED, 200, 0); hi(MAT.SAPLING, 220, 0); hi(MAT.LINEN, 200, 0);
  hi(MAT.CROP, 220, 0); hi(MAT.WHEAT, 200, 0); hi(MAT.LAMP, 250, 0); hi(MAT.SOIL, 800, 0);   /* (a field of ripe wheat goes up like a field of ripe wheat) */
  /* coal catches late and burns long. iron ore runs, and what runs out of it sets as iron: a furnace is only a way of
     getting it hot enough. dressed stone is stone, and a girder is iron */
  hi(MAT.COAL, 400, 0); hi(MAT.ORE, 1250, 500); hi(MAT.BRICK, 1150, 4500); hi(MAT.GIRDER, 1500, 500);
  /* wet concrete baked dry goes off at once; frozen, it is ruined, and crumbles to sand. set concrete runs past 1500, a
     firebrick only past 2000, and moon rock as stone does. stained glass melts as glass does, and sets plain */
  hi(MAT.MORTAR, 300, 0); lo(MAT.MORTAR, 0, 0);
  hi(MAT.CONCRETE, 1500, 4500); hi(MAT.FIREBRICK, 2000, 4500); hi(MAT.MOONROCK, 1150, 4500); hi(MAT.STAINED, 1400, 450);

  HEAT_SRC[MAT.FIRE] = 750; HEAT_SRC[MAT.EMBER] = 700; HEAT_SRC[MAT.TORCH] = 1000;
  HEAT_POW[MAT.FIRE] = 200; HEAT_POW[MAT.EMBER] = 40; HEAT_POW[MAT.TORCH] = 400;
})();

/* how much heat flows between two touching things, per degree of difference. two things
   in a row resist like two resistors in a row. kept small enough that it can never
   overshoot, even into the lightest neighbour */
/* (indexed (a << 6) | b: NMAT is 64) */
var HEAT_KP = new Float32Array(NMAT * NMAT), HEAT_IC = new Float32Array(NMAT), HEAT_BK = new Float32Array(NMAT);
function heatTables() {
  for (var a = 0; a < NMAT; a++) {
    HEAT_IC[a] = HEAT_C[a] ? 1 / HEAT_C[a] : 0;
    HEAT_BK[a] = Math.min(BORDER_K, HEAT_K[a] * 4, 0.24 * (HEAT_C[a] || 1));   /* through the edge of the room */
    for (var b = 0; b < NMAT; b++) {
      var ka = HEAT_K[a], kb = HEAT_K[b], k = ka + kb > 0 ? 2 * ka * kb / (ka + kb) : 0;
      var cmin = Math.min(HEAT_C[a] || 1, HEAT_C[b] || 1);
      HEAT_KP[a * NMAT + b] = Math.min(k, 0.24 * cmin);
    }
  }
  /* water on anything very hot does not just conduct: it boils against it, violently, and
     the bubbles carry the heat off far faster. so water quenches lava, and a hot plate hisses */
  [MAT.WATER, MAT.SALTWATER].forEach(function (w) {
    [MAT.LAVA, MAT.METAL, MAT.STONE, MAT.TORCH, MAT.EMBER].forEach(function (h) {
      HEAT_KP[w * NMAT + h] = HEAT_KP[h * NMAT + w] = Math.max(HEAT_KP[w * NMAT + h], LAVA_QUENCH);
    });
  });
}
var LAVA_QUENCH = 0.2;
heatTables();

function heatInit(g) {
  var n = g.gw * g.gh;
  g.T = new Float32Array(n).fill(AMBIENT);
  g.lat = new Float32Array(n);
  g.fastList = new Int32Array(n);
  /* what each cell was, the last time its heat was counted: see heatStep */
  g.hm = new Uint8Array(n); g.ha = new Uint8Array(n); g.hs = new Uint8Array(n);
}
/* everything at the temperature it would have been made at */
function heatReset(g) {
  for (var i = 0; i < g.m.length; i++) g.T[i] = HEAT_T0[g.m[i]];
  g.lat.fill(0);
  heatAcceptAll(g);
}

/* -------------------------------------------------------------------
   THE BOOKS. a cell's heat is how much warmer than the room it is, times
   how much heat it holds per degree, plus anything it has soaked up on
   the way to melting (or given up on the way to setting), plus what
   being this phase of itself is worth: water holds the heat that melted
   it, steam the heat that boiled it, lava the heat that melted the rock.
   when a cell turns into something else, that number stays the same and
   the new thing's temperature is worked out from it. so a melt and a set,
   a boil and a rain, give back exactly what they took, and nothing that
   changes into anything else makes or loses heat by doing it.
   ------------------------------------------------------------------- */
/* phase worth: a part that is just heat-per-degree bookkeeping, and a latent part, which varies a little from
   cell to cell (by shade, which goes wherever the cell goes) so a block does not all melt in the same tick */
var HEAT_HS = new Float32Array(NMAT), HEAT_HLAT = new Float32Array(NMAT);
(function () {
  var C = HEAT_C, A = AMBIENT;
  /* ice is the zero of its family. water holds the heat that melted it; steam that, and what boiled it */
  HEAT_HS[MAT.WATER] = (C[MAT.ICE] - C[MAT.WATER]) * (HEAT_HI[MAT.ICE] - A);
  HEAT_HLAT[MAT.WATER] = HEAT_HI_L[MAT.ICE];
  HEAT_HS[MAT.STEAM] = HEAT_HS[MAT.WATER] + (C[MAT.WATER] - C[MAT.STEAM]) * (HEAT_HI[MAT.WATER] - A);
  HEAT_HLAT[MAT.STEAM] = HEAT_HLAT[MAT.WATER] + HEAT_HI_L[MAT.WATER];
  HEAT_HS[MAT.SNOW] = (C[MAT.ICE] - C[MAT.SNOW]) * (HEAT_HI[MAT.ICE] - A);
  HEAT_HS[MAT.PACKSNOW] = (C[MAT.ICE] - C[MAT.PACKSNOW]) * (HEAT_HI[MAT.ICE] - A);
  HEAT_HS[MAT.SALTWATER] = (C[MAT.ICE] - C[MAT.SALTWATER]) * (HEAT_LO[MAT.SALTWATER] - A);
  HEAT_HLAT[MAT.SALTWATER] = HEAT_LO_L[MAT.SALTWATER];
})();
function heatF(sh) { return 0.7 + (sh & 63) / 105; }
function heatLat(g, i, L) { return L * heatF(g.sh[i]); }
/* what being v (with aux, and shade sh) is worth. lava is worth the heat it took to melt whatever it sets back into */
function heatH0(v, aux, sh) {
  if (v === MAT.LAVA) {
    var x = aux === MAT.GLASS || aux === MAT.METAL ? aux : MAT.STONE;
    return (HEAT_C[x] - HEAT_C[MAT.LAVA]) * (HEAT_HI[x] - AMBIENT) + HEAT_HI_L[x] * heatF(sh);
  }
  return HEAT_HS[v] + HEAT_HLAT[v] * heatF(sh);
}
/* the heat in cell j, counted as if it were v / aux / sh (what it is now, unless told otherwise) */
function heatQ(g, j, v, aux, sh) {
  /* by default, as it was when last counted: if it has changed since, its temperature has not caught up yet */
  if (v === undefined) { v = g.hm[j]; aux = g.ha[j]; sh = g.hs[j]; }
  return HEAT_C[v] * (g.T[j] - AMBIENT) + g.lat[j] + heatH0(v, aux, sh);
}
/* give cell j (whatever it is now) exactly q of heat, and write it into the books */
function heatSetQ(g, j, q) {
  var v = g.m[j];
  g.T[j] = AMBIENT + (q - heatH0(v, g.aux[j], g.sh[j])) * HEAT_IC[v];
  g.lat[j] = 0;
  heatAccept(g, j);
}
/* this cell is what it is now, at the temperature it is now. for things that bring their own heat: a brush, a
   bang, a bolt, paint, a faucet. and for the books once a change has been paid for */
function heatAccept(g, j) { g.hm[j] = g.m[j]; g.ha[j] = g.aux[j]; g.hs[j] = g.sh[j]; }
function heatAcceptAll(g) { g.hm.set(g.m); g.ha.set(g.aux); g.hs.set(g.sh); }
/* anything that changed since it was last counted (a flame catching, acid eating, a peasant chewing) gets its new
   temperature from the heat it had */
function heatRecount(g, i) {
  var q = heatQ(g, i, g.hm[i], g.ha[i], g.hs[i]);
  heatSetQ(g, i, q);
}
/* bring one cell's books up to date now, rather than at the next heat step */
function heatSync(g, j) { if (g.m[j] !== g.hm[j]) heatRecount(g, j); }
/* turn a cell into something else on the spot, keeping its heat */
function heatBecome(g, j, v) {
  var q = heatQ(g, j);
  g.m[j] = v; g.aux[j] = 0;
  heatSetQ(g, j, q);
}
/* the same, by force, for a bang or a bolt: the energy it takes to get the new thing into the
   range it can exist at (steam out of cold water is at least boiling hot) comes from the bang */
function heatForce(g, j, v) {
  var t = g.T[j], lo = v === MAT.LAVA ? LAVA_LO[0] : HEAT_LO[v], hi = HEAT_HI[v];
  g.m[j] = v; g.aux[j] = 0; g.lat[j] = 0;
  if (t < lo) g.T[j] = lo + 1; else if (t > hi) g.T[j] = hi - 1;
  heatAccept(g, j);
}
/* two cells come to the same temperature at once, as when an ember is dropped in water. neither changes what it is */
function heatShare(g, i, j) {
  heatSync(g, i); heatSync(g, j);
  var ci = HEAT_C[g.m[i]] || 1, cj = HEAT_C[g.m[j]] || 1;
  var q = ci * (g.T[i] - AMBIENT) + g.lat[i] + cj * (g.T[j] - AMBIENT) + g.lat[j];
  g.T[i] = g.T[j] = AMBIENT + q / (ci + cj); g.lat[i] = g.lat[j] = 0;
}
/* pour some heat into a cell (or take some out), as an explosion, a bolt or a brush does */
function heatAdd(g, j, dt) {
  if (g.m[j] === MAT.INERT) return;
  var t = g.T[j] + dt;
  g.T[j] = t > T_MAX ? T_MAX : (t < T_MIN ? T_MIN : t);
}

/* a little room next to cell i for a puff of steam: empty, or a gas. up first, then
   either side (whichever first, at random), then down */
var ROOM_ORDER = [[0, 2, 3, 1], [0, 3, 2, 1]];
function heatRoom(g, i) {
  var x = i % g.gw, y = (i / g.gw) | 0, order = ROOM_ORDER[irnd(2)], k, j;
  for (k = 0; k < 4; k++) {
    j = sandNb(g, x, y, order[k]);
    if (j >= 0 && (g.m[j] === MAT.EMPTY || g.m[j] === MAT.SMOKE || g.m[j] === MAT.STEAM)) return j;
  }
  return -1;
}

/* cell i pushes some of itself out into cell j as a new v (salt out of freezing brine, steam off boiling brine), as
   hot as i is. returns how much more heat j holds now than before: i pays it, once it has finished changing */
function heatSpawn(g, i, j, v) {
  var before = heatQ(g, j);
  g.m[j] = v; g.vy[j] = 0; g.aux[j] = 0; g.sh[j] = g.sh[i]; g.T[j] = g.T[i]; g.lat[j] = 0;
  heatAccept(g, j);
  return heatQ(g, j) - before;
}

/* past the top of its range: melt, boil, catch. returns any heat spent on things it pushed out */
function heatUp(g, i, v) {
  var m = g.m, j, paid = 0;
  g.lat[i] = 0;
  switch (v) {
    case MAT.WATER: m[i] = MAT.STEAM; g.aux[i] = 0; if (Math.random() < 0.05) g.fx.hiss++; return 0;
    case MAT.SALTWATER:
      /* the water goes up as steam, the salt stays where it was */
      j = heatRoom(g, i);
      m[i] = MAT.SALT; g.aux[i] = 0;
      if (j >= 0) paid = heatSpawn(g, i, j, MAT.STEAM);
      if (Math.random() < 0.05) g.fx.hiss++;
      return paid;
    case MAT.ICE: case MAT.SNOW: case MAT.PACKSNOW: m[i] = MAT.WATER; g.aux[i] = 0; return 0;
    case MAT.ROCKSALT: m[i] = MAT.SALT; g.aux[i] = 0; return 0;
    case MAT.STONE: case MAT.GLASS: case MAT.METAL:
      m[i] = MAT.LAVA; g.aux[i] = v === MAT.STONE ? 0 : v; return 0;
    case MAT.BRICK: case MAT.CONCRETE: case MAT.FIREBRICK: case MAT.MOONROCK: m[i] = MAT.LAVA; g.aux[i] = 0; return 0;
    case MAT.STAINED: m[i] = MAT.LAVA; g.aux[i] = MAT.GLASS; return 0;
    case MAT.MORTAR: m[i] = MAT.CONCRETE; g.aux[i] = 0; g.vy[i] = 0; return 0;
    case MAT.ORE: case MAT.GIRDER: m[i] = MAT.LAVA; g.aux[i] = MAT.METAL; return 0;
    case MAT.COAL: m[i] = MAT.EMBER; g.aux[i] = 1; return 0;
    case MAT.SAND: case MAT.SOIL: m[i] = MAT.GLASS; g.aux[i] = 0; g.score++; return 0;
    case MAT.WOOD: case MAT.PLANK: case MAT.DOOR: case MAT.LADDER: case MAT.STAIRS: m[i] = MAT.EMBER; g.aux[i] = 0; return 0;
    case MAT.ACID: m[i] = MAT.SMOKE; g.aux[i] = 0; return 0;
    case MAT.GAS: m[i] = MAT.FIRE; g.sh[i] = SAND_CLEAN; g.aux[i] = 0; g.fx.whoosh++; return 0;
    case MAT.GUNPOWDER: sandBoom(g, i); return 0;
    case MAT.FIREWORK: sandLaunch(g, i); return 0;
    case MAT.NUKE: sandNuke(g, i); return 0;
    default: m[i] = MAT.FIRE; g.aux[i] = 0; g.sh[i] &= 127; return 0;   /* oil, plants, seeds, flowers: burn, and leave ash */
  }
}

/* past the bottom of its range: freeze, condense, set. returns any heat spent on things it pushed out */
function heatDown(g, i, v) {
  var m = g.m, j, paid = 0, gw = g.gw;
  g.lat[i] = 0;
  /* water freezes. falling water, with nothing under it, freezes as it falls: snow */
  if (v === MAT.WATER) { m[i] = i + gw < m.length && m[i + gw] === MAT.EMPTY ? MAT.SNOW : MAT.ICE; g.aux[i] = 0; g.vy[i] = 0; }
  else if (v === MAT.STEAM) { m[i] = MAT.WATER; g.aux[i] = 0; g.vy[i] = 0; }
  else if (v === MAT.MORTAR) { m[i] = MAT.SAND; g.aux[i] = 0; g.vy[i] = 0; }   /* (frost in wet concrete: it never sets) */
  else if (v === MAT.LAVA) { j = g.aux[i]; m[i] = j === MAT.GLASS || j === MAT.METAL ? j : MAT.STONE; g.aux[i] = 0; g.vy[i] = 0; }
  else if (v === MAT.SALTWATER) {
    /* the ice that forms pushes its salt out, into the air or the fresh water next to it */
    var x = i % gw, y = (i / gw) | 0, k, t;
    for (k = 0; k < 4; k++) {
      j = sandNb(g, x, y, k);
      if (j < 0) continue;
      t = m[j];
      if (t === MAT.EMPTY) { paid = heatSpawn(g, i, j, MAT.SALT); break; }
      if (t === MAT.WATER) { var q = heatQ(g, j); m[j] = MAT.SALTWATER; heatSetQ(g, j, q); break; }
    }
    /* no room to push it out: it freezes where it is, as ice with salt crystals in it */
    m[i] = k === 4 && Math.random() < 0.3 ? MAT.SALT : MAT.ICE; g.aux[i] = 0; g.vy[i] = 0;
  }
  return paid;
}

function heatStep(g) {
  var m = g.m, T = g.T, lat = g.lat, gw = g.gw, gh = g.gh, KP = HEAT_KP, IC = HEAT_IC, SRC = HEAT_SRC, POW = HEAT_POW, BK = HEAT_BK, C = HEAT_C;
  var x, y, i, j, v, w, t, d, f, row, up, nf = 0, fast = g.fastList, E = MAT.EMPTY, METAL = MAT.METAL, hm = g.hm;
  /* (the hot loops below look these up once, not once a cell: the same dice, the same tables) */
  var rnd = Math.random, LIQ = LIQUID, FIRE = MAT.FIRE, LAVA = MAT.LAVA, CLEAN = SAND_CLEAN, gw1 = gw - 1, gh1 = gh - 1, n = m.length;
  /* (a fire in a closed chamber somebody is working the bellows of burns hotter: wonders.js wDraught) */
  var DM = g.dmask || null;

  /* 0. anything that turned into something else since it was last counted gets its new temperature from its heat.
     (looked for four cells at a time: hardly anything has, most ticks) */
  i = 0;
  if ((m.byteOffset & 3) === 0 && (hm.byteOffset & 3) === 0) {
    var n4 = n >> 2, m4 = new Uint32Array(m.buffer, m.byteOffset, n4), hm4 = new Uint32Array(hm.buffer, hm.byteOffset, n4), k4;
    for (k4 = 0; k4 < n4; k4++) {
      if (m4[k4] === hm4[k4]) continue;
      for (i = k4 << 2; i < (k4 << 2) + 4; i++) if (m[i] !== hm[i]) heatRecount(g, i);
    }
    i = n4 << 2;
  }
  for (; i < n; i++) if (m[i] !== hm[i]) heatRecount(g, i);

  /* 1. make heat, lose heat, move heat */
  for (y = 0; y < gh; y++) {
    row = y * gw;
    for (x = 0; x < gw; x++) {
      i = row + x; v = m[i]; t = T[i];
      if (SRC[v]) {
        /* burning: heat from the fuel, a limited amount a tick, up to the flame's own temperature.
           a clean flame (gas, torch) burns hotter than a smoky one */
        d = v === FIRE && g.sh[i] >= CLEAN ? 900 : SRC[v];
        if (DM !== null && DM[i]) d = W_DRAUGHT;
        if (t < d) { f = (d - t) * C[v]; t += (f < POW[v] ? f : POW[v]) * IC[v]; }
      } else if (v === E) {
        /* warm air rises and cold air sinks, swapping places with the air it passes, drifting a little as it goes */
        if (y > 0) {
          up = i - gw;
          /* (only worth rolling for when one of the three cells it might rise into is air cooler than it is: still air,
             all one temperature, has nowhere to go whichever way the dice fall) */
          if (x > 0 && x < gw1) {
            if ((m[up] === E && t > T[up] + 0.5) || (m[up - 1] === E && t > T[up - 1] + 0.5) || (m[up + 1] === E && t > T[up + 1] + 0.5)) {
              if (rnd() < 0.3) up += rnd() < 0.5 ? -1 : 1;
              if (m[up] === E && t > T[up] + 0.5 && rnd() < 0.7) { d = T[up]; T[up] = t; t = d; }
            }
          } else if (m[up] === E && t > T[up] + 0.5 && rnd() < 0.7) { d = T[up]; T[up] = t; t = d; }
        }
        if (y < gh1) {
          up = i + gw;
          if (m[up] === E && t < T[up] - 0.5 && rnd() < 0.7) { d = T[up]; T[up] = t; t = d; }
        }
        /* and it stirs sideways a little, so a cold pool spreads out and warm air finds its way over to it */
        if (x < gw1) {
          up = i + 1;
          if (m[up] === E && (t > T[up] + 0.5 || t < T[up] - 0.5) && rnd() < 0.3) { d = T[up]; T[up] = t; t = d; }
        }
      } else if (LIQ[v] && y > 0 && m[i - gw] === v && t > T[i - gw] + 1 && rnd() < (v === LAVA ? 0.01 : 0.25)) {
        /* and so does warm water, in water. lava churns too, but it is far too thick to hurry */
        up = i - gw; d = T[up]; T[up] = t; t = d;
        d = lat[up]; lat[up] = lat[i]; lat[i] = d;
      }
      if (x < gw1) {
        j = i + 1; d = T[j] - t;
        if (d > 0.05 || d < -0.05) {
          w = m[j]; f = KP[(v << 6) | w] * d;
          t += f * IC[v]; T[j] -= f * IC[w];
        }
        if (v === METAL && m[j] === METAL) fast[nf++] = i;
      }
      if (y < gh1) {
        j = i + gw; d = T[j] - t;
        if (d > 0.05 || d < -0.05) {
          w = m[j]; f = KP[(v << 6) | w] * d;
          t += f * IC[v]; T[j] -= f * IC[w];
        }
        if (v === METAL && m[j] === METAL) fast[nf++] = -i - 1;
      }
      /* the edges of the room touch the outside */
      if (x === 0 || x === gw1 || y === 0 || y === gh1) t += BK[v] * (AMBIENT - t) * IC[v];
      T[i] = t;
    }
  }
  /* metal gets a few more goes, between metal only, so a bar carries heat end to end */
  if (nf) {
    var kk = KP[METAL * NMAT + METAL] * IC[METAL], p, q;
    for (p = 0; p < HEAT_FAST; p++) {
      for (q = 0; q < nf; q++) {
        i = fast[q];
        if (i < 0) { i = -i - 1; j = i + gw; } else j = i + 1;
        f = (T[j] - T[i]) * kk;
        T[i] += f; T[j] -= f;
      }
    }
  }

  /* 2. anything out of its range changes, once it has soaked up (or given up) enough */
  var HI = HEAT_HI, LO = HEAT_LO, HL = HEAT_HI_L, LL = HEAT_LO_L, aux = g.aux, e, lo, hi, L, q, paid, POWDER = MAT.GUNPOWDER, NUKE = MAT.NUKE;
  for (i = 0; i < n; i++) {
    v = m[i]; t = T[i]; e = lat[i];
    hi = HI[v]; lo = LO[v];
    if (v === LAVA) { w = aux[i] & 31; lo = LAVA_LO[w]; }
    if (t > hi) {
      L = HL[v];
      if (L <= 0) {
        /* catches, sinters, fizzes off: all at once, and the new thing has the old one's heat. a bang
           counts its own */
        q = heatQ(g, i); heatUp(g, i, v);
        if (m[i] !== v && v !== POWDER && v !== NUKE) heatSetQ(g, i, q);
        continue;
      }
      e += (t - hi) * C[v]; T[i] = hi;
      if (e >= heatLat(g, i, L)) {
        /* soaked up enough: changes. the books carry it all over, including any it soaked up past what it took */
        lat[i] = e; q = heatQ(g, i);
        paid = heatUp(g, i, v); heatSetQ(g, i, q - paid);
      } else lat[i] = e;
    } else if (t < lo) {
      L = v === LAVA ? HL[w || MAT.STONE] : LL[v];
      if (L <= 0) { q = heatQ(g, i); heatDown(g, i, v); if (m[i] !== v) heatSetQ(g, i, q); continue; }
      e -= (lo - t) * C[v]; T[i] = lo;
      if (-e >= heatLat(g, i, L)) {
        lat[i] = e; q = heatQ(g, i);
        paid = heatDown(g, i, v); heatSetQ(g, i, q - paid);
      } else lat[i] = e;
    } else if (e > 0) {
      /* was partway to melting, and is cooling off again: it gives back what it took first */
      if (HL[v] > 0 && t < hi) { e -= (hi - t) * C[v]; if (e < 0) { T[i] = hi + e * IC[v]; e = 0; } else T[i] = hi; }
      else if (!(HL[v] > 0)) { T[i] = t + e * IC[v]; e = 0; }   /* turned into something that does not melt: it is just heat now */
      lat[i] = e;
    } else if (e < 0) {
      if (LL[v] > 0 && t > lo) { e += (t - lo) * C[v]; if (e > 0) { T[i] = lo + e * IC[v]; e = 0; } else T[i] = lo; }
      else if (!(LL[v] > 0)) { T[i] = t + e * IC[v]; e = 0; }
      lat[i] = e;
    }
  }
}

/* the thing in cell j leaves the world (down a drain), and takes its heat with it: the air that fills the hole is as warm
   as the thing was, and no warmer. (left to the books, the hole would get all of it, melting heat and all: a cell of
   drained water would leave behind air at well over a thousand degrees) */
/* a cell a peasant (or a great work) has just taken away: eaten, chopped, dug, picked up, drained, cleared. what is left
   is air. in a great works' village, if all of what it held would make that air a burn (over 150: a warm leaf or log,
   or a puddle's worth of latent heat in one cell of air, at over a thousand), it is no hotter than the thing itself was:
   the heat goes with it (heatVanish). otherwise, and in every plain village, the books are kept as they always have
   been. heatTaken: true if it was taken so; heatVacate: taken, one way or the other */
function heatTaken(g, j) {
  if (!g.wAny) return false;
  var air = AMBIENT + (heatQ(g, j) - heatH0(MAT.EMPTY, 0, g.sh[j])) * HEAT_IC[MAT.EMPTY];
  if (air <= 150) return false;
  heatVanish(g, j);
  return true;
}
function heatVacate(g, j) { if (!heatTaken(g, j)) { g.m[j] = MAT.EMPTY; heatSync(g, j); } }
function heatVanish(g, j) {
  var t = g.T[j];
  g.m[j] = MAT.EMPTY; g.vy[j] = 0; g.aux[j] = 0; g.lat[j] = 0;
  g.T[j] = t > T_MAX ? T_MAX : (t < T_MIN ? T_MIN : t);
  heatAccept(g, j);
}

/* the HEAT and COOL brushes: pour heat in (or draw it out) around the cursor. it is heat,
   not degrees, so air and steam change fast and a pond takes a while, as with a real
   stove. cooling slows as it nears the bottom, and air never gets hotter than a flame */
function heatBrush(g, cx, cy, sign) {
  var r = g.size + 1, ix = Math.round(cx), iy = Math.round(cy), dx, dy, x, y, d2, j, f, v, t, e;
  for (dy = -r; dy <= r; dy++) for (dx = -r; dx <= r; dx++) {
    d2 = dx * dx + dy * dy;
    if (d2 > r * r + r) continue;
    x = ix + dx; y = iy + dy;
    if (x < 0 || y < 0 || x >= g.gw || y >= g.gh) continue;
    j = y * g.gw + x;
    f = 1 - d2 / (r * r + r + 1) * 0.6;
    v = g.m[j]; t = g.T[j];
    if (v === MAT.INERT) continue;
    e = sign > 0 ? 60 * f : -60 * f * clamp((t + 220) / 240, 0.03, 1);
    t += e * HEAT_IC[v];
    if (sign > 0 && AIRY[v] && t > 1200) t = Math.max(g.T[j], 1200);
    g.T[j] = clamp(t, -220, 3000);
  }
}

/* -------------------------------------------------------------------
   HOW HOT THINGS LOOK
   ------------------------------------------------------------------- */
function blend32(a, b, f) {
  var r = (a & 255) + (((b & 255) - (a & 255)) * f), gg = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * f),
      bb = ((a >> 16) & 255) + ((((b >> 16) & 255) - ((a >> 16) & 255)) * f);
  return ((255 << 24) | ((bb & 255) << 16) | ((gg & 255) << 8) | (r & 255)) >>> 0;
}
function rampTable(stops, t0, t1, step) {
  var n = Math.ceil((t1 - t0) / step) + 1, out = new Uint32Array(n), k, s, c;
  for (k = 0; k < n; k++) {
    var t = t0 + k * step;
    for (s = 1; s < stops.length - 1 && stops[s][0] < t; s++);
    var a = stops[s - 1], b = stops[s], f = clamp((t - a[0]) / (b[0] - a[0]), 0, 1);
    c = [lerp(a[1][0], b[1][0], f), lerp(a[1][1], b[1][1], f), lerp(a[1][2], b[1][2], f)];
    out[k] = rgb32(c, 1);
  }
  return out;
}
/* the colour of a hot thing: dull red, cherry, orange, yellow, white. 10 degrees a step from 400 */
var GLOW_T0 = 400, GLOW_STEP = 10;
var GLOW_PAL = rampTable([[400, [40, 0, 0]], [550, [110, 10, 0]], [750, [180, 25, 5]], [950, [225, 50, 10]],
                          [1150, [255, 90, 20]], [1400, [255, 160, 50]], [1800, [255, 230, 150]], [2500, [255, 255, 255]]],
                         GLOW_T0, 3000, GLOW_STEP);
/* how much of that glow shows over the thing's own colour. never all of it: a red-hot
   crust should still look like stone, and darker than the lava under it */
function glowMix(t) { return t < 450 ? 0 : Math.min(0.85, (t - 450) / 650); }
/* thermal vision: cold blue, room-temperature murk, warm magenta, hot orange, white */
var THERM_T0 = -100, THERM_STEP = 2;
var THERM_PAL = rampTable([[-100, [230, 245, 255]], [-40, [60, 140, 255]], [0, [20, 40, 150]], [20, [22, 16, 48]],
                           [37, [70, 20, 110]], [100, [170, 20, 130]], [300, [235, 50, 40]], [700, [255, 150, 0]],
                           [1200, [255, 230, 60]], [2000, [255, 255, 255]]], THERM_T0, 3000, THERM_STEP);
function thermCol(t) { return THERM_PAL[clamp(((t - THERM_T0) / THERM_STEP) | 0, 0, THERM_PAL.length - 1)]; }
function glowCol(t) { return GLOW_PAL[clamp(((t - GLOW_T0) / GLOW_STEP) | 0, 0, GLOW_PAL.length - 1)]; }
var COLD_TINT = hex32("#e4f6ff"), HAZE_TINT = hex32("#ff9a50"), CHILL_TINT = hex32("#a8d8ff");

/* how a temperature reads, for people */
function heatLabel(t) { return Math.round(t) + "\u00b0"; }
