import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/object-delete.ts";

const display = { appId: "APPID" };

Deno.test("object-delete: DELETEs on the write host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { taskID: 3 } }], { display });
  await action.execute!({ indexName: "products", objectID: "1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://appid.algolia.net/1/indexes/products/1");
});

Deno.test("object-delete: both ids are required", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ indexName: "p" }, ctx),
    Error,
    "`objectID`",
  );
  assertEquals(calls.length, 0);
});
