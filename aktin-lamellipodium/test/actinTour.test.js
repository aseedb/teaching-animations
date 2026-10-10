import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Tour } from "../src/tour.js";
import { Scene } from "../src/scene.js";
import { ACTIN_TOUR } from "../src/actinTour.js";
import { STRINGS } from "../src/strings.js";

const MAX_TICKS = 20000;

function enter(index) {
  const scene = Scene.empty();
  const tour = Tour.start(ACTIN_TOUR, scene);
  for (let i = 0; i < index; i++) tour.next();
  return { tour, scene };
}

function waitAt(index) {
  const { tour, scene } = enter(index);
  let ticks = 0;
  while (!tour.isWaiting() && ticks < MAX_TICKS) { tour.tick(); ticks++; }
  return { tour, scene };
}

const stepWithId = (id) => {
  const i = ACTIN_TOUR.findIndex((s) => s.id === id);
  assert.ok(i >= 0, id);
  return i;
};
// the labels of a step's highlights, lens notes included
const labelsOf = (highlights) => highlights.flatMap((h) => [h.label, ...labelsOf(h.notes ?? [])]).filter(Boolean);
const growingEnds = (scene) => scene.cell().filaments().filter((f) => !f.isCapped()).length;

describe("ActinTourSpecification", () => {
  ACTIN_TOUR.forEach((step, i) => {
    test(`ShouldReachTheEventOfStep_${i + 1}_${step.id}`, () => {
      // GIVEN / WHEN
      const { tour } = waitAt(i);
      // THEN
      assert.equal(tour.isWaiting(), true);
    });
  });

  test("ShouldPushTheMembraneDuringThePolymerizationStep", () => {
    // GIVEN / WHEN
    const { scene } = waitAt(stepWithId("push"));
    // THEN
    assert.ok(scene.advanceSinceMark() > 0);
  });

  test("ShouldStopOnANewBranchInTheArp23Step", () => {
    // GIVEN / WHEN
    const { scene } = waitAt(stepWithId("arp23"));
    // THEN
    assert.equal(scene.branchSinceMark()?.filament.isBranch(), true);
  });

  test("ShouldStopOnACappedEndInTheCappingStep", () => {
    // GIVEN / WHEN
    const { scene } = waitAt(stepWithId("capping"));
    // THEN
    assert.equal(scene.capSinceMark()?.filament.hasCappingProtein(), true);
  });

  test("ShouldStopOnACutInTheCofilinStep", () => {
    // GIVEN / WHEN
    const { scene } = waitAt(stepWithId("cofilin"));
    // THEN
    assert.ok(scene.severSinceMark() !== null);
  });

  test("ShouldLoseGrowingEndsWithoutArp23", () => {
    // GIVEN
    const without = waitAt(stepWithId("noArp23")).scene;
    // WHEN
    const normal = Scene.empty();
    normal.reset(11, 600 + without.sinceMark(), { arp23: true, capping: true, cofilin: true, latrunculin: false, phalloidin: false });
    // THEN
    assert.ok(growingEnds(without) < growingEnds(normal) / 2, `${growingEnds(without)} vs ${growingEnds(normal)}`);
  });

  test("ShouldSwitchArp23OffOnTheGrownNetwork", () => {
    // GIVEN
    const grown = Scene.empty();
    grown.reset(11, 600, { arp23: true, capping: true, cofilin: true, latrunculin: false, phalloidin: false });
    // WHEN
    const { scene } = enter(stepWithId("noArp23"));
    // THEN
    assert.deepEqual([scene.cell().membraneX(), scene.cell().treatment().arp23], [grown.cell().membraneX(), false]);
  });

  test("ShouldWaitUntilNoPlusEndGrowsWithoutArp23", () => {
    // GIVEN / WHEN
    const { scene } = waitAt(stepWithId("noArp23"));
    // THEN
    assert.equal(scene.growingEnds(), 0);
  });

  test("ShouldLabelTheFrontDifferentlyOnceNoPlusEndGrows", () => {
    // GIVEN
    const step = stepWithId("noArp23");
    const atStart = enter(step).tour.highlights()[0].label;
    // WHEN
    const atEnd = waitAt(step).tour.highlights()[0].label;
    // THEN
    assert.notEqual(atStart, atEnd);
  });

  test("ShouldFindEveryTourTextInTheDictionary", () => {
    // GIVEN
    const keysOf = (step, scene) => [step.title, step.text, ...labelsOf(step.highlights(scene))];
    // WHEN
    const missing = ACTIN_TOUR.flatMap((step, i) => [...keysOf(step, enter(i).scene), ...keysOf(step, waitAt(i).scene)]).filter((key) => !STRINGS.de[key]);
    // THEN
    assert.deepEqual([...new Set(missing)], []);
  });

});
