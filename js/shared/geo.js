const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function distanceKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function project(point, originLat) {
  const scale = Math.cos(toRad(originLat));
  return { x: point.lng * scale, y: point.lat };
}

export function closestPointOnSegment(p, a, b) {
  const originLat = (a.lat + b.lat) / 2;
  const P = project(p, originLat);
  const A = project(a, originLat);
  const B = project(b, originLat);
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return { lat: a.lat, lng: a.lng };

  const t = Math.max(0, Math.min(1, ((P.x - A.x) * dx + (P.y - A.y) * dy) / len2));
  const scale = Math.cos(toRad(originLat)) || 1;
  return { lat: A.y + t * dy, lng: (A.x + t * dx) / scale };
}

export function pointInRing(p, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yi = ring[i].lat;
    const xi = ring[i].lng;
    const yj = ring[j].lat;
    const xj = ring[j].lng;
    const crosses = yi > p.lat !== yj > p.lat;
    if (crosses && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function eachEdge(ring, fn) {
  const n = ring.length;
  if (n < 2) return;
  const closed = ring[0].lat === ring[n - 1].lat && ring[0].lng === ring[n - 1].lng;
  const last = closed ? n - 1 : n;
  for (let i = 0; i < last; i++) {
    fn(ring[i], ring[(i + 1) % n]);
  }
}

export function closestPointOnRing(p, ring) {
  let best = null;
  let bestKm = Infinity;
  eachEdge(ring, (a, b) => {
    const hit = closestPointOnSegment(p, a, b);
    const km = distanceKm(p.lat, p.lng, hit.lat, hit.lng);
    if (km < bestKm) {
      bestKm = km;
      best = hit;
    }
  });
  return best ? { point: best, km: bestKm } : null;
}

function allRings(polygons) {
  const rings = [];
  polygons.forEach((poly) => {
    rings.push(poly.outer);
    poly.holes.forEach((hole) => rings.push(hole));
  });
  return rings;
}

export function pointInPolygons(p, polygons) {
  return polygons.some((poly) => {
    if (!pointInRing(p, poly.outer)) return false;
    return !poly.holes.some((hole) => pointInRing(p, hole));
  });
}

export function closestPointOnPolygons(p, polygons) {
  if (pointInPolygons(p, polygons)) {
    return { point: { lat: p.lat, lng: p.lng }, km: 0 };
  }

  let best = null;
  allRings(polygons).forEach((ring) => {
    const hit = closestPointOnRing(p, ring);
    if (hit && (!best || hit.km < best.km)) best = hit;
  });
  return best;
}

function sampleRing(ring, fn) {
  const step = ring.length > 800 ? Math.ceil(ring.length / 800) : 1;
  for (let i = 0; i < ring.length; i += step) fn(ring[i]);
}

function eachVertex(polygons, fn) {
  polygons.forEach((poly) => {
    sampleRing(poly.outer, fn);
    poly.holes.forEach((hole) => sampleRing(hole, fn));
  });
}

export function closestBetweenPolygons(polygonsA, polygonsB) {
  let best = null;

  const consider = (from, to, km) => {
    if (!best || km < best.km) best = { from, to, km };
  };

  eachVertex(polygonsA, (vertex) => {
    if (pointInPolygons(vertex, polygonsB)) {
      consider(vertex, vertex, 0);
      return;
    }
    const hit = closestPointOnPolygons(vertex, polygonsB);
    if (hit) consider(vertex, hit.point, hit.km);
  });

  if (best && best.km === 0) return best;

  eachVertex(polygonsB, (vertex) => {
    if (pointInPolygons(vertex, polygonsA)) {
      consider(vertex, vertex, 0);
      return;
    }
    const hit = closestPointOnPolygons(vertex, polygonsA);
    if (hit) consider(hit.point, vertex, hit.km);
  });

  return best;
}
