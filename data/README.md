# data

`countries.js` is the quiz and HUD country list: name, capital, flag, region, and capital lat/lng.

`countries.geojson` is Natural Earth 110m country outlines, used for map fills and closest-point distance.

The map loads this local file first, then falls back to the Natural Earth URL if needed.
