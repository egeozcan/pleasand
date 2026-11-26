/* =====================================================================
   PLEASAND  --  glr.js

   the field, on the GPU (WebGL2). the picture of the valley is still
   worked out a cell at a time in JS (game.js drawWorld, into g.px and,
   for what glows, g.gpx); what this does is everything after that,
   which the 2D canvas did on the CPU on many machines: it puts the part
   in view up as a texture, stretches it onto the screen, and makes the
   glow (the hot cells shrunk twice, which blurs them, and laid back over
   the top, added), as gameDraw's 2D path does, step for step.

   the page is four canvases, one over the other (index.html):
     gl    this: the field and its glow, on the background colour
     fx    the bangs (game.js drawBangs: lightning, shock rings, a
           firework's glow), added onto the field (mix-blend-mode:
           plus-lighter, as the 2D path draws them "lighter")
     cv    the 2D canvas, with a hole where the field is: the panel,
           the strip, the bubbles, the cursor. it takes the input
     vig   the vignette and the scanlines, painted once a size
   with no WebGL2, or only a software one (the GPU blocklisted: drawn by
   the CPU, which the 2D canvas does faster), or if the GPU takes it away,
   gl and fx are hidden and cv draws the lot, as it always did.
     ?2d in the address    the 2D canvas, whatever there is
     ?gl                   WebGL2 even in software (headless browsers)
   ===================================================================== */
"use strict";

var GLR = null;

var GLR_VS = "#version 300 es\n" +
  "uniform vec4 uDst; uniform vec4 uSrc; out vec2 vUV;\n" +
  "void main() {\n" +
  "  vec2 c = vec2(float(gl_VertexID & 1), float((gl_VertexID >> 1) & 1));\n" +
  "  vUV = mix(uSrc.xy, uSrc.zw, c);\n" +
  "  gl_Position = vec4(mix(uDst.xy, uDst.zw, c), 0.0, 1.0);\n" +
  "}\n";
/* the field: each screen pixel the cell under it, as a drawImage with no smoothing (uv in cells) */
var GLR_FS_NEAREST = "#version 300 es\nprecision highp float;\n" +
  "uniform sampler2D uTex; uniform ivec2 uMax; in vec2 vUV; out vec4 o;\n" +
  "void main() { o = vec4(texelFetch(uTex, min(ivec2(floor(vUV)), uMax), 0).rgb, 1.0); }\n";
/* the glow: smoothed, and as strong as uA (uv 0 to 1) */
var GLR_FS_LINEAR = "#version 300 es\nprecision highp float;\n" +
  "uniform sampler2D uTex; uniform float uA; in vec2 vUV; out vec4 o;\n" +
  "void main() { o = texture(uTex, vUV) * uA; }\n";

function glrShader(gl, type, src) {
  var s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("shader: " + gl.getShaderInfoLog(s));
  return s;
}
function glrProgram(gl, fs) {
  var p = gl.createProgram();
  gl.attachShader(p, glrShader(gl, gl.VERTEX_SHADER, GLR_VS));
  gl.attachShader(p, glrShader(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("program: " + gl.getProgramInfoLog(p));
  var u = {};
  ["uDst", "uSrc", "uTex", "uMax", "uA"].forEach(function (k) { u[k] = gl.getUniformLocation(p, k); });
  return { p: p, u: u };
}
function glrTex(gl, w, h, filter) {
  var t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

/* WebGL drawn by the CPU (a GPU the browser will not use): slower than the 2D canvas, which is what it is there for */
var GLR_SOFT = /swiftshader|llvmpipe|softpipe|software|basic render/i;
/* the renderer on canvas el, or null if there is no WebGL2 to be had, or only a software one (force: take that too) */
function glrInit(el, force) {
  var gl = null;
  try {
    gl = el.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false,
                                   failIfMajorPerformanceCaveat: !force });
  } catch (e) { gl = null; }
  if (!gl) return null;
  var info = gl.getExtension("WEBGL_debug_renderer_info");
  var who = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  if (!force && GLR_SOFT.test(who)) {
    var lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
    return null;
  }
  try {
    var R = { gl: gl, el: el, near: glrProgram(gl, GLR_FS_NEAREST), lin: glrProgram(gl, GLR_FS_LINEAR), vao: gl.createVertexArray(),
              texW: 0, field: null, glow: null,
              /* the small two: one screen's worth, halved and halved again, as game.js gamePicture's gc2 and gc4 */
              w2: Math.ceil(VIEW_GW / 2), h2: Math.ceil(GH / 2), w4: Math.ceil(VIEW_GW / 4), h4: Math.ceil(GH / 4),
              t2: null, t4: null, f2: null, f4: null, lost: false };
    R.t2 = glrTex(gl, R.w2, R.h2, gl.LINEAR); R.f2 = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, R.f2); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, R.t2, 0);
    R.t4 = glrTex(gl, R.w4, R.h4, gl.LINEAR); R.f4 = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, R.f4); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, R.t4, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("framebuffer incomplete");
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(R.vao);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    el.addEventListener("webglcontextlost", function (e) { e.preventDefault(); R.lost = true; if (GLR === R) glrOff(); });
    return R;
  } catch (e) {
    if (typeof console !== "undefined") console.warn("pleasand: no WebGL2 field (" + e.message + "); the 2D canvas draws it");
    return null;
  }
}
/* (made off, for good: the 2D canvas draws everything from the next frame on) */
var glrOffHook = null;
function glrOff() { GLR = null; if (glrOffHook) glrOffHook(); }

/* the textures the field goes up in: as wide as the columns drawWorld works out (drawCols: the view, and two either side) */
function glrTextures(R, g) {
  var gl = R.gl, w = Math.min(g.gw, VIEW_GW + 4);
  if (R.field) gl.deleteTexture(R.field);
  if (R.glow) gl.deleteTexture(R.glow);
  R.field = glrTex(gl, w, GH, gl.NEAREST);
  R.glow = glrTex(gl, w, GH, gl.LINEAR);
  R.texW = w;
}
/* game pixels to clip space: the 2D canvas's transform is a plain scale of the game's 640 by 410, so this is too */
function glrRect(gl, loc, x0, y0, x1, y1) { gl.uniform4f(loc, x0 / VW * 2 - 1, 1 - y0 / VH * 2, x1 / VW * 2 - 1, 1 - y1 / VH * 2); }
function glrUp(gl, tex, data, gw, c0, cw) {
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_ROW_LENGTH, gw);
  gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, c0);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, cw, GH, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
  gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
}

/* this frame's field. c0, cw: the columns drawWorld worked out; cam: the first in view; sx, sy: the shake; glow: any */
function glrDraw(R, g, c0, cw, cam, sx, sy, glow) {
  var gl = R.gl, W = R.el.width, H = R.el.height, PW = VIEW_GW * CELL, PH = PLAY_H, u, o = cam - c0;
  if (R.texW !== Math.min(g.gw, VIEW_GW + 4) || R.field === null) glrTextures(R, g);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, W, H);
  gl.disable(gl.SCISSOR_TEST); gl.disable(gl.BLEND);
  gl.clearColor(5 / 255, 7 / 255, 12 / 255, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  glrUp(gl, R.field, g.img.data, g.gw, c0, cw);
  /* (clipped to the field, as gameDraw clips the 2D canvas) */
  var kx = W / VW, ky = H / VH, x0 = Math.round(PANEL * kx), x1 = Math.round((PANEL + PW) * kx);
  var yb = Math.round(PLAY_B * ky), yt = Math.round(PLAY_Y * ky);
  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(x0, H - yb, x1 - x0, yb - yt);
  u = R.near.u;
  gl.useProgram(R.near.p);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, R.field);
  gl.uniform1i(u.uTex, 0);
  gl.uniform2i(u.uMax, cw - 1, GH - 1);
  glrRect(gl, u.uDst, PANEL + sx, PLAY_Y + sy, PANEL + sx + PW, PLAY_Y + sy + PH);
  gl.uniform4f(u.uSrc, o, 0, o + VIEW_GW, GH);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  if (!glow) return;

  /* the glow: hot cells only, shrunk twice (which blurs them), then laid over the top */
  glrUp(gl, R.glow, g.gimg.data, g.gw, c0, cw);
  gl.disable(gl.SCISSOR_TEST);
  u = R.lin.u;
  gl.useProgram(R.lin.p);
  gl.uniform1i(u.uTex, 0);
  gl.uniform1f(u.uA, 1);
  gl.uniform4f(u.uDst, -1, -1, 1, 1);
  gl.bindFramebuffer(gl.FRAMEBUFFER, R.f2);
  gl.viewport(0, 0, R.w2, R.h2);
  gl.bindTexture(gl.TEXTURE_2D, R.glow);
  gl.uniform4f(u.uSrc, o / R.texW, 0, (o + VIEW_GW) / R.texW, 1);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, R.f4);
  gl.viewport(0, 0, R.w4, R.h4);
  gl.bindTexture(gl.TEXTURE_2D, R.t2);
  gl.uniform4f(u.uSrc, 0, 0, 1, 1);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, W, H);
  gl.enable(gl.SCISSOR_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.bindTexture(gl.TEXTURE_2D, R.t2);
  gl.uniform1f(u.uA, 0.45);
  glrRect(gl, u.uDst, PANEL + sx, PLAY_Y + sy, PANEL + sx + R.w2 * 2 * CELL, PLAY_Y + sy + R.h2 * 2 * CELL);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindTexture(gl.TEXTURE_2D, R.t4);
  gl.uniform1f(u.uA, 0.8);
  glrRect(gl, u.uDst, PANEL - 2 + sx, PLAY_Y - 2 + sy, PANEL - 2 + sx + R.w4 * 4 * CELL + 4, PLAY_Y - 2 + sy + R.h4 * 4 * CELL + 4);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.disable(gl.BLEND);
}
