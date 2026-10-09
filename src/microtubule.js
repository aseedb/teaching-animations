// A microtubule of 13 protofilaments growing from a stable seed (the
// centrosome side, minus end). Dynamic instability emerges from the race
// between GTP-tubulin addition at the plus end and hydrolysis behind it.
// Time runs in schematic steps; the page says so.

import { Protofilament } from "./protofilament.js";

export const PROTOFILAMENTS = 13;
export const SEED_DIMERS = 20;
export const CELL_EDGE_DIMERS = 1000; // 8 µm: the plus end meets the cell cortex
export const LATERAL_SLACK_DIMERS = 3; // lateral bonds keep protofilaments within a few dimers of the mean

export const RATES = Object.freeze({
  onPerMicromolar: 0.05, // per protofilament and step, per µM free tubulin
  hydrolysis: 0.08, // per buried GTP dimer and step
  gtpTipLoss: 0.12, // the terminal GTP dimer can dissociate: the cap fluctuates
  gdpTipLoss: 0.3, // a GDP dimer at the tip of a growing protofilament falls off
  shrinkage: 5, // attempts per protofilament and step during shrinkage
  shrinkageChance: 0.9,
  spontaneousRescue: 0.015, // per step while shrinking
  catastropheExposed: 9, // this many protofilaments with a GDP tip: catastrophe for sure
  catastropheStrength: 1.5, // below that, chance per step = strength × (exposed / 13) ^ steepness
  catastropheSteepness: 2,
  rescueExposed: 7, // protofilaments with a GTP tip (an island) that stop shrinkage
});

export class Microtubule {
  #protofilaments;
  #phase;
  #tubulin;
  #random;
  #rates;
  #catastrophes = 0;
  #rescues = 0;
  #stepsGrowing = 0;

  constructor(protofilaments, phase, tubulin, random, rates) {
    this.#protofilaments = protofilaments;
    this.#phase = phase;
    this.#tubulin = tubulin;
    this.#random = random;
    this.#rates = rates;
  }

  static create(tubulin, random, rates = RATES) {
    const pfs = Array.from({ length: PROTOFILAMENTS }, () => {
      const p = Protofilament.empty();
      for (let i = 0; i < SEED_DIMERS; i++) p.add("GDP");
      return p;
    });
    return new Microtubule(pfs, "growing", tubulin, random, rates);
  }

  static fromProtofilaments(states, phase, tubulin, random, rates = RATES) {
    const pfs = states.map((list) => {
      const p = Protofilament.empty();
      list.forEach((s) => p.add(s));
      return p;
    });
    return new Microtubule(pfs, phase, tubulin, random, rates);
  }

  phase() {
    return this.#phase;
  }

  protofilaments() {
    return this.#protofilaments.map((p) => p.states());
  }

  lengthNm() {
    return this.#protofilaments.reduce((s, p) => s + p.lengthNm(), 0) / PROTOFILAMENTS;
  }

  meanCapDimers() {
    return this.#protofilaments.reduce((s, p) => s + p.gtpCapLength(), 0) / PROTOFILAMENTS;
  }

  catastrophes() {
    return this.#catastrophes;
  }

  rescues() {
    return this.#rescues;
  }

  stepsGrowing() {
    return this.#stepsGrowing;
  }

  setTubulin(micromolar) {
    this.#tubulin = micromolar;
  }

  tubulin() {
    return this.#tubulin;
  }

  step() {
    if (this.#phase === "growing") this.#grow();
    else this.#shrink();
  }

  #grow() {
    this.#stepsGrowing += 1;
    const pOn = Math.min(1, this.#rates.onPerMicromolar * this.#tubulin);
    const mean = this.#meanDimers();
    for (const p of this.#protofilaments) {
      const leading = p.dimerCount() >= mean + LATERAL_SLACK_DIMERS;
      const lagging = p.dimerCount() <= mean - LATERAL_SLACK_DIMERS;
      const pGrow = lagging ? Math.min(1, 3 * pOn) : pOn; // a corner site between two neighbours binds tubulin readily
      if (!leading && p.dimerCount() < CELL_EDGE_DIMERS && this.#random.chance(pGrow)) p.grow();
      else if (!lagging && p.dimerCount() > SEED_DIMERS && this.#random.chance(this.#tipLoss(p))) p.shrink();
      p.hydrolyse(this.#random, this.#rates.hydrolysis);
    }
    const exposed = this.#protofilaments.filter((p) => p.tipState() === "GDP" && p.dimerCount() > SEED_DIMERS).length;
    const pCatastrophe = this.#rates.catastropheStrength * (exposed / PROTOFILAMENTS) ** this.#rates.catastropheSteepness;
    if (exposed >= this.#rates.catastropheExposed || (exposed > 0 && this.#random.chance(pCatastrophe))) {
      this.#phase = "shrinking";
      this.#catastrophes += 1;
      this.#peelCaps();
    }
  }

  #shrink() {
    if (this.#gtpTips() >= this.#rates.rescueExposed || this.#random.chance(this.#rates.spontaneousRescue)) {
      this.#phase = "growing";
      this.#rescues += 1;
      this.#protofilaments.forEach((p) => p.grow()); // GTP-tubulin binds: a new, short cap
      return;
    }
    for (let k = 0; k < this.#rates.shrinkage; k++) {
      const mean = this.#meanDimers();
      for (const p of this.#protofilaments) {
        const lagging = p.dimerCount() <= mean - LATERAL_SLACK_DIMERS;
        if (!lagging && p.dimerCount() > SEED_DIMERS && this.#random.chance(this.#rates.shrinkageChance)) p.shrink();
      }
    }
    if (this.#protofilaments.every((p) => p.dimerCount() <= SEED_DIMERS)) this.#phase = "growing"; // regrowth from the seed
  }

  // the lattice opens: the GTP caps still left on the other protofilaments are lost
  #peelCaps() {
    for (const p of this.#protofilaments) {
      while (p.tipState() === "GTP" && p.dimerCount() > SEED_DIMERS) p.shrink();
    }
  }

  #meanDimers() {
    return this.#protofilaments.reduce((s, p) => s + p.dimerCount(), 0) / PROTOFILAMENTS;
  }

  #tipLoss(p) {
    return p.tipState() === "GDP" ? this.#rates.gdpTipLoss : this.#rates.gtpTipLoss;
  }

  #gtpTips() {
    return this.#protofilaments.filter((p) => p.tipState() === "GTP" && p.dimerCount() > SEED_DIMERS).length;
  }
}
