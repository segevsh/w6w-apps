import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import orderShippingAddressList from "../../actions/order-shipping-address-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("order-shipping-address-list: GETs the order's destinations", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 128, city: "Austin" }] }]);
  const out = await orderShippingAddressList.execute({ orderId: 100 }, ctx);

  assertEquals(pathOf(calls[0].url), "/stores/abc123/v2/orders/100/shipping_addresses");
  assertEquals(out.addresses, [{ id: 128, city: "Austin" }]);
});

test("order-shipping-address-list: an empty 204 is an empty list", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await orderShippingAddressList.execute({ orderId: 1 }, ctx), { addresses: [] });
});

test("order-shipping-address-list: names the id a shipment needs", () => {
  assert(
    orderShippingAddressList.description?.includes("order_address_id"),
    orderShippingAddressList.description,
  );
});
