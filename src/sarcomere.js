// One sarcomere of a given species at a given length (Z to Z, µm).
//
// Active force is the overlap of thin filaments with the myosin heads of one
// half thick filament (sliding filament geometry, quantitative on the plateau
// and the descending limb). The ascending limb is schematic: thin filaments
// overlapping each other in the middle interfere with cross-bridge formation
// (weight INTERFERENCE), and once thick filaments push on the Z discs force
// falls linearly to zero over CONTRACTURE_SPAN.

export const CONTRACTURE_SPAN = 0.4;
export const INTERFERENCE = 0.5;

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

  static landmarks(species) {
    const { thick, thinFromZ, bareZone, zDisc } = species.filaments();
    return {
      plateauStart: 2 * thinFromZ,
      plateauEnd: 2 * thinFromZ + bareZone,
      zeroForce: 2 * thinFromZ + thick,
      thickMeetsZ: thick + zDisc,
    };
  }

  length() {
    return this.#length;
  }

  activeForce() {
    const { thickMeetsZ } = Sarcomere.landmarks(this.#species);
    if (this.#length >= thickMeetsZ) return this.#crossBridgeForce();
    return Sarcomere.of(this.#species, thickMeetsZ).#crossBridgeForce() * this.#contracture();
  }

  #crossBridgeForce() {
    return Math.max(0, this.#overlapFraction() - this.#interference());
  }

  #headsPerHalf() {
    const { thick, bareZone } = this.#species.filaments();
    return (thick - bareZone) / 2;
  }

  #overlapFraction() {
    const { thick, thinFromZ, bareZone } = this.#species.filaments();
    const half = this.#length / 2;
    const overlap = Math.min(half, thick / 2) - Math.max(half - thinFromZ, bareZone / 2);
    return Math.max(0, overlap) / this.#headsPerHalf();
  }

  #interference() {
    const { thinFromZ } = this.#species.filaments();
    const doubleOverlapPerHalf = Math.max(0, (2 * thinFromZ - this.#length) / 2);
    return (INTERFERENCE * doubleOverlapPerHalf) / this.#headsPerHalf();
  }

  #contracture() {
    const { thickMeetsZ } = Sarcomere.landmarks(this.#species);
    return clamp(1 - (thickMeetsZ - this.#length) / CONTRACTURE_SPAN, 0, 1);
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
