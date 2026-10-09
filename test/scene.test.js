import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Scene, HISTORY_STEPS } from "../src/scene.js";

const anySeed = () => Math.floor(Math.random() * 2 ** 31);

describe("SceneSpecification", () => {
  test("ShouldPrepareTheMicrotubuleAfterTheWarmUp", () => {
    // GIVEN
    const scene = Scene.empty();
    // WHEN
    scene.reset(anySeed(), 10, 300);
    // THEN
    assert.deepEqual([scene.stepsSinceReset(), scene.microtubule().tubulin()], [300, 10]);
  });

  test("ShouldReplayTheSameSceneFromTheSameSeed", () => {
    // GIVEN
    const seed = anySeed();
    const a = Scene.empty();
    const b = Scene.empty();
    // WHEN
    a.reset(seed, 10, 800);
    b.reset(seed, 10, 800);
    // THEN
    assert.equal(a.microtubule().lengthNm(), b.microtubule().lengthNm());
  });

  test("ShouldKeepABoundedLengthHistory", () => {
    // GIVEN
    const scene = Scene.empty();
    scene.reset(anySeed(), 10, 0);
    // WHEN
    scene.advance(HISTORY_STEPS + 50);
    // THEN
    assert.equal(scene.history().length, HISTORY_STEPS);
  });

  test("ShouldCountStepsSinceAMark", () => {
    // GIVEN
    const scene = Scene.empty();
    scene.reset(anySeed(), 10, 100);
    scene.mark();
    // WHEN
    scene.advance(37);
    // THEN
    assert.equal(scene.sinceMark(), 37);
  });

  test("ShouldRememberWhenTheLastCatastropheHappened", () => {
    // GIVEN
    const scene = Scene.empty();
    scene.reset(anySeed(), 8, 0);
    // WHEN
    scene.runUntil((s) => s.microtubule().phase() === "shrinking", 20000);
    // THEN
    assert.equal(scene.stepsSinceCatastrophe(), 0);
  });

  test("ShouldNameACatastropheAtTheCellEdge", () => {
    // GIVEN
    const scene = Scene.empty();
    scene.reset(anySeed(), 20, 0);
    // WHEN
    scene.runUntil((s) => s.microtubule().phase() === "shrinking", 20000);
    // THEN
    assert.equal(scene.note(), scene.atEdge() ? "edge" : "shrinking");
  });

  test("ShouldNameARescue", () => {
    // GIVEN
    const scene = Scene.empty();
    scene.reset(anySeed(), 10, 0);
    // WHEN
    let rescued = false;
    scene.runUntil((s) => (rescued = s.microtubule().rescues() > 0), 60000);
    // THEN
    assert.ok(!rescued || scene.note() === "rescue");
  });
});
