/* wasm/embed.js IN.wasm OUT.js: the module, base64, as a script index.html can load without a fetch (so the game still
   runs from a file:// address, and the harness reads it with the rest of the scripts) */
"use strict";
var fs = require("fs"), crypto = require("crypto");
var bin = fs.readFileSync(process.argv[2]), b64 = bin.toString("base64");
var sum = crypto.createHash("sha256").update(bin).digest("hex").slice(0, 16);
fs.writeFileSync(process.argv[3],
  "/* PLEASAND -- simwasm-bin.js: wasm/src/lib.rs, built by wasm/build.sh. do not edit (" + bin.length + " bytes, sha256 " + sum + ") */\n" +
  "var SIM_WASM_B64 = \"" + b64 + "\";\n");
console.log("wrote " + process.argv[3] + ": " + bin.length + " bytes of wasm, sha256 " + sum);
