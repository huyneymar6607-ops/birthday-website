(() => {
  const requiredDecorations = 20;
  const dropzone = document.querySelector("#cake-dropzone");
  const cakePieces = document.querySelector("#cake-pieces");
  const countDisplay = document.querySelector("#decoration-count");
  const progressTrack = document.querySelector("#progress-track");
  const progressFill = document.querySelector("#progress-fill");
  const completionPanel = document.querySelector("#completion-panel");
  const hint = document.querySelector("#drop-hint");
  const confettiLayer = document.querySelector("#celebration-layer");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const glyphs = {
    strawberry: "\u{1F353}",
    blueberry: "\u{1FAD0}",
    cherry: "\u{1F352}",
    candle: "\u{1F56F}\uFE0F",
    sprinkles: "",
    chocolate: "\u{1F36B}",
    cookie: "\u{1F36A}",
    star: "\u2B50\uFE0F",
    frosting: "\u273F",
    topper: "HBD!",
  };
  const confettiColors = ["#247ac5", "#ed5b79", "#ffc429", "#ef8246", "#72a773"];
  let decorations = 0;
  let selectedKind = null;
  let drag = null;
  let suppressNextClick = false;
  let hasCelebrated = false;

  document.querySelectorAll(".topping").forEach((button) => {
    const kind = button.dataset.kind;
    button.querySelector(".topping-glyph").textContent = glyphs[kind];
    button.addEventListener("pointerdown", (event) => startDrag(event, button));
    button.addEventListener("click", () => {
      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }
      selectTopping(button);
    });
  });

  function selectTopping(button) {
    selectedKind = button.dataset.kind;
    document.querySelectorAll(".topping").forEach((item) => item.classList.toggle("is-selected", item === button));
    hint.textContent = `Tap or click the cake to add ${button.getAttribute("aria-label" ).toLowerCase()}.`;
  }

  // Pointer capture keeps a drag continuous when a finger or mouse leaves the tray item.
  function startDrag(event, button) {
    if (event.button !== 0) return;
    event.preventDefault();
    const kind = button.dataset.kind;
    selectTopping(button);
    const proxy = button.cloneNode(true);
    proxy.className = "topping drag-proxy";
    proxy.setAttribute("aria-hidden", "true");
    proxy.querySelectorAll("span").forEach((span) => {
      if (span.classList.contains("topping-glyph")) span.textContent = glyphs[kind];
    });
    document.body.append(proxy);
    drag = { pointerId: event.pointerId, kind, button, proxy, startX: event.clientX, startY: event.clientY, moved: false };
    button.setPointerCapture(event.pointerId);
    moveProxy(event.clientX, event.clientY);
  }

  function moveProxy(x, y) {
    if (!drag) return;
    drag.proxy.style.left = `${x}px`;
    drag.proxy.style.top = `${y}px`;
    if (Math.hypot(x - drag.startX, y - drag.startY) > 7) drag.moved = true;
  }

  function finishDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const current = drag;
    const bounds = dropzone.getBoundingClientRect();
    current.proxy.remove();

    if (current.moved && event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom) {
      const x = ((event.clientX - bounds.left) / bounds.width) * 100;
      const y = ((event.clientY - bounds.top) / bounds.height) * 100;
      placeDecoration(current.kind, x, y, event.clientX, event.clientY);
      suppressNextClick = true;
    }
    drag = null;
    if (suppressNextClick) window.setTimeout(() => { suppressNextClick = false; }, 0);
  }

  document.addEventListener("pointermove", (event) => {
    if (drag && drag.pointerId === event.pointerId) moveProxy(event.clientX, event.clientY);
  });
  document.addEventListener("pointerup", finishDrag);
  document.addEventListener("pointercancel", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.proxy.remove();
    drag = null;
  });

  // The whole cake is a forgiving drop target; keyboard users can select a topping and press Enter.
  dropzone.addEventListener("click", (event) => {
    if (!selectedKind || event.target.closest(".placed-decoration")) return;
    const bounds = dropzone.getBoundingClientRect();
    const x = Math.max(12, Math.min(88, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.max(18, Math.min(82, ((event.clientY - bounds.top) / bounds.height) * 100));
    placeDecoration(selectedKind, x, y, event.clientX || bounds.left + bounds.width * x / 100, event.clientY || bounds.top + bounds.height * y / 100);
  });
  dropzone.addEventListener("keydown", (event) => {
    if ((event.key !== "Enter" && event.key !== " ") || !selectedKind) return;
    event.preventDefault();
    const bounds = dropzone.getBoundingClientRect();
    const x = 20 + Math.random() * 60;
    const y = 25 + Math.random() * 48;
    placeDecoration(selectedKind, x, y, bounds.left + bounds.width * x / 100, bounds.top + bounds.height * y / 100);
  });

  function createCakeDecoration(type, x, y, delay = 0) {
    const piece = document.createElement("span");
    piece.className = `placed-decoration kind-${type}`;
    piece.setAttribute("aria-hidden", "true");
    piece.style.left = `${x}%`;
    piece.style.top = `${y}%`;
    piece.style.setProperty("--tilt", `${Math.round((Math.random() - 0.5) * 24)}deg`);
    piece.style.zIndex = ["candle", "topper"].includes(type) ? "5" : y > 62 ? "1" : "2";
    piece.style.animationDelay = `${delay}ms`;

    const art = document.createElement("span");
    art.className = "decoration-art";

    if (type === "strawberry") {
      const leaves = makeDecorationPart(art, "strawberry-leaves");
      for (let index = 0; index < 5; index += 1) makeDecorationPart(leaves, "leaf");
      makeDecorationPart(art, "strawberry-body");
    } else if (type === "blueberry") {
      const cluster = makeDecorationPart(art, "berry-cluster");
      for (let index = 0; index < 4; index += 1) {
        const berry = makeDecorationPart(cluster, "berry");
        berry.style.setProperty("--berry-index", String(index));
      }
    } else if (type === "cherry") {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 64 52");
      svg.setAttribute("class", "cherry-pair");
      const stems = document.createElementNS("http://www.w3.org/2000/svg", "path");
      stems.setAttribute("d", "M18 31 C14 16 26 10 30 6 C37 1 44 12 45 29");
      stems.setAttribute("class", "cherry-stems");
      svg.append(stems);
      for (const [cx, cy, radius] of [[19, 34, 12], [46, 34, 13]]) {
        const cherry = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        cherry.setAttribute("cx", String(cx));
        cherry.setAttribute("cy", String(cy));
        cherry.setAttribute("r", String(radius));
        cherry.setAttribute("class", "cherry-fruit");
        svg.append(cherry);
        const shine = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        shine.setAttribute("cx", String(cx - 4));
        shine.setAttribute("cy", String(cy - 5));
        shine.setAttribute("rx", "3");
        shine.setAttribute("ry", "4");
        shine.setAttribute("class", "cherry-shine");
        svg.append(shine);
      }
      art.append(svg);
    } else if (type === "candle") {
      makeDecorationPart(art, "candle-wick");
      makeDecorationPart(art, "candle-flame");
      makeDecorationPart(art, "candle-body");
      makeDecorationPart(art, "candle-base");
    } else if (type === "sprinkles") {
      const colors = ["#ed5b79", "#247ac5", "#ffc429", "#ef8246", "#71a878", "#f5f0e5"];
      const amount = 15 + Math.floor(Math.random() * 11);
      for (let index = 0; index < amount; index += 1) {
        const sprinkle = makeDecorationPart(art, `sprinkle ${index % 5 === 0 ? "is-dot" : ""}`);
        sprinkle.style.left = `${Math.random() * 100}%`;
        sprinkle.style.top = `${Math.random() * 100}%`;
        sprinkle.style.setProperty("--sprinkle-color", colors[Math.floor(Math.random() * colors.length)]);
        sprinkle.style.setProperty("--sprinkle-tilt", `${Math.round(Math.random() * 170 - 85)}deg`);
        sprinkle.style.setProperty("--sprinkle-size", `${3 + Math.random() * 3}px`);
      }
    } else if (type === "chocolate") {
      const shard = makeDecorationPart(art, "chocolate-shard");
      makeDecorationPart(shard, "chocolate-ridge");
    } else if (type === "cookie") {
      const cookie = makeDecorationPart(art, "cookie-disc");
      for (let index = 0; index < 6; index += 1) {
        const chip = makeDecorationPart(cookie, "cookie-chip");
        chip.style.setProperty("--chip-index", String(index));
      }
    } else if (type === "star") {
      const star = makeDecorationPart(art, "fondant-star");
      makeDecorationPart(star, "star-glint");
    } else if (type === "frosting") {
      const colors = [
        ["#ed8da7", "#ce5475", "#fff0e9"],
        ["#f5cc64", "#dc9c32", "#fff7cf"],
        ["#94c6e3", "#528db9", "#edfaff"],
        ["#b1c891", "#789561", "#f4f8dc"],
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];
      art.style.setProperty("--rosette-light", color[0]);
      art.style.setProperty("--rosette-shade", color[1]);
      art.style.setProperty("--rosette-highlight", color[2]);
      const rosette = makeDecorationPart(art, "piped-rosette");
      for (let index = 0; index < 6; index += 1) makeDecorationPart(rosette, "rosette-fold");
      makeDecorationPart(rosette, "rosette-center");
    } else if (type === "topper") {
      const sticks = makeDecorationPart(art, "topper-sticks");
      makeDecorationPart(sticks, "topper-stick");
      makeDecorationPart(sticks, "topper-stick");
      const sign = makeDecorationPart(art, "topper-sign");
      sign.append(document.createElement("span"), document.createElement("span"));
      sign.children[0].textContent = "HAPPY";
      sign.children[1].textContent = "BIRTHDAY";
    }

    piece.append(art);
    return piece;
  }

  function makeDecorationPart(parent, className) {
    const part = document.createElement("span");
    part.className = className;
    parent.append(part);
    return part;
  }

  function placeDecoration(kind, x, y, clientX, clientY, delay = 0) {
    const piece = createCakeDecoration(kind, x, y, delay);
    cakePieces.append(piece);
    decorations += 1;
    updateProgress();
    flashAt(clientX, clientY);
    if (!reducedMotion) sparkleBurst(clientX, clientY, 4);
  }

  function updateProgress() {
    countDisplay.textContent = String(decorations);
    progressTrack.setAttribute("aria-valuenow", String(Math.min(decorations, requiredDecorations)));
    progressFill.style.width = `${Math.min(100, decorations / requiredDecorations * 100)}%`;
    if (decorations >= requiredDecorations && !hasCelebrated) {
      hasCelebrated = true;
      completionPanel.hidden = false;
      hint.classList.add("is-hidden");
      if (!reducedMotion) window.setTimeout(() => confettiBurst(window.innerWidth / 2, window.innerHeight * .35, 105), 120);
    }
  }

  function flashAt(x, y) {
    const flash = document.createElement("span");
    flash.className = "drop-flash";
    flash.style.left = `${x}px`;
    flash.style.top = `${y}px`;
    document.body.append(flash);
    window.setTimeout(() => flash.remove(), 520);
  }

  function sparkleBurst(x, y, amount) {
    for (let index = 0; index < amount; index += 1) {
      const sparkle = document.createElement("span");
      const angle = Math.random() * Math.PI * 2;
      const distance = 12 + Math.random() * 24;
      sparkle.className = "mini-sparkle";
      sparkle.style.left = `${x}px`;
      sparkle.style.top = `${y}px`;
      sparkle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      sparkle.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
      sparkle.style.setProperty("--sparkle-delay", `${index * 18}ms`);
      sparkle.style.setProperty("--sparkle-color", confettiColors[index % confettiColors.length]);
      confettiLayer.append(sparkle);
      window.setTimeout(() => sparkle.remove(), 560);
    }
  }

  function confettiBurst(x, y, amount) {
    for (let index = 0; index < amount; index += 1) {
      const particle = document.createElement("span");
      const isStar = index % 9 === 0;
      const angle = Math.random() * Math.PI * 2;
      const distance = 25 + Math.random() * (amount > 20 ? 170 : 58);
      particle.className = `mini-confetti${isStar ? " is-star" : ""}`;
      particle.style.setProperty("--x", `${x}px`);
      particle.style.setProperty("--y", `${y}px`);
      particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      particle.style.setProperty("--dy", `${Math.sin(angle) * distance + 90}px`);
      particle.style.setProperty("--spin", `${Math.random() * 600 - 300}deg`);
      particle.style.setProperty("--size", `${isStar ? 11 : 4 + Math.random() * 6}px`);
      particle.style.setProperty("--duration", `${550 + Math.random() * 500}ms`);
      particle.style.setProperty("--color", confettiColors[Math.floor(Math.random() * confettiColors.length)]);
      confettiLayer.append(particle);
      window.setTimeout(() => particle.remove(), 1150);
    }
  }

  function clearCake() {
    cakePieces.replaceChildren();
    confettiLayer.replaceChildren();
    decorations = 0;
    selectedKind = null;
    hasCelebrated = false;
    document.querySelectorAll(".topping").forEach((button) => button.classList.remove("is-selected"));
    completionPanel.hidden = true;
    hint.classList.remove("is-hidden");
    hint.textContent = "Pick a topping, then drag it onto the cake.";
    updateProgress();
  }

  document.querySelector("#reset-button").addEventListener("click", clearCake);
})();