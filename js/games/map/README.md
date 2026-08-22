# Nation Needle

A country is named. Click it on the map.

| File | Role |
|---|---|
| `rules.js` | Target, country guess, ocean miss, explore flag. No DOM. |
| `view.js` | Leaflet play map. Idle land is muted; color is hover / miss / hit. |
| `hud.js` | Prompt and result copy on the map overlay |
| `session.js` | Start round, apply guess, explore toggle |
| `jumps.js` | Continent jump chips (camera only) |

`pointer-events: none` on `.map-hud` (auto on the corners) so HUD chrome does not steal map clicks.

Jump chips fit a continent and pulse it in accent, then settle. **Next** keeps the camera; World / new run / leaving Explore resets to the world.
