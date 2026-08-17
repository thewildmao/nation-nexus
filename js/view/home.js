import { summarizeSelection } from "../game/regions.js";
import { runHasProgress } from "../game/run.js";

const TITLES = {
  map: "Where is it?",
  flags: "Which flag?",
  capitals: "What capital?",
  study: "Study",
  scoreboard: "Scoreboard",
  breakdown: "Breakdown",
  home: "Guess the country",
};

export function playTitle(mode) {
  return TITLES[mode] || "Guess the country";
}

export function pageTitle(mode, boardMode) {
  if (mode === "home") return "Country Learner";
  if (mode === "scoreboard" && boardMode) {
    return `${playTitle(boardMode)} scores · Country Learner`;
  }
  if (mode === "breakdown" && boardMode) {
    return `${playTitle(boardMode)} recap · Country Learner`;
  }
  return `${playTitle(mode)} · Country Learner`;
}

export function renderHome(state) {
  const region = summarizeSelection(state.selectedNames);
  document.querySelectorAll("[data-status]").forEach((node) => {
    const run = state.runs[node.dataset.status];
    if (!run || !runHasProgress(run)) {
      node.textContent = "New game";
      return;
    }
    if (run.finished) {
      node.textContent = `Last set ${run.points} pts · ${run.correct}/${state.selectedNames.size} · ${region}`;
      return;
    }
    node.textContent = `${run.points} pts · ${run.asked.size}/${state.selectedNames.size} · ${region}`;
  });
}
