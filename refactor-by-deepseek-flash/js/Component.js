import { GRID_SIZE, COMPONENT_WIDTH, COMPONENT_HEIGHT, THEME, PIN_RADIUS } from "./constants.js";
import { wires, selectedComponents, selectedPin, hoveredPin, allocateNextId } from "./state.js";

export class Component {
  constructor(type, x, y) {
    this.id = allocateNextId();
    this.type = type;
    this.x = x;
    this.y = y;
    this.width = COMPONENT_WIDTH;
    this.height = COMPONENT_HEIGHT;
    this.label = "";
    this.nextState = false;

    if (type === "label_box") {
      const snap = GRID_SIZE / 2;
      this.width = Math.round(250 / snap) * snap;
      this.height = Math.round(180 / snap) * snap;
      this.label = "Circuit Label";
      this.inputs = [];
      this.outputs = [];
    } else if (type === "label") {
      this.width = 150;
      this.height = 40;
      this.label = "Label Text";
      this.inputs = [];
      this.outputs = [];
    } else if (type === "input") {
      this.state = false;
      this.outputs = [{ x: this.width, y: this.height / 2, connections: [] }];
      this.inputs = [];
    } else if (type === "output") {
      this.width = GRID_SIZE;
      this.height = GRID_SIZE;
      this.inputs = [{ x: 0, y: this.height / 2, connections: [] }];
      this.outputs = [];
      this.state = false;
    } else if (type === "gate") {
      this.state = false;
      this.inputs = [
        { x: 0, y: this.height * 0.25, connections: [] },
        { x: 0, y: this.height * 0.75, connections: [] },
      ];
      this.outputs = [{ x: this.width, y: this.height / 2, connections: [] }];
    } else if (type === "not_gate") {
      this.state = false;
      this.inputs = [{ x: 0, y: this.height / 2, connections: [] }];
      this.outputs = [{ x: this.width, y: this.height / 2, connections: [] }];
    } else if (type === "custom_ic") {
      this.internalComponents = [];
      this.internalWires = [];
      this.inputs = [];
      this.outputs = [];
      this.label = "Custom IC";
    }
  }

  get bodyType() {
    if (this.type === "label_box" || this.type === "label") return this.type;
    return "logic";
  }

  resetLogicState() {
    if (this.type === "custom_ic") {
      this.internalComponents.forEach(c => c.resetLogicState && c.resetLogicState());
    } else if (this.type !== "label_box" && this.type !== "label") {
      this.state = false;
      this.nextState = false;
    }
  }

  getOutputState(pin) {
    if (this.type === "custom_ic") {
      const c = this.internalComponents.find(x => x.id === pin.internalSourceId);
      return c ? c.state : false;
    }
    return this.state;
  }

  draw(ctx) {
    const isSel = selectedComponents.includes(this);

    if (this.type === "label") {
      ctx.save();
      if (isSel) {
        ctx.fillStyle = THEME.labelOverlaySelectedBg;
        ctx.strokeStyle = THEME.labelOverlaySelectedStroke;
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.roundRect(this.x, this.y, this.width, this.height, 4);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = THEME.labelOverlayText;
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.label, this.x + this.width / 2, this.y + this.height / 2);
      ctx.restore();
      return;
    }

    if (this.type === "label_box") {
      const r = 12;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(this.x, this.y, this.width, this.height, r);
      ctx.fillStyle = isSel ? THEME.labelBoxSelectedBg : THEME.labelBoxDefaultBg;
      ctx.strokeStyle = isSel ? THEME.labelBoxSelectedBorder : THEME.labelBoxDefaultBorder;
      ctx.lineWidth = isSel ? 2.5 : 2;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = isSel ? THEME.labelBoxTextSelected : THEME.labelBoxTextDefault;
      ctx.font = "600 14px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(this.label, this.x + 16, this.y + 16);

      const hs = 12, ho = this.width - hs - 4, vo = this.height - hs - 4;
      ctx.fillStyle = isSel ? THEME.labelBoxHandleSelected : THEME.labelBoxHandleDefault;
      ctx.beginPath();
      ctx.moveTo(this.x + ho, this.y + vo + hs);
      ctx.lineTo(this.x + ho + hs, this.y + vo + hs);
      ctx.lineTo(this.x + ho + hs, this.y + vo);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
      return;
    }

    ctx.save();
    if (isSel) {
      ctx.save();
      ctx.fillStyle = THEME.highlightFill;
      ctx.strokeStyle = THEME.highlightStroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(this.x - 4, this.y - 4, this.width + 8, this.height + 8, 8);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    if (this.type === "input") {
      if (this.label) {
        ctx.save();
        ctx.fillStyle = THEME.labelText;
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(this.label, this.x + this.width / 2, this.y - 4);
        ctx.restore();
      }
      const tw = 60, th = 32, tx = this.x + (this.width - tw) / 2, ty = this.y + (this.height - th) / 2;
      ctx.fillStyle = this.state ? THEME.inputActiveBg : THEME.inputInactiveBg;
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw, th, 8);
      ctx.fill();
      const ks = 24, kx = this.state ? tx + tw - ks - 4 : tx + 4, ky = ty + 4;
      ctx.fillStyle = THEME.knobBg;
      ctx.beginPath();
      ctx.roundRect(kx, ky, ks, ks, 6);
      ctx.fill();
    } else if (this.type === "output") {
      if (this.label) {
        ctx.save();
        ctx.fillStyle = THEME.labelText;
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(this.label, this.x + this.width / 2, this.y - 4);
        ctx.restore();
      }
      ctx.fillStyle = this.state ? THEME.outputActiveBg : THEME.outputInactiveBg;
      ctx.strokeStyle = this.state ? THEME.outputActiveBorder : THEME.outputInactiveBorder;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(this.x + 1.5, this.y + 1.5, this.width - 3, this.height - 3, 4);
      ctx.fill();
      ctx.stroke();
      if (this.state) {
        ctx.fillStyle = THEME.outputActiveGlow;
        ctx.beginPath();
        ctx.roundRect(this.x + 6, this.y + 6, this.width - 12, this.height - 12, 2);
        ctx.fill();
      }
    } else if (this.type === "gate" || this.type === "not_gate") {
      const cw = 65, ch = 40, cx = this.x + (this.width - cw) / 2, cy = this.y + (this.height - ch) / 2;
      ctx.fillStyle = this.state ? THEME.gateActiveBg : THEME.gateInactiveBg;
      ctx.strokeStyle = this.state ? THEME.gateActiveBorder : THEME.gateInactiveBorder;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cx, cy, cw, ch, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = this.state ? THEME.gateActiveText : THEME.gateInactiveText;
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.type === "gate" ? "AND" : "NOT", this.x + this.width / 2, this.y + this.height / 2);
    } else if (this.type === "custom_ic") {
      ctx.fillStyle = THEME.customIcBg;
      ctx.strokeStyle = THEME.customIcBorder;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(this.x, this.y, this.width, this.height, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = THEME.customIcLabel;
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.label, this.x + this.width / 2, this.y + this.height / 2);
      ctx.save();
      ctx.fillStyle = THEME.customIcPinLabel;
      ctx.font = "9px monospace";
      ctx.textBaseline = "middle";
      this.inputs.forEach(pin => { if (pin.label) { ctx.textAlign = "left"; ctx.fillText(pin.label, this.x + 8, this.y + pin.y); } });
      this.outputs.forEach(pin => { if (pin.label) { ctx.textAlign = "right"; ctx.fillText(pin.label, this.x + this.width - 8, this.y + pin.y); } });
      ctx.restore();
    }

    this._drawPins(ctx);
    ctx.restore();
  }

  _drawPins(ctx) {
    const drawPin = (pin, isInput) => {
      const px = this.x + pin.x, py = this.y + pin.y;
      const hov = hoveredPin && hoveredPin.pin === pin && hoveredPin.component === this;
      const sel = selectedPin && selectedPin.pin === pin && selectedPin.component === this;
      if (hov) {
        const g = ctx.createRadialGradient(px, py, PIN_RADIUS, px, py, PIN_RADIUS * 4);
        g.addColorStop(0, isInput ? THEME.pinHoverGlowInputStart : THEME.pinHoverGlowOutputStart);
        g.addColorStop(1, isInput ? THEME.pinHoverGlowInputEnd : THEME.pinHoverGlowOutputEnd);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, PIN_RADIUS * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (sel) {
        ctx.strokeStyle = THEME.pinSelectedStroke;
        ctx.lineWidth = 3;
        ctx.shadowColor = THEME.pinSelectedGlow;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(px, py, PIN_RADIUS * 2.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
      }
      ctx.fillStyle = isInput ? THEME.pinInputFill : THEME.pinOutputFill;
      ctx.beginPath();
      ctx.arc(px, py, PIN_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      if (sel) {
        ctx.fillStyle = THEME.pinCenterDot;
        ctx.beginPath();
        ctx.arc(px, py, PIN_RADIUS * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    this.inputs.forEach(p => drawPin(p, true));
    this.outputs.forEach(p => drawPin(p, false));
  }

  containsPoint(x, y) {
    if (this.type === "label_box") {
      const inHeader = x >= this.x && x <= this.x + this.width && y >= this.y && y <= this.y + 40;
      const inBorder = x >= this.x && x <= this.x + this.width && y >= this.y && y <= this.y + this.height &&
        (x <= this.x + 10 || x >= this.x + this.width - 10 || y >= this.y + this.height - 10);
      return inHeader || inBorder;
    }
    return x >= this.x && x <= this.x + this.width && y >= this.y && y <= this.y + this.height;
  }

  getPinAt(x, y) {
    if (this.type === "label_box" || this.type === "label") return null;
    for (let pin of this.inputs) {
      const px = this.x + pin.x, py = this.y + pin.y;
      if (Math.hypot(x - px, y - py) < PIN_RADIUS * 2) return { pin, type: "input", component: this };
    }
    for (let pin of this.outputs) {
      const px = this.x + pin.x, py = this.y + pin.y;
      if (Math.hypot(x - px, y - py) < PIN_RADIUS * 2) return { pin, type: "output", component: this };
    }
    return null;
  }

  getResizeHandleAt(x, y) {
    if (this.type !== "label_box") return false;
    return x >= this.x + this.width - 25 && x <= this.x + this.width &&
      y >= this.y + this.height - 25 && y <= this.y + this.height;
  }

  getInputSignal(inputPin, wireContext = wires) {
    const connected = wireContext.filter(w => w.to.component === this && w.to.pin === inputPin);
    return connected.some(w => w.from.component.getOutputState(w.from.pin));
  }

  calculateNextState(wireContext = wires) {
    if (this.type === "output") {
      this.nextState = this.inputs.length > 0 ? this.getInputSignal(this.inputs[0], wireContext) : false;
    } else if (this.type === "gate") {
      const a = this.inputs.length > 0 ? this.getInputSignal(this.inputs[0], wireContext) : false;
      const b = this.inputs.length > 1 ? this.getInputSignal(this.inputs[1], wireContext) : false;
      this.nextState = a && b;
    } else if (this.type === "not_gate") {
      const a = this.inputs.length > 0 ? this.getInputSignal(this.inputs[0], wireContext) : false;
      this.nextState = !a;
    } else if (this.type === "custom_ic") {
      this.inputs.forEach(pin => {
        const target = this.internalComponents.find(c => c.id === pin.internalTargetId);
        if (target) { target.state = this.getInputSignal(pin, wireContext); target.nextState = target.state; }
      });
      this.internalComponents.forEach(c => c.calculateNextState && c.calculateNextState(this.internalWires));
    } else {
      this.nextState = this.state;
    }
  }

  applyNextState() {
    if (this.type === "custom_ic") {
      let changed = false;
      this.inputs.forEach(pin => {
        const target = this.internalComponents.find(c => c.id === pin.internalTargetId);
        if (target && target.state !== target.nextState) { target.state = target.nextState; changed = true; }
      });
      this.internalComponents.forEach(c => { if (c.applyNextState && c.applyNextState()) changed = true; });
      return changed;
    }
    if (this.state !== this.nextState) { this.state = this.nextState; return true; }
    return false;
  }
}
