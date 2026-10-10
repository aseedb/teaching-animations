// Page wiring: one scene (lamellipodium), a canvas that follows the leading
// edge, controls for the proteins, a guided tour with highlights, and a film
// mode (#film) for headless recording.

import { HALF_HEIGHT_NM } from "./lamellipodium.js";
import { SUBUNIT_NM } from "./filament.js";
import { Scene } from "./scene.js";
import { Tour } from "./tour.js";
import { ACTIN_TOUR } from "./actinTour.js";
import { pickLanguage, translator, translatePage, readStoredLanguage, storeLanguage, decimals } from "./i18n.js";
import { STRINGS } from "./strings.js";

const SEED = 11;
const VIEW_BEHIND_NM = 480; // network shown behind the membrane
const VIEW_AHEAD_NM = 50; // outside of the cell
const BAND = 2 * HALF_HEIGHT_NM;
const FILM = location.hash === "#film";
const SPEEDS = [0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 4]; // simulation steps per 60 Hz frame, from very slow to fast
const READOUT_INTERVAL_MS = 500; // numbers below the stage change twice a second, not every frame

// the explanation box of the free simulation: protein, colour of its swatch (texts in strings.js)
const EXPLANATION = [["arp", "arp"], ["capping", "capping"], ["cofilin", "adp"]];
const STATE_COLOR = { ATP: "atp", "ADP-Pi": "adppi", ADP: "adp" };
const PROTEINS = ["arp23", "capping", "cofilin"];

const $ = (id) => document.getElementById(id);

// the page's language (see i18n.js); the film is always German. `tr` gives a text, `num` a decimal number
const storage = (() => { try { return window.localStorage; } catch { return null; } })();
let lang = FILM ? "de" : pickLanguage({ hash: location.hash, stored: readStoredLanguage(storage), browser: navigator.languages ?? [navigator.language] });
let tr = translator(STRINGS, lang);
let num = decimals(lang);
const scene = Scene.empty();
let playing = true;
let pending = 0;
let lastReadout = 0;
let speedHistory = [];
let tour = null;
let targets = {}; // pixel geometry of what the tour can point at, refreshed at every draw

function palette() {
  const style = getComputedStyle(document.documentElement);
  const names = ["cytoplasm", "outside", "membrane", "atp", "adppi", "adp", "arp", "capping", "ink", "ink-soft", "highlight", "halo", "surface"];
  return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(`--${n}`).trim()]));
}

function treatmentFromControls() {
  return { ...Object.fromEntries(PROTEINS.map((k) => [k, $(k).checked])), latrunculin: false, phalloidin: false };
}

function reset() {
  scene.reset(SEED, 0, treatmentFromControls());
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

const fontOf = (size, bold) => `${bold ? "bold " : ""}${size}px ${getComputedStyle(document.body).fontFamily}`;
const intoBand = (y) => [y - BAND, y, y + BAND].reduce((best, v) => (Math.abs(v) < Math.abs(best) ? v : best));

function draw() {
  const canvas = $("stage");
  const { ctx, w, h } = fit(canvas);
  const c = palette();
  const cell = scene.cell();
  const scale = w / (VIEW_BEHIND_NM + VIEW_AHEAD_NM);
  const m = cell.membraneX();
  const X = (x) => (x - (m - VIEW_BEHIND_NM)) * scale;
  const Y = (y) => h / 2 - y * scale;
  const bandTop = Y(HALF_HEIGHT_NM);
  const bandBottom = Y(-HALF_HEIGHT_NM);
  const font = Math.max(10, Math.round(w / 70)); // grows with the canvas, so the layout keeps its proportions

  ctx.fillStyle = c.cytoplasm;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = c.outside;
  ctx.fillRect(X(m), 0, w - X(m), h);

  drawNetwork(ctx, c, { X, Y, scale, clip: { x: 0, y: bandTop, w: X(m) + 2, h: bandBottom - bandTop }, membraneX: m, height: h });

  // labels: membrane label runs along the membrane, the rest sits in the free corners
  ctx.font = fontOf(font);
  ctx.fillStyle = c.membrane;
  ctx.save();
  ctx.translate(X(m) + 6 + font, h / 2);
  ctx.rotate(Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillText(tr("canvas.membrane"), 0, 0);
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
  if (!tour) drawExplanation(ctx, h, c, font);
  // the long caption only where both fit side by side
  const rear = [tr("caption.rear"), tr("caption.rearShort")];
  const front = tr("caption.front");
  const room = X(m) - 20 - ctx.measureText(front).width - font * 2;
  caption(rear.find((t) => ctx.measureText(t).width <= room) ?? rear.at(-1), 10, "left");
  caption(front, X(m) - 10, "right");
  if (FILM) drawFilmLegend(ctx, w, h, c, font);
  if (FILM) drawFilmCredit(ctx, w, h, c, font);
  if (tour && !tour.isOver()) {
    targets = resolveTargets({ X, Y, m, scale, h, font });
    drawHighlights(ctx, c, font, w, h, tour.highlights());
  }
}

function outline(ctx, c, f, X, Y, width) {
  if (!f.subunitCount()) return;
  const a = f.subunitPosition(0), b = f.subunitPosition(f.subunitCount() - 1);
  for (const dy of [-BAND, 0, BAND]) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = c.halo; ctx.lineWidth = width; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(X(a.x), Y(a.y + dy)); ctx.lineTo(X(b.x) + 0.01, Y(b.y + dy)); ctx.stroke();
    ctx.restore();
  }
}

// outlines first, then the filaments, then their marks, so no mark is hidden by its own group
function drawGroup(ctx, c, { filaments, alpha, outlined = false }, look) {
  if (outlined) filaments.forEach((f) => outline(ctx, c, f, look.X, look.Y, look.lineWidth * 2.2));
  ctx.globalAlpha = alpha;
  filaments.forEach((f) => drawBody(ctx, c, f, look));
  filaments.forEach((f) => drawMarks(ctx, c, f, look, alpha));
}

// one stroke per run of subunits in the same state, edge to edge
function drawBody(ctx, c, f, { X, Y, lineWidth, inset }) {
  ctx.lineWidth = lineWidth;
  for (const dy of [-BAND, 0, BAND]) {
    for (const r of runsOf(f)) {
      const a = f.subunitPosition(r.from - 0.5 + inset);
      const b = f.subunitPosition(r.to + 0.5 - inset);
      ctx.strokeStyle = c[STATE_COLOR[r.state]];
      ctx.beginPath(); ctx.moveTo(X(a.x), Y(a.y + dy)); ctx.lineTo(X(b.x) + 0.01, Y(b.y + dy)); ctx.stroke();
    }
  }
}

// Arp2/3 at a branch's pointed end (with a pulse when new), the growing plus end, capping protein
function drawMarks(ctx, c, f, { X, Y, marker }, alpha) {
  if (!f.subunitCount()) return;
  for (const dy of [-BAND, 0, BAND]) {
    if (f.isBranch()) drawArp23(ctx, c, f, X, Y, dy, marker, alpha);
    const t = f.barbedTip();
    if (!f.isCapped()) {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = c.ink;
      ctx.lineWidth = Math.max(1, 0.6 * marker);
      ctx.beginPath(); ctx.arc(X(t.x), Y(t.y + dy), Math.max(2.5, 2.1 * marker), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    if (f.hasCappingProtein()) {
      ctx.fillStyle = c.capping;
      const s = Math.max(3, 2.6 * marker);
      ctx.fillRect(X(t.x) - s / 2, Y(t.y + dy) - s / 2, s, s);
    }
  }
}

function drawArp23(ctx, c, f, X, Y, dy, marker, alpha) {
  const p = f.pointedEnd();
  ctx.fillStyle = c.arp;
  ctx.beginPath(); ctx.arc(X(p.x), Y(p.y + dy), Math.max(2.5, 2.2 * marker), 0, Math.PI * 2); ctx.fill();
  const k = scene.pulseOf(f);
  if (k === null) return;
  // a new branch: a new plus end is born
  ctx.strokeStyle = c.arp;
  ctx.globalAlpha = alpha * (1 - k);
  ctx.lineWidth = Math.max(1.5, 1.2 * marker);
  ctx.beginPath(); ctx.arc(X(p.x), Y(p.y + dy), (3 + 10 * k) * marker, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = alpha;
}

// the network (and the membrane) in a given mapping and clip; `near` limits the filaments drawn
function drawNetwork(ctx, c, { X, Y, scale, clip, membraneX, near = null, focus = null, lineScale = scale }) {
  const cell = scene.cell();
  // filaments, drawn with their periodic copies inside the band
  ctx.save();
  ctx.beginPath(); ctx.rect(clip.x, clip.y, clip.w, clip.h); ctx.clip();
  ctx.lineCap = "round";
  const lineWidth = Math.max(1.6, SUBUNIT_NM * 0.9 * lineScale);
  const look = {
    X, Y, lineWidth,
    marker: lineScale, // size of plus-end, Arp2/3 and capping marks
    inset: Math.min(0.5, lineWidth / 2 / (SUBUNIT_NM * scale)), // round caps end at the subunit's edge
  };
  const shown = cell.filaments().filter((f) => !near || near(f) || (focus && focus.has(f)));
  // focused filaments come last, on top, outlined and with their marks above them
  const groups = focus ? [{ filaments: shown.filter((f) => !focus.has(f)), alpha: 0.18 }, { filaments: [...focus], alpha: 1, outlined: true }] : [{ filaments: shown, alpha: 1 }];
  for (const group of groups) drawGroup(ctx, c, group, look);
  ctx.globalAlpha = 1;
  ctx.restore();

  // membrane, kept inside the clip's horizontal extent
  if (X(membraneX) > clip.x + clip.w + 4 && clip.x > 0) return;
  ctx.strokeStyle = c.membrane;
  ctx.lineWidth = Math.max(3, 4 * Math.min(scale, 3));
  ctx.beginPath(); ctx.moveTo(X(membraneX) + 2, clip.y); ctx.lineTo(X(membraneX) + 2, clip.y + clip.h); ctx.stroke();
}

// ---- what the tour points at -----------------------------------------------

// consecutive subunits in the same nucleotide state
function runsOf(f) {
  const states = f.states();
  const runs = [];
  let from = 0;
  for (let i = 1; i <= states.length; i++) if (i === states.length || states[i] !== states[from]) { runs.push({ state: states[from], from, to: i - 1 }); from = i; }
  return runs;
}

// the middle of a run of `state` (at least minRun long) at the given quantile
// of such runs' depths, preferring the given height
function runTarget(state, minRun, quantile, yNm) {
  const cell = scene.cell();
  const m = cell.membraneX();
  const centres = cell.filaments().flatMap((f) => runsOf(f).filter((r) => r.state === state && r.to - r.from + 1 >= minRun).map((r) => f.subunitPosition((r.from + r.to) / 2)));
  if (!centres.length) return null;
  const depths = centres.map((p) => m - p.x).sort((a, b) => a - b);
  const depth = depths[Math.floor(quantile * (depths.length - 1))];
  const score = (p) => Math.abs(m - p.x - depth) + Math.abs(intoBand(p.y) - yNm) * 0.5;
  return centres.reduce((best, p) => (score(p) < score(best) ? p : best));
}

// the plus end an arrow follows: chosen once per step, kept while it grows
const FRONT_TIP_DEPTH_NM = 25;
const FRONT_TIP_HEIGHT = 0.55; // of the half height: upper part of the view
const FRONT_TIP_MIN_SUBUNITS = 10;
let pinned = { key: null, filament: null };
function frontPlusEnd() {
  const cell = scene.cell();
  const key = tour?.index() ?? null;
  const kept = pinned.filament;
  if (pinned.key === key && kept && !kept.isCapped() && cell.filaments().includes(kept)) return kept.barbedTip();
  const m = cell.membraneX();
  const score = (f) => Math.abs(intoBand(f.barbedTip().y) - HALF_HEIGHT_NM * FRONT_TIP_HEIGHT) * 0.5 + Math.abs(m - f.barbedTip().x - FRONT_TIP_DEPTH_NM) * 2;
  const growing = cell.filaments().filter((f) => !f.isCapped() && f.subunitCount() >= FRONT_TIP_MIN_SUBUNITS && scene.pulseOf(f) === null);
  pinned = { key, filament: growing.reduce((best, f) => (!best || score(f) < score(best) ? f : best), null) };
  return pinned.filament?.barbedTip() ?? null;
}

function resolveTargets({ X, Y, m, scale, h, font }) {
  const cell = scene.cell();
  const t = {};
  const point = (p, r) => (p ? { x: X(p.x), y: Y(intoBand(p.y)), r } : null);
  t.membrane = { x: X(m) + font, y: h / 2, rx: font * 1.4, ry: h * 0.42 }; // the membrane and its label
  t.membranePush = { x: X(m) + 4, y: h * 0.3, r: 2 };
  // the rear of the network: where its deepest fifth of subunits lies
  const depths = cell.filaments().flatMap((f) => f.states().map((_, i) => m - f.subunitPosition(i).x)).sort((a, b) => a - b);
  const q = (p) => depths[Math.min(depths.length - 1, Math.floor(p * depths.length))] ?? 0;
  t.rearNetwork = { x: X(m - q(0.88)), y: h / 2, rx: Math.max(40, (q(0.97) - q(0.75)) / 2) * scale, ry: h * 0.3 };
  t.front = { x: X(m - 40), y: h / 2, rx: 40 * scale, ry: h * 0.4 };
  t.frontPlusEnd = point(frontPlusEnd(), font * 0.6);
  t.ageATP = point(runTarget("ATP", 3, 0.5, HALF_HEIGHT_NM * 0.35), font * 0.5);
  t.ageADPPi = point(runTarget("ADP-Pi", 5, 0.5, 0), font * 0.5);
  t.ageADP = point(runTarget("ADP", 8, 0.25, -HALF_HEIGHT_NM * 0.35), font * 0.5);
  const branch = scene.branchSinceMark();
  if (branch) {
    const tip = branch.filament.barbedTip();
    const base = branch.filament.pointedEnd();
    const dy = intoBand(tip.y) - tip.y;
    t.branchTip = point({ x: tip.x, y: tip.y + dy }, font * 0.5);
    t.branchPoint = { x: X(base.x), y: Y(base.y + dy), r: font * 1.2 };
  }
  const cap = scene.capSinceMark();
  if (cap) t.cappedTip = { ...point(cap.filament.barbedTip(), font * 1.2) };
  const sever = scene.severSinceMark();
  if (sever) t.severPoint = point(sever.pieces[1].barbedTip(), font * 1.2);
  t.recycle = { x0: X(m - q(0.95)), x1: X(m - 40), y: h * 0.8 };
  return t;
}

const LENS_ZOOM = 4;

function nearestSubunit(f, q) {
  let best = 0, d = Infinity;
  for (let i = 0; i < f.subunitCount(); i++) {
    const p = f.subunitPosition(i);
    const e = Math.hypot(p.x - q.x, p.y - q.y);
    if (e < d) { d = e; best = i; }
  }
  return best;
}

// the filament a branch grew from: the one passing through its pointed end
function motherOf(branch) {
  const base = branch.pointedEnd();
  let best = null, d = SUBUNIT_NM * 1.2;
  for (const f of scene.cell().filaments()) {
    if (f === branch || !f.subunitCount()) continue;
    const q = f.subunitPosition(nearestSubunit(f, base));
    const e = Math.hypot(q.x - base.x, q.y - base.y);
    if (e < d) { d = e; best = f; }
  }
  return best;
}

// world positions (nm) of what a lens can be centred on and annotate
function worldPoints() {
  const p = {};
  const branch = scene.branchSinceMark();
  if (branch) {
    const tip = branch.filament.barbedTip();
    const dy = intoBand(tip.y) - tip.y;
    const base = branch.filament.pointedEnd();
    p.branchPoint = { x: base.x, y: base.y + dy };
    p.branchTip = { x: tip.x, y: tip.y + dy };
    const mother = motherOf(branch.filament);
    if (mother) {
      // a point on the mother filament, a little beyond the branch point (behind it if the mother ends there)
      const at = nearestSubunit(mother, base);
      const k = mother.subunitCount() - 1 - at >= 2 ? Math.min(mother.subunitCount() - 1, at + 3) : Math.max(0, at - 6);
      const q = mother.subunitPosition(k);
      p.mother = { x: q.x, y: q.y + (intoBand(base.y + dy) - base.y - dy) + dy + (base.y - (mother.subunitPosition(nearestSubunit(mother, base)).y)) };
    }
    p.branch = { x: base.x, y: base.y + dy };
    p.focus = new Set([branch.filament, mother].filter(Boolean));
  }
  const cap = scene.capSinceMark();
  if (cap) { const t = cap.filament.barbedTip(); p.cappedTip = { x: t.x, y: intoBand(t.y) }; p.cap = p.cappedTip; p.capFocus = new Set([cap.filament]); }
  const sever = scene.severSinceMark();
  if (sever) {
    const cut = sever.pieces[1].barbedTip(); // the rear piece ends where the cut was
    p.severPoint = { x: cut.x, y: intoBand(cut.y) };
    p.sever = p.severPoint;
    p.severFocus = new Set(sever.pieces);
    p.severPoint.angle = sever.pieces[0].angle();
  }
  return p;
}

// an inset that magnifies the region around an event, with its own annotations
function drawLens(ctx, c, font, w, h, hl) {
  const world = worldPoints();
  const centre = world[hl.target];
  if (!centre) return;
  const cell = scene.cell();
  const scale = w / (VIEW_BEHIND_NM + VIEW_AHEAD_NM);
  const m = cell.membraneX();
  const X = (x) => (x - (m - VIEW_BEHIND_NM)) * scale;
  const Y = (y) => h / 2 - y * scale;
  // on small canvases the labels keep a 10 px floor: the lens and its zoom grow with them, so the
  // annotations keep the proportions they have at full size
  const k = Math.max(1, (10 * 70) / w);
  const zoom = LENS_ZOOM * k;
  const R = { x: w * 0.03, w: Math.min(w * 0.42 * k, w * 0.66), h: Math.min(h * 0.6 * k, h * 0.92) };
  R.y = Math.min(h * 0.16, h - R.h - h * 0.03);
  const zs = scale * zoom;
  const LX = (x) => R.x + R.w / 2 + (x - centre.x) * zs;
  const LY = (y) => R.y + R.h / 2 - (y - centre.y) * zs;
  const reach = Math.max(R.w, R.h) / zs;
  const near = (f) => [f.pointedEnd(), f.barbedTip()].some((q) => Math.hypot(q.x - centre.x, intoBand(q.y) - centre.y) < reach * 1.2) || f.subunitCount() * 2.7 > reach;
  // source frame on the main view and the lines joining it to the inset
  const sw = R.w / zoom, sh = R.h / zoom;
  const sx = X(centre.x) - sw / 2, sy = Y(centre.y) - sh / 2;
  ctx.strokeStyle = c.highlight; ctx.lineWidth = 2;
  ctx.strokeRect(sx, sy, sw, sh);
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(R.x + R.w, R.y); ctx.moveTo(sx, sy + sh); ctx.lineTo(R.x + R.w, R.y + R.h); ctx.stroke();
  // the magnified network
  ctx.fillStyle = c.cytoplasm;
  ctx.fillRect(R.x, R.y, R.w, R.h);
  if (LX(m) < R.x + R.w) { ctx.fillStyle = c.outside; ctx.fillRect(LX(m), R.y, R.x + R.w - LX(m), R.h); }
  const focus = world[hl.focus] ?? null;
  drawNetwork(ctx, c, { X: LX, Y: LY, scale: zs, clip: R, membraneX: m, near, focus, lineScale: zs * 0.45 });
  ctx.strokeStyle = c.highlight; ctx.lineWidth = 3;
  ctx.strokeRect(R.x, R.y, R.w, R.h);
  labelAt(ctx, c, font, tr("lens", { zoom: Math.round(zoom) }), R.x + 8, R.y + font * 1.3, "left");
  // annotations inside the lens
  const local = {};
  for (const [name, q] of Object.entries(world)) if (Number.isFinite(q?.x)) local[name] = { x: LX(q.x), y: LY(q.y), r: font * 0.9, inLens: R, angle: q.angle };
  ctx.save();
  ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
  drawHighlights(ctx, c, font, w, h, hl.notes ?? [], local);
  ctx.restore();
}

// a label on a light box; `bounds` keeps the whole box inside a frame (the lens, the canvas)
function labelAt(ctx, c, font, text, x, y, align = "center", bounds = null) {
  if (!text) return;
  ctx.font = fontOf(font, true);
  ctx.textAlign = align;
  const tw = ctx.measureText(text).width;
  const natural = align === "center" ? x - tw / 2 : align === "left" ? x : x - tw;
  const shift = bounds ? Math.max(bounds.x + 8 - natural, Math.min(0, bounds.x + bounds.w - 8 - (natural + tw))) : 0;
  const lift = bounds ? Math.max(bounds.y + font * 1.1 - y, Math.min(0, bounds.y + bounds.h - font * 0.5 - y)) : 0;
  const left = natural + shift;
  x += shift;
  y += lift;
  ctx.fillStyle = c.surface;
  ctx.globalAlpha = 0.92;
  ctx.fillRect(left - 6, y - font * 1.05, tw + 12, font * 1.45);
  ctx.globalAlpha = 1;
  ctx.fillStyle = c.highlight;
  ctx.fillText(text, x, y);
  ctx.font = fontOf(font);
}

function arrowHead(ctx, c, font, fromX, fromY, x, y) {
  const a = Math.atan2(y - fromY, x - fromX);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - font * 0.9 * Math.cos(a - 0.45), y - font * 0.9 * Math.sin(a - 0.45));
  ctx.lineTo(x - font * 0.9 * Math.cos(a + 0.45), y - font * 0.9 * Math.sin(a + 0.45));
  ctx.closePath(); ctx.fillStyle = c.highlight; ctx.fill();
}

function drawHighlights(ctx, c, font, w, h, highlights, map = targets) {
  for (const hl of highlights.filter((x) => x.type === "lens")) drawLens(ctx, c, font, w, h, hl);
  const plain = highlights.filter((x) => x.type !== "lens");
  // a halo pass underneath keeps rings and arrows readable on the busy network
  drawHighlightPass(ctx, { ...c, highlight: c.halo }, font, w, h, plain, Math.max(7, font / 2), false, map);
  drawHighlightPass(ctx, c, font, w, h, plain, Math.max(3, font / 4), true, map);
}

// where an arrow starts, relative to its target, in font sizes, and how its label sits there
const ARROW_FROM = {
  upperLeft: { dx: -7, dy: -3.5, align: "right", labelDy: -0.4 },
  upperRight: { dx: 7, dy: -3.5, align: "left", labelDy: -0.4 },
  above: { dx: 4, dy: -3.5, align: "center", labelDy: -0.4 },
  lowerLeft: { dx: -7, dy: 1.5, align: "right", labelDy: 1.3 },
};

function drawHighlightPass(ctx, c, font, w, h, highlights, width, withLabels, map) {
  const stroke = () => { ctx.strokeStyle = c.highlight; ctx.lineWidth = width; };
  const frame = { x: 0, y: 0, w, h };
  const label = (key, x, y, align, t) => { if (withLabels) labelAt(ctx, c, font, key && tr(key), x, y, align, t?.inLens ?? frame); };
  stroke();
  for (const hl of highlights) {
    const t = map[hl.target];
    if (!t) continue;
    const kinds = {
      ring: () => {
        ctx.beginPath();
        if (t.rx) ctx.ellipse(t.x, t.y, t.rx + 8, t.ry + 8, 0, 0, Math.PI * 2);
        else ctx.arc(t.x, t.y, t.r + 6, 0, Math.PI * 2);
        ctx.stroke();
        const r = t.ry ?? t.r;
        if ((hl.labelSide ?? t.labelSide) === "left") label(hl.label, t.x - (t.rx ?? r) - font, t.y + font * 0.35, "right", t);
        else label(hl.label, t.x, Math.max(font * 1.4, t.y - r - font * 0.6), "center", t);
      },
      arrow: () => {
        const left = t.inLens ? t.x > t.inLens.x + t.inLens.w * 0.45 : t.x > w * 0.5;
        const place = ARROW_FROM[hl.from ?? (left ? "upperLeft" : "upperRight")];
        const sx = t.x + font * place.dx, sy = t.y + font * place.dy;
        const k = 1 - (t.r ?? 0) / Math.hypot(t.x - sx, t.y - sy);
        const ex = sx + (t.x - sx) * k, ey = sy + (t.y - sy) * k;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        arrowHead(ctx, c, font, sx, sy, ex, ey);
        // a small circle around what the arrow points at, like a callout
        if ((t.r ?? 0) >= 6) { ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.stroke(); }
        label(hl.label, sx, sy + font * place.labelDy, place.align, t);
      },
      cut: () => {
        // the gap cofilin opened, across the filament (screen y points down)
        const ax = Math.sin(t.angle ?? 0), ay = Math.cos(t.angle ?? 0);
        const half = font * 0.75;
        ctx.save();
        ctx.strokeStyle = c.cytoplasm; ctx.lineWidth = font * 0.45; ctx.lineCap = "butt";
        ctx.beginPath(); ctx.moveTo(t.x - half * ax, t.y - half * ay); ctx.lineTo(t.x + half * ax, t.y + half * ay); ctx.stroke();
        ctx.restore();
      },
      flow: () => {
        // a curved arrow from the rear of the network to the front
        const midX = (t.x0 + t.x1) / 2;
        const cy = t.y + font * 3;
        ctx.beginPath(); ctx.moveTo(t.x0, t.y); ctx.quadraticCurveTo(midX, cy, t.x1, t.y); ctx.stroke();
        arrowHead(ctx, c, font, midX, cy, t.x1, t.y);
        label(hl.label, midX, t.y - font * 0.6, "center", t);
      },
    };
    kinds[hl.type]?.();
    stroke();
  }
}

function drawExplanation(ctx, h, c, font) {
  const line = font * 1.5;
  const top = h - font * 2.4 - EXPLANATION.length * line - font * 0.6;
  const widths = EXPLANATION.map(([key]) => ctx.measureText(`${tr(`explain.${key}.name`)}: ${tr(`explain.${key}.text`)}`).width);
  ctx.fillStyle = c.cytoplasm;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(4, top - font * 0.4, Math.max(...widths) + font * 2.6, EXPLANATION.length * line + font * 0.6);
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
  EXPLANATION.forEach(([key, color], k) => {
    const name = tr(`explain.${key}.name`);
    const text = tr(`explain.${key}.text`);
    const y = top + (k + 0.8) * line;
    ctx.fillStyle = c[color];
    ctx.fillRect(10, y - font * 0.45, font * 1.1, font * 0.5);
    ctx.font = fontOf(font, true);
    ctx.fillStyle = c.ink;
    ctx.fillText(`${name}:`, 10 + font * 1.5, y);
    const nameW = ctx.measureText(`${name}: `).width;
    ctx.font = fontOf(font);
    ctx.fillText(text, 10 + font * 1.5 + nameW, y);
  });
}

// the licence in the bottom corner outside the cell, in the film frame (the page states it below)
function drawFilmCredit(ctx, w, h, c, font) {
  ctx.font = fontOf(Math.round(font * 0.65));
  ctx.fillStyle = c["ink-soft"];
  ctx.textAlign = "right";
  ["CC BY 4.0", "Universität Bern", "© Benoît Zuber"].forEach((line, k) => ctx.fillText(line, w - 6, h - 6 - k * font * 0.8));
  ctx.font = fontOf(font);
}

function drawFilmLegend(ctx, w, h, c, font) {
  const items = [[tr("legend.atp"), c.atp], [tr("legend.adppi"), c.adppi], [tr("legend.adp"), c.adp], ["Arp2/3", c.arp], [tr("legend.capping"), c.capping], [tr("legend.tip"), "#ffffff"]];
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

// ---- readout and tour panel ----------------------------------------------

function noteKey(t) {
  if (!t.arp23) return "noArp";
  if (!t.capping) return "noCapping";
  if (!t.cofilin) return "noCofilin";
  return "normal";
}

function updateReadout() {
  const cell = scene.cell();
  const growing = cell.filaments().filter((f) => !f.isCapped()).length;
  speedHistory.push({ x: cell.membraneX(), step: scene.stepsSinceReset() });
  if (speedHistory.length > 12) speedHistory.shift();
  const first = speedHistory[0], last = speedHistory.at(-1);
  const advance = last.step > first.step ? (last.x - first.x) / (last.step - first.step) : 0;
  $("readout").innerHTML =
    `<span>${tr("readout.advance")} <b>${num(advance, 2)} ${tr("readout.unit")}</b></span>` +
    `<span>${tr("readout.pool")} <b>${cell.pool()}</b></span>` +
    `<span>${tr("readout.growing")} <b>${growing}</b></span>`;
  const note = noteKey(cell.treatment());
  $("note-title").textContent = tr(`note.${note}.title`);
  $("note-text").textContent = tr(`note.${note}.text`);
}

function updateReadoutSometimes() {
  const now = performance.now();
  if (now - lastReadout < READOUT_INTERVAL_MS) return;
  lastReadout = now;
  updateReadout();
}

function showTourStep() {
  const step = tour.step();
  $("tour-title").textContent = tr(step.title);
  $("tour-text").textContent = tr(step.text);
  $("tour-progress").textContent = tour.progress();
  $("tour-back").disabled = tour.index() === 0;
  $("tour-next").textContent = tr(tour.index() === ACTIN_TOUR.length - 1 ? "tour.exit" : "tour.next");
  speedHistory = [];
  updateTourState();
  updateReadout();
}

function updateTourState() {
  $("tour-state").textContent = tour.isWaiting() ? "" : tr("tour.running");
  $("tour-next").classList.toggle("ready", tour.isWaiting());
}

function startTour() {
  tour = Tour.start(ACTIN_TOUR, scene);
  document.body.classList.add("touring");
  $("tour").hidden = false;
  showTourStep();
}

function endTour() {
  tour = null;
  document.body.classList.remove("touring");
  $("tour").hidden = true;
  const t = scene.cell().treatment();
  PROTEINS.forEach((k) => { $(k).checked = t[k]; });
  speedHistory = [];
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
  if (!FILM) requestAnimationFrame(frame);
}

function showSpeed() {
  const perSecond = SPEEDS[Number($("speed").value)] * 60;
  $("speed-out").textContent = tr("speed.out", { n: perSecond < 2 ? num(perSecond, 1) : Math.round(perSecond) });
}

for (const id of PROTEINS) {
  $(id).addEventListener("change", () => { scene.cell().treat(treatmentFromControls()); updateReadout(); });
}
const showPlay = () => { $("play").textContent = tr(playing ? "play.pause" : "play.play"); };
$("play").addEventListener("click", () => { playing = !playing; showPlay(); });
$("reset").addEventListener("click", () => { reset(); updateReadout(); draw(); });
$("speed").addEventListener("input", showSpeed);
$("step").addEventListener("click", () => { playing = false; showPlay(); scene.advance(1); updateReadout(); draw(); });
$("tour-start").addEventListener("click", startTour);
$("tour-next").addEventListener("click", () => { tour.next(); if (tour.isOver()) endTour(); else showTourStep(); });
$("tour-back").addEventListener("click", () => { tour.back(); showTourStep(); });
$("tour-exit").addEventListener("click", endTour);
// side by side (landscape): the canvas is as wide as the stage allows while its 16:9 frame fits the
// stage's height; stacked (portrait): it takes the full width
const SIDE_BY_SIDE = "(min-aspect-ratio: 5/4) and (min-width: 640px)";
function fitCanvas() {
  const canvas = $("stage");
  const box = canvas.parentElement;
  canvas.style.width = matchMedia(SIDE_BY_SIDE).matches ? `${Math.floor(Math.min(box.clientWidth, (box.clientHeight * 16) / 9))}px` : "";
}
if (!FILM) new ResizeObserver(() => { fitCanvas(); draw(); }).observe($("stage").parentElement);
window.addEventListener("resize", draw);
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) $("speed").value = 3;

function setLanguage(next) {
  lang = next;
  tr = translator(STRINGS, lang);
  num = decimals(lang);
  storeLanguage(storage, lang);
  translatePage(document, tr, lang);
  showPlay();
  showSpeed();
  if (tour) showTourStep(); else updateReadout();
  fitCanvas();
  draw();
}
document.querySelectorAll("[data-lang]").forEach((b) => b.addEventListener("click", () => setLanguage(b.dataset.lang)));
translatePage(document, tr, lang);
showPlay();
showSpeed();

// film mode: driven frame by frame from outside (headless recording)
if (FILM) document.body.classList.add("film");
window.film = {
  reset() { reset(); },
  treat(change) { scene.cell().treat(change); },
  advance(steps) { scene.advance(steps); },
  draw() { draw(); return true; },
  // for checking the tour: open step i, run it to its event, draw it
  tourStep(i) {
    tour = Tour.start(ACTIN_TOUR, scene);
    for (let k = 0; k < i; k++) tour.next();
    for (let n = 0; n < 20000 && !tour.isWaiting(); n++) tour.tick();
    draw();
    return tour.step().title;
  },
};

reset();
updateReadout();
if (FILM) draw(); else requestAnimationFrame(frame);
