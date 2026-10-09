import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Tour } from "../src/tour.js";
import { Scene } from "../src/scene.js";
import { ACTIN_TOUR } from "../src/actinTour.js";

const MAX_TICKS = 20000;

function waitAt(index) {
  const scene = Scene.empty();
  const tour = Tour.start(ACTIN_TOUR, scene);
  for (let i = 0; i < index; i++) tour.next();
  let ticks = 0;
  while (!tour.isWaiting() && ticks < MAX_TICKS) { tour.tick(); ticks++; }
  return { tour, scene };
}

const stepNamed = (title) => {
  const i = ACTIN_TOUR.findIndex((s) => s.title === title);
  assert.ok(i >= 0, title);
  return i;
};
const growingEnds = (scene) => scene.cell().filaments().filter((f) => !f.isCapped()).length;

describe("ActinTourSpecification", () => {
  ACTIN_TOUR.forEach((step, i) => {
    test(`ShouldReachTheEventOfStep_${i + 1}_${step.title.replace(/\W+/g, "")}`, () => {
      // GIVEN / WHEN
      const { tour } = waitAt(i);
      // THEN
      assert.equal(tour.isWaiting(), true);
    });
  });

  test("ShouldPushTheMembraneDuringThePolymerizationStep", () => {
    // GIVEN / WHEN
    const { scene } = waitAt(stepNamed("Polymerisation schiebt die Membran"));
    // THEN
    assert.ok(scene.advanceSinceMark() > 0);
  });

  test("ShouldStopOnANewBranchInTheArp23Step", () => {
    // GIVEN / WHEN
    const { scene } = waitAt(stepNamed("Arp2/3: ein neues Plus-Ende"));
    // THEN
    assert.equal(scene.branchSinceMark()?.filament.isBranch(), true);
  });

  test("ShouldStopOnACappedEndInTheCappingStep", () => {
    // GIVEN / WHEN
    const { scene } = waitAt(stepNamed("Capping-Protein"));
    // THEN
    assert.equal(scene.capSinceMark()?.filament.hasCappingProtein(), true);
  });

  test("ShouldStopOnACutInTheCofilinStep", () => {
    // GIVEN / WHEN
    const { scene } = waitAt(stepNamed("Cofilin"));
    // THEN
    assert.ok(scene.severSinceMark() !== null);
  });

  test("ShouldLoseGrowingEndsWithoutArp23", () => {
    // GIVEN
    const without = waitAt(stepNamed("Ohne Arp2/3")).scene;
    // WHEN
    const normal = Scene.empty();
    normal.reset(11, 600 + without.sinceMark(), { arp23: true, capping: true, cofilin: true, latrunculin: false, phalloidin: false });
    // THEN
    assert.ok(growingEnds(without) < growingEnds(normal) / 2, `${growingEnds(without)} vs ${growingEnds(normal)}`);
  });

  test("ShouldWriteEveryStepInSwissGermanWithoutEszett", () => {
    // GIVEN / WHEN
    const flawed = ACTIN_TOUR.filter((s) => /ß/.test(s.title + s.text) || !s.text);
    // THEN
    assert.deepEqual(flawed, []);
  });
});
