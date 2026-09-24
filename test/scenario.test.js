import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Tissue } from "../src/tissue.js";
import { MAX_FORCE } from "../src/constants.js";

// The teaching message, as an executable claim: under the same rising tensile
// force, a sheet whose desmosomes are anchored to intermediate filaments stays
// intact, while a sheet with desmosomes alone tears its cells apart
// (cytolysis) although every desmosome holds.

const RAMP_STEPS = 40;
const ITERATIONS_PER_STEP = 300;
const anySeed = () => Math.floor(Math.random() * 1e9);

function rampToMaximalForce(withFilaments, seed) {
  const tissue = Tissue.build({ rows: 3, cols: 4, withFilaments, seed });
  for (let s = 1; s <= RAMP_STEPS; s++) tissue.relaxUnder((MAX_FORCE * s) / RAMP_STEPS, ITERATIONS_PER_STEP);
  return tissue.census();
}

function elongationUnder(withFilaments, force) {
  const tissue = Tissue.build({ rows: 3, cols: 4, withFilaments, seed: anySeed() });
  tissue.relaxUnder(force, 4000);
  return tissue.census().elongation;
}

describe("TensileLoadScenarioSpecification", () => {
  test("ShouldKeepEveryCellIntactAtMaximalForceWhenDesmosomesAreAnchoredToIntermediateFilaments", () => {
    // GIVEN
    const withFilaments = true;
    // WHEN
    const census = rampToMaximalForce(withFilaments, anySeed());
    // THEN
    assert.equal(census.rupturedCells, 0);
  });

  test("ShouldRuptureCellsBeforeMaximalForceWhenDesmosomesLackIntermediateFilaments", () => {
    // GIVEN
    const withFilaments = false;
    // WHEN
    const census = rampToMaximalForce(withFilaments, anySeed());
    // THEN
    assert.ok(census.rupturedCells > 0, `ruptured cells: ${census.rupturedCells}`);
  });

  test("ShouldKeepEveryDesmosomeAttachedEvenWhenTheCellsTear", () => {
    // GIVEN
    const withFilaments = false;
    // WHEN
    const census = rampToMaximalForce(withFilaments, anySeed());
    // THEN
    assert.equal(census.broken.desmosome, 0);
  });

  test("ShouldStretchFarMoreWithoutIntermediateFilamentsUnderTheSameSubcriticalForce", () => {
    // GIVEN
    const force = MAX_FORCE / 3;
    // WHEN
    const withoutFilaments = elongationUnder(false, force);
    const withFilaments = elongationUnder(true, force);
    // THEN
    assert.ok(withoutFilaments > 2 * withFilaments, `${withoutFilaments} vs ${withFilaments}`);
  });
});
