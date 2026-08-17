import { countries } from "../../data/countries.js";

const GEO_ALIASES = {
  "united states of america": "United States",
  usa: "United States",
  "united states": "United States",
  "russian federation": "Russia",
  "czech republic": "Czechia",
  czechia: "Czechia",
  "republic of korea": "South Korea",
  korea: "South Korea",
  "democratic people's republic of korea": "North Korea",
  "north korea": "North Korea",
  "iran (islamic republic of)": "Iran",
  "syrian arab republic": "Syria",
  "lao people's democratic republic": "Laos",
  "viet nam": "Vietnam",
  "brunei darussalam": "Brunei",
  "tanzania, united republic of": "Tanzania",
  "united republic of tanzania": "Tanzania",
  congo: "Congo",
  "republic of the congo": "Congo",
  "democratic republic of the congo": "Democratic Republic of the Congo",
  "dr congo": "Democratic Republic of the Congo",
  "bolivia (plurinational state of)": "Bolivia",
  "venezuela (bolivarian republic of)": "Venezuela",
  "moldova, republic of": "Moldova",
  "republic of moldova": "Moldova",
  "north macedonia": "North Macedonia",
  "the former yugoslav republic of macedonia": "North Macedonia",
  "bosnia and herzegovina": "Bosnia and Herzegovina",
  "côte d'ivoire": "Côte d'Ivoire",
  "ivory coast": "Côte d'Ivoire",
  eswatini: "Eswatini",
  swaziland: "Eswatini",
  "timor-leste": "East Timor",
  "east timor": "East Timor",
  myanmar: "Myanmar",
  burma: "Myanmar",
  palestine: "Palestine",
  "state of palestine": "Palestine",
  taiwan: "Taiwan",
  "taiwan, province of china": "Taiwan",
  "hong kong": "Hong Kong",
  macao: "Macau",
  vatican: "Vatican City",
  "holy see": "Vatican City",
  "micronesia (federated states of)": "Micronesia",
  "federated states of micronesia": "Micronesia",
  "sao tome and principe": "Sao Tome and Principe",
  "são tomé and príncipe": "Sao Tome and Principe",
  "cape verde": "Cape Verde",
  "cabo verde": "Cape Verde",
};

const byName = new Map(countries.map((c) => [c.name, c]));

export function getCountry(name) {
  return byName.get(name) || null;
}

export function filterPool(state, list = countries) {
  if (!state.selectedNames) return list;
  return list.filter((c) => state.selectedNames.has(c.name));
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickRandom(list) {
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

export function findByGeoName(geoName) {
  if (!geoName) return null;
  const n = geoName.toLowerCase().trim();

  const match = countries.find(
    (c) =>
      c.name.toLowerCase() === n ||
      n.includes(c.name.toLowerCase()) ||
      c.name.toLowerCase().includes(n)
  );
  if (match) return match;

  return getCountry(GEO_ALIASES[n]);
}
