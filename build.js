/* =====================================================================
   PLEASAND  --  build.js

   the peasants build things out of the wood they chop. a log saws into
   four boards; a board makes one cell of plank, door, stairs or bed,
   and a ladder takes one a rung. nothing here can be painted from the
   picker: it is all theirs.

   every job is a SITE: a list of cells (a plan), each one a thing that
   should be in a cell, in the order it goes up. a cell goes in only when
   something solid is already next to it, so walls rise from the ground,
   a bridge grows out from the bank and a ladder climbs its wall. anyone
   with wood can help with anyone's site. the unbuilt part of a plan is
   drawn as a faint blueprint, so you can see what they are up to.

   what they build:
     a house, when they have the wood and no home: a level plot (dug out
     and filled in as needed), a door at each end that only peasants can
     open, a plank roof with a window in the gable that lights up when
     someone is in, and a bed. the two old huts get doors and a bed put in.
     stairs or a ladder up a wall too tall to jump.
     a bridge over a gap too wide to leap, or a pond too wide to bother
     swimming.
   and, with what is built, they live: they sleep in their beds (or on
   the ground, and complain), run home and hide when things go bang, go
   and warm up by a fire when they are cold, climb ladders, and put back
   what burns down. a peasant who has cut a tree down sometimes plants a
   sapling, which grows.

   a site is done when every cell of it is there (or cannot be: a site
   does not fight a pile of sand). a done site is checked now and then:
   a few cells gone and it is reopened, for repairs; most of it gone and
   it is a ruin, and forgotten.
   ===================================================================== */
"use strict";

var B_BOARDS = 4;                 /* boards out of one log */
var B_OPEN = 4;                   /* projects the village will have going at once */
var B_HOUSES = 6;                 /* houses there is room for in a valley this size */
var B_REACH_X = 4.5, B_REACH_UP = 13, B_REACH_DOWN = 2;   /* how far a hammer reaches */
var B_SLEEPY = 9000, B_SLEEP = 1300;                     /* ticks awake before bed, and asleep in it */
var B_CLIMB = 0.25;               /* rows a tick, on a ladder */
var B_LIFT = 1;                   /* and in a lift (mines.js) */

/* what a cell costs, in boards */
var B_COST = new Float32Array(NMAT);
B_COST[MAT.PLANK] = B_COST[MAT.DOOR] = B_COST[MAT.STAIRS] = B_COST[MAT.BED] = B_COST[MAT.WOOD] = 1;
B_COST[MAT.LADDER] = 1 / 3;
B_COST[MAT.LAMP] = 1;             /* a lantern: a board's worth of frame, round a little oil */
/* (tilling a field and sowing it cost nothing but the work: SOIL and CROP are free) */
/* and the things that are not made of wood (mines.js): what they are made of, and how much of it a cell takes. a stone
   dresses into two blocks, an iron bar into five lengths of girder, and a nugget of gold casts five cells of bell */
var B_RES = [], B_AMT = new Float32Array(NMAT);
for (var bv = 0; bv < NMAT; bv++) if (B_COST[bv]) { B_RES[bv] = "wood"; B_AMT[bv] = B_COST[bv]; }
B_RES[MAT.BRICK] = "stone"; B_AMT[MAT.BRICK] = 0.5;
B_RES[MAT.GIRDER] = "iron"; B_AMT[MAT.GIRDER] = 0.2;
B_RES[MAT.GOLD] = "gold"; B_AMT[MAT.GOLD] = 0.2;
B_RES[MAT.GLASS] = "glass"; B_AMT[MAT.GLASS] = 1;   /* (a pane of glass a cell: leftovers.js) */
/* (and the great works, wonders.js: a pail of wet concrete pours five cells, a stained pane is a cell, and so is a
   firebrick. a plate is cast at the foundry, a fifth of a bar) */
B_RES[MAT.CONCRETE] = "mortar"; B_AMT[MAT.CONCRETE] = 1;
B_RES[MAT.STAINED] = "stained"; B_AMT[MAT.STAINED] = 1;
B_RES[MAT.FIREBRICK] = "firebrick"; B_AMT[MAT.FIREBRICK] = 1;
B_RES[MAT.METAL] = "plate"; B_AMT[MAT.METAL] = 1;   /* (a rocket's hull: and its engine bell, which says so itself. heavens.js) */
var B_KINDS = ["wood", "stone", "iron", "gold", "glass", "firebrick", "stained", "plate", "bell"];
/* what a spade can shift: loose stuff, and greenery */
var B_DIG = new Uint8Array(NMAT);
[MAT.SAND, MAT.ASH, MAT.SNOW, MAT.SALT, MAT.SEED, MAT.PLANT, MAT.FLOWER, MAT.PACKSNOW].forEach(function (v) { B_DIG[v] = 1; });
/* where a board can go: thin air. not into a flame */
var B_AIR = new Uint8Array(NMAT);
[MAT.EMPTY, MAT.SMOKE, MAT.STEAM, MAT.GAS].forEach(function (v) { B_AIR[v] = 1; });
/* what a hoe turns into tilled earth where it lies, rather than shovelling it away */
var B_TILL = new Uint8Array(NMAT); B_TILL[MAT.SAND] = B_TILL[MAT.ASH] = 1;

P_SAY.build = ["*tap tap tap*", "hammer time", "measure twice, cut once", "nearly there", "who needs an architect",
  "it's not crooked, it's rustic", "mind your thumbs", "OW. MY THUMB", "a bit to the left", "*whistles*", "solid work"];
P_SAY.dig = ["dig dig dig", "foundations first", "sand. everywhere", "*shovel*", "this is the boring bit"];
P_SAY.planHouse = ["i'm building a house!", "this looks like a nice spot", "time to settle down",
  "location, location, location", "a house! with a door!"];
P_SAY.planStairs = ["someone should put stairs here", "enough with the ninja rope", "stairs. i'll build stairs"];
P_SAY.planLadder = ["this wants a ladder", "a ladder, right here", "up we go. properly"];
P_SAY.planBridge = ["we need a bridge", "a bridge, right here", "i'm not swimming that", "mind the gap"];
P_SAY.help = ["i'll help!", "need a hand?", "teamwork!", "pass me a nail", "many hands"];
P_SAY.built = ["ta-da!", "nailed it", "built to last", "a masterpiece", "that'll do", "i built that!"];
P_SAY.homeDone = ["home sweet home", "my own house!", "and it has a door!", "nobody touch it", "a roof over my head"];
P_SAY.nowood = ["out of wood", "need more logs", "back to the woods", "who's got planks?"];
P_SAY.safe = ["safe!", "lock the door", "i'll wait it out in here", "nobody's home", "not coming out"];
P_SAY.home = ["home!", "honey, i'm home", "ahh, indoors", "home sweet home"];
P_SAY.sleep = ["zzz", "z z z", "*snore*", "zzzz", "mmm... sand...", "*mumble mumble*"];
P_SAY.wake = ["*yawn*", "what a sleep", "morning!", "i had the strangest dream", "five more minutes"];
P_SAY.bed = ["bedtime", "so sleepy", "*yawn*", "nighty night"];
P_SAY.nap = ["just a quick nap", "so... sleepy...", "i'll just lie here"];
P_SAY.backache = ["my back", "should've built a bed", "the ground is lumpy", "slept funny"];
P_SAY.lostHome = ["MY HOUSE!", "NOOO MY HOUSE", "i just built that", "WHO DID THIS", "we'll rebuild"];
P_SAY.repair = ["needs a patch", "fixing it up", "good as new", "who did this", "*tap tap*"];
P_SAY.plant = ["for the grandchildren", "grow, little tree", "one chopped, one planted", "a tree for the village"];
P_SAY.warm = ["ahh, warm", "that's better", "toasty", "warming my hands", "lovely fire"];
P_SAY.moveIn = ["a new home!", "it's a bit dusty", "i'll take it", "mine now"];
P_SAY.climb = ["up the ladder", "one rung at a time", "don't look down", "ladders!"];

P_ACHIEVE.house = ["HOME SWEET HOME", "a peasant built a house. with a door"];
P_ACHIEVE.village = ["A REAL VILLAGE", "three new houses. somebody call it a town"];
P_ACHIEVE.bridge = ["BRIDGE BUILDERS", "no more swimming to work"];
P_ACHIEVE.stairs = ["STAIRWAY", "one step at a time"];
P_ACHIEVE.ladder = ["UP THE LADDER", "a ladder. ninjas everywhere are disappointed"];
P_ACHIEVE.door = ["DOORS!", "the old hut has doors now. very exclusive"];
P_ACHIEVE.ruin = ["PROPERTY DAMAGE", "somebody's house is gone"];
P_ACHIEVE.rebuilt = ["WE'LL REBUILD", "the village patched up what you broke"];
P_ACHIEVE.tree = ["TREE HUGGER", "a sapling grew into a tree"];

/* -------------------------------------------------------------------
   SITES
   ------------------------------------------------------------------- */
/* one cell of a plan: put v (with aux a, shade sh, or any shade if sh < 0) at (x, y), in phase ph. v EMPTY means dig it out */
function bE(g, x, y, v, ph, a, sh) { return { i: y * g.gw + x, v: v, a: a || 0, sh: sh == null ? -1 : sh, ph: ph }; }
function bNew(g, kind, p, plan, box, extra) {
  var s = { id: ++g.sid, kind: kind, nothing: 0, owner: p ? p.id : 0, who: p ? p.short : "", plan: plan,
            x0: box[0], y0: box[1], x1: box[2], y1: box[3], done: false, repair: false, t0: g.tick, last: g.tick, helped: {}, lost: 0 };
  for (var k in extra) s[k] = extra[k];
  /* (a great work: its box takes in all of its plan below and to the sides, a terrace made up under it, say, which is
     nobody else's ground; and a puddle where any of it goes, or a pond come up over a beach, is no matter: the stone
     goes in, and the water out of its way. otherwise it waits for ever for the water to go. wonders.js) */
  if (s.wonder) for (k = 0; k < plan.length; k++) {
    var px = plan[k].i % g.gw, py = (plan[k].i / g.gw) | 0;
    if (plan[k].v === MAT.EMPTY) continue;
    plan[k].wet = true;
    s.x0 = Math.min(s.x0, px); s.x1 = Math.max(s.x1, px); s.y1 = Math.max(s.y1, py);
  }
  s.cx = (s.x0 + s.x1 + 1) / 2; s.cy = (s.y0 + s.y1 + 1) / 2;
  g.sites.push(s);
  bMark(g, s, 1);
  return s;
}
/* every cell in a plan is marked, so that nobody chops up somebody's house for firewood */
function bMark(g, s, on) {
  if (!g.bmark || g.bmark.length !== g.m.length) g.bmark = new Uint8Array(g.m.length);
  for (var k = 0; k < s.plan.length; k++) if (s.plan[k].v !== MAT.EMPTY) g.bmark[s.plan[k].i] = on;
}
/* a site given up: what was on its pile goes back into p's pockets, not into thin air */
function bNearestLiving(g, s) {
  var best = null, bd = 1e9;
  for (var k = 0; k < g.peasants.length; k++) { var q = g.peasants[k], d = Math.abs(q.x - s.cx); if (!q.dead && d < bd) { bd = d; best = q; } }
  return best;
}
function bGiveBack(s, p) {
  if (!s.stock || !p) return;
  for (var r in s.stock) {
    if (!(s.stock[r] > 0)) continue;
    if (r === "wood") p.boards = (p.boards || 0) + s.stock.wood; else p[r] = (p[r] || 0) + s.stock[r];
    s.stock[r] = 0;
  }
}
function bRemove(g, idx) {
  var s = g.sites[idx];
  g.sites.splice(idx, 1);
  /* (and whoever was on their way to it, or at it, stops: there is nothing there to do now) */
  for (var q = 0; q < g.peasants.length; q++) {
    var t = g.peasants[q].task;
    if (t && ((t.site === s.id && t.kind !== "sow" && t.kind !== "till" && t.kind !== "water" && t.kind !== "shoo") || t.field === s.id || t.pond === s.id)) {
      if (t.kind === "cbail" && t.load) mTipOut(g, g.peasants[q], t, true);   /* (a pail of the crypt's water, carried: tipped out, not lost. monuments.js) */
      g.peasants[q].task = null;
    }
  }
  bMark(g, s, 0);
  for (var k = 0; k < g.sites.length; k++) bMark(g, g.sites[k], 1);   /* (where two plans shared a cell) */
  lMarkMen(g);   /* (and the snowmen, which are nobody's to dig up: leftovers.js) */
}
function bMarked(g, x, y) { return !!(g.bmark && x >= 0 && y >= 0 && x < g.gw && y < g.gh && g.bmark[y * g.gw + x]); }
function bSite(g, id) {
  for (var k = 0; k < g.sites.length; k++) if (g.sites[k].id === id) return g.sites[k];
  return null;
}
function bOwner(g, s) {
  if (!s.owner) return null;
  for (var k = 0; k < g.peasants.length; k++) { var q = g.peasants[k]; if (q.id === s.owner && !q.dead) return q; }
  return null;
}
/* their house, if they still have one */
function bHome(g, p) {
  if (!p.home) return null;
  var s = bSite(g, p.home);
  if (!s || s.owner !== p.id) { p.home = 0; return null; }
  return s;
}
function bLabel(s) {
  var what = s.hut ? "hut" : "house";
  if (s.kind === "house") return s.who ? pTitle(s.who) + "'s " + what : "the empty " + what;
  return iLabel(s) || "the " + s.kind;
}
/* a field's cell of sand or ash, to be tilled where it lies */
function bTill(g, e) { return e.v === MAT.SOIL && B_TILL[g.m[e.i]] === 1; }
/* is this cell of the plan as it should be. (a cell of a mine is not dug until the rock is out of it, too) */
/* (a log that has fallen into somewhere meant to be dug out, the head of a mine say, is in the way too: chopped out) */
/* (and a puddle in a mine, say a spilled bucket sitting on the top rung of the ladder, is bailed out: drain) */
/* (and concrete is in once it is poured: wet, it is setting. wonders.js) */
function bOk(g, e) { var c = g.m[e.i]; if (e.off > g.tick) return true; return e.v === MAT.EMPTY ? (e.once && P_LEAF[c] ? true : !B_DIG[c]) && !(e.mine && ROCK[c]) && !(c === MAT.WOOD && !bMarkedOther(g, e)) && !(e.drain && LIQUID[c]) : c === e.v || (e.v === MAT.CONCRETE && c === MAT.MORTAR); }
/* is the cell of an empty entry some other site's (a log that is somebody's cross is not in anybody's way) */
function bMarkedOther(g, e) { return !!(g.bmark && g.bmark[e.i]); }
/* could it be put right now: a board needs thin air to go into, or something loose they can shovel out of the way first */
function bFree(g, e) {
  var c = g.m[e.i];
  if (e.dry) for (var u = e.i - g.gw, n = 0; u >= 0 && n < 12; u -= g.gw, n++) {   /* nobody digs under water (a pond's floor): not with water over it, */
    if (LIQUID[g.m[u]]) return false;                                            /* or over sand that is under it */
    if (!B_DIG[g.m[u]]) break;
  }
  if (e.v === MAT.SOIL) return B_TILL[c] === 1;                                  /* earth is tilled where it lies, never brought */
  if (c === MAT.WOOD && e.v !== MAT.EMPTY && e.v !== MAT.WOOD) return true;       /* a fallen log where a board goes: chopped out first */
  if (e.v === MAT.CROP && g.m[e.i + g.gw] !== MAT.SOIL) return false;            /* and wheat is sown in earth */
  if (e.redo && c === MAT.PLANK) return true;                                    /* a board to be re-laid in stone (mines.js) */
  if (e.gild && c === MAT.BRICK) return true;                                    /* a stone stand-in, to be gilded (wonders.js) */
  if (e.v === MAT.STAINED && c === MAT.GLASS) return true;                       /* coloured glass melted and set plain: the glazier (monuments.js) */
  if (e.wet && WET[c] === 1) return true;                                        /* a great work's stone goes in where a puddle is (wonders.js) */
  return e.v === MAT.EMPTY || B_AIR[c] === 1 || B_DIG[c] === 1;
}
/* a board needs something solid next to it (corners count) */
function bSupported(g, e) {
  if (e.v === MAT.EMPTY) return true;
  var gw = g.gw, x = e.i % gw, y = (e.i / gw) | 0, dx, dy;
  if (y >= g.gh - 1) return true;
  for (dy = -1; dy <= 1; dy++) for (dx = -1; dx <= 1; dx++) if ((dx || dy) && SOLID[pCell(g, x + dx, y + dy)]) return true;
  return false;
}
function bReach(g, p, e) {
  var gw = g.gw, x = e.i % gw, y = (e.i / gw) | 0, fy = Math.floor(p.y);
  /* (a great work can say it is reached from further off: leaning out from a gantry, say. heavens.js) */
  return Math.abs(x + 0.5 - p.x) <= (e.rx || B_REACH_X) && y >= fy - (e.ru || B_REACH_UP) && y <= fy + (e.rd || B_REACH_DOWN);
}
/* the next cell to do: the earliest phase with work left in it, and in that, the first cell that can go in now and is
   within reach of p; failing that, the nearest one to p. null when there is nothing left that can be done */
function bNext(g, s, p) {
  var P = s.plan, ph = 1e9, k, e, first = null, fd = 1e9, d, gw = g.gw;
  for (k = 0; k < P.length; k++) { e = P[k]; if (e.ph < ph && !bOk(g, e) && bFree(g, e) && !(e.wait > g.tick)) ph = e.ph; }
  if (ph === 1e9) return null;
  /* (a great work: what there is the makings for on the pile, or in their pockets, before what there is not. otherwise a
     crew that comes at it from the side where the firebrick goes is turned away, time after time, short of firebrick,
     from the stone that is waiting the other end. wonders.js) */
  var pay = p && s.wonder;
  if (pay) { for (k = 0; k < P.length; k++) { e = P[k]; if (e.ph === ph && !bOk(g, e) && bFree(g, e) && !(e.wait > g.tick) && bSupported(g, e) && bCanPay(g, p, s, e)) break; } if (k === P.length) pay = false; }
  for (k = 0; k < P.length; k++) {
    e = P[k];
    if (e.ph !== ph || bOk(g, e) || !bFree(g, e) || e.wait > g.tick || !bSupported(g, e)) continue;
    if (pay && !bCanPay(g, p, s, e)) continue;
    if (!p) return e;
    if (bReach(g, p, e)) return e;
    d = Math.abs(e.i % gw + 0.5 - p.x) + Math.abs(((e.i / gw) | 0) - p.y);
    if (d < fd) { fd = d; first = e; }
  }
  return first;
}
function bWaiting(g, s) {
  for (var k = 0; k < s.plan.length; k++) if (s.plan[k].wait > g.tick && !bOk(g, s.plan[k])) return true;
  return false;
}
/* finished: nothing left that could be done. liquids and fire only block a board for now: wait for them, rather
   than declaring a repair done without putting anything back, then reopening it as soon as the water moves on.
   permanent obstacles are still left alone, as is digging that cannot be done under water. */
function bFinished(g, s) {
  for (var k = 0; k < s.plan.length; k++) {
    var e = s.plan[k], c = g.m[e.i];
    if (!bOk(g, e) && (bFree(g, e) || (e.v !== MAT.EMPTY && (LIQUID[c] || c === MAT.FIRE || c === MAT.EMBER)))) return false;
  }
  return true;
}
/* anybody (peasant or duck) standing in the cell, which a board would bury. doors and ladders they can share */
function bInTheWay(g, e, side, by) {
  if (P_PASS[e.v] || P_LEAF[e.v] || e.v === MAT.EMPTY) return null;   /* (a seed goes in at anybody's feet) */
  var gw = g.gw, x = e.i % gw, y = (e.i / gw) | 0, k, q;
  for (k = 0; k < g.peasants.length; k++) {
    q = g.peasants[k];
    /* (side: nor right beside them, a great work's: a wall each side of somebody in a slot one wide, the pipes of an
       organ say, and there they are for good. not beside its builder up a ladder, who is not going anywhere. wonders.js) */
    if (!q.dead && q.state !== "space" && Math.abs(Math.floor(q.x) - x) <= (side && !(q === by && q.climb) ? 1 : 0) && y <= q.y + 0.5 && y >= q.y - 8.5) return q;
  }
  for (k = 0; k < g.ducks.length; k++) {
    q = g.ducks[k];
    if (!q.dead && Math.abs(q.x - x - 0.5) < 2 && y <= q.y + 0.5 && y >= q.y - 3.5) return q;
  }
  return null;
}
/* projects under way. a field being sown is not one: it wants no wood, and is never long about it */
/* (nor is a great work: wonders.js. the graves, the bell and the mending are never held up by one) */
function bOpenCount(g) { var n = 0; for (var k = 0; k < g.sites.length; k++) if (!g.sites[k].done && !g.sites[k].free && !g.sites[k].wonder) n++; return n; }
function bHouses(g) { var n = 0; for (var k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "house") n++; return n; }
function bAlive(g) { var n = 0; for (var k = 0; k < g.peasants.length; k++) if (!g.peasants[k].dead) n++; return n; }
/* the site of a kind whose box (and a little round it) holds (x, y) */
function bSiteAround(g, x, y, kind, pad) {
  pad = pad == null ? 3 : pad;
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if ((!kind || s.kind === kind) && x >= s.x0 - pad && x <= s.x1 + pad && y >= s.y0 - pad && y <= s.y1 + pad) return s;
  }
  return null;
}
/* the stone still to go into house s goes in as planks instead (what is re-laid already stays stone) */
function bUnstone(g, s) {
  for (var k = 0; k < s.plan.length; k++) {
    var e = s.plan[k];
    if (e.v === MAT.BRICK && !bOk(g, e)) { e.v = MAT.PLANK; e.redo = false; }
  }
  feed(g, "out of stone. the rest of " + bLabel(s) + " goes up in wood", "#c8d0dc", "fix" + s.id);
}
/* stone the village has about it, in pockets */
function bStoneToHand(g) {
  var n = 0, k;
  for (k = 0; k < g.peasants.length; k++) if (!g.peasants[k].dead) n += g.peasants[k].stone || 0;
  return n;
}
/* wood in hand, in logs */
function bWood(p) { return (p.logs || 0) + (p.boards || 0) / B_BOARDS; }
/* what they have in their pockets of a building material, in the units a cell is priced in (wood: boards) */
function bHas(p, r) { return r === "wood" ? (p.boards || 0) + (p.logs || 0) * B_BOARDS : (p[r] || 0); }
/* carrying anything worth bringing to a building site */
function bCarries(p) { return bWood(p) > 0.3 || (p.stone || 0) >= 1 || (p.iron || 0) >= 0.2 - 1e-6 || (p.gold || 0) >= 0.2 || (p.glass || 0) >= 1 || (p.firebrick || 0) >= 1 || (p.stained || 0) >= 1 || (p.mortar || 0) >= 1 || (p.plate || 0) >= 1 || (p.bell || 0) >= 1; }
/* what a cell of the plan costs: {r: what in, n: how much}. (an entry can be priced on its own: a miner's ladder is
   knocked together out of the pit props, and costs nothing anybody has to carry) */
function bPrice(e) { var n = e.cost != null ? e.cost : B_AMT[e.v]; return n > 0 ? { r: e.res || B_RES[e.v], n: n } : null; }   /* (or in something of its own: heavens.js) */
/* how much more of r a site wants, for everything still to go in, over what is already stacked on it */
function bNeed(g, s, r) {
  var n = 0, k, e, pr;
  for (k = 0; k < s.plan.length; k++) { e = s.plan[k]; pr = bPrice(e); if (pr && pr.r === r && !bOk(g, e)) n += pr.n; }
  return n - ((s.stock && s.stock[r]) || 0);
}
/* everything they are carrying that the site wants goes on the site's pile, for whoever is building it: a peasant with
   stone and no wood, and one with wood and no stone, can build a stone tower with wooden doors between them */
function bDeposit(g, p, s) {
  var st = s.stock || (s.stock = {}), k, r, need, give;
  for (k = 0; k < B_KINDS.length; k++) {
    r = B_KINDS[k]; need = bNeed(g, s, r);
    if (need <= 1e-6 || bHas(p, r) <= 0) continue;
    if (r === "wood") {
      give = Math.min(p.boards || 0, need); p.boards = (p.boards || 0) - give; st.wood = (st.wood || 0) + give; need -= give;
      while (need > 1e-6 && p.logs > 0) { p.logs--; st.wood += B_BOARDS; need -= B_BOARDS; }
    } else { give = Math.min(p[r], need); p[r] -= give; st[r] = (st[r] || 0) + give; }
  }
}
function bCanPay(g, p, s, e) {
  var pr = bPrice(e);
  return !pr || ((s.stock && s.stock[pr.r]) || 0) + (p ? bHas(p, pr.r) : 0) >= pr.n - 1e-6;
}
/* pay for a cell: off the site's pile first, then out of their pockets (sawing a log into boards if it comes to that) */
function bPay(g, p, s, e) {
  var pr = bPrice(e), st = s.stock || (s.stock = {});
  if (!pr) return true;
  if ((st[pr.r] || 0) >= pr.n - 1e-6) { st[pr.r] -= pr.n; if (Math.abs(st[pr.r]) < 1e-4) st[pr.r] = 0; return true; }   /* (no crumbs of float left on it) */
  if (pr.r === "wood") {
    if ((p.boards || 0) < pr.n - 1e-6 && p.logs > 0) {
      p.logs--; p.boards = (p.boards || 0) + B_BOARDS; g.fx.saw++;
      pChips(g, p.x + p.dir * 2, p.y - 3, 4, [SAND_PAL[MAT.PLANK][10], SAND_PAL[MAT.WOOD][200], hex32("#e8d0a0")]);
    }
    if ((p.boards || 0) < pr.n - 1e-6) return false;
    p.boards -= pr.n; return true;
  }
  if ((p[pr.r] || 0) < pr.n - 1e-6) return false;
  p[pr.r] -= pr.n; return true;
}
/* do they carry anything site s still wants */
function bBrings(g, p, s) {
  for (var k = 0; k < B_KINDS.length; k++) if (bHas(p, B_KINDS[k]) >= 0.2 - 1e-6 && bNeed(g, s, B_KINDS[k]) > 1e-6) return true;   /* (a fifth of a bar is a girder's worth) */
  return false;
}
/* would they be any use on site s: they carry something it wants, or there is enough on its pile for the next cell */
function bUseful(g, p, s) {
  if (bBrings(g, p, s)) return true;
  var e = bNext(g, s, s.wonder ? p : null);   /* (a great work: anything of it there are the makings for. above) */
  return !!e && bCanPay(g, s.wonder ? p : null, s, e);
}
/* anything at all on its pile */
function bStocked(s) { for (var r in s.stock) if (s.stock[r] > 1e-6) return true; return false; }
/* what the next cell of s wants that nobody has brought: for the readout, and for what they say about it */
function bShort(g, s) { var e = bNext(g, s, null), pr = e && bPrice(e); return pr ? pr.r : "wood"; }
/* is the village short of wood: something going up, or a homeless peasant with room for a house */
function bWoodWanted(g, p) {
  for (var k = 0; k < g.sites.length; k++) if (!g.sites[k].done && !g.sites[k].free && Math.abs(g.sites[k].cx - p.x) < 200) return true;
  return !p.home && !bOwnsSite(g, p) && bHouses(g) < Math.min(B_HOUSES, bAlive(g));
}
/* a new house going up already: one at a time, or the wood goes everywhere and nothing gets finished */
function bGoingUp(g) {
  for (var k = 0; k < g.sites.length; k++) { var s = g.sites[k]; if (s.kind === "house" && !s.hut && !s.done && !s.repair) return true; }
  return false;
}
function bOwnsSite(g, p) {
  for (var k = 0; k < g.sites.length; k++) if (g.sites[k].owner === p.id && g.sites[k].kind === "house") return true;
  return false;
}
/* the nearest unfinished site they would be any use on, their own house first. (left: only one that nobody is building,
   with something on its pile) */
function bNearestSite(g, p, R, left) {
  var best = null, bd = R, k, s, d;
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if (s.done || s.free || (p.failSite === s.id && p.failT > g.tick)) continue;   /* (a field wants hands, not wood: ideas.js) */
    if (left && (!bStocked(s) || bBusy(g, s))) continue;
    if (s.wonder && wFull(g, s, p)) continue;   /* (a great work has a crew, and only so many in it: wonders.js) */
    if (!bUseful(g, p, s)) continue;
    d = Math.abs(s.cx - p.x) + Math.abs(s.cy - p.y) * 2 - (s.owner === p.id ? 100 : 0);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}
/* off to work on s */
function bJoin(g, p, s) {
  p.task = { kind: "build", site: s.id, t: 0, act: 0, idle: 0, wait: 0 };
  if (s.owner !== p.id && !s.helped[p.id]) {
    s.helped[p.id] = 1;
    if (s.kind === "house" && s.who && !s.repair) feed(g, p.name + " is helping with " + bLabel(s), "#a8e08a");
    if (p.sayT <= 0) pSay(g, p, s.kind === "farm" ? "helpFarm" : (s.repair ? "repair" : "help"));
  }
}
/* a site found on the way (or just planned): with wood, get to work on it; without, carry on as they would have (a
   rope, a leap, a swim), and somebody with wood will be along */
function bJoinHere(g, p, s) {
  if (bWood(p) > 0.3) { bJoin(g, p, s); return true; }
  return false;
}

/* -------------------------------------------------------------------
   PLANNING
   ------------------------------------------------------------------- */
/* a house: eleven wide, walls ten high, a roof over it with a little window in the gable, a door at each end (so it is
   never in anybody's way) and a bed in the middle, on a plank floor. somewhere near p on a plot that is level, or
   nearly (see bPlot) */
function bPlanHouse(g, p) {
  var fx = Math.floor(p.x), fy = Math.floor(p.y), best = null, d, sd, r;
  for (d = 0; d <= 70; d++) for (sd = -1; sd <= 1; sd += 2) {
    if (!d && sd > 0) continue;
    r = bPlot(g, fx + d * sd - 5, fy);
    if (r && (!best || r.work + d * 0.15 < best.score)) { best = r; best.score = r.work + d * 0.15; }
  }
  if (!best) return false;
  var x0 = best.x0, x1 = x0 + 10, F = best.F, plan = [], x, y, k;
  /* (a village that knows masonry, with stone to spare, builds in it: it does not burn. the doors, the window and the
     bed are still wood) */
  var W = g.know.masonry && bStoneToHand(g) >= 30 ? MAT.BRICK : MAT.PLANK;
  /* 0: dig out whatever is loose in the way, top down. 1: posts down to the ground where it dips, and a plank floor */
  for (k = 0; k < best.dig.length; k++) plan.push(bE(g, best.dig[k][0], best.dig[k][1], MAT.EMPTY, 0));
  for (k = 0; k < best.fill.length; k++) plan.push(bE(g, best.fill[k][0], best.fill[k][1], W, 1));
  for (x = x0; x <= x1; x++) plan.push(bE(g, x, F, W, 1));
  /* 2: the walls are the doors, one at each end, up from the ground. a door cell's aux is how far down the door it is:
     the knob is at 5. 3: the lintels over them, the ceiling, and the roof, with a window in the gable */
  bDoors(g, plan, [x0, x1], F - 9, F - 1, 2);
  plan.push(bE(g, x0, F - 10, W, 3), bE(g, x1, F - 10, W, 3));
  for (k = 0; k <= 5; k++) {
    plan.push(bE(g, x0 + k, F - 11, W, 3));
    if (k < 5) plan.push(bE(g, x1 - k, F - 11, W, 3));
  }
  var win = [(F - 12) * g.gw + x0 + 5, (F - 13) * g.gw + x0 + 5];
  for (x = x0 + 1; x <= x1 - 1; x++) plan.push(x === x0 + 5 ? bE(g, x, F - 12, MAT.PLANK, 3, 1) : bE(g, x, F - 12, W, 3));
  for (x = x0 + 3; x <= x1 - 3; x++) plan.push(x === x0 + 5 ? bE(g, x, F - 13, MAT.PLANK, 3, 1) : bE(g, x, F - 13, W, 3));
  plan.push(bE(g, x0 + 5, F - 14, W, 3));
  /* 4: the bed, in the middle */
  var bx = x0 + 5, blanket = irnd(5);
  for (k = -1; k <= 1; k++) plan.push(bE(g, bx + k, F - 1, MAT.BED, 4, 0, (k === 1 ? 5 : blanket) + 6 * irnd(42)));
  var s = bNew(g, "house", p, plan, [x0, F - 14, x1, F + 3],
               { F: F, ix0: x0 + 1, ix1: x1 - 1, iy0: F - 10, bed: { x: bx, y: F - 1 }, win: win, stone: W === MAT.BRICK });
  feed(g, p.name + " is building a " + (W === MAT.BRICK ? "stone " : "") + "house", "#a8e08a", "plan" + s.id);
  pSay(g, p, "planHouse", true);
  bJoin(g, p, s);
  return true;
}
/* a door in each of the columns xs, rows y0 (its top) to y1, from the bottom up, in phase ph */
function bDoors(g, plan, xs, y0, y1, ph) {
  for (var y = y1; y >= y0; y--) for (var k = 0; k < xs.length; k++) plan.push(bE(g, xs[k], y, MAT.DOOR, ph, Math.min(9, y - y0 + 1)));
}
/* the ground under column x: the first solid thing, coming down from well above row fy. -1 if it is buried, or under
   water, or too far down */
function bGround(g, x, fy) {
  if (pBody(g, x, fy - 24)) return -1;
  for (var y = fy - 23; y <= fy + 14 && !pBody(g, x, y); y++) if (!AIRY[pCell(g, x, y)] && !P_LEAF[pCell(g, x, y)]) return -1;   /* water, lava */
  return y > fy + 14 ? -1 : y;   /* (the ground under any bushes: the bushes get dug out) */
}
/* is (x0 .. x0 + 10) a plot for a house, near row fy. the floor goes in level with the highest ground on it, on stilts
   where the ground dips (up to three cells), so the way in at either end is never uphill. how much work it would be,
   and what to clear out of the way */
function bPlot(g, x0, fy) {
  var gw = g.gw, x1 = x0 + 10, gy = [], x, y, c, k, F = 1e9;
  if (x0 < 4 || x1 > gw - 5) return null;
  for (x = x0; x <= x1; x++) {
    y = bGround(g, x, fy);
    if (y < 0) return null;
    gy.push(y); if (y < F) F = y;
  }
  var dig = [], fill = [], work = 0;
  for (k = 0; k <= 10; k++) if (gy[k] - F > 3) return null;
  /* in front of each door, the ground must not be any higher than the floor */
  for (k = 1; k <= 2; k++) {
    y = bGround(g, x0 - k, fy); if (y >= 0 && y < F) return null;
    y = bGround(g, x1 + k, fy); if (y >= 0 && y < F) return null;
  }
  /* nobody else's site, nothing hot or wet nearby */
  for (k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (x1 + 4 >= s.x0 && x0 - 4 <= s.x1 && F + 10 >= s.y0 && F - 24 <= s.y1) return null;
  }
  for (y = F - 16; y <= F + 2; y++) for (x = x0 - 3; x <= x1 + 3; x++) {
    c = pCell(g, x, y);
    if (LIQUID[c] || HOT[c] || c === MAT.DRAIN || P_BANG[c]) return null;
  }
  /* inside the house and its roof: dig out what is loose (a sand pile, a bush); anything else there and it will not do */
  for (y = F - 15; y <= F - 1; y++) for (x = x0; x <= x1; x++) {
    c = pCell(g, x, y);
    if (AIRY[c]) continue;
    if (!B_DIG[c]) return null;
    dig.push([x, y]); work++;
  }
  for (x = x0; x <= x1; x++) {
    if (gy[x - x0] > F) work += 2;
    if (x === x0 || x === x1 || x === x0 + 5) for (y = gy[x - x0] - 1; y > F; y--) fill.push([x, y]);   /* stilts */
  }
  /* the dirt comes off the top first */
  dig.sort(function (a, b) { return a[1] - b[1]; });
  /* the foundation goes in from the bottom up */
  fill.sort(function (a, b) { return b[1] - a[1]; });
  return { x0: x0, F: F, dig: dig, fill: fill, work: work };
}

/* a wall too tall to jump: put stairs up it, or if there is no run-up for stairs, a ladder. true if they did something
   about it (started, joined, or turned back for wood) */
function bTryWall(g, p, fx, fy) {
  if (p.fire || p.cold > 400 || (p.task && p.task.kind !== "build")) return false;
  var dir = p.dir, wx = fx + dir, k, y, c;
  for (k = 4; k <= 40; k++) if (pRoom(g, wx, fy - k)) break;
  if (k > 40 || k <= P_JUMP) return false;   /* a hop, not a climb */
  var sy = fy - k;
  /* somebody's house is not a hill, and nor is a tree, or a heap of one */
  for (y = sy + 1; y <= fy; y++) {
    c = pCell(g, wx, y);
    if (WOODY[c] || LEAFY[c] || P_PASS[c]) return false;
  }
  var s = bSiteAround(g, wx, fy, "stairs", 2) || bSiteAround(g, wx, fy, "ladder", 2);
  if (s) return s.done ? false : bJoinHere(g, p, s);
  if (bOpenCount(g) >= B_OPEN || p.planCD || Math.random() > (bWood(p) >= 1 ? 1 : 0.4)) return false;
  /* stairs for a short climb (they take a board and a half a row), a ladder for a tall one (one a row) */
  var kind = "stairs", pl = k <= 17 ? bStairsPlan(g, wx, fy, sy, dir) : null;
  if (!pl) { kind = "ladder"; pl = bLadderPlan(g, wx, fy, sy, dir); }
  if (!pl) { p.planCD = 900; return false; }
  /* stairs are built from the bottom step up, by somebody standing on the step below: never from underneath */
  s = bNew(g, kind, p, pl.plan, pl.box, { side: kind === "stairs" ? -dir : 0 });
  feed(g, p.name + (kind === "stairs" ? " is building some stairs" : " is putting up a ladder"), "#a8e08a", "plan" + s.id);
  pSay(g, p, kind === "stairs" ? "planStairs" : "planLadder", true);
  return bJoinHere(g, p, s);
}
/* steps two up and two along, each one a tread of two and a riser under its front edge, which sits on the corner of the
   step below. the top step is close enough under the top of the wall to step up onto it */
function bStairsPlan(g, wx, fy, sy, dir) {
  var h = fy - sy, n = Math.ceil((h - 3) / 2), plan = [], i, x, y;
  if (n < 1 || n > 14) return null;
  for (i = 1; i <= 2 * n + 1; i++) {
    x = wx - dir * i;
    if (x < 2 || x > g.gw - 3) return null;
    if (!pSolid(g, x, fy + 1)) return null;                 /* a level run-up */
    for (y = fy - 2 * n - 9; y <= fy; y++) if (!AIRY[pCell(g, x, y)]) return null;
  }
  for (i = 1; i <= n; i++) {
    var xin = wx - dir * (1 + 2 * (n - i)), xout = xin - dir, r = fy - 2 * i + 1;
    plan.push(bE(g, xout, r + 1, MAT.STAIRS, 10 + i), bE(g, xout, r, MAT.STAIRS, 10 + i), bE(g, xin, r, MAT.STAIRS, 10 + i));
  }
  var xa = wx - dir * 2 * n, xb = wx - dir;
  return { plan: plan, box: [Math.min(xa, xb), fy - 2 * n, Math.max(xa, xb), fy] };
}
/* a ladder three wide (two rails and the rungs between) up the face of the wall, from the ground to the top of it */
function bLadderPlan(g, wx, fy, sy, dir) {
  var cols = [wx - dir * 3, wx - dir * 2, wx - dir], plan = [], x, y, k, gaps = 0;
  for (k = 0; k < 3; k++) {
    x = cols[k];
    if (x < 1 || x > g.gw - 2) return null;
    for (y = sy + 1; y <= fy; y++) if (!AIRY[pCell(g, x, y)]) return null;
  }
  for (y = sy - 9; y <= sy; y++) if (!AIRY[pCell(g, cols[1], y)]) return null;   /* room for them at the top */
  if (!pSolid(g, cols[1], fy + 1)) return null;
  for (y = sy + 1; y <= fy; y++) if (!pSolid(g, wx, y)) gaps++;
  if (gaps > (fy - sy) / 3) return null;                                          /* nothing much to lean it on */
  var xl = Math.min(cols[0], cols[2]);
  for (y = fy; y >= sy + 1; y--) for (k = 2; k >= 0; k--) plan.push(bE(g, cols[k], y, MAT.LADDER, 10 + fy - y, cols[k] - xl));
  return { plan: plan, box: [xl, sy + 1, xl + 2, fy] };
}
/* a gap too wide to leap, or a pond: a plank bridge across, at the height they are standing at (or a little higher,
   to clear the water), to ground on the far side about level with it. true if they did something about it */
function bTryBridge(g, p, fx, fy, water) {
  if (p.fire || p.cold > 400 || p.task) return false;
  var dir = p.dir, s = bSiteAround(g, fx + dir * 2, fy + 1, "bridge", 2), d, dy, x, y, far = 0, fdy = 0;
  if (s) return s.done ? false : bJoinHere(g, p, s);
  /* (a peasant can stand a step out over the edge, held up by the corner: the bridge starts at the edge itself) */
  for (d = 0; d < 2 && !pSolid(g, fx, fy + 1); d++) fx -= dir;
  /* from the ground: not from somebody's roof, or the top of a hedge */
  if (bMarked(g, fx, fy + 1) || WOODY[pCell(g, fx, fy + 1)] || P_LEAF[pCell(g, fx, fy + 1)]) return false;
  /* with wood in hand, always; without, now and then (somebody else will bring the wood) */
  if (bOpenCount(g) >= B_OPEN || p.planCD || Math.random() > (water ? (bWood(p) >= 1 ? 0.3 : 0.05) : (bWood(p) >= 1 ? 1 : 0.4))) return false;
  for (d = 3; d <= 31 && !far; d++) {
    x = fx + dir * d;
    if (x < 2 || x > g.gw - 3) return false;
    for (dy = -2; dy <= 2; dy++) {
      if (pSolid(g, x, fy + 1 + dy) && pRoom(g, x, fy + dy) && !LIQUID[pCell(g, x, fy + dy)] && !LIQUID[pCell(g, x, fy + dy - 3)]) {
        /* to the ground, too: not a roof, and not a tree (a crown is something to walk through, not to walk to) */
        if (bMarked(g, x, fy + 1 + dy) || WOODY[pCell(g, x, fy + 1 + dy)] || P_LEAF[pCell(g, x, fy + 1 + dy)]) return false;
        far = d; fdy = dy; break;
      }
    }
  }
  if (!far) return false;
  /* the deck: where they stand, raised to clear whatever is in the way (water), up to two cells */
  var row = fy + 1, ok = false, wet = 0;
  for (; row >= fy - 1 && !ok; row--) {
    ok = true;
    for (d = 1; d < far; d++) { var c = pCell(g, fx + dir * d, row); if (!AIRY[c] && !SOLID[c]) { ok = false; break; } }
  }
  row++;
  if (!ok || Math.abs(row - (fy + 1 + fdy)) > 3) return false;
  var plan = [];
  for (d = 1; d < far; d++) {
    x = fx + dir * d;
    for (y = row - 9; y < row; y++) if (!AIRY[pCell(g, x, y)]) return false;   /* headroom on the deck */
    for (y = row + 1; y <= row + 6; y++) if (LIQUID[pCell(g, x, y)]) { wet++; break; }
    if (AIRY[pCell(g, x, row)]) plan.push(bE(g, x, row, MAT.PLANK, 2));
  }
  /* raised over the water: a step up onto it at each end, which holds it up too */
  if (row < fy + 1) {
    plan.unshift(bE(g, fx + dir, row + 1, MAT.PLANK, 2));
    if (row + 1 < fy + 1 + fdy) plan.push(bE(g, fx + dir * (far - 1), row + 1, MAT.PLANK, 2));
  }
  if (plan.length < 3 || (water && wet < (far - 1) / 2)) return false;
  var xa = fx + dir, xb = fx + dir * (far - 1);
  s = bNew(g, "bridge", p, plan, [Math.min(xa, xb), row, Math.max(xa, xb), row], {});
  feed(g, p.name + " is building a bridge", "#a8e08a", "plan" + s.id);
  pSay(g, p, "planBridge", true);
  return bJoinHere(g, p, s);
}

/* -------------------------------------------------------------------
   DOING IT
   ------------------------------------------------------------------- */
/* could not get on with s: leave it to somebody else for a while */
function bFail(g, p, s, t, why) {
  p.failSite = s.id; p.failT = g.tick + t; p.task = null; p.taskCD = 120;
  /* a stair or a bridge that nobody can find a way to add to, time after time, is not going to happen */
  /* nor anything nobody can find a way to, time after time (a grave across the lake from everybody, a gallery down a
     mine they cannot get into, a pond dug where nobody can get to it to finish it): given up, and planned again
     somewhere they can get to. (a gallery is written off. a pond that was dug once is mended, not given up) */
  if (why === "walk" && s.kind !== "house" && s.kind !== "farm" && !s.mine && !s.wonder && (s.kind !== "pond" || !s.repair) && (s.lost = (s.lost || 0) + 1) > 24) {
    var j = g.sites.indexOf(s);
    if (j >= 0) {
      feed(g, "nobody can get to " + bLabel(s) + ". the village gave up on it", "#c8d0dc", "plan" + s.id);
      if (s.kind === "glasshouse") lRefund(g, s); else bGiveBack(s, p);
      /* (and a pond is not planned on the same spot again for a good long while: ideas.js iPlanPond) */
      if (s.kind === "pond") { if (!g.pondNo) g.pondNo = {}; for (var x = s.x0 >> 2; x <= s.x1 >> 2; x++) g.pondNo[x] = g.tick + 30000; }
      bRemove(g, j);
    }
    return;
  }
  if (why === "walk" && s.kind === "tunnel" && (s.lost = (s.lost || 0) + 1) > 24 && !s.flood) {
    s.flood = 2; var m0 = bSite(g, s.of); if (m0 && (m0.lv || 0) === (s.lv || 0)) m0.out[s.dir] = true;
    feed(g, "nobody can get down to " + bLabel(s) + ". that way is done with", "#c8d0dc", "plan" + s.id);
  }
  if (why === "nothing" && s.kind !== "house" && !s.free && !s.wonder && ++s.nothing > 6) {
    var k = g.sites.indexOf(s);
    if (k >= 0) { feed(g, "the village gave up on " + bLabel(s), "#c8d0dc", "plan" + s.id); if (s.kind === "glasshouse") lRefund(g, s); else bGiveBack(s, p); bRemove(g, k); }
  }
}
/* one tick of building. true if they spent it working; false to walk (towards the work, or out of its way) */
function bTaskBuild(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || s.done) { p.task = null; p.taskDone = true; return false; }
  if (s.kind === "tunnel" && mRetired(g, s)) { p.task = null; p.taskDone = true; return false; }   /* (its shaft written off: mines.js) */
  if (s.kind === "tunnel" && lChargeOn(g, s.id)) { p.task = null; p.taskCD = 120; return false; }   /* (a lit fuse down there: nobody goes near it. leftovers.js) */
  /* too cold to hold a hammer: down tools, and go and get warm (see bPick). the site will still be there */
  if (p.cold > 150 && !p.climb) { p.task = null; p.taskDone = true; return false; }
  k.t++;
  var e = bNext(g, s, p);
  if (!e) {
    if (bFinished(g, s)) { bFinish(g, s, p); p.task = null; p.taskDone = true; return false; }
    /* nothing that can go in yet (somebody standing in the way: wait for them). come back to it later */
    if (!bWaiting(g, s) && ++k.idle > 240) { bFail(g, p, s, 1200, "nothing"); }
    return false;
  }
  /* short of what the next cell is made of: whatever they did bring goes on the pile first (stone for a tower whose next
     cell is a door, say), and then they leave it to somebody who has the rest */
  if (!bCanPay(g, p, s, e) && (k.dep || !bBrings(g, p, s))) {
    /* a house going up (or being done over) in stone, and not a stone left in anybody's pocket: the rest in wood */
    if (s.kind === "house" && bPrice(e).r === "stone" && bStoneToHand(g) < 1) { bUnstone(g, s); return false; }
    if (p.sayT <= 0) pSay(g, p, "no" + bPrice(e).r);
    bFail(g, p, s, 600, "short");
    return false;
  }
  var gw = g.gw, x = e.i % gw, y = (e.i / gw) | 0, fx = Math.floor(p.x), fy = Math.floor(p.y), dx = x + 0.5 - p.x;
  if (k.idle > 600 || k.t > 6000) { bFail(g, p, s, 900, k.idle > 600 ? "idle" : "slow"); return false; }
  /* stairs: stand on what is built, on the near side of the next piece, never under it or past it.
     (only stairs use side this way. a lamp carries the side of the door it hangs by, which is
     not a place to stand: it is the same column the builder has to be in) */
  if (s.side && s.kind === "stairs" && !p.climb && (p.x - x - 0.5) * s.side < 0.6) {
    k.act = 0;
    if (pStuck(p, k, Math.abs(p.x - x - 0.5 - s.side))) { bFail(g, p, s, 1500, "side"); return false; }
    p.dir = s.side; return false;
  }
  if (!bReach(g, p, e)) {
    k.act = 0;
    /* up a ladder to reach the rest of it */
    /* (steering the climb, but only on a ladder that is by the work, and that goes on that way: a ladder somewhere else
       is the way there, and goes where the way goes) */
    if (p.climb) {
      if (Math.abs(dx) > B_REACH_X + 2 || p.climb.stuck > 60) return false;
      /* level with it, but too far across to reach from the ladder: off the ladder, onto whatever is beside it. no way
         off here: on the way they were going, to wherever the ladder lets them off (and the way round from there) */
      var sd = dx < 0 ? -1 : 1, lx = p.climb.x;
      if (y >= fy - B_REACH_UP && y <= fy + B_REACH_DOWN) {
        if (bStepOff(g, lx, fy, sd)) { p.x = lx + 2 * sd + 0.5; p.dir = sd; p.climb = null; }
        return false;
      }
      p.climb.dir = y > fy ? 1 : -1;
      return false;
    }
    if (y < fy - B_REACH_UP && Math.abs(dx) <= B_REACH_X + 2) {
      var lc = bLadderNear(g, fx, fy);
      /* only a ladder that goes somewhere (or one this site is still putting up):
         an oil derrick's finished ladder ends under its own ironwork, and a builder
         who climbs it gets nowhere, for ever */
      if (lc >= 0 && (bLadderGoes(g, lc, fy) || bLadderOurs(g, s, lc) || bLadderReaches(g, lc, fy, y))) {
        /* (up it and down again, over and over, and no nearer: that is no way up) */
        if ((k.climbs = (k.climbs || 0) + 1) > 12) { bFail(g, p, s, 1500, "walk"); return false; }
        bClimbStart(g, p, lc, -1); return true;
      }
    }
    /* the work is down a shaft, beside the ladder they are standing on top of (an upper level of a mine, worked from the
       ladder: mines.js): down it they go */
    if (y > fy + B_REACH_DOWN && Math.abs(dx) <= B_REACH_X + 2) {
      for (var ld = -1, lx2 = fx - 2; lx2 <= fx + 2 && ld < 0; lx2++) ld = bLadderMid(g, lx2, fy + 1);
      if (ld >= 0) { bClimbStart(g, p, ld, 1); return true; }
    }
    /* (and the way to the top of that shaft, the lip of rock beside the ladder, when there is nowhere nearer to stand) */
    var shaft = s.kind === "tunnel" && s.lv ? bSite(g, s.of) : null;
    /* (once it is the shaft they are making for, they keep making for it a while: trying the direct way every tick as
       well, the two routes would push each other out, and each be looked for afresh, every tick) */
    if (shaft && (k.shaftT > g.tick || pathGo(g, p, "b" + s.id + ":" + e.i, x, y, pathNear(x, y, 4, B_REACH_UP, B_REACH_DOWN)) < 0)) {
      var sx = shaft.col, sy = shaft.S - 1;
      if (!(k.shaftT > g.tick)) k.shaftT = g.tick + 600;
      left = pathGo(g, p, "shaft" + shaft.id, sx, sy, function (X, Y) { return Math.abs(X - sx) <= 2 && Y === sy; });
      if (!left) k.shaftT = 0;   /* (there: the ladder down, from here) */
      if (pStuck(p, k, left > 0 ? left : Math.abs(sx + 0.5 - p.x) + Math.abs(sy - fy))) { bFail(g, p, s, 1500, "walk"); return false; }
      return false;
    }
    /* find a way to somewhere the next piece is in reach from (paths.js) */
    var left = pathGo(g, p, "b" + s.id + ":" + e.i, x, y, pathNear(x, y, e.rx ? Math.floor(e.rx) : 4, e.ru || B_REACH_UP, e.rd || B_REACH_DOWN));
    if (left < 0) {
      /* no way there that they can see. right under it: try from further in (off the ground and onto the floor) */
      if (Math.abs(dx) <= 1.5) { k.idle += 3; p.dir = s.cx < p.x ? -1 : 1; }
      else p.dir = dx < 0 ? -1 : 1;
    }
    if (pStuck(p, k, left > 0 ? left : Math.abs(dx) + Math.max(0, fy - B_REACH_UP - y, y - fy - B_REACH_DOWN))) {
      bFail(g, p, s, 1500, "walk"); return false;
    }
    return false;
  }
  var who = bInTheWay(g, e, s.wonder, p);
  if (who === p) { p.dir = dx > 0 ? -1 : 1; if (p.climb) e.wait = g.tick + 120; return false; }   /* step out of its way */
  if (who) { if (++k.wait > 200) { e.wait = g.tick + 300; k.wait = 0; } return true; }
  k.idle = 0;
  /* there: whatever they brought that the site wants goes on its pile */
  if (!k.dep) { k.dep = true; bDeposit(g, p, s); if (!bCanPay(g, p, s, e)) return false; }
  if (Math.abs(dx) > 0.5) p.dir = dx < 0 ? -1 : 1;
  k.act++;
  var pick = !!e.mine && ROCK[g.m[e.i]] === 1;   /* rock: that is a job for a pick (mines.js) */
  /* (sand where a board should go: shovel it out first. unless it is a timber to be driven in through it, which it
     would only pour into the hole round: a mine's collar) */
  var till = !pick && bTill(g, e), dig = !pick && !till && (e.v === MAT.EMPTY || (B_DIG[g.m[e.i]] === 1 && !e.drive) || g.m[e.i] === MAT.WOOD);
  /* (iron tools, from the forge, go faster: mines.js) */
  var hoe = till || dig, sow = e.v === MAT.CROP, beat = pick ? mStroke(g) : (hoe ? (p.tools ? 14 : 20) : (p.tools && !sow ? 10 : 14));
  p.pose = pick ? ((k.act % beat) < (beat >> 1) ? "pickA" : "pickB") : hoe ? ((k.act % beat) < (beat >> 1) ? "chopA" : "chopB") :
           (sow ? ((k.act % 14) < 7 ? "stand" : "eatB") : ((k.act % beat) < (beat >> 1) ? "hammerA" : "hammerB"));
  if (k.act % beat === (beat >> 1)) {
    if (pick) mMine(g, s, e, p); else if (till) bTillCell(g, s, e, p); else if (dig) bDig(g, s, e, p); else bPlace(g, s, e, p);
    if (!sow) mWear(g, p);
    k.best = null; k.climbs = 0; s.lost = 0;   /* that was progress (and somebody could get to it, after all) */
  }
  return true;
}
/* a stroke of the hoe: sand (or ash) turned over into dark earth, where it lies, keeping its heat */
function bTillCell(g, s, e, p) {
  var gw = g.gw;
  heatBecome(g, e.i, MAT.SOIL);
  if (++g.dug >= I_DUG && !g.dugSpark) { g.dugSpark = 1; iSpark(g, p, "dig"); }   /* (all that hoeing: ideas.js) */
  s.last = g.tick;
  g.fx.thud++;
  pChips(g, e.i % gw + 0.5, ((e.i / gw) | 0) - 0.5, 3, [SAND_PAL[MAT.SOIL][0], SAND_PAL[MAT.SOIL][60], SAND_PAL[MAT.SAND][0]]);
  if (p.sayT <= 0 && Math.random() < 0.06) pSay(g, p, "till");
}
/* a board into the plan. the cell keeps whatever heat it had: a board brought in at room temperature, near enough */
/* the water in cell j shoved out of the way: through the water it is part of, to the nearest open air over or beside it
   (the top of it, or a gap in a lid over it), heat and all. false if it is shut in, with nowhere to go */
function bShove(g, j, not) {   /* (not: cells it is not to go to: a mould it is being shoved out of, say) */
  var gw = g.gw, n = g.m.length, seen = {}, Q = [j], h = 0, i, k, nb, to = -1;
  seen[j] = 1;
  while (h < Q.length && h < 600 && to < 0) {
    i = Q[h++];
    var x = i % gw, N = [i - gw, x > 0 ? i - 1 : -1, x < gw - 1 ? i + 1 : -1, i + gw];
    for (k = 0; k < 4 && to < 0; k++) {
      nb = N[k];
      if (nb < 0 || nb >= n || seen[nb]) continue;
      seen[nb] = 1;
      if (g.m[nb] === MAT.EMPTY) { if (not && not[nb]) Q.push(nb); else to = nb; }
      else if (WET[g.m[nb]]) Q.push(nb);
    }
  }
  if (to < 0) return false;
  heatSync(g, j); heatSync(g, to); sandSwap(g, j, to);
  return true;
}
function bPlace(g, s, e, p) {
  var gw = g.gw, x = e.i % gw, y = (e.i / gw) | 0;
  /* (where it goes in water, the water is shoved out of the way, up to the top of it, heat and all: none of it lost. a
     pocket of water shut in, with nowhere to go: left a while) */
  if (WET[g.m[e.i]] && !bShove(g, e.i)) { e.wait = g.tick + 300; return; }
  if (!bPay(g, p, s, e)) return;
  if (e.redo && g.m[e.i] === MAT.PLANK) p.boards = (p.boards || 0) + 1;   /* (the old board, out, and into their pocket) */
  if (e.gild && g.m[e.i] === MAT.BRICK) p.stone = (p.stone || 0) + 0.5;   /* (the stand-in, out: wonders.js) */
  if (e.v === MAT.STAINED && g.m[e.i] === MAT.GLASS) p.glass = (p.glass || 0) + 1;   /* (the plain pane, out: monuments.js) */
  if (e.v === MAT.STAINED && s.tints && s.tints.length) e.a = s.tints.shift();   /* (the colour of the pane that goes in: wonders.js) */
  /* (concrete goes in wet, into its form, and sets there: wonders.js) */
  sandSet(g, e.i, e.v === MAT.CONCRETE ? MAT.MORTAR : e.v);
  g.aux[e.i] = e.v === MAT.CONCRETE ? 128 : e.a;
  if (e.sh >= 0) g.sh[e.i] = e.sh;
  heatAccept(g, e.i);
  s.last = g.tick;
  if (s.wonder) s.puts = (s.puts || 0) + 1;   /* (how much of a great work has gone in: wonders.js wLayBy) */
  g.fx.hammer++;
  pChips(g, x + 0.5, y + 0.5, 2, [SAND_PAL[e.v][0], SAND_PAL[e.v][40]]);
  if (p.sayT <= 0 && Math.random() < 0.06) pSay(g, p, e.v === MAT.CROP ? "sow" : (s.repair ? "repair" : "build"));
}
/* a spadeful of sand off the plot, flung out of the way. it lands where it lands, heat and all */
function bDig(g, s, e, p) {
  var gw = g.gw, x = e.i % gw, y = (e.i / gw) | 0, out = x + 0.5 < s.cx ? -1 : 1, c = g.m[e.i];
  /* a log in the way (off a tree somebody felled, or fallen into a hole that should be empty): chopped out of it, and kept */
  if (c === MAT.WOOD) {
    g.m[e.i] = MAT.EMPTY; heatSync(g, e.i); p.logs = (p.logs || 0) + 1; s.last = g.tick; g.fx.thud++;
    pChips(g, x + 0.5, y + 0.5, 4, [SAND_PAL[MAT.WOOD][40], SAND_PAL[MAT.WOOD][200]]);
    return;
  }
  /* a puddle down a mine: a bucketful, carried up and tipped on the spoil heap */
  if (e.drain && LIQUID[c]) { if (!mSpoil(g, s, e.i)) { g.m[e.i] = MAT.EMPTY; heatSync(g, e.i); } s.last = g.tick; g.fx.splash++; return; }
  if (!B_DIG[c]) return;
  g.dug++;   /* (a village that has done enough of this thinks of landscaping: ideas.js) */
  if (g.dug >= I_DUG && !g.dugSpark) { g.dugSpark = 1; iSpark(g, p, "dig"); }
  /* (the head of a mine sunk through sand that pours back in as fast as it is dug: after enough of that, they leave
     it, and sink one somewhere firmer. mines.js) */
  if (s.kind === "mine" && !s.done && !s.repair && !s.sunk && (e.digs = (e.digs || 0) + 1) > 60) { mGiveUpMine(g, s, p); return; }   /* (the first sinking only) */
  /* (where a great work's stone (or firebrick) goes, sand that runs back in as fast as it is dug out: after a few
     spadefuls, it is driven in where the sand lies, as the cathedral's crypt walls are. wonders.js) */
  if (s.wonder && e.v !== MAT.EMPTY && (e.digs = (e.digs || 0) + 1) > 4) e.drive = true;
  /* down the head of a mine there is no throwing it out: it is carried up and tipped on the spoil heap (mines.js) */
  if (e.clear && s.spots) mSpotDug(g, s);   /* (sand slid in where they stand to work it: mines.js) */
  if ((s.mine || (e.clear && s.spots)) && !P_LEAF[c] && mSpoil(g, s, e.i)) { g.dug++; s.last = g.tick; g.fx.thud++; return; }
  /* greenery is just cleared. sand goes up and out over their shoulder (or the other, if that way is blocked), high
     enough to clear the sides of a hole as steep as sand stands, and far enough to land well outside it. with no way
     to throw it, it is trodden down instead */
  if (P_LEAF[c] || c === MAT.SEED || !bToss(g, e.i, out)) { g.m[e.i] = MAT.EMPTY; g.aux[e.i] = 0; heatSync(g, e.i); }
  s.last = g.tick;
  g.fx.thud++;
  if (p.sayT <= 0 && Math.random() < 0.05) pSay(g, p, "dig");
}
/* throw cell j (a spadeful of sand) up and away: out first, then the other way. only if the arc it would fly on is
   clear for the first dozen cells or so, or it hits whatever is in the way and lands right back where it came from */
function bToss(g, j, out) {
  var gw = g.gw, x = j % gw, y = (j / gw) | 0, k, t, X, Y, ok;
  for (k = 0; k < 2; k++, out = -out) {
    for (ok = true, t = 1; t <= 14 && ok; t++) {
      X = x + 0.5 + out * t; Y = y + 0.5 - 1.7 * t + 0.055 * t * t;
      if (X < 0 || X >= gw || Y < 0) break;
      if (!AIRY[pCell(g, Math.floor(X), Math.floor(Y))]) ok = false;
    }
    if (ok && sandFling(g, j, out * (0.9 + Math.random() * 0.2), -1.6 - Math.random() * 0.2)) return true;
  }
  return false;
}
function bFinish(g, s, p) {
  if (s.wonder && !wReady(g, s)) return;   /* (wet concrete in it, still going off: wonders.js) */
  s.done = true; s.last = g.tick;
  /* (the ground cleared for it only had to be cleared the once: a bush grown back there since is no damage) */
  if (!s.mine && s.kind !== "pond") for (var q = 0; q < s.plan.length; q++) { var eq = s.plan[q]; if (eq.v === MAT.EMPTY && !eq.clear && !eq.drain) eq.once = true; }
  var o = bOwner(g, s);
  /* what is left on the pile (a log sawn for one board, say) goes home with whoever finished it */
  if (s.stock && p) for (var r in s.stock) {
    if (r === "wood") p.boards = (p.boards || 0) + s.stock.wood; else p[r] = (p[r] || 0) + s.stock[r];
    s.stock[r] = 0;
  }
  g.fx.pop++;
  if (s.sow) { s.sow = s.repair = false; if (p && p.sayT <= 0) pSay(g, p, "sown"); return; }   /* a field sown again: no news */
  if (s.repair) {
    s.repair = false;
    /* (a clearing-out that was not news is not news when it is done either) */
    if (!s.quiet) feed(g, bLabel(s).charAt(0).toUpperCase() + bLabel(s).slice(1) + (s.redo ? " is stone now. let it burn" : " is as good as new"), "#a8e08a", "fix" + s.id);
    s.quiet = false;
    s.redo = false;
    achieve(g, "rebuilt");
    if (s.stone) achieve(g, "stonehouse");
    if (p) pSay(g, p, "built", true);
    return;
  }
  if (s.kind === "house") {
    if (s.hut) { feed(g, bLabel(s).charAt(0).toUpperCase() + bLabel(s).slice(1) + " has doors and a bed now", "#a8e08a", "plan" + s.id); achieve(g, "door"); }
    else {
      feed(g, (s.who ? pTitle(s.who) : "the village") + " has a house now", "#a8e08a", "plan" + s.id);
      achieve(g, "house");
      var n = 0;
      for (var k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "house" && !g.sites[k].hut && g.sites[k].done) n++;
      if (n >= 3) achieve(g, "village");
    }
    if (o) { o.home = s.id; pSay(g, o, "homeDone", true); }
  } else if (!iFinish(g, s, p)) {
    feed(g, p.name + " built " + (s.kind === "stairs" ? "some stairs" : "a " + s.kind), "#a8e08a", "plan" + s.id);
    achieve(g, s.kind);
  }
  if (p && p !== o) pSay(g, p, "built", true);
}

/* -------------------------------------------------------------------
   KEEPING HOUSE: once a second or so, look the village over
   ------------------------------------------------------------------- */
function buildStep(g) {
  if (!g.sites || g.tick % 30) return;
  if (g.tick % 600 === 0) mFloodClock(g);   /* (the mines' flood clocks run whether or not anybody is planning: mines.js) */
  var S = g.sites, k, s, j;
  for (k = S.length - 1; k >= 0; k--) {
    s = S[k];
    /* the owner is gone. their name stays on it until somebody moves in */
    if (s.owner && !bOwner(g, s)) { s.owner = 0; if (s.kind !== "house" || !s.done) s.who = ""; }
    if (s.done) { if (((g.tick / 30) + s.id) % 4 === 0) bInspect(g, s, k); }
    /* a field that has not come on at all in a good while (buried under a fall of sand, say, its earth out of anybody's
       reach): given up, busy or not, so that another can be started. a village is not to starve waiting on it */
    else if (s.kind === "farm" && !s.repair && g.tick - s.last > 5000) {   /* (a new one: one being sown again is kept) */
      feed(g, "the village gave up on " + bLabel(s) + ". another field, somewhere else", "#c8d0dc", "plan" + s.id);
      bGiveBack(s, bNearestLiving(g, s)); bRemove(g, k); g.resow = 1;   /* (and another, wherever there is room: ideas.js) */
      iFarmNo(g, s.x0, s.x1, 30000);   /* (not there again, for a good while) */
    }
    else if (g.tick - s.last > 20000 && !bBusy(g, s) && !s.wonder) {   /* (a great work waits: wonders.js) */
      /* nobody has touched it in ages. a house that is mostly up is lived in as it is; anything else is forgotten */
      if ((s.kind === "house" || s.free) && (s.repair || s.hut || bShare(g, s) > 0.6)) {
        s.done = true; s.repair = s.sow = false; s.last = g.tick;
        if (s.kind === "house" && bOwner(g, s)) bOwner(g, s).home = s.id;
      }
      else { feed(g, "the village gave up on " + bLabel(s), "#c8d0dc", "plan" + s.id); bGiveBack(s, bNearestLiving(g, s)); bRemove(g, k); }
    }
  }
  /* an empty house: the nearest peasant without one moves in */
  for (k = 0; k < S.length; k++) {
    s = S[k];
    if (s.kind !== "house" || s.owner || !s.done) continue;
    var best = null, bd = 1e9;
    for (j = 0; j < g.peasants.length; j++) {
      var q = g.peasants[j];
      if (q.dead || q.state === "space" || bHome(g, q) || bOwnsSite(g, q)) continue;
      var d = Math.abs(q.x - s.cx);
      if (d < bd) { bd = d; best = q; }
    }
    if (!best) continue;
    var old = s.who;
    s.owner = best.id; s.who = best.short; best.home = s.id;
    feed(g, best.name + " moved into " + (old ? pTitle(old) + "'s old " + (s.hut ? "hut" : "house") : "the empty " + (s.hut ? "hut" : "house")), "#a8e08a");
    pSay(g, best, "moveIn", true);
  }
}
/* how much of it is up */
function bShare(g, s) {
  var n = 0, ok = 0;
  for (var k = 0; k < s.plan.length; k++) { var e = s.plan[k]; if (e.v === MAT.EMPTY) continue; n++; if (bOk(g, e)) ok++; }
  return n ? ok / n : 1;
}
function bBusy(g, s) {
  for (var k = 0; k < g.peasants.length; k++) { var t = g.peasants[k].task; if (t && t.kind === "build" && t.site === s.id) return true; }
  return false;
}
/* a finished site, looked over: a few cells gone and it is reopened for repairs. most of it gone and it is a ruin. a
   field with only its crop gone (eaten, mostly) is not damaged, just harvested: it is quietly reopened, to sow again.
   earth blown out of a field is not put back (it is tilled where it lies, never brought), but it counts towards a ruin */
function bInspect(g, s, idx) {
  var gw = g.gw, n = 0, gone = 0, broken = 0, crops = 0, silt = 0, k, e, x, y;
  if (s.melts) return;   /* (the ice palace melts, and is mourned, not mended: pleasures.js) */
  mSpotSilt(g, s);   /* (sand slid over the place to stand at a furnace, or a pump: mines.js) */
  for (y = s.y0; y <= s.y1; y++) for (x = s.x0; x <= s.x1; x++) {
    var c = pCell(g, x, y);
    if (c === MAT.FIRE || c === MAT.EMBER) return;   /* still burning: wait until it is out */
  }
  for (k = 0; k < s.plan.length; k++) {
    e = s.plan[k];
    /* (sand slid back into a pond, or a mine; a log fallen into one counts for more: it stops up the ladder) */
    if (e.v === MAT.EMPTY) { if ((s.kind === "pond" || s.mine || e.clear) && !bOk(g, e) && bFree(g, e)) silt += g.m[e.i] === MAT.WOOD || LIQUID[g.m[e.i]] || e.clear ? 5 : 1; continue; }
    var lost = !bOk(g, e) && bFree(g, e);
    if (e.v === MAT.CROP) { if (lost) crops++; continue; }
    n++;
    if (lost) gone++;
    if (lost || (e.v === MAT.SOIL && !bOk(g, e))) broken++;
  }
  if (broken > n * 0.6 && !s.mine) {   /* (a mine is a hole in the ground: there is no knocking that down) */
    var o = bOwner(g, s);
    feed(g, bLabel(s).charAt(0).toUpperCase() + bLabel(s).slice(1) + " is gone", "#ff9a8a", "fix" + s.id);
    if (o && s.kind === "house") { o.home = 0; pSay(g, o, "lostHome", true); }
    if (s.kind === "house") { achieve(g, "ruin"); wTale(g, "house", o, bLabel(s), s.cx, s.y1); }
    bRemove(g, idx);
    return;
  }
  if (silt > 4) {
    s.done = false; s.repair = true; s.last = g.tick; s.helped = {};
    /* (the same site cleared out again so soon is not news) */
    s.quiet = g.tick - (s.clearNews || -1e9) < 8000;
    if (!s.quiet) { s.clearNews = g.tick; feed(g, "the village is clearing out " + bLabel(s), "#a8e08a", "fix" + s.id); }
    return;
  }
  if (!gone) {
    if (crops) { s.done = false; s.repair = s.sow = true; s.last = g.tick; s.helped = {}; }
    return;
  }
  s.done = false; s.repair = true; s.last = g.tick; s.helped = {};
  /* a village that knows masonry, and has stone to hand, puts back what burned (or was knocked out) of a house in
     stone, which does not burn: the doors, the window and the bed are still wood */
  var brick = 0;
  if (s.kind === "house" && g.know.masonry && bStoneToHand(g) >= 6) for (k = 0; k < s.plan.length; k++) {
    e = s.plan[k];
    if (e.v === MAT.PLANK && e.a !== 1 && !bOk(g, e) && bFree(g, e)) { e.v = MAT.BRICK; brick++; }
  }
  if (brick) s.stone = true;
  feed(g, (brick ? "the village is rebuilding " + bLabel(s) + " in stone" : "the village is fixing " + bLabel(s)), "#a8e08a", "fix" + s.id);
  var ow = bOwner(g, s);
  if (ow && s.kind === "house" && gone > 3) pSay(g, ow, "lostHome");
}

/* -------------------------------------------------------------------
   WHAT TO DO NEXT. called when they are looking for something to do,
   after food. true if they found something
   ------------------------------------------------------------------- */
function bPick(g, p) {
  var t, h;
  if ((p.tired || 0) > B_SLEEPY) { p.task = { kind: "sleep", t: 0 }; if (p.sayT <= 0) pSay(g, p, "bed"); return true; }
  if (p.cold > 80) {
    if (g.wAny && wWarmBath(g, p)) return true;   /* (warm baths, if there are any: wonders.js) */
    t = bFindFire(g, p, 80);
    if (t) { p.task = { kind: "warm", x: t.x, y: t.y, t: 0 }; return true; }
    /* no fire: make one, with logs (or coal out of the mine, which burns longer); else home, where it is warmer */
    if ((p.logs || 0) >= 3 || (p.coal || 0) >= 3) {
      var cx = Math.floor(p.x) + p.dir * 5;
      if (pCampOk(g, p, cx, Math.floor(p.y))) { p.task = { kind: "camp", x: cx, y: Math.floor(p.y), t: 0, act: 0, coal: (p.logs || 0) < 3 }; return true; }
    }
    if ((h = bHome(g, p)) && !bInside(h, p)) { p.task = { kind: "home", t: 0, stay: 600 }; return true; }
  }
  /* something going up that they could help with: with what they carry, or (now and then, empty-handed) a site left
     with what it needs on its pile and nobody building it */
  var s = bCarries(p) ? bNearestSite(g, p, 170) : (Math.random() < 0.2 ? bNearestSite(g, p, 170, true) : null);
  if (s) { bJoin(g, p, s); return true; }
  if (bWood(p) > 0.3) {
    if (!bHome(g, p) && !bOwnsSite(g, p) && p.logs >= 4 && !p.planCD && bHouses(g) < Math.min(B_HOUSES, bAlive(g)) && !bGoingUp(g)) {
      if (bPlanHouse(g, p)) return true;
      p.planCD = 2400;
    }
  }
  if (p.wantPlant) {
    p.wantPlant = false;
    t = bPlantSpot(g, p, g.know.forest ? 120 : 40, !!g.know.forest);
    if (t) { p.task = { kind: "plant", x: t.x, y: t.y, t: 0, act: 0, loose: !!g.know.forest }; return true; }
  }
  /* bored, and not yet bored enough for mischief: go and see something (paths.js) */
  if (p.bored > 600 && !p.exploreCD && Math.random() < 0.25) {
    p.exploreCD = 1500 + irnd(1500);
    if (explorePick(g, p)) return true;
  }
  return false;
}
/* one tick of one of the jobs in here, or undefined if it is not one of ours */
function bTask(g, p, k) {
  if (k.kind === "build") return bTaskBuild(g, p, k);
  if (k.kind === "sleep") return bTaskSleep(g, p, k);
  if (k.kind === "warm") return bTaskWarm(g, p, k);
  if (k.kind === "home") return bTaskHome(g, p, k);
  if (k.kind === "plant") return bTaskPlant(g, p, k);
  if (k.kind === "explore") return exploreTask(g, p, k);
  return iTask(g, p, k);
}

/* bed: their own, if they have one with a bed in it. otherwise wherever they are standing */
function bTaskSleep(g, p, k) {
  var h = bHome(g, p);
  if (++k.t > 1500 || !h || !h.bed || pCell(g, h.bed.x, h.bed.y) !== MAT.BED) { bNap(g, p); return true; }
  var bx = h.bed.x + 0.5, dx = bx - p.x, fy = Math.floor(p.y);
  if (Math.abs(dx) < 0.7 && Math.abs(fy - (h.bed.y - 1)) <= 1) {
    p.x = bx; p.sleep = B_SLEEP + irnd(500); p.tired = 0; p.inBed = true;
    p.task = null; p.taskDone = true;
    pSay(g, p, "sleep", true);
    return true;
  }
  var bed = h.bed, left = pathGo(g, p, "bed" + h.id, bed.x, bed.y - 1, function (x, y) { return x === bed.x && y === bed.y - 1; });
  if (left < 0) p.dir = dx < 0 ? -1 : 1;
  if (pStuck(p, k, left > 0 ? left : Math.abs(dx) + Math.abs(fy - h.bed.y))) { bNap(g, p); return true; }
  return false;
}
function bNap(g, p) {
  p.sleep = (B_SLEEP >> 1) + irnd(300); p.tired = B_SLEEPY * 0.4; p.inBed = false;
  p.task = null; p.taskDone = true;
  pSay(g, p, "nap", true);
}
/* asleep: lie still, snore now and then, wake up when it is time or when something happens */
function bSleeping(g, p) {
  if (p.panic > 0 || p.fire || p.cold > 300 || p.acid > 0 || p.breath < P_BREATH) { bWake(g, p); return false; }
  /* a bed that is no longer there */
  if (p.inBed && !SOLID[pCell(g, Math.floor(p.x), Math.floor(p.y) + 1)]) { bWake(g, p); return false; }
  p.pose = "sleep"; p.idle = 0;
  if (--p.sleep <= 0) { bWake(g, p); return true; }
  if (p.sleep % 170 === 0 && p.sayT <= 0) pSay(g, p, "sleep");
  return true;
}
function bWake(g, p) {
  var rough = !p.inBed;
  p.sleep = 0; p.inBed = false;
  pSay(g, p, rough && Math.random() < 0.7 ? "backache" : "wake", true);
}

/* cold: go and stand by a fire. a respectful distance from it */
function bFindFire(g, p, R) {
  var fx = Math.floor(p.x), fy = Math.floor(p.y), best = null, bd = 1e9, x, y, c, d;
  for (y = fy - 14; y <= fy + 6; y++) for (x = fx - R; x <= fx + R; x++) {
    c = pCell(g, x, y);
    if (c !== MAT.FIRE && c !== MAT.EMBER) continue;
    d = Math.abs(x - fx) + Math.abs(y - fy) * 2;
    if (d < bd) { bd = d; best = { x: x, y: y }; }
  }
  return best;
}
function bHotNear(g, x0, y0, r) {
  for (var y = y0 - r; y <= y0 + r; y++) for (var x = x0 - r; x <= x0 + r; x++) { var c = pCell(g, x, y); if (c === MAT.FIRE || c === MAT.EMBER) return true; }
  return false;
}
function bTaskWarm(g, p, k) {
  if (++k.t > 1800 || (!k.social && p.cold <= 0)) {
    if (!k.social && p.sayT <= 0) pSay(g, p, "warm");
    p.task = null; p.taskDone = true; return false;
  }
  if (k.t % 30 === 0 && !bHotNear(g, k.x, k.y, 3)) { p.task = null; return false; }   /* it went out */
  var side = p.x < k.x + 0.5 ? -1 : 1, want = k.x + 0.5 + side * 7, dx = want - p.x;
  if (Math.abs(dx) > 1.2) {
    var wx = Math.round(want - 0.5), left = pathGo(g, p, "warm" + k.x + "," + side, wx, k.y, function (x, y) { return Math.abs(x - wx) <= 1 && Math.abs(y - k.y) <= 6; });
    if (left < 0) p.dir = dx < 0 ? -1 : 1;
    if (pStuck(p, k, left > 0 ? left : Math.abs(dx))) { pGiveUp(g, p, k.x); return false; }
    return false;
  }
  p.dir = -side; p.idle = 0;
  if (p.cold > 0) p.cold = Math.max(0, p.cold - 3);   /* hands out to the flames */
  if (p.sayT <= 0 && Math.random() < 0.003) pSay(g, p, k.social ? "camp" : "warm");
  return true;
}
/* a campfire has been lit at (x, y): anybody nearby with nothing better to do comes and stands round it for a while */
function bGather(g, p, x, y) {
  for (var k = 0; k < g.peasants.length; k++) {
    var q = g.peasants[k];
    if (q === p || q.dead || q.state !== "walk" || q.task || q.sleep || Math.abs(q.x - x) > 90 || Math.abs(q.y - y) > 30 || Math.random() < 0.4) continue;
    q.task = { kind: "warm", x: x, y: y - 1, t: 0, social: true };
  }
}
/* is p indoors, in house h */
function bInside(h, p) { return p.x > h.ix0 && p.x < h.ix1 + 1 && Math.abs(p.y - (h.F - 1)) <= 2.5; }
/* go home, and stay in for a bit */
function bTaskHome(g, p, k) {
  var h = bHome(g, p);
  if (!h || ++k.t > 1500) { p.task = null; return false; }
  if (bInside(h, p)) {
    p.idle = k.stay || 400; p.task = null; p.taskDone = true;
    pSay(g, p, k.hide ? "safe" : "home");
    return true;
  }
  var left = bGoHome(g, p, h);
  if (pStuck(p, k, left > 0 ? left : Math.abs((h.ix0 + h.ix1 + 1) / 2 - p.x))) { p.task = null; return false; }
  return false;
}
/* steer p for indoors at h: by a route if there is one, else straight for it */
function bGoHome(g, p, h) {
  var left = pathGo(g, p, "home" + h.id, Math.round(h.cx), h.F - 1, function (x, y) { return x >= h.ix0 && x <= h.ix1 && y >= h.F - 3 && y <= h.F - 1; });
  if (left < 0) p.dir = (h.ix0 + h.ix1 + 1) / 2 < p.x ? -1 : 1;
  return left;
}
/* things going bang: anyone with a house near enough runs for it, instead of just running. true if that is the plan */
function bHide(g, p) {
  var h = bHome(g, p);
  if (!h || Math.abs(h.cx - p.x) > 120 || Math.abs(h.F - p.y) > 40) return mHide(g, p);   /* (far from home: the cathedral, monuments.js) */
  if (g.know.bucket && iBlazeOf(g, h.id)) return false;   /* (not into a house that is on fire) */
  if (bInside(h, p)) {
    p.panic = 0; p.idle = 400 + irnd(400); p.hid = g.tick;
    pSay(g, p, "safe", true);
    return true;
  }
  bGoHome(g, p, h);
  return true;
}

/* a sapling, after cutting a tree down: open ground, sand or ash under it, plenty of sky, nothing else growing close */
function bPlantSpot(g, p, R, loose) {
  var fx = Math.floor(p.x), fy = Math.floor(p.y), d, sd, x, y;
  for (d = 4; d <= R; d++) for (sd = -1; sd <= 1; sd += 2) {
    x = fx + d * sd;
    if (x < 8 || x > g.gw - 9) continue;
    for (y = fy - 12; y <= fy + 12 && !SOLID[pCell(g, x, y + 1)]; y++);
    if (y > fy + 12 || !bPlantOk(g, x, y, loose)) continue;
    return { x: x, y: y };
  }
  return null;
}
/* loose: a forester (ideas.js) is planting the woods back, and knows a tree wants less room than all that: a crown's
   width from the next tree, room overhead to grow into, and only houses kept well clear of */
function bPlantOk(g, x, y, loose) {
  var c = pCell(g, x, y + 1), k, yy, W = loose ? 6 : 10, H = loose ? 20 : 30;
  if (c !== MAT.SAND && c !== MAT.ASH) return false;
  if (pCell(g, x, y) !== MAT.EMPTY) return false;
  for (yy = y - H; yy <= y; yy++) for (k = -W; k <= W; k++) {
    c = pCell(g, x + k, yy);
    if (Math.abs(k) <= 2 && !AIRY[c]) return false;
    if (c === MAT.WOOD || c === MAT.SAPLING || (LIQUID[c] && Math.abs(k) <= (loose ? 3 : W))) return false;
  }
  /* a tree is firewood waiting to happen: not next to anybody's house */
  if (bSiteAround(g, x, y, loose ? "house" : null, 10) || (loose && (bSiteAround(g, x, y, null, 3) || bSiteAround(g, x, y, "furnace", 10) || bSiteAround(g, x, y, "well", 10)))) return false;
  return true;
}
function bTaskPlant(g, p, k) {
  if (++k.t > 900) { p.task = null; return false; }
  var dx = k.x + 0.5 - p.x;
  if (Math.abs(dx) > 2.5 || Math.abs(dx) < 1 || Math.abs(Math.floor(p.y) - k.y) > 1) {
    var left = Math.abs(dx) < 1 ? -1 : pathGo(g, p, "plant" + k.x, k.x, k.y, function (x, y) { var d = Math.abs(x - k.x); return d >= 1 && d <= 2 && y === k.y; });
    if (left < 0) p.dir = (Math.abs(dx) < 1 ? -dx : dx) < 0 ? -1 : 1;
    if (pStuck(p, k, left > 0 ? left : Math.abs(Math.abs(dx) - 1.7))) { pGiveUp(g, p, k.x); return false; }
    k.act = 0; return false;
  }
  if (!bPlantOk(g, k.x, k.y, k.loose)) { p.task = null; return false; }
  p.dir = dx < 0 ? -1 : 1;
  k.act++;
  p.pose = (k.act >> 3) & 1 ? "eatB" : "stand";
  if (k.act % 10 === 0) pChips(g, k.x + 0.5, k.y + 0.5, 1, [SAND_PAL[MAT.SAND][0]]);
  if (k.act === 50) {
    var j = k.y * g.gw + k.x;
    sandSet(g, j, MAT.SAPLING); g.aux[j] = 0; heatAccept(g, j);
    feed(g, p.name + " planted a tree", "#a8e08a", "plant");
    pSay(g, p, "plant", true);
    if (k.loose) achieve(g, "grove");
    p.task = null; p.taskDone = true; p.bored = 0;
  }
  return true;
}
/* a sapling: its tip climbs, leaving trunk behind it, then puts out a crown, a ring at a time. it all comes out of the
   air it grows into, heat and all, the way a plant grows */
function saplingGrow(g, i, x, y) {
  if (Math.random() > 0.007) return;
  var gw = g.gw, m = g.m, a = g.aux[i], H = 9 + ((x * 7 + 3) % 6), dx, dy, j, r;
  if (a < H) {
    j = i - gw;
    if (y > 2 && m[j] === MAT.EMPTY && !SOLID[m[j - gw]]) {
      heatBecome(g, i, MAT.WOOD);
      sandSet(g, j, MAT.SAPLING); g.aux[j] = a + 1; heatAccept(g, j);
      return;
    }
    a = H;   /* something overhead: crown out from here */
  }
  r = a - H;
  var rx = 2 + r * 2, ry = 1 + r, cy = y - 1 - r;
  for (dy = -ry; dy <= ry; dy++) for (dx = -rx; dx <= rx; dx++) {
    if (dx * dx / (rx * rx + 0.5) + dy * dy / (ry * ry + 0.5) > 1 || Math.random() < 0.15) continue;
    var X = x + dx, Y = cy + dy;
    if (X < 0 || Y < 0 || X >= gw || Y >= g.gh) continue;
    j = Y * gw + X;
    if (m[j] === MAT.EMPTY) sandSet(g, j, MAT.PLANT);
  }
  if (r >= 2) { heatBecome(g, i, MAT.WOOD); achieve(g, "tree"); }
  else { g.aux[i] = a + 1; heatAccept(g, i); }
}

/* -------------------------------------------------------------------
   LADDERS
   ------------------------------------------------------------------- */
/* the middle column of a ladder with a cell at (x, y), or -1 */
function bLadderMid(g, x, y) {
  if (pCell(g, x, y) !== MAT.LADDER) return -1;
  return x - (g.aux[y * g.gw + x] - 1);
}
/* a ladder that a peasant standing at (fx, fy) is in front of, or in: its middle column, or -1 */
function bLadderNear(g, fx, fy) {
  for (var d = 0; d <= 2; d++) for (var s = -1; s <= 1; s += 2) {
    var x = fx + d * s, c = bLadderMid(g, x, fy);
    if (c < 0) c = bLadderMid(g, x, fy - 3);
    if (c >= 0) return c;
    if (!d) break;
  }
  return -1;
}
/* could they step off the ladder (middle column cx) onto the ground beside it, side s, with their feet at fy */
function bStepOff(g, cx, fy, s) { var x = cx + 2 * s; return pRoom(g, x, fy) && pGround(g, x, fy) && !pSolid(g, cx + s, fy); }
/* is this ladder one of the ones this site is putting up? then it is theirs to climb,
   however far up it currently reaches */
function bLadderOurs(g, s, cx) {
  for (var k = 0; k < s.plan.length; k++) {
    var e = s.plan[k];
    if (e.v === MAT.LADDER && (e.i % g.gw) === cx) return true;
  }
  return false;
}
/* does the ladder go anywhere: up from (cx, fy) to a top they could step off at */
function bLadderGoes(g, cx, fy) {
  for (var y = fy; y > 0 && pCell(g, cx, y) === MAT.LADDER; y--);
  return bStepOff(g, cx, y, 1) || bStepOff(g, cx, y, -1);
}
/* the rung they would stop at: the top one, or wherever their head is stopped */
function bLadderTop(g, cx, fy) {
  var y = fy;
  while (y > 0 && pCell(g, cx, y) === MAT.LADDER) {
    if (pBody(g, cx, y - 9)) return y;
    y--;
  }
  return y + 1;
}
/* a dead-end ladder is still worth climbing if its top is near enough the work
   to reach it with a hammer (that is how they work up a wall too tall to jump) */
function bLadderReaches(g, cx, fy, wy) {
  var top = bLadderTop(g, cx, fy);
  return wy >= top - B_REACH_UP && wy <= top + B_REACH_DOWN;
}
function bClimbStart(g, p, cx, dir) {
  p.climb = { x: cx, dir: dir, t: 0, y0: p.y, stuck: 0 };
  p.x = cx + 0.5; p.jumping = false; p.falling = false; p.idle = 0;
  /* a ladder with a lift on it: into the cage, if nobody else is in it (mines.js) */
  var L = mLiftAt(g, cx, Math.floor(p.y));
  if (L && !mLiftBusy(g, L, p)) { p.climb.lift = L.id; return; }
  if (p.sayT <= 0 && Math.random() < 0.2) pSay(g, p, "climb");
}
/* at the foot of a wall: if there is a ladder up it (that goes somewhere), up they go */
function bLadderUp(g, p, fx, fy) {
  var cx = bLadderNear(g, fx, fy);
  if (cx < 0 || !bLadderGoes(g, cx, fy)) return false;
  bClimbStart(g, p, cx, -1);
  return true;
}
/* at the top of one, walking off the edge onto it: down they go */
function bLadderDown(g, p, nfx, fy) {
  for (var y = fy + 1; y <= fy + 2; y++) {
    var cx = bLadderMid(g, nfx, y);
    if (cx >= 0) { bClimbStart(g, p, cx, 1); return true; }
  }
  return false;
}
/* one tick on a ladder */
function bClimbStep(g, p) {
  var c = p.climb, cx = c.x, fy = Math.floor(p.y);
  c.t++;
  p.falling = false; p.fallY = p.y; p.vy = 0; p.jumping = false;
  if (p.fire || c.t > 3000 ||
      (pCell(g, cx, fy) !== MAT.LADDER && pCell(g, cx, fy + 1) !== MAT.LADDER && pCell(g, cx, fy - 3) !== MAT.LADDER)) {
    p.climb = null; return;   /* let go, or the ladder let go of them */
  }
  p.x = cx + 0.5;
  p.pose = "climb";
  /* in the lift: it has to come to them first. then it carries them, a good deal faster than hands do (mines.js) */
  var L = c.lift ? mLiftRide(g, p, c) : null, sp = L ? B_LIFT : B_CLIMB;
  if (L === false) return;
  /* a builder works off the ladder */
  if (p.task && p.task.kind === "build" && bTaskBuild(g, p, p.task)) return;
  if (!p.climb) return;
  if (c.dir < 0) {
    if (p.y < c.y0 - 3) for (var s = 0; s < 2; s++) {
      var sd = s ? -p.dir : p.dir;
      if (bStepOff(g, cx, fy, sd)) { p.x = cx + 2 * sd + 0.5; p.dir = sd; p.climb = null; return; }
    }
    /* (feet a rung short of the bottom of it, in the floor it stands on, say: up onto it all the same) */
    if ((pCell(g, cx, fy) === MAT.LADDER || pCell(g, cx, fy - 1) === MAT.LADDER) && !pBody(g, cx, fy - 9)) p.y -= sp;
    else if (++c.stuck > 60) c.dir = 1;   /* nowhere to go up there: back down */
  } else {
    if (pGround(g, cx, fy) && !(pCell(g, cx, fy + 1) === MAT.LADDER)) { p.climb = null; return; }
    if (pCell(g, cx, fy + 1) === MAT.LADDER || pCell(g, cx, fy) === MAT.LADDER) p.y += sp;
    else p.climb = null;   /* the bottom of it is in mid-air: drop */
  }
  if (L) L.cy = p.y;   /* (and the cage goes with them) */
}

/* -------------------------------------------------------------------
   THE OLD HUTS: on the books as houses, with a door and a bed to come
   ------------------------------------------------------------------- */
function bHut(g, hx, w, base, H, owner) {
  var gw = g.gw, plan = [], x, y, k;
  for (y = base - H; y < base; y++) for (x = hx; x < hx + w; x++) if (g.m[y * gw + x] === MAT.WOOD) plan.push(bE(g, x, y, MAT.WOOD, 2));
  /* a door in each doorway, in the outer of its two columns */
  bDoors(g, plan, [hx, hx + w - 1], base - 11, base - 1, 3);
  var bx = hx + (w >> 1), blanket = irnd(5);
  for (k = -1; k <= 1; k++) plan.push(bE(g, bx + k, base - 1, MAT.BED, 4, 0, (k === 1 ? 5 : blanket) + 6 * irnd(42)));
  var s = bNew(g, "house", owner, plan, [hx, base - H - 9, hx + w - 1, base],
               { F: base, ix0: hx + 2, ix1: hx + w - 3, iy0: base - H + 1, bed: { x: bx, y: base - 1 }, win: [], hut: true });
  if (owner) owner.home = s.id;
  return s;
}

/* -------------------------------------------------------------------
   DRAWING: blueprints, lit windows, doors standing open
   ------------------------------------------------------------------- */
var B_PRINT = hex32("#9ad8ff"), B_DIGCOL = hex32("#ffb070"), B_WIN_LIT = hex32("#ffd27a"), B_WIN_GLOW = hex32("#6a4a10");
var B_INSIDE = [hex32("#2a1c14"), hex32("#241810")], B_LAMP = hex32("#c88a3a");
var B_DOOR_OPEN = hex32("#160e08"), B_DOOR_EDGE = hex32("#8a5a30");
function bDraw(g) {
  var S = g.sites, px = g.px, gp = g.gpx, gw = g.gw, k, j, e, s, x, y, lit = 0;
  if (!S) return 0;
  var a = 0.2 + 0.1 * Math.sin(g.t * 3);
  for (k = 0; k < S.length; k++) {
    s = S[k];
    if (!s.done) for (j = 0; j < s.plan.length; j++) {
      e = s.plan[j];
      if (bOk(g, e) || !bFree(g, e)) continue;
      x = e.i % gw; y = (e.i / gw) | 0;
      if (e.v === MAT.EMPTY) px[e.i] = blend32(px[e.i], B_DIGCOL, 0.3);
      else if (((x + y) & 1) === 0 || e.v === MAT.DOOR) px[e.i] = blend32(px[e.i], B_PRINT, a);
    }
    /* indoors, the back wall: dark boards, warm with lamplight when somebody is in */
    var home = s.kind === "house" && s.iy0 && (s.done || s.repair) && bOccupied(g, s);
    if (s.kind === "house" && s.iy0 && (s.done || s.repair)) for (y = s.iy0; y < s.F; y++) for (x = s.ix0; x <= s.ix1; x++) {
      j = y * gw + x;
      if (g.m[j] !== MAT.EMPTY) continue;
      var wall = B_INSIDE[(y % 3 === 0) ? 1 : 0];
      px[j] = home ? blend32(wall, B_LAMP, 0.18 + 0.1 * Math.max(0, 1 - Math.abs(x - s.cx) / 8)) : wall;
    }
    /* somebody home: the window glows */
    if (s.win && s.win.length && home) for (j = 0; j < s.win.length; j++) {
      var w = s.win[j];
      if (g.m[w] === MAT.PLANK && g.aux[w] === 1) { px[w] = B_WIN_LIT; gp[w] = B_WIN_GLOW; lit++; }
    }
  }
  /* doors swing open for whoever is going through: a peasant, or a duck slipping in behind */
  var walkers = g.peasants.concat(g.ducks);
  for (k = 0; k < walkers.length; k++) {
    var p = walkers[k], duck = k >= g.peasants.length;
    if (p.dead || (p.state !== "walk" && !(duck && p.state === "fly"))) continue;
    var fx = Math.floor(p.x), fy = Math.floor(p.y);
    for (x = fx - 1; x <= fx + 1; x++) for (y = fy - (duck ? 3 : 9); y <= fy; y++) {
      if (x < 0 || y < 0 || x >= gw || y >= g.gh) continue;
      j = y * gw + x;
      if (g.m[j] === MAT.DOOR) px[j] = (x === fx - p.dir || g.aux[j] === 1) ? B_DOOR_EDGE : B_DOOR_OPEN;
    }
  }
  return lit;
}
/* why an unfinished site is not going up, in a few words, for the readout */
function bWhy(g, s) {
  if (bBusy(g, s)) return s.sow ? " (BEING SOWN)" : (s.repair ? " (BEING FIXED)" : " (GOING UP)");
  if (!bNext(g, s, null)) return " (STUCK)";
  if (s.free) return s.sow ? " (TO BE SOWN)" : " (WAITING FOR HANDS)";
  var r = bShort(g, s);
  for (var k = 0; k < g.peasants.length; k++) if (!g.peasants[k].dead && bHas(g.peasants[k], r) > 0.2) return " (NOBODY CAN GET TO IT)";
  return " (WAITING FOR " + (r === "wood" ? "WOOD" : r.toUpperCase()) + ")";
}
function bOccupied(g, s) {
  for (var k = 0; k < g.peasants.length; k++) {
    var p = g.peasants[k];
    if (!p.dead && p.state !== "space" && bInside(s, p)) return true;
  }
  return false;
}
/* what a cell is part of, for the readout under the cursor */
function bReadout(g, j) {
  var S = g.sites, x = j % g.gw, y = (j / g.gw) | 0;
  if (!S) return "";
  for (var k = 0; k < S.length; k++) {
    var s = S[k];
    if (x < s.x0 - 1 || x > s.x1 + 1 || y < s.y0 - 1 || y > s.y1 + 1) continue;
    for (var n = 0; n < s.plan.length; n++) {
      var e = s.plan[n];
      if (e.i !== j) continue;
      var what = bLabel(s).toUpperCase() + (s.done ? "" : bWhy(g, s)) + (s.note ? ": " + s.note.toUpperCase() : "");
      if (bOk(g, e)) return what;
      if (e.v === MAT.EMPTY) return (e.mine && ROCK[g.m[j]] ? "TO MINE, FOR " : "TO DIG OUT, FOR ") + what;
      return "PLANNED " + (e.v === MAT.PLANK && e.a === 1 ? "WINDOW" : MAT_NAME[e.v]) + ", FOR " + what;
    }
  }
  return "";
}
