import { indexCountryGeometry } from "../../shared/borders.js";
import { findByGeoName } from "../../shared/catalog.js";
import { JUMP_CONTINENTS, REGION_THEME } from "../../shared/regions.js";
import { fetchCountryOutlines, geoNameOf } from "../../ui/outlines.js";

const L = window.L;

const DEFAULT_CENTER = [20, 10];
const DEFAULT_ZOOM = 2;

const STYLE = {
  land: { fillColor: "#475569", weight: 0.9, color: "#1e293b", fillOpacity: 0.38 },
  dim: { fillColor: "#334155", weight: 0.55, color: "#0f172a", fillOpacity: 0.2 },
  hover: { fillColor: "#38bdf8", weight: 2.2, color: "#7dd3fc", fillOpacity: 0.48 },
  flash: { fillColor: "#38bdf8", weight: 1.6, color: "#7dd3fc", fillOpacity: 0.44 },
  correct: { fillColor: "#22c55e", weight: 2.8, color: "#86efac", fillOpacity: 0.72 },
  wrong: { fillColor: "#ef4444", weight: 2.4, color: "#f87171", fillOpacity: 0.7 },
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
const idleStyleCache = new Map();
let activeNames = null;
let handlers = {
  onCountryClick: () => {},
  onMiss: () => {},
  onExploreSelect: () => {},
  isExplore: () => false,
  isWaiting: () => false,
};

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
  const next = inPool(match) ? STYLE.land : STYLE.dim;
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
    return { fillColor: tone, weight: 1.2, color: tone, fillOpacity: 0.16 };
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

function isOutcome(style) {
  return style === STYLE.correct || style === STYLE.wrong;
}

function hoverStyle(geoName) {
  const match = findByGeoName(geoName);
  const base = revealedResult
    ? styleForGuess(match, geoName, revealedResult)
    : idleStyle(geoName);
  if (isOutcome(base)) {
    return { ...base, weight: (base.weight || 1) + 0.6 };
  }
  return STYLE.hover;
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

function loadCountryPolygons() {
  fetchCountryOutlines()
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
  watchMapSize();
  requestAnimationFrame(() => invalidateSize());
}

function mapWrap() {
  const node = map && map.getContainer();
  return node && node.parentElement;
}

function unlockMapBox() {
  if (!map) return;
  map.getContainer().style.height = "";
}

function lockMapBox() {
  if (!map) return;
  const wrap = mapWrap();
  const height = wrap ? wrap.clientHeight : map.getContainer().clientHeight;
  if (height < 32) return;
  map.getContainer().style.height = `${Math.round(height)}px`;
}

let sizeWatch = null;

function watchMapSize() {
  const wrap = mapWrap();
  if (!wrap || sizeWatch) return;
  sizeWatch = new ResizeObserver(() => {
    invalidateSize();
  });
  sizeWatch.observe(wrap);
}

export function invalidateSize() {
  if (!map) return;
  unlockMapBox();
  lockMapBox();
  map.invalidateSize({ animate: false, pan: false });
}

export function resetCamera() {
  if (!map) return;
  clearJumpFlash(true);
  map.closePopup();
  map.stop();
  map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: true });
}

const JUMP_FALLBACK = {
  "north-america": { center: [48, -100], zoom: 3 },
  central: { center: [15, -78], zoom: 4 },
  "south-america": { center: [-15, -60], zoom: 3 },
  europe: { center: [50, 15], zoom: 4 },
  africa: { center: [5, 20], zoom: 3 },
  asia: { center: [28, 90], zoom: 3 },
  oceania: { center: [-18, 150], zoom: 4 },
};

function jumpMotionReduced() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let flashTimer = 0;
let flashLayers = [];

function layerIsOutcome(geoName) {
  if (!revealedResult) return false;
  return !!outcomeStyle(findByGeoName(geoName), geoName, revealedResult);
}

function restoreJumpLayers(layers) {
  if (stylesLocked) return;
  layers.forEach((layer) => {
    const geoName = geoNameOf(layer);
    if (layerIsOutcome(geoName)) return;
    const match = findByGeoName(geoName);
    layer.setStyle(
      revealedResult ? styleForGuess(match, geoName, revealedResult) : idleStyle(geoName)
    );
  });
}

function clearJumpFlash(restore) {
  window.clearTimeout(flashTimer);
  flashTimer = 0;
  const layers = flashLayers;
  flashLayers = [];
  if (restore) restoreJumpLayers(layers);
}

function flashJump(layers) {
  clearJumpFlash(true);
  if (stylesLocked || !layers.length) return;
  const lit = layers.filter((layer) => !layerIsOutcome(geoNameOf(layer)));
  if (!lit.length) return;
  flashLayers = lit;
  lit.forEach((layer) => layer.setStyle(STYLE.flash));
  const hold = jumpMotionReduced() ? 0 : 350;
  flashTimer = window.setTimeout(() => {
    restoreJumpLayers(flashLayers);
    flashLayers = [];
    flashTimer = 0;
  }, hold);
}

export function jumpToContinent(id) {
  if (!map) return;
  if (!id || id === "world") {
    resetCamera();
    return;
  }
  const jump = JUMP_CONTINENTS.find((item) => item.id === id);
  if (!jump) return;
  map.closePopup();
  map.stop();
  const want = new Set(jump.names);
  const layers = [];
  eachCountry((layer, geoName, match) => {
    const name = match ? match.name : geoName;
    if (want.has(name)) layers.push(layer);
  });
  flashJump(layers);
  if (layers.length) {
    const bounds = L.featureGroup(layers).getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.16), {
        maxZoom: 5,
        animate: !jumpMotionReduced(),
        padding: [28, 28],
      });
      return;
    }
  }
  const fallback = JUMP_FALLBACK[id];
  if (fallback) map.setView(fallback.center, fallback.zoom, { animate: !jumpMotionReduced() });
}

export function clearResult() {
  if (resultLayer) resultLayer.clearLayers();
}

export function resetCountryStyles() {
  clearJumpFlash(false);
  stylesLocked = false;
  revealedResult = null;
  if (!geoJsonLayer) return;
  eachCountry((layer, geoName) => {
    layer.unbindTooltip();
    layer.setStyle(idleStyle(geoName));
  });
}

export function showGuess(result) {
  clearJumpFlash(false);
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
