// A two-node link that obeys a tension law and ruptures irreversibly.

export class Spring {
  #a;
  #b;
  #restLength;
  #law;
  #breakStrain;
  #kind;
  #broken = false;

  constructor(a, b, restLength, law, breakStrain, kind) {
    this.#a = a;
    this.#b = b;
    this.#restLength = restLength;
    this.#law = law;
    this.#breakStrain = breakStrain;
    this.#kind = kind;
  }

  static between(a, b, restLength, law, breakStrain, kind) {
    return new Spring(a, b, restLength, law, breakStrain, kind);
  }

  applyTo(nodes) {
    if (this.#broken) return;
    const dx = nodes.x(this.#b) - nodes.x(this.#a);
    const dy = nodes.y(this.#b) - nodes.y(this.#a);
    const length = Math.hypot(dx, dy);
    const strain = (length - this.#restLength) / this.#restLength;
    if (strain > this.#breakStrain) {
      this.#broken = true;
      return;
    }
    this.#pull(nodes, this.#law.tensionAt(strain) / length, dx, dy);
  }

  #pull(nodes, tensionPerLength, dx, dy) {
    nodes.addForce(this.#a, tensionPerLength * dx, tensionPerLength * dy);
    nodes.addForce(this.#b, -tensionPerLength * dx, -tensionPerLength * dy);
  }

  isBroken() {
    return this.#broken;
  }

  isKind(kind) {
    return this.#kind === kind;
  }
}
