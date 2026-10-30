import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockShopifyCtx } from "../_helpers.ts";
import action from "../../actions/customer-update.ts";

test("customer-update: PUTs the id plus what changed", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { customer: {} } }]);
  await action.execute({ customerId: 3, note: "VIP" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { customer: { id: 3, note: "VIP" } });
});
