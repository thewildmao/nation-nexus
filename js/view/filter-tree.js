import {
  REGION_THEME,
  REGION_TREE,
  allCountryNames,
  countryRecord,
  nodeCheckState,
  nodeCountryNames,
  setNodeSelected,
  summarizeSelection,
} from "../game/regions.js";
import { el } from "./dom.js";
import { notifyClock } from "./timer.js";

const expanded = new Set();
let open = false;
let dirty = false;
let snapshot = null;
let onApply = () => {};

function motionMs() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 200;
}

function expandableIds(nodes, out = []) {
  nodes.forEach((node) => {
    if (node.country) return;
    if (node.children || node.countries) {
      out.push(node.id);
      if (node.children) expandableIds(node.children, out);
    }
  });
  return out;
}

function expandNode(node, siblings, state) {
  if (expanded.has(node.id)) {
    expanded.delete(node.id);
  } else {
    (siblings || []).forEach((sib) => {
      if (sib.id !== node.id) expanded.delete(sib.id);
    });
    expanded.add(node.id);
  }
  render(state);
}

function isOpen() {
  return open;
}

function counts(state) {
  return { selected: state.selectedNames.size, total: allCountryNames().length };
}

function updateLabel(state) {
  const { selected, total } = counts(state);
  el.filterToggle.textContent = `${summarizeSelection(state.selectedNames)} · ${selected}/${total} ▾`;
  if (el.filterPopTitle) {
    el.filterPopTitle.textContent = `${selected} / ${total}`;
  }
}

function renderNode(node, depth, state, siblings) {
  const wrap = document.createElement("div");
  wrap.className = "tree-node";
  wrap.dataset.id = node.id;

  const hasKids = !!(node.children || node.countries);
  const isLeafCountry = !!node.country;
  const isOpenNode = expanded.has(node.id);
  const check = node.country
    ? state.selectedNames.has(node.country)
      ? "all"
      : "none"
    : nodeCheckState(node, state.selectedNames);

  const row = document.createElement("div");
  row.className = "tree-row";
  row.style.paddingLeft = `${8 + depth * 16}px`;

  const tone = REGION_THEME[node.label];
  if (tone) {
    wrap.classList.add("is-continent");
    wrap.style.setProperty("--region-color", tone);
  }

  const twist = document.createElement("button");
  twist.type = "button";
  twist.className = "tree-twist";
  if (isLeafCountry || !hasKids) {
    twist.classList.add("is-empty");
    twist.tabIndex = -1;
  } else {
    twist.textContent = isOpenNode ? "▾" : "▸";
    twist.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      expandNode(node, siblings, state);
    });
  }

  const box = document.createElement("input");
  box.type = "checkbox";
  box.checked = check === "all";
  box.indeterminate = check === "some";

  const label = document.createElement("label");
  label.className = "tree-label";
  if (node.country) {
    const rec = countryRecord(node.country);
    label.append(box, ` ${rec ? rec.flag : ""} ${node.label}`);
  } else {
    const names = nodeCountryNames(node);
    const on = names.filter((name) => state.selectedNames.has(name)).length;
    label.append(box, ` ${node.label}`);
    const meta = document.createElement("span");
    meta.className = "tree-count";
    meta.textContent = `${on}/${names.length}`;
    label.append(meta);
  }

  box.addEventListener("click", (e) => e.stopPropagation());
  box.addEventListener("change", () => {
    if (node.country) {
      if (box.checked) state.selectedNames.add(node.country);
      else state.selectedNames.delete(node.country);
    } else {
      setNodeSelected(node, state.selectedNames, box.checked);
    }
    dirty = true;
    render(state);
  });

  if (!isLeafCountry && hasKids) {
    row.addEventListener("click", (e) => {
      if (e.target === box) return;
      e.preventDefault();
      e.stopPropagation();
      expandNode(node, siblings, state);
    });
  }

  row.append(twist, label);
  wrap.append(row);

  if (hasKids && isOpenNode && !node.country) {
    const kids = document.createElement("div");
    kids.className = "tree-children";
    if (node.children) {
      node.children.forEach((child) =>
        kids.append(renderNode(child, depth + 1, state, node.children))
      );
    } else if (node.countries) {
      node.countries.forEach((name) => {
        kids.append(
          renderNode(
            { id: `country:${name}`, label: name, country: name },
            depth + 1,
            state
          )
        );
      });
    }
    wrap.append(kids);
  }

  return wrap;
}

function render(state) {
  el.filterTree.innerHTML = "";
  REGION_TREE.forEach((node) =>
    el.filterTree.append(renderNode(node, 0, state, REGION_TREE))
  );
  updateLabel(state);
}

function restoreSnapshot(state) {
  if (!snapshot) return;
  state.selectedNames.clear();
  snapshot.forEach((name) => state.selectedNames.add(name));
  snapshot = null;
  render(state);
}

function hideLayer() {
  if (!el.filterLayer || el.filterLayer.classList.contains("is-open")) return;
  el.filterLayer.classList.remove("is-leaving");
  el.filterLayer.hidden = true;
  el.filterLayer.style.display = "none";
}

function close(state) {
  if (!open) return;
  open = false;
  if (el.filterPop) el.filterPop.classList.remove("is-open");
  if (el.filterLayer) {
    el.filterLayer.classList.remove("is-open");
    el.filterLayer.classList.add("is-leaving");
  }
  el.filterToggle.setAttribute("aria-expanded", "false");
  if (motionMs() === 0) hideLayer();
  else window.setTimeout(hideLayer, motionMs());
  notifyClock();
  if (dirty) {
    dirty = false;
    Promise.resolve(onApply()).then((ok) => {
      if (ok === false) restoreSnapshot(state);
      else snapshot = null;
    });
  } else {
    snapshot = null;
  }
}

function openPop(state) {
  open = true;
  snapshot = new Set(state.selectedNames);
  if (el.filterLayer) {
    document.body.appendChild(el.filterLayer);
    el.filterLayer.classList.remove("is-leaving");
    el.filterLayer.hidden = false;
    el.filterLayer.classList.add("is-open");
    el.filterLayer.style.cssText =
      "position:fixed;inset:0;z-index:2147482990;display:flex;align-items:center;justify-content:center;padding:24px;";
  }
  if (el.filterPop) el.filterPop.classList.add("is-open");
  el.filterToggle.setAttribute("aria-expanded", "true");
  render(state);
  notifyClock();
}

export function bindFilterTree(state, apply) {
  if (!el.filterToggle || !el.filterPop || !el.filterTree) {
    console.warn("Region tree markup missing");
    return;
  }

  onApply = apply;
  updateLabel(state);
  render(state);

  el.filterToggle.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOpen()) close(state);
    else openPop(state);
  });

  el.filterAll.addEventListener("click", (e) => {
    e.stopPropagation();
    REGION_TREE.forEach((node) => setNodeSelected(node, state.selectedNames, true));
    dirty = true;
    render(state);
  });

  el.filterNone.addEventListener("click", (e) => {
    e.stopPropagation();
    state.selectedNames.clear();
    dirty = true;
    render(state);
  });

  el.filterExpand.addEventListener("click", (e) => {
    e.stopPropagation();
    expandableIds(REGION_TREE).forEach((id) => expanded.add(id));
    render(state);
  });

  el.filterCollapse.addEventListener("click", (e) => {
    e.stopPropagation();
    expanded.clear();
    render(state);
  });

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
      close(state);
    });
  }
  if (el.filterDone) {
    el.filterDone.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      close(state);
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) close(state);
  });
}
