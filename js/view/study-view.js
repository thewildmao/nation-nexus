import { el } from "./dom.js";

export function renderStudy(pool) {
  el.studyGrid.innerHTML = pool
    .map(
      (c) => `
    <div class="study-card">
      <div class="study-flag">${c.flag}</div>
      <div class="study-name">${c.name}</div>
      <div class="study-capital">${c.capital}</div>
      <div class="study-region">${c.region}</div>
    </div>
  `
    )
    .join("");
}
