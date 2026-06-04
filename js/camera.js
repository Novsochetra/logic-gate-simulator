import { camera } from "./state.js";
import { screenToWorld } from "./utils.js";

const STORAGE_KEY = "logicSimulatorCamera";

export function saveCameraState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: camera.x, y: camera.y, zoom: camera.zoom }));
}

export function loadCameraState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    if (typeof parsed.x === "number" && typeof parsed.y === "number" && typeof parsed.zoom === "number") {
      camera.x = parsed.x;
      camera.y = parsed.y;
      camera.zoom = parsed.zoom;
    }
  } catch (e) {
    console.error("Failed to load camera state", e);
  }
}

export function resetCamera() {
  camera.x = 0;
  camera.y = 0;
  camera.zoom = 1;
  saveCameraState();
}

export function zoomAtCenter(factor, canvasWidth, canvasHeight, zoomIndicator) {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const worldBefore = screenToWorld(centerX, centerY, camera);

  camera.zoom *= factor;
  camera.zoom = Math.max(0.1, Math.min(5, camera.zoom));
  const worldAfter = screenToWorld(centerX, centerY, camera);

  camera.x += (worldAfter.x - worldBefore.x) * camera.zoom;
  camera.y += (worldAfter.y - worldBefore.y) * camera.zoom;

  if (zoomIndicator) {
    zoomIndicator.textContent = Math.round(camera.zoom * 100) + "%";
  }
  saveCameraState();
}
