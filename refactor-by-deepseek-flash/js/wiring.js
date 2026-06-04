import { THEME } from "./constants.js";
import { camera } from "./state.js";
import { worldToScreen } from "./utils.js";

// --- Orthogonal Path Routing ---
export function getOrthogonalPath(fromX, fromY, toX, toY, isSelfLoop = false) {
  const points = [{ x: fromX, y: fromY }];
  const offset = 20;
  if (isSelfLoop) {
    const dir = toY > fromY ? 1 : -1;
    const loopY = (toY > fromY ? Math.max(fromY, toY) : Math.min(fromY, toY)) + dir * 45;
    points.push({ x: fromX + offset, y: fromY });
    points.push({ x: fromX + offset, y: loopY });
    points.push({ x: toX - offset, y: loopY });
    points.push({ x: toX - offset, y: toY });
  } else if (fromX + offset < toX - offset) {
    const midX = fromX + (toX - fromX) / 2;
    points.push({ x: midX, y: fromY });
    points.push({ x: midX, y: toY });
  } else {
    const routeY = Math.abs(fromY - toY) < 60 ? Math.max(fromY, toY) + 60 : fromY + (toY - fromY) / 2;
    points.push({ x: fromX + offset, y: fromY });
    points.push({ x: fromX + offset, y: routeY });
    points.push({ x: toX - offset, y: routeY });
    points.push({ x: toX - offset, y: toY });
  }
  points.push({ x: toX, y: toY });
  return points;
}

// --- Wire Path ---
export function getWirePath(wire) {
  const fX = wire.from.component.x + wire.from.pin.x;
  const fY = wire.from.component.y + wire.from.pin.y;
  const tX = wire.to.component.x + wire.to.pin.x;
  const tY = wire.to.component.y + wire.to.pin.y;
  if (wire.waypoints && wire.waypoints.length > 0) {
    return [{ x: fX, y: fY }, ...wire.waypoints, { x: tX, y: tY }];
  }
  return getOrthogonalPath(fX, fY, tX, tY, wire.from.component === wire.to.component);
}

// --- Hit Detection ---
export function isPointNearWire(worldX, worldY, wire) {
  const points = getWirePath(wire);
  const threshold = 10 / camera.zoom;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i], p2 = points[i + 1];
    const A = worldX - p1.x, B = worldY - p1.y, C = p2.x - p1.x, D = p2.y - p1.y;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = lenSq !== 0 ? dot / lenSq : -1;
    const xx = param < 0 ? p1.x : param > 1 ? p2.x : p1.x + param * C;
    const yy = param < 0 ? p1.y : param > 1 ? p2.y : p1.y + param * D;
    if (Math.hypot(worldX - xx, worldY - yy) < threshold) return { hit: true, segmentIndex: i };
  }
  return { hit: false };
}

// --- Wire CRUD ---
export function removeWiresForPin(pinInfo, wireArr) {
  wireArr.forEach(w => {
    if (w.to.component === pinInfo.component && w.to.pin === pinInfo.pin) {
      w.to.pin.connections = [];
    }
  });
  return wireArr.filter(w =>
    !(w.from.component === pinInfo.component && w.from.pin === pinInfo.pin) &&
    !(w.to.component === pinInfo.component && w.to.pin === pinInfo.pin)
  );
}

export function wireExists(wireArr, fromPin, toPin) {
  return wireArr.some(w =>
    w.from.component === fromPin.component && w.from.pin === fromPin.pin &&
    w.to.component === toPin.component && w.to.pin === toPin.pin
  );
}

// --- Waypoint Helpers ---
export function findWaypointAt(wire, wx, wy, threshold) {
  if (!wire.waypoints) return -1;
  for (let i = 0; i < wire.waypoints.length; i++) {
    if (Math.hypot(wx - wire.waypoints[i].x, wy - wire.waypoints[i].y) < threshold) return i;
  }
  return -1;
}

// --- Wire Rendering ---
function drawRoundedPath(ctx, points, baseRadius) {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const d1 = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    const d2 = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    ctx.arcTo(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y, Math.min(baseRadius, d1 / 2, d2 / 2));
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.stroke();
}

export function drawWires(ctx, wireList, selWire, selWaypoint, onlySelected = false) {
  const sr = 8 * camera.zoom;
  wireList.forEach(wire => {
    const isSel = selWire === wire;
    if (onlySelected && !isSel) return;
    if (!onlySelected && isSel) return;

    const active = wire.from.component.getOutputState(wire.from.pin);
    const pts = getWirePath(wire);
    const sp = pts.map(p => worldToScreen(p.x, p.y, camera));

    // Background (wire crossing discrimination)
    ctx.strokeStyle = THEME.wireBackground;
    ctx.lineWidth = 11;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    drawRoundedPath(ctx, sp, sr);

    // Selected glow
    if (isSel) {
      ctx.strokeStyle = THEME.wireSelected;
      ctx.lineWidth = 7;
      ctx.shadowColor = THEME.wireSelectedGlow;
      ctx.shadowBlur = 20;
      drawRoundedPath(ctx, sp, sr);
      ctx.shadowBlur = 0;
    }

    // Main wire
    ctx.strokeStyle = isSel ? THEME.wireSelected : active ? THEME.wireActive : THEME.wireInactive;
    ctx.lineWidth = 3;
    drawRoundedPath(ctx, sp, sr);

    // Inner highlight
    if (isSel) {
      ctx.strokeStyle = THEME.wireSelectedInner;
      ctx.lineWidth = 1;
      drawRoundedPath(ctx, sp, sr);

      if (wire.waypoints) {
        wire.waypoints.forEach((wp, idx) => {
          const swp = worldToScreen(wp.x, wp.y, camera);
          const wpSel = selWaypoint && selWaypoint.wire === wire && selWaypoint.index === idx;
          ctx.fillStyle = wpSel ? THEME.waypointActiveBg : THEME.waypointInactiveBg;
          ctx.strokeStyle = wpSel ? THEME.waypointActiveStroke : THEME.waypointInactiveStroke;
          if (wpSel) { ctx.shadowColor = THEME.waypointShadow; ctx.shadowBlur = 10; }
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(swp.x, swp.y, (wpSel ? 7 : 6) * camera.zoom, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        });
      }
    }
  });
}

// --- Draw dragging wire preview ---
export function drawDraggingWire(ctx, fromComp, fromPin, fromType, mouseWorld, hoveredComponent) {
  const sr = 8 * camera.zoom;
  const fX = fromComp.x + fromPin.x;
  const fY = fromComp.y + fromPin.y;
  const isSelf = hoveredComponent === fromComp;
  const src = fromType === "input" ? mouseWorld : { x: fX, y: fY };
  const dst = fromType === "input" ? { x: fX, y: fY } : mouseWorld;
  const pts = getOrthogonalPath(src.x, src.y, dst.x, dst.y, isSelf);
  const sp = pts.map(p => worldToScreen(p.x, p.y, camera));

  ctx.strokeStyle = THEME.wireBackground;
  ctx.lineWidth = 11;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  drawRoundedPath(ctx, sp, sr);

  ctx.strokeStyle = THEME.wireDragging;
  ctx.lineWidth = 3;
  ctx.setLineDash([5, 5]);
  drawRoundedPath(ctx, sp, sr);
  ctx.setLineDash([]);
}
