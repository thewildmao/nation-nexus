import { themeForCountry } from "../game/regions.js";
import { currentRun } from "../game/state.js";
import { el } from "./dom.js";
import { pageTitle, playTitle } from "./home.js";

export function renderScore(state) {
  const run = currentRun(state);
  const explore = state.mode === "map" && state.map.explore;
  const hideBox = state.mode === "study" || !run;
  if (el.scoreBox) el.scoreBox.classList.toggle("hidden", hideBox);
  if (el.runDock) el.runDock.classList.toggle("hidden", hideBox);
  if (!run) return;

  el.score.textContent = run.points || 0;
  el.streak.textContent = run.streak;
  el.streakStat.classList.toggle("is-hot", run.streak >= 2 && run.streak < 5);
  el.streakStat.classList.toggle("is-fire", run.streak >= 5);

  const showProgress = !explore && state.settings.repeatPolicy !== "random";
  if (el.progressStat) {
    el.progressStat.classList.toggle("hidden", !showProgress);
    if (showProgress && el.progress) {
      el.progress.textContent = `${run.asked.size}/${state.selectedNames.size}`;
    }
  }

  if (el.newMapTarget) {
    el.newMapTarget.textContent = run.finished ? "Play again" : "Next";
  }
  if (el.nextBtn) {
    el.nextBtn.textContent = run.finished ? "Play again" : "Next Question →";
  }
}

export function setPlayTitle(mode, boardMode) {
  if (el.playTitle) {
    el.playTitle.textContent =
      mode === "scoreboard" && boardMode
        ? `${playTitle(boardMode)} scores`
        : mode === "breakdown" && boardMode
          ? `${playTitle(boardMode)} recap`
          : playTitle(mode);
  }
  document.title = pageTitle(mode, boardMode);
}

export function showScreen(mode, boardMode) {
  const isHome = mode === "home";
  const isBoard = mode === "scoreboard";
  const isBreak = mode === "breakdown";
  if (el.home) el.home.classList.toggle("hidden", !isHome);
  if (el.scoreboard) el.scoreboard.classList.toggle("hidden", !isBoard);
  if (el.breakdown) el.breakdown.classList.toggle("hidden", !isBreak);
  if (el.playChrome) el.playChrome.classList.toggle("hidden", isHome || isBreak);
  el.quizArea.classList.add("hidden");
  el.mapArea.style.display = "none";
  el.studyArea.classList.add("hidden");

  const recapOverMap = isBreak && boardMode === "map";
  document.body.classList.toggle("is-home", isHome);
  document.body.classList.toggle("is-play", !isHome);
  document.body.classList.toggle("is-map", mode === "map" || recapOverMap);
  document.body.classList.toggle("is-recap", isBreak);
  setPlayTitle(mode, boardMode);

  if (mode === "study") el.studyArea.classList.remove("hidden");
  else if (mode === "map" || recapOverMap) el.mapArea.style.display = "block";
  else if (mode === "flags" || mode === "capitals") el.quizArea.classList.remove("hidden");
  else if (isBreak && (boardMode === "flags" || boardMode === "capitals")) {
    el.quizArea.classList.remove("hidden");
  }

  if (el.settingsBtn) {
    el.settingsBtn.classList.toggle(
      "hidden",
      mode === "home" || mode === "study" || mode === "scoreboard" || mode === "breakdown"
    );
  }
  const playing = mode === "map" || mode === "flags" || mode === "capitals";
  if (el.runActions) el.runActions.classList.toggle("hidden", !playing);
  if (el.scoreboardNav) {
    el.scoreboardNav.classList.toggle("hidden", mode === "scoreboard");
    const game =
      mode === "map" || mode === "flags" || mode === "capitals"
        ? mode
        : boardMode;
    el.scoreboardNav.href = game ? `#/scoreboard/${game}` : "#/scoreboard";
  }

  if (mode === "map") {
    if (el.filterWrap && el.hudTl) el.hudTl.appendChild(el.filterWrap);
    if (el.runDock && el.hudBr) el.hudBr.appendChild(el.runDock);
  } else if (el.controls) {
    if (el.filterWrap) el.controls.appendChild(el.filterWrap);
    if (el.runDock) el.controls.appendChild(el.runDock);
  }
}

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
    el.mapTargetRegion.textContent = `${run.correct} / ${state.selectedNames.size}`;
    el.mapTargetRegion.classList.remove("hidden");
    applyRegionTheme(null);
    return;
  }

  const target = state.map.target;
  if (!target) return;
  el.mapTargetFlag.textContent = target.flag;
  el.mapTargetName.textContent = target.name;
  el.mapTargetRegion.textContent = target.region;
  const showHint = state.settings.showContinentHint || state.map.explore;
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

export function renderMapResult(result) {
  if (result.isCorrect) {
    setMapFeedback(
      `Correct! That's <strong>${result.target.name}</strong> 🎯`,
      "var(--success)"
    );
    return;
  }

  if (result.kind === "miss") {
    setMapFeedback(
      `Missed the land!<br>
    It was <strong>${result.target.name}</strong> · ${formatGap(result.distanceKm)}`,
      "var(--error)"
    );
    return;
  }

  if (result.sameRegion) {
    setMapFeedback(
      `Same region, wrong country!<br>
        You clicked <strong>${result.guessedName}</strong> — it was <strong>${result.target.name}</strong><br>
        <span style="font-size:0.95rem;opacity:0.9">${formatGap(result.distanceKm)} · both in ${result.target.region}</span>`,
      "#fbbf24"
    );
    return;
  }

  setMapFeedback(
    `You clicked <strong>${result.guessedName}</strong> — it was <strong>${result.target.name}</strong><br>
        <span style="font-size:0.95rem;opacity:0.9">${formatGap(result.distanceKm)}</span>`,
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

  el.newMapTarget.disabled = explore;

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

  el.toggleExplore.textContent = "Exit and explore";
  el.toggleExplore.classList.remove("primary");
  el.toggleExplore.title = "Leave guessing and explore the map. This resets your map score and streak.";
}
