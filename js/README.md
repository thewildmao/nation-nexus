# js

The app is **input → update game state → paint views**.

- `main.js` — scene director: hash pages, clicks → game functions → views
- `game/` — rules and data only. No `document`, no Leaflet
- `view/` — DOM and Leaflet. Read state, draw it

`data/countries.js` is the country list. `styles.css` and `index.html` stay at the root.
