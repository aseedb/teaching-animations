// Deterministic pseudo-random numbers (mulberry32), so every run of the
// animation tears the same way.

export class SeededRandom {
  #state;

  constructor(seed) {
    this.#state = seed >>> 0;
  }

  static of(seed) {
    return new SeededRandom(seed);
  }

  symmetric() {
    return 2 * this.#unit() - 1;
  }

  // true with probability p
  chance(p) {
    return this.#unit() < p;
  }

  #unit() {
    this.#state = (this.#state + 0x6d2b79f5) >>> 0;
    let t = this.#state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}
