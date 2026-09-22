import { assertEquals } from "@std/assert";
import action from "../../actions/list-invoices.ts";
import { API_ROOT, mockCtx, page, queryAllOf, queryOf, urlOf } from "../_helpers.ts";

const sample = page([{ id: "inv-1" }], { count: 1 });

Deno.test("list-invoices: reads /consultant/payments/invoices", async () => {
  const { ctx, calls } = mockCtx([{ body: sample }]);
  const result = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(urlOf(calls[0]), `${API_ROOT}/consultant/payments/invoices`);
  assertEquals(result, sample);
});

Deno.test("list-invoices: the documented filters are passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: sample }]);
  await action.execute({
    consultants: ["c-1"],
    records: ["rec-1"],
    paymentstatus: ["paid", "unpaid"],
    invoicedate_eq: "2026-09-01T00:00:00Z",
    invoicedate_gte: "2026-08-01T00:00:00Z",
    invoicedate_lte: "2026-09-30T00:00:00Z",
  }, ctx);
  const query = queryOf(calls[0].url);
  assertEquals(query.invoicedate_eq, "2026-09-01T00:00:00Z");
  assertEquals(query.invoicedate_gte, "2026-08-01T00:00:00Z");
  assertEquals(query.invoicedate_lte, "2026-09-30T00:00:00Z");
  const all = queryAllOf(calls[0].url);
  assertEquals(all.consultants, ["c-1"]);
  assertEquals(all.records, ["rec-1"]);
  assertEquals(all.paymentstatus, ["paid", "unpaid"]);
});

Deno.test("list-invoices: this app reads invoices and never writes them", () => {
  assertEquals(action.type, "search");
  assertEquals(action.resource, "invoice");
  assertEquals((action.output as Array<{ key: string }>).map((o) => o.key), [
    "count",
    "hasMore",
    "items",
  ]);
});
