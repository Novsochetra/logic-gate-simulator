import { installRoundRect } from "./utils.js";

let dpr = 1;
let mainCtx = null;
let minimapCtx = null;

export function getDpr() { return dpr; }
export function getMainCtx() { return mainCtx; }
export function getMinimapCtx() { return minimapCtx; }

export function setupCanvas(canvas, minimapCanvas) {
  mainCtx = canvas.getContext("2d");
  installRoundRect(mainCtx);

  if (minimapCanvas) {
    minimapCtx = minimapCanvas.getContext("2d");
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
}

export function resizeCanvas() {
  dpr = window.devicePixelRatio || 1;

  const canvas = mainCtx?.canvas;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  mainCtx.setTransform(1, 0, 0, 1, 0, 0);
  mainCtx.scale(dpr, dpr);

  if (minimapCtx) {
    const mmCanvas = minimapCtx.canvas;
    const mmRect = mmCanvas.getBoundingClientRect();
    mmCanvas.width = mmRect.width * dpr;
    mmCanvas.height = mmRect.height * dpr;
    minimapCtx.setTransform(1, 0, 0, 1, 0, 0);
    minimapCtx.scale(dpr, dpr);
  }
}
