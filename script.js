const card = document.getElementById("card");
const imageBox = document.getElementById("imageBox");
const title = document.getElementById("title");
const subtitle = document.getElementById("subtitle");

const yesBtn = document.getElementById("yesBtn");
const noWrap = document.getElementById("noWrap");
const noBtn = document.getElementById("noBtn");

const state = {
  x: 0,
  y: 0,
  lastMoveAt: 0
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function getButtonSize() {
  const r = noWrap.getBoundingClientRect();
  return { w: r.width, h: r.height };
}

function animateTo(nx, ny) {
  noWrap.classList.add("is-moving");

  const anim = noWrap.animate(
    [
      { transform: `translate(${state.x}px, ${state.y}px)` },
      { transform: `translate(${nx}px, ${ny}px)` }
    ],
    {
      duration: 330,
      easing: "cubic-bezier(.2, .9, .2, 1)",
      fill: "forwards"
    }
  );

  anim.onfinish = () => {
    state.x = nx;
    state.y = ny;
    noWrap.style.transform = `translate(${state.x}px, ${state.y}px)`;
    noWrap.classList.remove("is-moving");
  };
}

function runAwayFromCursor(clientX, clientY) {
  const now = performance.now();
  if (now - state.lastMoveAt < 120) return;
  state.lastMoveAt = now;

  const { w, h } = getButtonSize();
  const rect = noWrap.getBoundingClientRect();

  const padding = 14;
  const minX = padding;
  const minY = padding;
  const maxX = window.innerWidth - w - padding;
  const maxY = window.innerHeight - h - padding;

  const minDistance = Math.min(window.innerWidth, window.innerHeight) * 0.45;

  let best = null;
  let bestScore = -Infinity;

  for (let i = 0; i < 22; i++) {
    const candX = rand(minX, maxX);
    const candY = rand(minY, maxY);

    const dx = (candX + w / 2) - clientX;
    const dy = (candY + h / 2) - clientY;
    const dist = Math.hypot(dx, dy);

    const moveDx = candX - rect.left;
    const moveDy = candY - rect.top;
    const moveDist = Math.hypot(moveDx, moveDy);

    const score = dist * 2 + moveDist;

    if (dist >= minDistance && score > bestScore) {
      bestScore = score;
      best = { x: candX, y: candY };
    }
  }

  if (!best) {
    for (let i = 0; i < 12; i++) {
      const candX = rand(minX, maxX);
      const candY = rand(minY, maxY);

      const dx = (candX + w / 2) - clientX;
      const dy = (candY + h / 2) - clientY;
      const dist = Math.hypot(dx, dy);

      if (dist > bestScore) {
        bestScore = dist;
        best = { x: candX, y: candY };
      }
    }
  }

  const baseLeft = parseFloat(getComputedStyle(noWrap).left);
  const baseTop = parseFloat(getComputedStyle(noWrap).top);

  const nx = best.x - baseLeft;
  const ny = best.y - baseTop;

  animateTo(nx, ny);
}

function onPointerMove(e) {
  const rect = noWrap.getBoundingClientRect();

  const cx = e.clientX;
  const cy = e.clientY;

  const bx = rect.left + rect.width / 2;
  const by = rect.top + rect.height / 2;

  const dist = Math.hypot(cx - bx, cy - by);

  const danger = 170;

  if (dist < danger) runAwayFromCursor(cx, cy);
}

noWrap.addEventListener("mouseenter", (e) => runAwayFromCursor(e.clientX, e.clientY));
noWrap.addEventListener("pointerdown", (e) => runAwayFromCursor(e.clientX, e.clientY));
document.addEventListener("pointermove", onPointerMove);

noWrap.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    const t = e.touches[0];
    runAwayFromCursor(t.clientX, t.clientY);
  },
  { passive: false }
);

yesBtn.addEventListener("click", () => {
  noWrap.style.display = "none";

  card.classList.add("success");

  imageBox.style.backgroundImage =
    'linear-gradient(135deg, rgba(255,79,162,.12), rgba(255,255,255,.08)), url("https://images.unsplash.com/photo-1513628253939-010e64ac66cd?auto=format&fit=crop&w=1200&q=80")';

  title.textContent = "I knew you’d say yes ❤️";
  subtitle.textContent = "Now come here… I owe you a sweet hug 💘";
});

window.addEventListener("resize", () => {
  const rect = noWrap.getBoundingClientRect();
  const pad = 14;

  const maxX = window.innerWidth - rect.width - pad;
  const maxY = window.innerHeight - rect.height - pad;

  const left = clamp(rect.left, pad, maxX);
  const top = clamp(rect.top, pad, maxY);

  const baseLeft = parseFloat(getComputedStyle(noWrap).left);
  const baseTop = parseFloat(getComputedStyle(noWrap).top);

  animateTo(left - baseLeft, top - baseTop);
});
