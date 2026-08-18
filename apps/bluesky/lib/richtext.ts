/**
 * Rich text facets — the thing about Bluesky that silently produces wrong
 * output, and the reason this app builds them rather than passing text through.
 *
 * ## The server does not parse your text
 *
 * Post a link and it renders as **plain grey text**. Mention `@alice.bsky.social`
 * and it is not a mention, just characters. Use a `#hashtag` and it is not a
 * tag. None of this errors — the post is created, it looks fine in the API
 * response, and it is inert in every client.
 *
 * What makes them live is the `facets` array: an explicit list of
 * `{index: {byteStart, byteEnd}, features: [...]}` annotations the *client* is
 * expected to compute. From the lexicon (`app.bsky.richtext.facet`,
 * `byteSlice`): *"Specifies the sub-string range a facet feature applies to.
 * Start index is inclusive, end index is exclusive. Indices are zero-indexed,
 * counting bytes"*.
 *
 * ## Counting bytes, not characters
 *
 * This is the trap inside the trap. JavaScript string indices are UTF-16 code
 * units; facet indices are **UTF-8 bytes**. For pure ASCII they agree, which is
 * exactly why the bug ships: it works in testing and breaks the first time
 * somebody puts an emoji or an accent before a link.
 *
 *     "👋 https://example.com".indexOf("https")  →  3   (UTF-16 units)
 *     the same position in UTF-8 bytes           →  5
 *
 * Two bytes out, and the link's highlight starts inside the URL — or the post
 * is rejected outright, depending on where it lands. So every offset here is
 * computed on the encoded bytes.
 *
 * ## Two different length limits
 *
 * The lexicon puts `maxGraphemes: 300` and `maxLength: 3000` on `text`. Those
 * are different units and both apply: 300 **graphemes** (what a person calls a
 * character — an emoji with a skin-tone modifier is one) and 3000 **bytes**.
 * `"a".repeat(300)` passes; 300 emoji do not.
 */

const encoder = new TextEncoder();

/** UTF-8 byte length, which is what every facet index counts in. */
export function byteLength(text: string): number {
  return encoder.encode(text).length;
}

/**
 * Grapheme count, as `maxGraphemes` means it.
 *
 * Uses `Intl.Segmenter` where the runtime has it — Deno does — and falls back
 * to counting code points, which over-counts an emoji family but never
 * under-counts, so the check stays conservative rather than letting a too-long
 * post through.
 */
export function graphemeCount(text: string): number {
  const Segmenter = (Intl as unknown as {
    Segmenter?: new (l?: string, o?: unknown) => {
      segment(s: string): Iterable<unknown>;
    };
  }).Segmenter;
  if (Segmenter) {
    const segmenter = new Segmenter(undefined, { granularity: "grapheme" });
    let count = 0;
    for (const _ of segmenter.segment(text)) count++;
    return count;
  }
  return [...text].length;
}

export const MAX_GRAPHEMES = 300;
export const MAX_BYTES = 3000;

export interface ByteSlice {
  byteStart: number;
  byteEnd: number;
}

export interface Facet {
  index: ByteSlice;
  features: Array<Record<string, unknown>>;
}

/** A span found in the text, before its feature is resolved. */
export interface Span extends ByteSlice {
  text: string;
  kind: "link" | "mention" | "tag";
}

/**
 * Find every URL, mention and hashtag, with **byte** offsets.
 *
 * The patterns follow the reference implementation in Bluesky's own
 * `@atproto/api` rich-text detection closely enough to agree on ordinary text:
 * a URL must start at a boundary and stops before trailing punctuation, a
 * handle must look like a domain, and a tag stops at whitespace or punctuation.
 */
export function findSpans(text: string): Span[] {
  const spans: Span[] = [];
  // Byte offset of each UTF-16 index, computed once — the whole point.
  const byteAt = (index: number) => byteLength(text.slice(0, index));

  // Links. The trailing-punctuation trim matters: "see https://example.com."
  // should not put the full stop inside the URL.
  const linkPattern =
    /(^|\s|\()((?:https?:\/\/[\S]+)|(?:(?<domain>[a-z][a-z0-9]*(?:\.[a-z0-9]+)+)[\S]*))/gim;
  for (const match of text.matchAll(linkPattern)) {
    let url = match[2];
    if (!/^https?:\/\//i.test(url)) {
      // A bare domain only counts if its TLD is plausible; otherwise "e.g" and
      // filenames become links.
      const domain = match.groups?.domain;
      if (!domain || !isProbablyTld(domain)) continue;
      url = `https://${url}`;
    }
    let start = (match.index ?? 0) + match[1].length;
    let end = start + match[2].length;
    // Trim trailing punctuation that is almost never part of a URL.
    while (end > start && /[.,;:!?'")\]]/.test(text[end - 1])) {
      end--;
      url = url.slice(0, -1);
    }
    spans.push({ byteStart: byteAt(start), byteEnd: byteAt(end), text: url, kind: "link" });
    start = end;
  }

  // Mentions. A handle is a domain name, so it must contain a dot.
  const mentionPattern = /(^|\s|\()(@([a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]))/g;
  for (const match of text.matchAll(mentionPattern)) {
    const handle = match[3];
    if (!handle.includes(".")) continue;
    const start = (match.index ?? 0) + match[1].length;
    const end = start + match[2].length;
    spans.push({ byteStart: byteAt(start), byteEnd: byteAt(end), text: handle, kind: "mention" });
  }

  // Tags. The lexicon says the facet value excludes the leading '#'.
  const tagPattern = /(^|\s)(#[^\d\s][^\s­⁠ ​‌‍⃢]*)/g;
  for (const match of text.matchAll(tagPattern)) {
    let tag = match[2];
    while (tag.length > 1 && /[.,;:!?'")\]]/.test(tag[tag.length - 1])) tag = tag.slice(0, -1);
    if (tag.length <= 1) continue;
    const start = (match.index ?? 0) + match[1].length;
    const end = start + tag.length;
    spans.push({ byteStart: byteAt(start), byteEnd: byteAt(end), text: tag.slice(1), kind: "tag" });
  }

  // Overlaps would be rejected; first match wins, in text order.
  spans.sort((a, b) => a.byteStart - b.byteStart);
  const kept: Span[] = [];
  for (const span of spans) {
    if (kept.length > 0 && span.byteStart < kept[kept.length - 1].byteEnd) continue;
    kept.push(span);
  }
  return kept;
}

/** A one-label TLD guess, to keep "e.g" and "file.txt" from becoming links. */
function isProbablyTld(domain: string): boolean {
  const tld = domain.split(".").pop() ?? "";
  return tld.length >= 2 && !/^\d+$/.test(tld) && !NON_TLDS.has(tld.toLowerCase());
}

/** Extensions that look like TLDs and are not. */
const NON_TLDS = new Set([
  "js",
  "ts",
  "json",
  "txt",
  "md",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "pdf",
  "csv",
  "yml",
  "yaml",
  "html",
  "css",
  "py",
  "rs",
  "go",
  "java",
  "rb",
  "php",
  "exe",
  "zip",
  "tar",
  "gz",
]);

/**
 * Build the `facets` array for a post.
 *
 * Mentions need the account's **DID**, which the text does not contain — so a
 * resolver is passed in, and a handle that does not resolve is left as plain
 * text rather than failing the whole post. Somebody deleting their account
 * should not break a scheduled post that happened to mention them.
 */
export async function buildFacets(
  text: string,
  resolveHandle: (handle: string) => Promise<string | undefined>,
): Promise<{ facets: Facet[]; unresolved: string[] }> {
  const facets: Facet[] = [];
  const unresolved: string[] = [];

  for (const span of findSpans(text)) {
    const index: ByteSlice = { byteStart: span.byteStart, byteEnd: span.byteEnd };
    if (span.kind === "link") {
      facets.push({
        index,
        features: [{ $type: "app.bsky.richtext.facet#link", uri: span.text }],
      });
      continue;
    }
    if (span.kind === "tag") {
      facets.push({
        index,
        features: [{ $type: "app.bsky.richtext.facet#tag", tag: span.text }],
      });
      continue;
    }
    const did = await resolveHandle(span.text);
    if (!did) {
      unresolved.push(span.text);
      continue;
    }
    facets.push({
      index,
      features: [{ $type: "app.bsky.richtext.facet#mention", did }],
    });
  }

  return { facets, unresolved };
}

/** Both limits, checked together, because they are in different units. */
export function checkLength(text: string): void {
  const graphemes = graphemeCount(text);
  if (graphemes > MAX_GRAPHEMES) {
    throw new Error(
      `the post is ${graphemes} graphemes and the limit is ${MAX_GRAPHEMES}. Note this counts ` +
        "GRAPHEMES, not characters or bytes — an emoji with a skin-tone modifier is one",
    );
  }
  const bytes = byteLength(text);
  if (bytes > MAX_BYTES) {
    throw new Error(
      `the post is ${bytes} UTF-8 bytes and the limit is ${MAX_BYTES}. Both limits apply: ` +
        `${MAX_GRAPHEMES} graphemes AND ${MAX_BYTES} bytes`,
    );
  }
}
