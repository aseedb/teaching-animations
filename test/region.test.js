import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Species } from "../src/species.js";
import { Sarcomere } from "../src/sarcomere.js";
import { REGIONS } from "../src/region.js";

const anyBetween = (lo, hi) => lo + Math.random() * (hi - lo);
const SPECIES = [Species.rabbit(), Species.frog()];
const anySpecies = () => SPECIES[Math.floor(Math.random() * 2)];
const regionAt = (species, length) => Sarcomere.of(species, length).region();

describe("RegionSpecification", () => {
  const cases = [
    ["keineUeberlappung", (m) => [m.zeroForce, 4.5]],
    ["absteigend", (m) => [m.plateauEnd + 1e-6, m.zeroForce - 1e-6]],
    ["plateau", (m) => [m.plateauStart, m.plateauEnd]],
    ["doppelteUeberlappung", (m) => [m.thickMeetsZ, m.plateauStart - 1e-6]],
    ["myosinStoesstAnZ", (m) => [1.0, m.thickMeetsZ - 1e-6]],
  ];
  for (const [expected, range] of cases) {
    test(`ShouldClassifyAs_${expected}`, () => {
      // GIVEN
      const species = anySpecies();
      const [lo, hi] = range(Sarcomere.landmarks(species));
      // WHEN
      const region = regionAt(species, anyBetween(lo, hi));
      // THEN
      assert.equal(region, expected);
    });
  }

  test("ShouldBelongToThePlateauExactlyAtItsEnd", () => {
    // GIVEN
    const species = anySpecies();
    // WHEN
    const region = regionAt(species, Sarcomere.landmarks(species).plateauEnd);
    // THEN
    assert.equal(region, "plateau");
  });

  test("ShouldLeaveOverlapExactlyAtTheZeroForceLength", () => {
    // GIVEN
    const species = anySpecies();
    // WHEN
    const region = regionAt(species, Sarcomere.landmarks(species).zeroForce);
    // THEN
    assert.equal(region, "keineUeberlappung");
  });
});
