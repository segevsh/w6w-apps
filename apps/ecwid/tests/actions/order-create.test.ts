import { assertEquals } from "@std/assert";
import orderCreate from "../../actions/order-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("order-create: POSTs the documented required fields to /orders", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "EBJFT" } }]);
  const out = await orderCreate.execute(
    {
      email: "buyer@example.com",
      subtotal: 20,
      total: 24,
      fulfillmentStatus: "AWAITING_PROCESSING",
      paymentStatus: "AWAITING_PAYMENT",
    },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/orders");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    email: "buyer@example.com",
    subtotal: 20,
    total: 24,
    fulfillmentStatus: "AWAITING_PROCESSING",
    paymentStatus: "AWAITING_PAYMENT",
  });
  assertEquals(out.id, "EBJFT");
});

Deno.test("order-create: items and the two persons pass through as JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await orderCreate.execute(
    {
      email: "buyer@example.com",
      subtotal: 20,
      total: 24,
      fulfillmentStatus: "PROCESSING",
      paymentStatus: "PAID",
      items: [{ productId: 692730761, name: "Widget", price: 10, quantity: 2 }],
      billingPerson: { name: "Buyer" },
      orderComments: "Leave at the door",
    },
    ctx,
  );

  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.items, [{ productId: 692730761, name: "Widget", price: 10, quantity: 2 }]);
  assertEquals(body.billingPerson, { name: "Buyer" });
  assertEquals(body.orderComments, "Leave at the door");
});

/** The five fields the vendor marks Required on `POST /orders`. */
Deno.test("order-create: every Required field is declared required here too", () => {
  for (const key of ["email", "subtotal", "total", "fulfillmentStatus", "paymentStatus"]) {
    assertEquals(
      orderCreate.params?.find((p) => p.key === key)?.required,
      true,
      `${key} is declared optional`,
    );
  }
});

Deno.test("order-create: the status defaults are the states an unfulfilled order starts in", () => {
  assertEquals(
    orderCreate.params?.find((p) => p.key === "fulfillmentStatus")?.default,
    "AWAITING_PROCESSING",
  );
  assertEquals(
    orderCreate.params?.find((p) => p.key === "paymentStatus")?.default,
    "AWAITING_PAYMENT",
  );
});
