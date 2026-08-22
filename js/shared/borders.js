import { findByGeoName } from "./catalog.js";
import { closestBetweenPolygons, closestPointOnPolygons, distanceKm } from "./geo.js";

const rawByName = new Map();
const polygonsByName = new Map();

function coordToPoint(coord) {
  return { lat: coord[1], lng: coord[0] };
}

function ringFromCoords(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return [];
  return ring.filter((coord) => Array.isArray(coord) && coord.length >= 2).map(coordToPoint);
}

function polygonFromCoords(coords) {
  if (!Array.isArray(coords) || !coords.length) return null;
  const outer = ringFromCoords(coords[0]);
  if (outer.length < 3) return null;
  return {
    outer,
    holes: coords.slice(1).map(ringFromCoords).filter((ring) => ring.length >= 3),
  };
}

function geometryToPolygons(geometry) {
  if (!geometry || !geometry.coordinates) return [];
  if (geometry.type === "Polygon") {
    const poly = polygonFromCoords(geometry.coordinates);
    return poly ? [poly] : [];
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map(polygonFromCoords).filter(Boolean);
  }
  return [];
}

export function indexCountryGeometry(geoName, geometry) {
  try {
    const match = findByGeoName(geoName);
    if (!match || !geometry) return;
    const prev = rawByName.get(match.name) || [];
    prev.push(geometry);
    rawByName.set(match.name, prev);
  } catch (err) {
    console.warn("Skipped country outline", geoName, err);
  }
}

export function polygonsFor(name) {
  if (polygonsByName.has(name)) return polygonsByName.get(name);
  const raw = rawByName.get(name) || [];
  const next = [];
  raw.forEach((geometry) => {
    geometryToPolygons(geometry).forEach((poly) => next.push(poly));
  });
  polygonsByName.set(name, next);
  return next;
}

function fallbackMeasure(from, target) {
  const to = { lat: target.lat, lng: target.lng };
  return {
    from,
    to,
    km: distanceKm(from.lat, from.lng, to.lat, to.lng),
  };
}

export function measureToCountry(fromPoint, target) {
  const polygons = polygonsFor(target.name);
  if (!polygons.length) return fallbackMeasure(fromPoint, target);

  const hit = closestPointOnPolygons(fromPoint, polygons);
  if (!hit) return fallbackMeasure(fromPoint, target);
  return { from: fromPoint, to: hit.point, km: hit.km };
}

export function measureBetweenCountries(guessed, target, clickPoint) {
  const a = polygonsFor(guessed.name);
  const b = polygonsFor(target.name);
  if (!a.length || !b.length) {
    return measureToCountry(clickPoint || { lat: guessed.lat, lng: guessed.lng }, target);
  }

  const hit = closestBetweenPolygons(a, b);
  if (!hit) return measureToCountry(clickPoint || { lat: guessed.lat, lng: guessed.lng }, target);
  return { from: hit.from, to: hit.to, km: hit.km };
}
