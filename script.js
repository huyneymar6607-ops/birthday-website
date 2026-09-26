(() => {
  const scenes = [...document.querySelectorAll(".scene")];
  const canvas = document.querySelector(".effects-canvas");
  const context = canvas.getContext("2d");
  const arena = document.querySelector("#game-arena");
  const overlay = document.querySelector("#game-overlay");
  const scoreDisplay = document.querySelector("#score");
  const hint = document.querySelector("#arena-hint");
  const envelope = document.querySelector("#envelope");
  const envelopeStage = document.querySelector(".envelope-stage");
  const letterPaper = document.querySelector("#birthday-letter");
  const letterHint = document.querySelector("#letter-hint");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let score = 0;
  let spawnTimer = 0;
  let gameStarted = false;
  let gameComplete = false;
  let sceneName = "home";
  let canvasWidth = 0;
  let canvasHeight = 0;
  let pixelRatio = 1;
  let lastFrame = 0;
  let burstParticles = [];
  let ambientParticles = [];

  function resizeCanvas() {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    canvas.width = canvasWidth * pixelRatio;
    canvas.height = canvasHeight * pixelRatio;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ambientParticles = Array.from({ length: Math.min(45, Math.floor(canvasWidth / 25)) }, () => ({
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight,
      size: Math.random() * 1.5 + 0.3,
      speed: Math.random() * 8 + 3,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  function drawEffects(timestamp = 0) {
    const delta = Math.min((timestamp - lastFrame) / 1000 || 0, 0.04);
    lastFrame = timestamp;
    context.clearRect(0, 0, canvasWidth, canvasHeight);

    if (!reducedMotion) {
      ambientParticles.forEach((particle) => {
        particle.y -= particle.speed * delta;
        particle.phase += delta * 1.4;
        if (particle.y < -3) {
          particle.y = canvasHeight + 3;
          particle.x = Math.random() * canvasWidth;
        }
        context.globalAlpha = 0.18 + (Math.sin(particle.phase) + 1) * 0.2;
        context.fillStyle = ["#247ac5", "#ed5b79", "#ffc429", "#ef7f42"][Math.floor(particle.phase) % 4];
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      });
    }

    burstParticles = burstParticles.filter((particle) => particle.life > 0);
    burstParticles.forEach((particle) => {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vy += 115 * delta;
      particle.life -= delta;
      context.globalAlpha = Math.max(0, Math.min(1, particle.life / particle.maxLife));
      context.fillStyle = particle.color;
      context.save();
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation += particle.spin * delta);
      context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.72);
      context.restore();
    });
    context.globalAlpha = 1;
    window.requestAnimationFrame(drawEffects);
  }

  function burst(x, y, amount = 42) {
    const palette = ["#ffc429", "#ed5b79", "#247ac5", "#ef7f42", "#fffdf8"];
    for (let index = 0; index < amount; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 65 + Math.random() * 250;
      const life = 0.9 + Math.random() * 1.3;
      burstParticles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - Math.random() * 80,
        size: 3 + Math.random() * 5,
        color: palette[Math.floor(Math.random() * palette.length)],
        life,
        maxLife: life,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 12,
      });
    }
  }

  function showScene(name) {
    sceneName = name;
    scenes.forEach((scene) => {
      const active = scene.id === name;
      scene.hidden = !active;
      scene.classList.toggle("is-active", active);
    });
    window.scrollTo({ top: 0, behavior: reducedMotion ? "instant" : "smooth" });
    const heading = document.querySelector(`#${name} h1, #${name} h2`);
    heading?.focus({ preventScroll: true });
  }

  function finishGame() {
    gameComplete = true;
    window.clearTimeout(spawnTimer);
    arena.querySelectorAll(".game-star").forEach((star) => star.remove());
    hint.hidden = true;
    overlay.hidden = false;
    const rect = arena.getBoundingClientRect();
    burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 170);
    window.setTimeout(() => {
      burst(rect.left + rect.width * 0.27, rect.top + rect.height * 0.42, 65);
      burst(rect.left + rect.width * 0.73, rect.top + rect.height * 0.42, 65);
    }, 220);
  }

  function collectStar(star) {
    if (gameComplete || star.classList.contains("is-collected")) return;
    star.classList.add("is-collected");
    const rect = star.getBoundingClientRect();
    burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 15);
    score += 1;
    scoreDisplay.textContent = String(score);
    window.setTimeout(() => star.remove(), 360);
    if (score >= 10) finishGame();
  }

  function spawnStar() {
    if (!gameStarted || gameComplete) return;
    const star = document.createElement("button");
    const duration = Math.max(1.65, 4.5 - score * 0.22 + Math.random() * 0.65);
    star.type = "button";
    star.className = "game-star";
    star.setAttribute("aria-label", "Collect falling star");
    star.style.left = `${4 + Math.random() * 90}%`;
    star.style.setProperty("--fall-duration", `${duration}s`);
    star.style.setProperty("--fall-distance", `${arena.clientHeight + 70}px`);
    star.addEventListener("click", () => collectStar(star), { once: true });
    star.addEventListener("animationend", (event) => {
      if (event.animationName === "star-fall") star.remove();
    });
    arena.append(star);
    const nextDelay = Math.max(320, 880 - score * 43 + Math.random() * 270);
    spawnTimer = window.setTimeout(spawnStar, nextDelay);
  }

  function startGame() {
    showScene("game");
    if (gameStarted) return;
    gameStarted = true;
    window.setTimeout(() => {
      if (sceneName !== "game") return;
      hint.hidden = true;
      spawnStar();
    }, 420);
  }

  document.querySelector("#start-button").addEventListener("click", startGame);
  document.querySelector("#continue-button").addEventListener("click", () => {
    showScene("letter");
    burst(canvasWidth * 0.5, canvasHeight * 0.24, 70);
  });

  envelope.addEventListener("click", () => {
    const opening = !envelope.classList.contains("is-open");
    const previousBounds = envelope.getBoundingClientRect();
    envelope.getAnimations().forEach((animation) => animation.cancel());
    letterPaper.getAnimations().forEach((animation) => animation.cancel());
    envelope.classList.toggle("is-open", opening);
    envelopeStage.classList.toggle("is-open", opening);
    letterPaper.hidden = !opening;
    envelope.setAttribute("aria-expanded", String(opening));
    envelope.setAttribute("aria-label", opening ? "Close your birthday letter" : "Open your birthday letter");
    letterHint.textContent = opening ? "A little note, just for you." : "Click to open";
    if (opening) {
      if (!reducedMotion) {
        // Animate from the closed envelope while the full paper already reserves page space.
        const timing = { duration: 950, delay: 150, easing: "cubic-bezier(.18, .72, .24, 1)", fill: "backwards" };
        const paperOffset = Math.max(40, previousBounds.top - letterPaper.getBoundingClientRect().top + previousBounds.height * .1);
        const envelopeOffset = previousBounds.top - envelope.getBoundingClientRect().top;
        letterPaper.animate([
          { opacity: 0, transform: `translateY(${paperOffset}px)` },
          { opacity: 1, transform: "translateY(0)" },
        ], timing);
        envelope.animate([
          { transform: `translateY(${envelopeOffset}px)` },
          { transform: "translateY(0)" },
        ], timing);
      }
      burst(canvasWidth * 0.5, canvasHeight * 0.52, 75);
      window.setTimeout(() => burst(canvasWidth * 0.32, canvasHeight * 0.38, 34), 380);
      window.setTimeout(() => burst(canvasWidth * 0.68, canvasHeight * 0.35, 34), 720);
    }
  });

  if (window.location.hash === "#letter") showScene("letter");

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  window.requestAnimationFrame(drawEffects);
})();
