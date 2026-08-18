import { loadPrefs, savePrefs } from "../game/prefs.js";
import { applyVolume, playClose, playOpen, previewVolume, unlockSfx } from "./sfx.js";
import { modeSettings, saveSettings } from "../game/settings.js";
import { resetRun } from "../game/state.js";
import { runHasProgress } from "../game/run.js";
import { settingsScoreLines } from "../game/score-copy.js";
import { confirmWarn } from "./confirm.js";
import { el } from "./dom.js";
import { fillLockup } from "./identity.js";
import { notifyClock } from "./timer.js";

let onChange = () => {};

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

function isOpen() {
  return !!(el.settingsWrap && el.settingsWrap.classList.contains("is-open"));
}

function motionMs() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 200;
}

function setScore(key, text) {
  const node = document.querySelector(`[data-score="${key}"]`);
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
  document.querySelectorAll("#settingsOverlay [data-for]").forEach((node) => {
    const games = node.dataset.for.split(/\s+/);
    node.classList.toggle("hidden", !games.includes(mode));
  });
  if (!el.settingsTitle) return;
  el.settingsTitle.classList.add("game-lockup", "is-settings");
  if (el.settingsTitle.dataset.mode === mode) return;
  el.settingsTitle.dataset.mode = mode;
  fillLockup(el.settingsTitle, mode, "settings");
}

export function openSettings(state) {
  if (!el.settingsWrap) return;
  filterSettings(state.mode);
  syncSettingsForm(state);
  el.settingsWrap.classList.remove("is-leaving");
  el.settingsWrap.hidden = false;
  el.settingsWrap.style.display = "";
  el.settingsWrap.classList.add("is-open");
  if (el.settingsBtn) el.settingsBtn.setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => playOpen());
  notifyClock();
}

export function closeSettings() {
  if (!el.settingsWrap) return;
  const wrap = el.settingsWrap;
  wrap.classList.remove("is-open");
  wrap.classList.add("is-leaving");
  playClose();
  if (el.settingsBtn) el.settingsBtn.setAttribute("aria-expanded", "false");
  const hide = () => {
    if (!el.settingsWrap || el.settingsWrap.classList.contains("is-open")) return;
    el.settingsWrap.classList.remove("is-leaving");
    el.settingsWrap.hidden = true;
    el.settingsWrap.style.display = "none";
    notifyClock();
  };
  if (motionMs() === 0) hide();
  else window.setTimeout(hide, motionMs());
  notifyClock();
}

export function syncSettingsForm(state) {
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

async function applyChange(state, key, write) {
  const progressed = runHasProgress(state.runs[state.mode]);
  if (progressed) {
    const ok = await confirmWarn(WARN[key] || WARN.repeatPolicy);
    if (!ok) {
      syncSettingsForm(state);
      return;
    }
    resetRun(state, state.mode);
  }
  write();
  saveSettings(state.settings);
  syncSettingsForm(state);
  onChange(key, { reset: progressed });
}

export function bindSettings(state, change) {
  onChange = change;
  syncSettingsForm(state);

  if (!el.settingsBtn || !el.settingsWrap) return;

  el.settingsBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOpen()) closeSettings();
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
      savePrefs({ sound: !!el.soundFx.checked, volume: prefs.volume });
      applyVolume();
      syncSettingsForm(state);
    });
  }
  if (el.soundVol) {
    el.soundVol.addEventListener("pointerdown", () => unlockSfx());
    el.soundVol.addEventListener("input", () => {
      const prefs = loadPrefs();
      const volume = Number(el.soundVol.value);
      savePrefs({ sound: volume > 0 ? true : prefs.sound, volume });
      if (el.soundFx && volume > 0) el.soundFx.checked = true;
      if (el.soundVolOut) el.soundVolOut.textContent = String(volume);
      el.soundVol.disabled = false;
      previewVolume();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) {
      e.stopPropagation();
      closeSettings();
    }
  });
}
