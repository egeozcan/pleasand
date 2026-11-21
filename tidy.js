/* =====================================================================
   PLEASAND  --  tidy.js

   a village that knows landscaping (ideas.js) looks round at the rest
   of the valley and thinks: that could be somewhere else. a place for
   everything, and everything in its place:

     PUDDLES     (landscaping and the bucket) a puddle lying about the
                 village (a spilt bucket, a melted snowman, the last of
                 what came down off the roof) is bailed out, a bucket at
                 a time, and carried to where water does some good: a
                 pond that is short of it, first, then a field that is
                 thirsty. a puddle on somebody's floor, or on the bridge,
                 or at the foot of the tower, is in the way: it goes in
                 whatever real water is a short walk off, wanted or not,
                 or else out of the door and over the nearest bush. and
                 their own house they see to before most other things
     LITTER      (landscaping) sand that has come down on something they
                 built (a roof, a bridge, the stairs, the lookout on the
                 tower), and ash or salt with it, is swept off, a handful
                 at a time. ash and salt go in a pocket (they come in
                 handy: leftovers.js); sand goes in a pocket too, if the
                 village makes glass, and the rest is carried off and
                 tipped somewhere out of the way: into a hole in the
                 ground, if there is one about, which it fills in, or
                 else on a heap well away from anybody's house
     WEEDS       (landscaping) a bush grown up in somebody's doorway is
                 cut back, a snip at a time
     PILES       (landscaping) a pile of sand left lying about the
                 village, where there was level ground before (somebody
                 tipped it out of the sky, a blast threw it up, an armful
                 got dropped) is carried off the same way, a handful at a
                 time, into a hole or onto the heap, until the ground is
                 as it was. the heap is the village's: it has a stick in
                 it, so everybody knows

   bailing is the bucket job (ideas.js iTaskBucket) with a puddle to fill it
   from: k.src and k.at (where the puddle was), k.of (the site it is in the
   way of), k.size (how big it was), k.dump and k.into (where it goes when no
   pond or field wants it), k.topUp, k.ups and k.upT (filling the bucket up
   along a thin one), k.bend (bending for it), k.bad (places nobody could
   throw it at), k.t0 (when it started: the job goes by the clock).

   the ground as it was is g.tGround: the top of every column, looked at
   from the start, and kept up with every few seconds. ground
   that goes down (a hole dug, a pond) is the ground now; ground that comes
   up a cell or two (sand settling, the spoil off a mine, a hole filled
   in) is the ground now; ground that comes up a good deal at once, in a
   pile, is a pile, until it is carried off or nobody can get at it.

   a puddle is fresh water and small: a pond's worth is a pond, and left
   be (but a floor is no pond: all the water on it is bailed, however
   much there is, unless it is the lake come in at the door). salt water
   is left be too (nobody wants it in the pond). a puddle in a field, a
   pond or a mine is the field's, the pond's or the mine's own business
   (the wheat drinks it, the pond is meant to have it in, the mine bails
   its own: build.js).
   ===================================================================== */
"use strict";

var TD_PUDDLE = 16;          /* fresh water in a body this many cells or fewer is a puddle */
var TD_LAKE = 48;            /* water outside the door, this much of it, is the lake come in, and no floor of anybody's */
var TD_FLOOD = 24;           /* (and a floor with more than this on it is a flood: two buckets to it) */
var TD_PUDDLE_MIN = 3;       /* and a drop or two is left to dry: it is never still long enough to bail */
var TD_VILLAGE = 70;         /* within this many columns of a house or a field is the village */
var TD_CARRY = 80;           /* and real water further off than this is too far to carry a puddle to */
var TD_FAR = 120;            /* and a pond or a field that wants it, further than this */
var TD_STILL = 40;           /* ticks a grain has to lie still before it is litter: one on its way past is not */
var TD_LOAD = 6;             /* handfuls of litter carried off at a time */
var TD_LOAD_PILE = 10;       /* (and shovelled up off a pile: more, with both arms) */
var TD_HEAP_HOUSE = 30;      /* and the village's heap is started at least this far from anybody's house */
var TD_DIP_NEAR = 30;        /* a hole further off than this is not worth passing the heap for */
var TD_HEAP_FAILS = 3;       /* armfuls that could not be got to the heap, running, before the village starts a new one */
var TD_HEAP_HIGH = 10;       /* and once it stands this high over the ground round it, it is full: a new one */
var TD_HEAP_PAD = 8;         /* and tipped at least this far from anybody's site */
var TD_BAIL_GAP = 240;       /* ticks between the village looking for a puddle (one peasant at a time looks) */
var TD_TIDY_GAP = 300;       /* and for litter */
var TD_LOOK = 300;           /* how far off litter, or a pile, is anybody's business */
var TD_TIP_FAR = 140;        /* and the furthest they will carry an armful of it, to a hole or to the heap */
var TD_TRIPS = 4;            /* armfuls carried off a roof in one go (twice as many off a pile), then somebody else's turn */
var TD_HOME = 400;           /* ticks (and up to as many again) between anybody looking over their own house */
var TD_SWIM = 300;           /* ticks a bailer or a sweeper swims before giving it up */
var TD_POUR_ROOM = 60;       /* and room there below the floor for this much water, at least */
var TD_POUR_KEEP = 600;      /* ticks a house's place to pour its floor out at is good for, once looked for */
var TD_WEED = 8000;          /* ticks a doorway cut back is let be (bushes grow back) */
var TD_WEED_MIN = 3;         /* and bush in a doorway, this many cells of it, is a bush in the way */
var TD_LONG = 5000;          /* a bailing or sweeping job is given up after this many ticks, however it is going */
var TD_NO = 6000;            /* somewhere nobody could get to is let be this long */
var TD_LETBE = 20000;        /* and a house or a roof nobody could do anything with, twice, this long */
var TD_FORGET = 30000;       /* (a give-up longer ago than this is forgotten) */
var TD_AGAIN = 1200;         /* a roof given up on part-swept (the trips ran out) is gone back to after this long */
var TD_DUNE = 6000;          /* and one swept clean twice inside this long is a roof at the foot of a dune: TD_REST */
var TD_REST = 5000;          /* and a roof that keeps getting sand on it (a deck at the foot of a dune) is let be this
                                long once it is swept: sweeping it every minute is no life */
var TD_LUMP = 3;             /* sand stood this many cells or more over the ground as it was is a pile somebody left */
var TD_LUMP_MIN = 6;         /* and with this many handfuls in it, over the ground round it, at least */
var TD_LUMP_W = 60;          /* and no wider than this: a pile wider than that is the lie of the land now */
var TD_LITTER = new Uint8Array(NMAT); TD_LITTER[MAT.SAND] = TD_LITTER[MAT.ASH] = TD_LITTER[MAT.SALT] = 1;
/* what a roof is made of, when it is not in anybody's plan: the old huts were here before anybody planned anything, and
   are thatched (plant), walled in wood and boards, and glazed */
var TD_HUTROOF = new Uint8Array(NMAT); TD_HUTROOF[MAT.PLANT] = TD_HUTROOF[MAT.WOOD] = TD_HUTROOF[MAT.PLANK] = TD_HUTROOF[MAT.GLASS] = 1;

P_SAY.bail = ["this belongs in the pond", "waste not", "*slosh*", "every drop counts", "that's pond water, that is"];
P_SAY.bailField = ["the wheat could use this", "waste not", "*slosh*", "every drop counts", "a drink for the wheat"];
P_SAY.bailFloor = ["a puddle! not on my floor", "who left this here", "water, go home", "indoors is for dry things",
  "my socks! my SOCKS"];
P_SAY.bailThrow = ["*sploosh*", "back where you belong", "there you go", "and stay there", "in you go"];
P_SAY.bailPond = ["one more for the pond", "*sploosh*", "fill up, pond", "that's pond water, that is"];
P_SAY.bailOut = ["*slosh*", "a bucket at a time", "out you come", "not in here, you don't", "every drop"];
P_SAY.bailYard = ["*sploosh*", "out you go", "and stay out", "not in the house, water", "off with you"];
P_SAY.bailBush = ["have a drink, bush", "*sploosh*", "there you go, little bush", "somebody's thirsty", "out you go"];
P_SAY.bailDone = ["dry as a bone", "all tidy", "much better", "where it belongs", "not a drop left"];
P_SAY.tidy = ["who put sand on the roof", "*sweep sweep*", "a tidy roof is a happy roof", "sand. everywhere. why",
  "this isn't a beach", "off you go, sand"];
P_SAY.tidyFill = ["that hole's been bothering me", "filled it in", "level ground. lovely", "no more tripping in that"];
P_SAY.tidyHeap = ["on the heap with you", "*tip*", "a heap, for heaps", "it's coming on, the heap", "finest heap in the valley"];
P_SAY.tidyAway = ["out of the way", "*tip*", "that'll do there", "nobody needs that"];
P_SAY.tidyHome = ["my roof! my lovely roof", "not on MY roof", "who's been dumping sand on my house", "i just had that thatched"];
P_SAY.tidyDoor = ["can't get in for sand", "who buried the door", "dig dig. door's under here somewhere", "a door you can't open is a wall"];
P_SAY.tidyPile = ["who tipped this here", "a heap of sand. in the street", "this isn't where sand goes", "somebody's been playing",
  "sand doesn't just fall out of the sky. does it", "this goes on the heap"];
P_SAY.tidyWeed = ["a door, not a hedge", "*snip snip*", "out of my doorway, bush", "you can grow somewhere else",
  "tidy step, tidy mind", "who planted THIS here"];
P_SAY.tidyClean = ["spotless", "you could eat off that roof", "now THAT is a roof", "not a grain left"];
P_SAY.tidyLevel = ["flat as a floor", "you'd never know there was a hole", "LEVEL", "the ground's grateful"];
P_ACHIEVE.heap = ["THE HEAP", "a pile of sand, in one place, on purpose. civilisation"];
P_ACHIEVE.tidy = ["A PLACE FOR EVERYTHING", "and everything in its place. the peasants tidied up"];

function tReset(g) {
  g.tidyNo = {}; g.bailNo = {}; g.bailT = 0; g.tidyT = 0; g.bailed = 0; g.tidied = 0; g.filled = 0; g.tipped = 0; g.tip = null;
  g.tidyNewsT = g.cleanNewsT = g.levelNewsT = g.driftNewsT = g.weedNewsT = 0;   /* (when each kind of news is next worth telling) */
  g.tGround = null; g.tLumps = []; g.tSpoil = {}; g.tPiled = {}; g.tPileFail = {};   /* (the ground as it was, and the piles on it: tGroundKeep) */
}
/* somewhere they lately found they could not get to (by the four columns) */
/* (one book for puddles, one for roofs and heaps: a roof nobody can climb onto says nothing about the floor under it) */
function tNo(g, x, bail) { var b = bail ? g.bailNo : g.tidyNo; return !!(b && b[x >> 2] > g.tick); }
function tNoGo(g, x, bail) { var k = bail ? "bailNo" : "tidyNo"; if (!g[k]) g[k] = {}; g[k][x >> 2] = g.tick + TD_NO; }

/* -------------------------------------------------------------------
   WHAT TO DO ABOUT IT. called from iPick, once they know landscaping
   ------------------------------------------------------------------- */
function tPick(g, p, hungry) {
  if (hungry || p.pail) return false;
  /* (a puddle on a floor first: it is in everybody's way, and it soaks into the boards. sand on a roof can wait) */
  if (g.know.bucket && Math.random() < 0.7 && tGoBail(g, p)) return true;
  if (tGoTidy(g, p)) return true;
  return false;
}
/* their own house, though, is another matter: a puddle on their own floor, or sand on their own roof, and they see to
   it before the mine or the graves get them (called from iPick, early). now and then, not every time they look up */
function tHome(g, p) {
  var s = bHome(g, p), cells, dest, t, k;
  if (!s || !s.done || p.pail || (p.homeT || 0) > g.tick) return false;
  p.homeT = g.tick + TD_HOME + irnd(TD_HOME);
  /* (a puddle on the floor, not one somebody is already bailing, and the door open to get at it) */
  cells = g.know.bucket && !(s.bailRest > g.tick) && !tShut(g, s) ? tPuddleNear(g, { of: s.id }) : null;
  if (cells && cells.length >= TD_PUDDLE_MIN && tBailers(g, s) < tBailCrew(cells)) {
    dest = tBailDest(g, cells, s);
    if (!dest) tNowhere(g, s);
    else {
      tStartBail(g, p, cells, s, dest);
      if (p.sayT <= 0) pSay(g, p, "bailFloor", true);   /* (their own floor) */
      return true;
    }
  }
  if (s.sweptT > g.tick || !(t = tFindLitter(g, p, TD_LOOK, s))) return !tSiteTidying(g, s.id) && tGoWeed(g, p, s);
  for (k = 0; k < g.peasants.length; k++) { var o = g.peasants[k].task; if (o && o.kind === "tidy" && o.site === s.id) return false; }
  p.task = { kind: "tidy", site: t.site, x: t.x, y: t.y, t: 0, t0: g.tick, act: 0, n: 0, trips: 0, mine: true, drift: t.drift };
  return true;
}
/* every twenty ticks: a bailer (or a sweeper) who has ended up swimming (the lake was the way there, or the water to tip it in) gives
   it up after a while, rather than doing laps with a bucket; and nobody bails that puddle again for a while */
function tStep(g) {
  /* (the ground as it was is looked at from the start: a pile tipped out before they knew landscaping is still a pile,
     once they do) */
  if (!g.tGround || g.tick % TD_TIDY_GAP === 0) tGroundKeep(g);
  for (var k = 0; k < g.peasants.length; k++) {
    var p = g.peasants[k], t = p.task;
    if (!t || p.dead || !((t.kind === "bucket" && t.src) || t.kind === "tidy")) continue;
    t.swimT = p.swimming ? (t.swimT || 0) + 20 : 0;
    if (t.swimT <= TD_SWIM) continue;
    /* (and the place they were making for is let be a while, or the next one would swim the same pool) */
    /* (a bailer: it was the way to wherever the water was going, not the puddle: that is written off, and the floor is
       somebody else's to bail. unless it was the puddle they were swimming to) */
    if (t.src) {
      var ds0 = t.pond ? bSite(g, t.pond) : t.field ? bSite(g, t.field) : null;
      if (ds0) ds0.bailDestNo = g.tick + TD_NO;
      else if (t.dump && p.pail) tNoGo(g, t.dump.x, true);
      if (!p.pail && !t.n) {
        tNoGo(g, t.src.x, true); tNoGo(g, t.at.x, true);
        /* (swimming in a flooded floor: twice, and the house is let be, and the village says so) */
        var fs = t.of && bSite(g, t.of);
        if (fs && fs.kind === "house") tGaveUp(g, fs, "bail");
      }
    }
    else { tNoGo(g, t.x); if (t.heap) tNoGo(g, t.heap.x); }
    p.task = null; p.taskCD = TD_SWIM;   /* (an armful goes down once they are out, and clear of the houses: tCarry) */
  }
}
/* one tick of a bailing job, the part that is not throwing: the bucket filled out of the puddle (and topped up along a
   floor before they go), or the job finished. undefined once the bucket is full, and the bucket job (ideas.js
   iTaskBucket) throws it, as it throws any other */
function tBailStep(g, p, k) {
  /* (past its time, by the clock: a job that is swimming or stuck does not run, so counts nothing. it is finished with
     the news, as any other, with whatever was bailed counted. a bucket in hand is thrown, if it can be, first) */
  if (k.t0 != null && g.tick - k.t0 > TD_LONG * (p.pail ? 3 : 2)) { tNoGo(g, k.src.x, true); return tBailDone(g, p, k); }
  if (!p.pail || k.topUp) return tBailScoop(g, p, k);
  return undefined;
}
/* what a bailer says, throwing it */
function tBailSay(k) { return k.pond ? "bailPond" : k.field ? "bailThrow" : k.into === "the bushes" ? "bailBush" : k.into === "the yard" ? "bailYard" : "bailThrow"; }
/* no way to anywhere the bucket could be thrown from, for a while: true, and they stop trying to get closer (the next
   thing is pStuck: tBailStuck) */
function tBailLost(k) {
  if ((k.nopath = (k.nopath || 0) + 1) <= 90) return false;
  k.nopath = 0; k.since = 1e9;
  return true;
}
/* a bailer stuck with a full bucket, nowhere to throw it at tgt from (standing at column fx): somewhere else, if there is
   anywhere, true. else false, and it goes down where they are (iSpill), and nobody bails that spot again for a while,
   or they would carry it round and round */
function tBailStuck(g, k, tgt, fx) {
  /* (a puddle for a pond or a field they cannot get to throw it on: into the water they found to fall back on, then) */
  if ((k.pond || k.field) && k.dump && tgt !== k.dump) { k.pond = k.field = 0; k.last = null; k.aim = 0; k.best = null; k.since = 0; return true; }
  /* (nowhere to throw it on that bush from: another bush, or a bit of ground, out of the door) */
  if (tRetarget(g, k, tgt)) return true;
  /* (and the place nobody could throw it at is not where the next one is sent) */
  tNoGo(g, fx, true); tNoGo(g, k.src.x, true); tNoGo(g, k.at.x, true); tNoGo(g, tgt.x, true);
  return false;
}
/* one tick of one of the jobs in here, or undefined if it is not one of ours. (a puddle is bailed with the bucket: that
   is ideas.js's bucket job, with a puddle to fill it from) */
function tTask(g, p, k) {
  if (k.kind === "tidy") return tTaskTidy(g, p, k);
  return undefined;
}
function tMood(g, p) {
  var k = p.task, s;
  if (!k) return "";
  if (k.kind === "bucket" && k.src) {
    var to = tInto(g, k);
    s = k.of && bSite(g, k.of);
    return p.pail ? "is carrying a puddle to " + to : "is bailing out a puddle" + (s ? " from " + bLabel(s) : "") + ". it's going in " + to;
  }
  if (k.kind === "tidy") {
    s = bSite(g, k.site);
    var n = (p.sweep || []).length;
    var what = n && p.sweep[0].m === MAT.ASH ? "ash" : n && p.sweep[0].m === MAT.SALT ? "salt" : "sand";
    if (k.tipping) return "is carrying " + n + " handful" + (n === 1 ? "" : "s") + " of " + what + " off" + (k.heap && k.heap.dip ? ", to fill in a hole" : k.heap && k.heap.tip ? ", to the heap" : ", out of the way");
    if (k.lump) return "is shovelling away " + tLumpLabel(g, k.lump);
    if (k.weed) return "is cutting back the bush in the doorway of " + (s ? bLabel(s) : "the house");
    if (k.drift) return "is digging the sand away from the door of " + (s ? bLabel(s) : "the house");
    return "is sweeping the sand off " + (s ? bLabel(s) : "the roof");
  }
  return "";
}
/* a site whose puddles are its own business: a field drinks them, a pond is meant to have water in, a mine bails its own */
/* (a field under glass keeps its own damp: leftovers.js) */
function tOwnWater(s) { return s.kind === "heap" || s.kind === "farm" || s.kind === "pond" || s.mine || s.kind === "tunnel" || s.kind === "glasshouse" || !!s.bath; }   /* (the baths: pleasures.js) */
/* a site nobody sweeps: sand on a field is tilled, a pond's banks and the collar of a mine are sand on purpose, and a
   grave is let be. (a glasshouse's roof is a roof, and is swept) */
function tNoSweep(s) { return s.kind === "heap" || s.kind === "farm" || s.kind === "pond" || s.mine || s.kind === "tunnel" || s.kind === "grave"; }
/* is (x, y) somewhere a house or a field is near: the village, where tidiness matters */
function tVillage(g, x) {
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if ((s.kind === "house" || s.kind === "farm") && Math.abs(s.cx - x) <= TD_VILLAGE) return true;
  }
  return false;
}

/* -------------------------------------------------------------------
   PUDDLES
   ------------------------------------------------------------------- */
/* the body of fresh water (x, y) is part of: its cells (as indices), or null if it is more than a puddle. corners count
   (water sloshing at the edge of a river touches it by a corner as often as not), and so does water a cell or two off
   it: a splash on the bank of the pond is the pond's. seen, if given, gets every cell looked at, so the rest of a pond
   is not looked at again; keep, if given, says which columns it may run on into */
function tPuddleOf(g, x, y, seen, keep, max) {
  var gw = g.gw, st = [y * gw + x], out = [], got = {}, j, cx, cy, dx, dy, q;
  max = max || TD_PUDDLE;
  while (st.length) {
    j = st.pop();
    if (got[j] || g.m[j] !== MAT.WATER || (keep && !keep(j % gw))) continue;
    got[j] = 1; out.push(j);
    if (seen) seen[j] = 1;
    if (out.length > max) {   /* (a pond: and the rest of it is a pond too) */
      if (seen) while (st.length) seen[st.pop()] = 1;
      return null;
    }
    cx = j % gw; cy = (j / gw) | 0;
    for (dy = -2; dy <= 2; dy++) for (dx = -2; dx <= 2; dx++) {
      if ((!dx && !dy) || cx + dx < 0 || cx + dx >= gw || cy + dy < 0 || cy + dy >= g.gh) continue;
      q = j + dy * gw + dx;
      if (!got[q] && g.m[q] === MAT.WATER) st.push(q);
    }
  }
  return out.length ? out : null;
}
/* how big the body of water (x, y) is part of is, counted up to max (keep, if given: which columns it may run on into) */
function tBodySize(g, x, y, keep, max) {
  var gw = g.gw, st = [y * gw + x], got = {}, n = 0, j, dx, dy, q;
  while (st.length && n < max) {
    j = st.pop();
    if (got[j] || g.m[j] !== MAT.WATER || (keep && !keep(j % gw))) continue;
    got[j] = 1; n++;
    for (dy = -1; dy <= 1; dy++) for (dx = -1; dx <= 1; dx++) { q = j + dy * gw + dx; if ((dx || dy) && q >= 0 && q < g.m.length && !got[q]) st.push(q); }
  }
  return n;
}
/* the house whose inside (x, y) is in, if any (water on its roof is a puddle like any other, in the house's way) */
function tHouseAt(g, x, y) {
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (s.kind === "house" && s.done && x > s.x0 && x < s.x1 && y >= tInsideTop(g, s) && y <= s.y1) return s;
  }
  return null;
}
/* the highest row of house s that is its inside, not its roof: as high up as its doors go */
function tInsideTop(g, s) {
  var ds = tDoors(g, s), top = s.y0;
  for (var k = 0; k < ds.length; k++) top = k ? Math.min(top, ds[k].top) : ds[k].top;
  return top;
}
/* the water on the floor of house s, all of it, however much (a bucket of it or a brush's worth: a floor is no pond,
   however deep it is), but not the columns they have lately found they cannot get at. null if there is none, or if it
   is the lake come in at the door (a lake's worth of water outside the doorway, TD_LAKE: a pool that ran out of the
   door and lies on the step is no lake, and the floor is bailed all the same), which no bucket will empty */
function tHousePuddle(g, s, raw) {
  var out = [], x, y, j, k, ox, top = tInsideTop(g, s);
  /* (the floor, as high up as the doors go: not the roof, which is the roof's business. raw: every column, the ones
     they could not get at as well, for whether it is really dry) */
  /* (outside means outside: a puddle's search would step over the door into the floor's own water, and call that a lake) */
  var outside = function (cx) { return cx < s.x0 || cx > s.x1; };
  for (y = top; y <= s.y1; y++) for (x = s.x0 + 1; x <= s.x1 - 1; x++) {
    j = y * g.gw + x;
    if (g.m[j] !== MAT.WATER || (!raw && tNo(g, x, true))) continue;
    out.push(j);
    if (x === s.x0 + 1 || x === s.x1 - 1) for (k = 1; k <= 3; k++) {
      ox = x === s.x0 + 1 ? s.x0 + 1 - k : s.x1 - 1 + k;
      if (pCell(g, ox, y) === MAT.WATER && tBodySize(g, ox, y, outside, TD_LAKE) >= TD_LAKE) return null;
    }
  }
  return out.length ? out : null;
}
/* the puddle a bailing job is after, as it is now: it runs about, gets smaller, and a thin one on a floor breaks up and
   sloshes from wall to wall. so: the water on the floor of the house it is in (k.of), or every bit of puddle (not pond)
   on the deck or the stair it is in the way of, or else within a few cells of where it was last seen (k.src, k.at).
   not the columns they have lately found they cannot get at. its cells, or null once there is none */
function tPuddleNear(g, k) {
  var s = k.of && bSite(g, k.of), x0, x1, y0, y1, x, y, j, c, seen = {}, out = [];
  if (s && s.kind === "house") return tHousePuddle(g, s);
  if (s) { x0 = s.x0; x1 = s.x1; y0 = s.y0; y1 = s.y1; }
  else { x0 = Math.min(k.src.x, k.at.x) - 6; x1 = Math.max(k.src.x, k.at.x) + 6; y0 = Math.min(k.src.y, k.at.y) - 6; y1 = Math.max(k.src.y, k.at.y) + 6; }
  x0 = Math.max(0, x0); x1 = Math.min(g.gw - 1, x1); y0 = Math.max(0, y0); y1 = Math.min(g.gh - 1, y1);
  for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) {
    j = y * g.gw + x;
    if (g.m[j] !== MAT.WATER || seen[j] || tNo(g, x, true)) continue;
    c = tPuddleOf(g, x, y, seen, null, (k.size || 0) > TD_PUDDLE ? TD_LAKE : TD_PUDDLE);
    /* (only the bits of it inside: a puddle on the floor that runs out under the door is half outside, and that half
       is nobody's floor) */
    /* (a puddle a job is already at is its puddle, sloshing over the edge of a field's ground or not) */
    if (c) for (var q = 0; q < c.length; q++) { var qx = c[q] % g.gw, qy = (c[q] / g.gw) | 0; if (qx >= x0 && qx <= x1 && qy >= y0 && qy <= y1) out.push(c[q]); }
  }
  return out.length ? out : null;
}
/* the bit of it nearest (x, y), on the top of the water: the cell to go to */
function tTop(g, cells, x, y) {
  var best = null, bd = 1e9, k, cx, cy, d;
  for (k = 0; k < cells.length; k++) {
    cx = cells[k] % g.gw; cy = (cells[k] / g.gw) | 0;
    if (!AIRY[pCell(g, cx, cy - 1)]) continue;
    d = Math.abs(cx - x) + Math.abs(cy - (y == null ? cy : y)) * 2;
    if (d < bd) { bd = d; best = { x: cx, y: cy }; }
  }
  return best || { x: cells[0] % g.gw, y: (cells[0] / g.gw) | 0 };
}
/* the site, not one with water of its own, whose box (or a cell round it) one of these cells is in: the puddle is in its way */
function tInTheWay(g, cells) {
  for (var k = 0; k < cells.length; k++) {
    var x = cells[k] % g.gw, y = (cells[k] / g.gw) | 0;
    for (var q = 0; q < g.sites.length; q++) {
      var s = g.sites[q];
      if (!tOwnWater(s) && x >= s.x0 - 1 && x <= s.x1 + 1 && y >= s.y0 - 1 && y <= s.y1 + 1) return s;
    }
  }
  return null;
}
/* is any of these cells in (or by) a site whose puddles are its own business */
function tOwned(g, cells) {
  for (var k = 0; k < cells.length; k++) {
    var x = cells[k] % g.gw, y = (cells[k] / g.gw) | 0;
    if (mCryptAt(g, x, y)) return true;   /* (water in the crypt: the cathedral bails its own, up the ladder. monuments.js) */
    for (var q = 0; q < g.sites.length; q++) {
      var s = g.sites[q];
      if (tOwnWater(s) && x >= s.x0 - 2 && x <= s.x1 + 2 && y >= s.y0 - 3 && y <= s.y1 + 2) return true;
    }
  }
  return false;
}
/* how many are bailing the floor of house s (a job gone on far too long holds nothing up), and how many a floor with
   cells of water on it is worth: one bucket to a puddle, two to a flood */
function tBailers(g, s) {
  for (var k = 0, n = 0; k < g.peasants.length; k++) { var t = g.peasants[k].task; if (t && t.kind === "bucket" && t.src && t.of === s.id && !(t.t0 != null && g.tick - t.t0 > TD_LONG)) n++; }
  return n;
}
function tBailCrew(cells) { return cells.length > TD_FLOOD ? 2 : 1; }
/* somebody already at it: the puddles in house of, or a puddle near x, y. one bucket to a puddle */
function tBailing(g, x, y, of) {
  for (var k = 0; k < g.peasants.length; k++) {
    var t = g.peasants[k].task;
    if (!t || t.kind !== "bucket" || !t.src) continue;
    if (t.t0 != null && g.tick - t.t0 > TD_LONG) continue;   /* (a job gone on far too long, somebody swimming the lake, say, holds nothing up) */
    if ((of && t.of === of.id) || (Math.abs(t.src.x - x) < 12 && Math.abs(t.src.y - y) < 10) || (Math.abs(t.at.x - x) < 12 && Math.abs(t.at.y - y) < 10)) return true;
  }
  return false;
}
/* where a puddle is to go: a pond short of water, a field that is thirsty, and otherwise (if it is in somebody's way)
   back in the nearest real water. {pond | field, dump, into} or null. there has to be real water to tip it in, whatever
   it is for: the pond fills up, or the wheat has drunk enough, before the puddle is gone, and a bucket with nowhere to
   go is poured out where they stand, which is how a puddle gets carried round and round a house for ever */
function tBailDest(g, cells, of) {
  var top = tTop(g, cells, cells[0] % g.gw), x0 = 1e9, x1 = -1e9, k, s, best = null, bd = 1e9, d;
  for (k = 0; k < cells.length; k++) { x0 = Math.min(x0, cells[k] % g.gw); x1 = Math.max(x1, cells[k] % g.gw); }
  /* (not back into itself) */
  /* (not miles: a puddle is not worth carrying across the valley, to water or to a pond or a field. one on a floor that
     has nothing near goes out of the door instead) */
  var dump = iFindWater(g, { x: top.x, y: top.y - 1 }, TD_CARRY, null, true, [{ x0: x0 - 3, x1: x1 + 3 }], true);
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    d = Math.abs(s.cx - top.x);
    if (s.kind === "pond" && d <= TD_FAR && d < bd && !(s.bailDestNo > g.tick) && iPondThirst(g, s)) { bd = d; best = { pond: s.id }; }
  }
  if (!best) for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    d = Math.abs(s.cx - top.x);
    if (s.kind === "farm" && s.done && d <= TD_FAR && d < bd && !(s.bailDestNo > g.tick) && !iCrew(g, "bucket", s.id) && iThirsty(g, s)) { bd = d; best = { field: s.id }; }
  }
  /* (a pond still being filled is somewhere to tip it however full it gets: a bucket over the top of a full pond only
     wets the bank) */
  var pd = best && best.pond && bSite(g, best.pond);
  /* (and real water: not another puddle, pool-shaped as it may be, which would only be bailed out in its turn. and not
     water higher up the slope than the puddle, close by, that it would only overflow back down into) */
  if (dump && tPuddleOf(g, dump.x, dump.y + 1)) dump = null;
  if (dump && dump.y + 1 < top.y && Math.abs(dump.x - top.x) < 24) dump = null;
  /* (nor the pool on the doorstep of the house it came out of: that is where it runs back in from) */
  if (dump && of && of.kind === "house" && dump.x >= of.x0 - 6 && dump.x <= of.x1 + 6) dump = null;
  if (!dump && pd) dump = { x: pd.px0 + (I_POND_W >> 1), y: pd.L - 1 };
  /* (a pond or a field that wants it, but much further off than water it could just as well go in: the water, then) */
  var bx = best && (best.pond ? bSite(g, best.pond) : best.field ? bSite(g, best.field) : null);
  if (bx && dump && Math.abs(bx.cx - top.x) > Math.abs(dump.x - top.x) + 30) best = null;
  var into = dump && bSiteAround(g, dump.x, dump.y + 1, "pond", 1) ? "the pond" : "the water";
  if (dump) dump = { x: dump.x, y: dump.y + 1 };
  /* (on somebody's floor, and no water near enough to tip it in: out of the door with it, over the nearest bush, which
     can do with a drink. or, with no bush about, on the ground well away from the houses, where it is in nobody's way) */
  if (!dump && of && (dump = tOutside(g, of))) into = dump.bush ? "the bushes" : "the yard";
  /* (a puddle in nobody's way, and nobody who wants it: it is let be. one in the way goes wherever there is) */
  if (!dump || (!best && !of)) return null;
  best = best || {};
  best.dump = dump;
  best.into = into;
  return best;
}
/* somewhere outside site s to pour a puddle out of it: the top of the nearest bush (or flower, or sapling) with the sky
   over it, nobody's, not in or by anybody's site; or else open ground well away from all of them. {x, y, bush} or null */
function tOutside(g, s, bad) {
  /* (worked out once in a while, not every time anybody looks: it is a long look) */
  var key = (bad || []).join(",");
  if (s.pourC && s.pourC.key === key && g.tick - s.pourC.t < TD_POUR_KEEP) return s.pourC.at;
  var d, sd, x, y, c, G, sc, fy = Math.floor(s.y1), floor = tFloor(g, s), cand = [], bushes = 0;
  /* (no higher than the floor, and not right at the door: water runs downhill, and in at the door if that is downhill.
     unless there is a rise in the ground between there and the house that it would have to run back up over. the water
     poured out there last time, lying in a pool, is somewhere to pour the next lot too, while it is lower) */
  var rise = {}, r, q, Gq;
  for (sd = -1; sd <= 1; sd += 2) for (r = 1e9, d = 1; d <= 60; d++) {
    q = Math.floor(sd < 0 ? s.x0 - d : s.x1 + d);
    rise[q] = r;
    if ((Gq = tPourAt(g, q, fy)) >= 0 && !LIQUID[pCell(g, q, Gq)]) r = Math.min(r, Gq);
  }
  function low(x) {
    var G = tPourAt(g, x, fy);
    return G >= 0 && (G >= floor + (LIQUID[pCell(g, x, G)] ? 1 : 0) || rise[x] < G - 2) ? G : -1;
  }
  for (d = 8; d <= 60; d++) for (sd = -1; sd <= 1; sd += 2) {
    x = Math.floor(sd < 0 ? s.x0 - d : s.x1 + d);
    if (x < 6 || x > g.gw - 7 || tBad(bad, x) || tNo(g, x, true) || (G = low(x)) < 0) continue;
    /* (the lowest ground about, not just the nearest: a dip just out of the door fills up to the door, and in it comes.
       a bit further to carry it is worth it for a good drop) */
    sc = (G - floor) * 3 - d * 0.25;
    /* (a bush close by, and it gets a drink: further off than that, the ground out of the door will do) */
    if (d <= 20 && bushes < 3) for (y = Math.max(1, fy - 30); y < Math.min(g.gh - 1, fy + 12); y++) {
      c = pCell(g, x, y);
      if (AIRY[c]) continue;
      if ((c === MAT.PLANT || c === MAT.FLOWER || c === MAT.SAPLING) && !bMarked(g, x, y) && !bSiteAround(g, x, y, null, 3)) { cand.push({ x: x, y: y, bush: true, r: 0, sc: -d }); bushes++; }
      break;
    }
    /* (well away from everybody's site; or, a house in among the others, just outside them all; and failing that, any
       bit of ground lower than the floor that is not right up against somebody's site, nor hot: not into the furnace,
       say, or the mouth of the mine) */
    var rank = tPourOk(g, x, G, 6) ? 1 : tPourOk(g, x, G, 2) ? 2 : G > floor && tPourOk(g, x, G, 1) ? 3 : -1;
    /* (and room there for a floor's worth of water, below the floor, or below the rise in between: a little hollow by
       the door fills up, and the pool is on the doorstep, in the way of the next one in) */
    if (rank > 0 && tPourRoom(g, x, G - 1, Math.min(floor, rise[x]), TD_POUR_ROOM) >= TD_POUR_ROOM) cand.push({ x: x, y: G - 1, bush: false, r: rank, sc: sc });
  }
  cand.sort(function (a, b) { return a.r - b.r || b.sc - a.sc; });
  /* (and somewhere they can get to, to throw it from: a bucket goes no more than a few cells down, and not through the
     hill. the first few that look best, looked at properly) */
  var at = null;
  for (var k = 0, n = 0; k < cand.length && !at && n < 5; k++) {
    if (k && cand[k].r === cand[k - 1].r && Math.abs(cand[k].x - cand[k - 1].x) < 4) continue;   /* (the next column over: same again) */
    n++;
    if (tThrowable(g, s, cand[k])) at = { x: cand[k].x, y: cand[k].y, bush: cand[k].bush };
  }
  s.pourC = { key: key, t: g.tick, at: at };
  return at;
}
/* how much water would lie about (x, y) and stay below row lim (the floor, or the top of a rise): the air and water
   that way down from it, counted up to max */
function tPourRoom(g, x, y, lim, max) {
  var st = [y * g.gw + x], seen = {}, n = 0, j, cx, cy, c;
  while (st.length && n < max) {
    j = st.pop();
    if (seen[j]) continue;
    seen[j] = 1;
    cx = j % g.gw; cy = (j / g.gw) | 0;
    c = g.m[j];
    if (cy <= lim || cx < 1 || cx >= g.gw - 1 || cy >= g.gh - 1 || !(AIRY[c] || LIQUID[c] || P_LEAF[c])) continue;
    n++;
    st.push(j - 1, j + 1, j + g.gw, j - g.gw);
  }
  return n;
}
/* could somebody walk from the floor of house s to somewhere they could throw a bucket at t from */
function tThrowable(g, s, t) {
  var fy = tFloor(g, s) - 1, x, o, sx = -1;
  /* (from somewhere on the floor, the middle first: 0, -1, +1, -2 ...) */
  for (o = 0; o < 24 && sx < 0; o++) { x = Math.floor(s.cx) + (o & 1 ? -((o + 1) >> 1) : o >> 1); if (x > s.x0 && x < s.x1 && navStand(g, x, fy) === 1) sx = x; }
  if (sx < 0) return true;   /* (nowhere to stand on that floor just now, to look from: it will have to do) */
  return !!navFind(g, sx, fy, function (X, Y) { return navStand(g, X, Y) === 1 && iThrowFrom(g, X, Y, t) && iClearArc(g, X, Y, t, true); }, t.x, t.y);
}
/* the row of the first thing a bucket thrown down column x (about row fy) lands on: the ground, or water lying on it
   (not anything hot, and not anything anybody built). -1 if nothing like that */
function tPourAt(g, x, fy) {
  for (var y = Math.max(1, fy - 23); y <= fy + 14 && y < g.gh; y++) {
    var c = pCell(g, x, y);
    if (AIRY[c] || P_LEAF[c]) continue;
    return HOT[c] || bMarked(g, x, y) || (!LIQUID[c] && !pBody(g, x, y)) ? -1 : y;
  }
  return -1;
}
/* somewhere to pour water out at, at (x, G): nobody's site within pad, the sky over it, nothing hot or built about it
   (wet is no matter: that is what water is) */
function tPourOk(g, x, G, pad) {
  if (!AIRY[pCell(g, x, G - 1)] || bSiteAround(g, x, G, null, pad)) return false;
  for (var y = G - 3; y <= G + 1; y++) for (var xx = x - 2; xx <= x + 2; xx++) {
    var c = pCell(g, xx, y);
    if (HOT[c] || bMarked(g, xx, y) || c === MAT.DRAIN) return false;
  }
  return true;
}
/* the row of house s's floor: the row under the foot of its doors (or the bottom of its box) */
function tFloor(g, s) {
  var ds = tDoors(g, s), f = -1;
  for (var k = 0; k < ds.length; k++) f = Math.max(f, ds[k].bot + 1);
  return f >= 0 ? f : Math.floor(s.y1);
}
/* water on a floor with nowhere at all to put it (uphill all round, and no water near): the village says so, and the
   floor is let be a while */
function tNowhere(g, s) {
  if (!s || s.kind !== "house") return;
  /* (a while: it may only be the flood sloshing about, or a pool outside that has not run off yet. the news, once) */
  s.bailRest = g.tick + TD_NO;
  if (g.tick - (s.nowhereT || -1e9) > TD_LETBE) feed(g, "nowhere to put the water on the floor of " + bLabel(s) + ". it is all uphill from there", "#c8d0dc", "bail" + s.id);
  s.nowhereT = g.tick;
}
/* is column x within a few of any in bad (places they could not throw at from anywhere) */
function tBad(bad, x) { for (var k = 0; bad && k < bad.length; k++) if (Math.abs(bad[k] - x) < 6) return true; return false; }
/* a bailer stuck with a full bucket, nowhere to throw it at tgt from: somewhere else outside the house it came out of
   (or out of the way of whatever it was in), a couple of times, before it goes down where they stand. true if so */
function tRetarget(g, k, tgt) {
  var s = k.of && bSite(g, k.of), o;
  (k.bad = k.bad || []).push(tgt.x);
  tNoGo(g, tgt.x, true);   /* (and nobody else is sent there with a bucket a while, either) */
  if (!s || k.bad.length > 3 || !(o = tOutside(g, s, k.bad))) return false;
  k.dump = o; k.into = o.bush ? "the bushes" : "the yard"; k.pond = k.field = 0;
  k.last = null; k.aim = 0; k.best = null; k.since = 0;
  return true;
}
/* where the bucket is going, in words */
function tInto(g, k) { return k.pond ? "the pond" : k.field ? "the wheat" : (k.into || "the water"); }
/* the job pointed somewhere else: the puddle, as it is, sent where it is wanted now. (pond and field are the bucket job's
   own: a bailer counts in the crew of the pond or the field it is carrying to, iCrew, so nobody piles on) */
function tAim(k, d) {
  k.pond = d.pond; k.field = d.field; k.dump = d.dump; k.into = d.into;
}
/* a puddle in the village that would be better off somewhere else, and off with a bucket to move it */
function tGoBail(g, p) {
  if (g.tick < (g.bailT || 0)) return false;
  g.bailT = g.tick + TD_BAIL_GAP;
  /* (the whole village, top to bottom, looked over once in a while: not just what is in front of them. a puddle on the
     floor of the house below is still a puddle) */
  var seen = {}, seenH = {}, cand = [], gw = g.gw, x, y, j, c, k;
  for (x = 1; x < gw - 1; x++) {
    if (tNo(g, x, true) || pAvoid(g, p, x) || !tVillage(g, x)) continue;
    for (y = 1; y < g.gh; y++) {
      j = y * gw + x;
      if (g.m[j] !== MAT.WATER || seen[j] || !AIRY[g.m[j - gw]] || g.T[j] >= 60) continue;
      /* (on a floor: the floor's water, all of it, a puddle however much there is) */
      var hs = tHouseAt(g, x, y);
      if (hs) {
        seen[j] = 1;
        if (seenH[hs.id]) continue;
        seenH[hs.id] = 1;
        var hw = tHousePuddle(g, hs);
        if (hw) for (k = 0; k < hw.length; k++) seen[hw[k]] = 1;
        if (!hw || hw.length < TD_PUDDLE_MIN || tBailers(g, hs) >= tBailCrew(hw) || hs.bailRest > g.tick || tShut(g, hs)) continue;
        cand.push({ d: Math.abs(x - p.x) + Math.abs(y - p.y), cells: hw, of: hs });
        continue;
      }
      /* (a pool more than a puddle is a pond, and let be: unless it is lying against somebody's house, at the door,
         where water poured on the roof runs off and stands. that is in the way, pond or no pond, up to a lake) */
      c = tPuddleOf(g, x, y, seen, null, TD_LAKE);
      if (!c || tOwned(g, c)) continue;
      if (c.length > TD_PUDDLE) { var by = tInTheWay(g, c); if (!by || by.kind !== "house") continue; }
      /* (a thin one on a floor is in bits, sloshing about: it is all of it in the house that counts, once. and a drop
         or two is left to dry: it is never still long enough to get a bucket under) */
      /* (on a roof, or a deck, or a stair, in its way: that puddle, by itself. a house's floor is seen to above) */
      var of0 = tInTheWay(g, c), all = c;
      if (all.length < TD_PUDDLE_MIN || tBailing(g, x, y, of0 && of0.kind !== "house" ? of0 : null) || (of0 && of0.bailRest > g.tick)) continue;
      cand.push({ d: Math.abs(x - p.x) + Math.abs(y - p.y), cells: all, of: of0, loose: !!of0 && of0.kind === "house" });
    }
  }
  /* (the nearest that has somewhere to go: a puddle with nowhere is no reason to leave the next one be. and not the far
     side of the valley: a puddle is for whoever is about, not for somebody across the lake) */
  cand.sort(function (a, b) { return a.d - b.d; });
  var found = null, of = null, dest = null, c0 = null;
  for (k = 0; k < cand.length && k < 6 && !dest; k++) {
    /* (a flooded floor, though, is anybody's business, from wherever they are, if there is a way there on foot) */
    if (cand[k].d > TD_CARRY + 20) {
      var ft = cand[k].of && cand[k].of.kind === "house" && !cand[k].loose && cand[k].d <= TD_LOOK && tTop(g, cand[k].cells, Math.floor(p.x));
      if (!ft || !tCanGet(g, p, ft.x, ft.y, 5)) continue;
    }
    c0 = cand[k]; found = c0.cells; of = c0.of; dest = tBailDest(g, found, of);
    if (!dest && !c0.loose) tNowhere(g, of);
  }
  if (!dest) return false;
  tStartBail(g, p, found, c0.loose ? null : of, dest);
  return true;
}
/* off with a bucket to the puddle (cells, in site of's way, if any), to go where dest says */
function tStartBail(g, p, cells, of, dest) {
  var top = tTop(g, cells, Math.floor(p.x), Math.floor(p.y));
  p.task = { kind: "bucket", src: top, at: { x: top.x, y: top.y }, of: of ? of.id : 0, t: 0, t0: g.tick, act: 0, n: 0, size: cells.length };
  tAim(p.task, dest);
}
/* bucket empty, bailing: to the puddle, and a bucketful out of it. (iTaskBucket, while there is nothing in the bucket) */
function tBailScoop(g, p, k) {
  if (k.t0 != null && g.tick - k.t0 > TD_LONG) {
    if (p.pail) { k.topUp = false; return false; }   /* (what is in the bucket is thrown first, not tipped on the floor) */
    tNoGo(g, k.src.x, true); return tBailDone(g, p, k);
  }
  var cells = tPuddleNear(g, k);
  if (!cells) {
    k.topUp = false;
    if (!p.pail && !k.n) tNoGo(g, k.src.x, true);
    var hs1 = k.of && bSite(g, k.of), dry = !(hs1 && hs1.kind === "house" && tHousePuddle(g, hs1, true));   /* (really dry: every column) */
    return p.pail ? false : tBailDone(g, p, k, dry);
  }
  var fx = Math.floor(p.x), fy = Math.floor(p.y), top = tTop(g, cells, fx, fy);
  k.src = top;
  /* (bucket after bucket, and it is bigger than it was: it is coming back as fast as it goes, from wherever it is
     coming from. that is let be) */
  if (!p.pail && k.n >= 3 && cells.length > (k.size || 0) + 4) { for (var q1 = 0; q1 < cells.length; q1++) tNoGo(g, cells[q1] % g.gw, true); return tBailDone(g, p, k); }
  /* (three buckets thrown, and no less of it than there was: it is running back in from wherever it is going. somewhere
     else with the next one; or, with nowhere else, it is let be a while) */
  if (!p.pail && !k.bend && (k.hist = k.hist || [])[k.hist.length - 1] !== k.n) {
    k.hist.push(k.n); (k.size3 = k.size3 || []).push(cells.length);
    var z = k.size3, back = z.length >= 4 && z[z.length - 1] >= z[z.length - 4] - 1;
    if (back) {
      k.size3 = []; k.hist = [];
      if (!(k.dump && tRetarget(g, k, k.dump))) {
        var hs2 = k.of && bSite(g, k.of);
        if (hs2) { hs2.bailRest = g.tick + TD_NO; feed(g, "the water keeps coming back into " + bLabel(hs2) + " as fast as it is bailed. they will leave it a while", "#c8d0dc", "bail" + hs2.id); }
        tNoGo(g, top.x, true); return tBailDone(g, p, k);
      }
    }
  }
  /* (it ran off, or dried up, before they got there: and that spot is let be a while, or a puddle that is three cells
     one minute and two the next would have them back and forth to it all day) */
  if (cells.length < Math.min(TD_PUDDLE_MIN, k.size || 0) && !k.n) { for (var q0 = 0; q0 < cells.length; q0++) tNoGo(g, cells[q0] % g.gw, true); return tBailDone(g, p, k); }
  /* (nowhere for it now: the pond filled, the wheat drank its fill. somewhere else, or it stays where it is) */
  if (!tBailTarget(g, k)) {
    var d = tBailDest(g, cells, k.of && bSite(g, k.of));
    if (!d) { if (p.pail) { k.topUp = false; return false; } return tBailDone(g, p, k); }
    tAim(k, d);
  }
  /* any of it in reach of a bucket from where they stand, they bend for it (and it can run about under the bucket a
     bit: a thin puddle on a floor does) */
  /* (and a puddle on a floor is bailed from in the house, not through the wall from outside it) */
  var hs = k.of && bSite(g, k.of), indoor = hs && hs.kind === "house";
  var inReach = function (x, y) {
    /* (or from the doorway, or the step just outside it: a floor flooded too deep to stand in is bailed from the door) */
    if (indoor && (x <= hs.x0 || x >= hs.x1 || y < hs.y0 || y > hs.y1) && !tAtDoor(g, hs, x, y)) return false;
    for (var q = 0; q < cells.length; q++) { var cx = cells[q] % g.gw, cy = (cells[q] / g.gw) | 0; if (Math.abs(cx - x) <= 5 && cy >= y - 4 && cy <= y + 6) return true; }
    return false;
  };
  if (inReach(fx, fy) && !p.swimming && !p.climb && navStand(g, fx, fy) === 1 && iSafe(g, fx, fy)) {
    p.pose = (k.bend >> 3) & 1 ? "eatB" : "stand"; p.dir = top.x + 0.5 < p.x ? -1 : 1;
    if ((k.bend = (k.bend || 0) + 1) >= 10) {
      var got = tScoopCells(g, cells, fx, fy, I_LOAD - (p.pail ? p.pail.length : 0));
      k.bend = 0; k.best = null;
      if (got) {
        if (!p.pail) { k.n++; if (k.n === 1 && p.sayT <= 0 && Math.random() < 0.6) pSay(g, p, k.of && p.home === k.of ? "bailFloor" : k.pond ? "bail" : k.field ? "bailField" : "bailOut"); }
        p.pail = (p.pail || []).concat(got);
      }
      /* (a thin one on a floor is a cell here and a cell there: they go along it filling the bucket before they go,
         a few steps at most, not off with a drop in the bottom of it) */
      k.topUp = !!p.pail && p.pail.length < I_LOAD && cells.length > (got ? got.length : 0) && (k.ups = (k.ups || 0) + 1) <= 4;
      if (!k.topUp) k.ups = 0;
    }
    return true;
  }
  k.bend = 0;
  if (k.topUp && p.pail && (k.upT = (k.upT || 0) + 1) > 150) { k.topUp = false; k.upT = 0; return false; }
  if (iWalk(g, p, k, "bail" + (k.of || ""), top.x, top.y, function (x, y) { return navStand(g, x, y) === 1 && inReach(x, y) && iSafe(g, x, y); })) {
    if (k.topUp && p.pail) { k.topUp = false; k.since = 0; k.best = null; return false; }   /* (that will do: off with what they have) */
    /* (nobody could get at it: none of it is bailed again for a good while, or the next one in would try the same) */
    /* (a door drifted shut is why, as often as not: that is dug out first, and the floor is bailed after) */
    var hs0 = k.of && bSite(g, k.of);
    /* (stuck a long way off, on the way: that is the way, not the puddle. somebody else, from somewhere else) */
    if (Math.abs(p.x - top.x) > 20) { pGiveUp(g, p, Math.floor(p.x)); return false; }
    if (tShut(g, hs0, true)) hs0.sweptT = 0;
    /* (a floor: only the bit they were making for. the rest of it may be easy to get at, and a flood is no reason to be
       let be: a couple of those, though, and the house is: tGaveUp) */
    else {
      if (hs0 && hs0.kind === "house") tNoGo(g, top.x, true);
      else for (var q = 0; q < cells.length; q++) tNoGo(g, cells[q] % g.gw, true);
      tGaveUp(g, hs0, "bail");
    }
    pGiveUp(g, p, top.x);
  }
  return false;
}
/* is (x, y) standing in a doorway of house s, or on the step just outside it */
function tAtDoor(g, s, x, y) {
  var ds = tDoors(g, s);
  for (var k = 0; k < ds.length; k++) { var at = (x - ds[k].x) * ds[k].side; if (at >= 0 && at <= 2 && y >= ds[k].top && y <= ds[k].bot + 1) return true; }
  return false;
}
/* a bucketful out of the puddle: the cells nearest the top of it, in reach, each with its heat (as iScoop) */
function tScoopCells(g, cells, fx, fy, room) {
  var gw = g.gw, pick = [], load = [], k, j, x, y;
  for (k = 0; k < cells.length; k++) {
    j = cells[k]; x = j % gw; y = (j / gw) | 0;
    if (Math.abs(x - fx) <= 5 && y >= fy - 4 && y <= fy + 6 && g.m[j] === MAT.WATER && g.T[j] < 60) pick.push(j);
  }
  pick.sort(function (a, b) { return ((a / gw) | 0) - ((b / gw) | 0) || Math.abs(a % gw - fx) - Math.abs(b % gw - fx); });
  for (k = 0; k < pick.length && load.length < (room == null ? I_LOAD : room); k++) {
    j = pick[k];
    heatSync(g, j);
    load.push({ m: g.m[j], sh: g.sh[j], q: heatQ(g, j) });
    g.m[j] = MAT.EMPTY; g.aux[j] = 0; g.T[j] = AMBIENT; g.lat[j] = 0;
    heatAccept(g, j);
  }
  return load.length ? load : null;
}
/* bucket full, bailing: where it goes. (a pond filled up, or the wheat had enough, on the way: the nearest real water) */
function tBailTarget(g, k) {
  var s;
  if (k.pond && (s = bSite(g, k.pond)) && iPondThirst(g, s)) return iPondTarget(g, s);
  if (k.field && (s = bSite(g, k.field)) && iThirsty(g, s)) return iWaterTarget(g, k.field);
  return k.dump || null;
}
/* the puddle is gone: the news, the first time, and a word about it */
function tBailDone(g, p, k, gone) {
  if (k.n > 0) {
    g.bailed = (g.bailed || 0) + 1;
    var of = k.of && bSite(g, k.of);
    if (g.bailed === 1) feed(g, p.name + " bailed out a puddle and carried it to " + tInto(g, k) + (k.pond || k.field ? ". waste not" : k.into === "the bushes" ? ". they could do with a drink" : k.into === "the yard" ? ". out of everybody's way" : ". back where it belongs"), "#9ad0ff", "bail");
    /* (a big one out of somebody's house is news too, now and then) */
    else if (of && !gone && k.n >= 4 && g.tick > (g.tidyNewsT || 0)) { g.tidyNewsT = g.tick + 3000; feed(g, p.name + " bailed " + k.n + " buckets out of " + bLabel(of) + ". that will do for now", "#9ad0ff", "bail"); }
    else if (of && gone && k.n >= 2 && g.tick > (g.tidyNewsT || 0)) { g.tidyNewsT = g.tick + 3000; feed(g, p.name + (of.kind === "house" ? " bailed " + bLabel(of) + " dry. " : " bailed the puddle off " + bLabel(of) + ". ") + k.n + " buckets", "#9ad0ff", "bail"); }
    if (p.sayT <= 0 && Math.random() < 0.6) pSay(g, p, "bailDone");
    p.bored = Math.max(0, p.bored - 200);
    tTidyCheer(g);
  }
  return iDone(p, k.n > 0);
}
/* enough tidying, of both kinds, and the village notices */
function tTidyCheer(g) {
  if ((g.bailed || 0) + (g.tidied || 0) >= 5 && (g.bailed || 0) >= 1 && (g.tidied || 0) >= 1) achieve(g, "tidy");
}

/* -------------------------------------------------------------------
   PILES: sand where there was level ground
   ------------------------------------------------------------------- */
/* is column x (its ground at row G) somebody's, for piles: by a site (whose ground goes up and down as it is built, and
   is its own business), where a mine's spoil has gone (tSpoiled), or the village's heap itself */
function tGroundBusy(g, x, G) {
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (x >= s.x0 - 3 && x <= s.x1 + 3 && G >= s.y0 - 8 && G <= s.y1 + 4) return true;
  }
  if (g.tSpoil && g.tSpoil[x >> 2]) return true;
  return !!g.tip && Math.abs(x - g.tip.x) <= 10;
}
/* the spoil off a mine (or the ground cleared for a furnace) has gone on the ground at column x (mines.js mSpoil): that
   ground, and a few columns either side that it slides down onto, is the spoil heap's from now on, not a pile */
function tSpoiled(g, x) {
  if (!g.tSpoil) g.tSpoil = {};
  for (var q = (x - 4) >> 2; q <= (x + 4) >> 2; q++) g.tSpoil[q] = 1;
}
/* every few seconds: the ground as it is now, against the ground as it was (g.tGround), and
   the piles in the village that were not there before (g.tLumps: [{x0, x1, lev}]). a pile is a run of columns come up
   over the ground as it was, TD_LUMP or more somewhere along it, no wider than TD_LUMP_W, standing up over the ground
   either side of it (lev: the row of the lower of the two). anything else that has come up is the ground now: a pile
   on a slope that has slid level, a hollow filled flush, sand that has settled, a dune */
function tGroundKeep(g) {
  var gw = g.gw, B = g.tGround, x, G, up, q, cur = [], lumps = [];
  if (!B || B.length !== gw) { B = g.tGround = new Int16Array(gw); for (x = 0; x < gw; x++) B[x] = mGround(g, x); g.tLumps = []; return; }
  for (x = 0; x < gw; x++) {
    G = cur[x] = mGround(g, x);
    /* (water over it, or a tree, or it has gone down: that is the ground now. somebody's, or out of the village: not a
       pile, but not the ground as it was either, unless it has only come up a cell or two: a pile tipped half on the
       step of somebody's door is still a pile, the rest of it) */
    up = G >= 0 && B[x] >= 0 ? B[x] - G : 0;
    if (up <= 0) { B[x] = G; cur[x] = -2; }
    else if (tGroundBusy(g, x, G) || !tVillage(g, x)) { if (up <= 2) B[x] = G; cur[x] = -2; }
  }
  /* (the ground either side of a pile: the nearest that has not come up, looking out from it) */
  function edge(x, dir) {
    for (var q = x, Gq; Math.abs(q - x) < 20 && q > 0 && q < gw - 1; q += dir) if ((Gq = mGround(g, q)) >= 0 && B[q] >= 0 && B[q] - Gq <= 0) return Gq;
    return -1;
  }
  if (!g.tPiled) g.tPiled = {};
  for (x = 1; x < gw - 1; x++) {
    if (cur[x] < 0) continue;
    var x0 = x, top = 1e9, most = 0;
    for (; x < gw - 1 && cur[x] >= 0; x++) { top = Math.min(top, cur[x]); most = Math.max(most, B[x] - cur[x]); }
    var x1 = x - 1, a = edge(x0 - 1, -1), b = edge(x1 + 1, 1);
    var lev = a >= 0 && b >= 0 ? Math.max(a, b) : Math.max(a, b, B[x0]);
    /* (and enough of it to be worth a trip: a grain or two on a bump is a bump) */
    for (var n = 0, q0 = x0; q0 <= x1; q0++) n += Math.max(0, Math.min(B[q0], lev) - cur[q0]);
    /* (a pile once is a pile to the last handful, while there is any of it left: not a pile only while it is a big one.
       g.tPiled: the columns, by fours) */
    var was = false;
    for (q = x0 >> 2; q <= x1 >> 2; q++) if (g.tPiled[q]) was = true;
    if ((n > 0 && (was || tLumpWork(g, x0, x1))) || (most >= TD_LUMP && x1 - x0 + 1 <= TD_LUMP_W && lev - top >= 2 && n >= TD_LUMP_MIN)) {
      lumps.push({ x0: x0, x1: x1, lev: lev });
      for (q = x0 >> 2; q <= x1 >> 2; q++) g.tPiled[q] = 1;
      continue;
    }
    for (q = x0 >> 2; q <= x1 >> 2; q++) delete g.tPiled[q];
    for (q = x0; q <= x1; q++) B[q] = cur[q];
  }
  g.tLumps = lumps;
}
/* how many are shovelling up a pile in columns x0 .. x1 */
function tLumpWork(g, x0, x1) {
  for (var k = 0, n = 0; k < g.peasants.length; k++) { var o = g.peasants[k].task; if (o && o.kind === "tidy" && o.lump && o.lump.x0 <= x1 && o.lump.x1 >= x0) n++; }
  return n;
}
/* is (x, y) a handful of pile L to shovel off: sand (or ash, or salt), on the top, lying still, cool, nobody's, and over
   both the ground as it was in that column and the ground either side of the pile (it is dug down level, no lower) */
function tLumpCell(g, L, x, y) {
  if (!g.tGround || x < L.x0 || x > L.x1 || !TD_LITTER[pCell(g, x, y)] || bMarked(g, x, y) || !AIRY[pCell(g, x, y - 1)]) return false;
  if (g.T[y * g.gw + x] >= 60 || !tStill(g, x, y) || bSiteAround(g, x, y, null, 1)) return false;
  return y < Math.min(g.tGround[x], L.lev);
}
/* the next handful of pile L: off the top of it, the highest column first (a pile is dug down, not into from the side),
   the nearer of two the same height. {x, y} or null once it is level */
function tLumpNext(g, p, L) {
  var best = null, bd = 1e9, x, G, d, k;
  /* (the pile as it is now: shovelling at it changes its outline, and the ground either side) */
  for (k = 0; g.tLumps && k < g.tLumps.length; k++) {
    var o = g.tLumps[k];
    if (o.x0 <= L.x1 + 2 && o.x1 >= L.x0 - 2) { L.x0 = o.x0; L.x1 = o.x1; L.lev = o.lev; break; }
  }
  for (x = L.x0; x <= L.x1; x++) {
    if (tNo(g, x) || (G = mGround(g, x)) < 0 || !tLumpCell(g, L, x, G)) continue;
    d = G * 4 + Math.abs(x - p.x) * 0.5;
    if (d < bd) { bd = d; best = { x: x, y: G }; }
  }
  return best;
}
/* the nearest pile anybody could be shovelling, that nobody is: {x, y, lump} */
function tFindLump(g, p) {
  var best = null, bd = 1e9, k, L, t, d;
  for (k = 0; g.tLumps && k < g.tLumps.length; k++) {
    L = g.tLumps[k];
    if (Math.abs((L.x0 + L.x1) / 2 - p.x) > TD_LOOK || pAvoid(g, p, (L.x0 + L.x1) >> 1)) continue;
    /* (one to a pile, two to a big one) */
    if (tLumpWork(g, L.x0, L.x1) >= (L.x1 - L.x0 >= 12 ? 2 : 1) || !(t = tLumpNext(g, p, { x0: L.x0, x1: L.x1, lev: L.lev }))) continue;
    d = Math.abs(t.x - p.x) + Math.abs(t.y - p.y);
    if (d < bd) { bd = d; best = { x: t.x, y: t.y, lump: { x0: L.x0, x1: L.x1, lev: L.lev } }; }
  }
  return best;
}
/* is any of pile L (or a pile next to it) still a pile, as the village last looked */
function tLumpLeft(g, L) {
  for (var k = 0; g.tLumps && k < g.tLumps.length; k++) if (g.tLumps[k].x0 <= L.x1 + 2 && g.tLumps[k].x1 >= L.x0 - 2) return true;
  return false;
}
/* nobody can get at pile L: it is the lie of the land now */
function tLumpLetBe(g, L) {
  for (var x = L.x0; g.tGround && x <= L.x1; x++) g.tGround[x] = mGround(g, x);
  for (x = L.x0 >> 2; g.tPiled && x <= L.x1 >> 2; x++) delete g.tPiled[x];
}
/* nobody could get at pile L, again: after a few of those (anybody's: the next one may know a way), it is let be, and
   the village says so. (g.tPileFail, by the four columns at the west end of it) */
function tLumpGaveUp(g, L) {
  if (!g.tPileFail) g.tPileFail = {};
  var key = L.x0 >> 2, f = g.tPileFail[key] || { n: 0, t: 0 };
  if (g.tick - f.t > TD_FORGET) f.n = 0;
  f.n++; f.t = g.tick; g.tPileFail[key] = f;
  if (f.n < 3) return;
  delete g.tPileFail[key];
  tLumpLetBe(g, L);
  feed(g, "nobody can get at " + tLumpLabel(g, L) + ". it can stay where it is", "#c8d0dc", "pile" + key);
}
/* "the pile of sand by marge's hut", or wherever it is */
function tLumpLabel(g, L) {
  var best = null, bd = TD_VILLAGE, cx = (L.x0 + L.x1) / 2;
  for (var k = 0; k < g.sites.length; k++) { var s = g.sites[k], d = Math.abs(s.cx - cx); if (s.kind === "house" && d < bd) { bd = d; best = s; } }
  return "the pile of sand " + (best ? "by " + bLabel(best) : "in the village");
}

/* -------------------------------------------------------------------
   WEEDS: a bush grown up in somebody's doorway
   ------------------------------------------------------------------- */
/* is (x, y) a weed at the door of house s: a bush (not a flower somebody left, not a sapling somebody planted), nobody's,
   in the doorway or on the step outside it, as high as the door goes */
function tWeedAt(g, s, x, y) {
  if (pCell(g, x, y) !== MAT.PLANT || bMarked(g, x, y)) return false;
  var ds = tDoors(g, s);
  for (var k = 0; k < ds.length; k++) {
    var at = (x - ds[k].x) * ds[k].side;
    if (at >= 0 && at <= 3 && y >= ds[k].top - 1 && y <= ds[k].bot) return true;
  }
  return false;
}
/* the weeds at the doors of house s: {x, y (the nearest to p), n (how many)} or null */
function tFindWeed(g, p, s) {
  var ds = tDoors(g, s), best = null, bd = 1e9, n = 0, k, a, x, y, d;
  for (k = 0; k < ds.length; k++) for (a = 0; a <= 3; a++) for (y = ds[k].top - 1; y <= ds[k].bot; y++) {
    x = ds[k].x + a * ds[k].side;
    if (tNo(g, x) || !tWeedAt(g, s, x, y)) continue;
    n++; d = Math.abs(x - p.x) + Math.abs(y - p.y);
    if (d < bd) { bd = d; best = { x: x, y: y }; }
  }
  if (best) best.n = n;
  return best;
}
/* a house near p with a bush grown up in its doorway (or house s alone): off to clear it. a doorstep gone to seed is the
   first thing anybody sees of a house. true if so */
function tGoWeed(g, p, only) {
  for (var k = 0; k < g.sites.length; k++) {
    var s = only || g.sites[k], t;
    if (s.kind === "house" && s.done && !(s.weedT > g.tick) && Math.abs(s.cx - p.x) <= TD_LOOK && !(!only && pAvoid(g, p, s.cx)) &&
        !tSiteTidying(g, s.id) && (t = tFindWeed(g, p, s)) && t.n >= TD_WEED_MIN) {
      p.task = { kind: "tidy", site: s.id, weed: true, x: t.x, y: t.y, t: 0, t0: g.tick, act: 0, n: 0, trips: 0, mine: p.home === s.id };
      return true;
    }
    if (only) break;
  }
  return false;
}
/* is somebody tidying site id already */
function tSiteTidying(g, id) {
  for (var k = 0; k < g.peasants.length; k++) { var o = g.peasants[k].task; if (o && o.kind === "tidy" && o.site === id) return true; }
  return false;
}
/* a snip at a time, until the doorway is clear: the clippings go, as greenery cleared off a plot does (build.js bDig) */
function tTaskWeed(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || !tWeedAt(g, s, k.x, k.y)) {
    var t = s && tFindWeed(g, p, s);
    if (!t) return tWeeded(g, p, k, s);
    k.x = t.x; k.y = t.y;
  }
  var go = lGo(g, p, k, "weed" + k.x + "," + k.y, k.x, k.y, 2, 12, 3);
  if (go < 0) { tNoGo(g, k.x); return tWeeded(g, p, k, s); }
  if (go === 0) return false;
  p.dir = k.x + 0.5 < p.x ? -1 : 1;
  k.act++;
  p.pose = (k.act % 12) < 6 ? "chopA" : "chopB";
  if (k.act % 12 !== 6) return true;
  var j = k.y * g.gw + k.x;
  g.aux[j] = 0; heatVacate(g, j);
  pChips(g, k.x + 0.5, k.y + 0.5, 3, [SAND_PAL[MAT.PLANT][0], SAND_PAL[MAT.PLANT][160]]);
  g.fx.thud++;
  if (++k.n === 1 && p.sayT <= 0 && (k.mine || Math.random() < 0.6)) pSay(g, p, "tidyWeed", !!k.mine);
  return true;
}
/* the doorway clear (or as clear as they could get it): let be a good while (bushes grow back, slowly), the news now
   and then, and a word */
function tWeeded(g, p, k, s) {
  if (s) s.weedT = g.tick + TD_WEED;
  if (k.n > 0) {
    g.tidied = (g.tidied || 0) + 1;
    if (s && g.tick > (g.weedNewsT || 0)) { g.weedNewsT = g.tick + TD_WEED; feed(g, p.name + " cut back the bush in the doorway of " + bLabel(s) + ". a door, not a hedge", "#a8d88a", "weed" + s.id); }
    p.bored = Math.max(0, p.bored - 200);
    tTidyCheer(g);
  }
  return iDone(p, k.n > 0);
}

/* -------------------------------------------------------------------
   LITTER: sand (and ash, and salt) come down on something they built
   ------------------------------------------------------------------- */
/* is (x, y) litter: sand, ash or salt, on the top of a heap of it (air over it), nobody's, cool enough to handle, and
   lying on something somebody built (a roof, a deck, a stair: not a field, a pond's banks or the collar of a mine).
   the site it is lying on, or null */
function tLitterAt(g, x, y) {
  if (!TD_LITTER[pCell(g, x, y)] || bMarked(g, x, y) || !AIRY[pCell(g, x, y - 1)] || g.T[y * g.gw + x] >= 60 || !tStill(g, x, y)) return null;
  /* (salt flung on an icy deck is at work on the ice: leftovers.js) */
  if (pCell(g, x, y) === MAT.SALT && (sandHas(g, x, y, MAT.ICE) >= 0 || sandHas(g, x, y, MAT.SNOW) >= 0)) return null;
  for (var yy = y + 1; yy < y + 24 && yy < g.gh; yy++) {   /* (a roof buried deep: the top of it) */
    var c = pCell(g, x, yy), s;
    if (bMarked(g, x, yy) || (TD_HUTROOF[c] && (s = bSiteAround(g, x, yy, "house", 2)) && s.hut)) {
      s = bSiteAround(g, x, yy, null, 0) || s;   /* (the eaves of a hut overhang its box by a cell or two) */
      return s && !tNoSweep(s) ? s : null;
    }
    if (!TD_LITTER[c]) return null;
  }
  return null;
}
/* has the grain at (x, y) been lying there a while: not sliding off the eaves, not rolling past the door. a grain only
   passing through is nobody's business yet */
function tStill(g, x, y) { return g.tick - g.stamp[y * g.gw + x] > TD_STILL; }
/* the doors of house s, from its plan: [{x, top, bot, side (which way is out)}], worked out once */
function tDoors(g, s) {
  if (s.tdoors) return s.tdoors;
  var by = {}, out = [], k, e, x, y;
  for (k = 0; k < s.plan.length; k++) {
    e = s.plan[k];
    if (e.v !== MAT.DOOR) continue;
    x = e.i % g.gw; y = (e.i / g.gw) | 0;
    if (!by[x]) by[x] = { x: x, top: y, bot: y, side: x < s.cx ? -1 : 1 };
    by[x].top = Math.min(by[x].top, y); by[x].bot = Math.max(by[x].bot, y);
  }
  for (k in by) out.push(by[k]);
  return (s.tdoors = out);
}
/* is (x, y) sand (or ash, or salt) drifted up against a door of house s, on the outside, so that nobody can walk in (and
   nobody bails the floor inside): the top of the drift, nobody's, while the drift right at the door stands two or
   more cells over the floor of the doorway (a step they walk up and duck in under the lintel). it is dug down to a
   step, no lower: what is left of a dune behind it is a dune, and nobody's business */
function tDriftAt(g, s, x, y) {
  if (!s || s.kind !== "house" || !s.done || !TD_LITTER[pCell(g, x, y)] || bMarked(g, x, y) || !AIRY[pCell(g, x, y - 1)] || g.T[y * g.gw + x] >= 60 || !tStill(g, x, y)) return false;
  var ds = tDoors(g, s), k, d, o, at;
  for (k = 0; k < ds.length; k++) {
    d = ds[k]; at = (x - d.x) * d.side;
    /* (a door buried deep: the top of the heap over it, so long as it is sand all the way down to the doorway) */
    if (at < 1 || at > 3 || y > d.bot || (y < d.top - 4 && !tSandDown(g, x, y, d.top))) continue;
    if (!tBlocked(g, d)) return false;
    o = bSiteAround(g, x, y, null, 0);
    return !o || o === s;
  }
  return false;
}
/* is it sand (or ash, or salt) all the way down column x from row y to row y1 */
function tSandDown(g, x, y, y1) {
  for (; y <= y1; y++) if (!TD_LITTER[pCell(g, x, y)]) return false;
  return true;
}
/* is every door of house s drifted shut: nobody gets in until somebody digs one out (and any drifted door is reason
   enough for a bailer who could not get in not to blame the house) */
function tShut(g, s, any) {
  if (!s || s.kind !== "house") return false;
  var ds = tDoors(g, s), n = 0;
  for (var k = 0; k < ds.length; k++) if (tBlocked(g, ds[k])) n++;
  return any ? n > 0 : ds.length > 0 && n === ds.length;
}
/* is door d drifted shut: sand (or ash, or salt) heaped up right outside it, over the floor of the doorway, so high that
   whoever walks in off the top of it does not fit in under the lintel (a step or so, and they duck in: pStepUp) */
function tBlocked(g, d) {
  var x = d.x + d.side, y;
  /* (buried over the lintel: shut, whatever room there is up on the eaves) */
  if (TD_LITTER[pCell(g, x, d.top - 1)] && TD_LITTER[pCell(g, x, d.top)]) return true;
  /* (down past a lantern on its bracket by the door, which is nobody's drift) */
  for (y = d.top - 4; y <= d.bot && (AIRY[pCell(g, x, y)] || (bMarked(g, x, y) && !TD_LITTER[pCell(g, x, y)])); y++);
  if (y > d.bot || !TD_LITTER[pCell(g, x, y)]) return false;   /* (nothing heaped there over the floor, or it is not loose) */
  return !pRoom(g, d.x, y - 1);
}
/* litter on site s, at (x, y): on top of it, or drifted against its door */
function tIsLitter(g, s, x, y) { return tLitterAt(g, x, y) === s || tDriftAt(g, s, x, y); }
/* the nearest litter on any site near p (or on site s alone): {x, y, site, drift} */
function tFindLitter(g, p, R, only) {
  var best = null, bd = 1e9, k, s, x, y, d, t;
  for (k = 0; k < g.sites.length; k++) {
    s = only || g.sites[k];
    /* (a roof somebody is already on is theirs: the next one along) */
    if (Math.abs(s.cx - p.x) > R + 20 || tNoSweep(s) || (!only && tSiteTidying(g, s.id))) { if (only) break; continue; }
    /* (a roof let be is let be; the door of the house under it is another matter: tidyRest, doorRest) */
    var roof = !(s.tidyRest > g.tick) && (only || !(s.sweptT > g.tick));
    for (x = s.x0 - 2; roof && x <= s.x1 + 2; x++) {   /* (the thatch on the old huts hangs out past the walls) */
      if (tNo(g, x) || (!only && pAvoid(g, p, x))) continue;   /* (somewhere they could not get to just now: the next roof) */
      for (y = Math.max(1, s.y0 - 16); y <= s.y1; y++) {
        if (!TD_LITTER[pCell(g, x, y)] || !(t = tLitterAt(g, x, y))) continue;
        d = Math.abs(x - p.x) + Math.abs(y - p.y);
        if (d < bd && d <= R + 20) { bd = d; best = { x: x, y: y, site: t.id }; }
        break;   /* (the top of the heap in this column: the rest of it is under) */
      }
    }
    /* (and a drift against a door comes first, when it shuts the house: every door of it, or the door of their own
       house, which is the one they use. a hut with a dune against its back door and the front open is let be) */
    if (s.kind === "house" && s.done && !(s.doorRest > g.tick) && (tShut(g, s) || (p.home === s.id && tShut(g, s, true)))) {
      var ds = tDoors(g, s), q, dd, xx;
      for (q = 0; q < ds.length; q++) for (dd = 1; dd <= 3; dd++) {
        xx = ds[q].x + ds[q].side * dd;
        if (tNo(g, xx)) continue;
        for (y = Math.max(1, ds[q].top - 24); y <= ds[q].bot; y++) {
          var cc = pCell(g, xx, y);
          if (AIRY[cc] || (!TD_LITTER[cc] && !bMarked(g, xx, y) && P_PASS[cc]) || (!TD_LITTER[cc] && bMarked(g, xx, y))) continue;   /* (a lantern on its bracket, by the door) */
          if (!TD_LITTER[cc] && y < ds[q].top - 4) continue;   /* (the eaves, high over the door: a heap buried under them is looked for below) */
          if (tDriftAt(g, s, xx, y)) { d = Math.abs(xx - p.x) + Math.abs(y - p.y) - 40; if (d < bd) { bd = d; best = { x: xx, y: y, site: s.id, drift: true }; } }
          break;
        }
      }
    }
    if (only) break;
  }
  return best;
}
function tGoTidy(g, p) {
  if (g.tick < (g.tidyT || 0)) return false;
  g.tidyT = g.tick + TD_TIDY_GAP;
  /* (a roof first, or the door: those are somebody's. a pile in the street after) */
  var t = tFindLitter(g, p, TD_LOOK);
  if (t && pAvoid(g, p, t.x)) return false;
  if (!t && !(t = tFindLump(g, p))) return tGoWeed(g, p);   /* (and, nothing else, a bush in somebody's doorway) */
  /* (and somewhere to tip it, before anybody starts: a village built up all round, with nowhere at all to put sweepings,
     has them swept off the roof and put down on the next one. a door is dug out whatever: that goes over the shoulder) */
  if (!t.drift && !tTipSomewhere(g, t)) { var ts = t.site && bSite(g, t.site); if (ts) ts.sweptT = g.tick + TD_NO; else if (t.lump) tLumpLetBe(g, t.lump); return false; }
  p.task = { kind: "tidy", site: t.site || null, lump: t.lump, x: t.x, y: t.y, t: 0, t0: g.tick, act: 0, n: 0, trips: 0, drift: t.drift };
  return true;
}
/* cell j flung up and away, out (one way only: not back over the house), if the arc it would fly on is clear (as
   build.js bToss). true if so */
function tFling(g, j, out) {
  var x = j % g.gw, y = (j / g.gw) | 0, t, X, Y;
  for (t = 1; t <= 14; t++) {
    X = x + 0.5 + out * t; Y = y + 0.5 - 1.7 * t + 0.055 * t * t;
    if (X < 0 || X >= g.gw || Y < 0) break;
    if (!AIRY[pCell(g, Math.floor(X), Math.floor(Y))]) return false;
  }
  return sandFling(g, j, out * (0.9 + Math.random() * 0.2), -1.6 - Math.random() * 0.2);
}
/* what they are carrying off, in their arms (p.sweep: cells, heat and all, as a bucket holds water) */
function tHeld(p) { return p.sweep ? p.sweep.length : 0; }
/* the next handful for a sweeping job: on the same roof (within R of them), or off the same pile */
function tNext(g, p, k, R) {
  var s;
  return k.lump ? tLumpNext(g, p, k.lump) : (s = bSite(g, k.site)) ? tFindLitter(g, p, R, s) : null;
}
function tTaskTidy(g, p, k) {
  k.t++;
  if (k.t0 != null && g.tick - k.t0 > TD_LONG * (1 + (k.trips || 0))) {
    if (!k.n) tNoGo(g, k.x);   /* (a whole job and nothing swept: wherever it was is let be a while) */
    tDrop(g, p, Math.floor(p.x) + p.dir, Math.floor(p.y)); return iDone(p, k.n > 0);
  }
  if (k.weed) return tTaskWeed(g, p, k);
  if (k.tipping) return tTaskTip(g, p, k);
  var s = bSite(g, k.site);
  if (k.lump ? !tLumpCell(g, k.lump, k.x, k.y) : !s || !tIsLitter(g, s, k.x, k.y)) {
    /* gone (blown off, slid off, somebody else had it): the next bit on the same roof, or off to tip what they have */
    var t = tNext(g, p, k, k.n ? 40 : TD_LOOK);   /* (not started yet: anywhere on it. started: what is near) */
    if (t) { k.x = t.x; k.y = t.y; k.drift = t.drift; }
    else if (tHeld(p)) { k.tipping = true; return false; }
    else return tSwept(g, p, k);
  }
  var go = lGo(g, p, k, "tidy" + k.x + "," + k.y, k.x, k.y, 2, 12, 3);
  if (go < 0) {
    tNoGo(g, k.x);
    if (k.lump) tLumpGaveUp(g, k.lump); else tGaveUp(g, s, k.drift ? "door" : "tidy");
    tDrop(g, p, Math.floor(p.x) + p.dir, Math.floor(p.y)); return false;
  }
  if (go === 0) return false;
  p.dir = k.x + 0.5 < p.x ? -1 : 1;
  k.act++;
  p.pose = (k.act % 14) < 7 ? "chopA" : "chopB";   /* (a sweep) */
  if (k.act % 14 !== 7) return true;
  tSweep(g, p, k, k.x, k.y);
  if (tHeld(p) >= (k.lump ? TD_LOAD_PILE : TD_LOAD)) { k.tipping = true; return true; }
  var more = tNext(g, p, k, 40);
  if (more) { k.x = more.x; k.y = more.y; k.drift = more.drift; return true; }
  if (tHeld(p)) { k.tipping = true; return true; }
  return tSwept(g, p, k);
}
/* is there anywhere to tip what is swept up at (t.x, t.y): a hole, the heap, or open ground, as tHeapSpot looks */
function tTipSomewhere(g, t) {
  var s = t.site && bSite(g, t.site), q = { x: t.x + 0.5, y: t.y, task: null };
  return !!(tHeapSpot(g, q, t.y) || (s && tHeapSpot(g, q, Math.floor(s.y1))) || tHeapSpot(g, q, t.y, true) || (s && tHeapSpot(g, q, Math.floor(s.y1), true)));
}
/* nobody could get to s to bail it (kind "bail"), sweep it ("tidy") or dig out its door ("door"), twice running: it is
   let be a good long while (a door, a shorter while: a house nobody can get into matters), not walked to and walked
   away from every few minutes (the next try finds out if the way in has opened up) */
function tGaveUp(g, s, kind) {
  if (!s) return;
  var f = kind + "Fail";
  /* (two in a long while: a sweep that went well somewhere else on the roof says nothing about the bit nobody can get up
     to. the count is forgotten only once the last give-up is long past) */
  if (g.tick - (s[f + "T"] || 0) > TD_FORGET) s[f] = 0;
  s[f + "T"] = g.tick;
  if ((s[f] = (s[f] || 0) + 1) >= 2) {
    /* (a house shut in by the sand is gone back to sooner: somebody lives there) */
    s[f] = 0; s[kind + "Rest"] = g.tick + (kind === "door" || tShut(g, s) ? TD_NO : TD_LETBE);
    feed(g, kind === "bail" ? "nobody can get a bucket into " + bLabel(s) + ". the puddle will have to wait" :
      kind === "door" ? "nobody can get down to the door of " + bLabel(s) + " for the sand. they will have another go in a bit" :
      "nobody can get up onto " + bLabel(s) + " just now. the sand will have to wait", "#c8d0dc", kind + s.id);
  }
}
/* done with the roof: swept clean, or as many trips as anybody makes in one go. a roof that is clean is let be only if
   it keeps getting sand on it again (a deck at the foot of a dune): a fresh lot on a roof swept yesterday is swept
   today. a roof swept clean is worth a word, now and then */
function tSwept(g, p, k) {
  var s = bSite(g, k.site), clean = k.lump ? !tLumpNext(g, p, k.lump) : s && !tFindLitter(g, p, 200, s);
  if (k.lump && clean && k.n >= 4 && !tLumpLeft(g, k.lump) && g.tick > (g.cleanNewsT || 0)) { g.cleanNewsT = g.tick + 2500; feed(g, p.name + " carried off " + tLumpLabel(g, k.lump) + ". level ground again", "#d8d0c0", "pile"); }
  /* (dug out the door, trip after trip, and it is drifted shut again: a dune comes down on it, and it is let be a long
     while. the other door, or a ladder, will have to do) */
  if (s && k.drift && k.trips >= TD_TRIPS && tShut(g, s, true)) {
    s.tidyRest = g.tick + TD_LETBE;
    feed(g, "the sand keeps sliding back against " + bLabel(s) + ". it will have to wait", "#c8d0dc", "dune" + s.id);
  }
  if (s && k.n > 0) {
    if (!clean) s.sweptT = g.tick + TD_AGAIN;
    else { s.sweptT = s.cleanT && g.tick - s.cleanT < TD_DUNE ? g.tick + TD_REST : 0; s.cleanT = g.tick; }
  }
  if ((s || k.lump) && k.n >= 4 && clean && p.sayT <= 0 && Math.random() < 0.7) pSay(g, p, k.lump ? "tidyLevel" : "tidyClean", true);
  if (s && k.n >= 4 && clean) {
    if (g.tick > (g.cleanNewsT || 0)) { g.cleanNewsT = g.tick + 2500; feed(g, p.name + " swept " + bLabel(s) + " clean", "#d8d0c0", "clean"); }
  }
  return iDone(p, k.n > 0);
}
/* a handful of it off the roof: ash and salt in a pocket (if there is room), and sand too, to a village that makes glass;
   the rest in their arms, heat and all, to be tipped */
function tSweep(g, p, k, x, y) {
  var j = y * g.gw + x, c = g.m[j], r = L_AS[c];
  k.n++;
  /* (a word about it once they are at it, and not before: a grain that was gone by the time they got there is not worth
     an exclamation) */
  if (k.drift && !k.dug) {
    k.dug = true;
    var hs = bSite(g, k.site);
    if (hs && g.tick > (g.driftNewsT || 0)) { g.driftNewsT = g.tick + 4000; feed(g, p.name + " is digging out the door of " + bLabel(hs), "#d8d0c0", "drift" + hs.id); }
    if (p.sayT <= 0) pSay(g, p, "tidyDoor", true);
  }
  else if (k.n === 1 && p.sayT <= 0 && (k.mine || Math.random() < 0.5)) pSay(g, p, k.mine ? "tidyHome" : k.lump ? "tidyPile" : "tidy", !!k.mine);
  /* (a door buried: no time for armfuls. a spadeful over the shoulder, away from the house, as a hole is dug (build.js
     bDig), and what lands out there is a pile, for later) */
  var ds0 = k.drift && bSite(g, k.site);
  if (ds0 && tFling(g, j, x + 0.5 < ds0.cx ? -1 : 1)) { g.fx.thud++; if (p.sayT <= 0 && Math.random() < 0.05) pSay(g, p, "tidyDoor"); return; }
  if (r && (p[r] || 0) < L_POCKET[r]) { lTake(g, p, x, y, false); return; }
  if (c === MAT.SAND && g.know.glass && (p.sand || 0) < L_POCKET.sand) { heatVanish(g, j); p.sand = (p.sand || 0) + 1; g.fx.thud++; return; }
  heatSync(g, j);
  (p.sweep = p.sweep || []).push({ m: c, sh: g.sh[j], q: heatQ(g, j) });
  pChips(g, x + 0.5, y + 0.5, 2, [SAND_PAL[c][0], SAND_PAL[c][120]]);
  g.m[j] = MAT.EMPTY; g.aux[j] = 0; g.T[j] = AMBIENT; g.lat[j] = 0;
  heatAccept(g, j);
  g.fx.thud++;
  if (p.sayT <= 0 && Math.random() < 0.08) pSay(g, p, k.lump ? "tidyPile" : "tidy");
}
/* somewhere to tip it, near p, about row fy: a hole in the ground that wants filling in (dry, nobody's: the lowest point
   of a dip, with the ground higher by a couple of cells or more on both sides within eight columns: a crater, a pond dug
   and given up), else the village's heap (g.tip) while it is still somewhere to heap things, else a stretch of level
   ground (not a slope: a heap on a slope runs back down it), well away from anybody's site and house, and the water,
   that they can see a way to, which is the village's heap from now on (if there is none, or it is full, or a few in a
   row could not get to it; p.task.noTip: this one could not, and goes somewhere else). loose: in a village built up all round,
   anywhere off the roof, just this once. {x, y (the ground), dip, tip (the heap)} or null */
function tHeapSpot(g, p, fy, loose) {
  var flat = null, d, sd, x, G, c, k, lvl, gy = {}, pad = loose ? 5 : TD_HEAP_PAD, L = p.task && p.task.lump, tries = 0;
  /* (a new heap for the village, if this is to be it: somewhere they can get to from here, by the look of it) */
  var noTip = !!(p.task && p.task.noTip), anew = !loose && (tTipTop(g) < 0 || g.tip.fail >= TD_HEAP_FAILS);
  /* (loose: the ground from the sky down, wherever it is: a village built up all round has its ground at all heights) */
  function ground(x) { return gy[x] != null ? gy[x] : (gy[x] = loose ? mGround(g, x) : bGround(g, x, fy)); }
  for (d = 4; d <= TD_TIP_FAR; d++) for (sd = -1; sd <= 1; sd += 2) {
    x = Math.floor(p.x) + d * sd;
    if (x < 10 || x > g.gw - 11 || tNo(g, x)) continue;
    G = ground(x);
    if (G < 0 || G >= g.gh - 1 || !tHeapOk(g, x, G, pad)) continue;
    c = pCell(g, x, G);
    if (c !== MAT.SAND && c !== MAT.STONE && c !== MAT.ASH && c !== MAT.SALT) continue;
    /* (a village built up all round: anywhere off the roof will do, and that is the heap now, if there is none) */
    if (loose) {
      if (tByLump(g, x, L)) continue;   /* (not back on the pile it came off) */
      return { x: x, y: G, dip: false };   /* (just this once: the village's heap is somewhere out of the way) */
    }
    /* (a hole: the lowest column of it, and both rims a couple of cells or more up) */
    var lo = ground(x - 1), ro = ground(x + 1), lr = 1e9, rr = 1e9, ok = lo >= 0 && ro >= 0 && G >= lo && G >= ro;
    for (k = 1; k <= 8 && ok; k++) {
      var a = ground(x - k), b = ground(x + k);
      if (a < 0 || b < 0) ok = false; else { lr = Math.min(lr, a); rr = Math.min(rr, b); }
    }
    /* (a hole close by, that is: further off, things go on the heap, all in one place) */
    if (ok && G - Math.max(lr, rr) >= 2 && G - Math.max(lr, rr) <= 12 && (d <= TD_DIP_NEAR || !g.tip)) return { x: x, y: G, dip: true };
    /* (the village's heap is somewhere out of the way: not by anybody's door, and not where a pile is lying, which
       would only be heaped up the higher) */
    if (flat || tries > 8 || tByHouse(g, x, TD_HEAP_HOUSE) || tByLump(g, x, L)) continue;
    for (k = -3, lvl = true; k <= 3 && lvl; k++) { var gk = ground(x + k); if (gk < 0 || Math.abs(gk - G) > 2) lvl = false; }
    if (lvl && anew && (tries++, !tReach(g, p, x, G))) lvl = false;
    if (lvl) flat = { x: x, y: G, dip: false };
  }
  var heap = !loose && !noTip && tTipSpot(g, p);
  if (heap) return heap;
  /* (the village's heap: this, if there is none yet, or the old one is full, or nobody can get to it from here) */
  if (flat && anew) { tTipAt(g, flat.x, flat.y, p); flat.tip = true; }   /* (and this armful is the first on it) */
  return flat;
}
/* the village's heap is (x, G) now: g.tip, and its site (kind "heap": nobody builds on it, or plants a tree, or sows
   a field over it, any more than on anybody's house). moved, if there was one before, which was full */
function tTipAt(g, x, G, p) {
  var s = g.tip && bSite(g, g.tip.site), box = [x - 8, G - TD_HEAP_HIGH - 2, x + 8, G];   /* (and room about it: nobody builds right up against the heap) */
  /* (the old one grown as high as a heap goes: that is news, of a sort) */
  if (s && p && (g.tip.n || 0) >= 3 && tTipFull(g)) feed(g, "the heap is as high as a heap goes. " + p.name + " is starting another", "#d8d0c0", "heap");
  /* (nothing to build: a site with an empty plan, all box) */
  if (!s) s = bNew(g, "heap", null, [], box, { done: true });
  else { s.x0 = box[0]; s.y0 = box[1]; s.x1 = box[2]; s.y1 = box[3]; s.cx = (s.x0 + s.x1 + 1) / 2; s.cy = (s.y0 + s.y1 + 1) / 2; }
  g.tip = { x: x, y: G, site: s.id, n: 0 };   /* (n: armfuls tipped on it) */
}
/* is column x within R of a house */
function tByHouse(g, x, R) {
  for (var k = 0; k < g.sites.length; k++) { var s = g.sites[k]; if (s.kind === "house" && x >= s.x0 - R && x <= s.x1 + R) return true; }
  return false;
}
/* is column x by a pile lying about (within pad, 12 if not given), or by pile L (the one they are shovelling up): a pile
   is no place for the heap, nor for a pond */
function tByLump(g, x, L, pad) {
  pad = pad == null ? 12 : pad;
  if (L && x >= L.x0 - pad && x <= L.x1 + pad) return true;
  for (var k = 0; g.tLumps && k < g.tLumps.length; k++) if (x >= g.tLumps[k].x0 - pad && x <= g.tLumps[k].x1 + pad) return true;
  return false;
}
/* is there a way from where p stands to beside (x, G), where a heap could be tipped from */
function tReach(g, p, x, G) {
  var here = navHere(g, p);
  return !!here && !!navFind(g, here.x, here.y, function (X, Y) { return Math.abs(X - x) >= 1 && Math.abs(X - x) <= 3 && Math.abs(Y - G) <= 6 && navStand(g, X, Y) === 1; }, x, G - 1);
}
/* is there a way on foot from where p stands to within r columns of (x, y) (and a few rows): dry feet, all the way.
   (a way that swims the lake is no way to send somebody with a bucket) */
function tCanGet(g, p, x, y, r) {
  var here = navHere(g, p), path = here && navFind(g, here.x, here.y, function (X, Y) { return Math.abs(X - x) <= r && Math.abs(Y - y) <= 6 && navStand(g, X, Y) === 1; }, x, y);
  for (var k = 0; path && k < path.length; k++) if (navStand(g, path[k].x, path[k].y) !== 1) return false;
  return !!path;
}
/* the heap they have been using (g.tip), while it is not grown into a hill and is still out of everybody's way: things
   in one place. {x, y, dip, tip} or null */
function tTipSpot(g, p) {
  var t = g.tip, G;
  if (!t || Math.abs(t.x - p.x) > TD_TIP_FAR || tNo(g, t.x)) return null;
  G = tTipTop(g);
  return G >= 0 ? { x: t.x, y: G, dip: false, tip: true } : null;
}
/* has the village's heap grown as high as a heap goes */
/* (by its height over the ground it was started on: a cone of sand takes the ground beside it up with it) */
function tTipFull(g) {
  var t = g.tip, G = t ? mGround(g, t.x) : -1;
  return G >= 0 && t.y - G > TD_HEAP_HIGH;
}
/* the top of the village's heap, while it is still somewhere to heap things (not grown into a hill, not built over,
   not under water): its row, or -1 once they need a new one. (a heap a long way off from whoever has an armful, or
   that nobody can get to just now, is still the heap) */
function tTipTop(g) {
  /* (the ground from the sky down: somebody standing on the heap is not the top of it) */
  var t = g.tip, G = t ? mGround(g, t.x) : -1;
  if (G < 0) return -1;
  return !tTipFull(g) && tHeapOk(g, t.x, G, 2, true) ? G : -1;   /* (somebody's lantern going up nearby since is no reason to give the heap up) */
}
/* nothing of anybody's near it, nothing wet or hot about it */
function tHeapOk(g, x, G, pad, own) {
  /* (open to the sky: not under a bush, which bGround looks through, and which a handful of sand will not go into) */
  for (var yy = G - 8; yy < G; yy++) if (!AIRY[pCell(g, x, yy)] || P_LEAF[pCell(g, x, yy)]) return false;
  /* (own: the heap itself is somewhere to tip things, the heap being what it is for) */
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    /* (and not anywhere over the top of one, however much sand is heaped on it: a buried house is still a house.
       galleries underground are another matter) */
    if ((!own || s.kind !== "heap") && x >= s.x0 - pad && x <= s.x1 + pad && G <= s.y1 + pad && (G >= s.y0 - pad || s.kind !== "tunnel")) return false;
  }
  for (var y = G - 3; y <= G + 1; y++) for (var xx = x - 2; xx <= x + 2; xx++) {
    var c = pCell(g, xx, y);
    if (LIQUID[c] || HOT[c] || bMarked(g, xx, y) || c === MAT.DRAIN) return false;
  }
  return true;
}
function tTaskTip(g, p, k) {
  if (!tHeld(p)) return k.tipped ? tDumped(g, p, k) : tSwept(g, p, k);
  if (!k.heap) {
    /* (looked for about where they stand, and, if they are up on the roof, about where the ground is under it) */
    var s = bSite(g, k.site);
    k.heap = tHeapSpot(g, p, Math.floor(p.y)) || (s ? tHeapSpot(g, p, s.y1) : null) ||
             tHeapSpot(g, p, Math.floor(p.y), true) || (s ? tHeapSpot(g, p, s.y1, true) : null);
    if (!k.heap) { tDrop(g, p, Math.floor(p.x) + p.dir, Math.floor(p.y)); return iDone(p, false); }
    k.best = null; k.since = 0;   /* (a new walk: how close they got to the roof says nothing about how close they are to this) */
  }
  var h = k.heap, fx = Math.floor(p.x), fy = Math.floor(p.y);
  /* (from beside it, or up the side of the heap a little: a heap grown high has steep sides. an armful tossed onto it
     from a few steps off lands on it all the same) */
  var near = function (x, y) { return Math.abs(x - h.x) >= 1 && Math.abs(x - h.x) <= (h.tip ? 5 : 3) && Math.abs(y - h.y) <= (h.tip ? 12 : 6); };
  if (!near(fx, fy)) {
    /* (nobody can get there: somewhere else, and after a few of those, wherever they are) */
    if (iWalk(g, p, k, "heap" + h.x, h.x, h.y - 1, near)) {
      /* (the village's heap is not given up because one of them could not find the way to it from where they were:
         this armful goes somewhere else, and only after a few of those is there a new heap) */
      if (h.tip && g.tip) { g.tip.fail = (g.tip.fail || 0) + 1; k.noTip = true; } else tNoGo(g, h.x);
      k.heap = null; k.since = 0; k.best = null;
      if ((k.tries = (k.tries || 0) + 1) > 2) { tDrop(g, p, fx + p.dir, fy); return iDone(p, false); }
    }
    return false;
  }
  p.dir = h.x + 0.5 < p.x ? -1 : 1;
  k.act++;
  p.pose = (k.act % 10) < 5 ? "hammerA" : "hammerB";
  if (k.act % 10 !== 5) return true;
  /* a handful into the hole (or on the heap): the first air over the ground there, or either side if it is piled up */
  /* (no room for any more there: the rest goes down where they are, and only what went on the heap is a heap) */
  if (!tTip(g, p, k, h.x) && !tTip(g, p, k, h.x + p.dir)) { tDrop(g, p, fx + p.dir, fy); return k.tipped ? tDumped(g, p, k) : iDone(p, false); }
  return true;
}
/* one handful of what they carry into the air over the ground at column x: false if there is no room for it there */
function tTip(g, p, k, x) {
  var G = bGround(g, x, k.heap.y), c, j;
  if (G < 1) return false;
  j = (G - 1) * g.gw + x;
  if (!AIRY[g.m[j]] || pBody(g, x, G - 1)) return false;
  c = p.sweep.pop();
  k.tipped = (k.tipped || 0) + 1;
  var qa = heatQ(g, j);
  g.m[j] = c.m; g.aux[j] = 0; g.sh[j] = c.sh; g.vy[j] = 0;
  heatSetQ(g, j, qa + c.q);
  g.fx.thud++;
  pChips(g, x + 0.5, G - 0.5, 2, [SAND_PAL[c.m][0], SAND_PAL[c.m][120]]);
  if (g.tGround) g.tGround[x] = mGround(g, x);   /* (a hole filled in, a heap grown: that is the ground now, not a pile) */
  return true;
}
/* whatever is left in their arms, down where they are (they could not get to the heap, the job ran out, or something
   came up): into the air about them, as a spilt bucket goes (ideas.js iSpill) */
function tDrop(g, p, x, y, force) {
  if (!tHeld(p)) return;
  /* (not on somebody's roof, or floor, or bridge, or the step of their door, where it came from: it is held on to until
   they are a few steps clear of it) */
  if (!force && bSiteAround(g, Math.floor(p.x), Math.floor(p.y), null, 4)) return;
  var keep = p.pail;
  p.pail = p.sweep;
  iSpill(g, p, !!force, x, y - 1);
  p.sweep = p.pail; p.pail = keep;
}
/* an armful and no sweeping job (they got hungry, the alarm went, they died): it goes down where they are, as a full
   bucket does (iPail), once they are off anybody's roof or floor. a new sweeping job takes it along to be tipped */
function tCarry(g, p) {
  if (!tHeld(p) || (p.task && p.task.kind === "tidy" && !p.dead)) { p.sweepT = 0; return; }
  /* (and a village built up all round, nowhere clear of anybody's door: after a while, wherever they are, but on a roof) */
  p.sweepT = (p.sweepT || 0) + 1;
  var tired = p.sweepT > 600 && !bSiteAround(g, Math.floor(p.x), Math.floor(p.y), null, 2);   /* (not on the eaves either) */
  tDrop(g, p, Math.floor(p.x) + p.dir, Math.floor(p.y), p.dead || tired);
}
/* all of it tipped where it was going: the news, the first time, and a hole filled level is worth a word */
function tDumped(g, p, k) {
  var h = k.heap, level = false;
  g.tidied = (g.tidied || 0) + 1;
  if (h && h.dip) {
    g.filled = (g.filled || 0) + 1;
    var G = bGround(g, h.x, h.y), a = bGround(g, h.x - 2, h.y), b = bGround(g, h.x + 2, h.y);
    level = G >= 0 && a >= 0 && b >= 0 && G <= Math.max(a, b);
  }
  var what = k.lump ? tLumpLabel(g, k.lump) : bSite(g, k.site) ? bLabel(bSite(g, k.site)) : "the roof";
  var heaped = h && !h.dip && g.tip && Math.abs(g.tip.x - h.x) <= 2;
  if (heaped) { g.tipped = (g.tipped || 0) + 1; g.tip.fail = 0; g.tip.n = (g.tip.n || 0) + 1; }
  if (g.tidied === 1) g.cleanNewsT = g.tick + 600;   /* (one line of news at a time: not this and "swept it clean" too) */
  if (g.tidied === 1) feed(g, p.name + (k.lump ? " shovelled up " : k.drift ? " dug the sand away from the door of " : " swept the sand off ") + what + (h && h.dip ? " and filled in a hole with it" : heaped ? " and tipped it on a heap, out of the way" : " and tipped it out of the way"), "#d8d0c0", "tidy");
  else if (heaped && !g.got.heap && g.tip.n >= 3) { g.cleanNewsT = g.tick + 600; achieve(g, "heap"); feed(g, "the village has a heap now. " + p.name + " stuck a stick in it, so everybody knows. everything goes on the heap", "#d8d0c0", "heap"); }
  else if (level && g.tick > (g.levelNewsT || 0)) { g.levelNewsT = g.tick + 4000; feed(g, p.name + " filled a hole in with " + (k.lump ? what : "the sweepings off " + what) + ". level ground", "#d8d0c0", "fill"); }
  if (p.sayT <= 0 && Math.random() < 0.6) pSay(g, p, level ? "tidyLevel" : h && h.dip ? "tidyFill" : heaped ? "tidyHeap" : "tidyAway");
  p.bored = Math.max(0, p.bored - 200);
  tTidyCheer(g);
  /* and back up for the next armful, while there is any left up there (a few trips, then somebody else's turn) */
  /* (a pile is a bigger job than a roof: twice the trips) */
  var more = k.trips < (k.lump ? TD_TRIPS * 2 : TD_TRIPS) && tNext(g, p, k, 200);
  if (more) {
    k.trips++; k.tipping = false; k.heap = null; k.tipped = 0; k.tries = 0; k.t = 0; k.best = null; k.since = 0;
    k.x = more.x; k.y = more.y; k.drift = more.drift;
    return true;
  }
  return tSwept(g, p, k);
}

/* -------------------------------------------------------------------
   DRAWING
   ------------------------------------------------------------------- */
var TD_STICK = hex32("#7a5228"), TD_RAG = hex32("#d8483a"), TD_RAG_D = hex32("#a83428");
/* the village's heap, once it is one (THE HEAP): a stick stuck in the top of it, with a rag tied on, so everybody knows
   where things go. it goes up as the heap does */
function tDraw(g) {
  var t = g.tip;
  if (!t || (t.n || 0) < 3) return;   /* (three armfuls on it, and it is a heap) */
  var G = bGround(g, t.x, t.y), y, f = (g.tick >> 4) & 1;
  if (G < 4) return;
  for (y = G - 6; y < G; y++) if (!AIRY[pCell(g, t.x, y)] && !P_LEAF[pCell(g, t.x, y)]) return;   /* (buried, or under something: no stick) */
  for (y = G - 6; y < G; y++) iPut(g, t.x, y, TD_STICK);
  /* (the rag, flapping: three cells out and two down, the far end lifting and dropping) */
  iPut(g, t.x + 1, G - 6, TD_RAG); iPut(g, t.x + 1, G - 5, TD_RAG_D);
  iPut(g, t.x + 2, G - 6 + f, TD_RAG); iPut(g, t.x + 2, G - 5 + f, TD_RAG_D);
  iPut(g, t.x + 3, G - 6 + 2 * f, f ? TD_RAG_D : TD_RAG);
}
