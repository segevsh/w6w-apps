import { assertEquals } from "@std/assert";
import { mockShopifyCtx } from "../_helpers.ts";
import action from "../../actions/order-update.ts";

Deno.test("order-update: PUTs the id plus the supplied fields", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { order: {} } }]);
  await action.execute({ orderId: 9, note: "gift wrap" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { order: { id: 9, note: "gift wrap" } });
});
