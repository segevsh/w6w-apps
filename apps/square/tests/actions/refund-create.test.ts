import { assert, assertEquals, assertRejects } from "@std/assert";
import { INVOCATION_ID, mockCtx } from "../_helpers.ts";
import action from "../../actions/refund-create.ts";

Deno.test("refund-create: POSTs /v2/refunds with payment id, amount and idempotency key", async () => {
  const { ctx, calls } = mockCtx([{ body: { refund: { id: "r1" } } }]);
  await action.execute({ paymentId: "p1", amount: 250, currency: "usd" }, ctx);
  assertEquals(calls[0].url, "https://connect.squareup.com/v2/refunds");
  assertEquals(JSON.parse(calls[0].body!), {
    idempotency_key: INVOCATION_ID,
    payment_id: "p1",
    amount_money: { amount: 250, currency: "USD" },
  });
});

Deno.test("refund-create: passes the reason, version token and team member through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    paymentId: "p1",
    amount: 100,
    currency: "USD",
    reason: "duplicate",
    paymentVersionToken: "v-token",
    teamMemberId: "TM1",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.reason, "duplicate");
  assertEquals(body.payment_version_token, "v-token");
  assertEquals(body.team_member_id, "TM1");
});

Deno.test("refund-create: never sends `unlinked` — this action is linked refunds only", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ paymentId: "p1", amount: 1, currency: "USD" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("unlinked" in body, false);
  assertEquals("destination_id" in body, false);
});

Deno.test("refund-create: refuses to refund with no idempotency key available", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { invocationId: "" });
  await assertRejects(
    async () => {
      await action.execute({ paymentId: "p1", amount: 1, currency: "USD" }, ctx);
    },
    Error,
    "idempotency key",
  );
  assertEquals(calls.length, 0);
});

Deno.test("refund-create: is declared idempotent and caps the key at 45 characters", () => {
  assertEquals(action.idempotent, true);
  assertEquals(
    action.params?.find((p) => p.key === "idempotencyKey")?.validation?.maxLength,
    45,
  );
});

Deno.test("refund-create: the amount hint warns about the already-refunded ceiling", () => {
  const p = action.params?.find((p) => p.key === "amount");
  assert(/already been refunded/i.test(p?.hint ?? ""), p?.hint);
});
