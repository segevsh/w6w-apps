import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  asJson,
  asOptionalJson,
  assertQuerySucceeded,
  compact,
  MetabaseClient,
  normalizeSiteUrl,
  siteUrlFromConnection,
  toList,
  truncate,
} from "../../lib/client.ts";
import { mockMetabaseCtx, queryOk, SITE_URL } from "../_helpers.ts";

Deno.test("normalizeSiteUrl: accepts the shapes users actually paste", () => {
  assertEquals(normalizeSiteUrl("https://mb.example.com"), "https://mb.example.com");
  assertEquals(normalizeSiteUrl("  https://mb.example.com/  "), "https://mb.example.com");
  // A bare hostname is upgraded to https rather than silently downgrading the
  // credential's transport to http.
  assertEquals(normalizeSiteUrl("mb.example.com"), "https://mb.example.com");
  // An explicit http:// survives — some operators do run plaintext internally.
  assertEquals(normalizeSiteUrl("http://localhost:3000"), "http://localhost:3000");
  // A path is discarded: people paste the URL of the page they were looking at.
  assertEquals(normalizeSiteUrl("https://mb.example.com/question/40"), "https://mb.example.com");
  // Including the `/api` suffix from the vendor's own curl example.
  assertEquals(normalizeSiteUrl("https://mb.example.com/api"), "https://mb.example.com");
});

Deno.test("normalizeSiteUrl: rejects what cannot be a base URL", () => {
  assertThrows(() => normalizeSiteUrl(""), Error, "empty");
  assertThrows(() => normalizeSiteUrl("   "), Error, "empty");
  assertThrows(() => normalizeSiteUrl("http://"), Error);
});

Deno.test("siteUrlFromConnection: reads display, and says so plainly when it is missing", () => {
  assertEquals(
    siteUrlFromConnection({ display: { siteUrl: "https://mb.example.com/" } } as never),
    "https://mb.example.com",
  );
  assertThrows(() => siteUrlFromConnection(undefined), Error, "records no site URL");
  assertThrows(() => siteUrlFromConnection({ display: {} } as never), Error, "records no site URL");
});

Deno.test("compact: drops blanks but keeps false and 0", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0, g: "x" }),
    { a: 1, e: false, f: 0, g: "x" },
  );
});

Deno.test("toList: an array, a single string and a comma string all mean the same thing", () => {
  assertEquals(toList(["card", "dashboard"]), ["card", "dashboard"]);
  assertEquals(toList("card"), ["card"]);
  assertEquals(toList("card, dashboard "), ["card", "dashboard"]);
  assertEquals(toList(undefined), undefined);
  assertEquals(toList(""), undefined);
  assertEquals(toList(" , "), undefined);
});

Deno.test("asJson: accepts a parsed value or the string a user typed", () => {
  assertEquals(asJson<{ a: number }>({ a: 1 }, "Query"), { a: 1 });
  assertEquals(asJson<{ a: number }>('{"a":1}', "Query"), { a: 1 });
  assertThrows(() => asJson("{nope", "Query"), Error, "not valid JSON");
  assertThrows(() => asJson(undefined, "Query"), Error, "is required");
});

Deno.test("asOptionalJson: absent is absent, not an error", () => {
  assertEquals(asOptionalJson(undefined, "Parameters"), undefined);
  assertEquals(asOptionalJson("", "Parameters"), undefined);
  assertEquals(asOptionalJson<number[]>("[1,2]", "Parameters"), [1, 2]);
});

/**
 * The heart of the app. A 202 is success and a 200 is not the only success —
 * `res.ok` is the right test and `res.status === 200` is not.
 */
Deno.test("client: a 202 is a success, because that is what Metabase returns for a query", async () => {
  const { ctx, calls } = mockMetabaseCtx([queryOk([[1, 2]])]);
  const result = await new MetabaseClient(ctx).runQuery("/api/card/40/query");
  assertEquals(result.status, "completed");
  assertEquals(result.data?.rows, [[1, 2]]);
  assertEquals(calls[0].url, `${SITE_URL}/api/card/40/query`);
  assertEquals(calls[0].method, "POST");
});

/**
 * The dominant bug class this app was built to avoid: a 2xx whose body says the
 * work failed. Metabase's `query-result` schema marks `status` required with the
 * enum `completed | failed`, and a mid-stream failure cannot change the 202 that
 * has already been sent.
 */
Deno.test("client: a 2xx carrying status:failed is a FAILURE, not an empty result", async () => {
  const { ctx } = mockMetabaseCtx([{
    status: 202,
    body: {
      status: "failed",
      row_count: 0,
      error: "[SQLITE_ERROR] SQL error or missing database (no such table: nope_xyz)",
      error_type: "invalid-query",
      data: { rows: [], cols: [] },
    },
  }]);
  const err = await assertRejects(
    () => new MetabaseClient(ctx).runQuery("/api/dataset"),
    Error,
  );
  assert(err.message.includes("query failed"));
  assert(err.message.includes("invalid-query"), "the error_type should be surfaced");
  assert(
    err.message.includes("no such table: nope_xyz"),
    "the vendor's message is the useful half",
  );
});

Deno.test("assertQuerySucceeded: strips the stack trace Metabase attaches to a failure", () => {
  const clean = assertQuerySucceeded(
    {
      status: "completed",
      row_count: 1,
      stacktrace: ["frame", "frame", "frame"],
      via: [{ status: "failed" }],
      data: { rows: [[1]] },
    } as never,
    "/api/dataset",
  );
  assertEquals("stacktrace" in clean, false);
  assertEquals("via" in clean, false);
  assertEquals(clean.status, "completed");
});

Deno.test("assertQuerySucceeded: an absent status is not invented into a failure", () => {
  // `status` is required by the schema, but a response that dropped it has
  // already passed the HTTP check; manufacturing a failure from a missing field
  // would misreport any future shape.
  const r = assertQuerySucceeded({ row_count: 0 } as never, "/api/dataset");
  assertEquals(r.row_count, 0);
});

Deno.test("assertQuerySucceeded: an empty body is an error, not a silent undefined", () => {
  assertThrows(() => assertQuerySucceeded(undefined, "/api/dataset"), Error, "empty body");
});

/**
 * Metabase repeats a multi-valued query param. Comma-joining it is a hard 400,
 * verified on the wire — so this is not a style preference.
 */
Deno.test("client: array query values are REPEATED, never comma-joined", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ body: { data: [] } }]);
  await new MetabaseClient(ctx).request("/api/search", {
    query: { q: "x", models: ["card", "dashboard"] },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("models"), ["card", "dashboard"]);
  assertEquals(url.search.includes("card%2Cdashboard"), false, "must not comma-join");
});

Deno.test("client: blank query values are skipped, but false and 0 are sent", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ body: {} }]);
  await new MetabaseClient(ctx).request("/api/database", {
    query: { a: undefined, b: null, c: "", d: false, e: 0, f: "keep" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), null);
  assertEquals(url.searchParams.get("b"), null);
  assertEquals(url.searchParams.get("c"), null);
  // `archived=false` and `skip_fields=false` are meaningful to Metabase.
  assertEquals(url.searchParams.get("d"), "false");
  assertEquals(url.searchParams.get("e"), "0");
  assertEquals(url.searchParams.get("f"), "keep");
});

Deno.test("client: a non-2xx throws with the status, the path and the vendor's body", async () => {
  const { ctx } = mockMetabaseCtx([{
    status: 400,
    statusText: "Bad Request",
    body: { "specific-errors": { query: ["missing required key"] } },
  }]);
  const err = await assertRejects(
    () => new MetabaseClient(ctx).request("/api/dataset/csv", { method: "POST", body: {} }),
    Error,
  );
  assert(err.message.includes("400"));
  assert(err.message.includes("/api/dataset/csv"));
  assert(err.message.includes("missing required key"));
});

Deno.test("client: 401 Unauthenticated is plain text, and survives into the message", async () => {
  // Metabase answers a bad or missing key with `401` and the plain-text body
  // `Unauthenticated` — not JSON. Verified on the wire.
  const { ctx } = mockMetabaseCtx([{
    status: 401,
    statusText: "Unauthorized",
    body: "Unauthenticated",
    headers: { "content-type": "text/plain" },
  }]);
  const err = await assertRejects(
    () => new MetabaseClient(ctx).request("/api/card"),
    Error,
  );
  assert(err.message.includes("401"));
  assert(err.message.includes("Unauthenticated"));
});

Deno.test("client: requestText returns the body verbatim for a CSV export", async () => {
  const { ctx, calls } = mockMetabaseCtx([{
    status: 200,
    body: "one,two\n1,2\n",
    headers: { "content-type": "text/csv" },
  }]);
  const text = await new MetabaseClient(ctx).requestText("/api/card/40/query/csv", {
    method: "POST",
    body: {},
  });
  assertEquals(text, "one,two\n1,2\n");
  assertEquals(calls[0].url, `${SITE_URL}/api/card/40/query/csv`);
});

Deno.test("client: 204 and an empty body both resolve to undefined", async () => {
  const { ctx } = mockMetabaseCtx([{ status: 204 }, { status: 200, body: "" }]);
  const client = new MetabaseClient(ctx);
  assertEquals(await client.request("/api/x"), undefined);
  assertEquals(await client.request("/api/y"), undefined);
});

Deno.test("client: never sets an auth header — that is the sign hook's job", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ body: {} }]);
  await new MetabaseClient(ctx).request("/api/card");
  const names = Object.keys(calls[0].headers);
  assertEquals(names.includes("x-api-key"), false);
  assertEquals(names.includes("authorization"), false);
  assertEquals(names.includes("x-metabase-session"), false);
});

Deno.test("truncate: keeps short text and marks what it cut", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(5000);
  const cut = truncate(long, 100);
  assertEquals(cut.length < 200, true);
  assert(cut.includes("truncated"));
});
