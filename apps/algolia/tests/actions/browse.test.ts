import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/browse.ts";

const display = { appId: "APPID" };

/**
 * Browse returns one page plus a cursor — it deliberately does not loop, since
 * a full index can be millions of records.
 */
Deno.test("browse: returns a single page and its cursor, making one call", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { hits: [{ objectID: "1" }], cursor: "c" },
  }], {
    display,
  });
  const result = await action.execute!({ indexName: "products" }, ctx) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://appid-dsn.algolia.net/1/indexes/products/browse");
  assertEquals(result.cursor, "c");
});

Deno.test("browse: a cursor resumes where the last call stopped", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { hits: [] } }], { display });
  await action.execute!({ indexName: "products", cursor: "abc" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).cursor, "abc");
});
