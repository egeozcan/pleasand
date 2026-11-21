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
                    to clear most of the valley. they love it. it holds
                    two flights' worth; then it is back to the well's
                    tank to fill it up

   a well is a site, like a house (build.js): a plan, a blueprint,
   repairs. the oil is finite: when the pool under it is empty, the
   well is dry, and they will sink another.
   ===================================================================== */
"use strict";

var O_POOLS = 5;            /* pools of oil in the rock, in a new valley */
var O_RESERVOIR = 1;        /* oil aux tag: carried with the cell when it flows, never set on spills or painted oil */
var O_DEEP = 90;            /* how far under a well they look for its oil */
var O_SNIFF = 40;           /* how close a mine's workings have to come to a pool of oil to smell it */
var O_SLANT = 45;           /* and how far to either side of it: the bore can be turned, once it is down in the rock */
var O_WELLS = 2;            /* wells pumping at once */
var O_H = 13;               /* how tall a derrick is, from the deck to the platform */
var O_LADDER = 10;          /* and how far the ladder inside it goes (the rest is reached from there) */
var O_PUMP = 100;           /* ticks at the handle for a barrel */
var O_STROKE_N = 8;         /* barrels in a visit to the well */
var O_TANK = 5;             /* barrels the well's tank holds, before it overflows */
var O_SPILL_MAX = 12;       /* cells of oil about the foot of the well before the sump is full */
var O_ROCKET_OIL = 8;       /* barrels out of the ground before anybody thinks of rocket packs */
var O_PACK_OIL = 4;         /* barrels in a rocket pack */
var O_PACK_FUEL = 2;        /* flights in a full one (half the oil each) */
var O_REFUEL = 60;          /* ticks to fill one up again at the well */
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
P_SAY.refuel = ["fill her up", "two barrels, please", "*glug glug glug*", "one more go", "running on fumes"];
P_SAY.noFuel = ["out of oil", "it's empty", "*click* *click*. nothing", "i need a barrel"];
P_SAY.rocketLand = ["what a ride", "again!", "my legs have gone", "i stuck the landing. nearly", "TERRIFYING. more"];

var O_FLY_NEWS = ["{n} went up on a rocket pack", "{n} is in the air again. on purpose", "{n} lit the rocket pack. everybody ducked",
  "{n} has gone up to have a look", "there goes {n}, on a rocket pack"];
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
        if (g.m[j] !== MAT.OIL) { g.m[j] = MAT.STONE; g.aux[j] = 0; g.vy[j] = 0; }   /* (a seam is followed by the miners) */
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
/* a mine whose workings come near a pool of oil smells it: once is enough, and the village hears about it, from
   whoever is nearest the workings that smelled it */
function oSmell(g) {
  if (g.oilSeen || !g.know.mine) return;
  var k, t, x, y, near = null;
  for (k = 0; k < g.sites.length && !near; k++) {
    t = g.sites[k];
    if (!t.mine || !t.done) continue;
    for (y = Math.max(0, t.y0); y < Math.min(g.gh, t.y1 + O_SNIFF) && !near; y++)
      for (x = Math.max(0, t.x0 - O_SNIFF); x <= Math.min(g.gw - 1, t.x1 + O_SNIFF); x++) if (oReservoirOil(g, y * g.gw + x)) { near = t; break; }
  }
  if (!near) return;
  g.oilSeen = 1; g.found.oil = 1;
  var p = pOther(g, { x: near.cx, y: near.cy }, 1e4);
  feed(g, (p ? p.name + " can " : "they can ") + "smell oil, down " + (near.kind === "mine" ? "the mine" : mLabel(near)), "#d8c090", "smell");
  if (p && p.sayT <= 0) pSay(g, p, "smell", true);
  iSpark(g, p, "oil");
  mRing(g, 2);
}

/* -------------------------------------------------------------------
   THE WELL'S PAPERWORK
   ------------------------------------------------------------------- */
/* the shallowest oil under the column the well drills (col), within O_DEEP of the deck, that the bore can reach (down
   through the rock, and turned along it: no gallery or cave in the way): the cell index, or -1 */
function oFindOil(g, s, any) {
  var x0 = Math.max(1, s.col - O_SLANT), x1 = Math.min(g.gw - 2, s.col + O_SLANT), y, x, j, best = -1, bd = 1e9, d;
  for (y = s.G + 4; y < Math.min(g.gh - 1, s.G + O_DEEP); y++) for (x = x0; x <= x1; x++) {
    j = y * g.gw + x;
    if (!oReservoirOil(g, j)) continue;
    d = (y - s.G) * 2 + Math.abs(x - s.col);
    if (d < bd && (any || oBoreOpen(g, s.col, s.G + 1, x, y, s))) { bd = d; best = j; }   /* (only oil the bore can get to, unless any) */
  }
  return best;
}
/* oil pooled about the foot of the well: how many cells, out to a dozen or so */
function oSumpCount(g, s) {
  /* (what has run off downhill, out of sight of the spout, still counts: a well only ever spills so much) */
  if ((s.spilt || 0) >= O_SPILL_MAX) return O_SPILL_MAX;
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
      s.spilt = (s.spilt || 0) + 1;
      return true;
    }
  }
  return false;
}
function oLabel(s) { return "the oil well"; }
/* one barrel up out of the reservoir, and into their pockets, the tank or the count: j is the oil cell (oFindOil) */
function oTake(g, s, j, p) {
  g.aux[j] = 0; heatVacate(g, j);
  s.barrels++; g.barrels++;
  if (g.barrels === 1) {
    feed(g, (p ? p.name : "the village") + " brought up the first barrel of oil", "#d8c090", "oil");
    achieve(g, "oil");
    if (p) pSay(g, p, "oil", true);
  } else if (p && p.sayT <= 0 && Math.random() < 0.06) pSay(g, p, "oil");
  if (g.barrels === O_ROCKET_OIL) iSpark(g, p, "rocket");   /* (all those barrels, and that handle going up and down) */
}
/* one of ours is finished: it blows, a little, and takes those barrels out of the pool (the pool is finite) */
function oFinish(g, s, p) {
  if (s.kind !== "well") return false;
  var who = p ? p.name : "the village", k, j;
  feed(g, who + " struck oil. the derrick is up", "#d8c090", "plan" + s.id);
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
/* oil still down there, but the bore cut off from it (a gallery dug across it, a cave fallen in): nobody works the pump
   for a while, and then they try again */
function oBlocked(g, s) {
  if (!(s.blockT > g.tick - 6000)) feed(g, "the oil well's bore is blocked. the oil is still down there, somewhere", "#c8d0dc", "dry" + s.id);
  s.blockT = g.tick + 3000;
  if (!s.blockSince) s.blockSince = g.tick;
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
  if (k && k.kind === "refuel") return "is filling up a rocket pack at the oil well";
  if (k && k.kind === "launch") return "is off to somewhere with open sky, to fly a rocket pack";
  if (p.pack && p.idle > 0) return "is standing about with a rocket pack" + (oFuel(p) ? "" : ". it is empty");
  return "";
}

/* -------------------------------------------------------------------
   PLANNING A WELL: over oil, on level-ish ground, with room for the
   derrick, a place to stand at the pump and a place for the oil to go
   ------------------------------------------------------------------- */
/* can p walk to the pump of well plot r (else that spot is let be a while, by them: p.wellNo) */
function oWellReach(g, p, r) {
  var h = navHere(g, p), sx = r.pump.x, sy = r.pump.y;
  /* (to where the pump is worked from, exactly as the pump task wants it: oTaskPump) */
  if (h && navFind(g, h.x, h.y, function (x, y) { return Math.abs(x - sx) <= 1 && Math.abs(y - sy) <= 2; }, sx, sy)) return true;
  p.wellNo[oWellKey(r.at, r)] = g.tick + 20000;   /* (that plot, with its pump that side, for them: somebody else may be on the right side of it) */
  return false;
}
/* the rows a derrick in column x could stand on: every floor of it (mines.js mFloors), and the row fy they are on, if
   the top of it is no ground (water, say) */
function oFloors(g, x, fy) {
  var L = mFloors(g, x, false);
  return mGround(g, x) > 0 ? L : [fy].concat(L);
}
/* a plot, as p.wellNo remembers it was out of reach: the column, the side the pump is, and the floor */
function oWellKey(x, r) { return x + ":" + r.pump.x + ":" + r.pump.y; }
function oPlanWell(g, p) {
  var W = mSites(g, "well"), live = 0, k, d, sd, r, best = null, sc, fx, fy, x0, x1, F, T, plan = [], x, y, ph;
  if (!g.know.oil) return false;
  /* (a well blocked a long while is no use to anybody: it does not count, though it is not dry) */
  for (k = 0; k < W.length; k++) {
    var stuck = W[k].blockSince && g.tick - W[k].blockSince > 9000;
    if (stuck) continue;
    if (!W[k].done) return false;
    if (!W[k].dry) live++;
  }
  if (live >= O_WELLS) return false;
  if (!((p.iron || 0) >= 0.2 || g.iron >= 1)) return false;   /* the derrick is iron: they have to have smelted some */
  if (bOpenCount(g) >= B_OPEN) return false;
  fx = Math.floor(p.x); fy = Math.floor(p.y);
  if (!p.wellNo) p.wellNo = {};
  var C = [];
  /* anywhere in the valley there is oil (nearer is better), with the pump on whichever side there is room for it */
  for (d = 0; d <= g.gw; d++) for (sd = -1; sd <= 1; sd += 2) {
    if (!d && sd > 0) continue;
    x = fx + d * sd;
    if (x < 10 || x > g.gw - 11) continue;
    /* (on any floor of it: the rock under a shelf has oil in it as well as the rock under open sky) */
    var L = oFloors(g, x, fy);
    for (var n = 0; n < L.length; n++) for (k = 0; k < 2; k++) {
      r = oWellPlot(g, x - 2, L[n], k);
      if (!r || p.wellNo[oWellKey(x, r)] > g.tick) continue;
      r.sc = r.work * 0.25 + d * 0.06 - r.oilDepth * 0.15 + Math.abs(r.F - 1 - fy) * 0.06; r.at = x;
      C.push(r);
    }
  }
  /* (the best they can walk to the pump of: a few looks, and the ones across a wall are let be a while) */
  C.sort(function (a, b) { return a.sc - b.sc; });
  for (k = 0; k < C.length && k < 8 && !best; k++) if (oWellReach(g, p, C[k])) best = C[k];
  if (!best && C.length > 8) { p.oilCD = 600; return false; }   /* (more to look at, next time) */
  /* (nowhere: then over one of two fields, dug up for it, as a mine would be: mines.js) */
  if (!best && iCount(g, "farm") >= 2) {
    M_FARMOK = true;
    C = [];
    for (x = 10; x < g.gw - 10; x++) {
      var LF = oFloors(g, x, fy);
      for (var nf = 0; nf < LF.length; nf++) for (k = 0; k < 2; k++) {
        r = oWellPlot(g, x - 2, LF[nf], k);
        if (r && !(p.wellNo[oWellKey(x, r)] > g.tick) && mFieldsUnder(g, x - 6, x + 6) <= 1 && mFieldSpare(g, r.x0 - 4, r.x0 + 8)) { r.at = x; C.push(r); }   /* (a field to spare: mines.js) */
      }
    }
    C.sort(function (a, b) { return a.work - b.work; });
    for (k = 0; k < C.length && k < 8 && !best; k++) if (oWellReach(g, p, C[k])) best = C[k];
    M_FARMOK = false;
    if (best) mDigUpFields(g, best.x0 - 4, best.x0 + 8, "an oil well");
  }
  if (!best) { p.oilCD = 1800; iNoRoom(g, "a derrick over the oil"); return false; }
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
  mClearSpot(g, plan, best.pump.x, best.pump.y, x0, x1);   /* (the place to stand at the pump, kept clear: mines.js) */
  var s = bNew(g, "well", p, plan, [x0 - 3, T - 5, x1 + 3, F + 3],
               { G: F, T: T, dx0: x0, dx1: x1, col: x0 + 2, spill: best.spill, pump: best.pump, oilY: best.oilY, oilX: best.oilX,
                 tank: 0, barrels: 0, dry: false, pumpT: 0, spots: [{ x: best.pump.x, y: best.pump.y, a: x0, b: x1, step: 1 }] });
  feed(g, p.name + " is building an oil well", "#d8c090", "plan" + s.id);
  pSay(g, p, "planWell", true);
  if (bCarries(p)) bJoin(g, p, s);
  return true;
}
/* is (x0 .. x0 + 4) a place for a derrick, near row fy, with oil under it (the pump on the left of it, or with flip on
   the right, and the spout the other side). {x0, F, dig, fill, oilY, oilDepth, spill, pump, work} or null */
function oWellPlot(g, x0, fy, flip) {
  var x1 = x0 + 4, pumpX = flip ? x1 + 2 : x0 - 2, spillX = flip ? x0 - 2 : x1 + 2, gy = [], x, y, c, k, F = 1 << 20, G, T, dig = [], fill = [],
      oilY = -1, oilDepth = 0, bestD = 1e9, d, gs, gp, spoutY, pumpY;
  if (x0 < 8 || x1 > g.gw - 9) return null;
  var hi = -1;
  /* (a grown tree on the plot, or by the pump, is felled first: mines.js mFellable) */
  for (x = x0; x <= x1; x++) {
    G = mGroundNear(g, x, true, fy);   /* (the floor that row fy is on: mines.js) */
    if (G < 0 || Math.abs(G - fy) > 16 || !pSolid(g, x, G)) return null;
    gy.push(G); if (G < F) F = G; if (G > hi) hi = G;
  }
  /* (lumpy ground is levelled: the high end dug down to the deck, posts under the low end) */
  if (hi - F > 8) return null;
  F = Math.max(F, hi - 4);
  T = F - O_H;
  if (T < 16) return null;
  /* the pump goes on one side, the oil comes out the other. both about level (a step or so up or down), with room */
  gp = mGroundNear(g, pumpX, true, fy); gs = mGroundNear(g, spillX, true, fy);
  if (gp < 0 || gs < 0 || Math.abs(gp - F) > 4 || Math.abs(gs - F) > 4) return null;
  if (!pSolid(g, pumpX, gp) || !pSolid(g, spillX, gs)) return null;
  pumpY = gp - 1;
  if (!pRoom(g, pumpX, pumpY)) return null;
  spoutY = gs - 1;
  if (!AIRY[pCell(g, spillX, spoutY)] || !AIRY[pCell(g, spillX, spoutY - 1)]) return null;
  /* nothing of anybody else's in the way (with a step's room past the pump and the spout), and nothing wet, hot or
     touchy close by */
  for (k = 0; k < g.sites.length; k++) {
    var t = g.sites[k];
    if (M_FARMOK && t.kind === "farm") continue;
    if (x1 + 3 >= t.x0 && x0 - 3 <= t.x1 && F + 4 >= t.y0 && T - 7 <= t.y1) return null;
  }
  for (y = T - 4; y <= F + 2; y++) for (x = x0 - 3; x <= x1 + 3; x++) {
    c = pCell(g, x, y);
    if (LIQUID[c] || HOT[c] || c === MAT.DRAIN || P_BANG[c]) return null;
  }
  /* clear sky over the derrick (bushes and loose sand are dug out first) */
  for (y = T - 4; y < F; y++) for (x = x0; x <= x1; x++) {
    c = pCell(g, x, y);
    if (AIRY[c]) continue;
    if ((!mClear(g, x, y, c) && !mDiggable(g, x, y)) || mTaken(g, x, y)) return null;
    dig.push([x, y]);
  }
  /* oil under the drill, or off to one side of it down in the rock (the bore is turned towards it), at least a few
     cells down (a puddle on the ground is not a well) */
  var oilX = -1, col = x0 + 2;
  for (x = Math.max(1, col - O_SLANT); x <= Math.min(g.gw - 2, col + O_SLANT); x++) for (y = F + 4; y < Math.min(g.gh - 1, F + O_DEEP); y++) {
    if (!oReservoirOil(g, y * g.gw + x)) continue;
    d = (y - F) * 2 + Math.abs(x - col);
    if (d < bestD && oBore(g, col, gy[2], x, y)) { bestD = d; oilY = y; oilX = x; oilDepth = y - F; }
    break;   /* (the top of the pool, in this column) */
  }
  if (oilY < 0) return null;
  /* posts under the low end of the deck */
  for (k = 0; k < 5; k++) if (gy[k] > F) for (y = gy[k] - 1; y > F; y--) fill.push([x0 + k, y]);
  dig.sort(function (a, b) { return a[1] - b[1]; });
  return { x0: x0, F: F, dig: dig, fill: fill, oilY: oilY, oilX: oilX, oilDepth: oilDepth, work: dig.length + fill.length,
           spill: { x: spillX, y: spoutY }, pump: { x: pumpX, y: pumpY } };
}
/* the way down from the ground under the deck (which may be on short posts) at column col, row y0, to the oil at (ox,
   oy): straight down to the row over it, then along (through the rock only) and into it. through earth and rock, not
   a pipe dangling from a bridge, through somebody's building, or through the open air of a mine */
function oBore(g, col, y0, ox, oy) {
  var x, y, c, d = ox < col ? -1 : 1;
  for (y = y0; y < oy - (ox === col ? 0 : 1); y++) {
    c = pCell(g, col, y);
    if ((!ROCK[c] && c !== MAT.SAND && c !== MAT.SOIL && c !== MAT.ASH && c !== MAT.SNOW && c !== MAT.SALT) || mTaken(g, col, y)) return false;
  }
  if (ox === col) return true;
  /* (turned only once it is in the rock: a bore along under the sand would fill with it) */
  if (!ROCK[pCell(g, col, oy - 1)]) return false;
  for (x = col; x !== ox; x += d) { c = pCell(g, x, oy - 1); if (!ROCK[c] || bMarked(g, x, oy - 1)) return false; }
  return true;
}
/* the bore of well w, already sunk, from y0 down column col and along to oil at (ox, oy): as oBore, but through what the
   well has pumped out of the pool already (empty, or still runny) as well as rock and sand. never through a mine's
   workings: a gallery across the bore is a gap no pipe crosses */
function oBoreOpen(g, col, y0, ox, oy, w) {
  var x, y, d = ox < col ? -1 : 1;
  function ok(x, y) {
    var c = pCell(g, x, y);
    if (w && x >= w.x0 && x <= w.x1 && y >= w.y0 && y <= w.y1 && bMarked(g, x, y)) return true;   /* (the well's own ironwork: posts under its deck) */
    if (ROCK[c] || c === MAT.SAND || c === MAT.SOIL || c === MAT.ASH || c === MAT.SNOW || c === MAT.SALT) return true;
    if (!AIRY[c] && !LIQUID[c]) return false;
    /* (empty, or runny: only down in the pool, where the pump has drawn it off. a hole higher up is a cave, or a working,
       and the pipe is open to it) */
    if (w && w.oilY > 0 && y < w.oilY - 2) return false;
    for (var k = 0; k < g.sites.length; k++) { var t = g.sites[k]; if (t.mine && x >= t.x0 && x <= t.x1 && y >= t.y0 && y <= t.y1) return false; }
    return true;
  }
  for (y = y0; y < oy - (ox === col ? 0 : 1); y++) if (!ok(col, y)) return false;
  if (ox !== col) for (x = col; x !== ox; x += d) if (!ok(x, oy - 1)) return false;
  return true;
}

/* -------------------------------------------------------------------
   WHAT THEY DO ABOUT IT
   ------------------------------------------------------------------- */
/* before the ordinary round of jobs: a pack on their back and a mind to fly it, or iron in their pocket and a tank of
   oil at the well. (called from pPickTask, so it is not lost under a pile of building work) */
function oFirst(g, p) {
  if (!g.know.rocket) return false;
  if (p.pack) return p.bored > 900 && Math.random() < 0.3 && (oFuel(p) ? oLaunch(g, p) || oGoLaunch(g, p) : oGoRefuel(g, p));
  if ((p.iron || 0) < 1 || p.hunger >= P_HUNGRY || p.fire || p.sleep || p.cold > 200 || p.panic > 0 ||
      (p.tired || 0) > B_SLEEPY) return false;
  if (Math.random() >= 0.6) return false;
  return oGoPack(g, p);
}
function oPick(g, p, hungry) {
  if (!g.know.oil) return false;
  /* oil, iron, and a pack on their back: up they go. (or, with it empty, off to the well to fill it up) */
  if (p.pack && p.bored > 900 && Math.random() < 0.25 && (oLaunch(g, p) || (oFuel(p) && oGoLaunch(g, p)))) return true;
  if (p.pack && !hungry && oFuel(p) < O_PACK_FUEL && Math.random() < 0.3 && oGoRefuel(g, p)) return true;
  /* a pack comes before another shift at the pump: the tank is there to be used */
  if (g.know.rocket && !hungry && !p.pack && Math.random() < 0.5 && oGoPack(g, p)) return true;
  if (!hungry && Math.random() < 0.5 && oGoPump(g, p)) return true;
  if (!p.oilCD && !hungry && Math.random() < 0.2) {
    if (oPlanWell(g, p)) return true;
    if (!p.oilCD) p.oilCD = 1800;   /* (unless the planner said when to look again) */
  }
  return false;
}
function oGoPump(g, p) {
  var best = null, bd = 220, k, s, d;
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if (s.kind !== "well" || !s.done || s.repair || s.dry || s.blockT > g.tick || pAvoid(g, p, s.pump.x)) continue;
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
  if (k.kind === "refuel") return oTaskRefuel(g, p, k);
  if (k.kind === "launch") return oTaskLaunch(g, p, k);
  return undefined;
}
/* a pack on their back, a mind to fly it, and a roof (or a tree, or a cliff) in the way here: off to somewhere near
   with open sky over it, and up from there */
function oGoLaunch(g, p) {
  var fx = Math.floor(p.x), d, s, x, G;
  for (d = 4; d <= 90; d++) for (s = -1; s <= 1; s += 2) {
    x = fx + d * s;
    if (x < 2 || x > g.gw - 3 || pAvoid(g, p, x)) continue;
    G = mGround(g, x);
    var dir = G >= 27 && pSolid(g, x, G) ? oSkyOk(g, x, G - 1) : 0;
    if (!dir) continue;
    p.task = { kind: "launch", x: x, y: G - 1, t: 0, dir: dir };
    return true;
  }
  return false;
}
/* open sky over (x, y), for a pack leaving from there: the way to point it (1 or -1, as oLaunch would aim it facing
   that way), or 0 if neither way is clear */
function oSkyOk(g, x, y) {
  for (var Y = y - 2; Y >= y - 22; Y--) if (Y < 0 || !AIRY[pCell(g, x, Y)]) return 0;
  for (var k = 0; k < 2; k++) {
    var dir = k ? -1 : 1, room = dir < 0 ? x + 0.5 : g.gw - x - 0.5;
    if (room < 90) continue;   /* (oLaunch turns them round, that close to the edge: the other way is the one to try) */
    if (oClearFlight(g, x + 0.5, y, dir * clamp((room - 20) / 140, 0.1, 0.8))) return dir;
  }
  return 0;
}
function oTaskLaunch(g, p, k) {
  if (!p.pack || !oFuel(p) || ++k.t > 1800) return iDone(p, false);
  var fy = Math.floor(p.y);
  if (Math.abs(p.x - k.x - 0.5) > 1 || Math.abs(fy - k.y) > 2) {
    if (iWalk(g, p, k, "launch" + k.x, k.x, k.y, function (x, y) { return Math.abs(x - k.x) <= 1 && Math.abs(y - k.y) <= 2; })) pGiveUp(g, p, k.x);
    return false;
  }
  /* there: point it the way that was clear, and go */
  p.task = null; p.dir = k.dir || p.dir;
  if (!oLaunch(g, p)) { p.avoidX = k.x; p.avoidT = g.tick + 2400; }
  return true;
}
/* flights left in their rocket pack (an old pack, from before anybody counted, is full) */
function oFuel(p) { return !p.pack ? 0 : (p.fuel == null ? O_PACK_FUEL : p.fuel); }
/* the nearest well with a flight's worth of oil in its tank */
function oTankFor(g, p, n) {
  var best = null, bd = 220, k, s, d;
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if (s.kind !== "well" || !s.done || s.repair || s.tank < n || pAvoid(g, p, s.pump.x)) continue;
    d = Math.abs(s.cx - p.x);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}
/* a pack with room in it, and a well with oil in the tank: off to fill it up */
function oGoRefuel(g, p) {
  if (!p.pack || oFuel(p) >= O_PACK_FUEL) return false;
  var s = oTankFor(g, p, O_PACK_OIL / O_PACK_FUEL);
  if (!s) return false;
  p.task = { kind: "refuel", site: s.id, t: 0, act: 0 };
  return true;
}
function oTaskRefuel(g, p, k) {
  var s = bSite(g, k.site), sx, sy, fy = Math.floor(p.y), per = O_PACK_OIL / O_PACK_FUEL;
  if (!s || s.kind !== "well" || !s.done || s.repair || !p.pack || ++k.t > 2400) return iDone(p, false);
  sx = s.pump.x; sy = s.pump.y;
  if (Math.abs(p.x - sx - 0.5) > 1.2 || Math.abs(fy - sy) > 2) {
    if (iWalk(g, p, k, "refuel" + s.id, sx, sy, function (x, y) { return Math.abs(x - sx) <= 1 && Math.abs(y - sy) <= 2; })) pGiveUp(g, p, sx);
    return false;
  }
  p.dir = s.col < p.x ? -1 : 1; p.idle = 0; p.pose = "stand";
  if (++k.act === 10 && p.sayT <= 0) pSay(g, p, "refuel");
  if (k.act < O_REFUEL) return true;
  /* as much as the tank will give, a flight's worth at a time */
  while (oFuel(p) < O_PACK_FUEL && s.tank >= per) { s.tank -= per; p.fuel = oFuel(p) + 1; }
  return iDone(p, true);
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
  if (j >= 0) s.blockSince = 0;   /* (open again) */
  if (j < 0) {
    /* (no oil the bore can get to: run dry, or only cut off from what is still down there) */
    if (oFindOil(g, s, true) >= 0) oBlocked(g, s); else oRunDry(g, s, p);
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
  p.pack = 1; p.fuel = O_PACK_FUEL; g.packs = (g.packs || 0) + 1;
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
  if (!oFuel(p)) { if (p.sayT <= 0) pSay(g, p, "noFuel"); return false; }
  for (y = fy - 2; y >= fy - 22 && y >= 0; y--) if (!AIRY[pCell(g, fx, y)]) return false;   /* indoors, or under a roof */
  if (fy < 26) return false;
  /* no steering to speak of, but they do point it at the valley: away from the edge of the world, if it is close, and
     not so hard that they come down off the end of it (a flight goes about a hundred and forty times as far across as
     the push across it) */
  var room = p.dir < 0 ? p.x : g.gw - p.x;
  if (room < 90) { p.dir = -p.dir; room = p.dir < 0 ? p.x : g.gw - p.x; }
  var vx = p.dir * clamp((room - 20) / 140, 0.1, 0.8);
  if (!oClearFlight(g, p.x, p.y, vx)) return false;   /* (a tower, a tree, a roof in the way of the climb: not here) */
  p.fuel = oFuel(p) - 1;
  hFlew(g, p);   /* (counted, for the moon rocket: heavens.js) */
  p.state = "fly"; p.flyT = 0; p.launch = 1; p.immune = Math.max(p.immune || 0, 600); p.fallY = p.y;
  p.vx = vx; p.vy = -O_LAUNCH; p.spin = 0;
  p.task = null; p.idle = 0; p.bored = 0; p.falling = false;
  g.fx.whoosh++; g.fx.whee++;
  pSay(g, p, "launch", true);
  if (g.got.rocket) feed(g, pick(O_FLY_NEWS).replace("{n}", p.name), "#ffd27a", "fly");
  achieve(g, "rocket");
  return true;
}
/* is the way up clear, for a rocket pack leaving (x, y) going across at vx: the climb, as it would fly it, with room
   for the one on it, all the way to the top of it */
function oClearFlight(g, x, y, vx) {
  var vy = -O_LAUNCH, t, k;
  for (t = 0; t < 60 && vy < 0.5; t++) {
    x += vx; y += vy; vy += 0.1; vx *= 0.995;
    if (y < 1) return true;
    for (k = 0; k <= 8; k += 4) if (!AIRY[pCell(g, Math.floor(x), Math.floor(y) - k)]) return false;
  }
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
    if (!s.dry && g.tick - s.last >= O_PUMP && !(s.blockT > g.tick) && oFindOil(g, s) < 0) { if (oFindOil(g, s, true) >= 0) oBlocked(g, s); else oRunDry(g, s); }
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
    /* the bore: a dark pipe down from under the deck to the pool, with a rod inside it (and turned along, under the
       rock, if the oil was off to one side) */
    var ox = s.oilX == null || s.oilX < 0 ? s.col : s.oilX;
    U = s.oilY == null ? s.G + O_DEEP : s.oilY - (ox === s.col ? 0 : 1);
    for (y = s.G + 1; y < Math.min(gh, U + 1); y++) {
      j = y * gw + s.col;
      if (g.m[j] === MAT.OIL) continue;
      px[j] = blend32(px[j], (y - s.G) % 4 === 0 ? O_PIPE_HI : O_PIPE, 0.55);
    }
    if (ox !== s.col && U < gh) for (x = s.col; x !== ox + (ox < s.col ? -1 : 1); x += ox < s.col ? -1 : 1) {
      j = U * gw + x;
      if (g.m[j] !== MAT.OIL) px[j] = blend32(px[j], (x - s.col) % 4 === 0 ? O_PIPE_HI : O_PIPE, 0.55);
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
    /* the horsehead on the pump's end of the beam */
    var hx = s.pump.x < s.col ? s.dx0 - 1 : s.dx1 + 1, hd = s.pump.x < s.col ? -1 : 1, hu = s.pump.x < s.col ? up : -up;
    oPut(g, hx, y - hu - 1, O_BEAM_HI, true);
    oPut(g, hx + hd, y - hu, O_BEAM, true);
    oPut(g, hx + hd, y - hu - 1, O_BEAM_HI, true);
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
