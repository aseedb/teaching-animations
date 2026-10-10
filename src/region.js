// Regions of the force-length curve, from long to short sarcomeres; their explanations for students
// are in strings.js (region.<name>.title and .text).

export const REGIONS = ["keineUeberlappung", "absteigend", "plateau", "doppelteUeberlappung", "myosinStoesstAnZ"];

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
