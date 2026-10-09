// What the page shows and the tour drives: one lamellipodium, a step
// counter, the births of Arp2/3 branches (for the pulses), and the first
// branch, capping and severing since the tour's mark.

import { Lamellipodium } from "./lamellipodium.js";
import { SeededRandom } from "./seededRandom.js";

const PULSE_STEPS = 40;

export class Scene {
  #cell;
  #steps = 0;
  #mark = 0;
  #markX = 0;
  #births = new Map();
  #branch = null;
  #cap = null;
  #sever = null;

  static empty() {
    const scene = new Scene();
    scene.reset(1, 0, { arp23: true, capping: true, cofilin: true, latrunculin: false, phalloidin: false });
    return scene;
  }

  reset(seed, warmUp, treatment) {
    this.#cell = Lamellipodium.create(treatment, SeededRandom.of(seed));
    this.#steps = 0;
    this.#births = new Map();
    this.#cell.onBranch((f) => this.#onBranch(f));
    this.#cell.onCap((f) => { if (!this.#cap) this.#cap = { filament: f, step: this.#steps }; });
    this.#cell.onSever((at) => { if (!this.#sever) this.#sever = { at, step: this.#steps }; });
    this.advance(warmUp);
    this.mark();
  }

  cell() {
    return this.#cell;
  }

  stepsSinceReset() {
    return this.#steps;
  }

  mark() {
    this.#mark = this.#steps;
    this.#markX = this.#cell.membraneX();
    this.#branch = null;
    this.#cap = null;
    this.#sever = null;
  }

  sinceMark() {
    return this.#steps - this.#mark;
  }

  advanceSinceMark() {
    return this.#cell.membraneX() - this.#markX;
  }

  branchSinceMark() {
    return this.#branch;
  }

  capSinceMark() {
    return this.#cap;
  }

  severSinceMark() {
    return this.#sever;
  }

  // 0 at birth, 1 when the pulse of a new branch has faded; null if none
  pulseOf(filament) {
    const born = this.#births.get(filament);
    if (born === undefined) return null;
    const k = (this.#steps - born) / PULSE_STEPS;
    return k < 1 ? k : null;
  }

  advance(n) {
    for (let i = 0; i < n; i++) this.#stepOnce();
  }

  runUntil(condition, max) {
    for (let i = 0; i < max && !condition(this); i++) this.#stepOnce();
  }

  #stepOnce() {
    this.#steps += 1; // events raised during this step carry its number
    this.#cell.step();
    if (this.#steps % 200 === 0) this.#forgetOldBirths();
  }

  #onBranch(f) {
    this.#births.set(f, this.#steps);
    if (!this.#branch) this.#branch = { filament: f, step: this.#steps };
  }

  #forgetOldBirths() {
    for (const [f, t] of this.#births) if (this.#steps - t > PULSE_STEPS) this.#births.delete(f);
  }
}
