import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { STRINGS } from "../src/strings.js";
import { gaps } from "../src/i18n.js";

describe("PageTextsSpecification", () => {
  test("ShouldTranslateEveryTextIntoFrenchAndEnglish", () => {
    // GIVEN / WHEN
    const missing = gaps(STRINGS);
    // THEN
    assert.deepEqual(missing, []);
  });

  test("ShouldWriteGermanInSwissSpellingWithoutEszett", () => {
    // GIVEN / WHEN
    const flawed = Object.entries(STRINGS.de).filter(([, text]) => text.includes("ß")).map(([key]) => key);
    // THEN
    assert.deepEqual(flawed, []);
  });
});
