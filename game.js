/* =====================================================================
   PLEASAND  --  game.js

   everything you see and touch: the sky, the picture of the grid, the
   glow, the bangs, the picker, the news ticker, the mouse, the keys,
   and the loop that runs it all sixty times a second.
   ===================================================================== */
"use strict";

var UI_FONT = '"Menlo", "Consolas", "DejaVu Sans Mono", "Courier New", monospace';
/* (the field's size is in world.js: VIEW_GW columns on screen, GH rows, a valley g.gw wide) */
var ROW0 = PLAY_Y + 2, ROWH = 10, FUN_N = 7, FUN_GAP = 4;
var SIZE_Y = 351, BTN_Y = 363, BTN2_Y = 375, BTN3_Y = 387;   /* (the picker runs down to 350) */
/* how fast time goes: sand ticks per frame, slowest first. SPEED_1 is normal */
var SKY_MOON = null;   /* the moon in the sky: where it is, and how big (gameInit; the flag on it is heavens.js) */
var SPEEDS = [0.25, 0.5, 1, 2, 4], SPEED_NAMES = ["1/4", "1/2", "1x", "2x", "4x"], SPEED_1 = 2;
var TIPS = [
  "tip: pick PEASANT, grab one, and throw it at the hut",
  "tip: WHEEL changes the brush size. SHIFT-drag draws a straight line",
  "tip: middle-click picks up whatever is under the cursor. S and A make time slower and faster, R is a new village",
  "tip: pour some seeds near a duck",
  "tip: lightning in a duck pond is a terrible idea",
  "tip: peasants can swim. they cannot breathe under ice",
  "tip: put a nuke next to a cloner. then stand well back",
  "tip: lightning in a pond zaps everybody in the pond",
  "tip: fireworks make peasants happy. briefly",
  "tip: S slows time down. try it on a nuke",
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
  "tip: ducks love wheat. the peasants will think of something",
  "tip: peasants who farm will chase ducks out of the wheat. throw one in and see",
  "tip: a village that knows buckets and landscaping, and lives a long way from water, digs itself a pond",
  "tip: spill a puddle on somebody's floor, or tip a pile of sand by their door, once they know landscaping. they will tidy it up",
  "tip: there is coal, iron ore and gold in the rock. a village that has dug enough holes will go looking for it",
  "tip: deep in the rock there is oil. a mine can smell it, and then they want a derrick",
  "tip: an oil well pours its overflow at the foot of the derrick. do not bring a torch",
  "tip: oil, a tank and a little iron: the peasants will eventually think of rocket packs",
  "tip: hover over the dark rock of a mine. the galleries go where the ore is",
  "tip: a watchtower has a ladder up the inside. a lift is quicker. iron makes a lift",
  "tip: paint some ICE where they walk. or COOL the pond and watch them cross it",
  "tip: throw a peasant onto a frozen pond. then another",
  "tip: hold HEAT on a lump of iron ore. what runs out of it sets as iron",
  "tip: paint some SNOW by the houses and wait for somebody to get bored. then duck",
  "tip: the peasants pick up what is left over: ash, salt, lumps of glass. hover over one to see their pockets",
  "tip: COOL a field and the wheat stops growing. a village that makes glass knows what to do about that",
  "tip: coal, salt and ash, ground fine, go bang. the peasants will work that out. eventually"
];
/* and, in a valley wider than the screen, one of these in place of every fourth of those. (a list of their own: g.tip
   counts round TIPS as it always has, and the village's heap, tidy.js, shares the name) */
var VALLEY_TIPS = [
  "tip: the valley is four screens wide. swipe sideways, Shift-wheel or \u2190/\u2192 to look along it",
  "tip: the strip under the field is the whole valley. drag it",
  "tip: G takes you back to the village"
];
function tipLine(g) {
  if (camMax(g) <= 0) return TIPS[g.tip];
  var k = g.tipW || 0;   /* (a wide valley: its own count, g.tipW; one of the valley's every fourth, starting with one) */
  return k % 4 === 0 ? VALLEY_TIPS[(k >> 2) % VALLEY_TIPS.length] : TIPS[(k - (k >> 2) - 1) % TIPS.length];
}

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
/* the width a new valley is: four screens, unless the page (or a test) asks for another */
function gameBootW() {
  var w = typeof window !== "undefined" && window && window.PLEASAND_GW ? Math.round(window.PLEASAND_GW) : WORLD_GW;
  return Math.max(VIEW_GW, w || WORLD_GW);
}
function gameInit(g) {
  g.bootW = gameBootW();
  gameGrid(g, g.bootW);
  g.tick = 0; g.parity = 0;
  g.fx = { boom: 0, bigboom: 0, hiss: 0, whoosh: 0, bloom: 0, burst: 0, whistle: 0, thunder: 0, zap: 0,
           pop: 0, thud: 0, splat: 0, die: 0, ghost: 0, whee: 0, fanfare: 0, splash: 0, quack: 0, peep: 0, squeak: 0,
           hammer: 0, saw: 0, idea: 0, pick: 0, clang: 0, clank: 0, bell: 0, clap: 0 };
  g.snd = {};
  g.peasants = []; g.ghosts = []; g.pid = 0; g.rip = 0; g.astronauts = 0; g.causes = {}; g.duckRip = 0; g.pop = null; g.hdrHit = [];
  g.feed = []; g.banners = []; g.got = {}; g.cloneN = {}; g.cloneSrc = {}; g.bolts = []; g.rings = []; g.shake = 0; g.flash = 0; g.fwGlow = null;
  g.ducks = []; g.did = 0; g.heldDuck = null;
  g.sites = []; g.sid = 0;
  g.held = null; g.cx = 0; g.cy = 0; g.pcx = 0; g.pcy = 0; g.cvx = 0; g.cvy = 0; g.toolT = 0;
  g.intro = 0; g.tip = irnd(TIPS.length);
  gamePicture(g);
  gameSky(g);
  g.sel = FUN_N; g.size = 5; g.paused = 0; g.speed = SPEED_1; g.speedAcc = 0; g.lx = null; g.ax = null;
  camReset(g);
  sandLandscape(g);
  camHome(g, true);
  g.camJ = g.camI;   /* (where a new valley opens is no move of the hand's: nothing to journal) */
}
/* the grid, and the scratch that goes with it, for a valley w wide */
function gameGrid(g, w) {
  g.cell = CELL; g.gw = w; g.gh = GH;
  var n = w * GH;
  g.m = new Uint8Array(n);
  g.stamp = new Uint32Array(n);
  g.aux = new Uint8Array(n);
  g.sh = new Uint8Array(n);
  g.vy = new Uint8Array(n);
  g.zmark = new Uint8Array(n); g.zlist = new Int32Array(n + 8); g.zn = 0; g.zt = 0;
  g.pmark = new Uint32Array(n); g.pstack = new Int32Array(n); g.pgen = 0; g.pressList = new Int32Array(PRESS_TRIES); g.pressN = 0;
  partInit(g);
  heatInit(g);
}
/* the picture is drawn into a canvas at grid size, then the part of it in view is stretched onto the screen */
function gamePicture(g) {
  var w = g.gw;
  g.vc = document.createElement("canvas"); g.vc.width = w; g.vc.height = GH;
  g.vctx = g.vc.getContext("2d");
  g.img = g.vctx.createImageData(w, GH);
  g.px = new Uint32Array(g.img.data.buffer);
  /* and the glow: hot cells only, shrunk twice (which blurs them), then laid over the top. (the small two are one
     screen's worth: they are made from the part of it in view) */
  g.gc = document.createElement("canvas"); g.gc.width = w; g.gc.height = GH;
  g.gctx = g.gc.getContext("2d");
  g.gimg = g.gctx.createImageData(w, GH);
  g.gpx = new Uint32Array(g.gimg.data.buffer);
  g.gc2 = document.createElement("canvas"); g.gc2.width = Math.ceil(VIEW_GW / 2); g.gc2.height = Math.ceil(GH / 2);
  g.gc4 = document.createElement("canvas"); g.gc4.width = Math.ceil(VIEW_GW / 4); g.gc4.height = Math.ceil(GH / 4);
  g.gc2x = g.gc2.getContext("2d"); g.gc4x = g.gc4.getContext("2d");
  g.dep = new Uint8Array(w);
  g.haze = new Int8Array(GH);
  g.wave = new Uint8Array(w);
  g.stripC = null;
}
/* the sky: a dusk gradient, two rows of far hills, a moon, and stars that twinkle. (the moon is in the middle screen,
   where it always was in a valley one screen wide) */
function gameSky(g) {
  var GW = g.gw, n = GW * GH, i, x, y, V0 = (GW - VIEW_GW) >> 1;
  g.bg = new Uint32Array(n);
  var top = hexRGB("#0a1026"), mid = hexRGB("#1c1d3c"), bot = hexRGB("#3a2a48");
  var far = [], near = [], ph = Math.random() * 10;
  for (x = 0; x < GW; x++) {
    far[x] = GH * 0.48 + Math.sin(x * 0.03 + ph) * 12 + Math.sin(x * 0.011 + ph * 3) * 18;
    near[x] = GH * 0.62 + Math.sin(x * 0.05 + ph * 2) * 9 + Math.sin(x * 0.017 + ph) * 12;
  }
  var mx = V0 + Math.round(VIEW_GW * (0.65 + Math.random() * 0.25)), my = 26, mr = 9;
  SKY_MOON = { x: mx, y: my, r: mr };   /* (where it is, for the flag on it: heavens.js) */
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
  for (var s = 0, ns = 150 * GW / VIEW_GW; s < ns; s++) {
    x = irnd(GW); y = irnd(Math.floor(GH * 0.55));
    i = y * GW + x;
    if (y > far[x] - 1 || Math.abs(x - mx) < mr + 2 && Math.abs(y - my) < mr + 2) continue;
    var b = 0.35 + Math.random() * 0.65;
    g.bg[i] = rgb32([200 + irnd(55), 210 + irnd(45), 255], b);
    if (Math.random() < 0.3) g.stars.push({ i: i, b: b, p: Math.random() * 6.28, s: 1 + Math.random() * 3 });
  }
}
/* a valley of another width, in place: for a save that is, or a NEW one that is to be. the brush, the speed and the
   rest of the panel stay as they are; the sky is painted with the side dice, so the village's dice do not move */
/* (the stars are read by the observatory, heavens.js, so the sky of a valley made another width is rolled on dice of its
   own, seeded from the width and the tick: the same on a replay, and never the village's dice or the picture's) */
function gameSkyOwn(g) {
  var keep = Math.random, own = rngMake((g.gw * 40503 + 0x51de) >>> 0);   /* (by the width alone: one sky a width) */
  Math.random = own.random;
  try { gameSky(g); } finally { Math.random = keep; }
}
function gameResize(g, w) {
  w = Math.max(VIEW_GW, Math.round(w));
  gameGrid(g, w);
  gamePicture(g);
  gameSkyOwn(g);
  /* (scratch the other modules make for themselves, at the old size: made again at the new one when next wanted) */
  ["navSeen", "navShut", "navCost", "navFrom", "navHow", "navLad", "navHeapI", "navHeapF", "bmark", "dmask", "mcave", "lboost",
   "lboostY", "tGround", "seenAt"].forEach(function (k) { delete g[k]; });
  g.vrange = { x0: 0, x1: w - 1 };
  camClamp(g);
  return g;
}
/* NEW: a valley the width a new one is (it may have been another, loaded from a save) */
function gameNew(g) {
  /* (in a wide valley, whatever stroke or line the hand had going belongs to the old one: it ends, and the press with it) */
  if (camMax(g) > 0 || g.gw !== (g.bootW || gameBootW())) { g.lx = null; g.ax = null; if (g.down) g.eaten = 1; }
  if (g.gw !== (g.bootW || gameBootW())) gameResize(g, g.bootW || gameBootW());
  sandLandscape(g);
  camHome(g, true);
  g.camJ = g.camI;
}

/* -------------------------------------------------------------------
   2b. LOOKING ALONG THE VALLEY: the camera

   the valley is wider than the screen. g.camX is the column at the left
   edge of the view (a float: it glides), g.camT where it is gliding to,
   and g.camI the whole column the picture is drawn from this frame. the
   camera is not the village's: it never rolls its dice, and it only moves
   when you move it.
   ------------------------------------------------------------------- */
var CAM_EASE = 0.35, CAM_EDGE = 12, CAM_DWELL = 12, CAM_KEYPAN = [2, 10], CAM_NOTCH = 24;
function camMax(g) { return Math.max(0, g.gw - VIEW_GW); }
function camClamp(g) {
  var M = camMax(g);
  g.camX = clamp(g.camX || 0, 0, M); g.camT = clamp(g.camT == null ? g.camX : g.camT, 0, M);
  g.camI = Math.round(g.camX);
}
function camReset(g) {
  g.camX = g.camT = 0; g.camI = 0; g.camJ = 0;
  g.whlAxis = null; g.whlT = 0; g.edgeT = 0; g.edgeSide = 0; g.stripDrag = null; g.arrowT = 0;
}
/* where the village is: the middle of its houses, else of its living peasants, else of the valley. null if nobody */
function camVillageX(g) {
  var n = 0, x = 0, k;
  for (k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "house") { n++; x += (g.sites[k].x0 + g.sites[k].x1) / 2; }
  if (!n) for (k = 0; k < g.peasants.length; k++) if (!g.peasants[k].dead && g.peasants[k].state !== "space") { n++; x += g.peasants[k].x; }
  return n ? x / n : null;
}
/* centre the view on column x: gliding, or (now) at once */
function camGo(g, x, now) {
  g.camT = clamp(x - VIEW_GW / 2, 0, camMax(g));
  if (now) { g.camX = g.camT; g.camI = Math.round(g.camX); }
}
function camHome(g, now) {
  var x = camVillageX(g);
  camGo(g, x == null ? g.gw / 2 : x, now);
  return x != null;
}
/* the camera into the journal, once it has come to rest (a glide snapping, a drag or a swipe ending), and before
   anything else is journalled: one entry a move, not sixty */
function camJournal(g) {
  if (g.camI === g.camJ) return;
  g.camJ = g.camI;
  /* (u: the harness's count of updates, sixty a second, paused or not, that it is to be put back after) */
  saveInput(g, "cam", { x: g.camI, u: Math.round(g.t * 60) - (CAM_IN_UPDATE ? 1 : 0) });
}
/* a pan by d cells, straight away (a swipe, a drag): the picture stays under your fingers */
function camPan(g, d) {
  g.camX = g.camT = clamp(g.camX + d, 0, camMax(g));   /* (from where the view is, not where a glide was going) */
  /* (camI, what is drawn and what a click lands on, follows at the next update: the two never disagree) */
}
/* is the hand doing something a drag can carry along past the edge of the view? */
function camDragging(g) {
  if (!g.down || g.stripDrag || g.eaten) return false;
  /* (something actually going on in the field: a stroke under way, a ruled line, somebody held. a press on the picker,
     or an eyedrop, is not) */
  return !!(g.held || g.heldDuck || g.ax != null || g.lx != null);
}
/* which side of the field the hand is carrying the view to, and how hard: past the left or right side (corners too), or
   in the edge of the field beside it, within the field's rows. dragged up into the header, or down into the bar, it is
   neither. {side: -1, 0 or 1, depth: 0 .. 1} */
function camEdge(g) {
  var inRows = g.my >= PLAY_Y && g.my < PLAY_B, lx = g.mx - PANEL, rx = VW - g.mx;
  if (!inRows && g.mx >= 0 && g.mx < VW && g.my >= 0 && g.my < VH) return { side: 0, depth: 0 };   /* (the header, the strip, the bar: on the canvas, not past a side of it) */
  if (lx < 0 || (lx < CAM_EDGE && inRows)) return { side: -1, depth: clamp((CAM_EDGE - lx) / CAM_EDGE, 0, 1) };
  if (rx <= 0 || (rx < CAM_EDGE && inRows)) return { side: 1, depth: clamp((CAM_EDGE - rx) / CAM_EDGE, 0, 1) };
  return { side: 0, depth: 0 };
}
/* (the camera journal's rows say which update they belong before: one made in an update, before the world moves, goes
   before it; one made by the hand between updates, after the last) */
var CAM_IN_UPDATE = false;
/* once an update, at sixty a second whatever the speed, paused or not */
function camStep(g) {
  var M = camMax(g), before = g.camI;
  if (M <= 0) { g.camX = g.camT = 0; g.camI = 0; return; }
  /* the arrow keys: held, faster the longer they are held (with Shift, they page instead: gameKey) */
  var dir = (g.keys.arrowright ? 1 : 0) - (g.keys.arrowleft ? 1 : 0);
  if (dir && !g.keys.shift) {
    g.arrowT = Math.min(30, (g.arrowT || 0) + 1);
    g.camT = clamp(g.camX + dir * lerp(CAM_KEYPAN[0], CAM_KEYPAN[1], g.arrowT / 30), 0, M);   /* (from where the view is) */
    g.camX = g.camT;
  } else { if (g.arrowT) g.arrowEnd = 1; g.arrowT = 0; }
  /* edge pan: dragging something (a stroke, a ruled line, somebody held) into the edge of the view carries the view
     along. after a moment in the edge, or at once if it came in moving that way */
  var side = 0, depth = 0;
  if (camDragging(g)) { var ed = camEdge(g); side = ed.side; depth = ed.depth; }
  if (!side) { g.edgeT = 0; g.edgeSide = 0; }
  else {
    if (side !== g.edgeSide) { g.edgeSide = side; g.edgeT = 0; if ((g.svx || 0) * side > 1.5) g.edgeT = CAM_DWELL; }
    if (++g.edgeT >= CAM_DWELL) {
      g.camT = clamp(g.camX + side * lerp(1, 8, depth), 0, M);
      g.camX = g.camT;
    }
  }
  /* and the glide */
  if (Math.abs(g.camT - g.camX) < 0.05) {
    if (g.camX !== g.camT) { g.camX = g.camT; g.camI = Math.round(g.camX); camJournal(g); }
  } else g.camX += (g.camT - g.camX) * CAM_EASE;
  g.camI = Math.round(g.camX);
  if (g.arrowEnd) { g.arrowEnd = 0; camJournal(g); }   /* (the arrows let go: the view as this update has it) */
  /* (a pan by hand, journalled when the hand lets go: see the wheel and the strip) */
  if (g.camI !== before && !g.stripDrag && !g.whlAxis && !side && !dir && g.camX === g.camT) camJournal(g);
}
/* after a load: the view the save had (clamped to this valley), or the village if it had none; and the village's range,
   if the save is from before there was one */
function camLoaded(g) {
  var had = typeof g.camX === "number";
  if (!had) { g.camX = g.camT = 0; }
  camClamp(g);
  if (!had) camHome(g, true);
  if (!g.vrange || !(g.vrange.x0 >= 0) || !(g.vrange.x1 < g.gw) || g.vrange.x1 < g.vrange.x0) vRangeSet(g);
  g.camJ = g.camI; g.stripN = 0;
  g.whlAxis = null; g.edgeT = 0; g.edgeSide = 0; g.stripDrag = null; g.arrowT = 0; g.eaten = 0;
}
/* a step of a page or a notch: on from where a glide the same way is going, or from where the view is if it was going
   the other way (End, then Shift-Left, goes left) */
function camNudge(g, d) {
  var base = (g.camT - g.camX) * d > 0 ? g.camT : g.camX;
  g.camT = clamp(base + d, 0, camMax(g));
}
/* the wheel. a gesture is a run of events with gaps under 150ms; its axis is whichever its first real movement was
   along. sideways pans (a trackpad swipe, Shift and the wheel), up and down is the brush size, as it always was */
function camWheelGesture(g, dx, dy, mode, shift, now, scale) {
  /* (a valley one screen wide has nothing to look along: the wheel is what it always was, the brush, on any deltaY) */
  if (camMax(g) <= 0) return dy ? (dy > 0 ? 1 : -1) : 0;
  camWheelEnd(g, now);   /* (the last gesture, if it is over: journalled before this one starts) */
  var px = mode === 1 ? 16 : (mode === 2 ? 400 : 1);
  dx *= px; dy *= px;
  if (shift && !dx) { dx = dy; dy = 0; }
  if (!g.whlAxis || now - g.whlT > 150) {
    if (!dx && !dy) return null;
    g.whlAxis = Math.abs(dx) > Math.abs(dy) || shift ? "x" : "y";
  }
  g.whlT = now;
  if (g.whlAxis === "y") return dy ? (dy > 0 ? 1 : -1) : 0;
  if (!dx) return 0;
  /* (a trackpad, or a wheel that counts in lines or pages: as far as it says, in the canvas's pixels. Shift and a
     notched wheel: a notch at a time, gliding) */
  if (!shift) { camPan(g, clamp(dx * scale / CELL, -VIEW_GW, VIEW_GW)); return 0; }
  camNudge(g, (dx > 0 ? 1 : -1) * CAM_NOTCH);
  return 0;
}
/* the end of a wheel gesture: 150ms with nothing (looked at once an update) */
function camWheelEnd(g, now) {
  if (g.whlAxis && now - g.whlT > 150) { g.whlAxis = null; if (g.camX === g.camT) camJournal(g); }   /* (a glide journals itself when it gets there) */
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
  var n = Math.min(Math.max(300, g.gw + g.gh), Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / Math.max(1, g.size * 0.5))));
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
MAT_NAME[MAT.PACKSNOW] = "PACKED SNOW"; MAT_NAME[MAT.ROCKSALT] = "ROCK SALT";
/* the things only peasants make */
MAT_NAME[MAT.PLANK] = "PLANKS"; MAT_NAME[MAT.DOOR] = "DOOR"; MAT_NAME[MAT.LADDER] = "LADDER"; MAT_NAME[MAT.STAIRS] = "STAIRS";
MAT_NAME[MAT.BED] = "BED"; MAT_NAME[MAT.SAPLING] = "SAPLING";
MAT_NAME[MAT.SOIL] = "TILLED EARTH"; MAT_NAME[MAT.CROP] = "YOUNG WHEAT"; MAT_NAME[MAT.WHEAT] = "RIPE WHEAT"; MAT_NAME[MAT.LAMP] = "LANTERN";
MAT_NAME[MAT.COAL] = "COAL"; MAT_NAME[MAT.ORE] = "IRON ORE"; MAT_NAME[MAT.GOLD] = "GOLD"; MAT_NAME[MAT.BRICK] = "STONEWORK"; MAT_NAME[MAT.GIRDER] = "IRON GIRDER";
MAT_NAME[MAT.CONCRETE] = "CONCRETE"; MAT_NAME[MAT.STAINED] = "STAINED GLASS"; MAT_NAME[MAT.FIREBRICK] = "FIREBRICK"; MAT_NAME[MAT.MOONROCK] = "MOON ROCK";
/* a cell partway through melting, boiling or setting says so */
var MAT_UP = [], MAT_DOWN = [];
MAT_UP[MAT.WATER] = MAT_UP[MAT.SALTWATER] = "boiling"; MAT_UP[MAT.ICE] = MAT_UP[MAT.SNOW] = MAT_UP[MAT.PACKSNOW] = "melting";
MAT_UP[MAT.STONE] = MAT_UP[MAT.GLASS] = MAT_UP[MAT.METAL] = MAT_UP[MAT.ORE] = MAT_UP[MAT.BRICK] = MAT_UP[MAT.GIRDER] = "melting";
MAT_UP[MAT.CONCRETE] = MAT_UP[MAT.STAINED] = MAT_UP[MAT.FIREBRICK] = MAT_UP[MAT.MOONROCK] = "melting"; MAT_UP[MAT.SAND] = MAT_UP[MAT.SOIL] = "fusing"; MAT_UP[MAT.ACID] = "boiling";
MAT_DOWN[MAT.WATER] = MAT_DOWN[MAT.SALTWATER] = "freezing"; MAT_DOWN[MAT.STEAM] = "condensing"; MAT_DOWN[MAT.LAVA] = "setting";
function cellReadout(g, j) {
  var v = g.m[j], e = g.lat[j], name = MAT_NAME[v] || "", s;
  if (v === MAT.LAVA && g.aux[j] === MAT.GLASS) name = "MOLTEN GLASS";
  else if (v === MAT.LAVA && g.aux[j] === MAT.METAL) name = "MOLTEN METAL";
  else if (v === MAT.PLANK && g.aux[j] === 1) name = "WINDOW";
  else if (v === MAT.STAINED) name = ["RUBY", "GREEN", "AMBER"][g.aux[j] % 3] + " GLASS";
  /* part of something they built, or are building */
  var site = bReadout(g, j);
  if (site) name = name + " · " + site;
  s = name + "  " + heatLabel(g.T[j]);
  /* (wet concrete going off: wonders.js) */
  if (v === MAT.MORTAR) s += "  " + (g.aux[j] & 128 ? "in its form, " : "") + "setting " + Math.min(99, Math.round((g.aux[j] & 127) / W_SET * 100)) + "%";
  if (e > 0 && MAT_UP[v]) s += "  " + MAT_UP[v] + " " + Math.min(99, Math.round(e / HEAT_HI_L[v] * 100)) + "%";
  else if (e < 0 && MAT_DOWN[v]) {
    var L = v === MAT.LAVA ? HEAT_HI_L[g.aux[j] || MAT.STONE] : HEAT_LO_L[v];
    s += "  " + MAT_DOWN[v] + " " + Math.min(99, Math.round(-e / L * 100)) + "%";
  }
  return s;
}
function sandBrush(g) { return g.btn === 2 ? MAT.EMPTY : curPick(g).m; }   /* right button always erases */
/* (the cell under the cursor is one in view: past the edge of it, while a stroke is carried along, the edge's) */
function sandCell(g) { var c = g.camI || 0; return { x: clamp(g.cx, c, Math.min(g.gw, c + VIEW_GW) - 1), y: clamp(g.cy, 0, g.gh - 1) }; }
function inPlay(g) { return g.mx >= PANEL && g.mx < VW && g.my >= PLAY_Y && g.my < PLAY_B; }
function painting(g) { var p = curPick(g); return g.btn === 2 || (!p.tool && p.m !== MAT.NUKE); }

function sandPaint(g) {
  if (!g.down || g.btn === 1 || g.keys.alt || g.ax != null || !painting(g) || g.stripDrag || g.eaten) { g.lx = null; return; }
  /* (a stroke already going may be dragged past the side of the field: it goes on at the edge, and the view along) */
  if (!inPlay(g)) {
    /* (only out past the left or the right side, where the view is carried along, corners included: dragged up into the
       header or down into the bar, a stroke ends, as it always has) */
    if (!(camMax(g) > 0 && g.lx != null && camEdge(g).side)) { g.lx = null; return; }
    /* (out past the top or the bottom as well: it goes on along that edge of the field, the cell clamped into it) */
  }
  var p = sandCell(g);
  if (g.keys.shift) { g.ax = p.x; g.ay = p.y; g.av = sandBrush(g); g.lx = null; return; }   /* start a ruled line */
  if (g.lx == null) { g.lx = p.x; g.ly = p.y; }
  sandStroke(g, g.lx, g.ly, p.x, p.y, sandBrush(g), false);
  g.lx = p.x; g.ly = p.y;
}
function sandRelease(g) {
  if (g.stripDrag) stripMove(g, true);   /* (where the hand let go is where the view is, even between updates) */
  /* (in a wide valley the view may have moved since the last update: the cell under the hand is worked out afresh, and
     the stroke is over, so a quick press elsewhere does not carry it on. one screen wide, as it always was) */
  if (camMax(g) > 0) { g.cx = (g.mx - PANEL) / CELL + (g.camI || 0); g.cy = (g.my - PLAY_Y) / CELL; g.lx = null; }
  g.stripDrag = null; g.eaten = 0;
  camJournal(g);
  saveInput(g, "up", { x: saveR(g.cx), y: saveR(g.cy), pick: curPick(g).name, held: g.held ? g.held.name : undefined });
  if (g.held) peasantThrow(g, g.held);
  if (g.heldDuck) duckThrow(g, g.heldDuck);
  if (g.ax == null) return;
  var p = sandCell(g);
  sandStroke(g, g.ax, g.ay, p.x, p.y, g.av, true);
  g.ax = null;
}
/* held-down tools repeat: peasants keep coming, lightning keeps striking */
function toolHold(g) {
  if (!g.down || g.btn !== 0 || !inPlay(g) || g.keys.alt || g.stripDrag || g.eaten) return;
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
function rowAt(x, y, n) {
  if (x >= PANEL || y < ROW0) return -1;
  for (var k = 0; k < (n == null ? PICK.length : n); k++) if (y >= rowY(k) && y < rowY(k) + ROWH) return k;
  return -1;
}
/* the side panel, as a click on it means: "row:<k>" (the k'th brush in the list), "size-", "size+", "pause", "clear",
   "slower", "faster", "new", "thermal", "hush", or "tip". L is a layout of the panel (how many rows, and where the
   buttons are), for a recording made with another (harness.js); with none, the panel as it is */
var PANEL_LAYOUT = { n: null, SIZE_Y: SIZE_Y, BTN_Y: BTN_Y, BTN2_Y: BTN2_Y, BTN3_Y: BTN3_Y };
function panelAt(x, y, L) {
  L = L || PANEL_LAYOUT;
  var row = rowAt(x, y, L.n);
  if (row >= 0) return "row:" + row;
  if (y >= L.SIZE_Y && y < L.SIZE_Y + 12) return x >= 44 && x < 58 ? "size-" : (x >= 76 && x < 90 ? "size+" : "");
  if (y >= L.BTN_Y && y < L.BTN_Y + 12) return x < 48 ? "pause" : "clear";
  if (y >= L.BTN2_Y && y < L.BTN2_Y + 12) return x < 14 ? "slower" : (x >= 36 && x < 48 ? "faster" : (x >= 48 ? "new" : ""));
  if (y >= L.BTN3_Y && y < L.BTN3_Y + 12) return x < 48 ? "thermal" : "hush";
  if (y >= 400) return "";   /* (under the buttons, below where the panel used to end: nothing) */
  return "tip";
}
/* and what it does. "sel:<NAME>": that brush, by name */
function panelDo(g, a) {
  if (a.slice(0, 4) === "row:") { var k = +a.slice(4); if (k >= 0 && k < PICK.length) g.sel = k; return; }
  if (a.slice(0, 4) === "sel:") { for (var i = 0; i < PICK.length; i++) if (PICK[i].name === a.slice(4)) g.sel = i; return; }
  if (a === "size-") g.size = clamp(g.size - 1, 1, SAND_MAXSIZE);
  else if (a === "size+") g.size = clamp(g.size + 1, 1, SAND_MAXSIZE);
  else if (a === "pause") g.paused = g.paused ? 0 : 1;
  else if (a === "clear") sandClear(g);
  else if (a === "slower") gameSpeed(g, -1);
  else if (a === "faster") gameSpeed(g, 1);
  else if (a === "new") gameNew(g);
  else if (a === "thermal") g.thermal = !g.thermal;
  else if (a === "hush") g.hush = !g.hush;
  else if (a === "tip") { if (camMax(g) <= 0) g.tip = (g.tip + 1) % TIPS.length; else g.tipW = (g.tipW || 0) + 1; }   /* (a wide valley counts its own, clear of the village's heap: tidy.js shares g.tip) */
}

/* -------------------------------------------------------------------
   4. THE TICK
   ------------------------------------------------------------------- */
function gameUpdate(g, dt) {
  CAM_IN_UPDATE = true;
  try { gameUpdate1(g, dt); } finally { CAM_IN_UPDATE = false; }
}
function gameUpdate1(g, dt) {
  g.t += dt;
  g.intro += dt;
  /* where the view is (it glides, and the arrows and a drag at the edge move it), then where the cursor is, in the
     world's cells, and how fast it is going across the screen (for throwing: a flick is a flick, wherever the view is) */
  var cv2 = cursorVel(g);
  g.svx = cv2[0];
  stripMove(g);
  camStep(g);
  camWheelEnd(g, typeof performance !== "undefined" ? performance.now() : 0);
  g.cx = (g.mx - PANEL) / CELL + g.camI; g.cy = (g.my - PLAY_Y) / CELL;
  g.cvx = cv2[0]; g.cvy = cv2[1];
  g.pcx = g.cx; g.pcy = g.cy;
  sandPaint(g);
  toolHold(g);
  ageBangs(g);
  if (g.helloT > 0 && --g.helloT === 0 && g.helloP && !g.helloP.dead) pSay(g, g.helloP, "hello", true);
  /* at 1/4 speed the world moves one frame in four; at 4x, four times a frame */
  var steps = 0;
  if (!g.paused) {
    g.speedAcc += SPEEDS[g.speed];
    while (g.speedAcc >= 1) { g.speedAcc--; steps++; }
  }
  for (var n = 0; n < steps; n++) {
    sandStep(g);
    partStep(g);
    peasantsStep(g);
    ducksStep(g);
  }
  if (!steps) {
    if (g.held) pHeld(g, g.held);
    if (g.heldDuck) dHeld(g, g.heldDuck);
  }
  for (var k = g.feed.length - 1; k >= 0; k--) if ((g.feed[k].t += dt) > 7) g.feed.splice(k, 1);
  if (g.banners.length && (g.banners[0].t += dt) > 3.5) g.banners.shift();
  sandSounds(g);
  saveTick(g);
}

/* the sound department, rationed: one bang per bang, not one per grain of powder */
/* (once a frame, not once a tick: how many times a sound is played, and its dice rolled, is down to the frame rate and
   the speed. so in a village with great works in it, it all rolls the side dice (rng.js), and the village comes out the
   same at any speed. a plain village rolls as it always did, so that it comes out as it always has) */
function sandSounds(g) { return g.wAny ? sandSoundsSide(g) : sandSounds0(g); }
function sandSounds0(g) {
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
    if (ok("pick", 0.07)) SFX.pick();
    if (ok("clang", 0.2)) SFX.clang();
    if (ok("clank", 0.12)) SFX.clank();
    if (ok("bell", 0.6)) SFX.bell();
    if (ok("clap", 0.5)) SFX.clap();
  }
  if (g.wAny) pOrganSounds(g);   /* (the steam organ's notes, each its own pitch: pleasures.js) */
  for (var k in f) f[k] = 0;
}

/* -------------------------------------------------------------------
   5. DRAWING THE WORLD
   ------------------------------------------------------------------- */
/* (only the columns in view, and a couple either side, are worked out a cell at a time. all: the whole valley) */
function drawCols(g, all) {
  if (all) return [0, g.gw];
  var c = g.camI || 0;
  return [Math.max(0, c - 2), Math.min(g.gw, c + VIEW_GW + 2)];
}
function drawWorld(g, all) {
  var m = g.m, sh = g.sh, px = g.px, gp = g.gpx, gw = g.gw, gh = g.gh, dep = g.dep, bg = g.bg, wave = g.wave;
  var x, y, i, v, row, d, hot = 0, W = MAT.WATER, t = g.t, k, T = g.T, tc, f, a;
  var C = drawCols(g, all), X0 = C[0], X1 = C[1];
  if (X0 === 0 && X1 === gw) gp.fill(0);
  else for (y = 0; y < gh; y++) gp.fill(0, y * gw + X0, y * gw + X1);
  if (g.thermal) return drawThermal(g, X0, X1);
  /* stars twinkle */
  for (k = 0; k < g.stars.length; k++) {
    var st = g.stars[k], b = st.b * (0.55 + 0.45 * Math.sin(t * st.s + st.p));
    bg[st.i] = rgb32([225, 232, 255], b);
  }
  /* where the light catches the waves this frame */
  for (x = X0; x < X1; x++) wave[x] = (Math.sin(x * 0.37 + t * 2.6) + Math.sin(x * 0.13 - t * 1.7)) > 1.25 ? 1 : 0;
  /* heat haze: each row of hot air is nudged a pixel one way or the other, and it wobbles */
  var haze = g.haze;
  for (y = 0; y < gh; y++) haze[y] = Math.sin(y * 0.9 + t * 9) > 0 ? 1 : -1;
  var flick = (t * 8) | 0;
  for (y = 0; y < gh; y++) {
    row = y * gw;
    for (x = X0; x < X1; x++) {
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
      } else if (v === MAT.BRICK) {
        /* squared stone in courses two high, with mortar between, and (where the stonework is wider than one block)
           the joints staggered */
        f = (y > 0 && AIRY[m[i - gw]]) ? SAND_LIT[v][sh[i]] : SAND_PAL[v][sh[i]];
        a = y % 3 === 0 || (x > 0 && x < gw - 1 && m[i - 1] === v && m[i + 1] === v && (x + ((y / 3) | 0) * 2) % 4 === 0);
        px[i] = a ? blend32(f, 0xff000000, 0.25) : f;
      } else if (v === MAT.FIREBRICK) {
        /* firebrick: pale, in courses, like dressed stone, but smaller */
        f = (y > 0 && AIRY[m[i - gw]]) ? SAND_LIT[v][sh[i]] : SAND_PAL[v][sh[i]];
        a = (y & 1) === 0 || ((x + (y >> 1) * 2) % 3 === 0);
        px[i] = a ? blend32(f, 0xff000000, 0.18) : f;
      } else if (v === MAT.CONCRETE) {
        /* concrete: the lines of the boards it was poured against, every fourth row */
        f = (y > 0 && AIRY[m[i - gw]]) ? SAND_LIT[v][sh[i]] : SAND_PAL[v][sh[i]];
        px[i] = y % 4 === 0 ? blend32(f, 0xff000000, 0.12) : f;
      } else if (v === MAT.STAINED) {
        /* coloured glass: its colour is in aux. lit from behind (a lantern, a fire, near it) it glows (wonders.js) */
        px[i] = blend32(SAND_PAL[v][g.aux[i] % 3], bg[i], 0.25);
        if (wLitGlass(g, x, y)) { px[i] = blend32(SAND_PAL[v][g.aux[i] % 3], 0xffffffff, 0.2); gp[i] = px[i]; hot++; }
      } else if (v === MAT.MOONROCK) {
        /* pale and pitted, with a faint shimmer */
        px[i] = SAND_PAL[v][(sh[i] + ((Math.sin(x * 0.31 + y * 0.23 + t * 0.9) * 20) | 0)) & 255];
        if (((x * 5 + y * 11) % 7) === 0) px[i] = blend32(px[i], 0xff000000, 0.3);
      } else if (v === MAT.GIRDER) {
        /* a lattice: the edges and the crossing diagonals are iron, the rest is see-through */
        a = ((x + y) % 3 === 0) || ((x - y + 300) % 3 === 0);
        px[i] = a ? SAND_PAL[v][sh[i]] : blend32(bg[i], 0xff000000, 0.35);
      } else if (v === MAT.GOLD || v === MAT.COAL) {
        /* gold glints, now and then; coal has a greasy shine where the light catches it */
        px[i] = (y > 0 && AIRY[m[i - gw]]) ? SAND_LIT[v][sh[i]] : SAND_PAL[v][sh[i]];
        if (((x * 7 + y * 13 + flick) % (v === MAT.GOLD ? 23 : 97)) === 0) px[i] = v === MAT.GOLD ? INERT_GLINT : SAND_PAL[v][3];
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
    var zl = 0;
    for (k = 0; k < g.zn; k++) {
      i = g.zlist[k]; x = i % gw;
      if (x < X0 || x >= X1) continue;   /* (out of view along the valley) */
      if (m[i] === W || m[i] === MAT.ACID) { px[i] = gp[i] = zc[irnd(3)]; zl++; }
    }
    if (zl) hot++;
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
  hot += mDraw(g);
  hot += oDraw(g);
  hot += lDraw(g);
  hot += wDraw(g);   /* (the great works: wonders.js) */
  tDraw(g);
  ducksDraw(g);
  peasantsDraw(g);
  mDrawOver(g);
  oDrawOver(g);
  lDrawOver(g);
  wDrawOver(g);
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
function drawThermal(g, X0, X1) {
  var m = g.m, px = g.px, T = g.T, sh = g.sh, i, v, k, x, y, gw = g.gw;
  if (X0 == null) { X0 = 0; X1 = gw; }
  for (y = 0; y < g.gh; y++) for (i = y * gw + X0; i < y * gw + X1; i++) {
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
  var PW = VIEW_GW * CELL, PH = PLAY_H, cam = g.camI = clamp(g.camI || 0, 0, camMax(g));
  rct(c, 0, 0, VW, VH, "#05070c");
  var hot = drawWorld(g);
  /* (only the part in view goes up to the canvas, and only that part is stretched onto the screen) */
  var C = drawCols(g), cw = C[1] - C[0];
  g.vctx.putImageData(g.img, 0, 0, C[0], 0, cw, GH);

  /* the shaking part */
  var sx = 0, sy = 0;
  if (g.shake > 0.25) { sx = (Math.random() * 2 - 1) * g.shake; sy = (Math.random() * 2 - 1) * g.shake; }
  c.save();
  c.beginPath(); c.rect(PANEL, PLAY_Y, PW, PH); c.clip();
  c.translate(sx, sy);
  c.imageSmoothingEnabled = false;
  c.drawImage(g.vc, cam, 0, VIEW_GW, GH, PANEL, PLAY_Y, PW, PH);
  c.imageSmoothingEnabled = true;
  if (hot || g.np) {
    g.gctx.putImageData(g.gimg, 0, 0, C[0], 0, cw, GH);
    var c2 = g.gc2x, c4 = g.gc4x;
    c2.clearRect(0, 0, g.gc2.width, g.gc2.height);
    c2.drawImage(g.gc, cam, 0, VIEW_GW, GH, 0, 0, g.gc2.width, g.gc2.height);
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
  drawEdgeMarks(g, c);
  drawCursor(g, c);
  drawPanel(g, c);
  drawStrip(g, c);
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
/* a world column, on the screen: the one conversion everything drawn over the field goes through */
function scrX(x) { return PANEL + (x - (g && g.camI || 0) + 0.5) * CELL; }
function scrY(y) { return PLAY_Y + y * CELL; }
/* is any of a bolt, its forks included, near enough the view to be seen (a margin for its glow, and the shake) */
function boltSeen(b, lo, hi) {
  var L = [b.pts].concat(b.forks), q, k;
  for (q = 0; q < L.length; q++) for (k = 0; k < L[q].length; k++) { var sx = scrX(L[q][k][0]); if (sx > lo && sx < hi) return true; }
  return false;
}
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
  var vx0 = PANEL - 12, vx1 = VW + 12;   /* (anything wholly out of view along the valley is not drawn) */
  if (g.fwGlow && scrX(g.fwGlow.x) + 90 > PANEL - 8 && scrX(g.fwGlow.x) - 90 < VW + 8) {
    var f = g.fwGlow, cx = scrX(f.x), cy = scrY(f.y), r = 90;
    var gr = c.createRadialGradient(cx, cy, 0, cx, cy, r);
    var col = "rgba(" + (f.c & 255) + "," + ((f.c >> 8) & 255) + "," + ((f.c >> 16) & 255) + ",";
    gr.addColorStop(0, col + (0.35 * f.t).toFixed(3) + ")"); gr.addColorStop(1, col + "0)");
    c.fillStyle = gr; c.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  for (k = 0; k < g.rings.length; k++) {
    var rg = g.rings[k], a = 1 - rg.t / 22;
    if (scrX(rg.x) + rg.r * CELL < PANEL || scrX(rg.x) - rg.r * CELL > VW) continue;
    c.strokeStyle = "rgba(255,230,190," + (a * 0.5).toFixed(3) + ")";
    c.lineWidth = 2.5 * a + 0.5;
    c.beginPath(); c.arc(scrX(rg.x), scrY(rg.y), rg.r * CELL, 0, 6.2832); c.stroke();
  }
  c.lineJoin = "round";
  for (k = 0; k < g.bolts.length; k++) {
    var b = g.bolts[k], ba = b.t * (Math.random() < 0.2 ? 0.25 : 1);
    if (!boltSeen(b, vx0, vx1)) continue;
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
  /* (a ruled line is drawn even with the pointer out past the side of the field, while the view is carried along) */
  if (!inPlay(g) && g.ax == null) return;
  var pk = curPick(g), cx = g.mx, cy = g.my;
  c.save();
  c.lineWidth = 1;
  if (g.ax != null) {
    c.beginPath(); c.rect(PANEL, PLAY_Y, VIEW_GW * CELL, PLAY_H); c.clip();
    var p = sandCell(g);
    c.strokeStyle = g.av === MAT.EMPTY ? "#ffffff" : SAND_SHADES[g.av][0];
    c.lineWidth = (g.size * 2 + 1) * CELL; c.lineCap = "round"; c.globalAlpha = 0.35;
    c.beginPath();
    c.moveTo(scrX(g.ax), PLAY_Y + (g.ay + 0.5) * CELL);
    c.lineTo(scrX(p.x), PLAY_Y + (p.y + 0.5) * CELL);
    c.stroke();
    c.globalAlpha = 1; c.lineWidth = 1;
    if (!inPlay(g)) { c.restore(); return; }
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
      var bx = scrX(h.x) - 3.5 * CELL, by = PLAY_Y + (h.y - 10) * CELL;
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
      var dx0 = scrX(dk.x) - 3.5 * CELL, dy0 = PLAY_Y + (dk.y - 5) * CELL;
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
  button(c, 4, BTN2_Y, 10, "-", false, r2 && g.mx < 14);
  txt(c, SPEED_NAMES[g.speed], 25, BTN2_Y + 9, 8, g.speed === SPEED_1 ? "#9aa6b8" : "#ffd94a", "center", true);
  button(c, 36, BTN2_Y, 10, "+", false, r2 && g.mx >= 36 && g.mx < 48);
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
  var ni = iKnown(g, true);   /* (the plain ideas: the great works are counted on their own. wonders.js) */
  /* each count is its own button: click it for a popup of the numbers behind it */
  var segs = [["peasants", "PEASANTS " + alive], ["rip", "RIP " + g.rip]];
  if (nh) segs.push(["houses", "HOUSES " + nh]);
  if (ni) segs.push(["ideas", "IDEAS " + ni + "/" + iPlain()]);
  if (g.wAny) segs.push(["wonders", "WONDERS " + wCount(g) + "/" + W_TOTAL]);
  if (nd) segs.push(["ducks", "DUCKS " + nd]);
  if (space) segs.push(["peasants", "IN SPACE " + space]);
  g.hdrHit = [];
  var hot = null;
  txt(c, (MUTED ? "M: SOUND OFF" : "M: SOUND ON"), VW - 5, 10, 7, "#8892a8", "right");
  /* SAVE and LOAD, left of the sound: a file to keep, a file to open (or drop one on the game) */
  c.font = "7px " + UI_FONT;
  var fx = VW - 5 - c.measureText("M: SOUND OFF").width - 12;
  ["LOAD", "SAVE"].forEach(function (lb) {
    c.font = "bold 7px " + UI_FONT;
    var w = c.measureText(lb).width, x0 = fx - w, over = g.my < PLAY_Y && g.mx >= x0 - 3 && g.mx < fx + 3;
    if (over) { rct(c, x0 - 3, 2, w + 6, PLAY_Y - 4, "#17202f"); hot = lb; }
    txt(c, lb, x0, 10, 7, over ? "#ffffff" : "#8892a8", "left", true);
    g.hdrHit.push({ key: lb.toLowerCase(), x0: x0 - 3, x1: fx + 3 });
    fx = x0 - 10;
  });
  /* the counts sit centred in what is left between the panel and LOAD, never under it */
  c.font = "bold 8px " + UI_FONT;
  var gap = c.measureText("     ").width, tw = -gap;
  for (k = 0; k < segs.length; k++) tw += c.measureText(segs[k][1]).width + gap;
  var right = fx + 10 - 3 - gap;
  var hx = Math.max(PANEL, PANEL + (right - PANEL - tw) / 2);
  for (k = 0; k < segs.length; k++) {
    var sw = c.measureText(segs[k][1]).width, on = g.pop === segs[k][0];
    var over = g.my < PLAY_Y && g.mx >= hx - 3 && g.mx < hx + sw + 3;
    if (over) hot = segs[k][0];
    if (on || over) rct(c, hx - 3, 2, sw + 6, PLAY_Y - 4, on ? "#2a3d5e" : "#17202f");
    txt(c, segs[k][1], hx, 10, 8, on ? "#ffd94a" : (over ? "#ffffff" : "#d8dde6"), "left", true);
    g.hdrHit.push({ key: segs[k][0], x0: hx - 3, x1: hx + sw + 3 });
    hx += sw + gap;
  }
  var handle = camMax(g) > 0 && g.mx >= PANEL && g.my >= MAP_Y;
  if (typeof cv !== "undefined" && cv && cv.style) {
    var want = g.stripDrag ? "grabbing" : (hot || feedTabAt(g, g.mx, g.my) ? "pointer" : (handle ? "grab" : "crosshair"));
    if (cv.style.cursor !== want) cv.style.cursor = want;
  }

  /* description bar */
  var info = hov >= 0 ? PICK[hov] : curPick(g), by = BAR_Y;
  rct(c, PANEL, by, VW - PANEL, BAR_H, "#0a0d16");
  rct(c, PANEL, by, VW - PANEL, 1, "#26344e");
  var hp = inPlay(g) ? peasantAt(g, g.cx, g.cy, 2) : null, line;
  var hd = inPlay(g) && !hp ? duckAt(g, g.cx, g.cy, 1) : null;
  if (hp) line = hp.name + "  " + pMood(g, hp);
  else if (hd) line = (hd.baby ? "DUCKLING" : hd.kind.name) + "  " + dMood(hd);
  else if (g.my < PLAY_Y && g.mx >= PANEL) line = iSummary(g);   /* over the header: what the village knows */
  else if (g.mx < PANEL && hov < 0) line = tipLine(g);
  else if (g.camNote > g.t) line = "G  nobody lives here. this is the middle of the valley";
  else if (g.mx >= PANEL && ((g.my >= MAP_Y && g.my < BAR_Y) || g.stripDrag)) line = "THE VALLEY  drag to look along it. swipe sideways, Shift-wheel or \u2190/\u2192. G goes home";
  else line = info.name + "  " + info.desc;
  /* what is under the cursor, and how hot it is, on the right (over the strip: what is along there) */
  var rd = inPlay(g) && !hp && !hd ? cellReadout(g, cellAt(g)) : (g.mx >= PANEL && g.my >= MAP_Y && g.my < BAR_Y ? stripReadout(g, stripCol(g, g.mx)) : "");
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
  if (p.slip > 0) return Math.abs(p.ivx || 0) > 0.05 ? "has slipped on the ice, and is still going" : "has slipped on the ice. ow";
  if (p.sleep > 0) return p.inBed ? "is asleep in bed. zzz" : "is asleep on the ground. it is not comfy";
  if (p.climb) return p.climb.lift ? (p.climb.board ? "is riding the lift" : "is waiting for the lift") : "is climbing a ladder";
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
  if (mPockets(p)) return "is going for a walk. carrying " + mPockets(p);
  if (p.ivx && Math.abs(p.ivx) > 0.05) return "is on the ice. it is slippy";
  return home ? "is going for a walk. has a house" : "is going for a walk. has no house";
}

/* -------------------------------------------------------------------
   STAT POPUPS: click a count along the top for what is behind it.
   each is a list of rows: [left, right, colour] (right may be ""), or
   a header ["#", text], or a bar ["=", left, n, of, colour]
   ------------------------------------------------------------------- */
var P_CAUSE = { starve: "hunger", old: "old age", fire: "fire", lava: "lava", drown: "drowning", acid: "acid",
  fall: "a long fall", splat: "going splat", nuke: "the nuke", drain: "the drain", buried: "being buried",
  zap: "lightning", chute: "a parachute", reentry: "re-entry", freeze: "the cold" };
/* what the other things they build are called, one and many */
var SITE_NAMES = { farm: ["field", "fields"], lamp: ["porch light", "porch lights"], post: ["street lamp", "street lamps"],
  grave: ["cross", "crosses"], scarecrow: ["scarecrow", "scarecrows"], jetty: ["jetty", "jetties"], pond: ["dug pond", "dug ponds"],
  statue: ["statue", "statues"], well: ["oil well", "oil wells"], mine: ["mine", "mines"], tunnel: ["gallery", "galleries"],
  tower: ["watchtower", "watchtowers"], furnace: ["furnace", "furnaces"], lift: ["lift", "lifts"], bell: ["bell", "bells"],
  stairs: ["flight of stairs", "flights of stairs"], ladder: ["ladder", "ladders"], bridge: ["bridge", "bridges"],
  glasshouse: ["glasshouse", "glasshouses"], snowman: ["snowman", "snowmen"] };
var POP_TITLE = { peasants: "THE VILLAGERS", rip: "IN MEMORIAM", houses: "THE BUILDINGS", ideas: "WHAT THEY KNOW", ducks: "THE DUCKS", wonders: "THE GREAT WORKS" };
/* a peasant's age in years (a year is twenty seconds, so they make seventy to ninety-five) */
function pYears(g, p) { return Math.max(0, Math.floor(pAge(g, p) / 1200)); }
function yrs(n) { return n + (n === 1 ? " year" : " years"); }
function popRows(g, key) {
  var R = [], k, p, s, n;
  if (key === "peasants") {
    var L = [], sp = 0, housed = 0, sleep = 0, hungry = 0, cold = 0, busy = 0, fire = 0, wet = 0, tot = 0, old = null, young = null;
    for (k = 0; k < g.peasants.length; k++) {
      p = g.peasants[k];
      if (p.dead) continue;
      if (p.state === "space") { sp++; continue; }
      L.push(p);
      if (bHome(g, p)) housed++;
      if (p.sleep > 0) sleep++;
      if (p.hunger > P_HUNGRY) hungry++;
      if (p.cold > 60) cold++;
      if (p.fire) fire++;
      if (p.swimming) wet++;
      if (p.task && p.task.kind !== "sleep") busy++;
      var y = pYears(g, p); tot += y;
      if (!old || y > pYears(g, old)) old = p;
      if (!young || y < pYears(g, young)) young = p;
    }
    n = L.length;
    R.push(["living", String(n), "#ffffff"]);
    if (sp) R.push(["in space, right now", String(sp), "#9ad0ff"]);
    R.push(["been to space, ever", String(g.astronauts), "#9ad0ff"]);
    if (!n) { R.push(["nobody about. throw some in", "", "#8892a8"]); return R; }
    R.push(["#", "HOW THEY ARE"]);
    R.push(["=", "with a house", housed, n, "#a8e08a"]);
    R.push(["=", "busy with something", busy, n, "#f0c060"]);
    R.push(["=", "asleep", sleep, n, "#9aa6b8"]);
    R.push(["=", "hungry", hungry, n, "#ff9a8a"]);
    if (cold) R.push(["=", "cold", cold, n, "#8ad8ff"]);
    if (wet) R.push(["=", "swimming", wet, n, "#5a9ae8"]);
    if (fire) R.push(["=", "on fire", fire, n, "#ff7a3a"]);
    R.push(["#", "AGES"]);
    R.push(["average", yrs(Math.round(tot / n)), "#ffffff"]);
    R.push(["oldest: " + pTitle(old.name), yrs(pYears(g, old)), "#c8d0dc"]);
    if (n > 1) R.push(["youngest: " + pTitle(young.name), yrs(pYears(g, young)), "#c8d0dc"]);
    var king = pKing(g), th = iThinker(g);
    if (king || th.n) R.push(["#", "NOTABLES"]);
    if (king) R.push(["the king", pTitle(king.name), "#ffd94a"]);
    if (th.n) R.push(["the great thinker", pTitle(th.name) + " (" + th.n + ")", "#ffd94a"]);
  } else if (key === "rip") {
    R.push(["died, all told", String(g.rip), "#ffffff"]);
    var cs = [], most = 0;
    for (k in g.causes) { cs.push([k, g.causes[k]]); most = Math.max(most, g.causes[k]); }
    cs.sort(function (a, b) { return b[1] - a[1]; });
    if (cs.length) {
      R.push(["#", "OF WHAT"]);
      for (k = 0; k < cs.length; k++) R.push(["=", P_CAUSE[cs[k][0]] || cs[k][0], cs[k][1], g.rip, "#ff9a8a"]);
    } else R.push(["nobody yet. how kind", "", "#8892a8"]);
    var graves = 0;
    for (k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "grave" && g.sites[k].done) graves++;
    if (graves) R.push(["crosses in the graveyard", String(graves), "#c8d0dc"]);
    if (g.dead && g.dead.length) {
      R.push(["#", "LATELY"]);
      for (k = g.dead.length - 1; k >= Math.max(0, g.dead.length - 4); k--) R.push([g.dead[k].note, "", "#c8d0dc"]);
    }
  } else if (key === "houses") {
    var hs = 0, huts = 0, stone = 0, empty = 0, rising = 0, kinds = {}, kn = [];
    for (k = 0; k < g.sites.length; k++) {
      s = g.sites[k];
      if (s.kind === "house") {
        if (!s.done) { rising++; continue; }
        if (s.hut) huts++; else hs++;
        if (s.stone) stone++;
        if (!bOwner(g, s)) empty++;
      } else if (s.done && s.kind !== "grave") kinds[s.kind] = (kinds[s.kind] || 0) + 1;   /* (graves are under RIP) */
    }
    n = hs + huts;
    R.push(["houses", String(hs), "#ffffff"]);
    if (huts) R.push(["the old huts", String(huts), "#ffffff"]);
    R.push(["=", "lived in", n - empty, n, "#a8e08a"]);
    if (stone) R.push(["=", "rebuilt in stone", stone, n, "#9aa6b8"]);
    if (rising) R.push(["going up", String(rising), "#f0c060"]);
    for (k in kinds) kn.push([k, kinds[k]]);
    kn.sort(function (a, b) { return b[1] - a[1]; });
    /* (and the snowmen, while they last: leftovers.js) */
    var men = (g.lsnowmen || []).filter(function (m) { return m.up; }).length;
    if (men) kn.push(["snowman", men]);
    if (kn.length) {
      R.push(["#", "AND ALSO"]);
      for (k = 0; k < kn.length; k++) R.push([(SITE_NAMES[kn[k][0]] || [kn[k][0], kn[k][0] + "s"])[kn[k][1] > 1 ? 1 : 0], String(kn[k][1]), "#c8d0dc"]);
    }
  } else if (key === "wonders") {
    wRows(g, R);   /* (wonders.js) */
  } else if (key === "ideas") {
    R.push(["=", "thought of", iKnown(g, true), iPlain(), "#ffd94a"]);
    R.push(["#", "KNOWN"]);
    for (k = 0; k < IDEAS.length; k++) if (g.know[IDEAS[k].id] && !IDEAS[k].wonder) R.push([IDEAS[k].name, pTitle(iShort(g.know[IDEAS[k].id])), "#ffffff"]);
    var todo = 0;
    for (k = 0; k < IDEAS.length; k++) if (!g.know[IDEAS[k].id] && !IDEAS[k].wonder) {
      if (!todo++) R.push(["#", "TO COME"]);
      var ready = g.readyT && g.readyT[IDEAS[k].id];
      R.push(["? " + IDEAS[k].hint, ready ? "on their minds" : "", ready ? "#f0c060" : "#8892a8"]);
    }
  } else if (key === "ducks") {
    var D = [], kc = {}, kl = [], baby = 0, swim = 0, fly = 0, burn = 0;
    for (k = 0; k < g.ducks.length; k++) {
      var d = g.ducks[k];
      if (d.dead) continue;
      D.push(d);
      if (d.baby) baby++;
      if (d.state === "swim") swim++;
      if (d.state === "fly") fly++;
      if (d.fire) burn++;
      if (!d.baby) kc[d.kind.name] = (kc[d.kind.name] || 0) + 1;
    }
    n = D.length;
    R.push(["ducks", String(n - baby), "#ffffff"]);
    R.push(["ducklings", String(baby), "#ffe070"]);
    if (n) {
      R.push(["#", "DOING"]);
      R.push(["=", "swimming", swim, n, "#5a9ae8"]);
      R.push(["=", "flying", fly, n, "#9ad0ff"]);
      R.push(["=", "waddling", n - swim - fly, n, "#e8c040"]);
      if (burn) R.push(["=", "on fire", burn, n, "#ff7a3a"]);
    }
    for (k in kc) kl.push([k, kc[k]]);
    kl.sort(function (a, b) { return b[1] - a[1]; });
    if (kl.length) {
      R.push(["#", "KINDS"]);
      for (k = 0; k < kl.length; k++) R.push([kl[k][0].toLowerCase() + (kl[k][1] > 1 ? "s" : ""), String(kl[k][1]), "#c8d0dc"]);
    }
    if (g.duckRip) R.push(["lost, all told", String(g.duckRip), "#ffb0a0"]);
  }
  return R;
}
function drawStatPop(g, c) {
  g.popRect = null;
  if (!g.pop) return;
  var hit = null, k;
  for (k = 0; k < g.hdrHit.length; k++) if (g.hdrHit[k].key === g.pop) { hit = g.hdrHit[k]; break; }
  if (!hit) { g.pop = null; return; }   /* (the count it hangs off has gone: no ducks, say) */
  var R = popRows(g, g.pop), LH = 9, BARW = 44, pad = 6, w = 0, h = 14 + pad, r;
  c.font = "7px " + UI_FONT;
  for (k = 0; k < R.length; k++) {
    r = R[k];
    if (r[0] === "#") { w = Math.max(w, c.measureText(r[1]).width); h += k ? LH + 3 : LH; }
    else if (r[0] === "=") { w = Math.max(w, c.measureText(r[1]).width + BARW + 40); h += LH; }
    else { w = Math.max(w, c.measureText(r[0]).width + (r[1] ? c.measureText(r[1]).width + 12 : 0)); h += LH; }
  }
  c.font = "bold 8px " + UI_FONT;
  w = Math.min(VW - PANEL - 8, Math.max(w, c.measureText(POP_TITLE[g.pop]).width + 64) + pad * 2);
  var x = clamp((hit.x0 + hit.x1) / 2 - w / 2, PANEL + 4, VW - 4 - w), y = PLAY_Y + 3, yy, xr = x + w - pad;
  g.popRect = { x: x, y: y, w: w, h: h };
  rct(c, x, y, w, h, "#080b14");
  box(c, x, y, w, h, "#3a4e72");
  rct(c, (hit.x0 + hit.x1) / 2 - 2, y - 2, 4, 2, "#3a4e72");   /* (a little tab up to the count it belongs to) */
  txt(c, POP_TITLE[g.pop], x + pad, y + 11, 8, "#ffd94a", "left", true);
  yy = y + 14 + LH - 2;
  for (k = 0; k < R.length; k++) {
    r = R[k];
    if (r[0] === "#") {
      if (k) yy += 3;
      txt(c, r[1], x + pad, yy, 6, "#56698a", "left", true);
      rct(c, x + pad + c.measureText(r[1]).width + 4, yy - 3, Math.max(0, xr - (x + pad + c.measureText(r[1]).width + 4)), 1, "#26344e");
    } else if (r[0] === "=") {
      var f = r[3] > 0 ? r[2] / r[3] : 0;
      txt(c, r[1], x + pad, yy, 7, "#c8d0dc");
      rct(c, xr - 30 - BARW, yy - 5, BARW, 5, "#1d2a42");
      if (f > 0) rct(c, xr - 30 - BARW, yy - 5, Math.max(1, Math.round(BARW * f)), 5, r[4]);
      txt(c, r[2] + "/" + r[3], xr, yy, 7, "#ffffff", "right", true);
    } else {
      var left = r[0];
      c.font = "7px " + UI_FONT;
      var room = w - pad * 2 - (r[1] ? c.measureText(r[1]).width + 12 : 0);
      if (c.measureText(left).width > room) { while (left.length > 4 && c.measureText(left + "...").width > room) left = left.slice(0, -1); left += "..."; }
      txt(c, left, x + pad, yy, 7, r[2]);
      if (r[1]) txt(c, r[1], xr, yy, 7, "#ffffff", "right", true);
    }
    yy += LH;
  }
  txt(c, "click to close", xr, y + 11, 6, "#56698a", "right");
}

function drawOverlays(g, c) {
  var cx = PANEL + (VW - PANEL) / 2, k;
  /* the news, top right. a line about somewhere out of view has an arrow on it: click it to go there */
  c.font = "bold 7px " + UI_FONT;
  g.feedHit = [];
  for (k = 0; k < g.feed.length; k++) {
    var f = g.feed[k], a = Math.min(1, (7 - f.t) / 0.8, f.t * 6), yy = PLAY_Y + 5 + k * 10;
    var side = feedSide(g, f), ft = f.text, w = c.measureText(ft).width + 8;
    /* (a line with an arrow keeps room for it in the field: a long one is cut short) */
    if (side && w > VW - PANEL - 24) {
      while (ft.length > 8 && c.measureText(ft + "...").width + 8 > VW - PANEL - 24) ft = ft.slice(0, -1);
      ft += "..."; w = c.measureText(ft).width + 8;
    }
    c.globalAlpha = Math.max(0, a);
    rct(c, VW - 4 - w, yy, w, 9, "rgba(6,8,14,0.7)");
    txt(c, ft, VW - 8, yy + 7, 7, f.col, "right", true);
    if (side && a > 0.2) {
      var tx = VW - 4 - w - 10, over = g.mx >= tx && g.mx < tx + 9 && g.my >= yy && g.my < yy + 9;
      rct(c, tx, yy, 9, 9, over ? "#26385a" : "rgba(6,8,14,0.7)");
      box(c, tx, yy, 9, 9, over ? "#8aa6d8" : "#3a4e72");
      c.fillStyle = f.col; c.beginPath();
      if (side < 0) { c.moveTo(tx + 6, yy + 2); c.lineTo(tx + 2.5, yy + 4.5); c.lineTo(tx + 6, yy + 7); }
      else { c.moveTo(tx + 3, yy + 2); c.lineTo(tx + 6.5, yy + 4.5); c.lineTo(tx + 3, yy + 7); }
      c.closePath(); c.fill();
      g.feedHit.push({ x0: tx, y0: yy, f: f });
    }
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
  drawStatPop(g, c);
  if (g.paused) {
    rct(c, cx - 50, PLAY_Y + PLAY_H / 2 - 14, 100, 28, "rgba(0,0,0,0.75)");
    txt(c, "PAUSED", cx, PLAY_Y + PLAY_H / 2 + 1, 12, "#ffd94a", "center", true);
    txt(c, ". = ONE STEP", cx, PLAY_Y + PLAY_H / 2 + 10, 7, "#c8d0dc", "center");
  } else if (g.speed !== SPEED_1) {
    txt(c, (g.speed < SPEED_1 ? "SLOW " : "FAST ") + SPEED_NAMES[g.speed], PANEL + 6, PLAY_Y + 12, 8, "#ffd94a", "left", true);
  }
  if (g.debug) {
    var dbg = (g.fps | 0) + " fps  " + g.ms.toFixed(1) + " ms  particles " + g.np;
    txt(c, dbg, PANEL + 6, PLAY_B - 4, 7, "#7aff7a", "left", true);
  }
}

/* the colour key for thermal vision: the same stops the palette is built on, evenly spaced */
var THERM_KEY = [-100, -40, 0, 20, 37, 100, 300, 700, 1200, 2000];
function drawThermalKey(c) {
  var x0 = PANEL + 6, y0 = PLAY_B - 16, w = 180, n = THERM_KEY.length - 1, k, px;
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
/* (act: what a click on the side panel is to do, instead of what is at (x, y) there: harness.js, replaying) */
function gameTap(g, x, y, act) {
  camJournal(g);
  saveInput(g, "tap", { x: saveR(x), y: saveR(y), cell: x >= PANEL && y >= PLAY_Y ? [Math.round(g.cx), Math.round(g.cy)] : null, btn: g.btn, pick: curPick(g).name });
  g.intro = Math.max(g.intro, 4.5);
  /* the counts along the top open (and close) their popups. a click anywhere else closes it; a click on it is eaten */
  if (y < PLAY_Y && x >= PANEL) {
    for (var h = 0; h < g.hdrHit.length; h++) if (x >= g.hdrHit[h].x0 && x < g.hdrHit[h].x1) {
      if (g.hdrHit[h].key === "save") { g.pop = null; saveDownload(g); return; }
      if (g.hdrHit[h].key === "load") { g.pop = null; saveOpenFile(g); return; }
      g.pop = g.pop === g.hdrHit[h].key ? null : g.hdrHit[h].key;
      return;
    }
    g.pop = null; return;
  }
  if (g.pop) {
    var pr = g.popRect;
    g.pop = null;
    if (pr && x >= pr.x && x < pr.x + pr.w && y >= pr.y && y < pr.y + pr.h) return;
  }
  /* the strip under the field, and the bar under that: the handle you look along the valley by */
  if (x >= PANEL && y >= MAP_Y) { if (g.btn === 0) stripPress(g, x); return; }
  /* a news line's arrow: there */
  if (x >= PANEL && g.btn === 0 && feedTabAt(g, x, y)) { var ft = feedTabAt(g, x, y); camGo(g, feedX(g, ft)); g.eaten = 1; return; }   /* (and the press is used up: nothing paints till it is let go) */
  if (x >= PANEL) {
    if (!inPlay(g)) return;
    if (g.btn === 1 || g.keys.alt) { sandEyedrop(g); return; }
    /* (in a wide valley the stroke, painting or erasing, is anchored at the press itself: a hand that is out past the edge
       before the next update still has a stroke to carry the view along with) */
    if (camMax(g) > 0 && (g.btn === 0 || g.btn === 2) && painting(g)) {
      var pc = sandCell(g);
      if (g.keys.shift) { g.ax = pc.x; g.ay = pc.y; g.av = sandBrush(g); g.lx = null; } else { g.lx = pc.x; g.ly = pc.y; }
    }
    if (g.btn !== 0) return;
    var pk = curPick(g);
    if (pk.tool === "peasant") {
      var p = peasantAt(g, g.cx, g.cy, 2);
      /* (one you made yourself is one more the valley holds: when somebody dies, somebody walks in to make it up) */
      if (!p && (p = peasantSpawn(g, clamp(g.cx, 2, g.gw - 3), clamp(g.cy + 8, 9, g.gh - 1))) && g.popGoal != null) g.popGoal++;
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
  panelDo(g, act != null ? act : panelAt(x, y));
}
/* where a news line happened, now: somebody it was about, where they are now (if they are still about); else where it was */
function feedX(g, f) {
  var k;
  if (f.pid != null) for (k = 0; k < g.peasants.length; k++) if (g.peasants[k].id === f.pid && !g.peasants[k].dead && g.peasants[k].state !== "space") return g.peasants[k].x;
  if (f.did != null) for (k = 0; k < g.ducks.length; k++) if (g.ducks[k].id === f.did && !g.ducks[k].dead) return g.ducks[k].x;
  return f.x;
}
/* which side of the view a news line's place is: -1, 1, or 0 (in view, or nowhere) */
function feedSide(g, f) {
  if (camMax(g) <= 0) return 0;
  var x = feedX(g, f);
  if (x == null) return 0;
  return x < g.camI ? -1 : (x >= g.camI + VIEW_GW ? 1 : 0);
}
/* the news line whose arrow is at (x, y), as drawn last frame */
function feedTabAt(g, x, y) {
  var H = g.feedHit || [];
  for (var k = 0; k < H.length; k++) if (x >= H[k].x0 && x < H[k].x0 + 9 && y >= H[k].y0 && y < H[k].y0 + 9)
    return g.feed.indexOf(H[k].f) >= 0 && feedX(g, H[k].f) != null ? H[k].f : null;   /* (the very line, still up, still somewhere) */
  return null;
}
/* the strip's picture of the land: rebuilt every fifteen frames (or when there is none) */
var STRIP_COL = [];
/* (the strip's ten rows are not even: the high sky, where little is, gets two, and the land and the air just over it the
   other eight, so the shape of the valley reads at a glance. stripRow: the strip row a world row is in) */
var STRIP_ROWS = [0, 40, 80, 96, 112, 126, 140, 152, 164, 175, GH];
function stripRow(y) { for (var b = 0; b < MAP_H - 1 && y >= STRIP_ROWS[b + 1]; b++); return b; }
for (var sv = 0; sv < NMAT; sv++) STRIP_COL[sv] = SAND_SHADES[sv] ? hex32(SAND_SHADES[sv][0], 1.15) : hex32("#909090");
function stripLand(g) {
  var W = STRIP_W, gw = g.gw, m = g.m, u, b, k, r, v;
  if (!g.stripC || g.stripC.width !== W) {
    g.stripC = document.createElement("canvas"); g.stripC.width = W; g.stripC.height = MAP_H;
    g.stripX = g.stripC.getContext("2d"); g.stripI = g.stripX.createImageData(W, MAP_H); g.stripP = new Uint32Array(g.stripI.data.buffer);
    g.stripN = 0;
  }
  if (g.stripN-- > 0) return;
  g.stripN = 14;
  var P = g.stripP, cnt = [0, 0, 0], val = [0, 0, 0];
  for (b = 0; b < MAP_H; b++) {
    var y0 = STRIP_ROWS[b], y1 = STRIP_ROWS[b + 1], mid = (y0 + y1) >> 1;
    var ys = [y0 + ((y1 - y0) >> 2), mid, y0 + (((y1 - y0) * 3) >> 2)];
    for (u = 0; u < W; u++) {
      var x = Math.min(gw - 1, Math.floor(u * gw / W)), best = -1, bn = 0, n = 0;
      for (k = 0; k < 3; k++) {
        v = m[ys[k] * gw + x];
        if (v === MAT.EMPTY || AIRY[v]) continue;
        for (r = 0; r < n && val[r] !== v; r++);
        if (r === n) { val[n] = v; cnt[n] = 0; n++; }
        if (++cnt[r] > bn) { bn = cnt[r]; best = val[r]; }
      }
      P[b * W + u] = best < 0 ? g.bg[mid * gw + x] : STRIP_COL[best];
    }
  }
  g.stripX.putImageData(g.stripI, 0, 0);
}
/* the whole valley, squeezed, under the field: the land, where you are looking, who is where */
function drawStrip(g, c) {
  var W = STRIP_W, gw = g.gw, k, x, y;
  stripLand(g);
  rct(c, PANEL, MAP_Y, W, MAP_H, "#000000");
  var bx = stripBox(g), wide = camMax(g) > 0;
  c.imageSmoothingEnabled = false;
  c.globalAlpha = wide ? 0.6 : 1;
  c.drawImage(g.stripC, PANEL, MAP_Y);
  c.globalAlpha = 1;
  if (wide) {
    var sx0 = Math.max(0, Math.floor(bx.x0 - PANEL)), sw = Math.min(W - sx0, Math.ceil(bx.w));
    c.drawImage(g.stripC, sx0, 0, sw, MAP_H, PANEL + sx0, MAP_Y, sw, MAP_H);
  }
  c.imageSmoothingEnabled = true;
  /* who is where */
  var blink = ((g.t * 6) | 0) & 1;
  for (k = 0; k < g.ducks.length; k++) {
    var d = g.ducks[k];
    if (d.dead) continue;
    rct(c, Math.floor(PANEL + d.x * W / gw), MAP_Y + stripRow(d.y), 1, 1, "#f4f4f4");
  }
  for (k = 0; k < g.peasants.length; k++) {
    var p = g.peasants[k];
    if (p.dead || p.state === "space") continue;
    rct(c, Math.floor(PANEL + p.x * W / gw), MAP_Y + stripRow(p.y - 4), 1, 1, p.fire && blink ? "#ff7a3a" : "#ffd94a");
  }
  /* the news, where it happened */
  for (k = 0; k < g.feed.length; k++) {
    var f = g.feed[k], fx = feedX(g, f);
    if (fx == null || !blink) continue;
    rct(c, Math.floor(PANEL + fx * W / gw), MAP_Y, 1, 3, f.col);
  }
  /* and the view */
  var hot = g.stripDrag || (g.mx >= PANEL && g.my >= MAP_Y && g.my < BAR_Y);
  box(c, Math.round(bx.x0), MAP_Y, Math.max(3, Math.round(bx.w)), MAP_H, hot && wide ? "#8aa6d8" : "#3a4e72");
  rct(c, PANEL, MAP_Y, W, 1, "#26344e");
}
/* what is along the valley at column x, for the bar: somebody, something of theirs, a lake, or nothing much */
function stripReadout(g, x) {
  var k, best = null, bd = 4.5;
  for (k = 0; k < g.peasants.length; k++) {
    var p = g.peasants[k];
    if (p.dead || p.state === "space") continue;
    if (Math.abs(p.x - x) < bd) { bd = Math.abs(p.x - x); best = p; }
  }
  if (best) return best.name;
  for (k = 0; k < g.sites.length; k++) { var s = g.sites[k]; if (s.done && s.x0 != null && x >= s.x0 - 1 && x <= s.x1 + 1) return bLabel(s); }
  var xi = clamp(Math.floor(x), 0, g.gw - 1), y;
  for (y = 0; y < g.gh && AIRY[g.m[y * g.gw + xi]]; y++);
  if (y < g.gh) { var v = g.m[y * g.gw + xi]; if (v === MAT.WATER) return "a lake"; if (v === MAT.SALTWATER) return "salt water"; if (v === MAT.LAVA) return "lava"; }
  return "";
}
/* somebody out of view: a little arrow at that edge of the field, at their height */
function drawEdgeMarks(g, c) {
  if (camMax(g) <= 0 || g.down) return;
  var L = null, R = null, ld = 1e9, rd = 1e9, k;
  for (k = 0; k < g.peasants.length; k++) {
    var p = g.peasants[k];
    if (p.dead || p.state === "space") continue;
    if (p.x < g.camI && g.camI - p.x < ld) { ld = g.camI - p.x; L = p; }
    else if (p.x >= g.camI + VIEW_GW && p.x - g.camI - VIEW_GW < rd) { rd = p.x - g.camI - VIEW_GW; R = p; }
  }
  c.save();
  c.globalAlpha = 0.6;
  [[L, -1], [R, 1]].forEach(function (e) {
    if (!e[0]) return;
    var y = clamp(PLAY_Y + (e[0].y - 4) * CELL, PLAY_Y + 3, PLAY_B - 8), x = e[1] < 0 ? PANEL + 2 : VW - 5;
    c.beginPath();
    if (e[1] < 0) { c.moveTo(x + 3, y); c.lineTo(x, y + 2.5); c.lineTo(x + 3, y + 5); }
    else { c.moveTo(x, y); c.lineTo(x + 3, y + 2.5); c.lineTo(x, y + 5); }
    c.closePath();
    c.strokeStyle = "#05070c"; c.lineWidth = 2; c.stroke();
    c.fillStyle = "#ffd94a"; c.fill();
  });
  c.restore();
}
/* the strip: strip pixel u (0 .. 543) is world column u * gw / 544 */
var STRIP_W = VW - PANEL;
function stripCol(g, x) { return (x - PANEL) * g.gw / STRIP_W; }
function stripBox(g) { return { x0: PANEL + g.camX * STRIP_W / g.gw, w: VIEW_GW * STRIP_W / g.gw }; }
function stripPress(g, x) {
  if (camMax(g) <= 0) return;
  var b = stripBox(g), off;
  if (x >= b.x0 && x < b.x0 + b.w) off = x - b.x0;   /* (the box, taken hold of where you took it) */
  else { camGo(g, stripCol(g, x), true); off = x - stripBox(g).x0; }   /* (somewhere else: there, at once. held where the box is now, ends and all) */
  g.stripDrag = { off: off };
}
function stripMove(g, last) {
  if (!g.stripDrag) return;
  if (!g.down && !last) { g.stripDrag = null; camJournal(g); return; }
  g.camX = g.camT = clamp((g.mx - PANEL - g.stripDrag.off) * g.gw / STRIP_W, 0, camMax(g));
  g.camI = Math.round(g.camX);
}
function gameSpeed(g, d) { g.speed = clamp(g.speed + d, 0, SPEEDS.length - 1); g.speedAcc = 0; }
/* a wheel event, either way: sideways looks along the valley, up and down is what it always was (camWheelGesture) */
function gameWheelXY(g, dx, dy, mode, shift, now, scale) {
  var d = camWheelGesture(g, dx || 0, dy || 0, mode || 0, !!shift, now, scale || 1);
  if (d) gameWheel(g, d);
}
function gameWheel(g, d) {
  camJournal(g);
  saveInput(g, "wheel", { d: d });
  if (g.mx < PANEL) { var n = PICK.length; g.sel = (g.sel + n + d) % n; }   /* over the list: scroll the list */
  else g.size = clamp(g.size - d, 1, SAND_MAXSIZE);
}
function gameKey(g, k) {
  camJournal(g);
  saveInput(g, "key", { k: k });
  var n = PICK.length, i;
  for (i = 0; i < n; i++) if (PICK[i].key && PICK[i].key.toLowerCase() === k) { g.sel = i; return; }
  if (k === "arrowup") g.sel = (g.sel + n - 1) % n;
  else if (k === "arrowdown") g.sel = (g.sel + 1) % n;
  else if (k === "[" || k === "-") g.size = clamp(g.size - 1, 1, SAND_MAXSIZE);
  else if (k === "]" || k === "=" || k === "+") g.size = clamp(g.size + 1, 1, SAND_MAXSIZE);
  else if (k === " " || k === "p") g.paused = g.paused ? 0 : 1;
  else if (k === "s") gameSpeed(g, -1);
  else if (k === "a") gameSpeed(g, 1);
  else if (k === "c") sandClear(g);
  else if (k === ".") { if (g.paused) { sandStep(g); partStep(g); peasantsStep(g); ducksStep(g); } }
  else if (k === "r") gameNew(g);
  /* looking along the valley: Shift and an arrow is a screen at a time (held, they glide: camStep), Home and End the
     ends of it, G the village */
  else if ((k === "arrowleft" || k === "arrowright") && g.keys.shift) { camJournal(g); camNudge(g, (k === "arrowleft" ? -1 : 1) * (VIEW_GW - 32)); }
  else if (k === "home") g.camT = 0;
  else if (k === "end") g.camT = camMax(g);
  else if (k === "g") { if (!camHome(g, false)) g.camNote = g.t + 2; }
  else if (k === "`") g.debug = !g.debug;
  else if (k === "t") g.thermal = !g.thermal;
  else if (k === "b") g.hush = !g.hush;   /* speech bubbles off (and on again) */
}

/* -------------------------------------------------------------------
   8. THE SHELL: canvas, loop, events
   ------------------------------------------------------------------- */
var cv, ctx, vig, g, last = 0, acc = 0;

function newGame() {
  return { t: 0, mx: VW / 2, my: PLAY_Y + PLAY_H / 2, down: 0, btn: 0, keys: {}, frame: 0, fps: 60, ms: 0, debug: false,
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
    try { gameUpdate(g, 1 / 60); } catch (e) { console.error(e); saveError(g, e, "update"); }
  }
  if (acc > 1 / 30) acc = 0;
  try { gameDrawSide(g, ctx); } catch (e) { txt(ctx, "it fell over: " + e.message, PANEL + 10, 40, 10, "#f66"); console.error(e); saveError(g, e, "draw"); }
  drawChrome();
  g.ms = lerp(g.ms, performance.now() - t0, 0.1);
}

/* the picture rolls its own dice (rng.js), never the village's */
var gameDrawSide = rngSide(gameDraw), sandSoundsSide = rngSide(sandSounds0);

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
    /* ctrl/cmd-S keeps the village in a file, ctrl/cmd-O opens one */
    if ((e.metaKey || e.ctrlKey) && !e.repeat && (e.key === "s" || e.key === "o")) {
      e.preventDefault();
      if (e.key === "s") saveDownload(g); else saveOpenFile(g);
      return;
    }
    if (e.metaKey || e.ctrlKey) return;
    var k = e.key.toLowerCase();
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright", "home", "end"].indexOf(k) >= 0) e.preventDefault();
    g.keys.shift = e.shiftKey ? 1 : 0;
    g.keys.alt = e.altKey ? 1 : 0;
    /* (held keys do not repeat, but Shift-←/→ pages on, a screen at a time, for as long as it is held) */
    if (g.keys[k] && !(e.shiftKey && (k === "arrowleft" || k === "arrowright"))) return;
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
    g.cx = g.pcx = (g.mx - PANEL) / CELL + (g.camI || 0); g.cy = g.pcy = (g.my - PLAY_Y) / CELL;
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
    if (!e.deltaY && !e.deltaX) return;
    e.preventDefault();
    var r = cv.getBoundingClientRect();
    gameWheelXY(g, e.deltaX, e.deltaY, e.deltaMode, e.shiftKey, performance.now(), r.width ? VW / r.width : 1);
  }, { passive: false });
}

/* where the cursor has been lately, so a throw uses the flick, not the last tick */
function cursorSample(g) {
  var s = g.samp, t = performance.now();
  /* (in the screen's cells, not the world's, on purpose: a throw is as hard as the flick, even if the view has been
     carried along at the edge meanwhile) */
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
  /* the save journal is for a real browser; the harness keeps its own */
  if (typeof HTMLCanvasElement !== "undefined") saveJournalStart(g);
  saveDropInit(function () { return g; });
  requestAnimationFrame(frame);
}

window.PLEASAND = { game: function () { return g; } };

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
