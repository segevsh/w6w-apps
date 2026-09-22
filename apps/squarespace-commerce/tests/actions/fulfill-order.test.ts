import { assertEquals, assertRejects } from "@std/assert";
import fulfillOrder from "../../actions/fulfill-order.ts";
import { API_ROOT, bodyOf, errorBody, mockCtx } from "../_helpers.ts";

Deno.test("fulfill-order: POST /1.0/commerce/orders/{id}/fulfillments answers 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await fulfillOrder.execute!({
    id: "O1",
    shipments: [{ carrierName: "FedEx", trackingNumber: "103932814692659" }],
    shouldSendNotification: true,
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/1.0/commerce/orders/O1/fulfillments`);
  assertEquals(bodyOf(calls[0]), {
    shipments: [{ carrierName: "FedEx", trackingNumber: "103932814692659" }],
    shouldSendNotification: true,
  });
  assertEquals(out, { ok: true });
});

Deno.test("fulfill-order: no shipments and no notification sends an empty object", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await fulfillOrder.execute!({ id: "O1" }, ctx);

  assertEquals(calls[0].body, "{}");
  // No Idempotency-Key: this route has none, which is why the action is not idempotent.
  assertEquals(calls[0].headers["idempotency-key"], undefined);
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("fulfill-order: a 409 conflict is surfaced with its subtype", async () => {
  const { ctx } = mockCtx([{
    status: 409,
    body: errorBody("CONFLICT", {
      subtype: "CONCURRENT_MODIFICATION",
      message: "The order was modified",
    }),
  }]);

  await assertRejects(
    async () => await fulfillOrder.execute!({ id: "O1" }, ctx),
    Error,
    "409 CONFLICT/CONCURRENT_MODIFICATION",
  );
});
