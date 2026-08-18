export const APP_NAME = "Nation Nexus";

const GAMES = {
  map: {
    title: "Nation Needle",
    blurb: "A country is named. Click it on the map.",
    kicker: "Find the country",
  },
  flags: {
    title: "Flag Master",
    blurb: "See a flag. Pick the country.",
    kicker: "Name the flag",
  },
  capitals: {
    title: "Capital Quest",
    blurb: "See a country. Pick its capital.",
    kicker: "Name the capital",
  },
};

const OTHER = {
  study: "Study",
  scoreboard: "Scoreboard",
  breakdown: "Breakdown",
  how: "How to play",
  home: APP_NAME,
};

export function playTitle(mode) {
  if (GAMES[mode]) return GAMES[mode].title;
  return OTHER[mode] || APP_NAME;
}

export function playBlurb(mode) {
  return (GAMES[mode] && GAMES[mode].blurb) || "";
}

export function playKicker(mode) {
  return (GAMES[mode] && GAMES[mode].kicker) || "";
}

export function pageTitle(mode, boardMode) {
  if (mode === "home") return APP_NAME;
  if (mode === "scoreboard" && boardMode) {
    return `${playTitle(boardMode)} scores · ${APP_NAME}`;
  }
  if (mode === "breakdown" && boardMode) {
    return `${playTitle(boardMode)} recap · ${APP_NAME}`;
  }
  return `${playTitle(mode)} · ${APP_NAME}`;
}

export function gameNamesList() {
  return `${playTitle("map")}, ${playTitle("flags")}, and ${playTitle("capitals")}`;
}

export function fillLockup(node, mode, extra = "") {
  if (!node) return;
  const name = extra ? `${playTitle(mode)} ${extra}` : playTitle(mode);
  node.replaceChildren();
  const text = document.createElement("span");
  text.className = "game-lockup-name";
  text.textContent = name;
  node.append(text);
}
