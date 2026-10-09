import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Scene } from "../src/scene.js";

const anySeed = () => Math.floor(Math.random() * 2 ** 31);
const ALL_ON = { arp23: true, capping: true, cofilin: true, latrunculin: false, phalloidin: false };

describe("ActinSceneSpecification", () => {
  test("ShouldPrepareTheNetworkAfterTheWarmUp", () => {
    // GIVEN
    const scene = Scene.empty();
    // WHEN
    scene.reset(anySeed(), 300, ALL_ON);
    // THEN
    assert.equal(scene.stepsSinceReset(), 300);
  });

  test("ShouldReplayTheSameSceneFromTheSameSeed", () => {
    // GIVEN
    const seed = anySeed();
    const a = Scene.empty();
    const b = Scene.empty();
    // WHEN
    a.reset(seed, 400, ALL_ON);
    b.reset(seed, 400, ALL_ON);
    // THEN
    assert.equal(a.cell().membraneX(), b.cell().membraneX());
  });

  test("ShouldMeasureHowFarTheMembraneMovedSinceTheMark", () => {
    // GIVEN
    const scene = Scene.empty();
    scene.reset(anySeed(), 300, ALL_ON);
    const start = scene.cell().membraneX();
    scene.mark();
    // WHEN
    scene.advance(100);
    // THEN
    assert.equal(scene.advanceSinceMark(), scene.cell().membraneX() - start);
  });

  test("ShouldRememberOnlyBranchesBornAfterTheMark", () => {
    // GIVEN
    const scene = Scene.empty();
    scene.reset(anySeed(), 300, ALL_ON);
    // WHEN
    scene.mark();
    // THEN
    assert.equal(scene.branchSinceMark(), null);
  });

  test("ShouldRememberTheFirstBranchBornAfterTheMark", () => {
    // GIVEN
    const scene = Scene.empty();
    scene.reset(anySeed(), 300, ALL_ON);
    scene.mark();
    // WHEN
    scene.runUntil((s) => s.branchSinceMark() !== null, 2000);
    // THEN
    assert.equal(scene.branchSinceMark().filament.isBranch(), true);
  });

  test("ShouldRememberTheFirstCappingAfterTheMark", () => {
    // GIVEN
    const scene = Scene.empty();
    scene.reset(anySeed(), 300, ALL_ON);
    scene.mark();
    // WHEN
    scene.runUntil((s) => s.capSinceMark() !== null, 2000);
    // THEN
    assert.equal(scene.capSinceMark().filament.hasCappingProtein(), true);
  });

  test("ShouldRememberTheFirstSeveringAfterTheMark", () => {
    // GIVEN
    const scene = Scene.empty();
    scene.reset(anySeed(), 300, ALL_ON);
    scene.mark();
    // WHEN
    scene.runUntil((s) => s.severSinceMark() !== null, 3000);
    // THEN
    assert.ok(Number.isFinite(scene.severSinceMark().at.x));
  });

  test("ShouldCountTheAgeOfARememberedEvent", () => {
    // GIVEN
    const scene = Scene.empty();
    scene.reset(anySeed(), 300, ALL_ON);
    scene.mark();
    scene.runUntil((s) => s.branchSinceMark() !== null, 2000);
    // WHEN
    scene.advance(12);
    // THEN
    assert.equal(scene.stepsSinceReset() - scene.branchSinceMark().step, 12);
  });
});
