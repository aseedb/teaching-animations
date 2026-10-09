// Regions of the force-length curve, from long to short sarcomeres, with the
// explanation shown to students (Swiss German spelling: ss, never eszett).

export const REGIONS = ["keineUeberlappung", "absteigend", "plateau", "doppelteUeberlappung", "myosinStoesstAnZ"];

const EXPLANATIONS = {
  keineUeberlappung: {
    title: "Keine Überlappung",
    text: "Aktin- und Myosinfilamente überlappen nicht mehr: keine Querbrücken, keine aktive Kraft. Nur noch Titin hält das Sarkomer zusammen.",
  },
  absteigend: {
    title: "Absteigender Ast",
    text: "Je stärker das Sarkomer gedehnt ist, desto weniger Myosinköpfe erreichen ein Aktinfilament: die Kraft sinkt proportional zur Überlappung.",
  },
  plateau: {
    title: "Plateau: optimale Länge",
    text: "Alle Myosinköpfe liegen einem Aktinfilament gegenüber. Die kopffreie Zone um die M-Linie trägt nichts bei, deshalb bleibt die Kraft über ihre Breite konstant.",
  },
  doppelteUeberlappung: {
    title: "Aufsteigender Ast: Aktin überlappt sich",
    text: "Die Aktinfilamente beider Hälften schieben sich in der Mitte übereinander und behindern sich gegenseitig: die Kraft sinkt langsam.",
  },
  myosinStoesstAnZ: {
    title: "Myosin stösst an die Z-Scheiben",
    text: "Die Myosinfilamente werden gegen die Z-Scheiben gedrückt und gestaucht: die Kraft fällt steil ab.",
  },
};

export function explain(region) {
  return EXPLANATIONS[region];
}

// Each region starts where its rule first holds, longest sarcomeres first.
const RULES = [
  ["keineUeberlappung", (l, m) => l >= m.zeroForce],
  ["absteigend", (l, m) => l > m.plateauEnd],
  ["plateau", (l, m) => l >= m.plateauStart],
  ["doppelteUeberlappung", (l, m) => l >= m.thickMeetsZ],
];

export function regionOf(length, landmarks) {
  const hit = RULES.find(([, holds]) => holds(length, landmarks));
  return hit ? hit[0] : "myosinStoesstAnZ";
}
