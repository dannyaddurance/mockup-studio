(function (MS) {
  'use strict';

  // Projects the mockup texture as a quad with CSS-like perspective.
  // Pixel space has y pointing down; positive z points towards the viewer.
  const VS = `
    attribute vec2 aPos;
    uniform vec2 uSize;
    uniform mat3 uRot;
    uniform vec2 uCanvas;
    uniform vec2 uOffset;
    uniform float uDist;
    varying vec2 vUv;
    void main() {
      vec3 p = uRot * vec3(aPos * uSize, 0.0);
      float w = (uDist - p.z) / uDist;
      vec2 s = p.xy + uOffset * w;
      gl_Position = vec4(s.x / (uCanvas.x * 0.5), -s.y / (uCanvas.y * 0.5), 0.0, w);
      vUv = aPos + 0.5;
    }`;

  const FS = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    varying vec2 vUv;
    uniform sampler2D uTex;
    void main() { gl_FragColor = texture2D(uTex, vUv); }`;

  // Multi-image layouts. x/y are canvas fractions added to the global offset,
  // s scales the fit box, slot picks the image. Items paint in array order.
  const LAYOUTS = {
    single: [{ slot: 0, x: 0, y: 0, s: 1 }],
    duo: [
      { slot: 0, x: -0.2, y: 0.03, s: 0.6 },
      { slot: 1, x: 0.2, y: -0.03, s: 0.6 },
    ],
    trio: [
      { slot: 1, x: -0.25, y: 0.05, s: 0.48 },
      { slot: 2, x: 0.25, y: 0.05, s: 0.48 },
      { slot: 0, x: 0, y: -0.02, s: 0.58 },
    ],
    stack: [
      { slot: 2, x: 0.07, y: 0.08, s: 0.72 },
      { slot: 1, x: 0, y: 0, s: 0.72 },
      { slot: 0, x: -0.07, y: -0.08, s: 0.72 },
    ],
  };
  const slotCount = (layout) => (LAYOUTS[layout] || LAYOUTS.single).length;

  function mul3(a, b) {
    const o = new Array(9);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    return o;
  }

  // Applied as Rz first, then Rx, then Ry. Returned column-major for WebGL.
  function rotationMatrix(ax, ay, az) {
    const d = Math.PI / 180;
    const cx = Math.cos(ax * d), sx = Math.sin(ax * d);
    const cy = Math.cos(ay * d), sy = Math.sin(ay * d);
    const cz = Math.cos(az * d), sz = Math.sin(az * d);
    const Rx = [1, 0, 0, 0, cx, -sx, 0, sx, cx];
    const Ry = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
    const Rz = [cz, -sz, 0, sz, cz, 0, 0, 0, 1];
    const m = mul3(Ry, mul3(Rx, Rz));
    return new Float32Array([m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]);
  }

  const MAX_TEXTURES = 8;

  class Projector {
    constructor() {
      this.canvas = document.createElement('canvas');
      const attrs = { alpha: true, premultipliedAlpha: true, antialias: true, preserveDrawingBuffer: true };
      let gl = null;
      try {
        gl = this.canvas.getContext('webgl2', attrs) || this.canvas.getContext('webgl', attrs);
      } catch (e) {
        gl = null;
      }
      this.gl = gl;
      if (!gl) return;

      this.isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
      const compile = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      this.prog = prog;
      this.aPos = gl.getAttribLocation(prog, 'aPos');
      this.u = {
        size: gl.getUniformLocation(prog, 'uSize'),
        rot: gl.getUniformLocation(prog, 'uRot'),
        canvas: gl.getUniformLocation(prog, 'uCanvas'),
        offset: gl.getUniformLocation(prog, 'uOffset'),
        dist: gl.getUniformLocation(prog, 'uDist'),
        tex: gl.getUniformLocation(prog, 'uTex'),
      };
      this.buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]), gl.STATIC_DRAW);
      this.textures = new Map(); // source canvas -> texture, in insertion (age) order
      this.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      const vp = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
      this.maxSize = Math.min(vp[0], vp[1], gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
      this.aniso =
        gl.getExtension('EXT_texture_filter_anisotropic') ||
        gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
    }

    get ok() {
      return !!this.gl;
    }

    texture(src) {
      const gl = this.gl;
      let tex = this.textures.get(src);
      if (tex) return tex;
      if (this.textures.size >= MAX_TEXTURES) {
        const [oldest, oldTex] = this.textures.entries().next().value;
        gl.deleteTexture(oldTex);
        this.textures.delete(oldest);
      }
      tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      const pot = (n) => (n & (n - 1)) === 0;
      if (this.isGL2 || (pot(src.width) && pot(src.height))) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
      if (this.aniso) {
        const max = gl.getParameter(this.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        gl.texParameterf(gl.TEXTURE_2D, this.aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, max));
      }
      this.textures.set(src, tex);
      return tex;
    }

    // Frees the texture of a source that will not be drawn again (old video frames).
    release(src) {
      if (!this.gl || !this.textures.has(src)) return;
      this.gl.deleteTexture(this.textures.get(src));
      this.textures.delete(src);
    }

    // p: { qw, qh, rotX, rotY, rotZ, offX, offY, dist }
    draw(src, W, H, p) {
      const gl = this.gl;
      const tex = this.texture(src);
      if (this.canvas.width !== W) this.canvas.width = W;
      if (this.canvas.height !== H) this.canvas.height = H;
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(this.prog);
      gl.uniform2f(this.u.size, p.qw, p.qh);
      gl.uniformMatrix3fv(this.u.rot, false, rotationMatrix(p.rotX, p.rotY, p.rotZ));
      gl.uniform2f(this.u.canvas, W, H);
      gl.uniform2f(this.u.offset, p.offX, p.offY);
      gl.uniform1f(this.u.dist, p.dist);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(this.u.tex, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
      gl.enableVertexAttribArray(this.aPos);
      gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return this.canvas;
    }
  }

  // Fallback without WebGL: only in-plane rotation.
  let fallbackCanvas = null;
  function draw2D(mock, RW, RH, qw, qh, rotZ, offX, offY) {
    fallbackCanvas = fallbackCanvas || document.createElement('canvas');
    fallbackCanvas.width = RW;
    fallbackCanvas.height = RH;
    const x = fallbackCanvas.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.translate(RW / 2 + offX, RH / 2 + offY);
    x.rotate((rotZ * Math.PI) / 180);
    x.drawImage(mock, -qw / 2, -qh / 2, qw, qh);
    return fallbackCanvas;
  }

  function shadowRgb(state, palette) {
    if (state.shadow.mode !== 'adaptive' || !palette || !palette.length) return '0,0,0';
    const c = MS.util.hexToRgb(MS.util.shade(palette[0], -0.55));
    return `${c.r},${c.g},${c.b}`;
  }

  function drawItem(ctx, o, mock, item, unit) {
    const { RW, RH, state, projector } = o;
    const scale = state.scale * item.s;
    const k = Math.min((RW * scale) / mock.width, (RH * scale) / mock.height);
    const qw = mock.width * k, qh = mock.height * k;
    const offX = (state.offX / 100 + item.x) * RW;
    const offY = (state.offY / 100 + item.y) * RH;

    const layer = projector.ok
      ? projector.draw(mock, RW, RH, {
          qw, qh,
          rotX: state.rotX, rotY: state.rotY, rotZ: state.rotZ,
          offX, offY,
          dist: state.perspective * Math.max(qw, qh),
        })
      : draw2D(mock, RW, RH, qw, qh, state.rotZ, offX, offY);

    const sh = state.shadow;
    if (sh.opacity > 0) {
      // Draw the layer off-canvas and shift only its shadow back into view,
      // so translucent frames are not painted twice.
      const rgb = shadowRgb(state, o.palette);
      const far = (RW + RH) * 2;
      ctx.save();
      ctx.shadowOffsetX = far;
      ctx.shadowColor = `rgba(${rgb},${sh.opacity})`;
      ctx.shadowBlur = sh.blur * unit;
      ctx.shadowOffsetY = sh.y * unit;
      ctx.drawImage(layer, -far, 0);
      ctx.shadowColor = `rgba(${rgb},${Math.min(1, sh.opacity * 0.5)})`;
      ctx.shadowBlur = Math.max(1, sh.blur * 0.12) * unit;
      ctx.shadowOffsetY = Math.max(0.5, sh.y * 0.08) * unit;
      ctx.drawImage(layer, -far, 0);
      ctx.restore();
    }
    ctx.drawImage(layer, 0, 0);
  }

  // o: { RW, RH, W, H, s, state, mocks, bg, projector, palette }
  //   RW/RH: render size in px, W/H: design canvas size, s = RW / W,
  //   mocks: one mockup canvas per layout slot.
  function compose(ctx, o) {
    const { RW, RH, W, H, s, state, mocks, bg } = o;
    const palette = o.palette || ['#7c5cff', '#00c2ff', '#ff5c8a', '#ffb020'];
    if (bg) ctx.drawImage(bg, 0, 0, RW, RH);

    const unit = (Math.min(W, H) / 1080) * s;
    if (state.overlay === 'shapes') MS.effects.drawShapes(ctx, RW, RH, palette);

    if (!state.hideMockup) {
      const items = LAYOUTS[state.layout] || LAYOUTS.single;
      items.forEach((item) => {
        const mock = mocks[item.slot] || mocks[0];
        if (mock) drawItem(ctx, o, mock, item, unit);
      });
    }

    if (state.overlay === 'window') MS.effects.drawWindowLight(ctx, RW, RH);
    if (state.fx && state.fx !== 'none') MS.effects.applyFx(ctx, RW, RH, state.fx, unit);
    if (state.watermark && state.watermark.enabled) MS.effects.drawWatermark(ctx, RW, RH, unit, state.watermark);
  }

  MS.Projector = Projector;
  MS.compose = compose;
  MS.LAYOUTS = LAYOUTS;
  MS.slotCount = slotCount;
})(window.MS);
