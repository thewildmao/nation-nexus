import { JUMP_CONTINENTS } from "../../shared/regions.js";
import { jumpToContinent } from "./view.js";

let chipTimer = 0;

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function markChip(btn) {
  document.querySelectorAll(".map-jump.is-on").forEach((node) => {
    node.classList.remove("is-on");
  });
  window.clearTimeout(chipTimer);
  if (!btn || btn.dataset.jump === "world" || reducedMotion()) return;
  btn.classList.add("is-on");
  chipTimer = window.setTimeout(() => btn.classList.remove("is-on"), 550);
}

function chip(id, short, label) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "map-jump";
  btn.dataset.jump = id;
  btn.textContent = short;
  btn.title = id === "world" ? "Jump to world" : `Jump to ${label}`;
  btn.setAttribute("aria-label", btn.title);
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    markChip(btn);
    jumpToContinent(id);
  });
  return btn;
}

export function mountJumpRail() {
  const slot = document.getElementById("hudTc");
  if (!slot || document.getElementById("mapJumps")) return;
  const nav = document.createElement("nav");
  nav.className = "map-jumps";
  nav.id = "mapJumps";
  nav.setAttribute("aria-label", "Jump to continent");
  const kicker = document.createElement("p");
  kicker.className = "map-jumps-kicker";
  kicker.textContent = "Jump";
  const list = document.createElement("div");
  list.className = "map-jumps-list";
  list.append(chip("world", "World", "World"));
  JUMP_CONTINENTS.forEach((item) => {
    list.append(chip(item.id, item.short, item.label));
  });
  nav.append(kicker, list);
  slot.append(nav);
  const L = window.L;
  if (L && L.DomEvent) {
    L.DomEvent.disableClickPropagation(nav);
    L.DomEvent.disableScrollPropagation(nav);
  }
}

export function paintJumpRail(selectedNames) {
  const nav = document.getElementById("mapJumps");
  if (!nav) return;
  const selected = selectedNames instanceof Set ? selectedNames : null;
  nav.querySelectorAll("[data-jump]").forEach((btn) => {
    const id = btn.dataset.jump;
    if (id === "world") {
      btn.hidden = false;
      return;
    }
    const jump = JUMP_CONTINENTS.find((item) => item.id === id);
    if (!jump) {
      btn.hidden = true;
      return;
    }
    const show = !selected || jump.names.some((name) => selected.has(name));
    btn.hidden = !show;
  });
}
