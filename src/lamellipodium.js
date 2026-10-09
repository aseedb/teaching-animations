// The leading edge of a crawling cell, side view, in nm. The membrane is the
// line x = membraneX; the actin network lies behind it (smaller x). Time runs
// in schematic steps: the order of events follows the literature, their
// speed does not.

import { Filament, SUBUNIT_NM } from "./filament.js";

export const BRANCH_ZONE_NM = 20;

export const RATES = Object.freeze({
  polymerization: 0.6, // per step at the reference pool
  pushAgainstMembrane: 0.35, // a tip touching the membrane needs a thermal gap
  hydrolysis: 0.08, // ATP → ADP-Pi, fast
  phosphateRelease: 0.012, // ADP-Pi → ADP, slower
  depolymerization: 0.02, // pointed end, ADP only
  depolymerizationWithCofilin: 0.25,
  severingWithCofilin: 0.0015, // per ADP subunit
  branching: 0.03, // per filament whose tip is in the branch zone
  capping: 0.006, // per growing barbed end
});

const REFERENCE_POOL = 2000;
const INITIAL_POOL = 7000;
const INITIAL_FILAMENTS = 14;
const INITIAL_LENGTH = 25;
const NETWORK_DEPTH_NM = 700;
export const HALF_HEIGHT_NM = 180; // the band is periodic: a wider leading edge
const MAX_FILAMENTS = 320;
const DEG = Math.PI / 180;

export class Lamellipodium {
  #random;
  #treatment;
  #filaments = [];
  #membraneX = 0;
  #pool = INITIAL_POOL;
  #sequestered = 0;
  #stabilizedOutOfView = 0;
  #branchListeners = [];
  #rates;

  constructor(treatment, random, rates) {
    this.#random = random;
    this.#rates = rates;
    this.#treatment = { ...treatment };
    for (let i = 0; i < INITIAL_FILAMENTS; i++) this.#filaments.push(this.#seedFilament(i));
    if (this.#treatment.latrunculin) this.#sequesterPool();
  }

  static create(treatment, random, rates = RATES) {
    return new Lamellipodium(treatment, random, rates);
  }

  filaments() {
    return [...this.#filaments];
  }

  membraneX() {
    return this.#membraneX;
  }

  pool() {
    return this.#pool;
  }

  sequestered() {
    return this.#sequestered;
  }

  stabilizedOutOfView() {
    return this.#stabilizedOutOfView;
  }

  treatment() {
    return { ...this.#treatment };
  }

  onBranch(listener) {
    this.#branchListeners.push(listener);
  }

  treat(change) {
    const wasSequestering = this.#treatment.latrunculin;
    this.#treatment = { ...this.#treatment, ...change };
    if (!wasSequestering && this.#treatment.latrunculin) this.#sequesterPool();
    if (wasSequestering && !this.#treatment.latrunculin) this.#releaseSequestered();
  }

  step() {
    for (const f of this.#filaments) {
      this.#grow(f);
      f.age(this.#random, { hydrolysis: this.#rates.hydrolysis, release: this.#rates.phosphateRelease });
      this.#maybeCap(f);
    }
    const born = [];
    for (const f of this.#filaments) this.#maybeBranch(f, born);
    this.#filaments.push(...born);
    born.forEach((b) => this.#branchListeners.forEach((l) => l(b)));
    if (!this.#treatment.phalloidin) this.#disassemble();
    this.#removeOutOfView();
  }

  // ATP fraction of the subunits near the membrane and deep in the network
  atpFractionByDepth() {
    const tally = { front: [0, 0], rear: [0, 0] };
    for (const f of this.#filaments) {
      f.states().forEach((s, i) => {
        const depth = this.#membraneX - f.subunitPosition(i).x;
        const zone = depth < 100 ? "front" : depth > 300 ? "rear" : null;
        if (!zone) return;
        tally[zone][1] += 1;
        if (s === "ATP") tally[zone][0] += 1;
      });
    }
    const ratio = ([atp, all]) => (all ? atp / all : 0);
    return { front: ratio(tally.front), rear: ratio(tally.rear) };
  }

  #seedFilament(i) {
    const y = -HALF_HEIGHT_NM + ((i + 0.5) * 2 * HALF_HEIGHT_NM) / INITIAL_FILAMENTS;
    const angle = (i % 2 ? 35 : -35) * DEG + this.#random.symmetric() * 10 * DEG;
    const back = INITIAL_LENGTH * SUBUNIT_NM + 5 + 60 * Math.abs(this.#random.symmetric());
    const f = Filament.at({ x: -back * Math.cos(angle), y: y - back * Math.sin(angle) }, angle);
    for (let k = 0; k < INITIAL_LENGTH; k++) f.addAtBarbedEnd(k < INITIAL_LENGTH - 3 ? "ADP-Pi" : "ATP");
    this.#pool -= INITIAL_LENGTH;
    return f;
  }

  #grow(f) {
    if (f.isCapped() || this.#pool <= 0) return;
    const tip = f.barbedTip();
    const next = tip.x + SUBUNIT_NM * Math.cos(f.angle());
    const touching = next > this.#membraneX;
    const p = this.#rates.polymerization * Math.min(1, this.#pool / REFERENCE_POOL) * (touching ? this.#rates.pushAgainstMembrane : 1);
    if (!this.#random.chance(p)) return;
    f.polymerize();
    this.#pool -= 1;
    if (touching) this.#membraneX = f.barbedTip().x;
    this.#wrap(f);
  }

  #wrap(f) {
    const y = f.barbedTip().y;
    if (y > HALF_HEIGHT_NM) f.shiftY(-2 * HALF_HEIGHT_NM);
    if (y < -HALF_HEIGHT_NM) f.shiftY(2 * HALF_HEIGHT_NM);
  }

  #maybeCap(f) {
    if (this.#treatment.capping && !f.isCapped() && this.#random.chance(this.#rates.capping)) f.cap();
  }

  #maybeBranch(f, born) {
    if (!this.#treatment.arp23 || this.#filaments.length + born.length >= MAX_FILAMENTS) return;
    const i = f.subunitCount() - 2;
    if (i < 0 || f.subunitPosition(i).x < this.#membraneX - BRANCH_ZONE_NM) return;
    if (this.#pool <= 0 || !this.#random.chance(this.#rates.branching)) return;
    const side = Math.abs(f.angle() + 70 * DEG) < Math.abs(f.angle() - 70 * DEG) ? 1 : -1;
    const branch = f.branchAt(i, side);
    branch.polymerize(); // Arp2/3 nucleates the daughter with a first ATP-actin
    this.#pool -= 1;
    this.#wrap(branch);
    born.push(branch);
  }

  #disassemble() {
    const cofilin = this.#treatment.cofilin;
    const pDepol = cofilin ? this.#rates.depolymerizationWithCofilin : this.#rates.depolymerization;
    const pieces = [];
    for (const f of this.#filaments) {
      if (this.#random.chance(pDepol)) this.#returnMonomers(f.depolymerizePointedEnd());
      if (cofilin) this.#maybeSever(f, pieces);
    }
    this.#filaments.push(...pieces);
  }

  #maybeSever(f, pieces) {
    const states = f.states();
    for (let i = 1; i < states.length; i++) {
      if (states[i] === "ADP" && states[i - 1] === "ADP" && this.#random.chance(this.#rates.severingWithCofilin)) {
        const rear = f.severBefore(i);
        this.#wrap(rear);
        pieces.push(rear);
        return;
      }
    }
  }

  #removeOutOfView() {
    const kept = [];
    for (const f of this.#filaments) {
      const gone = f.subunitCount() === 0 || f.barbedTip().x < this.#membraneX - NETWORK_DEPTH_NM;
      if (!gone) { kept.push(f); continue; }
      if (this.#treatment.phalloidin) this.#stabilizedOutOfView += f.subunitCount();
      else this.#returnMonomers(f.subunitCount());
    }
    this.#filaments = kept;
  }

  // profilin recharges ADP-monomers with ATP: they rejoin the pool
  #returnMonomers(n) {
    if (this.#treatment.latrunculin) this.#sequestered += n;
    else this.#pool += n;
  }

  #sequesterPool() {
    this.#sequestered += this.#pool;
    this.#pool = 0;
  }

  #releaseSequestered() {
    this.#pool += this.#sequestered;
    this.#sequestered = 0;
  }
}
