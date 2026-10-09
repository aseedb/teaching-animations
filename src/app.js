// Page wiring: one sarcomere drawing, one force-length curve, shared length.

import { Species } from "./species.js";
import { Sarcomere } from "./sarcomere.js";
import { explain } from "./region.js";

const MIN_LENGTH = 1.2;
const MAX_LENGTH = 4.3;
const SPEED = 0.45; // µm per second during playback
const CONTRACTED = 1.6;
const STRETCHED = 4.0;
const SPECIES = { rabbit: Species.rabbit(), frog: Species.frog() };
const SPECIES_NOTE = {
  rabbit: "Kaninchen (M. psoas): Aktinfilament 1.13 µm, Myosinfilament 1.65 µm. Optimale Länge 2.26 bis 2.46 µm; Titin beginnt ab etwa 2.65 µm passive Spannung zu tragen.",
  frog: "Frosch (M. semitendinosus): die klassische Messung von Gordon, Huxley und Julian (1966). Plateau 2.05 bis 2.2 µm, keine aktive Kraft mehr ab 3.65 µm. Für den Frosch ist hier keine Titinkurve hinterlegt.",
};

const $ = (id) => document.getElementById(id);
const fmt = (v) => v.toFixed(2);

function palette() {
  const style = getComputedStyle(document.documentElement);
  const names = ["stage", "ink", "ink-soft", "rule", "actin", "myosin", "head", "bridge", "zdisc", "titin", "titin-taut", "band", "curve", "passive", "accent"];
  return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(`--${n}`).trim()]));
}

function fitCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) {
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

// ---- sarcomere drawing ---------------------------------------------------

function drawZigzag(ctx, x0, x1, y, amplitude, teeth) {
  ctx.beginPath();
  ctx.moveTo(x0, y);
  for (let i = 1; i <= teeth * 2; i++) {
    const x = x0 + ((x1 - x0) * i) / (teeth * 2);
    ctx.lineTo(x, i === teeth * 2 ? y : y + (i % 2 ? -amplitude : amplitude));
  }
  ctx.stroke();
}

// labels: longest first; the first one that fits the bracket is drawn
function drawBracket(ctx, x0, x1, y, labels, color) {
  if (x1 - x0 < 2) return;
  const label = labels.find((l) => ctx.measureText(l).width + 6 <= x1 - x0) ?? labels[labels.length - 1];
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x0, y - 5); ctx.lineTo(x0, y); ctx.lineTo(x1, y); ctx.lineTo(x1, y - 5);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillText(label, (x0 + x1) / 2, y + 14);
}

function drawSarcomere(canvas, sarcomere, opts) {
  const { ctx, w, h } = fitCanvas(canvas);
  const c = opts.colors;
  const scale = (w - 40) / MAX_LENGTH;
  const X = (um) => w / 2 + um * scale;
  const layout = sarcomere.layout();
  const top = 34;
  const bottom = h - 84; // room for the band brackets below the filaments
  const rows = [0, 1, 2, 3, 4].map((i) => top + ((bottom - top) * i) / 4);
  const thinRows = [rows[0], rows[2], rows[4]];
  const thickRows = [rows[1], rows[3]];
  const passive = opts.titin ? sarcomere.passiveTension() ?? 0 : 0;

  // M line
  ctx.strokeStyle = c["ink-soft"];
  ctx.setLineDash([3, 4]);
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(X(0), rows[0] - 14); ctx.lineTo(X(0), rows[4] + 14); ctx.stroke();
  ctx.setLineDash([]);

  // titin: from Z disc to the tip of the thick filament
  if (opts.titin) {
    ctx.strokeStyle = passive > 0.02 ? c["titin-taut"] : c.titin;
    ctx.lineWidth = 1.4;
    const [left, right] = layout.zDiscs;
    const [tl, tr] = layout.thickFilament;
    const span = Math.max(0, X(tl) - X(left));
    const amplitude = Math.max(0.6, 5 * (1 - Math.min(1, passive * 1.5)));
    for (const y of thickRows) {
      drawZigzag(ctx, X(left), X(tl), y, amplitude, Math.max(2, Math.round(span / 9)));
      drawZigzag(ctx, X(tr), X(right), y, amplitude, Math.max(2, Math.round(span / 9)));
    }
  }

  // thin filaments (actin)
  ctx.strokeStyle = c.actin;
  ctx.lineWidth = 3;
  // the two halves sit slightly apart so that their overlap stays visible
  const THIN_OFFSET = 2.5;
  for (const y of thinRows) {
    layout.thin.forEach(([a, b], side) => {
      const dy = side ? THIN_OFFSET : -THIN_OFFSET;
      ctx.beginPath(); ctx.moveTo(X(a), y + dy); ctx.lineTo(X(b), y + dy); ctx.stroke();
    });
  }

  // thick filaments (myosin) with heads
  const [ta, tb] = layout.thickFilament;
  const { bareZone } = opts.species.filaments();
  const bound = (x) => layout.boundHeads.some(([a, b]) => x >= a - 1e-9 && x <= b + 1e-9);
  const step = 0.09;
  for (const y of thickRows) {
    ctx.strokeStyle = c.myosin;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(X(ta), y); ctx.lineTo(X(tb), y); ctx.stroke();
    ctx.lineCap = "butt";
    for (let x = bareZone / 2 + step / 2; x <= (tb - ta) / 2; x += step) {
      for (const sx of [-x, x]) {
        const isBound = opts.bridges && bound(sx);
        const tilt = sx > 0 ? -1 : 1; // heads lean towards the M line when they pull
        for (const dir of [-1, 1]) {
          ctx.strokeStyle = isBound ? c.bridge : c.head;
          ctx.lineWidth = isBound ? 1.8 : 1.2;
          const reach = isBound ? Math.abs(rows[1] - rows[0]) - 4 : 6;
          ctx.beginPath();
          ctx.moveTo(X(sx), y + dir * 3);
          ctx.lineTo(X(sx) + tilt * (isBound ? 5 : 3), y + dir * reach);
          ctx.stroke();
        }
      }
    }
  }

  // Z discs
  ctx.strokeStyle = c.zdisc;
  ctx.lineWidth = 4;
  for (const z of layout.zDiscs) {
    ctx.beginPath(); ctx.moveTo(X(z), rows[0] - 18); ctx.lineTo(X(z), rows[4] + 18); ctx.stroke();
  }

  // labels and bands
  ctx.font = `13px ${getComputedStyle(document.body).fontFamily}`;
  ctx.fillStyle = c.ink;
  ctx.textAlign = "center";
  for (const z of layout.zDiscs) ctx.fillText("Z", X(z), rows[0] - 24);
  ctx.fillText("M", X(0), rows[0] - 24);

  const bands = sarcomere.bands();
  const yBand = rows[4] + 34;
  drawBracket(ctx, X(ta), X(tb), yBand, [`A-Bande ${fmt(bands.aBand)} µm`, "A-Bande", "A"], c.band);
  if (bands.hZone > 0) {
    const half = Math.min(bands.hZone, tb - ta) / 2;
    drawBracket(ctx, X(-half), X(half), yBand + 30, [`H-Zone ${fmt(bands.hZone)} µm`, "H-Zone", "H"], c.band);
  }
  if (bands.iBand > 0) {
    drawBracket(ctx, X(layout.zDiscs[0]), X(ta), yBand, ["½ I", "I"], c.band);
    drawBracket(ctx, X(tb), X(layout.zDiscs[1]), yBand, ["½ I", "I"], c.band);
  }
}

// ---- force-length curve --------------------------------------------------

function drawCurve(canvas, species, length, opts) {
  const { ctx, w, h } = fitCanvas(canvas);
  const c = opts.colors;
  const pad = { l: 46, r: 14, t: 14, b: 38 };
  const X = (um) => pad.l + ((um - MIN_LENGTH) / (MAX_LENGTH - MIN_LENGTH)) * (w - pad.l - pad.r);
  const Y = (f) => h - pad.b - (f / 1.25) * (h - pad.t - pad.b);
  ctx.font = `12px ${getComputedStyle(document.body).fontFamily}`;

  // grid and axes
  ctx.strokeStyle = c.rule;
  ctx.fillStyle = c["ink-soft"];
  ctx.lineWidth = 1;
  ctx.textAlign = "right";
  for (const f of [0, 0.5, 1]) {
    ctx.beginPath(); ctx.moveTo(pad.l, Y(f)); ctx.lineTo(w - pad.r, Y(f)); ctx.stroke();
    ctx.fillText(`${f * 100} %`, pad.l - 6, Y(f) + 4);
  }
  ctx.textAlign = "center";
  for (let um = 1.5; um <= MAX_LENGTH; um += 0.5) {
    ctx.beginPath(); ctx.moveTo(X(um), h - pad.b); ctx.lineTo(X(um), h - pad.b + 4); ctx.stroke();
    ctx.fillText(um.toFixed(1), X(um), h - pad.b + 17);
  }
  ctx.fillText("Sarkomerlänge (µm)", (pad.l + w - pad.r) / 2, h - 4);

  // curves
  const samples = 400;
  const trace = (fn, color, dash) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.setLineDash(dash);
    ctx.beginPath();
    for (let i = 0; i <= samples; i++) {
      const um = MIN_LENGTH + ((MAX_LENGTH - MIN_LENGTH) * i) / samples;
      const v = Math.min(1.25, fn(Sarcomere.of(species, um)));
      i ? ctx.lineTo(X(um), Y(v)) : ctx.moveTo(X(um), Y(v));
    }
    ctx.stroke();
    ctx.setLineDash([]);
  };
  trace((s) => s.activeForce(), c.curve, []);
  const showPassive = opts.titin && species.titinOnset() !== null;
  if (showPassive) trace((s) => s.passiveTension(), c.passive, [6, 4]);

  // current point
  const now = Sarcomere.of(species, length);
  ctx.strokeStyle = c["ink-soft"];
  ctx.setLineDash([2, 3]);
  ctx.beginPath(); ctx.moveTo(X(length), pad.t); ctx.lineTo(X(length), h - pad.b); ctx.stroke();
  ctx.setLineDash([]);
  const dot = (v, color) => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(X(length), Y(Math.min(1.25, v)), 6, 0, Math.PI * 2); ctx.fill();
  };
  dot(now.activeForce(), c.curve);
  if (showPassive) dot(now.passiveTension(), c.passive);
}

// ---- wiring --------------------------------------------------------------

const state = { species: "rabbit", length: 2.4, target: null, titin: false, bridges: true, last: null };

function render() {
  const species = SPECIES[state.species];
  const sarcomere = Sarcomere.of(species, state.length);
  const colors = palette();
  const titin = state.titin && species.titinOnset() !== null;
  drawSarcomere($("sarcomere"), sarcomere, { colors, species, titin, bridges: state.bridges });
  drawCurve($("curve"), species, state.length, { colors, titin });

  const b = sarcomere.bands();
  $("length-out").textContent = `${fmt(state.length)} µm`;
  $("length").value = state.length;
  $("bands").innerHTML = `<span>A-Bande <b>${fmt(b.aBand)} µm</b></span><span>I-Bande <b>${fmt(b.iBand)} µm</b></span><span>H-Zone <b>${fmt(b.hZone)} µm</b></span>`;
  const passive = sarcomere.passiveTension();
  $("forces").innerHTML = `<span>aktive Kraft <b>${Math.round(sarcomere.activeForce() * 100)} %</b></span>` +
    (titin ? `<span>passive Spannung <b>${Math.round(passive * 100)} %</b></span>` : "");
  const region = explain(sarcomere.region());
  $("region-title").textContent = region.title;
  $("region-text").textContent = region.text;
  $("species-note").textContent = SPECIES_NOTE[state.species];
  const noTitin = species.titinOnset() === null;
  $("titin").disabled = noTitin;
  $("titin-label").setAttribute("aria-disabled", String(noTitin));
  $("legend-titin").hidden = !titin;
  $("legend-passive").hidden = !titin;
}

function tick(time) {
  if (state.target === null) { state.last = null; return; }
  const dt = state.last === null ? 0 : (time - state.last) / 1000;
  state.last = time;
  const delta = state.target - state.length;
  const stepLen = Math.min(Math.abs(delta), SPEED * dt);
  state.length += Math.sign(delta) * stepLen;
  if (Math.abs(state.target - state.length) < 1e-6) state.target = null;
  render();
  requestAnimationFrame(tick);
}

function playTo(target) {
  const wasIdle = state.target === null;
  state.target = target;
  if (wasIdle) requestAnimationFrame(tick);
}

$("length").addEventListener("input", (e) => { state.target = null; state.length = Number(e.target.value); render(); });
$("contract").addEventListener("click", () => playTo(CONTRACTED));
$("stretch").addEventListener("click", () => playTo(STRETCHED));
$("species").addEventListener("change", (e) => { state.species = e.target.value; render(); });
$("titin").addEventListener("change", (e) => { state.titin = e.target.checked; render(); });
$("bridges").addEventListener("change", (e) => { state.bridges = e.target.checked; render(); });
window.addEventListener("resize", render);
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);
render();
