import { awardCorrect, awardWrong, currentRun, emptyQuiz } from "../../shared/state.js";
import { filterPool, shuffle } from "../../shared/catalog.js";
import { dealNext, dealPool, recordTurn, touchStart } from "../../shared/run.js";
import { modeSettings } from "../../shared/settings.js";
import { normalize } from "../../shared/text.js";

function answerField(mode) {
  return mode === "capitals" ? "capital" : "name";
}

export function isTypeIn(state) {
  if (state.quiz && state.quiz.country && state.quiz.answerStyle) {
    return state.quiz.answerStyle === "type";
  }
  return modeSettings(state).answerStyle === "type";
}

export function suggestAnswers(state, text, pool) {
  const q = normalize(text);
  if (!q) return [];
  const field = answerField(state.mode);
  return pool
    .filter((country) => normalize(country[field]).includes(q))
    .slice(0, 8);
}

function choiceSource(state, countries) {
  const regionPool = filterPool(state, countries);
  const run = currentRun(state);
  const focused = !!(run && run.poolNames && run.poolNames.size);
  return regionPool.length >= 4 ? regionPool : focused ? countries : regionPool;
}

function buildOptions(state, countries, country, typed) {
  if (typed) return [];
  const others = shuffle(
    choiceSource(state, countries).filter((c) => c.name !== country.name)
  ).slice(0, 3);
  return shuffle([country, ...others]);
}

function liveUnanswered(state) {
  const quiz = state.quiz;
  const run = currentRun(state);
  return !!(
    quiz &&
    quiz.country &&
    quiz.mode === state.mode &&
    !quiz.answered &&
    !quiz.error &&
    run &&
    !run.finished
  );
}

export function startQuizRound(state, countries) {
  const run = currentRun(state);
  const pool = dealPool(countries, run, state.selectedNames);
  const typed = modeSettings(state).answerStyle === "type";
  if (!typed && choiceSource(state, countries).length < 4) {
    state.quiz = { ...emptyQuiz(), error: "not-enough" };
    return;
  }
  if (!pool.length) {
    state.quiz = { ...emptyQuiz(), error: "not-enough" };
    return;
  }

  if (run && run.finished) {
    state.quiz = { ...emptyQuiz(), error: "finished" };
    return;
  }

  const country = run
    ? dealNext(pool, run, modeSettings(state).repeatPolicy)
    : null;
  if (!country) {
    state.quiz = {
      ...emptyQuiz(),
      error: run && run.finished ? "finished" : "not-enough",
    };
    return;
  }

  state.quiz = {
    mode: state.mode,
    country,
    options: buildOptions(state, countries, country, typed),
    answered: false,
    selectedIndex: null,
    typedValue: "",
    answerStyle: typed ? "type" : "choices",
    correct: false,
    award: null,
    error: null,
  };
  touchStart(run);
}

export function restyleCurrentQuiz(state, countries) {
  if (!liveUnanswered(state)) return false;

  const typed = modeSettings(state).answerStyle === "type";
  if (!typed && choiceSource(state, countries).length < 4) {
    state.quiz = { ...emptyQuiz(), error: "not-enough" };
    return true;
  }

  const quiz = state.quiz;
  quiz.options = buildOptions(state, countries, quiz.country, typed);
  quiz.answerStyle = typed ? "type" : "choices";
  quiz.typedValue = "";
  quiz.selectedIndex = null;
  return true;
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

  state.quiz.award = correct
    ? awardCorrect(state, state.quiz.country.name)
    : awardWrong(state, state.quiz.country.name);
  logQuizTurn(state, optionLabel(state, option));
}

export function gradeTypedAnswer(state, text) {
  if (state.quiz.answered || !state.quiz.country) return;
  const field = answerField(state.mode);
  const correct = normalize(text) === normalize(state.quiz.country[field]);
  state.quiz.answered = true;
  state.quiz.typedValue = text;
  state.quiz.correct = correct;
  state.quiz.award = correct
    ? awardCorrect(state, state.quiz.country.name)
    : awardWrong(state, state.quiz.country.name);
  logQuizTurn(state, String(text || "").trim());
}

function logQuizTurn(state, guess) {
  const run = currentRun(state);
  const country = state.quiz.country;
  if (!run || !country) return;
  const award = run.lastAward;
  recordTurn(run, {
    name: country.name,
    correct: !!state.quiz.correct,
    guess,
    answer: state.mode === "capitals" ? country.capital : country.name,
    points: award ? award.points : 0,
    streak: award ? award.streak : run.streak,
  });
}

export function optionLabel(state, option) {
  return state.mode === "flags" ? option.name : option.capital;
}

export function isCorrectOption(state, option) {
  return optionIsCorrect(state, option);
}
