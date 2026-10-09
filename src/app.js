// Page wiring: one microtubule, three bands on one canvas, and a film mode
// (#film) for headless recording.

import { Microtubule, PROTOFILAMENTS, SEED_DIMERS, CELL_EDGE_DIMERS } from "./microtubule.js";
import { SeededRandom } from "./seededRandom.js";
import { DIMER_NM } from "./protofilament.js";

const SEED = 4;
const ZOOM_DIMERS = 60; // dimers shown behind the plus end in the zoom band
const PEEL_DIMERS = 7; // curled dimers per protofilament while shrinking
const HISTORY = 2400; // steps kept in the length plot
const FILM = location.hash === "#film";
const SPEEDS = [0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 4]; // simulation steps per frame, from very slow to fast
let pending = 0;

const NOTES = {
  growing: ["Wachstum", "GTP-Tubulin lagert sich am Plus-Ende an. Hinter der Spitze wird das GTP hydrolysiert; vorne bleibt eine kurze GTP-Kappe, die das Gitter zusammenhält."],
  shrinking: ["Katastrophe", "Die GTP-Kappe ist verloren. Die GDP-Protofilamente spreizen sich nach aussen ab und zerfallen rasch: der Mikrotubulus schrumpft viel schneller, als er gewachsen ist."],
  rescue: ["Rettung", "Das Schrumpfen stoppt, eine neue GTP-Kappe bildet sich, und der Mikrotubulus wächst wieder."],
  edge: ["Am Zellrand", "Am Zellrand kann das Plus-Ende nicht weiter wachsen. Die GTP-Kappe geht verloren, und es folgt eine Katastrophe."],
};

const $ = (id) => document.getElementById(id);

function palette() {
  const style = getComputedStyle(document.documentElement);
  const names = ["stage", "gtp", "gdp", "catastrophe", "rescue", "centrosome", "edge", "ink", "ink-soft", "rule"];
  return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(`--${n}`).trim()]));
}

let mt;
let history;
let lastPhase;
let note = "growing";
let playing = true;
let stepCount = 0;

function reset() {
  mt = Microtubule.create(Number($("tubulin").value), SeededRandom.of(SEED));
  history = [];
  lastPhase = mt.phase();
  note = "growing";
  stepCount = 0;
}

function advance(steps) {
  for (let i = 0; i < steps; i++) {
    mt.step();
    stepCount += 1;
    const phase = mt.phase();
    if (phase !== lastPhase) note = phase === "growing" ? "rescue" : atEdge() ? "edge" : "shrinking";
    else if (phase === "growing" && note === "rescue" && mt.lengthNm() > 0 && stepCount % 200 === 0) note = "growing";
    lastPhase = phase;
    history.push({ length: mt.lengthNm(), phase });
    if (history.length > HISTORY) history.shift();
  }
}

function atEdge() {
  return Math.max(...mt.protofilaments().map((p) => p.length)) >= CELL_EDGE_DIMERS - 2;
}

function fit(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * ratio)) { canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio); }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, w, h };
}

function draw() {
  const { ctx, w, h } = fit($("stage"));
  const c = palette();
  const font = Math.max(12, Math.round(w / 70));
  ctx.font = `${font}px ${getComputedStyle(document.body).fontFamily}`;
  ctx.fillStyle = c.stage;
  ctx.fillRect(0, 0, w, h);
  const pad = Math.round(w * 0.03);
  drawOverview(ctx, c, font, pad, w, h * 0.06, h * 0.2);
  drawZoom(ctx, c, font, pad, w, h * 0.3, h * 0.36);
  drawPlot(ctx, c, font, pad, w, h * 0.72, h * 0.25);
}

// band 1: the whole microtubule from centrosome to cell edge
function drawOverview(ctx, c, font, pad, w, top, height) {
  const x0 = pad + font * 2;
  const x1 = w - pad - font * 2;
  const y = top + height * 0.55;
  const X = (dimers) => x0 + ((dimers - SEED_DIMERS) / (CELL_EDGE_DIMERS - SEED_DIMERS)) * (x1 - x0);
  ctx.fillStyle = c.centrosome;
  ctx.beginPath(); ctx.arc(x0 - font * 0.8, y, font * 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = c.edge; ctx.lineWidth = 3; ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.moveTo(x1 + 6, top); ctx.lineTo(x1 + 6, top + height); ctx.stroke(); ctx.setLineDash([]);
  const pfs = mt.protofilaments();
  const mean = pfs.reduce((s, p) => s + p.length, 0) / pfs.length;
  const cap = mt.meanCapDimers();
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(6, height * 0.22);
  ctx.strokeStyle = c.gdp;
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(X(mean), y); ctx.stroke();
  if (cap > 0.3) {
    ctx.strokeStyle = c.gtp;
    ctx.beginPath(); ctx.moveTo(X(Math.max(SEED_DIMERS, mean - Math.max(cap, 8))), y); ctx.lineTo(X(mean), y); ctx.stroke();
  }
  ctx.fillStyle = c.ink;
  ctx.textAlign = "left";
  ctx.fillText("Zentrosom (Minus-Ende)", x0 - font * 1.6, top + font * 0.2);
  ctx.textAlign = "right";
  ctx.fillText("Zellrand", x1, top + font * 0.2);
  ctx.textAlign = "center";
  ctx.fillStyle = mt.phase() === "growing" ? c.gtp : c.catastrophe;
  const state = { growing: "Plus-Ende wächst", shrinking: "Katastrophe: Plus-Ende schrumpft", rescue: "Rettung: Plus-Ende wächst wieder", edge: "Zellrand erreicht: Katastrophe" }[note];
  ctx.font = `bold ${font}px ${getComputedStyle(document.body).fontFamily}`;
  ctx.fillText(state, Math.min(Math.max(X(mean), x0 + font * 9), x1 - font * 10), y - height * 0.3);
  ctx.font = `${font}px ${getComputedStyle(document.body).fontFamily}`;
}

// band 2: the plus end, dimer by dimer, 13 protofilaments drawn side by side
function drawZoom(ctx, c, font, pad, w, top, height) {
  const pfs = mt.protofilaments();
  const tip = Math.max(...pfs.map((p) => p.length));
  const first = Math.max(0, tip - ZOOM_DIMERS);
  const right = w - pad - font * 10;
  const dimerW = (right - pad) / (ZOOM_DIMERS + 2);
  const rowH = height / (PROTOFILAMENTS + 1);
  const X = (i) => pad + (i - first) * dimerW;
  const shrinking = mt.phase() === "shrinking";
  ctx.fillStyle = c["ink-soft"];
  ctx.textAlign = "left";
  ctx.fillText("Plus-Ende vergrössert: 13 Protofilamente", pad, top - font * 0.2);
  pfs.forEach((states, r) => {
    const y = top + (r + 0.5) * rowH;
    const curlFrom = shrinking ? Math.max(first, states.length - PEEL_DIMERS) : states.length;
    for (let i = first; i < states.length; i++) {
      ctx.fillStyle = states[i] === "GTP" ? c.gtp : c.gdp;
      if (i < curlFrom) {
        ctx.fillRect(X(i) + 1, y - rowH * 0.36, dimerW - 2, rowH * 0.72);
      } else {
        // ram's horns: the GDP protofilament curls away from the lattice
        const k = i - curlFrom + 1;
        const side = r < PROTOFILAMENTS / 2 ? -1 : 1;
        const angle = side * k * 0.16;
        const cx = X(curlFrom) + Math.sin(Math.abs(angle)) * k * dimerW * 0.8;
        const cy = y + side * (1 - Math.cos(angle)) * k * dimerW * 0.7;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
        ctx.fillRect(0, -rowH * 0.36, dimerW - 2, rowH * 0.72);
        ctx.restore();
      }
    }
  });
  // legend at the right of the zoom
  const lx = right + font * 1.2;
  [["GTP-Tubulin", c.gtp], ["GDP-Tubulin", c.gdp]].forEach(([label, color], k) => {
    const ly = top + height * 0.35 + k * font * 1.6;
    ctx.fillStyle = color; ctx.fillRect(lx, ly - font * 0.7, font * 1.2, font * 0.8);
    ctx.fillStyle = c.ink; ctx.textAlign = "left"; ctx.fillText(label, lx + font * 1.6, ly);
  });
}

// band 3: length over time, coloured by phase
function drawPlot(ctx, c, font, pad, w, top, height) {
  const x0 = pad + font * 3;
  const x1 = w - pad;
  const maxL = CELL_EDGE_DIMERS * DIMER_NM;
  const Y = (nm) => top + height - (nm / maxL) * height;
  ctx.strokeStyle = c.rule; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x0, top + height); ctx.lineTo(x1, top + height); ctx.stroke();
  ctx.fillStyle = c["ink-soft"]; ctx.textAlign = "right";
  for (const um of [0, 4, 8]) ctx.fillText(`${um} µm`, x0 - 6, Y(um * 1000) + font * 0.35);
  ctx.textAlign = "left";
  ctx.fillText("Länge über die Zeit", x0 + 8, top + font * 0.2);
  if (history.length < 2) return;
  ctx.lineWidth = 2.5;
  for (let i = 1; i < history.length; i++) {
    const a = history[i - 1], b = history[i];
    ctx.strokeStyle = b.phase === "growing" ? c.gtp : c.catastrophe;
    ctx.beginPath();
    ctx.moveTo(x0 + ((i - 1) / HISTORY) * (x1 - x0), Y(a.length));
    ctx.lineTo(x0 + (i / HISTORY) * (x1 - x0), Y(b.length));
    ctx.stroke();
  }
}

const READOUT_INTERVAL_MS = 500; // numbers below the stage change twice a second, not every frame
let lastReadout = 0;

function updateReadoutSometimes() {
  const now = performance.now();
  if (now - lastReadout < READOUT_INTERVAL_MS) return;
  lastReadout = now;
  updateReadout();
}

function updateReadout() {
  const phase = mt.phase();
  $("readout").innerHTML =
    `<span class="chip" data-phase="${phase}">${phase === "growing" ? "Wachstum" : "Schrumpfen"}</span>` +
    `<span>Länge <b>${(mt.lengthNm() / 1000).toFixed(2)} µm</b></span>` +
    `<span>GTP-Kappe <b>${mt.meanCapDimers().toFixed(1)} Dimere</b></span>` +
    `<span>Katastrophen <b>${mt.catastrophes()}</b></span>` +
    `<span>Rettungen <b>${mt.rescues()}</b></span>`;
  const [title, text] = NOTES[note];
  $("note-title").textContent = title;
  $("note-text").textContent = text;
}

function frame() {
  if (playing) {
    pending += SPEEDS[Number($("speed").value)];
    const steps = Math.floor(pending);
    pending -= steps;
    if (steps) { advance(steps); updateReadoutSometimes(); }
  }
  draw();
  requestAnimationFrame(frame);
}

$("tubulin").addEventListener("input", (e) => { $("tubulin-out").textContent = `${e.target.value} µM`; mt.setTubulin(Number(e.target.value)); });
$("play").addEventListener("click", () => { playing = !playing; $("play").textContent = playing ? "Pause" : "Weiter"; });
$("reset").addEventListener("click", () => { reset(); updateReadout(); draw(); });
window.addEventListener("resize", draw);
function showSpeed() {
  const perSecond = SPEEDS[Number($("speed").value)] * 60;
  $("speed-out").textContent = perSecond < 10 ? `${perSecond.toFixed(perSecond < 2 ? 1 : 0)} Schritte/s` : `${Math.round(perSecond)} Schritte/s`;
}
$("speed").addEventListener("input", showSpeed);
$("step").addEventListener("click", () => { playing = false; $("play").textContent = "Weiter"; advance(1); updateReadout(); draw(); });
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) $("speed").value = 3;
showSpeed();

if (FILM) document.body.classList.add("film");
window.film = {
  reset() { reset(); },
  advance(steps) { advance(steps); },
  draw() { draw(); return true; },
  phase() { return mt.phase(); },
};

reset();
updateReadout();
if (FILM) draw(); else requestAnimationFrame(frame);
