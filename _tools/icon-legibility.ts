/**
 * Icon legibility auditor — "does this app's mark survive both themes?"
 *
 * A host renders an app's icon on a small tile whose colour flips with the
 * theme (`--w6w-icon-swatch` in `@w6w/ui`: `#f0f2f6` light, `#1f232c` dark).
 * A single-colour black mark — the shape most vendor "simple icon" exports
 * take — is perfect on the light tile and invisible on the dark one. The spec
 * already has the escape hatch (`appearance.darkMode.icon`, an ImageObject the
 * host prefers when the theme is dark); this tool decides WHICH apps need one
 * and generates it.
 *
 * ## The rule
 *
 * For each theme we score the icon actually shown there — the dark variant if
 * the app declares one, the light icon otherwise — against that theme's tile.
 * An ink is *separable* from the tile when it clears both of these:
 *
 *   1. ΔE (CIE76, Lab) >= 25 — perceptually distinct, counting hue and chroma,
 *      not just brightness. This is what saves a saturated mid-tone mark
 *      (Spotify green on a light tile) that a pure luminance test would fail.
 *   2. NOT (WCAG contrast < 1.5 AND ΔE < 45) — a mark sitting at the tile's own
 *      brightness needs a big colour difference to read; a dark navy on dark
 *      slate has neither and disappears even though its ΔE looks respectable.
 *
 * An icon FAILS a theme when none of its inks is separable. Passing means the
 * mark reads; it does not mean it reads *well* — that is a design call, not a
 * threshold.
 *
 * ## The two sanctioned fixes
 *
 * Which one an app takes is a brand question, so the tool only automates the
 * first and the audit accepts either:
 *
 *   - **Reversed mark** (`fix` generates this). A one-colour mark re-inked to
 *     white — the treatment essentially every brand guide specifies for its own
 *     logo on a dark background. The artwork is untouched; only the paint
 *     changes, so the mark stays the vendor's.
 *   - **Plate.** A multicolour mark whose palette must not change ships a dark
 *     variant that composes the verbatim artwork on the backdrop the brand
 *     allows (usually white), via a nested `<svg>`. Hand-authored: the backdrop
 *     colour and the inset are brand decisions.
 *
 * ## Usage
 *
 *     deno run -A _tools/icon-legibility.ts            # check every app
 *     deno run -A _tools/icon-legibility.ts check attio datadog
 *     deno run -A _tools/icon-legibility.ts fix        # write dark variants
 *     deno run -A _tools/icon-legibility.ts fix --dry-run
 *     deno run -A _tools/icon-legibility.ts check --json
 *
 * `check` exits 1 when any app fails, so CI and `audit.ts` can gate on it.
 */

const ROOT = new URL("../", import.meta.url).pathname.replace(/\/$/, "");
const APPS_DIR = `${ROOT}/apps`;

/** The tiles an icon is drawn on. Mirrors `--w6w-icon-swatch` in `@w6w/ui`. */
export const TILE = { light: "#f0f2f6", dark: "#1f232c" } as const;

/** Separability thresholds — see the header. */
const MIN_DELTA_E = 25;
const LOW_CONTRAST = 1.5;
const LOW_CONTRAST_DELTA_E = 45;

export type Theme = "light" | "dark";
export type RGB = [number, number, number];

export interface ThemeScore {
  /** Is the mark separable from this theme's tile? */
  ok: boolean;
  /** Path of the icon scored here (dark variant when present). */
  icon?: string;
  /** Best (largest) ΔE across the icon's inks. */
  deltaE?: number;
  /** WCAG contrast of the ink that produced `deltaE`. */
  contrast?: number;
  /** Why the icon could not be scored, when it could not be. */
  note?: string;
}

export interface IconVerdict {
  app: string;
  light: ThemeScore;
  dark: ThemeScore;
  /** Inks found in the light icon, deduped — what `fix` re-inks. */
  lightInks: RGB[];
  /** The light icon paints with SVG's black initial value, not a named colour. */
  defaultBlack: boolean;
  /** True when the app already declares `appearance.darkMode.icon`. */
  hasDarkVariant: boolean;
}

// ------------------------------------------------------------------ colour --

const NAMED: Record<string, RGB> = {
  black: [0, 0, 0],
  white: [255, 255, 255],
  red: [255, 0, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  silver: [192, 192, 192],
  navy: [0, 0, 128],
  purple: [128, 0, 128],
  teal: [0, 128, 128],
  orange: [255, 165, 0],
  yellow: [255, 255, 0],
  maroon: [128, 0, 0],
  olive: [128, 128, 0],
  lime: [0, 255, 0],
  aqua: [0, 255, 255],
  cyan: [0, 255, 255],
  fuchsia: [255, 0, 255],
  magenta: [255, 0, 255],
};

/**
 * Parse a CSS colour to RGB. Returns null for anything that paints nothing
 * (`none`), defers to a paint server (`url(#grad)` — its `<stop>`s are read
 * separately), or that we cannot resolve here (`currentColor`, `inherit`).
 */
export function parseColor(value: string | undefined | null): RGB | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (
    v === "none" || v === "transparent" || v === "inherit" ||
    v === "currentcolor"
  ) return null;
  if (v.startsWith("url(")) return null;
  if (v in NAMED) return NAMED[v];
  const hex = /^#([0-9a-f]{3,8})$/.exec(v);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) {
      h = [...h.slice(0, 3)].map((c) => c + c).join("");
    }
    if (h.length < 6) return null;
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  const fn = /^rgba?\(([^)]+)\)$/.exec(v);
  if (fn) {
    const parts = fn[1].split(/[,\s/]+/).filter(Boolean).slice(0, 3);
    if (parts.length < 3) return null;
    const nums = parts.map((p) =>
      p.endsWith("%")
        ? Math.round(parseFloat(p) * 2.55)
        : Math.round(parseFloat(p))
    );
    if (nums.some(Number.isNaN)) return null;
    return nums as RGB;
  }
  return null;
}

/** sRGB channel → linear light. */
function linear(c: number): number {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance, 0..1. */
export function luminance([r, g, b]: RGB): number {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG contrast ratio between two luminances, 1..21. */
export function contrastRatio(a: number, b: number): number {
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** sRGB → CIE L*a*b* (D65). */
function toLab([r, g, b]: RGB): [number, number, number] {
  const R = linear(r), G = linear(g), B = linear(b);
  const x = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
  const y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** ΔE CIE76 — Euclidean distance in Lab. Good enough to say "different colour". */
export function deltaE(a: RGB, b: RGB): number {
  const [l1, a1, b1] = toLab(a);
  const [l2, a2, b2] = toLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/** Is one ink separable from a tile? See the header for the two clauses. */
export function separable(ink: RGB, tile: RGB): boolean {
  const dE = deltaE(ink, tile);
  if (dE < MIN_DELTA_E) return false;
  const ratio = contrastRatio(luminance(ink), luminance(tile));
  if (ratio < LOW_CONTRAST && dE < LOW_CONTRAST_DELTA_E) return false;
  return true;
}

// --------------------------------------------------------------------- SVG --

/** `{ ".cls-1": { fill: "#1569ef" } }` from every `<style>` block in the file. */
function cssRules(svg: string): Map<string, Record<string, string>> {
  const rules = new Map<string, Record<string, string>>();
  for (const block of svg.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    const css = block[1].replace(/\/\*[\s\S]*?\*\//g, "");
    for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const props: Record<string, string> = {};
      for (const decl of rule[2].split(";")) {
        const i = decl.indexOf(":");
        if (i > 0) {
          props[decl.slice(0, i).trim().toLowerCase()] = decl.slice(i + 1)
            .trim();
        }
      }
      for (const sel of rule[1].split(",")) {
        const s = sel.trim();
        if (!s) continue;
        rules.set(s, { ...rules.get(s), ...props });
      }
    }
  }
  return rules;
}

const PAINTED = new Set([
  "path",
  "rect",
  "circle",
  "ellipse",
  "polygon",
  "polyline",
  "line",
  "text",
]);

/**
 * Every ink an SVG paints with.
 *
 * Deliberately a tag scan rather than a DOM parse: these are icon files, and
 * what matters is which colours end up on screen, from wherever they are
 * declared — presentation attribute, inline `style`, or a `<style>` class rule.
 * A painted element with NO fill anywhere inherits SVG's initial value, which
 * is **black** — the case that makes half this pack invisible in dark mode, so
 * it is reported as a real ink rather than "unknown".
 */
export function svgInks(svg: string): { inks: RGB[]; defaultBlack: boolean } {
  const rules = cssRules(svg);
  const inks: RGB[] = [];
  let defaultBlack = false;

  // `fill`/`stroke` inherit, so a painted element's colour can be declared
  // several levels up (`<svg fill="none">`, `<g fill="#e31e26">`). Walk the tag
  // stream with a stack of inherited paint rather than guessing from a flat
  // scan — the difference is a mark read as black when it is really red.
  const stack: { fill: string[]; stroke: string[]; tag: string }[] = [];
  // Geometry inside these paints nothing visible: it describes a clip or a mask.
  const INVISIBLE = new Set(["clippath", "mask"]);
  const inside = (tags: Set<string>) => stack.some((f) => tags.has(f.tag));

  for (const el of svg.matchAll(/<(\/?)([a-z:]+)\b([^>]*?)(\/?)>/gi)) {
    const closing = el[1] === "/";
    const tag = el[2].toLowerCase();
    const attrs = el[3];
    const selfClosing = el[4] === "/";

    if (closing) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag === tag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    if (tag === "stop") {
      if (!inside(INVISIBLE)) {
        const { ink } = resolvePaint(
          paintCandidates(attrs, rules, "stop-color"),
        );
        if (ink) inks.push(ink);
      }
      continue;
    }

    if (PAINTED.has(tag) && !inside(INVISIBLE)) {
      const own = paintCandidates(attrs, rules, "fill");
      const declared = own.length > 0
        ? own
        : [...stack].reverse().find((f) => f.fill.length > 0)?.fill ?? [];
      if (declared.length === 0) {
        inks.push([0, 0, 0]); // SVG's initial fill
        defaultBlack = true;
      } else {
        const { ink } = resolvePaint(declared);
        if (ink) inks.push(ink);
      }
      const strokeDecl = (() => {
        const mine = paintCandidates(attrs, rules, "stroke");
        return mine.length > 0
          ? mine
          : [...stack].reverse().find((f) => f.stroke.length > 0)?.stroke ?? [];
      })();
      const { ink: stroke } = resolvePaint(strokeDecl);
      if (stroke) inks.push(stroke);
    }

    if (!selfClosing && !PAINTED.has(tag) && tag !== "stop") {
      stack.push({
        tag,
        fill: paintCandidates(attrs, rules, "fill"),
        stroke: paintCandidates(attrs, rules, "stroke"),
      });
    }
  }
  return { inks, defaultBlack };
}

/**
 * Every value declared for one paint property on an element, highest CSS
 * precedence first: inline `style` (last declaration wins) > presentation
 * attribute > class rule.
 *
 * A list rather than a single winner because of the wide-gamut fallback
 * pattern — `style="fill:#00AEEF;fill:color(display-p3 0 .68 .94)"` names the
 * same colour twice, and the winning declaration is the one this tool cannot
 * parse. Callers walk the list and take the first value they understand, which
 * lands on the sRGB fallback the vendor wrote for exactly this reason.
 */
function paintCandidates(
  attrs: string,
  rules: Map<string, Record<string, string>>,
  prop: "fill" | "stroke" | "stop-color",
): string[] {
  const out: string[] = [];
  const style = /\bstyle\s*=\s*"([^"]*)"/i.exec(attrs)?.[1];
  if (style) {
    for (const decl of style.split(";")) {
      const i = decl.indexOf(":");
      if (i > 0 && decl.slice(0, i).trim().toLowerCase() === prop) {
        out.unshift(decl.slice(i + 1).trim());
      }
    }
  }
  const attr = new RegExp(`\\b${prop}\\s*=\\s*"([^"]*)"`, "i").exec(attrs)?.[1];
  if (attr !== undefined) out.push(attr);
  const cls = /\bclass\s*=\s*"([^"]*)"/i.exec(attrs)?.[1];
  if (cls) {
    for (const c of cls.split(/\s+/)) {
      const v = rules.get(`.${c}`)?.[prop];
      if (v) out.push(v);
    }
  }
  return out;
}

/**
 * Resolve a paint declaration list to what it actually puts on screen:
 * a colour, nothing (`none`), or black (SVG's initial value / `currentColor`).
 */
function resolvePaint(
  values: string[],
): { ink?: RGB; none?: true; unresolved?: true } {
  for (const value of values) {
    const v = value.trim().toLowerCase();
    if (v === "none" || v === "transparent") return { none: true };
    if (v === "currentcolor") return { ink: [0, 0, 0] };
    const c = parseColor(value);
    if (c) return { ink: c };
    // url(#gradient) — its <stop>s are scored separately; anything else is a
    // colour syntax we do not speak, so try the next (lower-precedence) value.
  }
  return { unresolved: true };
}

// --------------------------------------------------------------------- PNG --

/**
 * Decode a non-interlaced PNG to its opaque pixels. Enough of the format to
 * audit an icon — 1/2/4/8/16-bit greyscale, truecolour, palette, with or
 * without alpha — and nothing more. Returns null for anything else (interlaced
 * files), which the caller reports as "unscanned" rather than a pass.
 */
export async function pngPixels(bytes: Uint8Array): Promise<RGB[] | null> {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  if (sig.some((b, i) => bytes[i] !== b)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = 8;
  let width = 0, height = 0, depth = 0, colorType = 0, interlace = 0;
  let palette: Uint8Array | null = null;
  let alphaTable: Uint8Array | null = null;
  const idat: Uint8Array[] = [];
  while (pos + 8 <= bytes.length) {
    const len = view.getUint32(pos);
    const type = String.fromCharCode(...bytes.subarray(pos + 4, pos + 8));
    const body = bytes.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = view.getUint32(pos + 8);
      height = view.getUint32(pos + 12);
      depth = body[8];
      colorType = body[9];
      interlace = body[12];
    } else if (type === "PLTE") palette = body;
    else if (type === "tRNS") alphaTable = body;
    else if (type === "IDAT") idat.push(body);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  if (interlace !== 0) return null;
  const channels =
    { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType as 0 | 2 | 3 | 4 | 6];
  if (!channels || ![1, 2, 4, 8, 16].includes(depth)) return null;

  const deflated = concat(idat);
  const zlib = new Blob([deflated.slice().buffer as ArrayBuffer]).stream()
    .pipeThrough(new DecompressionStream("deflate"));
  const raw = new Uint8Array(await new Response(zlib).arrayBuffer());

  const bits = depth * channels;
  const stride = Math.ceil((width * bits) / 8);
  const bpp = Math.max(1, bits >> 3);
  const out: RGB[] = [];
  let prev = new Uint8Array(stride);
  let p = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[p++];
    const line = raw.slice(p, p + stride);
    p += stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      if (filter === 1) line[i] = (line[i] + a) & 255;
      else if (filter === 2) line[i] = (line[i] + b) & 255;
      else if (filter === 3) line[i] = (line[i] + ((a + b) >> 1)) & 255;
      else if (filter === 4) {
        const pp = a + b - c;
        const [pa, pb, pc] = [
          Math.abs(pp - a),
          Math.abs(pp - b),
          Math.abs(pp - c),
        ];
        line[i] = (line[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) &
          255;
      }
    }
    for (let x = 0; x < width; x++) {
      const px = sample(line, x, depth, channels);
      let rgb: RGB;
      let alpha = 255;
      if (colorType === 0) rgb = [px[0], px[0], px[0]];
      else if (colorType === 4) {
        rgb = [px[0], px[0], px[0]];
        alpha = px[1];
      } else if (colorType === 2) rgb = [px[0], px[1], px[2]];
      else if (colorType === 6) {
        rgb = [px[0], px[1], px[2]];
        alpha = px[3];
      } else {
        const i = px[0];
        rgb = palette
          ? [palette[i * 3], palette[i * 3 + 1], palette[i * 3 + 2]]
          : [0, 0, 0];
        alpha = alphaTable && i < alphaTable.length ? alphaTable[i] : 255;
      }
      if (alpha >= 32) out.push(rgb);
    }
    prev = line;
  }
  return out;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** One pixel's channel values, normalised to 0..255. */
function sample(
  line: Uint8Array,
  x: number,
  depth: number,
  channels: number,
): number[] {
  if (depth === 8) {
    return Array.from(line.subarray(x * channels, (x + 1) * channels));
  }
  if (depth === 16) {
    // High byte only — an icon audit does not need the low 8 bits.
    return Array.from(
      { length: channels },
      (_, i) => line[(x * channels + i) * 2],
    );
  }
  const per = 8 / depth;
  const max = (1 << depth) - 1;
  return Array.from({ length: channels }, (_, i) => {
    const idx = x * channels + i;
    const shift = 8 - depth * ((idx % per) + 1);
    const raw = (line[Math.floor(idx / per)] >> shift) & max;
    // Palette indices must stay indices; sample depths scale to 8-bit.
    return channels === 1 && max !== 255 ? raw : raw;
  });
}

// ------------------------------------------------------------------ scoring --

/** Score one icon file against one tile. */
async function scoreIcon(path: string, tile: RGB): Promise<ThemeScore> {
  let stat: Deno.FileInfo;
  try {
    stat = await Deno.stat(path);
  } catch {
    return { ok: false, icon: path, note: "icon file does not exist" };
  }
  if (!stat.isFile) {
    return { ok: false, icon: path, note: "icon is not a file" };
  }

  if (path.toLowerCase().endsWith(".svg")) {
    const { inks } = svgInks(await Deno.readTextFile(path));
    if (inks.length === 0) {
      return { ok: true, icon: path, note: "no inks found — not scored" };
    }
    return { ...best(inks, tile), icon: path };
  }
  if (path.toLowerCase().endsWith(".png")) {
    const pixels = await pngPixels(await Deno.readFile(path));
    if (!pixels || pixels.length === 0) {
      return {
        ok: true,
        icon: path,
        note: "raster not decodable — not scored",
      };
    }
    // A raster mark reads when a real share of it is separable, not when one
    // stray anti-aliased pixel is: 10% of the opaque area has to clear the bar.
    const good = pixels.filter((p) => separable(p, tile)).length;
    const scored = best(pixels, tile);
    return { ...scored, ok: good / pixels.length >= 0.1, icon: path };
  }
  return { ok: true, icon: path, note: `unsupported icon format — not scored` };
}

/** The most separable ink in the set, and whether it clears the bar. */
function best(inks: RGB[], tile: RGB): ThemeScore {
  let top = { deltaE: -1, contrast: 0, ok: false };
  for (const ink of inks) {
    const dE = deltaE(ink, tile);
    if (dE > top.deltaE) {
      top = {
        deltaE: dE,
        contrast: contrastRatio(luminance(ink), luminance(tile)),
        ok: separable(ink, tile),
      };
    }
    if (separable(ink, tile)) top.ok = true;
  }
  return {
    ok: top.ok,
    deltaE: round(top.deltaE),
    contrast: round(top.contrast),
  };
}

const round = (n: number) => Math.round(n * 100) / 100;

// ----------------------------------------------------------------- manifest --

interface Appearance {
  icon?: {
    svg?: string;
    url?: string;
    sizes?: Record<string, string>;
    alt?: string;
  };
  darkMode?: { icon?: { svg?: string; url?: string; alt?: string } };
  assetsRoot?: string;
}

function appearanceOf(pkg: Record<string, unknown>): Appearance {
  const w6w = (pkg.w6w ?? {}) as Record<string, unknown>;
  return (w6w.appearance ?? {}) as Appearance;
}

/** Absolute path an ImageObject ref resolves to, or null for a remote/absent one. */
function resolveRef(
  dir: string,
  pkg: Record<string, unknown>,
  ref: { svg?: string; url?: string } | undefined,
): string | null {
  const path = ref?.svg ?? ref?.url;
  if (!path || /^(https?|data):/.test(path)) return null;
  const assetsRoot = ((pkg.w6w ?? {}) as Record<string, string>).assetsRoot;
  const base = assetsRoot ? `${dir}/${assetsRoot}` : dir;
  return `${base}/${path}`.replace(/\/\.\//g, "/");
}

/** Audit one app directory. */
export async function verdictFor(app: string): Promise<IconVerdict> {
  const dir = `${APPS_DIR}/${app}`;
  const pkg = JSON.parse(await Deno.readTextFile(`${dir}/package.json`));
  const appearance = appearanceOf(pkg);
  const lightPath = resolveRef(dir, pkg, appearance.icon);
  const darkPath = resolveRef(dir, pkg, appearance.darkMode?.icon);

  if (!lightPath) {
    const note = appearance.icon
      ? "icon declares no `svg`/`url` ref (ImageObject has no other slot a host reads)"
      : "no `appearance.icon`";
    return {
      app,
      light: { ok: false, note },
      dark: { ok: false, note },
      lightInks: [],
      defaultBlack: false,
      hasDarkVariant: Boolean(darkPath),
    };
  }

  const light = await scoreIcon(lightPath, parseColor(TILE.light)!);
  const dark = await scoreIcon(darkPath ?? lightPath, parseColor(TILE.dark)!);
  const scan = lightPath.endsWith(".svg")
    ? svgInks(await Deno.readTextFile(lightPath))
    : { inks: [], defaultBlack: false };
  return {
    app,
    light,
    dark,
    lightInks: dedupe(scan.inks),
    defaultBlack: scan.defaultBlack,
    hasDarkVariant: Boolean(darkPath),
  };
}

function dedupe(inks: RGB[]): RGB[] {
  const seen = new Map<string, RGB>();
  for (const ink of inks) seen.set(ink.join(","), ink);
  return [...seen.values()];
}

// ---------------------------------------------------------------------- fix --

const hex = ([r, g, b]: RGB) =>
  `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;

/**
 * Re-ink a one-colour mark to white, preserving the artwork byte-for-byte.
 *
 * Two shapes to handle: an export that names its colour (replace that token
 * wherever it is declared — attribute, inline style or `<style>` rule), and one
 * that names none and relies on SVG's black initial value (give the root a
 * `fill`, which every child then inherits).
 */
export function reverseToWhite(
  svg: string,
  inks: RGB[],
  defaultBlack: boolean,
): { svg: string; from: string } | null {
  const tile = parseColor(TILE.dark)!;
  const dark = inks.filter((ink) => !separable(ink, tile));
  if (inks.length > dark.length) return null; // multi-ink: a plate is a brand call

  let out = svg;
  const from: string[] = [];

  // Colours the file names: swap the token wherever it is declared.
  for (const ink of dark) {
    const token = hex(ink);
    const short = `#${token[1]}${token[3]}${token[5]}`;
    const names = Object.entries(NAMED)
      .filter(([, rgb]) => rgb.join() === ink.join())
      .map(([name]) => name);
    for (const form of [token, short, ...names]) {
      const next = out.replace(
        new RegExp(`(?<=[:"'\\s])${escapeRe(form)}(?=[;"'\\s]|$)`, "gi"),
        "#ffffff",
      );
      if (next !== out) {
        out = next;
        if (!from.includes(token)) from.push(token);
      }
    }
  }

  // Colours the file does NOT name: the mark relies on SVG's black initial
  // value, so the reversal is a root `fill` for every child to inherit.
  if (defaultBlack) {
    const root = /<svg\b[^>]*>/i.exec(out);
    if (!root) return null;
    if (/\bfill\s*=\s*"/i.test(root[0])) return null; // an explicit root fill is not ours to move
    out = out.replace(/<svg\b/i, `<svg fill="#ffffff"`);
    from.push("SVG's black default");
  }

  return out === svg ? null : { svg: out, from: from.join(", ") };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Patch package.json: declare the dark variant and bump the patch version. */
function patchManifest(
  pkg: Record<string, unknown>,
  ref: string,
): Record<string, unknown> {
  const w6w = { ...(pkg.w6w as Record<string, unknown>) };
  const appearance = { ...(w6w.appearance as Appearance) };
  appearance.darkMode = {
    ...appearance.darkMode,
    icon: {
      svg: ref,
      ...(appearance.icon?.alt ? { alt: appearance.icon.alt } : {}),
    },
  };
  w6w.appearance = appearance;
  return { ...pkg, version: bumpPatch(String(pkg.version ?? "0.1.0")), w6w };
}

export function bumpPatch(version: string): string {
  const m = /^(\d+)\.(\d+)\.(\d+)(.*)$/.exec(version);
  if (!m) return version;
  return `${m[1]}.${m[2]}.${Number(m[3]) + 1}${m[4]}`;
}

async function fixApp(app: string, write: boolean): Promise<string> {
  const v = await verdictFor(app);
  if (v.dark.ok) return `${app}: already legible in dark mode — skipped`;
  if (v.hasDarkVariant) {
    return `${app}: declares a dark variant that still fails — fix by hand`;
  }
  const dir = `${APPS_DIR}/${app}`;
  const pkg = JSON.parse(await Deno.readTextFile(`${dir}/package.json`));
  const lightPath = resolveRef(dir, pkg, appearanceOf(pkg).icon);
  if (!lightPath || !lightPath.endsWith(".svg")) {
    return `${app}: raster icon — needs a hand-authored plate`;
  }
  const svg = await Deno.readTextFile(lightPath);
  const reversed = reverseToWhite(svg, v.lightInks, v.defaultBlack);
  if (!reversed) {
    return `${app}: ${
      v.lightInks.length > 1 ? "multi-ink mark" : "mark the tool cannot re-ink"
    } — needs a hand-authored plate`;
  }

  const out = lightPath.replace(/icon\.svg$/, "icon.dark.svg");
  const ref = `./${out.slice(dir.length + 1)}`;
  if (write) {
    await Deno.writeTextFile(out, reversed.svg);
    const patched = patchManifest(pkg, ref);
    await Deno.writeTextFile(
      `${dir}/package.json`,
      JSON.stringify(patched, null, 2) + "\n",
    );
    return `${app}: wrote ${ref} (${reversed.from} → #ffffff), version → ${patched.version}`;
  }
  return `${app}: would write ${ref} (${reversed.from} → #ffffff)`;
}

// ---------------------------------------------------------------------- CLI --

async function listApps(): Promise<string[]> {
  const out: string[] = [];
  for await (const e of Deno.readDir(APPS_DIR)) {
    if (e.isDirectory) out.push(e.name);
  }
  return out.sort();
}

if (import.meta.main) {
  const args = Deno.args.filter((a) => !a.startsWith("-"));
  const flags = new Set(Deno.args.filter((a) => a.startsWith("-")));
  const command = args[0] === "fix" || args[0] === "check"
    ? args.shift()!
    : "check";
  const apps = args.length > 0 ? args : await listApps();

  if (command === "fix") {
    const write = !flags.has("--dry-run");
    for (const app of apps) console.log(await fixApp(app, write));
    if (!write) console.log("\n(dry run — nothing written)");
    Deno.exit(0);
  }

  const verdicts = await Promise.all(apps.map(verdictFor));
  const failed = verdicts.filter((v) => !v.light.ok || !v.dark.ok);
  if (flags.has("--json")) {
    console.log(JSON.stringify(verdicts, null, 2));
  } else {
    for (const v of failed) {
      for (const theme of ["light", "dark"] as const) {
        const s = v[theme];
        if (s.ok) continue;
        const detail = s.note ??
          `ΔE ${s.deltaE} / contrast ${s.contrast} against the ${theme} tile ${
            TILE[theme]
          }`;
        console.log(`FAIL  ${v.app.padEnd(20)} ${theme.padEnd(5)} ${detail}`);
      }
    }
    console.log(
      `\n${verdicts.length} apps scanned, ${failed.length} illegible in at least one theme.`,
    );
  }
  Deno.exit(failed.length > 0 ? 1 : 0);
}
