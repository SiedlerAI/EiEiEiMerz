/* =========================================================================
   Eier-Fang im Bundestag
   - Eier fallen von oben, mit dem Kopf (Plattform) auffangen.
   - Gefangen = +1 Punkt, verpasst = +1 Strike. 3 Strikes -> Game Over.
   - Schwierigkeit steigt progressiv; Musik & Color-Grading ziehen mit.
   ========================================================================= */

(() => {
  'use strict';

  // ---------- Canvas ----------
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- DOM ----------
  const hud = document.getElementById('hud');
  const scoreEl = document.getElementById('score');
  const levelEl = document.getElementById('level');
  const strikeDots = Array.from(document.querySelectorAll('.strike-dot'));
  const startScreen = document.getElementById('startScreen');
  const overScreen = document.getElementById('overScreen');
  const finalScoreEl = document.getElementById('finalScore');
  const bestScoreEl = document.getElementById('bestScore');
  const overTitleEl = document.getElementById('overTitle');

  // Zufällige Game-Over-Sprüche
  const GAMEOVER_TEXTS = [
    'Olaf sagt nein', 'YOU lost', 'Game over', 'gemerzt', 'Merz mag dich',
    'Verloren', 'Buh!', 'Nix wird’s', 'Eier kaputt',
  ];
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');

  // ---------- Head image (Plattform) ----------
  const headImg = new Image();
  let headReady = false;
  headImg.onload = () => { headReady = true; };
  headImg.onerror = () => { headReady = false; };
  headImg.src = 'assets/head.png'; // wird durch den echten Freisteller ersetzt

  // Power-Form ab Score 50 (zweiter Freisteller mit Feuer/Blitz). Fehlt die
  // Datei, bleibt der normale Kopf – Schrei & Buh-Rufe funktionieren trotzdem.
  const headImg2 = new Image();
  let headReady2 = false;
  headImg2.onload = () => { headReady2 = true; };
  headImg2.onerror = () => { headReady2 = false; };
  headImg2.src = 'assets/head2.png';
  // Kopf-Kreis innerhalb von head2.png (Anteile der Bildmaße) – damit der Kopf
  // exakt auf der Spiel-Hitbox sitzt und die Effekte drumherum ragen dürfen.
  const HEAD2_FX = 0.5898, HEAD2_FY = 0.2912, HEAD2_FR = 0.2335;

  // "Feucht"-Form ab Score 25 (dritter Freisteller, head3.png). Fehlt die Datei,
  // bleibt der normale Kopf. Kopf-Kreis-Anteile werden gesetzt, sobald das Bild
  // vorliegt (vorerst portrait-ähnliche Defaults wie head.png).
  const headImg3 = new Image();
  let headReady3 = false;
  headImg3.onload = () => { headReady3 = true; };
  headImg3.onerror = () => { headReady3 = false; };
  headImg3.src = 'assets/head3.png';
  let HEAD3_FX = 0.524, HEAD3_FY = 0.32, HEAD3_FR = 0.19;

  // Schilder-Motive für manche Demonstranten (zugeschnitten als Poster).
  const signCdu = new Image(); let signCduReady = false;
  signCdu.onload = () => { signCduReady = true; }; signCdu.src = 'assets/sign_cdu.png';
  const signEi = new Image(); let signEiReady = false;
  signEi.onload = () => { signEiReady = true; }; signEi.src = 'assets/sign_ei.png';

  // ---------- Color grading: Palettenstufen ----------
  // Jede Stufe wird mit der nächsten interpoliert, je nach Level.
  const PALETTES = [
    { skyTop:'#bcd4ec', skyBot:'#e9f1f8', building:'#c9cdd4', stone:'#b6bbc4', accent:'#8e96a3', tint:[120,160,210,0.05], filter:'saturate(1) hue-rotate(0deg) contrast(1)' },
    { skyTop:'#9fb8dd', skyBot:'#e7d8c0', building:'#c2c0bd', stone:'#aeaba6', accent:'#8a8784', tint:[255,200,120,0.07], filter:'saturate(1.08) hue-rotate(-6deg) contrast(1.03)' },
    { skyTop:'#7a86c8', skyBot:'#f0b27a', building:'#b8a99a', stone:'#9c8d7d', accent:'#7d6f60', tint:[255,150,80,0.10], filter:'saturate(1.18) hue-rotate(-12deg) contrast(1.06)' },
    { skyTop:'#5b4b96', skyBot:'#e8743b', building:'#a07f6c', stone:'#80604d', accent:'#5e4436', tint:[255,90,60,0.14], filter:'saturate(1.3) hue-rotate(-20deg) contrast(1.1)' },
    { skyTop:'#2b2350', skyBot:'#c0392b', building:'#7a4a44', stone:'#5a322e', accent:'#3c1f1c', tint:[255,40,50,0.20], filter:'saturate(1.45) hue-rotate(-30deg) contrast(1.18) brightness(.95)' },
    { skyTop:'#150b2e', skyBot:'#7d1020', building:'#4d262c', stone:'#36161b', accent:'#220c0f', tint:[255,20,40,0.26], filter:'saturate(1.6) hue-rotate(-40deg) contrast(1.28) brightness(.88)' },
  ];

  function lerp(a, b, t) { return a + (b - a) * t; }
  function hexToRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mixHex(h1, h2, t) {
    const a = hexToRgb(h1), b = hexToRgb(h2);
    return `rgb(${Math.round(lerp(a[0],b[0],t))},${Math.round(lerp(a[1],b[1],t))},${Math.round(lerp(a[2],b[2],t))})`;
  }
  // aktuelle, interpolierte Palette
  let pal = {};
  function updatePalette(level) {
    const f = Math.min((level - 1) / 3, PALETTES.length - 1); // 3 = wie schnell die Stimmung kippt
    const i = Math.min(Math.floor(f), PALETTES.length - 2);
    const t = f - i;
    const A = PALETTES[i], B = PALETTES[i + 1];
    pal = {
      skyTop: mixHex(A.skyTop, B.skyTop, t),
      skyBot: mixHex(A.skyBot, B.skyBot, t),
      building: mixHex(A.building, B.building, t),
      stone: mixHex(A.stone, B.stone, t),
      accent: mixHex(A.accent, B.accent, t),
      tint: [
        Math.round(lerp(A.tint[0], B.tint[0], t)),
        Math.round(lerp(A.tint[1], B.tint[1], t)),
        Math.round(lerp(A.tint[2], B.tint[2], t)),
        lerp(A.tint[3], B.tint[3], t),
      ],
    };
    // grober CSS-Filter-Sprung pro Stufe (sanft via transition)
    canvas.style.filter = (t < 0.5 ? A.filter : B.filter);
  }

  // =========================================================================
  // Audio-Engine (prozedural, passt sich dem Level an)
  // =========================================================================
  const Audio = (() => {
    let actx = null, master = null, started = false;
    let stepTimer = null, step = 0;
    let booTimer = null;
    let intensity = 1;

    // Tonleitern werden mit dem Level "dunkler"/intensiver
    const SCALES = [
      [0, 2, 4, 7, 9],        // Dur-Pentatonik (entspannt)
      [0, 2, 3, 5, 7, 10],    // Moll
      [0, 1, 4, 5, 7, 8],     // phrygisch-dominant (gespannt)
      [0, 1, 3, 6, 7, 9],     // verminderter Touch (bedrohlich)
    ];
    const ROOT = 220; // A3

    function init() {
      if (actx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      actx = new AC();
      master = actx.createGain();
      master.gain.value = 0.0;
      master.connect(actx.destination);
    }

    function noteHz(scale, idx) {
      const s = scale[((idx % scale.length) + scale.length) % scale.length];
      const oct = Math.floor(idx / scale.length);
      return ROOT * Math.pow(2, (s + 12 * oct) / 12);
    }

    function blip(freq, dur, type, gain, when) {
      const o = actx.createOscillator();
      const g = actx.createGain();
      const filt = actx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 800 + intensity * 1400;
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(gain, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.connect(filt); filt.connect(g); g.connect(master);
      o.start(when);
      o.stop(when + dur + 0.05);
    }

    function tick() {
      if (!actx) return;
      const lvl = Math.max(0, Math.min(SCALES.length - 1, Math.floor(intensity) - 1));
      const scale = SCALES[lvl];
      const now = actx.currentTime;

      // Bass jeden 4. Schritt
      if (step % 4 === 0) {
        blip(noteHz(scale, 0) / 2, 0.35, 'triangle', 0.28, now);
      }
      // Arpeggio
      const seq = [0, 2, 4, 3, 5, 4, 2, 1];
      const idx = seq[step % seq.length] + (step % 16 >= 8 ? 2 : 0);
      blip(noteHz(scale, idx), 0.18, intensity > 3 ? 'sawtooth' : 'square', 0.12, now + 0.01);
      // Hi-Hat-artiges Klicken bei höherer Intensität
      if (intensity >= 2 && step % 2 === 1) {
        blip(6000 + Math.random() * 2000, 0.04, 'square', 0.03, now);
      }
      step++;
    }

    function tempoMs() {
      // schneller bei höherer Intensität: 360ms -> 150ms
      return Math.max(150, 380 - intensity * 45);
    }

    function reschedule() {
      if (stepTimer) clearInterval(stepTimer);
      stepTimer = setInterval(tick, tempoMs());
    }

    // ---- Rausch-Puffer (für Raaar-Schrei) ----
    function makeNoise(dur) {
      const len = Math.max(1, Math.floor(actx.sampleRate * dur));
      const buf = actx.createBuffer(1, len, actx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      return buf;
    }

    // ---- "Buuh"-Rufe aus dem Publikum ----
    // Eine einzelne Stimme: "buuuh" – fallende Tonhöhe, Vokal über zwei
    // Formanten (u -> uh), etwas Atem-/Murmel-Rauschen und ein sanfter
    // Crowd-Swell statt hartem Anschlag => etwas realistischer.
    function booVoice(when, f0, dur, gain) {
      const o = actx.createOscillator();
      const o2 = actx.createOscillator();
      o.type = 'sawtooth'; o2.type = 'sawtooth';
      o.frequency.setValueAtTime(f0 * 1.1, when);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.9, when + dur);
      o2.frequency.setValueAtTime(f0 * 1.1 * 1.008, when);      // Schwebung -> "Menge"
      o2.frequency.exponentialRampToValueAtTime(f0 * 0.9 * 1.008, when + dur);
      const f1 = actx.createBiquadFilter(); f1.type = 'lowpass';  f1.frequency.value = 430; f1.Q.value = 4;
      const f2 = actx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1000; f2.Q.value = 1.2;
      const f2g = actx.createGain(); f2g.gain.value = 0.5;
      const g = actx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(gain, when + 0.10);    // sanfter Swell
      g.gain.setValueAtTime(gain, when + dur * 0.55);
      g.gain.exponentialRampToValueAtTime(0.0006, when + dur);   // "...uh"
      o.connect(f1); o2.connect(f1); f1.connect(g);
      o.connect(f2); o2.connect(f2); f2.connect(f2g); f2g.connect(g);
      // Atem-/Murmel-Rauschen
      const n = actx.createBufferSource(); n.buffer = makeNoise(dur);
      const nf = actx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 700; nf.Q.value = 0.6;
      const ng = actx.createGain();
      ng.gain.setValueAtTime(0.0001, when);
      ng.gain.exponentialRampToValueAtTime(gain * 0.22, when + 0.12);
      ng.gain.exponentialRampToValueAtTime(0.0004, when + dur);
      n.connect(nf); nf.connect(ng); ng.connect(g);
      g.connect(master);
      o.start(when); o2.start(when); n.start(when);
      o.stop(when + dur + 0.05); o2.stop(when + dur + 0.05); n.stop(when + dur + 0.05);
    }

    function boo() {
      if (!actx || !started) return;
      const now = actx.currentTime + 0.02;
      const voices = Math.min(7, 1 + Math.floor(intensity));        // Menge wächst mit Level
      for (let v = 0; v < voices; v++) {
        const f0 = 92 + Math.random() * 80;
        const dur = 0.7 + Math.random() * 0.6;
        const gain = 0.085 + Math.random() * 0.05;
        booVoice(now + Math.random() * 0.3, f0, dur, gain);        // breiterer Versatz = Crowd
      }
    }

    function booIntervalMs() {
      // selten am Anfang, immer häufiger: ~9s (Lvl1) -> ~1.1s (hoch)
      return Math.max(1100, 9000 - intensity * 1100);
    }
    let onBoo = null;        // Callback, den das Spiel pro Buh aufruft
    function rescheduleBoo() {
      if (booTimer) clearTimeout(booTimer);
      const next = booIntervalMs() * (0.65 + Math.random() * 0.7);
      booTimer = setTimeout(() => { boo(); if (onBoo) onBoo(); rescheduleBoo(); }, next);
    }

    // ---- "RAAAR"-Kraftschrei (einmalig bei Score 50) ----
    function roar() {
      if (!actx) return;
      if (actx.state === 'suspended') actx.resume();
      const now = actx.currentTime + 0.02;
      const dur = 1.1;
      // Verzerrung für "Kraft"
      const shaper = actx.createWaveShaper();
      const curve = new Float32Array(257);
      for (let i = 0; i < 257; i++) { const x = i / 256 * 2 - 1; curve[i] = Math.tanh(x * 4); }
      shaper.curve = curve;
      // Formant-Sweep "r-aaa-r"
      const bp = actx.createBiquadFilter();
      bp.type = 'bandpass'; bp.Q.value = 1.8;
      bp.frequency.setValueAtTime(600, now);
      bp.frequency.linearRampToValueAtTime(1300, now + 0.3);
      bp.frequency.linearRampToValueAtTime(450, now + dur);
      const g = actx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.7, now + 0.09);
      g.gain.setValueAtTime(0.62, now + dur * 0.6);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      shaper.connect(bp); bp.connect(g); g.connect(master);
      [68, 102, 137].forEach((f, k) => {
        const o = actx.createOscillator();
        o.type = k === 0 ? 'sawtooth' : 'square';
        o.frequency.setValueAtTime(f * 1.12, now);
        o.frequency.exponentialRampToValueAtTime(f * 0.82, now + dur);
        o.connect(shaper); o.start(now); o.stop(now + dur + 0.05);
      });
      // Rausch-Anteil
      const n = actx.createBufferSource(); n.buffer = makeNoise(dur);
      const nf = actx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 950; nf.Q.value = 0.7;
      const ng = actx.createGain();
      ng.gain.setValueAtTime(0.3, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + dur);
      n.connect(nf); nf.connect(ng); ng.connect(master);
      n.start(now); n.stop(now + dur);
    }

    return {
      start() {
        init();
        if (actx.state === 'suspended') actx.resume();
        started = true;
        master.gain.cancelScheduledValues(actx.currentTime);
        master.gain.linearRampToValueAtTime(0.5, actx.currentTime + 0.8);
        step = 0;
        reschedule();
        rescheduleBoo();
      },
      stop() {
        if (!actx) return;
        master.gain.linearRampToValueAtTime(0.0, actx.currentTime + 0.4);
        if (stepTimer) { clearInterval(stepTimer); stepTimer = null; }
        if (booTimer) { clearTimeout(booTimer); booTimer = null; }
      },
      setIntensity(v) {
        const prev = Math.round(intensity);
        intensity = v;
        if (started && Math.round(v) !== prev) reschedule();
      },
      // kurze Effekte
      catch() {
        if (!actx || !started) return;
        const now = actx.currentTime;
        blip(880, 0.12, 'sine', 0.25, now);
        blip(1320, 0.14, 'sine', 0.2, now + 0.06);
      },
      miss() {
        if (!actx || !started) return;
        const now = actx.currentTime;
        blip(180, 0.3, 'sawtooth', 0.3, now);
        blip(120, 0.4, 'sawtooth', 0.25, now + 0.05);
      },
      over() {
        if (!actx || !started) return;
        const now = actx.currentTime;
        [440, 370, 294, 220].forEach((f, k) => blip(f, 0.5, 'triangle', 0.25, now + k * 0.18));
      },
      boo,
      roar,
      setOnBoo(fn) { onBoo = fn; },
    };
  })();

  // =========================================================================
  // Game state
  // =========================================================================
  const State = { START: 'start', PLAYING: 'playing', OVER: 'over' };
  let state = State.START;

  let score = 0, strikes = 0, level = 1;
  let eggs = [];
  let particles = [];
  let protesters = [];       // kleine Demonstranten mit Schildern (pro Buh +1)
  let spawnTimer = 0, spawnInterval = 1.3;
  let best = +(localStorage.getItem('eggBest') || 0);

  // Verwandlungs-Stufen nach Score:
  //   ab 25  -> "Feucht"-Form (head3.png), nur Bildwechsel + dezenter Blitz
  //   ab 75  -> Rage-Form (head2.png) mit Feuer-Aura + "RAAAR"-Schrei
  const WET_SCORE = 25;
  const RAGE_SCORE = 75;
  let wetMode = false;
  let powerMode = false;     // Rage
  let roarAnim = 0;          // 0..1, Schrei-Animation (Kopf wächst + "RAAAR!")
  let powerFlash = 0;        // 0..1, goldener Blitz beim Rage-Auslösen
  let wetFlash = 0;          // 0..1, cyan Blitz beim Feucht-Auslösen

  // Fairplay-Mechanik: feste, vom Spieler erreichbare Kopfgeschwindigkeit.
  // Tastatur UND Touch bewegen den Kopf mit GENAU dieser Geschwindigkeit –
  // damit ist jede beim Spawn berechnete Fang-Position auch wirklich machbar.
  const HEAD_SPEED = 640;            // px/s
  let gameTime = 0;                  // Spieluhr (s)
  let nextFreeX = 0;                 // x, an dem der Kopf nach dem letzten Ei steht
  let nextFreeTime = 0;             // Zeitpunkt, zu dem der Kopf wieder frei ist
  let pointerTarget = null;          // Touch-Ziel (x), null = inaktiv

  // Plattform (Kopf) – Maße aus dem Freisteller assets/head.png abgeleitet
  const HEAD_ASPECT = 913 / 1309;   // Höhe/Breite des freigestellten PNGs
  const CATCH_FRAC = 0.12;          // Fanglinie als Anteil der Bildhöhe (von oben = Scheitel)
  const CATCH_HALF_FRAC = 0.19;     // halbe Kopfbreite als Anteil der Bildbreite (= Bewegungsgrenze)
  // Runde Hitbox: ein Kreis, der dem Kopf folgt (Ei-Kreis vs. Kopf-Kreis).
  const HITBOX_R_FRAC = 0.19;       // Kreisradius als Anteil der Kopfbreite (~Kopf-Halbbreite)
  const HITBOX_CX_OFF = 0.024;      // Kopf-Mitte liegt minimal rechts der Bildmitte
  const HITBOX_CY_FRAC = 0.20;      // vertikale Kreismitte als Anteil der Kopfhöhe unter der Fanglinie
  // Mittelpunkt & Radius des Kopf-Kreises (head.x ist die aktuelle Plattform-x).
  function headCircle() {
    return {
      cx: head.x + head.w * HITBOX_CX_OFF,
      cy: headTopY() + head.h * HITBOX_CY_FRAC,
      r: head.w * HITBOX_R_FRAC,
    };
  }
  const head = { x: W / 2, w: 280, h: 280 * HEAD_ASPECT, targetX: W / 2 };
  function layoutHead() {
    head.w = Math.min(320, Math.max(190, W * 0.30));
    head.h = head.w * HEAD_ASPECT;
    const b = head.w * CATCH_HALF_FRAC;
    head.x = Math.max(b, Math.min(W - b, head.x));
    head.targetX = Math.max(b, Math.min(W - b, head.targetX));
  }
  function headTopY() { return H - head.h * 0.95; }      // Auffang-Linie (oben am Kopf)
  function floorY() { return H - 8; }
  // Bewegungsgrenze: nur der KOPF muss auf dem Screen bleiben (Schultern dürfen
  // seitlich rausragen), damit auch Eier ganz am Rand fangbar sind.
  function headBound() { return head.w * CATCH_HALF_FRAC; }

  function difficulty() {
    return {
      fallSpeed: 150 + (level - 1) * 42,     // px/s (Eier fallen unterschiedlich schnell)
      spawnInterval: Math.max(0.45, 1.35 - (level - 1) * 0.13),
      // Fairplay-"Enge": Anteil der erreichbaren Spanne, die genutzt werden darf.
      // <= 1, daher immer fangbar; steigt mit dem Level -> wird knapper.
      tightness: Math.min(1, 0.6 + (level - 1) * 0.05),
    };
  }

  function setLevel(newLevel) {
    if (newLevel === level) return;
    level = newLevel;
    levelEl.textContent = level;
    updatePalette(level);
    Audio.setIntensity(level);
  }

  // Spawnt ein Ei so, dass es vom Kopf garantiert noch gefangen werden kann.
  // Grundlage: Fallzeit dieses Eis (es fallen ja unterschiedlich schnell!) und
  // die feste Kopfgeschwindigkeit HEAD_SPEED.
  function spawnEgg() {
    const r = 16 + Math.random() * 4;
    const d = difficulty();
    const topY = headTopY();
    const b = headBound();
    // Frühestmöglicher Fangpunkt = Scheitel des Kopf-Kreises (dort wird ein
    // mittig fallendes Ei zuerst getroffen). Die Fairplay-Deadline rechnet mit
    // genau diesem höchsten Punkt, damit der Kopf garantiert rechtzeitig da ist.
    const domeReach = head.w * HITBOX_R_FRAC + r;
    const yTop = topY + head.h * HITBOX_CY_FRAC - domeReach;
    const fallDist = yTop + r + 10;             // Strecke von Start (y=-r-10) bis yTop

    // Referenz: wo/wann ist der Kopf nach dem zuletzt eingeplanten Ei frei?
    // Ist nichts mehr in der Luft bzw. der Kopf schon frei -> reale Position.
    if (eggs.length === 0 || nextFreeTime <= gameTime) {
      nextFreeX = head.x;
      nextFreeTime = gameTime;
    }

    // Fallgeschwindigkeit (variiert pro Ei)
    let vy = d.fallSpeed * (0.8 + Math.random() * 0.45);

    // Eier sollen sich nicht überholen: dieses Ei muss mit etwas Abstand NACH
    // dem vorherigen ankommen. Notfalls wird es dafür langsamer gemacht.
    const minGap = 0.14;
    const tFallMax = (nextFreeTime + minGap) - gameTime;
    if (tFallMax > 0) {
      const vyMax = fallDist / tFallMax;
      if (vy > vyMax) vy = vyMax;
    }
    const tFall = fallDist / vy;
    const tCatch = gameTime + tFall;

    // Erreichbare halbe Spanne = Kopf-Speed * verfügbare Zeit.
    // Bewusst OHNE catchHalf: die Kette läuft über die EXAKTE Kopf-Zielposition,
    // damit sich kein Startfehler aufsummiert. catchHalf bleibt reiner
    // Timing-Puffer (Frame-Quantisierung) und ist daher zusätzliche Sicherheit.
    const budget = Math.max(0, tCatch - nextFreeTime);
    const reach = HEAD_SPEED * budget;
    const span = reach * d.tightness;           // tightness <= 1 => immer machbar

    // Ziel-x: gleichverteilt über die GANZE Breite würfeln (echte Streuung),
    // dann auf das erreichbare Fenster [nextFreeX ± span] begrenzen. So bleibt
    // die Verteilung breit gestreut statt als träger Random-Walk an einer Wand
    // zu kleben – und es zieht von den Rändern weg zur Mitte.
    const desired = r + Math.random() * (W - 2 * r);
    let x = Math.max(nextFreeX - span, Math.min(nextFreeX + span, desired));
    x = Math.max(r, Math.min(W - r, x));

    eggs.push({ x, y: -r - 10, r, vy, wobble: Math.random() * Math.PI * 2 });

    // Kette fortschreiben: der Kopf ist zum Fang-Zeitpunkt an x (innerhalb der
    // Bewegungsgrenzen) gebunden.
    nextFreeX = Math.max(b, Math.min(W - b, x));
    nextFreeTime = tCatch;
  }

  function addCatchParticles(x, y) {
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 120;
      particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        life: 0.5 + Math.random() * 0.3,
        max: 0.8,
        col: Math.random() < 0.5 ? '#fff6d6' : '#ffd34d',
      });
    }
  }

  // Demonstranten: bei jedem Buh kommt einer dazu (vor dem Bundestag).
  const PROTEST_WORDS = ['BUH', 'PFUI', 'NÖ!', 'RAUS', 'NEIN', 'BUÄH'];
  const PROTEST_BODY = ['#3a4a6b', '#5a3a3a', '#3a5a47', '#5a4a2a', '#444', '#4a3a5a'];
  const PROTEST_SIGN = ['#f2e9d0', '#ffd34d', '#e8e8e8', '#ffcf6b', '#d7e3c7'];
  const PROTEST_SKIN = ['#e4b48c', '#d39a6e', '#c98a5e', '#efc39a'];
  const MAX_PROTESTERS = 70;
  function addProtester() {
    if (state !== State.PLAYING || protesters.length >= MAX_PROTESTERS) return;
    const groundTop = H * 0.72;                 // = baseY aus drawBundestag (Vorplatz)
    const band = H - groundTop;
    const depth = Math.random();                // 0 = hinten/oben, 1 = vorne/unten
    const y = groundTop + 6 + depth * (band - 14);
    // Schild-Motiv: ein paar tragen "nein CDU" bzw. "LeckerEi", der Rest Parolen.
    const rnd = Math.random();
    const signType = rnd < 0.3 ? 'cdu' : (rnd < 0.6 ? 'ei' : 'word');
    protesters.push({
      x: 12 + Math.random() * (W - 24),
      y,
      scale: 0.62 + depth * 0.85,               // vorne größer (Tiefe)
      body: PROTEST_BODY[(Math.random() * PROTEST_BODY.length) | 0],
      skin: PROTEST_SKIN[(Math.random() * PROTEST_SKIN.length) | 0],
      sign: PROTEST_SIGN[(Math.random() * PROTEST_SIGN.length) | 0],
      signType,
      word: PROTEST_WORDS[(Math.random() * PROTEST_WORDS.length) | 0],
      phase: Math.random() * Math.PI * 2,
    });
    protesters.sort((a, b) => a.y - b.y);        // hintere zuerst zeichnen
  }

  function drawProtesters() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineCap = 'round';
    for (const p of protesters) {
      const s = p.scale;
      const bob = Math.sin(gameTime * 3 + p.phase) * 1.6 * s;       // wippen
      const sway = Math.sin(gameTime * 2 + p.phase * 1.3) * 5 * s;  // Schild schwenken
      const x = p.x;
      const footY = p.y + bob;
      const bodyH = 13 * s, bodyW = 6.5 * s, headR = 3.4 * s;
      const hipY = footY - bodyH * 0.42;
      const shoulderY = footY - bodyH;
      const headCy = shoulderY - headR;

      // Bodenschatten
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(x, footY + 1, bodyW * 0.95, 2.2 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Beine
      ctx.strokeStyle = '#23232b';
      ctx.lineWidth = Math.max(1, 2 * s);
      ctx.beginPath();
      ctx.moveTo(x - 1.6 * s, hipY); ctx.lineTo(x - 2.6 * s, footY);
      ctx.moveTo(x + 1.6 * s, hipY); ctx.lineTo(x + 2.6 * s, footY);
      ctx.stroke();

      // Körper
      ctx.fillStyle = p.body;
      ctx.beginPath();
      roundRect(x - bodyW / 2, shoulderY, bodyW, bodyH * 0.62, 2 * s);
      ctx.fill();

      // erhobener Arm zur Schildstange
      const poleTopX = x + sway, poleTopY = headCy - 18 * s;
      ctx.strokeStyle = p.body;
      ctx.lineWidth = Math.max(1, 2 * s);
      ctx.beginPath();
      ctx.moveTo(x + bodyW * 0.3, shoulderY + 2 * s);
      ctx.lineTo(poleTopX, poleTopY + 9 * s);
      ctx.stroke();

      // Kopf
      ctx.fillStyle = p.skin;
      ctx.beginPath();
      ctx.arc(x, headCy, headR, 0, Math.PI * 2);
      ctx.fill();

      // Bild-Schild ("nein CDU" / "LeckerEi") falls vorhanden, sonst Parole.
      const signImg = p.signType === 'cdu' ? signCdu : (p.signType === 'ei' ? signEi : null);
      const imgReady = signImg && (p.signType === 'cdu' ? signCduReady : signEiReady);
      let sw, sh;
      if (imgReady) {
        sh = 19 * s;                              // Bild-Schilder etwas größer (Lesbarkeit)
        const ar = signImg.naturalWidth / signImg.naturalHeight;
        sw = sh * Math.max(1, Math.min(1.5, ar));
      } else {
        sw = 22 * s; sh = 13 * s;
      }
      const sx = poleTopX - sw / 2, sy = poleTopY - sh;
      // Stange
      ctx.strokeStyle = '#6b5535';
      ctx.lineWidth = Math.max(1, 1.4 * s);
      ctx.beginPath();
      ctx.moveTo(poleTopX, poleTopY + 16 * s);
      ctx.lineTo(poleTopX, sy + sh);
      ctx.stroke();
      // weißes Schild
      ctx.fillStyle = imgReady ? '#fff' : p.sign;
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);
      if (imgReady) {                             // Motiv einpassen (contain)
        const m = 1.5 * s, aw = sw - 2 * m, ah = sh - 2 * m;
        const ar = signImg.naturalWidth / signImg.naturalHeight;
        let dw = aw, dh = aw / ar;
        if (dh > ah) { dh = ah; dw = ah * ar; }
        ctx.drawImage(signImg, sx + (sw - dw) / 2, sy + (sh - dh) / 2, dw, dh);
      } else if (s > 0.8) {
        ctx.fillStyle = '#2a2a2a';
        ctx.font = `700 ${Math.floor(7.5 * s)}px "Segoe UI", sans-serif`;
        ctx.fillText(p.word, poleTopX, sy + sh / 2 + 0.5);
      } else {                                   // zu klein für Text -> Kritzel-Linien
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(sx + 3 * s, sy + sh * 0.34, sw - 6 * s, 1.4 * s);
        ctx.fillRect(sx + 3 * s, sy + sh * 0.62, sw - 8 * s, 1.4 * s);
      }
    }
    ctx.restore();
  }

  // kleiner Rounded-Rect-Pfad-Helfer (für Demonstranten-Körper)
  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function reset() {
    score = 0; strikes = 0; level = 1;
    eggs = []; particles = []; protesters = [];
    spawnTimer = 0;
    gameTime = 0;
    head.x = head.targetX = W / 2;
    nextFreeX = head.x;
    nextFreeTime = 0;
    pointerTarget = null;
    wetMode = false;
    powerMode = false;
    roarAnim = 0;
    powerFlash = 0;
    wetFlash = 0;
    scoreEl.textContent = '0';
    levelEl.textContent = '1';
    strikeDots.forEach(d => d.classList.remove('on'));
    updatePalette(1);
  }

  function startGame() {
    reset();
    state = State.PLAYING;
    startScreen.classList.add('hidden');
    overScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    Audio.start();
    Audio.setIntensity(1);
  }

  function gameOver() {
    state = State.OVER;
    Audio.over();
    Audio.stop();
    best = Math.max(best, score);
    localStorage.setItem('eggBest', best);
    finalScoreEl.textContent = score;
    bestScoreEl.textContent = best;
    overTitleEl.textContent = GAMEOVER_TEXTS[(Math.random() * GAMEOVER_TEXTS.length) | 0];
    hud.classList.add('hidden');
    overScreen.classList.remove('hidden');
  }

  function registerStrike() {
    strikes++;
    if (strikeDots[strikes - 1]) strikeDots[strikes - 1].classList.add('on');
    Audio.miss();
    flash = 0.25;
    if (strikes >= 3) gameOver();
  }

  // =========================================================================
  // Input  (Maussteuerung ist bewusst entfernt – nur Tastatur & Touch, beide
  //         mit fester Geschwindigkeit, damit die Fairplay-Garantie greift.)
  // =========================================================================
  function setPointer(clientX) {
    const r = canvas.getBoundingClientRect();
    pointerTarget = clientX - r.left;
  }
  window.addEventListener('touchstart', e => {
    if (state === State.PLAYING && e.touches[0]) { setPointer(e.touches[0].clientX); e.preventDefault(); }
  }, { passive: false });
  window.addEventListener('touchmove', e => {
    if (state === State.PLAYING && e.touches[0]) { setPointer(e.touches[0].clientX); e.preventDefault(); }
  }, { passive: false });
  window.addEventListener('touchend', () => { pointerTarget = null; });

  const keys = { left: false, right: false };
  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
  });
  window.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
  });

  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);

  // =========================================================================
  // Update
  // =========================================================================
  let flash = 0; // roter Bildschirm-Blitz bei Strike

  function update(dt) {
    if (state !== State.PLAYING) return;
    gameTime += dt;

    // Plattform bewegen – konstante Geschwindigkeit HEAD_SPEED (Tastatur > Touch).
    const b = headBound();
    const step = HEAD_SPEED * dt;
    let dir = 0;
    if (keys.left && !keys.right) dir = -1;
    else if (keys.right && !keys.left) dir = 1;
    if (dir !== 0) {
      head.x += dir * step;
      pointerTarget = null;               // Tastatur übersteuert Touch
    } else if (pointerTarget !== null) {
      const dx = pointerTarget - head.x;
      head.x += Math.abs(dx) <= step ? dx : Math.sign(dx) * step;
    }
    head.x = Math.max(b, Math.min(W - b, head.x));
    head.targetX = head.x;

    // Spawning
    const d = difficulty();
    spawnInterval = d.spawnInterval;
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnEgg();
      spawnTimer = spawnInterval * (0.8 + Math.random() * 0.4);
    }

    // Eier bewegen + Kollision
    const fY = floorY();
    const hc = headCircle();                 // runder Kopf-Hitbox-Kreis
    for (let i = eggs.length - 1; i >= 0; i--) {
      const egg = eggs[i];
      egg.wobble += dt * 4;
      const prevY = egg.y;
      egg.y += egg.vy * dt;
      // Eier fallen senkrecht (keine seitliche Drift), damit die beim Spawn
      // berechnete Fang-Position exakt stimmt.

      // Fang: Ei-Kreis trifft Kopf-Kreis. Da das Ei senkrecht fällt, hängt das
      // nur vom horizontalen Abstand dx ab (Treffer, wenn dx <= R + Ei-Radius).
      // Geprüft wird die Überlappung der Fallstrecke [prevY, egg.y] mit der
      // vertikalen Ausdehnung des Kreises bei diesem dx -> robust gegen
      // Tunneling UND frame-genau (kein Verfehlen um einen Frame).
      const dome = hc.r + egg.r;
      const dx = egg.x - hc.cx;
      if (Math.abs(dx) <= dome) {
        const half = Math.sqrt(dome * dome - dx * dx);   // halbe Kreishöhe bei dx
        if (egg.y >= hc.cy - half && prevY <= hc.cy + half) {
          eggs.splice(i, 1);
          score++;
          scoreEl.textContent = score;
          Audio.catch();
          addCatchParticles(egg.x, hc.cy - half);        // Kontaktpunkt auf der Kuppel
          headSquash = 1;
          setLevel(Math.floor(score / 5) + 1);
          // Feucht-Form bei Score 25 (nur Verwandlung + dezenter Blitz)
          if (!wetMode && score >= WET_SCORE) {
            wetMode = true;
            wetFlash = 1;
          }
          // Rage-Form bei Score 75: Schrei + Feuer
          if (!powerMode && score >= RAGE_SCORE) {
            powerMode = true;
            roarAnim = 1;
            powerFlash = 1;
            Audio.roar();
          }
          continue;
        }
      }
      // Verpasst: unten angekommen
      if (egg.y - egg.r > fY) {
        eggs.splice(i, 1);
        addSplat(egg.x, fY);
        registerStrike();
      }
    }

    // Partikel
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.vy += 300 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    if (flash > 0) flash = Math.max(0, flash - dt);
    if (headSquash > 0) headSquash = Math.max(0, headSquash - dt * 4);
    if (roarAnim > 0) roarAnim = Math.max(0, roarAnim - dt * 0.8);   // ~1.25 s Schrei
    if (powerFlash > 0) powerFlash = Math.max(0, powerFlash - dt * 1.6);
    if (wetFlash > 0) wetFlash = Math.max(0, wetFlash - dt * 1.8);
  }

  let headSquash = 0;
  const splats = []; // Eier-Splats am Boden
  function addSplat(x, y) {
    splats.push({ x, y, life: 2.5 });
    if (splats.length > 14) splats.shift();
  }

  // =========================================================================
  // Render
  // =========================================================================
  function drawBackground() {
    // Himmel
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, pal.skyTop);
    sky.addColorStop(1, pal.skyBot);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    drawBundestag();
    // Color-Grading-Tint
    const t = pal.tint;
    ctx.fillStyle = `rgba(${t[0]},${t[1]},${t[2]},${t[3]})`;
    ctx.fillRect(0, 0, W, H);
  }

  // Sehr simpler Reichstag/Bundestag: Sockel, Portikus mit Säulen,
  // Dreiecksgiebel und Glaskuppel.
  function drawBundestag() {
    const groundY = H * 0.72;
    const cx = W / 2;
    const bw = Math.min(W * 0.9, 1100);   // Gebäudebreite
    const left = cx - bw / 2;
    const baseY = groundY;
    const bodyH = H * 0.26;
    const bodyTop = baseY - bodyH;

    ctx.save();

    // Hauptkörper
    ctx.fillStyle = pal.building;
    ctx.fillRect(left, bodyTop, bw, bodyH);

    // Sockellinie
    ctx.fillStyle = pal.stone;
    ctx.fillRect(left, baseY - 14, bw, 14);

    // Eckrisalite (zwei kräftige Blöcke außen)
    const riseW = bw * 0.13;
    ctx.fillStyle = pal.stone;
    ctx.fillRect(left, bodyTop - 16, riseW, bodyH + 16);
    ctx.fillRect(left + bw - riseW, bodyTop - 16, riseW, bodyH + 16);

    // Zentraler Portikus
    const portW = bw * 0.34;
    const portLeft = cx - portW / 2;
    const portTop = bodyTop - bodyH * 0.16;
    ctx.fillStyle = pal.stone;
    ctx.fillRect(portLeft, portTop, portW, baseY - portTop);

    // Säulen im Portikus
    const cols = 6;
    const gap = portW / (cols + 1);
    const colW = gap * 0.42;
    const colTop = portTop + bodyH * 0.14;
    ctx.fillStyle = pal.building;
    for (let i = 1; i <= cols; i++) {
      const x = portLeft + gap * i - colW / 2;
      ctx.fillRect(x, colTop, colW, baseY - 14 - colTop);
    }

    // Dreiecksgiebel über dem Portikus
    ctx.fillStyle = pal.stone;
    ctx.beginPath();
    ctx.moveTo(portLeft - 10, portTop);
    ctx.lineTo(cx, portTop - bodyH * 0.22);
    ctx.lineTo(portLeft + portW + 10, portTop);
    ctx.closePath();
    ctx.fill();

    // Glaskuppel
    const domeR = bw * 0.10;
    const domeCy = portTop - bodyH * 0.22;
    ctx.fillStyle = pal.stone;
    ctx.fillRect(cx - domeR * 0.9, domeCy - 6, domeR * 1.8, 10); // Tambour
    ctx.beginPath();
    ctx.arc(cx, domeCy - 6, domeR, Math.PI, 0);
    const domeGrad = ctx.createLinearGradient(cx - domeR, domeCy - domeR, cx + domeR, domeCy);
    domeGrad.addColorStop(0, 'rgba(255,255,255,0.35)');
    domeGrad.addColorStop(1, pal.accent);
    ctx.fillStyle = domeGrad;
    ctx.fill();

    // Fensterreihe (dezent)
    ctx.fillStyle = pal.accent;
    const winY = bodyTop + bodyH * 0.34;
    const winCount = 16;
    const winGap = bw / (winCount + 1);
    for (let i = 1; i <= winCount; i++) {
      const x = left + winGap * i;
      if (Math.abs(x - cx) < portW / 2 - 10) continue; // Portikus aussparen
      ctx.fillRect(x - winGap * 0.14, winY, winGap * 0.28, bodyH * 0.30);
    }

    // Boden / Vorplatz
    ctx.fillStyle = pal.accent;
    ctx.fillRect(0, baseY, W, H - baseY);

    ctx.restore();
  }

  function drawEgg(egg) {
    ctx.save();
    const sway = Math.sin(egg.wobble) * 0.12;
    ctx.translate(egg.x, egg.y);
    ctx.rotate(sway);
    // Schatten
    ctx.beginPath();
    ctx.ellipse(0, 0, egg.r * 0.78, egg.r, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f6efe2';
    ctx.fill();
    // oberer, etwas spitzerer Teil
    ctx.beginPath();
    ctx.ellipse(0, -egg.r * 0.25, egg.r * 0.6, egg.r * 0.78, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fffdf7';
    ctx.fill();
    // Glanz
    ctx.beginPath();
    ctx.ellipse(-egg.r * 0.28, -egg.r * 0.3, egg.r * 0.18, egg.r * 0.28, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();
    ctx.restore();
  }

  function drawSplats() {
    for (const s of splats) {
      const a = Math.max(0, s.life / 2.5);
      ctx.fillStyle = `rgba(245,210,80,${0.5 * a})`;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, 26, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,250,235,${0.7 * a})`;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y - 1, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      s.life -= 0.016;
    }
  }

  function drawHead() {
    const topY = headTopY();
    const hc = headCircle();
    const squash = 1 - headSquash * 0.12;
    const roarScale = 1 + roarAnim * 0.18;            // Kopf "schreit" = wächst kurz
    const usePower = powerMode && headReady2;

    // Bodenschatten
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(head.x, floorY() - 6, head.w * 0.4, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Power-Aura ab Score 50
    if (powerMode) {
      const a = 0.18 + roarAnim * 0.45;
      const aura = ctx.createRadialGradient(hc.cx, hc.cy, hc.r * 0.4, hc.cx, hc.cy, hc.r * 2.4);
      aura.addColorStop(0, `rgba(255,200,60,${a})`);
      aura.addColorStop(1, 'rgba(255,150,30,0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(hc.cx, hc.cy, hc.r * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bild so skalieren/positionieren, dass sein Kopf-Kreis = Spiel-Hitbox.
    const drawMapped = (img, fx, fy, fr, extra) => {
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const scale = (hc.r / (fr * iw)) * extra;
      ctx.drawImage(img, hc.cx - fx * iw * scale, hc.cy - fy * ih * scale, iw * scale, ih * scale);
    };

    if (usePower) {                                  // Rage ab 75
      drawMapped(headImg2, HEAD2_FX, HEAD2_FY, HEAD2_FR, roarScale * squash);
    } else if (wetMode && headReady3) {              // Feucht ab 25
      drawMapped(headImg3, HEAD3_FX, HEAD3_FY, HEAD3_FR, squash);
    } else if (headReady) {
      // Normaler Kopf: Scheitel an der Fanglinie, Unterkante als Basislinie.
      const h = head.h * squash;
      const w = head.w;
      const baseBottom = topY - head.h * CATCH_FRAC + head.h;
      ctx.drawImage(headImg, head.x - w / 2, baseBottom - h, w, h);
    } else {
      drawProceduralHead(head.x, topY, head.w, head.h);
    }

    // "RAAAR!" – Kraftschrei beim Verwandeln
    if (roarAnim > 0) {
      const hc = headCircle();
      ctx.save();
      ctx.globalAlpha = Math.min(1, roarAnim * 1.5);
      const fs = 42 + (1 - roarAnim) * 26;
      ctx.font = `900 ${fs}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(50,15,0,0.85)';
      ctx.fillStyle = '#ffd34d';
      const ty = hc.cy - hc.r - 24 - (1 - roarAnim) * 24;
      ctx.strokeText('RAAAR!', head.x, ty);
      ctx.fillText('RAAAR!', head.x, ty);
      ctx.restore();
    }
  }

  // Platzhalter-Kopf, falls assets/head.png (noch) fehlt
  function drawProceduralHead(cx, topY, w, h) {
    ctx.save();
    const skin = '#e4b48c';
    // Schultern / Anzug
    ctx.fillStyle = '#1f2a44';
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.55, floorY());
    ctx.quadraticCurveTo(cx - w * 0.5, topY + h * 0.55, cx, topY + h * 0.55);
    ctx.quadraticCurveTo(cx + w * 0.5, topY + h * 0.55, cx + w * 0.55, floorY());
    ctx.closePath();
    ctx.fill();
    // Krawatte
    ctx.fillStyle = '#2f9e6b';
    ctx.beginPath();
    ctx.moveTo(cx, topY + h * 0.55);
    ctx.lineTo(cx - 10, topY + h * 0.7);
    ctx.lineTo(cx, floorY());
    ctx.lineTo(cx + 10, topY + h * 0.7);
    ctx.closePath();
    ctx.fill();
    // Hals
    ctx.fillStyle = skin;
    ctx.fillRect(cx - w * 0.12, topY + h * 0.4, w * 0.24, h * 0.2);
    // Kopf
    ctx.beginPath();
    ctx.ellipse(cx, topY + h * 0.22, w * 0.3, h * 0.27, 0, 0, Math.PI * 2);
    ctx.fillStyle = skin;
    ctx.fill();
    // angedeutete Haare an den Seiten (Glatze oben)
    ctx.fillStyle = '#6b6b6b';
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.26, topY + h * 0.22, w * 0.07, h * 0.12, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + w * 0.26, topY + h * 0.22, w * 0.07, h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    // Augen (leichtes Schmunzeln)
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath();
    ctx.arc(cx - w * 0.1, topY + h * 0.2, 3, 0, Math.PI * 2);
    ctx.arc(cx + w * 0.1, topY + h * 0.2, 3, 0, Math.PI * 2);
    ctx.fill();
    // Mund
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, topY + h * 0.27, w * 0.1, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawProtesters();
    drawSplats();
    for (const egg of eggs) drawEgg(egg);
    drawHead();
    drawParticles();

    // Strike-Blitz
    if (flash > 0) {
      ctx.fillStyle = `rgba(200,20,20,${flash})`;
      ctx.fillRect(0, 0, W, H);
    }
    // Feucht-Blitz (cyan) bei Score 25
    if (wetFlash > 0) {
      ctx.fillStyle = `rgba(90,200,230,${wetFlash * 0.45})`;
      ctx.fillRect(0, 0, W, H);
    }
    // Power-Blitz (golden) bei Score 75
    if (powerFlash > 0) {
      ctx.fillStyle = `rgba(255,200,60,${powerFlash * 0.6})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // =========================================================================
  // Loop
  // =========================================================================
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05; // clamp (Tab-Wechsel)
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  layoutHead();
  window.addEventListener('resize', layoutHead);
  Audio.setOnBoo(addProtester);     // pro Buh kommt ein Demonstrant dazu
  updatePalette(1);
  requestAnimationFrame(frame);
})();
