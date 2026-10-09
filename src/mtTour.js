// The guided tour of dynamic instability. Each step sets its scene from a
// fixed seed, so going back replays exactly the same picture.
// Highlight targets are resolved to drawings by the page (app.js).

const SEED = 4;
const WARM = 1350; // a long microtubule, growing, at 10 µM
const shrinking = (s) => s.microtubule().phase() === "shrinking";
const growing = (s) => s.microtubule().phase() === "growing";

function longGrowing(s) {
  s.reset(SEED, 10, WARM);
  s.mark();
}

function atCatastrophe(s) {
  longGrowing(s);
  s.runUntil((x) => shrinking(x) && x.stepsSinceCatastrophe() >= 8, 20000);
  s.mark();
}

export const MT_TOUR = [
  {
    title: "Der Mikrotubulus",
    text: "Ein Mikrotubulus wächst vom Zentrosom (links, Minus-Ende) in Richtung Zellrand. Wachstum und Abbau finden fast nur am Plus-Ende statt.",
    setup: longGrowing,
    speed: 0,
    until: () => true,
    highlights: () => [
      { type: "ring", target: "centrosome", label: "Zentrosom: Minus-Ende" },
      { type: "ring", target: "plusEndOverview", label: "Plus-Ende" },
      { type: "ring", target: "cellEdge", label: "Zellrand" },
    ],
  },
  {
    title: "Anlagerung von GTP-Tubulin",
    text: "Unten ist das Plus-Ende vergrössert: 13 Protofilamente aus αβ-Tubulin-Dimeren. An die Spitze lagern sich Dimere mit GTP an (grün).",
    setup: longGrowing,
    speed: 0.25,
    until: (s) => s.sinceMark() >= 40,
    highlights: () => [{ type: "arrow", target: "zoomTip", label: "neues GTP-Tubulin" }],
  },
  {
    title: "Hydrolyse und GTP-Kappe",
    text: "Erst im Gitter wird das GTP zu GDP hydrolysiert (blau). Weil die Hydrolyse hinterherhinkt, bleibt vorne eine GTP-Kappe. Sie hält die Protofilamente gerade und zusammen.",
    setup: (s) => { longGrowing(s); s.advance(40); },
    speed: 0,
    until: () => true,
    highlights: () => [
      { type: "bracket", target: "gtpCap", label: "GTP-Kappe" },
      { type: "arrow", target: "zoomGdp", label: "GDP-Tubulin im Gitter" },
    ],
  },
  {
    title: "Katastrophe",
    text: "Geht die Kappe verloren, liegen GDP-Dimere an der Spitze. GDP-Protofilamente sind gekrümmt: sie spreizen sich nach aussen ab (wie Widderhörner) und zerfallen. Der Mikrotubulus schrumpft rasch.",
    setup: longGrowing,
    speed: 1,
    until: (s) => shrinking(s) && s.stepsSinceCatastrophe() >= 8,
    highlights: () => [
      { type: "ring", target: "curls", label: "Protofilamente spreizen sich ab" },
      { type: "ring", target: "plotNow", label: "schnelles Schrumpfen" },
    ],
  },
  {
    title: "Rettung",
    text: "Das Schrumpfen kann stoppen, etwa an einem Rest GTP-Tubulin im Gitter (GTP-Insel). Eine neue Kappe bildet sich, der Mikrotubulus wächst wieder: Rettung.",
    setup: atCatastrophe,
    speed: 1,
    until: growing,
    highlights: () => [
      { type: "ring", target: "plusEndOverview", label: "wächst wieder" },
      { type: "ring", target: "plotNow", label: "Wechsel zu Wachstum" },
    ],
  },
  {
    title: "Wenig Tubulin",
    text: "Bei wenig freiem Tubulin (6 µM) wachsen die Spitzen langsam, die GTP-Kappe bleibt kurz: Katastrophen sind häufig, die Mikrotubuli bleiben kurz.",
    setup: (s) => { s.reset(SEED, 6, 0); s.mark(); },
    speed: 4,
    until: (s) => s.sinceMark() >= 1600,
    highlights: () => [{ type: "ring", target: "plot", label: "viele kurze Zyklen" }],
  },
  {
    title: "Viel Tubulin",
    text: "Bei viel freiem Tubulin (16 µM) wachsen die Spitzen schnell, die Kappe ist länger: Katastrophen werden selten, die Mikrotubuli werden lang.",
    setup: (s) => { s.reset(SEED, 16, 0); s.mark(); },
    speed: 4,
    until: (s) => s.sinceMark() >= 1600,
    highlights: () => [{ type: "ring", target: "plot", label: "lange Wachstumsphasen" }],
  },
  {
    title: "Am Zellrand",
    text: "Erreicht das Plus-Ende den Zellrand, kann es nicht weiter wachsen. Die Kappe geht verloren, und es folgt eine Katastrophe. So tasten Mikrotubuli den Zellraum ab.",
    setup: (s) => { s.reset(SEED, 18, 0); s.mark(); },
    speed: 4,
    until: (s) => shrinking(s) && s.note() === "edge",
    highlights: () => [{ type: "ring", target: "cellEdge", label: "" }],
  },
  {
    title: "Selbst ausprobieren",
    text: "Die Tour ist zu Ende. Mit «Tour beenden» kehren Sie zur freien Simulation zurück: verändern Sie die Tubulin-Konzentration und beobachten Sie, wie sich Kappe und Katastrophen ändern.",
    setup: (s) => { s.reset(SEED, 10, WARM); s.mark(); },
    speed: 0,
    until: () => true,
    highlights: () => [],
  },
];
