import { comboBreak, comboCall } from "../game/combo.js";
import {
  gradeTypedAnswer,
  isCorrectOption,
  isTypeIn,
  optionLabel,
  suggestAnswers,
} from "../game/quiz.js";
import { currentRun } from "../game/state.js";
import { poolSize } from "../game/run.js";
import { el } from "./dom.js";

function hideType() {
  if (el.typeWrap) el.typeWrap.classList.add("hidden");
  if (el.typeSuggest) el.typeSuggest.innerHTML = "";
}

function syncAnswerMode(state) {
  if (!el.answerMode) return;
  const typed = isTypeIn(state);
  el.answerMode.classList.remove("hidden");
  el.answerMode.querySelectorAll("[data-style]").forEach((btn) => {
    btn.classList.toggle("is-on", (btn.dataset.style === "type") === typed);
  });
}

function paintOptionState(btn, state, opt, i) {
  btn.disabled = !!state.quiz.answered;
  btn.classList.toggle("correct", !!(state.quiz.answered && isCorrectOption(state, opt)));
  btn.classList.toggle(
    "wrong",
    !!(state.quiz.answered && i === state.quiz.selectedIndex && !state.quiz.correct)
  );
}

function bindOptions(state, onSelect) {
  if (isTypeIn(state)) {
    el.options.innerHTML = "";
    return;
  }
  const opts = state.quiz.options || [];
  const kids = [...el.options.children];
  const reuse =
    kids.length === opts.length &&
    kids.every((btn, i) => btn.dataset.key === optionLabel(state, opts[i]));

  if (reuse) {
    kids.forEach((btn, i) => paintOptionState(btn, state, opts[i], i));
    return;
  }

  el.options.innerHTML = "";
  opts.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.dataset.index = String(i);
    btn.dataset.key = optionLabel(state, opt);
    const label = document.createElement("span");
    label.textContent = optionLabel(state, opt);
    const key = document.createElement("kbd");
    key.className = "option-key";
    key.textContent = String(i + 1);
    btn.append(label, key);
    paintOptionState(btn, state, opt, i);
    if (!state.quiz.answered) {
      btn.addEventListener("pointerdown", (e) => {
        if (e.button != null && e.button !== 0) return;
        onSelect(i);
      });
    }
    el.options.appendChild(btn);
  });
}

function renderSuggestions(state, pool) {
  if (!el.typeSuggest) return;
  el.typeSuggest.innerHTML = "";
  if (state.quiz.answered) return;
  const hits = suggestAnswers(state, el.typeInput.value, pool);
  hits.forEach((country) => {
    const item = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent =
      state.mode === "capitals" ? country.capital : country.name;
    btn.addEventListener("click", () => {
      const value = state.mode === "capitals" ? country.capital : country.name;
      el.typeInput.value = value;
      gradeTypedAnswer(state, value);
      window.dispatchEvent(new CustomEvent("quiz-typed"));
    });
    item.append(btn);
    el.typeSuggest.append(item);
  });
}

function bindType(state, pool) {
  if (!el.typeWrap || !el.typeInput) return;
  if (!isTypeIn(state)) {
    hideType();
    return;
  }

  el.typeWrap.classList.remove("hidden");
  el.typeInput.placeholder =
    state.mode === "capitals" ? "Type the capital" : "Type the country";
  el.typeInput.disabled = !!state.quiz.answered;
  if (!state.quiz.answered) {
    el.typeInput.value = state.quiz.typedValue || "";
    el.typeInput.focus();
  }
  renderSuggestions(state, pool);

  if (el.typeWrap.dataset.bound === "1") return;
  el.typeWrap.dataset.bound = "1";

  el.typeInput.addEventListener("input", () => {
    el.typeWrap.dispatchEvent(new CustomEvent("type-input", { bubbles: true }));
  });
  el.typeInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    el.typeWrap.dispatchEvent(new CustomEvent("type-submit", { bubbles: true }));
  });
}

function renderPrompt(state) {
  const isFlags = state.mode === "flags";
  const nextClass = isFlags ? "flag-display" : "country-name-display";
  const nextText = isFlags
    ? state.quiz.country.flag
    : `${state.quiz.country.flag} ${state.quiz.country.name}`;

  el.questionText.textContent = isFlags
    ? "Which country is this?"
    : "What is the capital of this country?";

  const changed =
    el.promptDisplay.textContent !== nextText ||
    !el.promptDisplay.classList.contains(nextClass);

  el.promptDisplay.className = nextClass;
  el.promptDisplay.textContent = nextText;
  if (!changed) return;
  el.promptDisplay.classList.remove("is-enter");
  void el.promptDisplay.offsetWidth;
  el.promptDisplay.classList.add("is-enter");
}

function renderFeedback(state) {
  el.feedback.className = "feedback";

  if (!state.quiz.answered) {
    el.feedback.textContent = "";
    el.nextBtn.classList.add("hidden");
    return;
  }

  el.nextBtn.classList.remove("hidden");

  const run = currentRun(state);
  if (state.quiz.correct) {
    const award = run && run.lastAward;
    const call = award && award.bonus ? comboCall(award.streak) : { title: "" };
    const extra = award && award.bonus
      ? ` ${call.title || "STREAK"} +${award.bonus}`
      : "";
    el.feedback.textContent = run && run.finished
      ? `Correct! Set complete — ${run.points} pts · ${run.correct}/${poolSize(run, state.selectedNames)}`
      : `Correct! 🎉${extra}`;
    el.feedback.classList.add("correct");
    return;
  }

  el.feedback.classList.add("wrong");
  const missed =
    state.mode === "flags"
      ? `Wrong — it was ${state.quiz.country.name}`
      : `Wrong — the capital is ${state.quiz.country.capital}`;
  const award = run && run.lastAward;
  const lostCall = award && !award.hit ? comboBreak(award.lostStreak) : { title: "" };
  const lost =
    award && !award.hit && award.lostBonus
      ? ` ${lostCall.title || "STREAK BROKEN"} −${award.lostBonus}`
      : "";
  el.feedback.textContent =
    run && run.finished
      ? `${missed}. Set complete — ${run.points} pts · ${run.correct}/${poolSize(run, state.selectedNames)}`
      : `${missed}${lost}`;
}

export function renderQuiz(state, onSelect, pool) {
  const run = currentRun(state);
  if (state.quiz.error === "finished" || (run && run.finished && !state.quiz.country)) {
    el.questionText.textContent = "Set complete";
    el.promptDisplay.className = "country-name-display";
    el.promptDisplay.textContent = run
      ? `${run.points} pts · ${run.correct} / ${poolSize(run, state.selectedNames)}`
      : "";
    el.options.innerHTML = "";
    el.options.classList.add("hidden");
    hideType();
    if (el.answerMode) el.answerMode.classList.add("hidden");
    el.feedback.className = "feedback";
    el.feedback.textContent = "Play again to reshuffle, or go back to Games.";
    el.nextBtn.classList.remove("hidden");
    return;
  }

  if (state.quiz.error === "not-enough") {
    el.questionText.textContent = "Not enough countries in this region.";
    el.promptDisplay.textContent = "";
    el.options.innerHTML = "";
    el.options.classList.add("hidden");
    hideType();
    syncAnswerMode(state);
    el.feedback.textContent = "";
    el.feedback.className = "feedback";
    el.nextBtn.classList.add("hidden");
    return;
  }

  if (!state.quiz.country) return;

  const typed = isTypeIn(state);
  if (el.options) el.options.classList.toggle("hidden", typed);
  if (el.typeWrap) el.typeWrap.classList.toggle("hidden", !typed);
  syncAnswerMode(state);
  renderPrompt(state);
  bindOptions(state, onSelect);
  bindType(state, pool || []);
  renderFeedback(state);
}

function overlayOpen() {
  return !!(
    (el.settingsWrap && el.settingsWrap.classList.contains("is-open")) ||
    (el.confirmWrap && el.confirmWrap.classList.contains("is-open"))
  );
}

function optionIndex(e) {
  if (e.code === "Digit1" || e.code === "Numpad1") return 0;
  if (e.code === "Digit2" || e.code === "Numpad2") return 1;
  if (e.code === "Digit3" || e.code === "Numpad3") return 2;
  if (e.code === "Digit4" || e.code === "Numpad4") return 3;
  return -1;
}

export function bindQuizKeys(state, onSelect, onNext) {
  document.addEventListener("keydown", (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (overlayOpen()) return;
    const playing = state.mode === "flags" || state.mode === "capitals";
    const onMap = state.mode === "map";
    if (!playing && !onMap) return;
    if (playing && el.quizArea && el.quizArea.classList.contains("hidden")) return;

    const typing =
      e.target &&
      (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA");

    if (e.key === "Enter") {
      if (playing && typing && isTypeIn(state) && !state.quiz.answered) return;
      if (playing && el.nextBtn && !el.nextBtn.classList.contains("hidden")) {
        e.preventDefault();
        onNext();
      } else if (onMap && el.newMapTarget && !state.map.waiting && !state.map.explore) {
        e.preventDefault();
        el.newMapTarget.click();
      }
      return;
    }

    if (!playing || typing || isTypeIn(state) || state.quiz.answered) return;
    const index = optionIndex(e);
    if (index < 0 || !state.quiz.options || index >= state.quiz.options.length) return;
    e.preventDefault();
    onSelect(index);
  });
}

export function bindAnswerMode(onStyle) {
  if (!el.answerMode) return;
  el.answerMode.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-style]");
    if (!btn) return;
    onStyle(btn.dataset.style);
  });
}

export function bindTypeInput(state, pool, onTyped) {
  if (!el.typeWrap) return;
  el.typeWrap.addEventListener("type-input", () => {
    if (!isTypeIn(state) || state.quiz.answered) return;
    renderSuggestions(state, pool());
  });
  el.typeWrap.addEventListener("type-submit", () => {
    if (!isTypeIn(state) || state.quiz.answered || !el.typeInput.value.trim()) return;
    gradeTypedAnswer(state, el.typeInput.value);
    onTyped();
  });
  window.addEventListener("quiz-typed", onTyped);
}
