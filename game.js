/* =====================================================================
   PLEASAND  --  game.js

   everything you see and touch: the sky, the picture of the grid, the
   glow, the bangs, the picker, the news ticker, the mouse, the keys,
   and the loop that runs it all sixty times a second.
   ===================================================================== */
"use strict";

var UI_FONT = '"Menlo", "Consolas", "DejaVu Sans Mono", "Courier New", monospace';
var GW = Math.floor((VW - PANEL) / CELL), GH = Math.floor((VH - PLAY_Y - BAR_H) / CELL);
var ROW0 = PLAY_Y + 2, ROWH = 10, FUN_N = 7, FUN_GAP = 4;
var SIZE_Y = 341, BTN_Y = 354, BTN2_Y = 367, BTN3_Y = 380;
var TIPS = [
  "tip: pick PEASANT, grab one, and throw it at the hut",
  "tip: WHEEL changes the brush size. SHIFT-drag draws a straight line",
  "tip: middle-click picks up whatever is under the cursor. S is slow motion, R is a new village",
  "tip: pour some seeds near a duck",
  "tip: lightning in a duck pond is a terrible idea",
  "tip: peasants can swim. they cannot breathe under ice",
  "tip: put a nuke next to a cloner. then stand well back",
  "tip: lightning in a pond zaps everybody in the pond",
  "tip: fireworks make peasants happy. briefly",
  "tip: S is slow motion. try it on a nuke",
  "tip: throw a peasant hard enough, straight up, and it goes to space",
  "tip: gas pools under ceilings. a hut has a ceiling",
  "tip: seeds on sand plus water make flowers. peasants like flowers",
  "tip: press T for thermal vision. peasants are 37 degrees. mostly",
  "tip: B turns the speech bubbles off, for a quieter village. they still talk; you just cannot read it",
  "tip: boil salt water and you get your salt back",
  "tip: hold HEAT on one end of a metal bar. watch the other end",
  "tip: water on lava makes a crust. the lava under it is still lava",
  "tip: COOL a cloud of steam and it snows",
  "tip: peasants build houses, stairs, ladders and bridges out of the wood they chop. give them trees",
  "tip: draw a stone cliff too tall to jump. somebody will put stairs or a ladder up it",
  "tip: dig a ditch too wide to leap. somebody will bridge it",
  "tip: hover over a blueprint to see what is planned. the faint blue cells",
  "tip: only peasants can make doors. water and sand cannot get through them. peasants can",
  "tip: burn a house down and they will rebuild it. if most of it is gone, they will mourn it",
  "tip: a lit window means somebody is home",
  "tip: bored peasants go exploring. build them somewhere high to explore",
  "tip: peasants walk through trees and bushes, and up or down through them when they want to",
  "tip: well-fed peasants have ideas. paint them some plants, or let them farm, and see what they think of",
  "tip: a peasant who has thought of something has a light bulb over their head. hover to see what they are up to",
  "tip: hover over the header to see what the village has thought of, and what might give them more ideas",
  "tip: once they know about buckets, set fire to a house and watch",
  "tip: ducks love wheat. the peasants will think of something"
];

/* -------------------------------------------------------------------
   1. SMALL DRAWING HELPERS
   ------------------------------------------------------------------- */
function txt(c, s, x, y, size, col, align, bold) {
  c.fillStyle = col || "#fff";
  c.font = (bold ? "bold " : "") + (size || 8) + "px " + UI_FONT;
  c.textAlign = align || "left";
  c.fillText(s, x, y);
  c.textAlign = "left";
}
function rct(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
function box(c, x, y, w, h, col) {
  c.strokeStyle = col; c.lineWidth = 1;
  c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
/* tiny pixel-art icons for the picker rows that are not a material */
function iconCanvas(rows, cols) {
  var cv = document.createElement("canvas"); cv.width = 8; cv.height = 8;
  var c = cv.getContext("2d");
  for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) {
    var ch = rows[y][x];
    if (ch !== ".") { c.fillStyle = cols[ch]; c.fillRect(x, y, 1, 1); }
  }
  return cv;
}
var ICONS = {
  peasant: iconCanvas(["..hhh...", ".hhhhh..", ".hhhhhH.", "..sse...", "..sss...", ".scccs..", "..cCc...", "..p.p..."],
                      { h: "#a8322a", H: "#5a1a1a", s: "#f1c7a0", e: "#101010", c: "#3a7ac8", C: "#2a1a10", p: "#4a3a2a" }),
  duck: iconCanvas(["........", "....hh..", "....heBB", "t..bbb..", "tbbbbbb.", ".bbWWbb.", "..bbbb..", "...f.f.."],
                   { h: "#2f7a3a", e: "#101010", B: "#e8c040", t: "#f0f0f0", b: "#8a6a4a", W: "#5a5a6e", f: "#f08a20" }),
  lightning: iconCanvas(["....yyy.", "...yyy..", "..yyy...", ".yyyyyy.", "....yy..", "...yy...", "..yy....", "..y....."],
                        { y: "#ffe860" }),
  firework: iconCanvas(["...r....", "..rrr...", "..www...", "..rrr...", "..www...", "..rrr...", "...y....", "..y.y..."],
                       { r: "#e8304a", w: "#f4f4f4", y: "#ffd040" }),
  heat: iconCanvas(["...r....", "..rr....", "..rro...", ".rroor..", ".rooyor.", "rooyyoor", "rooyyoor", ".rooyor."],
                   { r: "#e8401a", o: "#ff9a20", y: "#ffe070" }),
  cool: iconCanvas(["...b....", ".b.b.b..", "..bbb...", "bbbwbbb.", "..bbb...", ".b.b.b..", "...b....", "........"],
                   { b: "#8ad8ff", w: "#ffffff" }),
  nuke: iconCanvas(["......y.", ".....y..", "...kkk..", "..kgkkk.", ".kgkkkkk", ".kkkkkkk", ".kkkkkkk", "..kkkkk."],
                   { y: "#ffd040", k: "#3a3a2a", g: "#c8ff3a" })
};

/* the sparkle on a cell of inert */
var INERT_GLINT = hex32("#f6f0ff");

/* the colour of mushroom-cloud smoke by how much life it has left: grey, then ember, then white-hot */
var MUSH_PAL = (function () {
  var t = new Uint32Array(256), grey = [86, 88, 98], warm = [190, 90, 40], hot = [255, 210, 140];
  for (var a = 0; a < 256; a++) {
    var f = a / 255, c;
    if (f < 0.55) c = [lerp(grey[0], warm[0] * 0.6, f / 0.55), lerp(grey[1], warm[1] * 0.6, f / 0.55), lerp(grey[2], warm[2] * 0.6, f / 0.55)];
    else if (f < 0.8) c = [lerp(warm[0] * 0.6, warm[0], (f - 0.55) / 0.25), lerp(warm[1] * 0.6, warm[1], (f - 0.55) / 0.25), lerp(warm[2] * 0.6, warm[2], (f - 0.55) / 0.25)];
    else c = [lerp(warm[0], hot[0], (f - 0.8) / 0.2), lerp(warm[1], hot[1], (f - 0.8) / 0.2), lerp(warm[2], hot[2], (f - 0.8) / 0.2)];
    t[a] = rgb32(c, 0.9 + Math.random() * 0.2);
  }
  return t;
})();

/* -------------------------------------------------------------------
   2. SETTING UP
   ------------------------------------------------------------------- */
function gameInit(g) {
  g.cell = CELL; g.gw = GW; g.gh = GH;
  var n = GW * GH, i, x, y;
  g.m = new Uint8Array(n);
  g.stamp = new Uint32Array(n);
  g.aux = new Uint8Array(n);
  g.sh = new Uint8Array(n);
  g.vy = new Uint8Array(n);
  g.zmark = new Uint8Array(n); g.zlist = new Int32Array(n + 8); g.zn = 0; g.zt = 0;
  g.pmark = new Uint32Array(n); g.pstack = new Int32Array(n); g.pgen = 0; g.pressList = new Int32Array(PRESS_TRIES); g.pressN = 0;
  partInit(g);
  heatInit(g);
  g.tick = 0; g.parity = 0;
  g.fx = { boom: 0, bigboom: 0, hiss: 0, whoosh: 0, bloom: 0, burst: 0, whistle: 0, thunder: 0, zap: 0,
           pop: 0, thud: 0, splat: 0, die: 0, ghost: 0, whee: 0, fanfare: 0, splash: 0, quack: 0, peep: 0, squeak: 0,
           hammer: 0, saw: 0, idea: 0 };
  g.snd = {};
  g.peasants = []; g.ghosts = []; g.pid = 0; g.rip = 0; g.astronauts = 0;
  g.feed = []; g.banners = []; g.got = {}; g.cloneN = {}; g.cloneSrc = {}; g.bolts = []; g.rings = []; g.shake = 0; g.flash = 0; g.fwGlow = null;
  g.ducks = []; g.did = 0; g.heldDuck = null;
  g.sites = []; g.sid = 0;
  g.held = null; g.cx = 0; g.cy = 0; g.pcx = 0; g.pcy = 0; g.cvx = 0; g.cvy = 0; g.toolT = 0;
  g.intro = 0; g.tip = irnd(TIPS.length);

  /* the picture is drawn into a small canvas at grid size, then stretched */
  g.vc = document.createElement("canvas"); g.vc.width = GW; g.vc.height = GH;
  g.vctx = g.vc.getContext("2d");
  g.img = g.vctx.createImageData(GW, GH);
  g.px = new Uint32Array(g.img.data.buffer);
  /* and the glow: hot cells only, shrunk twice (which blurs them), then laid over the top */
  g.gc = document.createElement("canvas"); g.gc.width = GW; g.gc.height = GH;
  g.gctx = g.gc.getContext("2d");
  g.gimg = g.gctx.createImageData(GW, GH);
  g.gpx = new Uint32Array(g.gimg.data.buffer);
  g.gc2 = document.createElement("canvas"); g.gc2.width = Math.ceil(GW / 2); g.gc2.height = Math.ceil(GH / 2);
  g.gc4 = document.createElement("canvas"); g.gc4.width = Math.ceil(GW / 4); g.gc4.height = Math.ceil(GH / 4);
  g.gc2x = g.gc2.getContext("2d"); g.gc4x = g.gc4.getContext("2d");
  g.dep = new Uint8Array(GW);
  g.haze = new Int8Array(GH);
  g.wave = new Uint8Array(GW);

  /* the sky: a dusk gradient, two rows of far hills, a moon, and stars that twinkle */
  g.bg = new Uint32Array(n);
  var top = hexRGB("#0a1026"), mid = hexRGB("#1c1d3c"), bot = hexRGB("#3a2a48");
  var far = [], near = [], ph = Math.random() * 10;
  for (x = 0; x < GW; x++) {
    far[x] = GH * 0.48 + Math.sin(x * 0.03 + ph) * 12 + Math.sin(x * 0.011 + ph * 3) * 18;
    near[x] = GH * 0.62 + Math.sin(x * 0.05 + ph * 2) * 9 + Math.sin(x * 0.017 + ph) * 12;
  }
  var mx = Math.round(GW * (0.65 + Math.random() * 0.25)), my = 26, mr = 9;
  for (y = 0; y < GH; y++) {
    var t = y / (GH - 1), col = t < 0.6 ? [lerp(top[0], mid[0], t / 0.6), lerp(top[1], mid[1], t / 0.6), lerp(top[2], mid[2], t / 0.6)]
                                      : [lerp(mid[0], bot[0], (t - 0.6) / 0.4), lerp(mid[1], bot[1], (t - 0.6) / 0.4), lerp(mid[2], bot[2], (t - 0.6) / 0.4)];
    for (x = 0; x < GW; x++) {
      i = y * GW + x;
      var c = col, f = 1;
      var dm = Math.sqrt((x - mx) * (x - mx) + (y - my) * (y - my));
      if (dm < mr) {
        c = [236, 230, 206];
        f = (((x * 7 + y * 13) % 11 === 0) || (dm < 4 && x < mx)) ? 0.86 : 1;
        if (dm > mr - 1) f *= 0.9;
      } else if (y > near[x]) { c = [col[0] * 0.42, col[1] * 0.4, col[2] * 0.5]; }
      else if (y > far[x]) { c = [col[0] * 0.66, col[1] * 0.64, col[2] * 0.74]; }
      else if (dm < mr * 3.2) { f = 1 + 0.35 * (1 - dm / (mr * 3.2)); }
      g.bg[i] = rgb32(c, f);
    }
  }
  g.stars = [];
  for (var s = 0; s < 150; s++) {
    x = irnd(GW); y = irnd(Math.floor(GH * 0.55));
    i = y * GW + x;
    if (y > far[x] - 1 || Math.abs(x - mx) < mr + 2 && Math.abs(y - my) < mr + 2) continue;
    var b = 0.35 + Math.random() * 0.65;
    g.bg[i] = rgb32([200 + irnd(55), 210 + irnd(45), 255], b);
    if (Math.random() < 0.3) g.stars.push({ i: i, b: b, p: Math.random() * 6.28, s: 1 + Math.random() * 3 });
  }

  g.sel = FUN_N; g.size = 5; g.paused = 0; g.slow = 0; g.lx = null; g.ax = null;
  sandLandscape(g);
}

/* -------------------------------------------------------------------
   3. PAINTING AND TOOLS
   ------------------------------------------------------------------- */
function sandDab(g, cx, cy, v, solid) {
  var r = g.size, ix = Math.round(cx), iy = Math.round(cy), pour = SAND_POUR[v], j;
  for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy > r * r + r) continue;
    var x = ix + dx, y = iy + dy;
    if (x < 0 || y < 0 || x >= g.gw || y >= g.gh) continue;
    j = y * g.gw + x;
    if (g.m[j] === MAT.INERT && v !== MAT.EMPTY) continue;   /* only erasing moves it */
    if (!pour) sandPlace(g, j, v);
    else if (g.m[j] === MAT.EMPTY && (solid || Math.random() < pour)) sandPlace(g, j, v);
  }
}
function sandStroke(g, ax, ay, bx, by, v, solid) {
  var dx = bx - ax, dy = by - ay;
  var n = Math.min(300, Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / Math.max(1, g.size * 0.5))));
  for (var s = 0; s <= n; s++) sandDab(g, ax + dx * s / n, ay + dy * s / n, v, solid);
}
function curPick(g) { return PICK[g.sel]; }
/* the cell under the cursor */
function cellAt(g) { var p = sandCell(g); return Math.round(p.y) * g.gw + Math.round(p.x); }
/* what a cell is called, for the readout */
var MAT_NAME = [];
PICK.forEach(function (p) { if (!p.tool) MAT_NAME[p.m] = p.name; });
MAT_NAME[MAT.EMPTY] = "AIR"; MAT_NAME[MAT.STEAM] = "STEAM"; MAT_NAME[MAT.SMOKE] = "SMOKE";
MAT_NAME[MAT.EMBER] = "EMBER"; MAT_NAME[MAT.FLOWER] = "FLOWER";
/* the things only peasants make */
MAT_NAME[MAT.PLANK] = "PLANKS"; MAT_NAME[MAT.DOOR] = "DOOR"; MAT_NAME[MAT.LADDER] = "LADDER"; MAT_NAME[MAT.STAIRS] = "STAIRS";
MAT_NAME[MAT.BED] = "BED"; MAT_NAME[MAT.SAPLING] = "SAPLING";
MAT_NAME[MAT.SOIL] = "TILLED EARTH"; MAT_NAME[MAT.CROP] = "YOUNG WHEAT"; MAT_NAME[MAT.WHEAT] = "RIPE WHEAT"; MAT_NAME[MAT.LAMP] = "LANTERN";
/* a cell partway through melting, boiling or setting says so */
var MAT_UP = [], MAT_DOWN = [];
MAT_UP[MAT.WATER] = MAT_UP[MAT.SALTWATER] = "boiling"; MAT_UP[MAT.ICE] = MAT_UP[MAT.SNOW] = "melting";
MAT_UP[MAT.STONE] = MAT_UP[MAT.GLASS] = MAT_UP[MAT.METAL] = "melting"; MAT_UP[MAT.SAND] = MAT_UP[MAT.SOIL] = "fusing"; MAT_UP[MAT.ACID] = "boiling";
MAT_DOWN[MAT.WATER] = MAT_DOWN[MAT.SALTWATER] = "freezing"; MAT_DOWN[MAT.STEAM] = "condensing"; MAT_DOWN[MAT.LAVA] = "setting";
function cellReadout(g, j) {
  var v = g.m[j], e = g.lat[j], name = MAT_NAME[v] || "", s;
  if (v === MAT.LAVA && g.aux[j] === MAT.GLASS) name = "MOLTEN GLASS";
  else if (v === MAT.LAVA && g.aux[j] === MAT.METAL) name = "MOLTEN METAL";
  else if (v === MAT.PLANK && g.aux[j] === 1) name = "WINDOW";
  /* part of something they built, or are building */
  var site = bReadout(g, j);
  if (site) name = name + " · " + site;
  s = name + "  " + heatLabel(g.T[j]);
  if (e > 0 && MAT_UP[v]) s += "  " + MAT_UP[v] + " " + Math.min(99, Math.round(e / HEAT_HI_L[v] * 100)) + "%";
  else if (e < 0 && MAT_DOWN[v]) {
    var L = v === MAT.LAVA ? HEAT_HI_L[g.aux[j] || MAT.STONE] : HEAT_LO_L[v];
    s += "  " + MAT_DOWN[v] + " " + Math.min(99, Math.round(-e / L * 100)) + "%";
  }
  return s;
}
function sandBrush(g) { return g.btn === 2 ? MAT.EMPTY : curPick(g).m; }   /* right button always erases */
function sandCell(g) { return { x: clamp(g.cx, 0, g.gw - 1), y: clamp(g.cy, 0, g.gh - 1) }; }
function inPlay(g) { return g.mx >= PANEL && g.mx < VW && g.my >= PLAY_Y && g.my < PLAY_Y + GH * CELL; }
function painting(g) { var p = curPick(g); return g.btn === 2 || (!p.tool && p.m !== MAT.NUKE); }

function sandPaint(g) {
  if (!g.down || g.btn === 1 || g.keys.alt || g.ax != null || !painting(g)) { g.lx = null; return; }
  if (!inPlay(g)) { g.lx = null; return; }
  var p = sandCell(g);
  if (g.keys.shift) { g.ax = p.x; g.ay = p.y; g.av = sandBrush(g); g.lx = null; return; }   /* start a ruled line */
  if (g.lx == null) { g.lx = p.x; g.ly = p.y; }
  sandStroke(g, g.lx, g.ly, p.x, p.y, sandBrush(g), false);
  g.lx = p.x; g.ly = p.y;
}
function sandRelease(g) {
  if (g.held) peasantThrow(g, g.held);
  if (g.heldDuck) duckThrow(g, g.heldDuck);
  if (g.ax == null) return;
  var p = sandCell(g);
  sandStroke(g, g.ax, g.ay, p.x, p.y, g.av, true);
  g.ax = null;
}
/* held-down tools repeat: peasants keep coming, lightning keeps striking */
function toolHold(g) {
  if (!g.down || g.btn !== 0 || !inPlay(g) || g.keys.alt) return;
  var t = curPick(g).tool;
  if (!t || g.held || g.heldDuck) return;
  if (--g.toolT > 0) return;
  if (t === "lightning") {
    g.toolT = 22;
    sandLightning(g, g.cx);
  } else if (t === "heat" || t === "cool") {
    g.toolT = 0;
    heatBrush(g, g.cx, g.cy, t === "heat" ? 1 : -1);
  }
}
/* middle-click (or alt-click) picks up whatever is under the cursor */
function sandEyedrop(g) {
  if (peasantAt(g, g.cx, g.cy)) { g.sel = 0; return; }
  if (duckAt(g, g.cx, g.cy)) { g.sel = 1; return; }
  var p = sandCell(g), v = g.m[Math.round(p.y) * g.gw + Math.round(p.x)];
  if (v === MAT.STEAM) v = MAT.WATER;
  else if (v === MAT.SMOKE) v = MAT.FIRE;
  else if (v === MAT.EMBER) v = MAT.WOOD;
  else if (v === MAT.FLOWER) v = MAT.SEED;
  for (var k = 0; k < PICK.length; k++) if (!PICK[k].tool && PICK[k].m === v) { g.sel = k; return; }
}

function rowY(k) { return ROW0 + k * ROWH + (k >= FUN_N ? FUN_GAP : 0); }
function rowAt(x, y) {
  if (x >= PANEL || y < ROW0) return -1;
  for (var k = 0; k < PICK.length; k++) if (y >= rowY(k) && y < rowY(k) + ROWH) return k;
  return -1;
}

/* -------------------------------------------------------------------
   4. THE TICK
   ------------------------------------------------------------------- */
function gameUpdate(g, dt) {
  g.t += dt;
  g.intro += dt;
  /* where the cursor is, in cells, and how fast it is going (for throwing) */
  g.cx = (g.mx - PANEL) / CELL; g.cy = (g.my - PLAY_Y) / CELL;
  var cv2 = cursorVel(g); g.cvx = cv2[0]; g.cvy = cv2[1];
  g.pcx = g.cx; g.pcy = g.cy;
  sandPaint(g);
  toolHold(g);
  ageBangs(g);
  if (g.helloT > 0 && --g.helloT === 0 && g.helloP && !g.helloP.dead) pSay(g, g.helloP, "hello", true);
  var step = !g.paused && (!g.slow || (g.frame++ & 3) === 0);
  if (step) {
    sandStep(g);
    partStep(g);
    peasantsStep(g);
    ducksStep(g);
  } else {
    if (g.held) pHeld(g, g.held);
    if (g.heldDuck) dHeld(g, g.heldDuck);
  }
  for (var k = g.feed.length - 1; k >= 0; k--) if ((g.feed[k].t += dt) > 7) g.feed.splice(k, 1);
  if (g.banners.length && (g.banners[0].t += dt) > 3.5) g.banners.shift();
  sandSounds(g);
}

/* the sound department, rationed: one bang per bang, not one per grain of powder */
function sandSounds(g) {
  var f = g.fx, t = g.t, s = g.snd;
  function ok(k, gap) { if (f[k] && t - (s[k] || 0) > gap) { s[k] = t; return true; } return false; }
  if (!g.quiet) {
    if (ok("bigboom", 0.5)) SFX.bigboom();
    else if (ok("boom", 0.1)) SFX.boom();
    else if (ok("whoosh", 0.3)) SFX.whoosh();
    if (ok("thunder", 0.15)) SFX.thunder();
    if (ok("hiss", 0.15)) SFX.sizzle();
    if (ok("bloom", 0.1)) SFX.bloom();
    if (ok("burst", 0.08)) SFX.burst();
    if (ok("whistle", 0.25)) SFX.whistle();
    if (ok("zap", 0.2)) SFX.zap();
    if (ok("pop", 0.06)) SFX.pop();
    if (ok("splat", 0.1)) SFX.splat();
    else if (ok("thud", 0.12)) SFX.thud();
    if (ok("ghost", 0.5)) SFX.ghost();
    if (ok("whee", 0.2)) SFX.whee();
    if (ok("fanfare", 1)) SFX.fanfare();
    if (ok("splash", 0.15)) SFX.splash();
    if (ok("quack", 0.12)) SFX.quack();
    if (ok("peep", 0.08)) SFX.peep();
    if (ok("squeak", 0.15)) SFX.squeak();
    if (ok("hammer", 0.09)) SFX.hammer();
    if (ok("saw", 0.4)) SFX.saw();
    if (ok("idea", 0.3)) SFX.idea();
  }
  for (var k in f) f[k] = 0;
}

/* -------------------------------------------------------------------
   5. DRAWING THE WORLD
   ------------------------------------------------------------------- */
function drawWorld(g) {
  var m = g.m, sh = g.sh, px = g.px, gp = g.gpx, gw = g.gw, gh = g.gh, dep = g.dep, bg = g.bg, wave = g.wave;
  var x, y, i, v, row, d, hot = 0, W = MAT.WATER, t = g.t, k, T = g.T, tc, f, a;
  gp.fill(0);
  if (g.thermal) return drawThermal(g);
  /* stars twinkle */
  for (k = 0; k < g.stars.length; k++) {
    var st = g.stars[k], b = st.b * (0.55 + 0.45 * Math.sin(t * st.s + st.p));
    bg[st.i] = rgb32([225, 232, 255], b);
  }
  /* where the light catches the waves this frame */
  for (x = 0; x < gw; x++) wave[x] = (Math.sin(x * 0.37 + t * 2.6) + Math.sin(x * 0.13 - t * 1.7)) > 1.25 ? 1 : 0;
  /* heat haze: each row of hot air is nudged a pixel one way or the other, and it wobbles */
  var haze = g.haze;
  for (y = 0; y < gh; y++) haze[y] = Math.sin(y * 0.9 + t * 9) > 0 ? 1 : -1;
  var flick = (t * 8) | 0;
  for (y = 0; y < gh; y++) {
    row = y * gw;
    for (x = 0; x < gw; x++) {
      i = row + x; v = m[i]; tc = T[i];
      if (v === MAT.EMPTY) {
        /* hot air shimmers and glows a little; cold air has a blue chill to it */
        if (tc > 45) px[i] = blend32(bg[tc > 70 && x > 0 && x < gw - 1 ? i + haze[y] : i], HAZE_TINT, tc > 545 ? 0.33 : (tc - 45) * 0.00066);
        else if (tc < 5) px[i] = blend32(bg[i], CHILL_TINT, tc < -45 ? 0.3 : (5 - tc) * 0.006);
        else px[i] = bg[i];
        continue;
      }
      if (SAND_DEEP[v]) {
        /* how far down into this pool are we */
        d = (y > 0 && m[i - gw] === v) ? Math.min(15, dep[x] + 1) : 0;
        dep[x] = d;
        /* boiling water seethes: bits of it catch the light at random */
        px[i] = SAND_DEEP[v][(((d === 0 && wave[x]) || (g.lat[i] > 0 && Math.random() < 0.3)) ? 16 << 8 : d << 8) | sh[i]];
        if (v === MAT.ACID && d < 2) gp[i] = px[i];
      } else if (v === MAT.LAVA) {
        /* lava is the colour of its own heat: dull and crusty near setting, orange when fresh,
           yellow-white when it is hotter than that. molten glass and metal run paler */
        px[i] = gp[i] = gp[i - gw] = gp[i + gw] = lavaCol(tc, g.aux[i], SAND_PAL[v][(Math.random() * 256) | 0]);
        if (x > 0) gp[i - 1] = px[i];
        if (x < gw - 1) gp[i + 1] = px[i];
        hot++;
        continue;
      } else if (v === MAT.FIRE || v === MAT.EMBER) {
        /* the glow gets a little plus-sign per hot cell, so a lone spark still shows */
        px[i] = gp[i] = gp[i - gw] = gp[i + gw] = SAND_PAL[v][(Math.random() * 256) | 0];
        if (x > 0) gp[i - 1] = px[i];
        if (x < gw - 1) gp[i + 1] = px[i];
        hot++;
      } else if (v === MAT.SAND && ((y > 0 && m[i - gw] === W) || (y < gh - 1 && m[i + gw] === W) ||
                                    (x > 0 && m[i - 1] === W) || (x < gw - 1 && m[i + 1] === W))) {
        px[i] = SAND_WET[sh[i]];
      } else if (v === MAT.CLONER) {
        /* a checkerboard of cloner purple and whatever it has memorised */
        a = g.aux[i];
        px[i] = (a && ((x + y + flick) & 1)) ? (a === CLONE_PEASANT ? P_SKIN32 : SAND_PAL[a][sh[i]]) : SAND_PAL[v][(x + y) & 1];
      } else if (v === MAT.NUKE) {
        /* blinks, faster as it gets closer */
        var on = (g.aux[i] > 200 ? (t * 12) | 0 : (t * 3) | 0) & 1;
        px[i] = SAND_PAL[v][on ? 0 : 1];
        if (on) { gp[i] = px[i]; hot++; }
      } else if (v === MAT.SMOKE && g.aux[i]) {
        /* mushroom smoke: glows at first, then cools to grey */
        px[i] = MUSH_PAL[g.aux[i]];
        if (g.aux[i] > 170) { gp[i] = px[i]; hot++; }
      } else if (v === MAT.FIREWORK) {
        px[i] = SAND_PAL[v][(y + (sh[i] & 1)) & 3];
      } else if (v === MAT.PLANK) {
        /* boards: a seam every third row, and the joints staggered. a window is a dark pane, until someone is home */
        if (g.aux[i] === 1) px[i] = WIN_DARK;
        else {
          f = (y > 0 && m[i - gw] === MAT.EMPTY) ? SAND_LIT[v][sh[i]] : SAND_PAL[v][sh[i]];
          px[i] = (y % 3 === 0 || (x + ((y / 3) | 0) * 5) % 7 === 0) ? blend32(f, 0xff000000, 0.22) : f;
        }
      } else if (v === MAT.DOOR) {
        /* a dark plank door, with a frame at the top and a brass knob */
        a = g.aux[i];
        px[i] = a === 5 ? DOOR_KNOB : (a === 1 ? blend32(SAND_PAL[v][sh[i]], 0xff000000, 0.35) : SAND_PAL[v][sh[i]]);
      } else if (v === MAT.LADDER) {
        /* two rails, and a rung every third row between them; between the rungs you see through it */
        a = g.aux[i];
        px[i] = a !== 1 ? SAND_PAL[v][sh[i]] : (y % 3 === 0 ? SAND_LIT[v][sh[i]] : blend32(bg[i], 0xff000000, 0.3));
      } else if (v === MAT.SOIL) {
        /* furrows: ridges and troughs, every other column */
        f = y > 0 && (AIRY[m[i - gw]] || P_LEAF[m[i - gw]]) ? SAND_LIT[v][sh[i]] : SAND_PAL[v][sh[i]];
        px[i] = (x & 1) ? f : blend32(f, 0xff000000, 0.2);
      } else if (v === MAT.WHEAT) {
        /* the ear at the top of the stalk, with its whiskers, nodding in the breeze */
        if (y > 0 && !LEAFY[m[i - gw]]) {
          a = Math.sin(x * 0.7 + t * 1.8) > 0.55;
          px[i] = a ? SAND_LIT[v][3] : SAND_PAL[v][3];
          if (m[i - gw] === MAT.EMPTY) px[i - gw] = blend32(px[i - gw], SAND_LIT[v][2], a ? 0.75 : 0.5);
        } else px[i] = SAND_PAL[v][sh[i] % 3];
      } else if (v === MAT.LAMP) {
        /* a little flame behind glass: the warm pool of light round it is in ideas.js */
        px[i] = gp[i] = SAND_PAL[v][(sh[i] + flick) & 255];
        hot++;
      } else if (v === MAT.INERT) {
        /* faintly magic: a slow shimmer runs through it, and now and then a cell glints */
        px[i] = SAND_PAL[v][(sh[i] + ((Math.sin(x * 0.21 + y * 0.17 + t * 1.6) * 40) | 0)) & 255];
        if (((x * 7 + y * 13 + flick) % 89) === 0) px[i] = INERT_GLINT;
      } else {
        px[i] = (y > 0 && m[i - gw] === MAT.EMPTY) ? SAND_LIT[v][sh[i]] : SAND_PAL[v][sh[i]];
        if (v === MAT.TORCH && y > 0) { gp[i] = SAND_PAL[MAT.FIRE][1]; hot++; }
      }
      /* anything hot enough glows: dull red, cherry, orange, yellow, white. anything
         well below freezing frosts over */
      if (tc > 450) {
        if (v !== MAT.FIRE && v !== MAT.EMBER && v !== MAT.TORCH && !AIRY[v]) {
          f = glowMix(tc);
          px[i] = blend32(px[i], glowCol(tc), f);
          if (tc > 560) { gp[i] = blend32(0xff000000, px[i], f); hot++; }
        }
      } else if (tc < -5 && !AIRY[v]) px[i] = blend32(px[i], COLD_TINT, tc < -80 ? 0.45 : (-5 - tc) * 0.006);
    }
  }
  /* electrified water, for a moment */
  if (g.zt > 0) {
    var zc = [hex32("#ffffff"), hex32("#a0e0ff"), hex32("#60b0ff")];
    for (k = 0; k < g.zn; k++) { i = g.zlist[k]; if (m[i] === W || m[i] === MAT.ACID) { px[i] = gp[i] = zc[irnd(3)]; } }
    hot++;
  }
  /* particles */
  for (k = 0; k < g.np; k++) {
    x = g.ppx[k] | 0; y = g.ppy[k] | 0;
    if (x < 0 || y < 0 || x >= gw || y >= gh || g.ppx[k] < 0 || g.ppy[k] < 0) continue;
    var pk = g.pk[k], l = g.pl[k];
    if ((pk === PK_SPARK || pk === PK_GLINT) && l < 14 && (l & 1)) continue;   /* fading sparks twinkle out */
    i = y * gw + x;
    px[i] = g.pc[k];
    if (pk !== PK_DEBRIS || g.pm[k] === MAT.FIRE) { gp[i] = g.pc[k]; hot++; }
  }
  hot += bDraw(g);
  hot += iDraw(g);
  ducksDraw(g);
  peasantsDraw(g);
  return hot;
}
var WIN_DARK = hex32("#1e2638"), DOOR_KNOB = hex32("#e8c050");

/* molten things by temperature. a little flicker comes from the lava palette */
var LAVA_GLASS = hex32("#ffe2a8"), LAVA_METAL = hex32("#fff6e8");
var LAVA_COOL = hex32("#5a1206"), LAVA_WARM = hex32("#ff4a12"), LAVA_HOT = hex32("#ffe070");
function lavaCol(t, a, flick) {
  var c = t < 1250 ? blend32(LAVA_COOL, LAVA_WARM, clamp((t - 900) / 350, 0, 1))
                   : blend32(LAVA_WARM, LAVA_HOT, clamp((t - 1250) / 600, 0, 1));
  c = blend32(c, flick, 0.25);
  if (a === MAT.GLASS) c = blend32(c, LAVA_GLASS, 0.35);
  else if (a === MAT.METAL) c = blend32(c, LAVA_METAL, 0.3);
  return c;
}
/* thermal vision: every cell the colour of its temperature, with a hint of what it is,
   so you can still make out the shape of things */
function drawThermal(g) {
  var m = g.m, px = g.px, T = g.T, sh = g.sh, n = m.length, i, v, k, x, y;
  for (i = 0; i < n; i++) {
    v = m[i];
    px[i] = v === MAT.EMPTY ? thermCol(T[i]) : blend32(thermCol(T[i]), SAND_PAL[v][sh[i]], 0.16);
  }
  for (k = 0; k < g.np; k++) {
    x = g.ppx[k] | 0; y = g.ppy[k] | 0;
    if (x < 0 || y < 0 || x >= g.gw || y >= g.gh || g.ppx[k] < 0 || g.ppy[k] < 0) continue;
    px[y * g.gw + x] = g.pk[k] === PK_DEBRIS && g.pm[k] !== MAT.FIRE ? thermCol(AMBIENT) : thermCol(900);
  }
  ducksDraw(g);
  peasantsDraw(g);
  return 0;
}

function gameDraw(g, c) {
  var gw = g.gw, gh = g.gh, PW = gw * CELL, PH = gh * CELL;
  rct(c, 0, 0, VW, VH, "#05070c");
  var hot = drawWorld(g);
  g.vctx.putImageData(g.img, 0, 0);

  /* the shaking part */
  var sx = 0, sy = 0;
  if (g.shake > 0.25) { sx = (Math.random() * 2 - 1) * g.shake; sy = (Math.random() * 2 - 1) * g.shake; }
  c.save();
  c.beginPath(); c.rect(PANEL, PLAY_Y, PW, PH); c.clip();
  c.translate(sx, sy);
  c.imageSmoothingEnabled = false;
  c.drawImage(g.vc, PANEL, PLAY_Y, PW, PH);
  c.imageSmoothingEnabled = true;
  if (hot || g.np) {
    g.gctx.putImageData(g.gimg, 0, 0);
    var c2 = g.gc2x, c4 = g.gc4x;
    c2.clearRect(0, 0, g.gc2.width, g.gc2.height);
    c2.drawImage(g.gc, 0, 0, g.gc2.width, g.gc2.height);
    c4.clearRect(0, 0, g.gc4.width, g.gc4.height);
    c4.drawImage(g.gc2, 0, 0, g.gc4.width, g.gc4.height);
    c.globalCompositeOperation = "lighter";
    c.globalAlpha = 0.45;
    c.drawImage(g.gc2, PANEL, PLAY_Y, g.gc2.width * 2 * CELL, g.gc2.height * 2 * CELL);
    c.globalAlpha = 0.8;
    c.drawImage(g.gc4, PANEL - 2, PLAY_Y - 2, g.gc4.width * 4 * CELL + 4, g.gc4.height * 4 * CELL + 4);
    c.globalAlpha = 1;
    c.globalCompositeOperation = "source-over";
  }
  drawBangs(g, c);
  peasantsBubbles(g, c, 0, 0);
  ducksBubbles(g, c);
  c.restore();

  /* the flash of a big bang, over the play area only */
  if (g.flash > 0.01) {
    c.fillStyle = "rgba(255,250,235," + Math.min(1, g.flash).toFixed(3) + ")";
    c.fillRect(PANEL, PLAY_Y, PW, PH);
  }
  drawCursor(g, c);
  drawPanel(g, c);
  drawOverlays(g, c);
}

/* lightning bolts, shock rings, the glow of a firework */
/* bangs age at a fixed 60 a second, in the update, so they last as long on any monitor */
function ageBangs(g) {
  var k;
  g.shake *= 0.86; g.flash *= 0.88;
  if (g.fwGlow) { g.fwGlow.t *= 0.93; if (g.fwGlow.t < 0.03) g.fwGlow = null; }
  for (k = g.rings.length - 1; k >= 0; k--) {
    var rg = g.rings[k];
    rg.t += 1; rg.r += (rg.R - rg.r) * 0.18;
    if (rg.t >= 22) g.rings.splice(k, 1);
  }
  for (k = g.bolts.length - 1; k >= 0; k--) { g.bolts[k].t *= 0.92; if (g.bolts[k].t <= 0.02) g.bolts.splice(k, 1); }
  if (g.zt > 0) { g.zt -= 0.035; if (g.zt <= 0) g.zn = 0; }
}
function scrX(x) { return PANEL + (x + 0.5) * CELL; }
function scrY(y) { return PLAY_Y + y * CELL; }
function boltLine(c, L) {
  c.beginPath(); c.moveTo(scrX(L[0][0]), scrY(L[0][1]));
  for (var q = 1; q < L.length; q++) c.lineTo(scrX(L[q][0]), scrY(L[q][1]));
  c.stroke();
}
/* lightning bolts, shock rings, the glow of a firework */
function drawBangs(g, c) {
  var k, j;
  c.save();
  c.globalCompositeOperation = "lighter";
  if (g.fwGlow) {
    var f = g.fwGlow, cx = scrX(f.x), cy = scrY(f.y), r = 90;
    var gr = c.createRadialGradient(cx, cy, 0, cx, cy, r);
    var col = "rgba(" + (f.c & 255) + "," + ((f.c >> 8) & 255) + "," + ((f.c >> 16) & 255) + ",";
    gr.addColorStop(0, col + (0.35 * f.t).toFixed(3) + ")"); gr.addColorStop(1, col + "0)");
    c.fillStyle = gr; c.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  for (k = 0; k < g.rings.length; k++) {
    var rg = g.rings[k], a = 1 - rg.t / 22;
    c.strokeStyle = "rgba(255,230,190," + (a * 0.5).toFixed(3) + ")";
    c.lineWidth = 2.5 * a + 0.5;
    c.beginPath(); c.arc(scrX(rg.x), scrY(rg.y), rg.r * CELL, 0, 6.2832); c.stroke();
  }
  c.lineJoin = "round";
  for (k = 0; k < g.bolts.length; k++) {
    var b = g.bolts[k], ba = b.t * (Math.random() < 0.2 ? 0.25 : 1);
    for (var pass = 0; pass < 2; pass++) {
      c.strokeStyle = pass ? "rgba(255,255,255," + ba.toFixed(3) + ")" : "rgba(120,160,255," + (ba * 0.5).toFixed(3) + ")";
      c.lineWidth = pass ? 1.4 : 6;
      boltLine(c, b.pts);
      if (pass) c.lineWidth = 0.8;
      for (j = 0; j < b.forks.length; j++) boltLine(c, b.forks[j]);
    }
  }
  c.restore();
}

function drawCursor(g, c) {
  if (!inPlay(g)) return;
  var pk = curPick(g), cx = g.mx, cy = g.my;
  c.save();
  c.lineWidth = 1;
  if (g.ax != null) {
    var p = sandCell(g);
    c.strokeStyle = g.av === MAT.EMPTY ? "#ffffff" : SAND_SHADES[g.av][0];
    c.lineWidth = (g.size * 2 + 1) * CELL; c.lineCap = "round"; c.globalAlpha = 0.35;
    c.beginPath();
    c.moveTo(PANEL + (g.ax + 0.5) * CELL, PLAY_Y + (g.ay + 0.5) * CELL);
    c.lineTo(PANEL + (p.x + 0.5) * CELL, PLAY_Y + (p.y + 0.5) * CELL);
    c.stroke();
    c.globalAlpha = 1; c.lineWidth = 1;
  }
  var hh = g.held && !g.held.dead ? g.held : (g.heldDuck && !g.heldDuck.dead ? g.heldDuck : null);
  if (hh && g.down) {
    /* where they will go if you let go now */
    var v = cursorVel(g), ax = clamp(v[0], -4.5, 4.5), ay = clamp(v[1], -4.5, 4.5);
    if (ax * ax + ay * ay > 0.5) {
      var px0 = hh.x, py0 = hh.y - (hh === g.held ? 4 : 2);
      c.fillStyle = "rgba(255,217,74,0.7)";
      for (var st = 1; st <= 40; st++) {
        px0 += ax; py0 += ay; ay += 0.1;
        if (st % 3) continue;
        if (px0 < 0 || px0 > g.gw || py0 > g.gh) break;
        if (py0 >= 0 && SOLID[g.m[Math.floor(py0) * g.gw + Math.floor(px0)]]) break;
        c.fillRect(scrX(px0) - 0.75, scrY(py0) - 0.75, 1.5, 1.5);
      }
    }
  }
  if (pk.tool === "peasant") {
    var h = (g.held && !g.held.dead) ? g.held : peasantAt(g, g.cx, g.cy, 2);
    if (h) {
      var bx = PANEL + (h.x - 3) * CELL, by = PLAY_Y + (h.y - 10) * CELL;
      c.strokeStyle = "#ffd94a";
      c.beginPath();
      c.moveTo(bx, by + 4); c.lineTo(bx, by); c.lineTo(bx + 4, by);
      c.moveTo(bx + 14 - 4, by); c.lineTo(bx + 14, by); c.lineTo(bx + 14, by + 4);
      c.moveTo(bx, by + 18); c.lineTo(bx, by + 22); c.lineTo(bx + 4, by + 22);
      c.moveTo(bx + 14 - 4, by + 22); c.lineTo(bx + 14, by + 22); c.lineTo(bx + 14, by + 18);
      c.stroke();
    } else {
      c.strokeStyle = "rgba(255,217,74,0.8)";
      c.beginPath(); c.moveTo(cx - 4, cy); c.lineTo(cx + 4, cy); c.moveTo(cx, cy - 4); c.lineTo(cx, cy + 4); c.stroke();
    }
  } else if (pk.tool === "duck") {
    var dk = (g.heldDuck && !g.heldDuck.dead) ? g.heldDuck : duckAt(g, g.cx, g.cy, 2);
    c.strokeStyle = "#ffd94a";
    if (dk) {
      var dx0 = PANEL + (dk.x - 3) * CELL, dy0 = PLAY_Y + (dk.y - 5) * CELL;
      c.beginPath();
      c.moveTo(dx0, dy0 + 3); c.lineTo(dx0, dy0); c.lineTo(dx0 + 3, dy0);
      c.moveTo(dx0 + 14 - 3, dy0); c.lineTo(dx0 + 14, dy0); c.lineTo(dx0 + 14, dy0 + 3);
      c.moveTo(dx0, dy0 + 9); c.lineTo(dx0, dy0 + 12); c.lineTo(dx0 + 3, dy0 + 12);
      c.moveTo(dx0 + 14 - 3, dy0 + 12); c.lineTo(dx0 + 14, dy0 + 12); c.lineTo(dx0 + 14, dy0 + 9);
      c.stroke();
    } else {
      c.globalAlpha = 0.8;
      c.beginPath(); c.moveTo(cx - 3, cy); c.lineTo(cx + 3, cy); c.moveTo(cx, cy - 3); c.lineTo(cx, cy + 3); c.stroke();
      c.globalAlpha = 1;
    }
  } else if (pk.tool === "lightning") {
    c.strokeStyle = "rgba(255,232,96,0.25)";
    c.setLineDash([2, 4]);
    c.beginPath(); c.moveTo(cx, PLAY_Y); c.lineTo(cx, cy); c.stroke();
    c.setLineDash([]);
    c.strokeStyle = "#ffe860";
    c.beginPath(); c.arc(cx, cy, 4, 0, 6.2832); c.stroke();
  } else if (pk.tool === "heat" || pk.tool === "cool") {
    var hc = pk.tool === "heat" ? "255,140,50" : "120,210,255", pulse = g.down && g.btn === 0 ? 0.5 + 0.4 * Math.sin(g.t * 20) : 0.8;
    c.strokeStyle = "rgba(" + hc + "," + pulse.toFixed(2) + ")";
    c.setLineDash([3, 2]);
    c.beginPath(); c.arc(cx, cy, (g.size + 1.5) * CELL, 0, 6.2832); c.stroke();
    c.setLineDash([]);
  } else if (pk.m === MAT.NUKE && g.btn !== 2) {
    c.strokeStyle = ((g.t * 4) | 0) & 1 ? "#c8ff3a" : "#ffd040";
    c.beginPath(); c.arc(cx, cy, 5, 0, 6.2832); c.stroke();
    c.beginPath(); c.arc(cx, cy, 1.5, 0, 6.2832); c.stroke();
  } else {
    var v = g.btn === 2 ? MAT.EMPTY : pk.m;
    c.strokeStyle = v === MAT.EMPTY ? "#ffffff" : SAND_SHADES[v][0];
    c.beginPath(); c.arc(cx, cy, (g.size + 0.5) * CELL, 0, 6.2832); c.stroke();
  }
  /* with a heat tool, or the thermal view, the temperature rides along next to the cursor */
  if (pk.tool === "heat" || pk.tool === "cool" || g.thermal) {
    var tt = heatLabel(g.T[cellAt(g)]);
    c.font = "bold 7px " + UI_FONT;
    var tw = c.measureText(tt).width + 4, tx = Math.min(cx + 8, VW - tw - 2), ty = Math.max(cy - 14, PLAY_Y + 1);
    rct(c, tx, ty, tw, 9, "rgba(6,8,14,0.7)");
    txt(c, tt, tx + 2, ty + 7, 7, "#ffffff", "left", true);
  }
  c.restore();
}

/* -------------------------------------------------------------------
   6. THE PICKER, THE HEADER, THE NEWS
   ------------------------------------------------------------------- */
function button(c, x, y, w, label, on, hot) {
  rct(c, x, y, w, 12, on ? "#6a3d12" : (hot ? "#26385a" : "#1d2a42"));
  box(c, x, y, w, 12, on ? "#c87a2a" : "#3a4e72");
  txt(c, label, x + w / 2, y + 9, 7, "#ffffff", "center", true);
}
function drawPanel(g, c) {
  var hov = rowAt(g.mx, g.my), k;
  rct(c, 0, PLAY_Y, PANEL - 1, VH - PLAY_Y, "#0a0d16");
  rct(c, PANEL - 1, PLAY_Y, 1, VH - PLAY_Y, "#26344e");
  rct(c, 4, rowY(FUN_N) - 3, PANEL - 9, 1, "#26344e");
  for (k = 0; k < PICK.length; k++) {
    var pk = PICK[k], ry = rowY(k), fun = k < FUN_N;
    if (k === g.sel) rct(c, 2, ry, PANEL - 5, ROWH, fun ? "#5a3a14" : "#2a3d5e");
    else if (k === hov) rct(c, 2, ry, PANEL - 5, ROWH, "#17202f");
    if (pk.tool || pk.m === MAT.FIREWORK || pk.m === MAT.NUKE) {
      c.imageSmoothingEnabled = false;
      c.drawImage(ICONS[pk.tool || (pk.m === MAT.NUKE ? "nuke" : "firework")], 5, ry + 1, 8, 8);
      c.imageSmoothingEnabled = true;
    } else if (pk.m === MAT.EMPTY) { rct(c, 5, ry + 1, 8, 8, "#0b0e14"); box(c, 5, ry + 1, 8, 8, "#8892a8"); }
    else {
      rct(c, 5, ry + 1, 8, 8, SAND_SHADES[pk.m][0]);
      if (SAND_SHADES[pk.m].length > 1) rct(c, 9, ry + 5, 4, 4, SAND_SHADES[pk.m][1]);
    }
    txt(c, pk.name, 17, ry + 7.5, 7, k === g.sel ? "#ffffff" : (fun ? "#f0c060" : "#9aa6b8"), "left", k === g.sel || fun);
    if (pk.key) txt(c, pk.key, PANEL - 7, ry + 7.5, 7, "#56698a", "right");
  }
  /* size, and the buttons */
  var bh = g.my >= SIZE_Y && g.mx < PANEL;
  txt(c, "SIZE", 5, SIZE_Y + 9, 7, "#9aa6b8", "left", true);
  button(c, 44, SIZE_Y, 14, "-", false, bh && g.my < SIZE_Y + 12 && g.mx >= 44 && g.mx < 58);
  txt(c, String(g.size), 67, SIZE_Y + 9, 8, "#ffd94a", "center", true);
  button(c, 76, SIZE_Y, 14, "+", false, bh && g.my < SIZE_Y + 12 && g.mx >= 76);
  var r1 = g.my >= BTN_Y && g.my < BTN_Y + 12 && g.mx < PANEL, r2 = g.my >= BTN2_Y && g.my < BTN2_Y + 12 && g.mx < PANEL;
  button(c, 4, BTN_Y, 42, g.paused ? "PLAY" : "PAUSE", g.paused, r1 && g.mx < 48);
  button(c, 48, BTN_Y, 42, "CLEAR", false, r1 && g.mx >= 48);
  button(c, 4, BTN2_Y, 42, "SLOW-MO", g.slow, r2 && g.mx < 48);
  button(c, 48, BTN2_Y, 42, "NEW", false, r2 && g.mx >= 48);
  var r3 = g.my >= BTN3_Y && g.my < BTN3_Y + 12 && g.mx < PANEL;
  button(c, 4, BTN3_Y, 42, "THERMAL", g.thermal, r3 && g.mx < 48);
  button(c, 48, BTN3_Y, 42, "BUBBLES", !g.hush, r3 && g.mx >= 48);

  /* header */
  rct(c, 0, 0, VW, PLAY_Y, "#0a0d16");
  rct(c, 0, PLAY_Y - 1, VW, 1, "#26344e");
  txt(c, "PLEASAND", 5, 10, 9, "#ffd94a", "left", true);
  var alive = 0, space = 0;
  for (k = 0; k < g.peasants.length; k++) { if (g.peasants[k].state === "space") space++; else alive++; }
  var nd = 0;
  for (k = 0; k < g.ducks.length; k++) if (!g.ducks[k].dead) nd++;
  var nh = 0;
  for (k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "house" && g.sites[k].done) nh++;
  var ni = iKnown(g);
  var hdr = "PEASANTS " + alive + "     RIP " + g.rip + (nh ? "     HOUSES " + nh : "") + (ni ? "     IDEAS " + ni + "/" + IDEAS.length : "") +
            (nd ? "     DUCKS " + nd : "") + (space ? "     IN SPACE " + space : "");
  txt(c, hdr, PANEL + (VW - PANEL) / 2, 10, 8, "#d8dde6", "center", true);
  txt(c, (MUTED ? "M: SOUND OFF" : "M: SOUND ON"), VW - 5, 10, 7, "#8892a8", "right");

  /* description bar */
  var info = hov >= 0 ? PICK[hov] : curPick(g), by = VH - BAR_H;
  rct(c, PANEL, by, VW - PANEL, BAR_H, "#0a0d16");
  rct(c, PANEL, by, VW - PANEL, 1, "#26344e");
  var hp = inPlay(g) ? peasantAt(g, g.cx, g.cy, 2) : null, line;
  var hd = inPlay(g) && !hp ? duckAt(g, g.cx, g.cy, 1) : null;
  if (hp) line = hp.name + "  " + pMood(g, hp);
  else if (hd) line = (hd.baby ? "DUCKLING" : hd.kind.name) + "  " + dMood(hd);
  else if (g.my < PLAY_Y && g.mx >= PANEL) line = iSummary(g);   /* over the header: what the village knows */
  else if (g.mx < PANEL && hov < 0) line = TIPS[g.tip];
  else line = info.name + "  " + info.desc;
  /* what is under the cursor, and how hot it is, on the right */
  var rd = inPlay(g) && !hp && !hd ? cellReadout(g, cellAt(g)) : "";
  c.font = "7px " + UI_FONT;
  var rw = rd ? c.measureText(rd).width + 12 : 0, room = VW - PANEL - 10 - rw;
  if (c.measureText(line).width > room) {
    while (line.length > 8 && c.measureText(line + "...").width > room) line = line.slice(0, line.lastIndexOf(" "));
    line += "...";
  }
  txt(c, line, PANEL + 5, by + 10, 7, "#c8d0dc");
  if (rd) txt(c, rd, VW - 6, by + 10, 7, "#ffd94a", "right", true);
}
/* how a peasant is doing, in a word or six */
function pMood(g, p) {
  if (p.state === "held") return "is being held. does not like it";
  if (p.state === "fly") return "is airborne";
  if (p.fire) return "is on fire";
  if (p.acid > 0) return "is dissolving, a bit";
  if (p.breath < P_BREATH - 20) return "is drowning. slowly. " + Math.ceil(p.breath / 60) + "s of air left";
  if (p.zap > 0) return "is being electrocuted";
  if (p.stun > 0) return "is having a little lie down";
  if (p.sleep > 0) return p.inBed ? "is asleep in bed. zzz" : "is asleep on the ground. it is not comfy";
  if (p.climb) return "is climbing a ladder";
  if (p.rope && p.rope.mode === "climb") return "is climbing a rope. like a ninja";
  if (p.rope && p.rope.mode === "swing") return "is swinging on a rope";
  if (p.rope) return "is abseiling";
  if (p.chute && p.chute.fail) return "is falling. the parachute did not open";
  if (p.chute) return "is parachuting";
  if (p.jumping) return "is jumping";
  if (p.swimming) return "is swimming";
  if (p.cold > 200) return "is freezing. needs a fire";
  if (p.cold > 60) return "is chilly";
  if (p.panic > 0) return "is panicking";
  if (p.warm > 0) return "is too warm";
  var im = iMood(g, p);
  if (im) return im;
  if (p.task && p.task.kind === "build") {
    var bs = bSite(g, p.task.site), bn = bs ? bLabel(bs) : "something", wl = Math.round(bWood(p) * 10) / 10;
    var verb = !bs ? "building " : (bs.repair ? "fixing " : (bs.hut ? "putting doors on " : "building "));
    return "is " + verb + bn + ". " + (wl > 0 ? wl + (wl === 1 ? " log" : " logs") + " of wood left" : "out of wood");
  }
  if (p.task && p.task.kind === "sleep") return "is off to bed. so tired";
  if (p.task && p.task.kind === "warm") return "is warming up by the fire";
  if (p.task && p.task.kind === "home") return "is going home";
  if (p.task && p.task.kind === "plant") return "is planting a tree";
  if (p.task && p.task.kind === "explore") return p.task.high >= 20 ? "is off to see what is up there" : "is exploring";
  if (p.task && p.task.kind === "chop") return "is chopping wood. " + (p.logs || 0) + " logs so far";
  if (p.task && p.task.kind === "eat") return "is eating a plant";
  if (p.task && p.task.kind === "light") return "is up to something";
  if (p.task && p.task.kind === "camp") return "is making a campfire";
  if (p.calmT > 0) return "is admiring their fire";
  if (p.hunger > P_HUNGRY) return "is hungry";
  if (p.bored > P_BORED_FIRE) return "is bored. dangerously bored";
  if (p.bored > P_BORED_CHOP) return "is bored";
  if (p.charred) return "is a bit crispy, but fine";
  var home = bHome(g, p);
  if (p.idle > 0 && home && bInside(home, p)) return p.hid && g.tick - p.hid < 900 ? "is hiding at home" : "is at home";
  if (p.hunger < I_FED && (p.muse || 0) > I_MUSE * 0.5) return "is well fed, and thinking";
  if (p.idle > 0) return "is standing about";
  if (p.logs > 0) return "is going for a walk. carrying " + p.logs + " log" + (p.logs > 1 ? "s" : "");
  return home ? "is going for a walk. has a house" : "is going for a walk. has no house";
}

function drawOverlays(g, c) {
  var cx = PANEL + (VW - PANEL) / 2, k;
  /* the news, top right */
  c.font = "bold 7px " + UI_FONT;
  for (k = 0; k < g.feed.length; k++) {
    var f = g.feed[k], a = Math.min(1, (7 - f.t) / 0.8, f.t * 6), yy = PLAY_Y + 5 + k * 10;
    var w = c.measureText(f.text).width + 8;
    c.globalAlpha = Math.max(0, a);
    rct(c, VW - 4 - w, yy, w, 9, "rgba(6,8,14,0.7)");
    txt(c, f.text, VW - 8, yy + 7, 7, f.col, "right", true);
  }
  c.globalAlpha = 1;
  /* a milestone */
  if (g.banners.length) {
    var b = g.banners[0], s = b.t < 0.15 ? 0.6 + b.t / 0.15 * 0.5 : (b.t < 0.3 ? 1.1 - (b.t - 0.15) / 0.15 * 0.1 : 1);
    c.save();
    c.globalAlpha = Math.min(1, (3.5 - b.t) / 0.5);
    c.translate(cx, PLAY_Y + 58); c.scale(s, s);
    txt(c, b.title, 1.5, 1.5, 22, "#000000", "center", true);
    txt(c, b.title, 0, 0, 22, "#ffd94a", "center", true);
    txt(c, b.sub, 0, 14, 9, "#ffffff", "center", true);
    c.restore();
  }
  /* the title card, the first few seconds */
  if (g.intro < 6) {
    var ia = g.intro < 4.5 ? 1 : 1 - (g.intro - 4.5) / 1.5, iy = PLAY_Y + 70;
    c.globalAlpha = ia;
    rct(c, cx - 150, iy - 30, 300, 62, "rgba(6,8,14,0.72)");
    txt(c, "PLEASAND", cx + 2, iy + 2, 28, "#7a3a12", "center", true);
    txt(c, "PLEASAND", cx, iy, 28, "#ffd94a", "center", true);
    txt(c, "a falling sand game, with peasants in it", cx, iy + 14, 8, "#ffffff", "center", true);
    txt(c, "they live here. be nice. (or don't)", cx, iy + 25, 7, "#9aa6b8", "center");
    c.globalAlpha = 1;
  }
  if (g.thermal) drawThermalKey(c);
  if (g.paused) {
    rct(c, cx - 50, VH / 2 - 14, 100, 28, "rgba(0,0,0,0.75)");
    txt(c, "PAUSED", cx, VH / 2 + 1, 12, "#ffd94a", "center", true);
    txt(c, ". = ONE STEP", cx, VH / 2 + 10, 7, "#c8d0dc", "center");
  } else if (g.slow) {
    txt(c, "SLOW-MO", PANEL + 6, PLAY_Y + 12, 8, "#ffd94a", "left", true);
  }
  if (g.debug) {
    var dbg = (g.fps | 0) + " fps  " + g.ms.toFixed(1) + " ms  particles " + g.np;
    txt(c, dbg, PANEL + 6, VH - BAR_H - 4, 7, "#7aff7a", "left", true);
  }
}

/* the colour key for thermal vision: the same stops the palette is built on, evenly spaced */
var THERM_KEY = [-100, -40, 0, 20, 37, 100, 300, 700, 1200, 2000];
function drawThermalKey(c) {
  var x0 = PANEL + 6, y0 = VH - BAR_H - 16, w = 180, n = THERM_KEY.length - 1, k, px;
  rct(c, x0 - 3, y0 - 3, w + 6, 17, "rgba(6,8,14,0.75)");
  for (px = 0; px < w; px++) {
    var f = px / w * n, s = Math.floor(f), t = lerp(THERM_KEY[s], THERM_KEY[Math.min(n, s + 1)], f - s), col = thermCol(t);
    c.fillStyle = "rgb(" + (col & 255) + "," + ((col >> 8) & 255) + "," + ((col >> 16) & 255) + ")";
    c.fillRect(x0 + px, y0, 1, 4);
  }
  [[1, "-40"], [2, "0"], [5, "100"], [7, "700"], [9, "2000\u00b0"]].forEach(function (l) {
    txt(c, l[1], x0 + l[0] / n * w, y0 + 11, 6, "#c8d0dc", l[0] === n ? "right" : "center");
  });
}

/* -------------------------------------------------------------------
   7. INPUT
   ------------------------------------------------------------------- */
function gameTap(g, x, y) {
  g.intro = Math.max(g.intro, 4.5);
  if (x >= PANEL) {
    if (!inPlay(g)) return;
    if (g.btn === 1 || g.keys.alt) { sandEyedrop(g); return; }
    if (g.btn !== 0) return;
    var pk = curPick(g);
    if (pk.tool === "peasant") {
      var p = peasantAt(g, g.cx, g.cy, 2);
      if (!p) p = peasantSpawn(g, clamp(g.cx, 2, g.gw - 3), clamp(g.cy + 8, 9, g.gh - 1));
      if (p) peasantGrab(g, p, true);
    } else if (pk.tool === "duck") {
      var d = duckAt(g, g.cx, g.cy, 2);
      if (d) duckGrab(g, d);
      /* a new duck where you click. now and then a mother, with ducklings in tow */
      else if (Math.random() < 0.2) duckFamily(g, clamp(g.cx, 3, g.gw - 4), clamp(g.cy + 2, 4, g.gh - 1));
      else duckSpawn(g, clamp(g.cx, 3, g.gw - 4), clamp(g.cy + 2, 4, g.gh - 1));
    } else if (pk.tool === "lightning") g.toolT = 0;
    else if (pk.m === MAT.NUKE) {
      var c = sandCell(g), j = Math.round(c.y) * g.gw + Math.round(c.x);
      sandPlace(g, j, MAT.NUKE);
    }
    return;
  }
  var row = rowAt(x, y);
  if (row >= 0) { g.sel = row; return; }
  if (y >= SIZE_Y && y < SIZE_Y + 12) {
    if (x >= 44 && x < 58) g.size = clamp(g.size - 1, 1, SAND_MAXSIZE);
    else if (x >= 76 && x < 90) g.size = clamp(g.size + 1, 1, SAND_MAXSIZE);
  } else if (y >= BTN_Y && y < BTN_Y + 12) {
    if (x < 48) g.paused = g.paused ? 0 : 1;
    else sandClear(g);
  } else if (y >= BTN2_Y && y < BTN2_Y + 12) {
    if (x < 48) g.slow = g.slow ? 0 : 1;
    else sandLandscape(g);
  } else if (y >= BTN3_Y && y < BTN3_Y + 12) {
    if (x < 48) g.thermal = !g.thermal;
    else g.hush = !g.hush;
  }
  else g.tip = (g.tip + 1) % TIPS.length;
}
function gameWheel(g, d) {
  if (g.mx < PANEL) { var n = PICK.length; g.sel = (g.sel + n + d) % n; }   /* over the list: scroll the list */
  else g.size = clamp(g.size - d, 1, SAND_MAXSIZE);
}
function gameKey(g, k) {
  var n = PICK.length, i;
  for (i = 0; i < n; i++) if (PICK[i].key && PICK[i].key.toLowerCase() === k) { g.sel = i; return; }
  if (k === "arrowup") g.sel = (g.sel + n - 1) % n;
  else if (k === "arrowdown") g.sel = (g.sel + 1) % n;
  else if (k === "[" || k === "-") g.size = clamp(g.size - 1, 1, SAND_MAXSIZE);
  else if (k === "]" || k === "=" || k === "+") g.size = clamp(g.size + 1, 1, SAND_MAXSIZE);
  else if (k === " " || k === "p") g.paused = g.paused ? 0 : 1;
  else if (k === "s") g.slow = g.slow ? 0 : 1;
  else if (k === "c") sandClear(g);
  else if (k === ".") { if (g.paused) { sandStep(g); partStep(g); peasantsStep(g); ducksStep(g); } }
  else if (k === "r") sandLandscape(g);
  else if (k === "`") g.debug = !g.debug;
  else if (k === "t") g.thermal = !g.thermal;
  else if (k === "b") g.hush = !g.hush;   /* speech bubbles off (and on again) */
}

/* -------------------------------------------------------------------
   8. THE SHELL: canvas, loop, events
   ------------------------------------------------------------------- */
var cv, ctx, vig, g, last = 0, acc = 0;

function newGame() {
  return { t: 0, mx: VW / 2, my: VH / 2, down: 0, btn: 0, keys: {}, frame: 0, fps: 60, ms: 0, debug: false,
           ptr: null, samp: [], score: 0 };
}

function frame(ts) {
  requestAnimationFrame(frame);
  if (!last) last = ts;
  var dt = Math.min(0.1, (ts - last) / 1000);
  last = ts;
  if (dt > 0) g.fps = lerp(g.fps, 1 / dt, 0.05);
  var t0 = performance.now();
  /* a fixed 60hz accumulator, so the sand does not care what your monitor is */
  acc += dt;
  var steps = 0;
  while (acc >= 1 / 60 && steps < 3) {
    acc -= 1 / 60; steps++;
    try { gameUpdate(g, 1 / 60); } catch (e) { console.error(e); }
  }
  if (acc > 1 / 30) acc = 0;
  try { gameDraw(g, ctx); } catch (e) { txt(ctx, "it fell over: " + e.message, PANEL + 10, 40, 10, "#f66"); console.error(e); }
  drawChrome();
  g.ms = lerp(g.ms, performance.now() - t0, 0.1);
}

/* scanlines and a vignette, because it is 2005. made once per canvas size */
function drawChrome() {
  if (!vig) {
    vig = document.createElement("canvas");
    vig.width = cv.width; vig.height = cv.height;
    var vg = vig.getContext("2d"), W = cv.width, H = cv.height;
    var grd = vg.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.0);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, "rgba(0,0,0,0.38)");
    vg.fillStyle = grd; vg.fillRect(0, 0, W, H);
    vg.fillStyle = "rgba(0,0,0,0.09)";
    var step = H / VH * CELL;
    for (var y = 0; y < H; y += step) vg.fillRect(0, Math.round(y), W, Math.max(1, Math.round(step * 0.35)));
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(vig, 0, 0); ctx.restore();
}

function resize() {
  var r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  var S = Math.max(1, Math.min(4, r.width * dpr / VW));
  cv.width = Math.round(VW * S); cv.height = Math.round(VH * S);
  ctx.setTransform(cv.width / VW, 0, 0, cv.height / VH, 0, 0);
  vig = null;
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
    actx();
    if (k === "m") { MUTED = !MUTED; return; }
    gameKey(g, k);
  });
  window.addEventListener("keyup", function (e) {
    g.keys[e.key.toLowerCase()] = 0;
    g.keys.shift = e.shiftKey ? 1 : 0;
    g.keys.alt = e.altKey ? 1 : 0;
  });
  window.addEventListener("blur", function () { g.keys = {}; g.ptr = null; if (g.down) { g.down = 0; sandRelease(g); g.btn = 0; } });
  window.addEventListener("resize", resize);

  /* one pointer at a time (mouse, pen or finger), captured so a drag that leaves the
     canvas still ends cleanly, and cancelled cleanly if the browser takes it away */
  function down(e) {
    if (g.ptr != null) return;
    e.preventDefault();
    actx();
    g.ptr = e.pointerId;
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    toGame(e.clientX, e.clientY);
    g.cx = g.pcx = (g.mx - PANEL) / CELL; g.cy = g.pcy = (g.my - PLAY_Y) / CELL;
    g.samp.length = 0; cursorSample(g);
    g.keys.shift = e.shiftKey ? 1 : 0;
    g.keys.alt = e.altKey ? 1 : 0;
    g.down = 1; g.btn = e.pointerType === "mouse" ? e.button : 0;
    gameTap(g, g.mx, g.my);
  }
  function up(e) {
    if (e.pointerId !== g.ptr) return;
    toGame(e.clientX, e.clientY);
    cursorSample(g);
    g.ptr = null;
    if (!g.down) return;
    g.down = 0;
    sandRelease(g);
    g.btn = 0;
  }
  cv.addEventListener("pointerdown", down);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
  window.addEventListener("pointermove", function (e) {
    if (g.ptr != null && e.pointerId !== g.ptr) return;
    toGame(e.clientX, e.clientY);
    cursorSample(g);
  });
  cv.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  cv.addEventListener("wheel", function (e) {
    if (!e.deltaY) return;
    e.preventDefault();
    gameWheel(g, e.deltaY > 0 ? 1 : -1);
  }, { passive: false });
}

/* where the cursor has been lately, so a throw uses the flick, not the last tick */
function cursorSample(g) {
  var s = g.samp, t = performance.now();
  s.push([t, (g.mx - PANEL) / CELL, (g.my - PLAY_Y) / CELL]);
  while (s.length > 12 || (s.length > 2 && t - s[0][0] > 150)) s.shift();
}
/* cursor speed in cells per tick, measured over the last ~80ms */
function cursorVel(g) {
  var s = g.samp, n = s.length;
  if (n < 2) return [0, 0];
  var b = s[n - 1], a = s[0], now = performance.now();
  if (now - b[0] > 90) return [0, 0];   /* it has stopped */
  for (var k = n - 2; k >= 0; k--) { a = s[k]; if (b[0] - a[0] > 80) break; }
  var dt = (b[0] - a[0]) / (1000 / 60);
  if (dt < 0.5) return [0, 0];
  return [(b[1] - a[1]) / dt, (b[2] - a[2]) / dt];
}

function boot() {
  cv = document.getElementById("cv");
  ctx = cv.getContext("2d", { alpha: false });
  g = newGame();
  gameInit(g);
  resize();
  initInput();
  requestAnimationFrame(frame);
}

window.PLEASAND = { game: function () { return g; } };

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
