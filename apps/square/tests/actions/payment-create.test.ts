import { assert, assertEquals, assertRejects } from "@std/assert";
import { INVOCATION_ID, mockCtx } from "../_helpers.ts";
import action from "../../actions/payment-create.ts";

Deno.test("payment-create: POSTs /v2/payments with source, amount and idempotency key", async () => {
  const { ctx, calls } = mockCtx([{ body: { payment: { id: "p1" } } }]);
  await action.execute({ sourceId: "cnon:card-nonce-ok", amount: 1000, currency: "usd" }, ctx);
  assertEquals(calls[0].url, "https://connect.squareup.com/v2/payments");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    idempotency_key: INVOCATION_ID,
    source_id: "cnon:card-nonce-ok",
    amount_money: { amount: 1000, currency: "USD" },
  });
});

Deno.test("payment-create: maps the optional params onto Square's names", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    sourceId: "cnon:x",
    amount: 500,
    currency: "GBP",
    tipAmount: 100,
    locationId: "L1",
    customerId: "C1",
    orderId: "O1",
    referenceId: "ref-1",
    note: "thanks",
    autocomplete: false,
    buyerEmailAddress: "a@b.test",
    statementDescriptionIdentifier: "ACME",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.tip_money, { amount: 100, currency: "GBP" });
  assertEquals(body.location_id, "L1");
  assertEquals(body.customer_id, "C1");
  assertEquals(body.order_id, "O1");
  assertEquals(body.reference_id, "ref-1");
  assertEquals(body.note, "thanks");
  assertEquals(body.autocomplete, false);
  assertEquals(body.buyer_email_address, "a@b.test");
  assertEquals(body.statement_description_identifier, "ACME");
});

Deno.test("payment-create: an explicit idempotency key overrides the invocation id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { sourceId: "cnon:x", amount: 1, currency: "USD", idempotencyKey: "order-42" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).idempotency_key, "order-42");
});

Deno.test("payment-create: refuses to call Square with no idempotency key available", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { invocationId: "" });
  await assertRejects(
    async () => {
      await action.execute({ sourceId: "cnon:x", amount: 1, currency: "USD" }, ctx);
    },
    Error,
    "idempotency key",
  );
  assertEquals(calls.length, 0);
});

Deno.test("payment-create: is declared idempotent, and the key param states the 45-char cap", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  const p = action.params?.find((p) => p.key === "idempotencyKey");
  assertEquals(p?.validation?.maxLength, 45);
  assert(p?.hint?.includes("45"), p?.hint);
});

Deno.test("payment-create: the amount hint spells out the minor-unit rule", () => {
  const p = action.params?.find((p) => p.key === "amount");
  assert(p?.hint?.includes("1000 = $10.00"), p?.hint);
});
