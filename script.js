// script.js

const card = document.getElementById("card");
const buttons = document.getElementById("buttons");
const yesBtn = document.getElementById("yesBtn");
const noBtn = document.getElementById("noBtn");
const imageBox = document.getElementById("imageBox");
const title = document.getElementById("title");
const subtitle = document.getElementById("subtitle");

let noIsFloating = false;

// ---------- Smooth motion (spring physics) ----------
let x = 0, y = 0;          // current position
let tx = 0, ty = 0;        // target position
let vx = 0, vy = 0;        // velocity
let rafId = null;
let lastT = 0;

// ✅ track cursor (so we can “panic escape” even if mouse isn't on button yet)
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

window.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
}, { passive: true });

const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

// Tweak feel
const SPRING = 0.022;
const DAMPING = 0.86;
const MAX_SPEED = 60;

// ✅ important: keep margin so corners can’t trap it
const SAFE_MARGIN = 28;      // distance from edges
const CORNER_GUARD = 120;    // avoids targets too close to corners
const PANIC_DIST = 120;      // if cursor is this close while near edges => force a new target

const rand = (min, max) => Math.random() * (max - min) + min;

function getBtnSize() {
  const r = noBtn.getBoundingClientRect();
  return {
    w: r.width || 120,
    h: r.height || 44
  };
}

function bounds() {
  const { w, h } = getBtnSize();
  const minX = SAFE_MARGIN;
  const minY = SAFE_MARGIN;
  const maxX = window.innerWidth - w - SAFE_MARGIN;
  const maxY = window.innerHeight - h - SAFE_MARGIN;
  return { minX, minY, maxX: Math.max(minX, maxX), maxY: Math.max(minY, maxY), w, h };
}

function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }

function isNearEdge(px, py) {
  const { minX, minY, maxX, maxY } = bounds();
  const edgePad = 14;
  return (
    px <= minX + edgePad ||
    py <= minY + edgePad ||
    px >= maxX - edgePad ||
    py >= maxY - edgePad
  );
}

function isNearCorner(px, py) {
  const { minX, minY, maxX, maxY } = bounds();
  const left = px < minX + CORNER_GUARD;
  const right = px > maxX - CORNER_GUARD;
  const top = py < minY + CORNER_GUARD;
  const bottom = py > maxY - CORNER_GUARD;
  return (left && top) || (left && bottom) || (right && top) || (right && bottom);
}

function applyTransform() {
  noBtn.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

function startMotionLoop() {
  if (rafId) return;
  lastT = performance.now();

  const tick = (t) => {
    rafId = requestAnimationFrame(tick);

    const dt = Math.min(32, t - lastT);
    lastT = t;
    const s = dt / 16.67;

    // spring acceleration
    let ax = (tx - x) * SPRING * s;
    let ay = (ty - y) * SPRING * s;

    vx = (vx + ax) * Math.pow(DAMPING, s);
    vy = (vy + ay) * Math.pow(DAMPING, s);

    vx = clamp(vx, -MAX_SPEED, MAX_SPEED);
    vy = clamp(vy, -MAX_SPEED, MAX_SPEED);

    x += vx * s;
    y += vy * s;

    // ✅ bounce off walls instead of sticking
    const { minX, minY, maxX, maxY } = bounds();

    if (x <= minX) { x = minX; vx = Math.abs(vx) + 6; }
    if (x >= maxX) { x = maxX; vx = -Math.abs(vx) - 6; }
    if (y <= minY) { y = minY; vy = Math.abs(vy) + 6; }
    if (y >= maxY) { y = maxY; vy = -Math.abs(vy) - 6; }

    // ✅ if target is outside safe area, clamp target too
    tx = clamp(tx, minX, maxX);
    ty = clamp(ty, minY, maxY);

    // ✅ panic escape: if cursor is close and we're near edges, push target inward
    if (isNearEdge(x, y)) {
      const { w, h } = bounds();
      const cx = x + w / 2;
      const cy = y + h / 2;
      const d = Math.hypot(cx - mouseX, cy - mouseY);

      if (d < PANIC_DIST) {
        // aim toward center-ish
        tx = clamp(tx + (cx - mouseX) * 1.4 + rand(-80, 80), minX, maxX);
        ty = clamp(ty + (cy - mouseY) * 1.4 + rand(-60, 60), minY, maxY);
        vx += (tx - x) * SPRING * 8;
        vy += (ty - y) * SPRING * 8;
      }
    }

    applyTransform();
  };

  rafId = requestAnimationFrame(tick);
}

function stopMotionLoop() {
  if (!rafId) return;
  cancelAnimationFrame(rafId);
  rafId = null;
}

function makeNoFloatAtCurrentPosition() {
  if (noIsFloating) return;
  noIsFloating = true;

  const r = noBtn.getBoundingClientRect();
  document.body.appendChild(noBtn);
  noBtn.classList.add("no-float");

  x = r.left;
  y = r.top;
  tx = x;
  ty = y;
  vx = 0;
  vy = 0;

  // clamp inside safe area immediately
  const { minX, minY, maxX, maxY } = bounds();
  x = clamp(x, minX, maxX);
  y = clamp(y, minY, maxY);
  tx = x; ty = y;

  applyTransform();
  startMotionLoop();
}

// ✅ pick targets that avoid corners and stay safely inside
function pickSafeTargetAwayFrom(cursorX, cursorY) {
  const { minX, minY, maxX, maxY, w, h } = bounds();

  const bx = x + w / 2;
  const by = y + h / 2;

  // direction away from cursor
  let dx = bx - cursorX;
  let dy = by - cursorY;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len; dy /= len;

  // push more when closer
  const dist = Math.max(1, Math.hypot(bx - cursorX, by - cursorY));
  const push = Math.min(560, Math.max(260, 760 - dist));

  let bestX = bx + dx * push + rand(-120, 120) - w / 2;
  let bestY = by + dy * push + rand(-90, 90) - h / 2;

  bestX = clamp(bestX, minX, maxX);
  bestY = clamp(bestY, minY, maxY);

  // If target would land near a corner, reroll a few times
  for (let i = 0; i < 10 && isNearCorner(bestX, bestY); i++) {
    bestX = clamp(rand(minX, maxX), minX, maxX);
    bestY = clamp(rand(minY, maxY), minY, maxY);
  }

  return [bestX, bestY];
}

function escape(e) {
  if (card.classList.contains("success")) return;

  makeNoFloatAtCurrentPosition();

  const cx = e?.clientX ?? mouseX ?? window.innerWidth / 2;
  const cy = e?.clientY ?? mouseY ?? window.innerHeight / 2;

  if (prefersReduced) {
    const [nx, ny] = pickSafeTargetAwayFrom(cx, cy);
    x = tx = nx;
    y = ty = ny;
    applyTransform();
    return;
  }

  const [nx, ny] = pickSafeTargetAwayFrom(cx, cy);

  noBtn.classList.add("is-moving");
  tx = nx;
  ty = ny;

  // add impulse
  vx += (tx - x) * SPRING * 10;
  vy += (ty - y) * SPRING * 10;

  setTimeout(() => noBtn.classList.remove("is-moving"), 220);
}

// Events (keep same)
noBtn.addEventListener("mouseenter", escape);
noBtn.addEventListener("mousemove", escape);
noBtn.addEventListener("pointerenter", escape);
noBtn.addEventListener("pointermove", escape);
noBtn.addEventListener("touchstart", (e) => {
  const t = e.touches?.[0];
  escape(t ? { clientX: t.clientX, clientY: t.clientY } : null);
}, { passive: true });

// Yes button (keep same)
yesBtn.addEventListener("click", () => {
  card.classList.add("success");

  imageBox.style.backgroundImage = `
    linear-gradient(135deg, rgba(255,79,162,.15), rgba(255,255,255,.1)),
    var(--img-2)
  `;

  title.textContent = "I knew you’d say yes ❤️";
  subtitle.textContent = "You just made my day 💕";

  noBtn.style.display = "none";
  stopMotionLoop();
});

window.addEventListener("resize", () => {
  if (!noIsFloating || noBtn.style.display === "none") return;

  const { minX, minY, maxX, maxY } = bounds();
  x = clamp(x, minX, maxX);
  y = clamp(y, minY, maxY);
  tx = clamp(tx, minX, maxX);
  ty = clamp(ty, minY, maxY);
  applyTransform();
});