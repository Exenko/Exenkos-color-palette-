Two lower levels that invert the light: shade falls in from the top lip, and the foot catches the bounce.

```css
box-shadow:
  inset 0 3px 8px -2px <shade>,    /* shade falling in from the top */
  inset 0 -1px 0 var(--highlight);  /* light caught at the bottom edge */
```

Exactly the inverse of `elev-*`. That is why swapping the inset direction reads as the element flipping, and why one symmetric shadow reads as neither raised nor lowered.

| Level | Pair with | Use for |
| --- | --- | --- |
| `recess-1` | `bg-dark` | Progress tracks, slider rails, pressed buttons, inset fields |
| `recess-2` | `bg-dark` | A de-emphasised table, an inset code block, a well holding other content |

**Lower the big thing.** The most common dashboard mistake is raising every panel, which makes none of them raised. Push the table down with `recess-2` and the chart with `recess-1`, leave the summary tiles where they are, and the tiles rise without being touched.

**Pair it with the ground.** `recess-*` on a surface that is still `bg` or `bg-light` reads as a smudge. Drop to `bg-dark` as well, and add `well-scrim` for a deeper well.

**Use it for press.** On `:active`, swap `elev-*` for `recess-1` and translate by `sink-1` over `dur-fast` with `ease-sink`. Pressing should feel faster than lifting. An element that only changes colour on press feels unresponsive.

The consumer provides the content inside the well; these tokens provide only the shadow.
