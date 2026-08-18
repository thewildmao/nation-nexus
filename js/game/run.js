import { pickRandom } from "./catalog.js";

export const REPEAT_POLICIES = ["cycle", "random", "misses", "once"];
export const PLAYABLE_MODES = ["map", "flags", "capitals"];

export function emptyRun() {
  return {
    points: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
    asked: new Set(),
    misses: new Set(),
    cycle: 1,
    finished: false,
    lastName: null,
    startedAt: null,
    elapsedMs: 0,
    runningSince: null,
    // Replay-only. Do not copy selectedNames here — that pool is shared.
    poolNames: null,
    turns: [],
  };
}

export function recordTurn(run, turn) {
  if (!run) return;
  if (!Array.isArray(run.turns)) run.turns = [];
  const name = typeof turn.name === "string" ? turn.name : "";
  if (!name) return;
  run.turns.push({
    n: run.turns.length + 1,
    name,
    correct: !!turn.correct,
    guess: typeof turn.guess === "string" && turn.guess ? turn.guess : null,
    answer: typeof turn.answer === "string" && turn.answer ? turn.answer : null,
    points: Number(turn.points) || 0,
    streak: Number(turn.streak) || 0,
  });
}

export function runPoolNames(run, selectedNames) {
  if (run && run.poolNames && run.poolNames.size) return run.poolNames;
  return selectedNames;
}

export function poolSize(run, selectedNames) {
  const names = runPoolNames(run, selectedNames);
  return names ? names.size : 0;
}

export function dealPool(list, run, selectedNames) {
  const names = runPoolNames(run, selectedNames);
  if (!names) return list;
  return list.filter((country) => names.has(country.name));
}

export function elapsedMs(run) {
  if (!run) return 0;
  const extra = run.runningSince ? Date.now() - run.runningSince : 0;
  return Math.max(0, (run.elapsedMs || 0) + extra);
}

export function pauseClock(run) {
  if (!run || !run.runningSince) return;
  run.elapsedMs = elapsedMs(run);
  run.runningSince = null;
}

export function resumeClock(run) {
  if (!run || run.finished || run.runningSince) return;
  if (!run.startedAt && !run.elapsedMs) return;
  run.runningSince = Date.now();
}

export function touchStart(run) {
  if (!run) return;
  if (!run.startedAt) run.startedAt = Date.now();
  if (!run.finished && !run.runningSince) run.runningSince = Date.now();
}

export function formatElapsed(ms) {
  const total = Math.max(0, Math.round((ms || 0) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function runHasProgress(run) {
  return !!(run && (run.correct > 0 || run.streak > 0 || run.asked.size > 0));
}

export function anyRunHasProgress(state) {
  return PLAYABLE_MODES.some((mode) => runHasProgress(state.runs[mode]));
}

function eligible(pool, run, policy) {
  if (policy === "random") return pool;
  if (policy === "misses" && run.asked.size >= pool.length) {
    return pool.filter((country) => run.misses.has(country.name));
  }
  return pool.filter((country) => !run.asked.has(country.name));
}

function avoidImmediateRepeat(choices, lastName) {
  if (choices.length <= 1 || !lastName) return choices;
  const rest = choices.filter((country) => country.name !== lastName);
  return rest.length ? rest : choices;
}

export function dealNext(pool, run, policy) {
  if (!pool.length || run.finished) return null;

  let choices = eligible(pool, run, policy);

  if (!choices.length) {
    if (policy === "misses" && run.misses.size > 0) {
      choices = pool.filter((country) => run.misses.has(country.name));
    } else if (policy === "random") {
      choices = pool;
    } else {
      run.finished = true;
      return null;
    }
    if (!choices.length) {
      run.finished = true;
      return null;
    }
  }

  return pickRandom(avoidImmediateRepeat(choices, run.lastName));
}

export function markAsked(run, name, correct, policy) {
  if (!name || !run) return;
  run.lastName = name;

  if (policy !== "random") run.asked.add(name);

  if (!correct) run.misses.add(name);
  else if (policy === "misses") run.misses.delete(name);

  if (correct) {
    run.correct += 1;
    run.streak += 1;
    run.bestStreak = Math.max(run.bestStreak, run.streak);
  } else {
    run.streak = 0;
  }
}

export function continueLap(run) {
  if (!run) return;
  run.asked = new Set();
  run.misses = new Set();
  run.turns = [];
  run.cycle += 1;
  run.finished = false;
  run.lastName = null;
  run.startedAt = Date.now();
  run.elapsedMs = 0;
  run.runningSince = Date.now();
}

export const BASE_POINTS = 100;
export const TYPE_POINTS = 200;
export const MISS_BONUS = 50;
export const HINT_PENALTY = 0.2;
export const STREAK_STEP = 20;
export const STREAK_MAX_BONUS = 80;

export function streakBonus(streak) {
  if (streak < 2) return 0;
  return Math.min(STREAK_MAX_BONUS, (streak - 1) * STREAK_STEP);
}

export function baseAward(mode, cfg = {}) {
  if (mode !== "map" && cfg.answerStyle === "type") return TYPE_POINTS;
  return BASE_POINTS;
}

export function hintedAward(points) {
  return Math.round(points * (1 - HINT_PENALTY));
}

export function pointsForCorrect(state, name) {
  const run = state.runs[state.mode];
  const cfg = (state.settings && state.settings[state.mode]) || {};
  let points = baseAward(state.mode, cfg);
  if (state.mode === "map" && cfg.showContinentHint) points = hintedAward(points);
  const upcoming = run ? run.streak + 1 : 1;
  points += streakBonus(upcoming);
  const clearingMiss = cfg.repeatPolicy === "misses" && run && run.misses.has(name);
  if (clearingMiss) points += MISS_BONUS;
  return points;
}
