import { initTheme, onThemeChange } from "./theme.js";
import { setupCanvas, getMainCtx, getDpr } from "./canvas.js";
import { installRoundRect, screenToWorld } from "./utils.js";
import { loadCameraState, zoomAtCenter, resetCamera, saveCameraState } from "./camera.js";
import { draw } from "./render.js";
import { loadSerializedState, loadFromLocalStorage } from "./serialization.js";
import { initSimulation } from "./simulation.js";
import { setupMouseInput } from "./input/mouse.js";
import { setupKeyboardInput } from "./input/keyboard.js";
import { setupTouchInput } from "./input/touch.js";
import { setupMinimapInput } from "./input/minimap.js";
import { setupMenuUI } from "./ui/menu.js";
import { setupPopupUI } from "./ui/popup.js";
import { setupThemeUI } from "./ui/theme.js";
import { setupWorkspaceUI, initWorkspaces } from "./ui/workspace.js";
import { setupLabelEditor, setupExportImport, setupICActions } from "./actions.js";
import { canvas, minimapCanvas, zoomIndicator, zoomInBtn, zoomOutBtn, labelEditor } from "./dom.js";
import { camera, workspaces, activeWorkspaceId } from "./state.js";

// ==================== CANVAS SETUP ====================
setupCanvas(canvas, minimapCanvas);
installRoundRect(getMainCtx());
window.addEventListener("resize", draw);

// ==================== ZOOM ====================
zoomIndicator.addEventListener("click", () => { resetCamera(); draw(); });
zoomInBtn.addEventListener("click", e => {
  e.stopPropagation();
  zoomAtCenter(1.1, canvas.width / getDpr(), canvas.height / getDpr(), zoomIndicator);
  draw();
});
zoomOutBtn.addEventListener("click", e => {
  e.stopPropagation();
  zoomAtCenter(1 / 1.1, canvas.width / getDpr(), canvas.height / getDpr(), zoomIndicator);
  draw();
});

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

// ==================== INIT SUBSYSTEMS ====================
initSimulation();
setupMouseInput();
setupKeyboardInput();
setupTouchInput();
setupMinimapInput();
setupMenuUI();
setupPopupUI();
setupThemeUI();
setupWorkspaceUI();
setupLabelEditor();
setupExportImport();
setupICActions();

// ==================== BOOT ====================
initTheme();
onThemeChange(() => draw());
loadCameraState();
zoomIndicator.textContent = Math.round(camera.zoom * 100) + "%";
initWorkspaces();
const currentWS = workspaces.find(w => w.id === activeWorkspaceId);
if (currentWS?.data && currentWS.data !== "null") loadSerializedState(currentWS.data);
else loadFromLocalStorage();
draw();
