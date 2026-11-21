Three movement patterns — lift, press, drift — each tied to a token pair, each removed entirely under reduced motion.

**Lift on hover.** Go up one elevation level and translate by `lift-1` to `lift-3`, over `dur-base` with `ease-out`. Use it on anything clickable that sits on a ground.

**Press in.** On `:active`, swap the `elev-*` for `recess-1`, translate by `sink-1`, and drop one layer, over `dur-fast` with `ease-sink`. Pressing must feel faster than lifting, or the control feels spongy.

**Ambient drift.** A very slow move of a gradient's background position on one large idle surface: under 2% of travel, 20 seconds or more, at most one per screen, and only where there is nothing to read.

```css
@media (prefers-reduced-motion: no-preference) {
  .card { transition: box-shadow var(--dur-base) var(--ease-out), translate var(--dur-base) var(--ease-out); }
  .card:hover  { box-shadow: var(--elev-3); translate: 0 var(--lift-2); }
  .card:active { box-shadow: var(--recess-1); translate: 0 var(--sink-1); }
}
```

**Rules.** Translate, never scale — scaling resamples text. Nothing runs longer than `dur-slow`. `ease-lift` overshoots once and is for an element that genuinely pops up; everything else settles with `ease-out`. Never animate a colour between two state colours: the in-between frames mean nothing.

**Reduced motion is removal, not reduction.** Every transition and animation lives inside `@media (prefers-reduced-motion: no-preference)`. A user who asks for less motion still gets the full depth model, because layers, gradients and lit edges are static.

The consumer provides the element and the trigger; these tokens provide the durations, easings and travel distances.
