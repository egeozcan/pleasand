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
   up a wall, a swim. each has a cost, so a route goes round by the
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
var NAV_MOVES = ["walk", "drop", "leap", "jump", "rope", "ladder"];
var NAV_WALK = 0, NAV_DROP = 1, NAV_LEAP = 2, NAV_JUMP = 3, NAV_ROPE = 4, NAV_LADDER = 5;

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
function navHazard(g, x, y) {
  return navBad(pCell(g, x, y + 1)) || navBad(pCell(g, x, y)) || navBad(pCell(g, x, y - 4)) || navBad(pCell(g, x, y - 7)) ||
         pHotAt(g, x, y + 1) || pHotAt(g, x, y - 3);
}

/* every way on from (x, y), as add(x, y, cost, move) */
function navEdges(g, x, y, add) {
  var s, nx, k, d, dy, ny, j, top, c;
  for (s = -1; s <= 1; s += 2) {
    nx = x + s;
    if (nx < 1 || nx > g.gw - 2) continue;
    /* along: up to three up, as pStepX does it */
    for (k = 0; k <= 3; k++) if (pRoom(g, nx, y - k)) break;
    if (k <= 3) {
      ny = y - k;
      if (!pGround(g, nx, ny)) for (d = 1; d <= 2; d++) if (pGround(g, nx, ny + d) && pRoom(g, nx, ny + d)) { ny += d; break; }
      c = navStand(g, nx, ny);
      if (c) { add(nx, ny, c === 2 ? 3 : 1, NAV_WALK); continue; }
      /* off the edge: the first thing to land on below (a long way down costs; much further is not a route at all) */
      for (d = 1; d <= 76; d++) {
        if (ny + d >= g.gh || pSolid(g, nx, ny + d - 1)) { d = 99; break; }
        if (navStand(g, nx, ny + d)) break;
      }
      if (d <= 76) {   /* (found somewhere to land, in the grid) */
        if (d <= 6) add(nx, ny + d, 1 + d * 0.2, NAV_WALK);
        else add(nx, ny + d, 3 + d * 0.25 + (d > 34 ? 40 : 0), NAV_DROP);
      }
      /* or leap it, if it is a real gap and there is a far side close enough (pTryLeap) */
      if (d > 6 && navCanLeap(g, x, y)) {
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
      if (j > k + 9 && pSolid(g, nx, top) && pCell(g, nx, top) !== MAT.INERT && navStand(g, nx, y - k)) add(nx, y - k, 25 + k * 0.6, NAV_ROPE);
    }
  }
  /* a ladder, up from the foot of it to wherever it lets them off at the top */
  var cx = bLadderNear(g, x, y);
  if (cx >= 0) {
    for (j = y; j > 0 && pCell(g, cx, j) === MAT.LADDER && !pBody(g, cx, j - 9); j--);
    if (pCell(g, cx, j) === MAT.LADDER) j = y;   /* something overhead: the climber would stop under it (bClimbStep) */
    for (s = -1; s <= 1; s += 2) if (j < y - 3 && bStepOff(g, cx, j, s) && navStand(g, cx + 2 * s, j)) add(cx + 2 * s, j, 2 + (y - j) * 1.2, NAV_LADDER);
  }
  /* and down one, from beside the top of it */
  for (s = -1; s <= 1; s += 2) {
    cx = bLadderMid(g, x + s, y + 1);
    if (cx < 0) continue;
    for (j = y; pCell(g, cx, j + 1) === MAT.LADDER && j < g.gh; j++);
    if (j > y + 3 && navStand(g, cx, j)) add(cx, j, 2 + (j - y) * 1.2, NAV_LADDER);
  }
}
function navCanLeap(g, x, y) { for (var k = 0; k <= 8; k++) if (pBody(g, x, y - 9 - k)) return false; return true; }

/* A*, from (sx, sy) to anywhere goal(x, y) likes, guided towards (tx, ty). a list of {x, y, m} (m: the move that gets
   there) not including the start, or null */
function navFind(g, sx, sy, goal, tx, ty) {
  var n = g.gw * g.gh, gw = g.gw;
  if (!g.navSeen || g.navSeen.length !== n) {
    g.navSeen = new Uint32Array(n); g.navShut = new Uint32Array(n); g.navCost = new Float32Array(n);
    g.navFrom = new Int32Array(n); g.navHow = new Int8Array(n);
    g.navHeapI = new Int32Array(NAV_CAP * 8); g.navHeapF = new Float32Array(NAV_CAP * 8); g.navGen = 0;
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
  function h(x, y) { return Math.abs(x - tx) + Math.abs(y - ty) * 0.5; }
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
  while (hn > 0 && looked < NAV_CAP) {
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
  if (!nv || nv.key !== key || g.tick - nv.t > NAV_REPLAN || nv.off > 30 || nv.i >= nv.path.length) {
    var here = navHere(g, p);
    if (here && goal(here.x, here.y)) { p.nav = { key: key, path: [], i: 0, t: g.tick, off: 0 }; return 0; }
    var path = here ? navFind(g, here.x, here.y, goal, tx, ty) : null;
    if (!path) { p.nav = { key: key, none: g.tick + 120, path: [], i: 0, t: g.tick, off: 0 }; return -1; }
    nv = p.nav = { key: key, path: path, i: 0, t: g.tick, off: 0 };
  }
  var P = nv.path, n;
  /* past the places already reached */
  while (nv.i < P.length && Math.abs(p.x - P[nv.i].x - 0.5) < 0.7 && Math.abs(p.y - P[nv.i].y) < 3.5) nv.i++;
  if (nv.i >= P.length) return 0;
  n = P[nv.i];
  /* wandered off it (a fall, a shove, a swim that drifted): plan again soon */
  if (Math.abs(p.x - n.x - 0.5) + Math.abs(p.y - n.y) > 14) nv.off++;
  var dx = n.x + 0.5 - p.x;
  if (Math.abs(dx) > 0.3) p.dir = dx < 0 ? -1 : 1;
  p.navMove = NAV_MOVES[n.m];
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
