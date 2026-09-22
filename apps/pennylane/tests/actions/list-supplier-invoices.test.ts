import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-supplier-invoices.ts";

const PAGE = { items: [{ id: 5, invoice_number: "A-001" }], has_more: false, next_cursor: null };

Deno.test("list-supplier-invoices: GETs /supplier_invoices with the shared params", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const res = await action.execute({ limit: 100, sort: "-date" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/api/external/v2/supplier_invoices");
  assertEquals(url.searchParams.get("limit"), "100");
  assertEquals(url.searchParams.get("sort"), "-date");
  assertEquals(res, PAGE);
});

Deno.test("list-supplier-invoices: sends a JSON filter on payment_status", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await action.execute({
    filter: [{ field: "payment_status", operator: "not_eq", value: "paid" }],
  }, ctx);

  assertEquals(
    new URL(calls[0].url).searchParams.get("filter"),
    '[{"field":"payment_status","operator":"not_eq","value":"paid"}]',
  );
});
