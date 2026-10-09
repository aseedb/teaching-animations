import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Filament, SUBUNIT_NM, BRANCH_ANGLE_DEG } from "../src/filament.js";

const anyBetween = (lo, hi) => lo + Math.random() * (hi - lo);
const anyInt = (lo, hi) => Math.floor(anyBetween(lo, hi + 1));
const always = { chance: () => true };
const never = { chance: () => false };

function filamentOf(states) {
  const f = Filament.at({ x: anyBetween(-500, 0), y: anyBetween(-200, 200) }, anyBetween(-0.6, 0.6));
  for (const s of states) f.addAtBarbedEnd(s);
  return f;
}

describe("FilamentSpecification", () => {
  test("ShouldAddATPActinAtTheBarbedEnd", () => {
    // GIVEN
    const f = filamentOf(["ADP", "ADP"]);
    // WHEN
    f.polymerize();
    // THEN
    assert.equal(f.states().at(-1), "ATP");
  });

  test("ShouldLengthenByOneSubunitPerPolymerization", () => {
    // GIVEN
    const f = filamentOf(Array(anyInt(1, 20)).fill("ADP"));
    const before = f.barbedTip();
    // WHEN
    f.polymerize();
    // THEN
    assert.ok(Math.abs(Math.hypot(f.barbedTip().x - before.x, f.barbedTip().y - before.y) - SUBUNIT_NM) < 1e-9);
  });

  test("ShouldHydrolyseATPToADPPi", () => {
    // GIVEN
    const f = filamentOf(["ATP"]);
    // WHEN
    f.age(always, { hydrolysis: 1, release: 0 });
    // THEN
    assert.deepEqual(f.states(), ["ADP-Pi"]);
  });

  test("ShouldReleasePhosphateFromADPPi", () => {
    // GIVEN
    const f = filamentOf(["ADP-Pi"]);
    // WHEN
    f.age(always, { hydrolysis: 0, release: 1 });
    // THEN
    assert.deepEqual(f.states(), ["ADP"]);
  });

  test("ShouldNotSkipFromATPDirectlyToADPInOneStep", () => {
    // GIVEN
    const f = filamentOf(["ATP"]);
    // WHEN
    f.age(always, { hydrolysis: 1, release: 1 });
    // THEN
    assert.deepEqual(f.states(), ["ADP-Pi"]);
  });

  test("ShouldLoseADPActinAtThePointedEnd", () => {
    // GIVEN
    const f = filamentOf(["ADP", "ATP"]);
    // WHEN
    const lost = f.depolymerizePointedEnd();
    // THEN
    assert.deepEqual({ lost, states: f.states() }, { lost: 1, states: ["ATP"] });
  });

  test("ShouldKeepItsPointedEndWhileTheSubunitThereStillHoldsPhosphate", () => {
    // GIVEN
    const f = filamentOf(["ADP-Pi", "ADP"]);
    // WHEN
    const lost = f.depolymerizePointedEnd();
    // THEN
    assert.equal(lost, 0);
  });

  test("ShouldMoveThePointedEndForwardWhenItLosesASubunit", () => {
    // GIVEN
    const f = filamentOf(["ADP", "ADP", "ADP"]);
    const tip = f.barbedTip();
    // WHEN
    f.depolymerizePointedEnd();
    // THEN
    const moved = Math.hypot(f.barbedTip().x - tip.x, f.barbedTip().y - tip.y);
    assert.ok(moved < 1e-9 && f.subunitCount() === 2, `${moved} ${f.subunitCount()}`);
  });

  test("ShouldSplitIntoTwoFilamentsWhenSevered", () => {
    // GIVEN
    const n = anyInt(3, 30);
    const f = filamentOf(Array(n).fill("ADP"));
    const at = anyInt(1, n - 1);
    // WHEN
    const rear = f.severBefore(at);
    // THEN
    assert.deepEqual([rear.subunitCount(), f.subunitCount()], [at, n - at]);
  });

  test("ShouldKeepTheBarbedEndInPlaceWhenSevered", () => {
    // GIVEN
    const f = filamentOf(Array(10).fill("ADP"));
    const tip = f.barbedTip();
    // WHEN
    f.severBefore(4);
    // THEN
    assert.ok(Math.abs(f.barbedTip().x - tip.x) < 1e-9 && Math.abs(f.barbedTip().y - tip.y) < 1e-9);
  });

  test("ShouldGrowABranchAtSeventyDegreesFromTheMotherFilament", () => {
    // GIVEN
    const f = filamentOf(Array(10).fill("ATP"));
    // WHEN
    const branch = f.branchAt(5, 1);
    // THEN
    assert.ok(Math.abs(branch.angle() - f.angle() - (BRANCH_ANGLE_DEG * Math.PI) / 180) < 1e-9);
  });

  test("ShouldStartTheBranchOnTheMotherFilament", () => {
    // GIVEN
    const f = filamentOf(Array(10).fill("ATP"));
    const i = anyInt(0, 9);
    // WHEN
    const branch = f.branchAt(i, -1);
    // THEN
    const p = f.subunitPosition(i);
    assert.ok(Math.abs(branch.pointedEnd().x - p.x) < 1e-9 && Math.abs(branch.pointedEnd().y - p.y) < 1e-9);
  });

  test("ShouldNotGrowOnceCapped", () => {
    // GIVEN
    const f = filamentOf(["ATP"]);
    f.cap();
    // WHEN
    const grew = f.polymerize();
    // THEN
    assert.deepEqual([grew, f.subunitCount()], [false, 1]);
  });

  test("ShouldUseTheSubunitRiseOfF-Actin", () => {
    // GIVEN / WHEN / THEN
    assert.equal(SUBUNIT_NM, 2.7);
  });

  test("ShouldUseTheArp23BranchAngle", () => {
    // GIVEN / WHEN / THEN
    assert.equal(BRANCH_ANGLE_DEG, 70);
  });

  test("ShouldNeverAgeWithZeroRates", () => {
    // GIVEN
    const f = filamentOf(["ATP", "ADP-Pi"]);
    // WHEN
    f.age(never, { hydrolysis: 0.5, release: 0.5 });
    // THEN
    assert.deepEqual(f.states(), ["ATP", "ADP-Pi"]);
  });
});
