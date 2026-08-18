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
import { bindSettings, closeSettings, isSettingsOpen, prepareSettings, syncSettingsForm } from "./view/settings.js";
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
  shoutCombo,
  showScreen,
} from "./view/hud.js";
import * as mapView from "./view/map-view.js";
import { modeSettings, saveSettings } from "./game/settings.js";
import { bindAnswerMode, bindQuizKeys, bindTypeInput, renderQuiz } from "./view/quiz-view.js";
import { comboBreak, comboCall, comboHeat, finishCall, shoutHoldMs } from "./game/combo.js";
import { bindUiSfx, playAward, playFinish, playLaunch, playNext } from "./view/sfx.js";
import { renderStudy } from "./view/study-view.js";

const state = createState();

function launch(mode) {
  requestAnimationFrame(() => playLaunch(mode));
}

let heardAward = null;

function announceAward() {
  const run = currentRun(state);
  const award = run && run.lastAward;
  if (!award || award === heardAward) return;
  heardAward = award;
  playAward(award);
}

function afterSound(fn) {
  requestAnimationFrame(fn);
}

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

let recapTimer = 0;
let recapToken = 0;

function cancelRecap() {
  window.clearTimeout(recapTimer);
  recapToken += 1;
}

function awardHoldMs(award) {
  if (!award) return 450;
  if (award.hit) {
    const call = comboCall(award.streak);
    if (!call.title) return 450;
    return shoutHoldMs(comboHeat(award.streak), call.tier);
  }
  const broke = comboBreak(award.lostStreak);
  if (!broke.title) return 450;
  return shoutHoldMs(comboHeat(award.lostStreak), broke.tier);
}

function liveFinishSnap(mode, ended) {
  const run = state.runs[mode];
  if (!run) return null;
  return {
    ended,
    asked: run.asked ? run.asked.size : 0,
    correct: run.correct || 0,
    points: run.points || 0,
    bestStreak: run.bestStreak || 0,
  };
}

function scheduleRecap(mode, ended, award) {
  cancelRecap();
  const token = recapToken;
  const firstWait = ended === "exited" ? 0 : awardHoldMs(award);

  function openRecap() {
    if (token !== recapToken) return;
    endRun(state, mode, ended);
    state.recapFresh = true;
    setHash("breakdown", mode);
  }

  function showFinish() {
    if (token !== recapToken) return;
    const snap = liveFinishSnap(mode, ended);
    if (!snap) {
      openRecap();
      return;
    }
    playFinish(snap);
    const fin = { ...finishCall(snap), heat: comboHeat(snap.bestStreak || 0) };
    shoutCombo(fin);
    recapTimer = window.setTimeout(openRecap, shoutHoldMs(fin.heat, fin.tier));
  }

  if (firstWait <= 0) showFinish();
  else recapTimer = window.setTimeout(showFinish, firstWait);
}

function showBreakdown(mode, ended) {
  scheduleRecap(mode, ended, null);
}

function replayMisses(mode, names) {
  cancelRecap();
  if (!PLAYABLE_MODES.includes(mode) || !names || !names.length) return;
  launch(mode);
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
  cancelRecap();
  launch(mode);
  resetRun(state, mode);
  if (mode === MODES.MAP) startMap();
  else startQuiz();
  renderScore(state);
  syncPlayClock(state);
}

function submitQuiz(index) {
  gradeQuizAnswer(state, index);
  announceAward();
  afterSound(() => {
    const run = currentRun(state);
    const award = run && run.lastAward;
    const done = !!(run && run.finished);
    paintQuiz();
    if (done) scheduleRecap(state.mode, "finished", award);
  });
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
  announceAward();
  afterSound(() => {
    const run = currentRun(state);
    const award = run && run.lastAward;
    const done = !!(run && run.finished);
    mapView.showGuess(result);
    focusCountry(result.guessed ? result.guessed.name : result.target.name);
    renderMapResult(result);
    renderScore(state);
    if (done) scheduleRecap(state.mode, "finished", award);
  });
}

function submitCountryGuess(geoName, latlng) {
  applyGuess(resolveCountryGuess(state, geoName, latlng));
}

function submitMiss(latlng) {
  applyGuess(resolveMiss(state, latlng));
}

function enterMode(route) {
  const mode = typeof route === "string" ? route : route.mode;
  if (mode !== MODES.BREAKDOWN) cancelRecap();
  if (isSettingsOpen()) closeSettings();
  const boardMode = typeof route === "string" ? null : route.boardMode;
  const recapAt = typeof route === "object" && route ? route.recapAt : null;
  state.mode = mode;
  state.boardMode = boardMode || null;
  showScreen(mode, state.boardMode);
  prepareSettings(state);
  syncPlayClock(state);

  if (mode === MODES.HOME) {
    renderHome(state);
    return;
  }

  if (mode === MODES.HOW) {
    renderGuide(boardMode);
    return;
  }

  if (mode === MODES.SCOREBOARD) {
    renderScoreboard(state);
    return;
  }

  if (mode === MODES.BREAKDOWN) {
    if (recapAt && boardMode) state.breakdown = scoreByAt(boardMode, recapAt);
    const fresh = !!state.recapFresh;
    state.recapFresh = false;
    renderBreakdown(state, replayMisses, { fromBoard: !!recapAt, fresh });
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
    applyPoolMask();
    renderMapMode(state);
    setTimeout(() => mapView.invalidateSize(), 280);
    setTimeout(() => {
      mapView.invalidateSize();
      if (state.map.explore) {
        applyPoolMask();
        paintMapChrome();
        return;
      }
      const run = currentRun(state);
      const target = state.map.target;
      const targetInPool = !!(target && state.selectedNames.has(target.name));
      if (run && !run.finished && targetInPool && state.map.waiting) {
        applyPoolMask();
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
    cancelRecap();
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
  bindUiSfx();
  document.querySelectorAll("a.game-card[data-mode]").forEach((card) => {
    card.addEventListener("click", (e) => {
      e.preventDefault();
      const next = card.dataset.mode;
      launch(next);
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
    cancelRecap();
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
    cancelRecap();
    const run = currentRun(state);
    if (run && run.finished) {
      if (modeSettings(state).repeatPolicy === "cycle") continueLap(run);
      else resetRun(state, state.mode);
      launch(state.mode);
    } else {
      playNext();
    }
    startQuiz();
  }

  el.nextBtn.addEventListener("click", goNextQuiz);
  bindQuizKeys(state, submitQuiz, goNextQuiz);
  el.newMapTarget.addEventListener("click", () => {
    if (state.map.explore) return;
    const live = currentRun(state);
    if (state.map.waiting && !(live && live.finished)) return;
    cancelRecap();
    const run = currentRun(state);
    if (run && run.finished) {
      if (modeSettings(state).repeatPolicy === "cycle") continueLap(run);
      else resetRun(state, MODES.MAP);
      launch(MODES.MAP);
    } else {
      playNext();
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
    announceAward();
    afterSound(() => {
      const run = currentRun(state);
      const award = run && run.lastAward;
      const done = !!(run && run.finished);
      paintQuiz();
      if (done) scheduleRecap(state.mode, "finished", award);
    });
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
