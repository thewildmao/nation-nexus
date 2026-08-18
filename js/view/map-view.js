import { indexCountryGeometry } from "../game/borders.js";
import { findByGeoName } from "../game/catalog.js";
import { REGION_THEME } from "../game/regions.js";

const L = window.L;

const DEFAULT_CENTER = [20, 10];
const DEFAULT_ZOOM = 2;

const PALETTE = [
  "#f5c542",
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#a855f7",
  "#f97316",
];

const STYLE = {
  dim: { fillColor: "#334155", weight: 0.6, color: "#1e293b", fillOpacity: 0.35 },
  correct: { fillColor: "#4ade80", weight: 4, color: "#bbf7d0", fillOpacity: 0.92 },
  wrong: { fillColor: "#ef4444", weight: 3, color: "#dc2626", fillOpacity: 0.85 },
};

const MARKER = {
  correct: { radius: 4, color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.95, weight: 2 },
  wrong: { radius: 4, color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.95, weight: 2 },
};

let map = null;
let resultLayer = null;
let geoJsonLayer = null;
let labelsLayer = null;
let stylesLocked = false;
let revealedResult = null;
const fillByName = new Map();
const idleStyleCache = new Map();
let activeNames = null;
let handlers = {
  onCountryClick: () => {},
  onMiss: () => {},
  onExploreSelect: () => {},
  isExplore: () => false,
  isWaiting: () => false,
};

function countryColor(name) {
  if (fillByName.has(name)) return fillByName.get(name);
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function boundsArea(layer) {
  const b = layer.getBounds();
  if (!b || !b.isValid()) return 0;
  return (b.getNorth() - b.getSouth()) * (b.getEast() - b.getWest());
}

function boundsTouch(a, b) {
  const A = a.getBounds();
  const B = b.getBounds();
  if (!A || !B || !A.isValid() || !B.isValid()) return false;
  return A.pad(0.02).intersects(B);
}

function assignNeighborColors() {
  if (!geoJsonLayer) return;
  fillByName.clear();

  const layers = [];
  geoJsonLayer.eachLayer((layer) => layers.push(layer));
  layers.sort((a, b) => boundsArea(b) - boundsArea(a));

  const indexByName = new Map();

  layers.forEach((layer) => {
    const name = geoNameOf(layer);
    if (indexByName.has(name)) return;

    const used = new Set();
    layers.forEach((other) => {
      if (other === layer) return;
      const otherName = geoNameOf(other);
      if (!indexByName.has(otherName)) return;
      if (boundsTouch(layer, other)) used.add(indexByName.get(otherName));
    });

    let idx = 0;
    while (used.has(idx) && idx < PALETTE.length - 1) idx += 1;
    indexByName.set(name, idx);
    fillByName.set(name, PALETTE[idx]);
  });
}

function geoNameOf(featureOrLayer) {
  const props = featureOrLayer.properties || featureOrLayer.feature?.properties || {};
  return props.ADMIN || props.name || "Unknown";
}

function inPool(match) {
  if (!activeNames) return true;
  return !!(match && activeNames.has(match.name));
}

export function setActivePool(names) {
  activeNames = names ? new Set(names) : null;
  idleStyleCache.clear();
  if (geoJsonLayer && !stylesLocked) resetCountryStyles();
}

function idleStyle(name) {
  const key = `${activeNames ? activeNames.size : "*"}|${name}`;
  const cached = idleStyleCache.get(key);
  if (cached) return cached;
  const match = findByGeoName(name);
  const next = !inPool(match)
    ? STYLE.dim
    : {
        fillColor: countryColor(name),
        weight: match ? 3.2 : 0.6,
        opacity: 1,
        color: match ? REGION_THEME[match.region] || "#94a3b8" : "#1e293b",
        fillOpacity: 0.66,
      };
  idleStyleCache.set(key, next);
  return next;
}

function namesAlign(match, geoName, country) {
  if (!country) return false;
  if (match && match.name === country.name) return true;
  const n = (geoName || "").toLowerCase();
  const target = country.name.toLowerCase();
  return n === target || n.includes(target) || target.includes(n);
}

function outcomeStyle(match, geoName, result) {
  if (!result) return null;
  if (namesAlign(match, geoName, result.target)) return STYLE.correct;
  if (
    !result.isCorrect &&
    namesAlign(match, geoName, result.guessed)
  ) {
    return STYLE.wrong;
  }
  return null;
}

function styleForGuess(match, geoName, result) {
  if (!result) return idleStyle(geoName);
  const outcome = outcomeStyle(match, geoName, result);
  if (outcome) return outcome;
  if (match && inPool(match) && match.region === result.target.region) {
    const tone = REGION_THEME[match.region] || "#fbbf24";
    return { fillColor: tone, weight: 2.6, color: tone, fillOpacity: 0.28 };
  }
  return STYLE.dim;
}

function styleForExplore(match, geoName, result) {
  return outcomeStyle(match, geoName, result) || idleStyle(geoName);
}

function featureStyle(feature) {
  const geoName = geoNameOf(feature);
  const match = findByGeoName(geoName);
  if (revealedResult) return styleForGuess(match, geoName, revealedResult);
  return idleStyle(geoName);
}

function eachCountry(fn) {
  if (!geoJsonLayer) return;
  geoJsonLayer.eachLayer((layer) => {
    const geoName = geoNameOf(layer);
    fn(layer, geoName, findByGeoName(geoName));
  });
}

function applyLayerStyles(styleFn, lockStyles) {
  if (!geoJsonLayer) return;
  stylesLocked = lockStyles;
  eachCountry((layer, geoName, match) => {
    layer.setStyle(styleFn(match, geoName));
  });
}

function countryPopupHtml(country, fallbackName = "") {
  return `
    <span class="popup-flag">${country ? country.flag : "🏳️"}</span>
    <strong>${country ? country.name : fallbackName}</strong><br>
    Capital: ${country ? country.capital : "—"}
    ${country ? `<br><small style="color:var(--muted)">${country.region}</small>` : ""}
  `;
}

function addCorrectMarker(target, at) {
  const pos = at || { lat: target.lat, lng: target.lng };
  return L.circleMarker([pos.lat, pos.lng], MARKER.correct)
    .bindPopup(countryPopupHtml(target), { className: "glass-popup" })
    .addTo(resultLayer);
}

function addWrongMarker(from) {
  L.circleMarker([from.lat, from.lng], MARKER.wrong).addTo(resultLayer);
}

function addGuessLine(from, to, km) {
  L.polyline(
    [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ],
    {
      color: km < 800 ? "#fbbf24" : "#ef4444",
      weight: 3,
      dashArray: "8 6",
      opacity: 0.9,
    }
  ).addTo(resultLayer);
}

function openExplorePopup(layer, geoName) {
  layer
    .bindPopup(countryPopupHtml(findByGeoName(geoName), geoName), {
      className: "glass-popup",
    })
    .openPopup();
}

function hoverStyle(geoName) {
  const match = findByGeoName(geoName);
  const base = revealedResult
    ? styleForGuess(match, geoName, revealedResult)
    : idleStyle(geoName);
  return {
    ...base,
    weight: (base.weight || 1) + 1.1,
    fillOpacity: Math.min((base.fillOpacity || 0.66) + 0.12, 0.88),
  };
}

function bindCountryLayer(layer, geoName) {
  layer.on({
    mouseover: (e) => {
      if (stylesLocked) return;
      e.target.setStyle(hoverStyle(geoName));
    },
    mouseout: (e) => {
      if (stylesLocked) return;
      if (geoJsonLayer) geoJsonLayer.resetStyle(e.target);
    },
    click: (e) => {
      L.DomEvent.stopPropagation(e);
      if (handlers.isExplore()) {
        if (handlers.onExploreSelect) handlers.onExploreSelect(geoName);
        openExplorePopup(layer, geoName);
        return;
      }
      if (handlers.isWaiting()) handlers.onCountryClick(geoName, e.latlng);
    },
  });
}

const COUNTRY_OUTLINES = [
  "data/countries.geojson",
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson",
];

function fetchFirstJson(urls) {
  const tryUrl = (i) => {
    const ctrl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = ctrl ? window.setTimeout(() => ctrl.abort(), 8000) : 0;
    return fetch(urls[i], ctrl ? { signal: ctrl.signal } : undefined)
      .then((r) => {
        if (!r.ok) throw new Error(`Outlines failed: ${r.status}`);
        return r.json();
      })
      .finally(() => window.clearTimeout(timer))
      .catch((err) => {
        if (i + 1 < urls.length) return tryUrl(i + 1);
        throw err;
      });
  };
  return tryUrl(0);
}

function loadCountryPolygons() {
  fetchFirstJson(COUNTRY_OUTLINES)
    .then((data) => {
      geoJsonLayer = L.geoJSON(data, {
        renderer: L.canvas({ padding: 0.5 }),
        style: featureStyle,
        onEachFeature: (feature, layer) => {
          const geoName = geoNameOf(feature);
          indexCountryGeometry(geoName, feature.geometry);
          bindCountryLayer(layer, geoName);
        },
      }).addTo(map);
      assignNeighborColors();
      idleStyleCache.clear();
      geoJsonLayer.setStyle(featureStyle);
      invalidateSize();
    })
    .catch((err) => {
      console.warn("Could not load country polygons:", err);
    });
}

export function initMap(callbacks) {
  handlers = { ...handlers, ...callbacks };
  if (map) return;

  map = L.map("map", {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    minZoom: 2,
    maxZoom: 8,
    worldCopyJump: true,
    zoomControl: false,
    fadeAnimation: false,
  });
  L.control.zoom({ position: "bottomleft" }).addTo(map);
  if (map.attributionControl) map.attributionControl.setPosition("bottomleft");

  map.createPane("mapLabels");
  map.getPane("mapLabels").style.zIndex = 650;
  map.getPane("mapLabels").style.pointerEvents = "none";

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
    updateWhenIdle: true,
    keepBuffer: 1,
  }).addTo(map);
  window.addEventListener("resize", () => invalidateSize());

  resultLayer = L.layerGroup().addTo(map);
  map.on("click", (e) => {
    if (handlers.isExplore() || !handlers.isWaiting()) return;
    handlers.onMiss(e.latlng);
  });
  loadCountryPolygons();
}

function unlockMapBox() {
  if (!map) return;
  map.getContainer().style.height = "";
}

function lockMapBox() {
  if (!map) return;
  const node = map.getContainer();
  const height = node.clientHeight;
  if (height < 32) return;
  node.style.height = `${Math.round(height)}px`;
}

export function invalidateSize() {
  if (!map) return;
  unlockMapBox();
  map.invalidateSize({ animate: false, pan: false });
  lockMapBox();
}

export function resetCamera() {
  if (!map) return;
  map.closePopup();
  map.stop();
  map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: false });
}

export function clearResult() {
  if (resultLayer) resultLayer.clearLayers();
}

export function resetCountryStyles() {
  stylesLocked = false;
  revealedResult = null;
  if (!geoJsonLayer) return;
  eachCountry((layer, geoName) => {
    layer.unbindTooltip();
    layer.setStyle(idleStyle(geoName));
  });
}

export function showGuess(result) {
  clearResult();
  revealedResult = result;
  applyLayerStyles((match, geoName) => styleForGuess(match, geoName, result), true);
  const marker = addCorrectMarker(result.target, result.isCorrect ? null : result.to);
  if (!result.isCorrect) {
    addWrongMarker(result.from);
    if (result.to && result.distanceKm >= 1) {
      addGuessLine(result.from, result.to, result.distanceKm);
    }
  }
  marker.openPopup();
}

function setMapLabels(on) {
  if (!map) return;
  if (on) {
    if (!labelsLayer) {
      labelsLayer = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
        {
          pane: "mapLabels",
          subdomains: "abcd",
          maxZoom: 19,
          opacity: 0.95,
        }
      );
    }
    if (!map.hasLayer(labelsLayer)) labelsLayer.addTo(map);
    return;
  }
  if (labelsLayer && map.hasLayer(labelsLayer)) map.removeLayer(labelsLayer);
}

export function enterExplore(result) {
  stylesLocked = false;
  if (result) {
    applyLayerStyles((match, geoName) => styleForExplore(match, geoName, result), false);
  } else {
    resetCountryStyles();
  }
  setMapLabels(true);
}

export function exitExplore() {
  setMapLabels(false);
}
