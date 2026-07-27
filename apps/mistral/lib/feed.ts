/**
 * Atom 1.0 + RSS 2.0 reader, for status feeds.
 *
 * Vendors that publish no JSON status API often publish a feed instead, and a
 * feed is a genuinely different shape from a status rollup: it is a log of
 * UPDATES, not a statement of current state. Mistral's feed makes the trap
 * concrete — 50 entries describe 26 incidents, because each update to an
 * incident is its own entry, and the newest entry for a resolved incident still
 * carries the incident's original title ("Audio API Degraded"). Reading the
 * newest entry's title reports an outage that ended days ago.
 *
 * So this module deliberately returns entries plus the identity needed to fold
 * them (`id`), and leaves the folding to the caller, which knows the vendor's
 * conventions. `latestPerId` is the fold every status feed wants.
 *
 * No dependencies and no XML parser: Deno ships none, and pulling a JSR module
 * into an app widens its supply chain for one hook. This is a tolerant scanner
 * over the subset of Atom/RSS that status feeds actually use — it does not
 * validate, and it does not try to be a general XML reader.
 */

/** One feed entry, normalised across Atom and RSS. */
export interface FeedEntry {
  /**
   * Stable identity: Atom `<id>`, RSS `<guid>`, else the link. Several entries
   * sharing one id are successive updates to the same incident.
   */
  id?: string;
  title: string;
  /** Body as plain text — CDATA unwrapped, markup stripped, entities decoded. */
  summary: string;
  /** Body as it arrived, markup intact. Use when the markup carries meaning. */
  summaryHtml: string;
  link?: string;
  published?: Date;
}

export interface Feed {
  title?: string;
  /** Newest first. Entries whose date could not be read sort last. */
  entries: FeedEntry[];
}

/** Unwrap `<![CDATA[…]]>` wrappers, keeping their contents. */
function unwrapCdata(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** Decode the XML entities a feed actually uses, plus numeric escapes. */
function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (whole, name) => ENTITIES[name.toLowerCase()] ?? whole);
}

/**
 * Block-level elements imply a word boundary; inline ones do not. Getting this
 * wrong is how `Affected services<ul><li>Audio API</li></ul>` reads back as
 * "Affected servicesAudio API".
 */
const BLOCK_TAG =
  /<\/?(?:p|div|br|hr|li|ul|ol|dl|dt|dd|tr|td|th|table|thead|tbody|section|article|header|footer|blockquote|pre|h[1-6])\b[^>]*>/gi;

/** Markup → text: block tags become a space, inline tags simply vanish. */
function stripTags(html: string): string {
  return html
    .replace(BLOCK_TAG, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Inner XML of the first `<name>` (or `<ns:name>`) element in `block`.
 * Non-greedy, so a repeated element yields its first occurrence.
 */
function pick(block: string, name: string): string | undefined {
  const re = new RegExp(
    `<(?:[a-z0-9]+:)?${name}\\b[^>]*>([\\s\\S]*?)</(?:[a-z0-9]+:)?${name}>`,
    "i",
  );
  return re.exec(block)?.[1];
}

/** An attribute off the first `<name …>` element — Atom's `<link href="…"/>`. */
function pickAttr(block: string, name: string, attr: string): string | undefined {
  const el = new RegExp(`<(?:[a-z0-9]+:)?${name}\\b([^>]*)>`, "i").exec(block)?.[1];
  if (!el) return undefined;
  return new RegExp(`\\b${attr}\\s*=\\s*["']([^"']*)["']`, "i").exec(el)?.[1];
}

/** Inner XML → plain text. */
function text(raw: string | undefined): string {
  return raw === undefined
    ? ""
    : decodeEntities(stripTags(decodeEntities(unwrapCdata(raw)))).trim();
}

/** Inner XML → markup, CDATA unwrapped and escaped markup restored. */
function html(raw: string | undefined): string {
  return raw === undefined ? "" : decodeEntities(unwrapCdata(raw)).trim();
}

function parseDate(raw: string | undefined): Date | undefined {
  if (!raw) return undefined;
  // RSS uses RFC 822 (`Mon, 02 Feb 2026 09:53:54 -0800`), Atom ISO 8601 —
  // Date.parse reads both.
  const t = Date.parse(text(raw));
  return Number.isNaN(t) ? undefined : new Date(t);
}

/** Split a document into its `<entry>` (Atom) or `<item>` (RSS) blocks. */
function blocks(xml: string, tag: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
  for (const m of xml.matchAll(re)) out.push(m[1]);
  return out;
}

/**
 * Parse an Atom or RSS document. The format is detected from the payload
 * rather than the URL or content-type, because status hosts serve both from
 * paths that do not always say which is which.
 *
 * Never throws: a feed that cannot be read yields no entries, so a caller
 * reports "cannot tell" rather than inventing an outage.
 */
export function parseFeed(xml: string): Feed {
  const isAtom = /<feed\b/i.test(xml) || /<entry\b/i.test(xml);
  const raw = isAtom ? blocks(xml, "entry") : blocks(xml, "item");

  const entries: FeedEntry[] = raw.map((block) => {
    // Atom carries the body in <summary> or <content>; RSS in <description>,
    // with <content:encoded> as the richer optional form.
    const body = pick(block, "summary") ?? pick(block, "description") ??
      pick(block, "encoded") ?? pick(block, "content");
    const link = isAtom
      ? pickAttr(block, "link", "href") ?? text(pick(block, "link"))
      : text(pick(block, "link"));
    const id = text(pick(block, "id")) || text(pick(block, "guid")) || link;
    return {
      id: id || undefined,
      title: text(pick(block, "title")),
      summary: text(body),
      summaryHtml: html(body),
      link: link || undefined,
      // Atom: <published> is when it started, <updated> when it last changed —
      // for "has anything happened lately" the latter is the honest field.
      published: parseDate(pick(block, "updated")) ?? parseDate(pick(block, "published")) ??
        parseDate(pick(block, "pubDate")) ?? parseDate(pick(block, "date")),
    };
  });

  // Feeds are conventionally newest-first but nothing guarantees it. Undated
  // entries sort last rather than being dropped — they are still evidence.
  entries.sort((a, b) =>
    (b.published?.getTime() ?? -Infinity) - (a.published?.getTime() ?? -Infinity)
  );

  return { title: text(pick(xml, "title")) || undefined, entries };
}

/**
 * Fold successive updates down to the newest entry per `id` — the shape a
 * status feed actually describes. Entries with no id are kept as themselves,
 * since there is nothing to fold them onto.
 */
export function latestPerId(entries: readonly FeedEntry[]): FeedEntry[] {
  const newest = new Map<string, FeedEntry>();
  const loose: FeedEntry[] = [];
  for (const e of entries) {
    if (!e.id) {
      loose.push(e);
      continue;
    }
    const seen = newest.get(e.id);
    const a = e.published?.getTime() ?? -Infinity;
    const b = seen?.published?.getTime() ?? -Infinity;
    if (!seen || a > b) newest.set(e.id, e);
  }
  return [...newest.values(), ...loose].sort((a, b) =>
    (b.published?.getTime() ?? -Infinity) - (a.published?.getTime() ?? -Infinity)
  );
}

/** Text of every `<li>` in a fragment — how feeds list affected components. */
export function listItems(fragment: string): string[] {
  return [...fragment.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => stripTags(decodeEntities(m[1])).trim())
    .filter(Boolean);
}
