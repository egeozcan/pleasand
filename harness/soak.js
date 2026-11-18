/* =====================================================================
   PLEASAND  --  harness/soak.js

   play a lot of villages for a long time and look for trouble: broken
   invariants, exceptions, hung ticks, builders who never build, people
   who never move. the same shape as the bug hunts that turned up the
   lamp bracket and the dead-end ladder.

     node harness/soak.js                          # seeds 1-4, 20000 ticks
     node harness/soak.js --seeds 1-8 --ticks 60000
     node harness/soak.js --seeds 1-6 --preset rich --jobs 6
     node harness/soak.js --seeds 1-6 --preset chaos --json

   presets: plain (a village left alone), leftovers (snow, ice, salt, ash, glass and powder about, and the ideas for
   them), rich (every idea, iron and
   barrels to build with), chaos (a deterministic scatter of lava, oil,
   powder, acid and ice, then a few ideas).

   a worker that stops, throws or hangs is a finding: the parent says so
   and exits 1. stuck peasants and ducks are reported on the side;
   --fail-on-stuck makes them findings too.
   ===================================================================== */
"use strict";
var fs = require("fs"), cp = require("child_process"), os = require("os");
var lib = require("./harness.js");
var args = require("./args.js");
var createWatcher = require("./stuck.js").createWatcher;

/* -------------------------------------------------------------------
   one village, watched
   ------------------------------------------------------------------- */
function worker(seed, ticks, preset) {
  var h = lib.open({ seed: seed }), stuck = createWatcher(), t0 = Date.now();
  var inv = function (id, expr, every) { h.invariant(id, expr, { every: every || 1 }); };

  h.standardInvariants({ every: 1, temps: 30, grid: 60 });
  inv("people-state", "g.peasants.every(function (p) { return ['walk','fly','held','space'].indexOf(p.state) >= 0; })");
  inv("ducks-state", "g.ducks.every(function (d) { return ['walk','fly','held','swim','thrown'].indexOf(d.state) >= 0; })");
  inv("inventory", "g.peasants.every(function (p) { return (p.logs || 0) > -1e-5 && (p.boards || 0) > -1e-5 && (p.stone || 0) > -1e-5 && (p.iron || 0) > -1e-5 && (p.pack || 0) > -1e-5 && p.breath >= 0 && ['ash','salt','glass','powder','fish','sand'].every(function (r) { return p[r] == null || (Number.isFinite(p[r]) && p[r] > -1e-5 && p[r] <= ({ ash: 12, salt: 12, glass: 12, powder: 4, fish: 3, sand: 6 })[r] + 1e-5); }); })");
  inv("ids", "(function(){var a=g.peasants.map(function(p){return p.id}),d=g.ducks.map(function(q){return q.id}),s=g.sites.map(function(x){return x.id});return new Set(a).size===a.length&&new Set(d).size===d.length&&new Set(s).size===s.length;})()", 30);
  inv("held", "(g.held === null || (g.peasants.indexOf(g.held) >= 0 && g.held.state === 'held')) && (g.heldDuck === null || g.ducks.indexOf(g.heldDuck) >= 0)");
  inv("sites", "g.sites.every(function (s) { return s.plan && s.plan.length > 0 && s.plan.every(function (e) { return e.i >= 0 && e.i < g.m.length; }) && (!s.stock || Object.keys(s.stock).every(function (k) { return s.stock[k] > -1e-5 && Number.isFinite(s.stock[k]); })); })", 30);
  inv("tasks", "g.peasants.every(function (p) { return !p.task || p.task.site == null || g.sites.some(function (s) { return s.id === p.task.site; }) || p.task.kind === 'sow' || p.task.kind === 'till' || p.task.kind === 'water' || p.task.kind === 'fish' || p.task.kind === 'shoo'; })", 30);
  inv("feed", "g.feed.length <= 6 && g.banners.length <= 4 && g.ghosts.length < 400 && g.np >= 0 && g.np <= PMAX", 30);
  inv("ideas", "Object.keys(g.know).every(function (k) { return typeof g.know[k] === 'string' && IDEAS.some(function (I) { return I.id === k; }); })", 120);
  inv("resources", "g.rip >= 0 && (g.iron || 0) >= 0 && (g.barrels || 0) >= 0");

  if (preset === "rich") {
    h.give(["farm", "lamp", "bucket", "dig", "grave", "fish", "scarecrow", "festival", "mine",
            "masonry", "smelt", "lift", "bell", "oil", "rocket"]);
    h.g.iron = 40; h.g.barrels = 40;
  } else if (preset === "chaos") {
    var s = 12345;
    function rnd() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }
    var paints = ["LAVA", "WATER", "FIRE", "GUNPOWDER", "WOOD", "ACID", "ICE", "GAS", "OIL", "SAND"];
    for (var k = 0; k < 12; k++) {
      var x = 10 + Math.floor(rnd() * (h.g.gw - 20)), y = 10 + Math.floor(rnd() * (h.g.gh - 20));
      h.paintDisc(x, y, 2 + Math.floor(rnd() * 4), paints[Math.floor(rnd() * paints.length)]);
    }
    h.give(["bucket", "farm", "mine", "dig", "masonry", "festival"]);
  } else if (preset === "leftovers") {
    /* what is left over (leftovers.js): snow and ice about the village, salt, ash, a lump of glass, a pinch of powder,
       and the ideas that make something of them */
    h.give(["farm", "bucket", "dig", "fish", "festival", "mine", "masonry", "smelt", "forge", "potash", "salt", "powder", "glass"]);
    h.g.iron = 20;
    h.eval("g.peasants.forEach(function (p, i) { p.iron = 3; p.coal = 2; p.salt = 2; p.ash = 3; if (i < 2) p.powder = 1; })");
    var cx = Math.floor(h.eval("g.peasants[0].x"));
    var coat = function (x0, x1, v, n) { for (var x = Math.max(4, x0); x <= Math.min(h.g.gw - 5, x1); x++) { var G = h.eval("mGround(g, " + x + ")"); for (var q = 1; q <= n && G > 2; q++) if (h.eval("AIRY[g.m[" + ((G - q) * h.g.gw + x) + "]]")) h.place(x, G - q, v); } };
    coat(cx - 45, cx + 45, "SNOW", 2);
    coat(cx + 50, cx + 70, "SALT", 1);
    coat(cx - 70, cx - 50, "ASH", 1);
    coat(cx + 75, cx + 77, "GUNPOWDER", 1);
    coat(cx - 80, cx - 78, "GLASS", 1);
    for (var ix = cx - 110; ix <= cx - 85; ix++) if (ix > 4) { var IG = h.eval("mGround(g, " + ix + ")"); if (IG > 2) h.place(ix, IG, "ICE"); }
  }

  /* Sample often enough to see shuffles and work strokes, rather than
     aliasing them into apparent progress (or an idle productive worker). */
  var chunk = 30, chunks = [], stop = null, threw = null;
  stuck.sample(h);
  try {
    for (var done = 0; done < ticks && !stop; done += chunk) {
      var c0 = Date.now();
      var r = h.step(Math.min(chunk, ticks - done));
      chunks.push((Date.now() - c0) / Math.min(chunk, ticks - done));
      if (r.stopped) {
        stop = { kind: r.stopped.kind, id: r.stopped.id, tick: r.stopped.tick, expr: r.stopped.expr, error: r.stopped.error };
        break;
      }
      stuck.sample(h);
    }
  } catch (e) {
    threw = { message: String(e && e.message || e), tick: h.ticks, crash: h.crashReport() };
  }
  var st = h.state({ hash: true });
  var out = {
    seed: seed, preset: preset, ticks: h.ticks, ms: Date.now() - t0,
    msPerTick: +((Date.now() - t0) / Math.max(1, h.ticks)).toFixed(2),
    slowestChunk: +Math.max.apply(null, chunks.length ? chunks : [0]).toFixed(2),
    stop: stop, threw: threw,
    state: { counts: st.counts, sitesDone: st.counts.sitesDone, ideas: st.ideas.length, rip: st.resources.rip, hash: st.hash },
    events: h.events().reduce(function (o, e) { o[e.kind] = (o[e.kind] || 0) + 1; return o; }, {}),
    deaths: h.events({ kind: "death" }).map(function (e) { return e.tick + ":" + (e.name || "") + ":" + e.cause; }),
    stuck: stuck.report(),
    context: stop && stop.tick ? h.events({ since: Math.max(0, stop.tick - 200), limit: 6 }) : null
  };
  return out;
}

/* -------------------------------------------------------------------
   the parent: seeds, jobs, a timeout for hangs
   ------------------------------------------------------------------- */
function parseSeeds(s) {
  var out = [];
  String(s || "1-4").split(",").forEach(function (part) {
    var m = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(part);
    if (m) { for (var i = Number(m[1]); i <= Number(m[2]); i++) out.push(i); }
    else if (String(part).trim()) out.push(Number(part));
  });
  return out.filter(function (n) { return isFinite(n) && n > 0; });
}

function main() {
  var opts = args.parseArgs(process.argv.slice(2));
  if (opts.worker) {
    var w = String(opts.worker).split(",");
    var res = worker(Number(w[0]), Number(w[1]), w[2]);
    process.stdout.write(JSON.stringify(res) + "\n");
    process.exit(0);
  }
  var seeds = parseSeeds(opts.seeds), ticks = args.num(opts.ticks, 20000), preset = opts.preset || "plain";
  var jobs = Math.max(1, args.num(opts.jobs, Math.min(4, os.cpus().length)));
  var timeout = args.num(opts.timeout, 300) * 1000;
  var results = [], running = [], i = 0;
  function isBad(r) { return !!(r.stop || r.threw || r.timeout || (opts["fail-on-stuck"] && r.stuck && r.stuck.length)); }

  function launch() {
    var startedAny = false;
    while (running.length < jobs && i < seeds.length) {
      startedAny = true;
      (function (seed) {
        var child = cp.fork(__filename, ["--worker", seed + "," + ticks + "," + preset], { stdio: ["ignore", "pipe", "pipe", "ipc"] });
        var buf = "", err = "", started = Date.now(), killed = false;
        running.push(child);
        var timer = setTimeout(function () {
          killed = true; child.kill("SIGKILL");
          results.push({ seed: seed, preset: preset, timeout: true, ms: Date.now() - started });
        }, timeout);
        child.stdout.on("data", function (d) { buf += d; });
        child.stderr.on("data", function (d) { err += d; });
        child.on("close", function (code, signal) {
          clearTimeout(timer);
          var at = running.indexOf(child);
          if (at >= 0) running.splice(at, 1);
          if (!killed) {
            var line = buf.trim().split("\n").pop(), res;
            try { res = JSON.parse(line); }
            catch (e) { res = { seed: seed, preset: preset, threw: { message: "worker produced no result (" + (err || signal || code) + ")" } }; }
            results.push(res);
          }
          if (i < seeds.length) launch();
          else if (!running.length) done();
        });
      })(seeds[i++]);
    }
    if (!startedAny && !running.length && i >= seeds.length) done();
  }

  var finished = false;
  function done() {
    if (finished) return;
    finished = true;
    results.sort(function (a, b) { return a.seed - b.seed; });
    if (opts.out) fs.writeFileSync(String(opts.out), results.map(function (r) { return JSON.stringify(r); }).join("\n") + "\n");
    if (opts.json) {
      results.forEach(function (r) { process.stdout.write(JSON.stringify(r) + "\n"); });
    } else {
      console.log("PLEASAND soak · " + preset + " · " + ticks + " ticks · seeds " + seeds.join(","));
      results.forEach(function (r) {
        var bad = isBad(r);
        var tag = r.timeout ? "HANG" : (r.threw ? "THREW" : (r.stop ? "STOP " + r.stop.kind + " " + (r.stop.id || "") :
          (r.stuck && r.stuck.length ? "STUCK" : "ok")));
        console.log((bad ? "!! " : "   ") + String(r.seed).padStart(3) + "  " + tag.padEnd(18) +
          (r.msPerTick != null ? r.msPerTick.toFixed(2) + "ms/t" : "") +
          (r.state ? "  " + r.state.counts.alive + " alive, " + r.state.counts.sitesDone + "/" + r.state.counts.sites + " sites, " + r.state.ideas + " ideas, " + r.state.rip + " dead" : "") +
          (r.stuck && r.stuck.length ? "  stuck: " + r.stuck.map(function (s) { return s.name + " " + s.task + (s.site ? " " + s.site : "") + " @" + s.x + "," + s.y; }).join("; ") : ""));
        if (r.stop && r.stop.expr) console.log("        " + r.stop.expr + (r.stop.error ? "  (" + r.stop.error + ")" : ""));
        if (r.threw) console.log("        " + r.threw.message);
        if (r.deaths && r.deaths.length) console.log("        deaths: " + r.deaths.slice(-5).join(" "));
      });
      var bad = results.filter(isBad), warned = results.filter(function (r) { return r.stuck && r.stuck.length; });
      console.log((bad.length ? bad.length + " of " + results.length + " seeds found trouble" :
        (warned.length ? warned.length + " seeds with stuck-unit warnings (use --fail-on-stuck)" : "all " + results.length + " seeds clean")) +
        " in " + (results.reduce(function (n, r) { return n + (r.ms || 0); }, 0) / 1000).toFixed(0) + "s of cpu");
    }
    var bad2 = results.filter(isBad);
    process.exit(bad2.length ? 1 : 0);
  }

  launch();
}


main();
