(() => {
  const canvas = document.getElementById("gameCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const appRoot = document.getElementById("appRoot");
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
    isEpicMode: false,
    lastRallySync: -1,
    ranking: [],
    chaosMode: false,
    controlsInvertedUntil: 0,
    nextChaosAt: 0,
    chaosFlashHideAt: 0,
    impactTimer: 0
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
  const starStreaks = [];
  const starField = buildStarField(96);
  const icosaCoreMesh = buildIcosahedronMesh();
  const hypercubeCoreMesh = buildHypercubeMesh();

  const themeDefs = {
    "theme-cyberpunk": {
      label: "QUANTUM CONSOLE",
      badge: "STANDARD MODE",
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
      label: "CYBER JOSEON",
      badge: "SEOLLAL MODE",
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
      label: "HALLOWEEN MODE",
      badge: "PUMPKIN CORE",
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
      label: "CHRISTMAS MODE",
      badge: "SNOW CORE",
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
      label: "APRIL FOOLS MODE",
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
      name: "ARCADE LOBBY",
      primary: "#ff00ff",
      secondary: "#00ffff",
      bg: "#0a001a",
      text: "#efe6ff",
      glow: 1,
      gridSpeedMs: 7600,
      trailLife: 1.05,
      trailScale: 1.04,
      spin: 1,
      pulse: 1
    },
    {
      id: 1,
      name: "SIGNAL SPARK",
      primary: "#ff2de2",
      secondary: "#02eeff",
      bg: "#120126",
      text: "#f1e8ff",
      glow: 1.05,
      gridSpeedMs: 4200,
      trailLife: 1.2,
      trailScale: 1.14,
      spin: 1.15,
      pulse: 1.1
    },
    {
      id: 2,
      name: "GLITCH OVERDRIVE",
      primary: "#ff00c6",
      secondary: "#2bf3ff",
      bg: "#140128",
      text: "#f7eaff",
      glow: 1.12,
      gridSpeedMs: 2600,
      trailLife: 1.38,
      trailScale: 1.28,
      spin: 1.36,
      pulse: 1.3
    },
    {
      id: 3,
      name: "GOD MODE",
      primary: "#ffd700",
      secondary: "#4169e1",
      bg: "#070214",
      text: "#fff4d3",
      glow: 1.34,
      gridSpeedMs: 900,
      trailLife: 2.35,
      trailScale: 2.2,
      spin: 2.24,
      pulse: 2.45
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
      this.normalBus = null;
      this.epicBus = null;
      this.compressor = null;
      this.noiseBuffer = null;

      this.started = false;
      this.nextBeatAt = 0;
      this.beatTimer = 0;
      this.beatIndex = 0;

      this.phase = 0;
      this.rally = 0;
      this.currentTempo = 102;
      this.targetTempo = 102;
      this.isEpicMode = false;
      this.crossfadeSeconds = 2;

      this.normalGain = null;
      this.epicGain = null;
      this.epicReverb = null;
      this.epicReverbGain = null;
      this.sfxDryGain = null;
      this.sfxVerbSend = null;
      this.sfxVerb = null;
      this.sfxVerbGain = null;

      this.normalProgression = [0, -5, 2, -3];
      this.epicProgression = [0, 3, 7, -2];
      this.normalMelody = [0, 4, 7, 9, 7, 4, 2, 4];
    }

    ensureContext() {
      if (!this.enabled) return null;
      if (this.ctx) return this.ctx;

      this.ctx = new this.AudioContextClass();
      const c = this.ctx;

      this.master = c.createGain();
      this.master.gain.value = 0.84;

      this.musicBus = c.createGain();
      this.musicBus.gain.value = 0.72;

      this.sfxBus = c.createGain();
      this.sfxBus.gain.value = 0.9;

      this.normalBus = c.createGain();
      this.normalBus.gain.value = 1;
      this.epicBus = c.createGain();
      this.epicBus.gain.value = 1;

      this.normalGain = c.createGain();
      this.normalGain.gain.value = 0.0001;
      this.epicGain = c.createGain();
      this.epicGain.gain.value = 0.0001;

      this.epicReverb = c.createConvolver();
      this.epicReverb.buffer = this.createReverbImpulse(2.8, 2.7);
      this.epicReverbGain = c.createGain();
      this.epicReverbGain.gain.value = 0.2;

      this.sfxDryGain = c.createGain();
      this.sfxDryGain.gain.value = 1;
      this.sfxVerbSend = c.createGain();
      this.sfxVerbSend.gain.value = 0.08;
      this.sfxVerb = c.createConvolver();
      this.sfxVerb.buffer = this.createReverbImpulse(1.9, 2.1);
      this.sfxVerbGain = c.createGain();
      this.sfxVerbGain.gain.value = 0.08;

      this.compressor = c.createDynamicsCompressor();
      this.compressor.threshold.value = -18;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 6;
      this.compressor.attack.value = 0.004;
      this.compressor.release.value = 0.21;

      this.normalBus.connect(this.normalGain);
      this.epicBus.connect(this.epicGain);
      this.normalGain.connect(this.musicBus);
      this.epicGain.connect(this.musicBus);
      this.epicBus.connect(this.epicReverb);
      this.epicReverb.connect(this.epicReverbGain);
      this.epicReverbGain.connect(this.musicBus);

      this.musicBus.connect(this.master);

      this.sfxBus.connect(this.sfxDryGain);
      this.sfxDryGain.connect(this.master);
      this.sfxBus.connect(this.sfxVerbSend);
      this.sfxVerbSend.connect(this.sfxVerb);
      this.sfxVerb.connect(this.sfxVerbGain);
      this.sfxVerbGain.connect(this.master);

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

    createNoiseBuffer() {
      const c = this.ctx;
      if (!c) return null;
      const len = Math.floor((c.sampleRate || 44100) * 2);
      const buf = c.createBuffer(1, len, c.sampleRate || 44100);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = random(-1, 1);
      return buf;
    }

    createReverbImpulse(seconds = 2.6, decay = 2.9) {
      if (!this.ctx) return null;
      const sampleRate = this.ctx.sampleRate || 44100;
      const len = Math.floor(sampleRate * seconds);
      const impulse = this.ctx.createBuffer(2, len, sampleRate);
      for (let ch = 0; ch < 2; ch += 1) {
        const data = impulse.getChannelData(ch);
        for (let i = 0; i < len; i += 1) {
          const t = i / len;
          const env = Math.pow(1 - t, decay);
          data[i] = random(-1, 1) * env * (1 - ch * 0.06);
        }
      }
      return impulse;
    }

    setProgress(rallyCount, phase) {
      this.rally = Math.max(0, rallyCount || 0);
      this.phase = clamp(phase || 0, 0, 3);
      const intensity = clamp(this.rally / 24, 0, 1);
      this.targetTempo = this.isEpicMode
        ? 126 + intensity * 18
        : 98 + intensity * 14;
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.musicBus.gain.setTargetAtTime(this.isEpicMode ? 0.84 : 0.7, t, 0.4);
    }

    startBgm() {
      const c = this.ensureContext();
      if (!c || this.started) return;

      this.started = true;
      this.beatIndex = 0;
      this.nextBeatAt = c.currentTime + 0.08;

      const t = c.currentTime;
      this.normalGain.gain.cancelScheduledValues(t);
      this.epicGain.gain.cancelScheduledValues(t);
      this.normalGain.gain.setValueAtTime(0.0001, t);
      this.epicGain.gain.setValueAtTime(0.0001, t);
      this.normalGain.gain.exponentialRampToValueAtTime(0.52, t + 1.2);
      this.epicGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      this.sfxVerbSend.gain.setTargetAtTime(0.08, t, 0.3);
      this.sfxVerbGain.gain.setTargetAtTime(0.08, t, 0.3);

      this.scheduleBeatLoop();
    }

    scheduleBeatLoop() {
      if (!this.started || !this.ctx) return;
      const c = this.ctx;

      while (this.nextBeatAt < c.currentTime + 0.32) {
        this.currentTempo += (this.targetTempo - this.currentTempo) * 0.16;
        const beatInterval = 60 / Math.max(72, this.currentTempo);

        this.scheduleNormalMusic(this.nextBeatAt, beatInterval);
        this.scheduleEpicMusic(this.nextBeatAt, beatInterval);

        this.nextBeatAt += beatInterval;
        this.beatIndex += 1;
      }

      clearTimeout(this.beatTimer);
      this.beatTimer = window.setTimeout(() => this.scheduleBeatLoop(), 32);
    }

    scheduleNormalMusic(t, beatInterval) {
      if (!this.ctx || !this.normalGain) return;
      if (this.normalGain.gain.value < 0.0002) return;

      const chordIdx = Math.floor(this.beatIndex / 4) % this.normalProgression.length;
      const base = 164.81 * Math.pow(2, this.normalProgression[chordIdx] / 12);
      const chord = [0, 4, 7];
      const padDuration = beatInterval * 2.45;
      const intensity = clamp(this.rally / 22, 0, 1);

      for (const semi of chord) {
        this.playTone(this.normalBus, {
          when: t,
          frequency: base * Math.pow(2, semi / 12),
          type: "triangle",
          attack: 0.03,
          release: padDuration,
          gain: 0.03 + intensity * 0.016,
          filterType: "lowpass",
          filterFreq: 1700 + intensity * 540,
          q: 0.9
        });
      }

      if (this.beatIndex % 2 === 0) {
        this.playTone(this.normalBus, {
          when: t,
          frequency: base * 0.5,
          type: "sine",
          attack: 0.005,
          release: beatInterval * 0.52,
          gain: 0.08 + intensity * 0.02,
          filterType: "lowpass",
          filterFreq: 320,
          q: 1
        });

        this.playTone(this.normalBus, {
          when: t + beatInterval * 0.04,
          frequency: base,
          type: "square",
          attack: 0.002,
          release: beatInterval * 0.14,
          gain: 0.036 + intensity * 0.01,
          filterType: "bandpass",
          filterFreq: 1050,
          q: 2.1
        });
      }

      const melIdx = this.beatIndex % this.normalMelody.length;
      const leadSemi = this.normalMelody[melIdx];
      const leadFreq = base * Math.pow(2, (leadSemi + 12) / 12);
      this.playTone(this.normalBus, {
        when: t + beatInterval * 0.16,
        frequency: leadFreq,
        type: "square",
        attack: 0.002,
        release: beatInterval * 0.34,
        gain: 0.07 + intensity * 0.02,
        filterType: "bandpass",
        filterFreq: 2100 + intensity * 650,
        q: 3.6
      });

      this.playTone(this.normalBus, {
        when: t + beatInterval * 0.16,
        frequency: leadFreq * 2,
        type: "triangle",
        attack: 0.002,
        release: beatInterval * 0.22,
        gain: 0.026 + intensity * 0.012,
        filterType: "highpass",
        filterFreq: 2800,
        q: 0.8
      });
    }

    scheduleEpicMusic(t, beatInterval) {
      if (!this.ctx || !this.epicGain) return;
      if (this.epicGain.gain.value < 0.0002) return;

      const idx = Math.floor(this.beatIndex / 4) % this.epicProgression.length;
      const root = 49 * Math.pow(2, this.epicProgression[idx] / 12);
      const chord = [0, 7, 12, 16];
      const intensity = clamp(this.rally / 24, 0, 1);

      for (const semi of chord) {
        const freq = root * Math.pow(2, semi / 12);
        for (const detune of [-8, 8]) {
          this.playTone(this.epicBus, {
            when: t,
            frequency: freq,
            detune,
            type: "sawtooth",
            attack: 0.018,
            release: beatInterval * 3.85,
            gain: 0.034 + intensity * 0.016,
            filterType: "lowpass",
            filterFreq: 1500 + intensity * 680,
            q: 0.86
          });
        }

        this.playTone(this.epicBus, {
          when: t + beatInterval * 0.02,
          frequency: freq * 2,
          type: "triangle",
          attack: 0.009,
          release: beatInterval * 2.25,
          gain: 0.014 + intensity * 0.008,
          filterType: "highpass",
          filterFreq: 2400,
          q: 0.75
        });
      }

      if (this.beatIndex % 2 === 0) {
        this.playTone(this.epicBus, {
          when: t,
          frequency: root * 0.48,
          type: "sine",
          attack: 0.002,
          release: beatInterval * 0.58,
          gain: 0.17 + intensity * 0.03,
          filterType: "lowpass",
          filterFreq: 190,
          q: 1.25
        });

        this.playNoise(this.epicBus, {
          when: t,
          attack: 0.002,
          release: beatInterval * 0.31,
          gain: 0.072,
          filterType: "bandpass",
          filterFreq: 1050,
          q: 1.9
        });
      }

      if (this.beatIndex % 4 === 1) {
        this.playTone(this.epicBus, {
          when: t + beatInterval * 0.08,
          frequency: root * 2.02,
          type: "sawtooth",
          attack: 0.006,
          release: beatInterval * 0.52,
          gain: 0.1 + intensity * 0.028,
          filterType: "bandpass",
          filterFreq: 980 + intensity * 260,
          q: 2.4
        });
      }

      this.playNoise(this.epicBus, {
        when: t + beatInterval * 0.5,
        attack: 0.001,
        release: beatInterval * 0.1,
        gain: 0.018 + intensity * 0.016,
        filterType: "highpass",
        filterFreq: 5400 + intensity * 1400,
        q: 0.7
      });
    }

    playTone(target, opts) {
      if (!this.ctx || !target) return;
      const c = this.ctx;
      const t = opts.when ?? c.currentTime;
      const attack = Math.max(0.001, opts.attack ?? 0.01);
      const release = Math.max(0.01, opts.release ?? 0.18);
      const gainValue = Math.max(0.0001, opts.gain ?? 0.1);

      const osc = c.createOscillator();
      osc.type = opts.type || "sine";
      osc.frequency.setValueAtTime(Math.max(20, opts.frequency || 220), t);
      if (Number.isFinite(opts.detune)) osc.detune.setValueAtTime(opts.detune, t);

      const env = c.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(gainValue, t + attack);
      env.gain.exponentialRampToValueAtTime(0.0001, t + release);

      let out = env;
      if (opts.filterType) {
        const filter = c.createBiquadFilter();
        filter.type = opts.filterType;
        filter.frequency.setValueAtTime(Math.max(40, opts.filterFreq || 1200), t);
        filter.Q.value = opts.q || 0.7;
        osc.connect(filter);
        filter.connect(env);
      } else {
        osc.connect(env);
      }

      if (Number.isFinite(opts.pan) && typeof c.createStereoPanner === "function") {
        const p = c.createStereoPanner();
        p.pan.value = clamp(opts.pan, -1, 1);
        env.connect(p);
        out = p;
      }

      out.connect(target);
      osc.start(t);
      osc.stop(t + release + 0.03);
    }

    playNoise(target, opts) {
      if (!this.ctx || !target) return;
      const c = this.ctx;
      const t = opts.when ?? c.currentTime;
      const attack = Math.max(0.001, opts.attack ?? 0.002);
      const release = Math.max(0.01, opts.release ?? 0.09);
      const gainValue = Math.max(0.0001, opts.gain ?? 0.03);

      const src = c.createBufferSource();
      src.buffer = this.noiseBuffer || this.createNoiseBuffer();

      const env = c.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(gainValue, t + attack);
      env.gain.exponentialRampToValueAtTime(0.0001, t + release);

      if (opts.filterType) {
        const filter = c.createBiquadFilter();
        filter.type = opts.filterType;
        filter.frequency.setValueAtTime(Math.max(40, opts.filterFreq || 1800), t);
        filter.Q.value = opts.q || 1;
        src.connect(filter);
        filter.connect(env);
      } else {
        src.connect(env);
      }

      env.connect(target);
      src.start(t);
      src.stop(t + release + 0.04);
    }

    playBoot() {
      const c = this.ensureContext();
      if (!c) return;
      const t = c.currentTime + 0.002;

      this.playTone(this.sfxBus, {
        when: t,
        frequency: 220,
        type: "sine",
        attack: 0.01,
        release: 0.35,
        gain: 0.16,
        filterType: "lowpass",
        filterFreq: 1000,
        q: 1.2
      });

      this.playTone(this.sfxBus, {
        when: t + 0.06,
        frequency: 440,
        type: "triangle",
        attack: 0.01,
        release: 0.42,
        gain: 0.13,
        filterType: "bandpass",
        filterFreq: 1800,
        q: 2.1
      });
    }

    playPhaseShiftAlarm(phase = this.phase) {
      const c = this.ensureContext();
      if (!c) return;
      const t = c.currentTime + 0.001;
      const base = phase >= 3 ? 740 : 520;

      this.playTone(this.sfxBus, {
        when: t,
        frequency: base,
        type: "sawtooth",
        attack: 0.008,
        release: 0.32,
        gain: 0.18,
        filterType: "bandpass",
        filterFreq: 1800,
        q: 3.2
      });

      this.playTone(this.sfxBus, {
        when: t + 0.11,
        frequency: base * 1.5,
        type: "sawtooth",
        attack: 0.006,
        release: 0.24,
        gain: 0.16,
        filterType: "bandpass",
        filterFreq: 2100,
        q: 3.8
      });
    }

    playPaddleHit(power = 1) {
      const c = this.ensureContext();
      if (!c) return;
      const t = c.currentTime + 0.001;
      if (this.isEpicMode) {
        const impact = clamp(power, 0.9, 2.4);
        this.playTone(this.sfxBus, {
          when: t,
          frequency: random(74, 96),
          type: "sawtooth",
          attack: 0.002,
          release: 0.36,
          gain: 0.25 + impact * 0.1,
          filterType: "lowpass",
          filterFreq: 440,
          q: 0.9
        });
        this.playTone(this.sfxBus, {
          when: t + 0.01,
          frequency: random(142, 188),
          type: "triangle",
          attack: 0.002,
          release: 0.26,
          gain: 0.15 + impact * 0.06,
          filterType: "bandpass",
          filterFreq: 760,
          q: 1.7
        });
        this.playNoise(this.sfxBus, {
          when: t,
          attack: 0.001,
          release: 0.24,
          gain: 0.13,
          filterType: "bandpass",
          filterFreq: 680,
          q: 1.4
        });
        return;
      }

      const base = random(520, 620) * (0.9 + power * 0.17);
      this.playTone(this.sfxBus, {
        when: t,
        frequency: base,
        type: "square",
        attack: 0.002,
        release: 0.1,
        gain: 0.13 + power * 0.05,
        filterType: "bandpass",
        filterFreq: 1880,
        q: 2.4
      });
      this.playTone(this.sfxBus, {
        when: t + 0.01,
        frequency: base * 1.62,
        type: "triangle",
        attack: 0.002,
        release: 0.08,
        gain: 0.07 + power * 0.03,
        filterType: "highpass",
        filterFreq: 2400,
        q: 1.1
      });
    }

    playWallHit() {
      const c = this.ensureContext();
      if (!c) return;
      const t = c.currentTime + 0.001;
      if (this.isEpicMode) {
        this.playTone(this.sfxBus, {
          when: t,
          frequency: random(60, 82),
          type: "sawtooth",
          attack: 0.001,
          release: 0.4,
          gain: 0.3,
          filterType: "lowpass",
          filterFreq: 410,
          q: 1
        });
        this.playNoise(this.sfxBus, {
          when: t + 0.005,
          attack: 0.001,
          release: 0.3,
          gain: 0.15,
          filterType: "bandpass",
          filterFreq: 820,
          q: 1.5
        });
        return;
      }

      this.playTone(this.sfxBus, {
        when: t,
        frequency: random(820, 980),
        type: "triangle",
        attack: 0.001,
        release: 0.07,
        gain: 0.12,
        filterType: "highpass",
        filterFreq: 1950,
        q: 1.1
      });
    }

    playScorePoint() {
      const c = this.ensureContext();
      if (!c) return;
      const t = c.currentTime + 0.001;
      const notes = [392, 523.25, 659.25];
      for (let i = 0; i < notes.length; i += 1) {
        this.playTone(this.sfxBus, {
          when: t + i * 0.08,
          frequency: notes[i],
          type: "triangle",
          attack: 0.003,
          release: 0.16,
          gain: 0.11,
          filterType: "bandpass",
          filterFreq: 1700 + i * 320,
          q: 2.5
        });
      }
    }

    playGameOverCrash() {
      const c = this.ensureContext();
      if (!c) return;
      const t = c.currentTime + 0.001;

      this.playTone(this.sfxBus, {
        when: t,
        frequency: 190,
        type: "sawtooth",
        attack: 0.006,
        release: 1.1,
        gain: 0.28,
        filterType: "lowpass",
        filterFreq: 900,
        q: 0.9
      });

      this.playNoise(this.sfxBus, {
        when: t,
        attack: 0.002,
        release: 0.78,
        gain: 0.18,
        filterType: "highpass",
        filterFreq: 900,
        q: 0.8
      });
    }

    enableEpicLayer() {
      const c = this.ensureContext();
      if (!c) return;
      if (!this.started) this.startBgm();
      if (this.isEpicMode) return;

      this.isEpicMode = true;
      this.targetTempo = 128;
      const t = c.currentTime;
      const fade = this.crossfadeSeconds;

      this.normalGain.gain.cancelScheduledValues(t);
      this.normalGain.gain.setValueAtTime(Math.max(0.0001, this.normalGain.gain.value), t);
      this.normalGain.gain.exponentialRampToValueAtTime(0.0001, t + fade);

      this.epicGain.gain.cancelScheduledValues(t);
      this.epicGain.gain.setValueAtTime(Math.max(0.0001, this.epicGain.gain.value), t);
      this.epicGain.gain.exponentialRampToValueAtTime(0.62, t + fade);

      this.sfxVerbSend.gain.setTargetAtTime(0.38, t, 0.45);
      this.sfxVerbGain.gain.setTargetAtTime(0.42, t, 0.45);
      this.epicReverbGain.gain.setTargetAtTime(0.5, t, 0.6);
    }

    disableEpicLayer(immediate = false) {
      if (!this.ctx || !this.normalGain || !this.epicGain) return;
      this.isEpicMode = false;
      const t = this.ctx.currentTime;
      const fade = immediate ? 0.09 : this.crossfadeSeconds;
      this.targetTempo = 100;

      this.normalGain.gain.cancelScheduledValues(t);
      this.normalGain.gain.setValueAtTime(Math.max(0.0001, this.normalGain.gain.value), t);
      this.normalGain.gain.exponentialRampToValueAtTime(0.52, t + fade);

      this.epicGain.gain.cancelScheduledValues(t);
      this.epicGain.gain.setValueAtTime(Math.max(0.0001, this.epicGain.gain.value), t);
      this.epicGain.gain.exponentialRampToValueAtTime(0.0001, t + fade);

      this.sfxVerbSend.gain.setTargetAtTime(0.08, t, immediate ? 0.08 : 0.45);
      this.sfxVerbGain.gain.setTargetAtTime(0.08, t, immediate ? 0.08 : 0.45);
      this.epicReverbGain.gain.setTargetAtTime(0.2, t, immediate ? 0.08 : 0.6);
    }

    stopBgm() {
      if (!this.ctx || !this.started) return;
      this.started = false;
      clearTimeout(this.beatTimer);
      this.disableEpicLayer(true);

      const t = this.ctx.currentTime;
      this.normalGain.gain.cancelScheduledValues(t);
      this.epicGain.gain.cancelScheduledValues(t);
      this.normalGain.gain.setValueAtTime(Math.max(0.0001, this.normalGain.gain.value), t);
      this.epicGain.gain.setValueAtTime(Math.max(0.0001, this.epicGain.gain.value), t);
      this.normalGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      this.epicGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
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

    applyPhase(phase, epic = false) {
      if (!this.root) return;
      this.root.classList.remove("phase-camera-shake");
      this.root.classList.toggle("epic-mode", epic);
      this.root.style.setProperty("--impact-shake-px", epic ? "4px" : "2px");
    }

    setEpicMode(enabled) {
      if (!this.root) return;
      this.root.classList.toggle("epic-mode", Boolean(enabled));
      this.root.style.setProperty("--impact-shake-px", enabled ? "4px" : "2px");
    }

    flashPhase(kind = "amber") {
      if (!this.root) return;
      this.root.classList.remove("phase-flash-amber", "phase-flash-red", "phase-flash-void", "phase-flash-god");
      this.root.classList.add(
        kind === "red"
          ? "phase-flash-red"
          : kind === "void"
            ? "phase-flash-void"
            : kind === "god"
              ? "phase-flash-god"
              : "phase-flash-amber"
      );
      clearTimeout(this.flashTimer);
      this.flashTimer = window.setTimeout(() => {
        this.root.classList.remove("phase-flash-amber", "phase-flash-red", "phase-flash-void", "phase-flash-god");
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

  function buildStarField(count = 96) {
    const stars = [];
    for (let i = 0; i < count; i += 1) {
      stars.push({
        x: random(0, W),
        y: random(0, H),
        size: random(0.6, 2),
        twinkle: random(0.3, 1),
        phase: random(0, Math.PI * 2)
      });
    }
    return stars;
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
        mode: "epic",
        wire: parseColorRgb("#ffe6a2"),
        innerGlow: parseColorRgb("#ffffff"),
        outerGlow: parseColorRgb("#ffd700"),
        plasma: parseColorRgb("#ffe7a8"),
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
    body.style.setProperty("--grid-line-color", rgba(primary, cfg.id >= 3 ? 0.86 : 0.78));
    body.style.setProperty("--grid-accent-color", rgba(secondary, cfg.id >= 3 ? 0.5 : 0.44));
    body.style.setProperty("--grid-bloom-primary", rgba(primary, cfg.id >= 3 ? 0.66 : 0.42));
    body.style.setProperty("--grid-bloom-secondary", rgba(secondary, cfg.id >= 3 ? 0.58 : 0.3));
    body.style.setProperty("--noise-opacity", cfg.id >= 3 ? "0.065" : "0.05");
    body.style.setProperty("--crt-line-alpha", cfg.id >= 3 ? "0.14" : "0.24");

    body.classList.remove("phase-0", "phase-1", "phase-2", "phase-3");
    body.classList.add(`phase-${cfg.id}`);

    return cfg;
  }

  function renderThemeLabel() {
    const theme = activeThemeDef();
    const phase = getPhaseConfig(state.phase);
    themeNameEl.textContent = state.isEpicMode
      ? `${theme.label} // ${phase.name} // CINEMATIC EVOLUTION`
      : `${theme.label} // ${phase.name}`;
  }

  function updatePhase(rallyCount) {
    const nextPhase = getPhaseFromRally(rallyCount);
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
      themeManager.canvas.ball = nextPhase >= 3 ? "#ffffff" : cfg.primary;
      themeManager.canvas.bloomPlayer = rgba(primary, 0.23 + cfg.glow * 0.18);
      themeManager.canvas.bloomCpu = rgba(secondary, 0.23 + cfg.glow * 0.18);
      const epicBallGlow = mixRgb(parseColorRgb("#ffd700"), parseColorRgb("#fffdf7"), 0.48);
      themeManager.canvas.bloomBall = nextPhase >= 3 ? rgba(epicBallGlow, 0.64 + cfg.glow * 0.14) : rgba(mixed, 0.22 + cfg.glow * 0.22);
      themeManager.canvas.ghost = nextPhase >= 3 ? "rgba(255,235,172,0.22)" : "rgba(255,255,255,0.09)";
      themeManager.canvas.noiseAlpha = clamp(0.08 + cfg.glow * 0.1, 0.08, 0.2);
    }

    uiFx.applyPhase(nextPhase, state.isEpicMode);
    soundEngine.setProgress(rallyCount, nextPhase);
    renderThemeLabel();

    return cfg;
  }

  function triggerEpicMode() {
    if (state.isEpicMode) return;
    state.isEpicMode = true;
    document.body.classList.add("epic-mode");
    uiFx.setEpicMode(true);
    uiFx.flashPhase("god");
    soundEngine.enableEpicLayer();
    soundEngine.playPhaseShiftAlarm(3);
    renderThemeLabel();
  }

  function clearEpicMode() {
    if (!state.isEpicMode) return;
    state.isEpicMode = false;
    document.body.classList.remove("epic-mode");
    uiFx.setEpicMode(false);
    soundEngine.disableEpicLayer(true);
    starStreaks.length = 0;
    renderThemeLabel();
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
      clearEpicMode();
      state.returnCount = 0;
      state.lastRallySync = -1;
      updatePhase(0);
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
    const epicBoost = state.isEpicMode ? 4.8 : 0;
    const emitCount = Math.round(clamp(
      3 + speedFactor * 1.8 + burst + dt * 40 + state.phase * 0.75 + epicBoost,
      3,
      state.isEpicMode ? 22 : 14
    ));
    const inv = speed > 0 ? 1 / speed : 0;
    const dirX = ball.vx * inv;
    const dirY = ball.vy * inv;
    const tailX = -dirX;
    const tailY = -dirY;
    const sideX = -dirY;
    const sideY = dirX;

    for (let i = 0; i < emitCount; i += 1) {
      const type = Math.random() < (state.isEpicMode ? 0.74 : 0.62) ? "spark" : "wisp";
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
    const count = Math.round(clamp(
      11 + nextSpeed / 62 + state.phase * 1.8 + (state.isEpicMode ? 8 : 0),
      12,
      state.isEpicMode ? 44 : 32
    ));

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

      if (i % 2 === 0) {
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

  function updateStarStreaks(dt) {
    if (state.isEpicMode) {
      const spawnCount = Math.round(clamp(24 + dt * 60 * 30, 24, 60));
      for (let i = 0; i < spawnCount; i += 1) {
        const angle = random(0, Math.PI * 2);
        const speed = random(900, 2600);
        const life = random(0.16, 0.5);
        starStreaks.push({
          x: W / 2 + random(-7, 7),
          y: H / 2 + random(-7, 7),
          prevX: W / 2,
          prevY: H / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life,
          maxLife: life,
          width: random(1.1, 2.9)
        });
      }
    }

    for (let i = starStreaks.length - 1; i >= 0; i -= 1) {
      const s = starStreaks[i];
      s.prevX = s.x;
      s.prevY = s.y;
      const warpAccel = state.isEpicMode ? 3.9 : 0.8;
      s.vx *= 1 + dt * warpAccel;
      s.vy *= 1 + dt * warpAccel;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;

      const out = s.x < -80 || s.x > W + 80 || s.y < -80 || s.y > H + 80;
      if (s.life <= 0 || out || (!state.isEpicMode && s.life < 0.14)) {
        starStreaks.splice(i, 1);
      }
    }

    if (starStreaks.length > 440) {
      starStreaks.splice(0, starStreaks.length - 440);
    }
  }

  function drawStarStreaks() {
    if (starStreaks.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const s of starStreaks) {
      const a = clamp(s.life / s.maxLife, 0, 1);
      ctx.globalAlpha = 0.14 + a * 0.78;
      ctx.strokeStyle = a > 0.55
        ? "rgba(255,255,255,0.98)"
        : a > 0.26
          ? "rgba(255,215,0,0.9)"
          : "rgba(65,105,225,0.74)";
      ctx.lineWidth = s.width * (1.1 + (1 - a) * 1.6);
      ctx.beginPath();
      ctx.moveTo(s.prevX, s.prevY);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
    }

    ctx.restore();
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

    updateStarStreaks(dt);

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
      state.nextChaosAt = performance.now() + random(400, 900);
    } else {
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
    uiFx.flashPhase(state.isEpicMode ? "god" : "amber");

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
      soundEngine.playWallHit();
      triggerImpactFx();
    }

    if (ball.y + half > H) {
      ball.y = H - half;
      ball.vy *= -1;
      soundEngine.playWallHit();
      triggerImpactFx();
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
      soundEngine.playPaddleHit(clamp(Math.hypot(ball.vx, ball.vy) / ball.baseSpeed, 0.9, 1.8));
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
      soundEngine.playPaddleHit(clamp(Math.hypot(ball.vx, ball.vy) / ball.baseSpeed, 1, 2));
    }

    if (ball.x + half < 0) onGameOver();
    if (ball.x - half > W) {
      soundEngine.playScorePoint();
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

  function drawVaporGrid(now, phaseCfg) {
    const horizon = H * 0.57;
    const floorHeight = H - horizon;
    const primary = parseColorRgb(phaseCfg.primary);
    const secondary = parseColorRgb(phaseCfg.secondary);

    ctx.save();

    const floorGradient = ctx.createLinearGradient(0, horizon, 0, H);
    floorGradient.addColorStop(0, rgba(primary, state.isEpicMode ? 0.14 : 0.1));
    floorGradient.addColorStop(0.54, rgba(primary, state.isEpicMode ? 0.26 : 0.18));
    floorGradient.addColorStop(1, rgba(primary, state.isEpicMode ? 0.5 : 0.3));
    ctx.fillStyle = floorGradient;
    ctx.fillRect(0, horizon, W, floorHeight);

    const volumetricGlow = ctx.createRadialGradient(W / 2, horizon, 0, W / 2, horizon, H * 0.72);
    volumetricGlow.addColorStop(0, rgba(primary, state.isEpicMode ? 0.36 : 0.2));
    volumetricGlow.addColorStop(0.48, rgba(secondary, state.isEpicMode ? 0.26 : 0.12));
    volumetricGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = volumetricGlow;
    ctx.fillRect(0, horizon - floorHeight * 0.24, W, floorHeight * 1.26);

    const horizontalLines = state.isEpicMode ? 34 : 20;
    const travel = (now * (state.isEpicMode ? 0.0054 : 0.00062)) % 1;
    ctx.lineCap = "round";
    for (let i = 0; i < horizontalLines; i += 1) {
      const t = ((i / horizontalLines) + travel) % 1;
      const depth = Math.pow(t, 2.18);
      const y = horizon + depth * floorHeight;
      const alpha = state.isEpicMode ? 0.26 + depth * 0.72 : 0.12 + depth * 0.44;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = rgba(primary, state.isEpicMode ? 0.92 : 0.74);
      ctx.lineWidth = state.isEpicMode ? 2 : 1.2;
      ctx.shadowBlur = state.isEpicMode ? 24 : 14;
      ctx.shadowColor = rgba(primary, state.isEpicMode ? 0.86 : 0.58);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    ctx.globalAlpha = state.isEpicMode ? 0.74 : 0.5;
    ctx.strokeStyle = rgba(secondary, state.isEpicMode ? 0.82 : 0.56);
    ctx.lineWidth = state.isEpicMode ? 1.55 : 1.05;
    ctx.shadowBlur = state.isEpicMode ? 20 : 10;
    ctx.shadowColor = rgba(secondary, state.isEpicMode ? 0.74 : 0.42);
    const columns = state.isEpicMode ? 21 : 17;
    for (let i = -columns; i <= columns; i += 1) {
      const xBottom = W / 2 + i * (W / (columns * 1.25));
      const xTop = W / 2 + i * 13;
      ctx.beginPath();
      ctx.moveTo(xTop, horizon);
      ctx.lineTo(xBottom, H);
      ctx.stroke();
    }

    const beam = ctx.createLinearGradient(0, horizon - 2, 0, horizon + floorHeight * 0.24);
    beam.addColorStop(0, rgba(primary, state.isEpicMode ? 0.72 : 0.46));
    beam.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = state.isEpicMode ? 0.88 : 0.64;
    ctx.fillStyle = beam;
    ctx.fillRect(0, horizon - 3, W, state.isEpicMode ? 9 : 5);

    ctx.restore();
  }

  function drawBackground(now, canvasTheme) {
    const phaseCfg = getPhaseConfig();
    const primary = parseColorRgb(phaseCfg.primary);
    const secondary = parseColorRgb(phaseCfg.secondary);
    const mixed = mixRgb(primary, secondary, 0.5);

    const sky = ctx.createRadialGradient(W / 2, H * 0.08, 0, W / 2, H * 0.18, H * 1.08);
    sky.addColorStop(0, state.isEpicMode ? "rgba(255,215,0,0.26)" : "rgba(255,0,255,0.2)");
    sky.addColorStop(0.36, state.isEpicMode ? "rgba(65,105,225,0.2)" : "rgba(62,15,120,0.24)");
    sky.addColorStop(0.74, phaseCfg.bg);
    sky.addColorStop(1, "rgba(4,0,12,1)");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    drawVaporGrid(now, phaseCfg);

    if (!state.isEpicMode) {
      ctx.save();
      for (const star of starField) {
        const tw = 0.35 + 0.65 * Math.sin(now * 0.0012 * star.twinkle + star.phase);
        ctx.globalAlpha = 0.12 + tw * 0.42;
        ctx.fillStyle = tw > 0.58 ? "rgba(221, 250, 255, 0.96)" : "rgba(169, 220, 255, 0.82)";
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else {
      drawStarStreaks();
    }

    const bloomA = state.isEpicMode
      ? rgba(mixRgb(primary, parseColorRgb("#fff0b6"), 0.3), 0.62)
      : rgba(primary, 0.19 + phaseCfg.glow * 0.2);
    const bloomB = state.isEpicMode
      ? rgba(mixRgb(secondary, parseColorRgb("#9dbdff"), 0.42), 0.62)
      : rgba(secondary, 0.19 + phaseCfg.glow * 0.2);
    const bloomBall = state.isEpicMode ? "rgba(255, 215, 0, 0.92)" : rgba(mixed, 0.22 + phaseCfg.glow * 0.24);
    const playerBloomRadius = state.isEpicMode ? 212 : 124;
    const cpuBloomRadius = state.isEpicMode ? 246 : 150;
    const ballBloomRadius = state.isEpicMode ? 286 : 136;

    drawBloom(player.x + player.w / 2, player.y + player.h / 2, playerBloomRadius, bloomA);
    drawBloom(cpu.x + cpu.w / 2, cpu.y + cpu.h / 2, cpuBloomRadius, bloomB);
    drawBloom(ball.x, ball.y, ballBloomRadius, bloomBall);

    if (state.isEpicMode) {
      ctx.save();
      const holy = ctx.createRadialGradient(W / 2, H * 0.18, 0, W / 2, H * 0.18, H * 0.88);
      holy.addColorStop(0, "rgba(255, 246, 205, 0.42)");
      holy.addColorStop(0.45, "rgba(255, 218, 122, 0.2)");
      holy.addColorStop(0.72, "rgba(65, 105, 225, 0.15)");
      holy.addColorStop(1, "rgba(255, 226, 148, 0)");
      ctx.fillStyle = holy;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = state.isEpicMode ? 0.24 : 0.12;
    ctx.fillStyle = state.isEpicMode ? "rgba(255,235,168,0.24)" : canvasTheme.ghost;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "120px 'JetBrains Mono', 'Fira Code', monospace";
    ctx.fillText(String(state.returnCount).padStart(2, "0"), W / 2, H / 2);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = state.isEpicMode ? 0.08 : 0.16;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (let y = 0; y < H; y += 3) {
      ctx.fillRect(0, y, W, 1);
    }
    ctx.restore();

    ctx.save();
    const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.78);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
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
    const speed = Math.hypot(ball.vx, ball.vy);
    const pulse = 0.62 + 0.38 * Math.sin(now * 0.012 + ball.x * 0.016 + ball.y * 0.012);

    if (state.isEpicMode) {
      const radius = Math.max(9, ball.size * 0.68);
      const invSpeed = speed > 0 ? 1 / speed : 0;
      const tailX = -ball.vx * invSpeed;
      const tailY = -ball.vy * invSpeed;
      const sideX = -tailY;
      const sideY = tailX;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      const halo = ctx.createRadialGradient(ball.x, ball.y, radius * 0.08, ball.x, ball.y, radius * 4);
      halo.addColorStop(0, "rgba(255,255,255,1)");
      halo.addColorStop(0.24, "rgba(255,248,214,0.9)");
      halo.addColorStop(0.58, "rgba(255,215,0,0.6)");
      halo.addColorStop(1, "rgba(65,105,225,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, radius * 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineCap = "round";
      for (let i = 0; i < 16; i += 1) {
        const spread = (i - 7.5) * 0.19;
        const tailLength = radius * (4.8 + i * 0.46) * (0.96 + pulse * 0.2);
        const startX = ball.x + sideX * spread * radius * 0.4;
        const startY = ball.y + sideY * spread * radius * 0.4;
        const endX = startX + tailX * tailLength + sideX * spread * radius * 0.78;
        const endY = startY + tailY * tailLength + sideY * spread * radius * 0.78;
        const alpha = 0.16 + (16 - i) * 0.046;
        ctx.strokeStyle = `rgba(255,215,0,${alpha.toFixed(3)})`;
        ctx.lineWidth = 1.2 + (16 - i) * 0.2;
        ctx.shadowBlur = 30;
        ctx.shadowColor = "rgba(255,215,0,0.78)";
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }

      for (let i = 0; i < 14; i += 1) {
        const sparkAngle = random(0, Math.PI * 2);
        const sparkDist = radius * random(0.4, 2.2);
        const sx = ball.x + Math.cos(sparkAngle) * sparkDist + tailX * random(0, radius * 1.6);
        const sy = ball.y + Math.sin(sparkAngle) * sparkDist + tailY * random(0, radius * 1.6);
        const sparkSize = random(1, 3);
        ctx.fillStyle = `rgba(255,226,148,${random(0.38, 0.82).toFixed(3)})`;
        ctx.shadowBlur = 18;
        ctx.shadowColor = "rgba(255,215,0,0.88)";
        ctx.fillRect(sx, sy, sparkSize, sparkSize);
      }

      const core = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, radius * 1.12);
      core.addColorStop(0, "rgba(255,255,255,1)");
      core.addColorStop(0.4, "rgba(255,255,255,0.98)");
      core.addColorStop(0.76, "rgba(255,236,168,0.95)");
      core.addColorStop(1, "rgba(255,215,0,0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, radius * 1.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 1.8 + pulse * 0.7;
      ctx.strokeStyle = `rgba(255,215,0,${(0.5 + pulse * 0.28).toFixed(3)})`;
      ctx.shadowBlur = 36;
      ctx.shadowColor = "rgba(255,215,0,0.88)";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, radius * 1.56, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    const size = Math.max(10, ball.size);
    const half = size / 2;
    const left = Math.round(ball.x - half);
    const top = Math.round(ball.y - half);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    const glow = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, size * 2.2);
    glow.addColorStop(0, "rgba(255,255,255,0.76)");
    glow.addColorStop(0.4, "rgba(255,0,255,0.4)");
    glow.addColorStop(0.72, "rgba(0,255,255,0.24)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, size * 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 18;
    ctx.shadowColor = "rgba(255,0,255,0.74)";
    ctx.fillStyle = canvasTheme.ball || "#ff00ff";
    ctx.fillRect(left, top, size, size);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.42)";
    ctx.fillRect(left + 2, top + 2, size - 5, 2);
    ctx.fillRect(left + 2, top + 2, 2, size - 5);

    ctx.fillStyle = "rgba(16,0,26,0.36)";
    ctx.fillRect(left + 1, top + size - 3, size - 2, 2);
    ctx.fillRect(left + size - 3, top + 1, 2, size - 2);

    ctx.strokeStyle = canvasTheme.net || "#00ffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(left + 0.5, top + 0.5, size - 1, size - 1);
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
      updatePhase(state.returnCount);
      state.lastRallySync = state.returnCount;
    }
    // Enter God Mode at rally 15 or higher.
    if (state.returnCount >= 15 && !state.isEpicMode) {
      triggerEpicMode();
    } else if (state.returnCount < 15 && state.isEpicMode) {
      clearEpicMode();
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
        ? "카오스 모드 ON. 랜덤 조작 반전 활성화."
        : "카오스 모드 OFF. 컨트롤 반전 효과 비활성화.";
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
    updatePhase(state.returnCount);
    drawScene(performance.now(), themeManager.canvas);
  });

  loadRanking();
  state.bestCount = state.ranking.length > 0 ? state.ranking[0].returns : 0;
  renderRanking();
  updateHud();

  syncUnfairLabel();
  updatePhase(state.returnCount);

  setOverlay("START SIGNAL을 눌러 시작", "PC: 화살표/W/S, 마우스 이동 | 모바일: 터치 드래그", true, false);
  drawScene(performance.now(), themeManager.canvas);
})();


