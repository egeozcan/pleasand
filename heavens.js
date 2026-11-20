/* =====================================================================
   PLEASAND  --  heavens.js

   the great works that look up (wonders.js has what they share):
     THE OBSERVATORY  a brick dome on top of the watchtower (or on the
                      highest ground there is), with a slit in it and an
                      iron tube through the slit. an astronomer goes up
                      and looks: a constellation named every time, the
                      moon looked at, and now and then a shower of
                      falling stars, foretold. one shower in three drops
                      a meteorite: iron, hot, with gold in the middle
     THE LIGHTHOUSE   a striped brick tower on the bank of a lake
                      somebody gave them, with a gallery, iron rails and
                      a glass lantern. the keeper carries a barrel of oil
                      up from the well's tank, and the beam goes round:
                      it is light, for thinking by, and a swimmer in
                      trouble makes for it. let the oil run out and it
                      goes dark, and everybody knows whose fault it was
     THE FOUNDRY      a firebrick chamber in a brick stack, a door at the
                      top, a tap at the foot each side, and a mould under
                      each tap: a trough for plates, a cup for an engine
                      bell. bars and coal go in, in layers; the founder
                      works the bellows and stokes it, and when it is
                      mostly running knocks out the plug. the iron runs
                      into the mould and sets, and is prised out as
                      plates. the ash is raked out of the door
     THE MOON ROCKET  a concrete pad and a firebrick trench, a girder
                      gantry with a ladder up it, and a hollow rocket of
                      cast plates with the engine bell under it and a
                      gilded nose. twelve barrels of oil, a crew of
                      three, a countdown, and up it goes, out of the top
                      of the world. a flag on the moon. the crew come
                      back the way anybody comes back from space, over
                      the pad, with moon rock in their pockets
   ===================================================================== */
"use strict";

/* -------------------------------------------------------------------
   SHARED
   ------------------------------------------------------------------- */
var H_LOOKS = 20;           /* looks out from the watchtower before anybody wonders what the little lights are */
var H_MOON = 12;            /* looks at the moon before anybody thinks it is a place */
var H_SHOWER = 9000;        /* ticks between showers of falling stars, about */
var H_FORETOLD = 1500;      /* and between the astronomer saying so and the first streak */
var H_STREAKS = 600;        /* how long a shower goes on */
var H_HOUSE_CLEAR = 12;     /* no meteorite within this many columns of a house */
var H_LAKE = 150;           /* water in one body before anybody needs a lighthouse */
var H_BARREL = 4000;        /* ticks of light in a barrel of oil */
var H_LOW = 1000;           /* the keeper goes for another under this */
var H_BEAM = 80;            /* how far a swimmer in trouble will make for the light from */

var H_GLOW = hex32("#fff2c0"), H_STAR = hex32("#d8e4ff"), H_STREAK = hex32("#ffffff"), H_STREAK2 = hex32("#a8c8ff");

/* a dice-free scramble of a few numbers, for things that are only drawn (the streaks): the same every frame */
function hHash(a, b) { var h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return (h >>> 0) / 4294967296; }
/* the ground at x: the first solid row (trees seen through) */
function hGround(g, x) { return mGround(g, x, true); }
/* a peasant who is idle, and nearest (x), but for those in but */
function hIdlest(g, x, R, but, ok) {
  var best = null, bd = R || 1e9;
  for (var k = 0; k < g.peasants.length; k++) {
    var q = g.peasants[k];
    if (!wIdle(g, q) || (but && but[q.id]) || (ok && !ok(q))) continue;
    var d = Math.abs(q.x - x);
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}
/* somebody by id, alive and about (not in space) */
function hWho(g, id) { var q = id ? lAlive(g, id) : null; return q && q.state !== "space" ? q : null; }
/* walk p to stand at (x, y), within dx columns and dy rows. true while still on the way */
function hGo(g, p, k, key, x, y, dx, dy) {
  if (Math.abs(p.x - x - 0.5) <= dx + 0.5 && Math.abs(Math.floor(p.y) - y) <= dy) return false;
  if (iWalk(g, p, k, key, x, y, function (X, Y) { return Math.abs(X - x) <= dx && Math.abs(Y - y) <= dy; })) pGiveUp(g, p, x);
  return true;
}
/* a barrel of oil out of the nearest well's tank, at its pump: for the keeper and the rocket. 1 once they have it, 0
   while they are on their way, -1 if there is none to be had */
function hFetchBarrel(g, p, k) {
  if (p.barrel) return 1;
  var w = k.well ? bSite(g, k.well) : null;
  if (!w || w.kind !== "well" || !w.done || w.repair || w.tank < 1) { w = oTankFor(g, p, 1); if (!w) return -1; k.well = w.id; k.best = null; }
  if (hGo(g, p, k, "barrel" + w.id, w.pump.x, w.pump.y, 1, 2)) return 0;
  p.dir = w.col < p.x ? -1 : 1; p.idle = 0;
  if (++k.act < 40) { p.pose = (k.act % 16) < 8 ? "hammerA" : "stand"; return 0; }
  k.act = 0;
  w.tank--; p.barrel = 1; g.fx.clank++;
  if (p.sayT <= 0) pSay(g, p, "barrel");
  return 1;
}
P_SAY.barrel = ["one barrel", "heavy, this", "*slosh*", "mind the oil", "a barrel of the black stuff"];

/* a level for something u0..u1 wide (cell(u, h) says what goes where: a material, EMPTY to be kept clear, -1 for
   nothing of ours), with its row h 0 at R0 on ground gy (gy[u - u0]) at x0 (x = x0 + u - u0): the ground over R0 dug off
   (sand shovelled, rock cut), and under R0, where the ground is lower, made up in stone (fill), so that it stands level.
   ph(u, h) is the order. {plan, work} or null if something is in the way. (rock where something of ours goes under the
   floor is taken for it; over the floor, it is in the way) */
function hLevel(g, x0, gy, u0, u1, R0, hlo, hhi, cell, ph, extra) {
  var plan = [], work = 0, u, h, x, y, c, v, e;
  for (u = u0; u <= u1; u++) {
    x = x0 + u - u0;
    var G = gy[u - u0];
    for (h = hlo; h <= hhi; h++) {
      y = R0 - h; c = pCell(g, x, y); v = cell(u, h);
      if (bMarked(g, x, y) && v !== -1) return null;
      if (v === -1) {
        /* (nothing of ours: the ground as it is, but dug off over the floor, and made up under it where it is low) */
        if (y < G && h >= 1) continue;
        if (y < R0 && y >= G) { if (AIRY[c]) continue; if (bMarked(g, x, y)) return null; if (!B_DIG[c] && !ROCK[c] && !mClear(g, x, y, c)) return null; e = bE(g, x, y, MAT.EMPTY, 0); if (ROCK[c]) e.mine = true; plan.push(e); work += ROCK[c] ? 2 : 1; continue; }
        if (y >= R0 && y < G && h >= hlo && AIRY[c]) { plan.push(bE(g, x, y, MAT.BRICK, wFillPh(y))); work++; }
        continue;
      }
      if (LIQUID[c]) return null;
      if (v === MAT.EMPTY) {
        if (AIRY[c]) continue;
        if (!B_DIG[c] && !ROCK[c] && !mClear(g, x, y, c)) return null;
        e = bE(g, x, y, MAT.EMPTY, 0); if (ROCK[c]) e.mine = true;
        plan.push(e); work += ROCK[c] ? 2 : 1;
        continue;
      }
      if (ROCK[c]) { if (h <= -1 || (h === 0 && v === MAT.FIREBRICK && extra && extra.rockFloor)) continue; return null; }
      if (!AIRY[c] && !B_DIG[c]) return null;
      e = bE(g, x, y, v === "bell" ? MAT.METAL : v, ph(u, h), extra && extra.a ? extra.a(u, h, v) : 0);
      if (extra && extra.dress) extra.dress(e, u, h, v);
      plan.push(e);
      if (y >= G) work++;   /* (built up where the ground was low) */
    }
    /* (and the ground under the floor's row made up, where the floor is over air) */
    for (y = G - 1; y >= R0 + 1 - hlo; y--) if (AIRY[pCell(g, x, y)]) { plan.push(bE(g, x, y, MAT.BRICK, wFillPh(y))); work++; }
  }
  return { plan: plan, work: work };
}
/* the best level, from the lowest ground up to the highest: least work */
function hBestLevel(g, x0, gy, hi, lo, make) {
  var best = null;
  /* (no more than three rows dug off the high side: a bank dug into any deeper comes down on whoever is digging. the
     low side is made up in stone instead, as far as it has to be) */
  for (var R0 = Math.min(lo, hi + 3); R0 >= hi; R0--) { var r = make(R0); if (r && (!best || r.work < best.work)) { best = r; best.R0 = R0; } }
  return best;
}

/* -------------------------------------------------------------------
   THE OBSERVATORY
   ------------------------------------------------------------------- */
P_SAY.idea_observatory = ["what ARE those little lights", "the stars. somebody should look at them properly", "a tube, and a lens at the end of it",
  "i've looked out from the tower so long. now i want to look UP"];
P_SAY.planObs = ["a dome on the tower", "a hat for the tower. with a hole in it", "for looking at the sky", "the stars won't know what hit them"];
P_SAY.observe = ["hmm", "there's one", "if you squint, it's a duck", "the moon has holes in it", "so many", "write that down",
  "that one moved", "i can see the moon's face. it looks tired"];
P_SAY.foretell = ["there'll be falling stars tonight", "watch the sky later", "something's coming. lots of somethings",
  "keep your heads up tonight"];
P_SAY.stars = ["ooh", "OOOH", "make a wish", "there's another", "look! look!", "they're falling!", "i wished for a duck"];
P_SAY.hot = ["it's still hot", "don't touch it", "it came out of the SKY", "give it a minute", "*poke*. ow"];
P_SAY.meteorite = ["iron! from the sky!", "there's gold in it!", "a star. in my pocket", "it fell for us"];
P_ACHIEVE.meteorite = ["FALLING STAR", "it came out of the sky, and there was gold in the middle of it"];
var H_NAMES = ["THE BIG DUCK", "GARY'S HAT", "THE LADLE", "THE SLEEPING COW", "THE SPADE", "THE LITTLE PYRAMID", "THE BUCKET", "THE LONG SOCK",
  "THE TWO GEESE", "THE BENT NAIL", "THE KING'S NOSE", "THE OTHER BUCKET", "THE WHEELBARROW", "THE LOST BOOT"];

wDef({
  id: "observatory",
  idea: { name: "the observatory", title: "THE OBSERVATORY", sub: "what ARE those little lights", hint: "glass, and a good many looks out from the tower",
          ready: function (g) { return !!g.know.glass && !!g.know.masonry && (g.looks || 0) >= H_LOOKS; } },
  achieve: ["THE OBSERVATORY", "a dome, a slit, and a tube. somebody's job now is to look at the sky"],
  plan: hPlanObs,
  pick: hObsPick,
  task: function (g, p, k) {
    if (k.kind === "observe") return hTaskObserve(g, p, k);
    if (k.kind === "stargaze") return hTaskStargaze(g, p, k);
    if (k.kind === "meteorite") return hTaskMeteorite(g, p, k);
    return undefined;
  },
  step: hObsStep,
  air: hSkyTick,
  sky: hDrawSky,
  draw: hDrawObs,
  finish: function (g, s, p) {
    feed(g, "the observatory is finished. " + pTitle((hWho(g, s.astro) || p || { short: "somebody" }).short) + " is the astronomer", "#ffd94a", "plan" + s.id);
    s.lookT = g.tick + 300; s.showerT = g.tick + 3000 + irnd(2000);
  },
  label: function () { return "the observatory"; },
  readout: function (g, s) {
    if (!s.done) return "";
    var a = hWho(g, s.astro);
    if (s.shower > g.tick) return "falling stars foretold, " + Math.ceil((s.shower - g.tick) / 60) + "s from now";
    if (g.hShower && g.hShower.until > g.tick) return "a shower of falling stars";
    return (a ? pTitle(a.short) + " is the astronomer. " : "") + (g.moonLooks || 0) + " looks at the moon";
  },
  mood: function (g, p, k) {
    if (k.kind === "observe") return k.at ? "is at the telescope, looking at the sky" : "is going up to the observatory";
    if (k.kind === "stargaze") return "is watching the falling stars";
    if (k.kind === "meteorite") return k.wait ? "is waiting for the meteorite to cool down" : "is going to see where the falling star came down";
    return "";
  }
});
/* (looked out from the watchtower: counted, and the one who has looked out most wonders what the little lights are.
   mines.js, at the end of a look) */
function hLooked(g, p) {
  g.looks = (g.looks || 0) + 1; p.looks = (p.looks || 0) + 1;
  if (g.know.observatory || (g.looks || 0) < H_LOOKS) return;
  var best = null;
  for (var k = 0; k < g.peasants.length; k++) { var q = g.peasants[k]; if (!q.dead && (!best || (q.looks || 0) > (best.looks || 0))) best = q; }
  wSpark(g, best, "observatory");
}
/* the dome, nine wide: u 0..8 across from xl, r rows up from the floor at row F. on a tower its first two rows are the
   tower's own battlements, and its lantern stays where it is, in the wall. a slit on the right shoulder with the
   telescope through it: an iron tube, a glass lens at the end, gold fittings (or stone, till there is gold) */
var H_TUBE = [[3, 7], [4, 8], [5, 9], [6, 10], [7, 11], [8, 12], [4, 7], [5, 8], [6, 9], [7, 10]];   /* (the slit is where it goes through) */
function hDomeOuter(u, r) { return r <= 10 ? u >= 0 && u <= 8 : (r === 11 ? u >= 1 && u <= 7 : (r === 12 ? u >= 2 && u <= 6 : (r === 13 ? u >= 3 && u <= 5 : false))); }
function hDomeInner(u, r) { return r <= 8 ? u >= 1 && u <= 7 : (r <= 10 ? u >= 2 && u <= 6 : (r === 11 ? u >= 3 && u <= 5 : (r === 12 ? u === 4 : false))); }
function hDomeCell(u, r, tower) {
  var k;
  for (k = 0; k < H_TUBE.length; k++) if (H_TUBE[k][0] === u && H_TUBE[k][1] === r) return MAT.GIRDER;
  if ((u === 9 && (r === 12 || r === 13))) return MAT.GLASS;
  if ((u === 6 && r === 11) || (u === 8 && r === 11)) return MAT.GOLD;
  if (!hDomeOuter(u, r) || hDomeInner(u, r)) return MAT.EMPTY;
  if (tower && (r <= 2 || (u === 8 && r === 3))) return -1;   /* (the tower's battlements, and its lantern) */
  if (!tower && u === 0 && r <= 9) return MAT.DOOR;
  return MAT.BRICK;
}
/* the order it goes up in: a course at a time, the tube where it goes through the wall with its course; then the rest of
   the tube, from the wall inwards (each piece hangs off the last), and the lens */
var H_TUBE_IN = [[6, 10], [6, 9], [5, 9], [5, 8], [4, 8], [4, 7], [3, 7]];
function hDomePh(u, r) {
  for (var k = 0; k < H_TUBE_IN.length; k++) if (H_TUBE_IN[k][0] === u && H_TUBE_IN[k][1] === r) return 50 + k;
  if (u === 9) return 57;
  return 10 + r;
}
/* the plan for a dome at xl, floor F, or null if anything is in the way */
function hDomePlan(g, xl, F, tower) {
  var plan = [], u, r, v, x, y, c;
  for (r = 1; r <= 13; r++) for (u = 0; u <= 9; u++) {
    v = hDomeCell(u, r, tower);
    if (v === MAT.EMPTY && r > 12) continue;
    x = xl + u; y = F - r; c = pCell(g, x, y);
    if (v < 0) continue;
    if (v === MAT.EMPTY) {
      /* (the inside, and round it, clear: a bush can be cleared, a wall cannot) */
      if (hDomeOuter(u, r) && !AIRY[c]) { if (!mClear(g, x, y, c) || bMarked(g, x, y)) return null; plan.push(bE(g, x, y, MAT.EMPTY, 0)); }
      continue;
    }
    if (!AIRY[c] && !B_DIG[c]) return null;
    if (bMarked(g, x, y)) return null;
    var ph = hDomePh(u, r);
    var e = bE(g, x, y, v, ph, v === MAT.DOOR ? Math.min(9, 10 - r) : 0);
    e.rx = 7; e.ru = 15;   /* (reached from inside it, leaning out) */
    plan.push(e);
  }
  return plan;
}
/* the watchtower's top is free: nothing of anybody's over it */
function hTowerFree(g, t) {
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (s !== t && s.x1 >= t.x0 - 2 && s.x0 <= t.x1 + 2 && s.y1 >= t.T - 14 && s.y0 <= t.T - 1) return false;
  }
  return true;
}
function hPlanObs(g, p) {
  var T = mSites(g, "tower", true), best = null, bd = 1e9, k, t, plan, mid = wMiddle(g);
  for (k = 0; k < T.length; k++) {
    t = T[k];
    if (t.repair || !hTowerFree(g, t)) continue;
    plan = hDomePlan(g, t.x0 - 1, t.T, true);
    if (plan && Math.abs(t.cx - mid) < bd) { bd = Math.abs(t.cx - mid); best = { xl: t.x0 - 1, F: t.T, plan: plan, tower: t.id }; }
  }
  if (!best) {
    /* no tower: the highest ground there is, nine wide and level */
    /* (on rough ground, a terrace of stone under the low side, and the high side dug down to it) */
    var r = wPlot(g, { w: 10, sky: 16, rough: 8, near: mid, pad: 2, fit: function (g, x0, gy, hi, lo) {
      var b = null;
      for (var F = lo; F >= hi; F--) {
        var t = wTerrace(g, x0, gy, F);
        if (!t) continue;
        var pl = hDomePlan(g, x0, F, false);
        if (pl && (!b || t.work < b.work)) b = { plan: t.plan.concat(pl), F: F, work: t.work, score: 200 - F * 3 - t.work };
      }
      return b;
    } });
    if (!r) return false;
    best = { xl: r.x0, F: r.r.F, plan: wCleared(g, r, r.r.plan), tower: 0 };
  }
  var s = bNew(g, "observatory", p, wGild(g, best.plan), [best.xl, best.F - 13, best.xl + 9, best.F - 1],
               { wonder: true, xl: best.xl, F: best.F, tower: best.tower, astro: p.id, spot: best.xl + 5 });
  feed(g, p.name + " is building an observatory" + (best.tower ? " on top of the watchtower" : " on the highest ground there is"), "#ffd94a", "plan" + s.id);
  pSay(g, p, "planObs", true);
  if (bCarries(p)) bJoin(g, p, s);
  return true;
}
/* the astronomer's look: up to the telescope, a long look, the moon looked at, a constellation named, and the falling
   stars foretold if they are due */
function hTaskObserve(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || !s.done || s.repair || ++k.t > 3600) return iDone(p, false);
  if (hGo(g, p, k, "obs" + s.id, s.spot, s.F - 1, 1, 0)) return false;
  k.at = true; p.idle = 0; p.dir = 1; p.pose = "stand"; k.act++;
  if (k.act === 60) {
    g.moonLooks = (g.moonLooks || 0) + 1; s.looks = (s.looks || 0) + 1;
    hName(g, p);
    if (g.moonLooks >= H_MOON) wSpark(g, p, "moonrocket");   /* (the moon is a place: the rocket, below) */
  }
  if (k.act === 240 && s.showerT <= g.tick && !(s.shower > g.tick)) {
    s.shower = g.tick + H_FORETOLD; s.showerT = g.tick + H_SHOWER + irnd(H_SHOWER >> 1);
    pSay(g, p, "foretell", true);
    feed(g, pTitle(p.short) + " says there'll be falling stars tonight", "#c8e0ff", "foretell" + s.id);
  } else if (k.act === 150 && p.sayT <= 0) pSay(g, p, "observe");
  if (k.act > 420) { p.bored = 0; return iDone(p, true); }
  return true;
}
/* a constellation, named: a handful of real stars near one another, joined up for a while. sometimes after somebody
   lately dead */
function hName(g, p) {
  var S = g.stars || [], k, a, best;
  if (S.length < 5) return;
  var c = S[irnd(S.length)], cx = c.i % g.gw, cy = (c.i / g.gw) | 0, pts = [c.i], used = {};
  used[c.i] = 1;
  for (var n = 0; n < 4; n++) {
    var lx = pts[pts.length - 1] % g.gw, ly = (pts[pts.length - 1] / g.gw) | 0;
    best = null; var bd = 1e9;
    for (k = 0; k < S.length; k++) {
      if (used[S[k].i]) continue;
      var x = S[k].i % g.gw, y = (S[k].i / g.gw) | 0, d = (x - lx) * (x - lx) + (y - ly) * (y - ly);
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > 45 * 45) continue;
      if (d < bd) { bd = d; best = S[k]; }
    }
    if (!best) break;
    used[best.i] = 1; pts.push(best.i);
  }
  if (pts.length < 3) return;
  var dead = g.dead && g.dead.length ? g.dead[g.dead.length - 1] : null, name;
  if (dead && Math.random() < 0.35) name = iShort(dead.name) + (Math.random() < 0.5 ? ", LOOKING DOWN" : "'S CHAIR");
  else name = H_NAMES[irnd(H_NAMES.length)];
  g.hConst = { pts: pts, name: name, until: g.tick + 600 };
  if (p.sayT <= 0 || Math.random() < 0.5) pSay(g, p, "that one's " + name.toLowerCase(), true);
}
/* the goings on, every W_STRIDE ticks: the astronomer up for a look now and then; the shower, when it was foretold */
function hObsStep(g, s) {
  if (!s.done || s.repair) return;
  var k, q;
  if (g.tick >= (s.lookT || 0) && !mCrew(g, "observe", s.id)) {
    /* the astronomer, if they are about and free; else the boredest of the idle, who is the astronomer now */
    var a = hWho(g, s.astro);
    if (!a || !wIdle(g, a)) {
      a = null;
      for (k = 0; k < g.peasants.length; k++) { q = g.peasants[k]; if (wIdle(g, q) && Math.abs(q.x - s.cx) < 240 && (!a || q.bored > a.bored)) a = q; }
      if (a && (!hWho(g, s.astro) || g.tick > s.lookT + 3000)) s.astro = a.id;
      else a = null;
    }
    if (a) { a.task = { kind: "observe", site: s.id, t: 0, act: 0 }; s.lookT = g.tick + 2400 + irnd(1200); }
  }
  /* the shower: streaks across the sky for a while, the idle stop to watch, and one in three drops a meteorite */
  if (s.shower && g.tick >= s.shower) {
    s.shower = 0;
    s.showers = (s.showers || 0) + 1;
    g.hShower = { t0: g.tick, until: g.tick + H_STREAKS, seed: irnd(1 << 20) };
    feed(g, "falling stars, as " + pTitle((hWho(g, s.astro) || { short: "the astronomer" }).short) + " said", "#c8e0ff", "foretell" + s.id);
    for (k = 0; k < g.peasants.length; k++) {
      q = g.peasants[k];
      if (wIdle(g, q)) q.task = { kind: "stargaze", until: g.tick + 300 + irnd(300), t: 0 };
    }
    if (Math.random() < 1 / 3) s.dropT = g.tick + 150 + irnd(300);
  }
  if (s.dropT && g.tick >= s.dropT) { s.dropT = 0; hMeteorite(g, -1); }
  /* a meteorite down, and nobody gone to it: the nearest idle */
  var R = g.hRock;
  if (R && R.down && !R.taken && !g.peasants.some(function (q) { return !q.dead && q.task && q.task.kind === "meteorite"; })) {
    var who = hIdlest(g, R.x, 260);
    if (who) who.task = { kind: "meteorite", t: 0, act: 0, brave: true };
  }
}
/* watching the falling stars: stand still, look up, and say so */
function hTaskStargaze(g, p, k) {
  if (g.tick > k.until || ++k.t > 900) { p.bored = 0; return iDone(p, true); }
  p.idle = 0; p.pose = "stand";
  if (p.sayT <= 0 && Math.random() < 0.01) pSay(g, p, "stars");
  return true;
}
/* the bored, when it stands: now and then up to have a look for themselves */
function hObsPick(g, p, hungry) {
  var s = mSites(g, "observatory", true)[0];
  if (!s || hungry || s.repair || p.bored < 600 || Math.abs(s.cx - p.x) > 220 || mCrew(g, "observe", s.id)) return false;
  if (Math.random() >= 0.04) return false;
  p.task = { kind: "observe", site: s.id, t: 0, act: 0 };
  return true;
}

/* -------------------------------------------------------------------
   METEORITES: a streak in from the side, a bang where it comes down,
   and a lump of iron with a nugget of gold in it, too hot to touch for
   a while. g.hRock = {x, y, vx, vy, tx, ty, down, cells}
   ------------------------------------------------------------------- */
/* where one may come down: on the ground, out in the open, nowhere near anybody's house */
function hRockOk(g, x) {
  if (x < 10 || x > g.gw - 11) return false;
  var y = hGround(g, x);
  if (y < 20 || !pSolid(g, x, y) || LIQUID[pCell(g, x, y)]) return false;
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (s.kind === "house" && x >= s.x0 - H_HOUSE_CLEAR && x <= s.x1 + H_HOUSE_CLEAR) return false;
    if (x >= s.x0 - 3 && x <= s.x1 + 3 && y >= s.y0 - 3 && y <= s.y1 + 3) return false;
  }
  return true;
}
/* a meteorite on its way down, to column x (or anywhere it may, x < 0). false if there is nowhere */
function hMeteorite(g, x) {
  if (x < 0) {
    var ok = [];
    for (var c = 10; c < g.gw - 10; c++) if (hRockOk(g, c)) ok.push(c);
    if (!ok.length) return false;
    x = ok[irnd(ok.length)];
  }
  var ty = hGround(g, x), side = x < g.gw / 2 ? 1 : -1, sx = x - side * 70;
  g.hRock = { x: sx, y: -4, tx: x, ty: ty, vx: (x - sx) / 90, vy: (ty + 4) / 90, down: false, cells: [] };
  g.fx.whoosh++;
  return true;
}
/* every tick, from wStep: the falling star, until it is down */
function hSkyTick(g) {
  var R = g.hRock;
  if (!R || R.down) return;
  R.x += R.vx; R.y += R.vy;
  var x = Math.floor(R.x), y = Math.floor(R.y);
  if (y >= 0 && y < g.gh) partAdd(g, PK_GLINT, R.x - R.vx * 2, R.y - R.vy * 2, -R.vx * 0.2, -R.vy * 0.2, 10 + irnd(10), SPARK_HOT[irnd(4)]);
  if (y < 0 || (y < R.ty - 1 && AIRY[pCell(g, x, y + 1)])) return;
  /* down: a bang (a small one), and the lump where it hit */
  R.x = x; R.y = Math.min(y, R.ty - 1);
  sandBoom(g, R.y * g.gw + x, 3, 1.2);
  hLump(g, R);
  R.down = true; R.t = g.tick;
  feed(g, "a falling star came down by " + hWhere(g, x) + ". it is still glowing", "#ffd27a", "meteorite");
}
/* somewhere a falling star came down by: the nearest of their things */
function hWhere(g, x) {
  var best = null, bd = 1e9;
  for (var k = 0; k < g.sites.length; k++) { var s = g.sites[k], d = Math.abs(s.cx - x); if (s.done && d < bd && s.kind !== "tunnel" && s.kind !== "quarry") { bd = d; best = s; } }
  return best ? bLabel(best) : "the edge of the valley";
}
/* the lump: fourteen cells of iron in a heap, with a cell of gold in the middle of it, all at 900 */
var H_LUMP = [2, 3, 4, 3, 2];
function hLump(g, R) {
  var x0 = Math.floor(R.x), k, n, x, y, j;
  R.cells = [];
  for (k = 0; k < 5; k++) {
    x = x0 + k - 2;
    if (x < 1 || x >= g.gw - 1) continue;
    y = mGroundNear(g, x, false, Math.floor(R.y)) - 1;
    if (y < 1) continue;
    for (n = 0; n < H_LUMP[k] && y > 0; n++, y--) {
      j = y * g.gw + x;
      if (!AIRY[g.m[j]] && g.m[j] !== MAT.FIRE) break;
      sandPlace(g, j, k === 2 && n === 1 ? MAT.GOLD : MAT.METAL);
      g.T[j] = 900; g.lat[j] = 0; heatAccept(g, j);
      R.cells.push(j);
    }
  }
  sparks(g, x0 + 0.5, R.y, 20, 1.2, SPARK_HOT, 14, 0.6);
}
/* to the meteorite: wait for it to cool, then into the pocket, a lump at a time: iron (as any loose metal is, a fifth
   of a bar a cell) and the gold */
function hTaskMeteorite(g, p, k) {
  var R = g.hRock;
  if (!R || !R.down || ++k.t > 6000) return iDone(p, false);
  var left = R.cells.filter(function (j) { return g.m[j] === MAT.METAL || g.m[j] === MAT.GOLD; });
  if (!left.length) {
    g.hRock = null;
    return iDone(p, true);
  }
  var x = Math.floor(R.x), y = hGround(g, x + (p.x < R.x ? -3 : 3)) - 1;
  if (hGo(g, p, k, "rock", x + (p.x < R.x ? -3 : 3), y, 1, 3)) return false;
  p.dir = R.x < p.x ? -1 : 1; p.idle = 0;
  var hot = 0;
  left.forEach(function (j) { hot = Math.max(hot, g.T[j]); });
  if (hot > 60) {
    k.wait = true; p.pose = "stand";
    if (p.sayT <= 0 && Math.random() < 0.02) pSay(g, p, "hot");
    return true;
  }
  k.wait = false; k.act++;
  p.pose = (k.act % 16) < 8 ? "chopA" : "chopB";
  if (k.act % 16 !== 8) return true;
  /* the top one first */
  left.sort(function (a, b) { return a - b; });
  var j0 = left[0];
  if (g.m[j0] === MAT.GOLD) {
    heatVanish(g, j0); p.gold = (p.gold || 0) + 1; g.found.gold = (g.found.gold || 0) + 1;
    pSay(g, p, "meteorite", true);
    if (!R.taken) { R.taken = true; feed(g, p.name + " dug a nugget of gold out of the falling star", "#ffd94a", "meteorite"); achieve(g, "meteorite"); }
  } else lTake(g, p, j0 % g.gw, (j0 / g.gw) | 0, false);
  return true;
}
/* the sky, drawn: falling stars in a shower, the one coming down, and the constellation of the night */
function hDrawSky(g) {
  var hot = 0, k, S = g.hShower;
  if (S && S.until > g.tick) {
    /* a few streaks at a time, each a short bright line going down and across, gone in a moment */
    var t = g.tick - S.t0;
    for (k = 0; k < 4; k++) {
      var slot = ((t + k * 23) / 40) | 0, f = ((t + k * 23) % 40) / 40, h = hHash(S.seed + slot, k);
      var x0 = 20 + h * (g.gw - 40), y0 = 6 + hHash(slot, S.seed + k) * 50, dir = h < 0.5 ? 1 : -1;
      var hx = x0 + dir * f * 40, hy = y0 + f * 18;
      for (var n = 0; n < 8; n++) hSkyPut(g, Math.round(hx - dir * n * 1.4), Math.round(hy - n * 0.6), n < 2 ? H_STREAK : H_STREAK2, 1 - n / 9);
      hot++;
    }
  }
  var C = g.hConst;
  if (C && C.until > g.tick && C.pts.length > 1) {
    var fade = Math.min(1, (C.until - g.tick) / 120) * 0.35;
    for (k = 1; k < C.pts.length; k++) hSkyLine(g, C.pts[k - 1] % g.gw, (C.pts[k - 1] / g.gw) | 0, C.pts[k] % g.gw, (C.pts[k] / g.gw) | 0, H_STAR, fade);
  }
  return hot;
}
/* only over open sky */
function hSkyPut(g, x, y, col, f) {
  if (x < 0 || y < 0 || x >= g.gw || y >= g.gh) return;
  var i = y * g.gw + x;
  if (g.m[i] !== MAT.EMPTY) return;
  g.px[i] = blend32(g.px[i], col, f); if (f > 0.5) g.gpx[i] = blend32(0xff000000, col, f * 0.6);
}
function hSkyLine(g, x0, y0, x1, y1, col, f) {
  var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (var s = 1; s < n; s++) hSkyPut(g, Math.round(x0 + (x1 - x0) * s / n), Math.round(y0 + (y1 - y0) * s / n), col, f);
}
var H_SLIT = hex32("#141826"), H_SLIT_D = hex32("#0c0e18"), H_DOME = hex32("#e4e0d4"), H_DOME_D = hex32("#a8a498");
var H_BRASS = hex32("#b8903a"), H_BRASS_HI = hex32("#e8c870"), H_BRASS_D = hex32("#7a5c22");
/* the dome's inside, dark; the dome itself whitewashed, with its ribs; the telescope in brass; the lens catching the light */
function hDrawObs(g, s) {
  var u, r, x, y, i;
  /* (the room under the dome dark; the inside of the dome itself its own white, but for the slit along the telescope) */
  for (r = 1; r <= 12; r++) for (u = 1; u <= 7; u++) if (hDomeInner(u, r)) {
    var slit = Math.abs((u - 3) - (r - 7)) <= 1 && r >= 7;
    wBack(g, s.xl + u, s.F - r, r >= 9 && !slit ? (u === 4 ? H_DOME_D : H_DOME) : ((u + r) & 1 ? H_SLIT : H_SLIT_D), r >= 9 && !slit ? 0.9 : 0.55);
  }
  for (r = 3; r <= 12; r++) for (u = 0; u <= 8; u++) {
    x = s.xl + u; y = s.F - r; i = y * g.gw + x;
    if (g.m[i] !== MAT.BRICK || !bMarked(g, x, y) || !hDomeOuter(u, r) || hDomeInner(u, r)) continue;
    g.px[i] = blend32(g.px[i], r >= 9 ? (u === 4 || u === 2 || u === 6 ? H_DOME_D : H_DOME) : H_DOME_D, r >= 9 ? 0.75 : 0.35);
  }
  for (var k = 0; k < H_TUBE.length; k++) {
    x = s.xl + H_TUBE[k][0]; y = s.F - H_TUBE[k][1];
    if (pCell(g, x, y) === MAT.GIRDER) wPut(g, x, y, k < 6 ? (k === 5 ? H_BRASS_HI : H_BRASS) : H_BRASS_D);
  }
  var lx = s.xl + 9, ly = s.F - 13;
  if (s.done && pCell(g, lx, ly) === MAT.GLASS && ((g.tick >> 4) % 9) === 0) wPut(g, lx, ly, H_GLOW, true);
  return 0;
}

/* -------------------------------------------------------------------
   THE LIGHTHOUSE
   ------------------------------------------------------------------- */
P_SAY.idea_lighthouse = ["somebody was out on that water in the dark. never again", "a light. a big one. on the water's edge",
  "a tower, with a lamp at the top that goes round", "so nobody drowns looking for the bank"];
P_SAY.planLight = ["a lighthouse, on the bank", "stripes. it has to have stripes", "a lamp on a tower. for the lake", "red and white, red and white"];
P_SAY.keep = ["the lamp wants oil", "up the stairs. well, the ladder", "keep the light going", "*glug glug*", "there. it'll see the night out"];
P_SAY.noOil = ["no oil in the tank", "the well's empty. the lamp will go out", "nothing to fill it with"];
P_SAY.dark = ["the light's gone out", "who was meant to fill it", "it's dark on the water", "not my job. was it my job?"];
P_SAY.beacon = ["the light! that way!", "swim for the light", "i can see the lighthouse"];
P_ACHIEVE.lighthouse = ["THE LIGHTHOUSE", "a striped tower on the lake, with a lamp that goes round. somebody followed the light in"];

wDef({
  id: "lighthouse",
  idea: { name: "the lighthouse", title: "THE LIGHTHOUSE", sub: "somebody was out on that water in the dark. never again", hint: "oil, glass, and a lake (a big one: you will have to give them one)",
          ready: function (g) { return !!g.know.oil && !!g.know.glass && !!g.know.masonry && !!g.hLake && g.hLake.n >= H_LAKE; } },
  achieve: ["THE LIGHTHOUSE", "a striped tower on the lake, with a lamp that goes round. it wants a barrel of oil now and then"],
  plan: hPlanLight,
  task: function (g, p, k) { return k.kind === "keep" ? hTaskKeep(g, p, k) : undefined; },
  step: hLightStep,
  air: hLightTick,
  draw: hDrawLight,
  finish: function (g, s, p) { feed(g, "the lighthouse is up. it wants a barrel of oil before it will shine", "#ffd94a", "plan" + s.id); s.keeper = s.keeper || (p ? p.id : 0); },
  label: function () { return "the lighthouse"; },
  readout: function (g, s) {
    if (!s.done) return "";
    var kp = hWho(g, s.keeper);
    if (!hLit(g, s)) return "dark" + (kp ? ". " + pTitle(kp.short) + " is the keeper" : "");
    return "lit: " + Math.ceil(s.fuel / 60) + "s of oil left" + (kp ? ". " + pTitle(kp.short) + " is the keeper" : "");
  },
  mood: function (g, p, k) { return k.kind === "keep" ? (p.barrel ? "is carrying a barrel of oil up the lighthouse" : "is fetching oil for the lighthouse") : ""; }
});
/* the biggest body of water in the valley: every so often, once a lighthouse could be thought of. {n, x0, x1, top, id}.
   (H_LBL is scratch for the one call: nothing in it is looked at afterwards) */
var H_LBL = null;
/* is the water at cell j one body of n cells or more (filled out from j, no further than it has to) */
function hBodyAtLeast(g, j, n) {
  var gw = g.gw, m = g.m, seen = {}, st = [j], c = 0, i;
  seen[j] = 1;
  while (st.length && c < n) {
    i = st.pop(); c++;
    var x = i % gw;
    if (x > 0 && !seen[i - 1] && WET[m[i - 1]]) { seen[i - 1] = 1; st.push(i - 1); }
    if (x < gw - 1 && !seen[i + 1] && WET[m[i + 1]]) { seen[i + 1] = 1; st.push(i + 1); }
    if (i >= gw && !seen[i - gw] && WET[m[i - gw]]) { seen[i - gw] = 1; st.push(i - gw); }
    if (i + gw < m.length && !seen[i + gw] && WET[m[i + gw]]) { seen[i + gw] = 1; st.push(i + gw); }
  }
  return c >= n;
}
function hLakeScan(g) {
  var n = g.m.length, gw = g.gw, m = g.m, k, j, st = [], id = 0, best = null;
  if (!H_LBL || H_LBL.length !== n) H_LBL = new Int32Array(n);
  H_LBL.fill(0);
  for (k = 0; k < n; k++) {
    if (H_LBL[k] || !WET[m[k]]) continue;
    id++;
    var c = 0, x0 = 1e9, x1 = -1, top = 1e9;
    st.length = 0; st.push(k); H_LBL[k] = id;
    while (st.length) {
      j = st.pop(); c++;
      var x = j % gw, y = (j / gw) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < top) top = y;
      if (x > 0 && !H_LBL[j - 1] && WET[m[j - 1]]) { H_LBL[j - 1] = id; st.push(j - 1); }
      if (x < gw - 1 && !H_LBL[j + 1] && WET[m[j + 1]]) { H_LBL[j + 1] = id; st.push(j + 1); }
      if (j >= gw && !H_LBL[j - gw] && WET[m[j - gw]]) { H_LBL[j - gw] = id; st.push(j - gw); }
      if (j + gw < n && !H_LBL[j + gw] && WET[m[j + gw]]) { H_LBL[j + gw] = id; st.push(j + gw); }
    }
    if (!best || c > best.n) best = { n: c, x0: x0, x1: x1, top: top, id: id };
  }
  g.hLake = best;
  return best;
}
/* every tick, from wStep: (on the stride) the lake looked at, the first swimmer in it given the idea; a bolt in the
   lantern */
function hLightTick(g) {
  if (g.tick % W_STRIDE) return;
  if (g.know.oil && g.know.glass && g.know.masonry && !g.know.lighthouse) {
    /* (looked at now and then; and whenever somebody is in the water and it has not been looked at lately) */
    var swim = g.peasants.some(function (q) { return !q.dead && q.swimming; });
    if (!g.hLake || g.tick - (g.hLakeT || 0) >= (swim ? 300 : 1200)) { hLakeScan(g); g.hLakeT = g.tick; }
    /* (whether the water they are in is a lake is looked at in the water as it is now: nothing kept off g, so a village
       loaded into a game that had another one open thinks what it would have thought) */
    if (swim) for (var k = 0; k < g.peasants.length; k++) {
      var p = g.peasants[k];
      if (p.dead || !p.swimming) continue;
      var j = (Math.floor(p.y) - 3) * g.gw + Math.floor(p.x);
      if (j >= 0 && j < g.m.length && WET[g.m[j]] && hBodyAtLeast(g, j, H_LAKE)) { wSpark(g, p, "lighthouse"); break; }
    }
  }
}
/* the lighthouse's plot: seven wide, on the bank of the biggest water, its door on the land side */
function hPlanLight(g, p) {
  var L = hLakeScan(g);
  if (!L || L.n < H_LAKE) return false;
  var r = wPlot(g, { w: 7, sky: 34, rough: 8, near: (L.x0 + L.x1) / 2, pad: 2, fit: function (g, x0, gy, hi, lo) {
    var side = x0 + 3 < (L.x0 + L.x1) / 2 ? 1 : -1, d = side > 0 ? L.x0 - (x0 + 6) : x0 - L.x1;
    if (d < 3 || d > 14 || Math.abs(lo - L.top) > 10) return null;
    var pl = hLightPlan(g, x0, gy, side);
    return pl ? { plan: pl.plan, Fr: pl.Fr, side: side, score: 40 - d * 2 - (lo - hi) } : null;
  } });
  if (!r || wSeals(g, r.r.plan, r.x0 - 1, r.x0 + 7)) return false;
  var F = r.r.Fr, G1 = F - 16;
  var s = bNew(g, "lighthouse", p, wGild(g, wCleared(g, r, r.r.plan)), [r.x0 - 1, G1 - 16, r.x0 + 7, F],
               { wonder: true, Fr: F, G1: G1, side: r.r.side, fuel: 0, keeper: p.id, spot: r.x0 + 4, lx: r.x0 + 3, ly: G1 - 12 });
  feed(g, p.name + " is building a lighthouse on the bank", "#ffd94a", "plan" + s.id);
  pSay(g, p, "planLight", true);
  if (bCarries(p)) bJoin(g, p, s);
  return true;
}
/* the plan: a level floor (made up under the low end), walls and a ladder up the inside to the gallery, a door on the
   land side; the gallery a cell out over the walls with iron rails; the watch room, iron-framed at the top; the lantern
   room on that, glass, two lamps and a reflector between them; a cap. {plan, Fr} or null */
function hLightPlan(g, x0, gy, side) {
  var Fr = Math.min.apply(null, gy), G1 = Fr - 16, plan = [], u, y, x, c, bad = false, dx = side > 0 ? x0 : x0 + 6;
  function put(u, y, v, ph, a) {
    var x = x0 + u, c = pCell(g, x, y);
    if (v === MAT.EMPTY) { if (!AIRY[c]) { if (!mClear(g, x, y, c) || bMarked(g, x, y)) bad = true; else plan.push(bE(g, x, y, MAT.EMPTY, 0)); } return; }
    if ((!AIRY[c] && !B_DIG[c] && !(y >= Fr && ROCK[c])) || bMarked(g, x, y)) { bad = true; return; }
    if (y >= Fr && ROCK[c]) return;   /* (rock where the floor goes is the floor) */
    var e = bE(g, x, y, v, ph, a);
    /* (the gallery's ends, and the cap, reached by leaning out from the gallery and the lantern) */
    if (u < 0 || u > 6 || y < G1 - 13) { e.rx = 7; e.ru = 17; }
    plan.push(e);
  }
  if (G1 - 16 < 4) return null;
  for (u = 0; u < 7; u++) { for (y = gy[u] - 1; y > Fr; y--) put(u, y, MAT.BRICK, 1); put(u, Fr, MAT.BRICK, 2); }
  for (y = Fr - 1; y > G1; y--) {
    var ph = 10 + Fr - y;
    for (u = 1; u <= 3; u++) put(u, y, MAT.LADDER, ph, u - 1);
    put(4, y, MAT.EMPTY); put(5, y, MAT.EMPTY);
    for (u = 0; u <= 6; u += 6) {
      if (x0 + u === dx && y >= Fr - 9) put(u, y, MAT.DOOR, ph, Math.min(9, y - (Fr - 9) + 1));
      else put(u, y, MAT.BRICK, ph);
    }
  }
  ph = 10 + Fr - G1;
  for (u = 1; u <= 3; u++) put(u, G1, MAT.LADDER, ph, u - 1);
  [-1, 0, 4, 5, 6, 7].forEach(function (u) { put(u, G1, MAT.BRICK, ph + 1); });
  for (y = G1 - 1; y >= G1 - 2; y--) { put(-1, y, MAT.GIRDER, ph + 2); put(7, y, MAT.GIRDER, ph + 2); }
  for (var r = 1; r <= 9; r++) {
    for (u = 1; u <= 5; u++) put(u, G1 - r, MAT.EMPTY);
    put(0, G1 - r, r <= 6 ? MAT.BRICK : MAT.GIRDER, ph + 2 + r); put(6, G1 - r, r <= 6 ? MAT.BRICK : MAT.GIRDER, ph + 2 + r);
  }
  ph += 12;
  for (u = 0; u <= 6; u++) put(u, G1 - 10, MAT.BRICK, ph);
  for (y = G1 - 11; y >= G1 - 13; y--) { put(1, y, MAT.GLASS, ph + 1); put(5, y, MAT.GLASS, ph + 1); }
  put(2, G1 - 11, MAT.LAMP, ph + 2); put(4, G1 - 11, MAT.LAMP, ph + 2); put(3, G1 - 11, MAT.GOLD, ph + 2);
  for (u = 2; u <= 4; u++) for (y = G1 - 13; y <= G1 - 12; y++) put(u, y, MAT.EMPTY);
  for (u = 1; u <= 5; u++) put(u, G1 - 14, MAT.BRICK, ph + 3);
  for (u = 2; u <= 4; u++) put(u, G1 - 15, MAT.BRICK, ph + 4);
  put(3, G1 - 16, MAT.BRICK, ph + 5);
  return bad ? null : { plan: plan, Fr: Fr };
}
/* lit: oil in it, and its lamps still there */
function hLit(g, s) {
  return !!s && s.done && !s.repair && s.fuel > 0 && (pCell(g, s.lx - 1, s.ly + 1) === MAT.LAMP || pCell(g, s.lx + 1, s.ly + 1) === MAT.LAMP);
}
function hLights(g) { var out = []; for (var k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "lighthouse" && hLit(g, g.sites[k])) out.push(g.sites[k]); return out; }
/* the beam, this tick: which way it points (-1, 1) and how far it reaches. it goes round, so from the side it sweeps
   out one way, shortens to a flash, and sweeps out the other */
function hBeamNow(g, s) { var c = Math.cos(g.tick * 0.0125 + s.id); return { d: c < 0 ? -1 : 1, L: 12 + Math.abs(c) * 90, c: Math.abs(c) }; }
/* is (x, y) in the beam of a lit lighthouse just now: lamplight, for thinking by (ideas.js iLampNear) */
function hBeamLit(g, x, y) {
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (s.kind !== "lighthouse" || !hLit(g, s)) continue;
    var b = hBeamNow(g, s), d = (x - s.lx) * b.d;
    if (d < 2 || d > b.L) continue;
    var cy = s.ly + 1 + d * 0.12, hw = 2 + d * 0.09;
    if (Math.abs(y - 4 - cy) <= hw + 4) return true;
  }
  return false;
}
/* a swimmer in trouble, within sight of a lit lighthouse: that way (peasants.js pSwim). 0 if there is none */
function hBeacon(g, p) {
  var best = null, bd = H_BEAM;
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (s.kind !== "lighthouse" || !hLit(g, s)) continue;
    var d = Math.abs(s.cx - p.x);
    if (d < bd) { bd = d; best = s; }
  }
  if (!best || bd < 3) return 0;
  if (p.sayT <= 0 && Math.random() < 0.01) pSay(g, p, "beacon");
  return best.cx < p.x ? -1 : 1;
}
/* the keeper: a barrel from the well's tank, up the ladder, into the lamp */
function hTaskKeep(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || !s.done || s.repair || ++k.t > 6000) return iDone(p, false);
  var b = hFetchBarrel(g, p, k);
  if (b < 0) { if (p.sayT <= 0) pSay(g, p, "noOil"); s.noOil = g.tick + 1200; return iDone(p, false); }
  if (b === 0) return false;
  if (hGo(g, p, k, "keep" + s.id, s.spot, s.G1 - 1, 1, 0)) return false;
  p.dir = s.lx < p.x ? -1 : 1; p.idle = 0; k.act++;
  p.pose = (k.act % 16) < 8 ? "hammerA" : "stand";
  if (k.act === 20 && p.sayT <= 0) pSay(g, p, "keep");
  if (k.act < 60) return true;
  var was = hLit(g, s);
  p.barrel = 0; s.fuel += H_BARREL; s.barrels = (s.barrels || 0) + 1; s.keeper = p.id;
  if (!was && hLit(g, s)) {
    if (!s.everLit) {
      s.everLit = g.tick;
      feed(g, "the lighthouse is lit. its beam goes round over the water", "#ffd94a", "light" + s.id);
      /* (and somebody out there sees it: once, the first time) */
      if (g.popGoal != null && !g.hLightFame) { g.hLightFame = 1; g.popGoal++; feed(g, "somebody followed the light in", "#ffd94a", "lightfame"); }
    } else feed(g, "the lighthouse is lit again. " + pTitle(p.short) + " saw to it", "#ffd94a", "light" + s.id);
  }
  p.bored = 0;
  return iDone(p, true);
}
/* every W_STRIDE ticks: the oil burns down; the keeper goes for another barrel in good time; and going dark is news */
function hLightStep(g, s) {
  if (!s.done || s.repair) return;
  var lit = hLit(g, s);
  if (lit) { s.fuel = Math.max(0, s.fuel - W_STRIDE); s.wasLit = true; }
  if (!hLit(g, s) && s.wasLit) {
    s.wasLit = false;
    var kp = hWho(g, s.keeper) || lAlive(g, s.keeper);
    feed(g, "the lighthouse has gone dark. " + (kp ? pTitle(kp.short) + " was meant to see to it" : "nobody was seeing to it"), "#c8d0dc", "light" + s.id);
    if (kp) pSay(g, kp, "dark", true);
  }
  if (s.fuel < H_LOW && !(s.noOil > g.tick) && !mCrew(g, "keep", s.id)) {
    var q = hWho(g, s.keeper);
    if (!q || !wIdle(g, q) || !oTankFor(g, q, 1)) q = hIdlest(g, s.cx, 260, null, function (c) { return !!oTankFor(g, c, 1); });
    if (q) { q.task = { kind: "keep", site: s.id, t: 0, act: 0 }; s.keeper = q.id; }
  }
  /* (a bolt in the lantern, with oil up there: the oil catches, and the fire is at the top of a tower) */
  for (var k = 0; k < g.bolts.length; k++) {
    var B = g.bolts[k], e = B.pts[B.pts.length - 1];
    if (B.hSeen || !e) continue;
    B.hSeen = 1;
    if (s.fuel > 0 && e[0] >= s.x0 - 1 && e[0] <= s.x1 + 1 && e[1] >= s.ly - 6 && e[1] <= s.ly + 3) hLanternFire(g, s);
  }
}
function hLanternFire(g, s) {
  for (var u = -1; u <= 1; u++) for (var y = s.ly - 1; y <= s.ly + 1; y++) {
    var j = y * g.gw + s.lx + u;
    if (AIRY[g.m[j]]) { sandPlace(g, j, y === s.ly + 1 ? MAT.OIL : MAT.FIRE); heatAccept(g, j); }
    else if (g.m[j] === MAT.LAMP) { heatBecome(g, j, MAT.FIRE); heatAccept(g, j); }
  }
  s.fuel = 0;
  feed(g, "lightning hit the lighthouse. the oil up there has caught", "#ff9a6a", "light" + s.id);
}
var H_BAND = hex32("#b8322a"), H_BEAM_C = hex32("#fff4c8"), H_WHITE = hex32("#e8e4dc"), H_WHITE_D = hex32("#c8c4bc"), H_WIN = hex32("#1a1e2c");
/* the shaft is a solid round tower, whitewashed and banded red (what is inside it is seen only in the windows); the stripes
   go across the stonework too; the beam goes round */
function hDrawLight(g, s) {
  var y, u, i, x, hot = 0, x0 = s.x0 + 1;
  for (y = s.G1 - 15; y < s.Fr; y++) {
    var red = ((s.Fr - y) >> 2) % 2 === 1;
    for (u = -1; u <= 7; u++) {
      x = x0 + u; i = y * g.gw + x;
      if (i < 0 || i >= g.m.length) continue;
      var c = g.m[i];
      if (y > s.G1 && u >= 1 && u <= 5 && (c === MAT.EMPTY || c === MAT.LADDER) && bMarked(g, x0, y)) {
        /* (a window up the side every so often, lit from inside if anybody is on the ladder) */
        var win = u === 3 && ((s.Fr - y) % 8 === 5 || (s.Fr - y) % 8 === 6);
        g.px[i] = win ? H_WIN : (red ? blend32(H_BAND, 0xff000000, u === 1 || u === 5 ? 0.15 : 0) : (u === 1 || u === 5 ? H_WHITE_D : H_WHITE));
      } else if (c === MAT.BRICK && bMarked(g, x, y)) g.px[i] = red ? blend32(g.px[i], H_BAND, 0.7) : blend32(g.px[i], H_WHITE, 0.55);
    }
  }
  if (!hLit(g, s)) return 0;
  var b = hBeamNow(g, s), x, d, f;
  /* (the lamp itself, bright; brightest when the beam points this way) */
  for (u = -1; u <= 1; u++) wPut(g, s.lx + u, s.ly + 1, blend32(H_BEAM_C, 0xffffffff, b.c < 0.3 ? 0.8 : 0.2), true);
  for (d = 2; d <= b.L; d++) {
    x = s.lx + b.d * d;
    if (x < 0 || x >= g.gw) break;
    var cy = s.ly + 1 + d * 0.12, hw = 1 + d * 0.06;
    f = 0.5 * (1 - d / (b.L + 1)) * (0.6 + 0.4 * b.c);
    for (y = Math.round(cy - hw); y <= Math.round(cy + hw); y++) {
      if (y < 0 || y >= g.gh) continue;
      i = y * g.gw + x;
      if (g.m[i] !== MAT.EMPTY && !WET[g.m[i]]) continue;
      g.px[i] = blend32(g.px[i], H_BEAM_C, f);
      if (d < 40) g.gpx[i] = blend32(0xff000000, H_BEAM_C, f * 0.8);
    }
    hot++;
  }
  return hot ? 1 : 0;
}

/* -------------------------------------------------------------------
   THE FOUNDRY
   u across from the left tap's side (-1..14), h up from the ground
   (-4..13): the chamber in the middle (3 x 7, firebrick round it, brick
   round that), the moulds sunk in the ground either side of it under a
   brick cover, a cell down and across from each tap
   ------------------------------------------------------------------- */
var H_FW = 12;              /* the foundry, across (and its founder stands a column or two out, either side) */
var H_CHARGE = 10;          /* cells of iron to a charge: two bars */
var H_RUN = 0.7;            /* "mostly running": tapped when this much of it is liquid */
var H_POURED = 1500;        /* ticks to let it run out, the bellows still going, before the plug goes back in */
var H_FIRE = 10;            /* coals kept burning in the chamber, at most */
var H_PRISE = 100;          /* and it is prised out of the mould under this */

P_SAY.idea_foundry = ["the furnace makes a bar at a time. what if it made a ship", "a bigger furnace. MUCH bigger", "pour the iron. into a shape",
  "what if the iron ran like water"];
P_SAY.planFoundry = ["a foundry, by the furnace", "firebrick. lots of firebrick", "a chamber, a door, a tap", "we'll cast plates"];
P_SAY.charge = ["iron in", "coal on top", "a layer of each", "*clunk* *clunk*", "two bars of it"];
P_SAY.bellows = ["*whoomf* *whoomf*", "pump, pump", "hotter", "feed it", "it's roaring now", "keep it going"];
P_SAY.tap = ["TAP IT", "stand back!", "here it comes", "out of the way of the mould"];
P_SAY.poured = ["look at it go", "like honey. hot honey", "it's in the mould", "don't step in that"];
P_SAY.prise = ["plates!", "flat as you like", "it's set. out it comes", "still warm. mind"];
P_SAY.bell = ["a bell! for the rocket", "it rang when it came out", "one engine bell"];
P_ACHIEVE.foundry = ["THE FOUNDRY", "a firebrick chamber, a bellows, two moulds. iron poured like water, and set as plates"];

wDef({
  id: "foundry",
  idea: { name: "the foundry", title: "THE FOUNDRY", sub: "the furnace makes a bar at a time. what if it made a ship", hint: "iron tools, concrete, and a furnace worked hard",
          ready: function (g) { return !!g.know.forge && !!g.know.concrete && (g.iron || 0) >= 60 && mSites(g, "furnace", true).length > 0; } },
  achieve: ["THE FOUNDRY", "a firebrick chamber, a bellows, two moulds. iron poured like water, and set as plates"],
  plan: hPlanFoundry,
  task: function (g, p, k) { return k.kind === "found" ? hTaskFound(g, p, k) : undefined; },
  step: hFoundryStep,
  air: hFoundryTick,
  partOfIt: hInTheChamber,
  draw: hDrawFoundry,
  finish: function (g, s, p) { feed(g, "the foundry is built. it wants iron, a good deal of coal, and somebody at the bellows", "#ffd94a", "plan" + s.id); s.founder = s.founder || (p ? p.id : 0); },
  label: function () { return "the foundry"; },
  readout: function (g, s) {
    if (!s.done) return "";
    var c = hChamber(g, s);
    if (s.phase === 2) return (c.liq + c.met ? Math.round(100 * c.liq / (c.liq + c.met)) + "% running" : "heating") + ", " + Math.round(c.hi) + "°" + (c.liq / Math.max(1, c.liq + c.met) >= H_RUN ? ". mostly running" : "");
    if (s.phase === 3) return "pouring into the " + (s.mould === "bell" ? "bell mould" : "plate mould");
    if (s.phase === 4) return "setting in the " + (s.mould === "bell" ? "bell mould" : "plate mould") + ", " + Math.round(hMouldHot(g, s)) + "°";
    if (s.phase === 1) return "being charged";
    return (s.casts ? s.casts + " pour" + (s.casts > 1 ? "s" : "") + " so far. " : "") + (hFoundryWant(g, s) ? "wanted: " + hFoundryWant(g, s) : "cold. nothing wants casting");
  },
  mood: function (g, p, k) {
    if (k.kind !== "found") return "";
    var s = bSite(g, k.site);
    if (!s) return "";
    return ["is going to the foundry", "is charging the foundry", "is working the bellows at the foundry", "is watching the iron pour",
            "is waiting for the iron to set", "is prising plates out of the mould"][s.phase] || "is at the foundry";
  }
});
/* (iron made at the furnace: counted on whoever made it, for the foundry's idea. mines.js) */
function hSmelted(g, p) {
  p.smelts = (p.smelts || 0) + 1;
  if (g.know.foundry || !g.know.forge || !g.know.concrete) return;
  var best = null;
  for (var k = 0; k < g.peasants.length; k++) { var q = g.peasants[k]; if (!q.dead && (!best || (q.smelts || 0) > (best.smelts || 0))) best = q; }
  wSpark(g, best, "foundry");
}
function hFX(s, u) { return s.xf + u; }
function hFY(s, h) { return s.R0 - h; }
function hFJ(g, s, u, h) { return (s.R0 - h) * g.gw + s.xf + u; }
/* what goes at (u, h): a material, EMPTY for something kept clear, or -1 for nothing of ours (the ground as it is) */
function hFoundryCell(u, h) {
  var FB = MAT.FIREBRICK, BR = MAT.BRICK, E = MAT.EMPTY;
  /* the chamber, its lining (a plug each side at the foot, the door at the top), the casing, and a short chimney */
  /* (its floor is a V, high in the middle: what runs, runs to one tap or the other, and lies in a hot corner by it) */
  if (u >= 6 && u <= 8 && h >= 1 && h <= 7 && !(u === 7 && h === 1)) return E;
  if (u >= 5 && u <= 9 && h >= 0 && h <= 8) return FB;
  if ((u === 4 || u === 10) && h >= 2 && h <= 9) return FB;   /* (a brick casing would run: it gets as hot as the lining, in the end) */
  if (u >= 5 && u <= 9 && h === 9) return FB;
  if ((u === 6 || u === 8) && h >= 10 && h <= 13) return BR;
  if (u === 7 && h >= 10 && h <= 13) return E;
  /* the plate mould, sunk a cell: five long and two deep, right up against the left tap (lava this thick will not run far) */
  if (u >= 0 && u <= 4 && (h === 0 || h === 1)) return E;
  if (u >= -1 && u <= 5 && h === -1) return FB;
  if (u === -1 && h >= 0 && h <= 2) return FB;
  /* the bell mould, sunk under the stack: a cup three by three (what there is to spare goes to the plates) */
  if (u >= 7 && u <= 9 && h >= -3 && h <= -1) return E;
  if (u >= 6 && u <= 10 && h === -4) return FB;
  if ((u === 6 || u === 10) && h >= -3 && h <= -1) return FB;
  if (u >= -1 && u <= 10 && h >= 1 && h <= 9) return E;   /* (room to work) */
  return -1;
}
/* the plan on ground gy at x0 (u -1..10 across; its founder stands a column or two out from it, either side): level, the
   moulds sunk under its floor, the high ground dug off and the low made up. {plan, R0, score} or null */
function hFoundryFit(g, x0, gy, hi, lo) {
  var r = hBestLevel(g, x0, gy, hi, lo, function (R0) {
    return hLevel(g, x0, gy, -1, 10, R0, -4, 13, hFoundryCell, function (u, h) { return h <= -1 ? 1 : (h === 0 ? 2 : 10 + h); },
                  { dress: function (e, u, h) { if (h <= -1) e.rd = 6; } });
  });
  return r ? { plan: r.plan, R0: r.R0, score: 30 - r.work * 0.2 } : null;
}
function hPlanFoundry(g, p) {
  var f = mSites(g, "furnace", true)[0];
  var r = wPlot(g, { w: H_FW, sky: 16, rough: 12, near: f ? f.cx : wMiddle(g), pad: 2, fit: hFoundryFit });
  if (!r) return false;
  var s = hFoundryAt(g, p, r.x0, r.r.R0, wCleared(g, r, r.r.plan));
  feed(g, p.name + " is building a foundry by the furnace", "#ffd94a", "plan" + s.id);
  pSay(g, p, "planFoundry", true);
  if (bCarries(p)) bJoin(g, p, s);
  return true;
}
function hFoundryAt(g, p, x0, R0, plan) {
  var s = bNew(g, "foundry", p, plan, [x0, R0 - 13, x0 + H_FW - 1, R0 + 3], { wonder: true, xf: x0 + 1, R0: R0, phase: 0, founder: p ? p.id : 0, casts: 0 });
  var cells = [];
  for (var h = 1; h <= 7; h++) for (var u = 6; u <= 8; u++) if (h > 1 || u !== 7) cells.push(hFJ(g, s, u, h));
  s.cells = cells;
  return s;
}
/* how hot the liquid iron in the chamber is, on the whole */
function hLavaT(g, s) { var t = 0, n = 0; for (var k = 0; k < s.cells.length; k++) if (g.m[s.cells[k]] === MAT.LAVA) { t += g.T[s.cells[k]]; n++; } return n ? t / n : 0; }
/* what is in the chamber: liquid iron, solid iron, burning coal, ash, and how hot the hottest of it is */
function hChamber(g, s) {
  var o = { liq: 0, met: 0, emb: 0, ash: 0, hi: AMBIENT, gap: 0 };
  for (var k = 0; k < s.cells.length; k++) {
    var j = s.cells[k], c = g.m[j];
    if (c === MAT.LAVA && g.aux[j] === MAT.METAL) o.liq++;
    else if (c === MAT.METAL) o.met++;
    else if (c === MAT.EMBER || c === MAT.COAL) o.emb++;
    else if (c === MAT.ASH) o.ash++;
    else if (AIRY[c] || c === MAT.FIRE) o.gap++;
    if (g.T[j] > o.hi) o.hi = g.T[j];
  }
  return o;
}
/* the mould being poured into: its cells (and, for the bell, which are the cup and which the lip) */
function hMould(g, s, which) {
  var out = [], u, h;
  /* (in the order it fills: from the bottom, from the tap's end) */
  if (which === "bell") { for (h = -3; h <= -1; h++) for (u = 7; u <= 9; u++) out.push(hFJ(g, s, u, h)); }
  else for (h = 0; h <= 1; h++) for (u = 4; u >= 0; u--) out.push(hFJ(g, s, u, h));
  return out;
}
function hMouldHot(g, s) { var t = AMBIENT; hMould(g, s, "plate").concat(hMould(g, s, "bell")).forEach(function (j) { if (g.m[j] === MAT.METAL || g.m[j] === MAT.LAVA) t = Math.max(t, g.T[j]); }); return t; }
function hMouldFull(g, s, which) { return hMould(g, s, which).some(function (j) { return !AIRY[g.m[j]]; }); }
/* what the foundry is wanted for: plates, or an engine bell, for a great work going up (more than is in pockets) */
function hFoundryWant(g, s) {
  var bell = 0, plate = 0;
  for (var k = 0; k < g.sites.length; k++) {
    var t = g.sites[k];
    if (!t.wonder || t.done) continue;
    bell += Math.max(0, bNeed(g, t, "bell")); plate += Math.max(0, bNeed(g, t, "plate"));
  }
  bell -= wPocketed(g, "bell"); plate -= wPocketed(g, "plate");
  if (bell > 0.5) return "an engine bell";
  if (plate > 0.5) return Math.ceil(plate) + " plates";
  if (!s.casts && mIronToHand(g) >= 12) return "a first pour";   /* (to see that it works: once) */
  return "";
}
/* the plug of the tap for a mould, and where the founder stands to work it */
/* (at the foot of the chamber, the side of the mould: the bottom row is a bed of coal, kept burning, that the iron runs
   down onto, and out of) */
function hPlug(g, s) { return hFJ(g, s, s.mould === "bell" ? 9 : 5, 1); }
function hSpot(s) { return { x: s.xf + (s.mould === "bell" ? 17 : -3), y: s.R0 - 1 }; }
/* (whatever the ground is like out there, give or take a step or two) */
function hSpotAt(g, s) { var sp = hSpot(s), G = mGroundNear(g, sp.x, false, sp.y); if (G > 0 && Math.abs(G - 1 - sp.y) <= 4) sp.y = G - 1; return sp; }   /* (the bellows between them and the heat) */
/* every W_STRIDE ticks: a founder, when there is something to cast; and the pour put away when it has set */
function hFoundryStep(g, s) {
  if (!s.done || s.repair) return;
  if (s.phase === 0 && hFoundryWant(g, s)) {
    s.mould = hFoundryWant(g, s) === "an engine bell" && !hMouldFull(g, s, "bell") ? "bell" : (!hMouldFull(g, s, "plate") ? "plate" : (!hMouldFull(g, s, "bell") ? "bell" : ""));
    if (s.mould) s.phase = 1;
  }
  if (s.phase === 4 && hMouldHot(g, s) < H_PRISE) s.phase = 5;
  if (s.phase === 0 || s.phase === 4 || mCrew(g, "found", s.id)) return;
  /* the founder: whoever it was, if they are about; else whoever has worked the furnace most, of the idle */
  var q = hWho(g, s.founder);
  if (!q || !wIdle(g, q) || Math.abs(q.x - s.cx) > 260) {
    q = null;
    for (var k = 0; k < g.peasants.length; k++) { var c = g.peasants[k]; if (wIdle(g, c) && Math.abs(c.x - s.cx) < 260 && (!q || (c.smelts || 0) > (q.smelts || 0))) q = c; }
  }
  if (!q) return;
  q.task = { kind: "found", site: s.id, t: 0, act: 0, brave: true };
  s.founder = q.id;
}
/* a coal for the fire: their own, off the foundry's pile, off the furnace's, or off whoever has one */
function hCoal(g, p, s) {
  if ((p.coal || 0) >= 1) { p.coal--; return true; }
  if (s.stock && (s.stock.coal || 0) >= 1) { s.stock.coal--; return true; }
  var f = mSites(g, "furnace", true)[0];
  if (f && f.stock && (f.stock.coal || 0) >= 1) { f.stock.coal--; return true; }
  return iChipIn(g, "coal", 1) > 0;
}
/* the founder's shift: charge it (iron and coal in layers), work the bellows and keep the fire fed until it is mostly
   running, knock out the plug, let it run, put the plug back. then, once it has set, prise it out */
function hTaskFound(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || !s.done || s.repair || !s.phase || ++k.t > 9000) return iDone(p, false);
  var sp = hSpotAt(g, s);
  if (hGo(g, p, k, "found" + s.id + s.mould, sp.x, sp.y, 1, 1)) return false;
  p.dir = s.mould === "bell" ? -1 : 1; p.idle = 0; k.act++;   /* (at the bellows, facing the stack) */
  var c, j, n;
  if (s.phase === 1) {
    /* the charge: what iron is still in there from last time counts toward it; the rest in bars, in layers with coal */
    p.pose = (k.act % 20) < 10 ? "hammerA" : "hammerB";
    if (k.act < 60) return true;
    c = hChamber(g, s);
    var bars = Math.max(0, Math.ceil((H_CHARGE - c.met - c.liq) / 5));
    if (bars > 0 && (p.iron || 0) < bars) { var chip = iChipIn(g, "iron", bars - Math.floor(p.iron || 0), null, null, p); p.iron = (p.iron || 0) + chip; }
    bars = Math.min(bars, Math.floor(p.iron || 0));
    if (bars <= 0 && c.met + c.liq < 5) { if (p.sayT <= 0) pSay(g, p, "noiron"); s.phase = 0; return iDone(p, false); }
    var metal = bars * 5, put = 0;
    for (n = 0; n < s.cells.length; n++) {
      j = s.cells[n];   /* (bottom up) */
      if (g.m[j] === MAT.ASH) hRake(g, p, j);
      if (!AIRY[g.m[j]] && g.m[j] !== MAT.FIRE) continue;
      /* (a layer of iron, a layer of coal: every other cell, as near as the room in it allows) */
      if (metal > 0 && n >= 2 && (n % 2 === 0 || s.cells.length - n <= metal)) { sandPlace(g, j, MAT.METAL); metal--; put++; }
      else if (hCoal(g, p, s)) { sandPlace(g, j, MAT.EMBER); g.aux[j] = 1; }
      heatAccept(g, j);
    }
    /* (what there was no room for in the chamber goes back in their pocket: iron in is the iron that went in) */
    p.iron -= bars - metal / 5; s.bars = (s.bars || 0) + bars - metal / 5;
    g.fx.thud++;
    if (p.sayT <= 0) pSay(g, p, "charge");
    s.phase = 2; s.meltT = g.tick; k.act = 0;
    return true;
  }
  if (s.phase === 2 || s.phase === 3) {
    /* the bellows, and the fire fed through the door as it burns down (the ash raked out the same way) */
    p.pose = (k.act % 16) < 8 ? "hammerA" : "stand";
    if (s.phase === 3 || wClosed(g, s.cells)) wDraught(g, "found" + s.id, s.cells, 60);
    if (k.act % 10 === 0 && (s.phase === 2 || hChamber(g, s).met + hChamber(g, s).liq > 0)) {
      /* (the ash raked out; and a coal on wherever there is room for one, the bed first, while fewer than nine are burning) */
      var burning = hChamber(g, s).emb;
      for (n = 0; n < s.cells.length; n++) if (g.m[s.cells[n]] === MAT.ASH) hRake(g, p, s.cells[n]);
      /* (first where it will do most good, up against the iron that is still solid; then the bed; then anywhere) */
      for (var pass = 0; pass < 3; pass++) for (n = 0; n < s.cells.length && burning < H_FIRE; n++) {
        j = s.cells[n];
        if (!(AIRY[g.m[j]] || g.m[j] === MAT.FIRE || g.m[j] === MAT.SMOKE) || !hBelowIron(g, s, j)) continue;
        var by = g.m[j - 1] === MAT.METAL || g.m[j + 1] === MAT.METAL || g.m[j - g.gw] === MAT.METAL || g.m[j + g.gw] === MAT.METAL;
        if ((pass === 0 && !by) || (pass === 1 && n >= 2)) continue;
        if (!hCoal(g, p, s)) break;
        sandPlace(g, j, MAT.EMBER); g.aux[j] = 1; heatAccept(g, j); s.coals = (s.coals || 0) + 1; burning++;
      }
    }
    if (k.act % 200 === 50 && p.sayT <= 0) pSay(g, p, "bellows");
    c = hChamber(g, s);
    if (s.phase === 2) {
      /* (for a bell, all but a cell of it: a bell is cast whole, or it is plates) */
      var run = c.liq + c.met > 0 && (s.mould === "bell" ? c.met <= 1 : c.liq / (c.liq + c.met) >= H_RUN);
      if (run && !s.hold) {
        /* mostly running: the plug knocked through, and stand back. (the plug is a firebrick with a hole in it, and
           what comes out of the hole is drawn: the chamber stays shut, and its fire with it) */
        j = hPlug(g, s);
        /* (anything that has got into the moulds, sand blown in, a bit of glass, swept out first) */
        hMould(g, s, "plate").concat(hMould(g, s, "bell")).forEach(function (q) { var c = g.m[q]; if (!AIRY[c] && c !== MAT.METAL && c !== MAT.LAVA) heatVanish(g, q); });
        s.phase = 3; s.pourT = g.tick; s.casts++;
        pSay(g, p, "tap", true); g.fx.clang++;
        sparks(g, (j % g.gw) + 0.5, ((j / g.gw) | 0) + 0.5, 10, 0.8, SPARK_HOT, 10, 0.3, PK_GLINT);
        if (s.casts === 1) feed(g, p.name + " tapped the foundry. the iron runs like water", "#ffd27a", "found" + s.id);
      } else if (g.tick - s.meltT > 6000) { if (p.sayT <= 0) pSay(g, p, "nocoal"); return iDone(p, false); }
      return true;
    }
    /* pouring: it runs out of the tap and down into the mould, a cell at a time, and goes on running out while what is
       left melts; then the plug stopped up again. (iron this thick, out of a hole this small, would set in the hole: the
       stream is the hole's business, and is drawn) */
    if (k.act % 60 === 0 && p.sayT <= 0 && Math.random() < 0.3) pSay(g, p, "poured");
    if (k.act % 5 === 0 && hPourCell(g, s, p)) s.pourLast = g.tick;
    /* (all out; or nothing has run for a while, and what is left in there is not going to: it waits for the next charge) */
    if (c.liq + c.met === 0 || g.tick - s.pourT > H_POURED || (!c.liq && g.tick - Math.max(s.pourT, s.pourLast || 0) > 900)) {
      s.phase = 4; p.bored = 0;
      return iDone(p, true);
    }
    return true;
  }
  if (s.phase === 5) {
    /* set, and cool enough to handle: out it comes, a plate a cell (an engine bell, whole, if that is what it was) */
    p.pose = (k.act % 16) < 8 ? "chopA" : "chopB";
    if (k.act % 16 !== 8) return true;
    var M = hMould(g, s, "plate").concat(hMould(g, s, "bell")), cup = s.mould === "bell" ? hMould(g, s, "bell") : [];
    if (cup.length && cup.every(function (q) { return g.m[q] === MAT.METAL; }) && hFoundryWant(g, s) === "an engine bell") {
      cup.forEach(function (q) { heatVanish(g, q); });
      p.bell = (p.bell || 0) + 1; s.bells = (s.bells || 0) + 1;
      pSay(g, p, "bell", true);
      feed(g, p.name + " prised an engine bell out of the foundry's mould. cast whole", "#ffd27a", "bell" + s.id);
      return true;
    }
    for (n = 0; n < M.length; n++) if (g.m[M[n]] === MAT.METAL) break;
    if (n >= M.length) {
      s.phase = 0; p.bored = 0;
      /* (and anything that ran over into the drop, or set in the spout, with it) */
      return iDone(p, true);
    }
    heatVanish(g, M[n]);
    p.plate = (p.plate || 0) + 1; s.plates = (s.plates || 0) + 1;
    if (s.plates === 1) feed(g, p.name + " prised the first plate out of the foundry's mould", "#ffd27a", "plate");
    else if (p.sayT <= 0 && Math.random() < 0.2) pSay(g, p, "prise");
    return true;
  }
  return iDone(p, false);
}
P_SAY.noiron = ["no iron", "not a bar to be had", "we need iron for it"];
/* a cell of liquid iron out of the chamber (the lowest, the nearest the tap) and into the mould (the first room in it),
   heat and all */
function hPourCell(g, s, p) {
  var src = -1, best = -1e9, k, j, M = hMould(g, s, s.mould), tx = s.xf + (s.mould === "bell" ? 9 : 5);
  /* (ash that has floated out of the tap with it, skimmed off) */
  for (k = 0; k < M.length; k++) if (g.m[M[k]] === MAT.ASH) hRake(g, p, M[k]);
  if (g.m[hPlug(g, s)] === MAT.ASH) hRake(g, p, hPlug(g, s));
  for (k = 0; k < s.cells.length; k++) {
    j = s.cells[k];
    if (g.m[j] !== MAT.LAVA) continue;
    var sc = ((j / g.gw) | 0) * 10 - Math.abs(j % g.gw - tx);
    if (sc > best) { best = sc; src = j; }
  }
  if (src < 0) return false;
  /* (the bell's cup full, and some to spare: that goes to the plates, out of the other tap) */
  if (s.mould === "bell" && M.every(function (q) { return !AIRY[g.m[q]]; })) M = hMould(g, s, "plate");
  for (k = 0; k < M.length && !AIRY[g.m[M[k]]]; k++);
  if (k >= M.length) return false;
  j = M[k];
  /* (the melt and the air it goes into change places, each with its own heat: nothing made or lost in the pouring) */
  heatSync(g, src); heatSync(g, j);
  sandSwap(g, src, j);
  g.vy[j] = 0; g.vy[src] = 0;
  s.streamT = g.tick; s.streamTo = j;
  return true;
}
/* the ash out of the door, into a pocket (or the wind, if it is full): the valley's ash, as no campfire gives it */
function hRake(g, p, j) {
  heatVanish(g, j);
  if ((p.ash || 0) < L_POCKET.ash) { p.ash = (p.ash || 0) + 1; g.found.ash = (g.found.ash || 0) + 1; }
  if (p.sayT <= 0 && Math.random() < 0.1) pSay(g, p, "rake");
}
/* a gap in the chamber with no liquid iron over it to run into it: coal can go in there */
function hBelowIron(g, s, j) { var u = g.m[j - g.gw]; return !(u === MAT.LAVA); }
/* every tick, from wStep: nothing (the work is all in the founder's shift) */
function hFoundryTick(g) {}
/* a fire in the chamber is the foundry, not a fire: the brigade lets it be */
function hInTheChamber(g, s, f) {
  for (var k = 0; k < f.length; k++) {
    var u = f[k] % g.gw - s.xf, h = s.R0 - ((f[k] / g.gw) | 0);
    if (!(u >= -1 && u <= 13 && h >= -3 && h <= 14)) return false;
  }
  return true;
}
var H_BANDC = hex32("#4a4e58"), H_BELLOWS = hex32("#6a4a2a"), H_BELLOWS_D = hex32("#4a3218");
/* iron bands round the stack, the bellows at each spot, and smoke out of the chimney while it is lit */
function hDrawFoundry(g, s) {
  if (!s.done) return 0;
  var u, h, i, hot = 0;
  for (h = 3; h <= 7; h += 4) for (u = 4; u <= 10; u++) { i = hFJ(g, s, u, h); if (g.m[i] === MAT.BRICK) g.px[i] = blend32(g.px[i], H_BANDC, 0.7); }
  /* (the bellows: a leather bag between the boards, a nozzle to the stack, going in and out while somebody works it) */
  [[-2, 1], [16, -1]].forEach(function (b) {   /* (between the founder's place and the stack) */
    var bx = s.xf + b[0], d = b[1], by = s.R0 - 1, wk = mCrew(g, "found", s.id) && s.phase >= 2 && s.phase <= 3, puff = wk && ((g.tick >> 3) & 1);
    wBack(g, bx, by, H_BELLOWS_D); wBack(g, bx + d, by, H_BELLOWS_D);
    wBack(g, bx, by - 1, H_BELLOWS); if (!puff) wBack(g, bx + d, by - 1, H_BELLOWS);
    wBack(g, bx + 2 * d, by - 1, H_BANDC);
    wBack(g, bx, by - 2, H_BELLOWS_D); wBack(g, bx + d, by - 2, H_BELLOWS_D);
  });
  /* the tap knocked through, glowing, and the stream while it pours: from the tap down into the mould */
  if (s.phase === 3) { i = hPlug(g, s); wPut(g, i % g.gw, (i / g.gw) | 0, lavaCol(1600, MAT.METAL, SAND_PAL[MAT.LAVA][g.tick & 255]), true); hot++; }
  if (s.phase === 3 && g.tick - (s.streamT || 0) < 12) {
    var tx = s.xf + (s.mould === "bell" ? 10 : 4), ty = s.R0 - 1, ex = s.streamTo % g.gw, ey = (s.streamTo / g.gw) | 0;
    for (var t = 0; t <= 4; t++) { var X = Math.round(tx + (ex - tx) * t / 4), Y = Math.round(ty + (ey - ty) * t / 4); if (AIRY[pCell(g, X, Y)]) wPut(g, X, Y, lavaCol(1650, MAT.METAL, SAND_PAL[MAT.LAVA][(t * 37 + g.tick) & 255]), true); }
    hot++;
  }
  var c = hChamber(g, s);
  if (c.emb && c.hi > 500) {
    for (h = 10; h <= 13; h++) { i = hFJ(g, s, 7, h); if (g.m[i] === MAT.EMPTY) { g.px[i] = blend32(g.px[i], glowCol(c.hi), 0.3 * (14 - h) / 4); } }
    hot++;
  }
  return hot;
}

/* -------------------------------------------------------------------
   THE MOON ROCKET
   u across from x0 (0..12), h up from the ground at row R0: a concrete
   pad (h 1..2) with a firebrick trench under the engine; a ladder (u
   0..2) up to a walkway (h 16) on a girder leg (u 3) with arms; and the
   rocket (u 4..10, h 3..24): fins, the engine bell, a hollow shell of
   plates with a glass porthole, and a gilded nose
   ------------------------------------------------------------------- */
var H_RW = 13;              /* the pad, across */
var H_FUEL = 12;            /* barrels of oil in a rocket */
var H_CREW = 3;             /* aboard, at most */
var H_AWAY = 3000;          /* ticks on the moon (in space, as peasants.js has it) */
var H_WALK = 16;            /* the walkway's row, up from the ground */

P_SAY.idea_moonrocket = ["the astronomer says the moon is a place. a place is somewhere you can go", "a rocket pack. but for the moon",
  "plates, a bell, and all the oil we've got", "what if we went UP. and kept going"];
P_SAY.planRocket = ["a rocket. a real one", "a pad, a gantry, and a rocket on it", "to the moon", "flat ground. and nothing over it. for a long way"];
P_SAY.fuel = ["one more barrel for the rocket", "*slosh*", "it drinks oil", "nearly full", "heavy, heavy"];
P_SAY.board = ["see you", "don't wait up", "i packed a sandwich", "it's very small in here", "is this the moon end?"];
P_SAY.count = ["HERE WE GO", "hold on to something", "is it supposed to shake like that", "MUMMY"];
P_SAY.watchLaunch = ["ooh", "there it goes!", "LOOK AT IT", "they're really going", "bye!", "*gasp*"];
P_SAY.moon = ["i've seen it from up there. it's very small", "the moon is mostly dust", "i waved. did you see me wave",
  "it's quieter up there", "you can see the whole valley from the moon. it's tiny", "i left a flag"];
P_SAY.gantry = ["you can see everything from up here", "they went up from here", "it's a long way up", "the moon's up there. somebody's been"];
P_SAY.moonrock = ["moon rock. for the village", "it came from the moon. careful", "there. everybody can see it"];
P_ACHIEVE.moonrocket = ["THE MOON ROCKET", "a pad, a gantry, and a rocket of cast plates, with twelve barrels of oil in it"];

wDef({
  id: "moonrocket",
  idea: { name: "the moon rocket", title: "THE MOON ROCKET", sub: "the astronomer says the moon is a place. a place is somewhere you can go",
          hint: "the observatory, the foundry, and a few rocket-pack flights",
          ready: function (g) { return (g.moonLooks || 0) >= H_MOON && !!(g.wDone && g.wDone.foundry) && !!g.know.concrete && (g.packFlights || 0) >= 3 && (g.barrels || 0) >= 30; } },
  achieve: ["THE MOON ROCKET", "a pad, a gantry, and a rocket of cast plates. it wants twelve barrels of oil"],
  plan: hPlanRocket,
  pick: hRocketPick,
  task: function (g, p, k) {
    if (k.kind === "fuel") return hTaskFuel(g, p, k);
    if (k.kind === "board") return hTaskBoard(g, p, k);
    if (k.kind === "gantry") return hTaskGantry(g, p, k);
    if (k.kind === "moonrock") return hTaskMoonRock(g, p, k);
    return undefined;
  },
  step: hRocketStep,
  air: hRocketTick,
  sky: hDrawRocketSky,
  draw: hDrawRocket,
  drawOver: hDrawHelmets,
  finish: function (g, s, p) { feed(g, "the moon rocket is built. it wants " + H_FUEL + " barrels of oil", "#ffd94a", "plan" + s.id); },
  label: function () { return "the moon rocket"; },
  readout: function (g, s) {
    if (!s.done) return "";
    if (s.gone) return g.moonFlag ? "the gantry. there is a flag on the moon" : "gone up";
    if (s.count > 0) return "COUNTDOWN: " + s.count;
    if (s.crew && s.crew.length) return "fuelled. boarding";
    return (s.oil || 0) + " of " + H_FUEL + " barrels in it";
  },
  mood: function (g, p, k) {
    if (k.kind === "fuel") return p.barrel ? "is carrying a barrel of oil to the rocket" : "is fetching oil for the rocket";
    if (k.kind === "board") return "is going aboard the moon rocket";
    if (k.kind === "gantry") return "is up the gantry, looking at the moon";
    if (k.kind === "moonrock") return "is setting out the moon rock";
    if (k.kind === "audience" && k.of === "launch") return "is watching the rocket";
    return "";
  }
});
/* (a flight on a rocket pack: counted, on the one who flew and on the valley. oil.js) */
function hFlew(g, p) { g.packFlights = (g.packFlights || 0) + 1; p.flights = (p.flights || 0) + 1; }
/* what goes at (u, h), and whether it is part of the rocket itself (it leaves with it) */
function hRocketCell(u, h) {
  var P = MAT.METAL, FB = MAT.FIREBRICK;
  /* the pad and the trench */
  if (h === 0) return u >= 5 && u <= 9 ? FB : -1;
  if (h === 1 || h === 2) return u === 5 || u === 9 ? FB : (u >= 6 && u <= 8 ? MAT.EMPTY : MAT.CONCRETE);
  /* the gantry */
  if (u <= 2) return h <= H_WALK ? MAT.LADDER : MAT.EMPTY;
  if (u === 3) return h === H_WALK ? MAT.PLANK : (h <= 36 ? MAT.GIRDER : MAT.EMPTY);
  if (u === 4 && h === H_WALK) return MAT.PLANK;
  if (u === 4 && (h === 10 || h === 22 || h === 28 || h === 34 || h === 36)) return MAT.GIRDER;
  if (u === 5 && h === 36) return MAT.GIRDER;
  /* the rocket: fins, the bell, the floor of it, its sides, the porthole, the nose */
  if (h >= 3 && h <= 5 && u >= 6 && u <= 8) return "bell";
  if ((u === 4 || u === 10) && (h === 3 || h === 4)) return P;
  if ((u === 5 || u === 9) && h >= 3 && h <= 21) return P;
  if (h === 6 && u >= 6 && u <= 8) return P;
  if (h === 16 && u >= 6 && u <= 8) return u === 7 ? MAT.GLASS : P;
  if (h === 22 && u >= 6 && u <= 8) return P;
  if (h === 23 && u === 7) return P;
  if (h === 24 && u === 7) return MAT.GOLD;
  if (u >= 4 && u <= 10 && h >= 3 && h <= 24) return MAT.EMPTY;   /* (the inside of it, and round it) */
  return -1;
}
function hIsRocket(u, h) { return h >= 3 && h <= 24 && u >= 4 && u <= 10 && !(u === 4 && h === H_WALK) && !(u === 4 && (h === 10 || h === 22)); }
/* the plan on ground gy at x0: level (the high ground dug off, the low made up), clear sky over it to the top of the
   world */
function hRocketFit(g, x0, gy, hi, lo) {
  var r = hBestLevel(g, x0, gy, hi, lo, function (R0) {
    for (var u = 4; u <= 10; u++) for (var y = 0; y < R0 - 24; y++) if (!AIRY[pCell(g, x0 + u, y)]) return null;
    return hLevel(g, x0, gy, 0, H_RW - 1, R0, 0, 36, hRocketCell, function (u, h) { return h <= 2 ? 1 + h : (hIsRocket(u, h) ? 100 + h : 10 + h); },
                  { rockFloor: true, a: function (u, h, v) { return v === MAT.LADDER ? u : 0; },
                    dress: function (e, u, h, v) {
                      if (v === "bell") { e.res = "bell"; e.cost = 1 / 9; }
                      if (hIsRocket(u, h)) { e.rk = true; e.rx = 9; e.rd = 7; }
                      if (h > H_WALK + 12) e.ru = 21;
                    } });
  });
  return r ? { plan: r.plan, R0: r.R0, score: 30 - r.work * 0.2 } : null;
}
function hPlanRocket(g, p) {
  var r = wPlot(g, { w: H_RW, sky: 40, rough: 12, near: wMiddle(g), pad: 2, fit: hRocketFit });
  if (!r) return false;
  var s = hRocketAt(g, p, r.x0, r.r.R0, wGild(g, wCleared(g, r, r.r.plan)));
  feed(g, p.name + " is building a rocket. for the moon", "#ffd94a", "plan" + s.id);
  pSay(g, p, "planRocket", true);
  if (bCarries(p)) bJoin(g, p, s);
  return true;
}
function hRocketAt(g, p, x0, R0, plan) {
  return bNew(g, "moonrocket", p, plan, [x0, R0 - 36, x0 + H_RW - 1, R0], { wonder: true, R0: R0, oil: 0, rx: x0 + 7, walk: { x: x0 + 4, y: R0 - H_WALK - 1 } });
}
/* a barrel from the well's tank to the rocket's pile */
function hTaskFuel(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || !s.done || s.repair || s.gone || ++k.t > 6000) return iDone(p, false);
  var b = hFetchBarrel(g, p, k);
  if (b < 0) { s.noOil = g.tick + 1200; return iDone(p, false); }
  if (b === 0) return false;
  var fx = s.x0 + 11, fy = s.R0 - 3;
  if (hGo(g, p, k, "fuel" + s.id, fx, fy, 2, 2)) return false;
  p.barrel = 0; s.oil = (s.oil || 0) + 1;
  if (p.sayT <= 0) pSay(g, p, "fuel");
  if (s.oil === H_FUEL) feed(g, "the moon rocket is fuelled. " + H_FUEL + " barrels of oil in it, and a spark would do", "#ffd94a", "fuel" + s.id);
  return iDone(p, true);
}
/* the crew: up the ladder to the walkway, and in */
function hTaskBoard(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || !s.done || s.gone || !s.crew || s.crew.indexOf(p.id) < 0 || ++k.t > 4000) return iDone(p, false);
  /* (at the hatch: on the walkway, or anywhere up against the top of it, where whoever built the nose may still be) */
  var at = Math.abs(p.x - s.walk.x - 0.5) <= 2 && p.y <= s.walk.y + 0.5 && p.y >= s.walk.y - 8 && !p.climb;
  if (!at && hGo(g, p, k, "board" + s.id, s.walk.x, s.walk.y, 1, 0)) return false;
  /* aboard: in the shell, not drawn, and kept there (as in space) until it goes */
  p.aboard = s.id; p.task = null; p.state = "space"; p.spaceT = 0;
  p.x = s.rx + 0.5; p.y = s.R0 - 8; p.vx = p.vy = 0;
  pSay(g, p, "board", true);
  return false;
}
/* the rocket p is aboard, while it stands on its pad to be aboard (null: gone, or never theirs) */
function hAboardOf(g, p) {
  var s = bSite(g, p.aboard);
  return s && s.kind === "moonrocket" && !s.gone && s.crew && s.crew.indexOf(p.id) >= 0 ? s : null;
}
/* out of a rocket that is not there any more: down on the ground where they were, as they were before they got in */
function hDisembark(g, p) {
  var x = Math.max(1, Math.min(g.gw - 2, Math.floor(p.x))), G = mGround(g, x, false);
  p.aboard = 0; p.spaceT = 0; p.spaceX = null; p.task = null; p.vx = p.vy = 0;
  if (G > 0) { p.state = "walk"; p.y = G - 1; } else { p.state = "fly"; p.flyT = 0; }
  p.fallY = p.y;
}
/* the bored, now and then: up the gantry to look at the moon */
function hTaskGantry(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || !s.done || ++k.t > 3000 || (s.crew && s.crew.length)) return iDone(p, false);
  if (hGo(g, p, k, "gantry" + s.id, s.walk.x, s.walk.y, 1, 0)) return false;
  p.idle = 0; p.pose = "stand"; p.dir = (k.act >> 7) & 1 ? 1 : -1; k.act++;
  if (k.act === 40 && p.sayT <= 0) pSay(g, p, "gantry", true);
  if (k.act > 360) { p.bored = 0; return iDone(p, true); }
  return true;
}
function hRocketPick(g, p, hungry) {
  if (hungry) return false;
  /* back from the moon with moon rock: set out where everybody can see it */
  if ((p.moonrock || 0) > 0 && p.state === "walk" && !p.fromSpace) { p.task = { kind: "moonrock", t: 0, act: 0 }; return true; }
  var s = mSites(g, "moonrocket", true)[0];
  if (!s || s.repair || p.bored < 600 || Math.abs(s.cx - p.x) > 220 || mCrew(g, "gantry", s.id) || (s.crew && s.crew.length)) return false;
  if (Math.random() >= 0.03) return false;
  p.task = { kind: "gantry", site: s.id, t: 0, act: 0 };
  return true;
}
/* the moon rock, set out at the foot of the statue (or of the gantry, if there is no statue) */
function hTaskMoonRock(g, p, k) {
  if (!(p.moonrock > 0) || ++k.t > 4000) return iDone(p, false);
  var t = mSites(g, "statue", true)[0] || mSites(g, "moonrocket", true)[0];
  if (!t) { p.moonrock = 0; return iDone(p, false); }
  if (k.x == null) {
    /* the first bit of open ground beside it, out of anybody's way */
    for (var d = 2; d < 30 && k.x == null; d++) for (var sd = -1; sd <= 1 && k.x == null; sd += 2) {
      var x = Math.round(sd < 0 ? t.x0 - d : t.x1 + d), y = hGround(g, x);
      if (y > 0 && pSolid(g, x, y) && AIRY[pCell(g, x, y - 1)] && !bMarked(g, x, y - 1) && !bSiteAround(g, x, y - 1, null, 0)) { k.x = x; k.y = y - 1; }
    }
    if (k.x == null) { p.moonrock = 0; return iDone(p, false); }
  }
  if (hGo(g, p, k, "moonrock", k.x + (p.x < k.x ? -2 : 2), k.y, 1, 2)) return false;
  p.idle = 0; k.act++; p.pose = (k.act % 16) < 8 ? "eatB" : "stand";
  if (k.act < 40) return true;
  var j = k.y * g.gw + k.x;
  if (!AIRY[g.m[j]]) { k.x = null; return false; }
  sandPlace(g, j, MAT.MOONROCK); heatAccept(g, j);
  p.moonrock--; k.y--; k.act = 0;
  if (!g.hRockOut) { g.hRockOut = 1; feed(g, p.name + " set out the moon rock by " + bLabel(t) + ". it is mostly dust", "#e0e0f0", "moonrock"); }
  if (p.moonrock <= 0) { if (p.sayT <= 0) pSay(g, p, "moonrock"); return iDone(p, true); }
  return true;
}
/* the crew: the one who has flown most on a rocket pack, the astronomer, and whoever has had the most ideas */
function hCrew(g) {
  var crew = [], k, q, best;
  function ok(q) { return q && !q.dead && q.state === "walk" && crew.indexOf(q) < 0 && q.hunger < P_HUNGRY && !q.fire; }
  for (best = null, k = 0; k < g.peasants.length; k++) { q = g.peasants[k]; if (ok(q) && (q.flights || 0) > 0 && (!best || q.flights > best.flights)) best = q; }
  if (best) crew.push(best);
  var o = mSites(g, "observatory", true)[0], a = o ? hWho(g, o.astro) : null;
  if (ok(a)) crew.push(a);
  var th = iThinker(g);
  for (k = 0; k < g.peasants.length && crew.length < H_CREW; k++) { q = g.peasants[k]; if (ok(q) && q.short === th.name) crew.push(q); }
  /* (and to make up the numbers, whoever else has flown a rocket pack, most first; and at the least, somebody) */
  var fl = g.peasants.filter(function (q) { return ok(q) && (q.flights || 0) > 0; }).sort(function (a, b) { return b.flights - a.flights; });
  for (k = 0; k < fl.length && crew.length < H_CREW; k++) if (crew.indexOf(fl[k]) < 0) crew.push(fl[k]);
  for (k = 0; k < g.peasants.length && crew.length < 1; k++) if (ok(g.peasants[k])) crew.push(g.peasants[k]);
  return crew.slice(0, H_CREW);
}
/* every W_STRIDE ticks: fuel fetched; fuelled, the crew called and the countdown; a fire by it, the end of it */
function hRocketStep(g, s) {
  var k, q;
  if (!s.done || s.gone) return;
  /* a fire by a fuelled rocket: a very large firework */
  if ((s.oil || 0) > 0 && hRocketAlight(g, s)) { hRocketBoom(g, s); return; }
  if (s.repair) return;
  if ((s.oil || 0) < H_FUEL) {
    if (!(s.noOil > g.tick) && mCrew(g, "fuel", s.id) < 2) {
      q = hIdlest(g, s.cx, 260, null, function (c) { return !!oTankFor(g, c, 1); });
      if (q) q.task = { kind: "fuel", site: s.id, t: 0, act: 0 };
    }
    return;
  }
  if (!s.crew || !s.crew.length) {
    var C = hCrew(g);
    if (!C.length) return;
    s.crew = C.map(function (q) { return q.id; }); s.boardT = g.tick;
    C.forEach(function (q) { q.task = { kind: "board", site: s.id, t: 0, act: 0 }; });
    feed(g, "the moon rocket's crew: " + C.map(function (q) { return pTitle(q.short); }).join(", "), "#ffd94a", "crew" + s.id);
    return;
  }
  var aboard = 0, gone = [];
  for (k = 0; k < s.crew.length; k++) {
    q = lAlive(g, s.crew[k]);
    if (q && q.aboard === s.id) aboard++;
    /* (anybody who could not get up there in good time, or died on the way, is let off) */
    else if (!q || g.tick - s.boardT > 4000) gone.push(s.crew[k]);
    else if (q.state === "walk" && !(q.task && q.task.kind === "board")) q.task = { kind: "board", site: s.id, t: 0, act: 0 };
  }
  if (gone.length) s.crew = s.crew.filter(function (id) { return gone.indexOf(id) < 0; });
  if (!s.crew.length) return;
  if (!s.count && aboard === s.crew.length) {
    s.count = 10; s.countT = g.tick;
    wGather(g, s, { cap: 99, x: s.x0 < g.gw / 2 ? s.x1 + 28 : s.x0 - 28, y: hGround(g, s.x0 < g.gw / 2 ? s.x1 + 28 : s.x0 - 28) - 1, until: g.tick + 1400,
                    kind: "launch", face: s.x0 < g.gw / 2 ? -1 : 1, R: 260 });
  }
  if (s.count > 0 && g.tick - s.countT >= 60 * (11 - s.count)) {
    feed(g, s.count === 10 ? "THE MOON ROCKET: 10" : String(s.count), "#ffd94a", "count" + s.id);
    if (s.count === 3) mHouseOf(g, s).forEach(function (q) { if (Math.random() < 0.4) pSay(g, q, "watchLaunch", true); });
    if (--s.count === 0) hLiftOff(g, s);
  }
}
function mHouseOf(g, s) { return g.peasants.filter(function (q) { return !q.dead && q.task && q.task.kind === "audience" && q.task.site === s.id; }); }
/* fire, embers or something molten by the rocket (not in its trench, once it is going) */
function hRocketAlight(g, s) {
  for (var h = 0; h <= 26; h++) for (var u = 3; u <= 11; u++) {
    var c = pCell(g, s.x0 + u, s.R0 - h);
    if (c === MAT.FIRE || c === MAT.EMBER || c === MAT.LAVA || c === MAT.TORCH) return true;
  }
  return false;
}
/* up it goes: out of the grid (heat and all: heatVanish), into a thing of its own; the crew to the moon */
function hLiftOff(g, s) {
  var cells = [], k, e, x, y, bx = s.rx, by = s.R0 - 3;
  for (k = 0; k < s.plan.length; k++) {
    e = s.plan[k];
    if (!e.rk) continue;
    if (g.m[e.i] !== MAT.EMPTY) {
      x = e.i % g.gw; y = (e.i / g.gw) | 0;
      cells.push({ dx: x - bx, dy: y - by, v: g.m[e.i], a: g.aux[e.i], sh: g.sh[e.i] });
      heatVanish(g, e.i);
    }
    if (g.bmark) g.bmark[e.i] = 0;
  }
  s.plan = s.plan.filter(function (e) { return !e.rk; });
  g.rocket = { x: bx + 0.5, y: by, vy: 0, cells: cells, site: s.id, t: 0, fireQ: 0, n: cells.length };
  s.gone = g.tick; s.oil = 0; s.count = 0;
  g.fx.whoosh++; g.fx.boom++;
  g.shake = Math.min(14, g.shake + 6);
  var names = [];
  s.crew.forEach(function (id, n) {
    var q = lAlive(g, id);
    if (!q || q.aboard !== s.id) return;
    q.aboard = 0; q.state = "space"; q.spaceT = H_AWAY + n * 90; q.spaceX = s.rx - 3 + n * 3; q.moon = 1; q.moonrock = 2;
    g.astronauts = (g.astronauts || 0) + 1;
    feed(g, q.name + " has gone to the moon", "#9ad0ff", "moon" + q.id);
    wTale(g, "moon", q, "", s.rx, s.R0);
    names.push(pTitle(q.short));
  });
  g.moonCrew = names;
  s.crew = [];
}
/* every tick, from wStep: the rocket going up, the flag going in */
function hRocketTick(g) {
  var R = g.rocket, k;
  if (g.moonFlag && g.tick % W_STRIDE === 0) hMoonTalk(g);
  if (g.moonT && g.tick >= g.moonT) {
    g.moonT = 0;
    var n = (g.moonCrew || []).join(" and ") || "somebody";
    g.moonFlag = { names: n, tick: g.tick };
    P_ACHIEVE.moon = ["ONE SMALL STEP", n + (g.moonCrew && g.moonCrew.length > 1 ? " are" : " is") + " on the moon. it is mostly dust. they wave"];
    achieve(g, "moon");
    feed(g, "there is a flag on the moon. you can just see it", "#ffd94a", "flag");
  }
  if (!R) return;
  R.t++;
  R.vy = Math.max(R.vy - (R.t < 60 ? 0.004 : 0.02), -2.6);
  R.y += R.vy;
  /* the exhaust: real fire under it, and smoke, into whatever air is there */
  var bx = Math.floor(R.x), by = Math.floor(R.y);
  for (var dx = -1; dx <= 1; dx++) for (var dy = 1; dy <= 3; dy++) {
    var x = bx + dx, y = by + dy;
    if (x < 0 || y < 0 || x >= g.gw || y >= g.gh) continue;
    var j = y * g.gw + x;
    if (g.m[j] !== MAT.EMPTY || Math.random() > (dy === 1 ? 0.7 : 0.25)) continue;
    var v = dy === 3 && Math.random() < 0.5 ? MAT.SMOKE : MAT.FIRE, q0 = heatQ(g, j);
    sandPlace(g, j, v);
    R.fireQ += heatQ(g, j) - q0;   /* (the burning oil's heat: kept count of, for the books) */
  }
  if (R.t % 3 === 0) sparks(g, R.x, R.y + 2, 3, 0.8, SPARK_HOT, 10, -0.6, PK_GLINT);
  g.shake = Math.max(g.shake, R.y > 60 ? 4 : 1.5);
  if (R.t % 40 === 0) g.fx.whoosh++;
  /* out of the top of the world */
  if (R.y < -30) {
    g.rocket = null;
    g.moonT = g.tick + 420;
    feed(g, "the rocket has gone out of the top of the world", "#9ad0ff", "rocketgone");
  }
}
/* the crew, thrown clear; the plates, flung; and a bang the size of the valley's patience */
function hRocketBoom(g, s) {
  var k, e, q, x, y;
  (s.crew || []).forEach(function (id) {
    q = lAlive(g, id);
    if (!q) return;
    if (q.aboard === s.id) {
      q.aboard = 0; q.spaceT = 0; q.state = "fly"; q.flyT = 0; q.x = s.rx + 0.5; q.y = s.R0 - 14;
      q.vx = (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random() * 0.8); q.vy = -2.2 - Math.random(); q.fallY = q.y; q.immune = 30;
    } else if (q.task && q.task.kind === "board") q.task = null;
  });
  s.crew = []; s.count = 0;
  for (k = 0; k < s.plan.length; k++) {
    e = s.plan[k];
    if (!e.rk || g.m[e.i] === MAT.EMPTY || !SOLID[g.m[e.i]]) continue;
    x = e.i % g.gw; y = (e.i / g.gw) | 0;
    sandFling(g, e.i, (x + 0.5 - s.rx - 0.5) * 0.3 + (Math.random() - 0.5) * 2, -1.5 - Math.random() * 2.5);
  }
  s.oil = 0;
  sandBoom(g, (s.R0 - 10) * g.gw + s.rx, 14, 3);
  feed(g, "the moon rocket went up. not the way anybody meant", "#ff9a6a", "boom" + s.id);
  wTale(g, "nuke", null, "", s.rx, s.R0);
  g.rocketBooms = (g.rocketBooms || 0) + 1;
}
var H_HULL = hex32("#d8d8d4"), H_HULL_D = hex32("#a4a6a8"), H_FLAG = hex32("#e83a4a"), H_POLE = hex32("#f0f0f0");
var H_HELM = hex32("#e8f4ff"), H_HELM_G = hex32("#a8d0f0");
var H_SKIN = hex32("#e4e4e0"), H_SKIN_D = hex32("#b4b6b8"), H_FIN = hex32("#c0392e"), H_FIN_D = hex32("#8a2620"), H_BELL = hex32("#3e424c"), H_BELL_HI = hex32("#6a707c");
/* the rocket's paint, by where the cell is in it (u across from the pad's left, h up from the ground): white plates, red
   fins, a dark engine bell. (null: as it is) */
function hRocketCol(u, h, v) {
  if (v !== MAT.METAL) return null;
  if (h >= 3 && h <= 5 && u >= 6 && u <= 8) return u === 6 ? H_BELL_HI : H_BELL;
  if (u === 4 || u === 10 || (h <= 5 && (u === 5 || u === 9)) || h === 22 || h === 23) return u >= 8 ? H_FIN_D : H_FIN;
  return u === 9 || (h === 6 && u === 8) ? H_SKIN_D : H_SKIN;
}
/* the inside of the rocket's shell, drawn; the hatch */
function hDrawRocket(g, s) {
  var u, h, x, y, k, e, col;
  for (k = 0; k < s.plan.length; k++) {
    e = s.plan[k];
    /* (the gantry's girders, painted: a launch tower is red) */
    if (e.v === MAT.GIRDER && g.m[e.i] === MAT.GIRDER) { y = (e.i / g.gw) | 0; g.px[e.i] = (y & 1) ? H_FIN_D : blend32(H_FIN_D, 0xff000000, 0.35); continue; }
    if (!e.rk || g.m[e.i] !== e.v) continue;
    col = hRocketCol(e.i % g.gw - s.x0, s.R0 - ((e.i / g.gw) | 0), g.m[e.i]);
    if (col) g.px[e.i] = col;
  }
  if (s.gone) return 0;
  for (h = 7; h <= 21; h++) for (u = 6; u <= 8; u++) {
    if (h === 16) continue;
    x = s.x0 + u; y = s.R0 - h;
    if (pCell(g, x - 1, y) !== MAT.METAL || pCell(g, s.x0 + 9, y) !== MAT.METAL) continue;
    wBack(g, x, y, u === 6 ? H_HULL : (u === 8 ? H_HULL_D : blend32(H_HULL, H_HULL_D, 0.4)));
  }
  return 0;
}
/* the rocket in flight, and the flag on the moon */
function hDrawRocketSky(g) {
  var R = g.rocket, hot = 0, k;
  if (R) {
    var bx = Math.floor(R.x), by = Math.round(R.y);
    for (k = 0; k < R.cells.length; k++) {
      var c = R.cells[k], x = bx + c.dx, y = by + c.dy;
      if (x < 0 || y < 0 || x >= g.gw || y >= g.gh) continue;
      g.px[y * g.gw + x] = hRocketCol(c.dx + 7, 3 - c.dy, c.v) || SAND_PAL[c.v][c.sh];
    }
    for (var h = 1; h <= 15; h++) for (var u = -1; u <= 1; u++) {
      var X = bx + u, Y = by - 3 - h;
      if (h === 10 || X < 0 || Y < 0 || X >= g.gw || Y >= g.gh) continue;
      g.px[Y * g.gw + X] = u < 0 ? H_HULL : (u > 0 ? H_HULL_D : blend32(H_HULL, H_HULL_D, 0.4));
    }
    for (k = 1; k <= 6; k++) wPut(g, bx + ((k * 7 + R.t) % 3) - 1, by + k, SPARK_HOT[(k + R.t) & 3], true);
    hot++;
  }
  if (g.moonFlag && typeof SKY_MOON !== "undefined" && SKY_MOON) {
    var mx = SKY_MOON.x + 2, my = SKY_MOON.y - SKY_MOON.r + 1;
    for (k = 0; k < 3; k++) wPut(g, mx, my - k, H_POLE);
    wPut(g, mx + 1, my - 2, H_FLAG); wPut(g, mx + 2, my - 2, H_FLAG); wPut(g, mx + 1, my - 1, H_FLAG);
  }
  return hot;
}
/* those who have been: a glass helmet, for good */
function hDrawHelmets(g, s) {
  for (var k = 0; k < g.peasants.length; k++) {
    var p = g.peasants[k];
    if (!p.moon || p.dead || p.state !== "walk" || p.sleep > 0 || p.stun > 0 || p.slip > 0 || p.swimming) continue;
    var x = Math.floor(p.x), y = Math.floor(p.y), d;
    for (d = -1; d <= 1; d++) { wPut(g, x + d, y - 8, H_HELM); wPut(g, x + d, y - 7, blend32(g.px[(y - 7) * g.gw + x + d] || 0, H_HELM_G, 0.5)); wPut(g, x + d, y - 6, blend32(g.px[(y - 6) * g.gw + x + d] || 0, H_HELM_G, 0.4)); }
    for (d = 7; d >= 4; d--) { wPut(g, x - 2, y - d, H_HELM); wPut(g, x + 2, y - d, H_HELM); }
  }
}
/* the astronauts, back, now and then say so */
function hMoonTalk(g) {
  for (var k = 0; k < g.peasants.length; k++) {
    var p = g.peasants[k];
    if (p.moon && !p.dead && p.state === "walk" && wIdle(g, p) && p.sayT <= 0 && Math.random() < 0.01) pSay(g, p, "moon");
  }
}
