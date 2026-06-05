import { serializeState, loadSerializedState } from "./serialization.js";
import { undoStack, redoStack, historyTempState, workspaces, activeWorkspaceId } from "./state.js";

const MAX_HISTORY = 50;

export function pushHistory(state = serializeState()) {
  if (undoStack.length > 0 && undoStack[undoStack.length - 1] === state) return;
  undoStack.push(state);
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack.length = 0;
  saveToLocalStorage();
}

export function performUndo() {
  if (undoStack.length === 0) return;
  redoStack.push(serializeState());
  loadSerializedState(undoStack.pop());
  saveToLocalStorage();
}

export function performRedo() {
  if (redoStack.length === 0) return;
  undoStack.push(serializeState());
  loadSerializedState(redoStack.pop());
  saveToLocalStorage();
}

export function saveToLocalStorage() {
  localStorage.setItem("logicSimulatorAutoSave", serializeState());
  const ws = workspaces.find(w => w.id === activeWorkspaceId);
  if (ws) {
    ws.data = serializeState();
    saveWorkspaceList();
  }
}

export function saveWorkspaceList() {
  localStorage.setItem("logicSimulatorWorkspaces", JSON.stringify(workspaces));
  localStorage.setItem("logicSimulatorActiveWorkspaceId", activeWorkspaceId);
}
