import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Microtubule, PROTOFILAMENTS, SEED_DIMERS, CELL_EDGE_DIMERS } from "../src/microtubule.js";
import { SeededRandom } from "../src/seededRandom.js";

const anySeed = () => Math.floor(Math.random() * 2 ** 31);
const anyBetween = (lo, hi) => lo + Math.random() * (hi - lo);
const always = { chance: () => true, symmetric: () => 0 };
const never = { chance: () => false, symmetric: () => 0 };

function run(mt, steps) {
  for (let i = 0; i < steps; i++) mt.step();
  return mt;
}

function uniform(states) {
  return Array.from({ length: PROTOFILAMENTS }, () => [...states]);
}

describe("MicrotubuleSpecification", () => {
  test("ShouldStartGrowing", () => {
    // GIVEN / WHEN
    const mt = Microtubule.create(10, SeededRandom.of(anySeed()));
    // THEN
    assert.equal(mt.phase(), "growing");
  });

  test("ShouldGrowFromItsSeedAtFirst", () => {
    // GIVEN
    const mt = Microtubule.create(10, SeededRandom.of(anySeed()));
    const start = mt.lengthNm();
    // WHEN
    run(mt, 100);
    // THEN
    assert.ok(mt.lengthNm() > start);
  });

  test("ShouldFallIntoCatastropheWhenTheGTPCapIsLost", () => {
    // GIVEN
    const mt = Microtubule.fromProtofilaments(uniform(Array(40).fill("GDP")), "growing", 10, never);
    // WHEN
    mt.step();
    // THEN
    assert.equal(mt.phase(), "shrinking");
  });

  test("ShouldKeepGrowingWhileTheGTPCapHolds", () => {
    // GIVEN
    const mt = Microtubule.fromProtofilaments(uniform([...Array(40).fill("GDP"), "GTP", "GTP"]), "growing", 10, never);
    // WHEN
    mt.step();
    // THEN
    assert.equal(mt.phase(), "growing");
  });

  test("ShouldBeRescuedWhenShrinkingReachesAGTPIsland", () => {
    // GIVEN
    const island = [...Array(30).fill("GDP"), "GTP", ...Array(SEED_DIMERS).fill("GDP")];
    const lattice = uniform([...Array(SEED_DIMERS).fill("GDP"), ...island.slice(0, 31)]);
    const mt = Microtubule.fromProtofilaments(lattice, "shrinking", 10, never);
    // WHEN
    mt.step();
    // THEN
    assert.equal(mt.phase(), "growing");
  });

  test("ShouldBeRescuedAtTheStableSeed", () => {
    // GIVEN
    const mt = Microtubule.fromProtofilaments(uniform(Array(SEED_DIMERS + 1).fill("GDP")), "shrinking", 10, always);
    // WHEN
    run(mt, 3);
    // THEN
    assert.ok(mt.phase() === "growing" && mt.lengthNm() >= SEED_DIMERS * 8);
  });

  test("ShouldNeverShrinkBelowTheSeed", () => {
    // GIVEN
    const mt = Microtubule.create(anyBetween(3, 15), SeededRandom.of(anySeed()));
    // WHEN
    let shortest = Infinity;
    for (let i = 0; i < 3000; i++) { mt.step(); shortest = Math.min(shortest, mt.lengthNm()); }
    // THEN
    assert.ok(shortest >= SEED_DIMERS * 8);
  });

  test("ShouldShrinkFasterThanItGrows", () => {
    // GIVEN
    const mt = Microtubule.create(10, SeededRandom.of(anySeed()));
    // WHEN
    let grow = [0, 0], shrink = [0, 0], last = mt.lengthNm();
    for (let i = 0; i < 6000; i++) {
      mt.step();
      const d = mt.lengthNm() - last;
      last = mt.lengthNm();
      const bucket = mt.phase() === "growing" ? grow : shrink;
      bucket[0] += d; bucket[1] += 1;
    }
    // THEN
    assert.ok(-shrink[0] / shrink[1] > (2 * grow[0]) / grow[1], `grow ${grow[0] / grow[1]} shrink ${shrink[0] / shrink[1]}`);
  });

  test("ShouldSwitchBetweenGrowthAndShrinkage", () => {
    // GIVEN
    const mt = Microtubule.create(10, SeededRandom.of(anySeed()));
    // WHEN
    run(mt, 8000);
    // THEN
    assert.ok(mt.catastrophes() >= 2 && mt.rescues() >= 2, `${mt.catastrophes()} / ${mt.rescues()}`);
  });

  test("ShouldSufferFewerCatastrophesAtHigherTubulinConcentration", () => {
    // GIVEN
    const seed = anySeed();
    const low = Microtubule.create(6, SeededRandom.of(seed));
    const high = Microtubule.create(16, SeededRandom.of(seed));
    // WHEN
    [low, high].forEach((mt) => run(mt, 8000));
    // THEN
    const perGrowth = (mt) => mt.catastrophes() / mt.stepsGrowing();
    assert.ok(perGrowth(high) < perGrowth(low), `${perGrowth(low)} vs ${perGrowth(high)}`);
  });

  test("ShouldBuildALongerGTPCapAtHigherTubulinConcentration", () => {
    // GIVEN
    const seed = anySeed();
    const low = Microtubule.fromProtofilaments(uniform(Array(SEED_DIMERS).fill("GDP")), "growing", 6, SeededRandom.of(seed));
    const high = Microtubule.fromProtofilaments(uniform(Array(SEED_DIMERS).fill("GDP")), "growing", 16, SeededRandom.of(seed));
    // WHEN
    const mean = (mt) => { let s = 0; for (let i = 0; i < 300; i++) { mt.step(); s += mt.meanCapDimers(); } return s / 300; };
    // THEN
    assert.ok(mean(high) > mean(low));
  });

  test("ShouldNeverGrowThroughTheCellEdge", () => {
    // GIVEN
    const mt = Microtubule.create(20, SeededRandom.of(anySeed()));
    // WHEN
    let longest = 0;
    for (let i = 0; i < 8000; i++) { mt.step(); longest = Math.max(longest, ...mt.protofilaments().map((p) => p.length)); }
    // THEN
    assert.ok(longest <= CELL_EDGE_DIMERS, `${longest}`);
  });

  test("ShouldFallIntoCatastropheAtTheCellEdge", () => {
    // GIVEN
    const mt = Microtubule.create(20, SeededRandom.of(anySeed()));
    // WHEN
    run(mt, 8000);
    // THEN
    assert.ok(mt.catastrophes() >= 1);
  });

  test("ShouldHaveThirteenProtofilaments", () => {
    // GIVEN / WHEN / THEN
    assert.equal(PROTOFILAMENTS, 13);
  });
});
