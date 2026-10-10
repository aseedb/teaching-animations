// One protofilament: αβ-tubulin dimers from the minus end (index 0) to the
// plus end, each carrying the nucleotide of its β-subunit, GTP or GDP.

export const DIMER_NM = 8;

export class Protofilament {
  #states = [];

  static empty() {
    return new Protofilament();
  }

  states() {
    return [...this.#states];
  }

  dimerCount() {
    return this.#states.length;
  }

  lengthNm() {
    return this.#states.length * DIMER_NM;
  }

  tipState() {
    return this.#states.at(-1) ?? null;
  }

  add(state) {
    this.#states.push(state);
  }

  grow() {
    this.#states.push("GTP");
  }

  shrink() {
    return this.#states.pop() ?? null;
  }

  // a dimer hydrolyses its GTP only once another dimer sits on top of it
  hydrolyse(random, p) {
    const last = this.#states.length - 1;
    this.#states = this.#states.map((s, i) => (s === "GTP" && i < last && random.chance(p) ? "GDP" : s));
  }

  gtpCapLength() {
    let n = 0;
    for (let i = this.#states.length - 1; i >= 0 && this.#states[i] === "GTP"; i--) n++;
    return n;
  }
}
