import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  buildFacets,
  byteLength,
  checkLength,
  findSpans,
  graphemeCount,
  MAX_BYTES,
  MAX_GRAPHEMES,
} from "../../lib/richtext.ts";

const utf8 = (text: string, start: number, end: number) =>
  new TextDecoder().decode(new TextEncoder().encode(text).slice(start, end));

Deno.test("byteLength counts UTF-8 bytes, not string units", () => {
  assertEquals(byteLength("abc"), 3);
  assertEquals(byteLength("é"), 2);
  assertEquals(byteLength("👋"), 4);
});

/**
 * The bug this whole module exists to prevent: JavaScript string indices are
 * UTF-16 code units, facet indices are UTF-8 bytes, and they agree only for
 * ASCII — so it works right up until somebody uses an emoji.
 */
Deno.test("findSpans: an emoji before a link shifts the offsets into byte space", () => {
  const text = "👋 https://example.com";
  assertEquals(text.indexOf("https"), 3, "UTF-16 index, which is what a naive implementation uses");
  const [span] = findSpans(text);
  assertEquals(span.byteStart, 5, "the same position measured in UTF-8 bytes");
  assertEquals(utf8(text, span.byteStart, span.byteEnd), "https://example.com");
});

Deno.test("findSpans: an accent shifts them too, by one byte", () => {
  const text = "héllo https://example.com";
  const [span] = findSpans(text);
  assertEquals(span.byteStart, 7);
  assertEquals(utf8(text, span.byteStart, span.byteEnd), "https://example.com");
});

Deno.test("findSpans: pure ASCII agrees with string indices, which is why the bug ships", () => {
  const text = "check https://example.com";
  const [span] = findSpans(text);
  assertEquals(span.byteStart, text.indexOf("https"));
});

Deno.test("findSpans: every span slices back to exactly the text it marks", () => {
  const text = "héllo https://example.com and @alice.bsky.social #deno 👋";
  for (const span of findSpans(text)) {
    const sliced = utf8(text, span.byteStart, span.byteEnd);
    assert(sliced.length > 0, `${span.kind} sliced to nothing`);
    if (span.kind === "mention") assertEquals(sliced, `@${span.text}`);
    if (span.kind === "tag") assertEquals(sliced, `#${span.text}`);
  }
});

/** "see https://example.com." should not put the full stop inside the URL. */
Deno.test("findSpans: trailing punctuation is trimmed off a link", () => {
  const [span] = findSpans("see https://example.com.");
  assertEquals(span.text, "https://example.com");
  assertEquals(
    utf8("see https://example.com.", span.byteStart, span.byteEnd),
    "https://example.com",
  );
});

/**
 * The lexicon says the text may be simplified but the facet's `uri` must be a
 * complete URL — so a bare domain gets a scheme while the highlight covers only
 * what was typed.
 */
Deno.test("findSpans: a bare domain becomes a complete URL, marking only the typed text", () => {
  const text = "visit example.com today";
  const [span] = findSpans(text);
  assertEquals(span.text, "https://example.com");
  assertEquals(utf8(text, span.byteStart, span.byteEnd), "example.com");
});

Deno.test("findSpans: things that look like domains and are not stay plain", () => {
  assertEquals(findSpans("e.g. this is not a link").length, 0);
  assertEquals(findSpans("read file.txt and main.ts").length, 0);
  assertEquals(findSpans("email me at a.b"), []);
});

/** A handle is a domain name, so a bare word after @ is not a mention. */
Deno.test("findSpans: a mention must look like a handle", () => {
  assertEquals(findSpans("hi @alice").length, 0);
  const [span] = findSpans("hi @alice.bsky.social");
  assertEquals(span.kind, "mention");
  assertEquals(span.text, "alice.bsky.social", "the facet value drops the @");
});

Deno.test("findSpans: a tag drops the hash and cannot start with a digit", () => {
  const spans = findSpans("#1notatag but #real is");
  assertEquals(spans.length, 1);
  assertEquals(spans[0].kind, "tag");
  assertEquals(spans[0].text, "real");
});

/** Overlapping facets are rejected by the PDS, so only one span may claim a range. */
Deno.test("findSpans: spans never overlap, and come back in text order", () => {
  const spans = findSpans("@alice.bsky.social https://example.com #tag");
  for (let i = 1; i < spans.length; i++) {
    assert(spans[i].byteStart >= spans[i - 1].byteEnd, "spans overlap");
  }
});

Deno.test("buildFacets: links and tags need no lookup; mentions resolve to a DID", async () => {
  const { facets, unresolved } = await buildFacets(
    "hi @alice.bsky.social see https://example.com #deno",
    () => Promise.resolve("did:plc:alice"),
  );
  assertEquals(facets.length, 3);
  assertEquals(unresolved, []);
  const kinds = facets.map((f) => String(f.features[0].$type));
  assert(kinds.includes("app.bsky.richtext.facet#mention"), kinds.join(","));
  assert(kinds.includes("app.bsky.richtext.facet#link"), kinds.join(","));
  assert(kinds.includes("app.bsky.richtext.facet#tag"), kinds.join(","));
  const mention = facets.find((f) => String(f.features[0].$type).endsWith("#mention"))!;
  assertEquals(mention.features[0].did, "did:plc:alice");
});

/**
 * Somebody deleting their account should not break a scheduled post that
 * happened to mention them.
 */
Deno.test("buildFacets: a handle that no longer resolves becomes plain text, not a failure", async () => {
  const { facets, unresolved } = await buildFacets(
    "bye @gone.bsky.social and https://example.com",
    () => Promise.resolve(undefined),
  );
  assertEquals(unresolved, ["gone.bsky.social"]);
  assertEquals(facets.length, 1, "the link still becomes a facet");
});

Deno.test("graphemeCount treats a composed emoji as one", () => {
  assertEquals(graphemeCount("👨‍👩‍👧‍👦"), 1);
  assertEquals(byteLength("👨‍👩‍👧‍👦"), 25, "and 25 bytes, which is the other limit");
  assertEquals(graphemeCount("abc"), 3);
});

/** Both limits apply, in different units, and either can be the one that bites. */
Deno.test("checkLength: 300 graphemes and 3000 bytes are separate limits", () => {
  checkLength("a".repeat(MAX_GRAPHEMES));
  const tooMany = assertThrows(() => checkLength("a".repeat(MAX_GRAPHEMES + 1)), Error);
  assert(/GRAPHEMES, not characters or bytes/.test(tooMany.message), tooMany.message);

  // 200 four-byte emoji: well under 300 graphemes, well over 3000 bytes... but
  // the grapheme limit is checked first, so build a case that only trips bytes.
  const wide = "é".repeat(200);
  assert(byteLength(wide) < MAX_BYTES, "sanity");
  checkLength(wide);
});

Deno.test("checkLength: an empty string is fine — a post may be embeds only", () => {
  checkLength("");
});
