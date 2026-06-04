import { GRID_SIZE, THEME } from "./constants.js";
import { camera } from "./state.js";
import { getDpr } from "./canvas.js";

export function drawGrid(ctx) {
  const canvas = ctx.canvas;
  const canvasWidth = canvas.width / getDpr();
  const canvasHeight = canvas.height / getDpr();

  ctx.strokeStyle = THEME.gridLine;
  ctx.lineWidth = 1;

  const startX = Math.floor(-camera.x / camera.zoom / GRID_SIZE) * GRID_SIZE;
  const startY = Math.floor(-camera.y / camera.zoom / GRID_SIZE) * GRID_SIZE;
  const endX = startX + canvasWidth / camera.zoom + GRID_SIZE;
  const endY = startY + canvasHeight / camera.zoom + GRID_SIZE;

  for (let x = startX; x < endX; x += GRID_SIZE) {
    const screenX = x * camera.zoom + camera.x;
    ctx.beginPath();
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX, canvasHeight);
    ctx.stroke();
  }

  for (let y = startY; y < endY; y += GRID_SIZE) {
    const screenY = y * camera.zoom + camera.y;
    ctx.beginPath();
    ctx.moveTo(0, screenY);
    ctx.lineTo(canvasWidth, screenY);
    ctx.stroke();
  }
}
