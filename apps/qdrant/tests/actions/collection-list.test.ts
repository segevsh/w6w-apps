import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/collection-list.ts";

Deno.test("collection-list: reads names out of the envelope", async () => {
  const { ctx, calls } = mockCtx([ok({ collections: [{ name: "docs" }, { name: "faqs" }] })], {
    display,
  });
  const result = await action.execute!({}, ctx) as { names: string[]; count: number };
  assertEquals(calls[0].url, "https://xyz.cloud.qdrant.io:6333/collections");
  assertEquals(calls[0].method, "GET");
  assertEquals(result.names, ["docs", "faqs"]);
  assertEquals(result.count, 2);
});

Deno.test("collection-list: an empty instance is a count of zero, not an error", async () => {
  const { ctx } = mockCtx([ok({ collections: [] })], { display });
  const result = await action.execute!({}, ctx) as { names: string[]; count: number };
  assertEquals(result, { collections: [], names: [], count: 0 } as unknown);
});

Deno.test('collection-list: a nameless entry is dropped from names rather than becoming ""', async () => {
  const { ctx } = mockCtx([ok({ collections: [{ name: "docs" }, {}] })], { display });
  const result = await action.execute!({}, ctx) as { names: string[]; count: number };
  assertEquals(result.names, ["docs"]);
  assertEquals(result.count, 2, "the count still reflects what Qdrant returned");
});

/** The list endpoint returns names only — the sizes are one call per collection. */
Deno.test("collection-list: says it returns names only", () => {
  assert(/NAMES only/.test(action.description!), action.description);
  assertEquals(action.params?.length ?? 0, 0);
});
