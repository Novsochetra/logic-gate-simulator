import { THEME, GRID_SIZE } from "./constants.js";
import { camera, components, wires, selectedComponents, selectedWire, selectedWaypoint, isSelectingBox, selectionBoxStart, selectionBoxEnd, isDraggingPin, pinDragDidMove, hoveredPin, mousePos, isRouting, routingSourcePin, routingWaypoints } from "./state.js";
import { screenToWorld, snapToGrid } from "./utils.js";
import { getMainCtx, getDpr } from "./canvas.js";
import { drawGrid } from "./grid.js";
import { drawWires, drawDraggingWire, drawRoutingPreview, getWirePath } from "./wiring.js";

let minimapConfig = { mapMinX: 0, mapMinY: 0, mapScale: 1, offsetX: 0, offsetY: 0 };

export function getMinimapConfig() { return minimapConfig; }

function drawMinimap() {
  const mmCanvas = document.getElementById("minimap");
  if (!mmCanvas) return;
  const mmCtx = mmCanvas.getContext("2d");
  const mmW = 200, mmH = 150;
  mmCtx.clearRect(0, 0, mmW, mmH);

  const visMinX = -camera.x / camera.zoom;
  const visMinY = -camera.y / camera.zoom;
  const mainCanvas = getMainCtx().canvas;
  const visMaxX = (mainCanvas.width / getDpr() - camera.x) / camera.zoom;
  const visMaxY = (mainCanvas.height / getDpr() - camera.y) / camera.zoom;

  let cMinX = visMinX, cMinY = visMinY, cMaxX = visMaxX, cMaxY = visMaxY;
  components.forEach(c => { cMinX = Math.min(cMinX, c.x); cMinY = Math.min(cMinY, c.y); cMaxX = Math.max(cMaxX, c.x + c.width); cMaxY = Math.max(cMaxY, c.y + c.height); });
  wires.forEach(w => { if (w.waypoints) w.waypoints.forEach(wp => { cMinX = Math.min(cMinX, wp.x); cMinY = Math.min(cMinY, wp.y); cMaxX = Math.max(cMaxX, wp.x); cMaxY = Math.max(cMaxY, wp.y); }); });

  const pad = 200;
  minimapConfig.mapMinX = cMinX - pad;
  minimapConfig.mapMinY = cMinY - pad;
  const mapMaxX = cMaxX + pad, mapMaxY = cMaxY + pad;
  const mapW = mapMaxX - minimapConfig.mapMinX, mapH = mapMaxY - minimapConfig.mapMinY;
  minimapConfig.mapScale = Math.min(mmW / mapW, mmH / mapH);
  minimapConfig.offsetX = (mmW - mapW * minimapConfig.mapScale) / 2;
  minimapConfig.offsetY = (mmH - mapH * minimapConfig.mapScale) / 2;

  const mmX = wx => (wx - minimapConfig.mapMinX) * minimapConfig.mapScale + minimapConfig.offsetX;
  const mmY = wy => (wy - minimapConfig.mapMinY) * minimapConfig.mapScale + minimapConfig.offsetY;

  mmCtx.strokeStyle = THEME.gridLine;
  mmCtx.lineWidth = 1;
  const gs = GRID_SIZE * minimapConfig.mapScale;
  if (gs > 3) {
    mmCtx.beginPath();
    for (let x = mmX(Math.floor(minimapConfig.mapMinX / GRID_SIZE) * GRID_SIZE); x < mmW; x += gs) { mmCtx.moveTo(x, 0); mmCtx.lineTo(x, mmH); }
    for (let y = mmY(Math.floor(minimapConfig.mapMinY / GRID_SIZE) * GRID_SIZE); y < mmH; y += gs) { mmCtx.moveTo(0, y); mmCtx.lineTo(mmW, y); }
    mmCtx.stroke();
  }

  wires.forEach(w => {
    const path = getWirePath(w);
    if (path.length === 0) return;
    const active = w.from.component.getOutputState(w.from.pin);
    mmCtx.strokeStyle = THEME.wireBackground; mmCtx.lineWidth = 4;
    mmCtx.beginPath(); mmCtx.moveTo(mmX(path[0].x), mmY(path[0].y));
    for (let i = 1; i < path.length; i++) mmCtx.lineTo(mmX(path[i].x), mmY(path[i].y));
    mmCtx.stroke();
    mmCtx.strokeStyle = active ? THEME.wireActive : THEME.wireInactive; mmCtx.lineWidth = 1.5;
    mmCtx.beginPath(); mmCtx.moveTo(mmX(path[0].x), mmY(path[0].y));
    for (let i = 1; i < path.length; i++) mmCtx.lineTo(mmX(path[i].x), mmY(path[i].y));
    mmCtx.stroke();
  });

  components.forEach(c => {
    if (c.type === "label_box" || c.type === "label") { mmCtx.fillStyle = THEME.minimapLabelBg; mmCtx.strokeStyle = THEME.minimapLabelBorder; }
    else if (c.type === "input" || c.type === "output") { mmCtx.fillStyle = c.state ? THEME.inputActiveBg : THEME.inputInactiveBg; mmCtx.strokeStyle = "transparent"; }
    else if (c.type === "custom_ic") { mmCtx.fillStyle = THEME.customIcBg; mmCtx.strokeStyle = THEME.customIcBorder; }
    else { mmCtx.fillStyle = c.state ? THEME.gateActiveBg : THEME.gateInactiveBg; mmCtx.strokeStyle = c.state ? THEME.gateActiveBorder : THEME.gateInactiveBorder; }
    const x = mmX(c.x), y = mmY(c.y), w = c.width * minimapConfig.mapScale, h = c.height * minimapConfig.mapScale;
    mmCtx.fillRect(x, y, w, h);
    if (mmCtx.strokeStyle !== "transparent") { mmCtx.lineWidth = 1; mmCtx.strokeRect(x, y, w, h); }
  });

  mmCtx.fillStyle = THEME.minimapViewportBg;
  mmCtx.strokeStyle = THEME.minimapViewportBorder;
  mmCtx.lineWidth = 2;
  mmCtx.fillRect(mmX(visMinX), mmY(visMinY), (visMaxX - visMinX) * minimapConfig.mapScale, (visMaxY - visMinY) * minimapConfig.mapScale);
  mmCtx.strokeRect(mmX(visMinX), mmY(visMinY), (visMaxX - visMinX) * minimapConfig.mapScale, (visMaxY - visMinY) * minimapConfig.mapScale);
}

export function draw() {
  const ctx = getMainCtx();
  if (!ctx) return;
  const dpr = getDpr();
  const cw = ctx.canvas.width / dpr;
  const ch = ctx.canvas.height / dpr;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cw, ch);

  drawGrid(ctx);

  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.zoom, camera.zoom);
  components.filter(c => c.type === "label_box").forEach(c => c.draw(ctx));
  ctx.restore();

  drawWires(ctx, wires, selectedWire, selectedWaypoint, false);

  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.zoom, camera.zoom);
  components.filter(c => c.type !== "label_box" && c.type !== "label").forEach(c => c.draw(ctx));
  components.filter(c => c.type === "label").forEach(c => c.draw(ctx));

  if (isSelectingBox) {
    ctx.fillStyle = THEME.selectionFill;
    ctx.strokeStyle = THEME.selectionStroke;
    ctx.lineWidth = 1 / camera.zoom;
    const x = selectionBoxStart.x, y = selectionBoxStart.y, w = selectionBoxEnd.x - x, h = selectionBoxEnd.y - y;
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
  }
  ctx.restore();

  if (selectedWire) drawWires(ctx, [selectedWire], selectedWire, selectedWaypoint, true);

  if (isDraggingPin && pinDragDidMove) {
    drawDraggingWire(ctx, isDraggingPin.component, isDraggingPin.pin, isDraggingPin.type,
      screenToWorld(mousePos.x, mousePos.y, camera), hoveredPin ? hoveredPin.component : null);
  }

  if (isRouting) {
    const mw = screenToWorld(mousePos.x, mousePos.y, camera);
    drawRoutingPreview(ctx, routingSourcePin, routingWaypoints,
      { x: snapToGrid(mw.x), y: snapToGrid(mw.y) });
  }

  ctx.restore();

  drawMinimap();
}
