import { careerTotals, poolSizes, topScores } from "../game/history.js";
import { summarizeSelection } from "../game/regions.js";
import { formatElapsed, PLAYABLE_MODES, runHasProgress } from "../game/run.js";
import { playTitle } from "./home.js";

const BLURB = {
  map: "Find the country on the map",
  flags: "Name the country from its flag",
  capitals: "Name the capital city",
};

const filterByMode = new Map();

function styleLabel(style) {
  if (style === "type") return "Type-in";
  if (style === "map") return "Map";
  return "Choices";
}

function formatWhen(at) {
  try {
    return new Date(at).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderPicker(root) {
  root.innerHTML = "";
  PLAYABLE_MODES.forEach((mode) => {
    const totals = careerTotals(mode);
    const card = document.createElement("a");
    card.className = "scoreboard-card scoreboard-pick";
    card.href = `#/scoreboard/${mode}`;
    card.innerHTML = `<span class="game-card-kicker">Scoreboard</span>
      <h2>${playTitle(mode)}</h2>
      <p>${BLURB[mode]}</p>
      <span class="game-card-status">${totals.points} total pts · ${totals.games} games</span>`;
    root.append(card);
  });
}

function renderGameBoard(root, state, mode) {
  const run = state.runs[mode];
  const region = summarizeSelection(state.selectedNames);
  const currentSize = state.selectedNames.size;
  const sizes = poolSizes(mode);
  const totals = careerTotals(mode);
  const live = runHasProgress(run);

  let filter = filterByMode.has(mode) ? filterByMode.get(mode) : currentSize;
  if (filter && !sizes.includes(filter)) filter = null;
  filterByMode.set(mode, filter);

  const rows = topScores(mode, filter);
  const showSizeCol = !filter;

  root.innerHTML = "";

  const toolbar = document.createElement("div");
  toolbar.className = "board-toolbar";
  const summary = document.createElement("p");
  summary.className = "board-current";
  summary.innerHTML = `<strong>${totals.points}</strong> total points · ${totals.games} games
    ${live ? ` · current ${run.points || 0} pts · ${region}` : ""}`;
  const play = document.createElement("a");
  play.className = "scoreboard-play";
  play.href = `#/${mode}`;
  play.textContent = live && !run.finished ? "Continue" : "Play";
  toolbar.append(summary, play);

  const filters = document.createElement("div");
  filters.className = "board-filters";
  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = "board-filter" + (filter ? "" : " is-on");
  allBtn.textContent = "All sizes";
  allBtn.addEventListener("click", () => {
    filterByMode.set(mode, null);
    renderGameBoard(root, state, mode);
  });
  filters.append(allBtn);
  sizes.forEach((size) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "board-filter" + (filter === size ? " is-on" : "");
    btn.textContent = `${size} countries`;
    btn.addEventListener("click", () => {
      filterByMode.set(mode, size);
      renderGameBoard(root, state, mode);
    });
    filters.append(btn);
  });

  const wrap = document.createElement("div");
  wrap.className = "board-table-wrap";
  const table = document.createElement("table");
  table.className = "board-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>#</th>
        <th class="num">Points</th>
        <th class="num">Correct</th>
        ${showSizeCol ? '<th class="num">Countries</th>' : ""}
        <th class="num">Time</th>
        <th>When</th>
        <th>Regions</th>
        <th>Answer</th>
      </tr>
    </thead>
    <tbody></tbody>`;
  const body = table.querySelector("tbody");

  if (!rows.length) {
    const empty = document.createElement("tr");
    empty.className = "is-empty";
    empty.innerHTML = `<td colspan="${showSizeCol ? 8 : 7}">No top scores yet for this filter. Finish a run to land here.</td>`;
    body.append(empty);
  } else {
    rows.forEach((row, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="num">${i + 1}</td>
        <td class="num">${row.points ?? 0}</td>
        <td class="num">${row.correct ?? 0}</td>
        ${showSizeCol ? `<td class="num">${row.total ?? "—"}</td>` : ""}
        <td class="num">${escapeHtml(formatElapsed(row.elapsedMs))}</td>
        <td>${escapeHtml(formatWhen(row.at))}</td>
        <td>${escapeHtml(row.regionLabel || "—")}</td>
        <td>${escapeHtml(styleLabel(row.answerStyle))}</td>`;
      body.append(tr);
    });
  }

  wrap.append(table);
  root.append(toolbar, filters, wrap);
}

export function renderScoreboard(state) {
  const root = document.getElementById("scoreboardList");
  if (!root) return;
  root.classList.toggle("is-single", !!state.boardMode);
  if (!state.boardMode) renderPicker(root);
  else renderGameBoard(root, state, state.boardMode);
}
