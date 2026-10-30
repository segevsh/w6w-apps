import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/refund-get.ts";

test("refund-get: GETs /v2/refunds/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { refund: { id: "r1" } } }]);
  await action.execute({ refundId: "r1" }, ctx);
  assertEquals(calls[0].url, "https://connect.squareup.com/v2/refunds/r1");
});
