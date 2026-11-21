# Colour

Relief does not pick colours and then test them. It states the contrast
requirement first and derives the colour that meets it.

## Why OKLCH

In OKLCH, lightness is perceptual: `oklch(0.60 …)` looks equally light at
every hue. That makes the depth model possible — four grounds at even
lightness steps actually look evenly stepped, whatever hue the neutral carries.
It also makes the solver honest: walking `L` walks perceived brightness, so
hitting a contrast target never lands on a colour that looks wrong for its
level.

Chroma is absolute, not a percentage, so a hue can ask for more chroma than
sRGB can render. The engine clamps every value to the largest in-gamut chroma
at that lightness and hue, which is why some hues come back less saturated
than others at the same level. That is the display's limit, not a bug.

## How a token is derived

For each token the engine knows three things: the lightness the design wants,
the contrast ratio it must meet, and the single worst ground it will ever sit
on.

- In dark themes the worst ground for ink is `bg-lighter` — the lightest
  layer. Clear it and you clear all four.
- In light themes the worst ground is `bg-dark` — the darkest layer.

It aims at the wanted lightness, measures, and if the ratio falls short, moves
toward the nearer extreme in 0.0015 steps until it passes. Tokens that had to
move are recorded, so the palette can explain itself.

| Token | Target | Why that number |
| --- | --- | --- |
| `text` | 7:1 | WCAG AAA for body copy |
| `text-muted` | 4.5:1 | WCAG AA; secondary text is still body text |
| `primary` … `info` | 4.5:1 | They are used as text, not only as fills |
| `on-*` | 4.5:1 on its own fill | Label on a solid button |
| `border` | 3:1 | WCAG AA for a control boundary |
| `focus` | 4.5:1 | Must survive a busy ground |
| `border-muted` | none | Decorative hairline — never the only cue |

## How the hues are chosen

One to three seeds go in. The first seed's hue is `primary`.

- **Two seeds**: the second is `secondary`.
- **One seed**: `secondary` comes from a harmony offset — analogous (38°),
  split complement (150°), triad (120°), complement (180°) or square (90°).
- **Three seeds**: the third sets the neutral's hue bias.

Neutrals carry a little of the brand hue (chroma around 0.012) rather than
being pure grey. A pure grey beside a saturated accent looks unconsidered; a
neutral biased toward the accent looks deliberate. Set the bias to `grey` for
chroma 0 if the brand calls for it.

State colours start from fixed anchors — danger 25°, warning 76°, success
149°, info 253° — and are pulled no more than 8–10° toward the brand hue, so
they belong to the family without stopping being recognisable. Each state also
keeps at least 22° from both brand hues; if a brand hue lands on top of a state
anchor, the state is pushed away rather than the brand.

## Telling colours apart

Hue alone is not a cue. The four state colours carry a deliberate lightness
offset as well: `danger` sits darker than `warning` in dark themes, `info`
darker than `success`. A reader with a colour vision deficiency still has
lightness and the accompanying icon or word.

For the same reason, never signal with red and green against each other. If
you need two colours a reader must distinguish at a glance, take two that
differ in lightness, and prefer the blue/orange axis — `info` against
`secondary` — over the red/green one.

## Fourteen tokens, and the rest

The fourteen names the system is specified around:

```css
--bg-dark   --bg        --bg-light  --text      --text-muted
--highlight --border    --border-muted
--primary   --secondary --danger    --warning   --success  --info
```

Relief ships eight more because the model needs them: `bg-lighter` for the
fourth layer, `focus` for the ring, and the six `on-*` inks for solid fills.
Twenty-two colour tokens per theme, forty-four in total, every one solved.

## Reading the audit

Every build returns a matrix: each ink token against each of the four grounds,
in both themes, with its ratio and whether it met its target. Below it, each
`on-*` ink against its fill, and the lightness delta between adjacent layers
(which must be at least 0.018, or the layers stop reading apart).

An empty `failures` array is the only acceptable result. If a seed cannot
produce a compliant palette — a very light seed asked to be `primary` text on
white, for instance — the engine reports the shortfall rather than shipping it.
