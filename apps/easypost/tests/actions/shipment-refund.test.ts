import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/shipment-refund.ts";

/**
 * A refund is a request the carrier decides over days, and it rejects labels
 * that were scanned. Treating it as recovered money is wrong.
 */
Deno.test("shipment-refund: a submitted refund is reported as pending", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "shp_1", refund_status: "submitted" },
  }]);
  const result = await action.execute!({ shipmentId: "shp_1" }, ctx) as { pending: boolean };
  assertEquals(calls[0].url, "https://api.easypost.com/v2/shipments/shp_1/refund");
  assertEquals(calls[0].method, "POST");
  assertEquals(result.pending, true);
});

Deno.test("shipment-refund: a decided outcome is not pending", async () => {
  for (const [status, pending] of [["refunded", false], ["rejected", false]] as const) {
    const { ctx } = mockCtx([{ status: 200, body: { refund_status: status } }]);
    const result = await action.execute!({ shipmentId: "shp_1" }, ctx) as { pending: boolean };
    assertEquals(result.pending, pending, status);
  }
});

Deno.test("shipment-refund: needs a shipment id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "shipmentId");
  assertEquals(calls.length, 0);
});

Deno.test("shipment-refund: says it is a request rather than an undo", () => {
  assert(/Not an undo/.test(action.description!), action.description);
});
