/* =====================================================================
   PLEASAND  --  simwasm.ts

   the sand step's walk and the heat step, played by WebAssembly (the
   Rust in wasm/, built into simwasm-bin.js by wasm/build.sh) where it
   can be. it plays the very same world the JS does (world.ts
   sandStepJs, heat.ts heatStepJs), cell for cell, degree for degree and
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

   it colours the cells in view, too (simDraw: game.ts drawWorld's loop, the same colours to the bit, the picture's own
   dice): its px and gp are copied onto the picture, and JS draws everything else over them as before.

   the dice: when the game's Math.random is a mulberry32 whose state can
   be read (rng.ts RNG in a browser, the harness's own), the module rolls
   it itself and hands the state back before anything of JS's rolls; when
   it is not (test/sim.js's), the module asks Math.random for every die.

   changing a rule: change it in both, the JS (world.ts, heat.ts) and the
   Rust (wasm/src/lib.rs), run wasm/build.sh, and check with test/wasm.js
   (node test/run.js wasm) and harness/same.js that they still agree.
   ===================================================================== */
"use strict";

/* (what this file keeps in g) */
interface Game {
  pressList?: Int32Array;
}

/* what the module exports (wasm/src/lib.rs) */
interface SimExports {
  memory: WebAssembly.Memory;
  sim_abi(): number;
  sim_known_mats(): number;
  sim_tab(k: number): number;
  sim_scratch_bytes(gw: number, gh: number): number;
  sim_heat_consts(bq: number, bandHi: number, airW: number, amb: number): void;
  sim_consts(...k: number[]): void;
  sim_draw_consts(n: number, t0: number, step: number): void;
  sim_bind(...ptrsAndSize: number[]): void;
  sim_bind_draw(...ptrsAndSize: number[]): void;
  sim_rng_mode(own: number): void;
  sim_sand(tick: number, parity: number, pgen: number, dmask: number): void;
  sim_heat(dmask: number): void;
  sim_press_n(): number;
  sim_pgen(): number;
  sim_draw(x0: number, x1: number, t: number, flick: number): number;
}
type SimArray = Uint8Array | Int8Array | Uint32Array | Int32Array | Float32Array;
interface SimArrayType { new (buf: ArrayBufferLike, at: number, n: number): SimArray; BYTES_PER_ELEMENT: number; }
/* views of the module's memory: the grid's arrays (SIM_ARRS) and the picture's own */
interface SimViews {
  [name: string]: SimArray;
  m: Uint8Array; pressList: Int32Array; px: Uint32Array; gp: Uint32Array; wave: Uint8Array; haze: Int8Array;
}
/* the instance, and what it is bound to */
interface Sim {
  ex: SimExports; mem: WebAssembly.Memory; u32: Uint32Array; cnt: Int32Array; rngAt: number;
  g: Game; R: Dice; n: number; gw: number; views: SimViews;
}

var SIM_WASM = !(typeof location !== "undefined" && location && /[?&]js(&|=|$)/.test(location.search || ""));
/* (the module, compiled once; the instance and its views, made at the first step that wants them) */
var SIM_MOD: WebAssembly.Module = null, SIM: Sim = null, SIM_DEAD = false;
/* how many kinds of thing the Rust knows the rules of: a MAT it does not know, and the JS plays the world */
var SIM_ABI = 2;

function simBytes(s: string) {
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
  var S: Sim = { ex: null, mem: null, u32: null, cnt: null, rngAt: 0, g: null, R: null, n: -1, gw: -1, views: null };
  try {
    var inst = new WebAssembly.Instance(SIM_MOD, { env: {
      js_rnd: function () { return Math.random(); },
      js_turn: function (i, x, y, v) { simOut(S); sandTurn(S.g, i, x, y, v); simIn(S); },
      js_boom: function (j) { simOut(S); sandBoom(S.g, j); simIn(S); },
      js_launch: function (j) { simOut(S); sandLaunch(S.g, j); simIn(S); },
      js_nuke: function (j) { simOut(S); sandNuke(S.g, j); simIn(S); },
      js_bloom: function (x, y) { simOut(S); sandBloom(S.g, x, y); simIn(S); },
      /* (the picture's) */
      js_sin: Math.sin,
      js_lit: function (x, y) { return wLitGlass(S.g, x, y) ? 1 : 0; }
    } });
    S.ex = inst.exports as unknown as SimExports; S.mem = S.ex.memory;
    if (S.ex.sim_abi() !== SIM_ABI) throw new Error("simwasm-bin.js is not the build this simwasm.ts was written for");
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
function simViews(S: Sim) {
  var buf = S.mem.buffer;
  S.u32 = new Uint32Array(buf);
  S.rngAt = S.ex.sim_tab(40) >> 2;
  S.cnt = new Int32Array(buf, S.ex.sim_tab(41), 4);
}
/* the rules' tables, as JS made them, copied in once */
function simTables(S: Sim) {
  var ex = S.ex, buf = S.mem.buffer, k, v;
  function put(Type: SimArrayType, at: number, src: ArrayLike<number>, len: number) {
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
  /* the picture's: every thing's shades, lit and not, wet sand, pools by depth, mushroom smoke, the glow's ramp, what is
     leafy to a peasant, and the colours game.ts drawWorld names */
  var pal = new Uint32Array(buf, ex.sim_tab(50), 64 * 256), lit = new Uint32Array(buf, ex.sim_tab(51), 64 * 256);
  for (v = 0; v < NMAT && v < SAND_PAL.length; v++) { pal.set(SAND_PAL[v], v << 8); lit.set(SAND_LIT[v], v << 8); }
  put(Uint32Array, 52, SAND_WET, 256);
  var deep = new Uint32Array(buf, ex.sim_tab(53), 4 * 17 * 256), slot = new Uint8Array(buf, ex.sim_tab(54), 256), ns = 0;
  for (v = 0; v < SAND_DEEP.length; v++) if (SAND_DEEP[v]) { deep.set(SAND_DEEP[v], ns * 17 * 256); slot[v] = ++ns; }
  put(Uint32Array, 55, MUSH_PAL, 256);
  put(Uint32Array, 56, GLOW_PAL, Math.min(1024, GLOW_PAL.length));
  put(Uint8Array, 57, P_LEAF, NMAT);
  put(Uint32Array, 58, [HAZE_TINT, CHILL_TINT, COLD_TINT, WIN_DARK, DOOR_KNOB, P_SKIN32, INERT_GLINT, LAVA_COOL, LAVA_WARM,
                        LAVA_HOT, LAVA_GLASS, LAVA_METAL], 12);
  ex.sim_draw_consts(GLOW_PAL.length, GLOW_T0, GLOW_STEP);
}

/* the grid's arrays, and their types. (dmask comes and goes: wonders.ts) */
var SIM_ARRS: [string, SimArrayType][] = [["m", Uint8Array], ["stamp", Uint32Array], ["aux", Uint8Array], ["sh", Uint8Array], ["vy", Uint8Array],
                ["T", Float32Array], ["lat", Float32Array], ["hm", Uint8Array], ["ha", Uint8Array], ["hs", Uint8Array],
                ["pmark", Uint32Array], ["pstack", Int32Array], ["fastList", Int32Array], ["dmask", Uint8Array],
                ["bg", Uint32Array]];
/* (the ones a valley may be without: wonders.ts makes dmask only for the bellows, and the sky, bg, is the picture's) */
var SIM_OPT: Record<string, number> = { dmask: 1, bg: 1 };
/* room in the module's memory for a valley gw wide, and views of it: the grid's arrays (SIM_ARRS), the pressure step's
   tries, the heat step's scratch, and the picture's own (px and gp, the waves, the haze, the pools' depth). (a new width
   gets new room: the old is not given back, but a valley changes width only on a NEW or a load) */
function simLayout(S: Sim, g: Game) {
  var gw = g.gw, gh = g.gh, n = gw * gh, k, at, need = 0, views = {} as SimViews, ptr: Record<string, number> = {};
  var parts = SIM_ARRS.map(function (a): [string, number] { return [a[0], a[1].BYTES_PER_ELEMENT * n]; });
  parts.push(["pressList", 4 * PRESS_TRIES], ["scratch", S.ex.sim_scratch_bytes(gw, gh)],
             ["px", 4 * n], ["gp", 4 * n], ["wave", gw], ["haze", gh], ["dep", gw]);
  for (k = 0; k < parts.length; k++) need += (parts[k][1] + 15) & ~15;
  if (S.g !== null) simEvict(S);
  at = (S.mem.buffer.byteLength + 15) & ~15;
  var pages = Math.ceil((at + need - S.mem.buffer.byteLength) / 65536);
  if (pages > 0) S.mem.grow(pages);
  simViews(S);
  for (k = 0; k < parts.length; k++) { ptr[parts[k][0]] = at; at += (parts[k][1] + 15) & ~15; }
  var buf = S.mem.buffer;
  for (k = 0; k < SIM_ARRS.length; k++) views[SIM_ARRS[k][0]] = new SIM_ARRS[k][1](buf, ptr[SIM_ARRS[k][0]], n);
  views.pressList = new Int32Array(buf, ptr.pressList, PRESS_TRIES);
  views.px = new Uint32Array(buf, ptr.px, n); views.gp = new Uint32Array(buf, ptr.gp, n);
  views.wave = new Uint8Array(buf, ptr.wave, gw); views.haze = new Int8Array(buf, ptr.haze, gh);
  S.ex.sim_bind(ptr.m, ptr.stamp, ptr.aux, ptr.sh, ptr.vy, ptr.T, ptr.lat, ptr.hm, ptr.ha, ptr.hs, ptr.pmark, ptr.pstack,
                ptr.fastList, ptr.dmask, ptr.pressList, ptr.scratch, gw, gh);
  S.ex.sim_bind_draw(ptr.px, ptr.gp, ptr.bg, ptr.wave, ptr.haze, ptr.dep, gw, gh);
  S.views = views; S.n = n; S.gw = gw;
}
/* the valley that was bound before a new one is given copies of its arrays to keep: the memory is the new one's now */
function simEvict(S: Sim) {
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
function simBind(S: Sim, g: Game) {
  var n = g.gw * g.gh, k, nm, a, v, V;
  if (S.n !== n || S.gw !== g.gw || S.views === null || S.views.m.buffer !== S.mem.buffer) simLayout(S, g);
  else if (S.g !== g && S.g !== null) simEvict(S);
  S.g = g; V = S.views;
  for (k = 0; k < SIM_ARRS.length; k++) {
    nm = SIM_ARRS[k][0]; a = g[nm]; v = V[nm];
    if (a === v) continue;
    if (!a) { if (SIM_OPT[nm]) continue; throw new Error("simwasm: g." + nm + " is missing"); }
    if (a.length !== n) throw new Error("simwasm: g." + nm + " is " + a.length + " long, not " + n);
    v.set(a); g[nm] = v;
  }
  a = g.pressList;
  if (a !== V.pressList) { V.pressList.set(a.subarray(0, PRESS_TRIES)); g.pressList = V.pressList; }
}

/* the dice the game is rolling, if the module can roll them itself: their state, to read and set. else null */
function simRng(): Dice {
  if (typeof RNG !== "undefined" && RNG && Math.random === RNG.random) return RNG;
  var h = typeof window !== "undefined" && window ? window.PLEASAND_RNG : null;
  if (h && Math.random === h.random) return h;
  return null;
}
/* what the step counted up, onto g */
function simFlush(S: Sim, g: Game) {
  var c = S.cnt;
  if ((c[0] | c[1] | c[2]) === 0) return;
  g.score += c[0]; g.fx.hiss += c[1]; g.fx.whoosh += c[2];
  c[0] = 0; c[1] = 0; c[2] = 0;
}
/* out to JS in the middle of a step, and back */
function simOut(S: Sim) { if (S.R !== null) S.R.state = S.u32[S.rngAt]; simFlush(S, S.g); }
function simIn(S: Sim) { if (S.R !== null) S.u32[S.rngAt] = S.R.state >>> 0; }

/* the module, bound to g, if it is to play g's step. else null */
function simFor(g: Game) {
  if (!SIM_WASM) return null;
  var S = SIM !== null ? SIM : simGet();
  if (S === null || (g.gw & 3) !== 0 || g.gw < 8 || g.gh < 3) return null;
  simBind(S, g);
  return S;
}
function simRun(S: Sim, g: Game, heat: boolean) {
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
function sandStep(g: Game) {
  var S = simFor(g);
  if (S === null) return sandStepJs(g);
  var T = ++g.tick;
  g.parity ^= 1;
  g.pressN = 0;
  if (g.gw > VIEW_GW && T % 300 === 0) vRangeSet(g);   /* (the village's range, now and then: world.ts) */
  simRun(S, g, false);
  heatStep(g);
}
function heatStep(g: Game) {
  var S = simFor(g);
  if (S === null) return heatStepJs(g);
  simRun(S, g, true);
}
/* the picture of the cells in columns X0 to X1 (game.ts drawWorld), coloured by the module into g.px and g.gpx: how many
   are hot. -1 if the module is not to do it (then drawWorld does it itself) */
function simDraw(g: Game, X0: number, X1: number, t: number, flick: number) {
  if (!SIM_WASM || g.thermal || !g.bg || !g.px || !g.gpx) return -1;
  var S = SIM !== null ? SIM : simGet();
  if (S === null || (g.gw & 3) !== 0 || g.gw < 8 || g.gh < 3 || g.bg.length !== g.gw * g.gh || g.px.length !== g.bg.length) return -1;
  simBind(S, g);
  var V = S.views, gw = g.gw, y, a, b;
  V.wave.set(g.wave); V.haze.set(g.haze);
  /* (a hot cell lights the glow a column either side: in the columns just past those worked out, that lands on what the
     glow there already was, as it does in JS) */
  var e0 = X0 > 0 ? X0 - 1 : X0, e1 = X1 < gw ? X1 + 1 : X1;
  for (y = 0; y < g.gh; y++) { if (e0 < X0) V.gp[y * gw + e0] = g.gpx[y * gw + e0]; if (e1 > X1) V.gp[y * gw + X1] = g.gpx[y * gw + X1]; }
  var hot = S.ex.sim_draw(X0, X1, t, flick);
  if (hot < 0) return -1;
  /* (the columns in view onto the picture JS draws everything else over) */
  if (X0 === 0 && X1 === gw) { g.px.set(V.px); g.gpx.set(V.gp); }
  else for (y = 0; y < g.gh; y++) {
    a = y * gw + X0; b = y * gw + X1;
    g.px.set(V.px.subarray(a, b), a); g.gpx.set(V.gp.subarray(y * gw + e0, y * gw + e1), y * gw + e0);
  }
  return hot;
}

/* which one is playing g (for the debug overlay, and the tests) */
function simWho(g: Game) { return SIM_WASM && SIM !== null && g && (g.gw & 3) === 0 && SIM.g === g ? "wasm" : "js"; }
