import { minimapCanvas, canvas } from "../dom.js";
import { camera } from "../state.js";
import { getDpr } from "../canvas.js";
import { getMinimapConfig } from "../render.js";
import { saveCameraState } from "../camera.js";
import { draw } from "../render.js";

let isDraggingMinimap = false;
const minimapConfig = getMinimapConfig();

export function setupMinimapInput() {
  minimapCanvas.addEventListener("mousedown", e => {
    const helpModal = document.getElementById("helpModal");
    const workspaceModal = document.getElementById("workspaceModal");
    if (helpModal?.classList.contains("show") || workspaceModal?.classList.contains("show")) return;
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
}

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
