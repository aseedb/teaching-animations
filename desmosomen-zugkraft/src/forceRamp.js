// Automatic loading protocol: the pulling force rises linearly, then holds.

export class ForceRamp {
  #duration;
  #maximum;

  constructor(duration, maximum) {
    this.#duration = duration;
    this.#maximum = maximum;
  }

  static over(duration, maximum) {
    return new ForceRamp(duration, maximum);
  }

  forceAt(elapsed) {
    return this.#maximum * Math.min(1, elapsed / this.#duration);
  }

  isCompleteAt(elapsed) {
    return elapsed >= this.#duration;
  }
}
