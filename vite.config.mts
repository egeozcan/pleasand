/* =====================================================================
   PLEASAND  --  vite.config.mts

   the game is a row of scripts that share one scope (index.html lists
   them, in the order they load). none of them imports anything: they
   are joined into one module here, the types blanked out of each where
   they stand (harness/loader.js does the very same for node), so the
   browser runs what the harness runs.

     npm run dev        the game, served, reloaded when a script changes
     npm run build      the site, in dist/ (what GitHub Pages puts up)
   ===================================================================== */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import MagicString, { Bundle } from "magic-string";
import { defineConfig, type Plugin } from "vite";

const require = createRequire(import.meta.url);
const loader: {
  gameFiles(root?: string): string[];
  gameSource(root: string, f: string): string;
} = require("./harness/loader.js");

const ROOT = import.meta.dirname;
/* (the joined module's name: a file that is not there, rather than a \0 id, which would have the build drop its source map) */
const ID = "/@pleasand/game.js", RESOLVED = path.join(ROOT, "@pleasand-game.js");
/* the run of <script src> tags in index.html: the scripts, in load order */
const SCRIPTS = /(?:[ \t]*<script src="[^"]+"><\/script>\r?\n?)+/;

function pleasandScripts(): Plugin {
  let serving = false;
  return {
    name: "pleasand-scripts",
    configResolved(config) { serving = config.command === "serve"; },
    /* the list of scripts becomes the one module that is all of them */
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        if (!SCRIPTS.test(html)) throw new Error("vite.config.mts: no <script src> tags in index.html");
        return html.replace(SCRIPTS, `<script type="module" src="${ID}"></script>\n`);
      }
    },
    resolveId(id) { return id === ID ? RESOLVED : null; },
    load(id) {
      if (id !== RESOLVED) return null;
      const files = loader.gameFiles(ROOT), bundle = new Bundle({ separator: "\n;\n" }), original: string[] = [];
      for (const f of files) {
        const file = path.join(ROOT, f), js = loader.gameSource(ROOT, f);
        /* (simwasm-bin.js is built, not kept: without it, the JS step) */
        if (!fs.existsSync(file)) continue;
        this.addWatchFile(file);
        bundle.addSource({ filename: file, content: new MagicString(js) });
        original.push(fs.readFileSync(file, "utf8"));
      }
      /* (in the dev server, the console can reach into the scope, as it could every global when the scripts were loaded
         one by one: PLEASAND.eval("g.peasants")) */
      if (serving) bundle.append("\n;window.PLEASAND.eval = function (expr) { return eval(expr); };\n");
      const map = bundle.generateMap({ hires: true, file: "game.ts" });
      /* (a type blanked out leaves every other character where it was: the source map points into the .ts as written) */
      if (map.sources.length !== original.length) throw new Error("vite.config.mts: the source map lists " + map.sources.length + " files, not " + original.length);
      map.sourcesContent = original;
      return { code: bundle.toString(), map };
    }
  };
}

export default defineConfig({
  base: "./",                 /* GitHub Pages puts it up under /pleasand/ */
  plugins: [pleasandScripts()],
  server: { watch: { ignored: ["**/.claude/**", "**/.playwright-cli/**", "**/wasm/target/**", "**/harness/warm/**"] } },
  build: {
    outDir: "dist", sourcemap: true, target: "es2022",
    chunkSizeWarningLimit: 1500,   /* (the game is one script, and has always been all of it at once) */
    rolldownOptions: {
      /* (save.ts finds the game's own tables and functions by name, with eval, on purpose: and so its names are kept) */
      onwarn(warning, warn) { if (warning.code !== "EVAL") warn(warning); }
    }
  }
});
