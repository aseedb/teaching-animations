import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Tour } from "../src/tour.js";
import { Scene } from "../src/scene.js";
import { MT_TOUR } from "../src/mtTour.js";

const MAX_TICKS = 20000;

function waitAt(index) {
  const scene = Scene.empty();
  const tour = Tour.start(MT_TOUR, scene);
  for (let i = 0; i < index; i++) tour.next();
  let ticks = 0;
  while (!tour.isWaiting() && ticks < MAX_TICKS) { tour.tick(); ticks++; }
  return { tour, scene, ticks };
}

const stepNamed = (title) => MT_TOUR.findIndex((s) => s.title === title);

describe("MicrotubuleTourSpecification", () => {
  MT_TOUR.forEach((step, i) => {
    test(`ShouldReachTheEventOfStep_${i + 1}_${step.title.replace(/\W+/g, "")}`, () => {
      // GIVEN / WHEN
      const { tour } = waitAt(i);
      // THEN
      assert.equal(tour.isWaiting(), true);
    });
  });

  test("ShouldStopTheCatastropheStepWhileTheMicrotubuleShrinks", () => {
    // GIVEN / WHEN
    const { scene } = waitAt(stepNamed("Katastrophe"));
    // THEN
    assert.equal(scene.microtubule().phase(), "shrinking");
  });

  test("ShouldStopTheRescueStepOnceTheMicrotubuleGrowsAgain", () => {
    // GIVEN / WHEN
    const { scene } = waitAt(stepNamed("Rettung"));
    // THEN
    assert.equal(scene.microtubule().phase(), "growing");
  });

  test("ShouldStopTheCellEdgeStepOnACatastropheAtTheEdge", () => {
    // GIVEN / WHEN
    const { scene } = waitAt(stepNamed("Am Zellrand"));
    // THEN
    assert.deepEqual([scene.microtubule().phase(), scene.note()], ["shrinking", "edge"]);
  });

  test("ShouldShowMoreCatastrophesAtLowThanAtHighTubulin", () => {
    // GIVEN / WHEN
    const low = waitAt(stepNamed("Wenig Tubulin")).scene.microtubule();
    const high = waitAt(stepNamed("Viel Tubulin")).scene.microtubule();
    // THEN
    assert.ok(low.catastrophes() / low.stepsGrowing() > high.catastrophes() / high.stepsGrowing());
  });

  test("ShouldWriteEveryStepInSwissGermanWithoutEszett", () => {
    // GIVEN / WHEN
    const flawed = MT_TOUR.filter((s) => /ß/.test(s.title + s.text) || !s.text);
    // THEN
    assert.deepEqual(flawed, []);
  });

  test("ShouldReplayAStepIdenticallyWhenGoingBackToIt", () => {
    // GIVEN
    const i = stepNamed("Katastrophe");
    const first = waitAt(i).scene.microtubule().lengthNm();
    // WHEN
    const again = waitAt(i).scene.microtubule().lengthNm();
    // THEN
    assert.equal(again, first);
  });
});
