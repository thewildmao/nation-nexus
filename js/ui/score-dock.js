import { comboBreak, comboCall, comboHeat, shoutHoldMs } from "../shared/combo.js";
import { poolSize, STREAK_STEP, streakBonus } from "../shared/run.js";
import { modeSettings } from "../shared/settings.js";
import { currentRun } from "../shared/state.js";
import { el } from "./dom.js";

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
  if (!run || !run.replay) return 0;
  return run.poolNames && run.poolNames.size ? run.poolNames.size : 0;
}

export function paintReplayChip(run) {
  if (!el.replayChip) return;
  const n = replayCount(run);
  el.replayChip.hidden = n === 0;
  if (!n) return;
  el.replayChip.textContent = n === 1 ? "Replaying 1 miss" : `Replaying ${n} misses`;
}

export function parkReplayChip() {
  if (!el.replayChip || !el.playBrand) return;
  el.playBrand.appendChild(el.replayChip);
}

function paintQuizNext(state) {
  if (!el.nextBtn) return;
  const run = currentRun(state);
  const finished = !!(run && run.finished);
  el.nextBtn.textContent = "Next Question →";
  if (finished) {
    el.nextBtn.classList.add("hidden");
    el.nextBtn.disabled = true;
  } else {
    el.nextBtn.disabled = false;
  }
}

export function paintMapNext(state) {
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
  paintQuizNext(state);
}
