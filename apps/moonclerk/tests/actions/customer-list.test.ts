import { assertEquals } from "@std/assert";
import action from "../../actions/customer-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("customer-list: maps every filter to the documented query name", async () => {
  const { ctx, calls } = mockCtx([{ body: { customers: [{ id: 1 }] } }]);
  const out = await action.execute!({
    formId: 5346,
    checkoutFrom: "2014-10-01",
    checkoutTo: "2014-10-31",
    nextPaymentFrom: "2014-11-01",
    nextPaymentTo: "2014-11-30",
    status: "past_due",
    count: 20,
    offset: 20,
  }, ctx);
  const q = new URL(calls[0].url);
  assertEquals(q.pathname, "/customers");
  assertEquals(Object.fromEntries(q.searchParams), {
    form_id: "5346",
    checkout_from: "2014-10-01",
    checkout_to: "2014-10-31",
    next_payment_from: "2014-11-01",
    next_payment_to: "2014-11-30",
    status: "past_due",
    count: "20",
    offset: "20",
  });
  assertEquals(out, { customers: [{ id: 1 }] });
});

Deno.test("customer-list: no input sends no query", async () => {
  const { ctx, calls } = mockCtx([{ body: { customers: [] } }]);
  await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.moonclerk.com/customers");
});

Deno.test("customer-list: a full page reports the next offset", async () => {
  const { ctx } = mockCtx([{ body: { customers: [{ id: 1 }, { id: 2 }] } }]);
  const out = await action.execute!({ count: 2, offset: 2 }, ctx) as Record<string, unknown>;
  assertEquals(out.nextOffset, 4);
});

Deno.test("customer-list: status options are the documented six", () => {
  const status = action.params!.find((p) => p.key === "status")!;
  assertEquals(
    status.options && "length" in status.options ? status.options.map((o) => o.value) : [],
    ["active", "canceled", "expired", "past_due", "pending", "unpaid"],
  );
});
