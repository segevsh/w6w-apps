import { assertEquals } from "@std/assert";
import action from "../../actions/invoice-draft-delete.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("invoice-draft-delete: DELETEs /invoices/drafts/{n}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute!({ draftInvoiceNumber: 4 }, ctx), { deleted: true });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://restapi.e-conomic.com/invoices/drafts/4");
});
