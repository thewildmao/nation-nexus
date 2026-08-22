import { countries } from "../../data/countries.js";
import { getCountry } from "./catalog.js";

export const REGION_TREE = [
  {
    id: "americas",
    label: "Americas",
    children: [
      {
        id: "north-america",
        label: "North America",
        countries: ["Canada", "United States", "Mexico", "Greenland"],
      },
      {
        id: "central-america",
        label: "Central America",
        countries: [
          "Belize",
          "Costa Rica",
          "El Salvador",
          "Guatemala",
          "Honduras",
          "Nicaragua",
          "Panama",
        ],
      },
      {
        id: "caribbean",
        label: "Caribbean",
        countries: [
          "Bahamas",
          "Cuba",
          "Dominican Republic",
          "Haiti",
          "Jamaica",
          "Trinidad and Tobago",
        ],
      },
      {
        id: "south-america",
        label: "South America",
        countries: [
          "Argentina",
          "Bolivia",
          "Brazil",
          "Chile",
          "Colombia",
          "Ecuador",
          "Guyana",
          "Paraguay",
          "Peru",
          "Suriname",
          "Uruguay",
          "Venezuela",
        ],
      },
    ],
  },
  {
    id: "europe",
    label: "Europe",
    children: [
      {
        id: "western-europe",
        label: "Western Europe",
        countries: [
          "Andorra",
          "Belgium",
          "France",
          "Ireland",
          "Liechtenstein",
          "Luxembourg",
          "Monaco",
          "Netherlands",
          "Switzerland",
          "United Kingdom",
        ],
      },
      {
        id: "northern-europe",
        label: "Northern Europe",
        countries: [
          "Denmark",
          "Estonia",
          "Finland",
          "Iceland",
          "Latvia",
          "Lithuania",
          "Norway",
          "Sweden",
        ],
      },
      {
        id: "southern-europe",
        label: "Southern Europe",
        countries: [
          "Cyprus",
          "Greece",
          "Italy",
          "Malta",
          "Portugal",
          "San Marino",
          "Spain",
          "Vatican City",
        ],
      },
      {
        id: "central-europe",
        label: "Central Europe",
        countries: [
          "Austria",
          "Czechia",
          "Germany",
          "Hungary",
          "Poland",
          "Slovakia",
          "Slovenia",
        ],
      },
      {
        id: "eastern-europe",
        label: "Eastern Europe",
        countries: ["Belarus", "Moldova", "Romania", "Russia", "Ukraine"],
      },
      {
        id: "balkans",
        label: "Balkans",
        countries: [
          "Albania",
          "Bosnia and Herzegovina",
          "Bulgaria",
          "Croatia",
          "Kosovo",
          "Montenegro",
          "North Macedonia",
          "Serbia",
        ],
      },
    ],
  },
  {
    id: "asia",
    label: "Asia",
    children: [
      {
        id: "east-asia",
        label: "East Asia",
        countries: ["China", "Japan", "Mongolia", "North Korea", "South Korea", "Taiwan"],
      },
      {
        id: "southeast-asia",
        label: "Southeast Asia",
        countries: [
          "Cambodia",
          "Indonesia",
          "Laos",
          "Malaysia",
          "Myanmar",
          "Philippines",
          "Singapore",
          "Thailand",
          "Vietnam",
        ],
      },
      {
        id: "south-asia",
        label: "South Asia",
        countries: [
          "Afghanistan",
          "Bangladesh",
          "India",
          "Nepal",
          "Pakistan",
          "Sri Lanka",
        ],
      },
      {
        id: "central-asia",
        label: "Central Asia",
        countries: ["Kazakhstan", "Uzbekistan"],
      },
      {
        id: "west-asia",
        label: "West Asia",
        countries: [
          "Bahrain",
          "Iran",
          "Iraq",
          "Israel",
          "Jordan",
          "Kuwait",
          "Lebanon",
          "Oman",
          "Qatar",
          "Saudi Arabia",
          "Syria",
          "Turkey",
          "United Arab Emirates",
          "Yemen",
        ],
      },
      {
        id: "caucasus",
        label: "Caucasus",
        countries: ["Armenia", "Azerbaijan", "Georgia"],
      },
    ],
  },
  {
    id: "africa",
    label: "Africa",
    children: [
      {
        id: "north-africa",
        label: "North Africa",
        countries: ["Algeria", "Egypt", "Libya", "Morocco", "Sudan", "Tunisia"],
      },
      {
        id: "west-africa",
        label: "West Africa",
        countries: [
          "Benin",
          "Burkina Faso",
          "Cape Verde",
          "Côte d'Ivoire",
          "Gambia",
          "Ghana",
          "Guinea",
          "Guinea-Bissau",
          "Liberia",
          "Mali",
          "Mauritania",
          "Niger",
          "Nigeria",
          "Senegal",
          "Sierra Leone",
          "Togo",
        ],
      },
      {
        id: "east-africa",
        label: "East Africa",
        countries: [
          "Burundi",
          "Comoros",
          "Djibouti",
          "Eritrea",
          "Ethiopia",
          "Kenya",
          "Madagascar",
          "Mauritius",
          "Rwanda",
          "Seychelles",
          "Somalia",
          "South Sudan",
          "Tanzania",
          "Uganda",
        ],
      },
      {
        id: "central-africa",
        label: "Central Africa",
        countries: [
          "Cameroon",
          "Chad",
          "Congo",
          "Democratic Republic of the Congo",
          "Equatorial Guinea",
          "Gabon",
          "Sao Tome and Principe",
        ],
      },
      {
        id: "southern-africa",
        label: "Southern Africa",
        countries: [
          "Angola",
          "Botswana",
          "Eswatini",
          "Lesotho",
          "Malawi",
          "Mozambique",
          "Namibia",
          "South Africa",
          "Zambia",
          "Zimbabwe",
        ],
      },
    ],
  },
  {
    id: "oceania",
    label: "Oceania",
    children: [
      {
        id: "australasia",
        label: "Australia & New Zealand",
        countries: ["Australia", "New Zealand"],
      },
      {
        id: "melanesia",
        label: "Melanesia",
        countries: ["Fiji", "Papua New Guinea", "Solomon Islands", "Vanuatu"],
      },
      {
        id: "polynesia",
        label: "Polynesia",
        countries: ["Samoa", "Tonga", "Tuvalu"],
      },
      {
        id: "micronesia",
        label: "Micronesia",
        countries: ["Kiribati", "Marshall Islands", "Micronesia", "Nauru", "Palau"],
      },
    ],
  },
];

export const REGION_THEME = {
  Americas: "#7dd3fc",
  Europe: "#c4b5fd",
  Asia: "#facc15",
  Africa: "#34d399",
  Oceania: "#fb7185",
};

function findNode(id, nodes = REGION_TREE) {
  for (const node of nodes) {
    if (node.id === id) return node;
    const hit = node.children && findNode(id, node.children);
    if (hit) return hit;
  }
  return null;
}

export function countryRecord(name) {
  return getCountry(name);
}

export function nodeCountryNames(node) {
  if (node.countries) return node.countries.slice();
  return (node.children || []).flatMap(nodeCountryNames);
}

function namesForNodes(ids) {
  return ids.flatMap((id) => {
    const node = findNode(id);
    return node ? nodeCountryNames(node) : [];
  });
}

export const JUMP_CONTINENTS = [
  { id: "north-america", label: "North America", short: "N. America", names: namesForNodes(["north-america"]) },
  { id: "central", label: "Central America", short: "Central", names: namesForNodes(["central-america", "caribbean"]) },
  { id: "south-america", label: "South America", short: "S. America", names: namesForNodes(["south-america"]) },
  { id: "europe", label: "Europe", short: "Europe", names: namesForNodes(["europe"]) },
  { id: "africa", label: "Africa", short: "Africa", names: namesForNodes(["africa"]) },
  { id: "asia", label: "Asia", short: "Asia", names: namesForNodes(["asia"]) },
  { id: "oceania", label: "Oceania", short: "Oceania", names: namesForNodes(["oceania"]) },
];

export function allCountryNames() {
  return countries.map((c) => c.name);
}

export function nodeCheckState(node, selected) {
  const names = nodeCountryNames(node);
  let on = 0;
  names.forEach((name) => {
    if (selected.has(name)) on += 1;
  });
  if (on === 0) return "none";
  if (on === names.length) return "all";
  return "some";
}

export function setNodeSelected(node, selected, on) {
  nodeCountryNames(node).forEach((name) => {
    if (on) selected.add(name);
    else selected.delete(name);
  });
}

export function pathForCountry(name) {
  for (const continent of REGION_TREE) {
    for (const sub of continent.children || []) {
      if ((sub.countries || []).includes(name)) {
        return { continent, subregion: sub, country: name };
      }
    }
    if ((continent.countries || []).includes(name)) {
      return { continent, subregion: null, country: name };
    }
  }
  return null;
}

export function themeForCountry(name) {
  const rec = countryRecord(name);
  if (!rec) return null;
  return REGION_THEME[rec.region] || null;
}

export function summarizeSelection(selected) {
  const total = countries.length;
  if (selected.size === 0) return "No countries";
  if (selected.size === total) return "World";

  const exact = [];
  REGION_TREE.forEach((continent) => {
    if (nodeCheckState(continent, selected) === "all") {
      exact.push(continent);
      return;
    }
    (continent.children || []).forEach((sub) => {
      if (nodeCheckState(sub, selected) === "all") exact.push(sub);
    });
  });

  const covered = new Set(exact.flatMap(nodeCountryNames));
  if (exact.length && exact.length <= 2 && covered.size === selected.size) {
    return exact.map((n) => n.label).join(" + ");
  }
  return `${selected.size} countries`;
}

export const REGION_SETS = [
  { id: "world", label: "World", kind: "world" },
  ...REGION_TREE.map((node) => ({
    id: node.id,
    label: node.label,
    kind: "continent",
    nodeId: node.id,
  })),
  ...REGION_TREE.flatMap((continent) =>
    (continent.children || []).map((node) => ({
      id: node.id,
      label: node.label,
      kind: "subregion",
      nodeId: node.id,
      continentId: continent.id,
    }))
  ),
];

export const COMMON_SETS = REGION_SETS.filter((set) => set.kind !== "subregion");

const setNames = new Map();

export function namesForSet(id) {
  if (setNames.has(id)) return setNames.get(id);
  let names;
  if (id === "world") names = allCountryNames();
  else {
    const node = findNode(id);
    names = node ? nodeCountryNames(node) : [];
  }
  setNames.set(id, names);
  return names;
}

export function applySet(selected, id) {
  selected.clear();
  namesForSet(id).forEach((name) => selected.add(name));
  return selected;
}

export function activeSetId(selected) {
  if (!selected || selected.size === 0) return null;
  const order = ["subregion", "continent", "world"];
  for (const kind of order) {
    for (const set of REGION_SETS) {
      if (set.kind !== kind) continue;
      const names = namesForSet(set.id);
      if (names.length !== selected.size) continue;
      if (names.every((name) => selected.has(name))) return set.id;
    }
  }
  return null;
}

export function sameSelection(a, b) {
  if (!a || !b || a.size !== b.size) return false;
  for (const name of a) {
    if (!b.has(name)) return false;
  }
  return true;
}

export function mosaicFlags(selected, limit = 8) {
  const flags = [];
  const buckets = REGION_TREE.map((node) =>
    nodeCountryNames(node).filter((name) => selected.has(name))
  );
  let i = 0;
  while (flags.length < limit) {
    let added = false;
    for (const bucket of buckets) {
      if (i >= bucket.length) continue;
      const rec = countryRecord(bucket[i]);
      if (rec && rec.flag) flags.push(rec.flag);
      added = true;
      if (flags.length >= limit) break;
    }
    if (!added) break;
    i += 1;
  }
  return flags;
}

const assigned = new Set(REGION_TREE.flatMap(nodeCountryNames));
const leftover = countries.filter((c) => !assigned.has(c.name));
if (leftover.length) {
  console.warn(
    "Countries missing from region tree:",
    leftover.map((c) => c.name)
  );
}
