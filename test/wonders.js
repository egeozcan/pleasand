/* =====================================================================
   PLEASAND  --  test/wonders.js

   the great works' framework (wonders.js): the dice a village without
   any of it rolls, wet concrete, forced draught, the lightning rod, the
   crew, quarrying (in a mine's gallery, and in the save that started
   all this), iron held back, gilding, the kiln, mixing, and tales.
   required by test/run.js
   ===================================================================== */
"use strict";
var path = require("path");
var H = require("../harness");

module.exports = function (test, check, sim) {
  function know(g, list) { list.forEach(function (k) { g.know[k] = "TEST"; }); }
  function sites(g, kind) { return g.sites.filter(function (s) { return s.kind === kind; }); }
  /* a little wonder of our own, for the framework: a cairn of stone (and whatever else a test wants in it) */
  function cairnDef(w) { if (!w.wOf("cairn")) w.wDef({ id: "cairn", achieve: ["A CAIRN", "a pile of stones, for a test"] }); }
  function cairn(w, p, x, G, n, v) {
    var g = w.g, plan = [];
    cairnDef(w);
    for (var k = 0; k < n; k++) plan.push(w.bE(g, x + (k % 4), G - 1 - (k >> 2), v ? v(k) : w.MAT.BRICK, k >> 2));
    return w.bNew(g, "cairn", p, plan, [x, G - 1 - (n >> 2), x + 3, G - 1], { wonder: true });
  }
  /* a quiet flat patch of ground at column x0, w wide: sand over stone, and nothing over it */
  function flat(w, x0, W, G) {
    var g = w.g, x, y;
    for (x = x0 - 6; x < x0 + W + 6; x++) {
      for (y = G - 30; y < G; y++) w.sandPlace(g, y * g.gw + x, w.MAT.EMPTY);
      for (y = G; y < G + 9; y++) w.sandPlace(g, y * g.gw + x, w.MAT.SAND);
      for (y = G + 9; y < G + 13; y++) w.sandPlace(g, y * g.gw + x, w.MAT.STONE);
    }
  }

  test("wonders: a village with none of the new ideas rolls exactly the dice it did before them", function () {
    /* (recorded at 199c029, before any of this: the plain village, 6000 ticks) */
    var want = { 1: "6dd6e082", 3: "954e65db", 7: "fdc14204" };
    for (var s in want) {
      var h = H.open({ seed: +s });
      h.step(6000);
      check(h.hash() === want[s], "seed " + s + " drew different dice: " + h.hash() + ", was " + want[s]);
      check(!h.g.wAny && !(h.g.tales || []).some(function (t) { return t.kind === "wonder"; }), "seed " + s + " has wonders going on");
    }
  });

  test("wonders: a village with great works in it comes out the same at 1x, 4x and 1/4: the sounds roll the side dice", function () {
    function run(sp) {
      var h = H.open({ seed: 1 });
      h.g.know.concrete = "TEST"; h.g.wAny = true; h.g.helloT = 0;   /* (the greeting is timed by the frame, as it always was) */
      h.speed(sp);
      while (h.g.tick < 3000) h.step(1);
      var c = 0, m = h.g.m; for (var i = 0; i < m.length; i++) c = (c * 31 + m[i]) >>> 0;
      return c;
    }
    var a = run(2), b = run(4), q = run(0);
    check(a === b && a === q, "the grids came out different: " + [a, b, q].map(function (v) { return v.toString(16); }).join(" "));
  });

  /* (master's own tables, before any of the great works: the names of its speech and its achievements, and hashes of
     them and of its ideas. recorded from a worktree of master) */
  var MASTER_TABLES = { say: ["abseil", "acid", "admire", "admireDead", "admireSelf", "arrive", "backache", "bail", "bailBush", "bailDone", "bailField", "bailFloor", "bailOut", "bailPond", "bailThrow", "bailYard", "bed", "blank", "blasted", "bombfish", "boot", "bored", "brigade", "brine", "build", "built", "buried", "camp", "cast", "caught", "charge", "cheer", "chop", "chute", "chuteburn", "chutefail", "climb", "clone", "coal", "cold", "cooked", "cough", "crowWorks", "crowned", "dig", "dizzy", "dong", "douse", "dry", "duck", "duckbite", "ducklings", "eat", "evac", "explore", "fall", "festival", "fill", "finale", "fire", "fish", "fishrain", "fizzle", "float", "flower", "forge", "forged", "frozen", "fuse", "gather", "gatherAsh", "gatherGlass", "gatherPowder", "gatherSalt", "gatherScrap", "genius", "ghost", "glassblow", "glub", "gold", "grab", "greet", "grind", "grit", "hello", "help", "helpFarm", "home", "homeDone", "hot", "hungry", "idea_bell", "idea_bucket", "idea_dig", "idea_farm", "idea_festival", "idea_fish", "idea_forest", "idea_forge", "idea_glass", "idea_grave", "idea_lamp", "idea_lift", "idea_masonry", "idea_mine", "idea_oil", "idea_potash", "idea_powder", "idea_rocket", "idea_salt", "idea_scarecrow", "idea_smelt", "idea_statue", "idle", "iron", "jump", "launch", "lift", "light", "lookout", "lostHome", "mourn", "moveIn", "nap", "nibble", "noFuel", "noclear", "nocoal", "nofish", "nogold", "noiron", "noore", "nope", "nosnow", "nostone", "nowater", "nowood", "nuke", "offer", "oil", "oof", "ooh", "oops", "ore", "out", "pack", "packed", "panic", "phew", "pick", "planBell", "planBridge", "planCrow", "planFarm", "planFurnace", "planGlass", "planGrave", "planGrove", "planHouse", "planJetty", "planLadder", "planLamp", "planLift", "planMine", "planPond", "planPost", "planStairs", "planStatue", "planStone", "planTower", "planWell", "plant", "pockets", "pond", "pondFull", "potash", "pump", "raid", "refuel", "repair", "rocketLand", "rope", "rubber", "safe", "salt", "salted", "saltfish", "scald", "season", "shoo", "shooed", "skate", "skid", "sleep", "slip", "slipped", "smell", "smelt", "snap", "snowHit", "snowJoin", "snowball", "snowman", "snowmanDone", "snowmanGone", "snowmanHello", "snowmanMine", "sow", "sown", "space", "spawn", "spotFire", "starving", "sump", "swim", "swing", "thrown", "tidy", "tidyAway", "tidyClean", "tidyDoor", "tidyFill", "tidyHeap", "tidyHome", "tidyLevel", "tidyPile", "tidyWeed", "till", "timber", "toolsBroke", "touchdown", "treeless", "view", "visit", "wade", "wake", "warm", "watched", "water", "wheat", "zap"],
    sayHash: "211f8b688c9e5dca", ach: ["arrive", "arson", "bell", "blast", "bloom", "bombfish", "bridge", "brigade", "camp", "chute", "coal", "door", "duck", "ducklings", "duckspace", "enlightened", "explorer", "factory", "farm", "festival", "fish", "forge", "frost", "full", "glass", "glasshouse", "gold", "grave", "grit", "grove", "harvest", "heap", "house", "iron", "jetty", "ladder", "lamp", "leave", "lift", "mine", "ninja", "nuke", "oil", "ore", "pack", "pockets", "pond", "post", "potash", "powder", "rebuilt", "roast", "rocket", "rubber", "ruin", "salt", "saltfish", "scarecrow", "shock", "shoo", "skate", "slip", "snowball", "snowman", "space", "stairs", "statue", "stonehouse", "strike", "tidy", "tower", "tree", "village", "well"], achHash: "0545d3da1973bf7e", ideas: 23, ideasHash: "84eb7cca8383ceb2" };
  test("wonders: the great works only add to the village's own tables: master's speech, achievements and ideas are as they were", function () {
    var h = H.open({ seed: 1 }), crypto = require("crypto");
    function sub(T, keys) { return crypto.createHash("sha256").update(JSON.stringify(keys.map(function (k) { return [k, T[k]]; }))).digest("hex").slice(0, 16); }
    var P = h._eval("P_SAY"), A = h._eval("P_ACHIEVE"), I = h._eval("IDEAS");
    var changed = MASTER_TABLES.say.filter(function (k) { return !(k in P); });
    check(sub(P, MASTER_TABLES.say) === MASTER_TABLES.sayHash, "master's speech changed: " + (changed.length ? "missing " + changed : "lines replaced"));
    check(sub(A, MASTER_TABLES.ach) === MASTER_TABLES.achHash, "master's achievements changed");
    check(crypto.createHash("sha256").update(JSON.stringify(I.slice(0, MASTER_TABLES.ideas))).digest("hex").slice(0, 16) === MASTER_TABLES.ideasHash, "master's ideas changed");
  });
  test("wonders: a plain village draws master's dice tick for tick, warm and talking, and after NEW with a field dug up", function () {
    var crypto = require("crypto");
    function hash(o) { return crypto.createHash("sha256").update(JSON.stringify(o)).digest("hex").slice(0, 16); }
    /* (recorded on master: the dice's state after every one of 3000 ticks) */
    var want = { 1: "27c63d83572cdf83", 2: "e4a8c3ddf17eef3f" };
    for (var sd in want) {
      var h = H.open({ seed: +sd }), tr = [];
      for (var t = 0; t < 3000; t++) { h.step(1); tr.push(h.loaded.rng.state); }
      check(hash(tr) === want[sd], "seed " + sd + " drew other dice than master's");
    }
    /* (a peasant too warm, 700 ticks of it: what they say, and how long they wait to say it again. master: 6fb63dd69527) */
    var ht = H.open({ seed: 1 }), pg = ht.g, pe = pg.peasants[0], fx = Math.floor(pe.x), fy = Math.floor(pe.y), heat = ht._eval("pHeat"), draws = [];
    pg.t = 1; pe.warm = 121; [0, 4, 7].forEach(function (dy) { pg.T[(fy - dy) * pg.gw + fx] = 60; });
    for (var i = 0; i < 700; i++) { if (pe.sayT > 0) pe.sayT--; heat(pg, pe, fx, fy); draws.push(ht.loaded.rng.state); }
    check(crypto.createHash("sha256").update(JSON.stringify(draws)).digest("hex").slice(0, 12) === "6fb63dd69527", "a warm peasant drew other dice than master's");
    /* (a field dug up, NEW before it is sown again, and the first field let come of itself. master: tick 1528, at 150) */
    var hn = H.open({ seed: 2 }), gn = hn.g;
    hn._eval("(function () { g.know.farm = 'TEST'; var q = g.peasants[0]; if (!iPlanFarm(g, q, true)) throw Error('no farm'); var s = g.sites.filter(function (s) { return s.kind === 'farm'; })[0]; mDigUpFields(g, s.x0, s.x1); })()");
    hn._eval("sandLandscape(g)");
    for (t = 0; t < 18000 && !gn.sites.some(function (s) { return s.kind === "farm"; }); t++) hn.step(1);
    var f = gn.sites.filter(function (s) { return s.kind === "farm"; })[0];
    check(gn.tick === 1528 && f && f.x0 === 150 && hn.hash() === "dc6bb627", "after NEW the first field came at " + gn.tick + ", " + (f && f.x0) + " (master: 1528, 150), hash " + hn.hash());
  });

  test("wonders: a plain village thinks master's ideas, in master's order, with master's dice, and is enlightened when master is", function () {
    /* (recorded on master: what is thought of, and when, over 12000 ticks) */
    var h = H.open({ seed: 3 }), g = h.g, seq = [], seen = {}, t, k;
    for (t = 0; t < 12000; t++) { h.step(1); for (k in g.know) if (!seen[k]) { seen[k] = 1; seq.push(k + "@" + g.tick); } }
    check(seq.join(" ") === "farm@1320 fish@4116 scarecrow@6740 forest@9718 dig@11616" && h.hash() === "03cf4e61", "seed 3 thought otherwise than master: " + seq.join(" ") + " " + h.hash());
    var master = h._eval("IDEAS").filter(function (i) { return !i.wonder && !i.fresh; }).map(function (i) { return i.id; });
    check(master.length === 23, "(master has 23 ideas: " + master.length + ")");
    /* (the lottery: all of master's but salt and black powder known, both ready. master: salt, and these dice) */
    var h2 = H.open({ seed: 1 }), g2 = h2.g, p = g2.peasants[0];
    g2.peasants = [p];
    master.forEach(function (id) { if (id !== "salt" && id !== "powder") g2.know[id] = p.name; });
    g2.found.ore = 2; g2.found.salt = 3; g2.found.powder = 1; g2.tick = 10000; p.spark = null; p.sayT = 0; h2.setRng(20);
    h2._eval("iEureka")(g2, p);
    check(g2.know.salt && !g2.know.powder && h2.rng() === 3031295976, "the lottery drew otherwise than master: " + (g2.know.salt ? "salt" : "powder") + ", dice " + h2.rng());
    /* (and the last of master's ideas is enlightenment, as on master) */
    var h3 = H.open({ seed: 1 }), g3 = h3.g, q = g3.peasants[0];
    master.forEach(function (id) { if (id !== "salt") g3.know[id] = q.name; });
    g3.found.ore = 2; g3.found.salt = 3; g3.tick = 10000; q.spark = "salt"; q.sayT = 0; g3.ideaT = 0;
    h3._eval("iEureka")(g3, q);
    check(g3.know.salt && g3.got.enlightened && h3.rng() === 3492258051, "the last of master's ideas: enlightened " + !!g3.got.enlightened + ", dice " + h3.rng());
  });
  test("wonders: the great works' ideas roll their own dice, kept with the village: the same save thinks the same with or without a frame drawn", function () {
    var w = sim.load(1), g = w.g, p = g.peasants[0];
    g.tick = 10000;
    w.IDEAS.forEach(function (I) { if (!w.iFresh(I)) g.know[I.id] = p.name; });
    g.found.ore = 2; g.ideaT = 0;
    w.wSpark(g, p, "stained");
    check(p.wspark === "stained", "(the test wants stained glass in mind)");
    var doc = w.saveDocument(g, { source: "test" });
    function fromSave(draw, n) {
      var c = H.open({ seed: 11 }); c.load(doc);
      var gg = c.g, a = gg.peasants[0], out = [];
      gg.shake = 1;
      for (var k = 0; k < n; k++) {
        if (draw) { c._eval("gameDrawSide")(gg, c._eval("ctx")); c._eval("gameDrawSide")(gg, c._eval("ctx")); }   /* (frames drawn: the side dice rolled) */
        gg.ideaT = 0; a.sayT = 0;
        c._eval("iEureka")(gg, a);
        out.push(!!gg.know.stained);
      }
      return out.join() + " " + c.rng() + " " + gg.wRngS;
    }
    var plain = fromSave(false, 6), drawn = fromSave(true, 6);
    check(plain === drawn, "the same save thought otherwise with frames drawn: " + plain + " / " + drawn);
  });
  test("wonders: a plain village's iron is master's, bit for bit: tools worn, a cell salvaged, girders paid for", function () {
    /* (recorded on master) */
    var w = sim.load(1), g = w.g, M = w.MAT, p = g.peasants[0], q = g.peasants[1], n;
    p.iron = 2; q.iron = 0;
    [p, q].forEach(function (a) { a.wear = w.eval("M_WEAR") - 1; a.tools = 1; w.mWear(g, a); });
    w.sandPlace(g, 140 * g.gw + 165, M.METAL); w.lTake(g, q, 165, 140, false);
    for (n = 0; n < 5; n++) w.bPay(g, p, { stock: {} }, w.bE(g, 165, 140 + n, M.GIRDER, 0));
    w.bPay(g, q, { stock: {} }, w.bE(g, 165, 145, M.GIRDER, 0));
    sim.step(w, 2000);
    var got = JSON.stringify([p.iron, q.iron, g.peasants.map(function (o) { return Math.round(o.x * 100); })]);
    check(got === JSON.stringify([1.4999999850988388, 0.4999999970197677, [22922, 16358, 11698, 22506, 12205, 24173, 24054, 11706]]), "otherwise than master: " + got);
  });
  test("wonders: the moment a great work's idea is thought of, the village has great works: a sound flushed either side of the next tick rolls the same", function () {
    function run(late) {
      var h = H.open({ seed: 1 }), g = h.g, p = g.peasants[0];
      h.step(29);
      h._eval("IDEAS").forEach(function (i) { if (!h._eval("iFresh")(i)) g.know[i.id] = p.name; });
      g.ideaT = 0; g.found.ore = 2; h._eval("wSpark")(g, p, "stained"); g.wRngS = 1;
      check(h._eval("iEureka")(g, p) && g.know.stained, "(the test wants stained glass thought of)");
      check(g.wAny, "thought of, and the village does not yet count as one with great works in it");
      g.t = 1; g.quiet = false; g.fx.hammer = 1;
      if (!late) h._eval("sandSounds")(g);
      h.step(1);
      if (late) h._eval("sandSounds")(g);
      h.step(120);
      return h.rng() + " " + h.hash();
    }
    var a = run(false), b = run(true);
    check(a === b, "a sound flushed before the tick, or after it, rolled otherwise: " + a + " / " + b);
  });
  test("wonders: a plain village's peasant thrown into space, and one on a rocket pack, come back as on master, die for die", function () {
    /* (recorded on master: where they come down, how fast across, the dice after, the hash) */
    var h = H.open({ seed: 1 }), g = h.g, p = g.peasants[0];
    p.state = "fly"; p.x = 100; p.y = -39; p.vx = 0; p.vy = -4; p.flyT = 0;
    h.step(1); var away = p.spaceT; h.step(away);
    check(!g.wAny && JSON.stringify([p.state, away, p.x, p.vx, h.loaded.rng.state, h.hash()]) === JSON.stringify(["fly", 435, 101.12857698556036, 0.09461914794519544, 1561192189, "54ba6452"]),
      "back from space other than on master: " + JSON.stringify([p.state, away, p.x, p.vx, h.loaded.rng.state, h.hash()]));
    var h2 = H.open({ seed: 2 }), g2 = h2.g, q = g2.peasants[1], t = 0;
    q.pack = 1; q.fuel = 4; q.x = 120.5; q.y = h2._eval("mGround")(g2, 120) - 1; q.state = "walk"; q.task = null;
    h2._eval("oLaunch")(g2, q);
    while (q.state !== "space" && t < 600) { h2.step(1); t++; }
    h2.step(200);
    check(JSON.stringify([q.state, q.x, h2.loaded.rng.state, h2.hash()]) === JSON.stringify(["walk", 8.428804753296944, 587780594, "f8f5d0e6"]),
      "a rocket pack flight other than on master: " + JSON.stringify([q.state, q.x, h2.loaded.rng.state, h2.hash()]));
  });
  test("wonders: a village rewound to a checkpoint and played again comes out as one played straight: plain, and with great works", function () {
    [1, 2].forEach(function (seed) {
      var rw = H.open({ seed: seed }), ctl = H.open({ seed: seed });
      rw.checkpoint("start"); rw.step(600); rw.restore("start");
      rw.step(600); ctl.step(600);
      check(rw.hash() === ctl.hash(), "seed " + seed + ": rewound " + rw.hash() + ", played straight " + ctl.hash());
    });
    var a = H.open({ seed: 1 }), b = H.open({ seed: 1 });
    [a, b].forEach(function (h) { h.g.know.concrete = "TEST"; h.g.know.moonrocket = "TEST"; h.step(300); });
    a.checkpoint("mid"); a.step(900); a.restore("mid");
    a.step(900); b.step(900);
    check(a.hash() === b.hash(), "a village with great works, rewound: " + a.hash() + ", played straight " + b.hash());
  });
  test("wonders: a save's keyframe restored is the keyframe loaded straight: a legacy save with no speed, and a brush held", function () {
    /* (a current save, the brush down when it is restored: let go, as a load lets go) */
    var s = H.open({ seed: 1 }); s.select("STONE"); s.mouse(190, 60); s.step(40); s.checkpoint("before"); s.step(30);
    var doc = JSON.parse(JSON.stringify(s.saveDoc()));
    var direct = H.open({ seed: 1 }), rw = H.open({ seed: 1 });
    direct.load(doc, { keyframe: 0 }); rw.load(doc); rw.mouse(170, 40).down(); rw.restore("kf0");
    check(!rw.g.down, "restored with the brush still down");
    direct.step(10); rw.step(10);
    check(direct.hash() === rw.hash(), "restored " + rw.hash() + ", loaded straight " + direct.hash());
    /* (a save from before the speed selector: no speed in it, so 1x, either way) */
    var s2 = H.open({ seed: 1 }); s2.step(40); s2.checkpoint("before"); s2.step(30);
    var leg = JSON.parse(JSON.stringify(s2.saveDoc())), dec = s2._eval("saveDecode"), enc = s2._eval("saveEncode");
    leg.state = enc(Object.assign(dec(leg.state), { speed: undefined, speedAcc: undefined }));
    var k0 = dec(leg.keyframes[0].state); delete k0.speed; delete k0.speedAcc; leg.keyframes[0].state = enc(k0);
    var d2 = H.open({ seed: 1 }), r2 = H.open({ seed: 1 });
    d2.load(leg, { keyframe: 0 }); r2.load(leg); r2.restore("kf0");
    var t0 = r2.g.tick; d2.step(10); r2.step(10);
    check(r2.g.tick === t0 + 10 && r2.g.speed === d2.g.speed && r2.hash() === d2.hash(), "a legacy keyframe restored: speed " + r2.g.speed + ", ticks " + (r2.g.tick - t0) + " of 10, hash " + (r2.hash() === d2.hash()));
  });
  test("wonders: a save made with a rocket in the air, its keyframe from before restored, has no rocket: as the keyframe loaded straight", function () {
    var src = H.open({ seed: 1 });
    src.checkpoint("before");
    src._eval("hLiftOff")(src.g, { id: 999, rx: 130, R0: 90, plan: [], crew: [] });
    src.step(2);
    var doc = JSON.parse(JSON.stringify(src.saveDoc()));
    var direct = H.open({ seed: 1 }), rw = H.open({ seed: 1 });
    direct.load(doc, { keyframe: 0 });
    rw.load(doc); rw.restore("kf0");
    check(!rw.g.rocket, "the rocket from after the keyframe is still in the air");
    direct.step(20); rw.step(20);
    check(direct.hash() === rw.hash(), "restored " + rw.hash() + ", loaded straight " + direct.hash());
  });

  test("wonders: wet concrete sets in its form, faster warm, frost ruins it, and poured it sinks under water", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x0 = 200;
    flat(w, x0, 20, G);
    function put(x, y, v, a, t) { var j = y * g.gw + x; w.sandPlace(g, j, v); g.aux[j] = a || 0; if (t != null) { g.T[j] = t; } w.heatAccept(g, j); return j; }
    var room = put(x0, G - 1, M.MORTAR, 128), warm = put(x0 + 4, G - 1, M.MORTAR, 128, 45), cold = put(x0 + 8, G - 1, M.MORTAR, 128, -10);
    sim.step(w, 3);
    check(g.m[cold] === M.SAND, "frozen wet concrete did not crumble to sand: " + g.m[cold]);
    var tw = 0, tr = 0;
    for (var t = 1; t <= 1200 && (!tw || !tr); t++) {
      sim.step(w, 1);
      g.T[warm] = 45;   /* (kept warm) */
      if (!tw && g.m[warm] === M.CONCRETE) tw = t;
      if (!tr && g.m[room] === M.CONCRETE) tr = t;
    }
    check(tr > 700 && tr < 1000, "wet concrete at room temperature set in " + tr + " ticks, not about 900");
    check(tw > 0 && tw < tr * 0.65, "warm wet concrete did not set faster: " + tw + " against " + tr);
    /* poured (no form): it runs, and sinks under water */
    var x = x0 + 14, y;
    for (y = G - 6; y < G; y++) put(x, y, M.WATER);
    for (y = G - 6; y < G; y++) { put(x - 1, y, M.STONE); put(x + 1, y, M.STONE); }
    put(x, G - 8, M.MORTAR);
    sim.step(w, 300);
    check(g.m[(G - 1) * g.gw + x] === M.MORTAR || g.m[(G - 1) * g.gw + x] === M.CONCRETE, "poured wet concrete did not sink under the water: " + g.m[(G - 1) * g.gw + x]);
  });

  test("wonders: wet concrete in its form stays put: water under it does not float up through it", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x, y, k, moved = 0, tops = [];
    for (x = 150; x < 250; x++) { for (y = 100; y < G; y++) w.sandPlace(g, y * g.gw + x, M.EMPTY); for (y = G; y < G + 9; y++) w.sandPlace(g, y * g.gw + x, M.STONE); }
    for (k = 0; k < 20; k++) {
      var top = (G - 3) * g.gw + 160 + 4 * k;
      w.sandPlace(g, top + g.gw, M.WATER); w.sandPlace(g, top + 2 * g.gw, M.WATER);
      w.sandSet(g, top, M.MORTAR); g.aux[top] = 128; w.heatAccept(g, top);   /* (formed: as a builder pours it) */
      tops.push(top);
    }
    for (k = 0; k < 300; k++) { sim.step(w, 1); tops.forEach(function (t) { if (g.m[t] !== M.MORTAR && g.m[t] !== M.CONCRETE) moved++; }); }
    check(moved === 0, "wet concrete was out of its form " + moved + " times");
  });

  test("wonders: a great work's stone put in where there is water shoves the water up, and none of it is lost", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x0 = 200, x, y, k;
    flat(w, x0, 20, G);
    for (x = x0; x <= x0 + 4; x++) for (y = G - 6; y < G; y++) w.sandPlace(g, y * g.gw + x, x === x0 || x === x0 + 4 ? M.STONE : (y >= G - 4 ? M.WATER : M.EMPTY));
    function water() { var n = 0; for (var j = 0; j < g.m.length; j++) if (g.m[j] === M.WATER) n++; return n; }
    var p = g.peasants[0], s = cairn(w, p, x0 + 1, G, 3, function () { return M.BRICK; });   /* (three in the bottom row of the water) */
    s.stock = { stone: 10 };
    var n0 = water();
    for (k = 0; k < s.plan.length; k++) w.bPlace(g, s, s.plan[k], p);
    check(s.plan.every(function (e) { return g.m[e.i] === M.BRICK; }), "the stone did not go in");
    check(water() === n0, "water went from " + n0 + " to " + water());
  });

  test("wonders: a save picks the brush it was saved with by name: one from before wet concrete was in the list keeps its CLONER", function () {
    var w = sim.load(1), g = w.g, k, cl = -1;
    for (k = 0; k < w.PICK.length; k++) if (w.PICK[k].name === "CLONER") cl = k;
    check(cl > 0, "(the test wants a CLONER)");
    var doc = JSON.parse(JSON.stringify(w.saveDocument(g, { source: "test" })));
    doc.ui.sel = "CLONER"; doc.state.sel = cl - 1;   /* (its place in the list before WET CONCRETE went in ahead of it) */
    w.saveLoad(g, doc);
    check(w.curPick(g).name === "CLONER", "loaded with " + w.curPick(g).name + " picked");
  });

  test("wonders: a village with none of it works its furnace as it always did: from four over the mouth, a smelter does not smelt", function () {
    function at(wonders) {
      var w = sim.load(1), g = w.g, M = w.MAT;
      know(g, ["farm", "dig", "mine", "smelt"].concat(wonders ? ["concrete"] : []));
      var p = g.peasants[0];
      check(w.mPlanFurnace(g, p), "(the test wants a furnace)");
      var f = sim.build(w, sites(g, "furnace")[0]), sy = w.mSpotRow(g, f);
      for (var x = f.sx - 1; x <= f.sx + 1; x++) w.sandPlace(g, (sy - 3) * g.gw + x, M.STONE);   /* (a ledge, four over where they stand to work it) */
      sim.step(w, 30);   /* (the wonders' look at the village: g.wAny) */
      p.x = f.sx + 0.5; p.y = sy - 4; p.vy = 0; p.ore = 1; p.coal = 2; p.hunger = 0;
      p.task = { kind: "smelt", site: f.id, t: 0, act: 0, n: 0 };
      w.mTaskSmelt(g, p, p.task);
      return !p.ore;
    }
    check(!at(false), "a smelter four rows over the mouth put the ore in, in a village with no great works (master walks on)");
    check(at(true), "a smelter four rows over the mouth was not let work it, in a village with great works going on");
  });

  test("wonders: stone put in under a capped column of water shoves it round, through the water, to the open top beside it", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x0 = 200, x, y;
    flat(w, x0, 20, G);
    for (x = x0; x <= x0 + 3; x++) for (y = G - 6; y < G; y++) w.sandPlace(g, y * g.gw + x, x === x0 || x === x0 + 3 ? M.STONE : (y >= G - 4 ? M.WATER : M.EMPTY));
    w.sandPlace(g, (G - 5) * g.gw + x0 + 1, M.STONE);   /* (a lid over the left column: the right one is open) */
    function water() { var n = 0; for (var j = 0; j < g.m.length; j++) if (g.m[j] === M.WATER) n++; return n; }
    var p = g.peasants[0], s = cairn(w, p, x0 + 1, G, 1, function () { return M.BRICK; });
    s.stock = { stone: 4 };
    var n0 = water();
    w.bPlace(g, s, s.plan[0], p);
    check(g.m[s.plan[0].i] === M.BRICK, "the stone did not go in under the capped water");
    check(water() === n0, "water went from " + n0 + " to " + water());
  });

  test("wonders: a legacy save's keyframe picks the brush it was saved with, too", function () {
    var w = sim.load(1), g = w.g, k, cl = -1;
    for (k = 0; k < w.PICK.length; k++) if (w.PICK[k].name === "CLONER") cl = k;
    var doc = JSON.parse(JSON.stringify(w.saveDocument(g, { source: "test" })));
    /* (a save from master: no list of picks, no tales, CLONER one place earlier in the list) */
    delete doc.ui.picks; doc.ui.sel = "CLONER";
    var st = w.saveDecode(doc.state); delete st.tales; st.sel = cl - 1;
    doc.keyframes = [{ why: "test", tick: g.tick, t: 0, updates: null, rng: null, state: w.saveEncode(st, []) }];
    w.saveLoad(g, doc, { keyframe: 0 });
    check(w.curPick(g).name === "CLONER", "its keyframe loaded with " + w.curPick(g).name + " picked");
  });

  test("wonders: a bang rolls the same dice however many rings are still fading on the screen (the game at any speed)", function () {
    function after(rings) {
      var w = sim.load(1), g = w.g, k;
      g.wAny = true;   /* (a village with great works: a plain village rolls as master does, rings or no rings) */
      for (k = 0; k < rings; k++) g.rings.push({ x: 0, y: 0, r: 0, R: 1, t: 0 });
      for (k = 0; k < 12; k++) w.sandBoom(g, (130 + k) * g.gw + 40 + 15 * k, 3, 1.2);   /* (a meteorite's size of bang, a dozen) */
      return w.eval("Math.random()");
    }
    check(after(8) === after(0), "the dice after a dozen bangs differ with eight rings fading and with none");
  });

  test("wonders: a legacy save's keyframe, restored as a harness checkpoint, picks its brush by name too", function () {
    var h = H.open({ seed: 1 }), w = h.game, g = h.g, k, cl = -1;
    for (k = 0; k < w.PICK.length; k++) if (w.PICK[k].name === "CLONER") cl = k;
    var doc = JSON.parse(JSON.stringify(h.save()));
    var st = w.saveDecode(doc.state); delete st.tales; st.sel = cl - 1;   /* (a save from master: no tales, no list of picks) */
    delete doc.ui.picks; doc.ui.sel = "CLONER";
    doc.keyframes = [{ why: "test", tick: g.tick, t: 0, updates: 0, rng: null, state: w.saveEncode(st, []) }];
    h.load(doc);
    h.restore("kf0");
    check(w.curPick(h.g).name === "CLONER", "restored checkpoint kf0 with " + w.curPick(h.g).name + " picked");
  });

  test("wonders: gold is never waited for: planned in gold, and the gold gone, it goes in in stone, to be gilded later", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, p = g.peasants[0];
    g.peasants.forEach(function (q) { q.gold = 0; });
    p.gold = 1;   /* (gold on hand, when it was planned) */
    var x = Math.floor(p.x) + 8, G = w.mGround(g, x);
    cairnDef(w);
    var plan = w.wGild(g, [w.bE(g, x, G - 1, M.BRICK, 0), w.bE(g, x, G - 2, M.GOLD, 1)]);
    check(plan[1].v === M.GOLD, "(the test wants it planned in gold)");
    var s = w.bNew(g, "cairn", p, plan, [x, G - 2, x, G - 1], { wonder: true });
    g.know.cairn = "TEST";
    p.gold = 0;   /* (and the gold gone: spent, or gone with whoever had it) */
    sim.step(w, 60);
    check(plan[1].v === M.BRICK, "the cell planned in gold still waits for gold that is not there");
    void s;
  });

  test("wonders: a scenario from before wet concrete, picking by place in the list, replays the brush it picked: and new ones pick by name", function () {
    var h = H.open({ seed: 1 }), k, cl = -1;
    for (k = 0; k < h.pick.length; k++) if (h.pick[k].name === "CLONER") cl = k;
    /* (master's list: wet concrete not in it, CLONER one place earlier) */
    var sc = { version: 1, seed: 1, ticks: 2, ops: [{ at: 0, op: "select", args: { sel: cl - 1 } }, { at: 1, op: "tap", args: { x: 100, y: 60 } }] };
    h.replay(sc);
    check(h.pick[h.g.sel].name === "CLONER", "the old scenario picked " + h.pick[h.g.sel].name);
    var h2 = H.open({ seed: 1 });
    h2.select("CLONER");
    var ops = h2.scenario().ops;
    check(ops[ops.length - 1].args.sel === "CLONER" && h2.scenario().picks, "a new pick is recorded as " + JSON.stringify(ops[ops.length - 1].args));
  });

  test("wonders: a mixer's bucket of water is in their pail, and spilt, not lost, if they die before it is mixed", function () {
    var w = sim.load(1), g = w.g, M = w.MAT;
    know(g, ["farm", "dig", "bucket", "concrete"]);
    var p = g.peasants[0];
    var x = Math.floor(p.x) + 6, G = w.mGround(g, x);
    var s = cairn(w, p, x, G, 4, function () { return M.CONCRETE; });
    s.stock = { lime: 2 };
    g.peasants.forEach(function (q) { if (q !== p) q.x = 10; q.task = null; q.hunger = 0; });
    check(w.wGoMix(g, p, s), "(the test wants somebody mixing)");
    function water() { var n = 0; for (var j = 0; j < g.m.length; j++) if (w.WET[g.m[j]]) n++; return n; }
    var n0 = water(), k;
    for (k = 0; k < 4000 && !(p.task && p.task.water); k++) sim.step(w, 1);
    check(p.task && p.task.water > 0, "(the test wants a bucket scooped)");
    w.pDie(g, p, "old");
    sim.step(w, 1);
    check(water() === n0, "water went from " + n0 + " to " + water() + " with the mixer dead");
  });

  test("wonders: a scenario from before wet concrete, clicking the picker, replays the brush it clicked: and new clicks are kept by name", function () {
    var h = H.open({ seed: 1 }), w = h.game, k, cl = -1;
    for (k = 0; k < h.pick.length; k++) if (h.pick[k].name === "CLONER") cl = k;
    function at(sx, sy) { return { x: (sx - h.PANEL) / h.CELL - 0.5, y: (sy - h.PLAY_Y) / h.CELL - 0.5 }; }   /* (a point on the screen, as the harness's cells) */
    var c = at(10, w.rowY(cl - 1) + 3);   /* (CLONER's row, as the rows were then: one higher) */
    var sc = { version: 1, seed: 1, ticks: 2, ops: [{ at: 0, op: "tap", args: { x: c.x, y: c.y } }] };
    h.replay(sc);
    check(h.pick[h.g.sel].name === "CLONER", "the old scenario's click on CLONER picked " + h.pick[h.g.sel].name);
    var h2 = H.open({ seed: 1 });
    var c2 = at(10, w.rowY(cl) + 3);
    h2.tap(c2.x, c2.y);
    var ops = h2.scenario().ops;
    check(ops.some(function (o) { return o.op === "tap" && o.args.act === "sel:CLONER"; }), "a click on CLONER was not kept by name: " + JSON.stringify(ops));
  });
  /* (recorded with master's harness, in a worktree of master: GLASS clicked, the wheel and the down arrow over the list
     (METAL, then ACID, there), SIZE +, SAND clicked, CLEAR, GLASS and the down arrow (METAL), speed +, WATER and a drag,
     the thermal view. its hash is master's) */
  var MASTER_SC = {"version":1,"seed":3,"ticks":158,"hash":"1597f401","ops":[{"at":0,"op":"tap","args":{"x":-43.5,"y":114.5}},{"at":5,"op":"mouse","args":{"x":-43.5,"y":114.5}},{"at":5,"op":"wheel","args":{"d":1}},{"at":5,"op":"tap","args":{"x":100,"y":60}},{"at":5,"op":"tap","args":{"x":101,"y":60}},{"at":15,"op":"key","args":{"k":"arrowdown"}},{"at":15,"op":"tap","args":{"x":120,"y":50}},{"at":25,"op":"tap","args":{"x":-8.5,"y":165.5}},{"at":25,"op":"tap","args":{"x":-43.5,"y":39.5}},{"at":25,"op":"tap","args":{"x":140,"y":40}},{"at":45,"op":"tap","args":{"x":-18.5,"y":172}},{"at":50,"op":"tap","args":{"x":-43.5,"y":114.5}},{"at":50,"op":"key","args":{"k":"arrowdown"}},{"at":50,"op":"tap","args":{"x":90,"y":70}},{"at":50,"op":"tap","args":{"x":91,"y":70}},{"at":60,"op":"tap","args":{"x":-28.5,"y":178.5}},{"at":60,"op":"tap","args":{"x":-43.5,"y":44.5}},{"at":60,"op":"drag","args":{"x0":60,"y0":30,"x1":80,"y1":30,"ticks":8,"btn":0}},{"at":98,"op":"tap","args":{"x":-38.5,"y":185}}]};
  test("wonders: a real scenario recorded on master, clicking the panel's rows and buttons and using the wheel and arrows over the list, replays to master's hash", function () {
    var h = H.open({ seed: MASTER_SC.seed }), r = h.replay(MASTER_SC);
    check(r.matches, "replayed to " + r.hash + ", not master's " + MASTER_SC.hash + " (" + h.pick[h.g.sel].name + ", size " + h.g.size + ", speed " + h.g.speed + ", thermal " + h.g.thermal + ")");
    check(h.pick[h.g.sel].name === "WATER" && h.g.size === 6 && h.g.speed === 3 && h.g.thermal, "the panel came out " + h.pick[h.g.sel].name + ", size " + h.g.size + ", speed " + h.g.speed + ", thermal " + h.g.thermal);
  });
  test("wonders: what is done on the panel, the wheel and the arrows is recorded as what it did, and replays as that whatever the panel's layout", function () {
    var h = H.open({ seed: 2 }), w = h.game, k;
    function at(sx, sy) { return { x: (sx - h.PANEL) / h.CELL - 0.5, y: (sy - h.PLAY_Y) / h.CELL - 0.5 }; }
    for (k = 0; k < h.pick.length; k++) if (h.pick[k].name === "GLASS") break;
    var c = at(10, w.rowY(k) + 4); h.tap(c.x, c.y);
    h.mouse(c.x, c.y); h.wheel(1); h.key("arrowdown");
    c = at(80, w.SIZE_Y + 5); h.tap(c.x, c.y);
    c = at(60, w.BTN_Y + 5); h.tap(c.x, c.y);
    var sc = h.scenario(), ops = sc.ops;
    function arg(op, f) { return ops.filter(function (o) { return o.op === op; }).map(function (o) { return o.args[f]; }); }
    check(arg("tap", "act").join() === "sel:GLASS,size+,clear", "taps kept as " + arg("tap", "act").join());
    check(arg("wheel", "sel")[0] === "WET CONCRETE" && arg("key", "sel")[0] === "METAL", "wheel and arrow kept as " + arg("wheel", "sel") + ", " + arg("key", "sel"));
    /* (the panel laid out some other way by the time it is replayed: every click somewhere else on it, and the list
       in another order) */
    var sc2 = JSON.parse(JSON.stringify(sc));
    sc2.ops.forEach(function (o) { if (o.op === "tap" || o.op === "mouse") o.args.y = 5; });
    sc2.picks = sc2.picks.slice().reverse();
    var h2 = H.open({ seed: 2 }), r = h2.replay(sc2);
    check(r.hash === sc.hash && h2.pick[h2.g.sel].name === "METAL" && h2.g.size === h.g.size, "replayed with the panel moved: " + h2.pick[h2.g.sel].name + ", size " + h2.g.size + ", hash " + (r.hash === sc.hash));
  });

  test("wonders: a pail of concrete gone off up a ladder is carried as a lump, and kept when they die", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x0 = 200, x, y;
    flat(w, x0, 20, G);
    know(g, ["concrete"]);
    var p = g.peasants[0];
    g.peasants.forEach(function (q) { if (q !== p) q.x = 10; });
    /* (up a ladder, over a drop, nothing near to put a lump on) */
    for (x = x0 - 6; x <= x0 + 6; x++) for (y = G - 40; y <= G; y++) w.sandPlace(g, y * g.gw + x, M.EMPTY);
    for (y = G - 30; y <= G; y++) w.sandPlace(g, y * g.gw + x0, M.LADDER);
    p.x = x0 + 0.5; p.y = G - 20; p.mortar = w.W_PAIL; p.mortarT = g.tick - w.W_POUR - 1; p.task = null;
    function conc() { var n = 0; for (var j = 0; j < g.m.length; j++) if (g.m[j] === M.CONCRETE) n++; return n; }
    var c0 = conc();
    w.wWentOff(g, p);
    check(conc() - c0 + (p.lump || 0) === w.W_PAIL, "a pail gone off: " + (conc() - c0) + " set down and " + (p.lump || 0) + " carried, of " + w.W_PAIL);
    w.pDie(g, p, "old");
    check(conc() === c0 && g.salvage && g.salvage.lump === w.W_PAIL, "dead, the lump was not kept: " + (conc() - c0) + " set down, " + JSON.stringify(g.salvage));
  });

  test("wonders: a lump of concrete is never put down by whoever carries it, but into a plan's cell, where it goes in set", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x0 = 200, x, y, k;
    flat(w, x0, 20, G);
    know(g, ["concrete"]);
    var p = g.peasants[0];
    g.peasants.forEach(function (q) { if (q !== p) q.dead = 1; });
    /* (under a low ceiling of stone: room to stand, and no more) */
    for (x = x0 - 6; x <= x0 + 6; x++) w.sandPlace(g, (G - 10) * g.gw + x, M.STONE);
    p.x = x0 + 0.5; p.y = G - 1; p.mortar = w.W_PAIL; p.mortarT = g.tick - w.W_POUR - 1; p.task = null; p.hunger = 0;
    function conc() { var n = 0; for (var j = 0; j < g.m.length; j++) if (g.m[j] === M.CONCRETE || g.m[j] === M.MORTAR) n++; return n; }
    var c0 = conc();
    for (k = 0; k < 300; k++) sim.step(w, 1);
    check(conc() === c0 && p.lump === w.W_PAIL && !p.dead, "the lump was put down by its carrier: " + (conc() - c0) + " cells, " + p.lump + " carried, dead " + !!p.dead);
    /* (and a wonder wanting concrete: it goes in there, set) */
    var s = cairn(w, p, x0 + 3, G, 2, function () { return M.CONCRETE; });
    for (k = 0; k < 12000 && !s.plan.every(function (e) { return g.m[e.i] === M.CONCRETE; }); k++) sim.step(w, 1);
    check(s.plan.every(function (e) { return g.m[e.i] === M.CONCRETE; }), "the lump did not go into the wonder's concrete: " + s.plan.map(function (e) { return w.MAT_NAME[g.m[e.i]]; }).join(","));
    check(p.lump === w.W_PAIL - 2, "the lump went from " + w.W_PAIL + " to " + p.lump + " for two cells");
  });
  test("wonders: dead with what they carried for a great work, none of it is a cell: it is all kept, and fetched for a great work that wants it", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x0 = 200, k;
    flat(w, x0 - 60, 100, G);
    know(g, ["concrete"]);
    var p = g.peasants[0], q = g.peasants[1];
    g.peasants.forEach(function (o) { if (o !== p && o !== q) o.dead = 1; });
    function cells() { var n = 0; for (var j = 0; j < g.m.length; j++) if (g.m[j] === M.CONCRETE || g.m[j] === M.MOONROCK) n++; return n; }
    var c0 = cells();
    /* (nothing to put it by: no great work, no furnace, and stone all round) */
    p.x = x0 + 0.5; p.y = G - 1; p.lump = 5; p.moonrock = 2; p.firebrick = 2; p.stained = 2; p.tints = [1, 2];
    w.pDie(g, p, "old");
    sim.step(w, 2);
    var sv = g.salvage || {};
    check(cells() === c0, "the dead's load was set down as cells: " + (cells() - c0));
    check(sv.lump === 5 && sv.moonrock === 2 && sv.firebrick === 2 && sv.stained === 2 && (sv.tints || []).join() === "1,2", "not all kept: " + JSON.stringify(sv));
    /* (and saved with the world) */
    var doc = JSON.parse(JSON.stringify(w.saveDocument(g, { source: "test" }))), w2 = sim.load(1);
    w2.saveLoad(w2.g, doc);
    check(JSON.stringify(w2.g.salvage) === JSON.stringify(g.salvage), "the salvage was not saved: " + JSON.stringify(w2.g.salvage));
    /* (a great work wanting concrete: the lumps fetched, and go in) */
    var s = cairn(w, q, x0 - 20, G, 3, function () { return M.CONCRETE; });
    q.x = x0 - 30.5; q.y = G - 1; q.task = null; q.hunger = 0;
    for (k = 0; k < 12000 && !s.plan.every(function (e) { return g.m[e.i] === M.CONCRETE; }); k++) sim.step(w, 1);
    check(s.plan.every(function (e) { return g.m[e.i] === M.CONCRETE; }), "the kept lumps never went into the great work: " + JSON.stringify(g.salvage) + ", carried " + q.lump);
  });
  test("wonders: what the dead left is kept through CLEAR, but a NEW village starts with none of it", function () {
    var w = sim.load(1), g = w.g, p = g.peasants[0];
    p.lump = 3; p.moonrock = 1;
    w.pDie(g, p, "old");
    check(g.salvage && g.salvage.lump === 3 && g.wSalv, "(the test wants something kept)");
    w.sandClear(g);
    check(g.salvage && g.salvage.lump === 3, "CLEAR lost what was kept: " + JSON.stringify(g.salvage));
    w.sandLandscape(g);
    check(!g.salvage && !g.wSalv, "a NEW village has the old one's salvage: " + JSON.stringify(g.salvage));
  });
  test("wonders: a plain village's blasts with the rings full roll what master rolls (the ring is drawn on the side dice only once there are great works)", function () {
    /* (recorded from a worktree of 27b07de, master before the great works: six blasts at a time with eight rings still going) */
    var want = { 1: "8e3cf84c", 3: "17558158", 7: "f3fd0f06" };
    for (var s in want) {
      var w = sim.load(+s), g = w.g;
      sim.step(w, 300);
      for (var b = 0; b < 6; b++) {
        g.rings = []; for (var k = 0; k < 8; k++) g.rings.push({ x: 0, y: 0, r: 0, R: 1, t: 0 });
        var i = (120 + b * 7) * g.gw + 120 + b * 11;
        w.sandPlace(g, i, w.MAT.SAND);
        w.sandBoom(g, i, 3, 1);
        sim.step(w, 40);
      }
      sim.step(w, 200);
      var c = 0, m = g.m; for (var j = 0; j < m.length; j++) c = (c * 31 + m[j]) >>> 0;
      check(c.toString(16) === want[s], "seed " + s + " rolled differently from master: " + c.toString(16) + ", was " + want[s]);
    }
  });
  test("wonders: in a great work's stone with no way out to the floor, and a sealed chamber above: put out at the foot of the shaft on dry footing, not held, not afloat", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x, y;
    var q = g.peasants[0];
    g.peasants.forEach(function (o) { if (o !== q) o.dead = 1; });
    w.sandClear(g);
    for (x = 0; x < g.gw; x++) for (y = 9; y < g.gh; y++) w.sandPlace(g, y * g.gw + x, M.STONE);
    var fx = 60, fy = 100;
    /* (a sealed chamber at rows 70..79, a shaft up to it at column fx from row 80, and the peasant's cell at the foot of it, in stone) */
    for (x = fx - 3; x <= fx + 3; x++) for (y = 70; y <= 79; y++) w.sandPlace(g, y * g.gw + x, M.EMPTY);
    for (y = 80; y <= 99; y++) w.sandPlace(g, y * g.gw + fx, M.EMPTY);
    g.sites.push({ wonder: true, kind: "probe", plan: [{ i: fy * g.gw + fx, v: M.STONE }], done: true });
    q.x = fx + 0.5; q.y = fy; q.buried = 5; q.state = "walk"; q.task = null;
    check(!w.hRelease(g, q), "(the test wants nowhere to let them out to on the floor, but there is somewhere)");
    w.wEvict(g);
    check(q.state !== "space" && !q.aboard, "held, with dry footing under the shaft: " + q.state);
    check(!q.dead && w.navStand(g, Math.floor(q.x), Math.floor(q.y)) === 1, "not on footing: " + q.x + "," + q.y);
    check(Math.floor(q.y) === 99 && Math.floor(q.x) === fx, "put out at " + q.x + "," + q.y + ", not at the foot of the shaft");
    sim.step(w, 20);
    check(!q.dead, "dead after twenty ticks there: " + JSON.stringify(g.causes));
  });
  test("wonders: put out in a great work's stone under a lower pool, with a flooded ledge above it: put out dry, not in the water", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x, y;
    var q = g.peasants[0];
    g.peasants.forEach(function (o) { if (o !== q) o.dead = 1; });
    w.sandClear(g);
    for (x = 0; x < g.gw; x++) for (y = 9; y < g.gh; y++) w.sandPlace(g, y * g.gw + x, M.STONE);
    var fx = 60;
    /* (a sealed chamber at rows 70..79; a shaft at fx from row 80 down: water at 95..99 standing in it, a stone ledge at 88
       with water on it at 84..87, and the peasant's cell at 100 in stone) */
    for (x = fx - 3; x <= fx + 3; x++) for (y = 70; y <= 79; y++) w.sandPlace(g, y * g.gw + x, M.EMPTY);
    for (y = 80; y <= 99; y++) w.sandPlace(g, y * g.gw + fx, M.EMPTY);
    for (y = 95; y <= 99; y++) w.sandPlace(g, y * g.gw + fx, M.WATER);
    w.sandPlace(g, 88 * g.gw + fx, M.STONE);
    for (y = 84; y <= 87; y++) w.sandPlace(g, y * g.gw + fx, M.WATER);
    g.sites.push({ wonder: true, kind: "probe", plan: [{ i: 100 * g.gw + fx, v: M.STONE }], done: true });
    q.x = fx + 0.5; q.y = 100; q.buried = 5; q.state = "walk"; q.task = null;
    w.wEvict(g);
    var at = g.m[Math.floor(q.y) * g.gw + Math.floor(q.x)];
    check(q.state !== "space" && !q.aboard, "held, with dry air to be put in: " + q.state);
    check(at !== M.WATER, "put out in the water at " + q.x + "," + q.y);
    sim.step(w, 30);
    check(!q.dead && g.m[Math.floor(q.y) * g.gw + Math.floor(q.x)] !== M.WATER, "not alive in the water after 30 ticks at " + q.x.toFixed(1) + "," + q.y.toFixed(1));
  });
  test("wonders: the kiln's orders count what is in pockets once over all the works, not once for each", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, p = g.peasants[0];
    g.wAny = true;
    function site(id, x) { var plan = []; for (var k = 0; k < 3; k++) plan.push({ i: 60 * g.gw + x + k, v: M.FIREBRICK }); return { id: id, kind: "probe", wonder: true, plan: plan, stock: {} }; }
    g.sites.push(site(9001, 100), site(9002, 200));
    g.peasants.forEach(function (q) { q.firebrick = 0; });
    p.firebrick = 3;
    check(w.wPocketedSure(g, "firebrick") === 3, "(the test wants three firebricks in hand)");
    var o = w.wKilnOrders(g).filter(function (o) { return o.r === "firebrick"; });
    var n = o.reduce(function (a, o) { return a + o.n; }, 0);
    check(n === 3, "six firebricks wanted and three in hand, but " + n + " ordered: " + JSON.stringify(o));
  });
  test("wonders: the lime two works want counts the wet concrete in pockets once over both, not once for each", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, p = g.peasants[0];
    g.wAny = true;
    function site(id, x) { var plan = []; for (var k = 0; k < 10; k++) plan.push({ i: 60 * g.gw + x + k, v: M.CONCRETE }); return { id: id, kind: "probe", wonder: true, plan: plan, stock: {} }; }
    var a = site(9001, 100), b = site(9002, 200);
    g.sites.push(a, b);
    g.peasants.forEach(function (q) { q.mortar = 0; q.lime = 0; });
    p.mortar = 10;
    check(w.wPocketedSure(g, "mortar") === 10, "(the test wants ten cells of wet concrete in hand)");
    var n = w.wLimeWant(g, a) + w.wLimeWant(g, b);
    check(n === 2, "twenty cells of concrete wanted and ten in hand (two pails' worth short), but lime for " + n + " wanted");
    var o = w.wKilnOrders(g).filter(function (o) { return o.r === "lime"; }).reduce(function (t, o) { return t + o.n; }, 0);
    check(o === 2, "lime for " + o + " pails ordered, not two");
  });
  test("wonders: the salvage by a great work as tall as the world is fetched from footing beside it, in the world", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x0 = 200, y, k;
    flat(w, x0 - 40, 80, G);
    var p = g.peasants[0];
    g.peasants.forEach(function (o) { if (o !== p) o.dead = 1; });
    var s = cairn(w, p, x0, G, 4); s.done = true;
    for (y = 0; y < G; y++) w.sandPlace(g, y * g.gw + Math.round(s.cx), M.STONE);   /* (up to the top of the world, where it is kept) */
    g.salvage = { moonrock: 2, x: x0 };
    p.x = x0 - 20.5; p.y = G - 1; p.task = null; p.hunger = 0; g.know.moonrocket = "TEST";
    for (k = 0; k < 3000 && g.salvage; k++) sim.step(w, 1);
    check(!g.salvage, "the moon rock was never fetched: " + JSON.stringify(g.salvage) + ", carried " + (p.moonrock || 0));
    g.salvage = { moonrock: 1, x: x0 };
    var at = w.wSalvageSpot(g);
    check(at && at.y >= 0 && w.navStand(g, at.x, at.y) === 1, "the salvage is to be fetched from " + JSON.stringify(at));
  });
  test("wonders: a gallery to quarry that nobody can get to, let be, loses to bare rock they can", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 120, x, y, k;
    w.sandClear(g);
    for (x = 0; x < g.gw; x++) for (y = G; y < g.gh; y++) w.sandPlace(g, y * g.gw + x, M.STONE);
    var p = g.peasants[0];
    g.peasants.forEach(function (o) { if (o !== p) o.dead = 1; });
    p.x = 180.5; p.y = G - 1;
    /* (a mine with a gallery off it, its shaft sealed: no way down) */
    var m = w.bNew(g, "mine", p, [], [80, G, 85, 179], { mine: true, col: 83, B: 173 }); m.done = true;
    var t = w.bNew(g, "tunnel", p, [], [85, 163, 102, 173], { mine: true, col: 83, xa: 85, xb: 102, dir: 1, B: 173, S: G, of: m.id }); t.done = true;
    for (x = 81; x < 103; x++) for (y = 162; y <= 173; y++) w.sandPlace(g, y * g.gw + x, M.EMPTY);
    var r = w.wQuarryPlot(g, 180, p);
    check(r && r.of === t.id, "(the test wants the gallery chosen first)");
    g.know.mine = "TEST";
    var plan = []; for (k = 0; k < 16; k++) plan.push(w.bE(g, 190 + k, G - 1, M.BRICK, 0));
    w.bNew(g, "pyramid", p, plan, [190, G - 1, 206, G - 1], { wonder: true });
    for (k = 0; k < 12000 && !g.wQuarryFar; k++) { g.tick++; if (!p.task) w.wGoQuarry(g, p); if (p.task) w.wTaskQuarry(g, p, p.task); }
    check(!!g.wQuarryFar, "(the test wants the gallery given up on)");
    var r2 = w.wQuarryPlot(g, 180, p);
    check(r2 && r2.of !== t.id, "the gallery given up on is still the one chosen");
  });
  test("wonders: a pyramid short of a single brick, half a stone, calls a quarryman, and is mended", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, x, y, i;
    w.sandClear(g);
    for (x = 0; x < g.gw; x++) for (y = g.gh - 10; y < g.gh; y++) w.sandPlace(g, y * g.gw + x, M.STONE);   /* (bare rock: room to quarry, none for a mine) */
    g.arriveT = 1e9; g.helloT = 0; g.wAny = true; g.know = { pyramid: "TEST", mine: "TEST" }; g.ideaT = 1e9;
    var p = g.peasants[0]; g.peasants = [p];
    p.x = 65.5; p.y = g.gh - 11; p.task = null; p.idle = 0; p.hunger = 0; p.life = 1e9;
    check(w.mPlanPyramid(g, p), "(the test wants a pyramid)");
    var s = g.sites.filter(function (t) { return t.kind === "pyramid"; })[0]; sim.build(w, s);
    var e = s.plan.filter(function (e2) { return e2.v === M.BRICK && ((e2.i / g.gw) | 0) === s.G - 1; })[0];
    w.heatVanish(g, e.i); w.bInspect(g, s, g.sites.indexOf(s));
    check(w.wStoneShort(g, s) === 0.5, "(the test wants half a stone short: " + w.wStoneShort(g, s) + ")");
    for (i = 0; i < 12000 && !w.bOk(g, e); i++) { p.hunger = 0; sim.step(w, 1); }
    check(w.bOk(g, e), "the brick was never put back: " + s.note);
  });
  test("wonders: a worked-out mine under sand, and a pyramid a brick short: a one-row cut is quarried, and it is mended", function () {
    var w = sim.load(7), g = w.g, M = w.MAT, x, y, i;
    w.sandClear(g);
    for (x = 0; x < g.gw; x++) for (y = 146; y < g.gh; y++) w.sandPlace(g, y * g.gw + x, y < 151 ? M.SAND : M.STONE);
    var p = g.peasants[0]; g.peasants = [p];
    p.x = 132.5; p.y = 145; p.task = null; p.idle = 0; p.hunger = 0; p.stone = 0; p.life = 1e9;
    g.arriveT = 1e9; g.helloT = 0; g.ideaT = 1e9; g.know = { mine: "TEST", pyramid: "TEST" }; g.wAny = true;
    check(w.mPlanMine(g, p), "(the test wants a mine)");
    var mine = sim.build(w, g.sites.filter(function (s) { return s.kind === "mine"; })[0]); mine.sunk = true; p.task = null;
    for (i = 0; i < 100 && !w.mWorkedOut(mine); i++) if (w.mPlanTunnel(g, p)) { sim.build(w, g.sites[g.sites.length - 1]); p.task = null; }
    check(w.mWorkedOut(mine), "(the test wants the mine worked out)");
    check(w.mPlanPyramid(g, p), "(the test wants a pyramid)");
    var py = sim.build(w, g.sites.filter(function (s) { return s.kind === "pyramid"; })[0]); p.task = null;
    var cell = py.plan.filter(function (e) { return e.v === M.BRICK && ((e.i / g.gw) | 0) === py.G - 1; })[0];
    w.heatVanish(g, cell.i); w.bInspect(g, py, g.sites.indexOf(py));
    var plot = w.wQuarryPlot(g, py.cx, p);
    check(plot && plot.depth >= 1, "nowhere to quarry: " + JSON.stringify(plot));
    for (i = 0; i < 8000 && !w.bOk(g, cell); i++) { p.hunger = 0; sim.step(w, 1); }
    check(w.bOk(g, cell), "the brick was never put back: " + py.note);
  });
  test("wonders: dead in a tunnel with a load of concrete, they do not plug it: whoever else is in there can still get out", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x0 = 200, x, y, k;
    flat(w, x0 - 40, 80, G);
    /* (a tunnel nine high, under stone, open at one end) */
    for (x = x0 - 30; x <= x0 + 6; x++) for (y = G - 20; y < G; y++) if (y < G - 9 || x > x0 + 4) w.sandPlace(g, y * g.gw + x, M.STONE);
    var p = g.peasants[0], q = g.peasants[1];
    g.peasants.forEach(function (o) { if (o !== p && o !== q) o.dead = 1; });
    p.x = x0 - 20.5; p.y = G - 1; p.lump = 5;
    q.x = x0 + 1.5; q.y = G - 1; q.task = null; q.hunger = 0;
    function out() { return !!w.navFind(g, Math.floor(q.x), G - 1, function (x2) { return x2 < x0 - 32; }, x0 - 34, G - 1, 8000); }
    check(out(), "(the test wants a way out first)");
    w.pDie(g, p, "old");
    sim.step(w, 2);
    check(out(), "the dead's concrete shut the tunnel");
  });

  test("wonders: forced draught: a closed firebrick chamber of lit coal passes 1500 with the bellows, and not without", function () {
    function chamber(draught) {
      var w = sim.load(1), g = w.g, M = w.MAT, x0 = 200, y0 = 60, x, y, cells = [], hi = 0;
      for (y = y0 - 1; y <= y0 + 5; y++) for (x = x0 - 1; x <= x0 + 3; x++) {
        var j = y * g.gw + x, inside = x >= x0 && x <= x0 + 2 && y >= y0 && y <= y0 + 4;
        w.sandPlace(g, j, inside ? M.EMBER : M.FIREBRICK);
        if (inside) { g.aux[j] = 1; g.T[j] = 600; w.heatAccept(g, j); cells.push(j); }
      }
      check(w.wClosed(g, cells), "(the test wants a closed chamber)");
      for (var t = 0; t < 2500; t += 30) {
        if (draught) w.wDraught(g, "test", cells, 60);
        sim.step(w, 30);
        cells.forEach(function (j) { if (g.m[j] === M.EMBER && g.T[j] > hi) hi = g.T[j]; });
      }
      return hi;
    }
    var on = chamber(true), off = chamber(false);
    check(on > 1500, "with the bellows going it got to only " + Math.round(on));
    check(off < 760, "without the bellows it got to " + Math.round(off));
  });

  test("wonders: the lightning rod takes a bolt aimed at something of theirs, and lets one aimed at open ground land", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x0 = 140, x, y;
    flat(w, x0, 60, G);
    g.peasants.forEach(function (q) { q.x = 20; });
    /* a block of stonework of theirs, eleven wide; a girder rod eight columns off it; open sand eight the other way */
    var plan = [];
    for (x = x0; x < x0 + 11; x++) for (y = G - 4; y < G; y++) plan.push(w.bE(g, x, y, M.BRICK, 0));
    var block = sim.build(w, w.bNew(g, "statue", null, plan, [x0, G - 4, x0 + 10, G - 1], { of: "NOBODY", px: x0 + 5, G: G }));
    var rx = x0 + 13, rplan = [];
    for (y = G - 14; y < G; y++) rplan.push(w.bE(g, rx, y, M.GIRDER, 0));
    sim.build(w, w.bNew(g, "post", null, rplan, [rx, G - 14, rx, G - 1], { G: G, rod: { x: rx, top: G - 14, bot: G - 1 } }));
    var rod = sites(g, "post")[0];
    w.sandLightning(g, x0 + 5);
    check(rod.rodHits === 1, "the rod did not take a bolt aimed at the stonework (" + (rod.rodHits || 0) + ")");
    var burnt = 0;
    for (x = x0 - 2; x < x0 + 13; x++) for (y = G - 10; y < G + 2; y++) { var c = g.m[y * g.gw + x]; if (c === M.FIRE || c === M.GLASS || c === M.EMBER) burnt++; }
    check(burnt === 0, burnt + " cells burned or fused round the stonework");
    /* open ground the other side of the rod, eight off: it lands where it was aimed */
    w.sandLightning(g, rx + 8);
    check(rod.rodHits === 1, "the rod took a bolt aimed at open ground");
    void block;
  });

  test("wonders: a great work's crew is capped, and it never counts against the projects going at once", function () {
    var w = sim.load(1), g = w.g;
    var p = g.peasants[0], x = Math.floor(p.x) + 8, G = w.mGround(g, x);
    var open = w.bOpenCount(g), s = cairn(w, p, x, G, 24);
    check(w.bOpenCount(g) === open, "a wonder counted against B_OPEN");
    g.peasants.forEach(function (q) { q.stone = 10; q.task = null; q.hunger = 0; });
    g.peasants.forEach(function (q) { var t = w.bNearestSite(g, q, 400); if (t) w.bJoin(g, q, t); else w.wPick(g, q, false); });
    var crew = w.wCrew(g, s), haul = g.peasants.filter(function (q) { return q.task && q.task.kind === "haul"; }).length;
    check(crew === w.wCap(g), "the crew is " + crew + ", the cap " + w.wCap(g));
    check(haul > 0, "nobody carrying stone, past the crew, brought it to the pile");
  });

  test("wonders: two great works go up at once, not three; one laid by is not one of them; their crews are half the village at most", function () {
    var w = sim.load(1), g = w.g, p = g.peasants[0], x = Math.floor(p.x) + 8, G = w.mGround(g, x);
    var a = cairn(w, p, x, G, 24);
    check(w.wRoomFor(g), "one great work going up left no room for another");
    var b = cairn(w, p, x + 6, w.mGround(g, x + 6), 24);
    check(!w.wRoomFor(g), "room for a third great work beside two");
    b.laid = true;
    check(w.wRoomFor(g), "a great work laid by still counted as one going up");
    b.laid = false;
    var c = cairn(w, p, x + 12, w.mGround(g, x + 12), 24);   /* (a third, say, taken up again) */
    g.peasants.forEach(function (q) { q.stone = 10; q.task = null; q.hunger = 0; });
    g.peasants.forEach(function (q) { var t = w.bNearestSite(g, q, 400); if (t) w.bJoin(g, q, t); else w.wPick(g, q, false); });
    var crews = w.wCrew(g, a) + w.wCrew(g, b) + w.wCrew(g, c);
    check(crews <= Math.floor(w.bAlive(g) / 2), "the great works' crews are " + crews + " of " + w.bAlive(g));
    check([a, b, c].every(function (t) { return w.wCrew(g, t) <= w.wCap(g); }), "a crew over its cap");
  });

  /* a mine with a gallery dug out east of it, all done, in seed 1 */
  function galleryVillage() {
    var w = sim.load(1), g = w.g, p = null, k;
    know(g, ["farm", "dig", "mine", "masonry"]);
    for (k = 0; k < g.peasants.length && !sites(g, "mine").length; k++) { p = g.peasants[k]; w.mPlanMine(g, p); }
    var m = sim.build(w, sites(g, "mine")[0]);
    p.task = null;
    check(w.mPlanTunnel(g, p), "(the test wants a gallery)");
    var t = sim.build(w, sites(g, "tunnel")[0]);
    g.peasants.forEach(function (q) { q.stone = 0; q.task = null; q.mineCD = 1e9; });
    g.mineNo = {}; for (k = 0; k < g.gw; k++) g.mineNo[k] = 1e12;
    return { w: w, g: g, m: m, t: t, p: p };
  }
  test("wonders: a wonder short of stone sends one quarryman, who benches a gallery, brings it to the pile, and can climb out", function () {
    var V = galleryVillage(), w = V.w, g = V.g, t = V.t, m = V.m;
    var x = Math.round(w.wMiddle(g)), G = w.mGround(g, x);
    var s = cairn(w, V.p, x, G, 40);
    var most = 0, first = null;
    for (var k = 0; k < 9000 && !(s.stock && s.stock.stone >= 1) && w.bShare(g, s) === 0; k++) {
      sim.step(w, 1);
      var qs = g.peasants.filter(function (q) { return q.task && q.task.kind === "quarry"; });
      most = Math.max(most, qs.length);
      if (!first) first = sites(g, "quarry")[0];
    }
    check(first && first.of === t.id, "no bench was planned in the gallery");
    check(most === 1, most + " quarrymen at once");
    check((s.stock && s.stock.stone >= 1) || w.bShare(g, s) > 0, "no stone reached the pile (" + JSON.stringify(s.stock) + ")");
    var q = first, cut = q.plan.filter(function (e) { return e.v === w.MAT.EMPTY && w.bOk(g, e); }).length;
    check(cut >= 3, "the bench is not being cut: " + cut + " cells");
    /* the bench is climbed out of: from its floor, as far as it is down, to the top of the shaft */
    var bx = q.cols[0], by = w.wFloorAt(g, bx, t.B);
    var route = w.navFind(g, bx, by, function (X, Y) { return Math.abs(X - m.col) <= 2 && Y < m.S; }, m.col, m.S - 1, 20000);
    check(!!route, "no way up out of the bench at " + bx + "," + by);
  });

  test("wonders: loaded from the save where there was nowhere for another mine, a forced wonder still gets its stone by benching", function () {
    var file = path.join(__dirname, "..", "pleasand-20261120-092456-t637685.json");
    if (!require("fs").existsSync(file)) { console.log("      (skipped: the save is not here)"); return; }
    var h = H.open({ seed: 1 });
    h.load(file);
    var g = h.g, w = h.game;
    g.paused = 0; if (g.speed == null) { g.speed = w.SPEED_1; g.speedAcc = 0; }   /* (an older save, from before the speed buttons) */
    check(!sites(g, "mine").length && !sites(g, "tunnel").length, "(the test wants a valley with no mine in it)");
    g.mineNo = {}; for (var x = 0; x < g.gw; x++) g.mineNo[x] = 1e12;   /* (and none sunk now, either) */
    g.peasants.forEach(function (q) { q.stone = 0; });
    cairnDef(w);
    var hs = sites(g, "house")[0], cx = hs.x1 + 3, G = w.mGroundNear(g, cx, false, hs.y1), plan = [];
    for (var k = 0; k < 40; k++) plan.push(w.bE(g, cx + (k % 4), G - 1 - (k >> 2), w.MAT.BRICK, k >> 2));
    var s = w.bNew(g, "cairn", g.peasants[0], plan, [cx, G - 10, cx + 3, G - 1], { wonder: true });
    var r = h.until(function () { return (s.stock && s.stock.stone >= 1) || w.bShare(g, s) > 0; }, { max: 8000 });
    var q = sites(g, "quarry")[0];
    check(!!q && q.of === 0, "no bench in the bare rock (" + (q ? "of " + q.of : "none") + ")");
    check(r.hit, "no stone reached the forced wonder's pile in 8000 ticks (found " + g.found.stone + ")");
    check(g.found.stone > 0, "no stone was cut");
  });

  test("wonders: while a wonder wants iron, new tools wait for iron to spare, and worn ones do not", function () {
    var w = sim.load(1), g = w.g;
    know(g, ["farm", "dig", "mine", "smelt", "forge"]);
    var p = g.peasants[0];
    check(w.mPlanFurnace(g, p), "(the test wants a furnace)");
    sim.build(w, sites(g, "furnace")[0]);
    p.x = sites(g, "furnace")[0].cx; p.iron = 3; p.tools = 0; p.worn = 0; p.task = null;
    check(w.mGoForge(g, p), "(without a wonder, they would forge)");
    p.task = null;
    g.wIronTest = true; g.ironSpare = 30;
    check(!w.mGoForge(g, p), "new tools were forged with a wonder wanting the iron");
    p.worn = 1;
    check(w.mGoForge(g, p), "worn-out tools were not done again");
  });

  test("wonders: the iron kept back for a great work is the village's own: a plain village loaded after one keeps back what it always did", function () {
    var w = sim.load(1), g = w.g, p = g.peasants[0];
    var plain = JSON.parse(JSON.stringify(w.saveDocument(g, { source: "test" })));
    /* a great work wanting iron, and the wonders' look at it */
    cairnDef(w);
    var G = w.mGround(g, Math.floor(p.x) + 8), s = cairn(w, p, Math.floor(p.x) + 8, G, 4, function () { return w.MAT.GIRDER; });
    g.know.cairn = "TEST"; g.tick = 30 * 1000; w.wStep(g);
    check(w.mIronSpare(g) === w.W_IRON_HOLD, "(the test wants iron held back: " + w.mIronSpare(g) + ")");
    w.saveLoad(g, plain);
    check(w.mIronSpare(g) === w.M_IRON_SPARE, "a plain village loaded after a great work keeps back " + w.mIronSpare(g) + " iron, not " + w.M_IRON_SPARE);
    void s;
  });

  test("wonders: a new village (R) has nothing of the old one's great works in the air: a rocket going up is gone, and sets nothing alight", function () {
    var w = sim.load(1), g = w.g, M = w.MAT;
    g.rocket = { x: 120.5, y: 140, vy: -0.2, cells: [{ dx: 0, dy: 0, v: M.METAL, a: 0, sh: 0 }], site: 999, t: 40, fireQ: 0, n: 1 };
    g.moonT = g.tick + 5; g.ironSpare = 30;
    w.sandLandscape(g);
    check(!g.rocket && !g.moonT && !g.ironSpare, "the old village's rocket (or flag, or iron) is still about: " + JSON.stringify([!!g.rocket, g.moonT, g.ironSpare]));
    var fire = function () { var n = 0; for (var j = 0; j < g.m.length; j++) if (g.m[j] === M.FIRE) n++; return n; };
    var f0 = fire();
    sim.step(w, 120);
    check(fire() <= f0, "fire in the new village: " + fire());
  });

  test("wonders: the world cleared (C) has nothing of the great works in the air: a rocket going up is gone, and sets nothing alight", function () {
    var w = sim.load(1), g = w.g, M = w.MAT;
    g.rocket = { x: 120.5, y: 140, vy: -0.2, cells: [{ dx: 0, dy: 0, v: M.METAL, a: 0, sh: 0 }], site: 999, t: 40, fireQ: 0, n: 1 };
    g.moonT = g.tick + 5; g.know.moonrocket = "TEST";
    w.sandClear(g);
    check(!g.rocket && !g.moonT, "the rocket (or its flag) is still about after the world was cleared");
    var fire = 0;
    for (var k = 0; k < 60; k++) { sim.step(w, 1); for (var j = 0; j < g.m.length; j++) if (g.m[j] === M.FIRE) fire++; }
    check(fire === 0, "fire in the cleared world: " + fire);
    check(g.know.moonrocket, "(and what they know is still known)");
  });

  test("wonders: gold is gilding: with none about it is stone, and gilded when gold turns up", function () {
    var w = sim.load(1), g = w.g, p = g.peasants[0], M = w.MAT;
    g.peasants.forEach(function (q) { q.gold = 0; });
    var x = Math.floor(p.x) + 8, G = w.mGround(g, x);
    var s = cairn(w, p, x, G, 8, function (k) { return k === 7 ? M.GOLD : M.BRICK; });
    w.wGild(g, s.plan);
    var cap = s.plan[7];
    check(cap.v === M.BRICK && cap.gild, "the gold went in as " + cap.v);
    sim.build(w, s);
    p.gold = 2;
    w.wRegild(g, s);
    check(cap.v === M.GOLD && s.repair && !s.done, "gold turned up, and the stand-in was not gilded");
    check(w.bFree(g, cap), "the stand-in cannot be taken out for the gold");
  });

  test("wonders: the kiln burns lime and firebrick for a wonder that wants them, and the furnace's worker carries them to it", function () {
    var w = sim.load(1), g = w.g, M = w.MAT;
    know(g, ["farm", "dig", "mine", "smelt", "masonry", "concrete"]);
    var p = g.peasants[0];
    check(w.mPlanFurnace(g, p), "(the test wants a furnace)");
    var f = sim.build(w, sites(g, "furnace")[0]);
    var x = f.x1 + 12, G = w.mGround(g, x);
    var s = cairn(w, p, x, G, 8, function (k) { return k < 3 ? M.FIREBRICK : M.CONCRETE; });
    g.peasants.forEach(function (q) { q.task = null; q.mineCD = 1e9; q.hunger = 0; q.stone = 4; q.coal = 4; });
    sim.step(w, 30);
    check(g.kiln.some(function (o) { return o.r === "firebrick"; }) && g.kiln.some(function (o) { return o.r === "lime"; }), "no orders on the kiln: " + JSON.stringify(g.kiln));
    function fired() { return s.plan.filter(function (e) { return g.m[e.i] === M.FIREBRICK; }).length + ((s.stock && s.stock.firebrick) || 0); }
    function limed() { return ((s.stock && s.stock.lime) || 0) + w.wPocketed(g, "mortar") + s.plan.filter(function (e) { return g.m[e.i] === M.MORTAR || g.m[e.i] === M.CONCRETE; }).length; }
    /* (a while: whoever burns the lime may be up the hill, and the way down from there is not always open to them. it got
       there at 7000 when the kiln took a carrier's whole pocket of stone; at 11000 now that it takes the stone it burns) */
    for (var k = 0; k < 14000 && !(fired() >= 3 && limed() >= 1); k++) sim.step(w, 1);
    check(fired() >= 3, "the firebrick did not reach the wonder: " + fired());
    check(limed() >= 1, "no lime reached the wonder: " + JSON.stringify(s.stock));
  });

  test("wonders: a pane of coloured glass is the colour of what went into it: coal makes amber, whatever the window was drawn as", function () {
    var w = sim.load(1), g = w.g, M = w.MAT;
    know(g, ["farm", "dig", "mine", "smelt", "masonry", "glass", "stained"]);
    var p = g.peasants[0];
    check(w.mPlanFurnace(g, p), "(the test wants a furnace)");
    var f = sim.build(w, sites(g, "furnace")[0]);
    var x = f.x1 + 12, G = w.mGround(g, x);
    var s = cairn(w, p, x, G, 1, function () { return M.STAINED; });
    s.plan[0].a = 1;   /* (drawn green: an ore's worth) */
    g.peasants.forEach(function (q) { q.task = null; q.mineCD = 1e9; q.hunger = 0; q.ore = 0; q.gold = 0; q.coal = 0; q.glass = 0; });
    f.stock = { coal: 6, glass: 2 };
    for (var k = 0; k < 8000 && !(g.m[s.plan[0].i] === M.STAINED); k++) sim.step(w, 1);
    check(g.m[s.plan[0].i] === M.STAINED, "(the test wants the window glazed)");
    check(g.aux[s.plan[0].i] === 2, "a pane fired with coal, no ore, went in as " + ["ruby", "green", "amber"][g.aux[s.plan[0].i] % 3]);
  });

  test("wonders: a coloured window broken and glazed again is the colour of its new pane", function () {
    var w = sim.load(1), g = w.g, M = w.MAT;
    know(g, ["farm", "dig", "mine", "smelt", "masonry", "glass", "stained"]);
    var p = g.peasants[0];
    check(w.mPlanFurnace(g, p), "(the test wants a furnace)");
    var f = sim.build(w, sites(g, "furnace")[0]);
    var x = f.x1 + 12, G = w.mGround(g, x), s = cairn(w, p, x, G, 1, function () { return M.STAINED; }), e = s.plan[0];
    e.a = 1;   /* (drawn green) */
    s.stock = { stained: 1 }; w.bPlace(g, s, e, p);
    check(g.m[e.i] === M.STAINED && g.aux[e.i] === 1, "(the test wants a green pane in)");
    w.sandPlace(g, e.i, M.EMPTY); s.done = false; s.repair = true;   /* (broken) */
    g.peasants.forEach(function (q) { q.task = null; q.mineCD = 1e9; q.hunger = 0; q.ore = 0; q.gold = 0; q.coal = 0; q.glass = 0; q.stained = 0; });
    f.stock = { coal: 6, glass: 2 };
    for (var k = 0; k < 8000 && g.m[e.i] !== M.STAINED; k++) sim.step(w, 1);
    check(g.m[e.i] === M.STAINED, "(the test wants it glazed again)");
    check(g.aux[e.i] === 2, "glazed again with a pane fired with coal, it went in " + ["ruby", "green", "amber"][g.aux[e.i] % 3]);
  });

  test("wonders: of two windows to glaze, the one glazed first is the colour of the one pane fired, wherever the plan has it", function () {
    var w = sim.load(1), g = w.g, M = w.MAT;
    know(g, ["farm", "dig", "mine", "smelt", "masonry", "glass", "stained"]);
    var p = g.peasants[0];
    check(w.mPlanFurnace(g, p), "(the test wants a furnace)");
    var f = sim.build(w, sites(g, "furnace")[0]);
    var x = f.x1 + 12, G = w.mGround(g, x), s = cairn(w, p, x, G, 2, function () { return M.STAINED; });
    s.plan[0].a = 2; s.plan[1].a = 2;   /* (both drawn amber) */
    s.plan[1].ph = 0; s.plan[0].ph = 1;   /* (the second of them glazed first) */
    g.peasants.forEach(function (q) { q.task = null; q.mineCD = 1e9; q.hunger = 0; q.ore = 0; q.gold = 0; q.coal = 0; q.glass = 0; q.stained = 0; });
    f.stock = { ore: 1, coal: 0, glass: 1 };
    var first = null;
    for (var k = 0; k < 8000 && !first; k++) { sim.step(w, 1); first = s.plan.filter(function (e) { return g.m[e.i] === M.STAINED; })[0] || null; }
    check(!!first, "(the test wants a window glazed)");
    check(g.aux[first.i] === 1, "the one pane, fired with ore, went in " + ["ruby", "green", "amber"][g.aux[first.i] % 3]);
  });

  test("wonders: a pane's colour goes with the pane: its carrier dies, and the pane fired in its place goes in its own colour", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, k;
    know(g, ["farm", "dig", "mine", "smelt", "masonry", "glass", "stained"]);
    var p = g.peasants[0];
    check(w.mPlanFurnace(g, p), "(the test wants a furnace)");
    var f = sim.build(w, sites(g, "furnace")[0]);
    var x = f.x1 + 12, G = w.mGround(g, x), s = cairn(w, p, x, G, 1, function () { return M.STAINED; }), e = s.plan[0];
    e.a = 0;   /* (drawn ruby) */
    g.peasants.forEach(function (q) { q.task = null; q.mineCD = 1e9; q.hunger = 0; q.ore = 0; q.gold = 0; q.coal = 0; q.glass = 0; q.stained = 0; });
    f.stock = { ore: 1, coal: 0, glass: 1 };
    var carrier = null;
    for (k = 0; k < 8000 && !carrier; k++) { sim.step(w, 1); carrier = g.peasants.filter(function (q) { return !q.dead && (q.stained || 0) >= 1; })[0] || null; }
    check(!!carrier, "(the test wants a green pane fired)");
    carrier.dead = 1; carrier.stained = 0;   /* (and its carrier gone, pane and all, before it was put in) */
    f.stock = { ore: 0, coal: 3, glass: 1 };
    for (k = 0; k < 12000 && g.m[e.i] !== M.STAINED; k++) sim.step(w, 1);
    check(g.m[e.i] === M.STAINED, "(the test wants the window glazed)");
    check(g.aux[e.i] === 2, "the pane fired with coal went in " + ["ruby", "green", "amber"][g.aux[e.i] % 3]);
  });

  test("wonders: wet concrete is mixed from lime, sand and a bucket of water, poured in its form, and a pail dawdled with goes off, to a lump carried", function () {
    var w = sim.load(1), g = w.g, M = w.MAT;
    know(g, ["farm", "dig", "bucket", "concrete"]);
    var p = g.peasants[0];
    var x = Math.floor(p.x) + 6, G = w.mGround(g, x);
    var s = cairn(w, p, x, G, 4, function () { return M.CONCRETE; });
    s.stock = { lime: 2 };
    g.peasants.forEach(function (q) { if (q !== p) q.x = 10; q.task = null; q.hunger = 0; });
    check(w.wMixWanted(g, s), "(the test wants a site waiting on concrete)");
    check(w.wGoMix(g, p, s), "nobody went to mix concrete (no water near?)");
    for (var k = 0; k < 5000 && !s.plan.some(function (e) { return g.m[e.i] === M.MORTAR; }); k++) sim.step(w, 1);
    check(s.plan.some(function (e) { return g.m[e.i] === M.MORTAR; }), "no wet concrete was poured (mortar " + (p.mortar || 0) + ", task " + (p.task && p.task.kind) + ")");
    var j = s.plan.filter(function (e) { return g.m[e.i] === M.MORTAR; })[0].i;
    check(g.aux[j] & 128, "poured wet concrete is not in its form");
    /* a pail left too long */
    p.mortar = 5; p.mortarT = g.tick - 1000; p.task = null;
    var before = 0, after = 0;
    g.m.forEach(function (c) { if (c === M.CONCRETE) before++; });
    g.tick = Math.ceil(g.tick / 30) * 30;
    w.wStep(g);
    g.m.forEach(function (c) { if (c === M.CONCRETE) after++; });
    check(!p.mortar && p.lump === 5 && after === before, "a pail dawdled with did not go off into a lump they carry (" + before + " -> " + after + ", lump " + p.lump + ")");
  });

  test("wonders: tales are kept: a death, a trip to space, a bolt, the first of an idea, and only the last two dozen", function () {
    var w = sim.load(1), g = w.g, p = g.peasants[0], q = g.peasants[1];
    w.pSpace(g, q);
    w.pZap(g, g.peasants[2]);
    w.pDie(g, p, "lava");
    var kinds = g.tales.map(function (t) { return t.kind; });
    check(kinds.indexOf("space") >= 0 && kinds.indexOf("death") >= 0 && kinds.indexOf("zap") >= 0, "tales: " + kinds.join(","));
    check(/fell in the lava/.test(w.wTold(g.tales.filter(function (t) { return t.kind === "death"; })[0])), "the death is not told right");
    for (var k = 0; k < 40; k++) w.wTale(g, "ice", q);
    check(g.tales.length === w.W_TALES, g.tales.length + " tales kept");
  });
  /* pi's round 28: a plain village (masonry and mines, no great work thought of). the king (or the thinker) drowns at tick
     599. with a gallery standing in water and one tick on (pi's own), or the village as it is and 2400 ticks on. with
     the great works' code in the game, or out of it (as master: no wStep) */
  function fPlainKing(stub, thinker, gallery) {
    var H = require("../harness"), h = H.open({ seed: 1 }), g = h.g, code = function (n) { return h._eval(n); }, M = code("MAT");
    if (stub) h._eval("wStep = function () {}");
    var king = g.peasants[0], heir = g.peasants[1], gal = null;
    g.arriveT = g.ideaT = 1e9;
    if (gallery) {
      code("sandClear")(g);
      g.know = { masonry: "TEST", mine: "TEST" };
      var mine = code("bNew")(g, "mine", null, [], [120, 135, 122, 162], { done: true, mine: true, col: 122, B: 159 });
      var plan = []; for (var k = 0; k < 5; k++) plan.push(code("bE")(g, 124 + k, 158, M.EMPTY, 0));
      gal = code("bNew")(g, "tunnel", null, plan, [124, 150, 128, 159], { done: true, mine: true, of: mine.id, dir: 1, xa: 124, xb: 128, B: 158, S: 148 });
      var place = function (x, y, v) { code("sandPlace")(g, y * g.gw + x, v); };
      for (var x = 123; x <= 129; x++) place(x, 159, M.STONE);
      place(123, 158, M.STONE); place(129, 158, M.STONE);
      for (x = 124; x <= 128; x++) place(x, 158, M.WATER);
      for (x = 60; x < 90; x++) place(x, 150, M.STONE);
      g.peasants.push(king, heir);
      Object.assign(king, { x: 70.5, y: 149, hat: code("P_HATS")[6] });
      Object.assign(heir, { x: 72.5, y: 149, idle: 300 });
    } else { g.know.masonry = "TEST"; g.know.mine = "TEST"; if (!thinker) Object.assign(king, { hat: code("P_HATS")[6] }); }
    if (gallery) g.tick = 599; else h.run(599 - g.tick);   /* (pi's: the clock set, the one tick run) */
    if (thinker) g.thinkerDied = 1;
    code("pDie")(g, king, "drown");
    h.run(gallery ? 1 : 2400);
    return { plain: !g.wAny, flood: gal ? gal.flood || 0 : 0, news: g.feed.map(function (e) { return e.text; }).join("|"), hash: h.hash(), rng: h.rng() };
  }
  test("a plain village where the king (or the thinker) dies: the great works' looks at whether a pyramid could be thought of change nothing, no flood, no news, the same dice", function () {
    [[false, true], [false, false], [true, false]].forEach(function (c) {
      var a = fPlainKing(false, c[0], c[1]), b = fPlainKing(true, c[0], c[1]), what = (c[0] ? "the thinker" : "the king") + (c[1] ? ", a wet gallery: " : ", 2400 ticks: ");
      check(a.plain && b.plain, what + "(the test wants it plain)");
      check(a.flood === 0, what + "the gallery was marked flooded by a look");
      check(a.news === b.news, what + "news differs from a village with no great works: " + a.news.slice(-200));
      check(a.hash === b.hash && JSON.stringify(a.rng) === JSON.stringify(b.rng), what + "the village played out differently with the great works' code in it");
    });
  });

};
