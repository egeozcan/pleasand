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

/* the scripts, in load order, taken from index.html so they cannot drift. root: another checkout's (bench.js,
   same.js --dir: that tree's game, this harness) */
function gameFiles(root) {
  var html = fs.readFileSync(path.join(root || ROOT, "index.html"), "utf8"), out = [], m;
  var re = /<script\s+src="([^"]+)"\s*><\/script>/g;
  while ((m = re.exec(html))) out.push(m[1]);
  if (!out.length) throw new Error("harness/loader: no <script src> tags in index.html");
  return out;
}

/* TypeScript, as JavaScript: the types blanked out where they stand (node's own stripper, the one vite.config.ts uses too),
   so every line and column is where it is in the .ts and a stack trace points into the source. (node warns, once, that
   the stripper is experimental: not here) */
function stripTypes(src, file) {
  var strip = require("module").stripTypeScriptTypes, emit = process.emitWarning;
  if (!strip) throw new Error("harness/loader: node " + process.version + " cannot read TypeScript (" + file + "): it wants 22.13 or later");
  process.emitWarning = function () {};
  try { return strip(src, { mode: "strip" }); }
  catch (e) { e.message = file + ": " + e.message; throw e; }
  finally { process.emitWarning = emit; }
}

/* a script's source, as the game loads it: JavaScript, "use strict" taken off (the whole is strict). the WebAssembly
   module (simwasm-bin.js) is built, not kept (wasm/build.sh): without it the game plays the JS step, as a browser that
   has none does */
var warnedBin = false, stripped = new Map();   /* (file -> { mtime, size, js }: a process loads the game many times) */
function gameSource(root, f) {
  var file = path.join(root || ROOT, f);
  if (f === "simwasm-bin.js" && !fs.existsSync(file)) {
    if (!warnedBin) { warnedBin = true; console.warn("pleasand: no simwasm-bin.js (wasm/build.sh makes it): the JS step plays the world"); }
    return "";
  }
  var st = fs.statSync(file), memo = stripped.get(file);
  if (memo && memo.mtime === st.mtimeMs && memo.size === st.size) return memo.js;
  var src = fs.readFileSync(file, "utf8");
  if (/\.ts$/.test(f)) src = stripTypes(src, f);
  src = src.replace(/^"use strict";/m, "");
  stripped.set(file, { mtime: st.mtimeMs, size: st.size, js: src });
  return src;
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
    width: 640, height: 410, style: {},
    addEventListener: noop, removeEventListener: noop,
    setPointerCapture: noop, releasePointerCapture: noop,
    getBoundingClientRect: function () { return { left: 0, top: 0, right: 640, bottom: 410, width: 640, height: 410 }; },
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
  var root = opts.root ? path.resolve(opts.root) : ROOT;
  var files = gameFiles(root);
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
  /* (the valley's width: by default the one screen the harness, its scenarios and the tests were all made with.
     opts.gw: another, such as the browser's four screens, 1088) */
  var win = {
    PLEASAND_GW: opts.gw || 272,
    /* (the dice, to the WebAssembly step (simwasm.ts): it rolls the same generator itself, from this state, and hands
       the state back. random: what the game's Math.random is once it is booted) */
    PLEASAND_RNG: { random: draw, get state() { return rng.state; }, set state(v) { rng.state = v; } },
    devicePixelRatio: 1, innerWidth: 640, innerHeight: 410,
    addEventListener: noop, removeEventListener: noop, requestAnimationFrame: noop
  };

  var src = files.map(function (f) {
    return gameSource(root, f);
  }).join("\n;\n");

  var factory = new Function("window", "document", "requestAnimationFrame", "performance", "Math", "__h",
    '"use strict";\n' + src + "\n;return function (expr) { return eval(expr); };");
  var evalIn = factory(win, doc, noop, perf, sandboxMath, host);
  var preBootCalls = calls;
  /* the count is only wanted for the loading (reset deals that many again). from here on the game rolls the
     dice directly: same generator, same state, three calls fewer per roll */
  sandboxMath.random = draw;

  return {
    root: root, files: files, seed: seed, rng: rng, clock: clock, host: host, window: win,
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

module.exports = { loadGame: loadGame, gameFiles: gameFiles, gameSource: gameSource, stripTypes: stripTypes, makeRng: makeRng, stubCanvas: stubCanvas, stubCtx: stubCtx, ROOT: ROOT };
