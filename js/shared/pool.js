import { getCountry, shuffle } from "./catalog.js";
import { allCountryNames } from "./regions.js";

const KEY = "countryLearner.pool";
export const ROUND_SIZES = [5, 10, 15, 25, 50];

function worldNames() {
  return new Set(allCountryNames());
}

function namesFrom(raw) {
  const names = raw.filter((name) => typeof name === "string" && getCountry(name));
  return names.length ? new Set(names) : worldNames();
}

function readRecord() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "null");
    if (Array.isArray(parsed)) return { names: namesFrom(parsed), n: undefined };
    if (!parsed || typeof parsed !== "object") return { names: worldNames(), n: undefined };
    const names = Array.isArray(parsed.names) ? namesFrom(parsed.names) : worldNames();
    const n = parsed.n == null ? undefined : Number(parsed.n);
    return { names, n };
  } catch {
    return { names: worldNames(), n: undefined };
  }
}

export function offeredLengths(mapSize) {
  const size = Math.max(0, Number(mapSize) || 0);
  const sizes = ROUND_SIZES.filter((n) => n < size);
  if (size > 0) sizes.push(size);
  return sizes;
}

export function effectiveLength(n, mapSize) {
  const size = Math.max(0, Number(mapSize) || 0);
  if (!size) return 0;
  const want = Number(n);
  if (!want || want >= size) return size;
  return want;
}

export function clampLength(n, mapSize) {
  const size = Math.max(0, Number(mapSize) || 0);
  if (!size) return 0;
  const want = Number(n);
  if (!Number.isFinite(want) || want <= 0) return 0;
  if (want >= size) return ROUND_SIZES.includes(size) ? size : 0;
  if (ROUND_SIZES.includes(want)) return want;
  return 0;
}

export function storedLengthForChip(length, mapSize) {
  const size = Math.max(0, Number(mapSize) || 0);
  const n = Number(length) || 0;
  if (n >= size && !ROUND_SIZES.includes(size)) return 0;
  return n >= size ? size : n;
}

export function defaultLength(mapSize) {
  return (Number(mapSize) || 0) >= 10 ? 10 : 0;
}

export function loadPool() {
  return readRecord().names;
}

export function loadRoundN(mapSize) {
  const rec = readRecord();
  const size = mapSize || rec.names.size;
  if (rec.n == null) return defaultLength(size);
  return clampLength(rec.n, size);
}

export function savePool(selected, n) {
  const names = [...selected].filter((name) => typeof name === "string" && getCountry(name));
  if (!names.length) return;
  const stored = clampLength(n, names.length);
  localStorage.setItem(KEY, JSON.stringify({ names, n: stored }));
}

export function sampleRoundNames(selected, n) {
  const names = [...selected];
  const take = effectiveLength(n, names.length);
  if (!take || take >= names.length) return null;
  return new Set(shuffle(names).slice(0, take));
}
