/* Compiles tokens.json into tokens.css.
 * node scripts/build-tokens.mjs
 * Light is the first theme, so it lands on :root. Dark is redefined twice —
 * once under prefers-color-scheme guarded against an explicit light choice,
 * once under [data-theme="dark"] — so a toggle wins in both directions. */
import { readFileSync, writeFileSync } from 'node:fs';

const t = JSON.parse(readFileSync(new URL('../tokens.json', import.meta.url), 'utf8'));
const first = t.color.themes[0].id;
const val = (tok, theme) => (typeof tok.value === 'string' ? tok.value : (tok.value[theme] ?? tok.value[first]));

const themed = (theme, pad) =>
  [...t.color.tokens, ...t.shadow.tokens]
    .map((k) => `${pad}--${k.name}: ${val(k, theme)};`)
    .join('\n');

const statics = (pad) => {
  const out = [];
  for (const family of ['spacing', 'radius', 'gradient', 'timing', 'lift']) {
    for (const k of t[family].tokens) out.push(`${pad}--${k.name}: ${k.value};`);
  }
  for (const [key, stack] of Object.entries(t.type.families)) out.push(`${pad}--font-${key}: ${stack};`);
  return out.join('\n');
};

const typeClasses = () =>
  t.type.groups.flatMap((g) =>
    g.styles.map((s) => {
      const decls = [
        `font-family: var(--font-${s.family ?? g.family})`,
        `font-size: ${s.fontSize}`,
        `line-height: ${s.lineHeight}`,
        `font-weight: ${s.fontWeight}`,
        s.letterSpacing ? `letter-spacing: ${s.letterSpacing}` : null
      ].filter(Boolean);
      return `.${s.name} { ${decls.join('; ')}; }`;
    })
  ).join('\n');

const css = `/* ${t.name} — generated from tokens.json by scripts/build-tokens.mjs. Do not edit by hand. */
:root {
${themed('light', '  ')}

${statics('  ')}
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${themed('dark', '    ')}
    color-scheme: dark;
  }
}

:root[data-theme="dark"] {
${themed('dark', '  ')}
  color-scheme: dark;
}

${typeClasses()}
`;

writeFileSync(new URL('../tokens.css', import.meta.url), css);
console.log(`tokens.css written — ${css.length} bytes`);
