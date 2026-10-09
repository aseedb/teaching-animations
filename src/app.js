// Page wiring: one scene (microtubule + history), three bands on one canvas,
// a guided tour with highlights, and a film mode (#film) for recording.

import { PROTOFILAMENTS, SEED_DIMERS, CELL_EDGE_DIMERS } from "./microtubule.js";
import { DIMER_NM } from "./protofilament.js";
import { Scene, HISTORY_STEPS } from "./scene.js";
import { Tour } from "./tour.js";
import { MT_TOUR } from "./mtTour.js";

const SEED = 4;
const ZOOM_DIMERS = 60; // dimers shown behind the plus end in the zoom band
const PEEL_DIMERS = 7; // curled dimers per protofilament while shrinking
const FILM = location.hash === "#film";
const SPEEDS = [0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 4]; // simulation steps per 60 Hz frame, from very slow to fast
const READOUT_INTERVAL_MS = 500; // numbers below the stage change twice a second, not every frame

const NOTES = {
  growing: ["Wachstum", "GTP-Tubulin lagert sich am Plus-Ende an. Hinter der Spitze wird das GTP hydrolysiert; vorne bleibt eine kurze GTP-Kappe, die das Gitter zusammenhält."],
  shrinking: ["Katastrophe", "Die GTP-Kappe ist verloren. Die GDP-Protofilamente spreizen sich nach aussen ab und zerfallen rasch: der Mikrotubulus schrumpft viel schneller, als er gewachsen ist."],
  rescue: ["Rettung", "Das Schrumpfen stoppt, eine neue GTP-Kappe bildet sich, und der Mikrotubulus wächst wieder."],
  edge: ["Am Zellrand", "Am Zellrand kann das Plus-Ende nicht weiter wachsen. Die GTP-Kappe geht verloren, und es folgt eine Katastrophe."],
};
const STATE_LABEL = { growing: "Plus-Ende wächst", shrinking: "Katastrophe: Plus-Ende schrumpft", rescue: "Rettung: Plus-Ende wächst wieder", edge: "Zellrand erreicht: Katastrophe" };

const $ = (id) => document.getElementById(id);
const scene = Scene.empty();
let playing = true;
let pending = 0;
let lastReadout = 0;
let tour = null;
let targets = {}; // pixel geometry of what the tour can point at, refreshed at every draw

function palette() {
  const style = getComputedStyle(document.documentElement);
  const names = ["stage", "gtp", "gdp", "catastrophe", "rescue", "centrosome", "edge", "ink", "ink-soft", "rule", "highlight", "surface"];
  return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(`--${n}`).trim()]));
}

function reset() {
  scene.reset(SEED, Number($("tubulin").value), 0);
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

const fontOf = (size, bold) => `${bold ? "bold " : ""}${size}px ${getComputedStyle(document.body).fontFamily}`;

function draw() {
  const { ctx, w, h } = fit($("stage"));
  const c = palette();
  const font = Math.max(12, Math.round(w / 70));
  ctx.font = fontOf(font);
  ctx.fillStyle = c.stage;
  ctx.fillRect(0, 0, w, h);
  targets = {};
  const pad = Math.round(w * 0.03);
  drawOverview(ctx, c, font, pad, w, h * 0.06, h * 0.2);
  drawZoom(ctx, c, font, pad, w, h * 0.3, h * 0.36);
  drawPlot(ctx, c, font, pad, w, h * 0.72, h * 0.25);
  if (tour && !tour.isOver()) drawHighlights(ctx, c, font, w, h, tour.highlights());
}

// band 1: the whole microtubule from centrosome to cell edge
function drawOverview(ctx, c, font, pad, w, top, height) {
  const mt = scene.microtubule();
  const x0 = pad + font * 2;
  const x1 = w - pad - font * 2;
  const y = top + height * 0.55;
  const X = (dimers) => x0 + ((dimers - SEED_DIMERS) / (CELL_EDGE_DIMERS - SEED_DIMERS)) * (x1 - x0);
  ctx.fillStyle = c.centrosome;
  ctx.beginPath(); ctx.arc(x0 - font * 0.8, y, font * 0.8, 0, Math.PI * 2); ctx.fill();
  targets.centrosome = { x: x0 - font * 0.8, y, r: font * 1.6, labelSide: "below" };
  ctx.strokeStyle = c.edge; ctx.lineWidth = 3; ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.moveTo(x1 + 6, top); ctx.lineTo(x1 + 6, top + height); ctx.stroke(); ctx.setLineDash([]);
  targets.cellEdge = { x: x1 + 6, y: top + height / 2, r: height * 0.45, labelSide: "left" };
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
  targets.plusEndOverview = { x: X(mean), y, r: height * 0.45, labelSide: "below" };
  ctx.fillStyle = c.ink;
  ctx.textAlign = "left";
  ctx.fillText("Zentrosom (Minus-Ende)", x0 - font * 1.6, top + font * 0.2);
  ctx.textAlign = "right";
  ctx.fillText("Zellrand", x1, top + font * 0.2);
  ctx.textAlign = "center";
  ctx.fillStyle = mt.phase() === "growing" ? c.gtp : c.catastrophe;
  ctx.font = fontOf(font, true);
  ctx.fillText(STATE_LABEL[scene.note()], Math.min(Math.max(X(mean), x0 + font * 9), x1 - font * 10), y - height * 0.3);
  ctx.font = fontOf(font);
}

// band 2: the plus end, dimer by dimer, 13 protofilaments drawn side by side
function drawZoom(ctx, c, font, pad, w, top, height) {
  const mt = scene.microtubule();
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
  let capStart = Infinity;
  let curlBox = null;
  pfs.forEach((states, r) => {
    const y = top + (r + 0.5) * rowH;
    const curlFrom = shrinking ? Math.max(first, states.length - PEEL_DIMERS) : states.length;
    let k0 = states.length;
    while (k0 > 0 && states[k0 - 1] === "GTP") k0--;
    if (k0 < states.length) capStart = Math.min(capStart, Math.max(first, k0));
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
        curlBox = curlBox ? { x0: Math.min(curlBox.x0, cx), x1: Math.max(curlBox.x1, cx + dimerW), y0: Math.min(curlBox.y0, cy), y1: Math.max(curlBox.y1, cy) } : { x0: cx, x1: cx + dimerW, y0: cy, y1: cy };
      }
    }
  });
  targets.zoomTip = { x: X(tip), y: top + height / 2, r: rowH * 2 };
  targets.zoomGdp = { x: X(Math.max(first, tip - 35)), y: top + height * 0.75, r: rowH };
  if (capStart < Infinity) targets.gtpCap = { x0: X(capStart), x1: X(tip), y: top - font * 1.6 };
  if (curlBox) targets.curls = { x: (curlBox.x0 + curlBox.x1) / 2, y: (curlBox.y0 + curlBox.y1) / 2, r: Math.max(curlBox.x1 - curlBox.x0, curlBox.y1 - curlBox.y0) * 0.65 };
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
  const history = scene.history();
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
  targets.plot = { x: (x0 + x1) / 2, y: top + height / 2, rx: (x1 - x0) / 2, ry: height / 2 };
  if (history.length < 2) return;
  const XS = (i) => x0 + (i / HISTORY_STEPS) * (x1 - x0);
  ctx.lineWidth = 2.5;
  for (let i = 1; i < history.length; i++) {
    const a = history[i - 1], b = history[i];
    ctx.strokeStyle = b.phase === "growing" ? c.gtp : c.catastrophe;
    ctx.beginPath(); ctx.moveTo(XS(i - 1), Y(a.length)); ctx.lineTo(XS(i), Y(b.length)); ctx.stroke();
  }
  targets.plotNow = { x: XS(history.length - 1), y: Y(history.at(-1).length), r: height * 0.22 };
}

// ---- tour highlights -----------------------------------------------------

function labelAt(ctx, c, font, text, x, y, align = "center") {
  if (!text) return;
  ctx.font = fontOf(font, true);
  ctx.textAlign = align;
  const tw = ctx.measureText(text).width;
  const left = align === "center" ? x - tw / 2 : align === "left" ? x : x - tw;
  ctx.fillStyle = c.surface;
  ctx.globalAlpha = 0.92;
  ctx.fillRect(left - 6, y - font * 1.05, tw + 12, font * 1.45);
  ctx.globalAlpha = 1;
  ctx.fillStyle = c.highlight;
  ctx.fillText(text, x, y);
  ctx.font = fontOf(font);
}

function drawHighlights(ctx, c, font, w, h, highlights) {
  ctx.strokeStyle = c.highlight;
  ctx.lineWidth = Math.max(3, font / 4);
  for (const hl of highlights) {
    const t = targets[hl.target];
    if (!t) continue;
    const kinds = {
      ring: () => {
        ctx.beginPath();
        if (t.rx) ctx.ellipse(t.x, t.y, t.rx + 8, t.ry + 8, 0, 0, Math.PI * 2);
        else ctx.arc(t.x, t.y, t.r + 6, 0, Math.PI * 2);
        ctx.stroke();
        const r = t.ry ?? t.r;
        if (t.labelSide === "left") labelAt(ctx, c, font, hl.label, t.x - r - font, t.y + font * 0.4, "right");
        else if (t.labelSide === "below") labelAt(ctx, c, font, hl.label, Math.min(Math.max(t.x, font * 8), w - font * 8), t.y + r + font * 1.8);
        else labelAt(ctx, c, font, hl.label, Math.min(Math.max(t.x, font * 8), w - font * 8), Math.max(font * 1.4, t.y - r - font * 0.6));
      },
      arrow: () => {
        const sx = t.x - font * 6, sy = t.y - font * 3.5;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(t.x - 4, t.y - 4); ctx.stroke();
        const a = Math.atan2(t.y - sy, t.x - sx);
        ctx.beginPath();
        ctx.moveTo(t.x, t.y);
        ctx.lineTo(t.x - font * 0.9 * Math.cos(a - 0.45), t.y - font * 0.9 * Math.sin(a - 0.45));
        ctx.lineTo(t.x - font * 0.9 * Math.cos(a + 0.45), t.y - font * 0.9 * Math.sin(a + 0.45));
        ctx.closePath(); ctx.fillStyle = c.highlight; ctx.fill();
        labelAt(ctx, c, font, hl.label, sx, sy - font * 0.4, "right");
      },
      bracket: () => {
        ctx.beginPath();
        ctx.moveTo(t.x0, t.y + font * 0.6); ctx.lineTo(t.x0, t.y); ctx.lineTo(t.x1, t.y); ctx.lineTo(t.x1, t.y + font * 0.6);
        ctx.stroke();
        labelAt(ctx, c, font, hl.label, (t.x0 + t.x1) / 2, t.y - font * 0.4);
      },
    };
    kinds[hl.type]?.();
    ctx.strokeStyle = c.highlight;
    ctx.lineWidth = Math.max(3, font / 4);
  }
}

// ---- readout and tour panel ----------------------------------------------

function updateReadout() {
  const mt = scene.microtubule();
  const phase = mt.phase();
  $("readout").innerHTML =
    `<span class="chip" data-phase="${phase}">${phase === "growing" ? "Wachstum" : "Schrumpfen"}</span>` +
    `<span>Länge <b>${(mt.lengthNm() / 1000).toFixed(2)} µm</b></span>` +
    `<span>GTP-Kappe <b>${mt.meanCapDimers().toFixed(1)} Dimere</b></span>` +
    `<span>Katastrophen <b>${mt.catastrophes()}</b></span>` +
    `<span>Rettungen <b>${mt.rescues()}</b></span>` +
    `<span>Tubulin <b>${mt.tubulin()} µM</b></span>`;
  const [title, text] = NOTES[scene.note()];
  $("note-title").textContent = title;
  $("note-text").textContent = text;
}

function updateReadoutSometimes() {
  const now = performance.now();
  if (now - lastReadout < READOUT_INTERVAL_MS) return;
  lastReadout = now;
  updateReadout();
}

function showTourStep() {
  const step = tour.step();
  $("tour-title").textContent = step.title;
  $("tour-text").textContent = step.text;
  $("tour-progress").textContent = tour.progress();
  $("tour-back").disabled = tour.index() === 0;
  $("tour-next").textContent = tour.index() === MT_TOUR.length - 1 ? "Tour beenden" : "Weiter";
  updateTourState();
  updateReadout();
}

function updateTourState() {
  $("tour-state").textContent = tour.isWaiting() ? "" : "läuft …";
  $("tour-next").classList.toggle("ready", tour.isWaiting());
}

function startTour() {
  tour = Tour.start(MT_TOUR, scene);
  document.body.classList.add("touring");
  $("tour").hidden = false;
  showTourStep();
}

function endTour() {
  tour = null;
  document.body.classList.remove("touring");
  $("tour").hidden = true;
  $("tubulin").value = scene.microtubule().tubulin();
  $("tubulin-out").textContent = `${$("tubulin").value} µM`;
  updateReadout();
}

// ---- loop and wiring -----------------------------------------------------

// the pace follows the clock, not the screen's refresh rate (60 or 120 Hz)
const FRAME_MS = 1000 / 60;
const MAX_FRAMES_PER_TICK = 4; // after a pause (hidden tab), do not jump ahead
let lastFrame = null;

function frame(now) {
  const frames = lastFrame === null ? 1 : Math.min(MAX_FRAMES_PER_TICK, (now - lastFrame) / FRAME_MS);
  lastFrame = now;
  if (tour) {
    const wasWaiting = tour.isWaiting();
    tour.tick(frames);
    if (tour.isWaiting() !== wasWaiting) { updateTourState(); updateReadout(); }
    else updateReadoutSometimes();
  } else if (playing) {
    pending += SPEEDS[Number($("speed").value)] * frames;
    const steps = Math.floor(pending);
    pending -= steps;
    if (steps) { scene.advance(steps); updateReadoutSometimes(); }
  }
  draw();
  requestAnimationFrame(frame);
}

function showSpeed() {
  const perSecond = SPEEDS[Number($("speed").value)] * 60;
  $("speed-out").textContent = perSecond < 10 ? `${perSecond.toFixed(perSecond < 2 ? 1 : 0)} Schritte/s` : `${Math.round(perSecond)} Schritte/s`;
}

$("tubulin").addEventListener("input", (e) => { $("tubulin-out").textContent = `${e.target.value} µM`; scene.microtubule().setTubulin(Number(e.target.value)); });
$("play").addEventListener("click", () => { playing = !playing; $("play").textContent = playing ? "Pause" : "Abspielen"; });
$("reset").addEventListener("click", () => { reset(); updateReadout(); draw(); });
$("speed").addEventListener("input", showSpeed);
$("step").addEventListener("click", () => { playing = false; $("play").textContent = "Abspielen"; scene.advance(1); updateReadout(); draw(); });
$("tour-start").addEventListener("click", startTour);
$("tour-next").addEventListener("click", () => { tour.next(); if (tour.isOver()) endTour(); else showTourStep(); });
$("tour-back").addEventListener("click", () => { tour.back(); showTourStep(); });
$("tour-exit").addEventListener("click", endTour);
window.addEventListener("resize", draw);
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) $("speed").value = 3;
showSpeed();

if (FILM) document.body.classList.add("film");
window.film = {
  reset() { reset(); },
  advance(steps) { scene.advance(steps); },
  draw() { draw(); return true; },
  phase() { return scene.microtubule().phase(); },
};

reset();
updateReadout();
if (FILM) draw(); else requestAnimationFrame(frame);
