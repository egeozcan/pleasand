/* =====================================================================
   PLEASAND  --  harness/saveinfo.js

   what is in a save file, without loading the game: when and where it
   was saved, the village at a glance, the checks that failed, errors,
   the last things that happened and were done, and who was stuck where.

     node harness/cli.js save-info pleasand-20261118-201500-t5400.json
     node harness/cli.js save-info FILE --json
   ===================================================================== */
"use strict";
var fs = require("fs");

function readSave(path) {
  var doc = JSON.parse(fs.readFileSync(String(path), "utf8"));
  if (!doc || doc.format !== "pleasand-save") throw new Error(path + " is not a PLEASAND save");
  return doc;
}

/* who has barely moved over the trail: [id, name, from tick, cells moved, states seen] */
function stillOnes(doc, minSamples) {
  var trail = (doc.history || {}).trail || [], by = {}, names = {}, out = [];
  (doc.summary && doc.summary.peasants || []).forEach(function (p) { names[p.id] = p.name; });
  minSamples = minSamples || 20;
  trail.slice(-minSamples).forEach(function (s) {
    (s.p || []).forEach(function (r) {
      var b = by[r[0]] || (by[r[0]] = { id: r[0], x0: r[1], x1: r[1], y0: r[2], y1: r[2], n: 0, states: {}, tasks: {}, from: s.tick });
      b.x0 = Math.min(b.x0, r[1]); b.x1 = Math.max(b.x1, r[1]); b.y0 = Math.min(b.y0, r[2]); b.y1 = Math.max(b.y1, r[2]);
      b.n++; b.states[r[3]] = 1; if (r[4]) b.tasks[r[4]] = 1;
    });
  });
  Object.keys(by).forEach(function (k) {
    var b = by[k];
    if (b.n < minSamples || b.states.dead || b.states.space) return;
    if (b.x1 - b.x0 <= 2 && b.y1 - b.y0 <= 2)
      out.push({ id: b.id, name: names[b.id] || null, since: b.from, at: [b.x0, b.y0], states: Object.keys(b.states), tasks: Object.keys(b.tasks) });
  });
  return out;
}

function info(doc, opts) {
  opts = opts || {};
  var m = doc.meta || {}, s = doc.summary || {}, h = doc.history || {};
  return {
    format: doc.format, version: doc.version,
    meta: m,
    counts: s.counts, numbers: s.numbers, ideas: Object.keys(s.ideas || {}), achievements: s.achievements,
    checksFailed: (doc.checks || []).filter(function (c) { return !c.ok; }),
    errors: h.errors || [],
    events: (h.events || []).slice(-(opts.events || 20)),
    inputs: (h.inputs || []).slice(-(opts.inputs || 12)),
    deaths: (h.events || []).filter(function (e) { return e.kind === "death"; }),
    still: stillOnes(doc),
    trail: { samples: (h.trail || []).length, from: h.trail && h.trail.length ? h.trail[0].tick : null, to: h.trail && h.trail.length ? h.trail[h.trail.length - 1].tick : null },
    keyframes: (doc.keyframes || []).map(function (k, i) { return { index: i, tick: k.tick, t: k.t, why: k.why }; }),
    prior: h.prior ? { meta: h.prior.meta, checksFailed: h.prior.checksFailed, errors: (h.prior.errors || []).length } : null,
    peasants: (s.peasants || []).map(function (p) {
      return { id: p.id, name: p.name, x: p.x, y: p.y, state: p.state, task: p.task && p.task.kind || null, mood: p.mood, dead: !!p.dead, fire: !!p.fire };
    }),
    materials: s.materials
  };
}

function text(doc, opts) {
  var i = info(doc, opts), out = [], m = i.meta;
  out.push("PLEASAND save v" + i.version + " · " + m.source + " · saved " + m.savedAt + " · tick " + m.tick + " · " + m.time + "s" +
    (m.seed != null ? " · seed " + m.seed : "") + (m.deterministic ? " · deterministic" : ""));
  if (m.loadedFrom) out.push("from  " + JSON.stringify(m.loadedFrom));
  if (m.userAgent) out.push("agent " + m.userAgent);
  var c = i.counts || {};
  out.push("world " + c.alive + " alive · " + (c.peasants - c.alive) + " not · " + c.ducks + " ducks · " + c.sites + " sites (" + c.sitesDone + " done) · " + c.particles + " particles");
  out.push("ideas " + (i.ideas.length ? i.ideas.join(", ") : "none"));
  out.push("checks " + (i.checksFailed.length ? "FAILED " + i.checksFailed.map(function (x) { return x.id + " " + JSON.stringify(x.detail || x.error); }).join("; ") : "all pass"));
  if (i.errors.length) {
    out.push("errors (" + i.errors.length + ")");
    i.errors.slice(-5).forEach(function (e) {
      out.push("  tick " + e.tick + " [" + e.where + "] " + e.message + (e.repeats ? " (x" + e.repeats + ", last tick " + e.lastTick + ")" : ""));
      String(e.stack || "").split("\n").slice(1, 4).forEach(function (l) { out.push("      " + l.trim()); });
    });
  }
  if (i.deaths.length) out.push("deaths " + i.deaths.map(function (d) { return d.name + " (" + d.cause + ", tick " + d.tick + ")"; }).join(", "));
  if (i.still.length) out.push("still  " + i.still.map(function (p) { return (p.name || "#" + p.id) + " @ " + p.at.join(",") + " since " + p.since + " [" + p.states.concat(p.tasks).join(" ") + "]"; }).join("; "));
  out.push("people");
  i.peasants.forEach(function (p) {
    out.push("  " + (p.dead ? "x " : "  ") + p.name + " #" + p.id + " " + p.state + " @ " + p.x + "," + p.y + (p.task ? " " + p.task : "") + (p.fire ? " ON FIRE" : "") + (p.mood ? " · " + p.mood : ""));
  });
  if (i.events.length) {
    out.push("events (last " + i.events.length + ")");
    i.events.forEach(function (e) { out.push("  " + e.tick + " " + e.kind + " " + (e.text || e.title || (e.name ? e.name + " (" + e.cause + ")" : "") || e.key || e.file || "")); });
  }
  if (i.inputs.length) {
    out.push("inputs (last " + i.inputs.length + ")");
    i.inputs.forEach(function (e) {
      var rest = Object.keys(e).filter(function (k) { return k !== "tick" && k !== "t" && k !== "kind" && k !== "at" && k !== "op"; })
        .map(function (k) { return k + "=" + JSON.stringify(e[k]); }).join(" ");
      out.push("  " + (e.tick != null ? e.tick : e.at) + " " + (e.kind || e.op) + " " + rest);
    });
  }
  out.push("trail " + i.trail.samples + " samples" + (i.trail.samples ? " (ticks " + i.trail.from + "-" + i.trail.to + ")" : ""));
  out.push("keyframes " + (i.keyframes.length ? i.keyframes.map(function (k) { return "#" + k.index + " tick " + k.tick + " (" + k.why + ")"; }).join(", ") : "none"));
  if (i.prior) out.push("prior save " + i.prior.meta.savedAt + " tick " + i.prior.meta.tick + (i.prior.errors ? " · " + i.prior.errors + " errors" : ""));
  return out.join("\n");
}

module.exports = { readSave: readSave, info: info, text: text, stillOnes: stillOnes };
