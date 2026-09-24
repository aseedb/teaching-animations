import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { filamentPath, FILAMENT_WAVELENGTH } from "../src/filamentShape.js";

const anyCoordinate = () => (Math.random() - 0.5) * 200;
const anySpan = () => 8 + Math.random() * 40;
const anySlackStrain = () => -(0.02 + Math.random() * 0.15);

function randomSegment(span) {
  const x1 = anyCoordinate();
  const y1 = anyCoordinate();
  const angle = Math.random() * 2 * Math.PI;
  return [x1, y1, x1 + span * Math.cos(angle), y1 + span * Math.sin(angle)];
}

function pathLength(points) {
  let total = 0;
  for (let k = 1; k < points.length; k++) total += Math.hypot(points[k][0] - points[k - 1][0], points[k][1] - points[k - 1][1]);
  return total;
}

describe("FilamentShapeSpecification", () => {
  test("ShouldRunStraightBetweenItsAnchorsWhenTaut", () => {
    // GIVEN
    const [x1, y1, x2, y2] = randomSegment(anySpan());
    const strain = Math.random() * 0.3;
    // WHEN
    const points = filamentPath(x1, y1, x2, y2, strain);
    // THEN
    assert.deepEqual(points, [[x1, y1], [x2, y2]]);
  });

  test("ShouldStartAndEndOnItsAnchorsWhenSlack", () => {
    // GIVEN
    const [x1, y1, x2, y2] = randomSegment(anySpan());
    // WHEN
    const points = filamentPath(x1, y1, x2, y2, anySlackStrain());
    // THEN
    const [first, last] = [points[0], points[points.length - 1]];
    assert.ok(Math.hypot(first[0] - x1, first[1] - y1) < 1e-9 && Math.hypot(last[0] - x2, last[1] - y2) < 1e-9);
  });

  test("ShouldUndulateAlongItsFullContourLengthWhenSlack", () => {
    // GIVEN
    const span = anySpan();
    const [x1, y1, x2, y2] = randomSegment(span);
    const strain = anySlackStrain();
    // WHEN
    const points = filamentPath(x1, y1, x2, y2, strain);
    // THEN (span = contour * (1 + strain))
    const contour = span / (1 + strain);
    assert.ok(Math.abs(pathLength(points) / contour - 1) < 0.03, `${pathLength(points)} vs ${contour}`);
  });

  test("ShouldDefineFILAMENT_WAVELENGTHAs7", () => {
    // GIVEN the shape module, WHEN reading the constant, THEN
    assert.equal(FILAMENT_WAVELENGTH, 7);
  });
});
