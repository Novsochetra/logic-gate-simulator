import { THEME, GRID_SIZE } from "./constants.js";
import {
  camera, components, wires, selectedComponents, selectedWire, selectedPin,
  selectedWaypoint, isSelectMode, isDraggingCanvas, isDraggingComponent,
  isDraggingPin, isDraggingWaypoint, isResizingComponent, isSelectingBox,
  isSimulating, pinDragDidMove, popupVisible, popupSelectedIndex,
  dragStart, dragStartWorld, dragStartMousePos, selectedComponentsInitPos,
  componentDragDidMove, affectedWiresInitWaypoints, resizeStart, potentialWaypoint,
  selectionBoxStart, selectionBoxEnd, historyTempState, mousePos, hoveredPin,
  undoStack, redoStack,
  setSelectMode, setDraggingCanvas, setDraggingComponent, setDraggingPin,
  setDraggingWaypoint, setDragStart, setMousePos, setPinDragDidMove,
  setSelectedComponents, setSelectedPin, setSelectedWire, setHoveredPin, setSimulating,
  setPotentialWaypoint, setResizingComponent, setResizeStart, setSelectingBox,
  setSelectionBoxStart, setSelectionBoxEnd, setDragStartWorld, setDragStartMousePos,
  setComponentDragDidMove, setSelectedComponentsInitPos, setAffectedWiresInitWaypoints,
  setHistoryTempState, setPopupVisible, setPopupSourcePin, setPopupSelectedIndex,
  setSelectedWaypoint, setComponents, setWires, setNextId, allocateNextId,
} from "./state.js";
import { screenToWorld, snapToGrid, installRoundRect } from "./utils.js";
import { setupCanvas, getMainCtx, getDpr } from "./canvas.js";
import { loadCameraState, zoomAtCenter, resetCamera, saveCameraState } from "./camera.js";
import { Component } from "./Component.js";
import { draw } from "./render.js";
import { isPointNearWire, getOrthogonalPath, wireExists, removeWiresForPin } from "./wiring.js";
import { getMinimapConfig } from "./render.js";

// ==================== CANVAS SETUP ====================
const canvas = document.getElementById("canvas");
const minimapCanvas = document.getElementById("minimap");
setupCanvas(canvas, minimapCanvas);
installRoundRect(getMainCtx());
window.addEventListener("resize", draw);

// ==================== DOM REFS ====================
const zoomIndicator = document.getElementById("zoomIndicator");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const toggleSimBtn = document.getElementById("toggleSimBtn");
const popup = document.getElementById("componentPopup");
const helpModal = document.getElementById("helpModal");
const workspaceModal = document.getElementById("workspaceModal");
const menuBtn = document.getElementById("menuBtn");
const menuDropdown = document.getElementById("menuDropdown");
const labelEditor = document.getElementById("labelEditor");
const modePanBtn = document.getElementById("modePan");
const modeSelectBtn = document.getElementById("modeSelect");
const closeHelpBtn = document.getElementById("closeHelpBtn");
const closeWorkspaceBtn = document.getElementById("closeWorkspaceBtn");

// ==================== SERIALIZATION ====================
function serializeCircuit(comps, wireList) {
  return {
    components: comps.map(c => {
      const b = { id: c.id, type: c.type, x: c.x, y: c.y, width: c.width, height: c.height, label: c.label, state: c.type === "input" ? c.state : false };
      if (c.type === "custom_ic") {
        const inner = serializeCircuit(c.internalComponents, c.internalWires);
        b.internalComponents = inner.components;
        b.internalWires = inner.wires;
        b.inputs = c.inputs.map(p => ({ x: p.x, y: p.y, internalTargetId: p.internalTargetId, label: p.label }));
        b.outputs = c.outputs.map(p => ({ x: p.x, y: p.y, internalSourceId: p.internalSourceId, label: p.label }));
      }
      return b;
    }),
    wires: wireList.map(w => ({
      fromCompId: w.from.component.id, fromType: w.from.type,
      fromPinIndex: w.from.component[w.from.type + "s"].indexOf(w.from.pin),
      toCompId: w.to.component.id, toType: w.to.type,
      toPinIndex: w.to.component[w.to.type + "s"].indexOf(w.to.pin),
      waypoints: w.waypoints ? w.waypoints.map(p => ({ x: p.x, y: p.y })) : null,
    })),
  };
}

function serializeState() {
  return JSON.stringify(serializeCircuit(components, wires));
}

function parseCircuit(compList, wireList, idMap = new Map(), assignNewIds = false) {
  const parsedComps = [], parsedWires = [];
  let maxId = 0;

  compList.forEach(cc => {
    const nc = new Component(cc.type, cc.x, cc.y);
    nc.id = assignNewIds ? null : cc.id;
    idMap.set(cc.id, nc);
    nc.width = cc.width;
    nc.height = cc.height;
    if (["label_box", "custom_ic", "label", "input", "output"].includes(cc.type)) nc.label = cc.label || "";
    if (cc.type === "input") nc.state = cc.state;

    if (cc.type === "custom_ic") {
      const r = parseCircuit(cc.internalComponents, cc.internalWires, idMap, assignNewIds);
      nc.internalComponents = r.comps;
      nc.internalWires = r.wires;
      nc.inputs = cc.inputs.map((p, i) => ({ x: p.x, y: p.y, internalTargetId: idMap.get(p.internalTargetId).id, label: p.label || `In${i + 1}`, connections: [] }));
      nc.outputs = cc.outputs.map((p, i) => ({ x: p.x, y: p.y, internalSourceId: idMap.get(p.internalSourceId).id, label: p.label || `Out${i + 1}`, connections: [] }));
      if (!assignNewIds && r.localMaxId > maxId) maxId = r.localMaxId;
    }

    if (assignNewIds && !nc.id) { const n = allocateNextId(); idMap.set(cc.id, { id: n }); nc.id = n; }
    parsedComps.push(nc);
    if (!assignNewIds && cc.id > maxId) maxId = cc.id;
  });

  wireList.forEach(cw => {
    const fc = idMap.get(cw.fromCompId), tc = idMap.get(cw.toCompId);
    if (fc && tc) {
      const fp = fc[cw.fromType + "s"]?.[cw.fromPinIndex];
      const tp = tc[cw.toType + "s"]?.[cw.toPinIndex];
      if (fp && tp) {
        const nw = { from: { pin: fp, type: cw.fromType, component: fc }, to: { pin: tp, type: cw.toType, component: tc } };
        if (cw.waypoints?.length) nw.waypoints = cw.waypoints.map(p => ({ x: p.x, y: p.y }));
        parsedWires.push(nw);
        tp.connections.push(fc);
      }
    }
  });
  return { comps: parsedComps, wires: parsedWires, localMaxId: maxId };
}

function loadSerializedState(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    if (!data.components || !data.wires) return false;
    if (isSimulating) toggleSimBtn.click();
    const r = parseCircuit(data.components, data.wires, new Map(), false);
    setComponents(r.comps);
    setWires(r.wires);
    setNextId(r.localMaxId + 1);
    setSelectedComponents([]);
    setSelectedPin(null);
    setSelectedWire(null);
    setSelectedWaypoint(null);
    draw();
    return true;
  } catch (e) { console.error(e); return false; }
}

function loadFromLocalStorage() {
  const s = localStorage.getItem("logicSimulatorAutoSave");
  if (s) loadSerializedState(s);
}

// ==================== UNDO / REDO / PERSISTENCE ====================
function pushHistory(state = serializeState()) {
  if (undoStack.length > 0 && undoStack[undoStack.length - 1] === state) return;
  undoStack.push(state);
  if (undoStack.length > 50) undoStack.shift();
  redoStack.length = 0;
  saveToLocalStorage();
}

function performUndo() {
  if (undoStack.length === 0) return;
  redoStack.push(serializeState());
  loadSerializedState(undoStack.pop());
  saveToLocalStorage();
}

function performRedo() {
  if (redoStack.length === 0) return;
  undoStack.push(serializeState());
  loadSerializedState(redoStack.pop());
  saveToLocalStorage();
}

function saveToLocalStorage() {
  localStorage.setItem("logicSimulatorAutoSave", serializeState());
  const ws = workspaces.find(w => w.id === activeWorkspaceId);
  if (ws) { ws.data = serializeState(); saveWorkspaceList(); }
}

// ==================== ZOOM ====================
zoomIndicator.addEventListener("click", () => { resetCamera(); draw(); });
zoomInBtn.addEventListener("click", e => { e.stopPropagation(); zoomAtCenter(1.1, canvas.width / getDpr(), canvas.height / getDpr(), zoomIndicator); draw(); });
zoomOutBtn.addEventListener("click", e => { e.stopPropagation(); zoomAtCenter(1 / 1.1, canvas.width / getDpr(), canvas.height / getDpr(), zoomIndicator); draw(); });

canvas.addEventListener("wheel", e => {
  e.preventDefault();
  if (document.activeElement === labelEditor) labelEditor.blur();
  const r = canvas.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  const wb = screenToWorld(mx, my, camera);
  camera.zoom = Math.max(0.1, Math.min(5, camera.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
  const wa = screenToWorld(mx, my, camera);
  camera.x += (wa.x - wb.x) * camera.zoom;
  camera.y += (wa.y - wb.y) * camera.zoom;
  zoomIndicator.textContent = Math.round(camera.zoom * 100) + "%";
  saveCameraState();
  draw();
}, { passive: false });

// ==================== SIMULATION ====================
let simInterval = null;
toggleSimBtn.addEventListener("click", () => {
  setSimulating(!isSimulating);
  components.forEach(c => { if (c.resetLogicState) c.resetLogicState(); });
  if (isSimulating) {
    simInterval = setInterval(() => {
      let changed = false;
      components.forEach(c => { if (c.calculateNextState) c.calculateNextState(); });
      components.forEach(c => { if (c.applyNextState && c.applyNextState()) changed = true; });
      if (changed) draw();
    }, 1);
    toggleSimBtn.classList.remove("stopped");
    toggleSimBtn.setAttribute("data-tooltip", "Stop Simulation (Space)");
  } else {
    clearInterval(simInterval);
    simInterval = null;
    toggleSimBtn.classList.add("stopped");
    toggleSimBtn.setAttribute("data-tooltip", "Play Simulation (Space)");
  }
  draw();
  toggleSimBtn.blur();
});

function simTick() {
  if (!isSimulating) return;
  let changed = false;
  components.forEach(c => { if (c.calculateNextState) c.calculateNextState(); });
  components.forEach(c => { if (c.applyNextState && c.applyNextState()) changed = true; });
  if (changed) draw();
}

// ==================== MOUSE ====================
function cCoords(e) {
  const r = canvas.getBoundingClientRect();
  return { sx: e.clientX - r.left, sy: e.clientY - r.top, w: screenToWorld(e.clientX - r.left, e.clientY - r.top, camera) };
}

canvas.addEventListener("mousedown", e => {
  if (document.activeElement === labelEditor && e.target !== labelEditor) labelEditor.blur();
  if (popup.classList.contains("show") || helpModal.classList.contains("show") || workspaceModal.classList.contains("show")) return;

  setHistoryTempState(serializeState());
  const { sx, sy, w } = cCoords(e);
  setMousePos({ x: sx, y: sy });
  setSelectedWaypoint(null);

  // Waypoint
  if (selectedWire?.waypoints) {
    for (let i = 0; i < selectedWire.waypoints.length; i++) {
      if (Math.hypot(w.x - selectedWire.waypoints[i].x, w.y - selectedWire.waypoints[i].y) < 15 / camera.zoom) {
        setDraggingWaypoint({ wire: selectedWire, index: i });
        setSelectedWaypoint({ wire: selectedWire, index: i });
        setDragStartMousePos({ x: sx, y: sy });
        draw(); return;
      }
    }
  }

  // Pin
  for (let c of [...components].reverse()) {
    const pi = c.getPinAt(w.x, w.y);
    if (pi) { setDraggingPin(pi); setDragStartMousePos({ x: sx, y: sy }); setPinDragDidMove(false); setSelectedPin(pi); setSelectedWire(null); setSelectedComponents([]); draw(); return; }
  }

  // Wire
  for (let ww of wires) {
    const hi = isPointNearWire(w.x, w.y, ww);
    if (hi.hit) { setSelectedWire(ww); setSelectedPin(null); setSelectedComponents([]); setDraggingPin(null); setPotentialWaypoint({ wire: ww, segmentIndex: hi.segmentIndex, startX: w.x, startY: w.y }); draw(); return; }
  }

  // Resize
  for (let c of [...components].reverse()) {
    if (c.type === "label_box" && c.getResizeHandleAt(w.x, w.y)) {
      setResizingComponent(c); setDragStartWorld({ x: w.x, y: w.y }); setResizeStart({ w: c.width, h: c.height });
      setSelectedPin(null); setSelectedWire(null);
      if (!selectedComponents.includes(c)) setSelectedComponents([c]);
      draw(); return;
    }
  }

  // Component click
  for (const g of [
    components.filter(c => c.type === "label"),
    components.filter(c => c.type !== "label_box" && c.type !== "label"),
    components.filter(c => c.type === "label_box"),
  ]) {
    for (let c of [...g].reverse()) {
      if (c.containsPoint(w.x, w.y)) { compClick(c, w, sx, sy, e); draw(); return; }
    }
  }

  if (isSelectMode || e.shiftKey || e.metaKey || e.ctrlKey) {
    setSelectingBox(true);
    setSelectionBoxStart({ x: w.x, y: w.y });
    setSelectionBoxEnd({ x: w.x, y: w.y });
    setSelectedPin(null); setSelectedWire(null);
    if (!e.shiftKey && !e.metaKey && !e.ctrlKey) setSelectedComponents([]);
    draw(); return;
  }

  setDraggingCanvas(true);
  setDragStart({ x: e.clientX - camera.x, y: e.clientY - camera.y });
  setSelectedPin(null); setSelectedWire(null); setSelectedComponents([]);
  draw();
});

canvas.addEventListener("mousemove", e => {
  const { sx, sy, w } = cCoords(e);
  setMousePos({ x: sx, y: sy });

  setHoveredPin(null);
  for (let c of components) {
    const pi = c.getPinAt(w.x, w.y);
    if (pi) { if (isDraggingPin) { if (pi.type !== isDraggingPin.type) setHoveredPin(pi); } else setHoveredPin(pi); break; }
  }

  canvas.style.cursor =
    isResizingComponent ? "nwse-resize" :
    isDraggingCanvas || isDraggingWaypoint ? "grabbing" :
    isSelectMode && !isDraggingPin && !isDraggingComponent ? "crosshair" : "grab";

  if (isDraggingWaypoint) {
    isDraggingWaypoint.wire.waypoints[isDraggingWaypoint.index] = { x: snapToGrid(w.x), y: snapToGrid(w.y) };
    draw(); return;
  }

  if (potentialWaypoint && Math.hypot(w.x - potentialWaypoint.startX, w.y - potentialWaypoint.startY) > 5 / camera.zoom) {
    const wire = potentialWaypoint.wire;
    if (!wire.waypoints?.length) {
      const fX = wire.from.component.x + wire.from.pin.x, fY = wire.from.component.y + wire.from.pin.y;
      const tX = wire.to.component.x + wire.to.pin.x, tY = wire.to.component.y + wire.to.pin.y;
      wire.waypoints = getOrthogonalPath(fX, fY, tX, tY, wire.from.component === wire.to.component).slice(1, -1);
    }
    wire.waypoints.splice(potentialWaypoint.segmentIndex, 0, { x: snapToGrid(w.x), y: snapToGrid(w.y) });
    setDraggingWaypoint({ wire, index: potentialWaypoint.segmentIndex });
    setSelectedWaypoint({ wire, index: potentialWaypoint.segmentIndex });
    setPotentialWaypoint(null);
    draw(); return;
  }

  if (isSelectingBox) setSelectionBoxEnd({ x: w.x, y: w.y });
  else if (isResizingComponent) {
    isResizingComponent.width = Math.max(60, snapToGrid(Math.max(100, resizeStart.w + (w.x - dragStartWorld.x))));
    isResizingComponent.height = Math.max(30, snapToGrid(Math.max(60, resizeStart.h + (w.y - dragStartWorld.y))));
  } else if (isDraggingCanvas) { camera.x = e.clientX - dragStart.x; camera.y = e.clientY - dragStart.y; }
  else if (isDraggingComponent) {
    const dx = w.x - dragStartWorld.x, dy = w.y - dragStartWorld.y;
    if (Math.abs(sx - dragStartMousePos.x) > 3 || Math.abs(sy - dragStartMousePos.y) > 3) setComponentDragDidMove(true);
    let dispX = 0, dispY = 0;
    selectedComponents.forEach(c => {
      const init = selectedComponentsInitPos.find(p => p.id === c.id);
      if (init) { c.x = snapToGrid(init.x + dx); c.y = snapToGrid(init.y + dy); dispX = c.x - init.x; dispY = c.y - init.y; }
    });
    affectedWiresInitWaypoints.forEach(e => { e.wire.waypoints = e.initialWaypoints.map(wp => ({ x: wp.x + dispX, y: wp.y + dispY })); });
  } else if (isDraggingPin && Math.hypot(sx - dragStartMousePos.x, sy - dragStartMousePos.y) > 5) setPinDragDidMove(true);

  draw();
});

canvas.addEventListener("mouseup", e => {
  const { sx, sy, w } = cCoords(e);
  setPotentialWaypoint(null);

  if (isDraggingWaypoint) setDraggingWaypoint(null);
  else if (isSelectingBox) {
    const dx = Math.abs(selectionBoxEnd.x - selectionBoxStart.x) * camera.zoom;
    const dy = Math.abs(selectionBoxEnd.y - selectionBoxStart.y) * camera.zoom;
    if (dx > 3 || dy > 3) {
      const minX = Math.min(selectionBoxStart.x, selectionBoxEnd.x), maxX = Math.max(selectionBoxStart.x, selectionBoxEnd.x);
      const minY = Math.min(selectionBoxStart.y, selectionBoxEnd.y), maxY = Math.max(selectionBoxStart.y, selectionBoxEnd.y);
      const r = [...selectedComponents];
      components.forEach(c => { if (c.x <= maxX && c.x + c.width >= minX && c.y <= maxY && c.y + c.height >= minY && !r.includes(c)) r.push(c); });
      setSelectedComponents(r);
    }
    setSelectingBox(false);
  } else if (isDraggingPin) {
    if (pinDragDidMove) {
      let tp = null;
      for (let c of components) { const pi = c.getPinAt(w.x, w.y); if (pi && pi.type !== isDraggingPin.type) { tp = pi; break; } }
      if (tp) {
        const fp = isDraggingPin.type === "output" ? isDraggingPin : tp;
        const top = isDraggingPin.type === "input" ? isDraggingPin : tp;
        if (!wireExists(wires, fp, top)) { wires.push({ from: fp, to: top }); top.pin.connections.push(fp.component); if (isSimulating) simTick(); }
      } else {
        popup.style.left = sx + "px"; popup.style.top = sy + "px";
        popup.classList.add("show"); setPopupVisible(true); setPopupSelectedIndex(0); setPopupSourcePin(isDraggingPin);
        updatePopupSel();
      }
    }
    setDraggingPin(null); setHoveredPin(null);
  } else if (isDraggingComponent) {
    if (!componentDragDidMove && !e.shiftKey && !e.metaKey && !e.ctrlKey) setSelectedComponents([isDraggingComponent]);
    setDraggingComponent(null);
  }

  setResizingComponent(null);
  if (isDraggingCanvas) saveCameraState();
  setDraggingCanvas(false);
  canvas.style.cursor = "";
  setAffectedWiresInitWaypoints([]);

  const ns = serializeState();
  if (historyTempState && historyTempState !== ns) {
    undoStack.push(historyTempState);
    if (undoStack.length > 50) undoStack.shift();
    redoStack.length = 0;
    saveToLocalStorage();
  }
  setHistoryTempState(null);
  draw();
});

canvas.addEventListener("dblclick", e => {
  const { w } = cCoords(e);
  for (let c of [...components].reverse()) {
    if (["label_box", "custom_ic", "label", "input", "output"].includes(c.type) && c.containsPoint(w.x, w.y)) {
      openLabelEditor(c); return;
    }
  }
  for (let ww of wires) {
    if (isPointNearWire(w.x, w.y, ww).hit) { pushHistory(); delete ww.waypoints; saveToLocalStorage(); draw(); return; }
  }
});

// ==================== KEYBOARD ====================
document.addEventListener("keydown", e => {
  if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;

  if (e.key.toLowerCase() === "h" && !e.metaKey && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); helpModal.classList.toggle("show"); return; }
  if ((e.key === " " || e.code === "Space") && !e.metaKey && !e.ctrlKey) { e.preventDefault(); toggleSimBtn.click(); return; }
  if (e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); e.shiftKey ? document.getElementById("unpackIcBtn").click() : document.getElementById("createIcBtn").click(); return; }
  if (helpModal.classList.contains("show") && e.key !== "Escape") return;
  if (workspaceModal.classList.contains("show") && e.key !== "Escape") return;
  if (e.key === "=" || e.key === "+") { e.preventDefault(); zoomAtCenter(1.05, canvas.width / getDpr(), canvas.height / getDpr(), zoomIndicator); draw(); return; }
  if (e.key === "-") { e.preventDefault(); zoomAtCenter(1 / 1.05, canvas.width / getDpr(), canvas.height / getDpr(), zoomIndicator); draw(); return; }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? performRedo() : performUndo(); return; }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") { e.preventDefault(); performRedo(); return; }
  if (e.key.toLowerCase() === "v" && !e.metaKey && !e.ctrlKey) { setSelectMode(false); modeUI(); draw(); return; }
  if (e.key.toLowerCase() === "s" && !e.metaKey && !e.ctrlKey) { setSelectMode(true); modeUI(); draw(); return; }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") { e.preventDefault(); doCopy(e.shiftKey); return; }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v") { e.preventDefault(); doPaste(); return; }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
    e.preventDefault(); setSelectedComponents([...components]); setSelectedPin(null); setSelectedWire(null); setSelectedWaypoint(null);
    if (popupVisible) { popup.classList.remove("show"); setPopupVisible(false); setPopupSourcePin(null); }
    draw(); return;
  }
  if ((e.metaKey || e.ctrlKey) && e.key === "0") { e.preventDefault(); resetCamera(); draw(); return; }
  if ((e.key === "Delete" || e.key === "Backspace") && (selectedPin || selectedWire || selectedComponents.length > 0 || selectedWaypoint)) { e.preventDefault(); doDelete(); return; }

  if (popupVisible) {
    const items = popup.querySelectorAll(".popup-item");
    if (e.key === "ArrowDown") { e.preventDefault(); setPopupSelectedIndex((popupSelectedIndex + 1) % items.length); updatePopupSel(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setPopupSelectedIndex((popupSelectedIndex - 1 + items.length) % items.length); updatePopupSel(); }
    else if (e.key === "Enter") { e.preventDefault(); selectPopupItem(); }
    else if (e.key === "Escape") { popup.classList.remove("show"); setPopupVisible(false); setPopupSourcePin(null); }
    return;
  }

  if (e.key === "1") autoSpawn("input");
  else if (e.key === "2") autoSpawn("output");
  else if (e.key === "3") autoSpawn("gate");
  else if (e.key === "4") autoSpawn("not_gate");
  else if (e.key === "5") autoSpawn("label_box");
  else if (e.key === "6") autoSpawn("label");
  else if (e.key === "Escape") {
    if (helpModal.classList.contains("show")) { helpModal.classList.remove("show"); return; }
    if (workspaceModal.classList.contains("show")) { workspaceModal.classList.remove("show"); return; }
    setSelectedPin(null); setSelectedWire(null); setSelectedComponents([]);
    setDraggingPin(null); setHoveredPin(null); setSelectedWaypoint(null);
    draw();
  }
});

// ==================== MODE UI ====================
function modeUI() { modePanBtn?.classList.toggle("active", !isSelectMode); modeSelectBtn?.classList.toggle("active", isSelectMode); }
modePanBtn?.addEventListener("click", () => { setSelectMode(false); modeUI(); });
modeSelectBtn?.addEventListener("click", () => { setSelectMode(true); modeUI(); });

// ==================== NAV SPAWN ====================
document.querySelectorAll(".nav-item[data-type]").forEach(btn => {
  btn.addEventListener("click", () => { if (btn.dataset.type) autoSpawn(btn.dataset.type); btn.blur(); });
});

function autoSpawn(type) {
  pushHistory();
  const r = canvas.getBoundingClientRect();
  const w = screenToWorld(r.width / 2, r.height / 2, camera);
  let cw = 90, ch = 60;
  if (type === "label_box") { cw = 255; ch = 180; } else if (type === "output") { cw = GRID_SIZE; ch = GRID_SIZE; } else if (type === "label") { cw = 150; ch = 40; }
  let bx = snapToGrid(w.x - cw / 2), by = snapToGrid(w.y - ch / 2), off = 0;
  while (components.some(c => Math.abs(c.x - (bx + off)) < 5 && Math.abs(c.y - (by + off)) < 5)) off += GRID_SIZE / 2;
  components.push(new Component(type, bx + off, by + off));
  saveToLocalStorage();
  draw();
}

// ==================== COMPONENT CLICK ====================
function compClick(comp, w, sx, sy, e) {
  const multi = e.shiftKey || e.metaKey || e.ctrlKey;
  if (multi) {
    const arr = selectedComponents.includes(comp) ? selectedComponents.filter(c => c !== comp) : [...selectedComponents, comp];
    setSelectedComponents(arr); setDraggingComponent(comp);
    if (comp.type === "input" && arr.includes(comp)) { comp.state = !comp.state; if (isSimulating) simTick(); }
  } else {
    if (!selectedComponents.includes(comp)) setSelectedComponents([comp]);
    setDraggingComponent(comp);
    if (comp.type === "input") { comp.state = !comp.state; if (isSimulating) simTick(); }
  }
  setSelectedPin(null); setSelectedWire(null);
  if (isDraggingComponent) {
    setDragStartWorld({ x: w.x, y: w.y });
    setDragStartMousePos({ x: sx, y: sy });
    setSelectedComponentsInitPos(selectedComponents.map(c => ({ id: c.id, x: c.x, y: c.y })));
    setComponentDragDidMove(false);
    const affected = [];
    wires.forEach(ww => {
      const fS = selectedComponents.includes(ww.from.component), tS = selectedComponents.includes(ww.to.component);
      if ((fS || tS) && ww.waypoints?.length) affected.push({ wire: ww, fromSelected: fS, toSelected: tS, initialWaypoints: ww.waypoints.map(wp => ({ x: wp.x, y: wp.y })) });
    });
    setAffectedWiresInitWaypoints(affected);
  }
}

// ==================== POPUP ====================
function updatePopupSel() { popup.querySelectorAll(".popup-item").forEach((item, i) => item.classList.toggle("selected", i === popupSelectedIndex)); }
popup.querySelectorAll(".popup-item").forEach((item, i) => {
  item.addEventListener("mouseenter", () => { setPopupSelectedIndex(i); updatePopupSel(); });
  item.addEventListener("click", selectPopupItem);
});
document.addEventListener("mousedown", e => { if (popupVisible && !popup.contains(e.target)) { popup.classList.remove("show"); setPopupVisible(false); setPopupSourcePin(null); } });

function selectPopupItem() {
  pushHistory();
  const type = popup.querySelectorAll(".popup-item")[popupSelectedIndex].dataset.type;
  const r = popup.getBoundingClientRect();
  const w = screenToWorld(r.left, r.top, camera);
  const comp = new Component(type, snapToGrid(w.x), snapToGrid(w.y));
  components.push(comp);
  if (popupSourcePin) {
    if (popupSourcePin.type === "output" && comp.inputs.length > 0) {
      const tp = { pin: comp.inputs[0], type: "input", component: comp };
      wires.push({ from: popupSourcePin, to: tp }); tp.pin.connections.push(popupSourcePin.component);
    } else if (popupSourcePin.type === "input" && comp.outputs.length > 0) {
      const sp = { pin: comp.outputs[0], type: "output", component: comp };
      wires.push({ from: sp, to: popupSourcePin }); popupSourcePin.pin.connections.push(comp);
    }
    if (isSimulating) simTick();
  }
  popup.classList.remove("show"); setPopupVisible(false); setPopupSourcePin(null);
  saveToLocalStorage();
  draw();
}

// ==================== DELETE ====================
function doDelete() {
  if (!selectedPin && !selectedWire && selectedComponents.length === 0 && !selectedWaypoint) return;
  pushHistory();
  if (selectedWaypoint) {
    selectedWaypoint.wire.waypoints.splice(selectedWaypoint.index, 1);
    if (selectedWaypoint.wire.waypoints.length === 0) delete selectedWaypoint.wire.waypoints;
    setSelectedWaypoint(null);
  } else if (selectedPin) { setWires(removeWiresForPin(selectedPin, [...wires])); setSelectedPin(null); }
  else if (selectedWire) { setWires(wires.filter(w => w !== selectedWire)); setSelectedWire(null); }
  else if (selectedComponents.length > 0) {
    selectedComponents.forEach(c => { setWires(wires.filter(w => w.from.component !== c && w.to.component !== c)); });
    setComponents(components.filter(c => !selectedComponents.includes(c)));
    setSelectedComponents([]);
  }
  if (isSimulating) simTick();
  saveToLocalStorage();
  draw();
}

// ==================== COPY / PASTE ====================
let clipboard = (() => { try { const s = localStorage.getItem("logicSimulatorClipboard"); return s ? JSON.parse(s) : null; } catch (e) { return null; } })();
let pasteOffset = 30;

function doCopy(internal = false) {
  if (internal) {
    const ics = selectedComponents.filter(c => c.type === "custom_ic");
    if (ics.length === 1) { clipboard = serializeCircuit(ics[0].internalComponents, ics[0].internalWires); pasteOffset = 30; }
  } else if (selectedComponents.length > 0) {
    const sw = wires.filter(w => selectedComponents.includes(w.from.component) && selectedComponents.includes(w.to.component));
    clipboard = serializeCircuit(selectedComponents, sw); pasteOffset = 30;
  }
  if (clipboard) { try { localStorage.setItem("logicSimulatorClipboard", JSON.stringify(clipboard)); } catch (e) {} }
}

function doPaste() {
  if (!clipboard?.components?.length) return;
  pushHistory();
  const r = parseCircuit(clipboard.components, clipboard.wires, new Map(), true);
  setSelectedComponents([]);
  r.comps.forEach(c => {
    c.x = snapToGrid(c.x + pasteOffset); c.y = snapToGrid(c.y + pasteOffset);
    components.push(c); selectedComponents.push(c);
  });
  r.wires.forEach(w => {
    if (w.waypoints) w.waypoints.forEach(wp => { wp.x += pasteOffset; wp.y += pasteOffset; });
    wires.push(w);
  });
  pasteOffset += 30;
  saveToLocalStorage();
  draw();
}

// ==================== LABEL EDITOR ====================
let editingComponent = null;

function openLabelEditor(comp) {
  editingComponent = comp;
  labelEditor.value = comp.label || "";
  labelEditor.style.display = "block";
  const sp = { x: comp.x * camera.zoom + camera.x + 12 * camera.zoom, y: comp.y * camera.zoom + camera.y + 12 * camera.zoom };
  labelEditor.style.left = sp.x + "px";
  labelEditor.style.top = (sp.y - 4) + "px";
  labelEditor.style.transform = `scale(${camera.zoom})`;
  labelEditor.style.transformOrigin = "left top";
  labelEditor.focus();
  labelEditor.select();
}

labelEditor.addEventListener("blur", () => {
  if (!editingComponent) return;
  if (editingComponent.label !== labelEditor.value) {
    pushHistory();
    editingComponent.label = labelEditor.value || { custom_ic: "Custom IC", label: "Label", label_box: "Label Box" }[editingComponent.type] || "";
    if (editingComponent.type === "custom_ic") {
      const ctx = getMainCtx();
      ctx.font = "bold 14px sans-serif";
      const tw = ctx.measureText(editingComponent.label).width;
      let mi = 0, mo = 0;
      editingComponent.inputs.forEach(p => { if (p.label) mi = Math.max(mi, p.label.length); });
      editingComponent.outputs.forEach(p => { if (p.label) mo = Math.max(mo, p.label.length); });
      const nw = Math.max(90, Math.round((Math.max(tw, (mi + mo) * 6.5 + 24) + 40) / (GRID_SIZE / 2)) * (GRID_SIZE / 2));
      if (nw !== editingComponent.width) { editingComponent.width = nw; editingComponent.outputs.forEach(p => p.x = nw); }
    } else if (editingComponent.type === "label") {
      getMainCtx().font = "bold 18px sans-serif";
      editingComponent.width = Math.max(60, getMainCtx().measureText(editingComponent.label).width + 40);
    }
    saveToLocalStorage();
  }
  editingComponent = null;
  labelEditor.style.display = "none";
  draw();
});
labelEditor.addEventListener("keydown", e => { if (e.key === "Enter") labelEditor.blur(); e.stopPropagation(); });

// ==================== HAMBURGER MENU ====================
menuBtn?.addEventListener("click", e => { e.stopPropagation(); menuDropdown.classList.toggle("show"); });
document.addEventListener("click", e => { if (menuDropdown?.classList.contains("show") && !menuDropdown.contains(e.target) && e.target !== menuBtn) menuDropdown.classList.remove("show"); });
menuDropdown?.querySelectorAll(".menu-item").forEach(item => item.addEventListener("click", () => menuDropdown.classList.remove("show")));

// ==================== MODALS ====================
closeHelpBtn?.addEventListener("click", () => helpModal.classList.remove("show"));
helpModal?.addEventListener("mousedown", e => { if (e.target === helpModal) helpModal.classList.remove("show"); });

// ==================== MENU ACTIONS ====================
document.getElementById("exportBtn")?.addEventListener("click", () => {
  const blob = new Blob([serializeState()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "circuit.json";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
});
document.getElementById("importBtn")?.addEventListener("click", () => document.getElementById("importInput").click());
document.getElementById("importInput")?.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = event => {
    pushHistory();
    if (loadSerializedState(event.target.result)) saveToLocalStorage();
    else { alert("Invalid circuit file."); undoStack.pop(); }
    document.getElementById("importInput").value = "";
  };
  reader.readAsText(file);
});
document.getElementById("createIcBtn")?.addEventListener("click", () => {
  const sel = selectedComponents.filter(c => c.type !== "label_box" && c.type !== "label");
  const ins = sel.filter(c => c.type === "input").sort((a, b) => a.y - b.y);
  const outs = sel.filter(c => c.type === "output").sort((a, b) => a.y - b.y);
  if (ins.length === 0 && outs.length === 0) { alert("Selection must include Input or Output."); return; }
  const name = prompt("Custom IC Name:", "Custom IC");
  if (!name) return;
  pushHistory();
  let minX = Infinity, minY = Infinity;
  sel.forEach(c => { minX = Math.min(minX, c.x); minY = Math.min(minY, c.y); });
  const ic = new Component("custom_ic", minX, minY);
  ic.label = name;
  const ps = 30;
  ic.height = Math.round(Math.max(60, (Math.max(ins.length, outs.length) + 1) * ps) / (GRID_SIZE / 2)) * (GRID_SIZE / 2);
  const ctx = getMainCtx(); ctx.font = "bold 14px sans-serif";
  const tw = ctx.measureText(name).width;
  let mi = 0, mo = 0;
  ins.forEach((c, i) => mi = Math.max(mi, (c.label || `In${i + 1}`).length));
  outs.forEach((c, i) => mo = Math.max(mo, (c.label || `Out${i + 1}`).length));
  ic.width = Math.max(90, Math.round((Math.max(tw, (mi + mo) * 6.5 + 24) + 40) / (GRID_SIZE / 2)) * (GRID_SIZE / 2));
  ic.inputs = ins.map((c, i) => ({ x: 0, y: (i + 1) * ps, internalTargetId: c.id, label: c.label || `In${i + 1}`, connections: [] }));
  ic.outputs = outs.map((c, i) => ({ x: ic.width, y: (i + 1) * ps, internalSourceId: c.id, label: c.label || `Out${i + 1}`, connections: [] }));
  ic.internalComponents = [...sel];
  const iw = wires.filter(w => sel.includes(w.from.component) && sel.includes(w.to.component));
  ic.internalWires = iw;
  wires.forEach(w => {
    if (iw.includes(w)) return;
    if (outs.includes(w.from.component)) { const p = ic.outputs.find(o => o.internalSourceId === w.from.component.id); if (p) w.from = { pin: p, type: "output", component: ic }; }
    if (ins.includes(w.to.component)) { const p = ic.inputs.find(i => i.internalTargetId === w.to.component.id); if (p) { w.to = { pin: p, type: "input", component: ic }; p.connections.push(w.from.component); } }
  });
  setComponents(components.filter(c => !sel.includes(c)));
  setWires(wires.filter(w => !iw.includes(w)));
  setWires(wires.filter(w => (components.includes(w.from.component) || w.from.component === ic) && (components.includes(w.to.component) || w.to.component === ic)));
  components.push(ic);
  setSelectedComponents([ic]);
  saveToLocalStorage();
  draw();
});
document.getElementById("unpackIcBtn")?.addEventListener("click", () => {
  const ics = selectedComponents.filter(c => c.type === "custom_ic");
  if (ics.length === 0) return;
  pushHistory();
  let ns = [];
  ics.forEach(ic => {
    let ox = Infinity, oy = Infinity;
    ic.internalComponents.forEach(c => { ox = Math.min(ox, c.x); oy = Math.min(oy, c.y); });
    if (ox === Infinity) ox = ic.x;
    if (oy === Infinity) oy = ic.y;
    const dx = ic.x - ox, dy = ic.y - oy;
    ic.internalComponents.forEach(c => { c.x += dx; c.y += dy; components.push(c); ns.push(c); });
    ic.internalWires.forEach(w => { if (w.waypoints) w.waypoints.forEach(wp => { wp.x += dx; wp.y += dy; }); wires.push(w); });
    setWires(wires.filter(w => w.from.component !== ic && w.to.component !== ic));
    setComponents(components.filter(c => c !== ic));
  });
  setSelectedComponents(ns);
  saveToLocalStorage();
  draw();
});
document.getElementById("copyBtn")?.addEventListener("click", () => doCopy());
document.getElementById("pasteBtn")?.addEventListener("click", () => doPaste());
document.getElementById("deleteBtn")?.addEventListener("click", () => doDelete());
document.getElementById("helpBtn")?.addEventListener("click", () => helpModal.classList.toggle("show"));

// ==================== WORKSPACES ====================
let workspaces = [];
let activeWorkspaceId = "default";

function initWorkspaces() {
  try {
    const s = localStorage.getItem("logicSimulatorWorkspaces");
    if (s) workspaces = JSON.parse(s);
  } catch (e) {}
  activeWorkspaceId = localStorage.getItem("logicSimulatorActiveWorkspaceId") || "default";
  if (workspaces.length === 0) {
    workspaces.push({ id: "default", name: "Default Workspace", data: localStorage.getItem("logicSimulatorAutoSave") || serializeState() });
    activeWorkspaceId = "default";
    saveWorkspaceList();
  }
}

function saveWorkspaceList() {
  localStorage.setItem("logicSimulatorWorkspaces", JSON.stringify(workspaces));
  localStorage.setItem("logicSimulatorActiveWorkspaceId", activeWorkspaceId);
}

function renderWorkspaceList() {
  const list = document.getElementById("workspaceList");
  list.innerHTML = "";
  workspaces.forEach(ws => {
    const item = document.createElement("div");
    item.className = `workspace-item ${ws.id === activeWorkspaceId ? "active" : ""}`;
    const nc = document.createElement("div"); nc.className = "workspace-name-container";
    const ns = document.createElement("span"); ns.className = "workspace-name"; ns.textContent = ws.name;
    const st = document.createElement("span"); st.className = "workspace-status"; st.textContent = ws.id === activeWorkspaceId ? "Active Workspace" : "Inactive";
    nc.appendChild(ns); nc.appendChild(st); item.appendChild(nc);
    const ac = document.createElement("div"); ac.className = "workspace-actions";
    if (ws.id !== activeWorkspaceId) {
      const lb = document.createElement("button"); lb.className = "workspace-action-btn"; lb.textContent = "Load";
      lb.addEventListener("click", () => { activeWorkspaceId = ws.id; saveWorkspaceList(); if (ws.data) loadSerializedState(ws.data); renderWorkspaceList(); draw(); });
      ac.appendChild(lb);
    }
    if (workspaces.length > 1) {
      const db = document.createElement("button"); db.className = "workspace-action-btn delete"; db.textContent = "Delete";
      db.addEventListener("click", () => { if (!confirm("Delete this workspace?")) return; workspaces = workspaces.filter(w => w.id !== ws.id); if (activeWorkspaceId === ws.id) { activeWorkspaceId = workspaces[0]?.id || "default"; const t = workspaces.find(w => w.id === activeWorkspaceId); if (t?.data) loadSerializedState(t.data); } saveWorkspaceList(); renderWorkspaceList(); draw(); });
      ac.appendChild(db);
    }
    item.appendChild(ac);
    list.appendChild(item);
  });
}

document.getElementById("workspacesBtn")?.addEventListener("click", () => { workspaceModal.classList.add("show"); renderWorkspaceList(); });
closeWorkspaceBtn?.addEventListener("click", () => workspaceModal.classList.remove("show"));
workspaceModal?.addEventListener("mousedown", e => { if (e.target === workspaceModal) workspaceModal.classList.remove("show"); });

document.getElementById("saveWorkspaceBtn")?.addEventListener("click", () => {
  const input = document.getElementById("newWorkspaceName");
  const name = input.value.trim();
  if (!name) return;
  const id = "ws-" + Date.now();
  const empty = JSON.stringify({ components: [], wires: [] });
  workspaces.push({ id, name, data: empty });
  activeWorkspaceId = id;
  saveWorkspaceList();
  input.value = "";
  loadSerializedState(empty);
  renderWorkspaceList();
  draw();
});

// ==================== MINIMAP EVENTS ====================
let isDraggingMinimap = false;
const minimapConfig = getMinimapConfig();

minimapCanvas.addEventListener("mousedown", e => {
  if (helpModal.classList.contains("show") || workspaceModal.classList.contains("show")) return;
  isDraggingMinimap = true;
  updateCamFromMinimap(e);
  e.stopPropagation();
});
window.addEventListener("mousemove", e => { if (isDraggingMinimap) updateCamFromMinimap(e); });
window.addEventListener("mouseup", () => { if (isDraggingMinimap) saveCameraState(); isDraggingMinimap = false; });
minimapCanvas.addEventListener("wheel", e => {
  e.preventDefault();
  canvas.dispatchEvent(new WheelEvent("wheel", { deltaY: e.deltaY, clientX: e.clientX, clientY: e.clientY }));
}, { passive: false });

function updateCamFromMinimap(e) {
  const r = minimapCanvas.getBoundingClientRect();
  const mx = (e.clientX - r.left) * (200 / r.width);
  const my = (e.clientY - r.top) * (150 / r.height);
  const wx = (mx - minimapConfig.offsetX) / minimapConfig.mapScale + minimapConfig.mapMinX;
  const wy = (my - minimapConfig.offsetY) / minimapConfig.mapScale + minimapConfig.mapMinY;
  camera.x = canvas.width / getDpr() / 2 - wx * camera.zoom;
  camera.y = canvas.height / getDpr() / 2 - wy * camera.zoom;
  draw();
}

// ==================== TOUCH ====================
(function() {
  let pinchDist = null, lastTap = 0;
  [canvas, minimapCanvas].forEach(el => {
    el.addEventListener("touchstart", e => {
      if (e.target !== el) return;
      if (e.touches.length === 2) { e.preventDefault(); pinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }
      else if (e.touches.length === 1) {
        e.preventDefault();
        const t = e.touches[0], now = Date.now();
        if (now - lastTap < 300 && lastTap > 0) { el.dispatchEvent(new MouseEvent("dblclick", { clientX: t.clientX, clientY: t.clientY, bubbles: true })); lastTap = 0; }
        else { lastTap = now; el.dispatchEvent(new MouseEvent("mousedown", { clientX: t.clientX, clientY: t.clientY, bubbles: true })); }
      }
    }, { passive: false });
    el.addEventListener("touchmove", e => {
      if (e.target !== el) return;
      if (e.touches.length === 2 && el === canvas) {
        e.preventDefault();
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (pinchDist) {
          const r = canvas.getBoundingClientRect();
          const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left, cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top;
          const wb = screenToWorld(cx, cy, camera);
          camera.zoom = Math.max(0.1, Math.min(5, camera.zoom * (d / pinchDist)));
          const wa = screenToWorld(cx, cy, camera);
          camera.x += (wa.x - wb.x) * camera.zoom; camera.y += (wa.y - wb.y) * camera.zoom;
          zoomIndicator.textContent = Math.round(camera.zoom * 100) + "%";
          draw();
          pinchDist = d;
        }
      } else if (e.touches.length === 1) { e.preventDefault(); el.dispatchEvent(new MouseEvent("mousemove", { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY, bubbles: true })); }
    }, { passive: false });
    el.addEventListener("touchend", e => {
      if (e.target !== el) return;
      e.preventDefault();
      if (pinchDist !== null && e.touches.length < 2) { pinchDist = null; saveCameraState(); }
      if (e.changedTouches.length === 1) el.dispatchEvent(new MouseEvent("mouseup", { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY, bubbles: true }));
    }, { passive: false });
  });
})();

// ==================== BOOT ====================
loadCameraState();
zoomIndicator.textContent = Math.round(camera.zoom * 100) + "%";
initWorkspaces();
const currentWS = workspaces.find(w => w.id === activeWorkspaceId);
if (currentWS?.data && currentWS.data !== "null") loadSerializedState(currentWS.data);
else loadFromLocalStorage();
draw();
