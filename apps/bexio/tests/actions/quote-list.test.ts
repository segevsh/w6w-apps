import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/quote-list.ts";

Deno.test("quote-list: GETs /2.0/kb_offer with mapped query", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, document_nr: "AN-0001" }] }]);
  const result = await action.execute!({ orderBy: "id", limit: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/kb_offer");
  assertEquals(url.searchParams.get("limit"), "10");
  assertEquals(result, [{ id: 1, document_nr: "AN-0001" }]);
});
