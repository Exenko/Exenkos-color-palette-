A progress rail pressed into the surface, with the fill riding slightly above it.

Two opposite shadows on two nested elements, which is what makes this read as a physical meter rather than a tinted strip:

```css
.rail {
  background-color: var(--bg-dark);
  background-image: var(--well-scrim);
  box-shadow: var(--recess-1);
  border-radius: var(--radius-full);
  padding: 3px;                       /* the lip of the groove */
}
.fill {
  background-color: var(--primary);
  background-image: var(--sheen-edge);
  box-shadow: var(--elev-1);
  border-radius: var(--radius-full);
}
```

The `3px` padding matters: it is the lip the fill sits inside. Without it the fill meets the rail's edge and the groove disappears.

**Never signal with the fill colour alone.** Use `primary` for a neutral measure, `success` / `warning` / `danger` for a threshold — and always write the figure next to it. A reader who cannot separate the hues still has the number and the bar's length.

**Figures take the `num` style** with `font-variant-numeric: tabular-nums`, with the unit in `text-muted` at a smaller size so the number itself is the thing read.

**Animate width, not transform.** `transition: width var(--dur-slow) var(--ease-out)`, inside the reduced-motion guard. Scaling the fill distorts its rounded ends.

The same rail works for slider tracks, volume meters and capacity gauges. The consumer provides the value, the label and the accessible `role="progressbar"` attributes.
