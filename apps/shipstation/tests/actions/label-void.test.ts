import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/label-void.ts";

test("label-void: PUTs to /v2/labels/:id/void", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { approved: true, message: "Request for refund submitted." } },
  ]);
  const result = await action.execute!({ labelId: "se-1" }, ctx) as {
    approved: boolean;
    message: string;
  };
  assertEquals(calls[0].url, "https://api.shipstation.com/v2/labels/se-1/void");
  assertEquals(calls[0].method, "PUT");
  assertEquals(result.approved, true);
});

test("label-void: requires labelId", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "labelId");
  assertEquals(calls.length, 0);
});
