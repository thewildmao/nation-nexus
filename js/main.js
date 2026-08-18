// Input → mutate game state → paint views. Files under js/game never touch the DOM.
import { countries } from "../data/countries.js";
import { filterPool, findByGeoName } from "./game/catalog.js";
import { resolveCountryGuess, resolveMiss, startMapRound, toggleExplore } from "./game/map-round.js";
import { gradeQuizAnswer, startQuizRound } from "./game/quiz.js";
import { scoreByAt } from "./game/history.js";
import { anyRunHasProgress, continueLap, PLAYABLE_MODES, runHasProgress } from "./game/run.js";
import { beginReplay, createState, currentRun, endRun, MODES, resetAllRuns, resetRun } from "./game/state.js";
import { bindConfirm, confirmWarn } from "./view/confirm.js";
import { bindFilterTree } from "./view/filter-tree.js";
import { renderGuide } from "./view/guide.js";
import { renderHome } from "./view/home.js";
import { renderBreakdown } from "./view/breakdown.js";
import { renderScoreboard } from "./view/scoreboard.js";
import { bindHash, readHash, setHash } from "./view/nav.js";
import { bindSettings, syncSettingsForm } from "./view/settings.js";
import { bindTimer, syncPlayClock } from "./view/timer.js";
import { el } from "./view/dom.js";
import {
  applyRegionTheme,
  renderMapMode,
  renderMapPrompt,
  renderMapResult,
  renderScore,
  renderWaitingPrompt,
  setMapFeedback,
  showScreen,
} from "./view/hud.js";
import * as mapView from "./view/map-view.js";
import { modeSettings, saveSettings } from "./game/settings.js";
import { bindAnswerMode, bindQuizKeys, bindTypeInput, renderQuiz } from "./view/quiz-view.js";
import { renderStudy } from "./view/study-view.js";

const state = createState();

function currentPool() {
  return filterPool(state, countries);
}

function applyPoolMask() {
  const pool = currentPool();
  mapView.setActivePool(
    pool.length === countries.length ? null : pool.map((c) => c.name)
  );
}

function bindMap() {
  mapView.initMap({
    onCountryClick: submitCountryGuess,
    onMiss: submitMiss,
    onExploreSelect: focusExploreCountry,
    isExplore: () => state.map.explore,
    isWaiting: () => state.map.waiting,
  });
}

function paintQuiz() {
  renderQuiz(state, submitQuiz, currentPool());
  renderScore(state);
}

function startQuiz() {
  const run = currentRun(state);
  if (run && run.finished) {
    if (modeSettings(state).repeatPolicy === "cycle") continueLap(run);
    else resetRun(state, state.mode);
  }
  startQuizRound(state, countries);
  focusCountry(null);
  paintQuiz();
  syncPlayClock(state);
}

async function applyAnswerStyle(style) {
  const cfg = modeSettings(state);
  const alreadyOn = cfg.answerStyle === style && state.quiz.answerStyle === style;
  if (alreadyOn && (state.mode === MODES.FLAGS || state.mode === MODES.CAPITALS)) {
    paintQuiz();
    return;
  }

  if (cfg.answerStyle !== style) {
    const run = state.runs[state.mode];
    if (PLAYABLE_MODES.includes(state.mode) && runHasProgress(run)) {
      const ok = await confirmWarn({
        title: "Change how you answer?",
        message: "This ends your current run and saves it to the scoreboard.",
        confirmLabel: "Change and reset",
      });
      if (!ok) {
        syncSettingsForm(state);
        return;
      }
      resetRun(state, state.mode);
    }
    cfg.answerStyle = style;
    saveSettings(state.settings);
    syncSettingsForm(state);
  }

  el.answerStyle.forEach((input) => {
    input.checked = input.value === style;
  });
  if (state.mode === MODES.FLAGS || state.mode === MODES.CAPITALS) {
    startQuiz();
    renderScore(state);
    return;
  }
  renderScore(state);
}

function showBreakdown(mode, ended) {
  endRun(state, mode, ended);
  setHash("breakdown", mode);
}

function replayMisses(mode, names) {
  if (!PLAYABLE_MODES.includes(mode) || !names || !names.length) return;
  beginReplay(state, mode, names);
  if (readHash().mode === mode) enterMode({ mode, boardMode: null });
  else setHash(mode);
}

async function startFreshRun() {
  const mode = PLAYABLE_MODES.includes(state.mode) ? state.mode : null;
  if (!mode) return;
  if (runHasProgress(state.runs[mode])) {
    const ok = await confirmWarn({
      title: "Start a new game?",
      message: "This ends your current run and saves it to the scoreboard.",
      confirmLabel: "New game",
    });
    if (!ok) return;
  }
  resetRun(state, mode);
  if (mode === MODES.MAP) startMap();
  else startQuiz();
  renderScore(state);
  syncPlayClock(state);
}

function submitQuiz(index) {
  gradeQuizAnswer(state, index);
  paintQuiz();
  const run = currentRun(state);
  if (run && run.finished) showBreakdown(state.mode, "finished");
}

function focusCountry(name) {
  state.focusName = name || null;
  applyRegionTheme(state.focusName);
}

function focusExploreCountry(geoName) {
  const match = findByGeoName(geoName);
  focusCountry(match ? match.name : null);
}

function paintMapChrome() {
  renderMapMode(state);
  renderMapPrompt(state);
  renderScore(state);
}

function startMap() {
  const run = currentRun(state);
  if (run && run.finished) {
    if (modeSettings(state).repeatPolicy === "cycle") continueLap(run);
    else resetRun(state, MODES.MAP);
  }
  startMapRound(state, countries);
  focusCountry(null);
  applyPoolMask();
  mapView.clearResult();
  mapView.resetCountryStyles();
  mapView.resetCamera();
  paintMapChrome();
  const after = currentRun(state);
  if (after && after.finished) {
    setMapFeedback("Set complete — play again to reshuffle this set.", "var(--muted)");
  } else {
    renderWaitingPrompt();
  }
  syncPlayClock(state);
}

function applyGuess(result) {
  if (!result) return;
  mapView.showGuess(result);
  focusCountry(result.guessed ? result.guessed.name : result.target.name);
  renderMapResult(result);
  renderScore(state);
  const run = currentRun(state);
  if (run && run.finished) showBreakdown(state.mode, "finished");
}

function submitCountryGuess(geoName, latlng) {
  applyGuess(resolveCountryGuess(state, geoName, latlng));
}

function submitMiss(latlng) {
  applyGuess(resolveMiss(state, latlng));
}

function enterMode(route) {
  const mode = typeof route === "string" ? route : route.mode;
  const boardMode = typeof route === "string" ? null : route.boardMode;
  const recapAt = typeof route === "object" && route ? route.recapAt : null;
  state.mode = mode;
  state.boardMode = boardMode || null;
  showScreen(mode, state.boardMode);
  syncPlayClock(state);

  if (mode === MODES.HOME) {
    renderHome(state);
    return;
  }

  if (mode === MODES.HOW) {
    renderGuide();
    return;
  }

  if (mode === MODES.SCOREBOARD) {
    renderScoreboard(state);
    return;
  }

  if (mode === MODES.BREAKDOWN) {
    if (recapAt && boardMode) state.breakdown = scoreByAt(boardMode, recapAt);
    renderBreakdown(state, replayMisses, { fromBoard: !!recapAt });
    if (state.boardMode === MODES.MAP) {
      bindMap();
      setTimeout(() => mapView.invalidateSize(), 80);
    }
    return;
  }

  if (mode === MODES.STUDY) {
    const focusName = typeof route === "object" && route ? route.focusName : null;
    renderStudy(currentPool(), focusName);
    renderScore(state);
    return;
  }

  if (mode === MODES.MAP) {
    document.body.classList.remove("is-recap");
    if (el.breakdown) el.breakdown.classList.add("hidden");
    bindMap();
    renderMapMode(state);
    setTimeout(() => mapView.invalidateSize(), 280);
    setTimeout(() => {
      mapView.invalidateSize();
      if (state.map.explore) {
        paintMapChrome();
        return;
      }
      const run = currentRun(state);
      if (run && !run.finished && state.map.target && state.map.waiting) {
        paintMapChrome();
        return;
      }
      startMap();
    }, 80);
    return;
  }

  const run = currentRun(state);
  if (
    state.quiz.mode === state.mode &&
    state.quiz.answerStyle === modeSettings(state).answerStyle &&
    state.quiz.country &&
    !state.quiz.answered &&
    run &&
    !run.finished
  ) {
    paintQuiz();
    return;
  }
  startQuiz();
}

async function onToggleExplore() {
  if (!state.map.explore) {
    if (runHasProgress(state.runs.map)) {
      const ok = await confirmWarn({
        title: "Explore the map?",
        message: "This resets your map score and streak.",
        confirmLabel: "Explore",
      });
      if (!ok) return;
    }
    resetRun(state, MODES.MAP);
    renderScore(state);
    toggleExplore(state);
    paintMapChrome();
    applyPoolMask();
    mapView.enterExplore(state.map.waiting ? null : state.map.lastResult);
    syncPlayClock(state);
    return;
  }

  toggleExplore(state);
  mapView.exitExplore();
  startMap();
  syncPlayClock(state);
}

function bindInput() {
  bindHash((mode) => enterMode(mode));
  document.querySelectorAll("a.game-card[data-mode]").forEach((card) => {
    card.addEventListener("click", (e) => {
      e.preventDefault();
      const next = card.dataset.mode;
      if (readHash().mode === next) enterMode({ mode: next, boardMode: null });
      else setHash(next);
    });
  });

  bindTimer(state);
  bindConfirm();
  bindFilterTree(state, async () => {
    if (anyRunHasProgress(state)) {
      const ok = await confirmWarn({
        title: "Change regions?",
        message: "This starts a new score for Nation Needle, Flag Master, and Capital Quest. Your current runs will be saved to each game’s scoreboard.",
        confirmLabel: "Change regions",
      });
      if (!ok) return false;
    }
    resetAllRuns(state);
    if (state.mode === MODES.HOME) renderHome(state);
    else if (state.mode === MODES.SCOREBOARD) renderScoreboard(state);
    else if (state.mode === MODES.STUDY) renderStudy(currentPool());
    else if (state.mode === MODES.MAP) {
      applyPoolMask();
      if (!state.map.explore) startMap();
    } else {
      startQuiz();
    }
    renderScore(state);
  });

  function goNextQuiz() {
    const run = currentRun(state);
    if (run && run.finished) {
      if (modeSettings(state).repeatPolicy === "cycle") continueLap(run);
      else resetRun(state, state.mode);
    }
    startQuiz();
  }

  el.nextBtn.addEventListener("click", goNextQuiz);
  bindQuizKeys(state, submitQuiz, goNextQuiz);
  el.newMapTarget.addEventListener("click", () => {
    if (state.map.explore) return;
    const run = currentRun(state);
    if (run && run.finished) {
      if (modeSettings(state).repeatPolicy === "cycle") continueLap(run);
      else resetRun(state, MODES.MAP);
    }
    startMap();
  });
  el.toggleExplore.addEventListener("click", onToggleExplore);
  if (el.newGame) el.newGame.addEventListener("click", () => startFreshRun());
  if (el.exitGame) {
    el.exitGame.addEventListener("click", () => {
      const mode = state.mode;
      if (!PLAYABLE_MODES.includes(mode)) {
        setHash("home");
        return;
      }
      if (runHasProgress(state.runs[mode])) showBreakdown(mode, "exited");
      else setHash("home");
    });
  }
  bindTypeInput(state, currentPool, () => {
    paintQuiz();
    const run = currentRun(state);
    if (run && run.finished) showBreakdown(state.mode, "finished");
  });
  bindAnswerMode((style) => {
    if (state.mode !== MODES.FLAGS && state.mode !== MODES.CAPITALS) return;
    applyAnswerStyle(style);
  });
  bindSettings(state, (key, extra = {}) => {
    if (key === "answerStyle") {
      if (state.mode === MODES.FLAGS || state.mode === MODES.CAPITALS) startQuiz();
      renderScore(state);
      return;
    }
    if (key === "repeatPolicy" && extra.reset) {
      if (state.mode === MODES.MAP) {
        if (!state.map.explore) startMap();
      } else if (state.mode === MODES.FLAGS || state.mode === MODES.CAPITALS) {
        startQuiz();
      }
    } else if (key === "hint" && extra.reset && state.mode === MODES.MAP && !state.map.explore) {
      startMap();
    }
    renderMapPrompt(state);
    renderScore(state);
    if (state.mode === MODES.HOME) renderHome(state);
    if (state.mode === MODES.SCOREBOARD) renderScoreboard(state);
  });
}

try {
  bindInput();
  if (!location.hash) setHash("home");
  enterMode(readHash());
} catch (err) {
  console.error(err);
  const pre = document.createElement("pre");
  pre.className = "boot-error";
  pre.textContent = String(err && err.stack ? err.stack : err);
  document.body.append(pre);
}
