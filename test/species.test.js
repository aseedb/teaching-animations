import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Species } from "../src/species.js";

describe("SpeciesSpecification", () => {
  test("ShouldUseFrogFilamentLengthsOfPageAndHuxley1963", () => {
    // GIVEN
    const frog = Species.frog();
    // WHEN
    const lengths = frog.filaments();
    // THEN
    assert.deepEqual(
      { thick: lengths.thick, thinFromZ: lengths.thinFromZ },
      { thick: 1.6, thinFromZ: 1.025 },
    );
  });

  test("ShouldUseFrogBareZoneThatClosesTheGordon1966Plateau", () => {
    // GIVEN
    const frog = Species.frog();
    // WHEN
    const { bareZone } = frog.filaments();
    // THEN
    assert.equal(bareZone, 0.15);
  });

  test("ShouldUseRabbitPsoasThinFilamentOfCastillo2009", () => {
    // GIVEN
    const rabbit = Species.rabbit();
    // WHEN
    const { thinFromZ, zDisc } = rabbit.filaments();
    // THEN
    assert.deepEqual({ thinFromZ, zDisc }, { thinFromZ: 1.13, zDisc: 0.066 });
  });

  test("ShouldUseMammalianThickFilamentAndBareZoneForRabbit", () => {
    // GIVEN
    const rabbit = Species.rabbit();
    // WHEN
    const { thick, bareZone } = rabbit.filaments();
    // THEN
    assert.deepEqual({ thick, bareZone }, { thick: 1.65, bareZone: 0.2 });
  });

  test("ShouldStartRabbitTitinPassiveTensionAtHerzog2018Onset", () => {
    // GIVEN
    const rabbit = Species.rabbit();
    // WHEN
    const onset = rabbit.titinOnset();
    // THEN
    assert.equal(onset, 2.65);
  });

  test("ShouldHaveNoAttestedTitinOnsetForFrog", () => {
    // GIVEN
    const frog = Species.frog();
    // WHEN
    const onset = frog.titinOnset();
    // THEN
    assert.equal(onset, null);
  });

  test("ShouldNameSpeciesInGerman", () => {
    // GIVEN
    const both = [Species.rabbit(), Species.frog()];
    // WHEN
    const names = both.map((s) => s.name());
    // THEN
    assert.deepEqual(names, ["Kaninchen (M. psoas)", "Frosch (M. semitendinosus)"]);
  });
});
