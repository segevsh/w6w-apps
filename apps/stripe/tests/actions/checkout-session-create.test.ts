import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/checkout-session-create.ts";

const base = { priceId: "price_1", successUrl: "https://x.test/done" };

Deno.test("checkout-session-create: posts a subscription session with a nested line item", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "cs_1", url: "https://checkout.stripe.com/c/x" },
  }]);
  await action.execute({ ...base, quantity: 1 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/checkout/sessions");
  const body = new URLSearchParams(calls[0].body!);
  assertEquals(body.get("mode"), "subscription");
  assertEquals(body.get("line_items[0][price]"), "price_1");
  assertEquals(body.get("line_items[0][quantity]"), "1");
  assertEquals(body.get("success_url"), "https://x.test/done");
});

Deno.test("checkout-session-create: mode defaults to subscription when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ ...base }, ctx);
  assertEquals(new URLSearchParams(calls[0].body!).get("mode"), "subscription");
});

Deno.test("checkout-session-create: clientReferenceId rides through verbatim", async () => {
  // The only field tying the payment back to our own account record.
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ ...base, clientReferenceId: "acct_42" }, ctx);
  assertEquals(new URLSearchParams(calls[0].body!).get("client_reference_id"), "acct_42");
});

Deno.test("checkout-session-create: a trial nests under subscription_data", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ ...base, trialPeriodDays: 14 }, ctx);
  assertEquals(
    new URLSearchParams(calls[0].body!).get("subscription_data[trial_period_days]"),
    "14",
  );
});

Deno.test("checkout-session-create: a trial is DROPPED in payment mode, never sent", async () => {
  // subscription_data is meaningless for a one-off and Stripe 400s on it.
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ ...base, mode: "payment", trialPeriodDays: 14 }, ctx);
  assert(
    !calls[0].body!.includes("subscription_data"),
    `subscription_data must be absent in payment mode, got ${calls[0].body}`,
  );
});

Deno.test("checkout-session-create: customerId and customerEmail together is a named refusal", () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const err = assertThrows(
    () => action.execute({ ...base, customerId: "cus_1", customerEmail: "a@b.test" }, ctx),
    Error,
  );
  // Stripe's own 400 does not name the offending pair; ours must.
  assert(err.message.includes("customerId"), err.message);
  assert(err.message.includes("customerEmail"), err.message);
});

Deno.test("checkout-session-create: either field alone is accepted", async () => {
  const a = mockCtx([{ body: {} }]);
  await action.execute({ ...base, customerId: "cus_1" }, a.ctx);
  assertEquals(new URLSearchParams(a.calls[0].body!).get("customer"), "cus_1");

  const b = mockCtx([{ body: {} }]);
  await action.execute({ ...base, customerEmail: "a@b.test" }, b.ctx);
  assertEquals(new URLSearchParams(b.calls[0].body!).get("customer_email"), "a@b.test");
});

Deno.test("checkout-session-create: blank strings count as absent, not as a conflict", async () => {
  // "" arrives from an untouched optional form field; treating it as a value
  // would make the mutual-exclusion check fire on a form nobody filled in.
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ ...base, customerId: "cus_1", customerEmail: "" }, ctx);
  assertEquals(new URLSearchParams(calls[0].body!).get("customer"), "cus_1");
});

Deno.test("checkout-session-create: exposes the hosted url as an output field", () => {
  // The whole point of the action — a caller with no `url` has nowhere to send
  // the customer.
  // `Output` is a union — a static field list OR a DynamicOutput resolver.
  const out = action.output;
  assert(Array.isArray(out), "output must be a static field list");
  assert(out.some((o) => o.key === "url"), "output must expose `url`");
  assert(action.idempotent, "a write must carry the idempotency key");
});
