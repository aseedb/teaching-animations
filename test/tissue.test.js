import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Tissue } from "../src/tissue.js";
import { PERINUCLEAR_NODES, SEGMENTS_PER_SIDE, FILAMENT_SLACK } from "../src/constants.js";

const anyCount = (max = 4) => 1 + Math.floor(Math.random() * max);
const anySeed = () => Math.floor(Math.random() * 1e9);

function desmosomesExpected(rows, cols) {
  const betweenCells = 2 * (rows * (cols - 1) + (rows - 1) * cols);
  const toAnchorAndGrip = 2 * 2 * rows;
  return betweenCells + toAnchorAndGrip;
}

function plaquesExpected(rows, cols) {
  const betweenCells = 2 * (rows * (cols - 1) + (rows - 1) * cols);
  return 2 * betweenCells + 2 * 2 * rows;
}

// Every cell has plaques on its left and right sides (neighbour, clamp or
// grip); only cells with neighbours above and below have plaques on both.
function transcellularBundlesExpected(rows, cols) {
  const offsets = 2;
  return offsets * (rows * cols + Math.max(0, rows - 2) * cols);
}

describe("TissueSpecification", () => {
  test("ShouldLinkEveryNeighbouringCellPairAndBothClampsWithTwoDesmosomes", () => {
    // GIVEN
    const rows = anyCount();
    const cols = anyCount();
    // WHEN
    const tissue = Tissue.build({ rows, cols, withFilaments: Math.random() < 0.5, seed: anySeed() });
    // THEN
    assert.equal(tissue.census().intact.desmosome, desmosomesExpected(rows, cols));
  });

  test("ShouldContainNoIntermediateFilamentsWhenBuiltWithoutThem", () => {
    // GIVEN
    const options = { rows: anyCount(), cols: anyCount(), withFilaments: false, seed: anySeed() };
    // WHEN
    const tissue = Tissue.build(options);
    // THEN
    assert.equal(tissue.census().intact.filament, 0);
  });

  test("ShouldTieEveryPlaqueToThePerinuclearCageAndToTheFacingPlaqueWhenBuiltWithFilaments", () => {
    // GIVEN
    const rows = anyCount();
    const cols = anyCount();
    // WHEN
    const tissue = Tissue.build({ rows, cols, withFilaments: true, seed: anySeed() });
    // THEN
    const cage = rows * cols * PERINUCLEAR_NODES;
    const tethers = 2 * plaquesExpected(rows, cols);
    const bundles = transcellularBundlesExpected(rows, cols);
    assert.equal(tissue.census().intact.filament, cage + tethers + bundles);
  });

  test("ShouldBraceEveryMembraneNodeToTheCellCentreWithCytoplasmicElasticity", () => {
    // GIVEN
    const rows = anyCount();
    const cols = anyCount();
    // WHEN
    const tissue = Tissue.build({ rows, cols, withFilaments: Math.random() < 0.5, seed: anySeed() });
    // THEN
    assert.equal(tissue.census().intact.cytoplasm, rows * cols * 4 * SEGMENTS_PER_SIDE);
  });

  test("ShouldLayEveryIntermediateFilamentSlackAtRest", () => {
    // GIVEN
    const tissue = Tissue.build({ rows: anyCount(), cols: anyCount(), withFilaments: true, seed: anySeed() });
    const strains = [];
    const painter = { link: (kind, x1, y1, x2, y2, strain) => kind === "filament" && strains.push(strain), tear() {}, cytoplasm() {}, nucleus() {}, clamp() {}, grip() {} };
    // WHEN
    tissue.drawOn(painter);
    // THEN (anchor distance = contour length / (1 + slack))
    const expected = 1 / (1 + FILAMENT_SLACK) - 1;
    assert.ok(strains.length > 0 && strains.every((s) => Math.abs(s - expected) < 1e-9));
  });

  test("ShouldStartWithEveryCellIntact", () => {
    // GIVEN
    const options = { rows: anyCount(), cols: anyCount(), withFilaments: Math.random() < 0.5, seed: anySeed() };
    // WHEN
    const tissue = Tissue.build(options);
    // THEN
    assert.equal(tissue.census().rupturedCells, 0);
  });

  test("ShouldStayAtRestWhenNoForceIsApplied", () => {
    // GIVEN
    const tissue = Tissue.build({ rows: anyCount(), cols: anyCount(), withFilaments: Math.random() < 0.5, seed: anySeed() });
    // WHEN
    tissue.relaxUnder(0, 50);
    // THEN
    assert.ok(Math.abs(tissue.census().elongation) < 1e-9);
  });
});
