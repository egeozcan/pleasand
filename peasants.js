/* =====================================================================
   PLEASAND  --  peasants.js

   the villagers. they are not on the grid: each one is a little bag of
   numbers that walks over the grid, reads the cells it is standing in,
   and reacts. they climb small steps, jump up ledges and over gaps, and
   carry a ninja rope for walls too tall to jump, gaps too wide to leap
   and cliffs too high to fall off, and a parachute that mostly opens.
   they wade and swim (and drown only if they cannot find the surface),
   catch fire, and have opinions about all of it.

   a peasant is 5 cells wide and 9 tall, drawn straight into the pixel
   buffer so it sits in the world like everything else. its feet are at
   (x, y); only the middle column collides, which is plenty.
   ===================================================================== */
"use strict";

var P_MAX = 120, P_BREATH = 300;
/* jumping: gravity per tick, the tallest ledge a peasant can jump up, the widest gap it will leap */
var P_GRAV = 0.09, P_JUMP = 10, P_GAP = 12;
/* the ninja rope: how far it reaches, how fast the hook flies, how fast they climb and let themselves down */
var P_ROPE = 45, P_HOOK_V = 4, P_REEL = 0.22, P_ABSEIL = 0.35;
/* the parachute: too fast to open it above P_CHUTE_V, not worth it with less than P_CHUTE_H below,
   comes down at P_CHUTE_SINK under a good canopy, and does not open at all one time in P_CHUTE_FAIL */
var P_CHUTE_V = 1.6, P_CHUTE_H = 30, P_CHUTE_SINK = 0.35, P_CHUTE_FAIL = 0.15;
/* chores and mischief: hungry enough to go looking for food, bored enough to go and chop wood, bored enough
   to light something (if it is no bigger than P_LIGHT_MAX cells), and how many logs they can carry */
var P_STARVE = 18000;   /* ticks of hunger that kill */
var P_HUNGRY = 2500, P_BORED_CHOP = 1200, P_BORED_FIRE = 2700, P_LIGHT_MAX = 40, P_LOGS = 6;
/* bites per meal, cells per chopping session, and how long before they will chop again */
var P_BITES = 5, P_CHOPS = 3, P_CHOP_CD = 2400;
/* things a buried peasant cannot dig up through */
var P_HARD = new Uint8Array(NMAT);
[MAT.STONE, MAT.GLASS, MAT.ICE, MAT.CLONER, MAT.FAUCET, MAT.DRAIN, MAT.TORCH, MAT.METAL, MAT.INERT, MAT.PLANK, MAT.STAIRS,
 MAT.COAL, MAT.ORE, MAT.GOLD, MAT.BRICK, MAT.CONCRETE, MAT.STAINED, MAT.FIREBRICK, MAT.MOONROCK].forEach(function (v) { P_HARD[v] = 1; });
/* things a peasant walks straight through, though nothing else can: doors (they open them) and ladders (they climb them) */
var P_PASS = new Uint8Array(NMAT); P_PASS[MAT.DOOR] = P_PASS[MAT.LADDER] = 1;
P_PASS[MAT.LAMP] = 1;   /* (and lanterns, hung over doorways: they duck) */
P_PASS[MAT.GIRDER] = 1;   /* (and the iron lattice of a lift's headframe: they step through it) */
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
  swim: ["just keep swimming", "the water's lovely", "doggy paddle!", "splish splash", "come on in!", "i'm a fish",
         "backstroke!", "where's the shore", "i can swim!", "bit chilly"],
  glub: ["glub", "glub glub", "HELP", "blub", "need... air", "mmmf", "which way is up"],
  jump: ["hup!", "hop", "wheee", "yoink", "parkour!", "hyah!", "up we go"],
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
  wade: ["ooh, chilly", "wet feet", "splish splash", "my socks!", "it's only water", "refreshing"],
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
  float: ["i'm floating!", "salt water! i float!", "look, no hands", "it's like the dead sea", "so buoyant"],
  rope: ["NINJA ROPE!", "hyaa!", "get over here", "i've got this", "ROPE!", "like a ninja", "hiyaa", "grappling!"],
  swing: ["WHEEEE", "tarzan!", "AAAH-AH-AAAAH", "like a monkey", "swingin'"],
  abseil: ["abseiling!", "going down", "safety first", "nice and slow", "don't look down"],
  caught: ["PHEW", "got it!", "that was close", "rope! rope!", "ninja reflexes"],
  snap: ["MY ROPE!", "uh oh", "noooo", "it snapped!", "cheap rope"],
  chute: ["PARACHUTE!", "geronimo!", "deploying!", "pop!", "this is the life", "nice view up here"],
  touchdown: ["touchdown", "nailed it", "smooth", "and stick the landing", "ten out of ten"],
  chutefail: ["IT WON'T OPEN", "uh oh", "MUMMY", "should've packed it myself", "PULL THE OTHER ONE", "not good not good",
              "REFUND!"],
  chuteburn: ["MY PARACHUTE!", "IT'S ON FIRE", "not the chute!"],
  chop: ["chop chop", "hup!", "nice wood", "for the fire", "*thwack*", "i'm a lumberjack"],
  timber: ["TIMBER!", "TIMBERRR", "look out below!", "i didn't think that through"],
  eat: ["nom", "nom nom", "crunchy", "tastes green", "salad!", "mmm, leaves", "needs salt", "five a day"],
  hungry: ["i'm starving", "so hungry", "anyone got a sandwich", "is that a plant? i'd eat that", "my tummy"],
  bored: ["so bored", "nothing ever happens here", "i'm bored", "*sigh*", "what if... fire?",
          "i could set something on fire", "entertain me"],
  light: ["hehehe", "oops", "let's see what happens", "pretty", "it was like that when i got here", "ooh", "fire!"],
  camp: ["campfire!", "cozy", "who brought marshmallows", "ahh, warm", "gather round"]
};

var P_DEATH = {
  starve: ["{n} starved", "{n} wasted away", "{n} forgot to eat. for a very long time", "{n} died hungry"],
  old: ["{n} died of old age, in bed", "{n} had a good long life", "{n} lived to a ripe old age", "{n} nodded off, and did not wake up",
        "{n} went peacefully, full of ideas"],
  fire: ["{n} was flambéed", "{n} is extra crispy now", "{n} got toasted", "{n} became a campfire", "{n} was too hot to handle", "{n} burned out"],
  lava: ["{n} took a lava bath", "{n} is soup now", "{n} found out the floor was lava", "{n} went for a very warm dip"],
  drown: ["{n} couldn't find the surface", "{n} sleeps with the fishes", "{n} drank most of the pond", "{n} should have stayed dry"],
  acid: ["{n} dissolved. ew", "{n} is a puddle now", "{n} fizzed away", "{n} got the acid treatment"],
  fall: ["{n} tripped. from very high up", "{n} found the ground", "{n} believed they could fly", "{n} fell off the world"],
  splat: ["{n} went splat", "{n} hit something at speed", "{n} was thrown too hard", "{n} became a wall decoration", "{n} has been flattened"],
  nuke: ["{n} was vaporized", "{n} saw a bright light", "{n} is now a shadow on a wall", "{n} was atomised"],
  drain: ["{n} went down the drain", "{n} is in the sewers now", "{n} was flushed"],
  buried: ["{n} was buried alive. sandy", "{n} is part of the beach now", "{n} became a sandcastle"],
  zap: ["{n} got struck twice. impressive", "{n} conducted electricity. briefly", "{n} was fried. crispy"],
  chute: ["{n}'s parachute did not open", "{n} packed their own parachute", "{n} should have checked the parachute",
          "{n} got a parachute from the bargain bin"],
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
  panicB: pParse(["ssses", "sssms", ".ccc.", ".cCc.", "..p..", "..ff."], 3),
  /* the axe: handle in the belt colour, blade in white. raised, then down into the wood */
  chopA:  pParse(["....ww", "....C.", ".sseC.", ".sssC.", "scccs.", ".cCc..", ".p.p..", ".f.f.."], 1),
  chopB:  pParse([".sse..", ".sss..", "scccCC", ".cCc.w", ".p.p.w", ".f.f.."], 3),
  /* chewing */
  eatB:   pParse([".sse.", ".ssm.", "scccs", ".cCc.", ".p.p.", ".f.f."], 3),
  /* the hammer: handle in the belt colour, head in the shoe colour. up, then down on the nail */
  hammerA: pParse(["...ff.", "....C.", ".sseC.", ".sssC.", "scccs.", ".cCc..", ".p.p..", ".f.f.."], 1),
  hammerB: pParse([".sse..", ".sss..", "scccCf", ".cCc.f", ".p.p..", ".f.f.."], 3),
  /* the pick: an iron head (the shoe colour) on a long handle. up over the shoulder, then down into the rock */
  pickA:  pParse(["...fff", "...fC.", ".sseC.", ".sssC.", "scccs.", ".cCc..", ".p.p..", ".f.f.."], 1),
  pickB:  pParse([".sse..", ".sss..", "scccC.", ".cCc.C", ".p.pff", ".f.f.f"], 3),
  /* eyes shut */
  sleep:  pParse([".sss.", ".sss.", "scccs", ".cCc.", ".p.p.", ".f.f."], 3)
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
function pSolid(g, x, y) { var c = pCell(g, x, y); return SOLID[c] === 1 && !P_PASS[c]; }
/* what a peasant pushes through, on its own two feet: leaves and flowers (P_LEAF, which nothing stops for, not even a
   peasant flying through the air), and wood and saplings (P_SOFT: a tree trunk, a log, a wooden wall somebody drew).
   it can stand on top of any of it, but not in the middle of it: a soft thing holds them up only with their feet out
   of it. so they walk through a tree at the bottom, or along the top of it, and when they want to they go down through
   it (P_SINK, while they are sinking into it) or up (a jump, or the rope, straight up through it: paths.js) */
var P_LEAF = new Uint8Array(NMAT); P_LEAF[MAT.PLANT] = P_LEAF[MAT.FLOWER] = P_LEAF[MAT.CROP] = P_LEAF[MAT.WHEAT] = 1;
var P_SOFT = new Uint8Array(NMAT); P_SOFT[MAT.PLANT] = P_SOFT[MAT.FLOWER] = P_SOFT[MAT.WOOD] = P_SOFT[MAT.SAPLING] = 1;
P_SOFT[MAT.CROP] = P_SOFT[MAT.WHEAT] = 1;   /* (a field of wheat is walked through, like a bush) */
var P_SINK = false;
/* a deck of planks holds nobody up for as long as they are sinking through it: a burning peasant on a bridge dives for
   the water under it (pTryDive) */
var P_THIN = new Uint8Array(NMAT); P_THIN[MAT.PLANK] = 1;
/* is there something to stand on, under feet at row y: in this column (pFoot), or one either side (pGround) */
function pFoot(g, x, y) {
  var c = pCell(g, x, y + 1);
  return SOLID[c] === 1 && !P_PASS[c] && !(P_SOFT[c] && (P_SINK || P_SOFT[pCell(g, x, y)])) && !(P_SINK && P_THIN[c]);
}
function pGround(g, x, y) { return pFoot(g, x, y) || pFoot(g, x - 1, y) || pFoot(g, x + 1, y); }
/* could a peasant with its feet here stand up straight (pBody: is this cell in the way of a walking one). pStiff: in the
   way of one that is not walking but flying, which goes through leaves but not through a tree */
function pBody(g, x, y) { var c = pCell(g, x, y); return SOLID[c] === 1 && !P_PASS[c] && !P_SOFT[c]; }
function pStiff(g, x, y) { var c = pCell(g, x, y); return SOLID[c] === 1 && !P_PASS[c] && !P_LEAF[c]; }
function pStiffAt(g, x, y) { var fx = Math.floor(x), fy = Math.floor(y); return pStiff(g, fx, fy) || pStiff(g, fx, fy - 4) || pStiff(g, fx, fy - 7); }
/* the next step along, into column x from feet at row y: how far up it is (0 to 3; 4 or more is a wall). the first
   height with room for them, and with their feet clear of anything soft, or held up in it: walking into a bush, they go
   through it along the ground; walking along the top of one, they keep to the top, up its bumps */
function pStepUp(g, x, y) {
  var k, f = -1;
  for (k = 0; k <= 3; k++) {
    if (!pRoom(g, x, y - k)) continue;
    if (f < 0) f = k;
    if (!P_SOFT[pCell(g, x, y - k)] || pFoot(g, x, y - k)) return k;
  }
  return f < 0 ? 4 : f;   /* (no proper step: into it, then, and down through it) */
}
function pRoom(g, x, y) { return !pBody(g, x, y) && !pBody(g, x, y - 3) && !pBody(g, x, y - 6) && !pBody(g, x, y - 8); }
function pBlocked(g, x, y) { var fx = Math.floor(x), fy = Math.floor(y); return pBody(g, fx, fy) || pBody(g, fx, fy - 4) || pBody(g, fx, fy - 7); }

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
    hat: hat, pal: pPal(cols), dead: 0, spaceT: 0, fromSpace: 0,
    hunger: irnd(2000), bored: irnd(1000), logs: 0, task: null, boards: 0, home: 0, tired: irnd(6000), sleep: 0,
    pack: 0, launch: 0
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
  roast: ["A BARBECUE", "three peasants on fire at once. a village record"],
  ninja: ["NINJA ROPE", "the peasants have discovered rope. there is no stopping them now"],
  chute: ["PARACHUTE", "a peasant has discovered drag"],
  arson: ["BORED NOW", "a peasant got bored and found the matches"],
  camp: ["CAMPFIRE", "chopped it, stacked it, lit it"]
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
  if (g.causes) g.causes[cause] = (g.causes[cause] || 0) + 1;
  iSpill(g, p, true);   /* a bucket of water they were carrying (ideas.js) goes where they fell */
  wDropAll(g, p);       /* and a pail of wet concrete, or a lump of it gone off (wonders.js) */
  tCarry(g, p);         /* and an armful of sand off somebody's roof (tidy.js) */
  var line = pick(P_DEATH[cause]);
  feed(g, line.replace("{n}", p.name), "#ff9a8a");
  iMourn(g, p, line);   /* remembered, for a grave (ideas.js) */
  wTale(g, "death", p, cause);   /* (and as a tale, for telling: wonders.js) */
  var talking = 0;
  for (k = 0; k < g.ghosts.length; k++) if (g.ghosts[k].say && g.ghosts[k].t < 170) talking++;
  var gl = (talking < 2 && Math.random() < 0.5) ? pick(P_SAY.ghost) : "";
  g.ghosts.push({ x: p.x, y: p.y - 4, t: 0, dir: p.dir, say: gl });
  var fx = Math.floor(p.x), fy = Math.floor(p.y), gw = g.gw, k, j, x, y;
  /* what is left */
  if (cause === "fire" || cause === "zap" || cause === "reentry") {
    for (k = 0; k < 10; k++) {
      x = fx + irnd(5) - 2; y = fy - irnd(6);
      if (x >= 0 && x < gw && y >= 0 && y < g.gh && g.m[y * gw + x] === MAT.EMPTY) sandPlace(g, y * gw + x, k < 6 ? MAT.ASH : MAT.FIRE);
    }
  } else if ((cause === "fall" || cause === "splat" || cause === "buried") && pGround(g, fx, fy)) {
    /* a little headstone, where they landed */
    var stone = [[0, -2], [-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0]];
    for (k = 0; k < stone.length; k++) {
      x = fx + stone[k][0]; y = fy + stone[k][1];
      if (x >= 0 && x < gw && y >= 0 && y < g.gh && AIRY[g.m[y * gw + x]]) { j = y * gw + x; sandPlace(g, j, MAT.STONE); g.sh[j] = 40; heatAccept(g, j); }
    }
  } else if (cause === "nuke") {
    sparks(g, p.x, p.y - 4, 12, 1, [P_WHITE], 10, 0.5, PK_GLINT);
  } else if (cause === "freeze") {
    /* an ice statue of them, where they stood */
    for (y = fy - 8; y <= fy; y++) for (x = fx - 1; x <= fx + 1; x++) {
      if ((y === fy - 8 || y === fy - 3) && x !== fx) continue;
      if (x >= 0 && x < gw && y >= 0 && y < g.gh && AIRY[g.m[y * gw + x]]) { j = y * gw + x; sandPlace(g, j, MAT.ICE); }
    }
  }
  /* a puff of whatever they were wearing. only a puff: it lights nothing */
  if (cause !== "nuke" && cause !== "freeze") sparks(g, p.x, p.y - 4, 8, 0.8, [p.pal[4], p.pal[0]], 12, 0.6, PK_GLINT);
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
    wCrowned(g, p, heir);   /* (the king is dead: something BIG. wonders.js) */
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
  wTale(g, "zap", p);
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
      if (p.state !== "fly") { p.state = "fly"; p.flyT = 0; p.immune = 3; p.fallY = p.y; p.rope = null; p.chute = null; p.bored = 0; }
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
    if (kind === "firework" && d2 < 160 * 160) p.bored = 0;   /* that was something */
    if (kind === "firework" && d2 < 160 * 160 && Math.random() < 0.35) { pSay(g, p, "ooh"); if (!p.jumping && !p.rope && pGround(g, Math.floor(p.x), Math.floor(p.y)) && Math.random() < 0.5) pLeap(p, 0.9, 0); }
    else if (kind === "flower" && d2 < 40 * 40 && Math.random() < 0.6) pSay(g, p, "flower");
  }
}

/* -------------------------------------------------------------------
   THE PEASANT, ONE TICK AT A TIME
   ------------------------------------------------------------------- */
function peasantsStep(g) {
  var L = g.peasants, k, p, q;
  for (k = 0; k < L.length; k++) if (!L[k].dead) {
    P_SINK = !!L[k].sink; pStep(g, L[k]); P_SINK = false;
    iThink(g, L[k]);   /* and a full stomach, whatever it is up to, has time to think (ideas.js) */
  }
  if ((g.tick % 60) === 0) pLife(g);
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
    /* (a rocket pack goes up, not through people: the one on it is steering, after a fashion) */
    if (p.dead || p.state !== "fly" || p.launch || p.vx * p.vx + p.vy * p.vy < 2) continue;
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
  buildStep(g);
  ideasStep(g);
  wStep(g);   /* (the great works: wonders.js) */
  lTick(g);   /* (snowballs in the air, and fuses burning: leftovers.js) */
  exploreNote(g);
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
  if (p.launch && p.state !== "fly") {   /* (down again: the rocket pack is off, till next time) */
    if (p.state === "walk") pSay(g, p, "rocketLand", true);
    if (p.stun > 0) wTale(g, "pack", p);   /* (down hard: that is a tale) */
    p.launch = 0;
  }
  if (p.state === "held") { pHeld(g, p); return; }
  if (p.state === "space") {
    /* (aboard a rocket on its pad, not yet gone: no clock running. aboard one that cannot go, or is not there: held, and
       let out when there is somewhere. heavens.js) */
    if (p.aboard) { if (!hAboardOf(g, p)) hHeld(g, p); return; }
    if (--p.spaceT <= 0) {
      /* (back from the moon: over the pad they went up from. heavens.js) */
      var sx = p.spaceX; p.spaceX = null;
      p.state = "fly"; p.x = sx != null ? sx : 10 + Math.random() * (g.gw - 20); p.y = -12; p.vx = Math.random() - 0.5; p.vy = sx != null ? -0.8 : 1.5;
      p.fromSpace = 240; p.flyT = sx != null ? 13 : 0;   /* (and slowly enough, at first, for the cord) */
      feed(g, p.name + (sx != null ? " is back from the moon" : " is back from space"), "#9ad0ff");
      pSay(g, p, "space", true);
    }
    return;
  }
  var fx = Math.floor(p.x), fy = Math.floor(p.y), m = g.m, gw = g.gw, j;
  var cf = pCell(g, fx, fy), cm = pCell(g, fx, fy - 4), ch = pCell(g, fx, fy - 7), cb = pCell(g, fx, fy + 1);

  /* the dangers of the world, in order of how quickly they ruin your day */
  if (navDrainAt(g, fx, fy)) { pDie(g, p, "drain"); return; }   /* (paths.js: the same as a rocket's crew are let out clear of) */
  if (cf === MAT.LAVA || cm === MAT.LAVA || cb === MAT.LAVA) {
    pIgnite(g, p);
    if (++p.lava > 30) { pDie(g, p, "lava"); return; }
  } else if ((HOT[cf] || HOT[cm] || HOT[ch]) && !(p.task && p.task.brave)) pIgnite(g, p);   /* (a leather apron, at a furnace: heavens.js) */
  if (pHeat(g, p, fx, fy)) return;
  if (cf === MAT.ACID || cm === MAT.ACID || ch === MAT.ACID || cb === MAT.ACID) {
    if (p.acid < 1 || Math.random() < 0.01) pSay(g, p, "acid", p.acid < 1);
    p.acid += 1;
    if (p.acid > 110) { pDie(g, p, "acid"); return; }
    if (Math.random() < 0.06) { j = (fy - irnd(5)) * gw + fx; if (j >= 0 && j < m.length && m[j] === MAT.ACID) m[j] = MAT.EMPTY; }
  } else if (p.acid > 0) p.acid = Math.max(0, p.acid - 0.3);
  var liquid = LIQUID[cm] || LIQUID[cf], sub = LIQUID[ch] && ch !== MAT.LAVA;
  if (p.fire && (WET[cm] || WET[cf] || WET[ch] || WET[cb])) {
    p.fire = 0; p.fireTo = null; g.fx.hiss++;
    pSay(g, p, "phew", true);
    sparks(g, p.x, p.y - 8, 6, 0.4, [hex32("#c0d0e0")], 14, 0.6, PK_GLINT);   /* steam, not sparks */
  }
  if ((cm === MAT.SMOKE || ch === MAT.SMOKE) && p.sayT <= 0 && Math.random() < 0.03) pSay(g, p, "cough");
  if (sub) {
    if (--p.breath <= 0) { pDie(g, p, "drown"); return; }
    if (p.breath % 70 === 0 && p.breath < P_BREATH - 50) pSay(g, p, "glub", true);
    if (Math.random() < 0.04) partAdd(g, PK_GLINT, p.x + 0.5, p.y - 8, 0, -0.3, 20, hex32("#a8d8ff"));   /* bubbles light nothing */
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
  if (p.ropeCD > 0) p.ropeCD--;
  if (p.ropeTries && (p.anim % 3000) === 0) p.ropeTries--;   /* failed climbs are forgotten, slowly */
  if (p.catchCD > 0) p.catchCD--;
  if (p.chuteCD > 0) p.chuteCD--;
  if (p.calmT > 0) p.calmT--;
  if (p.chopCD > 0) p.chopCD--;
  if (p.taskCD > 0) p.taskCD--;
  if (p.planCD > 0) p.planCD--;
  if (p.eatCD > 0) p.eatCD--;
  if (p.plantCD > 0) p.plantCD--;
  if (p.exploreCD > 0) p.exploreCD--;
  if (p.mineCD > 0) p.mineCD--;
  if (p.oilCD > 0) p.oilCD--;
  p.pose = null; p.navMove = null; p.hold = false;
  /* sinking into a bush or a tree, to go down through it: until their feet are in it. from there it holds nobody up */
  if (p.sink && (Math.floor(p.y) >= p.sink || --p.sinkT <= 0 || p.state !== "walk")) { p.sink = 0; P_SINK = false; }
  if (p.state === "fly") { p.jumping = false; p.rope = null; p.chute = null; p.task = null; p.climb = null; p.sleep = 0; pFly(g, p); return; }

  /* buried in something: climb out the top, if there is a top */
  if (SOLID[cf] && !P_PASS[cf] && !P_SOFT[cf] && !(P_SINK && P_THIN[cf])) {
    var above = pCell(g, fx, fy - 9);
    if (!SOLID[above] || P_PASS[above]) { p.y = fy - 1; p.buried = 0; }
    else if (!P_HARD[above] && (p.anim % 3) === 0) { p.y = fy - 1; if (++p.buried === 40) pSay(g, p, "buried", true); }
    else {
      if (++p.buried === 40) pSay(g, p, "buried", true);
      if (p.buried > 260) pDie(g, p, cf === MAT.ICE || above === MAT.ICE ? "freeze" : "buried");
    }
    return;
  }
  p.buried = 0;
  /* on a ladder */
  if (p.climb) { bClimbStep(g, p); if (p.climb) return; }
  /* on the rope, or waiting for the hook to bite */
  if (p.rope && pRopeStep(g, p)) return;
  /* under a parachute, good or bad */
  if (p.chute) { pChute(g, p); return; }
  /* in the air on purpose: a jump, or a hop for fireworks */
  if (p.jumping) { pJump(g, p); return; }
  var ground = pGround(g, fx, fy);
  /* in deep water, or standing on the bottom with your head under: swim */
  var swam = p.swimming;
  p.swimming = liquid && (!ground || sub);
  if (swam && !p.swimming) wSwam(g, p);   /* (out of the water, on the bank: counted. wonders.js) */
  if (liquid && g.wAny) wBathe(g, p, fx, fy);   /* (warm water is a bath: wonders.js) */
  p.swimT = p.swimming ? (p.swimT || 0) + 1 : 0;   /* (how long they have been swimming: pSwim) */
  if (p.swimming) { pSwim(g, p, sub); return; }
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
  if (hi > P_IGNITE * (p.task && p.task.brave ? 2 : 1) || feet > P_IGNITE + 120) pIgnite(g, p);
  else if (!p.fire && !(p.task && p.task.brave) && (hi > P_SCALD || (feet > P_SCALD && SOLID[g.m[(fy + 1) * gw + fx]]))) {   /* (used to it, at work at a furnace: heavens.js) */
    p.panic = Math.max(p.panic, 30); p.idle = 0;
    if (p.sayT <= 0 && Math.random() < 0.05) pSay(g, p, "scald", true);
    /* hot ground: a little hop, as you would */
    if (feet > P_SCALD && p.state === "walk" && !p.jumping && !p.swimming && !p.rope && Math.random() < 0.08) pLeap(p, 0.7, 0);
  } else if (!p.fire && hi > P_SWEAT) {
    if (++p.warm > 120 && p.sayT <= 0 && Math.random() < 0.01) pSay(g, p, "hot");
  } else p.warm = 0;
  /* a fire close by warms you through the cold air, the way a fire does (that is the peasant warming, not the room:
     it takes no heat from anything) */
  if (p.cold > 0 && (p.anim & 7) === 0) p.byFire = bHotNear(g, fx, fy - 4, 8);
  if (p.cold > 0 && p.byFire) { p.cold = Math.max(0, p.cold - 8); return false; }
  /* too cold. a fire nearby, or warm air, thaws them out again */
  if (lo < P_CHILL && !p.fire) {
    p.cold += Math.min(6, (P_CHILL - lo) / 12);
    if (p.cold > 90 && p.sayT <= 0 && Math.random() < 0.012) pSay(g, p, "cold", true);
    if (p.cold > P_FREEZE) { pDie(g, p, "freeze"); return true; }
  } else if (p.cold > 0) p.cold = Math.max(0, p.cold - (hi > 30 || p.fire ? 4 : 0.6));
  return false;
}

function pHeld(g, p) {
  p.rope = null; p.jumping = false; p.chute = null; p.task = null; p.bored = 0; p.climb = null; p.sleep = 0;
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
  if (pGround(g, fx, cy) && cy <= target) { p.y = cy; pLand(g, p); return; }
  p.y = target;
  /* a long way down: the parachute, while there is still time to open it. then the rope */
  if (pTryChute(g, p)) return;
  if (p.y - p.fallY > 25 && Math.random() < 0.08 && pTryCatch(g, p)) return;
  if (p.y - p.fallY > 30 && p.sayT <= 0) pSay(g, p, "fall", true);
}
function pLand(g, p, cause) {
  var drop = p.y - p.fallY;
  p.falling = false; p.vy = 0; p.fallY = p.y;
  if (drop > 85 && !p.immune) { pDie(g, p, p.fromSpace ? "reentry" : (cause || "fall")); return; }
  if (drop > 34) { p.stun = 70; pSay(g, p, "oof", true); g.fx.thud++; g.shake = Math.min(6, g.shake + 1); }
}
/* swimming: kick up to the surface, keep your head out, paddle for the shore and climb out */
function pSwim(g, p, sub) {
  p.falling = false; p.fallY = p.y; p.stun = 0; p.idle = 0;
  var fx = Math.floor(p.x), fy = Math.floor(p.y), depth = 0;
  while (depth < 10 && LIQUID[pCell(g, fx, fy - depth)]) depth++;
  /* salt water holds you up higher. you can float in it, like in the dead sea */
  var salt = pCell(g, fx, fy - 4) === MAT.SALTWATER, want = salt ? 4 : 6, err = depth - want, target;
  if (salt && p.sayT <= 0 && Math.random() < 0.004) pSay(g, p, "float");
  var burns = pCell(g, fx, fy) === MAT.ACID || pCell(g, fx, fy - 4) === MAT.ACID;
  /* (stinging, short of breath, or in a long while: never mind where they were going, out at the nearest bank) */
  var struggle = p.breath < P_BREATH - 60 || p.swimT > 900;
  if (struggle && p.task) p.task = null;   /* (never mind the errand) */
  /* (head under, and short of breath: the nearest open air overhead first, not a wall: under an overhang the nearest
     solid thing is no way out) */
  if (sub && p.breath < P_BREATH - 60 && (p.anim % 15) === 0) {
    /* (making for air one way, and getting nowhere for a while: a lip in the way. the other way, then) */
    if ((p.airDir === 1 || p.airDir === -1) && Math.abs(p.x - (p.airX || 0)) < 0.5 && ++p.airStuck >= 3) { p.airNo = p.airDir; p.airStuck = 0; }
    else if (Math.abs(p.x - (p.airX || 0)) >= 0.5) p.airStuck = 0;
    p.airX = p.x;
    p.airDir = pAirDir(g, fx, fy, p.airNo);
  }
  if (!sub) { p.airDir = 0; p.airNo = 0; p.airStuck = 0; }
  if (p.airDir) { if (p.airDir !== 2) p.dir = p.airDir; struggle = false; }   /* (2: air right overhead. up, and stay put) */
  /* (in a long while, and not choking or stinging: a way out, rope, hook and all, to somewhere dry. a bank that is a
     wall leaning out over the water is no way out by paddling at it) */
  var routed = struggle && !burns && !p.airDir && p.swimT > 900 && pathGo(g, p, "bank", fx, fy, pDryGoal(g)) > 0;
  if ((burns || struggle) && !routed && (p.anim % 15) === 0) {
    /* the nearest bank: something solid at about head height, either side. (in a very long while with no way out at
       that one: the other one, by turns) */
    var other = p.swimT > P_SWIM_TRY && ((p.swimT / P_SWIM_TRY) | 0) % 2 === 1, near = 0, far = 0;
    for (var bd = 2; bd <= 80 && !far; bd++) {
      var r = pSolid(g, fx + bd, fy - 6) || pSolid(g, fx + bd, fy - 4), l = pSolid(g, fx - bd, fy - 6) || pSolid(g, fx - bd, fy - 4);
      if (!near) near = r ? 1 : (l ? -1 : 0);
      if (near && ((near > 0 && l) || (near < 0 && r))) far = -near;
    }
    if (near) p.dir = other && far ? far : near;
    var lh = hBeacon(g, p);   /* (a lighthouse lit, within sight: that way. heavens.js) */
    if (lh) p.dir = lh;
  }
  if (sub) target = burns ? -0.5 : -0.3;              /* head under: swim for the air. faster, if it stings */
  else if (err > 0) target = -Math.min(0.2, 0.05 * err);
  else if (err < 0) target = Math.min(0.2, -0.05 * err);
  else target = 0;
  p.vy += (target - p.vy) * 0.2 + Math.sin(p.anim * 0.12) * 0.01;   /* a little bob */
  var ny = p.y + p.vy;
  if (p.vy < 0 && pBody(g, fx, Math.floor(ny) - 8)) p.vy = 0;   /* (up through leaves, weed, a bush grown out over the water: only something hard stops them) */
  else if (p.vy > 0 && pGround(g, fx, fy)) p.vy = 0;
  else p.y = ny;
  /* the burning swim for it too, and the cold swim slower */
  if (p.airDir !== 2) pStepX(g, p, (sub ? 0.1 : 0.14) * (burns ? 1.8 : 1) * (p.cold > 200 ? 0.5 : 1), true);   /* (under the open air: no paddling away from it) */
  var gasping = sub && p.breath < P_BREATH - 40;
  if (p.sayT <= 0 && Math.random() < (gasping ? 0.02 : 0.004)) pSay(g, p, gasping ? "glub" : "swim");
}
/* ticks of paddling at one bank before trying the other, when there is no way out that a route can find */
var P_SWIM_TRY = 1800;
/* a route's goal: somewhere to stand on something solid, out of the water, head and all */
function pDryGoal(g) {
  return function (x, y) { return navStand(g, x, y) === 1 && !WET[pCell(g, x, y)] && !WET[pCell(g, x, y - 4)]; };
}
/* leave the ground on purpose: up at vy, sideways at jx */
function pLeap(p, vy, jx) {
  p.jumping = true; p.vy = -vy; p.jx = jx; p.falling = false; p.fallY = p.y; p.idle = 0;
}
/* in the air on purpose. the same gravity as falling, but you keep going the way you jumped */
function pJump(g, p) {
  var fx = Math.floor(p.x), target, cy;
  if (p.vy < 0) {
    if (pBody(g, fx, Math.floor(p.y + p.vy) - 9)) p.vy = 0;   /* bumped your head (on anything but leaves) */
    else p.y += p.vy;
    p.fallY = p.y;
  } else {
    target = p.y + p.vy; cy = Math.floor(p.y);
    while (cy < Math.floor(target) && !pGround(g, fx, cy)) cy++;
    if (pGround(g, fx, cy) && cy <= target) { p.y = cy; p.jumping = false; p.jx = 0; pLand(g, p); return; }
    p.y = target;
    /* came down in water: swim from here */
    if (LIQUID[pCell(g, fx, Math.floor(p.y) - 4)]) { p.jumping = false; p.jx = 0; p.vy = Math.min(p.vy, 0.3); return; }
    /* the far side was further down than it looked */
    if (pTryChute(g, p)) return;
  }
  p.vy = Math.min(p.vy + P_GRAV, 3);
  if (p.jx) {
    var nx = p.x + p.jx;
    if (nx < 1 || nx > g.gw - 1) p.jx = 0;
    else if (!pBlocked(g, nx, p.y)) p.x = nx;   /* against a wall: keep rising, go over when clear */
  }
  if (p.y - p.fallY > 30 && p.sayT <= 0) pSay(g, p, "fall", true);
}
/* a wall too tall to step up: jump it, if it is not too tall to jump and there is room overhead */
function pTryJump(g, p, fx, fy) {
  if (p.cold > 400) return false;
  var nfx = fx + p.dir, k, j;
  for (j = 9; j < 12; j++) if (pBody(g, fx, fy - j)) return false;
  for (k = 4; k <= P_JUMP; k++) {
    if (pBody(g, fx, fy - k - 8)) return false;
    if (pRoom(g, nfx, fy - k)) break;
  }
  if (k > P_JUMP) return false;
  pLeap(p, Math.sqrt(2 * P_GRAV * (k + 2)), p.dir * 0.3);
  if (p.sayT <= 0 && Math.random() < 0.15) pSay(g, p, "jump");
  return true;
}
/* the ground ends and the drop is a long one: leap to the other side, if there is one close enough */
function pTryGap(g, p, fx, fy) {
  if (p.fire || p.cold > 400) return false;   /* burning peasants want to land in the pond, not over it */
  var d;
  for (d = 1; d <= 6; d++) if (pGround(g, fx + p.dir, fy + d)) return false;   /* only a little drop: just walk off */
  if (pTryLeap(g, p, fx, fy)) return true;
  /* too wide to leap: a bridge, perhaps */
  if (bTryBridge(g, p, fx, fy, false)) return true;
  /* or swing over on the rope if there is anything up there to hook, else let yourself down */
  if (!p.ropeCD && Math.random() < 0.8 && pTrySwing(g, p, fx, fy)) return true;
  return pTryAbseil(g, p, fx, fy);
}
function pTryLeap(g, p, fx, fy) {
  if (p.fire || p.cold > 400) return false;   /* (as pTryGap: and a route that says leap does not change that) */
  var dir = p.dir, d, dy, x, k;
  for (k = 0; k <= 8; k++) if (pBody(g, fx, fy - 9 - k)) return false;    /* no room to jump */
  for (d = 3; d <= P_GAP; d++) {
    x = fx + dir * d;
    if (x < 1 || x > g.gw - 2) return false;
    if (pBody(g, x, fy - 9) || pBody(g, x, fy - 12)) return false;          /* something in the way */
    for (dy = -3; dy <= 3; dy++) {
      if (pGround(g, x, fy + dy) && pRoom(g, x, fy + dy)) {
        /* time in the air for a jump that comes down dy lower, then just enough speed to get there */
        var vy = 1.0, t = (vy + Math.sqrt(vy * vy + 2 * P_GRAV * dy)) / P_GRAV;
        pLeap(p, vy, dir * clamp((d + 0.5) / t, 0.15, 0.7));
        if (p.sayT <= 0 && Math.random() < 0.3) pSay(g, p, "jump");
        return true;
      }
    }
  }
  return false;
}
/* -------------------------------------------------------------------
   THE NINJA ROPE. a hook on a line: thrown at a ledge to climb it, at
   something overhead to swing across a gap, tied to the edge of a cliff
   to let yourself down, or flung upward mid-fall to catch yourself.
   the hands hang on a line of length len from the anchor; the line can go
   slack but never stretch. climbing reels it in, abseiling pays it out.
   ------------------------------------------------------------------- */
function pHands(p) { return p.y - 6; }
/* something to stand on that is a floor, not just the foot of a wall they are hanging beside */
function pFloor(g, x, y) {
  return pFoot(g, x, y) || (pFoot(g, x - 1, y) && !pSolid(g, x - 1, y)) || (pFoot(g, x + 1, y) && !pSolid(g, x + 1, y));
}
/* along (dx, dy) from (x0, y0): the last free point before the first solid cell, or null */
function pHookCast(g, x0, y0, dx, dy, max) {
  for (var s = 1; s <= max * 2; s++) {
    var x = x0 + dx * s * 0.5, y = y0 + dy * s * 0.5, cx = Math.floor(x), cy = Math.floor(y);
    if (cy < 0 || cx < 0 || cx >= g.gw) return null;
    if (pSolid(g, cx, cy)) {
      if (pCell(g, cx, cy) === MAT.INERT) return null;   /* magic. the hook just slides off */
      return { x: x0 + dx * (s - 1) * 0.5, y: y0 + dy * (s - 1) * 0.5, cx: cx, cy: cy };
    }
  }
  return null;
}
/* throw the hook at (ax, ay), which sits on solid cell (cx, cy). it bites when it gets there */
function pRopeThrow(g, p, mode, ax, ay, cx, cy, goal, now) {
  var dx = ax - p.x, dy = ay - pHands(p);
  p.rope = { mode: mode, ax: ax, ay: ay, cx: cx, cy: cy, goal: goal, x0: p.x, t: 0,
             dist: Math.sqrt(dx * dx + dy * dy), hook: now ? 1e9 : 0, len: 0, on: false };
  p.idle = 0; p.stun = 0; p.jumping = false;
  if (now) pRopeBite(g, p);
  else g.fx.whee++;
  achieve(g, "ninja");
}
function pRopeBite(g, p) {
  var r = p.rope, dx = p.x - r.ax, dy = pHands(p) - r.ay;
  r.on = true; r.len = Math.max(1.5, Math.sqrt(dx * dx + dy * dy));
  if (pGround(g, Math.floor(p.x), Math.floor(p.y))) {
    p.vy = 0;
    p.vx = r.mode === "swing" || r.mode === "abseil" ? p.dir * 0.3 : 0;   /* and off the edge they go */
  } else { p.vx = 0; p.vy = p.vy || 0; }
  p.falling = false; p.fallY = p.y;
}
/* let go. whatever speed they had, they keep, and come down where it takes them */
function pRopeDrop(g, p, snapped) {
  p.rope = null; p.ropeCD = 90;
  p.jumping = true; p.jx = clamp(p.vx || 0, -1.2, 1.2); p.vy = clamp(p.vy || 0, -2, 3); p.fallY = p.y;
  if (snapped) pSay(g, p, "snap", true);
}
/* a wall too tall to jump: hook the top of it and climb */
function pTryClimb(g, p, fx, fy) {
  if (p.cold > 400 || p.fire) return false;
  var dir = p.dir, nfx = fx + dir, k, j;
  for (k = 4; k <= P_ROPE; k++) if (pRoom(g, nfx, fy - k)) break;
  if (k > P_ROPE) return false;
  /* the line runs straight up the face, so there must be room up there for it and for them */
  for (j = 9; j <= k + 9; j++) if (pBody(g, fx, fy - j)) return false;
  var top = fy - k + 1;   /* the top solid cell of the wall */
  if (!pSolid(g, nfx, top) || pCell(g, nfx, top) === MAT.INERT) return false;
  pRopeThrow(g, p, "climb", dir > 0 ? nfx : nfx + 1, top, nfx, top, fy - k);
  if (p.sayT <= 0 || Math.random() < 0.5) pSay(g, p, "rope", true);
  return true;
}
/* a ledge hanging out overhead, to one side (s), with nothing under its end: hook the top of its edge and climb straight
   up past the end of it, onto it. how a peasant gets onto a floating island. {top: its top solid row, stand: where their
   feet will be up there, h: how far up}, or null */
function pHookGeom(g, x, y, s) {
  var cx = x + s, k, bottom = -1, top;
  if (cx < 1 || cx > g.gw - 2 || pBody(g, cx, y) || pBody(g, cx, y - 1)) return null;   /* a wall: that is pTryClimb's */
  for (k = 2; k <= P_ROPE; k++) if (pBody(g, cx, y - k)) { bottom = y - k; break; }
  if (bottom < 0) return null;
  for (top = bottom; top > 0 && pBody(g, cx, top - 1); top--);
  var stand = top - 1, h = y - stand;
  if (h > P_ROPE || h < 5 || stand < 9) return null;
  /* the way up beside it clear for their whole body, all the way, and room to stand on top */
  for (k = y - 9; k >= stand - 9; k--) if (pBody(g, x, k)) return null;
  if (!pRoom(g, cx, stand) || pCell(g, cx, top) === MAT.INERT) return null;
  return { top: top, stand: stand, h: h };
}
function pTryHook(g, p, fx, fy, s) {
  if (p.cold > 400 || p.fire || p.ropeCD) return false;
  var r = pHookGeom(g, fx, fy, s), cx = fx + s;
  if (!r) return false;
  p.dir = s;
  pRopeThrow(g, p, "climb", s > 0 ? cx : cx + 1, r.top, cx, r.top, r.stand);
  if (p.sayT <= 0 || Math.random() < 0.5) pSay(g, p, "rope", true);
  return true;
}
/* up through something soft overhead (a bush, a tree) onto the top of it, its feet at row ty: a jump if it is low
   enough, else the rope, hooked into the top of it, and up they go, straight through it */
function pTryUp(g, p, fx, fy, ty) {
  var h = fy - ty;
  if (p.cold > 400 || h < 1) return false;
  p.hold = true; p.dir = p.dir || 1;
  if (h <= P_JUMP) { pLeap(p, Math.sqrt(2 * P_GRAV * (h + 2)), 0); return true; }
  if (p.fire || p.ropeCD || h > P_ROPE) return false;
  pRopeThrow(g, p, "climb", fx + 0.5, ty + 1, fx, ty + 1, ty);
  p.rope.up = true;
  if (p.sayT <= 0 || Math.random() < 0.5) pSay(g, p, "rope", true);
  return true;
}
/* down through the bush or the tree they are standing on, onto whatever is under it, if that is no more than max down */
function pTrySink(g, p, fx, fy, max) {
  var d = navSink(g, fx, fy);
  if (d < 0 || d - fy > max) return false;
  p.sink = fy + 1; p.sinkT = 60; p.hold = true;
  return true;
}
/* burning, on a plank deck (a bridge) with water not far under it: straight down through the planks and into the water */
function pTryDive(g, p, fx, fy) {
  if (p.climb || p.rope || p.jumping || p.sink || p.state !== "walk" || pCell(g, fx, fy + 1) !== MAT.PLANK) return false;
  for (var d = 2; d <= 16; d++) {
    var c = pCell(g, fx, fy + d);
    if (WET[c]) { p.sink = fy + 2; p.sinkT = 60; p.hold = true; return true; }
    if (!AIRY[c]) return false;
  }
  return false;
}
/* a gap too wide to leap: hook something up and ahead, and swing over, if there is a far side to land on */
function pTrySwing(g, p, fx, fy) {
  var dir = p.dir, hy = pHands(p), a, h = null, c, rad, d, dy, x;
  /* the farthest hook out over the gap swings the farthest */
  for (a = 15; a <= 65; a += 5) {
    rad = a * Math.PI / 180;
    c = pHookCast(g, p.x, hy, dir * Math.sin(rad), -Math.cos(rad), P_ROPE);
    if (c && (c.x - p.x) * dir >= 3 && (!h || (c.x - h.x) * dir > 0)) h = c;
  }
  if (!h) return false;
  /* the bottom of the swing: hands straight under the hook, a rope's length down. nothing may be in the way of the
     body there, not even water: a swing that dips into a pond stops dead in it, with them on the end */
  var R = Math.sqrt((h.x - p.x) * (h.x - p.x) + (h.y - hy) * (h.y - hy)), low = Math.ceil(h.y + R + 7);
  for (var cx = Math.floor(h.x) - 2; cx <= Math.floor(h.x) + 2; cx++) {
    if (pNasty(g, cx, Math.floor(h.y))) return false;
    for (var cy = Math.floor(h.y) + 1; cy <= low; cy++) { var cc = pCell(g, cx, cy); if ((!AIRY[cc] && !LIQUID[cc]) || cy >= g.gh) return false; }
  }
  /* a swing reaches about as far past the hook as it started short of it, and letting go adds a bit */
  var reach = Math.round((h.x - p.x) * dir * 2) + 10;
  for (d = 3; d <= reach; d++) {
    x = fx + dir * d;
    for (dy = -6; dy <= 6; dy++) if (pGround(g, x, fy + dy) && pRoom(g, x, fy + dy)) {
      pRopeThrow(g, p, "swing", h.x, h.y, h.cx, h.cy, fy);
      pSay(g, p, Math.random() < 0.5 ? "rope" : "swing", true);
      return true;
    }
  }
  return false;
}
/* a long drop: tie the rope to the edge and let yourself down it. unless the bottom is lava, or acid:
   then it is time to find another way */
function pTryAbseil(g, p, fx, fy) {
  var dir = p.dir, nfx = fx + dir, d, c, k;
  for (d = 7; d <= 30; d++) if (pGround(g, nfx, fy + d)) return false;   /* not that far: just drop */
  if (pNasty(g, nfx, fy)) { p.dir = -dir; pSay(g, p, "nope"); return true; }
  if (p.ropeCD || Math.random() > 0.85) return false;
  /* tie it to the ground they are standing on, at the lip */
  for (k = 0; k <= 2; k++) {
    var cx = fx - dir * k;
    if (pSolid(g, cx, fy + 1) && pCell(g, cx, fy + 1) !== MAT.INERT) {
      pRopeThrow(g, p, "abseil", dir > 0 ? cx + 1 : cx, fy + 1, cx, fy + 1, 0, true);
      pSay(g, p, "abseil", true);
      return true;
    }
  }
  return false;
}
/* falling, a long way: fling the hook up at anything at all, and hope */
function pTryCatch(g, p) {
  if (p.rope || p.catchCD || p.fire || p.cold > 400) return false;
  var hy = pHands(p), best = null, a, h;
  for (a = -40; a <= 40; a += 10) {
    h = pHookCast(g, p.x, hy, Math.sin(a * Math.PI / 180), -Math.cos(a * Math.PI / 180), P_ROPE);
    if (h && (!best || h.y > best.y)) best = h;   /* the nearest overhead */
  }
  if (!best) { p.catchCD = 8; return false; }
  pRopeThrow(g, p, "abseil", best.x, best.y, best.cx, best.cy, 0);
  pSay(g, p, "rope", true);
  return true;
}

/* acid and lava: no place to hang about in */
function pBad(c) { return c === MAT.ACID || c === MAT.LAVA; }
/* climb the rope to wherever it is anchored, and get on top of that */
function pRopeUp(g, p) {
  var r = p.rope, y = r.cy;
  while (y > 0 && pSolid(g, r.cx, y - 1)) y--;
  r.mode = "climb"; r.goal = y - 1;
  if (Math.abs(r.ax - p.x) > 0.5) p.dir = r.ax > p.x ? 1 : -1;
}
/* which way to swing to get clear of something nasty below: towards the nearer side that is not */
function pEscapeDir(g, p) {
  var fx = Math.floor(p.x), fy = Math.floor(p.y);
  for (var d = 3; d <= 60; d += 3) {
    if (!pNasty(g, fx + d, fy)) { p.dir = 1; return; }
    if (!pNasty(g, fx - d, fy)) { p.dir = -1; return; }
  }
}
/* one tick on the rope. true if that was their whole tick */
function pRopeStep(g, p) {
  var r = p.rope, fx = Math.floor(p.x), fy = Math.floor(p.y);
  r.t++;
  /* the anchor burned, melted, got eaten or erased: the rope goes with it. and fire eats rope */
  if (!pSolid(g, r.cx, r.cy) || (p.fire && Math.random() < 0.02)) {
    if (r.on) pRopeDrop(g, p, true); else p.rope = null;
    return r.on;
  }
  if (!r.on) {
    /* the hook is still in the air. on the ground, they wait for it; falling or swimming, life goes on */
    r.hook += P_HOOK_V;
    if (r.hook >= r.dist) { pRopeBite(g, p); if (p.sayT <= 0 && r.mode === "abseil" && r.t > 1) pSay(g, p, "caught", true); return true; }
    if (r.t > 30) { p.rope = null; p.ropeCD = 60; return false; }
    return pGround(g, fx, fy) && !p.swimming;
  }
  var hy = pHands(p), dx, dy, d, wet = LIQUID[pCell(g, fx, fy - 4)] || LIQUID[pCell(g, fx, fy)];
  /* in something that hurts (acid, lava): get out of it, up the rope, as fast as hands will go */
  var hurts = pBad(pCell(g, fx, fy)) || pBad(pCell(g, fx, fy - 4)) || pBad(pCell(g, fx, fy - 7));
  if (hurts && r.mode !== "climb") pRopeUp(g, p);
  /* letting themselves down onto something that hurts: stop, and swing off to the side of it */
  if (r.mode === "abseil" && !hurts && pNasty(g, fx, fy) && pDropBelow(g, fx, fy, 14) < 14) { r.mode = "escape"; r.esc = 0; pEscapeDir(g, p); }
  /* reel in, pay out */
  if (r.mode === "climb") r.len = Math.max(1.5, r.len - P_REEL * (hurts ? 3 : 1));
  else if (r.mode === "abseil") r.len = Math.min(P_ROPE * 3, r.len + P_ABSEIL);
  else if (r.mode !== "escape") r.len = Math.max(4, r.len - 0.03);
  p.vy += wet ? P_GRAV * 0.3 : P_GRAV;
  if (wet) {
    p.vx *= 0.9; p.vy *= 0.9;
    /* and they keep swimming while they hold on: head for the air, or tread water at the surface. a rope is
       no reason to sink */
    p.vy -= LIQUID[pCell(g, fx, fy - 7)] ? 0.06 : P_GRAV * 0.3;
  }
  /* swinging: kick on the way forward, like on a playground swing */
  dx = p.x - r.ax; dy = hy - r.ay; d = Math.sqrt(dx * dx + dy * dy) || 1;
  if ((r.mode === "swing" || r.mode === "escape") && dy > 0 && p.vx * p.dir >= 0 && Math.abs(p.vx) < 1.4) {
    p.vx += p.dir * (dy / d) * 0.02; p.vy -= p.dir * (dx / d) * 0.02;   /* along the arc, forward */
  }
  if (r.mode === "abseil") p.vx *= 0.92;   /* abseiling is not swinging */
  /* move, then the rope pulls them back to its length if they went past it */
  var nx = p.x + p.vx, ny = p.y + p.vy;
  dx = nx - r.ax; dy = ny - 6 - r.ay; d = Math.sqrt(dx * dx + dy * dy) || 1;
  if (d > r.len) {
    nx = r.ax + dx / d * r.len; ny = r.ay + dy / d * r.len + 6;
    var out = (p.vx * dx + p.vy * dy) / d;
    if (out > 0) { p.vx -= out * dx / d; p.vy -= out * dy / d; }
  }
  nx = clamp(nx, 1, g.gw - 1);
  /* and the world is in the way of all of it */
  var landed = false;
  if (ny > p.y) {
    var cy = fy;
    while (cy < Math.floor(ny) && !pFloor(g, Math.floor(nx), cy)) cy++;
    if (pFloor(g, Math.floor(nx), cy) && cy <= ny) { ny = cy; landed = true; p.vy = 0; }
  } else if (pBody(g, Math.floor(nx), Math.floor(ny) - 9)) { ny = p.y; p.vy = 0; }
  if (pBlocked(g, nx, ny)) {
    if (!pBlocked(g, p.x, ny)) { nx = p.x; p.vx *= -0.2; }
    else if (!pBlocked(g, nx, p.y)) { ny = p.y; p.vy = 0; }
    else { nx = p.x; ny = p.y; p.vx = p.vy = 0; }
  }
  p.x = nx; p.y = ny; p.fallY = p.y; p.falling = false;
  fx = Math.floor(p.x); fy = Math.floor(p.y);
  /* done? */
  if (r.mode === "climb") {
    var h = p.y - r.goal;
    if (h <= 7 || r.len <= 1.5) {
      /* near enough the top: let go and jump the rest. if it does not work, wait a good while before the next go */
      p.rope = null; p.ropeTries = (p.ropeTries || 0) + 1; p.ropeCD = Math.min(2400, 60 * p.ropeTries * p.ropeTries);
      pLeap(p, Math.sqrt(2 * P_GRAV * (Math.max(h, 0) + 2)), r.up ? 0 : p.dir * 0.3);
      return true;
    }
  } else if (r.mode === "swing") {
    if (landed && Math.abs(p.x - r.x0) > 4) { p.rope = null; p.ropeCD = 60; p.vx = p.vy = 0; return true; }
    /* dipped into the water: keep swimming, and haul themselves up out of it */
    if (wet) r.len = Math.max(4, r.len - 0.15);
    /* past the hook, still going forward, and high enough to clear the far side: let go and fly.
       not high enough yet: swing back and kick harder */
    if ((p.x - r.ax) * p.dir > 2 && p.vx * p.dir > 0.15 && p.y <= r.goal + 1) { pRopeDrop(g, p); return true; }
  } else if (r.mode === "escape" && wet && !hurts) {
    p.rope = null; p.ropeCD = 120; return false;   /* came down in water after all: swim from here */
  } else if (r.mode === "escape") {
    /* swinging away from something nasty underneath: let go once there is somewhere better to land */
    if (landed && !pNasty(g, fx, fy)) { p.rope = null; p.ropeCD = 90; p.vx = p.vy = 0; return true; }
    if (p.vx * p.dir > 0.15 && !pNasty(g, fx, fy) && !pNasty(g, fx + p.dir * 2, fy)) { pRopeDrop(g, p); return true; }
    /* nowhere to swing to: go up the rope instead */
    if (++r.esc > 400) pRopeUp(g, p);
  } else if (landed || wet) {
    /* abseiled all the way down. untie, and off you go */
    p.rope = null; p.ropeCD = 90; p.vx = p.vy = 0;
    return wet ? false : true;
  }
  if (r.t > 900) { pRopeDrop(g, p); return true; }   /* arms give out */
  return true;
}

function pFly(g, p) {
  var gw = g.gw, n, s, nx, ny, spd, hx, vt;
  p.flyT++;
  p.vy += 0.1; p.vx *= 0.995;
  var wet = pCell(g, Math.floor(p.x), Math.floor(p.y) - 2);
  if (LIQUID[wet]) {
    if (!p.wet && p.vy > 0.8) {
      var sc = SAND_DEEP[wet] ? SAND_DEEP[wet][16 * 256] : SAND_PAL[wet][0];
      /* the splash is for show: the pond keeps all its water, and all its heat */
      for (var k = 0; k < 16; k++) partAdd(g, PK_GLINT, p.x + Math.random() * 4 - 2, p.y - 4, (Math.random() - 0.5) * 1.6, -0.8 - Math.random() * p.vy * 0.5, 30 + irnd(20), sc);
      g.fx.splash++;
    }
    p.wet = 1; p.vx *= 0.85; p.vy *= 0.85;
  } else p.wet = 0;
  spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
  if (spd > 5) { p.vx *= 5 / spd; p.vy *= 5 / spd; spd = 5; }
  p.spin += (p.vx >= 0 ? 1 : -1) * (0.05 + spd * 0.07);
  if (pStiffAt(g, p.x, p.y)) { p.state = "walk"; p.spin = 0; return; }   /* started inside something */
  n = Math.ceil(spd * 2) || 1;
  for (s = 0; s < n; s++) {
    nx = p.x + p.vx / n; ny = p.y + p.vy / n;
    /* (on a rocket pack the edge of the world is as good as a wall: they had it pointed at the valley) */
    if (p.launch && (nx < 1 || nx > gw - 1)) { p.vx = -p.vx * 0.5; nx = p.x; }
    if (nx < -4 || nx > gw + 4 || ny > g.gh + 12) { pLeave(g, p); return; }
    if (ny < -40) { pSpace(g, p); return; }
    if (!pStiffAt(g, nx, ny)) { p.x = nx; p.y = ny; continue; }
    hx = pStiffAt(g, nx, p.y); vt = pStiffAt(g, p.x, ny);
    if (spd > 3.7 && !p.immune) { pDie(g, p, p.fromSpace ? "reentry" : "splat"); g.fx.splat++; g.shake = Math.min(8, g.shake + 2); return; }
    if (spd > 2) { g.fx.thud++; if (p.sayT <= 0 || Math.random() < 0.3) pSay(g, p, "oof", true); }
    if (vt || !hx) { p.vy = -p.vy * 0.3; p.vx *= 0.7; }
    if (hx || !vt) { p.vx = -p.vx * 0.4; }
    break;
  }
  var fx = Math.floor(p.x), fy = Math.floor(p.y);
  var onGround = pGround(g, fx, fy);
  /* thrown, and coming down slowly enough to do something about it */
  if (!onGround && p.flyT > 12 && !p.launch && pTryChute(g, p)) { p.state = "walk"; p.spin = 0; return; }
  /* thrown onto ice: they do not stop, they slide, on their back */
  if (onGround && Math.abs(p.vy) < 0.6 && Math.abs(p.vx) > 0.15 && pOnIce(g, fx, fy)) {
    p.state = "walk"; p.spin = 0; p.falling = false; p.fallY = p.y; p.vy = 0; p.stun = 0;
    pSlip(g, p, p.vx / 1.3); p.vx = 0;
    return;
  }
  if (onGround && Math.abs(p.vy) < 0.6) { p.vx *= 0.8; p.vy = 0; }
  if (p.flyT > 900 && (p.x < 0 || p.x >= gw)) { pLeave(g, p); return; }
  if ((onGround && Math.abs(p.vx) < 0.3 && Math.abs(p.vy) < 0.6) || p.flyT > 900) {
    p.state = "walk"; p.spin = 0; p.falling = false; p.fallY = p.y; p.vx = p.vy = 0;
    p.stun = 60; p.pins = 0;
    if (Math.random() < 0.7) pSay(g, p, "dizzy", true);
  }
}
/* -------------------------------------------------------------------
   THE PARACHUTE. it has to come out early: past P_CHUTE_V they are
   falling too fast to open it. and one time in P_CHUTE_FAIL it does not
   open at all, and flaps about overhead, which helps nobody. fire eats
   it. under a good one they drift down gently and steer away from
   anything unpleasant below.
   ------------------------------------------------------------------- */
var P_CHUTE_COLS = ["#e84a4a", "#3a7ae0", "#f0c040", "#4ab84a", "#e070c8", "#f08a30"].map(function (h) { return hex32(h); });
var P_CHUTE_WHITE = hex32("#f4f4ec"), P_CHUTE_LINE = hex32("#c8c8c0");
/* how far below their feet the first thing they would land on is */
function pDropBelow(g, x, y, max) {
  for (var d = 1; d <= max; d++) if (!AIRY[pCell(g, x, y + d)]) return d;
  return max;
}
/* is what is under column x, below row y, somewhere a peasant would rather not land. a pond counts, if there is
   acid or lava lying under the water close enough to the top to reach: you cannot see it from above, but they know */
function pNasty(g, x, y) {
  var d, c, wet = 0;
  for (d = 1; d <= 200; d++) {
    c = pCell(g, x, y + d);
    if (c === MAT.FIRE) return true;
    if (HOT[c] || c === MAT.ACID || c === MAT.DRAIN) return true;
    if (LIQUID[c]) { if (++wet > 12) return false; continue; }
    if (!AIRY[c]) return false;
    if (wet) return false;
  }
  return false;
}
function pTryChute(g, p) {
  if (p.x < 1 || p.x > g.gw - 1) return false;   /* off the side of the world: leave that to the flying */
  if (p.chute || p.chuteCD || p.rope || p.fire || p.cold > 400 || p.vy <= 0.2) return false;
  if (p.vy > P_CHUTE_V || Math.abs(p.vx || 0) > 2) return false;   /* too fast: it would never open */
  if (pDropBelow(g, Math.floor(p.x), Math.floor(p.y), P_CHUTE_H) < P_CHUTE_H) return false;   /* not worth it */
  if (Math.random() > 0.08) return false;                          /* reaching for the cord */
  var fail = Math.random() < P_CHUTE_FAIL;
  p.chute = { t: 0, fail: fail, col: P_CHUTE_COLS[irnd(P_CHUTE_COLS.length)], steer: 0 };
  p.jumping = false; p.vx = p.state === "fly" ? p.vx : (p.jx || 0); p.jx = 0; p.idle = 0; p.stun = 0;
  if (!fail) p.falling = false;   /* a failed one does nothing about the fall: it still counts */
  else { p.falling = true; p.fallY = Math.min(p.fallY, p.y); }   /* measured from the top of the fall */
  pSay(g, p, fail ? "chutefail" : "chute", true);
  g.fx.whee++;
  if (!fail) achieve(g, "chute");
  return true;
}
function pChute(g, p) {
  var c = p.chute, fx = Math.floor(p.x), fy = Math.floor(p.y), tvx = 0;
  c.t++;
  if (p.x < 0 || p.x > g.gw || p.y > g.gh + 12) { p.chute = null; pLeave(g, p); return; }
  /* fire and nylon do not mix */
  if (p.fire && !c.fail && Math.random() < 0.05) {
    c.fail = c.burnt = true; p.falling = true;
    pSay(g, p, "chuteburn", true);
    sparks(g, p.x, p.y - 15, 10, 0.5, SPARK_HOT, 12, 0.3);
  }
  if (!c.fail) {
    /* the canopy bites over a few ticks, then holds them at a gentle sink */
    if (p.vy > P_CHUTE_SINK) p.vy += (P_CHUTE_SINK - p.vy) * Math.min(0.25, c.t * 0.04);
    else p.vy = Math.min(p.vy + P_GRAV, P_CHUTE_SINK);
    /* steer away from lava, acid, fire or drains below; otherwise drift the way they are facing */
    if ((c.t & 7) === 0) {
      c.steer = 0;
      if (pNasty(g, fx, fy)) {
        for (var d = 4; d <= 40 && !c.steer; d += 4) {
          if (!pNasty(g, fx + p.dir * d, fy)) c.steer = p.dir;
          else if (!pNasty(g, fx - p.dir * d, fy)) c.steer = -p.dir;
        }
      }
      if (c.steer) p.dir = c.steer;
    }
    tvx = c.steer ? c.steer * 0.35 : p.dir * 0.06;
    p.vx += (tvx - p.vx) * 0.06;
    p.fallY = p.y;
  } else {
    /* a streamer: barely slows them down */
    p.vy = Math.min(p.vy + P_GRAV * 0.9, 2.8);
    p.vx *= 0.97;
    if (p.sayT <= 0 && Math.random() < 0.05) pSay(g, p, "chutefail", true);
    /* cut it away and try the rope */
    if (p.y - p.fallY > 25 && Math.random() < 0.06) {
      var keep = p.chute; p.chute = null;
      if (pTryCatch(g, p)) return;
      p.chute = keep;
    }
  }
  /* sideways, if nothing is in the way */
  var nx = p.x + p.vx;
  if (nx >= 1 && nx <= g.gw - 1 && !pBlocked(g, nx, p.y)) p.x = nx; else p.vx = 0;
  fx = Math.floor(p.x);
  /* and down, until there is ground */
  var target = p.y + p.vy, cy = fy;
  if (p.vy <= 0) { if (!pSolid(g, fx, Math.floor(target) - 9)) p.y = target; else p.vy = 0; }
  else {
    while (cy < Math.floor(target) && !pGround(g, fx, cy)) cy++;
    if (pGround(g, fx, cy) && cy <= target) {
      p.y = cy; p.chute = null; p.chuteCD = 60; p.vx = 0;
      if (c.fail) { p.falling = true; pLand(g, p, c.burnt ? "fall" : "chute"); }
      else { p.falling = false; p.vy = 0; p.fallY = p.y; if (p.sayT <= 0 || Math.random() < 0.4) pSay(g, p, "touchdown", true); }
      return;
    }
    p.y = target;
  }
  /* came down in water: swim. the canopy stays on the surface */
  if (LIQUID[pCell(g, fx, Math.floor(p.y) - 4)]) { p.chute = null; p.chuteCD = 60; p.falling = false; p.fallY = p.y; p.vy = Math.min(p.vy, 0.3); }
}

/* -------------------------------------------------------------------
   OLD AGE, AND NEWCOMERS. a peasant lives a long while (how long is
   rolled when they are made), and then, asleep or sitting
   about, goes quietly. and a valley with room in it, and houses, gets
   somebody new walking in from the edge of it now and then
   ------------------------------------------------------------------- */
var P_AGE0 = 40000;         /* how old the first villagers are, at the most, when the valley begins */
var P_LIFE = 84000;         /* ticks a peasant lives, at the least */
var P_LIFE_MORE = 30000;    /* and up to this many more */
var P_ARRIVE = 2400;        /* ticks between newcomers, at the least */
/* (how old they are, and how long they have, is in their voice: rolled when they were made, so no two villages alike) */
function pAge(g, p) { if (p.born == null) p.born = (g.tick || 0) - ((p.voice * 7919) | 0) % P_AGE0; return g.tick - p.born; }
function pLifespan(p) { return P_LIFE + ((p.voice * 104729) | 0) % P_LIFE_MORE; }
function pLife(g) {
  var L = g.peasants, k, p, alive = 0;
  for (k = 0; k < L.length; k++) {
    p = L[k];
    if (p.dead) continue;
    alive++;
    /* (quietly: in bed or sitting about, on the ground, not in the middle of anything) */
    if (pAge(g, p) > pLifespan(p) && p.state === "walk" && !p.climb && !p.fire && !p.panic && (p.sleep > 0 || (!p.task && p.idle > 0))) {
      pDie(g, p, "old"); alive--;
      /* (somebody new comes along in a while: not the same day) */
      g.arriveT = Math.max(g.arriveT || 0, g.tick + 1500 + ((p.voice * 31) | 0) % 3000);
    }
  }
  if (g.popGoal == null) { if (g.tick > 60 && alive) g.popGoal = alive; return; }
  /* somebody new: from whichever edge of the valley has ground to walk in on */
  if (alive >= g.popGoal || g.tick < (g.arriveT || 0) || !g.hadPeasants || !g.popGoal) return;
  g.arriveT = g.tick + P_ARRIVE;
  for (var t = 0; t < 400; t++) {
    /* (in from one edge, or the other, as far as there is somewhere to stand: on the ground the village lives on, and
       if there is none of that near either edge, the first ground there is) */
    var u = t % 200, side = (u & 1) === ((g.tick / P_ARRIVE | 0) % 2) ? 1 : -1, x = side > 0 ? 4 + (u >> 1) : g.gw - 5 - (u >> 1);
    var y = t < 200 ? pArriveY(g, x) : mGround(g, x);
    if (y < 10 || !pRoom(g, x, y - 1)) continue;
    var q = peasantSpawn(g, x + 0.5, y - 1, true);
    if (!q) return;
    q.born = g.tick - 20000 - ((q.voice * 7919) | 0) % 15000;   /* (grown up, and not yet old) */
    q.dir = x < g.gw / 2 ? 1 : -1;
    feed(g, q.name + " has moved to the valley", "#a8e08a", "arrive");
    pSay(g, q, "arrive", true);
    if (!g.got.arrive) achieve(g, "arrive");
    return;
  }
}
/* where somebody walking into the valley at column x comes in: onto the ground the village lives on. every ground
   down the column that is not water, a tree or a roof, with room over it, is somewhere they might; the one with the
   most of the village's finished buildings about its height wins, and the highest of those that tie. (so not onto a
   shelf drawn in the sky, or a pond up there, while the houses are all down below. with nothing built yet, or no
   such ground at all: the first ground from the top, as it always was) */
var P_ARRIVE_LEVEL = 24;    /* how far above or below that ground a building still counts as on it */
function pArriveY(g, x) {
  var gw = g.gw, y, c, open = true, best = -1, most = 0, k, n, s;
  for (y = 0; y < g.gh; y++) {
    c = g.m[y * gw + x];
    if (open && bMarked(g, x, y)) break;   /* (a roof, or somebody's site: nobody walks in under that) */
    if (AIRY[c] || P_LEAF[c] || WOODY[c] || P_SOFT[c]) { open = true; continue; }   /* (a bush or a tree: the ground under it) */
    if (!open) continue;   /* (inside something: its top has been looked at already) */
    open = false;
    if (y < 10 || LIQUID[c] || !pRoom(g, x, y - 1)) continue;
    for (n = 0, k = 0; k < g.sites.length; k++) { s = g.sites[k]; if (s.done && Math.abs(s.y1 - y) <= P_ARRIVE_LEVEL) n++; }
    if (best < 0 || n > most) { best = y; most = n; }
  }
  /* (nothing built anywhere: the first ground from the top. buildings, but none about any ground here: not this
     column. pLife looks on along the edge, and falls back on the first ground from the top only if nowhere will do) */
  if (most) return best;
  for (k = 0; k < g.sites.length; k++) if (g.sites[k].done) return -1;
  return mGround(g, x);
}
function pSpace(g, p) {
  p.state = "space"; p.spaceT = 200 + irnd(300);
  feed(g, p.name + " has gone to space", "#9ad0ff");
  g.astronauts++;
  wTale(g, "space", p);
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

/* walking. a few cells of step up, a couple of step down, jump what is taller or wider, turn at the rest */
/* into column x from feet at row y, with no room at that height (pStepUp said a wall): room a step or two lower, and
   ground to stand on there. how far down (1 or 2), or 0 */
/* under water at (fx, fy): which way the nearest column is with air over the water, straight up, that nothing hard
   is in the way of: 1 or -1, 2 if it is right overhead, 0 if there is none near */
function pAirDir(g, fx, fy, no) {
  var open = { "-1": no !== -1, "1": no !== 1 };   /* (no: a way they found blocked) */   /* (a side is given up at the first wall across the way: no swimming through it) */
  for (var bd = 0; bd <= 40; bd++) for (var sd = -1; sd <= 1; sd += 2) {
    if (!bd && sd > 0) continue;
    var X = fx + bd * sd, Y;
    if (bd && !open[sd]) continue;
    if (bd && pBody(g, X, fy - 2) && pBody(g, X, fy - 5) && pBody(g, X, fy - 8)) { open[sd] = false; continue; }   /* (a wall: not just the bottom shelving up) */
    for (Y = fy - 1; Y > fy - 24 && Y > 0; Y--) { var c = pCell(g, X, Y); if (!LIQUID[c] && !P_SOFT[c]) break; }
    /* (and room over the water to get a head up into: not a pocket under a roof) */
    if (AIRY[pCell(g, X, Y)] && AIRY[pCell(g, X, Y - 1)] && AIRY[pCell(g, X, Y - 2)] && !pBody(g, X, Y - 3)) return bd ? sd : 2;
  }
  return 0;
}
/* can p get to within a bucket's throw of q, walking (no wall between them, glass or otherwise) */
function pCanMeet(g, p, q) {
  var h = navHere(g, p), qx = Math.floor(q.x), qy = Math.floor(q.y);
  if (!h) return false;
  NAV_NOROPE = NAV_NOLEAP = true;
  var P = navFind(g, h.x, h.y, function (x, y) { return Math.abs(x - qx) <= 3 && Math.abs(y - qy) <= 4; }, qx, qy, 300);
  NAV_NOROPE = NAV_NOLEAP = false;
  return !!P;
}
/* burning, and running for the water at p.fireTo: a step along the way there (paths.js). how far is left, or -1 if there
   is no way */
function pFireGo(g, p) {
  var t = p.fireTo;
  /* (anywhere they would be standing in it, or right at the edge of it: whichever pool that turns out to be. one look
     for all of them, the nearest towards t) */
  return pathGo(g, p, "wet" + t.k, t.x, t.y, function (x, y) { return Math.abs(x - t.cx) <= t.r && (WET[pCell(g, x, y + 1)] || WET[pCell(g, x, y)] || WET[pCell(g, x, y - 4)]); });
}
function pDuckUnder(g, x, y) {
  for (var d = 1; d <= 2; d++) if (pRoom(g, x, y + d) && pGround(g, x, y + d) && !navHazard(g, x, y + d)) return d;   /* (not onto a drain, or into a fire) */
  return 0;
}
function pStepX(g, p, sp, swim) {
  var nx = p.x + p.dir * sp, nfx = Math.floor(nx), fx = Math.floor(p.x), fy = Math.floor(p.y), k;
  if (nx < 1 || nx > g.gw - 1) { p.dir = -p.dir; return false; }
  if (nfx !== fx) {
    k = pStepUp(g, nfx, fy);
    /* (a lintel, or a low overhang, at head height: and room under it, a step or two down. ducking under it, down
       they go: as a route expects, paths.js navEdges) */
    if (k > 3 && !swim) { var dn = pDuckUnder(g, nfx, fy); if (dn) { p.y = fy + dn; p.x = nx; return true; } }
    if (k > 3) {
      /* a ladder up it: that is what it is for */
      if (!swim && !p.fire && bLadderUp(g, p, fx, fy)) return false;   /* (not burning: they would only let go of it) */
      /* on a route, do what the route says (see paths.js). swimmers always try to climb out; walkers sometimes just
         turn round */
      var nm = p.navMove;
      if ((swim || nm === "jump" || (!nm && Math.random() < 0.7)) && pTryJump(g, p, fx, fy)) return false;
      /* too tall to jump: build some stairs up it, or a ladder. or help with the ones going up */
      if (!swim && (!nm || nm === "rope") && bTryWall(g, p, fx, fy)) return false;
      /* too tall to jump: rope up it. swimmers always try; walkers now and then */
      if (!p.ropeCD && (swim || nm === "rope" || (!nm && (p.task || Math.random() < 0.35))) && pTryClimb(g, p, fx, fy)) return false;
      if (nm && !(nm === "rope" && p.ropeCD)) pathStale(p);   /* the route did not expect a wall here. (a rope it did: they wait until they can) */
      p.dir = -p.dir; return false;
    }
    fy -= k;
    if (!pGround(g, nfx, fy)) for (k = 1; k <= 2; k++) if (pGround(g, nfx, fy + k) && pRoom(g, nfx, fy + k)) { fy += k; break; }
    /* (onto the top of a ladder: down it. unless the route says otherwise: it may only be going across the top of it) */
    if (!swim && !p.fire && !pGround(g, nfx, fy) && (!p.navMove || p.navMove === "ladder") && bLadderDown(g, p, nfx, Math.floor(p.y))) return false;
    if (!swim && !pGround(g, nfx, fy)) {
      /* a route that goes over the edge (or leaps it) knows what is down there */
      if (p.navMove === "leap" && pTryLeap(g, p, fx, Math.floor(p.y))) return false;
      if (p.navMove === "leap") { pathStale(p); if (pTryGap(g, p, fx, Math.floor(p.y))) return false; }   /* the leap is not there any more */
      else if (!((p.navMove === "drop" || p.navMove === "walk") && pathDropOk(g, p, nfx, fy)) && pTryGap(g, p, fx, Math.floor(p.y))) return false;
    }
    /* about to wade into a pond: a bridge would be nice */
    if (!swim && !p.wade && (LIQUID[pCell(g, nfx, fy)] || LIQUID[pCell(g, nfx, fy + 1)]) && bTryBridge(g, p, fx, Math.floor(p.y), true)) return false;
    p.y = fy;
  }
  p.x = nx;
  return true;
}
function pWalk(g, p, wading) {
  iPail(g, p);   /* (a full bucket and nothing to throw it at: it gets put down. ideas.js) */
  tCarry(g, p);  /* (and an armful of sweepings, the same: tidy.js) */
  if (p.stun > 0) { p.stun--; return; }
  if (p.sleep > 0 && bSleeping(g, p)) return;
  /* down on the ice: sliding along on their back until they stop, then up again */
  if (p.slip > 0) { pSlide(g, p); return; }
  var fx = Math.floor(p.x), fy = Math.floor(p.y), scared = p.fire || p.panic > 0;
  if (p.ivx && (wading || !pOnIce(g, fx, fy))) p.ivx = 0;   /* (off the ice: grip again) */
  if (p.panic > 0) p.panic--;
  /* water is fine. a bit wet */
  if (wading && !p.wade && !p.fire && Math.random() < 0.3) pSay(g, p, "wade");
  p.wade = wading;
  p.wadeT = wading ? (p.wadeT || 0) + 1 : 0;
  if (p.idle > 0 && !scared && !(p.cold > 150 && !p.byFire)) { p.idle--; if (Math.random() < 0.008) p.dir = -p.dir; if (p.ivx) pGlide(g, p); }
  else {
    /* look where you are going */
    if (!p.fire) {
      /* (a bucket in hand makes them braver: only flames a couple of steps ahead turn them back, not hot air. they
         keep themselves out of that: see iSafe in ideas.js) */
      var brave = p.task && (p.task.kind === "bucket" || p.task.brave);   /* (or at work at something hot on purpose: heavens.js) */
      var ax = fx + p.dir * (brave ? 2 : 4), a0 = pCell(g, ax, fy), a1 = pCell(g, ax, fy - 3), a2 = pCell(g, ax, fy + 1), a3 = pCell(g, ax, fy - 7);
      if (HOT[a0] || HOT[a1] || HOT[a2] || HOT[a3] || a2 === MAT.ACID || a0 === MAT.ACID || (!brave && (pHotAt(g, ax, fy + 1) || pHotAt(g, ax, fy - 3))) ||
          (!p.fire && !SOLID[a2] && pNasty(g, ax, fy))) {
        /* a fire they lit themselves is not frightening. just hot */
        p.dir = -p.dir; p.task = null;
        if (!p.calmT) { p.panic = Math.max(p.panic, 50); p.bored = 0; if (Math.random() < 0.3) pSay(g, p, "nope"); }
      }
    } else if ((p.anim % 12) === 0) {
      /* burning: run for the nearest water, if there is any, else run about. a village that knows about buckets runs
         for the nearest bucket too, and looks further (ideas.js) */
      var best = 999, reach = g.know.bucket ? 120 : 50;
      if (pTryDive(g, p, fx, fy)) return;   /* (on a bridge: the water is right under them) */
      /* (on a bush over a pond: down through it, into the water) */
      for (var dd = 1; dd <= 10; dd++) {
        var cd = pCell(g, fx, fy + dd);
        if (WET[cd]) { if (!p.sink) { p.sink = fy + dd; p.sinkT = 60; p.hold = true; } return; }
        if (!P_SOFT[cd] && !AIRY[cd]) break;
      }
      /* (up a slope, or down one: water a good way above or below them counts too. the nearest few they can find a
         way to: the first of those is where they run, along the way, every step of it. pFireGo) */
      var W = [];
      for (var dx = -reach; dx <= reach; dx += 2)
        for (var dy = -16; dy <= 14; dy += 2) if (WET[pCell(g, fx + dx, fy + dy)] && !WET[pCell(g, fx + dx, fy + dy - 2)]) { W.push({ x: fx + dx, y: fy + dy, d: Math.abs(dx) }); break; }
      W.sort(function (a, b) { return a.d - b.d; });
      var help = iRescuer(g, p);
      p.fireTo = null;
      /* (the search goes whether or not that look found any: water out of sight of it may still be found by the way there.
         what it found only points the search) */
      p.fireTo = { x: W.length ? W[0].x : fx, y: W.length ? W[0].y : fy, cx: fx, r: reach + 4, k: fx + "," + fy };
      if (pFireGo(g, p) < 0) p.fireTo = null;
      /* (somebody with a bucket: only if there is no way to the water, or they are a step or two off. one across a wall
         from them is no help, and the water is) */
      if (help && (!p.fireTo || (Math.abs(help.x - p.x) <= 8 && pCanMeet(g, p, help)))) { p.fireTo = null; p.dir = help.x < p.x ? -1 : 1; }
      else if (!p.fireTo && W.length) p.dir = W[0].x < fx ? -1 : 1;   /* (no way to any that they can see: straight at the nearest) */
      else if (!p.fireTo && Math.random() < 0.3) p.dir = -p.dir;
    } else if (p.fireTo) {
      pFireGo(g, p);   /* (on along the way to the water, between looks) */
    }
    /* things going bang: home, if there is one to run to */
    if (p.panic > 0 && !p.fire && !wading && !iFlee(g, p)) bHide(g, p);   /* (a house on fire is not somewhere to hide: ideas.js) */
    /* something to do: go there, and do it. (paddling about is no time for it: unless they have been in a good while,
       a pit with something runny in the bottom of it, say, or are hungry, when it is time to be off and find food) */
    /* (struggling in the water, short of breath or in it a long while: nothing matters but the bank. pSwim) */
    var struggling = wading && (p.wadeT > 900 || p.breath < P_BREATH - 60);
    /* (paddling in a puddle on purpose, to bail it out, or across a wet floor to sweep a roof, is not wading: tidy.js) */
    if (!scared && !struggling && (!wading || p.wadeT > 300 || p.hunger > P_HUNGRY || (p.task && (p.task.src || p.task.kind === "tidy") && !p.swimming))) {
      /* (starving, and busy with something else: down tools, and look for food first. once: if there is none to be had,
         eatCD keeps them at the job) */
      if (p.task && p.task.kind !== "eat" && p.hunger > P_HUNGRY * 4 && !p.eatCD && !p.climb && !p.rope && (p.anim % 60) === 0) {
        pFoodTask(g, p);
      }
      if (!p.task && !p.taskCD && (p.anim % 20) === 0) pPickTask(g, p);
      if (p.task) {
        var busy = pTask(g, p);
        /* gave up on it (out of reach, gone, taking too long): leave it a while before looking for another */
        if (!p.task && p.taskDone !== true) p.taskCD = 300;
        p.taskDone = false;
        if (busy) { if (p.ivx) pGlide(g, p); return; }   /* (busy, on the ice: but still going) */
      }
    } else p.task = null;
    /* nothing to do, on top of a bush or a tree: now and then, down through it. or in one: up onto the top */
    if (!scared && !p.task && !wading && !p.hold) {
      if (Math.random() < 0.002) pTrySink(g, p, fx, fy, 20);
      else if (P_SOFT[pCell(g, fx, fy)] && Math.random() < 0.004) { var up = navUp(g, fx, fy); if (up >= 0 && fy - up <= P_JUMP) pTryUp(g, p, fx, fy, up); }
    }
    var rush = p.task && p.task.kind === "bucket" && p.task.site;   /* (the bucket brigade runs) */
    var pace = (p.fire ? 0.5 : (p.panic || rush ? 0.4 : (wading ? 0.12 : 0.18))) * (p.cold > 200 ? 0.5 : 1);
    if (p.hold) { if (p.ivx) pGlide(g, p); }
    else if (!wading && pOnIce(g, fx, fy)) pIceStep(g, p, pace);
    else pStepX(g, p, pace);
    if (!scared && !p.task) {
      if (Math.random() < 0.003) p.idle = 40 + irnd(160);
      else if (Math.random() < 0.0015) p.dir = -p.dir;
    }
  }
  /* time passes. stomachs rumble, and nothing happens, and nothing goes on happening */
  p.hunger = (p.hunger || 0) + 1;
  /* (a very long time without anything: weak with it, and in the end, gone. it takes the best part of five minutes) */
  if (p.hunger > P_STARVE) { pDie(g, p, "starve"); return; }
  if (p.hunger > P_STARVE * 0.6 && p.sayT <= 0 && Math.random() < 0.003) pSay(g, p, "starving", true);
  p.tired = (p.tired || 0) + 1;
  if (scared) p.bored = 0; else p.bored = (p.bored || 0) + 1;
  if (!scared && --p.chat <= 0) {
    p.chat = 500 + irnd(1200);
    var near = Math.abs(g.cx - p.x) < 14 && Math.abs(g.cy - p.y + 4) < 14 && g.mx > PANEL;
    pSay(g, p, wading ? "swim" : (near ? "watched" : (p.hunger > P_HUNGRY ? "hungry" : (p.bored > P_BORED_CHOP ? "bored" : "idle"))));
  }
}

/* -------------------------------------------------------------------
   ICE. on ice a peasant takes a while to get going, and a good deal
   longer to stop. try to turn round in a hurry (or run, as they do when
   they are frightened or on fire) and the feet go out from under them,
   and they go down, and slide along on their back until the ice runs
   out, or a wall comes, or somebody else's legs do. thrown onto ice,
   they do not stop either
   ------------------------------------------------------------------- */
var P_ICE_GRIP = 0.005;   /* how much a step on ice can change how fast they are going, a tick */
P_SAY.slip = ["WHOA", "WHOOAAA", "MY FEET", "AAAA", "oh no oh no", "wheeee", "not again", "ICE!"];
P_SAY.slipped = ["ow", "my bum", "who put ice here", "i meant to do that", "ice. why is it always ice", "ten out of ten",
  "ouch", "nobody saw that", "my dignity"];
P_SAY.skid = ["whoa whoa whoa", "stop stop stop", "brakes!", "slippy", "*windmills*", "i can't stop"];
P_ACHIEVE.slip = ["ON THIN ICE", "a peasant slipped over. it was not dignified"];
function pOnIce(g, x, y) { return pCell(g, x, y + 1) === MAT.ICE; }
/* a step, on ice: they push the way they want to go, and go the way they are going */
function pIceStep(g, p, sp) {
  var v = p.ivx || 0, d = p.dir;
  v += clamp(d * sp - v, -P_ICE_GRIP, P_ICE_GRIP);
  p.ivx = v;
  /* the feet going one way and the rest of them the other: arms going like windmills. now and then, down they go:
     more often turning at speed, or at a run */
  var skid = v * d < -0.03, fast = Math.abs(v) > 0.3;
  if (Math.random() < (skid ? 0.01 + Math.abs(v) * 0.12 : (fast ? 0.005 : 0.0006))) { pSlip(g, p, v); return; }
  if (skid || (fast && Math.abs(v) < sp * 0.9)) p.pose = (p.anim >> 2) & 1 ? "panicA" : "panicB";
  if (skid && p.sayT <= 0 && Math.random() < 0.03) pSay(g, p, "skid");
  if (Math.abs(v) < 0.01) return;   /* feet going, getting nowhere */
  p.dir = v < 0 ? -1 : 1;
  if (!pStepX(g, p, Math.abs(v)) && !p.jumping && !p.climb && !p.rope) p.ivx = 0;   /* into something: stopped dead */
  if (p.dir === (v < 0 ? -1 : 1)) p.dir = d;   /* (still facing where they wanted to go, unless a wall turned them) */
}
/* not stepping (standing about, busy at something): on ice, still going, a little slower every tick */
function pGlide(g, p) {
  var fx = Math.floor(p.x), fy = Math.floor(p.y), v = (p.ivx || 0) * 0.985, d = p.dir;
  if (!pOnIce(g, fx, fy) || Math.abs(v) < 0.02 || p.climb || p.rope || p.jumping) { p.ivx = 0; return; }
  p.ivx = v; p.dir = v < 0 ? -1 : 1;
  if (!pStepX(g, p, Math.abs(v)) && !p.jumping && !p.climb && !p.rope) p.ivx = 0;
  if (p.dir === (v < 0 ? -1 : 1)) p.dir = d;
}
/* feet out from under them, going at v: down they go */
function pSlip(g, p, v) {
  p.slip = 45 + irnd(45); p.ivx = clamp((v || 0) * 1.3, -0.9, 0.9); p.idle = 0; p.jumping = false; p.pose = null;
  if (p.pail) iSpill(g, p);   /* (a full bucket goes everywhere) */
  pSay(g, p, "slip", true); g.fx.thud++;
  g.slips = (g.slips || 0) + 1;
  wTale(g, "ice", p);
  lSlipped(g, p);   /* (somewhere to put salt, and an idea: leftovers.js) */
  achieve(g, "slip");
  if (g.tick > (g.slipT || 0)) { g.slipT = g.tick + 2400; feed(g, p.name + " slipped on the ice", "#cfeaff", "slip"); }
}
/* on their back, sliding: over the smallest of bumps, off any edge, back off a wall, and into anybody standing about
   on the ice, who goes down too. then, once they have stopped and got their breath back, up again */
function pSlide(g, p) {
  var fx = Math.floor(p.x), fy = Math.floor(p.y), v = p.ivx || 0, k, q;
  p.idle = 0; p.pose = null;
  v *= pOnIce(g, fx, fy) ? 0.993 : 0.8;
  if (Math.abs(v) > 0.02) {
    var nx = p.x + v, nfx = Math.floor(nx);
    if (nx < 1 || nx > g.gw - 1) v = 0;
    else if (nfx !== fx && (k = pStepUp(g, nfx, fy)) > 1) {
      if (Math.abs(v) > 0.2) { g.fx.thud++; if (p.sayT <= 0) pSay(g, p, "oof", true); }
      v = -v * 0.25;
    } else {
      if (nfx !== fx) {
        fy -= k;
        if (!pGround(g, nfx, fy)) for (k = 1; k <= 2; k++) if (pGround(g, nfx, fy + k) && pRoom(g, nfx, fy + k)) { fy += k; break; }
        p.y = fy;
      }
      p.x = nx;
    }
    for (k = 0; k < g.peasants.length && Math.abs(v) > 0.15; k++) {
      q = g.peasants[k];
      if (q === p || q.dead || q.state !== "walk" || q.slip > 0 || q.climb || q.rope || Math.abs(q.x - p.x) > 1.5 || Math.abs(q.y - p.y) > 3 ||
          !pOnIce(g, Math.floor(q.x), Math.floor(q.y))) continue;
      pSlip(g, q, v * 0.7); v *= 0.6;
      if (p.sayT <= 0 || Math.random() < 0.5) pSay(g, p, "dizzy", true);
    }
  }
  p.ivx = v;
  if (--p.slip > 0) return;
  if (Math.abs(v) > 0.02) { p.slip = 1; return; }   /* (still going) */
  p.slip = 0; p.ivx = 0;
  if (p.sayT <= 0 || Math.random() < 0.5) pSay(g, p, "slipped", true);
}

/* -------------------------------------------------------------------
   CHORES AND MISCHIEF. a hungry peasant goes and eats a plant. a bored
   one goes and chops some wood, and keeps the logs. a really bored one
   goes and sets fire to something: but only something small, with
   nothing explosive near it, nobody standing next to it and nothing
   above it to catch. failing that, if they have the logs, a campfire.
   ------------------------------------------------------------------- */
var P_FOOD = new Uint8Array(NMAT); P_FOOD[MAT.PLANT] = P_FOOD[MAT.FLOWER] = P_FOOD[MAT.SEED] = P_FOOD[MAT.WHEAT] = 1;
var P_WOOD = new Uint8Array(NMAT); P_WOOD[MAT.WOOD] = 1;
var P_FLAM = new Uint8Array(NMAT);
[MAT.WOOD, MAT.PLANT, MAT.FLOWER, MAT.SEED, MAT.OIL, MAT.GAS, MAT.GUNPOWDER, MAT.FIREWORK, MAT.NUKE, MAT.EMBER,
 MAT.PLANK, MAT.DOOR, MAT.LADDER, MAT.STAIRS, MAT.BED, MAT.SAPLING, MAT.CROP, MAT.WHEAT, MAT.LAMP, MAT.COAL].forEach(function (v) { P_FLAM[v] = 1; });
var P_BANG = new Uint8Array(NMAT); P_BANG[MAT.GAS] = P_BANG[MAT.GUNPOWDER] = P_BANG[MAT.FIREWORK] = P_BANG[MAT.NUKE] = 1;
var P_TINDER = new Uint8Array(NMAT); P_TINDER[MAT.WOOD] = P_TINDER[MAT.PLANT] = P_TINDER[MAT.FLOWER] = P_TINDER[MAT.SEED] = P_TINDER[MAT.OIL] = 1;

/* the nearest cell of a kind they could reach from about where they stand: from their feet to just over their
   head (or, given far, that much further up and down: somewhere to walk to, over hills). ok, if given, has the last
   word on whether a cell will do */
function pFind(g, p, set, R, ok, far) {
  var fx = Math.floor(p.x), fy = Math.floor(p.y), d, s, x, y, low, hi;
  far = far || 0;
  for (d = 0; d <= R; d++) for (s = 0; s < 2; s++) {
    if (d === 0 && s) continue;
    x = fx + d * (s ? -p.dir : p.dir);   /* the way they are facing first */
    if (x < 0 || x >= g.gw) continue;
    /* the ground at their feet, for a nibble; never wood they might be standing on. wood is chopped from the
       bottom up, the way you fell a tree */
    low = (set === P_WOOD && d <= 2 ? fy : fy + 1) + (d > 6 ? far : 0); hi = fy - 10 - (d > 6 ? far : 0);
    if (set === P_WOOD) { for (y = low; y >= hi; y--) if (y >= 0 && y < g.gh && set[g.m[y * g.gw + x]] && (!ok || ok(g, x, y))) return { x: x, y: y }; }
    else for (y = hi; y <= low; y++) if (y >= 0 && y < g.gh && set[g.m[y * g.gw + x]] && (!ok || ok(g, x, y))) return { x: x, y: y };
  }
  return null;
}
/* the nearest ripe wheat in any field, however far: where the really hungry go (a field is what it is there for, and
   somebody got to it to sow it), rather than a bush up a cliff somewhere they cannot get to */
/* is (x, y) in a field p has lately found it cannot get to (pFieldFood, pGiveUp) */
function pNoField(g, p, x, y) {
  if (!p.noField || !P_FOOD[pCell(g, x, y)]) return false;
  var f = bSiteAround(g, x, y, "farm", 1);
  return !!f && p.noField[f.id] > g.tick;
}
function pFieldFood(g, p) {
  var E = [], byX = {}, ids = {}, k, j, s, e, x, y, d, near = null, h = navHere(g, p);
  if (!p.noField) p.noField = {};
  for (k in p.noField) if (p.noField[k] <= g.tick) delete p.noField[k];   /* (forgotten, in time) */
  for (k = 0; k < g.sites.length; k++) {
    s = g.sites[k];
    if (s.kind !== "farm" || p.noField[s.id] > g.tick || pAvoid(g, p, s.cx)) continue;
    /* (the ripe ears are at the tops of the stalks, over the cells that were sown) */
    for (j = 0; j < s.plan.length; j++) {
      e = s.plan[j];
      if (e.v !== MAT.CROP) continue;
      x = e.i % g.gw;
      /* (up the stalk, green or ripe, to the top of it: a stalk ripe all the way down to the root has its ear up there too) */
      for (y = (e.i / g.gw) | 0; y >= 0 && (g.m[y * g.gw + x] === MAT.CROP || g.m[y * g.gw + x] === MAT.WHEAT); y--);
      y++;
      if (g.m[y * g.gw + x] !== MAT.WHEAT || !pEdible(g, x, y)) continue;
      d = Math.abs(x + 0.5 - p.x) + Math.abs(y - p.y);
      var ear = { x: x, y: y, d: d, s: s };
      E.push(ear); (byX[x] = byX[x] || []).push(ear); ids[s.id] = 1;
      if (!near || d < near.d) near = ear;
    }
  }
  if (!near) return null;
  if (!h) return near;
  /* (one look for a way to any of them, the nearest first: the one they can get to is the one they go for. a field
     with none they can reach, past a wall or across a lake, is let be a while) */
  function reach(X, Y) {   /* (the reach the eat task walks to: pTask's pathNear(x, y, 3, 10, 2)) */
    var best = null, bd = 1e9;
    for (var xx = X - 3; xx <= X + 3; xx++) { var L = byX[xx]; if (L) for (var q = 0; q < L.length; q++) if (L[q].y >= Y - 10 && L[q].y <= Y + 2) {
      var dd = Math.abs(L[q].x - X) + Math.abs(L[q].y - Y); if (dd < bd) { bd = dd; best = L[q]; } } }
    return best;   /* (the nearest of them, from there) */
  }
  var P = navFind(g, h.x, h.y, function (X, Y) { return !!reach(X, Y); }, near.x, near.y);
  if (P) {
    if (!P.length) { var here = reach(h.x, h.y); return here && Math.abs(near.x - h.x) <= 3 && near.y >= h.y - 10 && near.y <= h.y + 2 ? near : (here || near); }   /* (in reach already: the nearest) */
    var end = P[P.length - 1]; return reach(end.x, end.y) || near;
  }
  for (k in ids) p.noField[k] = g.tick + 6000;
  return null;
}
/* food is what grows up out of the ground: follow it down, through more of itself, to soil. a roof (it ends in wood)
   and a tree's crown (it ends in air) are not food. and leave a few of every patch, so it can grow back. (not wheat:
   wheat is grown to be eaten, all of it, and the field is sown again) */
function pEdible(g, x, y) {
  var d, c, n = 0, dx, dy;
  for (d = 1; d <= 40; d++) {
    c = pCell(g, x, y + d);
    if (P_FOOD[c]) continue;
    if (!SOLID[c] || WOODY[c]) return false;
    break;
  }
  if (d > 40) return false;
  if (pCell(g, x, y) === MAT.WHEAT) return !LEAFY[pCell(g, x, y - 1)];   /* (from the ear down: no stalks left hanging) */
  for (dy = -3; dy <= 3; dy++) for (dx = -3; dx <= 3; dx++) if ((dx || dy) && P_FOOD[pCell(g, x + dx, y + dy)]) n++;
  return n >= 3;
}
/* is this wood part of something somebody built: a run of wood six wide, well up off the bottom of it, with nothing
   under most of it (a ceiling, a floor, a bridge). a trunk, a pile of logs or a solid lump is fair game; a hut is not */
function pBuilt(g, x0, y0) {
  var gw = g.gw, gh = g.gh, m = g.m, seen = {}, list = [y0 * gw + x0], n = 0, i, x, y, k, j, bottom = y0;
  seen[list[0]] = 1;
  while (n < list.length) {
    if (list.length > 500) return true;   /* that much wood is a building, or as good as */
    i = list[n++]; x = i % gw; y = (i / gw) | 0;
    if (y > bottom) bottom = y;
    for (k = 0; k < 4; k++) {
      j = sandNb(g, x, y, k);
      if (j >= 0 && !seen[j] && m[j] === MAT.WOOD) { seen[j] = 1; list.push(j); }
    }
  }
  for (n = 0; n < list.length; n++) {
    i = list[n]; x = i % gw; y = (i / gw) | 0;
    if (bottom - y < 5 || x + 5 >= gw) continue;
    for (k = 1; k < 6 && m[i + k] === MAT.WOOD; k++);
    if (k < 6) continue;
    for (j = 0, k = 0; k < 6; k++) if (y + 1 < gh && AIRY[m[i + gw + k]]) j++;
    if (j >= 4) return true;
  }
  return false;
}
function pChoppable(g, x, y) { return !bMarked(g, x, y) && !pBuilt(g, x, y) && !pGrowing(g, x, y); }
/* a tree still growing: its trunk goes up into a live sapling tip. nobody chops one of those (it was planted for later) */
function pGrowing(g, x, y) {
  for (var k = 0; k < 16 && y - k >= 0; k++) {
    var c = g.m[(y - k) * g.gw + x];
    if (c === MAT.SAPLING) return true;
    if (c !== MAT.WOOD) return false;
  }
  return false;
}
/* the next stroke of a cut: wood near the last stroke on the same row, else the lowest near it */
function pFindCut(g, p, cx, row) {
  var fy = Math.floor(p.y), fx = Math.floor(p.x), best = null, x, y;
  for (x = cx - 4; x <= cx + 4; x++) for (y = Math.abs(x - fx) > 2 ? fy + 1 : fy; y >= fy - 10; y--) {
    if (pCell(g, x, y) !== MAT.WOOD || !pChoppable(g, x, y)) continue;
    var score = (y === row ? 1000 : y) - Math.abs(x - cx) * 0.01;
    if (!best || score > best.s) best = { x: x, y: y, s: score };
  }
  return best;
}
/* chopped through: if what is above no longer stands on anything, down it comes */
function pFell(g, p, x0, y0) {
  var gw = g.gw, m = g.m, seen = {}, k, j;
  function tree(c) { return c === MAT.WOOD || c === MAT.PLANT || c === MAT.FLOWER; }
  /* every piece that touched the cut, separately: a stump left standing does not hold up the top */
  for (k = 0; k < 4; k++) {
    j = sandNb(g, x0, y0, k);
    if (j >= 0 && tree(m[j]) && !seen[j]) pFellPiece(g, p, x0, y0, j, seen, tree);
  }
}
function pFellPiece(g, p, x0, y0, start, seen, tree) {
  var gw = g.gw, gh = g.gh, m = g.m, list = [start], n = 0, i, x, y, k, j, c, held = false;
  seen[start] = 1;
  while (n < list.length) {
    if (list.length > 1200) held = true;   /* too big to topple, or tangled up in something else */
    i = list[n++]; x = i % gw; y = (i / gw) | 0;
    /* standing on something that is not more of the tree: it holds */
    c = y + 1 < gh ? m[i + gw] : MAT.STONE;
    if (SOLID[c] && !tree(c)) held = true;
    for (k = 0; k < 4; k++) {
      j = sandNb(g, x, y, k);
      if (j >= 0 && !seen[j] && tree(m[j])) { seen[j] = 1; list.push(j); }
    }
  }
  if (held || g.np + list.length > PMAX - 200) return;
  /* timber. it goes over the way it was being chopped, the top falling furthest */
  var top = gh;
  for (n = 0; n < list.length; n++) top = Math.min(top, (list[n] / gw) | 0);
  for (n = 0; n < list.length; n++) {
    i = list[n]; y = (i / gw) | 0;
    var h = (y0 - y) / Math.max(1, y0 - top);
    sandFling(g, i, p.dir * (0.2 + h * 1.2) + (Math.random() - 0.5) * 0.2, -0.2 * h);
  }
  g.fx.thud++; g.shake = Math.min(6, g.shake + 2);
  pSay(g, p, "timber", true);
}
/* a few chips or leaves off whatever they are working at. only for show: these light nothing */
function pChips(g, x, y, n, cols) {
  for (var k = 0; k < n; k++) {
    var a = Math.random() * 6.2832, s = 0.2 + Math.random() * 0.4;
    partAdd(g, PK_GLINT, x, y, Math.cos(a) * s, Math.sin(a) * s - 0.2, 8 + irnd(8), pick(cols));
  }
}
/* could they light the thing at (x0, y0) and not regret it. the patch of flammable things it is part of (counting
   anything within two cells as part of it) must be small, explosive-free, and have nothing flammable above it
   for the hot air to find, and nobody near it: the one lighting it included, who must be standing well clear of
   it, off to one side. returns the patch's bounds, or null */
function pSafeToLight(g, p, x0, y0) {
  var gw = g.gw, gh = g.gh, m = g.m, seen = {}, list = [y0 * gw + x0], n = 0, i, x, y, dx, dy, j;
  var x1 = x0, x2 = x0, y1 = y0, y2 = y0;
  seen[list[0]] = 1;
  while (n < list.length) {
    i = list[n++];
    if (n > P_LIGHT_MAX) return null;        /* too big */
    if (P_BANG[m[i]]) return null;           /* too exciting */
    x = i % gw; y = (i / gw) | 0;
    if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y;
    for (dy = -2; dy <= 2; dy++) for (dx = -2; dx <= 2; dx++) {
      var nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
      j = ny * gw + nx;
      if (!seen[j] && P_FLAM[m[j]]) { seen[j] = 1; list.push(j); }
    }
  }
  /* anything explosive nearby, anything to catch above, or anything else that burns close by to either side */
  for (y = Math.max(0, y1 - 18); y <= Math.min(gh - 1, y2 + 6); y++) for (x = Math.max(0, x1 - 8); x <= Math.min(gw - 1, x2 + 8); x++) {
    j = y * gw + x;
    if (P_BANG[m[j]]) return null;
    if (P_FLAM[m[j]] && !seen[j] && y < y1 && x >= x1 - 3 && x <= x2 + 3) return null;
    if (P_FLAM[m[j]] && !seen[j] && y >= y1 - 6) return null;
  }
  /* nowhere near anything anybody has built */
  for (k = 0; k < g.sites.length; k++) {
    var st = g.sites[k];
    if (x2 + 14 >= st.x0 && x1 - 14 <= st.x1 && y2 + 14 >= st.y0 && y1 - 20 <= st.y1) return null;
  }
  /* nobody else anywhere near it, ducks included */
  for (var k = 0; k < g.peasants.length; k++) {
    var q = g.peasants[k];
    if (q !== p && !q.dead && q.x > x1 - 8 && q.x < x2 + 9 && q.y > y1 - 4 && q.y < y2 + 14) return null;
  }
  for (k = 0; k < (g.ducks ? g.ducks.length : 0); k++) {
    var dk = g.ducks[k];
    if (!dk.dead && dk.x > x1 - 8 && dk.x < x2 + 9 && dk.y > y1 - 4 && dk.y < y2 + 10) return null;
  }
  return { x1: x1, x2: x2, y1: y1, y2: y2 };
}
/* how far they are standing from the side of a patch: 0 if they are over it */
function pClear(p, b) { return p.x < b.x1 ? b.x1 - p.x : (p.x > b.x2 + 1 ? p.x - b.x2 - 1 : 0); }
/* somewhere they could build a campfire at x: flat ground, open sky over it, nothing flammable near, nobody else
   close, and them a few cells off to one side of it */
/* what a campfire is built of: logs, or coal out of the mine */
function pFuel(c) { return c === MAT.WOOD || c === MAT.COAL; }
function pCampOk(g, p, x, fy, stacked) {
  var k, y, c, clear = pClear(p, { x1: x - 1, x2: x + 1 });
  if (clear < 2.5 || clear > 5 || Math.abs(p.y - fy) > 1.5) return false;
  if (bSiteAround(g, x, fy, null, 3)) return false;   /* not on somebody's field, or by their cross: the bucket brigade would only put it out */
  for (k = -1; k <= 1; k++) {
    if (!pSolid(g, x + k, fy + 1) && !(stacked && pFuel(pCell(g, x + k, fy + 1)))) return false;
    /* empty, or (once they have stacked them) their own logs, or coal */
    for (y = fy - 1; y <= fy; y++) { c = pCell(g, x + k, y); if (!AIRY[c] && !(stacked && pFuel(c))) return false; }
  }
  for (y = fy - 20; y <= fy + 1; y++) for (k = -5; k <= 5; k++) {
    c = pCell(g, x + k, y);
    if ((P_FLAM[c] && !(y >= fy - 1 && Math.abs(k) <= 1 && pFuel(c))) || (y < fy - 1 && SOLID[c] && Math.abs(k) <= 2)) return false;
  }
  for (k = 0; k < g.peasants.length; k++) {
    var q = g.peasants[k];
    if (q !== p && !q.dead && Math.abs(q.x - x) < 6 && Math.abs(q.y - fy) < 10) return false;
  }
  return true;
}
/* something to eat, if they are hungry and there is some to be had: an eat task, and true. (a peasant who went looking
   for food and found none gets on with other things for a while. really hungry: further, and further up and down, out
   of a mine to the fields, ripe wheat first. starving: anywhere at all) */
function pFoodTask(g, p) {
  if (lSnack(g, p)) return true;   /* (a salt fish out of their pocket: leftovers.js) */
  var t = null, edible = function (g2, x, y) { return !pAvoid(g2, p, x) && pEdible(g2, x, y) && !pNoField(g2, p, x, y); };
  if (p.hunger > P_HUNGRY && !p.eatCD) {
    var vh = p.hunger > P_HUNGRY * 2;
    t = (vh && pFieldFood(g, p)) || pFind(g, p, P_FOOD, p.hunger > P_HUNGRY * 4 ? g.gw : (vh ? 220 : 60), edible, vh ? 90 : 40);
    if (!t) p.eatCD = vh ? 400 : 900;
  }
  else if (p.hunger > 900) t = pFind(g, p, P_FOOD, 4, edible);   /* a snack, if it is right there */
  if (!t) return false;
  p.task = { kind: "eat", x: t.x, y: t.y, t: 0, act: 0, n: 0, want: p.hunger > P_HUNGRY * 2 };   /* (a long walk, for the really hungry) */
  return true;
}
function pPickTask(g, p) {
  var t = null, b;
  /* the village is on fire, and they know about buckets: that comes before anything (ideas.js) */
  if (iUrgent(g, p)) return;
  /* really hungry: food comes before rocket packs and building (pFoodTask again, below, for the merely peckish) */
  if (p.hunger > P_HUNGRY * 2 && pFoodTask(g, p)) return;
  /* iron in their pocket and oil in a tank: a rocket pack (oil.js) */
  if (oFirst(g, p)) return;
  /* wood in hand and something to build with it: that comes before lunch */
  if (bCarries(p) && p.cold <= 80 && p.hunger <= P_HUNGRY * 2) {   /* (unless they are really hungry) */ var bs = bNearestSite(g, p, 170); if (bs) { bJoin(g, p, bs); return; } }
  var choppable = function (g2, x, y) { return !pAvoid(g2, p, x) && pChoppable(g2, x, y); };
  if (pFoodTask(g, p)) return;
  /* bed, warmth, building, planting: see build.js. bright ideas, and what came of them: ideas.js */
  if (bPick(g, p)) return;
  if (iPick(g, p)) return;
  if (p.bored > P_BORED_FIRE && Math.random() < 0.25) {
    t = pFind(g, p, P_TINDER, 40);
    if (t && (b = pSafeToLight(g, p, t.x, t.y))) { p.task = { kind: "light", x: t.x, y: t.y, b: b, t: 0, act: 0 }; return; }
    if ((p.logs || 0) >= 3 || (p.coal || 0) >= 3) {
      var cx = Math.floor(p.x) + p.dir * 5;   /* the near log three to four cells off */
      if (pCampOk(g, p, cx, Math.floor(p.y))) { p.task = { kind: "camp", x: cx, y: Math.floor(p.y), t: 0, act: 0, coal: (p.logs || 0) < 3 }; return; }
    }
  }
  /* wood: when bored, or when there is something to build with it */
  var want = bWoodWanted(g, p);
  if ((p.logs || 0) < P_LOGS && !p.chopCD && (p.bored > P_BORED_CHOP || (want && Math.random() < 0.3) || Math.random() < 0.05)) {
    t = pFind(g, p, P_WOOD, want ? 140 : (p.bored > P_BORED_CHOP ? 40 : 3), choppable, want ? 60 : 0);
    if (t) { p.task = { kind: "chop", x: t.x, y: t.y, t: 0, act: 0, n: 0, want: want }; return; }
    /* wood wanted, and not a tree left standing: somebody had better plant some */
    if (want) iTreeless(g, p);   /* (and somebody had better think about that: ideas.js) */
    if (want && !p.plantCD) { p.wantPlant = true; p.plantCD = 2400; }
  }
}
/* walking somewhere for a job, d away from it: true once they have gone a good while without getting any closer
   (a wall in the way, a house with its door round the other side). they cannot see round corners */
function pStuck(p, k, d) {
  if (k.best == null || d < k.best - 1) { k.best = d; k.since = 0; return false; }
  return ++k.since > 320;
}
/* give up on a job they could not get to, and steer clear of that spot for a while */
function pGiveUp(g, p, x) {
  if (p.task && p.task.kind === "eat") {
    p.eatCD = p.hunger > P_HUNGRY * 2 ? 300 : 900;
    /* (a field they could not get to is let be a while: there may be another they can. pFieldFood) */
    var f = bSiteAround(g, p.task.x, p.task.y, "farm", 1);
    if (f) { if (!p.noField) p.noField = {}; p.noField[f.id] = g.tick + 6000; }
  }
  p.avoidX = x; p.avoidT = g.tick + 2400; p.task = null; p.taskCD = 120;
}
function pAvoid(g, p, x) { return p.avoidT > g.tick && Math.abs(x - p.avoidX) < 10; }
/* one tick of a task. true if they spent it working; false to keep walking (towards the job, or away from it) */
function pTask(g, p) {
  var k = p.task, b = bTask(g, p, k);
  if (b !== undefined) return b;
  var gw = g.gw, fx = Math.floor(p.x), fy = Math.floor(p.y), j = k.y * gw + k.x, c, set, more, ok;
  if (++k.t > (k.want ? 2400 : 900)) { if (k.kind === "eat") pGiveUp(g, p, k.x); else p.task = null; return false; }   /* (food they never got to: let be) */
  set = k.kind === "eat" ? P_FOOD : (k.kind === "chop" ? P_WOOD : (k.kind === "light" ? P_TINDER : null));
  ok = k.kind === "eat" ? pEdible : (k.kind === "chop" ? pChoppable : null);
  /* the thing went away (somebody else ate it, it burned...): find another like it close by, or give up */
  if (set && !set[g.m[j]]) {
    var t = k.kind === "light" ? null : pFind(g, p, set, 4, ok);
    if (!t) { p.task = null; return false; }
    k.x = t.x; k.y = t.y; j = k.y * gw + k.x;
  }
  if ((k.kind === "light" || k.kind === "camp") && (k.y < fy - 10 || k.y > fy + 2)) {
    /* out of reach up or down: forget it once close enough to see that */
    if (Math.abs(k.x + 0.5 - p.x) < 6) { p.task = null; return false; }
  }
  var dx = k.x + 0.5 - p.x;
  if (k.kind === "light") {
    /* stand off to the side of the patch, two and a half to five cells clear of it */
    var clear = pClear(p, k.b), mid = (k.b.x1 + k.b.x2 + 1) / 2;
    if (clear < 2.5) { p.dir = p.x < mid ? -1 : 1; p.idle = 0; k.act = 0; return false; }
    if (clear > 5) { p.dir = p.x < mid ? 1 : -1; p.idle = 0; k.act = 0; return false; }
    p.dir = p.x < mid ? 1 : -1;
  } else if (k.kind === "camp") {
    p.dir = dx < 0 ? -1 : 1;
  } else {
    /* an axe reaches a bit further than a hand. find a way to somewhere they can reach it from */
    var rx = k.kind === "chop" ? 5 : 3;
    if (Math.abs(dx) > rx + 0.5 || k.y < fy - 10 || k.y > fy + 2) {
      var left = pathGo(g, p, k.kind + k.x + "," + k.y, k.x, k.y, pathNear(k.x, k.y, rx, 10, 2));
      if (left < 0) {
        /* no route: walk straight at it, and forget it once close enough to see it is out of reach */
        if (Math.abs(dx) < 6 && (k.y < fy - 10 || k.y > fy + 2)) { pGiveUp(g, p, k.x); return false; }
        p.dir = dx < 0 ? -1 : 1;
      }
      if (pStuck(p, k, left > 0 ? left : Math.abs(dx))) { pGiveUp(g, p, k.x); return false; }
      p.idle = 0; k.act = 0; return false;
    }
    if (Math.abs(dx) > 0.5) p.dir = dx < 0 ? -1 : 1;
  }
  k.act++;
  if (k.kind === "chop") {
    var cb = p.tools ? 14 : 24;   /* (an iron axe bites deeper: mines.js) */
    p.pose = (k.act % cb) < (cb >> 1) ? "chopA" : "chopB";
    if (k.act % cb === (cb >> 1)) {
      mWear(g, p);
      if (pBuilt(g, k.x, k.y)) { p.task = null; return true; }   /* on second thoughts, somebody lives in that */
      g.m[j] = MAT.EMPTY; heatSync(g, j); g.fx.thud++;   /* (the air keeps the heat the wood had) */
      pChips(g, k.x + 0.5, k.y + 0.5, 5, [SAND_PAL[MAT.WOOD][40], SAND_PAL[MAT.WOOD][200]]);
      p.logs = (p.logs || 0) + 1; p.bored = Math.max(0, p.bored - 300); k.n++;
      if (k.n === 1 && (p.sayT <= 0 || Math.random() < 0.3)) pSay(g, p, "chop");
      pFell(g, p, k.x, k.y);
      more = k.n < (k.want ? P_LOGS : P_CHOPS) && p.logs < P_LOGS ? pFindCut(g, p, k.x, k.y) : null;
      if (more) { k.x = more.x; k.y = more.y; }
      else {
        p.task = null; p.taskDone = true; p.chopCD = k.want ? 300 : P_CHOP_CD;
        if (Math.random() < 0.6) p.wantPlant = true;   /* one down: perhaps plant one */
      }
    }
  } else if (k.kind === "eat") {
    p.pose = (k.act >> 3) & 1 ? "eatB" : null;
    if (k.act % 30 === 0) {
      if (!pEdible(g, k.x, k.y)) { p.task = null; return true; }
      c = g.m[j]; g.m[j] = MAT.EMPTY; heatSync(g, j);
      pChips(g, k.x + 0.5, k.y + 0.5, 3, [SAND_PAL[MAT.PLANT][0], SAND_PAL[MAT.PLANT][100]]);
      p.hunger = Math.max(0, p.hunger - (c === MAT.FLOWER ? 1000 : (c === MAT.WHEAT ? 900 : 700)) - lSeason(g, p)); p.bored = Math.max(0, p.bored - 100); k.n++;
      if (c === MAT.WHEAT) achieve(g, "harvest");
      if (c === MAT.WHEAT && g.wDuckPalace) p.seed = Math.min(3, (p.seed || 0) + 1);   /* (a handful kept, for the duck palace: pleasures.js) */
      if (p.sayT <= 0 && Math.random() < 0.5) pSay(g, p, c === MAT.FLOWER && Math.random() < 0.5 ? "flower" : (c === MAT.WHEAT && Math.random() < 0.6 ? "wheat" : "eat"));
      more = p.hunger > 300 && k.n < P_BITES ? pFind(g, p, P_FOOD, 3, pEdible) : null;
      if (more) { k.x = more.x; k.y = more.y; } else p.task = null; p.taskDone = true;
    }
  } else if (k.kind === "light") {
    if (k.act % 6 === 0) pChips(g, p.x + p.dir * 2, p.y - 4, 1, SPARK_HOT);
    if (k.act === 40) {
      /* one last look, from where they are standing now, then strike a light at the near edge of it */
      var b = pSafeToLight(g, p, k.x, k.y);
      if (!b || pClear(p, b) < 2.5 || pClear(p, b) > 5) { p.task = null; return false; }
      var tx = p.x < (b.x1 + b.x2 + 1) / 2 ? b.x1 : b.x2, ty, best = -1;
      for (ty = b.y2; ty >= b.y1 && best < 0; ty--) for (var sx = 0; sx <= b.x2 - b.x1 && best < 0; sx++) {
        var xx = tx === b.x1 ? b.x1 + sx : b.x2 - sx;
        if (P_TINDER[g.m[ty * gw + xx]]) best = ty * gw + xx;
      }
      if (best < 0) { p.task = null; return false; }
      pIgniteCell(g, best);
      feed(g, p.name + " got bored and lit a fire", "#ffb070");
      achieve(g, "arson");
      g.burnt = true;   /* (and somebody, somewhere, starts thinking about buckets: ideas.js) */
      pSay(g, p, "light", true);
      p.bored = 0; p.calmT = 400; p.task = null; p.taskDone = true; p.dir = -p.dir; p.idle = 0;
    }
  } else if (k.kind === "camp") {
    /* stack the logs, then light them, then stand about enjoying it. looking again before each */
    if ((k.act === 20 || k.act === 60) && !pCampOk(g, p, k.x, k.y, k.act === 60)) { p.task = null; return false; }
    if (k.act === 20) {
      var stack = [[k.x - 1, k.y], [k.x + 1, k.y], [k.x, k.y], [k.x, k.y - 1]], placed = 0;
      var fuel = k.coal ? "coal" : "logs";
      for (var s = 0; s < stack.length && p[fuel] > 0; s++) {
        var si = stack[s][1] * gw + stack[s][0];
        if (g.m[si] === MAT.EMPTY) { sandSet(g, si, k.coal ? MAT.COAL : MAT.WOOD); p[fuel]--; placed++; }
      }
      if (!placed) { p.task = null; return false; }
      g.fx.thud++;
    }
    if (k.act > 20 && k.act % 6 === 0) pChips(g, k.x + 0.5, k.y - 1, 1, SPARK_HOT);
    if (k.act === 60) {
      /* light one of the logs they stacked (not whatever drifted into the gap) */
      var log = -1;
      for (var lx = k.x - 1; lx <= k.x + 1 && log < 0; lx++) for (var ly = k.y; ly >= k.y - 1 && log < 0; ly--) if (pFuel(g.m[ly * gw + lx])) log = ly * gw + lx;
      if (log < 0) { p.task = null; return false; }
      pIgniteCell(g, log);
      feed(g, p.name + (k.coal ? " made a fire of coal. it will be going for a while" : " made a campfire"), "#ffb070", k.coal ? "coalfire" : null);
      achieve(g, "camp");
      pSay(g, p, "camp", true);
      p.bored = 0; p.calmT = 600; p.task = null; p.taskDone = true; p.idle = 150;   /* and stand there admiring it */
      bGather(g, p, k.x, k.y);   /* and the neighbours come over */
    }
  }
  return true;
}
/* set a cell alight: wood smoulders into embers, everything else just burns */
function pIgniteCell(g, j, spread) {
  var v = g.m[j], gw = g.gw, x = j % gw, y = (j / gw) | 0, k, n;
  /* a match: no heat to speak of. the burning makes the heat. the cell keeps exactly the heat it had */
  heatSync(g, j);
  var q = heatQ(g, j);
  if (v === MAT.WOOD) { g.m[j] = MAT.EMBER; g.aux[j] = 0; }
  else if (v === MAT.COAL) { g.m[j] = MAT.EMBER; g.aux[j] = 1; }   /* (coal smoulders a long while: heat.js) */
  else { g.m[j] = MAT.FIRE; g.sh[j] = irnd(128); g.aux[j] = 0; }
  heatSetQ(g, j, q);
  g.fx.whoosh++;
  /* a match held to a bush catches a few twigs, not just the one */
  if (spread !== false) for (k = 0, n = 0; k < 4 && n < 2; k++) {
    var nb = sandNb(g, x, y, k);
    if (nb >= 0 && P_TINDER[g.m[nb]]) { pIgniteCell(g, nb, false); n++; }
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
    else if (p.sleep > 0) { body = P_BODY.sleep; rot = flip ? 3 : 1; oy = Math.floor(p.y) - 2; }
    else if (p.stun > 0) { body = P_BODY.stand; rot = flip ? 3 : 1; oy = Math.floor(p.y) - 2; }
    else if (p.slip > 0) { body = fast ? P_BODY.panicA : P_BODY.panicB; rot = p.ivx < 0 ? 1 : 3; oy = Math.floor(p.y) - 2; }   /* flat on their back, legs going */
    else if (p.rope) body = P_BODY.panicA;   /* arms up, holding on */
    else if (p.climb && !p.climb.lift) body = ((p.y * 2) | 0) & 2 ? P_BODY.panicA : P_BODY.panicB;   /* hand over hand (in a lift: standing) */
    else if (p.chute) body = p.chute.fail ? (fast ? P_BODY.panicA : P_BODY.panicB) : P_BODY.stand;
    else if (p.fire || p.panic > 0 || p.breath < P_BREATH - 30) body = fast ? P_BODY.panicA : P_BODY.panicB;
    else if (p.jumping) body = P_BODY.walkA;
    else if (p.pose && P_BODY[p.pose]) body = P_BODY[p.pose];   /* (a pose from a ladder they have just stepped off is not one) */
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
    if (p.state === "walk" && !p.falling && !p.jumping && !p.swimming && !p.chute && !p.climb && !p.sleep) {
      /* a little shadow on whatever they are standing on */
      var sy = Math.floor(p.y) + 1;
      if (sy < g.gh) for (c = -2; c <= 2; c++) {
        var si = sy * g.gw + ox + c;
        if (ox + c >= 0 && ox + c < g.gw && SOLID[g.m[si]]) g.px[si] = mix32(g.px[si], c === -2 || c === 2 ? g.px[si] : 0xff000000);
      }
    }
    if (body === P_BODY.sit) oy += 2;   /* (sitting down: on a tier, or a bench. wonders.js) */
    if (p.rope && p.state === "walk") pDrawRope(g, p, ox);
    if (p.chute && p.state === "walk") pDrawChute(g, p, ox);
    pBlit(g, p.hat.spr, ox, oy, flip, rot, pal, p.fire > 0);
    pBlit(g, body, ox, oy, flip, rot, pal, p.fire > 0);
    if (rot === 0 && !g.thermal) iDrawGear(g, p, ox, oy);   /* a bucket, a fishing rod, a bright idea (ideas.js) */
    if (p.pack && rot === 0 && !g.thermal) pDrawPack(g, p, ox, oy);   /* (oil.js) */
    if (p.launch) pDrawFlame(g, p, ox, oy);
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

/* the rope: from their hands to the hook, or to wherever the hook has got to so far */
var P_ROPE32 = [hex32("#d8c090"), hex32("#b0905c")], P_HOOK32 = hex32("#c8ccd4");
function pDrawRope(g, p, ox) {
  var r = p.rope, x0 = ox + 0.5, y0 = Math.floor(p.y) - 6, x1 = r.ax, y1 = r.ay;
  if (!r.on) { var f = Math.min(1, r.hook / (r.dist || 1)); x1 = x0 + (r.ax - x0) * f; y1 = y0 + (r.ay - y0) * f; }
  var dx = x1 - x0, dy = y1 - y0, n = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))) || 1, px = g.px, gw = g.gw, gh = g.gh;
  /* a slack line sags a little in the middle */
  var sag = r.on ? Math.max(0, r.len - Math.sqrt(dx * dx + dy * dy)) * 0.5 : 0;
  for (var s = 0; s <= n; s++) {
    var t = s / n, X = Math.floor(x0 + dx * t), Y = Math.floor(y0 + dy * t + sag * 4 * t * (1 - t));
    if (X < 0 || Y < 0 || X >= gw || Y >= gh) continue;
    px[Y * gw + X] = s === n ? P_HOOK32 : P_ROPE32[(s >> 1) & 1];
  }
}

/* a canopy over their head on two lines, opening out over its first few ticks. or a sorry, flapping streamer */
function pDrawChute(g, p, ox) {
  var c = p.chute, px = g.px, gw = g.gw, gh = g.gh, fy = Math.floor(p.y), k, x, y, X, Y;
  function put(X, Y, col) { if (X >= 0 && Y >= 0 && X < gw && Y < gh) px[Y * gw + X] = col; }
  if (c.fail) {
    /* a twisted bundle on a line, whipping about */
    var wob = Math.sin(p.anim * 0.9);
    for (k = 0; k < 6; k++) put(ox + Math.round(wob * k * 0.3), fy - 9 - k, P_CHUTE_LINE);
    for (k = 0; k < 5; k++) {
      X = ox + Math.round(wob * (6 + k) * 0.35 + Math.sin(p.anim * 1.7 + k) * 0.8); Y = fy - 15 - k;
      put(X, Y, k & 1 ? P_CHUTE_WHITE : c.col); put(X + 1, Y, c.col);
    }
    return;
  }
  var w = Math.min(5, 1 + c.t * 0.7) | 0, top = fy - 17;
  /* the lines, from the hem to their shoulders */
  for (k = 0; k <= 7; k++) {
    var t = k / 7;
    put(Math.round(ox - w + (w - 1) * t), top + 3 + Math.round(t * 7), P_CHUTE_LINE);
    put(Math.round(ox + w - (w - 1) * t), top + 3 + Math.round(t * 7), P_CHUTE_LINE);
  }
  /* the dome, in stripes */
  for (y = 0; y < 3; y++) {
    var hw = y === 0 ? w - 2 : (y === 1 ? w - 1 : w);
    for (x = -hw; x <= hw; x++) put(ox + x, top + y, ((x + 10) >> 1) & 1 ? P_CHUTE_WHITE : c.col);
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
    /* (with the bubbles turned off, B, only the name of whoever is under the cursor) */
    var text = p.sayT > 0 && !g.hush ? p.say : (p === hover || p === g.held ? p.name : "");
    if (!text) continue;
    var tag = p.sayT <= 0 || g.hush, a = tag ? 0.85 : Math.min(1, p.sayT / 12);
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
    if (!gs.say || gs.t < 30 || gs.t > 170 || g.hush) continue;
    var gx = sx0 + PANEL + (gs.x + 0.5) * CELL, gy = sy0 + PLAY_Y + (gs.y - 6) * CELL;
    c.globalAlpha = Math.min(1, (170 - gs.t) / 20, (gs.t - 30) / 10) * 0.85;
    c.fillStyle = "#cfe0ff"; c.textAlign = "center";
    c.font = "italic bold 7px " + UI_FONT;
    c.fillText(gs.say, gx, gy);
  }
  c.globalAlpha = 1; c.textAlign = "left";
}
