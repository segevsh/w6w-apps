import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/order-update.ts";

const display = { storeUrl: "https://shop.example.com" };

Deno.test("order-update: PUTs /orders/{id} with only supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 7 } }], { display });
  await action.execute!({ orderId: "7", status: "completed" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/wp-json/wc/v3/orders/7");
  assertEquals(JSON.parse(calls[0].body!), { status: "completed" });
});

Deno.test("order-update: maps camelCase fields and passes address objects", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 7 } }], { display });
  await action.execute!(
    {
      orderId: "7",
      customerId: 3,
      customerNote: "note",
      paymentMethod: "cod",
      paymentMethodTitle: "Cash on Delivery",
      billing: { city: "Paris" },
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    customer_id: 3,
    customer_note: "note",
    payment_method: "cod",
    payment_method_title: "Cash on Delivery",
    billing: { city: "Paris" },
  });
});
