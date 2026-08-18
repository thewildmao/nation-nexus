import { modeSettings, saveSettings } from "../game/settings.js";
import { resetRun } from "../game/state.js";
import { runHasProgress } from "../game/run.js";
import { settingsScoreLines } from "../game/score-copy.js";
import { confirmWarn } from "./confirm.js";
import { el } from "./dom.js";
import { playTitle } from "./home.js";
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
  Object.entries(lines).forEach(([key, text]) => setScore(key, text));
}

function filterSettings(mode) {
  document.querySelectorAll("#settingsOverlay [data-for]").forEach((node) => {
    const games = node.dataset.for.split(/\s+/);
    node.classList.toggle("hidden", !games.includes(mode));
  });
  if (el.settingsTitle) el.settingsTitle.textContent = `${playTitle(mode)} settings`;
}

export function openSettings(state) {
  if (!el.settingsWrap) return;
  filterSettings(state.mode);
  syncSettingsForm(state);
  document.body.appendChild(el.settingsWrap);
  el.settingsWrap.classList.remove("is-leaving");
  el.settingsWrap.hidden = false;
  el.settingsWrap.classList.add("is-open");
  el.settingsWrap.style.cssText =
    "position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:24px;";
  if (el.settingsBtn) el.settingsBtn.setAttribute("aria-expanded", "true");
  notifyClock();
}

export function closeSettings() {
  if (!el.settingsWrap) return;
  const wrap = el.settingsWrap;
  wrap.classList.remove("is-open");
  wrap.classList.add("is-leaving");
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

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) {
      e.stopPropagation();
      closeSettings();
    }
  });
}
