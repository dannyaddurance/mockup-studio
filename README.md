# Mockup Studio

Eigen mockup-tool, geïnspireerd op de functies van shots.so. Geen installatie of server nodig.

## Starten

Dubbelklik `index.html` (Chrome of Edge aanbevolen).

## Functies

- Media: tot 3 screenshots (Enkel, Duo, Trio, Stapel) via knop, slepen of plakken (Ctrl+V)
- Stijlen: Standaard, Glas licht/donker, Vloeibaar glas, Inzet licht/donker, Omlijning, Rand
- Apparaten met echte verhoudingen (behuizing in mm, schermresolutie), staand of liggend, scherm vullen of passend:
  - iPhone 17 Pro, 17 Pro Max, Air, 17, 16e, SE
  - Pixel 10 Pro, Galaxy S25 Ultra, Galaxy S25, Galaxy Tab S10
  - iPad Pro 13" en 11", iPad Air 11", iPad mini
  - MacBook Pro 14" en 16", MacBook Air 13", iMac 24", Studio Display
  - Laptop, Apple Watch, browser (licht/donker, eigen URL)
  - Per apparaat de bijbehorende kleuren
- Hoeken: Scherp, Gebogen, Rond, plus een radius-schuifje; mockup verbergen
- Schaduw: Geen, Spreiding, Strak, Adaptief (kleur uit je screenshot)
- Achtergrond: 16 verlopen, magic (kleurvlakken of vervaagd), effen kleur, eigen foto, transparant, ruis
- Effecten: overlay (raamlicht, 3D-vormen) en filters (VHS, glitch)
- Watermerk: eigen tekst, positie, licht/donker, dekking en grootte
- Layout: templates, zoom, positie (slepen in het canvas, Shift voor precisie), 3D-kanteling en perspectief
- Animeren: 5 presets, afspelen in de preview, video-export (MP4 of WebM, 1080p)
- Formaten: 16:9, 1:1, 4:5, 9:16, X, LinkedIn, Dribbble, OG en aangepast
- Export: PNG/JPG op 1×, 2× of 3×, of kopiëren naar het klembord
- Ongedaan maken/opnieuw (Ctrl+Z / Ctrl+Shift+Z), exporteren met Ctrl+S

## Structuur

| Bestand | Inhoud |
| --- | --- |
| `js/util.js` | Canvas- en kleurhelpers, paletextractie, voorbeeldscreenshots |
| `js/frames.js` | Stijlen en device frames, procedureel getekend |
| `js/backgrounds.js` | Verlopen, magic-achtergronden, ruis |
| `js/effects.js` | Vormen, raamlicht, VHS/glitch, watermerk |
| `js/animate.js` | Animatiepresets |
| `js/renderer.js` | WebGL-projectie (3D), multi-layouts en compositie |
| `js/app.js` | State, UI, geschiedenis, import/export, video |
| `js/vendor/` | [Mediabunny](https://github.com/Vanilagy/mediabunny) 1.61.0 (MPL-2.0, ongewijzigd) voor MP4/WebM-encoding |
