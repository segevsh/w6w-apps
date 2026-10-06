import { assertEquals } from "@std/assert";
import action from "../../actions/invoice-draft-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("invoice-draft-get: GETs /invoices/drafts/{id} and wraps the object", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  const out = await action.execute!({ draftInvoiceNumber: "A/1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://restapi.e-conomic.com/invoices/drafts/A%2F1");
  assertEquals(out, { invoice: { id: 1 } });
});

Deno.test("invoice-draft-get: a 404 is thrown with the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "not found", errorCode: "E06000" } }]);
  let msg = "";
  try {
    await action.execute!({ draftInvoiceNumber: 9 }, ctx);
  } catch (e) {
    msg = String(e);
  }
  assertEquals(msg.includes("not found (E06000)"), true);
});
