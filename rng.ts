/* =====================================================================
   PLEASAND  --  rng.ts

   the dice. in the browser, Math.random is replaced by a small generator
   (mulberry32) whose state is one number, so a save can carry the dice
   with it: a village loaded from a save, in the browser or in the
   harness, rolls the same numbers it would have rolled if nobody had
   saved it. the harness (harness/loader.js) uses the very same generator.

   only the simulation rolls these dice. drawing and sound roll their own
   (RNG_SIDE, through rngSide), because the harness neither draws nor
   plays sound: if the picture rolled the village's dice, a village with
   a screen would come out different from one without.
   ===================================================================== */
"use strict";

/* mulberry32: the same as harness/loader.js makeRng, number for number (test/run.js checks) */
function rngMake(seed: number): Dice {
  var state = (seed >>> 0) || 0x9e3779b9;
  var r = {
    random: function () {
      state = (state + 0x6d2b79f5) >>> 0;
      var t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
  } as Dice;
  Object.defineProperty(r, "state", { get: function () { return state; }, set: function (v) { state = v >>> 0; } });
  return r;
}

/* the side dice, for what nobody but the player sees or hears */
var RNG_SIDE = rngMake(0x51de);
function rngSide<F extends (...args: any[]) => any>(fn: F): F {
  return function (this: unknown) {
    var keep = Math.random;
    Math.random = RNG_SIDE.random;
    try { return fn.apply(this, arguments); } finally { Math.random = keep; }
  } as F;
}

/* the village's dice, in a browser. (the harness brings its own, and leaves RNG null) */
var RNG: Dice = null;
if (typeof HTMLCanvasElement !== "undefined") {
  RNG = rngMake(window.crypto && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : (Date.now() >>> 0));
  Math.random = RNG.random;
}
