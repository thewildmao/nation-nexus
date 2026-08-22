# js

Vanilla ES modules. No bundler.

- `main.js` — hash → session. Recap delay and “new game / exit” live here.
- `shared/` — pure rules. No DOM, no Leaflet.
- `ui/` — DOM modules used by more than one screen.
- `games/` — one folder per minigame. `rules.js` never imports a view.
- `shell/` — home, how-to, scoreboard, recap.

Flag Master and Capital Quest share `games/quiz`. Identity (title, logo, prompt) comes from `ui/identity.js`.
