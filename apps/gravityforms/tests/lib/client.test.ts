import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { BASE_PATH, DISPLAY, mockCtx } from "../_helpers.ts";
import {
  boolToInt,
  GravityFormsClient,
  normalizeSiteUrl,
  queryEntries,
  resolveBaseUrl,
  serializeSearch,
} from "../../lib/client.ts";

// ------------------------------------------------------------ base URL ----
// The single easiest thing to get silently wrong for a self-hosted plugin:
// the REST route hangs off the WordPress install root, which may itself sit in
// a subdirectory.

Deno.test("normalizeSiteUrl: leaves a plain origin alone", () => {
  assertEquals(normalizeSiteUrl("https://example.com"), "https://example.com");
});

Deno.test("normalizeSiteUrl: strips one or many trailing slashes", () => {
  assertEquals(normalizeSiteUrl("https://example.com/"), "https://example.com");
  assertEquals(normalizeSiteUrl("https://example.com///"), "https://example.com");
});

Deno.test("normalizeSiteUrl: preserves a subdirectory install's path", () => {
  assertEquals(normalizeSiteUrl("https://example.com/blog"), "https://example.com/blog");
  assertEquals(normalizeSiteUrl("https://example.com/blog/"), "https://example.com/blog");
  assertEquals(normalizeSiteUrl("https://example.com/a/b/c/"), "https://example.com/a/b/c");
});

Deno.test("normalizeSiteUrl: tolerates a pasted /wp-json root", () => {
  assertEquals(normalizeSiteUrl("https://example.com/wp-json"), "https://example.com");
  assertEquals(normalizeSiteUrl("https://example.com/wp-json/"), "https://example.com");
  assertEquals(normalizeSiteUrl("https://example.com/blog/wp-json/"), "https://example.com/blog");
});

Deno.test("normalizeSiteUrl: tolerates a pasted full gf/v2 route", () => {
  assertEquals(normalizeSiteUrl("https://example.com/wp-json/gf/v2"), "https://example.com");
  assertEquals(normalizeSiteUrl("https://example.com/wp-json/gf/v2/"), "https://example.com");
  assertEquals(
    normalizeSiteUrl("https://example.com/blog/wp-json/gf/v2"),
    "https://example.com/blog",
  );
});

Deno.test("normalizeSiteUrl: trims surrounding whitespace", () => {
  assertEquals(normalizeSiteUrl("  https://example.com/  "), "https://example.com");
});

Deno.test("normalizeSiteUrl: does not eat a path that merely contains wp-json", () => {
  // Only a TRAILING /wp-json is a route root; a mid-path segment is real.
  assertEquals(
    normalizeSiteUrl("https://example.com/wp-json-mirror"),
    "https://example.com/wp-json-mirror",
  );
});

Deno.test("resolveBaseUrl: appends the gf/v2 route to a plain site", () => {
  assertEquals(
    resolveBaseUrl({ siteUrl: "https://example.com" }),
    "https://example.com/wp-json/gf/v2",
  );
});

Deno.test("resolveBaseUrl: appends the gf/v2 route to a subdirectory install", () => {
  assertEquals(
    resolveBaseUrl({ siteUrl: "https://site.com/blog" }),
    "https://site.com/blog/wp-json/gf/v2",
  );
  assertEquals(
    resolveBaseUrl({ siteUrl: "https://site.com/blog/" }),
    "https://site.com/blog/wp-json/gf/v2",
  );
});

Deno.test("resolveBaseUrl: never doubles the route when one was pasted in", () => {
  assertEquals(
    resolveBaseUrl({ siteUrl: "https://site.com/blog/wp-json/gf/v2" }),
    "https://site.com/blog/wp-json/gf/v2",
  );
});

Deno.test("resolveBaseUrl: throws when the connection carries no site URL", () => {
  assertThrows(() => resolveBaseUrl({}), Error, "missing siteUrl");
  assertThrows(() => resolveBaseUrl(undefined), Error, "missing siteUrl");
});

// ----------------------------------------------------------- query form ----

Deno.test("queryEntries: scalars pass through", () => {
  assertEquals(queryEntries({ a: "x", b: 2, c: true }), [["a", "x"], ["b", "2"], ["c", "true"]]);
});

Deno.test("queryEntries: arrays are INDEXED, as Gravity Forms requires", () => {
  assertEquals(queryEntries({ form_ids: [1, 2] }), [["form_ids[0]", "1"], ["form_ids[1]", "2"]]);
});

Deno.test("queryEntries: array indices are contiguous after empties drop out", () => {
  assertEquals(
    queryEntries({ include: ["a", "", "b"] }),
    [["include[0]", "a"], ["include[1]", "b"]],
  );
});

Deno.test("queryEntries: objects become bracketed sub-keys", () => {
  assertEquals(
    queryEntries({ paging: { page_size: 20, current_page: 2 } }),
    [["paging[page_size]", "20"], ["paging[current_page]", "2"]],
  );
});

Deno.test("queryEntries: empty, null and undefined values are dropped entirely", () => {
  assertEquals(queryEntries({ a: undefined, b: null, c: "", d: [], e: {} }), []);
  assertEquals(queryEntries({ paging: { page_size: undefined, offset: 0 } }), [[
    "paging[offset]",
    "0",
  ]]);
});

Deno.test("queryEntries: zero and false are kept, not treated as empty", () => {
  assertEquals(queryEntries({ offset: 0, flag: false }), [["offset", "0"], ["flag", "false"]]);
});

Deno.test("serializeSearch: objects are JSON-encoded, strings pass through", () => {
  assertEquals(
    serializeSearch({ field_filters: [{ key: 2, value: "test", operator: "contains" }] }),
    '{"field_filters":[{"key":2,"value":"test","operator":"contains"}]}',
  );
  assertEquals(serializeSearch('{"status":"active"}'), '{"status":"active"}');
  assertEquals(serializeSearch(undefined), undefined);
  assertEquals(serializeSearch(""), undefined);
});

Deno.test("boolToInt: true -> 1, everything else -> undefined (so it is omitted)", () => {
  assertEquals(boolToInt(true), 1);
  assertEquals(boolToInt(false), undefined);
  assertEquals(boolToInt(undefined), undefined);
});

// -------------------------------------------------------------- client ----

Deno.test("client: fromConnection builds the base URL from display.siteUrl", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await GravityFormsClient.fromConnection(ctx).request("/forms/1");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://example.com");
  assertEquals(url.pathname, `${BASE_PATH}/forms/1`);
});

Deno.test("client: fromConnection honours a subdirectory install", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], {
    display: { siteUrl: "https://site.com/blog" },
  });
  await GravityFormsClient.fromConnection(ctx).request("/entries");
  assertEquals(new URL(calls[0].url).pathname, "/blog/wp-json/gf/v2/entries");
});

Deno.test("client: sets no credential header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await GravityFormsClient.fromConnection(ctx).request("/forms");
  assertEquals(Object.keys(calls[0].headers).includes("authorization"), false);
});

Deno.test("client: JSON bodies set content-type and are stringified", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }], { display: DISPLAY });
  await GravityFormsClient.fromConnection(ctx).request("/entries", {
    method: "POST",
    body: { form_id: 1 },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ form_id: 1 }));
});

Deno.test("client: an empty body returns undefined without parsing", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }], { display: DISPLAY });
  const out = await GravityFormsClient.fromConnection(ctx).request("/entries/1");
  assertEquals(out, undefined);
});

Deno.test("client: surfaces the vendor's error code and message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    statusText: "Not Found",
    body: { code: "gf_entry_invalid_id", message: "Entry not found", data: { status: 404 } },
  }], { display: DISPLAY });
  const err = await assertRejects(
    () => GravityFormsClient.fromConnection(ctx).request("/entries/999"),
    Error,
    "Gravity Forms 404",
  );
  assert(err.message.includes("gf_entry_invalid_id"));
  assert(err.message.includes("Entry not found"));
  assert(err.message.includes("/wp-json/gf/v2/entries/999"));
});

Deno.test("client: a non-JSON error body still produces a useful error", async () => {
  const { ctx } = mockCtx([{
    status: 500,
    statusText: "Internal Server Error",
    body: "<html>fatal error</html>",
    headers: { "content-type": "text/html" },
  }], { display: DISPLAY });
  const err = await assertRejects(
    () => GravityFormsClient.fromConnection(ctx).request("/forms"),
    Error,
    "Gravity Forms 500",
  );
  assert(err.message.includes("fatal error"));
});

Deno.test("client: a non-JSON 200 body is reported rather than silently swallowed", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "not json",
    headers: { "content-type": "text/html" },
  }], {
    display: DISPLAY,
  });
  await assertRejects(
    () => GravityFormsClient.fromConnection(ctx).request("/forms"),
    Error,
    "non-JSON body",
  );
});

Deno.test("client: repeated bracket keys are appended, not overwritten", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await GravityFormsClient.fromConnection(ctx).request("/entries", {
    query: { form_ids: [1, 2, 3] },
  });
  const search = new URL(calls[0].url).search;
  assert(search.includes("form_ids%5B0%5D=1"));
  assert(search.includes("form_ids%5B1%5D=2"));
  assert(search.includes("form_ids%5B2%5D=3"));
});
