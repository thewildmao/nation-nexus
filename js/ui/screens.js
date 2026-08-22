import { el } from "./dom.js";
import { pageTitle, playKicker, playTitle } from "./identity.js";
import { paintReplayChip, parkReplayChip } from "./score-dock.js";

export function setPlayTitle(mode, boardMode) {
  const game =
    (mode === "scoreboard" || mode === "breakdown" || mode === "how") && boardMode
      ? boardMode
      : mode;
  const extra =
    mode === "scoreboard" ? "scores" : mode === "breakdown" ? "recap" : "";
  if (el.playTitle) {
    const named = game === "map" || game === "flags" || game === "capitals";
    el.playTitle.textContent = named ? playTitle(game) : playTitle(mode);
  }
  if (el.playKicker) {
    const kick =
      mode === "how" ? "How to play" : extra ? extra : playKicker(game);
    el.playKicker.textContent = kick;
    el.playKicker.hidden = !kick;
  }
  document.title = pageTitle(mode, boardMode);
}

export function showScreen(mode, boardMode) {
  const isHome = mode === "home";
  const isBoard = mode === "scoreboard";
  const isBreak = mode === "breakdown";
  const isHow = mode === "how";
  const recapOverMap = isBreak && boardMode === "map";
  if (el.home) el.home.classList.toggle("hidden", !isHome);
  if (el.scoreboard) el.scoreboard.classList.toggle("hidden", !isBoard);
  if (el.guide) el.guide.classList.toggle("hidden", !isHow);
  if (el.breakdown) el.breakdown.classList.toggle("hidden", !isBreak);
  if (el.playChrome) el.playChrome.classList.toggle("hidden", isHome || isBreak);
  parkReplayChip();
  if (mode !== "map" && mode !== "flags" && mode !== "capitals") paintReplayChip(null);
  el.quizArea.classList.add("hidden");
  el.mapArea.style.display = "";
  el.studyArea.classList.add("hidden");

  document.body.classList.toggle("is-home", isHome);
  document.body.classList.toggle("is-play", !isHome);
  document.body.classList.toggle("is-map", mode === "map" || recapOverMap);
  document.body.classList.toggle("is-recap", isBreak);
  setPlayTitle(mode, boardMode);

  if (mode === "study") el.studyArea.classList.remove("hidden");
  else if (mode === "flags" || mode === "capitals") el.quizArea.classList.remove("hidden");
  else if (isBreak && (boardMode === "flags" || boardMode === "capitals")) {
    el.quizArea.classList.remove("hidden");
  }

  if (el.settingsBtn) {
    el.settingsBtn.classList.toggle(
      "hidden",
      mode === "home" || mode === "study" || mode === "scoreboard" || mode === "breakdown" || mode === "how"
    );
  }
  const playing = mode === "map" || mode === "flags" || mode === "capitals";
  if (el.runActions) el.runActions.classList.toggle("hidden", !playing);
  if (el.runDock) el.runDock.classList.toggle("hidden", !playing);
  if (el.scoreBox) el.scoreBox.classList.toggle("hidden", !playing);
  if (el.scoreboardNav) {
    el.scoreboardNav.classList.toggle("hidden", mode === "scoreboard");
    const game =
      mode === "map" || mode === "flags" || mode === "capitals"
        ? mode
        : boardMode;
    el.scoreboardNav.href = game ? `#/scoreboard/${game}` : "#/scoreboard";
  }

  if (el.controls) {
    el.controls.classList.toggle("hidden", isHome || isBreak || isHow || mode === "map");
  }

  const shell = el.playChrome && el.playChrome.parentElement;
  if (playing && el.runDock && shell) shell.appendChild(el.runDock);

  if (mode === "map") {
    if (el.filterWrap && el.hudTl) el.hudTl.appendChild(el.filterWrap);
    if (el.mapPromptSlot && el.mapTargetBlock) el.mapPromptSlot.appendChild(el.mapTargetBlock);
    if (el.mapModeChip && el.mapPromptSlot) el.mapPromptSlot.appendChild(el.mapModeChip);
  } else if (mode === "flags" || mode === "capitals") {
    if (el.filterWrap && el.controls) el.controls.appendChild(el.filterWrap);
  } else if (el.controls) {
    if (!isHome && el.filterWrap) el.controls.appendChild(el.filterWrap);
    if (el.runDock) el.controls.appendChild(el.runDock);
  }
}
