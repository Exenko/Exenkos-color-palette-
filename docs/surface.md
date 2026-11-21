# Surface

A surface in Relief is never one flat colour. The rule is literal: every
surface that means something carries at least one of four treatments, and a
fill with none of them is unfinished.

## 1. A ground above its parent

The cheapest and strongest treatment, and the one covered in `Depth`. An
element one layer up is already not flat relative to its surroundings.

## 2. A gradient that says where the light is

The `sheen-*` tokens are alpha-only — white at the top, black at the foot —
which is why one value is correct in both themes. They lighten the top of
whatever token fill sits beneath and darken its foot, exactly as a surface
tilted toward an overhead light would.

```css
.select {
  background-color: var(--bg-light);      /* the fill carries the contrast */
  background-image: var(--sheen-strong); /* the gradient carries the light */
  box-shadow: var(--elev-1);
}
```

Always `background-color` plus `background-image`, never a gradient alone: the
solid fill is what the contrast audit measured. A gradient on its own has no
single value to check.

| Token | Use on |
| --- | --- |
| `sheen-soft` | The default. Cards, panels, rows. |
| `sheen-strong` | Buttons and selects that should read as lit objects. |
| `sheen-edge` | The glassy top band only, over a solid accent fill. |
| `well-scrim` | Shade falling into a recessed area, under `recess-*`. |
| `ambient-glow` | One large panel, off-axis, so it is never one flat field. |

Two limits worth keeping: no gradient spans more than about 12% of lightness,
and no surface takes more than one. A visible band from top to bottom reads as
a graphic, not as light.

## 3. A lit edge

`highlight` as a 1px inset at the top is the single most effective
anti-flatness detail in the system, and it is already inside every `elev-*`
token. On a surface with no shadow — a tag, a nested inner panel — add it
alone:

```css
.tag { background: var(--bg-light); box-shadow: inset 0 1px 0 var(--highlight); }
```

Never make `highlight` a full border. A light edge on all four sides reads as
an outline and removes the sense of a direction the light comes from.

## 4. Movement

Movement in Relief is feedback, not decoration. It exists to confirm that
something is interactive, to show state changing, or to keep a large idle
surface from looking dead. Three patterns cover almost everything:

**Lift on hover.** Raise one level and translate by `lift-1` to `lift-3`.
`dur-base` with `ease-out`.

**Press in.** Swap `elev-*` for `recess-1`, translate by `sink-1`, and use
`dur-fast` with `ease-sink`. Pressing should feel faster than lifting.

**Ambient drift.** A very slow, very small movement of a gradient's position
on one large surface. Under 2% of travel, over 20 seconds or more. At most one
per screen, and only on a surface with nothing to read on it.

```css
@media (prefers-reduced-motion: no-preference) {
  .hero { animation: drift 28s var(--ease-out) infinite alternate; }
}
@keyframes drift { to { background-position: 12% 4%; } }
```

Every animation and transition is wrapped in `@media (prefers-reduced-motion:
no-preference)`. Not reduced — removed. A user who asks for less motion gets a
surface that still has its layers, gradients and lit edges, because none of
those move.

## What flat looks like

If a screen feels stale, check in this order:

1. Is everything on the same ground? Move one element up a layer.
2. Is the largest element raised? Push it down to `bg-dark` with `recess-2`.
3. Do the fills have a `sheen-*` and a lit top edge?
4. Does anything respond to the cursor?

That order matters: the first two are free and change the most. Gradients and
movement are the finish, not the fix.
