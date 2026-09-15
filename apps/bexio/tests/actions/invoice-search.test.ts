import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoice-search.ts";

Deno.test("invoice-search: POSTs an array-of-criteria body to /2.0/kb_invoice/search", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }] }]);
  await action.execute!({ field: "document_nr", value: "RE-0001", criteria: "=" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/kb_invoice/search");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, [{ field: "document_nr", value: "RE-0001", criteria: "=" }]);
});
