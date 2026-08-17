import {
  gradeTypedAnswer,
  isCorrectOption,
  isTypeIn,
  optionLabel,
  suggestAnswers,
} from "../game/quiz.js";
import { currentRun } from "../game/state.js";
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

function bindOptions(state, onSelect) {
  el.options.innerHTML = "";
  if (isTypeIn(state)) return;
  state.quiz.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.dataset.index = String(i);
    btn.textContent = optionLabel(state, opt);

    if (state.quiz.answered) {
      btn.disabled = true;
      if (isCorrectOption(state, opt)) btn.classList.add("correct");
      if (i === state.quiz.selectedIndex && !state.quiz.correct) {
        btn.classList.add("wrong");
      }
    } else {
      btn.addEventListener("click", () => onSelect(i));
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
  if (state.mode === "flags") {
    el.questionText.textContent = "Which country is this?";
    el.promptDisplay.className = "flag-display";
    el.promptDisplay.textContent = state.quiz.country.flag;
    return;
  }

  el.questionText.textContent = "What is the capital of this country?";
  el.promptDisplay.className = "country-name-display";
  el.promptDisplay.textContent = `${state.quiz.country.flag} ${state.quiz.country.name}`;
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
    el.feedback.textContent = run && run.finished
      ? `Correct! Set complete — ${run.points} pts · ${run.correct}/${state.selectedNames.size}`
      : "Correct! 🎉";
    el.feedback.classList.add("correct");
    return;
  }

  el.feedback.classList.add("wrong");
  const missed =
    state.mode === "flags"
      ? `Wrong — it was ${state.quiz.country.name}`
      : `Wrong — the capital is ${state.quiz.country.capital}`;
  el.feedback.textContent =
    run && run.finished
      ? `${missed}. Set complete — ${run.points} pts · ${run.correct}/${state.selectedNames.size}`
      : missed;
}

export function renderQuiz(state, onSelect, pool) {
  const run = currentRun(state);
  if (state.quiz.error === "finished" || (run && run.finished && !state.quiz.country)) {
    el.questionText.textContent = "Set complete";
    el.promptDisplay.className = "country-name-display";
    el.promptDisplay.textContent = run
      ? `${run.points} pts · ${run.correct} / ${state.selectedNames.size}`
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
