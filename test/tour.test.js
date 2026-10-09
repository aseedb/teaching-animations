import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Tour } from "../src/tour.js";

// a stand-in simulation: a counter that the steps prepare and advance
function counterSim() {
  return { value: 0, resets: 0, reset(v = 0) { this.value = v; this.resets += 1; }, advance(n) { this.value += n; } };
}

const anyInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

function twoSteps(target) {
  return [
    { title: "A", text: "a", setup: (s) => s.reset(0), speed: 1, until: (s) => s.value >= target, highlights: () => [{ type: "ring", target: "x" }] },
    { title: "B", text: "b", setup: (s) => s.reset(100), speed: 2, until: () => true, highlights: () => [] },
  ];
}

describe("TourSpecification", () => {
  test("ShouldOpenOnTheFirstStepWithItsSceneSetUp", () => {
    // GIVEN
    const sim = counterSim();
    // WHEN
    const tour = Tour.start(twoSteps(5), sim);
    // THEN
    assert.deepEqual([tour.index(), tour.step().title, sim.resets], [0, "A", 1]);
  });

  test("ShouldRunTheStepUntilItsEventThenWait", () => {
    // GIVEN
    const target = anyInt(3, 20);
    const sim = counterSim();
    const tour = Tour.start(twoSteps(target), sim);
    // WHEN
    for (let i = 0; i < target + 10; i++) tour.tick();
    // THEN
    assert.deepEqual([sim.value, tour.isWaiting()], [target, true]);
  });

  test("ShouldNotBeWaitingBeforeTheEvent", () => {
    // GIVEN
    const sim = counterSim();
    const tour = Tour.start(twoSteps(10), sim);
    // WHEN
    tour.tick();
    // THEN
    assert.equal(tour.isWaiting(), false);
  });

  test("ShouldAdvanceSlowerThanOneStepPerTickWhenTheSpeedIsFractional", () => {
    // GIVEN
    const sim = counterSim();
    const steps = [{ title: "slow", text: "", setup: (s) => s.reset(0), speed: 0.25, until: () => false, highlights: () => [] }];
    const tour = Tour.start(steps, sim);
    // WHEN
    for (let i = 0; i < 8; i++) tour.tick();
    // THEN
    assert.equal(sim.value, 2);
  });

  test("ShouldMoveToTheNextStepAndSetItUp", () => {
    // GIVEN
    const sim = counterSim();
    const tour = Tour.start(twoSteps(5), sim);
    // WHEN
    tour.next();
    // THEN
    assert.deepEqual([tour.index(), sim.value], [1, 100]);
  });

  test("ShouldGoBackToThePreviousStepAndSetItUpAgain", () => {
    // GIVEN
    const sim = counterSim();
    const tour = Tour.start(twoSteps(5), sim);
    tour.next();
    // WHEN
    tour.back();
    // THEN
    assert.deepEqual([tour.index(), sim.value], [0, 0]);
  });

  test("ShouldStayOnTheFirstStepWhenGoingBackFromIt", () => {
    // GIVEN
    const sim = counterSim();
    const tour = Tour.start(twoSteps(5), sim);
    // WHEN
    tour.back();
    // THEN
    assert.equal(tour.index(), 0);
  });

  test("ShouldEndAfterTheLastStep", () => {
    // GIVEN
    const sim = counterSim();
    const tour = Tour.start(twoSteps(5), sim);
    tour.next();
    // WHEN
    tour.next();
    // THEN
    assert.equal(tour.isOver(), true);
  });

  test("ShouldShowTheHighlightsOfTheCurrentStep", () => {
    // GIVEN
    const sim = counterSim();
    const tour = Tour.start(twoSteps(5), sim);
    // WHEN
    const shown = tour.highlights();
    // THEN
    assert.deepEqual(shown, [{ type: "ring", target: "x" }]);
  });

  test("ShouldNumberTheSteps", () => {
    // GIVEN
    const sim = counterSim();
    const tour = Tour.start(twoSteps(5), sim);
    // WHEN
    const label = tour.progress();
    // THEN
    assert.equal(label, "1 / 2");
  });
});
