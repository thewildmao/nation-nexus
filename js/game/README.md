# js/game

Pure game logic. These files must not touch the DOM or Leaflet.

| File | Role |
|---|---|
| `state.js` | Per-mode runs, current mode, selected countries |
| `settings.js` | Saved hint + repeat-policy toggles |
| `run.js` | Deal the next country, mark asked, points, cycle / miss / once rules |
| `history.js` | Top scores by pool size, career totals |
| `catalog.js` | Look up countries, filter the pool, shuffle |
| `regions.js` | Continent tree and continent colors |
| `geo.js` | Distance and closest-point math |
| `borders.js` | Country outlines used for “how far off” |
| `quiz.js` | Flag / capital rounds |
| `map-round.js` | Map target, country guess, miss, explore flag |
