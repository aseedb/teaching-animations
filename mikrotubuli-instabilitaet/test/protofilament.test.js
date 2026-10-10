import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Protofilament, DIMER_NM } from "../src/protofilament.js";

const anyInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const always = { chance: () => true };
const never = { chance: () => false };

function protofilamentOf(states) {
  const p = Protofilament.empty();
  states.forEach((s) => p.add(s));
  return p;
}

describe("ProtofilamentSpecification", () => {
  test("ShouldAddGTPTubulinAtThePlusEnd", () => {
    // GIVEN
    const p = protofilamentOf(Array(anyInt(0, 20)).fill("GDP"));
    // WHEN
    p.grow();
    // THEN
    assert.equal(p.tipState(), "GTP");
  });

  test("ShouldHydrolyseBuriedGTPTubulin", () => {
    // GIVEN
    const p = protofilamentOf(["GTP", "GTP"]);
    // WHEN
    p.hydrolyse(always, 1);
    // THEN
    assert.deepEqual(p.states(), ["GDP", "GTP"]);
  });

  test("ShouldNeverHydrolyseTheTerminalDimer", () => {
    // GIVEN
    const p = protofilamentOf(Array(anyInt(1, 20)).fill("GTP"));
    // WHEN
    p.hydrolyse(always, 1);
    // THEN
    assert.equal(p.tipState(), "GTP");
  });

  test("ShouldKeepGTPWhenHydrolysisDoesNotHappen", () => {
    // GIVEN
    const p = protofilamentOf(["GTP", "GTP", "GTP"]);
    // WHEN
    p.hydrolyse(never, 0.5);
    // THEN
    assert.deepEqual(p.states(), ["GTP", "GTP", "GTP"]);
  });

  test("ShouldLoseItsTerminalDimerWhenShrinking", () => {
    // GIVEN
    const n = anyInt(2, 30);
    const p = protofilamentOf(Array(n).fill("GDP"));
    // WHEN
    const lost = p.shrink();
    // THEN
    assert.deepEqual([lost, p.dimerCount()], ["GDP", n - 1]);
  });

  test("ShouldMeasureItsGTPCapFromThePlusEnd", () => {
    // GIVEN
    const cap = anyInt(0, 10);
    const p = protofilamentOf([...Array(5).fill("GTP"), "GDP", ...Array(cap).fill("GTP")]);
    // WHEN
    const length = p.gtpCapLength();
    // THEN
    assert.equal(length, cap);
  });

  test("ShouldMeasureItsLengthInDimers", () => {
    // GIVEN
    const n = anyInt(0, 50);
    const p = protofilamentOf(Array(n).fill("GDP"));
    // WHEN
    const length = p.lengthNm();
    // THEN
    assert.equal(length, n * DIMER_NM);
  });

  test("ShouldUseTheLengthOfAnAlphaBetaTubulinDimer", () => {
    // GIVEN / WHEN / THEN
    assert.equal(DIMER_NM, 8);
  });
});
