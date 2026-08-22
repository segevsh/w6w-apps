import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/facet-search.ts";

const conn = { display: { baseUrl: "https://search.example.com", indexUid: "movies" } };

/** Searches facet VALUES, not documents — a different endpoint, not a mode. */
Deno.test("facet-search: POSTs to the facet-search endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { facetHits: [] } }], conn);
  await action.execute!({ facetName: "genres", facetQuery: "hor" }, ctx);
  assertEquals(calls[0].url, "https://search.example.com/indexes/movies/facet-search");
  assertEquals(JSON.parse(calls[0].body!), { facetName: "genres", facetQuery: "hor" });
});

Deno.test("facet-search: the document query and filter narrow the counts", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ facetName: "genres", q: "dune", filter: "year > 2000" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.q, "dune");
  assertEquals(body.filter, "year > 2000");
});

Deno.test("facet-search: a blank facet name fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`facetName`");
  assertEquals(calls.length, 0);
});
