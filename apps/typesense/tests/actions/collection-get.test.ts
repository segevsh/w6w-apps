import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/collection-get.ts";

const D = { display: { host: "https://search.internal:8108" } };
const schema = (extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: {
    name: "products",
    num_documents: 12000,
    default_sorting_field: "popularity",
    fields: [
      { name: "name", type: "string" },
      { name: "brand", type: "string", facet: true },
      { name: "price", type: "float" },
      { name: "internal_note", type: "string", index: false },
    ],
    ...extra,
  },
});

/** `query_by` takes string fields, and naming anything else is an error. */
Deno.test("collection-get: separates searchable, facetable and unindexed fields", async () => {
  const { ctx, calls } = mockCtx([schema()], D);
  const result = await action.execute({ collection: "products" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/collections/products");
  assertEquals(result.searchableFields, ["name", "brand"]);
  assertEquals(result.facetFields, ["brand"]);
  assertEquals(result.unindexedFields, ["internal_note"], "stored, and invisible to search");
});

/** The commonest reason an import that worked yesterday fails today. */
Deno.test("collection-get: notes a schema with no catch-all", async () => {
  const { ctx, logs } = mockCtx([schema()], D);
  const result = await action.execute({ collection: "products" }, ctx) as Record<string, unknown>;
  assertEquals(result.acceptsUnknownFields, false);
  assert(
    logs.some((l) => /somebody adds a column upstream/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("collection-get: a `.*` field is recognised as the catch-all", async () => {
  const { ctx, logs } = mockCtx([schema({
    fields: [{ name: "name", type: "string" }, { name: ".*", type: "auto" }],
  })], D);
  const result = await action.execute({ collection: "products" }, ctx) as Record<string, unknown>;
  assertEquals(result.acceptsUnknownFields, true);
  assert(!logs.some((l) => /column upstream/.test(l.message)));
});

/** Without a tiebreaker, equal matches come back in an unspecified order. */
Deno.test("collection-get: notes a collection with no default sorting field", async () => {
  const { ctx, logs } = mockCtx([schema({ default_sorting_field: undefined })], D);
  const result = await action.execute({ collection: "products" }, ctx) as Record<string, unknown>;
  assertEquals(result.defaultSortingField, undefined);
  assert(
    logs.some((l) => /a different document each run/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("collection-get: requires a collection", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`collection` is required");
  assertEquals(calls.length, 0);
});
