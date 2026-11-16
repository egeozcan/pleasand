/* =====================================================================
   PLEASAND  --  peasants.js

   the villagers. they are not on the grid: each one is a little bag of
   numbers that walks over the grid, reads the cells it is standing in,
   and reacts. they climb small steps, turn around at walls, fall off
   cliffs, cannot swim, catch fire, and have opinions about all of it.

   a peasant is 5 cells wide and 9 tall, drawn straight into the pixel
   buffer so it sits in the world like everything else. its feet are at
   (x, y); only the middle column collides, which is plenty.
   ===================================================================== */
"use strict";

var P_MAX = 120, P_BREATH = 300;
/* things a buried peasant cannot dig up through */
var P_HARD = new Uint8Array(32);
[MAT.STONE, MAT.GLASS, MAT.ICE, MAT.CLONER, MAT.FAUCET, MAT.DRAIN, MAT.TORCH, MAT.METAL].forEach(function (v) { P_HARD[v] = 1; });
/* how warm a peasant likes it. above P_SWEAT they complain, above P_SCALD they run, above
   P_IGNITE they are on fire. below P_CHILL they get colder and colder until they are ice */
var P_SWEAT = 50, P_SCALD = 90, P_IGNITE = 230, P_CHILL = -8, P_FREEZE = 900;

var P_NAMES = ["GARY", "DOUG", "BARB", "KEVIN", "BRENDA", "OTTO", "PIP", "GUNTHER", "BEA", "NIGEL", "URSULA", "PERCY",
  "AGATHA", "DAVE", "STEVE", "MILDRED", "HAROLD", "EDNA", "BOB", "GWEN", "TOBIAS", "OSWALD", "HILDA", "MERV", "IVY",
  "CLIVE", "DORIS", "FRANK", "GERTRUDE", "HUGO", "INGRID", "JEB", "LARRY", "MAUDE", "NORM", "OLGA", "PHIL", "QUENTIN",
  "ROSA", "SVEN", "TRUDY", "ULF", "VERA", "WALDO", "YURI", "ZELDA", "BARRY", "CHAD", "DEB", "ELMER", "FERN", "GORDON",
  "HANK", "IRIS", "JUDY", "KURT", "LOIS", "MOE", "NELL", "OWEN", "PEG", "RALPH", "SUE", "TED", "WILMA", "BERNARD",
  "CEDRIC", "DUNCAN", "EGBERT", "FLO", "GILBERT", "HORACE", "ALFRED", "BJORN", "COLIN", "ETHEL", "FERGUS", "GLADYS",
  "HAMISH", "IGOR", "JOAN", "KEITH", "LEN", "MARGE", "NED", "OSCAR", "BALDRICK", "WOLFGANG", "PRUDENCE", "TIM"];
var P_SUFFIX = [" JR", " THE BRAVE", " THE WISE", " THE 3RD", " THE DAMP", " THE UNLUCKY", " THE IMMORTAL", " SR"];

/* what they say. {n} is somebody else's name */
var P_SAY = {
  idle: ["nice weather", "i love sand", "lovely day for it", "what's a pixel", "my back hurts", "taxes again",
         "i should start a farm", "hm", "*whistles*", "i'm hungry", "anyone seen my goat", "the king smells",
         "sand gets everywhere", "la la la", "where's everyone going", "i forgot why i came here", "today's a good day",
         "did i leave the oven on", "i'm walking here", "nice hat", "what's for dinner", "i miss my goat",
         "is it tuesday", "i'm thinking of moving", "the sky is big today", "so much sand", "i'm on a walk",
         "i've got a bad feeling", "nothing ever happens here", "life is good"],
  hello: ["is someone up there?", "hello? who's clicking?", "i have a bad feeling about today", "is that... a god?",
          "nobody touch anything", "quiet day in the village"],
  watched: ["i feel watched", "is that a giant hand", "stop looking at me", "who's there", "the clicking. it's back",
            "hello up there", "please don't"],
  spawn: ["hello world", "where am i", "i'm new here", "hi!", "what year is it", "who am i", "i exist!",
          "reporting for duty", "i was born just now", "huh", "oh no, not again"],
  grab: ["PUT ME DOWN", "hey!", "i can see my house", "wheee", "UNHAND ME", "not again", "this is new",
         "i'm flying!", "the view!", "careful!", "i bruise easily"],
  thrown: ["WHEEEEE", "AAAAAA", "YEEEET", "WAAAAH", "I'M FLYING", "noooooo", "WORTH IT"],
  fire: ["AAAAAA", "HOT HOT HOT", "FIRE! FIRE!", "NOT AGAIN", "STOP, DROP AND... ?", "IT BURNS", "WHO DID THIS",
         "I REGRET NOTHING", "WATER! WATER!", "AAAAAAAAA", "I'M TOO YOUNG"],
  phew: ["phew", "tssss", "that was close", "i'm ok!", "smells like bacon", "never again", "i'm damp now"],
  swim: ["glub", "glub glub", "i can't swim", "HELP", "water! everywhere!", "this is fine", "blub"],
  acid: ["IT TINGLES", "OW OW OW", "MY SKIN", "not the acid", "it's eating me", "fizzy"],
  oof: ["OOF", "ow", "my back", "i'm ok!", "ouch", "that hurt", "my knees"],
  dizzy: ["i'm ok!", "again! again!", "what year is it", "ow", "*dizzy*", "i saw my life flash", "ten out of ten",
          "who threw that", "i can fly!", "where am i", "my hat!"],
  panic: ["WHAT WAS THAT", "RUN!", "AAAA", "we're under attack", "the gods are angry", "MY EARS", "TAKE COVER", "nope"],
  nuke: ["MY EYES", "was that the sun?", "WHAT WAS THAT", "i'm moving out", "THE END IS HERE", "oh no", "AAAAAA"],
  zap: ["bzzt", "i can taste colours", "my fillings!", "zap", "i've seen the light", "...ow", "crispy", "ow my hair"],
  ooh: ["ooooh", "aaaah", "pretty!", "wow", "best day ever", "do it again", "ooh, sparkly", "magic!"],
  flower: ["ooh, a flower", "pretty", "smells nice", "a flower!", "lovely"],
  nope: ["nope", "nope nope", "not today", "i'm not going there", "uh oh", "hot!", "no thank you", "FIRE!", "MY HOUSE!",
         "call the fire brigade", "we don't have a fire brigade", "that's not good"],
  wet: ["i don't do water", "too wet", "nope", "i can't swim", "not in there"],
  fall: ["WAAAAH", "oh no", "AAAAAA", "wheeee", "this is fine", "MUMMY"],
  buried: ["mmmph", "mmf mmf", "help", "it's dark", "sand in my ears"],
  mourn: ["NOOO {n}!", "{n}?!", "rip {n}", "i'll take their hat", "{n} owed me money", "not {n}!", "they were so young",
          "{n}... no", "i liked {n}", "more room for me", "F"],
  greet: ["hi {n}", "morning", "'sup", "excuse me", "lovely hat", "hey {n}", "oh, {n}", "evening"],
  space: ["AAAAAAA", "SPACE IS COLD", "I'M BACK", "WHAT GOES UP..."],
  ghost: ["boo", "worth it", "tell my goat i loved it", "free at last", "it's nice up here", "wooOOoo",
          "i regret everything", "was it something i said", "i'll haunt you", "see you all soon", "the light! it's so bright"],
  crowned: ["i'm the king now?", "finally", "the crown is heavy", "bow, peasants", "i didn't want this"],
  cough: ["*cough*", "*cough cough*", "who's smoking", "my lungs", "*wheeze*"],
  clone: ["am i... me?", "who are you", "i'm the real one", "there's two of me", "hello me", "is this legal"],
  hot: ["is it hot in here", "phew", "i'm sweating", "who turned the sun up", "it's like a sauna", "so warm",
        "i'm melting", "need a drink"],
  scald: ["HOT HOT HOT", "OW OW OW", "MY FEET", "THE FLOOR IS HOT", "OUCH", "it burns!", "ow ow ow"],
  cold: ["brrr", "b-b-b-brr", "so cold", "i can't feel my toes", "where's my coat", "winter is here", "*shiver*",
         "my nose is frozen", "c-c-cold"],
  float: ["i'm floating!", "salt water! i float!", "look, no hands", "it's like the dead sea", "so buoyant"]
};

var P_DEATH = {
  fire: ["{n} was flambéed", "{n} is extra crispy now", "{n} got toasted", "{n} became a campfire", "{n} was too hot to handle", "{n} burned out"],
  lava: ["{n} took a lava bath", "{n} is soup now", "{n} found out the floor was lava", "{n} went for a very warm dip"],
  drown: ["{n} forgot how to swim", "{n} sleeps with the fishes", "{n} drank most of the pond", "{n} should have stayed dry"],
  acid: ["{n} dissolved. ew", "{n} is a puddle now", "{n} fizzed away", "{n} got the acid treatment"],
  fall: ["{n} tripped. from very high up", "{n} found the ground", "{n} believed they could fly", "{n} fell off the world"],
  splat: ["{n} went splat", "{n} hit something at speed", "{n} was thrown too hard", "{n} became a wall decoration", "{n} has been flattened"],
  nuke: ["{n} was vaporized", "{n} saw a bright light", "{n} is now a shadow on a wall", "{n} was atomised"],
  drain: ["{n} went down the drain", "{n} is in the sewers now", "{n} was flushed"],
  buried: ["{n} was buried alive. sandy", "{n} is part of the beach now", "{n} became a sandcastle"],
  zap: ["{n} got struck twice. impressive", "{n} conducted electricity. briefly", "{n} was fried. crispy"],
  reentry: ["{n} came back from space. briefly", "{n} did not stick the landing", "{n} burned up on re-entry"],
  freeze: ["{n} froze solid", "{n} is a peasant-sicle now", "{n} chilled out. permanently", "{n} should have worn a coat",
           "{n} is a statue now. a cold one"]
};

/* every few deaths, the village has something to say about it */
var P_MILESTONES = {
  1: ["FIRST BLOOD", "the village will remember that"],
  5: ["FIVE DOWN", "the peasants are starting to talk"],
  10: ["TEN PEASANTS LOST", "the king is concerned"],
  25: ["TWENTY-FIVE", "the village council demands answers"],
  50: ["FIFTY", "you monster"],
  100: ["ONE HUNDRED", "the peasants are forming a union"],
  200: ["TWO HUNDRED", "there is a museum about you now"],
  500: ["FIVE HUNDRED", "history will not be kind"],
  1000: ["ONE THOUSAND", "the gods have taken notice. they are impressed"]
};

/* -------------------------------------------------------------------
   SPRITES. letters are palette slots: h hat, H hat trim, s skin, e eye,
   c shirt, C belt, p trousers, f shoes, m mouth, w white. rows 0-2 are
   the hat, rows 3-8 the rest. drawn facing right; mirrored for left.
   ------------------------------------------------------------------- */
var P_KEY = { h: 0, H: 1, s: 2, e: 3, c: 4, C: 5, p: 6, f: 7, m: 8, w: 9 };
function pParse(rows, y0) {
  var out = [];
  for (var r = 0; r < rows.length; r++) for (var c = 0; c < rows[r].length; c++) {
    var ch = rows[r][c];
    if (ch !== ".") out.push(c, r + y0, P_KEY[ch]);
  }
  return new Int8Array(out);
}
var P_HATS = [
  /* name,  weight, rows, colours, title */
  { w: 22, rows: [".....", ".hhh.", ".hhhH"], cols: ["#7a4a22", "#2f5a2a", "#a8322a", "#2a4a8a", "#6a3a8a", "#6a6a6a"] },   /* cap */
  { w: 16, rows: ["..h..", ".hhh.", "hhhhh"], cols: ["#5a4a3a", "#3a5a3a", "#7a2a2a", "#4a4a6a"] },                         /* hood */
  { w: 16, rows: [".....", ".hhh.", "HhhhH"], cols: ["#d8b860"], trim: "#a88838" },                                           /* straw */
  { w: 22, rows: [".....", ".hhh.", "hhhh."], cols: ["#4a2a12", "#1a1a1a", "#e0c050", "#c8642a", "#b0b0b0"] },             /* hair */
  { w: 8, rows: [".....", ".....", ".sss."], cols: ["#000000"] },                                                           /* bald */
  { w: 6, rows: [".hhh.", ".HHH.", "hhhhh"], cols: ["#1a1a1a"], trim: "#a8322a", title: "SIR " },                             /* top hat */
  { w: 3, rows: [".....", "h.h.h", "hHhHh"], cols: ["#ffd040"], trim: "#e83a4a", title: "KING " }                             /* crown */
];
P_HATS.forEach(function (h) { h.spr = pParse(h.rows, 0); });
var P_BODY = {
  stand:  pParse([".sse.", ".sss.", "scccs", ".cCc.", ".p.p.", ".f.f."], 3),
  walkA:  pParse([".sse.", ".sss.", "scccs", ".cCc.", ".p.p.", "f...f"], 3),
  walkB:  pParse([".sse.", ".sss.", ".ccc.", "scCcs", "..p..", "..ff."], 3),
  panicA: pParse(["ssses", "sssms", ".ccc.", ".cCc.", ".p.p.", "f...f"], 3),
  panicB: pParse(["ssses", "sssms", ".ccc.", ".cCc.", "..p..", "..ff."], 3)
};
var P_GHOST = pParse([".www.", "wwwww", "wewew", "wwwww", "wwwww", "w.w.w"], 0);
var P_SKINS = ["#f1c7a0", "#e0a878", "#c68650", "#8d5a34", "#5e3a22"];
var P_SHIRTS = ["#c84a3a", "#3a7ac8", "#4aa84a", "#d8c048", "#a85ac8", "#e08a3a", "#f0f0e0", "#4a8a8a", "#d86a9a"];
var P_PANTS = ["#4a3a2a", "#3a3a4a", "#5a4a30", "#2a3a5a"];
function pPal(list) { var p = new Uint32Array(10); for (var k = 0; k < 10; k++) p[k] = hex32(list[k]); return p; }
var P_XRAY = pPal(["#111111", "#111111", "#f8f8f0", "#000000", "#111111", "#f8f8f0", "#f8f8f0", "#f8f8f0", "#000000", "#ffffff"]);
var P_CHAR = pPal(["#2a2622", "#1e1a18", "#3a3430", "#ffffff", "#2e2a26", "#1e1a18", "#26221e", "#1a1614", "#ff6040", "#ffffff"]);
var P_FIRE = SAND_PAL[MAT.FIRE];
var P_SKIN32 = hex32("#f1c7a0");
var P_WHITE = hex32("#f4f8ff"), P_GHOSTEYE = hex32("#202a40"), P_FROST = hex32("#cfeaff");

/* -------------------------------------------------------------------
   THE WORLD, AS A PEASANT SEES IT
   ------------------------------------------------------------------- */
function pCell(g, x, y) {
  if (x < 0 || x >= g.gw || y < 0) return 0;
  if (y >= g.gh) return MAT.STONE;   /* the bottom of the world is a floor */
  return g.m[y * g.gw + x];
}
function pSolid(g, x, y) { return SOLID[pCell(g, x, y)] === 1; }
/* is there something to stand on, under feet at row y */
function pGround(g, x, y) { return pSolid(g, x, y + 1) || pSolid(g, x - 1, y + 1) || pSolid(g, x + 1, y + 1); }
/* could a peasant with its feet here stand up straight */
function pRoom(g, x, y) { return !pSolid(g, x, y) && !pSolid(g, x, y - 3) && !pSolid(g, x, y - 6) && !pSolid(g, x, y - 8); }
function pBlocked(g, x, y) { var fx = Math.floor(x), fy = Math.floor(y); return pSolid(g, fx, fy) || pSolid(g, fx, fy - 4) || pSolid(g, fx, fy - 7); }

function peasantAt(g, x, y, pad) {
  pad = pad || 0;
  var P = g.peasants, best = null, bd = 1e9;
  for (var k = 0; k < P.length; k++) {
    var p = P[k];
    if (p.dead || p.state === "space") continue;
    var dx = Math.abs(x - p.x), dy = y - (p.y - 4);
    if (dx < 2.5 + pad && Math.abs(dy) < 5 + pad) {
      var d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = p; }
    }
  }
  return best;
}

/* -------------------------------------------------------------------
   BIRTH, SPEECH, DEATH
   ------------------------------------------------------------------- */
function pWeighted(list) {
  var tot = 0, k; for (k = 0; k < list.length; k++) tot += list[k].w;
  var r = Math.random() * tot;
  for (k = 0; k < list.length; k++) { r -= list[k].w; if (r < 0) return list[k]; }
  return list[0];
}
function peasantSpawn(g, x, y, quiet) {
  if (g.peasants.length >= P_MAX) { if (!quiet) { feed(g, "the village is full. it is a small village", "#ffd94a"); achieve(g, "full"); } return null; }
  var hat = pWeighted(P_HATS);
  /* there is only ever one king */
  while (hat === P_HATS[6] && pKing(g)) hat = pWeighted(P_HATS);
  var hc = pick(hat.cols), skin = pick(P_SKINS);
  var short = pick(P_NAMES), name = (hat.title || "") + short + (Math.random() < 0.08 ? pick(P_SUFFIX) : "");
  var cols = [hc, hat.trim || hexDarken(hc), skin, "#101010", pick(P_SHIRTS), "#3a2a1a", pick(P_PANTS), "#2a1a10", "#401010", "#ffffff"];
  if (hat === P_HATS[4]) cols[0] = skin;
  var p = {
    id: ++g.pid, name: name, short: short, x: x, y: y, vx: 0, vy: 0, dir: Math.random() < 0.5 ? -1 : 1,
    state: "walk", stun: 0, idle: 0, panic: 0, fire: 0, lava: 0, acid: 0, breath: P_BREATH, cold: 0, warm: 0,
    charred: 0, zap: 0, falling: false, fallY: y, anim: irnd(100), spin: 0, buried: 0, flyT: 0, immune: 0,
    say: "", sayT: 0, chat: 120 + irnd(900), voice: 170 + Math.random() * 280,
    hat: hat, pal: pPal(cols), dead: 0, spaceT: 0, fromSpace: 0
  };
  g.peasants.push(p);
  if (!quiet) { pSay(g, p, "spawn", true); g.fx.pop++; }
  g.hadPeasants = true;
  return p;
}
function pKing(g) {
  for (var k = 0; k < g.peasants.length; k++) if (g.peasants[k].hat === P_HATS[6] && !g.peasants[k].dead) return g.peasants[k];
  return null;
}
/* what a factory remembers about the peasant that touched it: enough to make more */
function pRecipe(p) { return { short: p.short, hat: p.hat, pal: p.pal.slice(), voice: p.voice }; }
/* a copy of somebody, from a peasant factory */
function peasantClone(g, src, x, y) {
  var p = peasantSpawn(g, x, y, true);
  if (!p) return null;
  g.cloneN[src.short] = (g.cloneN[src.short] || 1) + 1;
  p.voice = src.voice * (0.95 + Math.random() * 0.1);
  p.short = src.short; p.name = src.short + " #" + g.cloneN[src.short];
  if (src.hat !== P_HATS[6]) { p.hat = src.hat; p.pal = src.pal.slice(); }
  else { var hp = p.pal; p.pal = src.pal.slice(); p.pal[0] = hp[0]; p.pal[1] = hp[1]; p.name = "FAKE KING " + p.short; }
  return p;
}
function hexDarken(h) { var c = hexRGB(h); return "#" + c.map(function (v) { return ("0" + Math.round(v * 0.6).toString(16)).slice(-2); }).join(""); }

function pOther(g, p, near) {
  var P = g.peasants, best = null, bd = near * near;
  for (var k = 0; k < P.length; k++) {
    var q = P[k];
    if (q === p || q.dead || q.state === "space") continue;
    var d = (q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y);
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}
function pTalking(g) {
  var n = 0, P = g.peasants;
  for (var k = 0; k < P.length; k++) if (P[k].sayT > 0) n++;
  return n;
}
function pTitle(name) { return name.charAt(0) + name.slice(1).toLowerCase(); }
/* say a random line from a list. force: interrupt whatever they were saying */
function pSay(g, p, kind, force, other) {
  if (p.dead) return;
  if (!force && (p.sayT > 0 || pTalking(g) >= 6)) return;
  var s = pick(P_SAY[kind] || [kind]);
  if (s.indexOf("{n}") >= 0) {
    var o = other || pOther(g, p, 400);
    if (!o) return;
    var on = o.short;
    s = s.replace("{n}", s === s.toUpperCase() ? on : pTitle(on));
  }
  p.say = s; p.sayT = 90 + s.length * 3;
  if (g.t - (g.sTalk || 0) > 0.12) {
    g.sTalk = g.t;
    if (/AAA|WAAA|HOT HOT|FIRE!|IT BURNS|MUMMY/.test(s)) SFX.scream(p.voice, 0.6 + Math.random() * 0.3);
    else SFX.babble(p.voice, clamp(Math.ceil(s.length / 4), 2, 7));
  }
}

function feed(g, text, col, key) {
  /* a line with a key replaces the last line with the same key, instead of stacking */
  if (key) for (var k = 0; k < g.feed.length; k++) if (g.feed[k].key === key) { g.feed.splice(k, 1); break; }
  g.feed.push({ text: text, col: col || "#c8d0dc", t: 0, key: key });
  if (g.feed.length > 6) g.feed.shift();
}
function banner(g, title, sub) {
  if (g.banners.length < 4) g.banners.push({ title: title, sub: sub, t: 0 });
  g.fx.fanfare++;
}
/* one-off discoveries, once per visit */
var P_ACHIEVE = {
  space: ["ONE SMALL STEP", "for a peasant. one giant leap for peasantkind"],
  strike: ["STRIKE!", "peasant bowling is now a recognised sport"],
  factory: ["PEASANT FACTORY", "this seems ethically questionable"],
  nuke: ["BIG BADA BOOM", "the neighbours have complained"],
  shock: ["SHOCKING", "electricity and ponds: a cautionary tale"],
  full: ["OVERPOPULATION", "the housing market is in shambles"],
  bloom: ["SPRING HAS SPRUNG", "the peasants approve"],
  leave: ["YEET", "a peasant has left the village. by air"],
  roast: ["A BARBECUE", "three peasants on fire at once. a village record"]
};
function achieve(g, k) {
  if (g.got[k]) return;
  g.got[k] = 1;
  banner(g, P_ACHIEVE[k][0], P_ACHIEVE[k][1]);
}

function pDie(g, p, cause) {
  if (p.dead) return;
  p.dead = 1;
  if (cause === "splat" && p.fromSpace > 0) cause = "reentry";
  g.rip++;
  feed(g, pick(P_DEATH[cause]).replace("{n}", p.name), "#ff9a8a");
  var talking = 0;
  for (k = 0; k < g.ghosts.length; k++) if (g.ghosts[k].say && g.ghosts[k].t < 170) talking++;
  var gl = (talking < 2 && Math.random() < 0.5) ? pick(P_SAY.ghost) : "";
  g.ghosts.push({ x: p.x, y: p.y - 4, t: 0, dir: p.dir, say: gl });
  var fx = Math.floor(p.x), fy = Math.floor(p.y), gw = g.gw, k, j, x, y;
  /* what is left */
  if (cause === "fire" || cause === "zap" || cause === "reentry") {
    for (k = 0; k < 10; k++) {
      x = fx + irnd(5) - 2; y = fy - irnd(6);
      if (x >= 0 && x < gw && y >= 0 && y < g.gh && g.m[y * gw + x] === MAT.EMPTY) sandSet(g, y * gw + x, k < 6 ? MAT.ASH : MAT.FIRE);
    }
  } else if ((cause === "fall" || cause === "splat" || cause === "buried") && pGround(g, fx, fy)) {
    /* a little headstone, where they landed */
    var stone = [[0, -2], [-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0]];
    for (k = 0; k < stone.length; k++) {
      x = fx + stone[k][0]; y = fy + stone[k][1];
      if (x >= 0 && x < gw && y >= 0 && y < g.gh && AIRY[g.m[y * gw + x]]) { j = y * gw + x; sandSet(g, j, MAT.STONE); g.sh[j] = 40; }
    }
  } else if (cause === "nuke") {
    sparks(g, p.x, p.y - 4, 12, 1, [P_WHITE], 10, 0.5);
  } else if (cause === "freeze") {
    /* an ice statue of them, where they stood */
    for (y = fy - 8; y <= fy; y++) for (x = fx - 1; x <= fx + 1; x++) {
      if ((y === fy - 8 || y === fy - 3) && x !== fx) continue;
      if (x >= 0 && x < gw && y >= 0 && y < g.gh && AIRY[g.m[y * gw + x]]) { j = y * gw + x; sandSet(g, j, MAT.ICE); g.T[j] = -20; }
    }
  }
  if (cause !== "nuke" && cause !== "freeze") sparks(g, p.x, p.y - 4, 8, 0.8, [p.pal[4], p.pal[0]], 12, 0.6);
  g.fx.die++;
  /* somebody nearby has feelings about it */
  var o = pOther(g, p, 80);
  if (o && Math.random() < 0.7) pSay(g, o, "mourn", true, p);
  var ms = P_MILESTONES[g.rip];
  if (ms) banner(g, ms[0], ms[1]);
  pSucceed(g, p, "THE KING IS DEAD");
}
/* the king is gone. long live the king */
function pSucceed(g, p, title) {
  if (p.hat !== P_HATS[6]) return;
  var heir = pOther(g, p, 9999);
  if (heir) {
    heir.hat = P_HATS[6]; heir.pal[0] = hex32("#ffd040"); heir.pal[1] = hex32("#e83a4a");
    heir.name = "KING " + heir.short;
    banner(g, title, "long live " + heir.name);
    pSay(g, heir, "crowned", true);
  } else banner(g, title, "and there is nobody left to be king");
}

/* -------------------------------------------------------------------
   THINGS THAT HAPPEN TO PEASANTS
   ------------------------------------------------------------------- */
function pIgnite(g, p) {
  if (p.fire || p.dead) return;
  p.fire = 1; p.idle = 0;
  pSay(g, p, "fire", true);
}
function pZap(g, p) {
  if (p.zap > 0 || p.dead) return;
  if (p.charred && Math.random() < 0.6) { pDie(g, p, "zap"); return; }
  p.zap = 48; p.charred = 1; p.stun = Math.max(p.stun, 50); p.idle = 0;
  if (Math.random() < 0.3) pIgnite(g, p);
  else pSay(g, p, "zap", true);
  g.fx.zap++;
}
function peasantsZapNear(g, x, y, r) {
  var P = g.peasants;
  for (var k = 0; k < P.length; k++) {
    var p = P[k];
    if (p.dead || p.state === "space") continue;
    var dx = p.x - x, dy = (p.y - 4) - y;
    if (dx * dx + dy * dy < (r + 4) * (r + 4)) pZap(g, p);
  }
}
function peasantsZapMarked(g) {
  var P = g.peasants, gw = g.gw, n = 0;
  for (var k = 0; k < P.length; k++) {
    var p = P[k], fx = Math.floor(p.x), fy = Math.floor(p.y);
    if (p.dead || p.state === "space" || fx < 0 || fx >= gw) continue;
    for (var dy = 0; dy <= 8; dy += 2) {
      var y = fy - dy;
      if (y >= 0 && y < g.gh && g.zmark[y * gw + fx]) { pZap(g, p); n++; break; }
    }
  }
  if (n >= 3) achieve(g, "shock");
}
/* an explosion: close ones are thrown, very close ones to a big one are gone, far ones panic */
function peasantsBlast(g, cx, cy, R, P) {
  var L = g.peasants, reach = R * 2.4, big = R >= 12;
  for (var k = 0; k < L.length; k++) {
    var p = L[k];
    if (p.dead || p.state === "space") continue;
    var dx = p.x - cx, dy = (p.y - 4) - cy, d = Math.sqrt(dx * dx + dy * dy) || 0.5;
    if (big && d < R * 0.55) { pDie(g, p, "nuke"); continue; }
    if (d < reach) {
      var f = P * (1 - d / reach) * 1.2 + 0.3;
      if (p.state === "held") continue;
      p.vx = clamp(p.vx + dx / d * f, -4.5, 4.5);
      p.vy = clamp(p.vy + dy / d * f - f * 0.7, -4.5, 4.5);
      if (p.state !== "fly") { p.state = "fly"; p.flyT = 0; p.immune = 3; p.fallY = p.y; }
      if (d < R * 1.3 && Math.random() < (big ? 0.8 : 0.35)) pIgnite(g, p);
      else if (p.sayT <= 0 || Math.random() < 0.3) pSay(g, p, "thrown", true);
    } else if (d < (big ? 400 : R * 10)) {
      p.panic = Math.max(p.panic, big ? 240 : 90); p.idle = 0;
      p.dir = dx < 0 ? -1 : 1;   /* away from it */
      if (Math.random() < (big ? 0.6 : 0.08)) pSay(g, p, big ? "nuke" : "panic", big);
    }
  }
}
function peasantsReact(g, kind, x, y) {
  var L = g.peasants;
  for (var k = 0; k < L.length; k++) {
    var p = L[k];
    if (p.dead || p.state !== "walk" || p.fire) continue;
    var dx = p.x - x, dy = p.y - y, d2 = dx * dx + dy * dy;
    if (kind === "firework" && d2 < 160 * 160 && Math.random() < 0.35) { pSay(g, p, "ooh"); if (pGround(g, Math.floor(p.x), Math.floor(p.y)) && Math.random() < 0.5) p.vy = -0.9; }
    else if (kind === "flower" && d2 < 40 * 40 && Math.random() < 0.6) pSay(g, p, "flower");
  }
}

/* -------------------------------------------------------------------
   THE PEASANT, ONE TICK AT A TIME
   ------------------------------------------------------------------- */
function peasantsStep(g) {
  var L = g.peasants, k, p, q;
  for (k = 0; k < L.length; k++) if (!L[k].dead) pStep(g, L[k]);
  /* fire is contagious; neighbours say hello */
  if ((g.tick & 3) === 0) {
    for (k = 0; k < L.length; k++) {
      p = L[k];
      if (p.dead || p.state === "space") continue;
      for (var j = k + 1; j < L.length; j++) {
        q = L[j];
        if (q.dead || q.state === "space") continue;
        if (Math.abs(p.x - q.x) < 3 && Math.abs(p.y - q.y) < 7) {
          if (p.fire && !q.fire && Math.random() < 0.25) pIgnite(g, q);
          else if (q.fire && !p.fire && Math.random() < 0.25) pIgnite(g, p);
          else if (!p.fire && !q.fire && p.dir !== q.dir && p.state === "walk" && Math.random() < 0.05) pSay(g, p, "greet", false, q);
        }
      }
    }
  }
  /* bowling: a peasant flying fast knocks over whoever it hits */
  var burning = 0;
  for (k = 0; k < L.length; k++) {
    p = L[k];
    if (p.fire && !p.dead) burning++;
    if (p.dead || p.state !== "fly" || p.vx * p.vx + p.vy * p.vy < 2) continue;
    for (var j2 = 0; j2 < L.length; j2++) {
      q = L[j2];
      if (q === p || q.dead || q.state === "fly" || q.state === "held" || q.state === "space") continue;
      if (Math.abs(p.x - q.x) < 3 && Math.abs(p.y - q.y) < 7) {
        q.state = "fly"; q.flyT = 0; q.immune = 6; q.fallY = q.y;
        q.vx = p.vx * 0.8 + (q.x - p.x) * 0.1; q.vy = Math.min(p.vy, 0) - 1.2;
        p.vx *= 0.6;
        if (p.fire && Math.random() < 0.5) pIgnite(g, q);
        pSay(g, q, Math.random() < 0.5 ? "oof" : "thrown", true);
        g.fx.thud++;
        p.pins = (p.pins || 0) + 1;
        if (p.pins >= 2) feed(g, (["", "", "DOUBLE!", "TRIPLE!", "QUADRUPLE!"][p.pins] || "PEASANT AVALANCHE!") + "  " + p.name + " knocked over " + p.pins, "#ffd94a", "bowl" + p.id);
        if (p.pins >= 3) achieve(g, "strike");
      }
    }
  }
  if (burning >= 3) achieve(g, "roast");
  for (k = L.length - 1; k >= 0; k--) if (L[k].dead) L.splice(k, 1);
  if (g.hadPeasants && !L.length && !g.emptyNoted) { g.emptyNoted = true; banner(g, "THE VILLAGE IS EMPTY", "press V and click for more. you monster"); }
  if (L.length) g.emptyNoted = false;
  /* ghosts drift up and away */
  for (k = g.ghosts.length - 1; k >= 0; k--) {
    var gh = g.ghosts[k];
    gh.t++; gh.y -= 0.14; gh.x += Math.sin(gh.t * 0.08) * 0.15;
    if (gh.t === 20) g.fx.ghost++;
    if (gh.t > 220 || gh.y < -10) g.ghosts.splice(k, 1);
  }
}

function pStep(g, p) {
  if (p.sayT > 0) p.sayT--;
  if (p.zap > 0) p.zap--;
  if (p.immune > 0) p.immune--;
  if (p.fromSpace > 0) p.fromSpace--;
  p.anim++;
  if (p.state === "held") { pHeld(g, p); return; }
  if (p.state === "space") {
    if (--p.spaceT <= 0) {
      p.state = "fly"; p.x = 10 + Math.random() * (g.gw - 20); p.y = -12; p.vx = Math.random() - 0.5; p.vy = 1.5;
      p.fromSpace = 240; p.flyT = 0;
      feed(g, p.name + " is back from space", "#9ad0ff");
      pSay(g, p, "space", true);
    }
    return;
  }
  var fx = Math.floor(p.x), fy = Math.floor(p.y), m = g.m, gw = g.gw, j;
  var cf = pCell(g, fx, fy), cm = pCell(g, fx, fy - 4), ch = pCell(g, fx, fy - 7), cb = pCell(g, fx, fy + 1);

  /* the dangers of the world, in order of how quickly they ruin your day */
  if (cf === MAT.DRAIN || cb === MAT.DRAIN || pCell(g, fx - 1, fy + 1) === MAT.DRAIN || pCell(g, fx + 1, fy + 1) === MAT.DRAIN) { pDie(g, p, "drain"); return; }
  if (cf === MAT.LAVA || cm === MAT.LAVA || cb === MAT.LAVA) {
    pIgnite(g, p);
    if (++p.lava > 30) { pDie(g, p, "lava"); return; }
  } else if (HOT[cf] || HOT[cm] || HOT[ch]) pIgnite(g, p);
  if (pHeat(g, p, fx, fy)) return;
  if (cf === MAT.ACID || cm === MAT.ACID || ch === MAT.ACID || cb === MAT.ACID) {
    if (p.acid < 1 || Math.random() < 0.01) pSay(g, p, "acid", p.acid < 1);
    p.acid += 1;
    if (p.acid > 110) { pDie(g, p, "acid"); return; }
    if (Math.random() < 0.06) { j = (fy - irnd(5)) * gw + fx; if (j >= 0 && j < m.length && m[j] === MAT.ACID) m[j] = MAT.EMPTY; }
  } else if (p.acid > 0) p.acid = Math.max(0, p.acid - 0.3);
  var liquid = LIQUID[cm] || LIQUID[cf], sub = LIQUID[ch] && ch !== MAT.LAVA;
  if (p.fire && (WET[cm] || WET[cf] || WET[ch] || WET[cb])) {
    p.fire = 0; g.fx.hiss++;
    pSay(g, p, "phew", true);
    sparks(g, p.x, p.y - 8, 6, 0.4, [hex32("#c0d0e0")], 14, 0.6);
  }
  if ((cm === MAT.SMOKE || ch === MAT.SMOKE) && p.sayT <= 0 && Math.random() < 0.03) pSay(g, p, "cough");
  if (sub) {
    if (--p.breath <= 0) { pDie(g, p, "drown"); return; }
    if (p.breath % 70 === 0) pSay(g, p, "swim", true);
    if (Math.random() < 0.04) partAdd(g, PK_SPARK, p.x + 0.5, p.y - 8, 0, -0.3, 20, hex32("#a8d8ff"));
  } else p.breath = Math.min(P_BREATH, p.breath + 3);
  if (p.fire) {
    p.fire++;
    if (p.fire % 55 === 0) pSay(g, p, "fire", true);
    if (Math.random() < 0.3) {
      var ex = fx + irnd(3) - 1, ey = fy - 9;
      if (ex >= 0 && ex < gw && ey >= 0) { j = ey * gw + ex; if (m[j] === MAT.EMPTY) sandSet(g, j, MAT.FIRE); }
    }
    if (Math.random() < 0.25) partAdd(g, PK_SPARK, p.x + Math.random() * 3 - 1, p.y - 6 - Math.random() * 3, (Math.random() - 0.5) * 0.3, -0.5, 8 + irnd(10), pick(SPARK_HOT));
    if (p.fire > 300) { pDie(g, p, "fire"); return; }
  }
  if (p.state === "fly") { pFly(g, p); return; }

  /* buried in something: climb out the top, if there is a top */
  if (SOLID[cf]) {
    var above = pCell(g, fx, fy - 9);
    if (!SOLID[above]) { p.y = fy - 1; p.buried = 0; }
    else if (!P_HARD[above] && (p.anim % 3) === 0) { p.y = fy - 1; if (++p.buried === 40) pSay(g, p, "buried", true); }
    else {
      if (++p.buried === 40) pSay(g, p, "buried", true);
      if (p.buried > 260) pDie(g, p, cf === MAT.ICE || above === MAT.ICE ? "freeze" : "buried");
    }
    return;
  }
  p.buried = 0;
  /* a hop (for fireworks) */
  if (p.vy < 0) {
    if (pSolid(g, fx, Math.floor(p.y + p.vy) - 9)) p.vy = 0;
    else { p.y += p.vy; p.vy += 0.09; if (p.vy < 0) return; p.falling = true; p.fallY = p.y; }
  }
  var ground = pGround(g, fx, fy);
  if (liquid && !ground) { pSwim(g, p, sub); return; }
  if (!ground) { pFall(g, p); return; }
  if (p.falling) pLand(g, p);
  p.vy = 0; p.fallY = p.y;
  pWalk(g, p, liquid);
}

/* how warm it is where they are standing, and what they do about it. true if it killed them */
function pHeat(g, p, fx, fy) {
  if (fx < 0 || fx >= g.gw) return false;
  var T = g.T, gw = g.gw, gh = g.gh, hi = -1e9, lo = 1e9, t, k, y;
  for (k = 0; k < 3; k++) {
    y = fy - (k === 0 ? 0 : (k === 1 ? 4 : 7));
    if (y < 0 || y >= gh) continue;
    t = T[y * gw + fx];
    if (t > hi) hi = t;
    if (t < lo) lo = t;
  }
  if (hi === -1e9) return false;
  var feet = fy + 1 < gh && p.state !== "fly" ? T[(fy + 1) * gw + fx] : AMBIENT;
  /* standing on something very cold chills you too, if more slowly than being in it */
  if (feet < AMBIENT) lo = Math.min(lo, AMBIENT + (feet - AMBIENT) * 0.5);
  /* too hot */
  if (hi > P_IGNITE || feet > P_IGNITE + 120) pIgnite(g, p);
  else if (!p.fire && (hi > P_SCALD || (feet > P_SCALD && SOLID[g.m[(fy + 1) * gw + fx]]))) {
    p.panic = Math.max(p.panic, 30); p.idle = 0;
    if (p.sayT <= 0 && Math.random() < 0.05) pSay(g, p, "scald", true);
    /* hot ground: a little hop, as you would */
    if (feet > P_SCALD && p.state === "walk" && p.vy >= 0 && Math.random() < 0.08) p.vy = -0.7;
  } else if (!p.fire && hi > P_SWEAT) {
    if (++p.warm > 120 && p.sayT <= 0 && Math.random() < 0.01) pSay(g, p, "hot");
  } else p.warm = 0;
  /* too cold. a fire nearby, or warm air, thaws them out again */
  if (lo < P_CHILL && !p.fire) {
    p.cold += Math.min(6, (P_CHILL - lo) / 12);
    if (p.cold > 90 && p.sayT <= 0 && Math.random() < 0.012) pSay(g, p, "cold", true);
    if (p.cold > P_FREEZE) { pDie(g, p, "freeze"); return true; }
  } else if (p.cold > 0) p.cold = Math.max(0, p.cold - (hi > 30 || p.fire ? 4 : 0.6));
  return false;
}

function pHeld(g, p) {
  p.x = clamp((g.mx - PANEL) / CELL, 1, g.gw - 2);
  p.y = clamp((g.my - PLAY_Y) / CELL + 8, 9, g.gh - 1);
  p.vx = g.cvx; p.vy = g.cvy; p.spin = 0; p.falling = false; p.fallY = p.y;
  p.idle = 0; p.stun = 0;
  if (p.sayT <= 0 && Math.random() < 0.02) pSay(g, p, "grab");
}
function peasantGrab(g, p, fresh) {
  p.state = "held"; g.held = p;
  if (!fresh || p.sayT <= 0) pSay(g, p, "grab", true);
}
function peasantThrow(g, p) {
  g.held = null;
  if (p.dead) return;
  /* where the hand actually let go, and how fast it was going */
  pHeld(g, p);
  var v = cursorVel(g);
  p.state = "fly"; p.flyT = 0; p.immune = 4; p.fallY = p.y;
  p.vx = clamp(v[0], -4.5, 4.5); p.vy = clamp(v[1], -4.5, 4.5);
  if (Math.abs(p.vx) + Math.abs(p.vy) > 1.5) { pSay(g, p, "thrown", true); g.fx.whee++; }
}

function pFall(g, p) {
  if (!p.falling) { p.falling = true; p.fallY = p.y; p.vy = 0; }
  p.vy = Math.min(p.vy + 0.09, 3);
  var fx = Math.floor(p.x), target = p.y + p.vy, cy = Math.floor(p.y);
  while (cy < Math.floor(target) && !pGround(g, fx, cy)) cy++;
  if (pGround(g, fx, cy) && cy <= target) { p.y = cy; pLand(g, p); }
  else p.y = target;
  if (p.y - p.fallY > 30 && p.sayT <= 0) pSay(g, p, "fall", true);
}
function pLand(g, p) {
  var drop = p.y - p.fallY;
  p.falling = false; p.vy = 0; p.fallY = p.y;
  if (drop > 85 && !p.immune) { pDie(g, p, p.fromSpace ? "reentry" : "fall"); return; }
  if (drop > 34) { p.stun = 70; pSay(g, p, "oof", true); g.fx.thud++; g.shake = Math.min(6, g.shake + 1); }
}
function pSwim(g, p, sub) {
  p.falling = false; p.fallY = p.y;
  p.vy += 0.02;
  /* salt water holds you up. you can float in it, like in the dead sea */
  if (pCell(g, Math.floor(p.x), Math.floor(p.y) - 4) === MAT.SALTWATER) {
    p.vy -= 0.05;
    if (p.sayT <= 0 && Math.random() < 0.004) pSay(g, p, "float");
  }
  if (Math.random() < 0.07) p.vy -= 0.32;   /* flailing */
  p.vy = clamp(p.vy, -0.5, 0.3);
  if (!sub && p.vy < 0) p.vy *= 0.3;     /* at the surface: bob */
  var fx = Math.floor(p.x), ny = p.y + p.vy;
  if (p.vy < 0 && pSolid(g, fx, Math.floor(ny) - 8)) p.vy = 0;
  else if (p.vy > 0 && pGround(g, fx, Math.floor(p.y))) p.vy = 0;
  else p.y = ny;
  pStepX(g, p, 0.09);
  if (p.sayT <= 0 && Math.random() < 0.01) pSay(g, p, "swim");
}
function pFly(g, p) {
  var gw = g.gw, n, s, nx, ny, spd, hx, vt;
  p.flyT++;
  p.vy += 0.1; p.vx *= 0.995;
  var wet = pCell(g, Math.floor(p.x), Math.floor(p.y) - 2);
  if (LIQUID[wet]) {
    if (!p.wet && p.vy > 0.8) {
      var sc = SAND_DEEP[wet] ? SAND_DEEP[wet][16 * 256] : SAND_PAL[wet][0];
      for (var k = 0; k < 16; k++) partAdd(g, PK_DEBRIS, p.x + Math.random() * 4 - 2, p.y - 4, (Math.random() - 0.5) * 1.6, -0.8 - Math.random() * p.vy * 0.5, 60, sc, wet === MAT.LAVA ? MAT.FIRE : wet);
      g.fx.splash++;
    }
    p.wet = 1; p.vx *= 0.85; p.vy *= 0.85;
  } else p.wet = 0;
  spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
  if (spd > 5) { p.vx *= 5 / spd; p.vy *= 5 / spd; spd = 5; }
  p.spin += (p.vx >= 0 ? 1 : -1) * (0.05 + spd * 0.07);
  if (pBlocked(g, p.x, p.y)) { p.state = "walk"; p.spin = 0; return; }   /* started inside something */
  n = Math.ceil(spd * 2) || 1;
  for (s = 0; s < n; s++) {
    nx = p.x + p.vx / n; ny = p.y + p.vy / n;
    if (nx < -4 || nx > gw + 4 || ny > g.gh + 12) { pLeave(g, p); return; }
    if (ny < -40) { pSpace(g, p); return; }
    if (!pBlocked(g, nx, ny)) { p.x = nx; p.y = ny; continue; }
    hx = pBlocked(g, nx, p.y); vt = pBlocked(g, p.x, ny);
    if (spd > 3.7 && !p.immune) { pDie(g, p, p.fromSpace ? "reentry" : "splat"); g.fx.splat++; g.shake = Math.min(8, g.shake + 2); return; }
    if (spd > 2) { g.fx.thud++; if (p.sayT <= 0 || Math.random() < 0.3) pSay(g, p, "oof", true); }
    if (vt || !hx) { p.vy = -p.vy * 0.3; p.vx *= 0.7; }
    if (hx || !vt) { p.vx = -p.vx * 0.4; }
    break;
  }
  var fx = Math.floor(p.x), fy = Math.floor(p.y);
  var onGround = pGround(g, fx, fy);
  if (onGround && Math.abs(p.vy) < 0.6) { p.vx *= 0.8; p.vy = 0; }
  if (p.flyT > 900 && (p.x < 0 || p.x >= gw)) { pLeave(g, p); return; }
  if ((onGround && Math.abs(p.vx) < 0.3 && Math.abs(p.vy) < 0.6) || p.flyT > 900) {
    p.state = "walk"; p.spin = 0; p.falling = false; p.fallY = p.y; p.vx = p.vy = 0;
    p.stun = 60; p.pins = 0;
    if (Math.random() < 0.7) pSay(g, p, "dizzy", true);
  }
}
function pSpace(g, p) {
  p.state = "space"; p.spaceT = 200 + irnd(300);
  feed(g, p.name + " has gone to space", "#9ad0ff");
  g.astronauts++;
  achieve(g, "space");
}
function pLeave(g, p) {
  p.dead = 1;
  feed(g, p.name + " left the village. by air", "#c8d0dc");
  pSucceed(g, p, "THE KING HAS ABDICATED. AT SPEED");
  achieve(g, "leave");
}

/* too hot to walk into */
function pHotAt(g, x, y) { return x >= 0 && y >= 0 && x < g.gw && y < g.gh && g.T[y * g.gw + x] > P_SCALD; }

/* walking. a few cells of step up, a couple of step down, turn at walls */
function pStepX(g, p, sp) {
  var nx = p.x + p.dir * sp, nfx = Math.floor(nx), fx = Math.floor(p.x), fy = Math.floor(p.y), k;
  if (nx < 1 || nx > g.gw - 1) { p.dir = -p.dir; return false; }
  if (nfx !== fx) {
    for (k = 0; k <= 3; k++) if (pRoom(g, nfx, fy - k)) break;
    if (k > 3) { p.dir = -p.dir; return false; }
    fy -= k;
    if (!pGround(g, nfx, fy)) for (k = 1; k <= 2; k++) if (pGround(g, nfx, fy + k) && pRoom(g, nfx, fy + k)) { fy += k; break; }
    p.y = fy;
  }
  p.x = nx;
  return true;
}
function pWalk(g, p, wading) {
  if (p.stun > 0) { p.stun--; return; }
  var fx = Math.floor(p.x), fy = Math.floor(p.y), scared = p.fire || p.panic > 0;
  if (p.panic > 0) p.panic--;
  if (p.idle > 0 && !scared) { p.idle--; if (Math.random() < 0.008) p.dir = -p.dir; }
  else {
    /* look where you are going */
    if (!p.fire) {
      var ax = fx + p.dir * 4, a0 = pCell(g, ax, fy), a1 = pCell(g, ax, fy - 3), a2 = pCell(g, ax, fy + 1), a3 = pCell(g, ax, fy - 7);
      if (HOT[a0] || HOT[a1] || HOT[a2] || HOT[a3] || a2 === MAT.ACID || a0 === MAT.ACID || pHotAt(g, ax, fy + 1) || pHotAt(g, ax, fy - 3)) {
        p.dir = -p.dir; p.panic = Math.max(p.panic, 50);
        if (Math.random() < 0.3) pSay(g, p, "nope");
      } else if (!wading && (LIQUID[pCell(g, fx + p.dir * 3, fy + 1)] || LIQUID[pCell(g, fx + p.dir * 3, fy)] || LIQUID[pCell(g, fx + p.dir * 3, fy - 2)]) &&
                 !LIQUID[pCell(g, fx, fy + 1)] && Math.random() < 0.95) {
        p.dir = -p.dir;
        if (Math.random() < 0.2) pSay(g, p, "wet");
      }
    } else if ((p.anim % 12) === 0) {
      /* burning: run for the nearest water, if there is any, else run about */
      var best = 999;
      for (var dx = -50; dx <= 50; dx += 2) {
        var c0 = pCell(g, fx + dx, fy + 1), c1 = pCell(g, fx + dx, fy + 3);
        if ((WET[c0] || WET[c1]) && Math.abs(dx) < Math.abs(best)) best = dx;
      }
      if (best !== 999) p.dir = best < 0 ? -1 : 1;
      else if (Math.random() < 0.3) p.dir = -p.dir;
    }
    pStepX(g, p, (p.fire ? 0.5 : (p.panic ? 0.4 : (wading ? 0.12 : 0.18))) * (p.cold > 200 ? 0.5 : 1));
    if (!scared) {
      if (Math.random() < 0.003) p.idle = 40 + irnd(160);
      else if (Math.random() < 0.0015) p.dir = -p.dir;
    }
  }
  if (!scared && --p.chat <= 0) {
    p.chat = 500 + irnd(1200);
    var near = Math.abs(g.cx - p.x) < 14 && Math.abs(g.cy - p.y + 4) < 14 && g.mx > PANEL;
    pSay(g, p, wading ? "swim" : (near ? "watched" : "idle"));
  }
}

/* -------------------------------------------------------------------
   DRAWING: straight into the pixel buffer
   ------------------------------------------------------------------- */
var P_TMP = new Uint32Array(10);
function pBlit(g, spr, ox, oy, flip, rot, pal, glow) {
  var px = g.px, gp = g.gpx, m = g.m, gw = g.gw, gh = g.gh;
  for (var k = 0; k < spr.length; k += 3) {
    var sx = spr[k], sy = spr[k + 1], dx = (flip ? 4 - sx : sx) - 2, dy = sy - 4, rx, ry;
    if (rot === 0) { rx = dx; ry = dy; }
    else if (rot === 1) { rx = -dy; ry = dx; }
    else if (rot === 2) { rx = -dx; ry = -dy; }
    else { rx = dy; ry = -dx; }
    var X = ox + rx, Y = oy + ry;
    if (X < 0 || Y < 0 || X >= gw || Y >= gh) continue;
    var i = Y * gw + X, col = pal[spr[k + 2]];
    if (LIQUID[m[i]] && m[i] !== MAT.LAVA) col = mix32(col, px[i]);
    px[i] = col;
    if (glow) gp[i] = col;
  }
}
function peasantsDraw(g) {
  var L = g.peasants, pal = P_TMP, k, c;
  for (k = 0; k < L.length; k++) {
    var p = L[k];
    if (p.dead || p.state === "space") continue;
    var body, rot = 0, flip = p.dir < 0, oy = Math.floor(p.y) - 4, fast = (p.anim >> 2) & 1;
    if (p.state === "held") body = fast ? P_BODY.panicA : P_BODY.panicB;
    else if (p.state === "fly") { body = P_BODY.panicA; rot = ((Math.round(p.spin / 1.5708) % 4) + 4) % 4; }
    else if (p.stun > 0) { body = P_BODY.stand; rot = flip ? 3 : 1; oy = Math.floor(p.y) - 2; }
    else if (p.fire || p.panic > 0 || p.breath < P_BREATH - 30) body = fast ? P_BODY.panicA : P_BODY.panicB;
    else if (p.idle > 0) body = P_BODY.stand;
    else body = ((p.anim / 7) | 0) & 1 ? P_BODY.walkA : P_BODY.walkB;
    var src = (p.zap > 0 && (p.zap >> 2) & 1) ? P_XRAY : (p.charred ? P_CHAR : p.pal);
    for (c = 0; c < 10; c++) pal[c] = src[c];
    if (p.charred && p.zap <= 0) { pal[0] = p.pal[0] === p.pal[2] ? P_CHAR[2] : mix32(p.pal[0], P_CHAR[0]); }
    if (p.acid > 0) pal[2] = mix32(pal[2], SAND_PAL[MAT.ACID][irnd(256)]);
    /* the cold creeps in: blue first, then frosted white */
    if (p.cold > 60) { var fz = Math.min(0.75, p.cold / P_FREEZE); for (c = 0; c < 10; c++) if (c !== 3) pal[c] = blend32(pal[c], P_FROST, fz); }
    if (g.thermal) {
      /* in thermal vision a peasant is a warm blob, cooler if chilled, white-hot if burning */
      var bt = p.fire ? 800 : 37 - p.cold / 10;
      for (c = 0; c < 10; c++) pal[c] = thermCol(c === 0 || c === 1 ? bt - 6 : bt);
      pal[3] = thermCol(bt - 12);
    }
    if (p.fire) {
      pal[0] = P_FIRE[irnd(256)]; pal[4] = P_FIRE[irnd(256)]; pal[1] = P_FIRE[irnd(256)];
      if (Math.random() < 0.5) pal[6] = P_FIRE[irnd(256)];
    }
    var ox = Math.floor(p.x) + (p.cold > 200 && p.state === "walk" ? (p.anim >> 1) & 1 : 0);   /* shivering */
    if (p.state === "walk" && !p.falling) {
      /* a little shadow on whatever they are standing on */
      var sy = Math.floor(p.y) + 1;
      if (sy < g.gh) for (c = -2; c <= 2; c++) {
        var si = sy * g.gw + ox + c;
        if (ox + c >= 0 && ox + c < g.gw && SOLID[g.m[si]]) g.px[si] = mix32(g.px[si], c === -2 || c === 2 ? g.px[si] : 0xff000000);
      }
    }
    pBlit(g, p.hat.spr, ox, oy, flip, rot, pal, p.fire > 0);
    pBlit(g, body, ox, oy, flip, rot, pal, p.fire > 0);
  }
  /* ghosts: half see-through, which is the least a ghost can do */
  var px = g.px, gw = g.gw, gh = g.gh, G = g.ghosts;
  for (k = 0; k < G.length; k++) {
    var gs = G[k];
    if (gs.t > 170 && (gs.t & 1)) continue;
    var gx = Math.floor(gs.x) - 2, gy = Math.floor(gs.y) - 3;
    for (c = 0; c < P_GHOST.length; c += 3) {
      var X = gx + (gs.dir < 0 ? 4 - P_GHOST[c] : P_GHOST[c]), Y = gy + P_GHOST[c + 1];
      if (X < 0 || Y < 0 || X >= gw || Y >= gh) continue;
      var i = Y * gw + X;
      px[i] = P_GHOST[c + 2] === 3 ? P_GHOSTEYE : mix32(px[i], P_WHITE);
    }
  }
}

/* speech bubbles and name tags, on the real canvas, over the top of everything */
function peasantsBubbles(g, c, sx0, sy0) {
  var L = g.peasants, k, hover = inPlay(g) ? peasantAt(g, g.cx, g.cy, 2) : null;
  c.font = "bold 7px " + UI_FONT;
  c.textBaseline = "alphabetic";
  var placed = [];
  for (k = 0; k < L.length; k++) {
    var p = L[k];
    if (p.dead || p.state === "space") continue;
    var text = p.sayT > 0 ? p.say : (p === hover || p === g.held ? p.name : "");
    if (!text) continue;
    var tag = p.sayT <= 0, a = tag ? 0.85 : Math.min(1, p.sayT / 12);
    var sx = sx0 + PANEL + (p.x + 0.5) * CELL, sy = sy0 + PLAY_Y + (Math.floor(p.y) - 10) * CELL;
    var w = Math.ceil(c.measureText(text).width) + 6, h = 10;
    var bx = clamp(Math.round(sx - w / 2), PANEL + 2, VW - w - 2), by = Math.max(PLAY_Y + 2, Math.round(sy - h - 3));
    /* nudge up out of the way of bubbles already placed */
    for (var tries = 0; tries < 8; tries++) {
      var clash = null;
      for (var q = 0; q < placed.length; q++) {
        var r = placed[q];
        if (bx < r[0] + r[2] && bx + w > r[0] && by < r[1] + r[3] + 1 && by + h + 1 > r[1]) { clash = r; break; }
      }
      if (!clash) break;
      by = clash[1] - h - 2;
    }
    if (by < PLAY_Y + 1) continue;
    placed.push([bx, by, w, h]);
    var loud = text === text.toUpperCase() && /[A-Z]/.test(text) && !tag;
    c.globalAlpha = a;
    if (tag) {
      c.fillStyle = "rgba(10,14,22,0.75)"; c.fillRect(bx, by + 2, w, h - 2);
      c.fillStyle = "#ffd94a"; c.textAlign = "center"; c.fillText(text, bx + w / 2, by + h - 1);
    } else {
      c.fillStyle = loud ? "#fff3e0" : "#f4f6fa";
      c.beginPath();
      c.moveTo(bx + 2, by); c.lineTo(bx + w - 2, by); c.quadraticCurveTo(bx + w, by, bx + w, by + 2);
      c.lineTo(bx + w, by + h - 2); c.quadraticCurveTo(bx + w, by + h, bx + w - 2, by + h);
      var tx = clamp(sx, bx + 3, bx + w - 3);
      c.lineTo(tx + 2, by + h); c.lineTo(tx, by + h + 3); c.lineTo(tx - 1, by + h);
      c.lineTo(bx + 2, by + h); c.quadraticCurveTo(bx, by + h, bx, by + h - 2);
      c.lineTo(bx, by + 2); c.quadraticCurveTo(bx, by, bx + 2, by);
      c.fill();
      c.fillStyle = loud ? "#c81e1e" : "#1a1e28"; c.textAlign = "center";
      var jx = loud ? (Math.random() - 0.5) * 0.8 : 0, jy = loud ? (Math.random() - 0.5) * 0.8 : 0;
      c.fillText(text, bx + w / 2 + jx, by + h - 2.5 + jy);
    }
  }
  /* ghosts get last words */
  for (k = 0; k < g.ghosts.length; k++) {
    var gs = g.ghosts[k];
    if (!gs.say || gs.t < 30 || gs.t > 170) continue;
    var gx = sx0 + PANEL + (gs.x + 0.5) * CELL, gy = sy0 + PLAY_Y + (gs.y - 6) * CELL;
    c.globalAlpha = Math.min(1, (170 - gs.t) / 20, (gs.t - 30) / 10) * 0.85;
    c.fillStyle = "#cfe0ff"; c.textAlign = "center";
    c.font = "italic bold 7px " + UI_FONT;
    c.fillText(gs.say, gx, gy);
  }
  c.globalAlpha = 1; c.textAlign = "left";
}
