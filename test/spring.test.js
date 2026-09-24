import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Nodes } from "../src/nodes.js";
import { Spring } from "../src/spring.js";
import { LinearLaw } from "../src/springLaw.js";

const anyPositive = (max = 100) => 0.1 + Math.random() * max;
const anyKind = () => ["membrane", "desmosome", "filament"][Math.floor(Math.random() * 3)];

function horizontalPair(restLength, strain) {
  const nodes = Nodes.create();
  const a = nodes.add(0, 0);
  const b = nodes.add(restLength * (1 + strain), 0);
  return { nodes, a, b };
}

function assertClose(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} vs ${expected}`);
}

describe("SpringSpecification", () => {
  test("ShouldPullStretchedEndpointsTogetherWithTheTensionOfItsLaw", () => {
    // GIVEN
    const restLength = anyPositive();
    const strain = 0.01 + Math.random() * 0.3;
    const stiffness = anyPositive();
    const { nodes, a, b } = horizontalPair(restLength, strain);
    const spring = Spring.between(a, b, restLength, LinearLaw.of(stiffness), 10, anyKind());
    // WHEN
    spring.applyTo(nodes);
    // THEN
    assertClose(nodes.forceX(a), stiffness * strain, "force on a");
    assertClose(nodes.forceX(b), -stiffness * strain, "force on b");
  });

  test("ShouldStayIntactWhenStrainEqualsBreakStrain", () => {
    // GIVEN
    const breakStrain = 0.1 + Math.random() * 0.5;
    const { nodes, a, b } = horizontalPair(1, breakStrain);
    const spring = Spring.between(a, b, 1, LinearLaw.of(anyPositive()), breakStrain, anyKind());
    // WHEN
    spring.applyTo(nodes);
    // THEN
    assert.equal(spring.isBroken(), false);
  });

  test("ShouldBreakWhenStrainExceedsBreakStrain", () => {
    // GIVEN
    const breakStrain = 0.1 + Math.random() * 0.5;
    const { nodes, a, b } = horizontalPair(1, breakStrain + 1e-6);
    const spring = Spring.between(a, b, 1, LinearLaw.of(anyPositive()), breakStrain, anyKind());
    // WHEN
    spring.applyTo(nodes);
    // THEN
    assert.equal(spring.isBroken(), true);
  });

  test("ShouldStayBrokenAndTransmitNoForceWhenStrainReturnsBelowThreshold", () => {
    // GIVEN
    const breakStrain = 0.1 + Math.random() * 0.5;
    const overstretched = horizontalPair(1, breakStrain * 2);
    const spring = Spring.between(0, 1, 1, LinearLaw.of(anyPositive()), breakStrain, anyKind());
    spring.applyTo(overstretched.nodes);
    const relaxed = horizontalPair(1, breakStrain / 2);
    // WHEN
    spring.applyTo(relaxed.nodes);
    // THEN
    assert.equal(spring.isBroken(), true);
    assert.equal(relaxed.nodes.forceX(relaxed.a), 0);
  });

  test("ShouldReportItsKind", () => {
    // GIVEN
    const kind = anyKind();
    const spring = Spring.between(0, 1, 1, LinearLaw.of(1), 1, kind);
    // WHEN
    const matches = spring.isKind(kind);
    // THEN
    assert.equal(matches, true);
  });
});
