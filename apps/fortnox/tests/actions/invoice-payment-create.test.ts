import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoice-payment-create.ts";

Deno.test("invoice-payment-create: POST /3/invoicepayments with a wrapped body", async () => {
  const reply = { "InvoicePayment": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ status: 201, body: reply }]);
  const result = await action.execute!({
    "invoiceNumber": 7,
    "amount": 7,
    "paymentDate": "paymentDate-v",
    "modeOfPayment": "modeOfPayment-v",
    "modeOfPaymentAccount": 7,
    "additionalFields": { "Comments": "extra" },
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/3/invoicepayments");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    InvoicePayment: {
      "InvoiceNumber": 7,
      "Amount": 7,
      "PaymentDate": "paymentDate-v",
      "ModeOfPayment": "modeOfPayment-v",
      "ModeOfPaymentAccount": 7,
      "Comments": "extra",
    },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(result, reply);

  // Optional params that were not set are left out of the payload entirely.
  const bare = mockCtx([{ body: reply }]);
  await action.execute!({ "invoiceNumber": 7 } as never, bare.ctx);
  assertEquals(JSON.parse(bare.calls[0].body!), { InvoicePayment: { "InvoiceNumber": 7 } });
  assertEquals(Object.fromEntries(new URL(bare.calls[0].url).searchParams), {});
});

Deno.test("invoice-payment-create: rejects an additionalFields that is not a JSON object", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!({ "invoiceNumber": 7, "additionalFields": "[1]" } as never, ctx),
    Error,
    "additionalFields must be a JSON object",
  );
  assertEquals(calls.length, 0);
});
