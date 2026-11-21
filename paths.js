/* =====================================================================
   PLEASAND  --  paths.js

   finding the way. a peasant going somewhere on purpose (to a tree, a
   building site, its bed) used to walk straight at it, and give up at
   the first wall. now it looks for a route first.

   the map is the places a peasant could stand: room for its body, and
   something under its feet (or water to swim in). the ways between them
   are the ways a peasant really moves, worked out with the same rules
   as the walking: a step along (up to three up, two down), walking off
   an edge, a leap over a gap, a jump up a ledge, a ladder, a ninja rope
   up a wall, a swim, straight up through a tree (or down through it). each has a cost, so a route goes round by the
   stairs rather than up the rope, and over the bridge rather than
   through the pond, and nowhere near anything that burns or dissolves.

   the search is A*, on the grid itself, capped so that a peasant who
   cannot get somewhere finds out quickly. the route is a list of
   standing places; following it just means facing the next one and
   walking, and telling the walking which move the route had in mind
   (so a jump is jumped, not turned back from). it is planned again now
   and then, and whenever they wander off it: the world is falling sand,
   and routes do not last.
   ===================================================================== */
"use strict";

var NAV_CAP = 4000;                 /* places looked at, at most, per search */
var NAV_REPLAN = 240;               /* ticks a route is trusted for */
var NAV_NOROPE = false;             /* set while looking for a route for somebody who cannot use a rope just now */
var NAV_NOLEAP = false;             /* and for somebody burning: no leaps, no ladders */
var NAV_HOTOK = false;              /* (while finding where a burning peasant starts from: hot ground will do) */
var NAV_MOVES = ["walk", "drop", "leap", "jump", "rope", "ladder", "hook", "up", "down"];
var NAV_WALK = 0, NAV_DROP = 1, NAV_LEAP = 2, NAV_JUMP = 3, NAV_ROPE = 4, NAV_LADDER = 5, NAV_HOOK = 6, NAV_UP = 7, NAV_DOWN = 8;

/* could a peasant stand with its feet at (x, y): 1 on something solid, 2 swimming at the top of some water, 0 not */
function navStand(g, x, y) {
  if (x < 1 || x > g.gw - 2 || y < 9 || y >= g.gh) return 0;
  if (!pRoom(g, x, y) || navHazard(g, x, y)) return 0;
  if (pGround(g, x, y)) return 1;
  if (WET[pCell(g, x, y + 1)] && !LIQUID[pCell(g, x, y)]) return 2;
  return 0;
}
/* somewhere they would rather not be: fire, lava, acid or a drain in or under them, or ground too hot to stand on */
function navBad(c) { return HOT[c] || c === MAT.ACID || c === MAT.DRAIN; }
/* a drain where they stand, under them, or under either side: it has them (peasants.js pStep) */
function navDrainAt(g, x, y) {
  return pCell(g, x, y) === MAT.DRAIN || pCell(g, x, y + 1) === MAT.DRAIN || pCell(g, x - 1, y + 1) === MAT.DRAIN || pCell(g, x + 1, y + 1) === MAT.DRAIN;
}
/* anything that would kill a peasant (navBad), within r cells of anywhere their body would be, standing at (x, y) */
function navLethalNear(g, x, y, r) {
  for (var dx = -r; dx <= r; dx++) for (var dy = -9 - r; dy <= 1 + r; dy++) if (navBad(pCell(g, x + dx, y + dy))) return true;
  return false;
}
function navHazard(g, x, y) {
  return navBad(pCell(g, x, y + 1)) || navBad(pCell(g, x, y)) || navBad(pCell(g, x, y - 4)) || navBad(pCell(g, x, y - 7)) ||
         (!NAV_HOTOK && (pHotAt(g, x, y + 1) || pHotAt(g, x, y - 3))) ||   /* (where a burning peasant starts from may be hot: NAV_HOTOK) */
         (g.wAny && !NAV_WORKER && wNoEntry(g, x, y));   /* (a live foundry's ground, but for its founder: wonders.js) */
}
var NAV_WORKER = false;   /* (finding the way for a foundry's founder, at work: its ground is theirs. pathGo) */

/* every way on from (x, y), as add(x, y, cost, move) */
function navEdges(g, x, y, add) {
  var s, nx, k, d, dy, ny, j, top, c;
  for (s = -1; s <= 1; s += 2) {
    nx = x + s;
    if (nx < 1 || nx > g.gw - 2) continue;
    /* along: up to three up, as pStepX does it */
    k = pStepUp(g, nx, y);
    if (k <= 3) {
      ny = y - k;
      if (!pGround(g, nx, ny)) for (d = 1; d <= 2; d++) if (pGround(g, nx, ny + d) && pRoom(g, nx, ny + d)) { ny += d; break; }
      c = navStand(g, nx, ny);
      if (c) { add(nx, ny, c === 2 ? 3 : 1, NAV_WALK); continue; }
      /* off the edge: the first thing to land on below (a long way down costs; much further is not a route at all) */
      for (d = 1; d <= 76; d++) {
        if (ny + d >= g.gh || pBody(g, nx, ny + d - 1)) { d = 99; break; }
        if (navStand(g, nx, ny + d)) break;
      }
      if (d <= 76) {   /* (found somewhere to land, in the grid) */
        if (d <= 6) add(nx, ny + d, 1 + d * 0.2, NAV_WALK);
        else add(nx, ny + d, 3 + d * 0.25 + (d > 34 ? 40 : 0), NAV_DROP);
      }
      /* or leap it, if it is a real gap and there is a far side close enough (pTryLeap) */
      if (d > 6 && !NAV_NOLEAP && navCanLeap(g, x, y)) {
        /* the landing pTryLeap would aim for is the first one it finds: the leap is only a route if that one is safe */
        for (j = 3; j <= P_GAP; j++) {
          var lx = x + s * j, hit = false;
          if (lx < 1 || lx > g.gw - 2 || pBody(g, lx, y - 9) || pBody(g, lx, y - 12)) break;
          for (dy = -3; dy <= 3; dy++) if (pGround(g, lx, y + dy) && pRoom(g, lx, y + dy)) {
            if (navStand(g, lx, y + dy)) add(lx, y + dy, 3 + j, NAV_LEAP);
            hit = true; break;
          }
          if (hit) break;
        }
      }
      continue;
    }
    /* a lintel, or a low overhang: ducking under it, a step or two down (pStepX, pDuckUnder) */
    var dn = pDuckUnder(g, nx, y);
    if (dn && navStand(g, nx, y + dn)) { add(nx, y + dn, 1 + dn * 0.2, NAV_WALK); continue; }
    /* a wall: jump it (pTryJump) */
    var room = true;
    for (j = 9; j < 12; j++) if (pBody(g, x, y - j)) room = false;
    if (room) for (k = 4; k <= P_JUMP; k++) {
      if (pBody(g, x, y - k - 8)) break;
      if (pRoom(g, nx, y - k)) { if (navStand(g, nx, y - k)) add(nx, y - k, 4, NAV_JUMP); break; }
    }
    /* or rope up it (pTryClimb): the dear way, so stairs and ladders win when there are any */
    for (k = 4; k <= P_ROPE; k++) if (pRoom(g, nx, y - k)) break;
    if (k > P_JUMP && k <= P_ROPE) {
      for (j = 9; j <= k + 9 && !pBody(g, x, y - j); j++);
      top = y - k + 1;
      if (!NAV_NOROPE && j > k + 9 && pSolid(g, nx, top) && pCell(g, nx, top) !== MAT.INERT && navStand(g, nx, y - k)) add(nx, y - k, 25 + k * 0.6, NAV_ROPE);
    }
  }
  /* the end of a ledge overhead: hook it and climb up past it (pTryHook) */
  for (s = -1; s <= 1 && !NAV_NOROPE; s += 2) {
    var hk = pHookGeom(g, x, y, s);
    if (hk && navStand(g, x + s, hk.stand)) add(x + s, hk.stand, 25 + hk.h * 0.6, NAV_HOOK);
  }
  /* up through a bush or a tree overhead, onto the top of it (pTryUp), and down through the one underfoot (pTrySink) */
  var up = navUp(g, x, y);
  if (up >= 0 && (y - up <= P_JUMP || !NAV_NOROPE)) add(x, up, y - up <= P_JUMP ? 4 + (y - up) * 0.3 : 25 + (y - up) * 0.6, NAV_UP);   /* (higher than a jump: the rope) */
  var dn = navSink(g, x, y);
  if (dn >= 0) add(x, dn, 2 + (dn - y) * 0.25 + (dn - y > 34 ? 40 : 0), NAV_DOWN);
  /* a ladder, up from the foot of it to wherever it lets them off at the top. (not burning: they would let go of it.
     build.js bClimbStep) */
  var cx = NAV_NOLEAP ? -1 : bLadderNear(g, x, y);
  if (cx >= 0) {
    for (j = y; j > 0 && pCell(g, cx, j) === MAT.LADDER && !pBody(g, cx, j - 9); j--);
    if (pCell(g, cx, j) === MAT.LADDER) j = y;   /* something overhead: the climber would stop under it (bClimbStep) */
    /* (a ladder with a lift on it is a good deal quicker: mines.js) */
    var rate = mLiftAt(g, cx, y) ? 0.3 : 1.2;
    for (s = -1; s <= 1; s += 2) if (j < y - 3 && bStepOff(g, cx, j, s) && navStand(g, cx + 2 * s, j)) add(cx + 2 * s, j, 2 + (y - j) * rate, NAV_LADDER);
  }
  /* and down one, from beside the top of it */
  for (s = -1; s <= 1 && !NAV_NOLEAP; s += 2) {
    cx = bLadderMid(g, x + s, y + 1);
    if (cx < 0) continue;
    for (j = y; pCell(g, cx, j + 1) === MAT.LADDER && j < g.gh; j++);
    if (j > y + 3 && navStand(g, cx, j)) add(cx, j, 2 + (j - y) * (mLiftAt(g, cx, j) ? 0.3 : 1.2), NAV_LADDER);
  }
}
/* the top of the soft stuff overhead (feet out of it, standing on it), with the way up clear of anything hard: its row,
   or -1. no further up than the rope goes */
function navUp(g, x, y) {
  for (var k = 1; k <= P_ROPE; k++) {
    var ty = y - k;
    if (ty < 9 || pBody(g, x, ty - 8) || navBad(pCell(g, x, ty))) return -1;
    if (k >= 4 && !P_SOFT[pCell(g, x, ty)] && P_SOFT[pCell(g, x, ty + 1)])
      return navStand(g, x, ty) === 1 && !pBody(g, x, ty - 9) && !pBody(g, x, ty - 10) ? ty : -1;
  }
  return -1;
}
/* standing on something soft (in this column, and nothing hard under them either side): where they would come down,
   sinking through it, or -1. somewhere safe, and a real way down: not just into a skin of it lying on the ground */
function navSink(g, x, y) {
  if (!P_SOFT[pCell(g, x, y + 1)] || pFoot(g, x - 1, y) && !P_SOFT[pCell(g, x - 1, y + 1)] ||
      pFoot(g, x + 1, y) && !P_SOFT[pCell(g, x + 1, y + 1)]) return -1;
  for (var d = 1; d <= 76 && y + d < g.gh; d++) {
    var c = pCell(g, x, y + d);
    if (pBody(g, x, y + d) || navBad(c)) return -1;
    if (d > 1 && navStand(g, x, y + d)) return d < 4 ? -1 : y + d;
  }
  return -1;
}
function navCanLeap(g, x, y) { for (var k = 0; k <= 8; k++) if (pBody(g, x, y - 9 - k)) return false; return true; }

/* A*, from (sx, sy) to anywhere goal(x, y) likes, guided towards (tx, ty). a list of {x, y, m} (m: the move that gets
   there) not including the start, or null */
function navFind(g, sx, sy, goal, tx, ty, cap) {
  var sink = P_SINK;
  P_SINK = false;   /* (the map is of the world as it stands, not as it is for somebody sinking through it) */
  var r = navFind1(g, sx, sy, goal, tx, ty, cap);
  P_SINK = sink;
  return r;
}
function navFind1(g, sx, sy, goal, tx, ty, cap) {
  cap = cap || NAV_CAP;
  var n = g.gw * g.gh, gw = g.gw;
  if (!g.navSeen || g.navSeen.length !== n) {
    g.navSeen = new Uint32Array(n); g.navShut = new Uint32Array(n); g.navCost = new Float32Array(n);
    g.navFrom = new Int32Array(n); g.navHow = new Int8Array(n);
    g.navHeapI = new Int32Array(NAV_CAP * 24); g.navHeapF = new Float32Array(NAV_CAP * 24); g.navGen = 0;
  }
  var gen = ++g.navGen, seen = g.navSeen, shut = g.navShut, cost = g.navCost, from = g.navFrom, how = g.navHow;
  var HI = g.navHeapI, HF = g.navHeapF, hn = 0, looked = 0, start = sy * gw + sx, best = -1;
  function push(i, f) {
    if (hn >= HI.length) return;
    var k = hn++;
    while (k > 0) { var up = (k - 1) >> 1; if (HF[up] <= f) break; HI[k] = HI[up]; HF[k] = HF[up]; k = up; }
    HI[k] = i; HF[k] = f;
  }
  function pop() {
    var top = HI[0], li = HI[--hn], lf = HF[hn], k = 0;
    for (;;) {
      var c = 2 * k + 1;
      if (c >= hn) break;
      if (c + 1 < hn && HF[c + 1] < HF[c]) c++;
      if (HF[c] >= lf) break;
      HI[k] = HI[c]; HF[k] = HF[c]; k = c;
    }
    HI[k] = li; HF[k] = lf;
    return top;
  }
  function h(x, y) { return tx == null ? 0 : Math.abs(x - tx) + Math.abs(y - ty) * 0.5; }
  seen[start] = gen; cost[start] = 0; from[start] = -1; how[start] = 0;
  push(start, h(sx, sy));
  var cur, cx, cy, base;
  function add(x, y, c, m) {
    if (x < 0 || y < 0 || x >= gw || y >= g.gh) return;
    var i = y * gw + x, nc = base + c;
    if (shut[i] === gen) return;
    if (seen[i] === gen && cost[i] <= nc) return;
    seen[i] = gen; cost[i] = nc; from[i] = cur; how[i] = m;
    push(i, nc + h(x, y));
  }
  while (hn > 0 && looked < cap) {
    cur = pop();
    if (shut[cur] === gen) continue;
    shut[cur] = gen; looked++;
    cx = cur % gw; cy = (cur / gw) | 0; base = cost[cur];
    if (goal(cx, cy)) { best = cur; break; }
    navEdges(g, cx, cy, add);
  }
  if (best < 0) return null;
  var path = [];
  for (var i = best; i !== start && i >= 0 && path.length < n; i = from[i]) path.push({ x: i % gw, y: (i / gw) | 0, m: how[i] });
  path.reverse();
  return path;
}

/* where p is standing, as far as the map is concerned: its feet, or the top of the water it is swimming in */
function navHere(g, p) {
  var fx = Math.floor(p.x), fy = Math.floor(p.y), d, s;
  for (d = 0; d <= 9; d++) for (s = 0; s < 2; s++) {
    var y = s ? fy - d : fy + d;
    if (navStand(g, fx, y)) return { x: fx, y: y };
    if (!d) break;
  }
  return null;
}

/* take p one tick further along a route to anywhere goal(x, y) likes, near (tx, ty); key names the errand, so a new
   errand gets a new route. sets p.dir, and p.navMove for the walking. returns how many places are left on the route
   (0: they are standing somewhere goal likes already), or -1 if there is no route: then the caller does what it did
   before there were routes, and walks straight at it */
function pathGo(g, p, key, tx, ty, goal) {
  var nv = p.nav, k;
  if (nv && nv.key === key && nv.none > g.tick) return -1;
  /* something nasty has turned up on the next few steps (a fire somebody just lit): look again */
  NAV_WORKER = !!(g.wAny && wWorker(p));
  if (nv && nv.key === key && nv.path.length) for (k = nv.i; k < nv.i + 4 && k < nv.path.length; k++) if (navHazard(g, nv.path[k].x, nv.path[k].y)) { nv.t = -1e9; break; }
  NAV_WORKER = false;
  if (!nv || nv.key !== key || g.tick - nv.t > NAV_REPLAN || nv.off > 30 || nv.i >= nv.path.length) {
    NAV_HOTOK = !!p.fire || !!(g.wAny && p.task && p.task.kind === "wcool" && p.task.zone);   /* (burning: where they stand may be hot. the way on from there keeps out of the heat. and out of a live foundry's ground, the same) */
    NAV_WORKER = !!(g.wAny && wWorker(p));   /* (reset below, once the way is found) */
    var here = navHere(g, p);
    NAV_HOTOK = false;
    if (here && goal(here.x, here.y)) { NAV_WORKER = false; p.nav = { key: key, path: [], i: 0, t: g.tick, off: 0 }; return 0; }
    /* (a rope they cannot use yet, after a fall off one: no routes that need it, until they can) */
    /* (burning, too: no rope, no hook, no leap. pTryHook, pTryLeap) */
    NAV_NOROPE = p.ropeCD > 0 || !!p.fire; NAV_NOLEAP = !!p.fire;
    var path = here ? navFind(g, here.x, here.y, goal, tx, ty) : null;
    NAV_NOROPE = NAV_NOLEAP = false;
    /* (no way without one: the way with one, then, and they wait at the foot of it until they can) */
    if (!path && here && p.ropeCD > 0 && !p.fire) path = navFind(g, here.x, here.y, goal, tx, ty);
    NAV_WORKER = false;
    if (!path) { p.nav = { key: key, none: g.tick + 120, path: [], i: 0, t: g.tick, off: 0 }; return -1; }
    nv = p.nav = { key: key, path: path, i: 0, t: g.tick, off: 0 };
  }
  var P = nv.path, n, py = p.y;
  /* (swimming: where they are is the top of the water, as the route has it, not their feet down in it) */
  if (p.swimming) { var sh = navHere(g, p); if (sh) py = sh.y; }
  /* past the places already reached. a step through a tree needs the row to be
     exactly right: a couple of rows of walking slack would otherwise count as
     arriving at the top of the bush, and the sink from up there goes nowhere.
     next.m is the move out of here, so this tightens only where the through
     move starts, not where it lands */
  while (nv.i < P.length) {
    var here = P[nv.i], next = P[nv.i + 1];
    var vtol = next && (next.m === NAV_UP || next.m === NAV_DOWN || next.m === NAV_HOOK) ? 0.75 : 3.5;   /* (a hook, too: thrown from a row off, it does not catch) */
    if (!(Math.abs(p.x - here.x - 0.5) < 0.7 && Math.abs(py - here.y) < vtol)) break;
    nv.i++;
  }
  if (nv.i >= P.length) return 0;
  n = P[nv.i];
  /* perched on a bush (or a tree) that the route goes along the foot of: down through it first. walking on along its
     top, at that height, a door's lintel or a low roof is a wall */
  var pfx = Math.floor(p.x), pfy = Math.floor(p.y);
  if (n.y > pfy && Math.abs(n.x - pfx) <= 1 && !p.rope && !p.jumping && !p.sink && P_SOFT[pCell(g, pfx, pfy + 1)]) pTrySink(g, p, pfx, pfy, n.y - pfy + 6);
  /* wandered off it (a fall, a shove, a swim that drifted): plan again soon */
  if (Math.abs(p.x - n.x - 0.5) + Math.abs(py - n.y) > 14) nv.off++;
  /* (a hook is thrown from the column beside the ledge, the place before it on the route: that is where to be, not
     under the ledge. a swimmer drifts on past it otherwise) */
  var hx = n.m === NAV_HOOK ? (nv.i > 0 ? P[nv.i - 1].x : (n.x > Math.floor(p.x) ? n.x - 1 : n.x + 1)) : n.x;
  var dx = hx + 0.5 - p.x;
  if (Math.abs(dx) > 0.3) p.dir = dx < 0 ? -1 : 1;
  p.navMove = NAV_MOVES[n.m];
  /* the route hooks a ledge from here: throw the hook (before the walking carries them on under it) */
  if (n.m === NAV_HOOK && !p.rope) {
    var hs = n.x > hx ? 1 : -1;
    if (Math.floor(p.x) === hx) { if (p.ropeCD) p.hold = true; else if (!pTryHook(g, p, Math.floor(p.x), Math.floor(p.y), hs)) pathStale(p); }   /* (a rope they cannot use yet: wait) */
  }
  /* the route goes straight up through a tree from here, or down through it: as soon as they are in the column */
  if ((n.m === NAV_UP || n.m === NAV_DOWN) && !p.rope && !p.jumping && Math.floor(p.x) === n.x) {
    var ux = Math.floor(p.x), uy = Math.floor(p.y), u = n.m === NAV_UP ? navUp(g, ux, uy) : -1;
    if (n.m === NAV_UP && u >= 0 && uy - u > P_JUMP && p.ropeCD) p.hold = true;   /* (up there on a rope they cannot use yet: wait) */
    else if (n.m === NAV_UP ? !(u >= 0 && pTryUp(g, p, ux, uy, u)) : !pTrySink(g, p, ux, uy, 76)) pathStale(p);
  }
  /* the route goes up (or down) a ladder from here: on they get, whether or not there is a wall in front of them */
  if (n.m === NAV_LADDER && !p.climb) {
    var fx = Math.floor(p.x), fy = Math.floor(p.y), cx = n.y < fy ? bLadderNear(g, fx, fy) : -1;
    if (n.y > fy) for (k = -1; k <= 1 && cx < 0; k += 2) cx = bLadderMid(g, fx + k, fy + 1);
    if (cx >= 0 && Math.abs(cx + 0.5 - p.x) < 2.5) bClimbStart(g, p, cx, n.y < fy ? -1 : 1);
  }
  return P.length - nv.i;
}
/* walking on from (fx, fy) into column nx, with nothing under it: does the route's move still fit what is down there.
   a walk expects a short step down, a drop a fall onto somewhere safe; terrain changes, routes do not */
function pathDropOk(g, p, nx, fy) {
  var d, m = p.navMove;
  for (d = 1; d <= 86 && fy + d < g.gh; d++) if (pGround(g, nx, fy + d) || WET[pCell(g, nx, fy + d + 1)]) break;
  if (m === "walk" && d <= 6) return true;
  if (m === "drop" && d <= 76 && !pNasty(g, nx, fy) && navStand(g, nx, fy + d)) return true;
  pathStale(p);
  return false;
}
/* the route is wrong: they hit something it did not expect. look again next tick */
function pathStale(p) { if (p.nav) p.nav.t = -1e9; }

/* goals. a cell (tx, ty) to work at: somewhere to stand within rx of it across, with it no more than up above their
   feet and no more than down below */
function pathNear(tx, ty, rx, up, down) {
  return function (x, y) { return Math.abs(x - tx) <= rx && ty >= y - up && ty <= y + down; };
}

/* -------------------------------------------------------------------
   EXPLORING. now and then a peasant with nothing much to do goes to
   have a look at somewhere: somewhere it can get to (by any of the
   moves above), a good way off, up high if there is any up high (and
   not down a hole: what goes down a long way may not come up again), and
   nobody has stood lately. the village keeps a rough map of where
   everybody has been, a square of eight cells at a time.
   ------------------------------------------------------------------- */
var EXP_B = 8;
P_SAY.explore = ["i wonder what's up there", "let's have a look", "adventure!", "off exploring", "what's over there?",
  "i've never been up there", "back in a bit"];
P_SAY.view = ["what a view!", "nobody's been up here before", "i can see my house from here", "it's lovely up here",
  "i'm the king of the hill", "worth the climb", "huh. sand", "first!"];
P_ACHIEVE.explorer = ["EXPLORERS", "somebody went up there just to have a look"];

function exploreMap(g) {
  var n = ((g.gw / EXP_B) | 0) + 1, m = ((g.gh / EXP_B) | 0) + 1;
  if (!g.seenAt || g.seenAt.length !== n * m) g.seenAt = new Uint32Array(n * m);
  return n;
}
/* a few times a second: where is everybody standing */
function exploreNote(g) {
  if (g.tick % 15) return;
  var n = exploreMap(g);
  for (var k = 0; k < g.peasants.length; k++) {
    var p = g.peasants[k];
    if (p.dead || p.state !== "walk" || p.x < 0 || p.y < 0) continue;
    g.seenAt[((p.y / EXP_B) | 0) * n + ((p.x / EXP_B) | 0)] = g.tick + 1;
  }
}
/* somewhere to go and look at: everywhere they could get to from here, scored by how long since anyone stood there,
   how far up it is, and a little luck. true if they have set off */
function explorePick(g, p) {
  var here = navHere(g, p), n = exploreMap(g), best = null, bs = -1e9;
  if (!here) return false;
  navFind(g, here.x, here.y, function (x, y) {
    /* (every third place will do.) not down a hole: what goes down a long way may not come up again */
    if (Math.abs(x - here.x) + Math.abs(y - here.y) < 30 || (x + y) % 3 || y > here.y + 12) return false;
    var seen = g.seenAt[((y / EXP_B) | 0) * n + ((x / EXP_B) | 0)];
    var s = Math.min(seen ? g.tick - seen : 30000, 30000) / 3000 + Math.max(0, here.y - y) * 0.2 + Math.random() * 3;
    if (s > bs) { bs = s; best = { x: x, y: y }; }
    return false;
  }, null, null, 12000);
  if (!best) return false;
  p.task = { kind: "explore", x: best.x, y: best.y, t: 0, high: here.y - best.y };
  if (p.sayT <= 0) pSay(g, p, "explore");
  return true;
}
function exploreTask(g, p, k) {
  if (++k.t > 3000) { p.task = null; return false; }
  var fx = Math.floor(p.x), fy = Math.floor(p.y);
  if (Math.abs(fx - k.x) <= 2 && Math.abs(fy - k.y) <= 3) {
    /* there: have a good look round */
    p.task = null; p.taskDone = true; p.idle = 150 + irnd(200); p.bored = 0;
    pSay(g, p, "view", true);
    if (k.high >= 20) { feed(g, p.name + " climbed up high to have a look around", "#9ad0ff", "explore"); achieve(g, "explorer"); }
    return true;
  }
  var left = pathGo(g, p, "x" + k.x + "," + k.y, k.x, k.y, function (x, y) { return Math.abs(x - k.x) <= 2 && Math.abs(y - k.y) <= 3; });
  if (left < 0) p.dir = k.x < p.x ? -1 : 1;
  if (pStuck(p, k, left > 0 ? left : Math.abs(k.x - p.x))) { pGiveUp(g, p, k.x); return false; }
  return false;
}
