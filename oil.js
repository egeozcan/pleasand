/* =====================================================================
   PLEASAND  --  oil.js

   deep in the rock there are pools of oil: dark, sealed in stone,
   waiting. a mine dug to the bottom of the rock can
   smell it (it is not the sort of thing a miner would miss), and a
   village that has learned to smelt, and so has iron for a derrick,
   thinks of an OIL WELL.

     THE OIL WELL   a derrick over a pool of oil: an iron deck, iron
                    legs and braces, and a ladder up the inside to
                    build it by. somebody works the pump at the foot of
                    it, and every stroke lifts a barrel up out of the
                    rock. the first few barrels go in the tank; after
                    that the well overflows, and the oil pools at the
                    bottom of the derrick, where it is a hazard and an
                    opportunity
     ROCKET PACKS   with oil in the tank and a bar of iron, somebody
                    can put a rocket pack together at the well. it is
                    one seat, no steering to speak of, and enough lift
                    to clear most of the valley. they love it

   a well is a site, like a house (build.js): a plan, a blueprint,
   repairs. the oil is finite: when the pool under it is empty, the
   well is dry, and they will sink another.
   ===================================================================== */
"use strict";

var O_POOLS = 5;            /* pools of oil in the rock, in a new valley */
var O_RESERVOIR = 1;        /* oil aux tag: carried with the cell when it flows, never set on spills or painted oil */
var O_DEEP = 90;            /* how far under a well they look for its oil */
var O_WELLS = 2;            /* wells pumping at once */
var O_H = 13;               /* how tall a derrick is, from the deck to the platform */
var O_LADDER = 10;          /* and how far the ladder inside it goes (the rest is reached from there) */
var O_PUMP = 100;           /* ticks at the handle for a barrel */
var O_STROKE_N = 8;         /* barrels in a visit to the well */
var O_TANK = 5;             /* barrels the well's tank holds, before it overflows */
var O_SPILL_MAX = 12;       /* cells of oil about the foot of the well before the sump is full */
var O_ROCKET_OIL = 8;       /* barrels out of the ground before anybody thinks of rocket packs */
var O_PACK_OIL = 4;         /* barrels in a rocket pack */
var O_PACK = 180;           /* ticks to put one together */
var O_LAUNCH = 4.2;         /* how hard a rocket pack pushes (cells a tick) */

P_SAY.idea_oil = ["there's OIL under the rock. i can smell it", "a well. for the oil. OIL WELLS", "black stuff. it burns!",
  "what if we brought the oil UP"];
P_SAY.idea_rocket = ["oil... a tank... a nozzle. ROCKET", "what if the pack LIFTED us", "a rocket pack! up!",
  "we have oil. we have iron. we have an idea"];
P_SAY.smell = ["can you smell that?", "oil! under the rock!", "that's not coal. that's OIL", "the whole mine smells of it"];
P_SAY.planWell = ["a derrick, right here", "there's oil under this spot", "a well! then: UP", "drill, pump, barrel, repeat"];
P_SAY.pump = ["*clank* *clank*", "pump, pump, pump", "come up, you black stuff", "heave", "the handle!",
  "this is hard work. worth it", "*creak* *creak*"];
P_SAY.oil = ["OIL!", "it's coming up!", "black gold!", "look at it. it burns", "that's the stuff", "barrels of it!"];
P_SAY.dry = ["it's dry", "the well's run dry", "nothing but rock down there now", "that's the lot"];
P_SAY.sump = ["the sump's full", "no room for any more", "it's overflowing. careful", "somebody fetch a barrel"];
P_SAY.pack = ["a tank, a nozzle, and a seat", "iron, oil, and nerve", "i'm building a ROCKET PACK", "wait till they see this"];
P_SAY.packed = ["a rocket pack! it fits!", "mine now", "i am going to go UP", "strap yourself in. not you, me"];
P_SAY.launch = ["ROCKET PACK!", "UP UP UP", "WHEEEE", "NO BRAKES", "three... two... one...", "YEEHAW", "i can see my house!"];
P_SAY.rocketLand = ["what a ride", "again!", "my legs have gone", "i stuck the landing. nearly", "TERRIFYING. more"];

P_ACHIEVE.well = ["STRIKE OIL", "a derrick over a pool of oil. nothing can possibly go wrong"];
P_ACHIEVE.oil = ["BLACK GOLD", "the first barrel out of the ground. it burns"];
P_ACHIEVE.pack = ["ROCKET PACK", "a seat, a tank, and a nozzle. the peasants have found the sky"];
P_ACHIEVE.rocket = ["ONE SMALL TOWN", "a peasant flew. the ducks are unimpressed"];

/* -------------------------------------------------------------------
   WHAT IS UNDER THERE: pools of oil, sealed in the rock. put in at
   worldgen, deeper than the mines go and behind a skin of stone, so
   nothing seeps until somebody drills for it
   ------------------------------------------------------------------- */
function oSeedOil(g, rock) {
  var gw = g.gw, gh = g.gh, n, tries, cx, cy, rx, ry, dx, dy, x, y, j, hi, ok, inside, shell;
  for (n = 0; n < O_POOLS; n++) {
    for (tries = 0; tries < 90; tries++) {
      cx = 18 + irnd(gw - 36);
      rx = 5 + irnd(5);             /* 5 .. 9 */
      ry = 2 + irnd(3);             /* 2 .. 4 */
      if (cx - rx - 2 < 2 || cx + rx + 2 > gw - 3) continue;
      hi = -1;
      for (x = cx - rx - 2; x <= cx + rx + 2; x++) if (rock[x] > hi) hi = rock[x];
      /* deep enough to sit wholly in the rock, and shallow enough to be in the map */
      cy = hi + 6 + irnd(10) + ry;
      if (cy - ry < hi + 4 || cy + ry + 2 > gh - 2) continue;
      /* not on top of another pool */
      for (dy = -ry - 1, ok = true; dy <= ry + 1 && ok; dy++) for (dx = -rx - 1; dx <= rx + 1; dx++) {
        j = (cy + dy) * gw + cx + dx;
        if (g.m[j] === MAT.OIL) { ok = false; break; }
      }
      if (!ok) continue;
      /* the oil */
      for (dy = -ry; dy <= ry; dy++) for (dx = -rx; dx <= rx; dx++) {
        if (dx * dx / (rx * rx) + dy * dy / (ry * ry) > 1) continue;
        j = (cy + dy) * gw + cx + dx;
        if (ROCK[g.m[j]]) { g.m[j] = MAT.OIL; g.aux[j] = O_RESERVOIR; g.vy[j] = 0; }
      }
      /* and a skin of stone all round it: one cell, but nothing gets through one cell of stone. (this covers any
         seam of coal or ore it has been painted over, too.) */
      for (dy = -ry - 1; dy <= ry + 1; dy++) for (dx = -rx - 1; dx <= rx + 1; dx++) {
        inside = dx * dx / (rx * rx) + dy * dy / (ry * ry) <= 1;
        shell = dx * dx / ((rx + 1) * (rx + 1)) + dy * dy / ((ry + 1) * (ry + 1)) <= 1;
        if (!shell || inside) continue;
        j = (cy + dy) * gw + cx + dx;
        if (!ROCK[g.m[j]]) { g.m[j] = MAT.STONE; g.aux[j] = 0; g.vy[j] = 0; }
      }
      break;
    }
  }
}
function oReservoirOil(g, j) { return g.m[j] === MAT.OIL && g.aux[j] === O_RESERVOIR; }
/* how much reservoir oil there is about (for the tests and for the smell) */
function oOilInRock(g) {
  var n = 0;
  for (var j = 0; j < g.m.length; j++) if (oReservoirOil(g, j)) n++;
  return n;
}
/* a mine at the bottom of the rock smells the oil: once is enough, and the village hears about it */
function oSmell(g) {
  if (g.oilSeen || !g.know.mine || !mSites(g, "mine", true).length) return;
  if (!oOilInRock(g)) return;
  g.oilSeen = 1; g.found.oil = 1;
  var p = null;
  for (var k = 0; k < g.peasants.length; k++) if (!g.peasants[k].dead) { p = g.peasants[k]; break; }
  feed(g, (p ? p.name + " can " : "they can ") + "smell oil under the rock", "#d8c090", "smell");
  if (p && p.sayT <= 0) pSay(g, p, "smell", true);
  mRing(g, 2);
}

/* -------------------------------------------------------------------
   THE WELL'S PAPERWORK
   ------------------------------------------------------------------- */
/* the shallowest oil under the column the well drills (col), within O_DEEP of the deck: the cell index, or -1 */
function oFindOil(g, s) {
  var x0 = Math.max(1, s.col - 6), x1 = Math.min(g.gw - 2, s.col + 6), y, x, j, best = -1, bd = 1e9, d;
  for (y = s.G + 4; y < Math.min(g.gh - 1, s.G + O_DEEP); y++) for (x = x0; x <= x1; x++) {
    j = y * g.gw + x;
    if (!oReservoirOil(g, j)) continue;
    d = (y - s.G) * 2 + Math.abs(x - s.col);
    if (d < bd) { bd = d; best = j; }
  }
  return best;
}
/* oil pooled about the foot of the well: how many cells, out to a dozen or so */
function oSumpCount(g, s) {
  var n = 0, x, y, sx = s.spill.x, sy = s.spill.y;
  for (y = Math.max(0, sy - 9); y <= Math.min(g.gh - 1, sy + 5); y++) for (x = Math.max(0, sx - 8); x <= Math.min(g.gw - 1, sx + 8); x++)
    if (g.m[y * g.gw + x] === MAT.OIL) n++;
  return n;
}
/* a barrel spilt at the foot of the well: at the spout, if there is room. false if the sump is full there */
function oSpill(g, s, up) {
  var y0 = s.spill.y - (up || 0), xs = [0, -1, 1, -2, 2], a, x, y, j, k;
  /* at the spout, if there is room; on top of the oil there (it settles); and if something has been left in the way
     (a log, a campfire, a wall somebody built), a cell or two to either side, and over the top of it. a barrel of oil
     poured over a log runs off it soon enough */
  for (a = 0; a < xs.length; a++) {
    x = s.spill.x + xs[a];
    if (x < 1 || x > g.gw - 2) continue;
    for (k = 0; k < 10; k++) {
      y = y0 - k;
      if (y < 1) break;
      j = y * g.gw + x;
      if (g.m[j] === MAT.OIL) continue;
      if (g.m[j] !== MAT.EMPTY) continue;
      sandSet(g, j, MAT.OIL);
      heatAccept(g, j);
      return true;
    }
  }
  return false;
}
function oLabel(s) { return "the oil well"; }
/* one barrel up out of the reservoir, and into their pockets, the tank or the count: j is the oil cell (oFindOil) */
function oTake(g, s, j, p) {
  g.m[j] = MAT.EMPTY; g.aux[j] = 0; heatSync(g, j);
  s.barrels++; g.barrels++;
  if (g.barrels === 1) {
    feed(g, (p ? p.name : "the village") + " brought up the first barrel of oil", "#d8c090", "oil");
    achieve(g, "oil");
    if (p) pSay(g, p, "oil", true);
  } else if (p && p.sayT <= 0 && Math.random() < 0.06) pSay(g, p, "oil");
}
/* one of ours is finished: it blows, a little, and takes those barrels out of the pool (the pool is finite) */
function oFinish(g, s, p) {
  if (s.kind !== "well") return false;
  var who = p ? p.name : "the village", k, j;
  feed(g, who + " struck oil. the derrick is up", "#d8c090", "plan" + s.id);
  banner(g, "STRIKE OIL", "a derrick over a pool of oil. what could possibly go wrong");
  achieve(g, "well");
  mRing(g, 2);
  s.tank = 0;
  for (k = 0; k < 3; k++) {
    j = oFindOil(g, s);
    if (j < 0) break;
    if (!oSpill(g, s, k)) { if (s.tank < O_TANK) s.tank++; else break; }
    oTake(g, s, j, p);
  }
  return true;
}
function oRunDry(g, s, p) {
  s.dry = true;
  feed(g, "the oil well has run dry", "#c8d0dc", "dry" + s.id);
  if (p) pSay(g, p, "dry", true);
}
function oMood(g, p) {
  var k = p.task, s = k && (k.kind === "pump" || k.kind === "pack") ? bSite(g, k.site) : null;
  if (p.launch && p.state === "fly") return "is flying a rocket pack";
  if (k && k.kind === "pump") return s && s.dry ? "is at the dry well" : "is working the pump at the oil well" +
    (s && s.tank ? " (" + s.tank + " barrels in the tank)" : "");
  if (k && k.kind === "pack") return "is building a rocket pack at the oil well";
  if (p.pack && p.idle > 0) return "is standing about with a rocket pack";
  return "";
}

/* -------------------------------------------------------------------
   PLANNING A WELL: over oil, on level-ish ground, with room for the
   derrick, a place to stand at the pump and a place for the oil to go
   ------------------------------------------------------------------- */
function oPlanWell(g, p) {
  var W = mSites(g, "well"), live = 0, k, d, sd, r, best = null, sc, fx, fy, x0, x1, F, T, plan = [], x, y, ph;
  if (!g.know.oil) return false;
  for (k = 0; k < W.length; k++) { if (!W[k].done) return false; if (!W[k].dry) live++; }
  if (live >= O_WELLS) return false;
  if (!((p.iron || 0) >= 0.2 || g.iron >= 1)) return false;   /* the derrick is iron: they have to have smelted some */
  if (bOpenCount(g) >= B_OPEN) return false;
  fx = Math.floor(p.x); fy = Math.floor(p.y);
  for (d = 0; d <= 150; d++) for (sd = -1; sd <= 1; sd += 2) {
    if (!d && sd > 0) continue;
    r = oWellPlot(g, fx + d * sd - 2, fy);
    if (!r) continue;
    sc = r.work * 0.25 + d * 0.06 - r.oilDepth * 0.15;
    if (!best || sc < best.sc) { best = r; best.sc = sc; }
  }
  if (!best) { p.oilCD = 1800; return false; }
  x0 = best.x0; x1 = x0 + 4; F = best.F; T = F - O_H;
  /* 0: what is in the way above the ground. 1: the iron deck, and the posts under the low end of it */
  for (k = 0; k < best.dig.length; k++) plan.push(bE(g, best.dig[k][0], best.dig[k][1], MAT.EMPTY, 0));
  for (k = 0; k < best.fill.length; k++) plan.push(bE(g, best.fill[k][0], best.fill[k][1], MAT.GIRDER, 1));
  for (x = x0; x <= x1; x++) if (!pSolid(g, x, F)) plan.push(bE(g, x, F, MAT.GIRDER, 1));
  /* 10..: a row at a time, up: the two iron legs, the ladder up the inside, and a brace over the top of it. then the
     platform, and the crown the pump beam rocks on */
  for (y = F - 1; y >= T; y--) {
    ph = 10 + (F - 1 - y);
    plan.push(bE(g, x0, y, MAT.GIRDER, ph), bE(g, x1, y, MAT.GIRDER, ph));
    /* the ladder is bolted together out of the ironwork: it costs nothing anybody has to carry (as a mine's does) */
    if (y >= F - O_LADDER) for (x = x0 + 1; x <= x0 + 3; x++) {
      var le = bE(g, x, y, MAT.LADDER, ph, x - x0 - 1);
      le.cost = 0;
      plan.push(le);
    }
    if (y === F - O_LADDER - 1) for (x = x0 + 1; x <= x0 + 3; x++) plan.push(bE(g, x, y, MAT.GIRDER, ph));
  }
  ph = 10 + O_H + 1;
  for (x = x0 + 1; x <= x0 + 3; x++) plan.push(bE(g, x, T, MAT.GIRDER, ph));
  plan.push(bE(g, x0 + 1, T - 1, MAT.GIRDER, ph + 1), bE(g, x0 + 2, T - 1, MAT.GIRDER, ph + 1), bE(g, x0 + 3, T - 1, MAT.GIRDER, ph + 1));
  plan.push(bE(g, x0 + 2, T - 2, MAT.GIRDER, ph + 2));
  var s = bNew(g, "well", p, plan, [x0 - 3, T - 5, x1 + 3, F + 3],
               { G: F, T: T, dx0: x0, dx1: x1, col: x0 + 2, spill: best.spill, pump: best.pump, oilY: best.oilY,
                 tank: 0, barrels: 0, dry: false, pumpT: 0 });
  feed(g, p.name + " is building an oil well", "#d8c090", "plan" + s.id);
  pSay(g, p, "planWell", true);
  if (bCarries(p)) bJoin(g, p, s);
  return true;
}
/* is (x0 .. x0 + 4) a place for a derrick, near row fy, with oil under it. {x0, F, dig, fill, oilY, oilDepth, spill,
   pump, work} or null */
function oWellPlot(g, x0, fy) {
  var x1 = x0 + 4, pumpX = x0 - 2, spillX = x1 + 2, gy = [], x, y, c, k, F = 1 << 20, G, T, dig = [], fill = [],
      oilY = -1, oilDepth = 0, bestD = 1e9, d, gs, gp, spoutY, pumpY;
  if (x0 < 8 || x1 > g.gw - 9) return null;
  for (x = x0; x <= x1; x++) {
    G = bGround(g, x, fy);
    if (G < 0 || !pSolid(g, x, G)) return null;
    gy.push(G); if (G < F) F = G;
  }
  for (k = 0; k < 5; k++) if (gy[k] - F > 3) return null;
  T = F - O_H;
  if (T < 16) return null;
  /* the pump goes on one side, the oil comes out the other. both about level, with room */
  gp = bGround(g, pumpX, fy); gs = bGround(g, spillX, fy);
  if (gp < 0 || gs < 0 || Math.abs(gp - F) > 2 || Math.abs(gs - F) > 2) return null;
  if (!pSolid(g, pumpX, gp) || !pSolid(g, spillX, gs)) return null;
  pumpY = gp - 1;
  if (!pRoom(g, pumpX, pumpY)) return null;
  spoutY = gs - 1;
  if (!AIRY[pCell(g, spillX, spoutY)] || !AIRY[pCell(g, spillX, spoutY - 1)]) return null;
  /* nothing of anybody else's in the way, and nothing wet, hot or touchy close by */
  for (k = 0; k < g.sites.length; k++) {
    var t = g.sites[k];
    if (x1 + 4 >= t.x0 && x0 - 4 <= t.x1 && F + 4 >= t.y0 && T - 7 <= t.y1) return null;
  }
  for (y = T - 4; y <= F + 2; y++) for (x = x0 - 4; x <= x1 + 4; x++) {
    c = pCell(g, x, y);
    if (LIQUID[c] || HOT[c] || c === MAT.DRAIN || P_BANG[c]) return null;
  }
  /* clear sky over the derrick (bushes and loose sand are dug out first) */
  for (y = T - 4; y < F; y++) for (x = x0; x <= x1; x++) {
    c = pCell(g, x, y);
    if (AIRY[c]) continue;
    if (!B_DIG[c] || bMarked(g, x, y)) return null;
    dig.push([x, y]);
  }
  /* oil under the drill, at least a few cells down (a puddle on the ground is not a well) */
  for (x = x0 + 1; x <= x0 + 3; x++) for (y = F + 4; y < Math.min(g.gh - 1, F + O_DEEP); y++) {
    if (!oReservoirOil(g, y * g.gw + x)) continue;
    d = (y - F) * 2 + Math.abs(x - (x0 + 2));
    if (d < bestD) { bestD = d; oilY = y; oilDepth = y - F; }
  }
  if (oilY < 0) return null;
  /* from the ground under the deck (which may be on short posts) to the pool: a bore through earth and rock,
     not a pipe dangling from a bridge or passing through somebody's building */
  x = x0 + 2;
  for (y = gy[2]; y < oilY; y++) {
    c = pCell(g, x, y);
    if ((!ROCK[c] && c !== MAT.SAND && c !== MAT.SOIL && c !== MAT.ASH && c !== MAT.SNOW && c !== MAT.SALT) ||
        bMarked(g, x, y)) return null;
  }
  /* posts under the low end of the deck */
  for (k = 0; k < 5; k++) if (gy[k] > F) for (y = gy[k] - 1; y > F; y--) fill.push([x0 + k, y]);
  dig.sort(function (a, b) { return a[1] - b[1]; });
  return { x0: x0, F: F, dig: dig, fill: fill, oilY: oilY, oilDepth: oilDepth, work: dig.length + fill.length,
           spill: { x: spillX, y: spoutY }, pump: { x: pumpX, y: pumpY } };
}

/* -------------------------------------------------------------------
   WHAT THEY DO ABOUT IT
   ------------------------------------------------------------------- */
/* before the ordinary round of jobs: a pack on their back and a mind to fly it, or iron in their pocket and a tank of
   oil at the well. (called from pPickTask, so it is not lost under a pile of building work) */
function oFirst(g, p) {
  if (!g.know.rocket) return false;
  if (p.pack) return p.bored > 900 && Math.random() < 0.3 && oLaunch(g, p);
  if ((p.iron || 0) < 1 || p.hunger >= P_HUNGRY || p.fire || p.sleep || p.cold > 200 || p.panic > 0 ||
      (p.tired || 0) > B_SLEEPY) return false;
  if (Math.random() >= 0.6) return false;
  return oGoPack(g, p);
}
function oPick(g, p, hungry) {
  if (!g.know.oil) return false;
  /* oil, iron, and a pack on their back: up they go */
  if (p.pack && p.bored > 900 && Math.random() < 0.25 && oLaunch(g, p)) return true;
  /* a pack comes before another shift at the pump: the tank is there to be used */
  if (g.know.rocket && !hungry && !p.pack && Math.random() < 0.5 && oGoPack(g, p)) return true;
  if (!hungry && Math.random() < 0.5 && oGoPump(g, p)) return true;
  if (!p.oilCD && !hungry && Math.random() < 0.2) {
    if (oPlanWell(g, p)) return true;
    p.oilCD = 1800;
  }
  return false;
}
function oGoPump(g, p) {
  var best = null, bd = 220, k, s, d;
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if (s.kind !== "well" || !s.done || s.repair || s.dry || pAvoid(g, p, s.pump.x)) continue;
    d = Math.abs(s.cx - p.x);
    if (d >= bd || mCrew(g, "pump", s.id) > 0) continue;
    if (s.tank >= O_TANK && oSumpCount(g, s) >= O_SPILL_MAX) continue;   /* no room: leave it for another day */
    bd = d; best = s;
  }
  if (!best) return false;
  p.task = { kind: "pump", site: best.id, t: 0, act: 0, n: 0 };
  return true;
}
/* one tick of one of the jobs in here, or undefined if it is not one of ours */
function oTask(g, p, k) {
  if (k.kind === "pump") return oTaskPump(g, p, k);
  if (k.kind === "pack") return oTaskPack(g, p, k);
  return undefined;
}
function oTaskPump(g, p, k) {
  var s = bSite(g, k.site), sx, sy, fy = Math.floor(p.y);
  if (!s || s.kind !== "well" || !s.done || s.repair || ++k.t > 3000) return iDone(p, false);
  if (s.dry) return iDone(p, k.n > 0);
  sx = s.pump.x; sy = s.pump.y;
  if (Math.abs(p.x - sx - 0.5) > 1.2 || Math.abs(fy - sy) > 2) {
    if (iWalk(g, p, k, "pump" + s.id, sx, sy, function (x, y) { return Math.abs(x - sx) <= 1 && Math.abs(y - sy) <= 2; })) pGiveUp(g, p, sx);
    return false;
  }
  p.dir = s.col < p.x ? -1 : 1;
  p.idle = 0;
  k.act++;
  p.pose = (k.act % 16) < 8 ? "hammerA" : "hammerB";
  if (k.act === 20 && p.sayT <= 0) pSay(g, p, "pump");
  if (k.act % O_PUMP) return true;
  /* a stroke of the pump: a barrel out of the rock. into the tank, or over the side if the tank is full */
  var j = oFindOil(g, s);
  if (j < 0) {
    oRunDry(g, s, p);
    return iDone(p, true);
  }
  if (s.tank >= O_TANK) {
    if (oSumpCount(g, s) >= O_SPILL_MAX || !oSpill(g, s)) {
      if (p.sayT <= 0) pSay(g, p, "sump", true);
      return iDone(p, false);
    }
  } else s.tank++;
  oTake(g, s, j, p);
  s.pumpT = g.tick; s.last = g.tick;
  g.fx.clank++;
  if (k.n >= O_STROKE_N - 1) { p.bored = 0; return iDone(p, true); }
  k.n++;
  return true;
}
/* a rocket pack: iron in their pocket, and barrels from the well's tank */
function oGoPack(g, p) {
  if (!g.know.rocket || p.pack || (p.iron || 0) < 1) return false;
  var best = null, bd = 220, k, s, d;
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if (s.kind !== "well" || !s.done || s.repair || s.tank < O_PACK_OIL || pAvoid(g, p, s.pump.x)) continue;
    d = Math.abs(s.cx - p.x);
    if (d >= bd || mCrew(g, "pack", s.id) > 0) continue;   /* (somebody may be working the pump at the same time) */
    bd = d; best = s;
  }
  if (!best) return false;
  p.task = { kind: "pack", site: best.id, t: 0, act: 0 };
  return true;
}
function oTaskPack(g, p, k) {
  var s = bSite(g, k.site), sx, sy, fy = Math.floor(p.y);
  if (!s || s.kind !== "well" || !s.done || s.repair || ++k.t > 3000) return iDone(p, false);
  sx = s.pump.x; sy = s.pump.y;
  if (Math.abs(p.x - sx - 0.5) > 1.2 || Math.abs(fy - sy) > 2) {
    if (iWalk(g, p, k, "pack" + s.id, sx, sy, function (x, y) { return Math.abs(x - sx) <= 1 && Math.abs(y - sy) <= 2; })) pGiveUp(g, p, sx);
    return false;
  }
  p.dir = s.col < p.x ? -1 : 1;
  p.idle = 0;
  k.act++;
  p.pose = (k.act % 20) < 10 ? "hammerA" : "hammerB";
  if (k.act % 18 === 0) pChips(g, p.x + p.dir * 2, p.y - 4, 2, SPARK_HOT);
  if (k.act === 30 && p.sayT <= 0) pSay(g, p, "pack", true);
  if (k.act < O_PACK) return true;
  if (s.tank < O_PACK_OIL || (p.iron || 0) < 1) return iDone(p, false);
  s.tank -= O_PACK_OIL;
  p.iron -= 1;
  p.pack = 1; g.packs = (g.packs || 0) + 1;
  feed(g, p.name + " has built a rocket pack", "#ffd27a", "pack" + p.id);
  achieve(g, "pack");
  pSay(g, p, "packed", true);
  p.bored = 0;
  return iDone(p, true);
}
/* up. no steering to speak of, and a landing that is mostly luck */
function oLaunch(g, p) {
  if (!p.pack || p.state !== "walk" || p.fire || p.sleep || p.climb || p.rope || p.swimming || p.jumping || p.chute ||
      p.cold > 300 || p.panic > 0 || p.pail) return false;
  var fx = Math.floor(p.x), fy = Math.floor(p.y), y;
  for (y = fy - 2; y >= fy - 22 && y >= 0; y--) if (!AIRY[pCell(g, fx, y)]) return false;   /* indoors, or under a roof */
  if (fy < 26) return false;
  p.state = "fly"; p.flyT = 0; p.launch = 1; p.immune = Math.max(p.immune || 0, 600); p.fallY = p.y;
  p.vx = p.dir * 0.8; p.vy = -O_LAUNCH; p.spin = 0;
  p.task = null; p.idle = 0; p.bored = 0; p.falling = false;
  g.fx.whoosh++; g.fx.whee++;
  pSay(g, p, "launch", true);
  achieve(g, "rocket");
  return true;
}
/* the goings on: twice a second (from ideasStep) */
function oStep(g) {
  oSmell(g);
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (s.kind !== "well" || !s.done) continue;
    /* a full tank and sump can keep anyone from taking another shift to discover it is dry.
       give the pool a stroke's worth of time to settle after a barrel comes out. */
    if (!s.dry && g.tick - s.last >= O_PUMP && oFindOil(g, s) < 0) oRunDry(g, s);
    s.note = (s.dry ? "dry; " : "") + s.tank + (s.tank === 1 ? " barrel" : " barrels") + " in the tank";
  }
}

/* -------------------------------------------------------------------
   DRAWING: the bore down to the oil, the beam over the top, the pack
   ------------------------------------------------------------------- */
var O_PIPE = hex32("#241f18"), O_PIPE_HI = hex32("#4a4030");
var O_BEAM = hex32("#7a8494"), O_BEAM_HI = hex32("#c0c8d4"), O_BRACE = hex32("#8a94a4");
var O_TANKC = hex32("#3a4048"), O_TANKC_HI = hex32("#7a8494");
function oPut(g, x, y, col, glow) {
  if (x < 0 || y < 0 || x >= g.gw || y >= g.gh) return;
  var i = y * g.gw + x;
  g.px[i] = col;
  if (glow) g.gpx[i] = col;
}
/* the truss, and the bore down into the rock */
function oDraw(g) {
  var S = g.sites, px = g.px, gw = g.gw, gh = g.gh, k, s, x, y, j, U;
  for (k = 0; k < S.length; k++) {
    s = S[k];
    if (s.kind !== "well") continue;
    /* the bore: a dark pipe down from under the deck to the pool, with a rod inside it */
    U = s.oilY == null ? s.G + O_DEEP : s.oilY;
    for (y = s.G + 1; y < Math.min(gh, U + 1); y++) {
      j = y * gw + s.col;
      if (g.m[j] === MAT.OIL) continue;
      px[j] = blend32(px[j], (y - s.G) % 4 === 0 ? O_PIPE_HI : O_PIPE, 0.55);
    }
    if (s.done) {
      /* the spout: along the surface from the wellhead, and down into the sump */
      for (x = Math.min(s.spill.x, s.col); x <= Math.max(s.spill.x, s.col); x++) {
        j = s.spill.y * gw + x;
        px[j] = blend32(px[j], O_PIPE_HI, 0.7);
      }
      /* the tank, beside the pump: a little iron barrel. it fills up (the gauge is the stripe) */
      x = s.pump.x; y = s.pump.y;
      oPut(g, x + 1, y - 1, O_TANKC);
      oPut(g, x + 1, y - 2, O_TANKC);
      oPut(g, x + 1, y - 3, O_TANKC_HI);
      if (s.tank > 0) for (y = 0; y < Math.min(2, s.tank); y++) oPut(g, x + 2, s.pump.y - 1 - y, O_TANKC_HI);
    }
    /* the iron frame: brightened where it is there, and a lattice between the legs, so it reads as a derrick and not
       a ladder between two poles */
    for (y = s.T; y < s.G; y++) for (x = s.dx0; x <= s.dx1; x++) {
      j = y * gw + x;
      if (g.m[j] === MAT.GIRDER) px[j] = blend32(px[j], O_BEAM, 0.5);
    }
    for (y = s.T + 1; y < s.G - 1; y += 4) for (x = s.dx0 + 1; x < s.dx1; x++) {
      var yy = y + 4 - (x - s.dx0);
      if (yy >= s.T + 1 && yy < s.G - 1) px[yy * gw + x] = blend32(px[yy * gw + x], O_BRACE, 0.3);
      yy = y + (x - s.dx0);
      if (yy >= s.T + 1 && yy < s.G - 1) px[yy * gw + x] = blend32(px[yy * gw + x], O_BRACE, 0.22);
    }
  }
  return 0;
}
/* over the top of everybody: the pump beam, rocking */
function oDrawOver(g) {
  var S = g.sites, k, s, x, y, up;
  for (k = 0; k < S.length; k++) {
    s = S[k];
    if (s.kind !== "well" || !s.done) continue;
    up = s.pumpT && g.tick - s.pumpT < 24 ? ((g.tick >> 2) & 1) : 0;
    y = s.T - 3;
    for (x = s.dx0 - 1; x <= s.dx1 + 1; x++) {
      var off = x < s.col ? -up : (x > s.col ? up : 0);
      oPut(g, x, y + off, x === s.dx0 - 1 || x === s.dx1 + 1 ? O_BEAM_HI : O_BEAM, true);
    }
    /* the horsehead on the spout end of the beam */
    oPut(g, s.dx0 - 1, y - up - 1, O_BEAM_HI, true);
    oPut(g, s.dx0 - 2, y - up, O_BEAM, true);
    oPut(g, s.dx0 - 2, y - up - 1, O_BEAM_HI, true);
  }
}
/* the tank on their back, and the flame under it: straight into the pixel buffer, beside the sprite */
var P_PACK_TANK = hex32("#3e4652"), P_PACK_HI = hex32("#8a94a4"), P_PACK_NOZZLE = hex32("#c8ccd4");
function pDrawPack(g, p, ox, oy) {
  var d = p.dir, bx = ox - d * 2;
  oPut(g, bx, oy - 3, P_PACK_HI);
  oPut(g, bx, oy - 2, P_PACK_TANK);
  oPut(g, bx, oy - 1, P_PACK_TANK);
  oPut(g, bx, oy, P_PACK_NOZZLE);
}
function pDrawFlame(g, p, ox, oy) {
  if (!p.launch || p.state !== "fly" || p.vy > 0.6) return;
  var d = p.dir, bx = ox - d * 2, k, col;
  for (k = 0; k < 3; k++) {
    col = SAND_PAL[MAT.FIRE][(Math.random() * 256) | 0];
    oPut(g, bx + (Math.random() < 0.4 ? (Math.random() < 0.5 ? -1 : 1) : 0), oy + 2 + k, col, true);
  }
}
