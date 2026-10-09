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

const NOTES = {
  normal: ["Tretmühle", "Vorne wird ATP-Aktin eingebaut, das Netz altert nach hinten (ATP → ADP-Pi → ADP), Cofilin zerlegt die alten ADP-Filamente, und Profilin bringt die Monomere als ATP-Aktin wieder nach vorne."],
  latrunculin: ["Latrunculin", "Latrunculin bindet die freien Monomere (1:1). Ohne Nachschub hört die Polymerisation auf: die Membran bleibt stehen, während hinten das Netz weiter zerfällt."],
  phalloidin: ["Phalloidin", "Phalloidin stabilisiert die Filamente: sie zerfallen nicht mehr. Der Monomer-Pool wird aufgebraucht, und die Membran kommt allmählich zum Stillstand."],
  noArp: ["Ohne Arp2/3", "Ohne Verzweigung entstehen keine neuen Plus-Enden. Die vorhandenen werden nach und nach gekappt, und der Vorschub erlahmt."],
  noCapping: ["Ohne Capping-Protein", "Kein Plus-Ende wird gekappt: wenige lange Filamente wachsen weiter und verbrauchen die Monomere, statt dass das Netz dicht und kurz bleibt."],
  noCofilin: ["Ohne Cofilin", "Die alten Filamente zerfallen nur langsam am Minus-Ende: es kommen weniger Monomere in den Pool zurück, und der Vorschub wird langsamer."],
};

const $ = (id) => document.getElementById(id);

function palette() {
  const style = getComputedStyle(document.documentElement);
  const names = ["cytoplasm", "outside", "membrane", "atp", "adppi", "adp", "arp", "capping", "ink", "ink-soft"];
  return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(`--${n}`).trim()]));
}
const STATE_COLOR = { ATP: "atp", "ADP-Pi": "adppi", ADP: "adp" };

function treatmentFromControls() {
  return Object.fromEntries(["arp23", "capping", "cofilin", "latrunculin", "phalloidin"].map((k) => [k, $(k).checked]));
}

let cell;
let playing = true;
let speedHistory = [];

function reset() {
  cell = Lamellipodium.create(treatmentFromControls(), SeededRandom.of(SEED));
  speedHistory = [];
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
  caption("← älter: ADP, Abbau, Monomere zurück in den Pool", 10, "left");
  caption("Plus-Enden zur Membran →", X(m) - 10, "right");
  if (FILM) drawFilmLegend(ctx, w, h, c, font);
}

function drawFilmLegend(ctx, w, h, c, font) {
  const items = [["ATP-Aktin", c.atp], ["ADP-Pi-Aktin", c.adppi], ["ADP-Aktin", c.adp], ["Arp2/3", c.arp], ["Capping-Protein", c.capping]];
  let x = 10;
  const y = font * 1.6;
  ctx.textAlign = "left";
  const total = items.reduce((s, [label]) => s + font * 2.6 + ctx.measureText(label).width, 0);
  ctx.fillStyle = c.cytoplasm;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(0, 0, total + 10, font * 2.4);
  ctx.globalAlpha = 1;
  for (const [label, color] of items) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y - font * 0.45, font * 1.1, font * 0.5);
    ctx.fillStyle = c.ink;
    ctx.fillText(label, x + font * 1.4, y);
    x += font * 1.4 + ctx.measureText(label).width + font * 1.2;
  }
}

function noteKey(t) {
  if (t.latrunculin) return "latrunculin";
  if (t.phalloidin) return "phalloidin";
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
    (cell.sequestered() ? `<span>durch Latrunculin gebunden <b>${cell.sequestered()}</b></span>` : "") +
    `<span>wachsende Plus-Enden <b>${growing}</b></span>`;
  const [title, text] = NOTES[noteKey(t)];
  $("note-title").textContent = title;
  $("note-text").textContent = text;
}

function frame() {
  if (playing) {
    const steps = Number($("speed").value);
    for (let i = 0; i < steps; i++) cell.step();
    updateReadout();
  }
  draw();
  if (!FILM) requestAnimationFrame(frame);
}

for (const id of ["arp23", "capping", "cofilin", "latrunculin", "phalloidin"]) {
  $(id).addEventListener("change", () => { cell.treat(treatmentFromControls()); updateReadout(); });
}
$("play").addEventListener("click", () => { playing = !playing; $("play").textContent = playing ? "Pause" : "Weiter"; });
$("reset").addEventListener("click", () => { reset(); updateReadout(); draw(); });
window.addEventListener("resize", draw);
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) $("speed").value = 1;

// film mode: driven frame by frame from outside (headless recording)
if (FILM) document.body.classList.add("film");
window.film = {
  reset() { reset(); },
  treat(change) { cell.treat(change); },
  advance(steps) { for (let i = 0; i < steps; i++) cell.step(); },
  draw() { draw(); return true; },
};

reset();
updateReadout();
if (FILM) draw(); else requestAnimationFrame(frame);
