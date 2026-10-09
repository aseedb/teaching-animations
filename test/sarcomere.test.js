import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Species } from "../src/species.js";
import { Sarcomere } from "../src/sarcomere.js";

const anyBetween = (lo, hi) => lo + Math.random() * (hi - lo);
const anySpecies = () => (Math.random() < 0.5 ? Species.rabbit() : Species.frog());

function assertClose(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

describe("SarcomereBandsSpecification", () => {
  test("ShouldKeepTheABandEqualToTheThickFilamentAtAnyLength", () => {
    // GIVEN
    const species = anySpecies();
    const length = anyBetween(species.filaments().thick, 4.2);
    // WHEN
    const { aBand } = Sarcomere.of(species, length).bands();
    // THEN
    assert.equal(aBand, species.filaments().thick);
  });

  test("ShouldMakeTheIBandWhatTheThickFilamentLeavesOfTheSarcomere", () => {
    // GIVEN
    const species = anySpecies();
    const { thick } = species.filaments();
    const length = anyBetween(thick, 4.2);
    // WHEN
    const { iBand } = Sarcomere.of(species, length).bands();
    // THEN
    assertClose(iBand, length - thick);
  });

  test("ShouldCloseTheIBandWhenTheThickFilamentReachesTheZDiscs", () => {
    // GIVEN
    const species = anySpecies();
    const length = anyBetween(1.2, species.filaments().thick);
    // WHEN
    const { iBand } = Sarcomere.of(species, length).bands();
    // THEN
    assert.equal(iBand, 0);
  });

  test("ShouldMakeTheHZoneTheGapBetweenTheThinFilamentTips", () => {
    // GIVEN
    const species = anySpecies();
    const { thick, thinFromZ } = species.filaments();
    const length = anyBetween(2 * thinFromZ, 2 * thinFromZ + thick);
    // WHEN
    const { hZone } = Sarcomere.of(species, length).bands();
    // THEN
    assertClose(hZone, length - 2 * thinFromZ);
  });

  test("ShouldLimitTheHZoneToTheABandWhenFilamentsNoLongerOverlap", () => {
    // GIVEN
    const species = anySpecies();
    const { thick, thinFromZ } = species.filaments();
    const length = anyBetween(2 * thinFromZ + thick, 4.5);
    // WHEN
    const { hZone } = Sarcomere.of(species, length).bands();
    // THEN
    assert.equal(hZone, thick);
  });

  test("ShouldCloseTheHZoneOnceTheThinFilamentTipsMeet", () => {
    // GIVEN
    const species = anySpecies();
    const length = anyBetween(1.2, 2 * species.filaments().thinFromZ);
    // WHEN
    const { hZone } = Sarcomere.of(species, length).bands();
    // THEN
    assert.equal(hZone, 0);
  });
});
