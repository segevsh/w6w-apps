import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  compact,
  csv,
  DEFAULT_MAX_CHARACTERS,
  deriveIdempotencyKey,
  describeError,
  json,
  MastodonClient,
  maxCharactersFor,
  normalizeUrl,
  parseLink,
  query,
  stripHtml,
} from "../../lib/client.ts";

const display = { url: "https://mastodon.social", maxCharacters: 500 };

Deno.test("normalizeUrl: accepts a URL, a bare domain, and a full handle", () => {
  assertEquals(normalizeUrl("https://mastodon.social"), "https://mastodon.social");
  assertEquals(normalizeUrl("hachyderm.io"), "https://hachyderm.io");
  // People paste this as often as a URL.
  assertEquals(normalizeUrl("@alice@example.social"), "https://example.social");
  assertEquals(normalizeUrl("alice@example.social"), "https://example.social");
  assertThrows(() => normalizeUrl(""), Error, "required");
});

/** The limit is the instance's, and 500 is only Mastodon's default. */
Deno.test("maxCharactersFor: the connection's recorded limit wins over the default", () => {
  assertEquals(maxCharactersFor({ display: { maxCharacters: 5000 } } as never), 5000);
  assertEquals(maxCharactersFor({ display: {} } as never), DEFAULT_MAX_CHARACTERS);
  assertEquals(maxCharactersFor(undefined), 500);
});

/**
 * The body is a bare array with no cursor, so the Link header is the only place
 * paging state exists.
 */
Deno.test("parseLink: pulls max_id and min_id out of the Link header", () => {
  const header = '<https://x/api/v1/timelines/home?max_id=111>; rel="next", ' +
    '<https://x/api/v1/timelines/home?min_id=999>; rel="prev"';
  assertEquals(parseLink(header), { maxId: "111", minId: "999" });
  assertEquals(parseLink(null), {});
  assertEquals(parseLink("garbage"), {});
});

/** `content` is HTML, and a workflow matching on it gets markup. */
Deno.test("stripHtml: turns Mastodon's content into readable text", () => {
  assertEquals(stripHtml('<p>hello <a href="#">#tag</a></p>'), "hello #tag");
  assertEquals(stripHtml("<p>one</p><p>two</p>"), "one\n\ntwo");
  assertEquals(stripHtml("a<br/>b"), "a\nb");
  assertEquals(stripHtml("&amp;&lt;&gt;&quot;"), '&<>"');
  assertEquals(stripHtml(undefined), "");
});

Deno.test("compact, csv, json and query behave as the actions assume", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: [] }), { a: 1 });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(csv(""), undefined);
  assertEquals(json('{"a":1}', "x"), { a: 1 });
  assertThrows(() => json("{oops", "x"), Error, "`x` is not valid JSON");
  assertEquals(query({ a: "x", b: 2, c: "" }), { a: "x", b: 2 });
});

/** A fresh key would let a retry post twice; a derived one deduplicates. */
Deno.test("deriveIdempotencyKey: identical payloads give identical keys", async () => {
  const a = await deriveIdempotencyKey({ status: "hello", visibility: "public" });
  const b = await deriveIdempotencyKey({ visibility: "public", status: "hello" });
  assertEquals(a, b, "property order changed the key");
  const c = await deriveIdempotencyKey({ status: "different", visibility: "public" });
  assert(a !== c, "two different posts hashed the same");
});

Deno.test("request: builds the URL on the connection's own instance", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await new MastodonClient(ctx).request("/api/v1/accounts/verify_credentials");
  assertEquals(calls[0].url, "https://mastodon.social/api/v1/accounts/verify_credentials");
});

/** The auth hook signs; the client must never carry a token itself. */
Deno.test("request: never sets an authorization header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await new MastodonClient(ctx).request("/api/v2/instance");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("request: an idempotency key becomes the header Mastodon dedups on", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await new MastodonClient(ctx).request("/api/v1/statuses", {
    method: "POST",
    body: { status: "hi" },
    idempotencyKey: "abc",
  });
  assertEquals(calls[0].headers["idempotency-key"], "abc");
});

Deno.test("paged: returns the items alongside the Link header's ids", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [{ id: "1" }],
    headers: {
      "content-type": "application/json",
      link: '<https://x?max_id=111>; rel="next", <https://x?min_id=999>; rel="prev"',
    },
  }], { display });
  const page = await new MastodonClient(ctx).paged<Array<{ id: string }>>("/api/v1/timelines/home");
  assertEquals(page.items.length, 1);
  assertEquals(page.maxId, "111");
  assertEquals(page.minId, "999");
});

Deno.test("describeError: a 401 says a token belongs to one instance", () => {
  const message = describeError(401, JSON.stringify({ error: "The access token is invalid" }));
  assert(/issued by ONE instance/.test(message), message);
});

/** A 404 on a federated network often means "never seen", not "does not exist". */
Deno.test("describeError: a 404 names federation as a cause", () => {
  assert(/never seen the account or post/.test(describeError(404, "{}")));
});

Deno.test("describeError: 422 and 429 both name the instance as the authority", () => {
  assert(/per-instance/.test(describeError(422, "{}")));
  assert(/per instance and per token/.test(describeError(429, "{}")));
});

Deno.test("describeError: a 403 explains that scopes cannot be widened", () => {
  assert(/cannot be widened afterwards/.test(describeError(403, "{}")));
});

Deno.test("request: an error carries the method, the path and the explanation", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { error: "Text character limit exceeded" } }], {
    display,
  });
  let message = "";
  try {
    await new MastodonClient(ctx).request("/api/v1/statuses", { method: "POST" });
  } catch (err) {
    message = String(err);
  }
  assert(/422/.test(message), message);
  assert(/\/api\/v1\/statuses/.test(message), message);
  assert(/per-instance/.test(message), message);
});
