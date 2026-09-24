// Point masses of the tissue: positions and accumulated forces.

export class Nodes {
  #xs = [];
  #ys = [];
  #fxs = [];
  #fys = [];

  static create() {
    return new Nodes();
  }

  add(x, y) {
    this.#xs.push(x);
    this.#ys.push(y);
    this.#fxs.push(0);
    this.#fys.push(0);
    return this.#xs.length - 1;
  }

  x(i) {
    return this.#xs[i];
  }

  y(i) {
    return this.#ys[i];
  }

  forceX(i) {
    return this.#fxs[i];
  }

  forceY(i) {
    return this.#fys[i];
  }

  addForce(i, fx, fy) {
    this.#fxs[i] += fx;
    this.#fys[i] += fy;
  }

  count() {
    return this.#xs.length;
  }

  clearForces() {
    this.#fxs.fill(0);
    this.#fys.fill(0);
  }

  move(i, dx, dy) {
    this.#xs[i] += dx;
    this.#ys[i] += dy;
  }
}
