import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  baseUrlFromConnection,
  compact,
  csv,
  json,
  MeilisearchClient,
  normalizeBaseUrl,
  resolveIndex,
  TERMINAL_TASK_STATES,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

const conn = { display: { baseUrl: "https://search.example.com", indexUid: "movies" } };

/** A missing scheme must not downgrade a key in flight to plaintext. */
Deno.test("normalizeBaseUrl assumes https and strips everything past the origin", () => {
  assertEquals(normalizeBaseUrl("search.example.com"), "https://search.example.com");
  assertEquals(normalizeBaseUrl("https://search.example.com/"), "https://search.example.com");
  assertEquals(
    normalizeBaseUrl(" https://search.example.com/indexes "),
    "https://search.example.com",
  );
  assertEquals(normalizeBaseUrl("https://ms.example.com:7700"), "https://ms.example.com:7700");
});

/** The vendor's own quickstart address says http:// itself, and must survive. */
Deno.test("normalizeBaseUrl leaves an explicit http:// alone", () => {
  assertEquals(normalizeBaseUrl("http://localhost:7700"), "http://localhost:7700");
});

Deno.test("normalizeBaseUrl refuses something that is not a URL", () => {
  assertThrows(() => normalizeBaseUrl(""), Error, "Meilisearch URL is empty");
  assertThrows(() => normalizeBaseUrl("http://"), Error, "not a valid URL");
});

Deno.test("baseUrlFromConnection explains itself when the URL was never stored", () => {
  assertEquals(baseUrlFromConnection(conn as never), "https://search.example.com");
  assertThrows(
    () => baseUrlFromConnection({ display: {} } as never),
    Error,
    "records no instance URL",
  );
});

Deno.test("resolveIndex prefers the override, then the connection, then explains", () => {
  assertEquals(resolveIndex(conn as never, "books"), "books");
  assertEquals(resolveIndex(conn as never, ""), "movies");
  assertThrows(() => resolveIndex({ display: {} } as never), Error, "no index");
});

Deno.test("compact / csv / json behave as the actions expect", () => {
  assertEquals(compact({ a: 1, b: "", c: null, d: undefined, e: [], f: false }), {
    a: 1,
    f: false,
  });
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertThrows(() => json("{oops", "synonyms"), Error, "`synonyms` is not valid JSON");
});

Deno.test("the terminal task states are the three that mean the work is over", () => {
  assertEquals([...TERMINAL_TASK_STATES], ["succeeded", "failed", "canceled"]);
});

Deno.test("client: builds paths on the connection's instance", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await new MeilisearchClient(ctx).request("/indexes/movies/search", { method: "POST", body: {} });
  assertEquals(calls[0].url, "https://search.example.com/indexes/movies/search");
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("client: never sends Authorization — signing is the host's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await new MeilisearchClient(ctx).request("/stats");
  assertEquals(calls[0].headers["authorization"], undefined);
});

/** Meilisearch takes repeated values as one comma-joined parameter. */
Deno.test("client: an array query value is comma-joined, not repeated", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await new MeilisearchClient(ctx).request("/tasks", {
    query: { statuses: ["failed", "canceled"] },
  });
  assertEquals(new URL(calls[0].url).searchParams.getAll("statuses"), ["failed,canceled"]);
});

Deno.test("client: a failure surfaces the status and Meilisearch's envelope", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    statusText: "Bad Request",
    body: {
      message: "Attribute `genres` is not filterable",
      code: "invalid_search_filter",
      type: "invalid_request",
      link: "https://docs.meilisearch.com/errors#invalid_search_filter",
    },
  }], conn);
  const err = await assertRejects(
    async () => await new MeilisearchClient(ctx).request("/indexes/movies/search"),
    Error,
  );
  assert(err.message.includes("400"), err.message);
  assert(err.message.includes("invalid_search_filter"), err.message);
});

Deno.test("client: a connection with no URL fails before any request", () => {
  const { ctx } = mockCtx([], { display: {} });
  assertThrows(() => new MeilisearchClient(ctx), Error, "records no instance URL");
});

/** Offset paging: /indexes, /keys and the document listing. */
Deno.test("requestAll walks the offset until a short page", async () => {
  const full = Array.from({ length: 1000 }, (_, i) => ({ uid: `i${i}` }));
  const { ctx, calls } = mockCtx([
    { status: 200, body: { results: full, total: 1001 } },
    { status: 200, body: { results: [{ uid: "last" }], total: 1001 } },
  ], conn);
  const all = await new MeilisearchClient(ctx).requestAll("/indexes");
  assertEquals(all.length, 1001);
  assertEquals(new URL(calls[0].url).searchParams.get("offset"), "0");
  assertEquals(new URL(calls[1].url).searchParams.get("offset"), "1000");
});

Deno.test("requestAll asks for no more than it wants", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }], conn);
  await new MeilisearchClient(ctx).requestAll("/indexes", {}, 5);
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "5");
});

/**
 * Cursor paging: /tasks. `offset` is not a parameter there, so the offset walk
 * would re-read page one forever.
 */
Deno.test("requestAllFrom follows the `next` cursor rather than an offset", async () => {
  const full = Array.from({ length: 1000 }, (_, i) => ({ uid: i }));
  const { ctx, calls } = mockCtx([
    { status: 200, body: { results: full, next: 500 } },
    { status: 200, body: { results: [{ uid: 500 }], next: null } },
  ], conn);
  const all = await new MeilisearchClient(ctx).requestAllFrom("/tasks");
  assertEquals(all.length, 1001);
  assertEquals(new URL(calls[0].url).searchParams.get("from"), null);
  assertEquals(new URL(calls[1].url).searchParams.get("from"), "500");
  // Never an offset — that is the other contract.
  assertEquals(new URL(calls[1].url).searchParams.get("offset"), null);
});

Deno.test("requestAllFrom stops when the cursor is absent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [{ uid: 1 }] } }], conn);
  assertEquals((await new MeilisearchClient(ctx).requestAllFrom("/tasks")).length, 1);
  assertEquals(calls.length, 1);
});
