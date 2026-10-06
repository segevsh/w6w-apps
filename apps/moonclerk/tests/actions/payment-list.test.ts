import { assertEquals } from "@std/assert";
import action from "../../actions/payment-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("payment-list: maps every filter to the documented query name", async () => {
  const { ctx, calls } = mockCtx([{ body: { payments: [{ id: 9 }] } }]);
  const out = await action.execute!({
    formId: 5346,
    customerId: 12742,
    dateFrom: "2014-10-01",
    dateTo: "2014-10-31",
    status: "refunded",
    count: 50,
    offset: 100,
  }, ctx);
  const q = new URL(calls[0].url);
  assertEquals(q.pathname, "/payments");
  assertEquals(Object.fromEntries(q.searchParams), {
    form_id: "5346",
    customer_id: "12742",
    date_from: "2014-10-01",
    date_to: "2014-10-31",
    status: "refunded",
    count: "50",
    offset: "100",
  });
  assertEquals(out, { payments: [{ id: 9 }] });
});

Deno.test("payment-list: no input sends no query; short page has no nextOffset", async () => {
  const { ctx, calls } = mockCtx([{ body: { payments: [{ id: 1 }] } }]);
  const out = await action.execute!({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.moonclerk.com/payments");
  assertEquals("nextOffset" in out, false);
});

Deno.test("payment-list: a full default page reports the next offset", async () => {
  const payments = Array.from({ length: 10 }, (_, i) => ({ id: i }));
  const { ctx } = mockCtx([{ body: { payments } }]);
  const out = await action.execute!({}, ctx) as Record<string, unknown>;
  assertEquals(out.nextOffset, 10);
});
