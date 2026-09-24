import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { SeededRandom } from "../src/seededRandom.js";

const anySeed = () => Math.floor(Math.random() * 1e9);
const draw = (random, n) => Array.from({ length: n }, () => random.symmetric());

describe("SeededRandomSpecification", () => {
  test("ShouldRepeatTheSameSequenceForTheSameSeed", () => {
    // GIVEN
    const seed = anySeed();
    // WHEN
    const first = draw(SeededRandom.of(seed), 20);
    const second = draw(SeededRandom.of(seed), 20);
    // THEN
    assert.deepEqual(first, second);
  });

  test("ShouldDrawSymmetricValuesBetweenMinusOneAndOne", () => {
    // GIVEN
    const random = SeededRandom.of(anySeed());
    // WHEN
    const values = draw(random, 1000);
    // THEN
    assert.ok(values.every((v) => v >= -1 && v < 1));
    assert.ok(values.some((v) => v < 0) && values.some((v) => v > 0));
  });
});
