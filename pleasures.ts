/* =====================================================================
   PLEASAND  --  pleasures.ts

   the great works that are for enjoying (wonders.ts has what they
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

/* (what this file keeps in g) */
interface Game {
  wIceN?: number;
  wDuckPalace?: number; quiet?: any; noField?: number; wTick?: boolean;
}
/* (what this file keeps on a villager) */
interface Peasant {
  shoos?: any; snow?: number;
}
/* (what this file keeps on a site) */
interface Site {
  coals?: any; terrace?: number; tier?: number; strokes?: number; lifted?: number; breathe?: any; breatheT?: number;
  caught?: number; hatched?: number; fed?: number;
  melts?: boolean; cells?: any; bath?: boolean; bw?: number; bh?: number; stoker?: any; glip?: number[]; gc?: number;
  gw?: number; Y0?: any; turnT?: number; turner?: any; crankX?: any; crankY?: any; screw?: any; state?: string;
  mo?: number[]; exits?: number[]; notes?: number; cur?: number; got?: number; need?: number; nextT?: number;
  shutT?: number; organist?: any; seenT?: number; fireT?: any; tune?: number; concerts?: number; ni?: number;
  nextNoteT?: number; startN?: number; startW?: number; why?: any; noteT?: number; lastUsed?: number; lastNotes?: number;
  Y?: any; boycott?: number;
}

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
function pBathsFit(g: Game, x0: number, gy: number, hi, lo) {
  var G = Math.max(hi, lo - 1), plan = [], u, x, y, c, v, sand = 0;
  function put(u, y: number, v: number, ph: number) { plan.push(bE(g, x0 + u, y, v, ph)); }
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
function pBathCell(u, dy: number) {
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
function pPlanBaths(g: Game, p: Peasant) {
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
/* the cells of the basin with no water in them (dry, or silted up: sand in it is not water), and how warm the water in
   it is */
function wBathNeed(g: Game, s: Site) {
  var n = 0, bw = s.bw || 9, bh = s.bh || 3, c;   /* (nine by three, the baths; the gardens' pool and the organ's say their own) */
  for (var x = s.px0; x < s.px0 + bw; x++) for (var y = s.L; y < s.L + bh; y++) { c = pCell(g, x, y); if (!WET[c] && c !== MAT.ICE) n++; }
  return n;
}
function pBathT(g: Game, s: Site) {
  var t = 0, n = 0;
  for (var x = s.px0; x < s.px0 + 9; x++) for (var y = s.L; y < s.L + 3; y++) { var j = y * g.gw + x; if (WET[g.m[j]] || g.m[j] === MAT.ICE) { t += g.T[j]; n++; } }
  return n ? t / n : AMBIENT;
}
function pBathers(g: Game, s: Site) { return g.peasants.filter(function (q) { return !q.dead && q.task && q.task.kind === "bathe" && q.task.site === s.id; }); }
/* a soak: in, and sit in it a while */
function pGoBathe(g: Game, p: Peasant, s: Site, cold: boolean) {
  if (pBathers(g, s).length >= P_BATHERS || (p.hotBath || 0) > g.tick) return false;
  var x = s.px0 + 1 + ((p.id * 3) % 7);
  p.task = { kind: "bathe", site: s.id, x: x, y: s.L + 2, t: 0, cold: !!cold, stay: 500 + irnd(400) };
  return true;
}
function pBathsReady(g: Game, s: Site) { if (!s || !s.done || s.repair || wBathNeed(g, s) > 6) return false; var t = pBathT(g, s); return t >= W_BATH_LO && t <= W_BATH_HI; }
/* cold: a warm bath, before a campfire */
function pBathsWarm(g: Game, p: Peasant) {
  var s = mSites(g, "baths", true)[0];
  if (!pBathsReady(g, s) || Math.abs(s.cx - p.x) > 220) return false;
  return pGoBathe(g, p, s, true);
}
/* the bored, at a quiet moment: a soak. and the baths, while they are dry, want filling */
function pBathsPick(g: Game, p: Peasant, hungry) {
  var s = mSites(g, "baths", true)[0];
  if (!s || hungry) return false;
  if (g.know.bucket && wBathNeed(g, s) > 3 && iCrew(g, "bucket", s.id) < I_POND_CREW && Math.random() < 0.5) {
    var w = iFindWater(g, p, 200, null, true, iBarred(g, s), true);
    if (w) { p.task = { kind: "bucket", pond: s.id, t: 0, act: 0, w: w }; return true; }
  }
  if (pBathsReady(g, s) && Math.abs(s.cx - p.x) < 200 && (p.bored > 400 || p.cold > 0) && !wNoGo(g, p, s.id) && Math.random() < 0.12) return pGoBathe(g, p, s, p.cold > 0);
  return false;
}
function pTaskBathe(g: Game, p: Peasant, k: Task) {
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
function pFlue(g: Game, s: Site, u) { return (s.G + 4) * g.gw + s.x0 + u; }
/* the fire: any coal still burning in the hearth or along the flue */
function pBurning(g: Game, s: Site) { for (var u = 1; u <= 13; u++) if (g.m[pFlue(g, s, u)] === MAT.EMBER) return true; return false; }
/* the stoker: on duty while the water wants it. a coal in the hearth (lit: it burns a good long while) whenever it is
   under P_BATH_LO and nothing is burning; and once it is over P_BATH_HI, the fire raked out, and they say so */
function pTaskStoke(g: Game, p: Peasant, k: Task) {
  var s = bSite(g, k.site);
  if (!s || !s.done) return iDone(p, false);
  var t = pBathT(g, s), hot = pBurning(g, s);
  if (++k.t > 12000 && !hot) return iDone(p, false);
  /* coal first, if a coal is going to be wanted: their own, or off whoever has some close by, or off the furnace's pile */
  if (!k.coal && (p.coal || 0) < 1 && !hot) {
    if (iChipIn(g, "coal", 1, p.x, 6, p)) p.coal = (p.coal || 0) + 1;
    else {
      var f = mSites(g, "furnace", true)[0];
      if (!f || !f.stock || (f.stock.coal || 0) < 1) { if (p.sayT <= 0) pSay(g, p, "nocoal"); return iDone(p, false); }
      var fsx = f.sx, fsy = mSpotRow(g, f);
      if (Math.abs(p.x - fsx - 0.5) > 1.5 || !mBySpot(g, Math.floor(p.y), fsy)) {
        if (iWalk(g, p, k, "coal" + f.id, fsx, fsy, function (x, y) { return Math.abs(x - fsx) <= 1 && mBySpot(g, y, fsy); })) pGiveUp(g, p, fsx);
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
    if (!hot && t > P_BATH_HI - 3 && (p.hunger > P_HUNGRY || (p.tired || 0) > B_SLEEPY * 0.8 || (k.t > 9000 && pRelief(g, s, p)))) { p.bored = 0; return iDone(p, true); }
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
/* somebody to take over a long shift at the stoke-hole: idle, about, out of the water, with coal. with nobody, the stoker
   stays on (else they hand over to nobody, are sent back as the nearest, and the way back is across the bath) */
function pRelief(g: Game, s: Site, p: Peasant) {
  for (var k = 0; k < g.peasants.length; k++) {
    var q = g.peasants[k];
    if (q !== p && wIdle(g, q, s) && !q.wade && Math.abs(q.x - s.cx) <= 240 && (q.coal || 0) >= 1) return true;
  }
  return false;
}
/* a fire at the baths that is all in the hearth, the flue and the chimney is the fire under the baths, not a fire: the
   brigade lets it be */
function pInTheFlue(g: Game, s: Site, f) {
  for (var k = 0; k < f.length; k++) {
    var u = f[k] % g.gw - s.x0, dy = ((f[k] / g.gw) | 0) - s.G;
    if (!((dy === 4 && u >= 1 && u <= 13) || (u === 1 && dy >= 0 && dy <= 3) || (u === 13 && dy >= -6 && dy <= 4))) return false;
  }
  return true;
}
/* every W_STRIDE ticks: a stoker while the water is cool (and full enough to be worth it), the eldest complaining, and
   anybody it was too hot for, shouting */
function pBathsStep(g: Game, s: Site) {
  if (!s.done || s.repair) return;
  var t = pBathT(g, s), k, q, stoker = null;
  for (k = 0; k < g.peasants.length; k++) { q = g.peasants[k]; if (!q.dead && q.task && q.task.kind === "stoke" && q.task.site === s.id) stoker = q; }
  if (!stoker && (t < P_BATH_LO + 6 || (t > P_BATH_HI && pBurning(g, s))) && wBathNeed(g, s) <= 6 && !g.blaze.length) {   /* (in good time: it is a walk, and they may have to be fetched from far off) */
    /* the stoker: whoever it was last time, if they are about; else whoever is idle and nearest, coal in their pockets first */
    var best = null, bd = 1e9;
    for (k = 0; k < g.peasants.length; k++) {
      q = g.peasants[k];
      /* (not one paddling in the bath itself, the nearest of all: in the water a job is dropped as soon as it is given,
         peasants.ts pWalk, and they would be picked again and again while the water cooled) */
      if (!wIdle(g, q, s) || Math.abs(q.x - s.cx) > 240 || q.wade) continue;
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
function pDrawBaths(g: Game, s: Site) {
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
function pGoFill(g: Game, p: Peasant, s: Site) {
  if (!g.know.bucket || p.pail || iCrew(g, "pfill", s.id) >= 2) return false;
  var w = iFindWater(g, p, 200, null, true, iBarred(g, true), true);
  if (!w) return false;
  p.task = { kind: "pfill", site: s.id, w: w, t: 0, act: 0 };
  return true;
}
/* (every W_STRIDE ticks, from the wonder's step: more than dry cells dry, and nobody at it, and the nearest of the idle
   is sent for a bucket. a busy village otherwise never gets round to it) */
function pCallFill(g: Game, s: Site, dry: number) {
  if (wBathNeed(g, s) <= dry || iCrew(g, "pfill", s.id) || g.blaze.length || (g.tick % 300)) return;
  var best = null, bd = 1e9;
  for (var k = 0; k < g.peasants.length; k++) {
    var q = g.peasants[k];
    if (!wIdle(g, q, s) || q.pail || Math.abs(q.x - s.cx) > 220) continue;
    if (Math.abs(q.x - s.cx) < bd) { bd = Math.abs(q.x - s.cx); best = q; }
  }
  if (best) pGoFill(g, best, s);
}
function pTaskFill(g: Game, p: Peasant, k: Task) {
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
   bucket leaves it (ideas.ts iScoop) */
function pLift(g: Game, i: number, j: number) {
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
var P_GW = 21;                     /* the gardens, across: pool, three terraces, cistern */
var P_GPW = 3;                     /* the pool, across, inside its walls (room for whoever digs it out, and clears it) */
var P_GLIP = [4, 9, 14];           /* each terrace's lip (and the pier under it; the first is the pool's wall); its bed is the columns after, to the next */
/* (a built gardens' own measures, kept on its site when it was planned: the constants may have changed since) */
function pGLip(s: Site) { return (s && s.glip) || P_GLIP; }
function pGC(s: Site) { return (s && s.gc) || P_GC; }
function pGW(s: Site) { return (s && s.gw) || P_GW; }
function pGBedEnd(s: Site, k: number) { return k < 2 ? pGLip(s)[k + 1] - 1 : pGC(s) - 1; }   /* (four, four, and three under the cistern) */
function pGPoolN(s: Site) { return (s.bw || P_GPW) * (s.bh || P_GPOOL); }
var P_GC = 18;                     /* the cistern: its low wall (spilling onto the top terrace), its inside, its high wall */
var P_GSTEP = 5;                   /* rows each terrace stands over the last */
var P_GSKY = 7;                    /* clear rows over each (wheat grows I_CROP_H, give or take two) */
var P_GPOOL = 5;                   /* the pool: P_GPW wide, this deep */
var P_GPOOL_N = P_GPW * P_GPOOL;   /* and so this much water in it, full */
var P_GTURN = 6;                   /* water in the pool (and more) for somebody to start turning the screw; under it, it is filled */
var P_GSTOP = 3;                   /* and under this, whoever is turning it stops */
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
    return "the pool: " + (pGPoolN(s) - wBathNeed(g, s)) + " of " + pGPoolN(s) + ". the cistern: " + pCisternWater(g, s) + (pTurner(g, s) ? ". the screw is turning" : "");
  },
  mood: function (g, p, k) {
    if (k.kind === "screw") return k.on ? "is turning the screw at the hanging gardens, and singing" : "is off to turn the screw at the gardens";
    if (k.kind === "pfill") { var s = bSite(g, k.site); return s ? (p.pail ? "is carrying a bucket of water to " + bLabel(s) : "is fetching water for " + bLabel(s)) : ""; }
    return "";
  }
});
/* nowhere for another field (iPlanFarm found none): with none anywhere in the valley either, the village hears about
   it, and whoever looked has the gardens put into their head */
function pGardensNoRoom(g: Game, p: Peasant, wide: boolean) {
  if (g.noFieldT > g.tick) return;
  g.noFieldT = g.tick + 3000;
  if (!wide && (iFarmSpot(g, -1, -1, null, false) || iFarmSpot(g, -1, -1, null, true))) return;   /* (room, just not near here) */
  if (!g.noField) iNoRoom(g, "another field");
  g.noField = g.tick || 1;
  wSpark(g, p, "gardens");
}
/* the gardens' columns, foot first: u (0 .. P_GW - 1) to x */
function pGU(s: Site, u) { return s.d > 0 ? s.x0 + u : s.x0 + pGW(s) - 1 - u; }
/* terrace k's bed row, over the pool's waterline Y0 */
function pGBed(Y0, k) { return Y0 - 3 - P_GSTEP * k; }
function pPlanGardens(g: Game, p: Peasant) {
  var best = null;
  for (var d = -1; d <= 1; d += 2) {
    var r = wPlot(g, { w: P_GW, sky: 6, rough: 22, near: wMiddle(g), fit: function (g, x0, gy) { return pGardensFit(g, x0, gy, d); } });
    if (r && (!best || r.score > best.score)) { best = r; best.d = d; }
  }
  if (!best) return false;
  var f = best.r, x0 = best.x0, d: number = best.d, Y0 = f.Y0;
  var s = bNew(g, "gardens", p, wCleared(g, best, f.plan), [x0, pGBed(Y0, 2) - P_GSKY - 1, x0 + P_GW - 1, Y0 + P_GPOOL],
               { wonder: true, d: d, Y0: Y0, bath: true, L: Y0, px0: d > 0 ? x0 + 1 : x0 + P_GW - 1 - P_GPW, bw: P_GPW, bh: P_GPOOL, gw: P_GW, glip: P_GLIP.slice(), gc: P_GC,
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
function pGardensFit(g: Game, x0: number, gy: number, d: number) {
  function X(u) { return d > 0 ? x0 + u : x0 + P_GW - 1 - u; }
  function Gy(u) { return gy[X(u) - x0]; }
  var plan = [], at = {}, u, y, k, c, x, brick = 0, dig = 0, Y0 = -1;
  for (u = 0; u <= P_GLIP[0]; u++) Y0 = Math.max(Y0, Gy(u));
  for (u = 0; u <= P_GLIP[0]; u++) if (Y0 - Gy(u) > 2) return null;   /* (the pool wants level ground) */
  if (Y0 - Gy(P_GW - 1) < 0) return null;                     /* (and the stair goes up from it, or along: never down) */
  var crankX = X(0) - d, cg = mGroundNear(g, crankX, false, Y0);
  if (cg < 0 || Math.abs(cg - Y0) > 2 || !pRoom(g, crankX, cg - 1)) return null;   /* (somewhere to stand at the crank) */
  function put(u, y: number, v: number, ph: number) { var e = bE(g, X(u), y, v, ph); plan.push(e); at[e.i] = e; return e; }
  /* (out of the way: sand dug, rock cut, a tree felled. false for anything else, somebody's or not to be shifted) */
  function digOut(u, y: number, ph?: number) {
    c = pCell(g, X(u), y);
    if (AIRY[c]) return true;
    if (ROCK[c] && !bMarked(g, X(u), y)) { put(u, y, MAT.EMPTY, ph || 0).mine = true; dig += 3; return true; }
    if (!B_DIG[c] && !mFellable(g, X(u), y, c)) return false;
    put(u, y, MAT.EMPTY, ph || 0).clear = ph === 40; dig++; return true;   /* (sky over a bed, cleared again whenever sand slides into it) */
  }
  /* (brick, whatever is there but rock: driven into sand, as a tier of the theatre's is, so that what it holds back
     does not pour in while it goes in. bottom up, a row at a time) */
  function brickAt(u, y: number, ph?: number) {
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
  for (u = 0; u <= P_GLIP[0]; u++) {
    x = X(u);
    for (y = Math.min(Gy(u), Y0 - 1); y <= Y0 + P_GPOOL; y++) {
      if (u === 0 || u === P_GLIP[0] || y === Y0 + P_GPOOL) {
        c = pCell(g, x, y);
        if (y >= Y0 && ROCK[c]) continue;   /* (rock where a wall goes is the wall: nobody cuts it out from the bottom of a pit) */
        if (u > 0 && u < P_GLIP[0]) { if (!AIRY[c] && !B_DIG[c]) return null; put(u, y, MAT.CONCRETE, 9).drive = !AIRY[c]; continue; }
        if ((u === 0 || y >= Y0) && !brickAt(u, y, 2 + Y0 + P_GPOOL - y)) return null;
      }
      else {
        if (!digOut(u, y)) return null;
        /* (the inside of the pool kept clear: sand washed into it is cleared out again, as a pond's is. build.ts bInspect) */
        if (y >= Y0) { var ie = at[y * g.gw + x] || put(u, y, MAT.EMPTY, 0); ie.clear = true; }
      }
    }
    if (!pSolid(g, x, Y0 + P_GPOOL + 1)) return null;
  }
  /* (nothing runny about it, down as far as it is dug: a pool dug beside a pond is the pond) */
  for (u = -3; u <= P_GLIP[0] + 3; u++) for (y = Y0 - 2; y <= Y0 + P_GPOOL + 2; y++) { c = pCell(g, X(u), y); if (LIQUID[c] || c === MAT.DRAIN) return null; }
  /* the terraces: each a pier at its lip from the ground up, a floor, a bed of sand, and sky over it */
  for (k = 0; k < 3; k++) {
    var a = P_GLIP[k], Yk = pGBed(Y0, k), next = k < 2 ? P_GLIP[k + 1] : P_GC;
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
  /* (and no hill going on up past it, higher than its wall: what is up there would come down over it, into it and onto
     the top terrace, every time the wind did not blow) */
  for (u = P_GW; u <= P_GW + 3; u++) { var gb = mGround(g, X(u)); if (gb >= 0 && gb < Y2 - 5 + (u - P_GW) && !ROCK[pCell(g, X(u), gb)]) return null; }
  for (u = P_GC; u <= P_GC + 2; u++) {
    x = X(u);
    var Gc = Gy(u), top = u === P_GC ? Y2 - 3 : (u === P_GC + 2 ? Y2 - 6 : Y2);
    for (y = Y2 - 7; y < top; y++) if (!digOut(u, y, 40)) return null;
    if (u === P_GC + 1) for (y = Y2 - 5; y < Y2; y++) if (!at[y * g.gw + x]) put(u, y, MAT.EMPTY, 40).clear = true;   /* (the inside of it, kept clear) */
    for (y = top; y <= Y2; y++) {
      c = pCell(g, x, y);
      if (u !== P_GC + 1) { if (!AIRY[c] && !B_DIG[c] && !ROCK[c]) return null; if (!ROCK[c]) brickAt(u, y); continue; }
      if (ROCK[c]) put(u, y, MAT.EMPTY, 40).mine = true;
      else if (!AIRY[c] && !B_DIG[c]) return null;
      put(u, y, MAT.CONCRETE, 70).drive = B_DIG[c] === 1;   /* (poured in where the sand was, as the brick is driven) */
    }
    /* (its pier: the two walls down to the ground, the middle made up only where it is low) */
    for (y = Y2 + 1; y < Gc; y++) if (AIRY[pCell(g, x, y)] && (u !== P_GC + 1 || Gc - y <= 2 || y === Y2 + 1)) brickAt(u, y);
  }
  /* the screw: a slanting tube of iron from the pool's wall up under the terraces to the foot of the cistern (stepped
     down under each floor; through rock, it is drawn rather than made) */
  var tube = [], path = [];
  for (u = P_GLIP[0]; u <= P_GC; u++) {
    k = u < P_GLIP[1] ? 0 : (u < P_GLIP[2] ? 1 : 2);
    y = Math.max(Math.round(Y0 - 1 - (u - P_GLIP[0]) * 11 / (P_GC - P_GLIP[0])), pGBed(Y0, k) + 2);
    if (u === P_GC) y = Math.max(y, Y2 + 1);
    x = X(u); c = pCell(g, x, y);
    var e2 = at[y * g.gw + x];
    path.push(y * g.gw + x);
    if (e2) continue;   /* (behind the brick of a pier: drawn there, not made) */
    if (!AIRY[c] || u <= P_GLIP[0] || u >= P_GC) continue;   /* (where it runs through the hill, or a pier, it is drawn there, not made) */
    tube.push(put(u, y, MAT.GIRDER, 90));
  }
  for (k = 0; k < tube.length; k++) tube[k].cost = P_SCREW_IRON / Math.max(tube.length, 8);
  /* a slope rising away from the pool is what it is for */
  var rise = Y0 - Gy(P_GC - 2);
  return { plan: plan, Y0: Y0, path: path, crankX: crankX, crankY: cg - 1, score: 30 + Math.min(rise, 14) * 2 - brick * 0.15 - dig * 0.05 };
}
/* the pool's dry cells, lowest first (FILLING); none, once it is nearly full */
function pPoolDry(g: Game, s: Site) {
  var out = [], x, y;
  if (pGPoolN(s) - wBathNeed(g, s) >= pGPoolN(s) - 2) return out;
  for (y = s.L + P_GPOOL - 1; y >= s.L; y--) for (x = s.px0; x < s.px0 + P_GPW; x++) if (AIRY[pCell(g, x, y)]) out.push(y * g.gw + x);
  return out;
}
/* the cistern: its one column, and how much water is in it */
function pCisternX(s: Site) { return pGU(s, pGC(s) + 1); }
function pCisternWater(g: Game, s: Site) {
  var n = 0, x = pCisternX(s), Y2 = pGBed(s.Y0, 2);
  for (var y = Y2 - 6; y < Y2; y++) if (WET[pCell(g, x, y)]) n++;
  return n;
}
function pTurner(g: Game, s: Site) { for (var k = 0; k < g.peasants.length; k++) { var q = g.peasants[k]; if (!q.dead && q.task && q.task.kind === "screw" && q.task.site === s.id) return q; } return null; }
/* finished: the beds are three fields now (farm sites, with terrace: the gardens' id), and the gardens let go of them */
function pGardensDone(g: Game, s: Site, p: Peasant) {
  feed(g, "the hanging gardens are built. now the terraces want sowing, and the pool wants filling", "#ffd94a", "plan" + s.id);
  s.plan = s.plan.filter(function (e) { return !e.bed; });
  s.built = true;
  pTerraces(g, s);
}
/* a field on each terrace that has none */
/* a terrace field tilled, and a stalk in every furrow, green or ripe: sown, whether or not the sower stayed to say so
   (a stalk that ripened before anybody called the field finished would otherwise hold it up, and in time the village
   would give up on a field with wheat standing in it) */
function pTerracesSown(g: Game, s: Site) {
  for (var k = 0; k < g.sites.length; k++) {
    var t = g.sites[k];
    if (t.kind !== "farm" || t.terrace !== s.id || t.done) continue;
    if (t.plan.every(function (e) { var c = g.m[e.i]; return bOk(g, e) || (e.v === MAT.CROP && (c === MAT.CROP || c === MAT.WHEAT)); })) { t.done = true; t.repair = t.sow = false; t.last = g.tick; }
  }
}
function pTerraces(g: Game, s: Site) {
  for (var k = 0; k < 3; k++) {
    var have = false, j, u;
    for (j = 0; j < g.sites.length; j++) if (g.sites[j].kind === "farm" && g.sites[j].terrace === s.id && g.sites[j].tier === k) have = true;
    if (have) continue;
    var Yk = pGBed(s.Y0, k), plan = [], xa = 1e9, xb = -1;
    for (u = pGLip(s)[k] + 1; u <= pGBedEnd(s, k); u++) {
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
function pGardensPick(g: Game, p: Peasant, hungry) {
  var s = mSites(g, "gardens", true)[0];
  if (!s || hungry || s.repair) return false;
  if (pGPoolN(s) - wBathNeed(g, s) < P_GTURN && Math.abs(s.cx - p.x) < 220 && Math.random() < 0.4 && pGoFill(g, p, s)) return true;
  return false;
}
/* every W_STRIDE ticks: the terraces kept, and a screw-turner while there is water in the pool to lift */
function pGardensStep(g: Game, s: Site) {
  if (s.built) pTerracesSown(g, s);   /* (mending, or not) */
  if (!s.done || s.repair) return;
  if (g.tick % 600 === 0) pTerraces(g, s);   /* (a terrace the village gave up on is a terrace again, a while later) */
  pCallFill(g, s, pGPoolN(s) - P_GTURN);   /* (filled up before it is too low to turn the screw on: or it never is) */
  if (pTurner(g, s) || pGPoolN(s) - wBathNeed(g, s) < P_GTURN || g.tick < (s.turnT || 0) || g.blaze.length) return;
  /* (not until the terraces are sown: a furrow under water is a furrow nobody can sow) */
  for (var j = 0; j < g.sites.length; j++) if (g.sites[j].terrace === s.id && !g.sites[j].done) return;
  var best = null, bd = 1e9, k, q;
  for (k = 0; k < g.peasants.length; k++) {
    q = g.peasants[k];
    if (!wIdle(g, q, s) || Math.abs(q.x - s.cx) > 220) continue;
    var dd = Math.abs(q.x - s.cx) - (q.id === s.turner ? 40 : 0);
    if (dd < bd) { bd = dd; best = q; }
  }
  if (best) { best.task = { kind: "screw", site: s.id, t: 0, act: 0, n: 0 }; s.turner = best.id; }
}
/* the crank: round and round, and every P_SCREW strokes a cell of water out of the top of the pool and into the top of
   the cistern, heat and all (the oil pump's take and place, for water) */
function pTaskScrew(g: Game, p: Peasant, k: Task) {
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
  for (y = s.L; y < s.L + P_GPOOL && from < 0; y++) for (x = s.px0; x < s.px0 + P_GPW; x++) if (WET[pCell(g, x, y)]) { from = y * g.gw + x; break; }
  for (y = Y2 - 6; y < Y2 && to < 0; y++) if (pCell(g, cxs, y) === MAT.EMPTY) to = y * g.gw + cxs;
  if (from < 0 || to < 0 || pGPoolN(s) - wBathNeed(g, s) < P_GSTOP || k.n >= P_SHIFT) {
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
function pDrawGardens(g: Game, s: Site) {
  if (!s.done) return 0;
  var k, y, Y0 = s.Y0, t = pTurner(g, s), turning = t && t.task.on;
  for (k = 0; k < 3; k++) {
    var Yk = pGBed(Y0, k), lx = pGU(s, pGLip(s)[k]), foot = k ? pGBed(Y0, k - 1) - 1 : Y0 - 1;
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
    var i: number = S[k], c = g.m[i];
    if (c !== MAT.GIRDER) g.px[i] = blend32(g.px[i], P_SCREW_D, AIRY[c] ? 0.9 : 0.55);
    if (turning && ((((i % g.gw) * s.d * 3 - ((g.t * 8) | 0)) % 4 + 4) % 4 === 0)) g.px[i] = blend32(g.px[i], P_SCREW_HI, 0.6);
  }
  return 0;
}

/* =====================================================================
   THE STEAM ORGAN: the kettle sang, so what if a lot of kettles sang.
   a firebrick firebox, an iron tank of forty cells of water over it,
   and on the tank's lid a rack of seven pipes, each a channel of thin
   air one cell wide walled with tinned stone, six to eighteen high, each
   with a valve where it leaves the lid (a length of girder the
   organist takes out and puts back). the organist fires the boiler
   well before a show, and once it is boiling opens the valves to a
   tune: the steam goes up whichever pipe is open, and every cell of it
   that leaves the top of a pipe plays that pipe's note. a concert is
   about thirty notes, and about a tankful. the loop is open: the steam
   goes up to the top of the sky, cools, and rains back down about
   where it rose. what falls in the gutter at its foot, or back down
   the pipes, the organist bails back into the tank; the rest is rain
   on whatever is next to the organ. and the tank is topped up from the
   pond, a bucket at a time
   ===================================================================== */
var P_OW = 13;                     /* the organ, across: the stand and the ladder, the tank and its rack, the gutter */
var P_ON = 5;                      /* pipes */
var P_OH = [6, 8, 10, 12, 14];     /* the pipes, left to right: the tallest is the lowest note */
var P_OHZ = [392, 349, 330, 294, 262];   /* and their notes: G F E D C */
var P_OTH = 4;                     /* the tank, inside: rows (and nine across, between the rack's end walls) */
var P_OBW = 9;
var P_OTANK = P_OBW * P_OTH;       /* cells of water in a full tank */
var P_OSHOW = 30;                  /* a tank wants at least this much in it to give a concert */
var P_OGAP = 14000;                /* ticks between concerts it gives of its own accord, at the least */
var P_OLEAD = 1800;                /* and how long before one the organist starts firing it */
var P_ONOTE = 220;                 /* ticks a valve stays open for a note that will not come, before the next */
/* the tunes: [note (0 is the lowest, C; 6 is B), breaths (steam cells for it: one, or two for a long one)] */
var W_TUNES = [
  { name: "the one about the duck", n: [[2, 1], [2, 1], [3, 1], [4, 1], [4, 1], [3, 1], [2, 1], [1, 1], [0, 1], [0, 1], [1, 1], [2, 1], [2, 2], [1, 1], [1, 2],
                                        [2, 1], [2, 1], [3, 1], [4, 1], [4, 1], [3, 1], [2, 1], [1, 1], [0, 1], [0, 1], [1, 1], [2, 1], [1, 2], [0, 1], [0, 2]] },
  { name: "the little one who went off", n: [[4, 1], [2, 1], [2, 2], [3, 1], [1, 1], [1, 2], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [4, 1], [4, 2],
                                        [4, 1], [2, 1], [2, 2], [3, 1], [1, 1], [1, 2], [0, 1], [2, 1], [4, 1], [4, 1], [0, 2], [0, 1], [1, 1], [2, 1], [1, 1], [0, 2]] },
  { name: "the long walk home", n: [[0, 1], [2, 1], [4, 1], [2, 1], [0, 1], [2, 1], [4, 2], [1, 1], [3, 1], [4, 1], [3, 1], [1, 1], [3, 1], [4, 2], [2, 1],
                                        [3, 1], [4, 1], [3, 1], [2, 1], [3, 1], [4, 2], [3, 1], [2, 1], [1, 1], [0, 1], [1, 1], [0, 1], [2, 1], [1, 1], [0, 2]] }
];

P_SAY.idea_organ = ["the kettle sang. what if a lot of kettles sang. at once", "steam, but music", "a kettle the size of a house", "it hissed in tune. nearly"];
P_SAY.planOrgan = ["pipes. lots of pipes", "a kettle, and a lot of chimneys", "it's going to be LOUD", "an organ! a steam one!"];
P_SAY.organFire = ["get it boiling", "more coal, she's not singing yet", "*clunk*", "nearly there"];
P_SAY.organist = ["and... the next bit", "*pulls a lever*", "this is the good part", "from the top", "nobody clap yet"];
P_SAY.breathe = ["let it breathe", "she's building up. open one", "too much steam in her", "*pssssh*"];
P_SAY.bitLoud = ["it's a bit loud", "IT'S A BIT LOUD", "lovely. what?", "is that the one about the duck", "*sways*", "my ears"];
P_SAY.organBail = ["*slosh*", "back in you go", "the rain's come back", "every drop counts"];

wDef({
  id: "organ",
  idea: { name: "the steam organ", title: "THE STEAM ORGAN", sub: "the kettle sang. what if a lot of kettles sang. at once", hint: "concrete, a show, and a furnace worked hard",
          ready: function (g) { return !!g.know.concrete && !!g.know.festival && (g.iron || 0) + (g.kilnN || 0) >= 50; } },
  achieve: ["THE STEAM ORGAN", "a boiler, a tank and seven pipes. it plays at shows. it is a bit loud"],
  watch: pOrganWatch,
  plan: pPlanOrgan,
  pick: pOrganPick,
  task: function (g, p, k) { return k.kind === "organ" ? pTaskOrgan(g, p, k) : (k.kind === "pfill" ? pTaskFill(g, p, k) : undefined); },
  step: pOrganStep,
  tick: pOrganTick,
  inside: pOInside,   /* (nobody's place: wonders.ts wEvict) */
  partOfIt: function (g, s, f) { for (var k = 0; k < f.length; k++) { var u = f[k] % g.gw - s.x0, y = (f[k] / g.gw) | 0; if (y !== s.G - 1 || u < 5 || u > 7) return false; } return true; },
  draw: pDrawOrgan,
  finish: function (g, s, p) {
    feed(g, "the steam organ is built. it wants filling, then a show", "#ffd94a", "plan" + s.id);
    var V = [0, 1, 2, 3, 4, 5, 6].map(function (n) { return pOValve(g, s, n); });
    s.plan = s.plan.filter(function (e) { return V.indexOf(e.i) < 0; });   /* (the valves are the organist's now) */
    s.nextT = g.tick + 4000; g.wTick = true;
  },
  dry: function (g, s) { return pOrganDry(g, s); },
  spout: function (g, s) { return { x: s.x0, y: s.G - 1 }; },
  label: function () { return "the steam organ"; },
  readout: function (g, s) {
    if (!s.done) return "";
    var w = P_OTANK - wBathNeed(g, s), t = pOrganT(g, s);
    if (s.state === "playing") return "playing " + W_TUNES[s.tune].name + ": note " + (s.ni + 1) + " of " + W_TUNES[s.tune].n.length;
    return "the tank: " + w + " of " + P_OTANK + ", at " + Math.round(t) + "°" + (s.state === "firing" ? ". being fired for a concert" : "") +
           (s.concerts ? ". " + s.concerts + " concert" + (s.concerts > 1 ? "s" : "") + " so far" : "");
  },
  mood: function (g, p, k) {
    if (k.kind === "organ") { var s = bSite(g, k.site); return !s ? "" : s.state === "playing" ? "is playing the steam organ" : (k.coal === false ? "is fetching coal for the steam organ" : "is firing the steam organ"); }
    if (k.kind === "audience" && k.of === "concert") return "is listening to the steam organ. it is a bit loud";
    return "";
  }
});
/* the furnace worked hard, a show, concrete: whoever is at the furnace has it put into their head (the kettle on the
   furnace, hissing) */
function pOrganWatch(g: Game) {
  var I = wIdea("organ");
  if (!I.ready(g)) return;
  for (var k = 0; k < g.peasants.length; k++) {
    var q = g.peasants[k];
    if (!q.dead && q.task && (q.task.kind === "smelt" || q.task.kind === "kiln" || q.task.kind === "forge")) { wSpark(g, q, "organ"); return; }
  }
}
/* the organ's cells, by u (0 .. P_OW - 1) across and rows over the apron (G) */
function pOPipeX(s: Site, n: number): number { return s.x0 + 2 + 2 * n; }
function pOLid(G) { return G - 3 - P_OTH; }   /* the lid's row (the valves are in it); the pipes stand on it */
/* where it goes: on level ground with a lot of sky over it, near where the shows go up */
function pPlanOrgan(g: Game, p: Peasant) {
  var r = wPlot(g, { w: P_OW, sky: 27, rough: 8, pad: 2, near: g.festX || wMiddle(g), fit: pOrganFit });
  if (!r) return false;
  var x0 = r.x0, G = r.r.G;
  /* (the tips stone to begin with, and gilded afterwards if there is gold about: wonders.ts wRegild. a tip of gold at the top of a
     pipe, waiting on gold, would hold up the rest) */
  var plan = wCleared(g, r, r.r.plan);
  plan.forEach(function (e) { if (e.v === MAT.GOLD) { e.v = MAT.BRICK; e.gild = true; } });
  var s = bNew(g, "organ", p, plan, [x0, pOLid(G) - P_OH[P_ON - 1] - 1, x0 + P_OW - 1, G],
               { wonder: true, G: G, bath: true, L: pOLid(G) + 1, px0: x0 + 2, bw: P_OBW, bh: P_OTH, state: "idle", tune: 0, ni: 0, cur: -1,
                 notes: 0, concerts: 0, caught: 0, exits: [0, 0, 0, 0, 0], mo: [0, 0, 0, 0, 0] });
  feed(g, p.name + " is building a steam organ. it is going to be loud", "#ffd94a", "plan" + s.id);
  pSay(g, p, "planOrgan", true);
  if (bCarries(p)) bJoin(g, p, s);
  return true;
}
/* the organ at x0 on ground gy: an apron of concrete at the ground's row G (a gutter sunk in it at the right-hand end),
   a plinth of brick with the firebox in the middle of it, the tank, the lid, the rack, and a ladder up the left of
   it to the first pipe (the rack is a stair from there, for whoever builds it and whoever mends it) */
function pOrganFit(g: Game, x0: number, gy: number, hi, lo) {
  /* (the apron's row: the lowest of the ground, the high end dug down to it (two rows at most); or higher, on a terrace
     of stone made up under the low end. whichever wants the least stone) */
  var best = null;
  for (var G = lo; G >= hi; G--) { var r = pOrganAt(g, x0, gy, G); if (r && (!best || r.score > best.score)) best = r; }
  return best;
}
function pOrganAt(g: Game, x0: number, gy: number, G) {
  var plan = [], u, y, c, x, n, work = 0;
  function put(u, y: number, v: number, ph: number, cost?: number) { var e = bE(g, x0 + u, y, v, ph); if (cost != null) e.cost = cost; plan.push(e); return e; }
  for (u = 0; u < P_OW; u++) {
    x = x0 + u;
    /* (the ground made level: anything over the apron's row dug out, and something firm under it: the ground, or a
       terrace, from the ground up) */
    /* (no more than a couple of rows of it dug: a bank dug into any deeper comes down on whoever is digging) */
    if (gy[u] < G - 2) return null;
    for (y = gy[u]; y < G; y++) { c = pCell(g, x, y); if (!B_DIG[c]) return null; put(u, y, MAT.EMPTY, 0); }
    for (y = gy[u] - 1; y > G; y--) { put(u, y, MAT.BRICK, wFillPh(y)); work++; }
    if (gy[u] <= G + 1 && !pSolid(g, x, G + 1)) return null;
    c = pCell(g, x, G);
    if (!AIRY[c] && !B_DIG[c] && !ROCK[c]) return null;
    /* (the gutter, at the right-hand end: a pit sunk in the apron, its floor concrete, the ground beyond its far side) */
    if (u === P_OW - 1) {
      if (!pSolid(g, x0 + P_OW, G)) return null;
      c = pCell(g, x, G + 1);
      if (!ROCK[c]) { if (!AIRY[c] && !B_DIG[c]) return null; put(u, G + 1, MAT.CONCRETE, 1).drive = !AIRY[c]; }
      if (!AIRY[pCell(g, x, G)]) put(u, G, MAT.EMPTY, 0);
      continue;
    }
    put(u, G, u >= 4 && u <= 8 ? MAT.FIREBRICK : MAT.CONCRETE, 1);
  }
  /* the plinth, and the firebox in the middle of it */
  for (u = 1; u <= 11; u++) {
    if (u >= 5 && u <= 7) continue;
    put(u, G - 1, u === 4 || u === 8 ? MAT.FIREBRICK : MAT.BRICK, 3);
  }
  /* the tank: an iron floor, two iron sides, an iron lid with a valve under each pipe. plate iron, riveted: not a lattice a
     peasant steps through (a girder is, P_PASS), and into the boiling water. it costs what girder does, in bars */
  var L0 = pOLid(G);
  function iron(u, y: number, ph: number) { var e = put(u, y, MAT.METAL, ph); e.res = "iron"; e.cost = B_AMT[MAT.GIRDER]; return e; }
  for (u = 1; u <= 11; u++) { iron(u, G - 2, 4); iron(u, L0, 9); }
  for (y = L0 + 1; y <= G - 3; y++) { iron(1, y, 5 + G - 3 - y); iron(11, y, 5 + G - 3 - y); }
  /* the rack: a wall each side of each pipe, as high as the taller of the two, gilded at the tips of the three tallest if
     there is gold. (dressed stone, thin, and tinned: iron, a peasant walks through, as they do the lattice of a lift's
     headframe, and nobody could stand on the rack to build it any higher. as it is, it is a stair, from the ladder) */
  for (u = 1; u <= 11; u += 2) {
    var h = Math.max(u > 1 ? P_OH[(u - 3) >> 1] : 0, u < 11 ? P_OH[(u - 1) >> 1] : 0);
    for (y = L0 - 1; y >= L0 - h; y--) put(u, y, y === L0 - h && u >= 7 ? MAT.GOLD : MAT.BRICK, 10 + L0 - 1 - y, 0.1);
  }
  /* the ladder, up the left of it to the first pipe's top */
  for (y = G - 1; y >= L0 - P_OH[0] - 1; y--) put(0, y, MAT.LADDER, 10 + G - 1 - y).a = 1;   /* (one wide: its middle is itself, aux 1) */
  /* (sky over all of it, and no tree or roof to stop the steam on its way up) */
  for (u = 0; u < P_OW; u++) for (y = L0 - P_OH[P_ON - 1] - 2; y >= Math.max(0, G - 60); y -= 3) { c = pCell(g, x0 + u, y); if (!AIRY[c]) return null; }
  for (n = 0; n < plan.length; n++) if (plan[n].v === MAT.GOLD) plan[n].cost = null;
  return { plan: plan, G: G, score: 20 - work * 0.2 };
}
function pOrganT(g: Game, s: Site) {
  var t = 0, n = 0;
  for (var x = s.px0; x < s.px0 + P_OBW; x++) for (var y = s.L; y < s.L + P_OTH; y++) { var j = y * g.gw + x; if (WET[g.m[j]]) { t += g.T[j]; n++; } }
  return n ? t / n : AMBIENT;
}
/* the steam in the tank, up under the lid */
function pOrganSteam(g: Game, s: Site) {
  var n = 0;
  for (var x = s.px0; x < s.px0 + P_OBW; x++) for (var y = s.L; y < s.L + P_OTH; y++) if (g.m[y * g.gw + x] === MAT.STEAM) n++;
  return n;
}
function pOrganDry(g: Game, s: Site) {
  var out = [], x, y;
  if (s.state !== "idle" || P_OTANK - wBathNeed(g, s) >= P_OTANK - 2) return out;
  for (y = s.L + P_OTH - 1; y >= s.L; y--) for (x = s.px0; x < s.px0 + P_OBW; x++) if (g.m[y * g.gw + x] === MAT.EMPTY) out.push(y * g.gw + x);
  return out;
}
function pOValve(g: Game, s: Site, n: number) { return pOLid(s.G) * g.gw + pOPipeX(s, n); }
/* THE GRATES: each pipe's valve, and the top of each pipe, are grates. steam goes up through them, open or shut, as it
   goes through air; a peasant does not, walking, standing or falling (peasants.ts pSolid, pFoot, pBody, pStiff). nobody
   drops down a pipe, or through an open valve into the boiling tank. cached for the tick: P_GRATE is scratch */
var P_GRATE = { g: null, t: -1, n: -1, gen: -1, j: null, m: null, c: null };
function pGrate(g: Game, j: number) {
  if (P_GRATE.g !== g || P_GRATE.t !== g.tick || P_GRATE.n !== g.sites.length || P_GRATE.gen !== SAVE_GEN) pGrateFill(g);   /* (a load: save.ts SAVE_GEN) */
  return P_GRATE.j !== null && j >= 0 && j < P_GRATE.m.length && P_GRATE.m[j] === 1;
}
/* (the cells as a map, by cell, and the columns they are in: P_GRATE.j is the list of them, or null for none) */
function pGrateFill(g: Game) {
  var C = P_GRATE, N = g.gw * g.gh, J = null, k, i;
  if (C.j !== null) for (k = 0; k < C.j.length; k++) { C.m[C.j[k]] = 0; C.c[C.j[k] % C.c.length] = 0; }
  if (!C.m || C.m.length !== N || C.c.length !== g.gw) { C.m = new Uint8Array(N); C.c = new Uint8Array(g.gw); }
  for (k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (s.kind !== "organ" || !s.done) continue;
    J = J || [];
    for (var n = 0; n < P_ON; n++) {
      i = pOValve(g, s, n); if (i >= 0 && i < N && C.m[i] !== 1) { C.m[i] = 1; C.c[i % g.gw] = 1; J.push(i); }
      i = (pOLid(s.G) - P_OH[n]) * g.gw + pOPipeX(s, n); if (i >= 0 && i < N && C.m[i] !== 1) { C.m[i] = 1; C.c[i % g.gw] = 1; J.push(i); }
    }
  }
  C.g = g; C.t = g.tick; C.n = g.sites.length; C.gen = SAVE_GEN; C.j = J;
}
function pOOpen(g: Game, s: Site, n: number) { var j = pOValve(g, s, n); if (g.m[j] === MAT.METAL) { heatVanish(g, j); g.fx.clank++; } }
/* shut: the iron of the valve back in the lid, if there is nothing in the way of it (steam on its way through: next tick) */
function pOShut(g: Game, s: Site, n: number) {
  var j = pOValve(g, s, n);
  if (g.m[j] === MAT.METAL) return true;
  if (g.m[j] !== MAT.EMPTY) return false;
  sandSet(g, j, MAT.METAL); g.aux[j] = 0; heatAccept(g, j); g.fx.clank++;
  return true;
}
function pOAllShut(g: Game, s: Site) { for (var n = 0; n < P_ON; n++) if (g.m[pOValve(g, s, n)] !== MAT.METAL) return false; return true; }
/* a concert, if the organ is up and has the water for one: fired now, played once it boils. for any show that wants
   it (a fireworks show, the theatre's interval, a service: monuments.ts may call it). true if it will play */
function pOrganPlay(g: Game, why) {
  var s = mSites(g, "organ", true)[0];
  if (!s || s.repair) return false;
  if (s.state !== "idle") return true;
  if (P_OTANK - wBathNeed(g, s) < P_OSHOW) return false;
  s.state = "firing"; s.why = why || ""; s.fireT = g.tick;
  return true;
}
/* every tick, while it stands: a puff of steam out of the top of a pipe is that pipe's note. the valve of the note
   being played is shut again once it has had its breaths */
/* is (x, y) inside the organ: in its tank, or down a pipe, or in a valve. nobody's place */
function pOInside(g: Game, s: Site, x: number, y: number) {
  if (x >= s.px0 && x < s.px0 + s.bw && y >= s.L && y < s.L + s.bh) return true;
  for (var n = 0; n < P_ON; n++) if (x === pOPipeX(s, n) && y >= pOLid(s.G) - P_OH[n] && y <= pOLid(s.G)) return true;
  return false;
}
function pOrganTick(g: Game, s: Site) {
  if (!s.done) return;
  var t = -1;
  for (var n = 0; n < P_ON; n++) {
    var x = pOPipeX(s, n), y = pOLid(s.G) - 1 - P_OH[n], st = g.m[y * g.gw + x] === MAT.STEAM ? 1 : 0;
    if (st && !s.mo[n]) {
      s.exits[n]++; s.notes++;
      if (t < 0) t = pOrganT(g, s);
      /* (cool, it goes flat; a thin note, quieter) */
      var v = clamp(pOrganSteam(g, s) / 4 + 0.4, 0.3, 1);
      if (P_OQ.length < 16) P_OQ.push([P_OHZ[n] * (t < 98 ? 0.94 : 1), v]);
      if (s.state === "playing" && s.cur === n) s.got++;
    }
    s.mo[n] = st;
  }
  if (s.state === "playing" && s.cur >= 0 && s.got >= s.need && pOShut(g, s, s.cur)) s.cur = -2;
}
var P_OQ = [];
function pOrganSounds(g: Game) { if (!g.quiet) for (var k = 0; k < P_OQ.length; k++) SFX.organ(P_OQ[k][0], P_OQ[k][1]); P_OQ.length = 0; }
/* every W_STRIDE ticks: a concert now and then of its own accord, an organist for it, the audience, and a boiler
   shut up tight with steam in it let breathe */
function pOrganStep(g: Game, s: Site) {
  if (!s.done || s.repair) return;
  g.wTick = true;
  var o = pOrganist(g, s), k, q;
  if (s.state === "idle" && g.tick >= (s.nextT || 0) - P_OLEAD && P_OTANK - wBathNeed(g, s) >= P_OSHOW) pOrganPlay(g, "");
  if (s.state === "idle") pCallFill(g, s, 6);
  /* the organist: firing, playing, raking out, bailing the gutter, or letting it breathe */
  var steam = pOrganSteam(g, s), lit = pOFire(g, s), wet = pOGutter(g, s).length;
  if (pOAllShut(g, s) && steam >= 3) s.shutT = s.shutT || g.tick; else s.shutT = 0;
  var want = s.state !== "idle" || lit || wet || (s.shutT && g.tick - s.shutT >= 600);
  if (!o && want && !g.blaze.length) {
    var best = null, bd = 1e9;
    for (k = 0; k < g.peasants.length; k++) {
      q = g.peasants[k];
      if (!wIdle(g, q, s) || Math.abs(q.x - s.cx) > 240) continue;
      var d = Math.abs(q.x - s.cx) - ((q.coal || 0) >= 1 ? 40 : 0) - (q.id === s.organist ? 60 : 0);
      if (d < bd) { bd = d; best = q; }
    }
    if (best) { best.task = { kind: "organ", site: s.id, t: 0, act: 0, brave: true }; s.organist = best.id; o = best; }
  }
  /* (nobody to play it, a good while: the concert is off) */
  if (o) s.seenT = g.tick;
  if (s.state === "playing" && g.tick - (s.seenT || 0) > 900) pOrganEnd(g, s, false);
  if (s.state === "firing" && g.tick - s.fireT > 9000) { s.state = "idle"; s.nextT = g.tick + 6000; }
  if (s.state === "playing") {
    /* the audience sways, and somebody has an opinion */
    var H = g.peasants.filter(function (q) { return !q.dead && q.task && q.task.kind === "audience" && q.task.site === s.id; });
    H.forEach(function (q) { q.task.face = ((g.tick / 60) | 0) % 2 ? 1 : -1; });
    if (H.length && (g.tick % 300) === 0) { q = H[irnd(H.length)]; if (q.sayT <= 0) pSay(g, q, "bitLoud", true); }
  }
}
function pOrganist(g: Game, s: Site) { for (var k = 0; k < g.peasants.length; k++) { var q = g.peasants[k]; if (!q.dead && q.task && q.task.kind === "organ" && q.task.site === s.id) return q; } return null; }
/* the firebox's three cells, and what is burning in them */
function pOBox(g: Game, s: Site, u) { return (s.G - 1) * g.gw + s.x0 + 5 + u; }
function pOFire(g: Game, s: Site) { var n = 0; for (var u = 0; u < 3; u++) if (g.m[pOBox(g, s, u)] === MAT.EMBER) n++; return n; }
/* the gutter: what has rained into it (and into the right-hand end of the apron) */
function pOGutter(g: Game, s: Site) {
  var out = [];
  for (var y = s.G - 1; y <= s.G; y++) if (WET[pCell(g, s.x0 + P_OW - 1, y)]) out.push(y * g.gw + s.x0 + P_OW - 1);
  return out;
}
/* the organist: at the stand (by the ladder, at the left), firing it, playing it, raking it out after, and bailing what
   rained back into the gutter into the tank */
function pTaskOrgan(g: Game, p: Peasant, k: Task) {
  var s = bSite(g, k.site);
  if (!s || !s.done || s.repair || ++k.t > 9000) { if (s && s.state === "playing") pOrganEnd(g, s, false); return iDone(p, false); }
  var t = pOrganT(g, s), lit = pOFire(g, s);
  /* coal first, if the fire will want some: their own, off whoever has some, or off the furnace's pile */
  if (s.state !== "idle" && (p.coal || 0) < 1 && !k.noCoal) {
    var chip = iChipIn(g, "coal", 2, p.x, 20, p);
    if (chip >= 1) p.coal = (p.coal || 0) + chip;   /* (all that was chipped in: none of it left in the air) */
    else {
      var f = mSites(g, "furnace", true)[0];
      if (!f || !f.stock || (f.stock.coal || 0) < 1) {
        /* (none anywhere: a concert going on goes on with what heat there is; one not begun is off) */
        if (p.sayT <= 0) pSay(g, p, "nocoal");
        if (s.state === "firing") { s.state = "idle"; s.nextT = g.tick + 3000; return iDone(p, false); }
        k.noCoal = true;
        return true;
      }
      var fsx = f.sx, fsy = mSpotRow(g, f);
      k.coal = false;
      if (Math.abs(p.x - fsx - 0.5) > 1.5 || !mBySpot(g, Math.floor(p.y), fsy)) {
        if (iWalk(g, p, k, "coal" + f.id, fsx, fsy, function (x, y) { return Math.abs(x - fsx) <= 1 && mBySpot(g, y, fsy); })) pGiveUp(g, p, fsx);
        return false;
      }
      var n = Math.min(6, f.stock.coal); f.stock.coal -= n; p.coal = (p.coal || 0) + n;
    }
  }
  k.coal = true;
  /* (the stand: just off the foot of the ladder. an organist is at work at something hot on purpose (task.brave): a
     sounding pipe, or the tank on the boil, beside them is no fire to run from) */
  var sx = s.x0 - 1, sy = s.G - 1;
  if (Math.abs(p.x - sx - 0.5) > 1.5 || Math.abs(Math.floor(p.y) - sy) > 2) {
    if (iWalk(g, p, k, "organ" + s.id, sx, sy, function (x, y) { return Math.abs(x - sx) <= 1 && Math.abs(y - sy) <= 2; })) pGiveUp(g, p, sx);
    return false;
  }
  /* (facing the audience, the keys at their back: facing the firebox, the heat off it would see them off) */
  p.dir = -1; p.idle = 0; k.act++;
  if (s.state === "playing") {
    p.pose = (k.act % 40) < 20 ? "hammerA" : "stand";
    pOrganConduct(g, s, p, t);
  } else p.pose = (k.act % 60) < 30 ? "stand" : ((k.act % 16) < 8 ? "chopA" : "chopB");
  if (k.act % 30) return true;
  var j, u;
  if (s.state === "firing" || s.state === "playing") {
    /* the fire: kept full while it comes up to the boil and while it plays; not past a good head of steam */
    for (u = 0; u < 3; u++) { j = pOBox(g, s, u); if (g.m[j] === MAT.ASH) { heatVanish(g, j); return true; } }
    /* (as many coals as it wants: all three to bring it up, fewer as it nears the boil, and while it plays, only enough
       to keep a breath or two of steam under the lid. a tankful boiled off with the valves shut is a concert wasted) */
    var st = pOrganSteam(g, s), want = s.state === "firing" ? 3 : (st < 2 ? 2 : (st < 4 ? 1 : 0));
    if (lit > want + 1 || (lit && st >= 8)) {
      for (u = 0; u < 3; u++) { j = pOBox(g, s, u); if (g.m[j] === MAT.EMBER) { heatBecome(g, j, MAT.ASH); g.fx.hiss++; break; } }
    } else if (lit < want && (p.coal || 0) >= 1) {
      for (u = 0; u < 3; u++) { j = pOBox(g, s, u); if (g.m[j] === MAT.EMPTY) break; }
      if (u < 3) { sandSet(g, j, MAT.EMBER); g.aux[j] = 1; heatAccept(g, j); p.coal--; s.coals = (s.coals || 0) + 1; g.fx.thud++; if (p.sayT <= 0 && Math.random() < 0.3) pSay(g, p, "organFire"); }
    }
    /* on the boil, and a head of steam under the lid: the concert */
    if (s.state === "firing" && st >= 3) pOrganStart(g, s, p);
    else if (s.state === "firing" && g.tick - s.fireT > 7000) { s.state = "idle"; s.nextT = g.tick + 4000; }   /* (it never came up: another day) */
    return true;
  }
  /* after: the fire raked out (what is burning goes to ash, and keeps its heat) */
  if (lit) { for (u = 0; u < 3; u++) { j = pOBox(g, s, u); if (g.m[j] === MAT.EMBER) { heatBecome(g, j, MAT.ASH); g.fx.hiss++; } } if (p.sayT <= 0) pSay(g, p, "rake"); return true; }
  for (u = 0; u < 3; u++) { j = pOBox(g, s, u); if (g.m[j] === MAT.ASH) { heatVanish(g, j); return true; } }
  /* shut up tight with steam in it a long while: one opened, to let it breathe, until it has */
  if (s.shutT && g.tick - s.shutT >= 600) { pOOpen(g, s, 0); s.breathe = (s.breathe || 0) + 1; s.breatheT = g.tick; s.shutT = 0; pSay(g, p, "breathe", true); return true; }
  if (s.breatheT && pOrganSteam(g, s) < 1 && g.tick - s.breatheT > 60) { if (pOShut(g, s, 0)) s.breatheT = 0; return true; }
  /* the gutter bailed back into the tank */
  var W = pOGutter(g, s), D = [];
  for (j = s.L + P_OTH - 1; j >= s.L && !D.length; j--) for (u = s.px0; u < s.px0 + P_OBW; u++) if (g.m[j * g.gw + u] === MAT.EMPTY) { D.push(j * g.gw + u); break; }
  if (W.length && D.length) { pLift(g, W[0], D[0]); s.caught++; if (p.sayT <= 0 && Math.random() < 0.2) pSay(g, p, "organBail"); return true; }
  if (s.breatheT) return true;
  p.bored = 0;
  return iDone(p, true);
}
/* the concert begins: a tune, the news, and the idle come to listen */
function pOrganStart(g: Game, s: Site, p: Peasant) {
  s.state = "playing"; s.tune = s.concerts % W_TUNES.length; s.ni = 0; s.cur = -1; s.got = 0; s.nextNoteT = g.tick + 30;
  s.startN = s.notes; s.startW = P_OTANK - wBathNeed(g, s) + pOrganSteam(g, s);
  feed(g, "the steam organ is playing " + W_TUNES[s.tune].name + (s.why === "show" ? ", for the show" : ""), "#ffd94a", "organ" + s.id);
  pSay(g, p, "organist", true);
  wGather(g, s, { cap: 99, x: s.x0 - 9, y: mGroundNear(g, s.x0 - 9, false, s.G) - 1, until: g.tick + 4000, kind: "concert", face: 1, R: 200, but: (function () { var b = {}; b[p.id] = 1; return b; })() });
}
/* the organist at the valves: one note at a time, each kept open until it has had its breaths (pOrganTick shuts it),
   or until it is plain no steam is coming */
function pOrganConduct(g: Game, s: Site, p: Peasant, t: number) {
  var T = W_TUNES[s.tune].n;
  if (s.cur === -2) { s.cur = -1; s.ni++; s.nextNoteT = g.tick + 6; }
  if (s.cur >= 0 && g.tick - s.noteT > P_ONOTE) { if (pOShut(g, s, s.cur)) { s.cur = -1; s.ni++; s.nextNoteT = g.tick + 6; } return; }
  if (s.cur >= 0 || g.tick < s.nextNoteT) return;
  if (s.ni >= T.length) { pOrganEnd(g, s, true); return; }
  var n = P_ON - 1 - T[s.ni][0];   /* (the last pipe, the tallest, is the lowest note) */
  s.cur = n; s.need = T[s.ni][1]; s.got = 0; s.noteT = g.tick;
  pOOpen(g, s, n);
  if (s.ni === 10 && p.sayT <= 0) pSay(g, p, "organist", true);
}
function pOrganEnd(g: Game, s: Site, ok: boolean) {
  for (var n = 0; n < P_ON; n++) pOShut(g, s, n);
  s.state = "idle"; s.cur = -1; s.nextT = g.tick + P_OGAP + ((s.id * 7919 + g.tick) % 4000);
  g.peasants.forEach(function (q) { var k = q.task; if (!q.dead && k && k.kind === "audience" && k.site === s.id) { q.task = null; q.taskDone = true; if (ok) { q.bored = 0; if (Math.random() < 0.5) pSay(g, q, "clap", true); } } });
  if (!ok) return;
  s.concerts++; g.fx.clap++;
  s.lastUsed = s.startW - (P_OTANK - wBathNeed(g, s) + pOrganSteam(g, s)); s.lastNotes = s.notes - s.startN;
  if (s.concerts === 1) feed(g, "the first concert on the steam organ. " + s.lastNotes + " notes. it was a bit loud", "#ffd94a", "organ" + s.id);
}
function pOrganPick(g: Game, p: Peasant, hungry) {
  var s = mSites(g, "organ", true)[0];
  if (!s || hungry || s.repair || s.state !== "idle") return false;
  if (wBathNeed(g, s) > 6 && Math.abs(s.cx - p.x) < 220 && Math.random() < 0.4 && pGoFill(g, p, s)) return true;
  return false;
}
var P_OSTEAM = hex32("#e8eef4"), P_OGLOW = hex32("#ff8a3a"), P_OKEYS = hex32("#2a2018"), P_OIVORY = hex32("#e8e0c8");
var P_OPIPE = hex32("#a8acb4"), P_OPIPE_HI = hex32("#e0e4ea"), P_OPIPE_D = hex32("#6a6e78"), P_OMOUTH = hex32("#1a1a20");
var P_OCOPPER = hex32("#b8703a"), P_ORIVET = hex32("#e0a060");
/* the glow of the firebox, a puff over each pipe that is sounding, and the keys at the stand */
function pDrawOrgan(g: Game, s: Site) {
  if (!s.done) return 0;
  var n, hot = pOFire(g, s), x: number, y: number, j, c;
  /* the pipes, burnished: the iron of the rack in pewter, a highlight up the middle of each pipe (its channel, while
     there is nothing in it), the seams between darker, and a mouth near the foot of each. the tank and its lid in
     copper */
  var L0 = pOLid(s.G);
  for (n = 0; n < P_ON; n++) {
    x = pOPipeX(s, n);
    for (y = L0 - 1; y >= L0 - P_OH[n]; y--) {
      var f = 0.15 + 0.5 * (L0 - 1 - y) / P_OH[P_ON - 1];
      j = y * g.gw + x;
      if (g.m[j] === MAT.EMPTY) g.px[j] = y === L0 - 3 ? P_OMOUTH : blend32(P_OPIPE_HI, P_OPIPE, f);
      [-1, 1].forEach(function (d) { var i = j + d; if (g.m[i] === MAT.BRICK || g.m[i] === MAT.METAL) g.px[i] = blend32(g.px[i], d < 0 ? P_OPIPE : P_OPIPE_D, 0.85); });
    }
  }
  for (y = L0; y <= s.G - 2; y++) for (x = s.x0 + 1; x <= s.x0 + 11; x++) {
    j = y * g.gw + x; c = g.m[j];
    if (c === MAT.METAL) g.px[j] = blend32(g.px[j], (x + y) % 5 ? P_OCOPPER : P_ORIVET, 0.75);
  }
  for (n = 0; n < P_ON; n++) if (s.mo[n]) { var x = pOPipeX(s, n), y = L0 - 1 - P_OH[n]; wBack(g, x - 1, y - 1, P_OSTEAM, 0.5); wBack(g, x + 1, y - 1, P_OSTEAM, 0.5); }
  if (hot) for (var u = 0; u < 3; u++) { var j = pOBox(g, s, u); if (g.m[j] === MAT.EMBER) g.gpx[j] = P_OGLOW; }
  /* (a little keyboard on a stand, at the foot of the ladder) */
  wBack(g, s.x0 - 1, s.G - 4, P_OKEYS); wBack(g, s.x0 - 1, s.G - 3, P_OKEYS); wBack(g, s.x0 - 1, s.G - 5, s.state === "playing" ? P_OIVORY : P_OKEYS);
  return hot;
}

/* =====================================================================
   THE DUCK PALACE: if you can't beat them, house them. a plank deck at
   the edge of the biggest fresh water there is, half on the bank and
   half out over the water, a pavilion with a little dome on it (gold,
   if there is gold), three nests under it, a ramp down into the water,
   and at the bank end a trough. whoever reaps the wheat keeps a handful
   of seed back, and the feeder scatters it in the trough: real seed,
   and a duck will go a long way for seed, further than for the wheat
   with a scarecrow in it. a duck at home on the deck has ducklings
   twice as often, and the eldest duck wears a crown. throw a duck at
   it, and the ducks will not go near it for a while
   ===================================================================== */
var P_DW = 11;                     /* the deck, across: five on the bank (the trough at that end), six over the water */
var P_DTROUGH = [1, 2, 3];         /* the trough's columns, between its two lips */
var P_DFEED = 3;                   /* seed to a handful, scattered */
var P_DREACH = 160;                /* how far off a duck notices seed in the trough */
var P_DBOYCOTT = 2000;             /* ticks the ducks keep away, after somebody threw one at it */

P_SAY.idea_duckpalace = ["if you can't beat them, house them", "a house. for the ducks. a nice one", "what if we just fed them", "they keep coming back. give them a reason"];
P_SAY.planDucks = ["a palace. for ducks", "with a dome!", "out over the water, so they feel at home", "they'd better appreciate this"];
P_SAY.feedDucks = ["here, ducky ducky", "dinner!", "the ducks are not impressed. well, a bit", "*scatter scatter*", "one at a time. ONE AT A TIME"];
P_SAY.mobbed = ["they're all over me", "ow. that's my foot", "there's enough for everybody", "QUACK yourself"];
P_SAY.boycott = ["the ducks aren't speaking to us", "they saw what you did", "nobody mention the palace", "it was only one duck"];
P_SAY.crown = ["all hail the duck", "is that a crown?", "your majesty", "she wears it well"];

wDef({
  id: "duckpalace",
  idea: { name: "the duck palace", title: "THE DUCK PALACE", sub: "if you can't beat them, house them", hint: "a scarecrow, and a great many raids on the wheat",
          ready: function (g) { return !!g.know.scarecrow && (g.raids || 0) >= 40 && pDucksAbout(g) >= 4; } },
  achieve: ["THE DUCK PALACE", "a deck, a dome and a trough, for the ducks. they eat there now. mostly"],
  plan: pPlanPalace,
  pick: pPalacePick,
  task: function (g, p, k) { return k.kind === "feedducks" ? pTaskFeedDucks(g, p, k) : undefined; },
  step: pPalaceStep,
  tick: pPalaceTick,
  draw: pDrawPalace,
  drawOver: pDrawCrown,
  finish: function (g, s, p) { feed(g, "the duck palace is built. now it wants seed in the trough", "#ffd94a", "plan" + s.id); g.wDuckPalace = s.id; g.wTick = true; },
  label: function () { return "the duck palace"; },
  readout: function (g, s) {
    if (!s.done) return "";
    if (s.boycott > g.tick) return "the ducks are not speaking to anybody";
    var n = pTroughSeed(g, s).length, h = pPalaceHome(g, s);
    return (n ? n + " seed in the trough" : "the trough is empty") + ". " + h + " duck" + (h === 1 ? "" : "s") + " at home" + (s.hatched ? ". " + s.hatched + " ducklings hatched here" : "");
  },
  mood: function (g, p, k) { return k.kind === "feedducks" ? (k.on ? "is feeding the ducks at the palace" : "is taking seed to the duck palace") : ""; }
});
function pDucksAbout(g: Game) { var n = 0; for (var k = 0; k < g.ducks.length; k++) if (!g.ducks[k].dead && !g.ducks[k].baby) n++; return n; }
/* a duck shooed out of the wheat, the fortieth raid long past: whoever has shooed the most has had enough */
function pShooed(g: Game, p: Peasant) {
  p.shoos = (p.shoos || 0) + 1;
  for (var k = 0; k < g.peasants.length; k++) if (!g.peasants[k].dead && (g.peasants[k].shoos || 0) > p.shoos) return;
  wSpark(g, p, "duckpalace");
}
/* the palace's columns, bank first: u (0 .. P_DW - 1) to x */
function pDU(s: Site, u: number) { return s.d > 0 ? s.x0 + u : s.x1 - u; }
/* the biggest fresh water there is, in bodies: {xa, xb (its surface, across), W (its surface row), n (how much)} */
function pWaters(g: Game) {
  var out = [], x, y, c, cur = null;
  for (x = 2; x < g.gw - 2; x++) {
    for (y = 1; y < g.gh && AIRY[g.m[y * g.gw + x]]; y++);
    /* (under a jetty or a bridge of theirs is still the water's surface) */
    for (var b = 0; b < 4 && y < g.gh - 1 && bMarked(g, x, y) && !WET[g.m[y * g.gw + x]]; b++) for (y++; y < g.gh && AIRY[g.m[y * g.gw + x]]; y++);
    c = y < g.gh ? g.m[y * g.gw + x] : 0;
    if (c !== MAT.WATER) { cur = null; continue; }
    if (!cur || Math.abs(cur.W - y) > 1) { cur = { xa: x, xb: x, W: y }; out.push(cur); }
    cur.xb = x; cur.W = Math.min(cur.W, y);
  }
  /* (how much: counted down from the surface, a column at a time) */
  out.forEach(function (b) { b.n = 0; for (x = b.xa; x <= b.xb; x++) for (y = b.W; y < g.gh && g.m[y * g.gw + x] === MAT.WATER; y++) b.n++; });
  return out.filter(function (b) { return b.n >= 30; }).sort(function (a, b) { return b.n - a.n; });
}
function pPlanPalace(g: Game, p: Peasant) {
  var B = pWaters(g), best = null, k, d, vr = vRange(g), wide = g.gw > VIEW_GW;
  /* (in a wide valley, water the village's range has some of, and a palace wholly in it: world.ts) */
  if (wide) B = B.filter(function (b) { return b.xb >= vr.x0 && b.xa <= vr.x1; });
  for (k = 0; k < B.length && k < 3; k++) for (d = -1; d <= 1; d += 2) {
    var r = pPalaceFit(g, B[k], d);
    if (r && wide && r.plan.some(function (e) { var x = e.i % g.gw; return x < vr.x0 || x > vr.x1; })) r = null;   /* (all of it, ramp and all) */
    if (r && (!best || r.score > best.score)) best = r;
  }
  if (!best) return false;
  /* (the dome: gold if there is gold to spare, and planks painted if there is not) */
  var gold = wPocketedSure(g, "gold");
  best.plan.forEach(function (e) { if (e.v !== MAT.GOLD) return; e.gild = true; e.alt = MAT.PLANK; if (gold >= B_AMT[MAT.GOLD]) gold -= B_AMT[MAT.GOLD]; else { e.v = MAT.PLANK; e.paint = true; } });   /* (gold that goes later is painted planks: wonders.ts wGoldGone) */
  var s = bNew(g, "duckpalace", p, best.plan, [best.x0, best.Y - 10, best.x0 + P_DW - 1, best.Y],
               { wonder: true, d: best.d, Y: best.Y, hatched: 0, fed: 0 });
  feed(g, p.name + " is building a palace. for the ducks", "#ffd94a", "plan" + s.id);
  pSay(g, p, "planDucks", true);
  if (bCarries(p)) bJoin(g, p, s);
  return true;
}
/* the palace on the d > 0 bank of body b (the bank to the left of it) or the d < 0 (the right): {plan, x0, Y (the
   deck's row), d, score} or null. the deck is level with the top of the bank, and out over the water it is the
   water's own height or more over it */
function pPalaceFit(g: Game, b, d) {
  var edge = d > 0 ? b.xa : b.xb, x0 = d > 0 ? edge - 5 : edge - (P_DW - 6), plan = [], u, y, x, c, k;
  if (b.xb - b.xa < 8 || x0 < 6 || x0 + P_DW + 2 > g.gw - 6) return null;
  function X(u) { return d > 0 ? x0 + u : x0 + P_DW - 1 - u; }
  var bank = X(4), Gb = mGround(g, bank);
  if (Gb < 12 || !pSolid(g, bank, Gb) || b.W < Gb) return null;
  /* (the deck level with the top of the bank at the water's edge; the bank behind it dug down to it, or bridged where it
     dips. a beach that climbs steeply is no place for it) */
  var Y = Gb - 1;
  for (u = 0; u <= 4; u++) { var gu = mGround(g, X(u)); if (gu < 0 || gu < Y - 5 || LIQUID[pCell(g, X(u), gu)]) return null; }
  for (k = 0; k < g.sites.length; k++) { var t = g.sites[k]; if (x0 + P_DW + 2 >= t.x0 && x0 - 1 <= t.x1 && Y + 2 >= t.y0 && Y - 11 <= t.y1) return null; }
  function put(u, y: number, v: number, ph: number) { var e = bE(g, X(u), y, v, ph); plan.push(e); return e; }
  /* (sky over it: air, or what a spade or an axe can clear) */
  for (u = 0; u < P_DW; u++) for (y = Y - 10; y <= Y; y++) {
    x = X(u); c = pCell(g, x, y);
    if (AIRY[c] || (y === Y && u <= 4 && (B_DIG[c] || ROCK[c]))) continue;
    if (bMarked(g, x, y) || LIQUID[c] || (!B_DIG[c] && !mFellable(g, x, y, c))) return null;
    put(u, y, MAT.EMPTY, 0);
  }
  /* the deck, out from the bank; the trough's lips; two posts and a roof; the dome */
  for (u = 0; u < P_DW; u++) { c = pCell(g, X(u), Y); if (ROCK[c]) put(u, Y, MAT.EMPTY, 0).mine = true; put(u, Y, MAT.PLANK, 1 + u); }
  put(0, Y - 1, MAT.PLANK, 20); put(4, Y - 1, MAT.PLANK, 20);
  /* (the posts: a duck goes through the foot of one as through a door, which is what it is) */
  for (y = Y - 1; y >= Y - 6; y--) { var v = y >= Y - 3 ? MAT.DOOR : MAT.PLANK; put(5, y, v, 21 + Y - y); put(9, y, v, 21 + Y - y); }
  for (u = 4; u <= 10; u++) put(u, Y - 7, MAT.PLANK, 30);
  for (u = 5; u <= 9; u++) put(u, Y - 8, MAT.PLANK, 31);
  put(6, Y - 9, MAT.PLANK, 32); put(7, Y - 9, MAT.GOLD, 32); put(8, Y - 9, MAT.PLANK, 32); put(7, Y - 10, MAT.GOLD, 33);
  /* the ramp, down into the water off the far end (into it, if the water is up to the deck: a way out of it, too) */
  x = X(P_DW - 1) + d;
  for (y = Y + 1, k = 0; k < 4; y++, k++, x += d) { c = pCell(g, x, y); if (!AIRY[c] && !WET[c]) break; plan.push(bE(g, x, y, MAT.PLANK, 12 + k)); }
  /* (and never where it would leave a swimmer no way out of the water: a deck over the only beach) */
  if (wSeals(g, plan, x0, x0 + P_DW - 1)) return null;
  var mid = wMiddle(g);
  return { plan: plan, x0: x0, Y: Y, d: d, score: b.n * 0.2 - Math.abs(x0 - mid) * 0.05 };
}
/* the trough's cells (where the seed goes) and what is in it */
function pTrough(g: Game, s: Site) { return P_DTROUGH.map(function (u) { return (s.Y - 1) * g.gw + pDU(s, u); }); }
function pTroughSeed(g: Game, s: Site) { return pTrough(g, s).filter(function (j) { return g.m[j] === MAT.SEED; }); }
function pPalaceAt(g: Game) { var s = g.wDuckPalace ? bSite(g, g.wDuckPalace) : null; if (!s || !s.done) { if (g.wDuckPalace && !s) g.wDuckPalace = 0; return null; } return s; }
/* (ducks.ts dHeading) seed in the trough, for duck d to make for: a long way further than it would look for seed
   anywhere else, and over wheat. none while the ducks are offended */
function pPalaceSeed(g: Game, d: Duck) {
  var s = pPalaceAt(g);
  if (!s || s.boycott > g.tick || Math.abs(d.x - s.cx) > P_DREACH || d.y > s.Y + 30 || d.y < s.Y - 40) return null;
  var T = pTroughSeed(g, s);
  if (!T.length) return null;
  var j = T[d.id % T.length];
  return { x: j % g.gw, y: (j / g.gw) | 0 };
}
/* the ducks on the deck, or beside it (on the water under it, or the bank at its end) */
function pPalaceHome(g: Game, s: Site) { var n = 0; for (var k = 0; k < g.ducks.length; k++) if (pOnDeck(g, s, g.ducks[k])) n++; return n; }
function pOnDeck(g: Game, s: Site, d: Duck) { return !d.dead && !d.baby && d.state !== "fly" && d.state !== "thrown" && d.x >= s.x0 - 2 && d.x <= s.x1 + 3 && d.y >= s.Y - 3 && d.y <= s.Y + 4; }
/* (ducks.ts duckArrivals) a grown duck at home on the deck: the mother, when the duckling roll comes up */
function pPalaceMother(g: Game) {
  var s = pPalaceAt(g);
  if (!s || s.boycott > g.tick) return null;
  for (var k = 0; k < g.ducks.length; k++) if (pOnDeck(g, s, g.ducks[k])) return g.ducks[k];
  return null;
}
/* her ducklings, hatched in a nest on the deck, in a line behind her (under the cap on ducks, as any are) */
function pPalaceHatch(g: Game, mum: Duck, n: number) {
  var s = pPalaceAt(g), prev = mum, kids = 0;
  for (var c = 1; c <= n; c++) {
    var b = duckSpawn(g, pDU(s, 6 + (c % 4)) + 0.5, s.Y - 0.5, mum.kind, true, true);
    if (!b) break;
    b.dir = mum.dir; b.lead = prev; prev = b; kids++;
  }
  if (!kids) return false;
  s.hatched += kids;
  feed(g, "ducklings, hatched at the duck palace. " + kids + " of them", "#ffd94a", "duckarrive");
  achieve(g, "ducklings");
  var q = pOther(g, { x: s.cx, y: s.Y }, 60);
  if (q && q.sayT <= 0) pSay(g, q, "ducklings", true);
  return true;
}
/* somebody with seed in their pocket, and the trough low: off to feed the ducks */
function pPalacePick(g: Game, p: Peasant, hungry) {
  var s = pPalaceAt(g);
  if (!s || hungry || (p.seed || 0) < 1 || s.boycott > g.tick || Math.abs(s.cx - p.x) > 220 || iCrew(g, "feedducks", s.id)) return false;
  if (pTroughSeed(g, s).length > 1) return false;
  p.task = { kind: "feedducks", site: s.id, t: 0, act: 0 };
  return true;
}
/* the feeder: onto the bank end of the deck, by the trough, and the seed scattered in it (real seed, a handful's worth)
   wherever there is room. the ducks come running */
function pTaskFeedDucks(g: Game, p: Peasant, k: Task) {
  var s = bSite(g, k.site);
  if (!s || !s.done || ++k.t > 3000 || (p.seed || 0) < 1) return iDone(p, (k.n || 0) > 0);
  var sx = pDU(s, 5), sy = s.Y - 1;
  /* (stood just past the trough's lip, on the deck: the far side of it from the bank) */
  if (Math.abs(p.x - sx - 0.5) > 2 || Math.abs(Math.floor(p.y) - sy) > 2) {
    if (iWalk(g, p, k, "ducks" + s.id, sx, sy, function (x, y) { return Math.abs(x - sx) <= 2 && Math.abs(y - sy) <= 2; })) pGiveUp(g, p, sx);
    return false;
  }
  if (!k.on) { k.on = true; if (p.sayT <= 0) pSay(g, p, "feedDucks", true); }
  p.dir = -s.d; p.idle = 0; k.act++;
  p.pose = (k.act % 20) < 10 ? "hammerA" : "eatB";
  if (k.act % 20) return true;
  var T = pTrough(g, s), put = 0;
  for (var j = 0; j < T.length && put < P_DFEED; j++) if (g.m[T[j]] === MAT.EMPTY) { sandSet(g, T[j], MAT.SEED); g.aux[T[j]] = 0; heatAccept(g, T[j]); put++; }
  p.seed--; s.fed += put; k.n = (k.n || 0) + 1;
  pChips(g, pDU(s, 2) + 0.5, s.Y - 2, 4, [SAND_PAL[MAT.SEED][0], SAND_PAL[MAT.SEED][120]]);
  /* mobbed */
  var near = 0;
  for (var q = 0; q < g.ducks.length; q++) { var d = g.ducks[q]; if (!d.dead && Math.abs(d.x - p.x) < 8 && Math.abs(d.y - p.y) < 6) { near++; if (Math.random() < 0.2) dSay(g, d, "quack", true); } }
  if (near >= 3 && p.sayT <= 0) pSay(g, p, "mobbed", true);
  if (!put || pTroughSeed(g, s).length >= T.length) { p.bored = 0; return iDone(p, true); }
  return true;
}
/* every tick, while it stands: a duck thrown at it (one in the air, landing on it, or about to) and the ducks are
   offended */
function pPalaceTick(g: Game, s: Site) {
  if (!s.done || s.boycott > g.tick) return;
  for (var k = 0; k < g.ducks.length; k++) {
    var d = g.ducks[k];
    if (d.dead || d.state !== "thrown" || d.flyT < 3 || d.x < s.x0 - 2 || d.x > s.x1 + 2 || d.y < s.Y - 12 || d.y > s.Y + 3) continue;
    s.boycott = g.tick + P_DBOYCOTT;
    feed(g, "somebody threw a duck at the duck palace. the ducks are offended", "#c8d0dc", "boycott" + s.id);
    for (var j = 0; j < g.ducks.length; j++) { var o = g.ducks[j]; if (!o.dead && Math.abs(o.x - s.cx) < 40) { o.seed = null; if (Math.random() < 0.5) dSay(g, o, "quack", true); } }
    var q = pOther(g, { x: s.cx, y: s.Y }, 80);
    if (q && q.sayT <= 0) pSay(g, q, "boycott", true);
    return;
  }
}
/* every W_STRIDE ticks: the books, and the ducks off the deck while they are offended */
function pPalaceStep(g: Game, s: Site) {
  if (!s.done) return;
  g.wDuckPalace = s.id; g.wTick = true;
  if (s.boycott > g.tick) {
    /* (off it, and the other way: they will not be seen on it) */
    for (var k = 0; k < g.ducks.length; k++) { var d = g.ducks[k]; if (pOnDeck(g, s, d) && d.state === "walk") { d.dir = d.x < s.cx ? -1 : 1; d.seed = null; } }
  }
  if ((g.tick % 900) === 0 && s.boycott > 0 && s.boycott <= g.tick && s.boycott > g.tick - 900) feed(g, "the ducks have forgiven the duck palace", "#ffd94a", "boycott" + s.id);
  if ((g.tick % 1200) === 0) { var e = pEldest(g), q = e ? pOther(g, { x: e.x, y: e.y }, 20) : null; if (q && q.sayT <= 0 && Math.random() < 0.3) pSay(g, q, "crown"); }
}
/* the eldest duck: the one that has been in the valley longest */
function pEldest(g: Game) { var e = null; for (var k = 0; k < g.ducks.length; k++) { var d = g.ducks[k]; if (!d.dead && !d.baby && !d.kind.rubber && (!e || d.id < e.id)) e = d; } return e; }
var P_NEST = hex32("#c8a050"), P_NEST_D = hex32("#8a6a30"), P_EGG = hex32("#f4f0e4"), P_DOME = hex32("#5a8ac0");
var P_CROWN = hex32("#ffd94a"), P_CROWN_J = hex32("#e03050");
/* the nests under the pavilion (an egg in one now and then), and the dome painted, if it is not gold */
function pDrawPalace(g: Game, s: Site) {
  if (!s.done) return 0;
  /* (three nests of straw on the deck under the pavilion, and the trough's seed-box at the bank end) */
  [6, 7, 8].forEach(function (u, n) {
    var x = pDU(s, u), y = s.Y - 1;
    wBack(g, x, y, n === 1 ? P_NEST : P_NEST_D);
    if (((s.id + n + ((g.tick / 3000) | 0)) % 3) === 0) wBack(g, x, y - 1, P_EGG);
  });
  for (var k = 0; k < s.plan.length; k++) {
    var e = s.plan[k];
    /* (the dome, painted where it is not gold; the roof edged) */
    if (e.paint && g.m[e.i] === MAT.PLANK) g.px[e.i] = blend32(g.px[e.i], P_DOME, 0.7);
    else if (((e.i / g.gw) | 0) === s.Y - 8 && g.m[e.i] === MAT.PLANK) g.px[e.i] = blend32(g.px[e.i], P_DOME, 0.6);
  }
  /* (and a pennant on top, the way the wind would blow it, if there were any) */
  var fx = pDU(s, 7), fy = s.Y - 11;
  wBack(g, fx, fy, P_CROWN_J); wBack(g, fx + s.d, fy, P_CROWN_J); wBack(g, fx, fy - 1, P_CROWN_J);
  return 0;
}
/* the crown, on the eldest duck's head */
function pDrawCrown(g: Game, s: Site) {
  if (!s.done) return;
  var d = pEldest(g);
  if (!d || d.state === "held") return;
  var rows = d.state === "swim" ? 4 : (d.state === "fly" || d.state === "thrown" ? 3 : 5);
  var hx = Math.floor(d.x) + (d.dir < 0 ? -1 : 1), hy = Math.floor(d.y) - rows;
  wPut(g, hx - 1, hy, P_CROWN); wPut(g, hx, hy, P_CROWN_J); wPut(g, hx + 1, hy, P_CROWN);
  wPut(g, hx - 1, hy - 1, P_CROWN); wPut(g, hx + 1, hy - 1, P_CROWN);
}

/* =====================================================================
   THE ICE PALACE: the snowman was lonely, so they built him a palace.
   there is no weather: this is the player's reward for freezing them.
   with snow lying about the houses and the air under nought, the
   village builds a palace out of it, quick, before the cold lets up:
   packed-snow walls and two crenellated towers, ice windows, an ice
   floor to skate on, and a lantern hanging inside. anybody idle helps,
   whatever else is going up (it is not the great work: it does not
   last). they skate in it, they throw snowballs round it, and they
   stand in it out of the cold. the lantern's warmth is real, and the
   skylight over it drips. when it warms up again it melts, and once
   it is more water than palace it is a ruin, and they are sorry. the
   next freeze, they build it again
   ===================================================================== */
var P_IW = 13;                     /* across: a gatehouse, nine of hall, a tower */
var P_ISNOW = 150;                 /* snow and ice lying about the houses before anybody thinks of it */
var P_INEAR = 60;                  /* and how near the houses */
var P_ISHOVEL = 30;                /* how far from the palace they go for snow */
var P_IHAND = 12;                  /* snow to a shovelful (well: an armful) */
/* (a cell of packed snow, or of ice, is paid for with a cell of snow off the ground: build.ts prices it) */
B_RES[MAT.PACKSNOW] = "snow"; B_AMT[MAT.PACKSNOW] = 1;
B_RES[MAT.ICE] = "snow"; B_AMT[MAT.ICE] = 1;
B_KINDS.push("snow");

P_SAY.idea_icepalace = ["the snowman was lonely. so we built him a palace", "a palace. of snow", "it won't last. that's the point", "towers! made of snow!"];
P_SAY.planIce = ["quick, before it thaws", "everybody grab some snow", "a palace! of snow!", "towers, there and there"];
P_SAY.shovel = ["*scoop*", "an armful", "cold hands", "more snow!", "this'll melt, you know"];
P_SAY.icePalace = ["it's beautiful", "like living in a snowman", "mind the floor", "you can see the lantern through the walls"];
P_SAY.iceGone = ["goodbye, palace", "it was nice while it lasted", "it's just a puddle now", "we'll build it again. when it's cold", "it had towers"];
P_ACHIEVE.iceagain = ["AGAIN", "the ice palace, built a second time. it will melt again. they know"];

wDef({
  id: "icepalace",
  exempt: true,
  again: true,
  idea: { name: "the ice palace", title: "THE ICE PALACE", sub: "the snowman was lonely. so we built him a palace", hint: "a snowman, and skating (a freeze, that is)",
          ready: function (g) { return !!g.got.snowman && !!g.got.skate; } },
  achieve: ["THE ICE PALACE", "packed snow, ice windows, a lantern inside. it will melt. they built it anyway"],
  watch: pIceWatch,
  wait: function (g) { return pAirAtHouses(g) >= 0 || pSnowAbout(g) < P_ISNOW; },   /* (no freeze, no palace: that is not for want of room) */
  plan: pPlanIce,
  pick: pIcePick,
  task: function (g, p, k) { return k.kind === "shovel" ? pTaskShovel(g, p, k) : undefined; },
  step: pIcePalaceStep,
  draw: pDrawIce,
  finish: function (g, s, p) {
    s.built = (g.wDone && g.wDone.icepalace) ? 2 : 1;
    feed(g, (s.built > 1 ? "the ice palace is built again" : "the ice palace is built") + ". it will last as long as the cold does", "#cfeaff", "plan" + s.id);
    g.wIceN = (g.wIceN || 0) + 1;
    if (g.wIceN >= 2) achieve(g, "iceagain");
  },
  label: function () { return "the ice palace"; },
  readout: function (g, s) {
    var n = pIceLeft(g, s), all = s.cells || 1;
    if (!s.done) return pAirAtHouses(g) > 0 ? "the thaw is coming. hurry" : "";
    return Math.round(100 * n / all) + "% of it still frozen" + (pAirAtHouses(g) > 0 ? ". it is melting" : "");
  },
  mood: function (g, p, k) {
    if (k.kind === "shovel") return (p.snow || 0) >= 1 ? "is carrying snow to the ice palace" : "is scooping up snow for the ice palace";
    if (k.kind === "skate" && k.palace) return "is skating in the ice palace";
    return "";
  }
});
/* whoever built the snowman (the one still standing, if any is) has the palace put into their head */
function pIceWatch(g: Game) {
  if (!g.got.snowman || !g.got.skate) return;
  for (var k = g.lsnowmen.length - 1; k >= 0; k--) {
    var m = g.lsnowmen[k];
    if (!m.up) continue;
    for (var j = 0; j < g.peasants.length; j++) if (g.peasants[j].id === m.by) { wSpark(g, g.peasants[j], "icepalace"); return; }
  }
}
/* the air at the houses: how cold it is where they live, a little over the ground */
function pAirAtHouses(g: Game) {
  var x = Math.round(wMiddle(g)), t = 0, n = 0;
  /* (the air: over the ground, and under any roof, a few columns either side of the middle of the village) */
  for (var dx = -12; dx <= 12; dx += 3) {
    var gy = mGround(g, x + dx);
    for (var y = gy - 8; gy > 10 && y < gy; y++) { var j = y * g.gw + x + dx; if (AIRY[g.m[j]]) { t += g.T[j]; n++; } }
  }
  return n ? t / n : AMBIENT;
}
/* snow and ice lying about, within P_INEAR of the houses (the top few rows of the ground, column by column) */
function pSnowAbout(g: Game) {
  var mid = Math.round(wMiddle(g)), n = 0;
  for (var x = Math.max(1, mid - P_INEAR); x < Math.min(g.gw - 1, mid + P_INEAR); x++) {
    var y = mSurface(g, x, false, 0);
    for (var d = 0; d < 6 && y >= 0 && y + d < g.gh; d++) { var c = g.m[(y + d) * g.gw + x]; if (c === MAT.SNOW || c === MAT.ICE || c === MAT.PACKSNOW) n++; else if (!AIRY[c] && d > 1) break; }
  }
  return n;
}
function pPlanIce(g: Game, p: Peasant) {
  if (pAirAtHouses(g) >= 0 || pSnowAbout(g) < P_ISNOW) return false;
  var r = wPlot(g, { w: P_IW, sky: 18, rough: 2, pad: 2, near: wMiddle(g), fit: pIceFit });
  if (!r) return false;
  var G = r.r.G, x0 = r.x0;
  var s = bNew(g, "icepalace", p, wCleared(g, r, r.r.plan), [x0, G - 17, x0 + P_IW - 1, G - 1],
               { wonder: true, melts: true, G: G, cells: r.r.plan.filter(function (e) { return e.v !== MAT.EMPTY && e.v !== MAT.LAMP; }).length });
  feed(g, p.name + " is building an ice palace. everybody: snow", "#cfeaff", "plan" + s.id);
  pSay(g, p, "planIce", true);
  return true;
}
/* the palace at x0, on ground G (the lowest of gy: snow over it dug out, or built on): an ice floor; at the left a
   gatehouse over the way in, at the right a tower, both crenellated, both with ice windows; between them a vault of
   packed snow with a skylight of ice in the middle, and a lantern hanging under it */
function pIceFit(g: Game, x0: number, gy: number, hi, lo) {
  /* (on top of the snow, not dug into it: that is what it is built of. the floor bridges a dip or two) */
  var G = hi, plan = [], u, y;
  function put(u, y: number, v: number, ph: number) { plan.push(bE(g, x0 + u, y, v, ph)); }
  for (u = 0; u < P_IW; u++) put(u, G - 1, MAT.ICE, 1 + (u === 0 || u === P_IW - 1 ? 0 : 1));   /* (the floor) */
  /* (no higher than a hammer reaches from the floor: nobody can get up on it to build it higher) */
  for (y = G - 2; y >= G - 13; y--) for (u = 11; u <= 12; u++) put(u, y, (y === G - 5 || y === G - 9) ? MAT.ICE : MAT.PACKSNOW, 2 + G - 2 - y);
  for (y = G - 12; y >= G - 13; y--) for (u = 0; u <= 1; u++) put(u, y, y === G - 12 && u === 1 ? MAT.ICE : MAT.PACKSNOW, 2 + G - 2 - y);
  for (u = 2; u <= 10; u++) put(u, G - 12, u === 6 ? MAT.ICE : MAT.PACKSNOW, 12);
  for (u = 2; u <= 10; u += 2) put(u, G - 13, MAT.PACKSNOW, 13);
  put(0, G - 14, MAT.PACKSNOW, 14); put(12, G - 14, MAT.PACKSNOW, 14); put(1, G - 14, MAT.EMPTY, 0); put(11, G - 14, MAT.EMPTY, 0);

  return { plan: plan, G: G, score: 10 - (G - hi) };
}
/* how much of it is still snow and ice */
function pIceLeft(g: Game, s: Site) { var n = 0; for (var k = 0; k < s.plan.length; k++) { var c = g.m[s.plan[k].i]; if ((s.plan[k].v === MAT.PACKSNOW || s.plan[k].v === MAT.ICE) && (c === MAT.PACKSNOW || c === MAT.ICE)) n++; } return n; }
/* snow wanted for the palace, over what is on its pile and in pockets */
function pIceShort(g: Game, s: Site) {
  /* (what is in the pockets of whoever is at it: an armful wandered off with is no use to anybody) */
  var n = bNeed(g, s, "snow");
  for (var k = 0; k < g.peasants.length; k++) { var q = g.peasants[k], t = q.task; if (!q.dead && t && t.site === s.id && (t.kind === "shovel" || t.kind === "build")) n -= q.snow || 0; }
  return n;
}
/* anybody idle, the palace going up and short of snow: an armful of it, from near the palace */
function pIcePick(g: Game, p: Peasant, hungry) {
  var s = mSites(g, "icepalace")[0];
  if (!s || hungry) return false;
  if (s.done) {
    /* (in it: a skate on the floor, now and then, for the bored) */
    if (p.bored > 300 && !wNoGo(g, p, s.id) && Math.random() < 0.1 && Math.abs(s.cx - p.x) < 120 && pCell(g, s.x0 + 6, s.G - 1) === MAT.ICE) {
      p.task = { kind: "skate", a: s.x0 + 2, b: s.x0 + 10, y: s.G - 2, t: 0, act: 0, on: 0, laps: 0, palace: s.id };
      return true;
    }
    return false;
  }
  if (Math.abs(s.cx - p.x) > 200 || wNoGo(g, p, s.id)) return false;
  if ((p.snow || 0) >= 1 || (bUseful(g, p, s) && !(p.failSite === s.id && p.failT > g.tick))) { bJoin(g, p, s); return true; }
  if (pIceShort(g, s) <= 0) return false;
  p.task = { kind: "shovel", site: s.id, t: 0, act: 0 };
  return true;
}
/* (ideas.ts iPick, before snowmen and snowball fights: the palace going up comes first. anybody free) */
function pIceFirst(g: Game, p: Peasant) {
  var s = mSites(g, "icepalace")[0];
  if (!s || s.done || p.cold > 80) return false;
  return pIcePick(g, p, false);
}
function pTaskShovel(g: Game, p: Peasant, k: Task) {
  var s = bSite(g, k.site);
  if (!s || s.done || ++k.t > 2000) return iDone(p, (p.snow || 0) > 0);
  if ((p.snow || 0) >= P_IHAND || ((p.snow || 0) >= 1 && pIceShort(g, s) <= 0)) { bJoin(g, p, s); return true; }
  function ok(g2, x: number, y: number) { return Math.abs(x - s.cx) <= P_ISHOVEL && !(x >= s.x0 && x <= s.x1 && y >= s.y0 && y <= s.G) && lSnowy(g2, x, y); }
  if (!k.sx || !ok(g, k.sx, k.sy)) {
    var t = Math.abs(p.x - s.cx) < P_ISHOVEL + 30 ? pFind(g, p, P_SNOW, 40, ok, 10) : null;
    if (!t && Math.abs(p.x - s.cx) > 12) {
      /* (a long way off: over to the palace first, and look about there) */
      var fx = Math.round(s.cx), fy = s.G - 1;
      if (lGo(g, p, k, "toice" + s.id, fx, fy, 10, 12, 12) < 0) return iDone(p, false);
      return false;
    }
    if (!t) { if ((p.snow || 0) >= 1) { bJoin(g, p, s); return true; } if (p.sayT <= 0) pSay(g, p, "nosnow"); return iDone(p, false); }
    k.sx = t.x; k.sy = t.y;
  }
  var go = lGo(g, p, k, "shovel" + k.sx + "," + k.sy, k.sx, k.sy, 2, 10, 2);
  if (go <= 0) return false;
  p.dir = k.sx + 0.5 < p.x ? -1 : 1; k.act++;
  p.pose = (k.act % 10) < 5 ? "chopA" : "chopB";
  if (k.act % 10 !== 5) return true;
  /* (an armful, the cold and all: the hole it leaves is no colder than the snow was, and no warmer) */
  heatVanish(g, k.sy * g.gw + k.sx); p.snow = (p.snow || 0) + 1;
  for (var n = 0; n < 2; n++) {
    var j2 = sandHas(g, k.sx, k.sy + 1, MAT.SNOW);
    if (j2 < 0 || bMarked(g, j2 % g.gw, (j2 / g.gw) | 0) || !ok(g, j2 % g.gw, ((j2 / g.gw) | 0) + 0) && !AIRY[g.m[j2 - g.gw]]) break;
    heatVanish(g, j2); p.snow++;
  }
  k.sx = 0;
  if (p.sayT <= 0 && Math.random() < 0.06) pSay(g, p, "shovel");
  return true;
}
/* every W_STRIDE ticks: what has gone in packed hard and cold; the thaw coming before it was finished; the lantern's
   little warmth; the cosy in it; and melting, and the mourning */
function pIcePalaceStep(g: Game, s: Site) {
  var k, e, warm = pAirAtHouses(g);
  for (k = 0; k < s.plan.length; k++) {
    e = s.plan[k];
    if (e.packed || (e.v !== MAT.PACKSNOW && e.v !== MAT.ICE) || g.m[e.i] !== e.v) continue;
    /* (packed hard and cold as the snow it was packed from: snowman-cold. leftovers.ts does the same) */
    e.packed = true; g.T[e.i] = Math.min(g.T[e.i], -8); g.lat[e.i] = 0; heatAccept(g, e.i);
  }
  if (!s.done) {
    /* (all hands: anybody about with nothing that matters to do is called over, before the thaw) */
    if (warm < 0) for (k = 0; k < g.peasants.length; k++) {
      var h = g.peasants[k];
      if (!wIdle(g, h, s) || h.hunger > P_HUNGRY || h.cold > 80 || Math.abs(h.x - s.cx) > 160 || (h.task && h.task.kind === "skate")) continue;
      if (pIcePick(g, h, false) && h.sayT <= 0 && Math.random() < 0.1) pSay(g, h, "planIce");
    }
    if (warm > 2 && g.tick - s.t0 > 3000 && pIceLeft(g, s) < (s.cells >> 2)) {
      feed(g, "the thaw came before the ice palace was finished. what there is of it will melt", "#c8d0dc", "plan" + s.id);
      pIceGone(g, s, false);
    }
    return;
  }
  /* the lantern, hung from the skylight: a little real warmth, from the oil burning in it, into the ice it hangs from.
     (the skylight drips, in the end) */
  var lj = (s.G - 12) * g.gw + s.x0 + 6;
  if (g.m[lj] === MAT.ICE) heatAdd(g, lj, 1);
  /* in it: out of the cold, lantern-lit */
  for (k = 0; k < g.peasants.length; k++) {
    var q = g.peasants[k];
    if (q.dead || q.x < s.x0 + 2 || q.x > s.x0 + 11 || Math.abs(q.y - (s.G - 2)) > 1) continue;
    q.cosyT = g.tick + 40; q.cold = Math.max(0, (q.cold || 0) - 4);
    if (q.sayT <= 0 && Math.random() < 0.01) pSay(g, q, "icePalace");
  }
  if (pIceLeft(g, s) * 2 < s.cells) {
    feed(g, "the ice palace has melted. it is a ruin now. it was a palace for " + Math.round((g.tick - s.last) / 3600) + " minutes", "#c8d0dc", "plan" + s.id);
    pIceGone(g, s, true);
  }
}
/* gone: the site let go (what is left of it melts in its own time), and the village is sorry */
function pIceGone(g: Game, s: Site, mourn: boolean) {
  var idx = g.sites.indexOf(s);
  if (idx >= 0) bRemove(g, idx);
  if (!mourn) return;
  var n = 0;
  for (var k = 0; k < g.peasants.length && n < 3; k++) {
    var q = g.peasants[k];
    if (q.dead || q.sleep || Math.abs(q.x - s.cx) > 80) continue;
    pSay(g, q, "iceGone", true); n++;
  }
  wTale(g, "ice", null, "", s.cx, s.G);
}
var P_IGLOW = hex32("#9ad0ff"), P_ILAMP = hex32("#ffe0a0"), P_ICORD = hex32("#5a4a3a");
/* the walls glow blue with the lantern behind them, and the lantern itself */
function pDrawIce(g: Game, s: Site) {
  if (!s.done) return 0;
  var k, e, lx = s.x0 + 6, ly = s.G - 10;
  /* (the lantern: the light in it, on a cord from the skylight) */
  wBack(g, lx, ly, P_ILAMP); wBack(g, lx, ly - 1, P_ICORD);
  if (g.m[ly * g.gw + lx] === MAT.EMPTY) g.gpx[ly * g.gw + lx] = P_ILAMP;
  for (k = 0; k < s.plan.length; k++) {
    e = s.plan[k];
    var c = g.m[e.i];
    if (c !== MAT.ICE && c !== MAT.PACKSNOW) continue;
    var dx = (e.i % g.gw) - lx, dy = ((e.i / g.gw) | 0) - ly, r = Math.sqrt(dx * dx + dy * dy);
    g.px[e.i] = blend32(g.px[e.i], P_IGLOW, clamp(0.5 - r * 0.03, 0.1, 0.45) * (c === MAT.ICE ? 1.4 : 1));
    if (c === MAT.ICE) g.gpx[e.i] = blend32(g.px[e.i], P_IGLOW, 0.3);
  }
  mGlow(g, lx, ly, 6, 0.3);
  return 1;
}
