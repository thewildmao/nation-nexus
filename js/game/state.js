import { allCountryNames } from "./regions.js";
import { archiveAllProgress, archiveRun } from "./history.js";
import { emptyRun, markAsked, pauseClock, PLAYABLE_MODES, pointsForCorrect } from "./run.js";
import { loadSettings } from "./settings.js";

export const MODES = {
  HOME: "home",
  MAP: "map",
  FLAGS: "flags",
  CAPITALS: "capitals",
  STUDY: "study",
  SCOREBOARD: "scoreboard",
  BREAKDOWN: "breakdown",
};

export function createState() {
  return {
    mode: MODES.HOME,
    selectedNames: new Set(allCountryNames()),
    focusName: null,
    settings: loadSettings(),
    runs: emptyRuns(),
    boardMode: null,
    breakdown: null,
    quiz: emptyQuiz(),
    map: emptyMapRound(),
  };
}

export function emptyRuns() {
  return {
    map: emptyRun(),
    flags: emptyRun(),
    capitals: emptyRun(),
  };
}

export function emptyQuiz() {
  return {
    mode: null,
    country: null,
    options: [],
    answered: false,
    selectedIndex: null,
    typedValue: "",
    answerStyle: null,
    correct: false,
    error: null,
  };
}

export function emptyMapRound() {
  return {
    target: null,
    waiting: true,
    explore: false,
    lastResult: null,
  };
}

export function currentRun(state) {
  if (!PLAYABLE_MODES.includes(state.mode)) return null;
  return state.runs[state.mode];
}

function finishIfComplete(state) {
  const run = currentRun(state);
  if (!run || state.settings.repeatPolicy === "random") return;
  const total = state.selectedNames.size;
  if (total <= 0 || run.asked.size < total) return;
  if (state.settings.repeatPolicy === "misses" && run.misses.size > 0) return;
  run.finished = true;
}

export function awardCorrect(state, name) {
  const run = currentRun(state);
  if (!run) return;
  const gained = pointsForCorrect(state, name);
  markAsked(run, name, true, state.settings.repeatPolicy);
  run.points += gained;
  finishIfComplete(state);
}

export function awardWrong(state, name) {
  const run = currentRun(state);
  if (!run) return;
  markAsked(run, name, false, state.settings.repeatPolicy);
  finishIfComplete(state);
}

export function resetRun(state, mode) {
  pauseClock(state.runs[mode]);
  archiveRun(state, mode);
  state.runs[mode] = emptyRun();
}

export function endRun(state, mode, ended) {
  pauseClock(state.runs[mode]);
  const snap = archiveRun(state, mode, { ended });
  state.breakdown = snap || null;
  state.runs[mode] = emptyRun();
  return snap;
}

export function resetAllRuns(state) {
  archiveAllProgress(state);
  state.runs = emptyRuns();
}

export function resetScore(state) {
  resetRun(state, state.mode === MODES.MAP ? MODES.MAP : state.mode);
}
