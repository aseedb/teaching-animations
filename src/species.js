// Filament geometry of one species, in µm.
//
// Frog: thick filament and I-segment (2 × thinFromZ = 2.05 µm) from Page &
// Huxley 1963; the bare zone of 0.15 µm closes the 2.05–2.2 µm plateau of
// Gordon, Huxley & Julian 1966; Z disc 0.1 µm after Vaz et al. 2012.
// Rabbit psoas: thin filament 1.13 µm and Z line 66 nm from Castillo et al.
// 2009; thick filament 1.65 µm and bare zone 0.2 µm are the mammalian values
// used by Gokhin et al. 2012; titin passive force onset 2.6–2.7 µm in
// myofibrils (Herzog 2018).

export class Species {
  #name;
  #filaments;
  #titinOnset;

  constructor(name, filaments, titinOnset) {
    this.#name = name;
    this.#filaments = Object.freeze({ ...filaments });
    this.#titinOnset = titinOnset;
  }

  static rabbit() {
    return new Species("Kaninchen (M. psoas)", { thick: 1.65, thinFromZ: 1.13, bareZone: 0.2, zDisc: 0.066 }, 2.65);
  }

  static frog() {
    return new Species("Frosch (M. semitendinosus)", { thick: 1.6, thinFromZ: 1.025, bareZone: 0.15, zDisc: 0.1 }, null);
  }

  name() {
    return this.#name;
  }

  filaments() {
    return this.#filaments;
  }

  titinOnset() {
    return this.#titinOnset;
  }
}
