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
  var n = 0;
  for (var x = s.px0; x < s.px0 + 9; x++) for (var y = s.L; y < s.L + 3; y++) if (AIRY[pCell(g, x, y)]) n++;
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
