// An epithelial sheet of rows x cols cells held by a fixed clamp on the left
// and pulled by a rigid grip on the right. Every cell-cell, cell-clamp and
// cell-grip contact is made of desmosomes. Optionally, each desmosomal plaque
// is tethered to a perinuclear cage of intermediate filaments (keratin).

import * as C from "./constants.js";
import { Nodes } from "./nodes.js";
import { Spring } from "./spring.js";
import { Cell } from "./cell.js";
import { LinearLaw, StiffeningLaw } from "./springLaw.js";
import { SeededRandom } from "./seededRandom.js";

const MEMBRANE_LAW = LinearLaw.of(C.MEMBRANE_STIFFNESS);
const DESMOSOME_LAW = LinearLaw.of(C.DESMOSOME_STIFFNESS);
const FILAMENT_LAW = StiffeningLaw.of(C.FILAMENT_STIFFNESS, C.FILAMENT_STIFFENING, C.FILAMENT_COMPRESSION);
const SEGMENT = C.CELL_SIZE / C.SEGMENTS_PER_SIDE;
const PITCH = C.CELL_SIZE + C.CELL_GAP;
const DRAWING_ORDER = ["filament", "membrane", "desmosome"];
const BAR_OVERHANG = 20;

export class Tissue {
  #nodes = Nodes.create();
  #springs = [];
  #cells = [];
  #membraneOwners = new Map();
  #fixed = new Set();
  #clamp = [];
  #grip = [];
  #gripTravel = 0;
  #width;
  #random;

  constructor({ rows, cols, withFilaments, seed }) {
    this.#random = SeededRandom.of(seed);
    this.#width = cols * PITCH + C.CELL_GAP;
    const grid = this.#buildCells(rows, cols);
    this.#linkNeighbours(grid, rows, cols);
    this.#clampEdges(grid, rows, cols);
    if (withFilaments) grid.flat().forEach((cell) => this.#buildFilamentCage(cell));
  }

  static build(options) {
    return new Tissue(options);
  }

  // ---- construction -------------------------------------------------------

  #buildCells(rows, cols) {
    const grid = [];
    for (let r = 0; r < rows; r++) grid.push(this.#buildRow(r, cols));
    return grid;
  }

  #buildRow(r, cols) {
    const row = [];
    for (let c = 0; c < cols; c++) row.push(this.#buildCell(c * PITCH, r * PITCH));
    return row;
  }

  #buildCell(x0, y0) {
    const ring = ringOutline(x0, y0).map(([x, y]) => this.#nodes.add(x, y));
    const cell = Cell.of(ring, C.CELL_SIZE * C.CELL_SIZE, C.BULK_MODULUS);
    ring.forEach((a, k) => this.#addMembrane(a, ring[(k + 1) % ring.length], cell));
    this.#cells.push(cell);
    return { cell, ring, x0, y0, plaques: [] };
  }

  #addMembrane(a, b, cell) {
    const breakStrain = C.MEMBRANE_BREAK_STRAIN * (1 + C.MEMBRANE_BREAK_SPREAD * this.#random.symmetric());
    const spring = Spring.between(a, b, SEGMENT, MEMBRANE_LAW, breakStrain, "membrane");
    this.#springs.push(spring);
    this.#membraneOwners.set(spring, cell);
  }

  #linkNeighbours(grid, rows, cols) {
    for (let r = 0; r < rows; r++) this.#linkRow(grid, r, cols);
  }

  #linkRow(grid, r, cols) {
    for (let c = 0; c < cols; c++) this.#linkToRightAndBelow(grid, r, c);
  }

  #linkToRightAndBelow(grid, r, c) {
    const here = grid[r][c];
    const right = grid[r][c + 1];
    const below = grid[r + 1]?.[c];
    if (right) C.PLAQUE_OFFSETS.forEach((off) => this.#joinCells(here, sideNode("right", off), right, sideNode("left", off)));
    if (below) C.PLAQUE_OFFSETS.forEach((off) => this.#joinCells(here, sideNode("bottom", off), below, sideNode("top", off)));
  }

  #joinCells(first, firstPosition, second, secondPosition) {
    const a = first.ring[firstPosition];
    const b = second.ring[secondPosition];
    first.plaques.push(a);
    second.plaques.push(b);
    this.#addDesmosome(a, b);
  }

  #addDesmosome(a, b) {
    this.#springs.push(Spring.between(a, b, C.CELL_GAP, DESMOSOME_LAW, C.DESMOSOME_BREAK_STRAIN, "desmosome"));
  }

  #clampEdges(grid, rows, cols) {
    grid.forEach((row) => this.#clampRow(row[0], row[cols - 1]));
  }

  #clampRow(first, last) {
    C.PLAQUE_OFFSETS.forEach((off) => this.#attachToClamp(first, off));
    C.PLAQUE_OFFSETS.forEach((off) => this.#attachToGrip(last, off));
  }

  #attachToClamp(cellEntry, off) {
    const plaque = cellEntry.ring[sideNode("left", off)];
    const anchor = this.#nodes.add(cellEntry.x0 - C.CELL_GAP, cellEntry.y0 + off);
    this.#fixed.add(anchor);
    this.#clamp.push(anchor);
    cellEntry.plaques.push(plaque);
    this.#addDesmosome(anchor, plaque);
  }

  #attachToGrip(cellEntry, off) {
    const plaque = cellEntry.ring[sideNode("right", off)];
    const handle = this.#nodes.add(cellEntry.x0 + C.CELL_SIZE + C.CELL_GAP, cellEntry.y0 + off);
    this.#fixed.add(handle);
    this.#grip.push(handle);
    cellEntry.plaques.push(plaque);
    this.#addDesmosome(plaque, handle);
  }

  #buildFilamentCage({ cell, x0, y0, plaques }) {
    const cage = cageOutline(x0 + C.CELL_SIZE / 2, y0 + C.CELL_SIZE / 2).map(([x, y]) => this.#nodes.add(x, y));
    cell.holdNucleusIn(cage);
    cage.forEach((a, k) => this.#addFilament(a, cage[(k + 1) % cage.length]));
    plaques.forEach((plaque) => this.#tetherToCage(plaque, cage));
  }

  #tetherToCage(plaque, cage) {
    nearestTwo(this.#nodes, plaque, cage).forEach((node) => this.#addFilament(plaque, node));
  }

  #addFilament(a, b) {
    const rest = distance(this.#nodes, a, b);
    this.#springs.push(Spring.between(a, b, rest, FILAMENT_LAW, C.FILAMENT_BREAK_STRAIN, "filament"));
  }

  // ---- dynamics -----------------------------------------------------------

  relaxUnder(force, iterations) {
    for (let i = 0; i < iterations; i++) this.#iterate(force);
  }

  #iterate(force) {
    this.#nodes.clearForces();
    this.#springs.forEach((spring) => spring.applyTo(this.#nodes));
    this.#cells.forEach((cell) => cell.applyPressureTo(this.#nodes));
    this.#moveFreeNodes();
    this.#moveGrip(force);
    this.#ruptureTornCells();
  }

  #moveFreeNodes() {
    const nodes = this.#nodes;
    const dt = C.TIME_STEP;
    for (let i = 0; i < nodes.count(); i++) {
      if (!this.#fixed.has(i)) nodes.move(i, dt * nodes.forceX(i), dt * nodes.forceY(i));
    }
  }

  #moveGrip(force) {
    const resisting = this.#grip.reduce((sum, i) => sum + this.#nodes.forceX(i), 0);
    const step = (C.TIME_STEP * (force + resisting)) / this.#grip.length;
    const travel = Math.min(C.MAX_GRIP_TRAVEL, Math.max(0, this.#gripTravel + step));
    const dx = travel - this.#gripTravel;
    this.#gripTravel = travel;
    this.#grip.forEach((i) => this.#nodes.move(i, dx, 0));
  }

  #ruptureTornCells() {
    this.#membraneOwners.forEach((cell, spring) => {
      if (spring.isBroken()) cell.rupture();
    });
  }

  // ---- drawing ------------------------------------------------------------

  drawOn(painter) {
    this.#cells.forEach((cell) => cell.drawOn(this.#nodes, painter));
    DRAWING_ORDER.forEach((kind) => this.#drawLinksOfKind(kind, painter));
    painter.clamp(...this.#barSpan(this.#clamp));
    painter.grip(...this.#barSpan(this.#grip));
  }

  #drawLinksOfKind(kind, painter) {
    this.#springs.filter((s) => s.isKind(kind)).forEach((s) => s.drawOn(this.#nodes, painter));
  }

  #barSpan(bar) {
    const ys = bar.map((i) => this.#nodes.y(i));
    return [this.#nodes.x(bar[0]), Math.min(...ys) - BAR_OVERHANG, Math.max(...ys) + BAR_OVERHANG];
  }

  // ---- queries ------------------------------------------------------------

  census() {
    return {
      intact: this.#countSprings((s) => !s.isBroken()),
      broken: this.#countSprings((s) => s.isBroken()),
      rupturedCells: this.#cells.filter((cell) => cell.isRuptured()).length,
      elongation: this.#gripTravel / this.#width,
    };
  }

  #countSprings(predicate) {
    const counts = { membrane: 0, desmosome: 0, filament: 0 };
    const kinds = Object.keys(counts);
    this.#springs.filter(predicate).forEach((s) => counts[kinds.find((k) => s.isKind(k))]++);
    return counts;
  }
}

// ---- geometry helpers -------------------------------------------------------

// Ring positions, clockwise on screen: top (left→right), right (top→bottom),
// bottom (right→left), left (bottom→top). Each side contributes its first
// corner and SEGMENTS_PER_SIDE - 1 interior points.
const SIDES = ["top", "right", "bottom", "left"];

function ringOutline(x0, y0) {
  const s = C.CELL_SIZE;
  const walk = {
    top: (d) => [x0 + d, y0],
    right: (d) => [x0 + s, y0 + d],
    bottom: (d) => [x0 + s - d, y0 + s],
    left: (d) => [x0, y0 + s - d],
  };
  return SIDES.flatMap((side) => sidePoints(walk[side]));
}

function sidePoints(walk) {
  return Array.from({ length: C.SEGMENTS_PER_SIDE }, (_, k) => walk(k * SEGMENT));
}

// Ring index of the node lying `offset` units from the top-left end of a side
// (measured along +x for top/bottom, along +y for left/right).
function sideNode(side, offset) {
  const start = SIDES.indexOf(side) * C.SEGMENTS_PER_SIDE;
  const reversed = side === "bottom" || side === "left";
  const along = reversed ? C.CELL_SIZE - offset : offset;
  return start + along / SEGMENT;
}

function cageOutline(cx, cy) {
  return Array.from({ length: C.PERINUCLEAR_NODES }, (_, k) => {
    const angle = (2 * Math.PI * k) / C.PERINUCLEAR_NODES;
    return [cx + C.PERINUCLEAR_RADIUS * Math.cos(angle), cy + C.PERINUCLEAR_RADIUS * Math.sin(angle)];
  });
}

function distance(nodes, a, b) {
  return Math.hypot(nodes.x(b) - nodes.x(a), nodes.y(b) - nodes.y(a));
}

function nearestTwo(nodes, from, candidates) {
  return [...candidates].sort((p, q) => distance(nodes, from, p) - distance(nodes, from, q)).slice(0, 2);
}
