import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Species } from "../src/species.js";
import { Sarcomere, TITIN_STIFFENING } from "../src/sarcomere.js";

const anyBetween = (lo, hi) => lo + Math.random() * (hi - lo);
const passive = (species, length) => Sarcomere.of(species, length).passiveTension();

describe("PassiveTensionSpecification", () => {
  test("ShouldCarryNoPassiveTensionAtTheTitinOnset", () => {
    // GIVEN
    const rabbit = Species.rabbit();
    // WHEN
    const t = passive(rabbit, rabbit.titinOnset());
    // THEN
    assert.equal(t, 0);
  });

  test("ShouldCarryNoPassiveTensionBelowTheTitinOnset", () => {
    // GIVEN
    const rabbit = Species.rabbit();
    const length = anyBetween(1.2, rabbit.titinOnset());
    // WHEN
    const t = passive(rabbit, length);
    // THEN
    assert.equal(t, 0);
  });

  test("ShouldCarryPassiveTensionJustBeyondTheTitinOnset", () => {
    // GIVEN
    const rabbit = Species.rabbit();
    // WHEN
    const t = passive(rabbit, rabbit.titinOnset() + 0.01);
    // THEN
    assert.ok(t > 0);
  });

  test("ShouldStiffenTitinAsTheSarcomereIsStretchedFurther", () => {
    // GIVEN
    const rabbit = Species.rabbit();
    const a = anyBetween(rabbit.titinOnset(), 3.8);
    const b = a + 0.2;
    // WHEN
    const [first, second, third] = [a, b, b + 0.2].map((l) => passive(rabbit, l));
    // THEN
    assert.ok(third - second > second - first, `${first} ${second} ${third}`);
  });

  test("ShouldReachTheMaximalActiveForceWhereFilamentsStopOverlapping", () => {
    // GIVEN
    const rabbit = Species.rabbit();
    const { zeroForce } = Sarcomere.landmarks(rabbit);
    // WHEN
    const t = passive(rabbit, zeroForce);
    // THEN
    assert.ok(Math.abs(t - 1) < 1e-9, `${t}`);
  });

  test("ShouldReportNoTitinCurveForASpeciesWithoutAttestedOnset", () => {
    // GIVEN
    const frog = Species.frog();
    // WHEN
    const t = passive(frog, anyBetween(1.2, 4.2));
    // THEN
    assert.equal(t, null);
  });

  test("ShouldUseATitinStiffeningExponentOfThree", () => {
    // GIVEN / WHEN / THEN
    assert.equal(TITIN_STIFFENING, 3);
  });
});
