import { findByGeoName } from "../shared/catalog.js";
import { REGION_THEME } from "../shared/regions.js";
import { fetchCountryOutlines, geoNameOf } from "./outlines.js";

const L = window.L;

const DIM = { fillColor: "#334155", weight: 0.6, color: "#1e293b", fillOpacity: 0.28 };
const FOCUS = { fillColor: "#38bdf8", weight: 3.2, color: "#7dd3fc", fillOpacity: 0.78 };

let map = null;
let geoLayer = null;
let marker = null;
let ready = null;
let focusName = null;
let focusCountry = null;
let onSelect = null;
let resizeWatch = null;

function loadOutlines() {
  return fetchCountryOutlines();
}

function isFocus(geoName) {
  if (!focusName) return false;
  const match = findByGeoName(geoName);
  if (match) return match.name === focusName;
  const n = (geoName || "").toLowerCase();
  const target = focusName.toLowerCase();
  return n === target || n.includes(target) || target.includes(n);
}

function styleFor(geoName) {
  if (isFocus(geoName)) {
    const match = findByGeoName(geoName);
    const tone = (match && REGION_THEME[match.region]) || FOCUS.color;
    return { ...FOCUS, color: tone, fillColor: tone };
  }
  return DIM;
}

function paint() {
  if (!geoLayer) return;
  geoLayer.eachLayer((layer) => {
    layer.setStyle(styleFor(geoNameOf(layer)));
  });
}

function focusLayers() {
  const found = [];
  if (!geoLayer) return found;
  geoLayer.eachLayer((layer) => {
    if (isFocus(geoNameOf(layer))) found.push(layer);
  });
  return found;
}

function placeMarker(country) {
  if (marker) {
    map.removeLayer(marker);
    marker = null;
  }
  if (!map || !country) return;
  marker = L.circleMarker([country.lat, country.lng], {
    radius: 5,
    color: "#f1f5f9",
    fillColor: "#38bdf8",
    fillOpacity: 1,
    weight: 2,
    interactive: !!onSelect,
  }).addTo(map);
  if (onSelect) {
    marker.bindPopup(
      `<span class="popup-flag">${country.flag}</span><strong>${country.name}</strong><br>Capital: ${country.capital}`,
      { className: "glass-popup" }
    );
  }
}

function fitCountry(country) {
  if (!map) return;
  const layers = focusLayers();
  if (layers.length) {
    const group = L.featureGroup(layers);
    const bounds = group.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.28), { maxZoom: 6, animate: false, padding: [24, 24] });
      return;
    }
  }
  if (country) map.setView([country.lat, country.lng], 5, { animate: false });
}

function mapNode() {
  return document.getElementById("countryMap");
}

function mapSized() {
  const node = mapNode();
  return !!(node && node.clientWidth >= 2 && node.clientHeight >= 2);
}

function layoutMap() {
  if (!map || !mapSized()) return;
  map.invalidateSize({ animate: false });
  fitCountry(focusCountry);
}

function watchSize() {
  const node = mapNode();
  if (!node || resizeWatch || typeof ResizeObserver !== "function") return;
  let tick = 0;
  resizeWatch = new ResizeObserver(() => {
    if (!map || !focusCountry) return;
    window.cancelAnimationFrame(tick);
    tick = window.requestAnimationFrame(() => layoutMap());
  });
  resizeWatch.observe(node);
}

function bindLayer(layer, geoName) {
  layer.on("click", (e) => {
    L.DomEvent.stopPropagation(e);
    if (!onSelect) return;
    const match = findByGeoName(geoName);
    if (match) onSelect(match.name);
  });
}

export function initCountryMap() {
  if (map || !mapNode() || !L) return;

  map = L.map("countryMap", {
    center: [20, 10],
    zoom: 2,
    minZoom: 1,
    maxZoom: 8,
    worldCopyJump: true,
    zoomControl: false,
    attributionControl: false,
  });
  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(map);

  ready = loadOutlines()
    .then((data) => {
      geoLayer = L.geoJSON(data, {
        renderer: L.canvas({ padding: 0.5 }),
        style: (feature) => styleFor(geoNameOf(feature)),
        onEachFeature: (feature, layer) => bindLayer(layer, geoNameOf(feature)),
      }).addTo(map);
    })
    .catch((err) => {
      console.warn("Could not load country outlines:", err);
    });
}

export function attachCountryMap(host, options = {}) {
  const wrap = document.getElementById("countryMapWrap");
  if (!host || !wrap) return;
  onSelect = typeof options.onSelect === "function" ? options.onSelect : null;
  if (wrap.parentElement !== host) host.appendChild(wrap);
  initCountryMap();
  watchSize();
  window.requestAnimationFrame(() => layoutMap());
}

export function showCountryOnMap(country) {
  initCountryMap();
  watchSize();
  focusCountry = country || null;
  focusName = country ? country.name : null;
  const go = () => {
    paint();
    placeMarker(country);
    layoutMap();
    window.requestAnimationFrame(() => layoutMap());
  };
  if (ready) ready.then(go);
  else go();
}
