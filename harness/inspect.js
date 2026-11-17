/* =====================================================================
   PLEASAND  --  harness/inspect.js

   reading the world without looking at it: state summaries, material
   censuses, entity dossiers, single cells, searches, and an ascii map
   you can put in a terminal or a log.

   everything here is read-only. it takes a harness, because that is
   where the game and its name tables live.
   ===================================================================== */
"use strict";

/* one character per material, for the ascii map. mnemonics where possible,
   digits are left for marking peasants */
var GLYPH = {
  EMPTY: ".", SAND: ":", WATER: "~", OIL: "o", WOOD: "W", FIRE: "*", LAVA: "^", STONE: "#",
  STEAM: "s", PLANT: "\"", ICE: "i", GUNPOWDER: "g", ACID: "a", ASH: "%", FAUCET: "f", DRAIN: "v",
  SMOKE: "k", EMBER: "e", GLASS: "G", SALT: "n", CLONER: "C", GAS: "`", TORCH: "t", SEED: ",",
  FLOWER: "F", FIREWORK: "w", NUKE: "N", SALTWATER: "S", METAL: "M", SNOW: "z", INERT: "I",
  PLANK: "=", DOOR: "D", LADDER: "H", STAIRS: "L", BED: "b", SAPLING: "y", SOIL: "_",
  CROP: "p", WHEAT: "u", LAMP: "l", COAL: "c", ORE: "R", GOLD: "$", BRICK: "B", GIRDER: "E"
};
var HEAT_RAMP = " .:-=+*#%@";

function round(v, n) {
  var f = Math.pow(10, n == null ? 2 : n);
  return Math.round(v * f) / f;
}

function matTable(h) {
  if (!h._matTable) {
    var byId = [], MAT = h.mat, k;
    for (k in GLYPH) if (MAT[k] != null) byId[MAT[k]] = GLYPH[k];
    for (k in MAT) if (byId[MAT[k]] == null) byId[MAT[k]] = "?";
    h._matTable = byId;
  }
  return h._matTable;
}

/* "sand", "SALT WATER", "27", or a picker name: whichever the agent typed */
function matId(h, name) {
  var MAT = h.mat, k;
  if (typeof name === "number") return name;
  if (name == null) return null;
  var s = String(name).trim();
  if (/^\d+$/.test(s)) return Number(s);
  if (MAT[s.toUpperCase()] != null) return MAT[s.toUpperCase()];
  for (k in MAT) if (h.matName[MAT[k]] && h.matName[MAT[k]].toUpperCase() === s.toUpperCase()) return MAT[k];
  throw new Error("unknown material: " + name);
}
function matName(h, id) { return h.matName[id] || ("MATERIAL " + id); }

/* how many of each thing, biggest first. the census of the whole grid */
function histogram(h, opts) {
  opts = opts || {};
  var g = h.g, m = g.m, n = new Array(h.NMAT || 64).fill(0), i, out = [];
  for (i = 0; i < m.length; i++) n[m[i]]++;
  for (i = 0; i < n.length; i++) if (n[i]) {
    out.push({ id: i, name: matName(h, i), count: n[i], pct: round(n[i] / m.length * 100, 2) });
  }
  out.sort(function (a, b) { return b.count - a.count; });
  return opts.limit ? out.slice(0, opts.limit) : out;
}

function stateOf(h, opts) {
  opts = opts || {};
  var g = h.g, alive = 0, dead = 0, i, pe = g.peasants || [], du = g.ducks || [], sites = g.sites || [];
  for (i = 0; i < pe.length; i++) { if (pe[i].dead) dead++; else alive++; }
  var res = {}, whitelist = ["iron", "barrels", "gold", "coal", "stone", "wood", "score", "astronauts", "rip"];
  whitelist.forEach(function (k) { if (typeof g[k] === "number") res[k] = g[k]; });
  var out = {
    seed: h.seed,
    tick: h.ticks,
    sandTick: g.tick,
    time: round(g.t, 2),
    paused: !!g.paused,
    slow: !!g.slow,
    grid: { w: g.gw, h: g.gh },
    counts: {
      peasants: pe.length, alive: alive, dead: dead,
      ducks: du.length, sites: sites.length,
      sitesDone: sites.filter(function (s) { return s.done; }).length,
      particles: g.np, ghosts: (g.ghosts || []).length,
      feed: (g.feed || []).length, bolts: (g.bolts || []).length
    },
    resources: res,
    ideas: Object.keys(g.know || {}),
    achievements: Object.keys(g.got || {}),
    feed: (g.feed || []).map(function (f) { return f.text; }).slice(-6),
    materials: histogram(h, { limit: opts.materials || 10 })
  };
  if (opts.hash) out.hash = h.hash();
  return out;
}

/* the raw peasant, made safe to print: the hat and palette are the game's
   own tables, and a few fields are typed arrays */
function peasantJson(h, p, detail) {
  var o = { id: p.id, name: p.name, short: p.short, x: round(p.x, 2), y: round(p.y, 2) };
  var keys = ["state", "dir", "vx", "vy", "dead", "fire", "lava", "acid", "cold", "warm", "panic", "stun",
    "hunger", "bored", "tired", "sleep", "breath", "buried", "slip", "logs", "boards", "stone", "iron",
    "pack", "launch", "say", "home"];
  keys.forEach(function (k) { if (p[k] !== undefined) o[k] = typeof p[k] === "number" ? round(p[k], 2) : p[k]; });
  if (p.task) o.task = { kind: p.task.kind, site: p.task.site, act: p.task.act };
  if (p.hat) {
    var idx = (h.P_HATS || []).indexOf(p.hat);
    o.hat = idx === 6 ? "KING" : (idx >= 0 ? "hat " + idx : "hat");
  }
  if (detail) {
    o.mood = h.game.pMood(h.g, p);
    o.palette = p.pal ? Array.prototype.slice.call(p.pal) : null;
    var gy = Math.floor(p.y), gx = Math.floor(p.x);
    if (gx >= 0 && gy >= 0 && gx < h.g.gw && gy < h.g.gh) o.standingIn = h.game.cellReadout(h.g, gy * h.g.gw + gx);
  }
  return o;
}

function duckJson(h, d) {
  return {
    id: d.id, kind: d.kind && d.kind.name, x: round(d.x, 2), y: round(d.y, 2),
    state: d.state, dir: d.dir, baby: !!d.baby, fire: !!d.fire, dead: !!d.dead,
    lead: d.lead ? d.lead.id : null, say: d.say || ""
  };
}

function peasants(h, opts) {
  opts = opts || {};
  return (h.g.peasants || []).map(function (p) { return peasantJson(h, p, opts.detail); });
}
function ducks(h) { return (h.g.ducks || []).map(function (d) { return duckJson(h, d); }); }

function pickPeasant(h, sel) {
  var list = h.g.peasants || [], i;
  if (sel == null) return list[0] || null;
  for (i = 0; i < list.length; i++) {
    if (list[i].id === sel) return list[i];
    if (typeof sel === "string" && (list[i].name === sel || list[i].short === sel)) return list[i];
  }
  if (typeof sel === "string" && /^\d+$/.test(sel)) sel = Number(sel);
  if (typeof sel === "number" && sel >= 0 && sel < list.length) return list[sel];
  return null;
}
function pickDuck(h, sel) {
  var list = h.g.ducks || [], i;
  if (sel == null) return list[0] || null;
  for (i = 0; i < list.length; i++) if (list[i].id === sel || list[i].id === Number(sel)) return list[i];
  if (typeof sel === "number" && sel >= 0 && sel < list.length) return list[sel];
  return null;
}

function sites(h) {
  var g = h.g;
  return (g.sites || []).map(function (s) {
    var o = { id: s.id, kind: s.kind, done: !!s.done, repair: !!s.repair, plan: (s.plan || []).length };
    if (s.cx != null) o.x = s.cx;
    if (s.G != null) o.y = s.G;
    if (s.stock) o.stock = s.stock;
    if (s.tank != null) o.tank = s.tank;
    if (s.dry) o.dry = true;
    try { o.progress = round(h.game.bShare(g, s), 3); } catch (e) {}
    return o;
  });
}

function cell(h, x, y) {
  var g = h.g;
  if (!isFinite(Number(x)) || !isFinite(Number(y))) return { x: x, y: y, error: "x and y must be numbers" };
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= g.gw || y >= g.gh) return { x: x, y: y, error: "outside the grid (0.." + (g.gw - 1) + ", 0.." + (g.gh - 1) + ")" };
  var j = y * g.gw + x;
  return {
    x: x, y: y, i: j, mat: g.m[j], name: matName(h, g.m[j]),
    readout: h.game.cellReadout(g, j),
    T: round(g.T[j], 1), lat: round(g.lat[j], 1), aux: g.aux[j], shade: g.sh[j], vy: g.vy[j], stamp: g.stamp[j]
  };
}

/* every cell of a material, row by row (or nearest first) */
function find(h, name, opts) {
  opts = opts || {};
  var g = h.g, id = matId(h, name), limit = opts.limit == null ? 50 : opts.limit, out = [], i, x, y, j;
  for (i = 0; i < g.m.length; i++) {
    if (g.m[i] !== id) continue;
    x = i % g.gw; y = (i / g.gw) | 0;
    if (opts.x != null && (x < opts.x || x > opts.x + (opts.w || 0))) continue;
    if (opts.y != null && (y < opts.y || y > opts.y + (opts.h || 0))) continue;
    out.push({ x: x, y: y, i: i, T: round(g.T[i], 1) });
    if (!opts.near && out.length >= limit) break;
  }
  if (opts.near) {
    var n = opts.near;
    out.sort(function (a, b) {
      var ad = (a.x - n.x) * (a.x - n.x) + (a.y - n.y) * (a.y - n.y);
      var bd = (b.x - n.x) * (b.x - n.x) + (b.y - n.y) * (b.y - n.y);
      return ad - bd;
    });
    out = out.slice(0, limit);
  }
  if (opts.detail) out = out.map(function (c) { return cell(h, c.x, c.y); });
  else out.forEach(function (c) { delete c.i; });
  return out;
}

/* an ascii picture of a part of the grid. scale groups cells into blocks
   and takes what there is most of (or the hottest, with mode: "heat") */
function map(h, opts) {
  opts = opts || {};
  var g = h.g, m = g.m, gw = g.gw, gh = g.gh;
  var x0 = clampInt(opts.x, 0, gw - 1), y0 = clampInt(opts.y, 0, gh - 1);
  var w = clampInt(opts.w == null ? 96 : opts.w, 1, gw - x0);
  var ht = clampInt(opts.h == null ? 48 : opts.h, 1, gh - y0);
  var scale = clampInt(opts.scale == null ? 1 : opts.scale, 1, 16);
  var mode = opts.mode || "mat", G = matTable(h), rows = [], legend = {}, i, x, y;
  var overlay = opts.overlay !== false;
  var blocks = Math.ceil(w / scale), lines = Math.ceil(ht / scale);
  var ch = [];

  for (var by = 0; by < lines; by++) {
    var line = "";
    for (var bx = 0; bx < blocks; bx++) {
      var cx0 = x0 + bx * scale, cy0 = y0 + by * scale, counts = {}, best = 0, bestN = -1, sum = 0, n = 0;
      for (y = cy0; y < cy0 + scale && y < y0 + ht; y++) for (x = cx0; x < cx0 + scale && x < x0 + w; x++) {
        var j = y * gw + x, v = m[j], c = (counts[v] || 0) + 1;
        counts[v] = c;
        sum += g.T[j]; n++;
        if (v !== 0 && c > bestN) { bestN = c; best = v; }
      }
      var c2;
      if (mode === "heat") {
        var t = n ? sum / n : 0;
        var f = Math.max(0, Math.min(1, (t + 50) / 1250));
        c2 = HEAT_RAMP[Math.round(f * (HEAT_RAMP.length - 1))];
      } else c2 = G[best] || "?";
      line += c2;
      ch.push({ c: c2, v: best });
    }
    rows.push(line);
  }

  /* mark the people: a digit per peasant (in list order), d for a duck.
     if two share a cell, one of them moves up a row rather than vanish */
  var marks = [], occupied = {};
  function markAt(chr, bx, by, label) {
    var tries = [0, -1, -2, -3, -4, -5, -6, -7, -8, 1];
    for (var t = 0; t < tries.length; t++) {
      var yy = by + tries[t];
      if (bx < 0 || yy < 0 || bx >= blocks || yy >= lines) continue;
      if (occupied[bx + ":" + yy]) continue;
      occupied[bx + ":" + yy] = 1;
      rows[yy] = rows[yy].slice(0, bx) + chr + rows[yy].slice(bx + 1);
      marks.push(label);
      return true;
    }
    return false;
  }
  if (overlay) {
    var idcount = 0;
    (g.peasants || []).forEach(function (p) {
      if (p.dead) return;
      var mark = String((idcount++ % 9) + 1);
      markAt(mark, Math.floor((p.x - x0) / scale), Math.floor((p.y - 4 - y0) / scale),
        mark + " " + p.name + " @ " + Math.round(p.x) + "," + Math.round(p.y) + " (" + p.state + ")");
    });
    (g.ducks || []).forEach(function (d) {
      if (d.dead) return;
      markAt("d", Math.floor((d.x - x0) / scale), Math.floor((d.y - 1 - y0) / scale),
        "d " + (d.kind ? d.kind.name : "duck") + " @ " + Math.round(d.x) + "," + Math.round(d.y));
    });
  }

  /* glyphs actually on the map, in material order */
  for (i = 0; i < ch.length; i++) legend[ch[i].c] = ch[i].v;
  var order = Object.keys(legend).filter(function (c) { return c !== "." && c !== "0" && c !== " "; });
  order.sort(function (a, b) { return legend[a] - legend[b]; });

  var head = "seed " + h.seed + " · tick " + g.tick + " · " + w + "x" + ht + " cells at " + x0 + "," + y0 + (scale > 1 ? " · 1:" + scale : "");
  var out = [head];
  for (i = 0; i < rows.length; i++) {
    var lab = String(y0 + i * scale);
    while (lab.length < 4) lab = " " + lab;
    out.push(lab + " " + rows[i]);
  }
  if (opts.legend !== false) {
    if (mode === "heat") out.push("heat   '" + HEAT_RAMP + "' = cold to hot (about -50 to 1200 degrees)");
    else out.push("key   " + order.map(function (c) { return c + " " + matName(h, legend[c]); }).join(" · "));
    if (marks.length) out.push("who   " + marks.join(" · "));
  }
  return out.join("\n");
}

function clampInt(v, lo, hi) {
  v = v == null ? lo : Math.round(v);
  return v < lo ? lo : (v > hi ? hi : v);
}

/* the whole thing as prose-ish text, for an agent that wants one glance */
function describe(h, opts) {
  opts = opts || {};
  var s = stateOf(h, { hash: true }), out = [];
  out.push("PLEASAND  seed " + s.seed + " · tick " + s.tick + " (sand " + s.sandTick + ") · " + s.time + "s" + (s.paused ? " · paused" : ""));
  out.push("people   " + s.counts.alive + " alive, " + s.counts.dead + " dead, " + s.counts.ducks + " ducks");
  out.push("sites    " + s.counts.sites + " (" + s.counts.sitesDone + " done) · particles " + s.counts.particles + " · ghosts " + s.counts.ghosts);
  out.push("ideas    " + (s.ideas.length ? s.ideas.join(", ") : "none"));
  out.push("res      " + JSON.stringify(s.resources));
  out.push("stuff    " + s.materials.map(function (m) { return m.name + " " + m.count; }).join(", "));
  if (s.feed.length) out.push("feed     " + s.feed.join(" | "));
  if (opts.map !== false) {
    var first = (h.g.peasants || []).filter(function (p) { return !p.dead; })[0];
    var w = Math.min(opts.w || 64, h.g.gw), ht = Math.min(opts.h || 32, h.g.gh);
    var mx = first ? Math.round(first.x) - (w >> 1) : 60, my = first ? Math.round(first.y) - Math.round(ht * 0.7) : 60;
    out.push("");
    out.push(map(h, { x: Math.max(0, Math.min(h.g.gw - w, mx)), y: Math.max(0, Math.min(h.g.gh - ht, my)), w: w, h: ht, scale: opts.scale || 1 }));
  }
  if (opts.entities !== false) {
    out.push("");
    out.push("peasants: " + peasants(h).map(function (p) {
      return p.name + " #" + p.id + " " + p.state + " @ " + p.x + "," + p.y + (p.task ? " " + p.task.kind : "") + (p.dead ? " DEAD" : "");
    }).join(" | "));
  }
  return out.join("\n");
}

/* everything about one peasant an agent is likely to want next: what it is
   doing, how it feels, what is around it, and what the village has said */
function why(h, sel) {
  var p = pickPeasant(h, sel);
  if (!p) return null;
  var g = h.g, x = Math.round(p.x), y = Math.round(p.y);
  var w = 29, ht = 13;
  var x0 = Math.max(0, Math.min(g.gw - w, x - (w >> 1)));
  var y0 = Math.max(0, Math.min(g.gh - ht, y - Math.round(ht * 0.75)));
  var says = h.events({ limit: 300 }).filter(function (e) {
    return e.kind === "feed" && e.text && p.short && e.text.indexOf(p.short) >= 0;
  }).slice(-8);
  var site = null;
  if (p.task && p.task.site != null) site = (g.sites || []).filter(function (s) { return s.id === p.task.site; })[0] || null;
  return {
    peasant: peasantJson(h, p, true),
    doing: p.task ? { kind: p.task.kind, act: p.task.act, site: p.task.site } : (p.say ? "talking" : "idle"),
    mood: h.game.pMood(g, p),
    home: p.home,
    goal: p.goal == null ? null : p.goal,
    site: site ? sites(h).filter(function (s) { return s.id === site.id; })[0] : null,
    around: map(h, { x: x0, y: y0, w: w, h: ht, scale: 1, overlay: true, legend: false }),
    said: says.map(function (e) { return e.tick + " " + (e.text || e.key || ""); })
  };
}

module.exports = {
  GLYPH: GLYPH, HEAT_RAMP: HEAT_RAMP,
  matTable: matTable, matId: matId, matName: matName,
  histogram: histogram, stateOf: stateOf,
  peasants: peasants, ducks: ducks, sites: sites, peasantJson: peasantJson, duckJson: duckJson,
  pickPeasant: pickPeasant, pickDuck: pickDuck,
  cell: cell, find: find, map: map, describe: describe, why: why, round: round
};
