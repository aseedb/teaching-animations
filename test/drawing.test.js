import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Nodes } from "../src/nodes.js";
import { Spring } from "../src/spring.js";
import { Cell } from "../src/cell.js";
import { Tissue } from "../src/tissue.js";
import { LinearLaw } from "../src/springLaw.js";

const anyPositive = (max = 100) => 0.1 + Math.random() * max;
const anyKind = () => ["membrane", "desmosome", "filament"][Math.floor(Math.random() * 3)];
const anyCount = (max = 3) => 1 + Math.floor(Math.random() * max);
const anySeed = () => Math.floor(Math.random() * 1e9);

class RecordingPainter {
  links = [];
  cytoplasms = [];
  nuclei = [];
  clamps = [];
  grips = [];
  tears = [];
  tear(kind, x1, y1, x2, y2) {
    this.tears.push({ kind, x1, y1, x2, y2 });
  }
  link(kind, x1, y1, x2, y2, strain) {
    this.links.push({ kind, x1, y1, x2, y2, strain });
  }
  cytoplasm(points, ruptured) {
    this.cytoplasms.push({ points, ruptured });
  }
  nucleus(x, y, ruptured) {
    this.nuclei.push({ x, y, ruptured });
  }
  clamp(x, yTop, yBottom) {
    this.clamps.push({ x, yTop, yBottom });
  }
  grip(x, yTop, yBottom) {
    this.grips.push({ x, yTop, yBottom });
  }
}

function assertClose(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} vs ${expected}`);
}

describe("SpringDrawingSpecification", () => {
  test("ShouldDrawItselfWithItsKindAndCurrentStrainWhileIntact", () => {
    // GIVEN
    const rest = anyPositive();
    const strain = Math.random() * 0.3;
    const kind = anyKind();
    const nodes = Nodes.create();
    nodes.add(0, 0);
    nodes.add(rest * (1 + strain), 0);
    const spring = Spring.between(0, 1, rest, LinearLaw.of(1), 10, kind);
    const painter = new RecordingPainter();
    // WHEN
    spring.drawOn(nodes, painter);
    // THEN
    assert.equal(painter.links[0].kind, kind);
    assertClose(painter.links[0].strain, strain);
  });

  test("ShouldBeDrawnAsATearBetweenItsEndsOnceBroken", () => {
    // GIVEN
    const kind = anyKind();
    const nodes = Nodes.create();
    nodes.add(0, 0);
    const far = 3 + anyPositive(10);
    nodes.add(far, 0);
    const spring = Spring.between(0, 1, 1, LinearLaw.of(1), 0.5, kind);
    spring.applyTo(nodes);
    const painter = new RecordingPainter();
    // WHEN
    spring.drawOn(nodes, painter);
    // THEN
    assert.equal(painter.links.length, 0);
    assert.deepEqual(painter.tears, [{ kind, x1: 0, y1: 0, x2: far, y2: 0 }]);
  });
});

describe("CellDrawingSpecification", () => {
  function squareCell(side) {
    const nodes = Nodes.create();
    const ring = [nodes.add(0, 0), nodes.add(side, 0), nodes.add(side, side), nodes.add(0, side)];
    return { nodes, cell: Cell.of(ring, side * side, 1) };
  }

  test("ShouldPaintItsCytoplasmThroughItsMembraneNodes", () => {
    // GIVEN
    const side = anyPositive();
    const { nodes, cell } = squareCell(side);
    const painter = new RecordingPainter();
    // WHEN
    cell.drawOn(nodes, painter);
    // THEN
    assert.deepEqual(painter.cytoplasms[0].points, [[0, 0], [side, 0], [side, side], [0, side]]);
  });

  test("ShouldPlaceItsNucleusAtTheCentreOfItsMembraneByDefault", () => {
    // GIVEN
    const side = anyPositive();
    const { nodes, cell } = squareCell(side);
    const painter = new RecordingPainter();
    // WHEN
    cell.drawOn(nodes, painter);
    // THEN
    assert.deepEqual([painter.nuclei[0].x, painter.nuclei[0].y], [side / 2, side / 2]);
  });

  test("ShouldPlaceItsNucleusInsideThePerinuclearCageWhenItHasOne", () => {
    // GIVEN
    const { nodes, cell } = squareCell(anyPositive());
    const cx = anyPositive();
    const cy = anyPositive();
    const cage = [nodes.add(cx - 1, cy), nodes.add(cx + 1, cy)];
    cell.holdNucleusIn(cage);
    const painter = new RecordingPainter();
    // WHEN
    cell.drawOn(nodes, painter);
    // THEN
    assert.deepEqual([painter.nuclei[0].x, painter.nuclei[0].y], [cx, cy]);
  });

  test("ShouldShowThatItIsRupturedOnceTorn", () => {
    // GIVEN
    const { nodes, cell } = squareCell(anyPositive());
    cell.rupture();
    const painter = new RecordingPainter();
    // WHEN
    cell.drawOn(nodes, painter);
    // THEN
    assert.equal(painter.cytoplasms[0].ruptured, true);
  });
});

describe("TissueDrawingSpecification", () => {
  test("ShouldDrawEveryIntactLinkAndEveryCell", () => {
    // GIVEN
    const rows = anyCount();
    const cols = anyCount();
    const tissue = Tissue.build({ rows, cols, withFilaments: Math.random() < 0.5, seed: anySeed() });
    const intact = tissue.census().intact;
    const painter = new RecordingPainter();
    // WHEN
    tissue.drawOn(painter);
    // THEN
    assert.equal(painter.links.length, intact.membrane + intact.desmosome + intact.filament);
    assert.equal(painter.cytoplasms.length, rows * cols);
  });

  test("ShouldDrawTheFixedClampAndThePullingGripAcrossTheWholeSheet", () => {
    // GIVEN
    const tissue = Tissue.build({ rows: anyCount(), cols: anyCount(), withFilaments: false, seed: anySeed() });
    const painter = new RecordingPainter();
    // WHEN
    tissue.drawOn(painter);
    // THEN
    assert.equal(painter.clamps.length, 1);
    assert.equal(painter.grips.length, 1);
    assert.ok(painter.grips[0].x > painter.clamps[0].x);
  });
});
