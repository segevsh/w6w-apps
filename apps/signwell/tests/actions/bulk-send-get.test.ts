import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bulk-send-get.ts";

test("bulk-send-get: GETs /bulk_sends/{id}", async () => {
  const body = { id: "b1", status: "Completed", documents_count: 3, documents_completed: 3 };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await action.execute!({ id: "b1" }, ctx), body);
  assertEquals(calls[0].url, "https://www.signwell.com/api/v1/bulk_sends/b1");
});

test("bulk-send-get: id is required", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`id` is required");
});
