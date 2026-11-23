/* =====================================================================
   PLEASAND  --  test/picker.js

   the picker's MORE row, under ERASE, and the flyout it opens: the rock
   and the building stone you can paint now. required by test/run.js
   ===================================================================== */
"use strict";
var H = require("../harness");

module.exports = function (test, check) {
  function open(seed) {
    var h = H.open({ seed: seed == null ? 5 : seed }), w = h.game;
    /* (a point on the screen, as the harness's cells) */
    h.at = function (sx, sy) { return { x: (sx - h.PANEL) / h.CELL - 0.5 + (h.g.camI || 0), y: (sy - h.PLAY_Y) / h.CELL - 0.5 }; };
    h.idx = function (name) { for (var k = 0; k < h.pick.length; k++) if (h.pick[k].name === name) return k; return -1; };
    h.tapScreen = function (sx, sy) { var c = h.at(sx, sy); return h.tap(c.x, c.y); };
    h.moreRow = function () { return h.tapScreen(20, w.MORE_Y + 5); };
    /* the screen point of a brush's row on the flyout */
    h.flyRow = function (name) {
      var k = h.idx(name), R = w.MORE_ROWS.filter(function (r) { return r.k === k; })[0];
      return { sx: w.MORE_X + 20, sy: w.MORE_TOP + R.y + 5 };
    };
    return h;
  }
  var NEW = ["COAL", "IRON ORE", "GOLD", "ROCK SALT", "STONEWORK", "CONCRETE", "FIREBRICK", "STAINED GLASS"];

  test("picker: the rock and the building stone are in the picker, after ERASE, each with a colour, a name and a description", function () {
    var h = open(), w = h.game, P = h.pick, e = h.idx("ERASE");
    check(e === w.PICK_N - 1, "ERASE is at " + e + ", the panel has " + w.PICK_N + " rows");
    check(P.slice(w.PICK_N).map(function (q) { return q.name; }).join() === NEW.join(), "after ERASE: " + P.slice(w.PICK_N).map(function (q) { return q.name; }));
    P.slice(w.PICK_N).forEach(function (q) {
      check(q.more && w.SAND_SHADES[q.m] && q.desc && h.matName[q.m] === q.name, q.name + " is missing something");
    });
    check(w.MORE_ROWS.filter(function (r) { return r.k != null; }).length === NEW.length, "the flyout has the wrong rows");
    check(w.MORE_TOP > h.PLAY_Y && w.MORE_Y + w.ROWH <= w.SIZE_Y && w.BTN3_Y + 12 <= h._eval("VH"), "the panel does not fit");
  });

  test("picker: MORE opens the flyout, a brush on it is picked and shuts it, and the row shows it after; a click on the row shuts it", function () {
    var h = open(), w = h.game, g = h.g;
    check(w.panelAt(20, w.MORE_Y + 5) === "more", "MORE's row is " + w.panelAt(20, w.MORE_Y + 5));
    h.moreRow();
    check(g.moreOpen, "the flyout did not open");
    var r = h.flyRow("COAL");
    h.tapScreen(r.sx, r.sy);
    check(h.pick[g.sel].name === "COAL" && !g.moreOpen, "picked " + h.pick[g.sel].name + ", open " + g.moreOpen);
    h.select("SAND");
    check(w.moreSlot(g) === h.idx("COAL"), "the row does not show COAL, with SAND picked");
    h.moreRow();   /* (the row picks what it shows, and opens) */
    check(h.pick[g.sel].name === "COAL" && g.moreOpen, "the row picked " + h.pick[g.sel].name + ", open " + g.moreOpen);
    h.moreRow();
    check(!g.moreOpen && h.pick[g.sel].name === "COAL", "a click on the open row left it open, or changed the brush");
    h.moreRow(); h.key("escape");
    check(!g.moreOpen, "Esc did not shut it");
    /* (an extra reached by the arrows, with nothing drawn and no update between: the row remembers it all the same) */
    h.select("ERASE"); h.key("arrowdown"); h.key("arrowdown"); h.select("SAND"); h.moreRow();
    check(h.pick[g.sel].name === "IRON ORE", "the row picked " + h.pick[g.sel].name + " after the arrows went to IRON ORE");
    h.moreRow();
    /* (a press on MORE's row, dragged out into the field, paints nothing) */
    var m0 = Array.prototype.slice.call(g.m), c = h.at(20, w.MORE_Y + 5);
    h.mouse(c.x, c.y); h.down(0);
    for (var i = 1; i <= 12; i++) { h.mouse(c.x + 8 * i, c.y - 20); h.step(1); }
    h.up();
    var n = 0;
    for (var j = 0; j < m0.length; j++) if (g.m[j] !== m0[j] && g.m[j] === w.MAT.ORE) n++;
    check(n === 0, n + " cells of ore painted by a press on MORE's row");
  });

  test("picker: a press on the flyout paints nothing, held still or dragged out into the field", function () {
    var h = open(), w = h.game, g = h.g;
    function snap() { return Array.prototype.slice.call(g.m); }
    function same(a) { for (var j = 0; j < a.length; j++) if (a[j] !== g.m[j] && (a[j] === w.MAT.COAL || g.m[j] === w.MAT.COAL || g.m[j] === w.MAT.ORE)) return false; return true; }
    h.select("COAL"); h.moreRow();
    var r = h.flyRow("IRON ORE"), c = h.at(r.sx, r.sy), m0 = snap();
    h.mouse(c.x, c.y); h.down(0);
    for (var i = 0; i < 10; i++) h.step(1);
    h.up();
    check(h.pick[g.sel].name === "IRON ORE" && !g.moreOpen, "picked " + h.pick[g.sel].name + ", open " + g.moreOpen);
    check(same(m0), "a held press on the flyout painted");
    h.moreRow();
    r = h.flyRow("COAL"); c = h.at(r.sx, r.sy);
    var cam = g.camX; m0 = snap();
    h.mouse(c.x, c.y); h.down(0);
    for (i = 1; i <= 10; i++) { h.mouse(c.x + 2 * i, c.y); h.step(1); }
    h.up();
    check(h.pick[g.sel].name === "COAL", "picked " + h.pick[g.sel].name);
    check(same(m0), "a press on the flyout, dragged out into the field, painted");
    check(g.camX === cam, "the view moved from " + cam + " to " + g.camX);
  });

  test("picker: with the flyout open, the field under it is not the field; a click in the field outside shuts it and paints", function () {
    var h = open(), w = h.game, g = h.g;
    h.select("SAND"); h.moreRow(); h.select("GOLD");
    var r = h.flyRow("GOLD"), c = h.at(r.sx, r.sy);
    h.mouse(c.x, c.y);
    check(!w.inPlay(g), "the field is under the flyout");
    /* (somewhere in the sky, clear of it) */
    var sx = w.MORE_X + w.MORE_W + 60, sy = h.PLAY_Y + 30, p = h.at(sx, sy), j = Math.round(p.y + 0.5) * g.gw + Math.round(p.x + 0.5);
    h.tapScreen(sx, sy);
    check(!g.moreOpen, "a click in the field left it open");
    var n = 0;
    for (var dy = -3; dy <= 3; dy++) for (var dx = -3; dx <= 3; dx++) if (g.m[j + dy * g.gw + dx] === w.MAT.GOLD) n++;
    check(n > 0, "the click that shut it did not paint");
    h.moreRow();
    g.hdrHit = [{ key: "peasants", x0: 290, x1: 330 }];   /* (where the header drew its count: the harness draws nothing) */
    h.tapScreen(300, 8);   /* (a count's popup, along the top: one at a time) */
    check(!g.moreOpen && g.pop === "peasants", "a click on a count left the flyout open, or opened no popup: " + g.moreOpen + ", " + g.pop);
    h.moreRow();
    check(g.moreOpen && !g.pop, "opening MORE left the count's popup up");
  });

  test("picker: the wheel over the flyout goes round MORE's brushes only, and the arrows go on past ERASE into them", function () {
    var h = open(), w = h.game, g = h.g, s0 = g.size;
    h.select("SAND"); h.moreRow();
    var r = h.flyRow("GOLD"), c = h.at(r.sx, r.sy);
    h.mouse(c.x, c.y);
    h.wheel(1);
    check(h.pick[g.sel].name === "COAL", "the first step down landed on " + h.pick[g.sel].name);
    h.wheel(-1);
    check(h.pick[g.sel].name === "STAINED GLASS", "a step up from COAL went to " + h.pick[g.sel].name);
    check(g.size === s0 && g.moreOpen, "the wheel changed the brush size, or shut it");
    var cam = g.camX;
    w.gameWheelXY(g, 40, 0, 0, false, 1000, 1);
    check(g.camX === cam && g.camT === cam, "a sideways swipe over the flyout panned");
    h.key("escape"); h.select("ERASE"); h.key("arrowdown");
    check(h.pick[g.sel].name === "COAL", "down from ERASE is " + h.pick[g.sel].name);
    h.select("STAINED GLASS"); h.key("arrowdown");
    check(h.pick[g.sel].name === "PEASANT", "down from STAINED GLASS is " + h.pick[g.sel].name);
  });

  test("picker: painted stained glass comes in its three colours, and a held brush does not shuffle them", function () {
    var h = open(), w = h.game, g = h.g;
    h.select("STAINED GLASS");
    h.drag(60, 30, 80, 30, { ticks: 8 });
    var tints = {}, cells = [];
    for (var j = 0; j < g.m.length; j++) if (g.m[j] === w.MAT.STAINED) { tints[g.aux[j] % 3] = 1; cells.push([j, g.aux[j]]); }
    check(Object.keys(tints).length === 3, "tints: " + Object.keys(tints));
    h.drag(60, 30, 80, 30, { ticks: 8 });
    check(cells.every(function (q) { return g.m[q[0]] !== w.MAT.STAINED || g.aux[q[0]] === q[1]; }), "painting over it shuffled the panes");
  });

  test("picker: the eyedropper picks up coal; and a scenario that picks from the flyout replays to the same brush", function () {
    var h = open(), w = h.game, g = h.g;
    h.select("COAL"); h.drag(60, 30, 70, 30, { ticks: 4 });
    h.select("SAND"); h.mouse(65, 30); w.sandEyedrop(g);
    check(h.pick[g.sel].name === "COAL", "the eyedropper picked " + h.pick[g.sel].name);
    var h2 = open(6);
    h2.moreRow(); var r = h2.flyRow("FIREBRICK"); h2.tapScreen(r.sx, r.sy);
    var sc = h2.scenario();
    check(sc.ops.some(function (o) { return o.op === "tap" && o.args.act === "sel:FIREBRICK"; }), "the flyout's click was not kept by name: " + JSON.stringify(sc.ops));
    var h3 = open(6); h3.replay(sc);
    check(h3.pick[h3.g.sel].name === "FIREBRICK", "replayed to " + h3.pick[h3.g.sel].name);
  });
};
