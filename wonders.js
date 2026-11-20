/* =====================================================================
   PLEASAND  --  wonders.js

   when there is nothing much left to think of, they build something
   nobody needs and everybody wants. a great work is an idea, like any
   other (it shows in the IDEAS hover, and somebody has to have had
   something happen to them first), but it comes with its own banner,
   A WONDER, and the village only ever has the one going up at a time.
   it has a crew (a third of the village, and never fewer than two), it
   never holds up the graves, the bell or the mending, and whoever is
   carrying what it is short of, anywhere in the valley, brings it.

   this file is the part every wonder shares:
     THE GREAT WORK   the registry (W_DEFS), the one-at-a-time rule,
                      the crew, hauling, and the readout
     QUARRYING        a wonder short of stone sends one quarryman to
                      cut an old gallery's floor down a bench at a
                      time (or the floor of a cave, or any bare rock),
                      and the stone goes to its pile
     IRON             while a wonder wants iron, new tools wait for
                      iron to spare (worn ones are still done again)
     GILDING          gold in a plan is optional: a stone stand-in,
                      gilded later if gold turns up
     TALES            the last two dozen memorable things, kept for
                      the telling (a death, a trip to space, a house
                      burned down, the first of each idea)
     CONCRETE         lime, burnt at the furnace, mixed with sand and
                      a bucket of water into wet concrete, carried in
                      the pail and poured. it sets in its form
     STAINED GLASS    a pane, and a tint: ruby, green, amber
     THE KILN         the furnace makes what has been asked for (lime,
                      firebrick, stained panes), oldest order first
     FORCED DRAUGHT   a fire in a closed firebrick chamber with the
                      bellows going burns hotter
     WARM WATER       a bath: cosy, and nobody is cold in it
     THE ROD          a lightning rod takes a bolt that was going to
                      hit something of theirs, and nothing else
     GATHERINGS       the idle and the bored, come to sit and watch
   and the wonders themselves are in monuments.js (the theatre, the
   pyramid) and pleasures.js (the baths).
   ===================================================================== */
"use strict";

var W_DEFS = [];            /* every wonder there is: each module registers its own (wDef) */
var W_TOTAL = 12;           /* wonders there will be, in the end */
var W_STRIDE = 30;          /* ticks between looks at the great work */
var W_SET = 112;            /* wet concrete's clock: set at this (an eighth of a tick at a time: world.js) */
var W_POUR = 900;           /* ticks a pail of it keeps, before it goes off in the pail */
var W_PAIL = 5;             /* cells of wet concrete to a pail (a bucket of water's worth) */
var W_DRAUGHT = 1800;       /* how hot a fire burns under the bellows (heat.js) */
var W_TALES = 24;           /* tales kept, at most */
var W_BENCH = 3;            /* rows a bench cuts a floor down */
var W_BENCH_W = 16;         /* and how far along it goes */
var W_IRON_HOLD = 30;       /* iron to spare, before new tools, while a wonder wants iron */
var W_BATH_LO = 30, W_BATH_HI = 45;   /* warm water: a bath. hotter than P_SWEAT, and they get out */

P_SAY.haul = ["for the great work", "where does this go", "one more for the pile", "it's for the wonder", "heavy, this"];
P_SAY.quarry = ["*tink*", "stone for the wonder", "deeper. always deeper", "a bench, they said", "it's honest work"];
P_SAY.quarried = ["a pocketful", "stone. for the pile", "that'll do for now", "back up with it"];
P_SAY.nomortar = ["no concrete", "somebody mix some concrete", "we need wet concrete"];
P_SAY.nofirebrick = ["no firebrick", "the furnace owes us bricks", "need firebrick"];
P_SAY.nostained = ["no coloured glass", "need a red one", "where's the glass"];
P_SAY.nolime = ["no lime", "the kiln, please", "need lime"];
P_SAY.noglass = ["no glass", "need a pane first", "the glass ran out"];
P_SAY.mix = ["*slop*", "like porridge", "stir, stir", "don't let it go off", "quick, before it sets"];
P_SAY.mixed = ["a pail of concrete!", "hurry, hurry", "it's going off", "mind, it's wet"];
P_SAY.wentOff = ["it set in the pail", "oh no. it's a rock now", "i was too slow", "the concrete went off"];
P_SAY.kiln = ["lime, burning", "*pumpf* *pumpf*", "firebrick, coming up", "the kiln is hot"];
P_SAY.idea_concrete = ["the bucket hit the lime and it went WARM", "stone you can pour", "what if the rock was runny. then not",
  "lime, sand, water. stir"];
P_SAY.idea_stained = ["what if the window was red", "glass, but a colour", "the light came through it green",
  "a pane of something pretty"];
P_SAY.bathe = ["ahhh", "this is the life", "warm all the way through", "don't splash", "i'm never getting out"];
P_SAY.gossip = ["did you see {n}'s hat", "{n} talks in their sleep, you know", "{n} still owes me a log",
  "{n} thinks the ducks are watching", "don't tell {n} i said so", "{n} never washes", "{n} snores. loudly"];
P_SAY.tooHot = ["TOO HOT", "OUT OUT OUT", "i'm being boiled", "who stoked this"];
P_SAY.tale = ["remember when {t}", "do you remember when {t}", "{t}. i was there", "they still talk about when {t}"];
P_SAY.sitDown = ["ooh, a good seat", "budge up", "is this taken?", "front row!"];
P_SAY.clap = ["bravo", "BRAVO", "*clap clap clap*", "again!", "more!", "very good. very good"];
P_ACHIEVE.seven = ["SEVEN WONDERS", "seven great works standing at once. nobody needed any of them"];
P_ACHIEVE.concrete = ["CONCRETE", "stone you can pour. it goes off in the pail if you dawdle"];
P_ACHIEVE.moon = ["ONE SMALL STEP", "a peasant stood on the moon. it is mostly dust. they waved"];   /* (reserved: the rocket, heavens.js) */

/* two plain ideas the wonders need */
IDEAS.push(
  { id: "concrete", name: "concrete", title: "CONCRETE", sub: "lime, sand and water. it pours like porridge and sets like stone", hint: "a bucket spilt at the furnace",
    ready: function (g) { return !!g.know.masonry && !!g.know.smelt && !!g.know.bucket && mSites(g, "furnace", true).length > 0; } },
  { id: "stained", name: "stained glass", title: "STAINED GLASS", sub: "a pane, and a tint. ruby with gold, green with ore, amber with coal", hint: "glass, and the right rocks",
    ready: function (g) { return !!g.know.glass && (g.found.ore || 0) >= 2; } });

/* -------------------------------------------------------------------
   THE REGISTRY. each wonder is registered by its module:
     { id, idea: {name, title, sub, hint, ready(g, p)}, achieve: [title, sub], exempt (no great-work rule, no crew cap),
       plan(g, p), pick(g, p, hungry), task(g, p, k), step(g, s), draw(g, s), drawOver(g, s), finish(g, s, p),
       label(s), readout(g, s), mood(g, p, k) }
   all but id are optional. the site's kind is the id, and it carries wonder: true
   ------------------------------------------------------------------- */
function wDef(d) {
  W_DEFS.push(d);
  if (d.idea) { d.idea.id = d.id; d.idea.wonder = true; IDEAS.push(d.idea); }
  if (d.achieve) P_ACHIEVE[d.id] = d.achieve;
  return d;
}
function wOf(id) { for (var k = 0; k < W_DEFS.length; k++) if (W_DEFS[k].id === id) return W_DEFS[k]; return null; }
function wIsWonder(id) { return !!wOf(id); }
function wIdea(id) { for (var k = 0; k < IDEAS.length; k++) if (IDEAS[k].id === id) return IDEAS[k]; return null; }
function wReset(g) { g.tales = []; g.kiln = []; g.wDone = {}; g.wAny = false; g.swims = 0; }
/* the wonder sites: every one, or only those standing (done) */
function wSites(g, done) {
  var out = [];
  for (var k = 0; k < g.sites.length; k++) if (g.sites[k].wonder && (!done || g.sites[k].done)) out.push(g.sites[k]);
  return out;
}
/* the great work going up: the one wonder not yet finished that the one-at-a-time rule applies to. null if none */
function wGreat(g) {
  for (var k = 0; k < g.sites.length; k++) { var s = g.sites[k]; if (s.wonder && !s.done && !s.repair && !(wOf(s.kind) || {}).exempt) return s; }
  return null;
}
/* how many wonders stand */
function wCount(g) { var n = 0, seen = {}; for (var k = 0; k < g.sites.length; k++) { var s = g.sites[k]; if (s.wonder && s.done && !seen[s.kind]) { seen[s.kind] = 1; n++; } } return n; }
/* a crew: a third of the village, two at the least */
function wCap(g) { return Math.max(2, Math.floor(bAlive(g) / 3)); }
function wCrew(g, s, but) {
  var n = 0;
  for (var k = 0; k < g.peasants.length; k++) { var q = g.peasants[k], t = q.task; if (q !== but && !q.dead && t && t.kind === "build" && t.site === s.id) n++; }
  return n;
}
/* is site s's crew full, as far as p is concerned (they are not in it already) */
function wFull(g, s, p) {
  if (!s.wonder || (wOf(s.kind) || {}).exempt) return false;
  if (p.task && p.task.kind === "build" && p.task.site === s.id) return false;
  return wCrew(g, s, p) >= wCap(g);
}
/* can it be called finished: no wet concrete in it still going off */
function wReady(g, s) {
  for (var k = 0; k < s.plan.length; k++) if (g.m[s.plan[k].i] === MAT.MORTAR) { s.setting = true; return false; }
  s.setting = false;
  return true;
}
/* something has happened to p that puts wonder (or new idea) id into their head: only if it could be thought of now
   (an idea that is not ready yet is not in anybody's head; and iSpark hurries a thought along) */
function wSpark(g, p, id) {
  if (!p || p.dead || g.know[id]) return;
  var I = wIdea(id);
  if (I && I.ready(g, p)) iSpark(g, p, id);
}

/* -------------------------------------------------------------------
   TALES: plain data, kept the moment it happens. no dice
   ------------------------------------------------------------------- */
var W_HOW = { starve: "starved", old: "died of old age", fire: "caught fire", lava: "fell in the lava", drown: "drowned",
  acid: "dissolved", fall: "fell from very high up", splat: "was thrown too hard", nuke: "was in the nuke", drain: "went down the drain",
  buried: "was buried in sand", zap: "was struck by lightning twice", chute: "packed their own parachute",
  reentry: "came back from space too fast", freeze: "froze solid" };
function wTale(g, kind, p, also, x, y) {
  if (!g.tales) g.tales = [];
  if (kind === "idea" && g.tales.some(function (t) { return t.kind === "idea" && t.also === also; })) return;
  g.tales.push({ kind: kind, who: p ? p.short : "", also: also || "", tick: g.tick, x: x != null ? x : (p ? Math.floor(p.x) : 0),
                 y: y != null ? y : (p ? Math.floor(p.y) : 0), staged: 0, dead: kind === "death" });
  if (g.tales.length > W_TALES) g.tales.shift();
  /* (the greatest mind gone, in a valley whose king never dies: that will do for a pyramid, too) */
  if (kind === "death" && p && p.hat !== P_HATS[6] && !g.kingDied && !g.thinkerDied) {
    var th = iThinker(g);
    if (th.n >= 3 && th.name === p.short) { g.thinkerDied = p.name; g.lastKing = { name: p.name, hat: p.hat }; wSpark(g, pKing(g), "pyramid"); }
  }
}
/* what happened, in a few words: "gary went to space" */
function wTold(t) {
  var n = t.who ? pTitle(t.who) : "somebody";
  switch (t.kind) {
    case "death": return n + " " + (W_HOW[t.also] || "died");
    case "space": return n + " went to space";
    case "zap": return n + " was struck by lightning";
    case "pack": return n + " came down hard on a rocket pack";
    case "nuke": return "the nuke went off";
    case "ice": return n + " fell over on the ice";
    case "house": return (t.also || "the house") + " burned down";
    case "idea": return n + " thought of " + t.also;
    case "wonder": return "we finished " + t.also;
    case "stagefire": return "the stage caught fire";
  }
  return n + " did something";
}
/* a tale told at a campfire, once the village thinks of plays: the oldest one nobody has told lately */
function wTellTale(g, p) {
  var T = g.tales || [];
  if (!T.length) return;
  var t = T[(p.id + ((g.tick / 600) | 0)) % T.length];
  pSay(g, p, pick(P_SAY.tale).replace("{t}", wTold(t)), true);
}
/* the king is dead, and the heir is crowned: something BIG (monuments.js) */
function wCrowned(g, dead, heir) { g.kingDied = (g.kingDied || 0) + 1; g.lastKing = { name: dead.name, hat: dead.hat }; wSpark(g, heir, "pyramid"); }
/* out of the water, onto the bank: a swim (pleasures.js counts them) */
function wSwam(g, p) {
  g.swims = (g.swims || 0) + 1; g.lastSwim = p.id;
  wSpark(g, p, "baths");   /* (brr. what if it were warm) */
}
/* a bucket spilt (cell fx, fy): at the furnace, by somebody who knows masonry, it is the first anybody has seen a
   thing warm itself (lime and water) */
function wSpilt(g, p, fx, fy) {
  if (!g.know.masonry || g.know.concrete) return;
  var f = mSites(g, "furnace", true)[0];
  if (f && Math.abs(fx - f.cx) < 10 && Math.abs(fy - f.G) < 12) wSpark(g, p, "concrete");
}

/* -------------------------------------------------------------------
   WHAT TO DO ABOUT IT. from iPick, before the mine. true if they found
   something
   ------------------------------------------------------------------- */
function wPick(g, p, hungry) {
  if (hungry || p.cold > 80) return false;
  var S = wSites(g), k, s, d;
  /* a wonder going up: its crew, if there is room in it; hauling, if there is not, from anywhere in the valley */
  for (k = 0; k < S.length; k++) {
    s = S[k];
    if (s.done || (p.failSite === s.id && p.failT > g.tick)) continue;
    if (!wFull(g, s, p) && bUseful(g, p, s)) { bJoin(g, p, s); return true; }
    if (bBrings(g, p, s) || ((p.lime || 0) >= 1 && wLimeWant(g, s) > 0)) { p.task = { kind: "haul", site: s.id, t: 0, act: 0 }; return true; }
    /* the next of it wants wet concrete, and there is lime for it: somebody mixes some (pleasures.js uses this) */
    if (!wFull(g, s, p) && wMixWanted(g, s) && wGoMix(g, p, s)) return true;
  }
  /* the kiln: something asked of the furnace */
  if (g.kiln && g.kiln.length && wGoKiln(g, p)) return true;
  /* glass, for a wonder's windows (and for the kiln's coloured glass): blown at the furnace before the mine gets
     everybody (leftovers.js counts what the wonders want: monuments.js) */
  if (g.know.glass && lGlassShort(g, mSites(g, "furnace", true)[0]) > 0 && lGlassPick(g, p)) return true;
  /* short of stone, and nowhere to get it but the rock: a quarryman */
  if (wGoQuarry(g, p)) return true;
  /* a wonder thought of, and none going up: somewhere for it (one great work at a time) */
  if (!p.planCD && g.tick > (g.wPlanT || 0) && Math.random() < 0.3) {
    g.wPlanT = g.tick + 300;
    for (k = 0; k < W_DEFS.length; k++) {
      d = W_DEFS[k];
      if (!d.plan || !g.know[d.id] || (g.wDone && g.wDone[d.id] && !d.again) || iCount(g, d.id) || (!d.exempt && wGreat(g))) continue;
      if (g.wNo && g.wNo[d.id] > g.tick) continue;
      if (d.plan(g, p)) return true;
      if (!g.wNo) g.wNo = {};
      g.wNo[d.id] = g.tick + 6000;
      iNoRoom(g, d.idea ? "the " + d.idea.name : d.id);
    }
  }
  /* and the ones that stand: what they are for */
  for (k = 0; k < W_DEFS.length; k++) if (W_DEFS[k].pick && W_DEFS[k].pick(g, p, hungry)) return true;
  return false;
}
/* one tick of one of the jobs in here, or undefined if it is not one of ours */
function wTask(g, p, k) {
  if (k.kind === "haul") return wTaskHaul(g, p, k);
  if (k.kind === "quarry") return wTaskQuarry(g, p, k);
  if (k.kind === "mix") return wTaskMix(g, p, k);
  if (k.kind === "kiln") return wTaskKiln(g, p, k);
  if (k.kind === "audience") return wTaskAudience(g, p, k);
  for (var j = 0; j < W_DEFS.length; j++) if (W_DEFS[j].task) { var r = W_DEFS[j].task(g, p, k); if (r !== undefined) return r; }
  return undefined;
}
/* somewhere to stand by site s, to put things on its pile: about the foot of it */
function wFoot(g, s) {
  var x = Math.round(s.cx - 0.5), G = mGroundNear(g, x, false, s.y1);
  return { x: x, y: G > 0 ? G - 1 : s.y1 };
}
function wNear(g, s, R) {
  var x0 = s.x0 - 2, x1 = s.x1 + 2, y0 = s.y0 - 4, y1 = s.y1 + 4;
  return function (x, y) { return x >= x0 - (R || 0) && x <= x1 + (R || 0) && y >= y0 && y <= y1; };
}
/* carrying what a wonder is short of: there, and on the pile with it */
function wTaskHaul(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || s.done || ++k.t > 4000) return iDone(p, false);
  var f = wFoot(g, s), at = wNear(g, s, 2);
  if (!at(Math.floor(p.x), Math.floor(p.y))) {
    if (iWalk(g, p, k, "haul" + s.id, f.x, f.y, at)) { bFail(g, p, s, 1500, "walk"); }
    return false;
  }
  bDeposit(g, p, s);
  wDepositLime(g, p, s);
  if (p.sayT <= 0 && Math.random() < 0.3) pSay(g, p, "haul");
  p.bored = 0;
  return iDone(p, true);
}
function wDepositLime(g, p, s) {
  var n = Math.min(p.lime || 0, Math.max(0, wLimeWant(g, s)));
  if (n > 0) { s.stock = s.stock || {}; s.stock.lime = (s.stock.lime || 0) + n; p.lime -= n; }
}

/* -------------------------------------------------------------------
   QUARRYING: a bench, three rows deep and up to sixteen along, cut down
   out of the floor of an old gallery (any level, any mine): no new
   room is needed over it, the roof and the props stay as they are, and
   the ladder is carried down to the new floor where it meets the shaft.
   with no gallery anywhere, the floor of a cave, or any bare rock with
   open air over it, will do. the stone goes to the wonder's pile
   ------------------------------------------------------------------- */
/* stone a wonder still wants that is neither on its pile nor in anybody's pocket (and the kiln's, for its lime and
   firebrick) */
function wStoneShort(g, s) {
  var need = bNeed(g, s, "stone") + Math.ceil(Math.max(0, wLimeWant(g, s)) / 2) + Math.max(0, bNeed(g, s, "firebrick") - wPocketed(g, "firebrick"));
  return need - bStoneToHand(g);
}
function wPocketed(g, r) { var n = 0; for (var k = 0; k < g.peasants.length; k++) if (!g.peasants[k].dead) n += g.peasants[k][r] || 0; return n; }
/* the floor of column x, under a gallery whose feet are at row B: as far down as the dug-out air goes */
function wFloorAt(g, x, B) { var y = B; while (y + 1 < g.gh && (AIRY[pCell(g, x, y + 1)] || pCell(g, x, y + 1) === MAT.LADDER)) y++; return y; }
/* can a bench go down from floor F at column x, depth rows: rock in every row of it, nobody's, a firm floor under the
   new floor and two more rows of rock under that (no cave just under it), and nothing loose about that would pour in */
function wBenchOk(g, x, F, depth) {
  var y, c, k;
  if (x < 4 || x > g.gw - 5 || !AIRY[pCell(g, x, F)]) return false;
  for (y = F + 1; y <= F + depth; y++) { c = pCell(g, x, y); if (!ROCK[c] || bMarked(g, x, y)) return false; }
  for (y = F + depth + 1; y <= F + depth + 3; y++) if (!mFirm(pCell(g, x, y)) || y >= g.gh - 1) return false;
  for (y = F - 1; y <= F + depth + 1; y++) for (k = -1; k <= 1; k++) { c = pCell(g, x + k, y); if (mLoose(c) || LIQUID[c]) return false; }
  for (k = 0; k < g.sites.length; k++) {
    var t = g.sites[k];
    if (!t.mine && x >= t.x0 - 1 && x <= t.x1 + 1 && F + depth + 2 >= t.y0 && F - 2 <= t.y1) return false;
  }
  return true;
}
/* somewhere to quarry: {x0, x1 (the run, either way round), F (the floor it goes down from), depth, of (the gallery, or
   0), shaft (the shaft's columns, to carry the ladder down), S (where the dark of the rock starts)} or null */
function wQuarryPlot(g, near, p) {
  var T = mSites(g, "tunnel", true), best = null, k, t, m, x, d, F, n, cols, sc;
  for (k = 0; k < T.length; k++) {
    t = T[k]; m = bSite(g, t.of);
    if (!m || m.flood === 2 || t.flood || mFlooded(g, t)) continue;
    d = t.dir; cols = [];
    var start = Math.min(t.xa, t.xb) === t.xa && d > 0 ? t.xa : (d > 0 ? Math.min(t.xa, t.xb) : Math.max(t.xa, t.xb));
    F = wFloorAt(g, start, t.B);
    for (x = start; cols.length < W_BENCH_W && (d > 0 ? x <= Math.max(t.xa, t.xb) : x >= Math.min(t.xa, t.xb)); x += d) {
      if (wFloorAt(g, x, t.B) !== F || !wBenchOk(g, x, F, W_BENCH)) break;
      cols.push(x);
    }
    if (cols.length < 3) continue;
    sc = cols.length * 10 - Math.abs(t.cx - near) * 0.05;
    /* (where it meets the shaft, the ladder goes down to the new floor with it: the bottom of the shaft only) */
    var sh = !t.lv && Math.abs(cols[0] - m.col) === 2 && wFloorAt(g, m.col, m.B) === F ? m.col : -1;
    if (!best || sc > best.sc) best = { cols: cols, F: F, depth: W_BENCH, of: t.id, shaft: sh, S: t.S, sc: sc };
  }
  if (best) return best;
  /* no gallery to bench: the floor of a cave, or bare rock under open air. level, a run of it, and out of the way of the
     village (nowhere near anybody's house, nor anybody's site). the best few, that p can walk to */
  var C = [];
  for (x = 8; x < g.gw - 8; x++) {
    var L = mFloors(g, x);
    for (n = 0; n < L.length; n++) {
      F = L[n];
      if (!ROCK[pCell(g, x, F + 1)] || !pRoom(g, x, F) || wByHouse(g, x, F) || (g.wQuarryFar && g.wQuarryFar[x + ":" + F] > g.tick)) continue;
      for (cols = [], d = x; cols.length < W_BENCH_W && d < g.gw - 6; d++) {
        if (mGroundNear(g, d, false, F) !== F + 1 || !pRoom(g, d, F) || !wBenchOk(g, d, F, W_BENCH) || wByHouse(g, d, F)) break;
        cols.push(d);
      }
      if (cols.length < 4) continue;
      /* (and no tree, or log, close about it: what grows in a cave grows in the way, and nobody can stand under it) */
      var wood = false;
      for (d = cols[0] - 8; d <= cols[cols.length - 1] + 8 && !wood; d++) for (var yy = F - 9; yy <= F; yy++) if (WOODY[pCell(g, d, yy)]) { wood = true; break; }
      if (wood) { x += cols.length - 1; continue; }
      C.push({ cols: cols, F: F, depth: W_BENCH, of: 0, shaft: -1, S: 1e9, sc: cols.length * 10 - Math.abs(x - near) * 0.08 });
      x += cols.length - 1;   /* (the next run starts past this one) */
    }
  }
  C.sort(function (a, b) { return b.sc - a.sc; });
  for (k = 0; k < C.length && k < 6; k++) {
    if (!p || mReachable(g, p, C[k].cols[0], C[k].F)) return C[k];
    if (!g.wQuarryFar) g.wQuarryFar = {};
    g.wQuarryFar[C[k].cols[0] + ":" + C[k].F] = g.tick + 20000;   /* (across a lake, up a cliff: let be a while) */
  }
  return null;
}
/* a house near (x, y): within eight columns, and about level with it (a cave under the village is not the village) */
function wByHouse(g, x, y) {
  for (var k = 0; k < g.sites.length; k++) { var s = g.sites[k]; if (s.kind === "house" && x >= s.x0 - 8 && x <= s.x1 + 8 && y > s.y0 - 20 && y < s.y1 + 20) return true; }
  return false;
}
/* a bench as a site: a row at a time, from the shaft end outward */
function wPlanQuarry(g, p, r) {
  var plan = [], k, y, x, e, n = r.cols.length, c;

  for (y = 1; y <= r.depth; y++) {
    if (r.shaft >= 0) for (x = r.shaft - 1; x <= r.shaft + 1; x++) {
      if (ROCK[pCell(g, x, r.F + y)]) { e = bE(g, x, r.F + y, MAT.EMPTY, y * 40); e.mine = true; plan.push(e); }
      e = bE(g, x, r.F + y, MAT.LADDER, y * 40 + 1, x - r.shaft + 1); e.cost = 0; plan.push(e);
    }
    for (k = 0; k < n; k++) { e = bE(g, r.cols[k], r.F + y, MAT.EMPTY, y * 40 + 2 + k); e.mine = true; e.drain = true; plan.push(e); }
  }
  var xa = Math.min(r.cols[0], r.cols[n - 1]), xb = Math.max(r.cols[0], r.cols[n - 1]);
  if (r.shaft >= 0) { xa = Math.min(xa, r.shaft - 1); xb = Math.max(xb, r.shaft + 1); }
  var s = bNew(g, "quarry", p, plan, [xa, r.F - 9, xb, r.F + r.depth + 1],
               { free: true, mine: true, of: r.of, F: r.F, depth: r.depth, cols: r.cols.slice(), S: r.S, quiet: true, fails: 0 });
  var t = r.of ? bSite(g, r.of) : null;
  feed(g, p.name + " is cutting stone out of " + (t ? bLabel(t) : "the bare rock") + " for the great work", "#e8c8a0", "plan" + s.id);
  return s;
}
/* a wonder short of stone, and the valley's pockets short of it too: one quarryman, on top of its crew */
function wGoQuarry(g, p) {
  if (!g.know.mine) return false;
  var W = null, k, q = null;
  for (k = 0; k < g.sites.length; k++) { var s = g.sites[k]; if (s.wonder && !s.done && wStoneShort(g, s) > 0.5) { W = s; break; } }
  if (!W) return false;
  for (k = 0; k < g.peasants.length; k++) { var t = g.peasants[k].task; if (!g.peasants[k].dead && t && t.kind === "quarry") return false; }
  if ((p.stone || 0) >= M_POCKET.stone || p.hunger > P_HUNGRY) return false;
  /* the bench being cut, if there is one; else a new one */
  for (k = 0; k < g.sites.length && !q; k++) if (g.sites[k].kind === "quarry" && !g.sites[k].done) q = g.sites[k];
  if (!q) {
    if (g.wQuarryNo > g.tick) return false;
    var r = wQuarryPlot(g, W.cx, p);
    if (!r) { g.wQuarryNo = g.tick + 3000; W.note = "waiting for stone (nowhere left to cut it)"; return false; }
    q = wPlanQuarry(g, p, r);
  }
  p.task = { kind: "quarry", site: q.id, of: W.id, t: 0, b: { kind: "build", site: q.id, t: 0, act: 0, idle: 0, wait: 0 } };
  if (p.sayT <= 0) pSay(g, p, "quarry");
  return true;
}
function wTaskQuarry(g, p, k) {
  var W = bSite(g, k.of), q = bSite(g, k.site);
  if (!W || W.done) { if ((p.stone || 0) >= 1 && W) k.haul = true; else return iDone(p, true); }
  /* a pocketful (or the bench done): up with it, to the pile */
  if (!k.haul && ((p.stone || 0) >= M_POCKET.stone || !q || q.done) && (p.stone || 0) >= 1) { k.haul = true; if (p.sayT <= 0) pSay(g, p, "quarried"); }
  if (k.haul) {
    if (!W) return iDone(p, false);
    var f = wFoot(g, W), at = wNear(g, W, 2);
    if (!at(Math.floor(p.x), Math.floor(p.y))) { if (iWalk(g, p, k, "haul" + W.id, f.x, f.y, at)) pGiveUp(g, p, f.x); return false; }
    bDeposit(g, p, W);
    k.haul = false; k.b = { kind: "build", site: k.site, t: 0, act: 0, idle: 0, wait: 0 };
    if (!q || q.done || W.done || wStoneShort(g, W) <= 0) return iDone(p, true);
    return true;
  }
  if (!q) return iDone(p, false);
  if (++k.t > 12000) return iDone(p, false);
  /* (standing on the end of a log in a cave, say, right over the work and a drop above it, the ground under them only
     as far as their feet are concerned: a shuffle off the end of it) */
  var e0 = (k.t & 15) === 0 ? bNext(g, q, p) : null;
  if (e0) {
    var ex = e0.i % g.gw, ey = (e0.i / g.gw) | 0;
    var held = Math.abs(p.x - (k.px || 0)) < 0.3 && Math.abs(p.y - (k.py || 0)) < 0.3;   /* (not moved since the last look) */
    k.px = p.x; k.py = p.y;
    if (!bReach(g, p, e0) && (held || Math.abs(ex + 0.5 - p.x) < 4) && ey > Math.floor(p.y) + 2 && !p.climb && !p.jumping) k.still = (k.still || 0) + 16; else k.still = 0;
    if (k.still > 240) {
      var sd = ex + 0.5 < p.x ? -1 : 1, fy0 = Math.floor(p.y), moved = false;
      /* (off the end, and down: a low roof over the end of the log, say, is no room to stand up in, but room to drop) */
      for (var tr = 0; tr < 2 && !moved; tr++, sd = -sd) for (var sx = Math.floor(p.x) + sd; Math.abs(sx - Math.floor(p.x)) <= 3 && !moved; sx += sd) {
        for (var dy = 0; dy <= 4; dy++) if (pRoom(g, sx, fy0 + dy) && !pFoot(g, sx, fy0 + dy)) { p.x = sx + 0.5; p.y = fy0 + dy; p.nav = null; moved = true; break; }
      }
      k.still = 0;
    }
  }
  var r = bTaskBuild(g, p, k.b);
  if (p.task === null && !q.done && q.last === q.t0 && p.failSite === q.id && ++q.fails >= 3) {
    /* (three of them in a row, and not a cell of it cut: nobody can get to it. somewhere else, and not there again a while) */
    if (!g.wQuarryFar) g.wQuarryFar = {};
    g.wQuarryFar[q.cols[0] + ":" + q.F] = g.tick + 30000;
    var qi = g.sites.indexOf(q);
    if (qi >= 0) bRemove(g, qi);
  }
  if (p.task === null && (p.stone || 0) >= 1 && W && !W.done) { p.task = k; k.haul = true; }   /* (done, or stuck: up with what they have) */
  return r;
}
/* a bench done: the gallery is deeper there, and its props are drawn down to the new floor (mines.js) */
function wBenched(g, q) {
  var t = q.of ? bSite(g, q.of) : null;
  if (!t) return;
  t.bench = t.bench || {};
  for (var k = 0; k < q.cols.length; k++) t.bench[q.cols[k]] = q.F + q.depth - t.B;
}

/* -------------------------------------------------------------------
   THE KILN: what the furnace has been asked for. one worker, oldest
   order first: lime (a stone and a coal, burnt: two of lime),
   firebrick (a stone and a coal, fired: one), and stained panes (a
   pane, and a tint: a fifth of gold for ruby, an ore for green, a coal
   for amber)
   ------------------------------------------------------------------- */
var W_KILN = 150;   /* ticks at the bellows for a batch */
/* lime a wonder still wants for its wet concrete, over what is on its pile and in its mixers' pockets */
function wLimeWant(g, s) {
  var n = Math.ceil(Math.max(0, bNeed(g, s, "mortar") - wPocketed(g, "mortar")) / W_PAIL);
  return n - ((s.stock && s.stock.lime) || 0);
}
function wKilnOrders(g) {
  var out = [], k, s, n;
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if (!s.wonder || s.done) continue;
    if ((n = Math.max(0, bNeed(g, s, "firebrick") - wPocketed(g, "firebrick"))) > 0) out.push({ r: "firebrick", n: n, site: s.id });
    if ((n = wLimeWant(g, s) - wPocketed(g, "lime")) > 0) out.push({ r: "lime", n: n, site: s.id });
    if ((n = Math.max(0, bNeed(g, s, "stained") - wPocketed(g, "stained"))) > 0) out.push({ r: "stained", n: n, site: s.id });
  }
  return out;
}
function wGoKiln(g, p) {
  var f = mSites(g, "furnace", true)[0], k;
  if (!f || f.repair || Math.abs(f.cx - p.x) > 260) return false;
  for (k = 0; k < g.peasants.length; k++) { var t = g.peasants[k].task; if (!g.peasants[k].dead && t && t.kind === "kiln") return false; }
  var o = g.kiln[0], s = bSite(g, o.site);
  if (!s) return false;
  /* (the makings: a stone, somewhere to get it, and a coal. a pane, for stained glass) */
  var stone = (p.stone || 0) + ((s.stock && s.stock.stone) || 0) + ((f.stock && f.stock.stone) || 0);
  if (o.r !== "stained" && stone < 1) return false;
  if (o.r === "stained" && (p.glass || 0) + ((f.stock && f.stock.glass) || 0) < 1) return false;
  if ((p.coal || 0) + ((f.stock && f.stock.coal) || 0) < 1 && !(o.r === "stained" && ((p.ore || 0) >= 1 || (p.gold || 0) >= 0.2))) return false;
  p.task = { kind: "kiln", site: f.id, r: o.r, of: o.site, n: 0, want: o.n, t: 0, act: 0 };
  return true;
}
function wTaskKiln(g, p, k) {
  var f = bSite(g, k.site), s = bSite(g, k.of), st, ws;
  if (!f || !f.done || f.repair || !s || s.done || ++k.t > 5000) return iDone(p, (k.n || 0) > 0);
  st = f.stock || (f.stock = {}); ws = s.stock || (s.stock = {});
  /* done, or out of makings: off to the site with it */
  if (k.carry) {
    var fo = wFoot(g, s), at = wNear(g, s, 2);
    if (!at(Math.floor(p.x), Math.floor(p.y))) { if (iWalk(g, p, k, "kiln" + s.id, fo.x, fo.y, at)) pGiveUp(g, p, fo.x); return false; }
    if (k.r === "lime") wDepositLime(g, p, s); else bDeposit(g, p, s);
    p.bored = 0;
    return iDone(p, true);
  }
  /* a stone for the kiln, off the wonder's pile, if they have none and the furnace has none */
  if (k.r !== "stained" && (p.stone || 0) < 1 && (st.stone || 0) < 1) {
    if ((ws.stone || 0) < 1) { if ((p[k.r] || 0) >= 1) { k.carry = true; return false; } return iDone(p, false); }
    var wf = wFoot(g, s), wat = wNear(g, s, 2);
    if (!wat(Math.floor(p.x), Math.floor(p.y))) { if (iWalk(g, p, k, "kstone" + s.id, wf.x, wf.y, wat)) pGiveUp(g, p, wf.x); return false; }
    var take = Math.min(ws.stone, Math.max(1, Math.ceil((k.want - k.n) / (k.r === "lime" ? 2 : 1))));
    ws.stone -= take; p.stone = (p.stone || 0) + take;
    return true;
  }
  var sx = f.sx, sy = mSpotRow(g, f), fy = Math.floor(p.y);
  if (Math.abs(p.x - sx - 0.5) > 1.5 || Math.abs(fy - sy) > 3) {
    if (iWalk(g, p, k, "kiln" + f.id, sx, sy, function (x, y) { return Math.abs(x - sx) <= 1 && Math.abs(y - sy) <= 3; })) pGiveUp(g, p, sx);
    return false;
  }
  /* there: what they brought goes in, and they work the bellows */
  if (p.stone >= 1 && k.r !== "stained") { st.stone = (st.stone || 0) + Math.floor(p.stone); p.stone -= Math.floor(p.stone); }
  var coal = (st.coal || 0) >= 1 || (p.coal || 0) >= 1;
  var tint = k.r !== "stained" ? 1 : ((p.gold || 0) >= 0.2 && wRubyWanted(g, s) ? 1 : ((p.ore || 0) + (st.ore || 0) >= 1 || coal ? 1 : 0));
  var have = k.r === "stained" ? ((p.glass || 0) + (st.glass || 0) >= 1 && tint) : ((st.stone || 0) >= 1 && coal);
  if (!have || k.n >= k.want) {
    if (!k.n && p.sayT <= 0) pSay(g, p, k.r === "stained" ? "noglass" : (coal ? "nostone" : "nocoal"));
    if ((p[k.r] || 0) >= 1) { k.carry = true; return false; }
    return iDone(p, false);
  }
  p.dir = -f.mouth; p.idle = 0; k.act++;
  f.hot = g.tick + 60;
  p.pose = (k.act >> 3) & 1 ? "hammerA" : "stand";
  if (k.act % 9 === 0) pChips(g, f.fc + 0.5, f.G - 1.5, 2, SPARK_HOT);
  if (k.act === 30 && p.sayT <= 0 && Math.random() < 0.5) pSay(g, p, "kiln");
  if (k.act < W_KILN) return true;
  k.act = 0;
  function burn(r) { if ((st[r] || 0) >= 1) st[r]--; else p[r]--; }
  if (k.r === "stained") {
    if ((st.glass || 0) >= 1) st.glass--; else p.glass--;
    if ((p.gold || 0) >= 0.2 && wRubyWanted(g, s)) p.gold -= 0.2;
    else if ((p.ore || 0) + (st.ore || 0) >= 1) burn("ore"); else burn("coal");
    p.stained = (p.stained || 0) + 1; k.n++;
  } else {
    st.stone--; burn("coal");
    var out = k.r === "lime" ? 2 : 1;
    p[k.r] = (p[k.r] || 0) + out; k.n += out;
  }
  g.fx.clang++;
  sparks(g, f.fc + 0.5, f.G - 2, 8, 0.6, SPARK_HOT, 10, 0.4, PK_GLINT);
  if (k.r === "lime" && !g.got.concrete) { feed(g, p.name + " burnt the first lime. add sand and water, and stir", "#e0e0d4", "lime"); }
  if (k.n >= k.want) k.carry = true;
  return true;
}
function wRubyWanted(g, s) { for (var k = 0; k < s.plan.length; k++) { var e = s.plan[k]; if (e.v === MAT.STAINED && e.a === 0 && !bOk(g, e)) return true; } return false; }

/* -------------------------------------------------------------------
   WET CONCRETE: a lime off the pile, two spadefuls of sand, and a
   bucket of water, stirred at the site: a pail of it, carried wet, and
   poured into the plan, where it sets in its form. dawdle, and it goes
   off in the pail
   ------------------------------------------------------------------- */
/* the next cell of s is concrete, and nobody is carrying any for it, nor mixing it */
function wMixWanted(g, s) {
  var e = bNext(g, s, null);
  if (!e || e.v !== MAT.CONCRETE || ((s.stock && s.stock.lime) || 0) < 1) return false;
  for (var k = 0; k < g.peasants.length; k++) {
    var q = g.peasants[k];
    if (q.dead) continue;
    if ((q.mortar || 0) >= 1 || (q.task && q.task.kind === "mix" && q.task.site === s.id)) return false;
  }
  return true;
}
function wGoMix(g, p, s) {
  if ((p.mortar || 0) >= 1 || p.pail) return false;
  var w = iFindWater(g, p, 200, null, true, iBarred(g, true), false);
  if (!w) { s.note = "waiting for water to mix the concrete with"; return false; }
  p.task = { kind: "mix", site: s.id, w: w, t: 0, act: 0, water: 0, sand: 0 };
  return true;
}
function wTaskMix(g, p, k) {
  var s = bSite(g, k.site), fx = Math.floor(p.x), fy = Math.floor(p.y), j;
  if (!s || s.done || ++k.t > 4000) return iDone(p, false);
  /* a bucket of water first: from real water, never out of a pond being filled */
  if (!k.water) {
    var bar = iBarred(g, true);
    j = iScoopAt(g, fx, fy, true, bar);
    if (j >= 0 && !p.swimming && !LIQUID[pCell(g, fx, fy)]) {
      p.pose = (k.act >> 3) & 1 ? "eatB" : "stand";
      if (++k.act === 16) { var load = iScoop(g, j, true); k.water = load ? load.length : 0; k.act = 0; k.best = null; }
      return true;
    }
    if (k.t % 120 === 0) k.w = iFindWater(g, p, 200, null, true, bar, false) || k.w;
    if (!k.w) return iDone(p, false);
    if (iWalk(g, p, k, "mixw" + k.w.x, k.w.x, k.w.y, function (x, y) { return navStand(g, x, y) === 1 && !LIQUID[pCell(g, x, y)] && iScoopAt(g, x, y, true, bar) >= 0; })) pGiveUp(g, p, k.w.x);
    return false;
  }
  /* two spadefuls of sand, near the site */
  if (k.sand < 2 && (p.sand || 0) < 2) {
    if (!k.sx || !lSandy(g, k.sx, k.sy)) {
      var t = pFind(g, p, P_SANDY, 60, function (g2, x, y) { return !pAvoid(g2, p, x) && lSandy(g2, x, y); }, 10);
      if (!t) return iDone(p, false);
      k.sx = t.x; k.sy = t.y;
    }
    var go = lGo(g, p, k, "msand" + k.sx + "," + k.sy, k.sx, k.sy, 3, 10, 2);
    if (go <= 0) return false;
    p.dir = k.sx + 0.5 < p.x ? -1 : 1; k.act++;
    p.pose = (k.act % 16) < 8 ? "chopA" : "chopB";
    if (k.act % 16 !== 8) return true;
    heatVanish(g, k.sy * g.gw + k.sx); k.sand++; g.fx.thud++; k.sx = 0;
    return true;
  }
  /* to the site, and stir */
  var f = wFoot(g, s), at = wNear(g, s, 2);
  if (!at(fx, fy)) { if (iWalk(g, p, k, "mix" + s.id, f.x, f.y, at)) pGiveUp(g, p, f.x); return false; }
  if (!s.stock || (s.stock.lime || 0) < 1) return iDone(p, false);
  p.idle = 0; k.act++;
  p.pose = (k.act % 12) < 6 ? "chopA" : "chopB";
  if (k.act === 10 && p.sayT <= 0) pSay(g, p, "mix");
  if (k.act < 90) return true;
  s.stock.lime--;
  if (k.sand < 2) p.sand -= 2 - k.sand;
  p.mortar = W_PAIL; p.mortarT = g.tick;
  pSay(g, p, "mixed", true);
  if (!g.got.concrete) { feed(g, p.name + " mixed the first concrete. hurry", "#e0e0d4", "concrete"); achieve(g, "concrete"); }
  bJoin(g, p, s);
  return true;
}
/* a pail gone off: tipped out, and a lump of concrete stands where they were */
function wWentOff(g, p) {
  var fx = Math.floor(p.x) + p.dir, fy = Math.floor(p.y), n = p.mortar, r, x, y, j;
  p.mortar = 0;
  for (r = 0; r < 4 && n > 0; r++) for (y = fy; y >= fy - r && n > 0; y--) for (x = fx - r; x <= fx + r && n > 0; x++) {
    if (x < 1 || y < 1 || x >= g.gw - 1 || !AIRY[pCell(g, x, y)] || !SOLID[pCell(g, x, y + 1)]) continue;
    j = y * g.gw + x; sandSet(g, j, MAT.CONCRETE); n--;
  }
  pSay(g, p, "wentOff", true);
  if (!g.wLump) { g.wLump = 1; feed(g, "the concrete went off in " + p.name + "'s pail. there is a lump of it where they were standing", "#c8d0dc", "lump"); }
}

/* -------------------------------------------------------------------
   IRON, AND GOLD
   ------------------------------------------------------------------- */
/* a wonder going up wants iron: new tools wait for iron to spare (mines.js mGoForge), props and posts wait as they do */
function wIronHeld(g) {
  if (g.wIronTest) return true;
  for (var k = 0; k < g.sites.length; k++) { var s = g.sites[k]; if (s.wonder && !s.done && bNeed(g, s, "iron") > 0.01) return true; }
  return false;
}
/* gold in a plan is gilding: with no gold about (in pockets, or on piles), a stone stand-in, gilded later */
function wGild(g, plan) {
  var gold = mGoldToHand(g), k, e;
  for (k = 0; k < g.sites.length; k++) gold += (g.sites[k].stock && g.sites[k].stock.gold) || 0;
  for (k = 0; k < plan.length; k++) {
    e = plan[k];
    if (e.v !== MAT.GOLD) continue;
    if (gold >= B_AMT[MAT.GOLD] - 1e-6) { gold -= B_AMT[MAT.GOLD]; continue; }
    e.v = MAT.BRICK; e.gild = true;
  }
  return plan;
}
/* a wonder with a stand-in in it, and gold about now: gilded, as a repair */
function wRegild(g, s) {
  if (!s.done || s.repair || mGoldToHand(g) < 0.4) return;
  var n = 0, k, e;
  for (k = 0; k < s.plan.length; k++) { e = s.plan[k]; if (e.gild && e.v === MAT.BRICK && g.m[e.i] === MAT.BRICK) { e.v = MAT.GOLD; n++; } }
  if (!n) return;
  s.done = false; s.repair = true; s.last = g.tick; s.helped = {}; s.quiet = true;
  feed(g, "there is gold enough now. the village is gilding " + bLabel(s), "#ffd94a", "gild" + s.id);
}

/* -------------------------------------------------------------------
   FORCED DRAUGHT: a fire in a closed firebrick chamber with the bellows
   going burns at W_DRAUGHT, and twice as fast. the chamber's cells are
   listed on the site; while the bellows go, they are flagged in g.dmask,
   which the heat pass looks up for burning cells only
   ------------------------------------------------------------------- */
/* is the chamber (a list of cells) closed: everything round it that is not in it is firebrick */
function wClosed(g, cells) {
  var inside = {}, k, d, x, y, j;
  for (k = 0; k < cells.length; k++) inside[cells[k]] = 1;
  for (k = 0; k < cells.length; k++) {
    x = cells[k] % g.gw; y = (cells[k] / g.gw) | 0;
    for (d = 0; d < 4; d++) { j = sandNb(g, x, y, d); if (j >= 0 && !inside[j] && g.m[j] !== MAT.FIREBRICK) return false; }
  }
  return true;
}
/* somebody works the bellows of chamber cells (for key): for the next ticks ticks the fire in it burns hotter */
function wDraught(g, key, cells, ticks) {
  if (!g.dmask || g.dmask.length !== g.m.length) g.dmask = new Uint8Array(g.m.length);
  if (!g.draught) g.draught = {};
  var d = g.draught[key];
  if (!d) { d = g.draught[key] = { cells: cells.slice(), until: 0 }; for (var k = 0; k < cells.length; k++) g.dmask[cells[k]] = 1; }
  d.until = Math.max(d.until, g.tick + ticks);
}
function wDraughtStep(g) {
  if (!g.draught) return;
  var any = false;
  for (var key in g.draught) {
    var d = g.draught[key];
    if (d.until > g.tick) { any = true; continue; }
    for (var k = 0; k < d.cells.length; k++) g.dmask[d.cells[k]] = 0;
    delete g.draught[key];
  }
  if (!any) { g.dmask = null; g.draught = null; }
}

/* -------------------------------------------------------------------
   WARM WATER: a bath. nobody is cold in it, they think twice as fast,
   and they gossip. too hot (P_SWEAT) and they are out of it, fast
   ------------------------------------------------------------------- */
function wBathe(g, p, fx, fy) {
  if (fx < 0 || fx >= g.gw || fy < 1) return;
  var j = fy * g.gw + fx, c = g.m[j];
  if (!WET[c]) { j -= g.gw * 3; c = j >= 0 ? g.m[j] : 0; }
  if (!WET[c]) return;
  var t = g.T[j];
  if (t > P_SWEAT && t <= P_SCALD) {
    /* out, and quick about it */
    if (p.sayT <= 0) pSay(g, p, "tooHot", true);
    p.panic = Math.max(p.panic, 20); p.hotBath = g.tick + 600;
    if (p.task && p.task.kind === "bathe") p.task = null;
    return;
  }
  if (t < W_BATH_LO || t > W_BATH_HI) return;
  p.cold = 0; p.cosyT = g.tick + 30; p.bathT = g.tick;
  if (p.sayT <= 0 && (p.anim % 200) === 0) pSay(g, p, Math.random() < 0.5 ? "gossip" : "bathe");
}
/* cold, and there is a warm bath: that, before a campfire (pleasures.js) */
function wWarmBath(g, p) { var d = wOf("baths"); return !!(d && d.warm && d.warm(g, p)); }

/* -------------------------------------------------------------------
   THE LIGHTNING ROD: on a site, s.rod = {x, top, bot} (a girder column,
   top to bottom). a bolt that was going to land on something of theirs
   (a marked cell) within ten columns of a rod goes down the rod instead
   ------------------------------------------------------------------- */
var W_ROD = 10;
function wRod(g, hit, pts) {
  if (!g.sites || !bMarked(g, hit.x, hit.y)) return false;
  var best = null, bd = W_ROD + 1, k, s;
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if (!s.rod || !s.done || g.m[s.rod.top * g.gw + s.rod.x] !== MAT.GIRDER) continue;
    var d = Math.abs(s.rod.x - hit.x);
    if (d < bd) { bd = d; best = s; }
  }
  if (!best) return false;
  var r = best.rod, last = pts[pts.length - 1], y, n = 6, i;
  /* the bolt, bent to the top of the rod from wherever it had got to six steps up from the hit */
  while (pts.length > 2 && pts[pts.length - 1][1] > r.top - 12) pts.pop();
  last = pts[pts.length - 1];
  for (i = 1; i <= n; i++) pts.push([Math.round(last[0] + (r.x - last[0]) * i / n), Math.round(last[1] + (r.top - 1 - last[1]) * i / n)]);
  /* and down the rod's own column, bright, into the ground: no fire, no glass, nobody zapped */
  for (y = r.top; y <= r.bot; y += 3) pts.push([r.x, y]);
  g.bolts.push({ pts: pts, forks: [], t: 1, rod: 1 });
  g.flash = Math.max(g.flash, 0.4); g.shake = Math.min(10, g.shake + 2); g.fx.thunder++;
  sparks(g, r.x + 0.5, r.top, 16, 1.2, [hex32("#ffffff"), hex32("#c8e0ff")], 8, 0.6, PK_GLINT);
  best.rodHits = (best.rodHits || 0) + 1;
  if (best.rodHits === 1) feed(g, "lightning hit the rod on " + bLabel(best) + ". it WORKS", "#c8e0ff", "rod");
  return true;
}

/* -------------------------------------------------------------------
   STAINED GLASS, lit from behind: a lantern, a fire or an ember within
   six cells (game.js asks, cell by cell; there are never many)
   ------------------------------------------------------------------- */
function wLitGlass(g, x, y) {
  for (var dy = -6; dy <= 6; dy++) for (var dx = -6; dx <= 6; dx++) {
    var c = pCell(g, x + dx, y + dy);
    if (c === MAT.LAMP || c === MAT.FIRE || c === MAT.EMBER) return true;
  }
  return false;
}

/* -------------------------------------------------------------------
   GATHERINGS: the idle and the bored, come to sit (or stand) and watch.
   nobody stops eating, sleeping, fighting a fire or building for it
   ------------------------------------------------------------------- */
/* sit: on their bottom, legs out. fling: both arms out in front (a throw, on a stage) */
P_BODY.sit = pParse([".sse.", ".sss.", "scccs", ".cppf"], 3);
P_BODY.fling = pParse([".sse..", ".sss..", ".ccccs", ".cCc..", ".p.p..", "f...f."], 3);
/* idle enough to come: doing nothing, or only something for fun */
function wIdle(g, p) {
  return !p.dead && p.state === "walk" && !p.sleep && !p.fire && p.panic <= 0 && p.hunger < P_HUNGRY && p.cold < 60 &&
         !p.climb && !p.rope && !p.swimming && (!p.task || I_FUN[p.task.kind]);
}
/* a gathering at site s: up to cap of the idle within R of (x), each to a seat ({x, y}: where their feet go) if there
   are seats, else to stand about in front, until until. kind names it, for their mood. how many came */
function wGather(g, s, o) {
  var n = 0, k, q, seats = o.seats || [], used = {};
  for (k = 0; k < g.peasants.length; k++) if (g.peasants[k].task && g.peasants[k].task.kind === "audience" && g.peasants[k].task.site === s.id) { n++; if (g.peasants[k].task.seat >= 0) used[g.peasants[k].task.seat] = 1; }
  for (k = 0; k < g.peasants.length && n < (o.cap || 99); k++) {
    q = g.peasants[k];
    if ((o.but && o.but[q.id]) || !wIdle(g, q) || Math.abs(q.x - s.cx) > (o.R || 200)) continue;
    var seat = -1;
    for (var j = 0; j < seats.length; j++) if (!used[j]) { seat = j; used[j] = 1; break; }
    var at = seat >= 0 ? seats[seat] : { x: Math.round(o.x + (q.id % 7) - 3), y: o.y };
    q.task = { kind: "audience", site: s.id, of: o.kind, seat: seat, x: at.x, y: at.y, sit: seat >= 0, face: o.face || 0, until: o.until, t: 0 };
    n++;
  }
  return n;
}
function wTaskAudience(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || g.tick > k.until || ++k.t > 6000) { p.bored = 0; return iDone(p, true); }
  var fx = Math.floor(p.x), fy = Math.floor(p.y);
  if (Math.abs(p.x - k.x - 0.5) > (k.sit ? 0.6 : 2) || Math.abs(fy - k.y) > (k.sit ? 0 : 3)) {
    if (iWalk(g, p, k, "seat" + s.id + ":" + k.seat, k.x, k.y, k.sit ? function (x, y) { return x === k.x && y === k.y; } :
        function (x, y) { return Math.abs(x - k.x) <= 2 && Math.abs(y - k.y) <= 3; })) { if (k.sit) { k.sit = false; k.best = null; } else pGiveUp(g, p, k.x); }
    return false;
  }
  if (k.sit && !k.sat) { k.sat = true; p.x = k.x + 0.5; if (p.sayT <= 0 && Math.random() < 0.3) pSay(g, p, "sitDown"); }
  p.dir = k.face || (s.cx < p.x ? -1 : 1); p.idle = 0; p.cosyT = g.tick + 30; p.bored = Math.max(0, p.bored - 2);
  p.pose = k.sit ? "sit" : "stand";
  return true;
}

/* -------------------------------------------------------------------
   THE GOINGS ON: every W_STRIDE ticks (from peasantsStep)
   ------------------------------------------------------------------- */
function wStep(g) {
  if (g.tick % W_STRIDE) return;
  wDraughtStep(g);
  /* anything here going on at all: a wonder (or one of the two plain ideas they need) thought of, or a wonder site.
     until then, nothing in here rolls a single die */
  var any = false, k, s, p, d;
  for (k = 0; k < W_DEFS.length && !any; k++) if (g.know[W_DEFS[k].id]) any = true;
  if (g.know.concrete || g.know.stained) any = true;
  for (k = 0; k < g.sites.length && !any; k++) if (g.sites[k].wonder) any = true;
  g.wAny = any;
  /* (is there anywhere to cut stone, for a pyramid: looked at now and then, once it could matter) */
  if (g.know.masonry && (g.kingDied || g.thinkerDied) && !g.know.pyramid && g.tick % 600 === 0) g.wQuarryOk = !!mSites(g, "quarry").length || !!wQuarryPlot(g, g.gw >> 1);
  if (!any) return;
  M_IRON_SPARE = wIronHeld(g) ? W_IRON_HOLD : 10;
  g.kiln = wKilnOrders(g);
  for (k = 0; k < g.peasants.length; k++) {
    p = g.peasants[k];
    if (p.dead) continue;
    /* a pail of wet concrete, dawdled with */
    if ((p.mortar || 0) > 0 && g.tick - (p.mortarT || 0) > W_POUR) wWentOff(g, p);
    /* a tale, round a campfire, once they think of plays */
    if (g.know.theatre && p.task && p.task.kind === "warm" && p.task.social && p.sayT <= 0 && Math.random() < 0.03) wTellTale(g, p);
  }
  for (k = g.sites.length - 1; k >= 0; k--) {
    s = g.sites[k];
    if (s.kind === "quarry" && s.done && !s.benched) { s.benched = true; wBenched(g, s); }
    if (!s.wonder) continue;
    d = wOf(s.kind);
    /* set at last: finished (bFinish waited for it) */
    if (s.setting && !s.done && wReady(g, s) && bFinished(g, s)) bFinish(g, s, null);
    if (s.done) wRegild(g, s);
    s.note = wNote(g, s);
    if (d && d.step) d.step(g, s);
  }
  if (wCount(g) >= 7) achieve(g, "seven");
}
/* what a wonder going up is waiting for, for the readout */
function wNote(g, s) {
  var d = wOf(s.kind);
  if (d && d.readout) { var r = d.readout(g, s); if (r) return r; }
  if (s.done) return "";
  if (s.setting) return "waiting for the concrete to go off";
  if (wStoneShort(g, s) > 0.5) return (g.wQuarryNo > g.tick ? "waiting for stone (nowhere left to cut it)" : "waiting for stone (somebody is quarrying it)");
  var e = bNext(g, s, null);
  if (e && e.v === MAT.CONCRETE && !(s.stock && s.stock.lime >= 1) && wPocketed(g, "mortar") < 1) return "waiting for lime from the kiln";
  if (e && e.v === MAT.FIREBRICK && !(s.stock && s.stock.firebrick >= 1)) return "waiting for firebrick from the kiln";
  var pr = e && bPrice(e);
  if (pr && !bCanPay(g, null, s, e) && wPocketed(g, pr.r === "wood" ? "boards" : pr.r) + (pr.r === "wood" ? wPocketed(g, "logs") * B_BOARDS : 0) < pr.n) return "waiting for " + pr.r;
  return Math.round(bShare(g, s) * 100) + "% up, " + wCrew(g, s) + " of " + wCap(g) + " at it";
}
function wLabel(s) { var d = wOf(s.kind); return d ? (d.label ? d.label(s) : "the " + d.id) : (s.kind === "quarry" ? "the quarry" : ""); }
/* a wonder of ours is finished: news, a tale, an achievement. true if it was one of ours */
function wFinish(g, s, p) {
  if (s.kind === "quarry") return true;
  var d = wOf(s.kind);
  if (!d) return false;
  if (s.repair) return true;
  if (!g.wDone) g.wDone = {};
  var first = !g.wDone[d.id];
  g.wDone[d.id] = g.wDone[d.id] || g.tick;
  if (d.finish) d.finish(g, s, p);
  if (first) {
    wTale(g, "wonder", p, wLabel(s), s.cx, s.y1);
    achieve(g, d.id);
    mRing(g, 4);
    g.fx.fanfare++;
  }
  return true;
}
function wMood(g, p) {
  var k = p.task, s;
  if (!k) return (p.mortar || 0) >= 1 ? "is carrying a pail of wet concrete. it is going off" : "";
  if (k.kind === "haul") return (s = bSite(g, k.site)) ? "is taking " + (mPockets(p) || "something") + " to " + bLabel(s) : "is carrying things";
  if (k.kind === "quarry") return k.haul ? "is carrying stone up out of the quarry" : "is cutting stone for the great work" + ((p.stone || 0) >= 1 ? ". " + Math.floor(p.stone) + " so far" : "");
  if (k.kind === "mix") return !k.water ? "is fetching water to mix concrete with" : (k.sand < 2 ? "is digging sand for the concrete" : "is mixing concrete");
  if (k.kind === "kiln") return k.carry ? "is carrying " + k.r + " from the kiln" : "is burning " + k.r + " at the furnace";
  if (k.kind === "audience") return k.sit ? "is sitting, watching" : "is watching";
  for (var j = 0; j < W_DEFS.length; j++) if (W_DEFS[j].mood) { var m = W_DEFS[j].mood(g, p, k); if (m) return m; }
  if (k.kind === "build" && (s = bSite(g, k.site)) && s.wonder) return (s.repair ? "is mending " : "is working on ") + bLabel(s) + ". the great work";
  return "";
}
/* a fire on site s (flames f): part of the show? true while it is (and the brigade is not to come yet) */
function wPartOfIt(g, s, f) { var d = wOf(s.kind); return !!(d && d.partOfIt && d.partOfIt(g, s, f)); }

/* -------------------------------------------------------------------
   WHERE: wPlot, for any wonder. o = {w (columns), sky (rows of open air
   wanted over the highest ground), rough (how far the ground may go up
   and down under it), near (a column to be near), edge (rather near an
   edge of the valley), pad (columns kept clear either side), fit(g, x0,
   gy) (the wonder's own say: a score, the higher the better, or null)}.
   never on a house, a field, a mine or the heap; never over water,
   fire or anything that goes bang. {x0, gy (the ground, column by
   column), hi, lo, score, r (what fit said)} or null
   ------------------------------------------------------------------- */
function wPlot(g, o) {
  var best = null, W = o.w, pad = o.pad == null ? 3 : o.pad, x0, x, y, k, c, gy, hi, lo, ok, r, sc;
  for (x0 = 6 + pad; x0 + W - 1 < g.gw - 6 - pad; x0++) {
    gy = []; hi = 1e9; lo = -1; ok = true;
    for (x = x0; x < x0 + W && ok; x++) {
      y = o.floor != null ? mGroundNear(g, x, true, o.floor) : mGround(g, x, true);   /* (o.floor: the floor about level with that row, under a shelf, say: monuments.js) */
      if (y < 10 || !pSolid(g, x, y)) { ok = false; break; }
      gy.push(y); hi = Math.min(hi, y); lo = Math.max(lo, y);
    }
    if (!ok || lo - hi > (o.rough == null ? 4 : o.rough) || hi - (o.sky || 12) < 4) continue;
    if (g.tip && x0 - pad <= g.tip.x + 10 && x0 + W - 1 + pad >= g.tip.x - 10) continue;   /* (the heap: tidy.js) */
    for (k = 0; k < g.sites.length && ok; k++) {
      var t = g.sites[k];
      if (x0 + W - 1 + pad >= t.x0 && x0 - pad <= t.x1 && lo + 4 >= t.y0 && hi - (o.sky || 12) <= t.y1) ok = false;
    }
    for (y = hi - (o.sky || 12); y <= lo + 2 && ok; y++) for (x = x0 - 2; x <= x0 + W + 1 && ok; x++) {
      c = pCell(g, x, y);
      if (LIQUID[c] || HOT[c] || c === MAT.DRAIN || P_BANG[c]) ok = false;
    }
    /* open sky over it: air, or what a spade (or an axe) can clear (a bush, a tree: cleared first) */
    var clear = [];
    for (x = x0; x < x0 + W && ok; x++) for (y = hi - (o.sky || 12); y < gy[x - x0]; y++) {
      c = pCell(g, x, y);
      if (AIRY[c]) continue;
      if (!mClear(g, x, y, c) || bMarked(g, x, y)) { ok = false; break; }
      clear.push([x, y]);
    }
    if (!ok || !(r = o.fit(g, x0, gy, hi, lo))) continue;
    sc = r.score - clear.length * 0.1 - (o.edge ? Math.min(x0, g.gw - x0 - W) * 0.15 : Math.abs(x0 + W / 2 - (o.near || g.gw / 2)) * 0.1);
    if (!best || sc > best.score) best = { x0: x0, gy: gy, hi: hi, lo: lo, score: sc, r: r, clear: clear };
  }
  return best;
}
/* the clearing of a plot: every bush and tree over it out first (phase 0), then the plan */
function wCleared(g, r, plan) {
  var out = [];
  for (var k = 0; k < r.clear.length; k++) out.push(bE(g, r.clear[k][0], r.clear[k][1], MAT.EMPTY, 0));
  return out.concat(plan);
}
/* the houses' middle: where the village is */
function wMiddle(g) {
  var n = 0, x = 0;
  for (var k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "house") { n++; x += g.sites[k].cx; }
  return n ? x / n : g.gw / 2;
}

/* -------------------------------------------------------------------
   THE HEADER: WONDERS n/12, and the hover
   ------------------------------------------------------------------- */
function wRows(g, R) {
  var k, d, s, n = wCount(g);
  R.push(["=", "standing", n, W_TOTAL, "#ffd94a"]);
  var up = wSites(g).filter(function (s) { return !s.done; });
  if (up.length) { R.push(["#", "GOING UP"]); up.forEach(function (s) { R.push([bLabel(s), s.note || "", "#f0c060"]); }); }
  var done = wSites(g, true);
  if (done.length) { R.push(["#", "STANDING"]); done.forEach(function (s) { R.push([bLabel(s), s.note || "", "#ffffff"]); }); }
  var todo = 0;
  for (k = 0; k < W_DEFS.length; k++) {
    d = W_DEFS[k];
    if (iCount(g, d.id)) continue;
    if (!todo++) R.push(["#", "TO COME"]);
    var known = !!g.know[d.id];
    R.push([known ? (d.idea ? d.idea.name : d.id) : "? " + (d.idea ? d.idea.hint : ""), known ? (g.wNo && g.wNo[d.id] > g.tick ? "no room for it yet" : "thought of") : "", known ? "#f0c060" : "#8892a8"]);
  }
  for (k = W_DEFS.length; k < W_TOTAL; k++) { if (!todo++) R.push(["#", "TO COME"]); R.push(["? something nobody has thought of", "", "#56698a"]); }
}

/* -------------------------------------------------------------------
   DRAWING
   ------------------------------------------------------------------- */
function wPut(g, x, y, col, glow) {
  if (x < 0 || y < 0 || x >= g.gw || y >= g.gh) return;
  var i = y * g.gw + x;
  g.px[i] = col;
  if (glow) g.gpx[i] = col;
}
/* only over thin air: something drawn behind the world (a colonnade, a backdrop) */
function wBack(g, x, y, col, f) {
  if (x < 0 || y < 0 || x >= g.gw || y >= g.gh) return;
  var i = y * g.gw + x;
  if (g.m[i] === MAT.EMPTY) g.px[i] = f == null ? col : blend32(g.px[i], col, f);
}
function wDraw(g) {
  var hot = 0, k, s, d;
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if (!s.wonder || !(d = wOf(s.kind)) || !d.draw) continue;
    hot += d.draw(g, s) || 0;
  }
  return hot;
}
function wDrawOver(g) {
  var k, s, d;
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if (!s.wonder || !(d = wOf(s.kind)) || !d.drawOver) continue;
    d.drawOver(g, s);
  }
  /* a pail of wet concrete, carried at the hip */
  for (k = 0; k < g.peasants.length; k++) {
    var p = g.peasants[k];
    if (p.dead || p.state !== "walk" || !(p.mortar >= 1) || p.climb || p.swimming || p.sleep) continue;
    var bx = Math.floor(p.x) + p.dir * 2, by = Math.floor(p.y) - 3;
    wPut(g, bx, by, SAND_PAL[MAT.MORTAR][0]); wPut(g, bx + p.dir, by, SAND_PAL[MAT.MORTAR][2]);
    wPut(g, bx, by + 1, I_PAIL); wPut(g, bx + p.dir, by + 1, I_PAIL);
  }
}
