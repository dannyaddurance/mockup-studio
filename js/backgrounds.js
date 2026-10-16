(function (MS) {
  'use strict';

  const { makeCanvas, rgba, shade, drawCover, extractPalette } = MS.util;

  const PRESETS = [
    { id: 'dawn', type: 'linear', angle: 135, stops: [[0, '#ff9a8b'], [0.55, '#ff6a88'], [1, '#ff99ac']] },
    { id: 'ocean', type: 'linear', angle: 135, stops: [[0, '#2b5876'], [1, '#4e4376']] },
    { id: 'mint', type: 'linear', angle: 120, stops: [[0, '#a8edea'], [1, '#fed6e3']] },
    { id: 'sunset', type: 'linear', angle: 160, stops: [[0, '#f83600'], [1, '#f9d423']] },
    { id: 'night', type: 'linear', angle: 160, stops: [[0, '#0f2027'], [0.5, '#203a43'], [1, '#2c5364']] },
    { id: 'lavender', type: 'linear', angle: 135, stops: [[0, '#c471f5'], [1, '#fa71cd']] },
    { id: 'forest', type: 'linear', angle: 135, stops: [[0, '#134e5e'], [1, '#71b280']] },
    { id: 'graphite', type: 'linear', angle: 180, stops: [[0, '#3a3a3f'], [1, '#121214']] },
    { id: 'aurora', type: 'mesh', base: '#0b1026', blobs: [[0.15, 0.2, 0.6, '#6d28d9'], [0.85, 0.25, 0.55, '#06b6d4'], [0.6, 0.95, 0.5, '#22c55e']] },
    { id: 'peach', type: 'mesh', base: '#ffd8be', blobs: [[0.1, 0.1, 0.6, '#ff8fab'], [0.9, 0.2, 0.55, '#ffc971'], [0.7, 0.9, 0.6, '#b8a1ff']] },
    { id: 'lagoon', type: 'mesh', base: '#031b34', blobs: [[0.2, 0.8, 0.6, '#0ea5e9'], [0.8, 0.2, 0.55, '#14b8a6'], [0.9, 0.9, 0.5, '#6366f1']] },
    { id: 'candy', type: 'mesh', base: '#fbcfe8', blobs: [[0.1, 0.2, 0.55, '#f472b6'], [0.9, 0.3, 0.55, '#a78bfa'], [0.5, 1, 0.6, '#60a5fa']] },
    { id: 'fire', type: 'mesh', base: '#1a0500', blobs: [[0.2, 0.9, 0.6, '#ef4444'], [0.8, 0.8, 0.55, '#f97316'], [0.6, 0.15, 0.45, '#facc15']] },
    { id: 'serene', type: 'mesh', base: '#e0e7ff', blobs: [[0.15, 0.15, 0.55, '#c7d2fe'], [0.85, 0.3, 0.55, '#a5f3fc'], [0.5, 0.95, 0.6, '#fbcfe8']] },
    { id: 'moss', type: 'mesh', base: '#0f1f17', blobs: [[0.2, 0.2, 0.55, '#3f6212'], [0.85, 0.6, 0.6, '#15803d'], [0.4, 1, 0.45, '#a3e635']] },
    { id: 'paper', type: 'mesh', base: '#f4f1ea', blobs: [[0.2, 0.2, 0.6, '#e7e0d2'], [0.8, 0.8, 0.6, '#ffffff']] },
  ];

  const supportsFilter =
    typeof CanvasRenderingContext2D !== 'undefined' && 'filter' in CanvasRenderingContext2D.prototype;

  function drawLinear(ctx, W, H, p) {
    const a = (p.angle * Math.PI) / 180;
    const dx = Math.sin(a), dy = -Math.cos(a);
    const len = Math.abs(W * dx) + Math.abs(H * dy);
    const g = ctx.createLinearGradient(W / 2 - (dx * len) / 2, H / 2 - (dy * len) / 2, W / 2 + (dx * len) / 2, H / 2 + (dy * len) / 2);
    p.stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawMesh(ctx, W, H, p) {
    ctx.fillStyle = p.base;
    ctx.fillRect(0, 0, W, H);
    const M = Math.max(W, H);
    p.blobs.forEach(([x, y, r, c]) => {
      const g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, r * M);
      g.addColorStop(0, rgba(c, 0.95));
      g.addColorStop(0.45, rgba(c, 0.5));
      g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });
  }

  function drawPreset(ctx, W, H, p) {
    if (p.type === 'mesh') drawMesh(ctx, W, H, p);
    else drawLinear(ctx, W, H, p);
  }

  function drawMagicBlur(ctx, W, H, src) {
    const tw = 64, th = Math.max(1, Math.round((64 * H) / W));
    const t = makeCanvas(tw, th);
    drawCover(t.ctx, src, tw, th);
    const blur = Math.max(W, H) * 0.03;
    const m = blur * 2;
    ctx.save();
    if (supportsFilter) ctx.filter = `blur(${blur}px) saturate(1.6) brightness(0.95)`;
    ctx.drawImage(t.canvas, -m, -m, W + m * 2, H + m * 2);
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, 0, W, H);
  }

  const paletteCache = new Map();

  function palette(source) {
    let pal = paletteCache.get(source.id);
    if (!pal) {
      pal = extractPalette(source.src, 4);
      paletteCache.set(source.id, pal);
    }
    return pal;
  }

  function magicMeshPreset(source) {
    const pal = palette(source);
    return {
      type: 'mesh',
      base: shade(pal[0], -0.45),
      blobs: [[0.12, 0.18, 0.65, pal[0]], [0.88, 0.22, 0.6, pal[1]], [0.25, 0.92, 0.6, pal[2]], [0.9, 0.88, 0.55, pal[3]]],
    };
  }

  let noisePattern = null;
  function applyNoise(ctx, W, H, amount) {
    if (!noisePattern) {
      const { canvas, ctx: n } = makeCanvas(256, 256);
      const img = n.createImageData(256, 256);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      n.putImageData(img, 0, 0);
      noisePattern = canvas;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = amount;
    ctx.fillStyle = ctx.createPattern(noisePattern, 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // bg: state.bg; info: { source: {src, id}, bgImage }
  function draw(ctx, W, H, bg, info) {
    switch (bg.type) {
      case 'gradient':
        drawPreset(ctx, W, H, PRESETS.find((p) => p.id === bg.preset) || PRESETS[0]);
        break;
      case 'solid':
        ctx.fillStyle = bg.color;
        ctx.fillRect(0, 0, W, H);
        break;
      case 'magic-blur':
        drawMagicBlur(ctx, W, H, info.source.src);
        break;
      case 'magic-mesh':
        drawMesh(ctx, W, H, magicMeshPreset(info.source));
        break;
      case 'image':
        if (info.bgImage) drawCover(ctx, info.bgImage, W, H);
        else {
          ctx.fillStyle = '#26262c';
          ctx.fillRect(0, 0, W, H);
        }
        break;
      case 'transparent':
      default:
        return;
    }
    if (bg.noise > 0) applyNoise(ctx, W, H, bg.noise);
  }

  function thumb(preset, w, h) {
    const { canvas, ctx } = makeCanvas(w, h);
    drawPreset(ctx, w, h, preset);
    return canvas.toDataURL();
  }

  MS.backgrounds = { PRESETS, draw, thumb, palette };
})(window.MS);
