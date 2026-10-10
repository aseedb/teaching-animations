// The guided tour of the actin network at the leading edge. Each step sets
// its scene from a fixed seed, so going back replays the same picture.
// Highlight targets are resolved to drawings by the page (app.js); titles,
// texts and labels are keys of the page's dictionary (strings.js).

const SEED = 11;
const WARM = 600;
const ALL = { arp23: true, capping: true, cofilin: true, latrunculin: false, phalloidin: false };
const fresh = (s, treatment = ALL) => s.reset(SEED, WARM, treatment);
const age = (s, event) => (event ? s.stepsSinceReset() - event.step : -1);
const LEAD = 40; // a few seconds of slow motion before the event the step stops on
const watch = (s) => { fresh(s); s.leadIn(LEAD); };

export const ACTIN_TOUR = [
  {
    id: "front",
    title: "tour.front.title",
    text: "tour.front.text",
    setup: (s) => fresh(s),
    speed: 0,
    until: () => true,
    highlights: () => [
      { type: "ring", target: "membrane", label: "tour.front.membrane" },
      { type: "arrow", target: "frontPlusEnd", label: "tour.front.plusEnd" },
      { type: "ring", target: "rearNetwork", label: "tour.front.rear" },
    ],
  },
  {
    id: "push",
    title: "tour.push.title",
    text: "tour.push.text",
    setup: (s) => fresh(s),
    speed: 0.5,
    until: (s) => s.sinceMark() >= 80,
    highlights: () => [
      { type: "arrow", target: "frontPlusEnd", label: "tour.push.adds" },
      { type: "arrow", target: "membranePush", label: "tour.push.membrane" },
    ],
  },
  {
    id: "ages",
    title: "tour.ages.title",
    text: "tour.ages.text",
    setup: (s) => { fresh(s); s.advance(80); },
    speed: 0,
    until: () => true,
    highlights: () => [
      { type: "arrow", target: "ageATP", label: "tour.ages.atp" },
      { type: "arrow", target: "ageADPPi", label: "tour.ages.adppi" },
      { type: "arrow", target: "ageADP", label: "tour.ages.adp" },
    ],
  },
  {
    id: "arp23",
    title: "tour.arp23.title",
    text: "tour.arp23.text",
    setup: watch,
    speed: 0.2,
    until: (s) => { const b = s.branchSinceMark(); return !!b && (b.filament.subunitCount() >= 10 || age(s, b) >= 200); },
    highlights: () => [
      {
        type: "lens", target: "branch", focus: "focus", notes: [
          { type: "ring", target: "branchPoint", label: "tour.arp23.branchPoint", labelSide: "left" },
          { type: "arrow", target: "branchTip", label: "tour.arp23.branchTip", from: "lowerLeft" },
          { type: "arrow", target: "mother", label: "tour.arp23.mother", from: "above" },
        ],
      },
    ],
  },
  {
    id: "capping",
    title: "tour.capping.title",
    text: "tour.capping.text",
    setup: watch,
    speed: 0.2,
    until: (s) => age(s, s.capSinceMark()) >= 0,
    highlights: () => [
      { type: "lens", target: "cap", focus: "capFocus", notes: [{ type: "ring", target: "cappedTip", label: "tour.capping.tip" }] },
    ],
  },
  {
    id: "cofilin",
    title: "tour.cofilin.title",
    text: "tour.cofilin.text",
    setup: watch,
    speed: 0.2,
    until: (s) => age(s, s.severSinceMark()) >= 0,
    highlights: () => [
      { type: "lens", target: "sever", focus: "severFocus", notes: [{ type: "cut", target: "severPoint" }, { type: "ring", target: "severPoint", label: "tour.cofilin.cut" }] },
    ],
  },
  {
    id: "recycling",
    title: "tour.recycling.title",
    text: "tour.recycling.text",
    setup: (s) => fresh(s),
    speed: 2,
    until: (s) => s.sinceMark() >= 240,
    highlights: () => [{ type: "flow", target: "recycle", label: "tour.recycling.flow" }],
  },
  {
    id: "noArp23",
    title: "tour.noArp23.title",
    text: "tour.noArp23.text",
    setup: (s) => { fresh(s); s.treat({ arp23: false }); },
    speed: 2,
    until: (s) => s.growingEnds() === 0 || s.sinceMark() >= 1500,
    highlights: (s) => [{ type: "ring", target: "front", label: s.growingEnds() === 0 ? "tour.noArp23.none" : "tour.noArp23.capping" }],
  },
  {
    id: "free",
    title: "tour.free.title",
    text: "tour.free.text",
    setup: (s) => fresh(s),
    speed: 0,
    until: () => true,
    highlights: () => [],
  },
];
