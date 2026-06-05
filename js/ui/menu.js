import { setSelectMode } from "../state.js";
import {
  menuBtn, menuDropdown, modePanBtn, modeSelectBtn,
  copyBtn, pasteBtn, deleteBtn, helpBtn,
  closeHelpBtn, helpModal,
} from "../dom.js";
import { doCopy, doPaste, doDelete, autoSpawn } from "../actions.js";
import { modeUI } from "../input/keyboard.js";

export function setupMenuUI() {
  menuBtn?.addEventListener("click", e => { e.stopPropagation(); menuDropdown.classList.toggle("show"); });
  document.addEventListener("click", e => {
    if (menuDropdown?.classList.contains("show") && !menuDropdown.contains(e.target) && e.target !== menuBtn)
      menuDropdown.classList.remove("show");
  });
  menuDropdown?.querySelectorAll(".menu-item").forEach(item =>
    item.addEventListener("click", () => menuDropdown.classList.remove("show"))
  );

  modePanBtn?.addEventListener("click", () => { setSelectMode(false); modeUI(); });
  modeSelectBtn?.addEventListener("click", () => { setSelectMode(true); modeUI(); });

  document.querySelectorAll(".nav-item[data-type]").forEach(btn => {
    btn.addEventListener("click", () => { if (btn.dataset.type) autoSpawn(btn.dataset.type); btn.blur(); });
  });

  closeHelpBtn?.addEventListener("click", () => helpModal?.classList.remove("show"));
  helpModal?.addEventListener("mousedown", e => { if (e.target === helpModal) helpModal.classList.remove("show"); });

  copyBtn?.addEventListener("click", () => doCopy());
  pasteBtn?.addEventListener("click", () => doPaste());
  deleteBtn?.addEventListener("click", () => doDelete());
  helpBtn?.addEventListener("click", () => helpModal?.classList.toggle("show"));
}
