(function (MS) {
  'use strict';

  const { makeCanvas, roundRectPath, shade, FONT } = MS.util;

  const supportsFilter =
    typeof CanvasRenderingContext2D !== 'undefined' && 'filter' in CanvasRenderingContext2D.prototype;

  // Soft 3D spheres behind the mockup, coloured from the screenshot palette.
  function drawShapes(ctx, W, H, palette) {
    const M = Math.min(W, H);
    const spheres = [[0.15, 0.22, 0.16], [0.86, 0.76, 0.2], [0.82, 0.15, 0.08], [0.2, 0.84, 0.1]];
    spheres.forEach(([x, y, r], i) => {
      const cx = x * W, cy = y * H, R = r * M;
      const col = palette[i % palette.length];
      const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.05, cx, cy, R);
      g.addColorStop(0, shade(col, 0.65));
      g.addColorStop(0.5, col);
      g.addColorStop(1, shade(col, -0.45));
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = R * 0.5;
      ctx.shadowOffsetY = R * 0.25;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.restore();
    });
  }

  // Diagonal shadows of window blinds falling over the whole scene.
  function drawWindowLight(ctx, W, H) {
    const L = Math.hypot(W, H);
    const bars = makeCanvas(W, H);
    const c = bars.ctx;
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, W, H);
    c.save();
    c.translate(W / 2, H / 2);
    c.rotate(-0.5);
    c.fillStyle = '#000000';
    const bar = L * 0.05, gap = L * 0.11;
    for (let x = -L; x < L; x += gap) c.fillRect(x, -L, bar, L * 2);
    c.restore();

    let soft = bars.canvas;
    const blur = L * 0.012;
    if (supportsFilter) {
      const b = makeCanvas(W, H);
      b.ctx.fillStyle = '#ffffff';
      b.ctx.fillRect(0, 0, W, H);
      b.ctx.filter = `blur(${blur}px)`;
      b.ctx.drawImage(bars.canvas, 0, 0);
      soft = b.canvas;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.3;
    ctx.drawImage(soft, 0, 0);
    ctx.restore();
  }

  function rgbSplit(ctx, W, H, d) {
    if (d < 1) return;
    const img = ctx.getImageData(0, 0, W, H);
    const src = img.data;
    const out = new Uint8ClampedArray(src);
    for (let y = 0; y < H; y++) {
      const row = y * W * 4;
      for (let x = 0; x < W; x++) {
        const i = row + x * 4;
        out[i] = src[row + Math.min(W - 1, x + d) * 4];
        out[i + 2] = src[row + Math.max(0, x - d) * 4 + 2];
      }
    }
    img.data.set(out);
    ctx.putImageData(img, 0, 0);
  }

  function scanlines(ctx, W, H, unit) {
    const step = Math.max(2, Math.round(4 * unit));
    const lh = Math.max(1, Math.round(step / 2));
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    for (let y = 0; y < H; y += step) ctx.fillRect(0, y, W, lh);
    ctx.restore();
  }

  function vignette(ctx, W, H) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) / 2);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // Deterministic so the preview does not flicker between renders.
  function seeded(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function glitchSlices(ctx, W, H, unit) {
    const snap = makeCanvas(W, H);
    snap.ctx.drawImage(ctx.canvas, 0, 0);
    const rnd = seeded(7);
    for (let i = 0; i < 12; i++) {
      const y = rnd() * H;
      const h = (4 + rnd() * 36) * unit;
      const dx = (rnd() - 0.5) * 90 * unit;
      ctx.clearRect(0, y, W, h);
      ctx.drawImage(snap.canvas, 0, y, W, h, dx, y, W, h);
    }
  }

  function applyFx(ctx, W, H, fx, unit) {
    if (fx === 'vhs') {
      rgbSplit(ctx, W, H, Math.round(3 * unit));
      scanlines(ctx, W, H, unit);
      vignette(ctx, W, H);
    } else if (fx === 'glitch') {
      glitchSlices(ctx, W, H, unit);
      rgbSplit(ctx, W, H, Math.round(6 * unit));
    }
  }

  // wm: { text, position: tl|tr|bl|br|bc, theme: light|dark, opacity, size }
  function drawWatermark(ctx, W, H, unit, wm) {
    if (!wm.text) return;
    const size = wm.size * unit;
    ctx.save();
    ctx.font = `600 ${size}px ${FONT}`;
    const tw = ctx.measureText(wm.text).width;
    const padX = size * 0.75, padY = size * 0.45;
    const bw = tw + padX * 2, bh = size + padY * 2;
    const m = 36 * unit;
    const pos = wm.position;
    const x = pos.endsWith('l') ? m : pos.endsWith('r') ? W - m - bw : (W - bw) / 2;
    const y = pos.startsWith('t') ? m : H - m - bh;
    const dark = wm.theme === 'dark';
    ctx.globalAlpha = wm.opacity;
    roundRectPath(ctx, x, y, bw, bh, bh / 2);
    ctx.fillStyle = dark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)';
    ctx.fill();
    ctx.fillStyle = dark ? '#ffffff' : '#111111';
    ctx.textBaseline = 'middle';
    ctx.fillText(wm.text, x + padX, y + bh / 2 + size * 0.04);
    ctx.restore();
  }

  MS.effects = { drawShapes, drawWindowLight, applyFx, drawWatermark };
})(window.MS);
