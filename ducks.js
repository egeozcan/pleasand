/* =====================================================================
   PLEASAND  --  ducks.js

   ducks. like the peasants, they are not on the grid: each is a little
   bag of numbers that reads the cells around it. a duck waddles, heads
   for water, floats on it and paddles about, dabbles for snacks, eats any
   seeds lying around, and every so often takes off, flaps across the sky
   and comes down somewhere, preferably wet. some come with ducklings,
   which follow their mother in a line, and cannot fly yet, and grow up.

   they do not like fire, lava, acid, drains, lightning or being thrown
   very hard, and fly off from anything hot, loud or flying at them. a
   duck's feet are at (x, y); its body is the few cells above.
   ===================================================================== */
"use strict";

var D_MAX = 60, D_GROW = 3600;   /* how many ducks the world holds, and how long a duckling takes to grow up */
var D_FLAP = 0.25;               /* how fast a duck comes down when it is gliding in to land */

var D_SAY = { quack: ["quack", "quack!", "quack quack", "QUACK", "*quack*"], peep: ["peep", "peep peep", "pip", "peep!"],
              squeak: ["squeak", "squeak!", "*squeak*"] };
var D_DEATH = {
  fire: ["a duck was roasted", "roast duck, anyone?", "a duck got far too toasty"],
  lava: ["a duck went for a swim in lava", "a duck tried the hot pond"],
  acid: ["a duck went for a swim in acid", "a duck fizzed away"],
  drain: ["a duck went down the drain", "a duck was flushed"],
  splat: ["a duck hit something at speed", "a duck was thrown too hard"],
  zap: ["a duck was struck by lightning. crispy", "a duck conducted electricity. once"],
  nuke: ["a duck was vaporised", "a duck saw a bright light"],
  buried: ["a duck was buried", "a duck is part of the scenery now"],
  freeze: ["a duck froze into the pond"]
};
/* what peasants say about ducks, and what the village thinks of them */
P_SAY.duck = ["a duck!", "hello duck", "quack", "here ducky ducky", "look, a duck", "i love ducks", "nice duck", "duck!"];
P_SAY.ducklings = ["ducklings!", "make way for ducklings", "aww", "look at the little ones", "so many ducks"];
P_SAY.rubber = ["is that duck... rubber?", "squeak", "a rubber duck!", "that duck is not real"];
P_ACHIEVE.duck = ["DUCKS", "the pond is complete"];
P_ACHIEVE.ducklings = ["MAKE WAY FOR DUCKLINGS", "a duck has brought the whole family"];
P_ACHIEVE.rubber = ["RUBBER DUCK", "it floats. it squeaks. it is not a real duck"];
P_ACHIEVE.duckspace = ["DUCK IN SPACE", "quack, houston"];

/* -------------------------------------------------------------------
   KINDS AND SPRITES. letters are palette slots: h head, e eye, B beak,
   t tail, b body, W wing, f feet. drawn facing right; mirrored for left.
   the bottom row of a sprite is the duck's feet row.
   ------------------------------------------------------------------- */
var D_KEY = { h: 0, e: 1, B: 2, t: 3, b: 4, W: 5, f: 6 };
function dParse(rows) {
  var out = [], n = rows.length;
  for (var r = 0; r < n; r++) for (var c = 0; c < rows[r].length; c++) {
    var ch = rows[r][c];
    if (ch !== ".") out.push(c, r - (n - 1), D_KEY[ch]);
  }
  return new Int8Array(out);
}
var D_SPR = {
  walkA: dParse(["...hh.", "...heB", "tbbbb.", ".bWbb.", "..f.f."]),
  walkB: dParse(["...hh.", "...heB", "tbbbb.", ".bWbb.", "...f.."]),
  swim:  dParse(["...hh.", "...heB", "tbbbb.", ".bbbb."]),
  dab:   dParse(["t.....", "bb....", ".bbbb.", "..bbhh"]),
  flyA:  dParse(["..W....", "..WW...", "tbbbheB", ".bbbb.."]),
  flyB:  dParse(["tbbbheB", ".bWWb..", "..WW..."]),
  babyA: dParse(["..hB", "bbb.", ".f.f"]),
  babyB: dParse(["..hB", "bbb.", "..f."]),
  babySwim: dParse(["..hB", "bbb."])
};
var D_KINDS = [
  { name: "MALLARD", w: 35, cols: ["#2f7a3a", "#101010", "#e8c040", "#f0f0f0", "#8a6a4a", "#5a5a6e", "#f08a20"],
    baby: ["#d8b850", "#101010", "#e8a030", "#b89a48", "#b89a48", "#b89a48", "#e88a20"] },
  { name: "DUCK", w: 35, cols: ["#7a5a3a", "#101010", "#d08a30", "#6a4a2a", "#8a6a44", "#6a5038", "#f08a20"],
    baby: ["#d8b850", "#101010", "#e8a030", "#b89a48", "#b89a48", "#b89a48", "#e88a20"] },
  { name: "WHITE DUCK", w: 25, cols: ["#f4f4ec", "#101010", "#f0a020", "#f4f4ec", "#e8e8e0", "#d4d4cc", "#f0a020"],
    baby: ["#ffe070", "#101010", "#f0a020", "#ffd84a", "#ffd84a", "#ffd84a", "#f0a020"] },
  { name: "RUBBER DUCK", w: 4, rubber: true, cols: ["#ffd030", "#101010", "#f07a20", "#ffd030", "#ffd030", "#f0c020", "#ffd030"],
    baby: ["#ffd030", "#101010", "#f07a20", "#ffd030", "#ffd030", "#ffd030", "#ffd030"] }
];
D_KINDS.forEach(function (k) { k.pal = pPal(k.cols.concat(["#000000", "#000000", "#000000"])); k.bpal = pPal(k.baby.concat(["#000000", "#000000", "#000000"])); });
var D_FEATHER = [hex32("#f4f4ec"), hex32("#c8b090"), hex32("#8a6a4a")];
var D_THERM = new Uint32Array(10);

/* -------------------------------------------------------------------
   MAKING, FINDING, LOSING DUCKS
   ------------------------------------------------------------------- */
function duckSpawn(g, x, y, kind, baby, quiet) {
  if (g.ducks.length >= D_MAX) { if (!quiet) feed(g, "that is enough ducks", "#ffd94a"); return null; }
  kind = kind || pWeighted(D_KINDS);
  var d = { id: ++g.did, kind: kind, x: x, y: y, vx: 0, vy: 0, dir: Math.random() < 0.5 ? -1 : 1, state: "walk",
            t: baby ? 0 : D_GROW, baby: !!baby, lead: null, idle: 0, dab: 0, fire: 0, stuck: 0, flyT: 0, alt: 0, goal: -1,
            quackT: 120 + irnd(600), say: "", sayT: 0, anim: irnd(100), dead: 0, look: irnd(60), seed: null };
  g.ducks.push(d);
  if (!quiet) { achieve(g, "duck"); if (kind.rubber) achieve(g, "rubber"); }
  return d;
}
/* a mother and a line of ducklings behind her, each following the one in front */
function duckFamily(g, x, y) {
  var kind = Math.random() < 0.5 ? D_KINDS[1] : D_KINDS[2], mom = duckSpawn(g, x, y, kind), prev = mom, n = 3 + irnd(3);
  if (!mom) return null;
  for (var k = 0; k < n; k++) {
    var b = duckSpawn(g, x - mom.dir * (k + 1) * 4, y, kind, true, true);
    if (!b) break;
    b.dir = mom.dir; b.lead = prev; prev = b;
  }
  achieve(g, "ducklings");
  return mom;
}
function duckAt(g, x, y, pad) {
  pad = pad || 0;
  var best = null, bd = 1e9;
  for (var k = 0; k < g.ducks.length; k++) {
    var d = g.ducks[k];
    if (d.dead) continue;
    var dx = Math.abs(x - (d.x + 0.5)), dy = y - (d.y - 1.5);
    if (dx < 3 + pad && Math.abs(dy) < 3 + pad) { var q = dx * dx + dy * dy; if (q < bd) { bd = q; best = d; } }
  }
  return best;
}
function dSay(g, d, kind, force) {
  if (d.dead || (!force && d.sayT > 0)) return;
  if (kind === "quack" && d.kind.rubber) kind = "squeak";
  if (kind === "quack" && d.baby) kind = "peep";
  d.say = pick(D_SAY[kind] || [kind]); d.sayT = 50 + d.say.length * 4;
  if (kind === "squeak") g.fx.squeak++; else if (kind === "peep") g.fx.peep++; else g.fx.quack++;
}
function dFeathers(g, d, n) {
  for (var k = 0; k < n; k++) partAdd(g, PK_GLINT, d.x + 0.5, d.y - 2, (Math.random() - 0.5) * 1.2, -0.3 - Math.random() * 0.6, 30 + irnd(40), pick(D_FEATHER));
}
function dDie(g, d, cause) {
  if (d.dead) return;
  d.dead = 1;
  feed(g, pick(D_DEATH[cause] || D_DEATH.splat), "#ffb0a0");
  dFeathers(g, d, cause === "nuke" ? 0 : 8);
  if (cause === "fire" || cause === "zap") {
    var j = Math.floor(d.y) * g.gw + Math.floor(d.x);
    if (d.x >= 0 && d.x < g.gw && d.y >= 0 && d.y < g.gh && g.m[j] === MAT.EMPTY) sandPlace(g, j, MAT.ASH);
  }
  g.fx.die++;
}

/* -------------------------------------------------------------------
   THE WORLD, AS A DUCK SEES IT
   ------------------------------------------------------------------- */
/* a duck cannot open a door or climb a ladder: to a duck, everything solid is solid */
function dSolid(g, x, y) { return SOLID[pCell(g, x, y)] === 1; }
function dBlocked(g, x, y) { var fx = Math.floor(x), fy = Math.floor(y); return dSolid(g, fx, fy) || dSolid(g, fx, fy - 2); }
function dGround(g, x, y) { return dSolid(g, Math.floor(x), Math.floor(y) + 1); }
/* is it unpleasant to be at (x, y): hot, fire, acid, a drain */
function dNasty(g, x, y) {
  var c = pCell(g, x, y);
  return HOT[c] || c === MAT.ACID || c === MAT.DRAIN || pHotAt(g, x, y);
}

/* -------------------------------------------------------------------
   THINGS THAT HAPPEN TO DUCKS
   ------------------------------------------------------------------- */
/* take off and fly somewhere: water if there is any within reach, else wherever */
function dTakeOff(g, d, scared) {
  if (d.baby) { d.idle = 0; d.dir = -d.dir; return; }   /* too small to fly: run the other way */
  d.state = "fly"; d.flyT = scared ? 120 + irnd(120) : 200 + irnd(300); d.vy = -0.6; d.idle = 0; d.dab = 0;
  d.alt = clamp(Math.floor(d.y) - 18 - irnd(30), 8, g.gh - 30);
  d.goal = -1;
  for (var k = 0; k < 40; k++) {
    var x = irnd(g.gw), y;
    for (y = 4; y < g.gh && AIRY[g.m[y * g.gw + x]]; y++);
    if (y < g.gh && WET[g.m[y * g.gw + x]]) { d.goal = x; break; }
  }
  if (d.goal >= 0) d.dir = d.goal > d.x ? 1 : -1;
  if (scared) dSay(g, d, "quack", true);
}
/* something going bang, or flying at them */
function ducksScare(g, x, y, r) {
  for (var k = 0; k < g.ducks.length; k++) {
    var d = g.ducks[k];
    if (d.dead || d.state === "held" || d.state === "thrown" || d.state === "fly") continue;
    if ((d.x - x) * (d.x - x) + (d.y - y) * (d.y - y) < r * r) { d.dir = d.x < x ? -1 : 1; dTakeOff(g, d, true); }
  }
}
function ducksBlast(g, cx, cy, R, P) {
  var big = R >= 12, reach = R * 2.4;
  for (var k = 0; k < g.ducks.length; k++) {
    var d = g.ducks[k];
    if (d.dead || d.state === "held") continue;
    var dx = d.x - cx, dy = (d.y - 2) - cy, dd = Math.sqrt(dx * dx + dy * dy) || 0.5;
    if (big && dd < R * 0.6) { dDie(g, d, "nuke"); continue; }
    if (dd < reach) {
      var f = P * (1 - dd / reach) * 1.3 + 0.3;
      d.state = "thrown"; d.flyT = 0;
      d.vx = clamp(d.vx + dx / dd * f, -4.5, 4.5); d.vy = clamp(d.vy + dy / dd * f - f * 0.7, -4.5, 4.5);
      if (dd < R * 1.3 && Math.random() < 0.4) d.fire = 1;
      dFeathers(g, d, 4); dSay(g, d, "quack", true);
    } else if (dd < (big ? 400 : R * 10)) ducksScare(g, d.x, d.y, 1);
  }
}
function ducksZapNear(g, x, y, r) {
  for (var k = 0; k < g.ducks.length; k++) {
    var d = g.ducks[k];
    if (!d.dead && (d.x - x) * (d.x - x) + (d.y - 2 - y) * (d.y - 2 - y) < (r + 3) * (r + 3)) dDie(g, d, "zap");
  }
}
/* swimming in water that lightning has just gone through */
function ducksZapMarked(g) {
  for (var k = 0; k < g.ducks.length; k++) {
    var d = g.ducks[k], fx = Math.floor(d.x), fy = Math.floor(d.y);
    if (d.dead || fx < 0 || fx >= g.gw || fy < 0 || fy >= g.gh) continue;
    if (g.zmark[fy * g.gw + fx] || (fy + 1 < g.gh && g.zmark[(fy + 1) * g.gw + fx])) dDie(g, d, "zap");
  }
}
function duckGrab(g, d) {
  d.state = "held"; g.heldDuck = d;
  dSay(g, d, "quack", true);
}
function dHeld(g, d) {
  d.x = clamp((g.mx - PANEL) / CELL - 0.5, 1, g.gw - 2);
  d.y = clamp((g.my - PLAY_Y) / CELL + 2, 4, g.gh - 1);
  d.vx = g.cvx; d.vy = g.cvy; d.anim++;
  if (d.sayT <= 0 && Math.random() < 0.02) dSay(g, d, "quack");
}
function duckThrow(g, d) {
  g.heldDuck = null;
  if (d.dead) return;
  dHeld(g, d);
  var v = cursorVel(g);
  d.state = "thrown"; d.flyT = 0;
  d.vx = clamp(v[0], -4.5, 4.5); d.vy = clamp(v[1], -4.5, 4.5);
  if (Math.abs(d.vx) + Math.abs(d.vy) > 1.5) { dSay(g, d, "quack", true); g.fx.whee++; }
}

/* -------------------------------------------------------------------
   THE DUCK, ONE TICK AT A TIME
   ------------------------------------------------------------------- */
function ducksStep(g) {
  var D = g.ducks, k, d;
  for (k = 0; k < D.length; k++) if (!D[k].dead) dStep(g, D[k]);
  /* a peasant flying at a duck knocks it flapping */
  for (k = 0; k < D.length; k++) {
    d = D[k];
    if (d.dead || d.state === "held") continue;
    for (var j = 0; j < g.peasants.length; j++) {
      var p = g.peasants[j];
      if (p.dead || p.state !== "fly" || p.vx * p.vx + p.vy * p.vy < 1.5) continue;
      if (Math.abs(p.x - d.x) < 3 && Math.abs((p.y - 4) - (d.y - 2)) < 6) {
        d.state = "thrown"; d.flyT = 0; d.vx = p.vx * 0.8; d.vy = Math.min(p.vy, 0) - 1;
        dFeathers(g, d, 5); dSay(g, d, "quack", true); g.fx.thud++;
      }
    }
  }
  /* peasants have opinions about ducks */
  if ((g.tick & 31) === 0 && D.length) {
    d = D[irnd(D.length)];
    var q = d.dead ? null : pOther(g, { x: d.x, y: d.y }, 16);
    if (q && q.state === "walk" && !q.fire && q.sayT <= 0 && Math.random() < 0.25)
      pSay(g, q, d.kind.rubber ? "rubber" : (d.baby ? "ducklings" : "duck"));
  }
  for (k = D.length - 1; k >= 0; k--) if (D[k].dead) { if (g.heldDuck === D[k]) g.heldDuck = null; D.splice(k, 1); }
}

function dStep(g, d) {
  d.anim++;
  if (d.sayT > 0) d.sayT--;
  if (d.state === "held") { dHeld(g, d); return; }
  if (d.baby && ++d.t >= D_GROW) { d.baby = false; d.lead = null; dSay(g, d, "quack", true); }
  /* the one in front is gone: follow whoever it was following */
  while (d.lead && d.lead.dead) d.lead = d.lead.lead;
  var fx = Math.floor(d.x), fy = Math.floor(d.y);
  var cf = pCell(g, fx, fy), cb = pCell(g, fx, fy - 1), ch = pCell(g, fx, fy - 2), cu = pCell(g, fx, fy + 1);

  /* the dangers of the world */
  if (cf === MAT.DRAIN || cu === MAT.DRAIN) { dDie(g, d, "drain"); return; }
  if (cf === MAT.LAVA || cb === MAT.LAVA) { dDie(g, d, "lava"); return; }
  if (cf === MAT.ACID || cb === MAT.ACID) { dDie(g, d, "acid"); return; }
  var tb = fx >= 0 && fx < g.gw && fy - 1 >= 0 && fy - 1 < g.gh ? g.T[(fy - 1) * g.gw + fx] : AMBIENT;
  if (HOT[cb] || HOT[ch] || HOT[cf] || tb > P_IGNITE) { if (!d.fire) { d.fire = 1; dSay(g, d, "quack", true); } }
  if (d.fire) {
    if (WET[cf] || WET[cb]) { d.fire = 0; g.fx.hiss++; }
    else {
      if (++d.fire > 150) { dDie(g, d, "fire"); return; }
      if (Math.random() < 0.3) partAdd(g, PK_SPARK, d.x + Math.random() * 3 - 1, d.y - 2 - Math.random() * 2, (Math.random() - 0.5) * 0.3, -0.5, 6 + irnd(8), pick(SPARK_HOT));
      if (d.state === "walk" || d.state === "swim") dTakeOff(g, d, true);
    }
  } else if (tb > P_SCALD && (d.state === "walk" || d.state === "swim")) dTakeOff(g, d, true);

  /* inside something: climb out of the top, if there is a top */
  if (SOLID[cb] && d.state !== "thrown") {
    var above = pCell(g, fx, fy - 3);
    if (!SOLID[above]) d.y = fy - 1;
    else if (!P_HARD[above] && (d.anim % 3) === 0) d.y = fy - 1;
    else if (++d.stuck > 300) { dDie(g, d, cb === MAT.ICE || above === MAT.ICE ? "freeze" : "buried"); return; }
    return;
  }
  d.stuck = 0;
  if (d.quackT > 0) d.quackT--;
  else { d.quackT = 300 + irnd(900); if (d.state !== "thrown") dSay(g, d, "quack"); }

  if (d.state === "thrown") dThrown(g, d);
  else if (d.state === "fly") dFly(g, d);
  else if (LIQUID[cf] || (LIQUID[cu] && !dGround(g, d.x, d.y))) dSwim(g, d);
  else dWalk(g, d);
}

/* a step sideways: up a step or two, down a step or two, turn at walls (or, now and then, fly over them) */
function dStepX(g, d, sp) {
  var nx = d.x + d.dir * sp, nfx = Math.floor(nx), fx = Math.floor(d.x), fy = Math.floor(d.y), k;
  if (nx < 1 || nx > g.gw - 2) { d.dir = -d.dir; return false; }
  if (nfx !== fx) {
    for (k = 0; k <= 2; k++) if (!dBlocked(g, nfx, fy - k)) break;
    if (k > 2) { if (!d.baby && Math.random() < 0.3) dTakeOff(g, d); else d.dir = -d.dir; return false; }
    fy -= k;
    if (!dGround(g, nfx, fy) && !LIQUID[pCell(g, nfx, fy)]) for (k = 1; k <= 2; k++) if (dGround(g, nfx, fy + k) && !dBlocked(g, nfx, fy + k)) { fy += k; break; }
    d.y = fy;
  }
  d.x = nx;
  return true;
}
/* which way to go: after mother, after seeds, towards water, or wherever */
function dHeading(g, d) {
  if (d.lead) {
    var dx = d.lead.x - d.x;
    if (Math.abs(dx) > 3.5) { d.dir = dx < 0 ? -1 : 1; return d.baby ? 0.13 : 0.11; }
    return 0;
  }
  if (--d.look <= 0) {
    d.look = 60 + irnd(60);
    var fx = Math.floor(d.x), fy = Math.floor(d.y), best = 999, x, y;
    /* seeds lying about. ducks love seeds */
    d.seed = null;
    for (x = fx - 40; x <= fx + 40; x++) for (y = fy - 3; y <= fy + 1; y++) if (pCell(g, x, y) === MAT.SEED && Math.abs(x - fx) < Math.abs(best)) { best = x - fx; d.seed = { x: x, y: y }; }
    if (!d.seed && d.state === "walk" && Math.random() < 0.6) {
      /* water nearby: go and get in it */
      for (x = 1; x <= 50 && best === 999; x++) {
        if (WET[pCell(g, fx + x, fy + 1)] || WET[pCell(g, fx + x, fy + 2)]) best = x;
        else if (WET[pCell(g, fx - x, fy + 1)] || WET[pCell(g, fx - x, fy + 2)]) best = -x;
      }
      if (best !== 999) d.dir = best < 0 ? -1 : 1;
    }
  }
  if (d.seed) {
    if (pCell(g, d.seed.x, d.seed.y) !== MAT.SEED) d.seed = null;
    else d.dir = d.seed.x + 0.5 < d.x ? -1 : 1;
  }
  return 0.1;
}
/* any seed within reach of the beak gets eaten */
function dPeck(g, d) {
  var fx = Math.floor(d.x), fy = Math.floor(d.y), x, y;
  for (x = fx - 1; x <= fx + 2; x++) for (y = fy - 1; y <= fy + 1; y++) {
    if (pCell(g, x, y) === MAT.SEED && Math.random() < 0.08) {
      g.m[y * g.gw + x] = MAT.EMPTY; d.idle = 20;
      if (Math.random() < 0.4) dSay(g, d, "quack");
      return;
    }
  }
}
function dWalk(g, d) {
  var fx = Math.floor(d.x), fy = Math.floor(d.y);
  d.dab = 0; d.state = "walk";
  if (!dGround(g, d.x, d.y)) {
    /* off an edge: a duck does not fall far before it starts flapping. a duckling just tumbles, being light */
    d.vy = Math.min(d.vy + P_GRAV, d.baby ? 1.2 : 2);
    if (d.vy > 0.7 && !d.baby) { d.state = "fly"; d.flyT = 0; return; }
    var target = d.y + d.vy, cy = fy;
    while (cy < Math.floor(target) && !dGround(g, d.x, cy) && !LIQUID[pCell(g, fx, cy + 1)]) cy++;
    if ((dGround(g, d.x, cy) || LIQUID[pCell(g, fx, cy + 1)]) && cy <= target) { d.y = cy; d.vy = 0; } else d.y = target;
    return;
  }
  d.vy = 0;
  dPeck(g, d);
  if (d.idle > 0) { d.idle--; return; }
  var sp = dHeading(g, d);
  /* hot or acid or a drain ahead: the other way */
  var ax = fx + d.dir * 3;
  if (dNasty(g, ax, fy) || dNasty(g, ax, fy + 1) || dNasty(g, ax, fy - 2)) { d.dir = -d.dir; d.seed = null; }
  if (sp > 0) dStepX(g, d, sp);
  if (!d.lead && !d.seed) {
    if (Math.random() < 0.004) d.idle = 30 + irnd(120);
    else if (Math.random() < 0.002) d.dir = -d.dir;
    else if (Math.random() < 0.0008 && !d.baby) dTakeOff(g, d);
  }
}
function dSwim(g, d) {
  var fx = Math.floor(d.x), fy = Math.floor(d.y), depth = 0;
  if (d.state !== "swim") { d.state = "swim"; d.vy = 0; }
  /* float: feet in the water, the rest of the duck above it */
  while (depth < 5 && LIQUID[pCell(g, fx, fy - depth)]) depth++;
  if (depth > 1) { if (!dSolid(g, fx, fy - 3)) d.y -= 0.2; else if (++d.stuck > 400) { dDie(g, d, "freeze"); return; } }
  else if (depth === 0) {
    if (dGround(g, d.x, d.y)) { d.state = "walk"; return; }
    if (LIQUID[pCell(g, fx, fy + 1)]) d.y = Math.min(fy + 0.99, d.y + 0.25);
    else { d.state = "walk"; return; }
  } else d.y = fy + 0.5 + Math.sin(d.anim * 0.1) * 0.15;   /* a little bob */
  /* dabbling: tail up, head under, for a moment */
  if (d.dab > 0) { d.dab--; return; }
  if (!d.baby && Math.random() < 0.003) { d.dab = 40 + irnd(40); return; }
  dPeck(g, d);
  var sp = dHeading(g, d);
  if (sp > 0 || (!d.lead && Math.random() < 0.6)) dStepX(g, d, sp > 0 ? sp * 0.8 : 0.06);
  if (!d.lead && Math.random() < 0.003) d.dir = -d.dir;
  if (!d.baby && !d.lead && Math.random() < 0.0004) dTakeOff(g, d);
  /* came ashore */
  fx = Math.floor(d.x); fy = Math.floor(d.y);
  if (!LIQUID[pCell(g, fx, fy)] && dGround(g, d.x, d.y)) d.state = "walk";
}
function dFly(g, d) {
  var fx, fy, nx, ny;
  if (d.flyT > 0) {
    /* cruising: towards the water it picked, at the height it picked */
    d.flyT--;
    if (d.goal >= 0) { d.dir = d.goal > d.x ? 1 : -1; if (Math.abs(d.goal - d.x) < 3) d.flyT = 0; }
    d.vx += (d.dir * 0.6 - d.vx) * 0.08;
    d.vy += (clamp((d.alt - d.y) * 0.03, -0.4, 0.4) + Math.sin(d.anim * 0.15) * 0.05 - d.vy) * 0.1;
  } else {
    /* gliding in to land */
    d.vx *= 0.985;
    d.vy += (D_FLAP - d.vy) * 0.1;
  }
  if (d.y < 6) d.vy = Math.abs(d.vy);
  nx = d.x + d.vx; ny = d.y + d.vy;
  if (nx < 1 || nx > g.gw - 2) { d.dir = -d.dir; d.vx = -d.vx; nx = d.x; }
  if (dBlocked(g, nx, d.y)) { d.vx = -d.vx * 0.5; d.dir = -d.dir; nx = d.x; if (d.flyT > 0) d.vy = -0.4; }
  if (d.vy < 0 && dSolid(g, Math.floor(nx), Math.floor(ny) - 3)) { d.vy = 0.2; ny = d.y; }
  else if (d.vy > 0) {
    /* touching down: on ground, or on water */
    var cy = Math.floor(d.y);
    while (cy < Math.floor(ny) && !dGround(g, nx, cy) && !LIQUID[pCell(g, Math.floor(nx), cy + 1)]) cy++;
    if ((dGround(g, nx, cy) || LIQUID[pCell(g, Math.floor(nx), cy + 1)]) && cy <= ny) {
      if (d.flyT > 0 && d.vy < 0.5) { d.vy = -0.3; ny = d.y; }   /* skimming the ground while it means to cruise: up again */
      else {
        d.x = nx; d.y = cy; d.vx = d.vy = 0;
        d.state = LIQUID[pCell(g, Math.floor(nx), cy + 1)] ? "swim" : "walk";
        if (d.state === "swim") { d.y = cy + 1.5; g.fx.splash++; }
        d.idle = 20;
        return;
      }
    }
  }
  if (LIQUID[pCell(g, Math.floor(nx), Math.floor(ny))]) { d.x = nx; d.y = ny; d.state = "swim"; d.vx = d.vy = 0; return; }
  d.x = nx; d.y = ny;
}
function dThrown(g, d) {
  d.flyT++;
  d.vy += 0.1; d.vx *= 0.995;
  var spd = Math.sqrt(d.vx * d.vx + d.vy * d.vy), n = Math.ceil(spd * 2) || 1, s, nx, ny;
  if (spd > 5) { d.vx *= 5 / spd; d.vy *= 5 / spd; spd = 5; }
  for (s = 0; s < n; s++) {
    nx = d.x + d.vx / n; ny = d.y + d.vy / n;
    if (nx < -4 || nx > g.gw + 4 || ny > g.gh + 8) { d.dead = 1; feed(g, "a duck left. by air", "#c8d0dc"); return; }
    if (ny < -40) { d.dead = 1; feed(g, "a duck has gone to space", "#9ad0ff"); achieve(g, "duckspace"); return; }
    if (LIQUID[pCell(g, Math.floor(nx), Math.floor(ny))]) { d.x = nx; d.y = ny; d.vx = d.vy = 0; d.state = "swim"; g.fx.splash++; return; }
    if (!dBlocked(g, nx, ny)) { d.x = nx; d.y = ny; continue; }
    if (spd > 4.2) { dDie(g, d, "splat"); g.fx.splat++; return; }
    if (spd > 2) { g.fx.thud++; dFeathers(g, d, 3); }
    var hx = dBlocked(g, nx, d.y), vt = dBlocked(g, d.x, ny);
    if (vt || !hx) { d.vy = -d.vy * 0.3; d.vx *= 0.6; }
    if (hx || !vt) d.vx = -d.vx * 0.4;
    break;
  }
  /* slowed down enough to get its wings out */
  if (d.flyT > 8 && spd < 3) {
    if (dGround(g, d.x, d.y) && Math.abs(d.vy) < 0.6) { d.state = "walk"; d.vx = d.vy = 0; d.idle = 40; dSay(g, d, "quack", true); }
    else if (!d.baby) { d.state = "fly"; d.flyT = 0; d.dir = d.vx < 0 ? -1 : 1; }
  }
}

/* a new village gets a couple of ducks on its pond, if it has one */
function duckPond(g, pond) {
  g.ducks.length = 0; g.heldDuck = null;
  if (!pond) return;
  var x0 = pond[0], x1 = pond[1], y = pond[2], n = Math.min(3, Math.max(1, Math.floor((x1 - x0) / 12)));
  for (var k = 0; k < n; k++) {
    var x = x0 + 2 + Math.random() * Math.max(1, x1 - x0 - 4), d = duckSpawn(g, x, y + 0.5, null, false, true);
    if (d) d.state = "swim";
  }
}

/* how a duck is doing, for the bar at the bottom */
function dMood(d) {
  if (d.state === "held") return "is being held. quack";
  if (d.fire) return "is on fire";
  if (d.state === "thrown") return "is airborne. not on purpose";
  if (d.state === "fly") return d.flyT > 0 ? "is flying" : "is coming in to land";
  if (d.baby && d.lead) return "is following its mother";
  if (d.state === "swim") return d.dab > 0 ? "is looking for snacks underwater" : "is paddling about";
  if (d.seed) return "is going for the seeds";
  if (d.idle > 0) return "is having a think";
  return "is waddling about";
}

/* -------------------------------------------------------------------
   DRAWING
   ------------------------------------------------------------------- */
function ducksDraw(g) {
  var D = g.ducks, k, c;
  for (k = 0; k < D.length; k++) {
    var d = D[k];
    if (d.dead) continue;
    var spr, fast = (d.anim >> 2) & 1, ox = Math.floor(d.x), oy = Math.floor(d.y), flip = d.dir < 0;
    if (d.baby) spr = d.state === "swim" ? D_SPR.babySwim : (((d.anim / 6) | 0) & 1 ? D_SPR.babyA : D_SPR.babyB);
    else if (d.state === "fly" || d.state === "held" || d.state === "thrown") spr = fast ? D_SPR.flyA : D_SPR.flyB;
    else if (d.state === "swim") spr = d.dab > 0 ? D_SPR.dab : D_SPR.swim;
    else spr = d.idle > 0 || ((d.anim / 7) | 0) & 1 ? D_SPR.walkA : D_SPR.walkB;
    var pal = d.baby ? d.kind.bpal : d.kind.pal;
    if (g.thermal) { for (c = 0; c < 10; c++) D_THERM[c] = thermCol(d.fire ? 800 : (c === 6 || c === 2 ? 30 : 40)); pal = D_THERM; }
    else if (d.fire) { for (c = 0; c < 10; c++) D_THERM[c] = c === 1 ? pal[1] : P_FIRE[irnd(256)]; pal = D_THERM; }
    dBlit(g, spr, ox, oy, flip, pal, d.fire > 0);
  }
}
function dBlit(g, spr, ox, oy, flip, pal, glow) {
  var px = g.px, gp = g.gpx, m = g.m, gw = g.gw, gh = g.gh, w = 0, k;
  for (k = 0; k < spr.length; k += 3) if (spr[k] > w) w = spr[k];
  for (k = 0; k < spr.length; k += 3) {
    var X = ox + (flip ? w - spr[k] : spr[k]) - (w >> 1), Y = oy + spr[k + 1];
    if (X < 0 || Y < 0 || X >= gw || Y >= gh) continue;
    var i = Y * gw + X, col = pal[spr[k + 2]];
    if (LIQUID[m[i]] && m[i] !== MAT.LAVA) col = mix32(col, px[i]);   /* the part under water looks it */
    px[i] = col;
    if (glow) gp[i] = col;
  }
}
/* quacks, written small over the duck */
function ducksBubbles(g, c) {
  c.font = "bold 6px " + UI_FONT; c.textAlign = "center";
  for (var k = 0; k < g.ducks.length; k++) {
    var d = g.ducks[k];
    if (d.dead || d.sayT <= 0) continue;
    var sx = PANEL + (d.x + 0.5) * CELL, sy = PLAY_Y + (d.y - 6) * CELL;
    c.globalAlpha = Math.min(1, d.sayT / 12);
    c.fillStyle = "rgba(10,14,22,0.6)";
    var w = c.measureText(d.say).width + 4;
    c.fillRect(sx - w / 2, sy - 6, w, 8);
    c.fillStyle = d.say === d.say.toUpperCase() ? "#ffe070" : "#f4f6fa";
    c.fillText(d.say, sx, sy);
  }
  c.globalAlpha = 1; c.textAlign = "left";
}
