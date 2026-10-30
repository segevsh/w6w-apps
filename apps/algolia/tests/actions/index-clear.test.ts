import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/index-clear.ts";

/** Clear keeps settings, synonyms and rules — that is the point of it. */
test("index-clear: POSTs the clear path on the write host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { taskID: 1 } }], {
    display: { appId: "APPID" },
  });
  await action.execute!({ indexName: "products" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://appid.algolia.net/1/indexes/products/clear");
});

test("index-clear: an index is required", async () => {
  const { ctx, calls } = mockCtx([], { display: { appId: "APPID" } });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`indexName`");
  assertEquals(calls.length, 0);
});
