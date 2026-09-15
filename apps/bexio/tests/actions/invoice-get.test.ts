import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoice-get.ts";

Deno.test("invoice-get: GETs /2.0/kb_invoice/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 4, document_nr: "RE-0004" } }]);
  const result = await action.execute!({ invoiceId: 4 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/kb_invoice/4");
  assertEquals(result, { id: 4, document_nr: "RE-0004" });
});
