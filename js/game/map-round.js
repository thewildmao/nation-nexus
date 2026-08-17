import { awardCorrect, awardWrong, currentRun, emptyMapRound } from "./state.js";
import { filterPool, findByGeoName } from "./catalog.js";
import { dealNext, touchStart } from "./run.js";
import { measureBetweenCountries, measureToCountry } from "./borders.js";

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

  if (result.isCorrect) awardCorrect(state, result.target.name);
  else awardWrong(state, result.target.name);

  return result;
}

export function startMapRound(state, countries) {
  const explore = state.map.explore;
  const pool = filterPool(state, countries);
  state.map = { ...emptyMapRound(), explore };
  if (!pool.length || explore) return;
  const run = currentRun(state);
  if (!run) return;
  state.map.target = dealNext(pool, run, state.settings.repeatPolicy);
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
