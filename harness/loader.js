/* =====================================================================
   PLEASAND  --  harness/loader.js

   the game, in node, with nothing to draw on and nobody to listen.

   every script index.html loads, in the order it loads them, compiled
   into one function so it runs at full speed and shares one scope, the
   way the browser shares one global. the canvas is a stub that throws
   its drawings away, there is no audio, and the clock is ours: it only
   moves when the harness steps the game. Math.random is a seedable
   generator whose state can be read and put back, so a village can be
   played twice and come out the same.

   the scope is reachable through eval(): every function and variable in
   every script is fair game, by name, as if you were at the console.
   ===================================================================== */
"use strict";
var fs = require("fs"), path = require("path");

var ROOT = path.join(__dirname, "..");

/* the scripts, in load order, taken from index.html so they cannot drift */
function gameFiles() {
  var html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8"), out = [], m;
  var re = /<script\s+src="([^"]+)"\s*><\/script>/g;
  while ((m = re.exec(html))) out.push(m[1]);
  if (!out.length) throw new Error("harness/loader: no <script src> tags in index.html");
  return out;
}

function noop() {}

/* a 2d context that keeps nothing. every method is a no-op, every property
   settable, and anything we did not think of is a no-op too */
var CTX_METHODS = ["fillRect", "strokeRect", "clearRect", "fillText", "strokeText", "beginPath", "closePath",
  "moveTo", "lineTo", "quadraticCurveTo", "bezierCurveTo", "arc", "arcTo", "rect", "fill", "stroke", "clip",
  "drawImage", "putImageData", "save", "restore", "translate", "scale", "rotate", "setTransform",
  "resetTransform", "setLineDash"];

function stubCtx(canvas) {
  var c = {
    canvas: canvas,
    createImageData: function (w, h) {
      if (w && typeof w === "object") { h = w.height; w = w.width; }
      return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
    },
    getImageData: function (x, y, w, h) { return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h }; },
    measureText: function (s) { return { width: String(s).length * 4 }; },
    createRadialGradient: function () { return { addColorStop: noop }; },
    createLinearGradient: function () { return { addColorStop: noop }; }
  };
  CTX_METHODS.forEach(function (k) { c[k] = noop; });
  return new Proxy(c, {
    get: function (t, k) {
      if (typeof k === "symbol") return t[k];
      if (k in t) return t[k];
      return noop;
    },
    set: function (t, k, v) { t[k] = v; return true; }
  });
}

function stubCanvas() {
  var cv = {
    width: 640, height: 400, style: {},
    addEventListener: noop, removeEventListener: noop,
    setPointerCapture: noop, releasePointerCapture: noop,
    getBoundingClientRect: function () { return { left: 0, top: 0, right: 640, bottom: 400, width: 640, height: 400 }; },
    toDataURL: function () { return ""; }
  };
  cv.getContext = function () { return stubCtx(cv); };
  return cv;
}

/* mulberry32. state is exposed so a snapshot can take the dice with it */
function makeRng(seed) {
  var state = (seed >>> 0) || 0x9e3779b9;
  var rng = {
    seed: (seed >>> 0) || 0x9e3779b9,
    reseed: function (s) { state = (s >>> 0) || 0x9e3779b9; rng.seed = state; },
    random: function () {
      state = (state + 0x6d2b79f5) >>> 0;
      var t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
  };
  Object.defineProperty(rng, "state", {
    get: function () { return state; },
    set: function (v) { state = v >>> 0; }
  });
  return rng;
}

/* load the game. returns the eval accessor into the game's scope, plus the
   pieces the harness needs to keep it deterministic and inspectable.
   opts.host is handed to the sandbox as __h, for the harness's own hooks */
function loadGame(opts) {
  opts = opts || {};
  var seed = opts.seed == null ? 1 : (opts.seed >>> 0);
  var files = gameFiles();
  var rng = makeRng(seed);
  var clock = { t: opts.startTime || 0 };
  var host = opts.host || {};
  var readyFn = null, calls = 0;
  var draw = rng.random;
  rng.random = function () { calls++; return draw(); };

  /* the game's Math: the real one, with its own random */
  var sandboxMath = Object.create(Math);
  sandboxMath.random = function () { return rng.random(); };

  var perf = { now: function () { return clock.t; }, timeOrigin: 0 };
  /* the game boots itself if the document is already loaded. keep it waiting,
     so the harness can see how many dice the scripts rolled while loading, and
     then start the village on purpose. reset needs that number to deal the
     same hand again. */
  var doc = {
    readyState: "loading", title: "", hidden: false, body: {},
    createElement: function () { return stubCanvas(); },
    getElementById: function () { return stubCanvas(); },
    querySelector: function () { return null; },
    addEventListener: function (type, fn) { if (type === "DOMContentLoaded") readyFn = fn; },
    removeEventListener: noop
  };
  var win = {
    devicePixelRatio: 1, innerWidth: 640, innerHeight: 400,
    addEventListener: noop, removeEventListener: noop, requestAnimationFrame: noop
  };

  var src = files.map(function (f) {
    return fs.readFileSync(path.join(ROOT, f), "utf8").replace(/^"use strict";/m, "");
  }).join("\n;\n");

  var factory = new Function("window", "document", "requestAnimationFrame", "performance", "Math", "__h",
    '"use strict";\n' + src + "\n;return function (expr) { return eval(expr); };");
  var evalIn = factory(win, doc, noop, perf, sandboxMath, host);
  var preBootCalls = calls;

  return {
    root: ROOT, files: files, seed: seed, rng: rng, clock: clock, host: host, window: win,
    eval: evalIn, preBootCalls: preBootCalls, booted: false,
    /* start the village, the way the browser does once the page is up */
    boot: function () {
      if (!readyFn) return false;
      var fn = readyFn; readyFn = null;
      this.booted = true;
      fn();
      return true;
    },
    /* the live game object. fetched afresh: reset replaces it */
    get g() { return evalIn("g"); }
  };
}

module.exports = { loadGame: loadGame, gameFiles: gameFiles, makeRng: makeRng, stubCanvas: stubCanvas, stubCtx: stubCtx, ROOT: ROOT };
