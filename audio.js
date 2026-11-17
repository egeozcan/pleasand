/* =====================================================================
   PLEASAND  --  audio.js

   the sound department. an oscillator, a noise buffer, and a compressor
   so that forty gunpowder grains going off at once is loud, not broken.
   everything here is fire-and-forget: call it, it plays, it cleans up.
   ===================================================================== */
"use strict";

var AC = null, MASTER = null, MUTED = false, NOISE = null;

function actx() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      var comp = AC.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 6;
      comp.connect(AC.destination);
      MASTER = AC.createGain(); MASTER.gain.value = 0.4; MASTER.connect(comp);
      NOISE = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
      var d = NOISE.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { AC = null; }
  }
  if (AC && AC.state === "suspended") { try { AC.resume(); } catch (e) {} }
  return AC;
}
function live() { return !MUTED && AC && AC.state === "running"; }

function tone(f, dur, type, vol, slide, delay) {
  if (!live()) return;
  var c = AC, t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
  o.type = type || "square";
  o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol == null ? 0.07 : vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(MASTER); o.start(t); o.stop(t + dur + 0.02);
}
function hiss(dur, vol, cut, sweep, delay, type) {
  if (!live()) return;
  var c = AC, t = c.currentTime + (delay || 0), s = c.createBufferSource(); s.buffer = NOISE;
  s.playbackRate.value = 0.8 + Math.random() * 0.4;
  var f = c.createBiquadFilter(); f.type = type || "lowpass";
  f.frequency.setValueAtTime(cut || 2400, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, sweep), t + dur);
  var g = c.createGain();
  g.gain.setValueAtTime(vol == null ? 0.1 : vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(MASTER);
  s.start(t, Math.random() * 1.2); s.stop(t + dur + 0.02);
}

/* the named noises. each one is a little recipe of the two above */
var SFX = {
  boom: function () { tone(70, 0.3, "sine", 0.16, 32); hiss(0.4, 0.12, 1800, 120); },
  bigboom: function () {
    tone(55, 1.4, "sine", 0.35, 18); tone(90, 0.6, "triangle", 0.2, 30);
    hiss(2.6, 0.4, 2200, 50); hiss(1.2, 0.25, 6000, 300, 0.05, "bandpass");
  },
  whoosh: function () { hiss(0.35, 0.07, 400, 2600); },
  sizzle: function () { hiss(0.12, 0.03, 6000, 2500); },
  bloom: function () { tone(1046 + ((Math.random() * 4) | 0) * 262, 0.08, "sine", 0.035); },
  fanfare: function () {
    [523, 659, 784, 1046].forEach(function (f, k) { tone(f, k === 3 ? 0.35 : 0.1, "square", 0.04, null, k * 0.09); });
  },
  splash: function () { hiss(0.35, 0.12, 1600, 300); tone(500, 0.12, "sine", 0.05, 160); },
  whee: function () { tone(300, 0.5, "triangle", 0.05, 1400); },
  pop: function () { tone(380, 0.09, "sine", 0.09, 900); },
  thud: function () { tone(120, 0.12, "sine", 0.16, 45); hiss(0.08, 0.06, 500); },
  splat: function () { tone(200, 0.18, "square", 0.06, 40); hiss(0.22, 0.14, 900, 120); },
  whistle: function () { tone(500 + Math.random() * 200, 0.7, "sine", 0.025, 1800); hiss(0.6, 0.02, 4000, 7000, 0, "highpass"); },
  burst: function () {
    tone(110, 0.35, "sine", 0.12, 40); hiss(0.4, 0.12, 3000, 200);
    for (var k = 0; k < 9; k++) hiss(0.04, 0.05 + Math.random() * 0.04, 7000, 3000, 0.25 + Math.random() * 0.7, "highpass");
  },
  thunder: function () {
    hiss(0.15, 0.3, 9000, 2000, 0, "highpass");
    hiss(2.2, 0.35, 900, 60, 0.05); tone(45, 1.6, "sine", 0.2, 25, 0.05);
  },
  zap: function () { tone(85, 0.35, "sawtooth", 0.07, 70); hiss(0.3, 0.06, 5000, 3000, 0, "highpass"); },
  ghost: function () {
    if (!live()) return;
    var c = AC, t = c.currentTime, o = c.createOscillator(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(420, t); o.frequency.linearRampToValueAtTime(700, t + 0.6); o.frequency.linearRampToValueAtTime(380, t + 1.1);
    l.frequency.value = 6; lg.gain.value = 18; l.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.connect(g); g.connect(MASTER); o.start(t); l.start(t); o.stop(t + 1.15); l.stop(t + 1.15);
  },
  /* a duck: a nasal little square-wave honk that drops in pitch */
  quack: function () {
    if (!live()) return;
    var c = AC, t = c.currentTime, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(), p = 330 + Math.random() * 80;
    o.type = "square"; f.type = "bandpass"; f.frequency.value = 1200; f.Q.value = 3;
    o.frequency.setValueAtTime(p, t); o.frequency.exponentialRampToValueAtTime(p * 0.7, t + 0.14);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(f); f.connect(g); g.connect(MASTER); o.start(t); o.stop(t + 0.16);
  },
  /* a duckling */
  peep: function () { tone(1900 + Math.random() * 300, 0.06, "sine", 0.03, 2400); },
  /* a hammer on a nail, and a saw through a log */
  hammer: function () { tone(1300 + Math.random() * 300, 0.035, "square", 0.035, 700); hiss(0.03, 0.05, 4000); },
  saw: function () { for (var k = 0; k < 3; k++) hiss(0.09, 0.05, 2600, 1400, k * 0.1, "bandpass"); },
  /* a light bulb going on over somebody's head */
  idea: function () { tone(1568, 0.09, "sine", 0.05); tone(2093, 0.3, "sine", 0.045, null, 0.08); tone(3136, 0.2, "triangle", 0.012, null, 0.1); },
  /* a rubber duck */
  squeak: function () { tone(900, 0.12, "sine", 0.05, 1500); tone(1400, 0.08, "triangle", 0.02, 1100, 0.1); },
  /* the little animal-crossing mumble a peasant makes when it talks */
  babble: function (pitch, n) {
    if (!live()) return;
    var c = AC, t = c.currentTime, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = "square"; f.type = "bandpass"; f.frequency.value = pitch * 3; f.Q.value = 1.2;
    g.gain.setValueAtTime(0.0001, t);
    for (var k = 0; k < n; k++) {
      var s = t + k * 0.065;
      o.frequency.setValueAtTime(pitch * (0.8 + Math.random() * 0.6), s);
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.06, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.055);
    }
    o.connect(f); f.connect(g); g.connect(MASTER); o.start(t); o.stop(t + n * 0.065 + 0.05);
  },
  /* a tiny sawtooth "aaaaa" with vibrato, through a vowel-ish filter */
  scream: function (pitch, dur) {
    if (!live()) return;
    dur = dur || 0.7;
    var c = AC, t = c.currentTime, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(),
        l = c.createOscillator(), lg = c.createGain();
    o.type = "sawtooth"; f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 2;
    o.frequency.setValueAtTime(pitch * 1.6, t);
    o.frequency.linearRampToValueAtTime(pitch * 1.9, t + dur * 0.3);
    o.frequency.exponentialRampToValueAtTime(pitch * 0.9, t + dur);
    l.frequency.value = 9; lg.gain.value = pitch * 0.08; l.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.04);
    g.gain.setValueAtTime(0.07, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(MASTER);
    o.start(t); l.start(t); o.stop(t + dur + 0.02); l.stop(t + dur + 0.02);
  }
};
