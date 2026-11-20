/* =====================================================================
   PLEASAND  --  pleasures.js

   the great works that are for enjoying (wonders.js has what they
   share):
     THE BATHS   a concrete basin sunk in the ground, nine wide and
                 three deep, filled bucket by bucket from real water.
                 under its floor a flue, with a firebrick stoke-hole
                 at one end and a brick chimney at the other, and a
                 colonnade behind it all. the stoker keeps a coal
                 burning in the flue while the water is cool, and the
                 heat comes up through the floor: it is all the heat
                 simulation. warm, it is a bath (the cold and the
                 bored go and sit in it, and talk about whoever is
                 not there). too hot, and they are out of it, and
                 shouting at the stoker
     THE HANGING GARDENS   no room for another field, so: up. three
                 terraces, a pool at the foot, a cistern at the top, and
                 an archimedes screw between them. the same water, round
                 and round
     THE STEAM ORGAN   a boiler, a tank, and seven pipes. fired before
                 a show; every puff of steam out of a pipe is its note.
                 it rains afterwards
     THE DUCK PALACE   a deck out over the water, a dome, nests, and a
                 trough of seed kept back from the harvest. the ducks eat
                 there instead of the wheat. mostly
     THE ICE PALACE    the player's freeze, and the snow lying about,
                 built into a palace before it thaws. it melts. they
                 build it again
   ===================================================================== */
"use strict";

var P_BATH_W = 15;          /* the baths, across: stoke-hole, basin, chimney */
var P_BATH_LO = 33, P_BATH_HI = 40;   /* the stoker stokes under this, and rakes the fire out over that */
var P_BATHERS = 6;          /* in the water at once, at most */

P_SAY.idea_baths = ["what if the pond. but warm", "brr. what if it were warm", "a pond with a fire under it", "hot water. on purpose"];
P_SAY.planBaths = ["baths! warm ones!", "a pond, but concrete. and hot", "a fire under a pond. trust me", "we'll never be cold again"];
P_SAY.stoke = ["more coal", "*clunk*", "keep it warm", "in you go", "a bit more"];
P_SAY.stoked = ["that'll do", "it's warm enough now", "lovely", "don't touch it"];
P_SAY.eldest = ["it's too cold", "it's too hot", "in my day we had the pond", "it was warmer yesterday", "who stoked this? too much"];
P_SAY.shout = ["WHO STOKED IT", "IT'S BOILING", "TOO HOT, STOKER", "you'll cook us all"];
P_SAY.rake = ["ash. always ash", "*scrape*", "who left all this ash"];

wDef({
  id: "baths",
  idea: { name: "the baths", title: "THE BATHS", sub: "what if the pond. but warm", hint: "concrete, a lot of coal, and a good many swims",
          ready: function (g) { return !!g.know.concrete && (g.found.coal || 0) >= 20 && (g.swims || 0) >= 10; } },
  achieve: ["THE BATHS", "a pond, but warm. somebody has to keep the fire going. nobody is cold any more"],
  plan: pPlanBaths,
  pick: pBathsPick,
  warm: pBathsWarm,
  task: function (g, p, k) { return k.kind === "bathe" ? pTaskBathe(g, p, k) : (k.kind === "stoke" ? pTaskStoke(g, p, k) : undefined); },
  step: pBathsStep,
  partOfIt: pInTheFlue,
  draw: pDrawBaths,
  finish: function (g, s, p) { feed(g, "the baths are built. now they want filling, a bucket at a time", "#ffd94a", "plan" + s.id); },
  label: function () { return "the baths"; },
  readout: function (g, s) {
    if (!s.done) return "";
    var n = wBathNeed(g, s), t = pBathT(g, s);
    if (n > 6) return "filling: " + (27 - n) + " of 27 cells of water";
    return "the water is " + Math.round(t) + "°" + (t < W_BATH_LO ? ". cold" : (t > P_SWEAT ? ". far too hot" : (t > W_BATH_HI ? ". hot" : ". just right")));
  },
  mood: function (g, p, k) {
    if (k.kind === "bathe") return Math.abs(p.bathT - g.tick) < 40 ? "is in the baths. warm all the way through" : "is off for a soak at the baths";
    if (k.kind === "stoke") return k.coal ? "is stoking the fire under the baths" : "is fetching coal for the baths";
    return "";
  }
});
/* the baths at x0, on ground gy: the water's top at G, level with the ground (sunk), and everything under it dug out of
   sand. {plan, G, score} or null */
function pBathsFit(g, x0, gy, hi, lo) {
  var G = Math.max(hi, lo - 1), plan = [], u, x, y, c, v, sand = 0;
  function put(u, y, v, ph) { plan.push(bE(g, x0 + u, y, v, ph)); }
  for (u = 0; u < P_BATH_W; u++) {
    x = x0 + u;
    /* everything from the ground down to the flue's floor, and the ground above G at the high end: sand, dug out */
    for (y = Math.min(gy[u], G); y <= G + 5; y++) {
      c = pCell(g, x, y);
      if (!AIRY[c] && !B_DIG[c] && !ROCK[c]) return null;   /* (sand is dug, rock is cut: the sand is only five deep) */
      if (!AIRY[c]) sand += ROCK[c] ? 2 : 1;
    }
    for (y = G + 6; y <= G + 7; y++) if (!pSolid(g, x, y)) return null;   /* (and firm under it all) */
  }
  for (u = 0; u < P_BATH_W; u++) {
    x = x0 + u;
    for (y = G - 5; y <= G + 5; y++) {
      /* (over the water's top: the chimney, up out of the ground, and nothing else) */
      v = y < G ? (u === 12 || u === 14 ? MAT.BRICK : MAT.EMPTY) : pBathCell(u, y - G);
      c = pCell(g, x, y);
      if (v === MAT.EMPTY && AIRY[c]) continue;
      if (v !== MAT.EMPTY && ROCK[c]) continue;   /* (rock where a wall goes is the wall) */
      put(u, y, v, v === MAT.EMPTY ? (ROCK[c] ? 1 + y - G : 0) : 10 + (G + 5 - y));
      if (v === MAT.EMPTY && ROCK[c]) plan[plan.length - 1].mine = true;
    }
  }
  return { plan: plan, G: G, score: 20 - sand * 0.05 - (lo - hi) * 2 };
}
/* what goes at column u (0..14) of the baths, dy rows down from the water's top (0..5) */
function pBathCell(u, dy) {
  if (u === 0) return MAT.FIREBRICK;                                       /* the stoke-hole's outer wall */
  if (u === 1) return dy === 5 || dy === 3 ? MAT.FIREBRICK : MAT.EMPTY;   /* the stoke-hole, its hatch, and the hearth under it */
  if (dy === 5) return u <= 6 ? MAT.FIREBRICK : MAT.CONCRETE;              /* the flue's floor */
  if (dy === 4) return u === 14 ? MAT.BRICK : MAT.EMPTY;                   /* the flue, along under the basin */
  if (u === 2 || u === 12) return MAT.CONCRETE;                            /* the basin's walls */
  if (dy === 3) return u === 13 ? MAT.EMPTY : (u === 14 ? MAT.BRICK : MAT.CONCRETE);   /* its floor; the chimney */
  if (u === 13) return MAT.EMPTY;
  if (u === 14) return MAT.BRICK;
  return MAT.EMPTY;                                                         /* the water */
}
function pPlanBaths(g, p) {
  var r = wPlot(g, { w: P_BATH_W, sky: 14, rough: 4, near: wMiddle(g), fit: pBathsFit });
  if (!r) return false;
  var x0 = r.x0, G = r.r.G;
  var s = bNew(g, "baths", p, wCleared(g, r, r.r.plan), [x0, G - 13, x0 + P_BATH_W - 1, G + 5],
               { wonder: true, G: G, bath: true, L: G, px0: x0 + 3, S: [G + 3, G + 3, G + 3, G + 3, G + 3, G + 3, G + 3, G + 3, G + 3] });
  feed(g, p.name + " is building baths. warm ones", "#ffd94a", "plan" + s.id);
  pSay(g, p, "planBaths", true);
  if (bCarries(p)) bJoin(g, p, s);
  return true;
}
/* the dry cells of the basin, and how warm the water in it is */
function wBathNeed(g, s) {
  var n = 0, bw = s.bw || 9, bh = s.bh || 3;   /* (nine by three, the baths; the gardens' pool and the organ's say their own) */
  for (var x = s.px0; x < s.px0 + bw; x++) for (var y = s.L; y < s.L + bh; y++) if (AIRY[pCell(g, x, y)]) n++;
  return n;
}
function pBathT(g, s) {
  var t = 0, n = 0;
  for (var x = s.px0; x < s.px0 + 9; x++) for (var y = s.L; y < s.L + 3; y++) { var j = y * g.gw + x; if (WET[g.m[j]] || g.m[j] === MAT.ICE) { t += g.T[j]; n++; } }
  return n ? t / n : AMBIENT;
}
function pBathers(g, s) { return g.peasants.filter(function (q) { return !q.dead && q.task && q.task.kind === "bathe" && q.task.site === s.id; }); }
/* a soak: in, and sit in it a while */
function pGoBathe(g, p, s, cold) {
  if (pBathers(g, s).length >= P_BATHERS || (p.hotBath || 0) > g.tick) return false;
  var x = s.px0 + 1 + ((p.id * 3) % 7);
  p.task = { kind: "bathe", site: s.id, x: x, y: s.L + 2, t: 0, cold: !!cold, stay: 500 + irnd(400) };
  return true;
}
function pBathsReady(g, s) { if (!s || !s.done || s.repair || wBathNeed(g, s) > 6) return false; var t = pBathT(g, s); return t >= W_BATH_LO && t <= W_BATH_HI; }
/* cold: a warm bath, before a campfire */
function pBathsWarm(g, p) {
  var s = mSites(g, "baths", true)[0];
  if (!pBathsReady(g, s) || Math.abs(s.cx - p.x) > 220) return false;
  return pGoBathe(g, p, s, true);
}
/* the bored, at a quiet moment: a soak. and the baths, while they are dry, want filling */
function pBathsPick(g, p, hungry) {
  var s = mSites(g, "baths", true)[0];
  if (!s || hungry) return false;
  if (g.know.bucket && wBathNeed(g, s) > 3 && iCrew(g, "bucket", s.id) < I_POND_CREW && Math.random() < 0.5) {
    var w = iFindWater(g, p, 200, null, true, iBarred(g, s), true);
    if (w) { p.task = { kind: "bucket", pond: s.id, t: 0, act: 0, w: w }; return true; }
  }
  if (pBathsReady(g, s) && Math.abs(s.cx - p.x) < 200 && (p.bored > 400 || p.cold > 0) && Math.random() < 0.12) return pGoBathe(g, p, s, p.cold > 0);
  return false;
}
function pTaskBathe(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || !s.done || ++k.t > 3000) return iDone(p, false);
  var fx = Math.floor(p.x), fy = Math.floor(p.y), t = pBathT(g, s);
  if (t > P_SWEAT) { p.hotBath = g.tick + 600; if (p.sayT <= 0) pSay(g, p, "tooHot", true); return iDone(p, false); }
  if (fx < s.px0 || fx > s.px0 + 8 || fy < s.L || fy > s.L + 2) {
    if (t < W_BATH_LO - 4) return iDone(p, false);
    if (iWalk(g, p, k, "bath" + s.id, k.x, k.y, function (x, y) { return x >= s.px0 && x <= s.px0 + 8 && y >= s.L && y <= s.L + 2; })) pGiveUp(g, p, k.x);
    return false;
  }
  /* in: a long sit in the warm. (wBathe sees to the cold, and the talking) */
  if (!k.in) { k.in = g.tick; if (p.sayT <= 0) pSay(g, p, "bathe", true); }
  p.idle = 0; p.dir = (p.id & 1) ? 1 : -1;
  if (g.tick - k.in > k.stay && !(k.cold && p.cold > 0)) { p.bored = 0; return iDone(p, true); }
  return true;
}
/* the flue: from the stoke-hole end along under the basin (u 1, under the stoke-hole, is the hearth) */
function pFlue(g, s, u) { return (s.G + 4) * g.gw + s.x0 + u; }
/* the fire: any coal still burning in the hearth or along the flue */
function pBurning(g, s) { for (var u = 1; u <= 13; u++) if (g.m[pFlue(g, s, u)] === MAT.EMBER) return true; return false; }
/* the stoker: on duty while the water wants it. a coal in the hearth (lit: it burns a good long while) whenever it is
   under P_BATH_LO and nothing is burning; and once it is over P_BATH_HI, the fire raked out, and they say so */
function pTaskStoke(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || !s.done) return iDone(p, false);
  var t = pBathT(g, s), hot = pBurning(g, s);
  if (++k.t > 12000 && !hot) return iDone(p, false);
  /* coal first, if a coal is going to be wanted: their own, or off whoever has some close by, or off the furnace's pile */
  if (!k.coal && (p.coal || 0) < 1 && !hot) {
    if (iChipIn(g, "coal", 1, p.x, 6)) p.coal = (p.coal || 0) + 1;
    else {
      var f = mSites(g, "furnace", true)[0];
      if (!f || !f.stock || (f.stock.coal || 0) < 1) { if (p.sayT <= 0) pSay(g, p, "nocoal"); return iDone(p, false); }
      var fsx = f.sx, fsy = mSpotRow(g, f);
      if (Math.abs(p.x - fsx - 0.5) > 1.5 || Math.abs(Math.floor(p.y) - fsy) > 3) {
        if (iWalk(g, p, k, "coal" + f.id, fsx, fsy, function (x, y) { return Math.abs(x - fsx) <= 1 && Math.abs(y - fsy) <= 3; })) pGiveUp(g, p, fsx);
        return false;
      }
      var n = Math.min(3, f.stock.coal); f.stock.coal -= n; p.coal = (p.coal || 0) + n;
    }
  }
  k.coal = true;
  /* then the stoke-hole: standing over it */
  var sx = s.x0 + 1, sy = s.G - 1, fy = Math.floor(p.y);
  if (Math.abs(p.x - sx - 0.5) > 1.5 || Math.abs(fy - sy) > 2) {
    if (iWalk(g, p, k, "stoke" + s.id, sx, sy, function (x, y) { return Math.abs(x - sx) <= 1 && Math.abs(y - sy) <= 2; })) pGiveUp(g, p, sx);
    return false;
  }
  p.dir = 1; p.idle = 0; k.act++;
  p.pose = hot || (k.act % 60) < 30 ? "stand" : ((k.act % 16) < 8 ? "chopA" : "chopB");
  if (k.act % 30 !== 0) return true;
  var u, j;
  if (t > P_BATH_HI || (k.t > 12000 && hot)) {   /* (warm enough; or the end of a long shift, and nobody to leave it to) */
    /* warm enough: the fire raked out (what is burning goes to ash, and keeps its heat). they say so */
    if (hot) {
      for (u = 1; u <= 13; u++) { j = pFlue(g, s, u); if (g.m[j] === MAT.EMBER) { heatBecome(g, j, MAT.ASH); g.fx.hiss++; } }
      if (p.sayT <= 0) pSay(g, p, "stoked", true);
    }
    return true;
  }
  /* (it is coming up, or warm enough: wait, and watch it. a long shift, and somebody else's turn) */
  /* (the stoker keeps at it until they are hungry or tired, or have been at it a long while: and hands over while it is
     warm, so the next one has time to get here) */
  if (hot || t >= P_BATH_LO + 2) {
    if (!hot && t > P_BATH_HI - 3 && (p.hunger > P_HUNGRY || (p.tired || 0) > B_SLEEPY * 0.8 || k.t > 9000)) { p.bored = 0; return iDone(p, true); }
    return true;
  }
  /* the hearth: the ash out of it first, a scrape at a time, then a coal in */
  j = pFlue(g, s, 1);
  if (g.m[j] === MAT.ASH) { heatVanish(g, j); if ((p.ash || 0) < L_POCKET.ash) { p.ash = (p.ash || 0) + 1; g.found.ash = (g.found.ash || 0) + 1; } if (p.sayT <= 0 && Math.random() < 0.3) pSay(g, p, "rake"); return true; }
  if ((p.coal || 0) < 1) { k.coal = false; return true; }
  if (g.m[j] !== MAT.EMPTY && !AIRY[g.m[j]]) return iDone(p, false);
  sandSet(g, j, MAT.EMBER); g.aux[j] = 1; heatAccept(g, j);
  p.coal--; s.coals = (s.coals || 0) + 1; g.fx.thud++;
  if (p.sayT <= 0) pSay(g, p, "stoke");
  return true;
}
/* a fire at the baths that is all in the hearth, the flue and the chimney is the fire under the baths, not a fire: the
   brigade lets it be */
function pInTheFlue(g, s, f) {
  for (var k = 0; k < f.length; k++) {
    var u = f[k] % g.gw - s.x0, dy = ((f[k] / g.gw) | 0) - s.G;
    if (!((dy === 4 && u >= 1 && u <= 13) || (u === 1 && dy >= 0 && dy <= 3) || (u === 13 && dy >= -6 && dy <= 4))) return false;
  }
  return true;
}
/* every W_STRIDE ticks: a stoker while the water is cool (and full enough to be worth it), the eldest complaining, and
   anybody it was too hot for, shouting */
function pBathsStep(g, s) {
  if (!s.done || s.repair) return;
  var t = pBathT(g, s), k, q, stoker = null;
  for (k = 0; k < g.peasants.length; k++) { q = g.peasants[k]; if (!q.dead && q.task && q.task.kind === "stoke" && q.task.site === s.id) stoker = q; }
  if (!stoker && (t < P_BATH_LO + 4 || (t > P_BATH_HI && pBurning(g, s))) && wBathNeed(g, s) <= 6 && !g.blaze.length) {   /* (in good time: it is a walk) */
    /* the stoker: whoever it was last time, if they are about; else whoever is idle and nearest, coal in their pockets first */
    var best = null, bd = 1e9;
    for (k = 0; k < g.peasants.length; k++) {
      q = g.peasants[k];
      if (!wIdle(g, q) || Math.abs(q.x - s.cx) > 240) continue;
      var d = Math.abs(q.x - s.cx) - ((q.coal || 0) >= 1 ? 40 : 0) - (q.id === s.stoker ? 30 : 0);
      if (d < bd) { bd = d; best = q; }
    }
    if (best) { best.task = { kind: "stoke", site: s.id, t: 0, act: 0 }; s.stoker = best.id; }
  }
  var B = pBathers(g, s);
  if (B.length && (g.tick % 600) === 0) {
    var eldest = null;
    for (k = 0; k < B.length; k++) if (!eldest || pAge(g, B[k]) > pAge(g, eldest)) eldest = B[k];
    if (eldest && eldest.sayT <= 0 && Math.random() < 0.5) pSay(g, eldest, "eldest", true);
  }
  /* (too hot for them: out, and standing round it shouting) */
  if (t > P_SWEAT) for (k = 0; k < g.peasants.length; k++) {
    q = g.peasants[k];
    if (q.dead || !(q.hotBath > g.tick) || Math.abs(q.x - s.cx) > 30 || q.sayT > 0 || Math.random() > 0.15) continue;
    pSay(g, q, "shout", true);
  }
}
var P_COLUMN = hex32("#d8d2c2"), P_COLUMN_D = hex32("#b8b2a2"), P_STEAMY = hex32("#c8d8e8");
/* the colonnade behind it, the pediment over it, and the glow of the fire in the flue */
function pDrawBaths(g, s) {
  var G = s.G, x0 = s.x0, u, y, hot = 0;
  if (s.done) {
    for (y = G - 10; y <= G - 1; y++) for (u = 3; u <= 11; u += 8) { wBack(g, x0 + u, y, P_COLUMN, 0.7); wBack(g, x0 + u + 1, y, P_COLUMN_D, 0.6); }
    for (u = 2; u <= 13; u++) wBack(g, x0 + u, G - 11, P_COLUMN, 0.75);
    for (u = 4; u <= 11; u++) wBack(g, x0 + u, G - 12, P_COLUMN_D, 0.7);
    for (u = 6; u <= 9; u++) wBack(g, x0 + u, G - 13, P_COLUMN, 0.7);
    /* (warm water steams a little) */
    var t = pBathT(g, s);
    if (t > 36) for (u = 3; u <= 11; u++) if (((u * 7 + ((g.t * 3) | 0)) % 5) === 0) wBack(g, x0 + u, G - 1 - (((g.t * 2 + u) | 0) % 3), P_STEAMY, clamp((t - 36) / 40, 0.1, 0.5));
  }
  for (u = 1; u <= 11; u++) if (g.m[pFlue(g, s, u)] === MAT.EMBER) hot++;
  return hot;
}

/* -------------------------------------------------------------------
   FILLING: a bucket of real water, carried to a wonder that holds
   water (the gardens' pool, the organ's tank) and tipped in, each cell
   of it with its heat. the cells it goes into are the wonder's to say
   (def.dry(g, s): the dry ones, lowest first), and so is where they
   stand to tip it (def.spout(g, s): {x, y})
   ------------------------------------------------------------------- */
P_SAY.pour = ["*sploosh*", "in it goes", "another one", "nearly full", "that's the last of it. maybe"];
function pGoFill(g, p, s) {
  if (!g.know.bucket || p.pail || iCrew(g, "pfill", s.id) >= 2) return false;
  var w = iFindWater(g, p, 200, null, true, iBarred(g, true), true);
  if (!w) return false;
  p.task = { kind: "pfill", site: s.id, w: w, t: 0, act: 0 };
  return true;
}
function pTaskFill(g, p, k) {
  var s = bSite(g, k.site), d = s && wOf(s.kind), fx = Math.floor(p.x), fy = Math.floor(p.y), j;
  if (!s || !s.done || !d || ++k.t > 4000) { if (p.pail) iSpill(g, p); return iDone(p, false); }
  if (!p.pail) {
    if (!d.dry(g, s).length) return iDone(p, true);
    var bar = iBarred(g, true);
    j = iScoopAt(g, fx, fy, true, bar);
    if (j >= 0 && !p.swimming && !LIQUID[pCell(g, fx, fy)]) {
      p.pose = (k.act >> 3) & 1 ? "eatB" : "stand"; p.dir = (j % g.gw) + 0.5 < p.x ? -1 : 1;
      if (++k.act === 16) { p.pail = iScoop(g, j, true); k.act = 0; k.best = null; }
      return true;
    }
    if (k.t % 120 === 0) k.w = iFindWater(g, p, 200, null, true, bar, true) || k.w;
    if (!k.w) return iDone(p, false);
    if (iWalk(g, p, k, "pfillw" + k.w.x, k.w.x, k.w.y, function (x, y) { return navStand(g, x, y) === 1 && !LIQUID[pCell(g, x, y)] && iScoopAt(g, x, y, true, bar) >= 0; })) pGiveUp(g, p, k.w.x);
    return false;
  }
  /* a bucketful: to the spout, and in it goes, a cell at a time into the lowest dry cells */
  var sp = d.spout(g, s);
  if (Math.abs(p.x - sp.x - 0.5) > 2 || Math.abs(fy - sp.y) > 3) {
    if (iWalk(g, p, k, "pfill" + s.id, sp.x, sp.y, function (x, y) { return Math.abs(x - sp.x) <= 2 && Math.abs(y - sp.y) <= 3; })) { iSpill(g, p); pGiveUp(g, p, sp.x); }
    return false;
  }
  p.pose = ++k.act < 10 ? "hammerA" : "hammerB";
  if (k.act < 14) return true;
  var D = d.dry(g, s), load = p.pail, n;
  p.pail = null;
  for (n = 0; n < load.length && n < D.length; n++) {
    j = D[n];
    var qa = heatQ(g, j);
    g.m[j] = load[n].m; g.aux[j] = 0; g.sh[j] = load[n].sh; g.vy[j] = 0;
    heatSetQ(g, j, qa + load[n].q);
  }
  if (n < load.length) { p.pail = load.slice(n); iSpill(g, p); }   /* (brimming: the rest down the side) */
  g.fx.splash++;
  if (p.sayT <= 0 && Math.random() < 0.3) pSay(g, p, "pour");
  p.bored = 0;
  return iDone(p, true);
}
/* a cell of liquid from i to j (j thin air), heat and all: the air left behind at i is room temperature, as a scooped
   bucket leaves it (ideas.js iScoop) */
function pLift(g, i, j) {
  heatSync(g, i);
  var q = heatQ(g, i), qa = heatQ(g, j);
  g.m[j] = g.m[i]; g.aux[j] = g.aux[i]; g.sh[j] = g.sh[i]; g.vy[j] = 0;
  heatSetQ(g, j, q + qa);
  g.m[i] = MAT.EMPTY; g.aux[i] = 0; g.vy[i] = 0; g.T[i] = AMBIENT; g.lat[i] = 0;
  heatAccept(g, i);
}

/* =====================================================================
   THE HANGING GARDENS: no room for another field, so: up. a stair of
   three terraces, open to the sky the whole way up, each a little
   field six wide on a brick floor, five rows over the last and seven
   columns along. at the foot a pool, at the top a concrete cistern,
   and between them, up under the terraces, an archimedes screw of
   iron. the screw-turner turns it, and every twenty strokes a cell of
   water comes up out of the pool and into the cistern. the cistern
   spills onto the top terrace, the top terrace over its lip onto the
   next, and the bottom one back into the pool: the same water, round
   and round, less what the wheat drinks on the way
   ===================================================================== */
var P_GW = 29;                     /* the gardens, across: pool, three terraces, cistern */
var P_GLIP = [5, 12, 19];          /* each terrace's lip (and the pier under it); its bed is the six columns after */
var P_GBED = 6;                    /* a terrace field, across (a field on the flat is I_FARM_W) */
var P_GSTEP = 5;                   /* rows each terrace stands over the last */
var P_GSKY = 7;                    /* clear rows over each (wheat grows I_CROP_H, give or take two) */
var P_GPOOL = 5;                   /* the pool: four wide, this deep */
var P_GPOOL_N = 20;                /* and so this much water in it, full */
var P_SCREW = 20;                  /* strokes of the crank to a cell of water */
var P_SCREW_IRON = 3;              /* iron in the screw, all told */
var P_SHIFT = 12;                  /* cells a turner lifts before handing over */

P_SAY.idea_gardens = ["no room for another field. so: UP", "a field. on top of a field", "what if the field had stairs", "fields, stacked"];
P_SAY.planGardens = ["terraces! going up!", "a field on every step", "up the slope with it", "it waters itself. nearly"];
P_SAY.screw = ["round and round she goes", "up comes the water, la la", "turn, turn, turn", "one for the wheat, one for the ducks",
  "heave, and heave, and heave", "this is the life. sort of"];
P_SAY.screwDone = ["that's enough up there", "my arms", "the wheat can have it now", "the pool's run low"];

wDef({
  id: "gardens",
  idea: { name: "the hanging gardens", title: "THE HANGING GARDENS", sub: "no room for another field. so: UP", hint: "no room for another field",
          ready: function (g) { return !!g.know.farm && !!g.know.concrete && !!g.noField; } },
  achieve: ["THE HANGING GARDENS", "three fields, one over the other, and a screw that lifts the water to the top. it comes back down"],
  plan: pPlanGardens,
  pick: pGardensPick,
  task: function (g, p, k) { return k.kind === "screw" ? pTaskScrew(g, p, k) : (k.kind === "pfill" ? pTaskFill(g, p, k) : undefined); },
  step: pGardensStep,
  draw: pDrawGardens,
  finish: pGardensDone,
  dry: function (g, s) { return pPoolDry(g, s); },
  spout: function (g, s) { return { x: s.crankX, y: s.crankY }; },
  label: function () { return "the hanging gardens"; },
  readout: function (g, s) {
    if (!s.done) return "";
    return "the pool: " + (P_GPOOL_N - wBathNeed(g, s)) + " of " + P_GPOOL_N + ". the cistern: " + pCisternWater(g, s) + (pTurner(g, s) ? ". the screw is turning" : "");
  },
  mood: function (g, p, k) {
    if (k.kind === "screw") return k.on ? "is turning the screw at the hanging gardens, and singing" : "is off to turn the screw at the gardens";
    if (k.kind === "pfill") { var s = bSite(g, k.site); return s ? (p.pail ? "is carrying a bucket of water to " + bLabel(s) : "is fetching water for " + bLabel(s)) : ""; }
    return "";
  }
});
/* nowhere for another field (iPlanFarm found none): with none anywhere in the valley either, the village hears about
   it, and whoever looked has the gardens put into their head */
function pGardensNoRoom(g, p, wide) {
  if (g.noFieldT > g.tick) return;
  g.noFieldT = g.tick + 3000;
  if (!wide && (iFarmSpot(g, -1, -1, null, false) || iFarmSpot(g, -1, -1, null, true))) return;   /* (room, just not near here) */
  if (!g.noField) iNoRoom(g, "another field");
  g.noField = g.tick || 1;
  wSpark(g, p, "gardens");
}
/* the gardens' columns, foot first: u (0 .. P_GW - 1) to x */
function pGU(s, u) { return s.d > 0 ? s.x0 + u : s.x0 + P_GW - 1 - u; }
/* terrace k's bed row, over the pool's waterline Y0 */
function pGBed(Y0, k) { return Y0 - 3 - P_GSTEP * k; }
function pPlanGardens(g, p) {
  var best = null;
  for (var d = -1; d <= 1; d += 2) {
    var r = wPlot(g, { w: P_GW, sky: 6, rough: 22, near: wMiddle(g), fit: function (g, x0, gy) { return pGardensFit(g, x0, gy, d); } });
    if (r && (!best || r.score > best.score)) { best = r; best.d = d; }
  }
  if (!best) return false;
  var f = best.r, x0 = best.x0, d = best.d, Y0 = f.Y0;
  var s = bNew(g, "gardens", p, wCleared(g, best, f.plan), [x0, pGBed(Y0, 2) - P_GSKY - 1, x0 + P_GW - 1, Y0 + P_GPOOL],
               { wonder: true, d: d, Y0: Y0, bath: true, L: Y0, px0: d > 0 ? x0 + 1 : x0 + P_GW - 5, bw: 4, bh: P_GPOOL,
                 crankX: f.crankX, crankY: f.crankY, screw: f.path, strokes: 0, lifted: 0 });
  feed(g, p.name + " is building the hanging gardens. three fields, one over the other", "#ffd94a", "plan" + s.id);
  pSay(g, p, "planGardens", true);
  if (bCarries(p)) bJoin(g, p, s);
  return true;
}
/* the gardens at x0, the pool at the d > 0 end (left) or the d < 0 (right), on ground gy: {plan, Y0 (the pool's
   waterline), crankX, crankY (where the turner stands), score} or null. the pool is dug at the foot; each terrace is a
   brick floor with a bed of sand on it, dug down into the slope, or stood on piers where there is no slope; the
   cistern stands on its pier at the top. a slope rising away from the pool is what it is for: the hill does the work */
function pGardensFit(g, x0, gy, d) {
  function X(u) { return d > 0 ? x0 + u : x0 + P_GW - 1 - u; }
  function Gy(u) { return gy[X(u) - x0]; }
  var plan = [], at = {}, u, y, k, c, x, brick = 0, dig = 0, Y0 = -1;
  for (u = 0; u <= 5; u++) Y0 = Math.max(Y0, Gy(u));
  for (u = 0; u <= 5; u++) if (Y0 - Gy(u) > 2) return null;   /* (the pool wants level ground) */
  if (Y0 - Gy(P_GW - 1) < 0) return null;                     /* (and the stair goes up from it, or along: never down) */
  var crankX = X(0) - d, cg = mGroundNear(g, crankX, false, Y0);
  if (cg < 0 || Math.abs(cg - Y0) > 2 || !pRoom(g, crankX, cg - 1)) return null;   /* (somewhere to stand at the crank) */
  function put(u, y, v, ph) { var e = bE(g, X(u), y, v, ph); plan.push(e); at[e.i] = e; return e; }
  /* (out of the way: sand dug, rock cut, a tree felled. false for anything else, somebody's or not to be shifted) */
  function digOut(u, y, ph) {
    c = pCell(g, X(u), y);
    if (AIRY[c]) return true;
    if (ROCK[c] && !bMarked(g, X(u), y)) { put(u, y, MAT.EMPTY, ph || 0).mine = true; dig += 3; return true; }
    if (!B_DIG[c] && !mFellable(g, X(u), y, c)) return false;
    put(u, y, MAT.EMPTY, ph || 0); dig++; return true;
  }
  /* (brick, whatever is there but rock: driven into sand, as a tier of the theatre's is, so that what it holds back
     does not pour in while it goes in. bottom up, a row at a time) */
  function brickAt(u, y, ph) {
    var i = y * g.gw + X(u);
    if (at[i]) { if (at[i].v !== MAT.EMPTY) return true; plan.splice(plan.indexOf(at[i]), 1); at[i] = null; }
    c = pCell(g, X(u), y);
    if (ROCK[c]) return true;   /* (rock where a floor or a riser goes is the floor or the riser: cut out and bricked, it would be a hole a while, and sand would fill it) */
    else if (!AIRY[c] && !B_DIG[c]) return false;
    var e = put(u, y, MAT.BRICK, ph == null ? 10 + Y0 + 8 - y : ph); brick++;
    if (B_DIG[c]) e.drive = true;
    return true;
  }
  /* the pool: four wide and five deep, dug out of the ground, brick walls (the rock is the wall where there is rock), and
     a floor of concrete, poured once the walls are in (wet concrete runs, if there is nothing to hold it) */
  for (u = 0; u <= 5; u++) {
    x = X(u);
    for (y = Math.min(Gy(u), Y0 - 1); y <= Y0 + P_GPOOL; y++) {
      if (u === 0 || u === 5 || y === Y0 + P_GPOOL) {
        c = pCell(g, x, y);
        if (y >= Y0 && ROCK[c]) continue;   /* (rock where a wall goes is the wall: nobody cuts it out from the bottom of a pit) */
        if (u > 0 && u < 5) { if (!AIRY[c] && !B_DIG[c]) return null; put(u, y, MAT.CONCRETE, 9).drive = !AIRY[c]; continue; }
        if ((u === 0 || y >= Y0) && !brickAt(u, y, 2 + Y0 + P_GPOOL - y)) return null;
      }
      else if (!digOut(u, y)) return null;
    }
    if (!pSolid(g, x, Y0 + P_GPOOL + 1)) return null;
  }
  /* (nothing runny about it, down as far as it is dug: a pool dug beside a pond is the pond) */
  for (u = -3; u <= 8; u++) for (y = Y0 - 2; y <= Y0 + P_GPOOL + 2; y++) { c = pCell(g, X(u), y); if (LIQUID[c] || c === MAT.DRAIN) return null; }
  /* the terraces: each a pier at its lip from the ground up, a floor, a bed of sand, and sky over it */
  for (k = 0; k < 3; k++) {
    var a = P_GLIP[k], Yk = pGBed(Y0, k), next = k < 2 ? P_GLIP[k + 1] : 26;
    for (u = a; u < next; u++) {
      x = X(u);
      var G = Gy(u), lip = u === a;
      for (y = Yk - P_GSKY; y < Yk - 1; y++) if (!digOut(u, y, 40)) return null;   /* (the sky over it dug once what it holds back is held) */
      if (lip) {
        /* the lip, flush with the bed (so what the bed does not hold goes over), and the face of the riser under it
           down to the terrace below: brick, whatever was there */
        var foot = k ? pGBed(Y0, k - 1) - 1 : Y0 - 1;
        if (!digOut(u, Yk - 1, 40)) return null;
        for (y = Yk; y <= foot; y++) if (!brickAt(u, y)) return null;
        for (y = foot + 1; y < G; y++) if (AIRY[pCell(g, x, y)] && !at[y * g.gw + x]) brickAt(u, y);
        continue;
      }
      if (!digOut(u, Yk - 1, 40)) return null;
      /* the bed: sand (earth or sand there already will do) */
      c = pCell(g, x, Yk);
      if (c !== MAT.SAND && c !== MAT.SOIL) {
        if (ROCK[c]) return null;
        else if (!AIRY[c] && !B_DIG[c]) return null;
        put(u, Yk, MAT.SAND, 45).bed = k + 1;
      }
      /* the floor (brick, so it shows), and under it made up only where it is low: arches, otherwise */
      if (!brickAt(u, Yk + 1)) return null;
      for (y = Yk + 2; y < G; y++) if (AIRY[pCell(g, x, y)] && !at[y * g.gw + x] && G - y <= 2) brickAt(u, y);
    }
  }
  /* the cistern: a box one wide on top of the stair, brick walls and a concrete bottom, its low side the top terrace's
     end, spilling onto it. (a wall one wide is no form for wet concrete: it runs off before it goes off) */
  var Y2 = pGBed(Y0, 2);
  for (u = 26; u <= 28; u++) {
    x = X(u);
    var Gc = Gy(u), top = u === 26 ? Y2 - 3 : (u === 28 ? Y2 - 6 : Y2);
    for (y = Y2 - 7; y < top; y++) if (!digOut(u, y, 40)) return null;
    for (y = top; y <= Y2; y++) {
      c = pCell(g, x, y);
      if (u !== 27) { if (!AIRY[c] && !B_DIG[c] && !ROCK[c]) return null; if (!ROCK[c]) brickAt(u, y); continue; }
      if (ROCK[c]) put(u, y, MAT.EMPTY, 40).mine = true;
      else if (!AIRY[c] && !B_DIG[c]) return null;
      put(u, y, MAT.CONCRETE, 70).drive = B_DIG[c] === 1;   /* (poured in where the sand was, as the brick is driven) */
    }
    /* (its pier: the two walls down to the ground, the middle made up only where it is low) */
    for (y = Y2 + 1; y < Gc; y++) if (AIRY[pCell(g, x, y)] && (u !== 27 || Gc - y <= 2 || y === Y2 + 1)) brickAt(u, y);
  }
  /* the screw: a slanting tube of iron from the pool's wall up under the terraces to the foot of the cistern (stepped
     down under each floor; through rock, it is drawn rather than made) */
  var tube = [], path = [];
  for (u = 5; u <= 26; u++) {
    k = u < 12 ? 0 : (u < 19 ? 1 : 2);
    y = Math.max(Math.round(Y0 - 1 - (u - 5) * 11 / 21), pGBed(Y0, k) + 2);
    if (u === 26) y = Math.max(y, Y2 + 1);
    x = X(u); c = pCell(g, x, y);
    var e2 = at[y * g.gw + x];
    path.push(y * g.gw + x);
    if (e2) continue;   /* (behind the brick of a pier: drawn there, not made) */
    if (!AIRY[c] || u < 6 || u > 25) continue;   /* (where it runs through the hill, or a pier, it is drawn there, not made) */
    tube.push(put(u, y, MAT.GIRDER, 90));
  }
  for (k = 0; k < tube.length; k++) tube[k].cost = P_SCREW_IRON / Math.max(tube.length, 8);
  /* a slope rising away from the pool is what it is for */
  var rise = Y0 - Gy(24);
  return { plan: plan, Y0: Y0, path: path, crankX: crankX, crankY: cg - 1, score: 30 + Math.min(rise, 14) * 2 - brick * 0.15 - dig * 0.05 };
}
/* the pool's dry cells, lowest first (FILLING); none, once it is nearly full */
function pPoolDry(g, s) {
  var out = [], x, y;
  if (P_GPOOL_N - wBathNeed(g, s) >= P_GPOOL_N - 2) return out;
  for (y = s.L + P_GPOOL - 1; y >= s.L; y--) for (x = s.px0; x < s.px0 + 4; x++) if (AIRY[pCell(g, x, y)]) out.push(y * g.gw + x);
  return out;
}
/* the cistern: its one column, and how much water is in it */
function pCisternX(s) { return pGU(s, 27); }
function pCisternWater(g, s) {
  var n = 0, x = pCisternX(s), Y2 = pGBed(s.Y0, 2);
  for (var y = Y2 - 6; y < Y2; y++) if (WET[pCell(g, x, y)]) n++;
  return n;
}
function pTurner(g, s) { for (var k = 0; k < g.peasants.length; k++) { var q = g.peasants[k]; if (!q.dead && q.task && q.task.kind === "screw" && q.task.site === s.id) return q; } return null; }
/* finished: the beds are three fields now (farm sites, with terrace: the gardens' id), and the gardens let go of them */
function pGardensDone(g, s, p) {
  feed(g, "the hanging gardens are built. now the terraces want sowing, and the pool wants filling", "#ffd94a", "plan" + s.id);
  s.plan = s.plan.filter(function (e) { return !e.bed; });
  pTerraces(g, s);
}
/* a field on each terrace that has none */
function pTerraces(g, s) {
  for (var k = 0; k < 3; k++) {
    var have = false, j, u;
    for (j = 0; j < g.sites.length; j++) if (g.sites[j].kind === "farm" && g.sites[j].terrace === s.id && g.sites[j].tier === k) have = true;
    if (have) continue;
    var Yk = pGBed(s.Y0, k), plan = [], xa = 1e9, xb = -1;
    for (u = P_GLIP[k] + 1; u <= P_GLIP[k] + P_GBED; u++) {
      var x = pGU(s, u);
      xa = Math.min(xa, x); xb = Math.max(xb, x);
      /* (a stalk in every furrow, not every other one as on the flat: a gap between two stalks is a little pond that
         never gets any further, and the water is wanted on the next terrace down. over the tops of them it goes) */
      plan.push(bE(g, x, Yk, MAT.SOIL, 1));
      plan.push(bE(g, x, Yk - 1, MAT.CROP, 2));
    }
    bNew(g, "farm", null, plan, [xa, Yk - 6, xb, Yk], { free: true, G: Yk, terrace: s.id, tier: k });
  }
}
/* the bucket brigade, for the pool */
function pGardensPick(g, p, hungry) {
  var s = mSites(g, "gardens", true)[0];
  if (!s || hungry || s.repair) return false;
  if (wBathNeed(g, s) > 8 && Math.abs(s.cx - p.x) < 220 && Math.random() < 0.4 && pGoFill(g, p, s)) return true;
  return false;
}
/* every W_STRIDE ticks: the terraces kept, and a screw-turner while there is water in the pool to lift */
function pGardensStep(g, s) {
  if (!s.done || s.repair) return;
  if (g.tick % 600 === 0) pTerraces(g, s);   /* (a terrace the village gave up on is a terrace again, a while later) */
  if (pTurner(g, s) || P_GPOOL_N - wBathNeed(g, s) < 6 || g.tick < (s.turnT || 0) || g.blaze.length) return;
  var best = null, bd = 1e9, k, q;
  for (k = 0; k < g.peasants.length; k++) {
    q = g.peasants[k];
    if (!wIdle(g, q) || Math.abs(q.x - s.cx) > 220) continue;
    var dd = Math.abs(q.x - s.cx) - (q.id === s.turner ? 40 : 0);
    if (dd < bd) { bd = dd; best = q; }
  }
  if (best) { best.task = { kind: "screw", site: s.id, t: 0, act: 0, n: 0 }; s.turner = best.id; }
}
/* the crank: round and round, and every P_SCREW strokes a cell of water out of the top of the pool and into the top of
   the cistern, heat and all (the oil pump's take and place, for water) */
function pTaskScrew(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || !s.done || ++k.t > 8000 || p.hunger > P_HUNGRY || (p.tired || 0) > B_SLEEPY) { if (s) s.turnT = g.tick + 900; return iDone(p, (k.n || 0) > 0); }
  var cx = s.crankX, cy = s.crankY;
  if (Math.abs(p.x - cx - 0.5) > 1.5 || Math.abs(Math.floor(p.y) - cy) > 2) {
    if (iWalk(g, p, k, "screw" + s.id, cx, cy, function (x, y) { return Math.abs(x - cx) <= 1 && Math.abs(y - cy) <= 2; })) pGiveUp(g, p, cx);
    return false;
  }
  if (!k.on) { k.on = true; if (p.sayT <= 0) pSay(g, p, "screw", true); }
  p.dir = s.d; p.idle = 0; p.cosyT = g.tick + 30; k.act++;
  p.pose = (k.act % 8) < 4 ? "hammerA" : "hammerB";
  if (k.act % 8 !== 0) return true;
  s.strokes++;
  if (p.sayT <= 0 && Math.random() < 0.03) pSay(g, p, "screw");
  if (s.strokes % P_SCREW) return true;
  var from = -1, to = -1, x, y, cxs = pCisternX(s), Y2 = pGBed(s.Y0, 2);
  for (y = s.L; y < s.L + P_GPOOL && from < 0; y++) for (x = s.px0; x < s.px0 + 4; x++) if (WET[pCell(g, x, y)]) { from = y * g.gw + x; break; }
  for (y = Y2 - 6; y < Y2 && to < 0; y++) if (pCell(g, cxs, y) === MAT.EMPTY) to = y * g.gw + cxs;
  if (from < 0 || to < 0 || P_GPOOL_N - wBathNeed(g, s) < 3 || k.n >= P_SHIFT) {
    s.turnT = g.tick + 2400;
    if (p.sayT <= 0) pSay(g, p, "screwDone", true);
    p.bored = 0;
    return iDone(p, true);
  }
  pLift(g, from, to);
  s.lifted++; k.n++;
  return true;
}
var P_FLOWERS = [hex32("#e8607a"), hex32("#f0c040"), hex32("#c070e0"), hex32("#f4f4f4")], P_VINE = hex32("#3f8a3a"), P_VINE_D = hex32("#2c6a2a");
var P_CRANK = hex32("#5a4030"), P_SCREW_HI = hex32("#c8ccd4"), P_SCREW_D = hex32("#4a4e58");
/* flowers along the lips, vines down the risers, the crank, and the screw's thread turning in its tube */
function pDrawGardens(g, s) {
  if (!s.done) return 0;
  var k, y, Y0 = s.Y0, t = pTurner(g, s), turning = t && t.task.on;
  for (k = 0; k < 3; k++) {
    var Yk = pGBed(Y0, k), lx = pGU(s, P_GLIP[k]), foot = k ? pGBed(Y0, k - 1) - 1 : Y0 - 1;
    /* (a flower on the lip, where the water goes over) */
    wBack(g, lx, Yk - 2, P_FLOWERS[(k + s.id) % 4]);
    /* (vines off the lip, trailing down the face of the riser, longer and shorter) */
    for (var v = 0; v < 2; v++) {
      var vx = lx - s.d * v, len = (k ? foot - Yk : 3) - ((s.id + k + v * 2) % 3);
      for (y = Yk - 1 + v; y <= Yk - 1 + len; y++) {
        var i = y * g.gw + vx;
        if (y < 0 || y >= g.gh) continue;
        if (g.m[i] === MAT.BRICK) g.px[i] = blend32(g.px[i], (y + k + v) & 1 ? P_VINE : P_VINE_D, 0.8 - v * 0.25);
        else if (g.m[i] === MAT.EMPTY && v) g.px[i] = blend32(g.px[i], P_VINE_D, 0.7);
      }
      if (v && ((s.id + k) & 1)) wBack(g, vx, Yk - 1 + len + 1, P_FLOWERS[(k + 2) % 4]);
    }
  }
  /* the crank, at the foot of the screw */
  var cx = s.crankX, cy = s.crankY, ph = turning ? ((g.t * 6) | 0) % 4 : 0;
  wBack(g, cx + s.d, cy - 1, P_CRANK); wBack(g, cx + s.d, cy - 2, P_CRANK);
  wBack(g, cx + s.d + [0, 1, 0, -1][ph], cy - 3 + [0, 1, 2, 1][ph] - 1, P_SCREW_HI);
  /* the screw, up under the terraces (made of iron where it is out in the air, and seen through the hill and the piers
     where it is not), and its thread going up it while it turns */
  var S = s.screw || [];
  for (k = 0; k < S.length; k++) {
    var i = S[k], c = g.m[i];
    if (c !== MAT.GIRDER) g.px[i] = blend32(g.px[i], P_SCREW_D, AIRY[c] ? 0.9 : 0.55);
    if (turning && ((((i % g.gw) * s.d * 3 - ((g.t * 8) | 0)) % 4 + 4) % 4 === 0)) g.px[i] = blend32(g.px[i], P_SCREW_HI, 0.6);
  }
  return 0;
}
