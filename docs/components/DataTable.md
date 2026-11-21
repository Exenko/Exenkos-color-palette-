A table pushed down into the page with `recess-2`, so the summary above it rises without being touched.

This is the highest-leverage move in the system and the least obvious one: on a dense screen, raising everything raises nothing. Lower the largest, least urgent region instead.

```css
.table-well {
  background: var(--bg-dark);
  box-shadow: var(--recess-2);
  border-radius: var(--radius-lg);
}
```

The summary tiles stay exactly as they were — `bg-light` with `elev-2` — and read as raised the moment the table drops.

**Rules, not borders.** Row separators take `border-muted`, never `border`: they are decoration, and `border-muted` is deliberately below 3:1. The table itself needs no outer border — the well already bounds it.

**State is a pill with a dot, not a coloured word.** The dot gives shape, the word gives text, the colour gives a third cue. `success`, `warning` and `danger` differ in lightness as well as hue, so the pills stay distinguishable without colour vision.

**Figures right-align** in the `num` style with `font-variant-numeric: tabular-nums`, and the unit sits in `text-muted` at a smaller size. Column headers take `label`.

**Long tables scroll inside their own container** — `overflow-x: auto` on the well, never on the page.

The consumer provides the rows, the sort behaviour and the table semantics; this pattern provides the well, the rules and the state pill.
