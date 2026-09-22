import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-customer-invoices.ts";

const PAGE = {
  items: [{ id: 10, invoice_number: "F-2026-001" }],
  has_more: true,
  next_cursor: "abc",
};

Deno.test("list-customer-invoices: GETs /customer_invoices with the shared four params", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const res = await action.execute({
    cursor: "abc",
    limit: 20,
    sort: "-date",
    filter: [{ field: "draft", operator: "eq", value: true }],
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/api/external/v2/customer_invoices");
  assertEquals(url.searchParams.get("cursor"), "abc");
  assertEquals(url.searchParams.get("limit"), "20");
  assertEquals(url.searchParams.get("sort"), "-date");
  assertEquals(url.searchParams.get("filter"), '[{"field":"draft","operator":"eq","value":true}]');
  assertEquals(res, PAGE);
});

Deno.test("list-customer-invoices: passes `include` alongside the shared params", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await action.execute({ include: "invoice_lines", limit: 5 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("include"), "invoice_lines");
  assertEquals(url.searchParams.get("limit"), "5");
  assertEquals(url.searchParams.has("cursor"), false);
});
