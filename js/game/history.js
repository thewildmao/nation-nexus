import { summarizeSelection } from "./regions.js";
import { elapsedMs, PLAYABLE_MODES, poolSize, runHasProgress } from "./run.js";
import { modeSettings } from "./settings.js";

const SCORE_PREFIX = "countryLearner.scores.";
const OLD_PREFIX = "countryLearner.history.";
const KEEP_ROWS = 20;
const scoreCache = new Map();

function emptyScores() {
  return { totals: { points: 0, games: 0 }, bySize: {} };
}

function sortBucket(rows) {
  return [...rows].sort((a, b) => {
    const points = (b.points || 0) - (a.points || 0);
    if (points) return points;
    const time = (a.elapsedMs || Infinity) - (b.elapsedMs || Infinity);
    if (time) return time;
    return (b.at || 0) - (a.at || 0);
  });
}

function trimBucket(rows) {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length <= KEEP_ROWS) return sortBucket(list);
  const latest = list.reduce((a, b) => ((a.at || 0) >= (b.at || 0) ? a : b));
  const top = sortBucket(list).slice(0, KEEP_ROWS);
  if (top.some((row) => row.at === latest.at)) return top;
  return sortBucket([latest, ...top.slice(0, KEEP_ROWS - 1)]);
}

function saveScores(mode, data) {
  scoreCache.set(mode, data);
  localStorage.setItem(SCORE_PREFIX + mode, JSON.stringify(data));
}

export function loadScores(mode) {
  if (scoreCache.has(mode)) return scoreCache.get(mode);
  migrate(mode);
  try {
    const parsed = JSON.parse(localStorage.getItem(SCORE_PREFIX + mode) || "null");
    if (!parsed || typeof parsed !== "object") {
      const empty = emptyScores();
      scoreCache.set(mode, empty);
      return empty;
    }
    const data = {
      totals: {
        points: Number(parsed.totals?.points) || 0,
        games: Number(parsed.totals?.games) || 0,
      },
      bySize: parsed.bySize && typeof parsed.bySize === "object" ? parsed.bySize : {},
    };
    scoreCache.set(mode, data);
    return data;
  } catch {
    const empty = emptyScores();
    scoreCache.set(mode, empty);
    return empty;
  }
}

function migrate(mode) {
  if (localStorage.getItem(SCORE_PREFIX + mode)) return;
  try {
    const old = JSON.parse(localStorage.getItem(OLD_PREFIX + mode) || "null");
    if (!Array.isArray(old) || !old.length) {
      saveScores(mode, emptyScores());
      return;
    }
    const data = emptyScores();
    old.forEach((row) => {
      data.totals.points += row.points || 0;
      data.totals.games += 1;
      const size = String(row.total || 0);
      data.bySize[size] = sortBucket([...(data.bySize[size] || []), row]);
    });
    saveScores(mode, data);
  } catch {
    saveScores(mode, emptyScores());
  }
}

export function careerTotals(mode) {
  return loadScores(mode).totals;
}

export function poolSizes(mode) {
  return Object.keys(loadScores(mode).bySize)
    .map(Number)
    .filter((n) => n > 0)
    .sort((a, b) => b - a);
}

export function topScores(mode, size) {
  const data = loadScores(mode);
  if (size) return sortBucket(data.bySize[String(size)] || []);
  return sortBucket(Object.values(data.bySize).flat());
}

export function latestScore(mode) {
  const all = Object.values(loadScores(mode).bySize)
    .flat()
    .sort((a, b) => (b.at || 0) - (a.at || 0));
  return all[0] || null;
}

export function scoreByAt(mode, at) {
  const stamp = Number(at);
  if (!mode || !stamp) return null;
  return Object.values(loadScores(mode).bySize)
    .flat()
    .find((row) => row.at === stamp) || null;
}

export function loadHistory(mode) {
  const latest = latestScore(mode);
  return latest ? [latest] : [];
}

export function snapshotRun(state, mode, extra = {}) {
  const run = state.runs[mode];
  if (!run || !runHasProgress(run)) return null;
  const cfg = modeSettings(state, mode);
  return {
    at: Date.now(),
    points: run.points || 0,
    correct: run.correct,
    asked: run.asked.size,
    total: poolSize(run, state.selectedNames),
    bestStreak: run.bestStreak || 0,
    regionLabel: summarizeSelection(state.selectedNames),
    answerStyle: mode === "map" ? (cfg.showContinentHint ? "map-hint" : "map") : cfg.answerStyle,
    hint: mode === "map" ? !!cfg.showContinentHint : false,
    repeatPolicy: cfg.repeatPolicy,
    finished: !!run.finished,
    elapsedMs: elapsedMs(run),
    ended: extra.ended || (run.finished ? "finished" : "exited"),
    mode,
    ...extra,
    misses: Array.from(run.misses || []),
    turns: snapshotTurns(run.turns),
    replay: !!(run.poolNames && run.poolNames.size),
  };
}

function snapshotTurns(turns) {
  if (!Array.isArray(turns)) return [];
  return turns.map((turn, i) => ({
    n: Number(turn.n) || i + 1,
    name: typeof turn.name === "string" ? turn.name : "",
    correct: !!turn.correct,
    guess: typeof turn.guess === "string" && turn.guess ? turn.guess : null,
    answer: typeof turn.answer === "string" && turn.answer ? turn.answer : null,
    points: Number(turn.points) || 0,
    streak: Number(turn.streak) || 0,
  })).filter((turn) => turn.name);
}

export function archiveRun(state, mode, extra) {
  const snap = snapshotRun(state, mode, extra);
  if (!snap) return null;
  const data = loadScores(mode);
  data.totals.points += snap.points || 0;
  data.totals.games += 1;
  const size = String(snap.total || 0);
  const prev = data.bySize[size] || [];
  data.bySize[size] = trimBucket([
    snap,
    ...prev.filter((row) => row.at !== snap.at),
  ]);
  saveScores(mode, data);
  return snap;
}

export function archiveAllProgress(state) {
  PLAYABLE_MODES.forEach((game) => archiveRun(state, game));
}
