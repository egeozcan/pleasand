/* A sampler for stalled work and short escape cycles. It observes only;
   no game functions or dice are touched. sample at least every 30 ticks. */
"use strict";
var BENIGN = { sleep: 1, warm: 1, home: 1, watch: 1, festival: 1, visit: 1 };

function createWatcher(opts) {
  opts = opts || {};
  var limit = opts.ticks == null ? 2400 : opts.ticks;
  var watch = {}, found = {}, last = -1;

  function sample(h) {
    /* Pausing the game is not a stalled unit. Resetting starts a new village. */
    var now = h.g.tick == null ? h.ticks : h.g.tick, live = {};
    if (now < last) { watch = {}; found = {}; }
    last = now;

    function track(e, type, progress, task) {
      var key = type + ":" + e.id;
      if (e.dead || e.state === "held" || e.state === "space") return;
      live[key] = true;
      var x = Math.round(e.x * 4) / 4, y = Math.round(e.y * 4) / 4, w = watch[key];
      /* A two-cell shuffle is not travel. Work strokes/inventory changes,
         however, are progress even when the worker never moves. */
      if (!w || w.progress !== progress || Math.max(w.maxX, x) - Math.min(w.minX, x) > 2 ||
          Math.max(w.maxY, y) - Math.min(w.minY, y) > 2) {
        watch[key] = { progress: progress, since: now, minX: x, maxX: x, minY: y, maxY: y };
        return;
      }
      w.minX = Math.min(w.minX, x); w.maxX = Math.max(w.maxX, x);
      w.minY = Math.min(w.minY, y); w.maxY = Math.max(w.maxY, y);
      if (now - w.since >= limit && !found[key]) {
        var site = type === "peasant" && h.g.sites.filter(function (s) { return s.id === e.task.site; })[0];
        found[key] = { entity: type, tick: now, name: e.name || ((e.kind && e.kind.name || "DUCK") + "#" + e.id),
          id: e.id, task: task, site: site ? site.kind + "#" + site.id : null,
          x: +e.x.toFixed(1), y: +e.y.toFixed(1), still: now - w.since, since: w.since, climb: !!e.climb };
      }
    }

    h.g.peasants.forEach(function (p) {
      if (!p.task || BENIGN[p.task.kind] || p.sleep > 0) return;
      var k = p.task, site = h.g.sites.filter(function (s) { return s.id === k.site; })[0];
      var share = site && h.game ? h.game.bShare(h.g, site) : null;
      track(p, "peasant", JSON.stringify([k.kind, k.site, k.x, k.y, k.act, k.n, share,
        p.logs, p.boards, p.stone, p.iron, p.coal, p.ore, p.gold, p.pack]), k.kind);
    });
    h.g.ducks.forEach(function (d) {
      /* Ordinary idle/following/swimming ducks still advance their quack
         clock. Wriggle loops don't. Check the physical surfacing obstruction
         too: a broken timer must not fool the observer into seeing progress. */
      var submerged = d.submerged > 0;
      if (h.game) {
        var x = Math.floor(d.x), y = Math.floor(d.y), wet = h.game.LIQUID;
        submerged = !!(wet[h.game.pCell(h.g, x, y)] && wet[h.game.pCell(h.g, x, y - 1)] &&
          (h.game.dBody(h.g, x, y - 2) || h.game.dBody(h.g, x, y - 3)));
      }
      track(d, "duck", submerged ? "submerged" : JSON.stringify([d.look, d.quackT]), submerged ? "surface" : "escape");
    });
    Object.keys(watch).forEach(function (key) { if (!live[key]) delete watch[key]; });
  }

  return { sample: sample, report: function () { return Object.keys(found).map(function (key) { return found[key]; }); } };
}
module.exports = { createWatcher: createWatcher };
