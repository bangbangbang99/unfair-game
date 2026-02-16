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
    size: 14,
    vx: 0,
    vy: 0,
    baseSpeed: 335,
    mode: "pixel",
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

    if (ballMode === "seollal") {
      ball.mode = "sprite";
      ball.sprite = Math.random() < 0.5 ? "tteokguk" : "moon";
      ball.size = 16;
      return;
    }

    if (ballMode === "emoji") {
      ball.mode = "emoji";
      ball.emoji = pick(glitchBallEmojis);
      ball.size = 16;
      return;
    }

    if (!force && Math.random() < 0.68) {
      ball.mode = "pixel";
      ball.size = 14;
    } else {
      ball.mode = Math.random() < 0.55 ? "pixel" : "emoji";
      ball.size = ball.mode === "emoji" ? 16 : 14;
      if (ball.mode === "emoji") ball.emoji = pick(glitchBallEmojis);
    }
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
        x: ball.x + random(-1.8, 1.8),
        y: ball.y + random(-1.8, 1.8),
        vx: -ball.vx * 0.018 + random(-26, 26),
        vy: -ball.vy * 0.018 + random(-26, 26),
        life: random(0.2, 0.44),
        maxLife: 0.44,
        size: random(1.8, 3.8)
      });
    }
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
    for (let i = trailParticles.length - 1; i >= 0; i -= 1) {
      const p = trailParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.93;
      p.vy *= 0.93;
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

    if (state.returnCount > state.bestCount) {
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
    emitTrailParticles();

    if (ball.y - half < 0) {
      ball.y = half;
      ball.vy *= -1;
    }

    if (ball.y + half > H) {
      ball.y = H - half;
      ball.vy *= -1;
    }

    if (ball.vx < 0 && paddleCollision(player)) {
      ball.x = player.x + player.w + half;
      bounceFromPaddle(player, true);

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
      ball.x = cpu.x - half;
      bounceFromPaddle(cpu, false);

      const boost = getBoost();
      state.speedMultiplier *= boost;
      ball.vx *= boost;
      ball.vy *= boost;

      updateHud();
      flashHudValue(speedMultEl);
      spawnImpactParticles(ball.x, ball.y, canvasTheme.paddleCpu);
      triggerImpactFx();
      if (Math.random() < 0.4) randomizeBallAppearance();
    }

    if (ball.x + half < 0) onGameOver();
    if (ball.x - half > W) resetServe(-1, false);
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

  function drawTrail(canvasTheme) {
    ctx.save();
    for (const p of trailParticles) {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
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

  function drawBall(canvasTheme) {
    if (ball.mode === "sprite") {
      const isMoon = ball.sprite === "moon";
      const sprite = isMoon ? moonSprite : tteokgukSprite;
      const palette = isMoon
        ? { "1": "#fff6d8", "2": "#ceb479" }
        : { "1": "#fff7e2", "2": "#f1d49b", "3": "#8f5c40", "4": "#6fd681", "5": "#a27453" };

      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = canvasTheme.ballGlow;
      drawPixelSprite(ball.x, ball.y, sprite, palette, 2);
      ctx.restore();
      return;
    }

    if (ball.mode === "emoji") {
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${ball.size + 6}px "JetBrains Mono", "Fira Code", "Segoe UI Emoji", monospace`;
      ctx.shadowBlur = 18;
      ctx.shadowColor = canvasTheme.ballGlow;
      ctx.fillText(ball.emoji, ball.x, ball.y + 0.5);
      ctx.restore();
      return;
    }

    const half = ballHalf();
    ctx.save();
    ctx.shadowBlur = 22;
    ctx.shadowColor = canvasTheme.ballGlow;
    ctx.fillStyle = canvasTheme.ball;
    ctx.fillRect(Math.round(ball.x - half), Math.round(ball.y - half), ball.size, ball.size);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(Math.round(ball.x - half + 1), Math.round(ball.y - half + 1), Math.max(2, Math.floor(ball.size * 0.4)), 2);
    ctx.restore();
  }

  function drawScene(now, canvasTheme) {
    drawBackground(now, canvasTheme);
    drawNet(canvasTheme);
    drawTrail(canvasTheme);
    drawPaddle(player, canvasTheme.paddlePlayer);
    drawPaddle(cpu, canvasTheme.paddleCpu);
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
    if (state.running) return;
    if (ball.vx === 0 && ball.vy === 0) resetServe(undefined, true);
    startGame();
  });

  restartBtn.addEventListener("click", restartGame);

  unfairBtn.addEventListener("mouseenter", () => {
    unfairHovering = true;
    syncUnfairLabel();
  });

  unfairBtn.addEventListener("mouseleave", () => {
    unfairHovering = false;
    syncUnfairLabel();
  });

  unfairBtn.addEventListener("click", () => {
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
