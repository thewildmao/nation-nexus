import { PLAYABLE_MODES } from "../shared/run.js";

const SCREENS = new Set(["home", "map", "flags", "capitals", "study", "scoreboard", "breakdown", "how"]);

export function readHash() {
  const raw = (location.hash || "#/").replace(/^#/, "");
  const path = raw.replace(/\/+$/, "") || "/";
  if (path === "/") return { mode: "home", boardMode: null };
  const parts = path.replace(/^\//, "").split("/").filter(Boolean);
  if (parts[0] === "how") {
    const boardMode = PLAYABLE_MODES.includes(parts[1]) ? parts[1] : null;
    return { mode: "how", boardMode };
  }
  if (parts[0] === "scoreboard") {
    const boardMode = PLAYABLE_MODES.includes(parts[1]) ? parts[1] : null;
    return { mode: "scoreboard", boardMode };
  }
  if (parts[0] === "breakdown") {
    const boardMode = PLAYABLE_MODES.includes(parts[1]) ? parts[1] : null;
    const recapAt = parts[2] && /^\d+$/.test(parts[2]) ? Number(parts[2]) : null;
    return { mode: "breakdown", boardMode, recapAt };
  }
  if (parts[0] === "study") {
    let focusName = null;
    if (parts[1]) {
      try {
        focusName = decodeURIComponent(parts.slice(1).join("/"));
      } catch {
        focusName = parts.slice(1).join("/");
      }
    }
    return { mode: "study", boardMode: null, focusName };
  }
  if (SCREENS.has(parts[0])) return { mode: parts[0], boardMode: null };
  return { mode: "home", boardMode: null };
}

export function setHash(mode, boardMode, recapAt) {
  let next = "#/";
  if (mode === "breakdown" && boardMode && recapAt) {
    next = `#/breakdown/${boardMode}/${recapAt}`;
  } else if ((mode === "scoreboard" || mode === "breakdown" || mode === "how") && boardMode) {
    next = `#/${mode}/${boardMode}`;
  } else if (mode === "scoreboard") next = "#/scoreboard";
  else if (mode !== "home") next = `#/${mode}`;
  if (location.hash !== next) location.hash = next;
}

export function bindHash(onRoute) {
  window.addEventListener("hashchange", () => onRoute(readHash()));
}
