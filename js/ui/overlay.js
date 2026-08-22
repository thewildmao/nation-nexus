export function motionMs() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 200;
}

export function showOverlay(root) {
  if (!root) return;
  root.classList.remove("is-leaving");
  root.hidden = false;
  root.style.display = "";
  root.classList.add("is-open");
}

export function hideOverlay(root, after) {
  if (!root) {
    if (after) after();
    return;
  }
  root.classList.remove("is-open");
  root.classList.add("is-leaving");
  const done = () => {
    if (root.classList.contains("is-open")) return;
    root.classList.remove("is-leaving");
    root.hidden = true;
    root.style.display = "none";
    if (after) after();
  };
  const ms = motionMs();
  if (ms === 0) done();
  else window.setTimeout(done, ms);
}
