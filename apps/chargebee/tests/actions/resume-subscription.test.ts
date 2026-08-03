import { assertEquals } from "@std/assert";
import { connected, formObject, mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/resume-subscription.ts";

const ok = { status: 200, body: { subscription: { id: "sub_1", status: "active" } } };

Deno.test("resume-subscription: is an idempotent perform action", () => {
  assertEquals(action.key, "resume-subscription");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});

Deno.test("resume-subscription: POSTs to /resume — no `_for_items` suffix", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ subscriptionId: "sub_1" }, connected(ctx));
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/subscriptions/sub_1/resume");
});

Deno.test("resume-subscription: maps every documented option", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({
    subscriptionId: "sub_1",
    resumeOption: "specific_date",
    resumeDate: 1735689600,
    chargesHandling: "invoice_immediately",
    unpaidInvoicesHandling: "schedule_payment_collection",
    paymentInitiator: "merchant",
  }, connected(ctx));
  assertEquals(formObject(calls[0].body), {
    resume_option: "specific_date",
    resume_date: "1735689600",
    charges_handling: "invoice_immediately",
    unpaid_invoices_handling: "schedule_payment_collection",
    payment_initiator: "merchant",
  });
});

Deno.test("resume-subscription: offers only the TWO documented resume options", () => {
  // Pause documents four; resume documents two. The asymmetry is real and is
  // not mirrored away.
  assertEquals(optionValues(action, "resumeOption"), ["immediately", "specific_date"]);
});

Deno.test("resume-subscription: exposes payment_initiator, which drives SCA handling", () => {
  assertEquals(optionValues(action, "paymentInitiator"), ["customer", "merchant"]);
});
