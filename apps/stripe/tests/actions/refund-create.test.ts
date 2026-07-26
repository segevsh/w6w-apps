import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/refund-create.ts";

Deno.test("refund-create: refunds a charge", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "re_1" } }]);
  await action.execute({ chargeId: "ch_1", amount: 250 }, ctx);
  assertEquals(calls[0].url, "https://api.stripe.com/v1/refunds");
  assertEquals(calls[0].body, "charge=ch_1&amount=250");
});

Deno.test("refund-create: refunds a payment intent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ paymentIntentId: "pi_1" }, ctx);
  assertEquals(calls[0].body, "payment_intent=pi_1");
});

Deno.test("refund-create: rejects zero or both targets before making a request", () => {
  const neither = mockCtx();
  assertThrows(() => action.execute({}, neither.ctx), Error, "exactly one");
  assertEquals(neither.calls.length, 0);

  const both = mockCtx();
  assertThrows(
    () => action.execute({ chargeId: "ch_1", paymentIntentId: "pi_1" }, both.ctx),
    Error,
    "exactly one",
  );
  assertEquals(both.calls.length, 0);
});
