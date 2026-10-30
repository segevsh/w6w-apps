import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/batch-list.ts";

test("batch-list: GETs /v1/messages/batches with version header", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], has_more: false } }]);
  await action.execute!({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v1/messages/batches");
  assertEquals(calls[0].headers["anthropic-version"], "2023-06-01");
});

test("batch-list: forwards pagination params", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ limit: 10, after_id: "b_a", before_id: "b_b" }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("limit"), "10");
  assertEquals(params.get("after_id"), "b_a");
  assertEquals(params.get("before_id"), "b_b");
});
