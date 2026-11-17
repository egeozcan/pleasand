/* =====================================================================
   PLEASAND  --  harness/args.js

   the little argument parser the cli and the soak runner share:
   --key value, --key=value, --flag, repeated keys become lists.
   ===================================================================== */
"use strict";

function parseArgs(argv) {
  var out = { _: [] }, i, a, key, val, eq;
  for (i = 0; i < argv.length; i++) {
    a = argv[i];
    if (a === "--") { out._ = out._.concat(argv.slice(i + 1)); break; }
    if (a.slice(0, 2) !== "--") { out._.push(a); continue; }
    key = a.slice(2); val = true; eq = key.indexOf("=");
    if (eq >= 0) { val = key.slice(eq + 1); key = key.slice(0, eq); }
    else if (i + 1 < argv.length && argv[i + 1].slice(0, 2) !== "--") val = argv[++i];
    if (key in out) out[key] = [].concat(out[key], val);
    else out[key] = val;
  }
  return out;
}

function num(v, d) { if (v == null || v === true) return d; var n = Number(v); return isFinite(n) ? n : d; }

function list(v) { return v == null ? [] : (Array.isArray(v) ? v : [v]); }

module.exports = { parseArgs: parseArgs, num: num, list: list };
