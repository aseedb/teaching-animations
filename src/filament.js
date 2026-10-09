// One actin filament: subunits from the pointed (−) end to the barbed (+)
// end, each carrying its nucleotide state ATP → ADP-Pi → ADP. Positions in nm.

export const SUBUNIT_NM = 2.7;
export const BRANCH_ANGLE_DEG = 70;

const NEXT_STATE = { ATP: "ADP-Pi", "ADP-Pi": "ADP" };

export class Filament {
  #pointed;
  #angle;
  #states = [];
  #capped = false;

  constructor(pointed, angle) {
    this.#pointed = { ...pointed };
    this.#angle = angle;
  }

  static at(pointed, angle) {
    return new Filament(pointed, angle);
  }

  angle() {
    return this.#angle;
  }

  states() {
    return [...this.#states];
  }

  subunitCount() {
    return this.#states.length;
  }

  isCapped() {
    return this.#capped;
  }

  pointedEnd() {
    return { ...this.#pointed };
  }

  // centre of subunit i
  subunitPosition(i) {
    return this.#along((i + 0.5) * SUBUNIT_NM);
  }

  barbedTip() {
    return this.#along(this.#states.length * SUBUNIT_NM);
  }

  addAtBarbedEnd(state) {
    this.#states.push(state);
  }

  polymerize() {
    if (this.#capped) return false;
    this.#states.push("ATP");
    return true;
  }

  shiftY(dy) {
    this.#pointed = { x: this.#pointed.x, y: this.#pointed.y + dy };
  }

  cap() {
    this.#capped = true;
  }

  age(random, rates) {
    const rate = { ATP: rates.hydrolysis, "ADP-Pi": rates.release };
    this.#states = this.#states.map((s) => (s in NEXT_STATE && rate[s] > 0 && random.chance(rate[s]) ? NEXT_STATE[s] : s));
  }

  depolymerizePointedEnd() {
    if (this.#states[0] !== "ADP") return 0;
    this.#states.shift();
    this.#pointed = this.#along(SUBUNIT_NM);
    return 1;
  }

  // cuts between subunit at-1 and at; this filament keeps the barbed part
  severBefore(at) {
    const rear = new Filament(this.#pointed, this.#angle);
    this.#states.slice(0, at).forEach((s) => rear.addAtBarbedEnd(s));
    rear.cap();
    this.#pointed = this.#along(at * SUBUNIT_NM);
    this.#states = this.#states.slice(at);
    return rear;
  }

  branchAt(i, side) {
    return new Filament(this.subunitPosition(i), this.#angle + (side * BRANCH_ANGLE_DEG * Math.PI) / 180);
  }

  #along(distance) {
    return { x: this.#pointed.x + distance * Math.cos(this.#angle), y: this.#pointed.y + distance * Math.sin(this.#angle) };
  }
}
