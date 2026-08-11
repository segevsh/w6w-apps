import { assert, assertEquals } from "@std/assert";
import orderCount from "../../actions/order-count.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("order-count: answers what the v2 list cannot", async () => {
  const { ctx, calls } = mockCtx([{
    body: { count: 412, statuses: [{ id: 11, name: "Awaiting Fulfillment", count: 7 }] },
  }]);
  const out = await orderCount.execute({}, ctx) as { count: number };

  assertEquals(pathOf(calls[0].url), "/stores/abc123/v2/orders/count");
  assertEquals(out.count, 412);
});

Deno.test("order-count: accepts the same filters as the list", async () => {
  const { ctx, calls } = mockCtx([{ body: { count: 0 } }]);
  await orderCount.execute({ statusId: 11, customerId: 5, channelId: 1 }, ctx);
  assertEquals(queryOf(calls[0].url), { status_id: "11", customer_id: "5", channel_id: "1" });
});

Deno.test("order-count: is a read, and its description says why it exists", () => {
  assertEquals(orderCount.type, "read");
  assert(orderCount.description?.includes("per-status"), orderCount.description);
});
