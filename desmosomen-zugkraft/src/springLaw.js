// Constitutive laws: tension (force units) as a function of engineering strain.

export class LinearLaw {
  #stiffness;

  constructor(stiffness) {
    this.#stiffness = stiffness;
  }

  static of(stiffness) {
    return new LinearLaw(stiffness);
  }

  tensionAt(strain) {
    return this.#stiffness * strain;
  }
}

// Intermediate filaments: soft at small strain, strongly stiffening when
// stretched, and nearly no resistance to compression (they buckle).
export class StiffeningLaw {
  #stiffness;
  #stiffening;
  #compressionFactor;

  constructor(stiffness, stiffening, compressionFactor) {
    this.#stiffness = stiffness;
    this.#stiffening = stiffening;
    this.#compressionFactor = compressionFactor;
  }

  static of(stiffness, stiffening, compressionFactor) {
    return new StiffeningLaw(stiffness, stiffening, compressionFactor);
  }

  tensionAt(strain) {
    if (strain < 0) return this.#compressionFactor * this.#stiffness * strain;
    return this.#stiffness * (strain + this.#stiffening * strain ** 3);
  }
}
