// A cell: a closed membrane ring whose cytoplasm resists changes of area
// (turgor). A ruptured cell has leaked its cytoplasm and keeps no turgor.

export class Cell {
  #ring;
  #restArea;
  #bulkModulus;
  #ruptured = false;

  constructor(ring, restArea, bulkModulus) {
    this.#ring = ring;
    this.#restArea = restArea;
    this.#bulkModulus = bulkModulus;
  }

  static of(ring, restArea, bulkModulus) {
    return new Cell(ring, restArea, bulkModulus);
  }

  rupture() {
    this.#ruptured = true;
  }

  isRuptured() {
    return this.#ruptured;
  }

  applyPressureTo(nodes) {
    if (this.#ruptured) return;
    const area = this.#signedArea(nodes);
    const pressure = (this.#bulkModulus * (this.#restArea - Math.abs(area))) / this.#restArea;
    if (pressure === 0) return;
    this.#pushAlongAreaGradient(nodes, pressure * Math.sign(area));
  }

  #signedArea(nodes) {
    const ring = this.#ring;
    let twice = 0;
    for (let k = 0; k < ring.length; k++) {
      const i = ring[k];
      const j = ring[(k + 1) % ring.length];
      twice += nodes.x(i) * nodes.y(j) - nodes.x(j) * nodes.y(i);
    }
    return twice / 2;
  }

  #pushAlongAreaGradient(nodes, scale) {
    const ring = this.#ring;
    const n = ring.length;
    for (let k = 0; k < n; k++) {
      const next = ring[(k + 1) % n];
      const prev = ring[(k - 1 + n) % n];
      const gx = 0.5 * (nodes.y(next) - nodes.y(prev));
      const gy = 0.5 * (nodes.x(prev) - nodes.x(next));
      nodes.addForce(ring[k], scale * gx, scale * gy);
    }
  }
}
