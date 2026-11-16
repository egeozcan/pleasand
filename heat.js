/* =====================================================================
   PLEASAND  --  heat.js

   every cell has a temperature, in degrees, that travels with it when it
   moves. once a tick, heat flows between touching cells, from hot to
   cold, at a rate set by how well both of them carry it (metal: very
   well, air and ash: hardly at all) and lands according to how much it
   takes to warm each one (water: a lot, air: almost nothing). nothing
   is made or lost on the way, except by air, which slowly gives
   everything back to the room, and by the things that make heat: fire,
   embers and torches.

   warm air rises. so does warm water, and warm lava. that is how a pot
   over a fire boils from the bottom up, and why a plume climbs off a torch.

   past its melting, boiling or burning point, a cell does not change at
   once. it sits at that temperature and soaks up heat until it has had
   enough (latent heat, kept in g.lat), and only then becomes the next
   thing: ice melts, water boils, stone runs, wood catches. cool it back
   down and it gives that heat back and goes the other way: steam rains,
   lava crusts over, molten glass sets.

   lava is all molten things. what it sets into is in its aux: stone by
   default, or glass, or metal, if that is what was melted.
   ===================================================================== */
"use strict";

var AMBIENT = 20;
var AIR_COOL = 0.02;     /* how fast air forgets it was warm */
var AIR_HOT = 0.12, AIR_HOT_N = 600;   /* and how much faster when it is very hot: it glows the heat away */
var HEAT_FAST = 8;       /* extra passes for metal, which carries heat faster than one pass a tick can */
var T_MAX = 4000, T_MIN = -273;

/* per thing: heat capacity, conductivity, temperature it is made at */
var HEAT_C = new Float32Array(32), HEAT_K = new Float32Array(32), HEAT_T0 = new Float32Array(32).fill(AMBIENT);
/* above HI it melts / boils / catches, after soaking up HI_L. below LO it sets / freezes / condenses, after giving up LO_L */
var HEAT_HI = new Float32Array(32).fill(1e9), HEAT_HI_L = new Float32Array(32);
var HEAT_LO = new Float32Array(32).fill(-1e9), HEAT_LO_L = new Float32Array(32);
/* things that make their own heat, and keep themselves at least this hot */
var HEAT_SRC = new Float32Array(32);
/* lava sets at a temperature that depends on what it is made of */
var LAVA_LO = new Float32Array(32).fill(950);
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

  function hi(v, t, l) { HEAT_HI[v] = t; HEAT_HI_L[v] = l; }
  function lo(v, t, l) { HEAT_LO[v] = t; HEAT_LO_L[v] = l; }
  /* water: freezes at 0, boils at 100. boiling takes a lot more than warming up did */
  lo(MAT.WATER, 0, 640); hi(MAT.WATER, 100, 1200);
  /* salt water freezes colder and boils hotter, and leaves its salt behind either way */
  lo(MAT.SALTWATER, -21, 640); hi(MAT.SALTWATER, 103, 1200);
  hi(MAT.ICE, 0, 640); hi(MAT.SNOW, 0, 320);
  /* steam gives back less than boiling took (it loses some to the sky on the way up), so
     clouds rain in a reasonable time. losing heat is safe; making it never is */
  lo(MAT.STEAM, 100, 500);
  /* rock: stone runs at 1150 and lava sets at 950 (or wherever LAVA_LO says). lava gives
     back exactly what melting took, whatever it was melted from: see heatStep */
  hi(MAT.STONE, 1150, 4500); lo(MAT.LAVA, 950, 4500);
  hi(MAT.SAND, 800, 300);      /* sinters into glass, well short of melting */
  hi(MAT.GLASS, 1400, 450);
  hi(MAT.METAL, 1500, 500);
  hi(MAT.ACID, 200, 800);      /* boils off into fumes */
  /* things that catch, go off, or launch, the moment they are hot enough */
  hi(MAT.WOOD, 300, 0); hi(MAT.OIL, 250, 0); hi(MAT.PLANT, 220, 0); hi(MAT.FLOWER, 200, 0); hi(MAT.SEED, 200, 0);
  hi(MAT.GAS, 200, 0); hi(MAT.GUNPOWDER, 180, 0); hi(MAT.FIREWORK, 150, 0); hi(MAT.NUKE, 400, 0);

  HEAT_SRC[MAT.FIRE] = 750; HEAT_SRC[MAT.EMBER] = 700; HEAT_SRC[MAT.TORCH] = 1000;
})();

/* how much heat flows between two touching things, per degree of difference. two things
   in a row resist like two resistors in a row. kept small enough that it can never
   overshoot, even into the lightest neighbour */
var HEAT_KP = new Float32Array(32 * 32), HEAT_IC = new Float32Array(32);
function heatTables() {
  for (var a = 0; a < 32; a++) {
    HEAT_IC[a] = HEAT_C[a] ? 1 / HEAT_C[a] : 0;
    for (var b = 0; b < 32; b++) {
      var ka = HEAT_K[a], kb = HEAT_K[b], k = ka + kb > 0 ? 2 * ka * kb / (ka + kb) : 0;
      var cmin = Math.min(HEAT_C[a] || 1, HEAT_C[b] || 1);
      HEAT_KP[a * 32 + b] = Math.min(k, 0.24 * cmin);
    }
  }
  /* water on anything very hot does not just conduct: it boils against it, violently, and
     the bubbles carry the heat off far faster. so water quenches lava, and a hot plate hisses */
  [MAT.WATER, MAT.SALTWATER].forEach(function (w) {
    [MAT.LAVA, MAT.METAL, MAT.STONE, MAT.TORCH, MAT.EMBER].forEach(function (h) {
      HEAT_KP[w * 32 + h] = HEAT_KP[h * 32 + w] = Math.max(HEAT_KP[w * 32 + h], LAVA_QUENCH);
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
}
/* everything at the temperature it would have been made at */
function heatReset(g) {
  for (var i = 0; i < g.m.length; i++) g.T[i] = HEAT_T0[g.m[i]];
  g.lat.fill(0);
}

/* turn a cell into something else on the spot, keeping its temperature, but nudged into
   the range the new thing can exist at, so it does not turn straight back (steam made by
   an explosion out of cold water is at least boiling hot, say) */
function heatBecome(g, j, v) {
  var t = g.T[j], lo = v === MAT.LAVA ? LAVA_LO[0] : HEAT_LO[v], hi = HEAT_HI[v];
  g.m[j] = v; g.aux[j] = 0; g.lat[j] = 0;
  if (t < lo) g.T[j] = lo + 1; else if (t > hi) g.T[j] = hi - 1;
  if (HEAT_SRC[v] && g.T[j] < HEAT_SRC[v]) g.T[j] = HEAT_SRC[v];
}
/* pour some heat into a cell (or take some out), as an explosion, a bolt or a brush does */
function heatAdd(g, j, dt) {
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

/* past the top of its range: melt, boil, catch */
function heatUp(g, i, v) {
  var m = g.m, j;
  g.lat[i] = 0;
  switch (v) {
    case MAT.WATER: m[i] = MAT.STEAM; g.aux[i] = 0; if (Math.random() < 0.05) g.fx.hiss++; return;
    case MAT.SALTWATER:
      /* the water goes up as steam, the salt stays where it was */
      j = heatRoom(g, i);
      if (j >= 0) { sandSet(g, j, MAT.STEAM); g.T[j] = g.T[i]; }
      m[i] = MAT.SALT; g.aux[i] = 0;
      if (Math.random() < 0.05) g.fx.hiss++;
      return;
    case MAT.ICE: case MAT.SNOW: m[i] = MAT.WATER; g.aux[i] = 0; return;
    case MAT.STONE: case MAT.GLASS: case MAT.METAL:
      m[i] = MAT.LAVA; g.aux[i] = v === MAT.STONE ? 0 : v; return;
    case MAT.SAND: m[i] = MAT.GLASS; g.aux[i] = 0; g.score++; return;
    case MAT.WOOD: m[i] = MAT.EMBER; g.aux[i] = 0; return;
    case MAT.ACID: m[i] = MAT.SMOKE; g.aux[i] = 0; return;
    case MAT.GAS: m[i] = MAT.FIRE; g.sh[i] = SAND_CLEAN; g.aux[i] = 0; g.fx.whoosh++; return;
    case MAT.GUNPOWDER: sandBoom(g, i); return;
    case MAT.FIREWORK: sandLaunch(g, i); return;
    case MAT.NUKE: sandNuke(g, i); return;
    default: m[i] = MAT.FIRE; g.aux[i] = 0; g.sh[i] &= 127;   /* oil, plants, seeds, flowers: burn, and leave ash */
  }
}

/* past the bottom of its range: freeze, condense, set */
function heatDown(g, i, v, raw) {
  var m = g.m, j;
  g.lat[i] = 0;
  if (v === MAT.WATER) { m[i] = MAT.ICE; g.aux[i] = 0; g.vy[i] = 0; }
  /* steam left to cool by itself only ever dips just under 100 before it condenses. if it
     was chilled hard enough to be pulled far below that in one go, it skips water and snows */
  else if (v === MAT.STEAM) { m[i] = raw < 40 ? MAT.SNOW : MAT.WATER; g.aux[i] = 0; g.vy[i] = 0; if (raw < 40) g.T[i] = Math.min(raw, -5); }
  else if (v === MAT.LAVA) { j = g.aux[i]; m[i] = j === MAT.GLASS || j === MAT.METAL ? j : MAT.STONE; g.aux[i] = 0; g.vy[i] = 0; }
  else if (v === MAT.SALTWATER) {
    /* the ice that forms pushes its salt out, into the air or the fresh water next to it */
    var x = i % g.gw, y = (i / g.gw) | 0, k, t;
    for (k = 0; k < 4; k++) {
      j = sandNb(g, x, y, k);
      if (j < 0) continue;
      t = m[j];
      if (t === MAT.EMPTY) { sandSet(g, j, MAT.SALT); g.T[j] = g.T[i]; break; }
      if (t === MAT.WATER) { m[j] = MAT.SALTWATER; break; }
    }
    /* no room to push it out: it freezes where it is, as ice with salt crystals in it */
    m[i] = k === 4 && Math.random() < 0.3 ? MAT.SALT : MAT.ICE; g.aux[i] = 0; g.vy[i] = 0;
  }
}

function heatStep(g) {
  var m = g.m, T = g.T, lat = g.lat, gw = g.gw, gh = g.gh, KP = HEAT_KP, IC = HEAT_IC, SRC = HEAT_SRC;
  var x, y, i, j, v, w, t, d, f, row, up, nf = 0, fast = g.fastList, E = MAT.EMPTY, METAL = MAT.METAL;

  /* 1. make heat, lose heat, move heat */
  for (y = 0; y < gh; y++) {
    row = y * gw;
    for (x = 0; x < gw; x++) {
      i = row + x; v = m[i]; t = T[i];
      if (SRC[v]) {
        /* a torch is always exactly as hot as it is. fire and embers are at least that hot,
           and a clean flame (gas, torch) burns hotter than a smoky one */
        if (v === MAT.TORCH) t = SRC[v];
        else { d = v === MAT.FIRE && g.sh[i] >= SAND_CLEAN ? 900 : SRC[v]; if (t < d) t = d; }
      } else if (v === E) {
        if (t !== AMBIENT) {
          /* the hotter it is, the faster it sheds it */
          d = t - AMBIENT; if (d < 0) d = -d;
          t += (AMBIENT - t) * (AIR_COOL + (d > AIR_HOT_N ? AIR_HOT : d * (AIR_HOT / AIR_HOT_N)));
          if (t < AMBIENT + 0.05 && t > AMBIENT - 0.05) t = AMBIENT;
          /* warm air rises, and drifts a little as it goes */
          if (y > 0) {
            up = i - gw;
            if (x > 0 && x < gw - 1 && Math.random() < 0.3) up += Math.random() < 0.5 ? -1 : 1;
            if (m[up] === E && t > T[up] + 0.5 && Math.random() < 0.7) { d = T[up]; T[up] = t; t = d; }
          }
        }
      } else if (LIQUID[v] && y > 0 && m[i - gw] === v && t > T[i - gw] + 1 && Math.random() < (v === MAT.LAVA ? 0.01 : 0.25)) {
        /* and so does warm water, in water. lava churns too, but it is far too thick to hurry */
        up = i - gw; d = T[up]; T[up] = t; t = d;
        d = lat[up]; lat[up] = lat[i]; lat[i] = d;
      }
      if (x < gw - 1) {
        j = i + 1; d = T[j] - t;
        if (d > 0.05 || d < -0.05) {
          w = m[j]; f = KP[(v << 5) | w] * d;
          t += f * IC[v]; T[j] -= f * IC[w];
        }
        if (v === METAL && m[j] === METAL) fast[nf++] = i;
      }
      if (y < gh - 1) {
        j = i + gw; d = T[j] - t;
        if (d > 0.05 || d < -0.05) {
          w = m[j]; f = KP[(v << 5) | w] * d;
          t += f * IC[v]; T[j] -= f * IC[w];
        }
        if (v === METAL && m[j] === METAL) fast[nf++] = -i - 1;
      }
      T[i] = t;
    }
  }
  /* metal gets a few more goes, between metal only, so a bar carries heat end to end */
  if (nf) {
    var kk = KP[(METAL << 5) | METAL] * IC[METAL], p, q;
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
  var HI = HEAT_HI, LO = HEAT_LO, HL = HEAT_HI_L, LL = HEAT_LO_L, C = HEAT_C, sh = g.sh, aux = g.aux, e, lo, hi, L;
  for (i = 0; i < m.length; i++) {
    v = m[i]; t = T[i]; e = lat[i];
    hi = HI[v]; lo = LO[v];
    if (v === MAT.LAVA) { w = aux[i] & 31; lo = LAVA_LO[w]; }
    if (t > hi) {
      L = HL[v];
      if (L <= 0) { heatUp(g, i, v); continue; }
      e += (t - hi) * C[v]; T[i] = hi;
      /* a little give, cell to cell, so a block does not all go in the same tick */
      if (e >= L * (0.7 + (sh[i] & 63) / 105)) heatUp(g, i, v);
      else lat[i] = e;
    } else if (t < lo) {
      L = v === MAT.LAVA ? HL[w || MAT.STONE] : LL[v];
      if (L <= 0) { heatDown(g, i, v, t); continue; }
      e -= (lo - t) * C[v]; T[i] = lo;
      if (-e >= L * (0.7 + (sh[i] & 63) / 105)) heatDown(g, i, v, t);
      else lat[i] = e;
    } else if (e > 0) {
      /* was partway to melting, and is cooling off again: it gives back what it took first */
      if (HL[v] > 0 && t < hi) { e -= (hi - t) * C[v]; if (e < 0) { T[i] = hi + e * HEAT_IC[v]; e = 0; } else T[i] = hi; }
      else if (!(HL[v] > 0)) e = 0;
      lat[i] = e;
    } else if (e < 0) {
      if (LL[v] > 0 && t > lo) { e += (t - lo) * C[v]; if (e > 0) { T[i] = lo + e * HEAT_IC[v]; e = 0; } else T[i] = lo; }
      else if (!(LL[v] > 0)) e = 0;
      lat[i] = e;
    }
  }
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
