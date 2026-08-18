import { findByGeoName } from "../game/catalog.js";
import { REGION_THEME } from "../game/regions.js";

const L = window.L;

const OUTLINES = [
  "data/countries.geojson",
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson",
];

const DIM = { fillColor: "#334155", weight: 0.6, color: "#1e293b", fillOpacity: 0.28 };
const FOCUS = { fillColor: "#38bdf8", weight: 3.2, color: "#7dd3fc", fillOpacity: 0.78 };

let map = null;
let geoLayer = null;
let marker = null;
let ready = null;
let focusName = null;
let focusCountry = null;
let onSelect = () => {};
let resizeWatch = null;

function geoNameOf(featureOrLayer) {
  const props = featureOrLayer.properties || featureOrLayer.feature?.properties || {};
  return props.ADMIN || props.name || "Unknown";
}

function loadOutlines() {
  const tryUrl = (i) =>
    fetch(OUTLINES[i])
      .then((res) => {
        if (!res.ok) throw new Error(`Outlines failed: ${res.status}`);
        return res.json();
      })
      .catch((err) => {
        if (i + 1 < OUTLINES.length) return tryUrl(i + 1);
        throw err;
      });
  return tryUrl(0);
}

function isFocus(geoName) {
  if (!focusName) return false;
  const match = findByGeoName(geoName);
  if (match && match.name === focusName) return true;
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
  if (!map || !country) return;
  if (marker) {
    map.removeLayer(marker);
    marker = null;
  }
  marker = L.circleMarker([country.lat, country.lng], {
    radius: 5,
    color: "#f1f5f9",
    fillColor: "#38bdf8",
    fillOpacity: 1,
    weight: 2,
  })
    .bindPopup(
      `<span class="popup-flag">${country.flag}</span><strong>${country.name}</strong><br>Capital: ${country.capital}`,
      { className: "glass-popup" }
    )
    .addTo(map);
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

function layoutMap() {
  if (!map) return;
  map.invalidateSize({ animate: false });
  fitCountry(focusCountry);
}

function watchSize() {
  const node = document.getElementById("countryMap");
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
    const match = findByGeoName(geoName);
    if (match) onSelect(match.name);
  });
}

export function initCountryMap(select) {
  if (select) onSelect = select;
  if (map || !document.getElementById("countryMap")) return;

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
