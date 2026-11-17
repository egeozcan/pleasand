"use strict";
/* Duck regressions shared with test/run.js; also runnable on their own.
   Exit 1 means a regression or one of its controls failed. */
var assert = require("assert");
var open = require("../index.js").open;

function setup(file) {
  var sc = require("./" + file);
  assert(sc.ops.every(function (op) { return op.at === 0; }), "fixture setup must happen at tick zero");
  var h = open({ seed: sc.seed });
  h.replay({ seed: sc.seed, ticks: 0, ops: sc.ops });
  return { h: h, id: h.g.did };
}

function ashCycle(clearAsh) {
  var run = setup("duck-ash-cycle.json"), h = run.h;
  if (clearAsh) h.place(31, 88, "WATER");
  h.step(120);
  var positions = new Set(), looks = new Set(), quacks = new Set(), alive = true;
  for (var i = 0; i < 600; i++) {
    h.step(1);
    var d = h.g.ducks.find(function (d) { return d.id === run.id; });
    if (!d) { alive = false; break; }
    positions.add(d.x + "," + d.y);
    looks.add(d.look); quacks.add(d.quackT);
  }
  assert(alive, "a duck with an open escape above the ash must survive");
  var locked = positions.size <= 2 && looks.size === 1 && quacks.size === 1;
  console.log(JSON.stringify({ case: clearAsh ? "ash control" : "ash cycle", tick: h.ticks,
    positions: positions.size, headingTimerValues: looks.size, quackTimerValues: quacks.size, locked: locked }));
  assert(!locked, "duck oscillates between two cells for 600 ticks; navigation and quack timers are frozen");
  return { positions: positions.size, locked: locked };
}

function submergedCeiling(openCeiling) {
  var run = setup("duck-submerged-ceiling.json"), h = run.h, maxSubmerged = 0;
  if (openCeiling) h.erase(45, 77, 1, 1);
  for (var i = 0; i < 900; i++) {
    h.step(1);
    var d = h.g.ducks.find(function (d) { return d.id === run.id; });
    if (d) maxSubmerged = Math.max(maxSubmerged, d.submerged || 0);
  }
  var d = h.g.ducks.find(function (d) { return d.id === run.id; }), trapped = false;
  if (d) {
    var x = Math.floor(d.x), y = Math.floor(d.y), wet = h.game.LIQUID;
    trapped = !!(wet[h.game.pCell(h.g, x, y)] && wet[h.game.pCell(h.g, x, y - 1)] && h.game.dBody(h.g, x, y - 3));
  }
  console.log(JSON.stringify({ case: openCeiling ? "ceiling control" : "submerged ceiling", tick: h.ticks,
    duck: d ? { x: d.x, y: d.y, state: d.state } : null, maxSubmerged: maxSubmerged, trapped: trapped }));
  assert(!trapped, "duck remains trapped underwater after 900 ticks; the >400 blocked-surface timeout never fires");
  if (openCeiling) assert(d, "a duck that can surface must survive");
  else {
    assert.strictEqual(maxSubmerged, 400, "the blocked-surface timer did not survive flight/wriggle transitions");
    assert(!d, "a duck in a sealed flooded chamber must reach its terminal behavior");
  }
}

function surfacingResetsTimeout() {
  var run = setup("duck-submerged-ceiling.json"), h = run.h;
  h.step(200);
  var d = h.g.ducks.find(function (d) { return d.id === run.id; });
  assert(d && d.submerged > 100, "the duck must first have been trapped underwater");
  h.erase(45, 77, 1, 1);
  h.step(600);
  d = h.g.ducks.find(function (d) { return d.id === run.id; });
  assert(d, "a duck freed before the timeout must survive");
  assert.strictEqual(d.submerged, 0, "surfacing must reset the blocked-surface timer");
}

module.exports = { ashCycle: ashCycle, submergedCeiling: submergedCeiling, surfacingResetsTimeout: surfacingResetsTimeout };

if (require.main === module) {
  var cases = [
    ["ash does not lock a duck in a two-position cycle", function () { ashCycle(false); }],
    ["control: removing ash releases the duck", function () { ashCycle(true); }],
    ["a submerged duck resolves its blocked-surface state", function () { submergedCeiling(false); }],
    ["control: opening the ceiling lets the duck escape", function () { submergedCeiling(true); }],
    ["surfacing clears an accumulated timeout", surfacingResetsTimeout]
  ], failed = 0;
  cases.forEach(function (entry) {
    try { entry[1](); console.log("PASS " + entry[0]); }
    catch (e) { failed++; console.log("FAIL " + entry[0] + ": " + e.message); }
  });
  console.log(failed + " checks failed; " + (cases.length - failed) + " checks passed");
  process.exitCode = failed ? 1 : 0;
}
