import { loadPrefs, persistPrefs, reloadPrefs, savePrefs } from "../shared/prefs.js";
import { applyVolume, playClose, playOpen, previewVolume, unlockSfx } from "./sfx.js";
import { modeSettings, saveSettings } from "../shared/settings.js";
import { resetRun } from "../shared/state.js";
import { runHasProgress } from "../shared/run.js";
import { settingsScoreLines } from "../shared/score-copy.js";
import { confirmWarn } from "./dialog.js";
import { el } from "./dom.js";
import { playTitle } from "./identity.js";
import { hideOverlay, showOverlay } from "./overlay.js";
import { notifyClock } from "./timer.js";

let onChange = () => {};
let stateRef = null;
let forNodes = null;
let scoreNodes = null;

const WARN = {
  repeatPolicy: {
    title: "Change how countries repeat?",
    message: "This ends your current run and saves it to the scoreboard.",
    confirmLabel: "Change and reset",
  },
  hint: {
    title: "Change the continent hint?",
    message: "This ends your current run and saves it to the scoreboard.",
    confirmLabel: "Change and reset",
  },
  answerStyle: {
    title: "Change how you answer?",
    message: "This ends your current run and saves it to the scoreboard.",
    confirmLabel: "Change and reset",
  },
};

export function isSettingsOpen() {
  return !!(el.settingsWrap && el.settingsWrap.classList.contains("is-open"));
}

function cacheNodes() {
  if (!forNodes && el.settingsOverlay) {
    forNodes = [...el.settingsOverlay.querySelectorAll("[data-for]")];
  }
  if (!scoreNodes && el.settingsWrap) {
    scoreNodes = [...el.settingsWrap.querySelectorAll("[data-score]")];
  }
}

function setScore(key, text) {
  cacheNodes();
  const node = (scoreNodes || []).find((n) => n.dataset.score === key);
  if (node) node.textContent = text;
}

function fillScoreLines(mode, cfg) {
  const lines = settingsScoreLines(mode, cfg);
  const key = JSON.stringify(lines);
  if (el.settingsWrap && el.settingsWrap.dataset.scoreKey === key) return;
  if (el.settingsWrap) el.settingsWrap.dataset.scoreKey = key;
  Object.entries(lines).forEach(([line, text]) => setScore(line, text));
}

function filterSettings(mode) {
  cacheNodes();
  (forNodes || []).forEach((node) => {
    const games = node.dataset.for.split(/\s+/);
    node.classList.toggle("hidden", !games.includes(mode));
  });
  if (!el.settingsTitle) return;
  el.settingsTitle.classList.add("game-lockup", "is-settings");
  if (el.settingsTitle.dataset.mode === mode) return;
  el.settingsTitle.dataset.mode = mode;
  const name = document.createElement("span");
  name.className = "game-lockup-name";
  name.textContent = playTitle(mode);
  const extra = document.createElement("span");
  extra.className = "game-lockup-extra";
  extra.textContent = "settings";
  el.settingsTitle.replaceChildren(name, extra);
}

function paintForm(state) {
  const cfg = modeSettings(state);
  if (el.hintContinent) el.hintContinent.checked = !!cfg.showContinentHint;
  el.repeatPolicy.forEach((input) => {
    input.checked = input.value === cfg.repeatPolicy;
  });
  el.answerStyle.forEach((input) => {
    input.checked = input.value === cfg.answerStyle;
  });
  const prefs = loadPrefs();
  if (el.soundFx) el.soundFx.checked = prefs.sound !== false;
  if (el.soundVol) el.soundVol.value = String(prefs.volume);
  if (el.soundVolOut) el.soundVolOut.textContent = String(prefs.volume);
  fillScoreLines(state.mode, cfg);
}

export function prepareSettings(state) {
  if (!el.settingsWrap || !state) return;
  filterSettings(state.mode);
  paintForm(state);
}

function parkLayer() {
  if (!el.settingsWrap) return;
  el.settingsWrap.classList.remove("is-open", "is-leaving");
  el.settingsWrap.setAttribute("aria-hidden", "true");
  if ("inert" in el.settingsWrap) el.settingsWrap.inert = true;
  document.body.classList.remove("is-settings");
  if (el.settingsBtn) el.settingsBtn.setAttribute("aria-expanded", "false");
}

function flushSettings() {
  persistPrefs();
  if (stateRef) saveSettings(stateRef.settings);
}

export function openSettings(state) {
  if (!el.settingsWrap) return;
  stateRef = state;
  reloadPrefs();
  prepareSettings(state);
  showOverlay(el.settingsWrap);
  el.settingsWrap.setAttribute("aria-hidden", "false");
  if ("inert" in el.settingsWrap) el.settingsWrap.inert = false;
  document.body.classList.add("is-settings");
  if (el.settingsBtn) el.settingsBtn.setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => playOpen());
  notifyClock();
}

export function closeSettings() {
  if (!el.settingsWrap || !isSettingsOpen()) return;
  flushSettings();
  if (el.settingsBtn) el.settingsBtn.setAttribute("aria-expanded", "false");
  playClose();
  hideOverlay(el.settingsWrap, () => {
    if (isSettingsOpen()) return;
    parkLayer();
    notifyClock();
  });
  notifyClock();
}

export function syncSettingsForm(state) {
  if (state) stateRef = state;
  if (!stateRef) return;
  paintForm(stateRef);
}

async function applyChange(state, key, write) {
  const progressed = runHasProgress(state.runs[state.mode]);
  if (progressed) {
    const ok = await confirmWarn(WARN[key] || WARN.repeatPolicy);
    if (!ok) {
      paintForm(state);
      return;
    }
    resetRun(state, state.mode);
  }
  write();
  paintForm(state);
  onChange(key, { reset: progressed });
}

export function bindSettings(state, change) {
  onChange = change;
  stateRef = state;
  parkLayer();
  prepareSettings(state);

  if (!el.settingsBtn || !el.settingsWrap) return;

  el.settingsBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSettingsOpen()) closeSettings();
    else openSettings(state);
  });

  if (el.settingsClose) {
    el.settingsClose.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeSettings();
    });
  }

  if (el.settingsBackdrop) {
    el.settingsBackdrop.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeSettings();
    });
  }

  if (el.settingsOverlay) {
    el.settingsOverlay.addEventListener("click", (e) => e.stopPropagation());
  }

  if (el.hintContinent) {
    el.hintContinent.addEventListener("change", () => {
      const cfg = modeSettings(state);
      const next = el.hintContinent.checked;
      if (next === !!cfg.showContinentHint) return;
      applyChange(state, "hint", () => {
        cfg.showContinentHint = next;
      });
    });
  }

  el.repeatPolicy.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      const cfg = modeSettings(state);
      if (input.value === cfg.repeatPolicy) return;
      applyChange(state, "repeatPolicy", () => {
        cfg.repeatPolicy = input.value;
      });
    });
  });

  el.answerStyle.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      const cfg = modeSettings(state);
      if (input.value === cfg.answerStyle) return;
      applyChange(state, "answerStyle", () => {
        cfg.answerStyle = input.value;
      });
    });
  });

  if (el.soundFx) {
    el.soundFx.addEventListener("change", () => {
      const prefs = loadPrefs();
      savePrefs({ sound: !!el.soundFx.checked, volume: prefs.volume }, false);
      applyVolume();
    });
  }
  if (el.soundVol) {
    el.soundVol.addEventListener("pointerdown", () => unlockSfx());
    el.soundVol.addEventListener("input", () => {
      const prefs = loadPrefs();
      const volume = Number(el.soundVol.value);
      savePrefs({ sound: volume > 0 ? true : prefs.sound, volume }, false);
      if (el.soundFx && volume > 0) el.soundFx.checked = true;
      if (el.soundVolOut) el.soundVolOut.textContent = String(volume);
      applyVolume();
    });
    el.soundVol.addEventListener("change", () => {
      previewVolume();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isSettingsOpen()) {
      e.stopPropagation();
      closeSettings();
    }
  });
}
