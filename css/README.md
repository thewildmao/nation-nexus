# css

No bundler. `index.html` links these in order. Tokens first.

| File | Role |
|---|---|
| `tokens.css` | `:root` colors and glass |
| `base.css` | Body, aurora, container, `.hidden` |
| `home.css` | Hub cards |
| `chrome.css` | Play header, score dock, streak |
| `overlays.css` | Settings, confirm, filter, recap, how-to, scoreboard |
| `quiz.css` | Flag / capital card |
| `map.css` | Nation Needle + Leaflet |
| `study.css` | Atlas grid and country page |
| `motion.css` | Keyframes and `prefers-reduced-motion` |

Bump the `?v=` on every link in `index.html` when CSS changes.
