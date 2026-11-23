/* =====================================================================
   PLEASAND  --  storeys.js

   a crowded valley, and what they do about it (docs/storeys-plan.md).
   with nowhere left on the ground for a house, and squared stone to
   think with, somebody sleeping rough thinks of building on top of a
   house instead: STOREYS. the gable comes off, and a floor goes up in
   its place, with its own door at one end, its own outside ladder up
   to it, its own bed, a window, and its own household. any house bears
   one; a stone house and a stone storey bear a second, its ladder up
   the other end. nothing bears a fourth.

   a storey is a site of kind "storey" on top of a finished house (its
   base), or on top of another storey. it is a home like a house is,
   but it is not a house: it is not counted against the houses there
   is room for, and nothing that looks for a house on the ground finds
   it. a house and the storeys on it is a stack.

   nothing in here rolls a die, or changes anything, in a village that
   has not thought of storeys: a plain village is master's.
   ===================================================================== */
"use strict";

var S_ROWS = 11;                 /* a floor, floor to floor */
var S_MAX = 3;                   /* floors in a stack, the house among them */
var S_UP = 2;                    /* storeys going up at once over the valley */
var S_STONY = 0.8;               /* the share of a floor's boards that must be stone, for it to bear another floor */
var S_CROWD_T = 6000;            /* how lately a house plot must have been looked for and not found */

P_SAY.idea_storey = ["what if we built on TOP of the houses?", "up. the only way is up", "there's room on the roofs",
  "a house on a house! why not"];
P_SAY.planStorey = ["a flat! upstairs!", "the roof's coming off, sorry", "room at the top", "up we go", "mind your heads down there"];
P_SAY.storeyHome = ["room with a view", "my own front door. up a ladder", "home sweet flat", "i can see the pond from here"];
P_SAY.noBear = ["a board floor won't take another floor on top", "three's enough. any higher and the ducks nest in it"];
P_ACHIEVE.upstairs = ["UPSTAIRS", "a house on top of a house. there was room up there all along"];
P_ACHIEVE.threeup = ["THREE UP", "three floors, three households, two ladders. a town house"];

IDEAS.push({ id: "storey", fresh: true, name: "the upper storey", title: "STOREYS",
  sub: "no room left on the ground. there is always room on top",
  hint: "a night on the ground, with nowhere left for a house, and squared stone",
  ready: function (g) { return sReady(g); } });

/* -------------------------------------------------------------------
   STACKS
   ------------------------------------------------------------------- */
function sDwelling(s) { return !!s && (s.kind === "house" || s.kind === "storey"); }
/* the storey on top of site s, if there is one */
function sOver(g, s) {
  for (var k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "storey" && g.sites[k].base === s.id) return g.sites[k];
  return null;
}
/* the house at the foot of s's stack (s itself, if it is one) */
function sHouseOf(g, s) {
  for (var n = 0; s && s.kind === "storey" && n < 8; n++) s = bSite(g, s.base);
  return s && s.kind === "house" ? s : null;
}
/* the floors of the stack on house h, from the ground up */
function sStack(g, h) {
  var out = [h], s = h;
  for (var n = 0; n < 8 && (s = sOver(g, s)); n++) out.push(s);
  return out;
}
/* is site s, to all intents, stone: most of its walls, floor and roof in brick, where they are */
function sStony(g, s) {
  var n = 0, b = 0;
  for (var k = 0; k < s.plan.length; k++) {
    var e = s.plan[k];
    if ((e.v !== MAT.PLANK && e.v !== MAT.BRICK) || e.a === 1) continue;
    n++;
    if (g.m[e.i] === MAT.BRICK) b++;
  }
  return n > 0 && b >= n * S_STONY;
}
/* could the stack on house h take another floor: by what its floors are made of, and how many there are already */
function sBears(g, h) {
  var st = sStack(g, h);
  if (st.length >= S_MAX) return false;
  if (st.length === 1) return true;
  for (var k = 0; k < st.length; k++) if (!sStony(g, st[k])) return false;
  return true;
}
/* is the village crowded: somebody alive with no home and nothing going up for them, and no more room for a house,
   or none found lately */
function sHomeless(g) {
  var n = 0;
  for (var k = 0; k < g.peasants.length; k++) {
    var q = g.peasants[k];
    if (!q.dead && q.state !== "space" && !sHasHome(g, q) && !bOwnsSite(g, q)) n++;
  }
  return n;
}
/* (bHome, without bHome's tidying of a home that is gone: a village that has not thought of storeys is as on master) */
function sHasHome(g, p) { var s = p.home && bSite(g, p.home); return !!(s && s.owner === p.id); }
function sCrowded(g) {
  if (!sHomeless(g)) return false;
  return bHouses(g) >= Math.min(B_HOUSES, bAlive(g)) || (g.noPlotT != null && g.tick - g.noPlotT < S_CROWD_T);
}
function sReady(g) {
  if (!g.know.masonry || !sCrowded(g)) return false;
  for (var k = 0; k < g.sites.length; k++) { var s = g.sites[k]; if (s.kind === "house" && s.done && !s.hut) return true; }
  return false;
}
/* now and then, once they know masonry: is there a plot for a house anywhere near somebody who has no home. if there is
   none, the village is crowded (g.noPlotT), whether or not anybody has the wood to try. nothing rolled, nothing changed but
   that (bPlot looks and does not touch) */
function sPlotCheck(g) {
  var p = null, k, d, sd;
  for (k = 0; k < g.peasants.length && !p; k++) { var q = g.peasants[k]; if (!q.dead && q.state === "walk" && !sHasHome(g, q) && !bOwnsSite(g, q)) p = q; }
  if (!p || bHouses(g) >= Math.min(B_HOUSES, bAlive(g))) return;
  var fx = Math.floor(p.x), fy = Math.floor(p.y);
  for (d = 0; d <= 70; d++) for (sd = -1; sd <= 1; sd += 2) if (bPlot(g, fx + d * sd - 5, fy)) return;
  g.noPlotT = g.tick;
}
/* the bell hangs on a house's ridge: that house is the bell's (mines.js mPlanBell) */
function sBelled(g, h) {
  for (var k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "bell" && g.sites[k].on === h.id) return true;
  return false;
}
function sGoingUp(g) {
  var n = 0;
  for (var k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "storey" && !g.sites[k].done) n++;
  return n;
}

/* -------------------------------------------------------------------
   A STOREY: on top of floor T (a house, or a storey) of the stack on
   house H, its door and its ladder at end d (+1: x1, -1: x0)
   ------------------------------------------------------------------- */
var S_WHY = "";   /* (why the last storey planned would not do: for whoever is debugging it) */
function sWhy(w) { S_WHY = w; return null; }
function sPlan(g, H, T, d, n) {
  var gw = g.gw, x0 = H.x0, x1 = H.x0 + 10, Fs = T.F - S_ROWS, x, y, k, c, e, i;
  if (Fs - 15 < 10) return sWhy("1");
  /* what of T comes off: its gable, over its ceiling */
  var gable = {}, strip = [];
  for (k = 0; k < T.plan.length; k++) { e = T.plan[k]; if (((e.i / gw) | 0) < Fs && e.v !== MAT.EMPTY) gable[e.i] = 1; }
  /* the ladder: three columns against the end wall, from the ground up to the storey's floor */
  var cx = d > 0 ? x1 + 2 : x0 - 2, xl = cx - 1;
  if (xl < 2 || cx + 1 > gw - 3) return sWhy("2");
  var fy = -1;
  for (y = Fs + 1; y < g.gh - 1; y++) if (pSolid(g, cx, y + 1)) { fy = y; break; }
  if (fy < 0 || fy - Fs > 30 || fy < H.F - 1) return sWhy("3");
  /* (lanterns hung on the ladder's columns come down first) */
  var lamps = [];
  for (k = 0; k < g.sites.length; k++) {
    var L = g.sites[k];
    if (L.kind !== "lamp") continue;
    for (var j = 0; j < L.plan.length; j++) { x = L.plan[j].i % gw; y = (L.plan[j].i / gw) | 0; if (x >= xl && x <= cx + 1 && y >= Fs && y <= fy) { lamps.push(L); break; } }
  }
  var lampCell = {};
  lamps.forEach(function (L) { L.plan.forEach(function (q) { lampCell[q.i] = 1; }); });
  for (x = xl; x <= cx + 1; x++) for (y = Fs; y <= fy; y++) {
    i = y * gw + x; c = g.m[i];
    if (lampCell[i]) continue;
    if (bMarked(g, x, y)) return sWhy("4");
    if (!AIRY[c] && !B_DIG[c] && c !== MAT.LINEN) return sWhy("5");   /* (a washing line in the way is cut: sCommit) */
    if (HOT[c] || LIQUID[c]) return sWhy("6");
  }
  /* (and nothing of anybody else's just outside it, to step off onto halfway up) */
  var xo = cx + 2 * d;
  for (y = Fs - 10; y <= fy; y++) if (bMarked(g, xo, y) && !lampCell[y * gw + xo]) return sWhy("7");
  /* the room, its roof, and the air over it: open, or loose, or T's gable */
  var dig = [];
  for (y = Fs - 15; y <= Fs - 1; y++) for (x = x0 - 1; x <= x1 + 1; x++) {
    if (x >= xl && x <= cx + 1) continue;
    i = y * gw + x; c = pCell(g, x, y);
    if (gable[i] || lampCell[i]) continue;
    if (LIQUID[c] || HOT[c] || c === MAT.DRAIN || P_BANG[c]) return sWhy("8");
    if (bMarked(g, x, y)) return sWhy("9");
    if (AIRY[c]) continue;
    if (!B_DIG[c] || x < x0 || x > x1 || y < Fs - 14) return sWhy("10");
    dig.push([x, y]);
  }
  var W = g.know.masonry && bStoneToHand(g) >= 30 ? MAT.BRICK : MAT.PLANK;
  var plan = [];
  /* 0: the gable off, the lanterns down, the loose stuff out, top down */
  for (k = 0; k < T.plan.length; k++) if (gable[T.plan[k].i] && !AIRY[g.m[T.plan[k].i]]) strip.push(T.plan[k].i);
  for (i in lampCell) if (!AIRY[g.m[+i]]) strip.push(+i);
  strip.sort(function (a, b) { return a - b; });
  for (k = 0; k < strip.length; k++) { e = bE(g, strip[k] % gw, (strip[k] / gw) | 0, MAT.EMPTY, 0); e.strip = true; plan.push(e); }
  dig.sort(function (a, b) { return a[1] - b[1]; });
  for (k = 0; k < dig.length; k++) plan.push(bE(g, dig[k][0], dig[k][1], MAT.EMPTY, 0));
  /* 1: the ladder, a rung at a time from the ground up */
  for (y = fy; y >= Fs; y--) for (k = 0; k < 3; k++) plan.push(bE(g, xl + k, y, MAT.LADDER, 10 + fy - y, k));
  /* 2: the walls: the door at the ladder's end, the window in the other, from the floor up */
  var xd = d > 0 ? x1 : x0, xf = d > 0 ? x0 : x1, pane = sPane(g);
  for (y = Fs - 1; y >= Fs - 10; y--) {
    if (y >= Fs - 9) plan.push(bE(g, xd, y, MAT.DOOR, 200, Math.min(9, y - (Fs - 9) + 1)));
    else plan.push(bE(g, xd, y, W, 200));
    if (y === Fs - 5) plan.push(pane ? bE(g, xf, y, MAT.GLASS, 200) : bE(g, xf, y, MAT.PLANK, 200, 1));
    else plan.push(bE(g, xf, y, W, 200));
  }
  /* 3: the ceiling, in from both ends, and the roof, with a window in the gable as a house's has */
  for (k = 0; k <= 5; k++) { plan.push(bE(g, x0 + k, Fs - 11, W, 201)); if (k < 5) plan.push(bE(g, x1 - k, Fs - 11, W, 201)); }
  for (x = x0 + 1; x <= x1 - 1; x++) plan.push(x === x0 + 5 ? bE(g, x, Fs - 12, MAT.PLANK, 202, 1) : bE(g, x, Fs - 12, W, 202));
  for (x = x0 + 3; x <= x1 - 3; x++) plan.push(x === x0 + 5 ? bE(g, x, Fs - 13, MAT.PLANK, 202, 1) : bE(g, x, Fs - 13, W, 202));
  plan.push(bE(g, x0 + 5, Fs - 14, W, 202));
  /* 4: the bed */
  /* (on the door's side of the room: the far side is kept clear, for a hatch up to a roof garden one day) */
  var bx0 = d > 0 ? x0 + 6 : x0 + 2;
  for (k = 0; k < 3; k++) { e = bE(g, bx0 + k, Fs - 1, MAT.BED, 203, 0); e.pillow = k === 2; plan.push(e); }   /* (its blanket: sCommit) */
  var win = [(Fs - 12) * gw + x0 + 5, (Fs - 13) * gw + x0 + 5, (Fs - 5) * gw + xf];
  return { plan: plan, box: [Math.min(x0, xl), Fs - 14, Math.max(x1, cx + 1), fy], gable: gable, lamps: lamps,
           extra: { F: Fs, ix0: x0 + 1, ix1: x1 - 1, iy0: Fs - 10, bed: { x: bx0 + 1, y: Fs - 1 }, win: win, stone: W === MAT.BRICK,
                    base: T.id, house: H.id, d: d, lad: cx, floor: n, fy: fy, hx0: x0 } };
}
/* is there a pane of glass to hand, for a window */
function sPane(g) {
  for (var k = 0; k < g.peasants.length; k++) if (!g.peasants[k].dead && (g.peasants[k].glass || 0) >= 1) return true;
  return false;
}
/* somebody homeless, crowded out, with the wood for it: a storey on the nearest stack that will take one. true if they
   started one (or joined one: the one going up nearest) */
function sTry(g, p) {
  if (!g.know.storey || p.planCD || bHome(g, p) || bOwnsSite(g, p) || !sCrowded(g)) return false;
  if (bWood(p) < 2 || sGoingUp(g) >= S_UP || bOpenCount(g) >= B_OPEN) return false;   /* (logs or boards: the rest, the others bring) */
  var H = [], k, s;
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if (s.kind !== "house" || s.hut || sBelled(g, s)) continue;
    H.push({ h: s, d: Math.abs(s.cx - p.x), n: sStack(g, s).length });
  }
  H.sort(function (a, b) { return a.d - b.d || a.n - b.n; });
  for (k = 0; k < H.length; k++) {
    var st = sStack(g, H[k].h), T = st[st.length - 1];
    if (!T.done || T.repair || bBurning(g, T)) continue;
    if (!sBears(g, H[k].h)) { if (k === 0 && p.sayT <= 0 && wRand(g) < 0.2) pSay(g, p, "noBear"); continue; }
    if (st.some(function (f) { return !f.done || f.repair; })) continue;
    /* (the first storey's ladder at whichever end will do, the right if both; the second's at the other) */
    var ds = st.length === 1 ? [1, -1] : [-st[1].d];
    for (var j = 0; j < ds.length; j++) {
      var r = sPlan(g, H[k].h, T, ds[j], st.length + 1);
      if (!r) continue;
      sCommit(g, p, H[k].h, T, r);
      return true;
    }
  }
  p.planCD = 2400; g.noStoreyT = g.tick;
  return false;
}
/* is anything of site s on fire */
function bBurning(g, s) {
  for (var y = s.y0; y <= s.y1; y++) for (var x = s.x0; x <= s.x1; x++) { var c = pCell(g, x, y); if (c === MAT.FIRE || c === MAT.EMBER) return true; }
  return false;
}
function sCommit(g, p, H, T, r) {
  /* T gives up its gable: it is the new storey's to take off, and T's box stops at its ceiling */
  bMark(g, T, 0);
  r.extra.was = { plan: T.plan.filter(function (e) { return r.gable[e.i]; }), win: (T.win || []).slice(), y0: T.y0 };   /* (to put back, if it is given up: sUnplan) */
  T.plan = T.plan.filter(function (e) { return !r.gable[e.i]; });
  T.win = (T.win || []).filter(function (w) { return !r.gable[w]; });
  T.y0 = T.F - S_ROWS;
  sKeepClear(g, T);
  bMark(g, T, 1);
  /* (a washing line across where the ladder goes: cut, and taken in) */
  var on = {};
  r.plan.forEach(function (e) { on[e.i] = 1; });
  for (var q = (g.lines || []).length - 1; q >= 0; q--) {
    var ln = g.lines[q];
    if (!ln.cells.some(function (i) { return on[i]; })) continue;
    ln.cells.concat(ln.wash).forEach(function (i) { if (g.m[i] === MAT.LINEN) heatVacate(g, i); });
    g.lines.splice(q, 1);
  }
  /* and the lanterns in the ladder's way are taken down with it */
  for (var k = g.sites.length - 1; k >= 0; k--) if (r.lamps.indexOf(g.sites[k]) >= 0) bRemove(g, k);
  /* (the blanket, picked now it is going up: a plan only looked at, sAnyHome's, rolls nothing) */
  var blanket = Math.floor(wRand(g) * 5), sh = 6 * Math.floor(wRand(g) * 42);
  r.plan.forEach(function (e) { if (e.v === MAT.BED) { e.sh = (e.pillow ? 5 : blanket) + sh; delete e.pillow; } });
  var s = bNew(g, "storey", p, r.plan, r.box, r.extra);
  s.cx = H.x0 + 5.5; s.overWho = H.who || "";
  feed(g, p.name + " is building a flat over " + bLabel(H), "#a8e08a", "plan" + s.id);
  pSay(g, p, "planStorey", true);
  bJoin(g, p, s);
  return s;
}
/* floor T has a ceiling that stays now, whatever burns under it: what fills its room (the ash of its own walls, a drift
   of sand) has nowhere to go, and anybody who walks into it deep is buried. so its room is kept clear, as a mine's
   shaft is (bInspect's silt: a few cells in, and the village clears it out) */
function sKeepClear(g, T) {
  var have = {}, x, y, e;
  T.plan.forEach(function (q) { have[q.i] = 1; });
  for (y = T.iy0; y <= T.F - 1; y++) for (x = T.ix0; x <= T.ix1; x++) {
    var i = y * g.gw + x;
    if (have[i] || g.m[i] === MAT.BED) continue;
    e = bE(g, x, y, MAT.EMPTY, -1); e.clear = true; T.plan.push(e);
  }
}
/* a cell of the plan that is to come out: out, and into the builder's pocket */
function sStrip(g, s, e, p) {
  var c = g.m[e.i];
  if (AIRY[c]) { e.gone = true; return; }   /* (out already: burnt, say) */
  if (c === MAT.FIRE || c === MAT.EMBER) return;
  if (c === MAT.BRICK) p.stone = (p.stone || 0) + 0.5;
  else if (WOODY[c] || c === MAT.LAMP) p.boards = (p.boards || 0) + 1;
  else if (c === MAT.GLASS) p.glass = (p.glass || 0) + 1;
  else if (c === MAT.GOLD) p.gold = (p.gold || 0) + 0.2;
  heatVacate(g, e.i);
  e.gone = true;
  s.last = g.tick;
  g.fx.thud++;
  pChips(g, e.i % g.gw + 0.5, ((e.i / g.gw) | 0) + 0.5, 3, [SAND_PAL[MAT.PLANK][0], SAND_PAL[MAT.PLANK][40]]);
}

/* finished: it is somebody's home */
function sFinish(g, s, p) {
  var o = bOwner(g, s), H = sHouseOf(g, s);
  feed(g, (s.who ? pTitle(s.who) : "the village") + " has a flat over " + (H ? bLabel(H) : "a house") + " now", "#a8e08a", "plan" + s.id);
  achieve(g, "upstairs");
  if (s.floor >= 3) achieve(g, "threeup");
  if (o) { o.home = s.id; pSay(g, o, "storeyHome", true); }
  sWarming(g, s);
}
/* for the readout: which floor of how many, or how many are over a house (or why none will be) */
function sNote(g, s) {
  var H = s.kind === "storey" ? sHouseOf(g, s) : (s.kind === "house" && !s.hut ? s : null);
  if (!H) return "";
  var st = sStack(g, H), n = st.indexOf(s) + 1;
  if (s.kind === "storey") return " (FLOOR " + n + " OF " + st.length + ")";
  if (st.length > 1) return " (AND " + (st.length - 1) + (st.length > 2 ? " FLOORS" : " FLOOR") + " OVER IT)";
  if (sBelled(g, H)) return " (THE BELL'S HOUSE: IT WON'T TAKE ANOTHER FLOOR)";
  return "";
}
function sLabel(s) {
  return (s.who ? pTitle(s.who) + "'s flat" : "the empty flat") + (s.overWho ? " over " + pTitle(s.overWho) + "'s house" : "");
}

/* -------------------------------------------------------------------
   THE GOINGS ON: every 30 ticks, from buildStep. a storey whose floor
   below has gone goes with it
   ------------------------------------------------------------------- */
/* a flat's window planned in glass, when there is no pane anywhere to hand any more: a shutter, then, as a house's has.
   (a flat waiting on a pane that is never coming waits for ever, and the wall over it with it) */
function sNoPane(g) {
  if (sPane(g)) return;
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (s.kind !== "storey" || s.done) continue;
    for (var j = 0; j < s.plan.length; j++) { var e = s.plan[j]; if (e.v === MAT.GLASS && !bOk(g, e)) { e.v = MAT.PLANK; e.a = 1; } }
  }
}
function sStep(g) {
  if (g.know.masonry && g.tick % 1200 === 0) sPlotCheck(g);   /* (crowded? storeys can only come of it once they know masonry) */
  if (!g.know.storey) return;
  sChatter(g);
  sNoPane(g);
  sComings(g);
  sLetters(g);
  sRoofLook(g);
  if (g.tick % 600 === 0) { sRoofStep(g); sLines(g); }
  for (var k = g.sites.length - 1; k >= 0; k--) {
    var s = g.sites[k];
    if (s.kind !== "storey" || bSite(g, s.base)) continue;
    var o = bOwner(g, s);
    feed(g, sLabel(s).charAt(0).toUpperCase() + sLabel(s).slice(1) + " went with it", "#ff9a8a", "fix" + s.id);
    if (o) { o.home = 0; pSay(g, o, "lostHome", true); }
    bGiveBack(s, bNearestLiving(g, s));
    bRemove(g, k);
    k = Math.min(k, g.sites.length);   /* (the floors over it go the same way, the next time round) */
  }
}

/* -------------------------------------------------------------------
   LIVING IN IT: neighbours, a housewarming, water out of the door,
   and fire
   ------------------------------------------------------------------- */
P_SAY.neighbour = ["do you have to stomp?", "is that you snoring?", "evening, neighbour", "who's cooking up there",
  "keep it down!", "was that you or the ducks?"];
P_SAY.passing = ["just passing!", "don't mind me", "morning!"];
P_SAY.passed = ["i can see you, you know", "knock first!", "it's a window, not a door"];
P_SAY.warming = ["lovely", "bit small", "you can see my house from here", "cosy", "mind the ladder", "where do we put the presents"];
P_SAY.gardyloo = ["GARDYLOO!", "LOOK OUT BELOW!", "mind your heads!"];
P_SAY.oi = ["OI", "OI!", "i'm WET", "every time"];
P_ACHIEVE.gardyloo = ["GARDYLOO", "water out of an upstairs door. look out below"];

/* the floor of the stack (or the house) that p is indoors in, if any, by any floor of it on fire */
function sBurningStackOf(g, s, p) {
  var H = sHouseOf(g, s);
  if (!H) return null;
  var st = sStack(g, H);
  for (var k = 0; k < st.length; k++) if (st[k].done && bInside(st[k], p)) return st[k];
  return null;
}
/* the floor below s and the one over it */
function sNeighbours(g, s) {
  var out = [], b = bSite(g, s.base), o = sOver(g, s);
  if (b) out.push(b);
  if (o) out.push(o);
  return out;
}
/* every 30 ticks (from sStep): neighbours talking through the floor, somebody climbing past a window, and now and then a
   household at home stringing a washing line out of the window */
function sChatter(g) {
  if (g.tick % 600 !== 0) sLines(g);
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (s.kind !== "storey" || !s.done) continue;
    var o = bOwner(g, s);
    if (!o || o.sleep > 0 || o.sayT > 0 || !bInside(s, o) || wRand(g) > 0.02) continue;
    var N = sNeighbours(g, s);
    for (var j = 0; j < N.length; j++) {
      var q = bOwner(g, N[j]);
      if (q && !q.dead && bInside(N[j], q)) { pSay(g, wRand(g) < 0.5 ? o : q, "neighbour"); break; }
    }
  }
  /* (up a storey's ladder, past the flat below's window, with somebody in) */
  for (k = 0; k < g.peasants.length; k++) {
    var p = g.peasants[k];
    if (p.dead || !p.climb || p.sayT > 0) continue;
    for (var i = 0; i < g.sites.length; i++) {
      var t = g.sites[i];
      if (t.kind !== "storey" || !t.done || t.floor < 3 || Math.abs(Math.floor(p.x) - t.lad) > 1) continue;
      var below = bSite(g, t.base), w = below && bOwner(g, below);
      if (!w || w === p || !bInside(below, w) || Math.abs(p.y - (below.F - 5)) > 3 || wRand(g) > 0.2) continue;
      pSay(g, p, "passing");
      if (w.sayT <= 0) { w.sayT = 0; pSay(g, w, "passed"); }
    }
  }
}
/* a storey finished, its owner home: the neighbours come up and have a look */
function sWarming(g, s) {
  var n = 0, N = sNeighbours(g, s).map(function (f) { return bOwner(g, f); });
  for (var k = 0; k < g.peasants.length && n < 5; k++) {
    var q = g.peasants[k];
    if (q.dead || q.state !== "walk" || q.task || q.sleep || q.id === s.owner || q.hunger > P_HUNGRY) continue;
    if (N.indexOf(q) < 0 && (Math.abs(q.x - s.cx) > 40 || wRand(g) < 0.5)) continue;
    q.task = { kind: "warming", site: s.id, x: s.ix0 + 1 + (n % 7), t: 0 };
    n++;
  }
}
function sTaskWarming(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || !s.done || ++k.t > 2400) { p.task = null; p.taskDone = true; return false; }
  if (bInside(s, p)) {
    p.idle = 0; p.dir = p.x < s.cx ? 1 : -1;
    if (!k.in) k.in = g.tick;
    if (p.sayT <= 0 && wRand(g) < 0.01) pSay(g, p, "warming");
    if (g.tick - k.in > 700) { p.task = null; p.taskDone = true; }
    return true;
  }
  var left = pathGo(g, p, "warm" + s.id, k.x, s.F - 1, function (x, y) { return x >= s.ix0 && x <= s.ix1 && y === s.F - 1; });
  if (left < 0) p.dir = k.x + 0.5 < p.x ? -1 : 1;
  if (pStuck(p, k, left > 0 ? left : Math.abs(k.x - p.x))) { p.task = null; return false; }
  return false;
}
/* a bailer with a full bucket in a flat: out of the door with it, over the ladder. true while they are seeing to it */
function sGardyloo(g, p, k) {
  var s = null, j, t, out = false;
  for (j = 0; j < g.sites.length && !s; j++) {
    t = g.sites[j];
    if (t.kind !== "storey" || !t.done) continue;
    /* (in the flat; or in its doorway, or at the top of its ladder, having reached in for it from there) */
    var xt = sDoorX(t);
    if (Math.abs(p.y - (t.F - 1)) <= 2.5 && (p.x - xt - 0.5) * t.d >= -0.6 && (p.x - xt - 0.5) * t.d <= 3.5) { s = t; out = true; }
    else if (bInside(t, p)) s = t;
  }
  if (!s) return undefined;
  var xd = sDoorX(s), at = xd + 0.5;
  if (!out) {
    var left = pathGo(g, p, "loo" + s.id, xd, s.F - 1, function (x, y) { return x === xd && y === s.F - 1; });
    if (left < 0) p.dir = at < p.x ? -1 : 1;
    if (pStuck(p, k, left > 0 ? left : Math.abs(at - p.x))) return undefined;   /* (no way to the door: carried down, then) */
    return false;   /* (walking there: false is on the move, true is busy where they stand) */
  }
  p.dir = s.d;
  iThrow(g, p, { x: xd + 6 * s.d, y: s.fy });
  pSay(g, p, "gardyloo", true);
  if (!g.got.gardyloo) achieve(g, "gardyloo");
  for (j = 0; j < g.peasants.length; j++) {
    var q = g.peasants[j];
    if (q !== p && !q.dead && q.climb && Math.abs(Math.floor(q.x) - s.lad) <= 1) pSay(g, q, "oi", true);
  }
  k.n = (k.n || 0) + 1;
  return true;
}
/* nobody climbs a storey's ladder into a fire: fire or embers within two cells of it, anywhere up it (paths.js) */
var S_HOT = { t: -1, g: null, v: null };
function sLadderHot(g, cx) {
  var key = g.tick + ":" + g.sid + ":" + g.sites.length;
  if (S_HOT.t !== key || S_HOT.g !== g) { S_HOT.t = key; S_HOT.g = g; S_HOT.v = {}; }
  var L = S_HOT.v;
  if (L[cx]) return L[cx].v;
  var v = false;
  for (var k = 0; k < g.sites.length && !v; k++) {
    var s = g.sites[k];
    if (s.kind !== "storey" || s.lad !== cx) continue;
    for (var y = s.F - 2; y <= s.fy + 1 && !v; y++) for (var x = cx - 3; x <= cx + 3; x++) { var c = pCell(g, x, y); if (c === MAT.FIRE || c === MAT.EMBER) { v = true; break; } }
  }
  L[cx] = { t: g.tick, v: v };
  return v;
}
/* (the middle columns of the flats' ladders, worked out once a tick: the pather asks for every step it looks at) */
var S_LADS = { t: -1, g: null, on: null };
function sIsLadder(g, cx) {
  var key = g.tick + ":" + g.sid + ":" + g.sites.length;
  if (S_LADS.t !== key || S_LADS.g !== g) {
    S_LADS.t = key; S_LADS.g = g; S_LADS.on = {};
    for (var k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "storey") S_LADS.on[g.sites[k].lad] = 1;
  }
  return S_LADS.on[cx] === 1;
}
/* is (cx, y) on a flat's ladder: its column, and within its rows (a mine's ladder in the same column is not) */
function sOnLadder(g, cx, y) {
  if (!sIsLadder(g, cx)) return false;
  for (var k = 0; k < g.sites.length; k++) { var s = g.sites[k]; if (s.kind === "storey" && s.lad === cx && y >= s.F - 3 && y <= s.fy + 1) return true; }
  return false;
}
/* about to climb down a flat's ladder with a fire at it: out past it instead, and down, and hope (build.js bClimbStart).
   true if they jumped */
P_SAY.leap = ["GERONIMO", "not the ladder, not the ladder", "here goes nothing", "i'm going out the window! door!"];
P_ACHIEVE.topdoor = ["OUT THE TOP DOOR", "a peasant jumped out of a burning flat. the ladder was busy being on fire"];
function sLeapOff(g, p, cx) {
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (s.kind !== "storey" || s.lad !== cx) continue;
    pLeap(p, 0.9, s.d * 1.1);
    p.dir = s.d;
    pSay(g, p, "leap", true);
    if (!g.got.topdoor) achieve(g, "topdoor");
    return true;
  }
  return false;
}

/* -------------------------------------------------------------------
   IN AND OUT. a valley that builds upward, where everybody has a roof
   and nobody has gone without for a good while, draws a newcomer now
   and then (word gets round). somebody with no roof, lean, and nothing
   that could house them, goes over the hills, for good. now and then a
   letter comes back
   ------------------------------------------------------------------- */
var S_LEAN = 5000;              /* hunger over this is going without */
var S_FED_T = 6000;             /* how long nobody can have gone without, for word to get round */
var S_WORD_T = 12000;           /* ticks between newcomers drawn by word of mouth */
var S_CROWD_MAX = 16;           /* nobody comes to a valley this full (for the frame rate, in a wide one at 4x) */
var S_ROUGH_T = 24000;          /* ticks without a roof, before going over the hills */
var S_LEAN_MAX = 3000;          /* and how lean */
var S_LEAVE_T = 12000;          /* ticks between leavings */
P_SAY.arriveWord = ["i heard there was room upstairs", "is it true you build on top of each other?", "i've come about the flat",
  "somebody said you had ladders"];
P_SAY.leave = ["there's no room here. i'm off over the hills", "tell the ducks", "i'll write", "don't wait up",
  "somewhere with ground. that's all i want"];
P_SAY.farewell = ["take care!", "write!", "we'll keep your bed. well. somebody will", "bye!"];
P_ACHIEVE.hills = ["OVER THE HILLS", "somebody left the valley to find somewhere with room. they took a stick"];
var S_LETTERS = ["they have TWO ponds", "i have a house. on the ground. i think of you often", "the ducks here are worse",
  "nobody here has thought of the bucket. i am a genius", "they put their houses side by side. imagine", "it rains here. water, from the sky. i'm not making it up"];

/* every 30 ticks (sStep): the books, who is coming and who is going */
function sComings(g) {
  var al = 0, k, p, lean = false;
  if (g.leanT == null) g.leanT = g.tick;
  for (k = 0; k < g.peasants.length; k++) {
    p = g.peasants[k];
    if (p.dead) continue;
    al++;
    if (p.hunger > S_LEAN) { lean = true; p.lean = (p.lean || 0) + 30; } else if (p.lean) p.lean = Math.max(0, p.lean - 6);
    if (p.state === "space") continue;
    if (bHome(g, p)) p.roughT = null; else if (p.roughT == null) p.roughT = g.tick;
  }
  if (lean) g.leanT = g.tick;
  /* (on their way out, and turned back by something on the way: off again, round it) */
  for (k = 0; k < g.peasants.length; k++) {
    p = g.peasants[k];
    if (!p.leaving || p.dead) continue;
    if (sHasHome(g, p)) { p.leaving = null; continue; }
    if (g.tick - p.leaving.t0 > 30000) { p.leaving = null; continue; }
    if (!p.task && p.state === "walk" && !p.sleep) p.task = { kind: "leave", x: p.leaving.x, t: Math.min(5000, g.tick - p.leaving.t0) };
  }
  /* word gets round */
  if (g.popGoal != null && al >= g.popGoal && al < S_CROWD_MAX && g.tick - g.leanT >= S_FED_T && g.tick - (g.wordT || -1e9) >= S_WORD_T && !g.wordDue) {
    var housed = true;
    for (k = 0; k < g.peasants.length && housed; k++) if (!g.peasants[k].dead && g.peasants[k].state !== "space" && !bHome(g, g.peasants[k])) housed = false;
    if (housed) { g.popGoal++; g.wordT = g.tick; g.wordDue = 1; }
  }
  /* over the hills */
  if (al > 4 && g.tick - (g.leftT || -1e9) >= S_LEAVE_T) for (k = 0; k < g.peasants.length; k++) {
    p = g.peasants[k];
    if (p.dead || p.state !== "walk" || p.task || p.climb || p.sleep || p.fire || p.panic > 0 || g.held === p) continue;
    if (p.roughT == null || g.tick - p.roughT < S_ROUGH_T || (p.lean || 0) < S_LEAN_MAX || p === pKing(g)) continue;
    if (sAnyHome(g)) break;   /* (something could house somebody yet: nobody goes) */
    sLeave(g, p);
    break;
  }
}
/* could anybody homeless be housed yet: an empty home, something going up, or a storey that could go up somewhere */
function sAnyHome(g) {
  var k, s;
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if (!sDwelling(s)) continue;
    if (!s.done || !s.owner) return true;
  }
  if (bHouses(g) < Math.min(B_HOUSES, bAlive(g)) && !(g.noPlotT != null && g.tick - g.noPlotT < S_CROWD_T)) return true;
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if (s.kind !== "house" || s.hut || sBelled(g, s) || !sBears(g, s)) continue;
    var st = sStack(g, s), T = st[st.length - 1];
    if (!T.done || T.repair) continue;
    var ds = st.length === 1 ? [1, -1] : [-st[1].d];
    for (var j = 0; j < ds.length; j++) if (sPlan(g, s, T, ds[j], st.length + 1)) return true;
  }
  return false;
}
/* off they go: what is the village's is put down, and they make for the nearer edge of the valley */
function sLeave(g, p) {
  iSpill(g, p, true); wDropAll(g, p); tCarry(g, p);
  /* (what is the village's goes to whoever is nearest, to put to use: nothing goes over the hills but them) */
  var o0 = pOther(g, p, 9999);
  if (o0 && p.stained) bTints(p, o0, p.stained);   /* (coloured panes go with their colours) */
  ["stone", "iron", "gold", "coal", "glass", "boards", "logs", "ore", "salt", "ash", "sand", "powder", "fish", "stained"].forEach(function (r) {
    if (!p[r]) return;
    if (o0) o0[r] = (o0[r] || 0) + p[r];
    p[r] = 0;
  });
  p.task = { kind: "leave", x: p.x < g.gw / 2 ? 1 : g.gw - 2, t: 0 };
  p.leaving = { x: p.task.x, t0: g.tick };   /* (and if the task is lost on the way, turned back by something nasty: sComings gives it back) */
  g.leftT = g.tick;
  pSay(g, p, "leave", true);
  var o = pOther(g, p, 60);
  if (o && !o.sleep) pSay(g, o, "farewell", true);
  feed(g, p.name + " is going over the hills, to find somewhere with room", "#c8d0dc", null, p);
}
function sTaskLeave(g, p, k) {
  if (++k.t > 6000 + Math.abs(k.x - p.x) * 8) {   /* (walled in, or the way under water: they stay, and think again later) */
    p.task = null; p.taskDone = true; p.roughT = g.tick; p.leaving = null;
    feed(g, p.name + " couldn't get out of the valley, and is staying after all", "#c8d0dc", null, p);
    return false;
  }
  if (sHasHome(g, p)) {   /* (given a home on the way: a flat came free. they stay) */
    p.task = null; p.taskDone = true; p.leaving = null; p.roughT = null;
    feed(g, p.name + " got a flat after all, and is staying", "#a8e08a", null, p);
    return false;
  }
  if (Math.abs(p.x - (k.x + 0.5)) < 2) { sGone(g, p); return true; }
  var x = k.x, left = pathGo(g, p, "leave", x, Math.floor(p.y), function (xx) { return Math.abs(xx - x) <= 1; });
  if (left < 0) p.dir = x + 0.5 < p.x ? -1 : 1;
  if (p.sayT <= 0 && wRand(g) < 0.002) pSay(g, p, "leave");
  return false;
}
/* out of the valley: gone, as the dead are gone, but not dead. no ghost, no cross, nobody counts them in the RIP */
function sGone(g, p) {
  p.dead = true; p.left = g.tick; p.task = null; p.home = 0; p.leaving = null;
  pSucceed(g, p, "THE KING HAS GONE OVER THE HILLS");   /* (a crown is not taken with them: peasants.js) */
  if (g.popGoal != null) g.popGoal = Math.max(1, g.popGoal - 1);
  feed(g, p.name + " has gone over the hills", "#c8d0dc");
  if (!g.got.hills) achieve(g, "hills");
  (g.letters = g.letters || []).push({ name: p.name, t: g.tick + 15000 + Math.floor(wRand(g) * 10000) });
}
/* a letter, from over the hills: a line in the news, and nothing more */
function sLetters(g) {
  var L = g.letters;
  if (!L || !L.length || L[0].t > g.tick) return;
  var l = L.shift();
  if (wRand(g) < 0.6) feed(g, "a letter from " + l.name + ", over the hills: " + S_LETTERS[Math.floor(wRand(g) * S_LETTERS.length)], "#ffe08a");
}
/* a newcomer by word of mouth: what they say (peasants.js pLife) */
function sArrived(g, q) {
  if (!g.wordDue) return false;
  g.wordDue = 0;
  pSay(g, q, "arriveWord", true);
  return true;
}
/* a bundle on a stick, over the shoulder, on the way out */
function sDrawBundle(g, p, ox, oy) {
  var d = p.dir;
  oPut(g, ox, oy - 4, SAND_PAL[MAT.WOOD][60]);
  oPut(g, ox - d, oy - 5, SAND_PAL[MAT.WOOD][60]);
  oPut(g, ox - 2 * d, oy - 6, SAND_PAL[MAT.WOOD][60]);
  oPut(g, ox - 3 * d, oy - 6, 0xff3a52c8);
  oPut(g, ox - 3 * d, oy - 5, 0xff3a52c8);
  oPut(g, ox - 4 * d, oy - 6, 0xff5a72e8);
  oPut(g, ox - 4 * d, oy - 5, 0xff3a52c8);
}

/* -------------------------------------------------------------------
   ROOF GARDENS. a stack that can grow no further gets a flat roof, a
   parapet, a bed of sand and a hatch up to it from the top floor: a
   little field, up in the air, that the fields a village keeps do not
   count
   ------------------------------------------------------------------- */
P_SAY.idea_roofgarden = ["what if the wheat went on the ROOF?", "a field is only sand and sky", "up there. it's flat, isn't it",
  "plant it on top"];
P_SAY.planRoof = ["a garden on the roof!", "mind the hatch", "sand. up a ladder. lovely", "wheat with a view"];
P_ACHIEVE.roofgarden = ["ROOF GARDEN", "wheat on the roof. the ducks were there before the farmer"];
IDEAS.push({ id: "roofgarden", fresh: true, name: "the roof garden", title: "ROOF GARDENS",
  sub: "a field is only sand and sky. a flat roof has both",
  hint: "storeys, and no room for another field",
  ready: function (g) { return sRoofReady(g); } });

function sFull(g, h) { return sStack(g, h).length >= S_MAX; }
function sRoofOf(g, h) {
  for (var k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "roofgarden" && g.sites[k].house === h.id) return g.sites[k];
  return null;
}
/* the stacks that can grow no further and have nothing on top yet */
function sRoofable(g) {
  var out = [];
  for (var k = 0; k < g.sites.length; k++) {
    var h = g.sites[k];
    if (h.kind !== "house" || !sFull(g, h) || sRoofOf(g, h)) continue;
    var st = sStack(g, h), T = st[st.length - 1];
    if (T.done && !T.repair) out.push({ h: h, T: T });
  }
  return out;
}
function sShortOfFields(g) {
  if (g.noFieldT != null && g.tick - g.noFieldT < S_CROWD_T) return true;
  return iFields(g) >= Math.min(4, Math.ceil(bAlive(g) / 3)) && g.leanT != null && g.tick - g.leanT < S_FED_T;
}
function sRoofReady(g) { return !!g.know.storey && !!g.know.farm && sShortOfFields(g) && sRoofable(g).length > 0; }
/* who thinks of it: whoever found no room for a field; or, at the cap, the hungriest, looked for now and then */
function sSparkRoof(g, p) { if (!g.know.roofgarden && p) wSpark(g, p, "roofgarden"); }
function sRoofLook(g) {
  if (g.know.roofgarden || !g.know.farm || g.tick % 600 || !sRoofReady(g)) return;
  var best = null;
  for (var k = 0; k < g.peasants.length; k++) { var q = g.peasants[k]; if (!q.dead && q.state === "walk" && (!best || q.hunger > best.hunger)) best = q; }
  sSparkRoof(g, best);
}
/* the plan, on top floor T of the stack on house H */
function sRoofPlan(g, H, T) {
  var gw = g.gw, x0 = H.x0, x1 = x0 + 10, C = T.F - S_ROWS, k, x, y, e, c, i;
  var xd = T.d > 0 ? x1 : x0, far = -T.d;               /* (the door's end, and the other) */
  var hx = far < 0 ? x0 + 1 : x0 + 7;                   /* the hatch: three columns at the far end */
  var bedA = T.d > 0 ? x1 - 5 : x0 + 1, bedB = bedA + 4;   /* five of sand, from the parapet in */
  /* the room, the roof and the air over it */
  var gable = {};
  for (k = 0; k < T.plan.length; k++) { e = T.plan[k]; if (((e.i / gw) | 0) < C && e.v !== MAT.EMPTY) gable[e.i] = 1; }
  for (y = C - 12; y <= C - 1; y++) for (x = x0 - 1; x <= x1 + 1; x++) {
    i = y * gw + x; c = pCell(g, x, y);
    if (gable[i]) continue;
    if (LIQUID[c] || HOT[c] || bMarked(g, x, y) || !AIRY[c]) return null;
  }
  for (y = C; y <= T.F - 1; y++) for (x = hx; x < hx + 3; x++) {
    c = pCell(g, x, y);
    if (y > C && !AIRY[c] && c !== MAT.LADDER) return null;   /* (the bed, or anything, in the hatch's way) */
  }
  if (C - 13 < 10) return null;
  var plan = [], hatch = {};
  for (k = 0; k < T.plan.length; k++) if (gable[T.plan[k].i] && !AIRY[g.m[T.plan[k].i]]) { e = bE(g, T.plan[k].i % gw, (T.plan[k].i / gw) | 0, MAT.EMPTY, 0); e.strip = true; plan.push(e); }
  /* 1: the hatch, and the ladder down from it, from the floor up */
  for (y = T.F - 1; y >= C; y--) for (k = 0; k < 3; k++) {
    e = bE(g, hx + k, y, MAT.LADDER, 10 + T.F - 1 - y, k);
    if (y === C) { e.over = true; hatch[e.i] = 1; }
    plan.push(e);
  }
  /* 2: the parapet, and the bed of sand (free, as the hanging gardens' beds are) */
  plan.push(bE(g, xd, C - 1, MAT.BRICK, 100));
  for (x = bedA; x <= bedB; x++) { e = bE(g, x, C - 1, MAT.SAND, 101); e.bed = 1; e.cost = 0; plan.push(e); }
  return { plan: plan, gable: gable, hatch: hatch, box: [x0, C - 6, x1, T.F - 1], bedA: bedA, bedB: bedB, C: C, hx: hx };
}
function sTryRoof(g, p) {
  if (!g.know.roofgarden || p.planCD || bOpenCount(g) >= B_OPEN) return false;
  for (var k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "roofgarden" && !g.sites[k].done) return false;   /* (one at a time) */
  var R = sRoofable(g);
  R.sort(function (a, b) { return Math.abs(a.h.cx - p.x) - Math.abs(b.h.cx - p.x); });
  for (k = 0; k < R.length; k++) {
    var r = sRoofPlan(g, R[k].h, R[k].T);
    if (!r) continue;
    var T = R[k].T;
    bMark(g, T, 0);
    T.plan = T.plan.filter(function (e) { return !r.gable[e.i] && !r.hatch[e.i]; });
    T.win = (T.win || []).filter(function (w) { return !r.gable[w]; });
    T.y0 = r.C;
    sKeepClear(g, T);   /* (its ceiling is a roof that stays, too: storeys.js sKeepClear) */
    bMark(g, T, 1);
    var s = bNew(g, "roofgarden", p, r.plan, r.box, { house: R[k].h.id, top: T.id, C: r.C, bedA: r.bedA, bedB: r.bedB });
    s.owner = 0; s.who = "";
    feed(g, p.name + " is putting a garden on the roof of " + bLabel(R[k].h), "#a8e08a", "plan" + s.id);
    pSay(g, p, "planRoof", true);
    bJoin(g, p, s);
    return true;
  }
  p.planCD = 1800;
  return false;
}
/* built: the bed of sand is a field now, like a terrace's (pleasures.js pTerraces) */
function sRoofFinish(g, s, p) {
  s.plan = s.plan.filter(function (e) { return !e.bed; });
  feed(g, "there is a garden on the roof of " + bLabel(bSite(g, s.house) || s) + " now. it wants sowing", "#a8e08a", "plan" + s.id);
  if (!g.got.roofgarden) achieve(g, "roofgarden");
  sRoofField(g, s);
}
function sRoofField(g, s) {
  for (var k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "farm" && g.sites[k].roof === s.id) return;
  var plan = [], Y = s.C - 1;
  /* (a stalk in every furrow: five of them, nearly a ground field's worth) */
  for (var x = s.bedA; x <= s.bedB; x++) { plan.push(bE(g, x, Y, MAT.SOIL, 1)); plan.push(bE(g, x, Y - 1, MAT.CROP, 2)); }
  bNew(g, "farm", null, plan, [s.bedA, Y - 6, s.bedB, Y], { free: true, G: Y, roof: s.id });
}
/* every 600 ticks (sStep): a roof garden's field is sown again when it has been reaped, as a terrace's is; and one
   given up is a field again, later */
function sRoofStep(g) {
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (s.kind === "roofgarden" && s.done && g.tick % 600 === 0) sRoofField(g, s);
    if (s.kind !== "farm" || !s.roof || s.done) continue;
    if (s.plan.every(function (e) { var c = g.m[e.i]; return bOk(g, e) || (e.v === MAT.CROP && (c === MAT.CROP || c === MAT.WHEAT)); })) { s.done = true; s.repair = s.sow = false; s.last = g.tick; }
  }
  /* (a garden whose stack is gone goes with it, and its field) */
  for (k = g.sites.length - 1; k >= 0; k--) {
    s = g.sites[k];
    if ((s.kind === "roofgarden" && !bSite(g, s.top)) || (s.kind === "farm" && s.roof && !bSite(g, s.roof))) { bRemove(g, k); k = Math.min(k, g.sites.length); }
  }
}

/* -------------------------------------------------------------------
   WASHING LINES. from a flat's window to whatever faces it across open
   air: another flat's window, or a tree. a cord of LINEN, and now and
   then the washing on it. a fire at one end walks along it to the
   other. g.lines: { from: storey id, cells: [i], wash: [i], washT }
   ------------------------------------------------------------------- */
P_SAY.washing = ["washing day!", "hang it out", "smalls on the line", "it'll dry. eventually"];
P_SAY.offLine = ["get off the washing", "SHOO. that's my shirt", "not on the clean ones"];
P_ACHIEVE.washing = ["WASHING DAY", "the street has a washing line. it is practically a town"];
var S_LINE_MIN = 4, S_LINE_MAX = 24;
/* the window cell of storey s, and which way it looks out */
function sWindow(s) { var xf = s.d > 0 ? s.ix0 - 1 : s.ix1 + 1; return { x: xf, y: s.F - 5, o: s.d > 0 ? -1 : 1 }; }
/* (the walls by the room: a storey's box takes in its ladder, so its x0 is the ladder's on the left) */
function sDoorX(s) { return s.d > 0 ? s.ix1 + 1 : s.ix0 - 1; }
/* a line from s's window: the cells of the cord, or null */
function sLinePlan(g, s) {
  var W = sWindow(s), gw = g.gw, d, X, Y = -1, k, t;
  for (d = S_LINE_MIN; d <= S_LINE_MAX && Y < 0; d++) {
    X = W.x + W.o * d;
    if (X < 2 || X > gw - 3) break;
    /* another flat's window, looking back */
    for (k = 0; k < g.sites.length && Y < 0; k++) {
      t = g.sites[k];
      if (t === s || t.kind !== "storey" || !t.done) continue;
      var V = sWindow(t);
      if (V.x === X && V.o === -W.o && Math.abs(V.y - W.y) <= 3 && g.m[V.y * gw + V.x] !== MAT.EMPTY) Y = V.y;
    }
    /* or a tree: its trunk, or its crown, a little lower; or the wall or the eaves of somebody else's house */
    if (Y < 0) for (var dy = 0; dy <= 6 && Y < 0; dy++) for (var sg = -1; sg <= 1 && Y < 0; sg += 2) {
      var yy = W.y + dy * sg, cy = pCell(g, X, yy);
      if ((cy === MAT.WOOD || (cy === MAT.PLANT && dy >= 1)) && !bMarked(g, X, yy)) Y = yy;
      else if (dy <= 3 && SOLID[cy] && bMarked(g, X, yy) && sOtherHome(g, s, X, yy)) Y = yy;
    }
    if (Y >= 0) break;
  }
  if (Y < 0) return null;
  /* straight across, and one step down (or up) in the middle: four-connected, so a fire walks the whole of it */
  var cells = [], mid = W.x + W.o * Math.floor(d / 2), x, y;
  for (x = W.x + W.o; x !== mid + W.o; x += W.o) cells.push(W.y * gw + x);
  for (y = W.y; y !== Y; y += (Y > W.y ? 1 : -1)) cells.push((y + (Y > W.y ? 1 : -1)) * gw + mid);
  for (x = mid + W.o; x !== X; x += W.o) cells.push(Y * gw + x);
  for (k = 0; k < cells.length; k++) {
    var c = g.m[cells[k]], cx = cells[k] % gw, cy = (cells[k] / gw) | 0;
    if (!AIRY[c] || c !== MAT.EMPTY || bMarked(g, cx, cy)) return null;
  }
  return cells;
}
/* is cell (x, y) part of a home that is not in s's own stack */
function sOtherHome(g, s, x, y) {
  var H = sHouseOf(g, s);
  for (var k = 0; k < g.sites.length; k++) {
    var t = g.sites[k];
    if (!sDwelling(t) || !t.done || x < t.x0 || x > t.x1 || y < t.y0 || y > t.y1) continue;
    if (sHouseOf(g, t) === H) continue;
    return true;
  }
  return false;
}
function sLines(g) {
  var L = g.lines || (g.lines = []), k, j, s, o;
  /* (a line burnt through, or cut: gone. the window may get another, later) */
  for (k = L.length - 1; k >= 0; k--) {
    var ln = L[k], left = 0;
    for (j = 0; j < ln.cells.length; j++) if (g.m[ln.cells[j]] === MAT.LINEN) left++;
    if ((left < ln.cells.length && !(ln.burn && Object.keys(ln.burn).length)) || !bSite(g, ln.from)) {
      ln.cells.concat(ln.wash).forEach(function (i) { if (g.m[i] === MAT.LINEN) heatVacate(g, i); });   /* (what is left of it comes down) */
      L.splice(k, 1);
    }
  }
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    /* (somebody at home, or about the house with nothing to do: washing day is when they get round to it) */
    if (s.kind !== "storey" || !s.done || !(o = bOwner(g, s)) || o.sleep > 0 || !(bInside(s, o) || (!o.task && Math.abs(o.x - s.cx) < 30))) continue;
    var line = null;
    for (j = 0; j < L.length; j++) if (L[j].from === s.id) line = L[j];
    if (!line) {
      if (g.tick % 600 === 0 || wRand(g) > 0.3) continue;   /* (strung from sChatter, more often: sLineTry) */
      var cells = sLinePlan(g, s);
      if (!cells) continue;
      for (j = 0; j < cells.length; j++) { sandPlace(g, cells[j], MAT.LINEN); g.aux[cells[j]] = 6; }
      L.push({ from: s.id, cells: cells, wash: [], washT: 0 });
      feed(g, o.name + " strung a washing line out of the window", "#a8e08a", null, o);
      continue;
    }
    /* the washing: out, and later in */
    if (g.tick % 600) continue;   /* (the washing, out and in, at its own pace: every 600 ticks) */
    if (!line.wash.length && g.tick > line.washT && wRand(g) < 0.1) {
      for (j = 1; j < line.cells.length - 1; j += 2) {
        var u = line.cells[j] + g.gw;
        if (g.m[u] === MAT.EMPTY && wRand(g) < 0.7) { sandPlace(g, u, MAT.LINEN); g.aux[u] = 1 + Math.floor(wRand(g) * 5); line.wash.push(u); }
      }
      line.washT = g.tick + 3000 + Math.floor(wRand(g) * 3000);
      if (line.wash.length) { pSay(g, o, "washing", true); if (!g.got.washing) achieve(g, "washing"); }
    } else if (line.wash.length && g.tick > line.washT) {
      for (j = 0; j < line.wash.length; j++) if (g.m[line.wash[j]] === MAT.LINEN && g.aux[line.wash[j]] !== 6) heatVacate(g, line.wash[j]);
      line.wash = []; line.washT = g.tick + 4000 + Math.floor(wRand(g) * 6000);
    }
    /* a duck on the washing */
    if (o.sayT <= 0) for (j = 0; j < g.ducks.length; j++) {
      var dk = g.ducks[j];
      if (dk.dead) continue;
      var di = (Math.floor(dk.y) + 1) * g.gw + Math.floor(dk.x);
      if (line.cells.indexOf(di) >= 0 || line.wash.indexOf(di) >= 0) { pSay(g, o, "offLine", true); break; }
    }
  }
}
/* every tick, while there are washing lines: one alight burns along, a cell at a time, like a fuse (each cell smoulders a
   while, as an ember, then is gone), and catches what it is tied to at either end: a shuttered window, a tree, a door;
   not glass, which does not burn. lit from outside by anything burning beside it, as a plant would be */
var S_FUSE = 25;
function sBurns(c) { return c === MAT.FIRE || c === MAT.EMBER; }
function sBurnsNear(g, i) { return sBurns(g.m[i - 1]) || sBurns(g.m[i + 1]) || sBurns(g.m[i - g.gw]) || sBurns(g.m[i + g.gw]); }
/* is a cell beside i (along the line) already smouldering: that is the fuse; anything else alight is a flame from outside */
function sCordNear(B, i, gw) { return B[i - 1] != null || B[i + 1] != null || B[i - gw] != null || B[i + gw] != null; }
function sFuse(g) {
  var L = g.lines, k, j, ln, i;
  for (k = 0; k < L.length; k++) {
    ln = L[k];
    var B = ln.burn || (ln.burn = {}), all = ln.cells.concat(ln.wash), n = ln.cells.length;
    for (i in B) if (all.indexOf(+i) < 0) delete B[i];   /* (washing taken in while it smouldered) */
    for (j = 0; j < all.length; j++) {
      i = all[j];
      if (B[i] != null) {
        if (--B[i] <= 0) { delete B[i]; if (g.m[i] === MAT.EMBER || g.m[i] === MAT.LINEN || g.m[i] === MAT.ASH) heatVacate(g, i); }
        else { g.m[i] = MAT.EMBER; g.aux[i] = 0; }
      } else if (sBurns(g.m[i]) || (g.m[i] === MAT.LINEN && (g.T[i] > 150 || (sBurnsNear(g, i) && wRand(g) < (sCordNear(B, i, g.gw) ? 0.15 : 0.5))))) { B[i] = S_FUSE; g.m[i] = MAT.EMBER; g.aux[i] = 0; }   /* (alight, by us or by a flame: it smoulders where it hangs) */
    }
    /* the ends: what the line is tied to */
    [ln.cells[0], ln.cells[n - 1]].forEach(function (e) {
      if (B[e] == null) return;
      [e - 1, e + 1].forEach(function (t) {
        var c = g.m[t];
        if ((c === MAT.PLANK || c === MAT.WOOD || c === MAT.DOOR) && wRand(g) < 0.12) { g.m[t] = MAT.EMBER; g.aux[t] = 0; }
      });
    });
  }
}
/* a flat given up before it was finished (build.js bRemove): the floor under it gets back its gable, to mend what of it
   was taken down, and its box, and its lit windows */
function sUnplan(g, s) {
  var T = bSite(g, s.base);
  if (!T || !s.was) return;
  bMark(g, T, 0);
  var have = {};
  T.plan.forEach(function (e) { have[e.i] = 1; });
  /* (not where the flat's own bed went in, on the old gable's row: that comes out with the flat's other leavings, or not) */
  s.was.plan.forEach(function (e) { if (!have[e.i] && g.m[e.i] !== MAT.BED) T.plan.push(e); });
  T.win = s.was.win; T.y0 = s.was.y0;
  bMark(g, T, 1);
}
/* fire just outside door column `door` of house h, on side d: within four columns, and as high as a peasant (ideas.js iExit) */
function sFireOutside(g, h, door, d) {
  var n = 0;
  for (var x = door; x !== door + 5 * d; x += d) for (var y = h.F - 10; y <= h.F; y++) if (sBurns(pCell(g, x, y))) n++;
  return n;
}
