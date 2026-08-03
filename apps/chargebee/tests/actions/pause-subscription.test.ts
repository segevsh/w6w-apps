import { assertEquals } from "@std/assert";
import { connected, formObject, mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/pause-subscription.ts";

const ok = { status: 200, body: { subscription: { id: "sub_1", status: "paused" } } };

Deno.test("pause-subscription: is an idempotent perform action", () => {
  assertEquals(action.key, "pause-subscription");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});

Deno.test("pause-subscription: POSTs to /pause — NO `_for_items` suffix here", async () => {
  // Cancel and update carry the suffix; pause and resume do not. Assuming
  // symmetry would 404.
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ subscriptionId: "sub_1" }, connected(ctx));
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/subscriptions/sub_1/pause");
});

Deno.test("pause-subscription: reproduces Chargebee's billing-cycles sample", async () => {
  // -d pause_option="BILLING_CYCLES" -d skip_billing_cycles=1
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({
    subscriptionId: "sub_1",
    pauseOption: "billing_cycles",
    skipBillingCycles: 1,
  }, connected(ctx));
  assertEquals(formObject(calls[0].body), {
    pause_option: "billing_cycles",
    skip_billing_cycles: "1",
  });
});

Deno.test("pause-subscription: maps every documented option", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({
    subscriptionId: "sub_1",
    pauseOption: "specific_date",
    pauseDate: 1735689600,
    resumeDate: 1738368000,
    unbilledChargesHandling: "invoice",
    invoiceDunningHandling: "stop",
  }, connected(ctx));
  assertEquals(formObject(calls[0].body), {
    pause_option: "specific_date",
    pause_date: "1735689600",
    resume_date: "1738368000",
    unbilled_charges_handling: "invoice",
    invoice_dunning_handling: "stop",
  });
});

Deno.test("pause-subscription: offers the four documented pause options, lowercase", () => {
  assertEquals(optionValues(action, "pauseOption"), [
    "immediately",
    "end_of_term",
    "specific_date",
    "billing_cycles",
  ]);
});
