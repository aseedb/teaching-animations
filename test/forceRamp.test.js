import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ForceRamp } from "../src/forceRamp.js";

const anyPositive = (max = 100) => 0.1 + Math.random() * max;

describe("ForceRampSpecification", () => {
  test("ShouldRiseLinearlyDuringTheRamp", () => {
    // GIVEN
    const duration = anyPositive();
    const maximum = anyPositive();
    const fraction = Math.random();
    const ramp = ForceRamp.over(duration, maximum);
    // WHEN
    const force = ramp.forceAt(fraction * duration);
    // THEN
    assert.ok(Math.abs(force - fraction * maximum) < 1e-9);
  });

  test("ShouldReachTheMaximumExactlyAtTheEndOfTheRamp", () => {
    // GIVEN
    const duration = anyPositive();
    const maximum = anyPositive();
    // WHEN
    const force = ForceRamp.over(duration, maximum).forceAt(duration);
    // THEN
    assert.equal(force, maximum);
  });

  test("ShouldHoldTheMaximumAfterTheRamp", () => {
    // GIVEN
    const duration = anyPositive();
    const maximum = anyPositive();
    // WHEN
    const force = ForceRamp.over(duration, maximum).forceAt(duration + anyPositive());
    // THEN
    assert.equal(force, maximum);
  });

  test("ShouldReportCompletionOnlyFromTheEndOfTheRamp", () => {
    // GIVEN
    const duration = anyPositive();
    const ramp = ForceRamp.over(duration, anyPositive());
    // WHEN
    const justBefore = ramp.isCompleteAt(duration * (1 - 1e-9));
    const atEnd = ramp.isCompleteAt(duration);
    // THEN
    assert.deepEqual([justBefore, atEnd], [false, true]);
  });
});
