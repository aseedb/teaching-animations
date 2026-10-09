// One sarcomere of a given species at a given length (Z to Z, µm).

const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));

export class Sarcomere {
  #species;
  #length;

  constructor(species, length) {
    this.#species = species;
    this.#length = length;
  }

  static of(species, length) {
    return new Sarcomere(species, length);
  }

  length() {
    return this.#length;
  }

  bands() {
    const { thick, thinFromZ } = this.#species.filaments();
    return {
      aBand: thick,
      iBand: Math.max(0, this.#length - thick),
      hZone: clamp(this.#length - 2 * thinFromZ, 0, thick),
    };
  }
}
