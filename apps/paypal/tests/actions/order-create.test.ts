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

Deno.test("order-create: the former group's fields are read flat", async () => {
  // `returnUrl`/`cancelUrl` decide where PayPal sends the buyer after approval,
  // and they lived in a `type: "group"` the studio renders as a JSON editor —
  // so the approval round trip could not be configured from the form at all.
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "O1", status: "CREATED" } }]);
  await action.execute!(
    {
      currencyCode: "USD",
      value: "10.00",
      customId: "ref-1",
      invoiceId: "INV-1",
      returnUrl: "https://x/ok",
      cancelUrl: "https://x/no",
      brandName: "Acme",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "");
  const unit = body.purchase_units[0];
  assertEquals(unit.custom_id, "ref-1");
  assertEquals(unit.invoice_id, "INV-1");
  assertEquals(body.application_context, {
    return_url: "https://x/ok",
    cancel_url: "https://x/no",
    brand_name: "Acme",
  });
});

Deno.test("order-create: a flat field wins over the deprecated group", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "O1" } }]);
  await action.execute!(
    {
      currencyCode: "USD",
      value: "10.00",
      customId: "new",
      additionalFields: { customId: "old", invoiceId: "kept" },
    },
    ctx,
  );
  const unit = JSON.parse(calls[0].body ?? "").purchase_units[0];
  assertEquals(unit.custom_id, "new");
  assertEquals(unit.invoice_id, "kept");
});
