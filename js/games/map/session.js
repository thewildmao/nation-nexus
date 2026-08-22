import { countries } from "../../../data/countries.js";
import { filterPool, findByGeoName } from "../../shared/catalog.js";
import { resolveCountryGuess, resolveMiss, startMapRound, toggleExplore } from "./rules.js";
import { continueLap, runHasProgress } from "../../shared/run.js";
import { currentRun, ensureRoundPool, MODES, resetRun } from "../../shared/state.js";
import { modeSettings } from "../../shared/settings.js";
import { confirmWarn } from "../../ui/dialog.js";
import { el } from "../../ui/dom.js";
import { renderScore } from "../../ui/score-dock.js";
import { playNext } from "../../ui/sfx.js";
import { syncPlayClock } from "../../ui/timer.js";
import { mountJumpRail, paintJumpRail } from "./jumps.js";
import * as mapView from "./view.js";
import {
  applyRegionTheme,
  renderMapMode,
  renderMapPrompt,
  renderMapResult,
  renderWaitingPrompt,
  setMapFeedback,
} from "./hud.js";

let ctx = null;

export function initMapSession(next) {
  ctx = next;
}

function state() {
  return ctx.state;
}

export function applyPoolMask() {
  const s = state();
  const pool = filterPool(s, countries);
  mapView.setActivePool(
    pool.length === countries.length ? null : pool.map((c) => c.name)
  );
  paintJumpRail(s.selectedNames);
}

export function focusCountry(name) {
  state().focusName = name || null;
  applyRegionTheme(state().focusName);
}

export function focusExploreCountry(geoName) {
  const match = findByGeoName(geoName);
  focusCountry(match ? match.name : null);
}

export function paintMapChrome() {
  renderMapMode(state());
  renderMapPrompt(state());
  renderScore(state());
}

export function bindMap() {
  mapView.initMap({
    onCountryClick: submitCountryGuess,
    onMiss: submitMiss,
    onExploreSelect: focusExploreCountry,
    isExplore: () => state().map.explore,
    isWaiting: () => state().map.waiting,
  });
  mountJumpRail();
  paintJumpRail(state().selectedNames);
}

export function startMap({ resetView = false } = {}) {
  const s = state();
  const run = currentRun(s);
  if (run && run.finished) {
    if (modeSettings(s).repeatPolicy === "cycle") continueLap(run);
    else resetRun(s, MODES.MAP);
  }
  ensureRoundPool(s, MODES.MAP);
  startMapRound(s, countries);
  focusCountry(null);
  applyPoolMask();
  mapView.clearResult();
  mapView.resetCountryStyles();
  if (resetView) mapView.resetCamera();
  paintMapChrome();
  const after = currentRun(s);
  if (after && after.finished) {
    setMapFeedback("Set complete — play again to reshuffle this set.", "var(--muted)");
  } else {
    renderWaitingPrompt();
  }
  syncPlayClock(s);
}

function applyGuess(result) {
  if (!result) return;
  ctx.announceAward();
  ctx.afterSound(() => {
    const s = state();
    const run = currentRun(s);
    const award = run && run.lastAward;
    const done = !!(run && run.finished);
    mapView.showGuess(result);
    focusCountry(result.guessed ? result.guessed.name : result.target.name);
    renderMapResult(result);
    renderScore(s);
    if (done) ctx.scheduleRecap(s.mode, "finished", award);
  });
}

export function submitCountryGuess(geoName, latlng) {
  applyGuess(resolveCountryGuess(state(), geoName, latlng));
}

export function submitMiss(latlng) {
  applyGuess(resolveMiss(state(), latlng));
}

export async function onToggleExplore() {
  const s = state();
  if (!s.map.explore) {
    if (runHasProgress(s.runs.map)) {
      const ok = await confirmWarn({
        title: "Explore the map?",
        message: "This resets your map score and streak.",
        confirmLabel: "Explore",
      });
      if (!ok) return;
    }
    ctx.cancelRecap();
    resetRun(s, MODES.MAP);
    renderScore(s);
    toggleExplore(s);
    paintMapChrome();
    applyPoolMask();
    mapView.enterExplore(s.map.waiting ? null : s.map.lastResult);
    syncPlayClock(s);
    return;
  }

  toggleExplore(s);
  mapView.exitExplore();
  startMap({ resetView: true });
  syncPlayClock(s);
}

export function goNextMap() {
  const s = state();
  if (s.map.explore) return;
  const live = currentRun(s);
  if (live && live.finished) return;
  if (s.map.waiting) return;
  ctx.cancelRecap();
  playNext();
  startMap();
}

export function enterMap() {
  const s = state();
  document.body.classList.remove("is-recap");
  if (el.breakdown) el.breakdown.classList.add("hidden");
  bindMap();
  applyPoolMask();
  renderMapMode(s);
  window.setTimeout(() => mapView.invalidateSize(), 280);
  window.setTimeout(() => {
    mapView.invalidateSize();
    if (s.map.explore) {
      applyPoolMask();
      paintMapChrome();
      return;
    }
    const run = currentRun(s);
    const target = s.map.target;
    const targetInPool = !!(target && s.selectedNames.has(target.name));
    if (run && !run.finished && targetInPool && s.map.waiting) {
      applyPoolMask();
      paintMapChrome();
      return;
    }
    startMap({ resetView: true });
  }, 80);
}

export { mapView };
