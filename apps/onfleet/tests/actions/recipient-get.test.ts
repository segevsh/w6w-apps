import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/recipient-get.ts";

test("recipient-get: fetches by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "rcp_1" } }]);
  await action.execute!({ recipientId: "rcp_1" }, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/recipients/rcp_1");
});

test("recipient-get: recipientId is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "recipientId");
  assertEquals(calls.length, 0);
});
