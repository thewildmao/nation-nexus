import { REPEAT_POLICIES } from "./run.js";

const KEY = "countryLearner.settings";

export const ANSWER_STYLES = ["choices", "type"];

export function defaultSettings() {
  return {
    showContinentHint: true,
    repeatPolicy: "once",
    answerStyle: "choices",
  };
}

export function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!parsed || typeof parsed !== "object") return defaultSettings();
    const settings = { ...defaultSettings(), ...parsed };
    if (!REPEAT_POLICIES.includes(settings.repeatPolicy)) {
      settings.repeatPolicy = "cycle";
    }
    if (!ANSWER_STYLES.includes(settings.answerStyle)) {
      settings.answerStyle = "choices";
    }
    settings.showContinentHint = !!settings.showContinentHint;
    return settings;
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
}
