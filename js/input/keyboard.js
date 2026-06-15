import {
  isSimulating, popupVisible, popupSelectedIndex,
  selectedPin, selectedWire, selectedComponents, selectedWaypoint, isRouting,
  setSelectMode,
  components,
  setSelectedComponents, setSelectedPin, setSelectedWire, setSelectedWaypoint,
  setDraggingPin, setHoveredPin, setPopupVisible, setPopupSourcePin, setPopupSelectedIndex,
  setIsRouting, setRoutingSourcePin, setRoutingWaypoints,
  isSelectMode,
} from "../state.js";
import { helpModal, workspaceModal, themeModal, popup, canvas } from "../dom.js";
import { getDpr } from "../canvas.js";
import { closeThemeModal, openThemeModal, updateThemeSelection } from "../ui/theme.js";
import { updatePopupSel } from "../ui/popup.js";
import {
  autoSpawn, doDelete, doCopy, doPaste, selectPopupItem,
} from "../actions.js";
import { performUndo, performRedo } from "../history.js";
import { zoomAtCenter, resetCamera } from "../camera.js";
import { cycleTheme } from "../theme.js";
import { draw } from "../render.js";

export function setupKeyboardInput() {
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (helpModal?.classList.contains("show")) { helpModal.classList.remove("show"); e.preventDefault(); return; }
      if (workspaceModal?.classList.contains("show")) { workspaceModal.classList.remove("show"); e.preventDefault(); return; }
      if (themeModal?.classList.contains("show")) { closeThemeModal(); e.preventDefault(); return; }
    }

    if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;

    if (e.key.toLowerCase() === "h" && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      helpModal?.classList.toggle("show");
      return;
    }
    if ((e.key === " " || e.code === "Space") && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      document.getElementById("toggleSimBtn")?.click();
      return;
    }
    if (e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      e.shiftKey ? document.getElementById("unpackIcBtn")?.click() : document.getElementById("createIcBtn")?.click();
      return;
    }
    if (helpModal?.classList.contains("show") && e.key !== "Escape") return;
    if (workspaceModal?.classList.contains("show") && e.key !== "Escape") return;
    if (themeModal?.classList.contains("show")) {
      if (e.key === "ArrowDown") { e.preventDefault(); updateThemeSelection(1); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); updateThemeSelection(-1); return; }
      if (e.key === "Enter") { e.preventDefault(); closeThemeModal(); return; }
      return;
    }
    if (e.key === "=" || e.key === "+") {
      e.preventDefault();
      zoomAtCenter(1.05, canvas.width / getDpr(), canvas.height / getDpr(), document.getElementById("zoomIndicator"));
      draw(); return;
    }
    if (e.key === "-") {
      e.preventDefault();
      zoomAtCenter(1 / 1.05, canvas.width / getDpr(), canvas.height / getDpr(), document.getElementById("zoomIndicator"));
      draw(); return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      e.shiftKey ? performRedo() : performUndo();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      performRedo();
      return;
    }
    if (e.key.toLowerCase() === "v" && !e.metaKey && !e.ctrlKey) {
      setSelectMode(false);
      modeUI();
      draw(); return;
    }
    if (e.key.toLowerCase() === "s" && !e.metaKey && !e.ctrlKey) {
      setSelectMode(true);
      modeUI();
      draw(); return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") {
      e.preventDefault();
      doCopy(e.shiftKey);
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v") {
      e.preventDefault();
      doPaste();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
      e.preventDefault();
      setSelectedComponents([...components]);
      setSelectedPin(null);
      setSelectedWire(null);
      setSelectedWaypoint(null);
      if (popupVisible) { popup.classList.remove("show"); setPopupVisible(false); setPopupSourcePin(null); }
      draw(); return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "t" && !e.shiftKey) {
      e.preventDefault();
      cycleTheme();
      draw(); return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "0") {
      e.preventDefault();
      resetCamera();
      draw(); return;
    }
    if ((e.key === "Delete" || e.key === "Backspace") && (selectedPin || selectedWire || selectedComponents.length > 0 || selectedWaypoint)) {
      e.preventDefault();
      doDelete();
      return;
    }

    if (popupVisible) {
      const items = popup.querySelectorAll(".popup-item");
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setPopupSelectedIndex((popupSelectedIndex + 1) % items.length);
        updatePopupSel();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setPopupSelectedIndex((popupSelectedIndex - 1 + items.length) % items.length);
        updatePopupSel();
      } else if (e.key === "Enter") {
        e.preventDefault();
        selectPopupItem();
      } else if (e.key === "Escape") {
        popup.classList.remove("show");
        setPopupVisible(false);
        setPopupSourcePin(null);
      }
      return;
    }

    if (e.key === "1") autoSpawn("input");
    else if (e.key === "2") autoSpawn("output");
    else if (e.key === "3") autoSpawn("gate");
    else if (e.key === "4") autoSpawn("not_gate");
    else if (e.key === "5") autoSpawn("label_box");
    else if (e.key === "6") autoSpawn("label");
    else if (e.key === "Escape") {
      cancelWireOperation();
    }
  });
}

export function cancelWireOperation() {
  if (isRouting) {
    setIsRouting(false); setRoutingSourcePin(null); setRoutingWaypoints([]);
    draw(); return;
  }
  setSelectedPin(null); setSelectedWire(null); setSelectedComponents([]);
  setDraggingPin(null); setHoveredPin(null); setSelectedWaypoint(null);
  draw();
}

function modeUI() {
  const modePanBtn = document.getElementById("modePan");
  const modeSelectBtn = document.getElementById("modeSelect");
  modePanBtn?.classList.toggle("active", !isSelectMode);
  modeSelectBtn?.classList.toggle("active", isSelectMode);
}

// re-export for menu.js which also needs it
export { modeUI };
