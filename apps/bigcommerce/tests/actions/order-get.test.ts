import { assertEquals } from "@std/assert";
import orderGet from "../../actions/order-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("order-get: returns the v2 object unwrapped-of-nothing", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 100, status: "Awaiting Fulfillment" } }]);
  const out = await orderGet.execute({ orderId: 100 }, ctx);

  assertEquals(pathOf(calls[0].url), "/stores/abc123/v2/orders/100");
  assertEquals(out, { id: 100, status: "Awaiting Fulfillment" });
});

Deno.test("order-get: include is comma-joined", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await orderGet.execute({ orderId: 1, include: ["consignments", "fees"] }, ctx);
  assertEquals(queryOf(calls[0].url), { include: "consignments,fees" });
});
