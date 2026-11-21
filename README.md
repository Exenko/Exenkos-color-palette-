# Relief

A depth-first UI system and a palette engine that **solves** for WCAG contrast instead of guessing and checking afterwards.

- **[Open the palette engine →](https://exenko.github.io/Exenkos-color-palette-/)** — seed one to three colours, get complete token sets, regenerate endlessly.
- **[Browse the examples →](https://exenko.github.io/Exenkos-color-palette-/examples/)** — every pattern as a standalone page, light and dark.

It exists to fix three things that make interfaces look flat:

1. Nothing reads as raised or lowered, so nothing looks important.
2. Palettes are guessed and then checked, usually after the design is built.
3. Surfaces are single flat fills — one colour, no light in the room, nothing that moves.

## What is in here

| Path | What |
| --- | --- |
| `palette.js` | The engine. One classic script, no dependencies. |
| `palette.mjs` | ES module wrapper around the same engine. |
| `tokens.json` | The default Relief palette and scales, as data. |
| `tokens.css` | Compiled custom properties for both themes. Generated — run `npm run build`. |
| `index.html` | The palette engine as a standalone page. |
| `examples/` | Nine patterns, each a self-contained page. |
| `docs/` | The written system: depth, colour, surface, and a page per pattern. |
| `scripts/build-tokens.mjs` | `tokens.json` → `tokens.css`. |

## Use the tokens

```html
<link rel="stylesheet" href="tokens.css">
```

```css
.card {
  background-color: var(--bg-light);     /* layer 2 */
  background-image: var(--sheen-soft);   /* never one flat fill */
  border-radius: var(--radius-lg);
  box-shadow: var(--elev-2);             /* lit on top, casting below */
  color: var(--text);
  padding: var(--space-6);
}
@media (prefers-reduced-motion: no-preference) {
  .card { transition: box-shadow var(--dur-base) var(--ease-out), translate var(--dur-base) var(--ease-out); }
  .card:hover { box-shadow: var(--elev-3); translate: 0 var(--lift-2); }
}
```

`tokens.css` defines the light palette on `:root`, then redefines the dark one twice — under `prefers-color-scheme: dark` guarded against an explicit light choice, and again under `[data-theme="dark"]` — so a theme toggle wins in both directions and the system setting works with no JavaScript at all.

## Generate a palette

In a page:

```html
<script src="palette.js"></script>
<script>
  const p = ReliefPalette.build({ seeds: ['#0a7273'], strategy: 'split' });
  document.head.insertAdjacentHTML('beforeend', '<style>' + ReliefPalette.toCss(p) + '</style>');
</script>
```

In Node or a bundler:

```js
import { build, batch, toCss } from 'relief-palette';

const p = build({
  seeds: ['#0a7273'],        // one to three hex seeds
  strategy: 'split',         // analogous | split | triad | complement | square
  neutralBias: 'sympathetic',// sympathetic | counter | grey
  textTarget: 7.0,           // AAA body text
  accentTarget: 4.5          // AA coloured text on every layer
});

p.audit.failures;            // [] when every pair meets its target
p.themes.dark.tokens.primary.oklch;
toCss(p);                    // :root + @media + [data-theme="dark"]

batch({ seeds: ['#0a7273'] }, 6, 0);  // six candidates; page 1, 2, 3 … for more
```

The same seeds and options always produce the same palette, so `p.id` names it and a teammate running the same inputs gets the same result. There is no model in the loop — OKLCH conversion, a gamut clamp, and a contrast solver.

### How a token is derived

The engine aims at the lightness the design wants, measures contrast against the single worst ground the token will ever sit on, and moves toward the nearer extreme in 0.0015 steps **only if** the target is missed. Chroma is clamped at every step to the largest value still inside sRGB at that lightness and hue. Tokens that had to move are listed in `p.moves`, so a palette explains itself.

| Token | Target | Why |
| --- | --- | --- |
| `text` | 7:1 | WCAG AAA body copy |
| `text-muted` | 4.5:1 | AA — secondary text is still body text |
| `primary` … `info` | 4.5:1 | They are used as text, not only as fills |
| `on-*` | 4.5:1 on its own fill | Label on a solid button |
| `border` | 3:1 | AA non-text, for a control boundary |
| `focus` | 4.5:1 | Must survive the busiest ground |
| `border-muted` | none | Decorative hairline — never the only cue |

Verified across 288 palettes spanning eight seed hues, five harmony strategies and three neutral biases: zero contrast failures in either theme.

## The three rules

**Lightness carries depth; nothing else does.** An element is raised because its ground is lighter than the ground behind it. Shadows, borders and gradients reinforce that reading — they never replace it. Turn every shadow off: if the hierarchy still reads, the layers are doing their job.

| Token | Layer | Belongs there |
| --- | --- | --- |
| `bg-dark` | 0 — the floor | The page; the inside of a well |
| `bg` | 1 — resting | Sections, panels, the default card |
| `bg-light` | 2 — raised | Cards in panels, selected rows, inputs, popovers |
| `bg-lighter` | 3 — highest | The one element the eye should reach first |

**Every colour pair is solved, not chosen.** See the table above.

**No surface is one flat colour.** Every meaningful surface carries at least one of: a lighter ground than its parent, a `sheen-*` gradient, a lit top edge from `highlight`, or a hover that moves it.

## Raising and lowering

The pairing is the whole idea, and it is physical: light comes from above.

```css
/* raised — lit on top, casting below */
box-shadow:
  inset 0 1px 0 var(--highlight),
  0 2px 4px -2px <shade>,
  0 6px 12px -4px <shade>;

/* lowered — shaded on top, catching light at the foot */
box-shadow:
  inset 0 3px 8px -2px <shade>,
  inset 0 -1px 0 var(--highlight);
```

Raised and lowered are not light and dark. They are opposite answers to one question: which edge is the light hitting? Use `elev-1/2/3` to raise and `recess-1/2` to lower.

The move that changes a dense screen most is counter-intuitive: **lower the big thing.** Push the table down with `recess-2` and the summary tiles rise without being touched. See [`docs/depth.md`](docs/depth.md).

## The tokens

Twenty-two colours per theme — forty-four in all — plus six shadows per theme, five gradients, ten spacing steps, seven radii, six timings and four travel distances.

```css
--bg-dark   --bg        --bg-light  --bg-lighter
--text      --text-muted --highlight
--border    --border-muted  --focus
--primary   --secondary --danger    --warning   --success  --info
--on-primary --on-secondary --on-danger --on-warning --on-success --on-info
```

## Documentation

- [`docs/depth.md`](docs/depth.md) — the layer stack, the two shadow families, hover and press
- [`docs/color.md`](docs/color.md) — why OKLCH, how each token is derived, how hues are chosen
- [`docs/surface.md`](docs/surface.md) — gradients, lit edges, and the three movement patterns
- [`docs/components/`](docs/components) — a page per pattern

## Accessibility floor

`text` at 7:1 on every layer in both themes; `text-muted` and all six accents at 4.5:1; `border` at 3:1; every `on-*` ink at 4.5:1 on its own fill. State is never carried by hue alone — the four state colours differ in lightness as well, and each pairs with an icon or a word. All movement is under half a second and lives inside `@media (prefers-reduced-motion: no-preference)`, so asking for less motion removes it entirely while the layers, gradients and lit edges stay.

## Licence

MIT. See [LICENSE](LICENSE).
