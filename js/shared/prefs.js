const KEY = "countryLearner.prefs";

let cached = null;

function clampVolume(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 70;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function read() {
  if (cached) return cached;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!parsed || typeof parsed !== "object") {
      cached = { sound: true, volume: 70 };
    } else {
      cached = {
        sound: parsed.sound !== false,
        volume: clampVolume(parsed.volume == null ? 70 : parsed.volume),
      };
    }
  } catch {
    cached = { sound: true, volume: 70 };
  }
  return cached;
}

export function loadPrefs() {
  return { ...read() };
}

export function reloadPrefs() {
  cached = null;
  return loadPrefs();
}

export function savePrefs(prefs, persist = true) {
  const cur = read();
  cached = {
    sound: prefs.sound !== false,
    volume: clampVolume(prefs.volume == null ? cur.volume : prefs.volume),
  };
  if (persist) localStorage.setItem(KEY, JSON.stringify(cached));
  return { ...cached };
}

export function persistPrefs() {
  const cur = read();
  localStorage.setItem(KEY, JSON.stringify(cur));
  return { ...cur };
}

export function soundEnabled() {
  const prefs = read();
  return prefs.sound !== false && prefs.volume > 0;
}

export function soundLevel() {
  const prefs = read();
  if (prefs.sound === false) return 0;
  return prefs.volume / 100;
}
