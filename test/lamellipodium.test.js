import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Lamellipodium, BRANCH_ZONE_NM, HALF_HEIGHT_NM } from "../src/lamellipodium.js";
import { SeededRandom } from "../src/seededRandom.js";

const anySeed = () => Math.floor(Math.random() * 2 ** 31);
const ALL_ON = { arp23: true, capping: true, cofilin: true, latrunculin: false, phalloidin: false };

function run(cell, steps) {
  for (let i = 0; i < steps; i++) cell.step();
  return cell;
}

function totalActin(cell) {
  return cell.pool() + cell.sequestered() + cell.stabilizedOutOfView() + cell.filaments().reduce((s, f) => s + f.subunitCount(), 0);
}

describe("LamellipodiumSpecification", () => {
  test("ShouldConserveTotalActinUnderPhalloidin", () => {
    // GIVEN
    const cell = Lamellipodium.create({ ...ALL_ON, phalloidin: true }, SeededRandom.of(anySeed()));
    const before = totalActin(cell);
    // WHEN
    run(cell, 1500);
    // THEN
    assert.equal(totalActin(cell), before);
  });

  test("ShouldConserveTotalActin", () => {
    // GIVEN
    const cell = Lamellipodium.create(ALL_ON, SeededRandom.of(anySeed()));
    const before = totalActin(cell);
    // WHEN
    run(cell, 400);
    // THEN
    assert.equal(totalActin(cell), before);
  });

  test("ShouldPushTheMembraneForwardByPolymerization", () => {
    // GIVEN
    const cell = Lamellipodium.create(ALL_ON, SeededRandom.of(anySeed()));
    const start = cell.membraneX();
    // WHEN
    run(cell, 400);
    // THEN
    assert.ok(cell.membraneX() > start + 50, `${cell.membraneX() - start}`);
  });

  test("ShouldNeverLetABarbedTipCrossTheMembrane", () => {
    // GIVEN
    const cell = Lamellipodium.create(ALL_ON, SeededRandom.of(anySeed()));
    // WHEN
    run(cell, 300);
    // THEN
    const beyond = cell.filaments().filter((f) => f.barbedTip().x > cell.membraneX() + 1e-9);
    assert.equal(beyond.length, 0);
  });

  test("ShouldStopProtrusionUnderLatrunculin", () => {
    // GIVEN
    const cell = run(Lamellipodium.create(ALL_ON, SeededRandom.of(anySeed())), 200);
    cell.treat({ latrunculin: true });
    const front = cell.membraneX();
    // WHEN
    run(cell, 300);
    // THEN
    assert.equal(cell.membraneX(), front);
  });

  test("ShouldSequesterTheFreeMonomersUnderLatrunculin", () => {
    // GIVEN
    const cell = run(Lamellipodium.create(ALL_ON, SeededRandom.of(anySeed())), 200);
    // WHEN
    cell.treat({ latrunculin: true });
    // THEN
    assert.equal(cell.pool(), 0);
  });

  test("ShouldDrainTheMonomerPoolUnderPhalloidin", () => {
    // GIVEN
    const cell = run(Lamellipodium.create(ALL_ON, SeededRandom.of(anySeed())), 200);
    cell.treat({ phalloidin: true });
    const pool = cell.pool();
    // WHEN
    run(cell, 5000);
    // THEN
    assert.ok(cell.pool() < pool * 0.2, `${pool} -> ${cell.pool()}`);
  });

  test("ShouldReportEveryCappingWithTheCappedFilament", () => {
    // GIVEN
    const cell = Lamellipodium.create(ALL_ON, SeededRandom.of(anySeed()));
    const capped = [];
    cell.onCap((f) => capped.push(f));
    // WHEN
    run(cell, 300);
    // THEN
    assert.ok(capped.length > 0 && capped.every((f) => f.hasCappingProtein()));
  });

  test("ShouldReportNoCappingWithoutCappingProtein", () => {
    // GIVEN
    const cell = Lamellipodium.create({ ...ALL_ON, capping: false }, SeededRandom.of(anySeed()));
    let caps = 0;
    cell.onCap(() => caps++);
    // WHEN
    run(cell, 300);
    // THEN
    assert.equal(caps, 0);
  });

  test("ShouldReportEverySeveringWhereTheCutHappened", () => {
    // GIVEN
    const cell = run(Lamellipodium.create(ALL_ON, SeededRandom.of(anySeed())), 300);
    const cuts = [];
    cell.onSever((at) => cuts.push(at));
    // WHEN
    run(cell, 600);
    // THEN
    assert.ok(cuts.length > 0 && cuts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)));
  });

  test("ShouldReportBothPiecesOfASeveredFilamentMeetingAtTheCut", () => {
    // GIVEN
    const cell = run(Lamellipodium.create(ALL_ON, SeededRandom.of(anySeed())), 300);
    const gaps = [];
    cell.onSever((at, front, rear) => gaps.push(Math.hypot(rear.barbedTip().x - front.pointedEnd().x, rear.barbedTip().y - front.pointedEnd().y)));
    // WHEN
    run(cell, 600);
    // THEN
    assert.ok(gaps.length > 0 && gaps.every((g) => g < 1e-9), `${gaps.length} cuts`);
  });

  test("ShouldReportNoSeveringWithoutCofilin", () => {
    // GIVEN
    const cell = Lamellipodium.create({ ...ALL_ON, cofilin: false }, SeededRandom.of(anySeed()));
    let cuts = 0;
    cell.onSever(() => cuts++);
    // WHEN
    run(cell, 600);
    // THEN
    assert.equal(cuts, 0);
  });

  test("ShouldBranchOnlyNearTheMembrane", () => {
    // GIVEN
    const cell = run(Lamellipodium.create(ALL_ON, SeededRandom.of(anySeed())), 50);
    // WHEN
    const born = [];
    cell.onBranch((b) => born.push({ x: b.pointedEnd().x, front: cell.membraneX() }));
    run(cell, 300);
    // THEN
    assert.ok(born.length > 0 && born.every((b) => b.x >= b.front - BRANCH_ZONE_NM - 1e-9));
  });

  test("ShouldNotBranchWithoutArp23", () => {
    // GIVEN
    const cell = Lamellipodium.create({ ...ALL_ON, arp23: false }, SeededRandom.of(anySeed()));
    let branches = 0;
    cell.onBranch(() => branches++);
    // WHEN
    run(cell, 300);
    // THEN
    assert.equal(branches, 0);
  });

  test("ShouldCapNoFilamentWithoutCappingProtein", () => {
    // GIVEN
    const cell = Lamellipodium.create({ ...ALL_ON, capping: false, cofilin: false }, SeededRandom.of(anySeed()));
    // WHEN
    run(cell, 300);
    // THEN
    assert.equal(cell.filaments().filter((f) => f.isCapped()).length, 0);
  });

  test("ShouldKeepTheFrontYoungerThanTheRear", () => {
    // GIVEN
    const cell = Lamellipodium.create(ALL_ON, SeededRandom.of(anySeed()));
    // WHEN
    run(cell, 800);
    // THEN
    const { front, rear } = cell.atpFractionByDepth();
    assert.ok(front > rear, `front ${front} rear ${rear}`);
  });

  test("ShouldKeepEveryBarbedTipInsideThePeriodicBand", () => {
    // GIVEN
    const cell = Lamellipodium.create(ALL_ON, SeededRandom.of(anySeed()));
    // WHEN
    run(cell, 600);
    // THEN
    const outside = cell.filaments().filter((f) => Math.abs(f.barbedTip().y) > HALF_HEIGHT_NM + 1e-9);
    assert.equal(outside.length, 0);
  });

  test("ShouldKeepGrowingBarbedEndsAfterAMinute", () => {
    // GIVEN
    const cell = Lamellipodium.create(ALL_ON, SeededRandom.of(anySeed()));
    // WHEN
    run(cell, 2000);
    // THEN
    assert.ok(cell.filaments().filter((f) => !f.isCapped()).length >= 5);
  });

  test("ShouldKeepTheNumberOfGrowingEndsSteady", () => {
    // GIVEN
    const cell = run(Lamellipodium.create(ALL_ON, SeededRandom.of(anySeed())), 600);
    // WHEN
    const counts = [];
    for (let w = 0; w < 30; w++) {
      run(cell, 60);
      counts.push(cell.filaments().filter((f) => !f.isCapped()).length);
    }
    // THEN
    const mean = counts.reduce((s, x) => s + x, 0) / counts.length;
    const sd = Math.sqrt(counts.reduce((s, x) => s + (x - mean) ** 2, 0) / counts.length);
    assert.ok(sd / mean < 0.25, `mean ${mean.toFixed(1)} cv ${(sd / mean).toFixed(2)}`);
  });

  test("ShouldProtrudeAtASteadySpeed", () => {
    // GIVEN
    const cell = run(Lamellipodium.create(ALL_ON, SeededRandom.of(anySeed())), 600);
    // WHEN
    const advances = [];
    for (let w = 0; w < 30; w++) {
      const before = cell.membraneX();
      run(cell, 60);
      advances.push(cell.membraneX() - before);
    }
    // THEN
    const mean = advances.reduce((s, x) => s + x, 0) / advances.length;
    const sd = Math.sqrt(advances.reduce((s, x) => s + (x - mean) ** 2, 0) / advances.length);
    assert.ok(sd / mean < 0.2, `mean ${mean.toFixed(1)} cv ${(sd / mean).toFixed(2)}`);
  });

  test("ShouldBranchWithinTwentyNanometresOfTheMembrane", () => {
    // GIVEN / WHEN / THEN
    assert.equal(BRANCH_ZONE_NM, 20);
  });
});
