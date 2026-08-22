import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/objects-delete-by.ts";

const display = { appId: "APPID" };

Deno.test("objects-delete-by: sends filters, which is all this endpoint takes", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { taskID: 5 } }], { display });
  await action.execute!({ indexName: "products", filters: "status:archived" }, ctx);
  assertEquals(calls[0].url, "https://appid.algolia.net/1/indexes/products/deleteByQuery");
  assertEquals(JSON.parse(calls[0].body!), { filters: "status:archived" });
});

/**
 * The schema has no `query` property — Algolia deletes by filters only, and an
 * unfiltered call is refused here rather than sent as a no-op.
 */
Deno.test("objects-delete-by: refuses to send an empty filter set", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ indexName: "products" }, ctx),
    Error,
    "deletes by filter, not by query",
  );
  assertEquals(calls.length, 0);
  // And it offers no query param to mislead anyone.
  assertEquals(action.params!.some((p) => p.key === "query"), false);
});
