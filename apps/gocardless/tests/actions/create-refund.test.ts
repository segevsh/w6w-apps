import { assertEquals, assertRejects } from "@std/assert";
import createRefund from "../../actions/create-refund.ts";
import { envelope, errorBody, mockCtx, mockCtxWithInvocation, pathOf } from "../_helpers.ts";

const created = envelope("refunds", { id: "RF1", amount: 500, currency: "GBP" });

Deno.test("create-refund: POST /refunds against the payment, with the double-refund guard", async () => {
  const { ctx, calls } = mockCtx([{ body: created }]);
  const out = await createRefund.execute!({
    amount: 500,
    paymentId: "PM1",
    reference: "RETURN-7",
    totalAmountConfirmation: 500,
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/refunds");
  assertEquals(JSON.parse(calls[0].body!), {
    refunds: {
      amount: 500,
      reference: "RETURN-7",
      total_amount_confirmation: 500,
      links: { payment: "PM1" },
    },
  });
  assertEquals(out.id, "RF1");
});

/**
 * Only `links.payment` is built: refunding against a whole mandate is a
 * separately restricted GoCardless feature, so nothing here can send
 * `links.mandate`.
 */
Deno.test("create-refund: never sends a mandate link", async () => {
  const { ctx, calls } = mockCtx([{ body: created }]);
  await createRefund.execute!({ amount: 500, paymentId: "PM1" }, ctx);
  const body = JSON.parse(calls[0].body!) as { refunds: { links: Record<string, unknown> } };
  assertEquals(Object.keys(body.refunds.links), ["payment"]);
});

Deno.test("create-refund: the invocation id keys the retry when none was typed", async () => {
  const { ctx, calls } = mockCtxWithInvocation([{ body: created }], "inv-refund-1");
  await createRefund.execute!({ amount: 500, paymentId: "PM1" }, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "inv-refund-1");
});

Deno.test("create-refund: a mismatched confirmation is refused by the vendor, verbatim", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("validation_failed", {
      code: 422,
      message: "Validation failed",
      errors: [{
        field: "total_amount_confirmation",
        message: "must equal the total amount to be refunded",
        request_pointer: "/refunds/total_amount_confirmation",
      }],
    }),
  }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(createRefund.execute!({
        amount: 500,
        paymentId: "PM1",
        totalAmountConfirmation: 100,
      }, ctx)),
    Error,
  );
  assertEquals(
    err.message.includes("validation_failed/total_amount_confirmation"),
    true,
    err.message,
  );
});
