import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LinearLaw, StiffeningLaw } from "../src/springLaw.js";

const anyPositive = (max = 100) => 0.1 + Math.random() * max;
const anyStrain = () => 0.01 + Math.random() * 0.9;

describe("LinearLawSpecification", () => {
  test("ShouldReturnTensionProportionalToStrain", () => {
    // GIVEN
    const stiffness = anyPositive();
    const strain = anyStrain();
    const law = LinearLaw.of(stiffness);
    // WHEN
    const tension = law.tensionAt(strain);
    // THEN
    assert.equal(tension, stiffness * strain);
  });

  test("ShouldPushBackWhenCompressed", () => {
    // GIVEN
    const stiffness = anyPositive();
    const strain = -anyStrain();
    const law = LinearLaw.of(stiffness);
    // WHEN
    const tension = law.tensionAt(strain);
    // THEN
    assert.equal(tension, stiffness * strain);
  });
});

describe("StiffeningLawSpecification", () => {
  test("ShouldAddCubicStiffeningToLinearTensionWhenStretched", () => {
    // GIVEN
    const stiffness = anyPositive();
    const stiffening = anyPositive(50);
    const strain = anyStrain();
    const law = StiffeningLaw.of(stiffness, stiffening, 0);
    // WHEN
    const tension = law.tensionAt(strain);
    // THEN
    assert.ok(Math.abs(tension - stiffness * (strain + stiffening * strain ** 3)) < 1e-9);
  });

  test("ShouldResistCompressionOnlyByTheCompressionFactorBecauseFilamentsBuckle", () => {
    // GIVEN
    const stiffness = anyPositive();
    const compressionFactor = Math.random() * 0.2;
    const strain = -anyStrain();
    const law = StiffeningLaw.of(stiffness, anyPositive(50), compressionFactor);
    // WHEN
    const tension = law.tensionAt(strain);
    // THEN
    assert.ok(Math.abs(tension - compressionFactor * stiffness * strain) < 1e-9);
  });

  test("ShouldBeStifferThanItsLinearPartAtLargeStrain", () => {
    // GIVEN
    const stiffness = anyPositive();
    const filament = StiffeningLaw.of(stiffness, anyPositive(50), 0);
    const cortex = LinearLaw.of(stiffness);
    const strain = anyStrain();
    // WHEN
    const ratio = filament.tensionAt(strain) / cortex.tensionAt(strain);
    // THEN
    assert.ok(ratio > 1);
  });
});
