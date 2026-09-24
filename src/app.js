// Page wiring: two sheets, one shared force, a canvas painter per sheet.

import * as C from "./constants.js";
import { Tissue } from "./tissue.js";
import { ForceRamp } from "./forceRamp.js";
import { filamentPath } from "./filamentShape.js";

const SEED = 7;
const ROWS = 3;
const COLS = 4;
const RAMP_SECONDS = 24;
const ITERATIONS_PER_FRAME = 60;
const WORLD = { x: -40, y: -42, width: 540, height: 300 };
const FILAMENT_STRESS_SCALE = 0.08;
const PLAQUE_HALF_LENGTH = 4.5;
const NUCLEUS_RADIUS = 8.5;
const TEAR_STUB = 3.5;

// ---- colours ------------------------------------------------------------

function readPalette() {
  const style = getComputedStyle(document.documentElement);
  const token = (name) => style.getPropertyValue(`--${name}`).trim();
  const names = ["stage", "cytoplasm", "cytoplasm-torn", "nucleus", "membrane", "desmosome", "keratin", "stress", "torn", "clamp", "ink", "ink-soft"];
  return Object.fromEntries(names.map((n) => [n, token(n)]));
}

function hexToRgb(hex) {
  const value = parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function mix(fromHex, toHex, t) {
  const a = hexToRgb(fromHex);
  const b = hexToRgb(toHex);
  const [r, g, bl] = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${r}, ${g}, ${bl})`;
}

const clamp01 = (t) => Math.max(0, Math.min(1, t));

// ---- painter ------------------------------------------------------------

class CanvasPainter {
  #canvas;
  #ctx;
  #scale = 1;
  palette = readPalette();
  showStress = true;
  showLabels = true;
  force = 0;

  constructor(canvas) {
    this.#canvas = canvas;
    this.#ctx = canvas.getContext("2d");
  }

  begin() {
    const ratio = window.devicePixelRatio || 1;
    const width = this.#canvas.clientWidth;
    const height = this.#canvas.clientHeight;
    if (this.#canvas.width !== Math.round(width * ratio)) this.#canvas.width = Math.round(width * ratio);
    if (this.#canvas.height !== Math.round(height * ratio)) this.#canvas.height = Math.round(height * ratio);
    this.#scale = (width * ratio) / WORLD.width;
    const ctx = this.#ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = this.palette.stage;
    ctx.fillRect(0, 0, this.#canvas.width, this.#canvas.height);
    ctx.setTransform(this.#scale, 0, 0, this.#scale, -WORLD.x * this.#scale, -WORLD.y * this.#scale);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  link(kind, x1, y1, x2, y2, strain) {
    if (kind === "membrane") this.#membrane(x1, y1, x2, y2, strain);
    else if (kind === "filament") this.#filament(x1, y1, x2, y2, strain);
    else this.#desmosome(x1, y1, x2, y2);
  }

  #membrane(x1, y1, x2, y2, strain) {
    const t = this.showStress ? clamp01(strain / C.MEMBRANE_BREAK_STRAIN) : 0;
    this.#stroke(x1, y1, x2, y2, mix(this.palette.membrane, this.palette.stress, t), 2.4 + 2.2 * t);
  }

  #filament(x1, y1, x2, y2, strain) {
    const load = clamp01(strain / FILAMENT_STRESS_SCALE);
    const color = mix(this.palette.keratin, this.palette.stress, this.showStress ? load : 0);
    this.#polyline(filamentPath(x1, y1, x2, y2, strain), color, 1.3 + 1.2 * load);
  }

  #polyline(points, color, width) {
    const ctx = this.#ctx;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    points.forEach(([x, y], k) => (k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
  }

  #desmosome(x1, y1, x2, y2) {
    const color = this.palette.desmosome;
    this.#stroke(x1, y1, x2, y2, color, 1);
    const length = Math.hypot(x2 - x1, y2 - y1) || 1;
    const nx = (-(y2 - y1) / length) * PLAQUE_HALF_LENGTH;
    const ny = ((x2 - x1) / length) * PLAQUE_HALF_LENGTH;
    this.#stroke(x1 - nx, y1 - ny, x1 + nx, y1 + ny, color, 3.6);
    this.#stroke(x2 - nx, y2 - ny, x2 + nx, y2 + ny, color, 3.6);
  }

  #stroke(x1, y1, x2, y2, color, width) {
    const ctx = this.#ctx;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  cytoplasm(points, ruptured) {
    const ctx = this.#ctx;
    ctx.beginPath();
    points.forEach(([x, y], k) => (k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = ruptured ? this.palette["cytoplasm-torn"] : this.palette.cytoplasm;
    ctx.fill();
  }

  nucleus(x, y, ruptured) {
    const ctx = this.#ctx;
    ctx.globalAlpha = ruptured ? 0.45 : 1;
    ctx.fillStyle = this.palette.nucleus;
    ctx.beginPath();
    ctx.arc(x, y, NUCLEUS_RADIUS, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // The torn membrane edges: short stubs curling back from each broken end.
  tear(kind, x1, y1, x2, y2) {
    if (kind !== "membrane") return;
    const length = Math.hypot(x2 - x1, y2 - y1) || 1;
    const ux = ((x2 - x1) / length) * TEAR_STUB;
    const uy = ((y2 - y1) / length) * TEAR_STUB;
    this.#stroke(x1, y1, x1 + ux, y1 + uy, this.palette.torn, 2.6);
    this.#stroke(x2, y2, x2 - ux, y2 - uy, this.palette.torn, 2.6);
  }

  clamp(x, yTop, yBottom) {
    const ctx = this.#ctx;
    ctx.fillStyle = this.palette.clamp;
    ctx.fillRect(x - 10, yTop, 10, yBottom - yTop);
    ctx.strokeStyle = this.palette.clamp;
    ctx.lineWidth = 1;
    for (let y = yTop; y < yBottom; y += 9) this.#stroke(x - 10, y, x - 20, y + 9, this.palette.clamp, 1);
    if (this.showLabels) this.#label("fixiert", x - 5, yTop - 8, this.palette["ink-soft"], "center");
  }

  grip(x, yTop, yBottom) {
    const ctx = this.#ctx;
    ctx.fillStyle = this.palette.clamp;
    ctx.fillRect(x, yTop, 8, yBottom - yTop);
    this.#pullArrow(x + 8, (yTop + yBottom) / 2);
    if (this.showLabels) this.#label("Zug", x + 4, yTop - 8, this.palette["ink-soft"], "center");
  }

  #pullArrow(x, y) {
    const length = 6 + 40 * (this.force / C.MAX_FORCE);
    const color = this.palette.ink;
    this.#stroke(x, y, x + length, y, color, 2.5);
    this.#stroke(x + length, y, x + length - 7, y - 6, color, 2.5);
    this.#stroke(x + length, y, x + length - 7, y + 6, color, 2.5);
  }

  #label(text, x, y, color, align) {
    const ctx = this.#ctx;
    ctx.font = `700 11px "Atkinson Hyperlegible", system-ui, sans-serif`;
    ctx.textAlign = align;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }
}

// ---- one simulated sheet with its readouts ---------------------------------

class SheetView {
  #withFilaments;
  #tissue;
  #painter;
  #chip;
  #strain;
  #desmosomes;

  constructor(withFilaments, suffix) {
    this.#withFilaments = withFilaments;
    this.#painter = new CanvasPainter(document.getElementById(`canvas-${suffix}`));
    this.#chip = document.getElementById(`chip-${suffix}`);
    this.#strain = document.getElementById(`strain-${suffix}`);
    this.#desmosomes = document.getElementById(`desmo-${suffix}`);
    this.reset();
  }

  reset() {
    this.#tissue = Tissue.build({ rows: ROWS, cols: COLS, withFilaments: this.#withFilaments, seed: SEED });
  }

  advance(force) {
    this.#tissue.relaxUnder(force, ITERATIONS_PER_FRAME);
  }

  render(force, settings) {
    Object.assign(this.#painter, settings, { force });
    this.#painter.begin();
    this.#tissue.drawOn(this.#painter);
    this.#report(this.#tissue.census());
  }

  refreshPalette() {
    this.#painter.palette = readPalette();
  }

  #report({ rupturedCells, broken, elongation }) {
    const torn = rupturedCells > 0;
    this.#chip.dataset.state = torn ? "torn" : "intact";
    this.#chip.textContent = torn ? `Zytolyse: ${rupturedCells} ${rupturedCells === 1 ? "Zelle" : "Zellen"}` : "intakt";
    this.#strain.textContent = `${Math.round(elongation * 100)} %`;
    this.#desmosomes.textContent = String(broken.desmosome);
  }
}

// ---- controller ---------------------------------------------------------

const sheets = [new SheetView(true, "a"), new SheetView(false, "b")];
const ramp = ForceRamp.over(RAMP_SECONDS, C.MAX_FORCE);
const ui = {
  play: document.getElementById("play"),
  reset: document.getElementById("reset"),
  force: document.getElementById("force"),
  forceValue: document.getElementById("force-value"),
  mode: document.getElementById("mode"),
  speed: document.getElementById("speed"),
  stress: document.getElementById("stress"),
  labels: document.getElementById("labels"),
};
const state = { playing: false, automatic: true, elapsed: 0, force: 0, lastTime: null };

function settings() {
  return { showStress: ui.stress.checked, showLabels: ui.labels.checked };
}

function renderAll() {
  sheets.forEach((sheet) => sheet.render(state.force, settings()));
  ui.forceValue.textContent = `${Math.round((100 * state.force) / C.MAX_FORCE)} %`;
  if (state.automatic) ui.force.value = String(Math.round((100 * state.force) / C.MAX_FORCE));
}

function setPlaying(playing) {
  state.playing = playing;
  state.lastTime = null;
  ui.play.textContent = playing ? "Pause" : ramp.isCompleteAt(state.elapsed) && state.automatic ? "Nochmal" : "Start";
}

function describeMode() {
  ui.mode.textContent = state.automatic
    ? "Automatische Steigerung. Regler ziehen, um die Kraft selbst einzustellen."
    : "Manuell. Zurücksetzen startet wieder die automatische Steigerung.";
}

function reset() {
  sheets.forEach((sheet) => sheet.reset());
  Object.assign(state, { automatic: true, elapsed: 0, force: 0 });
  describeMode();
  setPlaying(false);
  renderAll();
}

function advanceRamp(seconds) {
  state.elapsed += seconds * Number(ui.speed.value);
  state.force = ramp.forceAt(state.elapsed);
  if (ramp.isCompleteAt(state.elapsed)) setPlaying(false);
}

function frame(time) {
  if (state.playing) {
    const seconds = state.lastTime === null ? 0 : Math.min(0.1, (time - state.lastTime) / 1000);
    state.lastTime = time;
    if (state.automatic) advanceRamp(seconds);
    sheets.forEach((sheet) => sheet.advance(state.force));
  }
  renderAll();
  requestAnimationFrame(frame);
}

ui.play.addEventListener("click", () => {
  if (!state.playing && state.automatic && ramp.isCompleteAt(state.elapsed)) reset();
  setPlaying(!state.playing);
});
ui.reset.addEventListener("click", reset);
ui.force.addEventListener("input", () => {
  state.automatic = false;
  state.force = (Number(ui.force.value) / 100) * C.MAX_FORCE;
  describeMode();
  if (!state.playing) setPlaying(true);
});

function onThemeChange() {
  sheets.forEach((sheet) => sheet.refreshPalette());
}
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", onThemeChange);
new MutationObserver(onThemeChange).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
if (document.fonts) document.fonts.ready.then(renderAll);

reset();
requestAnimationFrame(frame);
