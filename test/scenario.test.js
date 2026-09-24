import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { Tissue } from "../src/tissue.js";
import { MAX_FORCE } from "../src/constants.js";

// The teaching message, as an executable claim: under the same slowly rising
// tensile force, a sheet whose desmosomes are anchored to intermediate
// filaments stays intact, while a sheet with desmosomes alone tears its cells
// apart (cytolysis) although every desmosome holds.
//
// The ramp is slow on purpose: rupture must follow from the mechanics near
// equilibrium, not from a lag of the simulation behind a fast ramp.

const RAMP_STEPS = 40;
const ITERATIONS_PER_STEP = 2000;
const anySeed = () => Math.floor(Math.random() * 1e9);

function rampSlowly(withFilaments, seed) {
  const tissue = Tissue.build({ rows: 3, cols: 4, withFilaments, seed });
  let firstRuptureForce = null;
  for (let s = 1; s <= RAMP_STEPS; s++) {
    const force = (MAX_FORCE * s) / RAMP_STEPS;
    tissue.relaxUnder(force, ITERATIONS_PER_STEP);
    if (firstRuptureForce === null && tissue.census().rupturedCells > 0) firstRuptureForce = force;
  }
  return { census: tissue.census(), firstRuptureForce };
}

function elongationUnder(withFilaments, force) {
  const tissue = Tissue.build({ rows: 3, cols: 4, withFilaments, seed: anySeed() });
  tissue.relaxUnder(force, 20000);
  return tissue.census().elongation;
}

describe("TensileLoadScenarioSpecification", () => {
  let withFilaments;
  let withoutFilaments;

  before(() => {
    const seed = anySeed();
    withFilaments = rampSlowly(true, seed);
    withoutFilaments = rampSlowly(false, seed);
  });

  test("ShouldKeepEveryCellIntactAtMaximalForceWhenDesmosomesAreAnchoredToIntermediateFilaments", () => {
    // GIVEN a sheet with keratin, WHEN ramped slowly to the maximal force (before)
    // THEN
    assert.equal(withFilaments.census.rupturedCells, 0);
  });

  test("ShouldRuptureCellsBeforeMaximalForceWhenDesmosomesLackIntermediateFilaments", () => {
    // GIVEN a sheet without keratin, WHEN ramped slowly to the maximal force (before)
    // THEN
    assert.ok(withoutFilaments.census.rupturedCells > 0, `ruptured cells: ${withoutFilaments.census.rupturedCells}`);
  });

  test("ShouldHoldAtLeastHalfTheMaximalForceBeforeTheFirstCellTearsWithoutFilaments", () => {
    // GIVEN a sheet without keratin, WHEN ramped slowly (before)
    // THEN
    assert.ok(withoutFilaments.firstRuptureForce > MAX_FORCE / 2, `first rupture at ${withoutFilaments.firstRuptureForce}`);
  });

  test("ShouldKeepEveryDesmosomeAttachedEvenWhenTheCellsTear", () => {
    // GIVEN a sheet without keratin, WHEN ramped slowly to the maximal force (before)
    // THEN
    assert.equal(withoutFilaments.census.broken.desmosome, 0);
  });

  test("ShouldStretchFarMoreWithoutIntermediateFilamentsUnderTheSameSubcriticalForce", () => {
    // GIVEN
    const force = MAX_FORCE / 3;
    // WHEN
    const soft = elongationUnder(false, force);
    const reinforced = elongationUnder(true, force);
    // THEN
    assert.ok(soft > 2 * reinforced, `${soft} vs ${reinforced}`);
  });
});
