/* =====================================================================
   PLEASAND  --  harness/snapshot.js

   taking the whole world apart and putting it back together.

   a snapshot is the game object, copied: the grid and its typed arrays
   byte for byte, and every peasant, duck, site, brick in the air and
   line in the ticker as plain data. plus the dice and the clock, so a
   restored village carries on exactly as it would have.

   the copy preserves who is who: if a peasant is holding a duck, or a
   duckling is following its mother, they are still the same object in
   the copy. and the game's own constant tables (hats, duck kinds) are
   kept by reference, because the game compares them by identity.

   what is not copied: canvases, the pixel buffers and the glow, which
   are drawing only, and the scratch arrays the rules fill and empty
   within a tick. none of it can change what happens next.
   ===================================================================== */
"use strict";

/* keys of g that are not part of the simulation: canvases, the picture,
   the glow, the sky, and per-tick scratch. everything else is state */
var SKIP = new Set([
  "vc", "vctx", "img", "px",                    /* the picture */
  "gc", "gctx", "gimg", "gpx",                  /* the glow */
  "gc2", "gc4", "gc2x", "gc4x",
  "bg", "dep", "haze", "wave",                  /* the sky and its parallax (drawing only) */
  "zmark", "zlist", "zn", "zt",                 /* lightning flood scratch */
  "pmark", "pstack", "pgen", "pressList", "pressN", "fastList",  /* pressure and heat scratch */
  "camI", "bootW", "stripC", "stripX", "stripI", "stripP", "stripN",   /* the view's column, NEW's width, the strip's picture */
  "tipN",                                       /* the panel's tip, in a one-screen valley */
  "navSeen", "navShut", "navCost", "navFrom", "navHow", "navLad", "navHeapI", "navHeapF", "navGen"  /* pathfinding scratch, and the count it marks its rounds with (the two go together) */
]);

function isTypedArray(v) {
  return ArrayBuffer.isView(v) && !(v instanceof DataView);
}

/* objects that must survive a round trip by identity: the game holds
   these in tables and compares them with === (a king's hat, a duck's
   kind), so a copy must point at the originals */
function constantRefs(evalIn) {
  var keep = new Set(), names = ["P_HATS", "D_KINDS"], k, list;
  for (k = 0; k < names.length; k++) {
    try { list = evalIn(names[k]); } catch (e) { continue; }
    if (Array.isArray(list)) list.forEach(function (o) { if (o && typeof o === "object") keep.add(o); });
  }
  return keep;
}

function cloneValue(v, memo, keep) {
  if (v === null || typeof v !== "object") return v;
  if (keep.has(v)) return v;
  if (memo.has(v)) return memo.get(v);
  if (isTypedArray(v)) { var a = v.slice(); memo.set(v, a); return a; }
  /* a canvas, a context, an image: drawing only. keep the original */
  if (typeof v.getContext === "function" || (v.data instanceof Uint8ClampedArray && typeof v.width === "number")) return v;
  var c, i;
  if (Array.isArray(v)) {
    c = new Array(v.length); memo.set(v, c);
    for (i = 0; i < v.length; i++) c[i] = cloneValue(v[i], memo, keep);
    return c;
  }
  c = {}; memo.set(v, c);
  var ks = Object.keys(v);
  for (i = 0; i < ks.length; i++) c[ks[i]] = cloneValue(v[ks[i]], memo, keep);
  return c;
}

/* a fresh copy of the whole game state. `runtime` is {seed, ticks, rng, clock} */
function capture(g, runtime, keep) {
  var state = {}, ks = Object.keys(g), memo = new Map(), i, k;
  for (i = 0; i < ks.length; i++) {
    k = ks[i];
    if (SKIP.has(k)) continue;
    state[k] = cloneValue(g[k], memo, keep);
  }
  return {
    version: 1,
    seed: runtime.seed,
    ticks: runtime.ticks,
    sandTick: g.tick,
    time: g.t,
    rng: runtime.rng,
    clock: runtime.clock,
    omit: [],   /* (every key of g there was, but SKIP's: apply drops the rest) */
    state: state
  };
}

/* put a snapshot back into the live game object, in place */
function apply(snap, g, keep) {
  var fresh = {}, memo = new Map(), ks = Object.keys(snap.state), i, k;
  for (i = 0; i < ks.length; i++) {
    k = ks[i];
    fresh[k] = cloneValue(snap.state[k], memo, keep);
  }
  for (i = 0; i < ks.length; i++) { k = ks[i]; g[k] = fresh[k]; }
  /* (and what has been put on g since the snapshot was taken, that was not there then: gone. a rocket in the air, a
     falling star, the salvage: anything a module keeps on g is in the snapshot or, if it was not there yet, not there.
     but scratch (SKIP: buffers, and the counts that go with them) is left as it is, together; and what the snapshot
     says it leaves out on purpose (snap.omit) is left too. a snapshot that does not say (older ones) drops nothing. a
     save's keyframe does not come this way: harness.js restore puts it in through the game's own saveApplyState) */
  if (snap.omit) {
    var om = new Set(snap.omit), now = Object.keys(g);
    for (i = 0; i < now.length; i++) { k = now[i]; if (!SKIP.has(k) && !om.has(k) && !Object.prototype.hasOwnProperty.call(snap.state, k)) delete g[k]; }
  }
  return snap;
}

/* a deep copy of a value, as a snapshot is copied (for a save's keyframe, restored through the game's own loader) */
function clone(v, keep) { return cloneValue(v, new Map(), keep || new Set()); }

/* -------------------------------------------------------------------
   a fingerprint of the whole state: every key of g but SKIP's, all the
   way down, each top-level key on its own (so a difference can be named).
   harness.js hash() is the quick one; this one leaves nothing out.

   numbers go in by value, whatever holds them (a Float32Array's 0.1 is
   the float64 it widens to, so a cell's temperature is exact), so an
   Array and a typed array of the same numbers come out the same: what
   is compared is what the world holds, not how. keys go in sorted. an
   object met a second time goes in as the order it was first met in
   (a held duck is the duck in g.ducks); the game's constant tables (hats,
   duck kinds) as their name and place. opts.skip: more keys of g to
   leave out. opts.extra: {name: value}, hashed as fields of their own
   ("@rng", the side dice, a module's own variables)
   ------------------------------------------------------------------- */
var HF = new Float64Array(1), HU = new Uint32Array(HF.buffer);

function stateHash(g, opts) {
  opts = opts || {};
  var names = new Map(), memo = new Map(), seen = 0, h = 0, k, i;
  (opts.consts || []).forEach(function (c) {
    if (Array.isArray(c[1])) c[1].forEach(function (o, j) { if (o && typeof o === "object") names.set(o, c[0] + "#" + j); });
  });
  function mix(x) { h = Math.imul(h ^ (x | 0), 16777619); }
  function num(v) {
    if ((v | 0) === v && (v !== 0 || 1 / v > 0)) { mix(1); mix(v); }
    else if (v !== v) mix(3);
    else { HF[0] = v; mix(2); mix(HU[0]); mix(HU[1]); }
  }
  function str(s) { mix(4); mix(s.length); for (var j = 0; j < s.length; j++) mix(s.charCodeAt(j)); }
  function val(v) {
    var t = typeof v, j, ks;
    if (t === "number") return num(v);
    if (t === "string") return str(v);
    if (t === "boolean") return mix(v ? 5 : 6);
    if (v === undefined) return mix(8);
    if (v === null) return mix(7);
    if (t === "function") { mix(9); return str(v.name || "?"); }
    if (t === "bigint" || t === "symbol") return str(t + ":" + String(v));
    if (names.has(v)) { mix(11); return str(names.get(v)); }
    if (memo.has(v)) { mix(10); return mix(memo.get(v)); }
    memo.set(v, seen++);
    if (isTypedArray(v) || Array.isArray(v)) {
      mix(12); mix(v.length);
      if (v instanceof Float32Array || v instanceof Float64Array) for (j = 0; j < v.length; j++) num(v[j]);
      else if (isTypedArray(v)) for (j = 0; j < v.length; j++) { mix(1); mix(v[j]); }
      else for (j = 0; j < v.length; j++) val(v[j]);
      return;
    }
    if (v instanceof Map) { mix(13); mix(v.size); v.forEach(function (x, key) { val(key); val(x); }); return; }
    if (v instanceof Set) { mix(14); mix(v.size); v.forEach(function (x) { val(x); }); return; }
    if (typeof v.getContext === "function") return mix(15);   /* (a canvas: drawing only) */
    ks = Object.keys(v).sort();
    mix(16); mix(ks.length);
    for (j = 0; j < ks.length; j++) { str(ks[j]); val(v[ks[j]]); }
  }
  function hex(x) { return ("00000000" + (x >>> 0).toString(16)).slice(-8); }
  var skip = opts.skip || null, fields = {}, all = 0x811c9dc5;
  var ks = Object.keys(g).filter(function (key) { return !SKIP.has(key) && !(skip && skip.has(key)); }).sort();
  var ex = opts.extra ? Object.keys(opts.extra).sort() : [];
  for (i = 0; i < ks.length + ex.length; i++) {
    k = i < ks.length ? ks[i] : ex[i - ks.length];
    h = 0x811c9dc5;
    val(i < ks.length ? g[k] : opts.extra[k]);
    fields[k] = hex(h);
    all = Math.imul(all ^ h, 16777619);
    for (var c = 0; c < k.length; c++) all = Math.imul(all ^ k.charCodeAt(c), 16777619);
  }
  return { hash: hex(all), fields: fields };
}

module.exports = { capture: capture, apply: apply, clone: clone, constantRefs: constantRefs, stateHash: stateHash, SKIP: SKIP };
