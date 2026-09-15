import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/quote-get.ts";

Deno.test("quote-get: GETs /2.0/kb_offer/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 9, document_nr: "AN-0009" } }]);
  const result = await action.execute!({ quoteId: 9 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/kb_offer/9");
  assertEquals(result, { id: 9, document_nr: "AN-0009" });
});
