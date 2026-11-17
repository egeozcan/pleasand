/* =====================================================================
   PLEASAND  --  harness/index.js

   the way in:

     var h = require("./harness").open({ seed: 7 });
   ===================================================================== */
"use strict";
var harness = require("./harness.js");
var loader = require("./loader.js");
module.exports = {
  open: harness.open,
  Harness: harness.Harness,
  loadGame: loader.loadGame,
  view: harness.view,
  inspect: harness.view,
  PHASES: harness.PHASES,
  TICK_MS: harness.TICK_MS
};
