import {
  undoStack, redoStack,
  selectedComponents, selectedPin, selectedWire, selectedWaypoint,
  isDraggingPin, pinDragDidMove, isRouting,
} from "../state.js";
import {
  undoBtn, redoBtn, selectionToolbar, cancelWireBtn,
} from "../dom.js";

export function syncSelectionToolbar() {
  const hasSelection = selectedComponents.length > 0 || selectedPin || selectedWire || selectedWaypoint;
  selectionToolbar?.classList.toggle("show", hasSelection);
  if (undoBtn) undoBtn.disabled = undoStack.length === 0;
  if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}

export function syncCancelWireButton() {
  const show = (isDraggingPin && pinDragDidMove) || isRouting;
  cancelWireBtn?.classList.toggle("show", show);
}

cancelWireBtn?.addEventListener("click", () => {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
});
