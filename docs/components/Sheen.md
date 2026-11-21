Alpha-only gradients that lighten the top of a fill and darken its foot, so one value is correct in both themes.

Always set the fill and the gradient separately:

```css
.select {
  background-color: var(--bg-light);      /* the fill carries the contrast */
  background-image: var(--sheen-strong);  /* the gradient carries the light */
}
```

A gradient alone has no single value for the contrast audit to measure. The solid `background-color` is what was verified; the overlay is white and black at low alpha on top of it.

| Token | Use on |
| --- | --- |
| `sheen-soft` | The default — cards, panels, rows |
| `sheen-strong` | Buttons and selects that should read as lit objects |
| `sheen-edge` | The glassy top band only, over a solid accent fill |
| `well-scrim` | Shade falling into a recessed area, under `recess-*` |
| `ambient-glow` | One large panel, off-axis, so it is never one flat field |

**Limits.** No gradient spans more than about 12% of lightness, and no surface takes more than one. A band visible from top to bottom reads as a graphic rather than as light. `ambient-glow` is once per screen.

**Why alpha and not two colour stops.** A gradient built from palette colours needs a light version and a dark version, and the two drift apart as the palette changes. White-over-black at low alpha composites correctly onto whatever is underneath, in either theme, with one declaration.

The consumer provides the fill; these tokens provide only the overlay.
