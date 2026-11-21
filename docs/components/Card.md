A card is a ground one layer up, a lit edge, and one thing pushed down inside it.

Four moves turn a flat card into a layered one, in order of how much they change:

1. **Raise the card.** `bg` plus `elev-2`, and drop the outer border.
2. **Push the figures down.** Numbers go into a `bg-dark` well with `recess-1`. The contrast between a raised card and a lowered panel inside it is what makes the card read as an object with depth rather than a rectangle with a shadow.
3. **Replace tag borders with a layer.** A `Maintainer` tag becomes `bg-lighter` with `inset 0 1px 0 var(--highlight)` — no border at all.
4. **Lift on hover.** `elev-2` → `elev-3`, `lift-2`, `dur-base`.

```css
.card {
  background-color: var(--bg);
  background-image: var(--ambient-glow);
  border-radius: var(--radius-xl);
  box-shadow: var(--elev-2);
  padding: var(--space-5);
}
.card__stats { background: var(--bg-dark); box-shadow: var(--recess-1); border-radius: var(--radius-lg); }
```

**Figures take the `num` style** with `font-variant-numeric: tabular-nums`, and their captions take `label` in `text-muted`. A figure and its caption are a pair — never let the caption outrank the number in weight.

**One card per view goes to layer 3.** If every card on a page is raised to `bg-lighter` with `elev-3`, the page is flat again at a different altitude.

The consumer provides the content and the layout; this pattern provides the ground, the well and the hover behaviour.
