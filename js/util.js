window.MS = window.MS || {};

(function (MS) {
  'use strict';

  const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  function makeCanvas(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w));
    canvas.height = Math.max(1, Math.round(h));
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    return { canvas, ctx };
  }

  // r: number or [tl, tr, br, bl]
  function roundRectPath(ctx, x, y, w, h, r) {
    let [tl, tr, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
    const m = Math.min(w, h) / 2;
    tl = Math.max(0, Math.min(tl, m));
    tr = Math.max(0, Math.min(tr, m));
    br = Math.max(0, Math.min(br, m));
    bl = Math.max(0, Math.min(bl, m));
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    ctx.arcTo(x + w, y, x + w, y + h, tr);
    ctx.lineTo(x + w, y + h - br);
    ctx.arcTo(x + w, y + h, x, y + h, br);
    ctx.lineTo(x + bl, y + h);
    ctx.arcTo(x, y + h, x, y, bl);
    ctx.lineTo(x, y + tl);
    ctx.arcTo(x, y, x + w, y, tl);
    ctx.closePath();
  }

  // Draws src with anti-aliased rounded corners (destination-in mask instead of clip).
  function drawRounded(ctx, src, x, y, w, h, r) {
    if (r <= 0.5) {
      ctx.drawImage(src, x, y, w, h);
      return;
    }
    const t = makeCanvas(w, h);
    t.ctx.drawImage(src, 0, 0, t.canvas.width, t.canvas.height);
    t.ctx.globalCompositeOperation = 'destination-in';
    roundRectPath(t.ctx, 0, 0, t.canvas.width, t.canvas.height, r);
    t.ctx.fill();
    ctx.drawImage(t.canvas, x, y, w, h);
  }

  function maskRounded(ctx, x, y, w, h, r) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    roundRectPath(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.restore();
  }

  // ---------- colour helpers

  function hexToRgb(hex) {
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16) || 0;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToHex({ r, g, b }) {
    const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return '#' + c(r) + c(g) + c(b);
  }

  // amt -1..1: negative mixes towards black, positive towards white
  function shade(hex, amt) {
    const c = hexToRgb(hex);
    const t = amt < 0 ? 0 : 255;
    const p = Math.abs(amt);
    return rgbToHex({ r: c.r + (t - c.r) * p, g: c.g + (t - c.g) * p, b: c.b + (t - c.b) * p });
  }

  function rgba(hex, a) {
    const c = hexToRgb(hex);
    return `rgba(${c.r},${c.g},${c.b},${a})`;
  }

  function srcSize(src) {
    return { w: src.naturalWidth || src.width, h: src.naturalHeight || src.height };
  }

  // Draws src into (0,0,w,h) with object-fit: cover.
  function drawCover(ctx, src, w, h) {
    const s = srcSize(src);
    const k = Math.max(w / s.w, h / s.h);
    const dw = s.w * k, dh = s.h * k;
    ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }

  // Dominant, reasonably saturated colours of an image, as hex strings.
  function extractPalette(src, n) {
    const S = 48;
    const { ctx } = makeCanvas(S, S);
    ctx.drawImage(src, 0, 0, S, S);
    let data;
    try {
      data = ctx.getImageData(0, 0, S, S).data;
    } catch (e) {
      return ['#6d28d9', '#06b6d4', '#ec4899', '#f59e0b'].slice(0, n);
    }
    const buckets = new Map();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      let e = buckets.get(key);
      if (!e) buckets.set(key, (e = { r: 0, g: 0, b: 0, n: 0 }));
      e.r += r; e.g += g; e.b += b; e.n++;
    }
    const cands = Array.from(buckets.values())
      .map((e) => {
        const r = e.r / e.n, g = e.g / e.n, b = e.b / e.n;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const sat = mx === 0 ? 0 : (mx - mn) / mx;
        const light = mx / 255;
        return { r, g, b, score: e.n * (0.15 + sat * sat * 3) * (light < 0.12 ? 0.3 : 1) };
      })
      .sort((a, b) => b.score - a.score);

    const dist = (a, b) => Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
    const out = [];
    for (const c of cands) {
      if (out.every((o) => dist(o, c) > 70)) out.push(c);
      if (out.length === n) break;
    }
    const hex = out.map(rgbToHex);
    if (!hex.length) hex.push('#5b5b6b');
    while (hex.length < n) hex.push(shade(hex[hex.length - 1], hex.length % 2 ? 0.35 : -0.35));
    return hex;
  }

  // ---------- placeholder screenshots (shown until the user adds their own)

  function card(c, x, y, w, h) {
    c.save();
    c.shadowColor = 'rgba(20,20,40,0.07)';
    c.shadowBlur = 24;
    c.shadowOffsetY = 6;
    roundRectPath(c, x, y, w, h, 18);
    c.fillStyle = '#ffffff';
    c.fill();
    c.restore();
  }

  function placeholderWide() {
    const W = 1600, H = 1000;
    const { canvas, ctx: c } = makeCanvas(W, H);
    c.fillStyle = '#f5f6fa';
    c.fillRect(0, 0, W, H);
    c.textBaseline = 'middle';

    // sidebar
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 280, H);
    c.fillStyle = '#e9eaf0';
    c.fillRect(279, 0, 1, H);
    const logo = c.createLinearGradient(32, 36, 72, 76);
    logo.addColorStop(0, '#7c5cff');
    logo.addColorStop(1, '#00c2ff');
    roundRectPath(c, 32, 36, 40, 40, 12);
    c.fillStyle = logo;
    c.fill();
    c.fillStyle = '#16161d';
    c.font = `700 22px ${FONT}`;
    c.fillText('Nova', 86, 57);
    ['Overzicht', 'Campagnes', 'Doelgroepen', 'Rapporten', 'Instellingen'].forEach((t, i) => {
      const y = 140 + i * 52;
      if (i === 0) {
        roundRectPath(c, 20, y - 20, 240, 40, 10);
        c.fillStyle = '#efecff';
        c.fill();
      }
      roundRectPath(c, 36, y - 8, 16, 16, 4);
      c.fillStyle = i === 0 ? '#7c5cff' : '#c9cad6';
      c.fill();
      c.fillStyle = i === 0 ? '#3b2bb3' : '#5b5d6b';
      c.font = `${i === 0 ? 600 : 500} 17px ${FONT}`;
      c.fillText(t, 66, y);
    });

    // header
    c.fillStyle = '#16161d';
    c.font = `700 34px ${FONT}`;
    c.fillText('Goedemorgen, Sam', 330, 70);
    c.fillStyle = '#7b7d8c';
    c.font = `400 17px ${FONT}`;
    c.fillText('Dit gebeurde er deze week met je campagnes.', 330, 108);
    roundRectPath(c, W - 230, 50, 190, 46, 12);
    c.fillStyle = '#16161d';
    c.fill();
    c.fillStyle = '#ffffff';
    c.font = `600 16px ${FONT}`;
    c.textAlign = 'center';
    c.fillText('+ Nieuwe campagne', W - 135, 73);
    c.textAlign = 'left';

    // stat cards
    const stats = [['Bereik', '1,28M', '+12,4%'], ['Klikken', '48.210', '+8,1%'], ['Conversies', '3.904', '+21,7%']];
    const cw = (W - 330 - 40 - 2 * 24) / 3;
    stats.forEach(([label, value, delta], i) => {
      const x = 330 + i * (cw + 24), y = 150;
      card(c, x, y, cw, 150);
      c.fillStyle = '#7b7d8c';
      c.font = `500 16px ${FONT}`;
      c.fillText(label, x + 28, y + 38);
      c.fillStyle = '#16161d';
      c.font = `700 40px ${FONT}`;
      c.fillText(value, x + 28, y + 84);
      roundRectPath(c, x + 28, y + 108, 80, 26, 13);
      c.fillStyle = '#e3f8ec';
      c.fill();
      c.fillStyle = '#14a05a';
      c.font = `600 14px ${FONT}`;
      c.fillText(delta, x + 40, y + 121);
    });

    // line chart
    const cx = 330, cy = 330, chw = (W - 330 - 40) * 0.64, chh = 630;
    card(c, cx, cy, chw, chh);
    c.fillStyle = '#16161d';
    c.font = `600 20px ${FONT}`;
    c.fillText('Prestaties', cx + 28, cy + 44);
    c.strokeStyle = '#eef0f5';
    c.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = cy + 120 + i * 112;
      c.beginPath();
      c.moveTo(cx + 28, y);
      c.lineTo(cx + chw - 28, y);
      c.stroke();
    }
    const pts = [0.62, 0.55, 0.66, 0.48, 0.52, 0.38, 0.42, 0.3, 0.34, 0.22, 0.26, 0.14];
    const px = (i) => cx + 28 + (i * (chw - 56)) / (pts.length - 1);
    const py = (v) => cy + 120 + v * 448;
    const curve = () => {
      c.moveTo(px(0), py(pts[0]));
      for (let i = 1; i < pts.length; i++) {
        const mx = (px(i - 1) + px(i)) / 2;
        c.bezierCurveTo(mx, py(pts[i - 1]), mx, py(pts[i]), px(i), py(pts[i]));
      }
    };
    const area = c.createLinearGradient(0, cy + 120, 0, cy + chh - 40);
    area.addColorStop(0, 'rgba(124,92,255,0.28)');
    area.addColorStop(1, 'rgba(124,92,255,0)');
    c.beginPath();
    curve();
    c.lineTo(px(pts.length - 1), cy + chh - 40);
    c.lineTo(px(0), cy + chh - 40);
    c.closePath();
    c.fillStyle = area;
    c.fill();
    c.beginPath();
    curve();
    c.strokeStyle = '#7c5cff';
    c.lineWidth = 4;
    c.stroke();

    // channel bars
    const bx = cx + chw + 24, bw = W - 40 - bx;
    card(c, bx, cy, bw, chh);
    c.fillStyle = '#16161d';
    c.font = `600 20px ${FONT}`;
    c.fillText('Kanalen', bx + 28, cy + 44);
    [['Meta', 0.82, '#7c5cff'], ['Google', 0.64, '#00c2ff'], ['TikTok', 0.45, '#ff5c8a'], ['LinkedIn', 0.3, '#ffb020'], ['YouTube', 0.22, '#22c55e']]
      .forEach(([name, v, col], i) => {
        const y = cy + 110 + i * 98;
        c.fillStyle = '#3a3b47';
        c.font = `500 16px ${FONT}`;
        c.fillText(name, bx + 28, y);
        c.textAlign = 'right';
        c.fillStyle = '#7b7d8c';
        c.fillText(Math.round(v * 100) + '%', bx + bw - 28, y);
        c.textAlign = 'left';
        roundRectPath(c, bx + 28, y + 22, bw - 56, 12, 6);
        c.fillStyle = '#f0f1f6';
        c.fill();
        roundRectPath(c, bx + 28, y + 22, (bw - 56) * v, 12, 6);
        c.fillStyle = col;
        c.fill();
      });
    return canvas;
  }

  function placeholderTall() {
    const W = 1080, H = 2340;
    const { canvas, ctx: c } = makeCanvas(W, H);
    c.fillStyle = '#f5f6fa';
    c.fillRect(0, 0, W, H);
    c.textBaseline = 'middle';

    c.fillStyle = '#16161d';
    c.font = `600 40px ${FONT}`;
    c.fillText('9:41', 110, 92);
    roundRectPath(c, W - 190, 78, 70, 30, 9);
    c.fill();

    c.font = `800 84px ${FONT}`;
    c.fillText('Vandaag', 70, 300);
    c.fillStyle = '#7b7d8c';
    c.font = `500 36px ${FONT}`;
    c.fillText('Donderdag 16 oktober', 72, 380);

    const g = c.createLinearGradient(70, 450, 1010, 1000);
    g.addColorStop(0, '#7c5cff');
    g.addColorStop(1, '#00c2ff');
    roundRectPath(c, 70, 450, 940, 540, 56);
    c.fillStyle = g;
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.8)';
    c.font = `500 38px ${FONT}`;
    c.fillText('Totale omzet', 130, 545);
    c.fillStyle = '#ffffff';
    c.font = `800 110px ${FONT}`;
    c.fillText('€ 12.480', 124, 670);
    c.beginPath();
    const line = [0.7, 0.55, 0.62, 0.4, 0.48, 0.25, 0.3, 0.12];
    line.forEach((v, i) => {
      const x = 130 + i * 117, y = 780 + v * 160;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    });
    c.strokeStyle = '#ffffff';
    c.lineWidth = 8;
    c.lineJoin = 'round';
    c.stroke();

    c.fillStyle = '#16161d';
    c.font = `700 52px ${FONT}`;
    c.fillText('Activiteit', 70, 1110);
    [['Nieuwe bestelling', '2 min geleden', '+ € 84', '#7c5cff'],
      ['Campagne gestart', '18 min geleden', 'Meta', '#00c2ff'],
      ['Betaling ontvangen', '1 uur geleden', '+ € 1.240', '#22c55e'],
      ['Nieuwe klant', '3 uur geleden', 'Lisa', '#ff5c8a'],
      ['Rapport klaar', 'Gisteren', 'PDF', '#ffb020']].forEach(([title, sub, right, col], i) => {
      const y = 1180 + i * 190;
      card(c, 70, y, 940, 160);
      c.beginPath();
      c.arc(160, y + 80, 44, 0, Math.PI * 2);
      c.fillStyle = col;
      c.fill();
      c.fillStyle = '#16161d';
      c.font = `600 40px ${FONT}`;
      c.fillText(title, 236, y + 60);
      c.fillStyle = '#7b7d8c';
      c.font = `400 32px ${FONT}`;
      c.fillText(sub, 236, y + 108);
      c.textAlign = 'right';
      c.fillStyle = '#16161d';
      c.font = `700 38px ${FONT}`;
      c.fillText(right, 970, y + 80);
      c.textAlign = 'left';
    });

    c.fillStyle = '#ffffff';
    c.fillRect(0, H - 210, W, 210);
    c.fillStyle = '#e9eaf0';
    c.fillRect(0, H - 210, W, 2);
    [0, 1, 2, 3].forEach((i) => {
      roundRectPath(c, 150 + i * 240, H - 160, 60, 60, 18);
      c.fillStyle = i === 0 ? '#7c5cff' : '#d4d5de';
      c.fill();
    });
    roundRectPath(c, W / 2 - 180, H - 40, 360, 12, 6);
    c.fillStyle = '#16161d';
    c.fill();
    return canvas;
  }

  MS.util = {
    FONT,
    makeCanvas,
    roundRectPath,
    drawRounded,
    maskRounded,
    hexToRgb,
    rgbToHex,
    shade,
    rgba,
    srcSize,
    drawCover,
    extractPalette,
    makePlaceholder: (tall) => (tall ? placeholderTall() : placeholderWide()),
  };
})(window.MS);
