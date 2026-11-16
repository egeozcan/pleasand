/* =====================================================================
   PLEASAND  --  sand.js

   a falling sand toy. one file, zero libraries. lifted out of funnysite's
   flash.js (game 2.1), with just enough of the shell kept to run it on
   its own: the loop, the input, the four sounds, and the CRT.
   ===================================================================== */
(function () {
  "use strict";

  /* -------------------------------------------------------------------
     0. SOUND. an oscillator and a noise buffer. that is the whole
        sound department.
     ------------------------------------------------------------------- */
  var AC = null, MASTER = null, MUTED = false, NOISE = null;

  function actx() {
    if (!AC) {
      try {
        AC = new (window.AudioContext || window.webkitAudioContext)();
        MASTER = AC.createGain(); MASTER.gain.value = 0.35; MASTER.connect(AC.destination);
        NOISE = AC.createBuffer(1, AC.sampleRate * 0.6, AC.sampleRate);
        var d = NOISE.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { AC = null; }
    }
    if (AC && AC.state === "suspended") { try { AC.resume(); } catch (e) {} }
    return AC;
  }
  function tone(f, dur, type, vol, slide) {
    var c = actx(); if (!c || MUTED) return;
    var t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol == null ? 0.07 : vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(MASTER); o.start(t); o.stop(t + dur + 0.02);
  }
  function hiss(dur, vol, cut, sweep) {
    var c = actx(); if (!c || MUTED) return;
    var t = c.currentTime, s = c.createBufferSource(); s.buffer = NOISE;
    var f = c.createBiquadFilter(); f.type = "lowpass";
    f.frequency.setValueAtTime(cut || 2400, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(90, sweep), t + dur);
    var g = c.createGain();
    g.gain.setValueAtTime(vol == null ? 0.1 : vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(MASTER); s.start(t); s.stop(t + dur + 0.02);
  }

  /* -------------------------------------------------------------------
     1. SMALL MATH + DRAWING HELPERS
     ------------------------------------------------------------------- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function irnd(n) { return (Math.random() * n) | 0; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function txt(c, s, x, y, size, col, align, font) {
    c.fillStyle = col || "#fff";
    c.font = (size || 10) + "px " + (font || '"Courier New",monospace');
    c.textAlign = align || "left";
    c.fillText(s, x, y);
    c.textAlign = "left";
  }
  function rct(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
  function box(c, x, y, w, h, col) {
    c.strokeStyle = col; c.lineWidth = 1;
    c.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w) - 1, Math.round(h) - 1);
  }

  /* -------------------------------------------------------------------
     2.  FALLING SAND  (2005-ish: nobody made this one, everybody copied it)

     a grid of cells. every tick, every cell with something in it gets to
     do one thing: fall, flow, rise, burn, grow, or nothing. the element
     picker on the left is the same list the rules are written against.

     every cell also carries a shade (so a grain keeps its colour while it
     falls, instead of the pile shimmering) and a speed (so a falling thing
     speeds up, like falling things do).
     ------------------------------------------------------------------- */
  var MAT = { EMPTY: 0, SAND: 1, WATER: 2, OIL: 3, WOOD: 4, FIRE: 5, LAVA: 6, STONE: 7, STEAM: 8,
              PLANT: 9, ICE: 10, GUNPOWDER: 11, ACID: 12, ASH: 13, FAUCET: 14, DRAIN: 15,
              SMOKE: 16, EMBER: 17, GLASS: 18, SALT: 19, CLONER: 20, GAS: 21, TORCH: 22,
              SEED: 23, FLOWER: 24 };

  /* the picker, top to bottom. the first ten have digit keys, the rest want a click,
     the arrows, or the wheel over the list. ERASE is E, and is EMPTY, which is what
     erasing has always been.
     STEAM, SMOKE, EMBER and FLOWER are not in it: you do not pour those, you earn them. */
  var SAND_PICK = [
    { m: MAT.SAND,       name: "SAND",      key: "1", desc: "falls, piles, and sinks through anything lighter. the default, for a reason." },
    { m: MAT.WATER,      name: "WATER",     key: "2", desc: "falls and spreads. puts out fire. meets lava: the lava becomes stone." },
    { m: MAT.OIL,        name: "OIL",       key: "3", desc: "floats on water. burns very happily. nobody has ever been sorry about oil." },
    { m: MAT.WOOD,       name: "WOOD",      key: "4", desc: "does not move. fire turns it to embers, which burn for a while and spread." },
    { m: MAT.PLANT,      name: "PLANT",     key: "5", desc: "does not move. grows into empty air wherever it touches water." },
    { m: MAT.FIRE,       name: "FIRE",      key: "6", desc: "rises and flickers. eats oil, wood, plants and gunpowder. smokes. dies in water." },
    { m: MAT.LAVA,       name: "LAVA",      key: "7", desc: "heavy and slow. sinks through everything lighter. lights oil and wood." },
    { m: MAT.STONE,      name: "STONE",     key: "8", desc: "does not move. does not burn. only acid gets through it, and slowly." },
    { m: MAT.ICE,        name: "ICE",       key: "9", desc: "does not move. freezes the water beside it. melts near fire, lava and salt." },
    { m: MAT.GUNPOWDER,  name: "GUNPOWDER", key: "0", desc: "a powder that waits for a spark. then the whole pile goes off." },
    { m: MAT.ASH,        name: "ASH",       key: "",  desc: "what is left over. light and grey, floats on water, very patient." },
    { m: MAT.SALT,       name: "SALT",      key: "",  desc: "a powder. melts ice, kills plants, and dissolves in water. very 2005 kitchen." },
    { m: MAT.SEED,       name: "SEED",      key: "",  desc: "lands on sand or ash, gets wet, grows a stalk, and flowers. takes a moment." },
    { m: MAT.GLASS,      name: "GLASS",     key: "",  desc: "does not move. acid cannot touch it. lava turns sand into it. explosions shatter it." },
    { m: MAT.ACID,       name: "ACID",      key: "",  desc: "a liquid that eats sand, wood, plants, ice, gunpowder, and stone. slowly." },
    { m: MAT.GAS,        name: "GAS",       key: "",  desc: "drifts up and hangs about. harmless, until anything warm comes near it." },
    { m: MAT.TORCH,      name: "TORCH",     key: "",  desc: "does not move. burns forever, upward. boils the water that touches it." },
    { m: MAT.FAUCET,     name: "FAUCET",    key: "",  desc: "does not move. drips water downward forever. draw over it to stop it." },
    { m: MAT.DRAIN,      name: "DRAIN",     key: "",  desc: "does not move. swallows whatever touches it. the floor has a hole now." },
    { m: MAT.CLONER,     name: "CLONER",    key: "",  desc: "does not move. remembers the first thing it touches, then makes it forever." },
    { m: MAT.EMPTY,      name: "ERASE",     key: "E", desc: "removes whatever it touches. right-drag erases from anywhere, too." }
  ];
  var SAND_HELP = "WHEEL SIZE. SHIFT-DRAG A LINE. MIDDLE/ALT-CLICK PICKS UP. ARROWS, SPACE, . R C";

  /* sidebar geometry, in game pixels */
  var SAND_PANEL = 84, SAND_ROW0 = 15, SAND_ROWH = 11;
  var SAND_SIZE_Y = 250, SAND_BTN_Y = 266;
  var SAND_MAXSIZE = 10;
  var SAND_CLEAN = 200;   /* a fire whose shade is at least this leaves no ash */
  var SAND_VMAX = 10;   /* top speed: 1 + (10 >> 2) = 3 cells a tick */

  /* how heavy each thing is, and which things a falling thing may push past */
  var SAND_DENS = [0, 4, 2, 1, 9, 0.5, 6, 9, 0.1, 9, 9, 4.5, 2.5, 1.5, 9, 9, 0.2, 9, 9, 4.2, 9, 0.15, 9, 3, 9];
  var SAND_FREE = [0, 1, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
  /* the brush pours these, a few grains a frame, into empty space only. everything
     else is a solid and gets stamped down whole, over whatever was there. */
  var SAND_POUR = [0, 0.3, 0.35, 0.35, 0, 0.35, 0.35, 0, 0, 0, 0, 0.3, 0.35, 0.3, 0, 0, 0, 0, 0, 0.3, 0, 0.35, 0, 0.03, 0];

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
    ["#4a4a4a", "#3c3c40", "#555a52"],
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
    ["#ffd84a", "#ff6fa8", "#e83a4a", "#f4f0ff", "#b07aff", "#ff9a3a"]
  ];

  function hexRGB(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgb32(c, f) {
    var r = clamp(Math.round(c[0] * f), 0, 255), gg = clamp(Math.round(c[1] * f), 0, 255), b = clamp(Math.round(c[2] * f), 0, 255);
    return ((255 << 24) | (b << 16) | (gg << 8) | r) >>> 0;
  }
  /* every (thing, shade) pair is worked out once, up here, not sixty times a second */
  function sandTable(list, f) {
    var out = new Uint32Array(256);
    for (var s = 0; s < 256; s++) out[s] = rgb32(hexRGB(list[s % list.length]), f * (0.92 + ((s >> 3) & 15) / 15 * 0.16));
    return out;
  }
  var SAND_PAL = SAND_SHADES.map(function (list) { return sandTable(list, 1); });
  var SAND_WET = sandTable(SAND_SHADES[MAT.SAND], 0.68);
  /* liquids get darker the deeper you look. row 0 is the surface, which catches the light */
  var SAND_DEEP = [];
  [MAT.WATER, MAT.ACID, MAT.OIL].forEach(function (v) {
    var t = new Uint32Array(16 * 256);
    for (var d = 0; d < 16; d++) t.set(sandTable(SAND_SHADES[v], d === 0 ? 1.35 : Math.max(0.6, 1.02 - d * 0.035)), d * 256);
    SAND_DEEP[v] = t;
  });

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
  function sandHot(t) { return t === MAT.FIRE || t === MAT.LAVA || t === MAT.EMBER || t === MAT.TORCH; }
  /* can something of kind src move into cell j. empty space always takes it; a lighter
     thing can be pushed aside, but only if it has not already had its turn this tick. */
  function sandCan(g, src, j) {
    var t = g.m[j];
    return t === MAT.EMPTY ||
           (g.stamp[j] !== g.tick && SAND_FREE[t] === 1 && SAND_DENS[t] < SAND_DENS[src]);
  }
  /* a stone touching this cell, that is itself touching lava */
  function sandHeatedStone(g, x, y) {
    for (var k = 0; k < 4; k++) {
      var j = sandNb(g, x, y, k);
      if (j >= 0 && g.m[j] === MAT.STONE) {
        var sx = j % g.gw, sy = (j / g.gw) | 0;
        if (sandHas(g, sx, sy, MAT.LAVA) >= 0) return true;
      }
    }
    return false;
  }
  function sandEmpty(g, j) { return g.m[j] === MAT.EMPTY; }
  /* swap two cells, shade and speed included. the thing that moved has had its turn,
     and so has anything it shoved out of the way. the empty space it left behind has
     not: that is free for the next grain down the stream, or a pour stutters. */
  function sandSwap(g, i, j) {
    var m = g.m, t = m[j];
    m[j] = m[i]; m[i] = t;
    t = g.sh[j]; g.sh[j] = g.sh[i]; g.sh[i] = t;
    t = g.vy[j]; g.vy[j] = g.vy[i]; g.vy[i] = t;
    g.stamp[j] = g.tick;
    if (m[i] !== MAT.EMPTY) g.stamp[i] = g.tick;
  }
  /* put a brand new thing in a cell */
  function sandSet(g, j, v) {
    g.m[j] = v; g.vy[j] = 0; g.aux[j] = 0; g.sh[j] = irnd(256);
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

  /* gunpowder going off: everything in a little ball turns to fire. stone survives. */
  function sandBoom(g, i) {
    var m = g.m, R = 5, x0 = i % g.gw, y0 = (i / g.gw) | 0;
    g.score += 5; g.fx.boom++;
    for (var dy = -R; dy <= R; dy++) for (var dx = -R; dx <= R; dx++) {
      if (dx * dx + dy * dy > R * R + 1) continue;
      var x = x0 + dx, y = y0 + dy;
      if (x < 0 || y < 0 || x >= g.gw || y >= g.gh) continue;
      var j = y * g.gw + x, t = m[j], r = Math.random();
      if (t === MAT.STONE || t === MAT.LAVA || t === MAT.FAUCET || t === MAT.DRAIN || t === MAT.CLONER || t === MAT.TORCH) continue;
      if (t === MAT.GLASS) { if (r < 0.5) m[j] = MAT.SAND; continue; }
      if (t === MAT.WATER) m[j] = MAT.STEAM;
      else if (t === MAT.ICE) m[j] = MAT.WATER;
      else if (t === MAT.EMPTY || t === MAT.SMOKE) { m[j] = r < 0.3 ? MAT.FIRE : MAT.EMPTY; }
      else if (t === MAT.SAND || t === MAT.ASH || t === MAT.SALT) { if (r < 0.6) m[j] = MAT.EMPTY; }
      else if (r < 0.85) m[j] = MAT.FIRE;
    }
    m[i] = MAT.FIRE;
  }

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
      else if (n === MAT.WATER && r < 0.1) { m[i] = MAT.STEAM; return; }
    }
    /* a clean flame (off a torch, or out of a gas cloud) burns longer, climbs faster,
       and leaves no ash. fire's shade is free, since fire flickers: it holds the flag */
    var clean = g.sh[i] >= SAND_CLEAN;
    if (Math.random() < (fed ? 0.04 : (clean ? 0.11 : 0.15))) {
      r = Math.random();
      m[i] = (r < 0.3 && !clean && g.sh[i] < 128) ? MAT.ASH : (r < 0.45 ? MAT.SMOKE : MAT.EMPTY);
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

  function sandSteam(g, i, x, y) {
    var m = g.m, j, t, nx, dd;
    /* it rains, eventually. but not on lava: that would cool it into a crust */
    if (Math.random() < 0.02 && sandHas(g, x, y, MAT.LAVA) < 0) { m[i] = MAT.WATER; g.vy[i] = 0; return; }
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

  /* smoke: rises like steam, wobbles, and just goes away. it never rains. */
  function sandSmoke(g, i, x, y) {
    var j, dd, nx, t;
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
    var m = g.m, k, j, r, nx = x, ny = y;
    for (k = 0; k < 4; k++) {
      j = sandNb(g, x, y, k);
      if (j >= 0 && sandHot(m[j])) { m[i] = MAT.FIRE; g.sh[i] = SAND_CLEAN; g.fx.whoosh++; return; }
    }
    if (Math.random() < 0.4) return;
    r = Math.random();
    if (r < 0.35) ny--; else if (r < 0.45) ny++; else nx += r < 0.725 ? -1 : 1;
    if (nx < 0 || ny < 0 || nx >= g.gw || ny >= g.gh) return;
    j = ny * g.gw + nx;
    if (m[j] === MAT.EMPTY) sandSwap(g, i, j);
  }

  /* a liquid slides along the surface it is lying on, up to a few cells at a time.
     one cell a tick looks like treacle; this is what makes a puddle level out. */
  function sandSpread(g, i, x, y, range) {
    var dd = Math.random() < 0.5 ? -1 : 1, t, s, nx, j, best, reach = 1 + irnd(range);
    for (t = 0; t < 2; t++, dd = -dd) {
      best = -1;
      for (s = 1; s <= reach; s++) {
        nx = x + dd * s;
        if (nx < 0 || nx >= g.gw) break;
        j = y * g.gw + nx;
        if (!sandEmpty(g, j)) break;
        best = j;
      }
      if (best >= 0) { sandSwap(g, i, best); return true; }
    }
    return false;
  }

  /* a light thing under a heavier one swaps places with it: that is floating */
  function sandFloat(g, i, x, y) {
    var j = sandNb(g, x, y, 0), v = g.m[i];
    if (j >= 0 && g.stamp[j] !== g.tick && SAND_FREE[g.m[j]] === 1 && SAND_DENS[g.m[j]] > SAND_DENS[v] && Math.random() < 0.5) {
      sandSwap(g, i, j); return true;
    }
    return false;
  }

  /* sand, ash, gunpowder, salt, seeds: fall, slide off piles, sink through lighter stuff */
  function sandPowder(g, i, x, y) {
    var m = g.m, v = m[i], j, t, nx, ny, dd;
    if (v === MAT.GUNPOWDER && (sandHas(g, x, y, MAT.FIRE) >= 0 || sandHas(g, x, y, MAT.LAVA) >= 0 ||
                                sandHas(g, x, y, MAT.EMBER) >= 0 || sandHas(g, x, y, MAT.TORCH) >= 0)) {
      sandBoom(g, i); return;
    }
    if (v === MAT.SALT) {
      j = sandHas(g, x, y, MAT.ICE);
      if (j >= 0 && Math.random() < 0.08) { m[j] = MAT.WATER; m[i] = MAT.EMPTY; g.score++; return; }
      j = sandHas(g, x, y, MAT.PLANT);
      if (j < 0) j = sandHas(g, x, y, MAT.FLOWER);
      if (j >= 0 && Math.random() < 0.08) { m[j] = MAT.EMPTY; m[i] = MAT.EMPTY; g.score++; return; }
      if (sandHas(g, x, y, MAT.WATER) >= 0 && Math.random() < 0.02) { m[i] = MAT.EMPTY; return; }
    } else if (v === MAT.SEED && y + 1 < g.gh) {
      /* a seed sitting on soil, with water touching it, sprouts. the number it is
         given is how tall it is going to get. */
      t = m[i + g.gw];
      if ((t === MAT.SAND || t === MAT.ASH || t === MAT.PLANT) && sandHas(g, x, y, MAT.WATER) >= 0 && Math.random() < 0.04) {
        m[i] = MAT.PLANT; g.aux[i] = 8 + irnd(22); g.score++; return;
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
    if (v === MAT.WATER) {
      j = sandHas(g, x, y, MAT.LAVA);
      if (j >= 0) { m[j] = MAT.STONE; m[i] = MAT.STEAM; g.score++; g.fx.hiss++; return; }
      if (sandHas(g, x, y, MAT.ICE) >= 0 && Math.random() < 0.004) { m[i] = MAT.ICE; return; }
    } else if (v === MAT.LAVA) {
      j = sandHas(g, x, y, MAT.WATER);
      if (j >= 0) { m[j] = MAT.STEAM; m[i] = MAT.STONE; g.score++; g.fx.hiss++; return; }
      for (k = 0; k < 4; k++) {
        j = sandNb(g, x, y, k);
        if (j < 0) continue;
        t = m[j]; r = Math.random();
        if ((t === MAT.OIL && r < 0.1) || ((t === MAT.PLANT || t === MAT.FLOWER || t === MAT.SEED) && r < 0.05) ||
            (t === MAT.WOOD && r < 0.02)) m[j] = t === MAT.WOOD ? MAT.EMBER : MAT.FIRE;
        else if (t === MAT.SAND && r < 0.01) { m[j] = MAT.GLASS; g.score++; }
        else if (t === MAT.GUNPOWDER) sandBoom(g, j);
      }
      if (m[i] !== v) return;   /* a neighbouring explosion got to it */
    } else if (v === MAT.ACID) {
      for (k = 0; k < 4 && !gone; k++) {
        j = sandNb(g, x, y, k);
        if (j < 0) continue;
        t = m[j]; p = 0;
        if (t === MAT.STONE) p = 0.006;
        else if (t === MAT.SAND || t === MAT.WOOD || t === MAT.PLANT || t === MAT.ICE || t === MAT.SEED ||
                 t === MAT.FLOWER || t === MAT.GUNPOWDER || t === MAT.ASH) p = 0.04;
        if (p && Math.random() < p) {
          m[j] = MAT.EMPTY;
          if (Math.random() < 0.3) gone = true;   /* acid is used up eating things */
        }
      }
      if (gone) { m[i] = MAT.EMPTY; return; }
    }

    if (y + 1 < g.gh && sandFall(g, i, x, y, v)) return;
    if (sandFloat(g, i, x, y)) return;
    if (v === MAT.LAVA && Math.random() > 0.35) return;
    sandSpread(g, i, x, y, v === MAT.LAVA ? 1 : (v === MAT.WATER ? 6 : 4));
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
    var c = 1 + irnd(5), P5 = [[0, 0], [-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1], [0, -2]];
    for (var k = 0; k < P5.length; k++) {
      var nx = x + P5[k][0], ny = y + P5[k][1];
      if (nx < 0 || ny < 0 || nx >= g.gw) continue;
      var j = ny * g.gw + nx;
      if (k && g.m[j] !== MAT.EMPTY) continue;
      g.m[j] = MAT.FLOWER; g.aux[j] = 0;
      g.sh[j] = irnd(42) * 6 + (k === 0 ? 0 : c);   /* shade % 6 is the colour */
    }
    g.score += 3; g.fx.bloom++;
  }

  /* things that do not move, but do things anyway */
  function sandStatic(g, i, x, y) {
    var m = g.m, v = m[i], j, k, t;
    if (v === MAT.PLANT) {
      if (g.aux[i]) { if (Math.random() < 0.15) sandGrow(g, i, x, y, g.aux[i]); return; }
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
    } else if (v === MAT.ICE) {
      /* lava takes ice away outright. any water or steam it left behind would rain back
         onto the lava and cool it into a stone lid. stone conducts: lava heats the stone
         next to it, and that stone heats the ice, so a crust slows the melt but does not stop it. */
      if (sandHas(g, x, y, MAT.LAVA) >= 0 && Math.random() < 0.03) { m[i] = MAT.EMPTY; g.score++; }
      else if ((sandHas(g, x, y, MAT.FIRE) >= 0 || sandHas(g, x, y, MAT.TORCH) >= 0) && Math.random() < 0.03) { m[i] = MAT.WATER; g.score++; }
      else if (sandHeatedStone(g, x, y) && Math.random() < 0.01) { m[i] = MAT.EMPTY; g.score++; }
    } else if (v === MAT.EMBER) {
      /* burning wood: glows for a few seconds, lights its neighbours, then falls to ash */
      for (k = 0; k < 4; k++) {
        j = sandNb(g, x, y, k);
        if (j < 0) continue;
        t = m[j]; var r = Math.random();
        if (t === MAT.WATER) { m[j] = MAT.STEAM; m[i] = MAT.ASH; g.score++; g.fx.hiss++; return; }
        else if (t === MAT.WOOD && r < 0.015) m[j] = MAT.EMBER;
        else if ((t === MAT.OIL && r < 0.3) || ((t === MAT.PLANT || t === MAT.FLOWER) && r < 0.1)) m[j] = MAT.FIRE;
        else if (t === MAT.GUNPOWDER) { sandBoom(g, j); return; }
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
      j = sandHas(g, x, y, MAT.WATER);
      if (j >= 0 && Math.random() < 0.1) { m[j] = MAT.STEAM; g.fx.hiss++; }
    } else if (v === MAT.CLONER) {
      var a = g.aux[i];
      if (!a) {
        for (k = 0; k < 4; k++) {
          j = sandNb(g, x, y, k);
          if (j < 0) continue;
          t = m[j];
          if (t !== MAT.EMPTY && t !== MAT.CLONER && t !== MAT.FAUCET && t !== MAT.DRAIN && t !== MAT.STONE &&
              t !== MAT.WOOD && t !== MAT.GLASS && t !== MAT.EMBER && t !== MAT.TORCH && t !== MAT.FLOWER) { g.aux[i] = t; break; }
        }
      } else if (Math.random() < 0.35) {
        j = sandNb(g, x, y, irnd(4));
        if (j >= 0 && m[j] === MAT.EMPTY) { sandSet(g, j, a); g.stamp[j] = g.tick; }
      }
    } else if (v === MAT.FAUCET) {
      j = i + g.gw;
      if (y + 1 < g.gh && m[j] === MAT.EMPTY && Math.random() < 0.5) sandSet(g, j, MAT.WATER);
    } else if (v === MAT.DRAIN) {
      for (k = 0; k < 4; k++) {
        j = sandNb(g, x, y, k);
        if (j < 0) continue;
        t = m[j];
        if (t === MAT.EMPTY || t === MAT.STONE || t === MAT.WOOD || t === MAT.ICE || t === MAT.TORCH ||
            t === MAT.FAUCET || t === MAT.DRAIN || t === MAT.GLASS || t === MAT.CLONER) continue;
        if (Math.random() < 0.5) m[j] = MAT.EMPTY;
      }
    }
  }

  function sandStep(g) {
    var gw = g.gw, gh = g.gh, m = g.m, st = g.stamp, T = ++g.tick, y, xi, x, i, v;
    g.parity ^= 1;
    /* bottom to top, alternating left and right, so nothing gets a free ride */
    for (y = gh - 1; y >= 0; y--) {
      var flip = ((y + g.parity) & 1) === 1;
      for (xi = 0; xi < gw; xi++) {
        x = flip ? gw - 1 - xi : xi;
        i = y * gw + x;
        if (st[i] === T) continue;
        v = m[i];
        if (v === MAT.EMPTY || v === MAT.STONE || v === MAT.WOOD || v === MAT.GLASS || v === MAT.FLOWER) continue;
        if (v === MAT.FIRE) sandFire(g, i, x, y);
        else if (v === MAT.STEAM) sandSteam(g, i, x, y);
        else if (v === MAT.SMOKE) sandSmoke(g, i, x, y);
        else if (v === MAT.GAS) sandGas(g, i, x, y);
        else if (v === MAT.SAND || v === MAT.ASH || v === MAT.GUNPOWDER || v === MAT.SALT || v === MAT.SEED) sandPowder(g, i, x, y);
        else if (v === MAT.WATER || v === MAT.OIL || v === MAT.ACID || v === MAT.LAVA) sandLiquid(g, i, x, y);
        else sandStatic(g, i, x, y);
      }
    }
  }

  /* painting. the mouse is read every frame, not only when it moves, so holding
     still keeps pouring, and a fast stroke is joined up instead of dotted.
     solid=true fills every empty cell, which is what a ruled line wants. */
  function sandDab(g, cx, cy, v, solid) {
    var r = g.size, ix = Math.round(cx), iy = Math.round(cy), pour = SAND_POUR[v], j;
    for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r + r) continue;
      var x = ix + dx, y = iy + dy;
      if (x < 0 || y < 0 || x >= g.gw || y >= g.gh) continue;
      j = y * g.gw + x;
      if (!pour) sandSet(g, j, v);
      else if (g.m[j] === MAT.EMPTY && (solid || Math.random() < pour)) sandSet(g, j, v);
    }
  }
  function sandStroke(g, ax, ay, bx, by, v, solid) {
    var dx = bx - ax, dy = by - ay;
    var n = Math.min(200, Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / Math.max(1, g.size * 0.5))));
    for (var s = 0; s <= n; s++) sandDab(g, ax + dx * s / n, ay + dy * s / n, v, solid);
  }
  function sandBrush(g) { return g.btn === 2 ? MAT.EMPTY : SAND_PICK[g.sel].m; }   /* right button always erases */
  function sandCell(g) {
    return { x: clamp((g.mx - SAND_PANEL) / g.cell, 0, g.gw - 1), y: clamp(g.my / g.cell, 0, g.gh - 1) };
  }
  function sandPaint(g) {
    if (!g.down || g.btn === 1 || g.keys.alt || g.ax != null) { g.lx = null; return; }
    if (g.mx < SAND_PANEL || g.mx >= g.w || g.my < 0 || g.my >= g.h) { g.lx = null; return; }
    var p = sandCell(g);
    if (g.keys.shift) { g.ax = p.x; g.ay = p.y; g.av = sandBrush(g); g.lx = null; return; }   /* start a ruled line */
    if (g.lx == null) { g.lx = p.x; g.ly = p.y; }
    sandStroke(g, g.lx, g.ly, p.x, p.y, sandBrush(g), false);
    g.lx = p.x; g.ly = p.y;
  }
  function sandRelease(g) {
    if (g.ax == null) return;
    var p = sandCell(g);
    sandStroke(g, g.ax, g.ay, p.x, p.y, g.av, true);
    g.ax = null;
  }
  /* middle-click (or alt-click) picks up whatever is under the cursor */
  function sandEyedrop(g) {
    var p = sandCell(g), v = g.m[Math.round(p.y) * g.gw + Math.round(p.x)];
    if (v === MAT.STEAM) v = MAT.WATER;
    else if (v === MAT.SMOKE) v = MAT.FIRE;
    else if (v === MAT.EMBER) v = MAT.WOOD;
    else if (v === MAT.FLOWER) v = MAT.SEED;
    for (var k = 0; k < SAND_PICK.length; k++) if (SAND_PICK[k].m === v) { g.sel = k; return; }
  }

  function sandRowAt(x, y) {
    if (x >= SAND_PANEL || y < SAND_ROW0) return -1;
    var row = Math.floor((y - SAND_ROW0) / SAND_ROWH);
    return row < SAND_PICK.length ? row : -1;
  }

  /* a starter landscape: rolling stone, a skin of sand, a pond in the lowest dip,
     a tree that is asking for it, and some sand still in the air */
  function sandLandscape(g) {
    var gw = g.gw, gh = g.gh, m = g.m, x, y, top = [], ph = Math.random() * 6, lo = 0;
    sandClear(g);
    for (x = 0; x < gw; x++) {
      var hgt = gh - 10 - Math.round(Math.sin(x * 0.16 + ph) * 4 + Math.sin(x * 0.05 + ph * 2) * 7);
      for (y = hgt; y < gh; y++) m[y * gw + x] = MAT.STONE;
      for (y = hgt - 3; y < hgt; y++) m[y * gw + x] = MAT.SAND;
      top[x] = hgt - 3;
      if (top[x] > top[lo]) lo = x;
    }
    /* fill the deepest dip up to just under its lip */
    var L = top[lo] - 8, x0 = lo, x1 = lo;
    while (x0 > 0 && top[x0 - 1] > L) x0--;
    while (x1 < gw - 1 && top[x1 + 1] > L) x1++;
    for (x = x0; x <= x1; x++) for (y = L; y < top[x]; y++) m[y * gw + x] = MAT.WATER;
    /* a tree, somewhere dry */
    for (var tries = 0; tries < 20; tries++) {
      var tx = 12 + irnd(gw - 24);
      if (tx > x0 - 8 && tx < x1 + 8) continue;
      var ty = top[tx];
      for (y = ty - 14; y < ty; y++) { m[y * gw + tx] = MAT.WOOD; m[y * gw + tx + 1] = MAT.WOOD; }
      for (var dy = -5; dy <= 5; dy++) for (var dx = -8; dx <= 8; dx++) {
        if (dx * dx / 64 + dy * dy / 25 < 1 + Math.random() * 0.3 && ty - 16 + dy >= 0 && tx + dx >= 0 && tx + dx < gw)
          m[(ty - 16 + dy) * gw + tx + dx] = MAT.PLANT;
      }
      break;
    }
    /* some sand still in the air, for the first second */
    for (var b = 0; b < 2; b++) {
      var cx = 16 + irnd(gw - 32), cy = 14 + irnd(24);
      for (dy = -7; dy <= 7; dy++) for (dx = -10; dx <= 10; dx++) {
        if (dx * dx / 100 + dy * dy / 49 < 1) m[(cy + dy) * gw + cx + dx] = MAT.SAND;
      }
    }
  }

  function sandInit(g) {
    g.cell = 3;
    g.gw = Math.floor((g.w - SAND_PANEL) / g.cell);
    g.gh = Math.floor(g.h / g.cell);
    var n = g.gw * g.gh, i;
    g.m = new Uint8Array(n);
    g.stamp = new Uint32Array(n);
    g.aux = new Uint8Array(n);   /* what each cloner has memorised; how much taller each stalk tip will get */
    g.sh = new Uint8Array(n);    /* which shade this grain was dealt. it travels with the grain */
    g.vy = new Uint8Array(n);    /* how fast it is falling */
    for (i = 0; i < n; i++) g.sh[i] = irnd(256);
    g.tick = 0; g.parity = 0;
    g.fx = { boom: 0, hiss: 0, whoosh: 0, bloom: 0 };
    /* the picture is drawn into a small canvas at grid size, then stretched */
    g.vc = document.createElement("canvas");
    g.vc.width = g.gw; g.vc.height = g.gh;
    g.vctx = g.vc.getContext("2d");
    g.img = g.vctx.createImageData(g.gw, g.gh);
    g.px = new Uint32Array(g.img.data.buffer);
    /* and the glow: hot cells only, shrunk twice (which blurs them), then laid over the top */
    g.gc = document.createElement("canvas");
    g.gc.width = g.gw; g.gc.height = g.gh;
    g.gctx = g.gc.getContext("2d");
    g.gimg = g.gctx.createImageData(g.gw, g.gh);
    g.gpx = new Uint32Array(g.gimg.data.buffer);
    g.gc2 = document.createElement("canvas");
    g.gc2.width = Math.ceil(g.gw / 2); g.gc2.height = Math.ceil(g.gh / 2);
    g.gc4 = document.createElement("canvas");
    g.gc4.width = Math.ceil(g.gw / 4); g.gc4.height = Math.ceil(g.gh / 4);
    g.dep = new Uint8Array(g.gw);
    /* the sky: a faint gradient, one colour per row */
    var top = hexRGB("#121a2c"), bot = hexRGB("#06080c");
    g.bg = new Uint32Array(g.gh);
    for (i = 0; i < g.gh; i++) {
      var t = i / (g.gh - 1);
      g.bg[i] = rgb32([lerp(top[0], bot[0], t), lerp(top[1], bot[1], t), lerp(top[2], bot[2], t)], 1);
    }
    g.sel = 0; g.size = 4; g.paused = 0; g.acc = 0; g.lx = null; g.ax = null;
    sandLandscape(g);
  }

  function sandClear(g) { g.m.fill(0); g.aux.fill(0); g.vy.fill(0); }

  /* the sound department, rationed: one bang per bang, not one per grain of powder */
  function sandSounds(g) {
    var f = g.fx, t = g.t;
    if (!g.quiet) {
      if (f.boom && t - (g.sBoom || 0) > 0.12) { g.sBoom = t; tone(70, 0.3, "sine", 0.14, 32); hiss(0.4, 0.1, 1800, 120); }
      else if (f.whoosh && t - (g.sWhoosh || 0) > 0.3) { g.sWhoosh = t; hiss(0.35, 0.07, 400, 2600); }
      if (f.hiss && t - (g.sHiss || 0) > 0.15) { g.sHiss = t; hiss(0.12, 0.025, 6000, 2500); }
      if (f.bloom && t - (g.sBloom || 0) > 0.1) { g.sBloom = t; tone(1046 + irnd(4) * 262, 0.08, "sine", 0.035); }
    }
    f.boom = f.hiss = f.whoosh = f.bloom = 0;
  }

  function sandUpdate(g, dt) {
    sandPaint(g);
    if (g.paused) return;
    /* the simulation runs at 45 ticks a second, whatever the frame rate is */
    g.acc += dt;
    var n = 0;
    while (g.acc >= 1 / 45 && n < 2) { g.acc -= 1 / 45; sandStep(g); n++; }
    if (g.acc > 1 / 45) g.acc = 0;
    sandSounds(g);
  }

  function sandDraw(g, c) {
    var m = g.m, sh = g.sh, px = g.px, gp = g.gpx, gw = g.gw, gh = g.gh, dep = g.dep;
    var x, y, i, v, row, bg, d, hot = 0, W = MAT.WATER, sel = SAND_PICK[g.sel];
    gp.fill(0);
    for (y = 0; y < gh; y++) {
      bg = g.bg[y]; row = y * gw;
      for (x = 0; x < gw; x++) {
        i = row + x; v = m[i];
        if (v === MAT.EMPTY) { px[i] = bg; continue; }
        if (SAND_DEEP[v]) {
          /* how far down into this pool are we */
          d = (y > 0 && m[i - gw] === v) ? Math.min(15, dep[x] + 1) : 0;
          dep[x] = d;
          px[i] = SAND_DEEP[v][(d << 8) | sh[i]];
        } else if (v === MAT.FIRE || v === MAT.LAVA || v === MAT.EMBER) {
          /* the glow gets a little plus-sign per hot cell, so a lone spark still shows */
          px[i] = gp[i] = gp[i - 1] = gp[i + 1] = gp[i - gw] = gp[i + gw] = SAND_PAL[v][(Math.random() * 256) | 0];
          hot++;
        } else if (v === MAT.SAND && ((y > 0 && m[i - gw] === W) || (y < gh - 1 && m[i + gw] === W) ||
                                      (x > 0 && m[i - 1] === W) || (x < gw - 1 && m[i + 1] === W))) {
          px[i] = SAND_WET[sh[i]];
        } else if (v === MAT.CLONER) {
          /* a checkerboard of cloner purple and whatever it has memorised */
          var a = g.aux[i];
          px[i] = (a && ((x + y) & 1)) ? SAND_PAL[a][sh[i]] : SAND_PAL[v][(x + y) & 1];
        } else {
          px[i] = SAND_PAL[v][sh[i]];
          if (v === MAT.TORCH && y > 0) { gp[i] = SAND_PAL[MAT.FIRE][1]; hot++; }
        }
      }
    }
    g.vctx.putImageData(g.img, 0, 0);
    c.imageSmoothingEnabled = false;
    c.drawImage(g.vc, SAND_PANEL, 0, gw * g.cell, gh * g.cell);
    if (hot) {
      g.gctx.putImageData(g.gimg, 0, 0);
      var c2 = g.gc2.getContext("2d"), c4 = g.gc4.getContext("2d");
      c2.clearRect(0, 0, g.gc2.width, g.gc2.height);
      c2.imageSmoothingEnabled = true;
      c2.drawImage(g.gc, 0, 0, g.gc2.width, g.gc2.height);
      c4.clearRect(0, 0, g.gc4.width, g.gc4.height);
      c4.imageSmoothingEnabled = true;
      c4.drawImage(g.gc2, 0, 0, g.gc4.width, g.gc4.height);
      c.save();
      c.globalCompositeOperation = "lighter";
      c.imageSmoothingEnabled = true;
      c.globalAlpha = 0.4;
      c.drawImage(g.gc2, SAND_PANEL, 0, g.gc2.width * 2 * g.cell, g.gc2.height * 2 * g.cell);
      c.globalAlpha = 0.7;
      c.drawImage(g.gc4, SAND_PANEL, 0, g.gc4.width * 4 * g.cell, g.gc4.height * 4 * g.cell);
      c.restore();
    }

    /* the brush, as a ring under the cursor. and the line, if one is being ruled */
    var bcol = sel.m === MAT.EMPTY ? "#ffffff" : SAND_SHADES[sel.m][0];
    if (g.ax != null) {
      var p = sandCell(g);
      c.strokeStyle = g.av === MAT.EMPTY ? "#ffffff" : SAND_SHADES[g.av][0];
      c.lineWidth = (g.size * 2 + 1) * g.cell; c.lineCap = "round"; c.globalAlpha = 0.35;
      c.beginPath();
      c.moveTo(SAND_PANEL + (g.ax + 0.5) * g.cell, (g.ay + 0.5) * g.cell);
      c.lineTo(SAND_PANEL + (p.x + 0.5) * g.cell, (p.y + 0.5) * g.cell);
      c.stroke();
      c.globalAlpha = 1; c.lineCap = "butt";
    }
    if (g.mx >= SAND_PANEL) {
      c.strokeStyle = bcol;
      c.lineWidth = 1;
      c.beginPath(); c.arc(g.mx, g.my, (g.size + 0.5) * g.cell, 0, 6.2832); c.stroke();
    }

    /* the picker */
    var hov = sandRowAt(g.mx, g.my);
    rct(c, 0, 13, SAND_PANEL - 1, g.h - 13, "rgba(8,10,16,0.92)");
    rct(c, SAND_PANEL - 1, 13, 1, g.h - 13, "#26344e");
    for (var k = 0; k < SAND_PICK.length; k++) {
      var pk = SAND_PICK[k], ry = SAND_ROW0 + k * SAND_ROWH;
      if (k === g.sel) rct(c, 2, ry, SAND_PANEL - 5, SAND_ROWH - 1, "#2a3d5e");
      else if (k === hov) rct(c, 2, ry, SAND_PANEL - 5, SAND_ROWH - 1, "#17202f");
      if (pk.m === MAT.EMPTY) { rct(c, 5, ry + 1, 8, 8, "#0b0e14"); box(c, 5, ry + 1, 8, 8, "#8892a8"); }
      else {
        rct(c, 5, ry + 1, 8, 8, SAND_SHADES[pk.m][0]);
        if (SAND_SHADES[pk.m].length > 1) rct(c, 9, ry + 5, 4, 4, SAND_SHADES[pk.m][1]);
      }
      txt(c, pk.name, 16, ry + 8, 8, k === g.sel ? "#ffffff" : "#9aa6b8");
      if (pk.key) txt(c, pk.key, SAND_PANEL - 7, ry + 8, 8, "#667a94", "right");
    }

    /* size, pause, clear */
    txt(c, "SIZE", 5, SAND_SIZE_Y + 10, 8, "#9aa6b8");
    rct(c, 40, SAND_SIZE_Y, 12, 12, "#1d2a42"); box(c, 40, SAND_SIZE_Y, 12, 12, "#3a4e72");
    txt(c, "-", 46, SAND_SIZE_Y + 9, 9, "#ffffff", "center");
    txt(c, String(g.size), 60, SAND_SIZE_Y + 9, 8, "#ffd94a", "center");
    rct(c, 68, SAND_SIZE_Y, 12, 12, "#1d2a42"); box(c, 68, SAND_SIZE_Y, 12, 12, "#3a4e72");
    txt(c, "+", 74, SAND_SIZE_Y + 9, 9, "#ffffff", "center");
    rct(c, 4, SAND_BTN_Y, 36, 12, g.paused ? "#6a3d12" : "#1d2a42");
    box(c, 4, SAND_BTN_Y, 36, 12, "#3a4e72");
    txt(c, g.paused ? "PLAY" : "PAUSE", 22, SAND_BTN_Y + 9, 8, "#ffffff", "center");
    rct(c, 44, SAND_BTN_Y, 36, 12, "#1d2a42");
    box(c, 44, SAND_BTN_Y, 36, 12, "#3a4e72");
    txt(c, "CLEAR", 62, SAND_BTN_Y + 9, 8, "#ffffff", "center");
    txt(c, "WHEEL SIZE  R NEW", 5, 289, 7, "#556680");
    txt(c, "SHIFT-DRAG LINE", 5, 298, 7, "#556680");

    /* the description bar: what you are hovering, or what you have, or the keys */
    var info = hov >= 0 ? SAND_PICK[hov] : sel;
    rct(c, SAND_PANEL, g.h - 13, g.w - SAND_PANEL, 13, "rgba(0,0,0,0.6)");
    txt(c, (g.mx < SAND_PANEL && hov < 0) ? SAND_HELP : info.name + "  " + info.desc, SAND_PANEL + 4, g.h - 4, 7, "#c8d0dc");

    if (g.paused) {
      var cxp = SAND_PANEL + (g.w - SAND_PANEL) / 2;
      rct(c, cxp - 44, g.h / 2 - 12, 88, 24, "rgba(0,0,0,0.75)");
      txt(c, "PAUSED", cxp, g.h / 2 + 2, 12, "#ffd94a", "center");
      txt(c, ". = ONE STEP", cxp, g.h / 2 + 10, 7, "#c8d0dc", "center");
    }
  }

  function sandTap(g, x, y) {
    if (x >= SAND_PANEL) {
      if (g.btn === 1 || g.keys.alt) sandEyedrop(g);
      return;
    }
    var row = sandRowAt(x, y);
    if (row >= 0) { g.sel = row; return; }
    if (y >= SAND_SIZE_Y && y < SAND_SIZE_Y + 12) {
      if (x >= 40 && x < 52) g.size = clamp(g.size - 1, 1, SAND_MAXSIZE);
      else if (x >= 68 && x < 80) g.size = clamp(g.size + 1, 1, SAND_MAXSIZE);
    } else if (y >= SAND_BTN_Y && y < SAND_BTN_Y + 12) {
      if (x < 40) g.paused = g.paused ? 0 : 1;
      else sandClear(g);
    }
  }

  function sandWheel(g, d) {
    if (g.mx < SAND_PANEL) { var n = SAND_PICK.length; g.sel = (g.sel + n + d) % n; }   /* over the list: scroll the list */
    else g.size = clamp(g.size - d, 1, SAND_MAXSIZE);
  }

  function sandKey(g, k) {
    var n = SAND_PICK.length;
    if (k === "0") g.sel = 9;
    else if (k.length === 1 && k >= "1" && k <= "9") g.sel = +k - 1;
    else if (k === "e") g.sel = n - 1;
    else if (k === "arrowup") g.sel = (g.sel + n - 1) % n;
    else if (k === "arrowdown") g.sel = (g.sel + 1) % n;
    else if (k === "[" || k === "-") g.size = clamp(g.size - 1, 1, SAND_MAXSIZE);
    else if (k === "]" || k === "=" || k === "+") g.size = clamp(g.size + 1, 1, SAND_MAXSIZE);
    else if (k === " " || k === "p") g.paused = g.paused ? 0 : 1;
    else if (k === "c") sandClear(g);
    else if (k === ".") { if (g.paused) sandStep(g); }
    else if (k === "r") { sandLandscape(g); g.score = 0; }
  }

  var gSand = {
    id: "sand", name: "FALLING SAND", year: "2005", w: 480, h: 300,
    desc: "twenty kinds of pixel. pour them, light them, freeze them, grow them. it is enough for an hour.",
    init: sandInit,
    update: sandUpdate,
    draw: sandDraw,
    tap: sandTap,
    release: sandRelease,
    wheel: sandWheel,
    key: sandKey,
    score: 0
  };

  /* ===================================================================
     3. THE SHELL: loop, input, chrome
     =================================================================== */
  var VW = gSand.w, VH = gSand.h;
  var cv, ctx, vig, g, last = 0, acc = 0;

  /* a game is a bag of methods and a bag of numbers */
  function blank(def) {
    var o = {};
    for (var k in def) o[k] = def[k];
    o.def = def;
    o.score = 0;
    o.mx = o.w / 2; o.my = o.h / 2; o.down = false; o.btn = 0;
    o.keys = {};
    o.t = 0;
    return o;
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    if (!last) last = ts;
    var dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    g.t += dt;
    /* a fixed 60hz accumulator, so the sand does not care what your monitor is */
    acc += dt;
    var steps = 0;
    while (acc >= 1 / 60 && steps < 4) {
      acc -= 1 / 60; steps++;
      try { g.update(g, 1 / 60); } catch (e) { console.error(e); }
    }
    ctx.clearRect(0, 0, VW, VH);
    try { g.draw(g, ctx); } catch (e) { txt(ctx, "it fell over: " + e.message, 10, 20, 10, "#f66"); console.error(e); }
    drawChrome();
  }

  function drawChrome() {
    /* scanlines + vignette, because it is 2005 */
    if (!vig) {
      vig = document.createElement("canvas");
      vig.width = VW; vig.height = VH;
      var vg = vig.getContext("2d");
      var grd = vg.createRadialGradient(VW / 2, VH / 2, VH * 0.3, VW / 2, VH / 2, VH * 1.0);
      grd.addColorStop(0, "rgba(0,0,0,0)");
      grd.addColorStop(1, "rgba(0,0,0,0.42)");
      vg.fillStyle = grd; vg.fillRect(0, 0, VW, VH);
      vg.fillStyle = "rgba(0,0,0,0.10)";
      for (var y = 0; y < VH; y += 3) vg.fillRect(0, y, VW, 1);
    }
    ctx.drawImage(vig, 0, 0);
    rct(ctx, 0, 0, VW, 13, "rgba(0,0,0,0.55)");
    txt(ctx, "PLEASAND", 5, 10, 9, "#d8dde6");
    if (g.score) txt(ctx, "SCORE " + (g.score | 0), VW / 2, 10, 9, "#ffd94a", "center");
    txt(ctx, MUTED ? "M: SOUND OFF" : "M: SOUND ON", VW - 5, 10, 8, "#8892a8", "right");
  }

  function toGame(clientX, clientY) {
    var r = cv.getBoundingClientRect();
    g.mx = (clientX - r.left) / r.width * VW;
    g.my = (clientY - r.top) / r.height * VH;
  }

  function initInput() {
    window.addEventListener("keydown", function (e) {
      if (e.metaKey || e.ctrlKey) return;
      var k = e.key.toLowerCase();
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].indexOf(k) >= 0) e.preventDefault();
      g.keys.shift = e.shiftKey ? 1 : 0;
      g.keys.alt = e.altKey ? 1 : 0;
      if (g.keys[k]) return;
      g.keys[k] = 1;
      if (k === "m") { MUTED = !MUTED; return; }
      g.key(g, k);
    });
    window.addEventListener("keyup", function (e) {
      g.keys[e.key.toLowerCase()] = 0;
      g.keys.shift = e.shiftKey ? 1 : 0;
      g.keys.alt = e.altKey ? 1 : 0;
    });
    window.addEventListener("blur", function () { g.keys = {}; g.down = 0; });

    cv.addEventListener("mousedown", function (e) {
      e.preventDefault();
      actx();
      toGame(e.clientX, e.clientY);
      g.keys.shift = e.shiftKey ? 1 : 0;
      g.keys.alt = e.altKey ? 1 : 0;
      g.down = 1; g.btn = e.button;
      g.tap(g, g.mx, g.my);
    });
    window.addEventListener("mouseup", function () {
      g.down = 0; g.btn = 0;
      g.release(g, g.mx, g.my);
    });
    window.addEventListener("mousemove", function (e) { toGame(e.clientX, e.clientY); });
    cv.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    cv.addEventListener("wheel", function (e) {
      if (!e.deltaY) return;
      e.preventDefault();
      g.wheel(g, e.deltaY > 0 ? 1 : -1);
    }, { passive: false });
    cv.addEventListener("touchstart", function (e) {
      e.preventDefault();
      actx();
      var t = e.touches[0];
      toGame(t.clientX, t.clientY);
      g.down = 1; g.btn = 0;
      g.tap(g, g.mx, g.my);
    }, { passive: false });
    cv.addEventListener("touchmove", function (e) {
      e.preventDefault();
      var t = e.touches[0];
      toGame(t.clientX, t.clientY);
    }, { passive: false });
    cv.addEventListener("touchend", function (e) {
      e.preventDefault();
      g.down = 0;
      g.release(g, g.mx, g.my);
    }, { passive: false });
  }

  function boot() {
    cv = document.getElementById("cv");
    cv.width = VW; cv.height = VH;
    ctx = cv.getContext("2d");
    g = blank(gSand);
    g.init(g);
    initInput();
    requestAnimationFrame(frame);
  }

  window.PLEASAND = { game: function () { return g; } };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
