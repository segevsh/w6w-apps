import { assertEquals } from "@std/assert";
import orderUpdate from "../../actions/order-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("order-update: PUTs a status change and returns updateCount", async () => {
  const { ctx, calls } = mockCtx([{ body: { updateCount: 1 } }]);
  const out = await orderUpdate.execute(
    { orderId: "EBJFT", fulfillmentStatus: "SHIPPED", trackingNumber: "1Z999" },
    ctx,
  ) as { updateCount: number };

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/orders/EBJFT");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    fulfillmentStatus: "SHIPPED",
    trackingNumber: "1Z999",
  });
  assertEquals(out.updateCount, 1);
});

Deno.test("order-update: untouched fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: { updateCount: 1 } }]);
  await orderUpdate.execute({ orderId: "1", paymentStatus: "PAID" }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { paymentStatus: "PAID" });
});

Deno.test("order-update: totals are deliberately not typed fields", () => {
  const keys = (orderUpdate.params ?? []).map((p) => p.key);
  assertEquals(keys.includes("subtotal"), false);
  assertEquals(keys.includes("total"), false);
  // They are still reachable for the cases that genuinely own them.
  assertEquals(keys.includes("extraFields"), true);
});
