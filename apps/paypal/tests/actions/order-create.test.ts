import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/order-create.ts";

function baseInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    intent: "CAPTURE",
    value: "19.99",
    currencyCode: "USD",
    ...overrides,
  };
}

Deno.test("order-create: happy path posts a single purchase unit", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "ORD-1", status: "CREATED" } }]);
  const result = await action.execute!(baseInput(), ctx);

  assertEquals(calls[0].url, "https://api-m.paypal.com/v2/checkout/orders");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.intent, "CAPTURE");
  assertEquals(body.purchase_units, [{ amount: { currency_code: "USD", value: "19.99" } }]);
  assertEquals(result, { id: "ORD-1", status: "CREATED" });
});

Deno.test("order-create: description and additionalFields populate the purchase unit", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    baseInput({
      description: "Order #42",
      additionalFields: {
        customId: "cust-1",
        invoiceId: "inv-1",
        returnUrl: "https://example.com/ok",
        cancelUrl: "https://example.com/cancel",
        brandName: "Acme",
      },
    }),
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.purchase_units[0].description, "Order #42");
  assertEquals(body.purchase_units[0].custom_id, "cust-1");
  assertEquals(body.purchase_units[0].invoice_id, "inv-1");
  assertEquals(body.application_context, {
    return_url: "https://example.com/ok",
    cancel_url: "https://example.com/cancel",
    brand_name: "Acme",
  });
});

Deno.test("order-create: value is required", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute!(baseInput({ value: "" }), ctx)),
    Error,
    "`value`",
  );
  assertEquals(calls.length, 0);
});
