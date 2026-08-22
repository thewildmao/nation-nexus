import { comboBreak, comboCall } from "../shared/combo.js";
import { soundEnabled, soundLevel } from "../shared/prefs.js";

let ctx = null;
let master = null;
let noiseBuf = null;
let primed = false;

const RECIPES = {
  tick: { tones: [{ freq: 1480, dur: 0.028, type: "triangle", gain: 0.02, at: 0 }] },
  click: { tones: [{ freq: 980, dur: 0.03, type: "triangle", gain: 0.028, at: 0 }] },
  open: {
    tones: [
      { freq: 620, dur: 0.06, type: "triangle", gain: 0.03, at: 0 },
      { freq: 930, dur: 0.08, type: "triangle", gain: 0.028, at: 0.05 },
    ],
  },
  close: {
    tones: [
      { freq: 930, dur: 0.05, type: "triangle", gain: 0.026, at: 0 },
      { freq: 560, dur: 0.08, type: "triangle", gain: 0.024, at: 0.04 },
    ],
  },
  next: {
    tones: [
      { freq: 700, dur: 0.05, type: "triangle", gain: 0.03, at: 0 },
      { freq: 940, dur: 0.07, type: "triangle", gain: 0.028, at: 0.04 },
    ],
  },
  nav: { tones: [{ freq: 660, dur: 0.05, type: "triangle", gain: 0.026, at: 0 }] },
  toggle: {
    tones: [
      { freq: 740, dur: 0.04, type: "square", gain: 0.025, at: 0 },
      { freq: 980, dur: 0.05, type: "triangle", gain: 0.02, at: 0.03 },
    ],
  },
  correct: {
    tones: [
      { freq: 392, dur: 0.08, type: "triangle", gain: 0.055, at: 0 },
      { freq: 523, dur: 0.11, type: "triangle", gain: 0.065, at: 0.07 },
    ],
  },
  "combo-2": {
    tones: [
      { freq: 523, dur: 0.07, type: "triangle", gain: 0.05, at: 0 },
      { freq: 659, dur: 0.11, type: "triangle", gain: 0.06, at: 0.065 },
    ],
  },
  "combo-3": {
    tones: [
      { freq: 523, dur: 0.06, type: "triangle", gain: 0.045, at: 0 },
      { freq: 659, dur: 0.06, type: "triangle", gain: 0.05, at: 0.06 },
      { freq: 784, dur: 0.12, type: "triangle", gain: 0.062, at: 0.12 },
    ],
  },
  "combo-4": {
    tones: [
      { freq: 523, dur: 0.055, type: "triangle", gain: 0.042, at: 0 },
      { freq: 659, dur: 0.055, type: "triangle", gain: 0.048, at: 0.055 },
      { freq: 784, dur: 0.055, type: "triangle", gain: 0.052, at: 0.11 },
      { freq: 1046, dur: 0.14, type: "triangle", gain: 0.065, at: 0.165 },
    ],
  },
  fire: {
    tones: [
      { freq: 523, dur: 0.055, type: "triangle", gain: 0.04, at: 0 },
      { freq: 659, dur: 0.055, type: "triangle", gain: 0.045, at: 0.055 },
      { freq: 784, dur: 0.055, type: "triangle", gain: 0.05, at: 0.11 },
      { freq: 1046, dur: 0.16, type: "triangle", gain: 0.06, at: 0.165 },
      { freq: 784, dur: 0.14, type: "triangle", gain: 0.038, at: 0.2 },
    ],
    noises: [{ dur: 0.14, gain: 0.028, hp: 1400, at: 0.16 }],
  },
  "fire-6": {
    tones: [
      { freq: 523, dur: 0.05, type: "triangle", gain: 0.038, at: 0 },
      { freq: 659, dur: 0.05, type: "triangle", gain: 0.042, at: 0.05 },
      { freq: 784, dur: 0.05, type: "triangle", gain: 0.048, at: 0.1 },
      { freq: 1046, dur: 0.08, type: "triangle", gain: 0.055, at: 0.15 },
      { freq: 1319, dur: 0.16, type: "triangle", gain: 0.058, at: 0.2 },
    ],
    noises: [{ dur: 0.16, gain: 0.032, hp: 1500, at: 0.18 }],
  },
  "fire-7": {
    tones: [
      { freq: 523, dur: 0.05, type: "triangle", gain: 0.036, at: 0 },
      { freq: 659, dur: 0.05, type: "triangle", gain: 0.04, at: 0.05 },
      { freq: 784, dur: 0.05, type: "triangle", gain: 0.046, at: 0.1 },
      { freq: 1046, dur: 0.07, type: "triangle", gain: 0.052, at: 0.15 },
      { freq: 2093, dur: 0.18, type: "triangle", gain: 0.05, at: 0.21 },
    ],
    noises: [{ dur: 0.16, gain: 0.03, hp: 1600, at: 0.2 }],
  },
  "fire-max": {
    tones: [
      { freq: 523, dur: 0.05, type: "triangle", gain: 0.036, at: 0 },
      { freq: 659, dur: 0.05, type: "triangle", gain: 0.04, at: 0.05 },
      { freq: 784, dur: 0.05, type: "triangle", gain: 0.046, at: 0.1 },
      { freq: 1046, dur: 0.06, type: "triangle", gain: 0.05, at: 0.15 },
      { freq: 1319, dur: 0.07, type: "triangle", gain: 0.052, at: 0.2 },
      { freq: 2093, dur: 0.2, type: "triangle", gain: 0.055, at: 0.26 },
    ],
    noises: [{ dur: 0.18, gain: 0.028, hp: 1800, at: 0.24 }],
  },
  "finish-win": {
    tones: [
      { freq: 523, dur: 0.12, type: "triangle", gain: 0.055, at: 0 },
      { freq: 659, dur: 0.12, type: "triangle", gain: 0.05, at: 0.1 },
      { freq: 784, dur: 0.14, type: "triangle", gain: 0.055, at: 0.2 },
      { freq: 1046, dur: 0.22, type: "square", gain: 0.048, at: 0.32 },
    ],
  },
  "finish-perfect": {
    tones: [
      { freq: 523, dur: 0.11, type: "triangle", gain: 0.055, at: 0 },
      { freq: 659, dur: 0.11, type: "triangle", gain: 0.05, at: 0.09 },
      { freq: 784, dur: 0.12, type: "triangle", gain: 0.055, at: 0.18 },
      { freq: 1046, dur: 0.16, type: "square", gain: 0.05, at: 0.28 },
      { freq: 1319, dur: 0.22, type: "triangle", gain: 0.042, at: 0.42 },
    ],
    noises: [{ dur: 0.16, gain: 0.03, hp: 1200, at: 0.4 }],
  },
  "finish-exit": {
    tones: [{ freq: 392, end: 196, dur: 0.24, type: "triangle", gain: 0.042, at: 0 }],
  },
  wrong: {
    tones: [{ freq: 196, end: 82, dur: 0.14, type: "sawtooth", gain: 0.08, at: 0 }],
    noises: [{ dur: 0.12, gain: 0.05, hp: 180, at: 0 }],
  },
  break: {
    tones: [
      { freq: 330, end: 90, dur: 0.18, type: "sawtooth", gain: 0.07, at: 0 },
      { freq: 220, end: 70, dur: 0.16, type: "square", gain: 0.04, at: 0.02 },
    ],
    noises: [{ dur: 0.16, gain: 0.055, hp: 90, at: 0 }],
  },
  "break-fire": {
    tones: [
      { freq: 196, end: 55, dur: 0.22, type: "sawtooth", gain: 0.08, at: 0 },
      { freq: 98, end: 40, dur: 0.2, type: "square", gain: 0.045, at: 0.02 },
    ],
    noises: [{ dur: 0.2, gain: 0.06, hp: 60, at: 0 }],
  },
  "launch-map": {
    tones: [
      { freq: 392, dur: 0.09, type: "triangle", gain: 0.045, at: 0 },
      { freq: 494, dur: 0.09, type: "triangle", gain: 0.042, at: 0.08 },
      { freq: 587, dur: 0.1, type: "triangle", gain: 0.048, at: 0.16 },
      { freq: 784, dur: 0.16, type: "square", gain: 0.04, at: 0.26 },
    ],
  },
  "launch-flags": {
    tones: [
      { freq: 523, dur: 0.08, type: "triangle", gain: 0.045, at: 0 },
      { freq: 659, dur: 0.08, type: "triangle", gain: 0.04, at: 0.07 },
      { freq: 784, dur: 0.09, type: "triangle", gain: 0.046, at: 0.14 },
      { freq: 1046, dur: 0.16, type: "square", gain: 0.04, at: 0.24 },
    ],
  },
  "launch-capitals": {
    tones: [
      { freq: 523, dur: 0.08, type: "triangle", gain: 0.045, at: 0 },
      { freq: 659, dur: 0.08, type: "triangle", gain: 0.042, at: 0.08 },
      { freq: 784, dur: 0.1, type: "triangle", gain: 0.048, at: 0.16 },
      { freq: 988, dur: 0.16, type: "square", gain: 0.038, at: 0.26 },
    ],
  },
};

function audioCtor() {
  return window.AudioContext || window.webkitAudioContext;
}

function ready() {
  return !!(ctx && master && ctx.state === "running");
}

function makeNoiseBuffer(c) {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.3), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buf;
}

function makeCtx() {
  const AC = audioCtor();
  if (!AC) return null;
  if (!ctx) {
    try {
      ctx = new AC({ latencyHint: "interactive" });
    } catch {
      ctx = new AC();
    }
  }
  if (!master) {
    master = ctx.createGain();
    master.gain.value = soundLevel();
    master.connect(ctx.destination);
  }
  if (!noiseBuf) noiseBuf = makeNoiseBuffer(ctx);
  return ctx;
}

function primeGraph() {
  if (!ready() || primed) return;
  const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(master);
  try {
    src.start();
    primed = true;
  } catch {
    /* context still closed */
  }
}

export function unlockSfx() {
  makeCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().then(primeGraph).catch(() => {});
    return;
  }
  primeGraph();
}

function ensureRunning() {
  if (!ctx) return Promise.resolve(false);
  if (ctx.state === "running") return Promise.resolve(true);
  return ctx.resume().then(() => ctx.state === "running").catch(() => false);
}

export function applyVolume() {
  if (master) master.gain.value = soundLevel();
}

function dump(node) {
  try {
    node.onended = null;
  } catch {
    /* not a source */
  }
  try {
    node.disconnect();
  } catch {
    /* already gone */
  }
}

function envGain(now, peak, dur) {
  const g = ctx.createGain();
  const level = Math.max(0.0001, peak || 0.07);
  g.gain.setValueAtTime(level, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.02, dur));
  return g;
}

function tone({ freq, end, dur, type = "triangle", gain = 0.07, at = 0 }) {
  if (!ready()) return;
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const g = envGain(t, gain, dur);
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (end) o.frequency.exponentialRampToValueAtTime(Math.max(1, end), t + dur);
  o.connect(g);
  g.connect(master);
  o.onended = () => {
    o.onended = null;
    dump(o);
    dump(g);
  };
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise({ dur, gain = 0.05, at = 0, hp = 400 }) {
  if (!ready() || !noiseBuf) return;
  const t = ctx.currentTime + at;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = hp;
  const g = envGain(t, gain, dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.onended = () => {
    src.onended = null;
    dump(src);
    dump(filter);
    dump(g);
  };
  src.start(t);
  src.stop(t + dur + 0.02);
}

function playLive(name) {
  const recipe = RECIPES[name];
  if (!recipe || !ready()) return false;
  (recipe.tones || []).forEach((n) => tone(n));
  (recipe.noises || []).forEach((n) => noise(n));
  return true;
}

function playClip(name) {
  if (!soundEnabled()) return;
  if (!ctx) makeCtx();
  if (!ctx) return;
  if (ready()) {
    primeGraph();
    playLive(name);
    return;
  }
  ensureRunning().then((ok) => {
    if (!ok || !soundEnabled()) return;
    primeGraph();
    playLive(name);
  });
}

const HIT_CLIP = {
  DOUBLE: "combo-2",
  TRIPLE: "combo-3",
  QUAD: "combo-4",
  "ON FIRE": "fire",
  RAMPAGE: "fire-6",
  UNSTOPPABLE: "fire-7",
  GODLIKE: "fire-max",
};

const MISS_CLIP = {
  "STREAK BROKEN": "break",
  "FIRE OUT": "break-fire",
};

export function playAward(award) {
  if (!award) return;
  if (award.hit) {
    const call = comboCall(award.streak);
    playClip(HIT_CLIP[call.title] || "correct");
    return;
  }
  const broke = comboBreak(award.lostStreak);
  playClip(MISS_CLIP[broke.title] || "wrong");
}

export function playClick() {
  playClip("click");
}

export function playToggle() {
  playClip("toggle");
}

export function playOpen() {
  playClip("open");
}

export function playClose() {
  playClip("close");
}

export function playNext() {
  playClip("next");
}

export function playNav() {
  playClip("nav");
}

const CLICK_SEL = [
  "button:not(:disabled)",
  "a.btn-glass",
  "a.scoreboard-link",
  "a.ghost-link",
  "a.home-btn",
  "a.study-link",
  "a.back-games",
  ".filter-toggle",
  ".settings-btn",
  ".board-filter",
  ".answer-mode button",
].join(",");

export function bindUiSfx() {
  const wake = () => unlockSfx();
  document.addEventListener("pointerdown", wake, { capture: true });
  document.addEventListener("keydown", wake, { capture: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") unlockSfx();
  });
  window.addEventListener("pageshow", wake);

  document.addEventListener("pointerdown", (e) => {
    const node = e.target.closest(CLICK_SEL);
    if (!node) return;
    if (node.closest("[data-card]") || node.classList.contains("guide-play")) return;
    if (node.closest(".option-btn")) return;
    if (node.classList.contains("settings-btn") || node.id === "settingsClose") return;
    if (node.id === "newGame" || node.id === "nextBtn" || node.id === "newMapTarget") return;
    playClick();
  });
}

export function playLaunch(mode) {
  if (mode === "map") {
    playClip("launch-map");
    return;
  }
  if (mode === "capitals") {
    playClip("launch-capitals");
    return;
  }
  playClip("launch-flags");
}

export function playFinish(recap) {
  if (!recap) return;
  if (recap.ended === "exited") {
    playClip("finish-exit");
    return;
  }
  const asked = recap.asked || 0;
  const perfect = asked > 0 && recap.correct === asked;
  playClip(perfect || (recap.bestStreak || 0) >= 5 ? "finish-perfect" : "finish-win");
}

export function previewVolume() {
  applyVolume();
  if (!soundEnabled()) return;
  playClick();
}
