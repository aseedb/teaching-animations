# Sarkomer und Kraft

Interactive teaching animation (German labels) for the Vertiefungsvorlesung Muskelgewebe 3-4: one sarcomere whose length the student sets or plays back, with its bands (A constant, I and H changing), bound cross-bridges, optional titin, and the force-length curve with the current point and an explanation of the region.

## Model

`src/sarcomere.js`, values in `src/species.js`:

- active force is the overlap of thin filaments with the myosin heads of a half thick filament; plateau and descending limb are quantitative and reproduce Gordon, Huxley & Julian 1966 for frog (2.05–2.2 µm, zero at 3.65 µm); the rabbit psoas optimum (2.26–2.46 µm, thin filament 1.13 µm from Castillo et al. 2009) lies in the Herzog 2018 range;
- the ascending limb is schematic: thin-filament double overlap weighted by `INTERFERENCE`, then a linear fall to zero over `CONTRACTURE_SPAN` once thick filaments reach the Z discs;
- titin passive tension is schematic: zero up to the attested rabbit onset (2.65 µm), then a power law (`TITIN_STIFFENING`) scaled to the maximal active force at the zero-overlap length; no titin curve for frog.

The literature check behind each value (quotes and PMIDs) was done on 09.10.2026.

## Commands

```bash
npm test          # node --test
npm run build     # dist/sarkomer-kraft-laenge.html, dist/ilias/index.html and the ILIAS zip
```
