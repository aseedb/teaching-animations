import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as C from "../src/constants.js";

// Pins the calibrated values: the scenario tests depend on them together, so a
// change here is a deliberate recalibration, not an accident.

describe("ConstantsSpecification", () => {
  const expected = {
    CELL_SIZE: 60,
    CELL_GAP: 8,
    SEGMENTS_PER_SIDE: 6,
    PLAQUE_OFFSETS: [20, 40],
    PERINUCLEAR_NODES: 6,
    PERINUCLEAR_RADIUS: 11,
    MEMBRANE_STIFFNESS: 30,
    MEMBRANE_BREAK_STRAIN: 0.15,
    MEMBRANE_BREAK_SPREAD: 0.2,
    DESMOSOME_STIFFNESS: 120,
    DESMOSOME_BREAK_STRAIN: 8,
    FILAMENT_STIFFNESS: 200,
    FILAMENT_STIFFENING: 30,
    FILAMENT_COMPRESSION: 0,
    FILAMENT_SLACK: 0.12,
    FILAMENT_BREAK_STRAIN: 3,
    BULK_MODULUS: 3,
    CYTOPLASM_STIFFNESS: 40,
    TIME_STEP: 0.02,
    MAX_FORCE: 150,
    MAX_GRIP_TRAVEL: 180,
  };

  for (const [name, value] of Object.entries(expected)) {
    test(`ShouldDefine${name}As${String(value).replace(/\W/g, "_")}`, () => {
      // GIVEN the constants module, WHEN reading the constant
      const actual = C[name];
      // THEN
      assert.deepEqual(actual, value);
    });
  }

  test("ShouldDefineNoUnspecifiedConstant", () => {
    // GIVEN
    const specified = Object.keys(expected).sort();
    // WHEN
    const defined = Object.keys(C).sort();
    // THEN
    assert.deepEqual(defined, specified);
  });

  test("ShouldPlacePlaquesStrictlyInsideACellSideOnSegmentNodes", () => {
    // GIVEN
    const segment = C.CELL_SIZE / C.SEGMENTS_PER_SIDE;
    // WHEN
    const onNodes = C.PLAQUE_OFFSETS.every((off) => off > 0 && off < C.CELL_SIZE && Number.isInteger(off / segment));
    // THEN
    assert.equal(onNodes, true);
  });
});
