/* =====================================================================
   PLEASAND  --  test/hand.js

   THE HAND (hand.js, docs/the-hand-plan.md): a lump of the valley
   lifted, held, let go, set down whole or come down in pieces, with
   whoever was standing on it. and a valley that never lifts anything,
   which goes as it always went. required by test/run.js
   ===================================================================== */
"use strict";
var H = require("../harness"), path = require("path");

module.exports = function (test, check, sim) {
  function know(g, list) { list.forEach(function (k) { g.know[k] = "TEST"; }); }
  function sites(g, kind) { return g.sites.filter(function (s) { return s.kind === kind; }); }
  /* the cursor right over cell (x, y): the brush's disc is round that cell, as a dab of paint there would be */
  function at(h, x, y) { h.mouse(x - 0.5, y - 0.5); return h; }
  function lift(h, x, y, r) { h.select("HAND"); h.g.size = r; at(h, x, y); h.down(0); return h.g.hand.held; }
  /* let go, and wait for it to come down (true if it did) */
  function down(h, max) { h.up(); for (var t = 0; t < (max || 600) && h.g.hand.fly; t++) h.step(1); return !h.g.hand.fly; }
  /* every bit of heat there is: the grid's, the lump's, and the grains' in the air */
  function heatAll(h) {
    var g = h.g, w = h.game, q = 0, j, k, L;
    for (j = 0; j < g.m.length; j++) q += w.heatQ(g, j);
    [g.hand && g.hand.held, g.hand && g.hand.fly].forEach(function (L) { if (L) for (k = 0; k < L.c.length; k += 6) q += L.c[k + 5]; });
    for (k = 0; k < g.np; k++) if (g.pk[k] === w.PK_DEBRIS) q += g.pt[k];
    return q;
  }
  /* how much there is of everything: the grid, the lump, the grains in the air */
  function counts(h) {
    var g = h.g, c = {}, j, k;
    for (j = 0; j < g.m.length; j++) c[g.m[j]] = (c[g.m[j]] || 0) + 1;
    [g.hand && g.hand.held, g.hand && g.hand.fly].forEach(function (L) { if (L) for (k = 0; k < L.c.length; k += 6) c[L.c[k + 2]] = (c[L.c[k + 2]] || 0) + 1; });
    for (k = 0; k < g.np; k++) if (g.pk[k] === h.game.PK_DEBRIS) c[g.pm[k]] = (c[g.pm[k]] || 0) + 1;
    delete c[0];
    return JSON.stringify(c);
  }
  /* a finished house of the first peasant's, built at once (seed 6: in the middle of the valley, with the pond to its
     left), and the box of its cells */
  function housed(seed) {
    var h = H.open({ seed: seed || 6 }), w = h.game, g = h.g, p = g.peasants[0], M = w.MAT;
    p.logs = 20;
    check(w.bPlanHouse(g, p), "(the test wants a house)");
    var s = sites(g, "house").filter(function (q) { return !q.hut && q.owner === p.id; })[0];
    sim.build(w, s); w.bFinish(g, s, p);
    g.peasants.forEach(function (o) { if (o.task && o.task.kind === "build") o.task = null; });
    var b = [1e9, -1, 1e9, -1];
    s.plan.forEach(function (e) { if (e.v === M.EMPTY) return; var x = e.i % g.gw, y = (e.i / g.gw) | 0; b[0] = Math.min(b[0], x); b[1] = Math.max(b[1], x); b[2] = Math.min(b[2], y); b[3] = Math.max(b[3], y); });
    return { h: h, w: w, g: g, p: p, s: s, M: M, cx: (b[0] + b[1]) >> 1, cy: (b[2] + b[3]) >> 1, box: b };
  }
  /* how many of a site's cells are where its plan says, moved by (dx, dy) */
  function inPlace(C, dx, dy) {
    var g = C.g, n = 0, of = 0;
    C.s.plan.forEach(function (e) { if (e.v === C.M.EMPTY) return; of++; var j = e.i + dx + dy * g.gw; if (g.m[j] === e.v && g.aux[j] === e.a) n++; });
    return [n, of];
  }
  /* carry what is held to (x, y), a few cells a tick, and stop there: a hand that stops before it lets go lets go still */
  function carry(h, x, y) {
    var Hd = h.g.hand.held, x0 = Hd.x, y0 = Hd.y, n = Math.max(1, Math.ceil(Math.max(Math.abs(x - x0), Math.abs(y - y0)) / 3));
    for (var i = 1; i <= n; i++) { at(h, Math.round(x0 + (x - x0) * i / n), Math.round(y0 + (y - y0) * i / n)); h.step(1); }
    h.flick(0, 0);
  }
  /* the row a peasant's feet stand on at column x: the first air over the ground (not over a tree: seed 6 has a few) */
  function ground(w, g, x) { for (var y = 20; y < g.gh - 1; y++) if (g.m[(y + 1) * g.gw + x] !== w.MAT.EMPTY) return w.P_LEAF[g.m[(y + 1) * g.gw + x]] ? -1 : y; return -1; }
  var FLAT = 232;   /* (seed 6: open sand, flat for twenty columns, nobody's) */
  /* somebody stood still at column x, on the ground, with nothing to do */
  function stand(C, p, x) {
    var y = ground(C.w, C.g, x);
    p.x = x + 0.5; p.y = y; p.state = "walk"; p.task = null; p.vx = p.vy = 0; p.falling = false; p.fallY = y; p.sleep = 0;
    return y;
  }

  test("hand: a valley never touched by the hand makes no g.hand, and seed 3 thinks as master does", function () {
    var h = H.open({ seed: 3 }), g = h.g, seq = [], seen = {}, t, k;
    for (t = 0; t < 12000; t++) { h.step(1); for (k in g.know) if (!seen[k]) { seen[k] = 1; seq.push(k + "@" + g.tick); } }
    check(!("hand" in g), "a valley nobody lifted anything in has a g.hand");
    check(seq.join(" ") === "farm@1320 fish@4116 scarecrow@6740 forest@9718 dig@11616" && h.hash() === "03cf4e61", "seed 3 thought otherwise than master: " + seq.join(" ") + " " + h.hash());
  });

  test("hand: HAND is in MORE under THE HAND, after TRESTLE, with its icon, and the flyout fits", function () {
    var h = H.open({ seed: 5 }), w = h.game, g = h.g, P = h.pick, k = P.length - 1;
    check(P[k].name === "HAND" && P[k - 1].name === "TRESTLE" && P[k].tool === "hand" && P[k].more === "hand" && P[k].key === "Y" && P[k].desc, "HAND is not last, after TRESTLE, a tool in MORE: " + JSON.stringify(P[k]));
    check(w.ICONS.hand && w.ICONS.handShut, "no palm for the picker, or for the cursor");
    var G = w.MORE_GROUPS[w.MORE_GROUPS.length - 1];
    check(G[0] === "hand" && G[1] === "THE HAND", "the last of MORE's groups is " + JSON.stringify(G));
    var R = w.MORE_ROWS, last = R[R.length - 1], head = R[R.length - 2];
    check(head.head === "THE HAND" && last.k === k, "the flyout does not end with THE HAND and its one row: " + JSON.stringify(R.slice(-3)));
    check(w.MORE_H === 152 && w.MORE_TOP > h.PLAY_Y, "the flyout is " + w.MORE_H + " tall, its top at " + w.MORE_TOP);
    h.key("y");
    check(P[g.sel].name === "HAND", "Y picked " + P[g.sel].name);
    check(!w.painting(g), "HAND paints");
    /* (its line in the bar says a flick throws, and is short enough to be read whole beside what is under the cursor:
       in the browser, beside "AIR 20°", the bar shows about 111 characters of a brush's line before it cuts it short) */
    var line = "HAND  " + P[k].desc;
    check(line.length <= 104 && /flick/.test(P[k].desc), "HAND's line is " + line.length + " long: " + line);
    /* (and its key is on its row in the flyout, as the panel's rows have theirs: the only key there) */
    g.moreOpen = 1;
    var c = h.eval("cv.getContext('2d')"), drawn = [], ry = w.MORE_TOP + last.y;
    c.fillText = function (s, x, y) { drawn.push([String(s), x, y]); };
    h.fn("drawMore")(g, c);
    var keys = drawn.filter(function (q) { return q[0].length === 1; });
    check(keys.length === 1 && keys[0][0] === "Y" && keys[0][2] === ry + 7.5, "the flyout drew the keys " + JSON.stringify(keys) + " (HAND's row at " + ry + ")");
    g.moreOpen = 0;
  });

  test("hand: lifted, held 300 ticks and set down, the heat in the room and the hand together is what it was; and lava held 600 ticks over a pond leaves the pond as it was", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, M = C.M;
    /* (with no time passing, to the last digit) */
    h.pause(true);
    var q0 = heatAll(h);
    lift(h, C.cx, C.cy + 1, 10);
    for (var i = 0; i < 20; i++) { at(h, C.cx - i, C.cy + 1 - i); h.step(1); }
    check(Math.abs(heatAll(h) - q0) < 1e-6 * Math.abs(q0) + 1e-3, "held, with time stopped, the heat went from " + q0 + " to " + heatAll(h));
    h.up();
    check(g.hand.fly, "(it is in the air)");
    check(Math.abs(heatAll(h) - q0) < 1e-6 * Math.abs(q0) + 1e-3, "let go, the heat went from " + q0 + " to " + heatAll(h));
    h.pause(false);
    /* (and with time going: held 300 ticks, carried about, and set down. the valley's own heat goes round, and none of
       it is made or lost: so the room and the hand together hold what they did) */
    var D = housed(), hd = D.h, qd = heatAll(hd);
    lift(hd, D.cx, D.cy + 1, 10);
    for (i = 0; i < 300; i++) { if (i % 30 === 0) at(hd, D.cx + (i / 30) - 5, D.cy - 12); hd.step(1); }
    check(Math.abs(heatAll(hd) - qd) < 1e-6 * Math.abs(qd) + 1e-2, "held 300 ticks, the heat went from " + qd + " to " + heatAll(hd));
    carry(hd, D.cx, D.cy - 2);
    check(down(hd), "it never came down");
    check(Math.abs(heatAll(hd) - qd) < 1e-6 * Math.abs(qd) + 1e-2, "set down, the heat went from " + qd + " to " + heatAll(hd));
    /* lava, in the hand, over the pond: none of its heat gets to the water */
    var L = housed(), lh = L.h, lg = L.g, lw = L.w, px = 106, top = 120;
    for (var j = 0; j < lg.m.length; j++) if (LIQ(lg, lw, j) && (j % lg.gw) === px) { top = (j / lg.gw) | 0; break; }
    lw.sandDab(lg, px, 40, M.LAVA, true);
    lift(lh, px, 40, 5);
    var lumpT = lg.hand.held.c.length / 6;
    check(lumpT > 50, "(the test wants a lump of lava: " + lumpT + " cells)");
    at(lh, px, top - 8); lh.step(1);
    var pond0 = pond(lg, lw);
    for (i = 0; i < 600; i++) { at(lh, px + ((i >> 4) & 1), top - 8); lh.step(1); }
    var pond1 = pond(lg, lw), Hd = lg.hand.held, hot = 0;
    for (var k = 0; k < Hd.c.length; k += 6) hot = Math.max(hot, 20 + (Hd.c[k + 5] - lw.heatH0(Hd.c[k + 2], Hd.c[k + 3], Hd.c[k + 4])) * lw.HEAT_IC[Hd.c[k + 2]]);
    check(pond1.n === pond0.n && Math.abs(pond1.q - pond0.q) < 1e-3 * Math.abs(pond0.q) + 1, "the pond under the lava changed: " + JSON.stringify([pond0, pond1]));
    check(hot > 1100, "the lava in the hand cooled to " + hot);
    function LIQ(g, w, j) { return w.LIQUID[g.m[j]] === 1; }
    function pond(g, w) { var n = 0, q = 0; for (var j = 0; j < g.m.length; j++) if (g.m[j] === M.WATER || g.m[j] === M.SALTWATER) { n++; q += w.heatQ(g, j); } return { n: n, q: q }; }
  });

  test("hand: from 3 rows a house is set down whole; from 40, a heap; into a pond it sinks, and every drop of the pond is still there, each in a cell of its own, with its heat", function () {
    var C = housed(), h = C.h, g = C.g;
    lift(h, C.cx, C.cy + 1, 10);
    check(g.hand.held.c.length / 6 > 100 && inPlace(C, 0, 0)[0] === 0, "(the test wants the whole house in the hand)");
    carry(h, C.cx, C.cy - 2);
    var c0 = counts(h), q0 = heatAll(h);
    check(down(h), "it never came down");
    var ip = inPlace(C, 0, 0);
    check(ip[0] === ip[1], "set down from 3 rows, " + ip[0] + " of " + ip[1] + " of the house is in place");
    check(counts(h) === c0, "set down, something was made or lost: " + c0 + " / " + counts(h));
    check(Math.abs(heatAll(h) - q0) < 1e-6 * Math.abs(q0) + 1e-3, "set down, the heat went from " + q0 + " to " + heatAll(h));
    /* and set down on open ground, well along: the same house, there */
    var B = housed(), hb = B.h, gb = B.g;
    lift(hb, B.cx, B.cy + 1, 10);
    var gy = ground(B.w, gb, FLAT), bot = 0;
    gb.hand.held.c.forEach(function (v, k) { if (k % 6 === 1) bot = Math.max(bot, v); });
    carry(hb, FLAT, gy - bot - 2);
    hb.up();
    var fb = gb.hand.fly;
    for (var t0 = 0; t0 < 600 && gb.hand.fly; t0++) hb.step(1);
    /* (and it is that house there now: its plan went with it. phase 3) */
    ip = inPlace(B, 0, 0);
    check(!gb.hand.fly && ip[0] === ip[1] && B.s.x0 === B.box[0] + fb.x - B.cx, "set down on open ground, " + ip[0] + " of " + ip[1] + " of the house is in place there, and its plan is at " + B.s.x0);
    /* from forty: a heap of what it was */
    /* (with nobody about to chop, dig or tidy, so that what is there is only what the drop left) */
    var D = housed(), hd = D.h, gd = D.g;
    lift(hd, D.cx, D.cy + 1, 10);
    gd.peasants.length = 0; gd.ducks.length = 0;
    carry(hd, D.cx, D.cy - 39);
    var mats = {}; gd.hand.held.c.forEach(function (v, k) { if (k % 6 === 2) mats[v] = 1; });
    c0 = JSON.parse(counts(hd)); q0 = heatAll(hd);
    hd.up();
    for (var t = 0; t < 600 && (gd.hand.fly || gd.np); t++) hd.step(1);
    ip = inPlace(D, 0, 0);
    check(!gd.hand.fly && ip[0] < ip[1] * 0.3, "dropped from 40 rows, " + ip[0] + " of " + ip[1] + " of the house is in place");
    var c1 = JSON.parse(counts(hd)), q1 = heatAll(hd), lost = 0;
    /* (none of it: a grain of the hand's that comes down with no air left about it is put down in its column, not
       dropped as a bang's is. world.js partHand) */
    Object.keys(mats).forEach(function (v) { check(c1[v] <= c0[v], "dropped, there is more " + v + " than there was"); lost += c0[v] - c1[v]; });
    check(lost === 0, "dropped, " + lost + " cells of it were lost: " + JSON.stringify(c0) + " / " + JSON.stringify(c1));
    check(Math.abs(q1 - q0) < 1e-6 * Math.abs(q0) + 1, "dropped, the heat went from " + q0 + " to " + q1);
    /* into the pond, from just over it */
    var P = housed(), hp = P.h, gp = P.g, w = P.w, M = P.M, px = 106, top = -1, y;
    for (y = 60; y < gp.gh; y++) if (w.LIQUID[gp.m[y * gp.gw + px]]) { top = y; break; }
    check(top > 0, "(the test wants the pond at " + px + ")");
    function liq() { var n = 0, q = 0; for (var j = 0; j < gp.m.length; j++) if (w.LIQUID[gp.m[j]]) { n++; q += w.heatQ(gp, j); } return [n, q]; }
    lift(hp, P.cx, P.cy + 1, 10);
    var Hd = gp.hand.held, bottom = 0;
    for (var k = 0; k < Hd.c.length; k += 6) bottom = Math.max(bottom, Hd.c[k + 1]);
    carry(hp, px, top - 3 - bottom);
    var l0 = liq(), y0 = Hd.y;
    hp.up();
    var f = gp.hand.fly;
    for (t = 0; t < 600 && gp.hand.fly; t++) hp.step(1);
    var l1 = liq();
    check(!gp.hand.fly && f.y > y0 + 3, "it did not sink into the pond: let go at " + y0 + ", down at " + f.y);
    check(l1[0] === l0[0] && Math.abs(l1[1] - l0[1]) < 1e-6 * Math.abs(l0[1]) + 1e-3, "the pond was " + l0 + ", and is " + l1);
  });

  test("hand: a peasant on a lifted hill sits while carried and is set down standing; dropped from 40 rows they get up dizzy (pFly's oof, not pLand's); a duck in a lifted pond comes too", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, p = g.peasants[3], x = FLAT;
    var y = stand(C, p, x);
    lift(h, x, y + 3, 5);
    check(p.state === "held" && p.ride, "standing on the lifted ground, " + p.name + " is " + p.state);
    check(w.pMood(g, p) === "is sitting on a lump of the valley, being carried", "carried, " + p.name + " " + w.pMood(g, p));
    carry(h, x + 30, y - 10);
    check(Math.abs(p.x - (x + 30.5)) < 0.01 && Math.abs(p.y - (y - 13)) < 0.01, "carried, " + p.name + " is at " + p.x + "," + p.y);
    var held = g.hand.held, gy = ground(w, g, x + 30), lowest = 0;
    for (var k = 0; k < held.c.length; k += 6) lowest = Math.max(lowest, held.c[k + 1]);
    carry(h, x + 30, gy - lowest - 2);
    check(down(h), "it never came down");
    check(p.state === "walk" && !p.ride && w.P_SAY.touchdown.indexOf(p.say) >= 0 && !p.stun, p.name + " set down " + p.state + ", saying " + p.say);
    /* from forty: thrown off it, as anybody thrown */
    var D = housed(), hd = D.h, gd = D.g, q = gd.peasants[3];
    y = stand(D, q, x);
    lift(hd, x, y + 3, 5);
    carry(hd, x, y + 3 - 40);
    hd.up();
    var flew = false, oof = false, landed = false;
    for (var t = 0; t < 400; t++) {
      hd.step(1);
      if (q.state === "fly") { flew = true; if (q.say === "oof" || D.w.P_SAY.oof.indexOf(q.say) >= 0) oof = true; }
      if (flew && q.state === "walk") { landed = true; break; }
    }
    check(flew && landed && !q.dead, q.name + " flew " + flew + ", landed " + landed + ", dead " + q.dead);
    check(oof && q.stun === 60, q.name + " landed without pFly's oof: said " + q.say + ", stun " + q.stun);
    check(q.feel === -2 && gd.hand.cruel === 1 && p.feel === 1, "dropped, " + q.name + " thinks " + q.feel + " of it (cruel " + gd.hand.cruel + "); set down, " + p.name + " " + p.feel);
    /* a duck on the pond */
    var E = housed(), he = E.h, ge = E.g, d = ge.ducks.filter(function (u) { return u.state === "swim" || u.state === "walk"; })[0];
    check(d, "(the test wants a duck about)");
    var dx = Math.floor(d.x), dy = Math.floor(d.y);
    lift(he, dx, dy + 2, 4);
    check(d.state === "held" && d.ride, "the duck on the lifted ground is " + d.state);
    carry(he, dx, dy - 6);
    check(Math.abs(d.y - (dy - 8 + (d.ride.dy + 2 - (d.y - (dy - 6))))) < 50, "(duck carried)");
    check(down(he), "it never came down");
    check((d.state === "walk" || d.state === "swim") && !d.ride, "the duck set down is " + d.state);
  });

  test("hand: a house held 1,000 ticks is still a house: done, its owner's home, not a ruin, not being mended", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s, p = C.p;
    lift(h, C.cx, C.cy + 1, 10);
    check(s.handH, "the house in the hand is not on hold");
    for (var t = 0; t < 1000; t++) { if (t % 50 === 0) at(h, C.cx + ((t / 50) & 1), C.cy - 20); h.step(1); }
    check(w.bSite(g, s.id) === s && s.done && !s.repair && s.owner === p.id && w.bHome(g, p) === s, "held a while, the house is " + JSON.stringify({ site: !!w.bSite(g, s.id), done: s.done, repair: s.repair, owner: s.owner }));
    carry(h, C.cx, C.cy - 2);
    check(down(h), "it never came down");
    /* (put back just where it was, all of it: off hold, and not a house that flew. phase 3) */
    check(!s.handH && s.handT == null, "set down, it is not off hold: " + s.handH + ", " + s.handT);
    for (t = 0; t < 300; t++) h.step(1);
    check(w.bSite(g, s.id) === s && s.done && !s.repair, "set down where it was, the house was opened for repairs, or given up");
  });

  test("hand: a cloner that is copying Gary, lifted and set down 50 columns over, still makes Garys", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, M = C.M, p = g.peasants[2], x = FLAT - 10, y = ground(w, g, x) + 1, i = y * g.gw + x;
    w.sandPlace(g, i, M.CLONER); g.aux[i] = w.CLONE_PEASANT; g.cloneSrc[i] = w.pRecipe(p);
    lift(h, x, y + 2, 3);
    check(!g.cloneSrc[i] && g.hand.held.clone.length === 1, "the cloner's copy did not come up with it");
    carry(h, x - 50, y - 3);
    check(down(h), "it never came down");
    var j = -1;
    for (var k = 0; k < g.m.length; k++) if (g.m[k] === M.CLONER) j = k;
    check(j >= 0 && (j % g.gw) === x - 50 && g.aux[j] === w.CLONE_PEASANT && g.cloneSrc[j] && g.cloneSrc[j].short === p.short, "the cloner set down forgot who it was copying: " + JSON.stringify([j % g.gw, g.aux[j], g.cloneSrc[j] && g.cloneSrc[j].short]));
    var n = g.peasants.length;
    for (var t = 0; t < 6000 && g.peasants.length === n; t++) h.step(1);
    var c = g.peasants[g.peasants.length - 1];
    check(g.peasants.length > n && c.short === p.short, "no copy of " + p.short + " came out of it in 6000 ticks");
  });

  test("hand: saved while holding a house with somebody in it, loaded twice (once paused): let go on load, the same hash 600 ticks later; saved in flight, it flies on", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, p = C.p, s = C.s;
    /* (the owner at home, standing on the floor) */
    p.x = C.cx + 0.5; p.y = s.F - 1; p.state = "walk"; p.task = null; p.sleep = 0;
    lift(h, C.cx, C.cy + 1, 10);
    check(p.state === "held" && p.ride, "(the owner did not come up with the house)");
    carry(h, C.cx - 2, C.cy - 30);
    var doc = JSON.parse(JSON.stringify(h.saveDoc()));
    var a = H.open({ seed: 11 }); a.load(doc);
    check(!a.g.hand.held && a.g.hand.fly && !a.g.down, "loaded mid-hold, it is not let go: held " + !!a.g.hand.held + ", in the air " + !!a.g.hand.fly);
    var ap = a.g.peasants.filter(function (q) { return q.id === p.id; })[0];
    check(ap.state === "held" && ap.ride, "loaded, the owner is " + ap.state + " and not on it");
    var pdoc = JSON.parse(JSON.stringify(doc)); pdoc.state.paused = 1;
    var b = H.open({ seed: 12 }); b.load(pdoc);
    check(b.g.paused && !b.g.hand.held && b.g.hand.fly, "loaded paused, it is not let go");
    /* (and with time stopped, it stays where it was let go) */
    var b2 = H.open({ seed: 12 }); b2.load(pdoc);
    var fy = b2.g.hand.fly.y;
    b2.step(30);
    check(b2.g.hand.fly && b2.g.hand.fly.y === fy && ap.state === "held", "paused, the lump fell");
    b.g.paused = 0;
    a.step(600); b.step(600);
    check(a.hash() === b.hash() && !a.g.hand.fly, "loaded and let go, then 600 ticks: " + a.hash() + ", loaded paused: " + b.hash());
    /* in the air */
    h.up(); h.step(3);
    check(g.hand.fly, "(it came down already)");
    var fdoc = h.saveDoc(), c = H.open({ seed: 13 }); c.load(fdoc);
    check(c.g.hand.fly && c.g.hand.fly.y === g.hand.fly.y, "saved in the air, it was loaded somewhere else, or not in the air");
    h.step(400); c.step(400);
    check(h.hash() === c.hash(), "saved in the air and played on: " + c.hash() + ", the one that was saved: " + h.hash());
    /* and a save from before the hand */
    var old = H.open({ seed: 1 }); old.load(path.join(__dirname, "fixtures", "valley-272.json"));
    check(!("hand" in old.g), "an old save has a hand");
    old.step(60);
    check(!("hand" in old.g), "an old save grew a hand");
    void w;
  });

  test("hand: CLEAR while holding keeps the lump; CLEAR in flight drops it, and its rider is walking 300 ticks later, not held; a PEASANT grab of a rider in flight is an ordinary grab", function () {
    var C = housed(), h = C.h, g = C.g, p = g.peasants[3], x = FLAT, y = stand(C, p, x);
    lift(h, x, y + 3, 5);
    var n = g.hand.held.c.length;
    h.key("c");
    check(g.hand.held && g.hand.held.c.length === n && p.state === "held" && p.ride, "CLEAR took the lump out of the hand, or its rider off it");
    h.step(5);
    h.up(); h.step(1);
    check(g.hand.fly, "(it came down already)");
    h.key("c");
    check(!g.hand.fly && !p.ride && p.state === "fly", "CLEAR in flight left the lump, or its rider on it: " + p.state);
    for (var t = 0; t < 300; t++) h.step(1);
    check(p.state === "walk" && !p.ride && !p.dead, p.name + " is " + p.state + (p.dead ? ", dead" : ""));
    /* grabbed off it in the air */
    var D = housed(), hd = D.h, gd = D.g, q = gd.peasants[3];
    y = stand(D, q, x);
    lift(hd, x, y + 3, 5);
    carry(hd, x, y - 30);
    hd.up(); hd.step(2);
    check(gd.hand.fly && q.state === "held" && q.ride, "(the rider is not on it in the air)");
    hd.select("PEASANT"); hd.mouse(q.x, q.y - 4); hd.down(0);
    check(gd.held === q && !q.ride, "grabbed in the air, " + q.name + " is still on the lump");
    for (t = 0; t < 120 && gd.hand.fly; t++) { hd.mouse(x + 20, 60); hd.step(1); }
    check(!gd.hand.fly && gd.held === q && q.state === "held", "the lump came down and took " + q.name + " out of the other hand: " + q.state);
    hd.up();
    check(q.state === "fly" && !gd.held, "let go, " + q.name + " is " + q.state);
  });

  test("hand: carried with time stopped, the lump follows the cursor, nothing falls, and the dice are where they were", function () {
    var C = housed(), h = C.h, g = C.g, p = g.peasants[3], x = FLAT, y = stand(C, p, x);
    h.pause(true);
    lift(h, x, y + 3, 6);
    var m0 = Array.prototype.slice.call(g.m), r0 = h.rng(), np = g.np;
    for (var i = 1; i <= 40; i++) { at(h, x - i, y - (i >> 1)); h.step(1); }
    var Hd = g.hand.held;
    check(Hd.x === x - 40 && Hd.y === y - 20, "with time stopped, the lump is at " + Hd.x + "," + Hd.y);
    check(Math.abs(p.x - (x - 39.5)) < 0.01 && p.state === "held", "with time stopped, the rider is at " + p.x + " and " + p.state);
    var moved = 0;
    for (var j = 0; j < m0.length; j++) if (g.m[j] !== m0[j]) moved++;
    check(!moved && g.np === np, moved + " cells moved, " + (g.np - np) + " grains, with time stopped");
    check(h.rng() === r0, "carried with time stopped, the dice were rolled");
  });

  test("hand: carried into the edge of the view in a wide valley, the view comes along", function () {
    var h = H.open({ seed: 3, gw: 1088 }), g = h.g;
    h.step(1);
    var x = (g.camI || 0) + 200, y = 60;
    h.game.sandDab(g, x, y, h.game.MAT.SAND, true);
    lift(h, x, y, 4);
    check(g.hand.held.c.length > 20, "(the test wants something in the hand)");
    var cam = g.camX;
    g.mx = h._eval("VW") - 3; g.my = h.PLAY_Y + 60;
    h.step(90);
    check(g.camX > cam + 10, "carried into the right edge, the view went from " + cam + " to " + g.camX);
    check(g.hand.held.x > x + 20, "and the lump did not come with it: " + g.hand.held.x);
    h.up();
    var c2 = g.camX;
    h.step(60);
    check(g.camX === c2, "let go at the edge, the view went on: " + c2 + " to " + g.camX);
  });

  test("hand: the arrows and the wheel come to HAND after TRESTLE, and a scenario recorded before HAND replays to the brushes it did", function () {
    var h = H.open({ seed: 5 }), g = h.g;
    h.select("TRESTLE"); h.key("arrowdown");
    check(h.pick[g.sel].name === "HAND", "down from TRESTLE is " + h.pick[g.sel].name);
    h.select("PEASANT"); h.key("arrowup");
    check(h.pick[g.sel].name === "HAND", "up from PEASANT is " + h.pick[g.sel].name);
    /* (recorded with the list before HAND, by place, from before the arrows kept their brush's name) */
    var picks = h.pick.map(function (q) { return q.name; }).filter(function (n) { return n !== "HAND"; });
    check(picks.length === 42, "(the list before HAND has 42: " + picks.length + ")");
    var sc = { version: 2, seed: 5, gw: 272, ticks: 2, picks: picks, ops: [{ at: 0, op: "select", args: { sel: "TRESTLE" } }, { at: 1, op: "key", args: { k: "arrowdown" } }] };
    var r = H.open({ seed: 5 }); r.replay(sc);
    check(r.pick[r.g.sel].name === "PEASANT", "a scenario from before HAND replayed down from TRESTLE to " + r.pick[r.g.sel].name);
    var n = H.open({ seed: 5 }); n.select("TRESTLE"); n.step(1); n.key("arrowdown"); n.step(1);
    var sc2 = n.scenario(), r2 = H.open({ seed: 5 }); r2.replay(sc2);
    check(r2.pick[r2.g.sel].name === "HAND", "one recorded now replayed to " + r2.pick[r2.g.sel].name);
  });

  test("hand: a deck held 1,000 ticks is left alone by plStep (no rung put on wait, no house planned on it), and a storey over a held house is still a storey", function () {
    /* (a finished deck, its ladder up, and no house on it: platforms.js would plan one) */
    function deck(lifted) {
      var w = sim.load(1), g = w.g, p = g.peasants[0];
      know(g, ["farm", "masonry", "storey", "deck"]);
      p.logs = 20; p.home = 0;
      g.sites.forEach(function (s) { if (s.owner === p.id) s.owner = 0; });
      var r = w.plFind(g, Math.floor(p.x));
      check(r, "(the test wants somewhere for a deck)");
      var s = w.plCommit(g, p, r);
      sim.build(w, s); w.bFinish(g, s, p);
      var hs = w.bSite(g, s.house);
      if (hs) w.bRemove(g, g.sites.indexOf(hs));
      s.house = 0;
      g.peasants.forEach(function (o) { if (o.task && o.task.kind === "build") o.task = null; });
      if (lifted) {
        g.size = 6; g.cx = (s.x0 + s.x1) / 2; g.cy = s.y0 + 2;
        w.handLift(g);
        check(s.handH, "(the deck in the hand is not on hold)");
      }
      var offs = 0;
      for (var t = 0; t < 1300; t++) {
        sim.step(w, 1);
        s.plan.forEach(function (e) { if (e.off > g.tick) offs++; });
      }
      return { deck: s, houses: g.sites.filter(function (q) { return q.kind === "house" && q.deck === s.id; }).length, offs: offs };
    }
    var plain = deck(false), held = deck(true);
    check(plain.houses === 1, "(left alone, the deck had " + plain.houses + " houses planned on it)");
    check(held.houses === 0 && held.offs === 0, "held, the deck had " + held.houses + " houses planned on it, and " + held.offs + " rungs put on wait");
    /* a flat on a house, the house in the hand */
    var w = sim.load(1), g = w.g, p = g.peasants[0], q = g.peasants[1];
    p.logs = 20;
    check(w.bPlanHouse(g, p), "(the test wants a house)");
    var hs = sites(g, "house").filter(function (s) { return !s.hut && s.owner === p.id; })[0];
    sim.build(w, hs); w.bFinish(g, hs, p);
    know(g, ["farm", "masonry", "storey"]);
    q.home = 0; q.logs = 20; q.planCD = 0;
    g.sites.forEach(function (s) { if (s.owner === q.id) s.owner = 0; });
    g.noPlotT = g.tick;
    check(w.sTry(g, q), "(no storey was planned)");
    var st = sites(g, "storey")[0];
    sim.build(w, st); w.bFinish(g, st, q);
    g.peasants.forEach(function (o) { if (o.task && o.task.kind === "build") o.task = null; });
    g.size = 8; g.cx = hs.x0 + 5; g.cy = hs.F - 6;
    w.handLift(g);
    check(hs.handH, "(the house in the hand is not on hold)");
    for (var t = 0; t < 1000; t++) sim.step(w, 1);
    check(w.bSite(g, st.id) === st && w.bSite(g, hs.id) === hs, "held, the house or the storey over it went: " + !!w.bSite(g, hs.id) + " " + !!w.bSite(g, st.id));
  });

  /* ---- phase 2: the careless hand ---- */
  /* a disc of v, radius r, painted at (x, y), and lifted: a pebble in the hand */
  function pebble(h, x, y, v, r) { h.g.size = r; h.game.sandDab(h.g, x, y, v, true); return lift(h, x, y, r); }
  /* let go with a flick, and play until it is down (or max ticks): what it did each tick, [x, y, vx, vy] */
  function flick(h, vx, vy, max) {
    var g = h.g, path = [];
    h.flick(vx, vy); h.up();
    for (var t = 0; t < (max || 600) && g.hand.fly; t++) { var f = g.hand.fly; path.push([f.x, f.y, f.vx, f.vy]); h.step(1); }
    return path;
  }
  /* play until every grain in the air is down */
  function settle(h, max) { for (var t = 0; t < (max || 600) && (h.g.hand.fly || h.g.np); t++) h.step(1); }

  test("hand: a house let go moving at walking pace (flick 1.5, 0.8) eight rows up lands whole, a few columns on", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w;
    lift(h, C.cx, C.cy + 1, 10);
    var bot = 0, X = FLAT - 2;
    g.hand.held.c.forEach(function (v, k) { if (k % 6 === 1) bot = Math.max(bot, v); });
    carry(h, X, ground(w, g, X) - bot - 8);
    var n = g.hand.held.c.length / 6;
    h.flick(1.5, 0.8); h.up();
    var f = g.hand.fly, k = Math.sqrt(60 / n);
    check(f && Math.abs(f.vx - 1.5 * k) < 1e-9 && Math.abs(f.vy - 0.8 * k) < 1e-9, "a lump of " + n + " let go at (1.5, 0.8) is going (" + (f && f.vx) + ", " + (f && f.vy) + "), not its share " + k);
    for (var t = 0; t < 600 && g.hand.fly; t++) h.step(1);
    var ip = inPlace(C, 0, 0);   /* (its plan went with it: phase 3) */
    check(!g.hand.fly && f.x - X > 0 && f.x - X <= 12, "let go moving, it came down " + (f.x - X) + " columns on");
    check(ip[0] === ip[1], "let go moving, " + ip[0] + " of " + ip[1] + " of the house is in place where it came down");
  });

  test("hand: a pebble of stone flicked at a gable knocks the window in, and the house is mended after; a pebble of sand at the same window does not", function () {
    function throwAt(v) {
      var C = housed(), h = C.h, g = C.g, s = C.s, x = s.x0 - 25, y = s.F - 18;
      pebble(h, x, y, v, 3);
      flick(h, 4, 0.5, 60);
      var win = s.win.map(function (j) { return g.m[j] === C.M.PLANK && g.aux[j] === 1; });
      var repair = false, mended = false;
      for (var t = 0; t < 3000 && !mended; t++) { h.step(1); if (s.repair) repair = true; else if (repair && s.done) mended = true; }
      return { C: C, win: win, repair: repair, mended: mended };
    }
    var a = throwAt(throwAt.M = H.open({ seed: 6 }).game.MAT.STONE);
    check(!a.win[0] && !a.win[1], "a stone at the gable left the window " + JSON.stringify(a.win));
    check(a.repair && a.mended, "the window knocked in, the house was opened for repairs " + a.repair + ", and mended " + a.mended);
    var g = a.C.g;
    check(a.C.s.win.every(function (j) { return g.m[j] === a.C.M.PLANK && g.aux[j] === 1; }) && w0(a.C), "mended, the window is not a window again");
    var b = throwAt(a.C.M.SAND);
    check(b.win[0] && b.win[1] && !b.repair, "a pebble of sand broke the window: " + JSON.stringify(b.win) + ", repair " + b.repair);
    function w0(C) { return C.w.bSite(C.g, C.s.id) === C.s; }
  });

  test("hand: a stone lump flicked into a glass wall leaves sand where it hit; a lump of glass dropped 40 rows is sand", function () {
    var h = H.open({ seed: 6 }), w = h.game, g = h.g, M = w.MAT, x, y, gy = ground(w, g, FLAT);
    g.peasants.length = 0; g.ducks.length = 0;
    /* (a pane, three thick and thirty high, on the flat) */
    for (y = gy - 30; y <= gy; y++) for (x = FLAT + 6; x <= FLAT + 8; x++) w.sandPlace(g, y * g.gw + x, M.GLASS);
    pebble(h, FLAT - 16, gy - 16, M.STONE, 3);
    var path = flick(h, 4.5, 0, 60), sand = 0, glass = 0;
    for (y = gy - 30; y <= gy; y++) for (x = FLAT + 6; x <= FLAT + 8; x++) { if (g.m[y * g.gw + x] === M.SAND) sand++; if (g.m[y * g.gw + x] === M.GLASS) glass++; }
    check(!g.hand.fly && path.length < 20, "(the stone never got to the glass)");
    check(sand >= 3 && glass < 93, "a stone into a glass wall left " + sand + " sand in it, and " + glass + " of 93 glass");
    settle(h);
    /* a pebble of glass from forty rows: sand, all of it */
    var D = H.open({ seed: 6 }), wd = D.game, gd = D.g, gyd = ground(wd, gd, FLAT);
    gd.peasants.length = 0; gd.ducks.length = 0;
    var c0 = JSON.parse(counts(D));
    pebble(D, FLAT, gyd - 45, M.GLASS, 4);
    var n = gd.hand.held.c.length / 6;
    D.flick(0, 0); D.up();
    settle(D);
    var c1 = JSON.parse(counts(D));
    check((c1[M.GLASS] || 0) === (c0[M.GLASS] || 0), "dropped forty rows, " + ((c1[M.GLASS] || 0) - (c0[M.GLASS] || 0)) + " of the glass is still glass");
    check((c1[M.SAND] || 0) - (c0[M.SAND] || 0) >= n - 2, "dropped forty rows, a lump of " + n + " glass made " + ((c1[M.SAND] || 0) - (c0[M.SAND] || 0)) + " sand");
  });

  test("hand: a lump flicked at a peasant knocks them flat (fly, immune 6); a lump of pond flicked at a burning one puts them out", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, M = C.M, p = g.peasants[3], x = FLAT, y = stand(C, p, x);
    pebble(h, x - 14, y - 6, M.SOIL, 3);
    var knocked = null;
    h.flick(4, 0); h.up();
    for (var t = 0; t < 30 && !knocked; t++) { h.step(1); if (p.state === "fly") knocked = { immune: p.immune, vx: p.vx, say: p.say, fly: !!g.hand.fly }; }
    check(knocked && knocked.immune >= 5 && knocked.vx > 0, "a lump flicked at " + p.name + " did not knock them over: " + JSON.stringify(knocked));
    check(knocked && (knocked.say === "oof" || w.P_SAY.oof.indexOf(knocked.say) >= 0), p.name + " knocked over said " + (knocked && knocked.say));
    /* a lump of the pond, at somebody on fire */
    var D = housed(), hd = D.h, gd = D.g, q = gd.peasants[3], px = 106, top = -1;
    for (y = 60; y < gd.gh; y++) if (w.LIQUID[gd.m[y * gd.gw + px]]) { top = y; break; }
    hd.pause(true);
    lift(hd, px, top + 3, 3);
    var wet = 0; gd.hand.held.c.forEach(function (v, k) { if (k % 6 === 2 && D.w.WET[v]) wet++; });
    check(wet > 20, "(the test wants a lump of the pond: " + wet + " wet cells)");
    y = stand(D, q, x);
    D.w.pIgnite(gd, q);
    check(q.fire, "(the test wants " + q.name + " on fire)");
    carry(hd, x - 12, y - 6);
    hd.pause(false);
    hd.flick(4, 0); hd.up();
    var out = false;
    for (t = 0; t < 30 && !out; t++) { hd.step(1); if (q.state === "fly" && !q.fire) out = true; }
    check(out && !q.dead, "a lump of the pond at " + q.name + ", on fire: knocked " + q.state + ", fire " + q.fire);
  });

  test("hand: thrown into the sky it comes back down; thrown at the valley's edge, nothing goes over it", function () {
    [272, 1088].forEach(function (gw) {
      var h = H.open({ seed: 6, gw: gw }), g = h.g, M = h.game.MAT;
      g.peasants.length = 0; g.ducks.length = 0;
      /* (every tick, before it is stepped: is any grain in the air about to go over either side) */
      function over() { for (var q = 0; q < g.np; q++) { var x = g.ppx[q] + g.pvx[q] * 0.995; if (g.pk[q] === h.game.PK_DEBRIS && (x < 0 || x >= g.gw)) return true; } return false; }
      /* (and what came down, against what went up: all of it. a grain of the hand's with no air left about it, or going
         out at the floor or a side, is put down in its column, world.js partHand. a bang's is lost there, as it was;
         before the hand's grains were marked, a handful of a lump coming down all at once at the edge was too) */
      function lost(c0, c1) { var a = JSON.parse(c0), b = JSON.parse(c1), n = 0; for (var k in a) { if ((b[k] || 0) > a[k]) return 1e9; n += a[k] - (b[k] || 0); } return n; }
      function go(x, y, vx, vy) {
        pebble(h, x, y, M.STONE, 4);
        var c0 = counts(h), top = 1e9, off = false;
        h.flick(vx, vy); h.up();
        for (var t = 0; t < 900 && (g.hand.fly || g.np); t++) { if (g.hand.fly) top = Math.min(top, g.hand.fly.y); if (over()) off = true; h.step(1); }
        return { top: top, off: off, lost: lost(c0, counts(h)), down: !g.hand.fly && !g.np };
      }
      var up = go(120, 50, 0.5, -4.5);
      check(up.down && up.top < 0 && !up.off && up.lost === 0, "at " + gw + " wide, thrown up it went to row " + up.top + ", came down " + up.down + ", and " + up.lost + " of it is lost" + (up.off ? ", over the edge" : ""));
      /* at the edge, either way, and coming down on the ground at it */
      [[gw - 30, 4.5, 0], [30, -4.5, 0], [gw - 60, 4.5, 3], [40, -4.5, 3]].forEach(function (a) {
        var r = go(a[0], 50, a[1], a[2]);
        check(r.down && !r.off && r.lost === 0, "at " + gw + " wide, thrown at the edge from " + a[0] + ": " + JSON.stringify(r));
      });
    });
  });

  test("hand: a handful of gunpowder flicked at the rock goes off once", function () {
    var h = H.open({ seed: 6 }), w = h.game, g = h.g, M = w.MAT, gy = ground(w, g, FLAT), x, y;
    g.peasants.length = 0; g.ducks.length = 0;
    for (y = gy - 20; y <= gy; y++) for (x = FLAT + 8; x <= FLAT + 12; x++) w.sandPlace(g, y * g.gw + x, M.STONE);
    pebble(h, FLAT - 14, gy - 12, M.GUNPOWDER, 3);
    var n = g.hand.held.c.length / 6;
    g.booms = [];
    h.flick(4.5, 0); h.up();
    for (var t = 0; t < 60 && g.hand.fly; t++) h.step(1);
    var at = g.tick;
    check(!g.hand.fly && n > 30, "(the powder never got there)");
    var then = g.booms.filter(function (b) { return b.t === at; }).length;
    check(then === 1, "a lump of " + n + " gunpowder at the rock went off " + then + " times as it hit");
  });

  test("hand: grains are master's: a sandbox with glass, a felled log and a bang plays out the same whether or not the hand has lifted a disc of empty sky first", function () {
    function box(sky) {
      var h = H.open({ seed: 9 }), w = h.game, g = h.g, M = w.MAT, x, y;
      h.key("c"); g.peasants.length = 0; g.ducks.length = 0;
      for (y = 150; y < g.gh; y++) for (x = 0; x < g.gw; x++) w.sandPlace(g, y * g.gw + x, M.STONE);
      for (y = 120; y < 150; y++) for (x = 100; x < 103; x++) w.sandPlace(g, y * g.gw + x, M.GLASS);
      for (x = 110; x < 140; x++) w.sandPlace(g, 149 * g.gw + x, M.WOOD);
      for (y = 140; y < 150; y++) for (x = 90; x < 99; x++) w.sandPlace(g, y * g.gw + x, M.GUNPOWDER);
      for (y = 60; y < 70; y++) for (x = 105; x < 135; x++) w.sandPlace(g, y * g.gw + x, M.SAND);
      if (sky) { lift(h, 200, 30, 8); check(g.hand.held && !g.hand.held.c.length, "(the sky had something in it)"); h.up(); }
      else { at(h, 200, 30); }
      w.sandBoom(g, 145 * g.gw + 94);
      h.step(1200);
      return h;
    }
    var a = box(false), b = box(true);
    check(b.g.hand && !b.g.hand.fly && !b.g.hand.held, "(the sky was not lifted)");
    /* (the world, that is: the hand itself, what it remembers, is in the hash too, and set aside for this) */
    var bh = b.g.hand; delete b.g.hand; var hb = b.hash(); b.g.hand = bh;
    check(a.hash() === hb, "the same sandbox, 1200 ticks on: " + a.hash() + " without the hand, " + hb + " with it");
  });

  test("hand: a lump coming down over the square: everybody under it is out from under it before it lands, and nobody is buried", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, M = C.M, x = FLAT + 2, gy = ground(w, g, x);
    var ps = [g.peasants[1], g.peasants[2], g.peasants[3]];
    ps.forEach(function (p, i) { stand(C, p, x - 4 + i * 4); });
    h.pause(true);
    pebble(h, x, gy - 60, M.SAND, 6);
    var b = [1e9, -1e9]; g.hand.held.c.forEach(function (v, k) { if (k % 6 === 0) { b[0] = Math.min(b[0], v); b[1] = Math.max(b[1], v); } });
    var lowest = 0; g.hand.held.c.forEach(function (v, k) { if (k % 6 === 1) lowest = Math.max(lowest, v); });
    at(h, x, gy - 9 - 40 - lowest); h.step(1);
    check(b[1] - b[0] >= 11, "(the test wants a lump twelve wide: " + (b[1] - b[0] + 1) + ")");
    h.pause(false);
    h.flick(0, 0); h.up();
    var f = g.hand.fly, under = [], said = 0;
    for (var t = 0; t < 120 && g.hand.fly; t++) {
      h.step(1);
      ps.forEach(function (p) { if (p.say && w.P_SAY.timber.indexOf(p.say) >= 0) said |= 1 << ps.indexOf(p); });
      if (!g.hand.fly) under = ps.filter(function (p) { return p.x >= f.x + b[0] - 0.5 && p.x <= f.x + b[1] + 1.5; }).map(function (p) { return p.name + "@" + p.x.toFixed(1); });
    }
    check(!g.hand.fly && !under.length, "the lump came down on " + under.join(" "));
    check(said === 7, "not everybody under it said look out: " + said);
    for (t = 0; t < 300; t++) h.step(1);
    var buried = ps.filter(function (p) { return p.dead || p.buried || w.pBuriedIn(w.pCell(g, Math.floor(p.x), Math.floor(p.y))); });
    check(!buried.length, "under the heap: " + buried.map(function (p) { return p.name + (p.dead ? " (dead)" : ""); }).join(" "));
  });

  /* ---- phase 3: sites go with it ---- */
  /* the house's lanterns, hung, one by each door */
  function lamps(C) {
    var g = C.g, w = C.w;
    know(g, ["lamp"]);
    check(w.iPlanLamp(g, C.p), "(the test wants lanterns)");
    var L = sites(g, "lamp").filter(function (l) { return l.home === C.s.id; });
    L.forEach(function (l) { sim.build(w, l); w.bFinish(g, l, C.p); });
    g.peasants.forEach(function (o) { if (o.task && o.task.kind === "build") o.task = null; });
    return L;
  }
  /* a scarecrow, put up at column x: as iPlanScarecrow plans one, and built */
  function crow(C, x) {
    var g = C.g, w = C.w, M = C.M, G = ground(w, g, x) + 1, plan = [], y;
    for (y = G - 1; y >= G - 5; y--) plan.push(w.bE(g, x, y, M.WOOD, 10 + G - y));
    plan.push(w.bE(g, x - 1, G - 4, M.WOOD, 20), w.bE(g, x + 1, G - 4, M.WOOD, 20), w.bE(g, x - 2, G - 4, M.WOOD, 21), w.bE(g, x + 2, G - 4, M.WOOD, 21));
    var s = w.bNew(g, "scarecrow", C.p, plan, [x - 2, G - 5, x + 2, G - 1], { farm: 0, px: x, G: G, shirt: 0, who: C.p.short });
    sim.build(w, s); w.bFinish(g, s, C.p);
    return s;
  }
  /* is every cell of a site's plan as it says, and marked as somebody's */
  function whole(C, s) { return s.plan.every(function (e) { return e.v === C.M.EMPTY || (C.g.m[e.i] === e.v && C.g.bmark[e.i] === 1); }); }
  /* the lowest row of what is held */
  function bottom(g) { var b = 0; g.hand.held.c.forEach(function (v, k) { if (k % 6 === 1) b = Math.max(b, v); }); return b; }
  /* carried over (x, the ground there) and let go a few rows up: where it came down, and the lump */
  function setAt(h, x, up) {
    var g = h.g, gy = ground(h.game, g, x);
    carry(h, x, gy - bottom(g) - (up == null ? 2 : up));
    h.up();
    var f = g.hand.fly;
    for (var t = 0; t < 600 && g.hand.fly; t++) h.step(1);
    check(!g.hand.fly, "it never came down");
    return f;
  }

  test("hand: set down whole eighty columns along, it is the same house: marked there and not here, its owner sleeps in it, and bInspect finds nothing gone; a lantern and a scarecrow as well", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s, p = C.p, M = C.M, L = lamps(C);
    var x0 = s.x0, old = s.plan.filter(function (e) { return e.v !== M.EMPTY; }).map(function (e) { return e.i; });
    var lx = L.map(function (l) { return l.x0; });
    lift(h, C.cx, C.cy + 1, 10);
    check(s.handH && L.length === 2 && L.every(function (l) { return l.handH; }), "(the house and its lanterns did not all come up)");
    var f = setAt(h, FLAT), DX = f.x - C.cx, DY = f.y - C.cy - 1;
    check(DX > 70 && w.bSite(g, s.id) === s && s.x0 === x0 + DX && s.bed.x === x0 + 5 + DX && s.F === s.bed.y + 1, "set down " + DX + " columns along, the house is at " + s.x0 + " (it was at " + x0 + ")");
    check(whole(C, s), "set down whole, the house there is not as its plan says, or not marked");
    var here = {}; s.plan.forEach(function (e) { here[e.i] = 1; });
    check(old.every(function (i) { return here[i] || !g.bmark[i]; }), "the old place is still marked as somebody's");
    check(L.every(function (l, k) { return l.x0 === lx[k] + DX && whole(C, l) && l.home === s.id; }), "the lanterns did not come with it: " + L.map(function (l) { return l.x0; }));
    check(g.feed.some(function (q) { return q.key === "hand" + s.id && /has moved\. .* was not asked/.test(q.text); }), "nobody heard that the house moved: " + g.feed.map(function (q) { return q.text; }).join(" / "));
    var tale = (g.tales || []).filter(function (t) { return t.kind === "moved"; })[0];
    check(tale && w.wTold(tale) === "the hand moved " + w.pTitle(p.short) + "'s house", "the tale of it is " + (tale && w.wTold(tale)));
    check(DY === f.y - C.cy - 1 && s.handT == null && !s.handH, "(moved, it is still on hold, or waiting to be called a ruin)");
    /* (looked over there: nothing is missing) */
    [s].concat(L).forEach(function (q) { w.bInspect(g, q, g.sites.indexOf(q)); check(w.bSite(g, q.id) === q && q.done && !q.repair, q.kind + " looked over: done " + q.done + ", repair " + q.repair); });
    /* and that night, home to bed: in it, there */
    /* (with nothing in their pockets for anybody's building: wood carried goes to a site before bed, pPickTask) */
    p.hunger = 0; p.tired = w.B_SLEEPY + 1; p.task = null; p.taskCD = 0; p.idle = 0; p.logs = p.boards = 0;
    for (var t = 0; t < 4000 && !p.inBed; t++) h.step(1);
    check(p.inBed && Math.abs(p.x - s.bed.x - 0.5) < 1 && w.bHome(g, p) === s, p.name + " did not sleep in the house where it is now: in bed " + !!p.inBed + " at " + p.x.toFixed(1) + ", the bed at " + s.bed.x);
    check(w.bSite(g, s.id) === s && s.done && !s.repair && s.x0 === x0 + DX, "the house was given up, or mended, once it was there");
    /* a scarecrow, carried off somewhere else: it is there, and works there */
    var D = housed(), hd = D.h, gd = D.g, sc = crow(D, 165), px = sc.px;
    lift(hd, sc.px, sc.G - 3, 4);
    check(sc.handH, "(the scarecrow did not come up)");
    var fd = setAt(hd, FLAT), dx = fd.x - px;
    check(dx > 50 && sc.px === px + dx && sc.G === sc.y1 + 1 && whole(D, sc), "set down, the scarecrow is at " + sc.px + " (it was at " + px + ")");
    check(D.w.iScarecrowNear(gd, sc.px, sc.G - 3) === sc, "moved, the scarecrow does not put a duck off where it is now");
  });

  test("hand: set down in somebody's field or at the bottom of the lake, a house is not moved: the old place is a ruin, and the tale is that it flew", function () {
    function drop(C, at) {
      var h = C.h, g = C.g, w = C.w, s = C.s, x0 = s.x0;
      lift(h, C.cx, C.cy + 1, 10);
      var f = at(h);
      check(s.x0 === x0 && !g.feed.some(function (q) { return q.key === "hand" + s.id; }), "set down at " + f.x + ", the house moved to " + s.x0);
      for (var t = 0; t < 400 && w.bSite(g, s.id); t++) h.step(1);
      var tale = (g.tales || []).filter(function (q) { return q.kind === "flew"; })[0];
      check(!w.bSite(g, s.id), "the old place is not a ruin");
      check(tale && w.wTold(tale) === w.pTitle(C.p.short) + "'s house flew" && !(g.tales || []).some(function (q) { return q.kind === "house"; }), "the tale is " + (tale ? w.wTold(tale) : (g.tales || []).map(function (q) { return w.wTold(q); })));
      check(w.bHome(g, C.p) === null, C.p.name + " still lives there");
    }
    /* in a field: a mess in a field */
    var C = housed(), q = C.g.peasants[3];
    know(C.g, ["farm"]);
    stand(C, q, FLAT);
    check(C.w.iPlanFarm(C.g, q, true), "(the test wants a field)");
    var fl = sites(C.g, "farm")[0];
    sim.build(C.w, fl);
    drop(C, function (h) { return setAt(h, (fl.x0 + fl.x1) >> 1); });
    check(C.w.bSite(C.g, fl.id) === fl, "the field went");
    /* in the lake, on the bottom */
    var D = housed(), w = D.w, g = D.g, px = 106, top = -1, y;
    for (y = 60; y < g.gh; y++) if (w.LIQUID[g.m[y * g.gw + px]]) { top = y; break; }
    drop(D, function (h) {
      var b = bottom(g);
      carry(h, px, top - 3 - b);
      h.up();
      var f = g.hand.fly;
      for (var t = 0; t < 600 && g.hand.fly; t++) h.step(1);
      check(!g.hand.fly && f.y > top - b + 3, "it did not sink: " + f.y + ", the top of the water " + top);
      return f;
    });
  });

  test("hand: a house dropped from forty rows comes down a heap of itself where it stood, and that is not a house to mend: it is gone, and the tale is that it flew", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s, t;
    lift(h, C.cx, C.cy + 1, 10);
    carry(h, C.cx, C.cy - 39);
    h.up();
    for (t = 0; t < 600 && (g.hand.fly || g.np); t++) h.step(1);
    var ip = inPlace(C, 0, 0);
    check(ip[0] < ip[1] * 0.3, "(dropped, " + ip[0] + " of " + ip[1] + " of it is in place)");
    var fix = false;
    for (t = 0; t < 400 && w.bSite(g, s.id); t++) { h.step(1); if (s.repair) fix = true; }
    var tale = (g.tales || []).filter(function (q) { return q.kind === "flew"; })[0];
    check(!w.bSite(g, s.id) && !fix, "the heap is " + (fix ? "being mended as the house" : "still the house"));
    check(tale && w.mTitle(tale) === "the time " + w.pTitle(C.p.short) + "'s house flew", "the tale is " + (tale && w.mTitle(tale)));
    check(g.feed.some(function (q) { return q.key === "fix" + s.id && / is gone$/.test(q.text); }), "nobody said it was gone");
  });

  test("hand: a third of a house lifted and set down elsewhere: nothing is mended while it is held; after, the old place is", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s, x0 = s.x0;
    lift(h, s.x0 + 1, C.cy + 1, 5);
    var e = g.hand.sites.filter(function (q) { return q.id === s.id; })[0];
    check(e && e.n > 0.2 * e.of && e.n < 0.5 * e.of && s.handH, "(the test wants a third of the house: " + JSON.stringify(e) + ")");
    var n0 = inPlace(C, 0, 0)[0], mended = false;
    for (var t = 0; t < 900; t++) { if (t % 60 === 0) at(h, s.x0 + 1 + (t / 60), C.cy - 15); h.step(1); if (s.repair || inPlace(C, 0, 0)[0] !== n0) mended = true; }
    check(!mended && s.done, "held, the house was mended: repair " + s.repair + ", " + inPlace(C, 0, 0)[0] + " of it in place, not " + n0);
    setAt(h, FLAT);
    check(s.x0 === x0, "a third of it set down, the house moved to " + s.x0);
    for (t = 0; t < 300 && !s.repair; t++) h.step(1);
    check(s.repair && w.bSite(g, s.id) === s, "set down, the old place was not opened for repairs");
    C.p.logs = 20;
    for (t = 0; t < 8000 && !(s.done && !s.repair); t++) h.step(1);
    var ip = inPlace(C, 0, 0);
    check(s.done && !s.repair && ip[0] === ip[1], "the old place was not mended: " + ip[0] + " of " + ip[1] + ", repair " + s.repair);
  });

  test("hand: its owner chases it, and stops when it is set down; a fire takes them off it", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s, p = C.p;
    stand(C, p, s.x0 - 9);
    lift(h, C.cx, C.cy + 1, 10);
    check(p.task && p.task.kind === "chase" && p.task.site === s.id, p.name + " is not after the house: " + JSON.stringify(p.task));
    /* (carried along slowly, a column every ten ticks or so, up out of reach) */
    var said = false, x = C.cx, y = C.cy - 20, t, near = 0;
    for (t = 0; t < 900; t++) {
      if (t % 10 === 0 && x < FLAT) at(h, ++x, y);
      h.step(1);
      if (p.say && w.P_SAY.handChase.indexOf(p.say) >= 0) said = true;
      if (Math.abs(p.x - g.hand.held.x - 0.5) <= 6) near++;
    }
    check(p.task && p.task.kind === "chase" && said, p.name + " stopped chasing it, or never said so: " + JSON.stringify(p.task) + " " + said);
    check(Math.abs(p.x - g.hand.held.x) < 12 && near > 300, p.name + " is at " + p.x.toFixed(1) + ", the house at " + g.hand.held.x + " (under it " + near + " ticks)");
    setAt(h, FLAT, 1);
    h.step(2);
    check(!(p.task && p.task.kind === "chase"), "set down, " + p.name + " is still after it");
    /* again, and a fire somewhere else: the brigade */
    var D = housed(), hd = D.h, gd = D.g, q = D.p, hut = gd.sites.filter(function (o) { return o.hut && o.x0 > 150; })[0];
    know(gd, ["bucket"]);
    stand(D, q, D.s.x0 - 9);
    lift(hd, D.cx, D.cy + 1, 10);
    check(q.task && q.task.kind === "chase", "(" + q.name + " is not after it)");
    hd.step(30);
    for (var j = 0; j < hut.plan.length; j += 3) if (gd.m[hut.plan[j].i] === D.M.WOOD) D.w.sandSet(gd, hut.plan[j].i, D.M.FIRE);
    for (t = 0; t < 100 && q.task && q.task.kind === "chase"; t++) hd.step(1);
    check(gd.blaze.length && q.task && q.task.kind === "bucket", "a fire, and " + q.name + " is " + JSON.stringify(q.task && q.task.kind) + " (fires " + gd.blaze.length + ")");
  });

  test("hand: a house still being built, lifted whole and set down far along, is not held and not moved: its builders go on at the old place, and no site has a plan cell where the copy came down", function () {
    var h = H.open({ seed: 6 }), w = h.game, g = h.g, p = g.peasants[0], M = w.MAT;
    p.logs = 20;
    check(w.bPlanHouse(g, p), "(the test wants a house)");
    var s = sites(g, "house").filter(function (q) { return !q.hut && q.owner === p.id; })[0], x0 = s.x0;
    /* (all up but the bed) */
    sim.build(w, s); s.done = false;
    s.plan.forEach(function (e) { if (e.v === M.BED) { g.m[e.i] = M.EMPTY; w.heatSync(g, e.i); } });
    var C = { h: h, w: w, g: g, s: s, M: M };
    /* (the house, and only a little of the ground under it: so that there is something at the old place to build on) */
    lift(h, s.x0 + 5, s.F - 7, 9);
    var e = g.hand.sites.filter(function (q) { return q.id === s.id; })[0];
    check(e && e.n === e.of && e.of > 50, "(the test wants all of the house that is up: " + JSON.stringify(e) + ")");
    check(!s.handH, "a house being built is on hold in the hand");
    var f = setAt(h, FLAT), at = {};
    check(s.x0 === x0 && w.bSite(g, s.id) === s, "set down, the house being built moved, or went: " + s.x0);
    f.c.forEach(function (v, k) { if (k % 6 === 0) at[(f.y + f.c[k + 1]) * g.gw + f.x + v] = 1; });
    var claim = g.sites.filter(function (q) { return q.plan.some(function (e) { return at[e.i]; }); });
    check(!claim.length, "where the copy came down is in the plan of " + claim.map(function (q) { return q.kind + q.id; }));
    for (var t = 0; t < 6000 && !s.done; t++) h.step(1);
    var ip = inPlace(C, 0, 0);
    check(s.done && s.x0 === x0 && ip[0] === ip[1], "the builders did not put it back up at the old place: done " + s.done + ", " + ip[0] + " of " + ip[1]);
  });

  test("hand: a house and its lanterns lifted together and set down together all move, and none stops the others; set down with its box over a lantern that stayed behind, a house is not moved, nor the lantern that came with it", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s, L = lamps(C), x0 = s.x0, lx = L.map(function (l) { return l.x0; });
    lift(h, C.cx, C.cy + 1, 10);
    check(L.every(function (l) { return l.handH; }), "(the lanterns did not come up with the house)");
    /* (a column along, and down: on the edge of the hole it came out of) */
    carry(h, C.cx + 1, C.cy - 2); h.up();
    var f = g.hand.fly, t;
    for (t = 0; t < 600 && g.hand.fly; t++) h.step(1);
    var DX = f.x - C.cx, DY = f.y - C.cy - 1;
    /* (moved that little, the house would be on where its lantern was, and the other lantern where the house was) */
    function hits(a, b) { return a.plan.some(function (e) { var x = e.i % g.gw + DX, y = ((e.i / g.gw) | 0) + DY; return x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1; }); }
    var box = { x0: x0, x1: s.x1 - DX, y0: s.y0 - DY, y1: s.y1 - DY }, was = L.map(function (l, k) { return { x0: lx[k], x1: lx[k], y0: l.y0 - DY, y1: l.y1 - DY }; });
    check(DX === 1 && (hits({ plan: s.plan.map(function (e) { return { i: e.i - DX - DY * g.gw }; }) }, was[1]) || hits({ plan: L[0].plan.map(function (e) { return { i: e.i - DX - DY * g.gw }; }) }, box)), "(the test wants a move small enough for them to be in each other's way: " + DX + "," + DY + ")");
    check(s.x0 === x0 + DX && L.every(function (l, k) { return l.x0 === lx[k] + DX; }), "set down a column along, the house is at " + s.x0 + " (was " + x0 + "), its lanterns at " + L.map(function (l) { return l.x0; }) + " (were " + lx + ")");
    check(whole(C, s) && L.every(function (l) { return whole(C, l); }), "moved, they are not all as their plans say");
    /* and one left behind: the house lifted without its right-hand lantern, and come down on it */
    var D = housed(), hd = D.h, gd = D.g, sd = D.s, Ld = lamps(D), right = Ld.filter(function (l) { return l.x0 > sd.x1; })[0], left = Ld.filter(function (l) { return l.x0 < sd.x0; })[0];
    var xd = sd.x0, rx = right.x0, ry = right.y0, lx0 = left.x0;
    lift(hd, D.cx - 3, D.cy + 1, 9);
    var e = gd.hand.sites.filter(function (q) { return q.id === sd.id; })[0];
    check(!right.handH && left.handH && e.n >= 0.9 * e.of, "(the test wants the house and its left lantern, and not its right: " + JSON.stringify(e) + ")");
    carry(hd, D.cx - 1, D.cy - 20); hd.up();
    var fd = gd.hand.fly;
    for (t = 0; t < 600 && gd.hand.fly; t++) hd.step(1);
    var nx0 = xd + fd.x - (D.cx - 3), ny1 = sd.y1 + fd.y - D.cy - 1;
    check(rx >= nx0 && rx <= nx0 + 10 && ry <= ny1 && ry >= ny1 - 17, "(the test wants it come down with its box over the lantern: at " + nx0 + ".." + (nx0 + 10) + ", " + ny1 + "; the lantern at " + rx + "," + ry + ")");
    check(sd.x0 === xd && right.x0 === rx, "set down over the lantern that stayed, the house moved to " + sd.x0);
    check(left.x0 === lx0, "the lantern that came with it moved, and its house did not: " + left.x0 + " (it was at " + lx0 + ")");   /* (a lantern goes only with its house) */
  });
  /* ---- phase 4: they remember ---- */
  /* a house of somebody's own, built at once, as housed() builds the first peasant's */
  function houseFor(C, p) {
    var g = C.g, w = C.w;
    p.logs = 20;
    check(w.bPlanHouse(g, p), "(the test wants a house for " + p.name + ")");
    var s = sites(g, "house").filter(function (q) { return !q.hut && q.owner === p.id; })[0];
    sim.build(w, s); w.bFinish(g, s, p);
    g.peasants.forEach(function (o) { if (o.task && o.task.kind === "build") o.task = null; });
    return s;
  }
  /* a lump of sand out of the empty sky over column x, held there (row y): nobody's, and nobody on it */
  function skyLump(h, x, y, r) { return pebble(h, x, y, h.game.MAT.SAND, r); }
  /* the work done over n ticks, while each(t) is done first: the ticks anybody spent at a task (not asleep). (and not how
     many tasks were started: twenty-six to forty-one in 2,000 ticks of the same village, as the dice fall, where this goes
     9,400 to 11,800.) and every time the hand stopped somebody to look (p.handSeen changing), by name */
  function watch(h, n, each) {
    var g = h.g, seen = {}, looked = {}, jobs = 0, t, k, p;
    g.peasants.forEach(function (p) { seen[p.id] = p.handSeen; });
    for (t = 0; t < n; t++) {
      if (each) each(t);
      h.step(1);
      for (k = 0; k < g.peasants.length; k++) {
        p = g.peasants[k];
        if (p.task && p.task.kind !== "sleep") jobs++;
        if (p.handSeen !== seen[p.id]) { looked[p.name] = (looked[p.name] || 0) + 1; seen[p.id] = p.handSeen; }
      }
    }
    return { jobs: jobs, looked: looked };
  }
  /* the same village a little later: as it might have gone */
  function shake(h, k) { h.step(41 * (k || 0)); }
  /* the work done with the hand at it and without, each over the same village three ways (run(with, k); a, run(true, 0),
     done already): [with, without]. (one way to another, the same village's work goes up or down by a tenth) */
  function work(run, a) {
    var J = [a.jobs, 0];
    for (var k = 0; k < 3; k++) { if (k) J[0] += run(true, k).jobs; J[1] += run(false, k).jobs; }
    return J;
  }

  test("hand: three people knocked flat by lumps are afraid of it: under a held lump they run home", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, M = C.M, ps = [C.p, g.peasants[1], g.peasants[2]], t;
    var homes = [C.s, houseFor(C, ps[1]), houseFor(C, ps[2])];
    ps.forEach(function (p) {
      var y = stand(C, p, FLAT);
      /* (thrown from the right, toward the village: the other way, it is forty columns to the valley's edge, and over) */
      pebble(h, FLAT + 14, y - 6, M.SOIL, 3);
      h.flick(-4, 0); h.up();
      for (t = 0; t < 30 && p.state !== "fly"; t++) h.step(1);
      check(p.state === "fly", "(the test wants " + p.name + " knocked flat: " + p.state + ")");
      for (t = 0; t < 300 && (g.hand.fly || p.state !== "walk"); t++) h.step(1);
      check(!p.dead && p.state === "walk", "(the test wants " + p.name + " up again: " + p.state + (p.dead ? ", dead" : "") + ")");
      stand(C, p, FLAT + 40);   /* (and out of the way of the next one: a knock is a shove, and leaves them where they were) */
    });
    check(ps.every(function (p) { return p.feel === -2 && w.handView(g, p) < 0; }) && g.hand.cruel >= 3 && g.hand.kind === 0, "knocked flat, they think " + ps.map(function (p) { return p.name + " " + p.feel; }) + "; cruel " + g.hand.cruel);
    /* (and three cruelties to none: whoever has no mind of their own goes with the village) */
    var q = g.peasants.filter(function (o) { return !o.feel && !o.dead; })[0];
    check(q && w.handView(g, q) === -1, (q && q.name) + ", not knocked, thinks " + (q && w.handView(g, q)));
    /* a lump over each of them, a little way from their door: home they go, and in */
    ps.forEach(function (p, i) {
      var s = homes[i], x = s.x1 + 9, y = stand(C, p, x);
      check(y > 0 && !w.bInside(s, p), "(the test wants " + p.name + " outside, near home)");
      h.pause(true);   /* (time stopped while the lump is brought over them, so that they are still there) */
      skyLump(h, x, 30, 3);
      carry(h, x, y - 22);
      h.pause(false);
      var hid = false, ran = false;
      for (t = 0; t < 600 && !hid; t++) { h.step(1); if (p.panic > 0) ran = true; hid = p.hid != null && g.tick - p.hid < 5 && w.bInside(s, p); }
      check(ran && hid, p.name + " under a held lump did not run home and in: panicked " + ran + ", at " + p.x.toFixed(1) + " (the house " + s.ix0 + ".." + s.ix1 + ")");
      h.up();
      for (t = 0; t < 300 && g.hand.fly; t++) h.step(1);
    });
  });

  test("hand: a lump held 2,000 ticks over a trusting village: each walker under it stops once, and the village's jobs go on", function () {
    var x = 130;   /* (seed 6: the path between the pond and the houses) */
    function run(hover, k) {
      var C = housed(), h = C.h, g = C.g, w = C.w, gy = ground(w, g, x);
      shake(h, k);
      if (hover) { skyLump(h, x, 30, 8); g.hand.kind = 5; carry(h, x, gy - 30); }
      var r = watch(h, 2000);
      r.h = h; r.g = g;
      return r;
    }
    var a = run(true, 0), g = a.g, names = Object.keys(a.looked), J = work(run, a);
    check(g.hand.held && g.peasants.every(function (p) { return !p.feel; }) && g.peasants.every(function (p) { return a.g.hand && p.hid == null; }), "(the test wants it still held, over a village that trusts it and nobody hiding)");
    check(names.length >= 4, "only " + names.length + " stopped to look: " + JSON.stringify(a.looked));
    check(names.every(function (n) { return a.looked[n] === 1; }), "somebody stopped more than once: " + JSON.stringify(a.looked));
    check(Math.abs(J[0] - J[1]) <= J[1] / 5, "ticks of work under the hand " + J[0] + ", without it " + J[1]);
  });

  test("hand: lightning before the first lift books nothing; after it, it is booked", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, p = g.peasants[3], q = g.peasants[4], t;
    function strike(p) {
      stand(C, p, FLAT);
      for (var k = 0; k < 20 && !(p.zap > 0); k++) w.sandLightning(g, FLAT);
      check(p.zap > 0 && !p.dead, "(the test wants " + p.name + " struck, and alive)");
    }
    strike(p);
    stand(C, p, 60);   /* (out of the way of the next one) */
    check(!("hand" in g) && !("feel" in p), "struck before the hand was known: " + JSON.stringify({ hand: !!g.hand, feel: p.feel }));
    for (t = 0; t < 60; t++) h.step(1);
    lift(h, FLAT, 30, 3); h.up();
    check(g.hand && !g.hand.held && !g.hand.fly && g.hand.cruel === 0, "(the test wants the hand known, with nothing done)");
    strike(q);
    check(q.feel === -2 && g.hand.cruel === 1 && !("feel" in p), "struck after: " + q.name + " " + q.feel + ", cruel " + g.hand.cruel + ", and " + p.name + " " + p.feel);
  });

  test("hand: the ledger: a ride set down standing is +1, a move -1 (+2 if it was burning), a wreck -3 to its owner and +2 to cruel; and a valley that has lifted only sky has nobody with a feel", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, p = g.peasants[3], y = stand(C, p, FLAT), gy, t;
    /* a ride, thirty columns: +1. and one of more than a hundred: +1, and a tale */
    lift(h, FLAT, y + 3, 5);
    gy = ground(w, g, FLAT + 30);
    carry(h, FLAT + 30, gy - bottom(g) - 2);
    check(down(h) && p.state === "walk", "(the ride did not come down: " + p.state + ")");
    check(p.feel === 1 && g.hand.kind === 0 && g.hand.cruel === 0 && !(g.tales || []).some(function (q) { return q.kind === "rode"; }), "a ride of thirty columns: " + p.feel + ", " + g.hand.kind + "/" + g.hand.cruel);
    y = stand(C, p, FLAT + 30);
    lift(h, FLAT + 30, y + 3, 5);
    gy = ground(w, g, 130);
    carry(h, 130, gy - bottom(g) - 2);
    check(down(h) && p.state === "walk", "(the long ride did not come down: " + p.state + ")");
    var tale = (g.tales || []).filter(function (q) { return q.kind === "rode"; })[0];
    check(p.feel === 2 && tale && w.wTold(tale) === w.pTitle(p.short) + " rode on the hand", "a ride of " + (FLAT + 30 - 130) + " columns: " + p.feel + ", the tale " + (tale && w.wTold(tale)));
    /* a move: -1 to its owner */
    function moved(burning) {
      var D = housed(), hd = D.h, gd = D.g, s = D.s, o = D.p;
      if (burning) s.burning = gd.tick + 1;   /* (the books say it is on fire) */
      lift(hd, D.cx, D.cy + 1, 10);
      var x0 = s.x0;
      setAt(hd, FLAT);
      check(s.x0 !== x0, "(the test wants the house moved)");
      return [o.feel, gd.hand.kind, gd.hand.cruel];
    }
    var m = moved(false), mb = moved(true);
    check(m.join() === "-1,0,0", "moved, the owner and the village: " + m);
    check(mb.join() === "2,1,0", "moved out of a fire, the owner and the village: " + mb);
    /* a wreck: -3 to its owner, and +2 to cruel. (the owner kept out of the way, so that nothing else is booked) */
    function wreck(burning) {
      var D = housed(), hd = D.h, gd = D.g, s = D.s, o = D.p;
      if (burning) s.burning = gd.tick + 1;
      lift(hd, D.cx, D.cy + 1, 10);
      o.task = null; stand(D, o, FLAT);
      gd.peasants.forEach(function (q, i) { if (q.ride) stand(D, q, FLAT + 10 + i); });   /* (and anybody indoors: dropped, they would be booked too) */
      carry(hd, D.cx, D.cy - 39); hd.up();
      for (var t = 0; t < 1000 && D.w.bSite(gd, s.id); t++) hd.step(1);
      check(!D.w.bSite(gd, s.id), "(the test wants the house gone)");
      return [o.feel || 0, gd.hand.kind, gd.hand.cruel];
    }
    var r = wreck(false), rb = wreck(true);
    check(r.join() === "-3,0,2", "wrecked, the owner and the village: " + r);
    check(rb.join() === "0,0,0", "wrecked while it was on fire, the owner and the village: " + rb);
    /* and a valley that has lifted nothing but sky */
    var E = housed(), he = E.h, ge = E.g;
    lift(he, FLAT, 30, 5); he.up();
    for (t = 0; t < 2000; t++) { if (t % 100 === 0) { lift(he, 40 + t / 10, 25, 4); } else if (t % 100 === 20) he.up(); he.step(1); }
    check(ge.hand && ge.hand.lifts >= 20 && ge.peasants.every(function (q) { return !("feel" in q); }) && !ge.hand.kind && !ge.hand.cruel, "lifting the sky, somebody thinks something: " + ge.peasants.filter(function (q) { return "feel" in q; }).map(function (q) { return q.name + " " + q.feel; }));
  });

  test("hand: forty lifts of sand in 2,000 ticks, none taking a site's cell or a rider, stop the village at most four times (one a 600 ticks), and its jobs go on as in test 28; one lift of a house stops it at once", function () {
    var x = 150, top = 40;
    /* (a stone tray of sand in the sky over the village, out of everybody's reach) */
    function tray(C) {
      var g = C.g, w = C.w, M = C.M, X, Y;
      for (X = x - 8; X <= x + 8; X++) for (Y = top; Y <= top + 8; Y++) w.sandPlace(g, Y * g.gw + X, X === x - 8 || X === x + 8 || Y === top + 8 ? M.STONE : M.SAND);
    }
    function run(lifting, k) {
      var C = housed(), h = C.h, g = C.g, w = C.w, stops = 0, wT;
      tray(C); shake(h, k);
      var r = watch(h, 2000, function (t) {
        if (!lifting) return;
        if (t % 50 === 0) {
          lift(h, x - 4 + (t / 50) % 9, top + 4, 2);
          check(!g.hand.sites.some(function (s) { return s.n; }) && !g.peasants.some(function (p) { return p.ride; }), "(the test wants nobody's sand)");
          if (g.hand.wT !== wT) { stops++; wT = g.hand.wT; }
        } else if (t % 50 === 10) h.up();
      });
      r.C = C; r.stops = stops;
      return r;
    }
    var a = run(true, 0), C = a.C, g = C.g, h = C.h, w = C.w, J = work(run, a);
    check(g.hand.lifts === 40, "(the test wants forty lifts: " + g.hand.lifts + ")");
    check(a.stops >= 2 && a.stops <= 4, "forty lifts of sand stopped the village " + a.stops + " times");
    check(Object.keys(a.looked).every(function (n) { return a.looked[n] <= 4; }), "somebody stopped more than four times: " + JSON.stringify(a.looked));
    check(Math.abs(J[0] - J[1]) <= J[1] / 5, "ticks of work with the sand going up and down " + J[0] + ", without " + J[1]);
    /* and a house: at once, however lately the sand did */
    for (var t = 0; t < 30 && g.hand.fly; t++) h.step(1);
    check(g.tick - g.hand.wT < 600, "(the test wants the sand to have stopped them lately)");
    var free = g.peasants.filter(function (p) { return w.handFree(g, p) && Math.abs(p.x - C.cx) < 70; });
    check(free.length, "(the test wants somebody about, near the house)");
    lift(h, C.cx, C.cy + 1, 10);
    check(g.hand.wT === g.tick && free.every(function (p) { return p.handSeen === g.hand.lifts && p.idle >= 60; }), "the house went up, and " + free.filter(function (p) { return p.handSeen !== g.hand.lifts; }).map(function (p) { return p.name; }) + " did not stop to look");
  });
  /* ---- phase 5: the sky answers ---- */
  /* a house on fire: embers along its roof, and the books saying so (ideas.js sees it within twenty ticks) */
  function alight(C) {
    var g = C.g, w = C.w, s = C.s, M = C.M, top = 1e9, n = 0, t;
    know(g, ["bucket"]);
    s.plan.forEach(function (e) { if (e.v !== M.EMPTY) top = Math.min(top, (e.i / g.gw) | 0); });
    s.plan.forEach(function (e) { if (e.v !== M.EMPTY && ((e.i / g.gw) | 0) <= top + 1 && n++ % 2 === 0) w.sandSet(g, e.i, M.EMBER); });
    for (t = 0; t < 60 && !s.burning; t++) C.h.step(1);
    check(s.burning && g.blaze.some(function (b) { return b.site === s.id; }), "(the test wants the house on fire)");
    return top;
  }
  /* a lump of the pond (seed 6: at column 106), held: the top few rows of it */
  function pondLump(C, r) {
    var g = C.g, w = C.w, top = -1, y;
    for (y = 60; y < g.gh; y++) if (w.LIQUID[g.m[y * g.gw + 106]]) { top = y; break; }
    lift(C.h, 106, top + r - 1, r);
    return top;
  }
  function said(g, key) { return g.feed.filter(function (q) { return q.key === key; }).map(function (q) { return q.text; })[0]; }

  test("hand: water set down on a burning house puts it out, the sky gets the credit, and the owner leaves coal; lifting it is ACCEPTED, and the giver's feel goes up", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s, M = C.M, p = C.p, t;
    var roof = alight(C);
    pondLump(C, 5);
    check(g.hand.held.c.filter(function (v, k) { return k % 6 === 2 && w.WET[v]; }).length > 40, "(the test wants a lump of water)");
    carry(h, C.cx, roof - 12);
    check(down(h) && s.handWet === g.tick, "set down on the roof, the house is not wet from the sky: " + s.handWet + " at " + g.tick);
    for (t = 0; t < 900 && s.burning; t++) h.step(1);
    var line = said(g, "blaze" + s.id), tale = (g.tales || []).filter(function (q) { return q.kind === "saved"; })[0];
    check(!s.burning && line === "the sky put out the fire at " + w.pTitle(p.short) + "'s house", "the fire is " + (s.burning ? "not out" : "out, and the news is " + line));
    check(tale && w.wTold(tale) === "the hand put out the fire at " + w.pTitle(p.short) + "'s house", "the tale is " + (tale && w.wTold(tale)));
    check(p.feel === 3 && g.hand.kind === 2 && g.hand.cruel === 0 && p.thank, "put out: " + p.name + " " + p.feel + ", kind " + g.hand.kind + ", thank " + p.thank);
    /* (out of the pocket: a lump of coal, and nothing else in it. and no logs, or there is building to be done first) */
    p.coal = 1; p.gold = 0; p.logs = 0;
    for (t = 0; t < 6000 && !g.hand.gifts.length; t++) h.step(1);
    var gift = g.hand.gifts[0];
    check(gift && gift.m === M.COAL && gift.who === p.id && g.m[gift.i] === M.COAL && p.coal === 0 && !p.thank, "no coal left: " + JSON.stringify(gift) + ", " + p.coal + " in the pocket");
    check(/left a lump of coal for the hand/.test(said(g, "thank" + p.id)), "the news is " + said(g, "thank" + p.id));
    var x = gift.i % g.gw, y = (gift.i / g.gw) | 0, sky = 0;
    for (var r = y - 1; r >= y - 20; r--) if (w.AIRY[g.m[r * g.gw + x]]) sky++;
    check(sky === 20 && w.pSolid(g, x, y + 1), "the coal is not out under the sky: " + sky + " rows over it");
    /* and it is taken */
    lift(h, x, y, 1);
    check(g.got.accepted && p.feel === 4 && g.hand.kind === 3 && !g.hand.gifts.length && said(g, "took") === "THE HAND TOOK IT", "lifted, the coal is " + JSON.stringify({ got: !!g.got.accepted, feel: p.feel, kind: g.hand.kind, gifts: g.hand.gifts.length }));
    check(w.P_SAY.handTook.indexOf(p.say) >= 0, p.name + " said " + p.say);
  });

  test("hand: a burning house set down in the lake is put out by it, and is not a house there; a house lifted out of a flood and set down dry is a rescue", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s, M = C.M, p = C.p, px = 106, top = -1, t, y;
    alight(C);
    p.task = null; stand(C, p, FLAT);   /* (out of the way of it) */
    for (y = 60; y < g.gh; y++) if (w.LIQUID[g.m[y * g.gw + px]]) { top = y; break; }
    lift(h, C.cx, C.cy + 1, 10);
    var x0 = s.x0, b = bottom(g);
    carry(h, px, top - 3 - b);
    h.up();
    var f = g.hand.fly;
    for (t = 0; t < 600 && g.hand.fly; t++) h.step(1);
    check(!g.hand.fly && f.y > top - b + 3, "(the test wants it sunk in the lake: " + f.y + ")");
    check(s.handD && !s.handH && g.hand.dunks.length === 1, "(sunk, it is on hold until its fire is seen to be out)");
    for (t = 0; t < 900 && !s.handSaved; t++) h.step(1);   /* (and once it is, the lake did it) */
    check(!s.handD && !g.hand.dunks.length, "the dunk was never judged, or it is still on hold");
    check(said(g, "blaze" + s.id) === "the sky put out the fire at " + w.pTitle(p.short) + "'s house" && p.feel === 3 && g.hand.kind === 2, "dunked, the news is " + said(g, "blaze" + s.id) + ", " + p.name + " " + p.feel);
    check(s.x0 === x0 && !said(g, "hand" + s.id), "dunked, the house moved to " + s.x0);
    for (t = 0; t < 400 && w.bSite(g, s.id); t++) h.step(1);
    var lit = 0;
    for (y = top - 20; y < top + 20; y++) for (var x = px - 14; x <= px + 14; x++) if (g.m[y * g.gw + x] === M.EMBER || g.m[y * g.gw + x] === M.FIRE) lit++;
    check(!w.bSite(g, s.id) && !lit, "in the lake, " + lit + " cells still alight, and the old place " + (w.bSite(g, s.id) ? "still a house" : "gone"));
    check(p.feel === 3 && g.hand.cruel === 0, "it went up on fire, and it is booked as wrecked: " + p.feel + ", cruel " + g.hand.cruel);
    /* and a house stood in a flood, lifted out of it with the water round its walls and set down dry: a rescue, as one on
       fire is (+2, and the village +1) */
    var D = housed(), hd = D.h, gd = D.g, sd = D.s, n = 0, x0d = sd.x0;
    hd.pause(true);
    for (y = sd.y1 - 7; y <= sd.y1 - 4; y++) [sd.x0 - 1, sd.x1 + 1].forEach(function (x) { var j = y * gd.gw + x; if (gd.m[j] === M.EMPTY) { D.w.sandSet(gd, j, M.WATER); n++; } });
    check(n === 8, "(the test wants water round the house: " + n + ")");
    lift(hd, D.cx, D.cy + 1, 10);
    hd.pause(false);
    setAt(hd, FLAT);
    check(sd.x0 !== x0d && D.p.feel === 2 && gd.hand.kind === 1, "moved out of the flood, " + D.p.name + " " + D.p.feel + ", kind " + gd.hand.kind + " (moved " + (sd.x0 - x0d) + ")");
  });

  test("hand: a fire with no water in reach, in a village that trusts the hand: one wish, arms up, and only one", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, M = C.M, hut = g.sites.filter(function (o) { return o.hut && o.x0 > 150; })[0], t, k;
    var q = g.peasants[3];
    know(g, ["bucket"]);
    lift(h, FLAT, 30, 3); h.up();
    g.hand.kind = 5;   /* (a village that thinks well of it) */
    stand(C, q, FLAT);   /* (the far side of the fire from the pond) */
    for (k = 0; k < hut.plan.length; k += 3) if (g.m[hut.plan[k].i] === M.WOOD) w.sandSet(g, hut.plan[k].i, M.FIRE);
    var asks = 0, was = {}, who = null, up = 0, upOf = 0, line;
    for (t = 0; t < 1800; t++) {
      h.step(1);
      g.peasants.forEach(function (o) { if (o.ask > (was[o.id] || 0)) { asks++; who = o; line = said(g, "wish" + hut.id); } was[o.id] = o.ask || 0; });
      if (who && who.ask > 0 && !who.fire && !(who.panic > 0)) { upOf++; if (who.pose === "panicA" && who.idle > 0) up++; }
    }
    check(hut.wishT >= hut.burning && who, "nobody asked: wished " + hut.wishT + ", burning since " + hut.burning);
    check(asks === 1, asks + " wishes for the one fire");
    check(up === upOf && upOf > 250, who.name + " had their arms up " + up + " ticks of " + upOf);
    check(line === who.name + " looks up. 'water, please. from anywhere'", "the news is " + line);
  });

  test("hand: the thanks come out of a pocket: with gold, a nugget and one gold fewer; with coal, a lump and one coal fewer; with neither, a wave and no cell written", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, M = C.M, t;
    lift(h, FLAT, 30, 3); h.up();
    function wealth() {
      var n = 0, j;
      for (j = 0; j < g.m.length; j++) if (g.m[j] === M.GOLD || g.m[j] === M.COAL) n++;
      g.peasants.forEach(function (o) { n += (o.gold || 0) + (o.coal || 0); });
      return n;
    }
    function thank(q, gold, coal) {
      stand(C, q, FLAT); q.logs = 0; q.gold = gold; q.coal = coal; q.thank = g.tick;
      var n0 = wealth(), m0 = Array.prototype.slice.call(g.m), gifts = g.hand.gifts.length;
      check(w.handThank(g, q), "(" + q.name + " did not thank it)");
      if (q.task) for (t = 0; t < 900 && q.task && q.task.kind === "thank"; t++) h.step(1);
      var n1 = wealth(), gift = g.hand.gifts.length > gifts ? g.hand.gifts[g.hand.gifts.length - 1] : null;
      check(n1 === n0 && !q.thank, "thanked, " + q.name + "'s wealth and the valley's went from " + n0 + " to " + n1);
      return { gift: gift, m0: m0 };
    }
    var a = g.peasants[3], r = thank(a, 1, 1);
    check(r.gift && r.gift.m === M.GOLD && g.m[r.gift.i] === M.GOLD && a.gold === 0 && a.coal === 1, "with gold: " + JSON.stringify(r.gift) + ", " + a.gold + " gold, " + a.coal + " coal");
    var b = g.peasants[4]; r = thank(b, 0, 2);
    check(r.gift && r.gift.m === M.COAL && g.m[r.gift.i] === M.COAL && b.coal === 1, "with coal: " + JSON.stringify(r.gift) + ", " + b.coal + " coal");
    var c = g.peasants[5]; r = thank(c, 0, 0);
    var same = r.m0.every(function (v, j) { return g.m[j] === v; });
    check(!r.gift && same && c.ask > 0 && !c.task, "with nothing: " + JSON.stringify({ gift: r.gift, same: same, ask: c.ask, task: c.task && c.task.kind }));
    check(/waved at the sky/.test(said(g, "thank" + c.id)), "the news is " + said(g, "thank" + c.id));
    /* (and ten kindnesses, with cruelties a third of that at most: A KINDLY HAND) */
    g.hand.kind = 9; g.hand.cruel = 3;
    w.handDeed(g, a, "took");
    check(g.got.kindly && !g.got.wrath, "ten kindnesses to three cruelties, and no A KINDLY HAND");
  });

  /* the playtest: seed 7, played through the harness's own hands (the picker, the wheel, the mouse, a press, a flick, a
     let-go, and one match), and then left to get on with it. if anything here moves the village, the scenario is
     recorded again (harness/playtests/README.md), and the news it is checked for still has to come out of it */
  test("hand: the playtest (harness/playtests/hand.json): a house moved, a pond carried to a fire, a pebble through a window, a house dropped from forty rows, and 20,000 ticks after: it replays to its hash, nobody stalls, and nobody is left held by nothing", function () {
    var sc = JSON.parse(require("fs").readFileSync(path.join(__dirname, "../harness/playtests/hand.json"), "utf8"));
    var h = H.open({ seed: sc.seed }), W = require("../harness/stuck.js").createWatcher(), last = 0, loose = [], seen = 0;
    sc.ops.forEach(function (o) { last = Math.max(last, o.at); });
    check(sc.ticks - last >= 20000, "(the playtest wants 20,000 ticks after the last hand on it: " + (sc.ticks - last) + ")");
    /* (every tick of the replay: anybody held who is not on a lump, or a lump that is not there, and is not in the
       PEASANT tool's grip either. and, after the last of it, the stuck observer, every 30 ticks, as the soak runs it) */
    h.watch(function (g, hh, tick) {
      var L = g.hand && (g.hand.held || g.hand.fly);
      g.peasants.forEach(function (p) { if (!p.dead && p.state === "held" && p !== g.held && !(p.ride && L)) loose.push(p.name + "@" + tick); });
      g.ducks.forEach(function (d) { if (!d.dead && d.state === "held" && d !== g.heldDuck && !(d.ride && L)) loose.push("duck " + d.id + "@" + tick); });
      if (tick > last && tick % 30 === 0) { W.sample(hh); seen++; }
      return 0;
    }, { every: 1, max: 1 });
    var r = h.replay(sc);
    check(r.matches, "the playtest replayed to " + r.hash + " at " + r.ticks + ", not " + sc.hash);
    check(!loose.length, "held by nothing: " + loose.slice(0, 6).join(" "));
    check(seen * 30 >= 20000 && !W.report().length, "watched " + seen * 30 + " ticks; stalled: " + JSON.stringify(W.report()));
    /* (and it was the playtest it says it was: each of the four came out as it should) */
    var news = h.events({ kind: "feed" }).map(function (e) { return e.text; });
    ["Fern's house has moved. Fern was not asked", "the sky put out the fire at Hamish's hut", "the village is fixing Gertrude's house",
     "Gertrude's house is as good as new", "Fern's house is gone"].forEach(function (t) { check(news.indexOf(t) >= 0, "the playtest never said \"" + t + "\""); });
    check(!h.g.hand.held && !h.g.hand.fly && h.g.peasants.every(function (p) { return !p.ride; }), "a lump, or a rider, still about at the end");
  });

  /* (from the review, phase 6) */
  test("hand: a house the hand only went near, or took a bite of, and that is lost afterwards, did not fly: it is told as itself, and nothing is booked", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s, M = C.M, t;
    /* (the sky over its corner: the disc meets the house's box, and takes none of it) */
    lift(h, s.x1 + 4, s.y0 - 4, 6);
    var e = g.hand.sites.filter(function (q) { return q.id === s.id; })[0];
    check(e && e.n === 0, "(the test wants the house near the lift, and none of it taken: " + JSON.stringify(e) + ")");
    down(h);
    check(s.handT == null, "a lift of the sky beside it marked the house as one that flew");
    /* (a bite of its wall, carried off and put down elsewhere) */
    lift(h, s.x0, C.cy + 2, 2);
    e = g.hand.sites.filter(function (q) { return q.id === s.id; })[0];
    check(e && e.n > 0 && e.n < 0.3 * e.of, "(the test wants a bite of the house: " + JSON.stringify(e) + ")");
    setAt(h, FLAT);
    check(s.handT == null, "a bite of its wall marked the house as one that flew");
    /* (and then most of it goes, the hand nowhere near) */
    var n = 0;
    s.plan.forEach(function (q) { if (q.v !== M.EMPTY && n++ % 4 !== 0) w.sandSet(g, q.i, M.EMPTY); });
    for (t = 0; t < 400 && w.bSite(g, s.id); t++) h.step(1);
    check(!w.bSite(g, s.id), "(the test wants the house gone)");
    var flew = (g.tales || []).filter(function (q) { return q.kind === "flew"; });
    check(!flew.length && !C.p.feel && !g.hand.cruel, "lost, it flew: " + JSON.stringify({ tales: flew.length, feel: C.p.feel, cruel: g.hand.cruel }));
  });

  test("hand: a bite of a burning house in the hand, and the brigade goes on putting out what is alight on the ground", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s, t;
    alight(C);
    lift(h, s.x0, C.cy + 2, 2);
    check(s.handH, "(the test wants the house on hold)");
    var listed = 0, of = 0, buckets = 0;
    for (t = 0; t < 400; t++) {
      if (t % 10 === 0) at(h, s.x0 - 20, C.cy - 20);
      h.step(1);
      if (g.tick % 20 === 1 && w.iFlames(g, s).length) { of++; if (g.blaze.some(function (b) { return b.site === s.id; })) listed++; }
      buckets = Math.max(buckets, g.peasants.filter(function (p) { return p.task && p.task.kind === "bucket" && p.task.site === s.id; }).length);
    }
    check(of > 10 && listed === of, "a bite of it in the hand, and the fire left burning on the ground was off the books " + (of - listed) + " times of " + of);
    check(buckets > 0, "nobody fetched a bucket to the fire");
  });

  test("hand: a window knocked out is held against it; by the third, the owner thinks ill of the hand, and a pebble of sand that breaks nothing is not held against it", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s, M = C.M, p = C.p, k, t;
    function at3(v) {
      pebble(h, s.x0 - 25, s.F - 18, v, 3);
      flick(h, 4, 0.5, 60);
      for (t = 0; t < 300 && g.np; t++) h.step(1);
    }
    /* (the house and the air beside it, as they were: put back after each throw, as the village would mend it and sweep up) */
    var keep = [], x, y, j;
    for (y = s.F - 26; y <= s.F + 1; y++) for (x = s.x0 - 28; x <= s.x1 + 3; x++) { j = y * g.gw + x; keep.push([j, g.m[j], g.aux[j]]); }
    function mend() { keep.forEach(function (q) { if (g.m[q[0]] !== q[1] || g.aux[q[0]] !== q[2]) { w.sandSet(g, q[0], q[1]); g.aux[q[0]] = q[2]; } }); }
    at3(M.SAND);
    check(!p.feel && !g.hand.cruel, "a pebble of sand that broke nothing was held against it: " + p.feel + ", cruel " + g.hand.cruel);
    for (k = 1; k <= 3; k++) {
      mend();
      at3(M.STONE);
      check(p.feel === -k && g.hand.cruel === k, "after " + k + " window(s), " + p.name + " thinks " + p.feel + ", cruel " + g.hand.cruel);
    }
    check(w.handView(g, p) < 0, "three windows on, " + p.name + "'s view of the hand is " + w.handView(g, p));
  });

  test("hand: a burning house sunk in a pond of oil is not put out by the sky; and a fire the brigade had three buckets on after the hand's water is the brigade's", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s, M = C.M, p = C.p, px = 106, top = -1, t, y, j;
    for (j = 0; j < g.m.length; j++) if (w.WET[g.m[j]]) w.sandSet(g, j, M.OIL);   /* (the pond, oil) */
    alight(C);
    p.task = null; stand(C, p, FLAT);
    for (y = 60; y < g.gh; y++) if (w.LIQUID[g.m[y * g.gw + px]]) { top = y; break; }
    lift(h, C.cx, C.cy + 1, 10);
    var b = bottom(g);
    carry(h, px, top - 3 - b);
    h.up();
    var f = g.hand.fly;
    for (t = 0; t < 600 && g.hand.fly; t++) h.step(1);
    check(!g.hand.fly && f.y > top - b + 3, "(the test wants it sunk in the oil: " + f.y + ")");
    check(!s.handSaved && !/sky/.test(said(g, "blaze" + s.id) || "") && !p.feel && !g.hand.kind, "sunk in oil, the news is " + said(g, "blaze" + s.id) + ", " + p.name + " " + p.feel);
    /* (the brigade's: water from the hand on it, then three buckets, then out) */
    var D = housed(), hd = D.h, gd = D.g, wd = D.w, sd = D.s;
    alight(D);
    lift(hd, FLAT, 30, 2); hd.up();
    sd.handWet = gd.tick; sd.handWetD = sd.doused || 0; sd.doused = (sd.doused || 0) + 3;
    for (j = 0; j < gd.m.length; j++) if (gd.m[j] === D.M.EMBER || gd.m[j] === D.M.FIRE) wd.sandSet(gd, j, D.M.ASH);
    for (t = 0; t < 60 && sd.burning; t++) hd.step(1);
    check(!sd.burning && said(gd, "blaze" + sd.id) === "the bucket brigade put out the fire at " + wd.bLabel(sd) && !gd.hand.kind, "the brigade's fire: " + said(gd, "blaze" + sd.id));
  });

  test("hand: a pebble of one stone flicked fast at somebody does not go through them, wherever it starts from", function () {
    var off;
    for (off = 0; off < 5; off++) {
      var C = housed(), h = C.h, g = C.g, w = C.w, M = C.M, q = g.peasants[3], y = stand(C, q, FLAT), x = FLAT - 14 - off;
      g.peasants.forEach(function (o) { if (o !== q && Math.abs(o.x - FLAT) < 30) stand(C, o, FLAT + 60); });
      w.sandSet(g, (y - 4) * g.gw + x, M.STONE);
      lift(h, x, y - 4, 1);
      check(g.hand.held.c.length === 6, "(the test wants a pebble of one cell: " + g.hand.held.c.length / 6 + ")");
      h.flick(4.5, 0); h.up();
      var hit = false;
      for (var t = 0; t < 40 && g.hand.fly; t++) { h.step(1); if (q.state === "fly") hit = true; }
      check(hit || q.state === "fly", "from " + (14 + off) + " columns off, the pebble went through " + q.name);
    }
  });

  test("hand: a lift at the valley's wall takes what is in the ring, not what is a brush along from it, and carried, it stays in the valley", function () {
    var h = H.open({ seed: 6 }), g = h.g, w = h.game, M = w.MAT, y = 40, k;
    w.sandSet(g, y * g.gw + 1, M.STONE); w.sandSet(g, y * g.gw + 9, M.METAL);
    lift(h, 1, y, 6);
    var c = g.hand.held.c, mats = [];
    for (k = 0; k < c.length; k += 6) mats.push(c[k + 2]);
    check(mats.length === 1 && mats[0] === M.STONE && g.hand.held.x === 1, "lifted at the wall: " + JSON.stringify(mats) + " at " + g.hand.held.x);
    at(h, 0, y); h.step(1);
    check(g.hand.held.x === 0, "carried to the wall, the pebble is at " + g.hand.held.x);
    at(h, g.gw - 1, 0); h.step(1);
    check(g.hand.held.x === g.gw - 1 && g.hand.held.y === 0, "carried to the far corner, it is at " + g.hand.held.x + "," + g.hand.held.y);
    h.flick(0, 0); h.up(); down(h);
    check(!g.hand.fly, "let go in the corner, it never came down");
  });

  test("hand: somebody after their house runs, and keeps up with it carried along at a fair pace", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s, p = C.p, t, near = 0, of = 0;
    p.task = null;
    lift(h, C.cx, C.cy + 1, 10);
    check(p.task && p.task.kind === "chase", "(the test wants the owner after it)");
    var x0 = g.hand.held.x;
    at(h, x0, C.cy - 20); h.step(1);
    for (t = 0; t < 300; t++) {
      if (t % 3 === 0) at(h, x0 + 1 + (t / 3), C.cy - 20);   /* (a column every three ticks: twice a walk) */
      h.step(1);
      if (t >= 100) { of++; if (Math.abs(p.x - g.hand.held.x - 0.5) <= 8) near++; }
    }
    check(near > of * 0.8, p.name + " was under it " + near + " ticks of " + of + ", at " + p.x.toFixed(1) + " with it at " + g.hand.held.x);
  });

  /* (from the review, phase 6, round 2) */
  test("hand: dropped onto the bare floor of an emptied valley, a lump comes apart on it, and nothing of it, or its heat, goes through the floor", function () {
    var h = H.open({ seed: 6 }), g = h.g, w = h.game, M = w.MAT;
    h.key("c");
    g.peasants.forEach(function (q) { q.dead = 1; });
    g.size = 4; w.sandDab(g, 136, 150, M.STONE, true);
    var n0 = 0; for (var i = 0; i < g.m.length; i++) if (g.m[i] === M.STONE) { n0++; w.heatAdd(g, i, 300); }   /* (hot, so that its heat is something to lose) */
    lift(h, 136, 150, 4);
    var q0 = heatAll(h);
    check(n0 > 0 && g.hand.held.c.length / 6 === n0, "(the test wants all the stone in the hand: " + n0 + ")");
    carry(h, 136, 100); h.up();
    for (var t = 0; t < 600 && g.hand.fly; t++) h.step(1);
    /* (the tick it comes apart: all of it in the grid or in the air, none of it gone. after that the floor is an edge of the
       world, and heat goes out at the edges, as it always has) */
    check(Math.abs(heatAll(h) - q0) < 1e-6 * Math.abs(q0) + 1e-2, "come apart on the floor, the heat went from " + q0 + " to " + heatAll(h));
    for (t = 0; t < 600 && g.np; t++) h.step(1);
    var n1 = 0; for (i = 0; i < g.m.length; i++) if (g.m[i] === M.STONE) n1++;
    check(n1 === n0, "dropped on the floor, " + n1 + " of " + n0 + " stone left");
  });

  test("hand: an ice palace held in the hand has not melted; let go of where it was, it is mourned as one that has", function () {
    var h = H.open({ seed: 1 }), w = h.game, g = h.g, M = w.MAT, G = 150, x, y, k, j;
    for (k = g.sites.length - 1; k >= 0; k--) w.bRemove(g, k);
    for (x = 90; x <= 250; x++) {
      for (y = 40; y < G; y++) w.sandPlace(g, y * g.gw + x, M.EMPTY);
      for (y = G; y < G + 8; y++) w.sandPlace(g, y * g.gw + x, M.SAND);
      if (x >= 100 && x <= 240) for (y = G - 5; y < G; y++) { j = y * g.gw + x; w.sandPlace(g, j, M.SNOW); g.T[j] = -10; w.heatAccept(g, j); }
    }
    w.bNew(g, "house", null, [w.bE(g, 200, G - 9, M.PLANK, 0)], [196, G - 14, 204, G - 6], {}).done = true;
    know(g, ["farm", "dig", "bucket", "icepalace"]); g.got.snowman = 1; g.got.skate = 1;
    g.peasants.forEach(function (q, i) { if (i > 0) q.dead = 1; else { q.x = 190.5; q.y = G - 6; q.task = null; } });
    function freeze() { for (x = 70; x <= 270; x++) for (y = 60; y < G + 2; y++) { j = y * g.gw + x; if (g.T[j] > -4 && (w.AIRY[g.m[j]] || g.m[j] === M.SNOW || g.m[j] === M.PACKSNOW || g.m[j] === M.ICE)) g.T[j] = -4; } }
    freeze(); h.step(30); freeze();
    check(w.pPlanIce(g, g.peasants[0]), "(the test wants an ice palace planned)");
    var s = sites(g, "icepalace")[0];
    sim.build(w, s); w.bFinish(g, s, g.peasants[0]);
    lift(h, (s.x0 + s.x1) >> 1, (s.y0 + s.y1) >> 1, 12);
    check(s.handH, "(the test wants the palace in the hand)");
    for (var t = 0; t < 600; t++) { h.step(1); if (t % 30 === 0) freeze(); }
    check(w.bSite(g, s.id) === s && !g.feed.some(function (q) { return /melted/.test(q.text); }), "held in the hand, the ice palace melted");
    at(h, s.x0 - 60, 60); h.step(1); h.flick(0, 0); h.up(); down(h);
    for (t = 0; t < 600 && w.bSite(g, s.id); t++) { h.step(1); if (t % 30 === 0) freeze(); }
    check(!w.bSite(g, s.id), "carried off and put down elsewhere, the palace is still a palace where it was");
  });

  test("hand: water put on one fire is not water on the next; and let go between ticks, a lump goes from where the pointer is", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s;
    alight(C);
    lift(h, FLAT, 30, 2); h.up();
    s.handWet = s.burning - 1;   /* (the hand's water, on the fire before this one) */
    for (var j = 0; j < g.m.length; j++) if (g.m[j] === C.M.EMBER || g.m[j] === C.M.FIRE) w.sandSet(g, j, C.M.ASH);
    for (var t = 0; t < 60 && s.burning; t++) h.step(1);
    check(!s.burning && !/sky/.test(said(g, "blaze" + s.id) || "") && !C.p.feel, "the sky put out a fire it never had water on: " + said(g, "blaze" + s.id));
    g.size = 2; w.sandDab(g, FLAT, 30, C.M.SAND, true);
    lift(h, FLAT, 30, 2);
    at(h, FLAT - 40, 25); h.flick(0, 0); h.up();
    check(g.hand.fly && g.hand.fly.x === FLAT - 40, "let go with the pointer at " + (FLAT - 40) + ", it went from " + (g.hand.fly && g.hand.fly.x));
  });

  test("hand: the bottom of a burning house, sunk in the lake with its roof still alight on the ground, is not the sky putting it out", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s, p = C.p, px = 106, top = -1, y, t;
    alight(C);
    p.task = null; stand(C, p, FLAT);
    for (y = 60; y < g.gh; y++) if (w.LIQUID[g.m[y * g.gw + px]]) { top = y; break; }
    lift(h, C.cx, s.y1 - 3, 7);
    var e = g.hand.sites.filter(function (q) { return q.id === s.id; })[0];
    check(e && e.n >= 0.3 * e.of && w.iFlames(g, s).length, "(the test wants the bottom of it lifted and the roof still alight: " + JSON.stringify(e) + ")");
    carry(h, px, top - 3 - bottom(g)); h.up();
    for (t = 0; t < 600 && g.hand.fly; t++) h.step(1);
    check(!s.handSaved && !/sky/.test(said(g, "blaze" + s.id) || "") && !p.feel, "with its roof alight where it was, the sky put it out: " + said(g, "blaze" + s.id));
  });

  test("hand: a pebble that hits a screen standing in front of a window leaves the window be; one that smashes somebody's glass window is held against it", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s, M = C.M, p = C.p, y, t, wy = s.F - 4, wj = wy * g.gw + s.x0;
    g.peasants.forEach(function (q, i) { if (Math.abs(q.x - s.x0) < 40) stand(C, q, FLAT + i); });
    /* (a window in the wall, and a screen of metal three columns in front of it) */
    w.sandSet(g, wj, M.PLANK); g.aux[wj] = 1; s.win.push(wj);
    for (y = wy - 8; y <= s.F; y++) w.sandSet(g, y * g.gw + s.x0 - 3, M.METAL);
    pebble(h, s.x0 - 20, wy, M.STONE, 2);
    flick(h, 4, 0, 60);
    for (t = 0; t < 300 && g.np; t++) h.step(1);
    check(g.m[wj] === M.PLANK && g.aux[wj] === 1 && !p.feel, "a pebble into the screen knocked the window out behind it: feel " + p.feel);
    /* (a window of glass in the wall, where a pebble can get at it) */
    var D = housed(), hd = D.h, gd = D.g, wd = D.w, sd = D.s, gy = sd.F - 4, gj = gy * gd.gw + sd.x0;
    gd.peasants.forEach(function (q, i) { if (Math.abs(q.x - sd.x0) < 40) stand(D, q, FLAT + i); });   /* (nobody in the way of it) */
    wd.sandSet(gd, gj, D.M.GLASS); sd.win.push(gj);
    pebble(hd, sd.x0 - 20, gy, D.M.STONE, 2);
    flick(hd, 4, 0, 60);
    for (t = 0; t < 300 && gd.np; t++) hd.step(1);
    check(gd.m[gj] !== D.M.GLASS && D.p.feel === -1 && gd.hand.cruel === 1, "the glass window: " + gd.m[gj] + ", " + D.p.name + " " + D.p.feel + ", cruel " + gd.hand.cruel);
  });

  test("hand: a rider put down under a ledge with no room for them where they sat is not buried in it, and does not thank it", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, M = C.M, q = g.peasants[3], y = ground(w, g, FLAT), x, k;
    for (x = FLAT - 8; x <= FLAT + 8; x++) for (k = y + 1; k <= y + 8; k++) w.sandSet(g, k * g.gw + x, M.METAL);   /* (ground that does not slump into the hole) */
    stand(C, q, FLAT);
    h.pause(true);
    lift(h, FLAT, y + 3, 3);
    check(q.ride, "(the test wants a rider)");
    /* (a ledge of metal where they sat, while they were up, and none where the lump goes back to) */
    for (x = FLAT - 6; x <= FLAT + 6; x++) for (k = y - 6; k <= y - 1; k++) w.sandSet(g, k * g.gw + x, M.METAL);
    check(w.handFits(g, g.hand.held.c, FLAT, y + 3), "(the test wants the lump to go back into its hole)");
    h.flick(0, 0); h.up(); h.pause(false);
    for (var t = 0; t < 600 && g.hand.fly; t++) h.step(1);
    check(!g.hand.fly, "it never came down");
    for (t = 0; t < 400; t++) h.step(1);
    check(!q.dead && !(q.buried > 0) && !w.pStiffAt(g, q.x, q.y) && !(q.feel > 0), q.name + ": dead " + q.dead + ", buried " + q.buried + ", feel " + q.feel + ", at " + q.x.toFixed(1) + "," + q.y);
  });

  /* (from the review, phase 6, round 3) */
  test("hand: let go before the next update in a one-screen valley, it goes from where the pointer is; loaded from a save mid-hold, from where it was held, wherever the pointer is", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w;
    g.size = 2; w.sandDab(g, FLAT, 30, C.M.SAND, true);
    lift(h, FLAT, 30, 2); h.step(1);
    /* (the pointer moved, as the browser moves it: the screen's place, and the cell under it worked out at the update) */
    g.mx = h.PANEL + (FLAT - 60) * h.CELL; g.my = h.PLAY_Y + 40 * h.CELL;   /* (as at() puts it: the cell's corner) */
    h.flick(0, 0); h.up();
    check(g.hand.fly && g.hand.fly.x === FLAT - 60 && g.hand.fly.y === 40, "let go with the pointer over " + (FLAT - 60) + ",40, it went from " + (g.hand.fly && [g.hand.fly.x, g.hand.fly.y]));
    /* (saved while held at one place, and loaded with the pointer at another: the browser keeps its own pointer) */
    var D = housed(), hd = D.h, gd = D.g;
    gd.size = 2; D.w.sandDab(gd, FLAT, 30, D.M.SAND, true);
    lift(hd, FLAT, 30, 2); carry(hd, FLAT - 50, 50);
    var doc = JSON.parse(JSON.stringify(hd.saveDoc())), Hx = gd.hand.held.x, Hy = gd.hand.held.y;
    var e = H.open({ seed: 6 }); e.mouse(200, 20);
    e.game.saveLoad(e.g, doc, { keepPointer: true });   /* (as the browser loads one: its own pointer kept) */
    check(e.g.hand.fly && e.g.hand.fly.x === Hx && e.g.hand.fly.y === Hy, "saved held at " + Hx + "," + Hy + ", loaded with the pointer at 200,20, it was let go at " + (e.g.hand.fly && [e.g.hand.fly.x, e.g.hand.fly.y]));
  });

  test("hand: a burning house sunk in the lake with some of its fire walled off from the water is not the sky putting it out while that is alight, and is judged once it is out or the time is up; a rider set down in the pond does not thank it", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s, M = C.M, p = C.p, px = 106, top = -1, y, t, k, e = -1;
    alight(C);
    p.task = null; stand(C, p, FLAT);
    /* (one ember of the roof, walled round with metal) */
    s.plan.forEach(function (q) { if (e < 0 && g.m[q.i] === M.EMBER) e = q.i; });
    for (k = 0; k < 9; k++) if (k !== 4) w.sandSet(g, e + (k % 3) - 1 + (((k / 3) | 0) - 1) * g.gw, M.METAL);
    for (y = 60; y < g.gh; y++) if (w.LIQUID[g.m[y * g.gw + px]]) { top = y; break; }
    lift(h, C.cx, C.cy + 1, 10);
    carry(h, px, top - 3 - bottom(g)); h.up();
    for (t = 0; t < 600 && g.hand.fly; t++) h.step(1);
    check(!g.hand.fly, "it never came down");
    var lit = 0; for (k = 0; k < g.m.length; k++) if (g.m[k] === M.EMBER) lit++;
    check(lit > 0, "(the test wants an ember still alight when it is down)");
    check(!s.handSaved && !/sky/.test(said(g, "blaze" + s.id) || "") && p.feel !== 3 && s.handD, "dunked with an ember of it walled off from the water, the sky put it out there and then: " + said(g, "blaze" + s.id));
    for (t = 0; t < 1000 && s.handD; t++) h.step(1);
    check(!s.handD && !g.hand.dunks.length, "the dunk was never judged: still on hold " + t + " ticks on");
    /* (somebody on a knoll, set down at the bottom of the pond) */
    var D = housed(), hd = D.h, gd = D.g, wd = D.w, q = gd.peasants[3], px = 106, top = -1;
    var qy = stand(D, q, FLAT);
    for (y = 60; y < gd.gh; y++) if (wd.LIQUID[gd.m[y * gd.gw + px]]) { top = y; break; }
    lift(hd, FLAT, qy + 3, 3);
    check(q.ride, "(the test wants a rider)");
    carry(hd, px, top + 4); hd.up();
    for (t = 0; t < 600 && gd.hand.fly; t++) hd.step(1);
    check(!gd.hand.fly && !(q.feel > 0) && wd.P_SAY.touchdown.indexOf(q.say) < 0, q.name + " set down in the pond thanked it: feel " + q.feel + ", said " + q.say);
  });

  test("hand: a pebble dropped onto one cell standing on the bare floor is set down on it, all of it; a house lifted most of the way and put straight back is not one that flew", function () {
    var h = H.open({ seed: 6 }), g = h.g, w = h.game, M = w.MAT, t, i;
    h.key("c");
    g.peasants.forEach(function (q) { q.dead = 1; });
    w.sandSet(g, (g.gh - 1) * g.gw + 136, M.METAL);
    g.size = 2; w.sandDab(g, 136, 150, M.STONE, true);
    var n0 = 0; for (i = 0; i < g.m.length; i++) if (g.m[i] === M.STONE) n0++;
    lift(h, 136, 150, 2);
    carry(h, 136, g.gh - 1 - 50); h.up();
    for (t = 0; t < 600 && (g.hand.fly || g.np); t++) h.step(1);
    var n1 = 0; for (i = 0; i < g.m.length; i++) if (g.m[i] === M.STONE) n1++;
    check(n1 === n0, "dropped onto a cell on the floor, " + n1 + " of " + n0 + " stone left");
    /* (most of a house, and put back where it was: it is all there) */
    var C = housed(), hc = C.h, gc = C.g, s = C.s;
    hc.pause(true);
    lift(hc, C.cx, C.cy, 7);
    var e = gc.hand.sites.filter(function (q) { return q.id === s.id; })[0];
    check(e && e.n > 0.6 * e.of && e.n < 0.9 * e.of, "(the test wants most of the house, not all of it: " + JSON.stringify(e) + ")");
    hc.flick(0, 0); hc.up(); hc.pause(false);
    for (t = 0; t < 60 && gc.hand.fly; t++) hc.step(1);
    check(!gc.hand.fly && w.bSite(gc, s.id) === s && s.handT == null, "put back whole, the house is marked as one that flew: " + s.handT);
  });

  /* (from the review, phase 6, round 4) */
  test("hand: in an emptied valley, nothing it throws goes through the floor, past a shelf or off one; and with nowhere for the water it lands in to go, the water is not written over", function () {
    function valley() { var h = H.open({ seed: 6 }); h.key("c"); h.g.peasants.forEach(function (q) { q.dead = 1; }); return h; }
    function count(h, v) { var n = 0, g = h.g, k; for (k = 0; k < g.m.length; k++) if (g.m[k] === v) n++; for (k = 0; k < g.np; k++) if (g.pk[k] === h.game.PK_DEBRIS && g.pm[k] === v) n++; return n; }
    /* (a hot stone flicked down and along off a one-cell shelf over the floor) */
    var h = valley(), g = h.g, w = h.game, M = w.MAT, t;
    w.sandSet(g, 159 * g.gw + 136, M.METAL);
    g.size = 1; w.sandSet(g, 150 * g.gw + 136, M.STONE); w.heatAdd(g, 150 * g.gw + 136, 300);
    lift(h, 136, 150, 1);
    var q0 = heatAll(h);
    h.pause(true); at(h, 136, 158); h.step(1); h.flick(4.5, 4.5); h.up(); h.pause(false);
    for (t = 0; t < 400 && (g.hand.fly || g.np); t++) h.step(1);
    check(count(h, M.STONE) === 1 && Math.abs(heatAll(h) - q0) < 1e-6 * Math.abs(q0) + 1e-2, "flicked off the shelf: " + count(h, M.STONE) + " stone, heat " + q0 + " to " + heatAll(h));
    /* (a lump of three: one in a drop of water at the very top, with nowhere above it; one under a ledge; one over the
       open floor, so it cannot come apart either) */
    var D = valley(), gd = D.g, wd = D.game;
    wd.sandSet(gd, 100, M.WATER); wd.sandSet(gd, 99, M.METAL); wd.sandSet(gd, 101, M.METAL); wd.sandSet(gd, 110, M.METAL);
    lift(D, 200, 40, 1);
    gd.hand.held = null;
    gd.hand.fly = { x: 100, y: 0, fx: 100, fy: 0, vx: 0, vy: 0, c: [0, 0, M.STONE, 0, 0, 0, 10, 1, M.STONE, 0, 0, 0, 20, 5, M.STONE, 0, 0, 0], clone: [], wet: 0, t: 0 };
    var w0 = count(D, M.WATER);
    wd.handSet(gd);
    for (t = 0; t < 400 && gd.np; t++) D.step(1);
    check(count(D, M.WATER) === w0 && count(D, M.STONE) === 3, "set down with nowhere for the water to go: water " + w0 + " to " + count(D, M.WATER) + ", stone " + count(D, M.STONE));
  });

  test("hand: water put down in a tray over a fire, held there, is not the sky putting it out", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s, M = C.M, x, y, t, j;
    alight(C);
    var ty = s.y0 - 6;   /* (a metal tray six rows over the roof, the width of the house and a bit) */
    for (x = s.x0 - 3; x <= s.x1 + 3; x++) { w.sandSet(g, ty * g.gw + x, M.METAL); if (x === s.x0 - 3 || x === s.x1 + 3) for (y = ty - 8; y < ty; y++) w.sandSet(g, y * g.gw + x, M.METAL); }
    pondLump(C, 4);
    carry(h, C.cx, ty - 1 - bottom(g)); h.up();
    for (t = 0; t < 300 && g.hand.fly; t++) h.step(1);
    var held = 0; for (x = s.x0 - 2; x <= s.x1 + 2; x++) for (y = ty - 8; y < ty; y++) if (w.WET[g.m[y * g.gw + x]]) held++;
    check(!g.hand.fly && held > 10, "(the test wants the water in the tray: " + held + ")");
    /* (and the fire goes out of itself: what is alight goes to ash, and the house cools) */
    for (t = 0; t < 600 && s.burning; t++) {
      if (t % 10 === 0) for (y = s.y0 - 3; y <= s.y1 + 1; y++) for (x = s.x0 - 2; x <= s.x1 + 2; x++) {
        j = y * g.gw + x;
        if (g.m[j] === M.EMBER || g.m[j] === M.FIRE) w.sandSet(g, j, M.ASH);
        if (g.T[j] > 40) { g.T[j] = 20; g.lat[j] = 0; w.heatAccept(g, j); }
      }
      h.step(1);
    }
    check(!s.burning && !/sky/.test(said(g, "blaze" + s.id) || "") && !(C.p.feel > 0), "water held in a tray over it, the sky put it out: " + said(g, "blaze" + s.id) + ", burning " + s.burning + ", " + C.p.name + " " + C.p.feel);
  });

  test("hand: a scenario recorded before the hand, with MORE open, clicks the field just over the flyout as it was then, and paints", function () {
    var h = H.open({ seed: 5 }), w = h.game, g = h.g;
    function at(sx, sy) { return { x: (sx - h.PANEL) / h.CELL - 0.5, y: (sy - h.PLAY_Y) / h.CELL - 0.5 }; }
    h.select("STONE");
    var r = at(20, w.MORE_Y + 5); h.tap(r.x, r.y);
    check(g.moreOpen, "(the test wants MORE open)");
    var c = at(h.PANEL + 40, w.MORE_TOP + 10), j = Math.round(c.y + 0.5) * g.gw + Math.round(c.x + 0.5);
    h.tap(c.x, c.y);
    h.step(5);
    var sc = h.scenario();
    /* (as it is now, the flyout is that much taller, and the click is on it) */
    var a = H.open({ seed: 5 }); a.replay(sc);
    check(a.g.moreOpen && a.g.m[j] !== w.MAT.STONE, "(the test wants the click on today's flyout)");
    /* (recorded before the hand: the list without it) */
    var old = JSON.parse(JSON.stringify(sc)); old.picks = old.picks.filter(function (n) { return n !== "HAND"; }); delete old.hash;
    var b = H.open({ seed: 5 }); b.replay(old);
    check(!b.g.moreOpen && b.g.m[j] === w.MAT.STONE, "a click over the old flyout, replayed: open " + b.g.moreOpen + ", painted " + (b.g.m[j] === w.MAT.STONE));
    check(b._eval("MORE_TOP") === w.MORE_TOP && b._eval("MORE_H") === w.MORE_H, "the replay left the flyout as it was then");
    /* (and before TRESTLE as well: MORE's flyout shorter again, its top 32 px lower than now) */
    var c2 = at(h.PANEL + 40, w.MORE_TOP + 28), j2 = Math.round(c2.y + 0.5) * g.gw + Math.round(c2.x + 0.5);
    var e = H.open({ seed: 5 }); e.select("STONE"); e.tap(r.x, r.y); e.tap(c2.x, c2.y); e.step(5);
    var older = e.scenario(); older.picks = older.picks.filter(function (n) { return n !== "HAND" && n !== "TRESTLE"; }); delete older.hash;
    var f2 = H.open({ seed: 5 }); f2.replay(older);
    check(!f2.g.moreOpen && f2.g.m[j2] === w.MAT.STONE, "a click over the flyout from before TRESTLE, replayed: open " + f2.g.moreOpen + ", painted " + (f2.g.m[j2] === w.MAT.STONE));
    /* (and a click on its edge, under its last row, then, is not TRESTLE's row, now) */
    var c3 = at(h.PANEL + 40, w.MORE_Y + w.ROWH - 2);
    var e3 = H.open({ seed: 5 }); e3.select("STONE"); e3.tap(r.x, r.y); e3.tap(c3.x, c3.y); e3.step(2);
    var oldest = e3.scenario(); oldest.picks = oldest.picks.filter(function (n) { return n !== "HAND" && n !== "TRESTLE"; }); delete oldest.hash;
    var f3 = H.open({ seed: 5 }); f3.replay(oldest);
    check(f3.pick[f3.g.sel].name === "STONE", "a click on the edge of the flyout from before TRESTLE picked " + f3.pick[f3.g.sel].name);
    check(f3._eval("MORE_ROWS").length === w.MORE_ROWS.length, "the replay left the flyout's rows short");
    /* (and the arrows, from before the hand: down from TRESTLE was PEASANT, and MORE's row still showed TRESTLE, so MORE
       opened on it, and the sky got trestle) */
    var k4 = H.open({ seed: 5 }); k4.select("TRESTLE"); k4.key("arrowdown"); k4.tap(r.x, r.y);
    var sky = at(h.PANEL + 200, h.PLAY_Y + 40), js = Math.round(sky.y + 0.5) * g.gw + Math.round(sky.x + 0.5);
    k4.tap(sky.x, sky.y); k4.step(2);
    var pre = k4.scenario(); delete pre.hash;
    pre.picks = pre.picks.filter(function (n) { return n !== "HAND"; });
    pre.ops.forEach(function (o) { if (o.op === "key") o.args.sel = "PEASANT"; });
    var f4 = H.open({ seed: 5 }); f4.replay(pre);
    /* (and Y, then an arrow at once, before the next tick: MORE's row remembers HAND, and opens on it, then and replayed) */
    var k5 = H.open({ seed: 5 }); k5.key("y"); k5.key("arrowdown"); k5.tap(r.x, r.y); k5.tap(sky.x, sky.y); k5.step(2);
    var r5 = H.open({ seed: 5 }).replay(k5.scenario());
    check(k5.pick[k5.g.sel].name === "HAND" && r5.matches, "Y and an arrow, then MORE and a press in the sky: picked " + k5.pick[k5.g.sel].name + ", replayed to " + r5.hash + " not " + k5.hash());
    check(f4.pick[f4.g.sel].name === "TRESTLE" && f4.g.m[js] === w.MAT.TRESTLE && !f4.g.hand, "an arrow from before the hand, replayed, and MORE opened on " + f4.pick[f4.g.sel].name + ", the sky " + f4.g.m[js] + (f4.g.hand ? ", and the hand lifted" : ""));
  });

  /* (from the review, phase 6, round 5) */
  test("hand: a lump of glass dropped onto a shelf of ice over the bare floor comes apart on the ice, not on the floor under it; and with the pool full, what is set down over the top of the valley is put down, not lost", function () {
    function valley() { var h = H.open({ seed: 6 }); h.key("c"); h.g.peasants.forEach(function (q) { q.dead = 1; }); return h; }
    function count(h, v) { var n = 0, g = h.g, k; for (k = 0; k < g.m.length; k++) if (g.m[k] === v) n++; for (k = 0; k < g.np; k++) if (g.pk[k] === h.game.PK_DEBRIS && g.pm[k] === v) n++; return n; }
    var h = valley(), g = h.g, w = h.game, M = w.MAT, t, x, n = 0;
    for (x = 120; x <= 140; x++) w.sandSet(g, 150 * g.gw + x, M.ICE);
    g.size = 2; w.sandDab(g, 130, 100, M.GLASS, true);
    lift(h, 130, 100, 2); h.flick(0, 0); h.up();
    for (t = 0; t < 400 && (g.hand.fly || g.np); t++) h.step(1);
    for (x = 120; x <= 140; x++) if (g.m[(g.gh - 1) * g.gw + x] !== M.EMPTY) n++;
    check(count(h, M.SAND) > 0 && !n, "a lump of glass dropped on the ice: " + count(h, M.SAND) + " sand, " + n + " cells of it on the floor under the shelf");
    /* (two stones, one over the other, set down on a shelf on the top row: the upper one over the top. the pool full) */
    var D = valley(), gd = D.g, wd = D.game;
    wd.sandSet(gd, gd.gw + 150, M.METAL);
    lift(D, 200, 40, 1);
    while (wd.partAdd(gd, wd.PK_GLINT, 10.5, 10.5, 0, 0, 100000, 0) >= 0);
    gd.hand.held = null;
    gd.hand.fly = { x: 150, y: 0, fx: 150, fy: 0, vx: 0, vy: 0, c: [0, 0, M.STONE, 0, 0, 0, 0, -1, M.STONE, 0, 0, 0], clone: [], wet: 0, t: 0 };
    wd.handSet(gd);
    check(count(D, M.STONE) === 2, "set down with the pool full, " + count(D, M.STONE) + " of 2 stones");
  });

  test("hand: somebody stood on the lip of a ledge comes up with it; and a whole hill flicked hard, whichever way, is too slow to knock anybody over", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, M = C.M, q = g.peasants[3], y = stand(C, q, FLAT), k;
    /* (nothing under their own feet: they stand on the lip of the ground to their right) */
    for (k = 1; k <= 4; k++) w.sandSet(g, (y + k) * g.gw + FLAT, M.EMPTY);
    lift(h, FLAT + 3, y + 3, 3);
    check(g.hand.held && w.pSolid(g, FLAT + 1, y + 1) === false, "(the test wants the ground to their right lifted)");
    check(q.state === "held" && q.ride, "stood on the lip of what went up, " + q.name + " is " + q.state);
    /* (a hill, the whole brush of it, flicked down and along at a walker as hard as a hand flicks) */
    var D = housed(), hd = D.h, gd = D.g, wd = D.w, p = gd.peasants[3], py = stand(D, p, FLAT), t;
    gd.peasants.forEach(function (o) { if (o !== p && Math.abs(o.x - FLAT) < 60) stand(D, o, 30); });
    /* (in the air, its lower edge already at their shoulder: what knocks them, the first ticks, is the flick, not a fall) */
    gd.size = 16; wd.sandDab(gd, FLAT - 8, py - 18, D.M.STONE, true);
    lift(hd, FLAT - 8, py - 18, 16);
    check(gd.hand.held.c.length / 6 > 600, "(the test wants a hill: " + gd.hand.held.c.length / 6 + ")");
    hd.flick(4.5, 4.5); hd.up();
    for (t = 0; t < 2 && gd.hand.fly; t++) hd.step(1);
    check(!gd.hand.cruel && !p.feel, "a hill flicked at " + p.name + " knocked them flat: cruel " + gd.hand.cruel + ", feel " + p.feel);
  });

  /* (from the review, phase 6, round 6) */
  test("hand: half a house sunk with its fire, and lifted again before it is judged, is on hold for both, and the rest of its fire taken up is not fire the lake put out; a rider on the lip of it, carried to the wall, is set down in the valley where they can walk", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s, M = C.M, p = C.p, px = 106, top = -1, y, t, k;
    alight(C);
    delete g.know.bucket;   /* (and no brigade: what is left where it stood burns on) */
    var roof = -1;   /* (and the right-hand wall alight as well, high up) */
    s.plan.forEach(function (q) { var x = q.i % g.gw, y = (q.i / g.gw) | 0; if (q.v !== M.EMPTY && x >= s.x1 - 2 && y <= s.F - 4 && g.m[q.i] !== M.EMPTY) { w.sandSet(g, q.i, M.EMBER); if (roof < 0) roof = y; } });
    p.task = null; stand(C, p, FLAT);
    for (y = 60; y < g.gh; y++) if (w.LIQUID[g.m[y * g.gw + px]]) { top = y; break; }
    /* (the left half of it, burning, sunk in the lake; the right half still burning where it stood) */
    lift(h, s.x0 + 2, C.cy + 3, 8);
    var e0 = g.hand.sites.filter(function (q) { return q.id === s.id; })[0];
    check(e0 && e0.n >= 0.3 * e0.of && w.iFlames(g, s).length, "(the test wants a good part of it lifted, and the rest still alight: " + JSON.stringify(e0) + ")");
    carry(h, px, top - 3 - bottom(g)); h.up();
    for (t = 0; t < 600 && g.hand.fly; t++) h.step(1);
    check(s.handD && g.hand.dunks.length === 1 && w.iFlames(g, s).length, "(the test wants the dunk waiting to be judged, the rest of it alight: " + s.handD + ", " + w.iFlames(g, s).length + ")");
    /* (a second lift, of the bottom of the right-hand wall, nothing alight in it, held a while and let go: the dunk's
       hold is its own, and the first's waits on) */
    lift(h, s.x1, s.F - 2, 1);
    var hot = 0; g.hand.held.c.forEach(function (v, i) { if (i % 6 === 2 && v === M.EMBER) hot++; });
    check(s.handH && s.handD && !hot, "(lifted again, nothing alight in it, it is on hold for both: " + s.handH + ", " + s.handD + ", " + hot + ")");
    for (t = 0; t < 30; t++) h.step(1);
    h.flick(0, 0); h.up(); down(h);
    check(s.handD && !s.handH && w.bSite(g, s.id) === s && !s.handSaved, "let go of the second lift, the first's hold went with it: on hold " + s.handD + ", saved " + s.handSaved);
    /* (and the rest of its fire taken up from where it stood: not the lake's, whatever happens to it) */
    var ej = -1; for (k = 0; k < g.m.length && ej < 0; k++) if (g.m[k] === M.EMBER && (k % g.gw) >= s.x0 - 2 && (k % g.gw) <= s.x1 + 2 && ((k / g.gw) | 0) >= s.y0 - 3 && ((k / g.gw) | 0) <= s.y1 + 1) ej = k;
    check(ej >= 0, "(the test wants an ember left where it stood)");
    lift(h, ej % g.gw, (ej / g.gw) | 0, 1);   /* (one ember of it: not a cell of its plan) */
    for (t = 0; t < 40; t++) h.step(1);
    check(!s.handSaved && !s.handD && !g.hand.dunks.length && s.handH, "the rest of its fire taken up, the dunk was the sky's, or is still waiting, or its books are not held: saved " + s.handSaved + ", on hold " + s.handD + ", " + s.handH);
    h.flick(0, 0); h.up(); down(h);
    /* (somebody on the lip of a ledge, carried to the wall and put down there) */
    var D = housed(), hd = D.h, gd = D.g, wd = D.w, q = gd.peasants[3], qy = stand(D, q, FLAT);
    for (k = 1; k <= 4; k++) wd.sandSet(gd, (qy + k) * gd.gw + FLAT, D.M.EMPTY);
    lift(hd, FLAT + 3, qy + 3, 3);
    check(q.ride, "(the test wants a rider on the lip)");
    carry(hd, 0, qy - 20); hd.up();
    for (t = 0; t < 400 && gd.hand.fly; t++) hd.step(1);
    for (t = 0; t < 200; t++) hd.step(1);
    check(q.x >= 1 && q.x <= gd.gw - 1 && !q.dead, q.name + " was put down at " + q.x.toFixed(1) + ", out of the valley, or where nobody can walk");
  });

  /* (from the review, phase 6, round 8) */
  test("hand: a duck carried to the wall and put down there can walk away; and in an emptied valley a pebble flicked into a glass wall smashes it", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, d = g.ducks.filter(function (u) { return u.state === "swim" || u.state === "walk"; })[0], t;
    check(d, "(the test wants a duck about)");
    /* (on a perch of one cell, in the sky) */
    w.sandSet(g, 60 * g.gw + 60, C.M.METAL);
    d.x = 60.5; d.y = 59; d.state = "walk"; d.vx = d.vy = 0;
    lift(h, 60, 60, 1);
    check(d.ride && g.hand.held.c.length === 6, "(the test wants the duck on a perch of one cell)");
    carry(h, 0, 60); h.up();
    for (t = 0; t < 400 && g.hand.fly; t++) h.step(1);
    check(d.x >= 1 && d.x <= g.gw - 1, "the duck was put down at " + d.x);
    var E = H.open({ seed: 6 }), ge = E.g, we = E.game, M = we.MAT, y, glass0 = 0, glass1 = 0;
    E.key("c"); ge.peasants.forEach(function (q) { q.dead = 1; });
    for (y = 140; y < 160; y++) for (var x = 120; x < 123; x++) we.sandSet(ge, y * ge.gw + x, M.GLASS);
    for (var j = 0; j < ge.m.length; j++) if (ge.m[j] === M.GLASS) glass0++;
    ge.size = 2; we.sandSet(ge, 150 * ge.gw + 100, M.STONE); we.sandSet(ge, 150 * ge.gw + 101, M.STONE);
    lift(E, 100, 150, 2);
    E.pause(true); at(E, 112, 150); E.step(1); E.flick(4.5, 0); E.up(); E.pause(false);
    for (t = 0; t < 100 && ge.hand.fly; t++) E.step(1);
    for (j = 0; j < ge.m.length; j++) if (ge.m[j] === M.GLASS) glass1++;
    check(glass1 < glass0, "the glass wall in an emptied valley stood it: " + glass0 + " glass, " + glass1 + " after");
  });

  /* (from the review, phase 6, round 9) */
  test("hand: an ember of a burning house just outside its walls, lifted on its own, holds its fire's books; a duck put down at the right-hand wall can walk, and one put down with no room for it is not buried", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s, M = C.M, t;
    alight(C);
    var ej = (s.F - 3) * g.gw + s.x0 - 2;   /* (two columns out from the wall: in the fire's reach, not in the house's box) */
    w.sandSet(g, ej, M.EMBER);
    lift(h, s.x0 - 2, s.F - 3, 1);
    var e = g.hand.sites.filter(function (q) { return q.id === s.id; })[0];
    check(e && e.fire > 0 && s.handH, "an ember just outside the house, lifted: " + JSON.stringify(e) + ", on hold " + s.handH);
    h.flick(0, 0); h.up(); down(h);
    /* (ducks, on perches of one cell, in the sky) */
    function perch(x, y) { var d = g.ducks.filter(function (u) { return !u.dead; })[0]; w.sandSet(g, y * g.gw + x, M.METAL); d.x = x + 0.5; d.y = y - 1; d.state = "walk"; d.vx = d.vy = 0; d.ride = null; lift(h, x, y, 1); check(d.ride, "(the test wants a duck on its perch)"); return d; }
    var d = perch(200, 40), gr = ground(w, g, g.gw - 1);
    carry(h, g.gw - 1, gr - 1); h.up();   /* (and put down gently, by the wall) */
    for (t = 0; t < 400 && g.hand.fly; t++) h.step(1);
    check(d.x <= g.gw - 2 && d.x >= 1, "the duck was put down at " + d.x + ", where a duck cannot walk");
    /* (and one set down in a gap the perch fits and the duck does not) */
    var gy = ground(w, g, FLAT);
    for (var cx = FLAT - 8; cx <= FLAT + 8; cx++) w.sandSet(g, (gy - 1) * g.gw + cx, M.METAL);   /* (on the ground, a slot a cell high under a ceiling of metal) */
    var b = perch(120, 30);
    h.pause(true); at(h, FLAT, gy); h.step(1); h.flick(0, 0); h.up(); h.pause(false);
    for (t = 0; t < 300 && g.hand.fly; t++) h.step(1);
    for (t = 0; t < 700; t++) h.step(1);   /* (a duck wedged in something gives up after 400: ducks.js) */
    check(!b.dead && !w.dBlocked(g, b.x, b.y), "a duck set down with no room for it: dead " + b.dead + ", at " + b.x + "," + b.y);
  });

  /* (from the review, phase 6, round 10) */
  test("hand: a house that fits at the bottom of the valley can move there though its box would not; a duck swimming on the bottom row comes up with the water; a fire put out by the sky just before the house is a ruin is still the sky's; two fires put out are two thank-yous", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s, M = C.M, p = C.p, t, k;
    var low = 0; s.plan.forEach(function (q) { if (q.v !== M.EMPTY) low = Math.max(low, (q.i / g.gw) | 0); });
    s.handH = 1; s.y1 = Math.max(s.y1, low + 2);   /* (a box reaching two rows past its lowest cell) */
    var of = s.plan.filter(function (q) { return q.v !== M.EMPTY; }).length;
    check(w.handCan(g, s, { n: of, of: of }, 0, g.gh - 1 - low), "a house whose cells fit at the bottom of the valley could not go there");
    delete s.handH;
    /* (a duck on a puddle on the bottom row of an emptied valley) */
    var E = H.open({ seed: 6 }), ge = E.g, we = E.game;
    E.key("c"); ge.peasants.forEach(function (q) { q.dead = 1; });
    for (var x = 95; x <= 105; x++) we.sandSet(ge, (ge.gh - 1) * ge.gw + x, M.WATER);
    var d = ge.ducks.filter(function (u) { return !u.dead; })[0];
    if (!d) { E.spawnDuck(100, ge.gh - 2); d = ge.ducks[ge.ducks.length - 1]; }
    d.x = 100.5; d.y = ge.gh - 1; d.state = "swim"; d.vx = d.vy = 0;
    lift(E, 100, ge.gh - 1, 1);
    check(d.ride && d.state === "held", "a duck swimming on the bottom row was left behind: " + d.state);
    /* (water from the sky on a burning house, the fire out, and most of the house gone before the next look for flames) */
    alight(C);
    lift(h, FLAT, 30, 2); h.up();   /* (the hand, about) */
    s.handWet = g.tick; s.handWetD = s.doused || 0;
    for (k = 0; k < g.m.length; k++) if (g.m[k] === M.EMBER || g.m[k] === M.FIRE) w.sandSet(g, k, M.ASH);
    var n = 0; s.plan.forEach(function (q) { if (q.v !== M.EMPTY && n++ % 5 !== 0) w.sandSet(g, q.i, M.EMPTY); });
    for (t = 0; t < 240 && w.bSite(g, s.id); t++) h.step(1);
    check(!w.bSite(g, s.id) && s.handSaved && g.feed.some(function (q) { return /^the sky put out the fire at/.test(q.text); }), "gone before the books were closed, the sky's fire was nobody's: saved " + s.handSaved);
    /* (and the same, with an ember still alight just outside its wall, in the fire's reach: not out, so not the sky's) */
    var F = housed(), hf = F.h, gf = F.g, wf = F.w, sf = F.s;
    alight(F); lift(hf, FLAT, 30, 2); hf.up();
    sf.handWet = gf.tick; sf.handWetD = sf.doused || 0;
    for (k = 0; k < gf.m.length; k++) if (gf.m[k] === M.EMBER || gf.m[k] === M.FIRE) wf.sandSet(gf, k, M.ASH);
    n = 0; sf.plan.forEach(function (q) { if (q.v !== M.EMPTY && n++ % 5 !== 0) wf.sandSet(gf, q.i, M.EMPTY); });
    var ex = sf.x0 - 2, ey = sf.y1 - 1; wf.sandSet(gf, ey * gf.gw + ex - 1, M.METAL); wf.sandSet(gf, (ey + 1) * gf.gw + ex, M.METAL); wf.sandSet(gf, ey * gf.gw + ex, M.EMBER);
    delete gf.know.bucket;
    for (t = 0; t < 240 && wf.bSite(gf, sf.id); t++) hf.step(1);
    var alive = wf.iFlames(gf, sf).length;
    check(!sf.handSaved, "gone with an ember of it still alight in its reach, the sky put it out: alight " + alive);
    /* (two fires put out, one after the other: two things left out for it) */
    var D = housed(), gd = D.g, wd = D.w, sd = D.s, o = D.p, gifts = 0;
    wd.handLift(gd); gd.hand.held = null;
    o.coal = 2; o.gold = 0; o.logs = 0;
    sd.burning = gd.tick; wd.handPutOut(gd, sd);
    sd.burning = gd.tick + 1; wd.handPutOut(gd, sd);
    check(o.owed === 2, "two fires put out, " + o.name + " owes " + o.owed);
    for (k = 0; k < 2; k++) {
      stand(D, o, FLAT); o.task = null;
      check(o.thank != null && wd.handThank(gd, o), o.name + " did not thank it, the " + (k ? "second" : "first") + " time");   /* (as iPick asks: owed, then thanked) */
      for (t = 0; t < 900 && o.task && o.task.kind === "thank"; t++) D.h.step(1);
      gifts = gd.hand.gifts.length;
    }
    check(gifts === 2 && !o.thank && !o.owed && o.coal === 0, "two fires, " + gifts + " things left out; still owed " + o.owed + ", coal " + o.coal);
  });

  /* (from the review, phase 6, round 12) */
  test("hand: a lump set down with some of it over the top of the valley loses none of it; a press with HAND does not throw with where the cursor was before it; a fire the sky put out at a hut nobody lives in is thanked for by whoever lives nearest", function () {
    var h = H.open({ seed: 6 }), g = h.g, w = h.game, M = w.MAT, t, k, n0 = 0, n1 = 0;
    g.size = 8; w.sandDab(g, 135, 15, M.METAL, true); w.sandDab(g, 120, 65, M.BRICK, true);
    for (k = 0; k < g.m.length; k++) if (g.m[k] === M.BRICK) n0++;
    lift(h, 120, 65, 8); at(h, 135, 8); h.step(1); h.flick(0, 0); h.up();
    for (t = 0; t < 60 && (g.hand.fly || g.np); t++) h.step(1);
    for (k = 0; k < g.m.length; k++) if (g.m[k] === M.BRICK) n1++;
    check(n1 === n0, "set down on the metal, partly over the top of the valley: " + n1 + " of " + n0 + " stonework left");
    /* (the pointer moved away, a tick, and then a press on the stone and let go at once) */
    var D = H.open({ seed: 6 }), gd = D.g, wd = D.game;
    gd.size = 1; wd.sandSet(gd, 40 * gd.gw + 80, M.STONE);
    D.select("HAND"); at(D, 30, 40); D.step(1);
    at(D, 80, 40); D.down(0); D.up();
    check(gd.hand.fly && Math.abs(gd.hand.fly.vx) < 0.5, "pressed and let go where it was, it was thrown at " + (gd.hand.fly && gd.hand.fly.vx));
    /* (the empty hut, alight, and put out by the sky: nobody's, and nobody asked) */
    var C = housed(), hc = C.h, gc = C.g, wc = C.w, hut = gc.sites.filter(function (o) { return o.hut && o.x0 > 150; })[0];
    check(hut && !wc.bOwner(gc, hut), "(the test wants the empty hut, nobody's)");
    lift(hc, FLAT, 30, 2); hc.up();
    hut.burning = gc.tick;
    wc.handPutOut(gc, hut);
    var owe = gc.peasants.filter(function (q) { return q.thank != null; });
    check(owe.length === 1 && Math.abs(owe[0].x - hut.cx) <= 80, "the sky put out the empty hut, and " + owe.length + " owe it a thank-you");
  });

  /* (from the review, phase 6, round 13) */
  test("hand: the harness presses and lets go as the browser does, and replays a scenario from before that as it was; a hut nobody's, saved far from everybody, is still thanked; a place to leave a thank-you that could not be got to is not tried again", function () {
    var M = H.open({ seed: 6 }).game.MAT;
    function rec() {
      var h = H.open({ seed: 6 });
      h.set("g.size", 1); h.place(80, 40, "STONE");   /* (through the harness, so that it replays) */
      h.select("HAND"); at(h, 30, 40); h.step(1);
      at(h, 80, 40); h.down(0); h.up();
      return h;
    }
    var a = rec(), sc = a.scenario();
    check(sc.version === 3 && a.g.hand.fly && Math.abs(a.g.hand.fly.vx) < 0.5, "(recorded now, a press and let-go where it was: thrown at " + (a.g.hand.fly && a.g.hand.fly.vx) + ")");
    var b = H.open({ seed: 6 }), rb = b.replay(sc);
    check(rb.matches, "a scenario recorded now did not replay to its hash");
    var old = JSON.parse(JSON.stringify(sc)); old.version = 2; delete old.hash;
    var d = H.open({ seed: 6 }); d.replay(old);
    check(d.g.hand.fly && Math.abs(d.g.hand.fly.vx) > 4, "a scenario from before version 3 replayed with today's press: thrown at " + (d.g.hand.fly && d.g.hand.fly.vx));
    /* (carried along, then held still a few ticks, and let go: still) */
    var e = H.open({ seed: 6 }), ge = e.g, we = e.game;
    ge.size = 1; we.sandSet(ge, 40 * ge.gw + 80, M.STONE);
    lift(e, 80, 40, 1);
    for (var t = 1; t <= 10; t++) { at(e, 80 + t * 2, 40); e.step(1); }
    e.step(4); e.up();   /* (still for 80 ms or so: under the 90 the game waits before it calls the cursor stopped) */
    check(e.g.hand.fly && Math.abs(e.g.hand.fly.vx) < 0.5, "carried, held still a few ticks and let go, it was thrown at " + (e.g.hand.fly && e.g.hand.fly.vx));
    /* (the empty hut, saved by the sky, with everybody far off) */
    var C = housed(), gc = C.g, wc = C.w, hut = gc.sites.filter(function (o) { return o.hut && o.x0 > 150; })[0];
    lift(C.h, FLAT, 30, 2); C.h.up();
    gc.peasants.forEach(function (q, i) { stand(C, q, 10 + i); });
    hut.burning = gc.tick; wc.handPutOut(gc, hut);
    check(gc.peasants.filter(function (q) { return q.thank != null; }).length === 1, "saved far from everybody, the empty hut was thanked by nobody");
    /* (a place to leave it that they could not get to: somewhere else, the next time) */
    var D = housed(), gd = D.g, wd = D.w, q = gd.peasants[3];
    lift(D.h, FLAT, 30, 2); D.h.up();
    stand(D, q, FLAT); q.coal = 1; q.gold = 0; q.logs = 0; q.thank = gd.tick;
    check(wd.handThank(gd, q) && q.task && q.task.kind === "thank", "(the test wants somewhere to leave it)");
    var j1 = q.task.y * gd.gw + q.task.x;
    q.thankNo = [j1]; q.task = null;
    check(wd.handThank(gd, q) && q.task && q.task.y * gd.gw + q.task.x !== j1, "the place they could not get to was tried again");
  });

  /* (from the review, phase 6, round 14) */
  test("hand: a lump flicked down onto a pile from over the top of the valley loses none of it; the harness's hash knows a lump in the air; water beside a fire with a wall between is not water on it; a thank-you errand cut short is not tried again at the same place", function () {
    var h = H.open({ seed: 6 }), g = h.g, w = h.game, M = w.MAT, t, k, n0 = 0, n1 = 0;
    h.key("c"); g.peasants.forEach(function (q) { q.dead = 1; });
    /* (a pillar of metal up to the sixth row, room to fall either side of it, and stonework dropped on it from up there) */
    for (var py = 6; py < 60; py++) for (var px = 134; px <= 136; px++) w.sandSet(g, py * g.gw + px, M.METAL);
    g.size = 5; w.sandDab(g, 120, 65, M.BRICK, true);
    for (k = 0; k < g.m.length; k++) if (g.m[k] === M.BRICK) n0++;
    lift(h, 120, 65, 5); at(h, 135, 2); h.step(1); h.flick(0, 4.5); h.up();
    check(g.hand.fly && g.hand.fly.y + w.handBox(g.hand.fly.c)[2] < 0, "(the test wants some of it over the top of the valley)");
    for (t = 0; t < 400 && (g.hand.fly || g.np); t++) h.step(1);
    for (k = 0; k < g.m.length; k++) if (g.m[k] === M.BRICK) n1++;
    check(n1 === n0, "flicked down onto the pile from over the top: " + n1 + " of " + n0 + " stonework left");
    /* (two stones in the air, one let go still and one flicked: not the same world) */
    function stone(vx) { var e = H.open({ seed: 6 }); e.g.size = 1; e.game.sandSet(e.g, 40 * e.g.gw + 80, M.STONE); lift(e, 80, 40, 1); e.flick(vx, 0); e.up(); e.step(3); return e; }
    var a = stone(0), b = stone(4.5);
    check(a.g.hand.fly && b.g.hand.fly && a.hash() !== b.hash(), "two lumps in the air going different ways hashed the same: " + a.hash());
    /* (water two columns out from a burning house, a stone wall between) */
    var C = housed(), gc = C.g, wc = C.w, sc = C.s;
    alight(C); lift(C.h, FLAT, 30, 2); C.h.up();
    var wy = sc.F - 2;
    wc.sandSet(gc, wy * gc.gw + sc.x0, M.EMBER);   /* (its wall alight there: water beside it gets at it) */
    wc.handDouse(gc, [0, 0, M.WATER, 0, 0, 0], sc.x0 - 2, wy);
    check(sc.handWet === gc.tick, "(the test wants water beside the burning wall to count, with nothing between)");
    delete sc.handWet;
    wc.sandSet(gc, wy * gc.gw + sc.x0 - 1, M.STONE);
    wc.handDouse(gc, [0, 0, M.WATER, 0, 0, 0], sc.x0 - 2, wy);
    check(!sc.handWet, "water beside the fire, a stone wall between, was water on it");
    /* (a thank-you errand set off on, and cut short before it got anywhere: next time, somewhere else) */
    var D = housed(), gd = D.g, wd = D.w, q = gd.peasants[3];
    lift(D.h, FLAT, 30, 2); D.h.up();
    stand(D, q, FLAT); q.coal = 1; q.gold = 0; q.logs = 0; q.thank = gd.tick;
    check(wd.handThank(gd, q) && q.task && q.task.kind === "thank", "(the test wants somewhere to leave it)");
    var j1 = q.task.y * gd.gw + q.task.x;
    q.task = null;   /* (waded into the pond: pStep drops an errand for that) */
    check(wd.handThank(gd, q) && q.task && q.task.y * gd.gw + q.task.x !== j1, "cut short, the same place was tried again");
  });

  /* (from the review, phase 6, round 15) */
  test("hand: water beside a wall of the house standing is not water on its fire; the harness's hash knows where a lump's cells are on it; a rider lifted with the trees they walk through is set down on their feet", function () {
    var C = housed(), gc = C.g, wc = C.w, sc = C.s, M = C.M;
    alight(C); lift(C.h, FLAT, 30, 2); C.h.up();
    var wy = sc.F - 2;
    check(gc.m[wy * gc.gw + sc.x0] !== M.EMPTY && wc.STILL[gc.m[wy * gc.gw + sc.x0]], "(the test wants the wall standing there)");
    wc.handDouse(gc, [0, 0, M.WATER, 0, 0, 0], sc.x0 - 1, wy);
    check(!sc.handWet, "water against a wall of the house standing was water on its fire");
    /* (a stone lifted from either side of it, carried the same way, let go the same way: it comes down in two places) */
    function stone(cx) { var e = H.open({ seed: 6 }); e.g.size = 1; e.game.sandSet(e.g, 40 * e.g.gw + 60, M.STONE); lift(e, cx, 40, 1); at(e, 120, 40); e.step(1); return e; }
    var a = stone(59), b = stone(61);
    check(a.hash() !== b.hash(), "the same stone held two ways hashed the same: " + a.hash());
    /* (somebody walking through a stand of trees, lifted with it, and set down on clear ground) */
    var D = housed(), hd = D.h, gd = D.g, wd = D.w, q = gd.peasants[3], y = stand(D, q, FLAT), k;
    for (k = 0; k < 9; k++) wd.sandSet(gd, (y - k) * gd.gw + FLAT + 1, M.WOOD);   /* (a trunk beside them, through their middle) */
    for (k = 0; k < 9; k++) wd.sandSet(gd, (y - k) * gd.gw + FLAT, M.WOOD);
    check(!wd.pBlocked(gd, q.x, q.y), "(the test wants a trunk they can walk through)");
    lift(hd, FLAT, y - 2, 5);
    check(q.ride, "(the test wants them on it)");
    setAt(hd, FLAT + 16);
    check(q.state === "walk" && q.feel === 1, q.name + ", set down gently with the trees, is " + q.state + " and thinks " + q.feel);
  });

  /* (from the review, phase 6, round 16) */
  test("hand: a scarecrow carried away from its field leaves the field free to have another; the harness's hash knows a lump held from one let go; water beside a fire on the doorstep, outside the wall, is water on it", function () {
    var D = housed(), hd = D.h, gd = D.g, wd = D.w, M = D.M, sc = crow(D, 165);
    var G = sc.G, f = wd.bNew(gd, "farm", D.p, [wd.bE(gd, 160, G, M.SOIL, 0)], [158, G - 6, 170, G], {});
    f.done = true; sc.farm = f.id;
    lift(hd, sc.px, sc.G - 3, 4);
    setAt(hd, FLAT);
    check(sc.px > 200 && sc.farm == null, "carried off to " + sc.px + ", the scarecrow is still its field's: " + sc.farm);
    /* (a stone held, and the same stone just let go: not the same world) */
    function stone(go) { var e = H.open({ seed: 6 }); e.g.size = 1; e.game.sandSet(e.g, 40 * e.g.gw + 60, M.STONE); lift(e, 60, 40, 1); if (go) { e.flick(0, 0); e.up(); } return e; }
    check(stone(false).hash() !== stone(true).hash(), "a stone held and the same stone let go hashed the same");
    /* (a fire on the doorstep, outside the wall, and water put down beside it) */
    var C = housed(), gc = C.g, wc = C.w, s = C.s;
    alight(C); lift(C.h, FLAT, 30, 2); C.h.up();
    var dy = s.F - 1;
    wc.sandSet(gc, dy * gc.gw + s.x0 - 1, M.EMBER);
    check(wc.STILL[gc.m[dy * gc.gw + s.x0]] || gc.m[dy * gc.gw + s.x0] === M.DOOR, "(the test wants its wall there)");
    wc.handDouse(gc, [0, 0, M.WATER, 0, 0, 0], s.x0 - 2, dy);
    check(s.handWet === gc.tick, "water beside a fire on the doorstep was not water on it");
  });

  /* (from the review, phase 6, round 17) */
  test("hand: a scarecrow carried up a rise far over its field lets the field go; the harness's hash knows what a lump's cells are doing; water lowered straight onto a fire outside the door is water on it", function () {
    var D = housed(), hd = D.h, gd = D.g, wd = D.w, M = D.M, sc = crow(D, 165), x;
    var G = sc.G, f = wd.bNew(gd, "farm", D.p, [wd.bE(gd, 160, G, M.SOIL, 0)], [158, G - 6, 170, G], {});
    f.done = true; sc.farm = f.id;
    for (x = 170; x <= 182; x++) wd.sandSet(gd, (G - 30) * gd.gw + x, M.METAL);   /* (a ledge, high over the field, a few columns along) */
    lift(hd, sc.px, sc.G - 3, 4);
    carry(hd, 176, G - 30 - bottom(gd) - 1); hd.up();
    for (var t = 0; t < 300 && gd.hand.fly; t++) hd.step(1);
    check(Math.abs(sc.px - 176) < 3 && sc.G < G - 20 && sc.farm == null, "carried up onto a ledge at " + sc.px + "," + sc.G + " (the field at " + G + "), the scarecrow is still its field's: " + sc.farm);
    /* (two stones held, the same but for what their cells are doing) */
    function held(aux) { var e = H.open({ seed: 6 }); e.g.size = 1; e.game.sandSet(e.g, 40 * e.g.gw + 60, M.STONE); lift(e, 60, 40, 1); e.g.hand.held.c[3] = aux; return e; }
    check(held(0).hash() !== held(7).hash(), "two lumps differing in what their cells were doing hashed the same");
    function shade(sh) { var e = H.open({ seed: 6 }); e.g.size = 1; e.game.sandSet(e.g, 40 * e.g.gw + 60, M.STONE); lift(e, 60, 40, 1); e.g.hand.held.c[4] = sh; return e; }
    check(shade(0).hash() !== shade(9).hash(), "two lumps differing in their cells' shade (a firework's fuse) hashed the same");
    function cloner(who) { var e = H.open({ seed: 6 }); e.g.size = 1; e.game.sandSet(e.g, 40 * e.g.gw + 60, M.STONE); lift(e, 60, 40, 1); e.g.hand.held.clone = [[0, { name: who }]]; return e; }
    check(cloner("SUE").hash() !== cloner("KEVIN").hash(), "two cloners in the hand copying different people hashed the same");
    /* (a fire on the step outside the door, and a scoop of water lowered straight onto it) */
    var C = housed(), gc = C.g, wc = C.w, s = C.s;
    alight(C); lift(C.h, FLAT, 30, 2); C.h.up();
    wc.sandSet(gc, (s.F - 1) * gc.gw + s.x0 - 1, M.EMBER);
    wc.handDouse(gc, [0, 0, M.WATER, 0, 0, 0], s.x0 - 1, s.F - 4);
    check(s.handWet === gc.tick, "water lowered straight onto a fire outside the door was not water on it");
  });

  /* (from the review, phase 6, round 18) */
  test("hand: water held up in a trough over and beside a fire is not water on it; water put down on a flame is; the harness's hash knows where a lump is between cells", function () {
    var C = housed(), gc = C.g, wc = C.w, s = C.s, M = C.M;
    alight(C); lift(C.h, FLAT, 30, 2); C.h.up();
    wc.sandSet(gc, (s.y0 - 5) * gc.gw + s.x0 - 2, M.METAL);   /* (the trough's floor, under the water) */
    wc.handDouse(gc, [0, 0, M.WATER, 0, 0, 0], s.x0 - 2, s.y0 - 6);
    check(!s.handWet, "water in a trough over and beside the fire was water on it");
    /* (a scoop of water put down on a flame on the doorstep, outside the door) */
    var j = (s.F - 1) * gc.gw + s.x0 - 1;
    wc.sandSet(gc, j, M.FIRE);
    gc.hand.fly = { x: s.x0 - 1, y: s.F - 1, fx: s.x0 - 1, fy: s.F - 1, vx: 0, vy: 0, c: [0, 0, M.WATER, 0, 0, 0], clone: [], wet: 0, t: 0 };
    wc.handSet(gc);
    check(gc.m[j] === M.WATER && s.handWet === gc.tick, "water put down on the flame on the doorstep was not water on it: " + gc.m[j] + ", " + s.handWet);
    /* (two stones in the air at the same cell, one further on between cells than the other) */
    function fly(fx) { var e = H.open({ seed: 6 }); e.g.size = 1; e.game.sandSet(e.g, 40 * e.g.gw + 60, M.STONE); lift(e, 60, 40, 1); e.flick(0, 0); e.up(); e.g.hand.fly.fx = fx; return e; }
    check(fly(60).hash() !== fly(60.4).hash(), "two stones in the air between cells differently hashed the same");
  });

  test("hand: somebody on their way to a meal they need, whose house goes up, eats first; with nothing to do, they run after it", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s, p = C.p;
    p.task = { kind: "eat", x: Math.floor(p.x), y: Math.floor(p.y), t: 0, act: 0, n: 0, want: true }; p.hunger = w.P_HUNGRY * 2 + 10;
    lift(h, C.cx, C.cy + 1, 10);
    check(p.task && p.task.kind === "eat", "starving, they dropped their meal for " + (p.task && p.task.kind));
    carry(h, C.cx, C.cy + 1); h.up(); down(h);
    p.task = null; p.hunger = 0;
    lift(h, C.cx, C.cy + 1, 10);
    check(p.task && p.task.kind === "chase", "with nothing to do, they did not run after it: " + (p.task && p.task.kind));
  });

  /* (from the review after the build, round 1) */
  test("hand: an owner afraid of it, under their own house held over the hole it came out of, gets out from under it after the chase and back to work; a fright with no way indoors wears off", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, p = C.p, t, out = false, busy = 0, late = 0;
    lift(h, C.cx, C.cy + 1, 10);
    p.feel = -6;
    at(h, C.cx, C.cy - 14); h.step(1);
    check(p.task && p.task.kind === "chase" && w.handView(g, p) < 0 && w.handAway(g, C.s), "(the test wants the owner, afraid of it, after the house: " + JSON.stringify(p.task) + ")");
    for (t = 0; t < w.H_LONG + 1500; t++) {
      h.step(1);
      if (p.handOut > g.tick) out = true;
      if (t > w.H_LONG && p.task && p.task.kind !== "chase") busy++;
    }
    check(g.hand.held && !p.dead && out && busy > 300 && p.panic < 60, p.name + ", the chase over, stood under her house held still: sent out from under it " + out + ", " + busy + " ticks at a task, panic " + p.panic + ", at " + p.x.toFixed(1));
    /* somebody with nowhere to go, walled in under a lump: frightened, and then, a good while on, not */
    var D = housed(), hd = D.h, gd = D.g, wd = D.w, q = gd.peasants[3], y = stand(D, q, FLAT), x;
    check(!wd.bHome(gd, q), "(the test wants " + q.name + " with no house)");
    /* (walls of INERT, which a ninja rope's hook slides off: walls of stone she can, as the dice fall, rope her way over) */
    for (x = FLAT - 4; x <= FLAT + 4; x += 8) for (var yy = y - 17; yy <= y; yy++) wd.sandSet(gd, yy * gd.gw + x, D.M.INERT);
    q.feel = -6;
    hd.pause(true); skyLump(hd, FLAT, 30, 3); carry(hd, FLAT, y - 22); hd.pause(false);
    var scared = false;
    for (t = 0; t < wd.H_LONG + 400; t++) {
      hd.step(1);
      if (t === 100) scared = q.panic > 0;
      if (t > wd.H_LONG + 200 && q.panic > 0) late++;
    }
    check(gd.hand.held && scared && !late && Math.abs(q.x - FLAT - 0.5) < 4, q.name + ", walled in under it, frightened at first " + scared + "; still frightened " + late + " ticks of the last 200, at " + q.x.toFixed(1));
  });

  /* (after the build: what the review left, mended) */
  test("hand: a stone let go over a lake deeper than sixty rows sinks to the floor of it and is set down there, at once, and so is a hill of stone in a lake full to the brim; every drop of the lake is still there, in a cell of its own, with its heat", function () {
    [10, 16].forEach(function (r) {
      var h = H.open({ seed: 7 }), g = h.g, w = h.game, M = w.MAT, t, calls = 0, y;
      g.peasants.length = 0; g.ducks.length = 0;
      /* (water over rows 20 to 183, all along, on a floor of stone: twenty rows of air over it) */
      h.fill(0, 20, g.gw, g.gh - 22, "WATER"); h.fill(0, g.gh - 2, g.gw, 2, "STONE");
      h.paintDisc(136, 8 + r, r, "STONE");
      function liq() { var n = 0, q = 0; for (var j = 0; j < g.m.length; j++) if (w.LIQUID[g.m[j]]) { n++; q += w.heatQ(g, j); } return [n, q]; }
      /* (how many times the set-down looks for somewhere for the water to go) */
      var homes = h._eval("handHomes");
      h._eval("(function (f) { handHomes = f; })")(function () { calls++; return homes.apply(null, arguments); });
      lift(h, 136, 8 + r, r);
      var l0 = liq();
      h.flick(0, 0); h.up();
      var last = 0;
      for (t = 0; t < 400 && g.hand.fly; t++) { last = g.hand.fly.y; h.step(1); }
      var bot = -1, top = 1e9;
      for (y = 0; y < g.gh - 2; y++) if (g.m[y * g.gw + 136] === M.STONE) { top = Math.min(top, y); bot = Math.max(bot, y); }
      var l1 = liq();
      h._eval("(function (f) { handHomes = f; })")(homes);
      check(!g.hand.fly && last + r >= g.gh - 4 && bot >= g.gh - 5, "r " + r + ": let go over the lake, it went down to row " + last + ", and was set down with its bottom at row " + bot + " (top " + top + "), the floor at " + (g.gh - 2));
      check(calls <= 2, "r " + r + ": setting it down looked for homes for the water " + calls + " times");
      check(l1[0] === l0[0] && Math.abs(l1[1] - l0[1]) < 1e-6 * Math.abs(l0[1]) + 1e-3, "r " + r + ": the lake was " + l0 + ", and is " + l1);
    });
  });

  test("hand: a hill lifted whole and dropped from sixty rows, or flicked into the wall, comes down a heap of all of itself; and a grain whose ledge is gone the tick after the crash still lands in the valley", function () {
    function flat() { var h = H.open({ seed: 6 }); h.g.peasants.length = 0; h.g.ducks.length = 0; return h; }
    /* (every cell of it, in the grid or the air, after 400 ticks: what there was before it went up, to the last grain and
       the last of its heat) */
    var h = flat(), g = h.g, gy = ground(h.game, g, FLAT) + 1, t, i;
    var c0 = counts(h), q0 = heatAll(h);
    lift(h, FLAT, gy + 14, 16);
    check(g.hand.held.c.length / 6 > 700, "(the test wants a hill: " + g.hand.held.c.length / 6 + ")");
    for (i = 1; i <= 20; i++) { at(h, FLAT, gy + 14 - 60 * i / 20); h.step(1); }
    h.flick(0, 0); h.up();
    for (t = 0; t < 400; t++) h.step(1);
    check(!g.hand.fly && !g.np && counts(h) === c0, "dropped from sixty rows, a hill came down as " + counts(h) + ", having gone up as " + c0);
    check(Math.abs(heatAll(h) - q0) < 1e-6 * Math.abs(q0) + 1e-2, "dropped from sixty rows, the heat went from " + q0 + " to " + heatAll(h));
    /* (a disc of 12 of the ground flicked into the right-hand wall) */
    var D = flat(), gd = D.g, wd = D.game, M = wd.MAT, dy = ground(wd, gd, 240) + 1;
    gd.size = 12; wd.sandDab(gd, 240, dy - 40, M.STONE, true);
    var d0 = counts(D), n0 = lift(D, 240, dy - 40, 12).c.length / 6;
    for (i = 0; i < 20; i++) { at(D, 240, dy - 40 - 2 * i); D.step(1); }
    D.flick(4.5, 0); D.up();
    for (t = 0; t < 600 && (gd.hand.fly || gd.np); t++) D.step(1);
    check(!gd.hand.fly && !gd.np && counts(D) === d0, "flicked into the wall, " + n0 + " cells came down as " + counts(D) + ", having gone up as " + d0);
    /* (a grain flicked off a one-cell shelf in an emptied valley, at a ledge it lands on, the ledge erased the tick
       after it comes apart: it goes on, past where it would have landed, and through the floor) */
    var E = H.open({ seed: 6 }), ge = E.g, we = E.game, x;
    E.key("c"); ge.peasants.forEach(function (q) { q.dead = 1; });
    we.sandSet(ge, 130 * ge.gw + 136, M.METAL);
    for (x = 140; x <= 175; x++) we.sandSet(ge, 150 * ge.gw + x, M.METAL);
    ge.size = 1; we.sandSet(ge, 110 * ge.gw + 136, M.STONE);
    lift(E, 136, 110, 1);
    E.pause(true); at(E, 136, 129); E.step(1); E.flick(4.5, 4.5); E.up(); E.pause(false);
    for (t = 0; t < 20 && ge.hand.fly; t++) E.step(1);
    var stone = function () { var n = 0, k; for (k = 0; k < ge.m.length; k++) if (ge.m[k] === M.STONE) n++; for (k = 0; k < ge.np; k++) if (ge.pk[k] === we.PK_DEBRIS && ge.pm[k] === M.STONE) n++; return n; };
    var flew = ge.np;
    for (x = 140; x <= 175; x++) we.sandSet(ge, 150 * ge.gw + x, M.EMPTY);
    for (t = 0; t < 400 && ge.np; t++) E.step(1);
    check(flew === 1 && stone() === 1, "a grain off a shelf that was erased under it: " + flew + " in the air after the crash, " + stone() + " stone at the end");
  });

  test("hand: somebody stood at the very left of the valley, with nothing under them, is not taken by a lift at the right-hand wall; beside the lip of it they are; and fire at the right-hand wall is not fire beside an ember sunk at the left", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, M = C.M, q = g.peasants[3], gw = g.gw, y = 100, x, yy;
    function clear(G, W) { for (x = 0; x < 3; x++) for (yy = y - 6; yy <= y + 6; yy++) W.sandSet(G, yy * gw + x, M.EMPTY); for (x = gw - 3; x < gw; x++) for (yy = y - 6; yy <= y + 6; yy++) W.sandSet(G, yy * gw + x, M.EMPTY); }
    function put(p) { p.x = 0.5; p.y = y; p.state = "walk"; p.task = null; p.vx = p.vy = 0; p.falling = false; p.fallY = y; p.sleep = 0; }
    /* (nothing under them at column 0, and one cell of stone at the right-hand wall on the row of their feet: what
       column 0's x - 1, a row down, is, read without a look at the column) */
    clear(g, w);
    w.sandSet(g, y * gw + gw - 1, M.STONE);
    put(q);
    h.pause(true);
    lift(h, gw - 1, y, 1);
    check(g.hand.held && g.hand.held.c.length / 6 === 1, "(the test wants the one cell at the wall lifted: " + (g.hand.held && g.hand.held.c.length / 6) + ")");
    check(q.state !== "held" && !q.ride, "stood at the left of the valley, " + q.name + " was taken up by a lift at the right-hand wall");
    /* (and the same spot, with the lift's cell beside them under the lip) */
    var D = housed(), hd = D.h, gd = D.g, wd = D.w, p = gd.peasants[3];
    clear(gd, wd);
    wd.sandSet(gd, (y + 1) * gw + 1, M.STONE);
    put(p);
    hd.pause(true);
    lift(hd, 1, y + 1, 1);
    check(gd.hand.held && p.state === "held" && p.ride, "beside the lip of a lift, " + p.name + " is " + p.state);
    /* (a house dunked with an ember that ended up at column 0, and has gone out there: a flame at the right-hand wall, a
       row up, is not beside it; one at column 1 is) */
    [[gw - 1, y - 1, false], [1, y, true]].forEach(function (a) {
      var E = housed(), ge = E.g, we = E.w;
      clear(ge, we);
      we.sandSet(ge, y * gw, M.WATER); we.sandSet(ge, a[1] * gw + a[0], M.FIRE);
      ge.hand = { held: null, fly: null, sites: [], lifts: 1, gifts: [], kind: 0, cruel: 0, dunks: [{ id: E.s.id, t: ge.tick, e: [y * gw], n: 1, of: 100, d: 0 }] };
      E.s.handD = 1;
      we.handDunks(ge);
      check(ge.hand.dunks.length === (a[2] ? 1 : 0), "an ember sunk at column 0, a flame at " + a[0] + "," + a[1] + ": the dunk is " + (ge.hand.dunks.length ? "still waiting" : "judged"));
    });
  });

  test("hand: a pebble flicked up past somebody, or along, or both, knocks them onto their back, not into the sky or out of the valley, and too slowly to bowl anybody over; and a drift flicked at three in a row knocks over all three, itself", function () {
    /* (a 5 by 5 of stone beside Sue, flicked past her: where it starts, from her feet, and the flick) */
    [[2, -3, 0, -4.5], [-6, -4, 4, 0], [-6, -1, 3, -3], [-1, -3, 1, -4], [-6, -4, 4, 0, 8]].forEach(function (a) {
      var C = housed(), h = C.h, g = C.g, w = C.w, M = C.M, p = C.p, y = stand(C, p, FLAT), X = FLAT + a[0], Y = y + a[1], i, j, t;
      g.peasants.forEach(function (o) { if (o !== p && Math.abs(o.x - FLAT) < 60) stand(C, o, FLAT - 112); });
      var q = a[4] != null ? g.peasants[1] : null;   /* (and somebody a little way along, the way it is going) */
      if (q) stand(C, q, FLAT + a[4]);
      for (i = -2; i <= 2; i++) for (j = -2; j <= 2; j++) w.sandSet(g, (Y + j) * g.gw + X + i, M.STONE);
      lift(h, X, Y, 3);
      check(g.hand.held.c.length / 6 === 25 && !p.ride, "(the test wants the pebble, and " + p.name + " not on it: " + g.hand.held.c.length / 6 + ")");
      h.flick(a[2], a[3]); h.up();
      var knocked = false, top = y, out = false, pins = 0, flew = [];
      for (t = 0; t < 600; t++) {
        h.step(1);
        if (p.state === "fly") knocked = true;
        if (knocked) top = Math.min(top, p.y);
        if (p.x < 0 || p.x > g.gw) out = true;
        pins = Math.max(pins, p.pins || 0);
        g.peasants.forEach(function (o) { if (o !== p && o !== q && o.state === "fly" && flew.indexOf(o.name) < 0) flew.push(o.name); });
      }
      var how = "flicked (" + a[2] + ", " + a[3] + ") past " + p.name;
      check(knocked && p.feel === -2, how + ", it did not knock her flat: knocked " + knocked + ", feel " + p.feel);
      /* (the hop: 1.2 up, under 0.1 a tick of fall, is 6.6 rows) */
      check(y - top <= 7 && !out && !p.dead, how + ", she went up " + (y - top).toFixed(1) + " rows" + (out ? ", out of the valley" : "") + (p.dead ? ", and is dead" : ""));
      check(!pins && !flew.length, how + ", she bowled over " + pins + (flew.length ? ", and " + flew + " went flying" : ""));
    });
    /* (the snowball the size of a shed: a drift of 137 at three people three columns apart, from 18 along) */
    var D = housed(), hd = D.h, gd = D.g, wd = D.w, ps = [gd.peasants[0], gd.peasants[1], gd.peasants[2]], t, pins = 0;
    gd.peasants.forEach(function (o) { if (ps.indexOf(o) < 0) stand(D, o, FLAT - 112); });
    ps.forEach(function (p, i) { stand(D, p, FLAT + 3 * i); });
    var gy = ground(wd, gd, FLAT);
    gd.size = 6; wd.sandDab(gd, FLAT - 18, gy - 11, D.M.SNOW, true);
    check(lift(hd, FLAT - 18, gy - 11, 6).c.length / 6 === 137, "(the test wants a drift of 137: " + gd.hand.held.c.length / 6 + ")");
    hd.flick(4.5, 0); hd.up();
    for (t = 0; t < 300; t++) { hd.step(1); ps.forEach(function (p) { pins = Math.max(pins, p.pins || 0); }); }
    check(ps.every(function (p) { return p.feel === -2 && !p.dead; }) && gd.hand.cruel === 3 && !pins, "a drift flicked at three: " + ps.map(function (p) { return p.name + " " + p.feel + (p.dead ? " dead" : ""); }) + ", cruel " + gd.hand.cruel + ", bowled " + pins);
  });

  test("hand: somebody knocked flat by a big lump that is then set down whole where they are is not buried in it: they are out on top of it, or beside it, and alive", function () {
    /* (the reviewer's sweep: seed 6 at tick 3,000, Sue at 232.5, a disc of stone of 8 so many rows up and 16 along,
       flicked back at her: [rows up, vx, vy]. every one of these knocked her, and buried her) */
    var base = H.open({ seed: 6 });
    base.step(3000);
    var snap = base.snapshot();
    [[20, -2, 0], [10, -2, 0], [20, -2, 2], [20, -4.5, 4], [30, -2, 4]].forEach(function (a) {
      var h = base, g, w, p, y, t, i, sx, sy;
      h.restore(snap); g = h.g; w = h.game; p = g.peasants[0];
      y = ground(w, g, FLAT);
      p.x = FLAT + 0.5; p.y = y; p.state = "walk"; p.task = null; p.vx = p.vy = 0; p.falling = false; p.fallY = y; p.sleep = 0; p.immune = 0; p.panic = 0;
      h.pause(true);
      sx = FLAT + 16; sy = y - 14 - a[0];
      h.paintDisc(sx, sy, 8, "STONE");
      lift(h, sx, sy, 8);
      h.pause(false);
      h.flick(a[1], a[2]); h.up();
      var knocked = false, whole = false, b = 0;
      for (t = 0; t < 400; t++) {
        var f = g.hand.fly;
        h.step(1);
        if (p.state === "fly") knocked = true;
        if (f && !g.hand.fly) for (whole = true, i = 0; i < g.np; i++) if (g.ph[i]) whole = false;   /* (down, and none of it a grain) */
        b = Math.max(b, p.buried || 0);
      }
      var how = "a disc of 8 from " + a[0] + " rows up, flicked (" + a[1] + ", " + a[2] + ")";
      check(knocked && p.feel === -2, "(the test wants " + p.name + " knocked flat by " + how + ": " + p.state + ")");
      check(whole || a[2], how + " came apart (the reviewer's was set down whole)");
      check(!p.dead && !b && !w.pBlocked(g, p.x, p.y), how + ": " + p.name + " was set down on" + (p.dead ? ", and is dead" : "") + ", buried " + b + ", at " + p.x.toFixed(1) + "," + p.y.toFixed(1) + (whole ? "" : " (it came apart)"));
    });
  });

  test("hand: CLEAR while somebody rides a lump thrown up over the top of the valley drops them from the top, not into space", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, p = C.p, y = stand(C, p, FLAT), t, i;
    lift(h, FLAT, y + 3, 3);
    check(p.ride, "(the test wants " + p.name + " on the lump)");
    carry(h, FLAT, 0);
    h.flick(0, -6); h.up();
    h.step(30);
    check(g.hand.fly && p.ride && p.y < -40, "(the test wants " + p.name + " high over the valley on it: " + p.y.toFixed(1) + ")");
    h.key("c");
    var space = false, back = false;
    for (t = 0; t < 600; t++) {
      h.step(1);
      if (p.state === "space") space = true;
      for (i = 0; i < g.feed.length; i++) if (/back from space/.test(g.feed[i].text)) back = true;
    }
    check(!g.astronauts && !space && !back, "let go over the valley by CLEAR, " + p.name + " went to space: astronauts " + g.astronauts + ", " + (back ? "and came back" : "state " + p.state));
  });

  /* ---- after the build: what hangs from a house goes with it, or comes down ---- */
  /* a bell on the ridge of C's house, as mPlanBell casts one there, and hung */
  function belled(C) {
    var g = C.g, w = C.w;
    C.p.gold = 3;
    check(w.mPlanBell(g, C.p), "(the test wants a bell)");
    var B = sites(g, "bell")[0];
    check(B.on === C.s.id, "(the test wants the bell on " + C.p.name + "'s house: it is on " + B.on + ")");
    sim.build(w, B); w.bFinish(g, B, C.p);
    g.peasants.forEach(function (o) { if (o.task && o.task.kind === "build") o.task = null; });
    return B;
  }

  test("hand: a house carried off without one of its lanterns leaves none hanging in the air at the old place, and gets another by that door where it is now; a lantern carried off alone is not its house's somewhere else, and the house gets another", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s, M = C.M, L = lamps(C), t;
    var right = L.filter(function (l) { return l.x0 > s.x1; })[0], left = L.filter(function (l) { return l.x0 < s.x0; })[0];
    var x0 = s.x0, lx = left.x0, rx = right.x0, ry = right.y0;
    lift(h, C.cx - 3, C.cy + 1, 9);
    check(s.handH && left.handH && !right.handH, "(the test wants the house and its left lantern, and not its right)");
    var f = setAt(h, FLAT), DX = f.x - f.ax;
    check(DX > 70 && s.x0 === x0 + DX && left.x0 === lx + DX, "set down " + DX + " along, the house is at " + s.x0 + " (was " + x0 + "), its left lantern at " + left.x0 + " (was " + lx + ")");
    var mine = sites(g, "lamp").filter(function (l) { return l.home === s.id; });
    check(!w.bSite(g, right.id) && mine.every(function (l) { return l.side < 0; }), "a lantern for the right-hand door is still its house's: " + mine.map(function (l) { return l.side + "@" + l.x0 + "," + l.y0; }));
    for (t = 0; t < 300; t++) h.step(1);
    var hung = [ry, ry + 1].filter(function (y) { var c = g.m[y * g.gw + rx]; return (c === M.PLANK || c === M.LAMP) && g.m[(ry + 2) * g.gw + rx] === M.EMPTY; });
    check(!hung.length, "the old right-hand lantern's bracket and lamp are standing in the air at " + rx + "," + ry);
    /* (and once the house is mended where it is: the one cell of it that did not come) */
    function mended(D) { var ip = inPlace(D, 0, 0); return D.s.done && !D.s.repair && ip[0] === ip[1]; }
    for (t = 0; t < 8000 && !mended(C); t++) h.step(1);
    check(mended(C), "(the test wants the house mended where it is: " + inPlace(C, 0, 0) + ")");
    if (!sites(g, "lamp").some(function (l) { return l.home === s.id && l.side > 0; })) w.iPlanLamp(g, C.p);
    var R = sites(g, "lamp").filter(function (l) { return l.home === s.id && l.side > 0; })[0];
    check(R && R.x0 === s.x1 + 1, "no lantern planned by the right-hand door of the house where it is now: " + (R ? R.x0 + "," + R.y0 : "none") + " (its wall at " + s.x1 + ")");
    /* and the other way: a lantern carried off on its own is not that house's lantern somewhere else. it is gone from
       the old place, and the house gets another */
    var D = housed(), hd = D.h, gd = D.g, sd = D.s, Rd = lamps(D).filter(function (l) { return l.x0 > D.s.x1; })[0], rx0 = Rd.x0, ry0 = Rd.y0;
    lift(hd, rx0, ry0 + 1, 1);
    check(Rd.handH && !gd.hand.sites.some(function (q) { return q.id === sd.id && q.n >= 0.3 * q.of; }), "(the test wants the right-hand lantern in the hand, and next to nothing of its house)");
    setAt(hd, FLAT);
    check(Rd.x0 === rx0 && Rd.y0 === ry0, "a lantern carried off alone moved, to " + Rd.x0 + "," + Rd.y0);
    for (t = 0; t < 8000 && (w.bSite(gd, Rd.id) || !mended(D)); t++) hd.step(1);   /* (and the bite out of its wall put back) */
    check(!w.bSite(gd, Rd.id) && mended(D), "(the test wants the lantern gone from the old place, and the house mended: " + !!w.bSite(gd, Rd.id) + ", " + inPlace(D, 0, 0) + ")");
    if (!sites(gd, "lamp").some(function (l) { return l.home === sd.id && l.side > 0; })) w.iPlanLamp(gd, D.p);
    R = sites(gd, "lamp").filter(function (l) { return l.home === sd.id && l.side > 0; })[0];
    check(R && R.x0 === sd.x1 + 1, "no new lantern planned by the right-hand door after its own was carried off: " + (R ? R.x0 + "," + R.y0 : "none"));
  });

  test("hand: a house carried off with the bell on its ridge takes the bell with it: the bell is whole there, and rings", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s, M = C.M, B = belled(C), t;
    var x0 = s.x0, bx = B.bx, by = B.by, i0 = B.plan[0].i, n = 0, inspected = 0;
    lift(h, B.bx - 2, B.by + 7, 12);
    check(s.handH && B.handH, "(the test wants the house and its bell in the hand)");
    var f = setAt(h, FLAT), DX = f.x - f.ax, DY = f.y - f.ay;
    check(DX > 70 && s.x0 === x0 + DX, "(the test wants the house moved: it is at " + s.x0 + ", was " + x0 + ")");
    check(w.bSite(g, B.id) === B && B.bx === bx + DX && B.by === by + DY && B.plan[0].i === i0 + DX + DY * g.gw, "the bell did not go with it: its mouth at " + B.bx + "," + B.by + " (was " + bx + "," + by + "), moved " + DX + "," + DY);
    check(whole(C, B) && g.m[B.by * g.gw + B.bx] === M.GOLD, "the bell is not as its plan says where it is now");
    for (t = 0; t < 600; t++) { h.step(1); if (B.repair) n++; }
    w.bInspect(g, B, g.sites.indexOf(B)); inspected = 1;
    check(w.bSite(g, B.id) === B && B.done && !B.repair && !n && inspected, "bInspect found something of the bell missing where it is now (repair for " + n + " ticks)");
    check(w.mRing(g, 2), "the bell does not ring where it is now");
    /* (a DONG is a glint or two out of the mouth of it, where it is now) */
    var dong = 0, q;
    for (t = 0; t < 120; t++) {
      h.step(1);
      for (q = 0; q < g.np; q++) if (g.pk[q] === w.PK_GLINT && Math.abs(g.ppx[q] - B.bx - 0.5) < 3 && Math.abs(g.ppy[q] - B.by - 1) < 3) dong++;
    }
    check(dong > 0 && B.ring === 0, "rung, the bell where it is now made no DONG (" + dong + ", ring " + B.ring + ")");
  });

  test("hand: a house carried off without the bell on its ridge leaves no bell up in the air at the old place: it comes down, and its gold is on the ground, anybody's", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s, M = C.M, B = belled(C), t, j, x, y;
    var gold = B.plan.filter(function (e) { return e.v === M.GOLD; }).map(function (e) { return e.i; }), x0 = s.x0;
    function golds() { var n = 0; for (var j = 0; j < g.m.length; j++) if (g.m[j] === M.GOLD) n++; return n; }
    var n0 = golds();
    lift(h, B.bx - 2, s.F - 5, 9);
    check(s.handH && !B.handH, "(the test wants the house in the hand, and not its bell)");
    var f = setAt(h, FLAT);
    check(s.x0 !== x0, "(the test wants the house moved)");
    check(!sites(g, "bell").length, "a bell site is left: at " + sites(g, "bell").map(function (b) { return b.bx + "," + b.by; }));
    for (t = 0; t < 300; t++) h.step(1);
    check(gold.every(function (i) { return g.m[i] !== M.GOLD; }), "the bell's gold is still up where the ridge was");
    check(golds() === n0, "of " + n0 + " cells of gold, " + golds() + " are in the valley");
    /* (round where the bell was, every cell of gold is on something) */
    for (y = 0; y < g.gh - 1; y++) for (x = B.x0 - 12; x <= B.x1 + 12; x++) {
      j = y * g.gw + x;
      check(g.m[j] !== M.GOLD || !w.AIRY[g.m[j + g.gw]], "gold in the air at " + x + "," + y);
    }
  });

  /* (after the build: what the review left, mended. the chase, and what they say) */
  test("hand: somebody after their house splashes through a puddle on the way, and is still after it, and under it, on the far side", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, s = C.s, M = C.M, p = C.p, A = 163, B = 173, x, y, t, wet = 0, far = 0, near = 0;
    stand(C, p, s.x0 - 9);
    /* (a strip of water two rows deep, let into the ground across the way, on a stone bottom) */
    for (x = A; x <= B; x++) { var gy = ground(w, g, x); for (y = gy + 1; y <= gy + 2; y++) w.sandSet(g, y * g.gw + x, M.WATER); w.sandSet(g, (gy + 3) * g.gw + x, M.STONE); }
    lift(h, C.cx, C.cy + 1, 10);
    check(p.task && p.task.kind === "chase", "(the test wants the owner after it)");
    var X = C.cx, Y = C.cy - 20;
    for (t = 0; t < 700; t++) {
      if (t % 10 === 0 && X < 215) at(h, ++X, Y);
      h.step(1);
      if (p.wade) wet++;
      if (p.x > B + 4 && g.hand.held.x > B + 8) { far++; if (p.task && p.task.kind === "chase" && Math.abs(p.x - g.hand.held.x - 0.5) <= 6) near++; }
    }
    check(wet > 10, "(the test wants " + p.name + " through the water: wet " + wet + " ticks)");
    check(p.task && p.task.kind === "chase" && far > 200 && near === far, p.name + ", across the water, is " + JSON.stringify(p.task && p.task.kind) + " at " + p.x.toFixed(1) + " with the house at " + g.hand.held.x + ": under it " + near + " ticks of " + far);
  });

  test("hand: a house held still over the pond, out of its owner's reach, is given up on before the stuck observer would call it a stall", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, p = C.p, W = require("../harness/stuck.js").createWatcher(), px = -1, x, y, t, end = -1;
    for (x = C.box[0]; x > 0 && px < 0; x--) for (y = 40; y < g.gh; y++) if (w.LIQUID[g.m[y * g.gw + x]]) { px = x; break; }
    check(px > 100 && px < 140, "(the test wants the pond just left of the house: " + px + ")");
    lift(h, C.cx, C.cy + 1, 10);
    check(p.task && p.task.kind === "chase", "(the test wants " + p.name + " after it)");
    for (t = 0; t < 60; t++) { at(h, Math.round(C.cx + (px - C.cx) * t / 60), C.cy - 15); h.step(1); }
    for (t = 60; t < 3000; t++) {
      h.step(1);
      if (g.tick % 30 === 0) W.sample(h);
      if (end < 0 && !(p.task && p.task.kind === "chase")) end = t;
    }
    check(g.hand.held && end >= w.H_STAND && end <= 2000, p.name + "'s chase of a house held still ended " + end + " ticks after the lift");
    check(!W.report().length, "the stuck observer reports " + JSON.stringify(W.report()));
  });

  test("hand: the first lift anybody sees is not greeted with the hand again; a later one can be", function () {
    var AGAIN = "oh no it's the hand again", first = 0, again = 0, later = false, i, h, g, w, x;
    function up(h) { var g = h.g, x = Math.floor(g.peasants[0].x) + 12, y = ground(h.game, g, x); if (y < 0) return null; lift(h, x, y + 3, 3); return g.peasants.filter(function (p) { return p.handSeen === g.hand.lifts && p.say; }).map(function (p) { return p.say; }); }
    for (i = 0; i < 40; i++) {
      h = H.open({ seed: 6 }); g = h.g; w = h.game;
      h.setRng((0x9e3779b9 * (i + 1)) >>> 0);
      var said = up(h) || [];
      if (said.length) first++;
      if (said.indexOf(AGAIN) >= 0) again++;
      /* (and, until it has come up, another a while later, with the first in the past) */
      if (!later) { h.flick(0, 0); h.up(); h.step(w.H_QUIET + 2); later = (up(h) || []).indexOf(AGAIN) >= 0; }
    }
    check(first === 40, "(the test wants every first lift seen: " + first + " of 40)");
    check(!again, "the first lift seen was the hand again in " + again + " of 40 valleys");
    check(later, "in none of 40 valleys could a later lift be the hand again");
  });

  test("hand: a pebble of stone through the gable, and its owner, near, says so there and then; a pebble of sand that breaks nothing, nothing", function () {
    function throwAt(v) {
      var C = housed(), h = C.h, g = C.g, s = C.s, p = C.p, M = C.M, out = -1, said = null, smash = 0, t;
      stand(C, p, s.x1 + 6);
      pebble(h, s.x0 - 25, s.F - 18, v, 3);
      h.flick(4, 0.5); h.up();
      for (t = 0; t < 300; t++) {
        h.step(1);
        if (out < 0 && s.win.some(function (j) { return !(g.m[j] === M.PLANK && g.aux[j] === 1); })) { out = t; said = p.say; }
        if (p.say && (C.w.P_SAY.handSmash || []).indexOf(p.say) >= 0) smash++;
      }
      return { out: out, said: said, smash: smash, p: p, w: C.w };
    }
    var M = H.open({ seed: 6 }).game.MAT, a = throwAt(M.STONE), b = throwAt(M.SAND);
    check(a.out >= 0 && (a.w.P_SAY.handSmash || []).indexOf(a.said) >= 0, "the window came out at " + a.out + ", and " + a.p.name + " said " + JSON.stringify(a.said));
    check(b.out < 0 && !b.smash, "a pebble of sand: the window out at " + b.out + ", " + b.smash + " ticks of a smashed window said");
  });
  test("hand: a duck lifted with the pond sits on it, feet tucked, and says so; thrown with it, it flaps, and says that", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, d = g.ducks.filter(function (u) { return u.state === "swim" || u.state === "walk"; })[0], drawn = [], t;
    check(d, "(the test wants a duck about)");
    /* (what ducksDraw draws each duck with: the sprite dBlit is handed) */
    var blit = h.eval("dBlit");
    h.eval("(function (f) { dBlit = f; })")(function (gg, spr) { drawn.push(spr); return blit.apply(null, arguments); });
    function drawnAs() { drawn.length = 0; h.fn("ducksDraw")(g); return drawn[g.ducks.filter(function (u) { return !u.dead; }).indexOf(d)]; }
    var S = w.D_SPR, dx = Math.floor(d.x), dy = Math.floor(d.y);
    lift(h, dx, dy + 2, 4);
    check(d.state === "held" && d.ride, "(the test wants the duck on the lifted ground: it is " + d.state + ")");
    carry(h, dx, dy - 6);
    check(/sitting on a lump/.test(w.dMood(d, g)) && drawnAs() === S.swim, "a duck on a lump in the hand " + w.dMood(d, g) + ", drawn " + (drawnAs() === S.swim ? "sat" : "flying"));
    d.baby = true;
    check(drawnAs() === S.babySwim, "a duckling on a lump in the hand is drawn on its feet");
    d.baby = false;
    /* (and thrown) */
    h.flick(3, -2); h.up();
    for (t = 0; t < 3 && g.hand.fly; t++) h.step(1);
    check(g.hand.fly && d.ride && d.state === "held", "(the test wants the duck in the air with its lump: " + d.state + ")");
    var a = drawnAs();
    check(/flying/.test(w.dMood(d, g)) && (a === S.flyA || a === S.flyB), "a duck thrown with its lump " + w.dMood(d, g) + ", drawn " + (a === S.swim ? "sat" : "otherwise"));
    check(down(h), "it never came down");
    check(!/lump/.test(w.dMood(d, g)), "a duck set down " + w.dMood(d, g));
  });

  /* (after the build: what the review found no test of) */
  /* a function of the game's, watched: how many times it was called, and with what it gave back */
  function spy(h, name, each) {
    var f = h.eval(name), n = { n: 0 };
    h.eval("(function (f) { " + name + " = f; })")(function () { var r = f.apply(null, arguments); if (!each || each.apply(null, [r].concat([].slice.call(arguments)))) n.n++; return r; });
    return n;
  }
  test("hand: lava set down on open ground, or let go into the pond, and a stone heated through set down gently: the tick each lands, the heat in the room and the hand together is what it was before the lift", function () {
    /* (a lump at room temperature has next to no heat of its own to lose in the putting down. lava has: a hundredth of
       it gone is a part in a hundred and twenty of the whole valley's. and the stone as hot as test 47's, 300 a cell) */
    function setDown(mat, from, to, hot) {
      var h = H.open({ seed: 6 }), g = h.g, w = h.game, M = w.MAT, r = 5, n = 0, dx, dy, j;
      var crash = spy(h, "handCrash"), pushed = spy(h, "handHomes", function (o) { return o && o.length; });
      g.size = r; w.sandDab(g, from[0], from[1], M[mat], true);
      if (hot) for (dy = -r; dy <= r; dy++) for (dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + r) w.heatAdd(g, (from[1] + dy) * g.gw + from[0] + dx, hot);
      var q0 = heatAll(h);
      lift(h, from[0], from[1], r);
      var cells = g.hand.held.c.length / 6;
      carry(h, to[0], to[1]);
      check(down(h), "the " + mat + " never came down");
      if (mat === "LAVA") for (j = 0; j < g.m.length; j++) if (g.m[j] === M.LAVA) n++;
      return { q0: q0, q1: heatAll(h), cells: cells, n: mat === "LAVA" ? n : cells, crash: crash.n, pushed: pushed.n };
    }
    var C = housed(), gy = ground(C.w, C.g, FLAT), top = -1, j;
    for (j = 0; j < C.g.m.length && top < 0; j++) if (C.w.LIQUID[C.g.m[j]] && j % C.g.gw === 106) top = (j / C.g.gw) | 0;
    check(gy > 0 && top > 0, "(the test wants seed 6's open ground and its pond: " + gy + ", " + top + ")");
    [["on open ground", setDown("LAVA", [FLAT - 40, 40], [FLAT, gy - 7])],
     ["into the pond", setDown("LAVA", [136, 40], [106, top - 8])],
     ["heated through, on open ground", setDown("STONE", [FLAT - 40, 40], [FLAT, gy - 7], 300)]].forEach(function (T) {
      var R = T[1], what = T[0];
      check(R.cells > 50 && R.n === R.cells && !R.crash, "(the test wants it set down whole " + what + ": " + JSON.stringify(R) + ")");
      check(Math.abs(R.q1 - R.q0) < 1e-6 * Math.abs(R.q0) + 1e-2, "set down " + what + ", the heat went from " + R.q0 + " to " + R.q1);
    });
    check(setDown("LAVA", [136, 40], [106, top - 8]).pushed > 0, "(the test wants the pond's water pushed aside by the lava)");
  });
  test("hand: a lump of lava in the hand with somebody and a duck sat on it, and then in the air, is drawn: in the picture and in thermal vision, the palm over it shut and then open, and THE HAND in the village's numbers", function () {
    var h = H.open({ seed: 6 }), g = h.g, w = h.game, M = w.MAT, X = FLAT, p = g.peasants[0], d = g.ducks[0], gy = ground(w, g, X), a, b;
    p.x = X - 1.5; p.y = gy; p.state = "walk"; p.task = null; p.vx = p.vy = 0;
    d.x = X + 2.5; d.y = gy; d.state = "walk"; d.vx = d.vy = 0;
    for (a = -3; a <= 3; a++) for (b = -3; b <= 3; b++) if (a * a + b * b <= 12) w.sandPlace(g, (gy + 4 + b) * g.gw + X + a, M.LAVA);   /* (in the ground under them: lava does not pour into sand) */
    lift(h, X, gy + 2, 6);
    check(p.ride && d.ride, "(the test wants somebody and a duck on the lump: " + p.state + ", " + d.state + ")");
    for (a = 0; a < 10; a++) { at(h, X - a, gy - 20 - a); h.step(1); }
    /* (what peasantsDraw draws her with. and a context with only what sim.js's stub has, and setLineDash, which a canvas
       has too: a call of anything else is a TypeError here, not only in the browser) */
    var blit = h.eval("pBlit"), bodies = [], calls = [];
    h.eval("(function (f) { pBlit = f; })")(function (gg, spr, ox) { if (ox === Math.floor(p.x)) bodies.push(spr); return blit.apply(null, arguments); });
    var ctx = { createImageData: function (W, Hh) { return { data: new Uint8ClampedArray(W * Hh * 4), width: W, height: Hh }; },
                measureText: function (s) { return { width: s.length * 4 }; },
                createRadialGradient: function () { return { addColorStop: function () {} }; } };
    ["fillRect", "strokeRect", "drawImage", "putImageData", "clearRect", "save", "restore", "translate", "scale", "beginPath",
     "moveTo", "lineTo", "quadraticCurveTo", "fill", "stroke", "rect", "clip", "fillText", "setTransform", "arc", "closePath", "setLineDash"]
      .forEach(function (k) { ctx[k] = function () { calls.push([k].concat([].slice.call(arguments))); }; });
    function look(when, palm) {
      var L = g.hand.held || g.hand.fly, i = -1, k;
      for (k = 0; k < L.c.length && i < 0; k += 6) if (L.c[k + 2] === M.LAVA && L.y + L.c[k + 1] >= 0) i = (L.y + L.c[k + 1]) * g.gw + L.x + L.c[k];
      check(i >= 0 && g.m[i] === M.EMPTY, "(the test wants a cell of the lava in the sky, off the grid: " + i + ")");
      bodies.length = 0;
      w.drawWorld(g, true);
      check(g.px[i] !== g.bg[i] && g.gpx[i] !== 0, when + ", the lava is not to be seen where it is: " + [g.px[i], g.bg[i], g.gpx[i]].map(function (v) { return (v >>> 0).toString(16); }).join(" "));
      var sat = bodies.indexOf(w.P_BODY.sit) >= 0;
      check(sat === !!g.hand.held, when + ", " + p.name + " is " + (sat ? "" : "not ") + "drawn sitting");
      g.thermal = 1; w.drawWorld(g, true); g.thermal = 0;
      check(g.px[i] !== w.thermCol(g.T[i]), when + ", in thermal vision the lava is the colour of the air it is in");
      calls.length = 0; g.down = 1; w.drawCursor(g, ctx);
      var drew = calls.filter(function (c) { return c[0] === "drawImage"; });
      check(drew.length === 1 && drew[0][1] === w.ICONS[palm], when + ", the cursor drew " + drew.length + " images, not the " + palm);
      var R = w.popRows(g, "peasants");
      check(R.some(function (r) { return r[0] === "#" && r[1] === "THE HAND"; }), when + ", the village's numbers have no THE HAND: " + JSON.stringify(R.slice(-6)));
    }
    look("held", "handShut");
    h.flick(3, -2); h.up(); h.step(1);
    check(g.hand.fly && p.ride && d.ride, "(the test wants them in the air with it)");
    look("thrown", "hand");
  });
  test("hand: somebody carried about for 600 ticks with time going is never held as the PEASANT tool holds people, and says nothing; nor is a duck carried with the pond held as a duck in the hand is: it stays on the lump", function () {
    function way(h, x0, t) { at(h, x0 + Math.round(30 * Math.sin(t / 50)), 110 + Math.round(10 * Math.cos(t / 37))); h.step(1); }
    var h = H.open({ seed: 6 }), g = h.g, w = h.game, p = g.peasants[0], said = [], off = 0, t, L;
    var held = spy(h, "pHeld", function (r, gg, q) { return q === p; });
    lift(h, Math.floor(p.x), Math.floor(p.y) + 2, 6);
    check(p.ride && p.state === "held", "(the test wants " + p.name + " on the lump: " + p.state + ")");
    var s0 = p.say;
    for (t = 0; t < 600; t++) {
      way(h, 132, t);
      L = g.hand.held;
      if (p.say && p.say !== s0 && said.indexOf(p.say) < 0) said.push(p.say);
      if (Math.abs(p.x - (L.x + p.ride.dx)) > 1e-9 || Math.abs(p.y - (L.y + p.ride.dy)) > 1e-9) off++;
    }
    /* (pHeld is the PEASANT tool's: it puts them under the cursor, and two times in a hundred they say so) */
    check(!held.n && !said.length && !off, p.name + ", carried: through pHeld " + held.n + " times, said " + JSON.stringify(said) + ", off the lump " + off + " ticks");
    var h2 = H.open({ seed: 6 }), g2 = h2.g, d = g2.ducks[0], quack = [];
    var dheld = spy(h2, "dHeld", function (r, gg, q) { return q === d; });
    lift(h2, Math.floor(d.x), Math.floor(d.y) + 1, 5);
    check(d.ride && d.state === "held", "(the test wants the duck on the lifted pond: " + d.state + ")");
    for (t = 0, off = 0; t < 600; t++) {
      way(h2, 115, t);
      L = g2.hand.held;
      if (d.say && quack.indexOf(d.say) < 0) quack.push(d.say);
      if (Math.abs(d.x - (L.x + d.ride.dx)) > 1e-9 || Math.abs(d.y - (L.y + d.ride.dy)) > 1e-9) off++;
    }
    check(!dheld.n && !off && !quack.length, "a duck carried: through dHeld " + dheld.n + " times, off the lump " + off + " ticks, said " + JSON.stringify(quack));
  });
  test("hand: NEW pressed while holding a house with somebody in it, or with it in the air, forgets the hand: no g.hand, nobody held, and the new valley plays as one made by NEW in a valley nothing was ever lifted in", function () {
    /* (the same village, the same brush, the cursor moved the same way and the time stopped the same; only one presses on
       the house and lets go. the dice set the same just before NEW) */
    function valley(press) {
      var C = housed(), h = C.h, g = C.g, w = C.w, o = g.peasants[1], i;
      h.pause(true);
      o.x = C.box[0] + 2.5; o.y = C.box[3] - 1; o.state = "walk"; o.task = null; o.sleep = 0;
      h.select("HAND"); g.size = 10; at(h, C.cx, C.cy + 1);
      if (press) {
        h.down(0);
        check(g.hand.held && o.ride, "(the test wants the house in the hand, with " + o.name + " in it)");
        w.handDeed(g, o, "wrecked");
        check(g.hand.cruel === 2 && o.feel === -3, "(the test wants a cruelty in the ledger: " + g.hand.cruel + ", " + o.feel + ")");
      }
      for (i = 0; i < 10; i++) { at(h, C.cx - i, C.cy - i); h.step(1); }
      if (press === "fly") { h.flick(2, -1); h.up(); check(g.hand.fly, "(the test wants it in the air)"); }
      return h;
    }
    var none = valley(null), dice = none.rng();
    none.key("r"); none.up(); none.pause(false); none.step(12000);
    ["held", "fly"].forEach(function (how) {
      var h = valley(how), g = h.g;
      h.setRng(dice);
      h.key("r"); h.up();
      check(!("hand" in g), "NEW with the house " + how + ": the hand is still there");
      check(!g.peasants.some(function (p) { return p.ride || p.state === "held"; }) && !g.ducks.some(function (d) { return d.ride || d.state === "held"; }), "NEW with the house " + how + ": somebody still held");
      h.pause(false); h.step(12000);
      check(h.hash() === none.hash() && !("hand" in g), "NEW with the house " + how + ", and 12,000 ticks after it hashes " + h.hash() + ", not " + none.hash());
    });
  });
  test("hand: a bite out of the foundry's mould, carried forty columns along and set down, and 6,000 ticks after: the soak's invariants hold, nobody is held by nothing or stalls, and the foundry is off hold, mended or being mended", function () {
    /* (pi's flat valley for the foundry, test/heavens.js fValley22, in the harness, so that the hand can be used on it) */
    var h = H.open({ seed: 2 }), w = h.game, g = h.g, M = w.MAT, x, y, t;
    w.sandClear(g);
    for (x = 0; x < g.gw; x++) for (y = x >= 223 ? 96 : 150; y < g.gh; y++) w.sandPlace(g, y * g.gw + x, y >= 150 && y < 158 ? M.SAND : M.STONE);
    g.arriveT = 1e9; g.ideaT = 1e9; g.helloT = 0; g.wAny = true;
    g.know = { concrete: "TEST", foundry: "TEST", masonry: "TEST", smelt: "TEST", dig: "TEST", farm: "TEST" };
    g.peasants.forEach(function (p, i) { p.x = 100.5 + 3 * i; p.y = 149; p.task = null; p.idle = 0; p.hunger = 0; p.bored = 0; p.iron = 0; p.coal = 0; });
    var gy = []; for (x = 0; x < w.H_FW; x++) gy.push(150);
    var fit = w.hFoundryFit(g, 150, gy, 150, 150), s = sim.build(w, w.hFoundryAt(g, g.peasants[0], 150, fit.R0, fit.plan));
    function missing() { return s.plan.filter(function (e) { return !w.bOk(g, e); }).length; }
    check(s.wonder && s.done && !missing(), "(the test wants a finished foundry)");
    /* (the plate mould, two deep and five long under the floor at the left tap, its lid and its lining: hFoundryCell) */
    lift(h, s.xf + 2, s.R0, 3);
    var bite = g.hand.sites.filter(function (q) { return q.id === s.id; })[0];
    check(s.handH && bite && bite.n > 10, "(the test wants a bite of the mould in the hand: " + JSON.stringify(bite) + ")");
    carry(h, s.xf + 2 - 40, 140);
    check(down(h), "it never came down");
    var gone = missing();
    check(!s.handH && gone >= bite.n, "set down, the foundry is " + (s.handH ? "still on hold" : "off hold") + ", " + gone + " of its cells gone");
    /* (harness/soak.js's invariants, the plain ones, and the playtest's: nobody held by nothing) */
    h.standardInvariants({ every: 1, temps: 30, grid: 60 });
    h.invariant("people-state", "g.peasants.every(function (p) { return ['walk','fly','held','space'].indexOf(p.state) >= 0; })");
    h.invariant("ducks-state", "g.ducks.every(function (d) { return ['walk','fly','held','swim','thrown'].indexOf(d.state) >= 0; })");
    h.invariant("held", "(g.held === null || (g.peasants.indexOf(g.held) >= 0 && g.held.state === 'held')) && (g.heldDuck === null || g.ducks.indexOf(g.heldDuck) >= 0)");
    h.invariant("ids", "(function(){var a=g.peasants.map(function(p){return p.id}),d=g.ducks.map(function(q){return q.id}),s=g.sites.map(function(x){return x.id});return new Set(a).size===a.length&&new Set(d).size===d.length&&new Set(s).size===s.length;})()", { every: 30 });
    h.invariant("sites", "g.sites.every(function (s) { return s.plan && (s.plan.length > 0 || s.kind === 'heap') && s.plan.every(function (e) { return e.i >= 0 && e.i < g.m.length; }) && (!s.stock || Object.keys(s.stock).every(function (k) { return s.stock[k] > -1e-5 && Number.isFinite(s.stock[k]); })); })", { every: 30 });
    h.invariant("tasks", "g.peasants.every(function (p) { return !p.task || p.task.site == null || g.sites.some(function (s) { return s.id === p.task.site; }) || p.task.kind === 'sow' || p.task.kind === 'till' || p.task.kind === 'water' || p.task.kind === 'fish' || p.task.kind === 'shoo'; })", { every: 30 });
    h.invariant("feed", "g.feed.length <= 6 && g.banners.length <= 4 && g.ghosts.length < 400 && g.np >= 0 && g.np <= PMAX", { every: 30 });
    h.invariant("resources", "g.rip >= 0 && (g.iron || 0) >= 0 && (g.barrels || 0) >= 0");
    h.invariant("loose", "g.peasants.every(function (p) { return p.dead || p.state !== 'held' || p === g.held || (p.ride && g.hand && (g.hand.held || g.hand.fly)); }) && g.ducks.every(function (d) { return d.dead || d.state !== 'held' || d === g.heldDuck || (d.ride && g.hand && (g.hand.held || g.hand.fly)); })");
    var W = require("../harness/stuck.js").createWatcher(), stop = null;
    W.sample(h);
    for (t = 0; t < 6000 && !stop; t += 30) { stop = h.step(30).stopped; W.sample(h); }
    check(!stop, "an invariant broke: " + JSON.stringify(stop && { id: stop.id, tick: stop.tick }));
    check(!W.report().length, "stalled: " + JSON.stringify(W.report()));
    var S = w.bSite(g, s.id);
    check(!S || (!S.handH && (!missing() || S.repair)), "6,000 ticks after, the foundry is " + (S ? (S.handH ? "on hold" : "neither mended nor being mended, " + missing() + " cells gone") : "gone"));
  });

  test("hand: a hill dropped from sixty rows over a hollow in the rock, with somebody in it, and over a house, comes down a heap on top: none of it in the hollow or in the room, and nobody buried", function () {
    /* (the grains of it with no room where they come down are put down on the heap, on what is under them: not in the
       lowest air in their column, through forty rows of rock or a roof. hand.js handLand) */
    var h = H.open({ seed: 6 }), g = h.g, w = h.game, M = w.MAT, gw = g.gw, gy = ground(w, g, FLAT) + 1, cy = gy + 45, x, y, t, i;
    g.peasants.length = 1; g.ducks.length = 0;
    for (x = 200; x <= 265; x++) for (y = cy; y < cy + 8; y++) w.sandSet(g, y * gw + x, M.EMPTY);
    var p = g.peasants[0];
    p.x = 240.5; p.y = cy + 7; p.state = "walk"; p.task = null; p.vx = p.vy = 0; p.falling = false; p.fallY = p.y; p.sleep = 0;
    function hollow() { var n = 0; for (x = 200; x <= 265; x++) for (y = cy; y < cy + 8; y++) if (g.m[y * gw + x] !== M.EMPTY) n++; return n; }
    for (t = 0; t < 5; t++) h.step(1);
    check(!hollow() && !w.pBlocked(g, p.x, p.y), "(the test wants " + p.name + " in an empty hollow: " + hollow() + " cells in it)");
    var c0 = counts(h);
    lift(h, FLAT, gy + 14, 16);
    check(g.hand.held.c.length / 6 > 700, "(the test wants a hill: " + g.hand.held.c.length / 6 + ")");
    for (i = 1; i <= 20; i++) { at(h, FLAT, gy + 14 - 60 * i / 20); h.step(1); }
    h.flick(0, 0); h.up();
    for (t = 0; t < 400; t++) h.step(1);
    check(!hollow(), "a hill dropped on the ground over a hollow forty-five rows down put " + hollow() + " cells of itself in the hollow");
    check(!g.hand.fly && !g.np && counts(h) === c0, "over the hollow, the hill came down as " + counts(h) + ", having gone up as " + c0);
    check(!p.dead && !w.pBlocked(g, p.x, p.y), p.name + ", in the hollow under it, is " + (p.dead ? "dead: " + p.dead : "in something, at " + p.x.toFixed(1) + ", " + p.y.toFixed(1)));
    /* (and carried seventy rows over a house, and dropped on it) */
    var C = housed(), hc = C.h, gc = C.g, wc = C.w, room = [];
    gc.peasants.forEach(function (q) { q.x = 20.5; q.y = ground(wc, gc, 20); q.task = null; });
    for (x = C.s.ix0; x <= C.s.ix1; x++) for (y = C.s.F - 4; y < C.s.F; y++) if (gc.m[y * gc.gw + x] === C.M.EMPTY) room.push(y * gc.gw + x);   /* (the air in it, over the floor and under the ceiling) */
    function filled() { return room.filter(function (j) { return gc.m[j] !== C.M.EMPTY; }).length; }
    check(room.length > 20 && !filled(), "(the test wants the house's room empty: " + filled() + " of " + room.length + ")");
    var hy = ground(wc, gc, FLAT) + 1;
    lift(hc, FLAT, hy + 14, 16);
    carry(hc, C.cx, C.box[2] - 70);
    hc.up();
    for (t = 0; t < 600 && (gc.hand.fly || gc.np); t++) hc.step(1);
    check(!gc.hand.fly && !gc.np && !filled(), "a hill dropped on a house put " + filled() + " cells of itself in its room");
  });

  test("hand: a house held still over the middle of the pond: its owner goes in after it as far as they can wade, and gives up once they are swimming, not swimming out after it and back for as long as it is held", function () {
    var C = housed(), h = C.h, g = C.g, w = C.w, p = C.p, px0 = -1, px1 = -1, x, y, t, wet, end = -1, swim = 0, again = 0;
    for (x = C.box[0]; x > 0; x--) {
      for (wet = false, y = 40; y < g.gh && !wet; y++) wet = !!w.LIQUID[g.m[y * g.gw + x]];
      if (wet && px1 < 0) px1 = x;
      if (!wet && px1 >= 0) { px0 = x + 1; break; }
    }
    check(px0 > 60 && px1 - px0 > 20, "(the test wants seed 6's pond left of the house: " + px0 + ".." + px1 + ")");
    var mid = (px0 + px1) >> 1;
    lift(h, C.cx, C.cy + 1, 10);
    check(p.task && p.task.kind === "chase", "(the test wants " + p.name + " after it)");
    for (t = 0; t < 60; t++) { at(h, Math.round(C.cx + (mid - C.cx) * t / 60), C.cy - 15); h.step(1); }
    for (t = 60; t < 3000; t++) {
      h.step(1);
      var on = p.task && p.task.kind === "chase";
      if (end < 0 && !on) end = t; else if (end >= 0 && on) again++;
      if (p.swimming) swim++;
    }
    check(g.hand.held && end >= 0 && end < 600 && !again, p.name + "'s chase of a house held over the middle of the pond ended " + end + " ticks after the lift, and was on again " + again + " ticks after that");
    check(swim < 1500, p.name + " swam " + swim + " ticks of 2,940 with the house held over the middle of the pond");
  });

  test("hand: a pebble flicked at somebody, or a duckling, toward the edge of the valley, from anywhere up to a dozen and more columns off, knocks them flat against it, not out over it", function () {
    /* (the reviewers' probe: seed 6, Sue on the ground d columns from a wall, nobody else about, a strip of air cleared
       over her, and a 5 by 5 of stone 7 columns off flicked at 4 toward the wall. the hop is fifteen columns along, so
       before the fix every one of these but the two right beside the wall left the village, by air) */
    [[-1, 4], [-1, 10], [-1, 14], [1, 5], [1, 10], [1, 14], [-1, 8, true], [1, 8, true]].forEach(function (a) {
      var C = housed(), h = C.h, g = C.g, w = C.w, M = C.M, p = C.p, dir = a[0], X = dir < 0 ? a[1] : g.gw - 1 - a[1], y = ground(w, g, X), i, j, t;
      var PX = X - dir * 7, PY = y - 4, who, left = 0;
      g.peasants.forEach(function (o) { if (o !== p) stand(C, o, FLAT); });
      for (i = Math.min(PX, X) - 3; i <= Math.max(PX, X) + 3; i++) for (j = PY - 6; j <= y; j++) w.sandSet(g, j * g.gw + i, M.EMPTY);
      y = ground(w, g, X);
      if (a[2]) { stand(C, p, FLAT); who = w.duckSpawn(g, X + 0.5, y, null, true, true); }
      else { who = p; p.x = X + 0.5; p.y = y; p.state = "walk"; p.task = null; p.vx = p.vy = 0; p.falling = false; p.fallY = y; p.sleep = 0; }
      for (i = -2; i <= 2; i++) for (j = -2; j <= 2; j++) w.sandSet(g, (PY + j) * g.gw + PX + i, M.STONE);
      lift(h, PX, PY, 3);
      h.flick(4 * dir, 0); h.up();
      var knocked = false, far = who.x;
      for (t = 0; t < 300; t++) {
        h.step(1);
        if (who.state === "fly" || who.state === "thrown") knocked = true;
        if (!who.dead) far = dir < 0 ? Math.min(far, who.x) : Math.max(far, who.x);
      }
      g.feed.forEach(function (f) { if (/left\. by air|left the village/.test(f.text || "")) left++; });
      var how = (a[2] ? "a duckling" : p.name) + " " + a[1] + " columns from the " + (dir < 0 ? "left" : "right") + "-hand wall";
      check(knocked, "(the test wants " + how + " knocked: " + who.state + ")");
      check(!who.dead && !left && far >= 0 && far <= g.gw, how + ", knocked toward it, went as far as x " + far.toFixed(1) + (who.dead ? ", and is gone" : "") + (left ? " (" + left + " left by air)" : ""));
    });
  });
};
