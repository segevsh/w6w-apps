import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search.ts";

const conn = { display: { baseUrl: "https://search.example.com", indexUid: "movies" } };

Deno.test("search: POSTs to the index's search endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { hits: [] } }], conn);
  await action.execute!({ q: "dune" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://search.example.com/indexes/movies/search");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.q, "dune");
  // 0 is a meaningful offset and must survive.
  assertEquals(body.offset, 0);
  assertEquals(body.limit, 20);
});

/**
 * The spec names the body's fields in snake_case while naming the same fields
 * camelCase on the GET form. camelCase is what the engine takes.
 */
Deno.test("search: sends camelCase field names, not the spec's snake_case", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({
    q: "dune",
    attributesToRetrieve: "title, year",
    attributesToHighlight: "title",
    matchingStrategy: "all",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.attributesToRetrieve, ["title", "year"]);
  assertEquals(body.attributesToHighlight, ["title"]);
  assertEquals(body.matchingStrategy, "all");
  assertEquals(body.attributes_to_retrieve, undefined);
  assertEquals(body.matching_strategy, undefined);
});

Deno.test("search: filters, sorts and facets reach the wire in their own shapes", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({
    filter: "genres = horror AND rating > 8",
    sort: "rating:desc, year:asc",
    facets: "genres, year",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.filter, "genres = horror AND rating > 8");
  assertEquals(body.sort, ["rating:desc", "year:asc"]);
  assertEquals(body.facets, ["genres", "year"]);
});

/** Exact counting switches Meilisearch to page-based paging. */
Deno.test("search: Count Every Match swaps offset paging for page paging", async () => {
  const estimate = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ q: "x", limit: 10, offset: 20 }, estimate.ctx);
  const a = JSON.parse(estimate.calls[0].body!);
  assertEquals([a.limit, a.offset, a.page, a.hitsPerPage], [10, 20, undefined, undefined]);

  const exact = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ q: "x", limit: 10, offset: 20, showTotalHits: true }, exact.ctx);
  const b = JSON.parse(exact.calls[0].body!);
  assertEquals([b.hitsPerPage, b.page, b.limit, b.offset], [10, 3, undefined, undefined]);
});

Deno.test("search: additional parameters are merged into the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ q: "x", extra: '{"cropLength":40}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).cropLength, 40);
});

Deno.test("search: a non-object `extra` is refused before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ q: "x", extra: "[1,2]" }, ctx),
    Error,
    "`extra` must be a JSON object",
  );
  assertEquals(calls.length, 0);
});

Deno.test("search: the index override beats the connection's default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ q: "x", indexUid: "books" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/indexes/books/search");
});

Deno.test("search: with no index anywhere it says so before calling", async () => {
  const { ctx, calls } = mockCtx([], { display: { baseUrl: "https://x.com" } });
  await assertRejects(async () => await action.execute!({ q: "x" }, ctx), Error, "no index");
  assertEquals(calls.length, 0);
  assert(action.type === "read");
});
