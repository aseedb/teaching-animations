import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Nodes } from "../src/nodes.js";
import { Cell } from "../src/cell.js";

const anyPositive = (max = 100) => 0.1 + Math.random() * max;

function squareRing(nodes, side) {
  return [
    nodes.add(0, 0),
    nodes.add(side, 0),
    nodes.add(side, side),
    nodes.add(0, side),
  ];
}

function outwardComponent(nodes, ring) {
  const cx = ring.reduce((s, i) => s + nodes.x(i), 0) / ring.length;
  const cy = ring.reduce((s, i) => s + nodes.y(i), 0) / ring.length;
  return ring.map((i) => nodes.forceX(i) * (nodes.x(i) - cx) + nodes.forceY(i) * (nodes.y(i) - cy));
}

describe("CellSpecification", () => {
  test("ShouldPushMembraneOutwardWhenSqueezedBelowItsRestArea", () => {
    // GIVEN
    const side = anyPositive();
    const nodes = Nodes.create();
    const ring = squareRing(nodes, side);
    const cell = Cell.of(ring, side * side * 1.5, anyPositive());
    // WHEN
    cell.applyPressureTo(nodes);
    // THEN
    assert.ok(outwardComponent(nodes, ring).every((c) => c > 0));
  });

  test("ShouldExertNoPressureAtItsRestArea", () => {
    // GIVEN
    const side = anyPositive();
    const nodes = Nodes.create();
    const ring = squareRing(nodes, side);
    const cell = Cell.of(ring, side * side, anyPositive());
    // WHEN
    cell.applyPressureTo(nodes);
    // THEN
    assert.ok(ring.every((i) => nodes.forceX(i) === 0 && nodes.forceY(i) === 0));
  });

  test("ShouldLoseItsTurgorOnceRuptured", () => {
    // GIVEN
    const side = anyPositive();
    const nodes = Nodes.create();
    const ring = squareRing(nodes, side);
    const cell = Cell.of(ring, side * side * 1.5, anyPositive());
    cell.rupture();
    // WHEN
    cell.applyPressureTo(nodes);
    // THEN
    assert.ok(ring.every((i) => nodes.forceX(i) === 0 && nodes.forceY(i) === 0));
  });
});
