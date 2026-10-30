import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search.ts";

const display = { appId: "APPID" };

test("search: POSTs the query to the DSN host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { hits: [], nbHits: 0 } }], { display });
  await action.execute!({ indexName: "products", query: "shoes", hitsPerPage: 5 }, ctx);
  assertEquals(calls[0].method, "POST");
  // Reads go through the geo-replicated DSN host.
  assertEquals(calls[0].url, "https://appid-dsn.algolia.net/1/indexes/products/query");
  assertEquals(JSON.parse(calls[0].body!), { query: "shoes", hitsPerPage: 5 });
});

test("search: comma lists become arrays and filters pass through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({
    indexName: "products",
    facets: "brand, color",
    attributesToRetrieve: "name",
    facetFilters: '[["color:red"]]',
    filters: "price < 100",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.facets, ["brand", "color"]);
  assertEquals(body.attributesToRetrieve, ["name"]);
  assertEquals(body.facetFilters, [["color:red"]]);
  assertEquals(body.filters, "price < 100");
});

test("search: extraParams is merged over the modelled fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({
    indexName: "products",
    hitsPerPage: 5,
    extraParams: '{"hitsPerPage":50,"typoTolerance":false}',
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.hitsPerPage, 50);
  assertEquals(body.typoTolerance, false);
});

test("search: an index is required", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`indexName`");
  assertEquals(calls.length, 0);
});
