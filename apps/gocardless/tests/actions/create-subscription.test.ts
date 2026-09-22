import { assertEquals } from "@std/assert";
import createSubscription from "../../actions/create-subscription.ts";
import { envelope, mockCtx, mockCtxWithInvocation, pathOf } from "../_helpers.ts";

const created = envelope("subscriptions", { id: "SB1", status: "active" });

Deno.test("create-subscription: the cadence and the mandate link reach the wire", async () => {
  const { ctx, calls } = mockCtx([{ body: created }]);
  const out = await createSubscription.execute!({
    amount: 2500,
    currency: "GBP",
    mandateId: "MD1",
    intervalUnit: "monthly",
    name: "Gym membership",
    startDate: "2026-10-01",
    count: 12,
    interval: 1,
    dayOfMonth: 1,
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/subscriptions");
  assertEquals(JSON.parse(calls[0].body!), {
    subscriptions: {
      amount: 2500,
      currency: "GBP",
      interval_unit: "monthly",
      name: "Gym membership",
      start_date: "2026-10-01",
      count: 12,
      interval: 1,
      day_of_month: 1,
      links: { mandate: "MD1" },
    },
  });
  assertEquals(out.id, "SB1");
});

Deno.test("create-subscription: the invocation id keys the retry when none was typed", async () => {
  const { ctx, calls } = mockCtxWithInvocation([{ body: created }], "inv-sub-1");
  await createSubscription.execute!({
    amount: 2500,
    currency: "GBP",
    mandateId: "MD1",
    intervalUnit: "weekly",
  }, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "inv-sub-1");
});

Deno.test("create-subscription: yearly cadence carries the month, and blanks are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: created }]);
  await createSubscription.execute!({
    amount: 5000,
    currency: "EUR",
    mandateId: "MD1",
    intervalUnit: "yearly",
    month: 4,
    endDate: "2029-04-01",
    paymentReference: "ANNUAL-2026",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    subscriptions: {
      amount: 5000,
      currency: "EUR",
      interval_unit: "yearly",
      end_date: "2029-04-01",
      month: 4,
      payment_reference: "ANNUAL-2026",
      links: { mandate: "MD1" },
    },
  });
});
