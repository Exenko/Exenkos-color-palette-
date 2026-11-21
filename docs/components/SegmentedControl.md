A recessed track holding options, where the selected one is the only thing raised out of it.

The pattern inverts the usual approach. Instead of tinting the selected option, lower everything around it:

- The **track** drops to `bg-dark` with `recess-1`, so the whole group reads as cut into the page.
- The **selected option** rises to `bg-light` with `sheen-soft` and `elev-2`.
- **Unselected options** have no ground at all — transparent, with `text-muted` ink.

```css
.track { background: var(--bg-dark); box-shadow: var(--recess-1); border-radius: var(--radius-lg); padding: var(--space-1); }
.opt { background: transparent; color: var(--text-muted); border-radius: var(--radius-md); }
.opt:has(input:checked) {
  background-color: var(--bg-light);
  background-image: var(--sheen-soft);
  box-shadow: var(--elev-2);
  color: var(--text);
}
```

**Lift the ink too.** Raising the option's ground without raising its text leaves the label looking muted on a brighter surface — the most common half-done version of this pattern. Selected goes to `text`; unselected stays `text-muted`. Both are compliant on both grounds, so this is a hierarchy choice rather than a legibility fix.

**An icon per option earns its place here** because it gives the selected state a second cue beyond position and brightness. The icon tile picks up `primary` with `on-primary` ink when selected.

**Keep real radios.** `:has(input:checked)` does the styling; the input keeps keyboard support, grouping and screen-reader semantics. Focus goes on the label: `box-shadow: var(--ring-focus), var(--elev-2)`.

The consumer provides the option labels and the form name; this pattern provides the track, the selected treatment and the focus ring.
