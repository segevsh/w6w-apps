import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/payment-refund.ts";

Deno.test("payment-refund: full refund sends an empty body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "REF-1", status: "COMPLETED" } }]);
  const result = await action.execute!({ captureId: "CAP-1" }, ctx);
  assertEquals(calls[0].url, "https://api-m.paypal.com/v2/payments/captures/CAP-1/refund");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, "{}");
  assertEquals(result, { id: "REF-1", status: "COMPLETED" });
});

Deno.test("payment-refund: partial refund sends amount, note and invoice id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      captureId: "CAP-1",
      value: "5.00",
      currencyCode: "USD",
      additionalFields: { noteToPayer: "Partial refund", invoiceId: "inv-9" },
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.amount, { value: "5.00", currency_code: "USD" });
  assertEquals(body.note_to_payer, "Partial refund");
  assertEquals(body.invoice_id, "inv-9");
});

Deno.test("payment-refund: stamps PayPal-Request-Id from the invocation id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  (ctx as { invocation?: unknown }).invocation = { invocationId: "inv-7" };
  await action.execute!({ captureId: "CAP-1" }, ctx);
  assertEquals(calls[0].headers["paypal-request-id"], "inv-7");
});

Deno.test("payment-refund: captureId is required", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute!({ captureId: "" }, ctx)),
    Error,
    "`captureId`",
  );
  assertEquals(calls.length, 0);
});

Deno.test("payment-refund: value without currencyCode rejects", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute!({ captureId: "CAP-1", value: "5.00" }, ctx)),
    Error,
    "`currencyCode`",
  );
  assertEquals(calls.length, 0);
});
