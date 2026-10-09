// The guided tour of the actin network at the leading edge. Each step sets
// its scene from a fixed seed, so going back replays the same picture.
// Highlight targets are resolved to drawings by the page (app.js).

const SEED = 11;
const WARM = 600;
const ALL = { arp23: true, capping: true, cofilin: true, latrunculin: false, phalloidin: false };
const fresh = (s, treatment = ALL) => s.reset(SEED, WARM, treatment);
const age = (s, event) => (event ? s.stepsSinceReset() - event.step : -1);
const LEAD = 40; // a few seconds of slow motion before the event the step stops on
const watch = (s) => { fresh(s); s.leadIn(LEAD); };

export const ACTIN_TOUR = [
  {
    title: "Die Vorderkante",
    text: "Aufsicht auf den Rand einer kriechenden Zelle. Rechts die Plasmamembran, links davon das Aktinnetz des Lamellipodiums. Die Plus-Enden der Filamente zeigen zur Membran.",
    setup: (s) => fresh(s),
    speed: 0,
    until: () => true,
    highlights: () => [
      { type: "ring", target: "membrane", label: "Plasmamembran" },
      { type: "arrow", target: "frontPlusEnd", label: "Plus-Ende (weisser Punkt)" },
      { type: "ring", target: "rearNetwork", label: "älteres Netz" },
    ],
  },
  {
    title: "Polymerisation schiebt die Membran",
    text: "An den Plus-Enden lagert sich ATP-Aktin an. Weil die Enden gegen die Membran wachsen, schieben sie sie nach vorne: die Zelle bildet einen Fortsatz.",
    setup: (s) => fresh(s),
    speed: 0.5,
    until: (s) => s.sinceMark() >= 80,
    highlights: () => [
      { type: "arrow", target: "frontPlusEnd", label: "ATP-Aktin lagert sich an" },
      { type: "arrow", target: "membranePush", label: "Membran wird vorgeschoben" },
    ],
  },
  {
    title: "ATP, ADP-Pi, ADP",
    text: "Im Filament wird das ATP bald hydrolysiert (ADP-Pi), später wird das Phosphat frei (ADP). Deshalb ist das Netz vorne jung (ATP) und hinten alt (ADP).",
    setup: (s) => { fresh(s); s.advance(80); },
    speed: 0,
    until: () => true,
    highlights: () => [
      { type: "arrow", target: "ageATP", label: "jung: ATP-Aktin" },
      { type: "arrow", target: "ageADPPi", label: "ADP-Pi-Aktin" },
      { type: "arrow", target: "ageADP", label: "alt: ADP-Aktin" },
    ],
  },
  {
    title: "Arp2/3: ein neues Plus-Ende",
    text: "Arp2/3 setzt sich seitlich an ein Filament nahe der Membran und startet dort ein Tochterfilament im Winkel von 70°. Das Tochterfilament hat sein eigenes Plus-Ende: so entstehen laufend neue wachsende Enden.",
    setup: watch,
    speed: 0.2,
    until: (s) => { const b = s.branchSinceMark(); return !!b && (b.filament.subunitCount() >= 10 || age(s, b) >= 200); },
    highlights: () => [
      {
        type: "lens", target: "branch", focus: "focus", notes: [
          { type: "ring", target: "branchPoint", label: "Arp2/3 am Mutterfilament" },
          { type: "arrow", target: "branchTip", label: "Tochterfilament: neues Plus-Ende" },
          { type: "arrow", target: "mother", label: "Mutterfilament" },
        ],
      },
    ],
  },
  {
    title: "Capping-Protein",
    text: "Capping-Protein setzt sich auf ein Plus-Ende. Dieses Filament wächst nicht mehr weiter. So bleiben die Filamente kurz und das Netz dicht, und die Monomere werden auf die jüngsten Enden gelenkt.",
    setup: watch,
    speed: 0.2,
    until: (s) => age(s, s.capSinceMark()) >= 0,
    highlights: () => [
      { type: "lens", target: "cap", focus: "capFocus", notes: [{ type: "ring", target: "cappedTip", label: "Capping-Protein: wächst nicht mehr" }] },
    ],
  },
  {
    title: "Cofilin",
    text: "Weiter hinten ist das Aktin alt (ADP). Cofilin bindet ADP-Aktin, schneidet die Filamente und beschleunigt ihren Abbau.",
    setup: watch,
    speed: 0.2,
    until: (s) => age(s, s.severSinceMark()) >= 0,
    highlights: () => [
      { type: "lens", target: "sever", focus: "severFocus", notes: [{ type: "ring", target: "severPoint", label: "Cofilin schneidet ADP-Aktin" }] },
    ],
  },
  {
    title: "Recycling und Tretmühle",
    text: "Die freigesetzten Monomere kehren in den Pool zurück; Profilin lädt sie wieder mit ATP. Sie werden vorne erneut eingebaut. Vorne Aufbau, hinten Abbau: das Netz bleibt gleich gross und wandert mit der Membran.",
    setup: (s) => fresh(s),
    speed: 2,
    until: (s) => s.sinceMark() >= 240,
    highlights: () => [{ type: "flow", target: "recycle", label: "Monomere zurück nach vorne (Profilin: wieder ATP)" }],
  },
  {
    title: "Ohne Arp2/3",
    text: "Arp2/3 wird jetzt abgeschaltet: es entstehen keine neuen Plus-Enden mehr. Capping-Protein kappt die vorhandenen nach und nach. Die letzten wachsen sogar schneller, weil ihnen mehr freie Monomere bleiben. Sind alle gekappt, bleibt die Membran stehen.",
    setup: (s) => { fresh(s); s.treat({ arp23: false }); },
    speed: 2,
    until: (s) => s.growingEnds() === 0 || s.sinceMark() >= 1500,
    highlights: (s) => [{ type: "ring", target: "front", label: s.growingEnds() === 0 ? "keine wachsenden Plus-Enden mehr" : "die Plus-Enden werden gekappt" }],
  },
  {
    title: "Selbst ausprobieren",
    text: "Die Tour ist zu Ende. Mit «Tour beenden» kehren Sie zur freien Simulation zurück: schalten Sie Arp2/3, Capping-Protein oder Cofilin ab und beobachten Sie den Vorschub.",
    setup: (s) => fresh(s),
    speed: 0,
    until: () => true,
    highlights: () => [],
  },
];
