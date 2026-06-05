import { isSimulating, setSimulating, components } from "./state.js";
import { toggleSimBtn } from "./dom.js";
import { draw } from "./render.js";

let simInterval = null;

export function initSimulation() {
  toggleSimBtn.addEventListener("click", () => {
    setSimulating(!isSimulating);
    components.forEach(c => { if (c.resetLogicState) c.resetLogicState(); });

    if (isSimulating) {
      simInterval = setInterval(() => {
        let changed = false;
        components.forEach(c => { if (c.calculateNextState) c.calculateNextState(); });
        components.forEach(c => { if (c.applyNextState && c.applyNextState()) changed = true; });
        if (changed) draw();
      }, 1);
      toggleSimBtn.classList.remove("stopped");
      toggleSimBtn.setAttribute("data-tooltip", "Stop Simulation (Space)");
    } else {
      clearInterval(simInterval);
      simInterval = null;
      toggleSimBtn.classList.add("stopped");
      toggleSimBtn.setAttribute("data-tooltip", "Play Simulation (Space)");
    }

    draw();
    toggleSimBtn.blur();
  });
}

export function simTick() {
  if (!isSimulating) return;
  let changed = false;
  components.forEach(c => { if (c.calculateNextState) c.calculateNextState(); });
  components.forEach(c => { if (c.applyNextState && c.applyNextState()) changed = true; });
  if (changed) draw();
}
