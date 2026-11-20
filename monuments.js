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
/* the theatre's columns, stage end first: u (0..20) to x */
function mU(s, u) { return s.d > 0 ? s.x0 + u : s.x0 + 20 - u; }
function mPlanTheatre(g, p) {
  var best = null;
  for (var d = -1; d <= 1; d += 2) {
    var r = wPlot(g, { w: 21, sky: 14, rough: 8, near: wMiddle(g), fit: function (g, x0, gy) { return mTheatreFit(g, x0, gy, d); } });
    if (r && (!best || r.score > best.score)) { best = r; best.d = d; }
  }
  if (!best) return false;
  var f = best.r, plan = wCleared(g, best, f.plan), G = f.G, x0 = best.x0, d = best.d;
  var s = bNew(g, "theatre", p, plan, [x0, G - 14, x0 + 20, f.lo], { wonder: true, d: d, G: G, seats: f.seats, playT: 0 });
  feed(g, p.name + " is building a theatre", "#ffd94a", "plan" + s.id);
  pSay(g, p, "planTheatre", true);
  if (bCarries(p)) bJoin(g, p, s);
  return true;
}
/* the plan for a theatre at x0 (stage at the d < 0 end, or the d > 0), on ground gy: {plan, G (the stage's ground),
   seats, lo, score} or null. u runs from the back of the stage (0) to the back of the top tier (20):
     u 0       the backdrop: a plank wall ten high, and a beam out over the stage off the top of it
     u 0..6    the stage: a stone plinth, a plank deck on that (two up off the ground), a lantern at either end of the beam
     u 7..8    the pit, on the ground, where the late stand
     u 9..20   three tiers, four columns each, two up each, stone, with a seat at either end of each
   the stage wants level ground (made up, or dug down, a row or two). the tiers like it rising away from the stage (they
   are cut into it), and do with it flat (built up) */
function mTheatreFit(g, x0, gy, d) {
  function X(u) { return d > 0 ? x0 + u : x0 + 20 - u; }
  function Gy(u) { return gy[X(u) - x0]; }
  var G = Gy(3), u, y, k, plan = [], seats = [], work = 0, lo = -1, c, e;
  function dig(x, y) { c = pCell(g, x, y); if (!B_DIG[c] && !AIRY[c] && !mFellable(g, x, y, c)) return false; plan.push(bE(g, x, y, MAT.EMPTY, 0)); work += 0.3; return true; }
  for (u = 0; u <= 8; u++) if (Math.abs(Gy(u) - G) > 2) return null;
  /* the stage and the pit: the ground under them made level (dug down where it is high, made up in stone where low) */
  for (u = 0; u <= 8; u++) {
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
  for (k = 1; k <= 3; k++) for (u = 5 + 4 * k; u <= 8 + 4 * k; u++) {
    var xx = X(u), gk = Gy(u), top = G - 2 * k, bot = gk >= G ? gk : Math.min(G, Math.max(gk, top) + 2);
    lo = Math.max(lo, gk);
    if (gk < top - 8) return null;   /* (a bank too steep to dig the seats into) */
    for (y = gk; y < top; y++) if (!dig(xx, y)) return null;
    for (y = top; y < bot; y++) { e = bE(g, xx, y, MAT.BRICK, 2 + bot - y); e.drive = true; plan.push(e); work += y >= gk ? 0.6 : 1; }
    if (u === 6 + 4 * k || u === 8 + 4 * k) seats.push({ x: xx, y: top - 1 });
  }
  /* a slope rising away from the stage is what it is for */
  var rise = G - Gy(20);
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
  var idle = g.peasants.filter(function (q) { return wIdle(g, q) && Math.abs(q.x - s.cx) < 220; });
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
    var ri = (G - 2 * k + 1) * g.gw + mU(s, 5 + 4 * k);
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
  for (var k = 0; best && k < g.sites.length; k++) if (g.sites[k].kind === "house" && Math.abs(g.sites[k].cx - (x0 + 11)) < 30) return null;
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
  if (!s || hungry || p.bored < 500 || Math.abs(s.cx - p.x) > 220 || mCrew(g, "apex", s.id)) return false;
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
