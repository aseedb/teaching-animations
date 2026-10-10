import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Nodes } from "../src/nodes.js";

const anyCoordinate = () => (Math.random() - 0.5) * 200;

describe("NodesSpecification", () => {
  test("ShouldDisplaceANodeByTheGivenAmount", () => {
    // GIVEN
    const nodes = Nodes.create();
    const x = anyCoordinate();
    const y = anyCoordinate();
    const i = nodes.add(x, y);
    const dx = anyCoordinate();
    const dy = anyCoordinate();
    // WHEN
    nodes.move(i, dx, dy);
    // THEN
    assert.deepEqual([nodes.x(i), nodes.y(i)], [x + dx, y + dy]);
  });

  test("ShouldForgetAccumulatedForcesWhenCleared", () => {
    // GIVEN
    const nodes = Nodes.create();
    const i = nodes.add(anyCoordinate(), anyCoordinate());
    nodes.addForce(i, anyCoordinate(), anyCoordinate());
    // WHEN
    nodes.clearForces();
    // THEN
    assert.deepEqual([nodes.forceX(i), nodes.forceY(i)], [0, 0]);
  });

  test("ShouldCountAddedNodes", () => {
    // GIVEN
    const nodes = Nodes.create();
    const n = 1 + Math.floor(Math.random() * 10);
    // WHEN
    for (let k = 0; k < n; k++) nodes.add(anyCoordinate(), anyCoordinate());
    // THEN
    assert.equal(nodes.count(), n);
  });
});
