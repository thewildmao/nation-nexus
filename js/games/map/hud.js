import { comboBreak, comboCall } from "../../shared/combo.js";
import { themeForCountry } from "../../shared/regions.js";
import { poolSize } from "../../shared/run.js";
import { modeSettings } from "../../shared/settings.js";
import { currentRun } from "../../shared/state.js";
import { el } from "../../ui/dom.js";
import { paintMapNext } from "../../ui/score-dock.js";

export function applyRegionTheme(name) {
  const color = themeForCountry(name) || "transparent";
  [el.mapTarget, el.mapFeedback].forEach((node) => {
    if (node) node.style.setProperty("--region-glow", color);
  });
  if (el.mapTargetRegion && color !== "transparent") {
    el.mapTargetRegion.style.color = color;
  }
}

export function renderMapPrompt(state) {
  const run = currentRun(state);
  if (run && run.finished && !state.map.explore) {
    el.mapTargetFlag.textContent = "🏁";
    el.mapTargetName.textContent = "Set complete";
    el.mapTargetRegion.textContent = `${run.correct} / ${poolSize(run, state.selectedNames)}`;
    el.mapTargetRegion.classList.remove("hidden");
    applyRegionTheme(null);
    return;
  }

  const target = state.map.target;
  if (!target) return;
  el.mapTargetFlag.textContent = target.flag;
  el.mapTargetName.textContent = target.name;
  el.mapTargetRegion.textContent = target.region;
  const showHint = modeSettings(state).showContinentHint || state.map.explore;
  el.mapTargetRegion.classList.toggle("hidden", !showHint);
  applyRegionTheme(state.focusName || target.name);
}

export function setMapFeedback(text, color = "var(--muted)") {
  el.mapFeedback.innerHTML = text;
  el.mapFeedback.style.color = color;
}

export function renderWaitingPrompt() {
  setMapFeedback("Click the country on the map", "var(--muted)");
}

function formatGap(km) {
  if (km < 1) return "they touch";
  return `${Math.round(km)} km apart at the closest points`;
}

function lostFireHtml(award) {
  if (!award || award.hit || !award.lostBonus) return "";
  const title = comboBreak(award.lostStreak).title || "STREAK BROKEN";
  return `<br><span class="streak-hit is-lost">${title} −${award.lostBonus}</span>`;
}

export function renderMapResult(result) {
  const lost = lostFireHtml(result.award);
  if (result.isCorrect) {
    const bonus = result.award && result.award.bonus;
    const extra = bonus
      ? `<br><span class="streak-hit">${comboCall(result.award.streak).title || "STREAK"} +${bonus}</span>`
      : "";
    setMapFeedback(
      `Correct! That's <strong>${result.target.name}</strong> 🎯${extra}`,
      "var(--success)"
    );
    return;
  }

  if (result.kind === "miss") {
    setMapFeedback(
      `Missed the land!<br>
    It was <strong>${result.target.name}</strong> · ${formatGap(result.distanceKm)}${lost}`,
      "var(--error)"
    );
    return;
  }

  if (result.sameRegion) {
    setMapFeedback(
      `Same region, wrong country!<br>
        You clicked <strong>${result.guessedName}</strong> — it was <strong>${result.target.name}</strong><br>
        <span style="font-size:0.95rem;opacity:0.9">${formatGap(result.distanceKm)} · both in ${result.target.region}</span>${lost}`,
      "#fbbf24"
    );
    return;
  }

  setMapFeedback(
    `You clicked <strong>${result.guessedName}</strong> — it was <strong>${result.target.name}</strong><br>
        <span style="font-size:0.95rem;opacity:0.9">${formatGap(result.distanceKm)}</span>${lost}`,
    "var(--error)"
  );
}

export function renderMapMode(state) {
  const explore = state.map.explore;
  el.mapArea.classList.toggle("is-explore", explore);
  el.mapArea.classList.toggle("is-guess", !explore);

  el.mapModeChip.textContent = explore ? "Mode: Explore" : "Mode: Guess";
  el.mapPromptLabel.textContent = explore
    ? "Browsing — guessing paused"
    : "Where is this country?";

  paintMapNext(state);

  if (explore) {
    el.toggleExplore.textContent = "Back to guessing";
    el.toggleExplore.classList.add("primary");
    el.toggleExplore.title = "Return to the map quiz";
    setMapFeedback(
      "Explore mode — map score and streak were reset. Click a country to inspect it.",
      "var(--muted)"
    );
    return;
  }

  el.toggleExplore.textContent = "Exit to Explore";
  el.toggleExplore.classList.remove("primary");
  el.toggleExplore.title = "Leave guessing and explore the map. This resets your map score and streak.";
}
