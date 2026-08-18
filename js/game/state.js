import { getCountry } from "./catalog.js";
import { allCountryNames } from "./regions.js";
import { archiveAllProgress, archiveRun } from "./history.js";
import { emptyRun, markAsked, pauseClock, PLAYABLE_MODES, poolSize, pointsForCorrect, streakBonus } from "./run.js";
import { loadSettings, modeSettings } from "./settings.js";

export const MODES = {
  HOME: "home",
  MAP: "map",
  FLAGS: "flags",
  CAPITALS: "capitals",
  STUDY: "study",
  SCOREBOARD: "scoreboard",
  BREAKDOWN: "breakdown",
  HOW: "how",
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
  const policy = modeSettings(state).repeatPolicy;
  if (!run || policy === "random") return;
  const total = poolSize(run, state.selectedNames);
  if (total <= 0 || run.asked.size < total) return;
  if (policy === "misses" && run.misses.size > 0) return;
  run.finished = true;
}

export function beginReplay(state, mode, names) {
  const run = emptyRun();
  const pool = [];
  (names || []).forEach((name) => {
    if (typeof name === "string" && getCountry(name) && !pool.includes(name)) {
      pool.push(name);
    }
  });
  if (pool.length) run.poolNames = new Set(pool);
  state.runs[mode] = run;
  return run;
}

export function awardCorrect(state, name) {
  const run = currentRun(state);
  if (!run) return null;
  const gained = pointsForCorrect(state, name);
  markAsked(run, name, true, modeSettings(state).repeatPolicy);
  run.points += gained;
  run.lastAward = {
    hit: true,
    points: gained,
    bonus: streakBonus(run.streak),
    streak: run.streak,
  };
  finishIfComplete(state);
  return run.lastAward;
}

export function awardWrong(state, name) {
  const run = currentRun(state);
  if (!run) return null;
  const lostStreak = run.streak;
  const lostBonus = streakBonus(lostStreak);
  markAsked(run, name, false, modeSettings(state).repeatPolicy);
  run.lastAward = {
    hit: false,
    points: 0,
    bonus: 0,
    streak: 0,
    lostStreak,
    lostBonus,
  };
  finishIfComplete(state);
  return run.lastAward;
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
