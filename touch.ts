/* =====================================================================
   PLEASAND  --  touch.ts

   the shape of the screen, and fingers. the page fits the game to
   whatever it is shown on (layoutFit): the field is as many columns wide
   as the screen has room for, and on a touch screen the little picker
   down the left gives way to big buttons (down the left held sideways,
   under the field held upright) and a box of every brush, over the
   field, a finger wide each. none of it is the village's: headless, and
   in every test, the game is the 640 by 410 it always was.
   ===================================================================== */
"use strict";

/* LAYOUT_ON: the page has fitted itself to a screen (never headless). LAYOUT: "desk" (the picker down the left, as it
   always was), "side" (big buttons down the left: a touch screen held sideways), "bottom" (big buttons under the field:
   held upright). TOUCH_UI: the big buttons, not the picker (a touch screen, or ?touch in the address; ?desk, never) */
var LAYOUT_ON = false, LAYOUT = "desk", TOUCH_UI = false;
var DESK_PANEL = 96, SIDE_PANEL = 112, BASE_VH = 410, SCR_MIN = 100;
/* the touch panel: where it is, and its buttons ({id, x, y, w, h}) */
var TP = { x: 0, y: 0, w: 0, h: 0, btns: [] };
/* the touch panel's own state, none of it the village's (so none of it in a save): the box of brushes open, the four
   brushes kept to hand (slots, with when each was last picked), a CLEAR or NEW waiting to be tapped again, and what is to
   be done when the finger lets go (what a browser lets only a finger's lifting do: fullscreen, a file to open) */
var TUI = { open: false, slots: [], used: [], lastSel: -1, sure: null, sureT: 0, deferred: null, clock: 0, pan: false, drag: null };
var LAST_FIT = { w: 0, h: 0 };
/* two fingers have hold of the view (game.ts): the camera journals where it is when they let go, not every step */
var CAM_HELD = false;

function tuiOn() { return TOUCH_UI && LAYOUT_ON; }

/* fit the game to a screen cw by ch (CSS pixels): how many columns it shows, how wide and tall the game is, where the
   panel goes. the rows are always the same (the world's GH, CELL apiece): only the width, and on an upright screen the
   room under the field, follows the screen */
function layoutFit(cw: number, ch: number) {
  LAYOUT_ON = true; LAST_FIT.w = cw; LAST_FIT.h = ch;
  var gw = g && g.gw ? g.gw : WORLD_GW, a = cw / Math.max(1, ch), n, base = BASE_VH;
  if (!TOUCH_UI) {
    /* (never fewer columns than it always had: a narrow window shows the game smaller, as it did) */
    LAYOUT = "desk"; PANEL = DESK_PANEL;
    n = clamp(Math.floor((base * a - PANEL) / CELL), Math.min(VIEW_GW, gw), gw);
    VW = PANEL + n * CELL; VH = base;
  } else if (a >= 1) {
    LAYOUT = "side"; PANEL = SIDE_PANEL;
    n = clamp(Math.floor((base * a - PANEL) / CELL), Math.min(SCR_MIN, gw), gw);
    VW = PANEL + n * CELL; VH = base;
  } else {
    /* upright: the field the whole width, and the buttons in what is left under it (about a quarter of the screen) */
    LAYOUT = "bottom"; PANEL = 0;
    var tpc = clamp(ch * 0.27, 150, ch * 0.45), s = (ch - tpc) / base;
    n = clamp(Math.floor(cw / s / CELL), Math.min(SCR_MIN, gw), gw);
    VW = n * CELL;
    s = cw / VW;
    VH = Math.max(base + 96, Math.floor(ch / s));
  }
  SCR_GW = n; STRIP_W = VW - PANEL;
  tpLayout();
  if (g && g.gc2) picSmall(g);
  if (g && g.gw) camClamp(g);
}
/* again, as it was last fitted (a valley of another width has been loaded: gameResize) */
function layoutRefit() { if (LAYOUT_ON) layoutFit(LAST_FIT.w, LAST_FIT.h); }

/* -------------------------------------------------------------------
   THE TOUCH PANEL
   ------------------------------------------------------------------- */
function fsOk() {
  var d: any = typeof document !== "undefined" ? document : null;
  return !!(d && (d.fullscreenEnabled || d.webkitFullscreenEnabled));
}
function fsOn() { var d: any = document; return !!(d.fullscreenElement || d.webkitFullscreenElement); }
function fsToggle() {
  var d: any = document, el: any = document.documentElement;
  try {
    if (fsOn()) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else { var r = (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: "hide" }); if (r && r.catch) r.catch(function () {}); }
  } catch (e) {}
}
/* rows of buttons, and how much of the row each takes. held sideways, two to a row down the left; upright, six to a
   row under the field */
function tpRows(): any[] {
  var full = fsOk();
  if (LAYOUT === "side") return [
    [[["brush", 1]], 1.35],
    [[["draw", 1], ["pan", 1]], 1],
    [[["r0", 1], ["r1", 1]], 1], [[["r2", 1], ["r3", 1]], 1],
    [[["size-", 1], ["sizev", 1], ["size+", 1]], 0.9],
    [[["slower", 1], ["speedv", 1], ["faster", 1]], 0.9],
    [[["pause", 1], ["home", 1]], 1],
    [[["thermal", 1], ["bubbles", 1]], 1],
    [full ? [["sound", 1], ["full", 1]] : [["sound", 1], ["step", 1]], 1],
    [[["save", 1], ["load", 1]], 0.9],
    [[["clear", 1], ["new", 1]], 0.9]
  ];
  return [
    [[["brush", 2], ["r0", 1], ["r1", 1], ["r2", 1], ["r3", 1]], 1.15],
    [[["size-", 1], ["sizev", 1], ["size+", 1], ["slower", 1], ["speedv", 1], ["faster", 1]], 1],
    [[["pause", 1], ["home", 1], ["thermal", 1], ["bubbles", 1], ["sound", 1]].concat(full ? [["full", 1]] : [["step", 1]]), 1],
    [[["draw", 1], ["pan", 1], ["save", 1], ["load", 1], ["clear", 1], ["new", 1]], 1]
  ];
}
function tpLayout() {
  if (LAYOUT === "side") { TP.x = 0; TP.y = PLAY_Y; TP.w = PANEL; TP.h = VH - PLAY_Y; }
  else if (LAYOUT === "bottom") { TP.x = 0; TP.y = BASE_VH; TP.w = VW; TP.h = VH - BASE_VH; }
  else { TP.w = TP.h = 0; TP.btns = []; return; }
  var rows: any[] = tpRows(), pad = 4, gap = 3, tot = 0, r, k, y, B = [];
  for (r = 0; r < rows.length; r++) tot += rows[r][1];
  var unit = (TP.h - pad * 2 - gap * (rows.length - 1)) / tot;
  y = TP.y + pad;
  for (r = 0; r < rows.length; r++) {
    var items = rows[r][0], h = Math.floor(rows[r][1] * unit), wt = 0, x = TP.x + pad;
    for (k = 0; k < items.length; k++) wt += items[k][1];
    var uw = (TP.w - pad * 2 - gap * (items.length - 1)) / wt;
    for (k = 0; k < items.length; k++) {
      var w = Math.floor(items[k][1] * uw);
      if (k === items.length - 1) w = TP.x + TP.w - pad - x;   /* (the last takes up what rounding left) */
      B.push({ id: items[k][0], x: x, y: y, w: w, h: h });
      x += w + gap;
    }
    y += h + gap;
  }
  TP.btns = B;
}
function tpIn(x: number, y: number) { return TP.w > 0 && x >= TP.x && x < TP.x + TP.w && y >= TP.y && y < TP.y + TP.h; }
function tpAt(x: number, y: number) {
  if (!tpIn(x, y)) return null;
  for (var k = 0; k < TP.btns.length; k++) { var b = TP.btns[k]; if (x >= b.x - 1 && x < b.x + b.w + 2 && y >= b.y - 1 && y < b.y + b.h + 2) return b; }
  return null;
}
/* the four brushes kept to hand: a brush picked that is not one of them takes the place of the one picked longest ago */
function tpSlots(g: Game) {
  if (!TUI.slots.length) {
    /* (the first to give way is PEASANT, then WATER; ERASE is kept longest) */
    [["SAND", 0], ["WATER", -2], ["PEASANT", -3], ["ERASE", -1]].forEach(function (e: [string, number], i) {
      var k = PICK.findIndex(function (p) { return p.name === e[0]; });
      TUI.slots.push(k < 0 ? i : k); TUI.used.push(e[1]);
    });
  }
  if (g.sel !== TUI.lastSel) {
    TUI.lastSel = g.sel; TUI.clock++;
    var at = TUI.slots.indexOf(g.sel);
    if (at < 0) { at = 0; for (var k = 1; k < 4; k++) if (TUI.used[k] < TUI.used[at]) at = k; TUI.slots[at] = g.sel; }
    TUI.used[at] = TUI.clock;
  }
  return TUI.slots;
}
var TP_DO = { "size-": "size-", "size+": "size+", pause: "pause", slower: "slower", faster: "faster", thermal: "thermal", bubbles: "hush" };
/* a finger on the touch panel (the press is used up: nothing paints till it lets go) */
function tpTap(g: Game, x: number, y: number) {
  var b = tpAt(x, y), id = b ? b.id : null, now = g.t;
  if (!id) return;
  if (id !== "brush") TUI.open = false;
  if (id !== "clear" && id !== "new") TUI.sure = null;
  if (id === "brush") { TUI.open = !TUI.open; g.pop = null; }
  else if (id === "draw") TUI.pan = false;
  else if (id === "pan") TUI.pan = true;
  else if (id.charAt(0) === "r" && id.length === 2) { var k = tpSlots(g)[+id.charAt(1)]; if (k >= 0) { panelDo(g, "row:" + k); TUI.pan = false; } }
  else if (TP_DO[id]) panelDo(g, TP_DO[id]);
  else if (id === "clear" || id === "new") {
    /* (a whole valley is a lot to lose to a stray thumb: tapped twice) */
    if (TUI.sure === id && now - TUI.sureT < 2.5) { TUI.sure = null; panelDo(g, id); }
    else { TUI.sure = id; TUI.sureT = now; }
  }
  else if (id === "home") { if (!camHome(g, false)) g.camNote = g.t + 2; }
  else if (id === "step") { if (g.paused) { sandStep(g); partStep(g); peasantsStep(g); ducksStep(g); } else g.paused = 1; }
  else if (id === "sound") { MUTED = !MUTED; }
  else if (id === "full" || id === "save" || id === "load") TUI.deferred = id;
}
/* what is to be done as the finger lets go (a browser lets only that, not the press, open a file or go fullscreen) */
function tpLetGo(g: Game) {
  var d = TUI.deferred;
  TUI.deferred = null;
  if (d === "full") fsToggle();
  else if (d === "save") saveDownload(g);
  else if (d === "load") saveOpenFile(g);
}
/* a touch-panel button, with its label: lit (on), pressed (hot) */
function tpButton(c, b, label: string, on: boolean, hot: boolean, warn?: boolean) {
  rct(c, b.x, b.y, b.w, b.h, warn ? "#6a1d16" : (on ? "#6a3d12" : (hot ? "#2f4670" : "#1d2a42")));
  box(c, b.x, b.y, b.w, b.h, warn ? "#e05a3a" : (on ? "#c87a2a" : "#3a4e72"));
  if (label) tpLabel(c, label, b.x + b.w / 2, b.y + b.h / 2, b.w - 4, 8, "#ffffff");
}
/* a label, centred on (x, y), shrunk (and then cut short) to fit w. two lines with a \n in it */
function tpLabel(c, s: string, x: number, y: number, w: number, size: number, col: string, align?: CanvasTextAlign) {
  var L = s.split("\n"), sz = size, k;
  c.font = "bold " + sz + "px " + UI_FONT;
  var wid = function () { var m = 0; for (k = 0; k < L.length; k++) m = Math.max(m, c.measureText(L[k]).width); return m; };
  while (sz > 6 && wid() > w) { sz--; c.font = "bold " + sz + "px " + UI_FONT; }
  for (k = 0; k < L.length; k++) {
    var t = L[k];
    if (c.measureText(t).width > w) { while (t.length > 2 && c.measureText(t + "..").width > w) t = t.slice(0, -1); t += ".."; }
    var ly = y + (k - (L.length - 1) / 2) * (sz + 1) + sz * 0.36;
    txt(c, t, x, ly, sz, col, align || "center", true);
  }
}
/* a brush's square, s game pixels across */
function tpSwatch(c, pk, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s / 8, s / 8); drawSwatch(c, pk, 0, 0); c.restore();
}
function drawTouchPanel(g: Game, c) {
  var slots = tpSlots(g), press = g.down ? tpAt(g.mx, g.my) : null, pid = press ? press.id : "";
  if (TUI.sure && g.t - TUI.sureT >= 2.5) TUI.sure = null;
  var sig = [LAYOUT, VW, VH, g.sel, slots.join("."), g.size, g.speed, g.paused ? 1 : 0, g.thermal ? 1 : 0, g.hush ? 1 : 0, MUTED ? 1 : 0,
             TUI.open ? 1 : 0, TUI.sure, pid, fsOk() && fsOn() ? 1 : 0, TUI.pan ? 1 : 0].join(",");
  uiCached(c, "touch", sig, TP.x, TP.y, TP.w, TP.h, function (c) {
    rct(c, TP.x, TP.y, TP.w, TP.h, "#0a0d16");
    if (LAYOUT === "side") rct(c, TP.x + TP.w - 1, TP.y, 1, TP.h, "#26344e");
    else rct(c, TP.x, TP.y, TP.w, 1, "#26344e");
    for (var k = 0; k < TP.btns.length; k++) {
      var b = TP.btns[k], id = b.id, hot = id === pid, pk;
      if (id === "brush") {
        pk = curPick(g);
        tpButton(c, b, "", TUI.open, hot);
        var s = Math.min(16, b.h - 12), fun = g.sel < FUN_N;
        tpSwatch(c, pk, b.x + 5, b.y + (b.h - s) / 2 - 3, s);
        tpLabel(c, pk.name, b.x + 9 + s + (b.w - 13 - s) / 2, b.y + b.h / 2 - 3, b.w - 15 - s, 9, fun ? "#f0c060" : "#ffffff");
        txt(c, TUI.open ? "▲ CLOSE" : "▼ ALL BRUSHES", b.x + b.w / 2, b.y + b.h - 4, 6, "#9aa6b8", "center", true);
      } else if (id.charAt(0) === "r" && id.length === 2) {
        var sk = slots[+id.charAt(1)];
        pk = PICK[sk];
        var sel = sk === g.sel;
        rct(c, b.x, b.y, b.w, b.h, sel ? "#2a3d5e" : (hot ? "#2f4670" : "#141b2a"));
        box(c, b.x, b.y, b.w, b.h, sel ? "#8aa6d8" : "#3a4e72");
        var ss = Math.min(10, b.h - 14);
        if (b.w > b.h * 1.6) {   /* (wide: the square, and the name beside it) */
          tpSwatch(c, pk, b.x + 4, b.y + (b.h - ss) / 2, ss);
          tpLabel(c, pk.name, b.x + 7 + ss + (b.w - 9 - ss) / 2, b.y + b.h / 2, b.w - 10 - ss, 7, sel ? "#ffffff" : "#c8d0dc");
        } else {
          tpSwatch(c, pk, b.x + (b.w - ss) / 2, b.y + 3, ss);
          tpLabel(c, pk.name, b.x + b.w / 2, b.y + b.h - 6, b.w - 4, 7, sel ? "#ffffff" : "#c8d0dc");
        }
      } else if (id === "sizev") {
        tpLabel(c, "SIZE\n" + g.size, b.x + b.w / 2, b.y + b.h / 2, b.w, 8, "#ffd94a");
      } else if (id === "speedv") {
        tpLabel(c, "SPEED\n" + SPEED_NAMES[g.speed], b.x + b.w / 2, b.y + b.h / 2, b.w, 8, g.speed === SPEED_1 ? "#9aa6b8" : "#ffd94a");
      } else {
        var lab = { "size-": "−", "size+": "+", slower: "−", faster: "+", pause: g.paused ? "PLAY" : "PAUSE", home: "VILLAGE",
                    thermal: "THERMAL", bubbles: "BUBBLES", sound: "SOUND", full: "FULL\nSCREEN", step: g.paused ? "STEP" : "STEP",
                    save: "SAVE", load: "LOAD", clear: "CLEAR", new: "NEW", draw: "\u270e DRAW", pan: "\u2194 PAN" }[id] || id;
        var on = (id === "draw" && !TUI.pan) || (id === "pan" && TUI.pan) || (id === "pause" && !!g.paused) || (id === "thermal" && !!g.thermal) || (id === "bubbles" && !g.hush) ||
                 (id === "sound" && !MUTED) || (id === "full" && fsOn());
        var warn = TUI.sure === id;
        tpButton(c, b, warn ? "SURE?" : lab, on, hot, warn);
      }
    }
  });
}
/* what the bar says about a touch-panel button a finger is on */
function tpHint(id: string) {
  return ({ brush: "BRUSHES  every brush there is, a finger wide each", draw: "DRAW  a finger on the field paints, grabs, throws and strikes",
            pan: "PAN  a finger on the field looks along the valley. flick it to glide", home: "VILLAGE  back to where they live", pause: "PAUSE  stop time. STEP moves it one tick",
            step: "STEP  one tick of the world at a time (it pauses first)", thermal: "THERMAL  how hot everything is. peasants are 37 degrees. mostly",
            bubbles: "BUBBLES  what they are saying, or a quieter village", sound: "SOUND  on or off", full: "FULL SCREEN  the whole screen, no browser",
            save: "SAVE  the village, in a file to keep", load: "LOAD  a village from a file", clear: "CLEAR  everything goes. tap twice",
            new: "NEW  a new valley, and a new village. tap twice", "size-": "SIZE  a smaller brush", "size+": "SIZE  a bigger brush",
            slower: "SPEED  time goes slower", faster: "SPEED  time goes faster" })[id] || "";
}

/* -------------------------------------------------------------------
   THE BOX OF BRUSHES: every one there is, over the field
   ------------------------------------------------------------------- */
var PAL = { x: 0, y: 0, w: 0, h: 0, cols: 1, tw: 0, th: 0, top: 0, key: "" };
function palLayout() {
  var key = VW + "x" + VH + ":" + PANEL;
  if (PAL.key === key) return PAL;
  var n = PICK.length, x0 = PANEL + 4, w = VW - PANEL - 8, top = 16;
  var cols = clamp(Math.floor(w / 84), 4, 10), rows = Math.ceil(n / cols);
  var th = Math.min(40, Math.floor((PLAY_H - top - 6) / rows));
  PAL.x = x0; PAL.y = PLAY_Y + 3; PAL.w = w; PAL.h = top + rows * th + 3; PAL.cols = cols; PAL.tw = w / cols; PAL.th = th; PAL.top = top; PAL.key = key;
  return PAL;
}
function palAt(x: number, y: number) {
  if (!TUI.open) return -1;
  var P = palLayout(), cx = Math.floor((x - P.x) / P.tw), cy = Math.floor((y - P.y - P.top) / P.th);
  if (x < P.x || x >= P.x + P.w || cx < 0 || cx >= P.cols || cy < 0) return -1;
  var k = cy * P.cols + cx;
  return k < PICK.length ? k : -1;
}
function palIn(x: number, y: number) { var P = palLayout(); return TUI.open && x >= P.x && x < P.x + P.w && y >= P.y && y < P.y + P.h; }
function drawPalette(g: Game, c) {
  if (!TUI.open) return;
  var P = palLayout(), hov = g.down ? palAt(g.mx, g.my) : -1, k;
  rct(c, PANEL, PLAY_Y, VW - PANEL, PLAY_H, "rgba(4,6,10,0.55)");
  rct(c, P.x, P.y, P.w, P.h, "#080b14");
  box(c, P.x, P.y, P.w, P.h, "#3a4e72");
  txt(c, "BRUSHES", P.x + 5, P.y + 11, 8, "#ffd94a", "left", true);
  txt(c, "tap one. tap outside to close", P.x + P.w - 5, P.y + 11, 6, "#56698a", "right");
  for (k = 0; k < PICK.length; k++) {
    var pk = PICK[k], tx = P.x + (k % P.cols) * P.tw, ty = P.y + P.top + Math.floor(k / P.cols) * P.th;
    var x0 = Math.round(tx + 1), y0 = Math.round(ty + 1), tw = Math.round(tx + P.tw - 1) - x0, th = P.th - 2;
    var sel = k === g.sel, fun = k < FUN_N, more = !!pk.more;
    rct(c, x0, y0, tw, th, sel ? (fun ? "#5a3a14" : "#2a3d5e") : (k === hov ? "#26385a" : (fun ? "#1a140c" : (more ? "#0f1420" : "#111827"))));
    box(c, x0, y0, tw, th, sel ? "#ffd94a" : "#26344e");
    var s = Math.min(12, th - 8);
    tpSwatch(c, pk, x0 + 4, y0 + (th - s) / 2, s);
    tpLabel(c, pk.name, x0 + 8 + s, y0 + th / 2, tw - 11 - s, 7, sel ? "#ffffff" : (fun ? "#f0c060" : "#c8d0dc"), "left");
  }
}

/* -------------------------------------------------------------------
   A TAP, WITH THE TOUCH PANEL UP: true if it was the panel's, or the box's
   ------------------------------------------------------------------- */
function tuiTap(g: Game, x: number, y: number) {
  if (!tuiOn()) return false;
  if (TUI.open) {
    g.eaten = 1;
    var k = palAt(x, y);
    if (k >= 0) { g.sel = k; moreNote(g); TUI.open = false; TUI.sure = null; TUI.pan = false; return true; }   /* (a brush picked is a brush to use) */
    if (tpIn(x, y)) { tpTap(g, x, y); return true; }
    if (!palIn(x, y)) TUI.open = false;   /* (outside it: shut, and the press is used up) */
    return true;
  }
  if (tpIn(x, y)) { g.eaten = 1; tpTap(g, x, y); return true; }
  /* PAN: a finger on the field takes hold of the view, and nothing else (the press is used up: no tool, no paint) */
  if (TUI.pan && x >= PANEL && x < VW && y >= PLAY_Y && y < PLAY_B) {
    g.eaten = 1;
    TUI.drag = { x: x, cam: g.camX };
    CAM_HELD = true;
    return true;
  }
  return false;
}
/* the finger that has hold of the view, moved: the picture stays under it */
function tpDragMove(g: Game) {
  var d = TUI.drag;
  if (!d) return;
  g.camX = g.camT = clamp(d.cam - (g.mx - d.x) / CELL, 0, camMax(g));
}
/* and let go: a flick carries the view on, gliding to a stop (camStep's glide) */
function tpDragEnd(g: Game) {
  if (!TUI.drag) return;
  TUI.drag = null; CAM_HELD = false;
  var v = cursorVel(g)[0];
  if (Math.abs(v) > 0.4) g.camT = clamp(g.camX - v * 14, 0, camMax(g));
  else camJournal(g);
}
