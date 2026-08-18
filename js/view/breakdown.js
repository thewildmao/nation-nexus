import { getCountry } from "../game/catalog.js";
import { latestScore } from "../game/history.js";
import { formatElapsed } from "../game/run.js";
import { playTitle } from "./identity.js";

function styleLabel(style) {
  if (style === "type") return "Type-in";
  if (style === "map") return "Map click";
  return "Multiple choice";
}

function row(dl, label, value) {
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.textContent = value;
  dl.append(dt, dd);
}

function missNames(recap) {
  if (!recap || !Array.isArray(recap.misses)) return [];
  return recap.misses.filter((name) => typeof name === "string" && getCountry(name));
}

function recapTurns(recap) {
  if (!recap || !Array.isArray(recap.turns)) return [];
  return recap.turns.filter((turn) => turn && typeof turn.name === "string" && turn.name);
}

function heading(text) {
  const node = document.createElement("h3");
  node.className = "breakdown-section-title";
  node.textContent = text;
  return node;
}

function renderSummary(recap, mode) {
  const section = document.createElement("section");
  section.className = "breakdown-summary";
  section.append(heading("Summary"));

  const asked = recap.asked || 0;
  const correct = recap.correct || 0;
  const accuracy = asked ? Math.round((correct / asked) * 100) : 0;
  const stats = document.createElement("dl");
  stats.className = "scoreboard-stats";
  row(stats, "Time", formatElapsed(recap.elapsedMs));
  row(stats, "Points", String(recap.points || 0));
  row(stats, "Correct", `${correct} / ${asked} (${accuracy}%)`);
  row(stats, "Best streak", String(recap.bestStreak || 0));
  if (recap.replay) {
    const n = recap.total || missNames(recap).length || 0;
    row(stats, "Set", n === 1 ? "Replay · 1 miss" : `Replay · ${n} misses`);
    if (recap.regionLabel) row(stats, "Regions", recap.regionLabel);
  } else {
    row(stats, "Regions", recap.regionLabel || "—");
  }
  if ((recap.mode || mode) === "map") {
    const hinted = !!(recap.hint || recap.answerStyle === "map-hint");
    row(stats, "Hint", hinted ? "On · 80 pts" : "Off · 100 pts");
  } else {
    row(stats, "Answer", styleLabel(recap.answerStyle));
  }

  const missed = missNames(recap);
  row(stats, "Missed", missed.length ? missed.join(" · ") : "None");
  section.append(stats);
  return section;
}

function turnDetail(turn, mode) {
  if (turn.correct) return turn.points ? `+${turn.points}` : "";
  if (mode === "capitals" && turn.answer) {
    return turn.guess
      ? `${turn.answer} — you guessed ${turn.guess}`
      : turn.answer;
  }
  if (turn.guess && turn.guess !== turn.name) return `You guessed ${turn.guess}`;
  return "";
}

function renderTurns(recap, mode) {
  const turns = recapTurns(recap);
  const section = document.createElement("section");
  section.className = "breakdown-turns";
  section.append(heading("Turns"));

  if (!turns.length) {
    const empty = document.createElement("p");
    empty.className = "breakdown-turns-empty";
    empty.textContent = "No turn log for this game.";
    section.append(empty);
    return section;
  }

  const list = document.createElement("div");
  list.className = "breakdown-turn-list";
  turns.forEach((turn) => {
    const country = getCountry(turn.name);
    const item = document.createElement("a");
    item.href = `#/study/${encodeURIComponent(turn.name)}`;
    item.className = `breakdown-turn ${turn.correct ? "is-hit" : "is-miss"}`;
    item.title = `Study ${turn.name}`;

    const num = document.createElement("span");
    num.className = "breakdown-turn-n";
    num.textContent = `Turn ${turn.n || ""}`.trim();

    const flag = document.createElement("span");
    flag.className = "breakdown-turn-flag";
    flag.textContent = country ? country.flag : "";

    const body = document.createElement("span");
    body.className = "breakdown-turn-text";

    const name = document.createElement("span");
    name.className = "breakdown-turn-name";
    name.textContent = country ? country.name : turn.name;

    const result = document.createElement("span");
    result.className = "breakdown-turn-result";
    result.textContent = turn.correct ? "Correct" : "Missed";

    const detailText = turnDetail(turn, recap.mode || mode);
    if (detailText) {
      const detail = document.createElement("span");
      detail.className = "breakdown-turn-detail";
      detail.textContent = detailText;
      body.append(name, result, detail);
    } else {
      body.append(name, result);
    }

    item.append(num, flag, body);
    list.append(item);
  });
  section.append(list);
  return section;
}

function renderMissesFallback(recap) {
  const names = missNames(recap);
  const section = document.createElement("section");
  section.className = "breakdown-misses";
  section.append(heading("Missed"));

  if (!names.length) {
    const empty = document.createElement("p");
    empty.className = "breakdown-misses-empty";
    empty.textContent = "No misses";
    section.append(empty);
    return section;
  }

  const list = document.createElement("div");
  list.className = "breakdown-miss-list";
  const showCapital = (recap.mode || "") === "capitals";
  names.forEach((name) => {
    const country = getCountry(name);
    const item = document.createElement("a");
    item.href = `#/study/${encodeURIComponent(name)}`;
    item.className = "breakdown-miss";
    item.title = `Study ${name}`;

    const flag = document.createElement("span");
    flag.className = "breakdown-miss-flag";
    flag.textContent = country ? country.flag : "";

    const body = document.createElement("span");
    body.className = "breakdown-miss-text";

    const title = document.createElement("span");
    title.className = "breakdown-miss-name";
    title.textContent = country ? country.name : name;
    body.append(title);

    if (showCapital) {
      const capital = document.createElement("span");
      capital.className = "breakdown-miss-capital";
      capital.textContent = country && country.capital ? country.capital : "";
      body.append(capital);
    }

    item.append(flag, body);
    list.append(item);
  });
  section.append(list);
  return section;
}

export function renderBreakdown(state, onReplayMisses, opts = {}) {
  const root = document.getElementById("breakdownCard");
  if (!root) return;

  const mode = state.boardMode || (state.breakdown && state.breakdown.mode);
  let recap = state.breakdown && state.breakdown.mode === mode ? state.breakdown : null;
  if (!recap && mode && !opts.fromBoard) recap = latestScore(mode);

  root.innerHTML = "";
  if (!recap) {
    const emptyHref = opts.fromBoard && mode ? `#/scoreboard/${mode}` : "#/";
    root.innerHTML = `<p class="scoreboard-empty">${opts.fromBoard ? "That recap is no longer saved." : "No game to break down yet."}</p>
      <a class="scoreboard-play" href="${emptyHref}">${opts.fromBoard ? "Back to scores" : "Games"}</a>`;
    return;
  }

  const ended = recap.ended === "exited" ? "Ended early" : "Finished";

  const kicker = document.createElement("p");
  kicker.className = "confirm-kicker";
  kicker.textContent = ended;

  const title = document.createElement("h2");
  title.className = "game-lockup is-recap";
  const recapMode = recap.mode || mode;
  const recapName = document.createElement("span");
  recapName.className = "game-lockup-name";
  recapName.textContent = playTitle(recapMode);
  title.append(recapName);

  const actions = document.createElement("div");
  actions.className = "breakdown-actions";
  const play = document.createElement("a");
  play.className = "btn-glass is-ok";
  play.href = `#/${recap.mode || mode}`;
  play.textContent = "New game";
  const backHref = opts.fromBoard && mode ? `#/scoreboard/${mode}` : "#/";
  const skip = document.createElement("a");
  skip.className = "btn-glass";
  skip.href = backHref;
  skip.textContent = opts.fromBoard ? "Back to scores" : "Not now";
  const misses = missNames(recap);
  if (misses.length && typeof onReplayMisses === "function") {
    const replay = document.createElement("button");
    replay.type = "button";
    replay.className = "btn-glass";
    replay.textContent = "Replay misses";
    replay.addEventListener("click", () => {
      onReplayMisses(recap.mode || mode, misses);
    });
    actions.append(play, replay, skip);
  } else {
    actions.append(play, skip);
  }

  const body = document.createElement("div");
  body.className = "breakdown-body";
  body.append(renderSummary(recap, mode));
  if (recapTurns(recap).length) body.append(renderTurns(recap, mode));
  else body.append(renderMissesFallback(recap));

  root.append(kicker, title, body, actions);

  const backdrop = document.getElementById("breakdownBackdrop");
  if (backdrop) backdrop.onclick = () => {
    window.location.hash = backHref;
  };
}
