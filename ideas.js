/* =====================================================================
   PLEASAND  --  ideas.js

   a peasant with a full stomach has time to think. every tick spent
   well fed (and not frightened, freezing or asleep) goes towards a
   bright idea; at home, by a campfire, holding a fishing rod or by
   lamplight it goes twice as fast. when it comes, a light bulb goes on
   over their head, the village hears about it, and they know it from
   then on, all of them. an idea needs something to have put it into
   somebody's head: nobody thinks of buckets until something has gone
   up in flames, or of gravestones until somebody has died.

   what they think of, and what comes of it:
     FARMING     a field: sand tilled into dark earth and sown with
                 wheat, which grows (faster with water about: it drinks
                 what falls on it), ripens from the ear down, and is
                 eaten, all of it, after which the field is sown again.
                 it takes no wood, so anybody lends a hand
     LANTERNS    a lantern on a bracket by each door of their house,
                 which burns all night (it is always night)
     THE BUCKET  a fire at anything they built and everybody who is
                 only doing something for fun grabs a bucket, fills it
                 at the pond and throws it on. on a quiet day they
                 water the wheat with them. the alarm gets everybody
                 out of a burning house, and anybody on fire is run at
                 with a bucket (and runs at it)
     GRAVESTONES a wooden cross for everybody who died, in a row,
                 saying how. now and then somebody visits, and leaves
                 a flower
     FISHING     a jetty out over the pond, and somebody on the end of
                 it with a rod: a fish (or a boot, or a duck)
     SCARECROWS  the ducks like the wheat too. not with this about
     FIREWORKS   once the village has a few houses and a few ideas: now
                 and then, a show, and everybody comes to watch

   everything they build is a site, the same as a house (build.js): a
   plan, a blueprint, repairs, ruins.
   ===================================================================== */
"use strict";

var I_FED = 1200;           /* hunger under this: well fed */
var I_MUSE = 900;           /* ticks spent well fed before a bright idea */
var I_BULB = 150;           /* how long the bulb burns over their head */
var I_GAP = 2400;           /* ticks after one idea before the village is ready for another */
var I_CROP_H = 4;           /* how tall wheat grows (give or take a couple) */
var I_FARM_W = 11;          /* a field, across */
var I_GRAVE_GAP = 5;        /* from one cross to the next */
var I_FEST_GAP = 5400;      /* ticks between fireworks shows, at the least */
var I_LOAD = 5;             /* cells of water to a bucket */

P_SAY.idea_farm = ["what if the plants... came to us?", "plants. in rows. on purpose", "i've had an idea. FARMING",
  "food that stays where you put it"];
P_SAY.idea_lamp = ["it's always dusk here. LANTERNS", "a light by the door!", "let there be light",
  "like a window, but outside"];
P_SAY.idea_bucket = ["what if we put the water ON the fire", "a BUCKET. for WATER", "water goes on fire. i'm a genius",
  "a hat for carrying ponds"];
P_SAY.idea_grave = ["we should remember them", "they deserve a proper send-off", "somewhere to visit them",
  "a little cross. with their name on"];
P_SAY.idea_fish = ["there must be food in that pond", "a stick, a string... FISH", "the ducks know something we don't",
  "what if we sat by the water. for food"];
P_SAY.idea_scarecrow = ["a pretend peasant, to scare the ducks", "the ducks fear only one thing. us",
  "what if we made a fake me. out of sticks"];
P_SAY.idea_festival = ["what if fire... but pretty", "we should celebrate something", "a party! with explosions!",
  "what if the sky... went bang"];
P_SAY.genius = ["genius!", "ooh", "why didn't i think of that", "brilliant", "that's mad. i love it", "hm. could work",
  "they're so smart"];
P_SAY.blank = ["i had an idea. it's gone", "what if... no", "i've been thinking", "hmm. hmmm", "i almost had it",
  "what if pixels... no"];
P_SAY.helpFarm = ["i'll help with the field!", "hoe, hoe, hoe", "farm work!", "many hands, more wheat", "pass me a hoe"];
P_SAY.planFarm = ["a field, right here", "this'll grow lovely", "i'm going to be a farmer", "rows. lots of rows"];
P_SAY.till = ["*hoe*", "turn it over", "nice dirt", "good soil, this", "dig, rake, repeat"];
P_SAY.sow = ["one for the ducks, one for me", "*sow*", "grow, little seeds", "in you go"];
P_SAY.sown = ["all sown", "now we wait", "grow!", "back to work, wheat"];
P_SAY.wheat = ["fresh wheat!", "home grown", "farm to table", "crunchy", "needs butter", "i grew that. sort of"];
P_SAY.raid = ["OI! THAT'S OUR WHEAT", "SHOO", "get off the wheat!", "the ducks are eating the farm", "DUCK! BAD DUCK"];
P_SAY.brigade = ["FIRE! BUCKETS!", "get the buckets!", "bucket brigade!", "WATER! WATER!", "everybody grab a bucket"];
P_SAY.fill = ["*slosh*", "fill her up", "got water!", "*glug glug*"];
P_SAY.douse = ["SPLASH", "take that, fire", "hyup!", "*sploosh*", "and another"];
P_SAY.evac = ["FIRE! GET OUT!", "THE HOUSE IS ON FIRE", "OUT OUT OUT", "my HOUSE", "everybody out!", "not the bed!"];
P_SAY.out = ["it's out!", "phew", "fire's out", "we did it", "good bucketing, everyone"];
P_SAY.nowater = ["no water this side!", "where's the pond?", "we need a pond", "somebody get water!"];
P_SAY.water = ["watering the wheat", "drink up, little plants", "grow, wheat, grow", "*sprinkle*"];
P_SAY.cast = ["*plip*", "here, fishy fishy", "gone fishing", "shh. fishing", "this is the life"];
P_SAY.nibble = ["ooh, a nibble", "something's biting", "steady...", "shh!"];
P_SAY.fish = ["a fish!", "dinner!", "got one!", "look at the size of it", "FISH!", "it's a beauty"];
P_SAY.boot = ["an old boot", "a boot. again", "who throws boots in a pond?", "i'll take it", "half a pair"];
P_SAY.cooked = ["it's already cooked!", "poached!", "fish soup", "the pond's too hot. but tasty"];
P_SAY.duckbite = ["NOT THE DUCK", "i caught a duck", "sorry, duck", "that's not a fish", "let go, duck"];
P_SAY.nofish = ["nothing's biting", "maybe tomorrow", "the fish are asleep", "the one that got away"];
P_SAY.frozen = ["it's frozen solid", "no fishing today", "the fish are under the ice"];
P_SAY.planJetty = ["a jetty, for fishing off", "planks, out over the water", "i'll build us a jetty"];
P_SAY.planLamp = ["a lantern by the door", "lights for the house", "no more stubbed toes"];
P_SAY.planGrave = ["for {d}", "rest easy, {d}", "a cross for {d}", "we'll remember you, {d}"];
P_SAY.visit = ["i miss {d}", "rest easy, {d}", "{d} owed me money", "{d} was one of the good ones", "hello, {d}",
  "{d} would have loved this weather", "brought you a flower, {d}", "it's quiet without {d}"];
P_SAY.planCrow = ["a scarecrow, for the ducks", "this'll show 'em", "a fake me. nobody tell the ducks"];
P_SAY.crowWorks = ["ha! it works", "go on, shoo", "scared of a stick", "good scarecrow"];
P_SAY.festival = ["FIREWORKS!", "everybody, come and see!", "stand back!", "who wants a show?", "festival!"];
P_SAY.fuse = ["*fizz*", "light the blue paper", "and... stand back", "here we go"];
P_SAY.finale = ["GRAND FINALE!", "the big one!", "all of them at once!"];

P_ACHIEVE.harvest = ["HARVEST", "somebody ate the wheat. it was grown to be eaten"];
P_ACHIEVE.farm = ["THE FIRST FIELD", "tilled, sown, and now: the waiting"];
P_ACHIEVE.lamp = ["LIGHTS ON", "a lantern by the door. cosy"];
P_ACHIEVE.brigade = ["FIRE BRIGADE", "the village has a fire brigade now. it is buckets"];
P_ACHIEVE.grave = ["REST IN PEACE", "the village remembers"];
P_ACHIEVE.jetty = ["THE JETTY", "a plank walk out over the water, for fishing off"];
P_ACHIEVE.fish = ["GONE FISHING", "a peasant caught a fish. with a stick"];
P_ACHIEVE.scarecrow = ["SCARECROW", "the ducks are not impressed. well, a bit"];
P_ACHIEVE.festival = ["FESTIVAL", "the village put on a fireworks show. on purpose"];
P_ACHIEVE.enlightened = ["AGE OF ENLIGHTENMENT", "the village has had every idea there is. for now"];

/* what they can think of, in the order they tend to think of it. ready: has anything happened to put it into their
   heads yet */
var IDEAS = [
  { id: "farm", name: "farming", title: "FARMING", sub: "what if the plants came to us?", hint: "full stomachs",
    ready: function () { return true; } },
  { id: "lamp", name: "the lantern", title: "LANTERNS", sub: "it is always dusk here. a light by every door", hint: "a house",
    ready: function (g) { return iHouses(g) > 0; } },
  { id: "bucket", name: "the bucket", title: "THE BUCKET", sub: "water goes on fires. we have a fire brigade", hint: "a fire",
    ready: function (g) { return g.burnt; } },
  { id: "grave", name: "the gravestone", title: "GRAVESTONES", sub: "somewhere to remember them by", hint: "a loss",
    ready: function (g) { return g.dead.length > 0; } },
  { id: "fish", name: "fishing", title: "FISHING", sub: "a stick, a string, and a jetty out over the pond", hint: "a good pond",
    ready: function (g, p) { return !!iJettySpot(g, p, 220); } },
  { id: "scarecrow", name: "the scarecrow", title: "THE SCARECROW", sub: "a pretend peasant, to keep the ducks off the wheat", hint: "ducks in the wheat",
    ready: function (g) { return g.raids >= 3; } },
  { id: "festival", name: "fireworks", title: "FIREWORKS", sub: "what if fire, but pretty?", hint: "more houses",
    ready: function (g) { return iKnown(g) >= 2 && iHouses(g) >= 2; } }
];

/* -------------------------------------------------------------------
   THINKING
   ------------------------------------------------------------------- */
/* a new village knows nothing yet. (clearing the world does not make them forget: it does lose them the graveyard) */
function ideasReset(g) {
  g.know = {}; g.dead = []; g.blaze = []; g.burnt = false; g.raids = 0; g.raidT = 0; g.festT = 0; g.ideaT = 0; g.blankT = 0;
}
function iKnown(g) { var n = 0; for (var k in g.know) n++; return n; }
function iHouses(g) {
  var n = 0;
  for (var k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "house" && g.sites[k].done) n++;
  return n;
}
/* every tick of a calm, full stomach is a little closer to an idea. twice as close at home, by a campfire with
   friends, with a rod in hand, or standing about by lamplight */
function iThink(g, p) {
  if (p.dead || p.state !== "walk") return;
  if (p.bulb > 0) p.bulb--;
  if (p.fire || p.panic > 0 || p.sleep > 0 || p.hunger >= I_FED || p.cold > 60) return;
  var k = p.task, h = p.idle > 0 ? bHome(g, p) : null;
  var cosy = (h && bInside(h, p)) || (k && ((k.kind === "fish" && k.bob) || (k.kind === "warm" && k.social))) || (p.idle > 0 && iLampNear(g, p.x, p.y));
  p.muse = (p.muse || 0) + (cosy ? 2 : 1);
}
/* a lit lantern within a few steps of (x, y) */
function iLampNear(g, x, y) {
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (s.kind === "lamp" && Math.abs(s.x0 - x) < 8 && Math.abs(s.y1 - y + 4) < 9 && g.m[s.plan[1].i] === MAT.LAMP) return true;
  }
  return false;
}
/* the light goes on: something they have not thought of yet, that something has put into their heads. food first
   (it is a full stomach doing the thinking); after that, whatever comes */
function iEureka(g, p) {
  var idea = null, ready = [], k;
  if (g.tick < g.ideaT) return false;   /* still getting used to the last one: hold that thought */
  p.muse = 0;
  for (k = 0; k < IDEAS.length; k++) if (!g.know[IDEAS[k].id] && IDEAS[k].ready(g, p)) ready.push(IDEAS[k]);
  if (ready.length) idea = g.know.farm ? pick(ready) : ready[0];
  if (!idea) {
    /* nothing has happened yet to think about. it was nearly something, though */
    if (iKnown(g) < IDEAS.length && g.tick > g.blankT && p.sayT <= 0) { g.blankT = g.tick + 3600; pSay(g, p, "blank"); }
    return false;
  }
  g.know[idea.id] = p.name;
  g.ideaT = g.tick + I_GAP;
  p.bulb = I_BULB; p.idle = 90; p.bored = 0;
  pSay(g, p, "idea_" + idea.id, true);
  feed(g, p.name + " invented " + idea.name, "#ffe08a");
  banner(g, idea.title, pTitle(p.short) + "'s idea: " + idea.sub);
  g.fx.idea++;
  var q = pOther(g, p, 40);
  if (q && !q.sleep) pSay(g, q, "genius", true);
  if (iKnown(g) === IDEAS.length) achieve(g, "enlightened");
  return true;
}

/* -------------------------------------------------------------------
   WHAT TO DO ABOUT IT. called when they are looking for something to
   do, after food, bed and wood (build.js). true if they found something
   ------------------------------------------------------------------- */
function iPick(g, p) {
  var K = g.know, hungry = p.hunger > P_HUNGRY, s;
  if ((p.muse || 0) >= I_MUSE && iEureka(g, p)) return true;
  /* a field wants hands, not wood: anybody will do */
  if (K.farm && (s = iFieldWork(g, p, 160))) { bJoin(g, p, s); return true; }
  if (K.farm && !p.planCD && iCount(g, "farm") < Math.min(3, Math.ceil(bAlive(g) / 4)) && (hungry || Math.random() < 0.3)) {
    if (iPlanFarm(g, p)) return true;
    p.planCD = 1800;
  }
  if (K.fish && (hungry || (p.bored > 700 && Math.random() < 0.3)) && iGoFish(g, p)) return true;
  if (K.bucket && !hungry && Math.random() < 0.15 && iGoWater(g, p)) return true;
  /* things that want wood: with some in hand, or now and then without (somebody with wood will be along) */
  if (!p.planCD && bOpenCount(g) < B_OPEN && (bWood(p) >= 1 || Math.random() < 0.15)) {
    if (K.grave && iPlanGrave(g, p)) return true;
    if (K.lamp && iPlanLamp(g, p)) return true;
    if (K.scarecrow && iPlanScarecrow(g, p)) return true;
    if (K.fish && iPlanJetty(g, p)) return true;
  }
  if (K.grave && p.bored > 600 && Math.random() < 0.1 && iGoVisit(g, p)) return true;
  if (K.festival && p.bored > 900 && p.hunger < I_FED * 2 && iPlanFestival(g, p)) return true;
  return false;
}
/* before anything else: something they built is on fire, and they know about buckets */
function iUrgent(g, p) {
  if (!g.know.bucket || !g.blaze.length || p.fire || p.panic > 0 || p.cold > 150 || p.hunger > P_HUNGRY * 2) return false;
  var best = null, bd = 260, k, s, d;
  for (k = 0; k < g.blaze.length; k++) {
    s = bSite(g, g.blaze[k].site);
    if (!s) continue;
    d = Math.abs(s.cx - p.x) + Math.abs(s.cy - p.y);
    if (d < bd && iCrew(g, "bucket", s.id) < 6) { bd = d; best = s; }
  }
  if (!best || p.dryT > g.tick) return false;
  /* no water this side of the fire: nothing they can do but watch (and they will not be asked again for a bit) */
  var w = p.pail ? null : iFindWater(g, p, 160, iBlazeOf(g, best.id));
  if (!w && !p.pail) { p.dryT = g.tick + 600; if (p.sayT <= 0 && Math.random() < 0.5) pSay(g, p, "nowater"); return false; }
  p.task = { kind: "bucket", site: best.id, t: 0, act: 0, w: w };
  if (p.sayT <= 0 && Math.random() < 0.5) pSay(g, p, "brigade");
  return true;
}
/* one tick of one of the jobs in here, or undefined if it is not one of ours */
function iTask(g, p, k) {
  if (k.kind === "bucket") return iTaskBucket(g, p, k);
  if (k.kind === "fish") return iTaskFish(g, p, k);
  if (k.kind === "visit") return iTaskVisit(g, p, k);
  if (k.kind === "festival") return iTaskFestival(g, p, k);
  if (k.kind === "watch") return iTaskWatch(g, p, k);
  return undefined;
}
function iDone(p, ok) { p.task = null; p.taskDone = !!ok; return false; }
/* how many are at a job of this kind, on this site */
function iCrew(g, kind, id) {
  var n = 0;
  for (var k = 0; k < g.peasants.length; k++) { var t = g.peasants[k].task; if (t && t.kind === kind && (t.site === id || t.field === id)) n++; }
  return n;
}
function iCount(g, kind) { var n = 0; for (var k = 0; k < g.sites.length; k++) if (g.sites[k].kind === kind) n++; return n; }
/* walk p towards somewhere goal likes, near (x, y), as every errand here does. true once they are stuck for good */
function iWalk(g, p, k, key, x, y, goal) {
  var left = pathGo(g, p, key, x, y, goal);
  if (left < 0) p.dir = x + 0.5 < p.x ? -1 : 1;
  k.act = 0;
  return pStuck(p, k, left > 0 ? left : Math.abs(x + 0.5 - p.x) + Math.abs(y - p.y));
}

/* what somebody will drop to go and watch the fireworks */
var I_FUN = { explore: 1, chop: 1, plant: 1, fish: 1, visit: 1, light: 1 };
/* once a third of a second or so: what is on fire */
var I_IDLE = { explore: 1, chop: 1, plant: 1, fish: 1, visit: 1, watch: 1, light: 1, festival: 1, build: 1, camp: 1 };
/* what somebody will drop when the alarm goes up: anything they are only doing for fun, or that can wait (a snack, a
   chat round the campfire, a bit of hammering) */
function iCanWait(p, k) {
  return !k || I_IDLE[k.kind] || (k.kind === "eat" && p.hunger < P_HUNGRY * 2) || (k.kind === "warm" && k.social) || (k.kind === "bucket" && k.field);
}
function ideasStep(g) {
  if (g.tick % 20) return;
  var S = g.sites, k, j, s, f;
  g.blaze.length = 0;
  for (k = S.length - 1; k >= 0; k--) {
    s = S[k];
    /* lanterns that never got hung, for a house that is not there any more */
    if (s.kind === "lamp" && !s.done && !bSite(g, s.home)) { bRemove(g, k); continue; }
    /* a field with nothing left that can be sown (a puddle where a seed should go): sown, as far as it goes */
    if (s.free && !s.done && !bBusy(g, s) && bFinished(g, s)) { s.done = true; s.repair = s.sow = false; s.last = g.tick; }
    f = iFlames(g, s);
    if (!f.length) {
      /* (the brigade takes the credit if it got a few bucketfuls on before it went out) */
      if (s.burning && s.doused >= 3) { feed(g, "the bucket brigade put out the fire at " + bLabel(s), "#9ad0ff", "blaze" + s.id); achieve(g, "brigade"); }
      s.burning = 0; s.doused = 0;
      continue;
    }
    if (!s.burning && g.know.bucket) feed(g, iCap(bLabel(s)) + " is on fire!", "#ffb070", "blaze" + s.id);
    s.burning = s.burning || g.tick;
    g.blaze.push({ site: s.id, cells: f });
    g.burnt = true;
  }
  /* the alarm: anybody who knows about buckets drops whatever they were doing just for fun (or nothing at all), and
     grabs one */
  if (g.blaze.length && g.know.bucket) for (k = 0; k < g.peasants.length; k++) {
    var p = g.peasants[k];
    /* and anybody in a house that is on fire (asleep or not) is woken, and runs for the door */
    if (!p.dead && p.state === "walk" && !p.fire && iBurningHouse(g, p)) {
      if (p.panic < 40 && p.sayT <= 0) pSay(g, p, "evac", true);
      p.panic = Math.max(p.panic, 60); p.idle = 0;
      continue;
    }
    if (p.dead || p.state !== "walk" || p.sleep || p.climb || p.rope || p.swimming || !iCanWait(p, p.task)) continue;
    var was = p.task;
    p.task = null;
    if (iUrgent(g, p)) { p.idle = 0; p.taskCD = 0; } else p.task = was;
  }
}
/* the burning house p is in, if it is in one */
function iBurningHouse(g, p) {
  for (var k = 0; k < g.blaze.length; k++) {
    var s = bSite(g, g.blaze[k].site);
    if (s && s.kind === "house" && s.done && bInside(s, p)) return s;
  }
  return null;
}
/* which way is the way out: the nearer door, unless the fire is on the way to it (counted cells of it between them) */
function iExit(g, p, h) {
  var b = iBlazeOf(g, h.id), best = 0, bs = 1e9, d, k, n, x;
  for (d = -1; d <= 1; d += 2) {
    var door = d < 0 ? h.ix0 - 1 : h.ix1 + 2;
    n = 0;
    if (b) for (k = 0; k < b.cells.length; k++) { x = b.cells[k] % g.gw; if ((x - p.x) * (door - x) > 0) n++; }
    var sc = Math.abs(door - p.x) + n * 4;
    if (sc < bs) { bs = sc; best = d; }
  }
  return best;
}
/* panicking (and the house is on fire): out of it. true if that is what they are doing */
function iFlee(g, p) {
  if (!g.know.bucket) return false;
  var h = iBurningHouse(g, p);
  if (!h) return false;
  p.dir = iExit(g, p, h);
  return true;
}
/* somebody on fire, near enough to run at with a bucket */
function iVictim(g, p) {
  var best = null, bd = 1e9, k, q, d;
  for (k = 0; k < g.peasants.length; k++) {
    q = g.peasants[k];
    if (q === p || q.dead || !q.fire || q.state !== "walk") continue;
    d = Math.abs(q.x - p.x);
    if (d < 45 && Math.abs(q.y - p.y) < 14 && d < bd) { bd = d; best = q; }
  }
  return best;
}
/* somebody burning wants water, and a brigade bucket will do as well as a pond: the nearest one, if there is one */
function iRescuer(g, p) {
  if (!g.know.bucket) return null;
  var best = null, bd = 70, k, q, d;
  for (k = 0; k < g.peasants.length; k++) {
    q = g.peasants[k];
    if (q === p || q.dead || !q.pail || !q.task || q.task.kind !== "bucket" || q.state !== "walk") continue;
    d = Math.abs(q.x - p.x);
    if (d < bd && Math.abs(q.y - p.y) < 14) { bd = d; best = q; }
  }
  return best;
}
/* a bucket over somebody: they are out. the water goes where they stand, and then on down */
function iDouse(g, p, v) {
  v.fire = 0; g.fx.hiss++;
  pSay(g, v, "phew", true);
  if (p.sayT <= 0) pSay(g, p, "douse");
  sparks(g, v.x, v.y - 8, 6, 0.4, [hex32("#c0d0e0")], 14, 0.6, PK_GLINT);
  iSpill(g, p, false, Math.floor(v.x), Math.floor(v.y) - 6);
}
function iCap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
/* flames and embers in and about a site: all of them, top to bottom. (a lantern is only on fire if it is. and the flame
   on a torch is not a fire, it is a torch: no bucket puts that out) */
function iFlames(g, s) {
  var out = [], pad = s.kind === "lamp" ? 0 : 2, x, y, c;
  for (y = s.y0 - (pad ? 3 : 0); y <= s.y1 + (pad ? 1 : 0); y++) for (x = s.x0 - pad; x <= s.x1 + pad; x++) {
    c = pCell(g, x, y);
    if ((c === MAT.FIRE || c === MAT.EMBER) && !iTorchlit(g, x, y)) out.push(y * g.gw + x);
  }
  return out;
}
function iTorchlit(g, x, y) {
  for (var d = 1; d <= 4; d++) for (var k = -1; k <= 1; k++) if (pCell(g, x + k, y + d) === MAT.TORCH) return true;
  return false;
}

/* -------------------------------------------------------------------
   FARMING
   ------------------------------------------------------------------- */
/* a stalk of wheat. the tip climbs, out of the air (or out of any water lying on it, which it drinks, and which makes
   it grow a good deal faster: so does water by its roots), to four to six high. then the ear ripens, and the ripeness
   runs down the stalk */
function cropGrow(g, i, x, y) {
  var m = g.m, gw = g.gw, up = y > 0 ? m[i - gw] : MAT.STONE, r = Math.random(), h, b, W = MAT.WATER;
  /* salt water does for wheat what it does for any plant */
  if (sandHas(g, x, y, MAT.SALTWATER) >= 0) { if (r < 0.01) { m[i] = MAT.EMPTY; heatSync(g, i); } return; }
  if (up === MAT.WHEAT) { if (r < 0.01) heatBecome(g, i, MAT.WHEAT); return; }
  if (up === MAT.CROP) return;
  if (r > (up === W ? 0.03 : 0.008)) return;
  for (h = 1; h < 9 && y + h < g.gh && (m[i + h * gw] === MAT.CROP || m[i + h * gw] === MAT.WHEAT); h++);
  b = i + h * gw;
  if (y + h >= g.gh || m[b] !== MAT.SOIL) return;   /* uprooted: it stays as it is */
  var wet = up === W || sandHas(g, x, y + h, W) >= 0 || sandHas(g, x, y + h - 1, W) >= 0 || sandHas(g, x, y, W) >= 0;
  if (!wet && r > 0.002) return;
  if (h < I_CROP_H + (x * 5) % 3 && (up === MAT.EMPTY || up === W)) { sandSet(g, i - gw, MAT.CROP); return; }
  heatBecome(g, i, MAT.WHEAT);   /* as tall as it gets: the ear ripens */
}
/* the nearest field with something to do on it */
function iFieldWork(g, p, R) {
  var best = null, bd = R, k, s, d;
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if (s.kind !== "farm" || s.done || (p.failSite === s.id && p.failT > g.tick) || iCrew(g, "build", s.id) >= 3) continue;
    d = Math.abs(s.cx - p.x) + Math.abs(s.cy - p.y) * 2;
    if (d < bd && bNext(g, s, null)) { bd = d; best = s; }
  }
  return best;
}
/* a field: eleven columns of sand (or ash) with open sky over them, near p, as level as can be found */
function iPlanFarm(g, p) {
  var fx = Math.floor(p.x), fy = Math.floor(p.y), best = null, d, sd, r;
  for (d = 0; d <= 90; d++) for (sd = -1; sd <= 1; sd += 2) {
    if (!d && sd > 0) continue;
    r = iFarmPlot(g, fx + d * sd - (I_FARM_W >> 1), fy);
    if (r && (!best || r.work + d * 0.2 < best.score)) { best = r; best.score = r.work + d * 0.2; }
  }
  if (!best) return false;
  var plan = [], k, e, x0 = best.x0, x1 = x0 + I_FARM_W - 1;
  for (k = 0; k < best.dig.length; k++) plan.push(bE(g, best.dig[k][0], best.dig[k][1], MAT.EMPTY, 0));
  for (k = 0; k < I_FARM_W; k++) plan.push(bE(g, x0 + k, best.gy[k], MAT.SOIL, 1));
  /* a row of wheat in every other furrow, so there is room to see it is a field and not a hedge */
  for (k = 0; k < I_FARM_W; k += 2) plan.push(bE(g, x0 + k, best.gy[k] - 1, MAT.CROP, 2));
  var s = bNew(g, "farm", p, plan, [x0, best.lo - 6, x1, best.hi], { free: true, G: best.lo });
  feed(g, p.name + " is starting a field", "#a8e08a", "plan" + s.id);
  pSay(g, p, "planFarm", true);
  bJoin(g, p, s);
  return true;
}
function iFarmPlot(g, x0, fy) {
  var x1 = x0 + I_FARM_W - 1, gy = [], dig = [], lo = 1e9, hi = -1, x, y, c, k, G;
  if (x0 < 4 || x1 > g.gw - 5) return null;
  for (x = x0; x <= x1; x++) {
    G = bGround(g, x, fy);
    if (G < 0 || bMarked(g, x, G)) return null;
    c = pCell(g, x, G);
    if (c !== MAT.SAND && c !== MAT.ASH && c !== MAT.SOIL) return null;
    if (gy.length && Math.abs(G - gy[gy.length - 1]) > 1) return null;
    gy.push(G); lo = Math.min(lo, G); hi = Math.max(hi, G);
  }
  if (hi - lo > 2) return null;
  for (k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (x1 + 3 >= s.x0 && x0 - 3 <= s.x1 && hi + 3 >= s.y0 && lo - 12 <= s.y1) return null;
  }
  for (y = lo - 12; y <= hi + 2; y++) for (x = x0 - 2; x <= x1 + 2; x++) {
    c = pCell(g, x, y);
    if (LIQUID[c] || HOT[c] || c === MAT.DRAIN || P_BANG[c]) return null;
  }
  /* open sky over it (a field under somebody's floor grows nothing), and bushes dug out */
  for (k = 0; k < I_FARM_W; k++) for (y = gy[k] - 12; y < gy[k]; y++) {
    c = pCell(g, x0 + k, y);
    if (AIRY[c]) continue;
    if (!B_DIG[c] || y < gy[k] - 6) return null;
    dig.push([x0 + k, y]);
  }
  dig.sort(function (a, b) { return a[1] - b[1]; });
  return { x0: x0, gy: gy, lo: lo, hi: hi, dig: dig, work: dig.length };
}
var I_RAID_NEWS = ["the ducks are eating the wheat", "the ducks are at the wheat again", "a duck is in the wheat",
  "the wheat is being eaten. by ducks"];
/* a duck had some of the wheat (from the bottom of the stalk: it is a duck). the rest of the stalk comes down, and
   spills its grain, as seed, for later. people will hear about this */
function iRaided(g, d, x, y) {
  var j, k;
  for (j = (y - 1) * g.gw + x; j >= 0 && (g.m[j] === MAT.CROP || g.m[j] === MAT.WHEAT); j -= g.gw) heatBecome(g, j, MAT.SEED);
  g.raids++;
  var p = null, bd = 70;
  for (k = 0; k < g.peasants.length; k++) {
    var q = g.peasants[k], dd = Math.abs(q.x - x) + Math.abs(q.y - y);
    if (!q.dead && q.state === "walk" && !q.sleep && dd < bd) { bd = dd; p = q; }
  }
  if (p && p.sayT <= 0 && Math.random() < 0.5) pSay(g, p, "raid", true);
  if (g.tick > g.raidT) { g.raidT = g.tick + 3600; feed(g, pick(I_RAID_NEWS), "#ffd27a", "raid"); }
}

/* -------------------------------------------------------------------
   BUCKETS: put the fire out. or, on a quiet day, water the wheat
   ------------------------------------------------------------------- */
/* a field that could do with a drink: stalks still growing, nothing wet about it, nobody already watering it, and
   fresh water to be had */
function iGoWater(g, p) {
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k], w;
    if (s.kind !== "farm" || !s.done || Math.abs(s.cx - p.x) > 160 || iCrew(g, "bucket", s.id) || !iThirsty(g, s)) continue;
    if (!(w = iFindWater(g, p, 160, null, true))) return false;
    p.task = { kind: "bucket", field: s.id, t: 0, act: 0, w: w };
    return true;
  }
  return false;
}
/* the tops of the stalks still growing in a field, if none of them has water near it. else null */
function iThirsty(g, s) {
  var tips = [], k, e, x, y, c;
  for (k = 0; k < s.plan.length; k++) {
    e = s.plan[k];
    if (e.v !== MAT.CROP) continue;
    x = e.i % g.gw;
    if (sandHas(g, x, (e.i / g.gw) | 0, MAT.WATER) >= 0) return null;   /* wet at the roots */
    for (y = (e.i / g.gw) | 0; y > 0 && (c = pCell(g, x, y)) === MAT.CROP; y--);
    if (c === MAT.WATER || sandHas(g, x, y + 1, MAT.WATER) >= 0) return null;
    if (c === MAT.EMPTY && pCell(g, x, y + 1) === MAT.CROP) tips.push({ x: x, y: y });
  }
  return tips.length >= 3 ? tips : null;
}
function iTaskBucket(g, p, k) {
  if (++k.t > 4000) return iDone(p, false);
  var fx = Math.floor(p.x), fy = Math.floor(p.y), fresh = !!k.field, j;
  if (!p.pail) {
    /* nothing burning any more (or growing): done */
    if (k.site && !iBlazeOf(g, k.site)) { if (k.threw && p.sayT <= 0) pSay(g, p, "out"); return iDone(p, true); }
    if (k.field && (!bSite(g, k.field) || !iThirsty(g, bSite(g, k.field)))) return iDone(p, true);
    j = iScoopAt(g, fx, fy, fresh);
    if (j >= 0 && !p.swimming && !LIQUID[pCell(g, fx, fy)] && iSafe(g, fx, fy)) {
      p.pose = (k.act >> 3) & 1 ? "eatB" : "stand"; p.dir = (j % g.gw) + 0.5 < p.x ? -1 : 1;
      if (++k.act === 16) { p.pail = iScoop(g, j, fresh); k.act = 0; k.best = null; if (p.sayT <= 0 && Math.random() < 0.3) pSay(g, p, "fill"); }
      return true;
    }
    if (!k.w || k.t % 120 === 0) k.w = iFindWater(g, p, 160, k.site && iBlazeOf(g, k.site), fresh) || k.w;
    if (!k.w) { if (p.sayT <= 0) pSay(g, p, "nowater"); return iDone(p, false); }
    /* (from the bank, with dry feet: not from the middle of the pond) */
    if (iWalk(g, p, k, "water" + k.w.x, k.w.x, k.w.y, function (x, y) { return navStand(g, x, y) === 1 && !LIQUID[pCell(g, x, y)] && iScoopAt(g, x, y, fresh) >= 0 && iSafe(g, x, y); })) pGiveUp(g, p, k.w.x);
    return false;
  }
  /* bucket full, and somebody burning (out of the house, say): that comes first. run at them, and put it over them */
  var vic = iVictim(g, p);
  if (vic && !p.swimming) {
    p.dir = vic.x < p.x ? -1 : 1; k.act = 0;
    if (Math.abs(vic.x - p.x) < 3 && Math.abs(vic.y - p.y) < 6) { iDouse(g, p, vic); k.threw = true; return true; }
    return false;
  }
  /* bucket full: off to the fire (the nearest bit of it, looked for again now and then), or the thirstiest stalk */
  var tgt = k.last && k.aim > g.tick ? k.last : (k.site ? iBlazeTarget(g, k.site, p) : iWaterTarget(g, k.field));
  if (tgt !== k.last) k.aim = g.tick + 60;
  /* it went out on the way: thrown on for luck, if they are standing somewhere they could; else never mind */
  if (!tgt && k.last && iThrowFrom(g, fx, fy, k.last)) tgt = k.last;
  if (!tgt) { iSpill(g, p); if (k.site && p.sayT <= 0) pSay(g, p, "out"); return iDone(p, true); }
  k.last = tgt;
  var good = function (x, y) { return iThrowFrom(g, x, y, tgt); };
  if (good(fx, fy) && !p.swimming) {
    p.dir = tgt.x + 0.5 < p.x ? -1 : 1;
    p.pose = ++k.act < 10 ? "hammerA" : "hammerB";
    if (k.act === 14) {
      iThrow(g, p, tgt);
      k.act = 0; k.best = null; k.threw = true;
      var s = k.site && bSite(g, k.site);
      if (s) s.doused = (s.doused || 0) + 1;
      k.aim = 0;
      if (p.sayT <= 0 && Math.random() < 0.4) pSay(g, p, k.site ? "douse" : "water");
    }
    return true;
  }
  k.act = 0;
  var left = pathGo(g, p, "throw" + (k.site || k.field), tgt.x, tgt.y, good);
  /* no way they can see to anywhere good to throw from: closer, while it is cool enough; back off, if it is not */
  if (left < 0) { var toward = tgt.x + 0.5 < p.x ? -1 : 1; p.dir = iSafe(g, fx, fy) ? toward : -toward; }
  if (pStuck(p, k, left > 0 ? left : Math.abs(tgt.x + 0.5 - p.x))) { iSpill(g, p); pGiveUp(g, p, tgt.x); }
  return false;
}
/* could they throw a bucket from feet at (x, y) at t: in range, and somewhere cool enough to stand */
function iThrowFrom(g, x, y, t) {
  var d = Math.abs(x - t.x);
  return d >= 5 && d <= 16 && t.y >= y - 16 && t.y <= y + 4 && iSafe(g, x, y);
}
/* a full bucket and no bucket job (they waded, or something better came up): they put it down. where they stand */
function iPail(g, p) {
  if (p.pail && !(p.task && p.task.kind === "bucket")) iSpill(g, p);
}
/* somewhere to stand by a fire: nothing hot in it, under it or either side of it. the brigade is brave, not daft */
function iSafe(g, x, y) {
  if (navHazard(g, x, y)) return false;
  for (var dx = -2; dx <= 2; dx++) for (var dy = -8; dy <= 1; dy += 3) {
    var X = x + dx, Y = y + dy;
    if (X >= 0 && Y >= 0 && X < g.gw && Y < g.gh && (g.T[Y * g.gw + X] > 60 || HOT[g.m[Y * g.gw + X]])) return false;
  }
  return true;
}
function iBlazeOf(g, id) { for (var k = 0; k < g.blaze.length; k++) if (g.blaze[k].site === id) return g.blaze[k]; return null; }
/* the bit of the fire nearest p */
function iBlazeTarget(g, id, p) {
  var b = iBlazeOf(g, id), best = null, bd = 1e9, k, x, y, d;
  if (!b) return null;
  for (k = 0; k < b.cells.length; k++) {
    x = b.cells[k] % g.gw; y = (b.cells[k] / g.gw) | 0;
    d = Math.abs(x - p.x) + Math.abs(y - p.y) * 0.5;
    if (d < bd) { bd = d; best = { x: x, y: y }; }
  }
  return best;
}
function iWaterTarget(g, id) {
  var s = bSite(g, id), tips = s && iThirsty(g, s);
  return tips ? tips[(tips.length >> 1)] : null;
}
/* water for a bucket: either kind for a fire, only fresh for the wheat (salt water kills it) */
function iDrinkable(c, fresh) { return fresh ? c === MAT.WATER : WET[c] === 1; }
/* a cell of water at the top of a pond, a step or two down from feet at (x, y) and no further off than an arm: its index,
   or -1 */
function iScoopAt(g, x, y, fresh) {
  for (var d = 0; d <= 3; d++) for (var s = -1; s <= 1; s += 2) {
    var cx = x + d * s;
    for (var yy = y + 1; yy <= y + 4; yy++) {
      var c = pCell(g, cx, yy);
      if (iDrinkable(c, fresh) && yy > 0) return yy * g.gw + cx;
      if (!AIRY[c]) break;
    }
    if (!d) break;
  }
  return -1;
}
/* the nearest top of some water, roughly at their level (fresh, if it is for the wheat). not under the fire (b), and
   not on the far side of it from them, through the flames */
function iFindWater(g, p, R, b, fresh) {
  var fx = Math.floor(p.x), fy = Math.floor(p.y), d, s, x, y, c, k, b0 = 1e9, b1 = -1e9;
  if (b) for (k = 0; k < b.cells.length; k++) { x = b.cells[k] % g.gw; b0 = Math.min(b0, x); b1 = Math.max(b1, x); }
  for (d = 0; d <= R; d++) for (s = -1; s <= 1; s += 2) {
    x = fx + d * s;
    if (x < 1 || x > g.gw - 2 || (x >= b0 && x <= b1) || (fx < b0 && x > b1) || (fx > b1 && x < b0)) continue;
    for (y = Math.max(1, fy - 16); y <= fy + 24 && y < g.gh; y++) {
      c = g.m[y * g.gw + x];
      if (iDrinkable(c, fresh) && AIRY[g.m[(y - 1) * g.gw + x]]) return { x: x, y: y - 1 };
      if (!AIRY[c] && !P_SOFT[c]) { if (y > fy) break; }
    }
    if (!d) break;
  }
  return null;
}
/* fill the bucket: a few cells off the top of the pond, each with its heat, as a thrown grain carries its heat */
var I_DIP = [[0, 0], [-1, 0], [1, 0], [0, 1], [-2, 0], [2, 0], [-1, 1], [1, 1], [0, 2]];
function iScoop(g, j0, fresh) {
  var load = [], gw = g.gw, x0 = j0 % gw, y0 = (j0 / gw) | 0, k, j, x, y;
  for (k = 0; k < I_DIP.length && load.length < I_LOAD; k++) {
    x = x0 + I_DIP[k][0]; y = y0 + I_DIP[k][1]; j = y * gw + x;
    if (x < 0 || x >= gw || y >= g.gh || !iDrinkable(g.m[j], fresh)) continue;
    heatSync(g, j);
    load.push({ m: g.m[j], sh: g.sh[j], q: heatQ(g, j) });
    g.m[j] = MAT.EMPTY; g.aux[j] = 0; g.T[j] = AMBIENT; g.lat[j] = 0;
    heatAccept(g, j);
  }
  return load.length ? load : null;
}
/* throw it: an arc from their hands that comes down on (t.x, t.y). each cell flies as a grain of itself */
function iThrow(g, p, t) {
  var load = p.pail;
  p.pail = null;
  var sx = p.x + p.dir * 1.5, sy = p.y - 8, dx = t.x + 0.5 - sx, dy = t.y + 0.5 - sy;
  /* (flight time from how far it has to go; a grain falls 0.11 a tick faster every tick, and drags a little) */
  var tf = clamp(Math.abs(dx) / 0.8, 10, 28), vx = dx / tf * 1.04, vy = Math.max(-3.4, (dy - 0.055 * tf * tf) / tf);
  for (var k = 0; k < load.length; k++) {
    var c = load[k], q = partAdd(g, PK_DEBRIS, sx, sy - k * 0.5, vx * (0.95 + 0.05 * k), vy, 240, SAND_PAL[c.m][c.sh], c.m);
    if (q < 0) { (p.pail = p.pail || []).push(c); continue; }   /* (no room in the air: it stays in the bucket) */
    g.pt[q] = c.q; g.ps[q] = c.sh;
  }
  g.fx.splash++;
}
/* a bucket emptied where they stand: each cell of it into the nearest bit of air in front of them, with its heat (and
   the heat of the air it pushes out). whatever finds no room stays in the bucket; unless they are dying (buried, say),
   when it goes in the first air above them */
function iSpill(g, p, dying, cx, cy) {
  var load = p.pail, fx = cx == null ? Math.floor(p.x) + p.dir : cx, fy = cy == null ? Math.floor(p.y) - 1 : cy, k, r, j, x, y, left = [];
  if (!load) return;
  for (k = 0; k < load.length; k++) {
    for (r = 0, j = -1; r < 5 && j < 0; r++) for (y = fy - r; y <= fy && j < 0; y++) for (x = fx - r; x <= fx + r && j < 0; x++) {
      if (x >= 0 && y >= 0 && x < g.gw && y < g.gh && AIRY[g.m[y * g.gw + x]]) j = y * g.gw + x;
    }
    /* (dying, buried: the first air straight up from them, however far) */
    for (y = fy - 5; dying && j < 0 && y >= 0; y--) if (AIRY[pCell(g, fx - p.dir, y)]) j = y * g.gw + fx - p.dir;
    if (j < 0) { left.push(load[k]); continue; }
    var qa = heatQ(g, j);
    g.m[j] = load[k].m; g.aux[j] = 0; g.sh[j] = load[k].sh; g.vy[j] = 0;
    heatSetQ(g, j, qa + load[k].q);
  }
  p.pail = left.length ? left : null;
}

/* -------------------------------------------------------------------
   FISHING: a jetty, and a rod off the end of it
   ------------------------------------------------------------------- */
/* somewhere for a jetty: a bank, then a deck row with (after a step or three of boardwalk over the shore) open water
   under it for at least seven cells, so it can go well out without reaching the far side. {x, y, dir, len} or null */
function iJettySpot(g, p, R) {
  var fx = Math.floor(p.x), fy = Math.floor(p.y), d, s, x, G, dir, dy, r;
  for (d = 0; d <= R; d++) for (s = -1; s <= 1; s += 2) {
    x = fx + d * s;
    if (x < 3 || x > g.gw - 4) continue;
    G = bGround(g, x, fy);
    if (G < 0 || !pSolid(g, x, G) || bMarked(g, x, G) || WOODY[pCell(g, x, G)]) continue;
    for (dir = -1; dir <= 1; dir += 2) for (dy = 0; dy <= 2; dy++) if ((r = iJettyRun(g, x, G - dy, dir))) return r;
    if (!d) break;
  }
  return null;
}
function iJettyRun(g, x, row, dir) {
  var i, c, y, wet = 0, dry = 0, len;
  for (i = 1; i <= 40; i++) {
    c = x + dir * i;
    if (c < 2 || c > g.gw - 3 || !AIRY[pCell(g, c, row)]) break;
    for (y = row - 9; y < row; y++) if (!AIRY[pCell(g, c, y)]) break;
    if (y < row) break;
    for (y = row + 1; y <= row + 6 && AIRY[pCell(g, c, y)]; y++);
    if (WET[pCell(g, c, y)]) wet++;
    else if (!wet && dry < 3 && SOLID[pCell(g, c, y)]) dry++;
    else break;
  }
  if (wet < 7) return null;
  len = dry + Math.min(10, wet - 3);
  if (bSiteAround(g, x + dir * (len >> 1), row, "jetty", 40) || bSiteAround(g, x + dir, row, null, 2)) return null;
  return { x: x, y: row, dir: dir, len: len };
}
function iPlanJetty(g, p) {
  if (iCount(g, "jetty") >= 2) return false;
  var j = iJettySpot(g, p, 160), plan = [], k;
  if (!j) { p.planCD = 1500; return false; }
  for (k = 1; k <= j.len; k++) plan.push(bE(g, j.x + j.dir * k, j.y, MAT.PLANK, 2 + k));
  var xa = j.x + j.dir, xb = j.x + j.dir * j.len;
  var s = bNew(g, "jetty", p, plan, [Math.min(xa, xb), j.y, Math.max(xa, xb), j.y], { end: xb, dir: j.dir, deck: j.y });
  feed(g, p.name + " is building a jetty", "#a8e08a", "plan" + s.id);
  pSay(g, p, "planJetty", true);
  if (bWood(p) > 0.3) bJoin(g, p, s);
  return true;
}
/* off to the end of a jetty (or a little way back along it, if somebody has the end) */
function iGoFish(g, p) {
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (s.kind !== "jetty" || !s.done || Math.abs(s.cx - p.x) > 220) continue;
    for (var spot = 0; spot < 2; spot++) {
      var taken = false;
      for (var j = 0; j < g.peasants.length; j++) { var t = g.peasants[j].task; if (t && t.kind === "fish" && t.site === s.id && t.spot === spot) taken = true; }
      if (!taken) { p.task = { kind: "fish", site: s.id, spot: spot, t: 0, act: 0, n: 0, bob: null }; return true; }
    }
  }
  return false;
}
function iTaskFish(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || !s.done || ++k.t > 5000) return iDone(p, false);
  var sx = s.end - s.dir * k.spot * 3, sy = s.deck - 1, fx = Math.floor(p.x), fy = Math.floor(p.y);
  if (Math.abs(p.x - sx - 0.5) > 0.6 || fy !== sy) {
    k.bob = null;
    if (Math.abs(p.x - sx - 0.5) <= 1 && fy === sy) { p.dir = sx + 0.5 < p.x ? -1 : 1; return false; }
    if (iWalk(g, p, k, "fish" + s.id + ":" + k.spot, sx, sy, function (x, y) { return x === sx && y === sy; })) pGiveUp(g, p, sx);
    return false;
  }
  p.dir = s.dir; p.idle = 0; k.act++;
  if (!k.bob) {
    /* cast: out past the end, onto the top of the water */
    var bx = s.end + s.dir * (5 + irnd(4)), by = iSurface(g, bx, s.deck);
    if (by === -1) { bx = s.end + s.dir * 2; by = iSurface(g, bx, s.deck); }   /* (a small pond: drop it in close) */
    if (by < 0) { pSay(g, p, by === -2 ? "frozen" : "nofish", true); return iDone(p, false); }
    k.bob = { x: bx, y: by }; k.wait = 300 + irnd(900); k.tug = 0;
    if (p.sayT <= 0 && Math.random() < 0.5) pSay(g, p, "cast");
    return true;
  }
  /* the bobber rides the water: if the water is gone (or frozen) from under it, reel in */
  if (k.act % 30 === 0) { var ny = iSurface(g, k.bob.x, s.deck); if (ny < 0) { k.bob = null; return true; } k.bob.y = ny; }
  if (k.wait > 0) { if (--k.wait === 90 && p.sayT <= 0 && Math.random() < 0.4) pSay(g, p, "nibble"); return true; }
  if (!k.tug) { k.tug = 45; return true; }
  if (--k.tug > 0) return true;
  iCatch(g, p, k);
  k.bob = null; k.n++;
  if (k.n >= 3 || (p.hunger < 400 && p.bored < 400)) return iDone(p, true);
  return true;
}
/* the top of the water below (x, row): its row, -2 if it is iced over, -1 if there is no water there at all */
function iSurface(g, x, row) {
  for (var y = row + 1; y <= row + 8; y++) {
    var c = pCell(g, x, y);
    if (WET[c]) return y;
    if (c === MAT.ICE) return -2;
    if (!AIRY[c]) return -1;
  }
  return -1;
}
var I_DUCK_NEWS = ["{n} caught a duck. by accident. it is fine", "{n} hooked a duck. the duck has questions",
  "{n} went fishing and caught a duck. the duck is not amused"];
/* what is on the end of the line */
function iCatch(g, p, k) {
  var b = k.bob, j = b.y * g.gw + b.x, r = Math.random(), d = null, q;
  for (q = 0; q < g.ducks.length; q++) {
    var dk = g.ducks[q];
    if (!dk.dead && Math.abs(dk.x - b.x) < 4 && Math.abs(dk.y - b.y) < 4) d = dk;
  }
  if (d && r < 0.3) {
    pSay(g, p, "duckbite", true); dTakeOff(g, d, true); dSay(g, d, "quack", true);
    feed(g, pick(I_DUCK_NEWS).replace("{n}", p.name), "#ffd27a", "fish");
    return;
  }
  if (r < 0.1) { pSay(g, p, "boot", true); iLand(g, p, b, [hex32("#4a3a2a"), hex32("#2a1e14")]); return; }
  var cooked = g.T[j] > 60, lb = 1 + irnd(r > 0.9 ? 12 : 6);
  pSay(g, p, cooked ? "cooked" : "fish", true);
  iLand(g, p, b, cooked ? [hex32("#e0a070"), hex32("#c88050")] : [hex32("#c8d4e0"), hex32("#8aa0b8"), hex32("#f0a040")]);
  p.hunger = Math.max(0, p.hunger - 1400); p.bored = Math.max(0, p.bored - 600);
  /* the news: the first fish, a cooked one, and the big ones */
  if (lb >= 8 || cooked || !g.got.fish) feed(g, p.name + " caught a " + (cooked ? "cooked " : "") + lb + "-pound fish", "#9ad0ff", "fish");
  achieve(g, "fish");
  g.fx.splash++;
}
/* the catch, flying in on the end of the line */
function iLand(g, p, b, cols) {
  var dx = p.x - b.x - 0.5, dy = (p.y - 6) - b.y;
  for (var k = 0; k < 4; k++) partAdd(g, PK_GLINT, b.x + 0.5, b.y - 0.5, dx / 22 + (Math.random() - 0.5) * 0.06, dy / 22 - 0.35, 22 + irnd(4), cols[k % cols.length]);
}

/* -------------------------------------------------------------------
   LANTERNS: one on a bracket by each door of their house
   ------------------------------------------------------------------- */
/* a lantern for each door of their house (each its own little site), that does not have one yet */
function iPlanLamp(g, p) {
  var h = bHome(g, p), k, side, s = null, has = {};
  if (!h || !h.done || h.repair || h.lampT > g.tick) return false;
  for (k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "lamp" && g.sites[k].home === h.id) has[g.sites[k].side] = 1;
  for (side = -1; side <= 1; side += 2) {
    if (has[side]) continue;
    var wx = side < 0 ? h.x0 : h.x1, bx = wx + side;
    /* the bracket comes out of the wall over the door, the lantern hangs under it: well above anybody's head */
    for (var r = h.F - 11; r >= h.y0; r--) {
      if (pSolid(g, wx, r) && AIRY[pCell(g, bx, r)] && AIRY[pCell(g, bx, r + 1)] && !bMarked(g, bx, r) && !bMarked(g, bx, r + 1)) {
        s = bNew(g, "lamp", p, [bE(g, bx, r, MAT.PLANK, 1), bE(g, bx, r + 1, MAT.LAMP, 2)], [bx, r, bx, r + 1], { home: h.id, side: side, who: h.who });
        break;
      }
    }
  }
  if (!s) { h.lampT = g.tick + 6000; return false; }   /* nowhere (else) to hang one: try again another day */
  feed(g, p.name + " is putting up lanterns", "#a8e08a", "plan" + s.id);
  pSay(g, p, "planLamp", true);
  if (bWood(p) > 0.3) bJoin(g, p, s);
  return true;
}

/* -------------------------------------------------------------------
   GRAVES: a wooden cross for everybody who died, in a row
   ------------------------------------------------------------------- */
/* somebody died. what it will say on the cross is how */
function iMourn(g, p, line) {
  g.dead.push({ name: p.name, note: line.replace("{n}", pTitle(iShort(p.name))), site: 0 });
  if (g.dead.length > 30) g.dead.shift();
}
function iName(n) { return n.toLowerCase().replace(/(^|\s)\S/g, function (c) { return c.toUpperCase(); }); }
function iPlanGrave(g, p) {
  var d = null, k;
  for (k = 0; k < g.dead.length && !d; k++) if (!g.dead[k].site || !bSite(g, g.dead[k].site)) d = g.dead[k];
  if (!d) return false;
  var slot = iGraveSlot(g, p);
  if (!slot) { p.planCD = 1200; return false; }
  var x = slot.x, G = slot.y, plan = [];
  plan.push(bE(g, x, G - 1, MAT.WOOD, 10), bE(g, x, G - 2, MAT.WOOD, 11), bE(g, x, G - 3, MAT.WOOD, 12),
            bE(g, x - 1, G - 3, MAT.WOOD, 13), bE(g, x + 1, G - 3, MAT.WOOD, 13), bE(g, x, G - 4, MAT.WOOD, 13));
  var s = bNew(g, "grave", p, plan, [x - 1, G - 4, x + 1, G - 1], { of: d.name, note: d.note });
  d.site = s.id;
  feed(g, p.name + " is making a cross for " + d.name, "#c8d0dc", "plan" + s.id);
  pSay(g, p, pick(P_SAY.planGrave).replace("{d}", pTitle(iShort(d.name))), true);
  if (bWood(p) > 0.3) bJoin(g, p, s);
  return true;
}
/* the short of a name: "KING ALFRED THE BRAVE" is Alfred */
function iShort(n) {
  for (var k = 0; k < P_NAMES.length; k++) if ((" " + n + " ").indexOf(" " + P_NAMES[k] + " ") >= 0) return P_NAMES[k];
  return n.split(" ")[0];
}
/* where the next cross goes: next to the last one, if there is room; else (the first one) somewhere level, a little
   out of the way of the houses */
function iGraveSlot(g, p) {
  var k, s, d, sd, x, r;
  for (k = g.sites.length - 1; k >= 0; k--) {
    s = g.sites[k];
    if (s.kind !== "grave") continue;
    for (sd = -1; sd <= 1; sd += 2) if ((r = iGraveOk(g, Math.round(s.cx - 0.5) + sd * I_GRAVE_GAP, s.y1))) return r;
  }
  var fx = Math.floor(p.x), fy = Math.floor(p.y);
  for (d = 8; d <= 160; d++) for (sd = -1; sd <= 1; sd += 2) {
    x = fx + d * sd;
    if ((r = iGraveOk(g, x, fy)) && !iNearHouse(g, x, r.y, 14)) return r;
  }
  return null;
}
function iGraveOk(g, x, fy) {
  if (x < 4 || x > g.gw - 5) return null;
  var G = bGround(g, x, fy), y, k, c;
  if (G < 0 || Math.abs(G - fy) > 14 || !pSolid(g, x, G) || bMarked(g, x, G) || WOODY[pCell(g, x, G)]) return null;
  for (k = -1; k <= 1; k++) {
    if (!pSolid(g, x + k, G) && !pSolid(g, x + k, G + 1)) return null;   /* not on the edge of a drop */
    for (y = G - 6; y < G; y++) if (!AIRY[pCell(g, x + k, y)]) return null;
  }
  for (y = G - 8; y <= G + 2; y++) for (k = -4; k <= 4; k++) { c = pCell(g, x + k, y); if (LIQUID[c] || HOT[c] || c === MAT.DRAIN) return null; }
  if (bSiteAround(g, x, G, null, 2)) return null;
  return { x: x, y: G };
}
function iNearHouse(g, x, y, pad) {
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (s.kind !== "grave" && x >= s.x0 - pad && x <= s.x1 + pad && y >= s.y0 - pad && y <= s.y1 + pad) return true;
  }
  return false;
}
/* a visit: stand by somebody's cross for a while. and now and then leave a flower */
function iGoVisit(g, p) {
  var list = [];
  for (var k = 0; k < g.sites.length; k++) { var s = g.sites[k]; if (s.kind === "grave" && s.done && Math.abs(s.cx - p.x) < 200) list.push(s); }
  if (!list.length) return false;
  var s2 = pick(list);
  p.task = { kind: "visit", site: s2.id, side: p.x < s2.cx ? -1 : 1, t: 0, act: 0 };
  return true;
}
function iTaskVisit(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || ++k.t > 2400) return iDone(p, false);
  var gx = Math.round(s.cx - 0.5) + k.side * 3, gy = s.y1, fy = Math.floor(p.y);
  if (Math.abs(p.x - gx - 0.5) > 1 || Math.abs(fy - gy) > 1) {
    if (iWalk(g, p, k, "visit" + s.id, gx, gy, function (x, y) { return Math.abs(x - gx) <= 1 && Math.abs(y - gy) <= 1; })) pGiveUp(g, p, gx);
    return false;
  }
  p.dir = -k.side; p.pose = "stand"; k.act++;
  if (k.act === 40) pSay(g, p, pick(P_SAY.visit).replace("{d}", pTitle(iShort(s.of))), true);
  if (k.act === 160 && Math.random() < 0.4) {
    var fx = Math.round(s.cx - 0.5) + k.side, j = gy * g.gw + fx;
    if (g.m[j] === MAT.EMPTY && pSolid(g, fx, gy + 1)) {
      sandSet(g, j, MAT.FLOWER); g.sh[j] = irnd(42) * 6 + 1 + irnd(5);
      g.fx.bloom++;
    }
  }
  if (k.act > 260) { p.bored = 0; return iDone(p, true); }
  return true;
}

/* -------------------------------------------------------------------
   SCARECROWS: a post and a crossbar, dressed (see iDraw), by a field
   ------------------------------------------------------------------- */
function iPlanScarecrow(g, p) {
  for (var k = 0; k < g.sites.length; k++) {
    var f = g.sites[k], j, has = false;
    if (f.kind !== "farm" || Math.abs(f.cx - p.x) > 200) continue;
    for (j = 0; j < g.sites.length; j++) if (g.sites[j].kind === "scarecrow" && g.sites[j].farm === f.id) has = true;
    if (has) continue;
    /* at either end of the field, as close to it as there is room for */
    for (var n = 0; n < 8; n++) {
      var sd = n & 1 ? 1 : -1, x = sd < 0 ? f.x0 - 3 - (n >> 1) : f.x1 + 3 + (n >> 1), G = bGround(g, x, f.G - 1), y;
      var ok = G >= 0 && pSolid(g, x, G) && !bMarked(g, x, G) && !WOODY[pCell(g, x, G)];
      for (y = G - 7; ok && y < G; y++) for (j = -2; j <= 2; j++) if (!AIRY[pCell(g, x + j, y)] && !P_LEAF[pCell(g, x + j, y)]) ok = false;
      if (!ok || bSiteAround(g, x, G, null, 1)) continue;
      var plan = [];
      for (y = G - 1; y >= G - 5; y--) plan.push(bE(g, x, y, MAT.WOOD, 10 + G - y));
      plan.push(bE(g, x - 1, G - 4, MAT.WOOD, 20), bE(g, x + 1, G - 4, MAT.WOOD, 20), bE(g, x - 2, G - 4, MAT.WOOD, 21), bE(g, x + 2, G - 4, MAT.WOOD, 21));
      var s = bNew(g, "scarecrow", p, plan, [x - 2, G - 5, x + 2, G - 1],
                   { farm: f.id, px: x, G: G, shirt: hex32(pick(P_SHIRTS)), who: f.who });
      feed(g, p.name + " is making a scarecrow", "#a8e08a", "plan" + s.id);
      pSay(g, p, "planCrow", true);
      if (bWood(p) > 0.3) bJoin(g, p, s);
      return true;
    }
  }
  return false;
}
/* a scarecrow standing (its head, at least) near enough to (x, y) to put a duck off */
function iScarecrowNear(g, x, y) {
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (s.kind === "scarecrow" && s.done && Math.abs(s.cx - x) < 22 && Math.abs(s.cy - y) < 16 && pCell(g, s.px, s.G - 5) === MAT.WOOD) return s;
  }
  return null;
}
/* a duck turned tail at the sight of scarecrow s. somebody nearby is pleased with it, now and then */
function iShooed(g, s) {
  if (s.said && g.tick - s.said < 1800) return;
  var q = pOther(g, { x: s.cx, y: s.G }, 50);
  if (q && q.sayT <= 0 && !q.sleep) { s.said = g.tick; pSay(g, q, "crowWorks"); }
}

/* -------------------------------------------------------------------
   FIREWORKS: a show, and everybody comes to watch
   ------------------------------------------------------------------- */
function iPlanFestival(g, p) {
  if (g.tick < g.festT || p.festCD > g.tick || g.blaze.length || bAlive(g) < 3) return false;
  var fx = Math.floor(p.x), fy = Math.floor(p.y), d, sd, x, G, y, k, ok;
  for (d = 6; d <= 100; d++) for (sd = -1; sd <= 1; sd += 2) {
    x = fx + d * sd;
    if (x < 10 || x > g.gw - 11) continue;
    /* the ground under open sky: the first thing down from the top of the world */
    for (G = 0; G < g.gh && AIRY[pCell(g, x, G)]; G++);
    if (G >= g.gh || navStand(g, x, G - 1) !== 1 || bSiteAround(g, x, G, null, 2)) continue;
    /* open sky over it, as high as the sparks off a rocket come down, and nothing that burns close round it */
    for (ok = true, y = Math.max(0, G - 36); ok && y < G - 3; y++) for (k = -3; k <= 3; k++) if (!AIRY[pCell(g, x + k, y)]) { ok = false; break; }
    for (y = G - 6; ok && y <= G + 1; y++) for (k = -4; k <= 4; k++) if (P_FLAM[pCell(g, x + k, y)]) { ok = false; break; }
    if (!ok) continue;
    p.task = { kind: "festival", x: x, y: G - 1, side: p.x < x ? -1 : 1, t: 0, act: 0, n: 3 + irnd(3), shot: 0, on: false };
    g.festT = g.tick + 600;   /* (one organiser at a time: the next gap starts when the show does) */
    return true;
  }
  p.festCD = g.tick + 1800;   /* nowhere round here: they will think about it again later */
  return false;
}
function iTaskFestival(g, p, k) {
  if (++k.t > 3000 || g.blaze.length) return iDone(p, false);
  var sx = k.x + k.side * 4, j = k.y * g.gw + k.x;
  if (!k.on) {
    if (Math.abs(p.x - sx - 0.5) > 1 || Math.abs(Math.floor(p.y) - k.y) > 1) {
      if (iWalk(g, p, k, "fest" + k.x, sx, k.y, function (x, y) { return Math.abs(x - sx) <= 1 && Math.abs(y - k.y) <= 1; })) pGiveUp(g, p, sx);
      return false;
    }
    /* there: tell everybody */
    k.on = true; k.act = 0;
    g.festT = g.tick + I_FEST_GAP + irnd(I_FEST_GAP);
    pSay(g, p, "festival", true);
    feed(g, p.name + " is putting on a fireworks show", "#ffd94a", "fest");
    for (var q = 0; q < g.peasants.length; q++) {
      var o = g.peasants[q];
      if (o === p || o.dead || o.state !== "walk" || o.sleep || o.fire || (o.task && !I_FUN[o.task.kind]) || Math.abs(o.x - k.x) > 160 || Math.random() < 0.15) continue;
      o.task = { kind: "watch", x: k.x, y: k.y, t: 0, until: g.tick + 120 * (k.n + 2), side: o.x < k.x ? -1 : 1 };
    }
  }
  p.dir = -k.side; p.idle = 0;
  var ph = k.act++ % 120;
  if (k.shot >= k.n) {
    /* the grand finale: three at once */
    if (ph === 30) {
      pSay(g, p, "finale", true);
      for (var f = -1; f <= 1; f++) partAdd(g, PK_ROCKET, k.x + f * 2 + 0.5, k.y, f * 0.15, -1.1, 40 + irnd(30), SPARK_HOT[3], 0);
      g.fx.whistle++;
    }
    if (ph === 110) { achieve(g, "festival"); p.bored = 0; return iDone(p, true); }
    return true;
  }
  if (ph === 10) {
    if (!AIRY[g.m[j]]) return iDone(p, false);   /* something in the way of the launch: never mind */
    sandSet(g, j, MAT.FIREWORK);
    p.pose = "hammerA";
  } else if (ph > 10 && ph < 70) {
    p.pose = "chopB";   /* holding the match out */
    if (ph % 6 === 0) pChips(g, k.x + 0.5, k.y + 0.3, 1, SPARK_HOT);
    if (ph === 30 && p.sayT <= 0 && Math.random() < 0.5) pSay(g, p, "fuse");
  } else if (ph === 70) {
    if (g.m[j] === MAT.FIREWORK) sandLaunch(g, j);
    k.shot++;
  }
  return true;
}
function iTaskWatch(g, p, k) {
  if (g.tick > k.until || ++k.t > 2400) { p.bored = 0; return iDone(p, true); }
  var gx = k.x + k.side * (9 + (p.id % 6)), fy = Math.floor(p.y);
  if (Math.abs(p.x - gx - 0.5) > 2 || Math.abs(fy - k.y) > 6) {
    if (iWalk(g, p, k, "watch" + k.x, gx, k.y, function (x, y) { return Math.abs(x - gx) <= 2 && Math.abs(y - k.y) <= 6; })) pGiveUp(g, p, gx);
    return false;
  }
  p.dir = -k.side; p.pose = "stand";
  return true;
}

/* -------------------------------------------------------------------
   THE PAPERWORK: names, news, the readout
   ------------------------------------------------------------------- */
function iLabel(s) {
  if (s.kind === "farm") return s.who ? pTitle(s.who) + "'s field" : "the field";
  if (s.kind === "lamp") return s.who ? pTitle(s.who) + "'s porch light" : "the porch light";
  if (s.kind === "grave") return "the grave of " + iName(s.of);
  if (s.kind === "scarecrow") return "the scarecrow";
  if (s.kind === "jetty") return "the jetty";
  return "";
}
/* a site of ours is finished. true if it was one of ours */
function iFinish(g, s, p) {
  var who = p ? p.name : "the village";
  if (s.kind === "farm") { feed(g, iCap(bLabel(s)) + " is sown. now: the waiting", "#a8e08a", "plan" + s.id); achieve(g, "farm"); }
  else if (s.kind === "lamp") { feed(g, "a lantern burns by " + (s.who ? pTitle(s.who) + "'s" : "the") + " door", "#ffe08a", "lamp" + s.home); achieve(g, "lamp"); }
  else if (s.kind === "jetty") { feed(g, who + " built a jetty", "#a8e08a", "plan" + s.id); achieve(g, "jetty"); }
  else if (s.kind === "scarecrow") { feed(g, "a scarecrow keeps watch over " + (s.who ? pTitle(s.who) + "'s" : "the") + " wheat", "#a8e08a", "plan" + s.id); achieve(g, "scarecrow"); }
  else if (s.kind === "grave") {
    feed(g, "the cross for " + iName(s.of) + " is up. it says: \"" + s.note + "\"", "#c8d0dc", "plan" + s.id);
    achieve(g, "grave");
    /* and a flower, at the foot of it */
    var x = Math.round(s.cx - 0.5) + (Math.random() < 0.5 ? -1 : 1), j = s.y1 * g.gw + x;
    if (g.m[j] === MAT.EMPTY && pSolid(g, x, s.y1 + 1)) { sandSet(g, j, MAT.FLOWER); g.sh[j] = irnd(42) * 6 + 1 + irnd(5); }
  } else return false;
  return true;
}
/* what the village knows, and who thought of it, and what might put the rest into their heads: for the bar at the
   bottom, with the cursor over the IDEAS count */
function iSummary(g) {
  var known = [], todo = [];
  IDEAS.forEach(function (I) {
    if (g.know[I.id]) known.push(I.title + " (" + iShort(g.know[I.id]) + ")");
    else todo.push(I.hint + "?");
  });
  return (known.length ? "IDEAS: " + known.join(", ") : "NO IDEAS YET. WELL-FED PEASANTS HAVE THEM") +
         (todo.length ? ".  TO COME: " + todo.join(" ") : ".  THAT IS ALL OF THEM. FOR NOW");
}
/* what they are up to, for the bar at the bottom. "" if it is none of ours */
function iMood(g, p) {
  var k = p.task, s;
  if (p.bulb > 0) return "has had an idea!";
  if (!k) return "";
  if (k.kind === "build" && (s = bSite(g, k.site)) && s.kind === "farm")
    return (s.sow ? "is sowing " : "is working on ") + bLabel(s) + ". it takes no wood, just elbow grease";
  if (k.kind === "bucket" && k.field) return p.pail ? "is watering the wheat" : "is fetching water for the wheat";
  if (k.kind === "bucket" && p.pail && iVictim(g, p)) return "is running at somebody who is on fire with a bucket";
  if (k.kind === "bucket") return p.pail ? "is running at the fire with a bucket of water" : "is fetching water. something is on fire";
  if (k.kind === "fish") return !k.bob ? "is off fishing" : (k.tug ? "has a bite!" : "is fishing. " + (k.n ? "caught " + k.n + " so far" : "nothing yet"));
  if (k.kind === "festival") return k.on ? "is putting on a fireworks show" : "is setting up for a fireworks show";
  if (k.kind === "watch") return "is watching the fireworks";
  if (k.kind === "visit") return (s = bSite(g, k.site)) ? "is visiting " + bLabel(s) : "is visiting a grave";
  return "";
}

/* -------------------------------------------------------------------
   DRAWING
   ------------------------------------------------------------------- */
var I_BULB_ON = hex32("#fff6a0"), I_BULB_MID = hex32("#ffd84a"), I_BULB_BASE = hex32("#8a8e96");
var I_PAIL = hex32("#9aa2ae"), I_PAIL_RIM = hex32("#c8ced8"), I_PAIL_WET = hex32("#3a7ade");
var I_ROD = hex32("#8a5a30"), I_LINE = hex32("#d8dce4"), I_BOB = hex32("#e83a3a"), I_BOB_TOP = hex32("#f4f4f4");
var I_LAMP_WARM = hex32("#ffc860"), I_SACK = hex32("#d8c090"), I_STRAW = hex32("#e8d070"), I_STRAW_D = hex32("#b89838");
function iPut(g, x, y, col, glow) {
  if (x < 0 || y < 0 || x >= g.gw || y >= g.gh) return;
  var i = y * g.gw + x;
  g.px[i] = col;
  if (glow) g.gpx[i] = col;
}
/* what they are holding, and what they are thinking: over the top of the peasant, at (ox, oy) */
function iDrawGear(g, p, ox, oy) {
  var d = p.dir, k = p.task, x, y;
  if (p.bulb > 0 && (p.bulb < I_BULB - 20 || (p.bulb >> 2) & 1)) {
    iPut(g, ox, oy - 9, I_BULB_ON, true);
    iPut(g, ox - 1, oy - 8, I_BULB_MID, true); iPut(g, ox, oy - 8, I_BULB_ON, true); iPut(g, ox + 1, oy - 8, I_BULB_MID, true);
    iPut(g, ox, oy - 7, I_BULB_MID, true);
    iPut(g, ox, oy - 6, I_BULB_BASE);
  }
  if (!k || p.state !== "walk" || p.climb || p.rope || p.swimming || p.sleep) return;
  if (k.kind === "bucket") {
    var up = p.pose === "hammerA", by = up ? oy - 4 : oy + 1, bx = ox + d * 2;
    iPut(g, bx, by, p.pail ? I_PAIL_WET : I_PAIL_RIM); iPut(g, bx + d, by, p.pail ? I_PAIL_WET : I_PAIL_RIM);
    iPut(g, bx, by + 1, I_PAIL); iPut(g, bx + d, by + 1, I_PAIL);
  } else if (k.kind === "fish" && k.bob) {
    /* the rod, up and out; the line, sagging down to the bobber; the bobber, under when something bites */
    var tx = ox + d * 4, ty = oy - 5;
    iPut(g, ox + d * 2, oy, I_ROD); iPut(g, ox + d * 2, oy - 1, I_ROD); iPut(g, ox + d * 3, oy - 2, I_ROD); iPut(g, ox + d * 3, oy - 3, I_ROD);
    iPut(g, ox + d * 4, oy - 4, I_ROD); iPut(g, tx, ty, I_ROD);
    var bx2 = k.bob.x, by2 = k.bob.y - 1 + (k.tug ? 1 : 0) + (k.tug && (g.tick >> 2) & 1 ? 1 : 0);
    var n = Math.max(Math.abs(bx2 - tx), Math.abs(by2 - ty)) || 1, sag = k.tug ? 0 : 2;
    for (var s = 1; s < n; s++) {
      var t = s / n;
      x = Math.round(tx + (bx2 - tx) * t); y = Math.round(ty + (by2 - ty) * t + sag * 4 * t * (1 - t));
      if (x >= 0 && y >= 0 && x < g.gw && y < g.gh && AIRY[g.m[y * g.gw + x]]) iPut(g, x, y, blend32(g.px[y * g.gw + x], I_LINE, 0.55));
    }
    iPut(g, bx2, by2, k.tug ? blend32(I_BOB, SAND_PAL[MAT.WATER][0], 0.5) : I_BOB);
    if (!k.tug) iPut(g, bx2, by2 - 1, I_BOB_TOP);
  }
}
/* over the world: a warm pool of light round every lantern, and the scarecrows' clothes. returns how many things glow */
function iDraw(g) {
  var S = g.sites, px = g.px, gp = g.gpx, gw = g.gw, gh = g.gh, hot = 0, k, j, s, e, x, y, dx, dy;
  for (k = 0; k < S.length; k++) {
    s = S[k];
    if (s.kind === "lamp") for (j = 0; j < s.plan.length; j++) {
      e = s.plan[j];
      if (e.v !== MAT.LAMP || g.m[e.i] !== MAT.LAMP) continue;
      var lx = e.i % gw, ly = (e.i / gw) | 0, fl = 0.85 + 0.1 * Math.sin(g.t * 11 + lx) + 0.05 * Math.sin(g.t * 23 + ly);
      for (dy = -7; dy <= 8; dy++) for (dx = -7; dx <= 7; dx++) {
        x = lx + dx; y = ly + dy;
        var r = Math.sqrt(dx * dx + dy * dy);
        if (r > 7.5 || r < 1 || x < 0 || y < 0 || x >= gw || y >= gh) continue;
        var f = (1 - r / 7.5); f = f * f * 0.42 * fl;
        px[y * gw + x] = blend32(px[y * gw + x], I_LAMP_WARM, f);
      }
      gp[e.i] = px[e.i];
      if (ly > 0) gp[e.i - gw] = blend32(0xff000000, px[e.i], 0.5);
      if (ly < gh - 1) gp[e.i + gw] = blend32(0xff000000, px[e.i], 0.6);
      hot++;
    } else if (s.kind === "scarecrow" && s.done) iDrawCrow(g, s);
  }
  return hot;
}
/* a straw hat, a sack for a head, and a shirt on the crossbar, for as much of the scarecrow as is still standing */
function iDrawCrow(g, s) {
  var x = s.px, G = s.G, k;
  function wood(y) { return pCell(g, x, y) === MAT.WOOD; }
  function air(X, Y) { return AIRY[pCell(g, X, Y)]; }
  if (wood(G - 5)) {
    /* the head, and a wide straw hat on it: a brim, and a crown */
    iPut(g, x, G - 5, I_SACK);
    for (k = -2; k <= 2; k++) if (air(x + k, G - 6)) iPut(g, x + k, G - 6, k ? I_STRAW_D : I_STRAW);
    if (air(x, G - 7)) iPut(g, x, G - 7, I_STRAW);
  }
  if (wood(G - 4)) {
    /* the shirt, on the crossbar and down the post, with straw sticking out of the cuffs */
    for (k = -2; k <= 2; k++) if (pCell(g, x + k, G - 4) === MAT.WOOD) iPut(g, x + k, G - 4, s.shirt);
    if (wood(G - 3)) iPut(g, x, G - 3, blend32(s.shirt, 0xff000000, 0.25));
    for (k = -3; k <= 3; k += 6) if (air(x + k, G - 4) && pCell(g, x + k - (k > 0 ? 1 : -1), G - 4) === MAT.WOOD) iPut(g, x + k, G - 4, I_STRAW);
  }
}
