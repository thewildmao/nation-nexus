import { countries } from "../../../data/countries.js";
import { filterPool } from "../../shared/catalog.js";
import { gradeQuizAnswer, restyleCurrentQuiz, startQuizRound } from "./rules.js";
import { continueLap, PLAYABLE_MODES, runHasProgress } from "../../shared/run.js";
import { currentRun, ensureRoundPool, MODES, resetRun } from "../../shared/state.js";
import { modeSettings, saveSettings } from "../../shared/settings.js";
import { confirmWarn } from "../../ui/dialog.js";
import { el } from "../../ui/dom.js";
import { renderScore } from "../../ui/score-dock.js";
import { playNext } from "../../ui/sfx.js";
import { syncSettingsForm } from "../../ui/settings.js";
import { syncPlayClock } from "../../ui/timer.js";
import { bindAnswerMode, bindQuizKeys, bindTypeInput, renderQuiz } from "./view.js";

let ctx = null;

export function initQuizSession(next) {
  ctx = next;
}

function state() {
  return ctx.state;
}

export function currentPool() {
  return filterPool(state(), countries);
}

export function paintQuiz() {
  renderQuiz(state(), submitQuiz, currentPool());
  renderScore(state());
}

export function startQuiz() {
  const s = state();
  const run = currentRun(s);
  if (run && run.finished) {
    if (modeSettings(s).repeatPolicy === "cycle") continueLap(run);
    else resetRun(s, s.mode);
  }
  ensureRoundPool(s, s.mode);
  startQuizRound(s, countries);
  ctx.focusCountry(null);
  paintQuiz();
  syncPlayClock(s);
}

export function submitQuiz(index) {
  gradeQuizAnswer(state(), index);
  ctx.announceAward();
  ctx.afterSound(() => {
    const s = state();
    const run = currentRun(s);
    const award = run && run.lastAward;
    const done = !!(run && run.finished);
    paintQuiz();
    if (done) ctx.scheduleRecap(s.mode, "finished", award);
  });
}

export function goNextQuiz() {
  const run = currentRun(state());
  if (run && run.finished) return;
  ctx.cancelRecap();
  playNext();
  startQuiz();
}

export async function applyAnswerStyle(style) {
  const s = state();
  const cfg = modeSettings(s);
  const alreadyOn = cfg.answerStyle === style && s.quiz.answerStyle === style;
  if (alreadyOn && (s.mode === MODES.FLAGS || s.mode === MODES.CAPITALS)) {
    paintQuiz();
    return;
  }

  if (cfg.answerStyle !== style) {
    const run = s.runs[s.mode];
    if (PLAYABLE_MODES.includes(s.mode) && runHasProgress(run)) {
      const ok = await confirmWarn({
        title: "Change how you answer?",
        message: "This ends your current run and saves it to the scoreboard.",
        confirmLabel: "Change and reset",
      });
      if (!ok) {
        syncSettingsForm(s);
        return;
      }
      resetRun(s, s.mode);
    }
    cfg.answerStyle = style;
    saveSettings(s.settings);
    syncSettingsForm(s);
  }

  el.answerStyle.forEach((input) => {
    input.checked = input.value === style;
  });
  if (s.mode === MODES.FLAGS || s.mode === MODES.CAPITALS) {
    continueQuizStyle();
    renderScore(s);
    return;
  }
  renderScore(s);
}

export function continueQuizStyle() {
  const s = state();
  if (restyleCurrentQuiz(s, countries)) {
    paintQuiz();
    return;
  }
  startQuiz();
}

export function enterQuiz() {
  const s = state();
  const run = currentRun(s);
  if (
    s.quiz.mode === s.mode &&
    s.quiz.answerStyle === modeSettings(s).answerStyle &&
    s.quiz.country &&
    !s.quiz.answered &&
    run &&
    !run.finished
  ) {
    paintQuiz();
    return;
  }
  startQuiz();
}

export function bindQuizSession() {
  const s = state();
  el.nextBtn.addEventListener("click", goNextQuiz);
  bindQuizKeys(s, submitQuiz, goNextQuiz);
  bindTypeInput(s, currentPool, () => {
    ctx.announceAward();
    ctx.afterSound(() => {
      const run = currentRun(s);
      const award = run && run.lastAward;
      const done = !!(run && run.finished);
      paintQuiz();
      if (done) ctx.scheduleRecap(s.mode, "finished", award);
    });
  });
  bindAnswerMode((style) => {
    if (s.mode !== MODES.FLAGS && s.mode !== MODES.CAPITALS) return;
    applyAnswerStyle(style);
  });
}
