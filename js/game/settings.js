import { REPEAT_POLICIES } from "./run.js";

const KEY = "countryLearner.settings";

export const ANSWER_STYLES = ["choices", "type"];

export function defaultModeSettings(mode) {
  if (mode === "map") {
    return { showContinentHint: true, repeatPolicy: "once" };
  }
  return { answerStyle: "choices", repeatPolicy: "once" };
}

export function defaultSettings() {
  return {
    map: defaultModeSettings("map"),
    flags: defaultModeSettings("flags"),
    capitals: defaultModeSettings("capitals"),
  };
}

function sanitizeMode(mode, raw) {
  const defaults = defaultModeSettings(mode);
  const src = raw && typeof raw === "object" ? raw : {};
  const next = { ...defaults };
  if (REPEAT_POLICIES.includes(src.repeatPolicy)) next.repeatPolicy = src.repeatPolicy;
  if (mode === "map") {
    if (src.showContinentHint !== undefined) next.showContinentHint = !!src.showContinentHint;
  } else if (ANSWER_STYLES.includes(src.answerStyle)) {
    next.answerStyle = src.answerStyle;
  }
  return next;
}

function isPerMode(parsed) {
  return !!(parsed && typeof parsed === "object" && parsed.map && parsed.flags && parsed.capitals);
}

export function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!parsed || typeof parsed !== "object") return defaultSettings();
    const source = isPerMode(parsed) ? parsed : { map: parsed, flags: parsed, capitals: parsed };
    return {
      map: sanitizeMode("map", source.map),
      flags: sanitizeMode("flags", source.flags),
      capitals: sanitizeMode("capitals", source.capitals),
    };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
}

export function modeSettings(state, mode = state.mode) {
  if (state.settings && mode && state.settings[mode]) return state.settings[mode];
  return defaultModeSettings(mode === "flags" || mode === "capitals" ? mode : "map");
}
