# js/shared

Game rules used by every minigame. These files must not import `js/ui`, `js/games/*/view.js`, or touch the DOM.

| File | Role |
|---|---|
| `state.js` | Per-mode runs, current mode, selected countries |
| `run.js` | Deal, points, streak, clock, finish |
| `settings.js` | Per-mode hint / answer style / repeat policy |
| `catalog.js` | Look up countries, filter the pool |
| `regions.js` | Continent tree, common sets, region colors |
| `pool.js` | Persist the selected country set |
| `history.js` | Scoreboard persistence |
| `combo.js` | Streak callouts |
| `prefs.js` | Sound on/off and volume |
| `geo.js` / `borders.js` | Distance for “how far off” |
| `score-copy.js` | Player-facing score lines |
| `text.js` | Shared `normalize()` for type-in and study search |

Scoring constants stay in `run.js`. Persistence keys stay `countryLearner.*`.
