/* =====================================================================
   PLEASAND  --  hand.js

   THE HAND (docs/the-hand-plan.md). they have always said it looked
   like a giant hand. pick HAND and press: whatever is in the brush
   comes up, ground and all, and anybody standing on it comes too, and
   sits down. let go, and it comes down: gently, in one piece, set down
   where it lands; from too high, in pieces.

   the lump is a body of its own, as a peasant or a duck is. while it is
   held or in the air it is off the grid: its cells are kept as they
   were, material, shade, aux and heat, and none of them steps. it keeps
   its heat to itself, and only once it is put down (or comes apart)
   does that heat meet anything. it has its own rules for coming down
   and nothing else in the valley obeys them: once it comes apart, its
   grains are the world's grains, and land as any grain lands.

   and they remember what it did: a ride, a house moved or wrecked, a
   knock. put out a fire for them and they leave something out for it,
   on the hill, out of their pocket.

   g.hand is made at the first lift. a valley that never lifts anything
   has none, and nothing in here is ever reached: it goes exactly as it
   did.
   ===================================================================== */
"use strict";

var H_HARD = 2.5;     /* a tick, or faster, into what it meets: it comes apart */
var H_GRAV = 0.11;    /* debris's own gravity, and its top speed (world.js partStep) */
var H_VMAX = 4;
var H_WET = 1;        /* the fastest it goes down through water */
var H_HOME_UP = 60;   /* how far up, and how far along, what it pushes aside looks for somewhere to go */
var H_HOME_SIDE = 3;
var H_FLICK = 4.5;    /* the fastest a hand throws anything (peasantThrow's clamp) */
var H_SHARE = 60;     /* a lump of this many cells or fewer takes all of the flick; a bigger one sqrt(60 / n) of it */
var H_STILL = 0.5;    /* under this, after the share, a hand trembles: it is let go still. and a skid this slow is over */
var H_SKID = 0.6;     /* what a skid takes off its speed along, each tick it skids along what it has come down on */
var H_KNOCK = 2;      /* speed squared, or more, and it knocks people flat (the bowling rule's own, peasants.js) */
var H_PANE = 4;       /* a window this near to where a hard lump hits is knocked out of the boards round it */
/* what a lump has to be made of to break what it hits: the rock, the stonework, the metal, the glass and the ice, the
   timber, and the machines. not a bed, a flower, wheat, a lamp, linen or packed snow, and nothing loose */
var H_HARDM = new Uint8Array(NMAT);
[MAT.BRICK, MAT.CONCRETE, MAT.FIREBRICK, MAT.MOONROCK, MAT.METAL, MAT.GIRDER, MAT.GLASS, MAT.STAINED, MAT.ICE,
 MAT.TORCH, MAT.FAUCET, MAT.DRAIN, MAT.CLONER].forEach(function (v) { H_HARDM[v] = 1; });
ROCK.forEach(function (on, v) { if (on || WOODY[v]) H_HARDM[v] = 1; });

P_SAY.handWoke = ["i was ASLEEP", "who moved my bed", "is it morning? it's not morning", "five more minutes. in the AIR",
                  "why is the floor going up"];
P_SAY.handChase = ["MY HOUSE", "PUT IT BACK", "that's MINE", "careful with the bed", "THAT'S MY HOUSE", "mind the door"];

/* what can be set down somewhere else and be the same thing there: small things, all of whose places are known. not a
   great work, a flat or what a flat stands on, or a house on a platform */
var H_MOVES = { house: 1, lamp: 1, scarecrow: 1, grave: 1, statue: 1 };
var H_WHOLE = 0.9;    /* this much of it came up, or more (and two cells at the least), and it is moved, not mended */
var H_CHASE = 0.3;    /* this much of somebody's house in the hand, and they run after it */
var H_RUIN = 0.6;     /* more of it than this come down in pieces, and it is a ruin (build.js bInspect's own share) */
var H_LONG = 3000;    /* the longest anybody runs after one. and a house that is a ruin this soon after it flew, flew */
var H_FEEL = 9;       /* the most anybody thinks of it, either way */
var H_SAYS = 3;       /* kindnesses over cruelties (or the other way) by this much, and those with no mind of their own go with the village */
var H_LOOK = 80;      /* the ground going up, this near: they stop and look */
var H_QUIET = 600;    /* a lift of nothing that is anybody's stops them only if none has for this long */
var H_RIDE = 100;     /* a ride this far along is a tale */

/* what they make of what it does: [to whoever it was done to, the village's kindnesses, its cruelties]. (putout: to the
   owner, and answered to whoever asked for it, if that was somebody else. took: to whoever left it) */
var H_DEEDS = { moved: [-1, 0, 0], rescued: [2, 1, 0], wrecked: [-3, 0, 2], knocked: [-2, 0, 1], rode: [1, 0, 0], zapped: [-2, 0, 1],
                putout: [3, 2, 0], answered: [2, 0, 0], took: [1, 1, 0], smashed: [-1, 0, 1],
                dropped: [-2, 0, 1] };   /* (smashed: their window, knocked out. dropped: off one that came apart) */
var H_DOUSED = 900;   /* water from the sky this lately, and the fire goes out: the sky put it out */
var H_OVER = 16;     /* water put down this far over the top of something on fire is water on it */
var H_DUNK = 0.3;     /* this much of a house on fire, put down in this many cells' worth of water, is put out there and then */
var H_DUNKN = 20;
var H_FLOOD = 8;      /* this much water in a house's box when it went up, and it was flooded: moved out of it is a rescue */
var H_ASK = 300;      /* arms up, asking, this long. and waving, the length of a look up */
var H_WAVE = 90;
var H_THANKS = 6000;  /* a thank-you is left within this long of the deed, or not at all */
var H_SKY = 20;       /* where it is left: open to the sky this many rows up, and no further off than this */
var H_FAR = 60;
var H_GIFTS = 8;      /* the most it remembers having been left */
P_SAY.handWish = ["water, please. from anywhere", "HAND! WATER!", "you did the pond once", "anything wet. please", "UP HERE. THE HOUSE"];
P_SAY.handTook = ["it TOOK it", "it likes coal!", "i'll bring more", "THE HAND TOOK IT", "it was for you!"];
P_SAY.handThank = ["for you", "thank you, sky", "for the fire", "it's not much", "for the hand"];
P_ACHIEVE.accepted = ["ACCEPTED", "they left something out for the hand, and it took it"];
P_ACHIEVE.kindly = ["A KINDLY HAND", "the village leaves out coal for it now"];
P_SAY.handLift = ["the ground is going UP", "who ordered that", "oh no it's the hand again", "LOOK", "is it meant to do that",
                  "there goes the hill"];
P_SAY.handUnder = ["is that my house", "it's raining sky", "hello up there", "can i have a go", "don't drop it", "it's very big"];
P_SAY.handLove = ["hello, hand", "we left you some coal", "*waves at the sky*", "the hand is kind", "it means well", "hi!"];
P_SAY.handGrudge = ["YOU", "i know what you did", "put my house back", "keep your hands to yourself", "i'm watching you",
                    "not you again"];
P_ACHIEVE.wrath = ["THE WRATH", "they have started hiding when you move the mouse"];

/* -------------------------------------------------------------------
   THE LIFT: on a press
   ------------------------------------------------------------------- */
/* (the lump: c, six numbers a cell, dx dy from its anchor, then m aux sh, then its heat. clone: [cell, recipe], a cloner
   that was copying somebody. riders and ducks know their own place on it, p.ride; the lump knows nothing of them, so
   that it saves as numbers) */
function handLift(g) {
  var h = g.hand || (g.hand = { held: null, fly: null, sites: [], lifts: 0, gifts: [], kind: 0, cruel: 0 });
  if (h.held || h.fly) return;   /* (one lump at a time: the one in the air comes down first) */
  var gw = g.gw, r = g.size, at = sandCell(g), k, j, v, dx, dy, x, y;
  var ax = clamp(Math.round(at.x), 0, gw - 1), ay = clamp(Math.round(at.y), 0, g.gh - 1);   /* (where the ring is: what is over the edge of the valley is not there to lift) */
  /* what comes up: anything but air, fire, steam, smoke, gas and inert. machines too */
  var took = {}, list = [];
  for (dy = -r; dy <= r; dy++) for (dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy > r * r + r || ax + dx < 0 || ax + dx >= gw || ay + dy < 0 || ay + dy >= g.gh) continue;
    j = (ay + dy) * gw + ax + dx; v = g.m[j];
    if (AIRY[v] || v === MAT.INERT) continue;
    took[j] = 1; list.push(j, dx, dy);
  }
  var show = false;   /* (somebody's, or somebody: everybody looks, however lately they looked) */
  /* the sites it bites into: how much of each, out of what was there. a finished one is on hold until it comes down */
  var sites = [];
  for (k = 0; k < g.sites.length; k++) {
    var s = g.sites[k], p0 = s.burning ? 2 : 0, bx = clamp(ax, s.x0 - p0, s.x1 + p0) - ax, by = clamp(ay, s.y0 - (p0 ? 3 : 0), s.y1 + (p0 ? 1 : 0)) - ay, n = 0, of = 0;   /* (on fire, its fire's reach too, as iFlames looks) */
    if (bx * bx + by * by > r * r + r) continue;
    for (var e = 0; e < s.plan.length; e++) {
      var pe = s.plan[e];
      if (pe.v === MAT.EMPTY || !bOk(g, pe)) continue;
      of++;
      if (took[pe.i]) n++;
    }
    /* (and of a site on fire, its fire: embers are not what its plan says, and come up all the same) */
    var fire = 0;
    if (s.burning) for (e = 0; e < list.length; e += 3) {
      j = list[e]; x = j % gw; y = (j / gw) | 0;
      if (g.m[j] === MAT.EMBER && x >= s.x0 - 2 && x <= s.x1 + 2 && y >= s.y0 - 3 && y <= s.y1 + 1) fire++;
    }
    sites.push({ id: s.id, n: n, of: of, burn: s.burning || 0, flood: s.kind === "house" && n > 0 && handFlood(g, s) ? 1 : 0, fire: fire });
    if (s.done && (n > 0 || fire)) s.handH = 1;   /* (its fire in the hand is not its fire put out: on hold too) */
    if (n > 0) show = true;
  }
  /* what was left out for it, on the hill: taken. (whoever left it is beside themselves, and so is everybody who saw) */
  var gift = handGifts(g, h, took);
  /* (the fire of a house sunk in the lake and not yet seen to be out, taken back up out of it, or the rest of it, still
     burning, taken up from where it stood: whatever happens to it now, it was not the lake that put it out) */
  if (h.dunks) for (k = 0; k < h.dunks.length; k++) {
    var D = h.dunks[k], hot = false;
    for (j = 0; j < list.length && !hot; j += 3) hot = g.m[list[j]] === MAT.EMBER;
    if (D.e.some(function (i) { return took[i]; }) || sites.some(function (w) { return w.id === D.id && (w.fire || (hot && w.n > 0)); })) D.no = 1;
  }
  if (gift) show = true;
  /* whoever is standing on it: sat down on it. somebody asleep in a bed that goes up wakes up */
  for (k = 0; k < g.peasants.length; k++) {
    var p = g.peasants[k];
    if (p.dead || p.state !== "walk" || p.aboard || p === g.held) continue;
    x = Math.floor(p.x); y = Math.floor(p.y);
    if (x < 0 || x >= gw || y < 0 || y >= g.gh) continue;
    /* (on it, or in it; or on the edge of it, with nothing of their own under them. on the bottom row, in it) */
    if (!(took[y * gw + x] || (y + 1 < g.gh && (took[(y + 1) * gw + x] || (!pSolid(g, x, y + 1) && (took[(y + 1) * gw + x - 1] || took[(y + 1) * gw + x + 1])))))) continue;
    p.state = "held"; p.ride = { dx: p.x - ax, dy: p.y - ay }; show = true;
    if (p.sleep > 0) { p.sleep = 0; p.inBed = false; p.underDeck = false; pSay(g, p, "handWoke", true); }
  }
  for (k = 0; k < g.ducks.length; k++) {
    var d = g.ducks[k];
    if (d.dead || (d.state !== "walk" && d.state !== "swim") || d === g.heldDuck) continue;
    x = Math.floor(d.x); y = Math.floor(d.y);
    if (x < 0 || x >= gw || y < 0 || y >= g.gh || !(took[y * gw + x] || (y + 1 < g.gh && took[(y + 1) * gw + x]))) continue;
    d.state = "held"; d.ride = { dx: d.x - ax, dy: d.y - ay }; show = true;
  }
  /* and up it comes, each cell as a bang takes one (world.js sandFling): its heat with it, and room air behind it */
  var c = [], clone = [];
  for (k = 0; k < list.length; k += 3) {
    j = list[k]; v = g.m[j];
    heatSync(g, j);
    if (v === MAT.CLONER && g.cloneSrc[j]) { clone.push([c.length / 6, g.cloneSrc[j]]); delete g.cloneSrc[j]; }
    c.push(list[k + 1], list[k + 2], v, g.aux[j], g.sh[j], heatQ(g, j));
    g.m[j] = MAT.EMPTY; g.aux[j] = 0; g.T[j] = AMBIENT; g.lat[j] = 0;
    heatAccept(g, j);
  }
  h.lifts++;
  h.sites = sites;
  h.held = { x: ax, y: ay, r: r, c: c, clone: clone, ax: ax, ay: ay, show: show ? 1 : 0, b: c.length ? handBox(c) : [0, 0, 0, 0] };
  /* whose house is going up: they run after it. (not if they are on it, or on fire, or busy with what cannot wait, as
     the fire alarm leaves them be: a bucket, a meal they need, a fire to warm them. nor if they are asleep somewhere
     else: they will find out in the morning) */
  for (k = 0; k < sites.length; k++) {
    s = bSite(g, sites[k].id);
    if (!s || s.kind !== "house" || !s.handH || sites[k].n < H_CHASE * sites[k].of) continue;
    p = bOwner(g, s);
    if (!p || p.ride || p.fire || p.state !== "walk" || p === g.held || p.aboard || p.sleep > 0 || (p.task && p.task.kind === "bucket") || !iCanWait(p, p.task)) continue;
    p.task = { kind: "chase", site: s.id, t: 0, lift: h.lifts }; p.idle = 0;
  }
  handWitness(g, h.held, show, gift ? "handTook" : "handLift");
}
/* a house standing in water when it went up: flooded, the water up its walls or in it. (the lake come up round it, or
   the hand's own pond put down on it) */
function handFlood(g, s) {
  var n = 0, x, y;
  for (y = s.y0; y <= s.y1; y++) for (x = s.x0 - 2; x <= s.x1 + 2; x++) if (LIQUID[pCell(g, x, y)] && ++n >= H_FLOOD) return true;
  return false;
}
/* the lift takes what was left for it (the cell still what was left there): THE HAND TOOK IT. a gift that is not there
   any more (dug up, washed off, burned) is forgotten. how many were taken */
function handGifts(g, h, took) {
  var n = 0, at = -1, k, G, q;
  for (k = h.gifts.length - 1; k >= 0; k--) {
    G = h.gifts[k];
    if (g.m[G.i] !== G.m) { h.gifts.splice(k, 1); continue; }
    if (!took[G.i]) continue;
    h.gifts.splice(k, 1); n++; at = G.i;
    q = handPid(g, G.who);
    handDeed(g, q, "took");
    if (q) { pSay(g, q, "handTook", true); q.ask = Math.max(q.ask || 0, H_WAVE); }
  }
  if (n) { feed(g, "THE HAND TOOK IT", "#ffd94a", "took", at % g.gw); achieve(g, "accepted"); }
  return n;
}
/* somebody, by their id, if they are still about */
function handPid(g, id) {
  for (var k = 0; k < g.peasants.length; k++) if (g.peasants[k].id === id && !g.peasants[k].dead) return g.peasants[k];
  return null;
}

/* -------------------------------------------------------------------
   HELD, AND IN THE AIR
   ------------------------------------------------------------------- */
/* under the cursor, kept inside the valley, all of it. (where it is, is kept: the let-go goes by that, so it saves) */
function handRide(g) {
  var H = g.hand && g.hand.held;
  if (!H) return;
  var at = sandCell(g), b = H.b || (H.b = H.c.length ? handBox(H.c) : [0, 0, 0, 0]);
  H.x = clamp(Math.round(at.x), -b[0], g.gw - 1 - b[1]); H.y = clamp(Math.round(at.y), -b[2], g.gh - 1 - b[3]);
  handRiders(g, H.x, H.y);
}
/* everybody on it, put where they sit on it: nothing to do but hold on (as pHeld, but nobody says anything) */
function handRiders(g, x, y) {
  var k, p, d;
  for (k = 0; k < g.peasants.length; k++) {
    p = g.peasants[k];
    if (!p.ride || p.dead || p.state !== "held") continue;
    p.x = clamp(x + p.ride.dx, 1.5, g.gw - 1.5); p.y = y + p.ride.dy;   /* (one on the lip of it, carried to the wall, is at the wall, where a peasant can walk) */
    p.rope = null; p.jumping = false; p.chute = null; p.task = null; p.bored = 0; p.climb = null; p.sleep = 0;
    p.vx = 0; p.vy = 0; p.spin = 0; p.falling = false; p.fallY = p.y; p.idle = 0; p.stun = 0;
  }
  for (k = 0; k < g.ducks.length; k++) {
    d = g.ducks[k];
    if (!d.ride || d.dead || d.state !== "held") continue;
    d.x = clamp(x + d.ride.dx, 1.5, g.gw - 2.5); d.y = y + d.ride.dy; d.vx = 0; d.vy = 0;
  }
}
/* can the lump be at (x, y): every cell of it in the valley's columns, above its floor, and on air or a liquid (not
   concrete held in its form). over the top is sky */
function handFits(g, c, x, y) {
  var gw = g.gw, gh = g.gh, m = g.m, k, X, Y, j, v;
  for (k = 0; k < c.length; k += 6) {
    X = x + c[k]; Y = y + c[k + 1];
    if (X < 0 || X >= gw || Y >= gh) return false;
    if (Y < 0) continue;
    j = Y * gw + X; v = m[j];
    if (!(AIRY[v] || LIQUID[v]) || sandHeld(g, j)) return false;
  }
  return true;
}
/* is any of it in a liquid, at (x, y) */
function handWet(g, c, x, y) {
  for (var k = 0; k < c.length; k += 6) {
    var X = x + c[k], Y = y + c[k + 1];
    if (Y >= 0 && Y < g.gh && LIQUID[g.m[Y * g.gw + X]]) return true;
  }
  return false;
}
/* let go, moving as the hand was: a pebble as fast as it was flicked, a hill a share of it, and a hand that hardly moved
   lets go of it still. a lump of nothing, a press on the empty sky, is just dropped. let go inside the ground, it goes up
   a row at a time until it is clear, as high as it has to: the sky is always free */
function handLetGo(g, v) {
  var h = g.hand, H = h && h.held;
  if (!H) return;
  h.held = null;
  if (!H.c.length) { handEnd(g); return; }
  var k = Math.min(1, Math.sqrt(H_SHARE / (H.c.length / 6)));
  var L = Math.sqrt(v[0] * v[0] + v[1] * v[1]), cap = L > H_FLICK ? H_FLICK / L : 1;   /* (as fast as a hand throws, whichever way: a diagonal is no faster) */
  var vx = v[0] * cap * k, vy = v[1] * cap * k;
  if (Math.abs(vx) < H_STILL) vx = 0;
  if (Math.abs(vy) < H_STILL) vy = 0;
  var y = H.y;
  while (!handFits(g, H.c, H.x, y)) y--;
  h.fly = { x: H.x, y: y, fx: H.x, fy: y, vx: vx, vy: vy, c: H.c, clone: H.clone, wet: 0, t: 0, ax: H.ax, ay: H.ay };
  handRiders(g, H.x, y);
}
/* once a tick, from peasantsStep */
function handStep(g) {
  var h = g.hand;
  if (h.held) { handRide(g); if (g.tick % 10 === 0) handHover(g, h.held); }
  else if (h.fly) handFly(g);
  if (h.dunks && h.dunks.length && g.tick % 10 === 0) handDunks(g);
  handLoose(g);
  handAsk(g);
}
/* asking the sky, or waving at it: arms up, and stood still, for as long as it lasts. (after their own step, which put
   their arms down: peasants.js pStep) */
function handAsk(g) {
  for (var k = 0; k < g.peasants.length; k++) {
    var p = g.peasants[k];
    if (!(p.ask > 0)) continue;
    if (--p.ask <= 0) { delete p.ask; delete p.asks; }
    if (p.dead || p.state !== "walk" || p.fire || p.panic > 0 || p.sleep > 0 || p.climb || p.rope || p.aboard) continue;
    p.idle = Math.max(p.idle || 0, 2); p.pose = "panicA";
  }
}
/* anybody with a place on a lump who is not on it any more (grabbed, blown off it, dead), or on a lump that is not there:
   let go of it. (nobody is ever left held by nothing.) and anybody thrown off one that came apart, who the grains of it
   came down round before they did (pFly found them inside it, and stood them up there): on top of the heap, still
   coming down, so that it is the fall that decides how they are, as for anybody thrown, and not a burying */
function handLoose(g) {
  var h = g.hand, any = !!(h.held || h.fly), k, p, d;
  for (k = 0; k < g.peasants.length; k++) {
    p = g.peasants[k];
    if (p.handOff != null) {
      if (g.tick - p.handOff > 2 || p.dead) delete p.handOff;
      else if (p.state === "walk" && pStiffAt(g, p.x, p.y)) {
        while (p.y > 0 && pStiffAt(g, p.x, p.y)) p.y--;
        p.state = "fly"; delete p.handOff;
      }
    }
    if (!p.ride) continue;
    if (p.dead || p.state !== "held" || p === g.held) { delete p.ride; continue; }
    if (!any) { delete p.ride; p.state = "fly"; p.flyT = 0; p.vx = p.vy = 0; p.fallY = p.y; p.immune = 4; }
  }
  for (k = 0; k < g.ducks.length; k++) {
    d = g.ducks[k];
    if (!d.ride) continue;
    if (d.dead || d.state !== "held" || d === g.heldDuck) { delete d.ride; continue; }
    if (!any) { delete d.ride; d.state = "thrown"; d.flyT = 0; d.vx = d.vy = 0; }
  }
}
/* how far the lump goes each way from its anchor: [left, right, top, bottom] */
function handBox(c) {
  var b = [1e9, -1e9, 1e9, -1e9];
  for (var k = 0; k < c.length; k += 6) {
    if (c[k] < b[0]) b[0] = c[k];
    if (c[k] > b[1]) b[1] = c[k];
    if (c[k + 1] < b[2]) b[2] = c[k + 1];
    if (c[k + 1] > b[3]) b[3] = c[k + 1];
  }
  return b;
}
/* a tick in the air: water slows it, it falls as a grain falls and goes on as it was thrown, a whole cell at a time,
   along and down in turn. what it comes up against, it is going into at some speed, the speed that way and no other:
   at H_HARD or more it comes apart there. slower, against a side it stops going that way and drops, under an overhang
   it stops going up, and on something under it, it stops coming down and skids, slowing, along it, until it is going
   slowly enough to be set down there. (in water when it meets anything: the water had it, whatever speed it came in at.
   no grain is lost in a pond) */
function handFly(g) {
  var f = g.hand.fly, c = f.c;
  if (handWet(g, c, f.x, f.y)) {
    if (!f.wet && f.vy > 0.8) handSplash(g, f);
    f.vy = Math.min(f.vy, H_WET); f.vx *= 0.8; f.wet = 1;
  } else f.wet = 0;
  f.vy = Math.min(H_VMAX, f.vy + H_GRAV); f.vx *= 0.995;
  /* (look out below: the first tick of the flight, and every ten after) */
  if (((f.t = (f.t || 0) + 1) % 10) === 1) handUnder(g, f);
  var tx = Math.round(f.fx + f.vx), ty = Math.floor(f.fy + f.vy), bx = false, by = false, dx, dy, n;
  for (;;) {
    if (f.vy >= 0 && !handFits(g, c, f.x, f.y + 1)) {
      if (f.vy >= H_HARD && !handWet(g, c, f.x, f.y) && handCrash(g, 0, 1)) return;
      f.vy = 0; ty = f.y; by = true;   /* (down on it: it goes no further down) */
    }
    dx = tx - f.x; dy = ty - f.y;
    if (!dx && !dy) break;
    /* (whichever way it is further behind, for how fast it is going that way) */
    if (dx && (!dy || Math.abs(dx) * Math.abs(f.vy) >= Math.abs(dy) * Math.abs(f.vx))) {
      n = f.x + (dx > 0 ? 1 : -1);
      if (handFits(g, c, n, f.y)) { f.x = n; handKnock(g, f); continue; }   /* (whoever it passes, not only where it gets to) */
      if (Math.abs(f.vx) >= H_HARD && !handWet(g, c, f.x, f.y) && handCrash(g, dx > 0 ? 1 : -1, 0)) return;
      f.vx = 0; tx = f.x; bx = true;
      continue;
    }
    if (dy > 0) { f.y++; handKnock(g, f); continue; }   /* (down: what is under it was looked at, at the top) */
    if (handFits(g, c, f.x, f.y - 1)) { f.y--; handKnock(g, f); continue; }
    if (-f.vy >= H_HARD && !handWet(g, c, f.x, f.y) && handCrash(g, 0, -1)) return;
    f.vy = 0; ty = f.y; by = true;
  }
  if (bx) f.fx = f.x; else f.fx += f.vx;
  if (by) f.fy = f.y; else f.fy += f.vy;
  handRiders(g, f.x, f.y);
  handKnock(g, f);
  /* (resting on something where it got to: it skids, and a skid soon stops) */
  if (f.vy >= 0 && !handFits(g, c, f.x, f.y + 1)) {
    f.vx = f.vx > 0 ? Math.max(0, f.vx - H_SKID) : Math.min(0, f.vx + H_SKID);
    if (Math.abs(f.vx) < H_STILL) { f.fx = f.x; f.fy = f.y; handSet(g); }
  }
}
/* into the pond: a splash, for show, as a peasant thrown into it makes one. the pond keeps all its water and its heat */
function handSplash(g, f) {
  var c = f.c, gw = g.gw, x0 = 1e9, x1 = -1e9, top = 1e9, w = MAT.WATER, k, X, Y, v;
  for (k = 0; k < c.length; k += 6) {
    X = f.x + c[k]; Y = f.y + c[k + 1];
    if (Y < 0 || Y >= g.gh) continue;
    v = g.m[Y * gw + X];
    if (!LIQUID[v]) continue;
    if (X < x0) x0 = X;
    if (X > x1) x1 = X;
    if (Y < top) { top = Y; w = v; }
  }
  if (x1 < x0) return;
  var sc = SAND_DEEP[w] ? SAND_DEEP[w][16 * 256] : SAND_PAL[w][0], n = Math.min(40, 12 + x1 - x0);
  for (k = 0; k < n; k++) partAdd(g, PK_GLINT, x0 + Math.random() * (x1 - x0 + 1), top - 1, (Math.random() - 0.5) * 1.6, -0.8 - Math.random() * f.vy * 0.5, 30 + irnd(20), sc);
  g.fx.splash++;
}
/* anybody in the way of it, going at the speed a thrown peasant bowls people over at: knocked flat, as they would be by
   one. a wet lump puts out whoever it knocks over who was on fire. a duck in the way goes flying, and says so */
function handKnock(g, f) {
  if (f.vx * f.vx + f.vy * f.vy < H_KNOCK) return;
  var c = f.c, b = handBox(c), x0 = f.x + b[0], x1 = f.x + b[1] + 1, y0 = f.y + b[2], y1 = f.y + b[3];
  var mid = f.x + (b[0] + b[1] + 1) / 2, k, i, p, d, X, Y, fy, hit, wet;
  for (i = 0; i < g.peasants.length; i++) {
    p = g.peasants[i];
    if (p.dead || p.ride || p.state !== "walk" || p === g.held) continue;
    if (p.x < x0 - 1.5 || p.x > x1 + 1.5 || p.y < y0 || p.y - 9 > y1) continue;
    fy = Math.floor(p.y); hit = wet = false;
    for (k = 0; k < c.length; k += 6) {
      X = f.x + c[k]; Y = f.y + c[k + 1];
      if (Math.abs(p.x - X - 0.5) >= 1.5 || Y < fy - 8 || Y > fy) continue;
      hit = true;
      if (WET[c[k + 2]]) { wet = true; break; }
      if (!p.fire) break;
    }
    if (!hit) continue;
    p.state = "fly"; p.flyT = 0; p.immune = 6; p.fallY = p.y;
    p.vx = f.vx * 0.8 + (p.x - mid) * 0.1; p.vy = Math.min(f.vy, 0) - 1.2;
    f.vx *= 0.9;
    handDeed(g, p, "knocked");
    g.fx.thud++;
    if (wet && p.fire) {
      p.fire = 0; p.fireTo = null; g.fx.hiss++;
      pSay(g, p, "phew", true);
      sparks(g, p.x, p.y - 8, 6, 0.4, [hex32("#c0d0e0")], 14, 0.6, PK_GLINT);   /* (steam, as pStep's own) */
    } else pSay(g, p, "oof", true);
  }
  for (i = 0; i < g.ducks.length; i++) {
    d = g.ducks[i];
    if (d.dead || d.ride || (d.state !== "walk" && d.state !== "swim") || d === g.heldDuck) continue;
    if (d.x < x0 - 1.5 || d.x > x1 + 1.5 || d.y < y0 || d.y - 4 > y1) continue;
    fy = Math.floor(d.y); hit = false;
    for (k = 0; k < c.length && !hit; k += 6) {
      X = f.x + c[k]; Y = f.y + c[k + 1];
      hit = Math.abs(d.x - X - 0.5) < 1.5 && Y >= fy - 3 && Y <= fy;
    }
    if (!hit) continue;
    d.state = "thrown"; d.flyT = 0; d.vx = f.vx * 0.8 + (d.x - mid) * 0.1; d.vy = Math.min(f.vy, 0) - 1.2;
    dSay(g, d, "quack", true);
  }
}
/* coming down on them: whoever is under it gets out from under it, the nearer way, at a run, and not home (their home
   might be what it is coming down on). anyone would */
function handUnder(g, f) {
  if (f.vy <= 0) return;
  var b = handBox(f.c), x0 = f.x + b[0] - 2, x1 = f.x + b[1] + 3, top = f.y + b[2], mid = f.x + (b[0] + b[1] + 1) / 2, k, p;
  for (k = 0; k < g.peasants.length; k++) {
    p = g.peasants[k];
    if (p.dead || p.ride || p.state !== "walk" || p === g.held) continue;
    if (p.x < x0 || p.x >= x1 || p.y < top) continue;
    var was = p.panic > 0;
    p.panic = Math.max(p.panic, 60); p.idle = 0; p.dir = p.x < mid ? -1 : 1; p.handOut = g.tick + 60;
    if (!was) pSay(g, p, "timber", true);
  }
}

/* -------------------------------------------------------------------
   SET DOWN, OR COME APART
   ------------------------------------------------------------------- */
/* bottom row first, left to right: the order everything is put down in */
function handOrder(c) {
  var o = [];
  for (var k = 0; k < c.length; k += 6) o.push(k);
  return o.sort(function (a, b) { return c[b + 1] - c[a + 1] || c[a] - c[b]; });
}
/* what it is set down into, that must go somewhere: liquids and gases, each to the lowest free air over the lump in its
   column, or in one of the three each side (within 60 rows), a cell to each. [from, to, from, to...], or null if one of
   them has nowhere to go. (wide: anywhere along the valley, and all the way up) */
function handHomes(g, c, order, x, y, wide) {
  var gw = g.gw, mine = {}, top = {}, out = [], k, o, X, Y, j, v;
  for (k = 0; k < c.length; k += 6) {
    X = x + c[k]; Y = y + c[k + 1];
    if (Y >= 0) mine[Y * gw + X] = 1;
    if (top[X] == null || Y < top[X]) top[X] = Y;
  }
  for (o = 0; o < order.length; o++) {
    k = order[o]; X = x + c[k]; Y = y + c[k + 1];
    if (Y < 0) continue;
    j = Y * gw + X; v = g.m[j];
    if (!(LIQUID[v] || v === MAT.GAS || v === MAT.STEAM || v === MAT.SMOKE)) continue;
    var t = handHome(g, mine, X, top[X] - 1, wide);
    if (t < 0) return null;
    mine[t] = 2; out.push(j, t);
  }
  return out;
}
function handHome(g, mine, X, y0, wide) {
  var gw = g.gw, side = wide ? gw : H_HOME_SIDE, lo = wide ? 0 : Math.max(0, y0 - H_HOME_UP), d, s, x, y, j;
  for (d = 0; d <= side; d++) for (s = d ? -1 : 1; s <= 1; s += 2) {
    x = X + d * s;
    if (x < 0 || x >= gw) continue;
    for (y = Math.min(y0, g.gh - 1); y >= lo; y--) { j = y * gw + x; if (g.m[j] === MAT.EMPTY && !mine[j]) return j; }
  }
  return -1;
}
/* put it down where it is, whole. what it sinks into is pushed up round it first (if it cannot all be, it is set down a
   row higher, and so on: a lump too big to sink into a pond rests on it). then every cell as it was, heat and all, with
   the heat of the air it went into; a cloner with whoever it was copying; and its riders on their feet */
function handSet(g) {
  var h = g.hand, f = h.fly, c = f.c, gw = g.gw, order = handOrder(c), homes, k, o, j, t, q, X, Y, v, a, s;
  /* (something poured or fell into where it is, while it was in the air: it is set down on that, not over it) */
  while (!handFits(g, c, f.x, f.y)) f.y--;
  for (;;) {
    homes = handHomes(g, c, order, f.x, f.y, false);
    if (homes) break;
    if (!handFits(g, c, f.x, f.y - 1)) { homes = handHomes(g, c, order, f.x, f.y, true); break; }
    f.y--;
  }
  if (!homes && handCrash(g)) return;   /* (nowhere in the whole valley for the water to go. it will not come to this) */
  var over = {};   /* (and if it cannot even come apart there: what would go over the water comes down as a grain of itself, beside it) */
  if (!homes) for (k = 0; k < c.length; k += 6) { Y = f.y + c[k + 1]; if (Y >= 0 && !AIRY[g.m[Y * gw + f.x + c[k]]]) over[k] = 1; }
  var sunk = 0, embers = [];   /* (how much water it went down into. and where the fire it carried is now) */
  for (k = 0; homes && k < homes.length; k += 2) {
    j = homes[k]; t = homes[k + 1];
    heatSync(g, j); q = heatQ(g, j); v = g.m[j]; a = g.aux[j]; s = g.sh[j];
    if (WET[v]) sunk++;   /* (water: a house put down in the oil, or the lava, is not put out) */
    g.m[j] = MAT.EMPTY; g.aux[j] = 0; g.T[j] = AMBIENT; g.lat[j] = 0;
    heatAccept(g, j);
    heatSync(g, t);
    var qt = heatQ(g, t);
    g.m[t] = v; g.aux[t] = a; g.sh[t] = s; g.vy[t] = 0;
    heatSetQ(g, t, qt + q);
  }
  for (o = 0; o < order.length; o++) {
    k = order[o]; X = f.x + c[k]; Y = f.y + c[k + 1];
    if (Y < 0) { handDrop(g, c, k, X); continue; }   /* (over the top of the valley: put down beside it, on whatever is there. a grain of it would come down on its own top, over the valley, with nowhere to land) */
    if (over[k]) { if (!handCaught(g, c, k, X, Y, 0, 0) && !handGrain(g, c, k, X, Y, 0, 0)) handDrop(g, c, k, X); continue; }
    j = Y * gw + X;
    if (WET[c[k + 2]] && g.m[j] === MAT.FIRE) (f.quench || (f.quench = [])).push(j);   /* (water put down on a flame: it is out) */
    heatSync(g, j);
    var qa = heatQ(g, j);   /* (air, or a flame, smothered: its heat stays in the cell) */
    g.m[j] = c[k + 2]; g.aux[j] = c[k + 3]; g.sh[j] = c[k + 4]; g.vy[j] = 0;
    heatSetQ(g, j, qa + c[k + 5]);
  }
  for (k = 0; k < c.length; k += 6) if (c[k + 2] === MAT.EMBER && f.y + c[k + 1] >= 0) embers.push((f.y + c[k + 1]) * gw + f.x + c[k]);
  for (k = 0; k < f.clone.length; k++) {
    o = f.clone[k][0] * 6; X = f.x + c[o]; Y = f.y + c[o + 1];
    if (Y >= 0 && g.m[Y * gw + X] === MAT.CLONER) g.cloneSrc[Y * gw + X] = f.clone[k][1];
  }
  handDouse(g, c, f.x, f.y, f.quench);
  delete f.quench;
  /* the dunk: a good part of a house on fire put down in the lake, with its fire. if the fire goes out (what it carried,
     and whatever was left where it stood), it was the lake that did it: the house is on hold until then, or until it is
     clear that it has not (handDunks). (whether it is still a house there is handShift's question, and at the bottom of
     the lake it is not) */
  if (sunk >= H_DUNKN && embers.length) for (k = 0; k < h.sites.length; k++) {
    var w = h.sites[k], ds = bSite(g, w.id);
    if (ds && w.burn && ds.burning && w.n > 0 && w.n >= H_DUNK * w.of) w.dunk = embers;
  }
  for (k = 0; k < g.peasants.length; k++) {
    var p = g.peasants[k];
    if (!p.ride || p.dead || p.state !== "held") continue;
    p.x = clamp(f.x + p.ride.dx, 1.5, gw - 1.5); p.y = f.y + p.ride.dy;
    delete p.ride;
    /* (put down under something with no room for them where they sat: out on top of it, and down from there, as anybody
       thrown off one. not a burying, and not a ride to thank it for) */
    if (pBlocked(g, p.x, p.y)) {   /* (as walking goes: a tree trunk is not in anybody's way) */
      while (p.y > 0 && pBlocked(g, p.x, p.y)) p.y--;
      p.state = "fly"; p.flyT = 0; p.vx = p.vy = 0; p.fallY = p.y; p.immune = 4;
      continue;
    }
    p.state = "walk"; p.falling = false; p.fallY = p.y; p.vx = p.vy = 0;
    if (LIQUID[pCell(g, Math.floor(p.x), Math.floor(p.y))] || LIQUID[pCell(g, Math.floor(p.x), Math.floor(p.y) - 4)]) continue;   /* (put down in the pond, or the lava: not a ride to thank it for) */
    pSay(g, p, "touchdown", true);
    (f.rode || (f.rode = [])).push(p.id);
    handDeed(g, p, "rode");
    if (f.ax != null && Math.abs(f.x - f.ax) >= H_RIDE) wTale(g, "rode", p);   /* (over the valley and down by the sea) */   /* (who came down with it: a house's owner among them was not left behind) */
  }
  for (k = 0; k < g.ducks.length; k++) {
    var d = g.ducks[k];
    if (!d.ride || d.dead || d.state !== "held") continue;
    d.x = clamp(f.x + d.ride.dx, 1.5, gw - 2.5); d.y = f.y + d.ride.dy; d.state = "walk"; d.vx = d.vy = 0;   /* (where a duck can walk) */
    delete d.ride;
    if (dBlocked(g, d.x, d.y)) {   /* (no room for it where it sat: out on top, and down, as one thrown) */
      while (d.y > 0 && dBlocked(g, d.x, d.y)) d.y--;
      d.state = "thrown"; d.flyT = 0;
    }
  }
  h.fly = null;
  handEnd(g, f);
}
/* a cell of the lump with no room in the air for a grain of it (the pool full): put down at once where it would land in
   its column, on the first thing under the top, or in the nearest column that has room at the top, heat and all. (in a
   valley full to the top all along, nowhere: lost, as a grain is when there is no room for it) */
function handDrop(g, c, k, X0) {
  var gw = g.gw, d, s, X = -1, y, j, qa;
  for (d = 0; d < gw && X < 0; d++) for (s = -1; s <= 1 && X < 0; s += 2) { var x = X0 + d * s; if (x >= 0 && x < gw && g.m[x] === MAT.EMPTY) X = x; }
  if (X < 0) return false;
  for (y = 0; y + 1 < g.gh && g.m[(y + 1) * gw + X] === MAT.EMPTY; y++);
  j = y * gw + X;
  heatSync(g, j); qa = heatQ(g, j);
  g.m[j] = c[k + 2]; g.aux[j] = c[k + 3]; g.sh[j] = c[k + 4]; g.vy[j] = 0;
  heatSetQ(g, j, qa + c[k + 5]);
  return true;
}
/* a cell of the lump, as a flying grain of itself (world.js sandFling's grain): its heat and its shade */
function handGrain(g, c, k, X, Y, vx, vy) {
  var v = c[k + 2], q = partAdd(g, PK_DEBRIS, X + 0.5, Y + 0.5, vx, vy, 240, SAND_PAL[v][c[k + 4]], v);
  if (q < 0) return false;
  g.pt[q] = c[k + 5]; g.ps[q] = c[k + 4];
  return true;
}
/* it hit too hard. (only if the air has room for every grain of it, as a bang keeps room: otherwise it is set down after
   all, or drops, or stops going up.) first what it hit, if it hit it with something hard (sx, sy: the way it was
   going). then every cell of it a grain, going as fast as it was, to land as grains land, in a heap: its glass smashed to
   sand and its ice to snow, and nothing thrown sideways over the valley's edge. gunpowder in it goes off, once, where the
   first grain of it is, and the rest as they land by the fire of that. riders are thrown off, and land as anybody thrown
   lands: pFly decides how hard that was */
function handCrash(g, sx, sy) {
  var h = g.hand, f = h.fly, c = f.c, gw = g.gw, boom = -1, k, p, d, v, X, Y, j;
  if (g.np + c.length / 6 > PMAX - 400) return false;
  handRiders(g, f.x, f.y);   /* (where it got to: they are thrown off from there) */
  if (sx || sy) handHit(g, f, sx || 0, sy || 0);
  /* (the nearer the edge it was going at, the less it goes on that way: at the edge, not at all) */
  var b = handBox(c), vx = f.vx, room = vx > 0 ? gw - 1 - (f.x + b[1]) : f.x + b[0];
  if (Math.abs(vx) * 16 > room) vx = vx > 0 ? room / 16 : -room / 16;
  handDouse(g, c, f.x, f.y);   /* (a pond that bursts on a burning roof is as wet as one put down on it) */
  var order = handOrder(c);
  for (var o = 0; o < order.length; o++) {
    k = order[o]; v = c[k + 2]; X = f.x + c[k]; Y = f.y + c[k + 1];
    if (v === MAT.GLASS || v === MAT.STAINED) { c[k + 2] = MAT.SAND; c[k + 3] = 0; }
    else if (v === MAT.ICE) c[k + 2] = MAT.SNOW;
    else if (v === MAT.GUNPOWDER && boom < 0 && Y >= 0 && AIRY[g.m[Y * gw + X]]) {
      /* (put back where it is, in the air the lump was in, with that air's heat, as a set-down puts a cell down) */
      j = Y * gw + X; heatSync(g, j);
      var qa = heatQ(g, j);
      g.m[j] = v; g.aux[j] = c[k + 3]; g.sh[j] = c[k + 4]; g.vy[j] = 0;
      heatSetQ(g, j, qa + c[k + 5]);
      boom = j;
      continue;
    }
    if (Y < 0) { handDrop(g, c, k, X); continue; }   /* (over the top of the valley: it would come down on whatever is under it before it is in the valley, with nowhere to land. put down beside it) */
    if (!handCaught(g, c, k, X, Y, vx, f.vy)) handGrain(g, c, k, X, Y, vx, f.vy);
  }
  for (k = 0; k < g.peasants.length; k++) {
    p = g.peasants[k];
    if (!p.ride || p.dead || p.state !== "held") continue;
    delete p.ride;
    p.state = "fly"; p.flyT = 0; p.fallY = p.y; p.vx = vx; p.vy = f.vy; p.handOff = g.tick;
    handDeed(g, p, "dropped");   /* (they were sitting on it) */
  }
  for (k = 0; k < g.ducks.length; k++) {
    d = g.ducks[k];
    if (!d.ride || d.dead || d.state !== "held") continue;
    delete d.ride;
    d.state = "thrown"; d.flyT = 0; d.vx = vx; d.vy = f.vy;
  }
  h.fly = null;
  handEnd(g);
  if (boom >= 0) sandBoom(g, boom);
  return true;
}
/* a grain of it, flung from (X, Y) at (vx, vy), as world.js partStep would fly it through the valley as it is: if it
   would go out through the floor, or a side, it is put down there instead, in the lowest free cell of the column it got
   to, heat and all. (nothing the hand throws leaves the valley.) true if it was */
function handCaught(g, c, k, X, Y, vx, vy) {
  var gw = g.gw, gh = g.gh, x = X + 0.5, y = Y + 0.5, t, n, s, nx, ny, ix, iy, j;
  for (t = 0; t < 240; t++) {
    vy = Math.min(H_VMAX, vy + H_GRAV); vx *= 0.995;
    n = Math.ceil(Math.max(Math.abs(vx), Math.abs(vy)) * 1.5) || 1;
    for (s = 0; s < n; s++) {
      nx = x + vx / n; ny = y + vy / n; ix = Math.floor(nx); iy = Math.floor(ny);
      if (ix < 0 || ix >= gw || iy >= gh) {
        ix = clamp(ix, 0, gw - 1);
        for (iy = gh - 1; iy >= 0 && g.m[iy * gw + ix] !== MAT.EMPTY; iy--);
        if (iy < 0) return false;
        j = iy * gw + ix; heatSync(g, j);
        var qa = heatQ(g, j);
        g.m[j] = c[k + 2]; g.aux[j] = c[k + 3]; g.sh[j] = c[k + 4]; g.vy[j] = 0;
        heatSetQ(g, j, qa + c[k + 5]);
        return true;
      }
      if (iy >= 0 && !(ix === X && iy === Y) && !AIRY[g.m[iy * gw + ix]]) return false;   /* (it lands on that, as grains do. not on where it starts from) */
      x = nx; y = ny;
    }
  }
  return false;
}
/* what a hard lump hits, at a crash: each cell that stopped it, struck by the cell of the lump behind it. glass is
   smashed to sand, and pours out of its frame. and a window near enough to where it hit is knocked out of the boards
   round it: a gable is solid timber, and its window is in the middle of it, so it is the shock that does it, not the
   lump going through. anything else stands it */
function handHit(g, f, sx, sy) {
  var c = f.c, gw = g.gw, gh = g.gh, R = H_PANE, hurt = [], k, X, Y, x, y, j, t, s;
  for (k = 0; k < c.length; k += 6) {
    if (!H_HARDM[c[k + 2]]) continue;
    X = f.x + c[k] + sx; Y = f.y + c[k + 1] + sy;
    if (X < 0 || X >= gw || Y < 0 || Y >= gh) continue;
    j = Y * gw + X; t = g.m[j];
    if ((AIRY[t] || LIQUID[t]) && !sandHeld(g, j)) continue;   /* (not what stopped it) */
    if (t === MAT.GLASS || t === MAT.STAINED) { if ((s = handWinOf(g, j, true))) hurt.push(s); heatSync(g, j); heatBecome(g, j, MAT.SAND); continue; }
    /* (a window in the house it hit: not one behind something else it hit, a wall or a screen standing in front of it) */
    for (y = Math.max(0, Y - R); y <= Math.min(gh - 1, Y + R); y++) for (x = Math.max(0, X - R); x <= Math.min(gw - 1, X + R); x++) {
      j = y * gw + x;
      if (g.m[j] !== MAT.PLANK || g.aux[j] !== 1 || !(s = handWinOf(g, j, false)) || X < s.x0 || X > s.x1 || Y < s.y0 || Y > s.y1) continue;
      handPane(g, j, X - sx, Y - sy, f); hurt.push(s);
    }
  }
  /* (whose window it was: they will have something to say about it. once a house a throw, however many panes) */
  for (k = 0; k < hurt.length; k++) if (hurt.indexOf(hurt[k]) === k) handDeed(g, bOwner(g, hurt[k]), "smashed");
}
/* whose window cell j is: the site that has it among its windows, or, for glass, among the glass it was built with */
function handWinOf(g, j, glass) {
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (s.win && s.win.indexOf(j) >= 0) return s;
    if (glass) for (var e = 0; e < s.plan.length; e++) if (s.plan[e].i === j && (s.plan[e].v === MAT.GLASS || s.plan[e].v === MAT.STAINED)) return s;
  }
  return null;
}
/* a window knocked out: a grain of itself, heat and all (as world.js sandFling takes one), starting from where the lump
   that hit it is, coming away from the wall and falling. its frame is left with a hole in it, to be mended */
function handPane(g, j, X, Y, f) {
  var v = g.m[j], q = partAdd(g, PK_DEBRIS, X + 0.5, Y + 0.5, -f.vx * 0.2, -0.5 - Math.abs(f.vy) * 0.2, 240, SAND_PAL[v][g.sh[j]], v);
  if (q < 0) return;
  heatSync(g, j);
  g.pt[q] = heatQ(g, j); g.ps[q] = g.sh[j];
  g.m[j] = MAT.EMPTY; g.aux[j] = 0; g.T[j] = AMBIENT; g.lat[j] = 0;
  heatAccept(g, j);
}
/* the end of a flight: the sites it took from are off hold. set down whole (f: where), the ones that came up whole are
   there now. whatever is left of the rest is looked over at the old place, as anything is: a few cells gone is a
   repair, most of it a ruin */
function handEnd(g, f) {
  var h = g.hand, moved = f ? handShift(g, f) : {}, k, s, w;
  for (k = 0; k < h.sites.length; k++) {
    w = h.sites[k]; s = bSite(g, w.id);
    if (!s) continue;
    /* (come apart in the air, most of it: what came down is a heap of what it was, wherever that is, and not it. bInspect
       would see the planks of it lying where its planks go and call it a few cells to mend) */
    if (!f && s.handH && w.n > H_RUIN * w.of) s.handX = 1;
    /* (dunked, and not moved: on hold a while longer, to see if it goes out) */
    delete s.handH;
    if (w.dunk && !moved[s.id]) { s.handD = 1; (h.dunks || (h.dunks = [])).push({ id: s.id, t: g.tick, e: w.dunk, n: w.n, of: w.of, d: s.doused || 0 }); continue; }   /* (its own hold, apart from any lift's) */
    /* (one all there is not a house that flew, if it is lost later. nor is one the hand took a bite of, or only went near:
       whatever ruins that, it was not the hand. handB: it was on fire when it went up) */
    if (moved[s.id] || (f && handWhole(g, s))) { delete s.handT; delete s.handB; }   /* (all there where it stands: put back as it was) */
    else if (w.n > H_RUIN * w.of) { s.handT = g.tick; if (w.burn) s.handB = 1; else delete s.handB; }
  }
  h.sites = [];
}

/* the dunked, every ten ticks: out (the embers it carried down, and anything still alight where it stood), and it was
   the lake, unless the brigade had a few buckets on what was left; still burning after H_DOUSED, it was not. either way
   it comes off hold then, as handEnd would have left it */
function handDunks(g) {
  var h = g.hand, k, D, s, lit, e, d, j;
  for (k = h.dunks.length - 1; k >= 0; k--) {
    D = h.dunks[k]; s = bSite(g, D.id); lit = s ? iFlames(g, s).length : 0;
    if (D.no) lit = 1;   /* (its fire taken back up: judged now, and nobody's) */
    for (e = 0; s && !lit && e < D.e.length; e++) for (d = 0; d < 9 && !lit; d++) {
      j = D.e[e] + ((d % 3) - 1) + (((d / 3) | 0) - 1) * g.gw;
      if (j >= 0 && j < g.m.length && (g.m[j] === MAT.EMBER || g.m[j] === MAT.FIRE)) lit++;
    }
    if (s && lit && !D.no && g.tick - D.t < H_DOUSED) continue;
    h.dunks.splice(k, 1);
    if (!s) continue;
    delete s.handD;
    if (!lit && (s.doused || 0) - D.d < 3) handPutOut(g, s);
    if (D.n > H_RUIN * D.of) { s.handT = g.tick; s.handB = 1; }   /* (it went up on fire: not booked, if it is gone) */
  }
}
/* every cell of it what its plan says, where it is */
function handWhole(g, s) {
  for (var k = 0; k < s.plan.length; k++) if (s.plan[k].v !== MAT.EMPTY && !bOk(g, s.plan[k])) return false;
  return true;
}

/* -------------------------------------------------------------------
   SITES GO WITH IT
   ------------------------------------------------------------------- */
/* set down whole: which of the sites it took from are the same thing here now, and moving them. it is one move for the
   whole lump, from where it was lifted to where it came down. {id: 1} for each one that is all there, where it is now
   (moved, or put back just where it was) */
function handShift(g, f) {
  var h = g.hand, gw = g.gw, moved = {}, C = [], inC = {}, burn = {}, k, j, s, w;
  if (f.ax == null) return moved;   /* (a lump in the air in a save from before sites moved with it) */
  var DX = f.x - f.ax, DY = f.y - f.ay, d = DX + DY * gw;
  /* the ones that could: whole, finished, small, and not drowned */
  for (k = 0; k < h.sites.length; k++) {
    w = h.sites[k]; s = bSite(g, w.id);
    if (s && handCan(g, s, w, DX, DY)) { C.push(s); if (w.burn || w.flood) burn[s.id] = 1; }   /* (out of a fire, or a flood) */
  }
  if (!DX && !DY) { for (k = 0; k < C.length; k++) moved[C[k].id] = 1; return moved; }   /* (put back where it was) */
  /* and of those, the ones not set down on somebody else's: a house in a field is a mess in a field. (what moves with
     it is no matter, it moves the same way. one that cannot go stays, and then it is somebody else's, to the rest) */
  for (var again = true; again;) {
    again = false;
    for (k = C.length - 1; k >= 0; k--) if (handBoxHit(g, C[k], C, DX, DY)) { C.splice(k, 1); again = true; }
  }
  if (!C.length) return moved;
  for (k = 0; k < C.length; k++) { bMark(g, C[k], 0); inC[C[k].id] = 1; }
  for (k = 0; k < C.length; k++) {
    s = C[k];
    for (j = 0; j < s.plan.length; j++) s.plan[j].i += d;
    s.x0 = clamp(s.x0 + DX, 0, gw - 1); s.x1 = clamp(s.x1 + DX, 0, gw - 1); s.cx += DX;   /* (its box, which can reach past its cells, kept in the valley) */
    s.y0 = clamp(s.y0 + DY, 0, g.gh - 1); s.y1 = clamp(s.y1 + DY, 0, g.gh - 1); s.cy += DY;
    ["F", "G", "iy0"].forEach(function (n) { if (s[n] != null) s[n] += DY; });
    ["ix0", "ix1", "px"].forEach(function (n) { if (s[n] != null) s[n] += DX; });
    if (s.bed) s.bed = { x: s.bed.x + DX, y: s.bed.y + DY };
    if (s.win) s.win = s.win.map(function (i) { return i + d; });
    delete s.tdoors;   /* (where its doors are, worked out once: tidy.js) */
    /* (a scarecrow carried off out of sight of its field is not that field's any more: it may have another. ideas.js) */
    if (s.kind === "scarecrow" && s.farm != null) { var fm = bSite(g, s.farm); if (!fm || Math.abs(clamp(s.cx, fm.x0, fm.x1) - s.cx) >= 22 || Math.abs(clamp(s.cy, fm.y0, fm.y1) - s.cy) >= 16) delete s.farm; }   /* (iScarecrowNear's reach, along and up) */
    moved[s.id] = 1;
    /* (the way home, or to bed, or to work on it, goes somewhere else now) */
    for (j = 0; j < g.peasants.length; j++) {
      var nv = g.peasants[j].nav;
      if (nv && (nv.key === "home" + s.id || nv.key === "bed" + s.id || nv.key === "b" + s.id)) g.peasants[j].nav = null;
    }
    var o = bOwner(g, s);
    var why = s.kind !== "house" || !o ? "" : f.rode && f.rode.indexOf(o.id) >= 0 ? ", and " + pTitle(o.short) + " with it" : ". " + pTitle(o.short) + " was not asked";
    if (!(s.kind === "lamp" && inC[s.home])) feed(g, iCap(bLabel(s)) + " has moved" + why, "#e0c890", "hand" + s.id, s);   /* (a house's lanterns go with it, and that is not news) */
    if (s.kind === "house") { wTale(g, "moved", o, bLabel(s), s.cx, s.y1); handDeed(g, o, burn[s.id] ? "rescued" : "moved"); }   /* (out of a fire, or out of the water, is another matter) */
  }
  for (k = 0; k < g.sites.length; k++) bMark(g, g.sites[k], 1);   /* (as bRemove does: where two plans shared a cell) */
  lMarkMen(g);
  return moved;
}
/* could site s, of which w says how much came up, be the same thing moved by (DX, DY): one of the small things, finished
   when it was lifted (so on hold), nearly all of it in the lump, not a flat or under one, not on a platform, not a
   great work; all of it still inside the valley; and a house not at the bottom of the lake */
function handCan(g, s, w, DX, DY) {
  var gw = g.gw, gh = g.gh, k, x, y;
  if (!H_MOVES[s.kind] || !s.handH || w.of < 2 || w.n < H_WHOLE * w.of || s.deck || s.wonder || sOver(g, s)) return false;
  for (k = 0; k < s.plan.length; k++) {
    x = s.plan[k].i % gw + DX; y = ((s.plan[k].i / gw) | 0) + DY;
    if (x < 0 || x >= gw || y < 0 || y >= gh) return false;
  }
  if (s.kind === "house" && s.bed && LIQUID[pCell(g, s.bed.x + DX, s.bed.y + DY - 1)]) return false;
  return true;
}
/* would s, moved by (DX, DY), be on another site that is staying where it is: a cell of the one inside the box of the
   other, either way. (the ones in C are moving with it) */
function handBoxHit(g, s, C, DX, DY) {
  var gw = g.gw, k, j, t, x, y;
  var x0 = s.x0 + DX, x1 = s.x1 + DX, y0 = s.y0 + DY, y1 = s.y1 + DY;
  for (k = 0; k < g.sites.length; k++) {
    t = g.sites[k];
    if (C.indexOf(t) >= 0) continue;
    for (j = 0; j < s.plan.length; j++) {
      x = s.plan[j].i % gw + DX; y = ((s.plan[j].i / gw) | 0) + DY;
      if (x >= t.x0 && x <= t.x1 && y >= t.y0 && y <= t.y1) return true;
    }
    for (j = 0; j < t.plan.length; j++) {
      x = t.plan[j].i % gw; y = (t.plan[j].i / gw) | 0;
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return true;
    }
  }
  return false;
}
/* running after their house (ideas.js iTask): under it, as near as they can get, shouting, as long as it is in the
   hand or in the air. a route is asked for again only every eight columns it goes. over when it comes down, or the
   house is not a house any more, or they are on it, or on fire, or it has been a long time */
function handTask(g, p, k) {
  if (k.kind === "thank") return handTaskThank(g, p, k);   /* (and going to leave something out for it) */
  if (k.kind !== "chase") return undefined;
  var h = g.hand, L = h && (h.held || h.fly);
  if (!L || h.lifts !== k.lift || !bSite(g, k.site) || ++k.t > H_LONG || p.ride || p.fire) return iDone(p, true);
  var x = L.x, key = "chase" + (x >> 3);
  if (k.t % 150 === 1) pSay(g, p, "handChase", true);
  if (Math.abs(p.x - x - 0.5) > 3) {
    if (k.key !== key) { k.key = key; k.best = null; k.since = 0; }   /* (it moved: closer to where it is now is closer) */
    if (iWalk(g, p, k, key, x, Math.floor(p.y), function (X) { return Math.abs(X - x) <= 3; })) return iDone(p, false);
    return false;
  }
  k.best = null;
  p.dir = x + 0.5 < p.x ? -1 : 1; p.pose = "panicA";
  return true;
}
/* a house that flew is gone (build.js bInspect, within H_LONG of the flight's end, and not moved): that is the tale of
   it, not that it burned down. true if it was told */
function handRuined(g, s, o) {
  if (s.kind !== "house") return false;
  wTale(g, "flew", o, bLabel(s), s.cx, s.y1);
  if (!s.handB) handDeed(g, o, "wrecked");   /* (one that went up on fire: the fire had it already) */
  return true;
}

/* -------------------------------------------------------------------
   WHAT THEY MAKE OF IT
   ------------------------------------------------------------------- */
/* a deed of the hand's, booked: to whoever it was done to (p, or nobody), and to the village. nothing rolled */
function handDeed(g, p, d) {
  var h = g.hand, D = H_DEEDS[d];
  if (!h || !D) return;
  if (p && D[0]) p.feel = clamp((p.feel || 0) + D[0], -H_FEEL, H_FEEL);
  h.kind += D[1]; h.cruel += D[2];
  if (h.cruel >= 10 && h.kind * 3 <= h.cruel) achieve(g, "wrath");
  if (h.kind >= 10 && h.cruel * 3 <= h.kind) achieve(g, "kindly");
}
/* what somebody thinks of it: their own mind, if they have made one up, or else the village's, if the village has */
function handView(g, p) {
  if (p.feel) return p.feel;
  var h = g.hand, d = h ? h.kind - h.cruel : 0;
  return d >= H_SAYS ? 1 : d <= -H_SAYS ? -1 : 0;
}
/* out and about with nothing much to do: free to stop and look */
function handFree(g, p) {
  return !p.dead && p.state === "walk" && !p.ride && p !== g.held && !p.aboard && !(p.sleep > 0) && !p.fire && !(p.panic > 0) && !(p.stun > 0) &&
         (!p.task || I_FUN[p.task.kind]);
}
/* the ground going up: whoever is about, near enough, stops and looks, and says so (three of them, at most). not at every
   press: only for a lift that takes something of somebody's, or somebody, or the first in a while to have anybody see it.
   moving the sand about all afternoon is not a show every time */
function handWitness(g, H, show, say) {
  var h = g.hand, n = 0, k, p;
  if (!H.c.length || (!show && g.tick - (h.wT == null ? -1e9 : h.wT) < H_QUIET)) return;
  for (k = 0; k < g.peasants.length; k++) {
    p = g.peasants[k];
    if (!handFree(g, p) || Math.abs(p.x - H.x - 0.5) > H_LOOK) continue;
    p.idle = Math.max(p.idle || 0, 60); p.handSeen = h.lifts; p.handLook = g.tick; p.dir = H.x + 0.5 < p.x ? -1 : 1;
    if (n++ < 3) pSay(g, p, say, true);
  }
  if (n) h.wT = g.tick;
}
/* a house up in the hand, or flying (enough of it to run after: H_CHASE), is not there to hide in. the hole it came out
   of has no door. (build.js bHide) */
function handAway(g, s) {
  var h = g.hand, k;
  if (!s.handH || !h || !(h.held || h.fly)) return false;
  for (k = 0; k < h.sites.length; k++) if (h.sites[k].id === s.id) return h.sites[k].n >= H_CHASE * h.sites[k].of;
  return false;
}
/* a lump hanging over them (every ten ticks): the afraid run for home and shut the door. (the hand can lift the house.
   they have not thought of that yet.) everybody else, at a loose end, stops and looks up, once a lift, and one in ten
   says something. a long hover is a show each passer-by stops for once, not a spell on the village. (and the sand going
   up and down, press after press, over somebody's head: they looked the last time, and the time before. once in a
   while, as the lift's witnesses are) */
function handHover(g, H) {
  var h = g.hand, c = H.c, k, p, o;
  if (!c.length) return;
  var b = handBox(c), x0 = H.x + b[0] - 2, x1 = H.x + b[1] + 3, top = H.y + b[2], mid = H.x + (b[0] + b[1] + 1) / 2;
  for (k = 0; k < g.peasants.length; k++) {
    p = g.peasants[k];
    if (p.dead || p.ride || p.state !== "walk" || p === g.held || p.aboard || p.sleep > 0 || p.fire) continue;
    if (p.x < x0 || p.x >= x1 || p.y < top) continue;
    if (handView(g, p) < 0) {
      /* (indoors already, or busy with a fire, or after their own house: not now) */
      if (((o = bHome(g, p)) && bInside(o, p)) || (p.task && (p.task.kind === "bucket" || p.task.kind === "chase"))) continue;
      /* (afraid of this one a good while, and still out under it: there is no getting in, from where they are. they get
         used to it, as an owner gives up the chase, and get on. a fright that keeps them at the door for ever is a
         peasant starved under a lump) */
      if (p.handFear !== h.lifts) { p.handFear = h.lifts; p.handFearT = g.tick; }
      else if (g.tick - p.handFearT > H_LONG) continue;
      if (!(p.panic > 0)) pSay(g, p, "handGrudge", true);
      p.panic = Math.max(p.panic, 120); p.idle = 0; p.dir = p.x < mid ? -1 : 1;
      /* (and home is what is up there: out from under it, the nearer way, not home. bHide passes it over) */
      if (o && handAway(g, o)) p.handOut = g.tick + 60;
    } else if (p.handSeen !== h.lifts && (H.show || !(g.tick - p.handLook < H_QUIET)) && handFree(g, p)) {
      p.handSeen = h.lifts; p.handLook = g.tick; p.idle = Math.max(p.idle || 0, 30); p.dir = mid < p.x ? -1 : 1;
      if (handView(g, p) > 0) p.ask = Math.max(p.ask || 0, 30);   /* (and those who think well of it wave) */
      if (Math.random() < 0.1) pSay(g, p, "handUnder", true);
    }
  }
}

/* -------------------------------------------------------------------
   THE SKY ANSWERS
   ------------------------------------------------------------------- */
/* water from the sky: a wet cell of the lump, put down or come down at (x, y), in the box of something on fire (as
   ideas.js iFlames looks for its flames), or over it: water put down on a roof pours down it. if that fire goes out
   soon after, it was the sky that put it out. (looked at only while something is on fire, against a handful of boxes) */
function handDouse(g, c, x, y, quench) {
  if (!g.blaze.length) return;
  for (var b = 0; b < g.blaze.length; b++) {
    var s = bSite(g, g.blaze[b].site);
    if (!s) continue;
    /* (and a flame it was put down on, in the fire's reach: water on it, though the water is where it was now) */
    if (quench && quench.some(function (j) { var qx = j % g.gw, qy = (j / g.gw) | 0; return qx >= s.x0 - 2 && qx <= s.x1 + 2 && qy >= s.y0 - 3 && qy <= s.y1 + 1; })) {
      s.handWet = g.tick; s.handWetD = s.doused || 0; continue;
    }
    for (var k = 0; k < c.length; k += 6) {
      if (!WET[c[k + 2]]) continue;
      var X = x + c[k], Y = y + c[k + 1];
      if (X < s.x0 - 2 || X > s.x1 + 2 || Y < s.y0 - H_OVER || Y > s.y1 + 1 || !handReach(g, s, X, Y)) continue;
      s.handWet = g.tick; s.handWetD = s.doused || 0;   /* (and how many buckets were on it by then) */
      break;
    }
  }
}
/* can water at (X, Y), near site s on fire, get at the fire: in it; or, going down, to fire, or into it, before anything
   that never moves (a tray, a ledge: STILL); or, going across to its wall, to fire before any such thing, or to the wall
   itself with nothing standing in it (a wall standing keeps it out; a burning one does not). a pond's own bed, which
   pours, is no tray */
function handReach(g, s, X, Y) {
  var gw = g.gw, inX = X >= s.x0 && X <= s.x1, x, y, m, d;
  if (inX && Y >= s.y0) return true;
  for (y = Math.max(Y + 1, 0); y <= s.y1 + 1 && y < g.gh; y++) {
    m = g.m[y * gw + X];
    if (m === MAT.FIRE || m === MAT.EMBER) return true;
    if (m !== MAT.EMPTY && STILL[m]) break;
    if (inX && y >= s.y0) return true;
  }
  if (inX || Y < s.y0) return false;   /* (over it, and held up: across the top of its wall is not into it) */
  for (d = X < s.x0 ? 1 : -1, x = X + d; d > 0 ? x <= s.x0 : x >= s.x1; x += d) {
    m = pCell(g, x, Math.max(Y, 0));
    if (m === MAT.FIRE || m === MAT.EMBER) return true;
    if (m !== MAT.EMPTY && STILL[m]) return false;
  }
  return true;
}
/* the sky put the fire out (ideas.js ideasStep, where the flames are found gone; or the dunk). the news, in place of the
   brigade's; the owner thinks the world of it, and so does whoever asked; and the owner (or, with no owner, whoever
   asked) will leave something out for it. once a fire */
function handSky(g, s) {   /* (the fire found out, here or by bInspect: the sky's, if its water was on this fire, lately, and the brigade had not a few on it since) */
  if (!(s.burning && s.handWet >= s.burning && g.tick - s.handWet < H_DOUSED && (s.doused || 0) - (s.handWetD || 0) < 3)) return false;
  handPutOut(g, s);
  return true;
}
function handPutOut(g, s) {
  if (!g.hand || s.handSaved === s.burning) return;
  s.handSaved = s.burning; delete s.handWet; delete s.handWetD; s.doused = 0;
  var o = bOwner(g, s), wish = s.wishT >= s.burning, q = wish ? handPid(g, s.wishP) : null;
  feed(g, "the sky put out the fire at " + bLabel(s) + (wish ? ". ANSWERED" : ""), "#9ad0ff", "blaze" + s.id);
  handDeed(g, o, "putout");
  if (q && q !== o) handDeed(g, q, "answered");
  wTale(g, "saved", o, bLabel(s), s.cx, s.y1);
  var t = o || q || handNearest(g, s);   /* (one thank-you for each fire: owed, and counted. a hut nobody lives in, and nobody asked: whoever lives nearest) */
  if (t) { t.owed = (t.thank != null && g.tick - t.thank <= H_THANKS ? (t.owed || 1) : 0) + 1; t.thank = g.tick; }
}
/* whoever lives nearest a site (by their home, or, with none, where they are): who would see to thanking it for a hut
   that is nobody's */
function handNearest(g, s) {
  var best = null, bd = 1e9, k, p, o, d;
  for (k = 0; k < g.peasants.length; k++) {
    p = g.peasants[k];
    if (p.dead || p.state === "space") continue;
    o = bHome(g, p);
    if ((d = Math.abs((o ? o.cx : p.x) - s.cx)) < bd) { bd = d; best = p; }
  }
  return best;
}
/* nothing to fill a pail from, this side of the fire (ideas.js iUrgent): somebody who thinks well of the hand looks up
   and asks it. arms up, and kept there. once a fire */
function handWish(g, p, s) {
  if (!s || handView(g, p) <= 0 || s.wishT >= s.burning) return;
  s.wishT = g.tick; s.wishP = p.id; p.ask = H_ASK; p.asks = 1;
  feed(g, p.name + " looks up. 'water, please. from anywhere'", "#9ad0ff", "wish" + s.id, p);
  pSay(g, p, "handWish", true);
}
/* the fire is out, and they are at a loose end (ideas.js iPick): the best they have, out of their pocket, put down
   where the sky can see it. a nugget of gold, or a lump of coal if that is what there is: they go and find somewhere
   open to the sky, the nearest, and leave it there. with nothing in their pocket, a wave, there and then. nothing is
   made: what is on the hill came out of somebody's pocket. true if they are doing it */
function handThank(g, p) {
  if (!g.hand || g.tick - p.thank > H_THANKS) { delete p.thank; delete p.owed; delete p.thankNo; return false; }
  if (!((p.gold || 0) >= 1 || (p.coal || 0) >= 1)) { handLeave(g, p, -1); return true; }
  var fx = Math.floor(p.x), fy = Math.floor(p.y), d, k, x, Y;
  for (d = 1; d <= H_FAR; d++) for (k = 0; k < 2; k++) {
    x = fx + (k ? -p.dir : p.dir) * d;
    for (Y = fy - 8; Y <= fy + 8; Y++) if (handSkyAt(g, x, Y) && !(p.thankNo && p.thankNo.indexOf(Y * g.gw + x) >= 0)) {   /* (not where they could not get to before) */
      p.task = { kind: "thank", x: x, y: Y, t: 0, act: 0 }; p.idle = 0;
      (p.thankNo || (p.thankNo = [])).push(Y * g.gw + x);   /* (tried: next time, if this does not come to anything, somewhere else) */
      if (p.thankNo.length > 8) p.thankNo.shift();
      return true;
    }
  }
  return false;   /* (nowhere near with the sky over it: later, from somewhere else) */
}
/* somewhere to leave it: an empty cell on something, nobody's, open to the sky for H_SKY rows, with room to stand at it */
function handSkyAt(g, x, y) {
  var gw = g.gw, top, r;
  if (x < 2 || x > gw - 3 || y < 1 || y + 1 >= g.gh || g.m[y * gw + x] !== MAT.EMPTY || !pSolid(g, x, y + 1) || bSiteAround(g, x, y, null, 1)) return false;
  if (!(pRoom(g, x - 1, y) && pSolid(g, x - 1, y + 1)) && !(pRoom(g, x + 1, y) && pSolid(g, x + 1, y + 1))) return false;
  top = Math.max(0, y - H_SKY);
  for (r = y - 1; r >= top && AIRY[g.m[r * gw + x]]; r--);
  return r < top;
}
/* going to leave it (iTask, through handTask): there, beside it, and it is left. (if it is not somewhere to leave it any
   more, or they cannot get there, they will think of somewhere else: the thank-you is still owed) */
function handTaskThank(g, p, k) {
  if (++k.t > H_LONG) return iDone(p, false);
  var fy = Math.floor(p.y), fx = Math.floor(p.x);
  if (Math.abs(fx - k.x) !== 1 || Math.abs(fy - k.y) > 1) {
    if (iWalk(g, p, k, "thank" + k.x, k.x, k.y, function (X, Y) { return Math.abs(X - k.x) === 1 && Math.abs(Y - k.y) <= 1; })) { pGiveUp(g, p, k.x); return iDone(p, false); }
    return false;
  }
  if (!handSkyAt(g, k.x, k.y) || !((p.gold || 0) >= 1 || (p.coal || 0) >= 1)) return iDone(p, false);
  handLeave(g, p, k.y * g.gw + k.x);
  return iDone(p, true);
}
/* the thank-you: at cell j, the best in their pocket; or (j < 0, or nothing in it) a wave */
function handLeave(g, p, j) {
  var h = g.hand, gw = g.gw, m = j < 0 ? 0 : (p.gold || 0) >= 1 ? MAT.GOLD : (p.coal || 0) >= 1 ? MAT.COAL : 0;
  if ((p.owed || 1) > 1) { p.owed--; p.thank = g.tick; } else { delete p.thank; delete p.owed; delete p.thankNo; }   /* (and another still to come, if two were put out) */
  p.idle = Math.max(p.idle || 0, 60);
  pSay(g, p, "handThank", true);
  if (!m) {
    p.ask = H_WAVE;
    feed(g, p.name + " waved at the sky. it is all they had", "#e0c890", "thank" + p.id, p);
    return;
  }
  if (m === MAT.GOLD) p.gold--; else p.coal--;
  sandSet(g, j, m); heatAccept(g, j);
  p.dir = (j % gw) + 0.5 < p.x ? -1 : 1;
  sparks(g, (j % gw) + 0.5, ((j / gw) | 0) + 0.5, 5, 0.4, [hex32("#fff6c0"), SAND_PAL[m][0]], 10, 0.2, PK_GLINT);
  h.gifts.push({ i: j, m: m, who: p.id });
  if (h.gifts.length > H_GIFTS) h.gifts.shift();
  feed(g, p.name + (m === MAT.GOLD ? " left a nugget of gold for the hand" : " left a lump of coal for the hand. it is what they had"), "#e0c890", "thank" + p.id, j % gw);
}

/* CLEAR: the valley is emptied, not your hand. a lump held is kept, riders and all; one in the air came from a valley
   that is not there any more, and goes, and whoever was on it drops into the empty room */
function handClear(g) {
  var h = g.hand, k, p, d;
  h.sites = []; h.gifts = []; h.dunks = [];
  for (k = 0; k < g.peasants.length; k++) if (g.peasants[k].task && g.peasants[k].task.kind === "chase") g.peasants[k].task = null;   /* (there are no houses to run after) */
  if (!h.fly) return;
  h.fly = null;
  for (k = 0; k < g.peasants.length; k++) {
    p = g.peasants[k];
    if (!p.ride) continue;
    delete p.ride;
    if (p.dead || p.state !== "held") continue;
    p.state = "fly"; p.flyT = 0; p.vx = p.vy = 0; p.fallY = p.y; p.immune = 4;
  }
  for (k = 0; k < g.ducks.length; k++) {
    d = g.ducks[k];
    if (!d.ride) continue;
    delete d.ride;
    if (d.dead || d.state !== "held") continue;
    d.state = "thrown"; d.flyT = 0; d.vx = d.vy = 0;
  }
}

/* -------------------------------------------------------------------
   DRAWING (nothing in here rolls a die)
   ------------------------------------------------------------------- */
/* the lump, as it was, where it is: its own colours, and its own heat's glow. and its shadow on whatever is under it */
function handDraw(g, X0, X1, thermal) {
  var h = g.hand, L = h && (h.held || h.fly);
  if (!L) return 0;
  var c = L.c, gw = g.gw, gh = g.gh, px = g.px, gp = g.gpx, hot = 0, low = {}, k, X, Y, i, v, t, col, f;
  if (X0 == null) { X0 = 0; X1 = gw; }
  for (k = 0; k < c.length; k += 6) { X = L.x + c[k]; Y = L.y + c[k + 1]; if (low[X] == null || Y > low[X]) low[X] = Y; }
  if (!thermal) for (var key in low) {
    X = +key;
    if (X < X0 || X >= X1) continue;
    for (Y = Math.max(0, low[key] + 1); Y < gh; Y++) { i = Y * gw + X; if (SOLID[g.m[i]]) { px[i] = mix32(px[i], 0xff000000); break; } }
  }
  for (k = 0; k < c.length; k += 6) {
    X = L.x + c[k]; Y = L.y + c[k + 1];
    if (X < X0 || X >= X1 || Y < 0 || Y >= gh) continue;
    i = Y * gw + X; v = c[k + 2];
    t = AMBIENT + (c[k + 5] - heatH0(v, c[k + 3], c[k + 4])) * HEAT_IC[v];
    if (thermal) { px[i] = blend32(thermCol(t), SAND_PAL[v][c[k + 4]], 0.16); continue; }
    if (v === MAT.LAVA) { px[i] = gp[i] = lavaCol(t, c[k + 3], SAND_PAL[v][c[k + 4]]); hot++; continue; }
    if (v === MAT.PLANK && c[k + 3] === 1) col = WIN_DARK;
    else if (v === MAT.STAINED) col = SAND_PAL[v][c[k + 3] % 3];
    else if (v === MAT.DOOR && c[k + 3] === 5) col = DOOR_KNOB;
    else col = SAND_PAL[v][c[k + 4]];
    if (v === MAT.EMBER || v === MAT.LAMP || v === MAT.TORCH) { gp[i] = col; hot++; }
    else if (t > 450) { f = glowMix(t); col = blend32(col, glowCol(t), f); if (t > 560) { gp[i] = blend32(0xff000000, col, f); hot++; } }
    px[i] = col;
  }
  return hot;
}
