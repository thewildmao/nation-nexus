import { latestScore, topScores } from "../shared/history.js";
import { effectiveLength } from "../shared/pool.js";
import { elapsedMs, formatElapsed, PLAYABLE_MODES, poolSize, runHasProgress } from "../shared/run.js";
import { el } from "../ui/dom.js";
import { paintRegionPicker } from "../ui/filter-tree.js";
import { playTitle } from "../ui/identity.js";

export { pageTitle, playTitle } from "../ui/identity.js";

function setHidden(node, hide) {
  if (node) node.classList.toggle("hidden", hide);
}

function lastRunAcross() {
  let last = null;
  PLAYABLE_MODES.forEach((mode) => {
    const row = latestScore(mode);
    if (!row) return;
    if (!last || (row.at || 0) > (last.at || 0)) last = { mode, row };
  });
  return last;
}

function paintLastRun() {
  const host = el.homeLast;
  if (!host) return;
  const last = lastRunAcross();
  if (!last) {
    host.classList.add("hidden");
    host.replaceChildren();
    return;
  }
  const { mode, row } = last;
  host.classList.remove("hidden");
  host.replaceChildren();

  const copy = document.createElement("p");
  const pts = document.createElement("span");
  pts.className = "home-last-pts";
  pts.textContent = `${Number(row.points || 0).toLocaleString()} pts`;
  const region = row.regionLabel ? ` · ${row.regionLabel}` : "";
  copy.append(
    `Last run · ${playTitle(mode)}${region} · ${row.correct}/${row.total} · `,
    pts,
  );

  const again = document.createElement("a");
  again.className = "home-btn is-ghost";
  again.href = `#/${mode}`;
  again.textContent = "Play again";

  host.append(copy, again);
}

export function renderHome(state) {
  paintRegionPicker(state);
  paintLastRun();
  const size = effectiveLength(state.roundN, state.selectedNames.size);
  document.querySelectorAll("[data-card]").forEach((wrap) => {
    const mode = wrap.dataset.card;
    const run = state.runs[mode];
    const total = poolSize(run, state.selectedNames);
    const live = !!(run && runHasProgress(run) && !run.finished);
    const done = !!(run && runHasProgress(run) && run.finished);
    const status = wrap.querySelector("[data-status]");
    const badge = wrap.querySelector("[data-badge]");
    const meta = wrap.querySelector("[data-meta]");
    const progress = wrap.querySelector("[data-progress]");
    const count = wrap.querySelector("[data-count]");
    const bar = wrap.querySelector(".game-card-bar > span");
    const best = wrap.querySelector("[data-best]");

    wrap.classList.toggle("is-live", live);
    wrap.classList.toggle("is-done", done);

    if (status) {
      status.textContent = live ? "Continue" : done ? "Play again" : "Play";
    }

    if (badge) {
      badge.textContent = live ? "In progress" : "Set complete";
      setHidden(badge, !live && !done);
    }

    const asked = run ? run.asked.size : 0;
    const showBar = live && asked > 0 && total > 0;
    setHidden(progress, !showBar);
    if (showBar) {
      const pct = Math.max(0, Math.min(100, Math.round((asked / total) * 100)));
      if (bar) bar.style.width = `${pct}%`;
      if (count) count.textContent = `${asked}/${total}`;
    }

    if (best) {
      const top = topScores(mode, size)[0];
      best.textContent = top
        ? `Best ${Number(top.points || 0).toLocaleString()} · ${top.correct}/${top.total}`
        : "No score yet";
    }

    if (meta) {
      if (live || done) {
        const parts = [`${run.points || 0} pts`];
        if (run.startedAt || run.elapsedMs) parts.push(formatElapsed(elapsedMs(run)));
        meta.textContent = parts.join(" · ");
        setHidden(meta, false);
      } else {
        meta.textContent = "";
        setHidden(meta, true);
      }
    }
  });
}
