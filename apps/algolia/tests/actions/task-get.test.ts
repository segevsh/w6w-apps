import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-get.ts";

const display = { appId: "APPID" };

/** Every Algolia write is async; this is how a workflow knows it landed. */
Deno.test("task-get: reports whether a write has been published", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "published" } }], { display });
  const result = await action.execute!({ indexName: "products", taskID: "42" }, ctx);
  assertEquals(calls[0].url, "https://appid-dsn.algolia.net/1/indexes/products/task/42");
  assertEquals(result, { status: "published" });
});

Deno.test("task-get: both the index and the task are required", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ indexName: "products" }, ctx),
    Error,
    "`taskID`",
  );
  assertEquals(calls.length, 0);
});
