import { awardCorrect, awardWrong, currentRun, emptyMapRound } from "../../shared/state.js";
import { findByGeoName } from "../../shared/catalog.js";
import { dealNext, dealPool, recordTurn, touchStart } from "../../shared/run.js";
import { modeSettings } from "../../shared/settings.js";
import { measureBetweenCountries, measureToCountry } from "../../shared/borders.js";

function clickPoint(clickLatLng, guessed, target) {
  return {
    lat: clickLatLng ? clickLatLng.lat : guessed ? guessed.lat : target.lat,
    lng: clickLatLng ? clickLatLng.lng : guessed ? guessed.lng : target.lng,
  };
}

function withMeasure(result, measure) {
  return {
    ...result,
    from: measure.from,
    to: measure.to,
    distanceKm: measure.km,
  };
}

function finishGuess(state, result) {
  state.map.waiting = false;
  state.map.lastResult = result;

  result.award = result.isCorrect
    ? awardCorrect(state, result.target.name)
    : awardWrong(state, result.target.name);

  const run = currentRun(state);
  if (run && result.target) {
    recordTurn(run, {
      name: result.target.name,
      correct: !!result.isCorrect,
      guess: result.guessedName || null,
      answer: result.target.name,
      points: result.award ? result.award.points : 0,
      streak: result.award ? result.award.streak : run.streak,
    });
  }

  return result;
}

export function startMapRound(state, countries) {
  const explore = state.map.explore;
  const run = currentRun(state);
  const pool = dealPool(countries, run, state.selectedNames);
  state.map = { ...emptyMapRound(), explore };
  if (!pool.length || explore) return;
  if (!run) return;
  state.map.target = dealNext(pool, run, modeSettings(state).repeatPolicy);
  if (!state.map.target) state.map.waiting = false;
  else touchStart(run);
}

export function resolveCountryGuess(state, geoName, clickLatLng) {
  if (!state.map.waiting || !state.map.target) return null;

  const target = state.map.target;
  const guessed = findByGeoName(geoName);
  const from = clickPoint(clickLatLng, guessed, target);
  const isCorrect = !!(guessed && guessed.name === target.name);
  const measure = isCorrect
    ? { from, to: from, km: 0 }
    : guessed
      ? measureBetweenCountries(guessed, target, from)
      : measureToCountry(from, target);

  return finishGuess(
    state,
    withMeasure(
      {
        kind: "country",
        target,
        guessed,
        guessedName: guessed ? guessed.name : geoName,
        isCorrect,
        sameRegion: !!(guessed && guessed.region === target.region),
      },
      measure
    )
  );
}

export function resolveMiss(state, clickLatLng) {
  if (!state.map.waiting || !state.map.target || state.map.explore) return null;

  const target = state.map.target;
  const from = { lat: clickLatLng.lat, lng: clickLatLng.lng };
  const measure = measureToCountry(from, target);

  return finishGuess(
    state,
    withMeasure(
      {
        kind: "miss",
        target,
        guessed: null,
        guessedName: null,
        isCorrect: false,
        sameRegion: false,
      },
      measure
    )
  );
}

export function toggleExplore(state) {
  state.map.explore = !state.map.explore;
  return state.map.explore;
}
