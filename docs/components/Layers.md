Four grounds, stepped evenly in OKLCH lightness, are the whole depth hierarchy — shadows only reinforce it.

Use the layer names rather than the values: the lightness changes with the palette, the meaning does not.

| Token | Layer | Belongs there |
| --- | --- | --- |
| `bg-dark` | 0 | The page; the inside of a well |
| `bg` | 1 | Sections, panels, the default card |
| `bg-light` | 2 | Cards in panels, selected rows, inputs, popovers |
| `bg-lighter` | 3 | The single element the eye should reach first |

**Rules.** Step one layer at a time — a card on `bg-dark` goes to `bg`, never straight to `bg-light`. Once an element is on a higher layer, drop its `border-muted` hairline: the ground already separates it, and keeping both reads as two competing edges. Reserve layer 3 for one element per view; a second one cancels the first.

**Lowering is a layer move too.** A de-emphasised region goes down to `bg-dark` and takes `recess-1` or `recess-2`. See the `Recess` card.

**The test.** Turn every shadow off. If the hierarchy still reads, the layers are doing their job. If it collapses, you are leaning on shadows to carry meaning they cannot carry on a low-contrast display.

The consumer provides the layout; this card provides only the grounds.
