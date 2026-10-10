// The guided tour of dynamic instability. Each step sets its scene from a
// fixed seed, so going back replays exactly the same picture.
// Highlight targets are resolved to drawings by the page (app.js); titles,
// texts and labels are keys of the page's dictionary (strings.js).

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
    id: "microtubule",
    title: "tour.microtubule.title",
    text: "tour.microtubule.text",
    setup: longGrowing,
    speed: 0,
    until: () => true,
    highlights: () => [
      { type: "ring", target: "centrosome", label: "tour.microtubule.centrosome" },
      { type: "ring", target: "plusEndOverview", label: "tour.microtubule.plusEnd" },
      { type: "ring", target: "cellEdge", label: "tour.microtubule.edge" },
    ],
  },
  {
    id: "addition",
    title: "tour.addition.title",
    text: "tour.addition.text",
    setup: longGrowing,
    speed: 0.25,
    until: (s) => s.sinceMark() >= 40,
    highlights: () => [{ type: "arrow", target: "zoomTip", label: "tour.addition.tip" }],
  },
  {
    id: "cap",
    title: "tour.cap.title",
    text: "tour.cap.text",
    setup: (s) => { longGrowing(s); s.advance(40); },
    speed: 0,
    until: () => true,
    highlights: () => [
      { type: "bracket", target: "gtpCap", label: "tour.cap.cap" },
      { type: "arrow", target: "zoomGdp", label: "tour.cap.gdp" },
    ],
  },
  {
    id: "catastrophe",
    title: "tour.catastrophe.title",
    text: "tour.catastrophe.text",
    setup: longGrowing,
    speed: 1,
    until: (s) => shrinking(s) && s.stepsSinceCatastrophe() >= 8,
    highlights: () => [
      { type: "ring", target: "curls", label: "tour.catastrophe.curls" },
      { type: "ring", target: "plotNow", label: "tour.catastrophe.plot" },
    ],
  },
  {
    id: "rescue",
    title: "tour.rescue.title",
    text: "tour.rescue.text",
    setup: atCatastrophe,
    speed: 1,
    until: growing,
    highlights: () => [
      { type: "ring", target: "plusEndOverview", label: "tour.rescue.grows" },
      { type: "ring", target: "plotNow", label: "tour.rescue.plot" },
    ],
  },
  {
    id: "low",
    title: "tour.low.title",
    text: "tour.low.text",
    setup: (s) => { s.reset(SEED, 6, 0); s.mark(); },
    speed: 4,
    until: (s) => s.sinceMark() >= 1600,
    highlights: () => [{ type: "ring", target: "plot", label: "tour.low.plot" }],
  },
  {
    id: "high",
    title: "tour.high.title",
    text: "tour.high.text",
    setup: (s) => { s.reset(SEED, 16, 0); s.mark(); },
    speed: 4,
    until: (s) => s.sinceMark() >= 1600,
    highlights: () => [{ type: "ring", target: "plot", label: "tour.high.plot" }],
  },
  {
    id: "edge",
    title: "tour.edge.title",
    text: "tour.edge.text",
    setup: (s) => { s.reset(SEED, 18, 0); s.mark(); },
    speed: 4,
    until: (s) => shrinking(s) && s.note() === "edge",
    highlights: () => [{ type: "ring", target: "cellEdge", label: "" }],
  },
  {
    id: "free",
    title: "tour.free.title",
    text: "tour.free.text",
    setup: (s) => { s.reset(SEED, 10, WARM); s.mark(); },
    speed: 0,
    until: () => true,
    highlights: () => [],
  },
];
