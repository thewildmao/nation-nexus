import { countryProfile, studyHref } from "../game/country-info.js";
import { getCountry } from "../game/catalog.js";
import { initCountryMap, showCountryOnMap } from "./country-map.js";
import { el } from "./dom.js";
import { APP_NAME, pageTitle } from "./identity.js";

let lastPool = [];
let lastFocus = null;
let bound = false;

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function query() {
  return el.studySearch ? normalize(el.studySearch.value) : "";
}

function matches(country, q) {
  if (!q) return true;
  return [country.name, country.capital, country.region].some((field) =>
    normalize(field).includes(q)
  );
}

function bindSearch() {
  if (bound || !el.studySearch) return;
  bound = true;
  el.studySearch.addEventListener("input", () => {
    renderStudy(lastPool, lastFocus);
  });
}

function sortedPool(pool) {
  return [...pool].sort((a, b) => a.name.localeCompare(b.name));
}

function setStudyTitle(country) {
  if (el.playTitle) el.playTitle.textContent = country ? country.name : "Study";
  document.title = country
    ? `${country.name} · ${APP_NAME}`
    : pageTitle("study");
}

function renderCountryPage(pool, name) {
  const profile = countryProfile(name);
  if (!profile) return false;

  const { country, continent, subregion, neighbors, theme, fun } = profile;
  const local = neighbors.length
    ? [country.name, ...neighbors].sort((a, b) => a.localeCompare(b))
    : sortedPool(pool).map((item) => item.name);
  const names = local.includes(country.name) ? local : [country.name, ...local];
  const index = names.indexOf(country.name);
  const prev = index > 0 ? names[index - 1] : null;
  const next = index < names.length - 1 ? names[index + 1] : null;

  if (el.countryPage) el.countryPage.classList.remove("hidden");
  if (el.studyBrowse) el.studyBrowse.classList.add("hidden");

  if (el.countryCard) {
    const place = subregion ? `${continent} · ${subregion}` : continent;
    const near = neighbors.slice(0, 8);
    el.countryCard.style.setProperty("--region-color", theme || "var(--accent)");
    el.countryCard.innerHTML = `
      <div class="country-flag">${country.flag}</div>
      <h2>${escapeHtml(country.name)}</h2>
      <p class="country-place">${escapeHtml(place)}</p>
      <dl class="country-facts">
        <div><dt>Capital</dt><dd>${escapeHtml(country.capital)}</dd></div>
        <div><dt>Continent</dt><dd>${escapeHtml(continent)}</dd></div>
        ${subregion ? `<div><dt>Region</dt><dd>${escapeHtml(subregion)}</dd></div>` : ""}
      </dl>
      ${
        fun && fun.length
          ? `<div class="country-fun">
              <p>Did you know</p>
              <ul>${fun.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
            </div>`
          : ""
      }
      ${
        near.length
          ? `<div class="country-near">
              <p>Also in ${escapeHtml(subregion)}</p>
              <div class="country-chips">
                ${near
                  .map((other) => {
                    const rec = getCountry(other);
                    return `<a href="${studyHref(other)}">${rec ? rec.flag : ""} ${escapeHtml(other)}</a>`;
                  })
                  .join("")}
              </div>
            </div>`
          : ""
      }
      <div class="country-nav">
        ${prev ? `<a class="ghost-link" href="${studyHref(prev)}">← ${escapeHtml(prev)}</a>` : "<span></span>"}
        ${next ? `<a class="ghost-link" href="${studyHref(next)}">${escapeHtml(next)} →</a>` : "<span></span>"}
      </div>
    `;
  }

  setStudyTitle(country);
  initCountryMap((picked) => {
    location.hash = studyHref(picked);
  });
  showCountryOnMap(country);
  return true;
}

function renderGrid(pool, focusName) {
  if (el.countryPage) el.countryPage.classList.add("hidden");
  if (el.studyBrowse) el.studyBrowse.classList.remove("hidden");
  setStudyTitle(null);

  const list = [...pool];
  const q = query();
  const shown = list.filter((country) => matches(country, q) || country.name === focusName);

  if (el.studySearchCount) {
    el.studySearchCount.textContent = q
      ? `${shown.length} of ${list.length}`
      : `${list.length}`;
  }

  if (!shown.length) {
    el.studyGrid.innerHTML = `<p class="study-empty">No countries match.</p>`;
    return;
  }

  el.studyGrid.innerHTML = shown
    .map(
      (c) => `
    <a class="study-card${c.name === focusName ? " is-focus" : ""}" href="${studyHref(c.name)}">
      <div class="study-flag">${c.flag}</div>
      <div class="study-name">${escapeHtml(c.name)}</div>
      <div class="study-capital">${escapeHtml(c.capital)}</div>
      <div class="study-region">${escapeHtml(c.region)}</div>
    </a>
  `
    )
    .join("");
}

export function renderStudy(pool, focusName) {
  bindSearch();
  lastPool = Array.isArray(pool) ? pool : [];
  lastFocus = focusName || null;

  if (lastFocus && renderCountryPage(lastPool, lastFocus)) return;
  renderGrid(lastPool, lastFocus);
}
