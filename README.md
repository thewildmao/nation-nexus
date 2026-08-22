# Nation Nexus

A local geography quiz: **Nation Needle** (click the country), **Flag Master**, and **Capital Quest**, plus a study atlas.

## Run

```
python3 -m http.server 8080
```

Open `http://localhost:8080`. After CSS or JS changes, hard-refresh (`Cmd+Shift+R`).

Map tiles need internet. Quizzes work offline once the page has loaded.

## Architecture

**Input → update game state → paint views.** Rules files never touch `document` or Leaflet.

| Path | Role |
|---|---|
| `js/main.js` | Boot, hash routing, recap timer |
| `js/shared/` | Scoring, catalog, settings, persistence |
| `js/ui/` | Shared chrome: overlays, score dock, locator map |
| `js/games/map/` | Nation Needle |
| `js/games/quiz/` | Flag Master + Capital Quest (one engine) |
| `js/games/study/` | Atlas |
| `js/shell/` | Home, how-to, scoreboard, recap |
| `css/` | Tokens, then one file per surface |
| `data/` | Country list + GeoJSON outlines |

Hashes: `#/`, `#/map`, `#/flags`, `#/capitals`, `#/study`, `#/how`, `#/scoreboard`, `#/breakdown`.

Scores live in `localStorage` under `countryLearner.*`. Do not rename those keys.
