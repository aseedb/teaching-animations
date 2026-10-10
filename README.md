# Teaching animations

Interactive animations for teaching histology and cell biology at the Institute of Anatomy, University of Bern. Each one runs in the browser, needs no installation, and speaks German, French and English.

| Animation | What it shows | Open |
|---|---|---|
| Aktin am Lamellipodium | Actin treadmilling at the leading edge: ATP, ADP-Pi and ADP actin, Arp2/3 branching, capping protein, cofilin; guided tour in nine steps | [live](https://aseedb.github.io/teaching-animations/aktin-lamellipodium/) |
| Dynamische Instabilität | Microtubule dynamic instability: GTP cap, catastrophe, rescue, the cell edge, the effect of the tubulin concentration; guided tour in nine steps | [live](https://aseedb.github.io/teaching-animations/mikrotubuli-instabilitaet/) |
| Sarkomer und Kraft | Sarcomere bands while the length changes, and the force-length curve (rabbit and frog, optional titin) | [live](https://aseedb.github.io/teaching-animations/sarkomer-kraft-laenge/) |
| Desmosomen unter Zug | Two epithelia under the same pulling force, with and without keratin filaments anchoring their desmosomes | [live](https://aseedb.github.io/teaching-animations/desmosomen-zugkraft/) |

The language follows the browser; add `#de`, `#fr` or `#en` to an address to choose it, or use the switch on the page.

## Working on an animation

Every animation is a small project of plain JavaScript modules with no dependencies, written test first.

```sh
cd aktin-lamellipodium
npm test            # node --test
npm run build       # dist/<name>.html, and dist/ilias/ with a zip for an ILIAS HTML learning module
```

The actin and microtubule animations also render a film for slides: `node record.mjs 30 dist/<name>.mp4 2 600` drives the page's `#film` mode in headless Chromium and assembles the frames with ffmpeg.

## Licence

- Code: [MIT](LICENSE).
- Content, that is texts, graphics and the films rendered from the animations: [CC BY 4.0](LICENSE-CONTENT.md). You may reuse and adapt them, including commercially, as long as you credit the author.

Please credit as: Benoît Zuber, Institute of Anatomy, University of Bern, *Teaching animations* (2026), https://github.com/aseedb/teaching-animations.
