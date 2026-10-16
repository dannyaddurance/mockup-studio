(function (MS) {
  'use strict';

  const { makeCanvas, roundRectPath, drawRounded, maskRounded, shade, srcSize, hexToRgb, FONT } = MS.util;

  // Transparent margin around every mockup so the projected quad gets soft edges.
  const PAD = 4;

  // Screenshot styles and browser windows: these adapt to the media's aspect ratio.
  const LIST = [
    { id: 'none', name: 'Standaard', group: 'style' },
    { id: 'glass-light', name: 'Glas licht', group: 'style' },
    { id: 'glass-dark', name: 'Glas donker', group: 'style' },
    { id: 'liquid-glass', name: 'Vloeibaar glas', group: 'style' },
    { id: 'inset-light', name: 'Inzet licht', group: 'style' },
    { id: 'inset-dark', name: 'Inzet donker', group: 'style' },
    { id: 'outline', name: 'Omlijning', group: 'style' },
    { id: 'border', name: 'Rand', group: 'style' },
  ];

  const CATEGORIES = [
    { id: 'iphone', name: 'iPhone' },
    { id: 'android', name: 'Android' },
    { id: 'ipad', name: 'iPad' },
    { id: 'mac', name: 'Mac' },
    { id: 'other', name: 'Overig' },
  ];

  // Devices keep their real proportions: body in millimetres, screen in pixels,
  // side = screen bezel as a fraction of body width, radius = body corner radius
  // as a fraction of body width. Colours approximate the available finishes.
  const DEVICES = [
    { id: 'iphone-17-pro', name: 'iPhone 17 Pro', cat: 'iphone', kind: 'phone', body: [71.9, 150.0], screen: [1206, 2622], side: 0.036, radius: 0.19, cutout: 'island', buttons: 'iphone', colors: ['#e3e4e6', '#2e3b52', '#d4703a'] },
    { id: 'iphone-17-pro-max', name: 'iPhone 17 Pro Max', cat: 'iphone', kind: 'phone', body: [78.0, 163.4], screen: [1320, 2868], side: 0.034, radius: 0.18, cutout: 'island', buttons: 'iphone', colors: ['#e3e4e6', '#2e3b52', '#d4703a'] },
    { id: 'iphone-air', name: 'iPhone Air', cat: 'iphone', kind: 'phone', body: [74.7, 156.2], screen: [1260, 2736], side: 0.033, radius: 0.18, cutout: 'island', buttons: 'iphone', colors: ['#e8e6e1', '#1d1d1f', '#dfe6ee', '#efe3c8'] },
    { id: 'iphone-17', name: 'iPhone 17', cat: 'iphone', kind: 'phone', body: [71.5, 149.6], screen: [1206, 2622], side: 0.038, radius: 0.19, cutout: 'island', buttons: 'iphone', colors: ['#2b2b2e', '#f2f2f0', '#b9c8e6', '#c7d8b8', '#cdbfe0'] },
    { id: 'iphone-16e', name: 'iPhone 16e', cat: 'iphone', kind: 'phone', body: [71.5, 146.7], screen: [1170, 2532], side: 0.042, radius: 0.18, cutout: 'notch', buttons: 'iphone', colors: ['#1d1d1f', '#f2f2f0'] },
    { id: 'iphone-se', name: 'iPhone SE', cat: 'iphone', kind: 'phone', body: [67.3, 138.4], screen: [750, 1334], side: 0.06, radius: 0.14, cutout: 'home', buttons: 'iphone-se', colors: ['#1d1d1f', '#f2f2f0', '#c8102e'] },

    { id: 'pixel-10-pro', name: 'Pixel 10 Pro', cat: 'android', kind: 'phone', body: [72.0, 152.8], screen: [1280, 2856], side: 0.034, radius: 0.15, cutout: 'punch', buttons: 'android', colors: ['#3c3c3f', '#e6e4df', '#a8b4a0', '#d9c9b0'] },
    { id: 'galaxy-s25-ultra', name: 'Galaxy S25 Ultra', cat: 'android', kind: 'phone', body: [77.6, 162.8], screen: [1440, 3120], side: 0.03, radius: 0.07, cutout: 'punch', buttons: 'android', colors: ['#4a4c50', '#c7c9cc', '#2c3e50', '#d8d2c4'] },
    { id: 'galaxy-s25', name: 'Galaxy S25', cat: 'android', kind: 'phone', body: [70.5, 146.9], screen: [1080, 2340], side: 0.035, radius: 0.16, cutout: 'punch', buttons: 'android', colors: ['#2b2d33', '#b8c6dc', '#d9e4ef', '#cfe3d0'] },
    { id: 'galaxy-tab-s10', name: 'Galaxy Tab S10', cat: 'android', kind: 'tablet', body: [165.8, 254.3], screen: [1752, 2800], side: 0.04, radius: 0.05, cutout: 'cam-long', buttons: 'tablet', colors: ['#4a4c50', '#c7c9cc'] },

    { id: 'ipad-pro-13', name: 'iPad Pro 13"', cat: 'ipad', kind: 'tablet', body: [215.5, 281.6], screen: [2064, 2752], side: 0.04, radius: 0.06, cutout: 'cam-long', buttons: 'tablet', colors: ['#3a3a3c', '#e3e4e6'] },
    { id: 'ipad-pro-11', name: 'iPad Pro 11"', cat: 'ipad', kind: 'tablet', body: [177.5, 249.7], screen: [1668, 2420], side: 0.045, radius: 0.07, cutout: 'cam-long', buttons: 'tablet', colors: ['#3a3a3c', '#e3e4e6'] },
    { id: 'ipad-air', name: 'iPad Air 11"', cat: 'ipad', kind: 'tablet', body: [178.5, 247.6], screen: [1640, 2360], side: 0.05, radius: 0.07, cutout: 'cam-long', buttons: 'tablet', colors: ['#3a3a3c', '#dfe3ea', '#cdbfe0', '#c9d6e8'] },
    { id: 'ipad-mini', name: 'iPad mini', cat: 'ipad', kind: 'tablet', body: [134.8, 195.4], screen: [1488, 2266], side: 0.065, radius: 0.085, cutout: 'cam-short', buttons: 'tablet', colors: ['#3a3a3c', '#e8e3dc', '#b8c6e0', '#d8cfe6'] },

    { id: 'macbook-pro-14', name: 'MacBook Pro 14"', cat: 'mac', kind: 'laptop', screen: [3024, 1964], notch: true, colors: ['#2f3033', '#d5d6d8'] },
    { id: 'macbook-pro-16', name: 'MacBook Pro 16"', cat: 'mac', kind: 'laptop', screen: [3456, 2234], notch: true, colors: ['#2f3033', '#d5d6d8'] },
    { id: 'macbook-air-13', name: 'MacBook Air 13"', cat: 'mac', kind: 'laptop', screen: [2560, 1664], notch: true, colors: ['#2e3440', '#d5d6d8', '#e6ddcd', '#7d8592'] },
    { id: 'imac-24', name: 'iMac 24"', cat: 'mac', kind: 'desktop', screen: [4480, 2520], style: 'imac', colors: ['#4f7fd1', '#f3a3a8', '#5ba57b', '#f2c84b', '#9a7fd0', '#f08a4b', '#d5d6d8'] },
    { id: 'studio-display', name: 'Studio Display', cat: 'mac', kind: 'desktop', screen: [5120, 2880], style: 'studio', colors: ['#d5d6d8'] },

    { id: 'laptop', name: 'Laptop', cat: 'other', kind: 'laptop', screen: [2560, 1600], notch: false, colors: ['#d5d6d8', '#4a4a4f', '#1f2430'] },
    { id: 'watch', name: 'Apple Watch', cat: 'other', kind: 'watch', screen: [416, 496], colors: ['#1d1d1f', '#d5d6d8', '#e8c9b0'] },
    { id: 'browser-light', name: 'Browser', cat: 'other', kind: 'browser' },
    { id: 'browser-dark', name: 'Browser donker', cat: 'other', kind: 'browser' },
  ];

  // Settings saved by earlier versions.
  const ALIASES = { glass: 'glass-light', phone: 'iphone-17-pro', tablet: 'ipad-pro-11' };
  const resolve = (id) => ALIASES[id] || id;
  const device = (id) => DEVICES.find((d) => d.id === resolve(id)) || null;
  const isDevice = (id) => {
    const d = device(id);
    return !!d && d.kind !== 'browser';
  };
  const canRotate = (id) => {
    const d = device(id);
    return !!d && (d.kind === 'phone' || d.kind === 'tablet');
  };

  // Height/width of the screen area, or null when the frame follows the media.
  function contentAspect(id, orientation) {
    const d = device(id);
    if (!d || !d.screen) return null;
    const a = d.screen[1] / d.screen[0];
    return orientation === 'landscape' && canRotate(id) ? 1 / a : a;
  }

  function fit(src, maxDim) {
    const { w, h } = srcSize(src);
    const k = Math.min(1, maxDim / Math.max(w, h));
    return { cw: Math.max(1, Math.round(w * k)), ch: Math.max(1, Math.round(h * k)) };
  }

  const isLight = (hex) => {
    const c = hexToRgb(hex);
    return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b > 160;
  };

  function metalGradient(ctx, x, w, metal) {
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, shade(metal, -0.14));
    g.addColorStop(0.06, shade(metal, 0.2));
    g.addColorStop(0.5, metal);
    g.addColorStop(0.94, shade(metal, 0.2));
    g.addColorStop(1, shade(metal, -0.14));
    return g;
  }

  // Rotates a source a quarter turn: dir 1 = clockwise, -1 = counter-clockwise.
  function rotated(src, dir) {
    const { w, h } = srcSize(src);
    const { canvas, ctx } = makeCanvas(h, w);
    ctx.translate(h / 2, w / 2);
    ctx.rotate((dir * Math.PI) / 2);
    ctx.drawImage(src, -w / 2, -h / 2, w, h);
    return canvas;
  }

  // Puts the media on a fixed-ratio screen. fill: cover, top-aligned when the
  // media is taller (app screenshots start at the top); fit: contain on black.
  function fillScreen(ctx, src, x, y, w, h, r, mode) {
    const t = makeCanvas(w, h);
    const { w: iw, h: ih } = srcSize(src);
    const W = t.canvas.width, H = t.canvas.height;
    if (mode === 'fit') {
      t.ctx.fillStyle = '#000000';
      t.ctx.fillRect(0, 0, W, H);
      const k = Math.min(W / iw, H / ih);
      t.ctx.drawImage(src, (W - iw * k) / 2, (H - ih * k) / 2, iw * k, ih * k);
    } else {
      const k = Math.max(W / iw, H / ih);
      const dw = iw * k, dh = ih * k;
      t.ctx.drawImage(src, (W - dw) / 2, dh > H + 1 ? 0 : (H - dh) / 2, dw, dh);
    }
    if (r > 0.5) maskRounded(t.ctx, 0, 0, W, H, r);
    ctx.drawImage(t.canvas, x, y, w, h);
  }

  // ---------- screenshot styles

  function none(src, o) {
    const { cw, ch } = fit(src, o.maxDim);
    const r = (o.radius * cw) / 1000;
    const { canvas, ctx } = makeCanvas(cw + PAD * 2, ch + PAD * 2);
    drawRounded(ctx, src, PAD, PAD, cw, ch, r);
    return canvas;
  }

  // A card or ring of `pad` around the screenshot. fill(ctx, x, y, w, h)
  // returns a fill style (or null), stroke an outer stroke colour, inner an
  // optional stroke drawn on the screenshot edge.
  function ringStyle(src, o, opt) {
    const { cw, ch } = fit(src, o.maxDim);
    const p = Math.round(cw * opt.pad);
    const r = (o.radius * cw) / 1000;
    const R = r > 0 ? r + p : 0;
    const W = cw + p * 2, H = ch + p * 2;
    const { canvas, ctx } = makeCanvas(W + PAD * 2, H + PAD * 2);
    const x = PAD, y = PAD;
    const lw = Math.max(1, cw * (opt.strokeWidth || 0.0015));

    const fill = opt.fill && opt.fill(ctx, x, y, W, H);
    if (fill) {
      roundRectPath(ctx, x, y, W, H, R);
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (opt.stroke) {
      ctx.lineWidth = lw;
      roundRectPath(ctx, x + lw / 2, y + lw / 2, W - lw, H - lw, Math.max(0, R - lw / 2));
      ctx.strokeStyle = typeof opt.stroke === 'function' ? opt.stroke(ctx, x, y, W, H) : opt.stroke;
      ctx.stroke();
    }
    drawRounded(ctx, src, x + p, y + p, cw, ch, r);
    if (opt.inner) {
      const iw = Math.max(1, cw * 0.001);
      ctx.lineWidth = iw;
      roundRectPath(ctx, x + p + iw / 2, y + p + iw / 2, cw - iw, ch - iw, Math.max(0, r - iw / 2));
      ctx.strokeStyle = opt.inner;
      ctx.stroke();
    }
    return canvas;
  }

  const diagonal = (stops) => (ctx, x, y, w, h) => {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    return g;
  };

  const STYLES = {
    'glass-light': { pad: 0.022, fill: () => 'rgba(255,255,255,0.22)', stroke: 'rgba(255,255,255,0.5)' },
    'glass-dark': { pad: 0.022, fill: () => 'rgba(0,0,0,0.3)', stroke: 'rgba(255,255,255,0.14)' },
    'liquid-glass': {
      pad: 0.03,
      fill: diagonal([[0, 'rgba(255,255,255,0.5)'], [0.45, 'rgba(255,255,255,0.1)'], [1, 'rgba(255,255,255,0.28)']]),
      stroke: diagonal([[0, 'rgba(255,255,255,0.9)'], [0.5, 'rgba(255,255,255,0.15)'], [1, 'rgba(255,255,255,0.6)']]),
      strokeWidth: 0.0025,
      inner: 'rgba(255,255,255,0.35)',
    },
    'inset-light': {
      pad: 0.03,
      fill: diagonal([[0, '#fbfbfc'], [1, '#e9e9ee']]),
      stroke: 'rgba(0,0,0,0.06)',
      inner: 'rgba(0,0,0,0.12)',
    },
    'inset-dark': {
      pad: 0.03,
      fill: diagonal([[0, '#232328'], [1, '#101013']]),
      stroke: 'rgba(255,255,255,0.08)',
      inner: 'rgba(255,255,255,0.1)',
    },
    outline: { pad: 0.018, fill: null, stroke: 'rgba(255,255,255,0.8)', strokeWidth: 0.0025 },
    border: { pad: 0.014, fill: () => '#ffffff' },
  };

  // ---------- browser window (adapts to the media)

  function browser(src, o, dark) {
    const { cw, ch } = fit(src, o.maxDim);
    const bar = Math.round(cw * 0.042);
    const r = (o.radius * cw) / 1000;
    const W = cw, H = ch + bar;

    const body = makeCanvas(W, H);
    const b = body.ctx;
    b.fillStyle = dark ? '#232326' : '#ececef';
    b.fillRect(0, 0, W, bar);
    b.drawImage(src, 0, bar, cw, ch);
    const sep = Math.max(1, bar * 0.02);
    b.fillStyle = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    b.fillRect(0, bar - sep, W, sep);

    const dr = bar * 0.13, gap = bar * 0.42, x0 = bar * 0.5;
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
      b.beginPath();
      b.arc(x0 + i * gap, bar / 2, dr, 0, Math.PI * 2);
      b.fillStyle = c;
      b.fill();
    });

    const reserved = x0 + 2 * gap + dr + bar * 0.4;
    const pw = Math.max(0, Math.min(W * 0.42, W - reserved * 2));
    const ph = bar * 0.56;
    if (pw > ph * 2) {
      const px = (W - pw) / 2, py = (bar - ph) / 2;
      roundRectPath(b, px, py, pw, ph, ph / 2);
      b.fillStyle = dark ? '#36363a' : '#dcdce1';
      b.fill();
      if (o.url) {
        b.fillStyle = dark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.6)';
        b.font = `500 ${Math.round(ph * 0.48)}px ${FONT}`;
        b.textAlign = 'center';
        b.textBaseline = 'middle';
        b.fillText(o.url, W / 2, py + ph / 2 + ph * 0.03, pw * 0.88);
      }
    }

    maskRounded(b, 0, 0, W, H, r);
    const lw = Math.max(1, cw * 0.001);
    b.lineWidth = lw;
    roundRectPath(b, lw / 2, lw / 2, W - lw, H - lw, r);
    b.strokeStyle = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    b.stroke();

    const { canvas, ctx } = makeCanvas(W + PAD * 2, H + PAD * 2);
    ctx.drawImage(body.canvas, PAD, PAD);
    return canvas;
  }

  // ---------- phones and tablets

  // [side (-1 left, 1 right, 0 top), start, length] as fractions of the body edge.
  const BUTTONS = {
    iphone: [[-1, 0.17, 0.035], [-1, 0.24, 0.06], [-1, 0.32, 0.06], [1, 0.27, 0.1], [1, 0.55, 0.06]],
    'iphone-se': [[-1, 0.16, 0.03], [-1, 0.23, 0.055], [-1, 0.3, 0.055], [1, 0.23, 0.07]],
    android: [[1, 0.2, 0.12], [1, 0.38, 0.06]],
    tablet: [[0, 0.78, 0.07], [1, 0.08, 0.05], [1, 0.15, 0.05]],
  };

  function drawButtons(ctx, d, ox, oy, BW, BH, btn, metal) {
    ctx.fillStyle = shade(metal, -0.2);
    (BUTTONS[d.buttons] || []).forEach(([side, start, len]) => {
      const t = btn * 2.2;
      if (side === 0) {
        roundRectPath(ctx, ox + BW * start, oy - btn, BW * len, t, btn * 0.8);
      } else {
        const x = side < 0 ? ox - btn : ox + BW - t + btn;
        roundRectPath(ctx, x, oy + BH * start, t, BH * len, btn * 0.8);
      }
      ctx.fill();
    });
  }

  function drawCutout(ctx, d, ox, oy, BW, BH, sx, sy, sw, sh, front) {
    ctx.fillStyle = '#000000';
    switch (d.cutout) {
      case 'island': {
        const w = sw * 0.31, h = sw * 0.09;
        roundRectPath(ctx, sx + sw / 2 - w / 2, sy + sw * 0.028, w, h, h / 2);
        ctx.fill();
        break;
      }
      case 'notch': {
        const w = sw * 0.44, h = sw * 0.08, r = h * 0.55;
        roundRectPath(ctx, sx + sw / 2 - w / 2, sy - r, w, h + r, r);
        ctx.fill();
        break;
      }
      case 'punch':
        ctx.beginPath();
        ctx.arc(sx + sw / 2, sy + sw * 0.05, sw * 0.028, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'home': {
        const top = sy - oy, chinTop = sy + sh, chin = oy + BH - chinTop;
        const dark = !isLight(front);
        roundRectPath(ctx, ox + BW / 2 - BW * 0.09, oy + top / 2 - BW * 0.006, BW * 0.18, BW * 0.012, BW * 0.006);
        ctx.fillStyle = dark ? '#1a1a1c' : '#c9c9cc';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ox + BW / 2 - BW * 0.16, oy + top / 2, BW * 0.012, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ox + BW / 2, chinTop + chin / 2, chin * 0.3, 0, Math.PI * 2);
        ctx.lineWidth = BW * 0.006;
        ctx.strokeStyle = dark ? '#2c2c2f' : '#bfbfc3';
        ctx.stroke();
        break;
      }
      case 'cam-long':
        ctx.beginPath();
        ctx.arc(ox + (sx - ox) / 2, oy + BH / 2, Math.max(1, (sx - ox) * 0.16), 0, Math.PI * 2);
        ctx.fillStyle = '#1c1d22';
        ctx.fill();
        break;
      case 'cam-short':
        ctx.beginPath();
        ctx.arc(ox + BW / 2, oy + (sy - oy) / 2, Math.max(1, (sy - oy) * 0.16), 0, Math.PI * 2);
        ctx.fillStyle = '#1c1d22';
        ctx.fill();
        break;
    }
  }

  function handheld(src0, o, d) {
    const landscape = o.orientation === 'landscape';
    // Landscape: put the media a quarter turn back, build the portrait device, turn it all.
    const src = landscape ? rotated(src0, -1) : src0;
    const ratio = d.body[1] / d.body[0];
    const BW = Math.max(60, Math.round(Math.min(o.maxDim / ratio, d.screen[0] / (1 - 2 * d.side))));
    const BH = Math.round(BW * ratio);
    const sw = BW * (1 - 2 * d.side);
    const sh = (sw * d.screen[1]) / d.screen[0];
    const Ro = BW * d.radius;
    const band = BW * (d.kind === 'tablet' ? 0.008 : 0.012);
    const Ri = d.cutout === 'home' ? 0 : Math.max(BW * 0.01, Ro - BW * d.side);
    const btn = BW * (d.kind === 'tablet' ? 0.005 : 0.011);
    const metal = o.deviceColor;
    const front = d.cutout === 'home' && isLight(metal) ? '#f4f4f5' : '#050506';

    const { canvas, ctx } = makeCanvas(BW + btn * 2 + PAD * 2, BH + btn * 2 + PAD * 2);
    const ox = PAD + btn, oy = PAD + btn;
    const sx = ox + (BW - sw) / 2, sy = oy + (BH - sh) / 2;

    drawButtons(ctx, d, ox, oy, BW, BH, btn, metal);
    roundRectPath(ctx, ox, oy, BW, BH, Ro);
    ctx.fillStyle = metalGradient(ctx, ox, BW, metal);
    ctx.fill();
    roundRectPath(ctx, ox + band, oy + band, BW - band * 2, BH - band * 2, Math.max(0, Ro - band));
    ctx.fillStyle = front;
    ctx.fill();
    fillScreen(ctx, src, sx, sy, sw, sh, Ri, o.fit);
    drawCutout(ctx, d, ox, oy, BW, BH, sx, sy, sw, sh, front);

    return landscape ? rotated(canvas, 1) : canvas;
  }

  // ---------- laptops, desktops, watch

  function laptop(src, o, d) {
    const ar = d.screen[0] / d.screen[1];
    const cw = Math.round(Math.min(o.maxDim / 1.12, d.screen[0]));
    const ch = Math.round(cw / ar);
    const bez = cw * 0.022;
    const SW = cw + bez * 2, SH = ch + bez * 2;
    const baseW = SW * 1.1, baseH = SW * 0.03;
    const metal = o.deviceColor;

    const { canvas, ctx } = makeCanvas(baseW + PAD * 2, SH + baseH + PAD * 2);
    const sx = PAD + (baseW - SW) / 2, sy = PAD;

    roundRectPath(ctx, sx, sy, SW, SH, [bez * 1.4, bez * 1.4, bez * 0.3, bez * 0.3]);
    ctx.fillStyle = shade(metal, -0.1);
    ctx.fill();
    const e = bez * 0.12;
    roundRectPath(ctx, sx + e, sy + e, SW - e * 2, SH - e, [bez * 1.3, bez * 1.3, 0, 0]);
    ctx.fillStyle = '#0b0b0d';
    ctx.fill();
    fillScreen(ctx, src, sx + bez, sy + bez, cw, ch, bez * 0.5, o.fit);
    if (d.notch) {
      const nw = cw * 0.105, nh = ch * 0.034, r = nh * 0.5;
      roundRectPath(ctx, sx + SW / 2 - nw / 2, sy + bez - r, nw, nh + r, r);
      ctx.fillStyle = '#0b0b0d';
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(sx + SW / 2, sy + bez / 2, bez * 0.14, 0, Math.PI * 2);
    ctx.fillStyle = '#26262b';
    ctx.fill();

    const bx = PAD, by = PAD + SH;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + baseW, by);
    ctx.lineTo(bx + baseW, by + baseH * 0.45);
    ctx.quadraticCurveTo(bx + baseW, by + baseH, bx + baseW - baseH * 1.6, by + baseH);
    ctx.lineTo(bx + baseH * 1.6, by + baseH);
    ctx.quadraticCurveTo(bx, by + baseH, bx, by + baseH * 0.45);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, by, 0, by + baseH);
    g.addColorStop(0, shade(metal, 0.3));
    g.addColorStop(0.35, metal);
    g.addColorStop(1, shade(metal, -0.45));
    ctx.fillStyle = g;
    ctx.fill();
    const nw = SW * 0.15, nh = baseH * 0.42;
    roundRectPath(ctx, bx + baseW / 2 - nw / 2, by, nw, nh, [0, 0, nh * 0.8, nh * 0.8]);
    ctx.fillStyle = shade(metal, -0.22);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(sx, by, SW, Math.max(1, baseH * 0.08));
    return canvas;
  }

  function desktop(src, o, d) {
    const ar = d.screen[0] / d.screen[1];
    const imac = d.style === 'imac';
    const DW = Math.round(Math.min(o.maxDim, d.screen[0]));
    const bez = DW * (imac ? 0.022 : 0.018);
    const sw = DW - bez * 2, sh = sw / ar;
    const chin = imac ? DW * 0.085 : 0;
    const PH = sh + bez * 2 + chin;
    const r = DW * 0.012;
    const standH = DW * 0.19, footH = DW * 0.012;
    const metal = o.deviceColor;

    const { canvas, ctx } = makeCanvas(DW + PAD * 2, PH + standH + PAD * 2);
    const x = PAD, y = PAD, cx = x + DW / 2;
    const standCol = imac ? shade(metal, 0.2) : '#c9cacc';

    // stand: neck behind the panel, then the foot
    const neckW = DW * (imac ? 0.2 : 0.16);
    const ng = ctx.createLinearGradient(0, y + PH, 0, y + PH + standH);
    ng.addColorStop(0, shade(standCol, -0.25));
    ng.addColorStop(0.25, standCol);
    ng.addColorStop(1, shade(standCol, -0.1));
    ctx.fillStyle = ng;
    ctx.beginPath();
    ctx.moveTo(cx - neckW / 2, y + PH - r);
    ctx.lineTo(cx + neckW / 2, y + PH - r);
    ctx.lineTo(cx + neckW * 0.62, y + PH + standH - footH);
    ctx.lineTo(cx - neckW * 0.62, y + PH + standH - footH);
    ctx.closePath();
    ctx.fill();
    roundRectPath(ctx, cx - DW * 0.17, y + PH + standH - footH, DW * 0.34, footH, footH / 2);
    ctx.fillStyle = shade(standCol, -0.15);
    ctx.fill();

    if (imac) {
      roundRectPath(ctx, x, y, DW, PH, r);
      ctx.fillStyle = metal;
      ctx.fill();
      roundRectPath(ctx, x, y, DW, sh + bez * 2, [r, r, 0, 0]);
      ctx.fillStyle = '#f1f1f2';
      ctx.fill();
    } else {
      roundRectPath(ctx, x, y, DW, PH, r);
      ctx.fillStyle = '#b9babd';
      ctx.fill();
      const e = DW * 0.003;
      roundRectPath(ctx, x + e, y + e, DW - e * 2, PH - e * 2, r - e);
      ctx.fillStyle = '#0b0b0d';
      ctx.fill();
    }
    fillScreen(ctx, src, x + bez, y + bez, sw, sh, 0, o.fit);
    return canvas;
  }

  function watch(src, o, d) {
    const ar = d.screen[1] / d.screen[0];
    const CW = Math.round(Math.min(o.maxDim / 2.4, 900));
    const CH = Math.round(CW * 1.2);
    const bandW = CW * 0.8, bandL = CW * 0.6;
    const crown = CW * 0.07;
    const metal = o.deviceColor;
    const { canvas, ctx } = makeCanvas(CW + crown + PAD * 2, CH + bandL * 2 + PAD * 2);
    const x = PAD, y = PAD + bandL, cx = x + CW / 2;
    const bandCol = shade(metal, isLight(metal) ? -0.25 : 0.12);

    [[y - bandL, 1], [y + CH, -1]].forEach(([by, dir]) => {
      const g = ctx.createLinearGradient(cx - bandW / 2, 0, cx + bandW / 2, 0);
      g.addColorStop(0, shade(bandCol, -0.15));
      g.addColorStop(0.5, bandCol);
      g.addColorStop(1, shade(bandCol, -0.15));
      ctx.fillStyle = g;
      roundRectPath(ctx, cx - bandW / 2, dir > 0 ? by : by - CH * 0.2, bandW, bandL + CH * 0.2, dir > 0 ? [bandW * 0.1, bandW * 0.1, 0, 0] : [0, 0, bandW * 0.1, bandW * 0.1]);
      ctx.fill();
    });

    roundRectPath(ctx, x + CW - crown * 0.3, y + CH * 0.26, crown * 1.2, CH * 0.15, crown * 0.4);
    ctx.fillStyle = shade(metal, -0.15);
    ctx.fill();
    roundRectPath(ctx, x + CW - crown * 0.4, y + CH * 0.5, crown * 0.8, CH * 0.2, crown * 0.3);
    ctx.fill();

    roundRectPath(ctx, x, y, CW, CH, CW * 0.34);
    ctx.fillStyle = metalGradient(ctx, x, CW, metal);
    ctx.fill();
    const e = CW * 0.04;
    roundRectPath(ctx, x + e, y + e, CW - e * 2, CH - e * 2, CW * 0.3);
    ctx.fillStyle = '#050506';
    ctx.fill();
    let sw = CW * 0.84, sh = sw * ar;
    if (sh > CH * 0.86) {
      sh = CH * 0.86;
      sw = sh / ar;
    }
    fillScreen(ctx, src, cx - sw / 2, y + (CH - sh) / 2, sw, sh, sw * 0.26, o.fit);
    return canvas;
  }

  // o: { radius, deviceColor, url, orientation, fit, maxDim }
  function build(id, src, o) {
    id = resolve(id);
    if (STYLES[id]) return ringStyle(src, o, STYLES[id]);
    if (id === 'browser-light') return browser(src, o, false);
    if (id === 'browser-dark') return browser(src, o, true);
    const d = device(id);
    if (!d) return none(src, o);
    switch (d.kind) {
      case 'phone':
      case 'tablet': return handheld(src, o, d);
      case 'laptop': return laptop(src, o, d);
      case 'desktop': return desktop(src, o, d);
      case 'watch': return watch(src, o, d);
      default: return none(src, o);
    }
  }

  MS.frames = { LIST, CATEGORIES, DEVICES, device, isDevice, canRotate, contentAspect, resolve, build };
})(window.MS);
