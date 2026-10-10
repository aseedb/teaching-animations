import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Tour } from "../src/tour.js";
import { Scene } from "../src/scene.js";
import { MT_TOUR } from "../src/mtTour.js";
import { STRINGS } from "../src/strings.js";

const MAX_TICKS = 20000;

function waitAt(index) {
  const scene = Scene.empty();
  const tour = Tour.start(MT_TOUR, scene);
  for (let i = 0; i < index; i++) tour.next();
  let ticks = 0;
  while (!tour.isWaiting() && ticks < MAX_TICKS) { tour.tick(); ticks++; }
  return { tour, scene, ticks };
}

const stepWithId = (id) => {
  const i = MT_TOUR.findIndex((s) => s.id === id);
  assert.ok(i >= 0, id);
  return i;
};
const labelsOf = (highlights) => highlights.map((h) => h.label).filter(Boolean);

describe("MicrotubuleTourSpecification", () => {
  MT_TOUR.forEach((step, i) => {
    test(`ShouldReachTheEventOfStep_${i + 1}_${step.id}`, () => {
      // GIVEN / WHEN
      const { tour } = waitAt(i);
      // THEN
      assert.equal(tour.isWaiting(), true);
    });
  });

  test("ShouldStopTheCatastropheStepWhileTheMicrotubuleShrinks", () => {
    // GIVEN / WHEN
    const { scene } = waitAt(stepWithId("catastrophe"));
    // THEN
    assert.equal(scene.microtubule().phase(), "shrinking");
  });

  test("ShouldStopTheRescueStepOnceTheMicrotubuleGrowsAgain", () => {
    // GIVEN / WHEN
    const { scene } = waitAt(stepWithId("rescue"));
    // THEN
    assert.equal(scene.microtubule().phase(), "growing");
  });

  test("ShouldStopTheCellEdgeStepOnACatastropheAtTheEdge", () => {
    // GIVEN / WHEN
    const { scene } = waitAt(stepWithId("edge"));
    // THEN
    assert.deepEqual([scene.microtubule().phase(), scene.note()], ["shrinking", "edge"]);
  });

  test("ShouldShowMoreCatastrophesAtLowThanAtHighTubulin", () => {
    // GIVEN / WHEN
    const low = waitAt(stepWithId("low")).scene.microtubule();
    const high = waitAt(stepWithId("high")).scene.microtubule();
    // THEN
    assert.ok(low.catastrophes() / low.stepsGrowing() > high.catastrophes() / high.stepsGrowing());
  });

  test("ShouldFindEveryTourTextInTheDictionary", () => {
    // GIVEN
    const keysOf = (step, scene) => [step.title, step.text, ...labelsOf(step.highlights(scene))];
    // WHEN
    const missing = MT_TOUR.flatMap((step, i) => keysOf(step, waitAt(i).scene)).filter((key) => !STRINGS.de[key]);
    // THEN
    assert.deepEqual([...new Set(missing)], []);
  });


  test("ShouldReplayAStepIdenticallyWhenGoingBackToIt", () => {
    // GIVEN
    const i = stepWithId("catastrophe");
    const first = waitAt(i).scene.microtubule().lengthNm();
    // WHEN
    const again = waitAt(i).scene.microtubule().lengthNm();
    // THEN
    assert.equal(again, first);
  });
});
