import { GRID_SIZE } from "./constants.js";
import {
  camera, components, wires, selectedComponents, selectedPin, selectedWire, selectedWaypoint,
  isSimulating, clipboard, pasteOffset, editingComponent, workspaces, activeWorkspaceId,
  popupSourcePin, popupSelectedIndex, undoStack,
  setSelectedComponents, setSelectedPin, setSelectedWire, setSelectedWaypoint,
  setClipboard, setPasteOffset, setEditingComponent, setComponents, setWires,
  setPopupVisible, setPopupSourcePin, setPopupSelectedIndex,
  setDraggingComponent, isDraggingComponent,
  setDragStartWorld, setDragStartMousePos,
  setSelectedComponentsInitPos, setComponentDragDidMove, setAffectedWiresInitWaypoints,
  setActiveWorkspaceId,
} from "./state.js";
import { screenToWorld, snapToGrid } from "./utils.js";
import { getMainCtx } from "./canvas.js";
import { draw } from "./render.js";
import { wireExists, removeWiresForPin } from "./wiring.js";
import { pushHistory, saveToLocalStorage, saveWorkspaceList } from "./history.js";
import { simTick } from "./simulation.js";
import { serializeCircuit, parseCircuit, loadSerializedState } from "./serialization.js";
import {
  popup, labelEditor, canvas,
} from "./dom.js";
import { Component } from "./Component.js";
import { renderWorkspaceList } from "./ui/workspace.js";

// Restore clipboard from localStorage on load
try {
  const s = localStorage.getItem("logicSimulatorClipboard");
  if (s) setClipboard(JSON.parse(s));
} catch (e) {
  setClipboard(null);
}
setPasteOffset(30);

// ==================== SPAWN ====================
export function autoSpawn(type) {
  pushHistory();
  const r = canvas.getBoundingClientRect();
  const w = screenToWorld(r.width / 2, r.height / 2, camera);
  let cw = 90, ch = 60;
  if (type === "label_box") { cw = 255; ch = 180; }
  else if (type === "output") { cw = GRID_SIZE; ch = GRID_SIZE; }
  else if (type === "label") { cw = 150; ch = 40; }
  let bx = snapToGrid(w.x - cw / 2), by = snapToGrid(w.y - ch / 2), off = 0;
  while (components.some(c => Math.abs(c.x - (bx + off)) < 5 && Math.abs(c.y - (by + off)) < 5)) off += GRID_SIZE / 2;
  components.push(new Component(type, bx + off, by + off));
  saveToLocalStorage();
  draw();
}

// ==================== COMPONENT CLICK ====================
export function compClick(comp, w, sx, sy, e) {
  const multi = e.shiftKey || e.metaKey || e.ctrlKey;
  if (multi) {
    const arr = selectedComponents.includes(comp)
      ? selectedComponents.filter(c => c !== comp)
      : [...selectedComponents, comp];
    setSelectedComponents(arr);
    setDraggingComponent(comp);
    if (comp.type === "input" && arr.includes(comp)) {
      comp.state = !comp.state;
      if (isSimulating) simTick();
    }
  } else {
    if (!selectedComponents.includes(comp)) setSelectedComponents([comp]);
    setDraggingComponent(comp);
    if (comp.type === "input") {
      comp.state = !comp.state;
      if (isSimulating) simTick();
    }
  }
  setSelectedPin(null);
  setSelectedWire(null);
  if (isDraggingComponent) {
    setDragStartWorld({ x: w.x, y: w.y });
    setDragStartMousePos({ x: sx, y: sy });
    setSelectedComponentsInitPos(selectedComponents.map(c => ({ id: c.id, x: c.x, y: c.y })));
    setComponentDragDidMove(false);
    const affected = [];
    wires.forEach(ww => {
      const fS = selectedComponents.includes(ww.from.component);
      const tS = selectedComponents.includes(ww.to.component);
      if ((fS || tS) && ww.waypoints?.length) {
        affected.push({
          wire: ww, fromSelected: fS, toSelected: tS,
          initialWaypoints: ww.waypoints.map(wp => ({ x: wp.x, y: wp.y })),
        });
      }
    });
    setAffectedWiresInitWaypoints(affected);
  }
}

// ==================== POPUP ====================
export function selectPopupItem() {
  pushHistory();
  const items = popup.querySelectorAll(".popup-item");
  const type = items[popupSelectedIndex].dataset.type;
  const r = popup.getBoundingClientRect();
  const w = screenToWorld(r.left, r.top, camera);
  const comp = new Component(type, snapToGrid(w.x), snapToGrid(w.y));
  components.push(comp);
  if (popupSourcePin) {
    if (popupSourcePin.type === "output" && comp.inputs.length > 0) {
      const tp = { pin: comp.inputs[0], type: "input", component: comp };
      wires.push({ from: popupSourcePin, to: tp });
      tp.pin.connections.push(popupSourcePin.component);
    } else if (popupSourcePin.type === "input" && comp.outputs.length > 0) {
      const sp = { pin: comp.outputs[0], type: "output", component: comp };
      wires.push({ from: sp, to: popupSourcePin });
      popupSourcePin.pin.connections.push(comp);
    }
    if (isSimulating) simTick();
  }
  popup.classList.remove("show");
  setPopupVisible(false);
  setPopupSourcePin(null);
  saveToLocalStorage();
  draw();
}

// ==================== DELETE ====================
export function doDelete() {
  if (!selectedPin && !selectedWire && selectedComponents.length === 0 && !selectedWaypoint) return;
  pushHistory();
  if (selectedWaypoint) {
    selectedWaypoint.wire.waypoints.splice(selectedWaypoint.index, 1);
    if (selectedWaypoint.wire.waypoints.length === 0) delete selectedWaypoint.wire.waypoints;
    setSelectedWaypoint(null);
  } else if (selectedPin) {
    setWires(removeWiresForPin(selectedPin, [...wires]));
    setSelectedPin(null);
  } else if (selectedWire) {
    setWires(wires.filter(w => w !== selectedWire));
    setSelectedWire(null);
  } else if (selectedComponents.length > 0) {
    selectedComponents.forEach(c => {
      setWires(wires.filter(w => w.from.component !== c && w.to.component !== c));
    });
    setComponents(components.filter(c => !selectedComponents.includes(c)));
    setSelectedComponents([]);
  }
  if (isSimulating) simTick();
  saveToLocalStorage();
  draw();
}

// ==================== COPY / PASTE ====================
export function doCopy(internal = false) {
  if (internal) {
    const ics = selectedComponents.filter(c => c.type === "custom_ic");
    if (ics.length === 1) {
      setClipboard(serializeCircuit(ics[0].internalComponents, ics[0].internalWires));
      setPasteOffset(30);
    }
  } else if (selectedComponents.length > 0) {
    const sw = wires.filter(w => selectedComponents.includes(w.from.component) && selectedComponents.includes(w.to.component));
    setClipboard(serializeCircuit(selectedComponents, sw));
    setPasteOffset(30);
  }
  if (clipboard) {
    try {
      localStorage.setItem("logicSimulatorClipboard", JSON.stringify(clipboard));
    } catch (e) {}
  }
}

export function doPaste() {
  if (!clipboard?.components?.length) return;
  pushHistory();
  const r = parseCircuit(clipboard.components, clipboard.wires, new Map(), true);
  setSelectedComponents([]);
  r.comps.forEach(c => {
    c.x = snapToGrid(c.x + pasteOffset);
    c.y = snapToGrid(c.y + pasteOffset);
    components.push(c);
    selectedComponents.push(c);
  });
  r.wires.forEach(w => {
    if (w.waypoints) w.waypoints.forEach(wp => { wp.x += pasteOffset; wp.y += pasteOffset; });
    wires.push(w);
  });
  setPasteOffset(pasteOffset + 30);
  saveToLocalStorage();
  draw();
}

// ==================== LABEL EDITOR ====================
export function openLabelEditor(comp) {
  setEditingComponent(comp);
  labelEditor.value = comp.label || "";
  labelEditor.style.display = "block";
  const sp = {
    x: comp.x * camera.zoom + camera.x + 12 * camera.zoom,
    y: comp.y * camera.zoom + camera.y + 12 * camera.zoom,
  };
  labelEditor.style.left = sp.x + "px";
  labelEditor.style.top = (sp.y - 4) + "px";
  labelEditor.style.transform = `scale(${camera.zoom})`;
  labelEditor.style.transformOrigin = "left top";
  labelEditor.focus();
  labelEditor.select();
}

export function setupLabelEditor() {
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
        if (nw !== editingComponent.width) {
          editingComponent.width = nw;
          editingComponent.outputs.forEach(p => p.x = nw);
        }
      } else if (editingComponent.type === "label") {
        getMainCtx().font = "bold 18px sans-serif";
        editingComponent.width = Math.max(60, getMainCtx().measureText(editingComponent.label).width + 40);
      }
      saveToLocalStorage();
    }
    setEditingComponent(null);
    labelEditor.style.display = "none";
    draw();
  });
  labelEditor.addEventListener("keydown", e => {
    if (e.key === "Enter") labelEditor.blur();
    e.stopPropagation();
  });
}

// ==================== IMPORT / EXPORT ====================
export function setupExportImport() {
  const exportBtn = document.getElementById("exportBtn");
  const importBtn = document.getElementById("importBtn");
  const importInput = document.getElementById("importInput");

  exportBtn?.addEventListener("click", () => {
    const blob = new Blob([serializeState()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "circuit.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  importBtn?.addEventListener("click", () => importInput?.click());
  importInput?.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      pushHistory();
      if (loadSerializedState(event.target.result)) saveToLocalStorage();
      else { alert("Invalid circuit file."); undoStack.pop(); }
      importInput.value = "";
    };
    reader.readAsText(file);
  });
}

// ==================== CUSTOM IC ====================
export function setupICActions() {
  const createIcBtn = document.getElementById("createIcBtn");
  const unpackIcBtn = document.getElementById("unpackIcBtn");

  createIcBtn?.addEventListener("click", () => {
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
    const ctx = getMainCtx();
    ctx.font = "bold 14px sans-serif";
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
      if (outs.includes(w.from.component)) {
        const p = ic.outputs.find(o => o.internalSourceId === w.from.component.id);
        if (p) w.from = { pin: p, type: "output", component: ic };
      }
      if (ins.includes(w.to.component)) {
        const p = ic.inputs.find(i => i.internalTargetId === w.to.component.id);
        if (p) { w.to = { pin: p, type: "input", component: ic }; p.connections.push(w.from.component); }
      }
    });
    setComponents(components.filter(c => !sel.includes(c)));
    setWires(wires.filter(w => !iw.includes(w)));
    setWires(wires.filter(w => (components.includes(w.from.component) || w.from.component === ic) && (components.includes(w.to.component) || w.to.component === ic)));
    components.push(ic);
    setSelectedComponents([ic]);
    saveToLocalStorage();
    draw();
  });

  unpackIcBtn?.addEventListener("click", () => {
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
}

// ==================== WORKSPACE CREATION ====================
export function createWorkspace() {
  const input = document.getElementById("newWorkspaceName");
  const name = input.value.trim();
  if (!name) return;
  const id = "ws-" + Date.now();
  const empty = JSON.stringify({ components: [], wires: [] });
  workspaces.push({ id, name, data: empty });
  setActiveWorkspaceId(id);
  saveWorkspaceList();
  input.value = "";
  loadSerializedState(empty);
  renderWorkspaceList();
  draw();
}
