"use strict";
var assert = require("assert"), createWatcher = require("../harness/stuck.js").createWatcher;

function village() { return { ticks: 0, g: { peasants: [], ducks: [], sites: [] } }; }
function duck() { return { id: 1, x: 30.5, y: 88, state: "walk", look: 40, quackT: 558, stuck: 0, submerged: 0 }; }
function peasant(kind) { return { id: 1, name: "ULF", x: 30.5, y: 88, state: "walk", task: { kind: kind, site: 1, act: 0, n: 0 } }; }
function observe(h, update) {
  var w = createWatcher();
  for (var t = 0; t <= 2460; t += 30) { h.ticks = t; update(t); w.sample(h); }
  return w.report();
}

function run() {
  var h = village(), d = duck(); h.g.ducks = [d];
  /* Positions/timers from the pre-fix ash reproduction: a successful
     wriggle every update, but no ordinary behavior ever runs. */
  var found = observe(h, function (t) { d.x = 30.5 + ((t / 30) % 2); });
  assert.strictEqual(found.length, 1, "a two-position duck escape cycle was not detected");
  assert.strictEqual(found[0].entity, "duck");

  h = village(); d = duck(); h.g.ducks = [d];
  found = observe(h, function (t) { d.quackT = 600 - (t % 600); });
  assert.strictEqual(found.length, 0, "a duck behaving normally in a small pond was called stuck");

  h = village(); d = duck(); d.state = "held"; h.g.ducks = [d];
  assert.strictEqual(observe(h, function () {}).length, 0, "a held duck was called stuck");

  h = village(); d = duck(); d.state = "swim"; h.g.ducks = [d];
  found = observe(h, function (t) { d.submerged = 1; d.quackT = 600 - (t % 600); });
  assert.strictEqual(found.length, 1, "a submerged duck with a broken timeout was not detected");

  h = village(); d = duck(); d.state = "swim"; h.g.ducks = [d];
  h.game = { LIQUID: { 2: 1 }, pCell: function () { return 2; }, dBody: function () { return true; } };
  found = observe(h, function (t) { d.submerged = 0; d.quackT = 600 - (t % 600); });
  assert.strictEqual(found.length, 1, "physical submersion was missed when the duck's own timer was broken");

  h = village(); var p = peasant("build"); h.g.peasants = [p];
  found = observe(h, function (t) { p.x = 30.5 + ((t / 30) % 2); });
  assert.strictEqual(found.length, 1, "a two-position builder cycle was not detected");
  assert.strictEqual(found[0].entity, "peasant");

  h = village(); p = peasant("pump"); h.g.peasants = [p];
  found = observe(h, function (t) { p.task.act = t % 150; p.task.n = Math.floor(t / 150); });
  assert.strictEqual(found.length, 0, "productive stationary pumping was called stuck");

  h = village(); p = peasant("build"); h.g.peasants = [p];
  found = observe(h, function (t) { p.task.site = Math.floor(t / 600); });
  assert.strictEqual(found.length, 0, "switching to a different site did not reset task progress");

  h = village(); p = peasant("build"); d = duck(); h.g.peasants = [p]; h.g.ducks = [d];
  found = observe(h, function () {});
  assert.strictEqual(found.length, 2, "peasant and duck ids collided in the observer");

  h = village(); d = duck(); h.g.ducks = [d];
  var w = createWatcher(); w.sample(h); h.ticks = 1200; h.g.ducks = []; w.sample(h);
  h.ticks = 2460; h.g.ducks = [d]; w.sample(h);
  assert.strictEqual(w.report().length, 0, "an absent entity retained a stale observation window");

  h = village(); p = peasant("build"); h.g.peasants = [p]; h.g.sites = [{ id: 1, share: 0 }];
  h.game = { bShare: function (g, s) { return s.share; } };
  found = observe(h, function (t) { h.g.sites[0].share = t / 3000; });
  assert.strictEqual(found.length, 0, "a worker waiting while its site progresses was called stuck");

  h = village(); d = duck(); h.g.ducks = [d]; h.g.tick = 0;
  found = observe(h, function () {});
  assert.strictEqual(found.length, 0, "paused simulation time was counted as stuck time");

  h = village(); d = duck(); h.g.ducks = [d]; w = createWatcher(); w.sample(h);
  h.ticks = 2400; w.sample(h); assert.strictEqual(w.report().length, 1);
  h.ticks = 0; w.sample(h); assert.strictEqual(w.report().length, 0, "reset retained old-village findings");

  console.log("stuck observer: cycles, submersion, work/site progress, task changes, held units, ids, removal, pause and reset passed");
}
module.exports = { run: run };
if (require.main === module) run();
