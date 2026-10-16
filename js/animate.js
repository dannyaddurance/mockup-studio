(function (MS) {
  'use strict';

  const PRESETS = [
    { id: 'zoom-in', name: 'Inzoomen' },
    { id: 'slide-up', name: 'Omhoog' },
    { id: 'tilt', name: 'Kantelen' },
    { id: 'orbit', name: 'Draaien' },
    { id: 'float', name: 'Zweven' },
  ];

  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  // State for time t (0..1) of an animation; only top-level numbers change,
  // so a shallow copy is enough.
  function frameState(base, preset, t) {
    const s = Object.assign({}, base);
    const wave = Math.sin(t * Math.PI * 2);
    switch (preset) {
      case 'zoom-in':
        s.scale = base.scale * (0.8 + 0.2 * easeInOut(t));
        break;
      case 'slide-up':
        s.offY = base.offY + 50 * (1 - easeOut(t));
        break;
      case 'tilt':
        s.rotY = base.rotY - 20 + 40 * easeInOut(t);
        s.rotX = base.rotX + 8;
        break;
      case 'orbit':
        s.rotY = base.rotY + 22 * wave;
        s.rotX = base.rotX + 8 * Math.cos(t * Math.PI * 2);
        break;
      case 'float':
        s.offY = base.offY + 2.5 * wave;
        s.rotZ = base.rotZ + 1.5 * Math.sin(t * Math.PI * 2 + 1);
        break;
    }
    return s;
  }

  function pickMime() {
    if (typeof MediaRecorder === 'undefined') return null;
    // H.264 High 4.0: Baseline 3.1 (avc1.42E01F) stops at 720p and records empty files at 1080p.
    return ['video/mp4;codecs=avc1.640028', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((m) =>
      MediaRecorder.isTypeSupported(m)
    ) || null;
  }

  MS.animate = { PRESETS, frameState, pickMime };
})(window.MS);
