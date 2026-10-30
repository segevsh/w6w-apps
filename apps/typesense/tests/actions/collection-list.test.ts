import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/collection-list.ts";

const D = { display: { host: "https://search.internal:8108" } };
const collections = [
  {
    name: "products",
    num_documents: 12000,
    fields: [{ name: "name", type: "string" }, { name: "brand", type: "string", facet: true }],
    default_sorting_field: "popularity",
  },
  { name: "articles", num_documents: 300, fields: [{ name: "title", type: "string" }] },
  { name: "products_v2", num_documents: 0, fields: [] },
];

test("collection-list: returns names, counts and the largest collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: collections }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/collections");
  assertEquals(result.count, 3);
  assertEquals(result.totalDocuments, 12300);
  assertEquals((result.largest as { name: string }).name, "products");
});

/** Empty and missing look the same to a workflow reading only the count. */
test("collection-list: names the empty collections", async () => {
  const { ctx } = mockCtx([{ status: 200, body: collections }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.empty, ["products_v2"]);
});

test("collection-list: reports the facet fields of each collection", async () => {
  const { ctx } = mockCtx([{ status: 200, body: collections }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  const first = (result.collections as Array<{ facetFields: string[] }>)[0];
  assertEquals(first.facetFields, ["brand"]);
});

test("collection-list: filters on the name here, case-insensitively", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: collections }], D);
  const result = await action.execute({ nameContains: "PRODUCTS" }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 2);
  assertEquals(new URL(calls[0].url).search, "");
});

/** Typesense serves from RAM. */
test("collection-list: says a document count is roughly the RAM bill", () => {
  assert(/IN MEMORY/.test(action.description!), action.description);
});
