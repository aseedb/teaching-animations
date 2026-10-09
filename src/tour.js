// A guided tour: a sequence of steps, each preparing its scene, running the
// simulation until its event, then waiting for the student. Highlights are
// named targets ("plusEnd", "gtpCap"...) that the page turns into drawings.
//
// A step: { title, text, setup(sim), speed (steps per tick), until(sim), highlights(sim) }

export class Tour {
  #steps;
  #sim;
  #index = 0;
  #pending = 0;
  #waiting = false;
  #over = false;

  constructor(steps, sim) {
    this.#steps = steps;
    this.#sim = sim;
  }

  static start(steps, sim) {
    const tour = new Tour(steps, sim);
    tour.#enter(0);
    return tour;
  }

  index() {
    return this.#index;
  }

  step() {
    return this.#steps[this.#index];
  }

  progress() {
    return `${this.#index + 1} / ${this.#steps.length}`;
  }

  isWaiting() {
    return this.#waiting;
  }

  isOver() {
    return this.#over;
  }

  highlights() {
    return this.step().highlights(this.#sim);
  }

  tick() {
    if (this.#waiting || this.#over) return;
    const step = this.step();
    this.#pending += step.speed;
    while (this.#pending >= 1 && !this.#waiting) {
      this.#pending -= 1;
      if (step.until(this.#sim)) this.#waiting = true;
      else this.#sim.advance(1);
    }
    if (!this.#waiting && step.until(this.#sim)) this.#waiting = true;
  }

  next() {
    if (this.#index + 1 >= this.#steps.length) { this.#over = true; return; }
    this.#enter(this.#index + 1);
  }

  back() {
    this.#enter(Math.max(0, this.#index - 1));
  }

  #enter(i) {
    this.#index = i;
    this.#pending = 0;
    this.#waiting = false;
    this.#over = false;
    this.step().setup(this.#sim);
  }
}
