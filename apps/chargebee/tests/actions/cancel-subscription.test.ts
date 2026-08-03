import { assertEquals } from "@std/assert";
import { connected, formObject, mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/cancel-subscription.ts";

const ok = { status: 200, body: { subscription: { id: "sub_1", status: "cancelled" } } };

Deno.test("cancel-subscription: is an idempotent perform action", () => {
  assertEquals(action.key, "cancel-subscription");
  assertEquals(action.type, "perform");
  assertEquals(action.resource, "subscription");
  assertEquals(action.idempotent, true);
});

Deno.test("cancel-subscription: POSTs to /cancel_for_items, NOT /cancel", async () => {
  // `/cancel` is the Product Catalog 1.0 route and is absent from the PC 2.0
  // surface — guessing at it would 404.
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ subscriptionId: "sub_1" }, connected(ctx));
  assertEquals(calls[0].method, "POST");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/v2/subscriptions/sub_1/cancel_for_items",
  );
});

Deno.test("cancel-subscription: reproduces Chargebee's `end_of_term=true` sample", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ subscriptionId: "sub_1", endOfTerm: true }, connected(ctx));
  assertEquals(calls[0].body, "end_of_term=true");
});

Deno.test("cancel-subscription: `end_of_term=false` is sent, not dropped as falsy", async () => {
  // `false` here means "cancel immediately" — the opposite of omitting it.
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ subscriptionId: "sub_1", endOfTerm: false }, connected(ctx));
  assertEquals(calls[0].body, "end_of_term=false");
});

Deno.test("cancel-subscription: maps every documented option onto its snake_case name", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({
    subscriptionId: "sub_1",
    cancelOption: "specific_date",
    cancelAt: 1735689600,
    creditOptionForCurrentTermCharges: "prorate",
    unbilledChargesOption: "invoice",
    accountReceivablesHandling: "write_off",
    refundableCreditsHandling: "schedule_refund",
    cancelReasonCode: "Churn",
  }, connected(ctx));

  assertEquals(formObject(calls[0].body), {
    cancel_option: "specific_date",
    cancel_at: "1735689600",
    credit_option_for_current_term_charges: "prorate",
    unbilled_charges_option: "invoice",
    account_receivables_handling: "write_off",
    refundable_credits_handling: "schedule_refund",
    cancel_reason_code: "Churn",
  });
});

Deno.test("cancel-subscription: offers the enum values in the documented lowercase form", () => {
  // The reference's parameter listing gives these lowercase; only some older
  // curl samples show them uppercased.
  assertEquals(optionValues(action, "cancelOption"), [
    "immediately",
    "end_of_term",
    "specific_date",
    "end_of_billing_term",
  ]);
  assertEquals(optionValues(action, "creditOptionForCurrentTermCharges"), [
    "none",
    "prorate",
    "full",
  ]);
  assertEquals(optionValues(action, "unbilledChargesOption"), ["invoice", "delete"]);
});

Deno.test("cancel-subscription: sends nothing but the path when no options are given", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ subscriptionId: "sub_1" }, connected(ctx));
  assertEquals(calls[0].body, "");
});
