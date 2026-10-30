import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import batchGet from "../../actions/batch-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("batch-get: calls GET /v1/batch/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { batch_id: "b1", status: "completed" } }]);
  const out = await batchGet.execute({ batchId: "b1" }, ctx) as { status: string };

  assertEquals(pathOf(calls[0].url), "/v1/batch/b1");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.status, "completed");
});
