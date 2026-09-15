import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoice-list.ts";

Deno.test("invoice-list: GETs /2.0/kb_invoice with mapped query", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, document_nr: "RE-0001" }] }]);
  const result = await action.execute!({ orderBy: "total", descending: false, limit: 25 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/kb_invoice");
  assertEquals(url.searchParams.get("order_by"), "total");
  assertEquals(url.searchParams.get("limit"), "25");
  assertEquals(result, [{ id: 1, document_nr: "RE-0001" }]);
});
