import { canvas, minimapCanvas } from "../dom.js";
import { camera } from "../state.js";
import { screenToWorld } from "../utils.js";
import { saveCameraState } from "../camera.js";
import { draw } from "../render.js";

export function setupTouchInput() {
  let pinchDist = null, lastTap = 0;
  [canvas, minimapCanvas].forEach(el => {
    el.addEventListener("touchstart", e => {
      if (e.target !== el) return;
      if (e.touches.length === 2) {
        e.preventDefault();
        pinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      } else if (e.touches.length === 1) {
        e.preventDefault();
        const t = e.touches[0], now = Date.now();
        if (now - lastTap < 300 && lastTap > 0) {
          el.dispatchEvent(new MouseEvent("dblclick", { clientX: t.clientX, clientY: t.clientY, bubbles: true }));
          lastTap = 0;
        } else {
          lastTap = now;
          el.dispatchEvent(new MouseEvent("mousedown", { clientX: t.clientX, clientY: t.clientY, bubbles: true }));
        }
      }
    }, { passive: false });
    el.addEventListener("touchmove", e => {
      if (e.target !== el) return;
      if (e.touches.length === 2 && el === canvas) {
        e.preventDefault();
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (pinchDist) {
          const r = canvas.getBoundingClientRect();
          const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left;
          const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top;
          const wb = screenToWorld(cx, cy, camera);
          camera.zoom = Math.max(0.1, Math.min(5, camera.zoom * (d / pinchDist)));
          const wa = screenToWorld(cx, cy, camera);
          camera.x += (wa.x - wb.x) * camera.zoom;
          camera.y += (wa.y - wb.y) * camera.zoom;
          document.getElementById("zoomIndicator").textContent = Math.round(camera.zoom * 100) + "%";
          draw();
          pinchDist = d;
        }
      } else if (e.touches.length === 1) {
        e.preventDefault();
        el.dispatchEvent(new MouseEvent("mousemove", { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY, bubbles: true }));
      }
    }, { passive: false });
    el.addEventListener("touchend", e => {
      if (e.target !== el) return;
      e.preventDefault();
      if (pinchDist !== null && e.touches.length < 2) { pinchDist = null; saveCameraState(); }
      if (e.changedTouches.length === 1) {
        el.dispatchEvent(new MouseEvent("mouseup", { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY, bubbles: true }));
      }
    }, { passive: false });
  });
}
