/* =====================================================================
   PLEASAND  --  platforms.js

   when the ground is full and the roofs will take no more floors
   (docs/platforms-plan.md). somebody sleeping rough, with nowhere left
   for a house or a flat, thinks of making more ground: PLATFORMS. a
   level deck high on timber legs, over whatever is under it, with a
   ladder up one end. a deck is a plot in the air: when it is done, a
   house goes up on it. decks that meet are one walkway, with one
   ladder: the high street.

   a deck is a site of kind "deck". it is not a home. its box runs from
   the deck down to its legs' feet: what is under it is the deck's, and
   kept clear by the checks that keep anything clear of any site.

   nothing in here rolls a die, or changes anything, in a village that
   has not thought of platforms.
   ===================================================================== */
"use strict";

var PL_W = 19;               /* a deck: a house (11) and four either side, for its doors and a flat's ladders */
var PL_LEG = 36;             /* rows, at most, from a deck down to whatever a leg stands on: lowered from the deck (§3.3) */
var PL_LAD = 40;             /* and down to the foot of its ladder, which is built from itself, a rung at a time */
var PL_SPAN = 17;            /* columns, at most, of deck with nothing under it between two supports */
var PL_OVER_SITE = 3;        /* rows clear over a site's box (a ridge), under a deck */
var PL_OVER_GROUND = 12;     /* and over ground somebody walks on */
var PL_ROOM = 16;            /* rows of air over a deck: a house's room and roof, and one to spare */
var PL_NEAR = 70;            /* how far along the valley a planner looks */
/* what a deck may come down to three rows over: roofs, which nobody stands on (a lantern hangs under the eaves) */
var PL_ROOFED = { house: 1, storey: 1, lamp: 1 };
function plRoofed(g, x, y) {
  for (var k = 0; k < g.sites.length; k++) { var s = g.sites[k]; if (PL_ROOFED[s.kind] && x >= s.x0 && x <= s.x1 && y >= s.y0 && y <= s.y1) return true; }
  return false;
}
/* what a deck never goes over: what is hot or smokes (a foundry, a furnace), what goes up (the moon rocket), what looks up
   or shines up (the observatory, the lighthouse), what grows (the heap), and another deck. anything else is cleared by
   three rows if it is a roof (PL_ROOFED), by twelve if not */
var PL_UNDER = { deck: 1, foundry: 1, furnace: 1, moonrocket: 1, observatory: 1, lighthouse: 1, heap: 1 };

/* -------------------------------------------------------------------
   WHERE A DECK GOES
   ------------------------------------------------------------------- */
var PL_WHY = "";
function plWhy(w) { PL_WHY = w; return null; }
/* the top of what is under column x, from row y0 down: {y, clear} (the row a deck must be above, by how much), or null
   if something there will not have a deck over it */
function plTop(g, x, y0) {
  var y, c, k, s, top = 1e9, clear = PL_OVER_GROUND;
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if (x < s.x0 || x > s.x1 || s.y1 < y0) continue;
    if (PL_UNDER[s.kind]) return null;
    /* (a roof nobody stands on: three rows over it will do. anything else is somewhere somebody stands, on or in or
       by it, a field, a bridge, a tower's top, a cross: room for them, over its box) */
    var cs = PL_ROOFED[s.kind] ? PL_OVER_SITE : PL_OVER_GROUND;
    if (s.y0 - cs < top - clear) { top = s.y0; clear = cs; }
  }
  for (y = y0; y < g.gh; y++) {
    c = pCell(g, x, y);
    if (AIRY[c]) continue;
    if (c === MAT.FIRE || c === MAT.EMBER || HOT[c]) return null;
    if (c === MAT.SAPLING) return null;                                              /* (it will be a tree) */
    /* leaves: a tree's crown (a trunk under them: a grown tree grows no more, saplingGrow), which is cleared as a roof
       is; or a bush on the ground, walked through, so the ground under it is what counts */
    if (P_LEAF[c]) {
      var yy = y, crown = false;
      while (yy < g.gh && (P_LEAF[pCell(g, x, yy)] || pCell(g, x, yy) === MAT.WOOD)) { if (pCell(g, x, yy) === MAT.WOOD) crown = true; yy++; }
      if (!crown) { y = yy - 1; continue; }
    }
    var cl = P_LEAF[c] || (bMarked(g, x, y) && plRoofed(g, x, y)) ? PL_OVER_SITE : PL_OVER_GROUND;   /* (a crown, a roof: nobody stands up there) */
    if (y - cl < top - clear) { top = y; clear = cl; }
    break;
  }
  return top < 1e9 ? { y: top, clear: clear } : null;
}
/* a column of a leg or a ladder, from row y0 down to the ground: the ground's row (the first solid cell), or -1. a leg
   (roof: true) may stand on a house's roof, the top of it, with air over it: a post on the ridge */
function plFoot(g, x, y0, most, roof) {
  for (var y = y0; y <= y0 + most && y < g.gh - 1; y++) {
    var c = pCell(g, x, y);
    if (roof && bMarked(g, x, y) && SOLID[c] && !P_PASS[c] && (c === MAT.PLANK || c === MAT.BRICK) && plRoofAt(g, x, y)) return y;
    if (bMarked(g, x, y) || LIQUID[c] || HOT[c] || c === MAT.FIRE) return -1;
    if (P_LEAF[c]) { if (B_DIG[c]) continue; return -1; }   /* (a bush: dug out, the ground under it. not a crop, not wheat: nobody digs those) */
    if (SOLID[c] && !P_PASS[c]) return WOODY[c] ? -1 : y;
    if (!AIRY[c] && !B_DIG[c]) return -1;
  }
  return -1;
}
/* is (x, y) the top of a house's (or a flat's) roof */
function plRoofAt(g, x, y) {
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if ((s.kind === "house" || s.kind === "storey") && !s.hut && s.done && x >= s.x0 && x <= s.x1 && y >= s.y0 && y <= s.F - 11) return true;
  }
  return false;
}
/* the row of a deck at xa .. xb: over what is under it, and up over whatever is just beyond its ends; or null */
function plRow(g, xa, xb, tops0, Pmax) {
  var x, y, t, P = 1e9;
  for (x = xa; x <= xb; x++) {
    t = tops0 ? (x in tops0 ? tops0[x] : (tops0[x] = plTop(g, x, 10))) : plTop(g, x, 10);   /* (plFind's: worked out once a column) */
    if (!t) return plWhy("under " + x);
    if (t.y - t.clear < P) P = t.y - t.clear;
  }
  if (Pmax != null && Pmax < P) P = Pmax;   /* (raised, for a high street to come: plFind) */
  if (P - PL_ROOM < 10) return plWhy("high");
  /* air over it, nobody's */
  /* (something just beyond either end, in the way of the air over it: the deck goes up over it, a few times at most) */
  for (var up = 0; ; up++) {
    var hit = -1;
    for (y = P - PL_ROOM; y <= P && hit < 0; y++) for (x = xa - 1; x <= xb + 1; x++) if (!AIRY[pCell(g, x, y)] || bMarked(g, x, y)) { hit = x; break; }
    if (hit < 0) break;
    if (up >= 3 || (hit !== xa - 1 && hit !== xb + 1)) return plWhy("over");
    for (y = P - PL_ROOM; y <= P && (AIRY[pCell(g, hit, y)] && !bMarked(g, hit, y)); y++);
    P = y - 1;
    if (P - PL_ROOM < 10) return plWhy("high");
  }
  return P;
}
/* a deck at columns xa .. xa + W - 1, its ladder at end d (-1 left, +1 right): outside that end, or (inside) up through
   the deck near it. the house goes at the other end. the plan's geometry, or null */
function plPlan(g, xa, W, d, inside, tops0, Pmax) {
  var gw = g.gw, xb = xa + W - 1, x, y, k, t, P = 1e9;
  if (xa < 8 || xb > gw - 9) return plWhy("edge");
  var memo = tops0 && Pmax == null ? "a" + xa + "w" + W : null;   /* (the row and the air over it: the same whichever end the ladder is at. plFind's) */
  if (memo && memo in tops0) { if (tops0[memo] == null) return null; P = tops0[memo]; }
  else {
    P = plRow(g, xa, xb, tops0, Pmax);
    if (memo) tops0[memo] = P;
    if (P == null) return null;
  }
  var cx = -1, fy = -1, hx0 = d > 0 ? xa + 4 : xb - 14;
  {
    /* the ladder: three columns outside the near end; or inside it, up through the deck's last three cells (and then it
       holds the deck up there, as a leg would). never further in: the deck past it would be a pocket, reached only by
       climbing up and stepping off the wrong way, and back down the hatch, for ever */
    cx = inside ? (d > 0 ? xb - 1 : xa + 1) : (d > 0 ? xb + 2 : xa - 2);
    fy = plLadder(g, cx, P, d, !!inside);
    if (fy < 0) return null;
  }
  var legs = plLegs(g, xa, xb, P, d, inside ? [cx - 1, cx, cx + 1] : []);
  if (!legs) return null;
  var low = fy + 1;
  legs.forEach(function (L) { if (L.gy > low) low = L.gy; });
  return { xa: xa, xb: xb, P: P, d: d, inside: !!inside, lad: cx, fy: fy, legs: legs,
           hx0: hx0,
           box: [Math.min(xa, cx - 1), P, Math.max(xb, cx + 1), low - 1], tall: low - P };
}
/* the legs of a deck at xa .. xb, row P, held up at its near end d (by its ladder, or the deck it meets): one wherever
   a span with nothing under it would be too long, and one under the far end. rest: columns of its own (an inside
   ladder) that hold it up too. a list of {x, gy}, or null */
function plLegs(g, xa, xb, P, d, rest) {
  var legs = [], last = d > 0 ? xb + 1 : xa - 1, far = d > 0 ? xa : xb, step = -d, k;
  for (var guard = 0; ; guard++) {
    if (guard > 8) return plWhy("legs");
    /* (something of its own holding it up, somewhere in the next stretch) */
    var want = last + step * (PL_SPAN + 1), r2 = -1;
    for (k = 0; k < rest.length; k++) if ((rest[k] - last) * step > 0 && (want - rest[k]) * step >= 0 && (r2 < 0 || (rest[k] - r2) * step > 0)) r2 = rest[k];
    if (r2 >= 0) { last = r2; if (r2 === far) break; continue; }
    if ((want - far) * step >= 0) want = step > 0 ? far : far - 1;   /* (the last leg: under the far end) */
    var got = -1, gy = -1;
    for (var sh = 0; sh <= 5 && got < 0; sh++) {   /* (a little way along: past a trunk, say) */
      var lx = want - step * sh, a = plFoot(g, lx, P + 1, PL_LEG - 1, true), b = plFoot(g, lx + 1, P + 1, PL_LEG - 1, true);
      if (lx < xa || lx + 1 > xb || a < 0 || b < 0) continue;
      got = lx; gy = Math.max(a, b);
    }
    if (got < 0) return plWhy("leg");
    legs.push({ x: got, gy: gy });
    last = step > 0 ? got + 1 : got;
    if ((step > 0 && got + 1 >= xb) || (step < 0 && got <= xa)) break;
  }
  return legs;
}
/* a ladder up to row P with its middle column cx, from the deck end d: the row its climber stands at the foot of it, or
   -1 */
function plLadder(g, cx, P, d, inside) {
  var k, y, fy = -1;
  for (k = -1; k <= 1; k++) {
    var f = plFoot(g, cx + k, P + (inside ? 1 : 0), PL_LAD);
    if (f < 0) return plWhy("ladder"), -1;
    if (k === 0) fy = f - 1;
  }
  if (!pSolid(g, cx, fy + 1)) return plWhy("ladder foot"), -1;
  for (y = P - 10; y < P; y++) for (k = -1; k <= 1; k++) if (!AIRY[pCell(g, cx + k, y)] || bMarked(g, cx + k, y)) return plWhy("ladder top"), -1;
  /* nowhere to step off on the way up but at the top: nobody's anything beside it, the whole way */
  for (var s = -1; s <= 1; s += 2) {
    if (inside && s === -d) { for (y = P + 1; y <= fy; y++) if (bMarked(g, cx + 2 * s, y)) return plWhy("step-off"), -1; continue; }
    if (!inside && s === -d) continue;   /* (the deck's own end: the deck itself) */
    for (y = P - 10; y <= fy; y++) if (bMarked(g, cx + 2 * s, y)) return plWhy("step-off"), -1;
  }
  return fy;
}
/* which way a deck can be run on from: away from its ladder, or the way the street it is the end of grows */
function plGrow(s) { return s.grow || -s.d; }
/* the deck that has been run on from deck D's growing end, if any */
function plNext(g, D) {
  for (var k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "deck" && g.sites[k].joins && g.sites[k].joins[0] === D.id) return g.sites[k];
  return null;
}
/* a deck W wide run on from the growing end of deck D, at its row: the high street. no ladder: the way up is D's (or the
   ladder of the deck D was run on from, and so on). the plan's geometry, or null */
function plJoin(g, D, W, tops0, rows) {
  var gw = g.gw, grow = plGrow(D), xa = grow > 0 ? D.xb + 1 : D.xa - W, xb = xa + W - 1, x, t;
  if (xa < 8 || xb > gw - 9 || plNext(g, D) || !D.done) return plWhy("edge");
  var lo = 1e9, why = "under";
  for (x = xa; x <= xb; x++) {
    t = tops0 ? (x in tops0 ? tops0[x] : (tops0[x] = plTop(g, x, 10))) : plTop(g, x, 10);
    if (!t) return plWhy("under " + x);
    if (t.y - t.clear < lo) lo = t.y - t.clear;
  }
  /* at D's row if it can be; or a step up or down from it, up to PL_STEP rows: walked up and down as any step is, with a
     riser of the deck's own at its near end, from D's row to its own. or further, up to PL_HOP rows: a short ladder
     between them, at the join (plJoinLadder). the nearer D's row the better */
  rows = rows || PL_JOIN_ROWS;
  for (var k = 0; k < rows.length; k++) {
    var P = D.P + rows[k];
    if (P > lo || P - PL_ROOM < 10) continue;
    var r = plJoinAt(g, D, xa, xb, P, grow);
    if (r) return r;
    why = PL_WHY;
  }
  return plWhy(lo < D.P - PL_HOP ? "under" : why);
}
var PL_STEP = 3, PL_HOP = 12, PL_JOIN_ROWS = [0];
for (var plk = 1; plk <= PL_HOP; plk++) PL_JOIN_ROWS.push(-plk, plk);
var PL_STEP_ROWS = PL_JOIN_ROWS.slice(0, 2 * PL_STEP + 1);
function plJoinAt(g, D, xa, xb, P, grow) {
  var x, y, xn = grow > 0 ? xa : xb, xd = grow > 0 ? xa - 1 : xb + 1;   /* (its near end, and D's own end cell) */
  var hop = Math.abs(P - D.P) > PL_STEP, y0 = Math.min(P, D.P), y1 = hop ? P : Math.max(P, D.P), jl = null;
  if (hop) { jl = plJoinLadder(g, D, xa, xb, P, grow); if (!jl) return null; y0 = Math.min(P, jl.top); }
  for (y = P - PL_ROOM; y <= y1; y++) for (x = xa - 1; x <= xb + 1; x++) {
    if (y > P && x !== xn) continue;   /* (below its row: only the riser's column) */
    if (x === xd && y >= D.P) continue;   /* (D's end, and what holds it up: D's) */
    if (!AIRY[pCell(g, x, y)] || bMarked(g, x, y)) return plWhy("over");
  }
  var legs = plLegs(g, xa, xb, P, -grow, []);
  if (!legs) return null;
  var low = Math.max(P, D.P) + 1;
  legs.forEach(function (L) { if (L.gy > low) low = L.gy; });
  var rise = [];
  if (!hop) for (y = y0; y <= y1; y++) if (y !== P) rise.push(y);
  return { xa: xa, xb: xb, P: P, d: -grow, grow: grow, inside: false, lad: -1, fy: -1, legs: legs, join: D.id,
           rise: rise, xn: xn, jl: jl,
           hx0: grow > 0 ? xb - 14 : xa + 4,
           box: [jl ? Math.min(xa, jl.cx - 1) : xa, y0, jl ? Math.max(xb, jl.cx + 1) : xb, low - 1],
           tall: low - P + Math.abs(P - D.P) * 2 };
}
/* the ladder between D and a deck run on from it PL_STEP+1 .. PL_HOP rows up or down from it: three columns, from the
   lower deck up to the upper one's row, the top rung beside the upper deck's end cell, so a climber steps off onto it
   (bStepOff). higher: it stands on D's last three cells. lower: it hangs from beside D's end, over the new deck's
   first three, and is put up from the top. {cx, top, bot, hang}, or null */
function plJoinLadder(g, D, xa, xb, P, grow) {
  var up = P < D.P, cx, top, bot, x, y;
  if (up) { cx = grow > 0 ? D.xb - 1 : D.xa + 1; top = P; bot = D.P - 1; }
  else { cx = grow > 0 ? xa + 1 : xb - 1; top = D.P; bot = P - 1; }
  if (up && D.house) {   /* (nothing of D's house on those three columns) */
    var hs = bSite(g, D.house);
    if (hs && cx + 1 >= hs.x0 && cx - 1 <= hs.x1) return plWhy("hop house");
  }
  /* air, nobody's, the ladder's rows and ten over its top (a climber's body) */
  for (y = top - 10; y <= bot; y++) for (x = cx - 1; x <= cx + 1; x++)
    if (!AIRY[pCell(g, x, y)] || bMarked(g, x, y)) return plWhy("hop");
  return { cx: cx, top: top, bot: bot, hang: !up };
}
var PL_WIDTHS = [19, 23, 27, 31], PL_STREET_UP = 8;
/* could a deck be run on from r's far end, once it is built (plJoin, on a deck that is not there yet) */
function plStreetReady(g, r, tops0) {
  /* (at its row, or a step from it: the hops are not looked at for every deck plFind weighs. they are slow, and a
     street that hops is the lucky kind) */
  return !!plJoin(g, { kind: "deck", id: -1, xa: r.xa, xb: r.xb, P: r.P, d: r.d, done: true }, PL_WIDTHS[0], tops0, PL_STEP_ROWS);
}
/* the row a deck run on from r's far end (the narrowest) would want: what is under it there, or null if nothing can go */
function plStreetRow(g, r, tops0) {
  var W = PL_WIDTHS[0], xa = r.d > 0 ? r.xa - W : r.xb + 1, P = 1e9, t;
  if (xa < 8 || xa + W - 1 > g.gw - 9) return null;
  for (var x = xa; x < xa + W; x++) {
    t = x in tops0 ? tops0[x] : (tops0[x] = plTop(g, x, 10));
    if (!t) return null;
    if (t.y - t.clear < P) P = t.y - t.clear;
  }
  return P;
}
/* everywhere within reach of x, best first: a deck run on from one already there (the high street), then the shortest
   legs, then the shortest deck, then the nearest */
/* the best deck run on from one already there, within reach of x: the high street (or null). cheap: a handful of plJoins */
function plFindJoin(g, fx, tops) {
  var best = null, bs = 1e9;
  tops = tops || {};
  for (var k = 0; k < g.sites.length; k++) {
    var D = g.sites[k];
    if (D.kind !== "deck" || Math.abs(D.cx - fx) > PL_NEAR + 31) continue;
    for (var jj = 0; jj < PL_WIDTHS.length; jj++) {
      var rj = plJoin(g, D, PL_WIDTHS[jj], tops);
      if (!rj) continue;
      var sj = -1000 + rj.tall + (rj.xb - rj.xa) * 0.5 + Math.abs(rj.hx0 + 5.5 - fx) * 0.15;
      if (sj < bs) { bs = sj; best = rj; }
    }
  }
  return best;
}
function plFind(g, fx) {
  var tops = {}, best = plFindJoin(g, fx, tops), bs = 1e9;
  if (best) return best;
  for (var xa = fx - PL_NEAR - 31; xa <= fx + PL_NEAR; xa++) for (var d = -1; d <= 1; d += 2) for (var j = 0; j < PL_WIDTHS.length; j++) for (var n = 0; n < 2; n++) {
    var r = plPlan(g, xa, PL_WIDTHS[j], d, n === 1, tops);
    if (!r) continue;
    var sc = r.tall + (r.xb - r.xa) * 0.5 + Math.abs(r.hx0 + 5.5 - fx) * 0.15 - (plStreetReady(g, r, tops) ? PL_STREET_UP + 2 : 0);
    if (sc < bs) { bs = sc; best = r; }
    /* (and the same a few rows higher, if that is what it takes for the next deck along, run on from its far end, to
       clear what is under it there: a deck that a high street can grow from is worth a longer ladder) */
    var Ps = plStreetRow(g, r, tops);
    if (Ps != null && Ps < r.P && r.P - Ps <= PL_STREET_UP) {
      var r2 = plPlan(g, xa, PL_WIDTHS[j], d, n === 1, tops, Ps);
      if (r2 && r2.P === Ps && plStreetReady(g, r2, tops)) {
        var sc2 = r2.tall + (r2.xb - r2.xa) * 0.5 + Math.abs(r2.hx0 + 5.5 - fx) * 0.15 - PL_STREET_UP - 2;
        if (sc2 < bs) { bs = sc2; best = r2; }
      }
    }
  }
  return best;
}

/* -------------------------------------------------------------------
   THE IDEA, AND WHO PLANS ONE
   ------------------------------------------------------------------- */
var PL_PH_LAD = 10, PL_PH_DECK = 200, PL_PH_TOP = 300;   /* the ladder (10..90, a phase a rung), the deck, then its legs */
P_SAY.idea_deck = ["if there's no ground left, we'll MAKE some", "legs! give the ground legs!", "a floor in the sky. with a house on it",
  "up on stilts, like a heron"];
P_SAY.planDeck = ["a platform! right up there", "mind your heads, we're building over you", "it'll be lovely up there", "more ground. made of planks"];
P_SAY.deckHome = ["a house on legs!", "home, in the sky", "the ducks walk under my house"];
P_ACHIEVE.stilts = ["ON STILTS", "a house on legs. the ducks walk under it"];
P_ACHIEVE.highstreet = ["HIGH STREET", "a walkway over the roofs, with houses on it. it is practically a town"];

IDEAS.push({ id: "deck", fresh: true, name: "the platform", title: "PLATFORMS",
  sub: "no ground left, and no roof that will take a floor. so make some ground",
  hint: "storeys with nowhere left to go, and a night on the ground",
  ready: function (g) { return plReady(g); } });

function plReady(g) {
  return !!g.know.storey && g.noStoreyT != null && g.tick - g.noStoreyT < S_CROWD_T && sCrowded(g) && plSomewhere(g);
}
/* is there anywhere, near somebody sleeping rough, for a deck: nobody thinks of one there is no room for (looked for
   once in a while: plFind is not cheap) */
function plSomewhere(g) {
  if (g.plSpotT != null && g.tick - g.plSpotT < 3000) return !!g.plSpotOk;
  var ok = false, n = 0;
  for (var k = 0; k < g.peasants.length && !ok && n < 3; k++) {
    var p = g.peasants[k];
    if (!p.dead && !bHome(g, p)) { n++; if (plFind(g, Math.floor(p.x))) ok = true; }
  }
  g.plSpotT = g.tick; g.plSpotOk = ok;
  return ok;
}
function plGoingUp(g) {
  for (var k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "deck" && !g.sites[k].done) return true;
  return false;
}
/* somebody homeless, crowded out of the ground and the roofs, with the wood to start: a deck, the best within reach.
   (cd0: their planCD before sTry looked for a storey this tick, and set it when it found none) */
function plTry(g, p, cd0) {
  if (!g.know.deck || (arguments.length > 2 ? cd0 : p.planCD) || bHome(g, p) || bOwnsSite(g, p) || !sCrowded(g)) return false;
  if (sGoingUp(g) || plGoingUp(g) || bOpenCount(g) >= B_OPEN) return false;
  /* (with the wood to start, anywhere; without it, only the high street run on: the cheap one, no ladder to the ground,
     and the others bring the boards. a house is planned on less) */
  var poor = bWood(p) < 2;
  if (poor && g.plJoinNo != null && g.tick - g.plJoinNo < 300) return false;
  var r = poor ? plFindJoin(g, Math.floor(p.x)) : plFind(g, Math.floor(p.x));
  if (!r && poor) { g.plJoinNo = g.tick; return false; }   /* (looked for, for anybody, once in a while: their own planCD is their house's) */
  if (!r) { g.noDeckT = g.tick; p.planCD = 2400; return false; }
  plCommit(g, p, r);
  return true;
}
/* the plan, from plPlan's geometry, and the site */
function plCommit(g, p, r) {
  var plan = [], x, y, k, e, L, W = g.know.masonry && bStoneToHand(g) >= 30 ? MAT.BRICK : MAT.PLANK;
  /* the ladder, a rung at a time from its foot */
  var xl = r.lad - 1;
  /* (rd: a rung buried in a heap, after a fire, is put back by somebody stood on the heap. drive: knocked in through
     the loose stuff, not dug out first: dug, it only slumps back into the hole, for ever) */
  if (r.lad >= 0) for (y = r.fy; y >= r.P; y--) for (k = 0; k < 3; k++) { e = bE(g, xl + k, y, MAT.LADDER, PL_PH_LAD + Math.min(80, r.fy - y), k); e.rd = PL_DIG; e.drive = true; plan.push(e); }
  /* the legs: lowered from the deck once it is down, a length at a time, each under the last, by somebody kneeling at
     the edge (rd: a leg is at most PL_LEG rows). so every cell of them, on the ground or on somebody's roof, is in reach
     from the deck: for a repair too */
  for (var j = 0; j < r.legs.length; j++) {
    L = r.legs[j];
    for (x = L.x; x <= L.x + 1; x++) {
      var foot = plFoot(g, x, r.P + 1, PL_LEG - 1, true);
      for (y = r.P + 1; y < foot; y++) { e = bE(g, x, y, MAT.TRESTLE, PL_PH_TOP, x - L.x); e.rd = PL_LEG + 1; e.drive = true; plan.push(e); }
    }
  }
  /* the deck, outward from the ladder */
  var cells = [];
  var from = r.lad >= 0 ? r.lad : r.jl ? r.jl.cx : (r.grow > 0 ? r.xa - 1 : r.xb + 1);   /* (out from the ladder, or from the deck it meets) */
  for (x = r.xa; x <= r.xb; x++) if (r.lad < 0 || x < xl || x > xl + 2) cells.push(x);
  cells.sort(function (a, b) { return Math.abs(a - from) - Math.abs(b - from); });
  /* (a ladder up or down to the deck it meets: up from D's boards, or hung from beside D's end, a rung at a time from
     the top, reached down to from D) */
  var J = r.jl;
  if (J) for (y = J.top; y <= J.bot; y++) for (k = 0; k < 3; k++) {
    e = bE(g, J.cx - 1 + k, y, MAT.LADDER, PL_PH_LAD + (J.hang ? y - J.top : J.bot - y), k);
    if (J.hang) e.rd = J.bot - J.top + 3;
    plan.push(e);
  }
  /* (a step up or down to the deck it meets: a riser in its near end's column, from that deck's row, laid first) */
  if (r.rise) {
    for (k = 0; k < r.rise.length; k++) plan.push(bE(g, r.xn, r.rise[k], W, PL_PH_DECK));   /* (each goes in once the one by it has) */
  }
  for (k = 0; k < cells.length; k++) plan.push(bE(g, cells[k], r.P, W, PL_PH_DECK));
  var s = bNew(g, "deck", p, plan, r.box, { P: r.P, F: r.P, xa: r.xa, xb: r.xb, hx0: r.hx0, lad: r.lad, fy: r.fy, d: r.d,
                                            inside: r.inside, joins: r.join ? [r.join] : [], grow: r.grow || 0, house: 0,
                                            stone: W === MAT.BRICK });
  s.cx = (r.xa + r.xb + 1) / 2;
  feed(g, p.name + (r.join ? " is running the high street on, with another platform" : " is building a platform"), "#a8e08a", "plan" + s.id);
  pSay(g, p, "planDeck", true);
  bJoin(g, p, s);
  return s;
}
/* finished: a house goes up on it, for whoever planned it (or whoever has no home) */
function plFinish(g, s, p) {
  feed(g, (p ? p.name : "the village") + " finished the platform", "#a8e08a", "plan" + s.id);
  if (s.joins.length) achieve(g, "highstreet");
  plHouseOn(g, s);
}
function plHouseOn(g, s) {
  if (s.house && bSite(g, s.house)) return null;
  var q = bOwner(g, s);
  if (!q || q.dead || bHome(g, q) || bOwnsSite(g, q)) {
    q = null;
    var bd = 1e9;
    for (var k = 0; k < g.peasants.length; k++) {
      var c = g.peasants[k];
      if (c.dead || c.state === "space" || bHome(g, c) || bOwnsSite(g, c)) continue;
      var d = Math.abs(c.x - s.cx);
      if (d < bd) { bd = d; q = c; }
    }
  }
  if (!q) return null;
  var h = bHousePlan(g, q, s.hx0, s.P, [], [], { deck: s.id });
  s.house = h.id;
  return h;
}

/* -------------------------------------------------------------------
   THE GOINGS ON: every 30 ticks, from sStep
   ------------------------------------------------------------------- */
function plStep(g) {
  if (!g.know.deck) return;
  plChatter(g);
  for (var k = g.sites.length - 1; k >= 0; k--) {
    var s = g.sites[k];
    if (s.handH || s.handD) continue;   /* (in the hand, or in the lake and not yet out: looked at when it comes down. hand.js) */
    /* a house on a deck that is gone: gone with it */
    if (s.kind === "house" && s.deck && !bSite(g, s.deck)) {
      var o = bOwner(g, s);
      feed(g, "the house on the platform went with it", "#ff9a8a", "fix" + s.id);
      if (o) { o.home = 0; pSay(g, o, "lostHome", true); }
      bGiveBack(s, bNearestLiving(g, s));
      bRemove(g, k);
      continue;
    }
    /* a deck being mended whose ladder's foot is under a heap now (ash, after a fire; sand): the ladder starts from the
       top of the heap. nobody reaches down into it for the old rungs */
    if (s.kind === "deck" && s.lad >= 0 && g.tick % 300 === 0) plTrim(g, s);
    /* a finished deck with nothing on it (its house given up, or nobody to plan one when it was done): somebody's, now */
    if (s.kind === "deck" && s.done && !(s.house && bSite(g, s.house)) && g.tick % 600 === 0) plHouseOn(g, s);
  }
}
var PL_DIG = 10;   /* how far down a builder stood on a heap digs for a buried rung */
function plTrim(g, s) {
  var gw = g.gw, cut = 0, k, e;
  /* (a rung left waiting is still waiting while what is over it is loose stuff, the rungs over it put back or not) */
  for (k = 0; k < s.plan.length; k++) {
    e = s.plan[k];
    if (!e.off || e.v !== MAT.LADDER) continue;
    if (g.m[e.i] === MAT.LADDER) e.off = 0;   /* (put back: it waits for nothing now) */
    else if (B_DIG[g.m[e.i]]) e.off = g.tick + 900;
  }
  for (var x = s.lad - 1; x <= s.lad + 1; x++) {
    var surf = -1, y, c;
    for (y = s.P + 1; y <= s.fy + 1; y++) { c = g.m[y * gw + x]; if (!AIRY[c] && c !== MAT.LADDER) { surf = y; break; } }
    if (surf < 0 || surf > s.fy) continue;
    /* (a heap, loose, from there down to the old foot: not something hard in the way, nor an overhang) */
    var heap = true;
    for (y = surf; y <= s.fy && heap; y++) if (!B_DIG[g.m[y * gw + x]]) heap = false;
    if (!heap) continue;
    /* (dug down to, and put back, as far as a spade reaches: the rungs under that wait, while the heap is over them
       (bOk: off). when it goes, they are missing, and put back from the foot up, as ever) */
    var deep = surf + PL_DIG - 2;
    for (k = 0; k < s.plan.length; k++) {
      e = s.plan[k];
      if (e.v !== MAT.LADDER || e.i % gw !== x) continue;
      if ((e.i / gw | 0) >= deep) { if (g.m[e.i] !== MAT.LADDER) { e.off = g.tick + 900; cut++; } }
      else if (!(e.rd >= PL_DIG)) e.rd = PL_DIG;
    }
  }
  return cut;
}
/* could a home come of a deck: one going up, or finished and waiting for its house (storeys.js sAnyHome) */
function plAnyHome(g) {
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (s.kind === "deck" && (!s.done || !(s.house && bSite(g, s.house)))) return true;
  }
  return false;
}
/* a deck carries a house: it is mended, never given up (build.js bInspect) */
function plCarries(g, s) {
  if (s.kind !== "deck") return false;
  /* (and a deck the street runs on from carries the houses further along: their only way up is its ladder) */
  for (var b = s, n = 0; b && n++ < 30; b = plNext(g, b)) if (b.house && bSite(g, b.house)) return true;
  return false;
}
function plLabel(s) { return s.who ? pTitle(s.who) + "'s platform" : "the platform"; }
/* the decks of the street deck s is in, from its ladder's end (s itself, alone, if it meets no other) */
function plStreet(g, s) {
  var out = [s], b = s, n = 0, nx;
  while (b.joins && b.joins.length && (nx = bSite(g, b.joins[0])) && n++ < 30) { out.unshift(nx); b = nx; }
  for (b = s, n = 0; (nx = plNext(g, b)) && n++ < 30; b = nx) out.push(nx);
  return out;
}
/* (the hover) */
function plNote(g, s) {
  if (s.kind !== "deck") return "";
  var st = plStreet(g, s);
  if (st.length < 2) return "";
  var houses = st.filter(function (d) { return d.house && bSite(g, d.house); }).length;
  return " (THE HIGH STREET: " + st.length + " PLATFORMS, " + houses + (houses === 1 ? " HOUSE)" : " HOUSES)");
}
/* (tidy.js) a site other than a deck whose box is at (x, y) */
function plSiteUnder(g, x, y) {
  for (var k = 0; k < g.sites.length; k++) { var s = g.sites[k]; if (s.kind !== "deck" && x >= s.x0 && x <= s.x1 && y >= s.y0 && y <= s.y1) return s; }
  return null;
}
/* (tidy.js) a house or a flat with a deck within nine rows over its roof: nobody can stand up there to sweep it */
function plOverRoof(g, s) {
  if (s.kind !== "house" && s.kind !== "storey") return false;
  for (var k = 0; k < g.sites.length; k++) {
    var d = g.sites[k];
    if (d.kind === "deck" && d.xb >= s.x0 && d.xa <= s.x1 && d.P < s.y0 && s.y0 - d.P <= 9) return true;
  }
  return false;
}

/* -------------------------------------------------------------------
   UNDER THE BOARDS: somebody with no home, going to sleep, goes and
   lies down under a platform, out of the weather, if one is near
   ------------------------------------------------------------------- */
P_SAY.underBoards = ["under the boards again", "at least it's dry", "somebody's walking on my ceiling", "it's not a house. it's a lid"];
P_SAY.underWake = ["no backache! well. less", "slept like a plank", "the ducks snore, you know", "morning, boards"];
var PL_UNDER_R = 60;
/* (bTaskSleep, for somebody with no home) one tick of going to sleep under a deck: true or false as bTaskSleep would say,
   or undefined if there is nowhere (so they nap where they stand, as they always did) */
function plUnder(g, p, k) {
  if (k.t > 1500 || k.ux === -1) return undefined;
  if (k.ux == null) {
    var best = null, bd = 1e9;
    for (var j = 0; j < g.sites.length; j++) {
      var s = g.sites[j];
      if (s.kind !== "deck" || !s.done || Math.abs(s.cx - p.x) > PL_UNDER_R) continue;
      for (var x = s.xa + 1; x <= s.xb - 1; x++) {
        if (s.lad >= 0 && Math.abs(x - s.lad) <= 2) continue;
        var y = s.P + 1;
        while (y < g.gh - 1 && !pSolid(g, x, y + 1)) y++;
        if (y - s.P < 10 || !navStand(g, x, y) || bMarked(g, x, y + 1) || pCell(g, x, y) === MAT.TRESTLE) continue;
        var d = Math.abs(x + 0.5 - p.x) + Math.abs(y - p.y) * 0.5;
        if (d < bd) { bd = d; best = { x: x, y: y }; }
      }
    }
    if (!best) { k.ux = -1; return undefined; }
    k.ux = best.x; k.uy = best.y;
  }
  ++k.t;
  var fy = Math.floor(p.y);
  if (Math.abs(k.ux + 0.5 - p.x) < 0.8 && Math.abs(fy - k.uy) <= 1) {
    bNap(g, p); p.underDeck = true;
    if (p.sayT <= 0 || wRand(g) < 0.5) pSay(g, p, "underBoards", true);
    return true;
  }
  var ux = k.ux, uy = k.uy, left = pathGo(g, p, "under" + ux, ux, uy, function (x, y) { return x === ux && Math.abs(y - uy) <= 1; });
  if (left < 0) p.dir = ux + 0.5 < p.x ? -1 : 1;
  if (pStuck(p, k, left > 0 ? left : Math.abs(ux + 0.5 - p.x))) { k.ux = -1; return undefined; }
  return false;
}

/* -------------------------------------------------------------------
   UP THERE: what they say on it, going off the end of it, and to the
   household underneath
   ------------------------------------------------------------------- */
P_SAY.onDeck = ["don't look down", "it sways, you know", "i can see your roof from here", "the ducks look so small", "nice up here"];
P_SAY.wheee = ["WHEEE", "shortcut!", "the ladder's for visitors", "GERONIMOOO"];
P_SAY.deckOver = ["mind your heads down there!", "sorry about the stomping", "lovely view of your chimney"];
P_SAY.deckUnder = ["who's that walking about up there", "you're dripping on my roof", "keep it down up there!"];
/* (every 30 ticks, from plStep) */
function plChatter(g) {
  var k, j, s, p;
  for (k = 0; k < g.peasants.length; k++) {
    p = g.peasants[k];
    if (p.dead || p.climb || p.state !== "walk") continue;
    var fx = Math.floor(p.x), fy = Math.floor(p.y);
    for (j = 0; j < g.sites.length; j++) {
      s = g.sites[j];
      if (s.kind !== "deck" || fx < s.xa - 2 || fx > s.xb + 2) continue;
      /* (off the end: falling, from the deck's row) */
      if (p.falling && Math.abs(p.fallY - (s.P - 1)) < 1.5 && !(p.wheeT > g.tick - 600)) {
        p.wheeT = g.tick;
        if (p.sayT <= 0 && wRand(g) < 0.25) pSay(g, p, "wheee", true);
        break;
      }
      if (!p.falling && fy === s.P - 1 && fx >= s.xa && fx <= s.xb && !p.sleep && p.sayT <= 0 && wRand(g) < 0.03) { pSay(g, p, "onDeck"); break; }
    }
  }
  /* (a household up on a deck, and one in a house under it, both at home) */
  for (j = 0; j < g.sites.length; j++) {
    s = g.sites[j];
    var up = s.kind === "deck" && s.house && bSite(g, s.house), o = up && up.done && bOwner(g, up);
    if (!o || o.sleep > 0 || o.sayT > 0 || !bInside(up, o) || wRand(g) > 0.06) continue;
    for (k = 0; k < g.sites.length; k++) {
      var h = g.sites[k];
      if (h.kind !== "house" || h === up || !h.done || h.x1 < s.xa || h.x0 > s.xb || h.y0 <= s.P) continue;
      var q = bOwner(g, h);
      if (q && !q.dead && !(q.sleep > 0) && bInside(h, q)) { if (wRand(g) < 0.5) pSay(g, o, "deckOver"); else pSay(g, q, "deckUnder"); break; }
    }
  }
}
