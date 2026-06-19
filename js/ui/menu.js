import {
  setSelectMode,
  selectedComponents, selectedPin, selectedWire, selectedWaypoint,
  components,
  setSelectedComponents, setSelectedPin, setSelectedWire, setSelectedWaypoint,
  popupVisible, setPopupVisible, setPopupSourcePin,
} from "../state.js";
import {
  menuBtn, menuDropdown, modePanBtn, modeSelectBtn,
  copyBtn, pasteBtn, deleteBtn, helpBtn,
  closeHelpBtn, helpModal,
  undoBtn, redoBtn,
  selectionToolbar, toolbarDeleteBtn, toolbarDuplicateBtn,
  selectAllBtn, copyIcInternalsBtn,
  popup,
} from "../dom.js";
import { doCopy, doPaste, doDelete, doDuplicate, autoSpawn } from "../actions.js";
import { performUndo, performRedo } from "../history.js";
import { modeUI } from "../input/keyboard.js";
import { draw } from "../render.js";

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

  // Undo / Redo
  undoBtn?.addEventListener("click", () => { performUndo(); draw(); });
  redoBtn?.addEventListener("click", () => { performRedo(); draw(); });

  // Selection toolbar
  toolbarDeleteBtn?.addEventListener("click", () => { doDelete(); draw(); });
  toolbarDuplicateBtn?.addEventListener("click", () => { doDuplicate(); });

  // Menu extras
  selectAllBtn?.addEventListener("click", () => {
    setSelectedComponents([...components]);
    setSelectedPin(null);
    setSelectedWire(null);
    setSelectedWaypoint(null);
    if (popupVisible) { popup?.classList.remove("show"); setPopupVisible(false); setPopupSourcePin(null); }
    draw();
  });
  copyIcInternalsBtn?.addEventListener("click", () => { doCopy(true); draw(); });
}
