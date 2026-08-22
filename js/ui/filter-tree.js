import {
  COMMON_SETS,
  REGION_THEME,
  REGION_TREE,
  activeSetId,
  allCountryNames,
  applySet,
  countryRecord,
  namesForSet,
  nodeCheckState,
  nodeCountryNames,
  sameSelection,
  setNodeSelected,
  summarizeSelection,
} from "../shared/regions.js";
import {
  ROUND_SIZES,
  clampLength,
  effectiveLength,
  offeredLengths,
  storedLengthForChip,
} from "../shared/pool.js";
import { normalize } from "../shared/text.js";
import { el } from "./dom.js";
import { hideOverlay, showOverlay } from "./overlay.js";
import { playClose, playOpen } from "./sfx.js";
import { notifyClock } from "./timer.js";

const expanded = new Set();
let open = false;
let dirty = false;
let snapshot = null;
let query = "";
let activeContinent = REGION_TREE[0] ? REGION_TREE[0].id : "";
let onApply = () => {};
let stateRef = null;

function isOpen() {
  return open;
}

function counts(state) {
  return { selected: state.selectedNames.size, total: allCountryNames().length };
}

function markDirty(state) {
  dirty = !(snapshot && sameSelection(state.selectedNames, snapshot));
}

function paintChip(state) {
  const { selected, total } = counts(state);
  if (el.filterToggle) {
    el.filterToggle.textContent = `${summarizeSelection(state.selectedNames)} · ${selected}/${total} ▾`;
    el.filterToggle.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (el.filterPopTitle) el.filterPopTitle.textContent = `${selected} / ${total}`;
  if (el.filterDone) el.filterDone.disabled = selected === 0;
}

function setChip(btn, on, tone) {
  btn.classList.toggle("is-on", on);
  btn.setAttribute("aria-pressed", on ? "true" : "false");
  if (tone) btn.style.setProperty("--chip-color", tone);
}

function renderSetChips(host, state, onPick) {
  if (!host) return;
  host.replaceChildren();
  const active = activeSetId(state.selectedNames);
  COMMON_SETS.forEach((set) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "set-chip";
    btn.textContent = set.label;
    setChip(btn, active === set.id, REGION_THEME[set.label]);
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onPick(set.id);
    });
    host.append(btn);
  });
}

function mapChip({ label, hint, on, onClick }) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "map-chip" + (on ? " is-on" : "");
  btn.setAttribute("aria-pressed", on ? "true" : "false");
  const name = document.createElement("span");
  name.textContent = label;
  btn.append(name);
  if (hint) {
    const count = document.createElement("span");
    count.className = "map-chip-hint";
    count.textContent = hint;
    btn.append(count);
  }
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick(e);
  });
  return btn;
}

function renderHomeChips(host, state) {
  if (!host) return;
  host.replaceChildren();
  const active = activeSetId(state.selectedNames);
  COMMON_SETS.forEach((set) => {
    host.append(mapChip({
      label: set.label,
      hint: String(namesForSet(set.id).length),
      on: active === set.id,
      onClick: () => pickSet(state, set.id),
    }));
  });
  const custom = mapChip({
    label: "Customize",
    hint: active ? undefined : String(state.selectedNames.size),
    on: !active,
    onClick: () => {
      if (stateRef) openPop(stateRef);
    },
  });
  custom.id = "homeCustomize";
  custom.setAttribute("aria-expanded", open ? "true" : "false");
  custom.setAttribute("aria-controls", "filterLayer");
  host.append(custom);
}

function renderLengthChips(host, state) {
  if (!host) return;
  host.replaceChildren();
  const size = state.selectedNames.size;
  const current = effectiveLength(state.roundN, size);
  offeredLengths(size).forEach((length) => {
    const isAll = length === size && !ROUND_SIZES.includes(size);
    host.append(mapChip({
      label: isAll ? "All" : String(length),
      hint: isAll ? String(size) : undefined,
      on: current === length,
      onClick: () => pickLength(state, storedLengthForChip(length, size)),
    }));
  });
}

function paintHomeBoard(state) {
  if (!el.homeToolbar) return;
  let board = el.homeToolbar.querySelector(".set-board");
  if (!board || !board.querySelector(".set-board-lengths")) {
    if (board) board.remove();
    board = document.createElement("div");
    board.className = "set-board";
    board.innerHTML = `
      <div class="set-board-block">
        <div class="set-board-head">
          <p class="set-board-kicker">Map</p>
          <span class="set-board-count"></span>
        </div>
        <div class="set-board-sets" role="group" aria-label="Common sets"></div>
      </div>
      <div class="set-board-block">
        <p class="set-board-kicker">Set length</p>
        <div class="set-board-lengths" role="group" aria-label="Set length"></div>
      </div>
    `;
    el.homeToolbar.append(board);
  }
  const { selected, total } = counts(state);
  board.querySelector(".set-board-count").textContent = `${selected} / ${total}`;
  renderHomeChips(board.querySelector(".set-board-sets"), state);
  renderLengthChips(board.querySelector(".set-board-lengths"), state);
}

export function paintRegionPicker(state) {
  paintChip(state);
  paintHomeBoard(state);
  if (open) renderOverlay(state);
}

function checkbox(checked, some, onChange) {
  const box = document.createElement("input");
  box.type = "checkbox";
  box.checked = checked;
  box.indeterminate = !!some;
  box.addEventListener("click", (e) => e.stopPropagation());
  box.addEventListener("change", () => onChange(box.checked));
  return box;
}

function expandableIds() {
  return REGION_TREE.flatMap((continent) =>
    (continent.children || [])
      .filter((sub) => nodeCountryNames(sub).length)
      .map((sub) => sub.id)
  );
}

function namedText(className, text) {
  const span = document.createElement("span");
  span.className = className;
  span.textContent = text;
  return span;
}

function countryRow(name, state) {
  const rec = countryRecord(name);
  const row = document.createElement("label");
  row.className = "filter-country";
  row.append(
    checkbox(state.selectedNames.has(name), false, (on) => {
      if (on) state.selectedNames.add(name);
      else state.selectedNames.delete(name);
      markDirty(state);
      paintChip(state);
      renderOverlay(state);
    }),
    namedText("filter-country-name", `${rec ? rec.flag : ""} ${name}`)
  );
  return row;
}

function renderSubregion(sub, state) {
  const wrap = document.createElement("div");
  wrap.className = "filter-sub";
  const check = nodeCheckState(sub, state.selectedNames);
  const names = nodeCountryNames(sub);
  const on = names.filter((name) => state.selectedNames.has(name)).length;
  const isOpenNode = expanded.has(sub.id);

  const row = document.createElement("div");
  row.className = "filter-sub-row";

  const twist = document.createElement("button");
  twist.type = "button";
  twist.className = "filter-twist";
  twist.textContent = isOpenNode ? "▾" : "▸";
  twist.setAttribute("aria-expanded", isOpenNode ? "true" : "false");
  twist.setAttribute("aria-label", isOpenNode ? `Hide ${sub.label} countries` : `Show ${sub.label} countries`);
  twist.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (expanded.has(sub.id)) expanded.delete(sub.id);
    else expanded.add(sub.id);
    renderOverlay(state);
  });

  const label = document.createElement("label");
  label.className = "filter-sub-label";
  label.setAttribute("aria-label", `${sub.label}, ${on} of ${names.length}`);
  const meta = document.createElement("span");
  meta.className = "filter-count";
  meta.textContent = `${on}/${names.length}`;
  label.append(
    checkbox(check === "all", check === "some", (checked) => {
      setNodeSelected(sub, state.selectedNames, checked);
      markDirty(state);
      paintChip(state);
      renderOverlay(state);
    }),
    namedText("filter-sub-name", sub.label),
    meta
  );

  row.append(twist, label);
  wrap.append(row);

  if (isOpenNode) {
    const kids = document.createElement("div");
    kids.className = "filter-countries";
    names.forEach((name) => kids.append(countryRow(name, state)));
    wrap.append(kids);
  } else if (names.length) {
    const preview = document.createElement("button");
    preview.type = "button";
    preview.className = "filter-sub-preview";
    preview.textContent = names.join(", ");
    preview.title = names.join(", ");
    preview.setAttribute("aria-label", `Show ${sub.label} countries`);
    preview.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      expanded.add(sub.id);
      renderOverlay(state);
    });
    wrap.append(preview);
  }

  return wrap;
}

function renderColumn(continent, state) {
  const col = document.createElement("section");
  col.className = "filter-col" + (continent.id === activeContinent ? " is-active" : "");
  col.dataset.id = continent.id;
  const tone = REGION_THEME[continent.label];
  if (tone) col.style.setProperty("--region-color", tone);

  const check = nodeCheckState(continent, state.selectedNames);
  const names = nodeCountryNames(continent);
  const on = names.filter((name) => state.selectedNames.has(name)).length;

  const head = document.createElement("label");
  head.className = "filter-col-head";
  head.setAttribute("aria-label", `${continent.label}, ${on} of ${names.length}`);
  const meta = document.createElement("span");
  meta.className = "filter-count";
  meta.textContent = `${on}/${names.length}`;
  head.append(
    checkbox(check === "all", check === "some", (checked) => {
      setNodeSelected(continent, state.selectedNames, checked);
      markDirty(state);
      paintChip(state);
      renderOverlay(state);
    }),
    namedText("filter-col-name", continent.label),
    meta
  );
  col.append(head);

  const body = document.createElement("div");
  body.className = "filter-col-body";
  (continent.children || []).forEach((sub) => body.append(renderSubregion(sub, state)));
  col.append(body);
  return col;
}

function renderSearch(state, q) {
  const groups = [];
  REGION_TREE.forEach((continent) => {
    (continent.children || []).forEach((sub) => {
      const hits = nodeCountryNames(sub).filter((name) => {
        const rec = countryRecord(name);
        return (
          normalize(name).includes(q) ||
          (rec && rec.capital && normalize(rec.capital).includes(q))
        );
      });
      if (hits.length) groups.push({ sub, hits });
    });
  });

  const wrap = document.createElement("div");
  wrap.className = "filter-results";
  if (!groups.length) {
    const empty = document.createElement("p");
    empty.className = "filter-empty";
    empty.textContent = "No countries match";
    wrap.append(empty);
    return wrap;
  }
  groups.forEach(({ sub, hits }) => {
    const group = document.createElement("div");
    group.className = "filter-result-group";
    const title = document.createElement("h3");
    title.textContent = sub.label;
    group.append(title);
    hits.forEach((name) => group.append(countryRow(name, state)));
    wrap.append(group);
  });
  return wrap;
}

function renderTabs(state) {
  if (!el.filterTabs) return;
  el.filterTabs.replaceChildren();
  el.filterTabs.hidden = !!query;
  REGION_TREE.forEach((continent) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filter-tab" + (continent.id === activeContinent ? " is-on" : "");
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", continent.id === activeContinent ? "true" : "false");
    btn.textContent = continent.label;
    const tone = REGION_THEME[continent.label];
    if (tone) btn.style.setProperty("--region-color", tone);
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      activeContinent = continent.id;
      renderOverlay(state);
    });
    el.filterTabs.append(btn);
  });
}

function renderOverlay(state) {
  if (!el.filterGrid) return;
  const q = normalize(query);
  renderSetChips(el.filterSets, state, (id) => draftSet(state, id));
  renderTabs(state);
  paintChip(state);
  if (el.filterTools) el.filterTools.hidden = !!q;
  el.filterGrid.replaceChildren();
  if (q) {
    el.filterGrid.append(renderSearch(state, q));
    return;
  }
  REGION_TREE.forEach((continent) => el.filterGrid.append(renderColumn(continent, state)));
}

function restoreSnapshot(state) {
  if (!snapshot) return;
  state.selectedNames.clear();
  snapshot.forEach((name) => state.selectedNames.add(name));
  snapshot = null;
}

function close(state, commit) {
  if (!open) return;
  open = false;
  if (el.filterPop) el.filterPop.classList.remove("is-open");
  paintChip(state);
  paintHomeBoard(state);
  playClose();
  hideOverlay(el.filterLayer);
  notifyClock();

  const empty = state.selectedNames.size === 0;
  if (commit && dirty && !empty) {
    const prevN = state.roundN;
    Promise.resolve(onApply("region")).then((ok) => {
      if (ok === false) {
        restoreSnapshot(state);
        state.roundN = prevN;
      } else snapshot = null;
      dirty = false;
      paintRegionPicker(state);
    });
    return;
  }
  if (!commit || empty) restoreSnapshot(state);
  snapshot = null;
  dirty = false;
  query = "";
  if (el.filterSearch) el.filterSearch.value = "";
  paintRegionPicker(state);
}

function syncActiveContinent(state) {
  const hit = REGION_TREE.find((node) => nodeCheckState(node, state.selectedNames) !== "none");
  activeContinent = hit ? hit.id : REGION_TREE[0].id;
}

function openPop(state) {
  if (open) return;
  open = true;
  snapshot = new Set(state.selectedNames);
  dirty = false;
  query = "";
  if (el.filterSearch) el.filterSearch.value = "";
  expanded.clear();
  syncActiveContinent(state);
  renderOverlay(state);
  showOverlay(el.filterLayer);
  if (el.filterPop) el.filterPop.classList.add("is-open");
  paintChip(state);
  paintHomeBoard(state);
  requestAnimationFrame(() => {
    playOpen();
    if (el.filterPop) el.filterPop.focus();
  });
  notifyClock();
}

function draftSet(state, id) {
  applySet(state.selectedNames, id);
  if (id !== "world") activeContinent = id;
  else syncActiveContinent(state);
  expanded.clear();
  markDirty(state);
  renderOverlay(state);
  paintChip(state);
}

async function pickSet(state, id) {
  if (activeSetId(state.selectedNames) === id) return;
  if (open) {
    draftSet(state, id);
    return;
  }
  const prev = new Set(state.selectedNames);
  const prevN = state.roundN;
  applySet(state.selectedNames, id);
  paintRegionPicker(state);
  const ok = await onApply("region");
  if (ok === false) {
    state.selectedNames.clear();
    prev.forEach((name) => state.selectedNames.add(name));
    state.roundN = prevN;
  }
  paintRegionPicker(state);
}

async function pickLength(state, next) {
  const size = state.selectedNames.size;
  if (clampLength(state.roundN, size) === next) return;
  const prev = state.roundN;
  state.roundN = next;
  paintRegionPicker(state);
  const ok = await onApply("length");
  if (ok === false) state.roundN = prev;
  paintRegionPicker(state);
}

export function isRegionPickerOpen() {
  return isOpen();
}

export function closeRegionPicker() {
  if (stateRef) close(stateRef, false);
}

export function bindRegionPicker(state, apply) {
  if (!el.filterToggle || !el.filterPop || !el.filterGrid) {
    console.warn("Region picker markup missing");
    return;
  }

  stateRef = state;
  onApply = apply;
  paintRegionPicker(state);

  el.filterToggle.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOpen()) close(state, false);
    else openPop(state);
  });

  el.filterAll.addEventListener("click", (e) => {
    e.stopPropagation();
    draftSet(state, "world");
  });

  el.filterNone.addEventListener("click", (e) => {
    e.stopPropagation();
    state.selectedNames.clear();
    markDirty(state);
    renderOverlay(state);
    paintChip(state);
  });

  if (el.filterExpand) {
    el.filterExpand.addEventListener("click", (e) => {
      e.stopPropagation();
      expandableIds().forEach((id) => expanded.add(id));
      renderOverlay(state);
    });
  }

  if (el.filterCollapse) {
    el.filterCollapse.addEventListener("click", (e) => {
      e.stopPropagation();
      expanded.clear();
      renderOverlay(state);
    });
  }

  if (el.filterSearch) {
    el.filterSearch.addEventListener("input", () => {
      query = el.filterSearch.value;
      renderOverlay(state);
    });
    el.filterSearch.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (query) {
          query = "";
          el.filterSearch.value = "";
          renderOverlay(state);
        } else close(state, false);
      }
    });
  }

  if (el.filterLayer) {
    el.filterLayer.addEventListener("pointerdown", (e) => e.stopPropagation());
    el.filterLayer.addEventListener("click", (e) => e.stopPropagation());
  }
  if (el.filterPop) {
    el.filterPop.addEventListener("pointerdown", (e) => e.stopPropagation());
    el.filterPop.addEventListener("click", (e) => e.stopPropagation());
  }
  if (el.filterBackdrop) {
    el.filterBackdrop.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    el.filterBackdrop.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      close(state, false);
    });
  }
  if (el.filterDone) {
    el.filterDone.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      close(state, true);
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) close(state, false);
  });
}

export { bindRegionPicker as bindFilterTree };
