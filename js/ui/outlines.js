const URLS = [
  "data/countries.geojson",
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson",
];

export function geoNameOf(featureOrLayer) {
  const props = featureOrLayer.properties || featureOrLayer.feature?.properties || {};
  return props.ADMIN || props.name || "Unknown";
}

export function fetchCountryOutlines() {
  const tryUrl = (i) => {
    const ctrl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = ctrl ? window.setTimeout(() => ctrl.abort(), 8000) : 0;
    return fetch(URLS[i], ctrl ? { signal: ctrl.signal } : undefined)
      .then((res) => {
        if (!res.ok) throw new Error(`Outlines failed: ${res.status}`);
        return res.json();
      })
      .finally(() => window.clearTimeout(timer))
      .catch((err) => {
        if (i + 1 < URLS.length) return tryUrl(i + 1);
        throw err;
      });
  };
  return tryUrl(0);
}
