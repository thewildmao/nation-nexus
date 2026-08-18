import {
  formatElapsed,
  elapsedMs,
  pauseClock,
  PLAYABLE_MODES,
  resumeClock,
} from "../game/run.js";
import { el } from "./dom.js";

let tick = null;
let stateRef = null;

function overlaysOpen() {
  return !!(
    (el.settingsWrap && el.settingsWrap.classList.contains("is-open")) ||
    (el.confirmWrap && el.confirmWrap.classList.contains("is-open")) ||
    (el.filterLayer && el.filterLayer.classList.contains("is-open"))
  );
}

export function shouldRunClock(state) {
  if (document.hidden) return false;
  if (!PLAYABLE_MODES.includes(state.mode)) return false;
  if (state.mode === "map" && state.map.explore) return false;
  const run = state.runs[state.mode];
  if (!run || run.finished) return false;
  if (!run.startedAt && !run.elapsedMs && !run.runningSince) return false;
  if (overlaysOpen()) return false;
  return true;
}

export function paintTimer(state) {
  if (!el.timer) return;
  const run = PLAYABLE_MODES.includes(state.mode) ? state.runs[state.mode] : null;
  const show = !!(run && (run.startedAt || run.elapsedMs));
  if (el.timerStat) el.timerStat.classList.toggle("hidden", !show);
  const next = show ? formatElapsed(elapsedMs(run)) : "0:00";
  if (el.timer.textContent !== next) el.timer.textContent = next;
}

export function syncPlayClock(state) {
  PLAYABLE_MODES.forEach((mode) => {
    const run = state.runs[mode];
    if (!run) return;
    if (mode === state.mode && shouldRunClock(state)) resumeClock(run);
    else pauseClock(run);
  });
  paintTimer(state);
}

export function notifyClock() {
  if (stateRef) syncPlayClock(stateRef);
}

export function bindTimer(state) {
  stateRef = state;
  if (tick) clearInterval(tick);
  tick = setInterval(() => paintTimer(state), 250);
  document.addEventListener("visibilitychange", () => syncPlayClock(state));
  syncPlayClock(state);
}
