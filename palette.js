/* Relief — palette engine v1
 * Deterministic OKLCH palette synthesis with WCAG 2.1 contrast solving.
 * No model, no randomness beyond a seeded PRNG: the same seed always yields
 * the same palette, so a palette has a shareable id.
 *
 * Classic script. Load it and use window.ReliefPalette, or copy the file.
 *   const p = ReliefPalette.build({ seeds: ['#0a7273'], strategy: 'split', seed: 42 });
 *   p.themes.dark.tokens['bg-light'].oklch   // -> 'oklch(0.272 0.014 200)'
 *   p.audit.failures                          // -> [] when the palette is compliant
 *   ReliefPalette.toCss(p)                    // -> the :root / [data-theme] block
 */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------- math --- */

  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  var mod360 = function (h) { return ((h % 360) + 360) % 360; };

  // Shortest signed angular distance from a to b, in degrees.
  function hueDelta(a, b) {
    var d = mod360(b - a);
    return d > 180 ? d - 360 : d;
  }

  // OKLCH -> linear sRGB (may fall outside 0..1, which is how we detect gamut).
  function oklchToLinear(L, C, H) {
    var h = (H * Math.PI) / 180, a = C * Math.cos(h), b = C * Math.sin(h);
    var l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    var m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    var s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    var l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    ];
  }

  function encodeGamma(x) {
    x = clamp(x, 0, 1);
    return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  }
  function decodeGamma(x) {
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  }

  function oklchToSrgb(L, C, H) { return oklchToLinear(L, C, H).map(encodeGamma); }

  function inGamut(L, C, H) {
    var lin = oklchToLinear(L, C, H);
    for (var i = 0; i < 3; i++) if (lin[i] < -0.0012 || lin[i] > 1.0012) return false;
    return true;
  }

  // Largest chroma that still renders inside sRGB at this lightness and hue.
  function maxChroma(L, H) {
    var lo = 0, hi = 0.42;
    for (var i = 0; i < 28; i++) {
      var mid = (lo + hi) / 2;
      if (inGamut(L, mid, H)) lo = mid; else hi = mid;
    }
    return lo;
  }
  function fitChroma(L, C, H) { return Math.min(C, maxChroma(L, H) * 0.985); }

  function luminance(rgb) {
    return 0.2126 * decodeGamma(rgb[0]) + 0.7152 * decodeGamma(rgb[1]) + 0.0722 * decodeGamma(rgb[2]);
  }
  function contrast(rgbA, rgbB) {
    var a = luminance(rgbA), b = luminance(rgbB);
    var hi = Math.max(a, b), lo = Math.min(a, b);
    return (hi + 0.05) / (lo + 0.05);
  }
  function hex(rgb) {
    return '#' + rgb.map(function (c) {
      var v = Math.round(clamp(c, 0, 1) * 255).toString(16);
      return v.length < 2 ? '0' + v : v;
    }).join('');
  }
  function hexAlpha(rgb, alpha) {
    var a = Math.round(clamp(alpha, 0, 1) * 255).toString(16);
    return hex(rgb) + (a.length < 2 ? '0' + a : a);
  }
  function parseHex(s) {
    var t = String(s).trim().replace(/^#/, '');
    if (t.length === 3) t = t[0] + t[0] + t[1] + t[1] + t[2] + t[2];
    if (!/^[0-9a-fA-F]{6}$/.test(t)) return null;
    return [0, 2, 4].map(function (i) { return parseInt(t.slice(i, i + 2), 16) / 255; });
  }
  function srgbToOklch(rgb) {
    var r = decodeGamma(rgb[0]), g = decodeGamma(rgb[1]), b = decodeGamma(rgb[2]);
    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    var L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
    var A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
    var B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
    return { L: L, C: Math.sqrt(A * A + B * B), H: mod360((Math.atan2(B, A) * 180) / Math.PI) };
  }

  function fmt(L, C, H) {
    return 'oklch(' + L.toFixed(3) + ' ' + C.toFixed(3) + ' ' + (C < 0.0005 ? 0 : Math.round(H)) + ')';
  }

  /* --------------------------------------------------------------- solver --- */

  /* The whole point of the engine: rather than hand-picking a lightness and
   * hoping it passes, walk lightness until the contrast ratio against a fixed
   * ground is met, and stop at the FIRST lightness that meets it. Stopping
   * early is deliberate — it is the value closest to the ground, which is the
   * one with the most chroma left in gamut. */
  function solveLightness(target, H, chromaWant, groundRgb, direction, bounds) {
    var lo = bounds && bounds[0] != null ? bounds[0] : 0.02;
    var hi = bounds && bounds[1] != null ? bounds[1] : 1.0;
    var step = 0.0015;
    var best = null;
    if (direction === 'lighter') {
      for (var L = lo; L <= hi + 1e-9; L += step) {
        var C = fitChroma(L, chromaWant, H);
        var r = contrast(oklchToSrgb(L, C, H), groundRgb);
        if (r >= target) { best = { L: L, C: C, ratio: r }; break; }
      }
      if (!best) { var Lc = hi, Cc = fitChroma(Lc, chromaWant, H); best = { L: Lc, C: Cc, ratio: contrast(oklchToSrgb(Lc, Cc, H), groundRgb), short: true }; }
    } else {
      for (var L2 = hi; L2 >= lo - 1e-9; L2 -= step) {
        var C2 = fitChroma(L2, chromaWant, H);
        var r2 = contrast(oklchToSrgb(L2, C2, H), groundRgb);
        if (r2 >= target) { best = { L: L2, C: C2, ratio: r2 }; break; }
      }
      if (!best) { var Lf = lo, Cf = fitChroma(Lf, chromaWant, H); best = { L: Lf, C: Cf, ratio: contrast(oklchToSrgb(Lf, Cf, H), groundRgb), short: true }; }
    }
    return best;
  }

  /* Aim at the lightness the design wants, then move toward the nearer
   * extreme only as far as the contrast target demands. Tokens that had to
   * move are recorded, so a palette can explain itself. */
  function aimThenVerify(idealL, target, H, chromaWant, groundRgb, direction, moves, label) {
    var C = fitChroma(idealL, chromaWant, H);
    var r = contrast(oklchToSrgb(idealL, C, H), groundRgb);
    if (r + 1e-9 >= target) return { L: idealL, C: C, ratio: r, moved: 0 };
    var step = direction === 'lighter' ? 0.0015 : -0.0015;
    var L = idealL;
    for (var i = 0; i < 700; i++) {
      L = clamp(L + step, 0, 1);
      C = fitChroma(L, chromaWant, H);
      r = contrast(oklchToSrgb(L, C, H), groundRgb);
      if (r + 1e-9 >= target) break;
      if (L <= 0 || L >= 1) break;
    }
    if (moves) moves.push({ token: label, fromL: +idealL.toFixed(3), toL: +L.toFixed(3), target: target, ratio: +r.toFixed(2) });
    return { L: L, C: C, ratio: r, moved: L - idealL };
  }

  /* ------------------------------------------------------------ seeded rng --- */

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashString(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /* -------------------------------------------------------------- strategy --- */

  var STRATEGIES = {
    analogous:  { offset: 38,  label: 'Analogous — neighbours, quiet and cohesive' },
    split:      { offset: 150, label: 'Split complement — tension without a clash' },
    triad:      { offset: 120, label: 'Triad — two equals at even spacing' },
    complement: { offset: 180, label: 'Complement — maximum separation' },
    square:     { offset: 90,  label: 'Square — a quarter turn apart' }
  };

  // Semantic anchors. Pulled a little toward the brand hue so they belong to
  // the family, but never far enough to stop reading as the state they mean.
  var STATES = [
    { name: 'danger',  anchor: 25,  pull: 0.12, maxShift: 8,  chroma: 0.175, dL: -0.055 },
    { name: 'warning', anchor: 76,  pull: 0.16, maxShift: 10, chroma: 0.125, dL: 0.032 },
    { name: 'success', anchor: 149, pull: 0.16, maxShift: 10, chroma: 0.120, dL: 0.004 },
    { name: 'info',    anchor: 253, pull: 0.14, maxShift: 10, chroma: 0.135, dL: -0.022 }
  ];

  function resolveStateHue(st, brandHue, taken) {
    var shift = clamp(hueDelta(st.anchor, brandHue) * st.pull, -st.maxShift, st.maxShift);
    var h = mod360(st.anchor + shift);
    // Keep every state at least 22 degrees off the brand hues, or it stops
    // reading as a state and starts reading as the brand.
    for (var pass = 0; pass < 24; pass++) {
      var collided = false;
      for (var i = 0; i < taken.length; i++) {
        var d = hueDelta(taken[i], h);
        if (Math.abs(d) < 22) { h = mod360(h + (d >= 0 ? -3 : 3)); collided = true; }
      }
      if (!collided) break;
    }
    // Never let the nudging carry a state past its own neighbours' territory.
    var drift = hueDelta(st.anchor, h);
    if (Math.abs(drift) > st.maxShift + 10) h = mod360(st.anchor + Math.sign(drift) * (st.maxShift + 10));
    return h;
  }

  /* ----------------------------------------------------------------- build --- */

  var DEFAULTS = {
    seeds: ['#0a7273'],
    strategy: 'split',
    seed: 1,
    neutralBias: 'sympathetic',  // 'sympathetic' | 'counter' | 'grey'
    neutralChroma: 0.012,        // 0 .. 0.024
    accentChroma: 0.11,
    layerStep: 0.050,            // dark-theme lightness between layers
    darkBase: 0.175,
    lightBase: 0.930,
    textTarget: 7.0,             // AAA for body text
    mutedTarget: 4.5,            // AA for secondary text
    accentTarget: 4.5,           // AA for coloured text on any layer
    borderTarget: 3.0,           // AA non-text, for control boundaries
    focusTarget: 4.5,
    sheen: 1.0                   // overlay strength multiplier, 0 .. 1.6
  };

  var SURFACES = ['bg-dark', 'bg', 'bg-light', 'bg-lighter'];

  function buildTheme(mode, plan, opt) {
    var nh = plan.neutralHue, nc = opt.neutralChroma;
    var tokens = {}, surf = [];

    // 1. Four grounds. Lightness is the only thing that says which layer you
    //    are on, so the steps are even and the chroma creeps up with height.
    var i, L, C;
    for (i = 0; i < 4; i++) {
      if (mode === 'dark') { L = opt.darkBase + i * opt.layerStep; }
      else { L = opt.lightBase + i * ((1 - opt.lightBase) / 3); }
      L = clamp(L, 0, 1);
      C = fitChroma(L, nc * (0.82 + 0.14 * i), nh);
      surf.push({ L: L, C: C, H: nh });
      tokens[SURFACES[i]] = token(L, C, nh);
    }
    var lightestGround = oklchToSrgb(surf[3].L, surf[3].C, surf[3].H);
    var darkestGround = oklchToSrgb(surf[0].L, surf[0].C, surf[0].H);
    // Worst case for ink: the ground it is least distinct from.
    var inkGround = mode === 'dark' ? lightestGround : darkestGround;
    var inkDir = mode === 'dark' ? 'lighter' : 'darker';
    var inkBounds = mode === 'dark' ? [surf[3].L + 0.02, 1] : [0, surf[0].L - 0.02];
    void inkBounds;

    // 2. Ink. Aim where the design wants it — near-white on dark, near-black
    //    on light — and let verification pull it only if the target is missed.
    var moves = [];
    var ideal = mode === 'dark'
      ? { text: 0.962, muted: 0.750, border: 0.585, focus: 0.845, accent: 0.780, sign: 1 }
      : { text: 0.255, muted: 0.465, border: 0.615, focus: 0.470, accent: 0.515, sign: -0.45 };
    var t = aimThenVerify(ideal.text, opt.textTarget, nh, nc * 1.3, inkGround, inkDir, moves, 'text');
    tokens.text = token(t.L, t.C, nh);
    var m = aimThenVerify(ideal.muted, opt.mutedTarget, nh, nc, inkGround, inkDir, moves, 'text-muted');
    tokens['text-muted'] = token(m.L, m.C, nh);

    // 3. The lit top edge. In light mode the light source is white; in dark
    //    mode it is a neutral two steps above the highest ground.
    if (mode === 'light') tokens.highlight = token(1, 0, nh);
    else tokens.highlight = (function () {
      var hl = clamp(surf[3].L + opt.layerStep * 2.1, 0, 0.62);
      return token(hl, fitChroma(hl, nc * 1.5, nh), nh);
    })();

    // 4. Boundaries. `border` is a control edge and must clear 3:1 on every
    //    ground; `border-muted` is a hairline and deliberately does not.
    var b = aimThenVerify(ideal.border, opt.borderTarget, nh, nc * 1.3, inkGround, inkDir, moves, 'border');
    tokens.border = token(b.L, b.C, nh);
    var bmL = mode === 'dark' ? clamp(surf[3].L + 0.006, 0, 1) : clamp(opt.lightBase - 0.045, 0, 1);
    tokens['border-muted'] = token(bmL, fitChroma(bmL, nc * 1.1, nh), nh);

    // 5. Focus ring: brand hue at full strength, held to 4.5:1 so it is
    //    visible on the busiest ground in the system.
    var f = aimThenVerify(ideal.focus, opt.focusTarget, plan.focusHue, 0.17, inkGround, inkDir, moves, 'focus');
    tokens.focus = token(f.L, f.C, plan.focusHue);

    // 6. Accents, each solved the same way, then given an ink that passes on it.
    var accents = plan.accents;
    for (i = 0; i < accents.length; i++) {
      var a = accents[i];
      var aim = clamp(ideal.accent + (a.dL || 0) * ideal.sign, 0.04, 0.96);
      var sol = aimThenVerify(aim, opt.accentTarget, a.hue, a.chroma, inkGround, inkDir, moves, a.name);
      tokens[a.name] = token(sol.L, sol.C, a.hue);
      tokens['on-' + a.name] = inkFor(sol.L, sol.C, a.hue, nh, nc);
    }
    return { tokens: tokens, surfaces: surf, neutralHue: nh, moves: moves };
  }

  function token(L, C, H) {
    var rgb = oklchToSrgb(L, C, H);
    return { L: L, C: C, H: H, oklch: fmt(L, C, H), hex: hex(rgb), rgb: rgb };
  }

  // Pick the ink for a solid fill: whichever extreme reads better on it, then
  // pushed until it clears 4.5:1. A fill whose ink cannot clear 4.5 is a fill
  // you should not put text on, and the audit says so.
  function inkFor(L, C, H, nh, nc) {
    var fill = oklchToSrgb(L, C, H);
    var white = token(1, 0, nh);
    var deepL = 0.165, deep = token(deepL, fitChroma(deepL, nc, nh), nh);
    var rw = contrast(white.rgb, fill), rd = contrast(deep.rgb, fill);
    var chosen = rw >= rd ? white : deep;
    if (Math.max(rw, rd) < 4.5) {
      // Walk the darker ink down until it passes, or report the shortfall.
      for (var dl = deepL; dl >= 0.02; dl -= 0.005) {
        var cand = token(dl, fitChroma(dl, nc, nh), nh);
        if (contrast(cand.rgb, fill) >= 4.5) { chosen = cand; break; }
      }
    }
    return chosen;
  }

  /* ------------------------------------------------------------- shadows ---- */

  function buildDepth(theme, mode, opt) {
    var nh = theme.neutralHue, s = clamp(opt.sheen, 0, 1.6);
    // Drop shadows take the palette's hue, not pure black: a neutral-hued
    // shadow sits in the same light as the surface it falls from.
    var shadeL = mode === 'dark' ? 0.04 : 0.24;
    var shade = oklchToSrgb(shadeL, fitChroma(shadeL, opt.neutralChroma * 1.4, nh), nh);
    var lift = mode === 'dark' ? oklchToSrgb(1, 0, nh) : oklchToSrgb(1, 0, nh);
    var A = mode === 'dark'
      ? { e1: [0.08, 0.50, 0.40], e2: [0.12, 0.50, 0.55, 0.45], e3: [0.16, 0.50, 0.60, 0.50], r1: [0.65, 0.08], r2: [0.72, 0.50, 0.12] }
      : { e1: [0.90, 0.07, 0.12], e2: [0.95, 0.08, 0.12, 0.10], e3: [1.00, 0.08, 0.14, 0.12], r1: [0.20, 0.80], r2: [0.25, 0.15, 0.90] };
    var L_ = function (al) { return hexAlpha(lift, clamp(al * (mode === 'dark' ? s : 1), 0, 1)); };
    var S_ = function (al) { return hexAlpha(shade, clamp(al, 0, 1)); };
    var sh = {};
    sh['elev-1'] = 'inset 0 1px 0 ' + L_(A.e1[0]) + ', 0 1px 2px -1px ' + S_(A.e1[1]) + ', 0 2px 4px -2px ' + S_(A.e1[2]);
    sh['elev-2'] = 'inset 0 1px 0 ' + L_(A.e2[0]) + ', 0 2px 4px -2px ' + S_(A.e2[1]) + ', 0 6px 12px -4px ' + S_(A.e2[2]) + ', 0 12px 24px -8px ' + S_(A.e2[3]);
    sh['elev-3'] = 'inset 0 1px 0 ' + L_(A.e3[0]) + ', 0 4px 8px -4px ' + S_(A.e3[1]) + ', 0 14px 28px -6px ' + S_(A.e3[2]) + ', 0 28px 52px -14px ' + S_(A.e3[3]);
    sh['recess-1'] = 'inset 0 2px 4px -2px ' + S_(A.r1[0]) + ', inset 0 -1px 0 ' + L_(A.r1[1]);
    sh['recess-2'] = 'inset 0 3px 8px -2px ' + S_(A.r2[0]) + ', inset 0 12px 22px -10px ' + S_(A.r2[1]) + ', inset 0 -1px 0 ' + L_(A.r2[2]);
    sh['ring-focus'] = '0 0 0 2px ' + theme.tokens['bg-dark'].hex + ', 0 0 0 4px ' + theme.tokens.focus.hex;
    return sh;
  }

  // Alpha-only, so one value is correct in both themes: it lightens the top
  // and darkens the foot of whatever token fill sits under it.
  function buildGradients(opt) {
    var s = clamp(opt.sheen, 0, 1.6);
    var up = function (a) { var v = Math.round(clamp(a * s, 0, 1) * 255).toString(16); return '#ffffff' + (v.length < 2 ? '0' + v : v); };
    var dn = function (a) { var v = Math.round(clamp(a * s, 0, 1) * 255).toString(16); return '#000000' + (v.length < 2 ? '0' + v : v); };
    return {
      'sheen-soft': 'linear-gradient(180deg, ' + up(0.14) + ', ' + dn(0.06) + ')',
      'sheen-strong': 'linear-gradient(180deg, ' + up(0.25) + ', ' + dn(0.09) + ')',
      'sheen-edge': 'linear-gradient(180deg, ' + up(0.36) + ', #ffffff00 42%)',
      'well-scrim': 'linear-gradient(180deg, ' + dn(0.09) + ', #00000000 40%)',
      'ambient-glow': 'radial-gradient(120% 90% at 18% -12%, ' + up(0.17) + ', #ffffff00 58%)'
    };
  }

  /* --------------------------------------------------------------- audit ---- */

  var INK_TOKENS = ['text', 'text-muted'];
  var NON_TEXT = ['border', 'focus'];

  function auditTheme(theme, accents, opt) {
    var rows = [], failures = [];
    var grounds = SURFACES.map(function (k) { return { name: k, rgb: theme.tokens[k].rgb }; });
    var check = function (name, target, label) {
      var tk = theme.tokens[name]; if (!tk) return;
      var cells = grounds.map(function (g) {
        var r = contrast(tk.rgb, g.rgb);
        var level = r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA-large' : 'fail';
        if (r + 1e-9 < target) failures.push({ pair: name + ' on ' + g.name, ratio: r, required: target });
        return { ground: g.name, ratio: r, level: level, pass: r + 1e-9 >= target };
      });
      rows.push({ token: name, kind: label, required: target, cells: cells });
    };
    check('text', opt.textTarget, 'body text');
    check('text-muted', opt.mutedTarget, 'secondary text');
    accents.forEach(function (a) { check(a.name, opt.accentTarget, 'coloured text'); });
    check('border', opt.borderTarget, 'control edge');
    check('focus', opt.focusTarget, 'focus ring');
    var fills = accents.map(function (a) {
      var r = contrast(theme.tokens['on-' + a.name].rgb, theme.tokens[a.name].rgb);
      if (r < 4.5) failures.push({ pair: 'on-' + a.name + ' on ' + a.name, ratio: r, required: 4.5 });
      return { token: a.name, ink: 'on-' + a.name, ratio: r, level: r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : 'fail' };
    });
    // Layers must be told apart by lightness alone.
    var steps = [];
    for (var i = 1; i < 4; i++) {
      var d = Math.abs(theme.surfaces[i].L - theme.surfaces[i - 1].L);
      steps.push({ from: SURFACES[i - 1], to: SURFACES[i], deltaL: d, ok: d >= 0.018 });
      if (d < 0.018) failures.push({ pair: SURFACES[i - 1] + ' / ' + SURFACES[i], ratio: d, required: 0.018, note: 'layers too close to read apart' });
    }
    return { rows: rows, fills: fills, layerSteps: steps, failures: failures };
  }

  /* --------------------------------------------------------------- public --- */

  function plan(opt) {
    var seeds = (opt.seeds || []).map(parseHex).filter(Boolean).map(srgbToOklch);
    if (!seeds.length) seeds = [srgbToOklch(parseHex('#0a7273'))];
    var rnd = mulberry32(hashString(String(opt.seed) + '|' + opt.strategy + '|' + opt.seeds.join(',')));
    var strat = STRATEGIES[opt.strategy] || STRATEGIES.split;
    var h1 = seeds[0].H;
    var h2 = seeds.length > 1 ? seeds[1].H : mod360(h1 + strat.offset);
    var h3 = seeds.length > 2 ? seeds[2].H : null;

    var neutralHue = opt.neutralBias === 'grey' ? h1
      : opt.neutralBias === 'counter' ? mod360(h1 + 180)
      : h1;
    if (h3 != null && opt.neutralBias !== 'grey') neutralHue = h3;

    var brandHues = [h1, h2];
    var accents = [
      { name: 'primary', hue: h1, chroma: opt.accentChroma, dL: 0 },
      { name: 'secondary', hue: h2, chroma: opt.accentChroma * 0.98, dL: 0.018 }
    ];
    var taken = brandHues.slice();
    STATES.forEach(function (st) {
      var h = resolveStateHue(st, h1, taken);
      taken.push(h);
      accents.push({ name: st.name, hue: h, chroma: st.chroma, dL: st.dL });
    });
    return {
      neutralHue: neutralHue, focusHue: h1, accents: accents,
      strategy: opt.strategy, strategyLabel: strat.label,
      seedHues: [h1, h2].concat(h3 == null ? [] : [h3]), rnd: rnd
    };
  }

  function build(options) {
    var opt = {}; for (var k in DEFAULTS) opt[k] = DEFAULTS[k];
    for (var k2 in (options || {})) if (options[k2] !== undefined && options[k2] !== null) opt[k2] = options[k2];
    if (opt.neutralChroma === 'grey') opt.neutralChroma = 0;
    var p = plan(opt);
    var light = buildTheme('light', p, opt), dark = buildTheme('dark', p, opt);
    light.shadow = buildDepth(light, 'light', opt);
    dark.shadow = buildDepth(dark, 'dark', opt);
    var gradients = buildGradients(opt);
    var auditL = auditTheme(light, p.accents, opt), auditD = auditTheme(dark, p.accents, opt);
    return {
      id: String(opt.seed) + '-' + opt.strategy + '-' + (opt.seeds[0] || '').replace('#', ''),
      options: opt,
      plan: { neutralHue: Math.round(p.neutralHue), focusHue: Math.round(p.focusHue), strategy: p.strategy, strategyLabel: p.strategyLabel, accents: p.accents.map(function (a) { return { name: a.name, hue: Math.round(a.hue) }; }) },
      themes: { light: light, dark: dark },
      moves: { light: light.moves, dark: dark.moves },
      gradients: gradients,
      audit: { light: auditL, dark: auditD, failures: auditL.failures.concat(auditD.failures) }
    };
  }

  // A batch of distinct candidates from one seed set: every strategy, then
  // variations in neutral bias and layer step. Deterministic and endless.
  function batch(base, count, page) {
    var keys = Object.keys(STRATEGIES);
    var biases = ['sympathetic', 'counter', 'grey'];
    var out = [], n = count || 6, off = (page || 0) * n;
    for (var i = 0; i < n; i++) {
      var idx = off + i;
      var rnd = mulberry32(hashString('relief|' + idx + '|' + (base.seeds || []).join(',')));
      var strategy = keys[idx % keys.length];
      var bias = biases[Math.floor(idx / keys.length) % biases.length];
      var opt = {};
      for (var k in base) opt[k] = base[k];
      opt.strategy = strategy;
      opt.neutralBias = bias;
      opt.seed = idx + 1;
      opt.neutralChroma = +(0.004 + rnd() * 0.018).toFixed(4);
      opt.accentChroma = +(0.095 + rnd() * 0.055).toFixed(4);
      opt.layerStep = +(0.042 + rnd() * 0.018).toFixed(4);
      opt.darkBase = +(0.150 + rnd() * 0.055).toFixed(4);
      opt.lightBase = +(0.915 + rnd() * 0.030).toFixed(4);
      opt.sheen = +(0.8 + rnd() * 0.5).toFixed(2);
      out.push(build(opt));
    }
    return out;
  }

  var ORDER = ['bg-dark', 'bg', 'bg-light', 'bg-lighter', 'text', 'text-muted', 'highlight',
    'border', 'border-muted', 'focus', 'primary', 'secondary', 'danger', 'warning', 'success', 'info',
    'on-primary', 'on-secondary', 'on-danger', 'on-warning', 'on-success', 'on-info'];

  function cssBlock(theme, gradients, indent) {
    var pad = indent || '  ', out = [];
    ORDER.forEach(function (k) { if (theme.tokens[k]) out.push(pad + '--' + k + ': ' + theme.tokens[k].oklch + ';'); });
    out.push('');
    Object.keys(theme.shadow).forEach(function (k) { out.push(pad + '--' + k + ': ' + theme.shadow[k] + ';'); });
    if (gradients) { out.push(''); Object.keys(gradients).forEach(function (k) { out.push(pad + '--' + k + ': ' + gradients[k] + ';'); }); }
    return out.join('\n');
  }

  function toCss(p) {
    return [
      '/* Relief palette ' + p.id + ' — ' + p.plan.strategyLabel + ' */',
      ':root {',
      cssBlock(p.themes.light, p.gradients),
      '  color-scheme: light;',
      '}',
      '',
      '@media (prefers-color-scheme: dark) {',
      '  :root:not([data-theme="light"]) {',
      cssBlock(p.themes.dark, null, '    '),
      '    color-scheme: dark;',
      '  }',
      '}',
      '',
      ':root[data-theme="dark"] {',
      cssBlock(p.themes.dark, null, '  '),
      '  color-scheme: dark;',
      '}'
    ].join('\n');
  }

  function toJson(p) {
    var themes = {};
    ['light', 'dark'].forEach(function (mode) {
      var t = {};
      ORDER.forEach(function (k) { if (p.themes[mode].tokens[k]) t[k] = { oklch: p.themes[mode].tokens[k].oklch, hex: p.themes[mode].tokens[k].hex }; });
      themes[mode] = { color: t, shadow: p.themes[mode].shadow };
    });
    return JSON.stringify({ id: p.id, plan: p.plan, themes: themes, gradient: p.gradients }, null, 2);
  }

  global.ReliefPalette = {
    build: build, batch: batch, toCss: toCss, toJson: toJson, cssBlock: cssBlock,
    STRATEGIES: STRATEGIES, ORDER: ORDER, DEFAULTS: DEFAULTS,
    util: { oklchToSrgb: oklchToSrgb, srgbToOklch: srgbToOklch, contrast: contrast, hex: hex, parseHex: parseHex, maxChroma: maxChroma, inGamut: inGamut, fmt: fmt, solveLightness: solveLightness }
  };
})(typeof window !== 'undefined' ? window : globalThis);
