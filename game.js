(() => {
  const canvas = document.getElementById("gameCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const appRoot = document.getElementById("appRoot");
  const mainTitle = document.getElementById("mainTitle");

  const returnCountEl = document.getElementById("returnCount");
  const bestCountEl = document.getElementById("bestCount");
  const speedMultEl = document.getElementById("speedMult");
  const boostInput = document.getElementById("boostInput");
  const themeNameEl = document.getElementById("themeName");
  const rankingListEl = document.getElementById("rankingList");
  const chaosEmojiEl = document.getElementById("chaosEmoji");
  const chaosHintEl = document.getElementById("chaosHint");

  const startBtn = document.getElementById("startBtn");
  const restartBtn = document.getElementById("restartBtn");
  const unfairBtn = document.getElementById("unfairBtn");
  const exportRankingBtn = document.getElementById("exportRankingBtn");
  const importRankingBtn = document.getElementById("importRankingBtn");
  const importRankingInput = document.getElementById("importRankingInput");

  const overlay = document.getElementById("overlay");
  const overlayCard = overlay ? overlay.querySelector(".overlay-card") : null;
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayText = document.getElementById("overlayText");

  const W = canvas.width;
  const H = canvas.height;
  const rankingStorageKey = "unfair_pong_return_ranking_v3";
  const defaultBoost = 1.1;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const random = (min, max) => Math.random() * (max - min) + min;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const state = {
    running: false,
    rafId: 0,
    lastTime: 0,
    returnCount: 0,
    bestCount: 0,
    speedMultiplier: 1,
    ranking: [],
    chaosMode: false,
    controlsInvertedUntil: 0,
    nextChaosAt: 0,
    chaosFlashHideAt: 0,
    impactTimer: 0,
    titleTimer: 0
  };

  const player = { x: 30, y: H / 2 - 48, w: 12, h: 96, speed: 640 };
  const cpu = { x: W - 48, y: H / 2 - 126, w: 18, h: 252, speed: 670, aim: 0.86 };
  const ball = {
    x: W / 2,
    y: H / 2,
    size: 16,
    vx: 0,
    vy: 0,
    baseSpeed: 335,
    mode: "core",
    coreVariant: "icosa",
    coreSeed: Math.random() * Math.PI * 2,
    coreSpin: random(0.72, 1.34),
    emoji: "👾",
    sprite: "moon"
  };

  const keys = { up: false, down: false };
  let pointerActive = false;
  let pointerY = H / 2;
  let unfairHovering = false;

  const taunts = [
    "또 졌네? 채널을 바꿔도 결과는 같아.",
    "CPU가 지금 실시간으로 비웃는 중.",
    "반응속도보다 핑계속도가 빨랐다.",
    "패배 로그가 또 한 줄 추가됐다.",
    "손이 느린 게 아니라 세상이 빠른 거다."
  ];

  const trollEmojis = ["🤡", "💀", "🫠", "👹", "🙃", "😵‍💫"];
  const glitchBallEmojis = ["👾", "🛰️", "⚠️", "💥", "🧿", "😈"];

  const moonSprite = [
    "00011100",
    "00111110",
    "01112211",
    "01111111",
    "01111111",
    "01112211",
    "00111110",
    "00011100"
  ];

  const tteokgukSprite = [
    "00033300",
    "00311130",
    "03121113",
    "03111113",
    "03141113",
    "03111113",
    "00355530",
    "00033300"
  ];

  const trailParticles = [];
  const impactParticles = [];

  const noiseTex = document.createElement("canvas");
  noiseTex.width = 180;
  noiseTex.height = 180;
  const noiseCtx = noiseTex.getContext("2d");
  let noisePattern = null;
  let noiseUpdatedAt = 0;
  const icosaCoreMesh = buildIcosahedronMesh();
  const hypercubeCoreMesh = buildHypercubeMesh();

  const themeDefs = {
    "theme-cyberpunk": {
      label: "HACKED CRT",
      badge: "NEON FEED",
      canvas: {
        ambient: "#05000a",
        paddlePlayer: "#ff00ff",
        paddleCpu: "#00f3ff",
        ball: "#ccff00",
        ballGlow: "rgba(204,255,0,0.9)",
        trail: "rgba(204,255,0,0.88)",
        net: "#00f3ff",
        netGlow: "rgba(0,243,255,0.82)",
        ghost: "rgba(255,255,255,0.08)",
        bloomPlayer: "rgba(255,0,255,0.26)",
        bloomCpu: "rgba(0,243,255,0.26)",
        bloomBall: "rgba(204,255,0,0.3)",
        noiseAlpha: 0.11,
        ballMode: "mixed"
      }
    },
    "theme-seollal": {
      label: "CYBER-JOSEON",
      badge: "SEOLLAL OVERRIDE",
      canvas: {
        ambient: "#08010f",
        paddlePlayer: "#ff0055",
        paddleCpu: "#00ff9d",
        ball: "#6effd9",
        ballGlow: "rgba(255,0,85,0.72)",
        trail: "rgba(0,255,157,0.9)",
        net: "#00ff9d",
        netGlow: "rgba(0,255,157,0.86)",
        ghost: "rgba(255,255,255,0.09)",
        bloomPlayer: "rgba(255,0,85,0.24)",
        bloomCpu: "rgba(0,255,157,0.24)",
        bloomBall: "rgba(110,255,217,0.3)",
        noiseAlpha: 0.08,
        ballMode: "seollal"
      }
    },
    "theme-halloween": {
      label: "HALLOWEEN FEED",
      badge: "PUMPKIN GLITCH",
      canvas: {
        ambient: "#08030a",
        paddlePlayer: "#ff8f00",
        paddleCpu: "#7f46ff",
        ball: "#ffcc55",
        ballGlow: "rgba(255,143,0,0.8)",
        trail: "rgba(255,170,60,0.82)",
        net: "#ff8f00",
        netGlow: "rgba(255,143,0,0.8)",
        ghost: "rgba(255,255,255,0.08)",
        bloomPlayer: "rgba(255,143,0,0.24)",
        bloomCpu: "rgba(127,70,255,0.24)",
        bloomBall: "rgba(255,204,85,0.28)",
        noiseAlpha: 0.1,
        ballMode: "mixed"
      }
    },
    "theme-christmas": {
      label: "CHRISTMAS FEED",
      badge: "SNOWY GLITCH",
      canvas: {
        ambient: "#030a08",
        paddlePlayer: "#ff3c79",
        paddleCpu: "#64ffd2",
        ball: "#d2ff88",
        ballGlow: "rgba(210,255,136,0.85)",
        trail: "rgba(210,255,136,0.82)",
        net: "#64ffd2",
        netGlow: "rgba(100,255,210,0.8)",
        ghost: "rgba(255,255,255,0.08)",
        bloomPlayer: "rgba(255,60,121,0.22)",
        bloomCpu: "rgba(100,255,210,0.22)",
        bloomBall: "rgba(210,255,136,0.3)",
        noiseAlpha: 0.1,
        ballMode: "mixed"
      }
    },
    "theme-april-fools": {
      label: "APRIL FOOLS",
      badge: "REALITY ERROR",
      canvas: {
        ambient: "#120019",
        paddlePlayer: "#ffe600",
        paddleCpu: "#00fffc",
        ball: "#ff4ac8",
        ballGlow: "rgba(255,74,200,0.88)",
        trail: "rgba(255,74,200,0.82)",
        net: "#ffe600",
        netGlow: "rgba(255,230,0,0.86)",
        ghost: "rgba(255,255,255,0.1)",
        bloomPlayer: "rgba(255,230,0,0.23)",
        bloomCpu: "rgba(0,255,252,0.23)",
        bloomBall: "rgba(255,74,200,0.33)",
        noiseAlpha: 0.13,
        ballMode: "emoji"
      }
    }
  };

  const themeClasses = Object.keys(themeDefs);
  const seollalByYear = {
    2025: "2025-01-29",
    2026: "2026-02-17",
    2027: "2027-02-06",
    2028: "2028-01-26",
    2029: "2029-02-13",
    2030: "2030-02-03",
    2031: "2031-01-23",
    2032: "2032-02-11"
  };

  let themeManager;
  let soundManager;
  let announcer;
  let uiFx;

  class ThemeManager {
    constructor() {
      this.overrideTheme = null;
      this.activeClass = "theme-cyberpunk";
      this.canvas = { ...themeDefs["theme-cyberpunk"].canvas };
      this.timer = 0;
    }

    getThemeByDate(date = new Date()) {
      if (this.overrideTheme) return this.overrideTheme;
      const month = date.getMonth() + 1;
      const day = date.getDate();

      if (month === 4 && day === 1) return "theme-april-fools";
      if (isSeollalWindow(date, seollalByYear)) return "theme-seollal";
      if (isMonthDayInRange(date, { m: 10, d: 24 }, { m: 11, d: 2 })) return "theme-halloween";
      if (isMonthDayInRange(date, { m: 12, d: 20 }, { m: 12, d: 27 })) return "theme-christmas";
      return "theme-cyberpunk";
    }

    apply(date = new Date()) {
      const cls = this.getThemeByDate(date);
      const def = themeDefs[cls] || themeDefs["theme-cyberpunk"];

      document.body.classList.remove(...themeClasses);
      document.body.classList.add(cls);

      this.activeClass = cls;
      this.canvas = { ...def.canvas };
      themeNameEl.textContent = `${def.label} // ${def.badge}`;
      if (uiFx) uiFx.syncTheme(this.canvas);

      randomizeBallAppearance(true);
      return this.canvas;
    }

    watchMidnight(onChange) {
      const schedule = () => {
        const now = new Date();
        const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
        clearTimeout(this.timer);
        this.timer = window.setTimeout(() => {
          const canvasTheme = this.apply(new Date());
          if (typeof onChange === "function") onChange(canvasTheme);
          schedule();
        }, next.getTime() - now.getTime());
      };
      schedule();
    }
  }

  class SoundManager {
    constructor() {
      this.AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.enabled = Boolean(this.AudioContextClass);
      this.ctx = null;
      this.master = null;
      this.compressor = null;
      this.distortionCurve = this.buildDistortionCurve(320);
      this.noiseBuffer = null;
    }

    ensureContext() {
      if (!this.enabled) return null;
      if (this.ctx) return this.ctx;

      this.ctx = new this.AudioContextClass();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.62;

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -24;
      this.compressor.knee.value = 24;
      this.compressor.ratio.value = 10;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.22;

      this.master.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);
      this.noiseBuffer = this.createNoiseBuffer();

      return this.ctx;
    }

    unlock() {
      const c = this.ensureContext();
      if (!c) return Promise.resolve(false);
      if (c.state === "suspended") {
        return c.resume().then(() => true).catch(() => false);
      }
      return Promise.resolve(true);
    }

    buildDistortionCurve(amount = 300) {
      const n = 44100;
      const curve = new Float32Array(n);
      const deg = Math.PI / 180;
      for (let i = 0; i < n; i += 1) {
        const x = (i * 2) / n - 1;
        curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
      }
      return curve;
    }

    createNoiseBuffer() {
      const c = this.ctx;
      if (!c) return null;
      const sampleRate = c.sampleRate || 44100;
      const len = Math.floor(sampleRate * 1.8);
      const buf = c.createBuffer(1, len, sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = random(-1, 1);
      return buf;
    }

    createDistortion(amount = 280) {
      if (!this.ctx) return null;
      const node = this.ctx.createWaveShaper();
      node.curve = amount === 320 ? this.distortionCurve : this.buildDistortionCurve(amount);
      node.oversample = "4x";
      return node;
    }

    playPaddleHit() {
      const c = this.ensureContext();
      if (!c) return;

      const t = c.currentTime + 0.001;
      const base = random(45, 59);

      const kick = c.createOscillator();
      kick.type = "sine";
      kick.frequency.setValueAtTime(base * random(1.8, 2.3), t);
      kick.frequency.exponentialRampToValueAtTime(base, t + 0.04);
      kick.frequency.exponentialRampToValueAtTime(Math.max(30, base * 0.55), t + 0.24);

      const sub = c.createOscillator();
      sub.type = "triangle";
      sub.frequency.setValueAtTime(base * 0.54, t);
      sub.frequency.exponentialRampToValueAtTime(Math.max(20, base * 0.34), t + 0.24);

      const kickGain = c.createGain();
      kickGain.gain.setValueAtTime(0.0001, t);
      kickGain.gain.exponentialRampToValueAtTime(0.9, t + 0.008);
      kickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);

      const subGain = c.createGain();
      subGain.gain.setValueAtTime(0.0001, t);
      subGain.gain.exponentialRampToValueAtTime(0.62, t + 0.01);
      subGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);

      const lowpass = c.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.setValueAtTime(780, t);
      lowpass.frequency.exponentialRampToValueAtTime(120, t + 0.24);
      lowpass.Q.value = 0.8;

      const dist = this.createDistortion(420);
      const out = c.createGain();
      out.gain.setValueAtTime(0.62, t);

      kick.connect(kickGain);
      sub.connect(subGain);
      kickGain.connect(lowpass);
      subGain.connect(lowpass);
      lowpass.connect(dist);
      dist.connect(out);
      out.connect(this.master);

      kick.start(t);
      sub.start(t);
      kick.stop(t + 0.28);
      sub.stop(t + 0.28);
    }

    playWallHit() {
      const c = this.ensureContext();
      if (!c) return;

      const t = c.currentTime + 0.001;
      const osc = c.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(random(1250, 2100), t);
      osc.frequency.exponentialRampToValueAtTime(random(240, 420), t + 0.07);

      const gain = c.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);

      const hp = c.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.setValueAtTime(1200, t);
      hp.Q.value = 0.8;

      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(random(1700, 2800), t);
      bp.frequency.exponentialRampToValueAtTime(random(900, 1300), t + 0.08);
      bp.Q.value = 6;

      osc.connect(hp);
      hp.connect(bp);
      bp.connect(gain);
      gain.connect(this.master);

      osc.start(t);
      osc.stop(t + 0.1);
    }

    playScorePoint() {
      const c = this.ensureContext();
      if (!c) return;

      const t = c.currentTime + 0.001;
      const lead = c.createOscillator();
      lead.type = "sawtooth";
      lead.frequency.setValueAtTime(random(180, 230), t);
      lead.frequency.exponentialRampToValueAtTime(random(920, 1180), t + 0.36);

      const layer = c.createOscillator();
      layer.type = "square";
      layer.frequency.setValueAtTime(random(140, 180), t);
      layer.frequency.exponentialRampToValueAtTime(random(690, 860), t + 0.35);

      const gain = c.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.4, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.44);

      const sweep = c.createBiquadFilter();
      sweep.type = "bandpass";
      sweep.frequency.setValueAtTime(300, t);
      sweep.frequency.exponentialRampToValueAtTime(2600, t + 0.42);
      sweep.Q.value = 1.8;

      const dist = this.createDistortion(180);
      lead.connect(sweep);
      layer.connect(sweep);
      sweep.connect(dist);
      dist.connect(gain);
      gain.connect(this.master);

      lead.start(t);
      layer.start(t);
      lead.stop(t + 0.48);
      layer.stop(t + 0.48);
    }

    playGameOver() {
      const c = this.ensureContext();
      if (!c) return;

      const t = c.currentTime + 0.001;

      const down = c.createOscillator();
      down.type = "sawtooth";
      down.frequency.setValueAtTime(240, t);
      down.frequency.exponentialRampToValueAtTime(42, t + 0.95);
      down.frequency.linearRampToValueAtTime(0.0001, t + 1.35);

      const sub = c.createOscillator();
      sub.type = "sine";
      sub.frequency.setValueAtTime(110, t);
      sub.frequency.exponentialRampToValueAtTime(28, t + 1.2);
      sub.frequency.linearRampToValueAtTime(0.0001, t + 1.45);

      const toneGain = c.createGain();
      toneGain.gain.setValueAtTime(0.0001, t);
      toneGain.gain.exponentialRampToValueAtTime(0.54, t + 0.018);
      toneGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.45);

      const toneFilter = c.createBiquadFilter();
      toneFilter.type = "lowpass";
      toneFilter.frequency.setValueAtTime(1600, t);
      toneFilter.frequency.exponentialRampToValueAtTime(80, t + 1.4);
      toneFilter.Q.value = 1.2;

      const toneDist = this.createDistortion(220);
      down.connect(toneFilter);
      sub.connect(toneFilter);
      toneFilter.connect(toneDist);
      toneDist.connect(toneGain);
      toneGain.connect(this.master);

      const noise = c.createBufferSource();
      noise.buffer = this.noiseBuffer || this.createNoiseBuffer();

      const noiseFilter = c.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(3200, t);
      noiseFilter.frequency.exponentialRampToValueAtTime(240, t + 1.4);
      noiseFilter.Q.value = 0.9;

      const noiseGain = c.createGain();
      noiseGain.gain.setValueAtTime(0.0001, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.26, t + 0.035);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.master);

      down.start(t);
      sub.start(t);
      noise.start(t);

      down.stop(t + 1.5);
      sub.stop(t + 1.5);
      noise.stop(t + 1.55);
    }
  }

  class VisualSyncManager {
    constructor(root) {
      this.root = root;
      this.pulseTimer = 0;
      this.rgbTimer = 0;
      if (this.root) this.root.classList.add("game-console");
    }

    syncTheme(canvasTheme) {
      if (!this.root || !canvasTheme) return;
      this.root.style.setProperty("--pulse-flash-a", canvasTheme.paddleCpu || canvasTheme.net || "#00f3ff");
      this.root.style.setProperty("--pulse-flash-b", canvasTheme.paddlePlayer || canvasTheme.ball || "#ff00ff");
    }

    pulseKick(primary, secondary) {
      if (!this.root) return;
      if (primary) this.root.style.setProperty("--pulse-flash-a", primary);
      if (secondary) this.root.style.setProperty("--pulse-flash-b", secondary);

      this.root.classList.remove("kick-pulse");
      void this.root.offsetWidth;
      this.root.classList.add("kick-pulse");

      clearTimeout(this.pulseTimer);
      this.pulseTimer = window.setTimeout(() => {
        this.root.classList.remove("kick-pulse");
      }, 56);
    }

    triggerRgbSplit() {
      if (!this.root) return;
      this.root.classList.remove("ui-rgb-split");
      void this.root.offsetWidth;
      this.root.classList.add("ui-rgb-split");

      clearTimeout(this.rgbTimer);
      this.rgbTimer = window.setTimeout(() => {
        this.root.classList.remove("ui-rgb-split");
      }, 90);
    }
  }

  class ToxicAnnouncer {
    constructor() {
      this.enabled = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
      this.voice = null;
      this.cooldownMs = 120;
      this.lastSpokenAt = 0;
      this.startLines = [
        "System initialized. Try not to embarrass yourself.",
        "Loading unfair protocols..."
      ];
      this.missLines = [
        "Pathetic.",
        "Calculated.",
        "Too slow, human.",
        "Skill issue detected.",
        "Lag? No, just you."
      ];
      this.highScoreLine = "Glitch detected. Anomalous performance.";

      if (this.enabled) {
        this.selectVoice();
        window.speechSynthesis.addEventListener("voiceschanged", () => this.selectVoice());
      }
    }

    selectVoice() {
      if (!this.enabled) return;
      const voices = window.speechSynthesis.getVoices();
      if (!Array.isArray(voices) || voices.length === 0) return;

      const englishVoices = voices.filter((v) => /^en/i.test(v.lang || ""));
      const pool = englishVoices.length > 0 ? englishVoices : voices;
      const preferred = [
        /robot/i,
        /synth/i,
        /zira|david|mark|guy|james/i,
        /microsoft/i,
        /google/i
      ];

      let chosen = null;
      for (const re of preferred) {
        chosen = pool.find((v) => re.test(v.name));
        if (chosen) break;
      }

      this.voice = chosen || pool[0];
    }

    speak(line, { priority = false, delayMs = 0 } = {}) {
      if (!this.enabled || !line) return;
      const run = () => {
        const synth = window.speechSynthesis;
        const now = performance.now();
        if (!priority && now - this.lastSpokenAt < this.cooldownMs) return;
        this.lastSpokenAt = now;

        const utter = new SpeechSynthesisUtterance(line);
        utter.pitch = 0.8;
        utter.rate = 1.2;
        utter.volume = 0.95;
        if (this.voice) utter.voice = this.voice;

        if (priority) synth.cancel();
        synth.speak(utter);
      };

      if (delayMs > 0) {
        window.setTimeout(run, delayMs);
      } else {
        run();
      }
    }

    announceStart() {
      this.speak(pick(this.startLines), { priority: true });
    }

    announceMiss() {
      this.speak(pick(this.missLines), { priority: true });
    }

    announceHighScore() {
      this.speak(this.highScoreLine, { delayMs: 260 });
    }
  }

  function isMonthDayInRange(date, start, end) {
    const value = (date.getMonth() + 1) * 100 + date.getDate();
    const s = start.m * 100 + start.d;
    const e = end.m * 100 + end.d;
    if (s <= e) return value >= s && value <= e;
    return value >= s || value <= e;
  }

  function parseIsoDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function dayDiff(a, b) {
    const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
    const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
    return Math.round((aa - bb) / (24 * 60 * 60 * 1000));
  }

  function isSeollalWindow(date, table) {
    for (const y of [date.getFullYear() - 1, date.getFullYear(), date.getFullYear() + 1]) {
      if (!table[y]) continue;
      const diff = dayDiff(date, parseIsoDate(table[y]));
      if (diff >= -1 && diff <= 2) return true;
    }
    return false;
  }

  function buildIcosahedronMesh() {
    const phi = (1 + Math.sqrt(5)) / 2;
    const raw = [
      [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
      [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
      [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
    ];
    const vertices = raw.map(([x, y, z]) => {
      const len = Math.hypot(x, y, z);
      return { x: x / len, y: y / len, z: z / len };
    });
    let minDist = Infinity;
    for (let i = 0; i < vertices.length; i += 1) {
      for (let j = i + 1; j < vertices.length; j += 1) {
        const dx = vertices[i].x - vertices[j].x;
        const dy = vertices[i].y - vertices[j].y;
        const dz = vertices[i].z - vertices[j].z;
        const d = Math.hypot(dx, dy, dz);
        if (d < minDist) minDist = d;
      }
    }
    const threshold = minDist * 1.08;
    const edges = [];
    for (let i = 0; i < vertices.length; i += 1) {
      for (let j = i + 1; j < vertices.length; j += 1) {
        const dx = vertices[i].x - vertices[j].x;
        const dy = vertices[i].y - vertices[j].y;
        const dz = vertices[i].z - vertices[j].z;
        const d = Math.hypot(dx, dy, dz);
        if (d <= threshold) edges.push([i, j]);
      }
    }
    return { vertices, edges };
  }

  function buildHypercubeMesh() {
    const outer = [];
    const inner = [];
    for (let i = 0; i < 8; i += 1) {
      const x = i & 1 ? 1 : -1;
      const y = i & 2 ? 1 : -1;
      const z = i & 4 ? 1 : -1;
      outer.push({ x, y, z });
      inner.push({ x: x * 0.62, y: y * 0.62, z: z * 0.62 });
    }
    const vertices = [...outer, ...inner];
    const edges = [];
    for (let i = 0; i < 8; i += 1) {
      for (const bit of [1, 2, 4]) {
        const j = i ^ bit;
        if (i < j) {
          edges.push([i, j]);
          edges.push([i + 8, j + 8]);
        }
      }
      edges.push([i, i + 8]);
    }
    return { vertices, edges };
  }

  function rotatePoint3d(v, ax, ay, az) {
    let x = v.x;
    let y = v.y;
    let z = v.z;

    const cx = Math.cos(ax);
    const sx = Math.sin(ax);
    const cy = Math.cos(ay);
    const sy = Math.sin(ay);
    const cz = Math.cos(az);
    const sz = Math.sin(az);

    let yy = y * cx - z * sx;
    let zz = y * sx + z * cx;
    y = yy;
    z = zz;

    let xx = x * cy + z * sy;
    zz = -x * sy + z * cy;
    x = xx;
    z = zz;

    xx = x * cz - y * sz;
    yy = x * sz + y * cz;
    x = xx;
    y = yy;

    return { x, y, z };
  }

  function normalizeAngle(rad) {
    let out = rad;
    while (out > Math.PI) out -= Math.PI * 2;
    while (out < -Math.PI) out += Math.PI * 2;
    return out;
  }

  function parseColorRgb(color) {
    if (typeof color !== "string") return { r: 255, g: 255, b: 255 };
    const c = color.trim();
    if (c[0] === "#") {
      let hex = c.slice(1);
      if (hex.length === 3) hex = hex.split("").map((ch) => ch + ch).join("");
      if (hex.length >= 6) {
        const n = Number.parseInt(hex.slice(0, 6), 16);
        if (Number.isFinite(n)) {
          return {
            r: (n >> 16) & 255,
            g: (n >> 8) & 255,
            b: n & 255
          };
        }
      }
    }

    const m = c.match(/rgba?\(([^)]+)\)/i);
    if (m) {
      const parts = m[1].split(",").map((v) => Number.parseFloat(v.trim()));
      if (parts.length >= 3 && parts.every((v, i) => i > 2 || Number.isFinite(v))) {
        return {
          r: clamp(Math.round(parts[0]), 0, 255),
          g: clamp(Math.round(parts[1]), 0, 255),
          b: clamp(Math.round(parts[2]), 0, 255)
        };
      }
    }
    return { r: 255, g: 255, b: 255 };
  }

  function mixRgb(a, b, t) {
    const w = clamp(t, 0, 1);
    return {
      r: Math.round(a.r + (b.r - a.r) * w),
      g: Math.round(a.g + (b.g - a.g) * w),
      b: Math.round(a.b + (b.b - a.b) * w)
    };
  }

  function rgba(rgb, alpha = 1) {
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${clamp(alpha, 0, 1).toFixed(3)})`;
  }

  function getCorePalette(canvasTheme) {
    const inner = parseColorRgb(canvasTheme.paddleCpu || canvasTheme.net || "#00f3ff");
    const outer = parseColorRgb(canvasTheme.paddlePlayer || canvasTheme.ball || "#ff00ff");
    const ballTone = parseColorRgb(canvasTheme.ball || "#ccff00");
    const hot = { r: 255, g: 250, b: 238 };
    const cls = themeManager ? themeManager.activeClass : "theme-cyberpunk";

    if (cls === "theme-seollal") {
      const jade = parseColorRgb("#00ff9d");
      const gold = parseColorRgb("#f6cd66");
      return {
        wire: mixRgb(gold, jade, 0.35),
        innerGlow: jade,
        outerGlow: gold,
        plasma: mixRgb(jade, gold, 0.42),
        hot
      };
    }

    if (cls === "theme-april-fools") {
      const cyan = parseColorRgb("#00fffc");
      const pink = parseColorRgb("#ff4ac8");
      return {
        wire: mixRgb(cyan, pink, 0.45),
        innerGlow: cyan,
        outerGlow: pink,
        plasma: mixRgb(cyan, pink, 0.55),
        hot
      };
    }

    return {
      wire: mixRgb(ballTone, mixRgb(inner, outer, 0.5), 0.58),
      innerGlow: mixRgb(inner, hot, 0.08),
      outerGlow: mixRgb(outer, ballTone, 0.24),
      plasma: mixRgb(inner, outer, 0.52),
      hot
    };
  }

  function getCoreMesh() {
    return ball.coreVariant === "hypercube" ? hypercubeCoreMesh : icosaCoreMesh;
  }

  function redrawNoiseTexture() {
    if (!noiseCtx) return;
    const image = noiseCtx.createImageData(noiseTex.width, noiseTex.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const shade = Math.floor(Math.random() * 255);
      image.data[i] = shade;
      image.data[i + 1] = shade;
      image.data[i + 2] = shade;
      image.data[i + 3] = 255;
    }
    noiseCtx.putImageData(image, 0, 0);
    noisePattern = ctx.createPattern(noiseTex, "repeat");
  }

  function flashHudValue(el) {
    if (!el) return;
    el.classList.remove("score-pop");
    void el.offsetWidth;
    el.classList.add("score-pop");
  }

  function setOverlay(title, text, visible, gameOver = false) {
    if (!overlay || !overlayCard || !overlayTitle || !overlayText) return;
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlay.classList.toggle("show", visible);
    overlayCard.classList.toggle("game-over", gameOver);
  }

  function updateHud() {
    returnCountEl.textContent = String(state.returnCount);
    bestCountEl.textContent = String(state.bestCount);
    speedMultEl.textContent = `x${state.speedMultiplier.toFixed(2).replace(/\.?0+$/, "")}`;
  }

  function uniqueAndSortRanking(rows) {
    const out = [];
    const seen = new Set();
    for (const row of rows) {
      if (!row || !Number.isFinite(row.returns) || typeof row.when !== "string") continue;
      const returns = Math.max(0, Math.floor(row.returns));
      const when = row.when.trim();
      const key = `${returns}|${when}`;
      if (!when || seen.has(key)) continue;
      seen.add(key);
      out.push({ returns, when });
    }
    out.sort((a, b) => (b.returns - a.returns) || b.when.localeCompare(a.when));
    return out.slice(0, 10);
  }

  function renderRanking() {
    rankingListEl.innerHTML = "";
    if (state.ranking.length === 0) {
      const li = document.createElement("li");
      li.className = "rank-empty";
      li.textContent = "아직 기록이 없습니다.";
      rankingListEl.appendChild(li);
      return;
    }
    state.ranking.slice(0, 10).forEach((row, idx) => {
      const li = document.createElement("li");
      li.className = "rank-row";

      const place = document.createElement("span");
      place.className = "rank-place";
      place.textContent = `${String(idx + 1).padStart(2, "0")} PLACE`;

      const dots = document.createElement("span");
      dots.className = "rank-dots";
      dots.textContent = "........................";

      const score = document.createElement("span");
      score.className = "rank-score";
      score.textContent = `${row.returns} WINS`;

      const when = document.createElement("span");
      when.className = "rank-when";
      when.textContent = row.when;

      li.append(place, dots, score, when);
      rankingListEl.appendChild(li);
    });
  }

  function loadRanking() {
    try {
      const parsed = JSON.parse(localStorage.getItem(rankingStorageKey) || "[]");
      state.ranking = Array.isArray(parsed) ? uniqueAndSortRanking(parsed) : [];
    } catch {
      state.ranking = [];
    }
  }

  function saveRanking() {
    localStorage.setItem(rankingStorageKey, JSON.stringify(state.ranking.slice(0, 10)));
  }

  function pushRanking(returns) {
    const now = new Date();
    const when = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    state.ranking = uniqueAndSortRanking([...state.ranking, { returns, when }]);
    saveRanking();
    renderRanking();
  }

  function showToast(msg) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.style.position = "fixed";
      el.style.left = "50%";
      el.style.bottom = "18px";
      el.style.transform = "translateX(-50%)";
      el.style.padding = "10px 12px";
      el.style.zIndex = "9999";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.display = "block";
    clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      el.style.display = "none";
    }, 1400);
  }

  function getBoost() {
    const n = Number.parseFloat(boostInput.value);
    if (Number.isFinite(n) && n > 1 && n < 8) return n;
    boostInput.value = defaultBoost.toFixed(2);
    return defaultBoost;
  }

  function randomizeBallAppearance(force = false) {
    const ballMode = themeManager ? themeManager.canvas.ballMode : "mixed";
    ball.mode = "core";
    ball.coreVariant = Math.random() < 0.36 ? "hypercube" : "icosa";
    ball.coreSeed = random(0, Math.PI * 2);
    ball.coreSpin = random(0.74, 1.36);

    if (ballMode === "seollal") {
      ball.size = 17;
      return;
    }

    if (ballMode === "emoji") {
      ball.size = 17;
      ball.coreVariant = "hypercube";
      return;
    }

    ball.size = force ? random(16, 18.2) : random(15.2, 17.8);
  }

  function resetServe(direction = (Math.random() < 0.65 ? -1 : 1), resetRun = false) {
    player.y = H / 2 - player.h / 2;
    cpu.y = H / 2 - cpu.h / 2;
    ball.x = W / 2;
    ball.y = H / 2;

    if (resetRun) state.returnCount = 0;
    state.speedMultiplier = 1;
    updateHud();

    const angle = random(-0.52, 0.52);
    ball.vx = Math.cos(angle) * ball.baseSpeed * direction;
    ball.vy = Math.sin(angle) * ball.baseSpeed;
    randomizeBallAppearance();
  }

  function startGame() {
    if (state.running) return;
    soundManager.unlock();
    announcer.announceStart();
    state.running = true;
    setOverlay("", "", false);
    if (ball.vx === 0 && ball.vy === 0) resetServe(undefined, true);
    state.lastTime = performance.now();
    state.rafId = requestAnimationFrame(loop);
  }

  function stopGame() {
    state.running = false;
    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = 0;
    }
  }

  function restartGame() {
    stopGame();
    resetServe(undefined, true);
    startGame();
  }

  function trimTrailParticles(limit = 480) {
    if (trailParticles.length <= limit) return;
    trailParticles.splice(0, trailParticles.length - limit);
  }

  function pushTrailParticle(type, x, y, vx, vy, life, size, extra = {}) {
    trailParticles.push({
      type,
      x,
      y,
      prevX: x,
      prevY: y,
      vx,
      vy,
      life,
      maxLife: life,
      age: 0,
      size,
      drag: 0.93,
      phase: random(0, Math.PI * 2),
      curve: random(-110, 110),
      glyph: Math.random() < 0.5 ? "0" : "1",
      jitter: random(0.5, 1.8),
      whip: false,
      ...extra
    });
  }

  function createParticles(dt = 1 / 60, burst = 0) {
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed <= 0) return;

    const speedFactor = clamp(speed / ball.baseSpeed, 0.8, 3.4);
    const emitCount = Math.round(clamp(3 + speedFactor * 1.8 + burst + dt * 40, 3, 11));
    const inv = speed > 0 ? 1 / speed : 0;
    const dirX = ball.vx * inv;
    const dirY = ball.vy * inv;
    const tailX = -dirX;
    const tailY = -dirY;
    const sideX = -dirY;
    const sideY = dirX;

    for (let i = 0; i < emitCount; i += 1) {
      const roll = Math.random();
      const type = roll < 0.44 ? "spark" : (roll < 0.74 ? "binary" : "wisp");
      const backOffset = random(0, ball.size * 0.86);
      const sideOffset = random(-ball.size * 0.35, ball.size * 0.35);
      const x = ball.x + tailX * backOffset + sideX * sideOffset + random(-1.1, 1.1);
      const y = ball.y + tailY * backOffset + sideY * sideOffset + random(-1.1, 1.1);

      let vx = tailX * speed * random(0.2, 0.38) + sideX * speed * random(-0.22, 0.22) + random(-36, 36);
      let vy = tailY * speed * random(0.2, 0.38) + sideY * speed * random(-0.22, 0.22) + random(-36, 36);

      if (type === "spark") {
        pushTrailParticle(type, x, y, vx, vy, random(0.32, 0.74), random(1.2, 2.8), {
          drag: random(0.84, 0.9),
          curve: random(-50, 50),
          jitter: random(0.5, 1.4)
        });
      } else if (type === "binary") {
        vx *= 0.76;
        vy *= 0.76;
        pushTrailParticle(type, x, y, vx, vy, random(0.5, 1.02), random(9.5, 13.5), {
          drag: random(0.89, 0.93),
          curve: random(-36, 36),
          jitter: random(0.4, 1.2)
        });
      } else {
        vx *= 0.52;
        vy *= 0.52;
        pushTrailParticle(type, x, y, vx, vy, random(0.72, 1.3), random(3.8, 7.4), {
          drag: random(0.92, 0.96),
          curve: random(-170, 170),
          jitter: random(0.8, 2.2)
        });
      }
    }

    trimTrailParticles();
  }

  function createWhipTrail(prevVX, prevVY, nextVX, nextVY) {
    const prevSpeed = Math.hypot(prevVX, prevVY);
    const nextSpeed = Math.hypot(nextVX, nextVY);
    if (prevSpeed < 60 || nextSpeed < 60) return;

    const prevAngle = Math.atan2(prevVY, prevVX);
    const nextAngle = Math.atan2(nextVY, nextVX);
    const delta = normalizeAngle(nextAngle - prevAngle);
    const turnDir = Math.sign(delta) || 1;
    const arcSpan = Math.min(Math.abs(delta), Math.PI * 0.88);
    const count = Math.round(clamp(11 + nextSpeed / 62, 12, 26));

    for (let i = 0; i < count; i += 1) {
      const t = i / Math.max(1, count - 1);
      const arcAngle = nextAngle - turnDir * (1 - t) * arcSpan;
      const sideAngle = arcAngle + turnDir * (Math.PI / 2);
      const dist = ball.size * 0.58 + (1 - t) * ball.size * 3.2;
      const x = ball.x - Math.cos(arcAngle) * dist + Math.cos(sideAngle) * random(-2.8, 2.8);
      const y = ball.y - Math.sin(arcAngle) * dist + Math.sin(sideAngle) * random(-2.8, 2.8);

      const follow = nextSpeed * (0.2 + (1 - t) * 0.24);
      const tangent = nextSpeed * turnDir * (1 - t) * 0.18;
      const baseVX = -Math.cos(arcAngle) * follow - Math.sin(arcAngle) * tangent + random(-16, 16);
      const baseVY = -Math.sin(arcAngle) * follow + Math.cos(arcAngle) * tangent + random(-16, 16);

      if (i % 5 === 0) {
        pushTrailParticle("binary", x, y, baseVX * 0.72, baseVY * 0.72, random(0.52, 1.05), random(10, 13.5), {
          drag: random(0.9, 0.94),
          curve: random(-45, 45),
          whip: true
        });
      } else if (i % 2 === 0) {
        pushTrailParticle("wisp", x, y, baseVX * 0.55, baseVY * 0.55, random(0.72, 1.34), random(4, 7.8), {
          drag: random(0.93, 0.96),
          curve: turnDir * random(110, 220),
          jitter: random(1.2, 2.6),
          whip: true
        });
      } else {
        pushTrailParticle("spark", x, y, baseVX, baseVY, random(0.34, 0.78), random(1.4, 3.2), {
          drag: random(0.86, 0.91),
          curve: turnDir * random(-80, 80),
          whip: true
        });
      }
    }

    trimTrailParticles();
  }

  function spawnImpactParticles(x, y, color) {
    for (let i = 0; i < 12; i += 1) {
      impactParticles.push({
        x,
        y,
        vx: random(-190, 190),
        vy: random(-170, 170),
        life: random(0.16, 0.38),
        maxLife: 0.38,
        size: random(2, 4),
        color
      });
    }
  }

  function updateParticles(dt) {
    const frameScale = dt * 60;

    for (let i = trailParticles.length - 1; i >= 0; i -= 1) {
      const p = trailParticles[i];
      p.prevX = p.x;
      p.prevY = p.y;
      p.age += dt;

      if (p.type === "wisp") {
        const perpX = -p.vy;
        const perpY = p.vx;
        const norm = Math.hypot(perpX, perpY) || 1;
        const lifeRatio = clamp(p.life / p.maxLife, 0, 1);
        const curveForce = (p.curve || 0) * lifeRatio;
        p.vx += (perpX / norm) * curveForce * dt;
        p.vy += (perpY / norm) * curveForce * dt;
        p.vx += Math.sin(p.phase + p.age * 7.4) * (p.jitter || 1) * 6 * dt;
        p.vy += Math.cos(p.phase + p.age * 6.9) * (p.jitter || 1) * 6 * dt;
        p.curve *= 0.987;
      } else if (p.type === "binary") {
        p.vx += Math.sin(p.phase + p.age * 8.3) * (p.jitter || 1) * 2.5 * dt;
        p.vy += Math.cos(p.phase + p.age * 7.7) * (p.jitter || 1) * 2.5 * dt;
      } else if (p.whip) {
        p.vx += Math.sin(p.phase + p.age * 11.8) * 16 * dt;
        p.vy += Math.cos(p.phase + p.age * 11.1) * 16 * dt;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const drag = Math.pow(p.drag || 0.93, frameScale);
      p.vx *= drag;
      p.vy *= drag;
      p.life -= dt;
      if (p.life <= 0) trailParticles.splice(i, 1);
    }

    for (let i = impactParticles.length - 1; i >= 0; i -= 1) {
      const p = impactParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.91;
      p.vy *= 0.91;
      p.life -= dt;
      if (p.life <= 0) impactParticles.splice(i, 1);
    }
  }

  function triggerImpactFx() {
    if (appRoot) {
      appRoot.classList.remove("screen-shake");
      void appRoot.offsetWidth;
      appRoot.classList.add("screen-shake");
    }

    clearTimeout(state.impactTimer);
    state.impactTimer = window.setTimeout(() => {
      if (appRoot) appRoot.classList.remove("screen-shake");
    }, 180);
  }

  function triggerTitleGlitch() {
    if (!mainTitle) return;
    mainTitle.style.setProperty("--title-gx", `${random(-3.8, 3.8).toFixed(2)}px`);
    mainTitle.style.setProperty("--title-gy", `${random(-2.6, 2.6).toFixed(2)}px`);
    mainTitle.classList.remove("glitch-burst");
    void mainTitle.offsetWidth;
    mainTitle.classList.add("glitch-burst");
    window.setTimeout(() => mainTitle.classList.remove("glitch-burst"), 230);
  }

  function startTitleGlitchLoop() {
    clearInterval(state.titleTimer);
    state.titleTimer = window.setInterval(triggerTitleGlitch, 3000);
  }

  function syncUnfairLabel() {
    if (!unfairBtn) return;
    const defaultText = unfairBtn.dataset.defaultText || "DON'T CLICK ME";
    const hoverText = unfairBtn.dataset.hoverText || "WHY DID YOU CLICK?";
    unfairBtn.textContent = unfairHovering ? hoverText : defaultText;
  }

  function updateUnfairJitter(clientX, clientY) {
    if (!unfairBtn) return;
    const rect = unfairBtn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.hypot(clientX - cx, clientY - cy);

    if (dist < 180) {
      const max = dist < 90 ? 3.2 : 2.3;
      unfairBtn.style.setProperty("--jitter-x", `${random(-max, max).toFixed(2)}px`);
      unfairBtn.style.setProperty("--jitter-y", `${random(-max, max).toFixed(2)}px`);
      unfairBtn.classList.add("near");
    } else {
      unfairBtn.style.setProperty("--jitter-x", "0px");
      unfairBtn.style.setProperty("--jitter-y", "0px");
      unfairBtn.classList.remove("near");
    }
  }

  function toggleChaosMode() {
    state.chaosMode = !state.chaosMode;
    unfairBtn.classList.toggle("active", state.chaosMode);

    if (state.chaosMode) {
      document.body.classList.add("window-vibe");
      state.nextChaosAt = performance.now() + random(400, 900);
    } else {
      document.body.classList.remove("window-vibe");
      state.controlsInvertedUntil = 0;
      state.chaosFlashHideAt = 0;
      chaosEmojiEl.classList.remove("show");
      chaosHintEl.classList.remove("show");
    }

    syncUnfairLabel();
  }

  function updateChaos(now) {
    if (!state.chaosMode) return;

    if (now >= state.nextChaosAt) {
      state.controlsInvertedUntil = now + 1900;
      state.nextChaosAt = now + random(1500, 3200);
      state.chaosFlashHideAt = now + 520;

      chaosHintEl.classList.add("show");
      chaosEmojiEl.textContent = pick(trollEmojis);
      chaosEmojiEl.classList.add("show");

      triggerTitleGlitch();
    }

    if (state.chaosFlashHideAt > 0 && now >= state.chaosFlashHideAt) {
      chaosEmojiEl.classList.remove("show");
      chaosHintEl.classList.remove("show");
      state.chaosFlashHideAt = 0;
    }
  }

  function onGameOver() {
    stopGame();
    ball.vx = 0;
    ball.vy = 0;
    soundManager.playGameOver();
    uiFx.triggerRgbSplit();
    announcer.announceMiss();

    const isNewBest = state.returnCount > state.bestCount;
    if (isNewBest) {
      state.bestCount = state.returnCount;
      flashHudValue(bestCountEl);
      announcer.announceHighScore();
    }

    pushRanking(state.returnCount);
    updateHud();

    const taunt = pick(taunts);
    const emoji = pick(trollEmojis);
    setOverlay(`SIGNAL LOST ${emoji}`, `${taunt} | 이번 판 반환 ${state.returnCount}회`, true, true);
  }

  function ballHalf() {
    return ball.size / 2;
  }

  function paddleCollision(p) {
    const half = ballHalf();
    const inX = ball.x + half >= p.x && ball.x - half <= p.x + p.w;
    const inY = ball.y + half >= p.y && ball.y - half <= p.y + p.h;
    return inX && inY;
  }

  function bounceFromPaddle(p, toRight) {
    const rel = (ball.y - (p.y + p.h / 2)) / (p.h / 2);
    const angle = rel * 0.92;
    const speed = Math.hypot(ball.vx, ball.vy);
    ball.vx = Math.cos(angle) * speed * (toRight ? 1 : -1);
    ball.vy = Math.sin(angle) * speed;
  }

  function updatePlayer(dt, now) {
    const invert = now < state.controlsInvertedUntil;

    if (pointerActive) {
      const target = invert ? H - pointerY : pointerY;
      player.y = clamp(target - player.h / 2, 0, H - player.h);
      return;
    }

    let dir = 0;
    if (keys.up) dir -= 1;
    if (keys.down) dir += 1;
    if (invert) dir *= -1;

    player.y = clamp(player.y + dir * player.speed * dt, 0, H - player.h);
  }

  function updateCpu(dt) {
    const targetY = ball.y - cpu.h / 2;
    const delta = targetY - cpu.y;
    const follow = delta * cpu.aim;
    const maxStep = cpu.speed * dt;
    cpu.y = clamp(cpu.y + clamp(follow, -maxStep, maxStep), 0, H - cpu.h);
  }

  function updateBall(dt, canvasTheme) {
    const half = ballHalf();
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    createParticles(dt);

    if (ball.y - half < 0) {
      ball.y = half;
      ball.vy *= -1;
      soundManager.playWallHit();
      uiFx.triggerRgbSplit();
    }

    if (ball.y + half > H) {
      ball.y = H - half;
      ball.vy *= -1;
      soundManager.playWallHit();
      uiFx.triggerRgbSplit();
    }

    if (ball.vx < 0 && paddleCollision(player)) {
      const prevVX = ball.vx;
      const prevVY = ball.vy;
      ball.x = player.x + player.w + half;
      bounceFromPaddle(player, true);
      soundManager.playPaddleHit();
      uiFx.pulseKick(canvasTheme.paddlePlayer, canvasTheme.paddleCpu);
      createWhipTrail(prevVX, prevVY, ball.vx, ball.vy);
      createParticles(dt, 2.6);

      state.returnCount += 1;
      if (state.returnCount > state.bestCount) {
        state.bestCount = state.returnCount;
        flashHudValue(bestCountEl);
      }

      updateHud();
      flashHudValue(returnCountEl);
      spawnImpactParticles(ball.x, ball.y, canvasTheme.paddlePlayer);
      triggerImpactFx();
      if (Math.random() < 0.4) randomizeBallAppearance();
    }

    if (ball.vx > 0 && paddleCollision(cpu)) {
      const prevVX = ball.vx;
      const prevVY = ball.vy;
      ball.x = cpu.x - half;
      bounceFromPaddle(cpu, false);
      soundManager.playPaddleHit();
      uiFx.pulseKick(canvasTheme.paddleCpu, canvasTheme.paddlePlayer);

      const boost = getBoost();
      state.speedMultiplier *= boost;
      ball.vx *= boost;
      ball.vy *= boost;
      createWhipTrail(prevVX, prevVY, ball.vx, ball.vy);
      createParticles(dt, 3.2);

      updateHud();
      flashHudValue(speedMultEl);
      spawnImpactParticles(ball.x, ball.y, canvasTheme.paddleCpu);
      triggerImpactFx();
      if (Math.random() < 0.4) randomizeBallAppearance();
    }

    if (ball.x + half < 0) onGameOver();
    if (ball.x - half > W) {
      soundManager.playScorePoint();
      uiFx.triggerRgbSplit();
      resetServe(-1, false);
    }
  }

  function drawBloom(x, y, radius, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function drawBackground(now, canvasTheme) {
    ctx.fillStyle = canvasTheme.ambient;
    ctx.fillRect(0, 0, W, H);

    drawBloom(player.x + player.w / 2, player.y + player.h / 2, 120, canvasTheme.bloomPlayer);
    drawBloom(cpu.x + cpu.w / 2, cpu.y + cpu.h / 2, 148, canvasTheme.bloomCpu);
    drawBloom(ball.x, ball.y, 130, canvasTheme.bloomBall);

    if (now - noiseUpdatedAt > 70) {
      redrawNoiseTexture();
      noiseUpdatedAt = now;
    }

    if (noisePattern) {
      ctx.save();
      ctx.globalAlpha = canvasTheme.noiseAlpha;
      ctx.fillStyle = noisePattern;
      ctx.translate((now * 0.032) % noiseTex.width, (now * 0.023) % noiseTex.height);
      ctx.fillRect(-noiseTex.width, -noiseTex.height, W + noiseTex.width * 2, H + noiseTex.height * 2);
      ctx.restore();
    }

    if (Math.random() < 0.06) {
      const y = random(16, H - 16);
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, y, W, random(1, 2.8));
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = canvasTheme.ghost;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "120px 'JetBrains Mono', 'Fira Code', monospace";
    ctx.fillText(String(state.returnCount).padStart(2, "0"), W / 2, H / 2);
    ctx.restore();
  }

  function drawNet(canvasTheme) {
    ctx.save();
    ctx.strokeStyle = canvasTheme.net;
    ctx.shadowBlur = 20;
    ctx.shadowColor = canvasTheme.netGlow;
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 12]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.restore();
  }

  function drawPaddle(p, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowBlur = 18;
    ctx.shadowColor = color;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(255,255,255,0.14)";
    for (let y = 6; y < p.h; y += 12) {
      ctx.fillRect(p.x + 2, p.y + y, p.w - 4, 2);
    }

    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
    ctx.restore();
  }

  function drawTrail(canvasTheme, now) {
    const palette = getCorePalette(canvasTheme);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const p of trailParticles) {
      const life = clamp(p.life / p.maxLife, 0, 1);
      const fade = life * life;

      if (p.type === "spark") {
        ctx.globalAlpha = 0.08 + fade * 0.9;
        ctx.strokeStyle = rgba(palette.innerGlow, 0.34 + fade * 0.52);
        ctx.lineWidth = 0.85 + p.size * 0.48;
        ctx.beginPath();
        ctx.moveTo(p.prevX, p.prevY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        ctx.fillStyle = rgba(palette.hot, 0.3 + fade * 0.7);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.56 + fade * 0.5), 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      if (p.type === "binary") {
        ctx.globalAlpha = 0.1 + fade * 0.72;
        ctx.fillStyle = rgba(palette.outerGlow, 0.35 + fade * 0.65);
        ctx.font = `${Math.max(9, Math.round(p.size))}px "JetBrains Mono", "Fira Code", monospace`;
        const wobbleX = Math.sin(now * 0.012 + p.phase + p.age * 6.6) * (p.jitter || 1) * 0.6;
        const wobbleY = Math.cos(now * 0.011 + p.phase + p.age * 6.1) * (p.jitter || 1) * 0.5;
        ctx.fillText(p.glyph || "0", p.x + wobbleX, p.y + wobbleY);
        continue;
      }

      const speed = Math.hypot(p.vx, p.vy);
      const angle = Math.atan2(p.vy, p.vx);
      const length = p.size * (1.7 + fade * 0.9) + speed * 0.015;
      const width = p.size * (0.66 + fade * 0.48);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      ctx.globalAlpha = 0.08 + fade * 0.54;
      ctx.shadowBlur = 10 + fade * 16;
      ctx.shadowColor = rgba(palette.plasma, 0.4 + fade * 0.5);
      ctx.fillStyle = rgba(palette.plasma, 0.22 + fade * 0.34);
      ctx.beginPath();
      ctx.ellipse(0, 0, length, width, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  function drawImpacts() {
    ctx.save();
    for (const p of impactParticles) {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.restore();
  }

  function drawPixelSprite(cx, cy, spriteRows, palette, pixelSize) {
    const rows = spriteRows.length;
    const cols = spriteRows[0].length;
    const startX = Math.round(cx - (cols * pixelSize) / 2);
    const startY = Math.round(cy - (rows * pixelSize) / 2);

    for (let y = 0; y < rows; y += 1) {
      const row = spriteRows[y];
      for (let x = 0; x < cols; x += 1) {
        const code = row[x];
        if (code === "0") continue;
        const color = palette[code];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(startX + x * pixelSize, startY + y * pixelSize, pixelSize, pixelSize);
      }
    }
  }

  function drawBall(canvasTheme, now) {
    const palette = getCorePalette(canvasTheme);
    const mesh = getCoreMesh();
    const speed = Math.hypot(ball.vx, ball.vy);
    const speedFactor = clamp(speed / ball.baseSpeed, 0.78, 2.85);
    const pulse = 0.62 + 0.38 * Math.sin(now * 0.0108 + ball.x * 0.014 + ball.y * 0.009);
    const coreRadius = Math.max(ball.size * 0.84, 11);
    const auraRadius = coreRadius * (2 + pulse * 0.24);

    const ax = ball.coreSeed * 0.37 + now * 0.00115 * ball.coreSpin * speedFactor;
    const ay = ball.coreSeed * 0.73 + now * 0.00152 * (2 - ball.coreSpin * 0.36) * speedFactor;
    const az = ball.coreSeed * 1.08 + now * 0.0013 * (1 + ball.coreSpin * 0.2) * speedFactor;
    const depth = 2.9;

    const projected = mesh.vertices.map((v) => {
      const r = rotatePoint3d(v, ax, ay, az);
      const perspective = depth / (depth - r.z * 0.92);
      return {
        x: ball.x + r.x * coreRadius * perspective,
        y: ball.y + r.y * coreRadius * perspective,
        z: r.z
      };
    });

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    const aura = ctx.createRadialGradient(ball.x, ball.y, coreRadius * 0.15, ball.x, ball.y, auraRadius);
    aura.addColorStop(0, rgba(palette.hot, 0.28 + pulse * 0.18));
    aura.addColorStop(0.25, rgba(palette.innerGlow, 0.26 + pulse * 0.18));
    aura.addColorStop(0.56, rgba(palette.outerGlow, 0.2 + pulse * 0.16));
    aura.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, auraRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 22 + pulse * 16;
    ctx.shadowColor = rgba(palette.innerGlow, 0.76);
    ctx.lineWidth = 1.2 + pulse * 0.8;
    ctx.strokeStyle = rgba(palette.innerGlow, 0.38 + pulse * 0.4);
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, coreRadius * 1.25, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 28 + pulse * 18;
    ctx.shadowColor = rgba(palette.outerGlow, 0.72);
    ctx.lineWidth = 1.05 + pulse * 0.52;
    ctx.strokeStyle = rgba(palette.outerGlow, 0.34 + pulse * 0.32);
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, coreRadius * 1.73, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.setLineDash([7, 5]);
    ctx.lineDashOffset = -now * 0.05 * speedFactor;
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = rgba(palette.plasma, 0.46 + pulse * 0.2);
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, coreRadius * 1.04, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const sortedEdges = mesh.edges
      .map(([a, b]) => {
        const va = projected[a];
        const vb = projected[b];
        return { a: va, b: vb, z: (va.z + vb.z) * 0.5 };
      })
      .sort((lhs, rhs) => lhs.z - rhs.z);

    for (const edge of sortedEdges) {
      const near = clamp((edge.z + 1) * 0.5, 0, 1);
      const alpha = 0.2 + near * 0.42 + pulse * 0.22;
      const width = 0.86 + near * 1.2;
      const glowColor = near > 0.52 ? palette.innerGlow : palette.wire;
      ctx.strokeStyle = rgba(glowColor, alpha);
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(edge.a.x, edge.a.y);
      ctx.lineTo(edge.b.x, edge.b.y);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${Math.max(8, Math.round(coreRadius * 0.78))}px "JetBrains Mono", "Fira Code", monospace`;
    for (let i = 0; i < 10; i += 1) {
      const angle = now * 0.0043 + i * (Math.PI * 2 / 10) + ball.coreSeed * 0.5;
      const radius = coreRadius * (0.34 + 0.16 * Math.sin(now * 0.008 + i * 1.1));
      const x = ball.x + Math.cos(angle) * radius;
      const y = ball.y + Math.sin(angle * 1.22) * radius * 0.7;
      const alpha = 0.14 + 0.24 * pulse + 0.14 * Math.sin(now * 0.01 + i);
      ctx.fillStyle = rgba(palette.plasma, alpha);
      ctx.fillText(i % 2 === 0 ? "0" : "1", x, y);
    }
    ctx.restore();

    ctx.save();
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = rgba(palette.innerGlow, 0.34 + pulse * 0.2);
    for (let i = 0; i < 5; i += 1) {
      const a = now * 0.005 + i * 1.23 + ball.coreSeed;
      const b = a + Math.sin(now * 0.01 + i * 0.8) * 1.08;
      const r = coreRadius * (0.24 + 0.1 * Math.sin(now * 0.007 + i * 1.5));
      const x1 = ball.x + Math.cos(a) * r;
      const y1 = ball.y + Math.sin(a * 1.3) * r;
      const x2 = ball.x + Math.cos(b) * (r + coreRadius * 0.16);
      const y2 = ball.y + Math.sin(b * 1.1) * (r + coreRadius * 0.14);
      const cx = ball.x + Math.cos((a + b) * 0.5) * coreRadius * 0.12;
      const cy = ball.y + Math.sin((a + b) * 0.5) * coreRadius * 0.12;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cx, cy, x2, y2);
      ctx.stroke();
    }
    ctx.restore();

    const coreGlow = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, coreRadius * 0.94);
    coreGlow.addColorStop(0, rgba(palette.hot, 0.98));
    coreGlow.addColorStop(0.24, rgba(palette.hot, 0.75));
    coreGlow.addColorStop(0.56, rgba(palette.innerGlow, 0.32 + pulse * 0.2));
    coreGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, coreRadius * 0.94, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawScene(now, canvasTheme) {
    drawBackground(now, canvasTheme);
    drawNet(canvasTheme);
    drawTrail(canvasTheme, now);
    drawPaddle(player, canvasTheme.paddlePlayer);
    drawPaddle(cpu, canvasTheme.paddleCpu);
    drawImpacts();
    drawBall(canvasTheme, now);
  }

  function loop(now) {
    if (!state.running) return;

    const dt = Math.min((now - state.lastTime) / 1000, 0.033);
    state.lastTime = now;

    updateChaos(now);
    updatePlayer(dt, now);
    updateCpu(dt);
    updateBall(dt, themeManager.canvas);
    updateParticles(dt);
    drawScene(now, themeManager.canvas);

    state.rafId = requestAnimationFrame(loop);
  }

  function pointerToCanvasY(clientY) {
    const rect = canvas.getBoundingClientRect();
    return ((clientY - rect.top) / rect.height) * H;
  }

  function primeAudio() {
    soundManager.unlock();
  }

  window.addEventListener("pointerdown", primeAudio, { passive: true });
  window.addEventListener("touchstart", primeAudio, { passive: true });

  window.addEventListener("keydown", (e) => {
    primeAudio();
    const k = e.key.toLowerCase();
    if (k === "arrowup" || k === "w") {
      keys.up = true;
      e.preventDefault();
    }
    if (k === "arrowdown" || k === "s") {
      keys.down = true;
      e.preventDefault();
    }
  }, { passive: false });

  window.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    if (k === "arrowup" || k === "w") keys.up = false;
    if (k === "arrowdown" || k === "s") keys.down = false;
  });

  window.addEventListener("mousemove", (e) => {
    updateUnfairJitter(e.clientX, e.clientY);
  });

  canvas.addEventListener("mousemove", (e) => {
    pointerActive = true;
    pointerY = pointerToCanvasY(e.clientY);
  });

  canvas.addEventListener("mouseleave", () => {
    pointerActive = false;
  });

  canvas.addEventListener("touchstart", (e) => {
    primeAudio();
    pointerActive = true;
    pointerY = pointerToCanvasY(e.touches[0].clientY);
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener("touchmove", (e) => {
    pointerActive = true;
    pointerY = pointerToCanvasY(e.touches[0].clientY);
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener("touchend", () => {
    pointerActive = false;
  });

  startBtn.addEventListener("click", () => {
    primeAudio();
    if (state.running) return;
    if (ball.vx === 0 && ball.vy === 0) resetServe(undefined, true);
    startGame();
  });

  restartBtn.addEventListener("click", () => {
    primeAudio();
    restartGame();
  });

  unfairBtn.addEventListener("mouseenter", () => {
    unfairHovering = true;
    syncUnfairLabel();
  });

  unfairBtn.addEventListener("mouseleave", () => {
    unfairHovering = false;
    syncUnfairLabel();
  });

  unfairBtn.addEventListener("click", () => {
    primeAudio();
    toggleChaosMode();
    if (!state.running) {
      const text = state.chaosMode
        ? "카오스 모드 ON. 랜덤 조작 반전 + 글리치 쇼크 활성화"
        : "카오스 모드 OFF. 시스템이 잠시 정상처럼 보입니다.";
      setOverlay("KING-BAT-NEUN MODE", text, true, false);
    }
  });

  exportRankingBtn.addEventListener("click", () => {
    const data = localStorage.getItem(rankingStorageKey) || "[]";
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ranking.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("랭킹 내보내기 완료");
  });

  importRankingBtn.addEventListener("click", () => importRankingInput.click());

  importRankingInput.addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error("invalid");
      state.ranking = uniqueAndSortRanking([...state.ranking, ...parsed]);
      saveRanking();
      state.bestCount = state.ranking.length > 0 ? state.ranking[0].returns : state.bestCount;
      renderRanking();
      updateHud();
      showToast("랭킹 가져오기 완료");
    } catch {
      showToast("랭킹 가져오기 실패");
    } finally {
      importRankingInput.value = "";
    }
  });

  soundManager = new SoundManager();
  announcer = new ToxicAnnouncer();
  uiFx = new VisualSyncManager(appRoot);

  themeManager = new ThemeManager();
  themeManager.apply(new Date());
  themeManager.watchMidnight(() => {
    drawScene(performance.now(), themeManager.canvas);
  });

  redrawNoiseTexture();
  loadRanking();
  state.bestCount = state.ranking.length > 0 ? state.ranking[0].returns : 0;
  renderRanking();
  updateHud();

  syncUnfairLabel();
  startTitleGlitchLoop();

  setOverlay("START SIGNAL을 눌러 시작", "PC: 화살표/W/S, 마우스 이동 | 모바일: 터치 드래그", true, false);
  drawScene(performance.now(), themeManager.canvas);
})();
