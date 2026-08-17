import { el } from "./dom.js";
import { notifyClock } from "./timer.js";

let pending = null;

function finish(ok) {
  if (!pending) return;
  const resolve = pending;
  pending = null;
  if (el.confirmWrap) {
    el.confirmWrap.hidden = true;
    el.confirmWrap.classList.remove("is-open");
    el.confirmWrap.style.display = "none";
  }
  resolve(ok);
  notifyClock();
}

export function confirmWarn({
  title,
  message,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
} = {}) {
  if (!el.confirmWrap) {
    return Promise.resolve(window.confirm(`${title || ""}\n\n${message || ""}`.trim()));
  }

  if (pending) finish(false);

  if (el.confirmTitle) el.confirmTitle.textContent = title || "Are you sure?";
  if (el.confirmMessage) el.confirmMessage.textContent = message || "";
  if (el.confirmOk) el.confirmOk.textContent = confirmLabel;
  if (el.confirmCancel) el.confirmCancel.textContent = cancelLabel;

  document.body.appendChild(el.confirmWrap);
  el.confirmWrap.hidden = false;
  el.confirmWrap.classList.add("is-open");
  el.confirmWrap.style.cssText =
    "position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:24px;";

  queueMicrotask(() => {
    if (el.confirmCancel) el.confirmCancel.focus();
  });

  notifyClock();
  return new Promise((resolve) => {
    pending = resolve;
  });
}

export function bindConfirm() {
  if (!el.confirmWrap) return;

  if (el.confirmOk) {
    el.confirmOk.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      finish(true);
    });
  }
  if (el.confirmCancel) {
    el.confirmCancel.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      finish(false);
    });
  }
  if (el.confirmBackdrop) {
    el.confirmBackdrop.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      finish(false);
    });
  }
  if (el.confirmPanel) {
    el.confirmPanel.addEventListener("click", (e) => e.stopPropagation());
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && pending) {
      e.stopPropagation();
      finish(false);
    }
  });
}
