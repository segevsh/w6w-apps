import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/order-create.ts";

const display = { storeUrl: "https://shop.example.com" };

Deno.test("order-create: POSTs /orders with an empty body when nothing supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }], { display });
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/wp-json/wc/v3/orders");
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(result, { id: 1 });
});

Deno.test("order-create: maps fields, passes billing/shipping/lineItems through", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 2 } }], { display });
  await action.execute!(
    {
      status: "processing",
      currency: "USD",
      customerId: 9,
      customerNote: "leave at door",
      paymentMethod: "bacs",
      paymentMethodTitle: "Bank Transfer",
      setPaid: true,
      billing: { first_name: "Ada", email: "ada@example.com" },
      shipping: { first_name: "Ada", city: "London" },
      lineItems: [{ product_id: 5, quantity: 2 }],
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    status: "processing",
    currency: "USD",
    customer_id: 9,
    customer_note: "leave at door",
    payment_method: "bacs",
    payment_method_title: "Bank Transfer",
    set_paid: true,
    billing: { first_name: "Ada", email: "ada@example.com" },
    shipping: { first_name: "Ada", city: "London" },
    line_items: [{ product_id: 5, quantity: 2 }],
  });
});
