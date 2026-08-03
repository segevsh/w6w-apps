import { assertEquals } from "@std/assert";
import { connected, mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/list-invoices.ts";

const ok = { status: 200, body: { list: [] } };

Deno.test("list-invoices: is a search action over the invoice resource", () => {
  assertEquals(action.key, "list-invoices");
  assertEquals(action.type, "search");
  assertEquals(action.resource, "invoice");
});

Deno.test("list-invoices: GETs /invoices", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({}, connected(ctx));
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/invoices");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("list-invoices: sends the id and status filters in operator form", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({
    customerId: "cust_1",
    subscriptionId: "sub_1",
    status: "payment_due",
  }, connected(ctx));
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("customer_id[is]"), "cust_1");
  assertEquals(q.get("subscription_id[is]"), "sub_1");
  assertEquals(q.get("status[is]"), "payment_due");
});

Deno.test("list-invoices: `recurring` is an enumerated filter whose values are `true`/`false`", async () => {
  // Documented as an enum with operator `is` and string values, not as a plain
  // boolean parameter — so it goes out as `recurring[is]=true`.
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ recurring: true }, connected(ctx));
  assertEquals(new URL(calls[0].url).searchParams.get("recurring[is]"), "true");

  const second = mockCtx([ok]);
  await action.execute({ recurring: false }, connected(second.ctx));
  assertEquals(new URL(second.calls[0].url).searchParams.get("recurring[is]"), "false");
});

Deno.test("list-invoices: one date bound uses after/before", async () => {
  const a = mockCtx([ok]);
  await action.execute({ dateAfter: 1435054328 }, connected(a.ctx));
  assertEquals(new URL(a.calls[0].url).searchParams.get("date[after]"), "1435054328");

  const b = mockCtx([ok]);
  await action.execute({ dateBefore: 1435154328 }, connected(b.ctx));
  assertEquals(new URL(b.calls[0].url).searchParams.get("date[before]"), "1435154328");
});

Deno.test("list-invoices: two date bounds use `between` with its documented literal", async () => {
  // Combining `after` and `before` on one filter is nowhere documented; the
  // documented range operator is `between`, formatted `[t1,t2]`.
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ dateAfter: 1435054328, dateBefore: 1435154328 }, connected(ctx));
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("date[between]"), "[1435054328,1435154328]");
  assertEquals(q.get("date[after]"), null);
  assertEquals(q.get("date[before]"), null);
});

Deno.test("list-invoices: sorts by `date` or `updated_at` — NOT created_at", () => {
  // This differs from the customers and subscriptions lists on purpose.
  assertEquals(optionValues(action, "sortAttribute"), ["date", "updated_at"]);
});

Deno.test("list-invoices: offers exactly the documented invoice statuses", () => {
  assertEquals(optionValues(action, "status"), [
    "paid",
    "posted",
    "payment_due",
    "not_paid",
    "voided",
    "pending",
  ]);
});
