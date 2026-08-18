import { comboBreak, comboCall, comboHeat, shoutHoldMs } from "../game/combo.js";
import { themeForCountry } from "../game/regions.js";
import { poolSize, STREAK_STEP, streakBonus } from "../game/run.js";
import { modeSettings } from "../game/settings.js";
import { currentRun } from "../game/state.js";
import { el } from "./dom.js";
import { fillLockup, pageTitle, playKicker, playTitle } from "./identity.js";

function popValue(node, value) {
  if (!node) return;
  const next = String(value);
  if (node.textContent === next) return;
  node.textContent = next;
  node.classList.remove("is-pop");
  void node.offsetWidth;
  node.classList.add("is-pop");
}

let flareTimer = 0;
let shoutTimer = 0;
let brokeTimer = 0;

const HEATS = [2, 3, 4, 5, 6, 7, 8];
const HEAT_CLASS = HEATS.map((n) => `is-heat-${n}`);
const BODY_COMBO = [
  "is-combo",
  "is-combo-fire",
  "is-combo-broke",
  "is-combo-god",
  ...HEATS.map((n) => `is-combo-heat-${n}`),
];

function heatClass(heat) {
  return heat ? `is-heat-${heat}` : "";
}

function hideFlare() {
  if (!el.streakFlare) return;
  el.streakFlare.classList.remove("is-show", "is-max", "is-broke", "is-god", ...HEAT_CLASS);
  el.streakFlare.hidden = true;
}

function hideShout() {
  if (!el.comboShout) return;
  el.comboShout.hidden = true;
  el.comboShout.className = "combo-shout";
  document.body.classList.remove(...BODY_COMBO);
}

export function shoutCombo({ title, tier, pts, heat }) {
  showComboShout({ title, tier, pts, heat });
}

function showComboShout({ title, tier, pts, heat = 0 }) {
  if (!el.comboShout || !title) return;
  if (el.comboShoutTitle) el.comboShoutTitle.textContent = title;
  if (el.comboShoutPts) el.comboShoutPts.textContent = pts || "";
  el.comboShout.hidden = false;
  el.comboShout.className = "combo-shout";
  void el.comboShout.offsetWidth;
  const heatCls = heatClass(heat);
  el.comboShout.className = `combo-shout is-show is-${tier || "hot"}${heatCls ? ` ${heatCls}` : ""}`;
  document.body.classList.remove(...BODY_COMBO);
  document.body.classList.add("is-combo");
  if (tier === "fire" || tier === "god") document.body.classList.add("is-combo-fire");
  if (tier === "god") document.body.classList.add("is-combo-god");
  if (tier === "broke") document.body.classList.add("is-combo-broke");
  if (heat) document.body.classList.add(`is-combo-heat-${heat}`);
  window.clearTimeout(shoutTimer);
  shoutTimer = window.setTimeout(hideShout, shoutHoldMs(heat, tier));
}

function showStreakFlare({ hit, streak, bonus, lostStreak, lostBonus }) {
  const call = hit ? comboCall(streak) : comboBreak(lostStreak);
  const heat = comboHeat(hit ? streak : lostStreak);
  const pts = hit && bonus > 0 ? `+${bonus}` : !hit && lostBonus > 0 ? `−${lostBonus}` : "";
  const broke = !hit && lostBonus > 0;
  const max = heat >= 5;
  if (call.title) showComboShout({ title: call.title, tier: call.tier, pts, heat });
  if (!el.streakFlare) return;
  if (!call.title && !pts) return;
  if (el.streakFlareKicker) el.streakFlareKicker.textContent = call.title || (hit ? `STREAK ×${streak}` : "");
  if (el.streakFlarePts) el.streakFlarePts.textContent = pts;
  el.streakFlare.hidden = false;
  el.streakFlare.classList.remove("is-show", "is-max", "is-broke", "is-god", ...HEAT_CLASS);
  void el.streakFlare.offsetWidth;
  el.streakFlare.classList.toggle("is-max", max);
  el.streakFlare.classList.toggle("is-broke", broke);
  el.streakFlare.classList.toggle("is-god", heat >= 7);
  if (heat) el.streakFlare.classList.add(heatClass(heat));
  el.streakFlare.classList.add("is-show");
  window.clearTimeout(flareTimer);
  flareTimer = window.setTimeout(hideFlare, broke ? 1100 : heat >= 8 ? 1050 : 900);
}

function flashGain(points) {
  if (!el.scoreFloat || !points) return;
  el.scoreFloat.textContent = `+${points}`;
  el.scoreFloat.classList.remove("is-on");
  void el.scoreFloat.offsetWidth;
  el.scoreFloat.classList.add("is-on");
}

function coolStreak() {
  if (!el.streakStat) return;
  el.streakStat.classList.remove("is-hot", "is-fire", "is-god", ...HEAT_CLASS);
  el.streakStat.classList.add("is-broke");
  window.clearTimeout(brokeTimer);
  brokeTimer = window.setTimeout(() => {
    el.streakStat.classList.remove("is-broke");
  }, 450);
}

function paintPips(streak) {
  if (!el.streakPips) return;
  const filled = Math.max(0, Math.min(5, streak));
  [...el.streakPips.children].forEach((pip, i) => {
    pip.classList.toggle("is-on", i < filled);
  });
}

function paintStreakChip(streak) {
  const call = comboCall(streak);
  const heat = comboHeat(streak);
  const hot = call.tier === "hot";
  const fire = call.tier === "fire" || call.tier === "god";
  const upcoming = streakBonus(streak + 1);
  if (el.streakStat) {
    el.streakStat.classList.toggle("is-hot", hot);
    el.streakStat.classList.toggle("is-fire", fire);
    el.streakStat.classList.toggle("is-god", call.tier === "god");
    HEATS.forEach((n) => el.streakStat.classList.toggle(`is-heat-${n}`, heat === n));
    if (streak > 0) el.streakStat.classList.remove("is-broke");
  }
  if (el.streakLabel) {
    el.streakLabel.textContent = fire ? "FIRE" : hot ? "Hot" : "Streak";
  }
  if (el.streakMod) {
    el.streakMod.textContent = streak === 0 ? `Next +${STREAK_STEP}` : `+${upcoming}`;
  }
  paintPips(streak);
  if (el.streak) {
    el.streak.classList.toggle("hidden", streak < 2);
    popValue(el.streak, streak >= 2 ? `🔥${streak}` : String(streak));
  }
}

function consumeAward(run) {
  const award = run.lastAward;
  if (!award) return;
  run.lastAward = null;
  if (award.hit) {
    flashGain(award.points);
    requestAnimationFrame(() => showStreakFlare(award));
    return;
  }
  requestAnimationFrame(() => {
    showStreakFlare(award);
    if (award.lostBonus > 0) coolStreak();
    else hideFlare();
  });
}

function replayCount(run) {
  return run && run.poolNames && run.poolNames.size ? run.poolNames.size : 0;
}

function paintReplayChip(run) {
  if (!el.replayChip) return;
  const n = replayCount(run);
  el.replayChip.hidden = n === 0;
  if (!n) return;
  el.replayChip.textContent = n === 1 ? "Replaying 1 miss" : `Replaying ${n} misses`;
}

function parkReplayChip() {
  if (!el.replayChip || !el.playBrand) return;
  el.playBrand.appendChild(el.replayChip);
}

function paintMapNext(state) {
  if (!el.newMapTarget) return;
  const run = currentRun(state);
  const explore = !!(state.map && state.map.explore);
  const finished = !!(run && run.finished);
  const waiting = !!(state.map && state.map.waiting && !finished);
  el.newMapTarget.textContent = "Next";
  const hide = explore || waiting || finished;
  el.newMapTarget.classList.toggle("hidden", hide);
  el.newMapTarget.disabled = hide;
}

export function renderScore(state) {
  const run = currentRun(state);
  const explore = state.mode === "map" && state.map.explore;
  const hideBox = state.mode === "study" || !run || explore;
  if (el.scoreBox) el.scoreBox.classList.toggle("hidden", hideBox);
  if (el.runDock) el.runDock.classList.toggle("hidden", hideBox);
  paintReplayChip(run);
  if (!run) return;

  consumeAward(run);
  popValue(el.score, run.points || 0);
  paintStreakChip(run.streak);

  const showProgress = !explore && modeSettings(state).repeatPolicy !== "random";
  if (el.progressStat) {
    el.progressStat.classList.toggle("hidden", !showProgress);
    if (showProgress && el.progress) {
      el.progress.textContent = `${run.asked.size}/${poolSize(run, state.selectedNames)}`;
    }
  }

  paintMapNext(state);
  if (el.nextBtn) {
    el.nextBtn.textContent = run.finished ? "Play again" : "Next Question →";
  }
}

export function setPlayTitle(mode, boardMode) {
  const game =
    (mode === "scoreboard" || mode === "breakdown" || mode === "how") && boardMode
      ? boardMode
      : mode;
  const extra =
    mode === "scoreboard" ? "scores" : mode === "breakdown" ? "recap" : "";
  if (el.playTitle) {
    if (game === "map" || game === "flags" || game === "capitals") {
      fillLockup(el.playTitle, game, extra);
    } else {
      const key = `text|${playTitle(mode)}`;
      if (el.playTitle.dataset.lockup !== key) {
        el.playTitle.dataset.lockup = key;
        el.playTitle.replaceChildren();
        const text = document.createElement("span");
        text.className = "game-lockup-name";
        text.textContent = playTitle(mode);
        el.playTitle.append(text);
      }
    }
  }
  if (el.playKicker) {
    const kick = mode === "how" ? "How to play" : extra ? "" : playKicker(game);
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
  el.mapArea.style.display = "none";
  el.studyArea.classList.add("hidden");

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

  if (mode === "map") {
    if (el.filterWrap && el.hudTl) el.hudTl.appendChild(el.filterWrap);
    if (el.mapModeChip && el.hudTc) el.hudTc.appendChild(el.mapModeChip);
    if (el.mapTargetBlock && el.hudTc) el.hudTc.appendChild(el.mapTargetBlock);
    if (el.runDock && el.hudBr) el.hudBr.appendChild(el.runDock);
  } else if (mode === "flags" || mode === "capitals") {
    if (el.filterWrap && el.controls) el.controls.appendChild(el.filterWrap);
    if (el.runDock && el.quizArea) el.quizArea.after(el.runDock);
  } else if (isHome && el.homeToolbar && el.filterWrap) {
    el.homeToolbar.appendChild(el.filterWrap);
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
