import {
  camera, components, wires, selectedComponents, selectedWire,
  isSelectMode, isDraggingCanvas, isDraggingComponent, isDraggingPin, isDraggingWaypoint,
  isResizingComponent, isSelectingBox, isRouting, routingSourcePin, routingWaypoints,
  potentialWaypoint, dragStart, dragStartWorld, dragStartMousePos,
  selectionBoxStart, selectionBoxEnd, historyTempState, componentDragDidMove, pinDragDidMove,
  selectedComponentsInitPos, affectedWiresInitWaypoints, isSimulating,
  undoStack, redoStack,
  setHistoryTempState, setMousePos, setSelectedWaypoint, setDraggingWaypoint,
  setDraggingPin, setDragStart, setDragStartWorld, setDragStartMousePos,
  setPinDragDidMove, setSelectedPin, setSelectedWire, setHoveredPin,
  setPotentialWaypoint, setResizingComponent, setResizeStart, setSelectingBox,
  setSelectionBoxStart, setSelectionBoxEnd, setDraggingCanvas, setDraggingComponent,
  setSelectedComponents, setIsRouting, setRoutingSourcePin, setRoutingWaypoints,
  setComponentDragDidMove, setAffectedWiresInitWaypoints,
} from "../state.js";
import { screenToWorld, snapToGrid } from "../utils.js";
import { isPointNearWire, wireExists, getOrthogonalPath } from "../wiring.js";
import { serializeState } from "../serialization.js";
import { pushHistory, saveToLocalStorage } from "../history.js";
import { simTick } from "../simulation.js";
import { compClick, openLabelEditor } from "../actions.js";
import { canvas, labelEditor } from "../dom.js";
import { saveCameraState } from "../camera.js";
import { draw } from "../render.js";

function cCoords(e) {
  const r = canvas.getBoundingClientRect();
  return {
    sx: e.clientX - r.left,
    sy: e.clientY - r.top,
    w: screenToWorld(e.clientX - r.left, e.clientY - r.top, camera),
  };
}

export function setupMouseInput() {
  canvas.addEventListener("mousedown", e => {
    if (document.activeElement === labelEditor && e.target !== labelEditor) labelEditor.blur();
    const helpModal = document.getElementById("helpModal");
    const workspaceModal = document.getElementById("workspaceModal");
    const popup = document.getElementById("componentPopup");
    if (popup?.classList.contains("show") || helpModal?.classList.contains("show") || workspaceModal?.classList.contains("show")) return;

    setHistoryTempState(serializeState());
    const { sx, sy, w } = cCoords(e);
    setMousePos({ x: sx, y: sy });
    setSelectedWaypoint(null);

    // Routing mode
    if (isRouting) {
      let hitPin = null;
      for (let c of [...components].reverse()) {
        const pi = c.getPinAt(w.x, w.y);
        if (pi) { hitPin = pi; break; }
      }
      if (hitPin && hitPin.type !== routingSourcePin.type) {
        const fp = routingSourcePin.type === "output" ? routingSourcePin : hitPin;
        const top = routingSourcePin.type === "input" ? routingSourcePin : hitPin;
        pushHistory();
        if (!wireExists(wires, fp, top)) {
          const nw = { from: fp, to: top };
          if (routingWaypoints.length > 0) nw.waypoints = [...routingWaypoints];
          wires.push(nw);
          top.pin.connections.push(fp.component);
          if (isSimulating) simTick();
        }
        setIsRouting(false); setRoutingSourcePin(null); setRoutingWaypoints([]);
        draw(); return;
      }
      if (hitPin) {
        setIsRouting(false); setRoutingSourcePin(null); setRoutingWaypoints([]);
        draw(); return;
      }
      const nwp = [...routingWaypoints, { x: snapToGrid(w.x), y: snapToGrid(w.y) }];
      setRoutingWaypoints(nwp);
      draw(); return;
    }

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
      if (pi) {
        setDraggingPin(pi);
        setDragStartMousePos({ x: sx, y: sy });
        setPinDragDidMove(false);
        setSelectedPin(pi);
        setSelectedWire(null);
        setSelectedComponents([]);
        draw(); return;
      }
    }

    // Wire
    for (let ww of wires) {
      const hi = isPointNearWire(w.x, w.y, ww);
      if (hi.hit) {
        setSelectedWire(ww);
        setSelectedPin(null);
        setSelectedComponents([]);
        setDraggingPin(null);
        setPotentialWaypoint({ wire: ww, segmentIndex: hi.segmentIndex, startX: w.x, startY: w.y });
        draw(); return;
      }
    }

    // Resize
    for (let c of [...components].reverse()) {
      if (c.type === "label_box" && c.getResizeHandleAt(w.x, w.y)) {
        setResizingComponent(c);
        setDragStartWorld({ x: w.x, y: w.y });
        setResizeStart({ w: c.width, h: c.height });
        setSelectedPin(null);
        setSelectedWire(null);
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
      setSelectedPin(null);
      setSelectedWire(null);
      if (!e.shiftKey && !e.metaKey && !e.ctrlKey) setSelectedComponents([]);
      draw(); return;
    }

    setDraggingCanvas(true);
    setDragStart({ x: e.clientX - camera.x, y: e.clientY - camera.y });
    setSelectedPin(null);
    setSelectedWire(null);
    setSelectedComponents([]);
    draw();
  });

  canvas.addEventListener("mousemove", e => {
    const { sx, sy, w } = cCoords(e);
    setMousePos({ x: sx, y: sy });

    setHoveredPin(null);
    for (let c of components) {
      const pi = c.getPinAt(w.x, w.y);
      if (pi) {
        if (isDraggingPin) { if (pi.type !== isDraggingPin.type) setHoveredPin(pi); }
        else setHoveredPin(pi);
        break;
      }
    }

    canvas.style.cursor =
      isResizingComponent ? "nwse-resize" :
      isDraggingCanvas || isDraggingWaypoint ? "grabbing" :
      isRouting || (isSelectMode && !isDraggingPin && !isDraggingComponent) ? "crosshair" : "grab";

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
    } else if (isDraggingCanvas) {
      camera.x = e.clientX - dragStart.x;
      camera.y = e.clientY - dragStart.y;
    } else if (isDraggingComponent) {
      const dx = w.x - dragStartWorld.x, dy = w.y - dragStartWorld.y;
      if (Math.abs(sx - dragStartMousePos.x) > 3 || Math.abs(sy - dragStartMousePos.y) > 3) setComponentDragDidMove(true);
      let dispX = 0, dispY = 0;
      selectedComponents.forEach(c => {
        const init = selectedComponentsInitPos.find(p => p.id === c.id);
        if (init) {
          c.x = snapToGrid(init.x + dx);
          c.y = snapToGrid(init.y + dy);
          dispX = c.x - init.x;
          dispY = c.y - init.y;
        }
      });
      affectedWiresInitWaypoints.forEach(e => {
        e.wire.waypoints = e.initialWaypoints.map(wp => ({ x: wp.x + dispX, y: wp.y + dispY }));
      });
    } else if (isDraggingPin && Math.hypot(sx - dragStartMousePos.x, sy - dragStartMousePos.y) > 5) {
      setPinDragDidMove(true);
    }

    draw();
  });

  canvas.addEventListener("mouseup", e => {
    const { sx, sy, w } = cCoords(e);
    setPotentialWaypoint(null);

    if (isDraggingWaypoint) {
      setDraggingWaypoint(null);
    } else if (isSelectingBox) {
      const dx = Math.abs(selectionBoxEnd.x - selectionBoxStart.x) * camera.zoom;
      const dy = Math.abs(selectionBoxEnd.y - selectionBoxStart.y) * camera.zoom;
      if (dx > 3 || dy > 3) {
        const minX = Math.min(selectionBoxStart.x, selectionBoxEnd.x), maxX = Math.max(selectionBoxStart.x, selectionBoxEnd.x);
        const minY = Math.min(selectionBoxStart.y, selectionBoxEnd.y), maxY = Math.max(selectionBoxStart.y, selectionBoxEnd.y);
        const r = [...selectedComponents];
        components.forEach(c => {
          if (c.x <= maxX && c.x + c.width >= minX && c.y <= maxY && c.y + c.height >= minY && !r.includes(c)) r.push(c);
        });
        setSelectedComponents(r);
      }
      setSelectingBox(false);
    } else if (isDraggingPin) {
      if (pinDragDidMove) {
        let tp = null;
        for (let c of components) {
          const pi = c.getPinAt(w.x, w.y);
          if (pi && pi.type !== isDraggingPin.type) { tp = pi; break; }
        }
        if (tp) {
          const fp = isDraggingPin.type === "output" ? isDraggingPin : tp;
          const top = isDraggingPin.type === "input" ? isDraggingPin : tp;
          if (!wireExists(wires, fp, top)) {
            wires.push({ from: fp, to: top });
            top.pin.connections.push(fp.component);
            if (isSimulating) simTick();
          }
        } else {
          setIsRouting(true);
          setRoutingSourcePin(isDraggingPin);
          setRoutingWaypoints([{ x: snapToGrid(w.x), y: snapToGrid(w.y) }]);
        }
      }
      setDraggingPin(null);
      setHoveredPin(null);
    } else if (isDraggingComponent) {
      if (!componentDragDidMove && !e.shiftKey && !e.metaKey && !e.ctrlKey) setSelectedComponents([isDraggingComponent]);
      setDraggingComponent(null);
    }

    setResizingComponent(null);
    if (isDraggingCanvas) {
      // saveCameraState imported dynamically or from camera.js - will import at top
      saveCameraState();
    }
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
      if (isPointNearWire(w.x, w.y, ww).hit) {
        pushHistory();
        delete ww.waypoints;
        saveToLocalStorage();
        draw(); return;
      }
    }
  });
}
