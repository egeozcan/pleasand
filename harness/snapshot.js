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

module.exports = { capture: capture, apply: apply, clone: clone, constantRefs: constantRefs, SKIP: SKIP };
