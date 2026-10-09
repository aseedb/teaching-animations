// Page wiring: one lamellipodium, a canvas that follows the leading edge,
// controls for proteins and drugs, and a film mode (#film) for recording.

import { Lamellipodium, HALF_HEIGHT_NM } from "./lamellipodium.js";
import { SeededRandom } from "./seededRandom.js";
import { SUBUNIT_NM } from "./filament.js";

const SEED = 11;
const VIEW_BEHIND_NM = 480; // network shown behind the membrane
const VIEW_AHEAD_NM = 50; // outside of the cell
const BAND = 2 * HALF_HEIGHT_NM;
const FILM = location.hash === "#film";
const SPEEDS = [0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 4]; // simulation steps per frame, from very slow to fast
let pending = 0;

const NOTES = {
  normal: ["Tretmühle", "Vorne wird ATP-Aktin eingebaut, das Netz altert nach hinten (ATP → ADP-Pi → ADP), Cofilin zerlegt die alten ADP-Filamente, und Profilin bringt die Monomere als ATP-Aktin wieder nach vorne."],
  noArp: ["Ohne Arp2/3", "Ohne Verzweigung entstehen keine neuen Plus-Enden. Die vorhandenen werden nach und nach gekappt, und der Vorschub erlahmt."],
  noCapping: ["Ohne Capping-Protein", "Kein Plus-Ende wird gekappt: wenige lange Filamente wachsen weiter und verbrauchen die Monomere, statt dass das Netz dicht und kurz bleibt."],
  noCofilin: ["Ohne Cofilin", "Die alten Filamente zerfallen nur langsam am Minus-Ende: es kommen weniger Monomere in den Pool zurück, und der Vorschub wird langsamer."],
};

const $ = (id) => document.getElementById(id);
const PROTEINS = ["arp23", "capping", "cofilin"];

function palette() {
  const style = getComputedStyle(document.documentElement);
  const names = ["cytoplasm", "outside", "membrane", "atp", "adppi", "adp", "arp", "capping", "ink", "ink-soft"];
  return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(`--${n}`).trim()]));
}
const STATE_COLOR = { ATP: "atp", "ADP-Pi": "adppi", ADP: "adp" };

function treatmentFromControls() {
  return { ...Object.fromEntries(PROTEINS.map((k) => [k, $(k).checked])), latrunculin: false, phalloidin: false };
}

let cell;
let playing = true;
let speedHistory = [];
let stepCount = 0;
let births = new Map(); // Arp2/3 daughter → step of its birth, for the pulse
const PULSE_STEPS = 40;

function reset() {
  cell = Lamellipodium.create(treatmentFromControls(), SeededRandom.of(SEED));
  speedHistory = [];
  stepCount = 0;
  births = new Map();
  cell.onBranch((b) => births.set(b, stepCount));
}

function stepCell() {
  cell.step();
  stepCount += 1;
  if (stepCount % 200 === 0) for (const [f, t] of births) if (stepCount - t > PULSE_STEPS) births.delete(f);
}

function fit(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * ratio)) {
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, w, h };
}

function draw() {
  const canvas = $("stage");
  const { ctx, w, h } = fit(canvas);
  const c = palette();
  const scale = w / (VIEW_BEHIND_NM + VIEW_AHEAD_NM);
  const m = cell.membraneX();
  const X = (x) => (x - (m - VIEW_BEHIND_NM)) * scale;
  const Y = (y) => h / 2 - y * scale;
  const bandTop = Y(HALF_HEIGHT_NM);
  const bandBottom = Y(-HALF_HEIGHT_NM);

  ctx.fillStyle = c.cytoplasm;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = c.outside;
  ctx.fillRect(X(m), 0, w - X(m), h);

  // filaments, drawn with their periodic copies inside the band
  ctx.save();
  ctx.beginPath(); ctx.rect(0, bandTop, X(m) + 2, bandBottom - bandTop); ctx.clip();
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1.6, SUBUNIT_NM * 0.9 * scale);
  for (const f of cell.filaments()) {
    const states = f.states();
    for (const dy of [-BAND, 0, BAND]) {
      let i = 0;
      while (i < states.length) {
        let j = i;
        while (j + 1 < states.length && states[j + 1] === states[i]) j++;
        const a = f.subunitPosition(i);
        const b = f.subunitPosition(j);
        ctx.strokeStyle = c[STATE_COLOR[states[i]]];
        ctx.beginPath(); ctx.moveTo(X(a.x), Y(a.y + dy)); ctx.lineTo(X(b.x) + 0.01, Y(b.y + dy)); ctx.stroke();
        i = j + 1;
      }
      if (f.isBranch()) {
        const p = f.pointedEnd();
        ctx.fillStyle = c.arp;
        ctx.beginPath(); ctx.arc(X(p.x), Y(p.y + dy), Math.max(2.5, 2.2 * scale), 0, Math.PI * 2); ctx.fill();
        const age = births.has(f) ? stepCount - births.get(f) : Infinity;
        if (age < PULSE_STEPS) {
          // a new branch: a new plus end is born
          const k = age / PULSE_STEPS;
          ctx.strokeStyle = c.arp;
          ctx.globalAlpha = 1 - k;
          ctx.lineWidth = Math.max(1.5, 1.2 * scale);
          ctx.beginPath(); ctx.arc(X(p.x), Y(p.y + dy), (3 + 10 * k) * scale, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.lineWidth = Math.max(1.6, SUBUNIT_NM * 0.9 * scale);
        }
      }
      if (!f.isCapped() && states.length) {
        const t = f.barbedTip();
        const r = Math.max(2.5, 2.1 * scale);
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = c.ink;
        ctx.lineWidth = Math.max(1, 0.6 * scale);
        ctx.beginPath(); ctx.arc(X(t.x), Y(t.y + dy), r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.lineWidth = Math.max(1.6, SUBUNIT_NM * 0.9 * scale);
      }
      if (f.hasCappingProtein() && states.length) {
        const t = f.barbedTip();
        ctx.fillStyle = c.capping;
        const s = Math.max(3, 2.6 * scale);
        ctx.fillRect(X(t.x) - s / 2, Y(t.y + dy) - s / 2, s, s);
      }
    }
  }
  ctx.restore();

  // membrane
  ctx.strokeStyle = c.membrane;
  ctx.lineWidth = Math.max(3, 4 * scale);
  ctx.beginPath(); ctx.moveTo(X(m) + 2, 0); ctx.lineTo(X(m) + 2, h); ctx.stroke();

  // labels: membrane label runs along the membrane, the rest sits in the free corners
  const font = Math.max(12, Math.round(w / 70));
  ctx.font = `${font}px ${getComputedStyle(document.body).fontFamily}`;
  ctx.fillStyle = c.membrane;
  ctx.save();
  ctx.translate(X(m) + 6 + font, h / 2);
  ctx.rotate(Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillText("Plasmamembran", 0, 0);
  ctx.restore();
  const caption = (text, x, align) => {
    ctx.textAlign = align;
    const tw = ctx.measureText(text).width;
    const left = align === "left" ? x - 4 : x - tw - 4;
    ctx.fillStyle = c.cytoplasm;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(left, h - font * 2, tw + 8, font * 1.6);
    ctx.globalAlpha = 1;
    ctx.fillStyle = c["ink-soft"];
    ctx.fillText(text, x, h - font * 0.8);
  };
  drawExplanation(ctx, h, c, font);
  caption("← älter: ADP, Abbau, Monomere zurück in den Pool", 10, "left");
  caption("Plus-Enden zur Membran →", X(m) - 10, "right");
  if (FILM) drawFilmLegend(ctx, w, h, c, font);
}

const EXPLANATION = [
  ["Arp2/3", "arp", "setzt seitlich ein Tochterfilament an (70°); jede Verzweigung bringt ein neues Plus-Ende"],
  ["Capping-Protein", "capping", "kappt ein Plus-Ende; es wächst nicht weiter"],
  ["Cofilin", "adp", "zerlegt alte ADP-Filamente; die Monomere kehren zurück"],
];

function drawExplanation(ctx, h, c, font) {
  const line = font * 1.5;
  const top = h - font * 2.4 - EXPLANATION.length * line - font * 0.6;
  const widths = EXPLANATION.map(([name, , text]) => ctx.measureText(`${name}: ${text}`).width);
  ctx.fillStyle = c.cytoplasm;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(4, top - font * 0.4, Math.max(...widths) + font * 2.6, EXPLANATION.length * line + font * 0.6);
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
  EXPLANATION.forEach(([name, color, text], k) => {
    const y = top + (k + 0.8) * line;
    ctx.fillStyle = c[color];
    ctx.fillRect(10, y - font * 0.45, font * 1.1, font * 0.5);
    ctx.font = `bold ${font}px ${getComputedStyle(document.body).fontFamily}`;
    ctx.fillStyle = c.ink;
    ctx.fillText(`${name}:`, 10 + font * 1.5, y);
    const nameW = ctx.measureText(`${name}: `).width;
    ctx.font = `${font}px ${getComputedStyle(document.body).fontFamily}`;
    ctx.fillText(text, 10 + font * 1.5 + nameW, y);
  });
}

function drawFilmLegend(ctx, w, h, c, font) {
  const items = [["ATP-Aktin", c.atp], ["ADP-Pi-Aktin", c.adppi], ["ADP-Aktin", c.adp], ["Arp2/3", c.arp], ["Capping-Protein", c.capping], ["wachsendes Plus-Ende", "#ffffff"]];
  let x = 10;
  const y = font * 1.6;
  ctx.textAlign = "left";
  const total = items.reduce((s, [label]) => s + font * 2.6 + ctx.measureText(label).width, 0);
  ctx.fillStyle = c.cytoplasm;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(0, 0, total + 10, font * 2.4);
  ctx.globalAlpha = 1;
  for (const [label, color] of items) {
    if (color === "#ffffff") {
      ctx.fillStyle = color; ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x + font * 0.55, y - font * 0.2, font * 0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(x, y - font * 0.45, font * 1.1, font * 0.5);
    }
    ctx.fillStyle = c.ink;
    ctx.fillText(label, x + font * 1.4, y);
    x += font * 1.4 + ctx.measureText(label).width + font * 1.2;
  }
}

function noteKey(t) {
  if (!t.arp23) return "noArp";
  if (!t.capping) return "noCapping";
  if (!t.cofilin) return "noCofilin";
  return "normal";
}

function updateReadout() {
  const t = cell.treatment();
  const fs = cell.filaments();
  const growing = fs.filter((f) => !f.isCapped()).length;
  speedHistory.push(cell.membraneX());
  if (speedHistory.length > 120) speedHistory.shift();
  const advance = speedHistory.length > 1 ? (speedHistory.at(-1) - speedHistory[0]) / (speedHistory.length - 1) : 0;
  $("readout").innerHTML =
    `<span>Vorschub <b>${advance.toFixed(2)} nm/Schritt</b></span>` +
    `<span>freie Monomere <b>${cell.pool()}</b></span>` +
    `<span>wachsende Plus-Enden <b>${growing}</b></span>`;
  const [title, text] = NOTES[noteKey(t)];
  $("note-title").textContent = title;
  $("note-text").textContent = text;
}

function frame() {
  if (playing) {
    pending += SPEEDS[Number($("speed").value)];
    const steps = Math.floor(pending);
    pending -= steps;
    for (let i = 0; i < steps; i++) stepCell();
    if (steps) updateReadout();
  }
  draw();
  if (!FILM) requestAnimationFrame(frame);
}

for (const id of PROTEINS) {
  $(id).addEventListener("change", () => { cell.treat(treatmentFromControls()); updateReadout(); });
}
$("play").addEventListener("click", () => { playing = !playing; $("play").textContent = playing ? "Pause" : "Weiter"; });
$("reset").addEventListener("click", () => { reset(); updateReadout(); draw(); });
window.addEventListener("resize", draw);
function showSpeed() {
  const perSecond = SPEEDS[Number($("speed").value)] * 60;
  $("speed-out").textContent = perSecond < 2 ? `${perSecond.toFixed(1)} Schritte/s` : `${Math.round(perSecond)} Schritte/s`;
}
$("speed").addEventListener("input", showSpeed);
$("step").addEventListener("click", () => { playing = false; $("play").textContent = "Weiter"; stepCell(); updateReadout(); draw(); });
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) $("speed").value = 3;
showSpeed();

// film mode: driven frame by frame from outside (headless recording)
if (FILM) document.body.classList.add("film");
window.film = {
  reset() { reset(); },
  treat(change) { cell.treat(change); },
  advance(steps) { for (let i = 0; i < steps; i++) stepCell(); },
  draw() { draw(); return true; },
};

reset();
updateReadout();
if (FILM) draw(); else requestAnimationFrame(frame);
