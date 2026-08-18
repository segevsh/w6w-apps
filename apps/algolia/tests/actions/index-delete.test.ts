import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/index-delete.ts";

Deno.test("index-delete: DELETEs the index itself, not just its records", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { taskID: 2 } }], {
    display: { appId: "APPID" },
  });
  await action.execute!({ indexName: "products" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://appid.algolia.net/1/indexes/products");
});
