import { PLAYABLE_MODES } from "../game/run.js";

const SCREENS = new Set(["home", "map", "flags", "capitals", "study", "scoreboard", "breakdown"]);

export function readHash() {
  const raw = (location.hash || "#/").replace(/^#/, "");
  const path = raw.replace(/\/+$/, "") || "/";
  if (path === "/") return { mode: "home", boardMode: null };
  const parts = path.replace(/^\//, "").split("/").filter(Boolean);
  if (parts[0] === "scoreboard" || parts[0] === "breakdown") {
    const boardMode = PLAYABLE_MODES.includes(parts[1]) ? parts[1] : null;
    return { mode: parts[0], boardMode };
  }
  if (SCREENS.has(parts[0])) return { mode: parts[0], boardMode: null };
  return { mode: "home", boardMode: null };
}

export function setHash(mode, boardMode) {
  let next = "#/";
  if ((mode === "scoreboard" || mode === "breakdown") && boardMode) {
    next = `#/${mode}/${boardMode}`;
  } else if (mode === "scoreboard") next = "#/scoreboard";
  else if (mode !== "home") next = `#/${mode}`;
  if (location.hash !== next) location.hash = next;
}

export function bindHash(onRoute) {
  window.addEventListener("hashchange", () => onRoute(readHash()));
}
