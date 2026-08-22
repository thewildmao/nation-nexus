import { PLAY_MODES, playBlurb, playLogo, playTitle } from "./identity.js";

function cardHtml(mode) {
  const title = playTitle(mode);
  const logo = playLogo(mode);
  const blurb = playBlurb(mode);
  return `
    <a class="game-card-chip game-card-scores" href="#/scoreboard/${mode}" title="Scoreboard" aria-label="Scoreboard">🥇</a>
    <a class="game-card-chip game-card-help" href="#/how/${mode}" title="How to Play" aria-label="How to Play">?</a>
    <a class="game-card" href="#/${mode}" data-mode="${mode}">
      <div class="game-card-top">
        <img class="game-logo is-card" src="${logo}" alt="${title}" />
        <span class="game-card-badge hidden" data-badge="${mode}">In progress</span>
        <span class="game-card-play" data-status="${mode}">Play</span>
      </div>
      <div class="game-card-body">
        <h2>${title}</h2>
        <p>${blurb}</p>
        <p class="game-card-best" data-best="${mode}">No score yet</p>
        <div class="game-card-progress hidden" data-progress="${mode}">
          <div class="game-card-bar"><span></span></div>
          <span class="game-card-count" data-count="${mode}"></span>
        </div>
        <p class="game-card-meta" data-meta="${mode}"></p>
      </div>
    </a>
  `;
}

export function mountGameCards(host, onPlay) {
  if (!host) return;
  host.replaceChildren();
  PLAY_MODES.forEach((mode) => {
    const wrap = document.createElement("div");
    wrap.className = "game-card-wrap";
    wrap.dataset.card = mode;
    wrap.innerHTML = cardHtml(mode);
    host.append(wrap);
  });
  if (!onPlay) return;
  host.querySelectorAll("a.game-card[data-mode]").forEach((card) => {
    card.addEventListener("click", (e) => {
      e.preventDefault();
      onPlay(card.dataset.mode);
    });
  });
}
