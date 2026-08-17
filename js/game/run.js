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
  };
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

  if (policy === "misses") {
    if (correct) run.misses.delete(name);
    else run.misses.add(name);
  }

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
  run.cycle += 1;
  run.finished = false;
  run.lastName = null;
  run.startedAt = Date.now();
  run.elapsedMs = 0;
  run.runningSince = Date.now();
}

export function pointsForCorrect(state, name) {
  const run = state.runs[state.mode];
  const typed = state.mode !== "map" && state.settings.answerStyle === "type";
  const clearingMiss =
    state.settings.repeatPolicy === "misses" && run && run.misses.has(name);
  return (typed ? 200 : 100) + (clearingMiss ? 50 : 0);
}
