import { latestScore } from "../game/history.js";
import { formatElapsed } from "../game/run.js";
import { playTitle } from "./home.js";

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

export function renderBreakdown(state) {
  const root = document.getElementById("breakdownCard");
  if (!root) return;

  const mode = state.boardMode || (state.breakdown && state.breakdown.mode);
  let recap = state.breakdown && state.breakdown.mode === mode ? state.breakdown : null;
  if (!recap && mode) recap = latestScore(mode);

  root.innerHTML = "";
  if (!recap) {
    root.innerHTML = `<p class="scoreboard-empty">No game to break down yet.</p>
      <a class="scoreboard-play" href="#/">Games</a>`;
    return;
  }

  const asked = recap.asked || 0;
  const correct = recap.correct || 0;
  const accuracy = asked ? Math.round((correct / asked) * 100) : 0;
  const ended = recap.ended === "exited" ? "Ended early" : "Finished";

  const kicker = document.createElement("p");
  kicker.className = "confirm-kicker";
  kicker.textContent = ended;

  const title = document.createElement("h2");
  title.textContent = playTitle(recap.mode || mode);

  const stats = document.createElement("dl");
  stats.className = "scoreboard-stats";
  row(stats, "Time", formatElapsed(recap.elapsedMs));
  row(stats, "Points", String(recap.points || 0));
  row(stats, "Correct", `${correct} / ${asked} (${accuracy}%)`);
  row(stats, "Best streak", String(recap.bestStreak || 0));
  row(stats, "Regions", recap.regionLabel || "—");
  row(stats, "Answer", styleLabel(recap.answerStyle));

  const actions = document.createElement("div");
  actions.className = "breakdown-actions";
  const play = document.createElement("a");
  play.className = "btn-glass is-ok";
  play.href = `#/${recap.mode || mode}`;
  play.textContent = "New game";
  const skip = document.createElement("a");
  skip.className = "btn-glass";
  skip.href = "#/";
  skip.textContent = "Not now";
  actions.append(play, skip);

  root.append(kicker, title, stats, actions);

  const backdrop = document.getElementById("breakdownBackdrop");
  if (backdrop) backdrop.onclick = () => {
    window.location.hash = "#/";
  };
}
