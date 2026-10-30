(function () {
  'use strict';

  const { util, frames, backgrounds, animate, Projector, compose, slotCount } = window.MS;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const STORAGE_KEY = 'mockup-studio-state-v1';
  const MAX_SLOTS = 3;
  const VIDEO_PREVIEW_DIM = 1280; // mockup size while a video plays in the preview
  const VIDEO_EXPORT_DIM = 2048; // mockup size per frame of a video export
  const MAX_VIDEO_SECONDS = 120; // exports are kept in memory

  const SIZES = [
    { id: 'landscape', name: 'Liggend 16:9', w: 1920, h: 1080 },
    { id: 'square', name: 'Vierkant 1:1', w: 1080, h: 1080 },
    { id: 'portrait', name: 'Portret 4:5', w: 1080, h: 1350 },
    { id: 'story', name: 'Story 9:16', w: 1080, h: 1920 },
    { id: 'twitter', name: 'X / Twitter', w: 1600, h: 900 },
    { id: 'linkedin', name: 'LinkedIn', w: 1200, h: 627 },
    { id: 'dribbble', name: 'Dribbble 4:3', w: 1600, h: 1200 },
    { id: 'og', name: 'OG-afbeelding', w: 1200, h: 630 },
    { id: 'custom', name: 'Aangepast' },
  ];

  const DEVICE_COLORS = [
    { name: 'Zilver', hex: '#d5d6d8' },
    { name: 'Grafiet', hex: '#4a4a4f' },
    { name: 'Middernacht', hex: '#1f2430' },
    { name: 'Sterrenlicht', hex: '#e6ddcd' },
    { name: 'Blauw', hex: '#55667f' },
  ];

  const SOLID_COLORS = ['#0d0d0f', '#ffffff', '#f2f0eb', '#1e3a8a', '#7c5cff', '#ff6a88', '#14b8a6', '#facc15'];

  const CORNERS = [
    { name: 'Scherp', r: 0 },
    { name: 'Gebogen', r: 14 },
    { name: 'Rond', r: 40 },
  ];

  const SHADOWS = [
    { id: 'none', name: 'Geen', v: { mode: 'spread', opacity: 0, blur: 0, y: 0 } },
    { id: 'spread', name: 'Spreiding', v: { mode: 'spread', opacity: 0.35, blur: 90, y: 40 } },
    { id: 'hug', name: 'Strak', v: { mode: 'hug', opacity: 0.5, blur: 22, y: 10 } },
    { id: 'adaptive', name: 'Adaptief', v: { mode: 'adaptive', opacity: 0.6, blur: 110, y: 50 } },
  ];

  const LAYOUTS = [
    { id: 'single', name: 'Enkel' },
    { id: 'duo', name: 'Duo' },
    { id: 'trio', name: 'Trio' },
    { id: 'stack', name: 'Stapel' },
  ];

  const TEMPLATES = [
    { id: 'flat', name: 'Recht', patch: { rotX: 0, rotY: 0, rotZ: 0, scale: 0.78, offX: 0, offY: 0 } },
    { id: 'tilt-left', name: 'Kantel links', patch: { rotX: 8, rotY: 22, rotZ: 0, scale: 0.74, offX: 0, offY: 0 } },
    { id: 'tilt-right', name: 'Kantel rechts', patch: { rotX: 8, rotY: -22, rotZ: 0, scale: 0.74, offX: 0, offY: 0 } },
    { id: 'lean', name: 'Achterover', patch: { rotX: 24, rotY: 0, rotZ: 0, scale: 0.82, offX: 0, offY: 4 } },
    { id: 'iso', name: 'Isometrisch', patch: { rotX: 50, rotY: 0, rotZ: -40, scale: 0.9, offX: 0, offY: 0 } },
    { id: 'float', name: 'Zwevend', patch: { rotX: 12, rotY: -14, rotZ: 4, scale: 0.72, offX: 0, offY: 0 } },
    { id: 'hero', name: 'Hero', patch: { rotX: 0, rotY: 0, rotZ: 0, scale: 1.05, offX: 0, offY: 24 } },
    { id: 'corner', name: 'Hoek', patch: { rotX: 0, rotY: 0, rotZ: -8, scale: 0.95, offX: 16, offY: 16 } },
  ];

  const DEFAULT_STATE = {
    size: { preset: 'landscape', w: 1920, h: 1080 },
    layout: 'single',
    frame: 'browser-light',
    deviceColor: '#d5d6d8',
    url: 'jouwwebsite.nl',
    radius: 14,
    hideMockup: false,
    shadow: { mode: 'spread', opacity: 0.35, blur: 90, y: 40 },
    scale: 0.78,
    offX: 0,
    offY: 0,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    perspective: 2.5,
    orientation: 'portrait',
    fit: 'fill',
    bg: { type: 'gradient', preset: 'aurora', color: '#0d0d0f', noise: 0.06 },
    overlay: 'none',
    fx: 'none',
    watermark: { enabled: false, text: '@jouwmerk', position: 'br', theme: 'light', opacity: 0.85, size: 26 },
    anim: { preset: 'zoom-in', duration: 4 },
    export: { format: 'png', mult: 2 },
  };

  const FRAME_ICONS = {
    none: '<rect x="4" y="6" width="16" height="12" rx="2"/>',
    'glass-light': '<rect x="3" y="5" width="18" height="14" rx="3"/><rect x="6" y="8" width="12" height="8" rx="1"/>',
    'glass-dark': '<rect x="3" y="5" width="18" height="14" rx="3" fill="currentColor" fill-opacity=".35"/><rect x="6" y="8" width="12" height="8" rx="1"/>',
    'liquid-glass': '<rect x="3" y="5" width="18" height="14" rx="4"/><rect x="6.5" y="8.5" width="11" height="7" rx="1"/><path d="M5 8.5c.6-1.4 1.6-2 3-2" />',
    'inset-light': '<rect x="3" y="5" width="18" height="14" rx="2.5"/><rect x="6" y="8" width="12" height="8" rx=".8" stroke-dasharray="1.5 1.2"/>',
    'inset-dark': '<rect x="3" y="5" width="18" height="14" rx="2.5" fill="currentColor"/><rect x="6" y="8" width="12" height="8" rx=".8" stroke="#141417"/>',
    outline: '<rect x="3" y="5" width="18" height="14" rx="3" stroke-dasharray="2 1.5"/><rect x="5.5" y="7.5" width="13" height="9" rx="1.5"/>',
    border: '<rect x="4" y="6" width="16" height="12" rx="2" stroke-width="3"/>',
    'browser-light': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18"/><circle cx="5.8" cy="7" r=".5"/><circle cx="7.8" cy="7" r=".5"/>',
    'browser-dark': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2H3z" fill="currentColor"/>',
    phone: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M10.5 5.5h3"/>',
    tablet: '<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="4.7" r=".4"/>',
    laptop: '<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M2.5 18h19"/>',
  };
  const svg = (inner) =>
    `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

  // ---------- state

  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  }
  function setPath(obj, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    keys.reduce((o, k) => o[k], obj)[last] = value;
  }
  function parseVal(v) {
    return v !== '' && !isNaN(v) ? Number(v) : v;
  }
  function mergeDefaults(def, saved) {
    if (!saved || typeof saved !== 'object') return clone(def);
    const out = {};
    for (const k of Object.keys(def)) {
      if (def[k] && typeof def[k] === 'object') out[k] = mergeDefaults(def[k], saved[k]);
      else out[k] = typeof saved[k] === typeof def[k] ? saved[k] : def[k];
    }
    return out;
  }

  let state = clone(DEFAULT_STATE);
  try {
    state = mergeDefaults(DEFAULT_STATE, JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch (e) {
    /* storage unavailable: keep defaults */
  }
  state.frame = frames.resolve(state.frame);

  const assets = {
    media: new Array(MAX_SLOTS).fill(null), // HTMLImageElement or HTMLVideoElement
    urls: new Array(MAX_SLOTS).fill(null),
    thumbs: new Array(MAX_SLOTS).fill(null),
    ids: new Array(MAX_SLOTS).fill(0),
    counter: 0,
    bgImage: null,
    bgImageId: 0,
    placeholders: null,
  };
  const hasMedia = () => assets.media.some(Boolean);
  const isVideo = (src) => src instanceof HTMLVideoElement;
  const projector = new Projector();
  const preview = $('#preview');
  const pctx = preview.getContext('2d');
  let view = { disp: 1 };
  let pendingSlot = null;
  let playing = false;
  let recording = false;
  let videoPaused = false;

  // ---------- history

  const history = { stack: [], index: -1 };
  function persist(snap) {
    try {
      localStorage.setItem(STORAGE_KEY, snap);
    } catch (e) {
      /* ignore */
    }
  }
  function commit() {
    const snap = JSON.stringify(state);
    if (history.stack[history.index] === snap) return;
    history.stack = history.stack.slice(0, history.index + 1);
    history.stack.push(snap);
    if (history.stack.length > 100) history.stack.shift();
    history.index = history.stack.length - 1;
    persist(snap);
    updateHistoryButtons();
  }
  function restore(i) {
    history.index = i;
    state = JSON.parse(history.stack[i]);
    syncUI();
    requestRender();
    persist(history.stack[i]);
  }
  const undo = () => history.index > 0 && restore(history.index - 1);
  const redo = () => history.index < history.stack.length - 1 && restore(history.index + 1);
  function updateHistoryButtons() {
    $('#undoBtn').disabled = history.index <= 0;
    $('#redoBtn').disabled = history.index >= history.stack.length - 1;
  }

  // ---------- sources, mockups and background caches

  function currentSource(slot, st = state) {
    if (assets.media[slot]) return { src: assets.media[slot], id: 'media' + assets.ids[slot] };
    if (!assets.placeholders) {
      assets.placeholders = { wide: util.makePlaceholder(false), tall: util.makePlaceholder(true) };
    }
    const aspect = frames.contentAspect(st.frame, st.orientation);
    return aspect && aspect > 1.25
      ? { src: assets.placeholders.tall, id: 'ph-tall' }
      : { src: assets.placeholders.wide, id: 'ph-wide' };
  }

  const fullDim = () => Math.min(3200, Math.floor((projector.ok ? projector.maxTex : 4096) * 0.75));

  // A video mockup is rebuilt for every new frame, at maxDim (preview size by default).
  const mockCache = [];
  function getMock(slot, maxDim = VIDEO_PREVIEW_DIM, st = state) {
    const { src, id } = currentSource(slot, st);
    const video = isVideo(src);
    const dim = video ? Math.min(maxDim, fullDim()) : fullDim();
    const time = video ? src.currentTime : 0;
    const key = [id, st.frame, st.radius, st.deviceColor, st.url, st.orientation, st.fit].join('|');
    const hit = mockCache[slot];
    if (hit && hit.key === key && hit.time === time && hit.dim === dim) return hit.canvas;
    // identical sources share one canvas, so the GPU texture is reused too
    const twin = !video && mockCache.find((m) => m && m.key === key);
    const canvas = twin
      ? twin.canvas
      : frames.build(st.frame, src, {
          radius: st.radius,
          deviceColor: st.deviceColor,
          url: st.url,
          orientation: st.orientation,
          fit: st.fit,
          maxDim: dim,
        });
    if (hit && hit.video) projector.release(hit.canvas);
    mockCache[slot] = { key, canvas, video, time, dim };
    return canvas;
  }
  function getMocks(maxDim, st = state) {
    const n = slotCount(st.layout);
    return Array.from({ length: n }, (_, i) => getMock(i, maxDim, st));
  }
  const mocksKey = () => mockCache.slice(0, slotCount(state.layout)).map((m) => m && m.key).join('#') + state.layout;
  const getPalette = () => backgrounds.palette(currentSource(0));

  function buildBackground(RW, RH) {
    if (state.bg.type === 'transparent') return null;
    const c = util.makeCanvas(RW, RH);
    backgrounds.draw(c.ctx, RW, RH, state.bg, { source: currentSource(0), bgImage: assets.bgImage });
    return c.canvas;
  }

  let bgCache = { key: null, canvas: null };
  function getPreviewBackground(RW, RH) {
    const t = state.bg.type;
    const dep = t.startsWith('magic') ? currentSource(0).id : t === 'image' ? 'bg' + assets.bgImageId : '';
    const key = JSON.stringify(state.bg) + RW + 'x' + RH + dep;
    if (bgCache.key !== key) bgCache = { key, canvas: buildBackground(RW, RH) };
    return bgCache.canvas;
  }

  // ---------- preview rendering

  function layoutPreview() {
    const r = $('#canvasWrap').getBoundingClientRect();
    const W = state.size.w, H = state.size.h;
    const disp = Math.max(0.01, Math.min(r.width / W, r.height / H));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = Math.max(1, Math.floor(W * disp)), cssH = Math.max(1, Math.floor(H * disp));
    preview.style.width = cssW + 'px';
    preview.style.height = cssH + 'px';
    const pw = Math.round(cssW * dpr), ph = Math.round(cssH * dpr);
    if (preview.width !== pw || preview.height !== ph) {
      preview.width = pw;
      preview.height = ph;
    }
    view = { disp: cssW / W };
  }

  let rafPending = false;
  function requestRender() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      if (!playing) renderPreview(state);
    });
  }

  let thumbKey = null;
  function renderPreview(st) {
    layoutPreview();
    const RW = preview.width, RH = preview.height;
    const mocks = getMocks();
    pctx.clearRect(0, 0, RW, RH);
    compose(pctx, {
      RW, RH,
      W: state.size.w, H: state.size.h,
      s: RW / state.size.w,
      state: st, mocks,
      bg: getPreviewBackground(RW, RH),
      projector,
      palette: getPalette(),
    });
    const key = mocksKey();
    if (thumbKey !== key) {
      thumbKey = key;
      renderTemplateThumbs();
    }
  }

  function renderTemplateThumbs() {
    const mocks = getMocks();
    $$('[data-template]').forEach((el) => {
      const c = $('canvas', el);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#26262c';
      ctx.fillRect(0, 0, c.width, c.height);
      const t = TEMPLATES.find((x) => x.id === el.dataset.template);
      const st = Object.assign(clone(state), t.patch, {
        shadow: { mode: 'spread', opacity: 0.45, blur: 50, y: 24 },
        hideMockup: false, overlay: 'none', fx: 'none',
        watermark: Object.assign({}, state.watermark, { enabled: false }),
      });
      compose(ctx, { RW: c.width, RH: c.height, W: 1600, H: 1000, s: c.width / 1600, state: st, mocks, bg: null, projector });
    });
  }

  // ---------- export

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  async function exportImage(toClipboard) {
    const W = state.size.w, H = state.size.h;
    const format = toClipboard ? 'png' : state.export.format;
    let s = state.export.mult;
    const limit = projector.ok ? Math.min(projector.maxSize, 12000) : 12000;
    let clipped = false;
    if (Math.max(W, H) * s > limit) {
      s = limit / Math.max(W, H);
      clipped = true;
    }
    const RW = Math.round(W * s), RH = Math.round(H * s);
    const { canvas, ctx } = util.makeCanvas(RW, RH);
    if (format === 'jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, RW, RH);
    }
    compose(ctx, { RW, RH, W, H, s, state, mocks: getMocks(fullDim()), bg: buildBackground(RW, RH), projector, palette: getPalette() });
    requestRender();

    const blob = await new Promise((res) => canvas.toBlob(res, format === 'jpeg' ? 'image/jpeg' : 'image/png', 0.92));
    if (!blob) {
      toast('Exporteren mislukt');
      return;
    }
    if (toClipboard) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast('Gekopieerd naar klembord');
      } catch (e) {
        toast('Kopiëren wordt niet ondersteund in deze browser');
      }
      return;
    }
    download(blob, `mockup-${RW}x${RH}.${format === 'jpeg' ? 'jpg' : 'png'}`);
    toast(clipped ? `Gedownload (verkleind tot ${RW}×${RH}, max. van je GPU)` : `Gedownload: ${RW}×${RH}`);
  }

  // ---------- animation

  function playPreview() {
    if (playing || recording) return;
    const base = clone(state);
    const dur = animSeconds() * 1000;
    if (activeVideos().length) {
      seekVideos(activeVideos(), 0);
      videoPaused = false;
      syncVideos();
    }
    const start = performance.now();
    playing = true;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      renderPreview(animate.frameState(base, base.anim.preset, t));
      if (t < 1) requestAnimationFrame(tick);
      else {
        playing = false;
        requestRender();
      }
    };
    requestAnimationFrame(tick);
  }

  async function exportVideo() {
    if (recording || playing) return;
    const mime = animate.pickMime();
    const canEncode = !!window.Mediabunny && typeof VideoEncoder !== 'undefined';
    if (!mime && !canEncode) {
      toast('Video-export wordt niet ondersteund in deze browser');
      return;
    }
    const W = state.size.w, H = state.size.h;
    const s = Math.min(1, 1920 / Math.max(W, H));
    const RW = Math.round((W * s) / 2) * 2, RH = Math.round((H * s) / 2) * 2; // even sizes for H.264
    const { canvas, ctx } = util.makeCanvas(RW, RH);
    const base = clone(state);
    const bg = buildBackground(RW, RH);
    const palette = getPalette();
    const videos = activeVideos();
    const savedTimes = videos.map((v) => v.currentTime);
    const dur = animSeconds() * 1000;
    const draw = (t) => {
      ctx.fillStyle = '#000000'; // video has no alpha channel
      ctx.fillRect(0, 0, RW, RH);
      const mocks = getMocks(VIDEO_EXPORT_DIM, base);
      compose(ctx, { RW, RH, W, H, s: RW / W, state: animate.frameState(base, base.anim.preset, t), mocks, bg, projector, palette });
    };

    const record = async (type) => {
      await seekVideos(videos, 0);
      videos.forEach((v) => v.play().catch(() => {}));
      draw(0);
      const stream = canvas.captureStream(30);
      const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 16e6 });
      const chunks = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const stopped = new Promise((res) => (rec.onstop = res));
      rec.start(250);
      const start = performance.now();
      await new Promise((res) => {
        const tick = (now) => {
          const t = Math.min(1, (now - start) / dur);
          draw(t);
          $('#videoBtn').textContent = `Opnemen… ${Math.max(0, Math.ceil((dur - (now - start)) / 1000))} s`;
          if (t < 1) requestAnimationFrame(tick);
          else res();
        };
        requestAnimationFrame(tick);
      });
      await new Promise((r) => setTimeout(r, 200));
      rec.stop();
      await stopped;
      videos.forEach((v) => v.pause());
      stream.getTracks().forEach((t) => t.stop());
      return new Blob(chunks, { type: type.split(';')[0] });
    };

    // Frame-by-frame encoding with WebCodecs: every frame lands in the file,
    // however slow rendering is. Returns null when the browser cannot encode.
    const encode = async () => {
      const MB = window.Mediabunny;
      if (!MB || typeof VideoEncoder === 'undefined') return null;
      const size = { width: RW, height: RH };
      let codec, format, type;
      if (await MB.canEncodeVideo('avc', size)) {
        codec = 'avc';
        format = new MB.Mp4OutputFormat({ fastStart: 'in-memory' });
        type = 'video/mp4';
      } else if (await MB.canEncodeVideo('vp9', size)) {
        codec = 'vp9';
        format = new MB.WebMOutputFormat();
        type = 'video/webm';
      } else return null;
      const fps = 30;
      const total = Math.max(2, Math.round((dur / 1000) * fps));
      const output = new MB.Output({ format, target: new MB.BufferTarget() });
      const source = new MB.CanvasSource(canvas, { codec, bitrate: MB.QUALITY_HIGH });
      output.addVideoTrack(source, { frameRate: fps });
      await output.start();
      for (let i = 0; i < total; i++) {
        await seekVideos(videos, i / fps);
        draw(i / (total - 1));
        await source.add(i / fps, 1 / fps);
        if (i % 5 === 0) $('#videoBtn').textContent = `Renderen… ${Math.round((i / total) * 100)}%`;
      }
      await output.finalize();
      return { blob: new Blob([output.target.buffer], { type }), type };
    };

    recording = true;
    setVideoBusy(true);
    videos.forEach((v) => v.pause());
    let result = null;
    try {
      result = await encode();
    } catch (e) {
      console.warn('WebCodecs encoding failed, falling back to MediaRecorder', e);
    }
    if ((!result || !result.blob.size) && mime) {
      // Realtime fallback. Some software H.264 encoders silently deliver nothing; WebM is the second try.
      let used = mime;
      let blob = await record(mime);
      const webm = ['video/webm;codecs=vp9', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
      if (!blob.size && mime.includes('mp4') && webm) {
        used = webm;
        blob = await record(webm);
      }
      result = { blob, type: used };
    }
    await Promise.all(videos.map((v, i) => seekVideo(v, savedTimes[i])));
    recording = false;
    setVideoBusy(false);
    syncVideos();

    const blob = result ? result.blob : new Blob();
    if (!blob.size) {
      toast('Video-opname is mislukt: de browser leverde geen beelden');
      requestRender();
      return;
    }
    const ext = result.type.includes('mp4') ? 'mp4' : 'webm';
    download(blob, `mockup-${RW}x${RH}.${ext}`);
    toast(`Video gedownload (${ext.toUpperCase()}, ${RW}×${RH})`);
    requestRender();
  }

  function setVideoBusy(busy) {
    $('#videoBtn').disabled = busy;
    $('#playBtn').disabled = busy;
    if (!busy) $('#videoBtn').textContent = 'Video exporteren';
  }

  // ---------- video playback

  // Videos in the current layout; exports and the timeline only look at these.
  function activeVideos() {
    if (state.hideMockup) return [];
    return assets.media.slice(0, slotCount(state.layout)).filter(isVideo);
  }

  const longestVideo = (videos) => Math.max(...videos.map((v) => v.duration).filter(Number.isFinite), 0);

  // Length of an animation or export: the animation setting, or the video when there is one.
  function animSeconds() {
    const len = longestVideo(activeVideos());
    return len ? Math.min(MAX_VIDEO_SECONDS, len) : state.anim.duration;
  }

  // Shorter videos loop, so any time on the shared timeline is valid.
  function seekVideo(video, time) {
    const target = Math.min(time % video.duration, video.duration - 0.001);
    if (Math.abs(video.currentTime - target) < 0.001) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        video.removeEventListener('seeked', done);
        resolve();
      };
      const timer = setTimeout(done, 3000);
      video.addEventListener('seeked', done);
      video.currentTime = target;
    });
  }
  const seekVideos = (videos, time) => Promise.all(videos.map((v) => seekVideo(v, time)));

  function syncVideos() {
    if (recording) return;
    const active = activeVideos();
    assets.media.filter(isVideo).forEach((v) => {
      if (active.includes(v) && !videoPaused) v.paused && v.play().catch(() => {});
      else v.pause();
    });
    const len = longestVideo(active);
    $('#videoCtl').hidden = !active.length;
    $('#videoPauseBtn').textContent = videoPaused ? 'Afspelen' : 'Pauzeren';
    $('#videoSeek').max = len;
    if (!videoPaused) updateVideoTime(active);
    $('#animDuration').hidden = active.length > 0;
    $('#videoLenNote').hidden = !active.length;
    $('#videoLenNote').textContent =
      len > MAX_VIDEO_SECONDS
        ? `De export stopt na ${MAX_VIDEO_SECONDS} s; je video duurt ${Math.round(len)} s.`
        : `De duur volgt de video: ${Math.round(len)} s. Geluid wordt niet meegenomen.`;
  }

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  function updateVideoTime(active) {
    const video = active.find((v) => v.duration === longestVideo(active)) || active[0];
    if (!video) return;
    $('#videoSeek').value = video.currentTime;
    $('#videoTime').textContent = fmtTime(video.currentTime);
  }

  // Keeps the preview moving while a video plays, at most 30 times per second.
  let videoLoopOn = false;
  function startVideoLoop() {
    if (videoLoopOn) return;
    videoLoopOn = true;
    let last = 0;
    const tick = (now) => {
      if (!assets.media.some(isVideo)) {
        videoLoopOn = false;
        return;
      }
      requestAnimationFrame(tick);
      // 28 ms: every second frame on a 60 Hz display, whose timestamps jitter around 33.3 ms
      if (playing || recording || videoPaused || now - last < 28 || !activeVideos().length) return;
      last = now;
      renderPreview(state);
      updateVideoTime(activeVideos());
    };
    requestAnimationFrame(tick);
  }

  // ---------- media loading

  const isMediaType = (type) => type.startsWith('image/') || type.startsWith('video/');

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve({ img, url });
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Kan afbeelding niet laden'));
      };
      img.src = url;
    });
  }

  function loadVideo(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'auto';
      const fail = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Deze video kan de browser niet afspelen'));
      };
      video.onerror = fail;
      video.onloadeddata = async () => {
        video.onloadeddata = null;
        if (!video.videoWidth) return fail();
        // Browser recordings report no duration until they have been seeked to the end.
        if (video.duration === Infinity) {
          await new Promise((res) => {
            video.addEventListener('durationchange', res, { once: true });
            video.currentTime = 1e9;
            setTimeout(res, 3000);
          });
          await seekVideo(video, 0);
        }
        video.addEventListener('seeked', () => {
          if (!recording) requestRender();
        });
        resolve({ img: video, url });
      };
      video.src = url;
    });
  }

  function videoThumb(video) {
    const { canvas, ctx } = util.makeCanvas(160, 120);
    util.drawCover(ctx, video, 160, 120);
    return canvas.toDataURL('image/jpeg', 0.7);
  }

  // First empty slot of the current layout, otherwise the first slot.
  function targetSlot() {
    const n = slotCount(state.layout);
    for (let i = 0; i < n; i++) if (!assets.media[i]) return i;
    return 0;
  }

  async function setMedia(file, slot) {
    if (!file || !isMediaType(file.type)) {
      toast('Alleen afbeeldingen en video’s worden ondersteund');
      return;
    }
    if (recording) {
      toast('Wacht tot de video-export klaar is');
      return;
    }
    try {
      const video = file.type.startsWith('video/');
      const { img, url } = await (video ? loadVideo(file) : loadImage(file));
      const old = assets.media[slot];
      if (isVideo(old)) {
        old.pause();
        old.removeAttribute('src');
        old.load();
      }
      if (assets.urls[slot]) URL.revokeObjectURL(assets.urls[slot]);
      assets.media[slot] = img;
      assets.urls[slot] = url;
      assets.thumbs[slot] = video ? videoThumb(img) : url;
      assets.ids[slot] = ++assets.counter;
      if (video) {
        videoPaused = false;
        startVideoLoop();
      }
      const { w, h } = util.srcSize(img);
      const tall = h > w * 1.5;
      const aspect = frames.contentAspect(state.frame, state.orientation);
      if (slot === 0 && tall && (state.frame.startsWith('browser') || (aspect && aspect < 1))) {
        state.frame = 'iphone-17-pro';
        state.orientation = 'portrait';
        fixDeviceColor();
        deviceCat = 'iphone';
        toast('Staand formaat herkend: iPhone gekozen');
      }
      afterChange(true);
    } catch (e) {
      toast(e.message);
    }
  }

  async function setBackgroundImage(file) {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const { img } = await loadImage(file);
      assets.bgImage = img;
      assets.bgImageId++;
      state.bg.type = 'image';
      afterChange(true);
    } catch (e) {
      toast(e.message);
    }
  }

  // ---------- UI

  function fmt(v, kind) {
    switch (kind) {
      case 'pct': return Math.round(v * 100) + '%';
      case 'deg': return Math.round(v) + '°';
      case 'x': return Number(v).toFixed(2) + '×';
      case 's': return v + ' s';
      default: return String(v);
    }
  }

  const frameTile = (f) =>
    `<button class="tile" data-set="frame" data-value="${f.id}">${svg(FRAME_ICONS[f.id])}<span>${f.name}</span></button>`;

  // ---------- device picker

  let deviceCat = (frames.device(state.frame) || { cat: 'iphone' }).cat;
  const deviceColors = () => {
    const d = frames.device(state.frame);
    return d && d.colors ? d.colors : DEVICE_COLORS.map((c) => c.hex);
  };
  function fixDeviceColor() {
    const list = deviceColors();
    if (!list.some((c) => c.toLowerCase() === state.deviceColor.toLowerCase())) state.deviceColor = list[0];
  }

  // Small preview of each device, drawn with the same frame code.
  const thumbCache = new Map();
  function deviceThumb(d) {
    if (thumbCache.has(d.id)) return thumbCache.get(d.id);
    if (!assets.placeholders) {
      assets.placeholders = { wide: util.makePlaceholder(false), tall: util.makePlaceholder(true) };
    }
    const aspect = frames.contentAspect(d.id, 'portrait');
    const src = aspect && aspect > 1.25 ? assets.placeholders.tall : assets.placeholders.wide;
    const mock = frames.build(d.id, src, {
      radius: 14, deviceColor: (d.colors || ['#d5d6d8'])[0], url: '', orientation: 'portrait', fit: 'fill', maxDim: 360,
    });
    const S = 120;
    const { canvas, ctx } = util.makeCanvas(S, S);
    const k = Math.min((S * 0.86) / mock.width, (S * 0.86) / mock.height);
    ctx.drawImage(mock, (S - mock.width * k) / 2, (S - mock.height * k) / 2, mock.width * k, mock.height * k);
    const url = canvas.toDataURL();
    thumbCache.set(d.id, url);
    return url;
  }

  function renderDevicePicker() {
    $('#deviceCats').innerHTML = frames.CATEGORIES.map(
      (c) => `<button data-devcat="${c.id}" class="${c.id === deviceCat ? 'active' : ''}">${c.name}</button>`
    ).join('');
    $('#deviceGrid').innerHTML = frames.DEVICES.filter((d) => d.cat === deviceCat).map(
      (d) => `<button class="device" data-set="frame" data-value="${d.id}"><img src="${deviceThumb(d)}" alt=""><span>${d.name}</span></button>`
    ).join('');
  }

  function renderDeviceColors() {
    $('#deviceColors').innerHTML = deviceColors().map(
      (hex) => `<button class="swatch" data-set="deviceColor" data-value="${hex}" style="background:${hex}"></button>`
    ).join('');
  }

  function buildUI() {
    $('#styleGrid').innerHTML = frames.LIST.filter((f) => f.group === 'style').map(frameTile).join('');
    renderDevicePicker();

    $('#cornerChips').innerHTML = CORNERS.map((c) => `<button class="chip" data-set="radius" data-value="${c.r}">${c.name}</button>`).join('');
    $('#shadowChips').innerHTML = SHADOWS.map((s) => `<button class="chip" data-shadow="${s.id}">${s.name}</button>`).join('');
    $('#layoutChips').innerHTML = LAYOUTS.map((l) => `<button class="chip" data-set="layout" data-value="${l.id}">${l.name}</button>`).join('');
    $('#animChips').innerHTML = animate.PRESETS.map((p) => `<button class="chip" data-set="anim.preset" data-value="${p.id}">${p.name}</button>`).join('');

    $('#templateGrid').innerHTML = TEMPLATES.map(
      (t) => `<button class="tpl" data-template="${t.id}"><canvas width="240" height="150"></canvas><span>${t.name}</span></button>`
    ).join('');

    $('#sizeGrid').innerHTML = SIZES.map(
      (s) => `<button class="chip size" data-size="${s.id}"><b>${s.name}</b>${s.w ? `<small>${s.w}×${s.h}</small>` : ''}</button>`
    ).join('');

    $('#gradGrid').innerHTML = backgrounds.PRESETS.map(
      (p) => `<button class="grad" data-set="bg.preset" data-value="${p.id}" style="background-image:url(${backgrounds.thumb(p, 96, 96)})"></button>`
    ).join('');

    $('#solidSwatches').innerHTML = SOLID_COLORS.map(
      (c) => `<button class="swatch" data-set="bg.color" data-value="${c}" style="background:${c}"></button>`
    ).join('');

    $$('.slider').forEach((el) => {
      const d = el.dataset;
      el.innerHTML = `<div class="slider-head" title="Dubbelklik om te resetten"><span>${d.label}</span><output></output></div>
        <input type="range" min="${d.min}" max="${d.max}" step="${d.step}">`;
    });
  }

  function renderSlots() {
    const n = slotCount(state.layout);
    const names = ['Hoofd', '2', '3'];
    $('#slots').innerHTML = Array.from({ length: n }, (_, i) => {
      const url = assets.thumbs[i];
      const inner = url ? `<img src="${url}" alt="">` : '<span class="plus">+</span>';
      const badge = isVideo(assets.media[i]) ? '<i class="slot-badge">▶</i>' : '';
      return `<button class="slot${url ? ' filled' : ''}" data-slot="${i}" title="Afbeelding of video ${i + 1} kiezen">${inner}${badge}<small>${names[i]}</small></button>`;
    }).join('');
  }

  function updateSlider(el) {
    const v = getPath(state, el.dataset.bind);
    const input = $('input', el);
    if (document.activeElement !== input) input.value = v;
    $('output', el).textContent = fmt(v, el.dataset.fmt);
  }

  function syncUI() {
    renderDeviceColors();
    $$('[data-devcat]').forEach((el) => el.classList.toggle('active', el.dataset.devcat === deviceCat));
    $$('.slider').forEach(updateSlider);
    $$('[data-set]').forEach((el) =>
      el.classList.toggle('active', String(getPath(state, el.dataset.set)).toLowerCase() === el.dataset.value.toLowerCase())
    );
    $$('[data-toggle]').forEach((el) => el.classList.toggle('on', !!getPath(state, el.dataset.toggle)));
    $$('[data-size]').forEach((el) => el.classList.toggle('active', state.size.preset === el.dataset.size));
    $$('[data-shadow]').forEach((el) => {
      const id = el.dataset.shadow;
      const cur = state.shadow;
      el.classList.toggle('active', id === 'none' ? cur.opacity === 0 : cur.opacity > 0 && cur.mode === id);
    });
    $$('[data-template]').forEach((el) => {
      const p = TEMPLATES.find((t) => t.id === el.dataset.template).patch;
      el.classList.toggle('active', Object.keys(p).every((k) => state[k] === p[k]));
    });

    const tab = state.bg.type.startsWith('magic') ? 'magic' : state.bg.type;
    $$('[data-bgtab]').forEach((el) => el.classList.toggle('active', el.dataset.bgtab === tab));
    $$('[data-pane]').forEach((el) => (el.hidden = el.dataset.pane !== tab));

    if (document.activeElement !== $('#urlInput')) $('#urlInput').value = state.url;
    if (document.activeElement !== $('#wmText')) $('#wmText').value = state.watermark.text;
    $('#colorInput').value = state.bg.color;
    $('#customW').value = state.size.w;
    $('#customH').value = state.size.h;
    $('#customSize').hidden = state.size.preset !== 'custom';

    const isDevice = frames.isDevice(state.frame);
    $('#deviceColorRow').hidden = !isDevice;
    $('#orientRow').hidden = !frames.canRotate(state.frame);
    $('#fitRow').hidden = !isDevice;
    $('#urlRow').hidden = !state.frame.startsWith('browser');
    $('#cornerRow').hidden = isDevice;
    $('#noiseSlider').hidden = state.bg.type === 'transparent';
    $('#jpegNote').hidden = !(state.bg.type === 'transparent' && state.export.format === 'jpeg');
    $('#wmOptions').hidden = !state.watermark.enabled;

    preview.classList.toggle('checker', state.bg.type === 'transparent');
    $('#addPill').hidden = hasMedia();
    $('#sizeLabel').textContent = `${state.size.w} × ${state.size.h}`;
    $('#exportDims').textContent = `${state.size.w * state.export.mult} × ${state.size.h * state.export.mult} px`;
    renderSlots();
    syncVideos();
    updateHistoryButtons();
  }

  function afterChange(commitNow) {
    syncUI();
    requestRender();
    if (commitNow) commit();
  }

  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function bindText(sel, path) {
    $(sel).addEventListener('input', (e) => {
      setPath(state, path, e.target.value);
      requestRender();
    });
    $(sel).addEventListener('change', () => commit());
  }

  function bindEvents() {
    $$('.slider').forEach((el) => {
      const input = $('input', el);
      input.addEventListener('input', () => {
        setPath(state, el.dataset.bind, parseFloat(input.value));
        $('output', el).textContent = fmt(parseFloat(input.value), el.dataset.fmt);
        if (el.dataset.bind === 'radius') syncUI();
        requestRender();
      });
      input.addEventListener('change', () => afterChange(true));
      $('.slider-head', el).addEventListener('dblclick', () => {
        setPath(state, el.dataset.bind, getPath(DEFAULT_STATE, el.dataset.bind));
        afterChange(true);
      });
    });

    document.addEventListener('click', (e) => {
      const slot = e.target.closest('[data-slot]');
      if (slot) {
        pendingSlot = Number(slot.dataset.slot);
        $('#fileInput').click();
        return;
      }
      const cat = e.target.closest('[data-devcat]');
      if (cat) {
        deviceCat = cat.dataset.devcat;
        renderDevicePicker();
        syncUI();
        return;
      }
      const set = e.target.closest('[data-set]');
      if (set) {
        setPath(state, set.dataset.set, parseVal(set.dataset.value));
        if (set.dataset.set === 'frame') fixDeviceColor();
        afterChange(true);
        return;
      }
      const toggle = e.target.closest('[data-toggle]');
      if (toggle) {
        setPath(state, toggle.dataset.toggle, !getPath(state, toggle.dataset.toggle));
        afterChange(true);
        return;
      }
      const size = e.target.closest('[data-size]');
      if (size) {
        const s = SIZES.find((x) => x.id === size.dataset.size);
        state.size.preset = s.id;
        if (s.w) {
          state.size.w = s.w;
          state.size.h = s.h;
        }
        afterChange(true);
        return;
      }
      const shadow = e.target.closest('[data-shadow]');
      if (shadow) {
        state.shadow = clone(SHADOWS.find((s) => s.id === shadow.dataset.shadow).v);
        afterChange(true);
        return;
      }
      const tpl = e.target.closest('[data-template]');
      if (tpl) {
        Object.assign(state, TEMPLATES.find((t) => t.id === tpl.dataset.template).patch);
        afterChange(true);
        return;
      }
      const tab = e.target.closest('[data-bgtab]');
      if (tab) {
        const t = tab.dataset.bgtab;
        if (t === 'magic') {
          if (!state.bg.type.startsWith('magic')) state.bg.type = 'magic-mesh';
        } else if (t === 'image' && !assets.bgImage) {
          $('#bgFileInput').click();
          return;
        } else {
          state.bg.type = t;
        }
        afterChange(true);
      }
    });

    bindText('#urlInput', 'url');
    bindText('#wmText', 'watermark.text');

    $('#colorInput').addEventListener('input', (e) => {
      state.bg.color = e.target.value;
      state.bg.type = 'solid';
      requestRender();
    });
    $('#colorInput').addEventListener('change', () => afterChange(true));

    ['#customW', '#customH'].forEach((sel) =>
      $(sel).addEventListener('change', () => {
        state.size.w = clamp(Math.round(Number($('#customW').value) || 1920), 200, 6000);
        state.size.h = clamp(Math.round(Number($('#customH').value) || 1080), 200, 6000);
        state.size.preset = 'custom';
        afterChange(true);
      })
    );

    // files
    const openPicker = () => {
      pendingSlot = null;
      $('#fileInput').click();
    };
    $('#uploadBtn').addEventListener('click', openPicker);
    $('#addPill').addEventListener('click', openPicker);
    $('#fileInput').addEventListener('change', (e) => {
      setMedia(e.target.files[0], pendingSlot ?? targetSlot());
      pendingSlot = null;
      e.target.value = '';
    });
    $('#videoPauseBtn').addEventListener('click', () => {
      videoPaused = !videoPaused;
      syncVideos();
    });
    // Dragging the timeline pauses, so a frame can be picked for a still export.
    $('#videoSeek').addEventListener('input', (e) => {
      const time = Number(e.target.value);
      if (!videoPaused) {
        videoPaused = true;
        syncVideos();
      }
      $('#videoTime').textContent = fmtTime(time);
      seekVideos(activeVideos(), time);
    });
    $('#bgUploadBtn').addEventListener('click', () => $('#bgFileInput').click());
    $('#bgFileInput').addEventListener('change', (e) => {
      setBackgroundImage(e.target.files[0]);
      e.target.value = '';
    });

    document.addEventListener('paste', (e) => {
      const item = Array.from(e.clipboardData ? e.clipboardData.items : []).find((i) => isMediaType(i.type));
      if (item) {
        e.preventDefault();
        setMedia(item.getAsFile(), targetSlot());
      }
    });

    let dragDepth = 0;
    window.addEventListener('dragenter', (e) => {
      if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes('Files')) return;
      dragDepth++;
      document.body.classList.add('dragover');
    });
    window.addEventListener('dragleave', () => {
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) document.body.classList.remove('dragover');
    });
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dragDepth = 0;
      document.body.classList.remove('dragover');
      const files = Array.from(e.dataTransfer.files).filter((f) => isMediaType(f.type));
      const n = slotCount(state.layout);
      if (files.length > 1) files.slice(0, n).forEach((f, i) => setMedia(f, i));
      else if (files[0]) setMedia(files[0], targetSlot());
    });

    // drag the mockup; hold Shift for precision
    let drag = null;
    preview.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, y: e.clientY, offX: state.offX, offY: state.offY };
      preview.setPointerCapture(e.pointerId);
      preview.classList.add('dragging');
    });
    preview.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const k = e.shiftKey ? 0.2 : 1;
      const dx = ((e.clientX - drag.x) / (state.size.w * view.disp)) * 100 * k;
      const dy = ((e.clientY - drag.y) / (state.size.h * view.disp)) * 100 * k;
      state.offX = clamp(Math.round((drag.offX + dx) * 10) / 10, -60, 60);
      state.offY = clamp(Math.round((drag.offY + dy) * 10) / 10, -60, 60);
      $$('.slider[data-bind="offX"], .slider[data-bind="offY"]').forEach(updateSlider);
      requestRender();
    });
    const endDrag = () => {
      if (!drag) return;
      drag = null;
      preview.classList.remove('dragging');
      afterChange(true);
    };
    preview.addEventListener('pointerup', endDrag);
    preview.addEventListener('pointercancel', endDrag);

    // toolbar
    $('#undoBtn').addEventListener('click', undo);
    $('#redoBtn').addEventListener('click', redo);
    $('#resetBtn').addEventListener('click', () => {
      state = clone(DEFAULT_STATE);
      afterChange(true);
    });
    $('#exportBtn').addEventListener('click', () => exportImage(false));
    $('#exportBtnTop').addEventListener('click', () => exportImage(false));
    $('#copyBtn').addEventListener('click', () => exportImage(true));
    $('#playBtn').addEventListener('click', playPreview);
    $('#videoBtn').addEventListener('click', exportVideo);

    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input[type=text], input[type=number]')) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && key === 'y') {
        e.preventDefault();
        redo();
      } else if (mod && key === 's') {
        e.preventDefault();
        exportImage(false);
      }
    });

    new ResizeObserver(requestRender).observe($('#stage'));
  }

  buildUI();
  bindEvents();
  syncUI();
  commit();
  requestRender();
  if (!projector.ok) toast('WebGL niet beschikbaar: alleen 2D-rotatie');
  if (!animate.pickMime() && !(window.Mediabunny && typeof VideoEncoder !== 'undefined')) {
    $('#videoBtn').title = 'Niet ondersteund in deze browser';
  }

  // exposed for debugging and automated checks
  window.MS.app = {
    get state() { return state; },
    exportImage,
    exportVideo,
    setMedia,
  };
})();
