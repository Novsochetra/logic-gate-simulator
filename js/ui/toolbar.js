import {
  undoStack, redoStack,
  selectedComponents, selectedPin, selectedWire, selectedWaypoint,
} from "../state.js";
import {
  undoBtn, redoBtn, selectionToolbar,
} from "../dom.js";

export function syncSelectionToolbar() {
  const hasSelection = selectedComponents.length > 0 || selectedPin || selectedWire || selectedWaypoint;
  selectionToolbar?.classList.toggle("show", hasSelection);
  if (undoBtn) undoBtn.disabled = undoStack.length === 0;
  if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}
