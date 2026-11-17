/* =====================================================================
   PLEASAND  --  mines.js

   under the sand there is rock, and in the rock there are seams of
   coal, lumps of iron ore and, deep down, the odd speck of gold. a
   village that has dug enough holes in the sand thinks of digging one
   down into the rock (ideas.js), and what comes up out of it gives them
   the next idea, and the next:

     MINING      a mine: a head dug down through the sand (a collar of
                 timbers holds the sand back), a shaft three wide straight down into the rock
                 with a ladder in it, and galleries off the bottom of it,
                 pushed out a stretch at a time towards whatever is worth
                 having, following the veins up into the roof and down
                 into the floor. a pick takes rock a cell at a time, and
                 what comes out goes in their pockets: stone, coal, iron
                 ore, gold. it takes no wood, just a pick
     MASONRY     (stone enough) a watchtower: dressed stone, a door at
                 the foot of each side, a ladder up the inside, and a
                 lookout on top, with a lantern on the battlements. the
                 bored go up and have a look at the valley
     SMELTING    (coal and ore, both) a furnace by the mine: ore and coal
                 go in, iron comes out. and once there is iron, iron
                 picks, which go nearly twice as fast
     THE LIFT    (iron, and a long climb) an iron headframe over a ladder
                 (the mine's or a tower's) and a cage on a chain, which
                 runs up and down it four times as fast as hands do
     THE BELL    (gold, and a tower to hang it from) a golden bell out
                 over the battlements. it rings for every new idea, and
                 when anything of theirs is on fire it rings, and
                 everybody in the valley hears it, and wakes, and comes

   a mine, a gallery, a tower, a furnace, a lift and a bell are all
   sites, like a house (build.js): a plan, a blueprint, repairs. a site
   that wants stone or iron or gold has a pile, which whoever brings
   some adds to, and whoever is building it builds from.
   ===================================================================== */
"use strict";

var M_SHAFT = 28;           /* how far down into the rock a shaft goes (as far as the rock does, if that is less) */
var M_ROOF = 10;            /* how tall a gallery is: a peasant is nine */
var M_RUN = 16;             /* how far a gallery is pushed out at a time */
var M_LOOK = 60;            /* how far along the rock they look for something worth digging towards */
var M_FIRST = 12;           /* a gallery is dug at least this far either way, for the stone in it */
var M_MINES = 2;            /* mines in the valley, at most */
var M_TOWER_H = 24;         /* a tower, from the floor to the lookout */
var M_TOWERS = 2;
var M_SMELT = 150;          /* ticks at the bellows for a bar of iron */
var M_POCKET = { stone: 24, coal: 12, ore: 12, gold: 99 };   /* what fits in a pocket. the rest is kicked down the tunnel */
var M_YIELD = []; M_YIELD[MAT.STONE] = "stone"; M_YIELD[MAT.COAL] = "coal"; M_YIELD[MAT.ORE] = "ore"; M_YIELD[MAT.GOLD] = "gold";
var M_SEAM = new Uint8Array(NMAT); M_SEAM[MAT.COAL] = M_SEAM[MAT.ORE] = M_SEAM[MAT.GOLD] = 1;
var M_WORTH = new Float32Array(NMAT); M_WORTH[MAT.COAL] = 2; M_WORTH[MAT.ORE] = 3; M_WORTH[MAT.GOLD] = 6;

P_SAY.idea_mine = ["what's under the sand? ROCK", "what if we dug down. a LOT", "there's something under all this sand",
  "a hole. a really deep one"];
P_SAY.idea_masonry = ["rock, but square. MASONRY", "stone doesn't burn. just saying", "what if we stacked it. HIGH",
  "a tower! to see things from"];
P_SAY.idea_smelt = ["black rock burns. red rock melts. hmm", "what if we cooked the rocks", "IRON. from ROCKS",
  "a really hot fire, in a box"];
P_SAY.idea_lift = ["a box on a chain. for going up", "what if the ladder climbed for us", "a LIFT",
  "a wheel at the top, a cage at the bottom"];
P_SAY.idea_bell = ["gold rings, you know", "a bell! up high!", "what if we could all hear it at once",
  "ding dong. on purpose"];
P_SAY.planMine = ["a mine, right here", "there's rock under here. i can smell it", "dig dig dig. down", "let's see what's down there"];
P_SAY.pick = ["*tink*", "*chink*", "rock. more rock", "hi-ho", "solid stuff", "dig, dig", "*clang*"];
P_SAY.coal = ["COAL!", "black rock!", "this'll burn", "coal! warm winters"];
P_SAY.ore = ["iron ore!", "red rock!", "this one's heavy", "ooh, rusty"];
P_SAY.gold = ["GOLD!", "GOLD! GOLD!", "we're RICH", "shiny!!", "it's GOLD", "don't tell the king"];
P_SAY.planTower = ["a tower, right here", "we'll see for miles", "stone on stone, all the way up", "a watchtower!"];
P_SAY.lookout = ["i can see the whole valley", "i can see my house from here", "everything's so small", "what a view",
  "is that a duck?", "nothing to report", "all quiet", "i'm the king of the castle", "you can see the pond from here"];
P_SAY.spotFire = ["FIRE! FIRE!", "SMOKE! over there!", "THERE'S A FIRE"];
P_SAY.planFurnace = ["a furnace, by the mine", "rocks in, iron out", "we'll need a very hot fire"];
P_SAY.smelt = ["*pumpf* *pumpf*", "hotter...", "come on, iron", "the bellows!", "it's glowing"];
P_SAY.iron = ["iron!", "look at it!", "a bar of iron", "hot hot hot", "*clang*"];
P_SAY.noore = ["no ore", "need some red rock", "back down the mine"];
P_SAY.nocoal = ["no coal", "out of coal", "it won't light"];
P_SAY.planLift = ["a lift. no more ladders", "a wheel, a chain, a cage", "why climb?"];
P_SAY.lift = ["going up", "going down", "mind the doors", "first floor: rocks", "wheee", "ding"];
P_SAY.planBell = ["a bell, up on the tower", "a golden bell!", "ding dong"];
P_SAY.dong = ["DONG", "DONG DONG", "BONG", "the bell!", "hear that?"];
P_SAY.nostone = ["out of stone", "need more rock", "back to the mine"];
P_SAY.noiron = ["out of iron", "need iron", "more iron!"];
P_SAY.nogold = ["out of gold", "need more gold", "gold, please"];

P_ACHIEVE.mine = ["THE MINE", "a hole in the ground, with a ladder in it. on purpose"];
P_ACHIEVE.coal = ["COAL", "black rock that burns. there is more of it down there"];
P_ACHIEVE.ore = ["IRON ORE", "red rock, and heavy. it must be good for something"];
P_ACHIEVE.gold = ["GOLD!", "it does nothing at all. everybody wants some"];
P_ACHIEVE.tower = ["THE WATCHTOWER", "you can see the whole valley from up there"];
P_ACHIEVE.iron = ["THE IRON AGE", "ore and coal in, iron out. iron picks all round"];
P_ACHIEVE.lift = ["GOING UP", "somebody rode the lift. no climbing at all"];
P_ACHIEVE.bell = ["THE BELL", "a golden bell, up high. everybody in the valley will hear it"];

/* -------------------------------------------------------------------
   WHAT THEY DO ABOUT IT. called from iPick when they are looking for
   something to do. true if they found something
   ------------------------------------------------------------------- */
function mPick(g, p, hungry) {
  var K = g.know, s;
  if (!K.mine) return false;
  /* ore and coal in their pockets, and a furnace to put it in */
  if (K.smelt && !hungry && mGoSmelt(g, p)) return true;
  /* a mine wants hands, not wood: anybody will do */
  if ((s = iFieldWork(g, p, 220, "mine") || iFieldWork(g, p, 220, "tunnel"))) { bJoin(g, p, s); return true; }
  if (!p.mineCD && !hungry && Math.random() < 0.3) {
    if (mPlanTunnel(g, p) || mPlanMine(g, p)) return true;
    p.mineCD = 1500;
  }
  /* things built of what comes up out of it */
  if (!p.planCD && bOpenCount(g) < B_OPEN) {
    if (K.masonry && ((p.stone || 0) >= 6 || Math.random() < 0.1) && mPlanTower(g, p)) return true;
    if (K.smelt && ((p.stone || 0) >= 3 || (p.ore || 0) + (p.coal || 0) > 0 || Math.random() < 0.1) && mPlanFurnace(g, p)) return true;
    if (K.lift && ((p.iron || 0) >= 1 || (g.iron >= 2 && Math.random() < 0.1)) && mPlanLift(g, p)) return true;
    if (K.bell && ((p.gold || 0) >= 1 || (g.found.gold >= 2 && Math.random() < 0.1)) && mPlanBell(g, p)) return true;
  }
  /* and the view */
  if (K.masonry && p.bored > 500 && Math.random() < 0.08 && mGoLookout(g, p)) return true;
  return false;
}
/* one tick of one of the jobs in here, or undefined if it is not one of ours */
function mTask(g, p, k) {
  if (k.kind === "smelt") return mTaskSmelt(g, p, k);
  if (k.kind === "lookout") return mTaskLookout(g, p, k);
  return undefined;
}
/* the time a stroke of the pick takes: less, once there are iron picks */
function mStroke(g) { return g.iron > 0 ? 18 : 30; }
function mSites(g, kind, done) {
  var out = [];
  for (var k = 0; k < g.sites.length; k++) if (g.sites[k].kind === kind && (!done || g.sites[k].done)) out.push(g.sites[k]);
  return out;
}
/* something that pours (sand, water, lava, salt...): dig next to it and it pours in */
function mLoose(c) { return SAND_FREE[c] === 1 && !AIRY[c]; }
/* rock that will hold up a roof, or stand as a wall */
function mFirm(c) { return SOLID[c] === 1 && !SAND_FREE[c] && !P_PASS[c]; }

/* -------------------------------------------------------------------
   THE PICK
   ------------------------------------------------------------------- */
var M_CHIPS = {
  stone: [SAND_PAL[MAT.STONE][0], SAND_PAL[MAT.STONE][90], SAND_PAL[MAT.STONE][200]],
  coal: [SAND_PAL[MAT.COAL][0], SAND_PAL[MAT.COAL][100], SAND_PAL[MAT.STONE][90]],
  ore: [SAND_PAL[MAT.ORE][0], SAND_PAL[MAT.ORE][130], SAND_PAL[MAT.STONE][90]],
  gold: [SAND_PAL[MAT.GOLD][0], SAND_PAL[MAT.GOLD][100], hex32("#fff6c0")]
};
/* a stroke that breaks a cell of rock out: into their pockets with it (the air left behind keeps whatever heat the rock
   had, as with a chopped log) */
function mMine(g, s, e, p) {
  var j = e.i, r = M_YIELD[g.m[j]], x = j % g.gw, y = (j / g.gw) | 0;
  if (!r) return;
  g.m[j] = MAT.EMPTY; g.aux[j] = 0; heatSync(g, j);
  s.last = g.tick;
  g.found[r] = (g.found[r] || 0) + 1;
  if ((p[r] || 0) < M_POCKET[r]) p[r] = (p[r] || 0) + 1;
  g.fx.pick++;
  pChips(g, x + 0.5, y + 0.5, r === "stone" ? 3 : 6, M_CHIPS[r]);
  if (r === "stone") { if (p.sayT <= 0 && Math.random() < 0.03) pSay(g, p, "pick"); return; }
  /* something in the rock: the first of anything is news */
  if (g.found[r] === 1) {
    feed(g, p.name + (r === "ore" ? " found iron ore" : " struck " + r), r === "gold" ? "#ffd94a" : "#e8c8a0", "find" + r);
    achieve(g, r);
    pSay(g, p, r, true);
  } else if (r === "gold" || (p.sayT <= 0 && Math.random() < 0.15)) pSay(g, p, r, r === "gold");
  if (r === "gold") { sparks(g, x + 0.5, y + 0.5, 8, 0.6, M_CHIPS.gold, 12, 0.3, PK_GLINT); p.bored = 0; }
}

/* -------------------------------------------------------------------
   MINES: a head through the sand, a shaft down into the rock, a ladder
   ------------------------------------------------------------------- */
/* a new mine: one at a time, and another only once the last is worked out. somewhere near p with the rock not too far
   down, and as much as can be found in it near enough the bottom of a shaft to get at */
function mPlanMine(g, p) {
  var M = mSites(g, "mine"), k;
  if (M.length >= M_MINES) return false;
  for (k = 0; k < M.length; k++) if (!M[k].done || !mWorkedOut(M[k])) return false;
  var fx = Math.floor(p.x), best = null, x, r, sc;
  for (x = fx - 120; x <= fx + 120; x += 2) {
    r = mMinePlot(g, x);
    if (!r) continue;
    sc = r.score - Math.abs(x - fx) * 0.05;
    if (!best || sc > best.sc) { best = r; best.sc = sc; }
  }
  if (!best) return false;
  var plan = [], e, y0 = 1e9, cx = best.cx, S = best.S, B = best.B, y;
  for (k = 0; k < best.dig.length; k++) y0 = Math.min(y0, best.dig[k][1]);
  for (k = 0; k < best.pick.length; k++) y0 = Math.min(y0, best.pick[k][1]);
  for (k = 0; k < best.collar.length; k++) y0 = Math.min(y0, best.collar[k][2]);
  /* 0..: the sand, from the top down, and the collar a row behind it (sand stands, until what is under the corner of
     it goes: the timbers are in by then). then any rock over the top of the shaft. then the shaft, a row at a time,
     and a row of ladder behind each row, so whoever is at the bottom can always climb out. (the timbers and the
     ladder are knocked together out of the pit props: a mine wants no wood anybody has to carry) */
  for (k = 0; k < best.dig.length; k++) plan.push(bE(g, best.dig[k][0], best.dig[k][1], MAT.EMPTY, 2 * (best.dig[k][1] - y0)));
  /* (the bit of collar standing proud of the ground goes up with the top row of it, from it) */
  for (k = 0; k < best.collar.length; k++) {
    e = bE(g, best.collar[k][0], best.collar[k][1], MAT.PLANK, 2 * (Math.max(best.collar[k][1], best.collar[k][2]) - y0) + 1);
    e.cost = 0; e.drive = true; plan.push(e);
  }
  for (k = 0; k < best.pick.length; k++) { e = bE(g, best.pick[k][0], best.pick[k][1], MAT.EMPTY, 60 + best.pick[k][1] - y0); e.mine = true; plan.push(e); }
  for (y = S; y <= B; y++) {
    for (x = cx - 1; x <= cx + 1; x++) { e = bE(g, x, y, MAT.EMPTY, 100 + 2 * (y - S)); e.mine = true; plan.push(e); }
    for (x = cx - 1; x <= cx + 1; x++) { e = bE(g, x, y, MAT.LADDER, 101 + 2 * (y - S), x - cx + 1); e.cost = 0; plan.push(e); }
  }
  var s = bNew(g, "mine", p, plan, [cx - best.hw, best.top - 1, cx + best.hw, B],
               { free: true, mine: true, col: cx, S: S, B: B, out: {} });
  feed(g, p.name + " is sinking a mine", "#e8c8a0", "plan" + s.id);
  pSay(g, p, "planMine", true);
  bJoin(g, p, s);
  return true;
}
/* is there room for a mine with its shaft in columns cx - 1 .. cx + 1. {cx, S (the top of the rock, and the top rung of
   the ladder), B (the floor of the shaft, where their feet go), hw (how far the head of it reaches out either side), top
   (the highest ground in it), dig (sand to shovel), pick (rock over the top of the shaft), collar (timbers to hold the
   sand back), score} or null */
function mMinePlot(g, cx) {
  var gw = g.gw, gh = g.gh, x, y, c, k, G, S = -1, B, hw, edge, top = 1e9, dig = [], pick = [], collar = [], ore = 0, gr = {};
  if (cx < 24 || cx > gw - 25) return null;
  function ground(x) { if (gr[x] === undefined) gr[x] = mGround(g, x); return gr[x]; }
  /* the rock under the middle five columns, through no more than a little sand: the lowest of it (the rest is picked) */
  for (x = cx - 2; x <= cx + 2; x++) {
    G = ground(x);
    if (G < 0 || bMarked(g, x, G)) return null;
    for (y = G; y < gh && B_DIG[pCell(g, x, y)]; y++);
    if (y >= gh || !ROCK[pCell(g, x, y)] || y - G > 8) return null;
    S = Math.max(S, y);
  }
  B = Math.min(gh - 3, S + M_SHAFT);
  if (B - S < M_ROOF + 6) return null;   /* rock enough under it for a gallery, with a good roof over it */
  /* the head of the shaft: five columns dug down through the sand to the rock, and the sand either side of them held
     back by a collar of timbers, put in a row at a time as it goes down (rock either side holds itself up) */
  hw = 3;
  for (x = cx - hw; x <= cx + hw; x++) {
    G = ground(x);
    if (G < 0) return null;
    top = Math.min(top, G);
    edge = x === cx - hw || x === cx + hw;
    for (y = G - 12; y < G; y++) {   /* (a bush over it comes out first) */
      c = pCell(g, x, y);
      if (AIRY[c]) continue;
      if (!B_DIG[c] || bMarked(g, x, y)) return null;
      dig.push([x, y]);
    }
    /* (the collar stands a couple of cells proud of the ground: whatever rolls down a slope at it stops there) */
    for (y = edge ? G - 2 : G; y < S; y++) {
      c = pCell(g, x, y);
      if (edge && y < G) { if ((!AIRY[c] && !B_DIG[c]) || bMarked(g, x, y)) return null; collar.push([x, y, G]); continue; }
      if (AIRY[c]) continue;
      if (bMarked(g, x, y)) return null;
      if (edge) { if (B_DIG[c]) collar.push([x, y, G]); else if (!mFirm(c)) return null; }
      else if (B_DIG[c]) dig.push([x, y]);
      else if (ROCK[c]) pick.push([x, y]);
      else return null;
    }
  }
  /* nobody else's site, and nothing wet, hot or touchy anywhere about it */
  for (k = 0; k < g.sites.length; k++) {
    var t = g.sites[k];
    if (cx + hw + 4 >= t.x0 && cx - hw - 4 <= t.x1 && B + 3 >= t.y0 && top - 14 <= t.y1) return null;
  }
  for (y = top - 14; y <= B + 2; y++) for (x = cx - hw - 3; x <= cx + hw + 3; x++) {
    c = pCell(g, x, y);
    if (LIQUID[c] || HOT[c] || c === MAT.DRAIN || P_BANG[c]) return null;
  }
  /* the shaft: nothing but rock to cut, firm walls either side, and a firm floor */
  for (y = S; y <= B + 1; y++) for (x = cx - 2; x <= cx + 2; x++) {
    c = pCell(g, x, y);
    if (x === cx - 2 || x === cx + 2 || y === B + 1) { if (!mFirm(c)) return null; }
    else if (!ROCK[c] && !AIRY[c]) return null;
  }
  /* what is worth having near enough the bottom to get at, and in the shaft itself */
  for (y = B - M_ROOF - 3; y <= B + 2; y++) for (x = cx - M_LOOK; x <= cx + M_LOOK; x++) ore += M_WORTH[pCell(g, x, y)];
  for (y = S; y < B - M_ROOF - 3; y++) for (x = cx - 1; x <= cx + 1; x++) ore += M_WORTH[pCell(g, x, y)];
  return { cx: cx, S: S, B: B, hw: hw, top: top, dig: dig, pick: pick, collar: collar, score: ore - dig.length * 0.05 + (B - S) * 0.5 };
}
/* a spadeful of sand out of the head of mine s (cell j), carried up and tipped on the heap beside it: on the downhill
   side, so it does not roll back in, a few steps from the collar, into the air on top of the ground, heat and all.
   (never into the pond.) false if there is nowhere */
function mSpoil(g, s, j) {
  var col = s.col != null ? s.col : Math.round(s.cx), d = 7 + irnd(5), k, x, y, a, b, t;
  a = mSpoilAt(g, s, col - d); b = mSpoilAt(g, s, col + d);
  x = a > b ? col - d : col + d; y = Math.max(a, b) - 1;
  if (y < 1) return false;
  sandSwap(g, j, y * g.gw + x);
  return true;
}
/* the ground at column x, if spoil can go on it: not on anybody's site (a furnace, a tower's door), and not in water.
   -1 if not */
function mSpoilAt(g, s, x) {
  var G = x > 0 && x < g.gw - 1 ? mGround(g, x) : -1, k, t;
  if (G < 2 || !AIRY[g.m[(G - 1) * g.gw + x]]) return -1;
  for (k = 0; k < g.sites.length; k++) { t = g.sites[k]; if (t !== s && x >= t.x0 - 2 && x <= t.x1 + 2 && G >= t.y0 - 3 && G <= t.y1 + 3) return -1; }
  return G;
}
/* the ground in column x, under open sky: the first thing down from the top that is not air, or a bush. -1 if that is
   not ground (water, a tree, somebody's roof) */
function mGround(g, x) {
  for (var y = 0; y < g.gh; y++) {
    var c = g.m[y * g.gw + x];
    if (AIRY[c] || P_LEAF[c]) continue;
    return LIQUID[c] || WOODY[c] || P_SOFT[c] || bMarked(g, x, y) ? -1 : y;
  }
  return -1;
}
/* a mine with nothing left worth digging either way along the bottom of it */
function mWorkedOut(m) { return m.out && m.out[-1] && m.out[1]; }

/* -------------------------------------------------------------------
   GALLERIES: off the bottom of a shaft, a stretch at a time
   ------------------------------------------------------------------- */
/* the next stretch of gallery, at the bottom of any mine that is dug: the way with the most in it first, and not a
   second stretch of anything while the last is still being dug */
function mPlanTunnel(g, p) {
  var M = mSites(g, "mine", true), T = mSites(g, "tunnel"), k, j, m, d, r, order;
  for (k = 0; k < T.length; k++) if (!T[k].done) return false;
  for (k = 0; k < M.length; k++) {
    m = M[k];
    order = mAhead(g, m, 1) >= mAhead(g, m, -1) ? [1, -1] : [-1, 1];
    for (j = 0; j < 2; j++) {
      d = order[j];
      if (m.out[d]) continue;
      r = mTunnelPlot(g, m, d);
      if (!r) { m.out[d] = true; continue; }
      var s = bNew(g, "tunnel", p, r.plan, [Math.min(r.xa, r.xb), m.B - M_ROOF - 3, Math.max(r.xa, r.xb), m.B + 2],
                   { free: true, mine: true, of: m.id, dir: d, xa: r.xa, xb: r.xb, B: m.B, S: m.S, col: m.col });
      feed(g, p.name + " is pushing " + mLabel(s) + " on, " + (r.ore ? "after the " + r.ore : "for the stone"), "#e8c8a0", "plan" + s.id);
      if (p.sayT <= 0) pSay(g, p, "planMine");
      bJoin(g, p, s);
      return true;
    }
  }
  return false;
}
/* where the galleries of mine m going way d have got to: {end (the last column dug), len (how far, in all)} */
function mReach(g, m, d) {
  var end = m.col + d, len = 0;
  for (var k = 0; k < g.sites.length; k++) {
    var t = g.sites[k];
    if (t.kind !== "tunnel" || t.of !== m.id || t.dir !== d) continue;
    end = d > 0 ? Math.max(end, t.xb) : Math.min(end, t.xb);
    len += Math.abs(t.xb - t.xa) + 1;
  }
  return { end: end, len: len };
}
/* how much is worth having in the rock ahead of the galleries of m, going way d, near enough the floor to get at */
function mAhead(g, m, d) {
  var x0 = mReach(g, m, d).end + d, n = 0, x, y;
  for (x = x0; Math.abs(x - x0) <= M_LOOK; x += d) for (y = m.B - M_ROOF - 3; y <= m.B + 2; y++) n += M_WORTH[pCell(g, x, y)];
  return n;
}
/* can a gallery go through column x, floor at B: rock (or air: an old working, a cave) the whole height of it, a firm
   roof over it and a firm floor under it, and nothing that would pour in anywhere round it, nor anybody else's site */
function mBore(g, x, B) {
  var y, c, k;
  if (x < 4 || x > g.gw - 5) return false;
  for (y = B - M_ROOF + 1; y <= B; y++) { c = pCell(g, x, y); if (!(ROCK[c] || AIRY[c]) || bMarked(g, x, y)) return false; }
  if (!mFirm(pCell(g, x, B - M_ROOF)) || !mFirm(pCell(g, x, B + 1))) return false;
  for (y = B - M_ROOF - 1; y <= B + 2; y++) for (k = -1; k <= 1; k++) if (mLoose(pCell(g, x + k, y))) return false;
  for (k = 0; k < g.sites.length; k++) {
    var t = g.sites[k];
    if (!t.mine && x >= t.x0 - 1 && x <= t.x1 + 1 && B + 2 >= t.y0 && B - M_ROOF - 3 <= t.y1) return false;
  }
  return true;
}
/* the next stretch of gallery for mine m going way d: up to M_RUN columns of it, and any coal, ore or gold showing in the
   roof or the floor of it (a seam is followed: up into the roof, down into the floor, as far as an arm reaches). null if
   there is no going on: the rock runs out, or there is nothing left that way worth the digging */
function mTunnelPlot(g, m, d) {
  var R = mReach(g, m, d), B = m.B, start = R.end + d, cols = [], plan = [], x, y, k, c, e, best = null, worth = 0;
  for (x = start; Math.abs(x - start) <= M_LOOK; x += d) for (y = B - M_ROOF - 3; y <= B + 2; y++) {
    c = pCell(g, x, y);
    if (M_WORTH[c]) { worth += M_WORTH[c]; if (!best || M_WORTH[c] > M_WORTH[best]) best = c; }
  }
  if (!worth && R.len >= M_FIRST) return null;
  for (k = 0; k < M_RUN; k++) {
    x = start + k * d;
    if (!mBore(g, x, B)) break;
    cols.push(x);
  }
  if (cols.length < 3) return null;
  for (k = 0; k < cols.length; k++) {
    x = cols[k];
    for (y = B - M_ROOF + 1; y <= B; y++) { e = bE(g, x, y, MAT.EMPTY, k); e.mine = true; plan.push(e); }
    /* the seam: up into the roof from the gallery, and down into the floor, a cell at a time while it goes on being
       coal or ore or gold, and nothing loose is waiting behind it */
    for (y = B - M_ROOF; y >= B - 12 && M_SEAM[pCell(g, x, y)] && mSafe(g, x, y); y--) { e = bE(g, x, y, MAT.EMPTY, k + 1); e.mine = true; plan.push(e); }
    for (y = B + 1; y <= B + 2 && M_SEAM[pCell(g, x, y)] && mSafe(g, x, y); y++) { e = bE(g, x, y, MAT.EMPTY, k + 1); e.mine = true; plan.push(e); }
  }
  return { plan: plan, xa: cols[0], xb: cols[cols.length - 1], ore: best ? MAT_NAME[best].toLowerCase() : "" };
}
function mSafe(g, x, y) {
  for (var k = 0; k < 4; k++) { var j = sandNb(g, x, y, k); if (j >= 0 && mLoose(g.m[j])) return false; }
  return true;
}

/* -------------------------------------------------------------------
   MASONRY: a watchtower
   ------------------------------------------------------------------- */
/* a tower, near p, on a plot that is level, or nearly (stone under the low end), with a clear way in at either side:
   seven wide, a door at the foot of each wall, a ladder up the inside, and a lookout on top. one at a time */
function mPlanTower(g, p) {
  var T = mSites(g, "tower"), k;
  if (T.length >= M_TOWERS) return false;
  for (k = 0; k < T.length; k++) if (!T[k].done) return false;
  var fx = Math.floor(p.x), best = null, d, sd, r;
  for (d = 0; d <= 130; d++) for (sd = -1; sd <= 1; sd += 2) {
    if (!d && sd > 0) continue;
    r = mTowerPlot(g, fx + d * sd - 3);
    if (r && (!best || r.work + d * 0.15 < best.score)) { best = r; best.score = r.work + d * 0.15; }
  }
  if (!best) { p.planCD = 1500; return false; }
  var x0 = best.x0, x1 = x0 + 6, F = best.F, top = best.T, plan = [], x, y, ph;
  for (k = 0; k < best.dig.length; k++) plan.push(bE(g, best.dig[k][0], best.dig[k][1], MAT.EMPTY, 0));
  for (k = 0; k < best.fill.length; k++) plan.push(bE(g, best.fill[k][0], best.fill[k][1], MAT.BRICK, 1));
  for (x = x0; x <= x1; x++) plan.push(bE(g, x, F, MAT.BRICK, 1));
  bDoors(g, plan, [x0, x1], F - 9, F - 1, 2);
  /* up the inside, a row at a time: the ladder, and (over the doors) the walls round it, so whoever is building it
     climbs what they have built to build the rest */
  for (y = F - 1; y >= top; y--) {
    ph = 10 + (F - 1 - y);
    for (x = x0 + 1; x <= x0 + 3; x++) plan.push(bE(g, x, y, MAT.LADDER, ph, x - x0 - 1));
    if (y <= F - 10) plan.push(bE(g, x0, y, MAT.BRICK, ph), bE(g, x1, y, MAT.BRICK, ph));   /* (up to, and including, the floor of the lookout) */
  }
  /* the lookout: a floor either side of the top of the ladder, jutting out a cell over the walls on corbels, with
     battlements along the edges and a lantern on them */
  /* (the left side, and the floor, from the top of the ladder: then the right side from the floor) */
  ph = 10 + (F - top) + 1;
  plan.push(bE(g, x0 - 1, top + 1, MAT.BRICK, ph), bE(g, x0 - 1, top, MAT.BRICK, ph), bE(g, x0 + 4, top, MAT.BRICK, ph), bE(g, x0 + 5, top, MAT.BRICK, ph));
  plan.push(bE(g, x0 - 1, top - 1, MAT.BRICK, ph + 1), bE(g, x0 - 1, top - 2, MAT.BRICK, ph + 1));
  plan.push(bE(g, x1 + 1, top, MAT.BRICK, ph + 2), bE(g, x1 + 1, top + 1, MAT.BRICK, ph + 2));
  plan.push(bE(g, x1 + 1, top - 1, MAT.BRICK, ph + 3), bE(g, x1 + 1, top - 2, MAT.BRICK, ph + 3));
  plan.push(bE(g, x1 + 1, top - 3, MAT.LAMP, ph + 4));
  var s = bNew(g, "tower", p, plan, [x0 - 1, top - 3, x1 + 1, F + 3], { F: F, T: top, x0: x0, lad: x0 + 2 });
  feed(g, p.name + " is building a watchtower", "#c8d0dc", "plan" + s.id);
  pSay(g, p, "planTower", true);
  if (bCarries(p)) bJoin(g, p, s);
  return true;
}
/* is (x0 .. x0 + 6) a plot for a tower: as bPlot is for a house (build.js), but taller, and with room round the top */
function mTowerPlot(g, x0) {
  var x1 = x0 + 6, gy = [], x, y, c, k, F = 1e9, top, dig = [], fill = [], work = 0;
  if (x0 < 6 || x1 > g.gw - 7) return null;
  for (x = x0; x <= x1; x++) { y = mGround(g, x); if (y < 0) return null; gy.push(y); F = Math.min(F, y); }
  for (k = 0; k < 7; k++) if (gy[k] - F > 3) return null;
  for (k = 1; k <= 2; k++) {
    y = mGround(g, x0 - k); if (y >= 0 && y < F) return null;
    y = mGround(g, x1 + k); if (y >= 0 && y < F) return null;
  }
  top = F - M_TOWER_H;
  if (top < 16) return null;
  for (k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (x1 + 4 >= s.x0 && x0 - 4 <= s.x1 && F + 4 >= s.y0 && top - 12 <= s.y1) return null;
  }
  for (y = top - 12; y <= F + 2; y++) for (x = x0 - 3; x <= x1 + 3; x++) {
    c = pCell(g, x, y);
    if (LIQUID[c] || HOT[c] || c === MAT.DRAIN || P_BANG[c]) return null;
  }
  for (y = top - 4; y <= F - 1; y++) for (x = x0 - (y <= top + 1 ? 1 : 0); x <= x1 + (y <= top + 1 ? 1 : 0); x++) {
    c = pCell(g, x, y);
    if (AIRY[c]) continue;
    if (!B_DIG[c] || bMarked(g, x, y)) return null;
    dig.push([x, y]); work++;
  }
  for (x = x0; x <= x1; x++) if (gy[x - x0] > F) { work += 2; for (y = gy[x - x0] - 1; y > F; y--) fill.push([x, y]); }
  dig.sort(function (a, b) { return a[1] - b[1]; });
  fill.sort(function (a, b) { return b[1] - a[1]; });
  return { x0: x0, F: F, T: top, dig: dig, fill: fill, work: work };
}
/* bored: up the tower for a look round */
function mGoLookout(g, p) {
  var T = mSites(g, "tower", true), best = null, bd = 220, k, d;
  for (k = 0; k < T.length; k++) {
    d = Math.abs(T[k].cx - p.x);
    if (d < bd && !mCrew(g, "lookout", T[k].id)) { bd = d; best = T[k]; }
  }
  if (!best) return false;
  p.task = { kind: "lookout", site: best.id, t: 0, act: 0, spot: best.x0 + 4 + irnd(2) };
  return true;
}
function mCrew(g, kind, id) {
  var n = 0;
  for (var k = 0; k < g.peasants.length; k++) { var t = g.peasants[k].task; if (t && t.kind === kind && t.site === id && !g.peasants[k].dead) n++; }
  return n;
}
function mTaskLookout(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || !s.done || ++k.t > 3600) return iDone(p, false);
  var sx = k.spot, sy = s.T - 1, fy = Math.floor(p.y);
  if (Math.abs(p.x - sx - 0.5) > 1 || fy !== sy) {
    if (iWalk(g, p, k, "look" + s.id, sx, sy, function (x, y) { return Math.abs(x - sx) <= 1 && y === sy; })) pGiveUp(g, p, sx);
    return false;
  }
  /* up there: a good long look, out over the battlements, one way and then the other */
  p.idle = 0; p.pose = "stand"; k.act++;
  if (k.act % 150 === 1) p.dir = k.act % 300 === 1 ? 1 : -1;
  if (k.act === 30 || (k.act === 200 && Math.random() < 0.5)) {
    if (g.blaze.length) pSay(g, p, "spotFire", true);
    else pSay(g, p, "lookout", true);
  }
  if (k.act > 360) { p.bored = 0; return iDone(p, true); }
  return true;
}

/* -------------------------------------------------------------------
   SMELTING: a furnace, by the mine
   ------------------------------------------------------------------- */
/* a furnace: five wide, a hearth inside it, a mouth on the side facing the mine (or p, if there is no mine), a chimney.
   just the one */
function mPlanFurnace(g, p) {
  if (mSites(g, "furnace").length) return false;
  var m = mSites(g, "mine")[0], cx = m ? m.col : Math.floor(p.x), d, sd, r = null, k;
  for (d = m ? m.x1 - m.col + 12 : 6; d <= g.gw && !r; d++) for (sd = -1; sd <= 1 && !r; sd += 2) r = mFurnacePlot(g, sd > 0 ? cx + d : cx - d - 4, -sd);
  if (!r) { p.planCD = 1500; return false; }
  var x0 = r.x0, x1 = x0 + 4, G = r.G, mouth = r.mouth, fc = mouth < 0 ? x0 : x1, bc = mouth < 0 ? x1 : x0, chim = mouth < 0 ? x0 + 3 : x0 + 1;
  var plan = [], x;
  for (k = 0; k < r.dig.length; k++) plan.push(bE(g, r.dig[k][0], r.dig[k][1], MAT.EMPTY, 0));
  for (k = 0; k < r.fill.length; k++) plan.push(bE(g, r.fill[k][0], r.fill[k][1], MAT.BRICK, 1));
  for (x = x0; x <= x1; x++) plan.push(bE(g, x, G - 1, MAT.BRICK, 2));
  plan.push(bE(g, bc, G - 2, MAT.BRICK, 3));
  plan.push(bE(g, x0, G - 3, MAT.BRICK, 4), bE(g, x1, G - 3, MAT.BRICK, 4));
  for (x = x0; x <= x1; x++) plan.push(bE(g, x, G - 4, MAT.BRICK, 4));
  for (x = x0 + 1; x <= x1 - 1; x++) plan.push(bE(g, x, G - 5, MAT.BRICK, 5));
  plan.push(bE(g, chim, G - 6, MAT.BRICK, 6), bE(g, chim, G - 7, MAT.BRICK, 7));
  var s = bNew(g, "furnace", p, plan, [x0, G - 7, x1, G - 1],
               { G: G, x0: x0, mouth: mouth, fc: fc, chim: chim, sx: mouth < 0 ? x0 - 2 : x1 + 2, sy: r.sy, hot: 0 });
  feed(g, p.name + " is building a furnace", "#ffb070", "plan" + s.id);
  pSay(g, p, "planFurnace", true);
  if (bCarries(p)) bJoin(g, p, s);
  return true;
}
/* is (x0 .. x0 + 4) somewhere for a furnace, its mouth facing way mouth: level, or near enough (blocks under the low
   end), clear over it, somewhere to stand at the mouth, and nothing that burns close by. {x0, G (the row it stands on:
   its bottom course is the row over that), fill (blocks under the low end), mouth} or null */
function mFurnacePlot(g, x0, mouth) {
  var x1 = x0 + 4, G = 1e9, x, y, c, k, sx = mouth < 0 ? x0 - 2 : x1 + 2, gy = [], fill = [], dig = [];
  if (x0 < 8 || x1 > g.gw - 9) return null;
  for (x = x0; x <= x1; x++) { y = mGround(g, x); if (y < 0 || !pSolid(g, x, y)) return null; gy.push(y); G = Math.min(G, y); }
  for (k = 0; k < 5; k++) { if (gy[k] - G > 3) return null; for (y = gy[k] - 1; y >= G; y--) fill.push([x0 + k, y]); }
  /* (somewhere to stand at the mouth, about level with it, and with room to stand) */
  y = mGround(g, sx);
  if (y < 0 || Math.abs(y - G) > 1 || Math.abs(mGround(g, sx - mouth) - y) > 1 || !pRoom(g, sx, y - 1)) return null;
  /* clear over it (a bush or a heap of sand is dug out of the way first), and nothing wet or touchy about, nor
     anything wooden right up against it */
  for (y = G - 12; y < G; y++) for (x = x0 - 1; x <= x1 + 1; x++) {
    c = pCell(g, x, y);
    if (AIRY[c] || (y >= gy[x - x0] && x >= x0 && x <= x1)) continue;   /* (the low end's fill is not in the way) */
    if (!B_DIG[c] || bMarked(g, x, y)) return null;
    dig.push([x, y]);
  }
  for (y = G - 10; y <= G + 1; y++) for (x = x0 - 4; x <= x1 + 4; x++) {
    c = pCell(g, x, y);
    if (LIQUID[c] || HOT[c] || P_BANG[c] || (WOODY[c] && Math.abs(x - x0 - 2) <= 4)) return null;
  }
  for (k = 0; k < g.sites.length; k++) {
    var t = g.sites[k];
    if (x1 + 4 >= t.x0 && x0 - 4 <= t.x1 && G + 2 >= t.y0 && G - 10 <= t.y1) return null;
  }
  dig.sort(function (a, b) { return a[1] - b[1]; });
  return { x0: x0, G: G, fill: fill, dig: dig, mouth: mouth, sy: y - 1 };
}
/* ore or coal in their pockets: off to the furnace with it. everybody's goes on the one pile, and whoever is there
   works the bellows while there is both */
function mGoSmelt(g, p) {
  var s = mSites(g, "furnace", true)[0], st;
  if (!s || Math.abs(s.cx - p.x) > 220 || mCrew(g, "smelt", s.id) >= 2) return false;
  var ore = p.ore || 0, coal = p.coal || 0;
  st = s.stock || {};
  /* a pocketful, to be worth the walk; or enough, with what is on the pile already, to make a bar. (and with ore and
     coal both waiting on the pile, anybody with nothing better to do goes and works the bellows, now and then) */
  if (ore + coal < 4 && !(ore + (st.ore || 0) >= 1 && coal + (st.coal || 0) >= 1 && (ore + coal > 0 || Math.random() < 0.3))) return false;
  p.task = { kind: "smelt", site: s.id, t: 0, act: 0, n: 0 };
  return true;
}
function mTaskSmelt(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || !s.done || s.repair || ++k.t > 3000) return iDone(p, false);
  /* (somewhere to stand at the mouth: about where it was, give or take whatever has piled up there since) */
  if (k.sy == null) k.sy = mGround(g, s.sx) > 0 ? mGround(g, s.sx) - 1 : s.sy;
  var sx = s.sx, sy = k.sy, fy = Math.floor(p.y), st = s.stock || (s.stock = {});
  if (Math.abs(p.x - sx - 0.5) > 1.5 || Math.abs(fy - sy) > 3) {
    if (iWalk(g, p, k, "smelt" + s.id, sx, sy, function (x, y) { return Math.abs(x - sx) <= 1 && Math.abs(y - sy) <= 3; })) pGiveUp(g, p, sx);
    return false;
  }
  /* there. in it goes */
  if (p.ore) { st.ore = (st.ore || 0) + p.ore; p.ore = 0; }
  if (p.coal) { st.coal = (st.coal || 0) + p.coal; p.coal = 0; }
  if (!(st.ore >= 1 && st.coal >= 1)) {
    if (!k.n && p.sayT <= 0) pSay(g, p, st.ore >= 1 ? "nocoal" : "noore");
    return iDone(p, k.n > 0);
  }
  p.dir = -s.mouth; p.idle = 0; k.act++;
  s.hot = g.tick + 60;
  p.pose = (k.act >> 3) & 1 ? "hammerA" : "stand";   /* the bellows */
  if (k.act % 9 === 0) pChips(g, s.fc + 0.5, s.G - 1.5, 2, SPARK_HOT);
  if (k.act === 30 && p.sayT <= 0 && Math.random() < 0.5) pSay(g, p, "smelt");
  if (k.act < M_SMELT) return true;
  /* a bar of iron */
  st.ore--; st.coal--; k.act = 0; k.n++;
  p.iron = (p.iron || 0) + 1; g.iron = (g.iron || 0) + 1;
  g.fx.clang++;
  sparks(g, s.fc + 0.5, s.G - 2, 10, 0.7, SPARK_HOT, 10, 0.4, PK_GLINT);
  if (g.iron === 1) {
    feed(g, p.name + " made the first iron. iron picks all round", "#ffd27a", "iron");
    achieve(g, "iron");
    pSay(g, p, "iron", true);
  } else if (p.sayT <= 0 && Math.random() < 0.4) pSay(g, p, "iron");
  if (k.n >= 4) { p.bored = 0; return iDone(p, true); }
  return true;
}

/* -------------------------------------------------------------------
   THE LIFT: an iron headframe over a ladder, and a cage on a chain
   ------------------------------------------------------------------- */
/* (a site's cx is the middle of its box: the column a shaft or a lift is on is its col) */
/* the long ladders (a mine's, a tower's): the middle column, the top rung, and the row at the bottom where their feet go */
function mLadderOf(s) {
  if (s.kind === "tower") return { cx: s.lad, top: s.T, bot: s.F - 1 };
  if (s.kind === "mine") return { cx: s.col, top: s.S, bot: s.B };
  return null;
}
function mLadders(g) {
  var n = 0;
  for (var k = 0; k < g.sites.length; k++) if (g.sites[k].done && mLadderOf(g.sites[k])) n++;
  return n;
}
/* a headframe over the first long ladder that has none: two iron posts up from beside the top of it, and a beam across
   them with the wheel on it, high enough to step off under */
function mPlanLift(g, p) {
  var k, j, s, L, has, plan, x, y, c, ok, ph;
  for (k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "lift" && !g.sites[k].done) return false;
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k]; L = s.done ? mLadderOf(s) : null;
    if (!L || L.bot - L.top < 14) continue;
    for (j = 0, has = false; j < g.sites.length; j++) if (g.sites[j].kind === "lift" && g.sites[j].on === s.id) has = true;
    if (has) continue;
    plan = []; ok = true;
    for (y = L.top - 1; y >= L.top - 9 && ok; y--) for (x = L.cx - 1; x <= L.cx + 1; x += 2) {
      c = pCell(g, x, y);
      if ((!AIRY[c] && !B_DIG[c]) || bMarked(g, x, y)) ok = false;
      else plan.push(bE(g, x, y, MAT.GIRDER, L.top - y));
    }
    for (x = L.cx - 2; x <= L.cx + 2 && ok; x++) {
      c = pCell(g, x, L.top - 10);
      if ((!AIRY[c] && !B_DIG[c]) || bMarked(g, x, L.top - 10)) ok = false;
      else plan.push(bE(g, x, L.top - 10, MAT.GIRDER, 20));
    }
    if (!ok) continue;
    var site = bNew(g, "lift", p, plan, [L.cx - 2, L.top - 10, L.cx + 2, L.top - 1],
                    { on: s.id, col: L.cx, top: L.top, bot: L.bot, cy: L.top - 1 });
    feed(g, p.name + " is putting a lift on " + bLabel(s), "#c8d0dc", "plan" + site.id);
    pSay(g, p, "planLift", true);
    if (bCarries(p)) bJoin(g, p, site);
    return true;
  }
  return false;
}
/* the lift on the ladder with middle column cx, if there is one (built, and still standing), and (x, y) is on it */
function mLiftAt(g, cx, y) {
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (s.kind === "lift" && s.done && s.col === cx && y >= s.top - 1 && y <= s.bot + 1) return s;
  }
  return null;
}
function mLiftBusy(g, L, p) {
  for (var k = 0; k < g.peasants.length; k++) {
    var q = g.peasants[k];
    if (q !== p && !q.dead && q.climb && q.climb.lift === L.id) return true;
  }
  return false;
}
/* one tick in the lift, for bClimbStep: the cage it is on (to ride), false (waiting for the cage to come down, or up, to
   them: that is the tick), or null (the lift is gone: climb) */
function mLiftRide(g, p, c) {
  var L = bSite(g, c.lift);
  if (!L || !L.done) { c.lift = 0; return null; }
  p.pose = "stand";
  if (!c.board) {
    var d = p.y - L.cy;
    if (Math.abs(d) > B_LIFT) { L.cy += d > 0 ? B_LIFT : -B_LIFT; if ((g.tick & 15) === 0) g.fx.clank++; return false; }
    L.cy = p.y; c.board = true;
    if (!g.got.lift) { achieve(g, "lift"); feed(g, p.name + " rode the lift", "#ffd27a", "lift"); }
    if (p.sayT <= 0 && Math.random() < 0.4) pSay(g, p, "lift");
  }
  if ((g.tick & 15) === 0) g.fx.clank++;
  return L;
}

/* -------------------------------------------------------------------
   THE BELL: gold, cast into a bell, hung from a stone bracket out over a tower's battlements
   ------------------------------------------------------------------- */
function mPlanBell(g, p) {
  var T = mSites(g, "tower", true), k, j, s, has, x, y, c, ok, plan;
  if (mSites(g, "bell").length) return false;
  for (k = 0; k < T.length; k++) {
    s = T[k]; x = s.x0 + 7; y = s.T;
    var cells = [[x + 1, y - 2, MAT.BRICK, 1], [x + 2, y - 2, MAT.BRICK, 2], [x + 2, y - 1, MAT.GOLD, 3],
                 [x + 1, y, MAT.GOLD, 4], [x + 2, y, MAT.GOLD, 4], [x + 3, y, MAT.GOLD, 4],
                 [x + 1, y + 1, MAT.GOLD, 5], [x + 2, y + 1, MAT.GOLD, 5], [x + 3, y + 1, MAT.GOLD, 5]];
    plan = []; ok = x + 4 < g.gw - 2;
    for (j = 0; j < cells.length && ok; j++) {
      c = pCell(g, cells[j][0], cells[j][1]);
      if (!AIRY[c] || bMarked(g, cells[j][0], cells[j][1])) ok = false;
      else plan.push(bE(g, cells[j][0], cells[j][1], cells[j][2], cells[j][3]));
    }
    if (!ok) continue;
    var site = bNew(g, "bell", p, plan, [x + 1, y - 2, x + 3, y + 1], { on: s.id, bx: x + 2, by: y + 1, ring: 0 });
    feed(g, p.name + " is casting a bell for " + bLabel(s), "#ffd94a", "plan" + site.id);
    pSay(g, p, "planBell", true);
    if (bCarries(p)) bJoin(g, p, site);
    return true;
  }
  return false;
}
/* ring it, n times (a bell that is not there does not ring) */
function mRing(g, n) {
  var B = mSites(g, "bell", true);
  for (var k = 0; k < B.length; k++) B[k].ring = Math.max(B[k].ring, n * 40);
  return B.length > 0;
}
function mRinging(g) {
  var B = mSites(g, "bell", true);
  for (var k = 0; k < B.length; k++) if (B[k].ring > 0) return B[k];
  return null;
}

/* -------------------------------------------------------------------
   THE GOINGS ON: three times a second (from ideasStep)
   ------------------------------------------------------------------- */
function mStep(g) {
  var k, s, x, y, j;
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if (s.kind === "furnace" && s.done && s.hot > g.tick) {
      /* lit: the hearth is hot (not so hot as to set the neighbours going), and the chimney smokes */
      for (y = s.G - 3; y <= s.G - 2; y++) for (x = s.x0 + 1; x <= s.x0 + 3; x++) {
        j = y * g.gw + x;
        if (g.m[j] === MAT.EMPTY && g.T[j] < 200) heatAdd(g, j, 25);
      }
      j = (s.G - 8) * g.gw + s.chim;
      if (s.G > 8 && g.m[j] === MAT.EMPTY && Math.random() < 0.5) sandSet(g, j, MAT.SMOKE);
    } else if (s.kind === "bell" && s.done && s.ring > 0) {
      /* DONG, every couple of seconds */
      if (s.ring % 40 === 0) {
        g.fx.bell++;
        sparks(g, s.bx + 0.5, s.by + 1, 5, 0.5, [hex32("#fff6c0"), SAND_PAL[MAT.GOLD][0]], 10, 0.2, PK_GLINT);
        var q = pOther(g, { x: s.bx, y: s.by }, 30);
        if (q && q.sayT <= 0 && !q.sleep && Math.random() < 0.3) pSay(g, q, "dong");
      }
      s.ring -= 20;
    }
  }
  /* the bell rings for as long as anything of theirs is burning */
  if (g.blaze.length && !mRinging(g) && mRing(g, 4) && g.tick > (g.bellT || 0)) {
    g.bellT = g.tick + 1800;
    feed(g, "the bell is ringing. fire!", "#ffb070", "bell");
  }
}

/* -------------------------------------------------------------------
   THE PAPERWORK
   ------------------------------------------------------------------- */
function mLabel(s) {
  if (s.kind === "mine") return "the mine";
  if (s.kind === "tunnel") return s.dir < 0 ? "the west gallery" : "the east gallery";
  if (s.kind === "tower") return "the watchtower";
  if (s.kind === "furnace") return "the furnace";
  if (s.kind === "lift") return "the lift";
  if (s.kind === "bell") return "the bell";
  return "";
}
/* one of ours is finished. true if it was one of ours */
function mFinish(g, s, p) {
  var who = p ? p.name : "the village", o;
  if (s.kind === "mine") {
    feed(g, who + " dug the mine down to " + (s.B - s.S) + " below the rock. now: the galleries", "#e8c8a0", "plan" + s.id);
    achieve(g, "mine");
  } else if (s.kind === "tunnel") feed(g, iCap(mLabel(s)) + " is " + mReach(g, bSite(g, s.of) || s, s.dir).len + " long", "#e8c8a0", "plan" + s.id);
  else if (s.kind === "tower") { feed(g, who + " finished the watchtower. what a view", "#c8d0dc", "plan" + s.id); achieve(g, "tower"); }
  else if (s.kind === "furnace") feed(g, "the furnace is built. ore and coal, please", "#ffb070", "plan" + s.id);
  else if (s.kind === "lift") {
    o = bSite(g, s.on);
    feed(g, iCap(o ? bLabel(o) : "the ladder") + " has a lift now", "#c8d0dc", "plan" + s.id);
  } else if (s.kind === "bell") {
    feed(g, "the bell is up. DONG", "#ffd94a", "plan" + s.id);
    achieve(g, "bell");
    mRing(g, 3);
  } else return false;
  return true;
}
/* what they have in their pockets out of the ground, in a few words, or "" */
function mPockets(p) {
  var out = [];
  if (p.stone >= 1) out.push(Math.floor(p.stone) + " stone");
  if (p.coal >= 1) out.push(p.coal + " coal");
  if (p.ore >= 1) out.push(p.ore + " ore");
  if (p.iron >= 1) out.push(Math.floor(p.iron) + " iron");
  if (p.gold >= 1) out.push(Math.floor(p.gold) + " gold");
  return out.join(", ");
}
/* what they are up to, for the bar at the bottom: "" if it is none of ours */
function mMood(g, p) {
  var k = p.task, s = k && (k.kind === "build" || k.kind === "smelt" || k.kind === "lookout") ? bSite(g, k.site) : null, pk = mPockets(p);
  if (k && k.kind === "smelt") return s && s.hot > g.tick ? "is working the bellows at the furnace" : "is taking " + (pk || "rocks") + " to the furnace";
  if (k && k.kind === "lookout") return s && Math.floor(p.y) === s.T - 1 ? "is up the watchtower, looking out" : "is going up the watchtower";
  if (!s || k.kind !== "build" || !mLabel(s)) return "";
  if (s.mine) return (s.repair ? "is clearing out " : "is digging ") + mLabel(s) + (pk ? ". " + pk + " so far" : ". it takes no wood, just a pick");
  return (s.repair ? "is mending " : "is building ") + mLabel(s) + (pk ? ". carrying " + pk : "");
}

/* -------------------------------------------------------------------
   DRAWING
   ------------------------------------------------------------------- */
var M_CAVE = ["#1a1b21", "#1e1f26", "#17181d", "#22232a"].map(function (h) { return hex32(h); });
var M_INSIDE = [hex32("#3a3630"), hex32("#332f2a")];
var M_PROP = hex32("#5a3e22"), M_PROP_D = hex32("#46301a"), M_LAMP = hex32("#ffc860"), M_SLIT = hex32("#14161c");
var M_IRON = hex32("#6a7484"), M_IRON_D = hex32("#3e4652"), M_CHAIN = hex32("#9aa2ae");
var M_CAGE = hex32("#d4dce6"), M_CAGE_D = hex32("#8c97a6");   /* (bright: it has to show against rock) */
var M_HEARTH = hex32("#1a0e08");
/* the inside of the rock where it has been dug out: dark, with the miners' candles lighting it up round them. a timber
   prop every few columns along a gallery. the inside of a tower. the glow in a furnace. a bell, swinging */
function mDraw(g) {
  var S = g.sites, px = g.px, gp = g.gpx, gw = g.gw, gh = g.gh, hot = 0, k, j, n, e, s, x, y, i, c, cave = g.mcave;
  if (!cave || cave.length !== px.length) cave = g.mcave = new Uint8Array(px.length);
  var lit = [];
  for (k = 0; k < S.length; k++) {
    s = S[k];
    if (s.mine) {
      for (n = 0; n < s.plan.length; n++) {
        e = s.plan[n]; i = e.i; y = (i / gw) | 0;
        if (y < s.S) continue;   /* (the head of it is open to the sky) */
        c = g.m[i]; x = i % gw;
        if (c === MAT.EMPTY || (c === MAT.LADDER && g.aux[i] === 1 && y % 3)) {
          if (c === MAT.EMPTY) px[i] = M_CAVE[((x * 7 + y * 13) ^ (x * y)) & 3];
          else px[i] = blend32(M_CAVE[(x + y) & 3], 0xff000000, 0.2);
          cave[i] = 1; lit.push(i);
        }
      }
      /* props: a beam across the roof, a post down either side, every six columns along a gallery */
      if (s.kind === "tunnel") for (x = Math.min(s.xa, s.xb); x <= Math.max(s.xa, s.xb); x++) {
        if ((x - s.col) % 6 || g.m[(s.B - M_ROOF + 1) * gw + x] !== MAT.EMPTY) continue;
        for (n = -1; n <= 1; n++) { i = (s.B - M_ROOF + 1) * gw + x + n; if (g.m[i] === MAT.EMPTY) px[i] = M_PROP; }
        for (y = s.B - M_ROOF + 2; y <= s.B; y++) for (n = -1; n <= 1; n += 2) { i = y * gw + x + n; if (g.m[i] === MAT.EMPTY) px[i] = M_PROP_D; }
      }
    } else if (s.kind === "tower") {
      /* indoors: dressed stone, and the ladder against it; arrow slits in the walls */
      for (y = s.T + 1; y < s.F; y++) for (x = s.x0 + 1; x <= s.x0 + 5; x++) {
        i = y * gw + x; c = g.m[i];
        if (c === MAT.EMPTY && (g.m[y * gw + s.x0] === MAT.BRICK || g.m[y * gw + s.x0 + 6] === MAT.BRICK)) px[i] = M_INSIDE[(y & 1) || (x + (y >> 1)) % 4 === 0 ? 1 : 0];
        else if (c === MAT.LADDER && g.aux[i] === 1 && y % 3) px[i] = blend32(M_INSIDE[0], 0xff000000, 0.25);
      }
      for (y = s.F - 14; y > s.T + 2; y -= 6) for (x = s.x0; x <= s.x0 + 6; x += 6) {
        i = y * gw + x;
        if (g.m[i] === MAT.BRICK && g.m[i + gw] === MAT.BRICK) { px[i] = M_SLIT; px[i + gw] = M_SLIT; }
      }
      /* the lantern on the battlements: a pool of light, as the porch lights have (ideas.js) */
      i = (s.T - 3) * gw + s.x0 + 7;
      if (s.T > 3 && g.m[i] === MAT.LAMP) { mGlow(g, s.x0 + 7, s.T - 3, 9, 0.4); gp[i] = px[i]; hot++; }
    } else if (s.kind === "furnace" && s.done) {
      var on = s.hot > g.tick;
      for (y = s.G - 3; y <= s.G - 2; y++) for (x = s.x0 + 1; x <= s.x0 + 3; x++) {
        i = y * gw + x;
        if (g.m[i] !== MAT.EMPTY) continue;
        px[i] = on ? SAND_PAL[MAT.FIRE][(Math.random() * 256) | 0] : M_HEARTH;
        if (on) { gp[i] = px[i]; hot++; }
      }
      i = (s.G - 2) * gw + s.fc;
      if (on && g.m[i] === MAT.EMPTY) { px[i] = gp[i] = SAND_PAL[MAT.LAVA][(Math.random() * 256) | 0]; mGlow(g, s.fc, s.G - 2, 6, 0.35); }
    } else if (s.kind === "bell" && s.done && g.m[s.by * gw + s.bx] === MAT.GOLD) {
      /* the clapper, under the mouth of it: swinging, while it rings */
      var sw = s.ring > 0 ? ((g.tick >> 3) & 1 ? 1 : -1) : 0;
      i = (s.by + 1) * gw + s.bx + sw;
      if (s.by + 1 < gh && AIRY[g.m[i]]) px[i] = SAND_PAL[MAT.GOLD][2];
      if (s.ring > 0) { gp[s.by * gw + s.bx] = px[s.by * gw + s.bx]; hot++; }
    }
  }
  /* candles: a warm pool of light round anybody down a mine (on the dug-out rock only) */
  for (k = 0; k < g.peasants.length; k++) {
    var p = g.peasants[k];
    if (p.dead || p.state === "space") continue;
    var hx = Math.floor(p.x), hy = Math.floor(p.y) - 6;
    if (hx < 0 || hy < 0 || hx >= gw || hy >= gh || !cave[hy * gw + hx]) continue;
    for (y = hy - 8; y <= hy + 8; y++) for (x = hx - 8; x <= hx + 8; x++) {
      if (x < 0 || y < 0 || x >= gw || y >= gh) continue;
      i = y * gw + x;
      var r = Math.sqrt((x - hx) * (x - hx) + (y - hy) * (y - hy));
      if (r > 8.5 || !cave[i]) continue;
      var f = 1 - r / 8.5;
      px[i] = blend32(px[i], M_LAMP, f * f * 0.45 * (0.9 + 0.1 * Math.sin(g.t * 13 + k)));
    }
  }
  for (k = 0; k < lit.length; k++) cave[lit[k]] = 0;
  return hot;
}
/* a warm pool of light round (lx, ly) */
function mGlow(g, lx, ly, R, amt) {
  var px = g.px, gw = g.gw, gh = g.gh, fl = 0.85 + 0.1 * Math.sin(g.t * 11 + lx) + 0.05 * Math.sin(g.t * 23 + ly), dx, dy, x, y, r, f;
  for (dy = -R; dy <= R; dy++) for (dx = -R; dx <= R; dx++) {
    x = lx + dx; y = ly + dy; r = Math.sqrt(dx * dx + dy * dy);
    if (r > R + 0.5 || r < 1 || x < 0 || y < 0 || x >= gw || y >= gh) continue;
    f = 1 - r / (R + 0.5); f = f * f * amt * fl;
    px[y * gw + x] = blend32(px[y * gw + x], M_LAMP, f);
  }
}
/* over the top of everybody: the lifts. a wheel on the beam, the chain down from it, and the cage on the end of the
   chain (round whoever is riding in it) */
function mDrawOver(g) {
  var S = g.sites, px = g.px, gw = g.gw, gh = g.gh, k, s, x, y, cy, rider, q;
  function put(X, Y, col) { if (X >= 0 && Y >= 0 && X < gw && Y < gh) px[Y * gw + X] = col; }
  for (k = 0; k < S.length; k++) {
    s = S[k];
    if (s.kind !== "lift" || !s.done) continue;
    rider = null;
    for (q = 0; q < g.peasants.length; q++) { var p = g.peasants[q]; if (!p.dead && p.climb && p.climb.lift === s.id && p.climb.board) rider = p; }
    cy = Math.floor(rider ? rider.y : s.cy);
    var wy = s.top - 10, cx = s.col, spin = (Math.floor(cy) & 1);
    put(cx, wy - 1, M_CHAIN); put(cx - 1, wy - 1 + spin, M_IRON); put(cx + 1, wy - spin, M_IRON);
    for (y = wy + 1; y < cy - 9; y++) put(cx, y, (y & 1) ? M_CHAIN : M_IRON_D);
    for (x = cx - 2; x <= cx + 2; x++) { put(x, cy - 9, M_CAGE); put(x, cy + 1, M_CAGE_D); }
    for (y = cy - 8; y <= cy; y++) { put(cx - 2, y, (y & 1) ? M_CAGE : M_CAGE_D); put(cx + 2, y, (y & 1) ? M_CAGE : M_CAGE_D); }
  }
}
