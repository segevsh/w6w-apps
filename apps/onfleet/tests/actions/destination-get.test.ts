import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/destination-get.ts";

test("destination-get: fetches by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "dst_1" } }]);
  await action.execute!({ destinationId: "dst_1" }, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/destinations/dst_1");
});

test("destination-get: destinationId is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "destinationId");
  assertEquals(calls.length, 0);
});
