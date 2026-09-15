import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/order-list.ts";

Deno.test("order-list: GETs /2.0/kb_order with mapped query", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, document_nr: "AU-0001" }] }]);
  const result = await action.execute!({ limit: 5 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/kb_order");
  assertEquals(url.searchParams.get("limit"), "5");
  assertEquals(result, [{ id: 1, document_nr: "AU-0001" }]);
});
