/* =====================================================================
   PLEASAND  --  test/heat.js

   the heat step walks the valley by words where it can (four cells at a
   time: cold words, idle words, steady words, air), and cell by cell
   where it cannot. the two walks must come to the same world, bit for
   bit, dice and all. two games of one seed are given the same cells; in
   the second the temperatures are moved four bytes off a double, so the
   step cannot walk it by words (heat.js heatViews) and goes cell by
   cell, as it was first written. then both are stepped, and compared
   after every step. required by test/run.js
   ===================================================================== */
"use strict";

module.exports = function (test, check, sim) {
  /* a (by words) and b (cell by cell), gw wide, the same dice */
  function pair(gw) {
    var a = sim.load(5, { gw: gw }), b = sim.load(5, { gw: gw }), gb = b.g, n = gb.T.length;
    var T = new Float32Array(new ArrayBuffer(n * 4 + 8), 4, n);
    T.set(gb.T); gb.T = T;
    return { a: a, b: b };
  }
  /* every cell the same in both, and counted as it is */
  function fill(p, fn) {
    var ga = p.a.g, gb = p.b.g, n = ga.m.length, gw = ga.gw, i, c;
    for (i = 0; i < n; i++) {
      c = fn(i % gw, (i / gw) | 0, i, ga);
      ga.m[i] = gb.m[i] = c.v; ga.T[i] = gb.T[i] = c.t; ga.lat[i] = gb.lat[i] = c.l || 0;
      ga.aux[i] = gb.aux[i] = c.a || 0; ga.sh[i] = gb.sh[i] = c.s || 0; ga.vy[i] = gb.vy[i] = 0;
    }
    ga.hm.set(ga.m); gb.hm.set(gb.m); ga.ha.set(ga.aux); gb.ha.set(gb.aux); ga.hs.set(ga.sh); gb.hs.set(gb.sh);
  }
  /* one heat step in each; null if they agree, else where they part */
  function stepBoth(p) {
    var ga = p.a.g, gb = p.b.g, n = ga.m.length, i;
    p.a.heatStep(ga); p.b.heatStep(gb);
    var Ta = new Int32Array(ga.T.buffer, ga.T.byteOffset, n), Tb = new Int32Array(gb.T.buffer, gb.T.byteOffset, n);
    var La = new Int32Array(ga.lat.buffer, ga.lat.byteOffset, n), Lb = new Int32Array(gb.lat.buffer, gb.lat.byteOffset, n);
    for (i = 0; i < n; i++)
      if (Ta[i] !== Tb[i] || La[i] !== Lb[i] || ga.m[i] !== gb.m[i] || ga.aux[i] !== gb.aux[i])
        return "cell " + (i % ga.gw) + "," + ((i / ga.gw) | 0) + " (" + ga.m[i] + "/" + gb.m[i] + "): T " + ga.T[i] + " / " + gb.T[i] +
               ", lat " + ga.lat[i] + " / " + gb.lat[i];
    var ra = p.a.eval("Math.random()"), rb = p.b.eval("Math.random()");
    return ra === rb ? null : "the dice: " + ra + " / " + rb;
  }

  test("heat: the walk by words and the walk by cells come to the same valley, on terraces of heat a hair either side of every threshold", function () {
    [272, 1088].forEach(function (gw) {
      var p = pair(gw), M = p.a.MAT, s = 99, f32 = new Float32Array(1), i32 = new Int32Array(f32.buffer);
      var rnd = function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
      var mats = [M.EMPTY, M.EMPTY, M.EMPTY, M.EMPTY, M.EMPTY, M.STONE, M.STONE, M.SAND, M.WATER, M.WATER, M.OIL, M.LAVA, M.METAL,
                  M.FIRE, M.TORCH, M.SNOW, M.ICE, M.STEAM, M.WOOD, M.INERT, M.SALTWATER, M.GLASS, M.EMBER, M.ASH, M.SALT];
      var calmM = [M.EMPTY, M.EMPTY, M.EMPTY, M.STONE, M.SAND, M.WATER, M.WATER, M.OIL, M.SALTWATER, M.GLASS, M.WOOD, M.INERT];
      var steps = [0, 0, 0, 0.05, 0.05, 0.5, 1, 1, 2, -0.05, -1, -1, -0.5];
      /* a temperature near base: on it, 0.05 or 0.5 off, an ulp past 0.05, a little off, -0 and +0, now and then a NaN or
         an infinity */
      var ulp = function (t) { f32[0] = t; i32[0] += rnd() < 0.5 ? 1 : -1; return f32[0]; };
      var near = function (base) {
        var r = rnd();
        if (r < 0.3) return base;
        if (r < 0.4) return base + 0.05;
        if (r < 0.45) return ulp(base + 0.05);
        if (r < 0.55) return base + (rnd() < 0.5 ? 0.5 : -0.5);
        if (r < 0.6) return base + (rnd() < 0.5 ? 0.0500001 : -0.0499999);
        if (r < 0.7) return base + (rnd() - 0.5) * 0.1;
        if (r < 0.8) return base + (rnd() - 0.5) * 2;
        if (r < 0.82) return rnd() < 0.5 ? 0 : -0;
        if (r < 0.83) return NaN;
        if (r < 0.835) return rnd() < 0.5 ? Infinity : -Infinity;
        if (r < 0.9) return 20;
        return base + (rnd() - 0.5) * 40;
      };
      var cases = gw === 272 ? 60 : 12;
      for (var c = 0; c < cases; c++) {
        var base = [20, 20, 0, -10, 99.95, 100, 250, 1000][Math.floor(rnd() * 8)], dens = rnd();
        /* half of them in terraces of rows, each a step off the one over it, things laid in columns (so a cell often has
           the same thing over it); half of those only calm things at room temperature or near it, so step 2 stays still */
        var lay = rnd() < 0.5, calm = lay && rnd() < 0.5, rowT = 0, latP = calm ? 0.02 : 0.03, ga = p.a.g;
        fill(p, function (x, y, i) {
          var v, t, L;
          if (lay) {
            if (x === 0 && (i === 0 || rnd() < 0.3)) {
              rowT = i === 0 ? (calm && rnd() < 0.5 ? 20 : base) : rowT + steps[Math.floor(rnd() * steps.length)];
              if (rnd() < 0.15) rowT = ulp(rowT);
              if (calm && rnd() < 0.3) rowT = 20;
            }
            var pool = calm ? calmM : mats, r = rnd();
            v = y > 0 && rnd() < 0.75 ? ga.m[i - gw] : pool[Math.floor(rnd() * pool.length)];
            if ((i & 3) !== 0 && rnd() < 0.5) v = ga.m[i - 1];
            t = r < 0.8 ? rowT : r < 0.9 ? rowT + (rnd() < 0.5 ? 0.05 : -0.05) : r < 0.95 ? near(rowT) : rowT + (rnd() - 0.5) * 0.1;
          } else {
            if (rnd() > dens) { v = M.EMPTY; t = rnd() < 0.5 ? 20 : near(base); }
            else { v = mats[Math.floor(rnd() * mats.length)]; t = near(base); }
            /* (blocks of one thing at one temperature, so words come out whole) */
            if ((i & 3) !== 0 && rnd() < 0.7) { v = ga.m[i - 1]; t = rnd() < 0.6 ? ga.T[i - 1] : near(ga.T[i - 1]); }
          }
          L = rnd() < latP ? (rnd() - 0.5) * 100 : (rnd() < 0.01 ? -0 : 0);
          return { v: v, t: t, l: L, a: v === M.LAVA ? [0, M.GLASS, M.METAL][Math.floor(rnd() * 3)] : 0, s: Math.floor(rnd() * 256) };
        });
        var gb = p.b.g, n = ga.m.length, j, q, d;
        /* some cells changed since they were last counted: step 0 recounts them */
        for (j = 0; j < n; j++) if (rnd() < (calm ? 0.0005 : 0.02)) ga.hm[j] = gb.hm[j] = mats[Math.floor(rnd() * mats.length)];
        for (var k = 0; k < 6; k++) {
          d = stepBoth(p);
          check(d === null, gw + " wide, case " + c + (lay ? (calm ? " (calm terraces)" : " (terraces)") : "") + ", step " + k + ": the walks part at " + d);
          /* and a little disturbance between steps, as the world gives: a cell warmed, a few painted */
          j = Math.floor(rnd() * n); ga.T[j] = gb.T[j] = near(ga.T[j]);
          for (q = 0; q < (calm ? 3 : 20); q++) { j = Math.floor(rnd() * n); ga.m[j] = gb.m[j] = (calm ? calmM : mats)[Math.floor(rnd() * (calm ? calmM : mats).length)]; }
        }
      }
    });
  });
};
