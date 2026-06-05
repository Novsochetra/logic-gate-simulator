import { Component } from "./Component.js";
import {
  components, wires,
  setComponents, setWires, setNextId, allocateNextId,
  setSelectedComponents, setSelectedPin, setSelectedWire, setSelectedWaypoint,
  setIsRouting, setRoutingSourcePin, setRoutingWaypoints,
  isSimulating,
} from "./state.js";
import { toggleSimBtn } from "./dom.js";
import { draw } from "./render.js";

export function serializeCircuit(comps, wireList) {
  return {
    components: comps.map(c => {
      const b = {
        id: c.id, type: c.type, x: c.x, y: c.y,
        width: c.width, height: c.height, label: c.label,
        state: c.type === "input" ? c.state : false,
      };
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

export function serializeState() {
  return JSON.stringify(serializeCircuit(components, wires));
}

export function parseCircuit(compList, wireList, idMap = new Map(), assignNewIds = false) {
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
      nc.inputs = cc.inputs.map((p, i) => ({
        x: p.x, y: p.y,
        internalTargetId: idMap.get(p.internalTargetId).id,
        label: p.label || `In${i + 1}`, connections: [],
      }));
      nc.outputs = cc.outputs.map((p, i) => ({
        x: p.x, y: p.y,
        internalSourceId: idMap.get(p.internalSourceId).id,
        label: p.label || `Out${i + 1}`, connections: [],
      }));
      if (!assignNewIds && r.localMaxId > maxId) maxId = r.localMaxId;
    }

    if (assignNewIds && !nc.id) {
      const n = allocateNextId();
      idMap.set(cc.id, { id: n });
      nc.id = n;
    }
    parsedComps.push(nc);
    if (!assignNewIds && cc.id > maxId) maxId = cc.id;
  });

  wireList.forEach(cw => {
    const fc = idMap.get(cw.fromCompId), tc = idMap.get(cw.toCompId);
    if (fc && tc) {
      const fp = fc[cw.fromType + "s"]?.[cw.fromPinIndex];
      const tp = tc[cw.toType + "s"]?.[cw.toPinIndex];
      if (fp && tp) {
        const nw = {
          from: { pin: fp, type: cw.fromType, component: fc },
          to:   { pin: tp, type: cw.toType,   component: tc },
        };
        if (cw.waypoints?.length) nw.waypoints = cw.waypoints.map(p => ({ x: p.x, y: p.y }));
        parsedWires.push(nw);
        tp.connections.push(fc);
      }
    }
  });

  return { comps: parsedComps, wires: parsedWires, localMaxId: maxId };
}

export function loadSerializedState(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    if (!data.components || !data.wires) return false;
    if (isSimulating && toggleSimBtn) toggleSimBtn.click();

    const r = parseCircuit(data.components, data.wires, new Map(), false);
    setComponents(r.comps);
    setWires(r.wires);
    setNextId(r.localMaxId + 1);
    setSelectedComponents([]);
    setSelectedPin(null);
    setSelectedWire(null);
    setSelectedWaypoint(null);
    setIsRouting(false);
    setRoutingSourcePin(null);
    setRoutingWaypoints([]);
    draw();
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export function loadFromLocalStorage() {
  const s = localStorage.getItem("logicSimulatorAutoSave");
  if (s) loadSerializedState(s);
}
