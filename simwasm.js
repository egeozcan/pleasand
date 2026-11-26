/* =====================================================================
   PLEASAND  --  simwasm.js

   the sand step's walk and the heat step, played by WebAssembly (the
   Rust in wasm/, built into simwasm-bin.js by wasm/build.sh) where it
   can be. it plays the very same world the JS does (world.js
   sandStepJs, heat.js heatStepJs), cell for cell, degree for degree and
   die for die, a good deal faster. where it cannot be (no WebAssembly,
   the module not compiled yet, a valley whose width is not a multiple of
   four, or SIM_WASM off), the JS plays it, and nobody can tell which.

     ?js in the address           the JS step, in a browser
     SIM_WASM = false             the same, in the harness or a test

   the grid's arrays (g.m, g.T, ...) live in the module's memory: the
   first step after they are made (gameGrid, a load, a snapshot put
   back) copies them in and puts views of that memory on g in their
   place (simBind). everything else in the game reads and writes them as
   it always has. nothing new goes on g.

   the dice: when the game's Math.random is a mulberry32 whose state can
   be read (rng.js RNG in a browser, the harness's own), the module rolls
   it itself and hands the state back before anything of JS's rolls; when
   it is not (test/sim.js's), the module asks Math.random for every die.

   changing a rule: change it in both, the JS (world.js, heat.js) and the
   Rust (wasm/src/lib.rs), run wasm/build.sh, and check with test/wasm.js
   (node test/run.js wasm) and harness/same.js that they still agree.
   ===================================================================== */
"use strict";

var SIM_WASM = !(typeof location !== "undefined" && location && /[?&]js(&|=|$)/.test(location.search || ""));
/* (the module, compiled once; the instance and its views, made at the first step that wants them) */
var SIM_MOD = null, SIM = null, SIM_DEAD = false;
/* how many kinds of thing the Rust knows the rules of: a MAT it does not know, and the JS plays the world */
var SIM_ABI = 1;

function simBytes(s) {
  if (typeof atob === "function") {
    var b = atob(s), u = new Uint8Array(b.length), i;
    for (i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return u;
  }
  return new Uint8Array(Buffer.from(s, "base64"));
}
/* compile it as the page loads: at once where that is allowed (node, and most browsers for a module this size), else in
   the background, and the JS plays until it is ready. (compiled once a process: the harness loads the game many times) */
(function simCompile() {
  if (typeof WebAssembly === "undefined" || typeof SIM_WASM_B64 === "undefined") { SIM_DEAD = true; return; }
  var G = typeof globalThis !== "undefined" ? globalThis : null, bytes;
  if (G && G.__pleasandSimB64 === SIM_WASM_B64 && G.__pleasandSimMod) { SIM_MOD = G.__pleasandSimMod; return; }
  try { bytes = simBytes(SIM_WASM_B64); } catch (e) { SIM_DEAD = true; return; }
  try { SIM_MOD = new WebAssembly.Module(bytes); }
  catch (e) {
    try { WebAssembly.compile(bytes).then(function (m) { SIM_MOD = m; }, function () { SIM_DEAD = true; }); }
    catch (e2) { SIM_DEAD = true; }
    return;
  }
  if (G) { G.__pleasandSimB64 = SIM_WASM_B64; G.__pleasandSimMod = SIM_MOD; }
})();

/* the instance, made once the module is ready. null if it cannot be */
function simGet() {
  if (SIM !== null) return SIM;
  if (SIM_DEAD || SIM_MOD === null) return null;
  var S = { ex: null, mem: null, u32: null, cnt: null, rngAt: 0, g: null, R: null, n: -1, gw: -1, views: null };
  try {
    var inst = new WebAssembly.Instance(SIM_MOD, { env: {
      js_rnd: function () { return Math.random(); },
      js_turn: function (i, x, y, v) { simOut(S); sandTurn(S.g, i, x, y, v); simIn(S); },
      js_boom: function (j) { simOut(S); sandBoom(S.g, j); simIn(S); },
      js_launch: function (j) { simOut(S); sandLaunch(S.g, j); simIn(S); },
      js_nuke: function (j) { simOut(S); sandNuke(S.g, j); simIn(S); },
      js_bloom: function (x, y) { simOut(S); sandBloom(S.g, x, y); simIn(S); }
    } });
    S.ex = inst.exports; S.mem = S.ex.memory;
    if (S.ex.sim_abi() !== SIM_ABI) throw new Error("simwasm-bin.js is not the build this simwasm.js was written for");
    var keys = Object.keys(MAT);
    if (keys.length !== S.ex.sim_known_mats() || keys.some(function (k, i) { return MAT[k] !== i; }))
      throw new Error("MAT has things the Rust does not know: rebuild it (wasm/)");
    simViews(S);
    simTables(S);
  } catch (e) {
    SIM_DEAD = true;
    if (typeof console !== "undefined") console.warn("pleasand: the WebAssembly step is off (" + e.message + "); the JS plays the world");
    return null;
  }
  SIM = S;
  return S;
}
function simViews(S) {
  var buf = S.mem.buffer;
  S.u32 = new Uint32Array(buf);
  S.rngAt = S.ex.sim_tab(40) >> 2;
  S.cnt = new Int32Array(buf, S.ex.sim_tab(41), 4);
}
/* the rules' tables, as JS made them, copied in once */
function simTables(S) {
  var ex = S.ex, buf = S.mem.buffer, k, v;
  function put(Type, at, src, len) {
    var dst = new Type(buf, ex.sim_tab(at), len);
    for (k = 0; k < len; k++) dst[k] = src[k];
  }
  put(Float32Array, 0, HEAT_KP, NMAT * NMAT);
  [HEAT_IC, HEAT_BK, HEAT_C, HEAT_T0, HEAT_HI, HEAT_HI_L, HEAT_LO, HEAT_LO_L, HEAT_SRC, HEAT_POW, LAVA_LO, HEAT_HS, HEAT_HLAT]
    .forEach(function (t, j) { put(Float32Array, 1 + j, t, NMAT); });
  /* (SAND_DENS is a plain list, and shorter than NMAT: past its end a JS read is undefined, and a NaN reads the same) */
  var dens = new Float64Array(buf, ex.sim_tab(20), 256);
  for (v = 0; v < 256; v++) dens[v] = v < SAND_DENS.length ? SAND_DENS[v] : NaN;
  var free = new Uint8Array(buf, ex.sim_tab(21), 256);
  for (v = 0; v < 256; v++) free[v] = SAND_FREE[v] === 1 ? 1 : 0;
  put(Uint8Array, 22, SAND_CANT, NMAT * NMAT); put(Uint8Array, 23, SAND_NOFLOAT, NMAT * NMAT); put(Uint8Array, 24, SAND_NOFLOW, NMAT * NMAT);
  [STILL, LIQUID, WET, WOODY, LEAFY, AIRY, HOT, FLUID, REST_KIND].forEach(function (t, j) { put(Uint8Array, 25 + j, t, NMAT); });
  put(Uint8Array, 34, STILL2, 65536);
  if (HEAT_AQ === null) heatQuietTables();
  if (HEAT_IQ2 === null) heatIdleTables();
  if (!heatBandMade) heatRangeBand();
  put(Uint8Array, 35, HEAT_AQ2, 65536);
  put(Uint8Array, 36, HEAT_IQ2, 65536);
  if (HEAT_BQ2 !== null) put(Uint8Array, 37, HEAT_BQ2, 65536);
  ex.sim_heat_consts(HEAT_BQ2 !== null ? 1 : 0, HEAT_BAND_HI32 | 0, HEAT_AIRW ? 1 : 0, HEAT_AMB32 | 0);
  ex.sim_consts(AMBIENT, T_MAX, T_MIN, HEAT_FAST, SAND_CLEAN, SAND_VMAX, PRESS_TRIES, PRESS_SCAN, W_SET, W_DRAUGHT);
}

/* the grid's arrays, and their types. (dmask comes and goes: wonders.js) */
var SIM_ARRS = [["m", Uint8Array], ["stamp", Uint32Array], ["aux", Uint8Array], ["sh", Uint8Array], ["vy", Uint8Array],
                ["T", Float32Array], ["lat", Float32Array], ["hm", Uint8Array], ["ha", Uint8Array], ["hs", Uint8Array],
                ["pmark", Uint32Array], ["pstack", Int32Array], ["fastList", Int32Array], ["dmask", Uint8Array]];
/* room in the module's memory for a valley gw wide, and views of it. (a new width gets new room: the old is not given
   back, but a valley changes width only on a NEW or a load) */
function simLayout(S, g) {
  var gw = g.gw, gh = g.gh, n = gw * gh, k, at, views = {}, list = [], need;
  var bytes = SIM_ARRS.map(function (a) { return a[1].BYTES_PER_ELEMENT * n; });
  bytes.push(4 * PRESS_TRIES, S.ex.sim_scratch_bytes(gw, gh));
  need = 0;
  for (k = 0; k < bytes.length; k++) need += (bytes[k] + 15) & ~15;
  if (S.g !== null) simEvict(S);
  at = (S.mem.buffer.byteLength + 15) & ~15;
  var pages = Math.ceil((at + need - S.mem.buffer.byteLength) / 65536);
  if (pages > 0) S.mem.grow(pages);
  simViews(S);
  var buf = S.mem.buffer;
  for (k = 0; k < SIM_ARRS.length; k++) {
    views[SIM_ARRS[k][0]] = new SIM_ARRS[k][1](buf, at, n);
    list.push(at); at += (bytes[k] + 15) & ~15;
  }
  views.pressList = new Int32Array(buf, at, PRESS_TRIES); list.push(at); at += (bytes[k] + 15) & ~15;
  list.push(at);
  S.ex.sim_bind.apply(null, list.concat([gw, gh]));
  S.views = views; S.n = n; S.gw = gw;
}
/* the valley that was bound before a new one is given copies of its arrays to keep: the memory is the new one's now */
function simEvict(S) {
  var og = S.g, k, nm, a;
  S.g = null;
  if (!og || !S.views) return;
  for (k = 0; k < SIM_ARRS.length; k++) {
    nm = SIM_ARRS[k][0]; a = og[nm];
    if (a && a === S.views[nm]) og[nm] = a.slice();
  }
  if (og.pressList === S.views.pressList) og.pressList = og.pressList.slice();
}
/* g's arrays are views of the module's memory: copied in, if they are not */
function simBind(S, g) {
  var n = g.gw * g.gh, k, nm, a, v, V;
  if (S.n !== n || S.gw !== g.gw || S.views === null || S.views.m.buffer !== S.mem.buffer) simLayout(S, g);
  else if (S.g !== g && S.g !== null) simEvict(S);
  S.g = g; V = S.views;
  for (k = 0; k < SIM_ARRS.length; k++) {
    nm = SIM_ARRS[k][0]; a = g[nm]; v = V[nm];
    if (a === v) continue;
    if (!a) { if (nm === "dmask") continue; throw new Error("simwasm: g." + nm + " is missing"); }
    if (a.length !== n) throw new Error("simwasm: g." + nm + " is " + a.length + " long, not " + n);
    v.set(a); g[nm] = v;
  }
  a = g.pressList;
  if (a !== V.pressList) { V.pressList.set(a.subarray(0, PRESS_TRIES)); g.pressList = V.pressList; }
}

/* the dice the game is rolling, if the module can roll them itself: their state, to read and set. else null */
function simRng() {
  if (typeof RNG !== "undefined" && RNG && Math.random === RNG.random) return RNG;
  var h = typeof window !== "undefined" && window ? window.PLEASAND_RNG : null;
  if (h && Math.random === h.random) return h;
  return null;
}
/* what the step counted up, onto g */
function simFlush(S, g) {
  var c = S.cnt;
  if ((c[0] | c[1] | c[2]) === 0) return;
  g.score += c[0]; g.fx.hiss += c[1]; g.fx.whoosh += c[2];
  c[0] = 0; c[1] = 0; c[2] = 0;
}
/* out to JS in the middle of a step, and back */
function simOut(S) { if (S.R !== null) S.R.state = S.u32[S.rngAt]; simFlush(S, S.g); }
function simIn(S) { if (S.R !== null) S.u32[S.rngAt] = S.R.state >>> 0; }

/* the module, bound to g, if it is to play g's step. else null */
function simFor(g) {
  if (!SIM_WASM) return null;
  var S = SIM !== null ? SIM : simGet();
  if (S === null || (g.gw & 3) !== 0 || g.gw < 8 || g.gh < 3) return null;
  simBind(S, g);
  return S;
}
function simRun(S, g, heat) {
  var R = simRng();
  S.R = R;
  if (R !== null) S.u32[S.rngAt] = R.state >>> 0;
  S.ex.sim_rng_mode(R !== null ? 1 : 0);
  try {
    if (heat) S.ex.sim_heat(g.dmask ? 1 : 0);
    else {
      S.ex.sim_sand(g.tick, g.parity, g.pgen >>> 0, g.dmask ? 1 : 0);
    }
  } finally {
    if (R !== null) R.state = S.u32[S.rngAt];
    simFlush(S, g);
    if (!heat) { g.pressN = S.ex.sim_press_n(); g.pgen = S.ex.sim_pgen() >>> 0; }
    S.R = null;
  }
}

/* -------------------------------------------------------------------
   THE STEPS, as the game calls them
   ------------------------------------------------------------------- */
function sandStep(g) {
  var S = simFor(g);
  if (S === null) return sandStepJs(g);
  var T = ++g.tick;
  g.parity ^= 1;
  g.pressN = 0;
  if (g.gw > VIEW_GW && T % 300 === 0) vRangeSet(g);   /* (the village's range, now and then: world.js) */
  simRun(S, g, false);
  heatStep(g);
}
function heatStep(g) {
  var S = simFor(g);
  if (S === null) return heatStepJs(g);
  simRun(S, g, true);
}
/* which one is playing g (for the debug overlay, and the tests) */
function simWho(g) { return SIM_WASM && SIM !== null && g && (g.gw & 3) === 0 && SIM.g === g ? "wasm" : "js"; }
