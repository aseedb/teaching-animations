// What the page shows and the tour drives: one microtubule, its recent
// length history, and the name of what just happened.

import { Microtubule, CELL_EDGE_DIMERS } from "./microtubule.js";
import { SeededRandom } from "./seededRandom.js";

export const HISTORY_STEPS = 2400;
const RESCUE_NOTE_STEPS = 200; // "Rettung" stays on screen this long, then "Wachstum"

export class Scene {
  #mt;
  #history = [];
  #lastPhase = "growing";
  #note = "growing";
  #steps = 0;
  #mark = 0;
  #lastCatastrophe = -Infinity;
  #lastRescue = -Infinity;

  static empty() {
    const scene = new Scene();
    scene.reset(1, 10, 0);
    return scene;
  }

  reset(seed, tubulin, warmUp) {
    this.#mt = Microtubule.create(tubulin, SeededRandom.of(seed));
    this.#history = [];
    this.#lastPhase = "growing";
    this.#note = "growing";
    this.#steps = 0;
    this.#mark = 0;
    this.#lastCatastrophe = -Infinity;
    this.#lastRescue = -Infinity;
    this.advance(warmUp);
  }

  microtubule() {
    return this.#mt;
  }

  history() {
    return this.#history;
  }

  note() {
    return this.#note;
  }

  stepsSinceReset() {
    return this.#steps;
  }

  stepsSinceCatastrophe() {
    return this.#steps - this.#lastCatastrophe;
  }

  mark() {
    this.#mark = this.#steps;
  }

  sinceMark() {
    return this.#steps - this.#mark;
  }

  atEdge() {
    return Math.max(...this.#mt.protofilaments().map((p) => p.length)) >= CELL_EDGE_DIMERS - 2;
  }

  advance(n) {
    for (let i = 0; i < n; i++) this.#stepOnce();
  }

  // advances until the condition holds (checked before each step), at most max steps
  runUntil(condition, max) {
    for (let i = 0; i < max && !condition(this); i++) this.#stepOnce();
  }

  #stepOnce() {
    this.#mt.step();
    this.#steps += 1;
    const phase = this.#mt.phase();
    if (phase !== this.#lastPhase) this.#onPhaseChange(phase);
    else if (this.#note === "rescue" && this.#steps - this.#lastRescue > RESCUE_NOTE_STEPS) this.#note = "growing";
    this.#lastPhase = phase;
    this.#history.push({ length: this.#mt.lengthNm(), phase });
    if (this.#history.length > HISTORY_STEPS) this.#history.shift();
  }

  #onPhaseChange(phase) {
    if (phase === "shrinking") {
      this.#lastCatastrophe = this.#steps;
      this.#note = this.atEdge() ? "edge" : "shrinking";
    } else {
      this.#lastRescue = this.#steps;
      this.#note = "rescue";
    }
  }
}
