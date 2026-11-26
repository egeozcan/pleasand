/* what the game finds about it that the DOM's own types do not know of */

/* the WebAssembly module, base64 (simwasm-bin.js, made by wasm/build.sh: not there until it is built) */
declare var SIM_WASM_B64: string;

/* dice whose state can be read and put back: rng.ts rngMake, and the harness's own */
interface Dice {
  random(): number;
  state: number;
}

interface Window {
  /* the valley's width and the dice, set by the harness (harness/loader.js) before the game loads */
  PLEASAND_GW?: number;
  PLEASAND_RNG?: Dice;
  /* the game, for whoever is at the console (game.ts; and, in the dev server, PLEASAND.eval: vite.config.mts) */
  PLEASAND?: { game(): Game; eval?(expr: string): any };
  /* (older Safari) */
  webkitAudioContext?: typeof AudioContext;
}

/* node's, where there is no atob (simwasm.ts) */
declare var Buffer: { from(s: string, encoding: string): ArrayLike<number> & ArrayBufferLike } | undefined;

/* the module, compiled once a process and kept on the global (the harness loads the game many times: simwasm.ts) */
declare var __pleasandSimB64: string | undefined;
declare var __pleasandSimMod: WebAssembly.Module | undefined;
