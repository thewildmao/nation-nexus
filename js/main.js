// Input → mutate game state → paint views. Rules files never touch the DOM.
import { countries } from "../data/countries.js";
import { filterPool } from "./shared/catalog.js";
import { clampLength, savePool } from "./shared/pool.js";
import { scoreByAt } from "./shared/history.js";
import { anyRunHasProgress, PLAYABLE_MODES, runHasProgress } from "./shared/run.js";
import { beginReplay, createState, currentRun, endRun, MODES, resetAllRuns, resetRun } from "./shared/state.js";
import { comboBreak, comboCall, comboHeat, finishCall, shoutHoldMs } from "./shared/combo.js";
import { bindConfirm, confirmWarn } from "./ui/dialog.js";
import { bindRegionPicker, closeRegionPicker, isRegionPickerOpen } from "./ui/filter-tree.js";
import { mountGameCards } from "./ui/game-card.js";
import { bindHash, readHash, setHash } from "./ui/nav.js";
import { bindSettings, closeSettings, isSettingsOpen, prepareSettings } from "./ui/settings.js";
import { bindTimer, syncPlayClock } from "./ui/timer.js";
import { el } from "./ui/dom.js";
import { renderScore, shoutCombo } from "./ui/score-dock.js";
import { showScreen } from "./ui/screens.js";
import { bindUiSfx, playAward, playFinish, playLaunch } from "./ui/sfx.js";
import { renderGuide } from "./shell/guide.js";
import { renderHome } from "./shell/home.js";
import { renderBreakdown } from "./shell/breakdown.js";
import { renderScoreboard } from "./shell/scoreboard.js";
import { renderStudy } from "./games/study/view.js";
import { renderMapPrompt } from "./games/map/hud.js";
import {
  applyPoolMask,
  bindMap,
  enterMap,
  focusCountry,
  goNextMap,
  initMapSession,
  mapView,
  onToggleExplore,
  startMap,
} from "./games/map/session.js";
import { bindQuizSession, continueQuizStyle, enterQuiz, initQuizSession, startQuiz } from "./games/quiz/session.js";

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
  if (mode === MODES.MAP) startMap({ resetView: true });
  else startQuiz();
  renderScore(state);
  syncPlayClock(state);
}

function playGame(mode) {
  launch(mode);
  if (readHash().mode === mode) enterMode({ mode, boardMode: null });
  else setHash(mode);
}

function enterMode(route) {
  const mode = typeof route === "string" ? route : route.mode;
  if (mode !== MODES.BREAKDOWN) cancelRecap();
  if (isSettingsOpen()) closeSettings();
  if (isRegionPickerOpen()) closeRegionPicker();
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
    renderStudy(filterPool(state, countries), focusName);
    renderScore(state);
    return;
  }

  if (mode === MODES.MAP) {
    enterMap();
    return;
  }

  enterQuiz();
}

function bindInput() {
  bindHash((mode) => enterMode(mode));
  bindUiSfx();
  mountGameCards(document.getElementById("gameGrid"), playGame);

  bindTimer(state);
  bindConfirm();
  bindRegionPicker(state, async (reason) => {
    if (anyRunHasProgress(state)) {
      const length = reason === "length";
      const ok = await confirmWarn({
        title: length ? "Change set length?" : "Change regions?",
        message: "This starts a new score for Nation Needle, Flag Master, and Capital Quest. Your current runs will be saved to each game’s scoreboard.",
        confirmLabel: length ? "Change length" : "Change regions",
      });
      if (!ok) return false;
    }
    cancelRecap();
    resetAllRuns(state);
    state.roundN = clampLength(state.roundN, state.selectedNames.size);
    savePool(state.selectedNames, state.roundN);
    if (state.mode === MODES.HOME) renderHome(state);
    else if (state.mode === MODES.SCOREBOARD) renderScoreboard(state);
    else if (state.mode === MODES.STUDY) renderStudy(filterPool(state, countries));
    else if (state.mode === MODES.MAP) {
      applyPoolMask();
      if (!state.map.explore) startMap({ resetView: true });
    } else {
      startQuiz();
    }
    renderScore(state);
  });

  el.newMapTarget.addEventListener("click", goNextMap);
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
  bindQuizSession();
  bindSettings(state, (key, extra = {}) => {
    if (key === "answerStyle") {
      if (state.mode === MODES.FLAGS || state.mode === MODES.CAPITALS) continueQuizStyle();
      renderScore(state);
      return;
    }
    if (key === "repeatPolicy" && extra.reset) {
      if (state.mode === MODES.MAP) {
        if (!state.map.explore) startMap({ resetView: true });
      } else if (state.mode === MODES.FLAGS || state.mode === MODES.CAPITALS) {
        startQuiz();
      }
    } else if (key === "hint" && extra.reset && state.mode === MODES.MAP && !state.map.explore) {
      startMap({ resetView: true });
    }
    renderMapPrompt(state);
    renderScore(state);
    if (state.mode === MODES.HOME) renderHome(state);
    if (state.mode === MODES.SCOREBOARD) renderScoreboard(state);
  });
}

initMapSession({
  state,
  announceAward,
  afterSound,
  cancelRecap,
  scheduleRecap,
});
initQuizSession({
  state,
  announceAward,
  afterSound,
  cancelRecap,
  scheduleRecap,
  focusCountry,
});

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
