import { elapsedMs, formatElapsed, poolSize, runHasProgress } from "../game/run.js";

export { pageTitle, playTitle } from "./identity.js";

function setHidden(node, hide) {
  if (node) node.classList.toggle("hidden", hide);
}

export function renderHome(state) {
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
