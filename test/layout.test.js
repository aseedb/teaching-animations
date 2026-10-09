import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Species } from "../src/species.js";
import { Sarcomere } from "../src/sarcomere.js";

const anyBetween = (lo, hi) => lo + Math.random() * (hi - lo);
const anySpecies = () => (Math.random() < 0.5 ? Species.rabbit() : Species.frog());
const width = ([a, b]) => b - a;

function assertClose(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

describe("SarcomereLayoutSpecification", () => {
  test("ShouldCentreTheZDiscsOnBothEndsAroundTheMLine", () => {
    // GIVEN
    const species = anySpecies();
    const length = anyBetween(1.5, 4.2);
    // WHEN
    const { zDiscs } = Sarcomere.of(species, length).layout();
    // THEN
    assert.deepEqual(zDiscs, [-length / 2, length / 2]);
  });

  test("ShouldGrowEachThinFilamentFromItsZDiscTowardsTheMLine", () => {
    // GIVEN
    const species = anySpecies();
    const length = anyBetween(1.5, 4.2);
    const { thinFromZ } = species.filaments();
    // WHEN
    const { thin } = Sarcomere.of(species, length).layout();
    // THEN
    assert.deepEqual(thin, [
      [-length / 2, -length / 2 + thinFromZ],
      [length / 2 - thinFromZ, length / 2],
    ]);
  });

  test("ShouldCentreTheThickFilamentOnTheMLine", () => {
    // GIVEN
    const species = anySpecies();
    const { thick, zDisc } = species.filaments();
    const length = anyBetween(thick + zDisc, 4.2);
    // WHEN
    const { thickFilament } = Sarcomere.of(species, length).layout();
    // THEN
    assert.deepEqual(thickFilament, [-thick / 2, thick / 2]);
  });

  test("ShouldSquashTheThickFilamentBetweenTheZDiscsWhenTheyPushOnIt", () => {
    // GIVEN
    const species = anySpecies();
    const { thick, zDisc } = species.filaments();
    const length = anyBetween(1.0, thick + zDisc);
    // WHEN
    const { thickFilament } = Sarcomere.of(species, length).layout();
    // THEN
    assertClose(width(thickFilament), length - zDisc);
  });

  test("ShouldBindHeadsOnlyWhereThinFilamentsFaceThem", () => {
    // GIVEN
    const species = anySpecies();
    const { plateauEnd, zeroForce } = Sarcomere.landmarks(species);
    const sarcomere = Sarcomere.of(species, anyBetween(plateauEnd, zeroForce));
    // WHEN
    const { boundHeads } = sarcomere.layout();
    // THEN
    const { thick, bareZone } = species.filaments();
    assertClose(width(boundHeads[1]) / ((thick - bareZone) / 2), sarcomere.activeForce());
  });

  test("ShouldBindNoHeadsWithoutOverlap", () => {
    // GIVEN
    const species = anySpecies();
    const length = anyBetween(Sarcomere.landmarks(species).zeroForce, 4.5);
    // WHEN
    const { boundHeads } = Sarcomere.of(species, length).layout();
    // THEN
    assert.deepEqual(boundHeads, []);
  });

  test("ShouldMirrorTheBoundHeadsAboutTheMLine", () => {
    // GIVEN
    const species = anySpecies();
    const { plateauStart, zeroForce } = Sarcomere.landmarks(species);
    // WHEN
    const { boundHeads } = Sarcomere.of(species, anyBetween(plateauStart, zeroForce)).layout();
    // THEN
    assertClose(boundHeads[0][0], -boundHeads[1][1]);
  });
});
