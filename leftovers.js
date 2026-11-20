/* =====================================================================
   PLEASAND  --  leftovers.js

   what is left over: the ash of every fire, the salt a pond boils down
   to, the lumps of glass the lightning leaves in the sand, the snow
   that comes down when the steam is chilled hard enough, the rock salt
   in the mine, the odd pinch of gunpowder somebody has left lying
   about, and (to a village that smelts) a lump of metal, which is
   scrap iron. the peasants pick it all up (it might come in handy),
   and it does:

     PLAY        with snow on the ground and nothing much to do: a
                 snowball, at whoever is nearest, who throws one back,
                 and then everybody is at it. or a snowman: snow packed
                 hard, a coal eye or two, a carrot, a hat, a name. it
                 lasts as long as the cold does. and ice is for skating
                 on, on purpose, until the feet go
     POTASH      (ash, swept up, and a field) ash raked into the
                 furrows: the wheat comes up twice as fast while it
                 lasts, and comes down grey with it
     SALT        (salt in a pocket, and a fall on the ice, or a fish
                 that would not keep) salt flung on the ice where
                 somebody went over, which melts it; and a fish caught
                 on a full stomach is salted, and kept for later
     BLACK       (coal, salt and ash, all three: or a pinch of the real
     POWDER      thing) ground together, fine, in a bowl, well away
                 from the fire. a charge of it at the end of a gallery
                 takes the face out four columns at a time (FIRE IN THE
                 HOLE), a charge in the pond brings up fish for
                 everybody, and a charge or two in a fireworks show is
                 a bigger show. a peasant on fire with powder in their
                 pockets has a short, eventful afternoon
     GLASS       (a lump of it found, or a furnace hot a good long
                 while) sand and coal at the furnace come out as panes
                 of glass, and a field gets a glasshouse: a glass roof
                 on iron posts. under it the ground's warmth stays in:
                 the wheat grows faster, needs no watering, and keeps
                 growing through a cold snap a good while longer than
                 out in the open. the frost, which
                 out in the open stops wheat growing, and a hard one
                 kills it. (the posts are iron girders: a forge's
                 worth of iron, which they walk through)

   a glasshouse is a site, like a house (build.js). a snowman is not:
   nobody mends a snowman.
   ===================================================================== */
"use strict";

var L_POCKET = { ash: 12, salt: 12, glass: 12, powder: 4, fish: 3, sand: 6, iron: 20 };
var L_LOOSE = new Uint8Array(NMAT);   /* what is picked up off the ground, and what it goes in a pocket as */
L_LOOSE[MAT.ASH] = L_LOOSE[MAT.SALT] = L_LOOSE[MAT.GLASS] = L_LOOSE[MAT.GUNPOWDER] = L_LOOSE[MAT.METAL] = 1;
var L_AS = []; L_AS[MAT.ASH] = "ash"; L_AS[MAT.SALT] = "salt"; L_AS[MAT.GLASS] = "glass"; L_AS[MAT.GUNPOWDER] = "powder";
L_AS[MAT.METAL] = "iron";   /* (a lump of metal lying about is scrap: a fifth of a bar a cell, to a village that smelts) */
var L_TAKE = { powder: 0.5, iron: 0.2 };   /* how much a cell is worth in a pocket (one, unless it says here) */
var L_LUMP = 14;            /* glass in a lump this big or smaller is a lump; bigger is somebody's window, and is let be */
var L_POTASH = 14000;       /* ticks a raking of ash keeps a field going */
var L_POTASH_ASH = 3;       /* ash to a raking */
var L_FROST = 1;            /* wheat out in the open grows nothing below this */
var L_KILL = -12;           /* and a frost this hard kills it */
var L_GROW = 2;             /* how much faster wheat grows with potash (and under glass, half as much again) */
var L_BALL_G = 0.08;        /* gravity on a snowball, or a charge in the air */
var L_FUSE = 220;           /* ticks of fuse on a charge in the rock */
var L_BLAST = 4;            /* columns of gallery a charge takes out */
var L_STUN = 6;             /* how near a bang flattens anybody (and three, for a long while) */
var L_CLEAR = 13;           /* how far back down the gallery the one who lit it goes (and anybody else down there) */
var L_BACK = 10;            /* and no charge nearer the shaft than this: there would be nowhere to stand back to */
var L_GRIND = 140;          /* ticks at the bowl for a charge of black powder */
var L_GLASS = 130;          /* ticks at the bellows for two panes of glass */
var L_ROOF = 12;            /* how high over a field its glass roof goes: a peasant is nine */
/* a snowman, [up from the ground, across], bottom first: a ball five wide, a ball three wide, and a head. six high, and a
   hat on top of that: near enough as tall as whoever built him */
var L_SNOWMAN = [[0, -2], [0, -1], [0, 0], [0, 1], [0, 2], [1, -2], [1, -1], [1, 0], [1, 1], [1, 2],
                 [2, -1], [2, 0], [2, 1], [3, -1], [3, 0], [3, 1], [4, -1], [4, 0], [4, 1], [5, -1], [5, 0], [5, 1]];
var L_SNOWNAMES = ["FROSTY", "MR. COLD", "SIR SNOWS", "THE BIG ONE", "LUMPY", "CHILLY", "OLD WHITE", "MELTY", "CARROT FACE", "STEVE"];

P_SAY.idea_potash = ["the wheat by the fire grows best. ASH", "what if we put the ash ON the field", "the fire leaves something good behind",
  "ash! it's practically food. for wheat"];
P_SAY.idea_salt = ["salt melts ice. who knew", "a fish in salt keeps for ever", "SALT. on everything", "what if the ice... just wasn't"];
P_SAY.idea_powder = ["coal, salt, ash, ground fine. what happens if...", "BLACK POWDER", "it goes bang. we should use that",
  "what if we made the rock go away. all at once"];
P_SAY.idea_glass = ["the sand by the furnace came out shiny", "sand, but you can see through it. GLASS", "a roof made of window",
  "what if the wheat had a house"];
P_SAY.gather = ["finders keepers", "that'll come in handy", "*sweep sweep*", "tidy village, tidy mind", "this could be useful",
  "nobody wants this? mine"];
P_SAY.gatherAsh = ["ash. lovely ash", "the fire left us a present", "*sweep*", "it's still warm"];
P_SAY.gatherSalt = ["salt!", "a pinch of this", "it's like sand, but tastier", "salt. for the fish"];
P_SAY.gatherGlass = ["the lightning made this", "it's sand, but glass", "shiny!", "see-through sand"];
P_SAY.gatherPowder = ["what's this black stuff", "it smells like fireworks", "careful with this one", "*sniff* ...bangy"];
P_SAY.gatherScrap = ["scrap!", "that's iron, that is", "the furnace'll want this", "*clank*"];
P_SAY.snowball = ["SNOWBALL!", "take that!", "heads up!", "incoming!", "*whump*", "hyah!", "eat snow!"];
P_SAY.snowHit = ["OI!", "right. that's it", "you'll pay for that", "COLD COLD COLD", "it's down my neck", "war!", "ha! missed! ...no"];
P_SAY.snowJoin = ["snowball fight!", "me too!", "count me in", "every peasant for themselves"];
P_SAY.snowman = ["a snowman!", "roll, roll, roll", "he needs a hat", "a nose. a carrot nose", "the big ball at the bottom"];
P_SAY.snowmanDone = ["he's perfect", "meet {d}", "look at him", "his name is {d}", "a friend!"];
P_SAY.snowmanHello = ["morning, {d}", "evening, {d}", "looking sharp, {d}", "nice hat, {d}", "hello {d}. cold enough for you?", "{d}! my favourite"];
P_SAY.snowmanMine = ["that's my {d}", "still standing, {d}", "best snowman in the valley", "i made him, you know"];
P_SAY.cheer = ["GET HIM!", "ha! right in the face", "duck!", "behind you!", "my money's on {n}", "ooooh"];
P_SAY.snowmanGone = ["goodbye, {d}", "{d} has melted", "he had his whole life ahead of him", "it's just a puddle now", "rest well, {d}"];
P_SAY.skate = ["wheeeee", "look at me!", "i'm gliding!", "no hands!", "a twirl!", "faster!", "graceful. like a duck"];
P_SAY.grit = ["salt on the ice", "no more falling over", "*sprinkle*", "safety first", "the ice is no match for me"];
P_SAY.potash = ["ash for the wheat", "*rake rake*", "grow, wheat, grow", "a bit of the fire, for the field"];
P_SAY.fizzle = ["*pinch*", "not with you standing there", "next time", "that was close"];
P_SAY.noclear = ["can't get a clear throw", "the bank's in the way", "no. not from here", "i'll hit the roof"];
P_SAY.brine = ["brine. for the salt", "*slosh*", "salty water", "don't drink it"];
P_SAY.season = ["a pinch of salt", "needs salt. there", "*sprinkle*", "much better with salt"];
P_SAY.salted = ["salted, for later", "this'll keep", "fish for a rainy day", "into the salt with you"];
P_SAY.saltfish = ["salt fish. again", "so salty", "i saved this one", "a fish from last week. still good"];
P_SAY.grind = ["grind, grind", "*very carefully*", "nobody sneeze", "black powder. black powder", "not near the fire, not near the fire"];
P_SAY.charge = ["FIRE IN THE HOLE!", "everybody back!", "fuse is lit!", "RUN!", "cover your ears!"];
P_SAY.blasted = ["WHAT?", "my ears!", "my eyebrows!", "that's moved some rock", "did it work?", "BOOM", "i can't hear anything"];
P_SAY.bombfish = ["one for the fish", "fishing. the quick way", "stand back from the water", "lunch is coming up"];
P_SAY.fishrain = ["FISH!", "it's raining fish", "lunch!", "fish for everybody", "that's one way to fish"];
P_SAY.glassblow = ["sand in, glass out", "it's runny! it's glass!", "careful, it's hot", "*puff puff*", "see-through. nice"];
P_SAY.planGlass = ["a glasshouse, for the wheat", "a roof you can see through", "the wheat'll love this", "glass, on posts"];
P_SAY.nosnow = ["not enough snow", "the snow's all gone", "he'll have to wait for more snow"];
P_SAY.oops = ["oops", "that was the bank", "too far!", "not the pond. the bank", "everybody all right?"];
P_SAY.pockets = ["MY POCKETS", "NOT THE POWDER", "oh no. the powder", "i should've emptied my pockets"];

P_ACHIEVE.snowball = ["SNOWBALL FIGHT", "three peasants or more, throwing snow. nobody won"];
P_ACHIEVE.snowman = ["THE SNOWMAN", "snow, a carrot and some coal. he has a name"];
P_ACHIEVE.skate = ["ON PURPOSE", "a peasant went skating. on the ice they keep falling over on"];
P_ACHIEVE.grit = ["GRITTED", "salt on the ice. the falling over stops. mostly"];
P_ACHIEVE.potash = ["POTASH", "ash on the field. the wheat is coming up grey and fast"];
P_ACHIEVE.saltfish = ["SALT FISH", "a fish salted for later, and eaten later. planning"];
P_ACHIEVE.powder = ["BLACK POWDER", "ground fine, in a bowl. nobody sneezed"];
P_ACHIEVE.blast = ["FIRE IN THE HOLE", "a charge in the rock. four columns of it, gone"];
P_ACHIEVE.bombfish = ["FISHING, THE QUICK WAY", "a charge in the pond, and fish for everybody"];
P_ACHIEVE.pockets = ["DO NOT CARRY POWDER INTO A FIRE", "a peasant's pockets went off"];
P_ACHIEVE.glass = ["GLASS", "sand and a hot fire. you can see right through it"];
P_ACHIEVE.glasshouse = ["THE GLASSHOUSE", "wheat with a roof over it, made of window. it loves it"];
P_ACHIEVE.frost = ["FROST", "the wheat has stopped growing. it is too cold out"];

/* -------------------------------------------------------------------
   THE BOOKS
   ------------------------------------------------------------------- */
/* the world wiped clean (C): nothing of ours left in it, and nobody still at a job in it */
function lClearWorld(g) {
  g.lballs = []; g.lcharges = []; g.lsnowmen = []; g.booms = []; g.lboost = null;
  for (var k = 0; k < g.peasants.length; k++) { var t = g.peasants[k].task; if (t && (t.kind === "snowman" || t.kind === "blast" || t.kind === "skate" || t.kind === "grit" || t.kind === "bombfish" || t.kind === "snowball" || t.kind === "standback")) g.peasants[k].task = null; }
}
function lReset(g) {
  g.lNoThrow = {}; g.glassNo = 0;
  g.lballs = []; g.lcharges = []; g.lsnowmen = []; g.booms = []; g.lslip = []; g.lboost = null; g.lfights = 0; g.frostT = 0;
}
/* what is in their pockets of ours, for the readout: "3 ash, 2 salt" */
function lPockets(p) {
  var out = [];
  if (p.ash >= 1) out.push(Math.floor(p.ash) + " ash");
  if (p.salt >= 1) out.push(Math.floor(p.salt) + " salt");
  if (p.powder > 0) out.push((p.powder >= 1 ? Math.floor(p.powder) + (p.powder % 1 ? " and a half" : "") : "half a") + " charge" + (p.powder >= 1.5 ? "s" : "") + " of black powder");
  if (p.sand >= 1) out.push(Math.floor(p.sand) + " sand (for glass)");
  if (p.glass >= 1) out.push(Math.floor(p.glass) + " glass");
  if (p.fish >= 1) out.push(p.fish + " salt fish");
  return out.join(", ");
}
/* everybody's pockets, put together: how much of r the village has about it */
function lToHand(g, r) {
  var n = 0;
  for (var k = 0; k < g.peasants.length; k++) if (!g.peasants[k].dead) n += g.peasants[k][r] || 0;
  return n;
}
/* in reach of a hand, an axe, a spade (rx across, up and down from the feet) */
function lAt(p, x, y, rx, up, down) {
  var fy = Math.floor(p.y);
  return Math.abs(x + 0.5 - p.x) <= rx + 0.5 && y >= fy - up && y <= fy + down;
}
/* walk p towards (x, y), as every errand here does: 1 there, 0 on the way, -1 given up (somewhere they cannot get to) */
function lGo(g, p, k, key, x, y, rx, up, down) {
  if (lAt(p, x, y, rx, up, down)) return 1;
  p.idle = 0;
  if (iWalk(g, p, k, key, x, y, pathNear(x, y, rx, up, down))) { pGiveUp(g, p, x); return -1; }
  return 0;
}
/* anything that has been on our books lately, and is not here now: gone (a peasant who died, a site pulled down) */
function lAlive(g, id) {
  for (var k = 0; k < g.peasants.length; k++) if (g.peasants[k].id === id && !g.peasants[k].dead) return g.peasants[k];
  return null;
}
/* busy with something that matters (not just for fun): leave them be */
function lFree(q) { return !q.task || I_FUN[q.task.kind] || q.task.kind === "snowball"; }

/* -------------------------------------------------------------------
   WHAT THEY DO ABOUT IT. called from iPick, late on: true if they found
   something to do
   ------------------------------------------------------------------- */
function lPick(g, p, hungry) {
  var K = g.know;
  if (p.lNext > g.tick || hungry) return false;
  if (K.salt && (p.salt || 0) >= 1 && Math.random() < 0.5 && lGoGrit(g, p)) return true;
  if (K.potash && (p.ash || 0) >= L_POTASH_ASH && Math.random() < 0.5 && lGoPotash(g, p)) return true;
  if (K.powder && lPowderPick(g, p)) return true;
  if (K.glass && lGlassPick(g, p)) return true;
  /* the store at the furnace: pockets full of ash or salt emptied into it, and what is wanted fetched out of it. and salt
     boiled out of brine, when the village runs short */
  if (lGoStore(g, p)) return true;
  if (K.salt && K.bucket && Math.random() < 0.3 && lGoBrine(g, p)) return true;
  if ((p.bored > 300 || Math.random() < 0.1) && Math.random() < 0.35 && lGoGather(g, p)) return true;
  p.lNext = g.tick + 200 + irnd(300);   /* (nothing of ours: not again for a bit) */
  return false;
}
/* one tick of one of the jobs in here, or undefined if it is not one of ours */
function lTask(g, p, k) {
  switch (k.kind) {
    case "gather": return lTaskGather(g, p, k);
    case "snowball": return lTaskSnowball(g, p, k);
    case "snowman": return lTaskSnowman(g, p, k);
    case "skate": return lTaskSkate(g, p, k);
    case "grit": return lTaskGrit(g, p, k);
    case "potash": return lTaskPotash(g, p, k);
    case "grind": return lTaskGrind(g, p, k);
    case "blast": return lTaskBlast(g, p, k);
    case "bombfish": return lTaskBombFish(g, p, k);
    case "glassblow": return lTaskGlass(g, p, k);
    case "store": return lTaskStore(g, p, k);
    case "standback": return lTaskStandback(g, p, k);
    case "brine": return lTaskBrine(g, p, k);
  }
  return undefined;
}

/* -------------------------------------------------------------------
   PICKING THINGS UP: ash, salt, a lump of glass, a pinch of gunpowder,
   lying about where anybody could trip over it
   ------------------------------------------------------------------- */
/* how many cells of glass (or metal) are in the lump (x, y) is part of, up to L_LUMP + 1 */
function lLump(g, x, y) {
  var seen = {}, st = [[x, y]], n = 0, c, q, v = pCell(g, x, y);
  while (st.length && n <= L_LUMP) {
    c = st.pop(); q = c[1] * g.gw + c[0];
    if (seen[q] || pCell(g, c[0], c[1]) !== v) continue;
    seen[q] = 1; n++;
    st.push([c[0] + 1, c[1]], [c[0] - 1, c[1]], [c[0], c[1] + 1], [c[0], c[1] - 1]);
  }
  return n;
}
/* something lying about that p could pick up: loose, on top (air over it: not out of the middle of a dune), nobody's,
   not too hot to handle, and room for it in their pockets */
function lPickable(g, p, x, y) {
  var c = pCell(g, x, y), r = L_AS[c];
  if (!r || bMarked(g, x, y) || (p[r] || 0) >= L_POCKET[r]) return false;
  if (!AIRY[pCell(g, x, y - 1)] || g.T[y * g.gw + x] > 60) return false;
  if ((c === MAT.GLASS || c === MAT.METAL) && lLump(g, x, y) > L_LUMP) return false;   /* (a window, a girder: somebody's) */
  if (c === MAT.METAL && !g.know.smelt) return false;   /* (it is only scrap to somebody who knows what iron is for) */
  if (c === MAT.SALT && (sandHas(g, x, y, MAT.ICE) >= 0 || sandHas(g, x, y, MAT.SNOW) >= 0)) return false;   /* (at work on the ice) */
  if (bSiteAround(g, x, y, null, 2)) return false;   /* (somebody's house, somebody's field: theirs) */
  return true;
}
function lGoGather(g, p) {
  if (p.lGatherT > g.tick) return false;
  p.lGatherT = g.tick + 900 + irnd(900);
  var t = pFind(g, p, L_LOOSE, 70, function (g2, x, y) { return !pAvoid(g2, p, x) && lPickable(g2, p, x, y); }, 16);
  if (!t) return false;
  p.task = { kind: "gather", x: t.x, y: t.y, t: 0, act: 0, n: 0, what: L_AS[pCell(g, t.x, t.y)] };
  return true;
}
function lTaskGather(g, p, k) {
  if (++k.t > 1500) return iDone(p, k.n > 0);
  if (!lPickable(g, p, k.x, k.y)) {
    /* gone (somebody else got it, it blew away): another like it close by, or that is that */
    var t = pFind(g, p, L_LOOSE, 4, function (g2, x, y) { return lPickable(g2, p, x, y); });
    if (!t) return iDone(p, k.n > 0);
    k.x = t.x; k.y = t.y; k.what = L_AS[pCell(g, t.x, t.y)];
  }
  var go = lGo(g, p, k, "gather" + k.x + "," + k.y, k.x, k.y, 2, 10, 2);
  if (go <= 0) return false;
  p.dir = k.x + 0.5 < p.x ? -1 : 1;
  k.act++;
  p.pose = (k.act % 16) < 8 ? "chopA" : "chopB";   /* (a sweep, a scoop) */
  if (k.act % 16 !== 8) return true;
  lTake(g, p, k.x, k.y, k.n++ === 0);
  p.bored = Math.max(0, p.bored - 150);
  var more = k.n < 8 ? pFind(g, p, L_LOOSE, 4, function (g2, x, y) { return lPickable(g2, p, x, y); }) : null;
  if (!more) return iDone(p, true);
  k.x = more.x; k.y = more.y; k.what = L_AS[pCell(g, more.x, more.y)];
  return true;
}
/* (x, y) off the ground and into p's pocket: the news, if it is the first of its kind, and whatever idea it puts in
   their head. chat: say something about it */
function lTake(g, p, x, y, chat) {
  var j = y * g.gw + x, c = g.m[j], r = L_AS[c];
  heatVanish(g, j);   /* (into a pocket, heat and all: the hole it leaves is no hotter than it was) */
  pChips(g, x + 0.5, y + 0.5, 2, [SAND_PAL[c][0], SAND_PAL[c][120]]);
  p[r] = (p[r] || 0) + (L_TAKE[r] || 1);   /* (two pinches of gunpowder make a charge; five lumps of scrap, a bar) */
  g.found[r] = (g.found[r] || 0) + 1;
  if (g.found[r] === 1) {
    feed(g, p.name + (r === "ash" ? " swept up the ash. it might come in handy" : r === "salt" ? " picked up some salt" :
         r === "glass" ? " picked up a lump of glass. the sand, melted" : r === "iron" ? " picked up some scrap metal. good for a bar of iron, near enough" :
         " found some gunpowder lying about, and pocketed it. carefully"), "#d8d0c0", "find" + r);
  }
  if (chat && (p.sayT <= 0 || Math.random() < 0.3))
    pSay(g, p, r === "ash" ? "gatherAsh" : r === "salt" ? "gatherSalt" : r === "glass" ? "gatherGlass" : r === "powder" ? "gatherPowder" : r === "iron" ? "gatherScrap" : "gather");
  /* and what it puts into their heads */
  if (r === "ash" && g.know.farm && iCount(g, "farm")) iSpark(g, p, "potash");
  else if (r === "salt") iSpark(g, p, "salt");
  else if (r === "glass" && g.know.smelt) iSpark(g, p, "glass");
  else if (r === "powder" && g.know.mine) iSpark(g, p, "powder");
}
/* on the way past, on whatever errand: something lying right at their feet goes in a pocket without stopping (lStep) */
function lPassBy(g, p) {
  if (p.dead || p.state !== "walk" || p.climb || p.rope || p.swimming || p.fire || p.sleep || p.slip > 0 || p.panic > 0) return;
  var fx = Math.floor(p.x), fy = Math.floor(p.y), x, y;
  for (y = fy - 1; y <= fy + 1; y++) for (x = fx - 2; x <= fx + 2; x++) {
    if (!L_LOOSE[pCell(g, x, y)] || !lPickable(g, p, x, y)) continue;
    lTake(g, p, x, y, Math.random() < 0.2);
    return;
  }
}

/* -------------------------------------------------------------------
   PLAY: snow, and ice
   ------------------------------------------------------------------- */
/* called early in iPick, before the mine gets them: snow on the ground and nothing much to do is not a thing to waste */
function lPlay(g, p) {
  if (p.bored < 400 || p.lPlayT > g.tick || Math.random() > 0.5) return false;
  p.lPlayT = g.tick + 300 + irnd(300);
  return lPlayPick(g, p);
}
function lSnowy(g, x, y) { return pCell(g, x, y) === MAT.SNOW && !bMarked(g, x, y) && AIRY[pCell(g, x, y - 1)] && !lUnderMan(g, x, y); }
/* (the snow a snowman is standing on, or about to be: not to be rolled away from under him) */
function lUnderMan(g, x, y) {
  for (var k = 0; k < g.lsnowmen.length; k++) { var m = g.lsnowmen[k]; if (Math.abs(x - m.x) <= 3 && y >= m.G - 1 && y <= m.G + 2) return true; }
  return false;
}
function lPlayPick(g, p) {
  var snow = pFind(g, p, P_SNOW, 40, lSnowy, 10);
  if (snow) {
    /* somebody to throw it at: the nearest, unless they are busy with something that matters */
    var q = lFoe(g, p, 50);
    if ((Math.random() < 0.5 || !g.lsnowmen.length) && lGoSnowman(g, p, snow)) return true;
    if (q) { lStartFight(g, p, q); return true; }
  }
  return lGoSkate(g, p);
}
var P_SNOW = new Uint8Array(NMAT); P_SNOW[MAT.SNOW] = 1;
function lFoe(g, p, R) {
  var best = null, bd = R, k, q, d;
  for (k = 0; k < g.peasants.length; k++) {
    q = g.peasants[k];
    if (q === p || q.dead || q.state !== "walk" || q.sleep || q.fire || q.climb || q.swimming || !lFree(q)) continue;
    d = Math.abs(q.x - p.x) + Math.abs(q.y - p.y) * 2;
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}
function lStartFight(g, p, q) {
  p.task = { kind: "snowball", foe: q.id, n: 3 + irnd(4), t: 0, act: 0, ball: false };
  if (p.sayT <= 0 || Math.random() < 0.4) pSay(g, p, "snowball");
}
function lTaskSnowball(g, p, k) {
  var q = lAlive(g, k.foe);
  if (!q || ++k.t > 2400 || q.state === "space" || Math.abs(q.x - p.x) > 90) return iDone(p, true);
  var fy = Math.floor(p.y), d = q.x - p.x;
  if (!k.ball) {
    /* a handful of snow off the ground */
    if (!k.sx || !lSnowy(g, k.sx, k.sy)) {
      var s = pFind(g, p, P_SNOW, 30, lSnowy, 10);
      if (!s) { if (k.n < 3) return iDone(p, true); return iDone(p, false); }
      k.sx = s.x; k.sy = s.y;
    }
    var go = lGo(g, p, k, "snow" + k.sx + "," + k.sy, k.sx, k.sy, 2, 10, 2);
    if (go < 0) return false;
    if (!go) return false;
    p.dir = k.sx + 0.5 < p.x ? -1 : 1;
    k.act++; p.pose = "chopB";
    if (k.act < 12) return true;
    var j = k.sy * g.gw + k.sx;
    heatVanish(g, j);   /* (a handful of snow, melting or not: the cold goes with it) */
    k.ball = true; k.act = 0; k.sx = 0;
    return true;
  }
  /* then: in range of them, and let fly */
  if (Math.abs(d) > 36) { p.dir = d < 0 ? -1 : 1; p.idle = 0; return false; }
  if (Math.abs(d) < 5) { p.dir = d < 0 ? 1 : -1; p.idle = 0; return false; }   /* (too close to aim: back off a step) */
  p.dir = d < 0 ? -1 : 1;
  k.act++;
  p.pose = k.act < 14 ? "hammerA" : "chopB";
  if (k.act < 16) return true;
  lThrow(g, p, q.x, q.y - 5, "snow");
  if (p.sayT <= 0 && Math.random() < 0.4) pSay(g, p, "snowball");
  k.ball = false; k.act = 0;
  if (--k.n <= 0) { p.bored = 0; return iDone(p, true); }
  return true;
}
/* something thrown from p's hand at (tx, ty), on an arc that gets there: a snowball, or a lit charge */
function lThrow(g, p, tx, ty, kind, steady) {
  var a = lAim(p, tx, ty, steady ? 0 : 1);
  g.lballs.push({ x: a.x, y: a.y, vx: a.vx, vy: a.vy, from: p.id, kind: kind, t: 0, fuse: kind === "bomb" ? 70 + irnd(30) : 0 });
}
/* the arc from p's hand to (tx, ty): where it starts and how fast. wobble: how unsteady the hand is (0: a careful throw) */
function lAim(p, tx, ty, wobble) {
  var x = p.x + p.dir * 1.5, y = p.y - 7, dx = tx - x, dy = ty - y;
  var T = clamp(Math.abs(dx) / 1.4, 10, 42) + (wobble ? (Math.random() - 0.5) * 3 : 0);
  return { x: x, y: y, vx: dx / T + (wobble ? (Math.random() - 0.5) * 0.08 : 0), vy: (dy - 0.5 * L_BALL_G * T * T) / T };
}
/* would a throw on arc a come down in water (true), or hit something on the way (a roof, the bank, a bush: false) */
function lArcWet(g, a) {
  /* (step for step as lBallsStep flies it, so what the look says is what the throw does) */
  var x = a.x, y = a.y, vx = a.vx, vy = a.vy, t, j, n, s, nx, ny;
  for (t = 1; t <= 300; t++) {
    vy += L_BALL_G;
    n = Math.ceil(Math.max(Math.abs(vx), Math.abs(vy)) * 1.5) || 1;
    for (s = 0; s < n; s++) {
      nx = x + vx / n; ny = y + vy / n;
      if (nx < 0 || nx >= g.gw || ny >= g.gh) return false;
      if (ny >= 0) {
        j = Math.floor(ny) * g.gw + Math.floor(nx);
        if (WET[g.m[j]]) return true;
        if (LIQUID[g.m[j]]) return false;
        if (!AIRY[g.m[j]]) return false;
      }
      x = nx; y = ny;
    }
  }
  return false;
}
/* everything in the air, a tick on */
function lBallsStep(g) {
  var B = g.lballs, k, b, q, n, s, x, y, j, hit;
  for (k = B.length - 1; k >= 0; k--) {
    b = B[k]; b.t++; b.vy += L_BALL_G;
    if (b.kind === "bomb" && Math.random() < 0.5) partAdd(g, PK_GLINT, b.x, b.y, (Math.random() - 0.5) * 0.2, -0.2, 6, pick(SPARK_HOT));
    n = Math.ceil(Math.max(Math.abs(b.vx), Math.abs(b.vy)) * 1.5) || 1; hit = null;
    for (s = 0; s < n && !hit; s++) {
      x = b.x + b.vx / n; y = b.y + b.vy / n;
      if (x < 0 || x >= g.gw || y >= g.gh || b.t > 300) { hit = "gone"; break; }
      if (y >= 0) {
        j = Math.floor(y) * g.gw + Math.floor(x);
        if (b.kind === "bomb" && WET[g.m[j]]) { b.x = x; b.y = y; hit = "water"; break; }
        if (b.kind === "bomb" && LIQUID[g.m[j]]) { b.x = x; b.y = y; hit = "ground"; break; }   /* (oil, acid: no fish in that) */
        if (!AIRY[g.m[j]] && !(b.kind === "snow" && P_LEAF[g.m[j]])) { hit = "ground"; break; }
      }
      b.x = x; b.y = y;
      if (b.kind === "snow" && b.t > 4) {
        for (q = 0; q < g.peasants.length; q++) {
          var o = g.peasants[q];
          if (o.dead || o.id === b.from || o.state === "space" || Math.abs(o.x - b.x) > 1.6 || b.y < o.y - 9 || b.y > o.y + 0.5) continue;
          hit = o; break;
        }
        if (!hit) for (q = 0; q < g.ducks.length; q++) {
          var dk = g.ducks[q];
          if (!dk.dead && Math.abs(dk.x - b.x) < 1.5 && Math.abs(dk.y - 1 - b.y) < 2) { hit = { duck: dk }; break; }
        }
      }
    }
    if (!hit) continue;
    B.splice(k, 1);
    if (b.kind === "bomb") { if (hit === "water") lUnderwater(g, b); else if (hit === "ground") lDud(g, b); continue; }
    /* a snowball: splat */
    sparks(g, b.x, b.y, 6, 0.5, [hex32("#ffffff"), hex32("#dfeaf6")], 10, 0.2, PK_GLINT);
    if (hit === "gone") continue;
    if (hit === "ground") { partAdd(g, PK_DEBRIS, b.x - b.vx, b.y - b.vy, 0, 0, 2, SAND_PAL[MAT.SNOW][irnd(256)], MAT.SNOW); continue; }
    if (hit.duck) { dSay(g, hit.duck, "quack", true); dTakeOff(g, hit.duck, true); continue; }
    lHit(g, hit, lAlive(g, b.from));
  }
}
/* q got a snowball in the ear from p. they will have their revenge (and so, now and then, will the neighbours) */
function lHit(g, q, p) {
  q.cold = (q.cold || 0) + 14; q.bored = 0; g.fx.thud++;
  if (q.sayT <= 0 || Math.random() < 0.5) pSay(g, q, "snowHit", true);
  if (!p || q.state !== "walk" || q.sleep || q.fire || q.climb || !lFree(q) || q.hunger > P_HUNGRY) return;
  if (!(q.task && q.task.kind === "snowball")) { lStartFight(g, q, p); g.lfights++; }
  else q.task.foe = p.id;   /* (whoever got them last) */
  /* and anybody stood about nearby with nothing to do joins in: at whoever is nearest of the two */
  var n = 0, k, o;
  for (k = 0; k < g.peasants.length; k++) if (g.peasants[k].task && g.peasants[k].task.kind === "snowball") n++;
  for (k = 0; k < g.peasants.length && n < 8; k++) {
    o = g.peasants[k];
    if (o === p || o === q || o.dead || o.state !== "walk" || o.sleep || o.fire || o.climb || o.swimming || o.task || o.hunger > P_HUNGRY) continue;
    if (Math.abs(o.x - q.x) > 30 || Math.abs(o.y - q.y) > 12 || Math.random() < 0.6) continue;
    lStartFight(g, o, Math.abs(o.x - p.x) < Math.abs(o.x - q.x) ? p : q);
    pSay(g, o, "snowJoin", true); n++;
  }
  /* and whoever is watching, and not in it, has an opinion */
  var w = pOther(g, q, 30);
  if (w && w !== p && w.sayT <= 0 && !w.sleep && !(w.task && w.task.kind === "snowball") && Math.random() < 0.5) pSay(g, w, "cheer", false, q);
  if (n >= 3 && !g.got.snowball) { feed(g, "a snowball fight has broken out. " + n + " are in it", "#e8f4ff", "snowball"); achieve(g, "snowball"); }
}

/* a snowman: five wide, six high (and a hat), on flat ground with nothing over it, and snow not too far off to roll him from */
function lSnowmanOk(g, x, G) {
  var dx, y;
  if (x < 6 || x > g.gw - 7 || G < 10) return false;
  for (dx = -2; dx <= 2; dx++) if (!pSolid(g, x + dx, G) || bMarked(g, x + dx, G) || P_LEAF[pCell(g, x + dx, G)] || LIQUID[pCell(g, x + dx, G)]) return false;
  for (y = G - 9; y < G; y++) for (dx = -3; dx <= 3; dx++) if (!AIRY[pCell(g, x + dx, y)] || bMarked(g, x + dx, y)) return false;
  if (bSiteAround(g, x, G, null, 4) || iDoorNear(g, x, 5)) return false;
  for (var k = 0; k < g.lsnowmen.length; k++) if (Math.abs(g.lsnowmen[k].x - x) < 12) return false;
  return true;
}
function lGoSnowman(g, p, snow) {
  /* one somebody started and left (called in for supper, or to a fire): finish him */
  for (var q = 0; q < g.lsnowmen.length; q++) {
    var o = g.lsnowmen[q];
    if (o.up || lManCrew(g, o.id) || Math.abs(o.x - p.x) > 80 || !mReachable(g, p, o.x, o.G - 1)) continue;
    p.task = { kind: "snowman", man: o.id, t: 0, act: 0, hand: 0 };
    return true;
  }
  if (g.lsnowmen.length >= 3 || p.lSnowT > g.tick) return false;
  p.lSnowT = g.tick + 3000;
  /* (there must be enough snow about for one) */
  var n = 0, x, y, X;
  for (x = snow.x - 25; x <= snow.x + 25; x++) for (y = snow.y - 8; y <= snow.y + 8; y++) if (pCell(g, x, y) === MAT.SNOW && !bMarked(g, x, y)) n++;
  if (n < L_SNOWMAN.length * 1.5) return false;
  for (var d = 4; d < 30; d++) for (var sd = -1; sd <= 1; sd += 2) {
    X = snow.x + d * sd;
    var G = bGround(g, X, snow.y);
    if (G >= 0 && lSnowmanOk(g, X, G) && mReachable(g, p, X, G - 1)) {
      var s = { id: ++g.sid, x: X, G: G, n: 0, who: p.short, name: pick(L_SNOWNAMES), t0: g.tick, last: g.tick, dir: sd, up: false, by: p.id };
      g.lsnowmen.push(s);
      lMarkMen(g);
      p.task = { kind: "snowman", man: s.id, t: 0, act: 0, hand: 0 };
      pSay(g, p, "snowman", true);
      return true;
    }
  }
  return false;
}
function lManCrew(g, id) { for (var k = 0; k < g.peasants.length; k++) { var t = g.peasants[k].task; if (t && t.kind === "snowman" && t.man === id && !g.peasants[k].dead) return g.peasants[k]; } return null; }
function lMan(g, id) { for (var k = 0; k < g.lsnowmen.length; k++) if (g.lsnowmen[k].id === id) return g.lsnowmen[k]; return null; }
function lTaskSnowman(g, p, k) {
  var s = lMan(g, k.man), go;
  if (!s || ++k.t > 4000) { if (s && !s.up) lDropMan(g, s); return iDone(p, false); }
  /* (finished, whatever is in their hands: every cell of him there) */
  for (s.n = 0; s.n < L_SNOWMAN.length && pCell(g, s.x + L_SNOWMAN[s.n][1], s.G - 1 - L_SNOWMAN[s.n][0]) === MAT.PACKSNOW; s.n++);
  if (s.n >= L_SNOWMAN.length) return lManDone(g, s, p);
  if (k.hand < 1) {
    /* a ball of snow, rolled up off the ground: two cells of it */
    if (!k.sx || !lSnowy(g, k.sx, k.sy)) {
      var t = pFind(g, p, P_SNOW, 40, lSnowy, 10);
      if (!t) { lDropMan(g, s); if (p.sayT <= 0) pSay(g, p, "nosnow"); return iDone(p, false); }
      k.sx = t.x; k.sy = t.y;
    }
    go = lGo(g, p, k, "roll" + k.sx + "," + k.sy, k.sx, k.sy, 2, 10, 2);
    if (go <= 0) { if (go < 0) lDropMan(g, s); return false; }
    p.dir = k.sx + 0.5 < p.x ? -1 : 1;
    k.act++; p.pose = (k.act % 14) < 7 ? "chopA" : "chopB";
    if (k.act % 14 !== 7) return true;
    var j = k.sy * g.gw + k.sx;
    heatVanish(g, j); k.hand++;
    /* (rolling it along picks up what is next to it, too) */
    for (var q = 0; q < 2; q++) {
      var j2 = sandHas(g, k.sx, k.sy, MAT.SNOW);
      if (j2 < 0) j2 = sandHas(g, k.sx, k.sy + 1, MAT.SNOW);
      if (j2 >= 0 && !bMarked(g, j2 % g.gw, (j2 / g.gw) | 0) && AIRY[g.m[j2 - g.gw]] && !lUnderMan(g, j2 % g.gw, (j2 / g.gw) | 0)) { heatVanish(g, j2); k.hand++; }
    }
    if (k.hand < 3) return true;
    k.sx = 0; k.act = 0;
    return true;
  }
  /* to the snowman, and on it goes, a cell at a time from the bottom */
  /* (the lowest cell of him not there: a base that melted while they built is put back before the head goes on) */
  for (s.n = 0; s.n < L_SNOWMAN.length && pCell(g, s.x + L_SNOWMAN[s.n][1], s.G - 1 - L_SNOWMAN[s.n][0]) === MAT.PACKSNOW; s.n++);
  if (s.n >= L_SNOWMAN.length) return lManDone(g, s, p);
  var c = L_SNOWMAN[s.n], cx = s.x + c[1], cy = s.G - 1 - c[0];
  go = lGo(g, p, k, "man" + s.id, s.x, s.G - 1, 4, 3, 2);
  if (go <= 0) { if (go < 0) lDropMan(g, s); return false; }
  p.dir = s.x + 0.5 < p.x ? -1 : 1;
  k.act++; p.pose = (k.act % 12) < 6 ? "hammerA" : "hammerB";   /* (patting it down) */
  if (k.act % 12 !== 6) return true;
  var i = cy * g.gw + cx;
  if (LIQUID[g.m[i]]) return true;   /* (meltwater where his base was: it will run off) */
  if (!AIRY[g.m[i]] && g.m[i] !== MAT.PACKSNOW) { lDropMan(g, s); return iDone(p, false); }   /* (something got in the way) */
  if (g.m[i] !== MAT.PACKSNOW) {
    sandSet(g, i, MAT.PACKSNOW); g.aux[i] = 0; g.lat[i] = 0; g.T[i] = Math.min(g.T[i], -8); heatAccept(g, i);
    pChips(g, cx + 0.5, cy + 0.5, 2, [SAND_PAL[MAT.PACKSNOW][0], SAND_PAL[MAT.SNOW][90]]);
    k.hand--;
  }
  s.last = g.tick;
  if (p.sayT <= 0 && Math.random() < 0.08) pSay(g, p, "snowman");
  return true;
}
function lManDone(g, s, p) {
  s.up = true; s.eyes = (p.coal || 0) >= 1; if (s.eyes) p.coal--;   /* (coal for the eyes, if there is any. stones otherwise) */
  feed(g, p.name + " built a snowman. it is called " + iName(s.name), "#e8f4ff", "snowman" + s.id);
  achieve(g, "snowman");
  lSayD(g, p, "snowmanDone", s.name);
  p.bored = 0; p.calmT = 300; p.idle = 120;
  bGather(g, p, s.x, s.G - 1);   /* (and the neighbours come over to have a look) */
  return iDone(p, true);
}
/* say a line with {d} in it (a snowman's name), filled in */
function lSayD(g, p, kind, d) {
  pSay(g, p, kind, true);
  if (p.say) p.say = p.say.replace("{d}", iName(d));
}
/* a snowman abandoned half built: what is there of him stays, to melt in its own time */
function lDropMan(g, s) { var j = g.lsnowmen.indexOf(s); if (j >= 0) { g.lsnowmen.splice(j, 1); lUnmarkMan(g, s); } }
/* a snowman's cells (and the ground under him) are marked, the way a site's are: nobody plans a furnace through him, or
   shovels him away for a field. (build.js bRemove calls this again, after it marks the sites afresh) */
function lManCells(g, s, fn) {
  for (var dx = -2; dx <= 2; dx++) for (var y = s.G - 8; y <= s.G; y++) { var x = s.x + dx; if (x >= 0 && x < g.gw && y >= 0 && y < g.gh) fn(y * g.gw + x); }
}
function lMarkMen(g) {
  if (!g.lsnowmen || !g.lsnowmen.length) return;
  if (!g.bmark || g.bmark.length !== g.m.length) g.bmark = new Uint8Array(g.m.length);
  for (var k = 0; k < g.lsnowmen.length; k++) lManCells(g, g.lsnowmen[k], function (i) { g.bmark[i] = 1; });
}
function lUnmarkMan(g, s) {
  if (!g.bmark) return;
  lManCells(g, s, function (i) { g.bmark[i] = 0; });
  for (var k = 0; k < g.sites.length; k++) bMark(g, g.sites[k], 1);   /* (anybody else's that shared a cell) */
  lMarkMen(g);
}

/* a stretch of ice to skate on: ten or more cells of it, level, with open air over it */
function lGoSkate(g, p) {
  if (p.lSkateT > g.tick) return false;
  p.lSkateT = g.tick + 2400;
  var fx = Math.floor(p.x), best = null, x, G, a, b, Y;
  for (var d = 0; d < 90 && !best; d += 3) for (var sd = -1; sd <= 1 && !best; sd += 2) {
    x = fx + d * sd;
    if (x < 3 || x > g.gw - 4) continue;
    G = mGround(g, x);
    if (!lIcy(g, x, G)) continue;
    /* (following the lie of it: a step up or down is still the same rink) */
    for (a = x, Y = G; a > 2 && Math.abs(mGround(g, a - 1) - Y) <= 1 && lIcy(g, a - 1, mGround(g, a - 1)); a--, Y = mGround(g, a));
    for (b = x, Y = G; b < g.gw - 3 && Math.abs(mGround(g, b + 1) - Y) <= 1 && lIcy(g, b + 1, mGround(g, b + 1)); b++, Y = mGround(g, b));
    if (b - a >= 10 && mReachable(g, p, x, G - 1)) best = { a: a, b: b, y: G - 1 };
  }
  if (!best) return false;
  p.task = { kind: "skate", a: best.a, b: best.b, y: best.y, t: 0, act: 0, on: 0, laps: 0 };
  return true;
}
function lIcy(g, x, G) { return G >= 10 && pCell(g, x, G) === MAT.ICE && pRoom(g, x, G - 1) && !bMarked(g, x, G); }
function lTaskSkate(g, p, k) {
  if (++k.t > 2400 || k.laps > 6) { p.bored = 0; return iDone(p, k.on > 0); }
  var fx = Math.floor(p.x), mid = (k.a + k.b) >> 1;
  if (!k.on) {
    var go = lGo(g, p, k, "skate" + k.a, mid, k.y, (k.b - k.a) >> 1, 4, 4);
    if (go <= 0) return false;
    if (!pOnIce(g, fx, Math.floor(p.y))) return iDone(p, false);
    k.on = 1; k.go = p.x < mid ? 1 : -1;
    if (!g.got.skate) feed(g, p.name + " has gone skating. on purpose", "#cfeaff", "skate");
    achieve(g, "skate");
  }
  if (!pOnIce(g, fx, Math.floor(p.y)) && p.slip <= 0) { if (++k.off > 200) { p.bored = 0; return iDone(p, true); } } else k.off = 0;
  /* to the far end, and turn (which, at speed, is where it goes wrong) */
  if ((k.go > 0 && p.x > k.b - 1.5) || (k.go < 0 && p.x < k.a + 2.5)) { k.go = -k.go; k.laps++; if (p.sayT <= 0 && Math.random() < 0.5) pSay(g, p, "skate"); }
  p.dir = k.go; p.idle = 0;
  return false;   /* (and the ice does the rest: peasants.js, pIceStep) */
}

/* -------------------------------------------------------------------
   SALT: on the ice, and on the fish
   ------------------------------------------------------------------- */
/* somebody slipped (peasants.js): somewhere to salt, and, with salt in their pocket, an idea */
function lSlipped(g, p) {
  g.lslip.push({ x: Math.floor(p.x), y: Math.floor(p.y) + 1, t: g.tick });
  if (g.lslip.length > 12) g.lslip.shift();
  if ((p.salt || 0) >= 1 || (g.found.salt || 0) >= 3) iSpark(g, p, "salt");
}
/* ice worth salting: where somebody went over lately, and by every door. the nearest still there */
function lGoGrit(g, p) {
  if (p.lGritT > g.tick) return false;
  p.lGritT = g.tick + 1200;
  var C = [], k, s, x, best = null, bd = 160, d, y;
  for (k = 0; k < g.lslip.length; k++) if (g.tick - g.lslip[k].t < 20000) C.push([g.lslip[k].x, g.lslip[k].y]);
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if (!s.done || (s.kind !== "house" && s.kind !== "tower" && s.kind !== "farm" && s.kind !== "furnace")) continue;
    for (x = s.x0 - 10; x <= s.x1 + 10; x += 2) { y = x >= 0 && x < g.gw ? mGround(g, x) : -1; if (y > 0 && pCell(g, x, y) === MAT.ICE) C.push([x, y]); }
  }
  for (k = 0; k < C.length; k++) {
    x = C[k][0]; y = C[k][1];
    if (pCell(g, x, y) !== MAT.ICE || !AIRY[pCell(g, x, y - 1)] || pAvoid(g, p, x)) continue;
    d = Math.abs(x - p.x) + Math.abs(y - p.y);
    if (d < bd) { bd = d; best = { x: x, y: y }; }
  }
  if (!best) return false;
  p.task = { kind: "grit", x: best.x, y: best.y, t: 0, act: 0, n: 0 };
  return true;
}
function lTaskGrit(g, p, k) {
  if (++k.t > 1800 || (p.salt || 0) < 1) return iDone(p, k.n > 0);
  var go = lGo(g, p, k, "grit" + k.x, k.x, k.y - 1, 6, 6, 4);
  if (go <= 0) return false;
  p.dir = k.x + 0.5 < p.x ? -1 : 1;
  k.act++; p.pose = (k.act % 20) < 10 ? "hammerA" : "chopB";
  if (k.act % 20 !== 10) return true;
  /* a handful, flung out over the ice: it lands where it lands, and melts what it lands on (world.js) */
  for (var q = 0; q < 3; q++) {
    var tx = k.x - 4 + irnd(9), dx = tx + 0.5 - p.x;
    partAdd(g, PK_DEBRIS, p.x + p.dir, p.y - 6, dx / 18 + (Math.random() - 0.5) * 0.1, -0.9 - Math.random() * 0.3, 240, SAND_PAL[MAT.SALT][irnd(256)], MAT.SALT);
  }
  p.salt--; k.n++;
  if (k.n === 1) {
    if (p.sayT <= 0 || Math.random() < 0.5) pSay(g, p, "grit");
    feed(g, p.name + " is salting the ice", "#e8eef4", "grit");
    achieve(g, "grit");
  }
  if (k.n >= 3) { p.bored = Math.max(0, p.bored - 300); return iDone(p, true); }
  return true;
}
/* a fish, caught on a full stomach, with salt about them: salted, and kept for later. true if it was (ideas.js) */
function lSaltFish(g, p) {
  if (!g.know.salt || (p.salt || 0) < 1 || p.hunger > P_HUNGRY * 0.6 || (p.fish || 0) >= L_POCKET.fish) return false;
  p.salt--; p.fish = (p.fish || 0) + 1;
  pSay(g, p, "salted", true);
  if (!g.saltedT) { g.saltedT = g.tick; feed(g, p.name + " salted a fish, for later", "#e8eef4", "salted"); }
  return true;
}
/* a pinch of salt on a meal (peasants.js, at every bite of the eat task): it goes further. now and then, with salt in the
   pocket and a village that knows what salt is for */
function lSeason(g, p) {
  if (!g.know.salt || (p.salt || 0) < 1 || Math.random() > 0.3) return 0;
  if (g.know.powder && (p.salt || 0) < 3 && (p.coal || 0) >= 1 && (p.powder || 0) < 2) return 0;   /* (that is for the bowl) */
  p.salt--;
  if (p.sayT <= 0 && Math.random() < 0.3) pSay(g, p, "season");
  return 300;
}
/* hungry, and a salt fish in the pocket: that, now, rather than a long walk (peasants.js) */
function lSnack(g, p) {
  if ((p.fish || 0) < 1 || p.hunger <= P_HUNGRY) return false;
  p.fish--; p.hunger = Math.max(0, p.hunger - 1400); p.bored = Math.max(0, p.bored - 200);
  p.idle = 60; p.pose = "eatB";
  pChips(g, p.x + p.dir, p.y - 5, 3, [hex32("#c8d4e0"), hex32("#f2f2ee")]);
  pSay(g, p, "saltfish", true);
  achieve(g, "saltfish");
  return true;
}

/* -------------------------------------------------------------------
   POTASH: ash, raked into a field
   ------------------------------------------------------------------- */
function lGoPotash(g, p) {
  var best = null, bd = 220, k, s, d;
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if (s.kind !== "farm" || !s.done || (s.potash || 0) > g.tick + L_POTASH * 0.3 || iCrew(g, "potash", s.id) || pAvoid(g, p, s.cx)) continue;
    d = Math.abs(s.cx - p.x) + Math.abs(s.cy - p.y);
    if (d < bd) { bd = d; best = s; }
  }
  if (!best) return false;
  p.task = { kind: "potash", site: best.id, t: 0, act: 0, x: best.x0 - 1 };
  return true;
}
function lTaskPotash(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || ++k.t > 2000 || (p.ash || 0) < L_POTASH_ASH) return iDone(p, false);
  /* along the field, end to end, scattering as they go */
  var fy = s.G - 1, go;
  if (!k.on) {
    go = lGo(g, p, k, "potash" + s.id, Math.round(s.cx - 0.5), fy, 6, 6, 4);
    if (go <= 0) return false;
    k.on = 1; k.go = p.x < s.cx ? 1 : -1;
    if (p.sayT <= 0 || Math.random() < 0.5) pSay(g, p, "potash");
  }
  k.act++;
  p.dir = k.go; p.idle = 0; p.pose = (k.act % 16) < 8 ? "chopA" : "chopB";
  if (k.act % 4 === 0) sparks(g, p.x + p.dir * 2, p.y - 2, 2, 0.25, [SAND_PAL[MAT.ASH][0], SAND_PAL[MAT.ASH][100]], 14, 0.05, PK_GLINT);
  var end = (k.go > 0 && p.x > s.x1 + 0.5) || (k.go < 0 && p.x < s.x0 + 0.5) || k.act > 260;
  if (!end) return false;   /* (walking along it, raking) */
  p.ash -= L_POTASH_ASH;
  s.potash = g.tick + L_POTASH;
  feed(g, p.name + " raked ash into " + bLabel(s) + ". it will come up fast", "#c8d0bc", "potash" + s.id);
  achieve(g, "potash");
  p.bored = Math.max(0, p.bored - 400);
  return iDone(p, true);
}

/* -------------------------------------------------------------------
   BLACK POWDER: coal, salt and ash, ground fine
   ------------------------------------------------------------------- */
function lPowderPick(g, p) {
  /* the makings in their pockets, and nowhere near a fire: grind some */
  if ((p.powder || 0) < L_POCKET.powder - 1 && (p.coal || 0) >= 1 && (p.salt || 0) >= 1 && (p.ash || 0) >= 2 && Math.random() < 0.4 && !p.fire) {
    p.task = { kind: "grind", t: 0, act: 0, away: 0 };
    return true;
  }
  if ((p.powder || 0) < 1) return false;
  /* a gallery being pushed on, with rock ahead: a charge in the face of it */
  if (Math.random() < 0.5 && lGoBlast(g, p)) return true;
  /* a pond with fish in it, and a mind to eat */
  if (g.know.fish && (p.hunger > P_HUNGRY * 0.7 || p.bored > 900) && Math.random() < 0.15 && lGoBombFish(g, p)) return true;
  return false;
}
/* which side of (x, y) the nearest hot thing (a flame, an ember, a torch, lava) is on, within r: -1, 1, or 0 for none */
function lHotSide(g, x, y, r) {
  for (var d = 0; d <= r; d++) for (var dy = -r; dy <= r; dy++) {
    if (HOT[pCell(g, x + d, y + dy)]) return 1;
    if (HOT[pCell(g, x - d, y + dy)]) return -1;
  }
  return 0;
}
function lTaskGrind(g, p, k) {
  if (++k.t > 600 || p.fire || (p.coal || 0) < 1 || (p.salt || 0) < 1 || (p.ash || 0) < 2) return iDone(p, false);
  /* not anywhere near a fire: off a way first, if there is one about (and if one gets lit by them, off again) */
  if ((k.t % 10 === 0 || k.away) && lHotSide(g, Math.floor(p.x), Math.floor(p.y) - 4, 12)) {
    if (!k.away) { k.away = 1; k.act = 0; p.dir = lHotSide(g, Math.floor(p.x), Math.floor(p.y) - 4, 12) > 0 ? -1 : 1; }
    if (++k.away > 400) return iDone(p, false);
    p.idle = 0;
    return false;
  }
  k.away = 0;
  p.idle = 0; k.act++;
  p.pose = (k.act % 18) < 9 ? "eatB" : "stand";   /* (the pestle, round and round) */
  if (k.act % 18 === 0) pChips(g, p.x + p.dir * 2, p.y - 3, 1, [SAND_PAL[MAT.GUNPOWDER][0], SAND_PAL[MAT.GUNPOWDER][100]]);
  if (k.act === 30 && (p.sayT <= 0 || Math.random() < 0.4)) pSay(g, p, "grind");
  if (k.act < L_GRIND) return true;
  p.coal--; p.salt--; p.ash -= 2; p.powder = (p.powder || 0) + 1;
  g.found.powder = (g.found.powder || 0) + 1;
  if (!g.got.powder) { feed(g, p.name + " ground the first black powder. nobody breathe", "#d8c8b0", "powder"); achieve(g, "powder"); }
  return iDone(p, true);
}
/* the first rock still to come out of a gallery that is going on (its lowest phase), and the gallery: {s, ph, x} */
function lFace(g, s) {
  var ph = 1e9, x = -1, k, e;
  for (k = 0; k < s.plan.length; k++) { e = s.plan[k]; if (e.mine && ROCK[g.m[e.i]] && e.ph < ph) { ph = e.ph; x = e.i % g.gw; } }
  /* (right by the shaft there is nowhere to stand back to: that much is for the pick) */
  if (x < 0 || Math.abs(x - s.col) < L_BACK) return null;
  var n = 0;
  for (k = 0; k < s.plan.length; k++) { e = s.plan[k]; if (e.mine && ROCK[g.m[e.i]] && e.ph < ph + L_BLAST) n++; }
  return n >= 8 ? { ph: ph, x: x } : null;   /* (not worth a charge for a few cells) */
}
function lGoBlast(g, p) {
  if (p.lBlastT > g.tick) return false;
  var best = null, bd = 140, k, s, f, d;
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if (s.kind !== "tunnel" || s.done || mRetired(g, s) || mFlooded(g, s) || iCrew(g, "blast", s.id) || lChargeOn(g, s.id)) continue;
    if (!(f = lFace(g, s))) continue;
    d = Math.abs(f.x - p.x) + Math.abs(s.B - p.y);
    if (d < bd) { bd = d; best = { s: s, f: f }; }
  }
  if (!best) return false;
  p.task = { kind: "blast", site: best.s.id, ph: best.f.ph, x: best.f.x, y: best.s.B, t: 0, act: 0, set: false };
  return true;
}
/* where to stand back to from charge c, and how far off from it is far enough: the column it gives, or the shaft (a charge
   is never set nearer the shaft than L_BACK, so there is always somewhere) */
function lSafe(g, c) {
  var s = bSite(g, c.site), dir = s ? s.dir : 1, col = s ? s.col : c.x - dir * L_CLEAR;
  var run = c.run != null ? c.run : clamp(c.x - dir * L_CLEAR, Math.min(col, c.x), Math.max(col, c.x));
  return { run: run, far: Math.max(L_STUN + 2, Math.min(L_CLEAR - 2, Math.abs(run - c.x) - 0.5)) };
}
function lInBlast(g, c) {
  for (var q = 0; q < g.peasants.length; q++) { var o = g.peasants[q]; if (!o.dead && Math.abs(o.x - c.x) + Math.abs(o.y - 4 - c.y) * 0.5 < L_STUN + 0.5) return true; }
  return false;
}
function lClearZone(g, c) {
  var sf = lSafe(g, c);
  for (var q = 0; q < g.peasants.length; q++) {
    var o = g.peasants[q];
    if (o.dead || o.state !== "walk" || o.climb || (o.task && (o.task.kind === "standback" || (o.task.kind === "blast" && o.task.set && o.id === c.who)))) continue;
    if (Math.abs(o.x - c.x) >= sf.far || Math.abs(o.y - c.y - 3) > 10) continue;
    if (o.sleep > 0) bWake(g, o);   /* (shaken awake: there is a lit fuse) */
    o.task = { kind: "standback", site: c.site, run: sf.run, y: c.y + 3, t: 0 }; o.idle = 0;
    if (o.sayT <= 0) pSay(g, o, "charge", true);
  }
}
/* a fuse lit in the gallery they are in: back down it, well clear, and wait for the bang. (they go on standing well back
   from any face with a lit fuse in it, wherever they were sent from) */
function lTaskStandback(g, p, k) {
  var c = lChargeOn(g, k.site);
  if (!c || ++k.t > L_FUSE + 400) return iDone(p, true);
  var sf = lSafe(g, c);
  if (Math.abs(p.x - c.x) >= sf.far) { p.dir = c.x < p.x ? -1 : 1; p.pose = "stand"; return true; }
  p.idle = 0;
  if (iWalk(g, p, k, "standback" + k.run, k.run, k.y, pathNear(k.run, k.y, 0, 6, 4))) { p.dir = p.x < c.x ? -1 : 1; k.best = null; }
  return false;
}
function lChargeOn(g, id) { for (var k = 0; k < g.lcharges.length; k++) if (g.lcharges[k].site === id) return g.lcharges[k]; return null; }
function lTaskBlast(g, p, k) {
  var s = bSite(g, k.site), go;
  if (!k.set) {
    /* (the face dug out from under them by the time they got there, and the like: not this one, then, for a while) */
    if (!s || s.done || ++k.t > 3000 || (p.powder || 0) < 1 || mFlooded(g, s)) { p.lBlastT = g.tick + 3000; return iDone(p, false); }
    var f = lFace(g, s);
    if (!f) { p.lBlastT = g.tick + 3000; return iDone(p, false); }
    k.ph = f.ph; k.x = f.x;
    go = lGo(g, p, k, "blast" + s.id + ":" + k.x, k.x, k.y, 3, 4, 2);
    if (go < 0) p.lBlastT = g.tick + 3000;
    if (go <= 0) return false;
    p.dir = s.dir; k.act++;
    p.pose = (k.act % 10) < 5 ? "hammerA" : "hammerB";   /* (tamping it in) */
    if (k.act < 50) return true;
    p.powder--;
    var cy = k.y - 3, cx = k.x - s.dir;
    k.run = clamp(k.x - s.dir * L_CLEAR, Math.min(s.col, cx), Math.max(s.col, cx));
    k.cid = ++g.sid;
    g.lcharges.push({ id: k.cid, x: k.x, y: cy, site: s.id, ph: k.ph, who: p.id, fuse: L_FUSE, run: k.run, dir: s.dir });
    k.set = true; k.act = 0;
    pSay(g, p, "charge", true);
    feed(g, p.name + " has set a charge in " + bLabel(s) + ". FIRE IN THE HOLE", "#ffb070", "charge" + s.id);
    /* and everybody else down there is told, at the tops of their voices */
    /* (anybody working this gallery, wherever they are, and anybody else down there: back to where the one who lit it
       is going, and wait there for the bang) */
    for (var q = 0; q < g.peasants.length; q++) {
      var o = g.peasants[q];
      if (o === p || o.dead || o.state !== "walk") continue;
      var mine = o.task && o.task.kind === "build" && o.task.site === s.id;
      if (!mine && (Math.abs(o.x - k.x) > L_CLEAR + 6 || Math.abs(o.y - k.y) > 10)) continue;
      if (o.sleep > 0) bWake(g, o);
      o.task = { kind: "standback", site: s.id, run: k.run, y: k.y, t: 0 }; o.idle = 0;
      if (o.sayT <= 0 && Math.random() < 0.5) pSay(g, o, "charge", true);
    }
    return true;
  }
  /* back down the gallery, well clear of it, and wait for it */
  if (!lChargeOn(g, k.site)) {
    var out = !!(g.lfizzle && g.lfizzle[k.cid]);
    if (out) delete g.lfizzle[k.cid];
    p.bored = 0; if (p.sayT <= 0) pSay(g, p, out ? "fizzle" : "blasted", true);
    return iDone(p, !out);
  }
  if (++k.t > 4000) return iDone(p, true);
  var ch = lChargeOn(g, k.site), sf = lSafe(g, ch);   /* (the same rule as everybody else's: lSafe) */
  if (Math.abs(p.x - ch.x) < sf.far) { p.idle = 0; p.dir = k.run + 0.5 < p.x ? -1 : 1; if (iWalk(g, p, k, "clear" + k.run, k.run, k.y, pathNear(k.run, k.y, 0, 4, 2))) k.best = null; return false; }
  p.dir = s ? s.dir : p.dir; p.pose = "stand";   /* (looking at it, fingers in ears) */
  return true;
}
/* a charge's fuse burns down. then: BOOM, and the next few columns of rock come out at once */
function lChargesStep(g) {
  for (var k = g.lcharges.length - 1; k >= 0; k--) {
    var c = g.lcharges[k], j = c.y * g.gw + c.x;
    /* (anybody who has come down into the gallery since it was lit, off a ladder or out of the lift: back, and wait) */
    if (c.fuse % 5 === 0) lClearZone(g, c);
    if (c.fuse % 3 === 0) partAdd(g, PK_GLINT, c.x + 0.5, c.y - 0.5, (Math.random() - 0.5) * 0.4, -0.3, 6 + irnd(6), pick(SPARK_HOT));
    var fj = c.y * g.gw + c.x - (c.dir || 0);   /* (the fuse hangs out of the hole, in the gallery) */
    if (WET[g.m[j]] || WET[g.m[fj]] || WET[g.m[fj + g.gw]]) {   /* (the fuse, out: a wet gallery) */
      g.lcharges.splice(k, 1);
      (g.lfizzle = g.lfizzle || {})[c.id] = 1;
      feed(g, "the fuse got wet. no bang", "#c8d0dc", "charge" + c.site);
      continue;
    }
    /* (somebody still too close, a breath before it goes: it sputters, and burns a little longer. twice, at most) */
    if (c.fuse === 30 && (c.held || 0) < 2 && lInBlast(g, c)) { c.fuse += 90; c.held = (c.held || 0) + 1; sparks(g, c.x + 0.5, c.y - 0.5, 4, 0.3, SPARK_HOT, 8, 0.2, PK_GLINT); }
    if (--c.fuse > 0) continue;
    g.lcharges.splice(k, 1);
    /* (and somebody still right on top of it at the last: whoever lit it pinches the fuse out. there will be another) */
    if (lInBlast(g, c)) { (g.lfizzle = g.lfizzle || {})[c.id] = 1; feed(g, "somebody was still too close. the fuse was pinched out", "#c8d0dc", "charge" + c.site); continue; }
    lBlast(g, c);
  }
}
function lBlast(g, c) {
  var s = bSite(g, c.site), who = lAlive(g, c.who), n = 0, k, e, gw = g.gw, x, y, j, d;
  g.fx.boom++; g.shake = Math.min(8, g.shake + 4); g.flash = Math.max(g.flash, 0.12);
  if (g.rings.length < 8) g.rings.push({ x: c.x, y: c.y, r: 0, R: 16, t: 0 });
  (g.booms || (g.booms = [])).push({ x: c.x, y: c.y, R: 6, t: g.tick });
  sparks(g, c.x + 0.5, c.y + 0.5, 30, 1.4, SPARK_HOT, 14, 0.4, PK_GLINT);
  if (s && !s.done) {
    /* whoever set it gets what comes out (it is theirs: they gather it up when the dust has settled. pockets.js has no
       idea how far a peasant can reach, and this is not the place to start) */
    var taker = who || pOther(g, { x: c.x, y: c.y }, 400);
    for (k = 0; k < s.plan.length; k++) {
      e = s.plan[k];
      if (!e.mine || !ROCK[g.m[e.i]] || e.ph < c.ph || e.ph >= c.ph + L_BLAST) continue;
      /* (the rock goes, and its heat with it, half-molten or not: the air left is as warm as the rock was, no warmer) */
      var rt = g.T[e.i];
      if (taker) mMine(g, s, e, taker);
      heatVanish(g, e.i); g.T[e.i] = clamp(rt, T_MIN, 1200); heatAccept(g, e.i);
      n++;
      /* dust and smoke where the rock was */
      if (Math.random() < 0.35) { sandSet(g, e.i, MAT.SMOKE); heatAccept(g, e.i); }
    }
    s.last = g.tick;
  }
  /* the bang is hot: the face round it warms right through, and a seam of coal in the walls may catch */
  for (y = c.y - 6; y <= c.y + 6; y++) for (x = c.x - 6; x <= c.x + 6; x++) {
    if (x < 0 || y < 0 || x >= gw || y >= g.gh) continue;
    d = Math.abs(x - c.x) + Math.abs(y - c.y); j = y * gw + x;
    if (d > 6 || g.m[j] === MAT.INERT) continue;
    heatAdd(g, j, 140 * (1 - d / 7));
    if (g.m[j] === MAT.COAL && d <= 4 && Math.random() < 0.12) { g.m[j] = MAT.EMBER; g.aux[j] = 1; }
  }
  /* (stones flying about, and a ringing in the ears) */
  for (k = 0; k < 8; k++) partAdd(g, PK_GLINT, c.x + 0.5, c.y, (Math.random() - 0.5) * 2, -Math.random() * 1.2, 20 + irnd(20), SAND_PAL[MAT.STONE][irnd(256)]);
  for (k = 0; k < g.peasants.length; k++) {
    var q = g.peasants[k];
    if (q.dead || q.state !== "walk") continue;
    d = Math.abs(q.x - c.x) + Math.abs(q.y - 4 - c.y) * 0.5;
    if (d < 3) { q.stun = 120; q.task = null; q.taskCD = 160; pSay(g, q, "blasted", true); }   /* (right on top of it: flat out for a good while) */
    else if (d < L_STUN) { q.stun = 80; q.task = null; q.taskCD = 120; pSay(g, q, "blasted", true); }   /* (flat on their back, eyebrows gone) */
    else if (d < 30 && (q.sayT <= 0 || Math.random() < 0.3)) { if (Math.random() < 0.5) pSay(g, q, "blasted"); }
  }
  if (s) feed(g, "BOOM. " + iCap(bLabel(s)) + " is " + n + " cells of rock further on", "#ffb070", "charge" + c.site);
  if (n) achieve(g, "blast");
}
/* a pond, and a charge to throw in it: somewhere on the bank a good throw from water that is deep enough */
function lGoBombFish(g, p) {
  if (p.lBombT > g.tick) return false;
  p.lBombT = g.tick + 6000;
  var fx = Math.floor(p.x), fy = Math.floor(p.y), x, y, best = null;
  for (var d = 6; d < 200 && !best; d += 2) for (var sd = -1; sd <= 1 && !best; sd += 2) {
    x = fx + d * sd;
    if (g.lNoThrow && g.lNoThrow[x] > g.tick) continue;   /* (nobody could get a clear throw at it lately) */
    for (y = fy - 30; y <= fy + 30 && !best; y++) if (pCell(g, x, y) === MAT.WATER && AIRY[pCell(g, x, y - 1)] && iDeep(g, x, y, true) &&
        pCell(g, x, y + 3) === MAT.WATER) best = { x: x, y: y };
  }
  if (!best || !mReachable(g, p, best.x + (best.x < fx ? 10 : -10), best.y - 1) && !mReachable(g, p, best.x + (best.x < fx ? 6 : -6), best.y - 1)) return false;
  p.task = { kind: "bombfish", x: best.x, y: best.y, t: 0, act: 0 };
  return true;
}
function lTaskBombFish(g, p, k) {
  if (++k.t > 2400 || (p.powder || 0) < 1 || pCell(g, k.x, k.y) !== MAT.WATER) return iDone(p, false);
  var dx = k.x + 0.5 - p.x, lo = 6 + 3 * ((k.shift || 0) % 4), hi = lo + 5;   /* (each look that found no clear throw: try from further back) */
  if (k.side == null) k.side = p.x < k.x ? -1 : 1;
  if ((p.x - k.x - 0.5) * ((k.shift || 0) >= 4 ? -k.side : k.side) < 0 || Math.abs(dx) > hi || Math.abs(dx) < lo || Math.abs(k.y - p.y) > 10 || p.wade) {
    /* to the bank, a good throw off: lo to hi from the spot, and dry */
    /* (the near bank first; four looks from there with no clear throw, and it is round to the far one) */
    var sd = (k.shift || 0) >= 4 ? -k.side : k.side;
    if (iWalk(g, p, k, "bank" + k.x + ":" + lo + ":" + sd, k.x + sd * (lo + 2), k.y, function (X, Y) { var dd = (X - k.x) * sd; return dd >= lo && dd <= hi && Math.abs(Y - k.y) <= 8; })) { lNoThrow(g, p, k); return false; }
    p.idle = 0;
    return false;
  }
  p.dir = dx < 0 ? -1 : 1; k.act++;
  p.pose = k.act < 40 ? "chopB" : "hammerA";   /* (the fuse, lit; and the arm back) */
  if (k.act % 5 === 0 && k.act < 40) pChips(g, p.x + p.dir * 2, p.y - 4, 1, SPARK_HOT);
  if (k.act === 10 && (p.sayT <= 0 || Math.random() < 0.5)) pSay(g, p, "bombfish");
  if (k.act < 48) return true;
  /* a careful look first: an arc that comes down in the water, at the spot or a little either side of it. none clear
     from here (a roof in the way, the lip of the bank): a few steps along, and look again */
  var aim = null;
  for (var o = 0; o <= 8 && !aim; o++) for (var sg = -1; sg <= 1 && !aim; sg += 2) {
    var tx = k.x + o * sg, a;
    if (pCell(g, tx, k.y) !== MAT.WATER) continue;
    a = lAim(p, tx + 0.5, k.y + 2, 0);
    if (lArcWet(g, a)) aim = a;
  }
  if (!aim) {
    k.act = 0; k.shift = (k.shift || 0) + 1;
    if (k.shift > 7) { lNoThrow(g, p, k); return false; }
    if (p.sayT <= 0 && Math.random() < 0.5) pSay(g, p, "noclear");
    return false;   /* (further back along the bank, and look again) */
  }
  p.powder--;
  g.lballs.push({ x: aim.x, y: aim.y, vx: aim.vx, vy: aim.vy, from: p.id, kind: "bomb", t: 0, fuse: 80 });
  /* (anybody in the water, or on the bank close by, gets out of it) */
  p.bored = 0; p.calmT = 200;
  return iDone(p, true);
}
/* no clear throw at the pond from either bank: the charge is kept, that stretch of water is let be a long while by the
   whole village, and they say why */
function lNoThrow(g, p, k) {
  if (!g.lNoThrow) g.lNoThrow = {};
  for (var x = k.x - 10; x <= k.x + 10; x++) g.lNoThrow[x] = g.tick + 20000;
  pSay(g, p, "noclear", true);
  feed(g, p.name + " could not get a clear throw at the pond from either bank. the charge goes back in a pocket", "#c8d0dc", "bombfish");
  p.lBombT = g.tick + 6000;
  iDone(p, false);
}
/* a charge, under water: a great heave of it, some steam, and the fish come up. everybody on the bank eats */
function lUnderwater(g, b) {
  var gw = g.gw, cx = Math.floor(b.x), cy = Math.floor(b.y), k, x, y, j, n = 0, who = lAlive(g, b.from);
  g.fx.boom++; g.fx.splash++; g.shake = Math.min(6, g.shake + 2);
  if (g.rings.length < 8) g.rings.push({ x: cx, y: cy, r: 0, R: 12, t: 0 });
  for (y = cy - 4; y <= cy + 3; y++) for (x = cx - 4; x <= cx + 4; x++) {
    if (x < 0 || y < 0 || x >= gw || y >= g.gh) continue;
    j = y * gw + x;
    if (!WET[g.m[j]]) continue;
    /* (the top of it goes up in a fountain; a little of it boils) */
    if (!WET[g.m[j - gw]] && Math.random() < 0.6) { sandFling(g, j, (x - cx) * 0.12 + (Math.random() - 0.5) * 0.3, -1.6 - Math.random() * 1.2); continue; }
    if (Math.random() < 0.05) heatForce(g, j, MAT.STEAM);
  }
  var fish = 2 + irnd(5);
  for (k = 0; k < fish; k++) partAdd(g, PK_GLINT, cx + 0.5, cy - 1, (Math.random() - 0.5) * 1.4, -1.4 - Math.random(), 30 + irnd(20), pick([hex32("#c8d4e0"), hex32("#8aa0b8"), hex32("#f0a040")]));
  /* the ducks are off */
  for (k = 0; k < g.ducks.length; k++) {
    var d = g.ducks[k];
    if (d.dead || Math.abs(d.x - cx) > 40 || Math.abs(d.y - cy) > 30) continue;
    dTakeOff(g, d, true); if (Math.random() < 0.5) dSay(g, d, "quack", true);
  }
  /* and lunch is up: for whoever threw it, and anybody close enough to the bank to wade in for one */
  var ate = [];
  for (k = 0; k < g.peasants.length && ate.length < fish; k++) {
    var q = g.peasants[k];
    if (q.dead || q.state !== "walk" || Math.abs(q.x - cx) > 30 || Math.abs(q.y - cy) > 16) continue;
    q.hunger = Math.max(0, q.hunger - 1200); q.bored = 0; ate.push(q.short);
    if (q.sayT <= 0 || Math.random() < 0.5) pSay(g, q, "fishrain", true);
  }
  if (who && ate.indexOf(who.short) < 0 && ate.length < fish) { who.hunger = Math.max(0, who.hunger - 1200); ate.push(who.short); }
  feed(g, (who ? who.name : "somebody") + " threw a charge in the pond. " + fish + " fish" + (ate.length > 1 ? ", and lunch for " + ate.length : ""), "#9ad0ff", "bombfish");
  achieve(g, "bombfish");
}
/* a charge that missed the water: mostly the fuse goes out in the sand. not always */
function lDud(g, b) {
  var cx = Math.floor(b.x - b.vx), cy = Math.floor(b.y - b.vy), who = lAlive(g, b.from);
  if (Math.random() < 0.6 || cx < 0 || cy < 0 || cx >= g.gw || cy >= g.gh) {
    sparks(g, b.x, b.y, 4, 0.3, SPARK_HOT, 8, 0.2, PK_GLINT);
    feed(g, (who ? who.name + "'s" : "the") + " charge missed the pond. the fuse went out in the sand", "#c8d0dc", "bombfish");
    return;
  }
  var j = cy * g.gw + cx;
  if (!AIRY[g.m[j]]) return;
  feed(g, (who ? who.name + "'s" : "the") + " charge missed the pond, and went off on the bank", "#ffb070", "bombfish");
  if (who && who.sayT <= 0) pSay(g, who, "oops", true);
  sandBoom(g, j, 3, 0.9);
}

/* -------------------------------------------------------------------
   GLASS: sand and coal at the furnace, and a glasshouse for the wheat
   ------------------------------------------------------------------- */
function lGlassPick(g, p) {
  var f = mSites(g, "furnace", true)[0], s;
  /* a glasshouse going up and short of glass, or none yet and not glass enough about for one: make some */
  var want = lGlassShort(g, f), k;
  /* (glass for a glasshouse to come: only if there is a field one could go over, now and then looked at again) */
  if (!want && g.tick > (g.glassNo || 0)) {
    var cc = lPlanGlasshouse(g, p, true);
    var pile0 = ((f && f.stock) || {}).glass || 0;
    if (cc) want = cc.glass > 0 ? Math.max(0, cc.glass - lToHand(g, "glass") - pile0) : 0; else g.glassNo = g.tick + 6000;
  }
  if (f && want > 0.5 && (p.glass || 0) <= L_POCKET.glass - 2 && mCrew(g, "glassblow", f.id) < 1 && Math.abs(f.cx - p.x) < 220 &&
      ((p.coal || 0) >= 1 || ((f.stock && f.stock.coal) || 0) >= 1) && Math.random() < 0.5) {
    p.task = { kind: "glassblow", site: f.id, t: 0, act: 0, n: 0 };
    return true;
  }
  /* glass in hand, iron enough about for the posts, and a field with no roof over it: a glasshouse */
  var c = !p.planCD && bOpenCount(g) < B_OPEN && Math.random() < 0.4 ? lPlanGlasshouse(g, p, true) : null;
  var pile = (mSites(g, "furnace", true)[0] || {}).stock || {};
  if (c && lToHand(g, "glass") + (pile.glass || 0) >= c.glass * 0.7 && mIronToHand(g) + (pile.iron || 0) >= c.iron - 1e-3) {
    if (lPlanGlasshouse(g, p)) return true;
    p.planCD = 1800;
  }
  return false;
}
/* panes still wanted for glasshouses going up (or being mended), less what is in pockets and on the furnace's pile */
function lGlassShort(g, f) {
  var want = 0;
  for (var k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "glasshouse" && !g.sites[k].done) want += Math.max(0, bNeed(g, g.sites[k], "glass"));
  return want > 0 ? Math.max(0, want - lToHand(g, "glass") - (((f && f.stock) || {}).glass || 0)) : 0;
}
/* is more glass wanted: for a glasshouse going up, or for a field one could go over, less what is about already */
function lGlassWanted(g, p, f) {
  if (lGlassShort(g, f) > 0) return true;
  var cc = lPlanGlasshouse(g, p, true);
  return !!cc && cc.glass > lToHand(g, "glass") + (((f && f.stock) || {}).glass || 0);
}
function lSandy(g, x, y) { return pCell(g, x, y) === MAT.SAND && !bMarked(g, x, y) && AIRY[pCell(g, x, y - 1)] && !bSiteAround(g, x, y, null, 3); }
var P_SANDY = new Uint8Array(NMAT); P_SANDY[MAT.SAND] = 1;
function lTaskGlass(g, p, k) {
  var s = bSite(g, k.site), go;
  if (!s || !s.done || s.repair || ++k.t > 3600 || (p.glass || 0) > L_POCKET.glass - 2) return iDone(p, k.n > 0);
  var st = s.stock || (s.stock = {});
  /* (before another batch: still wanted?) */
  if (k.n > 0 && !k.sx && (p.sand || 0) < 3 && !lGlassWanted(g, p, s)) { p.bored = 0; return iDone(p, true); }
  if ((p.sand || 0) < 3) {
    /* a few spadefuls of sand first */
    if (!k.sx || !lSandy(g, k.sx, k.sy)) {
      var t = pFind(g, p, P_SANDY, 50, function (g2, x, y) { return !pAvoid(g2, p, x) && lSandy(g2, x, y); }, 10);
      if (!t) return iDone(p, k.n > 0);
      k.sx = t.x; k.sy = t.y;
    }
    go = lGo(g, p, k, "sand" + k.sx + "," + k.sy, k.sx, k.sy, 3, 10, 2);
    if (go <= 0) return false;
    p.dir = k.sx + 0.5 < p.x ? -1 : 1; k.act++;
    p.pose = (k.act % 16) < 8 ? "chopA" : "chopB";
    if (k.act % 16 !== 8) return true;
    var j = k.sy * g.gw + k.sx;
    heatVanish(g, j); p.sand = (p.sand || 0) + 1; g.fx.thud++;
    pChips(g, k.sx + 0.5, k.sy + 0.5, 2, [SAND_PAL[MAT.SAND][0], SAND_PAL[MAT.SAND][100]]);
    k.sx = 0;
    return true;
  }
  /* then the furnace mouth, and the bellows */
  var sx = s.sx, sy = mSpotRow(g, s), fy = Math.floor(p.y);
  if (Math.abs(p.x - sx - 0.5) > 1.5 || Math.abs(fy - sy) > 3) {
    if (iWalk(g, p, k, "glass" + s.id, sx, sy, function (x, y) { return Math.abs(x - sx) <= 1 && Math.abs(y - sy) <= 3; })) pGiveUp(g, p, sx);
    p.idle = 0;
    return false;
  }
  if ((p.coal || 0) < 1 && (st.coal || 0) < 1) { if (p.sayT <= 0) pSay(g, p, "nocoal"); return iDone(p, k.n > 0); }
  if (!k.act && !lGlassWanted(g, p, s)) { p.bored = 0; return iDone(p, k.n > 0); }   /* (nobody wants it now: the sand keeps) */
  p.dir = -s.mouth; p.idle = 0; k.act++;
  s.hot = g.tick + 60;
  p.pose = (k.act >> 3) & 1 ? "hammerA" : "stand";
  if (k.act % 9 === 0) pChips(g, s.fc + 0.5, s.G - 1.5, 2, [hex32("#bfe9ff"), SPARK_HOT[0]]);
  if (k.act === 40 && (p.sayT <= 0 || Math.random() < 0.4)) pSay(g, p, "glassblow");
  if (k.act < L_GLASS) return true;
  if (!lGlassWanted(g, p, s)) { p.bored = 0; return iDone(p, k.n > 0); }   /* (wanted when they started; not now) */
  if ((st.coal || 0) >= 1) st.coal--; else p.coal--;
  p.sand -= 3; p.glass = Math.min(L_POCKET.glass, (p.glass || 0) + 2); k.n++; k.act = 0;
  g.found.glass = (g.found.glass || 0) + 2;
  g.fx.clang++;
  sparks(g, s.fc + 0.5, s.G - 2, 8, 0.6, [hex32("#d6f2ff"), hex32("#a8dcf5")], 12, 0.3, PK_GLINT);
  if (!g.got.glass) { feed(g, p.name + " made the first glass: sand, and a very hot fire", "#bfe9ff", "glass"); achieve(g, "glass"); }
  wSpark(g, p, "stained");   /* (what if it were red: wonders.js) */
  /* (another batch only if it is wanted: for a glasshouse going up, or for one there is a field for and not glass enough) */
  if (k.n >= 3 || (p.glass || 0) >= L_POCKET.glass - 1 || !lGlassWanted(g, p, s)) { p.bored = 0; return iDone(p, true); }
  return true;
}
/* -------------------------------------------------------------------
   THE STORE: the furnace's pile takes ash and salt as well as coal and
   ore. pockets full of the one get emptied into it; and whoever wants
   some for the bowl or the field fetches it back out
   ------------------------------------------------------------------- */
var L_KEEP = 4;             /* what they keep in a pocket of ash or salt, when they empty the rest into the store */
function lGoStore(g, p) {
  if (p.lStoreT > g.tick) return false;
  p.lStoreT = g.tick + 600 + irnd(600);
  var f = mSites(g, "furnace", true)[0], K = g.know;
  if (!f || Math.abs(f.cx - p.x) > 220 || mCrew(g, "store", f.id) >= 2) return false;
  var st = f.stock || {}, what = null, put = false, want = 0;
  /* full up: the rest goes in */
  if ((p.ash || 0) >= L_POCKET.ash - 2) { what = "ash"; put = true; }
  else if ((p.salt || 0) >= L_POCKET.salt - 2) { what = "salt"; put = true; }
  /* glass or iron left on the furnace's pile (a glasshouse given up), wanted by one going up: fetched */
  else if ((st.glass || 0) >= 1 && lWantForGlasshouse(g, "glass") > 0.5 && (p.glass || 0) < 4) { what = "glass"; want = Math.min(8, Math.floor(st.glass)); }
  else if ((st.iron || 0) >= 0.2 && lWantForGlasshouse(g, "iron") > 0.1 && (p.iron || 0) < 2) { what = "iron"; want = Math.min(6, st.iron); }
  /* the makings of a charge, out of the pile, all at once (coal too, if they have none): ground there and then. a village
     with a pile like that, and not a charge about it, is a village not trying */
  else if (K.powder && K.mine && lToHand(g, "powder") < 3 && (st.salt || 0) + (p.salt || 0) >= 1 && (st.ash || 0) + (p.ash || 0) >= 2 &&
           (st.coal || 0) + (p.coal || 0) >= 1 && Math.random() < 0.6) { what = "the makings of black powder"; want = -1; }
  /* the makings of a charge, all but this: fetched */
  else if (K.powder && (p.coal || 0) >= 1 && (p.powder || 0) < 2 && (p.salt || 0) < 1 && (st.salt || 0) >= 1) { what = "salt"; want = 2; }
  else if (K.powder && (p.coal || 0) >= 1 && (p.powder || 0) < 2 && (p.ash || 0) < 2 && (st.ash || 0) >= 2) { what = "ash"; want = 4; }
  /* salt for the ice, the fish and the pot, when they have none and the store has some */
  else if (K.salt && (p.salt || 0) < 1 && (st.salt || 0) >= 1 && Math.random() < 0.5) { what = "salt"; want = 3; }
  /* ash for a field that has none on it */
  else if (K.potash && (p.ash || 0) < L_POTASH_ASH && (st.ash || 0) >= L_POTASH_ASH && lFieldWanting(g)) { what = "ash"; want = L_POTASH_ASH; }
  if (!what) return false;
  p.task = { kind: "store", site: f.id, what: what, put: put, want: want, t: 0 };
  return true;
}
function lWantForGlasshouse(g, r) {
  var n = 0;
  for (var k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "glasshouse" && !g.sites[k].done) n += Math.max(0, bNeed(g, g.sites[k], r));
  return n;
}
function lFieldWanting(g) {
  for (var k = 0; k < g.sites.length; k++) { var s = g.sites[k]; if (s.kind === "farm" && s.done && !((s.potash || 0) > g.tick + L_POTASH * 0.3)) return s; }
  return null;
}
function lTaskStore(g, p, k) {
  var s = bSite(g, k.site);
  if (!s || !s.done || ++k.t > 2400) return iDone(p, false);
  var sx = s.sx, sy = mSpotRow(g, s);
  if (Math.abs(p.x - sx - 0.5) > 1.5 || Math.abs(Math.floor(p.y) - sy) > 3) {
    if (iWalk(g, p, k, "store" + s.id, sx, sy, function (x, y) { return Math.abs(x - sx) <= 1 && Math.abs(y - sy) <= 3; })) pGiveUp(g, p, sx);
    p.idle = 0;
    return false;
  }
  var st = s.stock || (s.stock = {}), r = k.what, n;
  if (k.want < 0) {
    /* coal, salt and ash, whatever they are short of, off the pile: and a bowl, a few steps off from the hearth */
    var need = { coal: 1, salt: 1, ash: 2 }, got = 0;
    for (var q in need) { var take = Math.max(0, Math.min(need[q] - Math.floor(p[q] || 0), Math.floor(st[q] || 0))); st[q] = (st[q] || 0) - take; p[q] = (p[q] || 0) + take; got += take; }
    if ((p.coal || 0) < 1 || (p.salt || 0) < 1 || (p.ash || 0) < 2) return iDone(p, false);
    if (got) pChips(g, sx + 0.5, sy - 1, 3, [SAND_PAL[MAT.ASH][0], SAND_PAL[MAT.SALT][0], SAND_PAL[MAT.COAL][0]]);
    p.task = { kind: "grind", t: 0, act: 0, away: 0 };
    return true;
  }
  if (k.put) { n = Math.max(0, Math.floor((p[r] || 0) - L_KEEP)); p[r] -= n; st[r] = (st[r] || 0) + n; }
  else { n = Math.min(k.want, r === "iron" ? (st[r] || 0) : Math.floor(st[r] || 0)); st[r] -= n; p[r] = (p[r] || 0) + n; }
  if (n > 0) {
    pChips(g, sx + 0.5, sy - 1, 3, [SAND_PAL[r === "ash" ? MAT.ASH : MAT.SALT][0], SAND_PAL[r === "ash" ? MAT.ASH : MAT.SALT][120]]);
    if (k.put && !g.storeT) { g.storeT = g.tick; feed(g, p.name + " emptied their pockets into the store by the furnace: " + n + " " + r, "#d8d0c0", "store"); }
  }
  p.idle = 30; p.bored = Math.max(0, p.bored - 100);
  return iDone(p, n > 0);
}

/* -------------------------------------------------------------------
   BRINE: salt water, fetched in a bucket and boiled down at the furnace.
   the steam goes up the chimney, and the salt stays in the pan
   ------------------------------------------------------------------- */
var L_BRINE = 3;            /* cells of brine to a bucket (and salt out of it) */
function lGoBrine(g, p) {
  /* (a bucket of brine still in hand from last time, put down for a fire: that, first) */
  var f0 = (p.brine || 0) > 0 && !(p.lBrineT > g.tick) ? mSites(g, "furnace", true)[0] : null;
  if (f0 && mCrew(g, "brine", f0.id) < 1 && ((p.coal || 0) >= 1 || ((f0.stock && f0.stock.coal) || 0) >= 1)) { p.task = { kind: "brine", site: f0.id, x: 0, y: 0, t: 0, act: 0, full: p.brine }; return true; }
  if (p.lBrineT > g.tick || lToHand(g, "salt") + ((((mSites(g, "furnace", true)[0] || {}).stock || {}).salt) || 0) >= 6) return false;
  p.lBrineT = g.tick + 3000;
  var f = mSites(g, "furnace", true)[0];
  if (!f || Math.abs(f.cx - p.x) > 220 || mCrew(g, "brine", f.id) >= 1) return false;
  if ((p.coal || 0) < 1 && ((f.stock && f.stock.coal) || 0) < 1) return false;   /* (a fire to boil it on: a lump of coal) */
  var w = lFindBrine(g, p, 160);
  if (!w) return false;
  p.task = { kind: "brine", site: f.id, x: w.x, y: w.y, t: 0, act: 0, full: 0 };
  return true;
}
/* the nearest top of a pool of salt water, with air over it, within R */
function lFindBrine(g, p, R) {
  var fx = Math.floor(p.x), x, y, c;
  for (var d = 0; d <= R; d++) for (var sd = -1; sd <= 1; sd += 2) {
    x = fx + d * sd;
    if (x < 1 || x >= g.gw - 1 || (!d && sd > 0)) continue;
    for (y = 1; y < g.gh; y++) {
      c = g.m[y * g.gw + x];
      if (c === MAT.SALTWATER && AIRY[g.m[(y - 1) * g.gw + x]] && !bMarked(g, x, y)) return { x: x, y: y };
      if (!AIRY[c] && !P_LEAF[c]) break;
    }
  }
  return null;
}
function lTaskBrine(g, p, k) {
  var s = bSite(g, k.site), go;
  if (!s || !s.done || ++k.t > 3600) return iDone(p, false);
  if (!k.full && (p.brine || 0) > 0) k.full = p.brine;   /* (a bucket still full from last time, put down for a fire) */
  if (!k.full) {
    if (g.m[k.y * g.gw + k.x] !== MAT.SALTWATER) { var w = lFindBrine(g, p, 16); if (!w) return iDone(p, false); k.x = w.x; k.y = w.y; }
    go = lGo(g, p, k, "brine" + k.x + "," + k.y, k.x, k.y, 3, 10, 4);
    if (go <= 0) return false;
    p.dir = k.x + 0.5 < p.x ? -1 : 1; k.act++; p.pose = "chopB";
    if (k.act < 20) return true;
    /* (a bucketful off the top of it: as iScoop does with water) */
    for (var q = 0; q < L_BRINE; q++) {
      var j = k.y * g.gw + k.x + (q === 1 ? -1 : q === 2 ? 1 : 0);
      if (g.m[j] === MAT.SALTWATER) { heatVanish(g, j); k.full++; }
    }
    if (!k.full) return iDone(p, false);
    p.brine = k.full;
    g.fx.splash++; k.act = 0;
    if (p.sayT <= 0 || Math.random() < 0.4) pSay(g, p, "brine");
    return true;
  }
  var sx = s.sx, sy = mSpotRow(g, s);
  if (Math.abs(p.x - sx - 0.5) > 1.5 || Math.abs(Math.floor(p.y) - sy) > 3) {
    if (iWalk(g, p, k, "boil" + s.id, sx, sy, function (x, y) { return Math.abs(x - sx) <= 1 && Math.abs(y - sy) <= 3; })) pGiveUp(g, p, sx);
    p.idle = 0;
    return false;
  }
  if (!k.act) {
    var st = s.stock || (s.stock = {});
    if ((st.coal || 0) >= 1) st.coal--; else if ((p.coal || 0) >= 1) p.coal--;
    else { if (p.sayT <= 0) pSay(g, p, "nocoal"); p.lBrineT = g.tick + 3000; return iDone(p, false); }
  }
  p.dir = -s.mouth; p.idle = 0; k.act++; s.hot = g.tick + 60;
  p.pose = (k.act >> 3) & 1 ? "hammerA" : "stand";
  if (k.act % 6 === 0) partAdd(g, PK_GLINT, s.fc + 0.5, s.G - 3, (Math.random() - 0.5) * 0.3, -0.5, 20, hex32("#dfe8f0"));   /* (steam) */
  if (k.act < 90) return true;
  p.salt = Math.min(L_POCKET.salt, (p.salt || 0) + k.full); g.found.salt = (g.found.salt || 0) + k.full; p.brine = 0;
  g.brineT = g.tick;
  feed(g, p.name + " boiled a bucket of brine down at the furnace: " + k.full + " salt" + (g.brined ? "" : ", and a lot of steam"), "#e8eef4", "brine");
  g.brined = (g.brined || 0) + 1;
  iSpark(g, p, "salt");
  return iDone(p, true);
}

/* a glass roof on iron posts over a field that has none: a post at either end, just outside it (iron, which they step
   through, as they do a lift's headframe), and the roof L_ROOF over the highest of its ground */
function lPlanGlasshouse(g, p, dry) {
  var k, f, j, has, x, y, G, R, plan, ok;
  for (k = 0; k < g.sites.length; k++) {
    f = g.sites[k];
    if (f.kind !== "farm" || !f.done || Math.abs(f.cx - p.x) > 220) continue;
    for (has = false, j = 0; j < g.sites.length; j++) if (g.sites[j].kind === "glasshouse" && g.sites[j].farm === f.id) has = true;
    if (has) continue;
    R = f.G - L_ROOF; plan = []; ok = R > 4;
    var xa = f.x0 - 1, xb = f.x1 + 1;
    /* the posts: from the ground up to the roof, in nobody's way (and over nothing that runs or burns) */
    for (var side = 0; side < 2 && ok; side++) {
      x = side ? xb : xa;
      /* (the ground under where the post goes: down from under the roof line, past any old post still standing) */
      for (G = R + 1; G <= f.G + 6 && !pSolid(g, x, G); G++);
      if (G > f.G + 6 || LIQUID[pCell(g, x, G)]) G = -1;
      if (G < 0 || G - R > L_ROOF + 4 || !pSolid(g, x, G) || bMarked(g, x, G - 1)) { ok = false; break; }
      for (y = G - 1; y > R && ok; y--) { var c = pCell(g, x, y); if ((!AIRY[c] && !P_LEAF[c] && c !== MAT.GIRDER) || bMarked(g, x, y)) ok = false; else plan.push(bE(g, x, y, MAT.GIRDER, 0)); }   /* (an old post still standing: used again) */
    }
    for (x = xa; x <= xb && ok; x++) {
      var c2 = pCell(g, x, R);
      if ((!AIRY[c2] && !P_LEAF[c2] && c2 !== MAT.GLASS) || bMarked(g, x, R) || !(AIRY[pCell(g, x, R - 1)] || P_LEAF[pCell(g, x, R - 1)])) ok = false;
      else {
        if (P_LEAF[c2]) plan.push(bE(g, x, R, MAT.EMPTY, 0));   /* (a bush hanging where the roof goes: cut back first) */
        plan.push(bE(g, x, R, MAT.GLASS, 1));
      }
    }
    if (!ok || iDoorNear(g, xa, 1) || iDoorNear(g, xb, 1)) continue;
    if (dry) {   /* (only asking: is there a field a glasshouse could go over, and what would it take, over what is standing) */
      var cost = { farm: f, iron: 0, glass: 0 };
      for (var q = 0; q < plan.length; q++) if (g.m[plan[q].i] !== plan[q].v) { if (plan[q].v === MAT.GIRDER) cost.iron += B_AMT[MAT.GIRDER]; else if (plan[q].v === MAT.GLASS) cost.glass++; }
      return cost;
    }
    var s = bNew(g, "glasshouse", p, plan, [xa, R, xb, f.G - 1], { farm: f.id, R: R });
    feed(g, p.name + " is putting a glasshouse over " + bLabel(f), "#bfe9ff", "plan" + s.id);
    pSay(g, p, "planGlass", true);
    /* (all of it standing already, old posts and panes and all: it is up) */
    if (!bNext(g, s, null) && bFinished(g, s)) bFinish(g, s, p);
    else if (bCarries(p)) bJoin(g, p, s);
    return true;
  }
  if (!dry) iNoRoom(g, "a glasshouse");
  return false;
}
/* what is on a glasshouse's pile, back into pockets: whoever is nearest, as much as fits (glass has a pocket's worth;
   wood and iron are carried however much there is), then the next nearest. what fits nowhere goes on the furnace's pile */
function lRefund(g, s) {
  var st = s.stock || {}, r, q, n, L = g.peasants.filter(function (o) { return !o.dead; });
  L.sort(function (a, b) { return Math.abs(a.x - s.cx) - Math.abs(b.x - s.cx); });
  for (r in st) {
    for (q = 0; q < L.length && st[r] > 1e-6; q++) {
      if (r === "wood") { L[q].boards = (L[q].boards || 0) + st[r]; st[r] = 0; break; }
      n = L_POCKET[r] ? Math.max(0, Math.min(st[r], L_POCKET[r] - (L[q][r] || 0))) : st[r];
      L[q][r] = (L[q][r] || 0) + n; st[r] -= n;
    }
    var fu = mSites(g, "furnace", true)[0];
    if (st[r] > 1e-6 && fu) { fu.stock = fu.stock || {}; fu.stock[r] = (fu.stock[r] || 0) + st[r]; }
    st[r] = 0;
  }
}
/* is the glasshouse over field f standing (most of its roof there) */
function lUnderGlass(g, s) {
  var n = 0, m = 0;
  for (var k = 0; k < s.plan.length; k++) if (s.plan[k].v === MAT.GLASS) { m++; if (g.m[s.plan[k].i] === MAT.GLASS) n++; }
  return m > 0 && n >= m * 0.7;
}

/* -------------------------------------------------------------------
   THE WEATHER, AND THE BOOKS, now and then (ideasStep, every 20 ticks)
   ------------------------------------------------------------------- */
function lStep(g) {
  var k, s, x, f;
  /* which columns of field have potash on them, or a glass roof over them (for cropGrow) */
  if (!g.lboost || g.lboost.length !== g.gw) { g.lboost = new Uint8Array(g.gw); g.lboostY = new Int16Array(g.gw); }
  g.lboost.fill(0);
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if (s.kind === "farm" && s.potash > g.tick) for (x = s.x0; x <= s.x1; x++) { g.lboost[x] |= 1; g.lboostY[x] = s.G; }
    else if (s.kind === "glasshouse" && (s.done || s.built) && (f = bSite(g, s.farm)) && lUnderGlass(g, s)) {
      for (x = f.x0; x <= f.x1; x++) { g.lboost[x] |= 2; g.lboostY[x] = f.G; }
      lGlassWarm(g, s, f);
    }
  }
  /* a glasshouse whose field has gone (dug up, or a ruin): the roof stays where it is, but it is not ours to mend. and
     one that nobody has got any further with in a long while (no glass, no iron left in the valley): what is on its
     pile goes back, and it will have to wait */
  for (k = g.sites.length - 1; k >= 0; k--) {
    s = g.sites[k];
    if (s.kind !== "glasshouse") continue;
    if (!bSite(g, s.farm)) { lRefund(g, s); bRemove(g, k); continue; }
    /* a roof more gone than there and nobody able to put it back (something in the way of the panes) for a long while:
       past mending. it is let go, and a new one can be planned */
    if ((s.done || s.built) && !lUnderGlass(g, s)) {
      if (!s.badT) s.badT = g.tick;
      else if (g.tick - s.badT > 9000 && !s.repair) { feed(g, "the glasshouse is past mending. what is left of it stays where it is", "#c8d0dc", "plan" + s.id); bRemove(g, k); continue; }
    } else s.badT = 0;
    if (!s.done && g.tick - s.last > 15000) {
      feed(g, "not glass or iron enough for the glasshouse. it will have to wait", "#c8d0dc", "plan" + s.id);
      lRefund(g, s);
      bRemove(g, k);
    }
  }
  /* snowmen melting: when there is not much of one left, he is gone, and somebody is sorry */
  for (k = g.lsnowmen.length - 1; k >= 0; k--) {
    var m = g.lsnowmen[k];
    /* (half built, and nobody has been near him in a long while: he stays as he is, to melt, and is nobody's) */
    if (!m.up) { if (g.tick - m.last > 6000 && !lManCrew(g, m.id)) lDropMan(g, m); continue; }
    var n = 0, cold = 0, i;
    for (var q = 0; q < L_SNOWMAN.length; q++) {
      i = (m.G - 1 - L_SNOWMAN[q][0]) * g.gw + m.x + L_SNOWMAN[q][1];
      if (g.m[i] === MAT.PACKSNOW) { n++; if (g.T[i] < -0.5) cold++; }
    }
    /* (as he goes, a cell at a time: a thaw is a snowman sitting at nought, soaking up the warm; a snowman that loses
       cells while he is still cold through has had something else happen to him: a bang, acid, a shovel) */
    if (m.cnt == null) m.cnt = L_SNOWMAN.length;
    if (n < m.cnt) { if (cold * 2 > n || lRough(g, m)) m.lost = (m.lost || 0) + m.cnt - n; else m.thaw = (m.thaw || 0) + m.cnt - n; }
    m.cnt = n;
    if (n >= L_SNOWMAN.length * 0.4) continue;
    lDropMan(g, m);
    feed(g, iName(m.name) + ", " + pTitle(m.who) + "'s snowman, " + ((m.thaw || 0) >= (m.lost || 0) ? "has melted" : "is gone. nobody saw what happened"), "#c8d0dc", "snowman" + m.id);
    var o = pOther(g, { x: m.x, y: m.G }, 60);
    if (o && !o.sleep) lSayD(g, o, "snowmanGone", m.name);
  }
  /* passers-by say hello to a snowman, by name */
  for (k = 0; k < g.lsnowmen.length; k++) {
    var sm = g.lsnowmen[k];
    if (!sm.up || Math.random() > 0.2) continue;
    var by = pOther(g, { x: sm.x, y: sm.G - 4 }, 8);
    /* (whoever built him, if they are about, is prouder of him than anybody) */
    for (var b2 = 0; b2 < g.peasants.length; b2++) { var o2 = g.peasants[b2]; if (o2.short === sm.who && !o2.dead && Math.abs(o2.x - sm.x) < 20 && Math.abs(o2.y - sm.G) < 12 && Math.random() < 0.5) by = o2; }
    if (by && by.sayT <= 0 && !by.sleep && lFree(by) && !(by.task && by.task.kind === "snowball")) lSayD(g, by, by.short === sm.who ? "snowmanMine" : "snowmanHello", sm.name);
  }
  /* (old bangs forgotten) */
  if (g.booms) while (g.booms.length && g.tick - g.booms[0].t > 200) g.booms.shift();
  /* things picked up in passing */
  for (k = 0; k < g.peasants.length; k++) if (Math.random() < 0.5) lPassBy(g, g.peasants[k]);
  /* a peasant on fire with black powder in their pockets */
  for (k = 0; k < g.peasants.length; k++) {
    var p = g.peasants[k];
    if (p.dead || !p.fire || (p.powder || 0) < 1 || Math.random() > 0.25) continue;
    var px = Math.floor(p.x), py = Math.floor(p.y) - 4;
    if (px < 1 || px >= g.gw - 1 || py < 1 || py >= g.gh) continue;
    var n2 = Math.floor(p.powder); p.powder = 0;
    pSay(g, p, "pockets", true);
    feed(g, p.name + " was on fire, with black powder in their pockets", "#ffb070", "pockets");
    achieve(g, "pockets");
    sandBoom(g, py * g.gw + px, 3 + Math.min(2, n2), 1.2);
  }
  /* a hard frost kills wheat, from the top of the stalk down: the ripe ear first, then the green under it */
  lFrostKill(g);
  /* frost on the open fields: the wheat stops (somebody says so, once in a while) */
  if (g.tick > (g.frostT || 0) && g.know.farm) {
    for (k = 0; k < g.sites.length; k++) {
      s = g.sites[k];
      if (s.kind !== "farm" || !s.done) continue;
      var cold = 0;
      for (var e = 0; e < s.plan.length; e++) if (s.plan[e].v === MAT.CROP && LEAFY[g.m[s.plan[e].i]] && g.T[s.plan[e].i] < L_FROST) cold++;
      if (cold >= 2) {
        g.frostT = g.tick + 20000;
        feed(g, "frost on " + bLabel(s) + ". the wheat has stopped growing" + (g.lboost[s.x0] & 2 ? ", even under the glass" : ""), "#cfeaff", "frost");
        achieve(g, "frost");
        var w = pOther(g, { x: s.cx, y: s.cy }, 200);
        if (w && g.know.smelt) iSpark(g, w, "glass");
        break;
      }
    }
  }
}
/* under a glass roof the ground's own warmth stays put: out in the open it goes up into the sky, under glass it goes
   into the air and the wheat over it, and keeps them at a mild 12 or so. heat out of the ground (a few cells down,
   where it is warm), and into the cold over it: none made, none lost. so through a cold snap the wheat under glass
   keeps growing a good while after the open fields have stopped; a long hard freeze gets in in the end, and a quick
   chill with COOL stops it under glass as it does anywhere */
var L_WARM = 12;
function lGlassWarm(g, s, f) {
  var gw = g.gw, x, y, j, c, src, dt, e, soil = {}, q;
  for (q = 0; q < f.plan.length; q++) if (f.plan[q].v === MAT.SOIL) soil[f.plan[q].i % gw] = (f.plan[q].i / gw) | 0;
  for (x = f.x0; x <= f.x1; x++) {
    var G = soil[x];   /* (the field's own earth: the roof over it is marked, and mGround stops there) */
    if (G == null || G + 3 >= g.gh) continue;
    /* (the warmest of the ground a few cells down: it is a deep store, but it is not bottomless) */
    for (src = -1, y = G + 2; y <= Math.min(g.gh - 1, G + 8); y++) { j = y * gw + x; if (SOLID[g.m[j]] && HEAT_C[g.m[j]] && (src < 0 || g.T[j] > g.T[src])) src = j; }
    if (src < 0) continue;
    for (y = s.R + 1; y <= G; y++) {
      j = y * gw + x; c = g.m[j];
      if (!(AIRY[c] || LEAFY[c] || c === MAT.SOIL) || g.T[j] >= L_WARM || g.T[src] <= g.T[j] + 1) continue;
      dt = Math.min(1.5, (L_WARM - g.T[j]) * 0.05, (g.T[src] - g.T[j]) * 0.05);
      e = dt * HEAT_C[c];
      heatAdd(g, j, dt); heatAdd(g, src, -e / HEAT_C[g.m[src]]);
    }
  }
}
/* has something rough happened to snowman m lately: a bang close by, or acid at him */
function lRough(g, m) {
  for (var k = 0; k < (g.booms || []).length; k++) { var b = g.booms[k]; if (g.tick - b.t < 60 && Math.abs(b.x - m.x) < b.R + 6 && Math.abs(b.y - m.G + 3) < b.R + 6) return true; }
  for (var dy = -7; dy <= 1; dy++) for (var dx = -3; dx <= 3; dx++) if (pCell(g, m.x + dx, m.G + dy) === MAT.ACID) return true;
  return false;
}
function lFrostKill(g) {
  for (var k = 0; k < g.sites.length; k++) {
    var s = g.sites[k];
    if (s.kind !== "farm") continue;
    for (var e = 0; e < s.plan.length; e++) {
      if (s.plan[e].v !== MAT.CROP) continue;
      /* (the topmost wheat over the furrow, stalk or ear, even a bit of stalk left hanging over a gap) */
      for (var i = s.plan[e].i, top = -1, h = 0; h <= 10 && i >= 0; h++, i -= g.gw) if (g.m[i] === MAT.CROP || g.m[i] === MAT.WHEAT) top = i;
      if (top >= 0 && g.T[top] < L_KILL && Math.random() < 0.08) heatVanish(g, top);
    }
  }
}
/* every tick: things in the air, and fuses burning */
function lTick(g) {
  if (!g.lballs) lReset(g);
  if (g.lballs.length) lBallsStep(g);
  if (g.lcharges.length) lChargesStep(g);
}
/* wheat, a tick at a time, as it grows (ideas.js cropGrow): how much faster than out in the open, with what is on the
   field and over it. 0 if it is not growing at all */
function lGrowth(g, i, x) {
  var y = (i / g.gw) | 0, b = lBoost(g, x, y), t = g.T[i];
  if (t < L_FROST) return 0;   /* frost (under glass too, if it is cold enough in there: it seldom is). lFrostKill */
  return (b & 1 ? L_GROW : 1) * (b & 2 ? 1.5 : 1);
}
/* the potash (1) and the glass (2) on a field, for a cell at (x, y): only the field's own, not something else in the same
   columns higher up or lower down */
function lBoost(g, x, y) {
  if (!g.lboost || !g.lboost[x]) return 0;
  var G = g.lboostY[x];
  return y <= G + 1 && y >= G - L_ROOF ? g.lboost[x] : 0;
}
function lWetUnderGlass(g, x) { return !!(g.lboost && (g.lboost[x] & 2)); }

/* -------------------------------------------------------------------
   THE PAPERWORK
   ------------------------------------------------------------------- */
function lLabel(s) {
  if (s.kind === "glasshouse") return "the glasshouse";
  if (s.kind === "heap") return "the village heap";   /* (tidy.js) */
  return "";
}
function lFinish(g, s, p) {
  if (s.kind !== "glasshouse") return false;
  if (s.built) return true;   /* (mended: no news) */
  s.built = true;
  var f = bSite(g, s.farm);
  feed(g, (p ? p.name : "the village") + " finished the glasshouse over " + (f ? bLabel(f) : "the field") + ". the wheat loves it", "#bfe9ff", "plan" + s.id);
  achieve(g, "glasshouse");
  return true;
}
/* what they are up to, for the bar at the bottom: "" if it is none of ours */
function lMood(g, p) {
  var k = p.task, s;
  if (!k) return "";
  switch (k.kind) {
    case "gather": return "is picking up " + (k.what === "powder" ? "gunpowder. very carefully" : k.what === "iron" ? "scrap metal" : (k.what || "something")) + (lPockets(p) ? ". carrying " + lPockets(p) : "");
    case "snowball": var q = lAlive(g, k.foe); return "is in a snowball fight" + (q ? " with " + pTitle(q.short) : "");
    case "snowman": s = lMan(g, k.man); return "is building a snowman" + (s ? ", " + iName(s.name) : "");
    case "skate": return k.on ? "is skating. on purpose" : "is off skating";
    case "grit": return "is salting the ice";
    case "potash": return "is raking ash into the field";
    case "grind": return "is grinding black powder. nobody sneeze";
    case "blast": return k.set ? "has lit a charge in the gallery, and is standing well back" : "is taking a charge of black powder down the mine";
    case "bombfish": return "is going fishing. with black powder";
    case "glassblow": return (p.sand || 0) >= 3 ? "is making glass at the furnace" : "is fetching sand to make glass";
    case "standback": return "is standing well back. there is a lit fuse down there";
    case "store": return k.put ? "is putting spare " + k.what + " in the store by the furnace" : "is fetching " + k.what + " out of the store by the furnace";
    case "brine": return !k.full ? "is fetching a bucket of brine, to boil down for salt" : (k.act ? "is boiling brine at the furnace. salt, in a bit" : "is carrying brine to the furnace");
  }
  if (k.kind === "build" && (s = bSite(g, k.site)) && s.kind === "glasshouse") return (s.repair ? "is mending " : "is building ") + "the glasshouse";
  return "";
}

/* -------------------------------------------------------------------
   DRAWING
   ------------------------------------------------------------------- */
var L_COAL = hex32("#16161a"), L_CARROT = hex32("#f08a24"), L_TWIG = hex32("#6b4a1e"), L_HAT = hex32("#1e1e24"), L_BAND = hex32("#c83a3a");
var L_STICK = hex32("#c83a2a"), L_ASHFLECK = hex32("#9a9a96");
/* potash on the fields, the lit charges, and the snowmen's faces. returns how many things glow */
function lDraw(g) {
  var hot = 0, k, s, x, j, e;
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if (s.kind !== "farm" || !(s.potash > g.tick)) continue;
    /* grey flecks raked into the dark earth */
    for (j = 0; j < s.plan.length; j++) {
      e = s.plan[j];
      if (e.v !== MAT.SOIL || g.m[e.i] !== MAT.SOIL || ((e.i * 7) % 3)) continue;
      g.px[e.i] = blend32(g.px[e.i], L_ASHFLECK, 0.55);
    }
  }
  for (k = 0; k < g.lcharges.length; k++) {
    var c = g.lcharges[k];
    iPut(g, c.x, c.y, L_STICK); iPut(g, c.x, c.y + 1, L_STICK);
    if ((g.tick >> 1) & 1) { iPut(g, c.x, c.y - 1, SPARK_HOT[(g.tick + k) & 3], true); hot++; }
  }
  for (k = 0; k < g.lsnowmen.length; k++) {
    var m = g.lsnowmen[k];
    if (!m.up) continue;
    var hx = m.x, hy = m.G - 6, d = m.dir || 1;
    if (pCell(g, hx, hy) !== MAT.PACKSNOW || pCell(g, hx, hy + 1) !== MAT.PACKSNOW) continue;   /* (his head has gone) */
    iPut(g, hx - 1, hy, m.eyes ? L_COAL : hex32("#5c6270")); iPut(g, hx + 1, hy, m.eyes ? L_COAL : hex32("#5c6270"));
    iPut(g, hx + d, hy + 1, L_CARROT); if (AIRY[pCell(g, hx + 2 * d, hy + 1)]) iPut(g, hx + 2 * d, hy + 1, L_CARROT);
    /* a hat (somebody's old one), a scarf, and twigs for arms */
    for (x = -1; x <= 1; x++) { if (AIRY[pCell(g, hx + x, hy - 1)]) iPut(g, hx + x, hy - 1, L_HAT); }
    if (AIRY[pCell(g, hx, hy - 2)]) iPut(g, hx, hy - 2, L_HAT);
    /* (a scarf where the head sits on the body, a coal button, and twigs for arms) */
    if (pCell(g, hx - 1, hy + 2) === MAT.PACKSNOW) for (x = -1; x <= 1; x++) iPut(g, hx + x, hy + 2, x === -d ? blend32(L_BAND, 0xff000000, 0.3) : L_BAND);
    if (pCell(g, hx, m.G - 3) === MAT.PACKSNOW) iPut(g, hx, m.G - 3, L_COAL);
    for (x = -1; x <= 1; x += 2) {
      if (AIRY[pCell(g, hx + x * 2, m.G - 4)]) iPut(g, hx + x * 2, m.G - 4, L_TWIG);
      if (AIRY[pCell(g, hx + x * 3, m.G - 5)]) iPut(g, hx + x * 3, m.G - 5, L_TWIG);
    }
  }
  return hot;
}
/* over everybody: snowballs and charges in the air */
function lDrawOver(g) {
  for (var k = 0; k < (g.lballs || []).length; k++) {
    var b = g.lballs[k], x = Math.floor(b.x), y = Math.floor(b.y);
    if (b.kind === "snow") { iPut(g, x, y, hex32("#ffffff")); iPut(g, x, y + 1, hex32("#dfeaf6")); }
    else { iPut(g, x, y, L_STICK); iPut(g, x, y - 1, SPARK_HOT[(g.tick + k) & 3], true); }
  }
}
