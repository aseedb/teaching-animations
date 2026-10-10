import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Species } from "../src/species.js";
import { Sarcomere, CONTRACTURE_SPAN, INTERFERENCE } from "../src/sarcomere.js";

const anyBetween = (lo, hi) => lo + Math.random() * (hi - lo);
const SPECIES = [Species.rabbit(), Species.frog()];
const force = (species, length) => Sarcomere.of(species, length).activeForce();

function assertClose(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

describe("SarcomereLandmarksSpecification", () => {
  test("ShouldPlaceFrogPlateauAndZeroForceWhereGordon1966MeasuredThem", () => {
    // GIVEN
    const frog = Species.frog();
    // WHEN
    const { plateauStart, plateauEnd, zeroForce } = Sarcomere.landmarks(frog);
    // THEN
    assert.deepEqual(
      [plateauStart, plateauEnd, zeroForce].map((v) => v.toFixed(3)),
      ["2.050", "2.200", "3.650"],
    );
  });

  test("ShouldPlaceRabbitOptimumWithinHerzog2018Range", () => {
    // GIVEN
    const rabbit = Species.rabbit();
    // WHEN
    const { plateauStart, plateauEnd } = Sarcomere.landmarks(rabbit);
    // THEN
    assert.ok(plateauStart >= 2.2 && plateauEnd <= 2.5, `${plateauStart}–${plateauEnd}`);
  });

  test("ShouldPutTheThickFilamentAgainstTheZDiscsAtThickPlusZDisc", () => {
    // GIVEN
    const species = SPECIES[Math.floor(Math.random() * 2)];
    const { thick, zDisc } = species.filaments();
    // WHEN
    const { thickMeetsZ } = Sarcomere.landmarks(species);
    // THEN
    assertClose(thickMeetsZ, thick + zDisc);
  });
});

describe("ActiveForceSpecification", () => {
  for (const species of SPECIES) {
    const { plateauStart, plateauEnd, zeroForce, thickMeetsZ } = Sarcomere.landmarks(species);

    test(`ShouldDevelopFullForceAtPlateauStart (${species.name()})`, () => {
      // GIVEN
      const length = plateauStart;
      // WHEN
      const f = force(species, length);
      // THEN
      assertClose(f, 1);
    });

    test(`ShouldDevelopFullForceAtPlateauEnd (${species.name()})`, () => {
      // GIVEN
      const length = plateauEnd;
      // WHEN
      const f = force(species, length);
      // THEN
      assertClose(f, 1);
    });

    test(`ShouldLoseForceJustBeyondThePlateau (${species.name()})`, () => {
      // GIVEN
      const length = plateauEnd + 0.01;
      // WHEN
      const f = force(species, length);
      // THEN
      assert.ok(f < 1);
    });

    test(`ShouldLoseForceJustBelowThePlateau (${species.name()})`, () => {
      // GIVEN
      const length = plateauStart - 0.01;
      // WHEN
      const f = force(species, length);
      // THEN
      assert.ok(f < 1 && f > 0.9, `${f}`);
    });

    test(`ShouldFallLinearlyOnTheDescendingLimb (${species.name()})`, () => {
      // GIVEN
      const length = (plateauEnd + zeroForce) / 2;
      // WHEN
      const f = force(species, length);
      // THEN
      assertClose(f, 0.5);
    });

    test(`ShouldDevelopNoForceOnceFilamentsNoLongerOverlap (${species.name()})`, () => {
      // GIVEN
      const length = anyBetween(zeroForce, 4.5);
      // WHEN
      const f = force(species, length);
      // THEN
      assert.equal(f, 0);
    });

    test(`ShouldStillDevelopForceJustBeforeOverlapEnds (${species.name()})`, () => {
      // GIVEN
      const length = zeroForce - 0.01;
      // WHEN
      const f = force(species, length);
      // THEN
      assert.ok(f > 0);
    });

    test(`ShouldDropSteeplyOnceThickFilamentsPushOnZDiscs (${species.name()})`, () => {
      // GIVEN
      const atContact = force(species, thickMeetsZ);
      // WHEN
      const f = force(species, thickMeetsZ - CONTRACTURE_SPAN / 2);
      // THEN
      assertClose(f, atContact / 2);
    });

    test(`ShouldDevelopNoForceBelowTheContractureSpan (${species.name()})`, () => {
      // GIVEN
      const length = anyBetween(0.8, thickMeetsZ - CONTRACTURE_SPAN);
      // WHEN
      const f = force(species, length);
      // THEN
      assert.equal(f, 0);
    });
  }

  test("ShouldUseAContractureSpanOfFourTenthsMicrometre", () => {
    // GIVEN / WHEN / THEN
    assert.equal(CONTRACTURE_SPAN, 0.4);
  });

  test("ShouldWeighThinFilamentInterferenceByOneHalf", () => {
    // GIVEN / WHEN / THEN
    assert.equal(INTERFERENCE, 0.5);
  });

  test("ShouldLoseForceInProportionToThinFilamentDoubleOverlap", () => {
    // GIVEN
    const species = SPECIES[Math.floor(Math.random() * 2)];
    const { thick, thinFromZ, bareZone } = species.filaments();
    const { plateauStart, thickMeetsZ } = Sarcomere.landmarks(species);
    const length = anyBetween(thickMeetsZ, plateauStart);
    // WHEN
    const f = force(species, length);
    // THEN
    const doubleOverlapPerHalf = (2 * thinFromZ - length) / 2;
    assertClose(f, 1 - (INTERFERENCE * doubleOverlapPerHalf) / ((thick - bareZone) / 2));
  });
});
