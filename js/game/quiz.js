import { awardCorrect, awardWrong, currentRun, emptyQuiz } from "./state.js";
import { filterPool, shuffle } from "./catalog.js";
import { dealNext, touchStart } from "./run.js";

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'");
}

function answerField(mode) {
  return mode === "capitals" ? "capital" : "name";
}

export function isTypeIn(state) {
  if (state.quiz && state.quiz.country && state.quiz.answerStyle) {
    return state.quiz.answerStyle === "type";
  }
  return state.settings.answerStyle === "type";
}

export function suggestAnswers(state, text, pool) {
  const q = normalize(text);
  if (!q) return [];
  const field = answerField(state.mode);
  return pool
    .filter((country) => normalize(country[field]).includes(q))
    .slice(0, 8);
}

export function startQuizRound(state, countries) {
  const pool = filterPool(state, countries);
  const typed = state.settings.answerStyle === "type";
  if (!typed && pool.length < 4) {
    state.quiz = { ...emptyQuiz(), error: "not-enough" };
    return;
  }
  if (!pool.length) {
    state.quiz = { ...emptyQuiz(), error: "not-enough" };
    return;
  }

  const run = currentRun(state);
  if (run && run.finished) {
    state.quiz = { ...emptyQuiz(), error: "finished" };
    return;
  }

  const country = run
    ? dealNext(pool, run, state.settings.repeatPolicy)
    : null;
  if (!country) {
    state.quiz = {
      ...emptyQuiz(),
      error: run && run.finished ? "finished" : "not-enough",
    };
    return;
  }

  const others = typed
    ? []
    : shuffle(pool.filter((c) => c.name !== country.name)).slice(0, 3);

  state.quiz = {
    mode: state.mode,
    country,
    options: typed ? [] : shuffle([country, ...others]),
    answered: false,
    selectedIndex: null,
    typedValue: "",
    answerStyle: typed ? "type" : "choices",
    correct: false,
    error: null,
  };
  touchStart(run);
}

function optionIsCorrect(state, option) {
  if (state.mode === "flags") return option.name === state.quiz.country.name;
  return option.capital === state.quiz.country.capital;
}

export function gradeQuizAnswer(state, index) {
  if (state.quiz.answered || !state.quiz.country) return;
  const option = state.quiz.options[index];
  if (!option) return;

  const correct = optionIsCorrect(state, option);
  state.quiz.answered = true;
  state.quiz.selectedIndex = index;
  state.quiz.correct = correct;

  if (correct) awardCorrect(state, state.quiz.country.name);
  else awardWrong(state, state.quiz.country.name);
}

export function gradeTypedAnswer(state, text) {
  if (state.quiz.answered || !state.quiz.country) return;
  const field = answerField(state.mode);
  const correct = normalize(text) === normalize(state.quiz.country[field]);
  state.quiz.answered = true;
  state.quiz.typedValue = text;
  state.quiz.correct = correct;
  if (correct) awardCorrect(state, state.quiz.country.name);
  else awardWrong(state, state.quiz.country.name);
}

export function optionLabel(state, option) {
  return state.mode === "flags" ? option.name : option.capital;
}

export function isCorrectOption(state, option) {
  return optionIsCorrect(state, option);
}
