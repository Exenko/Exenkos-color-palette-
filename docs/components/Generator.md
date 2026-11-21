The palette engine: seed one to three colours and get complete, contrast-solved token sets you can pick between and regenerate endlessly.

It is deterministic. The same seeds and options always produce the same palette, so `p.id` names it and a teammate running the same inputs sees the same result. There is no model in the loop — just OKLCH conversion, a gamut clamp and a contrast solver.

**What it derives.** Twenty-two colour tokens per theme (forty-four in all), six shadows per theme, five gradients, and the audit that proves them.

**How a token is solved.** The engine aims at the lightness the design wants, measures the contrast against the single worst ground the token will ever sit on, and moves toward the nearer extreme in 0.0015 steps only if the target is missed. Tokens that had to move are listed under the palette, so it explains itself.

**Seeds.** Seed 1 sets `primary`. Seed 2 sets `secondary`; with only one seed, `secondary` comes from the harmony offset. Seed 3 biases the neutral hue. State hues start from fixed anchors and are pulled no more than 8–10° toward the brand, and never closer than 22° to it.

**Candidates.** Six at a time, varying harmony strategy, neutral bias, neutral chroma, accent chroma, layer step and base lightness. Each card shows the same four-layer stack in both themes, so you compare depth rather than swatches. `Regenerate six` walks to the next batch; batches are numbered and you can walk back.

**In your own code**, `palette.js` at the root of this system is the same engine as one classic script with no dependencies:

```js
const p = ReliefPalette.build({ seeds: ['#0a7273'], strategy: 'split', textTarget: 7.0 });
p.audit.failures;        // [] when compliant
ReliefPalette.toCss(p);  // :root + @media + [data-theme="dark"], ready to paste
ReliefPalette.batch({ seeds: ['#0a7273'] }, 6, 0);  // six candidates, page 0, 1, 2 …
```

The consumer provides the seeds and the targets; the engine provides every value and the proof.
