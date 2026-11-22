/* =====================================================================
   PLEASAND  --  monuments.js

   the great works in stone (wonders.js has what they share):
     THE THEATRE   a plank stage with a backdrop and two lanterns, and
                   three tiers of stone seats, stepped into a slope (or
                   built up where there is none). every so often, a
                   play: the boredest picks the best tale nobody has
                   staged yet, two of them (three, in a big village)
                   act it out, and the idle sit on the tiers and watch,
                   and clap. the one it happened to plays themselves,
                   if they are about, or heckles from the seats
     THE PYRAMID   for a king who died: twenty-three wide, twelve
                   courses, stepped (so its sides are stairs), with a
                   chamber in it for the king's name and crown, and a
                   capstone, gold if there is any. the bored climb it
                   to look out, and the king climbs it to say something
                   about the last one. open the tomb, and the first in
                   is cursed
     THE CATHEDRAL for the bell, and for the dead: a stone nave with a
                   door at either end, pews, three candles, a rose
                   window of coloured glass in the gable that glows
                   while the candles burn, a belfry (the bell is taken
                   down from wherever it hung and rehung there), a
                   spire with a lightning rod on it, and under it all a
                   crypt, with a niche and a candle for every name the
                   village remembers, the ones whose crosses weathered
                   away too. the bored go down to visit; a flood is
                   bailed out of it up the ladder. every so often the
                   bell rings for a service, the idle sit in the pews,
                   and the eldest names the dead, and how. far from
                   home when things go bang, it is where they hide
   ===================================================================== */
"use strict";

/* -------------------------------------------------------------------
   THE THEATRE
   ------------------------------------------------------------------- */
var M_PLAY_GAP = 7000;      /* ticks between plays, at the least */
var M_PLAY_CALL = 900;      /* and how long they wait for the cast and the house before starting anyway */
var M_BEAT = 90;            /* ticks to a beat of a play */
var M_APPLAUD = 120;        /* a fire on the stage is part of it for this long */

P_SAY.idea_theatre = ["what if we did the fire again. but on purpose. with chairs", "a show, but with talking", "we should act it out",
  "the fireworks, but with us in them"];
P_SAY.planTheatre = ["a stage, right here", "seats, in rows. going up", "the slope is perfect for it", "a theatre!"];
P_SAY.director = ["places, everyone", "from the top", "and... action", "remember your lines"];
P_SAY.notHow = ["that's not how it happened", "i was there. it wasn't like that", "i did NOT say that", "my hair was never that bad"];
P_SAY.dead = ["i am {d}. i am dead now", "woe. i am {d}", "this is me. being {d}"];
P_SAY.partOfIt = ["IS THIS PART OF IT?", "very realistic", "the effects!", "ooh, fire", "they've really gone all out"];
P_SAY.notPartOfIt = ["it's not part of it", "FIRE! REAL FIRE!", "the stage is on fire!"];
P_ACHIEVE.play = ["OPENING NIGHT", "the first play. everybody clapped, even the ones who were in it"];
var M_REACT = {
  death: ["*gasp*", "too soon", "poor thing", "*sniff*", "i remember that"],
  space: ["hahaha", "WHEEE", "he went so high", "classic", "*snort*"],
  fire: ["hahaha", "SPLASH", "*gasp*", "the bucket!", "too soon"],
  any: ["hahaha", "*gasp*", "oh no", "boo!", "*giggle*", "i saw that coming", "who wrote this"]
};
/* the scripts: a beat at a time, {r (which actor), pose, line, leap (a real one), dx (steps across the stage)} */
var M_SCRIPTS = {
  space: [{ r: 0, pose: "sit", line: "i am {s}. it is a nice day" }, { r: 1, pose: "fling", line: "hup!" },
          { r: 0, leap: 1.4, line: "WHEEEE" }, { r: 0, pose: "stand", line: "i went to space. it was very big" }],
  fire: [{ r: 0, pose: "stand", line: "it's warm in here" }, { r: 0, pose: "panicA", line: "it's VERY warm in here" },
         { r: 1, dx: 4, pose: "walkA", line: "*runs across, with a bucket*" }, { r: 1, pose: "hammerB", line: "SPLASH" }],
  death: [{ r: 0, pose: "stand", line: "{line}" }, { r: 0, fall: 1, line: "oh" }, { r: 1, pose: "eatB", line: "we'll remember you, {s}" }],
  ice: [{ r: 0, pose: "walkA", dx: 3, line: "la la la" }, { r: 0, fall: 1, line: "WHOA" }, { r: 1, pose: "eatB", line: "salt. we need salt" }],
  zap: [{ r: 0, pose: "stand", line: "what a lovely sky" }, { r: 1, pose: "fling", line: "*CRACK*" }, { r: 0, fall: 1, line: "ow" }],
  any: [{ r: 0, pose: "stand", line: "this is the time {t}" }, { r: 1, pose: "eatB", line: "no!" }, { r: 0, pose: "hammerA", line: "yes!" },
        { r: 1, pose: "stand", line: "well i never" }]
};
/* how good a tale is for the stage */
var M_RANK = { space: 9, stagefire: 8, pack: 8, zap: 7, house: 7, nuke: 7, ice: 6, wonder: 4, idea: 2 };
/* a tale, as a title: "the time gary went to space" */
function mTitle(t) { return "the time " + wTold(t).replace(/^we /, "they "); }

wDef({
  id: "theatre",
  idea: { name: "the theatre", title: "THE THEATRE", sub: "what if we did the fire again. but on purpose. with chairs", hint: "fireworks, a few tales to tell, and a crowd",
          ready: function (g) { return !!g.know.festival && !!g.know.masonry && bAlive(g) >= 6 && (g.tales || []).length >= 3; } },
  achieve: ["THE THEATRE", "a stage, a backdrop, three tiers of stone seats. tonight: whatever happened last week"],
  plan: mPlanTheatre,
  pick: function (g, p) { return false; },
  task: function (g, p, k) { return k.kind === "act" ? mTaskAct(g, p, k) : undefined; },
  step: mTheatreStep,
  partOfIt: mOnStage,
  draw: mDrawTheatre,
  drawOver: mDrawCast,
  finish: function (g, s, p) { feed(g, "the theatre is finished. " + (p ? p.name : "the village") + " is already rehearsing", "#ffd94a", "plan" + s.id); s.playT = g.tick + 1200; },
  label: function () { return "the theatre"; },
  readout: function (g, s) {
    if (!s.done) return "";
    if (s.play) return "tonight: " + s.play.title + (s.play.on ? "" : " (waiting for the house)");
    var n = (g.tales || []).filter(function (t) { return !t.staged; }).length;
    return n ? n + " tale" + (n > 1 ? "s" : "") + " nobody has staged yet" : "nothing much has happened lately";
  },
  mood: function (g, p, k) { return k.kind === "act" ? (k.on ? "is on the stage, in a play" : "is off to the theatre, to be in a play") : (k.kind === "audience" && k.of === "play" ? (k.sit ? "is in the audience, sitting down" : "is at the theatre, watching") : ""); }
});
/* the plot cleared first (wCleared), but not where something of the plan goes in anyway: a bush where the stone goes
   is built over, and a hole cleared there on a slope only fills up again with whatever runs down into it. and leaves
   in the air over it are let be (peasants walk through leaves; and the top of a tree beside it is out of reach) */
function mCleared(g, r, plan) {
  var at = {}, k;
  for (k = 0; k < plan.length; k++) if (plan[k].v !== MAT.EMPTY) at[plan[k].i] = 1;
  return wCleared(g, r, plan).filter(function (e, k2) {
    if (k2 >= r.clear.length) return true;
    if (P_LEAF[g.m[e.i]]) e.once = true;
    return !at[e.i];
  });
}
/* wPlot, on the ground under open sky, and on every other floor of the valley too (under a shelf of rock, on a ledge):
   whichever is best. a crowded valley has room on some floor more often than on the top one */
function mPlotAny(g, o) {
  var best = wPlot(g, o), rows = {}, x, k, L, F;
  for (x = rLo(g, 8); x < rHi(g, 8); x += 6) { L = mFloors(g, x, true); for (k = 0; k < L.length; k++) rows[(L[k] >> 2) << 2] = 1; }
  for (F in rows) {
    o.floor = +F;
    var r = wPlot(g, o);
    if (r && (!best || r.score > best.score)) best = r;
  }
  o.floor = null;
  return best;
}
/* the theatre's columns, stage end first: u (0 .. M_TW - 1) to x */
var M_TW = 17;   /* the theatre, across: the stage (seven), the pit (one), three tiers of three */
function mU(s, u) { return s.d > 0 ? s.x0 + u : s.x0 + (s.tw || M_TW) - 1 - u; }   /* (s.tw: its own width, kept on it when planned) */
function mPlanTheatre(g, p) {
  var best = null;
  for (var d = -1; d <= 1; d += 2) {
    var r = mPlotAny(g, { w: M_TW, sky: 14, rough: 14, near: wMiddle(g), fit: function (g, x0, gy) { return mTheatreFit(g, x0, gy, d); } });
    if (r && (!best || r.score > best.score)) { best = r; best.d = d; }
  }
  if (!best) return false;
  var f = best.r, plan = mCleared(g, best, f.plan), G = f.G, x0 = best.x0, d = best.d;
  var s = bNew(g, "theatre", p, plan, [x0, G - 14, x0 + M_TW - 1, f.lo], { wonder: true, d: d, G: G, seats: f.seats, playT: 0, tw: M_TW });
  feed(g, p.name + " is building a theatre", "#ffd94a", "plan" + s.id);
  pSay(g, p, "planTheatre", true);
  if (bCarries(p)) bJoin(g, p, s);
  return true;
}
/* the plan for a theatre at x0 (stage at the d < 0 end, or the d > 0), on ground gy: {plan, G (the stage's ground),
   seats, lo, score} or null. u runs from the back of the stage (0) to the back of the top tier (16):
     u 0       the backdrop: a plank wall ten high, and a beam out over the stage off the top of it
     u 0..6    the stage: a stone plinth, a plank deck on that (two up off the ground), a lantern at either end of the beam
     u 7       the pit, on the ground, where the late stand
     u 8..16   three tiers, three columns each, two up each, stone, with a seat at either end of each
   the stage wants level ground (made up, or dug down, a row or two). the tiers like it rising away from the stage (they
   are cut into it), and do with it flat (built up) */
function mTheatreFit(g, x0, gy, d) {
  function X(u) { return d > 0 ? x0 + u : x0 + M_TW - 1 - u; }
  function Gy(u) { return gy[X(u) - x0]; }
  var G = Gy(3), u, y, k, plan = [], seats = [], work = 0, lo = -1, c, e;
  function dig(x, y) { c = pCell(g, x, y); if (!B_DIG[c] && !AIRY[c] && !mFellable(g, x, y, c)) return false; plan.push(bE(g, x, y, MAT.EMPTY, 0)); work += 0.3; return true; }
  for (u = 0; u <= 7; u++) if (Math.abs(Gy(u) - G) > 4) return null;
  /* the stage and the pit: the ground under them made level (dug down where it is high, made up in stone where low) */
  for (u = 0; u <= 7; u++) {
    var x = X(u), gu = Gy(u);
    for (y = gu; y < G; y++) if (!dig(x, y)) return null;
    for (y = G; y < gu; y++) { plan.push(bE(g, x, y, MAT.BRICK, 1)); work++; }
    if (u <= 6) { plan.push(bE(g, x, G - 1, MAT.BRICK, 2), bE(g, x, G - 2, MAT.PLANK, 3)); work++; }
    lo = Math.max(lo, gu);
  }
  for (y = G - 3; y >= G - 12; y--) plan.push(bE(g, X(0), y, MAT.PLANK, 4 + G - 3 - y));
  for (u = 1; u <= 6; u++) plan.push(bE(g, X(u), G - 12, MAT.PLANK, 13 + u));
  plan.push(bE(g, X(1), G - 11, MAT.LAMP, 20), bE(g, X(6), G - 11, MAT.LAMP, 20));
  /* the tiers: stone, built up from the stage's ground where it is low. where the bank is there already, it is faced
     where it lies, two deep under it (as far down as a builder standing on it reaches): the seats and the risers
     between them are stone, and the slope is the rest of the shape */
  for (k = 1; k <= 3; k++) for (u = 5 + 3 * k; u <= 7 + 3 * k; u++) {
    var xx = X(u), gk = Gy(u), top = G - 2 * k, bot = gk >= G ? gk : Math.min(G, Math.max(gk, top) + 2);
    lo = Math.max(lo, gk);
    if (gk < top - 8) return null;   /* (a bank too steep to dig the seats into) */
    for (y = gk; y < top; y++) if (!dig(xx, y)) return null;
    for (y = top; y < bot; y++) { e = bE(g, xx, y, MAT.BRICK, 2 + bot - y); e.drive = true; plan.push(e); work += y >= gk ? 0.6 : 1; }
    if (u === 5 + 3 * k || u === 7 + 3 * k) seats.push({ x: xx, y: top - 1 });
  }
  /* (but not on into a bank higher than the top tier: it would only run down onto the seats, for ever) */
  for (u = M_TW; u <= M_TW + 1; u++) { y = mGroundNear(g, X(u), true, G - 1); if (y >= 0 && y < G - 7) return null; }
  /* a slope rising away from the stage is what it is for */
  var rise = G - Gy(M_TW - 1);
  return { plan: plan, G: G, seats: seats, lo: lo, score: 30 - work + Math.min(rise, 4) * 3 };
}
/* the stage: where the actors stand (u 2, 5 and 4), feet on the planks */
function mMark(s, r) { return { x: mU(s, [2, 5, 4][r] || 3), y: s.G - 3 }; }
/* the goings on, every W_STRIDE ticks: a play now and then, and the beats of it */
function mTheatreStep(g, s) {
  if (!s.done || s.repair) { if (s.play) mEndPlay(g, s, false); return; }
  var P = s.play;
  if (!P) {
    if (g.tick < (s.playT || 0) || g.blaze.length) return;
    mStartPlay(g, s);
    return;
  }
  P.t += W_STRIDE;
  var cast = P.cast.map(function (id) { return lAlive(g, id); });
  if (cast.some(function (q) { return !q || !q.task || q.task.kind !== "act" || q.task.site !== s.id; })) { mEndPlay(g, s, false); return; }
  if (!P.on) {
    /* waiting for the cast to get on the stage, and the house to fill (or the curtain goes up anyway) */
    var ready = cast.every(function (q) { return q.task.on; });
    if (!ready && P.t < M_PLAY_CALL) return;
    if (!ready) { mEndPlay(g, s, false); return; }
    P.on = true; P.beat = 0; P.bt = 0;
    pSay(g, cast[0], "director", true);
    return;
  }
  if (P.fireT) return;
  if ((P.bt += W_STRIDE) < M_BEAT) return;
  P.bt = 0;
  var S = M_SCRIPTS[P.kind] || M_SCRIPTS.any;
  if (P.beat >= S.length) {
    if (P.beat === S.length) {
      /* the bow, and the applause */
      cast.forEach(function (q) { q.task.pose = "eatB"; });
      mHouse(g, s).forEach(function (q) { if (Math.random() < 0.6) pSay(g, q, "clap", true); q.bored = 0; });
      g.fx.clap++;
      P.beat++;
      return;
    }
    mEndPlay(g, s, true);
    return;
  }
  var b = S[P.beat++], a = cast[Math.min(b.r, cast.length - 1)], k = a.task;
  k.pose = b.pose || "stand";
  if (b.dx) k.dx = b.dx;
  if (b.leap && !a.jumping) pLeap(a, b.leap, 0);
  if (b.fall) { a.stun = 60; k.pose = null; }
  var line = b.line.replace("{s}", pTitle(P.who || a.short)).replace("{t}", wTold(P.tale)).replace("{line}", wTold(P.tale));
  pSay(g, a, line, true);
  /* and the house reacts. the one it happened to, if they are sitting in it, has something to say about it */
  var H = mHouse(g, s), subj = H.filter(function (q) { return q.short === P.who; })[0];
  if (subj && !P.heckled && P.beat >= 2) { P.heckled = true; pSay(g, subj, "notHow", true); }
  else if (H.length) { var q = H[irnd(H.length)]; pSay(g, q, pick(M_REACT[P.kind] || M_REACT.any), true); }
}
/* the audience: everybody in the seats (or standing at the back) for this play */
function mHouse(g, s) { return g.peasants.filter(function (q) { return !q.dead && q.task && q.task.kind === "audience" && q.task.site === s.id; }); }
function mStartPlay(g, s) {
  var T = (g.tales || []).filter(function (t) { return !t.staged; });
  if (!T.length) { s.playT = g.tick + 2000; return; }
  /* the director: the boredest of the idle. the best tale nobody has staged: not a death, three times in four */
  var idle = g.peasants.filter(function (q) { return wIdle(g, q, s) && Math.abs(q.x - s.cx) < 220; });
  if (idle.length < 2) { s.playT = g.tick + 600; return; }
  idle.sort(function (a, b) { return (b.bored || 0) - (a.bored || 0); });
  /* (a trip to space, a fire, a bolt from the blue: those are the good ones. a new idea makes a dull play) */
  var alive = T.filter(function (t) { return !t.dead; }), dead = T.filter(function (t) { return t.dead; });
  alive.sort(function (a, b) { return (M_RANK[a.kind] || 0) - (M_RANK[b.kind] || 0) || a.tick - b.tick; });
  var tale = (alive.length && (!dead.length || Math.random() < 0.75)) ? alive[alive.length - 1] : dead[dead.length - 1];
  /* the cast: the one it happened to plays themselves, if they are about and free; then the director, then whoever */
  var n = bAlive(g) >= 9 ? 3 : 2, cast = [], subj = tale.who ? idle.filter(function (q) { return q.short === tale.who; })[0] : null;
  if (subj) cast.push(subj);
  for (var k = 0; k < idle.length && cast.length < n; k++) if (cast.indexOf(idle[k]) < 0) cast.push(idle[k]);
  var kind = tale.kind === "death" ? (tale.also === "fire" ? "fire" : "death") : (tale.kind === "stagefire" || tale.kind === "house" ? "fire" : tale.kind);
  s.play = { tale: tale, who: tale.who, title: mTitle(tale), kind: kind, cast: cast.map(function (q) { return q.id; }), t: 0, on: false, beat: 0, bt: 0,
             hat: !subj && tale.dead };
  cast.forEach(function (q, r) { q.task = { kind: "act", site: s.id, r: r, t: 0, on: false }; q.idle = 0; });
  feed(g, "TONIGHT AT THE THEATRE: " + s.play.title.toUpperCase(), "#ffd94a", "play" + s.id);
  if (typeof pOrganPlay === "function") pOrganPlay(g, "play");   /* (the organ fires up for the interval, if there is one: pleasures.js) */
  var but = {}; cast.forEach(function (q) { but[q.id] = 1; });
  var front = mU(s, 7);
  wGather(g, s, { seats: s.seats, cap: 99, x: front + s.d, y: s.G - 1, until: g.tick + 3200, kind: "play", face: -s.d, but: but, R: 220 });
}
function mEndPlay(g, s, ok) {
  var P = s.play;
  s.play = null;
  if (P && P.fireT) wTale(g, "stagefire", null, "", s.cx, s.G);   /* (the night the stage caught fire: the next play is about it) */
  s.playT = g.tick + M_PLAY_GAP + (ok ? irnd(2000) : 1200);
  g.peasants.forEach(function (q) {
    var k = q.task;
    if (q.dead || !k || k.site !== s.id || (k.kind !== "act" && k.kind !== "audience")) return;
    if (ok) q.bored = 0;
    q.task = null; q.taskDone = true;
  });
  if (!ok || !P) return;
  P.tale.staged = g.tick;
  if (!g.got.play) { achieve(g, "play"); feed(g, "the first play at the theatre: " + P.title + ". everybody clapped", "#ffd94a", "play" + s.id); }
}
/* an actor: onto the mark, facing the house, and doing what the beat says */
function mTaskAct(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || !s.play || ++k.t > 6000) return iDone(p, false);
  var m = mMark(s, k.r), gx = m.x + (k.dx ? -s.d * k.dx : 0);
  if (Math.abs(p.x - gx - 0.5) > 0.8 || Math.abs(Math.floor(p.y) - m.y) > 1) {
    if (p.jumping || p.stun > 0) return true;
    if (iWalk(g, p, k, "stage" + s.id + ":" + gx, gx, m.y, function (x, y) { return x === gx && Math.abs(y - m.y) <= 1; })) return iDone(p, false);
    return false;
  }
  k.on = true; k.dx = 0;
  p.dir = s.d; p.idle = 0; p.cosyT = g.tick + 30;
  if (k.pose) p.pose = k.pose;
  return true;
}
/* a fire on the stage in the middle of a play: applauded, for a little while. then somebody notices. and that is a
   tale too */
function mOnStage(g, s, f) {
  var P = s.play;
  if (!P || !P.on) return false;
  if (!P.fireT) {
    P.fireT = g.tick;
    mHouse(g, s).forEach(function (q) { if (Math.random() < 0.5) pSay(g, q, "partOfIt", true); });
    g.fx.clap++;
  }
  if (g.tick - P.fireT < M_APPLAUD) { if ((g.tick & 63) === 0) g.fx.clap++; return true; }
  var H = mHouse(g, s);
  if (H.length) pSay(g, H[0], "notPartOfIt", true);
  mEndPlay(g, s, false);
  return false;
}
var M_CURTAIN = hex32("#8a2028"), M_CURTAIN_D = hex32("#5a141a"), M_CURTAIN_L = hex32("#b0343a"), M_TIE = hex32("#e0b848");
var M_CLOTH_SKY = hex32("#26304e"), M_CLOTH_HILL = hex32("#3a5a34"), M_CLOTH_MOON = hex32("#f0e8c0"), M_POST = hex32("#7a5432");
var M_HAT = hex32("#1a1a1a"), M_HAT_BAND = hex32("#a8322a");
/* the proscenium: a post at the front of the stage, up to the beam. the curtains: one hung full at the back, one tied
   back at the front, and a pelmet along the beam. between them, a painted cloth (a hill, a night, a moon). and the
   lanterns' light. all drawn behind, over thin air: nobody bumps into a curtain */
function mDrawTheatre(g, s) {
  if (!s.done) return 0;
  var G = s.G, u, y, dy, k, hot = 0, x;
  /* (the cloth first, then the drapes over its edges) */
  for (u = 2; u <= 5; u++) for (dy = 3; dy <= 10; dy++) {
    var hill = dy <= 3 + ((u * 5) % 3);
    wBack(g, mU(s, u), G - dy, u === 4 && dy === 8 ? M_CLOTH_MOON : (hill ? M_CLOTH_HILL : M_CLOTH_SKY), 0.75);
  }
  /* (the back drape hangs full; the front one is tied back to the post, so it is wide at the top and narrow below) */
  var back = [9, 7], front = [[6, 9], [5, 5], [4, 3]];
  for (u = 1; u <= 2; u++) for (dy = 11 - back[u - 1]; dy <= 11; dy++) wBack(g, mU(s, u), G - dy, (dy + u) % 3 === 0 ? M_CURTAIN_D : (u === 2 ? M_CURTAIN_L : M_CURTAIN), 0.92);
  for (k = 0; k < front.length; k++) for (dy = 11 - front[k][1] + 1; dy <= 11; dy++) wBack(g, mU(s, front[k][0]), G - dy, (dy + k) % 3 === 0 ? M_CURTAIN_D : (k === 2 ? M_CURTAIN_L : M_CURTAIN), 0.92);
  for (dy = 2; dy >= 1; dy--) wBack(g, mU(s, 6), G - 6 - dy + 1, M_TIE, 0.9);
  /* the pelmet, scalloped */
  for (u = 1; u <= 7; u++) { wBack(g, mU(s, u), G - 11, M_CURTAIN, 0.95); if (u & 1) wBack(g, mU(s, u), G - 10, M_CURTAIN_D, 0.95); }
  /* the risers in shadow, under the lip of each tier above, so the steps read as steps */
  for (k = 1; k <= 3; k++) {
    var ri = (G - 2 * k + 1) * g.gw + mU(s, (s.tw || M_TW) === 21 ? 5 + 4 * k : 5 + 3 * k);
    if (g.m[ri] === MAT.BRICK) g.px[ri] = blend32(g.px[ri], 0xff000000, 0.3);
  }
  /* the post, on the ground at the edge of the pit, up to the end of the beam */
  x = mU(s, 7);
  for (y = G - 12; y <= G - 1; y++) wBack(g, x, y, y === G - 12 ? SAND_PAL[MAT.PLANK][40] : M_POST, 0.95);
  [[1, G - 11], [6, G - 11]].forEach(function (l) { var lx = mU(s, l[0]); if (pCell(g, lx, l[1]) === MAT.LAMP) { mGlow(g, lx, l[1], 8, 0.4); hot++; } });
  return hot;
}
/* somebody in a hat: whoever is playing the dead */
function mDrawCast(g, s) {
  var P = s.play;
  if (!P || !P.hat || !P.on) return;
  var a = lAlive(g, P.cast[0]);
  if (!a || a.state !== "walk" || a.stun > 0) return;
  var x = Math.floor(a.x), y = Math.floor(a.y) - 9;
  wPut(g, x - 1, y, M_HAT); wPut(g, x, y, M_HAT); wPut(g, x + 1, y, M_HAT);
  wPut(g, x - 1, y - 1, M_HAT_BAND); wPut(g, x, y - 1, M_HAT_BAND); wPut(g, x + 1, y - 1, M_HAT_BAND);
  wPut(g, x, y - 2, M_HAT); wPut(g, x - 1, y - 2, M_HAT); wPut(g, x + 1, y - 2, M_HAT);
  wPut(g, x - 2, y, M_HAT); wPut(g, x + 2, y, M_HAT);
}

/* -------------------------------------------------------------------
   THE PYRAMID
   ------------------------------------------------------------------- */
var M_PYR_W = 23, M_PYR_H = 12;
var M_CURSE = 3000;         /* ticks a curse lasts */
P_SAY.idea_pyramid = ["the king is dead. we should do something. something BIG", "a pile of stone. a really big one", "pointy. on purpose",
  "for the king. and for us, a bit"];
P_SAY.planPyramid = ["a pyramid, out by the edge", "stone. so much stone", "it's going to be pointy", "for the old king"];
P_SAY.capstone = ["the capstone!", "the top bit!", "here it goes", "careful with it", "the point of it all"];
P_SAY.apex = ["you can see everything from here", "i'm standing on a king", "it's a long way down", "what a view", "everything's so small"];
P_SAY.kingApex = ["{d} would have liked this", "i'm taller than {d} now", "rest easy, {d}. under all that", "{d} never came up here", "this is all mine now. {d} would hate that"];
P_SAY.curse = ["it's the curse", "i touched nothing", "the king's curse", "why do i keep falling over", "it wasn't me"];
P_SAY.tomb = ["i touched nothing", "it's dark in here", "is that a crown", "hello? king?"];
P_ACHIEVE.cursed = ["THE CURSE", "somebody opened the tomb. they will not be walking straight for a while"];

wDef({
  id: "pyramid",
  idea: { name: "the pyramid", title: "THE PYRAMID", sub: "the king is dead. we should do something. something BIG", hint: "a king who dies, and rock to cut",
          ready: function (g) { return !!g.know.masonry && !!(g.kingDied || g.thinkerDied) && !!g.wQuarryOk; } },
  achieve: ["THE PYRAMID", "twelve courses of stone, a king in the middle, and a point on top. it is visible from the next valley"],
  plan: mPlanPyramid,
  pick: mPyramidPick,
  task: function (g, p, k) { return k.kind === "apex" ? mTaskApex(g, p, k) : undefined; },
  step: mPyramidStep,
  draw: mDrawPyramid,
  finish: function (g, s, p) {
    feed(g, "the pyramid is up. " + (s.tomb ? pTitle(s.tomb.name) + " is in the middle of it" : "it is very pointy"), "#ffd94a", "plan" + s.id);
    if (g.popGoal != null && !g.wPyrFame) { g.wPyrFame = 1; g.popGoal++; }   /* (fame: "i heard you had a pyramid") */
  },
  label: function (s) { return "the pyramid" + (s.tomb ? " of " + pTitle(s.tomb.name) : ""); },
  readout: function (g, s) { return s.open ? "the tomb is open" : ""; },
  mood: function (g, p, k) { return k.kind === "apex" ? (k.act ? "is on top of the pyramid, looking out" : "is climbing the pyramid") : (k.kind === "audience" && k.of === "capstone" ? "is watching the capstone go on" : ""); }
});
function mPlanPyramid(g, p) {
  var r = wPlot(g, { w: M_PYR_W, sky: 14, rough: 20, edge: true, pad: 2, fit: mPyramidFit });
  if (!r) return false;
  var x0 = r.x0, G = r.r.G, plan = wGild(g, wCleared(g, r, r.r.plan)), lk = g.lastKing || { name: g.thinkerDied || "THE KING", hat: P_HATS[6] };
  var s = bNew(g, "pyramid", p, plan, [x0, G - M_PYR_H, x0 + M_PYR_W - 1, r.lo], { wonder: true, G: G, px: x0 + 11, T: G - M_PYR_H,
               tomb: { name: lk.name, hat: lk.hat }, cx0: x0 + 10, cy0: G - 4 });
  feed(g, p.name + " is building a pyramid for " + pTitle(lk.name) + ". it will want a great deal of stone", "#ffd94a", "plan" + s.id);
  pSay(g, p, "planPyramid", true);
  if (bCarries(p)) bJoin(g, p, s);
  return true;
}
/* course by course on ground gy at x0: a level row to stand it on (dug down at the high end, made up at the low, as the
   statue's is), each course a cell in on either side, the chamber left in courses two and three, and the capstone */
function mPyramidFit(g, x0, gy, hi, lo) {
  /* the row it stands on: as low as will keep the chamber and the top of it out in the air, and no more than eight
     courses of made-up ground under the low end */
  var best = null;
  for (var G = lo; G >= Math.max(hi, lo - 8); G--) {
    var r = mPyramidAt(g, x0, gy, G);
    if (r && (!best || r.score > best.score)) best = r;
  }
  /* (it goes to the side, out of the way: a pyramid is not built where anybody lives) */
  for (var k = 0; best && k < g.sites.length; k++) if (g.sites[k].kind === "house" && Math.abs(g.sites[k].cx - (x0 + 11)) < 24) return null;
  return best;
}
function mPyramidAt(g, x0, gy, G) {
  var plan = [], x, y, c, work = 0, buried = 0;
  for (x = 0; x < M_PYR_W; x++) for (y = gy[x] - 1; y >= G; y--) { plan.push(bE(g, x0 + x, y, MAT.BRICK, 1 + gy[x] - y)); work++; }
  for (c = 0; c < M_PYR_H; c++) {
    y = G - 1 - c;
    for (x = x0 + c; x <= x0 + M_PYR_W - 1 - c; x++) {
      var room = (c === 2 || c === 3) && x >= x0 + 10 && x <= x0 + 12, v = pCell(g, x, y);
      /* (where the hill is up over a course already, the hill is that much of it: it is built on, not dug into, which
         would only pour back in. the chamber, and the courses round it, have to be out in the air, and the top) */
      if (!AIRY[v] && !P_LEAF[v] && !mFellable(g, x, y, v)) {
        buried++;
        if ((!B_DIG[v] && !ROCK[v]) || (c >= 1 && c <= 4 && x >= x0 + 9 && x <= x0 + 13) || c >= M_PYR_H - 2) return null;
        continue;
      }
      plan.push(bE(g, x, y, room ? MAT.EMPTY : (c === M_PYR_H - 1 ? MAT.GOLD : MAT.BRICK), 10 + c));
    }
  }
  return { plan: plan, G: G, score: 30 - work - buried * 0.5 };
}
/* the cells round the chamber: if any of them has gone, the tomb is open */
function mTombOpen(g, s) {
  for (var x = s.cx0 - 1; x <= s.cx0 + 3; x++) for (var y = s.cy0 - 2; y <= s.cy0 + 1; y++) {
    var inside = x >= s.cx0 && x <= s.cx0 + 2 && y >= s.cy0 && y <= s.cy0 + 1;
    if (!inside && !SOLID[pCell(g, x, y)]) return true;
  }
  return false;
}
function mPyramidStep(g, s) {
  var k, q;
  if (!s.done) {
    /* the capstone, the last of it: everybody idle comes to watch it go on */
    var e = bNext(g, s, null);
    if (e && e.ph === 10 + M_PYR_H - 1 && !s.capWatch) {
      s.capWatch = true;
      wGather(g, s, { cap: 99, x: s.x0 - 6, y: s.G - 1, until: g.tick + 1500, kind: "capstone", face: 1, R: 260 });
      var b = g.peasants.filter(function (q) { return q.task && q.task.kind === "build" && q.task.site === s.id; })[0];
      if (b) pSay(g, b, "capstone", true);
    }
  }
  /* the tomb: open (somebody erased their way in, or poured acid), and the first one in is cursed */
  if (!s.sealed && s.done) s.sealed = true;   /* (it is only a tomb once it is shut) */
  var open = !!s.sealed && mTombOpen(g, s);
  if (open && !s.open) feed(g, "somebody has opened the tomb of " + pTitle(s.tomb.name) + ". nobody go in there", "#c8d0dc", "tomb" + s.id);
  if (!open) s.cursedOne = 0;
  s.open = open;
  if (open && !s.cursedOne) for (k = 0; k < g.peasants.length; k++) {
    q = g.peasants[k];
    if (q.dead || q.state !== "walk" || q.x < s.cx0 || q.x > s.cx0 + 3 || Math.abs(q.y - (s.cy0 + 1)) > 2) continue;
    s.cursedOne = q.id; q.curse = g.tick + M_CURSE;
    pSay(g, q, "tomb", true);
    feed(g, q.name + " walked into the tomb of " + pTitle(s.tomb.name) + ". they touched nothing", "#c8d0dc", "curse");
    achieve(g, "cursed");
    break;
  }
  /* the cursed trip over their own feet, as on ice, wherever they are */
  for (k = 0; k < g.peasants.length; k++) {
    q = g.peasants[k];
    if (!q.curse || q.curse < g.tick || q.dead || q.state !== "walk" || q.slip > 0 || q.climb || q.rope || q.swimming || q.jumping || q.idle > 0) continue;
    if (!pGround(g, Math.floor(q.x), Math.floor(q.y)) || Math.random() >= 0.075) continue;
    q.slip = 40 + irnd(30); q.ivx = q.dir * 0.25; q.jumping = false;
    if (q.pail) iSpill(g, q);
    pSay(g, q, "curse", true); g.fx.thud++;
    g.curseSlips = (g.curseSlips || 0) + 1;
  }
}
/* the bored, and the explorers, climb it and look out. the king, now and then, climbs it to say a word for the last one */
function mPyramidPick(g, p, hungry) {
  var s = mSites(g, "pyramid", true)[0];
  if (!s || hungry || p.bored < 500 || Math.abs(s.cx - p.x) > 220 || mCrew(g, "apex", s.id) || wNoGo(g, p, s.id)) return false;
  var king = pKing(g) === p;
  if (Math.random() >= (king ? 0.12 : 0.05)) return false;
  p.task = { kind: "apex", site: s.id, t: 0, act: 0, spot: s.px, king: king };
  return true;
}
function mTaskApex(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || !s.done) return iDone(p, false);
  var r = mTaskLookout(g, p, k);
  if (k.act === 31 && k.king && s.tomb) pSay(g, p, pick(P_SAY.kingApex).replace(/\{d\}/g, pTitle(s.tomb.name)), true);
  else if (k.act === 31 && !k.king) pSay(g, p, "apex", true);
  /* and with gold to spare, a nugget left at its foot on the way down */
  if (k.act === 300 && (p.gold || 0) >= 1 && Math.random() < 0.5) {
    var ox = s.x0 - 1, oj = (s.G - 1) * g.gw + ox;
    if (g.m[oj] === MAT.EMPTY && pSolid(g, ox, s.G)) iOffer(g, p, oj);
  }
  return r;
}
var M_TOMB = hex32("#1e1812"), M_TOMB_D = hex32("#161210"), M_SARC = hex32("#8a7a5a");
/* the chamber: dark, a stone box in it, and the crown on the box */
function mDrawPyramid(g, s) {
  var x, y, hot = 0;
  for (y = s.cy0; y <= s.cy0 + 1; y++) for (x = s.cx0; x <= s.cx0 + 2; x++) wBack(g, x, y, (x + y) & 1 ? M_TOMB : M_TOMB_D);
  if (pCell(g, s.cx0 + 1, s.cy0 + 1) === MAT.EMPTY) wPut(g, s.cx0 + 1, s.cy0 + 1, M_SARC);
  if (pCell(g, s.cx0, s.cy0 + 1) === MAT.EMPTY) wPut(g, s.cx0, s.cy0 + 1, blend32(M_SARC, 0xff000000, 0.3));
  if (pCell(g, s.cx0 + 2, s.cy0 + 1) === MAT.EMPTY) wPut(g, s.cx0 + 2, s.cy0 + 1, blend32(M_SARC, 0xff000000, 0.3));
  if (pCell(g, s.cx0 + 1, s.cy0) === MAT.EMPTY && s.tomb) { wPut(g, s.cx0 + 1, s.cy0, SAND_PAL[MAT.GOLD][1], s.open); hot++; }
  return hot;
}

/* -------------------------------------------------------------------
   THE CATHEDRAL & CRYPT. seventeen wide, and thirty-five up to the top
   of the rod. u runs 0..16 across it; h is rows up from the floor (F),
   r rows down from it:
     h 1..9    the nave: a door in either end wall (u 1 and 15), pews,
               and room enough for anybody
     h 10..12  tall windows over the doors, the buttresses out over the
               doorways, and three candles hung from the vault
     h 13      the vault
     h 14..21  the gable, stepped, with the rose window in it
     h 19..26  the belfry, on top of the gable: the bell, rehung
     h 27..32  the spire, and h 33..35 the rod, and a weathercock
     r 0       the floor: planks, and the hatch of the crypt (u 2..4)
     r 1..9    the crypt: a ladder down, walls of stone (or of the rock
               it is cut in), and a niche in the back wall for each of
               the dead. r 10 is its floor
   ------------------------------------------------------------------- */
var M_CATH_W = 17;
var M_SERVICE_GAP = 9000;   /* ticks between services, at the least */
var M_SERVICE = 2400;       /* and how long one goes on for, at the most */
var M_BEAT_SERVICE = 150;   /* ticks to a name */
var M_COSY = 1000;          /* thinking runs twice as fast for this long after a service */
var M_NICHES = 32;          /* names the crypt holds */
P_SAY.idea_cathedral = ["the bell wants a better home. and the dead want somewhere to be remembered out loud", "the cross is gone. the name shouldn't be",
  "somewhere tall. for the bell, and the names", "a house for the dead. with coloured windows"];
P_SAY.planCathedral = ["a cathedral. a big one", "the bell goes at the top", "a crypt underneath, for the names", "it'll take a lot of stone. and glass"];
P_SAY.niche = ["hello, {d}", "i brought you a candle, {d}", "{d}. we haven't forgotten", "it's dry down here, {d}. mostly", "{d}, it's me",
  "they put your name back, {d}"];
P_SAY.bailCrypt = ["the crypt's wet again", "*slosh*", "nobody wants wet feet down there", "up the ladder with it", "the dead don't swim"];
P_SAY.preach = ["we are here for the ones who are not", "sit. sit down", "let's begin", "quiet, now"];
P_SAY.amen = ["and that is all of them", "remember them", "go on, then", "that'll do. go home", "and the ones whose names we've lost"];
P_SAY.pew = ["*sniff*", "i remember", "she was kind to me", "he owed me a log", "*whisper*", "shh"];
P_SAY.sanctuary = ["in here!", "the big house!", "it's stone. it'll hold", "inside, quick", "into the cathedral!"];
P_SAY.glazier = ["the colours ran", "red, green, amber. again", "plain glass won't do", "put the colours back"];

wDef({
  id: "cathedral",
  idea: { name: "the cathedral", title: "THE CATHEDRAL", sub: "the bell wants a better home. and the dead want somewhere to be remembered out loud",
          hint: "coloured glass, the bell up, and a cross gone to nothing",
          ready: function (g) { return !!g.know.stained && mSites(g, "bell", true).length > 0 && (g.dead || []).some(function (d) { return d.site === -1; }); } },
  achieve: ["THE CATHEDRAL", "a nave, a rose window, a spire with a rod on it. and every name in the crypt, even the ones the weather took"],
  plan: mPlanCathedral,
  pick: mCathPick,
  task: function (g, p, k) { return k.kind === "crypt" ? mTaskCrypt(g, p, k) : (k.kind === "cbail" ? mTaskCryptBail(g, p, k) : (k.kind === "preach" ? mTaskPreach(g, p, k) : undefined)); },
  step: mCathStep,
  draw: mDrawCathedral,
  drawOver: mDrawCathOver,
  finish: mCathFinished,
  label: function () { return "the cathedral"; },
  readout: function (g, s) {
    if (!s.done) return "";
    if (s.serv) return "a service, for the dead";
    if (s.flood) return "the crypt is flooded: " + s.flood + " cells of water";
    var n = (s.niches || []).length;
    return n + " name" + (n === 1 ? "" : "s") + " in the crypt" + (s.rodHits ? ". the rod has taken " + s.rodHits + " bolt" + (s.rodHits > 1 ? "s" : "") : "");
  },
  mood: function (g, p, k) {
    if (k.kind === "crypt") return k.on ? "is in the crypt, with a candle, by " + pTitle(iShort(k.name)) + "'s name" : "is going down to the crypt, with a candle";
    if (k.kind === "cbail") return p.pail ? "is carrying water up out of the crypt" : "is bailing out the crypt";
    if (k.kind === "preach") return "is saying a few words for the dead";
    if (k.kind === "audience" && k.of === "service") return k.sit ? "is at the service, on a pew" : "is at the service, at the back";
    return "";
  }
});
/* the columns, x to u and back */
function mCX(s, u) { return s.x0 + u; }
/* what goes at column u, h rows up from the floor: [what, aux], or null for thin air. ruby: gold for the heart of the rose */
function mCathCell(u, h, ruby) {
  var a = Math.abs(u - 8), d;
  if (h <= 9) {
    if (u === 1 || u === 15) return [MAT.DOOR, 10 - h];
    if (h === 1 && (u === 6 || u === 7 || (u >= 10 && u <= 13))) return [MAT.PLANK, 0];   /* the pews */
    return null;
  }
  if (h <= 12) {
    if (u === 1 || u === 15) return [MAT.GLASS, 0];                                       /* tall windows over the doors */
    if (u === 0 || u === 16) return [MAT.BRICK, 0];                                       /* the buttresses, out over the doorways */
    if (h === 12 && (u === 2 || u === 14)) return [MAT.BRICK, 0];                         /* (where the vault springs from) */
    if (h === 12 && (u === 4 || u === 8 || u === 12)) return [MAT.LAMP, 0];               /* candles, hung from the vault */
    return null;
  }
  if (h === 13) return [MAT.BRICK, 0];
  if (h === 14 && (u === 0 || u === 16)) return [MAT.BRICK, 0];                           /* (pinnacles) */
  if (h >= 21 && h <= 25 && a <= 1) return null;                                          /* the belfry */
  if (h >= 19 && h <= 26 && a === 2) return [MAT.BRICK, 0];   /* (louvred either side, for the sound: drawn) */
  if (h === 26 && a <= 2) return [MAT.BRICK, 0];
  if (h >= 27 && h <= 29) return a <= 1 ? [MAT.BRICK, 0] : null;                          /* the spire */
  if (h >= 30 && h <= 32) return a === 0 ? [MAT.BRICK, 0] : null;
  if (h >= 33 && h <= 35) return a === 0 ? [MAT.GIRDER, 0] : (u === 9 && h === 34 ? [MAT.GOLD, 0] : null);   /* the rod, the weathercock */
  if (h >= 14 && h <= 21 && a <= 21 - h) {                                                /* the gable, and the rose in it */
    d = a + Math.abs(h - 16);
    if (d <= 2) return [MAT.STAINED, d === 0 ? (ruby ? 0 : 2) : (d === 1 ? 2 : 1)];
    return [MAT.BRICK, 0];
  }
  return null;
}
/* and under the floor, r rows down: what goes there (-1: nothing; EMPTY: dug out, and that is all) */
function mCryptCell(u, r) {
  if (r === 0) return u <= 1 || u >= 15 ? MAT.BRICK : (u <= 4 ? MAT.LADDER : MAT.PLANK);
  if (r === 10) return u >= 1 && u <= 15 ? MAT.BRICK : -1;
  if (u === 1 || u === 15) return MAT.BRICK;
  if (u >= 2 && u <= 4) return MAT.LADDER;
  return u >= 5 && u <= 14 ? MAT.EMPTY : -1;
}
/* the niches in the crypt's back wall: a lattice, five and four to a row */
function mNiche(s, n) {
  var row = 0, k = n;
  while (k >= (row & 1 ? 4 : 5)) { k -= row & 1 ? 4 : 5; row++; }
  return { x: s.x0 + 6 + 2 * k + (row & 1), y: s.F + 2 + row };
}
/* the middle of the graveyard, if there is one: the cathedral goes by it */
function mGraveyard(g) {
  var n = 0, x = 0;
  for (var k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "grave") { n++; x += g.sites[k].cx; }
  return n ? x / n : 0;
}
function mPlanCathedral(g, p, near) {
  var r = mPlotAny(g, { w: M_CATH_W, sky: 38, rough: 12, near: near || mGraveyard(g) || wMiddle(g), pad: 2, fit: mCathFit });
  if (!r) return false;
  var x0 = r.x0, F = r.r.F, plan = wGild(g, mCleared(g, r, r.r.plan));
  var s = bNew(g, "cathedral", p, plan, [x0, F - 35, x0 + M_CATH_W - 1, F + r.r.deep],
               { wonder: true, F: F, ix0: x0 + 2, ix1: x0 + 14, rod: { x: x0 + 8, top: F - 35, bot: F - 1 }, niches: [], servT: 0 });
  feed(g, p.name + " is building a cathedral. it will want stone, glass, coloured glass and a good deal of digging", "#ffd94a", "plan" + s.id);
  pSay(g, p, "planCathedral", true);
  if (bCarries(p)) bJoin(g, p, s);
  return true;
}
/* on ground gy at x0: the floor at whichever row is the least work (no more than four under the highest of it: the
   ground beside it would only pour in). {plan, F, score} or null */
function mCathFit(g, x0, gy, hi, lo) {
  var best = null;
  for (var F = hi; F <= Math.min(lo, hi + 4); F++) { var r = mCathAt(g, x0, gy, F); if (r && (!best || r.score > best.score)) best = r; }
  return best;
}
function mCathAt(g, x0, gy, F) {
  var plan = [], work = 0, ruby = wCellsSure(g, "gold") >= 1, u, x, y, h, r, c, v, e, k, t;
  /* (the crypt goes down ten under the floor: nothing of anybody's down there, and nothing wet, hot or bang about it) */
  for (k = 0; k < g.sites.length; k++) { t = g.sites[k]; if (x0 + 17 >= t.x0 && x0 - 1 <= t.x1 && F + 12 >= t.y0 && F <= t.y1) return null; }
  for (u = -1; u <= 17; u++) for (y = F; y <= F + 12; y++) {
    c = pCell(g, x0 + u, y);
    if (LIQUID[c] || HOT[c] || c === MAT.DRAIN || P_BANG[c] || (u >= 0 && u <= 16 && y <= F + 10 && bMarked(g, x0 + u, y))) return null;
  }
  function cut(x, y, ph) {   /* dug out (sand), or cut (rock): true if it can be */
    c = pCell(g, x, y);
    if (AIRY[c]) return true;
    if (ROCK[c]) { e = bE(g, x, y, MAT.EMPTY, ph); e.mine = true; plan.push(e); work += 1; return true; }
    if (B_DIG[c] || mFellable(g, x, y, c)) { plan.push(bE(g, x, y, MAT.EMPTY, ph)); work += 0.3; return true; }
    return false;
  }
  /* (ground much higher than the floor just outside it would pour in at the doors) */
  for (u = -2; u <= 18; u += u === -1 ? 18 : 1) { y = mGroundNear(g, x0 + u, true, F - 1); if (y < 0) continue; if (y < F - 3) return null; work += Math.max(0, F - y) * 2; }
  /* the ground over the floor, out of the nave */
  for (u = 0; u < M_CATH_W; u++) for (y = gy[u]; y < F; y++) if (!cut(x0 + u, y, 1)) return null;
  /* the doors in the end walls go up first, to hold back the ground either side while the crypt is dug. then the
     crypt, a row at a time from the top: its walls first (stone driven into the sand where it lies, so the sand round
     it stays put), then that row dug out. what is built up out of thin air (where the ground is low) goes in before
     anything, from the bottom up. then the ladder, from the bottom up, and the floor over it all */
  /* (a door over low ground, on a terrace, has nothing to hold back, and nothing to stand on to build it from until the
     floor is down: it goes up with the rest of the nave) */
  for (h = 1; h <= 9; h++) for (u = 1; u <= 15; u += 14) plan.push(bE(g, x0 + u, F - h, MAT.DOOR, gy[u] <= F + 1 ? 10 + h : 60 + h, 10 - h));
  var deep = 10;
  for (u = 0; u < M_CATH_W; u++) deep = Math.max(deep, gy[u] - F - 1);
  for (r = 0; r <= deep; r++) for (u = 0; u < M_CATH_W; u++) {
    x = x0 + u; y = F + r; v = r > 10 ? -1 : mCryptCell(u, r); c = pCell(g, x, y);
    /* (on a slope: a terrace of stone under the low end, down to the ground, and round the crypt) */
    if (v < 0) { if (y < gy[u]) { if (!AIRY[c] && !B_DIG[c]) return null; plan.push(bE(g, x, y, MAT.BRICK, 2)); work++; } continue; }
    if (v === MAT.BRICK) {
      if (ROCK[c]) continue;   /* (the rock is the wall) */
      if (AIRY[c]) { plan.push(bE(g, x, y, v, 2)); work++; continue; }
      if (!B_DIG[c]) return null;
      e = bE(g, x, y, v, r ? 20 + 2 * r : 10); e.drive = true; plan.push(e); work += 0.6;
      continue;
    }
    if (!cut(x, y, 21 + 2 * r)) return null;
    if (v === MAT.LADDER) { plan.push(bE(g, x, y, v, 41 + 9 - r, u - 2)); work += 0.3; }
    else if (v === MAT.PLANK) { plan.push(bE(g, x, y, v, 51)); work += 0.3; }
  }
  /* the nave, the gable, the belfry, the spire: from the floor up */
  for (h = 1; h <= 35; h++) for (u = 0; u < M_CATH_W; u++) {
    var cell = mCathCell(u, h, ruby);
    if (cell && cell[0] !== MAT.DOOR) plan.push(bE(g, x0 + u, F - h, cell[0], cell[0] === MAT.LAMP ? 60 + 14 : 60 + h, cell[1]));   /* (the candles hang from the vault: after it) */
  }
  return { plan: plan, F: F, deep: deep, score: 60 - work * 0.2 };
}
/* finished: the names go down into the crypt, the bell is rehung in the belfry, and a service is not far off */
function mCathFinished(g, s, p) {
  feed(g, "the cathedral is finished. the names go down into the crypt, a candle each", "#ffd94a", "plan" + s.id);
  mNiches(g, s, true);
  mRehang(g, s, p);
  s.servT = g.tick + 2000;
}
/* the bell, from wherever it hung, to the belfry: the old one taken down (its gold kept, for the new). what it hung
   from, the brick brackets, is let be where it is: paid for, and nobody's to throw away */
function mRehang(g, s, p) {
  var B = mSites(g, "bell", true), b = null, k, e, gold = 0;
  for (k = 0; k < B.length; k++) if (B[k].on !== s.id) b = B[k];
  if (!b || mSites(g, "bell").some(function (o) { return o.on === s.id; })) return;
  for (k = 0; k < b.plan.length; k++) {
    e = b.plan[k];
    if (e.v !== MAT.GOLD || g.m[e.i] !== e.v) continue;
    gold += B_AMT[MAT.GOLD];
    if (!heatTaken(g, e.i)) { sandSet(g, e.i, MAT.EMPTY); heatSync(g, e.i); }
  }
  for (k = 0; k < g.sites.length; k++) if (g.sites[k] === b) { bRemove(g, k); break; }
  var bx = s.x0 + 8, by = s.F - 23, plan = [bE(g, bx, s.F - 25, MAT.GOLD, 1)];
  for (var x = bx - 1; x <= bx + 1; x++) plan.push(bE(g, x, s.F - 24, MAT.GOLD, 2), bE(g, x, by, MAT.GOLD, 3));
  var nb = bNew(g, "bell", p, plan, [bx - 1, s.F - 25, bx + 1, by], { on: s.id, bx: bx, by: by, ring: 0, stock: { gold: gold } });
  feed(g, "the old bell is down. it is going up again in the belfry of the cathedral", "#ffd94a", "plan" + nb.id);
}
/* every name in g.dead gets a niche, the weathered ones too: they come back */
function mNiches(g, s, quiet) {
  var N = s.niches || (s.niches = []), k, d, back = [];
  for (k = 0; k < (g.dead || []).length && N.length < M_NICHES; k++) {
    d = g.dead[k];
    if (N.some(function (n) { return n.name === d.name; })) continue;
    N.push({ name: d.name, gone: d.site === -1, t: g.tick });
    if (d.site === -1) back.push(pTitle(iShort(d.name)));
  }
  if (back.length && !quiet) feed(g, back.join(", ") + (back.length > 1 ? " have" : " has") + " a niche in the crypt now. the cross weathered away; the name did not", "#c8d0dc", "niche" + s.id);
  else if (back.length) feed(g, "the names whose crosses weathered away are in the crypt too: " + back.join(", "), "#c8d0dc", "niche" + s.id);
}
/* the cells of the crypt, inside its walls (for its water) */
function mCryptAt(g, x, y) {
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (s.kind === "cathedral" && x >= s.x0 + 2 && x <= s.x0 + 14 && y > s.F && y < s.F + 10) return s;
  }
  return null;
}
function mCryptWater(g, s) {
  var n = 0;
  for (var y = s.F + 1; y < s.F + 10; y++) for (var x = s.x0 + 2; x <= s.x0 + 14; x++) if (WET[g.m[y * g.gw + x]]) n++;
  return n;
}
/* every W_STRIDE ticks: the names, the water in the crypt, the services, and the glazier */
function mCathStep(g, s) {
  var k, q;
  /* being mended: no services. the windows, melted and set plain, and the glazier putting the colours back (build.js
     lets plain glass be taken out for it, and the kiln makes the coloured) */
  if (s.repair) {
    if (s.serv) mEndService(g, s, false);
    if (!s.glazed && s.plan.some(function (e) { return e.v === MAT.STAINED && g.m[e.i] === MAT.GLASS; })) {
      s.glazed = true; s.glazes = (s.glazes || 0) + 1;
      feed(g, "the rose window melted in the heat and set plain. the village is putting the colours back", "#c8e0ff", "glaze" + s.id);
      q = pOther(g, { x: s.cx, y: s.F }, 200);
      if (q) pSay(g, q, "glazier", true);
    }
    return;
  }
  if (!s.done) return;
  s.glazed = false;
  mNiches(g, s, false);
  /* the crypt flooded: a bailer, while there is water in it */
  s.flood = mCryptWater(g, s);
  if (s.flood && !mCrew(g, "cbail", s.id) && !g.blaze.length && !(s.bailNo > g.tick)) {
    var best = null, bd = 1e9;
    for (k = 0; k < g.peasants.length; k++) {
      q = g.peasants[k];
      if (!wIdle(g, q, s) || q.pail || Math.abs(q.x - s.cx) > 240) continue;
      var d = Math.abs(q.x - s.cx);
      if (d < bd) { bd = d; best = q; }
    }
    if (best) {
      best.task = { kind: "cbail", site: s.id, t: 0, act: 0 };
      if (g.tick - (s.floodNews || -1e9) > 6000) { s.floodNews = g.tick; feed(g, "the crypt is flooded. " + best.name + " is bailing it out, a bucket at a time, up the ladder", "#a8c8e8", "crypt" + s.id); }
    }
  }
  mServiceStep(g, s);
}
/* the eldest of the idle, who says the words */
function mEldest(g, list) { var e = null; for (var k = 0; k < list.length; k++) if (!e || pAge(g, list[k]) > pAge(g, e)) e = list[k]; return e; }
/* the dead, as the eldest names them: by name and how, from the tales; and the rest by name */
function mNamesOf(g, s) {
  var out = [], seen = {}, k, t;
  for (k = (g.tales || []).length - 1; k >= 0 && out.length < 4; k--) {
    t = g.tales[k];
    if (t.kind !== "death" || !t.who || seen[t.who]) continue;
    seen[t.who] = 1;
    out.push("for " + pTitle(t.who) + ", who " + (W_HOW[t.also] || "died"));
  }
  /* (and one whose cross is gone, if there is one: they are said out loud too) */
  for (k = (s.niches || []).length - 1; k >= 0 && out.length < 5; k--) {
    var n = s.niches[k], sh = iShort(n.name);
    if (seen[sh] || (!n.gone && out.length)) continue;
    seen[sh] = 1;
    out.push("for " + pTitle(sh) + (n.gone ? ", whose cross is gone" : ""));
  }
  return out;
}
/* a service: the bell, the idle filing in to the pews, the eldest at the front naming the dead, and after it everybody
   thinks the better for it a while */
function mServiceStep(g, s) {
  var S = s.serv, k;
  if (!S) {
    if (g.tick < (s.servT || 0) || g.blaze.length) return;
    var idle = g.peasants.filter(function (q) { return wIdle(g, q, s) && Math.abs(q.x - s.cx) < 240; });
    if (idle.length < 2) { s.servT = g.tick + 900; return; }
    var names = mNamesOf(g, s);
    if (!names.length) { s.servT = g.tick + 3000; return; }
    var el = mEldest(g, idle);
    el.task = { kind: "preach", site: s.id, t: 0, on: false };
    var but = {}; but[el.id] = 1;
    var seats = [6, 7, 10, 11, 12, 13].map(function (u) { return { x: s.x0 + u, y: s.F - 2 }; });
    s.serv = { t: 0, who: el.id, names: names, i: 0, bt: 0 };
    mRing(g, 3);
    /* (and the steam organ plays, if there is one: pleasures.js) */
    if (typeof pOrganPlay === "function") pOrganPlay(g, "service");
    wGather(g, s, { seats: seats, cap: 99, x: s.x0 + 4, y: s.F - 1, until: g.tick + M_SERVICE, kind: "service", but: but, R: 240 });
    feed(g, "the bell is ringing for a service at the cathedral. " + el.name + " is to say the words", "#ffd94a", "serv" + s.id);
    return;
  }
  S.t += W_STRIDE;
  var e = lAlive(g, S.who);
  if (!e || !e.task || e.task.kind !== "preach" || S.t > M_SERVICE) { mEndService(g, s, S.i > 0); return; }
  if (!e.task.on) { if (S.t > 1200) mEndService(g, s, false); return; }
  if ((S.bt += W_STRIDE) < M_BEAT_SERVICE) return;
  S.bt = 0;
  var H = mFlock(g, s);
  if (S.i === 0 && !S.begun) { S.begun = true; pSay(g, e, "preach", true); return; }
  if (S.i < S.names.length) {
    pSay(g, e, S.names[S.i], true);
    s.named = (s.named || []).concat([S.names[S.i]]).slice(-8);
    S.i++;
    if (H.length && Math.random() < 0.4) { var q = H[irnd(H.length)]; if (q.sayT <= 0) pSay(g, q, "pew"); }
    return;
  }
  pSay(g, e, "amen", true);
  mEndService(g, s, true);
}
function mFlock(g, s) { return g.peasants.filter(function (q) { return !q.dead && q.task && q.task.kind === "audience" && q.task.site === s.id; }); }
function mEndService(g, s, ok) {
  var S = s.serv;
  s.serv = null;
  s.servT = g.tick + M_SERVICE_GAP + (ok ? irnd(2000) : 1200);
  g.peasants.forEach(function (q) {
    var k = q.task;
    if (q.dead || !k || k.site !== s.id || (k.kind !== "preach" && k.kind !== "audience")) return;
    if (ok) { q.bored = 0; q.cosyT = g.tick + M_COSY; }
    q.task = null; q.taskDone = true;
  });
  if (ok && S) {
    s.services = (s.services || 0) + 1;
    if (s.services === 1) feed(g, "the first service at the cathedral. the names were said out loud, and everybody went home thinking", "#ffd94a", "serv" + s.id);
  }
}
/* the eldest: to the front, between the pews, and facing them, turn and turn about */
function mTaskPreach(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || !s.serv || ++k.t > M_SERVICE + 600) return iDone(p, false);
  var gx = s.x0 + 8, gy = s.F - 1;
  if (Math.abs(p.x - gx - 0.5) > 0.8 || Math.abs(Math.floor(p.y) - gy) > 1) {
    if (iWalk(g, p, k, "pulpit" + s.id, gx, gy, function (x, y) { return x === gx && Math.abs(y - gy) <= 1; })) return iDone(p, false);
    return false;
  }
  k.on = true; p.idle = 0; p.cosyT = g.tick + 30;
  p.dir = ((g.tick / 240) | 0) & 1 ? 1 : -1;
  p.pose = "stand";
  return true;
}
/* the bored, now and then: down to the crypt with a candle, to somebody's niche */
function mCathPick(g, p, hungry) {
  var s = mSites(g, "cathedral", true)[0];
  if (!s || s.repair || hungry || s.serv || s.flood || !(s.niches || []).length || p.bored < 600 || Math.abs(s.cx - p.x) > 220 || wNoGo(g, p, s.id) || mCrew(g, "crypt", s.id) >= 2) return false;
  if (Math.random() >= 0.06) return false;
  var n = irnd(s.niches.length), at = mNiche(s, n);
  p.task = { kind: "crypt", site: s.id, n: n, name: s.niches[n].name, x: at.x, t: 0, act: 0, on: false };
  return true;
}
function mTaskCrypt(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || !s.done || ++k.t > 3000 || s.flood) return iDone(p, false);
  var gx = k.x, gy = s.F + 9;
  if (Math.abs(p.x - gx - 0.5) > 1 || Math.abs(Math.floor(p.y) - gy) > 1) {
    if (iWalk(g, p, k, "crypt" + s.id + ":" + gx, gx, gy, function (x, y) { return Math.abs(x - gx) <= 1 && Math.abs(y - gy) <= 1; })) pGiveUp(g, p, gx);
    return false;
  }
  k.on = true; p.idle = 0; p.pose = "stand"; k.act++;
  p.dir = gx + 0.5 < p.x ? -1 : 1;
  if (k.act === 40) pSay(g, p, pick(P_SAY.niche).replace("{d}", pTitle(iShort(k.name))), true);
  if (k.act > 300) { p.bored = 0; return iDone(p, true); }
  return true;
}
/* bailing the crypt: a pail filled down there, up the ladder with it, and out: onto the nearest ground lower than the
   head of the crypt (where it will not run back in), or into the nearest real water. nothing dries up at twenty
   degrees, so it is never just left */
function mTaskCryptBail(g, p, k) {
  var s = bSite(g, k.site), fx = Math.floor(p.x), fy = Math.floor(p.y);
  if (!s || !s.done || ++k.t > 8000) { mTipOut(g, p, k, true); return iDone(p, false); }
  if (!p.pail) {
    if (!mCryptWater(g, s)) { p.bored = 0; return iDone(p, true); }
    var inside = fx >= s.x0 + 2 && fx <= s.x0 + 14 && fy > s.F && fy < s.F + 10;
    if (!inside) {
      var gx = s.x0 + 6, gy = s.F + 9;
      if (iWalk(g, p, k, "cbail" + s.id, gx, gy, function (x, y) { return x >= s.x0 + 5 && x <= s.x0 + 14 && y > s.F && y < s.F + 10; })) pGiveUp(g, p, gx);
      return false;
    }
    p.pose = (k.act >> 3) & 1 ? "eatB" : "stand"; p.idle = 0;
    if (++k.act < 16) return true;
    k.act = 0; k.best = null;
    /* (in their pail, heat and all, not in the job: dropped, it is spilt where they are. ideas.js iSpill, iPail) */
    p.pail = mScoopCrypt(g, s, p);
    if (!p.pail) return iDone(p, true);
    if (p.sayT <= 0 && Math.random() < 0.3) pSay(g, p, "bailCrypt");
    k.to = mDumpAt(g, s, p);
    return true;
  }
  /* up, and out, and tipped */
  var to = k.to;
  if (!to) { s.bailNo = g.tick + 6000; mTipOut(g, p, k, true); return iDone(p, false); }   /* (nowhere they can get to: a while) */
  if (Math.abs(fx - to.x) > 2 || Math.abs(fy - to.y) > 3) {
    if (iWalk(g, p, k, "cdump" + to.x, to.x, to.y, function (x, y) { return Math.abs(x - to.x) <= 2 && Math.abs(y - to.y) <= 3; })) { mTipOut(g, p, k, true); pGiveUp(g, p, to.x); }
    return false;
  }
  p.dir = to.water ? (to.wx + 0.5 < p.x ? -1 : 1) : p.dir;
  p.pose = ++k.act < 10 ? "hammerA" : "hammerB";
  if (k.act < 14) return true;
  k.act = 0; k.best = null;
  mTipOut(g, p, k);
  if (p.pail) return true;   /* (no room in front of them for all of it: again, in a moment) */
  g.fx.splash++;
  s.bailed = (s.bailed || 0) + 1;
  return true;
}
/* the pail, emptied in front of them (iSpill finds the air for it). what finds no room stays in the pail, for the next
   try; unless the job is over (all), when it goes in the first air over them */
function mTipOut(g, p, k, all) {
  if (p.pail) iSpill(g, p, !!all);
}
/* a pailful out of the crypt: the cells of water nearest p, each with its heat */
function mScoopCrypt(g, s, p) {
  var cells = [], x, y, j, load = [];
  for (y = s.F + 1; y < s.F + 10; y++) for (x = s.x0 + 2; x <= s.x0 + 14; x++) { j = y * g.gw + x; if (WET[g.m[j]]) cells.push(j); }
  cells.sort(function (a, b) { return Math.abs(a % g.gw - p.x) + Math.abs(((a / g.gw) | 0) - p.y) - Math.abs(b % g.gw - p.x) - Math.abs(((b / g.gw) | 0) - p.y); });
  for (var k = 0; k < cells.length && load.length < I_LOAD; k++) {
    j = cells[k];
    heatSync(g, j);
    load.push({ m: g.m[j], sh: g.sh[j], q: heatQ(g, j) });
    g.m[j] = MAT.EMPTY; g.aux[j] = 0; g.T[j] = AMBIENT; g.lat[j] = 0;
    heatAccept(g, j);
  }
  return load.length ? load : null;
}
/* where a pail out of the crypt goes: the nearest of ground lower than the crypt's head (where it will not run back in)
   and real water, out of the cathedral and a little way off, that p can get to. {x, y (where to stand), water, wx} */
function mDumpAt(g, s, p) {
  var C = [], d, sd, x, G, k, n = [0, 0], last = [-99, -99], cx = Math.round(s.cx);
  for (d = 12; d <= 160; d++) for (sd = 0; sd < 2; sd++) {
    x = cx + (sd ? d : -d);
    if (x < 4 || x > g.gw - 5 || n[sd] >= 3 || d - last[sd] < 8) continue;
    G = mGroundNear(g, x, false, s.F);
    if (G > s.F + 1 && navStand(g, x, G - 1) === 1) { C.push({ x: x, y: G - 1, water: false, d: d }); n[sd]++; last[sd] = d; }
  }
  var w = iFindWater(g, { x: s.cx, y: s.F - 1 }, 160, null, false, iBarred(g, true), true);
  /* (water: from the bank, the nearest dry standing to it, on the cathedral's side) */
  if (w) for (d = 1; d <= 6; d++) {
    x = w.x + (w.x < s.cx ? d : -d); G = mGroundNear(g, x, false, w.y);
    if (G > 0 && navStand(g, x, G - 1) === 1 && !LIQUID[pCell(g, x, G - 1)]) { C.push({ x: x, y: G - 1, water: true, wx: w.x, d: Math.abs(w.x - s.cx) }); break; }
  }
  /* (nowhere lower, and no water: well off, where it soaks in, and does nobody any harm) */
  if (!C.length) for (d = 30; d <= 120 && C.length < 4; d += 6) for (sd = -1; sd <= 1; sd += 2) {
    x = cx + d * sd;
    if (x < 4 || x > g.gw - 5 || bSiteAround(g, x, s.F, null, 4)) continue;
    G = mGroundNear(g, x, false, s.F);
    if (G > 0 && navStand(g, x, G - 1) === 1) C.push({ x: x, y: G - 1, water: false, d: d });
  }
  C.sort(function (a, b) { return a.d - b.d; });
  for (k = 0; k < C.length && k < 4; k++) if (mReachable(g, p, C[k].x, C[k].y)) return C[k];
  return null;
}
/* far from home with things going bang: the cathedral, if it is near enough (build.js bHide). true if that is the plan */
function mHide(g, p) {
  var s = mSites(g, "cathedral", true)[0];
  if (!s || Math.abs(s.cx - p.x) > 160 || Math.abs(s.F - p.y) > 50 || (g.know.bucket && iBlazeOf(g, s.id))) return false;
  if (bInside(s, p)) {
    if (!p.hid || g.tick - p.hid > 600) pSay(g, p, "safe", true);
    p.panic = 0; p.idle = 400 + irnd(400); p.hid = g.tick;
    return true;
  }
  var left = pathGo(g, p, "sanct" + s.id, Math.round(s.cx), s.F - 1, function (x, y) { return x > s.ix0 && x < s.ix1 && y >= s.F - 3 && y <= s.F - 1; });
  if (left < 0) p.dir = s.cx < p.x ? -1 : 1;
  if (p.sayT <= 0 && Math.random() < 0.02) pSay(g, p, "sanctuary");
  return true;
}
var M_NAVE = hex32("#3e3832"), M_NAVE_L = hex32("#4c453d"), M_CRYPT = hex32("#221e1a"), M_CRYPT_D = hex32("#16130f"), M_NICHE = hex32("#0c0a08");
var M_ALTAR = hex32("#8a7a5a"), M_CROSS = hex32("#c8a848"), M_FLAME = [hex32("#ffe08a"), hex32("#ffc860"), hex32("#fff0b0")];
/* the inside of the nave (the back wall, its pillars and arches, the altar and a cross over it), the crypt (dark, and a
   niche in the wall for every name, a candle burning in each), and the candles' light */
function mDrawCathedral(g, s) {
  var x0 = s.x0, F = s.F, u, h, y, x, k, hot = 0;
  if (!s.done && !s.repair) return 0;
  /* the nave's back wall: pillars at 4 and 12, the arches springing from them */
  for (h = 1; h <= 12; h++) for (u = 2; u <= 14; u++) {
    var pil = (u === 4 || u === 12) && h <= 9, arch = h >= 10 && (Math.abs(u - 4) === 13 - h || Math.abs(u - 12) === 13 - h || Math.abs(u - 8) === h - 9);
    wBack(g, x0 + u, F - h, pil || arch ? M_NAVE_L : M_NAVE, 0.9);
  }
  /* the altar, between the pews, and the cross over it */
  for (u = 8; u <= 9; u++) for (h = 1; h <= 2; h++) wBack(g, x0 + u, F - h, h === 2 ? blend32(M_ALTAR, 0xffffffff, 0.15) : M_ALTAR);
  for (h = 5; h <= 9; h++) wBack(g, x0 + 8, F - h, M_CROSS);
  wBack(g, x0 + 7, F - 8, M_CROSS); wBack(g, x0 + 9, F - 8, M_CROSS);
  /* the inside of the belfry, and the louvres either side of it */
  for (h = 21; h <= 25; h++) for (u = 7; u <= 9; u++) wBack(g, x0 + u, F - h, M_CRYPT, 0.9);
  for (h = 22; h <= 24; h++) for (u = 6; u <= 10; u += 4) { var lj = (F - h) * g.gw + x0 + u; if (g.m[lj] === MAT.BRICK) g.px[lj] = blend32(g.px[lj], 0xff000000, h & 1 ? 0.55 : 0.35); }
  /* the crypt */
  for (y = F + 1; y <= F + 9; y++) for (x = x0 + 5; x <= x0 + 14; x++) wBack(g, x, y, (x + y) % 5 === 0 ? M_CRYPT_D : M_CRYPT);
  var N = s.niches || [], fl = (g.tick >> 3);
  for (k = 0; k < M_NICHES; k++) {
    var at = mNiche(s, k), j = at.y * g.gw + at.x;
    if (g.m[j] !== MAT.EMPTY) continue;
    if (k < N.length) { g.px[j] = g.gpx[j] = M_FLAME[(fl + k * 7) % 3]; mGlow(g, at.x, at.y, 2, 0.25); hot++; }
    else g.px[j] = M_NICHE;
  }
  /* the candles in the nave, and the light on the window from behind */
  for (u = 4; u <= 12; u += 4) if (pCell(g, x0 + u, F - 12) === MAT.LAMP) { mGlow(g, x0 + u, F - 12, 7, 0.35); hot++; }
  return hot;
}
/* over everybody: a candle in the hand of whoever is down in the crypt, and a pail for whoever is bailing it */
function mDrawCathOver(g, s) {
  for (var k = 0; k < g.peasants.length; k++) {
    var p = g.peasants[k], t = p.task;
    if (p.dead || !t || t.site !== s.id || p.state !== "walk") continue;
    var hx = Math.floor(p.x) + p.dir, hy = Math.floor(p.y) - 4;
    if (t.kind === "crypt") { mGlow(g, hx, hy, 5, 0.35); wPut(g, hx, hy, M_FLAME[(g.tick >> 2) % 3], true); wPut(g, hx, hy + 1, hex32("#f4f0e6")); }
    else if (t.kind === "cbail" && p.pail) { wPut(g, hx, hy + 1, I_PAIL); wPut(g, hx + p.dir, hy + 1, I_PAIL); wPut(g, hx, hy, SAND_PAL[MAT.WATER][0]); }
  }
}
