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
    phase: 0,
    lastRallySync: -1,
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

  const phaseConfigs = [
    {
      id: 0,
      name: "COLD LOGIC",
      primary: "#2e9cff",
      secondary: "#00e4ff",
      bg: "#040c1b",
      text: "#88deff",
      glow: 0.45,
      gridSpeedMs: 280,
      trailLife: 1,
      trailScale: 1,
      spin: 0.95,
      pulse: 0.9
    },
    {
      id: 1,
      name: "SYSTEM WARNING",
      primary: "#ff9d1f",
      secondary: "#ffcc4a",
      bg: "#190b03",
      text: "#ffd896",
      glow: 0.7,
      gridSpeedMs: 170,
      trailLife: 1.45,
      trailScale: 1.18,
      spin: 1.4,
      pulse: 1.12
    },
    {
      id: 2,
      name: "CRITICAL OVERHEAT",
      primary: "#ff234c",
      secondary: "#ff6f82",
      bg: "#1a0309",
      text: "#ffd6dc",
      glow: 0.85,
      gridSpeedMs: 125,
      trailLife: 1.75,
      trailScale: 1.35,
      spin: 1.88,
      pulse: 1.8
    },
    {
      id: 3,
      name: "VOID/GLITCH MODE",
      primary: "#111111",
      secondary: "#f2f6ff",
      bg: "#ebeff7",
      text: "#101725",
      glow: 0.96,
      gridSpeedMs: 82,
      trailLife: 2.05,
      trailScale: 1.6,
      spin: 2.15,
      pulse: 2.25
    }
  ];

  let themeManager;
  let soundEngine;
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
      if (uiFx) uiFx.syncTheme(this.canvas);

      randomizeBallAppearance(true);
      applyPhaseCssVars(state.phase);
      renderThemeLabel();
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

  class SoundEngine {
    constructor() {
      this.AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.enabled = Boolean(this.AudioContextClass);
      this.ctx = null;
      this.master = null;
      this.musicBus = null;
      this.sfxBus = null;
      this.compressor = null;
      this.noiseBuffer = null;
      this.distortionCurve = this.buildDistortionCurve(180);

      this.started = false;
      this.droneOscA = null;
      this.droneOscB = null;
      this.droneFilter = null;
      this.droneDrive = null;
      this.droneGain = null;
      this.heartbeatGain = null;
      this.nextBeatAt = 0;
      this.beatTimer = 0;
      this.beatIndex = 0;

      this.phase = 0;
      this.rally = 0;
      this.currentTempo = 66;
      this.targetTempo = 66;
      this.targetFreq = 44;
    }

    ensureContext() {
      if (!this.enabled) return null;
      if (this.ctx) return this.ctx;

      this.ctx = new this.AudioContextClass();
      const c = this.ctx;

      this.master = c.createGain();
      this.master.gain.value = 0.84;

      this.musicBus = c.createGain();
      this.musicBus.gain.value = 0.66;

      this.sfxBus = c.createGain();
      this.sfxBus.gain.value = 0.9;

      this.compressor = c.createDynamicsCompressor();
      this.compressor.threshold.value = -20;
      this.compressor.knee.value = 20;
      this.compressor.ratio.value = 8;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.24;

      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(this.compressor);
      this.compressor.connect(c.destination);

      this.noiseBuffer = this.createNoiseBuffer();
      return c;
    }

    unlock() {
      const c = this.ensureContext();
      if (!c) return Promise.resolve(false);
      if (c.state === "suspended") {
        return c.resume().then(() => true).catch(() => false);
      }
      return Promise.resolve(true);
    }

    buildDistortionCurve(amount = 160) {
      const n = 44100;
      const curve = new Float32Array(n);
      const deg = Math.PI / 180;
      for (let i = 0; i < n; i += 1) {
        const x = (i * 2) / n - 1;
        curve[i] = ((3 + amount) * x * 18 * deg) / (Math.PI + amount * Math.abs(x));
      }
      return curve;
    }

    createDistortion(amount = 160) {
      if (!this.ctx) return null;
      const node = this.ctx.createWaveShaper();
      node.curve = amount === 180 ? this.distortionCurve : this.buildDistortionCurve(amount);
      node.oversample = "4x";
      return node;
    }

    createNoiseBuffer() {
      const c = this.ctx;
      if (!c) return null;
      const len = Math.floor((c.sampleRate || 44100) * 2);
      const buf = c.createBuffer(1, len, c.sampleRate || 44100);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = random(-1, 1);
      return buf;
    }

    setProgress(rallyCount, phase) {
      this.rally = Math.max(0, rallyCount || 0);
      this.phase = clamp(phase || 0, 0, 3);
      const intensity = clamp(this.rally / 24, 0, 1);
      this.targetTempo = 66 + intensity * 58 + this.phase * 3.5;
      this.targetFreq = 43 + intensity * 17 + this.phase * 2.2;

      if (!this.ctx || !this.droneOscA || !this.droneOscB) return;
      const t = this.ctx.currentTime;
      this.droneOscA.frequency.setTargetAtTime(this.targetFreq, t, 0.22);
      this.droneOscB.frequency.setTargetAtTime(this.targetFreq * 0.506, t, 0.26);
      this.droneFilter.frequency.setTargetAtTime(120 + intensity * 210 + this.phase * 36, t, 0.25);
      this.musicBus.gain.setTargetAtTime(0.56 + intensity * 0.25 + this.phase * 0.05, t, 0.25);
    }

    startBgm() {
      const c = this.ensureContext();
      if (!c || this.started) return;

      if (this.droneOscA || this.droneOscB) {
        try {
          if (this.droneOscA) this.droneOscA.stop();
          if (this.droneOscB) this.droneOscB.stop();
        } catch {}
        this.droneOscA = null;
        this.droneOscB = null;
      }

      this.started = true;
      this.beatIndex = 0;
      this.nextBeatAt = c.currentTime + 0.08;

      this.droneOscA = c.createOscillator();
      this.droneOscA.type = "sawtooth";
      this.droneOscA.frequency.value = this.targetFreq;

      this.droneOscB = c.createOscillator();
      this.droneOscB.type = "sawtooth";
      this.droneOscB.frequency.value = this.targetFreq * 0.506;
      this.droneOscB.detune.value = -5;

      this.droneFilter = c.createBiquadFilter();
      this.droneFilter.type = "lowpass";
      this.droneFilter.frequency.value = 140;
      this.droneFilter.Q.value = 0.84;

      this.droneDrive = this.createDistortion(200);
      this.droneGain = c.createGain();
      this.droneGain.gain.value = 0.11;

      this.heartbeatGain = c.createGain();
      this.heartbeatGain.gain.value = 0.0001;

      this.droneOscA.connect(this.droneFilter);
      this.droneOscB.connect(this.droneFilter);
      this.droneFilter.connect(this.droneDrive);
      this.droneDrive.connect(this.droneGain);
      this.droneDrive.connect(this.heartbeatGain);
      this.droneGain.connect(this.musicBus);
      this.heartbeatGain.connect(this.musicBus);

      const t = c.currentTime;
      this.droneGain.gain.setValueAtTime(0.0001, t);
      this.droneGain.gain.exponentialRampToValueAtTime(0.11, t + 1.1);

      this.droneOscA.start(t);
      this.droneOscB.start(t);

      this.scheduleBeatLoop();
    }

    scheduleBeatLoop() {
      if (!this.started || !this.ctx) return;
      const c = this.ctx;

      while (this.nextBeatAt < c.currentTime + 0.24) {
        this.currentTempo += (this.targetTempo - this.currentTempo) * 0.16;
        this.triggerHeartbeat(this.nextBeatAt);
        this.nextBeatAt += 60 / Math.max(48, this.currentTempo);
      }

      clearTimeout(this.beatTimer);
      this.beatTimer = window.setTimeout(() => this.scheduleBeatLoop(), 32);
    }

    triggerHeartbeat(t) {
      if (!this.ctx || !this.heartbeatGain || !this.droneFilter) return;
      const intensity = clamp(this.rally / 24, 0, 1);
      const beatGain = 0.2 + intensity * 0.26 + this.phase * 0.04;
      const open = 140 + intensity * 240 + this.phase * 45;

      this.heartbeatGain.gain.cancelScheduledValues(t);
      this.heartbeatGain.gain.setValueAtTime(0.0001, t);
      this.heartbeatGain.gain.exponentialRampToValueAtTime(beatGain, t + 0.018);
      this.heartbeatGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);

      this.droneFilter.frequency.cancelScheduledValues(t);
      this.droneFilter.frequency.setValueAtTime(open, t);
      this.droneFilter.frequency.exponentialRampToValueAtTime(open * 0.76, t + 0.19);

      if (this.phase >= 2 && this.beatIndex % 2 === 0) this.playHat(t + 0.01);
      if (this.phase >= 3 && this.beatIndex % 4 === 1) this.playHat(t + 0.085, 1.45);

      this.beatIndex += 1;
    }

    playHat(t, freqMul = 1) {
      if (!this.ctx) return;
      const c = this.ctx;
      const src = c.createBufferSource();
      src.buffer = this.noiseBuffer || this.createNoiseBuffer();

      const hp = c.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 5900 * freqMul;
      hp.Q.value = 0.9;

      const gain = c.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.11 + this.phase * 0.028, t + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

      src.connect(hp);
      hp.connect(gain);
      gain.connect(this.musicBus);
      src.start(t);
      src.stop(t + 0.08);
    }

    playBoot() {
      const c = this.ensureContext();
      if (!c) return;

      const t = c.currentTime + 0.001;
      const osc = c.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(95, t);
      osc.frequency.exponentialRampToValueAtTime(660, t + 0.8);

      const sub = c.createOscillator();
      sub.type = "sine";
      sub.frequency.setValueAtTime(48, t);
      sub.frequency.exponentialRampToValueAtTime(128, t + 0.75);

      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(180, t);
      lp.frequency.exponentialRampToValueAtTime(3200, t + 0.78);
      lp.Q.value = 1.8;

      const drive = this.createDistortion(230);
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.42, t + 0.09);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.96);

      osc.connect(lp);
      sub.connect(lp);
      lp.connect(drive);
      drive.connect(gain);
      gain.connect(this.sfxBus);

      osc.start(t);
      sub.start(t);
      osc.stop(t + 1);
      sub.stop(t + 1);
    }

    playPhaseShiftAlarm(phase = this.phase) {
      const c = this.ensureContext();
      if (!c) return;

      const t = c.currentTime + 0.001;
      const siren = c.createOscillator();
      siren.type = "square";
      const startF = phase >= 2 ? 980 : 720;
      const endF = phase >= 2 ? 1420 : 1040;
      siren.frequency.setValueAtTime(startF, t);
      siren.frequency.exponentialRampToValueAtTime(endF, t + 0.08);
      siren.frequency.exponentialRampToValueAtTime(startF * 0.76, t + 0.17);

      const gain = c.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.34 + phase * 0.05, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);

      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(startF * 1.4, t);
      bp.Q.value = 5.5;

      siren.connect(bp);
      bp.connect(gain);
      gain.connect(this.sfxBus);
      siren.start(t);
      siren.stop(t + 0.26);
    }

    playGameOverCrash() {
      const c = this.ensureContext();
      if (!c) return;

      const t = c.currentTime + 0.001;
      const down = c.createOscillator();
      down.type = "sawtooth";
      down.frequency.setValueAtTime(180, t);
      down.frequency.exponentialRampToValueAtTime(28, t + 1.1);

      const downGain = c.createGain();
      downGain.gain.setValueAtTime(0.0001, t);
      downGain.gain.exponentialRampToValueAtTime(0.58, t + 0.015);
      downGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);

      const downFilter = c.createBiquadFilter();
      downFilter.type = "lowpass";
      downFilter.frequency.setValueAtTime(1400, t);
      downFilter.frequency.exponentialRampToValueAtTime(70, t + 1.15);
      downFilter.Q.value = 1.1;

      const noise = c.createBufferSource();
      noise.buffer = this.noiseBuffer || this.createNoiseBuffer();

      const nHp = c.createBiquadFilter();
      nHp.type = "highpass";
      nHp.frequency.setValueAtTime(1600, t);
      nHp.frequency.exponentialRampToValueAtTime(260, t + 0.95);

      const nGain = c.createGain();
      nGain.gain.setValueAtTime(0.0001, t);
      nGain.gain.exponentialRampToValueAtTime(0.56, t + 0.01);
      nGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);

      down.connect(downFilter);
      downFilter.connect(downGain);
      downGain.connect(this.sfxBus);
      noise.connect(nHp);
      nHp.connect(nGain);
      nGain.connect(this.sfxBus);

      down.start(t);
      noise.start(t);
      down.stop(t + 1.25);
      noise.stop(t + 1.05);
    }

    stopBgm() {
      if (!this.ctx || !this.started) return;
      this.started = false;
      clearTimeout(this.beatTimer);

      const t = this.ctx.currentTime;
      if (this.droneGain) {
        this.droneGain.gain.cancelScheduledValues(t);
        this.droneGain.gain.setValueAtTime(Math.max(0.0001, this.droneGain.gain.value), t);
        this.droneGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      }
      if (this.heartbeatGain) {
        this.heartbeatGain.gain.cancelScheduledValues(t);
        this.heartbeatGain.gain.setValueAtTime(Math.max(0.0001, this.heartbeatGain.gain.value), t);
        this.heartbeatGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      }

      window.setTimeout(() => {
        try {
          if (this.droneOscA) this.droneOscA.stop();
          if (this.droneOscB) this.droneOscB.stop();
        } catch {}

        this.droneOscA = null;
        this.droneOscB = null;
        this.droneFilter = null;
        this.droneDrive = null;
        this.droneGain = null;
        this.heartbeatGain = null;
      }, 760);
    }
  }

  class VisualSyncManager {
    constructor(root) {
      this.root = root;
      this.rgbTimer = 0;
      this.flashTimer = 0;
      if (this.root) this.root.classList.add("game-console");
    }

    syncTheme(canvasTheme) {
      if (!this.root || !canvasTheme) return;
      this.root.style.setProperty("--pulse-flash-a", canvasTheme.paddleCpu || canvasTheme.net || "#00f3ff");
      this.root.style.setProperty("--pulse-flash-b", canvasTheme.paddlePlayer || canvasTheme.ball || "#ff00ff");
    }

    applyPhase(phase) {
      if (!this.root) return;
      this.root.classList.toggle("phase-camera-shake", phase >= 2);
      this.root.classList.toggle("phase-glitch", phase >= 3);
    }

    flashPhase(kind = "amber") {
      if (!this.root) return;
      this.root.classList.remove("phase-flash-amber", "phase-flash-red", "phase-flash-void");
      this.root.classList.add(
        kind === "red" ? "phase-flash-red" : kind === "void" ? "phase-flash-void" : "phase-flash-amber"
      );
      clearTimeout(this.flashTimer);
      this.flashTimer = window.setTimeout(() => {
        this.root.classList.remove("phase-flash-amber", "phase-flash-red", "phase-flash-void");
      }, 190);
    }

    triggerRgbSplit(duration = 90) {
      if (!this.root) return;
      this.root.classList.remove("ui-rgb-split");
      void this.root.offsetWidth;
      this.root.classList.add("ui-rgb-split");

      clearTimeout(this.rgbTimer);
      this.rgbTimer = window.setTimeout(() => {
        this.root.classList.remove("ui-rgb-split");
      }, duration);
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
    const hot = { r: 255, g: 250, b: 238 };
    if (state.phase === 3) {
      return {
        mode: "void",
        wire: parseColorRgb("#ffffff"),
        innerGlow: parseColorRgb("#f8fbff"),
        outerGlow: parseColorRgb("#7f8ca6"),
        plasma: parseColorRgb("#f2f7ff"),
        hot: parseColorRgb("#ffffff")
      };
    }

    if (state.phase === 2) {
      return {
        mode: "overheat",
        wire: parseColorRgb("#ff7f92"),
        innerGlow: parseColorRgb("#ff2d56"),
        outerGlow: parseColorRgb("#ff142f"),
        plasma: parseColorRgb("#ff8ea0"),
        hot: parseColorRgb("#fff1f4")
      };
    }

    if (state.phase === 1) {
      return {
        mode: "warning",
        wire: parseColorRgb("#ffd464"),
        innerGlow: parseColorRgb("#ffad1f"),
        outerGlow: parseColorRgb("#ff7f00"),
        plasma: parseColorRgb("#ffd06f"),
        hot
      };
    }

    const coldInner = parseColorRgb(canvasTheme.paddleCpu || "#00e4ff");
    const coldOuter = parseColorRgb("#2e9cff");
    return {
      mode: "cold",
      wire: mixRgb(coldInner, coldOuter, 0.38),
      innerGlow: coldInner,
      outerGlow: coldOuter,
      plasma: mixRgb(coldInner, parseColorRgb("#9ce7ff"), 0.38),
      hot
    };
  }

  function getCoreMesh() {
    return ball.coreVariant === "hypercube" ? hypercubeCoreMesh : icosaCoreMesh;
  }

  function activeThemeDef() {
    if (!themeManager) return themeDefs["theme-cyberpunk"];
    return themeDefs[themeManager.activeClass] || themeDefs["theme-cyberpunk"];
  }

  function getPhaseFromRally(rallyCount) {
    if (rallyCount >= 15) return 3;
    if (rallyCount >= 10) return 2;
    if (rallyCount >= 5) return 1;
    return 0;
  }

  function getPhaseConfig(phase = state.phase) {
    return phaseConfigs[clamp(Math.floor(phase), 0, phaseConfigs.length - 1)];
  }

  function applyPhaseCssVars(phase) {
    const cfg = getPhaseConfig(phase);
    const body = document.body;
    if (!body) return cfg;

    const primary = parseColorRgb(cfg.primary);
    const secondary = parseColorRgb(cfg.secondary);
    const text = parseColorRgb(cfg.text);

    body.style.setProperty("--theme-primary", cfg.primary);
    body.style.setProperty("--theme-secondary", cfg.secondary);
    body.style.setProperty("--theme-bg", cfg.bg);
    body.style.setProperty("--theme-text", cfg.text);
    body.style.setProperty("--theme-primary-soft", rgba(primary, 0.24));
    body.style.setProperty("--theme-secondary-soft", rgba(secondary, 0.2));
    body.style.setProperty("--theme-bg-panel", rgba(mixRgb(parseColorRgb(cfg.bg), primary, 0.2), 0.88));
    body.style.setProperty("--theme-bg-shell", rgba(mixRgb(parseColorRgb(cfg.bg), secondary, 0.1), 0.9));
    body.style.setProperty("--panel-mid", rgba(mixRgb(parseColorRgb(cfg.bg), secondary, 0.23), 0.84));
    body.style.setProperty("--panel-dark", rgba(mixRgb(parseColorRgb(cfg.bg), primary, 0.1), 0.92));
    body.style.setProperty("--glow-intensity", String(cfg.glow));
    body.style.setProperty("--grid-speed", `${cfg.gridSpeedMs}ms`);

    body.style.setProperty("--neon-cyan", cfg.secondary);
    body.style.setProperty("--neon-pink", cfg.primary);
    body.style.setProperty("--line-main", rgba(secondary, 0.82));
    body.style.setProperty("--line-sub", rgba(primary, 0.76));
    body.style.setProperty("--line-soft", rgba(secondary, 0.34));
    body.style.setProperty("--terminal-green", rgba(text, 1));
    body.style.setProperty("--dim-green", rgba(text, 0.62));
    body.style.setProperty("--core-inner", rgba(secondary, 0.46));
    body.style.setProperty("--core-outer", rgba(primary, 0.38));
    body.style.setProperty("--pulse-flash-a", rgba(secondary, 0.9));
    body.style.setProperty("--pulse-flash-b", rgba(primary, 0.86));
    body.style.background = `radial-gradient(72vw 42vh at 8% 0%, ${rgba(primary, 0.24)}, transparent 66%), radial-gradient(58vw 38vh at 90% 6%, ${rgba(secondary, 0.2)}, transparent 72%), ${cfg.bg} url("noise-texture-placeholder")`;

    body.classList.remove("phase-0", "phase-1", "phase-2", "phase-3");
    body.classList.add(`phase-${cfg.id}`);

    return cfg;
  }

  function renderThemeLabel() {
    const theme = activeThemeDef();
    const phase = getPhaseConfig(state.phase);
    themeNameEl.textContent = `${theme.label} // ${phase.name}`;
  }

  function updatePhase(rallyCount, milestone = false) {
    const nextPhase = getPhaseFromRally(rallyCount);
    const prevPhase = state.phase;
    state.phase = nextPhase;

    const cfg = applyPhaseCssVars(nextPhase);
    if (themeManager && themeManager.canvas) {
      const primary = parseColorRgb(cfg.primary);
      const secondary = parseColorRgb(cfg.secondary);
      const mixed = mixRgb(primary, secondary, 0.5);
      themeManager.canvas.ambient = cfg.bg;
      themeManager.canvas.paddlePlayer = cfg.primary;
      themeManager.canvas.paddleCpu = cfg.secondary;
      themeManager.canvas.net = cfg.secondary;
      themeManager.canvas.netGlow = rgba(secondary, 0.82);
      themeManager.canvas.ball = cfg.primary;
      themeManager.canvas.bloomPlayer = rgba(primary, 0.23 + cfg.glow * 0.18);
      themeManager.canvas.bloomCpu = rgba(secondary, 0.23 + cfg.glow * 0.18);
      themeManager.canvas.bloomBall = nextPhase >= 3 ? "rgba(6,7,8,0.44)" : rgba(mixed, 0.22 + cfg.glow * 0.22);
      themeManager.canvas.ghost = nextPhase >= 3 ? "rgba(16,18,22,0.16)" : "rgba(255,255,255,0.09)";
      themeManager.canvas.noiseAlpha = clamp(0.08 + cfg.glow * 0.1, 0.08, 0.2);
    }

    uiFx.applyPhase(nextPhase);
    soundEngine.setProgress(rallyCount, nextPhase);
    renderThemeLabel();

    if (milestone) {
      soundEngine.playPhaseShiftAlarm(nextPhase);
      if (nextPhase === 1) uiFx.flashPhase("amber");
      else if (nextPhase === 2) uiFx.flashPhase("red");
      else uiFx.flashPhase("void");
    }

    if (nextPhase >= 3 && (milestone || prevPhase !== nextPhase)) {
      uiFx.triggerRgbSplit(135);
    }

    return cfg;
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
    ball.mode = "core";
    ball.size = 16;
    if (force || Math.random() < 0.22) {
      ball.coreVariant = ball.coreVariant === "icosa" ? "hypercube" : "icosa";
    }
    ball.coreSeed = random(0, Math.PI * 2);
    ball.coreSpin = random(0.84, 1.08);
  }

  function resetServe(direction = (Math.random() < 0.65 ? -1 : 1), resetRun = false) {
    player.y = H / 2 - player.h / 2;
    cpu.y = H / 2 - cpu.h / 2;
    ball.x = W / 2;
    ball.y = H / 2;

    if (resetRun) {
      state.returnCount = 0;
      state.lastRallySync = -1;
      updatePhase(0, false);
    }
    state.speedMultiplier = 1;
    updateHud();

    const angle = random(-0.52, 0.52);
    ball.vx = Math.cos(angle) * ball.baseSpeed * direction;
    ball.vy = Math.sin(angle) * ball.baseSpeed;
    randomizeBallAppearance();
  }

  function startGame() {
    if (state.running) return;
    soundEngine.unlock();
    soundEngine.playBoot();
    soundEngine.startBgm();
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
    const phaseCfg = getPhaseConfig();
    const lifeMul = phaseCfg.trailLife;
    const sizeMul = phaseCfg.trailScale;

    const speedFactor = clamp(speed / ball.baseSpeed, 0.8, 3.4);
    const emitCount = Math.round(clamp(3 + speedFactor * 1.8 + burst + dt * 40 + state.phase * 0.75, 3, 14));
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
        pushTrailParticle(type, x, y, vx, vy, random(0.32, 0.74) * lifeMul, random(1.2, 2.8) * sizeMul, {
          drag: random(0.84, 0.9),
          curve: random(-50, 50),
          jitter: random(0.5, 1.4)
        });
      } else if (type === "binary") {
        vx *= 0.76;
        vy *= 0.76;
        pushTrailParticle(type, x, y, vx, vy, random(0.5, 1.02) * lifeMul, random(9.5, 13.5) * sizeMul, {
          drag: random(0.89, 0.93),
          curve: random(-36, 36),
          jitter: random(0.4, 1.2)
        });
      } else {
        vx *= 0.52;
        vy *= 0.52;
        pushTrailParticle(type, x, y, vx, vy, random(0.72, 1.3) * lifeMul, random(3.8, 7.4) * sizeMul, {
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
    const phaseCfg = getPhaseConfig();
    const lifeMul = phaseCfg.trailLife;
    const sizeMul = phaseCfg.trailScale;

    const prevAngle = Math.atan2(prevVY, prevVX);
    const nextAngle = Math.atan2(nextVY, nextVX);
    const delta = normalizeAngle(nextAngle - prevAngle);
    const turnDir = Math.sign(delta) || 1;
    const arcSpan = Math.min(Math.abs(delta), Math.PI * 0.88);
    const count = Math.round(clamp(11 + nextSpeed / 62 + state.phase * 1.8, 12, 32));

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
        pushTrailParticle(
          "binary",
          x,
          y,
          baseVX * 0.72,
          baseVY * 0.72,
          random(0.52, 1.05) * lifeMul,
          random(10, 13.5) * sizeMul,
          {
          drag: random(0.9, 0.94),
          curve: random(-45, 45),
          whip: true
          }
        );
      } else if (i % 2 === 0) {
        pushTrailParticle(
          "wisp",
          x,
          y,
          baseVX * 0.55,
          baseVY * 0.55,
          random(0.72, 1.34) * lifeMul,
          random(4, 7.8) * sizeMul,
          {
          drag: random(0.93, 0.96),
          curve: turnDir * random(110, 220),
          jitter: random(1.2, 2.6),
          whip: true
          }
        );
      } else {
        pushTrailParticle("spark", x, y, baseVX, baseVY, random(0.34, 0.78) * lifeMul, random(1.4, 3.2) * sizeMul, {
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
    soundEngine.playGameOverCrash();
    soundEngine.stopBgm();
    uiFx.flashPhase(state.phase >= 2 ? "red" : "amber");
    uiFx.triggerRgbSplit(state.phase >= 3 ? 150 : 90);

    const isNewBest = state.returnCount > state.bestCount;
    if (isNewBest) {
      state.bestCount = state.returnCount;
      flashHudValue(bestCountEl);
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
    }

    if (ball.y + half > H) {
      ball.y = H - half;
      ball.vy *= -1;
    }

    if (ball.vx < 0 && paddleCollision(player)) {
      const prevVX = ball.vx;
      const prevVY = ball.vy;
      ball.x = player.x + player.w + half;
      bounceFromPaddle(player, true);
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
    }

    if (ball.vx > 0 && paddleCollision(cpu)) {
      const prevVX = ball.vx;
      const prevVY = ball.vy;
      ball.x = cpu.x - half;
      bounceFromPaddle(cpu, false);

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
    }

    if (ball.x + half < 0) onGameOver();
    if (ball.x - half > W) {
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
    const phaseCfg = getPhaseConfig();
    const primary = parseColorRgb(phaseCfg.primary);
    const secondary = parseColorRgb(phaseCfg.secondary);
    const mixed = mixRgb(primary, secondary, 0.5);

    ctx.fillStyle = phaseCfg.bg;
    ctx.fillRect(0, 0, W, H);

    const bloomA = rgba(primary, 0.19 + phaseCfg.glow * 0.2);
    const bloomB = rgba(secondary, 0.19 + phaseCfg.glow * 0.2);
    const bloomBall = state.phase >= 3 ? "rgba(5, 5, 8, 0.48)" : rgba(mixed, 0.22 + phaseCfg.glow * 0.24);

    drawBloom(player.x + player.w / 2, player.y + player.h / 2, 120, bloomA);
    drawBloom(cpu.x + cpu.w / 2, cpu.y + cpu.h / 2, 148, bloomB);
    drawBloom(ball.x, ball.y, 130 + state.phase * 10, bloomBall);

    if (now - noiseUpdatedAt > 70) {
      redrawNoiseTexture();
      noiseUpdatedAt = now;
    }

    if (noisePattern) {
      ctx.save();
      ctx.globalAlpha = clamp((canvasTheme.noiseAlpha || 0.1) + state.phase * 0.025, 0.07, 0.22);
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
    ctx.globalAlpha = state.phase >= 3 ? 0.16 : 0.1;
    ctx.fillStyle = state.phase >= 3 ? "rgba(12,16,24,0.28)" : canvasTheme.ghost;
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
    const phaseCfg = getPhaseConfig();
    const mesh = getCoreMesh();
    const speed = Math.hypot(ball.vx, ball.vy);
    const speedFactor = clamp(speed / ball.baseSpeed, 0.78, 2.85) * phaseCfg.spin;
    const pulseWave = 0.62 + 0.38 * Math.sin(now * (0.0108 + state.phase * 0.0035) + ball.x * 0.014 + ball.y * 0.009);
    const pulse = clamp(pulseWave * phaseCfg.pulse, 0.12, 2.65);
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

    if (state.phase >= 3) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      const halo = ctx.createRadialGradient(ball.x, ball.y, coreRadius * 0.12, ball.x, ball.y, coreRadius * 2.15);
      halo.addColorStop(0, "rgba(255,255,255,0.18)");
      halo.addColorStop(0.42, "rgba(255,255,255,0.06)");
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, coreRadius * 2.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#040507";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, coreRadius * 0.98, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 1.05;
      ctx.shadowBlur = 16;
      ctx.shadowColor = "rgba(255,255,255,0.66)";
      for (let i = 0; i < 8; i += 1) {
        const a = now * 0.01 + i * (Math.PI * 2 / 8);
        const r = coreRadius * (0.18 + 0.3 * Math.abs(Math.sin(now * 0.007 + i)));
        ctx.beginPath();
        ctx.moveTo(ball.x + Math.cos(a) * r, ball.y + Math.sin(a) * r);
        ctx.lineTo(
          ball.x + Math.cos(a + 0.7) * (r + coreRadius * 0.38),
          ball.y + Math.sin(a + 0.7) * (r + coreRadius * 0.38)
        );
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

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
    if (state.returnCount !== state.lastRallySync) {
      const milestone = state.returnCount > 0 && state.returnCount % 5 === 0;
      updatePhase(state.returnCount, milestone);
      state.lastRallySync = state.returnCount;
    }
    updateParticles(dt);
    drawScene(now, themeManager.canvas);

    state.rafId = requestAnimationFrame(loop);
  }

  function pointerToCanvasY(clientY) {
    const rect = canvas.getBoundingClientRect();
    return ((clientY - rect.top) / rect.height) * H;
  }

  function primeAudio() {
    soundEngine.unlock();
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

  soundEngine = new SoundEngine();
  uiFx = new VisualSyncManager(appRoot);

  themeManager = new ThemeManager();
  themeManager.apply(new Date());
  themeManager.watchMidnight(() => {
    updatePhase(state.returnCount, false);
    drawScene(performance.now(), themeManager.canvas);
  });

  redrawNoiseTexture();
  loadRanking();
  state.bestCount = state.ranking.length > 0 ? state.ranking[0].returns : 0;
  renderRanking();
  updateHud();

  syncUnfairLabel();
  startTitleGlitchLoop();
  updatePhase(state.returnCount, false);

  setOverlay("START SIGNAL을 눌러 시작", "PC: 화살표/W/S, 마우스 이동 | 모바일: 터치 드래그", true, false);
  drawScene(performance.now(), themeManager.canvas);
})();
