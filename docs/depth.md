# Depth

Depth is the reason a flat screen can have a hierarchy. Relief builds it from
two ingredients only: which ground an element sits on, and where the light
lands on it.

## Step one — move it to another layer

Before any shadow, change the ground. Raising means stepping up the layer
stack by exactly one.

```css
.panel { background: var(--bg); }           /* layer 1 */
.panel > .selected { background: var(--bg-light); }  /* layer 2 */
```

Two things follow immediately, and skipping them is the most common mistake:

1. **Re-check the ink.** Text that was comfortable on layer 1 is now sitting
   on a lighter ground. In Relief it is still compliant — every ink token is
   solved against the lightest layer — but if you hand-pick a colour, re-check
   it.
2. **Drop the border.** A lighter ground already separates the element. A
   hairline on top of it reads as two edges.

## Step two — add the light

Light comes from above. That single assumption produces both shadows.

**Raised.** The top edge catches the light, so it gets a 1px light inset. The
body blocks the light, so it casts downward. Two offset shadows read far more
like a real object than one blurred shadow does.

```css
box-shadow:
  inset 0 1px 0 var(--highlight),   /* the lit top edge */
  0 2px 4px -2px <shade>,            /* contact shadow, tight */
  0 6px 12px -4px <shade>;           /* ambient shadow, soft */
```

That is `elev-2`. `elev-1` is the same shape with the offsets pulled in;
`elev-3` pushes them out. Go up a level, not up a blur radius.

**Lowered.** Invert where the light lands. The top edge is now in shade and
the *foot* catches the light bouncing off the floor.

```css
box-shadow:
  inset 0 3px 8px -2px <shade>,     /* shade falling in from the top lip */
  inset 0 -1px 0 var(--highlight);   /* light caught at the bottom */
```

That is `recess-1`; `recess-2` deepens it. Pair it with a drop to `bg-dark`
and the element reads as cut into the page.

## Choosing a level

| Role | Ground | Shadow |
| --- | --- | --- |
| List row, input, chip | `bg-light` | `elev-1` |
| Card, selected option, the panel to look at first | `bg-light` | `elev-2` |
| Menu, popover, dragged item, card on hover | `bg-lighter` | `elev-3` |
| Progress track, slider rail, pressed button | `bg-dark` | `recess-1` |
| De-emphasised table, inset code block, a well | `bg-dark` | `recess-2` |

Two practical notes from building with this:

- **The small shadow usually wins.** Given `elev-1`, `elev-2` and `elev-3` on
  the same component, the smallest that still separates it looks the most
  real. Reach for `elev-3` for things that genuinely float.
- **Lower the big thing.** On a dashboard, every panel raised at once means
  nothing is raised. Push the table and the chart down to `bg-dark` with
  `recess-2` and `recess-1`, and the summary tiles rise without changing.

## Hover and press

Depth is also a state. Moving an element *between* levels is the clearest
feedback available, and it costs two declarations.

```css
.row { box-shadow: var(--elev-1); translate: 0 0; }
.row:hover  { box-shadow: var(--elev-2); translate: 0 var(--lift-1); }
.row:active { box-shadow: var(--recess-1); translate: 0 var(--sink-1); background: var(--bg); }
```

Raise on hover, press *in* on active. An element that only brightens on press
feels unresponsive; one that sinks feels like a button.

Translate, never scale: scaling resamples text.

## What not to do

- One symmetric shadow on everything. It reads as neither raised nor lowered.
- A border *and* a higher layer *and* a shadow on the same element.
- Raising by blur radius alone. The light inset is what sells it.
- Giving every card the same `elev-2`. If everything is raised, the page is
  flat again at a different altitude.
