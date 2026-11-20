/* =====================================================================
   PLEASAND  --  save.js

   putting the village in a file, and getting it back out again.

   a save is one json file. most of it is the game object, copied: the
   grid and its typed arrays (as base64), and every peasant, duck, site
   and line in the ticker as plain data, with who-is-who kept (a peasant
   holding a duck still holds that same duck after loading), and the
   game's own constant tables (hats, duck kinds) pointed at by name.

   the rest is for whoever has to work out what went wrong, usually an
   agent with the harness (see harness/README.md): what the village looked
   like, checks that should always pass, the last few hundred things that
   happened, what you clicked and pressed, any errors and their stacks, a
   trail of where everybody was every couple of seconds, and a few older
   copies of the whole world (keyframes) to look further back. the
   readable parts come first in the file; the big `state` comes last.

     saveDocument(g)       the whole save, as an object
     saveLoad(g, doc)      put a save back into the live game
     saveDownload(g)       the browser: a .json file to keep
     saveOpenFile(g)       the browser: pick a .json file and load it
   ===================================================================== */
"use strict";

var SAVE_FORMAT = "pleasand-save", SAVE_VERSION = 1;

/* keys of g that are drawing or per-tick scratch, not the village. the
   harness's snapshots skip the same list (test/run.js keeps them equal) */
var SAVE_SKIP = [
  "vc", "vctx", "img", "px",                    /* the picture */
  "gc", "gctx", "gimg", "gpx",                  /* the glow */
  "gc2", "gc4", "gc2x", "gc4x",
  "bg", "dep", "haze", "wave",                  /* the sky and its parallax */
  "zmark", "zlist", "zn", "zt",                 /* lightning flood scratch */
  "pmark", "pstack", "pgen", "pressList", "pressN", "fastList",  /* pressure and heat scratch */
  "navSeen", "navShut", "navCost", "navFrom", "navHow", "navHeapI", "navHeapF"  /* pathfinding scratch */
];
/* and the hand on the mouse: a loaded village starts with nobody pressing anything */
var SAVE_INPUT = ["down", "btn", "ptr", "keys", "samp", "lx", "ax", "pop", "popRect", "hdrHit", "fps", "ms"];
/* and where the cursor is. peasants notice it, so the harness takes the saved one (to go on as the
   browser would have); the browser keeps the real one, under your hand */
var SAVE_POINTER = ["mx", "my", "cx", "cy", "pcx", "pcy", "cvx", "cvy"];

/* objects the game compares with ===, saved as a name and an index */
var SAVE_CONSTS = ["P_HATS", "D_KINDS"];

var SAVE_TYPED = {
  Int8Array: Int8Array, Uint8Array: Uint8Array, Uint8ClampedArray: Uint8ClampedArray,
  Int16Array: Int16Array, Uint16Array: Uint16Array, Int32Array: Int32Array, Uint32Array: Uint32Array,
  Float32Array: Float32Array, Float64Array: Float64Array
};

/* the journal: what happened, kept as it happens (in the browser; the
   harness keeps its own). none of it is in g, so none of it can change
   what the village does next */
var SAVE_J = {
  on: false,
  ev: [], inputs: [], errors: [], trail: [], keys: [],
  lastTrail: -1e9, lastKey: -1e9, lastDrag: 0, errKey: null,
  loadedFrom: null, prior: null, booted: null
};
var SAVE_MAX = { ev: 500, inputs: 600, errors: 40, trail: 450, keys: 3 };
var SAVE_TRAIL_EVERY = 120;     /* sand ticks between trail samples (2s) */
var SAVE_KEY_EVERY = 900;       /* sand ticks between keyframes (15s) */

/* -------------------------------------------------------------------
   1. TURNING THE GAME OBJECT INTO JSON, AND BACK
   ------------------------------------------------------------------- */
function saveIsTyped(v) { return ArrayBuffer.isView(v) && !(v instanceof DataView); }
function saveIsDrawing(v) {
  return typeof v.getContext === "function" || (v.data instanceof Uint8ClampedArray && typeof v.width === "number");
}

function saveConstMap() {
  var m = new Map(), k, i, list;
  for (k = 0; k < SAVE_CONSTS.length; k++) {
    try { list = eval(SAVE_CONSTS[k]); } catch (e) { continue; }   /* the game's own table, by name */
    if (Array.isArray(list)) for (i = 0; i < list.length; i++) if (list[i] && typeof list[i] === "object") m.set(list[i], [SAVE_CONSTS[k], i]);
  }
  return m;
}
function saveConstGet(name, i) {
  if (SAVE_CONSTS.indexOf(name) < 0) throw new Error("save: unknown constant table " + name);
  var list = eval(name);
  if (!list || !list[i]) throw new Error("save: " + name + "[" + i + "] is not there any more");
  return list[i];
}

function saveB64(ta) {
  var u = new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength), s = "", i, CH = 0x8000;
  for (i = 0; i < u.length; i += CH) s += String.fromCharCode.apply(null, u.subarray(i, i + CH));
  return btoa(s);
}
function saveUnB64(name, b64) {
  var C = SAVE_TYPED[name];
  if (!C) throw new Error("save: unknown typed array " + name);
  var s = atob(b64), u = new Uint8Array(s.length), i;
  for (i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return new C(u.buffer);
}

/* a value, as json. objects reached twice are written once, with an $id,
   and referred to after that with $r. odd numbers, undefined and holes
   are spelled out, because a NaN is exactly what somebody will be looking for */
function saveEncode(root, skip) {
  var consts = saveConstMap(), count = new Map(), ids = new Map(), next = 1;
  function scan(v) {
    if (v === null || typeof v !== "object" || consts.has(v)) return;
    var n = count.get(v) || 0;
    count.set(v, n + 1);
    if (n || saveIsTyped(v) || saveIsDrawing(v)) return;
    var ks = Object.keys(v), i;
    for (i = 0; i < ks.length; i++) if (!(skip && v === root && skip.indexOf(ks[i]) >= 0)) scan(v[ks[i]]);
  }
  function enc(v) {
    if (v === undefined) return { $u: 1 };
    if (typeof v === "number") return isFinite(v) ? v : { $n: String(v) };
    if (typeof v === "function") return { $f: v.name || "anonymous" };
    if (v === null || typeof v !== "object") return v;
    var c = consts.get(v);
    if (c) return { $c: c[0], i: c[1] };
    if (saveIsDrawing(v)) return { $skip: "drawing" };
    if (ids.has(v)) return { $r: ids.get(v) };
    var shared = count.get(v) > 1, id = 0, out, i, ks;
    if (shared) { id = next++; ids.set(v, id); }
    if (saveIsTyped(v)) out = { $ta: v.constructor.name, b64: saveB64(v) };
    else if (Array.isArray(v)) {
      out = new Array(v.length);
      for (i = 0; i < v.length; i++) out[i] = i in v ? enc(v[i]) : { $u: 1 };
    } else {
      out = {};
      ks = Object.keys(v);
      for (i = 0; i < ks.length; i++) {
        if (skip && v === root && skip.indexOf(ks[i]) >= 0) continue;
        out[ks[i]] = enc(v[ks[i]]);
      }
      /* a key that starts with $ would read as one of ours: wrap it */
      if (ks.some(function (k) { return k.charAt(0) === "$"; })) out = { $o: out };
    }
    return shared ? { $id: id, $v: out } : out;
  }
  scan(root);
  return enc(root);
}

function saveDecode(json) {
  var ids = new Map();
  function dec(v) {
    if (v === null || typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map(dec);
    if (v.$u === 1) return undefined;
    if (v.$n != null) return Number(v.$n);
    if (v.$c != null) return saveConstGet(v.$c, v.i);
    if (v.$r != null) { if (!ids.has(v.$r)) throw new Error("save: dangling reference " + v.$r); return ids.get(v.$r); }
    if (v.$ta != null) return saveUnB64(v.$ta, v.b64);
    if (v.$skip != null || v.$f != null) return null;
    if (v.$id != null) {
      var inner = v.$v, box;
      if (inner && inner.$ta != null) { box = saveUnB64(inner.$ta, inner.b64); ids.set(v.$id, box); return box; }
      if (Array.isArray(inner)) { box = []; ids.set(v.$id, box); for (var i = 0; i < inner.length; i++) box[i] = dec(inner[i]); return box; }
      box = {}; ids.set(v.$id, box); fill(box, inner.$o || inner); return box;
    }
    var o = {}; fill(o, v.$o || v); return o;
  }
  function fill(o, src) { for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) o[k] = dec(src[k]); }
  return dec(json);
}

/* a quick copy of the live village, kept in memory (a keyframe). cheap:
   no base64 until somebody saves */
function saveClone(g) {
  var consts = saveConstMap(), memo = new Map();
  function cl(v) {
    if (v === null || typeof v !== "object" || consts.has(v)) return v;
    if (memo.has(v)) return memo.get(v);
    if (saveIsTyped(v)) { var a = v.slice(); memo.set(v, a); return a; }
    if (saveIsDrawing(v)) return null;
    var c, i, ks;
    if (Array.isArray(v)) { c = new Array(v.length); memo.set(v, c); for (i = 0; i < v.length; i++) c[i] = cl(v[i]); return c; }
    c = {}; memo.set(v, c); ks = Object.keys(v);
    for (i = 0; i < ks.length; i++) c[ks[i]] = cl(v[ks[i]]);
    return c;
  }
  var out = {}, ks = Object.keys(g), i;
  for (i = 0; i < ks.length; i++) if (SAVE_SKIP.indexOf(ks[i]) < 0) out[ks[i]] = cl(g[ks[i]]);
  return out;
}

/* -------------------------------------------------------------------
   2. WHAT THE VILLAGE LOOKS LIKE, FOR A READER
   ------------------------------------------------------------------- */
function saveR(v) { return typeof v === "number" ? (isFinite(v) ? Math.round(v * 100) / 100 : String(v)) : v; }
/* the plain fields of a thing (numbers, strings, flags), and the ids of the things it points at */
function saveFlat(o) {
  var out = {}, k, v;
  for (k in o) {
    v = o[k];
    if (v === null || typeof v !== "object") { if (typeof v !== "function") out[k] = saveR(v); }
    else if (typeof v.id === "number") out[k] = { id: v.id, name: v.name, kind: v.kind };
    else if (Array.isArray(v)) out[k] = v.length <= 8 && v.every(function (x) { return x === null || typeof x !== "object"; }) ? v.map(saveR) : "[" + v.length + "]";
    else if (saveIsTyped(v)) out[k] = v.constructor.name + "(" + v.length + ")";
    else if (k === "task" || k === "goal" || k === "inv" || k === "stock") out[k] = saveFlat(v);
    else out[k] = "{" + Object.keys(v).slice(0, 6).join(",") + (Object.keys(v).length > 6 ? ",..." : "") + "}";
  }
  return out;
}
function saveMatName(i) { return (typeof MAT_NAME !== "undefined" && MAT_NAME[i]) || ("MATERIAL " + i); }
function saveHistogram(g) {
  var n = new Int32Array(256), i, out = {};
  for (i = 0; i < g.m.length; i++) n[g.m[i]]++;
  for (i = 0; i < 256; i++) if (n[i]) out[saveMatName(i)] = n[i];
  return out;
}
function saveSummary(g) {
  var pe = g.peasants || [], du = g.ducks || [], st = g.sites || [];
  var res = {};
  ["iron", "barrels", "gold", "coal", "stone", "wood", "score", "astronauts", "rip", "duckRip", "popGoal", "np"].forEach(function (k) {
    if (typeof g[k] === "number") res[k] = saveR(g[k]);
  });
  return {
    tick: g.tick, time: saveR(g.t), paused: !!g.paused, speed: SPEEDS[g.speed],
    counts: {
      peasants: pe.length, alive: pe.filter(function (p) { return !p.dead && p.state !== "space"; }).length,
      inSpace: pe.filter(function (p) { return p.state === "space"; }).length,
      ducks: du.length, sites: st.length, sitesDone: st.filter(function (s) { return s.done; }).length,
      particles: g.np, ghosts: (g.ghosts || []).length
    },
    numbers: res,
    ideas: g.know || {},
    achievements: Object.keys(g.got || {}),
    causes: g.causes || {},
    feed: (g.feed || []).map(function (f) { return f.text; }),
    materials: saveHistogram(g),
    peasants: pe.map(function (p) {
      var o = saveFlat(p);
      try { o.mood = pMood(g, p); } catch (e) {}
      return o;
    }),
    ducks: du.map(saveFlat),
    sites: st.map(function (s) {
      var o = saveFlat(s);
      o.plan = (s.plan || []).length;
      try { o.progress = saveR(bShare(g, s)); } catch (e) {}
      return o;
    })
  };
}

/* things that should always be true. a failed one is the first place to look */
function saveChecks(g) {
  var out = [];
  function check(id, fn) {
    var r;
    try { r = fn(); } catch (e) { out.push({ id: id, ok: false, error: String(e && e.message || e) }); return; }
    if (r === true) out.push({ id: id, ok: true });
    else out.push({ id: id, ok: false, detail: r });
  }
  function firstBad(a, bad) {
    for (var i = 0; i < a.length; i++) if (bad(a[i])) return { at: i, x: i % g.gw, y: Math.floor(i / g.gw), value: String(a[i]) };
    return null;
  }
  check("grid", function () {
    return g.m.length === g.gw * g.gh && g.T.length === g.m.length && g.lat.length === g.m.length ||
      { m: g.m.length, T: g.T.length, lat: g.lat.length, w: g.gw, h: g.gh };
  });
  check("temps finite", function () { return firstBad(g.T, function (t) { return !isFinite(t); }) || true; });
  check("latent finite", function () { return firstBad(g.lat, function (t) { return !isFinite(t); }) || true; });
  check("materials valid", function () { return firstBad(g.m, function (v) { return v >= NMAT; }) || true; });
  check("peasants finite", function () {
    var bad = (g.peasants || []).filter(function (p) { return !(isFinite(p.x) && isFinite(p.y) && isFinite(p.vx) && isFinite(p.vy)); });
    return !bad.length || bad.map(function (p) { return { id: p.id, name: p.name, x: String(p.x), y: String(p.y), vx: String(p.vx), vy: String(p.vy) }; });
  });
  check("peasants in grid", function () {
    var bad = (g.peasants || []).filter(function (p) { return !p.dead && p.state !== "space" && (p.x < -2 || p.x > g.gw + 2 || p.y > g.gh + 2); });
    return !bad.length || bad.map(function (p) { return { id: p.id, name: p.name, x: saveR(p.x), y: saveR(p.y), state: p.state }; });
  });
  check("ducks finite", function () {
    var bad = (g.ducks || []).filter(function (d) { return !(isFinite(d.x) && isFinite(d.y)); });
    return !bad.length || bad.map(function (d) { return { id: d.id, x: String(d.x), y: String(d.y) }; });
  });
  check("counts", function () {
    return (g.peasants.length <= P_MAX && g.ducks.length <= D_MAX && g.np >= 0 && g.np <= PMAX) ||
      { peasants: g.peasants.length, ducks: g.ducks.length, np: g.np };
  });
  check("unique ids", function () {
    var bad = [];
    [["peasants", g.peasants], ["ducks", g.ducks], ["sites", g.sites]].forEach(function (pair) {
      var seen = {};
      (pair[1] || []).forEach(function (o) { if (seen[o.id]) bad.push(pair[0] + " #" + o.id); seen[o.id] = 1; });
    });
    return !bad.length || bad;
  });
  check("tasks point at real sites", function () {
    var live = new Set(g.sites || []), bad = [];
    (g.peasants || []).forEach(function (p) {
      if (p.task && p.task.site && typeof p.task.site === "object" && !live.has(p.task.site))
        bad.push({ id: p.id, name: p.name, task: p.task.kind, site: p.task.site.id });
    });
    return !bad.length || bad;
  });
  check("held things", function () {
    var bad = [];
    if (g.held && (g.peasants || []).indexOf(g.held) < 0) bad.push("g.held is not in g.peasants");
    if (g.heldDuck && (g.ducks || []).indexOf(g.heldDuck) < 0) bad.push("g.heldDuck is not in g.ducks");
    return !bad.length || bad;
  });
  return out;
}

/* -------------------------------------------------------------------
   3. THE JOURNAL: kept while you play (browser only)
   ------------------------------------------------------------------- */
function saveKeep(list, item, max) { list.push(item); if (list.length > max) list.splice(0, list.length - max); }
function saveStamp(g) { return { tick: g ? g.tick : 0, t: g ? saveR(g.t) : 0, at: new Date().toISOString() }; }

function saveNote(g, kind, data) {
  if (!SAVE_J.on) return;
  var e = saveStamp(g), k;
  e.kind = kind;
  for (k in data) e[k] = data[k];
  saveKeep(SAVE_J.ev, e, SAVE_MAX.ev);
}
function saveInput(g, kind, data) {
  if (!SAVE_J.on) return;
  var e = { tick: g.tick, t: saveR(g.t), kind: kind }, k;
  for (k in data) e[k] = data[k];
  saveKeep(SAVE_J.inputs, e, SAVE_MAX.inputs);
}
function saveError(g, err, where) {
  if (!SAVE_J.on) return;
  var e = saveStamp(g);
  e.where = where || "update";
  e.message = String(err && err.message || err);
  e.stack = String(err && err.stack || "");
  /* the same error sixty times a second is one error, many times */
  var last = SAVE_J.errors[SAVE_J.errors.length - 1];
  if (last && last.message === e.message && last.where === e.where) { last.repeats = (last.repeats || 1) + 1; last.lastTick = e.tick; return; }
  saveKeep(SAVE_J.errors, e, SAVE_MAX.errors);
  /* and the world as it was when the first one happened */
  if (!SAVE_J.errKey && g && g.m) { try { SAVE_J.errKey = { why: "first error: " + e.message, tick: g.tick, t: saveR(g.t), rng: RNG ? RNG.state : null, state: saveClone(g) }; } catch (x) {} }
}

/* wrap the game's own news so the journal hears it too. `before` sees the
   arguments first (and may return false to say "not news"), `after` hears them once it is done */
function saveHook(name, before, after) {
  var orig = eval(name);   /* the game's own function, by name */
  if (typeof orig !== "function" || orig.saveHooked) return;
  var w = function () {
    var news = true;
    try { if (before) news = before.apply(null, arguments) !== false; } catch (e) {}
    var r = orig.apply(null, arguments);
    try { if (news && after) after.apply(null, arguments); } catch (e) {}
    return r;
  };
  w.saveHooked = true;
  eval(name + " = w");
}
function saveJournalStart(g) {
  SAVE_J.on = true;
  SAVE_J.booted = new Date().toISOString();
  saveHook("feed", null, function (g, text) { saveNote(g, "feed", { text: String(text) }); });
  saveHook("banner", null, function (g, title, sub) { saveNote(g, "banner", { title: title, sub: sub }); });
  saveHook("achieve", function (g, k) { return !g.got[k]; }, function (g, k) { saveNote(g, "achieve", { key: k }); });
  saveHook("pDie", function (g, p) { return !!p && !p.dead; }, function (g, p, cause) {
    saveNote(g, "death", { id: p.id, name: p.name, cause: cause, x: saveR(p.x), y: saveR(p.y), state: p.state, task: p.task && p.task.kind });
  });
  saveHook("sandLandscape", null, function (g) { saveNote(g, "new village", {}); });
  saveHook("sandClear", null, function (g) { saveNote(g, "clear", {}); });
}

/* one line of the trail: the counts, and where everybody is.
   p: [id, x, y, state, task] for each peasant, d: [id, x, y, state] for each duck */
function saveTrailRow(g) {
  var fire = 0, hot = -1e9, i;
  for (i = 0; i < g.m.length; i++) { if (g.m[i] === MAT.FIRE) fire++; if (g.T[i] > hot) hot = g.T[i]; }
  return {
    tick: g.tick, t: saveR(g.t), np: g.np, rip: g.rip, fire: fire, hottest: saveR(hot), fps: Math.round(g.fps || 0), s: g.sites.length,
    p: g.peasants.map(function (p) { return [p.id, Math.round(p.x), Math.round(p.y), p.dead ? "dead" : p.state, p.task ? p.task.kind : null]; }),
    d: g.ducks.map(function (d) { return [d.id, Math.round(d.x), Math.round(d.y), d.dead ? "dead" : d.state]; })
  };
}

/* once a game update: the trail every couple of seconds, a keyframe every so often */
function saveTick(g) {
  if (!SAVE_J.on) return;
  if (g.down && ++SAVE_J.lastDrag % 6 === 0) saveInput(g, "drag", { x: saveR(g.cx), y: saveR(g.cy), pick: curPick(g).name });
  if (g.tick < SAVE_J.lastTrail) SAVE_J.lastTrail = SAVE_J.lastKey = -1e9;   /* a new village, or a load */
  if (g.tick - SAVE_J.lastTrail >= SAVE_TRAIL_EVERY) {
    SAVE_J.lastTrail = g.tick;
    saveKeep(SAVE_J.trail, saveTrailRow(g), SAVE_MAX.trail);
  }
  if (g.tick - SAVE_J.lastKey >= SAVE_KEY_EVERY) {
    SAVE_J.lastKey = g.tick;
    saveKeep(SAVE_J.keys, { why: "every " + SAVE_KEY_EVERY + " ticks", tick: g.tick, t: saveR(g.t), rng: RNG ? RNG.state : null, state: saveClone(g) }, SAVE_MAX.keys);
  }
}

/* -------------------------------------------------------------------
   4. THE SAVE ITSELF
   ------------------------------------------------------------------- */
/* opts: source, rng, history ({events, inputs, errors, trail}), keyframes
   ([{why, tick, t, state}] of live-shaped copies), extra (anything else) */
function saveDocument(g, opts) {
  opts = opts || {};
  var browser = opts.source == null || opts.source === "browser";
  var keys = opts.keyframes || (browser ? SAVE_J.keys.slice().concat(SAVE_J.errKey ? [SAVE_J.errKey] : []) : []);
  var dice = opts.rng != null ? opts.rng : (browser && RNG ? RNG.state : null);
  var doc = {
    format: SAVE_FORMAT,
    version: SAVE_VERSION,
    about: "a PLEASAND village. load it in the game (LOAD, or drop the file on it), or in the harness: " +
      "node harness/cli.js save-info FILE, node harness/cli.js run --load FILE, require('./harness').open().load(FILE). " +
      "everything before `state` is for reading; `state` is the game object itself",
    meta: {
      savedAt: new Date().toISOString(),
      source: opts.source || "browser",
      grid: { w: g.gw, h: g.gh },
      tick: g.tick, time: saveR(g.t),
      seed: opts.seed == null ? null : opts.seed,
      updates: opts.updates == null ? null : opts.updates,
      sessionStarted: browser ? SAVE_J.booted : null,
      loadedFrom: opts.loadedFrom || SAVE_J.loadedFrom || null,
      userAgent: typeof navigator !== "undefined" && navigator.userAgent ? navigator.userAgent : null,
      page: typeof location !== "undefined" && location.href ? String(location.href) : null,
      deterministic: dice != null,
      note: dice != null ? "rng holds the dice: loading this (in the game or the harness) rolls what this village would have rolled next, " +
        "so it goes on exactly as it would have until somebody touches it (in the browser that includes the mouse moving over the field)" :
        "no dice in this save: loading it continues from this state, but not along the same path"
    },
    summary: saveSummary(g),
    checks: saveChecks(g),
    checksFailed: null,
    ui: { sel: curPick(g).name, size: g.size, thermal: !!g.thermal, hush: !!g.hush, debug: !!g.debug, fps: saveR(g.fps), msPerFrame: saveR(g.ms),
          held: g.held ? { id: g.held.id, name: g.held.name } : null, heldDuck: g.heldDuck ? { id: g.heldDuck.id } : null },
    history: {
      events: (opts.history && opts.history.events) || SAVE_J.ev.slice(),
      errors: (opts.history && opts.history.errors) || SAVE_J.errors.slice(),
      inputs: (opts.history && opts.history.inputs) || SAVE_J.inputs.slice(),
      trail: (opts.history && opts.history.trail) || SAVE_J.trail.slice(),
      prior: opts.prior || SAVE_J.prior || null
    },
    extra: opts.extra || null,
    rng: dice,
    keyframes: keys.map(function (k) {
      return { why: k.why, tick: k.tick, t: k.t, updates: k.updates == null ? null : k.updates, rng: k.rng == null ? null : k.rng, state: saveEncode(k.state, SAVE_SKIP.concat(SAVE_INPUT)) };
    }),
    state: saveEncode(g, SAVE_SKIP)
  };
  doc.checksFailed = doc.checks.filter(function (c) { return !c.ok; }).map(function (c) { return c.id; });
  return doc;
}

/* whatever the save is, is it one we can load? a string says why not */
function saveProblem(g, doc) {
  if (!doc || typeof doc !== "object") return "that is not a save (not json)";
  if (doc.format !== SAVE_FORMAT) return "that is not a PLEASAND save";
  if (!(doc.version <= SAVE_VERSION)) return "that save is from a newer PLEASAND (version " + doc.version + ")";
  if (!doc.state) return "that save has no state in it";
  if (doc.meta && doc.meta.grid && (doc.meta.grid.w !== g.gw || doc.meta.grid.h !== g.gh))
    return "that save is " + doc.meta.grid.w + "x" + doc.meta.grid.h + "; this game is " + g.gw + "x" + g.gh;
  return null;
}

/* put a decoded state (or a keyframe's) into the live game object, in place */
function saveApplyState(g, state, keepPointer) {
  var ks = Object.keys(g), i;
  function mine(k) { return SAVE_SKIP.indexOf(k) >= 0 || SAVE_INPUT.indexOf(k) >= 0 || (keepPointer && SAVE_POINTER.indexOf(k) >= 0); }
  /* what this village had that the saved one did not: gone, as it would never have been set */
  for (i = 0; i < ks.length; i++) if (!mine(ks[i]) && !(ks[i] in state)) delete g[ks[i]];
  ks = Object.keys(state);
  for (i = 0; i < ks.length; i++) if (!mine(ks[i])) g[ks[i]] = state[ks[i]];
  /* nobody is touching anything */
  g.down = 0; g.btn = 0; g.ptr = null; g.keys = {}; g.samp = []; g.lx = null; g.ax = null; g.pop = null;
  /* (a save from before the speed selector has no speed: it plays at 1x, not at no speed at all) */
  if (!(g.speed >= 0 && g.speed < SPEEDS.length)) { g.speed = SPEED_1; g.speedAcc = 0; }
  /* the pathfinder marks its scratch with generations: wipe them so a loaded generation cannot meet a stale one */
  if (g.navSeen) g.navSeen.fill(0);
  if (g.navShut) g.navShut.fill(0);
  if (g.pmark) { g.pmark.fill(0); g.pgen = 0; }
  if (g.zmark) g.zmark.fill(0);
  return g;
}

/* load a save (the parsed json) into g. opts.keyframe: an index into doc.keyframes, to load that instead */
function saveLoad(g, doc, opts) {
  opts = opts || {};
  var why = saveProblem(g, doc);
  if (why) throw new Error(why);
  var src = doc.state, kf = null;
  if (opts.keyframe != null) {
    kf = (doc.keyframes || [])[opts.keyframe];
    if (!kf) throw new Error("that save has no keyframe " + opts.keyframe + " (it has " + (doc.keyframes || []).length + ")");
    src = kf.state;
  }
  saveApplyState(g, saveDecode(src), !!opts.keepPointer);
  /* and the dice, where the save has them and this game owns its own (the browser; the harness sets its own) */
  var dice = kf ? kf.rng : doc.rng;
  if (RNG && dice != null) RNG.state = dice;
  var from = { savedAt: doc.meta && doc.meta.savedAt, source: doc.meta && doc.meta.source, tick: doc.meta && doc.meta.tick,
               file: opts.file || null, dice: dice != null, keyframe: kf ? { index: opts.keyframe, tick: kf.tick, why: kf.why } : null };
  /* the journal starts again, remembering where it came from (one save back, not the whole chain) */
  SAVE_J.loadedFrom = from;
  SAVE_J.prior = { meta: doc.meta, checksFailed: doc.checksFailed || [], events: ((doc.history || {}).events || []).slice(-100),
                   errors: (doc.history || {}).errors || [], inputs: ((doc.history || {}).inputs || []).slice(-50) };
  SAVE_J.ev.length = 0; SAVE_J.inputs.length = 0; SAVE_J.trail.length = 0; SAVE_J.keys.length = 0; SAVE_J.errKey = null;
  SAVE_J.lastTrail = SAVE_J.lastKey = -1e9;
  saveNote(g, "loaded", from);
  return from;
}

/* -------------------------------------------------------------------
   5. THE BROWSER: a file to keep, a file to open, a file dropped on it
   ------------------------------------------------------------------- */
function saveFileName(g) {
  var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; };
  return "pleasand-" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) +
    "-t" + g.tick + ".json";
}
function saveDownload(g) {
  try {
    saveNote(g, "saved", {});
    var doc = saveDocument(g), name = saveFileName(g);
    var blob = new Blob([JSON.stringify(doc)], { type: "application/json" });
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name; a.style.display = "none";
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
    feed(g, "saved the village to " + name, "#9fe08a");
  } catch (e) {
    saveError(g, e, "save");
    feed(g, "could not save: " + (e && e.message || e), "#ff7a6a");
  }
}
function saveLoadText(g, text, file) {
  var doc;
  try { doc = JSON.parse(text); } catch (e) { feed(g, "could not load " + file + ": not json", "#ff7a6a"); return false; }
  try {
    saveLoad(g, doc, { file: file, keepPointer: true });
    feed(g, "loaded " + file + (doc.meta && doc.meta.savedAt ? " (saved " + doc.meta.savedAt.slice(0, 16).replace("T", " ") + ")" : ""), "#9fe08a");
    return true;
  } catch (e) {
    saveError(g, e, "load");
    feed(g, "could not load " + file + ": " + (e && e.message || e), "#ff7a6a");
    return false;
  }
}
function saveReadFile(g, f) {
  if (!f) return;
  var r = new FileReader();
  r.onload = function () { saveLoadText(g, String(r.result), f.name); };
  r.onerror = function () { feed(g, "could not read " + f.name, "#ff7a6a"); };
  r.readAsText(f);
}
function saveOpenFile(g) {
  var inp = document.createElement("input");
  inp.type = "file"; inp.accept = ".json,application/json"; inp.style.display = "none";
  inp.addEventListener("change", function () { saveReadFile(g, inp.files && inp.files[0]); inp.remove(); });
  document.body.appendChild(inp);
  inp.click();
}
/* drag a save onto the page to load it */
function saveDropInit(getG) {
  window.addEventListener("dragover", function (e) { e.preventDefault(); });
  window.addEventListener("drop", function (e) {
    e.preventDefault();
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) saveReadFile(getG(), f);
  });
  window.addEventListener("error", function (e) { saveError(getG(), e.error || e.message, "window"); });
}
