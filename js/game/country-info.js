import { countries } from "../../data/countries.js";
import { getCountry } from "./catalog.js";
import { distanceKm } from "./geo.js";
import { pathForCountry, REGION_THEME } from "./regions.js";

function formatKm(km) {
  const rounded = Math.round(km);
  if (rounded >= 1000) return `${rounded.toLocaleString("en-US")} km`;
  return `${rounded} km`;
}

function closestCapital(country) {
  let best = null;
  countries.forEach((other) => {
    if (other.name === country.name) return;
    const km = distanceKm(country.lat, country.lng, other.lat, other.lng);
    if (!best || km < best.km) best = { country: other, km };
  });
  return best;
}

function funFacts(country, subregion, neighborNames) {
  const facts = [];
  const ns = country.lat >= 0 ? "N" : "S";
  const ew = country.lng >= 0 ? "E" : "W";
  facts.push(
    `${country.capital} sits at ${Math.abs(country.lat).toFixed(1)}°${ns}, ${Math.abs(country.lng).toFixed(1)}°${ew}.`
  );

  const equatorKm = Math.round(Math.abs(country.lat) * 111.32);
  if (equatorKm < 250) {
    facts.push(`${country.capital} is almost on the equator — about ${formatKm(equatorKm)} away.`);
  } else {
    facts.push(
      `About ${formatKm(equatorKm)} ${country.lat >= 0 ? "north" : "south"} of the equator.`
    );
  }

  const near = closestCapital(country);
  if (near) {
    facts.push(
      `Closest capital in this set: ${near.country.capital} (${near.country.name}), ${formatKm(near.km)} away.`
    );
  }

  if (subregion && neighborNames.length) {
    const group = [country, ...neighborNames.map(getCountry).filter(Boolean)];
    const byLat = [...group].sort((a, b) => b.lat - a.lat);
    const rank = byLat.findIndex((item) => item.name === country.name) + 1;
    if (rank === 1) facts.push(`Northernmost capital in ${subregion}.`);
    else if (rank === byLat.length) facts.push(`Southernmost capital in ${subregion}.`);
  }

  return facts;
}

export function countryProfile(name) {
  const country = getCountry(name);
  if (!country) return null;
  const path = pathForCountry(country.name);
  const neighbors = path?.subregion
    ? path.subregion.countries.filter((other) => other !== country.name)
    : [];
  return {
    country,
    continent: path?.continent?.label || country.region,
    subregion: path?.subregion?.label || null,
    neighbors,
    theme: REGION_THEME[country.region] || null,
    fun: funFacts(country, path?.subregion?.label || null, neighbors),
  };
}

export function studyHref(name) {
  return `#/study/${encodeURIComponent(name)}`;
}
