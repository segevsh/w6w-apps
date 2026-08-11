import { assert, assertEquals } from "@std/assert";
import orderShipmentCreate from "../../actions/order-shipment-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("order-shipment-create: POSTs the shipment with both foreign ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1, order_id: 100 } }]);
  const out = await orderShipmentCreate.execute({
    orderId: 100,
    orderAddressId: 128,
    items: [{ order_product_id: 194, quantity: 1 }],
    trackingNumber: "EJ958083578UK",
  }, ctx) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/stores/abc123/v2/orders/100/shipments");
  assertEquals(bodyOf(calls[0]), {
    order_address_id: 128,
    items: [{ order_product_id: 194, quantity: 1 }],
    tracking_number: "EJ958083578UK",
  });
  // The success status is 201 here, not 200.
  assertEquals(out.id, 1);
});

Deno.test("order-shipment-create: optional fields are dropped, not sent as null", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await orderShipmentCreate.execute({ orderId: 1, orderAddressId: 2, items: [] }, ctx);
  assertEquals(Object.keys(bodyOf(calls[0]) as object).sort(), ["items", "order_address_id"]);
});

Deno.test("order-shipment-create: is non-idempotent, and says it sends email", () => {
  // A repeat ships the same lines again and emails the customer again.
  assertEquals(orderShipmentCreate.idempotent, false);
  assert(
    orderShipmentCreate.description?.includes("notification email"),
    orderShipmentCreate.description,
  );
  const items = orderShipmentCreate.params?.find((p) => p.key === "items");
  assert(items?.hint?.includes("NOT the catalog"), items?.hint);
});
