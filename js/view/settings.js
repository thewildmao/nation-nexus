import { saveSettings } from "../game/settings.js";
import { el } from "./dom.js";
import { notifyClock } from "./timer.js";

let onChange = () => {};

function isOpen() {
  return !!(el.settingsWrap && el.settingsWrap.classList.contains("is-open"));
}

export function openSettings() {
  if (!el.settingsWrap) return;
  document.body.appendChild(el.settingsWrap);
  el.settingsWrap.hidden = false;
  el.settingsWrap.classList.add("is-open");
  el.settingsWrap.style.cssText =
    "position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:24px;";
  if (el.settingsBtn) el.settingsBtn.setAttribute("aria-expanded", "true");
  notifyClock();
}

export function closeSettings() {
  if (!el.settingsWrap) return;
  el.settingsWrap.classList.remove("is-open");
  el.settingsWrap.hidden = true;
  el.settingsWrap.style.display = "none";
  if (el.settingsBtn) el.settingsBtn.setAttribute("aria-expanded", "false");
  notifyClock();
}

export function syncSettingsForm(state) {
  if (el.hintContinent) {
    el.hintContinent.checked = !!state.settings.showContinentHint;
  }
  el.repeatPolicy.forEach((input) => {
    input.checked = input.value === state.settings.repeatPolicy;
  });
  el.answerStyle.forEach((input) => {
    input.checked = input.value === state.settings.answerStyle;
  });
}

export function bindSettings(state, change) {
  onChange = change;
  syncSettingsForm(state);

  if (!el.settingsBtn || !el.settingsWrap) return;

  el.settingsBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOpen()) closeSettings();
    else openSettings();
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
      state.settings.showContinentHint = el.hintContinent.checked;
      saveSettings(state.settings);
      onChange("hint");
    });
  }

  el.repeatPolicy.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      state.settings.repeatPolicy = input.value;
      saveSettings(state.settings);
      onChange("repeatPolicy");
    });
  });

  el.answerStyle.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      state.settings.answerStyle = input.value;
      saveSettings(state.settings);
      onChange("answerStyle");
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) {
      e.stopPropagation();
      closeSettings();
    }
  });
}
