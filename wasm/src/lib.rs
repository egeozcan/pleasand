/* =====================================================================
   PLEASAND  --  wasm/src/lib.rs

   the sand step's walk over the valley and the heat step, in Rust, for
   WebAssembly. a port, statement for statement, of world.ts sandStep
   (and the rules it hands each cell to) and heat.ts heatStep: the same
   sums in the same order, the same dice in the same order, the same
   world, bit for bit. the JS stays the reference: anything changed in
   one is changed in the other, and harness/same.js and test/wasm.js say
   whether they still agree (sim.js, at the top, has more).

   arithmetic. JS works every sum in doubles, and rounds to a float only
   when it stores into a Float32Array; so here every sum is an f64, and
   every store into T or lat is `as f32` (one rounding, to nearest, as
   Math.fround). tables JS keeps in Float32Arrays are f32 here too,
   widened where they are read, as JS widens them. (one thing cannot be
   made to agree, and does not matter: which NaN comes out of a sum of
   two NaNs. LLVM and V8 may each swap the two sides of a + or a *, and
   the hardware keeps the first one's bits. no rule reads a NaN's bits:
   every comparison with one is false, and the walk's tests on the bits
   of a temperature see any NaN as out of every band. a valley that
   plays as it should has no NaN in it, either)

   the dice. mulberry32, as rng.ts has it, its state here (RNG_STATE)
   while the step runs and handed back to the JS generator when it calls
   out; or, when the game's Math.random is not one whose state can be
   read (test/sim.js's), every die is asked of JS.

   what is not here is asked of JS, through the imports: a bang, a
   rocket, a nuke, a flower in bloom, and the whole turn of the few
   things whose rules are elsewhere (cloners, saplings, crops, rockets
   on their fuse, nukes). JS reads and writes the same memory: the
   grid's arrays are views into this module's memory (sim.js binds them).
   ===================================================================== */
#![no_std]
#![allow(static_mut_refs, non_upper_case_globals, non_snake_case, clippy::all)]

use core::panic::PanicInfo;
#[panic_handler]
fn panic(_: &PanicInfo) -> ! {
    core::arch::wasm32::unreachable()
}

/* -------------------------------------------------------------------
   THE MATERIALS (world.ts MAT: sim.js checks there are as many)
   ------------------------------------------------------------------- */
const EMPTY: u8 = 0;
const SAND: u8 = 1;
const WATER: u8 = 2;
const OIL: u8 = 3;
const FIRE: u8 = 5;
const LAVA: u8 = 6;
const STONE: u8 = 7;
const STEAM: u8 = 8;
const PLANT: u8 = 9;
const ICE: u8 = 10;
const GUNPOWDER: u8 = 11;
const ACID: u8 = 12;
const ASH: u8 = 13;
const FAUCET: u8 = 14;
const DRAIN: u8 = 15;
const SMOKE: u8 = 16;
const EMBER: u8 = 17;
const GLASS: u8 = 18;
const SALT: u8 = 19;
const CLONER: u8 = 20;
const GAS: u8 = 21;
const TORCH: u8 = 22;
const SEED: u8 = 23;
const FLOWER: u8 = 24;
const FIREWORK: u8 = 25;
const NUKE: u8 = 26;
const SALTWATER: u8 = 27;
const METAL: u8 = 28;
const SNOW: u8 = 29;
const INERT: u8 = 30;
const WOOD: u8 = 4;
const PLANK: u8 = 31;
const DOOR: u8 = 32;
const LADDER: u8 = 33;
const STAIRS: u8 = 34;
const SAPLING: u8 = 36;
const SOIL: u8 = 37;
const CROP: u8 = 38;
const COAL: u8 = 41;
const ORE: u8 = 42;
const BRICK: u8 = 44;
const GIRDER: u8 = 45;
const PACKSNOW: u8 = 46;
const ROCKSALT: u8 = 47;
const MORTAR: u8 = 48;
const CONCRETE: u8 = 49;
const STAINED: u8 = 50;
const FIREBRICK: u8 = 51;
const MOONROCK: u8 = 52;
const TRESTLE: u8 = 54;
const WHEAT: u8 = 39;
const LAMP: u8 = 40;
const GOLD: u8 = 43;
const LINEN: u8 = 53;

/* how many kinds of thing this port knows the rules of */
const KNOWN_MATS: i32 = 55;
const ABI: i32 = 2;

/* -------------------------------------------------------------------
   WHAT JS LENDS US
   ------------------------------------------------------------------- */
#[link(wasm_import_module = "env")]
extern "C" {
    fn js_rnd() -> f64;
    fn js_turn(i: i32, x: i32, y: i32, v: i32);
    fn js_boom(j: i32);
    fn js_launch(j: i32);
    fn js_nuke(j: i32);
    fn js_bloom(x: i32, y: i32);
    /* (for the picture: Math.sin, and wonders.ts wLitGlass) */
    fn js_sin(x: f64) -> f64;
    fn js_lit(x: i32, y: i32) -> i32;
}

/* -------------------------------------------------------------------
   THE TABLES (copied in from JS once: sim.js simTables)
   ------------------------------------------------------------------- */
/* (per thing: 256 long, so any byte indexes them; past NMAT they are 0, as JS's are undefined, and read the same way) */
static mut KP: [f32; 16384] = [0.0; 16384];
static mut IC: [f32; 256] = [0.0; 256];
static mut BK: [f32; 256] = [0.0; 256];
static mut HC: [f32; 256] = [0.0; 256];
static mut T0: [f32; 256] = [0.0; 256];
static mut HI: [f32; 256] = [0.0; 256];
static mut HI_L: [f32; 256] = [0.0; 256];
static mut LO: [f32; 256] = [0.0; 256];
static mut LO_L: [f32; 256] = [0.0; 256];
static mut SRC: [f32; 256] = [0.0; 256];
static mut POW: [f32; 256] = [0.0; 256];
static mut LAVA_LO: [f32; 256] = [0.0; 256];
static mut HS: [f32; 256] = [0.0; 256];
static mut HLAT: [f32; 256] = [0.0; 256];
static mut DENS: [f64; 256] = [0.0; 256];
static mut FREE: [u8; 256] = [0; 256];
static mut CANT: [u8; 16384] = [0; 16384];
static mut NOFLOAT: [u8; 16384] = [0; 16384];
static mut NOFLOW: [u8; 16384] = [0; 16384];
static mut STILL: [u8; 256] = [0; 256];
static mut LIQ: [u8; 256] = [0; 256];
static mut WET: [u8; 256] = [0; 256];
static mut WOODY: [u8; 256] = [0; 256];
static mut LEAFY: [u8; 256] = [0; 256];
static mut AIRY: [u8; 256] = [0; 256];
static mut HOT: [u8; 256] = [0; 256];
static mut FLUID: [u8; 256] = [0; 256];
static mut REST: [u8; 256] = [0; 256];
static mut STILL2: [u8; 65536] = [0; 65536];
static mut AQ2: [u8; 65536] = [0; 65536];
static mut IQ2: [u8; 65536] = [0; 65536];
static mut BQ2: [u8; 65536] = [0; 65536];
static mut HAS_BQ2: bool = false;
static mut BAND_HI32: u32 = 0;
static mut AIRW: bool = false;
static mut AMB32: u32 = 0;
static mut AMB64: u64 = 0;

/* the constants (sim.js simConsts) */
static mut AMBIENT: f64 = 20.0;
static mut T_MAX: f64 = 4000.0;
static mut T_MIN: f64 = -273.0;
static mut HEAT_FAST: i32 = 8;
static mut CLEAN: u8 = 200;
static mut VMAX: i32 = 12;
static mut PRESS_TRIES: i32 = 12;
static mut PRESS_SCAN: i32 = 1500;
static mut W_SET: i32 = 112;
static mut W_DRAUGHT: f64 = 1800.0;

/* the dice, and what the step counts up for JS (score, fx.hiss, fx.whoosh) */
static mut RNG_STATE: u32 = 0;
static mut RNG_INTERNAL: bool = false;
static mut CNT: [i32; 4] = [0; 4];
/* the pressure step's scratch: g.pressN and g.pgen, while the step runs */
static mut PRESS_N: i32 = 0;
static mut PGEN: u32 = 0;

#[inline(always)]
fn tf(t: &[f32], v: u8) -> f64 {
    unsafe { *t.get_unchecked(v as usize) as f64 }
}
#[inline(always)]
fn tb(t: &[u8], v: u8) -> bool {
    unsafe { *t.get_unchecked(v as usize) != 0 }
}
#[inline(always)]
fn kp(v: u8, w: u8) -> f64 {
    unsafe { *KP.get_unchecked((((v as usize) << 6) | w as usize) & 16383) as f64 }
}
#[inline(always)]
fn t64(t: &[u8; 16384], v: u8, w: u8) -> bool {
    unsafe { *t.get_unchecked((((v as usize) << 6) | w as usize) & 16383) != 0 }
}

/* -------------------------------------------------------------------
   THE GRID: raw views of JS's typed arrays (no Rust references to them:
   JS writes into them during a call out, and Rust must not think it
   knows better)
   ------------------------------------------------------------------- */
#[derive(Clone, Copy)]
struct P<T> {
    p: *mut T,
    #[cfg(feature = "checked")]
    n: usize,
}
impl<T: Copy> P<T> {
    #[inline(always)]
    fn g(self, i: i32) -> T {
        #[cfg(feature = "checked")]
        if (i as u32 as usize) >= self.n {
            core::arch::wasm32::unreachable()
        }
        unsafe { self.p.add(i as u32 as usize).read() }
    }
    #[inline(always)]
    fn s(self, i: i32, v: T) {
        #[cfg(feature = "checked")]
        if (i as u32 as usize) >= self.n {
            core::arch::wasm32::unreachable()
        }
        unsafe { self.p.add(i as u32 as usize).write(v) }
    }
}
fn mk<T>(p: i32, _n: i32) -> P<T> {
    P {
        p: p as usize as *mut T,
        #[cfg(feature = "checked")]
        n: _n as usize,
    }
}

#[derive(Clone, Copy)]
struct G {
    m: P<u8>,
    m32: P<u32>,
    stamp: P<u32>,
    aux: P<u8>,
    sh: P<u8>,
    vy: P<u8>,
    t: P<f32>,
    t32: P<u32>,
    t64: P<u64>,
    lat: P<f32>,
    l32: P<u32>,
    l64: P<u64>,
    hm: P<u8>,
    hm32: P<u32>,
    ha: P<u8>,
    hs: P<u8>,
    pmark: P<u32>,
    pstack: P<i32>,
    fast: P<i32>,
    dmask: P<u8>,
    plist: P<i32>,
    /* the heat step's scratch: which rows it passed by, and its bitsets (heat.ts heatBits) */
    skip: P<u8>,
    ba: P<i32>,
    bb: P<i32>,
    bc: P<i32>,
    bd: P<i32>,
    be: P<i32>,
    bf: P<i32>,
    bk: P<i32>,
    cp: P<i32>,
    dn: P<i32>,
    gw: i32,
    gh: i32,
    n: i32,
    nw: i32,
    nb: i32,
    tick: u32,
    has_dmask: bool,
}
static mut GRID: Option<G> = None;

/* how much scratch the heat step wants for a valley gw by gh, in bytes */
fn scratch_layout(gw: i32, gh: i32) -> (i32, i32) {
    let nw = gw >> 2;
    let nb = (nw + 31) >> 5;
    (nb, 4 * (7 * nb + 2 * gh * nb) + gh + 16)
}

/* -------------------------------------------------------------------
   THE DICE
   ------------------------------------------------------------------- */
#[inline(always)]
fn rnd() -> f64 {
    unsafe {
        if RNG_INTERNAL {
            /* mulberry32 (rng.ts rngMake) */
            RNG_STATE = RNG_STATE.wrapping_add(0x6d2b79f5);
            let mut t = RNG_STATE;
            t = (t ^ (t >> 15)).wrapping_mul(t | 1);
            t ^= t.wrapping_add((t ^ (t >> 7)).wrapping_mul(t | 61));
            ((t ^ (t >> 14)) as f64) / 4294967296.0
        } else {
            js_rnd()
        }
    }
}
/* (Math.random() * n) | 0 */
#[inline(always)]
fn irnd(n: i32) -> i32 {
    (rnd() * n as f64) as i32
}
#[inline(always)]
fn score(k: usize) {
    unsafe {
        CNT[k] += 1;
    }
}
const C_SCORE: usize = 0;
const C_HISS: usize = 1;
const C_WHOOSH: usize = 2;

/* -------------------------------------------------------------------
   THE BOOKS (heat.ts)
   ------------------------------------------------------------------- */
#[inline(always)]
fn heat_f(sh: u8) -> f64 {
    0.7 + ((sh & 63) as f64) / 105.0
}
fn heat_h0(v: u8, aux: u8, sh: u8) -> f64 {
    unsafe {
        if v == LAVA {
            let x = if aux == GLASS || aux == METAL { aux } else { STONE };
            return (tf(&HC, x) - tf(&HC, LAVA)) * (tf(&HI, x) - AMBIENT) + tf(&HI_L, x) * heat_f(sh);
        }
        tf(&HS, v) + tf(&HLAT, v) * heat_f(sh)
    }
}
fn heat_q4(g: &G, j: i32, v: u8, aux: u8, sh: u8) -> f64 {
    unsafe { tf(&HC, v) * (g.t.g(j) as f64 - AMBIENT) + g.lat.g(j) as f64 + heat_h0(v, aux, sh) }
}
/* as it was last counted */
fn heat_q(g: &G, j: i32) -> f64 {
    heat_q4(g, j, g.hm.g(j), g.ha.g(j), g.hs.g(j))
}
#[inline(always)]
fn heat_accept(g: &G, j: i32) {
    g.hm.s(j, g.m.g(j));
    g.ha.s(j, g.aux.g(j));
    g.hs.s(j, g.sh.g(j));
}
fn heat_set_q(g: &G, j: i32, q: f64) {
    let v = g.m.g(j);
    unsafe {
        g.t.s(j, (AMBIENT + (q - heat_h0(v, g.aux.g(j), g.sh.g(j))) * tf(&IC, v)) as f32);
    }
    g.lat.s(j, 0.0);
    heat_accept(g, j);
}
fn heat_recount(g: &G, i: i32) {
    let q = heat_q4(g, i, g.hm.g(i), g.ha.g(i), g.hs.g(i));
    heat_set_q(g, i, q);
}
#[inline(always)]
fn heat_sync(g: &G, j: i32) {
    if g.m.g(j) != g.hm.g(j) {
        heat_recount(g, j);
    }
}
fn heat_become(g: &G, j: i32, v: u8) {
    let q = heat_q(g, j);
    g.m.s(j, v);
    g.aux.s(j, 0);
    heat_set_q(g, j, q);
}
fn heat_share(g: &G, i: i32, j: i32) {
    heat_sync(g, i);
    heat_sync(g, j);
    let mut ci = tf(unsafe { &HC }, g.m.g(i));
    if !(ci != 0.0 && ci == ci) {
        ci = 1.0;
    }
    let mut cj = tf(unsafe { &HC }, g.m.g(j));
    if !(cj != 0.0 && cj == cj) {
        cj = 1.0;
    }
    let a = unsafe { AMBIENT };
    let q = ci * (g.t.g(i) as f64 - a) + g.lat.g(i) as f64 + cj * (g.t.g(j) as f64 - a) + g.lat.g(j) as f64;
    let t = (a + q / (ci + cj)) as f32;
    g.t.s(j, t);
    g.t.s(i, t);
    g.lat.s(j, 0.0);
    g.lat.s(i, 0.0);
}
fn heat_vanish(g: &G, j: i32) {
    let t = g.t.g(j) as f64;
    g.m.s(j, EMPTY);
    g.vy.s(j, 0);
    g.aux.s(j, 0);
    g.lat.s(j, 0.0);
    unsafe {
        g.t.s(j, (if t > T_MAX { T_MAX } else if t < T_MIN { T_MIN } else { t }) as f32);
    }
    heat_accept(g, j);
}

/* neighbour index: 0 up, 1 down, 2 left, 3 right. -1 if off the edge (world.ts sandNb) */
#[inline(always)]
fn nb(g: &G, x: i32, y: i32, k: i32) -> i32 {
    match k {
        0 => {
            if y > 0 {
                (y - 1) * g.gw + x
            } else {
                -1
            }
        }
        1 => {
            if y < g.gh - 1 {
                (y + 1) * g.gw + x
            } else {
                -1
            }
        }
        2 => {
            if x > 0 {
                y * g.gw + x - 1
            } else {
                -1
            }
        }
        _ => {
            if x < g.gw - 1 {
                y * g.gw + x + 1
            } else {
                -1
            }
        }
    }
}

const ROOM_ORDER: [[i32; 4]; 2] = [[0, 2, 3, 1], [0, 3, 2, 1]];
fn heat_room(g: &G, i: i32) -> i32 {
    let x = i % g.gw;
    let y = i / g.gw;
    let order = ROOM_ORDER[irnd(2) as usize & 1];
    for k in 0..4 {
        let j = nb(g, x, y, order[k]);
        if j >= 0 {
            let t = g.m.g(j);
            if t == EMPTY || t == SMOKE || t == STEAM {
                return j;
            }
        }
    }
    -1
}
fn heat_spawn(g: &G, i: i32, j: i32, v: u8) -> f64 {
    let before = heat_q(g, j);
    g.m.s(j, v);
    g.vy.s(j, 0);
    g.aux.s(j, 0);
    g.sh.s(j, g.sh.g(i));
    g.t.s(j, g.t.g(i));
    g.lat.s(j, 0.0);
    heat_accept(g, j);
    heat_q(g, j) - before
}

/* past the top of its range: melt, boil, catch (heat.ts heatUp) */
fn heat_up(g: &G, i: i32, v: u8) -> f64 {
    let m = g.m;
    g.lat.s(i, 0.0);
    match v {
        WATER => {
            m.s(i, STEAM);
            g.aux.s(i, 0);
            if rnd() < 0.05 {
                score(C_HISS);
            }
            0.0
        }
        SALTWATER => {
            let j = heat_room(g, i);
            m.s(i, SALT);
            g.aux.s(i, 0);
            let mut paid = 0.0;
            if j >= 0 {
                paid = heat_spawn(g, i, j, STEAM);
            }
            if rnd() < 0.05 {
                score(C_HISS);
            }
            paid
        }
        ICE | SNOW | PACKSNOW => {
            m.s(i, WATER);
            g.aux.s(i, 0);
            0.0
        }
        ROCKSALT => {
            m.s(i, SALT);
            g.aux.s(i, 0);
            0.0
        }
        STONE | GLASS | METAL => {
            m.s(i, LAVA);
            g.aux.s(i, if v == STONE { 0 } else { v });
            0.0
        }
        BRICK | CONCRETE | FIREBRICK | MOONROCK => {
            m.s(i, LAVA);
            g.aux.s(i, 0);
            0.0
        }
        STAINED => {
            m.s(i, LAVA);
            g.aux.s(i, GLASS);
            0.0
        }
        MORTAR => {
            m.s(i, CONCRETE);
            g.aux.s(i, 0);
            g.vy.s(i, 0);
            0.0
        }
        ORE | GIRDER => {
            m.s(i, LAVA);
            g.aux.s(i, METAL);
            0.0
        }
        COAL => {
            m.s(i, EMBER);
            g.aux.s(i, 1);
            0.0
        }
        SAND | SOIL => {
            m.s(i, GLASS);
            g.aux.s(i, 0);
            score(C_SCORE);
            0.0
        }
        WOOD | PLANK | DOOR | LADDER | STAIRS | TRESTLE => {
            m.s(i, EMBER);
            g.aux.s(i, 0);
            0.0
        }
        ACID => {
            m.s(i, SMOKE);
            g.aux.s(i, 0);
            0.0
        }
        GAS => {
            m.s(i, FIRE);
            g.sh.s(i, unsafe { CLEAN });
            g.aux.s(i, 0);
            score(C_WHOOSH);
            0.0
        }
        GUNPOWDER => {
            unsafe { js_boom(i) };
            0.0
        }
        FIREWORK => {
            unsafe { js_launch(i) };
            0.0
        }
        NUKE => {
            unsafe { js_nuke(i) };
            0.0
        }
        _ => {
            m.s(i, FIRE);
            g.aux.s(i, 0);
            g.sh.s(i, g.sh.g(i) & 127);
            0.0
        }
    }
}

/* past the bottom of its range: freeze, condense, set (heat.ts heatDown) */
fn heat_down(g: &G, i: i32, v: u8) -> f64 {
    let m = g.m;
    let gw = g.gw;
    let mut paid = 0.0;
    g.lat.s(i, 0.0);
    if v == WATER {
        m.s(i, if i + gw < g.n && m.g(i + gw) == EMPTY { SNOW } else { ICE });
        g.aux.s(i, 0);
        g.vy.s(i, 0);
    } else if v == STEAM {
        m.s(i, WATER);
        g.aux.s(i, 0);
        g.vy.s(i, 0);
    } else if v == MORTAR {
        m.s(i, SAND);
        g.aux.s(i, 0);
        g.vy.s(i, 0);
    } else if v == LAVA {
        let j = g.aux.g(i);
        m.s(i, if j == GLASS || j == METAL { j } else { STONE });
        g.aux.s(i, 0);
        g.vy.s(i, 0);
    } else if v == SALTWATER {
        let x = i % gw;
        let y = i / gw;
        let mut k = 0;
        while k < 4 {
            let j = nb(g, x, y, k);
            if j >= 0 {
                let t = m.g(j);
                if t == EMPTY {
                    paid = heat_spawn(g, i, j, SALT);
                    break;
                }
                if t == WATER {
                    let q = heat_q(g, j);
                    m.s(j, SALTWATER);
                    heat_set_q(g, j, q);
                    break;
                }
            }
            k += 1;
        }
        m.s(i, if k == 4 && rnd() < 0.3 { SALT } else { ICE });
        g.aux.s(i, 0);
        g.vy.s(i, 0);
    }
    paid
}

/* -------------------------------------------------------------------
   THE HEAT STEP (heat.ts heatStep, the walk by words: every row starts
   on a word, and every view lines up, as they always do here)
   ------------------------------------------------------------------- */
#[inline(always)]
fn l64_zero(b: u64) -> bool {
    (b << 1) == 0
}
/* the word at cell i is cold now (heat.ts heatWordCold) */
#[inline(always)]
fn word_cold(g: &G, i: i32) -> bool {
    unsafe {
        let w = g.m32.g(i >> 2);
        let s = i >> 1;
        g.t64.g(s) == AMB64
            && g.t64.g(s + 1) == AMB64
            && l64_zero(g.l64.g(s))
            && l64_zero(g.l64.g(s + 1))
            && (AQ2[(w & 0xffff) as usize] & AQ2[(w >> 16) as usize]) != 0
    }
}
fn snap_bits(g: &G, cf: P<i32>, a: i32, nw: i32) {
    let nbk = (nw + 31) >> 5;
    let mut s = a >> 1;
    let mut k = a >> 2;
    for b in 0..nbk {
        let mut bits: i32 = 0;
        let mut lim = nw - (b << 5);
        if lim > 32 {
            lim = 32;
        }
        /* (branch-free: every word of the valley comes through here once a tick) */
        let a64 = unsafe { AMB64 };
        for o in 0..lim {
            let w = g.m32.g(k);
            let ok = unsafe {
                ((g.t64.g(s) == a64) as u32)
                    & ((g.t64.g(s + 1) == a64) as u32)
                    & ((((g.l64.g(s) << 1) | (g.l64.g(s + 1) << 1)) == 0) as u32)
                    & ((AQ2[(w & 0xffff) as usize] & AQ2[(w >> 16) as usize]) as u32)
            };
            bits |= (ok as i32) << o;
            k += 1;
            s += 2;
        }
        if lim < 32 {
            bits |= -1i32 << lim;
        }
        cf.s(b, bits);
    }
}
fn row_cold_now(g: &G, cc: P<i32>, sp: P<i32>, a: i32, nw: i32) -> bool {
    let nbk = (nw + 31) >> 5;
    for b in 0..nbk {
        if (cc.g(b) | !sp.g(b)) != -1 {
            return false;
        }
    }
    for b in 0..nbk {
        let mut s = !sp.g(b);
        while s != 0 {
            let k = 31 - ((s & s.wrapping_neg()) as u32).leading_zeros() as i32;
            s &= s.wrapping_sub(1);
            if !word_cold(g, a + (((b << 5) + k) << 2)) {
                return false;
            }
        }
    }
    true
}
fn row_cold_fresh(g: &G, a: i32, nw: i32) -> bool {
    for k in 0..nw {
        if !word_cold(g, a + (k << 2)) {
            return false;
        }
    }
    true
}
/* heat.ts heatIdleWord */
fn idle_word(g: &G, i: i32) -> bool {
    let tt = g.t;
    let m = g.m;
    let gw = g.gw;
    let t0 = tt.g(i) as f64;
    let t1 = tt.g(i + 1) as f64;
    let t2 = tt.g(i + 2) as f64;
    let t3 = tt.g(i + 3) as f64;
    let b = i + gw;
    if t0 != t0 || t1 != t1 || t2 != t2 || t3 != t3 {
        return false;
    }
    let mut d = t1 - t0;
    if d > 0.05 || d < -0.05 {
        return false;
    }
    d = t2 - t1;
    if d > 0.05 || d < -0.05 {
        return false;
    }
    d = t3 - t2;
    if d > 0.05 || d < -0.05 {
        return false;
    }
    d = tt.g(i + 4) as f64 - t3;
    if d > 0.05 || d < -0.05 {
        return false;
    }
    d = tt.g(b) as f64 - t0;
    if d > 0.05 || d < -0.05 {
        return false;
    }
    d = tt.g(b + 1) as f64 - t1;
    if d > 0.05 || d < -0.05 {
        return false;
    }
    d = tt.g(b + 2) as f64 - t2;
    if d > 0.05 || d < -0.05 {
        return false;
    }
    d = tt.g(b + 3) as f64 - t3;
    if d > 0.05 || d < -0.05 {
        return false;
    }
    for c in 0..4 {
        let v = m.g(i + c);
        let u = i + c - gw;
        let t = match c {
            0 => t0,
            1 => t1,
            2 => t2,
            _ => t3,
        };
        if v == 0 {
            if (m.g(u) == 0 && t > tt.g(u) as f64 + 0.5)
                || (m.g(u - 1) == 0 && t > tt.g(u - 1) as f64 + 0.5)
                || (m.g(u + 1) == 0 && t > tt.g(u + 1) as f64 + 0.5)
            {
                return false;
            }
        } else if tb(unsafe { &LIQ }, v) && m.g(u) == v && t > tt.g(u) as f64 + 1.0 {
            return false;
        }
    }
    true
}
/* heat.ts heatAirWord */
fn air_word(g: &G, i0: i32) {
    let tt = g.t;
    let m = g.m;
    let gw = g.gw;
    let ic = unsafe { IC[0] as f64 };
    for c in 0..4 {
        let i = i0 + c;
        let mut t = tt.g(i) as f64;
        let mut up = i - gw;
        if (m.g(up) == 0 && t > tt.g(up) as f64 + 0.5)
            || (m.g(up - 1) == 0 && t > tt.g(up - 1) as f64 + 0.5)
            || (m.g(up + 1) == 0 && t > tt.g(up + 1) as f64 + 0.5)
        {
            if rnd() < 0.3 {
                up += if rnd() < 0.5 { -1 } else { 1 };
            }
            if m.g(up) == 0 && t > tt.g(up) as f64 + 0.5 && rnd() < 0.7 {
                let d = tt.g(up) as f64;
                tt.s(up, t as f32);
                t = d;
            }
        }
        up = i + gw;
        if m.g(up) == 0 && t < tt.g(up) as f64 - 0.5 && rnd() < 0.7 {
            let d = tt.g(up) as f64;
            tt.s(up, t as f32);
            t = d;
        }
        up = i + 1;
        if m.g(up) == 0 && (t > tt.g(up) as f64 + 0.5 || t < tt.g(up) as f64 - 0.5) && rnd() < 0.3 {
            let d = tt.g(up) as f64;
            tt.s(up, t as f32);
            t = d;
        }
        let mut j = i + 1;
        let mut d = tt.g(j) as f64 - t;
        if d > 0.05 || d < -0.05 {
            let w = m.g(j);
            let f = kp(0, w) * d;
            t += f * ic;
            tt.s(j, (tt.g(j) as f64 - f * tf(unsafe { &IC }, w)) as f32);
        }
        j = i + gw;
        d = tt.g(j) as f64 - t;
        if d > 0.05 || d < -0.05 {
            let w = m.g(j);
            let f = kp(0, w) * d;
            t += f * ic;
            tt.s(j, (tt.g(j) as f64 - f * tf(unsafe { &IC }, w)) as f32);
        }
        tt.s(i, t as f32);
    }
}
/* heat.ts heatSteadyScan */
#[inline(always)]
fn steady_word(g: &G, i: i32, bh: u32) -> bool {
    unsafe {
        let w = g.m32.g(i >> 2);
        !((BQ2[(w & 0xffff) as usize] & BQ2[(w >> 16) as usize]) == 0
            || (g.l32.g(i) | g.l32.g(i + 1) | g.l32.g(i + 2) | g.l32.g(i + 3)) != 0
            || g.t32.g(i) > bh
            || g.t32.g(i + 1) > bh
            || g.t32.g(i + 2) > bh
            || g.t32.g(i + 3) > bh)
    }
}
fn steady_scan(g: &G, mut i: i32, end: i32, bh: u32) -> i32 {
    while i < end {
        if !steady_word(g, i, bh) {
            return i;
        }
        i += 4;
    }
    end
}
fn steady_scan_k(g: &G, mut i: i32, end: i32, bh: u32, kk: P<i32>, r: i32) -> i32 {
    while i < end {
        let k = (i - r) >> 2;
        if (((kk.g(k >> 5) as u32) >> (k & 31)) & 1) != 0 {
            i += 4;
            continue;
        }
        if !steady_word(g, i, bh) {
            return i;
        }
        i += 4;
    }
    end
}
#[inline(always)]
fn fill(p: P<i32>, n: i32, v: i32) {
    for k in 0..n {
        p.s(k, v);
    }
}

fn heat_step(g: &G) {
    let m = g.m;
    let tt = g.t;
    let lat = g.lat;
    let gw = g.gw;
    let gh = g.gh;
    let n = g.n;
    let gw1 = gw - 1;
    let gh1 = gh - 1;
    let fast = g.fast;
    let a_mb = unsafe { AMBIENT };
    let ab = unsafe { AMB32 };
    let a64 = unsafe { AMB64 };

    /* 0. anything that turned into something else since it was last counted gets its new temperature from its heat */
    let n4 = n >> 2;
    for k4 in 0..n4 {
        if g.m32.g(k4) == g.hm32.g(k4) {
            continue;
        }
        let mut i = k4 << 2;
        while i < (k4 << 2) + 4 {
            if m.g(i) != g.hm.g(i) {
                heat_recount(g, i);
            }
            i += 1;
        }
    }
    let mut i = n4 << 2;
    while i < n {
        if m.g(i) != g.hm.g(i) {
            heat_recount(g, i);
        }
        i += 1;
    }

    /* 1. make heat, lose heat, move heat */
    let skip = g.skip;
    let nw = g.nw;
    let nbk = g.nb;
    let pad: i32 = if (nw & 31) == 0 { 0 } else { -1i32 << (nw & 31) };
    let mut cc = g.ba;
    let mut cn = g.bb;
    let mut sp = g.bc;
    let mut sc = g.bd;
    let aw = g.be;
    let ic_ = g.bf;
    let cpa = g.cp;
    let dna = g.dn;
    let mut nf: i32 = 0;
    let mut prev_s: i32;
    fill(sp, nbk, -1);
    snap_bits(g, cc, 0, nw);
    let has_dm = g.has_dmask;
    let clean = unsafe { CLEAN };
    let draught = unsafe { W_DRAUGHT };
    for y in 0..gh {
        let row = y * gw;
        if y < gh1 {
            snap_bits(g, cn, row + gw, nw);
        } else {
            fill(cn, nbk, -1);
        }
        let mut b2 = 0;
        while b2 < nbk {
            if cn.g(b2) != -1 {
                break;
            }
            b2 += 1;
        }
        if b2 == nbk
            && row_cold_now(g, cc, sp, row, nw)
            && (y == 0 || skip.g(y - 1) == 1 || row_cold_fresh(g, row - gw, nw))
        {
            skip.s(y, 1);
            fill(sp, nbk, -1);
            let sw = cc;
            cc = cn;
            cn = sw;
            continue;
        }
        skip.s(y, 0);
        for bq in 0..nbk {
            let lo2 = if bq > 0 { ((sp.g(bq - 1) as u32) >> 31) as i32 } else { 1 };
            let mut hi2 = if bq + 1 < nbk { sp.g(bq + 1) << 31 } else { i32::MIN };
            let s0 = sp.g(bq);
            let bits = s0 & ((s0 << 1) | lo2) & ((((s0 as u32) >> 1) as i32) | hi2);
            hi2 = if bq + 1 < nbk { cc.g(bq + 1) << 31 } else { i32::MIN };
            let c0 = cc.g(bq);
            aw.s(bq, bits & c0 & ((((c0 as u32) >> 1) as i32) | hi2) & cn.g(bq));
            sc.s(bq, 0);
            ic_.s(bq, 0);
        }
        sc.s(nbk - 1, pad);
        prev_s = 1;
        let mut x = 0;
        while x < gw {
            let i = row + x;
            if (x & 3) == 0 {
                let kw = x >> 2;
                let bw = kw >> 5;
                let ow = kw & 31;
                if prev_s == 1 {
                    let mut bits = ((aw.g(bw) as u32) >> ow) as i32;
                    if (bits & 1) != 0 {
                        /* a run of words that pass by on the bits */
                        bits = !bits;
                        let mut run = if bits == 0 {
                            32
                        } else {
                            31 - ((bits & bits.wrapping_neg()) as u32).leading_zeros() as i32
                        };
                        if kw + run > nw {
                            run = nw - kw;
                        }
                        sc.s(
                            bw,
                            sc.g(bw) | if run == 32 { -1 } else { ((1i32 << run).wrapping_sub(1)).wrapping_shl(ow as u32) },
                        );
                        x += run << 2;
                        continue;
                    }
                }
                /* the fifteen cells, as they stand now */
                let wq = g.m32.g(i >> 2);
                let i2 = i >> 1;
                let cold = unsafe { (AQ2[(wq & 0xffff) as usize] & AQ2[(wq >> 16) as usize]) != 0 }
                    && g.t64.g(i2) == a64
                    && g.t64.g(i2 + 1) == a64
                    && (x + 4 == gw || g.t32.g(i + 4) == ab)
                    && (y == gh1 || (g.t64.g((i + gw) >> 1) == a64 && g.t64.g(((i + gw) >> 1) + 1) == a64))
                    && (y == 0
                        || (g.t64.g((i - gw) >> 1) == a64
                            && g.t64.g(((i - gw) >> 1) + 1) == a64
                            && (x == 0 || g.t32.g(i - gw - 1) == ab)
                            && (x + 4 == gw || g.t32.g(i - gw + 4) == ab)));
                if cold {
                    sc.s(bw, sc.g(bw) | (1i32 << ow));
                    prev_s = 1;
                    x += 4;
                    continue;
                }
                prev_s = 0;
                if x > 0
                    && x + 4 < gw
                    && y > 0
                    && y < gh1
                    && unsafe { IQ2[(wq & 0xffff) as usize] != 0 && IQ2[(wq >> 16) as usize] != 0 }
                    && idle_word(g, i)
                {
                    ic_.s(bw, ic_.g(bw) | (1i32 << ow));
                    prev_s = 1;
                    x += 4;
                    continue;
                }
                if wq == 0 && unsafe { AIRW } && x > 0 && x + 4 < gw && y > 0 && y < gh1 {
                    air_word(g, i);
                    x += 4;
                    continue;
                }
            }
            let v = m.g(i);
            let mut t = tt.g(i) as f64;
            let src = tf(unsafe { &SRC }, v);
            if src != 0.0 && src == src {
                let mut d = if v == FIRE && g.sh.g(i) >= clean { 900.0 } else { src };
                if has_dm && g.dmask.g(i) != 0 {
                    d = draught;
                }
                if t < d {
                    let f = (d - t) * tf(unsafe { &HC }, v);
                    let pw = tf(unsafe { &POW }, v);
                    t += (if f < pw { f } else { pw }) * tf(unsafe { &IC }, v);
                }
            } else if v == EMPTY {
                if y > 0 {
                    let mut up = i - gw;
                    if x > 0 && x < gw1 {
                        if (m.g(up) == EMPTY && t > tt.g(up) as f64 + 0.5)
                            || (m.g(up - 1) == EMPTY && t > tt.g(up - 1) as f64 + 0.5)
                            || (m.g(up + 1) == EMPTY && t > tt.g(up + 1) as f64 + 0.5)
                        {
                            if rnd() < 0.3 {
                                up += if rnd() < 0.5 { -1 } else { 1 };
                            }
                            if m.g(up) == EMPTY && t > tt.g(up) as f64 + 0.5 && rnd() < 0.7 {
                                let d = tt.g(up) as f64;
                                tt.s(up, t as f32);
                                t = d;
                            }
                        }
                    } else if m.g(up) == EMPTY && t > tt.g(up) as f64 + 0.5 && rnd() < 0.7 {
                        let d = tt.g(up) as f64;
                        tt.s(up, t as f32);
                        t = d;
                    }
                }
                if y < gh1 {
                    let up = i + gw;
                    if m.g(up) == EMPTY && t < tt.g(up) as f64 - 0.5 && rnd() < 0.7 {
                        let d = tt.g(up) as f64;
                        tt.s(up, t as f32);
                        t = d;
                    }
                }
                if x < gw1 {
                    let up = i + 1;
                    if m.g(up) == EMPTY && (t > tt.g(up) as f64 + 0.5 || t < tt.g(up) as f64 - 0.5) && rnd() < 0.3 {
                        let d = tt.g(up) as f64;
                        tt.s(up, t as f32);
                        t = d;
                    }
                }
            } else if tb(unsafe { &LIQ }, v)
                && y > 0
                && m.g(i - gw) == v
                && t > tt.g(i - gw) as f64 + 1.0
                && rnd() < (if v == LAVA { 0.01 } else { 0.25 })
            {
                let up = i - gw;
                let d = tt.g(up) as f64;
                tt.s(up, t as f32);
                t = d;
                let l = lat.g(up);
                lat.s(up, lat.g(i));
                lat.s(i, l);
            }
            let icv = tf(unsafe { &IC }, v);
            if x < gw1 {
                let j = i + 1;
                let d = tt.g(j) as f64 - t;
                if d > 0.05 || d < -0.05 {
                    let w = m.g(j);
                    let f = kp(v, w) * d;
                    t += f * icv;
                    tt.s(j, (tt.g(j) as f64 - f * tf(unsafe { &IC }, w)) as f32);
                }
                if v == METAL && m.g(j) == METAL {
                    fast.s(nf, i);
                    nf += 1;
                }
            }
            if y < gh1 {
                let j = i + gw;
                let d = tt.g(j) as f64 - t;
                if d > 0.05 || d < -0.05 {
                    let w = m.g(j);
                    let f = kp(v, w) * d;
                    t += f * icv;
                    tt.s(j, (tt.g(j) as f64 - f * tf(unsafe { &IC }, w)) as f32);
                }
                if v == METAL && m.g(j) == METAL {
                    fast.s(nf, -i - 1);
                    nf += 1;
                }
            }
            /* the edges of the room touch the outside */
            if x == 0 || x == gw1 || y == 0 || y == gh1 {
                t += tf(unsafe { &BK }, v) * (a_mb - t) * icv;
            }
            tt.s(i, t as f32);
            x += 1;
        }
        let mut kw = y * nbk;
        for bq in 0..nbk {
            cpa.s(kw, sc.g(bq) & cc.g(bq));
            dna.s(kw, sc.g(bq) | ic_.g(bq));
            kw += 1;
        }
        let sw = sp;
        sp = sc;
        sc = sw;
        let sw = cc;
        cc = cn;
        cn = sw;
    }
    /* metal gets a few more goes, between metal only, so a bar carries heat end to end */
    if nf > 0 {
        let kk = kp(METAL, METAL) * tf(unsafe { &IC }, METAL);
        for _p in 0..unsafe { HEAT_FAST } {
            for q in 0..nf {
                let mut i = fast.g(q);
                let j;
                if i < 0 {
                    i = -i - 1;
                    j = i + gw;
                } else {
                    j = i + 1;
                }
                let f = (tt.g(j) as f64 - tt.g(i) as f64) * kk;
                tt.s(i, (tt.g(i) as f64 + f) as f32);
                tt.s(j, (tt.g(j) as f64 - f) as f32);
            }
        }
    }

    /* 2. anything out of its range changes, once it has soaked up (or given up) enough */
    let aux = g.aux;
    let mut still = true;
    let has_bq2 = unsafe { HAS_BQ2 };
    let bh = unsafe { BAND_HI32 };
    let s2 = has_bq2;
    let kk = g.bk;
    let mut i: i32 = 0;
    for y in 0..gh {
        let end = i + gw;
        if still && skip.g(y) == 1 && (y == gh1 || skip.g(y + 1) == 1) {
            i = end;
            continue;
        }
        if s2 && still {
            let r2 = y * nbk;
            let o2 = r2 + nbk;
            let sy = skip.g(y) == 1;
            let sn = y == gh1 || skip.g(y + 1) == 1;
            for bq in 0..nbk {
                let cp = if sy { -1 } else { cpa.g(r2 + bq) };
                if sn {
                    kk.s(bq, cp);
                    continue;
                }
                let dn = dna.g(o2 + bq);
                let dl = if bq > 0 { ((dna.g(o2 + bq - 1) as u32) >> 31) as i32 } else { 1 };
                let dr = if bq + 1 < nbk { dna.g(o2 + bq + 1) << 31 } else { i32::MIN };
                kk.s(bq, cp & dn & ((dn << 1) | dl) & ((((dn as u32) >> 1) as i32) | dr));
            }
        }
        while i < end {
            if (i & 3) == 0 && has_bq2 {
                i = if still && s2 { steady_scan_k(g, i, end, bh, kk, end - gw) } else { steady_scan(g, i, end, bh) };
                if i >= end {
                    break;
                }
            }
            let v = m.g(i);
            let t = tt.g(i) as f64;
            let hi = tf(unsafe { &HI }, v);
            let mut lo = tf(unsafe { &LO }, v);
            let mut w: u8 = 0;
            if v == LAVA {
                w = aux.g(i) & 31;
                lo = tf(unsafe { &LAVA_LO }, w);
            }
            let cv = tf(unsafe { &HC }, v);
            if t > hi {
                let l = tf(unsafe { &HI_L }, v);
                if l <= 0.0 {
                    still = false;
                    let q = heat_q(g, i);
                    heat_up(g, i, v);
                    if m.g(i) != v && v != GUNPOWDER && v != NUKE {
                        heat_set_q(g, i, q);
                    }
                    i += 1;
                    continue;
                }
                let e = lat.g(i) as f64 + (t - hi) * cv;
                tt.s(i, hi as f32);
                if e >= l * heat_f(g.sh.g(i)) {
                    still = false;
                    lat.s(i, e as f32);
                    let q = heat_q(g, i);
                    let paid = heat_up(g, i, v);
                    heat_set_q(g, i, q - paid);
                } else {
                    lat.s(i, e as f32);
                }
            } else if t < lo {
                let l = if v == LAVA { tf(unsafe { &HI_L }, if w != 0 { w } else { STONE }) } else { tf(unsafe { &LO_L }, v) };
                if l <= 0.0 {
                    still = false;
                    let q = heat_q(g, i);
                    heat_down(g, i, v);
                    if m.g(i) != v {
                        heat_set_q(g, i, q);
                    }
                    i += 1;
                    continue;
                }
                let e = lat.g(i) as f64 - (lo - t) * cv;
                tt.s(i, lo as f32);
                if -e >= l * heat_f(g.sh.g(i)) {
                    still = false;
                    lat.s(i, e as f32);
                    let q = heat_q(g, i);
                    let paid = heat_down(g, i, v);
                    heat_set_q(g, i, q - paid);
                } else {
                    lat.s(i, e as f32);
                }
            } else {
                let mut e = lat.g(i) as f64;
                let hl = tf(unsafe { &HI_L }, v);
                let ll = tf(unsafe { &LO_L }, v);
                let icv = tf(unsafe { &IC }, v);
                if e > 0.0 {
                    /* was partway to melting, and is cooling off again: it gives back what it took first */
                    if hl > 0.0 && t < hi {
                        e -= (hi - t) * cv;
                        if e < 0.0 {
                            tt.s(i, (hi + e * icv) as f32);
                            e = 0.0;
                        } else {
                            tt.s(i, hi as f32);
                        }
                    } else if !(hl > 0.0) {
                        tt.s(i, (t + e * icv) as f32);
                        e = 0.0;
                    }
                    lat.s(i, e as f32);
                } else if e < 0.0 {
                    if ll > 0.0 && t > lo {
                        e += (t - lo) * cv;
                        if e > 0.0 {
                            tt.s(i, (lo + e * icv) as f32);
                            e = 0.0;
                        } else {
                            tt.s(i, lo as f32);
                        }
                    } else if !(ll > 0.0) {
                        tt.s(i, (t + e * icv) as f32);
                        e = 0.0;
                    }
                    lat.s(i, e as f32);
                }
            }
            i += 1;
        }
    }
    let _ = a_mb;
}

/* -------------------------------------------------------------------
   CELL PLUMBING (world.ts)
   ------------------------------------------------------------------- */
#[inline(always)]
fn held(g: &G, j: i32) -> bool {
    g.m.g(j) == MORTAR && (g.aux.g(j) & 128) != 0
}
#[inline(always)]
fn can(g: &G, src: u8, j: i32) -> bool {
    let t = g.m.g(j);
    unsafe {
        t == EMPTY
            || (g.stamp.g(j) != g.tick
                && FREE[t as usize] == 1
                && DENS[t as usize] < DENS[src as usize]
                && (FLUID[t as usize] != 0 || FLUID[src as usize] != 0)
                && !held(g, j))
    }
}
fn has(g: &G, x: i32, y: i32, t: u8) -> i32 {
    for k in 0..4 {
        let j = nb(g, x, y, k);
        if j >= 0 && g.m.g(j) == t {
            return j;
        }
    }
    -1
}
fn hot_nb(g: &G, x: i32, y: i32) -> i32 {
    for k in 0..4 {
        let j = nb(g, x, y, k);
        if j >= 0 && tb(unsafe { &HOT }, g.m.g(j)) {
            return j;
        }
    }
    -1
}
fn wet_nb(g: &G, x: i32, y: i32) -> i32 {
    for k in 0..4 {
        let j = nb(g, x, y, k);
        if j >= 0 && tb(unsafe { &WET }, g.m.g(j)) {
            return j;
        }
    }
    -1
}
fn swap(g: &G, i: i32, j: i32) {
    let m = g.m;
    let t = m.g(j);
    m.s(j, m.g(i));
    m.s(i, t);
    let t = g.sh.g(j);
    g.sh.s(j, g.sh.g(i));
    g.sh.s(i, t);
    let t = g.vy.g(j);
    g.vy.s(j, g.vy.g(i));
    g.vy.s(i, t);
    let t = g.aux.g(j);
    g.aux.s(j, g.aux.g(i));
    g.aux.s(i, t);
    let t = g.t.g(j);
    g.t.s(j, g.t.g(i));
    g.t.s(i, t);
    let t = g.lat.g(j);
    g.lat.s(j, g.lat.g(i));
    g.lat.s(i, t);
    let t = g.hm.g(j);
    g.hm.s(j, g.hm.g(i));
    g.hm.s(i, t);
    let t = g.ha.g(j);
    g.ha.s(j, g.ha.g(i));
    g.ha.s(i, t);
    let t = g.hs.g(j);
    g.hs.s(j, g.hs.g(i));
    g.hs.s(i, t);
    g.stamp.s(j, g.tick);
    if m.g(i) != EMPTY {
        g.stamp.s(i, g.tick);
    }
}
fn sand_set(g: &G, j: i32, v: u8) {
    let q = heat_q(g, j) - tf(unsafe { &HLAT }, g.hm.g(j)) * heat_f(g.hs.g(j));
    g.m.s(j, v);
    g.vy.s(j, 0);
    g.aux.s(j, 0);
    g.sh.s(j, irnd(256) as u8);
    heat_set_q(g, j, q);
}
fn sand_place(g: &G, j: i32, v: u8) {
    g.m.s(j, v);
    g.vy.s(j, 0);
    g.aux.s(j, 0);
    g.sh.s(j, irnd(256) as u8);
    g.t.s(j, unsafe { T0[v as usize] });
    g.lat.s(j, 0.0);
    heat_accept(g, j);
}
fn fall(g: &G, i: i32, _x: i32, y: i32, v: u8) -> bool {
    let gw = g.gw;
    let m = g.m;
    let sp = g.vy.g(i) as i32;
    let n = 1 + (sp >> 2);
    let mut cur = i;
    let mut moved = 0;
    let mut s = 0;
    while s < n && y + s + 1 < g.gh {
        let j = cur + gw;
        if !can(g, v, j) {
            break;
        }
        let t = m.g(j);
        swap(g, cur, j);
        cur = j;
        moved += 1;
        if unsafe { DENS[t as usize] } >= 1.0 {
            g.vy.s(cur, 0);
            return true;
        }
        s += 1;
    }
    if moved == 0 {
        g.vy.s(i, 0);
        return false;
    }
    let vm = unsafe { VMAX };
    g.vy.s(cur, (if vm < sp + 1 { vm } else { sp + 1 }) as u8);
    true
}

/* -------------------------------------------------------------------
   THE RULES (world.ts, one function per family of thing)
   ------------------------------------------------------------------- */
fn fire(g: &G, i: i32, x: i32, y: i32) {
    let m = g.m;
    let mut fed = false;
    for k in 0..4 {
        let j = nb(g, x, y, k);
        if j < 0 {
            continue;
        }
        let n = m.g(j);
        let r = rnd();
        let woody = tb(unsafe { &WOODY }, n);
        let leafy = tb(unsafe { &LEAFY }, n);
        if n == OIL || woody || leafy {
            fed = true;
        }
        if n == OIL && r < 0.3 {
            m.s(j, FIRE);
        } else if n == GAS {
            m.s(j, FIRE);
            g.sh.s(j, unsafe { CLEAN });
            score(C_WHOOSH);
        } else if woody && r < 0.03 {
            m.s(j, EMBER);
        } else if leafy && r < 0.08 {
            m.s(j, FIRE);
        } else if n == GUNPOWDER {
            unsafe { js_boom(j) };
            return;
        } else if n == FIREWORK {
            unsafe { js_launch(j) };
        } else if n == NUKE {
            unsafe { js_nuke(j) };
            return;
        } else if tb(unsafe { &WET }, n) && r < 0.1 {
            heat_become(g, i, SMOKE);
            score(C_HISS);
            return;
        }
    }
    let clean = g.sh.g(i) >= unsafe { CLEAN };
    if rnd() < (if fed { 0.04 } else if clean { 0.11 } else { 0.15 }) {
        let r = rnd();
        m.s(i, if r < 0.3 && !clean && g.sh.g(i) < 128 { ASH } else if r < 0.45 { SMOKE } else { EMPTY });
        g.aux.s(i, 0);
        return;
    }
    let r = rnd();
    if r < (if clean { 0.6 } else { 0.35 }) && y > 0 {
        let nx = x + if r < 0.06 { -1 } else if r < 0.12 { 1 } else { 0 };
        if nx < 0 || nx >= g.gw {
            return;
        }
        let j = (y - 1) * g.gw + nx;
        if m.g(j) == EMPTY {
            swap(g, i, j);
        }
    }
}

fn bubble(g: &G, i: i32, x: i32, y: i32) -> bool {
    let m = g.m;
    let gw = g.gw;
    if y == 0 {
        return false;
    }
    let j = i - gw;
    if tb(unsafe { &LIQ }, m.g(j)) && g.stamp.g(j) != g.tick && !held(g, j) {
        swap(g, i, j);
        return true;
    }
    let mut dd = if rnd() < 0.5 { -1 } else { 1 };
    for _k in 0..2 {
        let nx = x + dd;
        if nx >= 0 && nx < gw {
            let j = i - gw + dd;
            if tb(unsafe { &LIQ }, m.g(j))
                && tb(unsafe { &LIQ }, m.g(i - gw))
                && g.stamp.g(j) != g.tick
                && !held(g, j)
                && !held(g, i - gw)
            {
                swap(g, i, j);
                return true;
            }
        }
        dd = -dd;
    }
    false
}

fn steam(g: &G, i: i32, x: i32, y: i32) {
    if y == 0 {
        return;
    }
    if bubble(g, i, x, y) {
        return;
    }
    let j = nb(g, x, y, 0);
    if j >= 0 && g.m.g(j) == EMPTY {
        swap(g, i, j);
        return;
    }
    let mut dd = if rnd() < 0.5 { -1 } else { 1 };
    for _t in 0..2 {
        let nx = x + dd;
        if nx >= 0 && nx < g.gw {
            let j = (y - 1) * g.gw + nx;
            if g.m.g(j) == EMPTY {
                swap(g, i, j);
                return;
            }
        }
        dd = -dd;
    }
    for _t in 0..2 {
        let nx = x + dd;
        if nx >= 0 && nx < g.gw {
            let j = y * g.gw + nx;
            if g.m.g(j) == EMPTY {
                swap(g, i, j);
                return;
            }
        }
        dd = -dd;
    }
}

fn smoke(g: &G, i: i32, x: i32, y: i32) {
    let a = g.aux.g(i);
    if a != 0 {
        g.aux.s(i, a - 1);
        if y > 0 && rnd() < 0.12 {
            let j = i - g.gw;
            if g.m.g(j) == EMPTY {
                swap(g, i, j);
            }
        }
        return;
    }
    if rnd() < 0.03 || (y == 0 && rnd() < 0.3) {
        g.m.s(i, EMPTY);
        return;
    }
    if bubble(g, i, x, y) {
        return;
    }
    if y == 0 || rnd() < 0.3 {
        return;
    }
    let mut dd = if rnd() < 0.5 { -1 } else { 1 };
    let j = nb(g, x, y, 0);
    if j >= 0 && rnd() < 0.6 && g.m.g(j) == EMPTY {
        swap(g, i, j);
        return;
    }
    for _t in 0..2 {
        let nx = x + dd;
        if nx >= 0 && nx < g.gw {
            let j = (if rnd() < 0.6 { y - 1 } else { y }) * g.gw + nx;
            if g.m.g(j) == EMPTY {
                swap(g, i, j);
                return;
            }
        }
        dd = -dd;
    }
}

fn gas(g: &G, i: i32, x: i32, y: i32) {
    let m = g.m;
    if hot_nb(g, x, y) >= 0 {
        m.s(i, FIRE);
        g.sh.s(i, unsafe { CLEAN });
        score(C_WHOOSH);
        return;
    }
    if bubble(g, i, x, y) {
        return;
    }
    if rnd() < 0.4 {
        return;
    }
    let r = rnd();
    let mut nx = x;
    let mut ny = y;
    if r < 0.35 {
        ny -= 1;
    } else if r < 0.45 {
        ny += 1;
    } else {
        nx += if r < 0.725 { -1 } else { 1 };
    }
    if nx < 0 || ny < 0 || nx >= g.gw || ny >= g.gh {
        return;
    }
    let j = ny * g.gw + nx;
    if m.g(j) == EMPTY {
        swap(g, i, j);
    }
}

fn flows(g: &G, v: u8, j: i32) -> bool {
    let t = g.m.g(j);
    let m = g.m;
    let gw = g.gw;
    let x = j % gw;
    if t == EMPTY {
        return true;
    }
    if tb(unsafe { &LIQ }, t) || !can(g, v, j) {
        return false;
    }
    !((j >= gw && tb(unsafe { &LIQ }, m.g(j - gw)))
        || (x > 0 && x < gw - 1 && tb(unsafe { &LIQ }, m.g(j - 1)) && tb(unsafe { &LIQ }, m.g(j + 1))))
}

fn spread(g: &G, i: i32, x: i32, y: i32, range: i32) -> bool {
    let gw = g.gw;
    let v = g.m.g(i);
    let mut dd = if rnd() < 0.5 { -1 } else { 1 };
    let reach = 1 + irnd(range);
    for _t in 0..2 {
        let mut best = -1;
        let mut s = 1;
        while s <= reach {
            let nx = x + dd * s;
            if nx < 0 || nx >= gw {
                break;
            }
            let j = y * gw + nx;
            if !flows(g, v, j) {
                break;
            }
            best = j;
            if y + 1 < g.gh && flows(g, v, j + gw) {
                break;
            }
            s += 1;
        }
        if best >= 0 {
            swap(g, i, best);
            return true;
        }
        dd = -dd;
    }
    false
}

fn slide(g: &G, i: i32, x: i32, y: i32) -> bool {
    let v = g.m.g(i);
    let mut dd = if rnd() < 0.5 { -1 } else { 1 };
    if y + 1 >= g.gh {
        return false;
    }
    for _t in 0..2 {
        let nx = x + dd;
        if nx >= 0 && nx < g.gw {
            let j = (y + 1) * g.gw + nx;
            if flows(g, v, j) {
                swap(g, i, j);
                return true;
            }
        }
        dd = -dd;
    }
    false
}

fn press_candidate(g: &G, i: i32) {
    unsafe {
        PRESS_N += 1;
        let n = PRESS_N;
        if n <= PRESS_TRIES {
            g.plist.s(n - 1, i);
        } else {
            let k = irnd(n);
            if k < PRESS_TRIES {
                g.plist.s(k, i);
            }
        }
    }
}

fn pressure(g: &G, i: i32) -> bool {
    let gw = g.gw;
    let gh = g.gh;
    let m = g.m;
    let vy = g.vy;
    let v = m.g(i);
    let y = i / gw;
    let mark = g.pmark;
    let stack = g.pstack;
    let mut gen;
    unsafe {
        PGEN = PGEN.wrapping_add(1);
        gen = PGEN;
    }
    let mut sp: i32 = 0;
    let mut seen: i32 = 0;
    let side = if rnd() < 0.5 { -1 } else { 1 };
    if gen >= 0xffffffff {
        for k in 0..g.n {
            mark.s(k, 0);
        }
        unsafe {
            PGEN = 1;
        }
        gen = 1;
    }
    mark.s(i, gen);
    stack.s(sp, i);
    sp += 1;
    let scan = unsafe { PRESS_SCAN };
    while sp > 0 && seen < scan {
        sp -= 1;
        let j = stack.g(sp);
        seen += 1;
        let jx = j % gw;
        let jy = j / gw;
        for k in 0..4 {
            let nbi;
            if k == 0 {
                nbi = if jy > 0 { j - gw } else { -1 };
            } else if k == 3 {
                nbi = if jy < gh - 1 { j + gw } else { -1 };
            } else {
                let nx = jx + if k == 1 { -side } else { side };
                nbi = if nx >= 0 && nx < gw { j - jx + nx } else { -1 };
            }
            if nbi < 0 || mark.g(nbi) == gen {
                continue;
            }
            mark.s(nbi, gen);
            let t = m.g(nbi);
            if t == v {
                if vy.g(nbi) == 0 {
                    stack.s(sp, nbi);
                    sp += 1;
                }
            } else if t == EMPTY
                && jy + (if k == 0 { -1 } else if k == 3 { 1 } else { 0 }) > y
                && (nbi + gw >= g.n || !tb(unsafe { &AIRY }, m.g(nbi + gw)))
            {
                swap(g, i, nbi);
                g.vy.s(nbi, 0);
                return true;
            }
        }
    }
    false
}

fn float(g: &G, i: i32, x: i32, y: i32) -> bool {
    let j = nb(g, x, y, 0);
    let v = g.m.g(i);
    if j >= 0 {
        let mj = g.m.g(j);
        unsafe {
            if g.stamp.g(j) != g.tick
                && FREE[mj as usize] == 1
                && DENS[mj as usize] > DENS[v as usize]
                && (FLUID[mj as usize] != 0 || FLUID[v as usize] != 0)
                && !held(g, j)
                && rnd() < 0.5
            {
                swap(g, i, j);
                return true;
            }
        }
    }
    false
}

/* sand, ash, gunpowder, salt, seeds, snow (fireworks and nukes are JS's: js_turn) */
fn powder(g: &G, i: i32, x: i32, y: i32) {
    let m = g.m;
    let v = m.g(i);
    let gw = g.gw;
    if (v == SAND || v == ASH || v == SNOW) && y + 1 < g.gh {
        let j = i + gw;
        if t64(unsafe { &CANT }, v, m.g(j))
            && (y == 0 || t64(unsafe { &NOFLOAT }, v, m.g(i - gw)))
            && (x == 0 || t64(unsafe { &CANT }, v, m.g(j - 1)))
            && (x == gw - 1 || t64(unsafe { &CANT }, v, m.g(j + 1)))
        {
            g.vy.s(i, 0);
            rnd();
            return;
        }
    }
    if v == GUNPOWDER {
        if hot_nb(g, x, y) >= 0 {
            unsafe { js_boom(i) };
            return;
        }
    } else if v == SALT {
        let mut j = has(g, x, y, ICE);
        if j < 0 {
            j = has(g, x, y, SNOW);
        }
        if j < 0 {
            j = has(g, x, y, PACKSNOW);
        }
        if j >= 0 && rnd() < 0.08 {
            heat_become(g, j, SALTWATER);
            m.s(i, EMPTY);
            score(C_SCORE);
            return;
        }
        j = has(g, x, y, PLANT);
        if j < 0 {
            j = has(g, x, y, FLOWER);
        }
        if j >= 0 && rnd() < 0.08 {
            m.s(j, EMPTY);
            m.s(i, EMPTY);
            score(C_SCORE);
            return;
        }
        j = has(g, x, y, WATER);
        if j >= 0 && rnd() < 0.02 {
            m.s(j, SALTWATER);
            m.s(i, EMPTY);
            return;
        }
    } else if v == SEED && y + 1 < g.gh {
        let t = m.g(i + gw);
        if (t == SAND || t == ASH || t == PLANT || t == SOIL) && has(g, x, y, WATER) >= 0 && rnd() < 0.04 {
            m.s(i, PLANT);
            g.aux.s(i, (12 + irnd(30)) as u8);
            score(C_SCORE);
            return;
        }
    }
    if y + 1 < g.gh && fall(g, i, x, y, v) {
        return;
    }
    if float(g, i, x, y) {
        return;
    }
    let mut dd = if rnd() < 0.5 { -1 } else { 1 };
    for _t in 0..2 {
        let nx = x + dd;
        let ny = y + 1;
        if !(nx < 0 || nx >= g.gw || ny >= g.gh) {
            let j = ny * g.gw + nx;
            if can(g, v, j) {
                swap(g, i, j);
                return;
            }
        }
        dd = -dd;
    }
}

fn liquid(g: &G, i: i32, x: i32, y: i32) {
    let m = g.m;
    let v = m.g(i);
    let gw = g.gw;
    if (v == WATER || v == OIL) && y + 1 < g.gh {
        let j = i + gw;
        if t64(unsafe { &CANT }, v, m.g(j))
            && (y == 0 || t64(unsafe { &NOFLOAT }, v, m.g(i - gw)))
            && (x == 0 || (t64(unsafe { &NOFLOW }, v, m.g(j - 1)) && t64(unsafe { &NOFLOW }, v, m.g(i - 1))))
            && (x == gw - 1 || (t64(unsafe { &NOFLOW }, v, m.g(j + 1)) && t64(unsafe { &NOFLOW }, v, m.g(i + 1))))
        {
            g.vy.s(i, 0);
            rnd();
            rnd();
            rnd();
            if y > 0 && m.g(i - gw) == EMPTY {
                press_candidate(g, i);
            }
            return;
        }
    }
    if v == SALTWATER {
        if rnd() < 0.03 {
            let j = nb(g, x, y, irnd(4));
            if j >= 0 && m.g(j) == WATER && g.stamp.g(j) != g.tick {
                swap(g, i, j);
                return;
            }
        }
    } else if v == LAVA {
        let j = wet_nb(g, x, y);
        if j >= 0 && rnd() < 0.12 {
            heat_sync(g, i);
            heat_sync(g, j);
            let w = m.g(j);
            let qw = heat_q(g, j);
            unsafe {
                let need = tf(&HC, w) * (tf(&HI, w) - AMBIENT) + tf(&HI_L, w) * heat_f(g.sh.g(j)) + heat_h0(w, 0, g.sh.g(j)) - qw;
                if need > 0.0 && g.t.g(i) as f64 - need * tf(&IC, v) > tf(&HI, w) {
                    g.t.s(i, (g.t.g(i) as f64 - need * tf(&IC, v)) as f32);
                    g.t.s(j, HI[w as usize]);
                    g.lat.s(j, 0.0);
                    heat_accept(g, j);
                    let paid = heat_up(g, j, w);
                    heat_set_q(g, j, qw + need - paid);
                    score(C_SCORE);
                    score(C_HISS);
                }
            }
        }
        for k in 0..4 {
            let j = nb(g, x, y, k);
            if j < 0 {
                continue;
            }
            let t = m.g(j);
            let r = rnd();
            let woody = tb(unsafe { &WOODY }, t);
            if (t == OIL && r < 0.1) || (tb(unsafe { &LEAFY }, t) && r < 0.05) || (woody && r < 0.02) {
                m.s(j, if woody { EMBER } else { FIRE });
            } else if t == GUNPOWDER {
                unsafe { js_boom(j) };
            } else if t == FIREWORK {
                unsafe { js_launch(j) };
            } else if t == NUKE {
                unsafe { js_nuke(j) };
            }
        }
        if m.g(i) != v {
            return;
        }
    } else if v == MORTAR {
        if (g.tick.wrapping_add(i as u32) & 7) == 0 {
            let ma = g.aux.g(i);
            let mc = (ma & 127) as i32 + if (g.t.g(i) as f64) > 30.0 { 2 } else { 1 };
            if mc >= unsafe { W_SET } {
                heat_become(g, i, CONCRETE);
                return;
            }
            g.aux.s(i, (ma & 128) | (mc as u8));
        }
        if (g.aux.g(i) & 128) != 0 {
            return;
        }
    } else if v == ACID {
        let mut gone = false;
        let mut k = 0;
        while k < 4 && !gone {
            let j = nb(g, x, y, k);
            k += 1;
            if j < 0 {
                continue;
            }
            let t = m.g(j);
            let mut p = 0.0;
            if t == STONE || t == BRICK || t == ORE || t == COAL || t == CONCRETE || t == FIREBRICK || t == MOONROCK {
                p = 0.006;
            } else if t == METAL || t == GIRDER {
                p = 0.003;
            } else if t == SAND
                || t == SOIL
                || tb(unsafe { &WOODY }, t)
                || tb(unsafe { &LEAFY }, t)
                || t == ICE
                || t == GUNPOWDER
                || t == ASH
                || t == SNOW
                || t == PACKSNOW
                || t == MORTAR
            {
                p = 0.04;
            }
            if p != 0.0 && rnd() < p {
                g.lat.s(j, 0.0);
                m.s(j, EMPTY);
                if rnd() < 0.3 {
                    gone = true;
                }
            }
        }
        if gone {
            m.s(i, EMPTY);
            return;
        }
    }

    if y + 1 < g.gh && fall(g, i, x, y, v) {
        return;
    }
    if float(g, i, x, y) {
        return;
    }
    if v == LAVA {
        /* clamp((T - LAVA_LO) / 1000, 0.04, 0.45), as world.ts clamp has it (a NaN stays a NaN) */
        let c = (g.t.g(i) as f64 - tf(unsafe { &LAVA_LO }, g.aux.g(i) & 31)) / 1000.0;
        let c = if c < 0.04 { 0.04 } else if c > 0.45 { 0.45 } else { c };
        if rnd() > c {
            return;
        }
    }
    if slide(g, i, x, y) {
        return;
    }
    if spread(g, i, x, y, if v == LAVA { 1 } else if tb(unsafe { &WET }, v) { 7 } else { 4 }) {
        return;
    }
    if v != LAVA && v != MORTAR && y > 0 && g.m.g(i - g.gw) == EMPTY {
        press_candidate(g, i);
    }
}

fn grow(g: &G, i: i32, x: i32, y: i32, b: i32) {
    let m = g.m;
    let gw = g.gw;
    let r = rnd();
    let nx = x + if r < 0.6 { 0 } else if r < 0.8 { -1 } else { 1 };
    let ny = y - 1;
    if ny < 0 || nx < 0 || nx >= gw {
        g.aux.s(i, 0);
        return;
    }
    let j = ny * gw + nx;
    if m.g(j) != EMPTY && m.g(j) != WATER {
        if rnd() < 0.05 {
            g.aux.s(i, 0);
        }
        return;
    }
    sand_set(g, j, PLANT);
    g.stamp.s(j, g.tick);
    g.aux.s(i, 0);
    if b <= 1 {
        unsafe { js_bloom(nx, ny) };
        return;
    }
    g.aux.s(j, (b - 1) as u8);
    if b > 4 && rnd() < 0.2 {
        let lx = x + if rnd() < 0.5 { -1 } else { 1 };
        let lj = y * gw + lx;
        if lx >= 0 && lx < gw && m.g(lj) == EMPTY {
            sand_set(g, lj, PLANT);
            if rnd() < 0.3 {
                g.aux.s(lj, (2 + irnd(b >> 1)) as u8);
            }
        }
    }
}

/* things that do not move, but do things anyway (world.ts sandStatic: cloners, saplings and crops are JS's) */
fn statics(g: &G, i: i32, x: i32, y: i32, v: u8) {
    let m = g.m;
    let gw = g.gw;
    if v == PLANT {
        let a = g.aux.g(i);
        if a != 0 {
            if rnd() < 0.15 {
                grow(g, i, x, y, a as i32);
            }
            return;
        }
        let wet = unsafe { &WET };
        if !((y > 0 && tb(wet, m.g(i - gw)))
            || (y < g.gh - 1 && tb(wet, m.g(i + gw)))
            || (x > 0 && tb(wet, m.g(i - 1)))
            || (x < gw - 1 && tb(wet, m.g(i + 1))))
        {
            return;
        }
        if has(g, x, y, SALTWATER) >= 0 && rnd() < 0.01 {
            m.s(i, EMPTY);
            return;
        }
        let j = has(g, x, y, WATER);
        if j >= 0 && rnd() < 0.05 {
            let s0 = (rnd() * 4.0) as i32;
            for k in 0..4 {
                let q = nb(g, x, y, (s0 + k) & 3);
                if q >= 0 && m.g(q) == EMPTY {
                    score(C_SCORE);
                    if rnd() < 0.5 {
                        let tw = g.t.g(j);
                        let ta = g.t.g(q);
                        m.s(q, PLANT);
                        g.vy.s(q, 0);
                        g.aux.s(q, 0);
                        g.sh.s(q, irnd(256) as u8);
                        g.t.s(q, tw);
                        g.lat.s(q, 0.0);
                        heat_accept(g, q);
                        m.s(j, EMPTY);
                        g.vy.s(j, 0);
                        g.aux.s(j, 0);
                        g.t.s(j, ta);
                        g.lat.s(j, 0.0);
                        heat_accept(g, j);
                    } else {
                        sand_set(g, q, PLANT);
                    }
                    break;
                }
            }
        }
    } else if v == EMBER {
        for k in 0..4 {
            let j = nb(g, x, y, k);
            if j < 0 {
                continue;
            }
            let t = m.g(j);
            let r = rnd();
            if tb(unsafe { &WET }, t) {
                heat_become(g, i, ASH);
                heat_share(g, i, j);
                score(C_SCORE);
                score(C_HISS);
                return;
            } else if tb(unsafe { &WOODY }, t) && r < 0.015 {
                m.s(j, EMBER);
            } else if (t == OIL && r < 0.3) || ((tb(unsafe { &LEAFY }, t) && t != SEED) && r < 0.1) {
                m.s(j, FIRE);
            } else if t == GUNPOWDER {
                unsafe { js_boom(j) };
                return;
            } else if t == FIREWORK {
                unsafe { js_launch(j) };
            } else if t == NUKE {
                unsafe { js_nuke(j) };
                return;
            }
        }
        let j = nb(g, x, y, 0);
        if j >= 0 && m.g(j) == EMPTY && rnd() < 0.05 {
            let w = if rnd() < 0.3 { SMOKE } else { FIRE };
            sand_set(g, j, w);
        }
        let dm = if g.has_dmask && g.dmask.g(i) != 0 { 2.0 } else { 1.0 };
        if rnd() < (if g.aux.g(i) != 0 { 0.0012 } else { 0.005 }) * dm {
            m.s(i, ASH);
            g.aux.s(i, 0);
        }
    } else if v == TORCH {
        let j = nb(g, x, y, 0);
        if j >= 0 && (m.g(j) == ASH || m.g(j) == SMOKE) {
            m.s(j, EMPTY);
        }
        let mut k = -1;
        while k <= 1 && y > 0 {
            if !(x + k < 0 || x + k >= gw) {
                let j = i - gw + k;
                if m.g(j) == EMPTY && rnd() < (if k != 0 { 0.2 } else { 0.7 }) {
                    sand_set(g, j, FIRE);
                    g.sh.s(j, unsafe { CLEAN });
                    g.stamp.s(j, g.tick);
                }
            }
            k += 1;
        }
    } else if v == SOIL {
        if y < g.gh - 1 {
            let u = m.g(i + gw);
            if tb(unsafe { &AIRY }, u) || tb(unsafe { &LIQ }, u) {
                heat_become(g, i, SAND);
            }
        }
    } else if v == FAUCET {
        let j = i + gw;
        if y + 1 < g.gh && m.g(j) == EMPTY && rnd() < 0.5 {
            sand_place(g, j, WATER);
        }
    } else if v == DRAIN {
        for k in 0..4 {
            let j = nb(g, x, y, k);
            if j < 0 {
                continue;
            }
            let t = m.g(j);
            if t == EMPTY
                || t == STONE
                || t == WOOD
                || t == ICE
                || t == TORCH
                || t == FAUCET
                || t == DRAIN
                || t == GLASS
                || t == CLONER
                || t == METAL
                || t == INERT
                || (tb(unsafe { &STILL }, t) && t != FLOWER)
                || t == SAPLING
            {
                continue;
            }
            if rnd() < 0.5 {
                heat_vanish(g, j);
            }
        }
    }
}

/* one cell's go (world.ts sandTurn) */
fn turn(g: &G, i: i32, x: i32, y: i32, v: u8) {
    match v {
        FIRE => fire(g, i, x, y),
        SMOKE => smoke(g, i, x, y),
        STEAM => steam(g, i, x, y),
        GAS => gas(g, i, x, y),
        SAND | ASH | GUNPOWDER | SALT | SEED | SNOW => powder(g, i, x, y),
        FIREWORK | NUKE => unsafe { js_turn(i, x, y, v as i32) },
        WATER | OIL | ACID | LAVA | SALTWATER | MORTAR => liquid(g, i, x, y),
        PLANT | EMBER | TORCH | SOIL | FAUCET | DRAIN => statics(g, i, x, y, v),
        ICE => {}
        CLONER | SAPLING | CROP => unsafe { js_turn(i, x, y, v as i32) },
        _ => unsafe { js_turn(i, x, y, v as i32) },
    }
}

#[inline(always)]
fn still_word(w: u32) -> bool {
    w == 0 || unsafe { STILL2[(w & 0xffff) as usize] != 0 && STILL2[(w >> 16) as usize] != 0 }
}

/* a cell at rest, seen to be at rest before it is handed a turn (world.ts sandStep): true if it took its rest */
#[inline(always)]
fn rests(g: &G, i: i32, x: i32, y: i32, v: u8) -> bool {
    let m = g.m;
    let gw = g.gw;
    let gh = g.gh;
    let rk = unsafe { REST[v as usize] };
    if rk == 1 {
        if y + 1 < gh {
            let j = i + gw;
            if t64(unsafe { &CANT }, v, m.g(j))
                && (y == 0 || t64(unsafe { &NOFLOAT }, v, m.g(i - gw)))
                && (x == 0 || t64(unsafe { &CANT }, v, m.g(j - 1)))
                && (x == gw - 1 || t64(unsafe { &CANT }, v, m.g(j + 1)))
            {
                g.vy.s(i, 0);
                rnd();
                return true;
            }
        }
    } else if rk == 2 {
        if y + 1 < gh {
            let j = i + gw;
            if t64(unsafe { &CANT }, v, m.g(j))
                && (y == 0 || t64(unsafe { &NOFLOAT }, v, m.g(i - gw)))
                && (x == 0 || (t64(unsafe { &NOFLOW }, v, m.g(j - 1)) && t64(unsafe { &NOFLOW }, v, m.g(i - 1))))
                && (x == gw - 1 || (t64(unsafe { &NOFLOW }, v, m.g(j + 1)) && t64(unsafe { &NOFLOW }, v, m.g(i + 1))))
            {
                g.vy.s(i, 0);
                rnd();
                rnd();
                rnd();
                if y > 0 && m.g(i - gw) == EMPTY {
                    press_candidate(g, i);
                }
                return true;
            }
        }
    } else if rk == 3 {
        let wet = unsafe { &WET };
        if g.aux.g(i) == 0
            && !((y > 0 && tb(wet, m.g(i - gw)))
                || (y < gh - 1 && tb(wet, m.g(i + gw)))
                || (x > 0 && tb(wet, m.g(i - 1)))
                || (x < gw - 1 && tb(wet, m.g(i + 1))))
        {
            return true;
        }
    }
    false
}

fn sand_step(g: &G, parity: i32) {
    let gw = g.gw;
    let gh = g.gh;
    let m = g.m;
    let st = g.stamp;
    let tk = g.tick;
    let still = unsafe { &STILL };
    let mut y = gh - 1;
    while y >= 0 {
        let row = y * gw;
        let q0 = row >> 2;
        let q1 = (row + gw) >> 2;
        if ((y + parity) & 1) == 1 {
            /* right to left: a word is looked at from its top byte, the first of it the walk comes to */
            let mut x = gw - 1;
            while x >= 0 {
                let mut i = row + x;
                if (x & 3) == 3 {
                    let mut q = i >> 2;
                    if still_word(g.m32.g(q)) {
                        loop {
                            q -= 1;
                            if q < q0 || !still_word(g.m32.g(q)) {
                                break;
                            }
                        }
                        if q < q0 {
                            break;
                        }
                        i = (q << 2) + 3;
                        x = i - row;
                    }
                }
                let v = m.g(i);
                if tb(still, v) || st.g(i) == tk || rests(g, i, x, y, v) {
                    x -= 1;
                    continue;
                }
                turn(g, i, x, y, v);
                x -= 1;
            }
        } else {
            let mut x = 0;
            while x < gw {
                let mut i = row + x;
                if (x & 3) == 0 {
                    let mut q = i >> 2;
                    if still_word(g.m32.g(q)) {
                        loop {
                            q += 1;
                            if q >= q1 || !still_word(g.m32.g(q)) {
                                break;
                            }
                        }
                        if q >= q1 {
                            break;
                        }
                        i = q << 2;
                        x = i - row;
                    }
                }
                let v = m.g(i);
                if tb(still, v) || st.g(i) == tk || rests(g, i, x, y, v) {
                    x += 1;
                    continue;
                }
                turn(g, i, x, y, v);
                x += 1;
            }
        }
        y -= 1;
    }
    /* the pressure tries, once everything else has had its go */
    let tries = unsafe { PRESS_TRIES };
    let pn = unsafe { PRESS_N };
    let mut k = (if pn < tries { pn } else { tries }) - 1;
    while k >= 0 {
        let i = g.plist.g(k);
        let v = m.g(i);
        if tb(unsafe { &LIQ }, v) && v != LAVA && i >= gw && m.g(i - gw) == EMPTY {
            pressure(g, i);
        }
        k -= 1;
    }
}

/* -------------------------------------------------------------------
   THE PICTURE (game.ts drawWorld: the loop over the cells in view, each
   given its colour, and the glow under the hot ones). the same colours,
   from the same tables, with the same sums and the same side dice, as
   JS: the picture is drawing only, but a picture that is the JS's to the
   bit is one test/wasm.js can check. everything drawn over the cells
   (particles, the village, its works) is still JS's
   ------------------------------------------------------------------- */
static mut PAL: [u32; 16384] = [0; 16384];
static mut LIT: [u32; 16384] = [0; 16384];
static mut WETS: [u32; 256] = [0; 256];
static mut DEEP: [u32; 4 * 17 * 256] = [0; 4 * 17 * 256];
static mut DEEP_SLOT: [u8; 256] = [0; 256];
static mut MUSH: [u32; 256] = [0; 256];
static mut GLOWP: [u32; 1024] = [0; 1024];
static mut LEAF: [u8; 256] = [0; 256];
/* the colours: HAZE_TINT, CHILL_TINT, COLD_TINT, WIN_DARK, DOOR_KNOB, P_SKIN32, INERT_GLINT, LAVA_COOL, LAVA_WARM,
   LAVA_HOT, LAVA_GLASS, LAVA_METAL; and GLOW_PAL's length, GLOW_T0 and GLOW_STEP (sim.js simTables) */
static mut COLS: [u32; 16] = [0; 16];
static mut GLOW_N: i32 = 1;
static mut GLOW_T0: f64 = 400.0;
static mut GLOW_STEP: f64 = 10.0;
const K_HAZE: usize = 0;
const K_CHILL: usize = 1;
const K_COLD: usize = 2;
const K_WIN: usize = 3;
const K_KNOB: usize = 4;
const K_SKIN: usize = 5;
const K_GLINT: usize = 6;
const K_LCOOL: usize = 7;
const K_LWARM: usize = 8;
const K_LHOT: usize = 9;
const K_LGLASS: usize = 10;
const K_LMETAL: usize = 11;
const CLONE_PEASANT: u8 = 255;
const BLACK: u32 = 0xff000000;

#[derive(Clone, Copy)]
struct D {
    px: P<u32>,
    gp: P<u32>,
    bg: P<u32>,
    wave: P<u8>,
    haze: P<i8>,
    dep: P<u8>,
}
static mut DGRID: Option<D> = None;

#[inline(always)]
fn col(k: usize) -> u32 {
    unsafe { COLS[k] }
}
#[inline(always)]
fn pal(v: u8, s: i32) -> u32 {
    unsafe { *PAL.get_unchecked((((v as usize) << 8) | (s as usize & 255)) & 16383) }
}
#[inline(always)]
fn lit(v: u8, s: i32) -> u32 {
    unsafe { *LIT.get_unchecked((((v as usize) << 8) | (s as usize & 255)) & 16383) }
}
/* heat.ts blend32: each channel a + (b - a) * f, as JS truncates it (ToInt32, then & 255) */
#[inline(always)]
fn blend32(a: u32, b: u32, f: f64) -> u32 {
    let ar = (a & 255) as f64;
    let ag = ((a >> 8) & 255) as f64;
    let ab = ((a >> 16) & 255) as f64;
    let r = ar + (((b & 255) as f64) - ar) * f;
    let gg = ag + ((((b >> 8) & 255) as f64) - ag) * f;
    let bb = ab + ((((b >> 16) & 255) as f64) - ab) * f;
    0xff000000 | ((((bb as i32) & 255) as u32) << 16) | ((((gg as i32) & 255) as u32) << 8) | (((r as i32) & 255) as u32)
}
#[inline(always)]
fn clampf(v: f64, a: f64, b: f64) -> f64 {
    if v < a {
        a
    } else if v > b {
        b
    } else {
        v
    }
}
fn glow_col(t: f64) -> u32 {
    unsafe {
        let mut k = ((t - GLOW_T0) / GLOW_STEP) as i32;
        if k < 0 {
            k = 0;
        } else if k > GLOW_N - 1 {
            k = GLOW_N - 1;
        }
        GLOWP[k as usize & 1023]
    }
}
fn glow_mix(t: f64) -> f64 {
    if t < 450.0 {
        0.0
    } else {
        let f = (t - 450.0) / 650.0;
        /* (Math.min(0.85, f): a NaN stays a NaN) */
        if f > 0.85 {
            0.85
        } else {
            f
        }
    }
}
/* game.ts lavaCol */
fn lava_col(t: f64, a: u8, flick: u32) -> u32 {
    let mut c = if t < 1250.0 {
        blend32(col(K_LCOOL), col(K_LWARM), clampf((t - 900.0) / 350.0, 0.0, 1.0))
    } else {
        blend32(col(K_LWARM), col(K_LHOT), clampf((t - 1250.0) / 600.0, 0.0, 1.0))
    };
    c = blend32(c, flick, 0.25);
    if a == GLASS {
        c = blend32(c, col(K_LGLASS), 0.35);
    } else if a == METAL {
        c = blend32(c, col(K_LMETAL), 0.3);
    }
    c
}

fn draw(g: &G, d: &D, x0: i32, x1: i32, t: f64, flick: i32) -> i32 {
    let m = g.m;
    let sh = g.sh;
    let aux = g.aux;
    let tt = g.t;
    let gw = g.gw;
    let gh = g.gh;
    let n = g.n;
    let px = d.px;
    let gp = d.gp;
    let bg = d.bg;
    let airy = unsafe { &AIRY };
    let mut hot = 0;
    /* (the glow is made afresh each frame, for the columns in view) */
    for y in 0..gh {
        for x in x0..x1 {
            gp.s(y * gw + x, 0);
        }
    }
    /* (gp's plus-signs reach a cell either side, and the rows over and under: JS lets a write off the end go by) */
    let gps = |j: i32, c: u32| {
        if j >= 0 && j < n {
            gp.s(j, c);
        }
    };
    for y in 0..gh {
        let row = y * gw;
        for x in x0..x1 {
            let i = row + x;
            let v = m.g(i);
            let tc = tt.g(i) as f64;
            if v == EMPTY {
                /* hot air shimmers and glows a little; cold air has a blue chill to it */
                if tc > 45.0 {
                    let j = if tc > 70.0 && x > 0 && x < gw - 1 { i + d.haze.g(y) as i32 } else { i };
                    px.s(i, blend32(bg.g(j), col(K_HAZE), if tc > 545.0 { 0.33 } else { (tc - 45.0) * 0.00066 }));
                } else if tc < 5.0 {
                    px.s(i, blend32(bg.g(i), col(K_CHILL), if tc < -45.0 { 0.3 } else { (5.0 - tc) * 0.006 }));
                } else {
                    px.s(i, bg.g(i));
                }
                continue;
            }
            let s = sh.g(i) as i32;
            let slot = unsafe { DEEP_SLOT[v as usize] };
            if slot != 0 {
                /* how far down into this pool are we */
                let dd = if y > 0 && m.g(i - gw) == v {
                    let q = d.dep.g(x) as i32 + 1;
                    if q < 15 {
                        q
                    } else {
                        15
                    }
                } else {
                    0
                };
                d.dep.s(x, dd as u8);
                let glint = (dd == 0 && d.wave.g(x) != 0) || (g.lat.g(i) as f64 > 0.0 && rnd() < 0.3);
                let k = (if glint { 16 << 8 } else { dd << 8 }) | s;
                let c = unsafe { *DEEP.get_unchecked((slot as usize - 1) * 17 * 256 + k as usize) };   /* (slot 1 to 4, k under 17 * 256) */
                px.s(i, c);
                if v == ACID && dd < 2 {
                    gp.s(i, c);
                }
            } else if v == LAVA {
                let fl = pal(v, (rnd() * 256.0) as i32);
                let c = lava_col(tc, aux.g(i), fl);
                px.s(i, c);
                gp.s(i, c);
                gps(i - gw, c);
                gps(i + gw, c);
                if x > 0 {
                    gp.s(i - 1, c);
                }
                if x < gw - 1 {
                    gp.s(i + 1, c);
                }
                hot += 1;
                continue;
            } else if v == FIRE || v == EMBER {
                /* the glow gets a little plus-sign per hot cell, so a lone spark still shows */
                let c = pal(v, (rnd() * 256.0) as i32);
                px.s(i, c);
                gp.s(i, c);
                gps(i - gw, c);
                gps(i + gw, c);
                if x > 0 {
                    gp.s(i - 1, c);
                }
                if x < gw - 1 {
                    gp.s(i + 1, c);
                }
                hot += 1;
            } else if v == SAND
                && ((y > 0 && m.g(i - gw) == WATER)
                    || (y < gh - 1 && m.g(i + gw) == WATER)
                    || (x > 0 && m.g(i - 1) == WATER)
                    || (x < gw - 1 && m.g(i + 1) == WATER))
            {
                px.s(i, unsafe { WETS[s as usize] });
            } else if v == CLONER {
                let a = aux.g(i);
                px.s(
                    i,
                    if a != 0 && ((x + y + flick) & 1) != 0 {
                        if a == CLONE_PEASANT {
                            col(K_SKIN)
                        } else {
                            pal(a, s)
                        }
                    } else {
                        pal(v, (x + y) & 1)
                    },
                );
            } else if v == NUKE {
                let on = (if aux.g(i) > 200 { (t * 12.0) as i32 } else { (t * 3.0) as i32 }) & 1;
                let c = pal(v, if on != 0 { 0 } else { 1 });
                px.s(i, c);
                if on != 0 {
                    gp.s(i, c);
                    hot += 1;
                }
            } else if v == SMOKE && aux.g(i) != 0 {
                let a = aux.g(i);
                let c = unsafe { MUSH[a as usize] };
                px.s(i, c);
                if a > 170 {
                    gp.s(i, c);
                    hot += 1;
                }
            } else if v == FIREWORK {
                px.s(i, pal(v, (y + (s & 1)) & 3));
            } else if v == PLANK {
                if aux.g(i) == 1 {
                    px.s(i, col(K_WIN));
                } else {
                    let f = if y > 0 && m.g(i - gw) == EMPTY { lit(v, s) } else { pal(v, s) };
                    px.s(i, if y % 3 == 0 || (x + (y / 3) * 5) % 7 == 0 { blend32(f, BLACK, 0.22) } else { f });
                }
            } else if v == DOOR {
                let a = aux.g(i);
                px.s(
                    i,
                    if a == 5 {
                        col(K_KNOB)
                    } else if a == 1 {
                        blend32(pal(v, s), BLACK, 0.35)
                    } else {
                        pal(v, s)
                    },
                );
            } else if v == LADDER {
                let a = aux.g(i);
                px.s(
                    i,
                    if a != 1 {
                        pal(v, s)
                    } else if y % 3 == 0 {
                        lit(v, s)
                    } else {
                        blend32(bg.g(i), BLACK, 0.3)
                    },
                );
            } else if v == SOIL {
                let f = if y > 0 && (tb(airy, m.g(i - gw)) || tb(unsafe { &LEAF }, m.g(i - gw))) { lit(v, s) } else { pal(v, s) };
                px.s(i, if (x & 1) != 0 { f } else { blend32(f, BLACK, 0.2) });
            } else if v == WHEAT {
                /* the ear at the top of the stalk, nodding in the breeze */
                if y > 0 && !tb(unsafe { &LEAFY }, m.g(i - gw)) {
                    let a = unsafe { js_sin(x as f64 * 0.7 + t * 1.8) } > 0.55;
                    px.s(i, if a { lit(v, 3) } else { pal(v, 3) });
                    if m.g(i - gw) == EMPTY {
                        px.s(i - gw, blend32(px.g(i - gw), lit(v, 2), if a { 0.75 } else { 0.5 }));
                    }
                } else {
                    px.s(i, pal(v, s % 3));
                }
            } else if v == LAMP {
                let c = pal(v, (s + flick) & 255);
                px.s(i, c);
                gp.s(i, c);
                hot += 1;
            } else if v == BRICK {
                let f = if y > 0 && tb(airy, m.g(i - gw)) { lit(v, s) } else { pal(v, s) };
                let a = y % 3 == 0
                    || (x > 0 && x < gw - 1 && m.g(i - 1) == v && m.g(i + 1) == v && (x + (y / 3) * 2) % 4 == 0);
                px.s(i, if a { blend32(f, BLACK, 0.25) } else { f });
            } else if v == FIREBRICK {
                let f = if y > 0 && tb(airy, m.g(i - gw)) { lit(v, s) } else { pal(v, s) };
                let a = (y & 1) == 0 || ((x + (y >> 1) * 2) % 3 == 0);
                px.s(i, if a { blend32(f, BLACK, 0.18) } else { f });
            } else if v == CONCRETE {
                let f = if y > 0 && tb(airy, m.g(i - gw)) { lit(v, s) } else { pal(v, s) };
                px.s(i, if y % 4 == 0 { blend32(f, BLACK, 0.12) } else { f });
            } else if v == STAINED {
                let a = aux.g(i) as i32 % 3;
                px.s(i, blend32(pal(v, a), bg.g(i), 0.25));
                if unsafe { js_lit(x, y) } != 0 {
                    let c = blend32(pal(v, a), 0xffffffff, 0.2);
                    px.s(i, c);
                    gp.s(i, c);
                    hot += 1;
                }
            } else if v == LINEN {
                let a = aux.g(i) as i32;
                px.s(i, pal(v, (if a == 6 { 0 } else if a != 0 { a } else { 1 + ((s >> 5) % 5) }) + 6 * ((s >> 3) & 7)));
            } else if v == MOONROCK {
                let w = (unsafe { js_sin(x as f64 * 0.31 + y as f64 * 0.23 + t * 0.9) } * 20.0) as i32;
                px.s(i, pal(v, (s + w) & 255));
                if ((x * 5 + y * 11) % 7) == 0 {
                    px.s(i, blend32(px.g(i), BLACK, 0.3));
                }
            } else if v == TRESTLE {
                /* (JS reads past the ends of the grid as undefined: not the trestle) */
                let a = (i == 0 || m.g(i - 1) != v) || (i + 1 >= n || m.g(i + 1) != v) || ((x + y) & 3) == 0 || ((x - y + 400) & 3) == 0;
                px.s(i, if a { pal(v, s) } else { blend32(bg.g(i), BLACK, 0.4) });
            } else if v == GIRDER {
                let a = ((x + y) % 3 == 0) || ((x - y + 300) % 3 == 0);
                px.s(i, if a { pal(v, s) } else { blend32(bg.g(i), BLACK, 0.35) });
            } else if v == GOLD || v == COAL {
                px.s(i, if y > 0 && tb(airy, m.g(i - gw)) { lit(v, s) } else { pal(v, s) });
                if ((x * 7 + y * 13 + flick) % (if v == GOLD { 23 } else { 97 })) == 0 {
                    px.s(i, if v == GOLD { col(K_GLINT) } else { pal(v, 3) });
                }
            } else if v == INERT {
                let w = (unsafe { js_sin(x as f64 * 0.21 + y as f64 * 0.17 + t * 1.6) } * 40.0) as i32;
                px.s(i, pal(v, (s + w) & 255));
                if ((x * 7 + y * 13 + flick) % 89) == 0 {
                    px.s(i, col(K_GLINT));
                }
            } else {
                px.s(i, if y > 0 && m.g(i - gw) == EMPTY { lit(v, s) } else { pal(v, s) });
                if v == TORCH && y > 0 {
                    gp.s(i, pal(FIRE, 1));
                    hot += 1;
                }
            }
            /* anything hot enough glows: dull red, cherry, orange, yellow, white. anything well below freezing frosts over */
            if tc > 450.0 {
                if v != FIRE && v != EMBER && v != TORCH && !tb(airy, v) {
                    let f = glow_mix(tc);
                    let c = blend32(px.g(i), glow_col(tc), f);
                    px.s(i, c);
                    if tc > 560.0 {
                        gp.s(i, blend32(BLACK, c, f));
                        hot += 1;
                    }
                }
            } else if tc < -5.0 && !tb(airy, v) {
                px.s(i, blend32(px.g(i), col(K_COLD), if tc < -80.0 { 0.45 } else { (-5.0 - tc) * 0.006 }));
            }
        }
    }
    hot
}

/* -------------------------------------------------------------------
   THE DOOR (what sim.js calls)
   ------------------------------------------------------------------- */
#[no_mangle]
pub extern "C" fn sim_abi() -> i32 {
    ABI
}
#[no_mangle]
pub extern "C" fn sim_known_mats() -> i32 {
    KNOWN_MATS
}
/* where table k is, to be filled in from JS */
#[no_mangle]
pub extern "C" fn sim_tab(k: i32) -> i32 {
    unsafe {
        (match k {
            0 => KP.as_mut_ptr() as usize,
            1 => IC.as_mut_ptr() as usize,
            2 => BK.as_mut_ptr() as usize,
            3 => HC.as_mut_ptr() as usize,
            4 => T0.as_mut_ptr() as usize,
            5 => HI.as_mut_ptr() as usize,
            6 => HI_L.as_mut_ptr() as usize,
            7 => LO.as_mut_ptr() as usize,
            8 => LO_L.as_mut_ptr() as usize,
            9 => SRC.as_mut_ptr() as usize,
            10 => POW.as_mut_ptr() as usize,
            11 => LAVA_LO.as_mut_ptr() as usize,
            12 => HS.as_mut_ptr() as usize,
            13 => HLAT.as_mut_ptr() as usize,
            20 => DENS.as_mut_ptr() as usize,
            21 => FREE.as_mut_ptr() as usize,
            22 => CANT.as_mut_ptr() as usize,
            23 => NOFLOAT.as_mut_ptr() as usize,
            24 => NOFLOW.as_mut_ptr() as usize,
            25 => STILL.as_mut_ptr() as usize,
            26 => LIQ.as_mut_ptr() as usize,
            27 => WET.as_mut_ptr() as usize,
            28 => WOODY.as_mut_ptr() as usize,
            29 => LEAFY.as_mut_ptr() as usize,
            30 => AIRY.as_mut_ptr() as usize,
            31 => HOT.as_mut_ptr() as usize,
            32 => FLUID.as_mut_ptr() as usize,
            33 => REST.as_mut_ptr() as usize,
            34 => STILL2.as_mut_ptr() as usize,
            35 => AQ2.as_mut_ptr() as usize,
            36 => IQ2.as_mut_ptr() as usize,
            37 => BQ2.as_mut_ptr() as usize,
            50 => PAL.as_mut_ptr() as usize,
            51 => LIT.as_mut_ptr() as usize,
            52 => WETS.as_mut_ptr() as usize,
            53 => DEEP.as_mut_ptr() as usize,
            54 => DEEP_SLOT.as_mut_ptr() as usize,
            55 => MUSH.as_mut_ptr() as usize,
            56 => GLOWP.as_mut_ptr() as usize,
            57 => LEAF.as_mut_ptr() as usize,
            58 => COLS.as_mut_ptr() as usize,
            40 => (&raw mut RNG_STATE) as usize,
            41 => CNT.as_mut_ptr() as usize,
            _ => 0,
        }) as i32
    }
}
#[no_mangle]
pub extern "C" fn sim_consts(
    ambient: f64,
    t_max: f64,
    t_min: f64,
    heat_fast: i32,
    clean: i32,
    vmax: i32,
    press_tries: i32,
    press_scan: i32,
    w_set: i32,
    w_draught: f64,
) {
    unsafe {
        AMBIENT = ambient;
        T_MAX = t_max;
        T_MIN = t_min;
        HEAT_FAST = heat_fast;
        CLEAN = clean as u8;
        VMAX = vmax;
        PRESS_TRIES = press_tries;
        PRESS_SCAN = press_scan;
        W_SET = w_set;
        W_DRAUGHT = w_draught;
    }
}
#[no_mangle]
pub extern "C" fn sim_heat_consts(has_bq2: i32, band_hi32: i32, airw: i32, amb32: i32) {
    unsafe {
        HAS_BQ2 = has_bq2 != 0;
        BAND_HI32 = band_hi32 as u32;
        AIRW = airw != 0;
        AMB32 = amb32 as u32;
        AMB64 = (AMB32 as u64) | ((AMB32 as u64) << 32);
    }
}
#[no_mangle]
pub extern "C" fn sim_scratch_bytes(gw: i32, gh: i32) -> i32 {
    scratch_layout(gw, gh).1
}
/* the grid's arrays, where JS has put them (sim.js simLayout). every one starts on a 16-byte boundary */
#[no_mangle]
pub extern "C" fn sim_bind(
    m: i32,
    stamp: i32,
    aux: i32,
    sh: i32,
    vy: i32,
    t: i32,
    lat: i32,
    hm: i32,
    ha: i32,
    hs: i32,
    pmark: i32,
    pstack: i32,
    fast: i32,
    dmask: i32,
    plist: i32,
    scratch: i32,
    gw: i32,
    gh: i32,
) {
    let n = gw * gh;
    let (nbk, _) = scratch_layout(gw, gh);
    let mut s = scratch;
    let mut take = |words: i32| {
        let p = s;
        s += words * 4;
        p
    };
    let ba = take(nbk);
    let bb = take(nbk);
    let bc = take(nbk);
    let bd = take(nbk);
    let be = take(nbk);
    let bf = take(nbk);
    let bk = take(nbk);
    let cp = take(gh * nbk);
    let dn = take(gh * nbk);
    let skip = s;
    unsafe {
        GRID = Some(G {
            m: mk(m, n),
            m32: mk(m, n >> 2),
            stamp: mk(stamp, n),
            aux: mk(aux, n),
            sh: mk(sh, n),
            vy: mk(vy, n),
            t: mk(t, n),
            t32: mk(t, n),
            t64: mk(t, n >> 1),
            lat: mk(lat, n),
            l32: mk(lat, n),
            l64: mk(lat, n >> 1),
            hm: mk(hm, n),
            hm32: mk(hm, n >> 2),
            ha: mk(ha, n),
            hs: mk(hs, n),
            pmark: mk(pmark, n),
            pstack: mk(pstack, n),
            fast: mk(fast, n),
            dmask: mk(dmask, n),
            plist: mk(plist, 12.max(PRESS_TRIES)),
            skip: mk(skip, gh),
            ba: mk(ba, nbk),
            bb: mk(bb, nbk),
            bc: mk(bc, nbk),
            bd: mk(bd, nbk),
            be: mk(be, nbk),
            bf: mk(bf, nbk),
            bk: mk(bk, nbk),
            cp: mk(cp, gh * nbk),
            dn: mk(dn, gh * nbk),
            gw,
            gh,
            n,
            nw: gw >> 2,
            nb: nbk,
            tick: 0,
            has_dmask: false,
        });
    }
}
#[no_mangle]
pub extern "C" fn sim_draw_consts(glow_n: i32, glow_t0: f64, glow_step: f64) {
    unsafe {
        GLOW_N = if glow_n < 1 { 1 } else if glow_n > 1024 { 1024 } else { glow_n };
        GLOW_T0 = glow_t0;
        GLOW_STEP = glow_step;
    }
}
/* the picture's arrays (sim.js simLayout): px and gp, the cells' colours and the glow's, as wide as the grid; the sky; the
   frame's waves (a byte a column) and heat haze (a byte a row); a column's depth into a pool, scratch */
#[no_mangle]
pub extern "C" fn sim_bind_draw(px: i32, gp: i32, bg: i32, wave: i32, haze: i32, dep: i32, gw: i32, gh: i32) {
    let n = gw * gh;
    unsafe {
        DGRID = Some(D {
            px: mk(px, n),
            gp: mk(gp, n),
            bg: mk(bg, n),
            wave: mk(wave, gw),
            haze: mk(haze, gh),
            dep: mk(dep, gw),
        });
    }
}
/* the cells in columns x0 to x1, coloured into px and gp: how many are hot. the dice are JS's (the picture's own) */
#[no_mangle]
pub extern "C" fn sim_draw(x0: i32, x1: i32, t: f64, flick: i32) -> i32 {
    unsafe {
        let (Some(g), Some(d)) = (GRID, DGRID) else { return -1 };
        RNG_INTERNAL = false;
        draw(&g, &d, x0, x1, t, flick)
    }
}
#[no_mangle]
pub extern "C" fn sim_rng_mode(internal: i32) {
    unsafe {
        RNG_INTERNAL = internal != 0;
    }
}
/* one sand step's walk and its pressure tries (world.ts sandStep, but for the heat step, which JS asks for after) */
#[no_mangle]
pub extern "C" fn sim_sand(tick: i32, parity: i32, pgen: i32, has_dmask: i32) {
    unsafe {
        let Some(mut g) = GRID else { return };
        g.tick = tick as u32;
        g.has_dmask = has_dmask != 0;
        PRESS_N = 0;
        PGEN = pgen as u32;
        sand_step(&g, parity);
    }
}
#[no_mangle]
pub extern "C" fn sim_heat(has_dmask: i32) {
    unsafe {
        let Some(mut g) = GRID else { return };
        g.has_dmask = has_dmask != 0;
        heat_step(&g);
    }
}
#[no_mangle]
pub extern "C" fn sim_press_n() -> i32 {
    unsafe { PRESS_N }
}
#[no_mangle]
pub extern "C" fn sim_pgen() -> i32 {
    unsafe { PGEN as i32 }
}
