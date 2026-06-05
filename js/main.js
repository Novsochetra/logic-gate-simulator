import { initTheme, onThemeChange } from "./theme.js";
import { setupCanvas, getMainCtx } from "./canvas.js";
import { installRoundRect } from "./utils.js";
import { loadCameraState } from "./camera.js";
import { draw } from "./render.js";
import { initSimulation } from "./simulation.js";
import { setupZoomInput, syncZoomIndicator } from "./input/zoom.js";
import { setupMouseInput } from "./input/mouse.js";
import { setupKeyboardInput } from "./input/keyboard.js";
import { setupTouchInput } from "./input/touch.js";
import { setupMinimapInput } from "./input/minimap.js";
import { setupMenuUI } from "./ui/menu.js";
import { setupPopupUI } from "./ui/popup.js";
import { setupThemeUI } from "./ui/theme.js";
import { setupWorkspaceUI, initWorkspaces, loadInitialCircuit } from "./ui/workspace.js";
import { setupLabelEditor, setupExportImport, setupICActions } from "./actions.js";
import { canvas, minimapCanvas } from "./dom.js";

// ==================== CANVAS SETUP ====================
setupCanvas(canvas, minimapCanvas);
installRoundRect(getMainCtx());
window.addEventListener("resize", draw);

// ==================== INPUT ====================
setupZoomInput();
setupMouseInput();
setupKeyboardInput();
setupTouchInput();
setupMinimapInput();

// ==================== UI ====================
setupMenuUI();
setupPopupUI();
setupThemeUI();
setupWorkspaceUI();

// ==================== SIMULATION ====================
initSimulation();

// ==================== ACTIONS ====================
setupLabelEditor();
setupExportImport();
setupICActions();

// ==================== BOOT ====================
initTheme();
onThemeChange(draw);
loadCameraState();
syncZoomIndicator();
initWorkspaces();

loadInitialCircuit();

draw();
