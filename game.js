(() => {
  const canvas = document.getElementById("gameCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const stage = document.getElementById("stage");
  const trailLayer = document.getElementById("trailLayer");
  const ballEl = document.getElementById("ball");

  const rallyCountEl = document.getElementById("rallyCount");
  const bestCountEl = document.getElementById("bestCount");
  const speedMultEl = document.getElementById("speedMult");
  const phaseLabelEl = document.getElementById("phaseLabel");

  const startBtn = document.getElementById("startBtn");
  const restartBtn = document.getElementById("restartBtn");

  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayText = document.getElementById("overlayText");

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const BEST_KEY = "unfair_retro_best";

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const state = {
    running: false,
    lastTime: 0,
    rallyCount: 0,
    bestCount: Number.parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0,
    speedMultiplier: 1,
    particleCarry: 0,
    isGodMode: false
  };

  const player = {
    x: 28,
    y: HEIGHT / 2 - 48,
    w: 14,
    h: 96,
    speed: 620
  };

  const cpu = {
    x: WIDTH - 44,
    y: HEIGHT / 2 - 64,
    w: 16,
    h: 128,
    speed: 560
  };

  const ball = {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    size: 20,
    vx: 0,
    vy: 0,
    baseSpeed: 420
  };

  const input = {
    up: false,
    down: false,
    pointerActive: false,
    pointerY: HEIGHT / 2
  };

  const particles = [];

  let themePrimary = "#00f3ff";
  let themeSecondary = "#ff00ff";

  class SynthBgm {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.musicBus = null;
      this.filter = null;
      this.filteredGain = null;
      this.dryGain = null;
      this.running = false;
      this.timerId = 0;
      this.stepIndex = 0;
      this.baseStepMs = 220;
      this.isGodMode = false;
      this.sequence = [
        196.0, 246.94, 293.66, 369.99,
        293.66, 246.94, 220.0, 164.81,
        196.0, 246.94, 329.63, 392.0,
        329.63, 293.66, 246.94, 220.0
      ];
    }

    ensureContext() {
      if (this.ctx) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.14;

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 1;

      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.frequency.value = 650;
      this.filter.Q.value = 0.8;

      this.filteredGain = this.ctx.createGain();
      this.filteredGain.gain.value = 1;

      this.dryGain = this.ctx.createGain();
      this.dryGain.gain.value = 0;

      this.musicBus.connect(this.filter);
      this.filter.connect(this.filteredGain);
      this.filteredGain.connect(this.master);

      this.musicBus.connect(this.dryGain);
      this.dryGain.connect(this.master);

      this.master.connect(this.ctx.destination);
    }

    async start() {
      this.ensureContext();
      if (!this.ctx) return;

      if (this.ctx.state === "suspended") {
        await this.ctx.resume();
      }

      if (this.running) return;

      this.running = true;
      this.restartSequencer();
    }

    stop() {
      this.running = false;
      if (this.timerId) {
        clearInterval(this.timerId);
        this.timerId = 0;
      }
    }

    setGodMode(enabled) {
      this.isGodMode = enabled;
      if (!this.ctx || !this.filteredGain || !this.dryGain) return;

      const now = this.ctx.currentTime;
      if (enabled) {
        this.filteredGain.gain.setTargetAtTime(0, now, 0.03);
        this.dryGain.gain.setTargetAtTime(1, now, 0.03);
      } else {
        this.filteredGain.gain.setTargetAtTime(1, now, 0.03);
        this.dryGain.gain.setTargetAtTime(0, now, 0.03);
      }

      if (this.running) {
        this.restartSequencer();
      }
    }

    restartSequencer() {
      if (!this.running) return;

      if (this.timerId) {
        clearInterval(this.timerId);
      }

      const stepMs = this.isGodMode ? this.baseStepMs / 1.5 : this.baseStepMs;
      this.timerId = setInterval(() => this.tick(), stepMs);
    }

    tick() {
      if (!this.ctx || !this.musicBus) return;

      const freq = this.sequence[this.stepIndex % this.sequence.length];
      this.playNote(freq);

      if (this.stepIndex % 4 === 0) {
        this.playBass(freq / 2);
      }

      this.stepIndex += 1;
    }

    playNote(freq) {
      if (!this.ctx || !this.musicBus) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.musicBus);

      osc.start(now);
      osc.stop(now + 0.2);
    }

    playBass(freq) {
      if (!this.ctx || !this.musicBus) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.musicBus);

      osc.start(now);
      osc.stop(now + 0.37);
    }
  }

  const bgm = new SynthBgm();

  function saveBest() {
    localStorage.setItem(BEST_KEY, String(state.bestCount));
  }

  function syncTheme() {
    const styles = getComputedStyle(document.body);
    themePrimary = styles.getPropertyValue("--neon-primary").trim() || "#00f3ff";
    themeSecondary = styles.getPropertyValue("--neon-secondary").trim() || "#ff00ff";
  }

  function updateHud() {
    rallyCountEl.textContent = String(state.rallyCount);
    bestCountEl.textContent = String(state.bestCount);
    speedMultEl.textContent = `${state.speedMultiplier.toFixed(2)}x`;
    phaseLabelEl.textContent = state.isGodMode ? "GOD" : "RETRO";
  }

  function resetBall(direction) {
    const launchAngle = (Math.random() * 0.8 - 0.4);
    const launchSpeed = ball.baseSpeed * state.speedMultiplier;

    ball.x = WIDTH / 2;
    ball.y = HEIGHT / 2;
    ball.vx = Math.cos(launchAngle) * launchSpeed * direction;
    ball.vy = Math.sin(launchAngle) * launchSpeed;
  }

  function resetRound() {
    state.rallyCount = 0;
    state.speedMultiplier = 1;
    state.particleCarry = 0;

    player.y = HEIGHT / 2 - player.h / 2;
    cpu.y = HEIGHT / 2 - cpu.h / 2;

    clearParticles();
    resetBall(Math.random() < 0.5 ? -1 : 1);

    document.body.classList.remove("phase-god");
    state.isGodMode = false;
    syncTheme();
    bgm.setGodMode(false);
    updateHud();
  }

  function startGame() {
    resetRound();
    state.running = true;
    state.lastTime = 0;

    overlay.classList.remove("show");
    bgm.start();
  }

  function endGame() {
    state.running = false;

    if (state.rallyCount > state.bestCount) {
      state.bestCount = state.rallyCount;
      saveBest();
    }

    updateHud();

    overlayTitle.textContent = "GAME OVER";
    overlayText.textContent = `You survived ${state.rallyCount} returns. Press RESTART.`;
    overlay.classList.add("show");
  }

  function clearParticles() {
    for (let i = 0; i < particles.length; i += 1) {
      particles[i].el.remove();
    }
    particles.length = 0;
  }

  function spawnTrailParticle() {
    const element = document.createElement("div");
    element.className = "trail-particle";
    trailLayer.appendChild(element);

    particles.push({
      el: element,
      x: ball.x,
      y: ball.y,
      vx: (Math.random() - 0.5) * 48 - ball.vx * 0.04,
      vy: (Math.random() - 0.5) * 48 - ball.vy * 0.04,
      size: 4 + Math.random() * 8,
      life: 0.34,
      maxLife: 0.34
    });
  }

  function updateTrail(dt, canSpawn) {
    if (canSpawn) {
      const spawnRate = state.isGodMode ? 220 : 130;
      state.particleCarry += dt * spawnRate;
      while (state.particleCarry >= 1) {
        spawnTrailParticle();
        state.particleCarry -= 1;
      }
    }

    const scaleX = stage.clientWidth / WIDTH;
    const scaleY = stage.clientHeight / HEIGHT;
    const scalar = Math.min(scaleX, scaleY);

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      particle.life -= dt;

      if (particle.life <= 0) {
        particle.el.remove();
        particles.splice(i, 1);
        continue;
      }

      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.size *= 0.96;

      const alpha = particle.life / particle.maxLife;
      const px = (particle.x - 4) * scaleX;
      const py = (particle.y - 4) * scaleY;
      const scale = Math.max(0.2, (particle.size * scalar) / 8);

      particle.el.style.opacity = alpha.toFixed(3);
      particle.el.style.transform = `translate(${px}px, ${py}px) scale(${scale})`;
    }
  }

  function syncBallElement() {
    const scaleX = stage.clientWidth / WIDTH;
    const scaleY = stage.clientHeight / HEIGHT;
    const x = (ball.x - ball.size / 2) * scaleX;
    const y = (ball.y - ball.size / 2) * scaleY;
    ballEl.style.transform = `translate(${x}px, ${y}px)`;
  }

  function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "rgba(4, 2, 14, 0.74)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = `${themePrimary}66`;
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 14]);
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2, 0);
    ctx.lineTo(WIDTH / 2, HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let y = 0; y < HEIGHT; y += 4) {
      ctx.fillStyle = y % 8 === 0 ? "rgba(0, 0, 0, 0.10)" : "rgba(255, 255, 255, 0.02)";
      ctx.fillRect(0, y, WIDTH, 1);
    }

    drawPaddle(player, themeSecondary);
    drawPaddle(cpu, themePrimary);
  }

  function drawPaddle(paddle, color) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = state.isGodMode ? 28 : 16;
    ctx.fillStyle = color;
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
    ctx.restore();
  }

  function paddleHit(paddle) {
    return (
      ball.x + ball.size / 2 > paddle.x &&
      ball.x - ball.size / 2 < paddle.x + paddle.w &&
      ball.y + ball.size / 2 > paddle.y &&
      ball.y - ball.size / 2 < paddle.y + paddle.h
    );
  }

  function handlePaddleBounce(paddle, direction) {
    const relative = (ball.y - (paddle.y + paddle.h / 2)) / (paddle.h / 2);
    const clamped = clamp(relative, -1, 1);
    const bounceAngle = clamped * 1.1;

    const currentSpeed = Math.hypot(ball.vx, ball.vy);
    const nextSpeed = Math.min(currentSpeed * 1.04 + 12, 1250);

    ball.vx = Math.cos(bounceAngle) * nextSpeed * direction;
    ball.vy = Math.sin(bounceAngle) * nextSpeed;

    state.rallyCount += 1;
    state.speedMultiplier = 1 + state.rallyCount * 0.04;

    updateHud();
  }

  function update(dt) {
    const rallyCount = state.rallyCount;
    if (rallyCount >= 15) document.body.classList.add('phase-god');
    else document.body.classList.remove('phase-god');

    const nowGodMode = document.body.classList.contains("phase-god");
    if (nowGodMode !== state.isGodMode) {
      state.isGodMode = nowGodMode;
      syncTheme();
      bgm.setGodMode(state.isGodMode);
      updateHud();
    }

    if (input.pointerActive) {
      const pointerTarget = input.pointerY - player.h / 2;
      player.y += (pointerTarget - player.y) * Math.min(1, dt * 16);
    }

    if (input.up) {
      player.y -= player.speed * dt;
    }
    if (input.down) {
      player.y += player.speed * dt;
    }

    player.y = clamp(player.y, 0, HEIGHT - player.h);

    const cpuTarget = ball.y - cpu.h / 2;
    const cpuBoost = state.isGodMode ? 1.28 : 1;
    const cpuStep = cpu.speed * cpuBoost * dt;

    if (cpuTarget > cpu.y) {
      cpu.y += cpuStep;
    } else {
      cpu.y -= cpuStep;
    }

    cpu.y = clamp(cpu.y, 0, HEIGHT - cpu.h);

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.y - ball.size / 2 <= 0) {
      ball.y = ball.size / 2;
      ball.vy = Math.abs(ball.vy);
    }

    if (ball.y + ball.size / 2 >= HEIGHT) {
      ball.y = HEIGHT - ball.size / 2;
      ball.vy = -Math.abs(ball.vy);
    }

    if (ball.vx < 0 && paddleHit(player)) {
      ball.x = player.x + player.w + ball.size / 2;
      handlePaddleBounce(player, 1);
    }

    if (ball.vx > 0 && paddleHit(cpu)) {
      ball.x = cpu.x - ball.size / 2;
      handlePaddleBounce(cpu, -1);
    }

    if (ball.x + ball.size / 2 < 0) {
      endGame();
      return;
    }

    if (ball.x - ball.size / 2 > WIDTH) {
      resetBall(-1);
    }

    updateTrail(dt, true);
  }

  function gameLoop(timestamp) {
    if (!state.lastTime) {
      state.lastTime = timestamp;
    }

    const dt = Math.min((timestamp - state.lastTime) / 1000, 0.033);
    state.lastTime = timestamp;

    if (state.running) {
      update(dt);
    } else {
      updateTrail(dt, false);
    }

    draw();
    syncBallElement();
    requestAnimationFrame(gameLoop);
  }

  function onPointerMove(event) {
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    input.pointerActive = true;
    input.pointerY = ((event.clientY - rect.top) / rect.height) * HEIGHT;
  }

  function onPointerLeave() {
    input.pointerActive = false;
  }

  function onKeyDown(event) {
    if (event.key === "w" || event.key === "W" || event.key === "ArrowUp") {
      input.up = true;
      bgm.start();
    }

    if (event.key === "s" || event.key === "S" || event.key === "ArrowDown") {
      input.down = true;
      bgm.start();
    }
  }

  function onKeyUp(event) {
    if (event.key === "w" || event.key === "W" || event.key === "ArrowUp") {
      input.up = false;
    }

    if (event.key === "s" || event.key === "S" || event.key === "ArrowDown") {
      input.down = false;
    }
  }

  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", startGame);

  stage.addEventListener("pointermove", onPointerMove);
  stage.addEventListener("pointerleave", onPointerLeave);

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  syncTheme();
  updateHud();
  draw();
  syncBallElement();
  requestAnimationFrame(gameLoop);
})();
