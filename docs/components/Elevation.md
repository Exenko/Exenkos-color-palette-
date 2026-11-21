Three raise levels, each a lit top edge plus two shadows beneath — go up a level rather than up a blur radius.

Every `elev-*` token has the same three parts, because they model one assumption: light comes from above.

```css
box-shadow:
  inset 0 1px 0 var(--highlight),  /* the top edge catches the light */
  0 2px 4px -2px <shade>,           /* contact shadow, tight and dark */
  0 6px 12px -4px <shade>;          /* ambient shadow, wide and soft */
```

Two offset shadows read far more like a real object than one blurred shadow. The light inset is what sells it — drop it and the element looks pasted on.

| Level | Pair with | Use for |
| --- | --- | --- |
| `elev-1` | `bg-light` | List rows, inputs, chips, tags |
| `elev-2` | `bg-light` | Cards, the selected option, the panel to read first |
| `elev-3` | `bg-lighter` | Menus, popovers, dragged items, a card on hover |

**The smallest that works usually looks best.** Given all three on one component, the smallest that still separates it reads as the most natural. Save `elev-3` for things that genuinely float.

**Use it as a state.** Raising on hover is the clearest interaction feedback available: go up one level and translate by `lift-1` to `lift-3` over `dur-base` with `ease-out`. Translate, never scale — scaling resamples text.

Shadow colour comes from the palette's neutral hue at very low lightness, not from pure black, so a shadow sits in the same light as the surface it falls from.

The consumer provides the element and its ground; these tokens provide only the shadow.
