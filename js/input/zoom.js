import { ZOOM_MIN, ZOOM_MAX, ZOOM_FACTOR } from "../constants.js";
import { camera } from "../state.js";
import { screenToWorld } from "../utils.js";
import { saveCameraState, resetCamera } from "../camera.js";
import { canvas, zoomIndicator, zoomInBtn, zoomOutBtn, labelEditor } from "../dom.js";
import { draw } from "../render.js";

export function syncZoomIndicator() {
  zoomIndicator.textContent = Math.round(camera.zoom * 100) + "%";
}

function handleZoom(e) {
  e.preventDefault();
  if (document.activeElement === labelEditor) labelEditor.blur();
  const r = canvas.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  const wb = screenToWorld(mx, my, camera);
  camera.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, camera.zoom * (e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR)));
  const wa = screenToWorld(mx, my, camera);
  camera.x += (wa.x - wb.x) * camera.zoom;
  camera.y += (wa.y - wb.y) * camera.zoom;
  syncZoomIndicator();
  saveCameraState();
  draw();
}

export function setupZoomInput() {
  zoomIndicator.addEventListener("click", () => { resetCamera(); syncZoomIndicator(); draw(); });
  zoomInBtn.addEventListener("click", e => {
    e.stopPropagation();
    camera.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, camera.zoom * ZOOM_FACTOR));
    syncZoomIndicator();
    saveCameraState();
    draw();
  });
  zoomOutBtn.addEventListener("click", e => {
    e.stopPropagation();
    camera.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, camera.zoom / ZOOM_FACTOR));
    syncZoomIndicator();
    saveCameraState();
    draw();
  });
  canvas.addEventListener("wheel", handleZoom, { passive: false });
}
