export const APP_NAME = "Nation Nexus";
export const APP_LOGO = "assets/main_game_logo.png";

const GAMES = {
  map: {
    title: "Nation Needle",
    logo: "assets/nation_needle.png",
    blurb: "A country is named. Click it on the map.",
    kicker: "Find the country",
  },
  flags: {
    title: "Flag Master",
    logo: "assets/flag_master.png",
    blurb: "See a flag. Pick the country.",
    kicker: "Name the flag",
  },
  capitals: {
    title: "Capital Quest",
    logo: "assets/capital_quest.png",
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

export function playLogo(mode) {
  if (mode === "home") return APP_LOGO;
  return (GAMES[mode] && GAMES[mode].logo) || "";
}

export function playBlurb(mode) {
  return (GAMES[mode] && GAMES[mode].blurb) || "";
}

export function playKicker(mode) {
  return (GAMES[mode] && GAMES[mode].kicker) || "";
}

export function pageTitle(mode, boardMode) {
  if (mode === "home") return APP_NAME;
  if (mode === "how" && boardMode) {
    return `${playTitle(boardMode)} · How to play · ${APP_NAME}`;
  }
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

export function logoImg(mode, className = "game-logo") {
  const src = playLogo(mode);
  if (!src) return null;
  const img = document.createElement("img");
  img.src = src;
  img.alt = playTitle(mode);
  img.className = className;
  img.decoding = "async";
  return img;
}

export function fillLockup(node, mode, extra = "") {
  if (!node) return;
  let logoClass = "game-logo is-chrome";
  if (node.classList.contains("is-pick")) logoClass = "game-logo is-pick";
  else if (node.classList.contains("is-guide")) logoClass = "game-logo is-guide";
  else if (node.classList.contains("is-recap")) logoClass = "game-logo is-recap";
  else if (node.classList.contains("is-settings")) logoClass = "game-logo is-settings";
  const key = `${mode}|${extra}|${logoClass}`;
  if (node.dataset.lockup === key && node.querySelector("img, .game-lockup-name")) return;
  node.dataset.lockup = key;
  node.replaceChildren();
  const img = logoImg(mode, logoClass);
  if (img) {
    node.append(img);
    if (extra) {
      const cap = document.createElement("span");
      cap.className = "game-lockup-extra";
      cap.textContent = extra;
      node.append(cap);
    }
    return;
  }
  const text = document.createElement("span");
  text.className = "game-lockup-name";
  text.textContent = extra ? `${playTitle(mode)} ${extra}` : playTitle(mode);
  node.append(text);
}
