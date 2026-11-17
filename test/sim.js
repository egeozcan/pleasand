/* =====================================================================
   PLEASAND  --  test/sim.js

   the game, without a browser: every script, in the order index.html
   loads them, inside one function (so it runs at full speed), with a
   canvas that draws nothing and a Math.random that can be seeded. for
   checking that things still work after a change, and for watching a
   village for an hour in a minute. no dependencies: just node.

     var sim = require("./sim.js"), w = sim.load(7), g = w.g;
     sim.step(w, 600);                    // ten seconds of game time
     w.mPlanMine(g, g.peasants[0]);       // anything in the game, by name
     sim.png(w, "out.png", 3);            // what it looks like
   ===================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), zlib = require("zlib");
var ROOT = path.join(__dirname, "..");
var FILES = ["audio.js", "world.js", "heat.js", "peasants.js", "build.js", "paths.js", "ideas.js", "mines.js", "oil.js", "ducks.js", "game.js"];

function stubCtx() {
  var c = { createImageData: function (w, h) { return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h }; },
            measureText: function (s) { return { width: s.length * 4 }; },
            createRadialGradient: function () { return { addColorStop: function () {} }; } };
  ["fillRect", "strokeRect", "drawImage", "putImageData", "clearRect", "save", "restore", "translate", "scale", "beginPath",
   "moveTo", "lineTo", "quadraticCurveTo", "fill", "stroke", "rect", "clip", "fillText", "setTransform", "arc", "closePath"]
    .forEach(function (k) { c[k] = function () {}; });
  return c;
}
function stubCanvas() {
  return { width: 0, height: 0, getContext: stubCtx, addEventListener: function () {}, setPointerCapture: function () {},
           getBoundingClientRect: function () { return { left: 0, top: 0, width: 640, height: 400 }; } };
}
/* a fresh game, with Math.random seeded. returns a lookup: w.g is the game, w.anything is whatever the game calls it */
function load(seed) {
  var s = (seed == null ? 1 : seed) >>> 0 || 1, M = Object.create(Math);
  M.random = function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  var src = FILES.map(function (f) { return fs.readFileSync(path.join(ROOT, f), "utf8").replace(/^"use strict";/m, ""); }).join("\n;\n");
  var ev = new Function("window", "document", "requestAnimationFrame", "performance", "Math",
    '"use strict";\n' + src + "\n;return function (expr) { return eval(expr); };")(
    { addEventListener: function () {}, devicePixelRatio: 1 },
    { readyState: "complete", createElement: stubCanvas, getElementById: stubCanvas, addEventListener: function () {} },
    function () {}, { now: function () { return 0; } }, M);
  return new Proxy({}, { get: function (t, k) { return k === "eval" ? ev : (k === "g" ? ev("g") : ev(k)); } });
}
/* n ticks of the game (60 to a second), as the main loop runs it */
function step(w, n) { var g = w.g; for (var i = 0; i < n; i++) w.gameUpdate(g, 1 / 60); }
/* everything in a site's plan, put in place at once, and the site finished */
function build(w, s) {
  var g = w.g;
  s.plan.forEach(function (e) {
    if (e.v === w.MAT.EMPTY) { if (g.m[e.i] !== w.MAT.EMPTY) { g.m[e.i] = w.MAT.EMPTY; w.heatSync(g, e.i); } }
    else { w.sandSet(g, e.i, e.v); g.aux[e.i] = e.a; w.heatAccept(g, e.i); }
  });
  s.done = true; s.repair = false;
  return s;
}
/* the picture, as a png (scale: pixels to a cell; crop: [x, y, w, h] in cells) */
function png(w, file, scale, crop) {
  var g = w.g;
  w.drawWorld(g);
  scale = scale || 3; crop = crop || [0, 0, g.gw, g.gh];
  var W = crop[2] * scale, H = crop[3] * scale, raw = Buffer.alloc((W * 4 + 1) * H), px = new Uint8Array(g.px.buffer), x, y, k;
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
    var si = ((crop[1] + ((y / scale) | 0)) * g.gw + crop[0] + ((x / scale) | 0)) * 4, di = y * (W * 4 + 1) + 1 + x * 4;
    for (k = 0; k < 3; k++) raw[di + k] = px[si + k];
    raw[di + 3] = 255;
  }
  var T = [];
  for (k = 0; k < 256; k++) { var c = k; for (var b = 0; b < 8; b++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[k] = c >>> 0; }
  function crc(buf) { var r = 0xffffffff; for (var i = 0; i < buf.length; i++) r = T[(r ^ buf[i]) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; }
  function chunk(type, data) {
    var len = Buffer.alloc(4), td = Buffer.concat([Buffer.from(type), data]), c = Buffer.alloc(4);
    len.writeUInt32BE(data.length); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  }
  var hd = Buffer.alloc(13); hd.writeUInt32BE(W, 0); hd.writeUInt32BE(H, 4); hd[8] = 8; hd[9] = 6;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", hd),
    chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
}
module.exports = { load: load, step: step, build: build, png: png };
