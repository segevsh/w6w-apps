/**
 * Normalize an app icon's *geometry* — not its artwork.
 *
 * A host draws every mark into one square tile (`AppIcon`), so the pack only
 * looks like a set if every mark arrives pre-squared and pre-inset. Left to the
 * vendors, they do not: before this tool ran, aspect ratios spanned 4.65:1
 * (flodesk) to 0.67:1 (figma) — a wordmark squeezed into a letterbox at one end,
 * a mark the tile squashed at the other — and 55 of them ran edge-to-edge in
 * their own viewBox, which reads as cropped once the tile rounds its corners.
 * Marks that floated in a 30%-of-canvas box read as tiny next to those.
 *
 * This rewrites each icon to a square `0 0 100 100` canvas with the ink trimmed
 * to its true bounding box and scaled to a fixed fraction of the canvas, so
 * optical weight is uniform across the pack and nothing kisses an edge. Run it
 * after installing any new mark.
 *
 * The original artwork is never touched: it is re-parented, verbatim, into a
 * nested `<svg>` whose viewBox is the measured ink box. A nested viewport is
 * the one re-frame that survives `<style>` rules, `<mask maskUnits=
 * "userSpaceOnUse">`, gradients and `<use>` — a `transform` on a wrapper `<g>`
 * does not, because it moves the geometry out from under coordinates those
 * features resolve in the *original* user space. The nested viewBox is stated
 * in exactly those original units, so they keep resolving.
 *
 * Measuring needs a real renderer — `rsvg-convert` (librsvg) and ImageMagick's
 * `convert`/`identify`. ImageMagick's own SVG parser is not a substitute: it
 * silently mangles gradients, `<style>` rules and `<use>`, which would put the
 * ink box around the wrong thing. Neither binary is on the devcontainer host,
 * and the `api` service (which has Deno) does not ship them either, so install
 * them there once per container:
 *
 *   docker compose -f .devcontainer/docker-compose.yml exec -T -u root api \
 *     sh -c 'apt-get update && apt-get install -y librsvg2-bin imagemagick'
 *   docker compose -f .devcontainer/docker-compose.yml exec -T api \
 *     sh -c 'cd /app/packages/apps/_tools && deno task icons:normalize'
 *
 * Usage:
 *   deno run -A icon-normalize.ts --all [--fill 0.92] [--dry]
 *   deno run -A icon-normalize.ts <file.svg> [...]
 *
 * Re-running is safe: the tool recognises its own output and unwraps one layer
 * before measuring, so a second pass reproduces the first rather than nesting.
 */

const APPS = "/app/packages/apps/apps";
/** Fraction of the square canvas the ink's longer side fills. */
const DEFAULT_FILL = 0.92;
/** Render size used to measure the ink box. Larger = finer bbox, slower. */
const PROBE = 512;
const CANVAS = 100;

async function run(cmd: string, args: string[]): Promise<string> {
  const p = new Deno.Command(cmd, { args, stdout: "piped", stderr: "piped" });
  const { code, stdout, stderr } = await p.output();
  if (code !== 0) {
    throw new Error(`${cmd} failed: ${new TextDecoder().decode(stderr)}`);
  }
  return new TextDecoder().decode(stdout);
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The source's own user-space viewport: viewBox if present, else width/height. */
function sourceViewport(svg: string): Box | null {
  const vb = svg.match(
    /\sviewBox\s*=\s*["']\s*([-\d.eE]+)[,\s]+([-\d.eE]+)[,\s]+([-\d.eE]+)[,\s]+([-\d.eE]+)/,
  );
  if (vb) return { x: +vb[1], y: +vb[2], w: +vb[3], h: +vb[4] };
  const w = svg.match(/<svg[^>]*\swidth\s*=\s*["']([\d.]+)/);
  const h = svg.match(/<svg[^>]*\sheight\s*=\s*["']([\d.]+)/);
  if (w && h) return { x: 0, y: 0, w: +w[1], h: +h[1] };
  return null;
}

/** Ink bounding box, in the source's user units. */
async function inkBox(file: string, vp: Box): Promise<Box> {
  const png = await Deno.makeTempFile({ suffix: ".png" });
  try {
    await run("rsvg-convert", [
      "-w",
      `${PROBE}`,
      "-h",
      `${PROBE}`,
      "-a",
      "-b",
      "none",
      file,
      "-o",
      png,
    ]);
    const size = (await run("identify", ["-format", "%w %h", png])).trim()
      .split(/\s+/).map(Number);
    // `-trim` crops away whatever the CORNER pixel is, not whatever is
    // transparent. On a mark that fills its viewBox with an opaque plate —
    // PagerDuty's green square, Stripe's purple one — the corner pixel *is* the
    // plate, so a bare trim eats the plate and returns the bbox of the glyph
    // printed on it. Framing that would blow the glyph up and cut the plate off.
    // A one-pixel transparent border makes the corner unambiguously "nothing",
    // so the trim stops at the first pixel with any ink in it; the offsets then
    // count from the border, hence the -1.
    const geom = (await run("convert", [
      png,
      "-bordercolor",
      "none",
      "-border",
      "1",
      "-trim",
      "-format",
      "%w %h %X %Y",
      "info:",
    ])).trim();
    const [bw, bh, bx, by] = geom.split(/\s+/).map((s) =>
      Number(s.replace("+", ""))
    );
    const [ox, oy] = [bx - 1, by - 1];
    const [pw, ph] = size;
    // rsvg maps the whole viewport into pw × ph, so px → user units is linear.
    return {
      x: vp.x + (ox / pw) * vp.w,
      y: vp.y + (oy / ph) * vp.h,
      w: (bw / pw) * vp.w,
      h: (bh / ph) * vp.h,
    };
  } finally {
    await Deno.remove(png).catch(() => {});
  }
}

/** Split `<svg …>inner</svg>` into the root's attributes and its children. */
function splitRoot(svg: string): { attrs: string; inner: string } {
  const open = svg.match(/<svg\b([^>]*)>/);
  if (!open) throw new Error("no <svg> root");
  const start = open.index! + open[0].length;
  const end = svg.lastIndexOf("</svg>");
  return {
    attrs: open[1],
    inner: svg.slice(start, end === -1 ? undefined : end),
  };
}

/**
 * Attributes that describe the *old* framing (or duplicate what the new root
 * states) are dropped; everything else — `fill`, `style`, `stroke-linejoin`,
 * `xmlns:xlink`, … — is inherited state the artwork still needs.
 */
const DROP =
  /^(width|height|viewBox|x|y|preserveAspectRatio|id|version|role|aria-label|class|enable-background|xml:space)$/i;

function keptAttrs(attrs: string): string {
  const out: string[] = [];
  const re = /([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  for (let m = re.exec(attrs); m; m = re.exec(attrs)) {
    if (DROP.test(m[1])) continue;
    if (m[1].toLowerCase() === "xmlns") continue; // stated on the new root
    out.push(`${m[1]}="${m[3] ?? m[4]}"`);
  }
  return out.length ? " " + out.join(" ") : "";
}

/** `<title>` belongs to the new root, not to a nested viewport. */
function takeTitle(inner: string): { title: string | null; rest: string } {
  const m = inner.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return { title: null, rest: inner };
  return { title: m[1].trim(), rest: inner.replace(m[0], "") };
}

/**
 * What the mark says it is. Most vendor exports carry no `<title>` at all, and
 * the few that do sometimes carry the designer's artboard name ("Artboard 1"),
 * so the app's own manifest is the better authority. A named mark is what lets
 * a test tell the vendor's artwork from a look-alike.
 */
async function labelFor(
  file: string,
  fromSource: string | null,
): Promise<string | null> {
  const pkgPath = file.replace(/\/assets\/[^/]+$/, "/package.json");
  try {
    const w6w = JSON.parse(await Deno.readTextFile(pkgPath)).w6w ?? {};
    const declared = w6w.appearance?.icon?.alt ?? w6w.displayName;
    if (typeof declared === "string" && declared.trim()) return declared.trim();
  } catch {
    // Not an app dir (or an unreadable manifest) — fall back to the artwork.
  }
  return fromSource;
}

function round(n: number): string {
  return (Math.round(n * 1000) / 1000).toString();
}

/** The root this tool writes, so it can recognise (and undo) its own output. */
const ROOT_OPEN =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}" width="${CANVAS}" height="${CANVAS}" role="img"`;

/**
 * Undo one wrap, so running the tool twice is the same as running it once.
 * Without this a re-run would nest a viewport inside a viewport: the geometry
 * would still come out right, but the file would grow a layer every pass.
 */
function unwrap(svg: string): string {
  if (!svg.startsWith(ROOT_OPEN)) return svg;
  const openEnd = svg.indexOf(">") + 1;
  let body = svg.slice(openEnd, svg.lastIndexOf("</svg>"));
  body = body.replace(/^\s*<title[^>]*>[\s\S]*?<\/title>/i, "");
  // The nested viewport's framing attributes are this tool's, not the artwork's.
  return body.trim().replace(
    /^<svg\b([^>]*)>/,
    (_m, attrs: string) =>
      `<svg xmlns="http://www.w3.org/2000/svg"${
        attrs.replace(
          /\s(x|y|width|height|preserveAspectRatio|overflow)\s*=\s*("[^"]*"|'[^']*')/g,
          "",
        )
      }>`,
  );
}

export async function normalize(
  file: string,
  fill: number,
): Promise<string | null> {
  const raw = unwrap(await Deno.readTextFile(file));
  const vp = sourceViewport(raw);
  if (!vp) {
    throw new Error(
      `${file}: no viewBox and no width/height — cannot frame it`,
    );
  }

  // Measure the artwork, never the frame a previous pass put around it — and
  // never in place, because `--dry` has to leave the tree untouched.
  const probe = await Deno.makeTempFile({ suffix: ".svg" });
  let ink: Box;
  try {
    await Deno.writeTextFile(probe, raw);
    ink = await inkBox(probe, vp);
  } finally {
    await Deno.remove(probe).catch(() => {});
  }
  if (!(ink.w > 0 && ink.h > 0)) throw new Error(`${file}: empty ink box`);

  const scale = (CANVAS * fill) / Math.max(ink.w, ink.h);
  const w = ink.w * scale;
  const h = ink.h * scale;
  const x = (CANVAS - w) / 2;
  const y = (CANVAS - h) / 2;

  const { attrs, inner } = splitRoot(raw);
  const { title, rest } = takeTitle(inner);
  const label = (await labelFor(file, title)) ?? "";

  // A hairline of slack around the measured box: -trim rounds to whole pixels,
  // so a stroke's outermost antialiased row can sit a fraction outside it.
  // `overflow="visible"` keeps that fraction from being clipped by the nested
  // viewport, which would leave a visibly flat edge on round marks.
  const nested =
    `<svg${keptAttrs(attrs)} x="${round(x)}" y="${round(y)}" width="${
      round(w)
    }" height="${round(h)}"` +
    ` viewBox="${round(ink.x)} ${round(ink.y)} ${round(ink.w)} ${
      round(ink.h)
    }"` +
    ` preserveAspectRatio="xMidYMid meet" overflow="visible">`;

  const out =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}" width="${CANVAS}" height="${CANVAS}" role="img"${
      label ? ` aria-label="${label}"` : ""
    }>` +
    (label ? `<title>${label}</title>` : "") +
    nested + rest.trim() + `</svg></svg>\n`;

  return out;
}

if (import.meta.main) {
  const args = [...Deno.args];
  const dry = args.includes("--dry");
  const all = args.includes("--all");
  const fi = args.indexOf("--fill");
  const fill = fi >= 0 ? Number(args[fi + 1]) : DEFAULT_FILL;
  const files: string[] = [];

  if (all) {
    for await (const d of Deno.readDir(APPS)) {
      if (!d.isDirectory) continue;
      for await (const a of Deno.readDir(`${APPS}/${d.name}/assets`)) {
        if (a.name.endsWith(".svg")) {
          files.push(`${APPS}/${d.name}/assets/${a.name}`);
        }
      }
    }
  } else {
    files.push(...args.filter((a) => a.endsWith(".svg")));
  }
  files.sort();

  let ok = 0;
  const failed: string[] = [];
  for (const f of files) {
    try {
      const out = await normalize(f, fill);
      if (out && !dry) await Deno.writeTextFile(f, out);
      ok++;
    } catch (e) {
      failed.push(`${f}: ${(e as Error).message}`);
    }
  }
  console.log(`normalized ${ok}/${files.length}${dry ? " (dry run)" : ""}`);
  for (const f of failed) console.log(`FAIL ${f}`);
}
