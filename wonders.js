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
var W_ONLY = ["firebrick", "stained", "plate", "bell"];   /* what nothing but a great work wants (and lime: wLimeWant) */
var W_NOFURNACE = ["theatre", "pyramid", "icepalace"];   /* the great works that want nothing of the furnace's */
/* which is looked for room for first, when the valley could start more than one: the two that want the most open ground
   while there is still some; then the quick ones, which a crowded valley still has a corner for; the long ones last */
var W_ORDER = ["theatre", "pyramid", "observatory", "foundry", "baths", "organ", "moonrocket", "duckpalace", "lighthouse", "gardens", "cathedral", "icepalace"];
function wRank(d) { var r = W_ORDER.indexOf(d.id); return r < 0 ? W_ORDER.length + W_DEFS.indexOf(d) : r; }

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
  { id: "concrete", fresh: true, name: "concrete", title: "CONCRETE", sub: "lime, sand and water. it pours like porridge and sets like stone", hint: "a bucket spilt at the furnace",
    ready: function (g) { return !!g.know.masonry && !!g.know.smelt && !!g.know.bucket && mSites(g, "furnace", true).length > 0; } },
  { id: "stained", fresh: true, name: "stained glass", title: "STAINED GLASS", sub: "a pane, and a tint. ruby with gold, green with ore, amber with coal", hint: "glass, and the right rocks",
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
/* a new village: nothing of the old one's great works left over, in the air or due (a rocket going up, a flag due on
   the moon, the iron kept back for them) */
var W_GKEYS = ["curseSlips", "dmask", "draught", "hConst", "hLake", "hLakeT", "hLightFame", "hRock", "hRockOut", "hShower", "kilnN",
  "kingDied", "lastKing", "lastSwim", "looks", "moonCrew", "moonFlag", "moonLooks", "moonT", "noField", "noFieldT", "packFlights",
  "rocket", "rocketBooms", "thinkerDied", "wChar", "wDuckPalace", "wIceN", "wLump", "wNo", "wPlanT", "wPyrFame", "wQuarryFar",
  "wQuarryNo", "wQuarryOk", "wTick", "wIronTest", "ironSpare", "salvage", "wSalv", "wSalvNo", "festX", "wRngS"];   /* (only keys of the great works': resow and the rest are the village's, as on master) */
/* lightning, as it strikes at (x, y) (world.js sandLightning, not taken down a rod): any great work standing that
   answers it (the lighthouse's lantern) */
function wStruck(g, x, y) {
  for (var k = 0; k < g.sites.length; k++) { var s = g.sites[k], d = s.wonder && wOf(s.kind); if (d && d.struck) d.struck(g, s, x, y); }
}
/* the world cleared (C, and a new village: world.js sandClear): what of the great works was in it, in the air over it,
   or due in it, gone with it; and what was found out about where things are in it (no room for one yet, a quarry too far
   off or none left, no room for a field just now), to be looked at afresh. what the village knows and has done is its
   own, and stays: and what the dead left for the great works (g.salvage) is the village's, and stays too (wSalvageAt
   finds it somewhere to be). a new village (wReset, W_GKEYS) starts with none of it */
function wClearWorld(g) {
  delete g.rocket; delete g.moonT; delete g.hRock; delete g.hRockOut; delete g.wDuckPalace;   /* (and a falling star on its way down: heavens.js) */
  delete g.wNo; delete g.wQuarryFar; delete g.wQuarryNo; delete g.noFieldT; delete g.festX; delete g.wSalvNo;
  g.draught = {}; if (g.dmask) g.dmask.fill(0);
  g.kiln = [];
}
function wReset(g) {
  for (var k = 0; k < W_GKEYS.length; k++) delete g[W_GKEYS[k]];
  g.tales = []; g.kiln = []; g.wDone = {}; g.wAny = false; g.swims = 0;
}
/* DESTINATIONS: a great work (or the salvage, the moon rock's spot) somebody could not get to, or gave up on, is let be
   by them a while, and the next one tried (peasants.js pGiveUp; the tasks' own timeouts). id: a site's, or a task's kind */
/* the great works' own jobs: given up on, let be (the site, or with none, the job). the kiln at the furnace, a mixer at
   the water, too: the furnace is no great work, but the job is theirs. (not "skate": master skates on frozen ponds) */
var W_KINDS = (function () {   /* (a constant, filled once) */
  var o = {};
  ["haul", "salvage", "quarry", "mix", "kiln", "moonrock", "gantry", "meteorite", "observe", "found", "keep", "fuel", "board",
   "stoke", "bathe", "screw", "pfill", "organ", "shovel", "cbail", "act", "preach", "audience", "apex", "crypt", "wcool"].forEach(function (k) { o[k] = 1; });
  return o;
})();
var W_AWAY = { shovel: 1, mix: 1, pfill: 1, bucket: 1, cbail: 1 };   /* (jobs for a site whose walks go elsewhere: snow, water) */
var W_NOGO = 1500;   /* (as long as bFail lets a site be, for a walk given up) */
/* (and for a job that comes round again only now and then, longer than the wait for it to come round: or the backoff is
   over by the time it does, and the same one is sent again. the astronomer's look, every 2400 to 3600 ticks) */
var W_NOGO_T = { observe: 8000 };
function wBackoff(g, p, id, t) { (p.noGo || (p.noGo = {}))[id] = g.tick + (t || W_NOGO); }
function wNoGo(g, p, id) { return !!(p.noGo && p.noGo[id] > g.tick); }
/* what of r is on its way to s already, in the pockets of whoever is hauling to it or building it (but p) */
function wInbound(g, s, r, p) {
  var n = 0, k, q;
  for (k = 0; k < g.peasants.length; k++) {
    q = g.peasants[k];
    if (q !== p && !q.dead && q.task && q.task.site === s.id && (q.task.kind === "haul" || q.task.kind === "build")) n += r === "mortar" ? (q.lump || 0) : (q[r] || 0);
  }
  return n;
}
/* THE GREAT WORKS' OWN DICE: for what of theirs must not roll the village's dice before they are thought of (which of
   their ideas comes, and when: ideas.js iEureka), and must not be rolled by drawing or sound either (rng.js RNG_SIDE is
   theirs). one number on g (g.wRngS), so it is saved, snapshotted and rewound with the village. mulberry32, as rng.js */
function wRand(g) {
  var st = g.wRngS == null ? 0x2b7e1516 : g.wRngS;
  st = (st + 0x6d2b79f5) >>> 0;
  g.wRngS = st;
  var t = st;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
/* the wonder sites: every one, or only those standing (done) */
function wSites(g, done) {
  var out = [];
  for (var k = 0; k < g.sites.length; k++) if (g.sites[k].wonder && (!done || g.sites[k].done)) out.push(g.sites[k]);
  return out;
}
/* the great works going up: the wonders not yet finished that the W_GREAT-at-a-time rule applies to (not one laid by,
   being mended, or exempt) */
var W_GREAT = 2;
function wGreats(g) {
  var out = [];
  for (var k = 0; k < g.sites.length; k++) { var s = g.sites[k]; if (s.wonder && !s.done && !s.repair && !s.laid && !(wOf(s.kind) || {}).exempt) out.push(s); }
  return out;
}
/* is there room for another great work to be begun (or one laid by to be taken up) */
function wRoomFor(g) { return wGreats(g).length < W_GREAT; }
/* the wonder sites going up, the great work (and anything not laid by) first: whoever is looking for something to do
   at one, or the kiln, or the quarry, looks there first */
function wUp(g) {
  var a = [], b = [];
  for (var k = 0; k < g.sites.length; k++) { var s = g.sites[k]; if (s.wonder && !s.done) (s.laid ? b : a).push(s); }
  return a.concat(b);
}
/* LAID BY: a great work that has not come on at all in W_LAYBY ticks (short of something nobody can get it) stops being
   a great work, and another can be planned. it is still worked at whenever there is something it can have, and once
   it comes on again it is taken up again (when there is room for another great work) */
var W_LAYBY = 10000;
/* (a cell put in counts, every one (s.puts: build.js bPlace); a cell dug out only once the digging is well past the
   most it has ever been: sand that runs back into a hole as fast as it is dug is not getting anywhere) */
function wDug(g, s) { var n = 0; for (var k = 0; k < s.plan.length; k++) if (s.plan[k].v === MAT.EMPTY && bOk(g, s.plan[k])) n++; return n; }
function wLayBy(g, s) {
  if (s.done || s.repair || (wOf(s.kind) || {}).exempt || g.tick % 300) return;
  var n = s.puts || 0, d = wDug(g, s);
  if (s.progT == null || n > (s.progN || 0) || d > (s.progD || 0) + 2) {
    var was = s.progT != null;
    s.progN = n; s.progD = Math.max(d, s.progD || 0); s.progT = g.tick;
    if (s.laid && was && wRoomFor(g)) {
      s.laid = false;
      feed(g, "the village has taken up " + bLabel(s) + " again", "#ffd94a", "laid" + s.id);
    }
    return;
  }
  if (s.laid || g.tick - s.progT < W_LAYBY) return;
  s.laid = true;
  var why = wNote(g, s), w = /^waiting for /.test(why) ? why.replace(/^waiting for /, "") : "";
  feed(g, bLabel(s) + " is laid by for now" + (w ? ". it wants " + w.replace(/ \(.*\)$/, "") + ", and there is none to be had" : ". nobody can get on with it") +
       ". something else, meanwhile", "#c8d0dc", "laid" + s.id);
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
/* is site s's crew full, as far as p is concerned (they are not in it already): its own cap, or the great works' crews
   between them half the village already */
function wFull(g, s, p) {
  if (!s.wonder || (wOf(s.kind) || {}).exempt) return false;
  if (p.task && p.task.kind === "build" && p.task.site === s.id) return false;
  if (wCrew(g, s, p) >= wCap(g)) return true;
  var n = 0;
  for (var k = 0; k < g.sites.length; k++) { var t = g.sites[k]; if (t.wonder && !t.done && !(wOf(t.kind) || {}).exempt) n += wCrew(g, t, p); }
  return n >= Math.max(1, Math.floor(bAlive(g) / 2));   /* (half the village; but a lone villager can be a crew of one) */
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
  /* (on its own: p.wspark, not p.spark, nor their musing. what they are thinking of for the village is as on master) */
  if (I && I.ready(g, p)) p.wspark = id;
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
    case "moon": return n + " went to the moon";
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
  var S = wUp(g), k, s, d;
  /* a barrel of oil in hand: where it is wanted, before anything else (heavens.js) */
  if (p.barrel && hDeliverBarrel(g, p)) return true;
  /* what the dead left for a great work, wanted by one: fetched (wGoSalvage) */
  if (g.salvage && wGoSalvage(g, p)) return true;
  /* carrying what only a great work wants (lime, firebrick, coloured glass, cast iron), and one of them wants it: there
     with it first, before they are taken on at another (a pocketful of lime at the cathedral's crypt is no use to the
     organ waiting on it) */
  for (k = 0; k < S.length; k++) {
    s = S[k];
    if ((p.failSite === s.id && p.failT > g.tick) || wNoGo(g, p, s.id)) continue;
    /* (what it still wants, less what is on its way to it already) */
    if (((p.lime || 0) >= 1 && wLimeWant(g, s) - wInbound(g, s, "lime", p) > 0) || ((p.lump || 0) >= 1 && bNeed(g, s, "mortar") - wInbound(g, s, "mortar", p) > 1e-6) ||
        W_ONLY.some(function (r) { return (r === "bell" ? wNinths(p[r]) >= 1 : (p[r] || 0) >= 1) && bNeed(g, s, r) - wInbound(g, s, r, p) > 1e-6; })) { p.task = { kind: "haul", site: s.id, t: 0, act: 0 }; return true; }
  }
  /* with the makings for the kiln in hand (a pane, for coloured glass; logs, for charcoal, there being no coal): the kiln,
     before the crew */
  if (g.kiln && g.kiln.length && ((p.glass || 0) >= 1 || (p.logs || 0) >= 2) && wGoKiln(g, p)) return true;
  /* a wonder going up: its crew, if there is room in it; hauling, if there is not, from anywhere in the valley */
  for (k = 0; k < S.length; k++) {
    s = S[k];
    if ((p.failSite === s.id && p.failT > g.tick) || wNoGo(g, p, s.id)) continue;
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
  /* a wonder thought of, and room for another great work: somewhere for it (W_GREAT at a time) */
  if (!p.planCD && g.tick > (g.wPlanT || 0) && Math.random() < 0.3) {
    g.wPlanT = g.tick + 300;
    var O = W_DEFS.slice().sort(function (a, b) { return wRank(a) - wRank(b); });
    for (k = 0; k < O.length; k++) {
      d = O[k];
      if (!d.plan || !g.know[d.id] || (g.wDone && g.wDone[d.id] && !d.again) || iCount(g, d.id) || (!d.exempt && !wRoomFor(g))) continue;
      if (g.wNo && g.wNo[d.id] > g.tick) continue;
      if (d.wait && d.wait(g)) continue;   /* (not for want of room: the ice palace, waiting for a freeze. pleasures.js) */
      /* (nor before there is a furnace, for anything that wants what only a furnace makes: it would take the ground the
         furnace wants, and then wait for ever for its firebrick, its glass and its iron) */
      if (W_NOFURNACE.indexOf(d.id) < 0 && !mSites(g, "furnace").length) continue;
      if (d.plan(g, p)) return true;
      if (!g.wNo) g.wNo = {};
      g.wNo[d.id] = g.tick + 6000;
      iNoRoom(g, d.idea ? d.idea.name : d.id);   /* (the name has its "the" already: "the baths") */
    }
  }
  /* and the ones that stand: what they are for */
  for (k = 0; k < W_DEFS.length; k++) if (W_DEFS[k].pick && W_DEFS[k].pick(g, p, hungry)) return true;
  return false;
}
/* one tick of one of the jobs in here, or undefined if it is not one of ours */
/* too hot where they stand to stay (body or feet, as pHeat measures it: well short of where even somebody used to the
   heat, at work, catches fire). every great works' job: they step back out of it, the cooler way, and wait till it is
   not, before they go on. nobody is cooked at their station, the bellows, the stoke-hole, the lamp */
var W_TOOHOT = P_IGNITE * 1.3, W_FEETHOT = P_IGNITE;   /* (for somebody at a brave job, who catches fire at twice P_IGNITE) */
var W_TOOHOT_ANY = P_IGNITE * 0.65, W_FEETHOT_ANY = P_IGNITE * 0.65;   /* (for anybody else, who catches fire at P_IGNITE: 150) */
/* the limits for p: a brave job's, or anybody's. a third short of where they would catch fire, either way */
function wLim(p) { var b = !!(p && p.task && p.task.brave); return { body: b ? W_TOOHOT : W_TOOHOT_ANY, feet: b ? W_FEETHOT : W_FEETHOT_ANY }; }
function wTooHot(g, p) { return wHotAt(g, Math.floor(p.x), Math.floor(p.y), 1, p); }
/* too hot to stand at (x, y), or (f under 1) at that much of too hot: the body there (and a column either side), and
   the ground under it */
function wHotAt(g, fx, fy, f, p) {
  var hi = -1e9, d, dx, L = wLim(p);
  for (dx = -1; dx <= 1; dx++) {
    var x = fx + dx;
    if (x < 0 || x >= g.gw || (f >= 1 && dx)) continue;
    [0, 4, 7].forEach(function (dy) { var y = fy - dy; if (y >= 0 && y < g.gh) hi = Math.max(hi, g.T[y * g.gw + x]); });
  }
  var feet = fy + 1 < g.gh && fx >= 0 && fx < g.gw ? g.T[(fy + 1) * g.gw + fx] : AMBIENT;
  return hi > L.body * f || feet > L.feet * f;
}
/* every tick, before the heat is felt (peasants.js pStep, ahead of pHeat): somebody at a great work's job with the whole
   of them, feet to head, in air or on ground too hot to stay in, here or a step on the way they are going, steps back
   (wStepBack). caught a step early, not a tick too late */
function wHeatGuard(g, p) {
  var k = p.task;
  if (p.state !== "walk" || p.fire) return;
  /* (anybody else, about their own business or none: not a step onto what a great work has just made hot, a fresh casting
     in its mould, firebrick, the exhaust. turned round at the edge of it. paths keep off it already, navHazard: this is
     for the wandering, and whoever's job has just ended on top of it) */
  var fx0 = Math.floor(p.x), fy0 = Math.floor(p.y), d0 = p.dir || 1;
  /* (on a warm foundry's roof, and not at the foundry's work: off it, the nearer way, before anything else. stepping back
     from some heat or other and landed up here too: that is no way off it, this is. the job they had waits for them, as it
     does for any step back) */
  if (wOnRoof(g, fx0, fy0) && !(k && (k.kind === "found" || k.roof))) {
    wRoofOff(g, p, wRoofs(g).filter(function (r) { return fx0 >= r.x0 && fx0 <= r.x1; })[0]);
    return;
  }
  if (!k || !W_KINDS[k.kind] || W_AWAY[k.kind]) {
    if (wHotWork(g, fx0, fy0, p)) {
      /* (standing in it, or it come up under them, a casting just poured: off it, now, the way with the least heat on it.
         the job they had waits; they are back for it in a moment) */
      var kc = { kind: "wcool", t: 0, was: k || null };
      wStepBack(g, p, kc); kc.hotX = fx0; kc.hotY = fy0; p.task = kc; p.dir = kc.backX < p.x ? -1 : 1;
    }
    return;   /* (and a step into it is never taken: peasants.js, where they step) */
  }
  if (k.roof) return;   /* (on the way off a foundry's roof: straight off it) */
  var fx = Math.floor(p.x), fy = Math.floor(p.y), xs = [fx, fx + (p.dir || 1)], i, dy;
  /* (already stepping back: only a step on into heat turns them again) */
  if (k.backT > g.tick) xs = [fx + (p.dir || 1)];
  for (i = 0; i < xs.length; i++) {
    var x = xs[i];
    if (x < 0 || x >= g.gw) continue;
    var L = wLim(p), hot = fy + 1 < g.gh && g.T[(fy + 1) * g.gw + x] > L.feet;
    for (dy = 0; dy <= 8 && !hot; dy++) { var y = fy - dy; if (y >= 0 && y < g.gh && g.T[y * g.gw + x] > L.body) hot = true; }
    if (hot) { wStepBack(g, p, k); if (k.hotX == null) { k.hotX = x; k.hotY = fy; } p.dir = k.backX < p.x ? -1 : 1; return; }
  }
}
/* a great work's own heat at (x, y), where somebody would stand: too hot underfoot or about the body, and inside (or
   right by) a great work's box */
function wHotWork(g, x, y, p) {
  if (x < 0 || x >= g.gw || y < 0 || y >= g.gh) return false;
  /* (on the way off a foundry's roof, and still on it: the nearer way, and no turning back on it for heat) */
  if (p && p.task && p.task.roof && wOnRoof(g, Math.floor(p.x), Math.floor(p.y))) return false;
  if (!(p && p.task && p.task.kind === "found") && wOnRoof(g, x, y)) return true;   /* (a warm foundry's roof: nobody's place) */
  /* (underfoot a step up or a step down too: walking onto a casting that stands a cell proud of the ground, or into a
     mould of it running) */
  var hot = false, dy, L = wLim(p);
  for (dy = -2; dy <= 1 && !hot; dy++) { var fy = y + 1 + dy; if (fy >= 0 && fy < g.gh && g.m[fy * g.gw + x] !== MAT.EMPTY && g.T[fy * g.gw + x] > L.feet) hot = true; }
  for (dy = 0; dy <= 8 && !hot; dy++) if (y - dy >= 0 && g.T[(y - dy) * g.gw + x] > L.body) hot = true;
  if (!hot) return false;
  for (var k = 0; k < g.sites.length; k++) { var s = g.sites[k]; if (s.wonder && x >= s.x0 - 12 && x <= s.x1 + 12 && y >= s.y0 - 4 && y <= s.y1 + 6) return true; }
  return false;
}
/* THE FOUNDRY'S ROOF is not a place: over its chamber, its chimney's mouth is hot, as a chimney's is. while any of it is
   warm (over 90) paths do not stand anybody on it (paths.js navHazard) and nothing is planned there (build.js
   bSiteAround). its sides are cool: the chamber and moulds are jacketed and lidded (heavens.js hFoundryCell).
   (x, y): a standing cell on top of a foundry that is warm. cached for the tick */
var W_RC = { g: null, t: -1, T: null, n: -1, sh: null, r: [] };
var W_SHUT = null;   /* (a foundry taken as warm, whatever it is: how it will be through a cast. heavens.js hCutOff) */
var W_OPEN = null;   /* (and one taken as cold: how it will be once it has cooled. heavens.js hCutOff) */
function wRoofs(g) {
  var r = [], k, s, x, y;
  if (W_RC.g === g && W_RC.t === g.tick && W_RC.T === g.T && W_RC.n === g.sites.length && W_RC.sh === W_SHUT && W_RC.op === W_OPEN) return W_RC.r;
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if (s.kind !== "foundry" || s === W_OPEN) continue;
    /* (while anything of it is warm, or alight: the fire in the chamber, a melt, a casting in its mould, the jacket or the
       roof over 90. never for the phase it is at alone: charged and not lit, or cast and gone cold with the plates still
       in it, it is cold stone and iron, and closes nothing) */
    var warm = s === W_SHUT;
    for (y = Math.max(0, s.R0 - 14); y <= Math.min(g.gh - 1, s.R0 + 4) && !warm; y++)   /* (down to the bell mould's lining) */ for (x = s.x0; x <= s.x1 && !warm; x++) {
      var j = y * g.gw + x, c = g.m[j];
      if (g.T[j] > 90 || c === MAT.EMBER || c === MAT.FIRE || c === MAT.LAVA) warm = true;
    }
    if (warm) r.push({ x0: s.x0 - 1, x1: s.x1 + 1, y1: s.R0 - 10, site: s.id });
  }
  /* (and a moon rocket's pad, through the countdown and the lift-off and a while after: the exhaust is fire, and the air
     it heats drifts ten columns off it either way, measured, up to some forty over it. nobody's but the crew's, aboard) */
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if (s.kind === "moonrocket" && s.R0 != null && (s.count > 0 || (s.gone && g.tick - s.gone < H_PLUME))) r.push(hPadZone(s));
  }
  W_RC.g = g; W_RC.t = g.tick; W_RC.T = g.T; W_RC.n = g.sites.length; W_RC.sh = W_SHUT; W_RC.op = W_OPEN; W_RC.r = r;
  return r;
}
function wOnRoof(g, x, y) {
  var r = wRoofs(g);
  for (var k = 0; k < r.length; k++) if (x >= r[k].x0 && x <= r[k].x1 && y <= r[k].y1 && !(r[k].y0 > y)) return true;
  return false;
}
/* off a foundry's roof r ({x0, x1}), the nearer way: past its edge and down. the job they had waits for them */
function wRoofOff(g, p, r) {
  var k = p.task, fx = Math.floor(p.x);
  var kr = { kind: "wcool", t: 0, was: k ? (k.kind === "wcool" ? k.was : k) : null, backT: g.tick + 300, backX: Math.max(1, Math.min(g.gw - 2, fx - r.x0 <= r.x1 - fx ? r.x0 - 3 : r.x1 + 3)), hotX: null, roof: true, brave: true };   /* (brave: off it through what warmth there is) */
  p.task = kr; p.dir = kr.backX < p.x ? -1 : 1;
}
function wStepBack(g, p, k) {
  var fx = Math.floor(p.x), fy = Math.floor(p.y), side = 0;
  function heat(x) { var t = 0; for (var dy = 0; dy <= 7; dy += 3) { var y = fy - dy; if (x >= 0 && x < g.gw && y >= 0 && y < g.gh) t += g.T[y * g.gw + x]; } return t; }
  /* (the way out with the least heat on it all the way, not only at the far end: walking out through the hot air is no
     way out of it) */
  function worst(sd) { var m = 0; for (var d = 1; d <= 6; d++) m = Math.max(m, heat(fx + sd * d)); return m; }
  /* (and never the way over a warm foundry's roof, from as high as it: back is not onto that) */
  function roofward(sd) {
    var r = wRoofs(g);
    for (var q = 0; q < r.length; q++) if (fy <= r[q].y1 + 1) for (var d = 1; d <= 6; d++) if (fx + sd * d >= r[q].x0 && fx + sd * d <= r[q].x1) return true;
    return false;
  }
  var rl = roofward(-1), rr = roofward(1);
  side = rl !== rr ? (rl ? 1 : -1) : worst(-1) <= worst(1) ? -1 : 1;
  k.backT = g.tick + 120;   /* (and stay back a while: it does not cool in a tick) */
  if (k.hotX == null) { k.hotX = fx; k.hotY = fy; }   /* (where it was too hot: not back into it till it has cooled well down. wTask) */
  k.backX = Math.max(1, Math.min(g.gw - 2, fx + side * 6));
  return false;
}
function wTask(g, p, k) {
  /* (too hot here: back, the cooler way, and wait. then on with it) */
  if (W_KINDS[k.kind] && !W_AWAY[k.kind] && p.state === "walk") {
    if (wTooHot(g, p) && !k.roof) wStepBack(g, p, k);
    if (k.hotX != null && !(k.backT > g.tick)) { if (wHotAt(g, k.hotX, k.hotY, 0.7)) k.backT = g.tick + 60; else k.hotX = null; }
    if (k.backT > g.tick) {
      p.pose = "stand"; p.idle = 0;
      if (Math.abs(p.x - k.backX - 0.5) > 1) iWalk(g, p, k, "back", k.backX, Math.floor(p.y), function (x) { return Math.abs(x - k.backX) <= 1; });
      if (p.sayT <= 0 && Math.random() < 0.01) pSay(g, p, "scald", true);
      return false;
    }
  }
  if (k.kind === "wcool") {
    if (k.roof && !wOnRoof(g, Math.floor(p.x), Math.floor(p.y)) && Math.abs(p.x - k.backX - 0.5) <= 2) k.backT = 0;
    if (++k.t > 3000 || !(k.backT > g.tick) && k.hotX == null) { p.task = k.was && k.was.kind !== "wcool" ? k.was : null; return false; }
    return false;
  }
  if (k.kind === "haul") return wTaskHaul(g, p, k);
  if (k.kind === "salvage") return wTaskSalvage(g, p, k);
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
  /* (to a foundry: on the ground by it, not up on its roof or its chimney, where its heat comes out) */
  if (s.kind === "foundry") { var near = at; at = function (x, y) { return near(x, y) && y >= s.R0 - 2; }; }
  if (!at(Math.floor(p.x), Math.floor(p.y))) {
    if (iWalk(g, p, k, "haul" + s.id, f.x, f.y, at)) bFail(g, p, s, 1500, "walk");   /* (failSite: let be a while) */
    return false;
  }
  bDeposit(g, p, s);
  wDepositLime(g, p, s);
  /* (a lump of concrete gone off: on the pile, to go in set where wet concrete would have: build.js bPay) */
  var lumps = Math.min(p.lump || 0, Math.max(0, Math.floor(bNeed(g, s, "mortar"))));
  if (lumps > 0) { s.stock = s.stock || {}; s.stock.lump = (s.stock.lump || 0) + lumps; p.lump -= lumps; }
  /* (what is left over, that no other great work wants either: into the salvage, not carried about for ever) */
  wSurplus(g, p);
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
  var need = bNeed(g, s, "stone") + Math.ceil(Math.max(0, wLimeWant(g, s)) / 2) + Math.ceil(Math.max(0, bNeed(g, s, "firebrick") - wPocketedSure(g, "firebrick")) / 2);
  return need - wPocketedSure(g, "stone");   /* (the stone in pockets that can get there: wPocketedSure) */
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
/* (three rows down, if there is anywhere to; with nowhere, two, then one: a worked-out mine under sand still has a floor
   of rock a row deep about it, and one brick wants half a stone) */
function wQuarryPlot(g, near, p) {
  for (var depth = W_BENCH; depth >= 1; depth--) { var r = wQuarryPlotAt(g, near, p, depth); if (r) return r; }
  return null;
}
function wQuarryPlotAt(g, near, p, W_BENCH) {
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
    /* (one let be a while, nobody having been able to get to it: as for bare rock, below) */
    if (g.wQuarryFar && g.wQuarryFar[cols[0] + ":" + F] > g.tick) continue;
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
  var W = null, k, q = null, U = wUp(g);
  for (k = 0; k < U.length; k++) if (wStoneShort(g, U[k]) > 1e-6) { W = U[k]; break; }   /* (a single brick is half a stone: any shortage at all) */
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
   firebrick (a stone and a coal, fired: two), and stained panes (a
   pane, and a tint: a fifth of gold for ruby, an ore for green, a coal
   for amber)
   ------------------------------------------------------------------- */
var W_KILN = 150;   /* ticks at the bellows for a batch */
/* lime a wonder still wants for its wet concrete, over what is on its pile and in its mixers' pockets */
function wLimeWant(g, s) {
  var n = Math.ceil(Math.max(0, bNeed(g, s, "mortar") - wPocketedSure(g, "mortar")) / W_PAIL);
  return n - ((s.stock && s.stock.lime) || 0);
}
function wKilnOrders(g) {
  var out = [], k, s, n, U = wUp(g);
  for (k = 0; k < U.length; k++) {
    s = U[k];
    if ((n = Math.max(0, bNeed(g, s, "firebrick") - wPocketedSure(g, "firebrick"))) > 0) out.push({ r: "firebrick", n: n, site: s.id });
    if ((n = wLimeWant(g, s) - wPocketedSure(g, "lime")) > 0) out.push({ r: "lime", n: n, site: s.id });
    if ((n = Math.max(0, bNeed(g, s, "stained") - wPocketedSure(g, "stained"))) > 0) out.push({ r: "stained", n: n, site: s.id });
  }
  /* and no coal in the valley to fire any of it with, nor to smelt a wonder's iron: charcoal, out of logs, onto the
     furnace's pile. last, so that a coal that does turn up goes on the order it was wanted for */
  var f = mSites(g, "furnace", true)[0];
  if (f && U.length && wPocketedSure(g, "coal") + ((f.stock && f.stock.coal) || 0) < W_CHAR) {
    for (k = 0; k < U.length; k++) {
      s = U[k];
      if (bNeed(g, s, "firebrick") > 0 || wLimeWant(g, s) > 0 || bNeed(g, s, "stained") > 0 || bNeed(g, s, "iron") > 0.01 || bNeed(g, s, "plate") > 0.01 || bNeed(g, s, "bell") > 0.01) { out.push({ r: "coal", n: W_CHAR, site: s.id }); break; }
    }
  }
  return out;
}
var W_CHAR = 4;     /* coals of charcoal burnt at a time, when there is no coal (two logs to a coal) */
function wGoKiln(g, p) {
  var f = mSites(g, "furnace", true)[0], k;
  if (!f || f.repair || Math.abs(f.cx - p.x) > 260 || wNoGo(g, p, f.id)) return false;
  /* (one at the bellows; two, with a long order in: forty firebricks for a foundry, say) */
  var at = 0, big = 0;
  for (k = 0; k < g.kiln.length; k++) big += g.kiln[k].r === "coal" ? 0 : g.kiln[k].n;
  for (k = 0; k < g.peasants.length; k++) { var t = g.peasants[k].task; if (!g.peasants[k].dead && t && t.kind === "kiln") at++; }
  if (at >= (big > 8 ? 2 : 1)) return false;
  /* the first order there are the makings for (the great work's come first: wKilnOrders). one that cannot be met, coloured
     glass with no pane in the valley, say, does not hold up the lime behind it */
  for (k = 0; k < g.kiln.length; k++) {
    var o = g.kiln[k], s = bSite(g, o.site);
    if (!s) continue;
    /* (the makings: a stone, somewhere to get it, and a coal. a pane, for stained glass) */
    if (o.r === "coal") { if ((p.logs || 0) < 2) continue; p.task = { kind: "kiln", site: f.id, r: "coal", of: o.site, n: 0, want: o.n, t: 0, act: 0 }; return true; }
    var stone = (p.stone || 0) + ((s.stock && s.stock.stone) || 0) + ((f.stock && f.stock.stone) || 0);
    if (o.r !== "stained" && stone < 1) continue;
    if (o.r === "stained" && (p.glass || 0) + ((f.stock && f.stock.glass) || 0) + ((s.stock && s.stock.glass) || 0) < 1) continue;
    if ((p.coal || 0) + ((f.stock && f.stock.coal) || 0) < 1 && !(o.r === "stained" && ((p.ore || 0) >= 1 || wCells(p.gold) >= 1))) continue;
    p.task = { kind: "kiln", site: f.id, r: o.r, of: o.site, n: 0, want: o.n, t: 0, act: 0 };
    return true;
  }
  return false;
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
  if (k.r !== "stained" && k.r !== "coal" && (p.stone || 0) < 1 && (st.stone || 0) < 1) {
    if ((ws.stone || 0) < 1) { if ((p[k.r] || 0) >= 1) { k.carry = true; return false; } return iDone(p, false); }
    var wf = wFoot(g, s), wat = wNear(g, s, 2);
    if (!wat(Math.floor(p.x), Math.floor(p.y))) { if (iWalk(g, p, k, "kstone" + s.id, wf.x, wf.y, wat)) pGiveUp(g, p, wf.x); return false; }
    var take = Math.min(ws.stone, Math.max(1, Math.ceil((k.want - k.n) / 2)));
    ws.stone -= take; p.stone = (p.stone || 0) + take;
    return true;
  }
  /* a pane for coloured glass, off the wonder's pile (its plain windows' panes: more are blown for those), if they have
     none and the furnace has none */
  if (k.r === "stained" && (p.glass || 0) < 1 && (st.glass || 0) < 1) {
    if ((ws.glass || 0) < 1) { if ((p.stained || 0) >= 1) { k.carry = true; return false; } return iDone(p, false); }
    var gf = wFoot(g, s), gat = wNear(g, s, 2);
    if (!gat(Math.floor(p.x), Math.floor(p.y))) { if (iWalk(g, p, k, "kglass" + s.id, gf.x, gf.y, gat)) pGiveUp(g, p, gf.x); return false; }
    var panes = Math.min(Math.floor(ws.glass), Math.max(1, k.want - k.n), L_POCKET.glass);
    ws.glass -= panes; p.glass = (p.glass || 0) + panes;
    return true;
  }
  var sx = f.sx, sy = mSpotRow(g, f), fy = Math.floor(p.y);
  if (Math.abs(p.x - sx - 0.5) > 1.5 || !mBySpot(g, fy, sy)) {
    if (iWalk(g, p, k, "kiln" + f.id, sx, sy, function (x, y) { return Math.abs(x - sx) <= 1 && mBySpot(g, y, sy); })) pGiveUp(g, p, sx);
    return false;
  }
  /* there: what they brought goes in, and they work the bellows */
  if (p.stone >= 1 && k.r !== "stained" && k.r !== "coal") { st.stone = (st.stone || 0) + Math.floor(p.stone); p.stone -= Math.floor(p.stone); }
  var coal = (st.coal || 0) >= 1 || (p.coal || 0) >= 1;
  var tint = k.r !== "stained" ? 1 : (wCells(p.gold) >= 1 && wRubyWanted(g, s) ? 1 : ((p.ore || 0) + (st.ore || 0) >= 1 || coal ? 1 : 0));
  var have = k.r === "coal" ? (p.logs || 0) >= 2 : k.r === "stained" ? ((p.glass || 0) + (st.glass || 0) >= 1 && tint) : ((st.stone || 0) >= 1 && coal);
  if (!have || k.n >= k.want) {
    if (!k.n && p.sayT <= 0) pSay(g, p, k.r === "stained" ? "noglass" : (coal ? "nostone" : "nocoal"));
    if ((p[k.r] || 0) >= 1 && k.r !== "coal") { k.carry = true; return false; }
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
  if (k.r === "coal") {
    /* (two logs, smothered and burnt slow: a coal of charcoal, onto the furnace's pile) */
    p.logs -= 2; st.coal = (st.coal || 0) + 1; k.n++;
    if (!g.wChar) { g.wChar = 1; feed(g, p.name + " burnt logs down to charcoal. there was no coal left in the valley", "#e0e0d4", "char"); }
  } else if (k.r === "stained") {
    if ((st.glass || 0) >= 1) st.glass--; else p.glass--;
    var tint;
    if (wCells(p.gold) >= 1 && wRubyWanted(g, s)) { p.gold = (wTenths(p.gold) - 2) / 10; tint = 0; }
    else if ((p.ore || 0) + (st.ore || 0) >= 1) { burn("ore"); tint = 1; } else { burn("coal"); tint = 2; }
    p.stained = (p.stained || 0) + 1; k.n++;
    /* (the pane is the colour of what went into it: red for gold, green for ore, amber for coal. the colour goes with
       the pane, in a pocket, on a pile, and into whichever window it is put in: build.js bTints) */
    (p.tints || (p.tints = [])).push(tint);
  } else {
    st.stone--; burn("coal");
    var out = 2;   /* (two of lime to a stone burnt; a stone cut in two and fired, two firebricks) */
    p[k.r] = (p[k.r] || 0) + out; k.n += out;
  }
  g.fx.clang++; g.kilnN = (g.kilnN || 0) + 1;   /* (a batch: the furnace worked once more. the organ counts them: pleasures.js) */
  sparks(g, f.fc + 0.5, f.G - 2, 8, 0.6, SPARK_HOT, 10, 0.4, PK_GLINT);
  if (k.r === "lime" && !g.got.concrete) { feed(g, p.name + " burnt the first lime. add sand and water, and stir", "#e0e0d4", "lime"); }
  if (k.n >= k.want) { if (k.r === "coal") { p.bored = 0; return iDone(p, true); } k.carry = true; }
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
  if (k.water && !p.pail) k.water = 0;   /* (spilt on the way: another) */
  if (!k.water) {
    var bar = iBarred(g, true);
    j = iScoopAt(g, fx, fy, true, bar);
    if (j >= 0 && !p.swimming && !LIQUID[pCell(g, fx, fy)]) {
      p.pose = (k.act >> 3) & 1 ? "eatB" : "stand";
      /* (the water in the pail, in their hands, heat and all, until it is mixed in: dropped, it is spilt. ideas.js iSpill) */
      if (++k.act === 16) { var load = iScoop(g, j, true); if (load && load.length) p.pail = load; k.water = load ? load.length : 0; k.act = 0; k.best = null; }
      return true;
    }
    if (k.t % 120 === 0) k.w = iFindWater(g, p, 200, null, true, bar, false) || k.w;
    if (!k.w) return iDone(p, false);
    if (iWalk(g, p, k, "mixw" + k.w.x, k.w.x, k.w.y, function (x, y) { return navStand(g, x, y) === 1 && !LIQUID[pCell(g, x, y)] && iScoopAt(g, x, y, true, bar) >= 0; })) pGiveUp(g, p, k.w.x);
    return false;
  }
  /* two spadefuls of sand, near the site (looked for from the foot of it: from the water's edge, all the sand in reach
     can be under the water, or at the far end of the valley) */
  if ((p.sand || 0) < 2) {
    if (!k.sx || !lSandy(g, k.sx, k.sy)) {
      var f0 = wFoot(g, s), ok0 = function (g2, x, y) { return !pAvoid(g2, p, x) && lSandy(g2, x, y); };
      var t = pFind(g, { x: f0.x + 0.5, y: f0.y, dir: p.x < f0.x ? -1 : 1 }, P_SANDY, 60, ok0, 10) || pFind(g, p, P_SANDY, 60, ok0, 10);
      if (!t) return iDone(p, false);
      k.sx = t.x; k.sy = t.y;
    }
    var go = lGo(g, p, k, "msand" + k.sx + "," + k.sy, k.sx, k.sy, 3, 10, 2);
    if (go <= 0) return false;
    p.dir = k.sx + 0.5 < p.x ? -1 : 1; k.act++;
    p.pose = (k.act % 16) < 8 ? "chopA" : "chopB";
    if (k.act % 16 !== 8) return true;
    heatVanish(g, k.sy * g.gw + k.sx); p.sand = (p.sand || 0) + 1; g.fx.thud++; k.sx = 0;   /* (in a pocket, not in the job: kept if it is given up) */
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
  p.sand -= 2; p.pail = null;   /* (the sand and the bucket of water, mixed in) */
  p.mortar = W_PAIL; p.mortarT = g.tick;
  pSay(g, p, "mixed", true);
  if (!g.got.concrete) { feed(g, p.name + " mixed the first concrete. hurry", "#e0e0d4", "concrete"); achieve(g, "concrete"); }
  bJoin(g, p, s);
  return true;
}
/* a pail gone off: tipped out, and a lump of concrete stands where they were */
/* CARRIED: what a peasant carries for a great work is never put down by them while they live but into its own cell of
   a plan (as it is paid for: build.js bPay). wet concrete that goes off in the pail is a lump, carried (p.lump): it is
   paid for a concrete cell with as wet concrete is, and goes in set, or onto a wonder's pile (wTaskHaul). dead, all of
   it goes into the salvage (wDropAll), and none of it is lost */
function wWentOff(g, p) {
  p.lump = (p.lump || 0) + (p.mortar || 0); p.mortar = 0;
  pSay(g, p, "wentOff", true);
  if (!g.wLump) { g.wLump = 1; feed(g, "the concrete went off in " + p.name + "'s pail. it is a lump now, and they are carrying it about", "#c8d0dc", "lump"); }
}
/* SALVAGE: what nothing but a great work has a use for, left by the dead (g.salvage, by resource, coloured glass with its
   colours in g.salvage.tints). never put down as a cell: kept, not in anybody's way, at the store by the furnace (or by
   the first great work, or where the last of it was left: wSalvageAt), and fetched from there by whoever a great work
   wants it for (wGoSalvage), as off a pile */
var W_KEEP = ["firebrick", "stained", "lime", "plate", "bell"];
var W_SALVAGE = W_KEEP.concat(["lump", "moonrock", "barrel"]);
/* dead: everything of a great work's they had, into the salvage. a barrel of oil, into the nearest well's tank with room
   in it, if there is one (peasants.js pDie) */
function wDropAll(g, p) {
  if ((p.mortar || 0) > 0) { p.lump = (p.lump || 0) + p.mortar; p.mortar = 0; }
  if (p.barrel && wTankIn(g, p)) p.barrel = 0;
  wSalvage(g, p);
}
/* the nearest well with room in its tank for a barrel, and the barrel in it. true if there was one */
function wTankIn(g, p) {
  var best = null, bd = 1e9, k, s;
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if (s.kind !== "well" || !s.done || s.repair || !(s.tank < O_TANK)) continue;
    if (Math.abs(s.cx - p.x) < bd) { bd = Math.abs(s.cx - p.x); best = s; }
  }
  if (!best) return false;
  best.tank++;
  return true;
}
/* what p has of a great work's (or of rs, only), into the salvage */
function wSalvage(g, p, rs) {
  var sv = null;
  (rs || W_SALVAGE).forEach(function (r) {
    if (!((p[r] || 0) > 0)) return;
    sv = sv || g.salvage || (g.salvage = {});
    sv[r] = (sv[r] || 0) + p[r];
    if (r === "stained") bTints(p, sv, p[r]);
    p[r] = 0;
  });
  if (sv) { sv.x = Math.floor(p.x); sv.y = Math.floor(p.y); if (!g.wSalv) { g.wSalv = 1; feed(g, "what " + p.name + " was carrying for the great works was kept. it is at " + wSalvageAt(g).name, "#c8d0dc", "salvage"); } }
}
/* where the salvage is kept: {x, y, name}. at the store by the furnace; with no furnace, by the first great work; with
   neither, where the last of it was left */
function wSalvageAt(g) {
  var f = mSites(g, "furnace", true)[0];
  if (f) return { x: f.sx, y: mSpotRow(g, f), name: "the store by the furnace" };
  var W = wSites(g);
  if (W.length) { var ft = wFoot(g, W[0]); return { x: ft.x, y: Math.max(9, Math.min(g.gh - 1, ft.y)), name: "the foot of " + bLabel(W[0]) }; }
  var sv = g.salvage || {}, x0 = Math.max(2, Math.min(g.gw - 3, sv.x || (g.gw >> 1)));
  return { x: x0, y: sv.y != null ? Math.max(9, Math.min(g.gh - 1, sv.y)) : Math.max(9, mGround(g, x0) - 1), name: "where it was left" };
}
/* what of a great work's p carries that none of them wants now (less what is on its way): into the salvage, where it is
   fetched from when one does */
function wSurplus(g, p) {
  var U = wSites(g).filter(function (t) { return !t.done || t.repair; });
  W_KEEP.concat(["lump"]).forEach(function (r) {
    if (!((p[r] || 0) > 1e-6)) return;
    var want = 0;
    for (var k = 0; k < U.length; k++) want += Math.max(0, (r === "lime" ? wLimeWant(g, U[k]) : bNeed(g, U[k], r === "lump" ? "mortar" : r)) - wInbound(g, U[k], r === "lump" ? "mortar" : r, p));
    if (want < 1e-6) wSalvage(g, p, [r]);
  });
}
/* where to stand to fetch from the salvage: the standing cell (navStand: ground, room, nothing deadly; in the world, not
   over the top of it) nearest where it is kept (wSalvageAt), beside the store. {x, y} or null */
function wSalvageSpot(g) {
  var a = wSalvageAt(g), C = [], d, x, y, k;
  /* (beside it: a few columns off, a few rows up or down. not at the foot of the cliff it stands on) */
  for (d = 0; d <= 12; d++) for (var sd = -1; sd <= 1; sd += 2) {
    x = a.x + sd * d;
    if (x < 1 || x > g.gw - 2) continue;
    for (y = Math.max(9, a.y - 8); y < g.gh && y <= a.y + 8; y++) if (SOLID[pCell(g, x, y + 1)] && navStand(g, x, y) === 1) C.push({ x: x, y: y, c: d + Math.abs(y - a.y) * 0.5 });
    if (!d) sd = 2;
  }
  C.sort(function (u, v) { return u.c - v.c; });
  /* (and one that can be walked to from where the village lives, and back: not the top of a shelf of rock over it, nor
     the far side of a drop nobody can climb back up. heavens.js hHome) */
  var home = hHome(g);
  for (k = 0; k < C.length && k < 200; k++) {
    var c = C[k], there = function (x2, y2) { return Math.abs(x2 - c.x) <= 2 && Math.abs(y2 - c.y) <= 4; };
    if (home.at(c.x, c.y) || (navFind(g, home.x, home.y, there, c.x, c.y, H_REACH) && navFind(g, c.x, c.y, home.at, home.x, home.y, H_REACH))) return { x: c.x, y: c.y };
  }
  return null;
}
/* someone who has lately given up getting to a great work (wBackoff, or bFail's failSite): what they carry is not to be
   counted on, for ordering more of it or leaving the salvage be */
function wStranded(g, q, r) {
  /* (a great work they could not get to: not the furnace's kiln, nor a job of no site, which says nothing of whether what
     they carry can get to a great work. and with r, one that wants r: kept off a foundry while it casts says nothing of
     whether the ninth of a bell in their pocket can get to the rocket) */
  function wants(t) { return t && t.wonder && (!r || (r === "iron" ? t.kind === "foundry" : bNeed(g, t, r) > 1e-6)); }
  if (q.failSite && q.failT > g.tick && wants(bSite(g, q.failSite))) return true;
  for (var id in q.noGo || {}) if (q.noGo[id] > g.tick && wants(bSite(g, +id))) return true;
  return false;
}
/* STOCK IN WHOLE UNITS: iron and gold are held in bars, as master holds them (floats: a girder costs a Float32 fifth of a
   bar, worn-out tools give back half a bar), so that a plain village's sums are master's to the last bit. but every amount
   there ever is of them is a whole number of TENTHS of a bar (a cell is two, a girder two, a refund five, a bar ten), and
   the great works count and hand them about in tenths, converted losslessly at the edge (wTenths: the nearest tenth,
   floats being off by a hundred-millionth at worst), never as a sum of fractions of bars. a cell is then counted out of the
   pooled tenths (wCells of a sum, not a sum of wCells: a bar and a half and half a bar are ten cells, not nine or eleven).
   a bell is in ninths (wNinths) */
function wTenths(v) { return Math.round((v || 0) * 10); }
function wCells(v) { return Math.floor(wTenths(v) / 2); }
function wNinths(v) { return Math.round((v || 0) * 9); }
/* the tenths of r in the pockets of the living who can get there; and the cells in them, counted from the pool */
function wTenthsSure(g, r) {
  var n = 0;
  for (var k = 0; k < g.peasants.length; k++) { var q = g.peasants[k]; if (!q.dead && !wStranded(g, q, r)) n += wTenths(q[r]); }
  return n;
}
function wCellsSure(g, r) { return Math.floor(wTenthsSure(g, r) / 2); }
/* up to n tenths of r into p's pocket from the pockets of the living who can get there: how many came (tenths, exactly) */
function wGatherTenths(g, p, r, n) {
  var got = 0;
  for (var k = 0; k < g.peasants.length && got < n; k++) {
    var q = g.peasants[k];
    if (q === p || q.dead || wStranded(g, q, r)) continue;
    var c = wTenths(q[r]), t = Math.min(c, n - got);
    if (t > 0) { q[r] = (c - t) / 10; got += t; }
  }
  return got;
}
/* what of r is in the pockets of the living who are not stranded: to be counted on */
function wPocketedSure(g, r) {
  var n = 0;
  for (var k = 0; k < g.peasants.length; k++) { var q = g.peasants[k]; if (!q.dead && !wStranded(g, q, r)) n += q[r] || 0; }
  return n;
}
/* what of r there is in the salvage that can be got at (a spot to fetch it from that the village can walk to) */
function wSalvageSure(g, r) {
  var sv = g.salvage;
  if (!sv || !((sv[r] || 0) > 1e-6)) return 0;
  /* (and not while a fetch from it has lately come to nothing: wTaskSalvage, pGiveUp. it is the proof of it) */
  if (g.wSalvNo > g.tick) return 0;
  return wSalvageSpot(g) ? sv[r] : 0;
}
/* a fetch from the salvage that came to nothing: not counted on, for a while (wSalvageSure) */
function wSalvageFailed(g, p) { g.wSalvNo = g.tick + 6000; wBackoff(g, p, "salvage"); }
/* how much of r in the salvage is wanted now, by a great work, or (moon rock) by everybody */
function wSalvageWant(g, r) {
  var sv = g.salvage, n = 0, k, s;
  if (!sv || !((sv[r] || 0) >= (r === "bell" ? 1e-6 : 1))) return 0;
  if (r === "moonrock") return sv[r];
  if (r === "barrel") {
    for (k = 0; k < g.sites.length; k++) { s = g.sites[k]; if (s.done && !s.repair && ((s.kind === "moonrocket" && !s.gone && (s.oil || 0) < H_FUEL) || (s.kind === "lighthouse" && s.fuel < H_BARREL))) return 1; }
    return 0;
  }
  var S = wSites(g).filter(function (t) { return !t.done || t.repair; });
  for (k = 0; k < S.length; k++) n += Math.max(0, r === "lime" ? wLimeWant(g, S[k]) : bNeed(g, S[k], r === "lump" ? "mortar" : r));
  /* (less what is in pockets already, to be hauled there: nothing fetched that would only be left over) */
  n -= r === "lump" ? wPocketedSure(g, "lump") + wPocketedSure(g, "mortar") : wPocketedSure(g, r);
  if (n <= 1e-6) return 0;
  /* (a bell is wanted in ninths, a cell of it to mend: fetched so. the rest, a whole one at a time) */
  return Math.min(sv[r], r === "bell" ? n : Math.ceil(n - 1e-6));
}
/* somebody to fetch what is wanted out of the salvage: one at a time */
function wGoSalvage(g, p) {
  if (!g.salvage || p.salvT > g.tick || p.barrel || wNoGo(g, p, "salvage")) return false;
  p.salvT = g.tick + 300;
  for (var k = 0; k < g.peasants.length; k++) { var q = g.peasants[k]; if (!q.dead && q.task && q.task.kind === "salvage") return false; }
  for (var i = 0; i < W_SALVAGE.length; i++) if (wSalvageWant(g, W_SALVAGE[i]) >= (W_SALVAGE[i] === "bell" ? 1e-6 : 1)) { p.task = { kind: "salvage", t: 0 }; return true; }
  return false;
}
function wTaskSalvage(g, p, k) {
  if (!g.salvage) return iDone(p, false);
  if (++k.t > 3000) { wSalvageFailed(g, p); return iDone(p, false); }
  var at = k.at;
  if (!at || navStand(g, at.x, at.y) !== 1) { at = k.at = wSalvageSpot(g); if (!at) { wSalvageFailed(g, p); return iDone(p, false); } }
  if (Math.abs(p.x - at.x - 0.5) > 2 || Math.abs(Math.floor(p.y) - at.y) > 4) {
    if (iWalk(g, p, k, "salvage", at.x, at.y, function (x, y) { return Math.abs(x - at.x) <= 2 && Math.abs(y - at.y) <= 4; })) { wSalvageFailed(g, p); pGiveUp(g, p, at.x); }
    p.idle = 0;
    return false;
  }
  var sv = g.salvage, got = 0;
  W_SALVAGE.forEach(function (r) {
    var n = Math.min(r === "barrel" ? 1 : 8, wSalvageWant(g, r));
    if (r === "barrel" && p.barrel) n = 0;
    if (r === "bell" ? n <= 1e-6 : n < 1) return;
    if (r === "bell") { sv[r] = (wNinths(sv[r]) - wNinths(n)) / 9; p[r] = (wNinths(p[r]) + wNinths(n)) / 9; }   /* (in ninths: wNinths) */
    else { sv[r] -= n; p[r] = (p[r] || 0) + n; }
    got += n;
    if (r === "stained") bTints(sv, p, n);
  });
  if (W_SALVAGE.every(function (r) { return !((sv[r] || 0) > 1e-6); })) g.salvage = null;
  if (!got) wBackoff(g, p, "salvage", 600);
  p.idle = 20;
  return iDone(p, got > 0);
}

/* -------------------------------------------------------------------
   IRON, AND GOLD
   ------------------------------------------------------------------- */
/* a wonder going up wants iron: new tools wait for iron to spare (mines.js mGoForge), props and posts wait as they do */
function wIronHeld(g) {
  if (g.wIronTest) return true;
  for (var k = 0; k < g.sites.length; k++) { var s = g.sites[k]; if (s.wonder && !s.done && (bNeed(g, s, "iron") > 0.01 || bNeed(g, s, "plate") > 0.01 || bNeed(g, s, "bell") > 0.01)) return true; }   /* (plates and an engine bell are iron, cast: heavens.js) */
  return false;
}
/* gold in a plan is gilding: with no gold about (in pockets, or on piles), a stone stand-in, gilded later */
function wGild(g, plan) {
  var gold = wPocketedSure(g, "gold"), k, e;
  for (k = 0; k < g.sites.length; k++) gold += (g.sites[k].stock && g.sites[k].stock.gold) || 0;
  for (k = 0; k < plan.length; k++) {
    e = plan[k];
    if (e.v !== MAT.GOLD) continue;
    e.gild = true;   /* (gold or not, gilding: wGoldGone) */
    if (gold >= B_AMT[MAT.GOLD] - 1e-6) { gold -= B_AMT[MAT.GOLD]; continue; }
    e.v = MAT.BRICK;
  }
  return plan;
}
/* gilding still to go in, and no gold in the valley for it now (spent, or gone with whoever carried it): its stand-in
   instead (stone, or what the plan says: e.alt), gilded later if gold turns up. gold is never what a great work waits
   for. every W_STRIDE ticks, for one going up */
function wGoldGone(g, s) {
  var gold = -1;
  for (var k = 0; k < s.plan.length; k++) {
    var e = s.plan[k];
    if (e.v !== MAT.GOLD || !e.gild || bOk(g, e)) continue;
    if (gold < 0) { gold = wPocketedSure(g, "gold") + ((s.stock && s.stock.gold) || 0); }
    if (gold >= B_AMT[MAT.GOLD] - 1e-6) { gold -= B_AMT[MAT.GOLD]; continue; }
    e.v = e.alt || MAT.BRICK; if (e.v === MAT.PLANK) e.paint = true;
  }
}
/* a wonder with a stand-in in it, and gold about now: gilded, as a repair */
function wRegild(g, s) {
  var n = 0, k, e;
  /* (the gold gone again, on something else, before the gilding was done: left as it is, stone where the gold was to go,
     until there is gold again. a mending that waits for ever is a great work going up for ever) */
  /* (and a gilded cell gone, to be mended, with no gold to mend it with: mended in its stand-in, as wGoldGone does for one
     going up. gold is never waited for) */
  if (s.gilding && s.repair && !s.done && s.plan.some(function (e2) { return e2.gild && e2.v === MAT.GOLD && !bOk(g, e2) && g.m[e2.i] !== MAT.BRICK; })) wGoldGone(g, s);
  if (s.gilding && s.repair && !s.done && g.tick - s.last > 3000 && Math.floor((wTenthsSure(g, "gold") + wTenths(s.stock && s.stock.gold)) / 2) < 1) {
    for (k = 0; k < s.plan.length; k++) { e = s.plan[k]; if (e.gild && e.v === MAT.GOLD && g.m[e.i] === MAT.BRICK) { e.v = MAT.BRICK; n++; } }
    if (!s.plan.some(function (e2) { return !bOk(g, e2) && bFree(g, e2); })) { s.done = true; s.repair = false; s.gilding = false; s.quiet = false; }
    return;
  }
  if (!s.done || s.repair || wCellsSure(g, "gold") < 2) return;
  for (k = 0; k < s.plan.length; k++) { e = s.plan[k]; if (e.gild && e.v === MAT.BRICK && g.m[e.i] === MAT.BRICK) { e.v = MAT.GOLD; n++; } }
  if (!n) return;
  s.done = false; s.repair = true; s.gilding = true; s.last = g.tick; s.helped = {}; s.quiet = true;
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
/* free for a job (with s: a job at site s, and not somebody who has lately given up getting there: wBackoff. not bFail's
   failSite, which is set for a cell that could not be done, as much as for a site that could not be got to). EVERY job a great work hands somebody goes through here, with its site: the cast, the crypt's bailer, the
   preacher, the astronomer, the founder, the keeper, the fueller, the crew, the stoker, the gardens' turner and filler,
   the organist, the ice palace's hands, an audience. so nobody is sent, time after time, where they cannot get */
function wIdle(g, p, s) {
  return !p.dead && p.state === "walk" && !p.sleep && !p.fire && p.panic <= 0 && p.hunger < P_HUNGRY && p.cold < 60 &&
         !p.climb && !p.rope && !p.swimming && (!p.task || I_FUN[p.task.kind]) &&
         !(s && wNoGo(g, p, s.id));
}
/* a gathering at site s: up to cap of the idle within R of (x), each to a seat ({x, y}: where their feet go) if there
   are seats, else to stand about in front, until until. kind names it, for their mood. how many came */
function wGather(g, s, o) {
  var n = 0, k, q, seats = o.seats || [], used = {};
  for (k = 0; k < g.peasants.length; k++) if (g.peasants[k].task && g.peasants[k].task.kind === "audience" && g.peasants[k].task.site === s.id) { n++; if (g.peasants[k].task.seat >= 0) used[g.peasants[k].task.seat] = 1; }
  for (k = 0; k < g.peasants.length && n < (o.cap || 99); k++) {
    q = g.peasants[k];
    if ((o.but && o.but[q.id]) || !wIdle(g, q, s) || Math.abs(q.x - s.cx) > (o.R || 200)) continue;
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
  /* (a wonder that wants a look every tick, while it stands: the organ, listening at its pipes. pleasures.js) */
  if (g.wTick) for (var t = 0; t < g.sites.length; t++) { var ts = g.sites[t], td = ts.wonder && wOf(ts.kind); if (td && td.tick) td.tick(g, ts); }
  /* (and every tick: whatever of theirs is in the air, a falling star or a rocket, or a beam going round. heavens.js) */
  for (var k0 = 0; k0 < W_DEFS.length; k0++) if (W_DEFS[k0].air) W_DEFS[k0].air(g);
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
  /* (a wonder's own look at whether anybody has had it put into their head: no dice. pleasures.js) */
  for (k = 0; k < W_DEFS.length; k++) if (W_DEFS[k].watch && !g.know[W_DEFS[k].id]) W_DEFS[k].watch(g);
  if (!any) return;
  g.ironSpare = wIronHeld(g) ? W_IRON_HOLD : M_IRON_SPARE;   /* (on g: kept with the village it is about. mines.js mIronSpare) */
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
    if (s.done || s.gilding) wRegild(g, s); else wGoldGone(g, s);
    wLayBy(g, s);
    s.note = (s.laid ? "laid by: " : "") + wNote(g, s);
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
  if (wStoneShort(g, s) > 1e-6) return (g.wQuarryNo > g.tick ? "waiting for stone (nowhere left to cut it)" : "waiting for stone (somebody is quarrying it)");
  var e = bNext(g, s, null);
  if (e && e.v === MAT.CONCRETE && !(s.stock && s.stock.lime >= 1) && wPocketedSure(g, "mortar") < 1) return "waiting for lime from the kiln";
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
  s.laid = false;
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
  if (p.aboard && !hAboardOf(g, p)) return "is shut in the rocket, waiting for somewhere to get out to";
  if (!k) return (p.mortar || 0) >= 1 ? "is carrying a pail of wet concrete. it is going off" : ((p.lump || 0) >= 1 ? "is carrying a lump of concrete that went off. it wants putting down" : "");
  if (k.kind === "salvage") return "is fetching what was left for the great works, from " + wSalvageAt(g).name;
  if (k.kind === "haul") return (s = bSite(g, k.site)) ? "is taking " + (mPockets(p) || "something") + " to " + bLabel(s) : "is carrying things";
  if (k.kind === "quarry") return k.haul ? "is carrying stone up out of the quarry" : "is cutting stone for the great work" + ((p.stone || 0) >= 1 ? ". " + Math.floor(p.stone) + " so far" : "");
  if (k.kind === "mix") return !k.water ? "is fetching water to mix concrete with" : ((p.sand || 0) < 2 ? "is digging sand for the concrete" : "is mixing concrete");
  if (k.kind === "kiln") return k.carry ? "is carrying " + k.r + " from the kiln" : "is burning " + (k.r === "coal" ? "charcoal" : k.r) + " at the furnace";
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
   and down under it: a wonder that takes it rough makes it level, a
   terrace of stone under the low side, wTerrace), near (a column to be
   near), edge (rather near an edge of the valley), pad (columns kept
   clear either side), fit(g, x0, gy, hi, lo) (the wonder's own say: a
   score, the higher the better, or null)}. never on a house, a field, a
   mine, a pond or the heap, or anybody's site; never over water, fire
   or anything that goes bang. {x0, gy (the ground, column by column),
   hi, lo, score, r (what fit said)} or null
   ------------------------------------------------------------------- */
function wPlot(g, o) {
  var best = null, W = o.w, pad = o.pad == null ? 3 : o.pad, sky = o.sky || 12, x0, x, y, k, c, gy, hi, lo, ok, r, sc;
  for (x0 = 6 + pad; x0 + W - 1 < g.gw - 6 - pad; x0++) {
    gy = []; hi = 1e9; lo = -1; ok = true;
    for (x = x0; x < x0 + W && ok; x++) {
      y = o.floor != null ? mGroundNear(g, x, true, o.floor) : mGround(g, x, true);   /* (o.floor: the floor about level with that row, under a shelf, say: monuments.js) */
      if (y < 10 || !pSolid(g, x, y)) { ok = false; break; }
      gy.push(y); hi = Math.min(hi, y); lo = Math.max(lo, y);
    }
    if (!ok || lo - hi > (o.rough == null ? 4 : o.rough) || hi - sky < 4) continue;
    if (g.tip && x0 <= g.tip.x + 8 && x0 + W - 1 >= g.tip.x - 8) continue;   /* (the heap: tidy.js. its site has room about it already) */
    for (k = 0; k < g.sites.length && ok; k++) {
      var t = g.sites[k];
      if (x0 + W - 1 + pad >= t.x0 && x0 - pad <= t.x1 && lo + 4 >= t.y0 && hi - sky <= t.y1) ok = false;
    }
    for (y = hi - sky; y <= lo + 2 && ok; y++) for (x = x0 - 2; x <= x0 + W + 1 && ok; x++) {
      c = pCell(g, x, y);
      if (LIQUID[c] || HOT[c] || c === MAT.DRAIN || P_BANG[c]) ok = false;
    }
    /* open sky over it: air, or what a spade (or an axe) can clear (a bush, a tree: cleared first) */
    var clear = [];
    for (x = x0; x < x0 + W && ok; x++) for (y = hi - sky; y < gy[x - x0]; y++) {
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
/* would plan (by a lake, on its bank or out over it) leave somebody in the water with no way out of it that they had
   before: a deck laid over the only beach, say. looked at from the water's top and its floor, a few columns out
   from xa .. xb, with the plan put in for the moment it looks (and taken out again) */
function wSeals(g, plan, xa, xb) {
  var starts = [], x, y, k, j, d, sd, held = [], ok = true, G = pDryGoal(g);
  for (sd = -1; sd <= 1; sd += 2) for (d = 1; d <= 30; d += 4) {
    x = sd < 0 ? xa - d : xb + d;
    if (x < 1 || x > g.gw - 2) continue;
    for (y = 1; y < g.gh - 1 && !WET[g.m[y * g.gw + x]]; y++) if (!AIRY[g.m[y * g.gw + x]] && !bMarked(g, x, y)) break;
    if (y >= g.gh - 1 || !WET[g.m[y * g.gw + x]]) continue;
    var top = y;
    while (y < g.gh - 1 && WET[g.m[(y + 1) * g.gw + x]]) y++;
    starts.push([x, top], [x, y]);
  }
  if (!starts.length) return false;
  var before = starts.map(function (s0) { return !!navFind(g, s0[0], s0[1], G, xa, s0[1] - 6, 6000); });
  for (k = 0; k < plan.length; k++) { j = plan[k].i; held.push(j, g.m[j]); g.m[j] = plan[k].v; }
  try {
    for (k = 0; k < starts.length && ok; k++) if (before[k] && WET[g.m[starts[k][1] * g.gw + starts[k][0]]] && !navFind(g, starts[k][0], starts[k][1], G, xa, starts[k][1] - 6, 6000)) ok = false;
  } finally { for (k = held.length - 2; k >= 0; k -= 2) g.m[held[k]] = held[k + 1]; }
  return !ok;
}
/* the ground under a great work made level at row F (the floor's row: solid, under it all): dug off where it is higher,
   made up in stone where it is lower, a terrace, from the ground up. {plan, work} or null */
function wTerrace(g, x0, gy, F) {
  var plan = [], work = 0, u, x, y, c, e;
  for (u = 0; u < gy.length; u++) {
    x = x0 + u;
    for (y = gy[u]; y < F; y++) {
      c = pCell(g, x, y);
      if (AIRY[c]) continue;
      if (bMarked(g, x, y) || (!B_DIG[c] && !ROCK[c] && !mClear(g, x, y, c))) return null;
      /* (sand dug more than a couple of rows down into a bank comes down on whoever is digging: made up instead) */
      if (B_DIG[c] && F - y > 2) return null;
      e = bE(g, x, y, MAT.EMPTY, 0); if (ROCK[c]) e.mine = true; plan.push(e); work += 2;
    }
    for (y = gy[u] - 1; y >= F; y--) { plan.push(bE(g, x, y, MAT.BRICK, wFillPh(y))); work++; }
  }
  return { plan: plan, work: work };
}
/* a terrace's phase, row by row: the bottom row first, all the way along, then the next. built a cell at a time
   wherever it touches something, it would go in from the side walls over the rows under it, and leave those where
   nobody standing on top can reach them (a phase between the clearing, 0, and anything of the wonder's own, 1 on) */
function wFillPh(y) { return 1 - y / 1000; }
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
  /* (what the dead left for them, and where it is kept) */
  var sv = g.salvage;
  if (sv && W_SALVAGE.some(function (r) { return (sv[r] || 0) >= 1; })) {
    R.push(["#", "LEFT FOR THEM, AT " + wSalvageAt(g).name.toUpperCase()]);
    W_SALVAGE.forEach(function (r) { if ((sv[r] || 0) >= 1) R.push([r === "lump" ? "concrete, gone off" : (r === "stained" ? "coloured glass" : (r === "moonrock" ? "moon rock" : r)), String(Math.floor(sv[r])), "#c8d0dc"]); });
  }
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
  /* (and what is in the sky, whatever site it came of: falling stars, a rocket, a flag on the moon. heavens.js) */
  for (k = 0; k < W_DEFS.length; k++) if (W_DEFS[k].sky) hot += W_DEFS[k].sky(g) || 0;
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
