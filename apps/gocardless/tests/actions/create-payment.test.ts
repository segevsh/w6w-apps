import { assertEquals, assertRejects } from "@std/assert";
import createPayment from "../../actions/create-payment.ts";
import { envelope, errorBody, mockCtx, mockCtxWithInvocation, pathOf } from "../_helpers.ts";

const created = envelope("payments", { id: "PM1", amount: 1000, status: "pending_submission" });

Deno.test("create-payment: POST /payments with amount, currency and links.mandate", async () => {
  const { ctx, calls } = mockCtx([{ body: created }]);
  const out = await createPayment.execute!({
    amount: 1000,
    currency: "GBP",
    mandateId: "MD1",
    description: "Invoice 1042",
    chargeDate: "2026-10-01",
    reference: "INV-1042",
    retryIfPossible: true,
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/payments");
  assertEquals(JSON.parse(calls[0].body!), {
    payments: {
      amount: 1000,
      currency: "GBP",
      description: "Invoice 1042",
      charge_date: "2026-10-01",
      reference: "INV-1042",
      retry_if_possible: true,
      links: { mandate: "MD1" },
    },
  });
  assertEquals(out.id, "PM1");
});

/**
 * `retry_if_possible: false` is a value the caller chose, not an omitted field:
 * dropping it would silently hand GoCardless its own default.
 */
Deno.test("create-payment: an explicit false survives the body builder", async () => {
  const { ctx, calls } = mockCtx([{ body: created }]);
  await createPayment.execute!({
    amount: 500,
    currency: "EUR",
    mandateId: "MD1",
    retryIfPossible: false,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).payments.retry_if_possible, false);
});

Deno.test("create-payment: the invocation id keys the retry when none was typed", async () => {
  const { ctx, calls } = mockCtxWithInvocation([{ body: created }], "inv-payment-1");
  await createPayment.execute!({ amount: 1000, currency: "GBP", mandateId: "MD1" }, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "inv-payment-1");
});

/**
 * The whole point of the idempotency key is to find the resource the first call
 * created, so the vendor's `conflicting_resource_id` must reach the message.
 */
Deno.test("create-payment: a 409 names the payment the key already created", async () => {
  const { ctx } = mockCtx([{
    status: 409,
    body: errorBody("invalid_state", {
      code: 409,
      message: "A resource already exists with this idempotency key",
      errors: [{
        reason: "idempotent_creation_conflict",
        message: "The idempotency key has already been used",
        links: { conflicting_resource_id: "PM_EXISTING" },
      }],
    }),
  }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(createPayment.execute!({
        amount: 1000,
        currency: "GBP",
        mandateId: "MD1",
        idempotencyKey: "order-1042",
      }, ctx)),
    Error,
  );
  assertEquals(
    err.message.includes("409 invalid_state/idempotent_creation_conflict"),
    true,
    err.message,
  );
  assertEquals(err.message.includes("PM_EXISTING"), true, err.message);
});

Deno.test("create-payment: an inactive mandate surfaces invalid_state", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("invalid_state", {
      code: 422,
      message: "Mandate is not active",
      errors: [{ reason: "mandate_not_active", message: "The mandate is cancelled" }],
    }),
  }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(createPayment.execute!({
        amount: 1000,
        currency: "GBP",
        mandateId: "MD1",
      }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("invalid_state/mandate_not_active"), true, err.message);
});
