# Desmosomen unter Zug

Interactive teaching animation (German labels) for the Histology and Cytology course: two epithelial sheets under the same rising tensile force. In sheet A the desmosomes are anchored to intermediate filaments (keratin); in sheet B they are not. A stretches moderately and stays intact; B deforms far more, then its cells tear next to the desmosomal plaques (cytolysis, as in epidermolysis bullosa simplex) while every desmosome holds.

## Model

A qualitative 2D mass-spring model with overdamped dynamics (`src/`):

- each cell is a ring of membrane/cortex springs that rupture irreversibly beyond a strain threshold (with seeded heterogeneity), plus area pressure (turgor, lost on rupture) and soft spokes to the cell centre (cytoplasmic shape elasticity);
- desmosomes are short, very strong springs between facing plaques, and between the edge cells and the fixed clamp or the pulling grip;
- keratin (sheet A only) is a perinuclear cage tethered to every plaque plus bundles running across the cell from plaque to facing plaque. Filaments are flexible rather than elastic: they are laid down slack (contour 12 % longer than the anchor span, drawn as a wave of that length), carry no load until straightened, and are stiff and strain-stiffening once taut, giving sheet A a J-shaped response.

The teaching claims are executable in `test/scenario.test.js`, under a slow (quasi-static) ramp so that rupture follows from the mechanics rather than from the simulation lagging behind the load.

## Commands

```bash
npm test          # node --test
npm run build     # bundles src/ into dist/desmosomen-zugkraft.html
```

The build output is a single self-contained HTML page (fonts from Google Fonts, everything else inline).

## ILIAS

`npm run build` also writes a standalone page (`dist/ilias/index.html`, with doctype, UTF-8 charset and viewport) and `dist/desmosomen-zugkraft-ilias.zip` for an ILIAS HTML learning module (start file: `index.html`).
