import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoice-list.ts";

Deno.test("invoice-list: applies default pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/invoicing/invoices");
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(url.searchParams.get("page_size"), "20");
  assertEquals(url.searchParams.get("total_required"), "false");
});

Deno.test("invoice-list: honours page/pageSize/totalRequired overrides", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!({ page: 3, pageSize: 50, totalRequired: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("page"), "3");
  assertEquals(url.searchParams.get("page_size"), "50");
  assertEquals(url.searchParams.get("total_required"), "true");
});
