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
  const overlayCard = overlay.querySelector(".overlay-card");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayText = document.getElementById("overlayText");

  const W = canvas.width;
  const H = canvas.height;
  const rankingStorageKey = "unfair_pong_return_ranking_v3";
  const defaultBoost = 1.1;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const random = (min, max) => Math.random() * (max - min) + min;

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
    chaosFlashHideAt: 0
  };

  const player = { x: 26, y: H / 2 - 44, w: 12, h: 88, speed: 600 };
  const cpu = { x: W - 44, y: H / 2 - 124, w: 18, h: 248, speed: 650, aim: 0.86 };
  const ball = { x: W / 2, y: H / 2, r: 8, vx: 0, vy: 0, baseSpeed: 320 };

  const keys = { up: false, down: false };
  let pointerActive = false;
  let pointerY = H / 2;

  const taunts = [
    "또 졌네? 컨트롤 어디 감?",
    "공보다 멘탈이 더 빨리 튄다",
    "CPU가 지금 웃고 있음",
    "반응속도보다 핑계속도가 빠름",
    "다음 판도 결과는 거의 정해짐"
  ];
  const trollEmojis = ["🤡", "💀", "😵‍💫", "🙃", "🫠", "👹"];

  const trailParticles = [];
  const impactParticles = [];

  const noiseTex = document.createElement("canvas");
  noiseTex.width = 220;
  noiseTex.height = 220;
  const noiseCtx = noiseTex.getContext("2d");
  let noisePattern = null;
  let noiseUpdatedAt = 0;

  const baseVars = {
    "--font-ui": "\"Noto Sans KR\", sans-serif",
    "--font-kick": "\"Black Han Sans\", \"Noto Sans KR\", sans-serif",
    "--font-number": "\"Press Start 2P\", ui-monospace, monospace",
    "--bg-base": "#09060f",
    "--bg-a": "#291654",
    "--bg-b": "#130a27",
    "--text-main": "#f2ebff",
    "--text-sub": "#bca9d7",
    "--text-dim": "#86749f",
    "--line-main": "rgba(0,255,255,0.62)",
    "--line-sub": "rgba(255,0,255,0.38)",
    "--glow-main": "rgba(0,255,255,0.26)",
    "--glow-sub": "rgba(255,0,255,0.22)",
    "--panel-bg": "rgba(16,9,31,0.78)",
    "--panel-strong": "rgba(10,6,20,0.92)",
    "--stat-bg": "rgba(15,9,30,0.82)",
    "--accent-1": "#00ffff",
    "--accent-2": "#ff00ff",
    "--accent-3": "#ccff00",
    "--danger": "#ff3f76",
    "--stage-border-main": "rgba(0,255,255,0.76)",
    "--stage-border-sub": "rgba(255,0,255,0.58)",
    "--stage-glow": "rgba(0,255,255,0.2)",
    "--start-bg": "rgba(0,255,255,0.24)",
    "--start-line": "rgba(0,255,255,0.72)",
    "--chaos-bg": "rgba(255,0,65,0.26)",
    "--chaos-line": "rgba(255,25,88,0.86)",
    "--app-shift-x": "0px",
    "--app-shift-y": "0px"
  };

  const baseCanvas = {
    ambient: "#050505",
    paddlePlayer: "#ff00ff",
    paddleCpu: "#00ffff",
    ball: "#ccff00",
    trail: "rgba(204,255,0,0.84)",
    net: "rgba(0,255,255,0.45)",
    scoreGhost: "rgba(255,255,255,0.08)",
    bloomPlayer: "rgba(255,0,255,0.28)",
    bloomCpu: "rgba(0,255,255,0.28)",
    bloomBall: "rgba(204,255,0,0.32)",
    ballStyle: "orb",
    emoji: "😈"
  };

  const themeDefs = {
    "theme-cyberpunk": { label: "CYBERPUNK GLITCH", badge: "DEFAULT", vars: {}, canvas: {} },
    "theme-seollal": {
      label: "SEOLLAL CYBER",
      badge: "SIMULATION ON",
      vars: {
        "--bg-base": "#090909",
        "--bg-a": "#161616",
        "--bg-b": "#101010",
        "--text-main": "#fff5d6",
        "--text-sub": "#d5c18d",
        "--text-dim": "#9f8d63",
        "--line-main": "rgba(255,215,0,0.76)",
        "--line-sub": "rgba(232,62,62,0.56)",
        "--glow-main": "rgba(255,215,0,0.2)",
        "--glow-sub": "rgba(0,168,107,0.16)",
        "--panel-bg": "rgba(16,16,16,0.8)",
        "--panel-strong": "rgba(11,11,11,0.92)",
        "--stat-bg": "rgba(18,18,18,0.82)",
        "--accent-1": "#ffd700",
        "--accent-2": "#e83e3e",
        "--accent-3": "#00a86b",
        "--danger": "#e83e3e",
        "--stage-border-main": "rgba(255,215,0,0.9)",
        "--stage-border-sub": "rgba(0,168,107,0.64)",
        "--stage-glow": "rgba(255,215,0,0.22)",
        "--start-bg": "rgba(232,62,62,0.38)",
        "--start-line": "rgba(255,215,0,0.92)",
        "--chaos-bg": "rgba(232,62,62,0.36)",
        "--chaos-line": "rgba(255,215,0,0.92)"
      },
      canvas: {
        paddlePlayer: "#e83e3e",
        paddleCpu: "#00a86b",
        ball: "#f8ebc8",
        trail: "rgba(255,215,0,0.8)",
        net: "rgba(255,215,0,0.38)",
        scoreGhost: "rgba(255,215,0,0.09)",
        bloomPlayer: "rgba(232,62,62,0.24)",
        bloomCpu: "rgba(0,168,107,0.24)",
        bloomBall: "rgba(255,215,0,0.28)",
        ballStyle: "moon",
        emoji: "🌕"
      }
    },
    "theme-halloween": {
      label: "HALLOWEEN",
      badge: "SPOOKY MODE",
      vars: {
        "--bg-base": "#070507",
        "--bg-a": "#24112d",
        "--bg-b": "#11090f",
        "--text-main": "#fff1e2",
        "--text-sub": "#d9c1da",
        "--text-dim": "#a78bb0",
        "--line-main": "rgba(255,127,17,0.78)",
        "--line-sub": "rgba(153,84,255,0.58)",
        "--glow-main": "rgba(255,127,17,0.24)",
        "--glow-sub": "rgba(153,84,255,0.2)",
        "--panel-bg": "rgba(18,11,26,0.8)",
        "--panel-strong": "rgba(12,7,19,0.92)",
        "--stat-bg": "rgba(16,10,24,0.82)",
        "--accent-1": "#ff7f11",
        "--accent-2": "#9954ff",
        "--accent-3": "#ffc857",
        "--danger": "#ff7f11",
        "--stage-border-main": "rgba(255,127,17,0.84)",
        "--stage-border-sub": "rgba(153,84,255,0.64)",
        "--stage-glow": "rgba(255,127,17,0.22)"
      },
      canvas: {
        paddlePlayer: "#ff7f11",
        paddleCpu: "#9954ff",
        ball: "#ffc857",
        trail: "rgba(255,127,17,0.82)",
        net: "rgba(255,183,133,0.4)",
        bloomPlayer: "rgba(255,127,17,0.24)",
        bloomCpu: "rgba(153,84,255,0.24)",
        bloomBall: "rgba(255,200,87,0.28)",
        emoji: "🎃"
      }
    },
    "theme-christmas": {
      label: "CHRISTMAS",
      badge: "PIXEL SNOW",
      vars: {
        "--bg-base": "#070b09",
        "--bg-a": "#10211e",
        "--bg-b": "#0a1412",
        "--text-main": "#eefbf3",
        "--text-sub": "#bdd4c3",
        "--text-dim": "#8fa997",
        "--line-main": "rgba(80,255,184,0.78)",
        "--line-sub": "rgba(255,77,122,0.56)",
        "--glow-main": "rgba(80,255,184,0.24)",
        "--glow-sub": "rgba(255,77,122,0.18)",
        "--panel-bg": "rgba(11,21,19,0.8)",
        "--panel-strong": "rgba(8,15,14,0.92)",
        "--stat-bg": "rgba(11,20,18,0.82)",
        "--accent-1": "#64ffd2",
        "--accent-2": "#ff4d7a",
        "--accent-3": "#d4ff8f",
        "--danger": "#ff4d7a",
        "--stage-border-main": "rgba(80,255,184,0.84)",
        "--stage-border-sub": "rgba(255,77,122,0.62)",
        "--stage-glow": "rgba(80,255,184,0.22)"
      },
      canvas: {
        paddlePlayer: "#ff4d7a",
        paddleCpu: "#64ffd2",
        ball: "#d4ff8f",
        trail: "rgba(212,255,143,0.78)",
        net: "rgba(167,255,221,0.42)",
        bloomPlayer: "rgba(255,77,122,0.22)",
        bloomCpu: "rgba(100,255,210,0.22)",
        bloomBall: "rgba(212,255,143,0.3)",
        emoji: "🎄"
      }
    },
    "theme-april-fools": {
      label: "APRIL FOOLS",
      badge: "TOO CHAOTIC",
      vars: {
        "--font-ui": "\"Comic Sans MS\", \"Noto Sans KR\", sans-serif",
        "--font-kick": "\"Comic Sans MS\", \"Noto Sans KR\", sans-serif",
        "--font-number": "\"Comic Sans MS\", \"Noto Sans KR\", monospace",
        "--app-shift-x": "1px",
        "--app-shift-y": "-1px"
      },
      canvas: {
        paddlePlayer: "#ff24a9",
        paddleCpu: "#00fff9",
        ball: "#ffe600",
        trail: "rgba(255,230,0,0.82)",
        net: "rgba(255,230,0,0.46)",
        bloomPlayer: "rgba(255,36,169,0.24)",
        bloomCpu: "rgba(0,255,249,0.24)",
        bloomBall: "rgba(255,230,0,0.28)",
        emoji: "🤡"
      }
    }
  };

  const themeClasses = Object.keys(themeDefs);
  const managedVars = [...new Set([...Object.keys(baseVars), ...themeClasses.flatMap((k) => Object.keys(themeDefs[k].vars))])];
  const seollalByYear = { 2025: "2025-01-29", 2026: "2026-02-17", 2027: "2027-02-06", 2028: "2028-01-26", 2029: "2029-02-13", 2030: "2030-02-03" };

  class ThemeManager {
    constructor() {
      this.overrideTheme = "theme-seollal";
      this.activeClass = "theme-seollal";
      this.canvas = { ...baseCanvas, ...themeDefs["theme-seollal"].canvas };
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
      const vars = { ...baseVars, ...def.vars };
      document.body.classList.remove(...themeClasses);
      document.body.classList.add(cls);
      for (const token of managedVars) document.documentElement.style.removeProperty(token);
      for (const [token, value] of Object.entries(vars)) document.documentElement.style.setProperty(token, value);
      this.activeClass = cls;
      this.canvas = { ...baseCanvas, ...def.canvas };
      themeNameEl.textContent = `${def.label} · ${def.badge}`;
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

  function redrawNoiseTexture() {
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
    el.classList.remove("score-pop");
    void el.offsetWidth;
    el.classList.add("score-pop");
  }

  function setOverlay(title, text, visible, gameOver = false) {
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
      li.textContent = "아직 기록이 없습니다.";
      rankingListEl.appendChild(li);
      return;
    }
    state.ranking.slice(0, 10).forEach((row, idx) => {
      const li = document.createElement("li");
      li.textContent = `${idx + 1}위 - ${row.returns}회 (${row.when})`;
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
    showToast.timer = window.setTimeout(() => { el.style.display = "none"; }, 1400);
  }

  function getBoost() {
    const n = Number.parseFloat(boostInput.value);
    if (Number.isFinite(n) && n > 1 && n < 8) return n;
    boostInput.value = defaultBoost.toFixed(2);
    return defaultBoost;
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
  }

  function startGame() {
    if (state.running) return;
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

  function emitTrailParticles() {
    for (let i = 0; i < 3; i += 1) {
      trailParticles.push({
        x: ball.x + random(-1.4, 1.4),
        y: ball.y + random(-1.4, 1.4),
        vx: -ball.vx * 0.02 + random(-18, 18),
        vy: -ball.vy * 0.02 + random(-18, 18),
        life: random(0.2, 0.45),
        maxLife: 0.45,
        size: random(1.4, 3.2)
      });
    }
  }

  function spawnImpactParticles(x, y, color) {
    for (let i = 0; i < 10; i += 1) {
      impactParticles.push({
        x,
        y,
        vx: random(-170, 170),
        vy: random(-150, 150),
        life: random(0.18, 0.4),
        maxLife: 0.4,
        size: random(1.6, 3.6),
        color
      });
    }
  }

  function updateParticles(dt) {
    for (let i = trailParticles.length - 1; i >= 0; i -= 1) {
      const p = trailParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= dt;
      if (p.life <= 0) trailParticles.splice(i, 1);
    }
    for (let i = impactParticles.length - 1; i >= 0; i -= 1) {
      const p = impactParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.93;
      p.vy *= 0.93;
      p.life -= dt;
      if (p.life <= 0) impactParticles.splice(i, 1);
    }
  }

  function toggleChaosMode() {
    state.chaosMode = !state.chaosMode;
    unfairBtn.classList.toggle("active", state.chaosMode);
    if (state.chaosMode) {
      unfairBtn.textContent = "MODE: ACTIVATED 😈";
      document.body.classList.add("window-vibe");
      state.nextChaosAt = performance.now() + random(400, 900);
    } else {
      unfairBtn.textContent = "더 킹받게";
      document.body.classList.remove("window-vibe");
      state.controlsInvertedUntil = 0;
      chaosEmojiEl.classList.remove("show");
      chaosHintEl.classList.remove("show");
      state.chaosFlashHideAt = 0;
    }
  }

  function updateChaos(now) {
    if (!state.chaosMode) return;
    if (now >= state.nextChaosAt) {
      state.controlsInvertedUntil = now + 2000;
      state.nextChaosAt = now + random(1700, 3400);
      state.chaosFlashHideAt = now + 540;
      chaosHintEl.classList.add("show");
      chaosEmojiEl.textContent = trollEmojis[Math.floor(Math.random() * trollEmojis.length)];
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
    if (state.returnCount > state.bestCount) {
      state.bestCount = state.returnCount;
      flashHudValue(bestCountEl);
    }
    pushRanking(state.returnCount);
    updateHud();
    const taunt = taunts[Math.floor(Math.random() * taunts.length)];
    const emoji = trollEmojis[Math.floor(Math.random() * trollEmojis.length)];
    setOverlay(`GAME OVER ${emoji}`, `${taunt} ${emoji}${emoji} | 이번 판 반환 ${state.returnCount}회`, true, true);
  }

  function paddleCollision(p) {
    const inX = ball.x + ball.r >= p.x && ball.x - ball.r <= p.x + p.w;
    const inY = ball.y + ball.r >= p.y && ball.y - ball.r <= p.y + p.h;
    return inX && inY;
  }

  function bounceFromPaddle(p, toRight) {
    const rel = (ball.y - (p.y + p.h / 2)) / (p.h / 2);
    const angle = rel * 0.9;
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
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    emitTrailParticles();

    if (ball.y - ball.r < 0) {
      ball.y = ball.r;
      ball.vy *= -1;
    }
    if (ball.y + ball.r > H) {
      ball.y = H - ball.r;
      ball.vy *= -1;
    }

    if (ball.vx < 0 && paddleCollision(player)) {
      ball.x = player.x + player.w + ball.r;
      bounceFromPaddle(player, true);
      state.returnCount += 1;
      if (state.returnCount > state.bestCount) {
        state.bestCount = state.returnCount;
        flashHudValue(bestCountEl);
      }
      updateHud();
      flashHudValue(returnCountEl);
      spawnImpactParticles(ball.x, ball.y, canvasTheme.paddlePlayer);
    }

    if (ball.vx > 0 && paddleCollision(cpu)) {
      ball.x = cpu.x - ball.r;
      bounceFromPaddle(cpu, false);
      const boost = getBoost();
      state.speedMultiplier *= boost;
      ball.vx *= boost;
      ball.vy *= boost;
      updateHud();
      flashHudValue(speedMultEl);
      spawnImpactParticles(ball.x, ball.y, canvasTheme.paddleCpu);
    }

    if (ball.x + ball.r < 0) onGameOver();
    if (ball.x - ball.r > W) resetServe(-1, false);
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

    drawBloom(player.x + player.w / 2, player.y + player.h / 2, 100, canvasTheme.bloomPlayer);
    drawBloom(cpu.x + cpu.w / 2, cpu.y + cpu.h / 2, 130, canvasTheme.bloomCpu);
    drawBloom(ball.x, ball.y, 120, canvasTheme.bloomBall);

    if (now - noiseUpdatedAt > 80) {
      redrawNoiseTexture();
      noiseUpdatedAt = now;
    }
    if (noisePattern) {
      ctx.save();
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = noisePattern;
      ctx.translate((now * 0.03) % noiseTex.width, (now * 0.02) % noiseTex.height);
      ctx.fillRect(-noiseTex.width, -noiseTex.height, W + noiseTex.width * 2, H + noiseTex.height * 2);
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = canvasTheme.scoreGhost;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "140px 'Press Start 2P', monospace";
    const text = String(state.returnCount).padStart(2, "0");
    ctx.fillText(text, W / 2, H / 2);
    ctx.restore();
  }

  function drawNet(canvasTheme) {
    ctx.save();
    ctx.strokeStyle = canvasTheme.net;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.restore();
  }

  function drawPaddle(p, color, isPlayer) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowBlur = 18;
    ctx.shadowColor = color;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.shadowBlur = 0;

    if (themeManager.activeClass === "theme-christmas") {
      const stripeA = isPlayer ? "#ff4d7a" : "#64ffd2";
      const stripeB = "rgba(255,255,255,0.88)";
      for (let y = 0; y < p.h; y += 8) {
        ctx.fillStyle = ((Math.floor(y / 8) + (isPlayer ? 0 : 1)) % 2 === 0) ? stripeA : stripeB;
        ctx.fillRect(p.x, p.y + y, p.w, 4);
      }
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      for (let y = 6; y < p.h; y += 12) ctx.fillRect(p.x + 2, p.y + y, p.w - 4, 2);
    }
    ctx.strokeStyle = "rgba(10,10,10,0.46)";
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
    ctx.restore();
  }

  function drawTrail(canvasTheme) {
    ctx.save();
    for (const p of trailParticles) {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = canvasTheme.trail;
      ctx.fillRect(p.x, p.y, p.size, p.size);
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

  function drawBall(canvasTheme) {
    if (canvasTheme.ballStyle === "moon") {
      const moon = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, ball.r + 6);
      moon.addColorStop(0, "#fff6d8");
      moon.addColorStop(0.7, "#f2ddb0");
      moon.addColorStop(1, "#d3bc82");
      ctx.save();
      ctx.fillStyle = moon;
      ctx.shadowBlur = 24;
      ctx.shadowColor = "rgba(255,215,0,0.6)";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r + 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(140,120,80,0.24)";
      ctx.beginPath();
      ctx.arc(ball.x - 2, ball.y - 2, 2.1, 0, Math.PI * 2);
      ctx.arc(ball.x + 2, ball.y + 1.5, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.fillStyle = canvasTheme.ball;
    ctx.shadowBlur = 24;
    ctx.shadowColor = canvasTheme.ball;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawScene(now, canvasTheme) {
    drawBackground(now, canvasTheme);
    drawNet(canvasTheme);
    drawTrail(canvasTheme);
    drawPaddle(player, canvasTheme.paddlePlayer, true);
    drawPaddle(cpu, canvasTheme.paddleCpu, false);
    drawImpacts();
    drawBall(canvasTheme);
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

  window.addEventListener("keydown", (e) => {
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

  canvas.addEventListener("mousemove", (e) => {
    pointerActive = true;
    pointerY = pointerToCanvasY(e.clientY);
  });
  canvas.addEventListener("mouseleave", () => { pointerActive = false; });
  canvas.addEventListener("touchstart", (e) => {
    pointerActive = true;
    pointerY = pointerToCanvasY(e.touches[0].clientY);
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener("touchmove", (e) => {
    pointerActive = true;
    pointerY = pointerToCanvasY(e.touches[0].clientY);
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener("touchend", () => { pointerActive = false; });

  startBtn.addEventListener("click", () => {
    if (state.running) return;
    if (ball.vx === 0 && ball.vy === 0) resetServe(undefined, true);
    startGame();
  });

  restartBtn.addEventListener("click", restartGame);
  unfairBtn.addEventListener("click", () => {
    toggleChaosMode();
    if (!state.running) {
      const text = state.chaosMode ? "카오스 모드 ON. 조작이 랜덤 반전됩니다." : "카오스 모드 OFF.";
      setOverlay("THE KING-BAT-NEUN MODE", text, true, false);
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

  const themeManager = new ThemeManager();
  themeManager.apply(new Date());
  themeManager.watchMidnight(() => drawScene(performance.now(), themeManager.canvas));

  redrawNoiseTexture();
  loadRanking();
  state.bestCount = state.ranking.length > 0 ? state.ranking[0].returns : 0;
  renderRanking();
  updateHud();
  setOverlay("START를 눌러 시작 🌕", "PC: 화살표/W/S, 마우스 이동 | 모바일: 터치 드래그", true, false);
  drawScene(performance.now(), themeManager.canvas);
})();
