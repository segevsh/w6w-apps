import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/index-delete.ts";

const display = { endpoint: "https://example.com:9200" };

test("index-delete: DELETEs /<index>", async () => {
  const { ctx, calls } = mockCtx([{ body: { acknowledged: true } }], { display });
  const result = await action.execute({ index: "my-index" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/my-index");
  assertEquals(result, { acknowledged: true });
});
