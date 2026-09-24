import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Tissue } from "../src/tissue.js";
import { PERINUCLEAR_NODES } from "../src/constants.js";

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

  test("ShouldTieEveryPlaqueToThePerinuclearFilamentCageWhenBuiltWithFilaments", () => {
    // GIVEN
    const rows = anyCount();
    const cols = anyCount();
    // WHEN
    const tissue = Tissue.build({ rows, cols, withFilaments: true, seed: anySeed() });
    // THEN
    const cage = rows * cols * PERINUCLEAR_NODES;
    const tethers = 2 * plaquesExpected(rows, cols);
    assert.equal(tissue.census().intact.filament, cage + tethers);
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
